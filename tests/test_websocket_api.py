"""Tests for WebSocket API commands."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import websocket_api as ws_module
from custom_components.eppgrid.const import DOMAIN

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_registered():
    """Clear the module-global _REGISTERED set between tests."""
    ws_module._REGISTERED.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
    """Set up the integration with a mocked DeviceManager and return the mock."""
    from custom_components.eppgrid.const import FIRMWARE_VERSION

    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=test",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        mock_dm._store = MagicMock()
        mock_dm._store.devices = {}
        mock_dm._store.templates = {}
        mock_dm._store.async_save = AsyncMock()
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    """Call a @websocket_api.async_response handler and flush the task queue."""
    handler(hass, connection, msg)
    await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestWebSocketListDevices:
    """Tests for eppgrid/list_devices."""

    async def test_list_devices(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_devices returns device list from manager."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_devices.return_value = [
            {"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP", "host": "192.168.1.50", "available": True, "configured": True}
        ]

        from custom_components.eppgrid.websocket_api import websocket_list_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_devices"}

        websocket_list_devices(hass, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[0] == 1
        assert len(result[1]["devices"]) == 1
        assert result[1]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"

    async def test_list_devices_not_ready(self, hass: HomeAssistant) -> None:
        """list_devices returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_list_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_devices"}

        websocket_list_devices(hass, connection, msg)
        connection.send_error.assert_called_once_with(
            1,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )


class TestWebSocketGetConfig:
    """Tests for eppgrid/get_config."""

    async def test_get_config(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """get_config returns stored config for a device."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.get_device = MagicMock(
            return_value={"calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0}}
        )

        from custom_components.eppgrid.websocket_api import websocket_get_config

        connection = MagicMock()
        msg = {"id": 2, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

        websocket_get_config(hass, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[1]["config"]["calibration"]["perspective"] == [1.0] * 8

    async def test_get_config_includes_entity_states(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """get_config includes entity enabled/disabled states from HA registry."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {}}
        mock_dm._store.get_device = MagicMock(return_value={"settings": {}})

        from custom_components.eppgrid.websocket_api import websocket_get_config

        entity_states = {"room_occupancy": True, "zone_presence": False}

        with patch(
            "custom_components.eppgrid.websocket_api._get_entity_states",
            return_value=entity_states,
        ) as mock_get_entities:
            connection = MagicMock()
            msg = {"id": 2, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

            websocket_get_config(hass, connection, msg)

            mock_get_entities.assert_called_once_with(hass, "AA:BB:CC:DD:EE:FF")
            result = connection.send_result.call_args[0]
            assert result[1]["config"]["entities"] == entity_states

    async def test_get_config_not_ready(self, hass: HomeAssistant) -> None:
        """get_config returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_get_config

        connection = MagicMock()
        msg = {"id": 2, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"}

        websocket_get_config(hass, connection, msg)
        connection.send_error.assert_called_once()


class TestWebSocketSetSetup:
    """Tests for eppgrid/set_setup (perspective calibration)."""

    async def test_set_setup_saves_and_pushes(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup saves calibration and pushes to device."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        assert "AA:BB:CC:DD:EE:FF" in mock_dm._store.devices
        cal = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["calibration"]
        assert cal["room_width"] == 3000.0
        assert cal["room_depth"] == 4000.0

        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(3)

    async def test_set_setup_updates_zone_entities_with_valid_empty_shape(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """After calibration clears room_layout, the fallback passed to
        async_update_zone_entities must be a valid length-8 shape with a
        Zone0Config at index 0 — otherwise the fail-closed guard would
        disable zone 0 unexpectedly."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_update_zone_entities = AsyncMock()

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 101,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }
        await call_async_handler(hass, websocket_set_setup, connection, msg)

        mock_dm.async_update_zone_entities.assert_awaited_once()
        zone_slots = mock_dm.async_update_zone_entities.call_args[0][1]
        assert len(zone_slots) == 8
        assert isinstance(zone_slots[0], dict)
        assert zone_slots[0] == {"type": "normal"}
        assert zone_slots[1:] == [None] * 7

    async def test_set_setup_clears_room_layout(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup clears existing room layout when calibration changes."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "room_layout": {"grid_bytes": [1] * 400},
        }

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        assert "room_layout" not in mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]

    async def test_set_setup_not_ready(self, hass: HomeAssistant) -> None:
        """set_setup returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)
        connection.send_error.assert_called_once()

    async def test_set_setup_delete_calibration_disables_target_xy(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Deleting calibration (room_width=0) disables target_xy and applies entity state."""
        mock_dm = await setup_integration(hass, config_entry)
        # Simulate target_xy was previously enabled
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"target_xy": True}}

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
            connection = MagicMock()
            msg = {
                "id": 5,
                "type": "eppgrid/set_setup",
                "mac": "AA:BB:CC:DD:EE:FF",
                "perspective": [0.0] * 8,
                "room_width": 0.0,
                "room_depth": 0.0,
            }

            await call_async_handler(hass, websocket_set_setup, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["target_xy"] is False
        mock_apply.assert_called_once_with(hass, "AA:BB:CC:DD:EE:FF", {"target_xy": False})

    async def test_set_setup_delete_calibration_sets_entity_update_guard(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Deleting calibration sets entity_update_macs guard to suppress reconnect push."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"target_xy": True}}

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states"):
            connection = MagicMock()
            msg = {
                "id": 5,
                "type": "eppgrid/set_setup",
                "mac": "AA:BB:CC:DD:EE:FF",
                "perspective": [0.0] * 8,
                "room_width": 0.0,
                "room_depth": 0.0,
            }

            await call_async_handler(hass, websocket_set_setup, connection, msg)

        assert "AA:BB:CC:DD:EE:FF" in mock_dm._entity_update_macs

    async def test_set_setup_calibration_does_not_enable_target_xy(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Adding calibration (room_width>0) must NOT auto-enable target_xy."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 6,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert "target_xy" not in settings


class TestWebSocketSetRoomLayout:
    """Tests for eppgrid/set_room_layout."""

    async def test_set_room_layout(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_room_layout saves layout and pushes to device."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP",
            host="192.168.1.50",
        )
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0}
        }

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office", "type": "normal"},
            None,
            None,
            None,
            None,
            None,
            None,
        ]
        connection = MagicMock()
        msg = {
            "id": 5,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [1] * 400,
            "zone_slots": zone_slots,
            "furniture": [],
        }

        await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        layout = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["room_layout"]
        assert layout["zone_slots"] == zone_slots
        assert layout["zone_slots"][0]["type"] == "normal"
        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited()
        mock_dm.async_update_zone_entities.assert_awaited_with("AA:BB:CC:DD:EE:FF", zone_slots)
        connection.send_result.assert_called_once_with(5)

    async def test_set_room_layout_stores_zone_0_in_zone_slots(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_room_layout stores zone 0 settings at zone_slots[0], not room_*."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = MagicMock(host="1.2.3.4")
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0}
        }

        zone_slots = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {
                "name": "Living",
                "color": "#ff0000",
                "type": "rest",
                "trigger": 7,
                "renew": 1,
                "timeout": 30.0,
                "handoff_timeout": 10.0,
            },
            None,
            None,
            None,
            None,
            None,
            None,
        ]

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        connection = MagicMock()
        msg = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0] * 400,
            "zone_slots": zone_slots,
            "furniture": [],
        }

        await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        layout = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["room_layout"]
        assert layout["zone_slots"] == zone_slots
        assert "room_type" not in layout
        assert "room_trigger" not in layout
        mock_dm.async_update_zone_entities.assert_awaited_with("AA:BB:CC:DD:EE:FF", zone_slots)

    async def test_set_room_layout_rejects_after_delete_calibration(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_room_layout rejects when calibration was cleared via set_setup.

        The delete-calibration flow in the frontend calls set_setup with
        room_width=0 (and a zeroed perspective array). That leaves
        `calibration.perspective` non-empty but the device is effectively
        uncalibrated — so the room_width>0 signal is the one that must gate
        set_room_layout, not mere perspective presence.
        """
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = MagicMock(host="1.2.3.4")
        # Post-delete calibration state — perspective present but room_width=0.
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "calibration": {
                "perspective": [0.0] * 8,
                "room_width": 0,
                "room_depth": 0,
            },
        }

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        zone_slots = [{"type": "normal"}] + [None] * 7
        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0] * 400,
            "zone_slots": zone_slots,
            "furniture": [],
        }

        await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        assert "room_layout" not in mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]
        mock_dm._push_config_to_device.assert_not_awaited()
        connection.send_error.assert_called_once()
        args, _ = connection.send_error.call_args
        assert args[1] == "not_calibrated"

    async def test_set_room_layout_rejects_uncalibrated_device(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_room_layout rejects when the device has no stored perspective.

        Applying a template to an uncalibrated device would otherwise write
        room_layout to storage (and push to the device) without the perspective
        needed to interpret it — leaving the device effectively uncalibrated
        but with a "configured" layout. Fail closed at the boundary.
        """
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = MagicMock(host="1.2.3.4")
        # Device has no "calibration" key in storage => uncalibrated.
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {}

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        zone_slots = [{"type": "normal"}] + [None] * 7
        connection = MagicMock()
        msg = {
            "id": 9,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0] * 400,
            "zone_slots": zone_slots,
            "furniture": [],
        }

        await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        # No storage write, no device push, no entity update
        assert "room_layout" not in mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]
        mock_dm._push_config_to_device.assert_not_awaited()
        mock_dm.async_update_zone_entities.assert_not_awaited()

        # User-facing error with translation key
        connection.send_error.assert_called_once()
        args, kwargs = connection.send_error.call_args
        assert args[0] == 9
        assert args[1] == "not_calibrated"
        assert kwargs.get("translation_domain") == DOMAIN
        assert kwargs.get("translation_key") == "not_calibrated"


