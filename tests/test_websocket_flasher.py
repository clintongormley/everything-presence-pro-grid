"""Tests for flasher WebSocket API commands."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid.const import DOMAIN

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
        mock_dm._store.configurations = {}
        mock_dm._store.async_save = AsyncMock()
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])
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


class TestListFlashableDevices:
    """Tests for eppgrid/list_flashable_devices."""

    async def test_returns_flashable_devices(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """list_flashable_devices returns devices from manager."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "EPP Device",
            "host": "192.168.1.50",
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            "config_entry_id": "abc123",
        }
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])

        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_result.assert_called_once()
        result = connection.send_result.call_args[0]
        assert result[0] == 1
        assert len(result[1]["devices"]) == 1
        assert result[1]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert result[1]["firmware_base_url"] == "/api/eppgrid/firmware"
        assert "latest_firmware_version" in result[1]
        assert "integration_version" in result[1]

    async def test_not_ready(self, hass: HomeAssistant) -> None:
        """list_flashable_devices returns error when integration not loaded."""
        from custom_components.eppgrid.websocket_api import websocket_list_flashable_devices

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/list_flashable_devices"}

        await call_async_handler(hass, websocket_list_flashable_devices, connection, msg)

        connection.send_error.assert_called_once_with(
            1,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )


