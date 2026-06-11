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


def test_websocket_api_module_has_no_registered_set() -> None:
    """No module-level _REGISTERED set should leak across submodules."""
    assert not hasattr(ws_module, "_REGISTERED")


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
        mock_dm.store = MagicMock()
        mock_dm.store.devices = {}
        mock_dm.store.configurations = {}
        mock_dm.store.async_save = AsyncMock()
        # Some tests (test_pipeline_push.py) invoke REAL DeviceManager methods
        # with this mock as `self`; those bodies read the private `_store`,
        # so alias it to the public mock so both views share state.
        mock_dm._store = mock_dm.store
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm.async_push_pipeline_to_device = AsyncMock()
        # request_push is the debounced fire-and-forget wrapper that WS
        # handlers call instead of `await _push_config_to_device(mac)` —
        # mocked here as a sync MagicMock so handler tests can assert it
        # was scheduled. The trailing-debounce semantics are tested
        # directly in TestRequestPush.
        mock_dm.request_push = MagicMock()
        # Plain call-assertion mock — no side_effect mirroring the real
        # method's guard-set behavior, which would silently go stale if the
        # real contract changed. WS tests assert the CALL was made; the real
        # semantics (mac added to _entity_update_macs, timer scheduling and
        # cancel/stop) are covered by test_device_manager.py.
        mock_dm.schedule_entity_update_clear = MagicMock()
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


