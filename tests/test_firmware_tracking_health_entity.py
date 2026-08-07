"""Tracking Sensor connectivity binary sensor configured in firmware base YAML.

The tracking-health entity reports whether the LD2450 tracker is sending frames
at all — independent of whether any target is present (the LD2450 streams ~10Hz
even in an empty room). It exists so a dead/disconnected tracker reads
"Disconnected" instead of looking like an empty room (issue #407). It's defined
in `epp.tracking_health` and built by the external component into a
binary_sensor entity ESPHome publishes to HA.
"""

from pathlib import Path

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml() -> dict:
    # tracking_health lives in the shared epp-entities.yaml (both models run an
    # LD2450), so assert against the merged variant config rather than a single
    # base file — see tests/esphome_yaml.load_variant.
    return load_variant(WIFI_VARIANT_YAML)


def test_tracking_health_present_in_epp_block():
    doc = _load_base_yaml()
    tracking_health = doc.get("epp", {}).get("tracking_health")
    assert tracking_health is not None, (
        "epp.tracking_health must be configured in the shared epp-entities.yaml — "
        "this is the connectivity binary_sensor that surfaces a silent/dead tracker (#407)."
    )


def test_tracking_health_has_correct_name():
    doc = _load_base_yaml()
    tracking_health = doc["epp"]["tracking_health"]
    assert tracking_health.get("name") == "Tracking Sensor", (
        "tracking_health entity must be named 'Tracking Sensor' for the HA registry."
    )


def test_tracking_health_uses_connectivity_device_class():
    doc = _load_base_yaml()
    tracking_health = doc["epp"]["tracking_health"]
    assert tracking_health.get("device_class") == "connectivity", (
        "tracking_health should use device_class: connectivity (on = tracker frames arriving)."
    )


def test_tracking_health_is_diagnostic():
    doc = _load_base_yaml()
    tracking_health = doc["epp"]["tracking_health"]
    assert tracking_health.get("entity_category") == "diagnostic", (
        "tracking_health must set entity_category: diagnostic — it's a device-health signal."
    )


def test_tracking_health_enabled_by_default():
    doc = _load_base_yaml()
    tracking_health = doc["epp"]["tracking_health"]
    # A dead tracker is invisible unless this entity is enabled without the user
    # first un-hiding it, so it must NOT be disabled_by_default (the whole point
    # of #407 is that the fault should be visible out of the box).
    assert tracking_health.get("disabled_by_default") in (None, False), (
        "tracking_health must be enabled by default so a silent tracker is visible "
        "without hunting through hidden entities (#407)."
    )
