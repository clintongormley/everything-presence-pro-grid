"""Environmental sensors are disabled by default in firmware.

Temperature reads ~10°C high (board self-heating), humidity is unreliable, and
the BH1750 lux disagrees with other lux sensors in the room. None of the three
is good enough to be a default-on entity in HA — too easy for users to wire
them into automations and get bad data.

The values are still pushed live to the eppgrid panel's overview screen
because that path goes through aioesphomeapi.subscribe_states (see
custom_components/eppgrid/websocket_api.py _on_state) and does not depend on
the HA entity registry's disabled_by flag. Disabling the HA entities by
default only suppresses them from automations / Lovelace pickers / state
recorder — the live UI keeps working.
"""

from pathlib import Path

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml() -> dict:
    return load_variant(WIFI_VARIANT_YAML)


def _find_sensor_by_id(sensors: list, sensor_id: str) -> dict | None:
    for s in sensors:
        if isinstance(s, dict) and s.get("id") == sensor_id:
            return s
    return None


def test_temperature_sensor_disabled_by_default():
    """SHTC3 temperature is unreliable (~10°C high from board self-heating)."""
    doc = _load_base_yaml()
    shtc = _find_sensor_by_id(doc["sensor"], "shtc3_sensor")
    assert shtc is not None, "shtc3_sensor not found in firmware YAML"
    temp = shtc.get("temperature", {})
    assert temp.get("disabled_by_default") is True, (
        "shtcx temperature sub-sensor must set disabled_by_default: true. "
        "Reads ~10°C high so it should not be a default-on entity."
    )


def test_humidity_sensor_disabled_by_default():
    """SHTC3 humidity is unreliable enough not to be a default entity."""
    doc = _load_base_yaml()
    shtc = _find_sensor_by_id(doc["sensor"], "shtc3_sensor")
    assert shtc is not None, "shtc3_sensor not found in firmware YAML"
    hum = shtc.get("humidity", {})
    assert hum.get("disabled_by_default") is True, "shtcx humidity sub-sensor must set disabled_by_default: true."


def test_illuminance_sensor_disabled_by_default():
    """BH1750 lux disagrees with other lux sensors — default off."""
    doc = _load_base_yaml()
    bh = _find_sensor_by_id(doc["sensor"], "illuminance_sensor")
    assert bh is not None, "illuminance_sensor not found in firmware YAML"
    assert bh.get("disabled_by_default") is True, "bh1750 illuminance sensor must set disabled_by_default: true."