def register_managed_device(
    mock_dm: MagicMock, mac: str = "AA:BB:CC:DD:EE:FF", host: str | None = "192.168.1.50"
) -> None:
    """Register a ManagedDevice on the mocked manager so handlers pass _require_known_device.

    State-mutating handlers (set_setup / set_room_layout / set_settings)
    short-circuit unless the MAC is in `manager.devices` — see _require_known_device.
    """
    from custom_components.eppgrid.device_manager import ManagedDevice

    mock_dm.devices[mac] = ManagedDevice(mac=mac, name="EPP", host=host)


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

    async def test_list_devices_includes_show_tutorial_flag(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """list_devices exposes the global show_room_calibration_tutorial flag."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.show_room_calibration_tutorial = False

        from custom_components.eppgrid.websocket_api import websocket_list_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_devices"}
        websocket_list_devices(hass, connection, msg)

        payload = connection.send_result.call_args[0][1]
        assert payload["show_room_calibration_tutorial"] is False


class TestWebSocketSetShowCalibrationTutorial:
    """Tests for eppgrid/set_show_room_calibration_tutorial."""

    async def test_set_persists_and_returns(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Handler updates the store flag and persists."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.show_room_calibration_tutorial = True

        from custom_components.eppgrid.websocket_api import websocket_set_show_room_calibration_tutorial

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/set_show_room_calibration_tutorial",
            "value": False,
        }
        await call_async_handler(hass, websocket_set_show_room_calibration_tutorial, connection, msg)

        assert mock_dm.store.show_room_calibration_tutorial is False
        mock_dm.store.async_save.assert_awaited()
        mock_dm.fire_device_list_changed.assert_called_once()
        connection.send_result.assert_called_once_with(7)

    async def test_set_not_ready(self, hass: HomeAssistant) -> None:
        """Handler returns not_ready when integration is not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_set_show_room_calibration_tutorial

        connection = MagicMock()
        msg = {"id": 7, "type": "eppgrid/set_show_room_calibration_tutorial", "value": False}
        await call_async_handler(hass, websocket_set_show_room_calibration_tutorial, connection, msg)
        connection.send_error.assert_called_once()

    async def test_set_skips_save_and_broadcast_when_unchanged(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Setting the same value must not write to disk or re-broadcast."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.show_room_calibration_tutorial = False

        from custom_components.eppgrid.websocket_api import websocket_set_show_room_calibration_tutorial

        connection = MagicMock()
        msg = {
            "id": 9,
            "type": "eppgrid/set_show_room_calibration_tutorial",
            "value": False,
        }
        await call_async_handler(hass, websocket_set_show_room_calibration_tutorial, connection, msg)

        mock_dm.store.async_save.assert_not_awaited()
        mock_dm.fire_device_list_changed.assert_not_called()
        connection.send_result.assert_called_once_with(9)

    async def test_set_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot change the tutorial flag."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_show_room_calibration_tutorial

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 10,
            "type": "eppgrid/set_show_room_calibration_tutorial",
            "value": False,
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_set_show_room_calibration_tutorial, connection, msg)

        connection.send_result.assert_not_called()


class TestWebSocketGetConfig:
    """Tests for eppgrid/get_config."""

    async def test_get_config(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """get_config returns stored config for a device."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:FF": {"calibration": {"perspective": [1.0] * 8}}}

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
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:FF": {"settings": {}}}

        from custom_components.eppgrid.websocket_api import websocket_get_config

        entity_states = {"room_occupancy": True, "zone_presence": False}

        with patch(
            "custom_components.eppgrid.websocket_api._devices._get_entity_states",
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
        register_managed_device(mock_dm)

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

        assert "AA:BB:CC:DD:EE:FF" in mock_dm.store.devices
        cal = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["calibration"]
        assert cal["room_width"] == 3000.0
        assert cal["room_depth"] == 4000.0

        mock_dm.store.async_save.assert_awaited()
        mock_dm.request_push.assert_called_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(3)

    async def test_set_setup_updates_zone_entities_with_valid_empty_shape(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """After calibration clears room_layout, the fallback passed to
        async_update_zone_entities must be a valid length-8 shape with a
        Zone0Config at index 0 — otherwise the fail-closed guard would
        disable zone 0 unexpectedly."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
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
        assert zone_slots[0] == {"type": "default"}
        assert zone_slots[1:] == [None] * 7

    async def test_set_setup_clears_room_layout(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup clears existing room layout when calibration changes."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {
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

        assert "room_layout" not in mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]

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
        register_managed_device(mock_dm)
        # Simulate target_xy was previously enabled
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"target_xy": True}}

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states") as mock_apply:
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["target_xy"] is False
        mock_apply.assert_called_once_with(hass, "AA:BB:CC:DD:EE:FF", {"target_xy": False})

    async def test_set_setup_delete_calibration_sets_entity_update_guard(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Deleting calibration arms the entity-update guard to suppress reconnect push."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"target_xy": True}}

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states"):
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

        mock_dm.schedule_entity_update_clear.assert_called_once_with("AA:BB:CC:DD:EE:FF")

    async def test_set_setup_arms_guard_before_zone_entity_update(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The NON-deleting path must also arm the entity-update guard, and
        do so BEFORE async_update_zone_entities mutates the registry —
        mirroring what set_settings already does."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

        order: list[str] = []
        mock_dm.schedule_entity_update_clear = MagicMock(side_effect=lambda *a, **k: order.append("guard"))
        mock_dm.async_update_zone_entities = AsyncMock(side_effect=lambda *a, **k: order.append("update"))

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        msg = {
            "id": 7,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }
        await call_async_handler(hass, websocket_set_setup, MagicMock(), msg)

        assert order[0] == "guard"
        assert "update" in order

    async def test_set_setup_calibration_does_not_enable_target_xy(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Adding calibration (room_width>0) must NOT auto-enable target_xy."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert "target_xy" not in settings

    async def test_set_setup_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot push perspective calibration."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 7,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_result.assert_not_called()


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

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office", "type": "default"},
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

        layout = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["room_layout"]
        assert layout["zone_slots"] == zone_slots
        assert layout["zone_slots"][0]["type"] == "default"
        mock_dm.store.async_save.assert_awaited()
        mock_dm.request_push.assert_called_with("AA:BB:CC:DD:EE:FF")
        mock_dm.async_update_zone_entities.assert_awaited_with("AA:BB:CC:DD:EE:FF", zone_slots)
        connection.send_result.assert_called_once_with(5)

    @staticmethod
    def _layout_msg(msg_id: int = 5) -> dict:
        return {
            "id": msg_id,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [1] * 400,
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }

    async def test_set_room_layout_requests_push_without_host(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """request_push is called even when the device has no host yet —
        the debounced push no-ops safely without a host and arms the
        failed-push recovery, so the asymmetric `dev.host` gate is gone."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm, host=None)

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        await call_async_handler(hass, websocket_set_room_layout, MagicMock(), self._layout_msg())

        mock_dm.request_push.assert_called_with("AA:BB:CC:DD:EE:FF")

    async def test_set_room_layout_arms_guard_before_zone_entity_update(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The entity-update reload guard must be armed BEFORE
        async_update_zone_entities mutates the registry — arming after would
        leave a window where the ESPHome reload triggers a redundant push."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

        order: list[str] = []
        mock_dm.schedule_entity_update_clear = MagicMock(side_effect=lambda *a, **k: order.append("guard"))
        mock_dm.async_update_zone_entities = AsyncMock(side_effect=lambda *a, **k: order.append("update"))

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        await call_async_handler(hass, websocket_set_room_layout, MagicMock(), self._layout_msg())

        assert order == ["guard", "update"]

    async def test_set_room_layout_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot push room layout."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 8,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [1] * 400,
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        connection.send_result.assert_not_called()

    async def test_set_room_layout_stores_zone_0_in_zone_slots(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_room_layout stores zone 0 settings at zone_slots[0], not room_*."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = MagicMock(host="1.2.3.4")

        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {
                "name": "Living",
                "color": "#ff0000",
                "type": "seating",
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

        layout = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["room_layout"]
        assert layout["zone_slots"] == zone_slots
        assert "room_type" not in layout
        assert "room_trigger" not in layout
        mock_dm.async_update_zone_entities.assert_awaited_with("AA:BB:CC:DD:EE:FF", zone_slots)


class TestZoneSlotsValidator:
    """Tests for the _validate_zone_slots voluptuous validator used by set_room_layout."""

    def _valid_slots(self) -> list:
        """Return a minimal valid zone_slots list."""
        return [{"type": "default"}] + [None] * 7

    def test_accepts_valid_zone_slots(self) -> None:
        """Valid slots: zone 0 dict with type, slots 1-7 null or named dict."""
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        valid = self._valid_slots()
        assert _validate_zone_slots(valid) == valid

        valid_named = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office", "color": "#ff0000", "type": "default"},
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
            _validate_zone_slots([{"type": "default"}] + [None] * 6)  # length 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default"}] + [None] * 8)  # length 9
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([])

    def test_rejects_non_list(self) -> None:
        """Non-list inputs are rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots("not a list")
        with pytest.raises(vol.Invalid):
            _validate_zone_slots({"type": "default"})
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

        slots = [{"type": "default"}, "not a dict"] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_without_name(self) -> None:
        """Named slots must have a string 'name'."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default"}, {"color": "#ff0000", "type": "default"}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_without_color(self) -> None:
        """Named slots must have a string 'color'."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default"}, {"name": "Office", "type": "default"}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_without_type(self) -> None:
        """Named slots must have a string 'type'."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default"}, {"name": "Office", "color": "#ff0000"}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_with_non_string_name(self) -> None:
        """Named slot 'name' must be a string."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "default"},
            {"name": 123, "color": "#ff0000", "type": "default"},
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

        slots = [{"type": "default", "trigger": "5"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_renew(self) -> None:
        """Slot 0 'renew' must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default", "renew": "3"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_timeout(self) -> None:
        """Slot 0 'timeout' must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default", "timeout": "10"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_slot_0_with_non_numeric_handoff_timeout(self) -> None:
        """Slot 0 'handoff_timeout' must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default", "handoff_timeout": "3"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_named_slot_with_non_numeric_trigger(self) -> None:
        """Named slot timing fields must be numeric when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "default"},
            {"name": "Office", "color": "#ff0000", "type": "default", "trigger": "5"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_oversized_name(self) -> None:
        """Zone name field must be capped (≤ 64 chars)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "default"},
            {"name": "x" * 65, "color": "#ff0000", "type": "default"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_oversized_type(self) -> None:
        """Zone `type` field must be capped (≤ 32 chars)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "x" * 33}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

        slots = [
            {"type": "default"},
            {"name": "Office", "color": "#ff0000", "type": "x" * 33},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_malformed_color(self) -> None:
        """Zone `color` must match `^#[0-9A-Fa-f]{6}$`."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "default"},
            {"name": "Office", "color": "red", "type": "default"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

        # Hex without leading '#'
        slots = [
            {"type": "default"},
            {"name": "Office", "color": "ff0000", "type": "default"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

        # Wrong length
        slots = [
            {"type": "default"},
            {"name": "Office", "color": "#fff", "type": "default"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_unknown_keys_in_slot_0(self) -> None:
        """Unknown keys in slot 0 dict must be rejected (PREVENT_EXTRA)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default", "junk_key": "bad"}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_unknown_keys_in_named_slot(self) -> None:
        """Unknown keys in a named slot dict must be rejected (PREVENT_EXTRA)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "default"},
            {"name": "Office", "color": "#ff0000", "type": "default", "junk_key": "bad"},
        ] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_rejects_trigger_out_of_range(self) -> None:
        """trigger must be 1..9 when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        # above max
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "trigger": 10}] + [None] * 7)
        # below min
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "trigger": 0}] + [None] * 7)

    def test_rejects_renew_out_of_range(self) -> None:
        """renew must be 1..9 when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "renew": 10}] + [None] * 7)
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "renew": 0}] + [None] * 7)

    def test_rejects_timeout_out_of_range(self) -> None:
        """timeout must be 0..3600 when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "timeout": 3601}] + [None] * 7)
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "timeout": -1}] + [None] * 7)

    def test_rejects_handoff_timeout_out_of_range(self) -> None:
        """handoff_timeout must be 0..300 when present."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "handoff_timeout": 301}] + [None] * 7)
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "handoff_timeout": -1}] + [None] * 7)

    def test_rejects_infinite_timing_field(self) -> None:
        """Timing fields must be finite numbers — NaN and Inf rejected."""
        import math

        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "timeout": math.inf}] + [None] * 7)
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "default", "timeout": float("nan")}] + [None] * 7)

    def test_accepts_valid_timing_bounds(self) -> None:
        """Timing fields at boundary values must be accepted.

        Also pins the canonical stored TYPES: trigger/renew are ints (the
        firmware's ArduinoJson extraction is type-strict — a float-typed 7.0
        silently becomes the default), timeout/handoff_timeout are floats.
        """
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        # min boundaries
        slots = [
            {"type": "custom", "trigger": 1, "renew": 1, "timeout": 0.0, "handoff_timeout": 0.0},
        ] + [None] * 7
        result = _validate_zone_slots(slots)
        assert result[0]["trigger"] == 1
        assert type(result[0]["trigger"]) is int
        assert type(result[0]["renew"]) is int
        assert result[0]["timeout"] == 0.0
        assert type(result[0]["timeout"]) is float
        assert type(result[0]["handoff_timeout"]) is float

        # max boundaries
        slots = [
            {"type": "custom", "trigger": 9, "renew": 9, "timeout": 3600.0, "handoff_timeout": 300.0},
        ] + [None] * 7
        result = _validate_zone_slots(slots)
        assert result[0]["trigger"] == 9
        assert type(result[0]["trigger"]) is int
        assert type(result[0]["renew"]) is int
        assert result[0]["timeout"] == 3600.0

    def test_custom_timing_preserves_integer_wire_format(self) -> None:
        """A custom zone's trigger/renew must survive validation as ints.

        Regression: the validator briefly normalised timing fields to float
        in place, so a stored custom zone reached the device as
        `"trigger": 7.0`. The firmware parser's `z["trigger"] | 5` is
        type-strict in ArduinoJson v7 (`is<int>()` is false for float-typed
        values), so the user's trigger=7/renew=4 silently became the defaults
        5/3 on-device. Trace the full push path — _validate_zone_slots →
        _expand_zone_slot → json.dumps (the payload ArduinoJson actually
        parses, see device_manager/_connection.py) — and pin the integer
        wire format.
        """
        import json

        from custom_components.eppgrid.device_manager._helpers import _expand_zone_slot
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {"type": "default"},
            {
                "name": "Office",
                "color": "#ff0000",
                "type": "custom",
                "trigger": 7,
                "renew": 4,
                "timeout": 30,
                "handoff_timeout": 5,
            },
        ] + [None] * 6
        result = _validate_zone_slots(slots)
        assert result[1]["trigger"] == 7
        assert type(result[1]["trigger"]) is int
        assert result[1]["renew"] == 4
        assert type(result[1]["renew"]) is int

        # The pushed JSON must carry integer trigger/renew — `7`, never `7.0`.
        expanded = [_expand_zone_slot(s) if s is not None else None for s in result]
        zones_json = json.dumps({"zone_slots": expanded})
        assert '"trigger": 7,' in zones_json
        assert '"renew": 4,' in zones_json
        assert "7.0" not in zones_json
        # timeout/handoff_timeout are canonically floats — the firmware reads
        # them with float defaults, so float-typed JSON is safe there.
        assert '"timeout": 30.0,' in zones_json

    def test_rejects_unknown_type_value(self) -> None:
        """type must be from the known vocabulary; arbitrary strings are rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        # Completely unknown type
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "sleeping_area"}] + [None] * 7)
        # Even a short unknown type is rejected
        with pytest.raises(vol.Invalid):
            _validate_zone_slots([{"type": "kitchen"}] + [None] * 7)

    def test_accepts_legacy_type_values(self) -> None:
        """Pre-0.95 types 'rest' and 'thoroughfare' must still be accepted (BWC)."""
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        # v1.0.0-era stored config: legacy types, no extra keys
        slots_rest = [{"type": "rest"}] + [None] * 7
        assert _validate_zone_slots(slots_rest) == slots_rest

        slots_thoroughfare = [
            {"type": "default"},
            {"name": "Hallway", "color": "#aabbcc", "type": "thoroughfare"},
        ] + [None] * 6
        assert _validate_zone_slots(slots_thoroughfare) == slots_thoroughfare

    def test_accepts_all_live_type_values(self) -> None:
        """All current frontend type values must be accepted."""
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        for zone_type in ("default", "bed", "seating", "transit", "custom"):
            slots = [{"type": zone_type}] + [None] * 7
            assert _validate_zone_slots(slots) == slots

    def test_rejects_bool_as_numeric_timing(self) -> None:
        """bool must NOT slip through the numeric-timing-field check.

        `isinstance(True, int)` returns True in Python (bool ⊂ int), so a naive
        `isinstance(v, (int, float))` accepts booleans. Reject them explicitly so
        a `True`/`False` value can't sneak into firmware as timing data.
        """
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [{"type": "default", "trigger": True}] + [None] * 7
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

        slots = [{"type": "default"}, {"name": "x", "color": "#ff0000", "type": "default", "renew": False}] + [None] * 6
        with pytest.raises(vol.Invalid):
            _validate_zone_slots(slots)

    def test_round_half_up_pins_half_up_against_bankers_rounding(self) -> None:
        """_round_half_up(2.5) must equal 3, not 2.

        Python's built-in round() uses banker's rounding: round(2.5) == 2
        (rounds to the nearest even integer). The firmware's lroundf() always
        rounds half-up, so 2.5 → 3. This assertion would FAIL if _round_half_up
        were replaced with plain round(), proving the test actually pins the
        half-up behaviour.
        """
        from custom_components.eppgrid.websocket_api import _round_half_up

        # Tie cases: half-up must round away from zero (odd target).
        # Python banker's round() gives 2 for 2.5 and 4 for 4.5; half-up gives 3 and 5.
        assert _round_half_up(2.5) == 3  # banker's would give 2 (even floor)
        assert _round_half_up(4.5) == 5  # banker's would give 4 (even floor)
        # Non-tie cases: both strategies agree.
        assert _round_half_up(2.4) == 2
        assert _round_half_up(2.6) == 3

    def test_accepts_numeric_timing_fields(self) -> None:
        """int and float values for timing fields are both accepted.

        Values are normalised to the canonical stored types: trigger/renew
        become ints (non-integral values round half-up, matching the firmware
        parser's lroundf), timeout/handoff_timeout become floats.
        """
        from custom_components.eppgrid.websocket_api import _validate_zone_slots

        slots = [
            {
                "type": "default",
                "trigger": 5,
                "renew": 2.5,  # even-floor tie: banker's round(2.5)==2, half-up→3
                "timeout": 10,
                "handoff_timeout": 3.0,
            },
            {
                "name": "Office",
                "color": "#ff0000",
                "type": "default",
                "trigger": 4,
                "renew": 2.0,
                "timeout": 12.5,
                "handoff_timeout": 2,
            },
        ] + [None] * 6
        result = _validate_zone_slots(slots)
        assert result[0]["trigger"] == 5
        assert result[0]["renew"] == 3  # 2.5 half-up → 3; banker's round(2.5) would give 2
        assert result[0]["timeout"] == 10.0
        assert result[1]["renew"] == 2
        assert type(result[1]["renew"]) is int
        assert result[1]["timeout"] == 12.5
        assert result[1]["handoff_timeout"] == 2.0
        assert type(result[1]["handoff_timeout"]) is float