class TestSubscribeFlashableDevices:
    """Tests for eppgrid/subscribe_flashable_devices."""

    async def test_subscribe_sends_initial_list(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """subscribe_flashable_devices sends the current list immediately."""
        mock_dm = await setup_integration(hass, config_entry)
        device = {"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP", "firmware_type": "original"}
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])
        mock_dm.on_device_list_changed = MagicMock(return_value=lambda: None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 30, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        connection.send_result.assert_called_once_with(30)
        connection.send_message.assert_called_once()
        event_msg = connection.send_message.call_args[0][0]
        assert event_msg["id"] == 30
        assert event_msg["event"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert "firmware_base_url" in event_msg["event"]
        assert "integration_version" in event_msg["event"]
        assert 30 in connection.subscriptions

    async def test_subscribe_pushes_updates(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Device list change callback pushes updated flashable list."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 31, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        # Simulate device list change
        device = {"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}
        mock_dm.list_flashable_devices = AsyncMock(return_value=[device])
        assert captured_cb is not None
        captured_cb()
        await hass.async_block_till_done()

        assert connection.send_message.call_count == 2

    async def test_unsubscribe_removes_callback(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unsubscribing cleans up the callback."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        unsub_inner = MagicMock()
        mock_dm.on_device_list_changed = MagicMock(return_value=unsub_inner)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 32, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        connection.subscriptions[32]()
        unsub_inner.assert_called_once()

    async def test_initial_subscribe_failure_sends_error_not_silent_success(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If `list_flashable_devices` raises during the initial subscribe,
        the handler must surface an error to the frontend rather than the
        current `send_result(success)` + swallow-the-exception combo. Without
        this, the panel stays stuck on "loading" forever — it has a valid
        subscription but never sees the initial payload."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(side_effect=RuntimeError("registry boom"))
        mock_dm.on_device_list_changed = MagicMock(return_value=lambda: None)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 99, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        # Either send_error fired (preferred) — OR send_result was NOT called
        # so the frontend's WS layer treats the command as failed.
        if connection.send_result.called:
            connection.send_error.assert_called()
        # Must not have left the subscription as a "subscribed but no data"
        # zombie; if send_result was sent, the subscription should also have
        # been torn down (no _unsub registered).
        if connection.send_result.called and 99 in connection.subscriptions:
            # If we keep the subscription alive, an event must have been sent.
            connection.send_message.assert_called()

    async def test_change_during_initial_fetch_is_not_lost(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If `_fire_device_list_changed` fires WHILE the initial
        `_flashable_payload` await is still in flight, the change must not
        be silently dropped — the callback has to be registered before the
        fetch starts. Otherwise a new subscriber gets stale data and never
        sees the in-flight change again."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        # First call: simulate an in-flight change firing during the await.
        # Second call (and beyond): return fresh data.
        fetch_started = asyncio.Event()
        release_first = asyncio.Event()
        call_count = 0

        async def maybe_slow_list():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                fetch_started.set()
                await release_first.wait()
                return []  # initial (stale)
            return [{"mac": "AA:BB:CC:DD:EE:FF", "name": "EPP"}]

        mock_dm.list_flashable_devices = AsyncMock(side_effect=maybe_slow_list)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 200, "type": "eppgrid/subscribe_flashable_devices"}

        # Kick off the handler — @async_response runs the coroutine.
        websocket_subscribe_flashable_devices(hass, connection, msg)
        await fetch_started.wait()

        # The change-callback MUST already be registered — otherwise a fire
        # right now would be lost.
        assert captured_cb is not None, "on_device_list_changed must be registered before initial fetch"

        # Fire a change while the initial fetch is still pending.
        captured_cb()

        # Let the initial fetch complete.
        release_first.set()
        await hass.async_block_till_done()

        # We should have seen at least two send_message calls: the initial
        # (stale) payload and the change-triggered (fresh) payload. The
        # second confirms the fired change wasn't dropped.
        assert connection.send_message.call_count >= 2, (
            f"expected initial + change-triggered send, got {connection.send_message.call_count}"
        )

    async def test_initial_send_message_failure_unsubs_device_list_callback(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If the initial `send_message` raises (connection closed mid-send),
        we must release the `on_device_list_changed` registration. Otherwise
        the callback leaks: it's not yet wrapped in a `connection.subscriptions`
        entry, so HA will never call it on connection close."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        unsub_inner = MagicMock()
        mock_dm.on_device_list_changed = MagicMock(return_value=unsub_inner)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        # Make send_result succeed but the initial send_message fail.
        connection.send_message.side_effect = ConnectionResetError("connection closed")
        msg = {"id": 99, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        # The device-list callback must have been unsubscribed.
        unsub_inner.assert_called_once()

    async def test_send_update_swallows_post_close_send_message_failure(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If the WS connection closes mid-send, send_message raises — the
        update task must not propagate that as an unhandled exception, just
        log and move on. Otherwise a stale subscription noises the logs and
        could destabilise other callbacks."""

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.list_flashable_devices = AsyncMock(return_value=[])

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 33, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)

        # Now make send_message raise as if connection was closed
        connection.send_message.side_effect = ConnectionResetError("connection closed")
        captured_cb()
        # Must not raise unhandled — just complete the task.
        await hass.async_block_till_done()

    async def test_unsubscribe_cancels_in_flight_send_update(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """An in-flight `_send_update` triggered by `_on_changed` must be
        cancelled when the subscription unsubs — otherwise it can outlive
        the connection and try to call send_message on a dead channel."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)

        list_started = asyncio.Event()
        list_release = asyncio.Event()

        async def slow_list():
            list_started.set()
            await list_release.wait()
            return []

        mock_dm.list_flashable_devices = AsyncMock(side_effect=slow_list)

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 34, "type": "eppgrid/subscribe_flashable_devices"}

        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)
        # Initial _send_update has finished by now (it ran with slow_list which
        # would block; release for that one).
        # Wait for the initial send to finish:
        # Actually the initial send is awaited inside the handler, so we need
        # to release it before call_async_handler returns. Adjusting:

        # Re-do with the initial _send_update unblocked.
        list_release.set()
        await hass.async_block_till_done()
        list_release.clear()
        list_started.clear()

        # Now trigger an _on_changed → kicks off a new _send_update task
        captured_cb()
        await list_started.wait()

        # Track whatever task is in flight
        in_flight_tasks = [t for t in asyncio.all_tasks() if "_send_update" in repr(t.get_coro()) and not t.done()]
        assert in_flight_tasks, "expected an in-flight _send_update task"

        # Now unsubscribe
        connection.subscriptions[34]()

        # The pending task must be cancelled (or at least not call send_message
        # after unsub). Release the slow list and verify no send_message after
        # unsub for the new event.
        send_count_before = connection.send_message.call_count
        list_release.set()
        await hass.async_block_till_done()
        # The cancelled task should not have produced a new send_message
        assert connection.send_message.call_count == send_count_before

    async def test_unsubscribe_cancels_all_concurrent_send_updates(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If `on_device_list_changed` fires multiple times before the first
        refresh finishes, every in-flight task must be cancelled on _unsub —
        otherwise older tasks keep waiting on `list_flashable_devices` long
        after the subscriber is gone, even if the `closed` guard prevents
        a wrong send afterwards. Tracked via tasks-spawned vs tasks-cancelled."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)

        list_release = asyncio.Event()
        spawned: list[asyncio.Future] = []

        async def slow_list():
            current = asyncio.current_task()
            assert current is not None
            spawned.append(current)
            await list_release.wait()
            return []

        mock_dm.list_flashable_devices = AsyncMock(side_effect=slow_list)

        captured_cb = None

        def capture_on_changed(cb):
            nonlocal captured_cb
            captured_cb = cb
            return lambda: None

        mock_dm.on_device_list_changed = MagicMock(side_effect=capture_on_changed)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_flashable_devices

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 35, "type": "eppgrid/subscribe_flashable_devices"}

        # Initial _send_update is awaited inside the handler — release for it
        # then re-arm the gate.
        list_release.set()
        await call_async_handler(hass, websocket_subscribe_flashable_devices, connection, msg)
        list_release.clear()

        # Fire two _on_changed back-to-back. Both should be tracked.
        captured_cb()
        captured_cb()
        # Let both tasks reach the await point.
        for _ in range(5):
            await asyncio.sleep(0)

        # Both _on_changed tasks should have made it into slow_list and be
        # parked on list_release.
        on_changed_tasks = spawned[1:]  # spawned[0] was the initial _send_update
        assert len(on_changed_tasks) == 2

        # Unsubscribe — both pending tasks must be cancelled.
        connection.subscriptions[35]()
        await asyncio.sleep(0)

        for t in on_changed_tasks:
            assert t.cancelled() or t.done(), f"task {t!r} not cancelled by _unsub"

        list_release.set()
        await hass.async_block_till_done()


class TestDeleteEsphomeDevice:
    """Tests for eppgrid/delete_esphome_device."""

    async def test_deletes_config_entry(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_esphome_device calls hass.config_entries.async_remove."""
        await setup_integration(hass, config_entry)

        # Create a real ESPHome config entry so async_get_entry finds it
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.42"})
        esphome_entry.add_to_hass(hass)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 2,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": esphome_entry.entry_id,
        }

        with patch.object(hass.config_entries, "async_remove", new_callable=AsyncMock) as mock_remove:
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        mock_remove.assert_awaited_once_with(esphome_entry.entry_id)
        connection.send_result.assert_called_once_with(2)
        connection.send_error.assert_not_called()

    async def test_delete_fails(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_esphome_device sends error when async_remove raises."""
        await setup_integration(hass, config_entry)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.42"})
        esphome_entry.add_to_hass(hass)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 3,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": esphome_entry.entry_id,
        }

        with patch.object(
            hass.config_entries,
            "async_remove",
            new_callable=AsyncMock,
            side_effect=Exception("not found"),
        ):
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        connection.send_error.assert_called_once_with(3, "delete_failed", "not found")
        connection.send_result.assert_not_called()

    async def test_delete_esphome_device_requires_admin(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Non-admin users cannot delete ESPHome devices."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 5,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": "some-entry-id",
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        connection.send_result.assert_not_called()

    async def test_delete_rejects_non_esphome_entry(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """delete_esphome_device rejects entries that aren't ESPHome."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_delete_esphome_device

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/delete_esphome_device",
            "config_entry_id": config_entry.entry_id,  # eppgrid entry, not esphome
        }

        await call_async_handler(hass, websocket_delete_esphome_device, connection, msg)

        connection.send_error.assert_called_once_with(
            4,
            "invalid_entry",
            "Only ESPHome config entries can be deleted by this command",
            translation_domain=DOMAIN,
            translation_key="only_esphome_can_be_deleted",
        )


class TestAddEsphomeDevice:
    """Tests for eppgrid/add_esphome_device."""

    @pytest.mark.parametrize(
        ("flow_result", "expected"),
        [
            ({"type": "create_entry"}, {"type": "added"}),
            ({"type": "form"}, {"type": "needs_auth"}),
            ({"type": "form", "flow_id": "x"}, {"type": "needs_auth"}),
            (
                {"type": "form", "errors": {}},
                {"type": "needs_auth"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "user",
                    "errors": {"base": "connection_error"},
                },
                {"type": "cannot_connect"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "user",
                    "errors": {"base": "resolve_error"},
                },
                {"type": "cannot_connect"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "user",
                    "errors": {"base": "cannot_connect"},
                },
                {"type": "cannot_connect"},
            ),
            (
                {
                    "type": "form",
                    "step_id": "encryption_key",
                    "errors": {"base": "invalid_psk"},
                },
                {"type": "needs_auth"},
            ),
            (
                {"type": "abort", "reason": "already_configured"},
                {"type": "already_added"},
            ),
            (
                {"type": "abort", "reason": "already_configured_updates"},
                {"type": "already_added"},
            ),
            (
                {"type": "abort", "reason": "cannot_connect"},
                {"type": "cannot_connect"},
            ),
            (
                {"type": "abort", "reason": "connection_error"},
                {"type": "cannot_connect"},
            ),
            (
                {"type": "abort", "reason": "invalid_auth"},
                {"type": "failed", "reason": "invalid_auth"},
            ),
            (
                {"type": "abort", "reason": ""},
                {"type": "failed", "reason": "unknown"},
            ),
            (
                {"type": "abort"},
                {"type": "failed", "reason": "unknown"},
            ),
            (
                {"type": "progress"},
                {"type": "failed", "reason": "progress"},
            ),
            (
                {"type": "menu"},
                {"type": "failed", "reason": "menu"},
            ),
        ],
    )
    def test_map_esphome_flow_result(self, flow_result: dict, expected: dict) -> None:
        """_map_esphome_flow_result translates config-flow results to HaAddResult."""
        from custom_components.eppgrid.websocket_api import _map_esphome_flow_result

        assert _map_esphome_flow_result(flow_result) == expected

    async def test_triggers_config_flow(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """add_esphome_device triggers esphome config flow and sends mapped result."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        connection = MagicMock()
        msg = {
            "id": 4,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }

        flow_result = {"type": "create_entry", "title": "esphome-device"}
        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
            return_value=flow_result,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_awaited_once()
        call_kwargs = mock_init.call_args
        assert call_kwargs[0][0] == "esphome"
        assert call_kwargs[1]["context"]["source"] == "user"
        assert call_kwargs[1]["data"] == {"host": "192.168.1.99", "port": 6053}
        connection.send_result.assert_called_once()
        msg_id, payload = connection.send_result.call_args[0]
        assert msg_id == 4
        assert payload["type"] == "added"

    async def test_skips_flow_when_host_already_configured(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If an ESPHome entry already points at the host, skip the flow."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        # Add a pre-existing ESPHome config entry pointing at our target host.
        existing = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "port": 6053},
            title="existing-device",
        )
        existing.add_to_hass(hass)

        connection = MagicMock()
        msg = {
            "id": 7,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.50",
        }

        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_not_awaited()
        connection.send_result.assert_called_once()
        msg_id, payload = connection.send_result.call_args[0]
        assert msg_id == 7
        assert payload == {"type": "already_added"}

    async def test_propagates_user_id_to_flow_context(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """add_esphome_device must forward `connection.user.id` into the flow context.

        The original code branch reading `connection.context.user_id` was dead because
        `connection.context` is a method, not an attribute — `hasattr(method, "user_id")`
        is always False, so the audit-trail user_id never reached the config flow.
        """
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        connection = MagicMock()
        connection.user = MagicMock()
        connection.user.id = "user-abc-123"
        msg = {
            "id": 4,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }
        flow_result = {"type": "create_entry", "title": "esphome-device"}
        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
            return_value=flow_result,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_awaited_once()
        ctx = mock_init.call_args[1]["context"]
        assert ctx.get("user_id") == "user-abc-123"
        assert ctx.get("source") == "user"

    def test_host_length_capped_by_schema(self) -> None:
        """add_esphome_device must reject overly long host strings at schema level."""
        import voluptuous as vol

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        payload = {
            "id": 1,
            "type": "eppgrid/add_esphome_device",
            "host": "x" * 254,
        }
        with pytest.raises(vol.Invalid):
            websocket_add_esphome_device._ws_schema(payload)

    async def test_starts_flow_when_host_not_in_entries(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """If no ESPHome entry matches the host, start the config flow."""
        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        # Different host in an existing entry — should not short-circuit.
        existing = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "port": 6053},
            title="other-device",
        )
        existing.add_to_hass(hass)

        connection = MagicMock()
        msg = {
            "id": 8,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }

        flow_result = {"type": "create_entry", "title": "new-device"}
        with patch.object(
            hass.config_entries.flow,
            "async_init",
            new_callable=AsyncMock,
            return_value=flow_result,
        ) as mock_init:
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        mock_init.assert_awaited_once()
        connection.send_result.assert_called_once()
        msg_id, payload = connection.send_result.call_args[0]
        assert msg_id == 8
        assert payload == {"type": "added"}

    async def test_add_esphome_device_requires_admin(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Non-admin users cannot add ESPHome devices."""
        from homeassistant.exceptions import Unauthorized

        await setup_integration(hass, config_entry)

        from custom_components.eppgrid.websocket_api import websocket_add_esphome_device

        connection = MagicMock()
        connection.user.is_admin = False
        msg = {
            "id": 9,
            "type": "eppgrid/add_esphome_device",
            "host": "192.168.1.99",
        }

        with pytest.raises(Unauthorized):
            await call_async_handler(hass, websocket_add_esphome_device, connection, msg)

        connection.send_result.assert_not_called()
