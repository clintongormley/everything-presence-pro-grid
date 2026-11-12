"""The release workflow's "Collect artifacts" step finds ESPHome's build output.

The step copies four files out of ESPHome's build folder into `dist/` under the
names that stage-firmware.sh, the ESP Web Tools manifest and the integration's
firmware proxy all expect. Where ESPHome puts those files depends on the build
system it drives: PlatformIO wrote them under `.pioenvs/<name>/`, and since
ESPHome 2026.7 builds ESP32 firmware with ESP-IDF's own tools, they sit under
`build/` with ESP-IDF's names, listed in `flasher_args.json`. The firmware still
compiles when this path is wrong; only a tagged release notices, when the copy
fails and nothing is published.

These tests run the step's real shell against a fake ESP-IDF build folder.
"""

from __future__ import annotations

import json
import os
import stat
import subprocess
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
RELEASE_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "firmware-release.yml"

# (variant, the `esphome: name:` its config resolves to)
CASES = [("wifi-ble-co2", "everything-presence-pro"), ("wifi-lite-co2", "everything-presence-lite")]


def _collect_step_script(variant: str) -> str:
    steps = yaml.safe_load(RELEASE_WORKFLOW.read_text())["jobs"]["build"]["steps"]
    [step] = [s for s in steps if s.get("name") == "Collect artifacts"]
    return step["run"].replace("${{ matrix.variant }}", variant)


def _fake_esphome(bin_dir: Path, device_name: str) -> None:
    """`esphome config` stand-in printing just enough for the step's awk."""
    bin_dir.mkdir()
    script = bin_dir / "esphome"
    script.write_text(f"#!/bin/sh\nprintf 'esphome:\\n  name: {device_name}\\n  min_version: 2026.10.2\\n'\n")
    script.chmod(script.stat().st_mode | stat.S_IEXEC)


def _fake_idf_build(root: Path, device_name: str) -> dict[str, bytes]:
    """Lay out the ESP-IDF build folder as ESPHome 2026.10.2 writes it.

    Returns each published suffix mapped to the bytes it must end up holding.
    """
    build = root / "firmware" / "variants" / ".esphome" / "build" / device_name / "build"
    files = {
        "bootloader/bootloader.bin": b"bootloader",
        "partition_table/partition-table.bin": b"partition-table",
        f"{device_name}.bin": b"app-image",
        "firmware.ota.bin": b"ota-image",
        "ota_data_initial.bin": b"otadata",
    }
    for rel, content in files.items():
        (build / rel).parent.mkdir(parents=True, exist_ok=True)
        (build / rel).write_bytes(content)
    (build / "flasher_args.json").write_text(
        json.dumps(
            {
                "flash_files": {
                    "0x1000": "bootloader/bootloader.bin",
                    "0x10000": f"{device_name}.bin",
                    "0x8000": "partition_table/partition-table.bin",
                    "0x9000": "ota_data_initial.bin",
                },
                "bootloader": {"offset": "0x1000", "file": "bootloader/bootloader.bin"},
                "app": {"offset": "0x10000", "file": f"{device_name}.bin"},
                "partition-table": {"offset": "0x8000", "file": "partition_table/partition-table.bin"},
                "otadata": {"offset": "0x9000", "file": "ota_data_initial.bin"},
            }
        )
    )
    return {
        "-bootloader.bin": b"bootloader",
        "-partitions.bin": b"partition-table",
        ".bin": b"app-image",
        ".ota.bin": b"ota-image",
    }


def _run_collect(root: Path, variant: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "PATH": f"{root / 'bin'}{os.pathsep}{os.environ['PATH']}"}
    return subprocess.run(
        ["bash", "-e", "-c", _collect_step_script(variant)], cwd=root, env=env, capture_output=True, text=True
    )


@pytest.mark.parametrize(("variant", "device_name"), CASES)
def test_collect_step_publishes_the_four_files(tmp_path: Path, variant: str, device_name: str) -> None:
    _fake_esphome(tmp_path / "bin", device_name)
    expected = _fake_idf_build(tmp_path, device_name)

    result = _run_collect(tmp_path, variant)

    assert result.returncode == 0, result.stdout + result.stderr
    prefix = f"everything-presence-pro-{variant}"
    published = {p.name: p.read_bytes() for p in (tmp_path / "dist").iterdir()}
    assert published == {f"{prefix}{suffix}": content for suffix, content in expected.items()}


@pytest.mark.parametrize("part", ["bootloader", "partition-table", "app"])
def test_collect_step_fails_if_a_flash_offset_moves(tmp_path: Path, part: str) -> None:
    """The manifest step hard-codes 4096 / 32768 / 65536; a moved part must stop
    the release rather than publish a manifest that flashes it to the wrong place."""
    _fake_esphome(tmp_path / "bin", "everything-presence-pro")
    _fake_idf_build(tmp_path, "everything-presence-pro")
    flasher = tmp_path / "firmware/variants/.esphome/build/everything-presence-pro/build/flasher_args.json"
    args = json.loads(flasher.read_text())
    args[part]["offset"] = "0x20000"
    flasher.write_text(json.dumps(args))

    result = _run_collect(tmp_path, "wifi-ble-co2")

    assert result.returncode != 0
    assert "offset" in result.stdout + result.stderr