class TestZoneSlotsValidator:
    """Tests for the _validate_zone_slots voluptuous validator used by set_room_layout."""

    def _valid_slots(self) -> list:
        """Return a minimal valid zone_slots list."""
        return [{"type": "normal"}] + [None] * 7

    def test_accepts_valid_zone_slots(self) -> None:
        """Valid slots: zone 0 dict with type, slots 1-7 null or named dict."""
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        valid = self._valid_slots()
        assert _validate_zone_slots(valid) == valid

        valid_named = [
            {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office", "color": "#ff0000", "type": "normal"},
            None,
            None,
            None,
            None,
            None,
            None,
        ]
        assert _validate_zone_slots(valid_named) == valid_named

    def test_rejects_wrong_length(self) -> None:
        """Lists not of length NUM_ZONE_SLOTS are rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "normal"}] + [None] * 6)  # length 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "normal"}] + [None] * 8)  # length 9
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([])

    def test_rejects_non_list(self) -> None:
        """Non-list inputs are rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots("not a list")
        with pytest.raises(vol.Invalid):
            _validate_zone_slots({"type": "normal"})
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(None)

    def test_rejects_none_at_slot_0(self) -> None:
        """Slot 0 must not be None."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [None] * 8
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_non_dict_at_slot_0(self) -> None:
        """Slot 0 must be a dict."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = ["not a dict"] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_without_type(self) -> None:
        """Slot 0 must have a 'type' key."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_non_dict_at_named_slot(self) -> None:
        """Named slots (1-7) must be null or a dict."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal"}, "not a dict"] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_without_name(self) -> None:
        """Named slots must have a string 'name'."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal"}, {"color": "#ff0000", "type": "normal"}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_without_color(self) -> None:
        """Named slots must have a string 'color'."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal"}, {"name": "Office", "type": "normal"}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_without_type(self) -> None:
        """Named slots must have a string 'type'."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal"}, {"name": "Office", "color": "#ff0000"}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_with_non_string_name(self) -> None:
        """Named slot 'name' must be a string."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "normal"},
            {"name": 123, "color": "#ff0000", "type": "normal"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_string_type(self) -> None:
        """Slot 0 'type' must be a string (consistent with named zones)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": 42}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_trigger(self) -> None:
        """Slot 0 optional timing fields must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal", "trigger": "5"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_renew(self) -> None:
        """Slot 0 'renew' must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal", "renew": "3"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_timeout(self) -> None:
        """Slot 0 'timeout' must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal", "timeout": "10"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_handoff_timeout(self) -> None:
        """Slot 0 'handoff_timeout' must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "normal", "handoff_timeout": "3"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_with_non_numeric_trigger(self) -> None:
        """Named slot timing fields must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "normal"},
            {"name": "Office", "color": "#ff0000", "type": "normal", "trigger": "5"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_accepts_numeric_timing_fields(self) -> None:
        """int and float values for timing fields are both accepted."""
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {
                "type": "normal",
                "trigger": 5,
                "renew": 3.5,
                "timeout": 10,
                "handoff_timeout": 3.0,
            },
            {
                "name": "Office",
                "color": "#ff0000",
                "type": "normal",
                "trigger": 4,
                "renew": 2.0,
                "timeout": 12.5,
                "handoff_timeout": 2,
            },
        ] + [None] * 6
        assert _validate_zone_slots(slots) == slots


