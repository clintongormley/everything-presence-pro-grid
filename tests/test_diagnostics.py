"""Tests for diagnostic dump."""

from __future__ import annotations

from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import FIRMWARE_VERSION
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.diagnostics import async_get_config_entry_diagnostics
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a store instance."""
    return EPPGridStore(hass)


@pytest.fixture
def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceManager:
    """Create a DeviceManager and register it on hass.data."""
    mgr = DeviceManager(hass, store)
    hass.data[DOMAIN] = mgr
    return mgr


class TestDiagnosticDump:
    """Tests for async_get_config_entry_diagnostics."""

    async def test_empty_state(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """Dump with no devices returns empty collections."""
        result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert result["firmware_version"] == FIRMWARE_VERSION
        assert "integration_version" in result
        assert result["devices"] == []
        assert result["stored_configs"] == {}
        assert result["configurations"] == {}
        assert result["entity_states"] == {}

    async def test_with_device_and_config(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager, store: EPPGridStore
    ) -> None:
        """Dump includes device info (with mac/host redacted), stored config, and configurations."""
        from homeassistant.components.diagnostics import REDACTED

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100")
        store.devices[mac] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0},
            "settings": {"timeout": 10},
        }
        store.configurations["bedroom"] = {"grid_bytes": [0] * 400}
        manager._build_flags[mac] = {"has_ble": True}

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert len(result["devices"]) == 1
        dev = result["devices"][0]
        # mac/host redacted, but the rest of the device dict is preserved.
        assert dev["mac"] == REDACTED
        assert dev["name"] == "Office"
        assert dev["host"] == REDACTED

        # MAC keys are reindexed to stable device_N slots.
        assert "device_0" in result["stored_configs"]
        assert result["stored_configs"]["device_0"]["calibration"]["room_width"] == 3000.0

        # Top-level configurations are name-keyed (not MAC-keyed) so they're untouched.
        assert "bedroom" in result["configurations"]
        assert result["configurations"]["bedroom"]["grid_bytes"] == [0] * 400

    async def test_entity_states_collected(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """Dump collects entity states for each device."""
        mac = "AA:BB:CC:DD:EE:FF"

        # Register a HA device for this managed device
        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("esphome", "test_device")},
            name="Office",
        )
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100", device_id=device.id)

        # Register an entity for the device
        ent_reg = er.async_get(hass)
        ent_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            "office_zone_1_presence",
            config_entry=config_entry,
            device_id=device.id,
            suggested_object_id="office_zone_1_presence",
        )
        entity_id = ent_entry.entity_id
        assert entity_id == "binary_sensor.office_zone_1_presence"
        hass.states.async_set(entity_id, "on")

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        # MAC keys are reindexed; entity_ids inside are re-keyed too — the
        # device-name prefix ("office") is replaced by the device index so a
        # default ESPHome name embedding the MAC can't leak through the key.
        assert "device_0" in result["entity_states"]
        assert result["entity_states"]["device_0"]["binary_sensor.device_0_zone_1_presence"] == "on"
        assert entity_id not in result["entity_states"]["device_0"]

    async def test_entity_ids_do_not_leak_mac_fragment_for_default_named_device(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager, store: EPPGridStore
    ) -> None:
        """Default ESPHome device names embed the MAC's last 6 hex digits,
        and entity_ids inherit that as their object_id prefix — so the
        entity_state KEYS would leak the MAC despite field redaction.
        Diagnostics must re-key entity_ids by the device index."""
        import json

        mac = "AA:BB:CC:DD:EE:FF"

        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("esphome", "test_device")},
            name="Everything Presence Pro DDEEFF",
        )
        manager.devices[mac] = ManagedDevice(
            mac=mac, name="Everything Presence Pro DDEEFF", host="192.168.1.100", device_id=device.id
        )
        # Stored display name keeps list_devices' `name` field (which is not
        # part of this fix) out of the full-dump assertion below — the leak
        # under test is the entity_id KEY prefix.
        store.devices[mac] = {"name": "Office"}

        ent_reg = er.async_get(hass)
        ent_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=config_entry,
            device_id=device.id,
            suggested_object_id="everything_presence_pro_ddeeff_firmware_version",
        )
        hass.states.async_set(ent_entry.entity_id, "0.99.0")

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        serialized = json.dumps(result).lower()
        assert "ddeeff" not in serialized
        assert result["entity_states"]["device_0"]["sensor.device_0_firmware_version"] == "0.99.0"

    async def test_entity_states_skips_devices_without_device_id(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """Devices without a device_id get an empty entity_states dict."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100", device_id=None)

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        # MAC keys are reindexed; the empty inner dict is preserved.
        assert result["entity_states"]["device_0"] == {}

    async def test_redacts_mac_and_host_in_devices(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager, store: EPPGridStore
    ) -> None:
        """Diagnostics output must redact MAC and host fields, and re-key MAC-keyed dicts.

        Users routinely paste diagnostics dumps into public GitHub issues; the device
        identifier (MAC) and LAN IP (host) leak the device's network-layer identity.
        """
        import json

        from homeassistant.components.diagnostics import REDACTED

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100")
        store.devices[mac] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0},
        }

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        # The serialized blob must not contain the raw MAC or host string anywhere.
        serialized = json.dumps(result)
        assert mac not in serialized
        assert "192.168.1.100" not in serialized

        # Devices list: mac/host fields are redacted.
        assert len(result["devices"]) == 1
        dev = result["devices"][0]
        assert dev["mac"] == REDACTED
        assert dev["host"] == REDACTED

        # MAC-keyed dicts get reindexed so the key itself doesn't leak.
        assert mac not in result["stored_configs"]
        assert mac not in result["entity_states"]

    async def test_entity_ids_do_not_leak_mac_fragment_for_renamed_device(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager, store: EPPGridStore
    ) -> None:
        """A device renamed to e.g. 'Office' still has entity_ids slugged from its
        OLD default name (e.g. sensor.everything_presence_pro_ddeeff_firmware_version).
        The device's `name` field can also carry the MAC hex fragment if the user
        renamed it to something else but the stored name is still the default.
        Diagnostics must redact the MAC hex fragments from all keys/strings
        regardless of the current device name."""
        import json

        mac = "AA:BB:CC:DD:EE:FF"
        # The user renamed the device to "Office" in HA
        dev_reg = dr.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("esphome", "test_device_renamed")},
            name="Office",
        )
        manager.devices[mac] = ManagedDevice(mac=mac, name="Office", host="192.168.1.100", device_id=device.id)
        store.devices[mac] = {"name": "Office"}

        ent_reg = er.async_get(hass)
        # entity_id is still slugged from the OLD default name that embedded the MAC fragment
        ent_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=config_entry,
            device_id=device.id,
            suggested_object_id="everything_presence_pro_ddeeff_firmware_version",
        )
        hass.states.async_set(ent_entry.entity_id, "0.99.0")

        result = await async_get_config_entry_diagnostics(hass, config_entry)

        serialized = json.dumps(result).lower()
        # The MAC fragment must not appear anywhere — even though current device
        # name is "Office" (doesn't match "ddeeff"), the entity_id still embeds it.
        assert "ddeeff" not in serialized, (
            f"MAC fragment 'ddeeff' leaked in diagnostics dump for renamed device:\n{serialized}"
        )

    async def test_integration_version_uses_loader(
        self, hass: HomeAssistant, config_entry: MockConfigEntry, manager: DeviceManager
    ) -> None:
        """integration_version is read from async_get_loaded_integration, not a static manifest cache."""
        fake_integration = MagicMock()
        fake_integration.version = "9.9.9-test"
        with patch(
            "custom_components.eppgrid.diagnostics.async_get_loaded_integration",
            return_value=fake_integration,
        ):
            result = await async_get_config_entry_diagnostics(hass, config_entry)

        assert result["integration_version"] == "9.9.9-test"
