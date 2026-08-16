"""Tests for OTA progress WebSocket subscription."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid.const import DOMAIN


async def setup_integration(hass: HomeAssistant, config_entry: MockConfigEntry) -> MagicMock:
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
        mock_dm.devices = {}
        mock_dm.list_devices.return_value = []
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm.async_push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        # Default: no real flash was recorded by the trigger, so a held-session
        # device isn't primed by subscribe_ota_progress (keeps the
        # 'no flash -> no fabricated success' gate test honest). Tests exercising
        # the flash-expected priming override this.
        mock_dm.take_ota_flash_expected = MagicMock(return_value=False)
        # release_session returns None when other references keep the session
        # alive, or the scheduled close task when this release closed it.
        # Default to "kept alive" — tests pinning the closing path override.
        mock_dm.release_session = MagicMock(return_value=None)
        mock_dm.schedule_close_session = MagicMock()
        mock_dm.read_firmware_version.return_value = FIRMWARE_VERSION
        mock_dm._build_flags = {}

        await async_setup_entry(hass, config_entry)

    return mock_dm


async def call_async_handler(hass, handler, connection, msg):
    handler(hass, connection, msg)
    await hass.async_block_till_done()


def make_mock_device_conn(entities=None, services=None):
    conn = MagicMock()
    conn.connected = True
    conn._entities = entities or []
    conn.subscribe_states = AsyncMock()
    conn.unsubscribe_states = MagicMock()
    conn.add_log_callback = MagicMock()
    conn.remove_log_callback = MagicMock()
    # Shared OTA-watcher state — a real OtaWatcherState (not MagicMock
    # attributes) so the handler's increment / compare logic behaves like
    # production.
    from custom_components.eppgrid.device_manager import OtaWatcherState

    conn.ota = OtaWatcherState()
    # By default, async_execute_service succeeds (firmware exposes
    # epp_set_log_level). Pass services={} to simulate older firmware
    # without the action — that path raises HomeAssistantError, which
    # the handler catches.
    if services is None:
        services = {"epp_set_log_level": MagicMock()}
    conn._services = services
    conn._client = MagicMock()
    conn._client.execute_service = AsyncMock()

    # Match real DeviceConnection.async_execute_service: succeed when the
    # service is in _services, raise HomeAssistantError otherwise.
    async def _async_execute_service(name, payload=None, *, timeout=30.0, return_response=False):
        from homeassistant.exceptions import HomeAssistantError

        svc = conn._services.get(name)
        if svc is None:
            raise HomeAssistantError(f"Service {name} not available")
        return await conn._client.execute_service(svc, payload or {}, return_response=return_response)

    conn.async_execute_service = AsyncMock(side_effect=_async_execute_service)
    return conn


def make_update_state(
    *,
    in_progress=False,
    has_progress=False,
    progress=0.0,
    current_version="0.89.0",
    latest_version="0.90.0-alpha",
    key=1,
    missing_state=False,
):
    from aioesphomeapi import UpdateState

    return UpdateState(
        key=key,
        missing_state=missing_state,
        in_progress=in_progress,
        has_progress=has_progress,
        progress=progress,
        current_version=current_version,
        latest_version=latest_version,
    )


class TestSubscribeOtaProgress:
    async def test_sends_error_when_integration_not_loaded(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        await setup_integration(hass, config_entry)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        hass.data.pop("eppgrid", None)
        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(
            1,
            "not_ready",
            "Integration not loaded",
            translation_domain=DOMAIN,
            translation_key="integration_not_loaded",
        )

    async def test_reports_success_without_a_session_when_device_offline(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Upgrade-all regression: when the panel subscribes, a device is usually
        OFFLINE (the http_request OTA download blocks its main loop), so
        async_open_session returns None. The handler must NOT bail with no_session
        — it must arm the reboot-proof, session-independent outcome watch and
        report success when the device returns on the target version. (Only the
        currently-streamed device has a reusable live session, which is why a
        single physical device always appeared to work before.)
        """
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        mock_dm = await setup_integration(hass, config_entry)
        # Offline / non-selected device: no session can be opened.
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        await hass.async_block_till_done()

        # Must NOT abandon the update with a no-session error.
        no_session_errors = [
            c for c in connection.send_error.call_args_list if len(c[0]) > 1 and c[0][1] == "no_session"
        ]
        assert no_session_errors == []
        # Must establish the subscription and report success off the durable signal.
        connection.send_result.assert_called_once_with(1)
        mock_dm.async_wait_for_ota_outcome.assert_awaited()
        from homeassistant.components.websocket_api import event_message

        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": FIRMWARE_VERSION}) in calls

    async def test_reports_abort_without_a_session(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The sessionless path still fast-fails a flash that parked back on the
        old firmware (outcome 'aborted' -> ota_interrupted)."""
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="aborted")
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        await hass.async_block_till_done()

        mock_dm.async_wait_for_ota_outcome.assert_awaited()
        from homeassistant.components.websocket_api import event_message

        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "error", "error_key": "flasher.errors.ota_interrupted"}) in calls

    async def test_subscribes_and_sends_result(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn.subscribe_states.assert_awaited_once()
        connection.send_result.assert_called_once_with(1)
        assert 1 in connection.subscriptions

    async def test_releases_session_when_connection_closes_during_open(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If the WS connection drops while the handler is awaiting (session
        open / log bump / subscribe_states), HA's async_handle_close clears
        `connection.subscriptions` — the unsub we register afterward will never
        fire. The handler must release the refcount the open took, or the
        device's API slot leaks until a force-close.
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()

        connection = MagicMock()
        connection.subscriptions = {}

        async def _open(mac: str) -> object:
            # Simulate HA's async_handle_close landing mid-await: clear the
            # subscriptions dict and swap send_message for the closed-error
            # stub (HA does NOT cancel this background task).
            connection.subscriptions.clear()
            connection.send_message = connection._connect_closed_error
            return device_conn

        mock_dm.async_open_session = AsyncMock(side_effect=_open)
        mock_dm.release_session = MagicMock(return_value=None)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # The refcount the open took must be released exactly once, via the
        # `released`-guarded _release_watcher → release_session path.
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)

    async def test_bumps_device_log_level_to_error_on_subscribe(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The firmware silences logs to NONE on boot to keep API traffic low.
        That means the integration's existing ERROR-log surface in _on_log
        never fires — even fatal OTA failures stay invisible. Bumping the
        device's system log level to Error when the user opens the OTA panel
        keeps the surface working without flooding the API in steady state.
        """
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        device_conn.async_execute_service.assert_awaited_once_with(
            "epp_set_log_level", {"category": "system", "level": "Error"}
        )

    async def test_skips_log_bump_when_service_missing(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Older firmware does not expose epp_set_log_level. Subscribe must
        still succeed (silently no-op the bump) instead of erroring out."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={})
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # async_execute_service is invoked but raises HomeAssistantError because
        # the service isn't in _services — handler swallows the error and
        # subscription proceeds.
        device_conn._client.execute_service.assert_not_awaited()
        connection.send_result.assert_called_once_with(1)

    async def test_forwards_progress_events(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]
        state = make_update_state(in_progress=True, has_progress=True, progress=65.0)
        on_state(state)
        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {"state": "updating", "progress": 65.0})
        # Tear down the 5-min timer the start sentinel arms — pytest-ha
        # fails the test if any HA timer outlives it.
        connection.subscriptions[1]()

    async def test_forwards_indeterminate_progress(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]
        state = make_update_state(in_progress=True, has_progress=False)
        on_state(state)
        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(1, {"state": "updating", "progress": None})
        connection.subscriptions[1]()

    async def test_ignores_non_update_states(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]
        from aioesphomeapi import SensorState

        sensor_state = SensorState(key=1, state=42.0, missing_state=False)
        on_state(sensor_state)
        connection.send_message.assert_not_called()

    async def test_sends_success_on_version_match(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]
        on_state(make_update_state(in_progress=True, has_progress=True, progress=100.0))
        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha"))
        from homeassistant.components.websocket_api import event_message

        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": "0.90.0-alpha"}) in calls

    async def test_sends_error_on_version_mismatch(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]
        on_state(make_update_state(in_progress=True, has_progress=True, progress=30.0))
        on_state(make_update_state(in_progress=False, current_version="0.89.0", latest_version="0.90.0-alpha"))
        from homeassistant.components.websocket_api import event_message

        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert (
            event_message(
                1,
                {
                    "state": "error",
                    "message": "Update failed \u2014 firmware version unchanged",
                    "error_key": "flasher.errors.ota_failed_version_unchanged",
                },
            )
            in calls
        )

    async def test_reports_success_when_device_returns_on_target_version(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The OTA reboots the device, replacing the connection so ``_on_state``
        can never deliver the terminal in_progress=False/current==latest state.
        Success must still be reported off the durable firmware-version signal —
        the same thing a page refresh reads — via the manager's
        ``async_wait_for_ota_outcome`` completion path.
        """
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        # The device comes back on the target version after the flash reboot.
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")

        # The OTA visibly starts (progress flows, latching `was_in_progress`)
        # before the connection goes silent for the reboot — deliver that
        # in_progress state synchronously as subscribe_states is wired up, so it
        # precedes the version-return check. After it, no terminal state is ever
        # delivered on _on_state (the reboot replaced the connection).
        def _deliver_in_progress(cb):
            cb(make_update_state(in_progress=True, has_progress=True, progress=50.0, current_version="0.89.0"))

        device_conn.subscribe_states = AsyncMock(side_effect=_deliver_in_progress)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        await hass.async_block_till_done()

        from homeassistant.components.websocket_api import event_message

        mock_dm.async_wait_for_ota_outcome.assert_awaited()
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": FIRMWARE_VERSION}) in calls

    async def test_held_session_reports_success_when_flash_expected_and_state_silent(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Under "Update all" the panel can subscribe AFTER the fast download's
        in_progress states have already passed: a live session attaches but
        ``_on_state`` never fires, so ``was_in_progress`` never latches. Because
        the trigger recorded a REAL flash (old->target) is in flight
        (``take_ota_flash_expected`` returns True), the subscribe handler must
        prime the start sentinel so the reboot-proof outcome watch's success
        (device back on the target version) is reported instead of being gated
        out to a hung spinner.
        """
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        # Attaches a live session but delivers NO state — `_on_state` never fires.
        device_conn.subscribe_states = AsyncMock()
        # The device comes back on the target version after the flash reboot.
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")
        # The trigger recorded that a real flash is in flight for this mac.
        mock_dm.take_ota_flash_expected = MagicMock(return_value=True)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        await hass.async_block_till_done()

        from homeassistant.components.websocket_api import event_message

        mock_dm.async_wait_for_ota_outcome.assert_awaited()
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": FIRMWARE_VERSION}) in calls

    async def test_reports_error_when_device_returns_on_old_firmware(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The device was unplugged mid-flash and rebooted onto its previous
        firmware. The outcome watcher classifies that as 'aborted'; the watcher
        must fast-fail with the ota_interrupted error_key instead of spinning
        the full outer timeout.
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="aborted")

        # Latch `was_in_progress` by delivering an in_progress state as
        # subscribe_states is wired up (mirrors the success test).
        def _deliver_in_progress(cb):
            cb(make_update_state(in_progress=True, has_progress=True, progress=50.0, current_version="0.89.0"))

        device_conn.subscribe_states = AsyncMock(side_effect=_deliver_in_progress)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        await hass.async_block_till_done()

        from homeassistant.components.websocket_api import event_message

        mock_dm.async_wait_for_ota_outcome.assert_awaited()
        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "error", "error_key": "flasher.errors.ota_interrupted"}) in calls

    async def test_no_version_return_success_when_no_ota_ever_started(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If the device is already on the target version when OTA is
        (re-)triggered, ``async_wait_for_ota_outcome`` returns success on its first
        poll — but with no in_progress/version-mismatch state ever seen
        (``was_in_progress`` never latched) the outcome path must NOT
        fabricate a success (no flash actually happened).
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        # No OTA state is ever delivered (was_in_progress stays False).
        await hass.async_block_till_done()

        sent_states = [c[0][0].get("event", {}).get("state") for c in connection.send_message.call_args_list]
        assert "success" not in sent_states

    async def test_unsubscribe_cleans_up(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]
        on_log = device_conn.add_log_callback.call_args[0][0]
        connection.subscriptions[1]()
        device_conn.unsubscribe_states.assert_called_once_with(on_state)
        device_conn.remove_log_callback.assert_called_once_with(on_log)

    async def test_forwards_device_log_errors(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When device logs an http_request error, emit error event immediately."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        # Simulate an ESPHome error log message
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = (
            "[E][http_request.update:098][update_task]: Failed to fetch manifest from https://example.com/manifest.json"
        )
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "Failed to fetch manifest from https://example.com/manifest.json",
                "error_key": "flasher.errors.ota_device_error",
            },
        )

    async def test_strips_ansi_colour_codes_from_device_log_error(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """ESPHome delivers coloured log lines; the ANSI escape codes (and the
        component tag they wrap) must be stripped so the popover shows a clean
        message, not raw ``\\x1b[1;31m[E]...`` terminal codes. Here the reset code
        sits between ``]`` and ``:``, which also defeats the tag split — so
        without stripping first the whole raw line leaks through.
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        # This OTA was served from HA over the LAN, so the GitHub-direct retry
        # is the relevant remedy.
        mock_dm.ota_was_locally_served = MagicMock(return_value=True)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = (
            "\x1b[1;31m[E][http_request.idf:139][update_task]\x1b[0m: HTTP Request failed: ESP_ERR_HTTP_CONNECT"
        )
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "HTTP Request failed: ESP_ERR_HTTP_CONNECT",
                "error_key": "flasher.errors.ota_download_unreachable",
            },
        )

    async def test_download_failure_uses_direct_key_when_not_locally_served(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """A download-connect failure when the OTA was NOT served from HA (the
        manifest was already GitHub-direct) must use a distinct error key — the
        panel must not claim the download was "from Home Assistant" nor offer the
        pointless "Download from GitHub" retry (it was already GitHub-direct).
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        mock_dm.ota_was_locally_served = MagicMock(return_value=False)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][http_request.idf:139][update_task]: HTTP Request failed: ESP_ERR_HTTP_CONNECT"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "HTTP Request failed: ESP_ERR_HTTP_CONNECT",
                "error_key": "flasher.errors.ota_download_unreachable_direct",
            },
        )

    async def test_ignores_non_http_request_log_errors(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][wifi:123]: Connection lost"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_forwards_http_request_idf_errors(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Real failure mode: when the OTA bin fetch fails at the IDF HTTP
        client layer, the actionable log line is tagged http_request.idf,
        not http_request.ota / .update. Captured live during the heap
        exhaustion that motivated this PR — so it must surface as the
        unreachable-download error, which points at network reachability
        rather than echoing the bare ESP_ERR.
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][http_request.idf:133]: HTTP Request failed: ESP_ERR_HTTP_CONNECT"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "HTTP Request failed: ESP_ERR_HTTP_CONNECT",
                "error_key": "flasher.errors.ota_download_unreachable",
            },
        )

    async def test_forwards_actionable_set_error_flag_messages(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Component-level error flags carry the actionable failure message
        as a suffix, e.g. `http_request.update set Error flag: Failed to
        install firmware`. The previous filter blanket-skipped any line
        containing 'set Error flag', dropping these. Forward them when the
        suffix is non-trivial.
        """
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][component:420]: http_request.update set Error flag: Failed to install firmware"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "http_request.update set Error flag: Failed to install firmware",
                "error_key": "flasher.errors.ota_device_error",
            },
        )

    async def test_ignores_unspecified_set_error_flag(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The vague `http_request set Error flag: unspecified` line carries
        no actionable detail and is emitted alongside the more specific lines.
        Drop it so the user sees the useful message, not the noise."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][component:420]: http_request set Error flag: unspecified"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_ignores_cleared_error_flag(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Component recovery noise; existing behaviour preserved."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][component:420]: http_request.update cleared Error flag"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_subscribes_logs_when_not_already_subscribed(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When no log subscription is active, subscribe_logs is called."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        device_conn.is_log_subscribed = False
        device_conn.subscribe_logs = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn.subscribe_logs.assert_called_once()

    async def test_on_log_ignores_after_done(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback is ignored once a terminal event has been sent."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_state = device_conn.subscribe_states.await_args[0][0]
        on_log = device_conn.add_log_callback.call_args[0][0]

        # Send progress then success to mark done
        on_state(make_update_state(in_progress=True, has_progress=True, progress=100.0))
        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha"))
        connection.send_message.reset_mock()

        # Now send a log — should be ignored since done=True
        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][http_request.ota:100]: Some error"
        on_log(log_msg)
        connection.send_message.assert_not_called()

    async def test_on_log_ignores_non_error_level(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback ignores non-ERROR level messages."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_INFO
        log_msg.message = "[I][http_request.ota:100]: Downloading firmware"
        on_log(log_msg)
        connection.send_message.assert_not_called()

    async def test_on_log_decodes_bytes_message(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback decodes bytes messages."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = b"[E][http_request.ota:100]: OTA download failed"
        on_log(log_msg)

        from homeassistant.components.websocket_api import event_message

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent == event_message(
            1,
            {
                "state": "error",
                "message": "OTA download failed",
                "error_key": "flasher.errors.ota_device_error",
            },
        )

    async def test_on_log_ignores_empty_message(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Log callback ignores empty messages after stripping."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from aioesphomeapi import LogLevel as ESPLogLevel

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "   \n"
        on_log(log_msg)
        connection.send_message.assert_not_called()

    async def test_unsubscribe_releases_session_reference(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Unsubscribe must RELEASE the session reference taken on subscribe —
        never force-close. A device subscriber (subscribe_device) on the same
        mac shares the connection; the manager closes only when the last
        reference is released. Releasing exactly once also guards a
        double-invoked unsub from stealing another subscriber's reference."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        mock_dm.async_open_session.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

        # Trigger unsubscribe — twice, to pin the exactly-once guard.
        connection.subscriptions[1]()
        connection.subscriptions[1]()
        await hass.async_block_till_done()
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)
        mock_dm.schedule_close_session.assert_not_called()

    async def test_ignores_cleared_error_flag_log(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The 'cleared Error flag' log from http_request is not an actual error."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        on_log = device_conn.add_log_callback.call_args[0][0]

        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = "[E][component:433]: http_request.update cleared Error flag"
        on_log(log_msg)

        connection.send_message.assert_not_called()

    async def test_unsubscribe_unsubscribes_logs_we_started(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If we called subscribe_logs (because no log subscription was active),
        we must call unsubscribe_logs on _unsub. Otherwise the firmware keeps
        streaming ERROR-level logs until the connection dies."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        device_conn.is_log_subscribed = False
        device_conn.subscribe_logs = MagicMock()
        device_conn.unsubscribe_logs = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Confirm we did subscribe
        device_conn.subscribe_logs.assert_called_once()
        # Trigger unsubscribe
        connection.subscriptions[1]()
        await hass.async_block_till_done()
        device_conn.unsubscribe_logs.assert_called_once()

    async def test_unsubscribe_does_not_touch_pre_existing_log_subscription(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If logs were already subscribed before entering OTA progress, we
        leave the subscription alone on _unsub — another consumer owns it."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        # Pre-existing log subscription owned by someone else
        device_conn.is_log_subscribed = True
        device_conn.subscribe_logs = MagicMock()
        device_conn.unsubscribe_logs = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        device_conn.subscribe_logs.assert_not_called()

        connection.subscriptions[1]()
        await hass.async_block_till_done()
        device_conn.unsubscribe_logs.assert_not_called()

    async def test_unsubscribe_reverts_device_log_level_when_kept_session(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When OTA progress bumped the device's `system` log category to
        Error and the session survives our release (other subscribers still
        hold references), _unsub must restore the category to its stored
        level (or None if unconfigured) — otherwise the firmware keeps
        emitting ERROR logs after the panel closes."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)  # session kept alive by others

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Bump-up call
        device_conn._client.execute_service.assert_awaited_once_with(
            log_svc, {"category": "system", "level": "Error"}, return_response=False
        )
        device_conn._client.execute_service.reset_mock()

        connection.subscriptions[1]()
        await hass.async_block_till_done()

        # Revert call: stored config has no log_levels for this mac, so revert to None
        device_conn._client.execute_service.assert_awaited_once_with(
            log_svc, {"category": "system", "level": "None"}, return_response=False
        )

    async def test_unsubscribe_reverts_to_stored_log_level(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If the user has a stored `log_levels.system` value, revert to that
        instead of the firmware default — otherwise we'd silently disable
        their configured logging."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.store.devices = {"AA:BB:CC:DD:EE:FF": {"log_levels": {"system": "Warning"}}}
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn._client.execute_service.reset_mock()

        connection.subscriptions[1]()
        await hass.async_block_till_done()

        device_conn._client.execute_service.assert_awaited_once_with(
            log_svc, {"category": "system", "level": "Warning"}, return_response=False
        )

    async def test_unsubscribe_skips_log_level_revert_when_not_bumped(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Older firmware without epp_set_log_level: nothing was bumped, so
        nothing to revert."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={})
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn._client.execute_service.reset_mock()

        connection.subscriptions[1]()
        await hass.async_block_till_done()
        device_conn._client.execute_service.assert_not_awaited()

    async def test_errors_when_client_is_none(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If the connection is no longer alive (raced to close after the open
        returned), don't try to subscribe / bump — release the session reference
        the open just took, then downgrade to the sessionless outcome watch (do
        NOT abandon the update with an error). Without the release, the raced-out
        reference would keep the dead session's refcount from ever reaching zero."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn.connected = False  # connection vanished
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Still-valid: released the raced-out reference, never touched the dead conn.
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)
        device_conn.subscribe_states.assert_not_awaited()
        # New behaviour: establishes the subscription and runs the sessionless watch.
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(1)
        mock_dm.async_wait_for_ota_outcome.assert_awaited()

    async def test_subscribe_states_failure_reverts_bump_and_releases(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If subscribe_states raises AFTER the log-level bump, the handler must
        revert the bump, drop the log subscription it started, and release the
        session reference — otherwise the device keeps streaming ERROR logs
        forever and the session leaks — then downgrade to the sessionless outcome
        watch rather than abandoning the update with an error."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn.is_log_subscribed = False
        device_conn.subscribe_logs = MagicMock()
        device_conn.unsubscribe_logs = MagicMock()
        device_conn.subscribe_states = AsyncMock(side_effect=RuntimeError("connection is closed"))
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Downgrades to the sessionless watch — no error, subscription established.
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(1)
        mock_dm.async_wait_for_ota_outcome.assert_awaited()

        # Bump happened, then was reverted (stored config empty → "None").
        calls = device_conn._client.execute_service.await_args_list
        assert [c[0][1] for c in calls] == [
            {"category": "system", "level": "Error"},
            {"category": "system", "level": "None"},
        ]
        # The log subscription we started was torn down again.
        device_conn.unsubscribe_logs.assert_called_once()
        # The session reference taken on subscribe was released.
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)
        # Shared watcher state rolled back for the next subscriber.
        assert device_conn.ota.watchers == 0
        assert device_conn.ota.bumped_log_level is False
        assert device_conn.ota.started_log_sub is False

    async def test_subscribe_logs_failure_at_subscribe_time_downgrades_to_sessionless(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If `subscribe_logs` raises while attaching the session that was open at
        subscribe time, the handler must NOT abort. `_unsub` isn't registered until
        after the attach, so an unguarded raise would escape the handler and leak
        the watcher bump + session reference with no cleanup path. Instead it must
        unwind (release the session) and downgrade to the sessionless outcome watch,
        exactly like a subscribe_states failure."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn.is_log_subscribed = False
        # subscribe_logs is the FIRST attach step (before the log-level bump); make
        # it raise so the failure lands ahead of subscribe_states' own guard.
        device_conn.subscribe_logs = MagicMock(side_effect=RuntimeError("connection is closed"))
        device_conn.unsubscribe_logs = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="success")

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        # Must not raise out of the handler (that would abort the WS command and
        # leak the bump/session — `_unsub` isn't registered yet to clean it up).
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        # Downgrades to the sessionless watch — no error, subscription established.
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(1)
        mock_dm.async_wait_for_ota_outcome.assert_awaited()

        # The session reference taken on subscribe was released, not leaked.
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)
        # Shared watcher state rolled back for the next subscriber. We never
        # "started" the log sub (subscribe_logs itself raised), so it isn't dropped.
        assert device_conn.ota.watchers == 0
        assert device_conn.ota.bumped_log_level is False
        assert device_conn.ota.started_log_sub is False
        device_conn.unsubscribe_logs.assert_not_called()

    async def test_two_watchers_share_one_bump_and_log_subscription(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Two concurrent OTA watchers on the same device must share ONE
        epp_set_log_level bump and ONE device log subscription. The first
        unsubscribe must not revert the level or drop the log subscription
        out from under the surviving watcher; the second (last) does both."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn.is_log_subscribed = False
        device_conn.subscribe_logs = MagicMock()
        device_conn.unsubscribe_logs = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        conn_a = MagicMock()
        conn_a.subscriptions = {}
        conn_b = MagicMock()
        conn_b.subscriptions = {}
        await call_async_handler(
            hass,
            websocket_subscribe_ota_progress,
            conn_a,
            {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"},
        )
        await call_async_handler(
            hass,
            websocket_subscribe_ota_progress,
            conn_b,
            {"id": 2, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"},
        )

        # One shared bump + one shared log subscription for two watchers.
        device_conn._client.execute_service.assert_awaited_once_with(
            log_svc, {"category": "system", "level": "Error"}, return_response=False
        )
        device_conn.subscribe_logs.assert_called_once()
        assert device_conn.ota.watchers == 2
        device_conn._client.execute_service.reset_mock()

        # First unsubscribe: the other watcher still needs the bump + logs.
        conn_a.subscriptions[1]()
        await hass.async_block_till_done()
        device_conn._client.execute_service.assert_not_awaited()
        device_conn.unsubscribe_logs.assert_not_called()
        assert device_conn.ota.watchers == 1

        # Second (last) unsubscribe: revert the bump, drop the log sub.
        conn_b.subscriptions[2]()
        await hass.async_block_till_done()
        device_conn._client.execute_service.assert_awaited_once_with(
            log_svc, {"category": "system", "level": "None"}, return_response=False
        )
        device_conn.unsubscribe_logs.assert_called_once()
        assert device_conn.ota.watchers == 0

        # Each watcher released exactly one session reference.
        assert mock_dm.release_session.call_count == 2

    async def test_first_state_post_ota_emits_success_after_initial_mismatch(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """User opens the panel after the OTA started elsewhere — we missed
        the `in_progress=True` window. Treat the initial `latest!=current`
        state as a start sentinel so the eventual `latest==current` state
        fires success. Without this, a fast OTA leaves the UI stuck on
        'updating' forever."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]

        # First state: device shows update is pending (versions mismatch) but
        # in_progress=False because we missed the initial flip.
        on_state(make_update_state(in_progress=False, current_version="0.89.0", latest_version="0.90.0-alpha"))
        connection.send_message.assert_not_called()

        # Then OTA completes — versions match.
        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha"))

        from homeassistant.components.websocket_api import event_message

        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "success", "version": "0.90.0-alpha"}) in calls

    async def test_first_state_already_synced_does_not_emit(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When the panel opens with an already-up-to-date device (no OTA in
        flight, versions match) we must not emit any terminal event."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_state = device_conn.subscribe_states.await_args[0][0]

        on_state(make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha"))
        connection.send_message.assert_not_called()

    async def test_outer_timeout_emits_error_after_outer_timeout(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When OTA stalls without delivering a terminal state, the outer
        timeout fires `state: error` so the UI doesn't spin forever."""
        import asyncio
        from datetime import datetime

        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch("custom_components.eppgrid.websocket_api._firmware.async_call_later") as mock_call_later:
            await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
            on_state = device_conn.subscribe_states.await_args[0][0]

            # Simulate an OTA in progress so the outer timer is armed.
            on_state(make_update_state(in_progress=True, has_progress=True, progress=10.0))

            # Verify the timer was scheduled with the outer-timeout (240s) delay.
            assert mock_call_later.called
            assert mock_call_later.call_args[0][1] == 240
            timeout_cb = mock_call_later.call_args[0][2]

            connection.send_message.reset_mock()

            # Fire the timer.
            ret = timeout_cb(datetime.now())
            if asyncio.iscoroutine(ret):
                await ret

        connection.send_message.assert_called()
        sent = connection.send_message.call_args[0][0]
        # Event message structure: {"id": 1, "type": "event", "event": {...}}
        assert sent["event"]["state"] == "error"

    async def test_locally_served_timeout_offers_github_retry(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """A locally-served OTA that times out is most likely a device that
        couldn't reach HA to download — surface the reachability error (which
        offers the 'Download from GitHub' retry) rather than a bare timeout.
        Matters most on the sessionless path (an 'Upgrade all' non-selected
        device), where the device log that would classify a connect failure is
        unavailable."""
        import asyncio
        from datetime import datetime

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=None)  # sessionless
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="timeout")
        mock_dm.ota_was_locally_served = MagicMock(return_value=True)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        with patch("custom_components.eppgrid.websocket_api._firmware.async_call_later") as mock_call_later:
            await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
            await hass.async_block_till_done()
            assert mock_call_later.called
            timeout_cb = mock_call_later.call_args[0][2]
            connection.send_message.reset_mock()
            ret = timeout_cb(datetime.now())
            if asyncio.iscoroutine(ret):
                await ret

        sent = connection.send_message.call_args[0][0]
        assert sent["event"]["state"] == "error"
        # The download-unreachable key is what the frontend keys the
        # "Download from GitHub" button off.
        assert sent["event"]["error_key"] == "flasher.errors.ota_download_unreachable"

    async def test_github_direct_timeout_stays_generic(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """A GitHub-direct OTA that times out keeps the generic timeout error —
        the device has internet, so offering to switch source wouldn't help."""
        import asyncio
        from datetime import datetime

        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_wait_for_ota_outcome = AsyncMock(return_value="timeout")
        mock_dm.ota_was_locally_served = MagicMock(return_value=False)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        with patch("custom_components.eppgrid.websocket_api._firmware.async_call_later") as mock_call_later:
            await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
            await hass.async_block_till_done()
            timeout_cb = mock_call_later.call_args[0][2]
            connection.send_message.reset_mock()
            ret = timeout_cb(datetime.now())
            if asyncio.iscoroutine(ret):
                await ret

        sent = connection.send_message.call_args[0][0]
        assert sent["event"]["error_key"] == "flasher.errors.ota_timeout"

    async def test_outer_timeout_does_not_fire_after_terminal(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If we already emitted a terminal event, the timeout callback must
        be a no-op (and ideally the timer is cancelled)."""
        import asyncio
        from datetime import datetime

        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch("custom_components.eppgrid.websocket_api._firmware.async_call_later") as mock_call_later:
            await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
            on_state = device_conn.subscribe_states.await_args[0][0]

            on_state(make_update_state(in_progress=True, has_progress=True, progress=100.0))
            on_state(
                make_update_state(in_progress=False, current_version="0.90.0-alpha", latest_version="0.90.0-alpha")
            )

            # success was emitted
            connection.send_message.reset_mock()

            timeout_cb = mock_call_later.call_args[0][2]
            ret = timeout_cb(datetime.now())
            if asyncio.iscoroutine(ret):
                await ret

        connection.send_message.assert_not_called()

    async def test_unsubscribe_skips_log_level_revert_when_release_closes_session(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When this watcher held the LAST session reference, the release
        closes the session — anything we bumped on the device side is moot,
        so skip the revert (and the log unsubscribe)."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn.is_log_subscribed = False
        device_conn.subscribe_logs = MagicMock()
        device_conn.unsubscribe_logs = MagicMock()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        # Last reference: release_session schedules (and returns) the close.
        mock_dm.release_session = MagicMock(return_value=MagicMock())

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        device_conn._client.execute_service.reset_mock()

        connection.subscriptions[1]()
        await hass.async_block_till_done()
        device_conn._client.execute_service.assert_not_awaited()
        device_conn.unsubscribe_logs.assert_not_called()
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)


class TestEmptyUrlRaceRetry:
    """Deployed firmware's set_update_manifest races an async manifest fetch
    against a fixed 1s delay; under load the fetch loses and the OTA starts
    with an empty firmware URL, logging "URL is invalid…" then "URL not set;
    cannot start update" and no-opping. The watcher retries transparently
    (the manifest is warm) before surfacing a failure."""

    @staticmethod
    def _err(message: str) -> MagicMock:
        from aioesphomeapi import LogLevel as ESPLogLevel

        log_msg = MagicMock()
        log_msg.level = ESPLogLevel.LOG_LEVEL_ERROR
        log_msg.message = message
        return log_msg

    async def _subscribe(self, hass, config_entry):
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_resend_ota_manifest = AsyncMock()
        device_conn = make_mock_device_conn()
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        on_log = device_conn.add_log_callback.call_args[0][0]
        on_state = device_conn.subscribe_states.await_args[0][0]
        return mock_dm, connection, on_log, on_state

    async def test_url_not_set_reissues_manifest_and_suppresses_error(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        mock_dm, connection, on_log, _ = await self._subscribe(hass, config_entry)

        on_log(self._err("[E][http_request.ota:037]: URL not set; cannot start update"))
        await hass.async_block_till_done()

        mock_dm.async_resend_ota_manifest.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")
        # No terminal error surfaced — the retry is transparent.
        connection.send_message.assert_not_called()

    async def test_url_invalid_precursor_is_suppressed_without_consuming_a_retry(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The 'URL is invalid…' line always precedes 'URL not set'; only the
        latter drives the retry, so the precursor must neither error nor
        re-issue (else one failure burns two retries)."""
        mock_dm, connection, on_log, _ = await self._subscribe(hass, config_entry)

        on_log(
            self._err("[E][http_request.ota:293]: URL is invalid and/or must be prefixed with 'http://' or 'https://'")
        )
        await hass.async_block_till_done()

        mock_dm.async_resend_ota_manifest.assert_not_awaited()
        connection.send_message.assert_not_called()

    async def test_retry_is_bounded_then_surfaces_error(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        from custom_components.eppgrid.websocket_api._firmware import _OTA_EMPTY_URL_RETRY_MAX

        mock_dm, connection, on_log, _ = await self._subscribe(hass, config_entry)

        signal = "[E][http_request.ota:037]: URL not set; cannot start update"
        for _ in range(_OTA_EMPTY_URL_RETRY_MAX):
            on_log(self._err(signal))
        await hass.async_block_till_done()
        # Retried up to the cap, still no error yet.
        assert mock_dm.async_resend_ota_manifest.await_count == _OTA_EMPTY_URL_RETRY_MAX
        connection.send_message.assert_not_called()

        # One more failure past the cap → surface the error to the user.
        on_log(self._err(signal))
        await hass.async_block_till_done()
        assert mock_dm.async_resend_ota_manifest.await_count == _OTA_EMPTY_URL_RETRY_MAX
        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent["event"]["state"] == "error"

    async def test_state_steps_aside_when_no_bytes_downloaded(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """The empty-URL no-op flips in_progress True (INSTALLING) then False
        with the version unchanged, but never downloads a byte (has_progress
        never set). The state watcher must NOT declare failure on that — the
        log-driven retry owns it."""
        _, connection, _, on_state = await self._subscribe(hass, config_entry)

        on_state(make_update_state(in_progress=True, has_progress=False))
        connection.send_message.reset_mock()  # drop the "updating" event
        on_state(make_update_state(in_progress=False, current_version="1.1.0", latest_version="1.2.1"))
        await hass.async_block_till_done()

        connection.send_message.assert_not_called()
        # Stepping aside deliberately leaves the outer timeout armed as a
        # backstop (the log-driven retry owns the outcome); unsubscribe to
        # cancel it so the test doesn't leak a lingering timer.
        connection.subscriptions[1]()
        await hass.async_block_till_done()

    async def test_state_still_fails_when_real_download_then_version_unchanged(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A genuine install failure (bytes actually downloaded — has_progress
        set — then the version didn't change) must still surface immediately;
        only the zero-byte empty-URL case is deferred to the retry."""
        _, connection, _, on_state = await self._subscribe(hass, config_entry)

        on_state(make_update_state(in_progress=True, has_progress=True, progress=42.0))
        connection.send_message.reset_mock()
        on_state(make_update_state(in_progress=False, current_version="1.1.0", latest_version="1.2.1"))
        await hass.async_block_till_done()

        connection.send_message.assert_called_once()
        sent = connection.send_message.call_args[0][0]
        assert sent["event"]["state"] == "error"
        assert sent["event"]["error_key"] == "flasher.errors.ota_failed_version_unchanged"


class TestOtaProgressLiveSessionRetry:
    """Multi-device 'Upgrade all' regression: `async_trigger_ota` reboots each
    device before flashing, so at subscribe time it is usually OFFLINE and
    `async_open_session` returns None for every device except the streamed one.
    Those devices fall to the sessionless outcome watch, which reports
    success/failure but NO incremental progress bar. The device becomes
    reachable again during the download, so a background retry must (re)open a
    live session and upgrade the watcher to stream 0→100 like the streamed one.
    """

    async def test_retry_opens_session_and_streams_progress(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """First open (at subscribe) returns None (device offline); a later
        retry succeeds once the device is reachable. The retry must attach the
        live session (subscribe_states) and forward incremental `updating`
        events from the delivered UpdateState."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)
        live_conn = make_mock_device_conn()
        # Offline at subscribe time, reachable on the next retry open.
        mock_dm.async_open_session = AsyncMock(side_effect=[None, live_conn])

        # The outcome watch hangs so the retry has a window to attach before any
        # terminal event lands (a resolved outcome would set `done` and the
        # retry would stop before attaching).
        never = asyncio.Event()

        async def _hang(*args, **kwargs):
            await never.wait()

        mock_dm.async_wait_for_ota_outcome = AsyncMock(side_effect=_hang)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        # interval 0 so the retry's sleep yields once per loop turn — advance it
        # deterministically by pumping the loop rather than waiting real time.
        with patch(
            "custom_components.eppgrid.websocket_api._firmware._REBOOT_POLL_INTERVAL_S",
            0,
            create=True,
        ):
            websocket_subscribe_ota_progress(hass, connection, msg)
            for _ in range(60):
                await asyncio.sleep(0)
                if live_conn.subscribe_states.await_count:
                    break

        # The background retry opened a second session and attached the live
        # watcher (subscribe_states awaited on the re-opened connection).
        assert mock_dm.async_open_session.await_count >= 2
        live_conn.subscribe_states.assert_awaited()

        # Delivering an in-progress UpdateState now streams a progress event.
        on_state = live_conn.subscribe_states.await_args[0][0]
        on_state(make_update_state(in_progress=True, has_progress=True, progress=42.0))

        from homeassistant.components.websocket_api import event_message

        calls = [c[0][0] for c in connection.send_message.call_args_list]
        assert event_message(1, {"state": "updating", "progress": 42.0}) in calls

        # Teardown: cancel the hung outcome watch + retry, release the session.
        connection.subscriptions[1]()
        await hass.async_block_till_done()

    async def test_retry_cancelled_on_unsubscribe(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """Unsubscribing must cancel the background live-session retry — a live
        retry would keep polling `async_open_session` after the subscription is
        gone; a cancelled one stops making calls."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)
        # Always offline: the retry keeps looping (open → None → retry) until
        # cancelled, so extra calls after unsubscribe would prove it survived.
        mock_dm.async_open_session = AsyncMock(return_value=None)

        never = asyncio.Event()

        async def _hang(*args, **kwargs):
            await never.wait()

        mock_dm.async_wait_for_ota_outcome = AsyncMock(side_effect=_hang)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch(
            "custom_components.eppgrid.websocket_api._firmware._REBOOT_POLL_INTERVAL_S",
            0,
            create=True,
        ):
            websocket_subscribe_ota_progress(hass, connection, msg)
            # Let the handler start and the retry loop run several open attempts.
            for _ in range(40):
                await asyncio.sleep(0)
            opens_at_unsub = mock_dm.async_open_session.call_count
            # Initial open + at least one retry open proves the retry is running.
            assert opens_at_unsub >= 2

            # Unsubscribe cancels the retry task.
            connection.subscriptions[1]()

            # A surviving retry would keep polling; a cancelled one makes no more
            # calls no matter how long we pump.
            for _ in range(40):
                await asyncio.sleep(0)

        assert mock_dm.async_open_session.call_count == opens_at_unsub
        await hass.async_block_till_done()

    async def test_retry_rides_through_transient_failures_then_attaches(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The device flaps while downloading: the retry must survive an open
        error, a still-offline None, and a raced-closed connection, then attach
        once a healthy session opens — releasing (never leaking) the reference
        the raced-closed open took."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)
        live_conn = make_mock_device_conn()
        raced = make_mock_device_conn()
        raced.connected = False  # opened but already dead

        # Initial open (sessionless), then the retry rides through failures.
        seq: list = [
            None,  # subscribe-time open → sessionless
            RuntimeError("boom"),  # retry: open raises → swallowed
            None,  # retry: still offline
            raced,  # retry: opened but raced closed → released
            live_conn,  # retry: healthy → attach
        ]

        async def _open(mac):
            item = seq.pop(0)
            if isinstance(item, Exception):
                raise item
            return item

        mock_dm.async_open_session = AsyncMock(side_effect=_open)

        never = asyncio.Event()

        async def _hang(*args, **kwargs):
            await never.wait()

        mock_dm.async_wait_for_ota_outcome = AsyncMock(side_effect=_hang)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch(
            "custom_components.eppgrid.websocket_api._firmware._REBOOT_POLL_INTERVAL_S",
            0,
            create=True,
        ):
            websocket_subscribe_ota_progress(hass, connection, msg)
            for _ in range(200):
                await asyncio.sleep(0)
                if live_conn.subscribe_states.await_count:
                    break

        # Eventually attached the healthy session despite the flapping.
        live_conn.subscribe_states.assert_awaited()
        # The raced-closed connection's reference was released, not leaked.
        mock_dm.release_session.assert_any_call("AA:BB:CC:DD:EE:FF", raced)

        connection.subscriptions[1]()
        await hass.async_block_till_done()

    async def test_retry_attached_session_steps_aside_on_empty_url_no_op(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """The sessionless prime must NOT leak its 'started' signal into
        `_on_state`'s real-download-byte flag. After the prime, the background
        retry attaches a live session; if the pre-1.2.1 firmware hits the
        empty-URL manifest race (in_progress flips with NO bytes downloaded,
        then version unchanged), `_on_state` must STEP ASIDE for the log-driven
        retry — not emit a premature `ota_failed_version_unchanged`. A primed
        `saw_progress=True` would defeat that step-aside."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)
        live_conn = make_mock_device_conn()
        # Offline at subscribe (→ sessionless prime), reachable on the retry.
        mock_dm.async_open_session = AsyncMock(side_effect=[None, live_conn])

        never = asyncio.Event()

        async def _hang(*args, **kwargs):
            await never.wait()

        mock_dm.async_wait_for_ota_outcome = AsyncMock(side_effect=_hang)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch(
            "custom_components.eppgrid.websocket_api._firmware._REBOOT_POLL_INTERVAL_S",
            0,
            create=True,
        ):
            websocket_subscribe_ota_progress(hass, connection, msg)
            for _ in range(60):
                await asyncio.sleep(0)
                if live_conn.subscribe_states.await_count:
                    break

        live_conn.subscribe_states.assert_awaited()
        on_state = live_conn.subscribe_states.await_args[0][0]

        # Empty-URL no-op on the retry-attached session: INSTALLING with no
        # bytes (has_progress=False), then in_progress=False with the version
        # unchanged. Must step aside — the log-driven empty-URL retry owns it.
        on_state(make_update_state(in_progress=True, has_progress=False))
        on_state(make_update_state(in_progress=False, current_version="1.1.0", latest_version="1.2.1"))

        sent_keys = [c[0][0].get("event", {}).get("error_key") for c in connection.send_message.call_args_list]
        assert "flasher.errors.ota_failed_version_unchanged" not in sent_keys

        connection.subscriptions[1]()
        await hass.async_block_till_done()

    async def test_retry_recovers_when_attach_raises_midway(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """A raise INSIDE `_attach_live_session` after it set device_conn=conn
        (e.g. subscribe_logs throwing, which its own subscribe_states unwind
        never covers) must not wedge the retry: the outer handler must release
        the reference it took and clear device_conn so a later attempt can still
        attach. Without that, device_conn stays set and the loop's
        `device_conn is not None` guard stops the retry for good."""
        import asyncio

        mock_dm = await setup_integration(hass, config_entry)
        # First retry conn: subscribe_logs raises partway through attach (after
        # device_conn=conn and the watcher increment).
        wedging = make_mock_device_conn()
        wedging.is_log_subscribed = False
        wedging.subscribe_logs = MagicMock(side_effect=RuntimeError("boom"))
        # Second retry conn: healthy, attaches cleanly.
        live_conn = make_mock_device_conn()

        mock_dm.async_open_session = AsyncMock(side_effect=[None, wedging, live_conn])

        never = asyncio.Event()

        async def _hang(*args, **kwargs):
            await never.wait()

        mock_dm.async_wait_for_ota_outcome = AsyncMock(side_effect=_hang)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}

        with patch(
            "custom_components.eppgrid.websocket_api._firmware._REBOOT_POLL_INTERVAL_S",
            0,
            create=True,
        ):
            websocket_subscribe_ota_progress(hass, connection, msg)
            for _ in range(120):
                await asyncio.sleep(0)
                if live_conn.subscribe_states.await_count:
                    break

        # Recovered: attached the healthy session on the later attempt.
        live_conn.subscribe_states.assert_awaited()
        # The wedging conn's reference was released (unwound), not leaked.
        mock_dm.release_session.assert_any_call("AA:BB:CC:DD:EE:FF", wedging)

        connection.subscriptions[1]()
        await hass.async_block_till_done()