class TestWebSocketTemplates:
    """Tests for template CRUD commands."""

    async def test_list_templates(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_templates returns stored templates."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.templates = {"bedroom": {"grid_bytes": [1] * 400}}

        from custom_components.eppgrid.websocket_api import websocket_list_templates

        connection = MagicMock()
        msg = {"id": 6, "type": "eppgrid/list_templates"}

        websocket_list_templates(hass, connection, msg)

        result = connection.send_result.call_args[0]
        assert "bedroom" in result[1]["templates"]

    async def test_save_template(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """save_template stores a new template."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_save_template

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/save_template",
            "name": "office",
            "template": {"grid_bytes": [0] * 400},
        }

        await call_async_handler(hass, websocket_save_template, connection, msg)

        assert "office" in mock_dm._store.templates
        mock_dm._store.async_save.assert_awaited()
        connection.send_result.assert_called_once_with(7)

    async def test_delete_template(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_template removes a template."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.templates["old"] = {"data": True}

        from custom_components.eppgrid.websocket_api import websocket_delete_template

        connection = MagicMock()
        msg = {"id": 8, "type": "eppgrid/delete_template", "name": "old"}

        await call_async_handler(hass, websocket_delete_template, connection, msg)

        assert "old" not in mock_dm._store.templates
        mock_dm._store.async_save.assert_awaited()

    async def test_apply_template_command_removed(self) -> None:
        """eppgrid/apply_template is no longer a valid command."""
        from custom_components.eppgrid import websocket_api as ws_mod

        assert not hasattr(ws_mod, "websocket_apply_template")


class TestWebSocketSettings:
    """Tests for the unified eppgrid/set_settings command."""

    async def test_set_settings_stores_all_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores all values under device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": -1.5,
            "humidity_offset": 2.0,
            "illuminance_offset": -10.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"room_occupancy": True, "zone_presence": False},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["temperature_offset"] == -1.5
        assert settings["humidity_offset"] == 2.0
        assert settings["illuminance_offset"] == -10.0
        assert settings["motion_timeout"] == 5.0
        assert settings["target_auto_distance"] is True
        assert settings["target_max_distance"] == 4.0
        assert settings["static_auto_distance"] is False
        assert settings["static_min_distance"] == 0.3
        assert settings["static_max_distance"] == 8.0
        assert settings["static_trigger_threshold"] == 3
        assert settings["static_renew_threshold"] == 3
        assert settings["static_timeout"] == 30.0
        assert settings["static_on_delay"] == 0.0
        assert settings["led_mode"] == "Manual Control"
        assert settings["led_brightness"] == 1.0
        assert settings["led_presence_color"] == "#CC33FF"
        mock_dm._store.async_save.assert_awaited()
        mock_dm._push_config_to_device.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_stores_led_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores LED settings under device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Presence",
            "led_brightness": 0.8,
            "led_presence_color": "#00FF00",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["led_mode"] == "Presence"
        assert settings["led_brightness"] == 0.8
        assert settings["led_presence_color"] == "#00FF00"
        connection.send_result.assert_called_once_with(12)

    async def test_set_settings_applies_entity_changes(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings calls _apply_entity_states when entities dict is provided."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
            connection = MagicMock()
            msg = {
                "id": 11,
                "type": "eppgrid/set_settings",
                "mac": "AA:BB:CC:DD:EE:FF",
                "temperature_offset": -1.5,
                "humidity_offset": 2.0,
                "illuminance_offset": -10.0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 4.0,
                "static_auto_distance": False,
                "static_min_distance": 0.3,
                "static_max_distance": 8.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "led_mode": "Manual Control",
                "led_brightness": 1.0,
                "led_presence_color": "#CC33FF",
                "relay_trigger_mode": "disabled",
                "relay_contact_mode": "no",
                "entities": {"room_occupancy": True, "env_illuminance": False},
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

            from unittest.mock import call

            mock_apply.assert_has_calls(
                [
                    call(hass, "AA:BB:CC:DD:EE:FF", {"relay_output": False}),
                    call(hass, "AA:BB:CC:DD:EE:FF", {"room_occupancy": True, "env_illuminance": False}),
                ]
            )
            assert mock_apply.call_count == 2

    async def test_set_settings_zone_presence_false_still_calls_update_zone_entities(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """zone_presence=false still calls async_update_zone_entities to maintain zone_target_count awareness."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"zone_presence": False},
        }

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states"):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            # async_update_zone_entities IS called even when disabling — it handles
            # both zone_presence and zone_target_count, so the other category may
            # still need zone-aware filtering
            mock_dm.async_update_zone_entities.assert_awaited_once()

    async def test_set_settings_passes_valid_empty_shape_when_no_layout(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """When no room_layout is stored, the zone-entity update must receive
        a valid length-8 shape (Zone0Config at index 0), not [None] * 8 which
        would trip the fail-closed guard and disable zone 0 unexpectedly."""
        mock_dm = await setup_integration(hass, config_entry)
        # Device has no stored room_layout (fresh setup or post-calibration).
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"zone_presence": True},
        }

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states"):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_dm.async_update_zone_entities.assert_awaited_once()
            zone_slots = mock_dm.async_update_zone_entities.call_args[0][1]
            assert len(zone_slots) == 8
            assert zone_slots[0] == {"type": "normal"}
            assert zone_slots[1:] == [None] * 7

    async def test_set_settings_zone_presence_true_calls_update_zone_entities(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """zone_presence=true should call async_update_zone_entities with layout."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"zone_presence": True},
        }

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states"):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_dm.async_update_zone_entities.assert_awaited_once()

    async def test_set_settings_entities_not_stored(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """entities dict from the message is NOT stored in device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": -1.5,
            "humidity_offset": 2.0,
            "illuminance_offset": -10.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"room_occupancy": True, "zone_presence": False},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert "entities" not in settings

    async def test_set_settings_persists_log_levels(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores log_levels in device_config['log_levels'], separate from settings."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "log_levels": {"epp": "Debug", "system": "Info"},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        device_config = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]
        assert device_config["log_levels"] == {"epp": "Debug", "system": "Info"}
        # log_levels should NOT be in settings
        assert "log_levels" not in device_config["settings"]
        mock_dm._store.async_save.assert_awaited()
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_without_log_levels_does_not_overwrite(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings without log_levels does not clear existing log_levels."""
        mock_dm = await setup_integration(hass, config_entry)
        # Pre-populate log_levels
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {
            "log_levels": {"epp": "Debug"},
        }

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        device_config = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]
        # Existing log_levels should remain untouched
        assert device_config["log_levels"] == {"epp": "Debug"}

    async def test_set_settings_with_entities_sets_entity_update_guard(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings with entities sets the entity update guard to suppress reconnect push."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            "entities": {"room_occupancy": True},
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        assert "AA:BB:CC:DD:EE:FF" in mock_dm._entity_update_macs

    async def test_set_settings_without_entities_sets_guard_for_relay(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings without entities still sets the entity update guard for relay state change."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        assert "AA:BB:CC:DD:EE:FF" in mock_dm._entity_update_macs

    async def test_set_settings_stores_relay_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores relay_trigger_mode and relay_contact_mode under settings."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "motion",
            "relay_contact_mode": "nc",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["relay_trigger_mode"] == "motion"
        assert settings["relay_contact_mode"] == "nc"
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_enables_relay_entity_on_trigger_mode(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings enables relay_output entity when trigger_mode != 'disabled'."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
            connection = MagicMock()
            msg = {
                "id": 11,
                "type": "eppgrid/set_settings",
                "mac": "AA:BB:CC:DD:EE:FF",
                "temperature_offset": 0.0,
                "humidity_offset": 0.0,
                "illuminance_offset": 0.0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 6.0,
                "static_auto_distance": True,
                "static_min_distance": 0.3,
                "static_max_distance": 16.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "led_mode": "Manual Control",
                "led_brightness": 1.0,
                "led_presence_color": "#CC33FF",
                "relay_trigger_mode": "motion",
                "relay_contact_mode": "no",
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_apply.assert_called_once_with(hass, "AA:BB:CC:DD:EE:FF", {"relay_output": True})

    async def test_set_settings_disables_relay_entity_on_disabled(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings disables relay_output entity when trigger_mode == 'disabled'."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states") as mock_apply:
            connection = MagicMock()
            msg = {
                "id": 11,
                "type": "eppgrid/set_settings",
                "mac": "AA:BB:CC:DD:EE:FF",
                "temperature_offset": 0.0,
                "humidity_offset": 0.0,
                "illuminance_offset": 0.0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 6.0,
                "static_auto_distance": True,
                "static_min_distance": 0.3,
                "static_max_distance": 16.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "led_mode": "Manual Control",
                "led_brightness": 1.0,
                "led_presence_color": "#CC33FF",
                "relay_trigger_mode": "disabled",
                "relay_contact_mode": "no",
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_apply.assert_called_once_with(hass, "AA:BB:CC:DD:EE:FF", {"relay_output": False})

    async def test_set_pipeline(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_pipeline saves pipeline settings and pushes."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_pipeline

        connection = MagicMock()
        msg = {
            "id": 15,
            "type": "eppgrid/set_pipeline",
            "mac": "AA:BB:CC:DD:EE:FF",
            "entity_target_interval": 1000,
            "entity_zone_interval": 1000,
            "display_interval": 200,
            "zone_state_interval": 1000,
            "window_duration": 1000,
        }

        await call_async_handler(hass, websocket_set_pipeline, connection, msg)

        pipeline = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["pipeline"]
        assert pipeline["entity_target_interval"] == 1000
        assert pipeline["entity_zone_interval"] == 1000
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 1000
        assert pipeline["window_duration"] == 1000


class TestZonePresencePreservation:
    """Tests for zone_presence preservation across set_settings calls."""

    async def test_set_settings_preserves_zone_presence(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings must not overwrite stored settings.zone_presence."""
        mock_dm = await setup_integration(hass, config_entry)
        # Simulate calibration having set zone_presence=true
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["zone_presence"] is True

    async def test_set_settings_preserves_target_xy(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings must not overwrite stored settings.target_xy."""
        mock_dm = await setup_integration(hass, config_entry)
        # Simulate target_xy having been enabled by user
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"target_xy": True}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["target_xy"] is True

    async def test_set_settings_persists_target_xy_from_entities(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings with entities.target_xy persists the value to stored settings."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states"):
            connection = MagicMock()
            msg = {
                "id": 11,
                "type": "eppgrid/set_settings",
                "mac": "AA:BB:CC:DD:EE:FF",
                "temperature_offset": 0,
                "humidity_offset": 0,
                "illuminance_offset": 0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 6.0,
                "static_auto_distance": True,
                "static_min_distance": 0.3,
                "static_max_distance": 16.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "led_mode": "Manual Control",
                "led_brightness": 1.0,
                "led_presence_color": "#CC33FF",
                "relay_trigger_mode": "disabled",
                "relay_contact_mode": "no",
                "entities": {"target_xy": True},
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

        settings = mock_dm._store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings.get("target_xy") is True
        mock_dm._store.async_save.assert_awaited()

    async def test_set_settings_persists_new_entity_keys(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """New entity keys (target_active etc.) are persisted in stored settings."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._apply_entity_states"):
            connection = MagicMock()
            msg = {
                "id": 11,
                "type": "eppgrid/set_settings",
                "mac": mac,
                "temperature_offset": 0,
                "humidity_offset": 0,
                "illuminance_offset": 0,
                "motion_timeout": 5.0,
                "target_auto_distance": True,
                "target_max_distance": 6.0,
                "static_auto_distance": True,
                "static_min_distance": 0.3,
                "static_max_distance": 16.0,
                "static_trigger_threshold": 3,
                "static_renew_threshold": 3,
                "static_timeout": 30.0,
                "static_on_delay": 0.0,
                "led_mode": "Manual Control",
                "led_brightness": 1.0,
                "led_presence_color": "#CC33FF",
                "relay_trigger_mode": "disabled",
                "relay_contact_mode": "no",
                "entities": {"target_active": True, "zone_target_count": True},
            }

            await call_async_handler(hass, websocket_set_settings, connection, msg)

        stored = mock_dm._store.devices[mac]["settings"]
        assert stored["target_active"] is True
        assert stored["zone_target_count"] is True
        mock_dm._store.async_save.assert_awaited()

    async def test_set_settings_preserves_new_entity_keys(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """New entity keys survive a set_settings call that doesn't include entities."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {
            "settings": {
                "target_active": True,
                "zone_target_count": True,
                "target_update_rate_ms": 500,
            }
        }

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_settings",
            "mac": mac,
            "temperature_offset": 0,
            "humidity_offset": 0,
            "illuminance_offset": 0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 6.0,
            "static_auto_distance": True,
            "static_min_distance": 0.3,
            "static_max_distance": 16.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": 0.0,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
            # no "entities" key
        }

        await call_async_handler(hass, websocket_set_settings, connection, msg)

        stored = mock_dm._store.devices[mac]["settings"]
        assert stored["target_active"] is True
        assert stored["zone_target_count"] is True
        assert stored["target_update_rate_ms"] == 500


class TestEntityMapping:
    """Tests for entity object_id mapping with real unique_id patterns."""

    def test_object_id_extraction(self) -> None:
        """_object_id_from_unique_id extracts the part after the last dash."""
        from custom_components.eppgrid.websocket_api import _object_id_from_unique_id

        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-binary_sensor-occupancy") == "occupancy"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-binary_sensor-motion_presence") == "motion_presence"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-binary_sensor-zone_0_presence") == "zone_0_presence"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-sensor-temperature") == "temperature"
        assert _object_id_from_unique_id("E0:8C:FE:D3:FD:C8-text_sensor-target_0_position") == "target_0_position"

    def test_entity_key_mapping_room_entities(self) -> None:
        """Room-level entities map to their correct keys."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("occupancy") == "room_occupancy"
        assert _entity_key_for_object_id("static_presence") == "room_static_presence"
        assert _entity_key_for_object_id("motion_presence") == "room_motion_presence"
        assert _entity_key_for_object_id("target_presence") == "room_target_presence"

    def test_entity_key_mapping_env_sensors(self) -> None:
        """Environmental sensors map to their correct keys."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("temperature") == "env_temperature"
        assert _entity_key_for_object_id("humidity") == "env_humidity"
        assert _entity_key_for_object_id("illuminance") == "env_illuminance"
        assert _entity_key_for_object_id("co2") == "env_co2"

    def test_entity_key_mapping_zone_entities(self) -> None:
        """Zone presence entities map to zone_presence category."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("zone_0_presence") == "zone_presence"
        assert _entity_key_for_object_id("zone_7_presence") == "zone_presence"
        # zone_tracking is a separate entity, not a zone presence
        assert _entity_key_for_object_id("zone_tracking") is None

    def test_entity_key_mapping_target_entities(self) -> None:
        """Structured target entities map correctly; transport sensors are unmanaged."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        # Structured entities (user-facing)
        assert _entity_key_for_object_id("target_1_x") == "target_xy"
        assert _entity_key_for_object_id("target_1_y") == "target_xy"
        assert _entity_key_for_object_id("target_1_active") == "target_active"
        assert _entity_key_for_object_id("target_1_signal") == "target_signal"
        assert _entity_key_for_object_id("target_1_zone") == "target_zone"
        # Transport sensors (not managed by entity toggles)
        assert _entity_key_for_object_id("target_0_position") is None
        assert _entity_key_for_object_id("target_1_position") is None

    def test_entity_key_mapping_via_unique_id(self) -> None:
        """Real unique_ids (hyphen format) map correctly via _object_id_from_unique_id."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id
        from custom_components.eppgrid.websocket_api import _object_id_from_unique_id

        cases = {
            "AA:BB:CC:DD:EE:FF-sensor-occupancy": "room_occupancy",
            "AA:BB:CC:DD:EE:FF-sensor-static_presence": "room_static_presence",
            "AA:BB:CC:DD:EE:FF-sensor-motion_presence": "room_motion_presence",
            "AA:BB:CC:DD:EE:FF-sensor-temperature": "env_temperature",
            "AA:BB:CC:DD:EE:FF-sensor-co2": "env_co2",
            "AA:BB:CC:DD:EE:FF-button-calibrate_co2": "env_co2_calibrate",
            "AA:BB:CC:DD:EE:FF-switch-system_alarm_relay": "relay_output",
            "AA:BB:CC:DD:EE:FF-sensor-zone_0_presence": "zone_presence",
            "AA:BB:CC:DD:EE:FF-sensor-zone_7_presence": "zone_presence",
            "AA:BB:CC:DD:EE:FF-sensor-target_1_x": "target_xy",
            "AA:BB:CC:DD:EE:FF-sensor-target_0_position": None,
            "AA:BB:CC:DD:EE:FF-sensor-config_protocol": None,
        }
        for unique_id, expected in cases.items():
            object_id = _object_id_from_unique_id(unique_id)
            result = _entity_key_for_object_id(object_id)
            assert result == expected, f"{unique_id} -> {object_id} -> {result}, expected {expected}"

    def test_entity_key_mapping_relay(self) -> None:
        """system_alarm_relay maps to relay_output."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("system_alarm_relay") == "relay_output"

    def test_entity_key_mapping_calibrate_co2(self) -> None:
        """calibrate_co2 maps to env_co2_calibrate, not env_co2."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("calibrate_co2") == "env_co2_calibrate"
        assert _entity_key_for_object_id("co2") == "env_co2"

    def test_entity_key_mapping_unknown(self) -> None:
        """Unknown object_ids return None."""
        from custom_components.eppgrid.websocket_api import _entity_key_for_object_id

        assert _entity_key_for_object_id("config_protocol") is None
        assert _entity_key_for_object_id("zone_engine_version") is None
        assert _entity_key_for_object_id("led") is None


class TestApplyEntityStates:
    """Tests for _apply_entity_states."""

    async def test_apply_entity_states_skips_user_disabled(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """_apply_entity_states must not overwrite USER-disabled entries."""
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _apply_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        # Create mock entity entries: one USER-disabled, one INTEGRATION-disabled
        user_disabled_entry = MagicMock()
        user_disabled_entry.unique_id = "AA:BB:CC:DD:EE:FF-sensor-target_1_x"
        user_disabled_entry.entity_id = "sensor.target_1_x"
        user_disabled_entry.disabled_by = RegistryEntryDisabler.USER

        integration_disabled_entry = MagicMock()
        integration_disabled_entry.unique_id = "AA:BB:CC:DD:EE:FF-sensor-target_2_x"
        integration_disabled_entry.entity_id = "sensor.target_2_x"
        integration_disabled_entry.disabled_by = RegistryEntryDisabler.INTEGRATION

        with (
            patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api.er.async_entries_for_device") as mock_entries,
        ):
            mock_registry = mock_er.return_value
            mock_entries.return_value = [
                user_disabled_entry,
                integration_disabled_entry,
            ]

            # Enable target_xy — should skip USER-disabled but enable INTEGRATION-disabled
            _apply_entity_states(hass, "AA:BB:CC:DD:EE:FF", {"target_xy": True})

            # USER-disabled entry should NOT be touched
            calls = mock_registry.async_update_entity.call_args_list
            entity_ids_updated = [c.args[0] for c in calls]
            assert "sensor.target_1_x" not in entity_ids_updated
            # INTEGRATION-disabled entry should be enabled
            mock_registry.async_update_entity.assert_any_call("sensor.target_2_x", disabled_by=None)

    async def test_apply_entity_states_expands_followers(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Toggling env_co2 also toggles env_co2_calibrate follower."""
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _apply_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        co2_entry = MagicMock()
        co2_entry.unique_id = "AA:BB:CC:DD:EE:FF-sensor-co2"
        co2_entry.entity_id = "sensor.co2"
        co2_entry.disabled_by = RegistryEntryDisabler.INTEGRATION

        calibrate_entry = MagicMock()
        calibrate_entry.unique_id = "AA:BB:CC:DD:EE:FF-button-calibrate_co2"
        calibrate_entry.entity_id = "button.calibrate_co2"
        calibrate_entry.disabled_by = RegistryEntryDisabler.INTEGRATION

        with (
            patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api.er.async_entries_for_device") as mock_entries,
        ):
            mock_registry = mock_er.return_value
            mock_entries.return_value = [co2_entry, calibrate_entry]

            # Enable env_co2 — should also enable the calibrate button
            _apply_entity_states(hass, "AA:BB:CC:DD:EE:FF", {"env_co2": True})

            mock_registry.async_update_entity.assert_any_call("sensor.co2", disabled_by=None)
            mock_registry.async_update_entity.assert_any_call("button.calibrate_co2", disabled_by=None)

    async def test_apply_entity_states_disables_followers(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Disabling env_co2 also disables env_co2_calibrate follower."""
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _apply_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        co2_entry = MagicMock()
        co2_entry.unique_id = "AA:BB:CC:DD:EE:FF-sensor-co2"
        co2_entry.entity_id = "sensor.co2"
        co2_entry.disabled_by = None

        calibrate_entry = MagicMock()
        calibrate_entry.unique_id = "AA:BB:CC:DD:EE:FF-button-calibrate_co2"
        calibrate_entry.entity_id = "button.calibrate_co2"
        calibrate_entry.disabled_by = None

        with (
            patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api.er.async_entries_for_device") as mock_entries,
        ):
            mock_registry = mock_er.return_value
            mock_entries.return_value = [co2_entry, calibrate_entry]

            _apply_entity_states(hass, "AA:BB:CC:DD:EE:FF", {"env_co2": False})

            mock_registry.async_update_entity.assert_any_call(
                "sensor.co2", disabled_by=RegistryEntryDisabler.INTEGRATION
            )
            mock_registry.async_update_entity.assert_any_call(
                "button.calibrate_co2", disabled_by=RegistryEntryDisabler.INTEGRATION
            )

    async def test_get_entity_states_excludes_followers(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """_get_entity_states should not include follower keys like env_co2_calibrate."""
        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _get_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        co2_entry = MagicMock()
        co2_entry.unique_id = "AA:BB:CC:DD:EE:FF-sensor-co2"
        co2_entry.disabled_by = None  # enabled

        calibrate_entry = MagicMock()
        calibrate_entry.unique_id = "AA:BB:CC:DD:EE:FF-button-calibrate_co2"
        calibrate_entry.disabled_by = None  # enabled

        with (
            patch("custom_components.eppgrid.websocket_api.er.async_get"),
            patch("custom_components.eppgrid.websocket_api.er.async_entries_for_device") as mock_entries,
        ):
            mock_entries.return_value = [co2_entry, calibrate_entry]

            result = _get_entity_states(hass, "AA:BB:CC:DD:EE:FF")

            assert "env_co2" in result
            assert "env_co2_calibrate" not in result


class TestWebSocketEntityEnabled:
    """Tests for eppgrid/set_entity_enabled."""

    async def test_set_entity_enabled(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_entity_enabled enables entities in the registry."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er:
            mock_registry = mock_er.return_value

            connection = MagicMock()
            msg = {
                "id": 16,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_presence",
                "enabled": True,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_called_once_with(
                "binary_sensor.epp_zone_1_presence", disabled_by=None
            )
            connection.send_result.assert_called_once_with(16)

    async def test_set_entity_disabled(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_entity_enabled disables entities with INTEGRATION disabler."""
        await setup_integration(hass, config_entry)

        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api.er.async_get") as mock_er:
            mock_registry = mock_er.return_value

            connection = MagicMock()
            msg = {
                "id": 17,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_presence",
                "enabled": False,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_called_once_with(
                "binary_sensor.epp_zone_1_presence",
                disabled_by=RegistryEntryDisabler.INTEGRATION,
            )


class TestWebSocketSubscriptions:
    """Tests for subscription commands (subscribe_device, subscribe_raw_targets, subscribe_grid_targets)."""

    async def test_subscribe_device_opens_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device opens a session and registers unsubscribe."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_conn = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=mock_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 20, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        mock_dm.async_open_session.assert_awaited_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(20)
        assert 20 in connection.subscriptions

    async def test_subscribe_device_connection_error(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device returns connection_failed when device rejects connection."""
        from aioesphomeapi.core import SocketClosedAPIError

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(side_effect=SocketClosedAPIError("EOF received"))

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        msg = {"id": 25, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        connection.send_error.assert_called_once_with(
            25,
            "connection_failed",
            "Failed to connect to device",
            translation_domain=DOMAIN,
            translation_key="connection_failed",
        )

    async def test_subscribe_device_not_found(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device returns error when device not available."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        msg = {"id": 21, "type": "eppgrid/subscribe_device", "mac": "00:00:00:00:00:00"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        connection.send_error.assert_called_once_with(
            21,
            "not_found",
            "Device not available",
            translation_domain=DOMAIN,
            translation_key="device_not_available",
        )

    async def test_subscribe_raw_targets_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_raw_targets returns error without active session."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        msg = {"id": 22, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        connection.send_error.assert_called_once_with(
            22,
            "no_session",
            "No active session — call subscribe_device first",
            translation_domain=DOMAIN,
            translation_key="no_active_session",
        )

    async def test_subscribe_raw_targets_with_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_raw_targets registers state callback and unsubscribe."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 23, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        connection.send_result.assert_called_once_with(23)
        mock_device_conn.subscribe_states.assert_called_once()
        assert 23 in connection.subscriptions

    async def test_subscribe_grid_targets_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_grid_targets returns error without active session."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        msg = {"id": 24, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_error.assert_called_once()

    async def test_subscribe_grid_targets_with_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """subscribe_grid_targets registers state callback and unsubscribe."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 25, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_result.assert_called_once_with(25)
        mock_device_conn.subscribe_states.assert_called_once()
        assert 25 in connection.subscriptions


class TestSubscribeDeviceList:
    """Tests for eppgrid/subscribe_device_list."""

    async def test_subscribe_sends_initial_list(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device_list sends the current device list immediately."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_devices.return_value = [{"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}]
        mock_dm.on_device_list_changed = MagicMock(return_value=lambda: None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device_list

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_device_list"}

        websocket_subscribe_device_list(hass, connection, msg)

        connection.send_result.assert_called_once_with(30)
        connection.send_message.assert_called_once()
        event_msg = connection.send_message.call_args[0][0]
        assert event_msg["id"] == 30
        assert event_msg["event"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert 30 in connection.subscriptions

    async def test_subscribe_pushes_updates(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Device list change callback pushes updated list to subscriber."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_devices.return_value = []

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device_list

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_device_list"}

        websocket_subscribe_device_list(hass, connection, msg)

        # Simulate device list change
        mock_dm.list_devices.return_value = [{"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}]
        assert captured_cb is not None
        captured_cb()

        assert connection.send_message.call_count == 2
        last_msg = connection.send_message.call_args[0][0]
        assert last_msg["event"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"

    async def test_unsubscribe_removes_callback(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribing cleans up the device list callback."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_devices.return_value = []

        unsub_inner = MagicMock()
        mock_dm.on_device_list_changed = MagicMock(return_value=unsub_inner)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device_list

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_device_list"}

        websocket_subscribe_device_list(hass, connection, msg)

        # Call the unsubscribe handler
        connection.subscriptions[32]()

        unsub_inner.assert_called_once()


class TestUpdateFirmware:
    """Tests for eppgrid/update_firmware."""

    async def test_update_firmware_calls_set_update_manifest(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """update_firmware calls set_update_manifest via temp connection."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(host="192.168.1.50")}
        mock_dm._build_flags = {"AA:BB:CC:DD:EE:FF": {"bluetooth_enabled": True, "co2_enabled": True}}

        mock_svc = MagicMock()
        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {"set_update_manifest": mock_svc}
        mock_conn._client = MagicMock()
        mock_conn._client.execute_service = AsyncMock()

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 20, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_result.assert_called_once()
        mock_conn._client.execute_service.assert_awaited_once()
        call_args = mock_conn._client.execute_service.call_args[0]
        assert call_args[0] is mock_svc
        assert "everything-presence-pro-wifi-ble-co2-manifest.json" in call_args[1]["url"]
        assert "/releases/download/v" in call_args[1]["url"]
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_update_firmware_ethernet_variant(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware derives ethernet variant from build flags."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(host="192.168.1.50")}
        mock_dm._build_flags = {
            "AA:BB:CC:DD:EE:FF": {"ethernet_enabled": True, "bluetooth_enabled": True, "co2_enabled": True}
        }

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {"set_update_manifest": MagicMock()}
        mock_conn._client = MagicMock()
        mock_conn._client.execute_service = AsyncMock()

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 20, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        call_args = mock_conn._client.execute_service.call_args[0]
        assert "everything-presence-pro-ethernet-ble-co2-manifest.json" in call_args[1]["url"]
        assert "/releases/download/v" in call_args[1]["url"]

    async def test_update_firmware_device_not_found(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware returns error when device not found."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {}

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 21, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(
            21,
            "not_found",
            "Device not found",
            translation_domain=DOMAIN,
            translation_key="device_not_found",
        )

    async def test_update_firmware_build_flags_unknown(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """update_firmware returns error when build flags not yet available."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(host="192.168.1.50")}
        mock_dm._build_flags = {"AA:BB:CC:DD:EE:FF": {}}

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 22, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(
            22,
            "build_flags_unknown",
            "Device build flags not yet available",
            translation_domain=DOMAIN,
            translation_key="build_flags_unavailable",
        )

    async def test_update_firmware_device_host_unknown(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """update_firmware returns error when device host is unknown."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(host=None)}
        mock_dm._build_flags = {"AA:BB:CC:DD:EE:FF": {"ethernet_enabled": False}}

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 23, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(
            23,
            "not_available",
            "Device host unknown",
            translation_domain=DOMAIN,
            translation_key="device_host_unknown",
        )

    async def test_update_firmware_not_ready(self, hass: HomeAssistant) -> None:
        """update_firmware returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 23, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once_with(
            23,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )


class TestNotReadyGuards:
    """Handlers not covered by per-class tests return not_ready when integration not loaded."""

    @pytest.mark.parametrize(
        "handler_name,extra_fields,is_async",
        [
            ("websocket_set_room_layout", {"mac": "AA:BB", "grid_bytes": [], "zone_slots": []}, True),
            ("websocket_list_templates", {}, False),
            ("websocket_save_template", {"name": "t", "template": {}}, True),
            ("websocket_delete_template", {"name": "t"}, True),
            ("websocket_subscribe_device", {"mac": "AA:BB"}, True),
            ("websocket_subscribe_raw_targets", {"mac": "AA:BB"}, True),
            ("websocket_subscribe_grid_targets", {"mac": "AA:BB"}, True),
            ("websocket_set_entity_enabled", {"mac": "AA:BB", "entity_id": "e", "enabled": True}, False),
            (
                "websocket_set_settings",
                {
                    "mac": "AA:BB",
                    "temperature_offset": 0,
                    "humidity_offset": 0,
                    "illuminance_offset": 0,
                    "motion_timeout": 5.0,
                    "target_auto_distance": True,
                    "target_max_distance": 4.0,
                    "static_auto_distance": False,
                    "static_min_distance": 0.3,
                    "static_max_distance": 8.0,
                    "static_trigger_threshold": 3,
                    "static_renew_threshold": 3,
                    "static_timeout": 30.0,
                    "static_on_delay": 0.0,
                    "led_mode": "Manual Control",
                    "led_brightness": 1.0,
                    "led_presence_color": "#CC33FF",
                    "relay_trigger_mode": "disabled",
                    "relay_contact_mode": "no",
                },
                True,
            ),
            (
                "websocket_set_pipeline",
                {
                    "mac": "AA:BB",
                    "display_interval_ms": 200,
                    "zone_publish_interval_ms": 1000,
                    "window_duration_ms": 1000,
                },
                True,
            ),
            (
                "websocket_set_distance_override",
                {
                    "mac": "AA:BB",
                    "target_max_distance": 6.0,
                    "static_min_distance": 0.3,
                    "static_max_distance": 16.0,
                },
                True,
            ),
        ],
    )
    async def test_not_ready(self, hass: HomeAssistant, handler_name: str, extra_fields: dict, is_async: bool) -> None:
        """Handler returns not_ready when integration not loaded."""
        import custom_components.eppgrid.websocket_api as ws

        handler = getattr(ws, handler_name)
        connection = MagicMock()
        msg = {"id": 1, "type": f"eppgrid/{handler_name.replace('websocket_', '')}"}
        msg.update(extra_fields)

        if is_async:
            await call_async_handler(hass, handler, connection, msg)
        else:
            handler(hass, connection, msg)

        connection.send_error.assert_called_once_with(
            1,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )


class TestSubscriptionCallbacks:
    """Tests for _on_state callbacks in subscribe_raw_targets and subscribe_grid_targets."""

    async def test_raw_targets_on_state_parses_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """_on_state in subscribe_raw_targets parses TextSensorState with coordinates."""
        mock_dm = await setup_integration(hass, config_entry)

        # Create mock entities with key and name attributes
        raw0 = MagicMock()
        raw0.key = 100
        raw0.name = "Raw Target 1"
        raw1 = MagicMock()
        raw1.key = 101
        raw1.name = "Raw Target 2"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [raw0, raw1]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Get the registered _on_state callback
        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        state = TextSensorState(key=100, state="1500.5,2300.2", missing_state=False)
        on_state(state)

        # Should have sent a message with parsed targets
        connection.send_message.assert_called_once()
        event_data = connection.send_message.call_args[0][0]
        # event_message returns a dict
        assert "targets" in event_data.get("event", event_data)

    async def test_raw_targets_on_state_empty_clears(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Empty state clears raw target to null coordinates."""
        mock_dm = await setup_integration(hass, config_entry)

        raw0 = MagicMock()
        raw0.key = 100
        raw0.name = "Raw Target 1"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [raw0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        state = TextSensorState(key=100, state="", missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()

    async def test_raw_targets_on_state_ignores_non_text(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Non-TextSensorState is ignored."""
        mock_dm = await setup_integration(hass, config_entry)

        raw0 = MagicMock()
        raw0.key = 100
        raw0.name = "Raw Target 1"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [raw0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=100, state=True, missing_state=False)
        on_state(state)

        connection.send_message.assert_not_called()

    async def test_raw_targets_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribe callback removes state subscription."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Call unsubscribe
        connection.subscriptions[33]()
        mock_device_conn.unsubscribe_states.assert_called_once()

    async def test_grid_targets_on_state_target_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """_on_state in subscribe_grid_targets parses target position TextSensorState."""
        mock_dm = await setup_integration(hass, config_entry)

        target0 = MagicMock()
        target0.key = 200
        target0.name = "Target 1 Position"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [target0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 40, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        # Position with status field
        state = TextSensorState(key=200, state="1500.0,2000.0,active", missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()
        event_msg = connection.send_message.call_args[0][0]
        event = event_msg.get("event", event_msg)
        assert "targets" in event
        assert "sensors" in event
        assert "zones" in event

    async def test_grid_targets_on_state_empty_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Empty position resets target to inactive."""
        mock_dm = await setup_integration(hass, config_entry)

        target0 = MagicMock()
        target0.key = 200
        target0.name = "Target 1 Position"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [target0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 41, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        state = TextSensorState(key=200, state="", missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()

    async def test_grid_targets_on_state_zone_state_json(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone state JSON is parsed for occupancy and target signal/status."""
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [zone_state_entity]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 42, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import TextSensorState

        zone_json = json.dumps(
            {
                "targets": [
                    {"signal": 80, "status": "active"},
                    {"signal": 0, "status": "inactive"},
                ],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "frame_count": 42,
                "debug_log": "test debug",
            }
        )
        state = TextSensorState(key=300, state=zone_json, missing_state=False)
        on_state(state)

        # Zone state now triggers send_message so sensor state changes
        # appear in the detection log without delay
        connection.send_message.assert_called_once()
        event = connection.send_message.call_args[0][0]
        assert event["event"]["zones"]["debug_log"] == "test debug"
        assert event["event"]["sensors"]["target_presence"] is True

    async def test_grid_targets_on_state_binary_sensor(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """BinarySensorState updates sensor data."""
        mock_dm = await setup_integration(hass, config_entry)

        occupancy = MagicMock()
        occupancy.key = 400
        occupancy.name = "Occupancy"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [occupancy]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 43, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=400, state=True, missing_state=False)
        on_state(state)

        # Binary sensor updates don't trigger send_message (only target positions do)
        connection.send_message.assert_not_called()

    async def test_grid_targets_on_state_numeric_sensor(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """SensorState updates numeric sensor data."""
        mock_dm = await setup_integration(hass, config_entry)

        temp = MagicMock()
        temp.key = 500
        temp.name = "Temperature"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [temp]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import SensorState

        state = SensorState(key=500, state=22.5, missing_state=False)
        on_state(state)

        # NaN handling — should not trigger send_message either
        nan_state = SensorState(key=500, state=float("nan"), missing_state=False)
        on_state(nan_state)

        # Numeric sensor updates don't trigger send_message (only target positions do)
        connection.send_message.assert_not_called()

    async def test_grid_targets_on_state_co2_sensor(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """CO2 SensorState updates sensors.co2 in accumulated state."""
        mock_dm = await setup_integration(hass, config_entry)

        co2_entity = MagicMock()
        co2_entity.key = 600
        co2_entity.name = "CO2"

        # Need a target entity so we can trigger send_message and inspect sensors
        target0 = MagicMock()
        target0.key = 100
        target0.name = "Target 1 Position"

        mock_device_conn = MagicMock()
        mock_device_conn._entities = [co2_entity, target0]
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 50, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.call_args[0][0]

        from aioesphomeapi import SensorState
        from aioesphomeapi import TextSensorState

        # Send CO2 value
        state = SensorState(key=600, state=412.0, missing_state=False)
        on_state(state)

        # Trigger a target position update to get a send_message with accumulated state
        target_state = TextSensorState(key=100, state="1.0,2.0,active", missing_state=False)
        on_state(target_state)

        event = connection.send_message.call_args[0][0]
        assert event["event"]["sensors"]["co2"] == 412.0

    async def test_grid_targets_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribe callback removes state subscription."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn._entities = []
        mock_device_conn.subscribe_states = MagicMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 45, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.subscriptions[45]()
        mock_device_conn.unsubscribe_states.assert_called_once()

    async def test_subscribe_device_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device unsub callback closes session."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_conn = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=mock_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 46, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        # Call the unsub callback
        connection.subscriptions[46]()
        await hass.async_block_till_done()

        mock_dm.async_close_session.assert_called()


class TestUpdateFirmwareError:
    """Test update_firmware exception path."""

    async def test_update_firmware_service_error(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """update_firmware returns error when execute_service raises."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": MagicMock(host="192.168.1.50")}
        mock_dm._build_flags = {"AA:BB:CC:DD:EE:FF": {"ethernet_enabled": False}}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_disconnect = AsyncMock()
        mock_conn._services = {"set_update_manifest": MagicMock()}
        mock_conn._client = MagicMock()
        mock_conn._client.execute_service = AsyncMock(side_effect=Exception("OTA failed"))

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 50, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "update_failed"
        assert "OTA failed" in args[2]
        mock_conn.async_disconnect.assert_awaited_once()


class TestWebSocketDistanceOverride:
    """Tests for eppgrid/set_distance_override."""

    async def test_set_distance_override_pushes_without_saving(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_distance_override pushes merged override to device without persisting."""
        mock_dm = await setup_integration(hass, config_entry)

        # Set up stored settings with threshold/timeout values
        mock_dm._store.devices = {
            "AA:BB:CC:DD:EE:FF": {
                "settings": {
                    "static_trigger_threshold": 5,
                    "static_renew_threshold": 4,
                    "static_timeout": 60.0,
                    "static_on_delay": 1.0,
                }
            }
        }

        # Set up mock session with async_push_distance_override
        mock_session = MagicMock()
        mock_session.async_push_distance_override = AsyncMock()
        mock_dm.get_session.return_value = mock_session

        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        connection = MagicMock()
        msg = {
            "id": 99,
            "type": "eppgrid/set_distance_override",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 5.0,
            "static_min_distance": 0.5,
            "static_max_distance": 10.0,
        }

        await call_async_handler(hass, websocket_set_distance_override, connection, msg)

        # Assert override pushed with merged values
        mock_session.async_push_distance_override.assert_awaited_once_with(
            {
                "target_max_distance": 5.0,
                "static_min_distance": 0.5,
                "static_max_distance": 10.0,
                "static_trigger_threshold": 5,
                "static_renew_threshold": 4,
                "static_timeout": 60.0,
                "static_on_delay": 1.0,
            }
        )

        # Assert NOT persisted
        mock_dm._store.async_save.assert_not_awaited()

        connection.send_result.assert_called_once_with(99)

    async def test_set_distance_override_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_distance_override is a no-op when no session exists."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.get_session.return_value = None

        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        connection = MagicMock()
        msg = {
            "id": 100,
            "type": "eppgrid/set_distance_override",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 5.0,
            "static_min_distance": 0.5,
            "static_max_distance": 10.0,
        }

        await call_async_handler(hass, websocket_set_distance_override, connection, msg)

        connection.send_result.assert_called_once_with(100)
        mock_dm._store.async_save.assert_not_awaited()


class TestProtocolVersionGuard:
    """Config commands are blocked when protocol versions don't match."""

    async def test_set_setup_blocked_when_firmware_behind(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup returns error when firmware protocol is behind."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_firmware_version.return_value = "0.1.0"  # behind

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 10,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_behind"

    async def test_set_setup_blocked_when_firmware_ahead(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_setup returns error when firmware protocol is ahead."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_firmware_version.return_value = "99.0.0"  # ahead

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 11,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_ahead"

    async def test_set_setup_allowed_when_compatible(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup proceeds normally when firmware versions match."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 12,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        # Should not send error — proceeds to save config
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once()

    @pytest.mark.parametrize(
        "handler_name,extra_fields",
        [
            (
                "websocket_set_room_layout",
                {
                    "grid_bytes": [0] * 400,
                    "zone_slots": [
                        {"type": "normal", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                    ],
                },
            ),
            (
                "websocket_set_entity_enabled",
                {"entity_id": "binary_sensor.test", "enabled": True},
            ),
            (
                "websocket_set_settings",
                {
                    "temperature_offset": 0.0,
                    "humidity_offset": 0.0,
                    "illuminance_offset": 0.0,
                    "motion_timeout": 5.0,
                    "target_auto_distance": True,
                    "target_max_distance": 4.0,
                    "static_auto_distance": False,
                    "static_min_distance": 0.3,
                    "static_max_distance": 8.0,
                    "static_trigger_threshold": 3,
                    "static_renew_threshold": 3,
                    "static_timeout": 30.0,
                    "static_on_delay": 0.0,
                    "led_mode": "Manual Control",
                    "led_brightness": 1.0,
                    "led_presence_color": "#CC33FF",
                    "relay_trigger_mode": "disabled",
                    "relay_contact_mode": "no",
                },
            ),
            (
                "websocket_set_pipeline",
                {
                    "entity_target_interval": 1000,
                    "entity_zone_interval": 1000,
                    "display_interval": 200,
                    "zone_state_interval": 1000,
                    "window_duration": 1000,
                },
            ),
        ],
    )
    async def test_protocol_guard_blocks_all_config_commands(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
        handler_name: str,
        extra_fields: dict,
    ) -> None:
        """All config commands are blocked when firmware protocol is behind."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_firmware_version.return_value = "0.1.0"  # behind

        import custom_components.eppgrid.websocket_api as ws

        handler = getattr(ws, handler_name)
        connection = MagicMock()
        msg = {"id": 100, "type": f"eppgrid/{handler_name.replace('websocket_', '')}", "mac": "AA:BB:CC:DD:EE:FF"}
        msg.update(extra_fields)

        if hasattr(handler, "__wrapped__"):
            # async_response handlers
            await call_async_handler(hass, handler, connection, msg)
        else:
            # sync handlers
            handler(hass, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_behind"


class TestWebSocketDismissTarget:
    """Tests for eppgrid/dismiss_target."""

    async def test_dismiss_target_sends_to_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """dismiss_target sends command via active session."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }

        mock_session = MagicMock()
        mock_session.async_dismiss_target = AsyncMock()
        mock_dm.get_session.return_value = mock_session

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        connection = MagicMock()
        msg = {
            "id": 200,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 1,
            "cell_index": 42,
        }

        await call_async_handler(hass, websocket_dismiss_target, connection, msg)

        mock_session.async_dismiss_target.assert_awaited_once_with(1, 42)
        connection.send_result.assert_called_once_with(200)

    async def test_dismiss_target_no_device(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """dismiss_target returns error when device not found."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {}

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        connection = MagicMock()
        msg = {
            "id": 201,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 0,
            "cell_index": 10,
        }

        await call_async_handler(hass, websocket_dismiss_target, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "device_unavailable"

    async def test_dismiss_target_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """dismiss_target returns error when no active session."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.get_session.return_value = None

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        connection = MagicMock()
        msg = {
            "id": 202,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 0,
            "cell_index": 10,
        }

        await call_async_handler(hass, websocket_dismiss_target, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "no_session"

    async def test_dismiss_target_service_error(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """dismiss_target returns error when firmware service call fails."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }

        mock_session = MagicMock()
        mock_session.async_dismiss_target = AsyncMock(side_effect=RuntimeError("Service not available"))
        mock_dm.get_session.return_value = mock_session

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        connection = MagicMock()
        msg = {
            "id": 203,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 2,
            "cell_index": 99,
        }

        await call_async_handler(hass, websocket_dismiss_target, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "dismiss_failed"


def test_send_not_loaded_uses_translation_key():
    """Helper must set translation_domain + translation_key for frontend i18n."""
    from custom_components.eppgrid import websocket_api as ws_module
    from custom_components.eppgrid.const import DOMAIN

    connection = MagicMock()
    ws_module._send_not_loaded(connection, 42)

    connection.send_error.assert_called_once_with(
        42,
        "not_ready",
        "Integration not loaded",
        translation_domain=DOMAIN,
        translation_key="integration_not_loaded",
    )


def test_no_firmware_variant_uses_translation_placeholders():
    """Dynamic network-type error must pass network as a translation placeholder."""
    from custom_components.eppgrid import websocket_api as ws_module

    connection = MagicMock()
    ws_module._send_no_firmware_variant(connection, 7, "wifi-ble-co2")

    connection.send_error.assert_called_once_with(
        7,
        "unknown_variant",
        "No firmware variant for network type: wifi-ble-co2",
        translation_domain=DOMAIN,
        translation_key="no_firmware_variant",
        translation_placeholders={"network": "wifi-ble-co2"},
    )


def test_send_exception_preserves_translation_metadata():
    """If the exception carries HA translation metadata, it must reach send_error."""
    from homeassistant.exceptions import HomeAssistantError

    from custom_components.eppgrid import websocket_api as ws_module
    from custom_components.eppgrid.const import DOMAIN

    err = HomeAssistantError(
        "Service x not available",
        translation_domain=DOMAIN,
        translation_key="service_not_available",
        translation_placeholders={"service": "x"},
    )
    connection = MagicMock()
    ws_module._send_exception(connection, 5, "dismiss_failed", err)
    connection.send_error.assert_called_once_with(
        5,
        "dismiss_failed",
        "Service x not available",
        translation_domain=DOMAIN,
        translation_key="service_not_available",
        translation_placeholders={"service": "x"},
    )


def test_send_exception_falls_back_to_str_for_plain_exception():
    """Plain exceptions without translation metadata fall back to the raw message."""
    from custom_components.eppgrid import websocket_api as ws_module

    err = RuntimeError("boom")
    connection = MagicMock()
    ws_module._send_exception(connection, 7, "delete_failed", err)
    connection.send_error.assert_called_once_with(7, "delete_failed", "boom")
