"""WiFi signal-strength diagnostic sensor (wifi-ble-co2 variant only).

Field reports of a device intermittently dropping off WiFi were impossible for
the user to self-diagnose: the firmware exposed no signal-strength entity, so
RSSI only appeared in the serial connect banner — which requires tethering the
device over USB and thus moving it away from its real (and possibly
poor-coverage) mounting spot. The reading you could get was never the reading
you needed.

A `wifi_signal` diagnostic sensor lets users read RSSI at the device's actual
location from the HA device page, so "is this a coverage problem?" is
answerable without a laptop.

Placement matters: ESPHome's `wifi_signal` platform *requires* a `wifi:`
component, and the `ethernet-ble-co2` variant has none. So the sensor lives in
the `wifi-ble-co2` variant (next to its `wifi:` block), NOT in the shared
`everything-presence-pro-base.yaml` — which both variants include. Putting it
in the base fails the ethernet config with
`Component sensor.wifi_signal requires component wifi`. The
`test_wifi_signal_absent_from_shared_base` case below guards that regression.
"""

from pathlib import Path

from tests.esphome_yaml import ETHERNET_VARIANT_YAML
from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load(path: Path) -> dict:
    return load_variant(path)


def _find_sensor_by_platform(sensors: list | None, platform: str) -> dict | None:
    for s in sensors or []:
        if isinstance(s, dict) and s.get("platform") == platform:
            return s
    return None


def _wifi_signal_sensor() -> dict | None:
    return _find_sensor_by_platform(_load(WIFI_VARIANT_YAML).get("sensor"), "wifi_signal")


def test_wifi_signal_sensor_present_in_wifi_variant():
    """RSSI exposed via the `wifi_signal` platform so coverage is visible."""
    assert _wifi_signal_sensor() is not None, (
        "wifi-ble-co2 variant must define a `platform: wifi_signal` sensor so "
        "users can read signal strength at the device's real mounting location "
        "instead of only in the serial connect banner (which requires tethering)."
    )


def test_wifi_signal_sensor_has_name():
    """A named entity — the device page needs something to show."""
    sensor = _wifi_signal_sensor()
    assert sensor is not None
    assert sensor.get("name"), "wifi_signal sensor must have a `name`"


def test_wifi_signal_sensor_is_diagnostic():
    """Matches the other diagnostic sensors (Heap, Uptime, Reset Reason)."""
    sensor = _wifi_signal_sensor()
    assert sensor is not None
    assert sensor.get("entity_category") == "diagnostic", "wifi_signal sensor must be entity_category: diagnostic"


def test_wifi_signal_sensor_enabled_by_default():
    """Enabled by default — passive diagnosability is the whole point."""
    sensor = _wifi_signal_sensor()
    assert sensor is not None
    assert sensor.get("disabled_by_default") in (None, False), (
        "wifi_signal sensor must be enabled by default so users don't have to "
        "know it exists before they can diagnose a coverage problem."
    )


def test_wifi_signal_absent_from_the_ethernet_build():
    """Regression guard: the shared base is included by the ethernet variant,
    which has no `wifi:` component. A `wifi_signal` sensor there fails the
    ethernet config with `sensor.wifi_signal requires component wifi`, so it
    must never live in the base."""
    # Checked against the ethernet variant's merged config: what breaks the
    # build is the sensor reaching a build with no `wifi:` component, and that
    # holds wherever the shared packages put it.
    ethernet_sensor = _find_sensor_by_platform(_load(ETHERNET_VARIANT_YAML).get("sensor"), "wifi_signal")
    assert ethernet_sensor is None, (
        "wifi_signal must not reach the ethernet build — it has no `wifi:` "
        "component, so ESPHome fails its config with `requires component wifi`."
    )