class TestSchemaInputBounds:
    """Schema-level input validation for state-mutating WS commands.

    Asserts the voluptuous `_ws_schema` attached by `@websocket_api.websocket_command`
    rejects oversized / malformed payloads before they reach the handler body.
    """

    @staticmethod
    def _validate(handler, payload: dict) -> None:
        """Run the handler's voluptuous schema, raising vol.Invalid on rejection."""
        handler._ws_schema(payload)

    # ---- Item 1: grid_bytes schema unbounded ----

    def test_grid_bytes_rejects_oversize_list(self) -> None:
        """grid_bytes must be capped at GRID_COLS * GRID_ROWS entries."""
        import voluptuous as vol

        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS
        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        oversized = [0] * (GRID_COLS * GRID_ROWS + 1)
        payload = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": oversized,
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, payload)

    def test_grid_bytes_rejects_short_list(self) -> None:
        """grid_bytes must contain exactly GRID_COLS * GRID_ROWS entries.

        Firmware rejects any push that isn't the full grid, so a short list
        would persist to storage and then silently fail every config push.
        """
        import voluptuous as vol

        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS
        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        payload = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0] * (GRID_COLS * GRID_ROWS - 1),
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, payload)

    def test_grid_bytes_rejects_value_above_255(self) -> None:
        """grid_bytes values must be in [0, 255]."""
        import voluptuous as vol

        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS
        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        payload = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [256] + [0] * (GRID_COLS * GRID_ROWS - 1),
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, payload)

    def test_grid_bytes_rejects_negative_value(self) -> None:
        """grid_bytes values must not be negative."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        payload = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [-1, 0, 0],
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, payload)

    def test_grid_bytes_accepts_valid_payload(self) -> None:
        """A correctly-sized [0, 255] grid_bytes payload passes validation."""
        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS
        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        payload = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0, 1, 255] + [0] * (GRID_COLS * GRID_ROWS - 3),
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }
        # No exception
        self._validate(websocket_set_room_layout, payload)

    # ---- static_on_delay hardware bounds (DFRobot C4001: 0-2s) ----

    @staticmethod
    def _set_settings_payload(on_delay: float) -> dict:
        """A complete valid set_settings payload with a given static_on_delay."""
        return {
            "id": 1,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "stuck_target_timeout": 120.0,
            "static_auto_distance": False,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
            "static_trigger_threshold": 3,
            "static_renew_threshold": 3,
            "static_timeout": 30.0,
            "static_on_delay": on_delay,
            "led_mode": "Manual Control",
            "led_brightness": 1.0,
            "led_presence_color": "#CC33FF",
            "relay_trigger_mode": "disabled",
            "relay_contact_mode": "no",
        }

    def test_static_on_delay_rejects_above_hardware_max(self) -> None:
        """static_on_delay above 2s exceeds the DFRobot C4001 trigger-delay range."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_settings, self._set_settings_payload(2.5))

    def test_static_on_delay_rejects_negative(self) -> None:
        """static_on_delay must not be negative."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_settings, self._set_settings_payload(-0.5))

    def test_static_on_delay_accepts_hardware_bounds(self) -> None:
        """static_on_delay of 0s and 2s (the hardware limits) pass validation."""
        from custom_components.eppgrid.websocket_api import websocket_set_settings

        self._validate(websocket_set_settings, self._set_settings_payload(0.0))
        self._validate(websocket_set_settings, self._set_settings_payload(2.0))

    # ---- Item 2: malformed MAC format ----

    @pytest.mark.parametrize(
        "handler_name,extra",
        [
            (
                "websocket_set_setup",
                {
                    "perspective": [1.0] * 8,
                    "room_width": 3.0,
                    "room_depth": 4.0,
                },
            ),
            (
                "websocket_set_room_layout",
                {
                    "grid_bytes": [0],
                    "zone_slots": [{"type": "default"}] + [None] * 7,
                    "furniture": [],
                },
            ),
            ("websocket_get_config", {}),
            (
                "websocket_set_distance_override",
                {
                    "target_max_distance": 4.0,
                    "static_min_distance": 0.3,
                    "static_max_distance": 8.0,
                },
            ),
            ("websocket_subscribe_device", {}),
            ("websocket_subscribe_raw_targets", {}),
            ("websocket_subscribe_grid_targets", {}),
            (
                "websocket_set_entity_enabled",
                {
                    "entity_id": "binary_sensor.x",
                    "enabled": True,
                },
            ),
            (
                "websocket_dismiss_target",
                {
                    "target_index": 0,
                    "cell_index": 1,
                },
            ),
            ("websocket_update_firmware", {}),
            ("websocket_subscribe_ota_progress", {}),
        ],
    )
    def test_mac_format_rejected_by_schema(self, handler_name: str, extra: dict) -> None:
        """All commands taking `mac` must reject malformed MAC strings at schema level."""
        import importlib

        import voluptuous as vol

        ws_mod = importlib.import_module("custom_components.eppgrid.websocket_api")
        handler = getattr(ws_mod, handler_name)
        # Derive the command name from the schema for the payload "type"
        cmd_type = handler._ws_command
        payload = {"id": 1, "type": cmd_type, "mac": "not-a-mac", **extra}
        with pytest.raises(vol.Invalid):
            self._validate(handler, payload)

    def test_mac_schema_normalizes_to_uppercase(self) -> None:
        """MAC_SCHEMA must uppercase any-case input so it matches storage keys.

        manager.devices keys are uppercased via _extract_mac().upper(); without
        normalization, a lowercase but otherwise valid MAC passes schema
        validation but then fails the _require_known_device lookup, surfacing
        as a confusing "device_not_found" for what is actually a known device.
        """
        from custom_components.eppgrid.websocket_api import MAC_SCHEMA

        assert MAC_SCHEMA("aa:bb:cc:dd:ee:ff") == "AA:BB:CC:DD:EE:FF"
        assert MAC_SCHEMA("Aa:Bb:Cc:Dd:Ee:Ff") == "AA:BB:CC:DD:EE:FF"
        assert MAC_SCHEMA("AA:BB:CC:DD:EE:FF") == "AA:BB:CC:DD:EE:FF"

    # ---- Item 2: unknown MAC short-circuits ----

    async def test_set_setup_rejects_unknown_mac(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_setup must short-circuit with device_not_found when MAC is unknown."""
        mock_dm = await setup_integration(hass, config_entry)
        # No devices registered
        assert mock_dm.devices == {}

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 3.0,
            "room_depth": 4.0,
        }
        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[0] == 1
        assert args[1] == "device_not_found"
        # Storage must not have been mutated
        assert "AA:BB:CC:DD:EE:FF" not in mock_dm.store.devices

    async def test_set_room_layout_rejects_unknown_mac(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_room_layout rejects unknown MAC."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        connection = MagicMock()
        msg = {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0],
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": [],
        }
        await call_async_handler(hass, websocket_set_room_layout, connection, msg)

        connection.send_error.assert_called_once()
        assert connection.send_error.call_args[0][1] == "device_not_found"
        assert "AA:BB:CC:DD:EE:FF" not in mock_dm.store.devices

    async def test_set_settings_rejects_unknown_mac(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings rejects unknown MAC."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        msg = {
            "id": 1,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "stuck_target_timeout": 300.0,
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

        connection.send_error.assert_called_once()
        assert connection.send_error.call_args[0][1] == "device_not_found"
        assert "AA:BB:CC:DD:EE:FF" not in mock_dm.store.devices

    # ---- Item 4: All voluptuous string schemas unbounded ----

    @pytest.mark.parametrize(
        "handler_name,field,extra,too_long",
        [
            (
                "websocket_save_configuration",
                "name",
                {"configuration": {}},
                "x" * 129,  # NAME_SCHEMA is max=128
            ),
            (
                "websocket_delete_configuration",
                "name",
                {},
                "x" * 129,
            ),
            (
                "websocket_set_entity_enabled",
                "entity_id",
                {"mac": "AA:BB:CC:DD:EE:FF", "enabled": True},
                "binary_sensor." + "x" * 256,  # ENTITY_ID_SCHEMA is max=255
            ),
            (
                "websocket_delete_esphome_device",
                "config_entry_id",
                {},
                "x" * 65,  # CONFIG_ENTRY_ID_SCHEMA is max=64
            ),
        ],
    )
    def test_string_field_length_caps(self, handler_name: str, field: str, extra: dict, too_long: str) -> None:
        """Schema-level length caps reject oversized string fields before handler runs."""
        import importlib

        import voluptuous as vol

        ws_mod = importlib.import_module("custom_components.eppgrid.websocket_api")
        handler = getattr(ws_mod, handler_name)
        cmd_type = handler._ws_command
        payload = {"id": 1, "type": cmd_type, **extra, field: too_long}
        with pytest.raises(vol.Invalid):
            self._validate(handler, payload)

    # ---- Item 7: set_setup allows negative room dims ----

    def test_set_setup_rejects_negative_room_width(self) -> None:
        """Negative room dimensions must be rejected at the schema layer."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        payload = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": -1.0,
            "room_depth": 4.0,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_setup, payload)

    def test_set_setup_rejects_unreasonable_room_dimension(self) -> None:
        """Room dimensions above the 50 000 mm cap are rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        payload = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 1_000_000.0,
            "room_depth": 4_000.0,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_setup, payload)

    def test_set_setup_accepts_zero_room_width(self) -> None:
        """room_width=0 is the valid 'delete calibration' sentinel — must pass."""
        from custom_components.eppgrid.websocket_api import websocket_set_setup

        payload = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [0.0] * 8,
            "room_width": 0.0,
            "room_depth": 0.0,
        }
        self._validate(websocket_set_setup, payload)

    def test_set_setup_accepts_normal_room_dimensions(self) -> None:
        """Normal room dimensions (millimetres, a few metres) pass validation."""
        from custom_components.eppgrid.websocket_api import websocket_set_setup

        payload = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 5_000.0,
            "room_depth": 4_000.0,
        }
        self._validate(websocket_set_setup, payload)

    def test_save_configuration_rejects_oversize_dict(self) -> None:
        """save_configuration must reject configuration dicts beyond the JSON-size cap."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        # 256 KiB cap; build a dict whose JSON serialization exceeds it.
        oversized = {"data": "x" * (300 * 1024)}
        payload = {
            "id": 1,
            "type": "eppgrid/save_configuration",
            "name": "test",
            "configuration": oversized,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_save_configuration, payload)

    # ---- dismiss_target index bounds ----

    def test_dismiss_target_target_index_above_max_rejected(self) -> None:
        """target_index > 2 must be rejected at schema level."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        payload = {
            "id": 1,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 3,
            "cell_index": 0,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_dismiss_target, payload)

    def test_dismiss_target_target_index_negative_rejected(self) -> None:
        """Negative target_index must be rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        payload = {
            "id": 1,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": -1,
            "cell_index": 0,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_dismiss_target, payload)

    def test_dismiss_target_cell_index_above_max_rejected(self) -> None:
        """cell_index >= GRID_COLS*GRID_ROWS must be rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS
        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        payload = {
            "id": 1,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 0,
            "cell_index": GRID_COLS * GRID_ROWS,  # one past the end
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_dismiss_target, payload)

    def test_dismiss_target_cell_index_negative_rejected(self) -> None:
        """Negative cell_index must be rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        payload = {
            "id": 1,
            "type": "eppgrid/dismiss_target",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_index": 0,
            "cell_index": -1,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_dismiss_target, payload)

    def test_dismiss_target_valid_boundary_values_accepted(self) -> None:
        """Boundary values (target_index=0..2, cell_index=0..GRID_COLS*GRID_ROWS-1) pass."""
        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS
        from custom_components.eppgrid.websocket_api import websocket_dismiss_target

        # min boundary
        self._validate(
            websocket_dismiss_target,
            {
                "id": 1,
                "type": "eppgrid/dismiss_target",
                "mac": "AA:BB:CC:DD:EE:FF",
                "target_index": 0,
                "cell_index": 0,
            },
        )
        # max boundary
        self._validate(
            websocket_dismiss_target,
            {
                "id": 2,
                "type": "eppgrid/dismiss_target",
                "mac": "AA:BB:CC:DD:EE:FF",
                "target_index": 2,
                "cell_index": GRID_COLS * GRID_ROWS - 1,
            },
        )

    # ---- finite floats: NaN / Infinity must never reach storage ----
    # vol.Coerce(float) happily accepts the strings "NaN" / "Infinity";
    # NaN then persists to storage where orjson writes `null`, breaking
    # config pushes after restart. vol.Range alone can't catch NaN because
    # every comparison against NaN is False.

    _SET_SETTINGS_FLOAT_FIELDS = (
        "temperature_offset",
        "humidity_offset",
        "illuminance_offset",
        "motion_timeout",
        "target_max_distance",
        "stuck_target_timeout",
        "static_min_distance",
        "static_max_distance",
        "static_timeout",
        "static_on_delay",
        "led_brightness",
    )

    @pytest.mark.parametrize("field", _SET_SETTINGS_FLOAT_FIELDS)
    @pytest.mark.parametrize("bad", ["NaN", "Infinity", "-Infinity"])
    def test_set_settings_rejects_non_finite_floats(self, field: str, bad: str) -> None:
        """Every float field in set_settings rejects NaN/Infinity."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        payload = self._set_settings_payload(0.0)
        payload[field] = bad
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_settings, payload)

    @pytest.mark.parametrize("bad", ["NaN", "Infinity", "-Infinity"])
    def test_set_setup_rejects_non_finite_perspective(self, bad: str) -> None:
        """Perspective coefficients reject NaN/Infinity."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        payload = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 7 + [bad],
            "room_width": 5_000.0,
            "room_depth": 4_000.0,
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_setup, payload)

    @pytest.mark.parametrize("field", ["room_width", "room_depth"])
    def test_set_setup_rejects_nan_room_dimensions(self, field: str) -> None:
        """Room dimensions reject NaN (slips through vol.Range unaided)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        payload = {
            "id": 1,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0] * 8,
            "room_width": 5_000.0,
            "room_depth": 4_000.0,
        }
        payload[field] = "NaN"
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_setup, payload)

    @staticmethod
    def _distance_override_payload() -> dict:
        return {
            "id": 1,
            "type": "eppgrid/set_distance_override",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 4.0,
            "static_min_distance": 0.3,
            "static_max_distance": 8.0,
        }

    @pytest.mark.parametrize(
        "field",
        ["target_max_distance", "static_min_distance", "static_max_distance"],
    )
    @pytest.mark.parametrize("bad", ["NaN", "Infinity", "-Infinity"])
    def test_set_distance_override_rejects_non_finite(self, field: str, bad: str) -> None:
        """All set_distance_override floats reject NaN/Infinity."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        payload = self._distance_override_payload()
        payload[field] = bad
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_distance_override, payload)

    def test_set_distance_override_accepts_valid_floats(self) -> None:
        """Normal finite distances still pass validation."""
        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        self._validate(websocket_set_distance_override, self._distance_override_payload())

    # ---- furniture validation ----

    @staticmethod
    def _room_layout_payload(furniture: object) -> dict:
        from custom_components.eppgrid.const import GRID_COLS
        from custom_components.eppgrid.const import GRID_ROWS

        return {
            "id": 1,
            "type": "eppgrid/set_room_layout",
            "mac": "AA:BB:CC:DD:EE:FF",
            "grid_bytes": [0] * (GRID_COLS * GRID_ROWS),
            "zone_slots": [{"type": "default"}] + [None] * 7,
            "furniture": furniture,
        }

    def test_furniture_accepts_frontend_shape(self) -> None:
        """The exact item shape the frontend serializes passes validation."""
        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = {
            "type": "icon",
            "icon": "mdi:bed-double",
            "label": "furniture.bed",
            "x": 100.0,
            "y": 200.5,
            "width": 1500.0,
            "height": 2000.0,
            "rotation": 90,
            "lockAspect": True,
        }
        self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_non_list(self) -> None:
        """furniture must be a list, not an arbitrary value."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload({"a": 1}))

    def test_furniture_rejects_non_dict_item(self) -> None:
        """Each furniture item must be a dict."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload(["garbage"]))

    @staticmethod
    def _furniture_item(**overrides: object) -> dict:
        """A minimal valid furniture item (all required geometry present)."""
        item: dict = {"icon": "mdi:sofa", "x": 1.0, "y": 2.0, "width": 100.0, "height": 50.0}
        item.update(overrides)
        return item

    def test_furniture_rejects_unknown_keys(self) -> None:
        """Unknown keys in a furniture item are rejected (no arbitrary blobs)."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(evil="payload")
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_oversized_strings(self) -> None:
        """String fields in furniture items are length-bounded."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(label="x" * 1000)
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    @pytest.mark.parametrize("field", ["x", "y", "width", "height", "rotation"])
    def test_furniture_rejects_non_finite_geometry(self, field: str) -> None:
        """Geometry fields in furniture items must be finite numbers."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(**{field: "NaN"})
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_empty_item(self) -> None:
        """A degenerate `{}` item is rejected — geometry keys are required."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([{}]))

    @pytest.mark.parametrize("field", ["x", "y", "width", "height"])
    def test_furniture_rejects_missing_geometry_key(self, field: str) -> None:
        """`x`/`y`/`width`/`height` are required — the frontend always sends
        them, and an item without geometry can't be rendered."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item()
        del item[field]
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_oversized_total_payload(self) -> None:
        """Many max-size items exceed the serialized-size cap and are rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = {"icon": "mdi:" + "y" * 124, "label": "x" * 128}
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([dict(item) for _ in range(400)]))

    # ---- save_configuration size cap measured in UTF-8 bytes ----

    def test_save_configuration_size_cap_is_byte_accurate(self) -> None:
        """A multibyte config under the cap in UTF-8 bytes is accepted.

        60 000 'é' chars are ~360 KiB when measured as ASCII-escaped JSON
        characters (the old, over-counting measure) but only ~120 KiB as raw
        UTF-8 — which is what HA's storage actually writes. The cap must
        measure the latter.
        """
        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        payload = {
            "id": 1,
            "type": "eppgrid/save_configuration",
            "name": "multibyte",
            "configuration": {"note": "é" * 60_000},
        }
        self._validate(websocket_save_configuration, payload)

    def test_save_configuration_rejects_oversize_utf8_bytes(self) -> None:
        """A config over the cap in raw UTF-8 bytes is still rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        payload = {
            "id": 1,
            "type": "eppgrid/save_configuration",
            "name": "multibyte",
            "configuration": {"note": "é" * 200_000},  # ~400 KiB UTF-8
        }
        with pytest.raises(vol.Invalid):
            self._validate(websocket_save_configuration, payload)


