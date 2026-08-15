"""Tests for WebSocket API commands."""

from __future__ import annotations

from types import SimpleNamespace
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
        patch("custom_components.eppgrid.async_register_firmware_cache", new_callable=AsyncMock),
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=test",
        ),
        patch("custom_components.eppgrid._register_card_resource", new_callable=AsyncMock),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
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
        # request_pipeline_push is the debounced fire-and-forget wrapper the
        # subscribe/unsubscribe target-stream handlers call instead of
        # scheduling `async_push_pipeline_to_device` — a sync MagicMock so
        # handler tests can assert the push was requested. Debounce semantics
        # are covered by TestRequestPipelinePush.
        mock_dm.request_pipeline_push = MagicMock()
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


def _last_event(connection: MagicMock) -> dict:
    """Return the `event` payload of the last message sent on `connection`."""
    return connection.send_message.call_args[0][0]["event"]


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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
        "assisted_clear_timeout",
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

    def test_furniture_accepts_text_item(self) -> None:
        """A text label item with styling fields validates."""
        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(
            type="text",
            text="Kids' corner",
            fontFamily="georgia",
            fontSize=200,
            color="#112233",
            bold=True,
            italic=False,
            align="center",
            background="#ffffff",
        )
        # Should not raise.
        self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_undersized_font_size(self) -> None:
        """fontSize below the 30mm frontend clamp is rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(type="text", text="x", fontSize=20)
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_oversized_font_size(self) -> None:
        """fontSize above the 3000mm frontend clamp is rejected."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(type="text", text="x", fontSize=4000)
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_bad_font_family(self) -> None:
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(type="text", text="x", fontFamily="wingdings")
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_bad_align(self) -> None:
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(type="text", text="x", align="justify")
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_oversized_text(self) -> None:
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(type="text", text="x" * 513)
        with pytest.raises(vol.Invalid):
            self._validate(websocket_set_room_layout, self._room_layout_payload([item]))

    def test_furniture_rejects_bad_text_color(self) -> None:
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_set_room_layout

        item = self._furniture_item(type="text", text="x", color="red")
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
        assert settings["assisted_clear_enabled"] is True
        assert settings["assisted_clear_timeout"] == 5
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

    async def test_set_settings_stores_assisted_clear_non_defaults(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """set_settings persists non-default assisted-clear values (disabled / 0s)."""
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
            "target_max_distance": 4.0,
            "stuck_target_timeout": 120.0,
            "assisted_clear_enabled": False,
            "assisted_clear_timeout": 0,
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

        settings = mock_dm.store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
        assert settings["assisted_clear_enabled"] is False
        assert settings["assisted_clear_timeout"] == 0
        connection.send_result.assert_called_once_with(12)

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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
                "assisted_clear_enabled": True,
                "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
                "assisted_clear_enabled": True,
                "assisted_clear_timeout": 5,
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
                "assisted_clear_enabled": True,
                "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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
                "assisted_clear_enabled": True,
                "assisted_clear_timeout": 5,
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
                "assisted_clear_enabled": True,
                "assisted_clear_timeout": 5,
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
            "assisted_clear_enabled": True,
            "assisted_clear_timeout": 5,
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

    async def test_apply_entity_states_ignores_layout_managed_zone_keys(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone presence / target_count entities are layout-managed solely by
        async_update_zone_entities, so _apply_entity_states must leave them
        untouched.

        Otherwise zone_presence=True enables ALL zone entities (including
        unused slots), which async_update_zone_entities then re-disables in the
        same save. That transient disabled_by churn fires entity-registry
        events that reload the ESPHome config entry and bounce the device
        connection on every settings save — re-pushing the static-presence
        config and resetting the DFRobot sensor each time.
        """
        from homeassistant.helpers.entity_registry import RegistryEntryDisabler

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import _apply_entity_states

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        mock_dm.devices["AA:BB:CC:DD:EE:FF"].device_id = "dev123"

        # Unused zone slot: integration-disabled presence + target_count entities.
        zone_presence_entry = MagicMock()
        zone_presence_entry.unique_id = "AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence"
        zone_presence_entry.entity_id = "binary_sensor.zone_2_presence"
        zone_presence_entry.disabled_by = RegistryEntryDisabler.INTEGRATION

        zone_count_entry = MagicMock()
        zone_count_entry.unique_id = "AA:BB:CC:DD:EE:FF-sensor-zone_2_target_count"
        zone_count_entry.entity_id = "sensor.zone_2_target_count"
        zone_count_entry.disabled_by = RegistryEntryDisabler.INTEGRATION

        with (
            patch("custom_components.eppgrid.websocket_api._devices.er.async_get") as mock_er,
            patch("custom_components.eppgrid.websocket_api._devices.er.async_entries_for_device") as mock_entries,
        ):
            mock_registry = mock_er.return_value
            mock_entries.return_value = [zone_presence_entry, zone_count_entry]

            _apply_entity_states(
                hass,
                "AA:BB:CC:DD:EE:FF",
                {"zone_presence": True, "zone_target_count": True},
            )

            # Layout-managed zone entities must not be enabled/disabled here.
            mock_registry.async_update_entity.assert_not_called()

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

    async def test_subscribe_device_releases_session_when_connection_closes_during_open(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If the WS connection drops DURING `await async_open_session`, HA's
        `async_handle_close` runs and clears `connection.subscriptions` — so the
        unsub we register after the await will never fire. The handler must
        detect the cleared dict and release the refcount the open took, or the
        ESP32 API slot leaks until a force-close.
        """
        mock_dm = await setup_integration(hass, config_entry)
        mock_conn = MagicMock()

        connection = MagicMock()
        connection.subscriptions = {}

        async def _open(mac: str) -> MagicMock:
            # Simulate HA's async_handle_close landing mid-await: it clears the
            # subscriptions dict and swaps send_message for the closed-error
            # stub (and does NOT cancel this background task).
            connection.subscriptions.clear()
            connection.send_message = connection._connect_closed_error
            return mock_conn

        mock_dm.async_open_session = AsyncMock(side_effect=_open)
        mock_dm.release_session = MagicMock(return_value=None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_device

        msg = {"id": 20, "type": "eppgrid/subscribe_device", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_device, connection, msg)

        # The refcount the open took must be released immediately, since the
        # unsub can never be invoked from the cleared subscriptions dict.
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", mock_conn)

    async def test_subscribe_raw_targets_registers_a_durable_stream(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The calibration wizard's feed is durable too — it must survive a flap (#336).

        The wizard holds this subscription for the whole of room calibration; a drop
        mid-walk used to leave it silently dead.
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {
            "id": 40,
            "type": "eppgrid/subscribe_raw_targets",
            "mac": "AA:BB:CC:DD:EE:FF",
            "availability": True,
        }

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        connection.send_result.assert_called_once_with(40)
        assert mock_dm.async_add_state_stream.await_args.args[0] == "AA:BB:CC:DD:EE:FF"
        assert mock_dm.async_add_state_stream.await_args.kwargs["counter_attr"] == "raw_target_subs"
        mock_dm.get_session.assert_not_called()
        mock_dm.note_target_subscribe.assert_not_called()

        connection.subscriptions[40]()
        unsub_stream.assert_called_once()

    async def test_subscribe_raw_targets_opted_out_silence(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """BWC pin: an opted-out client sees no protocol events on this wire either (#336).

        `test_subscribe_grid_targets_relays_availability_only_when_asked` and
        `..._opted_out_swallows_registration_race_availability` pin this same gate
        only for `subscribe_grid_targets`, even though all three panel streams
        (raw/grid/heatmap) share `_start_panel_stream`. A future per-stream slip
        (e.g. hardcoding `protocol="full"` for one of them) would blank the
        calibration wizard's raw-target feed for every cached pre-upgrade bundle
        with the grid-targets pin alone staying green.
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        # NO "availability" key — the old bundle's message shape.
        msg = {"id": 42, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        kwargs = mock_dm.async_add_state_stream.await_args.kwargs
        kwargs["on_availability"](False)
        kwargs["on_closed"]()

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "event" in c.args[0]
        ]
        assert events == [], f"opted-out client must see no protocol events, got {events}"

    async def test_raw_target_callback_is_rebuilt_from_the_live_connection(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The entity key map is only knowable from the live conn — a re-arm must rebuild it.

        A replacement connection can renumber its entities (an OTA does), so the factory
        is handed the NEW conn and its callback must decode that conn's keys.
        """
        from aioesphomeapi import TextSensorInfo
        from aioesphomeapi import TextSensorState

        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 41, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]

        # A replacement connection whose "Raw Target 1" lives at key 7, not key 1.
        device_conn = MagicMock()
        device_conn.entities = [TextSensorInfo(object_id="raw_target_1", key=7, name="Raw Target 1")]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", device_conn)

        connection.send_message.reset_mock()
        on_state(TextSensorState(key=7, state="1234,5678", missing_state=False))

        event = connection.send_message.call_args.args[0]["event"]
        assert event["targets"][0] == {"raw_x": 1234.0, "raw_y": 5678.0}

    async def test_subscribe_grid_targets_registers_a_durable_stream(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The panel's live stream is durable — the manager owns it and re-arms it (#336)."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_result.assert_called_once_with(30)
        mock_dm.async_add_state_stream.assert_awaited_once()
        assert mock_dm.async_add_state_stream.await_args.args[0] == "AA:BB:CC:DD:EE:FF"
        assert mock_dm.async_add_state_stream.await_args.kwargs["counter_attr"] == "grid_target_subs"

        # The manager owns the session and the subscriber count now — the handler must
        # NOT take a session reference or count the subscriber itself (double-counting
        # would silence the device's pipeline on unsub).
        mock_dm.get_session.assert_not_called()
        mock_dm.note_target_subscribe.assert_not_called()

        assert 30 in connection.subscriptions
        connection.subscriptions[30]()
        unsub_stream.assert_called_once()
        mock_dm.note_target_unsubscribe.assert_not_called()

    async def test_unsubscribe_during_registration_releases_the_stream_not_leaked(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A client can unsubscribe while `async_add_state_stream` is still awaiting —
        in practice `_arm_stream`'s `asyncio.wait_for(conn.async_connect(), timeout=30)`
        against an unresponsive device (the #336 condition: the panel switches device,
        HA suspends the hidden panel, or the user hits Retry, all while the connect is
        still in flight).

        HA's own `handle_unsubscribe_events` only tears a subscription down if it finds
        an entry under this id in `connection.subscriptions` — before this fix, nothing
        was registered there until AFTER the await returned, so an unsubscribe landing in
        that window found nothing to call and ran no teardown at all. The stream (and the
        session ref / subscriber count it pins) then leaked forever once the arm
        completed, since the handler had no idea the client had already left.
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        unsub_stream = MagicMock()

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 36, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            # Simulate HA's handle_unsubscribe_events landing while the arm is
            # still in flight: it looks up (and removes) whatever is registered
            # under this id right now, calling it only if something is there —
            # exactly the "Subscription not found" vs. real-teardown branch.
            pending_unsub = connection.subscriptions.pop(msg["id"], None)
            if pending_unsub is not None:
                pending_unsub()
            return unsub_stream

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_result.assert_called_once_with(36)
        unsub_stream.assert_called_once()
        # The fixed-up cancellation entry must not be left stashed under the id —
        # the client already left, so there is nothing left to tear down later.
        assert 36 not in connection.subscriptions

    async def test_subscribe_grid_targets_opted_in_registration_failure_reports_unavailable(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Registration returning `None` still acks, with one `available: false` — no error.

        `async_add_state_stream` returns `None` when the mac is unknown to the manager
        (`device_manager/__init__.py`'s `if mac not in self.devices: return None`) — NOT
        when the device is merely offline. A genuinely offline-but-known device instead
        gets a live unsub back, with `_ensure_streams` firing `on_availability(False)`
        through it. Either way nothing was armed here, so the opted-in caller still needs
        the one-shot fallback below rather than being left with no signal at all (#336).
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        # mac unknown to the manager: registration is a no-op, not an offline device.
        mock_dm.async_add_state_stream = AsyncMock(return_value=None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {
            "id": 31,
            "type": "eppgrid/subscribe_grid_targets",
            "mac": "AA:BB:CC:DD:EE:FF",
            "availability": True,
        }

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_error.assert_not_called()
        assert connection.send_message.call_args.args[0]["event"] == {"available": False}

    async def test_subscribe_grid_targets_opted_out_registration_failure_is_silent(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An opted-out client whose registration comes back `None` gets ack + silence.

        Same failed registration as the opted-in test above (`async_add_state_stream`
        returning `None` — nothing was registered, e.g. the manager no longer knows
        the mac), but without the `availability` flag: the `{"available": False}`
        fallback is itself a non-frame message, so an opted-out (cached pre-upgrade
        bundle) client must not see it either. It still acks — no error — even though
        nothing is recoverable afterward (#336).
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.async_add_state_stream = AsyncMock(return_value=None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        # NO "availability" key — the old bundle's message shape.
        msg = {"id": 35, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.send_result.assert_called_once_with(35)
        connection.send_error.assert_not_called()
        connection.send_message.assert_not_called()
        assert 35 not in connection.subscriptions

    async def test_subscribe_grid_targets_relays_availability_only_when_asked(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """BWC pin: without the opt-in flag the wire is exactly today's — frames only.

        A browser holding a CACHED pre-upgrade panel bundle keeps running against the
        new backend until the user reloads. Its `onEvent` reduces every message with
        `event.targets || []`, so an `available` or `closed` message would blank its
        live view. It never sets the flag, so it must never see one (#336).
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        # NO "availability" key — the old bundle's message shape.
        msg = {"id": 32, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        kwargs = mock_dm.async_add_state_stream.await_args.kwargs
        kwargs["on_availability"](False)
        kwargs["on_closed"]()

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "event" in c.args[0]
        ]
        assert events == [], f"opted-out client must see no protocol events, got {events}"

    async def test_subscribe_grid_targets_opted_out_swallows_registration_race_availability(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A session-loss racing registration must not leak `available` to an opted-out client.

        `async_add_state_stream` can invoke `on_availability(False)` synchronously
        during registration (a stale `on_stop` from a replaced connection) before the
        arm settles and it returns a live unsub — `start_durable_stream` then replays
        that one-shot `available: False` for `protocol="closed_only"` callers (see
        `overview/subscribe_heatmap`'s own regression test for this exact race). For
        the panel's opted-out path (`protocol="frames_only"`) that would-be replay is
        just as much a non-frame message as the other two, and must be swallowed the
        same way (#336).
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            on_availability(False)  # a stale on_stop lands mid-registration
            return MagicMock()  # ...and the arm pass still succeeds

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        # NO "availability" key — the old bundle's message shape.
        msg = {"id": 34, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "event" in c.args[0]
        ]
        assert events == [], f"opted-out client must see no protocol events, got {events}"

    async def test_subscribe_grid_targets_sends_available_and_closed_when_opted_in(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """With the flag, the panel gets liveness and the manager-teardown signal (#336)."""
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {
            "id": 33,
            "type": "eppgrid/subscribe_grid_targets",
            "mac": "AA:BB:CC:DD:EE:FF",
            "availability": True,
        }
        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        kwargs = mock_dm.async_add_state_stream.await_args.kwargs
        connection.send_message.reset_mock()

        kwargs["on_availability"](False)
        assert connection.send_message.call_args.args[0]["event"] == {"available": False}
        kwargs["on_availability"](True)
        assert connection.send_message.call_args.args[0]["event"] == {"available": True}
        kwargs["on_closed"]()
        assert connection.send_message.call_args.args[0]["event"] == {"available": False, "closed": True}

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 26, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)
        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)
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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 99, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)
        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)
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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 100, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)
        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)
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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 27, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)
        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)
        connection.send_message.reset_mock()

        on_state(TextSensorState(key=1, state="single", missing_state=False))
        on_state(TextSensorState(key=1, state="abc,def,active", missing_state=False))
        connection.send_message.assert_not_called()


class TestSubscribeHeatmap:
    """Tests for eppgrid/subscribe_heatmap."""

    async def test_subscribe_heatmap_registers_a_durable_stream(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The heatmap overlay is durable too (#336).

        It fails the most quietly of the three: it is subscribed with `optional: true`
        on the frontend, so a dead re-subscribe never even latches the connection
        banner — the overlay just goes stale.
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_heatmap

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {
            "id": 50,
            "type": "eppgrid/subscribe_heatmap",
            "mac": "AA:BB:CC:DD:EE:FF",
            "availability": True,
        }

        await call_async_handler(hass, websocket_subscribe_heatmap, connection, msg)

        connection.send_result.assert_called_once_with(50)
        assert mock_dm.async_add_state_stream.await_args.args[0] == "AA:BB:CC:DD:EE:FF"
        assert mock_dm.async_add_state_stream.await_args.kwargs["counter_attr"] == "heatmap_subs"
        assert mock_dm.async_add_state_stream.await_args.kwargs["poll_fn"] is not None
        mock_dm.get_session.assert_not_called()
        mock_dm.note_target_subscribe.assert_not_called()

        connection.subscriptions[50]()
        unsub_stream.assert_called_once()

    async def test_subscribe_heatmap_emits_cells_on_state(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Under the poll transport, the callback `make_on_state` builds is fed the
        polled cells list directly (decoded by `DeviceConnection.async_fetch_heatmap`,
        not filtered from a device state) and emits {"cells": [...]}."""
        captured = {}

        async def fake_add_state_stream(
            mac, *, counter_attr, make_on_state, on_availability, on_closed=None, poll_fn=None
        ):
            captured["poll_fn"] = poll_fn
            captured["cb"] = make_on_state(mac, object())
            return MagicMock()

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_add_state_stream = AsyncMock(side_effect=fake_add_state_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_heatmap

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_heatmap", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_heatmap, connection, msg)
        assert captured["poll_fn"] is not None

        captured["cb"]([1, 2, 3])

        assert _last_event(connection) == {"cells": [1, 2, 3]}

    async def test_subscribe_heatmap_emits_zeroed_cells_on_empty_state(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An empty firmware read clears the overlay: the poll callback emits an
        all-zero cells frame rather than being dropped (which would leave the
        frontend showing stale heat). `async_fetch_heatmap` already maps an empty
        firmware payload to an all-zeros list before it ever reaches this callback."""
        captured = {}

        async def fake_add_state_stream(
            mac, *, counter_attr, make_on_state, on_availability, on_closed=None, poll_fn=None
        ):
            captured["cb"] = make_on_state(mac, object())
            return MagicMock()

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_add_state_stream = AsyncMock(side_effect=fake_add_state_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_heatmap

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_heatmap", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_heatmap, connection, msg)

        captured["cb"]([0] * 400)

        assert _last_event(connection) == {"cells": [0] * 400}

    async def test_subscribe_heatmap_poll_fn_calls_async_fetch_heatmap(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Repurposed from the pre-poll `_ignores_unrelated_state` test: its premise
        (filtering a TextSensorState by entity key) no longer exists under the poll
        transport — there is no device state and no key map here at all. What still
        matters under the poll model is that the stream's `poll_fn` is wired to the
        live connection's `async_fetch_heatmap`, and nothing else."""
        captured = {}

        async def fake_add_state_stream(
            mac, *, counter_attr, make_on_state, on_availability, on_closed=None, poll_fn=None
        ):
            captured["poll_fn"] = poll_fn
            return MagicMock()

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_add_state_stream = AsyncMock(side_effect=fake_add_state_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_heatmap

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_heatmap", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_heatmap, connection, msg)
        assert captured["poll_fn"] is not None

        mock_conn = MagicMock()
        mock_conn.async_fetch_heatmap = AsyncMock(return_value=[7] * 400)

        result = await captured["poll_fn"](mock_conn)

        mock_conn.async_fetch_heatmap.assert_called_once_with()
        assert result == [7] * 400

    async def test_subscribe_heatmap_opted_out_silence(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """BWC pin: an opted-out client sees no protocol events on this wire either (#336).

        Mirrors `TestWebSocketSubscriptions`'s grid-targets opted-out pins, extended to
        `subscribe_heatmap` — it shares `_start_panel_stream` with the other two panel
        streams, but had no dedicated regression test of its own. A future per-stream
        slip (e.g. hardcoding `protocol="full"` for the heatmap path) would
        blank the calibration wizard's heatmap overlay for every cached pre-upgrade
        bundle with a fully green suite otherwise.
        """
        mock_dm = await setup_integration(hass, config_entry)
        register_managed_device(mock_dm)
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_heatmap

        connection = MagicMock()
        connection.subscriptions = {}
        # NO "availability" key — the old bundle's message shape.
        msg = {"id": 51, "type": "eppgrid/subscribe_heatmap", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_heatmap, connection, msg)

        kwargs = mock_dm.async_add_state_stream.await_args.kwargs
        assert kwargs["poll_fn"] is not None
        kwargs["on_availability"](False)
        kwargs["on_closed"]()

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "event" in c.args[0]
        ]
        assert events == [], f"opted-out client must see no protocol events, got {events}"


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

        # Default source: prefer HA-local serving.
        mock_dm.async_trigger_ota.assert_awaited_once_with("AA:BB:CC:DD:EE:FF", prefer_local=True)
        connection.send_result.assert_called_once_with(20)
        connection.send_error.assert_not_called()

    async def test_update_firmware_github_source_forces_direct(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """source='github' forces GitHub-direct (prefer_local=False) — the panel's
        'Download from GitHub' retry after a local-serving fetch failure."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_trigger_ota = AsyncMock()

        from custom_components.eppgrid.websocket_api import websocket_update_firmware

        connection = MagicMock()
        msg = {
            "id": 22,
            "type": "eppgrid/update_firmware",
            "mac": "AA:BB:CC:DD:EE:FF",
            "source": "github",
        }

        await call_async_handler(hass, websocket_update_firmware, connection, msg)

        mock_dm.async_trigger_ota.assert_awaited_once_with("AA:BB:CC:DD:EE:FF", prefer_local=False)
        connection.send_result.assert_called_once_with(22)
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
                    "assisted_clear_enabled": True,
                    "assisted_clear_timeout": 5,
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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Get the registered _on_state callback
        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

        from aioesphomeapi import BinarySensorState

        state = BinarySensorState(key=100, state=True, missing_state=False)
        on_state(state)

        connection.send_message.assert_not_called()

    async def test_raw_targets_unsub(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribe callback tears the durable stream down."""
        mock_dm = await setup_integration(hass, config_entry)

        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_raw_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_raw_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_raw_targets, connection, msg)

        # Call unsubscribe
        connection.subscriptions[33]()
        unsub_stream.assert_called_once()

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 40, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 41, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 42, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
                "ev": ["zo:0", "sc"],
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
        assert event["event"]["zones"]["events"] == ["zo:0", "sc"]

    async def test_grid_targets_zone_state_without_events(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone state JSON without 'ev' key omits 'events' from the emitted payload (BWC)."""
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [zone_state_entity]
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 43, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

        from aioesphomeapi import TextSensorState

        # Old firmware: no 'ev' key present
        zone_json = json.dumps(
            {
                "targets": [{"signal": 60, "status": "active"}],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "frame_count": 10,
                "debug_log": "old firmware",
            }
        )
        state = TextSensorState(key=300, state=zone_json, missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()
        event = connection.send_message.call_args[0][0]
        assert "events" not in event["event"]["zones"]

    async def test_grid_targets_malformed_ev_string_is_dropped(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone state JSON with 'ev' as a bare string (not a list) must not reach the frontend."""
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [zone_state_entity]
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

        from aioesphomeapi import TextSensorState

        # Malformed: 'ev' is a bare string, not a list
        zone_json = json.dumps(
            {
                "targets": [{"signal": 60, "status": "active"}],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "frame_count": 5,
                "ev": "zo:1",
            }
        )
        state = TextSensorState(key=300, state=zone_json, missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()
        event = connection.send_message.call_args[0][0]
        assert "events" not in event["event"]["zones"]

    async def test_grid_targets_malformed_ev_mixed_types_strips_non_strings(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Zone state JSON with mixed-type 'ev' items: non-string items are silently dropped."""
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [zone_state_entity]
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 45, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

        from aioesphomeapi import TextSensorState

        # Malformed: 'ev' contains mixed types — only string items should pass through
        zone_json = json.dumps(
            {
                "targets": [{"signal": 60, "status": "active"}],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "frame_count": 5,
                "ev": ["zo:1", 5, "sc"],
            }
        )
        state = TextSensorState(key=300, state=zone_json, missing_state=False)
        on_state(state)

        connection.send_message.assert_called_once()
        event = connection.send_message.call_args[0][0]
        assert event["event"]["zones"]["events"] == ["zo:1", "sc"]

    async def test_grid_targets_events_not_re_emitted_on_target_position(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Detection-log events emit once per zone-state frame, not on later frames.

        `events` are discrete occurrences (not persistent state) and the
        frontend's events path is intentionally NOT deduped. The zone-state
        branch sets `zones["events"]` but the persistent `zones` accumulator is
        re-sent on every ~5Hz target/sensor emit, so without dropping `events`
        after the zone-state emit the same events would be re-sent (and
        re-rendered) repeatedly until the next zone-state publish.
        """
        import json

        mock_dm = await setup_integration(hass, config_entry)

        zone_state_entity = MagicMock()
        zone_state_entity.key = 300
        zone_state_entity.name = "Zone State"

        target0 = MagicMock()
        target0.key = 200
        target0.name = "Target 1 Position"

        mock_device_conn = MagicMock()
        mock_device_conn.entities = [zone_state_entity, target0]
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 45, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

        from aioesphomeapi import TextSensorState

        # 1Hz zone-state frame carrying a discrete event.
        zone_json = json.dumps(
            {
                "targets": [{"signal": 80, "status": "active"}],
                "zones": {"occupancy": [True, False, False], "tracking": True},
                "frame_count": 1,
                "ev": ["zo:1"],
            }
        )
        on_state(TextSensorState(key=300, state=zone_json, missing_state=False))

        # The zone-state emit carries the event.
        event = connection.send_message.call_args[0][0]
        assert event["event"]["zones"]["events"] == ["zo:1"]

        # A subsequent 5Hz target-position frame must NOT re-send the stale event.
        on_state(TextSensorState(key=200, state="1500.0,2000.0,active", missing_state=False))

        event = connection.send_message.call_args[0][0]
        assert "events" not in event["event"]["zones"]

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 43, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 44, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 50, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        on_state = make_on_state("AA:BB:CC:DD:EE:FF", mock_device_conn)

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
        """Unsubscribe callback tears the durable stream down."""
        mock_dm = await setup_integration(hass, config_entry)

        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_grid_targets

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 45, "type": "eppgrid/subscribe_grid_targets", "mac": "AA:BB:CC:DD:EE:FF"}

        await call_async_handler(hass, websocket_subscribe_grid_targets, connection, msg)

        connection.subscriptions[45]()
        unsub_stream.assert_called_once()

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
                    "assisted_clear_enabled": True,
                    "assisted_clear_timeout": 5,
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

    # Commands that are intentionally NOT admin-gated — display data (or, for
    # clear_heatmap, a single display-data reset) meant for shared (non-admin)
    # dashboards. Add new non-admin commands here along with a comment
    # explaining why they're exempt.
    _NON_ADMIN_COMMANDS: frozenset[str] = frozenset(
        {
            # overview card picker — display-only, no config mutation
            "websocket_overview_list_devices",
            # overview card live stream — read-only, non-admin shared dashboard
            "websocket_overview_subscribe",
            # card heatmap stream — read-only, non-admin shared dashboard
            "websocket_overview_subscribe_heatmap",
            # frontend bundle-version check — read-only content hashes so an open
            # panel or (non-admin) dashboard card can self-reload on a stale bundle
            "websocket_frontend_version",
            # overview card heatmap-clear action — resets display data (the
            # on-device heatmap), never device config; card-facing, shared
            # dashboards need it to work for non-admin viewers too
            "websocket_clear_heatmap",
        }
    )

    def test_all_registered_commands_are_admin_gated(self) -> None:
        """Every command registered in async_register_websocket_commands must have
        @websocket_api.require_admin in its decorator stack, unless explicitly listed
        in _NON_ADMIN_COMMANDS (read-only commands for shared dashboards).

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
            if name in self._NON_ADMIN_COMMANDS:
                continue
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


class TestConfigureDevice:
    """Tests for eppgrid/configure_device."""

    async def _make_device(self, hass):
        from homeassistant.helpers import device_registry as dr

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        dev_reg = dr.async_get(hass)
        return dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="everything-presence-pro-aabbcc",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

    async def test_configure_device_sets_name_and_area(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from homeassistant.helpers import area_registry as ar
        from homeassistant.helpers import device_registry as dr

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        area = ar.async_get(hass).async_create("Bedroom")
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="192.168.1.50", device_id=device.id)
        mock_dm.store.devices = {}

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/configure_device", "mac": mac, "name": "Bedroom Sensor", "area_id": area.id}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        updated = dr.async_get(hass).async_get(device.id)
        assert updated.name_by_user == "Bedroom Sensor"
        assert updated.area_id == area.id
        mock_dm.fire_device_list_changed.assert_called()
        connection.send_result.assert_called_once_with(1)

    async def test_configure_device_no_name_or_area_still_fires_event(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from homeassistant.helpers import device_registry as dr

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="192.168.1.50", device_id=device.id)
        mock_dm.store.devices = {}

        connection = MagicMock()
        msg = {"id": 2, "type": "eppgrid/configure_device", "mac": mac}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        updated = dr.async_get(hass).async_get(device.id)
        assert updated.name_by_user is None
        assert updated.area_id is None
        mock_dm.fire_device_list_changed.assert_called()
        connection.send_result.assert_called_once_with(2)

    async def test_configure_device_unknown_mac_errors(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {}

        connection = MagicMock()
        msg = {"id": 3, "type": "eppgrid/configure_device", "mac": "11:22:33:44:55:66", "name": "x"}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        connection.send_error.assert_called_once()
        connection.send_result.assert_not_called()

    async def _add_entity(self, hass, device_id, domain, unique_id, object_id, *, disabled=False):
        from homeassistant.helpers import entity_registry as er

        ent_reg = er.async_get(hass)
        entry = ent_reg.async_get_or_create(
            domain,
            "esphome",
            unique_id,
            suggested_object_id=object_id,
            device_id=device_id,
            disabled_by=er.RegistryEntryDisabler.USER if disabled else None,
        )
        return entry.entity_id

    async def test_configure_device_regenerates_entity_ids(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="h", device_id=device.id)
        mock_dm.store.devices = {}
        temp = await self._add_entity(
            hass, device.id, "sensor", "uid-temp", "everything_presence_pro_aabbcc_temperature"
        )
        await self._add_entity(hass, device.id, "binary_sensor", "uid-occ", "everything_presence_pro_aabbcc_occupancy")
        await self._add_entity(
            hass, device.id, "sensor", "uid-dis", "everything_presence_pro_aabbcc_illuminance", disabled=True
        )

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/configure_device", "mac": mac, "name": "Bedroom", "recreate_entity_ids": True}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        from homeassistant.helpers import entity_registry as er

        ent_reg = er.async_get(hass)
        assert ent_reg.async_get(temp) is None
        assert ent_reg.async_get("sensor.bedroom_temperature") is not None
        assert ent_reg.async_get("binary_sensor.bedroom_occupancy") is not None
        # Disabled entities are renamed too.
        assert ent_reg.async_get("sensor.bedroom_illuminance") is not None

    async def test_configure_device_leaves_customized_entity_ids(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from homeassistant.helpers import entity_registry as er

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="h", device_id=device.id)
        mock_dm.store.devices = {}
        custom = await self._add_entity(hass, device.id, "sensor", "uid-c", "my_custom_thing")

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/configure_device", "mac": mac, "name": "Bedroom"}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        # Non-matching (user-customized) id is left untouched.
        assert er.async_get(hass).async_get(custom) is not None

    async def test_configure_device_dedupes_entity_id_collisions(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from homeassistant.helpers import entity_registry as er

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="h", device_id=device.id)
        mock_dm.store.devices = {}
        # Pre-existing entity that will collide with the regenerated id.
        ent_reg = er.async_get(hass)
        ent_reg.async_get_or_create("sensor", "other", "uid-x", suggested_object_id="bedroom_temperature")
        await self._add_entity(hass, device.id, "sensor", "uid-temp", "everything_presence_pro_aabbcc_temperature")

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/configure_device", "mac": mac, "name": "Bedroom", "recreate_entity_ids": True}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        assert ent_reg.async_get("sensor.bedroom_temperature") is not None  # the pre-existing one
        assert ent_reg.async_get("sensor.bedroom_temperature_2") is not None  # the regenerated one

    async def test_configure_device_skips_regen_when_flag_absent(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from homeassistant.helpers import device_registry as dr
        from homeassistant.helpers import entity_registry as er

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        dr.async_get(hass).async_update_device(device.id, name_by_user="Old Name")
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="h", device_id=device.id)
        mock_dm.store.devices = {}
        kept = await self._add_entity(
            hass, device.id, "sensor", "uid-temp", "everything_presence_pro_aabbcc_temperature"
        )

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/configure_device", "mac": mac, "name": "Bedroom"}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        # Already-named device: name updated, but entity ids are NOT rewritten.
        assert er.async_get(hass).async_get(kept) is not None
        assert dr.async_get(hass).async_get(device.id).name_by_user == "Bedroom"

    async def test_configure_device_regenerates_entity_ids_only_when_requested(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Entity-id regen only happens when recreate_entity_ids=True is sent."""
        from homeassistant.helpers import entity_registry as er

        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="h", device_id=device.id)
        mock_dm.store.devices = {}
        temp = await self._add_entity(
            hass, device.id, "sensor", "uid-temp", "everything_presence_pro_aabbcc_temperature"
        )

        connection = MagicMock()

        # With recreate_entity_ids=True: entity ids are re-slugged from "living_room".
        msg = {
            "id": 1,
            "type": "eppgrid/configure_device",
            "mac": mac,
            "name": "Living Room",
            "recreate_entity_ids": True,
        }
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        ent_reg = er.async_get(hass)
        assert ent_reg.async_get(temp) is None
        assert ent_reg.async_get("sensor.living_room_temperature") is not None

        # Now set up a second fresh device to test recreate_entity_ids=False.
        from homeassistant.helpers import device_registry as dr

        esphome_entry2 = MockConfigEntry(domain="esphome", data={"host": "192.168.1.51"}, title="EPP2")
        esphome_entry2.add_to_hass(hass)
        device2 = dr.async_get(hass).async_get_or_create(
            config_entry_id=esphome_entry2.entry_id,
            connections={("mac", "bb:cc:dd:ee:ff:00")},
            name="everything-presence-pro-bbccdd",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        mac2 = "BB:CC:DD:EE:FF:00"
        mock_dm.devices[mac2] = ManagedDevice(mac=mac2, name="x", host="h2", device_id=device2.id)
        temp2 = await self._add_entity(
            hass, device2.id, "sensor", "uid-temp2", "everything_presence_pro_bbccdd_temperature"
        )

        # With recreate_entity_ids=False (default): entity ids are unchanged.
        msg2 = {
            "id": 2,
            "type": "eppgrid/configure_device",
            "mac": mac2,
            "name": "Den",
            "recreate_entity_ids": False,
        }
        await call_async_handler(hass, websocket_configure_device, connection, msg2)

        assert ent_reg.async_get(temp2) is not None
        assert ent_reg.async_get("sensor.den_temperature") is None

    async def test_configure_device_does_not_persist_onboarded(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """configure_device must NOT write an 'onboarded' key into the store."""
        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_configure_device

        mock_dm = await setup_integration(hass, config_entry)
        device = await self._make_device(hass)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="x", host="h", device_id=device.id)
        mock_dm.store.devices = {}

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/configure_device", "mac": mac, "name": "X"}
        await call_async_handler(hass, websocket_configure_device, connection, msg)

        assert "onboarded" not in mock_dm.store.devices.get(mac, {})
        mock_dm.store.async_save.assert_not_awaited()


class TestWebSocketFrontendVersion:
    """Tests for eppgrid/frontend_version (panel + card self-reload check)."""

    async def test_returns_stored_bundle_hashes(self, hass: HomeAssistant) -> None:
        """Returns both the panel and the card bundle hashes stashed in hass.data.
        The card is a separate bundle (own content hash), so it needs its own value."""
        from custom_components.eppgrid.const import CARD_BUNDLE_HASH_KEY
        from custom_components.eppgrid.const import CURRENT_BUNDLE_HASH_KEY
        from custom_components.eppgrid.websocket_api import websocket_frontend_version

        hass.data[CURRENT_BUNDLE_HASH_KEY] = "abcd1234"
        hass.data[CARD_BUNDLE_HASH_KEY] = "card9999"
        connection = MagicMock()
        msg = {"id": 7, "type": "eppgrid/frontend_version"}

        websocket_frontend_version(hass, connection, msg)

        connection.send_result.assert_called_once_with(7, {"hash": "abcd1234", "card_hash": "card9999"})

    async def test_returns_none_hash_when_unset(self, hass: HomeAssistant) -> None:
        """Returns null hashes (not an error) when no hash has been stored yet."""
        from custom_components.eppgrid.websocket_api import websocket_frontend_version

        connection = MagicMock()
        msg = {"id": 8, "type": "eppgrid/frontend_version"}

        websocket_frontend_version(hass, connection, msg)

        connection.send_result.assert_called_once_with(8, {"hash": None, "card_hash": None})

    async def test_allows_non_admin(self, hass: HomeAssistant) -> None:
        """Non-admin callers succeed: the dashboard card renders for non-admin viewers
        and must detect a stale card bundle too. The payload (content hashes) is
        non-sensitive, so unlike the admin-only panel commands this one is not gated."""
        from custom_components.eppgrid.const import CARD_BUNDLE_HASH_KEY
        from custom_components.eppgrid.websocket_api import websocket_frontend_version

        hass.data[CARD_BUNDLE_HASH_KEY] = "card9999"
        connection = MagicMock()
        connection.user.is_admin = False
        msg = {"id": 9, "type": "eppgrid/frontend_version"}

        websocket_frontend_version(hass, connection, msg)

        connection.send_result.assert_called_once()
        assert connection.send_result.call_args.args[1]["card_hash"] == "card9999"


class TestOverviewListDevices:
    async def test_lists_devices_with_registry_id(self, hass, config_entry):
        """Returns device_id/name for devices that have a registry device_id; non-admin."""
        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_overview_list_devices

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:01": ManagedDevice(mac="AA:BB:CC:DD:EE:01", name="Living Room"),
            "AA:BB:CC:DD:EE:02": ManagedDevice(mac="AA:BB:CC:DD:EE:02", name="Bedroom"),
        }
        mock_dm.devices["AA:BB:CC:DD:EE:01"].device_id = "dev1"
        # second device has no registry id → omitted

        connection = MagicMock()
        msg = {"id": 7, "type": "eppgrid/overview/list_devices"}
        websocket_overview_list_devices(hass, connection, msg)

        connection.send_result.assert_called_once()
        sent = connection.send_result.call_args.args
        assert sent[0] == 7
        assert sent[1] == [
            {
                "device_id": "dev1",
                "name": "Living Room",
                "room_width": 0,
                "room_depth": 0,
            }
        ]

    async def test_devices_sorted_by_name_case_insensitive(self, hass, config_entry):
        """Devices are returned sorted by name (case-insensitive), device_id as tiebreak."""
        from custom_components.eppgrid.device_manager import ManagedDevice
        from custom_components.eppgrid.websocket_api import websocket_overview_list_devices

        mock_dm = await setup_integration(hass, config_entry)
        # Insert Zebra first, Alpha second — insertion order is wrong order
        mock_dm.devices = {
            "AA:BB:CC:DD:EE:01": ManagedDevice(mac="AA:BB:CC:DD:EE:01", name="Zebra Room"),
            "AA:BB:CC:DD:EE:02": ManagedDevice(mac="AA:BB:CC:DD:EE:02", name="Alpha Room"),
        }
        mock_dm.devices["AA:BB:CC:DD:EE:01"].device_id = "dev-zebra"
        mock_dm.devices["AA:BB:CC:DD:EE:02"].device_id = "dev-alpha"

        connection = MagicMock()
        msg = {"id": 9, "type": "eppgrid/overview/list_devices"}
        websocket_overview_list_devices(hass, connection, msg)

        connection.send_result.assert_called_once()
        sent = connection.send_result.call_args.args
        assert sent[0] == 9
        assert sent[1] == [
            {
                "device_id": "dev-alpha",
                "name": "Alpha Room",
                "room_width": 0,
                "room_depth": 0,
            },
            {
                "device_id": "dev-zebra",
                "name": "Zebra Room",
                "room_width": 0,
                "room_depth": 0,
            },
        ]

    async def test_not_loaded_when_manager_absent(self, hass):
        """Short-circuits with not_ready when the integration is unloaded."""
        from custom_components.eppgrid.websocket_api import websocket_overview_list_devices

        connection = MagicMock()
        msg = {"id": 8, "type": "eppgrid/overview/list_devices"}
        websocket_overview_list_devices(hass, connection, msg)

        connection.send_error.assert_called_once()
        assert connection.send_error.call_args.args[1] == "not_ready"


class TestOverviewListDevicesRoomDims:
    """eppgrid/overview/list_devices includes calibration room dimensions."""

    async def test_includes_room_dimensions(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": SimpleNamespace(device_id="d1", name="Living Room")}
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:FF": {"calibration": {"room_width": 4200, "room_depth": 3000}}}

        from custom_components.eppgrid.websocket_api._overview import websocket_overview_list_devices

        connection = MagicMock()
        msg = {"id": 7, "type": "eppgrid/overview/list_devices"}
        websocket_overview_list_devices(hass, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0][1]
        assert result == [
            {
                "device_id": "d1",
                "name": "Living Room",
                "room_width": 4200,
                "room_depth": 3000,
            }
        ]

    async def test_uncalibrated_device_reports_zero_dims(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.devices = {"AA:BB:CC:DD:EE:FF": SimpleNamespace(device_id="d1", name="Bedroom")}
        mock_dm.store.devices = {}  # no stored calibration

        from custom_components.eppgrid.websocket_api._overview import websocket_overview_list_devices

        connection = MagicMock()
        msg = {"id": 8, "type": "eppgrid/overview/list_devices"}
        websocket_overview_list_devices(hass, connection, msg)

        result = connection.send_result.call_args[0][1]
        assert result[0]["room_width"] == 0
        assert result[0]["room_depth"] == 0


class TestOverviewSubscribe:
    async def test_unknown_device_id(self, hass, config_entry):
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=None)

        connection = MagicMock()
        msg = {"id": 11, "type": "eppgrid/overview/subscribe", "device_id": "ghost"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        connection.send_error.assert_called_once()
        assert connection.send_error.call_args.args[1] == "device_not_found"

    async def test_sends_snapshot_then_registers_a_durable_stream(self, hass, config_entry):
        """Acks, sends the layout snapshot, and hands the stream to the manager."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {"calibration": {"room_width": 3000}}}
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 12, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        connection.send_result.assert_called_once_with(12)
        snapshot_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and c.args[0].get("event", {}).get("snapshot") is not None
        ]
        assert snapshot_events, "expected a snapshot event"

        mock_dm.async_add_state_stream.assert_awaited_once()
        kwargs = mock_dm.async_add_state_stream.await_args.kwargs
        assert mock_dm.async_add_state_stream.await_args.args[0] == "AA:BB:CC:DD:EE:01"
        assert kwargs["counter_attr"] == "grid_target_subs"

        # Unsubscribing tears the durable stream down (the manager releases the
        # session and the subscriber count itself).
        assert 12 in connection.subscriptions
        connection.subscriptions[12]()
        unsub_stream.assert_called_once()

    async def test_handler_does_not_own_the_session_lifecycle(self, hass, config_entry):
        """The stream outlives the connection, so the handler must not hold a session ref.

        Regression guard for #334: opening/releasing a session or moving the
        subscriber counts here would re-bind the stream to one disposable
        `DeviceConnection` — the manager owns all of it now.
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mac = "AA:BB:CC:DD:EE:01"
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=mac)
        mock_dm.store.devices = {mac: {}}
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 17, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)
        connection.subscriptions[17]()

        mock_dm.async_open_session.assert_not_awaited()
        mock_dm.release_session.assert_not_called()
        mock_dm.note_target_subscribe.assert_not_called()
        mock_dm.note_target_unsubscribe.assert_not_called()
        mock_dm.request_pipeline_push.assert_not_called()

    async def test_availability_callback_emits_available_events(self, hass, config_entry):
        """The manager's arm/disarm notifications become `available` events — #334."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 12, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        on_availability = mock_dm.async_add_state_stream.await_args.kwargs["on_availability"]
        on_availability(False)
        on_availability(True)

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert events == [{"available": False}, {"available": True}]

    async def test_closed_callback_tells_the_card_to_resubscribe(self, hass, config_entry):
        """A config-entry reload drops the stream the card is still subscribed to.

        The card cannot tell that apart from a device flap (both look like
        `available:false`), so the manager's teardown puts `closed: true` on the wire
        alongside it — Task 10's reducer re-subscribes on that. `available:false` rides
        along so an OLD bundle, whose reducer ignores the extra key, still shows its
        offline banner exactly as it does today (#334).
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 18, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        connection.send_message.reset_mock()
        mock_dm.async_add_state_stream.await_args.kwargs["on_closed"]()

        connection.send_message.assert_called_once()
        assert connection.send_message.call_args.args[0]["event"] == {"available": False, "closed": True}

    async def test_make_on_state_builds_the_grid_target_callback(self, hass, config_entry):
        """The factory handed to the manager builds a callback bound to the
        connection it is given — the manager rebuilds it after a flap, so entity
        keys are re-read from the REPLACEMENT connection.
        """
        from aioesphomeapi import BinarySensorInfo
        from aioesphomeapi import BinarySensorState

        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mac = "AA:BB:CC:DD:EE:01"
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=mac)
        mock_dm.store.devices = {mac: {}}
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 18, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        make_on_state = mock_dm.async_add_state_stream.await_args.kwargs["make_on_state"]
        device_conn = MagicMock()
        device_conn.entities = [BinarySensorInfo(object_id="occupancy", key=7, name="Occupancy")]
        on_state = make_on_state(mac, device_conn)

        connection.send_message.reset_mock()
        on_state(BinarySensorState(key=7, state=True, missing_state=False))

        target_events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "targets" in c.args[0].get("event", {})
        ]
        assert target_events, "expected a {targets, sensors, zones} frame"

    async def test_offline_device_still_sends_snapshot(self, hass, config_entry):
        """An offline device still gets a snapshot, and the stream still registers
        so it arms when the device comes back."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            on_availability(False)  # manager could not arm it — device is offline
            return MagicMock()

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 13, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        connection.send_result.assert_called_once_with(13)
        avail_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and c.args[0].get("event", {}).get("available") is False
        ]
        assert avail_events, "expected an available:false event"
        assert 13 in connection.subscriptions  # still recoverable

    async def test_double_fire_unsub_is_noop(self, hass, config_entry):
        """A double-invoked unsub must tear the stream down only once."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 14, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        connection.subscriptions[14]()
        connection.subscriptions[14]()

        assert unsub_stream.call_count == 1

    async def test_add_stream_raises_goes_offline(self, hass, config_entry):
        """A failure registering the stream degrades to available:false, no crash."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}
        mock_dm.async_add_state_stream = AsyncMock(side_effect=RuntimeError("boom"))

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 15, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        avail_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and c.args[0].get("event", {}).get("available") is False
        ]
        assert avail_events, "expected an available:false event"
        assert 15 not in connection.subscriptions

    async def test_unknown_mac_goes_offline(self, hass, config_entry):
        """The manager returns None for a mac it no longer manages — no stream to unsub."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}
        mock_dm.async_add_state_stream = AsyncMock(return_value=None)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 19, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        avail_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and c.args[0].get("event", {}).get("available") is False
        ]
        assert avail_events, "expected an available:false event"
        assert 19 not in connection.subscriptions

    async def test_closed_connection_tears_the_stream_down(self, hass, config_entry):
        """If the WS closed during the await, release the stream immediately.

        HA's `async_handle_close` clears `connection.subscriptions`, so the unsub
        registered afterwards can never fire — the stream (and its session ref)
        would leak for the life of the manager.
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:01": {}}
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        with patch(
            "custom_components.eppgrid.websocket_api._durable_stream._connection_is_closed",
            return_value=True,
        ):
            msg = {"id": 16, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}
            await call_async_handler(hass, websocket_overview_subscribe, connection, msg)

        unsub_stream.assert_called_once()
        # The `released` guard keeps a later unsub from double-tearing it down.
        unsub = connection.subscriptions.get(16)
        if unsub is not None:
            unsub()
        assert unsub_stream.call_count == 1


class TestOverviewSubscribeHeatmap:
    """Tests for eppgrid/overview/subscribe_heatmap (non-admin, device_id-based)."""

    async def test_unknown_device_id(self, hass, config_entry):
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=None)

        connection = MagicMock()
        msg = {"id": 20, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "ghost"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        connection.send_error.assert_called_once()
        assert connection.send_error.call_args.args[1] == "device_not_found"

    async def test_registers_a_durable_stream_without_snapshot(self, hass, config_entry):
        """Hands the stream to the manager under the heatmap counter, no snapshot."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mac = "AA:BB:CC:DD:EE:01"
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=mac)
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 22, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        connection.send_result.assert_called_once_with(22)
        snapshot_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and c.args[0].get("event", {}).get("snapshot") is not None
        ]
        assert not snapshot_events, "heatmap subscribe must never send a snapshot event"

        mock_dm.async_add_state_stream.assert_awaited_once()
        assert mock_dm.async_add_state_stream.await_args.args[0] == mac
        assert mock_dm.async_add_state_stream.await_args.kwargs["counter_attr"] == "heatmap_subs"
        assert mock_dm.async_add_state_stream.await_args.kwargs["poll_fn"] is not None

        assert 22 in connection.subscriptions
        connection.subscriptions[22]()
        unsub_stream.assert_called_once()

    async def test_no_live_availability_events_after_registration(self, hass, config_entry):
        """Arm/disarm must NEVER reach the heatmap subscription — BWC guard for #334.

        Deployed card bundles reduce this stream with `(_state, m) => m.cells ?? []`
        (frontend/src/card/heatmap-store.ts), so ANY message without a `cells` field
        blanks the overlay until the next heatmap frame. Relaying availability here
        would wipe a user's heatmap on every device flap, and we cannot fix those
        bundles by rebuilding — so this subscription's wire behaviour must not change.
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 24, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        on_availability = mock_dm.async_add_state_stream.await_args.kwargs["on_availability"]
        on_availability(True)  # manager armed the stream on a fresh connection
        on_availability(False)  # ...and the device flapped again

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert events == []

    async def test_offline_device_sends_available_false_no_snapshot(self, hass, config_entry):
        """Manager can't arm the stream -> available:false, no snapshot, still registered.

        This one-shot is the ONLY availability event this subscription has ever sent
        (the pre-#334 handler emitted it when `async_open_session` returned None), and
        it lands while the overlay is still empty, so it blanks nothing. It is kept
        for BWC; the live arm/disarm events are not (see
        `test_no_live_availability_events_after_registration`).
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            on_availability(False)
            return MagicMock()

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 21, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        connection.send_result.assert_called_once_with(21)
        avail_events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert avail_events == [{"available": False}]
        snapshot_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and c.args[0].get("event", {}).get("snapshot") is not None
        ]
        assert not snapshot_events, "heatmap subscribe must never send a snapshot event"
        assert 21 in connection.subscriptions  # still recoverable

    async def test_session_loss_during_registration_emits_nothing_when_the_stream_arms(self, hass, config_entry):
        """A `notify(False)` racing our registration must not reach an ARMED stream's client.

        `async_add_state_stream` appends the stream to `_state_streams[mac]` BEFORE it
        awaits `_ensure_streams`, so a session loss (aioesphomeapi fires `on_stop`
        eagerly — including a stale one from a replaced connection) can drive
        `on_availability(False)` through the still-unarmed stream while we register.
        The arm then succeeds. `main` sent nothing on this wire in that case, and a
        `cells`-less message blanks a deployed card's overlay — so must we.
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            on_availability(False)  # a stale on_stop lands mid-registration
            on_availability(True)  # ...and the arm pass still succeeds
            return MagicMock()

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 25, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert events == []
        assert 25 in connection.subscriptions

    async def test_repeated_offline_notifications_during_registration_emit_one_event(self, hass, config_entry):
        """Whatever races the registration window, the wire carries at most one `available:false`."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            on_availability(False)  # session lost while the stream was still unarmed
            on_availability(False)  # ...and the arm pass finds the device offline too
            return MagicMock()

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 26, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert events == [{"available": False}]

    async def test_unarmable_stream_sends_one_available_false(self, hass, config_entry):
        """The manager returning None must not stack a second `available:false` on the
        one a registration-window `notify` already recorded."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")

        async def _add_stream(mac, *, counter_attr, make_on_state, on_availability, on_closed, poll_fn=None):
            on_availability(False)
            return None  # mac no longer managed — nothing was registered

        mock_dm.async_add_state_stream = AsyncMock(side_effect=_add_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 27, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert events == [{"available": False}]
        assert 27 not in connection.subscriptions

    async def test_closed_callback_tells_the_card_to_resubscribe(self, hass, config_entry):
        """The teardown signal DOES reach this subscription — unlike arm/disarm.

        The payload carries no `available` key (this wire has never streamed liveness),
        just `closed: true`. A deployed bundle reduces that with `m.cells ?? []` and so
        blanks its overlay — accepted: by the time this fires, that overlay is already
        frozen for good, its backend stream gone and no frame ever coming. Task 10's
        reducer keeps the cells and re-subscribes instead.
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value="AA:BB:CC:DD:EE:01")
        mock_dm.async_add_state_stream = AsyncMock(return_value=MagicMock())

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 28, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        connection.send_message.reset_mock()
        mock_dm.async_add_state_stream.await_args.kwargs["on_closed"]()

        connection.send_message.assert_called_once()
        assert connection.send_message.call_args.args[0]["event"] == {"closed": True}

    async def test_subscribe_heatmap_emits_cells_on_state(self, hass, config_entry):
        """The callback the manager builds from `make_on_state` emits {"cells": [...]}.

        Under the poll transport there is no device state / entity key to re-read
        from the (possibly replacement) connection — `make_on_state` is fed the
        polled cells list directly, already decoded by `DeviceConnection.async_fetch_heatmap`.
        """
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mac = "AA:BB:CC:DD:EE:01"
        captured = {}

        async def fake_add_state_stream(
            mac_arg, *, counter_attr, make_on_state, on_availability, on_closed=None, poll_fn=None
        ):
            captured["poll_fn"] = poll_fn
            captured["cb"] = make_on_state(mac_arg, object())
            return MagicMock()

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=mac)
        mock_dm.async_add_state_stream = AsyncMock(side_effect=fake_add_state_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 22, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        connection.send_result.assert_called_once_with(22)
        assert captured["poll_fn"] is not None

        captured["cb"]([1, 2, 3])
        assert _last_event(connection) == {"cells": [1, 2, 3]}

        captured["cb"]([0] * 400)
        assert _last_event(connection) == {"cells": [0] * 400}

    async def test_unsub_tears_the_stream_down_and_is_idempotent(self, hass, config_entry):
        """Symmetric unsub: the durable stream is torn down exactly once, even if
        the unsub is double-fired (the `released` guard)."""
        from custom_components.eppgrid.websocket_api import websocket_overview_subscribe_heatmap

        mac = "AA:BB:CC:DD:EE:01"
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.mac_for_device_id = MagicMock(return_value=mac)
        unsub_stream = MagicMock()
        mock_dm.async_add_state_stream = AsyncMock(return_value=unsub_stream)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 23, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"}
        await call_async_handler(hass, websocket_overview_subscribe_heatmap, connection, msg)

        assert 23 in connection.subscriptions
        connection.subscriptions[23]()
        connection.subscriptions[23]()

        assert unsub_stream.call_count == 1
        # The handler owns no session of its own any more.
        mock_dm.release_session.assert_not_called()
        mock_dm.note_target_unsubscribe.assert_not_called()
