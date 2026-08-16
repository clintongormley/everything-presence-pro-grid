"""The Lite's status LED must ignore a missing CO2 module but still flash for real faults.

The Everything Presence Lite's only indicator is `platform: status_led`
(everything-presence-lite-base.yaml), which ESPHome blinks whenever *any*
component raises the global error state. The SCD40 CO2 sensor is an optional
add-on: when it is absent, `scd4x` cannot reach it over I2C and calls
`mark_failed()`, which sets the app-wide error bit and leaves the status LED
blinking forever — even though nothing is actually wrong with the device.

The Pro is immune because its LED is a script-driven RGB ring, not a status_led,
and the Lite cannot simply demote its LED to a plain light without losing *all*
fault indication (WiFi / API / BLE down, etc.).

The fix lives in co2-lite-base.yaml: an interval clears just the scd40
component's error. ESPHome's `status_clear_error()` only drops the app-wide
error bit when no *other* component still holds it, so genuine faults keep
blinking the LED while a missing CO2 module does not. scd4x probes its sensor
from a deferred `set_timeout` (~1s after setup), so the clear must run on an
interval rather than on_boot, which fires before the failure has landed.

These tests pin that behaviour to the merged config the device is built from.
"""

from __future__ import annotations

import json

from tests.esphome_yaml import LITE_CO2_VARIANT_YAML
from tests.esphome_yaml import LITE_VARIANT_YAML
from tests.esphome_yaml import find_by_platform
from tests.esphome_yaml import load_variant


def _intervals(variant_yaml) -> list:
    intervals = load_variant(variant_yaml).get("interval", [])
    return intervals if isinstance(intervals, list) else [intervals]


def test_lite_co2_build_clears_scd40_error():
    """The CO2 Lite build clears the scd40 error so a missing module doesn't blink the status LED."""
    clearing = [
        entry
        for entry in _intervals(LITE_CO2_VARIANT_YAML)
        if "scd40" in json.dumps(entry) and "status_clear_error" in json.dumps(entry)
    ]
    assert clearing, (
        "wifi-ble-lite-co2 must clear the scd40 component error on an interval so an "
        "absent CO2 module does not park the status LED in a permanent error blink"
    )


def test_lite_co2_keeps_status_led():
    """The fix suppresses the CO2 error, it does not demote the LED — the status_led stays so real faults still show."""
    lights = load_variant(LITE_CO2_VARIANT_YAML).get("light", [])
    assert find_by_platform(lights, "status_led") is not None, (
        "the Lite's fault indicator must remain a status_led; demoting it to a plain "
        "light would silence WiFi / API / BLE faults too"
    )


def test_bare_lite_build_has_no_scd40_reference():
    """The clearing logic lives in the CO2 package only — a bare Lite compiles no scd4x to reference."""
    config = json.dumps(load_variant(LITE_VARIANT_YAML))
    assert "scd40" not in config, (
        "the bare Lite build compiles no scd4x; a stray id(scd40) reference (e.g. the "
        "error-clear interval placed in the shared lite base) would fail to compile"
    )
    assert "status_clear_error" not in config