class TestWebSocketConfigurations:
    """Tests for configuration CRUD commands."""

    async def test_list_configurations(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_configurations returns stored configurations."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.configurations = {"bedroom": {"grid_bytes": [1] * 400}}

        from custom_components.eppgrid.websocket_api import websocket_list_configurations

        connection = MagicMock()
        msg = {"id": 6, "type": "eppgrid/list_configurations"}

        websocket_list_configurations(hass, connection, msg)

        result = connection.send_result.call_args[0]
        assert "bedroom" in result[1]["configurations"]

    async def test_save_configuration(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """save_configuration stores a new configuration."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/save_configuration",
            "name": "office",
            "configuration": {"grid_bytes": [0] * 400},
        }

        await call_async_handler(hass, websocket_save_configuration, connection, msg)

        assert "office" in mock_dm.store.configurations
        mock_dm.store.async_save.assert_awaited()
        connection.send_result.assert_called_once_with(7)

    async def test_save_configuration_rejects_new_name_at_cap(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Saving a NEW name when 50 configurations exist is rejected."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.configurations = {f"cfg-{i}": {} for i in range(50)}

        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        connection = MagicMock()
        msg = {
            "id": 70,
            "type": "eppgrid/save_configuration",
            "name": "one-too-many",
            "configuration": {"grid_bytes": [0] * 400},
        }

        await call_async_handler(hass, websocket_save_configuration, connection, msg)

        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once()
        args = connection.send_error.call_args
        assert args[0][0] == 70
        assert args[0][1] == "too_many_configurations"
        assert "50" in args[0][2]
        assert "one-too-many" not in mock_dm.store.configurations
        mock_dm.store.async_save.assert_not_awaited()

    async def test_save_configuration_overwrite_allowed_at_cap(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Overwriting an EXISTING name is always allowed, even at the cap."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.configurations = {f"cfg-{i}": {} for i in range(50)}

        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        connection = MagicMock()
        msg = {
            "id": 71,
            "type": "eppgrid/save_configuration",
            "name": "cfg-7",
            "configuration": {"grid_bytes": [1] * 400},
        }

        await call_async_handler(hass, websocket_save_configuration, connection, msg)

        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(71)
        assert mock_dm.store.configurations["cfg-7"] == {"grid_bytes": [1] * 400}
        mock_dm.store.async_save.assert_awaited()

    async def test_save_configuration_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot save a configuration."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 11,
            "type": "eppgrid/save_configuration",
            "name": "office",
            "configuration": {"grid_bytes": [0] * 400},
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_save_configuration, connection, msg)

        connection.send_result.assert_not_called()

    async def test_delete_configuration(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_configuration removes a configuration."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.configurations["old"] = {"data": True}

        from custom_components.eppgrid.websocket_api import websocket_delete_configuration

        connection = MagicMock()
        msg = {"id": 8, "type": "eppgrid/delete_configuration", "name": "old"}

        await call_async_handler(hass, websocket_delete_configuration, connection, msg)

        assert "old" not in mock_dm.store.configurations
        mock_dm.store.async_save.assert_awaited()

    async def test_delete_configuration_requires_admin(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Non-admin users cannot delete a configuration."""
        from homeassistant.exceptions import Unauthorized

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.configurations["old"] = {"data": True}

        from custom_components.eppgrid.websocket_api import websocket_delete_configuration

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {"id": 12, "type": "eppgrid/delete_configuration", "name": "old"}

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_delete_configuration, connection, msg)

        connection.send_result.assert_not_called()
        # Configuration should NOT have been removed
        assert "old" in mock_dm.store.configurations

    async def test_apply_template_command_removed(self) -> None:
        """eppgrid/apply_template is no longer a valid command."""
        # Tombstone: eppgrid/apply_template (an unrelated, previously-removed
        # command) must not be reintroduced. Not related to the templates →
        # configurations rename.
        from custom_components.eppgrid import websocket_api as ws_mod

        assert not hasattr(ws_mod, "websocket_apply_template")

    async def test_save_configuration_round_trips_settings(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """save_configuration persists `settings` field as part of the blob.

        Uses direct handler invocation (consistent with the rest of this class) —
        voluptuous schema dispatch is not exercised here.
        """
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_list_configurations
        from custom_components.eppgrid.websocket_api import websocket_save_configuration

        blob = {
            "grid": [0, 1, 2],
            "zones": [None] * 8,
            "roomWidth": 3.0,
            "roomDepth": 4.0,
            "furniture": [],
            "settings": {
                "temperature_offset": 0.5,
                "motion_timeout": 30,
                "led_mode": "Presence",
                "target_update_rate_ms": 500,
                "entities": {"zone_presence": True},
                "log_levels": {"sensor": "Info"},
            },
        }
        save_msg = {
            "id": 9,
            "type": "eppgrid/save_configuration",
            "name": "Bedroom",
            "configuration": blob,
        }

        save_connection = MagicMock()
        await call_async_handler(hass, websocket_save_configuration, save_connection, save_msg)
        save_connection.send_result.assert_called_once_with(9)

        list_connection = MagicMock()
        list_msg = {"id": 10, "type": "eppgrid/list_configurations"}
        websocket_list_configurations(hass, list_connection, list_msg)

        result = list_connection.send_result.call_args[0]
        saved_blob = result[1]["configurations"]["Bedroom"]
        assert saved_blob["settings"] == {
            "temperature_offset": 0.5,
            "motion_timeout": 30,
            "led_mode": "Presence",
            "target_update_rate_ms": 500,
            "entities": {"zone_presence": True},
            "log_levels": {"sensor": "Info"},
        }


class TestWebSocketSettings:
    """Tests for the unified eppgrid/set_settings command."""

    async def test_set_settings_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot push settings to the device."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 30,
            "type": "eppgrid/set_settings",
            "mac": "AA:BB:CC:DD:EE:FF",
            "temperature_offset": 0.0,
            "humidity_offset": 0.0,
            "illuminance_offset": 0.0,
            "motion_timeout": 5.0,
            "target_auto_distance": True,
            "target_max_distance": 4.0,
            "stuck_target_timeout": 300.0,
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

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_set_settings, connection, msg)

        connection.send_result.assert_not_called()

    async def test_set_settings_stores_all_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores all values under device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 120.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["temperature_offset"] == -1.5
        assert settings["humidity_offset"] == 2.0
        assert settings["illuminance_offset"] == -10.0
        assert settings["motion_timeout"] == 5.0
        assert settings["target_auto_distance"] is True
        assert settings["target_max_distance"] == 4.0
        assert settings["stuck_target_timeout"] == 120.0
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
        mock_dm.store.async_save.assert_awaited()
        mock_dm.request_push.assert_called_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_stores_led_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores LED settings under device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["led_mode"] == "Presence"
        assert settings["led_brightness"] == 0.8
        assert settings["led_presence_color"] == "#00FF00"
        connection.send_result.assert_called_once_with(12)

    async def test_set_settings_applies_entity_changes(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings calls _apply_entity_states when entities dict is provided."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states") as mock_apply:
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
                "stuck_target_timeout": 300.0,
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
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states"):
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
        register_managed_device(mock_dm)
        # Device has no stored room_layout (fresh setup or post-calibration).
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {}

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
            "stuck_target_timeout": 300.0,
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

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states"):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_dm.async_update_zone_entities.assert_awaited_once()
            zone_slots = mock_dm.async_update_zone_entities.call_args[0][1]
            assert len(zone_slots) == 8
            assert zone_slots[0] == {"type": "default"}
            assert zone_slots[1:] == [None] * 7

    async def test_set_settings_zone_presence_true_calls_update_zone_entities(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """zone_presence=true should call async_update_zone_entities with layout."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states"):
            mock_dm.async_update_zone_entities = AsyncMock()
            await call_async_handler(hass, websocket_set_settings, connection, msg)

            mock_dm.async_update_zone_entities.assert_awaited_once()

    async def test_set_settings_entities_not_stored(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """entities dict from the message is NOT stored in device_config['settings']."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert "entities" not in settings

    async def test_set_settings_persists_log_levels(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores log_levels in device_config['log_levels'], separate from settings."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        device_config = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]
        assert device_config["log_levels"] == {"epp": "Debug", "system": "Info"}
        # log_levels should NOT be in settings
        assert "log_levels" not in device_config["settings"]
        mock_dm.store.async_save.assert_awaited()
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_without_log_levels_does_not_overwrite(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings without log_levels does not clear existing log_levels."""
        mock_dm = await setup_integration(hass, config_entry)
        # Pre-populate log_levels
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {
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
            "stuck_target_timeout": 300.0,
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

        device_config = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]
        # Existing log_levels should remain untouched
        assert device_config["log_levels"] == {"epp": "Debug"}

    async def test_set_settings_with_entities_sets_entity_update_guard(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings with entities sets the entity update guard to suppress reconnect push."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        mock_dm.schedule_entity_update_clear.assert_called_once_with("AA:BB:CC:DD:EE:FF")

    async def test_set_settings_without_entities_sets_guard_for_relay(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings without entities still sets the entity update guard for relay state change."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        mock_dm.schedule_entity_update_clear.assert_called_once_with("AA:BB:CC:DD:EE:FF")

    async def test_set_settings_stores_relay_values(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings stores relay_trigger_mode and relay_contact_mode under settings."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

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
            "stuck_target_timeout": 300.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["relay_trigger_mode"] == "motion"
        assert settings["relay_contact_mode"] == "nc"
        connection.send_result.assert_called_once_with(11)

    async def test_set_settings_enables_relay_entity_on_trigger_mode(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings enables relay_output entity when trigger_mode != 'disabled'."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states") as mock_apply:
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
                "stuck_target_timeout": 300.0,
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
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states") as mock_apply:
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
                "stuck_target_timeout": 300.0,
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


class TestZonePresencePreservation:
    """Tests for zone_presence preservation across set_settings calls."""

    async def test_set_settings_preserves_zone_presence(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings must not overwrite stored settings.zone_presence."""
        mock_dm = await setup_integration(hass, config_entry)
        # Simulate calibration having set zone_presence=true
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

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
            "stuck_target_timeout": 300.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["zone_presence"] is True

    async def test_set_settings_preserves_target_xy(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_settings must not overwrite stored settings.target_xy."""
        mock_dm = await setup_integration(hass, config_entry)
        # Simulate target_xy having been enabled by user
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"target_xy": True}}

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
            "stuck_target_timeout": 300.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["target_xy"] is True

    async def test_set_settings_persists_target_xy_from_entities(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings with entities.target_xy persists the value to stored settings."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states"):
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
                "stuck_target_timeout": 300.0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings.get("target_xy") is True
        mock_dm.store.async_save.assert_awaited()

    async def test_set_settings_persists_new_entity_keys(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """New entity keys (target_active etc.) are persisted in stored settings."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.store.devices[mac] = {"settings": {}}

        from custom_components.eppgrid.websocket_api import websocket_set_settings

        with patch("custom_components.eppgrid.websocket_api._devices._apply_entity_states"):
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
                "stuck_target_timeout": 300.0,
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

        stored = mock_dm.store.devices[mac]["settings"]
        assert stored["target_active"] is True
        assert stored["zone_target_count"] is True
        mock_dm.store.async_save.assert_awaited()

    async def test_set_settings_preserves_new_entity_keys(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """New entity keys survive a set_settings call that doesn't include entities."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.store.devices[mac] = {
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
            "stuck_target_timeout": 300.0,
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

        stored = mock_dm.store.devices[mac]["settings"]
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
        assert _entity_key_for_object_id("mmwave_presence") == "room_mmwave"

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
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
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
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
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
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
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
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get"),
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
        ):
            mock_entries.return_value = [co2_entry, calibrate_entry]

            result = _get_entity_states(hass, "AA:BB:CC:DD:EE:FF")

            assert "env_co2" in result
            assert "env_co2_calibrate" not in result

    async def test_get_entity_states_zone_partial_disable_reports_on(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone-key partial-disable pattern: any enabled = category on.

        Regression: PR #172 (dbc58479) flipped the OR semantics to AND for
        category keys. async_update_zone_entities INTEGRATION-disables
        unused zone slots (4-7) even under the "on" state, so AND would
        always read off whenever unused slots exist. OR is the original,
        correct behavior — preserved here.
        """
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _get_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        zone0 = MagicMock()
        zone0.unique_id = "AA:BB:CC:DD:EE:FF-sensor-zone_0_presence"
        zone0.disabled_by = None

        zone4 = MagicMock()  # unused slot, INTEGRATION-disabled by async_update_zone_entities
        zone4.unique_id = "AA:BB:CC:DD:EE:FF-sensor-zone_4_presence"
        zone4.disabled_by = RegistryEntryDisabler.INTEGRATION

        with (
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get"),
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
        ):
            mock_entries.return_value = [zone0, zone4]

            result = _get_entity_states(hass, "AA:BB:CC:DD:EE:FF")

        assert result["zone_presence"] is True

    async def test_get_entity_states_category_off_when_all_disabled(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Category reports off only when every matching entry is disabled
        (regardless of the disabler — INTEGRATION or USER).
        """
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _get_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        zone0 = MagicMock()
        zone0.unique_id = "AA:BB:CC:DD:EE:FF-sensor-zone_0_presence"
        zone0.disabled_by = RegistryEntryDisabler.INTEGRATION

        zone1 = MagicMock()
        zone1.unique_id = "AA:BB:CC:DD:EE:FF-sensor-zone_1_presence"
        zone1.disabled_by = RegistryEntryDisabler.INTEGRATION

        with (
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get"),
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
        ):
            mock_entries.return_value = [zone0, zone1]

            result = _get_entity_states(hass, "AA:BB:CC:DD:EE:FF")

        assert result["zone_presence"] is False

    async def test_get_entity_states_target_category_or_semantics(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Target category (target_xy) follows the same any-enabled rule.

        A USER-disabled sibling doesn't flip the toggle off — the user is
        still receiving data from the enabled siblings. _apply_entity_states
        already preserves USER-disabled entries on subsequent toggles, so
        OR semantics is consistent.
        """
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _get_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        target_x = MagicMock()
        target_x.unique_id = "AA:BB:CC:DD:EE:FF-sensor-target_0_x"
        target_x.disabled_by = None

        target_y = MagicMock()
        target_y.unique_id = "AA:BB:CC:DD:EE:FF-sensor-target_0_y"
        target_y.disabled_by = RegistryEntryDisabler.USER

        with (
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get"),
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
        ):
            mock_entries.return_value = [target_x, target_y]

            result = _get_entity_states(hass, "AA:BB:CC:DD:EE:FF")

        assert result["target_xy"] is True


class TestWebSocketEntityEnabled:
    """Tests for eppgrid/set_entity_enabled."""

    @staticmethod
    def _register_device_with_id(mock_dm: MagicMock, device_id: str = "ha-device-1") -> None:
        """Register a managed device whose HA device_id is resolved."""
        register_managed_device(mock_dm)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = device_id

    async def test_set_entity_enabled(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """set_entity_enabled enables entities in the registry."""
        mock_dm = await setup_integration(hass, config_entry)
        self._register_device_with_id(mock_dm)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value
            mock_registry.async_get.return_value = MagicMock(device_id="ha-device-1")

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
        mock_dm = await setup_integration(hass, config_entry)
        self._register_device_with_id(mock_dm)

        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value
            mock_registry.async_get.return_value = MagicMock(device_id="ha-device-1")

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

    async def test_set_entity_enabled_arms_guard_before_registry_write(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Toggling an entity triggers an ESPHome reload via the registry
        write — the entity-update guard must be armed BEFORE the write so
        the reload's reconnect doesn't fire a redundant push."""
        mock_dm = await setup_integration(hass, config_entry)
        self._register_device_with_id(mock_dm)

        order: list[str] = []
        mock_dm.schedule_entity_update_clear = MagicMock(side_effect=lambda *a, **k: order.append("guard"))

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value
            mock_registry.async_get.return_value = MagicMock(device_id="ha-device-1")
            mock_registry.async_update_entity = MagicMock(side_effect=lambda *a, **k: order.append("write"))

            msg = {
                "id": 81,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_presence",
                "enabled": True,
            }
            websocket_set_entity_enabled(hass, MagicMock(), msg)

        assert order == ["guard", "write"]

    async def test_set_entity_enabled_unknown_mac_rejected(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An unknown MAC gets device_not_found, and no registry write happens."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value

            connection = MagicMock()
            msg = {
                "id": 80,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_presence",
                "enabled": True,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_not_called()
            connection.send_result.assert_not_called()
            connection.send_error.assert_called_once()
            assert connection.send_error.call_args[0][1] == "device_not_found"

    async def test_set_entity_enabled_unknown_entity_curated_error(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An entity_id missing from the registry gets a curated error, not KeyError."""
        mock_dm = await setup_integration(hass, config_entry)
        self._register_device_with_id(mock_dm)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value
            mock_registry.async_get.return_value = None

            connection = MagicMock()
            msg = {
                "id": 81,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.does_not_exist",
                "enabled": True,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_not_called()
            connection.send_result.assert_not_called()
            connection.send_error.assert_called_once()
            assert connection.send_error.call_args[0][1] == "entity_not_found"

    async def test_set_entity_enabled_other_device_rejected(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An entity belonging to a different HA device is rejected.

        Without scoping, this command could toggle ANY entity in the
        installation (e.g. disable an alarm panel) from the EPP frontend.
        """
        mock_dm = await setup_integration(hass, config_entry)
        self._register_device_with_id(mock_dm)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value
            mock_registry.async_get.return_value = MagicMock(device_id="some-other-device")

            connection = MagicMock()
            msg = {
                "id": 82,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "switch.someone_elses_alarm",
                "enabled": False,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_not_called()
            connection.send_result.assert_not_called()
            connection.send_error.assert_called_once()
            assert connection.send_error.call_args[0][1] == "entity_not_on_device"

    async def test_set_entity_enabled_unresolved_device_id_rejected(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A known device whose HA device_id isn't resolved yet fails closed."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)  # device_id stays None

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value
            mock_registry.async_get.return_value = MagicMock(device_id="ha-device-1")

            connection = MagicMock()
            msg = {
                "id": 83,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_presence",
                "enabled": True,
            }

            websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_not_called()
            connection.send_result.assert_not_called()
            connection.send_error.assert_called_once()
            assert connection.send_error.call_args[0][1] == "device_not_available"

    async def test_set_entity_enabled_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot toggle entity enabled state."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_entity_enabled

        with patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er:
            mock_registry = mock_er.return_value

            connection = MagicMock()
            connection.user.is_admin = False
            msg = {
                "id": 18,
                "type": "eppgrid/set_entity_enabled",
                "mac": "AA:BB:CC:DD:EE:FF",
                "entity_id": "binary_sensor.epp_zone_1_presence",
                "enabled": True,
            }

            with pytest.raises(Unauthorized):
                websocket_set_entity_enabled(hass, connection, msg)

            mock_registry.async_update_entity.assert_not_called()
            connection.send_result.assert_not_called()


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

    async def test_subscribe_device_failure_records_connection_failed(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A session-open failure is recorded via the manager's
        `set_connection_failed(mac, True)` — the manager owns the
        only-fire-on-transition broadcast semantics (covered in
        test_device_manager.py::TestSetConnectionFailed)."""
        from aioesphomeapi.core import SocketClosedAPIError

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(side_effect=SocketClosedAPIError("EOF received"))

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        msg = {"id": 26, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_device, MagicMock(), msg)

        mock_dm.set_connection_failed.assert_called_once_with("AA:BB:CC:DD:EE:FF", True)

    async def test_subscribe_device_success_clears_connection_failed(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A successful open clears the failure flag via
        `set_connection_failed(mac, False)`, re-arming the manager's
        transition broadcast for the next failure."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        await call_async_handler(
            hass,
            websocket_subscribe_device,
            MagicMock(subscriptions={}),
            {"id": 29, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"},
        )

        mock_dm.set_connection_failed.assert_called_once_with("AA:BB:CC:DD:EE:FF", False)

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
        mock_device_conn.entities = []
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 23, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        connection.send_result.assert_called_once_with(23)
        mock_device_conn.subscribe_states.assert_awaited_once()
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
        mock_device_conn.entities = []
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 25, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_result.assert_called_once_with(25)
        mock_device_conn.subscribe_states.assert_awaited_once()
        assert 25 in connection.subscriptions

    async def test_raw_targets_handles_malformed_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A garbled 'x,y' string from the device must not crash the state
        callback (e.g. firmware bug emits a non-numeric token); skip the
        update silently rather than blow up the subscription."""
        from aioesphomeapi import TextSensorInfo
        from aioesphomeapi import TextSensorState

        mock_dm = await setup_integration(hass, config_entry)
        mock_device_conn = MagicMock()
        mock_device_conn.entities = [
            TextSensorInfo(object_id="raw_target_1", key=1, name="Raw Target 1"),
        ]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 26, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)
        on_state = mock_device_conn.subscribe_states.await_args[0][0]
        connection.send_message.reset_mock()

        # Single-field state — parts[1] would IndexError.
        on_state(TextSensorState(key=1, state="single", missing_state=False))
        # Non-numeric — float() would ValueError.
        on_state(TextSensorState(key=1, state="abc,def", missing_state=False))
        # Both should be silently dropped — no event, no exception.
        connection.send_message.assert_not_called()

    async def test_grid_targets_pushes_env_sensor_updates(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Numeric env-sensor state events must push to the frontend.

        Without this push, env values stay stuck at em-dashes after a
        reconnect: targets and zone-state events piggy-back env values, so
        when there's no target movement and no zone activity the frontend
        never gets the env reading.
        """
        from aioesphomeapi import SensorInfo
        from aioesphomeapi import SensorState

        mock_dm = await setup_integration(hass, config_entry)
        mock_device_conn = MagicMock()
        mock_device_conn.entities = [
            SensorInfo(object_id="temperature", key=10, name="Temperature"),
        ]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 99, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)
        on_state = mock_device_conn.subscribe_states.await_args[0][0]
        connection.send_message.reset_mock()

        on_state(SensorState(key=10, state=22.5, missing_state=False))

        connection.send_message.assert_called()
        # Inspect the most recent message; the env reading must be embedded.
        last_call = connection.send_message.call_args
        # event_message returns a dict; assert temperature reached the payload.
        payload = last_call[0][0]
        assert payload.get("event", {}).get("sensors", {}).get("temperature") == 22.5

    async def test_grid_targets_pushes_binary_sensor_updates(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Binary-sensor state events must push to the frontend too — same
        reason as the env-sensor case above.
        """
        from aioesphomeapi import BinarySensorInfo
        from aioesphomeapi import BinarySensorState

        mock_dm = await setup_integration(hass, config_entry)
        mock_device_conn = MagicMock()
        mock_device_conn.entities = [
            BinarySensorInfo(object_id="occupancy", key=20, name="Occupancy"),
        ]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 100, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)
        on_state = mock_device_conn.subscribe_states.await_args[0][0]
        connection.send_message.reset_mock()

        on_state(BinarySensorState(key=20, state=True, missing_state=False))

        connection.send_message.assert_called()
        payload = connection.send_message.call_args[0][0]
        assert payload.get("event", {}).get("sensors", {}).get("occupancy") is True

    async def test_grid_targets_handles_malformed_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Same guard for the grid-targets subscriber, which parses the same
        firmware-emitted 'x,y[,status]' format but for `Target N Position`."""
        from aioesphomeapi import TextSensorInfo
        from aioesphomeapi import TextSensorState

        mock_dm = await setup_integration(hass, config_entry)
        mock_device_conn = MagicMock()
        mock_device_conn.entities = [
            TextSensorInfo(object_id="target_1_position", key=1, name="Target 1 Position"),
        ]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 27, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)
        on_state = mock_device_conn.subscribe_states.await_args[0][0]
        connection.send_message.reset_mock()

        on_state(TextSensorState(key=1, state="single", missing_state=False))
        on_state(TextSensorState(key=1, state="abc,def,active", missing_state=False))
        connection.send_message.assert_not_called()


class TestSubscribeDeviceList:
    """Tests for eppgrid/subscribe_device_list."""

    async def test_subscribe_sends_initial_list(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_device_list sends the current device list immediately."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_devices.return_value = [{"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}]
        mock_dm.store.show_room_calibration_tutorial = False
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
        assert event_msg["event"]["show_room_calibration_tutorial"] is False
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

        # Simulate a device list change. The manager computes the payload
        # once per change event and passes it to every subscriber — the
        # subscriber must use it as-is, not re-fetch via list_devices().
        mock_dm.list_devices.reset_mock()
        assert captured_cb is not None
        captured_cb([{"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}])

        assert connection.send_message.call_count == 2
        last_msg = connection.send_message.call_args[0][0]
        assert last_msg["event"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"
        mock_dm.list_devices.assert_not_called()

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
    """Tests for eppgrid/update_firmware. The handler is a thin wrapper that
    delegates to `DeviceManager.async_trigger_ota`; URL/variant logic is
    exercised by test_device_manager.py.
    """

    async def test_update_firmware_delegates_to_manager(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Successful OTA trigger awaits manager.async_trigger_ota and sends result."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_trigger_ota = AsyncMock()

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 20, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        mock_dm.async_trigger_ota.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")
        connection.send_result.assert_called_once_with(20)
        connection.send_error.assert_not_called()

    async def test_update_firmware_propagates_home_assistant_error_translation(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """When async_trigger_ota raises HomeAssistantError with translation
        metadata, the websocket reply preserves it via _send_exception."""
        from homeassistant.exceptions import HomeAssistantError

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_trigger_ota = AsyncMock(
            side_effect=HomeAssistantError(
                "Device AA:BB:CC:DD:EE:FF not found",
                translation_domain=DOMAIN,
                translation_key="device_not_found",
            )
        )

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {"id": 21, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once()
        args, kwargs = connection.send_error.call_args
        assert args[0] == 21
        assert args[1] == "update_failed"
        assert kwargs["translation_domain"] == DOMAIN
        assert kwargs["translation_key"] == "device_not_found"

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

    async def test_update_firmware_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot trigger an OTA update."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {"id": 24, "type": "eppgrid/update_firmware", "mac": "AA:BB:CC:DD:EE:FF"}

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_update_firmware, connection, msg)

        connection.send_result.assert_not_called()


class TestNotReadyGuards:
    """Handlers not covered by per-class tests return not_ready when integration not loaded."""

    @pytest.mark.parametrize(
        "handler_name,extra_fields,is_async",
        [
            ("websocket_set_room_layout", {"mac": "AA:BB", "grid_bytes": [], "zone_slots": []}, True),
            ("websocket_list_configurations", {}, False),
            ("websocket_save_configuration", {"name": "t", "configuration": {}}, True),
            ("websocket_delete_configuration", {"name": "t"}, True),
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
                    "stuck_target_timeout": 300.0,
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
        mock_device_conn.entities = [raw0, raw1]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Get the registered _on_state callback
        on_state = mock_device_conn.subscribe_states.await_args[0][0]

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
        mock_device_conn.entities = [raw0]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

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
        mock_device_conn.entities = [raw0]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=100, state=True, missing_state=False)
        on_state(state)

        connection.send_message.assert_not_called()

    async def test_raw_targets_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribe callback removes state subscription."""
        mock_dm = await setup_integration(hass, config_entry)

        mock_device_conn = MagicMock()
        mock_device_conn.entities = []
        mock_device_conn.subscribe_states = AsyncMock()
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
        mock_device_conn.entities = [target0]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 40, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

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
        mock_device_conn.entities = [target0]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 41, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

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
        mock_device_conn.entities = [zone_state_entity]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 42, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

        from aioesphomeapi import TextSensorState

        zone_json = json.dumps(
            {
                "targets": [
                    {"signal": 80, "status": "active"},
                    {"signal": 0, "status": "inactive"},
                ],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "mmwave": True,
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
        assert event["event"]["sensors"]["mmwave"] is True

    async def test_grid_targets_drops_wrong_shape_zone_state_frames(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Valid-JSON-wrong-shape zone-state frames are dropped, not fatal.

        If a TypeError/AttributeError escapes `_on_state`,
        `DeviceConnection._dispatch_state` drops the subscriber permanently
        and the client's grid stream silently freezes. Each malformed frame
        must be swallowed AND a subsequent good frame must still arrive.
        """
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [zone_state_entity]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

        from aioesphomeapi import TextSensorState

        bad_frames = [
            json.dumps(5),  # non-dict root → AttributeError on .get
            json.dumps({"targets": 5}),  # non-iterable targets → TypeError on enumerate
            json.dumps({"targets": [5]}),  # non-dict target entry → AttributeError on .get
            json.dumps({"zones": 5}),  # non-dict zones → AttributeError on .get
            json.dumps({"zones": {"occupancy": 5}}),  # non-iterable occupancy → TypeError
        ]
        for bad in bad_frames:
            # Must not raise — a raise here means the subscriber gets dropped.
            on_state(TextSensorState(key=300, state=bad, missing_state=False))
        connection.send_message.assert_not_called()

        good = json.dumps(
            {
                "targets": [{"signal": 80, "status": "active"}],
                "zones": {"occupancy": [True], "tracking": True},
                "frame_count": 7,
            }
        )
        on_state(TextSensorState(key=300, state=good, missing_state=False))

        connection.send_message.assert_called_once()
        event = connection.send_message.call_args[0][0]
        assert event["event"]["zones"]["frame_count"] == 7
        assert event["event"]["targets"][0]["signal"] == 80

    async def test_grid_targets_on_state_binary_sensor(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """BinarySensorState updates sensor data."""
        mock_dm = await setup_integration(hass, config_entry)

        occupancy = MagicMock()
        occupancy.key = 400
        occupancy.name = "Occupancy"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [occupancy]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 43, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=400, state=True, missing_state=False)
        on_state(state)

        # Binary sensor updates push immediately so the frontend reflects
        # changes that arrive between target / zone-state events (otherwise
        # post-reconnect with quiet targets, sensor state stays stuck).
        connection.send_message.assert_called_once()
        payload = connection.send_message.call_args[0][0]
        assert payload["event"]["sensors"]["occupancy"] is True

    async def test_grid_targets_on_state_numeric_sensor(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """SensorState updates numeric sensor data."""
        mock_dm = await setup_integration(hass, config_entry)

        temp = MagicMock()
        temp.key = 500
        temp.name = "Temperature"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [temp]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

        from aioesphomeapi import SensorState

        state = SensorState(key=500, state=22.5, missing_state=False)
        on_state(state)

        # First message: real value reaches the frontend.
        assert connection.send_message.call_count == 1
        first = connection.send_message.call_args_list[0][0][0]
        assert first["event"]["sensors"]["temperature"] == 22.5

        # NaN is converted to None and pushed — the frontend uses None to
        # render an em-dash; without the push it would keep showing the
        # last real value, which is misleading.
        nan_state = SensorState(key=500, state=float("nan"), missing_state=False)
        on_state(nan_state)
        assert connection.send_message.call_count == 2
        second = connection.send_message.call_args_list[1][0][0]
        assert second["event"]["sensors"]["temperature"] is None

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
        mock_device_conn.entities = [co2_entity, target0]
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 50, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        on_state = mock_device_conn.subscribe_states.await_args[0][0]

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
        mock_device_conn.entities = []
        mock_device_conn.subscribe_states = AsyncMock()
        mock_device_conn.unsubscribe_states = MagicMock()
        mock_dm.get_session = MagicMock(return_value=mock_device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 45, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.subscriptions[45]()
        mock_device_conn.unsubscribe_states.assert_called_once()

    async def test_subscribe_device_unsub_releases_session(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """subscribe_device unsub must RELEASE its session reference, not
        force-close: another client subscribed to the same device shares the
        session, and an unconditional close would tear its streams down."""
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

        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", mock_conn)
        mock_dm.schedule_close_session.assert_not_called()

    async def test_subscribe_device_unsub_releases_exactly_once(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A double-invoked unsub callback must release only one reference —
        a second decrement would steal another subscriber's reference and
        close the session under it."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_conn = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=mock_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 47, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        connection.subscriptions[47]()
        connection.subscriptions[47]()
        await hass.async_block_till_done()

        assert mock_dm.release_session.call_count == 1


class TestWebSocketDistanceOverride:
    """Tests for eppgrid/set_distance_override."""

    async def test_set_distance_override_pushes_without_saving(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_distance_override pushes merged override to device without persisting."""
        mock_dm = await setup_integration(hass, config_entry)

        # Set up stored settings with threshold/timeout values
        mock_dm.store.devices = {
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
        mock_dm.store.async_save.assert_not_awaited()

        connection.send_result.assert_called_once_with(99)

    async def test_set_distance_override_no_session(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """When no active session exists, set_distance_override must return an
        error with translation_key=`no_active_session`. Silently sending
        `success` was misleading: the override never reached the device, so
        the slider in the UI lied about taking effect."""
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

        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once_with(
            100,
            "no_session",
            "No active session — call subscribe_device first",
            translation_domain=DOMAIN,
            translation_key="no_active_session",
        )
        mock_dm.store.async_save.assert_not_awaited()

    async def test_set_distance_override_requires_admin(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Non-admin users cannot push distance overrides."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_set_distance_override

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 101,
            "type": "eppgrid/set_distance_override",
            "mac": "AA:BB:CC:DD:EE:FF",
            "target_max_distance": 5.0,
            "static_min_distance": 0.5,
            "static_max_distance": 10.0,
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_set_distance_override, connection, msg)

        connection.send_result.assert_not_called()


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
                        {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
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
                    "stuck_target_timeout": 300.0,
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

    async def test_firmware_behind_error_carries_translation_metadata(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Firmware version errors must include translation_domain + translation_key.

        The frontend renders the error using the localized strings.json entry — a
        bare English string would not be translatable.
        """
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
            "id": 20,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        kwargs = connection.send_error.call_args.kwargs
        assert kwargs.get("translation_domain") == DOMAIN
        assert kwargs.get("translation_key") == "firmware_behind"

    async def test_firmware_unavailable_error_uses_device_not_available_key(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """When firmware version cannot be read, WS error must point at an
        existing translation key. `_check_firmware_version` returns
        `"unavailable"` in that case; the helper must NOT pass that through as a
        translation_key (it does not exist in strings.json) — instead map it to
        the existing `device_not_available` exception.
        """
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_firmware_version.return_value = None  # firmware version unknown

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 22,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        kwargs = connection.send_error.call_args.kwargs
        # Wire-level error code preserves the proto_err for frontend dispatch
        assert args[1] == "unavailable"
        # But the translation_key must reference an existing exceptions entry
        assert kwargs.get("translation_domain") == DOMAIN
        assert kwargs.get("translation_key") == "device_not_available"

    async def test_firmware_unparseable_blocks_command(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An unparseable firmware version must short-circuit admin commands
        the same way an unreadable one does. Otherwise the websocket would
        persist HA storage AND respond OK while ``_push_config_to_device``
        silently skips the actual push (its gate also rejects unparseable),
        leaving HA state diverged from device state.
        """
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(
                mac="AA:BB:CC:DD:EE:FF",
                name="EPP",
                host="192.168.1.50",
            )
        }
        mock_dm.read_firmware_version.return_value = "not-a-version"

        from custom_components.eppgrid.websocket_api import websocket_set_setup

        connection = MagicMock()
        msg = {
            "id": 23,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        # Command must short-circuit with an error, not silently succeed.
        connection.send_error.assert_called_once()
        connection.send_result.assert_not_called()
        # Routes through the existing device_not_available translation key —
        # adding a dedicated "firmware_unparseable" key would require strings
        # work that's out of scope for what is realistically a never-shipped
        # version string.
        kwargs = connection.send_error.call_args.kwargs
        assert kwargs.get("translation_domain") == DOMAIN
        assert kwargs.get("translation_key") == "device_not_available"

    async def test_firmware_ahead_error_carries_translation_metadata(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Same as firmware_behind but for firmware_ahead."""
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
            "id": 21,
            "type": "eppgrid/set_setup",
            "mac": "AA:BB:CC:DD:EE:FF",
            "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            "room_width": 3000.0,
            "room_depth": 4000.0,
        }

        await call_async_handler(hass, websocket_set_setup, connection, msg)

        connection.send_error.assert_called_once()
        kwargs = connection.send_error.call_args.kwargs
        assert kwargs.get("translation_domain") == DOMAIN
        assert kwargs.get("translation_key") == "firmware_ahead"


class TestAdminGateAllCommands:
    """Every registered websocket command must require admin.

    These tests exercise the decorator stack: a non-admin user must get
    Unauthorized, not a handler response.
    """

    @pytest.mark.parametrize(
        "handler_name,msg_payload,is_callback",
        [
            (
                "websocket_list_devices",
                {"id": 1, "type": "eppgrid/list_devices"},
                True,
            ),
            (
                "websocket_subscribe_device_list",
                {"id": 2, "type": "eppgrid/subscribe_device_list"},
                True,
            ),
            (
                "websocket_get_config",
                {"id": 3, "type": "eppgrid/get_config", "mac": "AA:BB:CC:DD:EE:FF"},
                True,
            ),
            (
                "websocket_list_configurations",
                {"id": 4, "type": "eppgrid/list_configurations"},
                True,
            ),
            (
                "websocket_subscribe_device",
                {"id": 5, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"},
                False,
            ),
            (
                "websocket_subscribe_raw_targets",
                {"id": 6, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"},
                False,
            ),
            (
                "websocket_subscribe_grid_targets",
                {"id": 7, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"},
                False,
            ),
            (
                "websocket_dismiss_target",
                {
                    "id": 8,
                    "type": "eppgrid/dismiss_target",
                    "mac": "AA:BB:CC:DD:EE:FF",
                    "target_index": 0,
                    "cell_index": 0,
                },
                False,
            ),
            (
                "websocket_subscribe_ota_progress",
                {"id": 9, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"},
                False,
            ),
            (
                "websocket_list_flashable_devices",
                {"id": 10, "type": "eppgrid/list_flashable_devices"},
                False,
            ),
            (
                "websocket_subscribe_flashable_devices",
                {"id": 11, "type": "eppgrid/subscribe_flashable_devices"},
                False,
            ),
        ],
    )
    async def test_handler_requires_admin(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
        handler_name: str,
        msg_payload: dict,
        is_callback: bool,
    ) -> None:
        """Non-admin users must receive Unauthorized for every admin-gated command."""
        import importlib

        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)
        ws_mod = importlib.import_module("custom_components.eppgrid.websocket_api")
        handler = getattr(ws_mod, handler_name)
        connection = MagicMock()
        connection.user.is_admin = False
        with pytest.raises(Unauthorized):
            if is_callback:
                handler(hass, connection, msg_payload)
            else:
                await call_async_handler(hass, handler, connection, msg_payload)
        connection.send_result.assert_not_called()

    def test_all_registered_commands_are_admin_gated(self) -> None:
        """Every command registered in async_register_websocket_commands must have
        @websocket_api.require_admin in its decorator stack.

        This is a meta-test: it walks the __wrapped__ chain on each handler and
        checks __code__.co_name for "with_admin" (the inner function that
        require_admin creates). @wraps copies __name__/__qualname__ so those
        are not reliable; co_name reflects the actual source name.
        """
        import ast
        import importlib
        import types

        ws_mod = importlib.import_module("custom_components.eppgrid.websocket_api")

        # Parse the module's own source file to extract all handler names passed
        # to async_register_command, guaranteeing we parse the imported module.
        with open(ws_mod.__file__) as fh:
            init_src = fh.read()
        tree = ast.parse(init_src)
        registered: list[str] = []
        for node in ast.walk(tree):
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute)
                and node.func.attr == "async_register_command"
                and len(node.args) == 2
            ):
                arg = node.args[1]
                if isinstance(arg, ast.Name):
                    registered.append(arg.id)

        assert len(registered) >= 22, "AST scan found fewer registrations than expected — update the scan"

        unresolvable: list[str] = []
        ungated: list[str] = []
        for name in registered:
            fn = getattr(ws_mod, name, None)
            if fn is None:
                unresolvable.append(name)
                continue
            # Walk the __wrapped__ chain. @wraps copies __name__ but preserves
            # __code__.co_name which reflects the actual source name.
            found_admin = False
            cur = fn
            while cur is not None:
                if isinstance(cur, types.FunctionType) and cur.__code__.co_name == "with_admin":
                    found_admin = True
                    break
                cur = getattr(cur, "__wrapped__", None)
            if not found_admin:
                ungated.append(name)

        assert unresolvable == [], f"AST scan found names not resolvable on the module: {unresolvable}"
        assert ungated == [], f"These commands are not admin-gated: {ungated}"


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
        """dismiss_target uses the standard `device_not_found` error for an
        unknown MAC (via `_require_known_device`), not a hand-rolled code."""
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
        assert args[1] == "device_not_found"

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


class TestRequireManagerDecorator:
    """Tests for the _require_manager decorator that injects manager + guards on not_ready/firmware."""

    async def test_sync_handler_passes_manager_when_loaded(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Sync handler is invoked with manager as 4th arg when integration is loaded."""
        mock_dm = await setup_integration(hass, config_entry)

        from homeassistant.core import callback

        from custom_components.eppgrid.websocket_api import _require_manager

        captured: dict = {}

        @_require_manager
        @callback
        def handler(hass_, conn_, msg_, manager_):
            captured["manager"] = manager_
            captured["msg_id"] = msg_["id"]

        connection = MagicMock()
        msg = {"id": 1}
        handler(hass, connection, msg)

        assert captured["manager"] is mock_dm
        assert captured["msg_id"] == 1
        connection.send_error.assert_not_called()

    async def test_sync_handler_returns_not_ready_when_unloaded(self, hass: HomeAssistant) -> None:
        """Sync handler short-circuits with not_ready error when manager is None."""
        from homeassistant.core import callback

        from custom_components.eppgrid.websocket_api import _require_manager

        called = False

        @_require_manager
        @callback
        def handler(hass_, conn_, msg_, manager_):
            nonlocal called
            called = True

        connection = MagicMock()
        handler(hass, connection, {"id": 5})

        assert called is False
        connection.send_error.assert_called_once_with(
            5,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )

    async def test_async_handler_passes_manager_when_loaded(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Async handler is awaited with manager as 4th arg when integration is loaded."""
        mock_dm = await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import _require_manager

        captured: dict = {}

        @_require_manager
        async def handler(hass_, conn_, msg_, manager_):
            captured["manager"] = manager_

        connection = MagicMock()
        await handler(hass, connection, {"id": 1})

        assert captured["manager"] is mock_dm
        connection.send_error.assert_not_called()

    async def test_async_handler_returns_not_ready_when_unloaded(self, hass: HomeAssistant) -> None:
        """Async handler short-circuits with not_ready error when manager is None."""
        from custom_components.eppgrid.websocket_api import _require_manager

        called = False

        @_require_manager
        async def handler(hass_, conn_, msg_, manager_):
            nonlocal called
            called = True

        connection = MagicMock()
        await handler(hass, connection, {"id": 8})

        assert called is False
        connection.send_error.assert_called_once_with(
            8,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )

    async def test_check_firmware_blocks_when_behind(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """check_firmware=True path sends firmware_behind error and skips handler."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50"),
        }
        mock_dm.read_firmware_version.return_value = "0.1.0"

        from custom_components.eppgrid.websocket_api import _require_manager

        called = False

        @_require_manager(check_firmware=True)
        async def handler(hass_, conn_, msg_, manager_):
            nonlocal called
            called = True

        connection = MagicMock()
        await handler(hass, connection, {"id": 9, "mac": "AA:BB:CC:DD:EE:FF"})

        assert called is False
        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[1] == "firmware_behind"

    async def test_check_firmware_passes_through_when_compatible(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """check_firmware=True path runs handler when firmware version matches."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50"),
        }
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION

        from custom_components.eppgrid.websocket_api import _require_manager

        called = False

        @_require_manager(check_firmware=True)
        async def handler(hass_, conn_, msg_, manager_):
            nonlocal called
            called = True

        connection = MagicMock()
        await handler(hass, connection, {"id": 10, "mac": "AA:BB:CC:DD:EE:FF"})

        assert called is True
        connection.send_error.assert_not_called()

    async def test_check_firmware_propagates_unavailable(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """check_firmware=True path returns 'unavailable' wire code when fw_ver is None."""
        from custom_components.eppgrid.device_manager import ManagedDevice

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:FF": ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50"),
        }
        mock_dm.read_firmware_version.return_value = None

        from custom_components.eppgrid.websocket_api import _require_manager

        @_require_manager(check_firmware=True)
        async def handler(hass_, conn_, msg_, manager_):
            pytest.fail("handler should not be called when firmware is unavailable")

        connection = MagicMock()
        await handler(hass, connection, {"id": 11, "mac": "AA:BB:CC:DD:EE:FF"})

        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        kwargs = connection.send_error.call_args.kwargs
        assert args[1] == "unavailable"
        assert kwargs.get("translation_key") == "device_not_available"


class TestFlashablePayload:
    """Tests for _flashable_payload helper that builds the subscribe/list flashable response."""

    async def test_flashable_payload_shape(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Helper returns devices, firmware base URL, latest firmware version, integration version."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[{"mac": "AA:BB"}])

        from custom_components.eppgrid.const import FIRMWARE_VERSION
        from custom_components.eppgrid.websocket_api._flasher import _flashable_payload

        payload = await _flashable_payload(hass, mock_dm)

        assert payload["devices"] == [{"mac": "AA:BB"}]
        assert payload["firmware_base_url"] == "/api/eppgrid/firmware"
        assert payload["latest_firmware_version"] == f"v{FIRMWARE_VERSION}"
        assert "integration_version" in payload
