"""Tests for .github/scripts/validate-release.sh."""

import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "validate-release.sh"


def _make_fixture(tmp_path: Path, *, manifest_version: str, firmware_version: str) -> Path:
    """Create a minimal repo structure with given version strings."""
    (tmp_path / "custom_components" / "eppgrid").mkdir(parents=True)
    (tmp_path / "custom_components" / "eppgrid" / "manifest.json").write_text(
        f'{{"domain": "eppgrid", "version": "{manifest_version}"}}\n'
    )
    (tmp_path / "custom_components" / "eppgrid" / "const.py").write_text(f'FIRMWARE_VERSION = "{firmware_version}"\n')
    (tmp_path / "firmware" / "common").mkdir(parents=True)
    (tmp_path / "firmware" / "common" / "epp-core.yaml").write_text(
        f'esphome:\n  project:\n    version: "{firmware_version}"\n'
    )
    (tmp_path / "firmware" / "components" / "epp").mkdir(parents=True)
    # Header derives FIRMWARE_VERSION_STR from the ESPHOME_PROJECT_VERSION
    # macro (post-refactor 572114d). The validator does not read this file —
    # we still write it so fixtures match the real repo shape.
    (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").write_text(
        "#ifndef ESPHOME_PROJECT_VERSION\n"
        '#define ESPHOME_PROJECT_VERSION "0.0.0-dev"\n'
        "#endif\n"
        "static constexpr const char* FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION;\n"
    )
    return tmp_path


def _run(fixture: Path, tag: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), tag],
        cwd=fixture,
        capture_output=True,
        text=True,
    )


def test_fails_when_manifest_version_does_not_match_tag(tmp_path: Path):
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.92.0")

    result = _run(fixture, "0.99.0")

    assert result.returncode != 0
    assert "manifest.json" in (result.stdout + result.stderr)
    assert "0.93.0" in (result.stdout + result.stderr)
    assert "0.99.0" in (result.stdout + result.stderr)


def test_fails_when_firmware_versions_disagree(tmp_path: Path):
    """const.py says 0.92.0 but base.yaml says 0.91.0 — misalignment."""
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.92.0")

    base_yaml = fixture / "firmware" / "common" / "epp-core.yaml"
    base_yaml.write_text('esphome:\n  project:\n    version: "0.91.0"\n')

    result = _run(fixture, "0.93.0")

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "firmware" in combined.lower()
    assert "0.91.0" in combined
    assert "0.92.0" in combined


def test_passes_when_firmware_matches_tag(tmp_path: Path):
    """Firmware-changing release: manifest = firmware = tag."""
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.93.0")

    result = _run(fixture, "0.93.0")

    assert result.returncode == 0


def test_passes_when_firmware_older_than_tag(tmp_path: Path):
    """Integration-only release: manifest = tag, firmware = older (aligned across the three firmware files)."""
    fixture = _make_fixture(tmp_path, manifest_version="0.93.1", firmware_version="0.92.0")

    result = _run(fixture, "0.93.1")

    assert result.returncode == 0


def test_fails_when_const_py_has_no_firmware_version_line(tmp_path: Path):
    """Script must not silently pass when extraction returns empty.

    Corrupts both firmware-version files so both extractions return ''.
    Without the empty-string guards, '' == '' and the script exits 0
    silently — the critical bug.
    """
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.92.0")

    # Corrupt const.py so the FIRMWARE_VERSION regex won't match
    (fixture / "custom_components" / "eppgrid" / "const.py").write_text("# no firmware version here\n")
    # Corrupt base.yaml too so both return '' and would trigger the silent-pass bug
    (fixture / "firmware" / "common" / "epp-core.yaml").write_text("# no version here\n")

    result = _run(fixture, "0.93.0")

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "const.py" in combined or "FIRMWARE_VERSION" in combined


def test_validator_ignores_header_literal_version(tmp_path: Path):
    """The validator no longer parses a literal version out of epp_component.h.

    Prove it by writing a bogus literal that would have failed the old
    three-way alignment check — the validator should still pass because
    manifest.json + const.py + base.yaml are aligned and the header is no
    longer consulted for version comparison. The structural "header uses
    ESPHOME_PROJECT_VERSION" invariant is checked separately, so we keep the
    macro reference here.
    """
    fixture = _make_fixture(tmp_path, manifest_version="0.95.0", firmware_version="0.95.0")

    # Bogus literal: the old validator would have extracted "999.999.999-bogus"
    # and failed three-way alignment. The new validator must ignore it.
    header = fixture / "firmware" / "components" / "epp" / "epp_component.h"
    header.write_text(
        "#ifndef ESPHOME_PROJECT_VERSION\n"
        '#define ESPHOME_PROJECT_VERSION "0.0.0-dev"\n'
        "#endif\n"
        'static constexpr const char* FIRMWARE_VERSION_STR_LEGACY = "999.999.999-bogus";\n'
        "static constexpr const char* FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION;\n"
    )

    result = _run(fixture, "0.95.0")

    assert result.returncode == 0, result.stdout + result.stderr


def test_fails_when_header_hardcodes_literal_instead_of_macro(tmp_path: Path):
    """Validator must reject a regression where epp_component.h goes back to
    hardcoding a literal version string instead of deriving it from the
    ESPHOME_PROJECT_VERSION macro.

    Tag push is the last line of defense (firmware-release.yml does not run
    the unit-test suite). Without this check, the pre-refactor failure mode —
    bumping the yaml/const.py but forgetting the header — would silently ship
    mis-versioned firmware.
    """
    fixture = _make_fixture(tmp_path, manifest_version="0.95.0", firmware_version="0.95.0")

    # Header reverts to hardcoded literal; no macro reference anywhere.
    header = fixture / "firmware" / "components" / "epp" / "epp_component.h"
    header.write_text('static constexpr const char* FIRMWARE_VERSION_STR = "0.95.0";\n')

    result = _run(fixture, "0.95.0")

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "ESPHOME_PROJECT_VERSION" in combined
    assert "epp_component.h" in combined
