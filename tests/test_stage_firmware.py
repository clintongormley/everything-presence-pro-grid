"""Regression tests for .github/scripts/stage-firmware.sh.

Locks the same-origin invariant that makes the integration's OTA button
work on the ESP32: the staged manifest must reference its parts and OTA
bin via relative filenames living next to the manifest, so the device
resolves manifest -> bin against a single origin and only opens one
mbedtls TLS context. A regression that pushes absolute URLs (or paths
that escape the manifest's directory) into the manifest would force a
second TLS session, blow the heap (MBEDTLS_ERR_SSL_ALLOC_FAILED), and
silently break Path B again.

This test pairs with the URL-shape assertions in
tests/test_websocket_api.py::TestUpdateFirmware: those pin the URL the
*integration* sends to the device; this one pins what the *publishing
pipeline* writes into the manifest at that URL.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "stage-firmware.sh"
VARIANTS = ("wifi-ble-co2", "ethernet-ble-co2", "wifi-ble-lite", "wifi-ble-lite-co2")


def _make_artifacts(artifacts_dir: Path) -> None:
    """Populate artifacts/ with the long-named bin files stage-firmware.sh expects."""
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    for variant in VARIANTS:
        prefix = f"everything-presence-pro-{variant}"
        for suffix in (".bin", ".ota.bin", "-bootloader.bin", "-partitions.bin"):
            # Distinct content per file so md5 differences are catchable.
            (artifacts_dir / f"{prefix}{suffix}").write_bytes(f"{prefix}{suffix}".encode())


def _run_stage(
    tmp_path: Path,
    version: str,
    script: Path = SCRIPT,
    extra_env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    artifacts = tmp_path / "artifacts"
    _make_artifacts(artifacts)
    env = {**os.environ, "VERSION": version, "ARTIFACTS": str(artifacts), **(extra_env or {})}
    return subprocess.run(["bash", str(script)], cwd=tmp_path, env=env, capture_output=True, text=True)


def _assert_path_is_safe_relative_filename(path: str, source: str) -> None:
    """A staged manifest path must be a bare filename. No scheme, no leading
    slash, no directory traversal — anything else means the device would
    resolve it against a second origin, defeating the same-origin invariant."""
    parsed = urlparse(path)
    assert parsed.scheme == "", f"{source}: path {path!r} has URL scheme {parsed.scheme!r}; must be relative"
    assert parsed.netloc == "", f"{source}: path {path!r} has netloc {parsed.netloc!r}; must be relative"
    assert not path.startswith("/"), f"{source}: path {path!r} is absolute; must be relative to manifest dir"
    assert ".." not in Path(path).parts, f"{source}: path {path!r} escapes manifest dir via .."
    assert "/" not in path and "\\" not in path, (
        f"{source}: path {path!r} contains a separator; manifest assumes flat layout next to itself"
    )


def test_stage_writes_to_both_latest_and_versioned_dirs(tmp_path: Path) -> None:
    """Per-version availability is what made the OTA-on-Pages design viable.
    If stage-firmware.sh stops emitting fw/v{VERSION}/, integrations pinned
    to that version 404 — exactly the concern the v0.95.0-era regression
    cited (incorrectly, by then) when it switched the URL to GitHub releases."""
    version = "9.9.9-test"
    result = _run_stage(tmp_path, version)
    assert result.returncode == 0, result.stdout + result.stderr

    assert (tmp_path / "fw" / "latest").is_dir()
    assert (tmp_path / "fw" / f"v{version}").is_dir()


def test_stage_latest_zero_writes_only_versioned_dir(tmp_path: Path) -> None:
    """STAGE_LATEST=0 stages only fw/v{VERSION}/ and never creates fw/latest/.

    The Pages pipeline stages /releases/latest first (the stable channel that
    ESPHome's native update entity reads via fw/latest/), then stages the
    integration's pinned FIRMWARE_VERSION — which may be a prerelease — for the
    panel's OTA button (fw/v{VERSION}/). That second pass must NOT move the
    stable channel, or a beta would silently auto-push to every device."""
    version = "9.9.9-beta.1"
    result = _run_stage(tmp_path, version, extra_env={"STAGE_LATEST": "0"})
    assert result.returncode == 0, result.stdout + result.stderr

    versioned = tmp_path / "fw" / f"v{version}"
    assert versioned.is_dir()
    assert not (tmp_path / "fw" / "latest").exists()

    # The versioned manifest is still complete and valid on its own.
    for variant in VARIANTS:
        manifest = json.loads((versioned / f"{variant}.json").read_text())
        assert manifest["version"] == version
        assert (versioned / f"{variant}.ota.bin").is_file()


def test_stage_latest_zero_preserves_existing_latest(tmp_path: Path) -> None:
    """A STAGE_LATEST=0 pass must leave an already-staged fw/latest/ intact.

    Mirrors the pipeline order: fw/latest/ is populated by the latest-release
    pass, then the pinned-prerelease pass runs with STAGE_LATEST=0 and must not
    touch it."""
    latest = tmp_path / "fw" / "latest"
    latest.mkdir(parents=True)
    (latest / "wifi-ble-co2.json").write_text('{"version": "1.1.0"}')

    result = _run_stage(tmp_path, "9.9.9-beta.1", extra_env={"STAGE_LATEST": "0"})
    assert result.returncode == 0, result.stdout + result.stderr

    # Stable channel untouched by the prerelease pass.
    assert json.loads((latest / "wifi-ble-co2.json").read_text())["version"] == "1.1.0"


def test_manifest_paths_are_relative_and_files_exist_alongside(tmp_path: Path) -> None:
    """Same-origin invariant: every parts[].path and ota.path in the
    manifest must be a bare filename present in the same directory as
    the manifest itself. This is the property that lets the ESP32 fetch
    manifest+bin under one TLS context."""
    version = "9.9.9-test"
    result = _run_stage(tmp_path, version)
    assert result.returncode == 0, result.stdout + result.stderr

    for parent in (tmp_path / "fw" / "latest", tmp_path / "fw" / f"v{version}"):
        for variant in VARIANTS:
            manifest_file = parent / f"{variant}.json"
            assert manifest_file.is_file(), f"missing manifest: {manifest_file}"

            manifest = json.loads(manifest_file.read_text())
            assert manifest["version"] == version
            assert len(manifest["builds"]) == 1
            build = manifest["builds"][0]

            referenced: list[str] = []
            for i, part in enumerate(build["parts"]):
                _assert_path_is_safe_relative_filename(part["path"], f"{manifest_file} parts[{i}]")
                referenced.append(part["path"])
            _assert_path_is_safe_relative_filename(build["ota"]["path"], f"{manifest_file} ota")
            referenced.append(build["ota"]["path"])

            for filename in referenced:
                assert (parent / filename).is_file(), (
                    f"manifest {manifest_file} references {filename!r} but it is not in {parent}"
                )


def test_assertion_helper_catches_absolute_url(tmp_path: Path) -> None:
    """Sanity-check the assertion helper itself: a manifest with an
    absolute URL in ota.path must be rejected. Otherwise the regression
    test above would silently pass against a future stage-firmware.sh
    that re-introduces the cross-origin failure mode."""
    import pytest

    with pytest.raises(AssertionError, match="URL scheme"):
        _assert_path_is_safe_relative_filename(
            "https://release-assets.githubusercontent.com/foo.bin",
            "ota",
        )

    with pytest.raises(AssertionError, match="absolute"):
        _assert_path_is_safe_relative_filename("/fw/v1/bar.bin", "ota")

    with pytest.raises(AssertionError, match="separator"):
        _assert_path_is_safe_relative_filename("subdir/bar.bin", "ota")

    with pytest.raises(AssertionError, match=r"\.\."):
        _assert_path_is_safe_relative_filename("..", "ota")
