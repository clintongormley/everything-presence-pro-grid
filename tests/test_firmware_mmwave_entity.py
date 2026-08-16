"""mmWave Presence binary sensor configured in firmware base YAML.

The mmwave entity combines static presence + target tracker (LD2450), ignoring
the PIR motion sensor. It's defined in `epp.mmwave_output` and built by the
external component into a binary_sensor entity that ESPHome publishes to HA.
"""

from pathlib import Path

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml() -> dict:
    return load_variant(WIFI_VARIANT_YAML)


def test_mmwave_output_present_in_epp_block():
    doc = _load_base_yaml()
    mmwave = doc.get("epp", {}).get("mmwave_output")
    assert mmwave is not None, (
        "epp.mmwave_output must be configured in everything-presence-pro-base.yaml — "
        "this is the binary_sensor entity that combines static presence + target tracker."
    )


def test_mmwave_output_has_correct_name():
    doc = _load_base_yaml()
    mmwave = doc["epp"]["mmwave_output"]
    assert mmwave.get("name") == "mmWave Presence", (
        "mmwave_output entity must be named 'mmWave Presence' for HA registry."
    )


def test_mmwave_output_uses_occupancy_device_class():
    doc = _load_base_yaml()
    mmwave = doc["epp"]["mmwave_output"]
    assert mmwave.get("device_class") == "occupancy", (
        "mmwave_output should use device_class: occupancy (it represents room presence)."
    )


def test_mmwave_output_disabled_by_default():
    doc = _load_base_yaml()
    mmwave = doc["epp"]["mmwave_output"]
    assert mmwave.get("disabled_by_default") is True, (
        "mmwave_output must set disabled_by_default: true — Occupancy is the default-on entity."
    )
