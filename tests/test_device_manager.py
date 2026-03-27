"""Tests for EPP Grid device manager."""
from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from custom_components.eppgrid.device_manager import DeviceConnection
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
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
        ent_reg.async_get_or_create(
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


class TestDeviceConnection:
    async def test_connect_and_disconnect(self) -> None:
        """Connection opens and closes cleanly."""
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            client.subscribe_states = MagicMock()
            mock_cls.return_value = client

            conn = DeviceConnection("192.168.1.100", 6053)
            await conn.async_connect()
            assert conn.connected is True

            await conn.async_disconnect()
            assert conn.connected is False
            client.disconnect.assert_called_once()

    async def test_push_config(self) -> None:
        """Config push calls the three ESPHome service actions."""
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            # Build mock services with .name attribute set correctly
            # (MagicMock(name=...) sets the mock repr name, NOT the .name attribute)
            svc_perspective = MagicMock()
            svc_perspective.name = "epp_set_perspective"
            svc_grid = MagicMock()
            svc_grid.name = "epp_set_grid"
            svc_zones = MagicMock()
            svc_zones.name = "epp_set_zones"
            mock_services = [svc_perspective, svc_grid, svc_zones]
            client.list_entities_services = AsyncMock(return_value=([], mock_services))
            client.subscribe_states = MagicMock()
            client.execute_service = AsyncMock()
            mock_cls.return_value = client

            conn = DeviceConnection("192.168.1.100", 6053)
            await conn.async_connect()

            config = {
                "calibration": {
                    "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
                    "room_width": 3000.0,
                    "room_depth": 4000.0,
                },
                "room_layout": {
                    "grid_bytes": [1] * 400,
                    "zone_slots": [None] * 7,
                    "room_type": "normal",
                },
            }
            await conn.async_push_config(config)
            assert client.execute_service.call_count == 3


class TestAutoConfigPush:
    async def test_push_on_device_available(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Config is pushed when a managed device becomes available."""
        await store.async_load()
        store.devices["AA:BB:CC:DD:EE:FF"] = {
            "name": "Test",
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
            "room_layout": {"grid_bytes": [1] * 400, "zone_slots": [None] * 7, "room_type": "normal"},
        }

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="Test",
            host="192.168.1.100",
        )

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            await manager._on_device_available("AA:BB:CC:DD:EE:FF")
            mock_push.assert_called_once_with("AA:BB:CC:DD:EE:FF")


class TestEntityManagement:
    async def test_enable_zone_entities(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Configuring zones enables corresponding ESPHome entities."""
        from pytest_homeassistant_custom_component.common import MockConfigEntry

        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            entry_id="esphome_entry_1",
            data={"host": "192.168.1.50"},
            title="EPP",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id="esphome_entry_1",
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create disabled ESPHome zone occupancy entities
        for i in range(3):
            ent_reg.async_get_or_create(
                domain="binary_sensor",
                platform="esphome",
                unique_id=f"esphome_aabbccddeeff_zone_{i}_occupancy",
                suggested_object_id=f"epp_zone_{i}_occupancy",
                config_entry=esphome_entry,
                device_id=device.id,
                disabled_by=er.RegistryEntryDisabler.INTEGRATION,
            )

        zone_slots = [
            {"name": "Entrance", "type": "entrance"},
            {"name": "Armchair", "type": "normal"},
            None, None, None, None, None,
        ]

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", device_id=device.id
        )

        # Store calibration so zone 0 is enabled
        await manager._store.async_load()
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
        }

        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 (rest of room) should be enabled when calibrated
        ent0 = ent_reg.async_get("binary_sensor.epp_zone_0_occupancy")
        assert ent0 is not None
        assert ent0.disabled_by is None

        # Zone 1 (Entrance) should be enabled and renamed
        ent1 = ent_reg.async_get("binary_sensor.epp_zone_1_occupancy")
        assert ent1 is not None
        assert ent1.disabled_by is None
        assert ent1.name == "Entrance"

        # Zone 2 (Armchair) should be enabled and renamed
        ent2 = ent_reg.async_get("binary_sensor.epp_zone_2_occupancy")
        assert ent2 is not None
        assert ent2.disabled_by is None
        assert ent2.name == "Armchair"


class TestDeviceSession:
    async def test_open_and_close_session(self, manager: DeviceManager) -> None:
        """Session opens a connection and closes it."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="Test", host="192.168.1.100"
        )
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            mock_cls.return_value = client

            conn = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            assert conn is not None
            assert conn.connected is True
            assert "AA:BB:CC:DD:EE:FF" in manager._active_connections

            await manager.async_close_session("AA:BB:CC:DD:EE:FF")
            assert "AA:BB:CC:DD:EE:FF" not in manager._active_connections
            client.disconnect.assert_called_once()

    async def test_open_session_reuses_existing(self, manager: DeviceManager) -> None:
        """Opening a session when one exists returns the same connection."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="Test", host="192.168.1.100"
        )
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            mock_cls.return_value = client

            conn1 = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            conn2 = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            assert conn1 is conn2
            # Only one connection was created
            assert mock_cls.call_count == 1

    async def test_get_session_returns_none_without_open(self, manager: DeviceManager) -> None:
        """get_session returns None if no session is open."""
        assert manager.get_session("AA:BB:CC:DD:EE:FF") is None

    async def test_push_uses_existing_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Push config uses the active session connection."""
        await store.async_load()
        store.devices["AA:BB:CC:DD:EE:FF"] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
        }
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="Test", host="192.168.1.100"
        )
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            svc = MagicMock()
            svc.name = "epp_set_perspective"
            client.list_entities_services = AsyncMock(return_value=([], [svc]))
            client.execute_service = AsyncMock()
            mock_cls.return_value = client

            # Open session first
            await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            # Push should use the same connection
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")
            client.execute_service.assert_called()
            # Only one connection was opened (no temporary)
            assert mock_cls.call_count == 1


class TestStateFanOut:
    async def test_multiple_subscribers(self) -> None:
        """Multiple subscribers all receive state updates."""
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            client.subscribe_states = MagicMock()
            mock_cls.return_value = client

            conn = DeviceConnection("192.168.1.100")
            await conn.async_connect()

            received_a = []
            received_b = []
            conn.subscribe_states(lambda s: received_a.append(s))
            conn.subscribe_states(lambda s: received_b.append(s))

            # Simulate a state dispatch
            conn._dispatch_state("test_state")

            assert received_a == ["test_state"]
            assert received_b == ["test_state"]

    async def test_subscribe_states_calls_client_once(self) -> None:
        """Multiple subscribe_states calls only subscribe to the client once."""
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            client.subscribe_states = MagicMock()
            mock_cls.return_value = client

            conn = DeviceConnection("192.168.1.100")
            await conn.async_connect()

            conn.subscribe_states(lambda s: None)
            conn.subscribe_states(lambda s: None)
            conn.subscribe_states(lambda s: None)

            # Client subscribe_states called only once
            client.subscribe_states.assert_called_once()
