"""Tests for EPP Grid device manager."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.eppgrid.device_manager import DeviceManager, ManagedDevice
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    return EPPGridStore(hass)


@pytest.fixture
def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceManager:
    return DeviceManager(hass, store)


class TestDiscovery:
    async def test_no_esphome_devices(self, manager: DeviceManager) -> None:
        """Empty entity registry yields no managed devices."""
        await manager.async_discover()
        assert manager.devices == {}

    async def test_discovers_zone_engine_device(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Finds ESPHome device with zone_engine_version entity."""
        from homeassistant.helpers import device_registry as dr
        from pytest_homeassistant_custom_component.common import MockConfigEntry

        # Create a mock ESPHome config entry and register it with hass
        esphome_entry = MockConfigEntry(
            domain="esphome",
            entry_id="esphome_entry_1",
            data={"host": "192.168.1.50"},
            title="Everything Presence Pro",
        )
        esphome_entry.add_to_hass(hass)

        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)

        # Create the corresponding device in device registry
        device = dev_reg.async_get_or_create(
            config_entry_id="esphome_entry_1",
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="Everything Presence Pro",
        )

        # Simulate an ESPHome sensor entity for zone_engine_version
        entry = ent_reg.async_get_or_create(
            domain="sensor",
            platform="esphome",
            unique_id="esphome_aabbccddeeff_zone_engine_version",
            suggested_object_id="epp_zone_engine_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.name == "Everything Presence Pro"

    async def test_ignores_non_zone_engine_entities(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Entities without zone_engine_version are ignored."""
        ent_reg = er.async_get(hass)
        ent_reg.async_get_or_create(
            domain="sensor",
            platform="esphome",
            unique_id="esphome_aabbccddeeff_temperature",
            suggested_object_id="epp_temperature",
        )
        await manager.async_discover()
        assert manager.devices == {}
