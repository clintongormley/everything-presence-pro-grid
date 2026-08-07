"""Firmware version alignment.

The device firmware version is nominally three things, but after
simplification it collapses to two:

  1. firmware/common/epp-core.yaml  esphome.project.version
       — the single source-of-truth for what the device firmware is. It lives
         in the shared core, not in a per-model base, so the Pro and the Lite
         cannot report different versions.
  2. custom_components/eppgrid/const.py  FIRMWARE_VERSION
       — what the integration expects devices to report. HACS only ships the
         custom_components/ folder, so the integration cannot read the yaml at
         runtime — this value has to be kept in sync manually.
  3. firmware/components/epp/epp_component.h  FIRMWARE_VERSION_STR
       — derived from ESPHOME_PROJECT_VERSION (a preprocessor macro that
         ESPHome defines from esphome.project.version). No hardcoded version
         lives in the header; this test asserts that stays the case so the
         "forgot to bump the header" failure mode is structurally impossible.

If (1) and (2) diverge, _compare_firmware_version returns firmware_ahead /
firmware_behind and the UI shows "Integration update required" even when the
numbers look right on screen.

manifest.json version is deliberately not in this set: integration-only
releases can bump manifest without touching firmware. See
.github/scripts/validate-release.sh for the tag-time invariants.
"""

import re
from pathlib import Path

from tests.esphome_yaml import BASE_YAML
from tests.esphome_yaml import CORE_YAML
from tests.esphome_yaml import LITE_BASE_YAML
from tests.esphome_yaml import load_yaml

REPO_ROOT = Path(__file__).resolve().parents[1]


def _read_const_firmware_version() -> str:
    text = (REPO_ROOT / "custom_components" / "eppgrid" / "const.py").read_text()
    match = re.search(r'^FIRMWARE_VERSION\s*=\s*"([^"]+)"', text, re.MULTILINE)
    assert match, "FIRMWARE_VERSION not found in const.py"
    return match.group(1)


def _read_yaml_firmware_version() -> str:
    # Parse the yaml properly so formatting changes (indent, quote style)
    # don't silently break this test.
    doc = load_yaml(CORE_YAML)
    version = (doc or {}).get("esphome", {}).get("project", {}).get("version")
    assert version, "esphome.project.version not found in epp-core.yaml"
    return str(version)


def test_const_py_and_base_yaml_firmware_versions_match():
    """const.py must match epp-core.yaml or the UI will nag about updates."""
    const_ver = _read_const_firmware_version()
    yaml_ver = _read_yaml_firmware_version()
    assert const_ver == yaml_ver, (
        f"custom_components/eppgrid/const.py FIRMWARE_VERSION={const_ver!r} "
        f"but firmware/common/epp-core.yaml project.version={yaml_ver!r}. "
        f"These must match — bump both together."
    )


def test_no_model_base_overrides_the_shared_project_version():
    """`project.version` is declared once, in the shared core, and never overridden.

    A model base that set its own `project.version` would ship claiming a
    version nothing else in the repo bumps: `bin/release.sh` and
    `validate-release.sh` both write and read `epp-core.yaml` alone, so the
    override would survive every release and the device would report a stale
    version forever while the integration's Repairs flow kept offering it an
    upgrade it already had.
    """
    for base in (BASE_YAML, LITE_BASE_YAML):
        project = (load_yaml(base) or {}).get("esphome", {}).get("project", {})
        assert "version" not in project, (
            f"{base.name} sets esphome.project.version. Remove it — the version is "
            f"declared once in epp-core.yaml so every model reports the same one."
        )
        assert project.get("name"), (
            f"{base.name} must set esphome.project.name — it is the only per-model "
            f"field in the project block, and ESP Web Tools shows it to the user."
        )


def test_epp_component_header_uses_esphome_project_version_macro():
    """Header must derive the version from ESPHOME_PROJECT_VERSION, not hardcode it.

    Hardcoding a string literal here was the historical bug source: someone
    would bump the yaml + const.py and forget the C++ header. ESPHome
    already defines ESPHOME_PROJECT_VERSION from esphome.project.version, so
    using the macro makes the forget-to-bump failure mode impossible.
    """
    header = (REPO_ROOT / "firmware" / "components" / "epp" / "epp_component.h").read_text()

    # Must reference the macro, not a hardcoded version string.
    assert "ESPHOME_PROJECT_VERSION" in header, (
        "epp_component.h should define FIRMWARE_VERSION_STR from ESPHOME_PROJECT_VERSION "
        "(which ESPHome exposes from esphome.project.version), not hardcode a version string. "
        "See test docstring."
    )

    # Must not contain a hardcoded semver literal on the FIRMWARE_VERSION_STR line.
    hardcoded = re.search(r'FIRMWARE_VERSION_STR\s*=\s*"\d+\.\d+\.\d+"', header)
    assert hardcoded is None, (
        f"epp_component.h contains a hardcoded version literal: {hardcoded.group(0)!r}. "
        f"It should reference ESPHOME_PROJECT_VERSION instead."
    )

    # Must have a dev fallback so builds outside ESPHome (e.g. unit tests) compile.
    assert re.search(r"#\s*ifndef\s+ESPHOME_PROJECT_VERSION", header), (
        "epp_component.h should #ifndef ESPHOME_PROJECT_VERSION with a fallback "
        "so builds outside ESPHome (unit tests, linting) still compile."
    )
