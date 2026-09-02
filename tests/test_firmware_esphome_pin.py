"""ESPHome toolchain is pinned and reproducible.

The firmware's entity metadata (units, device_class, state_class) comes partly
from ESPHome's built-in platform schemas, which change between ESPHome releases.
A bare `pip install esphome` in CI floats to whatever is newest at build time,
so the same git commit can produce different firmware on different days. That is
exactly how "Heap Largest Block" silently lost its state_class: the official OTA
build used >=2026.4.0 (which defaults state_class on the debug sensors) while a
local build on 2026.3.1 did not. See test_firmware_heap_diagnostics.py.

Pinning makes builds reproducible across CI and local dev:

  1. firmware/requirements.txt        — exact `esphome==X.Y.Z` used by CI + local.
  2. esphome.min_version in base.yaml — floor for DIY adopters who build from the
       package_import_url with their own ESPHome (the CI pin can't reach them).

Invariant: min_version <= pin. You must never declare a minimum above the
version you actually build and test with, nor pin below your own declared floor.
"""

import re
from pathlib import Path

from tests.esphome_yaml import CORE_YAML
from tests.esphome_yaml import load_yaml

REPO_ROOT = Path(__file__).resolve().parents[1]

REQUIREMENTS = REPO_ROOT / "firmware" / "requirements.txt"
WORKFLOWS = [
    REPO_ROOT / ".github" / "workflows" / "firmware-release.yml",
    REPO_ROOT / ".github" / "workflows" / "firmware.yml",
]


def _read_pin() -> str:
    assert REQUIREMENTS.exists(), (
        "firmware/requirements.txt must exist and pin ESPHome exactly so CI and local builds are reproducible."
    )
    match = re.search(r"^esphome==(\S+)", REQUIREMENTS.read_text(), re.MULTILINE)
    assert match, (
        "firmware/requirements.txt must pin ESPHome with `esphome==X.Y.Z` "
        "(exact pin, not >= or ~=), so the same commit always builds the same "
        "firmware."
    )
    return match.group(1)


def _read_min_version() -> str:
    doc = load_yaml(CORE_YAML)
    min_version = (doc or {}).get("esphome", {}).get("min_version")
    assert min_version, (
        "esphome.min_version must be set in epp-core.yaml — it is the only floor "
        "over DIY adopters who build from package_import_url with their own "
        "ESPHome; the CI pin cannot reach them. It lives in the shared core so "
        "both models declare the same floor."
    )
    return str(min_version)


def _parse(version: str) -> tuple:
    assert re.fullmatch(r"\d+\.\d+\.\d+", version), (
        f"version {version!r} must be a concrete X.Y.Z release for the pin/floor "
        f"comparison — partial (2026.5), pre-release, or suffixed forms aren't "
        f"supported."
    )
    return tuple(int(part) for part in version.split("."))


def test_requirements_pins_esphome_exactly():
    """CI/local must build with one exact ESPHome version, not float to latest."""
    pin = _read_pin()
    assert re.fullmatch(r"\d+\.\d+\.\d+", pin), f"ESPHome pin {pin!r} should be a concrete X.Y.Z release."


def test_base_yaml_declares_min_version():
    """A min_version floor protects DIY builds from too-old ESPHome."""
    _read_min_version()


def test_min_version_not_above_pin():
    """The declared floor must never exceed the version we actually build with."""
    pin = _read_pin()
    min_version = _read_min_version()
    assert _parse(min_version) <= _parse(pin), (
        f"esphome.min_version={min_version!r} is above the build pin {pin!r}. "
        f"Never declare a minimum higher than the version CI/local builds with."
    )


def test_ci_workflows_install_from_pinned_requirements():
    """No workflow may `pip install esphome` unpinned — install from requirements."""
    for workflow in WORKFLOWS:
        text = workflow.read_text()
        assert "pip install -r firmware/requirements.txt" in text, (
            f"{workflow.name} must install ESPHome via "
            f"`pip install -r firmware/requirements.txt` for a reproducible build."
        )
        assert not re.search(r"pip3?\s+install\s+esphome\b(?!\s*==)", text), (
            f"{workflow.name} has an unpinned `pip install esphome` — install from "
            f"firmware/requirements.txt (or, if inline, pin it with `esphome==`)."
        )
