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
        mock_dm._push_config_to_device = AsyncMock()
        mock_dm._push_pipeline_to_device = AsyncMock()
        mock_dm._entity_update_macs = set()
        mock_dm.async_update_zone_entities = AsyncMock()
        mock_dm.async_open_session = AsyncMock(return_value=None)
        mock_dm.async_close_session = AsyncMock()
        mock_dm.get_session = MagicMock(return_value=None)
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
    # Shared OTA-watcher state — real values (not MagicMock attributes) so
    # the handler's increment / compare logic behaves like production.
    conn.ota_watchers = 0
    conn.ota_started_log_sub = False
    conn.ota_bumped_log_level = False
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

    async def test_sends_error_when_no_session(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        mock_dm = await setup_integration(hass, config_entry)
        mock_dm.async_open_session = AsyncMock(return_value=None)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)
        connection.send_error.assert_called_once_with(
            1,
            "no_session",
            "Device not available",
            translation_domain=DOMAIN,
            translation_key="device_not_available",
        )

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
        not http_request.ota / .update. Captured live during the
        cross-origin-redirect heap exhaustion that motivated this PR.
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
            {"state": "error", "message": "HTTP Request failed: ESP_ERR_HTTP_CONNECT"},
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

    async def test_subscribes_logs_when_unsub_logs_is_none(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When device_conn._unsub_logs is None, subscribe_logs is called."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        device_conn._unsub_logs = None
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
        assert sent == event_message(1, {"state": "error", "message": "OTA download failed"})

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
        """If we called subscribe_logs (because _unsub_logs was None on entry),
        we must call unsubscribe_logs on _unsub. Otherwise the firmware keeps
        streaming ERROR-level logs until the connection dies."""
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn()
        device_conn._unsub_logs = None
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
        # Pre-existing log subscription: _unsub_logs is a callable set by someone else
        device_conn._unsub_logs = MagicMock()
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
        mock_dm._store.devices = {"AA:BB:CC:DD:EE:FF": {"log_levels": {"system": "Warning"}}}
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
        """If `device_conn._client` is None (connection raced to close after
        the open returned), don't try to subscribe / bump — release the
        session reference the open just took, then send an error and bail.
        Without the release, the raced-out reference would keep the dead
        session's refcount from ever reaching zero."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn._client = None  # connection vanished
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)
        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once()
        args = connection.send_error.call_args[0]
        assert args[0] == 1
        assert args[1] == "no_session"
        device_conn.subscribe_states.assert_not_awaited()
        mock_dm.release_session.assert_called_once_with("AA:BB:CC:DD:EE:FF", device_conn)

    async def test_subscribe_states_failure_reverts_bump_and_releases(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """If subscribe_states raises AFTER the log-level bump, the handler
        must revert the bump, drop the log subscription it started, release
        the session reference, and send a curated error — otherwise the
        device keeps streaming ERROR logs forever and the session leaks."""
        log_svc = MagicMock()
        mock_dm = await setup_integration(hass, config_entry)
        device_conn = make_mock_device_conn(services={"epp_set_log_level": log_svc})
        device_conn._unsub_logs = None
        device_conn.subscribe_logs = MagicMock()
        device_conn.unsubscribe_logs = MagicMock()
        device_conn.subscribe_states = AsyncMock(side_effect=RuntimeError("connection is closed"))
        mock_dm.async_open_session = AsyncMock(return_value=device_conn)

        from custom_components.eppgrid.websocket_api import websocket_subscribe_ota_progress

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": "AA:BB:CC:DD:EE:FF"}
        await call_async_handler(hass, websocket_subscribe_ota_progress, connection, msg)

        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once()
        assert connection.send_error.call_args[0][0] == 1

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
        assert device_conn.ota_watchers == 0
        assert device_conn.ota_bumped_log_level is False
        assert device_conn.ota_started_log_sub is False

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
        device_conn._unsub_logs = None
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
        assert device_conn.ota_watchers == 2
        device_conn._client.execute_service.reset_mock()

        # First unsubscribe: the other watcher still needs the bump + logs.
        conn_a.subscriptions[1]()
        await hass.async_block_till_done()
        device_conn._client.execute_service.assert_not_awaited()
        device_conn.unsubscribe_logs.assert_not_called()
        assert device_conn.ota_watchers == 1

        # Second (last) unsubscribe: revert the bump, drop the log sub.
        conn_b.subscriptions[2]()
        await hass.async_block_till_done()
        device_conn._client.execute_service.assert_awaited_once_with(
            log_svc, {"category": "system", "level": "None"}, return_response=False
        )
        device_conn.unsubscribe_logs.assert_called_once()
        assert device_conn.ota_watchers == 0

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

    async def test_outer_timeout_emits_error_after_5_minutes(
        self,
        hass: HomeAssistant,
        config_entry: MockConfigEntry,
    ) -> None:
        """When OTA stalls without delivering a terminal state, an outer 5-min
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

            # Verify the timer was scheduled with a 5-minute (300s) delay.
            assert mock_call_later.called
            assert mock_call_later.call_args[0][1] == 300
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
        device_conn._unsub_logs = None
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
