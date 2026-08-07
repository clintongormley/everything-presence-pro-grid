"""Tests for DeviceManager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
import contextlib
import json
from collections.abc import Callable
from typing import Any
from unittest.mock import ANY
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from aioesphomeapi import APIConnectionError
from aioesphomeapi import LogLevel
from aioesphomeapi import TextSensorInfo
from aioesphomeapi import TextSensorState
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import EPP_MANUFACTURER
from custom_components.eppgrid.const import EPP_MODELS
from custom_components.eppgrid.const import FIRMWARE_VERSION
from custom_components.eppgrid.const import MAX_ZONES
from custom_components.eppgrid.device_manager import DeviceConnection
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.device_manager import OtaOutcome
from custom_components.eppgrid.device_manager import _compare_firmware_version
from custom_components.eppgrid.device_manager import _extract_host
from custom_components.eppgrid.device_manager import _extract_mac
from custom_components.eppgrid.device_manager._streams import StateStream
from custom_components.eppgrid.dr_compat import all_devices
from custom_components.eppgrid.storage import EPPGridStore

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a store instance."""
    s = EPPGridStore(hass)
    return s


@pytest.fixture
def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceManager:
    """Create a DeviceManager."""
    return DeviceManager(hass, store)


# ---------------------------------------------------------------------------
# DeviceConnection tests
# ---------------------------------------------------------------------------


class TestDeviceConnection:
    """Tests for DeviceConnection API wrapper."""

    async def test_connect_and_disconnect(self) -> None:
        """Connect opens client, disconnect clears state."""
        conn = DeviceConnection("192.168.1.100")
        assert not conn.connected

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            captured_on_stop: list = []

            async def fake_connect(*, on_stop, login):
                captured_on_stop.append(on_stop)

            mock_client.connect = AsyncMock(side_effect=fake_connect)
            mock_client.list_entities_services = AsyncMock(return_value=([], []))

            async def fake_disconnect():
                # Simulate aioesphomeapi firing on_stop on disconnect.
                await captured_on_stop[0](True)

            mock_client.disconnect = AsyncMock(side_effect=fake_disconnect)

            await conn.async_connect()
            assert conn.connected
            mock_client.connect.assert_awaited_once()

            await conn.async_disconnect()
            assert not conn.connected
            mock_client.disconnect.assert_awaited_once()

    async def test_async_disconnect_releases_references_via_on_stop(self) -> None:
        """async_disconnect must drop the client + state-subscribers, but only
        once — _on_stop is the canonical clearer."""
        conn = DeviceConnection("192.168.1.100")
        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            captured_on_stop: list = []

            async def fake_connect(*, on_stop, login):
                captured_on_stop.append(on_stop)

            mock_client.connect = AsyncMock(side_effect=fake_connect)

            async def fake_disconnect():
                # Simulate aioesphomeapi firing on_stop on disconnect.
                await captured_on_stop[0](True)

            mock_client.disconnect = AsyncMock(side_effect=fake_disconnect)
            await conn.async_connect()
            cb = MagicMock()
            conn._state_subscribers.append(cb)
            await conn.async_disconnect()
            assert conn._state_subscribers == []
            assert not conn.connected

    async def test_connect_failure_disconnects(self) -> None:
        """Failed connect cleans up the client."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock(side_effect=ConnectionError("timeout"))
            mock_client.disconnect = AsyncMock()

            with pytest.raises(ConnectionError):
                await conn.async_connect()

            assert not conn.connected
            # Plain failures clean up gracefully (no force).
            mock_client.disconnect.assert_awaited_once_with()

    async def test_connect_cancelled_mid_handshake_disconnects(self) -> None:
        """Cancellation between a successful connect() and the entity/service
        listing must still disconnect the client. Callers typically wrap
        async_connect in asyncio.wait_for(..., 30); CancelledError is a
        BaseException, so a bare `except Exception` cleanup misses it — the
        connected APIClient is then orphaned (self._client never assigned, no
        handle to close it) and holds one of the ESP32's hard-limited API
        slots forever. The cleanup must use disconnect(force=True): the force
        path is synchronous inside aioesphomeapi, so it can neither be
        interrupted by a second cancellation nor stretch the caller's
        deadline."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            listing_started = asyncio.Event()

            async def hung_listing() -> None:
                listing_started.set()
                await asyncio.Event().wait()  # blocks until cancelled

            mock_client.list_entities_services = AsyncMock(side_effect=hung_listing)
            mock_client.disconnect = AsyncMock()

            task = asyncio.create_task(conn.async_connect())
            await listing_started.wait()
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task

            assert not conn.connected
            assert conn._client is None
            mock_client.disconnect.assert_awaited_once_with(force=True)

    async def test_subscribe_states_fans_out(self) -> None:
        """subscribe_states dispatches to all subscribers."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()
            mock_client.subscribe_states = MagicMock()

            await conn.async_connect()

            cb1 = MagicMock()
            cb2 = MagicMock()
            await conn.subscribe_states(cb1)
            await conn.subscribe_states(cb2)

            # Simulate a state dispatch
            conn._dispatch_state("fake_state")
            cb1.assert_called_once_with("fake_state")
            cb2.assert_called_once_with("fake_state")

    async def test_unsubscribe_states(self) -> None:
        """unsubscribe_states removes the callback."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.subscribe_states = MagicMock()

            await conn.async_connect()

            cb = MagicMock()
            await conn.subscribe_states(cb)
            conn.unsubscribe_states(cb)

            conn._dispatch_state("state")
            cb.assert_not_called()

    async def test_subscribe_states_race_subscribes_once(self) -> None:
        """Two concurrent subscribe_states calls must only call the underlying
        client.subscribe_states once."""
        conn = DeviceConnection("192.168.1.100")
        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()
            mock_client.subscribe_states = MagicMock()
            await conn.async_connect()
            cb1 = MagicMock()
            cb2 = MagicMock()
            await asyncio.gather(conn.subscribe_states(cb1), conn.subscribe_states(cb2))
            mock_client.subscribe_states.assert_called_once()

    async def test_failed_client_subscribe_does_not_kill_later_subscribers(self) -> None:
        """A raising ``client.subscribe_states`` must not latch ``_states_subscribed``.

        The client call can raise ``APIConnectionError`` when the socket dies under
        us — exactly the flap the durable state streams exist to survive. If the flag
        latched first, every LATER subscriber on this connection would append its
        callback and skip the client call: the connection is live but no state frame
        is ever dispatched (silent freeze, #334).
        """
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()
            mock_client.subscribe_states = MagicMock(side_effect=[APIConnectionError("socket closed"), None])

            await conn.async_connect()

            first = MagicMock()
            with pytest.raises(APIConnectionError):
                await conn.subscribe_states(first)

            # The failed call leaves no residue: no latched flag, no orphan callback.
            assert conn._states_subscribed is False
            assert first not in conn._state_subscribers

            second = MagicMock()
            await conn.subscribe_states(second)

            # The retry actually reaches the client, so dispatch is alive again.
            assert mock_client.subscribe_states.call_count == 2
            assert conn._states_subscribed is True
            conn._dispatch_state("state")
            second.assert_called_once_with("state")
            first.assert_not_called()

    async def test_dispatch_state_isolates_subscriber_exceptions(self) -> None:
        """A subscriber raising must not stop later subscribers from receiving
        the state."""
        conn = DeviceConnection("192.168.1.100")
        bad = MagicMock(side_effect=RuntimeError("boom"))
        good = MagicMock()
        conn._state_subscribers = [bad, good]
        conn._dispatch_state(MagicMock())
        good.assert_called_once()

    async def test_dispatch_state_drops_failed_subscriber(self) -> None:
        """A subscriber that raises is dropped after logging — keeping it
        registered would flood logs at the device's state-update rate."""
        conn = DeviceConnection("192.168.1.100")
        bad = MagicMock(side_effect=RuntimeError("boom"))
        good = MagicMock()
        conn._state_subscribers = [bad, good]
        conn._dispatch_state(MagicMock())
        # Bad subscriber dropped; only good remains.
        assert conn._state_subscribers == [good]
        # Second dispatch only hits good — bad isn't called again.
        conn._dispatch_state(MagicMock())
        assert bad.call_count == 1
        assert good.call_count == 2

    async def test_on_log_isolates_callback_exceptions(self) -> None:
        """A log callback raising must not stop later callbacks from receiving
        the message, nor propagate into aioesphomeapi's packet path."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        bad = MagicMock(side_effect=RuntimeError("boom"))
        good = MagicMock()
        conn.add_log_callback(bad)
        conn.add_log_callback(good)
        conn.subscribe_logs()
        on_log = conn._client.subscribe_logs.call_args.args[0]

        msg = MagicMock()
        msg.level = LogLevel.LOG_LEVEL_INFO
        msg.message = b"hello"
        on_log(msg)  # must not raise
        good.assert_called_once_with(msg)

    async def test_on_log_drops_failed_callback(self) -> None:
        """A log callback that raises is dropped after logging once — mirrors
        _dispatch_state: keeping it registered would flood HA logs at the
        device's log-emit rate."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        bad = MagicMock(side_effect=RuntimeError("boom"))
        good = MagicMock()
        conn.add_log_callback(bad)
        conn.add_log_callback(good)
        conn.subscribe_logs()
        on_log = conn._client.subscribe_logs.call_args.args[0]

        msg = MagicMock()
        msg.level = LogLevel.LOG_LEVEL_INFO
        msg.message = b"hello"
        on_log(msg)
        # Bad callback dropped; only good remains.
        assert conn._log_callbacks == [good]
        # Second message only hits good — bad isn't called again.
        on_log(msg)
        assert bad.call_count == 1
        assert good.call_count == 2

    async def test_unsubscribe_logs_stops_device_stream(self) -> None:
        """Dropping the local log callback alone leaves the DEVICE streaming
        log frames for the rest of the connection's lifetime (aioesphomeapi
        semantics) — unsubscribing must send a fresh subscribe at
        LOG_LEVEL_NONE so the device actually stops sending."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        conn.connected = True
        local_unsub = MagicMock()
        none_unsub = MagicMock()
        conn._client.subscribe_logs = MagicMock(side_effect=[local_unsub, none_unsub])

        conn.subscribe_logs(LogLevel.LOG_LEVEL_DEBUG)
        conn.unsubscribe_logs()

        # The original local subscription is dropped...
        local_unsub.assert_called_once()
        # ...and a second subscribe at LOG_LEVEL_NONE told the device to stop.
        assert conn._client.subscribe_logs.call_count == 2
        none_call = conn._client.subscribe_logs.call_args_list[1]
        assert none_call.kwargs.get("log_level") == LogLevel.LOG_LEVEL_NONE
        # The NONE subscription's local callback is released immediately —
        # it exists only to carry the level change to the device.
        none_unsub.assert_called_once()
        assert conn._unsub_logs is None

    async def test_unsubscribe_logs_noop_when_not_subscribed(self) -> None:
        """unsubscribe without a prior subscribe must not message the device —
        _manage_log_subscription calls it on every push when logs are off."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        conn.connected = True
        conn.unsubscribe_logs()
        conn._client.subscribe_logs.assert_not_called()

    async def test_unsubscribe_logs_tolerates_dead_connection(self) -> None:
        """Sending LOG_LEVEL_NONE over a half-dead connection must not raise —
        async_disconnect calls unsubscribe_logs right before disconnect."""
        from aioesphomeapi import APIConnectionError

        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        conn.connected = True
        local_unsub = MagicMock()
        conn._client.subscribe_logs = MagicMock(side_effect=[local_unsub, APIConnectionError("dead")])

        conn.subscribe_logs(LogLevel.LOG_LEVEL_DEBUG)
        conn.unsubscribe_logs()  # must not raise

        local_unsub.assert_called_once()
        assert conn._unsub_logs is None

    async def test_subscribe_states_raises_when_disconnected(self) -> None:
        """Subscribing on a closed connection must raise rather than silently
        appending — otherwise the caller gets back success but never receives
        any state updates (because _client is None and we'd skip the underlying
        client.subscribe_states)."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = None  # post-disconnect state
        cb = MagicMock()
        with pytest.raises(RuntimeError):
            await conn.subscribe_states(cb)
        assert cb not in conn._state_subscribers

    async def test_push_config_perspective(self) -> None:
        """push_config sends perspective coefficients to device."""
        conn = DeviceConnection("192.168.1.100")

        mock_service = MagicMock()
        mock_service.name = "epp_set_perspective"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_service]))
            mock_client.execute_service = AsyncMock()
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "calibration": {
                        "perspective": [1.0] * 8,
                        "room_width": 3000.0,
                        "room_depth": 4000.0,
                    }
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_args = mock_client.execute_service.call_args
            assert call_args[0][0] == mock_service
            assert call_args[0][1]["room_width"] == 3000.0

    async def test_push_config_no_client_raises(self) -> None:
        """push_config on a dead client must raise, not silently no-op.

        _on_stop can clear _client between get_session and the push; a silent
        return makes _do_push_config_to_device report success, leaving the
        device unsynced with the _failed_pushes recovery never armed.
        """
        from homeassistant.exceptions import HomeAssistantError

        conn = DeviceConnection("192.168.1.100")
        with pytest.raises(HomeAssistantError) as excinfo:
            await conn.async_push_config({"calibration": {"perspective": [1.0] * 8}})
        assert excinfo.value.translation_key == "device_not_connected"

    async def test_push_config_settings_translation(self) -> None:
        """Settings values are correctly translated to firmware service calls."""
        conn = DeviceConnection("192.168.1.100")

        # Create mock services for all settings-related firmware calls
        svc_env = MagicMock()
        svc_env.name = "epp_set_env_calibration"
        svc_motion = MagicMock()
        svc_motion.name = "epp_set_motion_timeout"
        svc_tracking = MagicMock()
        svc_tracking.name = "epp_set_tracking"
        svc_stuck = MagicMock()
        svc_stuck.name = "epp_set_stuck_target_timeout"
        svc_assisted = MagicMock()
        svc_assisted.name = "epp_set_assisted_clear"
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        services = [svc_env, svc_motion, svc_tracking, svc_stuck, svc_assisted, svc_static]

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], services))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": 1.5,
                        "humidity_offset": -2.0,
                        "illuminance_offset": 10.0,
                        "motion_timeout": 8.0,
                        "target_max_distance": 4.5,
                        "stuck_target_timeout": 120.0,
                        "assisted_clear_enabled": False,
                        "assisted_clear_timeout": 0.0,
                        "static_min_distance": 0.5,
                        "static_max_distance": 12.0,
                        "static_trigger_threshold": 4,
                        "static_renew_threshold": 2,
                        "static_timeout": 45.0,
                        "static_on_delay": 1.5,
                    }
                }
            )

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}

            # env_calibration: values passed through unchanged
            assert payloads["epp_set_env_calibration"] == {
                "temperature_offset": 1.5,
                "humidity_offset": -2.0,
                "illuminance_offset": 10.0,
            }

            # motion_timeout: value passed through
            assert payloads["epp_set_motion_timeout"] == {"timeout": 8.0}

            # tracking: meters converted to millimeters
            assert payloads["epp_set_tracking"] == {"max_range": 4500.0}

            # stuck_target_timeout: value passed through
            assert payloads["epp_set_stuck_target_timeout"] == {"timeout": 120.0}

            # assisted_clear: enabled + timeout passed through
            assert payloads["epp_set_assisted_clear"] == {"enabled": False, "timeout": 0.0}

            # static_presence: thresholds inverted (10 - value) onto the chip's
            # 1-9 sensitivity range, trigger_range set to max_distance,
            # led_enabled hardcoded True
            assert payloads["epp_set_static_presence"] == {
                "min_range": 0.5,
                "max_range": 12.0,
                "trigger_range": 12.0,
                "trigger_sensitivity": 6,  # 10 - 4
                "sustain_sensitivity": 8,  # 10 - 2
                "on_delay": 1.5,
                "led_enabled": True,
            }

    async def test_push_config_clamps_stale_on_delay_to_hardware_max(self) -> None:
        """A stored static_on_delay above 2s is clamped to the C4001 limit before push."""
        conn = DeviceConnection("192.168.1.100")

        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"
        services = [svc_static]

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], services))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # 15.0 was storable under the old (max=30) slider; firmware caps at 2s.
            await conn.async_push_config({"settings": {"static_on_delay": 15.0}})

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}
            assert payloads["epp_set_static_presence"]["on_delay"] == 2.0

    async def test_push_distance_override_clamps_stale_on_delay(self) -> None:
        """A stored static_on_delay above 2s is clamped when pushed via override."""
        conn = DeviceConnection("192.168.1.100")

        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"
        services = [svc_static]

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], services))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_distance_override({"static_on_delay": 15.0})

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}
            assert payloads["epp_set_static_presence"]["on_delay"] == 2.0

    async def test_push_distance_override_no_client_raises(self) -> None:
        """push_distance_override on a dead client must raise, aligned with
        async_push_config — a silent no-op reports success to the websocket
        caller while the override never reaches the device."""
        from homeassistant.exceptions import HomeAssistantError

        conn = DeviceConnection("192.168.1.100")
        with pytest.raises(HomeAssistantError) as excinfo:
            await conn.async_push_distance_override({"target_max_distance": 6.0})
        assert excinfo.value.translation_key == "device_not_connected"

    async def test_push_config_settings_defaults(self) -> None:
        """Missing settings keys fall back to correct defaults."""
        conn = DeviceConnection("192.168.1.100")

        svc_env = MagicMock()
        svc_env.name = "epp_set_env_calibration"
        svc_motion = MagicMock()
        svc_motion.name = "epp_set_motion_timeout"
        svc_tracking = MagicMock()
        svc_tracking.name = "epp_set_tracking"
        svc_stuck = MagicMock()
        svc_stuck.name = "epp_set_stuck_target_timeout"
        svc_assisted = MagicMock()
        svc_assisted.name = "epp_set_assisted_clear"
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        services = [svc_env, svc_motion, svc_tracking, svc_stuck, svc_assisted, svc_static]

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], services))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Only provide one key — rest should use defaults
            await conn.async_push_config({"settings": {"temperature_offset": 2.0}})

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}

            assert payloads["epp_set_env_calibration"] == {
                "temperature_offset": 2.0,
                "humidity_offset": 0.0,
                "illuminance_offset": 0.0,
            }
            assert payloads["epp_set_motion_timeout"] == {"timeout": 5.0}
            assert payloads["epp_set_tracking"] == {"max_range": 6000.0}
            assert payloads["epp_set_stuck_target_timeout"] == {"timeout": 300.0}
            assert payloads["epp_set_assisted_clear"] == {"enabled": True, "timeout": 5.0}
            assert payloads["epp_set_static_presence"] == {
                "min_range": 0.3,
                "max_range": 16.0,
                "trigger_range": 16.0,
                "trigger_sensitivity": 7,  # 10 - 3
                "sustain_sensitivity": 7,  # 10 - 3
                "on_delay": 0.0,
                "led_enabled": True,
            }

    async def test_push_config_pushes_static_timeout_via_dedicated_service(self) -> None:
        """static_timeout is a live zone-engine value, pushed via its own
        epp_set_static_timeout service — NOT bundled into epp_set_static_presence
        (which stops/reconfigures/restarts the DFRobot sensor for ~8s). So a
        timeout-only change updates the device without resetting the radar.
        """
        conn = DeviceConnection("192.168.1.100")
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"
        svc_static_timeout = MagicMock()
        svc_static_timeout.name = "epp_set_static_timeout"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static, svc_static_timeout]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {"static_timeout": 45.0}})

            calls = mock_client.execute_service.await_args_list
            payloads = {c.args[0].name: c.args[1] for c in calls}
            # Pushed live via the dedicated service...
            assert payloads["epp_set_static_timeout"] == {"timeout": 45.0}
            # ...and NOT bundled into the DFRobot reconfigure payload.
            assert "timeout" not in payloads["epp_set_static_presence"]

    async def test_push_config_skips_static_timeout_when_service_absent(self) -> None:
        """Firmware predating epp_set_static_timeout (a device not yet reflashed)
        must be handled gracefully: the push skips the dedicated service rather
        than raising. Backward-compatibility guard for the split-out service."""
        conn = DeviceConnection("192.168.1.100")
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"
        # epp_set_static_timeout intentionally NOT advertised by this device.

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Must not raise even though the device lacks epp_set_static_timeout.
            await conn.async_push_config({"settings": {"static_timeout": 45.0}})

            pushed = {c.args[0].name for c in mock_client.execute_service.await_args_list}
            assert "epp_set_static_timeout" not in pushed

    async def test_push_config_threshold_inverts_within_1_to_9(self) -> None:
        """Threshold 1-9 inverts to chip sensitivity 1-9 as 10 - threshold.

        Both the UI threshold and the chip's setSensitivity run 1-9. A
        threshold of 1 (easiest to trigger) maps to the chip maximum 9, and a
        threshold of 9 (hardest) maps to the chip minimum 1. Legacy values
        outside 1-9 (e.g. a 0 stored when the slider allowed it) are clamped so
        they never emit an out-of-range sensitivity.
        """

        async def push(trigger: int, renew: int) -> dict:
            conn = DeviceConnection("192.168.1.100")
            svc_static = MagicMock()
            svc_static.name = "epp_set_static_presence"
            with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
                mock_client = mock_cls.return_value
                mock_client.connect = AsyncMock()
                mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static]))
                mock_client.execute_service = AsyncMock()

                await conn.async_connect()
                await conn.async_push_config(
                    {
                        "settings": {
                            "static_trigger_threshold": trigger,
                            "static_renew_threshold": renew,
                        }
                    }
                )
                calls = mock_client.execute_service.await_args_list
                return {c.args[0].name: c.args[1] for c in calls}["epp_set_static_presence"]

        # Endpoints of the valid 1-9 range
        p = await push(1, 9)
        assert p["trigger_sensitivity"] == 9  # 10 - 1
        assert p["sustain_sensitivity"] == 1  # 10 - 9

        # Legacy out-of-range thresholds are clamped to 1-9 before inverting
        p = await push(0, 10)
        assert p["trigger_sensitivity"] == 9  # clamp 0 -> 1, 10 - 1
        assert p["sustain_sensitivity"] == 1  # clamp 10 -> 9, 10 - 9

    @staticmethod
    def _static_payloads(mock_client: MagicMock) -> list[dict]:
        """epp_set_static_presence payloads pushed via the mock, in call order."""
        return [
            call.args[1]
            for call in mock_client.execute_service.await_args_list
            if call.args[0].name == "epp_set_static_presence"
        ]

    async def test_push_config_skips_static_presence_when_unchanged(self) -> None:
        """A second push with identical static settings must NOT re-run the
        DFRobot reconfigure. That firmware action stops, reconfigures, saves,
        and restarts the static sensor (~8s blackout + a flash write), so it
        must only fire when a static parameter actually changes."""
        conn = DeviceConnection("192.168.1.100")
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            settings = {"settings": {"static_max_distance": 5.0}}
            await conn.async_push_config(settings)
            await conn.async_push_config(settings)

            assert len(self._static_payloads(mock_client)) == 1

    async def test_push_config_repushes_static_presence_when_changed(self) -> None:
        """Changing a static parameter re-runs the reconfigure with new values."""
        conn = DeviceConnection("192.168.1.100")
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {"static_max_distance": 5.0}})
            await conn.async_push_config({"settings": {"static_max_distance": 8.0}})

            payloads = self._static_payloads(mock_client)
            assert len(payloads) == 2
            assert payloads[-1]["max_range"] == 8.0

    async def test_static_cache_shared_across_connections_skips_on_refresh(self) -> None:
        """The skip cache is owned by the manager and shared (by mac) across a
        device's connections, so re-opening the session — e.g. a panel page
        refresh, which builds a NEW DeviceConnection — does not re-run the
        DFRobot reconfigure for unchanged settings. The device never left, so
        it must not be reset. (Reset happens only when the device goes offline;
        see test_device_offline_clears_static_presence_cache.)
        """
        cache: dict = {}
        mac = "AA:BB:CC:DD:EE:FF"
        settings = {"settings": {"static_max_distance": 5.0}}

        async def push_on_new_connection() -> list[dict]:
            conn = DeviceConnection("192.168.1.100", mac=mac, static_presence_cache=cache)
            svc_static = MagicMock()
            svc_static.name = "epp_set_static_presence"
            with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
                mock_client = mock_cls.return_value
                mock_client.connect = AsyncMock()
                mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static]))
                mock_client.execute_service = AsyncMock()
                await conn.async_connect()
                await conn.async_push_config(settings)
                return self._static_payloads(mock_client)

        # First connection applies static once and populates the shared cache.
        assert len(await push_on_new_connection()) == 1
        # A fresh connection (page refresh) for the same device reuses the
        # shared cache and skips the reconfigure.
        assert len(await push_on_new_connection()) == 0

    async def test_push_distance_override_updates_static_cache(self) -> None:
        """A live range override changes the device's static config, so it must
        update the skip cache. Otherwise a later save with the (unchanged)
        stored settings would be wrongly skipped, stranding the device on the
        override values."""
        conn = DeviceConnection("192.168.1.100")
        svc_static = MagicMock()
        svc_static.name = "epp_set_static_presence"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [svc_static]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {"static_max_distance": 5.0}})
            await conn.async_push_distance_override({"static_max_distance": 8.0})
            await conn.async_push_config({"settings": {"static_max_distance": 5.0}})

            payloads = self._static_payloads(mock_client)
            assert len(payloads) == 3
            assert payloads[-1]["max_range"] == 5.0

    async def test_fetch_build_flags_returns_empty_when_service_missing(self) -> None:
        """No get_build_flags service -> cacheable empty result."""
        conn = DeviceConnection("192.168.1.100")
        # Simulate post-connect state without the service.
        conn._client = MagicMock()
        conn._services = {}
        flags = await conn.async_fetch_build_flags()
        assert flags == {}

    async def test_fetch_build_flags_reraises_on_timeout(self) -> None:
        """Transient timeout must not be cached as empty -- propagate to caller."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"get_build_flags": svc}

        async def hang(*_a, **_kw):
            await asyncio.sleep(10)

        conn._client.execute_service = MagicMock(side_effect=hang)
        with pytest.raises(asyncio.TimeoutError):
            await conn.async_fetch_build_flags(timeout=0.05)

    async def test_fetch_build_flags_reraises_on_invalid_json(self) -> None:
        """Corrupt response is a real failure, not a cacheable empty answer."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"get_build_flags": svc}
        resp = MagicMock()
        resp.response_data = "not-json{"
        conn._client.execute_service = AsyncMock(return_value=resp)
        with pytest.raises(json.JSONDecodeError):
            await conn.async_fetch_build_flags()

    async def test_fetch_build_flags_raises_on_empty_response(self) -> None:
        """Empty response_data must raise -- firmware always returns a JSON object."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"get_build_flags": svc}
        resp = MagicMock()
        resp.response_data = ""
        conn._client.execute_service = AsyncMock(return_value=resp)
        with pytest.raises(ValueError):
            await conn.async_fetch_build_flags()

    async def test_fetch_build_flags_raises_on_non_dict_response(self) -> None:
        """A non-object payload (list, scalar) must raise so the cache isn't poisoned."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"get_build_flags": svc}
        resp = MagicMock()
        resp.response_data = "[1, 2, 3]"  # parses to a list, not a dict
        conn._client.execute_service = AsyncMock(return_value=resp)
        with pytest.raises(ValueError):
            await conn.async_fetch_build_flags()

    async def test_fetch_build_flags_raises_when_client_disconnected(self) -> None:
        """If the connection dropped between connect and fetch, raise rather
        than returning {} — otherwise we'd cache disconnect-during-fetch as
        'firmware doesn't expose get_build_flags' and block OTA forever."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = None
        conn._services = {}
        with pytest.raises(RuntimeError):
            await conn.async_fetch_build_flags()

    async def test_async_execute_service_runs_named_service(self) -> None:
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"epp_dismiss_target": svc}
        conn._client.execute_service = AsyncMock()
        await conn.async_execute_service("epp_dismiss_target", {"target_index": 0, "cell_index": 1})
        # Default is fire-and-forget: wrapper must pass `return_response=None`
        # so aioesphomeapi sends without waiting for an ack. Passing False
        # would arm an ExecuteServiceResponse listener that ESPHome never
        # fulfils for SUPPORTS_RESPONSE_NONE services — the wait would block
        # for the full timeout (and forever in the OTA case where the
        # firmware reboots mid-handler).
        conn._client.execute_service.assert_awaited_once_with(
            svc, {"target_index": 0, "cell_index": 1}, return_response=None
        )

    async def test_async_execute_service_does_not_block_when_firmware_never_acks(self) -> None:
        """Fire-and-forget calls must not wait for a response.

        Regression: c7b06f21 routed all service calls through a wrapper that
        defaulted return_response=False, which made aioesphomeapi wait for an
        ExecuteServiceResponse that ESPHome never sends for
        SUPPORTS_RESPONSE_NONE services. set_update_manifest reboots the
        device mid-handler, so the wait never resolved and OTA appeared to
        fail even though the firmware accepted the URL.
        """
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"set_update_manifest": svc}

        # Simulate aioesphomeapi's fire-and-forget path: when called with
        # return_response=None it returns immediately without awaiting any
        # response_event. If the wrapper passes False instead, this mock
        # would never see return_response=None — which the assertion below
        # would catch.
        conn._client.execute_service = AsyncMock(return_value=None)

        # No timeout needed because there's nothing to wait for. Use a tight
        # timeout to guard against accidental future wait_for re-introduction.
        await asyncio.wait_for(
            conn.async_execute_service("set_update_manifest", {"url": "http://example/m.json"}),
            timeout=0.5,
        )
        conn._client.execute_service.assert_awaited_once_with(
            svc, {"url": "http://example/m.json"}, return_response=None
        )

    async def test_async_execute_service_waits_when_response_requested(self) -> None:
        """When the caller asks for a response, the wrapper must wait and return it."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"slow_with_response": svc}
        sentinel = MagicMock()
        conn._client.execute_service = AsyncMock(return_value=sentinel)

        result = await conn.async_execute_service("slow_with_response", {"x": 1}, return_response=True)
        assert result is sentinel
        conn._client.execute_service.assert_awaited_once_with(svc, {"x": 1}, return_response=True)

    async def test_async_execute_service_raises_when_service_missing(self) -> None:
        from homeassistant.exceptions import HomeAssistantError

        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        conn._services = {}
        with pytest.raises(HomeAssistantError):
            await conn.async_execute_service("epp_dismiss_target", {})

    async def test_async_execute_service_raises_when_not_connected(self) -> None:
        from homeassistant.exceptions import HomeAssistantError

        conn = DeviceConnection("192.168.1.100")
        conn._client = None
        conn._services = {}
        with pytest.raises(HomeAssistantError):
            await conn.async_execute_service("epp_dismiss_target", {})

    async def test_async_execute_service_honours_timeout_when_awaiting_response(self) -> None:
        """Timeout only applies when waiting for a response — fire-and-forget has nothing to await."""
        conn = DeviceConnection("192.168.1.100")
        conn._client = MagicMock()
        svc = MagicMock()
        conn._services = {"slow": svc}

        async def hang(*_a, **_kw):
            await asyncio.sleep(10)

        conn._client.execute_service = MagicMock(side_effect=hang)
        with pytest.raises((TimeoutError, asyncio.TimeoutError)):
            await conn.async_execute_service("slow", {}, timeout=0.05, return_response=True)

    def test_mac_is_exposed_read_only(self):
        """`_on_session_lost` reads the mac back off the connection the hook hands it.

        Standalone connections (no manager) fall back to the host, matching the key the
        static-presence skip cache uses.
        """
        assert DeviceConnection("192.168.1.100", mac="AA:BB:CC:DD:EE:01").mac == "AA:BB:CC:DD:EE:01"
        assert DeviceConnection("192.168.1.100").mac == "192.168.1.100"

    async def test_on_stop_callback_fires_when_connection_drops(self):
        """The owner is told which connection stopped, after its references are released."""
        seen: list[Any] = []
        conn = DeviceConnection(
            "192.168.1.100", mac="AA:BB:CC:DD:EE:01", on_stop=lambda c: seen.append((c, c.connected))
        )

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_client_cls:
            client = mock_client_cls.return_value
            client.connect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            await conn.async_connect()
            on_stop = client.connect.call_args.kwargs["on_stop"]
            await on_stop(False)

        # Fired exactly once, carrying THIS connection (the manager matches streams
        # against it by identity), and _release_references ran first (connected already
        # False).
        assert seen == [(conn, False)]

    async def test_on_stop_callback_exception_is_swallowed(self):
        """A raising callback must not propagate into aioesphomeapi's stop path."""
        conn = DeviceConnection("192.168.1.100", on_stop=MagicMock(side_effect=RuntimeError("boom")))

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_client_cls:
            client = mock_client_cls.return_value
            client.connect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            await conn.async_connect()
            on_stop = client.connect.call_args.kwargs["on_stop"]
            await on_stop(True)  # must not raise

        assert conn.connected is False

    async def test_no_on_stop_callback_is_fine(self):
        """A connection constructed without on_stop still releases cleanly."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_client_cls:
            client = mock_client_cls.return_value
            client.connect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            await conn.async_connect()
            on_stop = client.connect.call_args.kwargs["on_stop"]
            await on_stop(False)

        assert conn.connected is False


# ---------------------------------------------------------------------------
# DeviceManager tests
# ---------------------------------------------------------------------------


class TestDeviceManager:
    """Tests for DeviceManager discovery and session management."""

    async def test_exposes_public_store(self, hass: HomeAssistant) -> None:
        """DeviceManager.store returns the store passed at construction."""
        s = EPPGridStore(hass)
        m = DeviceManager(hass, s)
        assert m.store is s

    async def test_discover_finds_firmware_version_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Discover finds ESPHome devices with firmware_version entity."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        # Create a config entry for the ESPHome device
        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.name == "EPP Living Room"
        assert dev.host == "192.168.1.50"

    async def test_discover_syncs_zone_entities_with_empty_layout_when_no_config(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Discovery syncs zone entities with an empty layout when no stored config.

        Covers the re-add case: stale zone entities from a previous installation
        must be reset, so we always call async_update_zone_entities. With no
        stored config, the empty fallback layout disables all zones and clears
        custom names.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP New",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP New",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        with patch.object(manager, "async_update_zone_entities", new_callable=AsyncMock) as mock_update:
            await manager.async_discover()

        mock_update.assert_awaited_once()
        mac_arg, zone_slots_arg = mock_update.await_args.args
        assert mac_arg == "AA:BB:CC:DD:EE:FF"
        # Empty fallback: zone 0 is a dict, all named slots are None.
        assert isinstance(zone_slots_arg[0], dict)
        assert all(slot is None for slot in zone_slots_arg[1:])

    async def test_discover_passes_malformed_zone_slots_through_to_fail_closed(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Stored zone_slots that aren't None must reach async_update_zone_entities verbatim.

        async_update_zone_entities fails closed on malformed shapes (e.g. an
        empty list or a 0.93.x length-7 layout). The empty-layout fallback
        must only fire when zone_slots is missing/None — never when it is a
        falsy-but-present malformed list — so the fail-closed path can run.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # Seed a malformed (empty list) stored layout.
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"room_layout": {"zone_slots": []}}

        with patch.object(manager, "async_update_zone_entities", new_callable=AsyncMock) as mock_update:
            await manager.async_discover()

        mock_update.assert_awaited_once()
        _mac, zone_slots_arg = mock_update.await_args.args
        # The malformed [] must reach the call; the function will fail closed.
        assert zone_slots_arg == []

    async def test_discover_ignores_non_firmware_version(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Entities without firmware_version are ignored."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.60"},
            title="Random Sensor",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "11:22:33:44:55:66")},
            name="Random Sensor",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="11:22:33:44:55:66-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        assert len(manager.devices) == 0

    async def test_rediscovery_preserves_runtime_availability(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Re-running async_discover must not reset a device's runtime state.

        async_discover re-runs whenever a new ESPHome entity appears anywhere.
        Recreating the ManagedDevice resets `available` to the dataclass
        default (False), so the next real offline transition fails the
        `dev.available` guard in `_on_state_changed` and never fires the
        device-list broadcast — the panel shows the device available through
        the whole outage.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        mac = "AA:BB:CC:DD:EE:FF"
        # Device came online at some point after the initial discovery.
        manager.devices[mac].available = True

        # A new ESPHome entity appearing anywhere re-runs discovery.
        await manager.async_discover()
        assert manager.devices[mac].available is True, "rediscovery reset runtime availability"

        # The next real offline transition must still fire the broadcast.
        fire_calls: list[None] = []
        manager.on_device_list_changed(lambda _devices: fire_calls.append(None))
        old = MagicMock()
        old.state = "1.2.3"
        new = MagicMock()
        new.state = STATE_UNAVAILABLE
        event = MagicMock()
        event.data = {"entity_id": entity.entity_id, "old_state": old, "new_state": new}
        manager._on_state_changed(event)
        await hass.async_block_till_done()

        assert len(fire_calls) == 1, "offline transition after rediscovery must fire broadcast"
        assert manager.devices[mac].available is False

    async def test_list_devices(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices returns serializable device list."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
        )
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["mac"] == "AA:BB:CC:DD:EE:FF"
        assert result[0]["name"] == "EPP Device"
        assert result[0]["available"] is True
        assert result[0]["configured"] is False
        assert result[0]["current_connection_count"] is None

    async def test_list_devices_build_flags_cannot_override_reserved_keys(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Cached build flags from the device must not clobber the base
        device fields — a buggy/malicious firmware returning e.g.
        `{"name": ..., "host": ...}` from get_build_flags would otherwise
        rewrite identity fields in the frontend payload."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
        )
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {
            "name": "EVIL",
            "host": "6.6.6.6",
            "firmware_status": "compatible",
            "model": "pro",
        }
        result = manager.list_devices()
        assert result[0]["name"] == "EPP Device"
        assert result[0]["host"] == "192.168.1.50"
        assert result[0]["firmware_status"] == "unavailable"
        # Non-colliding flags still pass through.
        assert result[0]["model"] == "pro"

    async def test_list_devices_with_stored_config(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """list_devices uses stored name when config exists."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"name": "Custom Name"}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP Device", host="192.168.1.50"
        )
        result = manager.list_devices()
        assert result[0]["name"] == "Custom Name"
        assert result[0]["configured"] is True

    async def test_list_devices_uses_fresh_name_from_registry(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reads the live device-registry name, not the cached one."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="Old Name",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        # ManagedDevice was discovered with the old name
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="Old Name",
            host="192.168.1.50",
            device_id=device.id,
        )

        # Simulate a rename via ESPHome / HA UI
        dev_reg.async_update_device(device.id, name_by_user="Renamed Device")

        result = manager.list_devices()
        assert result[0]["name"] == "Renamed Device"

    async def test_list_devices_includes_area_name(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices includes the device's area name when assigned."""
        from homeassistant.helpers import area_registry as ar

        area_reg = ar.async_get(hass)
        area = area_reg.async_create("Living Room")

        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        dev_reg.async_update_device(device.id, area_id=area.id)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            device_id=device.id,
        )

        result = manager.list_devices()
        assert result[0]["area"] == "Living Room"

    async def test_list_devices_area_is_none_when_unassigned(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices returns area=None when the device has no area assigned."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            device_id=device.id,
        )

        result = manager.list_devices()
        assert result[0]["area"] is None

    async def test_list_devices_area_is_none_when_no_device_in_registry(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices returns area=None when no device registry entry exists."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            device_id=None,
        )
        result = manager.list_devices()
        assert result[0]["area"] is None
        assert result[0]["name"] == "EPP Device"

    async def test_list_devices_payload_has_no_onboarded_key(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices must not include an 'onboarded' key in any device payload."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.55"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:05")},
            name="everything-presence-pro-aabb05",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        manager.devices["AA:BB:CC:DD:EE:05"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:05",
            name="everything-presence-pro-aabb05",
            host="192.168.1.55",
            device_id=device.id,
        )

        devices = manager.list_devices()
        assert all("onboarded" not in d for d in devices)

    async def test_list_devices_reports_live_availability_not_stale_flag(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Even if ManagedDevice.available hasn't been flipped yet, list_devices
        should return True when the underlying ESPHome entities are online."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:01")},
            name="New Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:01-sensor-online_entity",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Register the device in manager
        manager.devices["AA:BB:CC:DD:EE:01"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:01",
            name="New Device",
            host="192.168.1.50",
            device_id=device.id,
        )

        # Set entity to an online state (not unavailable, not unknown)
        hass.states.async_set(entity.entity_id, "25.5")

        # Force the cached flag to False to simulate stale state
        manager.devices["AA:BB:CC:DD:EE:01"].available = False

        # list_devices should return live availability via _is_device_available
        result = manager.list_devices()
        device_entry = next(d for d in result if d["mac"] == "AA:BB:CC:DD:EE:01")
        assert device_entry["available"] is True

    async def test_open_session_awaits_pending_close(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A pending async_close_session for the same mac must complete before
        a new async_open_session opens. Otherwise a quick close→reopen returns
        the about-to-be-closed connection — the close then disconnects the
        live session out from under the new subscriber."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        # Pre-existing connection in the active map
        existing = MagicMock()
        existing.async_disconnect = AsyncMock()
        existing.connected = True
        manager._active_connections["AA:BB:CC:DD:EE:FF"] = existing

        # Manually schedule a close like the websocket _unsub would
        manager.schedule_close_session("AA:BB:CC:DD:EE:FF")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            new_conn = mock_conn_cls.return_value
            new_conn.async_connect = AsyncMock()
            new_conn.async_disconnect = AsyncMock()
            new_conn.connected = True
            # Open session should await the pending close, then create fresh
            opened = await manager.async_open_session("AA:BB:CC:DD:EE:FF")

        assert opened is new_conn  # not the existing/about-to-close conn
        existing.async_disconnect.assert_awaited_once()
        new_conn.async_connect.assert_awaited_once()

    async def test_schedule_close_session_dedupes(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Scheduling close twice while one is in flight must not create a
        second task — close is idempotent on the active map but starting a
        second task would race the first."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        # Slow disconnect keeps the close task in flight long enough to
        # observe the dedupe behaviour.
        release = asyncio.Event()
        existing = MagicMock()

        async def slow_disconnect() -> None:
            await release.wait()

        existing.async_disconnect = AsyncMock(side_effect=slow_disconnect)
        existing.connected = True
        manager._active_connections["AA:BB:CC:DD:EE:FF"] = existing

        first_task = manager.schedule_close_session("AA:BB:CC:DD:EE:FF")
        second_task = manager.schedule_close_session("AA:BB:CC:DD:EE:FF")
        assert first_task is second_task

        release.set()
        await first_task

    async def test_state_changed_offline_transition_uses_schedule_close(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The offline-transition path in `_on_state_changed` previously did
        a raw `hass.async_create_task(self.async_close_session(...))`, leaving
        a close task that wasn't tracked by `_pending_closes` and could
        outlive `async_stop()`. It must route through `schedule_close_session`
        so the task is tracked + drained on stop."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        existing = MagicMock()
        existing.async_disconnect = AsyncMock()
        existing.connected = True
        manager._active_connections[mac] = existing

        # Wire up the registry entries the handler walks to find the mac.
        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)
        config_entry = MockConfigEntry(domain="esphome", data={})
        config_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("esphome", mac)},
            connections={(dr.CONNECTION_NETWORK_MAC, mac)},
            manufacturer="Everything Smart Technology",
            model="Everything Presence Pro Grid",
        )
        manager.devices[mac].device_id = device.id
        ent = ent_reg.async_get_or_create(
            domain="sensor",
            platform="esphome",
            unique_id="firmware_version_aa",
            device_id=device.id,
            suggested_object_id="fw",
        )

        # Synthesize the offline transition event the way HA fires it.
        from homeassistant.core import State

        old = State(ent.entity_id, "online")
        new = State(ent.entity_id, STATE_UNAVAILABLE)
        event = MagicMock()
        event.data = {"old_state": old, "new_state": new, "entity_id": ent.entity_id}

        with patch.object(manager, "schedule_close_session") as mock_sched:
            manager._on_state_changed(event)

        mock_sched.assert_called_once_with(mac)

    async def test_device_offline_clears_static_presence_cache(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Going offline clears the device's static-presence skip cache, so the
        first push after it (re)joins re-applies the DFRobot config. The cache
        otherwise persists across connection churn (page refreshes), so this
        offline→online boundary is the only time the sensor is re-reset."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._static_presence_cache[mac] = {"min_range": 0.3, "max_range": 5.0}

        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)
        config_entry = MockConfigEntry(domain="esphome", data={})
        config_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=config_entry.entry_id,
            identifiers={("esphome", mac)},
            connections={(dr.CONNECTION_NETWORK_MAC, mac)},
        )
        manager.devices[mac].device_id = device.id
        ent = ent_reg.async_get_or_create(
            domain="sensor",
            platform="esphome",
            unique_id="firmware_version_aa",
            device_id=device.id,
            suggested_object_id="fw",
        )

        from homeassistant.core import State

        old = State(ent.entity_id, "online")
        new = State(ent.entity_id, STATE_UNAVAILABLE)
        event = MagicMock()
        event.data = {"old_state": old, "new_state": new, "entity_id": ent.entity_id}

        manager._on_state_changed(event)

        assert mac not in manager._static_presence_cache

    async def test_open_and_close_session(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session creates a connection, close session cleans it up."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            conn = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            assert conn is mock_conn

            # get_session returns the active connection
            assert manager.get_session("AA:BB:CC:DD:EE:FF") is mock_conn

            await manager.async_close_session("AA:BB:CC:DD:EE:FF")
            mock_conn.async_disconnect.assert_awaited_once()

            # After close, get_session returns None
            assert manager.get_session("AA:BB:CC:DD:EE:FF") is None

    async def test_open_session_repushes_pipeline_when_subscribers_tracked(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Reopening a session while a frontend subscriber is still tracked
        re-pushes the emission pipeline, so a device flap can't leave the
        device silent until a page refresh (the 'target disappears' freeze)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._store.devices[mac] = {}
        # A grid subscriber survives the connection swap (per-mac count).
        manager.note_target_subscribe(mac, "grid_target_subs")

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls,
            patch.object(manager, "_push_pipeline_to_device", new=AsyncMock()) as mock_push,
        ):
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            await manager.async_open_session(mac)
            # Debounced, not pushed inline: the counts a mounting card is still
            # adding to must settle first (see `_request_pipeline_push`).
            mock_push.assert_not_awaited()
            # The re-push runs from a tracked task — wait for the trailing edge.
            await hass.async_block_till_done()

        mock_push.assert_awaited_once_with(mac)

    async def test_open_session_no_repush_without_subscribers(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A first session open with no tracked subscribers must NOT push a
        pipeline (avoids a redundant all-zero push on every connect)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._store.devices[mac] = {}

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls,
            patch.object(manager, "_push_pipeline_to_device", new=AsyncMock()) as mock_push,
        ):
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            await manager.async_open_session(mac)
            await hass.async_block_till_done()

        mock_push.assert_not_awaited()

    async def test_open_session_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session returns None for unknown device."""
        conn = await manager.async_open_session("00:00:00:00:00:00")
        assert conn is None

    async def test_open_session_no_host(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session returns None when device has no host."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host=None)
        conn = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
        assert conn is None

    async def test_concurrent_open_session_connects_once(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Concurrent open_session calls for same MAC only connect once."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        connect_count = 0

        async def slow_connect():
            nonlocal connect_count
            connect_count += 1
            await asyncio.sleep(0.01)  # yield so other tasks interleave

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = slow_connect
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            results = await asyncio.gather(
                manager.async_open_session("AA:BB:CC:DD:EE:FF"),
                manager.async_open_session("AA:BB:CC:DD:EE:FF"),
                manager.async_open_session("AA:BB:CC:DD:EE:FF"),
            )

            # All three should get the same connection
            assert all(r is mock_conn for r in results)
            # Only one connect attempt
            assert connect_count == 1

    async def test_open_after_scheduled_close_does_not_deadlock(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A close scheduled via schedule_close_session() must not deadlock a
        subsequent async_open_session() — _pending_closes is the serialization
        point, not the per-mac asyncio.Lock."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        seeded = MagicMock()
        seeded.async_disconnect = AsyncMock()
        seeded.connected = True
        manager._active_connections[mac] = seeded

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            fresh = mock_cls.return_value
            fresh.async_connect = AsyncMock()
            fresh.async_disconnect = AsyncMock()
            fresh.connected = True

            manager.schedule_close_session(mac)
            # Open must not deadlock; it should wait for the close, then connect a fresh conn.
            result = await asyncio.wait_for(manager.async_open_session(mac), timeout=2.0)

        assert result is fresh
        seeded.async_disconnect.assert_awaited_once()
        fresh.async_connect.assert_awaited_once()

    async def test_open_session_close_scheduled_while_queued_does_not_deadlock(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A close scheduled while a second open is QUEUED on the per-mac lock
        must not deadlock. Interleaving: open A holds the lock through a slow
        `async_connect`; open B queues on the lock; close C is scheduled (the
        device flipped offline) and its lock acquisition queues behind B. If B
        awaited the pending close while HOLDING the lock, B would wait on C
        and C on B's lock — a permanent per-mac hang."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        connect_started = asyncio.Event()
        connect_release = asyncio.Event()

        async def slow_connect() -> None:
            connect_started.set()
            await connect_release.wait()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = slow_connect
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            open_a = asyncio.create_task(manager.async_open_session(mac))
            await connect_started.wait()  # A holds the lock, inside connect

            open_b = asyncio.create_task(manager.async_open_session(mac))
            # Yield so B passes the pre-lock drain and queues on the lock.
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            assert not open_b.done()

            # Device flips offline while B is queued → close C is scheduled.
            close_c = manager.schedule_close_session(mac)

            # A finishes connect, stores the conn, releases the lock.
            connect_release.set()

            results = await asyncio.wait_for(asyncio.gather(open_a, open_b, close_c), timeout=5)

        assert results[0] is mock_conn
        assert results[1] is mock_conn
        # The queued close ran after B released the lock and tore the
        # just-stored session down — that ordering is correct: C pops
        # `_active_connections` and disconnects.
        mock_conn.async_disconnect.assert_awaited_once()
        assert manager.get_session(mac) is None

    async def test_close_session_serializes_with_in_flight_open(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """`async_close_session` called concurrently with an in-flight
        `async_open_session` must wait for the per-mac lock so it tears down
        the session open just established.

        Without the lock, close runs first against an empty `_active_connections`
        (open is still inside `async_connect`), pops nothing, and returns. Open
        then stores its fresh conn — orphaning a live session the caller of
        close believed was already gone."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        connect_started = asyncio.Event()
        connect_release = asyncio.Event()

        async def slow_connect() -> None:
            connect_started.set()
            await connect_release.wait()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = slow_connect
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            open_task = asyncio.create_task(manager.async_open_session(mac))
            await connect_started.wait()

            close_task = asyncio.create_task(manager.async_close_session(mac))
            # Yield so close can attempt to grab the lock.
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            assert not close_task.done(), (
                "async_close_session ran while async_open_session still held "
                "the per-mac lock — race window allows orphaned sessions"
            )

            connect_release.set()
            opened = await asyncio.wait_for(open_task, timeout=2.0)
            await asyncio.wait_for(close_task, timeout=2.0)

        assert opened is mock_conn
        # Close ran AFTER open and tore down the session it had just stored.
        mock_conn.async_disconnect.assert_awaited_once()
        assert manager.get_session(mac) is None

    async def test_open_session_rechecks_availability_after_connect(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """If the device transitions to unavailable while `async_connect` is in
        flight, `async_open_session` must disconnect the just-opened conn and
        return None instead of stranding a live session against a device HA
        already knows is gone."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # First availability check (pre-lock) returns True; second (post-connect) returns False.
        avail_calls: list[bool] = []

        def fake_avail(check_mac: str) -> bool:
            available = len(avail_calls) == 0
            avail_calls.append(available)
            return available

        with (
            patch.object(manager, "_is_device_available", side_effect=fake_avail),
            patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls,
        ):
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            result = await manager.async_open_session(mac)

        assert result is None, "open_session must return None when device went unavailable mid-connect"
        mock_conn.async_disconnect.assert_awaited_once()
        assert mac not in manager._active_connections
        assert len(avail_calls) >= 2, "expected pre-lock + post-connect availability checks"

    async def test_open_session_stopping_while_awaiting_pending_close_returns_none(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """`_stopping` must be re-checked after `_await_pending_close`: teardown
        beginning while a call is parked there must not let it fall through to a
        full connect + noise handshake started during/after unload — burning an
        API connection slot and leaving an untracked coroutine past async_stop."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        close_release = asyncio.Event()

        async def slow_close() -> None:
            await close_release.wait()

        pending_task = asyncio.create_task(slow_close())
        manager._pending_closes[mac] = pending_task

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            task = asyncio.create_task(manager.async_open_session(mac))
            await asyncio.sleep(0)  # let it start awaiting the pending close
            manager._stopping = True
            close_release.set()
            result = await asyncio.wait_for(task, timeout=2.0)

        assert result is None
        assert mock_conn_cls.call_count == 0, "must not construct a DeviceConnection after _stopping is set"

    async def test_open_session_stopping_mid_session_lock_returns_none(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """`_stopping` must be re-checked after acquiring `_session_locks[mac]`:
        teardown beginning while a call is queued on a contended session lock
        must not let it proceed to construct a DeviceConnection."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        lock = manager._session_locks.setdefault(mac, asyncio.Lock())
        await lock.acquire()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            task = asyncio.create_task(manager.async_open_session(mac))
            await asyncio.sleep(0)  # let it queue on the lock
            manager._stopping = True
            lock.release()
            result = await asyncio.wait_for(task, timeout=2.0)

        assert result is None
        assert mock_conn_cls.call_count == 0, "must not construct a DeviceConnection after _stopping is set"

    async def test_multiple_state_changes_push_config_once(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Multiple entities becoming available should only push config once."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        # Create multiple entities on the same device
        entities = []
        for i in range(5):
            entry = ent_reg.async_get_or_create(
                "sensor",
                "esphome",
                unique_id=f"AA:BB:CC:DD:EE:FF-sensor-sensor_{i}",
                config_entry=esphome_entry,
                device_id=device.id,
            )
            entities.append(entry)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP Device", host="192.168.1.50"
        )

        # Register the state_changed listener
        hass.bus.async_listen("state_changed", manager._on_state_changed)

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            # Fire state_changed for all entities in the same tick
            # (unavailable → available)
            for entry in entities:
                hass.states.async_set(entry.entity_id, "unavailable")
            await hass.async_block_till_done()

            for entry in entities:
                hass.states.async_set(entry.entity_id, "online")
            await hass.async_block_till_done()

            mock_push.assert_called_once_with("AA:BB:CC:DD:EE:FF")

    async def test_stop_closes_connections(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_stop closes all active connections."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True

            await manager.async_open_session("AA:BB:CC:DD:EE:FF")
            await manager.async_stop()

            mock_conn.async_disconnect.assert_awaited()

    async def test_on_device_removed_clears_connection_failed(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Removing a device must drop its mac from `_connection_failed`.
        Otherwise a same-MAC re-discovery would inherit the stale failing
        flag and suppress the first failure-transition broadcast."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._connection_failed.add(mac)

        await manager._on_device_removed(mac)
        assert mac not in manager._connection_failed

    async def test_stop_awaits_pending_closes(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_stop must drain `_pending_closes` so a slow-disconnect close
        task can't outlive teardown and keep running against a manager that
        is supposed to be stopped."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        release = asyncio.Event()
        existing = MagicMock()

        async def slow_disconnect() -> None:
            await release.wait()

        existing.async_disconnect = AsyncMock(side_effect=slow_disconnect)
        existing.connected = True
        manager._active_connections["AA:BB:CC:DD:EE:FF"] = existing

        # Schedule a close — this creates a pending task in _pending_closes.
        manager.schedule_close_session("AA:BB:CC:DD:EE:FF")
        assert "AA:BB:CC:DD:EE:FF" in manager._pending_closes

        # async_stop must complete even though the close is still in flight.
        # Release just before stop so the task can finish during the drain.
        release.set()
        await manager.async_stop()
        # All pending close tasks drained.
        assert manager._pending_closes == {}

    async def test_schedule_entity_update_clear_cancels_on_stop(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_stop must cancel pending entity-update-clear timers.

        Without this, the 60s `set.discard(mac)` timer scheduled by
        websocket_set_setup (delete-calibration path) and websocket_set_settings
        leaks past the config entry's lifetime. Production-harmless, but
        HA 2026.4+ pytest fails the test on the lingering handle.
        """
        mac = "AA:BB:CC:DD:EE:FF"

        manager._schedule_entity_update_clear(mac)

        # Mac flagged for entity-registry-update guard, cancel callable tracked.
        assert mac in manager._entity_update_macs
        assert mac in manager._entity_update_clear_cancels

        await manager.async_stop()

        # Cancel callable was invoked and dict is cleared — no lingering timer.
        assert manager._entity_update_clear_cancels == {}

    async def test_schedule_entity_update_clear_cancels_prior_for_same_mac(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Re-scheduling for the same mac cancels the previous timer instead
        of stacking handles. Otherwise the second call's timer also leaks."""
        mac = "AA:BB:CC:DD:EE:FF"

        manager._schedule_entity_update_clear(mac)
        first_cancel = manager._entity_update_clear_cancels[mac]

        manager._schedule_entity_update_clear(mac)
        second_cancel = manager._entity_update_clear_cancels[mac]

        assert first_cancel is not second_cancel, "second call must replace, not stack"
        # Only one handle tracked for this mac.
        assert len(manager._entity_update_clear_cancels) == 1

        # Clean up so the test's own teardown is leak-free.
        await manager.async_stop()

    async def test_schedule_entity_update_clear_public_wrapper(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The public schedule_entity_update_clear wrapper (the surface WS
        handlers call) arms the entity-update guard set and schedules the clear
        timer with the default delay. The private method forwards an explicit
        delay. This is the contract the websocket-API tests rely on when they
        assert only that the call was made."""
        from custom_components.eppgrid.device_manager import _ENTITY_UPDATE_CLEAR_DEFAULT

        mac = "AA:BB:CC:DD:EE:FF"

        with patch("custom_components.eppgrid.device_manager.async_call_later") as mock_later:
            manager.schedule_entity_update_clear(mac)

            assert mac in manager._entity_update_macs
            assert mac in manager._entity_update_clear_cancels
            assert mock_later.call_args[0][1] == _ENTITY_UPDATE_CLEAR_DEFAULT

            manager._schedule_entity_update_clear(mac, 5.0)

            assert mac in manager._entity_update_macs
            assert mock_later.call_args[0][1] == 5.0

    async def test_async_stop_awaits_pending_tasks(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Tasks spawned by event handlers are tracked and awaited by async_stop
        so they don't leak past the config entry's lifetime."""
        completed = asyncio.Event()

        async def slow_work():
            await asyncio.sleep(0.01)
            completed.set()

        manager._spawn(slow_work())
        assert manager._pending_tasks

        await manager.async_stop()
        assert completed.is_set()
        assert not manager._pending_tasks

    async def test_async_stop_disconnects_in_parallel_with_timeout(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A device whose disconnect hangs must not block the shutdown of others.
        async_stop must time out on hung disconnects (return_exceptions style)
        and continue clearing local state."""
        # Two connections: one hangs, one returns immediately.
        fast = MagicMock()
        fast.async_disconnect = AsyncMock()
        fast.connected = True

        hung = MagicMock()
        hung.connected = True

        async def hang(*_a, **_kw):
            await asyncio.sleep(60)

        hung.async_disconnect = AsyncMock(side_effect=hang)

        manager._active_connections = {"AA:BB:CC:DD:EE:01": fast, "AA:BB:CC:DD:EE:02": hung}

        # Set per-instance timeout very short for the test so the outer
        # wait_for doesn't trip first.
        manager._disconnect_timeout = 0.1
        await asyncio.wait_for(manager.async_stop(), timeout=2.0)

        fast.async_disconnect.assert_awaited_once()
        assert manager._active_connections == {}

    async def test_async_stop_bounds_pending_tasks_drain(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A hung tracked task (e.g. _on_device_available looping on
        retries) must not block unload. async_stop wraps the
        _pending_tasks drain in wait_for and cancels survivors."""

        async def hang() -> None:
            try:
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                # Simulate a task that swallows cancellation gracefully.
                raise

        manager._spawn(hang())
        assert manager._pending_tasks
        manager._stop_timeout = 0.1
        # Whole stop must complete within a generous bound — the
        # internal timeout is 0.1, plus a small post-cancel settle.
        await asyncio.wait_for(manager.async_stop(), timeout=2.0)
        assert not manager._pending_tasks

    async def test_async_stop_bounds_pending_closes_drain(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A schedule_close_session task whose disconnect hangs must
        not block unload. async_stop bounds the _pending_closes drain
        with the same wait_for + cancel-survivors logic."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        existing = MagicMock()
        existing.connected = True

        async def hang() -> None:
            await asyncio.sleep(60)

        existing.async_disconnect = AsyncMock(side_effect=hang)
        manager._active_connections["AA:BB:CC:DD:EE:FF"] = existing

        manager.schedule_close_session("AA:BB:CC:DD:EE:FF")
        assert manager._pending_closes

        manager._stop_timeout = 0.1
        manager._disconnect_timeout = 0.1
        await asyncio.wait_for(manager.async_stop(), timeout=2.0)
        assert manager._pending_closes == {}

    async def test_async_stop_force_releases_on_disconnect_timeout(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """When async_disconnect hangs past _disconnect_timeout,
        async_stop must call _release_references() locally so the
        manager doesn't keep a phantom-connected DeviceConnection alive
        after stop returns. aioesphomeapi's _on_stop only fires after
        client.disconnect() finishes, so a cancelled wait_for would
        otherwise leave the connection wrapper half-initialised."""
        hung = MagicMock()
        hung.connected = True
        hung._host = "192.168.1.50"
        hung._release_references = MagicMock()

        async def hang(*_a, **_kw) -> None:
            await asyncio.sleep(60)

        hung.async_disconnect = AsyncMock(side_effect=hang)

        manager._active_connections = {"AA:BB:CC:DD:EE:01": hung}
        manager._disconnect_timeout = 0.05

        await asyncio.wait_for(manager.async_stop(), timeout=2.0)

        hung._release_references.assert_called_once()
        assert manager._active_connections == {}

    async def test_async_stop_clears_entry_update_unsubs_in_phase_one(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """``_entry_update_unsubs`` must be cleared in Phase 1, BEFORE
        the task drain. Otherwise the listeners stay live during Phase 1
        and 2: a concurrent ``hass.config_entries.async_update_entry()``
        could fire ``_on_esphome_entry_updated`` against a manager
        that's already half-shut.

        The matching invariant — that an in-flight ``async_discover``
        can't re-register a freshly-cleared listener — is held by the
        ``_stopping`` flag, verified separately by
        ``test_async_stop_blocks_new_entry_listener_registration``.
        """
        events: list[str] = []
        unsub_called = MagicMock(side_effect=lambda: events.append("unsub"))
        manager._entry_update_unsubs["entry-1"] = unsub_called

        async def discover_like_task() -> None:
            # Suspend so the eager-start doesn't complete before
            # async_stop runs Phase 1 sync code.
            await asyncio.sleep(0)
            events.append("task")

        manager._spawn(discover_like_task())
        await manager.async_stop()

        # Phase 1 is synchronous and runs before the task drain — the
        # unsub must fire before the task resumes from its sleep(0).
        assert events == ["unsub", "task"], (
            f"expected entry-update unsub to fire in Phase 1 before task drain (got {events!r})"
        )
        assert manager._entry_update_unsubs == {}

    async def test_async_stop_blocks_new_entry_listener_registration(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Once ``async_stop`` has begun, ``_ensure_esphome_entry_listener``
        refuses to register new listeners — otherwise an in-flight
        ``async_discover`` could re-attach a callback we just
        unsubscribed in Phase 1, leaking it past stop.
        """
        entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"})
        entry.add_to_hass(hass)
        manager._stopping = True
        manager._ensure_esphome_entry_listener(entry.entry_id)
        assert entry.entry_id not in manager._entry_update_unsubs

    async def test_async_stop_post_cancel_drain_is_bounded(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """The post-cancel ``gather`` in ``async_stop._drain`` is wrapped
        in its own ``wait_for(_stop_timeout)``. Without that bound a
        slow-to-cooperate cancellation would extend ``async_stop`` past
        ``_stop_timeout`` — the post-cancel gather would await the task
        for as long as it took to settle, defeating the whole point of
        ``_stop_timeout`` as an upper bound on the drain phase.

        We verify the bound by patching ``asyncio.gather`` (used inside
        ``_drain``) so that the SECOND gather call — the post-cancel
        one — surfaces as a ``TimeoutError`` from ``wait_for``. If the
        second gather is unwrapped, no ``TimeoutError`` is possible
        and the task bound has been silently bypassed.
        """
        # We rely on asyncio.wait_for-vs-gather call counting in
        # ``_drain``: gather is called once for the outer drain (which
        # times out, triggering the cancel branch) and a second time
        # for the post-cancel drain (which we want to bound).
        original_gather = asyncio.gather
        gather_calls: list[asyncio.Future] = []

        def hang_second_gather(*args, **kwargs):
            # First call: real gather (outer drain). Second call onward:
            # an awaitable that never completes — the only way out of
            # the inner wait_for is via its timeout. If the production
            # code does NOT wrap in wait_for, async_stop hangs forever
            # and the outer wait_for(timeout=2.0) trips, raising
            # TimeoutError out of async_stop.
            if len(gather_calls) == 0:
                gather_calls.append(original_gather(*args, **kwargs))
                return gather_calls[0]
            never = asyncio.get_event_loop().create_future()
            gather_calls.append(never)
            return never

        async def cooperative_hang() -> None:
            try:
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                # Honour cancel — the outer drain's gather will collect
                # this and return cleanly. The bound we're testing is
                # specifically the inner gather.
                raise

        manager._spawn(cooperative_hang())
        manager._stop_timeout = 0.1

        with patch.object(asyncio, "gather", side_effect=hang_second_gather):
            # If the production code wraps the inner gather in
            # ``wait_for(_stop_timeout)``, async_stop completes within
            # ~0.2s (outer drain timeout + inner suppressed timeout).
            # If unwrapped, async_stop hangs on the never-completing
            # second gather and the outer wait_for(2.0) trips.
            await asyncio.wait_for(manager.async_stop(), timeout=2.0)

        # Sanity: both the outer and inner gather paths were exercised.
        # Phase 2 invokes _drain twice (pending_tasks, pending_closes);
        # the first _drain hits the cancel branch and calls gather a
        # second time, which is the call the bound wraps.
        assert len(gather_calls) >= 2, (
            f"expected at least 2 gather calls (outer drain + bounded inner), got {len(gather_calls)}"
        )

    async def test_read_current_connection_count_returns_value(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count returns the integer sensor value."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Test",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Test",
        )

        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-current_connections",
            suggested_object_id="epp_current_connections",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(entry.entity_id, "2")

        result = manager.read_current_connection_count(device.id)
        assert result == 2

    async def test_read_current_connection_count_returns_none_when_device_missing(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count returns None when device_id is None."""
        result = manager.read_current_connection_count(None)
        assert result is None

    async def test_read_current_connection_count_returns_none_when_sensor_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count returns None when the sensor state is unavailable."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Test",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Test",
        )

        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-current_connections",
            suggested_object_id="epp_current_connections",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(entry.entity_id, "unavailable")

        result = manager.read_current_connection_count(device.id)
        assert result is None

    async def test_manage_log_subscription_does_not_mutate_global_logger_level(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """App code must not override the user's logger: config — firmware
        filtering already drops messages we don't want to see in HA."""
        from custom_components.eppgrid.device_manager._connection import _DEVICE_LOGGER

        pre = _DEVICE_LOGGER.level
        conn = MagicMock()
        DeviceManager._manage_log_subscription(conn, {"log_levels": {"general": "Debug"}})
        assert _DEVICE_LOGGER.level == pre


# ---------------------------------------------------------------------------
# async_trigger_ota tests
# ---------------------------------------------------------------------------


def _fake_head_session(*, status: int = 200, error: Exception | None = None) -> MagicMock:
    """Build a fake aiohttp ClientSession whose ``.head()`` yields a response
    with ``status`` (or raises ``error`` on context-enter).

    The OTA pre-flight manifest check HEADs the pinned-version manifest URL
    via ``async_get_clientsession``; patching that to return one of these lets
    tests drive the 200 / 404 / unreachable branches without real sockets.
    """
    resp = MagicMock()
    resp.status = status
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(side_effect=error) if error is not None else AsyncMock(return_value=resp)
    cm.__aexit__ = AsyncMock(return_value=False)
    session = MagicMock()
    session.head = MagicMock(return_value=cm)
    return session


class TestAsyncTriggerOta:
    """Tests for DeviceManager.async_trigger_ota — manifest URL/variant logic.

    Covers the temp-conn fallback path (no live session). The
    session-reuse path is covered by ``TestAsyncTriggerOtaSessionReuse``.
    """

    @pytest.fixture(autouse=True)
    def _manifest_published(self):
        """Make the pre-flight manifest HEAD return 200 by default so the
        manifest-URL/variant tests exercise the device path, not the check."""
        with patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(status=200),
        ):
            yield

    @pytest.fixture(autouse=True)
    def _no_held_session(self, manager: DeviceManager):
        """This class covers the temp-conn fallback path (no live session).

        The trigger now opens/reuses a persistent session via
        `async_open_session` and only falls back to a temp connection when that
        returns None (device unavailable). These device_id-less test devices
        read *available*, so force `async_open_session` to None to keep
        exercising the temp-conn fallback these tests are about (the held-session
        path is covered by `TestAsyncTriggerOtaSessionReuse` and the preflight
        suite)."""
        with patch.object(manager, "async_open_session", new=AsyncMock(return_value=None)):
            yield

    def _setup_device(self, manager: DeviceManager, *, host: str | None = "192.168.1.50") -> None:
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host=host)

    def _make_mock_conn(self) -> MagicMock:
        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_disconnect = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        return mock_conn

    async def test_calls_set_update_manifest_with_wifi_variant(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {
            "bluetooth_enabled": True,
            "co2_enabled": True,
        }
        mock_conn = self._make_mock_conn()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        mock_conn.async_execute_service.assert_awaited_once()
        name, payload = mock_conn.async_execute_service.await_args.args
        assert name == "set_update_manifest"
        url = payload["url"]
        # Pinned-version manifest on GitHub Pages — same origin as the OTA bin
        # so the ESP32 only opens one TLS context.
        assert url.endswith("/wifi-ble-co2.json"), url
        assert "clintongormley.github.io/everything-presence-pro-grid/fw/v" in url, url
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_routes_lite_model_to_the_lite_variant(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A Lite must be offered Lite firmware, not the Pro build.

        The two models differ in pinout (I2C, LD2450 UART, LED), so flashing a
        Pro image onto a Lite yields a device that boots and detects nothing.
        """
        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {
            "bluetooth_enabled": True,
            "co2_enabled": True,
            "model": "everything-presence-lite",
        }
        mock_conn = self._make_mock_conn()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        _name, payload = mock_conn.async_execute_service.await_args.args
        assert payload["url"].endswith("/wifi-ble-lite.json"), payload["url"]

    async def test_lite_ignores_a_stale_ethernet_flag(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """No ethernet variant exists for the Lite, so the lookup must fail loudly.

        Falling through to the network-only mapping would hand a Lite the
        ethernet Pro build. There is no Lite firmware that could be right here,
        so refusing is the only safe answer.
        """
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {
            "ethernet_enabled": True,
            "model": "everything-presence-lite",
        }
        mock_conn = self._make_mock_conn()

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
            pytest.raises(HomeAssistantError),
        ):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        mock_conn.async_execute_service.assert_not_awaited()

    async def test_unknown_model_refuses_rather_than_guessing(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A model this integration version has never heard of gets no firmware.

        Guessing would push whichever variant happened to be first onto unknown
        hardware; the user sees an error and updates the integration instead.
        """
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"model": "everything-presence-mini"}
        mock_conn = self._make_mock_conn()

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
            pytest.raises(HomeAssistantError),
        ):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

    async def test_firmware_without_a_model_flag_is_treated_as_pro(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Builds predating the `model` flag are all Pro, and must stay upgradable.

        Those devices are in the field today; if a missing flag stopped
        resolving, their OTA button would break on upgrade.
        """
        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"ethernet_enabled": False}
        mock_conn = self._make_mock_conn()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        _name, payload = mock_conn.async_execute_service.await_args.args
        assert payload["url"].endswith("/wifi-ble-co2.json"), payload["url"]

    async def test_async_trigger_ota_passes_noise_psk_to_temp_connection(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """When no session exists, the OTA temp connection must pass noise_psk
        so encrypted ESPHome devices authenticate. Regression for the field
        regression where encrypted-device OTA broke after a refactor."""
        mac = "AA:BB:CC:DD:EE:FF"
        entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "noise_psk": "abcdef=="},
        )
        entry.add_to_hass(hass)
        manager.devices[mac] = ManagedDevice(
            mac=mac,
            name="EPP",
            host="192.168.1.50",
            esphome_config_entry_id=entry.entry_id,
        )
        manager._build_flags[mac] = {"ethernet_enabled": False}

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_conn = mock_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.async_execute_service = AsyncMock()
            mock_conn.connected = True

            await manager.async_trigger_ota(mac)

        mock_cls.assert_called_once_with(
            "192.168.1.50",
            noise_psk="abcdef==",
            mac=mac,
            static_presence_cache=manager._static_presence_cache,
        )

    async def test_temp_conn_connect_timeout_wrapped_as_ota_trigger_failed(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The OTA temp-connection fallback bounds the connect with a timeout.

        A device that accepts the TCP connection but never completes the
        ESPHome handshake used to hang async_trigger_ota forever — the temp
        connection now goes through `_temp_connection`, whose connect is
        wrapped in `asyncio.wait_for`. The timeout surfaces as the standard
        `ota_trigger_failed` HomeAssistantError.
        """
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"ethernet_enabled": False}
        # Shrink the class-level default (30 s) for the test.
        manager._temp_connection_timeout = 0.05

        async def _hang() -> None:
            await asyncio.Event().wait()

        mock_conn = self._make_mock_conn()
        mock_conn.async_connect = AsyncMock(side_effect=_hang)

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
            pytest.raises(HomeAssistantError) as excinfo,
        ):
            await asyncio.wait_for(manager.async_trigger_ota("AA:BB:CC:DD:EE:FF"), timeout=5)

        assert excinfo.value.translation_key == "ota_trigger_failed"
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_uses_ethernet_variant_when_flagged(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {
            "ethernet_enabled": True,
            "bluetooth_enabled": True,
            "co2_enabled": True,
        }
        mock_conn = self._make_mock_conn()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        _name, payload = mock_conn.async_execute_service.await_args.args
        assert payload["url"].endswith("/ethernet-ble-co2.json"), payload["url"]

    async def test_raises_device_not_found(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError) as excinfo:
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
        assert excinfo.value.translation_key == "device_not_found"

    async def test_raises_device_host_unknown(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager, host=None)
        with pytest.raises(HomeAssistantError) as excinfo:
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
        assert excinfo.value.translation_key == "device_host_unknown"

    async def test_raises_build_flags_unavailable(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        # No build flags cached
        with pytest.raises(HomeAssistantError) as excinfo:
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
        assert excinfo.value.translation_key == "build_flags_unavailable"

    async def test_wraps_unexpected_exception(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Transport errors must be wrapped in a HomeAssistantError that
        carries translation metadata so the websocket / Repairs surfaces
        can localize them — the docstring promises a translation_key on
        every failure path."""
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"bluetooth_enabled": True, "co2_enabled": True}
        mock_conn = self._make_mock_conn()
        mock_conn.async_execute_service.side_effect = ConnectionError("boom")

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
            pytest.raises(HomeAssistantError) as excinfo,
        ):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
        assert excinfo.value.translation_key == "ota_trigger_failed"
        assert excinfo.value.translation_domain
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_disconnect_failure_in_finally_does_not_propagate(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """If the cleanup `await conn.async_disconnect()` in the `finally:`
        raises (e.g. transport already torn down), it must not escape as a
        non-HA exception. The websocket handler only catches HomeAssistantError,
        so a raw exception here would surface as an uncaught error to the
        frontend after a successful OTA trigger."""

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"bluetooth_enabled": True, "co2_enabled": True}
        mock_conn = self._make_mock_conn()
        # Successful OTA trigger, but disconnect raises during cleanup.
        mock_conn.async_disconnect.side_effect = ConnectionError("disconnect boom")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            # Must not raise — cleanup failure is logged and swallowed.
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_disconnect_failure_does_not_mask_real_error(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Even when the OTA call itself fails (so we'll raise) and the
        cleanup disconnect ALSO fails, the original wrapped HomeAssistantError
        must surface — not the disconnect error."""
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"bluetooth_enabled": True, "co2_enabled": True}
        mock_conn = self._make_mock_conn()
        mock_conn.async_execute_service.side_effect = ConnectionError("execute boom")
        mock_conn.async_disconnect.side_effect = ConnectionError("disconnect boom")

        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
            pytest.raises(HomeAssistantError) as excinfo,
        ):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
        assert excinfo.value.translation_key == "ota_trigger_failed"

    async def test_concurrent_trigger_ota_rejects_second_caller(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """While an OTA is in flight for a mac, a second concurrent call
        must fail-fast rather than firing a duplicate OTA — otherwise we'd
        race two manifest pushes and possibly two reboots."""
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"bluetooth_enabled": True, "co2_enabled": True}
        mock_conn = self._make_mock_conn()

        connect_started = asyncio.Event()
        release = asyncio.Event()

        async def slow_connect() -> None:
            connect_started.set()
            await release.wait()

        mock_conn.async_connect.side_effect = slow_connect

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            first = asyncio.create_task(manager.async_trigger_ota("AA:BB:CC:DD:EE:FF"))
            await connect_started.wait()

            with pytest.raises(HomeAssistantError) as excinfo:
                await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
            assert excinfo.value.translation_key == "ota_in_progress"

            release.set()
            await first

    async def test_lock_released_after_failure(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A failed OTA still releases the lock so the user can retry."""
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"bluetooth_enabled": True, "co2_enabled": True}
        mock_conn = self._make_mock_conn()
        mock_conn.async_execute_service.side_effect = ConnectionError("boom")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn):
            with pytest.raises(HomeAssistantError):
                await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
            # Second call should succeed after first failed
            mock_conn.async_execute_service.side_effect = None
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

    async def test_raises_firmware_not_published_when_manifest_missing(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """If the pinned-version manifest 404s (the release hasn't been
        published to GitHub Pages yet), bail out immediately with a clear
        message instead of pushing an OTA the device can't fetch — which
        would otherwise silently stall until the 3-min completion poll times
        out with a misleading 'OTA failed mid-flash' error."""
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"ethernet_enabled": False}
        mock_conn = self._make_mock_conn()

        with (
            patch(
                "custom_components.eppgrid.device_manager.async_get_clientsession",
                return_value=_fake_head_session(status=404),
            ),
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
            pytest.raises(HomeAssistantError) as excinfo,
        ):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        assert excinfo.value.translation_key == "firmware_not_published"
        # Bailed before contacting the device — no manifest was pushed.
        mock_conn.async_execute_service.assert_not_awaited()

    async def test_in_progress_check_precedes_manifest_check(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A second concurrent trigger must reject with ota_in_progress BEFORE
        probing the manifest — otherwise we waste a HEAD round-trip on a call
        we'll reject anyway, and a manifest result could mask the in-progress
        error."""
        from homeassistant.exceptions import HomeAssistantError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"ethernet_enabled": False}
        mock_conn = self._make_mock_conn()

        connect_started = asyncio.Event()
        release = asyncio.Event()

        async def slow_connect() -> None:
            connect_started.set()
            await release.wait()

        mock_conn.async_connect.side_effect = slow_connect

        session = _fake_head_session(status=200)
        with (
            patch("custom_components.eppgrid.device_manager.async_get_clientsession", return_value=session),
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
        ):
            first = asyncio.create_task(manager.async_trigger_ota("AA:BB:CC:DD:EE:FF"))
            await connect_started.wait()
            assert session.head.call_count == 1  # first caller probed once

            with pytest.raises(HomeAssistantError) as excinfo:
                await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")
            assert excinfo.value.translation_key == "ota_in_progress"
            # Rejected before any manifest probe — no second HEAD.
            assert session.head.call_count == 1

            release.set()
            await first

    async def test_proceeds_when_manifest_check_unreachable(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A connectivity failure reaching the CDN *from the HA host* must NOT
        block the OTA: the device fetches the manifest itself over its own
        network path, so we fail open and let it try rather than inventing a
        new failure mode that grounds legitimate updates on a transient blip."""
        from aiohttp import ClientError

        self._setup_device(manager)
        manager._build_flags["AA:BB:CC:DD:EE:FF"] = {"ethernet_enabled": False}
        mock_conn = self._make_mock_conn()

        with (
            patch(
                "custom_components.eppgrid.device_manager.async_get_clientsession",
                return_value=_fake_head_session(error=ClientError("boom")),
            ),
            patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=mock_conn),
        ):
            await manager.async_trigger_ota("AA:BB:CC:DD:EE:FF")

        mock_conn.async_execute_service.assert_awaited_once()


# ---------------------------------------------------------------------------
# TestNoisePsk tests
# ---------------------------------------------------------------------------


class TestNoisePsk:
    async def test_extract_noise_psk_returns_psk_from_esphome_entry(self, hass: HomeAssistant) -> None:
        """Noise PSK is read from the ESPHome config entry data."""
        from custom_components.eppgrid.device_manager._helpers import _extract_noise_psk

        entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "noise_psk": "abcdef=="},
        )
        entry.add_to_hass(hass)
        assert _extract_noise_psk(entry.entry_id, hass) == "abcdef=="

    async def test_extract_noise_psk_returns_empty_when_absent(self, hass: HomeAssistant) -> None:
        from custom_components.eppgrid.device_manager._helpers import _extract_noise_psk

        entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"})
        entry.add_to_hass(hass)
        assert _extract_noise_psk(entry.entry_id, hass) == ""

    async def test_extract_noise_psk_returns_empty_when_entry_missing(self, hass: HomeAssistant) -> None:
        from custom_components.eppgrid.device_manager._helpers import _extract_noise_psk

        assert _extract_noise_psk(None, hass) == ""
        assert _extract_noise_psk("does_not_exist", hass) == ""

    async def test_open_session_passes_noise_psk_to_connection(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_open_session must pass the ESPHome entry's noise_psk through to
        DeviceConnection so encrypted devices connect."""
        entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50", "noise_psk": "abcdef=="},
        )
        entry.add_to_hass(hass)
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP",
            host="192.168.1.50",
            esphome_config_entry_id=entry.entry_id,
        )
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_conn = mock_cls.return_value
            mock_conn.async_connect = AsyncMock()
            mock_conn.async_disconnect = AsyncMock()
            mock_conn.connected = True
            await manager.async_open_session("AA:BB:CC:DD:EE:FF")
        mock_cls.assert_called_once_with(
            "192.168.1.50",
            noise_psk="abcdef==",
            mac="AA:BB:CC:DD:EE:FF",
            static_presence_cache=manager._static_presence_cache,
            # A `partial` — identity-compared, so pinned by its own test
            # (`test_open_session_passes_on_stop_hook`) rather than here.
            on_stop=ANY,
        )


# ---------------------------------------------------------------------------
# TestFirmwareVersion tests
# ---------------------------------------------------------------------------


class TestFirmwareVersion:
    """Tests for firmware version detection and comparison."""

    # --- _compare_firmware_version helper ---

    def test_compare_firmware_version_compatible(self) -> None:
        """Returns 'compatible' when device version matches required version."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        assert _compare_firmware_version(FIRMWARE_VERSION) == "compatible"

    def test_compare_firmware_version_behind(self) -> None:
        """Returns 'firmware_behind' when device version is older."""
        assert _compare_firmware_version("0.1.0") == "firmware_behind"

    def test_compare_firmware_version_ahead(self) -> None:
        """Returns 'firmware_ahead' when device version is newer."""
        assert _compare_firmware_version("99.0.0") == "firmware_ahead"

    def test_compare_firmware_version_unparseable_returns_none(self) -> None:
        """Unparseable version strings return None so callers can normalize
        to 'unavailable'. Returning a raw 'firmware_unknown' would leak to
        the frontend, whose firmware-status union doesn't recognise it."""
        assert _compare_firmware_version("not-a-version") is None
        assert _compare_firmware_version("") is None
        assert _compare_firmware_version("a.b.c") is None

    def test_compare_firmware_version_zero(self) -> None:
        """A real '0.0.0' is parseable and compares as 'firmware_behind'.

        Note: '0.0.0' is no longer used anywhere as a synthetic sentinel —
        ``read_firmware_version`` now returns ``None`` for unknown firmware,
        precisely so a real '0.0.0' wouldn't collide with the sentinel.
        """
        assert _compare_firmware_version("0.0.0") == "firmware_behind"

    async def test_sync_firmware_repair_issue_skips_unknown(self, hass: HomeAssistant) -> None:
        """An unparseable firmware version must not raise a Repairs issue."""
        from homeassistant.helpers import issue_registry as ir

        from custom_components.eppgrid.device_manager._helpers import _sync_firmware_repair_issue

        _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:FF", device_name="EPP", fw_ver="garbage-version")
        issues = ir.async_get(hass).issues
        assert not any(k[1].startswith("firmware_") and "AA:BB:CC:DD:EE:FF" in k[1] for k in issues)

    # --- read_firmware_version ---

    async def test_read_firmware_version_returns_version_string(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version returns version string from text sensor state."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, "0.90.0-alpha")

        result = manager.read_firmware_version(device.id)
        assert result == "0.90.0-alpha"

    async def test_read_firmware_version_returns_none_when_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version returns None when state is unavailable."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, "unavailable")

        result = manager.read_firmware_version(device.id)
        assert result is None

    async def test_read_firmware_version_returns_none_when_device_id_none(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Without a device_id we have no entity to read — None means 'unknown'.

        Returning a synthetic '0.0.0' would collide with a real (very old)
        firmware version and trigger a fake 'firmware_behind' Repairs issue.
        """
        assert manager.read_firmware_version(None) is None

    async def test_read_firmware_version_returns_none_when_no_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """No firmware_version entity → None ('unknown'), not '0.0.0'."""
        dev_reg = dr.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )
        # No firmware_version entity created

        assert manager.read_firmware_version(device.id) is None

    async def test_no_firmware_version_does_not_create_repair_issue(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A device with no firmware_version entity must not raise a fake
        'firmware_behind' Repairs issue.

        ``read_firmware_version`` returns ``None`` for unknown firmware, and
        ``_sync_firmware_repair_issue`` treats ``None`` as 'leave alone' —
        no synthetic '0.0.0' that the comparator would mark as behind.
        """
        from homeassistant.helpers import issue_registry as ir

        from custom_components.eppgrid.device_manager._helpers import _sync_firmware_repair_issue

        fw = manager.read_firmware_version(None)
        _sync_firmware_repair_issue(
            hass,
            mac="AA:BB:CC:DD:EE:FF",
            device_name="EPP",
            fw_ver=fw,
        )
        issues = ir.async_get(hass).issues
        assert not any("AA:BB:CC:DD:EE:FF" in k[1] for k in issues)

    # --- list_devices firmware_status ---

    async def test_list_devices_includes_firmware_status_compatible(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reads live firmware version and reports compatible when versions match."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["firmware_status"] == "compatible"

    async def test_list_devices_firmware_status_unavailable_when_no_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports 'unavailable' when no firmware_version entity exists.

        Previously a missing entity yielded a synthetic '0.0.0' that compared
        as 'firmware_behind' — a fake "behind" state for every non-EPP device.
        With ``read_firmware_version`` now returning ``None``, the ternary in
        ``list_devices`` short-circuits to 'unavailable' instead.
        """
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id="fake_device_id",
        )
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "unavailable"

    async def test_list_devices_firmware_status_firmware_ahead(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports firmware_ahead when device firmware is newer."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, "99.0.0")

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "firmware_ahead"

    async def test_list_devices_unparseable_firmware_version_reports_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """An unparseable firmware version must surface as 'unavailable' to
        the frontend, not as a raw 'firmware_unknown' string the UI doesn't
        know about. Frontend firmware-status types only enumerate
        compatible / firmware_behind / firmware_ahead / unavailable / unknown."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # A live but unparseable value (truncated git describe, garbled OTA, …)
        hass.states.async_set(fw_entry.entity_id, "garbage")

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "unavailable"

    async def test_list_devices_reads_firmware_version_live(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices picks up firmware version changes without re-discovery."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP Device",
            host="192.168.1.50",
            available=True,
            device_id=device.id,
        )

        # State starts unavailable → None → unavailable
        hass.states.async_set(fw_entry.entity_id, "unavailable")
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "unavailable"

        # State updates to compatible version → compatible
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "compatible"

    async def test_discover_does_not_cache_firmware_version(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_discover detects firmware_version entities and list_devices reports compatible."""
        from custom_components.eppgrid.const import FIRMWARE_VERSION

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        # Firmware version is read live, so list_devices should report compatible
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "compatible"

    async def test_discover_no_firmware_version_entity_reports_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """list_devices reports unavailable when firmware_version entity has no state."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # No firmware state entity with a version value

        await manager.async_discover()

        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        result = manager.list_devices()
        assert result[0]["firmware_status"] == "unavailable"


# ---------------------------------------------------------------------------
# async_wait_for_ota_outcome tests
# ---------------------------------------------------------------------------


class TestAsyncWaitForOtaOutcome:
    """Classify an OTA outcome off the durable firmware-version signal.

    All cases drive a fake clock (sleep advances it, monotonic reads it) so no
    real time passes, and feed a scripted sequence of firmware-version reads.
    """

    def _mgr_with_device(self, manager):
        from unittest.mock import MagicMock

        dev = MagicMock()
        dev.device_id = "dev1"
        manager.devices["AA:BB:CC:DD:EE:FF"] = dev
        return manager

    async def _run(self, manager, versions, download_started, *, abort_stable_s=10.0, timeout_s=1000.0):
        from unittest.mock import Mock
        from unittest.mock import patch

        import custom_components.eppgrid.device_manager as dm_mod

        clock = {"t": 0.0}

        async def fake_sleep(s):
            clock["t"] += s

        manager.read_firmware_version = Mock(side_effect=versions)
        with (
            patch.object(dm_mod.time, "monotonic", lambda: clock["t"]),
            patch.object(dm_mod.asyncio, "sleep", fake_sleep),
        ):
            return await manager.async_wait_for_ota_outcome(
                "AA:BB:CC:DD:EE:FF",
                "1.9.0",
                timeout_s,
                abort_stable_s,
                download_started,
            )

    async def test_success(self, manager: DeviceManager) -> None:
        """Device comes back on the target version → 'success'."""
        self._mgr_with_device(manager)
        outcome = await self._run(manager, ["1.9.0"], lambda: True)
        assert outcome == "success"

    async def test_aborted_when_old_version_stays_stable(self, manager: DeviceManager) -> None:
        """After download started, the device goes offline then settles back on the
        OLD version and stays there continuously past ``abort_stable_s`` → 'aborted'.

        Fake clock steps 2s/poll: arm@old, offline@t2 sets went_offline,
        old@t4 sets old_stable_since=4, old@t6 (2s elapsed), old@t8 (4s > 3s) →
        aborted.
        """
        self._mgr_with_device(manager)
        outcome = await self._run(
            manager,
            ["1.8.0", None, "1.8.0", "1.8.0", "1.8.0"],
            lambda: True,
            abort_stable_s=3.0,
        )
        assert outcome == "aborted"

    async def test_single_offline_blip_does_not_abort(self, manager: DeviceManager) -> None:
        """A lone old-version reading between two offline reads (a between-chunk
        blip during the blocking fetch) resets the stable-old clock, so it never
        accumulates toward an abort — the device then returns on target → 'success'.
        This is the critical debounce guard for a still-downloading device.
        """
        self._mgr_with_device(manager)
        outcome = await self._run(
            manager,
            ["1.8.0", None, "1.8.0", None, "1.9.0"],
            lambda: True,
            abort_stable_s=5.0,
        )
        assert outcome == "success"

    async def test_pre_ota_reboot_not_mistaken_for_abort(self, manager: DeviceManager) -> None:
        """The pre-OTA reboot (offline→back-on-old BEFORE download starts) must
        not arm the abort detection, so a healthy update still reports 'success'.
        """
        self._mgr_with_device(manager)
        calls = {"n": 0}

        def started():
            calls["n"] += 1
            # Stays False through the pre-OTA reboot cycle; flips True only after.
            return calls["n"] > 3

        # old, pre-OTA-reboot offline, back-old, (armed) old, apply-reboot offline, new
        versions = ["1.8.0", None, "1.8.0", "1.8.0", None, "1.9.0"]
        outcome = await self._run(manager, versions, started)
        assert outcome == "success"

    async def test_timeout(self, manager: DeviceManager) -> None:
        """None of success/aborted before timeout_s elapses → 'timeout'.

        Online on the old version forever WITHOUT ever going offline must NOT
        abort — ``went_offline`` stays False, so the stable-old window is never
        consulted and the outer timer owns the outcome.
        """
        self._mgr_with_device(manager)
        outcome = await self._run(
            manager,
            ["1.8.0"] * 10,
            lambda: True,
            timeout_s=6.0,
        )
        assert outcome == "timeout"

    async def test_no_device_returns_timeout(self, manager: DeviceManager) -> None:
        """Unknown MAC (no device / no device_id) → 'timeout' (never watched)."""
        outcome = await manager.async_wait_for_ota_outcome(
            "AA:BB:CC:DD:EE:FF",
            "1.9.0",
            1000.0,
            90.0,
            lambda: True,
        )
        assert outcome == "timeout"

    async def test_listener_catches_offline_blip_the_poll_misses(
        self, hass: HomeAssistant, manager: DeviceManager, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A hard unplug shows up as a sub-poll `unavailable` blip. The poll never
        sees it (here read_firmware_version is stubbed to ALWAYS return the old
        version), so only the state-change listener can latch went_offline → abort.
        Regression for: on real hardware the 2s poll missed the <1s blip and the
        OTA hung to the timeout instead of fast-failing."""
        import custom_components.eppgrid.device_manager as dm_mod

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP OTA",
        )
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP OTA",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        entity_id = entry.entity_id

        dev = MagicMock()
        dev.device_id = device.id
        manager.devices["AA:BB:CC:DD:EE:FF"] = dev

        hass.states.async_set(entity_id, "1.8.0")
        # Poll NEVER sees offline — only the listener can:
        monkeypatch.setattr(manager, "read_firmware_version", lambda *a, **k: "1.8.0")
        monkeypatch.setattr(dm_mod, "_REBOOT_POLL_INTERVAL_S", 0.01)
        task = asyncio.create_task(
            manager.async_wait_for_ota_outcome("AA:BB:CC:DD:EE:FF", "1.9.0", 1.0, 0.05, lambda: True)
        )
        await asyncio.sleep(0.03)  # let it arm and poll "1.8.0" a few times
        hass.states.async_set(entity_id, STATE_UNAVAILABLE)  # the fleeting blip…
        hass.states.async_set(entity_id, "1.8.0")  # …and back, same tick
        await hass.async_block_till_done()  # listener runs → went_offline
        outcome = await asyncio.wait_for(task, 2.0)
        assert outcome == OtaOutcome.ABORTED

    async def test_transient_blip_does_not_prematurely_abort_a_completing_download(
        self, hass: HomeAssistant, manager: DeviceManager, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A transient offline blip mid-download must not abort a download that
        then completes. HA holds the stale old version through the outage, so
        `old_stable_since` is already older than `abort_stable_s` when the listener
        flips `went_offline`; without resetting the clock on the blip the abort
        debounce would be satisfied immediately and false-abort. The listener
        resets it, so a version that reaches target shortly after the blip is
        SUCCESS, not a false ABORTED."""
        import custom_components.eppgrid.device_manager as dm_mod

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.51"}, title="EPP OTA2")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:fe")},
            name="EPP OTA2",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FE-sensor-firmware_version",
            suggested_object_id="epp_firmware_version_2",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        entity_id = entry.entity_id

        dev = MagicMock()
        dev.device_id = device.id
        manager.devices["AA:BB:CC:DD:EE:FE"] = dev

        version = {"v": "1.8.0"}
        hass.states.async_set(entity_id, "1.8.0")
        monkeypatch.setattr(manager, "read_firmware_version", lambda *a, **k: version["v"])
        monkeypatch.setattr(dm_mod, "_REBOOT_POLL_INTERVAL_S", 0.01)
        # Sit on the old version well past abort_stable_s (0.1) so a non-reset
        # clock would already read "stable" the instant the blip flips went_offline.
        task = asyncio.create_task(
            manager.async_wait_for_ota_outcome("AA:BB:CC:DD:EE:FE", "1.9.0", 2.0, 0.1, lambda: True)
        )
        await asyncio.sleep(0.3)  # old_stable_since accumulates >> abort_stable_s
        hass.states.async_set(entity_id, STATE_UNAVAILABLE)  # transient blip…
        hass.states.async_set(entity_id, "1.8.0")  # …recovers
        await hass.async_block_till_done()  # listener: went_offline + RESET old_stable_since
        await asyncio.sleep(0.02)  # brief — well within abort_stable_s
        version["v"] = "1.9.0"  # download completes
        outcome = await asyncio.wait_for(task, 2.0)
        assert outcome == OtaOutcome.SUCCESS


class TestFirmwareVersionEntityId:
    """_firmware_version_entity_id: resolve the FW-version sensor's entity_id."""

    async def test_none_device_id_returns_none(self, manager: DeviceManager) -> None:
        """No device_id → None (nothing to subscribe to)."""
        assert manager._firmware_version_entity_id(None) is None

    async def test_looks_up_entity_when_entries_not_supplied(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """With entries omitted, it scans the registry itself and returns the
        firmware-version sensor's entity_id."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            suggested_object_id="epp_firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        assert manager._firmware_version_entity_id(device.id) == entry.entity_id

    async def test_no_matching_entity_returns_none(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A device with no firmware-version sensor → None (self-lookup path)."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        assert manager._firmware_version_entity_id(device.id) is None


# ---------------------------------------------------------------------------
# Push config tests
# ---------------------------------------------------------------------------


class TestPushConfig:
    """Tests for DeviceConnection.async_push_config — grid, zones, settings."""

    async def test_push_config_grid(self) -> None:
        """push_config sends base64-encoded grid data with origin."""
        conn = DeviceConnection("192.168.1.100")

        mock_perspective = MagicMock()
        mock_perspective.name = "epp_set_perspective"
        mock_grid = MagicMock()
        mock_grid.name = "epp_set_grid"
        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_perspective, mock_grid, mock_zones]))
            mock_client.execute_service = AsyncMock()
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "calibration": {
                        "perspective": [1.0] * 8,
                        "room_width": 3000.0,
                        "room_depth": 4000.0,
                    },
                    "room_layout": {
                        "grid_bytes": [0] * 100,
                        "zone_slots": [
                            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
                            {"name": "Office"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            # Should have called perspective, grid, and zones
            assert mock_client.execute_service.await_count == 3
            # Check grid call has grid_data (base64)
            grid_call = mock_client.execute_service.call_args_list[1]
            assert "grid_data" in grid_call[0][1]
            assert "origin_x" in grid_call[0][1]

    async def test_push_config_zones(self) -> None:
        """push_config sends zone configuration JSON."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {"type": "hallway", "trigger": 3, "renew": 2, "timeout": 5.0, "handoff_timeout": 2.0},
                            {"name": "Living"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_data = mock_client.execute_service.call_args[0][1]
            assert "zones_json" in call_data

    async def test_push_config_skips_zones_on_malformed_length(self, caplog: pytest.LogCaptureFixture) -> None:
        """Malformed zone_slots (wrong length) skips zone push, logs a warning, other pushes still run."""
        conn = DeviceConnection("192.168.1.100")

        mock_perspective = MagicMock()
        mock_perspective.name = "epp_set_perspective"
        mock_grid = MagicMock()
        mock_grid.name = "epp_set_grid"
        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_perspective, mock_grid, mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            import logging

            with caplog.at_level(logging.WARNING, logger="custom_components.eppgrid.device_manager"):
                await conn.async_push_config(
                    {
                        "calibration": {
                            "perspective": [1.0] * 8,
                            "room_width": 3000.0,
                            "room_depth": 4000.0,
                        },
                        "room_layout": {
                            "grid_bytes": [0] * 100,
                            # Length-7: malformed, missing zone 0 slot.
                            "zone_slots": [{"name": "X", "color": "#000", "type": "default"}] + [None] * 6,
                        },
                    }
                )

            # Warning logged about the malformed slots.
            assert any("zone_slots" in rec.getMessage().lower() for rec in caplog.records)
            # Perspective + grid pushed, but NOT zones.
            call_services = [c[0][0] for c in mock_client.execute_service.await_args_list]
            assert mock_perspective in call_services
            assert mock_grid in call_services
            assert mock_zones not in call_services

    async def test_push_config_skips_zones_on_non_dict_slot_0(self, caplog: pytest.LogCaptureFixture) -> None:
        """Malformed zone_slots (slot 0 not a dict) skips zone push; grid push still runs."""
        conn = DeviceConnection("192.168.1.100")

        mock_grid = MagicMock()
        mock_grid.name = "epp_set_grid"
        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_grid, mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            import logging

            with caplog.at_level(logging.WARNING, logger="custom_components.eppgrid.device_manager"):
                await conn.async_push_config(
                    {
                        "calibration": {"room_width": 3000.0},
                        "room_layout": {
                            "grid_bytes": [0] * 100,
                            "zone_slots": [None] * 8,  # slot 0 null = malformed
                        },
                    }
                )

            assert any("zone_slots" in rec.getMessage().lower() for rec in caplog.records)
            call_services = [c[0][0] for c in mock_client.execute_service.await_args_list]
            assert mock_grid in call_services
            assert mock_zones not in call_services

    async def test_push_config_expands_non_custom_zone_timing(self) -> None:
        """Non-custom zones get timing filled in from ZONE_TYPE_DEFAULTS before push."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Slot 0 = seating, slot 1 = transit — both non-custom, stored
            # without timing. Expansion should fill each with its type defaults.
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {"type": "seating"},
                            {"name": "Hall", "color": "#abc", "type": "transit"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            mock_client.execute_service.assert_awaited_once()
            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slots = pushed["zone_slots"]
            # Zone 0 (seating) defaults: trigger=7, renew=1, timeout=30, handoff=10.
            assert slots[0] == {
                "type": "seating",
                "trigger": 7,
                "renew": 1,
                "timeout": 30.0,
                "handoff_timeout": 10.0,
            }
            # Zone 1 (transit): trigger=3, renew=2, timeout=3, handoff=1.
            # name/color must be preserved.
            assert slots[1] == {
                "name": "Hall",
                "color": "#abc",
                "type": "transit",
                "trigger": 3,
                "renew": 2,
                "timeout": 3.0,
                "handoff_timeout": 1.0,
            }

    async def test_push_config_passes_through_custom_timing(self) -> None:
        """Custom zones honour user-supplied timing — no expansion, no mutation."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {
                                "type": "custom",
                                "trigger": 6,
                                "renew": 4,
                                "timeout": 20.0,
                                "handoff_timeout": 5.0,
                            },
                            {
                                "name": "Lab",
                                "color": "#def",
                                "type": "custom",
                                "trigger": 8,
                                "renew": 4,
                                "timeout": 45.0,
                                "handoff_timeout": 12.0,
                            },
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slots = pushed["zone_slots"]
            assert slots[0] == {
                "type": "custom",
                "trigger": 6,
                "renew": 4,
                "timeout": 20.0,
                "handoff_timeout": 5.0,
            }
            assert slots[1] == {
                "name": "Lab",
                "color": "#def",
                "type": "custom",
                "trigger": 8,
                "renew": 4,
                "timeout": 45.0,
                "handoff_timeout": 12.0,
            }

    async def test_push_config_expansion_preserves_name_and_color(self) -> None:
        """Expanded non-custom named zone keeps its name and color fields."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {"type": "default"},
                            {"name": "Office", "color": "#CFDB70", "type": "default"},
                        ]
                        + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slot = pushed["zone_slots"][1]
            assert slot["name"] == "Office"
            assert slot["color"] == "#CFDB70"
            assert slot["type"] == "default"
            assert slot["trigger"] == 5
            assert slot["renew"] == 3
            assert slot["timeout"] == 10.0
            assert slot["handoff_timeout"] == 3.0

    async def test_push_config_expansion_does_not_mutate_source(self) -> None:
        """Expansion copies per slot — the original zone_slots dict is untouched."""
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        source_slot = {"type": "default"}
        named_slot = {"name": "Office", "color": "#CFDB70", "type": "default"}

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [source_slot, named_slot] + [None] * (MAX_ZONES - 1),
                    },
                }
            )

            # Originals must be untouched (no timing fields leaked in).
            assert source_slot == {"type": "default"}
            assert named_slot == {"name": "Office", "color": "#CFDB70", "type": "default"}

    async def test_push_config_overwrites_stale_timing_on_non_custom(self) -> None:
        """Non-custom zones: stale stored timing is overwritten by type defaults.

        ZONE_TYPE_DEFAULTS is the single source of truth for non-custom types,
        so bumping the defaults in code rolls through to every device. If the
        store somehow holds leftover timing values for a non-custom zone (e.g.
        from before the serializer stripped them), they must not survive the
        expansion — the type defaults are authoritative.
        """
        conn = DeviceConnection("192.168.1.100")

        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            # Stale timing on a "seating" zone — defaults say 7/1/30/10, but the
            # stored slot has 99/99/99/99. After expansion, defaults must win.
            await conn.async_push_config(
                {
                    "room_layout": {
                        "zone_slots": [
                            {
                                "type": "seating",
                                "trigger": 99,
                                "renew": 99,
                                "timeout": 99.0,
                                "handoff_timeout": 99.0,
                            },
                        ]
                        + [None] * MAX_ZONES,
                    },
                }
            )

            call_data = mock_client.execute_service.call_args[0][1]
            pushed = json.loads(call_data["zones_json"])
            slot = pushed["zone_slots"][0]
            assert slot["trigger"] == 7
            assert slot["renew"] == 1
            assert slot["timeout"] == 30.0
            assert slot["handoff_timeout"] == 10.0

    async def test_push_config_settings(self) -> None:
        """push_config reads unified settings key and pushes to 5 firmware actions."""
        conn = DeviceConnection("192.168.1.100")

        mock_env = MagicMock()
        mock_env.name = "epp_set_env_calibration"
        mock_motion = MagicMock()
        mock_motion.name = "epp_set_motion_timeout"
        mock_tracking = MagicMock()
        mock_tracking.name = "epp_set_tracking"
        mock_stuck = MagicMock()
        mock_stuck.name = "epp_set_stuck_target_timeout"
        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(
                return_value=([], [mock_env, mock_motion, mock_tracking, mock_stuck, mock_static])
            )
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": -1.5,
                        "humidity_offset": 2.0,
                        "illuminance_offset": -10.0,
                        "motion_timeout": 5.0,
                        "target_max_distance": 4.0,
                        "stuck_target_timeout": 240.0,
                        "static_min_distance": 0.3,
                        "static_max_distance": 8.0,
                        "static_trigger_threshold": 3,
                        "static_renew_threshold": 3,
                        "static_timeout": 30.0,
                        "static_on_delay": 0.0,
                    },
                }
            )

            # All 5 firmware actions should be called
            assert mock_client.execute_service.await_count == 5

            calls = mock_client.execute_service.call_args_list

            # Find calls by service mock object
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            # env calibration: values passed through
            env_data = call_by_service["epp_set_env_calibration"]
            assert env_data["temperature_offset"] == -1.5
            assert env_data["humidity_offset"] == 2.0
            assert env_data["illuminance_offset"] == -10.0

            # motion timeout
            motion_data = call_by_service["epp_set_motion_timeout"]
            assert motion_data["timeout"] == 5.0

            # tracking
            tracking_data = call_by_service["epp_set_tracking"]
            assert tracking_data["max_range"] == 4000.0  # meters → mm

            # stuck target timeout
            stuck_data = call_by_service["epp_set_stuck_target_timeout"]
            assert stuck_data["timeout"] == 240.0

            # static presence: firmware inversion
            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["min_range"] == 0.3
            assert static_data["max_range"] == 8.0
            assert static_data["trigger_range"] == 8.0  # same as max_range
            assert static_data["trigger_sensitivity"] == 7  # 10 - 3
            assert static_data["sustain_sensitivity"] == 7  # 10 - 3
            assert "timeout" not in static_data  # pushed via epp_set_static_timeout instead
            assert static_data["on_delay"] == 0.0
            assert static_data["led_enabled"] is True

    async def test_push_config_log_levels(self) -> None:
        """push_config sends each log level category/level pair via epp_set_log_level."""
        conn = DeviceConnection("192.168.1.100")

        mock_log_level = MagicMock()
        mock_log_level.name = "epp_set_log_level"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_log_level]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "log_levels": {"system": "Debug", "networking": "Info"},
                }
            )

            assert mock_client.execute_service.await_count == 2
            calls = mock_client.execute_service.call_args_list
            call_data = [call[0][1] for call in calls]
            assert {"category": "system", "level": "Debug"} in call_data
            assert {"category": "networking", "level": "Info"} in call_data

    async def test_push_config_log_levels_no_service(self) -> None:
        """push_config skips log levels when epp_set_log_level service is not available."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "log_levels": {"epp": "Debug"},
                }
            )

            # No service available, so no calls
            mock_client.execute_service.assert_not_awaited()

    async def test_push_config_no_log_levels(self) -> None:
        """push_config does nothing for log levels when config has no log_levels key."""
        conn = DeviceConnection("192.168.1.100")

        mock_log_level = MagicMock()
        mock_log_level.name = "epp_set_log_level"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_log_level]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            # No log levels in config, no calls
            mock_client.execute_service.assert_not_awaited()

    async def test_push_config_led_settings(self) -> None:
        """push_config sends LED mode, brightness, and presence color via epp_set_led."""
        conn = DeviceConnection("192.168.1.100")

        mock_env = MagicMock()
        mock_env.name = "epp_set_env_calibration"
        mock_motion = MagicMock()
        mock_motion.name = "epp_set_motion_timeout"
        mock_tracking = MagicMock()
        mock_tracking.name = "epp_set_tracking"
        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"
        mock_led = MagicMock()
        mock_led.name = "epp_set_led"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(
                return_value=([], [mock_env, mock_motion, mock_tracking, mock_static, mock_led])
            )
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "temperature_offset": 0.0,
                        "humidity_offset": 0.0,
                        "illuminance_offset": 0.0,
                        "motion_timeout": 5.0,
                        "target_max_distance": 6.0,
                        "static_min_distance": 0.3,
                        "static_max_distance": 16.0,
                        "static_trigger_threshold": 3,
                        "static_renew_threshold": 3,
                        "static_timeout": 30.0,
                        "static_on_delay": 0.0,
                        "led_mode": "Presence",
                        "led_brightness": 0.8,
                        "led_presence_color": "#66CC00",
                    },
                }
            )

            calls = mock_client.execute_service.call_args_list
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            # epp_set_led should be called with parsed color
            assert "epp_set_led" in call_by_service
            led_data = call_by_service["epp_set_led"]
            assert led_data["mode"] == "Presence"
            assert led_data["brightness"] == 0.8
            assert abs(led_data["presence_red"] - 0.4) < 0.01  # 0x66/0xFF ≈ 0.4
            assert abs(led_data["presence_green"] - 0.8) < 0.01  # 0xCC/0xFF ≈ 0.8
            assert abs(led_data["presence_blue"] - 0.0) < 0.01  # 0x00/0xFF = 0.0

            # led_enabled always hardcoded True
            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["led_enabled"] is True

    async def test_push_config_led_defaults_when_absent(self) -> None:
        """push_config uses LED defaults when settings lack LED keys."""
        conn = DeviceConnection("192.168.1.100")

        mock_static = MagicMock()
        mock_static.name = "epp_set_static_presence"
        mock_led = MagicMock()
        mock_led.name = "epp_set_led"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_static, mock_led]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            calls = mock_client.execute_service.call_args_list
            call_by_service = {call[0][0].name: call[0][1] for call in calls}

            led_data = call_by_service["epp_set_led"]
            assert led_data["mode"] == "Manual Control"
            assert led_data["brightness"] == 1.0
            # Default color #CC33FF → red≈0.8, green≈0.2, blue=1.0
            assert abs(led_data["presence_red"] - 0.8) < 0.01
            assert abs(led_data["presence_green"] - 0.2) < 0.01
            assert abs(led_data["presence_blue"] - 1.0) < 0.01

            static_data = call_by_service["epp_set_static_presence"]
            assert static_data["led_enabled"] is True

    async def test_push_config_relay_settings(self) -> None:
        """push_config sends relay trigger_mode and contact_mode via epp_set_relay."""
        conn = DeviceConnection("192.168.1.100")

        mock_relay = MagicMock()
        mock_relay.name = "epp_set_relay"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_relay]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "relay_trigger_mode": "presence",
                        "relay_contact_mode": "nc",
                    }
                }
            )

            mock_client.execute_service.assert_any_await(
                mock_relay,
                {"trigger_mode": "presence", "contact_mode": "nc"},
            )

    async def test_push_config_relay_settings_defaults(self) -> None:
        """push_config uses defaults when relay keys absent."""
        conn = DeviceConnection("192.168.1.100")

        mock_relay = MagicMock()
        mock_relay.name = "epp_set_relay"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_relay]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config({"settings": {}})

            mock_client.execute_service.assert_any_await(
                mock_relay,
                {"trigger_mode": "disabled", "contact_mode": "no"},
            )

    async def test_push_config_relay_no_service(self) -> None:
        """push_config skips relay when service not registered."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            await conn.async_push_config(
                {
                    "settings": {
                        "relay_trigger_mode": "motion",
                        "relay_contact_mode": "no",
                    }
                }
            )

            mock_client.execute_service.assert_not_awaited()

    async def test_push_config_skips_oversized_zone_payload(self, caplog: pytest.LogCaptureFixture) -> None:
        """Zone push must be skipped with a warning when the serialised payload
        exceeds ZONES_JSON_MAX — belt-and-braces guard for payloads that somehow
        pass the websocket validator but are still too large after expansion.
        """
        import logging

        from custom_components.eppgrid.const import ZONES_JSON_MAX

        conn = DeviceConnection("192.168.1.100")
        mock_zones = MagicMock()
        mock_zones.name = "epp_set_zones"

        # Build a zone_slots payload whose JSON exceeds ZONES_JSON_MAX after
        # expansion. Use a custom-type slot so _expand_zone_slot preserves user
        # timing — avoiding type-default lookup which is harder to inflate.
        # A single name of 8 KB+ is more than enough (normal max is 64 chars).
        fat_name = "x" * (ZONES_JSON_MAX + 1)
        zone_slots = [
            {"type": "default"},
            {
                "name": fat_name,
                "color": "#aabbcc",
                "type": "custom",
                "trigger": 5,
                "renew": 3,
                "timeout": 10.0,
                "handoff_timeout": 3.0,
            },
        ] + [None] * 6

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_zones]))
            mock_client.execute_service = AsyncMock()

            await conn.async_connect()
            with caplog.at_level(
                logging.WARNING,
                logger="custom_components.eppgrid.device_manager",
            ):
                await conn.async_push_config({"room_layout": {"zone_slots": zone_slots}})

        # Service must NOT have been called — payload is too large
        mock_client.execute_service.assert_not_awaited()
        # The specific oversized-payload warning must have been emitted
        assert any("Skipping zone push" in rec.getMessage() for rec in caplog.records)

    async def test_push_config_already_connected_noop(self) -> None:
        """async_connect is a no-op when already connected."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))

            await conn.async_connect()
            assert conn.connected

            # Second connect should be a no-op
            await conn.async_connect()
            mock_client.connect.assert_awaited_once()


# ---------------------------------------------------------------------------
# Event callback tests
# ---------------------------------------------------------------------------


class TestEventCallbacks:
    """Tests for _on_entity_registry_updated, _on_state_changed, _on_device_available."""

    async def test_on_entity_registry_updated_triggers_discover(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """New ESPHome entity creation triggers re-discovery.

        The device carries the EPP manufacturer/model signature — the
        handler pre-filters on it, so an unsigned device would be skipped
        (see test_entity_create_non_epp_device_skips_discover_and_listener).
        """
        manager._discover_debounce = 0.01
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP New",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "ff:ee:dd:cc:bb:aa")},
            name="EPP New",
            manufacturer=EPP_MANUFACTURER,
            model=EPP_MODELS[0],
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:04-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_awaited_once()

    async def test_on_entity_registry_updated_ignores_non_create(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Non-create actions are ignored."""
        event = MagicMock()
        event.data = {"action": "update", "entity_id": "sensor.test"}

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_on_entity_registry_updated_ignores_known_device(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Entities belonging to already-discovered devices are skipped."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Known",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Known",
            manufacturer=EPP_MANUFACTURER,
            model=EPP_MODELS[0],
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:05-sensor-something",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Pre-populate the device as already discovered. device_id must match
        # the registry entry's device_id — the handler now uses that as part
        # of the early-return check so it can still re-trigger discovery when
        # a known MAC reappears under a *different* HA device_id (live re-add).
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP Known", host="192.168.1.50", device_id=device.id
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_on_entity_registry_updated_ignores_non_esphome(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Non-ESPHome entities are ignored."""
        ent_reg = er.async_get(hass)

        other_entry = MockConfigEntry(domain="other", data={}, title="Other")
        other_entry.add_to_hass(hass)

        entity = ent_reg.async_get_or_create(
            "sensor",
            "other",
            unique_id="other_sensor_1",
            config_entry=other_entry,
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_entity_create_burst_debounces_discover(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A burst of entity-create events for one new EPP device collapses
        into exactly ONE discovery run after the debounce window — discovery
        is a full entity-registry scan, so N entities must not cost N scans."""
        manager._discover_debounce = 0.05
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP New")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "ff:ee:dd:cc:bb:aa")},
            name="EPP New",
            manufacturer=EPP_MANUFACTURER,
            model=EPP_MODELS[0],
        )
        entities = [
            ent_reg.async_get_or_create(
                "sensor",
                "esphome",
                unique_id=f"FF:EE:DD:CC:BB:AA-sensor-{i}",
                config_entry=esphome_entry,
                device_id=device.id,
            )
            for i in range(5)
        ]

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            for entity in entities:
                event = MagicMock()
                event.data = {"action": "create", "entity_id": entity.entity_id}
                manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_awaited_once()

    async def test_entity_create_non_epp_device_skips_discover_and_listener(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """An entity created on a clearly non-EPP ESPHome device must trigger
        neither a discovery spawn nor a state-listener rebuild — adding a
        50-entity non-EPP device used to cause an O(N²) burst."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.60"}, title="Acme")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "11:22:33:44:55:66")},
            name="Acme Widget",
            manufacturer="Acme Corp",
            model="Widget 3000",
        )
        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="11:22:33:44:55:66-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        with (
            patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover,
            patch.object(manager, "_refresh_state_listener") as mock_refresh,
        ):
            event = MagicMock()
            event.data = {"action": "create", "entity_id": entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()
        mock_refresh.assert_not_called()

    async def test_async_stop_cancels_pending_discover(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A pending debounced discovery must be cancelled by async_stop, not
        left to fire against a torn-down manager."""
        manager._discover_debounce = 30.0
        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            manager._request_discover()
            assert manager._pending_discover is not None
            await manager.async_stop()
        mock_discover.assert_not_awaited()
        assert manager._pending_discover is None

    async def test_request_discover_noop_after_stop(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """_request_discover must not schedule once the manager is stopping."""
        manager._stopping = True
        manager._request_discover()
        assert manager._pending_discover is None
        await hass.async_block_till_done()

    async def test_on_state_changed_value_to_value_skips_registry_lookups(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The hot path: a plain value→value sensor update on a tracked entity
        must bail before paying any registry lookups — every state change of
        every tracked entity lands here."""
        old = MagicMock()
        old.state = "21.0"
        new = MagicMock()
        new.state = "21.5"
        event = MagicMock()
        event.data = {"entity_id": "sensor.epp_temperature", "old_state": old, "new_state": new}

        with (
            patch("custom_components.eppgrid.device_manager.er.async_get") as mock_er,
            patch("custom_components.eppgrid.device_manager.dr.async_get") as mock_dr,
        ):
            manager._on_state_changed(event)

        mock_er.assert_not_called()
        mock_dr.assert_not_called()

    async def test_fire_device_list_changed_computes_payload_once(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """One change event with N subscribers computes list_devices() exactly
        once and hands every subscriber the same payload object."""
        received: list = []
        manager.on_device_list_changed(received.append)
        manager.on_device_list_changed(received.append)

        with patch.object(manager, "list_devices", wraps=manager.list_devices) as mock_list:
            manager._fire_device_list_changed()

        assert mock_list.call_count == 1
        assert len(received) == 2
        assert received[0] is received[1]

    async def test_fire_device_list_changed_skips_payload_without_subscribers(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """No subscribers → no payload computation at all."""
        with patch.object(manager, "list_devices") as mock_list:
            manager._fire_device_list_changed()
        mock_list.assert_not_called()

    async def test_on_state_changed_pushes_config(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device coming online triggers config push."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = "25.5"

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_push.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

    async def test_on_state_changed_subsequent_online_still_fires_change(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A second offline→online transition while a push is in flight must still
        notify subscribers.

        After a network blip, ESPHome restores entity states one at a time. The
        first transition starts an `_on_device_available` task and adds `mac` to
        `_pushing`; subsequent transitions arrive while that task is still
        running. Without firing the device-list-changed event for them, the
        frontend's last-seen `firmware_status` (computed from the
        `firmware_version` sensor's state) can stay `"unavailable"` forever if
        that sensor happens to come back after the first push completes.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.60"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:60")},
            name="EPP Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:60-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        mac = "AA:BB:CC:DD:EE:60"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.60", device_id=device.id)

        # Simulate the in-flight state: a prior entity already triggered the
        # online task, so `mac` is in `_pushing` but the task hasn't finished.
        manager._pushing.add(mac)

        fire_calls: list[None] = []
        manager.on_device_list_changed(lambda _devices: fire_calls.append(None))

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = "1.2.3"

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        # Don't double-push config — the in-flight task handles that.
        mock_avail.assert_not_awaited()
        # But subscribers must still see the change so the frontend re-reads
        # firmware_status after this entity flipped online.
        assert len(fire_calls) == 1

    async def test_on_state_changed_treats_unknown_like_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Unknown → value transition should fire availability, matching unavailable → value.

        Newly-added ESPHome entities can start in 'unknown' state and move directly
        to a value without passing through 'unavailable'. The availability transition
        must still be detected so the frontend sees the device come online.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.51"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:02")},
            name="EPP Device 2",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:02-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:02"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:02", name="EPP", host="192.168.1.51", device_id=device.id
        )

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            old_state = MagicMock()
            old_state.state = "unknown"
            new_state = MagicMock()
            new_state.state = "25.5"

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_push.assert_awaited_once_with("AA:BB:CC:DD:EE:02")

    async def test_on_state_changed_ignores_still_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """State change from unavailable to unavailable is ignored."""
        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = STATE_UNAVAILABLE

            event = MagicMock()
            event.data = {
                "entity_id": "sensor.test",
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()

    async def test_on_state_changed_value_to_unknown_marks_offline(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """value → unknown is treated as going offline.

        ESPHome sensors transitioning to 'unknown' means the device has
        stopped publishing readings. Subscribers should see the availability
        flip so the UI reflects the true state.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.52"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:03")},
            name="EPP Device 3",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:03-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:03"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:03",
            name="EPP",
            host="192.168.1.52",
            device_id=device.id,
            available=True,  # Was online — value→unknown is the actual transition.
        )
        manager._pushing.add("AA:BB:CC:DD:EE:03")

        fire_calls: list[None] = []
        manager.on_device_list_changed(lambda _devices: fire_calls.append(None))

        old_state = MagicMock()
        old_state.state = "25.5"
        new_state = MagicMock()
        new_state.state = "unknown"

        event = MagicMock()
        event.data = {
            "entity_id": entity.entity_id,
            "old_state": old_state,
            "new_state": new_state,
        }
        manager._on_state_changed(event)
        await hass.async_block_till_done()

        assert "AA:BB:CC:DD:EE:03" not in manager._pushing
        assert len(fire_calls) == 1

    async def test_offline_transition_fires_broadcast_only_on_actual_transition(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A redundant offline→offline state change for a device already known
        to be unavailable must not re-fire `_fire_device_list_changed` — every
        device-list subscriber would otherwise get spammed for each
        unavailable→unknown ping during a long disconnect."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.55"})
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:09")},
            name="EPP Device 9",
        )
        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:09-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        manager.devices["AA:BB:CC:DD:EE:09"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:09",
            name="EPP",
            host="192.168.1.55",
            device_id=device.id,
            available=False,  # Already known offline (e.g. set by a prior offline event)
        )

        fire_calls: list[None] = []
        manager.on_device_list_changed(lambda _devices: fire_calls.append(None))

        # Synthesize an unavailable → unknown event (still offline either way).
        old = MagicMock()
        old.state = STATE_UNAVAILABLE
        new = MagicMock()
        new.state = "unknown"
        event = MagicMock()
        event.data = {"entity_id": entity.entity_id, "old_state": old, "new_state": new}

        manager._on_state_changed(event)
        await hass.async_block_till_done()

        assert fire_calls == [], (
            "Redundant offline→offline transition fired _fire_device_list_changed "
            "even though the device-list state did not change"
        )

    async def test_offline_transition_first_time_fires_and_marks_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """First offline transition (was available, now offline) must fire the
        broadcast AND flip `dev.available` to False so the next redundant
        offline event is correctly skipped."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.56"})
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:0a")},
            name="EPP Device 10",
        )
        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:0A-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        manager.devices["AA:BB:CC:DD:EE:0A"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:0A",
            name="EPP",
            host="192.168.1.56",
            device_id=device.id,
            available=True,  # Was online
        )

        fire_calls: list[None] = []
        manager.on_device_list_changed(lambda _devices: fire_calls.append(None))

        old = MagicMock()
        old.state = "25.5"
        new = MagicMock()
        new.state = STATE_UNAVAILABLE
        event = MagicMock()
        event.data = {"entity_id": entity.entity_id, "old_state": old, "new_state": new}

        manager._on_state_changed(event)
        await hass.async_block_till_done()

        assert len(fire_calls) == 1, "first offline transition must fire broadcast"
        assert manager.devices["AA:BB:CC:DD:EE:0A"].available is False, (
            "dev.available must flip to False so redundant offline events are skipped"
        )

    async def test_on_state_changed_treats_missing_old_state_as_offline(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """First appearance (old_state=None) is treated as offline → online —
        that is, indistinguishable from STATE_UNAVAILABLE → value, which fires
        the config push."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"})
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )
        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            new_state = MagicMock()
            new_state.state = "1.2.3"
            event = MagicMock()
            event.data = {"entity_id": entity.entity_id, "old_state": None, "new_state": new_state}
            manager._on_state_changed(event)
            await hass.async_block_till_done()
        mock_push.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

    async def test_on_state_changed_ignores_missing_new_state(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Missing new_state means the entity was removed — not an availability
        event we care about."""
        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            event = MagicMock()
            event.data = {"entity_id": "sensor.test", "old_state": MagicMock(), "new_state": None}
            manager._on_state_changed(event)
            await hass.async_block_till_done()
        mock_avail.assert_not_awaited()

    async def test_on_state_changed_ignores_non_esphome(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """State change on non-ESPHome entity is ignored."""
        ent_reg = er.async_get(hass)
        other_entry = MockConfigEntry(domain="other", data={}, title="Other")
        other_entry.add_to_hass(hass)
        entity = ent_reg.async_get_or_create("sensor", "other", unique_id="other_1", config_entry=other_entry)

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = "20.0"

            event = MagicMock()
            event.data = {"entity_id": entity.entity_id, "old_state": old_state, "new_state": new_state}
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()

    async def test_on_state_changed_device_goes_unavailable(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device going unavailable clears pushing set and fires device list changed."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-unavail",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP",
            host="192.168.1.50",
            device_id=device.id,
            available=True,  # Was online — value→unavailable is the actual transition.
        )
        manager._pushing.add("AA:BB:CC:DD:EE:FF")

        with patch.object(manager, "_fire_device_list_changed") as mock_fire:
            old_state = MagicMock()
            old_state.state = "25.5"
            new_state = MagicMock()
            new_state.state = STATE_UNAVAILABLE

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        assert "AA:BB:CC:DD:EE:FF" not in manager._pushing
        mock_fire.assert_called_once()

    async def test_on_state_changed_closes_active_session_on_offline(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Device going unavailable closes any active session so the next open is fresh."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-close",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id=device.id)

        # Populate an active session (frontend had a live overview open)
        stale_conn = MagicMock()
        stale_conn.connected = True
        stale_conn.async_disconnect = AsyncMock()
        manager._active_connections[mac] = stale_conn

        with patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close:
            old_state = MagicMock()
            old_state.state = "25.5"
            new_state = MagicMock()
            new_state.state = STATE_UNAVAILABLE

            event = MagicMock()
            event.data = {
                "entity_id": entity.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_close.assert_awaited_once_with(mac)

    async def test_is_device_available_all_unavailable(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """_is_device_available returns False when all ESPHome entities are unavailable."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-avail_check",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        # Set entity state to unavailable
        hass.states.async_set("sensor.esphome_aabbccddeeff_avail_check", STATE_UNAVAILABLE)

        assert manager._is_device_available("AA:BB:CC:DD:EE:FF") is False

    async def test_is_device_available_some_available(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """_is_device_available returns True when at least one ESPHome entity is available."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-avail_ok",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        # Set entity state to a normal value using the actual registered entity_id
        hass.states.async_set(entity.entity_id, "25.5")

        assert manager._is_device_available("AA:BB:CC:DD:EE:FF") is True

    async def test_open_session_returns_none_when_unavailable(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_open_session returns None when _is_device_available is False."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Device",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Device",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-session_check",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )

        # All entities unavailable
        hass.states.async_set("sensor.esphome_aabbccddeeff_session_check", STATE_UNAVAILABLE)

        result = await manager.async_open_session("AA:BB:CC:DD:EE:FF")
        assert result is None

    async def test_push_config_to_device_no_config(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device fetches build flags when no stored config."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")
        # store has no config for this MAC
        with patch.object(manager, "_fetch_build_flags", new_callable=AsyncMock) as mock_fetch:
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")
            mock_fetch.assert_awaited_once_with("AA:BB:CC:DD:EE:FF")

    async def test_fetch_build_flags_does_not_cache_on_transient_failure(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A timeout while fetching build flags must leave the slot empty so a
        subsequent call retries instead of being short-circuited by the cache."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        session = MagicMock()
        session.async_fetch_build_flags = AsyncMock(side_effect=TimeoutError())
        session.connected = True
        manager._active_connections[mac] = session

        await manager._fetch_build_flags(mac)
        assert mac not in manager._build_flags  # transient -> not cached

        # Second call retries (no early-return from the cache).
        session.async_fetch_build_flags.side_effect = None
        session.async_fetch_build_flags.return_value = {"ethernet_enabled": True}
        await manager._fetch_build_flags(mac)
        assert manager._build_flags[mac] == {"ethernet_enabled": True}

    async def test_push_config_to_device_does_not_cache_build_flags_on_session_fetch_failure(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """When async_fetch_build_flags raises mid-push (session path), the
        cache stays empty so a subsequent push retries the fetch."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        store.devices[mac] = {"settings": {}}

        session = MagicMock()
        session.connected = True
        session.async_push_config = AsyncMock()
        session.async_fetch_build_flags = AsyncMock(side_effect=ConnectionError("boom"))
        manager._active_connections[mac] = session

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True  # push succeeded; only flags fetch failed
        assert mac not in manager._build_flags  # cache not poisoned

    async def test_push_config_to_device_does_not_cache_build_flags_on_temp_conn_fetch_failure(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Same invariant for the temp-connection path used at boot."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        store.devices[mac] = {"settings": {}}

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls,
        ):
            conn = mock_cls.return_value
            conn.async_connect = AsyncMock()
            conn.async_disconnect = AsyncMock()
            conn.async_push_config = AsyncMock()
            conn.async_execute_service = AsyncMock()
            conn.async_fetch_build_flags = AsyncMock(side_effect=TimeoutError())
            conn.connected = True

            result = await manager._push_config_to_device(mac)

        assert result is True
        assert mac not in manager._build_flags

    async def test_push_config_to_device_opens_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device creates a temporary connection and pushes."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_push_config.assert_awaited_once()
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_to_device_handles_error(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device logs warning on push failure."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock(side_effect=ConnectionError("timeout"))
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            # Should not raise
            await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")

        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_to_device_no_host(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device returns False when device has no host."""
        store.devices["AA:BB:CC:DD:EE:FF"] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host=None)

        result = await manager._push_config_to_device("AA:BB:CC:DD:EE:FF")
        assert result is False

    async def test_push_config_uses_session_when_available(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device uses existing session connection instead of temporary."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        session_conn.async_execute_service = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_push_config.assert_awaited_once()

    async def test_push_config_falls_back_to_temporary_when_no_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device creates temporary connection when no session exists."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # No session in _active_connections
        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_push_config.assert_awaited_once()
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_temp_connection_strips_heatmap_interval_for_old_firmware(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """The temp-connection push path (boot / no active session) applies
        the same BWC strip as the session path: `heatmap_interval` must not
        reach `epp_set_pipeline` on firmware that predates the Heatmap
        feature. `supports_heatmap` is forced False here — in practice this
        branch only runs once firmware compatibility is confirmed, but the
        strip stays defensive in case that gating ever changes."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
            patch(
                "custom_components.eppgrid.device_manager._helpers.supports_heatmap",
                return_value=False,
            ),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        pipeline = mock_conn.async_execute_service.await_args.args[1]
        assert "heatmap_interval" not in pipeline

    async def test_push_config_temp_connection_carries_the_live_subscriber_counts(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """The emission pipeline is DEVICE-global, so the temp-connection push must
        carry the same subscriber counts a session push would: `_target_subs` is
        per-mac precisely so it outlives any one connection. A card can be streaming
        (counts held) while this branch runs — `_on_device_available` reaches the
        push before the re-arm pass has stored its session — and pushing zeros there
        turns target/zone emission OFF for a stream the client believes is live."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"settings": {"target_update_rate_ms": 500, "target_xy": True}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        # One card subscribed to the grid stream and the heatmap.
        manager._target_subs[mac] = {"raw_target_subs": 0, "grid_target_subs": 1, "heatmap_subs": 1}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        pipeline = mock_conn.async_execute_service.await_args.args[1]
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 1000
        assert pipeline["heatmap_interval"] == 0

    async def test_push_config_temp_and_session_paths_push_the_same_pipeline(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """The two pipeline writers must not disagree. Both paths can run for the
        same mac within the same reconnect (the temp push while the session is still
        connecting, the session push once it lands), and last-write-wins: if they
        computed different payloads, the device's emission would depend on which
        connect finished last."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"settings": {"zone_presence": True, "zone_update_rate_ms": 2000}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._target_subs[mac] = {"raw_target_subs": 1, "grid_target_subs": 1, "heatmap_subs": 0}

        temp_conn = MagicMock()
        temp_conn.async_connect = AsyncMock()
        temp_conn.async_push_config = AsyncMock()
        temp_conn.async_execute_service = AsyncMock()
        temp_conn.async_fetch_build_flags = AsyncMock(return_value={})
        temp_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=temp_conn,
            ),
        ):
            assert await manager._push_config_to_device(mac) is True
        temp_pipeline = temp_conn.async_execute_service.await_args.args[1]

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_execute_service = AsyncMock()
        manager._active_connections[mac] = session_conn
        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            await manager._push_pipeline_to_device(mac)
        session_pipeline = session_conn.async_execute_service.await_args.args[1]

        assert temp_pipeline == session_pipeline

    async def test_push_config_skips_disconnected_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device ignores disconnected session and uses temporary."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        stale_conn = MagicMock()
        stale_conn.connected = False
        manager._active_connections[mac] = stale_conn

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_push_config.assert_awaited_once()
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_push_config_session_failure_returns_false(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device returns False when session push raises."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock(side_effect=ConnectionError("lost"))
        session_conn.async_disconnect = AsyncMock()
        manager._active_connections[mac] = session_conn

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            result = await manager._push_config_to_device(mac)

        assert result is False
        assert mac not in manager._active_connections

    async def test_push_config_dead_session_client_returns_false(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """A session whose APIClient died between get_session and the push
        (_on_stop racing the push) must surface as push failure, not success.

        With async_push_config silently no-opping on a dead client,
        _do_push_config_to_device returned True — the device was left
        unsynced and the _failed_pushes recovery never armed.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # Real DeviceConnection in the dying-client state: get_session's
        # `connected` check passed, then _on_stop cleared _client before the
        # push body ran.
        dead_conn = DeviceConnection("192.168.1.50")
        dead_conn.connected = True
        assert dead_conn._client is None
        manager._active_connections[mac] = dead_conn

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            result = await manager._push_config_to_device(mac)

        assert result is False, "dead-client push must report failure so retry logic arms"
        assert mac not in manager._active_connections  # stale session torn down

    # --- version-gated push: skip on firmware mismatch ---

    async def test_push_config_skipped_when_firmware_behind(
        self,
        hass: HomeAssistant,
        store: EPPGridStore,
        manager: DeviceManager,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """When the device firmware is behind the integration's pinned version,
        skip the push entirely — pushing a config the firmware can't parse risks
        the device misinterpreting fields whose format may have changed.

        Returns True so the caller's backoff doesn't retry; the device keeps
        running with its NVS-persisted settings until OTA brings it current.
        Build flags are still fetched so the Repairs OTA path stays available.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        manager._active_connections[mac] = session_conn

        with (
            patch.object(manager, "read_firmware_version", return_value="0.1.0"),
            patch.object(manager, "_fetch_build_flags", new_callable=AsyncMock) as mock_fetch,
            caplog.at_level("WARNING"),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_push_config.assert_not_awaited()
        # behind is the only status that's actually fixable from Repairs;
        # warning text should mention OTA path here.
        assert any(
            "0.1.0" in rec.message and "behind" in rec.message.lower() and "OTA" in rec.message
            for rec in caplog.records
        )
        # Build flags fetched so OTA via Repairs has the data it needs
        # to build the manifest URL even when the push itself is skipped.
        mock_fetch.assert_awaited_once_with(mac)

    async def test_push_config_skipped_when_firmware_ahead(
        self,
        hass: HomeAssistant,
        store: EPPGridStore,
        manager: DeviceManager,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """When the device firmware is ahead, skip the push: a newer firmware
        may have added required fields the older integration doesn't send.

        This case is NOT fixable from Repairs (user must update the
        integration via HACS); the warning must not point them at OTA.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        manager._active_connections[mac] = session_conn

        with (
            patch.object(manager, "read_firmware_version", return_value="99.0.0"),
            patch.object(manager, "_fetch_build_flags", new_callable=AsyncMock) as mock_fetch,
            caplog.at_level("WARNING"),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_push_config.assert_not_awaited()
        ahead_records = [rec for rec in caplog.records if "99.0.0" in rec.message]
        assert ahead_records, "expected a warning mentioning the firmware version"
        # firmware_ahead has no Repairs fix flow — don't direct users there.
        assert all("OTA" not in rec.message for rec in ahead_records)
        mock_fetch.assert_awaited_once_with(mac)

    async def test_push_config_skipped_when_firmware_unparseable(
        self,
        hass: HomeAssistant,
        store: EPPGridStore,
        manager: DeviceManager,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """An unparseable firmware version string blocks the push: if we can't
        compare, we can't risk pushing an incompatible format. No Repairs
        issue is raised for unparseable, so the warning must not promise one.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        manager._active_connections[mac] = session_conn

        with (
            patch.object(manager, "read_firmware_version", return_value="not-a-version"),
            patch.object(manager, "_fetch_build_flags", new_callable=AsyncMock) as mock_fetch,
            caplog.at_level("WARNING"),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_push_config.assert_not_awaited()
        unparseable_records = [rec for rec in caplog.records if "not-a-version" in rec.message]
        assert unparseable_records, "expected a warning mentioning the firmware version"
        # No Repairs flow exists for unparseable — don't claim there's one.
        assert all("Repairs" not in rec.message for rec in unparseable_records)
        mock_fetch.assert_awaited_once_with(mac)

    async def test_push_config_skipped_when_firmware_unknown(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """If the firmware_version sensor isn't readable yet, skip the push but
        leave the active session intact — returning False would route through
        `_on_device_available`'s 'failed push' branch, which calls
        `async_close_session(mac)` and tears down a perfectly healthy
        user-opened websocket session even though no transport error occurred.

        Race recovery happens in `_on_state_changed`'s firmware_version-arrival
        hook, which re-spawns `_on_device_available` once the version is known.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        manager._active_connections[mac] = session_conn

        with (
            patch.object(manager, "read_firmware_version", return_value=None),
            patch.object(manager, "_fetch_build_flags", new_callable=AsyncMock) as mock_fetch,
        ):
            result = await manager._push_config_to_device(mac)

        # True so _on_device_available's backoff doesn't tear down the session.
        assert result is True
        session_conn.async_push_config.assert_not_awaited()
        # Session is left alone — the race resolves via the arrival hook.
        assert mac in manager._active_connections
        # Still fetch build_flags so OTA via Repairs has the data it needs.
        mock_fetch.assert_awaited_once_with(mac)

    async def test_firmware_version_arrival_retriggers_push(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """When the firmware_version sensor transitions from offline to a real
        value, re-spawn `_on_device_available` so a push that was previously
        skipped during the reconnect race actually runs now.

        Reproduces the production race: the temperature sensor arrives first
        and triggers `_on_device_available`, which calls `_push_config_to_device`
        — but `firmware_version` hasn't published yet, so the gate skips the
        push and returns True. `_pushing` stays set, debouncing further state
        changes (including `firmware_version` finally arriving). Without a
        dedicated retrigger on firmware_version arrival, the device runs on
        stale config until the next offline→online cycle.
        """
        from homeassistant.const import STATE_UNAVAILABLE

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )
        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id=device.id)
        # Simulate the prior race: another entity already triggered the
        # initial push, the gate skipped it because fw_ver was None, and
        # _pushing is left set so subsequent state changes don't kick off
        # parallel push tasks.
        manager._pushing.add(mac)
        # Seed firmware_version as offline so the upcoming transition is
        # offline→value, not None→value (the latter would also clear
        # _pushing via the existing offline branch and pass for the wrong
        # reason).
        hass.states.async_set(fw_entry.entity_id, STATE_UNAVAILABLE)
        await hass.async_block_till_done()
        # Re-add since the above transition's offline branch cleared it.
        manager._pushing.add(mac)

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            hass.bus.async_listen("state_changed", manager._on_state_changed)
            # firmware_version transitions from unavailable to a real value
            hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
            await hass.async_block_till_done()

        mock_avail.assert_awaited_with(mac)

    async def test_firmware_version_empty_string_then_value_retriggers_push(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Some firmware variants publish an empty string before the real
        version arrives. `read_firmware_version` already treats `""` as
        'no data' (same as unavailable/unknown); the firmware_version
        arrival hook must use the same definition for its old-state guard,
        otherwise `"" → real_version` slips past the guard and the push is
        never retried until the next reconnect.
        """
        from homeassistant.const import STATE_UNAVAILABLE

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )
        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id=device.id)

        # Drive the sensor through unavailable → "" before real version.
        # The first transition (unavailable → "") is the case the existing
        # late-arrival test guards: must NOT raise a Repairs issue. The
        # follow-up "" → real_version transition is the case Copilot
        # flagged: must still retrigger the push.
        hass.bus.async_listen("state_changed", manager._on_state_changed)
        hass.states.async_set(fw_entry.entity_id, STATE_UNAVAILABLE)
        await hass.async_block_till_done()
        manager._pushing.add(mac)
        hass.states.async_set(fw_entry.entity_id, "")
        await hass.async_block_till_done()
        # Re-set the guard — empty-string-as-offline should also clear it,
        # but we want to assert the retrigger fires whether or not it does.
        manager._pushing.add(mac)

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
            await hass.async_block_till_done()

        mock_avail.assert_awaited_with(mac)

    async def test_push_config_serialized_per_mac(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Concurrent `_push_config_to_device` calls for the same mac must
        be serialized — ESP32 devices have a hard concurrent-connection
        limit, and the firmware_version-arrival re-spawn can land while an
        earlier `_on_device_available` is still mid-fetch_build_flags.
        Without a lock, two pushes would open overlapping connections.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        in_flight = 0
        max_in_flight = 0
        push_started = asyncio.Event()
        push_release = asyncio.Event()

        async def slow_push(*args: object, **kwargs: object) -> None:
            nonlocal in_flight, max_in_flight
            in_flight += 1
            max_in_flight = max(max_in_flight, in_flight)
            push_started.set()
            await push_release.wait()
            in_flight -= 1

        session = MagicMock()
        session.connected = True
        session.async_push_config = AsyncMock(side_effect=slow_push)
        session.async_execute_service = AsyncMock()
        session.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            task_a = asyncio.create_task(manager._push_config_to_device(mac))
            await push_started.wait()
            push_started.clear()
            # B starts while A is mid-push. Without a lock, both reach
            # session.async_push_config and max_in_flight observes 2.
            task_b = asyncio.create_task(manager._push_config_to_device(mac))
            # Yield a few times so task_b has every chance to enter
            # async_push_config if it could.
            for _ in range(10):
                await asyncio.sleep(0)
            push_release.set()
            await asyncio.gather(task_a, task_b)

        assert max_in_flight == 1, f"pushes overlapped (max concurrent: {max_in_flight}); lock missing"

    async def test_push_config_proceeds_when_firmware_compatible(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """When firmware version matches the integration's pinned version,
        the push proceeds normally."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        session_conn.async_execute_service = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_push_config.assert_awaited_once()

    async def test_on_device_available_retries_with_backoff(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A failing first push retries with bounded exponential backoff
        (3 attempts, capped) and re-checks availability between them."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        attempts = 0

        async def push(_mac: str) -> bool:
            nonlocal attempts
            attempts += 1
            return attempts >= 3  # succeed on the third call

        with (
            patch.object(manager, "_push_config_to_device", side_effect=push),
            patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close,
            patch.object(manager, "_is_device_available", return_value=True),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
        ):
            await manager._on_device_available(mac)

        assert attempts == 3
        # Session is closed exactly once — before the backoff loop, not
        # on every iteration. Closing on every retry would tear down a
        # user-opened panel session that arrived during the 1s/3s/9s
        # window, surfacing as a flaky reconnect.
        mock_close.assert_awaited_once_with(mac)

    async def test_on_device_available_retries_after_stale_connection(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_on_device_available closes stale session and retries once on push failure."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        manager._pushing.add(mac)
        push_results = [False, True]  # first push fails, retry succeeds
        with (
            patch.object(
                manager, "_push_config_to_device", new_callable=AsyncMock, side_effect=push_results
            ) as mock_push,
            patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close,
            patch.object(manager, "_is_device_available", return_value=True),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            await manager._on_device_available(mac)

        assert mock_push.await_count == 2
        mock_close.assert_awaited_once_with(mac)
        # First retry uses the smallest delay in the backoff schedule (1s).
        mock_sleep.assert_awaited_once_with(1.0)
        # Guard stays set on success (not discarded)
        assert mac in manager._pushing

    async def test_on_device_available_clears_guard_after_all_failures(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_on_device_available clears _pushing guard only after all attempts fail."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._pushing.add(mac)

        with (
            patch.object(manager, "_push_config_to_device", new_callable=AsyncMock, return_value=False) as mock_push,
            patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close,
            patch.object(manager, "_is_device_available", return_value=True),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            await manager._on_device_available(mac)

        # Initial push + 3 retries = 4 total
        assert mock_push.await_count == 4
        # 3 backoff sleeps with the bounded schedule.
        assert [c.args for c in mock_sleep.await_args_list] == [(1.0,), (3.0,), (9.0,)]
        # Session torn down ONCE before the loop, not on every iteration —
        # so a user-reconnect mid-backoff isn't flushed by the next retry.
        mock_close.assert_awaited_once_with(mac)
        assert mac not in manager._pushing

    async def test_on_device_available_aborts_when_offline_during_retry(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """If the device drops offline mid-retry, abort and clear the guard."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._pushing.add(mac)

        # First availability check happens after the first sleep — return False
        # to simulate the device dropping offline during the retry window.
        with (
            patch.object(manager, "_push_config_to_device", new_callable=AsyncMock, return_value=False) as mock_push,
            patch.object(manager, "async_close_session", new_callable=AsyncMock),
            patch.object(manager, "_is_device_available", return_value=False),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new_callable=AsyncMock),
        ):
            await manager._on_device_available(mac)

        # Initial push only — bailed before any retry push.
        assert mock_push.await_count == 1
        assert mac not in manager._pushing

    async def test_on_device_available_skips_push_when_entity_update_guard_set(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_on_device_available skips push when entity update guard is set."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # Simulate: entity update guard was set by websocket_set_settings
        manager._entity_update_macs.add(mac)
        manager._pushing.add(mac)

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            await manager._on_device_available(mac)

        mock_push.assert_not_awaited()
        # Guard stays set — cleared by 60-second timer, not by skip path
        assert mac in manager._entity_update_macs
        assert mac in manager._pushing

    async def test_on_device_available_broadcasts_online_under_entity_update_guard(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Entity-update-guard skip path must still broadcast device-back-online.

        ESPHome reload triggered by an entity-registry change flips the device
        offline (which fires _fire_device_list_changed with available=False),
        then online. _on_device_available sets dev.available=True; if the
        guard-skip path returns without firing the broadcast, the panel's
        bootstrap (onDeviceListChanged's `!hasDeviceSession` guard, #336) never
        sees the device come back, so a device that has no session (e.g. it was
        offline when the panel mounted, or was removed and re-added) never gets
        one — the user sees a stuck/empty grid until they refresh. Stream
        recovery for a device that ALREADY has a session is the manager's own
        job (`_ensure_streams`, above); this broadcast is what the device-list
        push still needs to carry on top of that.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        # Pre-condition: device was previously broadcast as offline
        # (the offline branch in _on_state_changed flipped this to False
        # and fired _fire_device_list_changed). The frontend now expects
        # a corresponding True broadcast to drive its recovery path.
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", available=False)
        manager._entity_update_macs.add(mac)
        manager._pushing.add(mac)

        with patch.object(manager, "_fire_device_list_changed") as mock_fire:
            await manager._on_device_available(mac)

        # The available flip itself is unconditional — already correct.
        assert manager.devices[mac].available is True
        # The broadcast must fire so subscribers see false→true.
        mock_fire.assert_called_once()

    async def test_on_device_available_pushes_when_failed_push_pending(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Recovery path: entity-update guard skips redundant pushes, but a
        failed debounced push (e.g. fired while ESPHome was reloading and the
        device was offline) leaves the device unsynced. When _on_device_available
        runs with the guard armed AND a failure marker for this mac, push
        anyway and clear the marker.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        # Both flags set: guard armed (would normally skip) AND a failed push
        # is pending (must override skip).
        manager._entity_update_macs.add(mac)
        manager._failed_pushes.add(mac)

        with patch.object(manager, "_push_config_to_device", AsyncMock(return_value=True)) as mock_push:
            await manager._on_device_available(mac)

        mock_push.assert_awaited_once_with(mac)
        # Marker cleared after recovery push.
        assert mac not in manager._failed_pushes

    async def test_on_device_available_does_not_close_user_session_during_backoff(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Closing the session on every retry tears down a user-opened
        session if they reconnect mid-backoff. Close only once, before
        the backoff loop — even when the loop runs through several
        iterations before succeeding."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        close_count = 0

        async def fake_close(_mac: str) -> None:
            nonlocal close_count
            close_count += 1

        push_attempts = 0

        async def fake_push(_mac: str) -> bool:
            nonlocal push_attempts
            push_attempts += 1
            # First push fails; second push (first retry) also fails;
            # third push succeeds. With the broken code this would close
            # 3 times total (initial fail + 2 retry tops). With the fix it's 1.
            return push_attempts >= 3

        with (
            patch.object(manager, "_push_config_to_device", side_effect=fake_push),
            patch.object(manager, "async_close_session", side_effect=fake_close),
            patch.object(manager, "_is_device_available", return_value=True),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
        ):
            await manager._on_device_available(mac)

        assert close_count == 1, f"session must be closed exactly once before the loop (got {close_count})"

    async def test_on_device_removed_cleans_up(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device registry removal cleans up stored settings and runtime state."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._device_id_to_mac["dev123"] = mac
        manager._store.devices[mac] = {"settings": {"led_mode": "Manual"}}
        manager._build_flags[mac] = {"has_co2": True}
        manager._entity_update_macs.add(mac)
        manager.note_target_subscribe(mac, "grid_target_subs")

        # Pre-populate configurations that should survive
        manager._store.configurations["Living Room"] = {"grid_bytes": [1, 2, 3]}

        with patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close:
            event = MagicMock()
            event.data = {"action": "remove", "device_id": "dev123"}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        mock_close.assert_awaited_once_with(mac)
        assert mac not in manager._store.devices
        assert mac not in manager.devices
        assert mac not in manager._build_flags
        assert mac not in manager._entity_update_macs
        assert mac not in manager._target_subs
        assert "Living Room" in manager._store.configurations

    async def test_on_device_removed_clears_push_runtime_state(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Removal must also drop per-mac push runtime state: the push lock,
        the failed-push marker, any pending debounced push, and the pending
        entity-update-clear timer — otherwise a removed mac leaks entries
        (and a live timer) past the device's lifetime."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._device_id_to_mac["dev123"] = mac
        manager._push_locks[mac] = asyncio.Lock()
        manager._failed_pushes.add(mac)
        # Short-delay debounced push: still pending when removal lands. The
        # delay must be long enough that removal wins the race, short enough
        # that an UNcancelled task would have fired by block_till_done below.
        manager._request_push(mac, delay=0.01)
        assert mac in manager._pending_pushes
        pending_push = manager._pending_pushes[mac]
        manager._schedule_entity_update_clear(mac)
        assert mac in manager._entity_update_clear_cancels

        with (
            patch.object(manager, "async_close_session", new_callable=AsyncMock),
            patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push,
        ):
            await manager._on_device_removed(mac)
            await hass.async_block_till_done()

        assert mac not in manager._push_locks
        assert mac not in manager._failed_pushes
        assert mac not in manager._pending_pushes
        # The debounce task swallows its CancelledError (returns cleanly), so
        # assert on the observable effect: the push body never ran.
        assert pending_push.done()
        mock_push.assert_not_awaited()
        assert mac not in manager._entity_update_clear_cancels
        assert mac not in manager._entity_update_macs

    async def test_on_device_removed_cancels_the_pending_pipeline_push(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Same invariant as the debounced config push: nothing may still be
        scheduled to push to a device that no longer exists."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._device_id_to_mac["dev123"] = mac
        manager._request_pipeline_push(mac, delay=0.01)
        assert mac in manager._pending_pipeline_pushes
        pending = manager._pending_pipeline_pushes[mac]

        with (
            patch.object(manager, "async_close_session", new_callable=AsyncMock),
            patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push,
        ):
            await manager._on_device_removed(mac)
            await hass.async_block_till_done()

        assert mac not in manager._pending_pipeline_pushes
        # The debounce task swallows its CancelledError (returns cleanly), so
        # assert on the observable effect: the push body never ran.
        assert pending.done()
        mock_push.assert_not_awaited()

    async def test_on_device_removed_notifies_subscribers(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device removal fires device list callbacks."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._device_id_to_mac["dev123"] = mac

        cb = MagicMock()
        unsub = manager.on_device_list_changed(cb)

        with patch.object(manager, "async_close_session", new_callable=AsyncMock):
            event = MagicMock()
            event.data = {"action": "remove", "device_id": "dev123"}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        cb.assert_called_once()
        unsub()

    async def test_device_id_reverse_map_maintained_on_discover_and_remove(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Discovery populates `_device_id_to_mac`; removal drops the entry.

        The reverse index makes `_on_device_registry_updated` O(1); without
        this invariant the registry-update path silently goes O(N) again or
        leaks stale entries on remove.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="aabbccddeeff-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()

        assert manager._device_id_to_mac.get(device.id) == "AA:BB:CC:DD:EE:FF"

        with patch.object(manager, "async_close_session", new_callable=AsyncMock):
            event = MagicMock()
            event.data = {"action": "remove", "device_id": device.id}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        assert device.id not in manager._device_id_to_mac

    async def test_rediscovery_under_new_esphome_entry_swaps_listener(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """When the same MAC is rediscovered under a different ESPHome config
        entry (e.g. user removed and re-added the integration), the stale
        entry-update listener for the old entry must be unsubscribed and a
        new listener registered for the new entry. The stale APIClient
        session must also be closed and the push guard cleared so the next
        online transition pushes config on the new connection — otherwise
        get_session() / _push_config_to_device() keep reusing a client
        bound to the old host."""
        mac = "AA:BB:CC:DD:EE:FF"

        old_unsub = MagicMock()
        new_unsub = MagicMock()

        # Pre-existing state: device known under entry "old_entry", with an
        # active session and the push guard set.
        manager.devices[mac] = ManagedDevice(
            mac=mac,
            name="EPP",
            host="192.168.1.50",
            esphome_config_entry_id="old_entry",
            device_id="dev_old",
        )
        manager._device_id_to_mac["dev_old"] = mac
        manager._entry_update_unsubs["old_entry"] = old_unsub
        stale_session = MagicMock()
        manager._active_connections[mac] = stale_session
        manager._pushing.add(mac)

        # Build a new device-registry entry with a different config_entry_id.
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        new_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.51"}, title="EPP")
        new_entry.add_to_hass(hass)
        new_device = dev_reg.async_get_or_create(
            config_entry_id=new_entry.entry_id,
            connections={("mac", mac.lower())},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id=f"{mac}-firmware_version",
            config_entry=new_entry,
            device_id=new_device.id,
        )

        # Patch add_update_listener to track new-entry subscribe.
        with (
            patch.object(new_entry, "add_update_listener", return_value=new_unsub),
            patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close,
        ):
            await manager.async_discover()

        # Old listener was unsubscribed.
        old_unsub.assert_called_once()
        # New listener registered under the new entry id.
        assert new_entry.entry_id in manager._entry_update_unsubs
        assert manager._entry_update_unsubs[new_entry.entry_id] is new_unsub
        # Old entry id no longer tracked.
        assert "old_entry" not in manager._entry_update_unsubs
        # Device tracking moved to the new entry / device id.
        assert manager.devices[mac].esphome_config_entry_id == new_entry.entry_id
        assert manager.devices[mac].device_id == new_device.id
        # Stale session closed and push guard cleared so the new entry's
        # connection lifecycle starts fresh.
        mock_close.assert_awaited_once_with(mac)
        assert mac not in manager._pushing

    async def test_entity_create_re_runs_discovery_on_device_id_change(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """`_on_entity_registry_updated` must re-run discovery when an entity
        for a known MAC arrives under a *different* HA device_id. Without
        this, the live re-add flow (user removes the ESPHome integration and
        re-adds it) leaves the rediscovery branch in async_discover dead —
        the new firmware_version entity arrives via this handler, which
        previously returned early on `mac in self.devices` regardless of
        whether the device.id had changed."""
        manager._discover_debounce = 0.01
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(
            mac=mac,
            name="EPP",
            host="192.168.1.50",
            esphome_config_entry_id="old_entry",
            device_id="dev_old",
        )
        manager._device_id_to_mac["dev_old"] = mac

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        new_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.51"}, title="EPP")
        new_entry.add_to_hass(hass)
        new_device = dev_reg.async_get_or_create(
            config_entry_id=new_entry.entry_id,
            connections={("mac", mac.lower())},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        new_entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id=f"{mac}-firmware_version",
            config_entry=new_entry,
            device_id=new_device.id,
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": new_entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        # Discovery must run because device_id changed for the known MAC.
        mock_discover.assert_awaited()

    async def test_entity_create_skips_discovery_when_device_id_unchanged(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Inverse: a create event for a *new entity* on an already-discovered
        device (same device_id) must NOT re-run discovery — the existing
        early-return optimisation still applies."""
        mac = "AA:BB:CC:DD:EE:FF"

        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", mac.lower())},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        manager.devices[mac] = ManagedDevice(
            mac=mac,
            name="EPP",
            host="192.168.1.50",
            esphome_config_entry_id=esphome_entry.entry_id,
            device_id=device.id,
        )
        manager._device_id_to_mac[device.id] = mac

        # New entity on the same device.
        new_entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id=f"{mac}-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        with patch.object(manager, "async_discover", new_callable=AsyncMock) as mock_discover:
            event = MagicMock()
            event.data = {"action": "create", "entity_id": new_entity.entity_id}
            manager._on_entity_registry_updated(event)
            await hass.async_block_till_done()

        mock_discover.assert_not_awaited()

    async def test_discovery_notifies_subscribers(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Discovering a new device fires device list callbacks."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="aabbccddeeff-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        await manager.async_discover()

        cb.assert_called_once()

    async def test_discovery_resets_stale_zone_entities_on_readd(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Re-adding a deleted device resets leftover zone entity names and disables them.

        When a user deletes a device and re-adds it, ESPHome/HA may leave stale
        zone entity registry entries with custom names ("Zone Cupboard") and
        disabled_by=None. On rediscovery with no stored layout, EPP must reset
        those entries so the device looks fresh.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="aabbccddeeff-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        # Leftover zone entities from prior configuration — custom names,
        # enabled. Simulate state after delete+readd where HA didn't purge them.
        zone0 = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone0.entity_id, name="Zone Rest of Room", disabled_by=None)
        zone1 = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone1.entity_id, name="Zone Cupboard", disabled_by=None)
        zone1_tc = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone1_tc.entity_id, name="Zone Cupboard Target Count", disabled_by=None)

        # No stored layout — device was deleted, so storage was cleared.
        assert manager._store.devices.get("AA:BB:CC:DD:EE:FF") is None

        await manager.async_discover()

        # All stale zone entities reset: no custom name, disabled by integration.
        zone0_after = ent_reg.async_get(zone0.entity_id)
        assert zone0_after.name is None
        assert zone0_after.disabled_by == er.RegistryEntryDisabler.INTEGRATION

        zone1_after = ent_reg.async_get(zone1.entity_id)
        assert zone1_after.name is None
        assert zone1_after.disabled_by == er.RegistryEntryDisabler.INTEGRATION

        zone1_tc_after = ent_reg.async_get(zone1_tc.entity_id)
        assert zone1_tc_after.name is None
        assert zone1_tc_after.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_on_device_removed_ignores_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Device removal for unknown device_id is a no-op."""
        with patch.object(manager, "async_close_session", new_callable=AsyncMock) as mock_close:
            event = MagicMock()
            event.data = {"action": "remove", "device_id": "unknown"}
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()

        mock_close.assert_not_awaited()

    async def test_on_managed_device_updated_fires_callback(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Update events for managed devices fire device list callbacks (e.g. rename)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._device_id_to_mac["dev123"] = mac
        manager._store.devices[mac] = {"settings": {}}

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        event = MagicMock()
        event.data = {"action": "update", "device_id": "dev123"}
        manager._on_device_registry_updated(event)
        await hass.async_block_till_done()

        # Device is still present (update is not remove)
        assert mac in manager.devices
        assert mac in manager._store.devices
        # Callback fired so subscribers re-fetch the list
        cb.assert_called_once()

    async def test_managed_update_skips_repair_sync_when_fw_and_name_unchanged(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Update events with no firmware-version or name change skip the
        Repairs re-sync — `_sync_firmware_repair_issue` is the only call in
        this path that hits the issue registry, and re-firing it on every
        bus event (area change, label edit, etc.) is pure noise."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev123")
        manager._device_id_to_mac["dev123"] = mac
        manager._store.devices[mac] = {"settings": {}}

        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )
        # The mock device_id "dev123" won't match the real one, but we override
        # the lookup result through the reverse map. Refit it.
        real_device = next(d for d in all_devices(dev_reg) if d.name == "EPP")
        manager.devices[mac].device_id = real_device.id
        manager._device_id_to_mac.pop("dev123", None)
        manager._device_id_to_mac[real_device.id] = mac

        with patch("custom_components.eppgrid.device_manager._sync_firmware_repair_issue") as mock_sync:
            event = MagicMock()
            event.data = {"action": "update", "device_id": real_device.id}
            # First call should sync — initial state has no cached value.
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()
            assert mock_sync.call_count == 1

            # Second call with no fw/name change must NOT re-sync.
            mock_sync.reset_mock()
            manager._on_device_registry_updated(event)
            await hass.async_block_till_done()
            mock_sync.assert_not_called()

    async def test_on_unmanaged_device_updated_does_not_fire(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Update events for devices we don't manage don't fire the callback."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id="dev123"
        )

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        event = MagicMock()
        event.data = {"action": "update", "device_id": "some_other_device"}
        manager._on_device_registry_updated(event)
        await hass.async_block_till_done()

        cb.assert_not_called()

    async def test_esphome_host_change_updates_device_and_closes_session(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """ESPHome host update refreshes dev.host and closes any stale session."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        mac = "AA:BB:CC:DD:EE:FF"
        assert manager.devices[mac].host == "192.168.1.50"

        stale_conn = MagicMock()
        stale_conn.connected = True
        stale_conn.async_disconnect = AsyncMock()
        manager._active_connections[mac] = stale_conn
        manager._pushing.add(mac)

        hass.config_entries.async_update_entry(esphome_entry, data={**esphome_entry.data, "host": "192.168.1.99"})
        await hass.async_block_till_done()

        assert manager.devices[mac].host == "192.168.1.99"
        assert mac not in manager._active_connections
        stale_conn.async_disconnect.assert_awaited_once()
        assert mac not in manager._pushing

    async def test_esphome_entry_update_without_host_change_is_noop(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """ESPHome entry updates that don't change host must not disturb the session."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        mac = "AA:BB:CC:DD:EE:FF"

        live_conn = MagicMock()
        live_conn.connected = True
        live_conn.async_disconnect = AsyncMock()
        manager._active_connections[mac] = live_conn
        manager._pushing.add(mac)

        # Title change only — host is identical.
        hass.config_entries.async_update_entry(esphome_entry, title="EPP Renamed")
        await hass.async_block_till_done()

        assert manager.devices[mac].host == "192.168.1.50"
        assert manager._active_connections.get(mac) is live_conn
        live_conn.async_disconnect.assert_not_awaited()
        assert mac in manager._pushing

    async def test_device_removal_unsubs_esphome_entry_update_listener(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Removing a device unsubscribes its ESPHome entry listener to avoid leaks."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        mac = "AA:BB:CC:DD:EE:FF"
        assert esphome_entry.entry_id in manager._entry_update_unsubs

        await manager._on_device_removed(mac)

        assert esphome_entry.entry_id not in manager._entry_update_unsubs

    async def test_async_stop_unsubs_esphome_entry_update_listener(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_stop tears down ESPHome entry update listeners."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(
            domain="esphome",
            data={"host": "192.168.1.50"},
            title="EPP Living Room",
        )
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP Living Room",
            manufacturer="EverythingSmartTechnology",
            model="Everything Presence Pro",
        )

        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        await manager.async_discover()
        mac = "AA:BB:CC:DD:EE:FF"

        await manager.async_stop()

        hass.config_entries.async_update_entry(esphome_entry, data={**esphome_entry.data, "host": "192.168.1.200"})
        await hass.async_block_till_done()

        # Listener was unsubscribed — host in our cache stays at the old value.
        assert manager.devices[mac].host == "192.168.1.50"

    async def test_on_esphome_entry_updated_safe_under_concurrent_mutation(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """``_on_esphome_entry_updated`` must iterate a frozen snapshot of
        the device map — otherwise a concurrent mutator that runs while
        the handler is awaiting ``async_close_session`` would invalidate
        the live iterator.

        We do NOT pin the iteration phrase via ``inspect.getsource`` —
        equivalent safe refactors (``tuple(...)``, a local ``snapshot =
        list(self.devices.items())``, ``for k in list(self.devices):``)
        are all acceptable.

        The contract a snapshot guarantees is: by the time the handler
        first awaits, every device pair has already been observed. The
        broken alternative (a live ``dict_items`` view) holds an
        iterator that hasn't been fully consumed — the iterator's
        ``__next__`` could still fire after the await, and a concurrent
        mutator landing during that await would crash with
        ``RuntimeError: dictionary changed size during iteration``.

        We probe BOTH halves:

        1. Install a ``dict`` whose ``items()`` returns a generator
           that records when each pair is consumed and raises
           ``RuntimeError`` on the next ``__next__`` if the dict has
           been mutated. A faithful snapshot consumes ALL pairs before
           the handler suspends; a live view leaves pairs unconsumed.
        2. Pause the handler at its first ``await`` and verify the
           generator has been fully exhausted (i.e. all three device
           pairs were consumed) — this is the load-bearing assertion
           that fails under live ``self.devices.items()``.
        3. Mutate the dict while the handler is suspended and verify
           it completes cleanly. With a snapshot the for-loop is over
           a frozen list, so the mutation is harmless; with a live
           view the post-await ``__next__`` would raise.
        """
        entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.99"})
        entry.add_to_hass(hass)

        consumed: list[str] = []

        class _SnapshotProbingDict(dict):
            def items(self):
                snapshot_at_call = list(dict.items(self))
                live = self
                size_at_call = len(snapshot_at_call)

                def _gen():
                    for pair in snapshot_at_call:
                        # Mirror CPython's live-iteration semantics: if
                        # the dict has changed size since this generator
                        # was created, raise on the next ``__next__``.
                        if len(live) != size_at_call:
                            raise RuntimeError("dictionary changed size during iteration")
                        consumed.append(pair[0])
                        yield pair

                return _gen()

        det = _SnapshotProbingDict()
        # Layout: matching device FIRST so the body's await fires
        # immediately after one consumed pair. Two non-matching devices
        # AFTER it so a faithful snapshot will have consumed all three
        # by the time the for-loop's iterator was drained into ``list()``;
        # a live view would only have consumed one pair and would have
        # to keep iterating after the await.
        det["AA:BB:CC:DD:EE:01"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:01",
            name="MATCHING",
            host="192.168.1.50",
            esphome_config_entry_id=entry.entry_id,
        )
        det["AA:BB:CC:DD:EE:02"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:02",
            name="OTHER1",
            host="10.0.0.1",
            esphome_config_entry_id="other-entry-id-1",
        )
        det["AA:BB:CC:DD:EE:03"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:03",
            name="OTHER2",
            host="10.0.0.2",
            esphome_config_entry_id="other-entry-id-2",
        )
        manager.devices = det  # type: ignore[assignment]
        manager._active_connections["AA:BB:CC:DD:EE:01"] = MagicMock()

        release = asyncio.Event()
        close_started = asyncio.Event()

        async def slow_close(_mac: str) -> None:
            close_started.set()
            await release.wait()

        with patch.object(manager, "async_close_session", side_effect=slow_close):
            handler_task = asyncio.create_task(manager._on_esphome_entry_updated(hass, entry))
            await asyncio.wait_for(close_started.wait(), timeout=1.0)

            # Load-bearing assertion: by the time the handler is awaiting
            # async_close_session, the iteration must have already
            # consumed every device pair — that's the snapshot contract.
            # A live ``self.devices.items()`` view would have stopped at
            # the matching device (one consumed), leaving the next two
            # pairs to be consumed AFTER the await — which would raise
            # because of the mutation we're about to perform.
            assert consumed == [
                "AA:BB:CC:DD:EE:01",
                "AA:BB:CC:DD:EE:02",
                "AA:BB:CC:DD:EE:03",
            ], (
                "expected the iteration target to be a fully-materialised "
                f"snapshot before the first await; got {consumed!r} — "
                "production code must wrap self.devices.items() in list()/"
                "tuple()/local snapshot rather than holding a live view."
            )

            # Mutate while the handler is suspended. Snapshot iteration
            # is unaffected (frozen list); live iteration would crash
            # on the next __next__.
            manager.devices.pop("AA:BB:CC:DD:EE:02", None)
            release.set()
            await asyncio.wait_for(handler_task, timeout=1.0)

    async def test_state_change_listener_does_not_fire_for_unrelated_entities(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The listener must only see state changes for managed ESPHome entities,
        not every state change on the HA bus."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"})
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        # Other-domain entity not under management.
        other = MockConfigEntry(domain="hue", data={})
        other.add_to_hass(hass)
        ent_reg.async_get_or_create("light", "hue", unique_id="hue_1", config_entry=other)

        fired: list[str] = []
        orig = manager._on_state_changed

        @callback
        def spy(evt):
            fired.append(evt.data.get("entity_id", ""))
            orig(evt)

        manager._on_state_changed = spy  # type: ignore[assignment]
        await manager.async_start()
        try:
            hass.states.async_set("light.hue_1", "on")
            await hass.async_block_till_done()
            assert "light.hue_1" not in fired
        finally:
            await manager.async_stop()

    async def test_refresh_state_listener_safe_under_concurrent_device_mutation(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """``_refresh_state_listener`` is invoked from event callbacks
        (async_discover, _on_device_removed, …) while other tasks may
        concurrently add or remove entries from ``self.devices``. If the
        rebuild iterates the live dict, a concurrent mutation raises
        ``RuntimeError: dictionary changed size during iteration``.
        """
        # Inspect the source to lock in the snapshot — a runtime test
        # is brittle here because the rebuild's only awaitable step
        # (async_track_state_change_event) is wrapped synchronously, so
        # we can't reliably interleave a mutator. The source-level
        # assertion catches any future refactor that drops the list().
        import inspect

        from custom_components.eppgrid.device_manager import DeviceManager as _DM

        src = inspect.getsource(_DM._refresh_state_listener)
        assert "list(self.devices.values())" in src, (
            "_refresh_state_listener must iterate a snapshot via "
            "list(self.devices.values()) — a concurrent add/remove during "
            "rebuild would otherwise invalidate the live iterator"
        )

        # Behaviour smoke test: mutating self.devices during the rebuild
        # must not raise. We simulate a mutation by patching
        # async_entries_for_device to mutate self.devices on its first
        # call, then yield results. Without the snapshot the next loop
        # step would observe the size-change.
        from homeassistant.helpers import device_registry as _dr
        from homeassistant.helpers import entity_registry as _er

        dev_reg = _dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device_a = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:01")},
            name="EPP A",
        )
        device_b = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:02")},
            name="EPP B",
        )
        manager.devices["AA:BB:CC:DD:EE:01"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:01", name="EPP A", host="192.168.1.50", device_id=device_a.id
        )
        manager.devices["AA:BB:CC:DD:EE:02"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:02", name="EPP B", host="192.168.1.51", device_id=device_b.id
        )

        original_entries = _er.async_entries_for_device
        first_call = [True]

        def mutating_entries_for_device(*args, **kwargs):
            if first_call[0]:
                first_call[0] = False
                # Mutate while loop is mid-rebuild — would crash live
                # iterator on next __next__ without the list() snapshot.
                manager.devices.pop("AA:BB:CC:DD:EE:02", None)
            return original_entries(*args, **kwargs)

        with patch(
            "custom_components.eppgrid.device_manager.er.async_entries_for_device",
            side_effect=mutating_entries_for_device,
        ):
            # Must NOT raise.
            manager._refresh_state_listener()

    async def test_async_discover_refreshes_state_listener_when_device_id_changes(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """If an already-managed MAC is rediscovered under a different HA
        device_id (the integration re-add flow), the entity_id set
        attached to that mac changes — the targeted state-change tracker
        must be rebuilt to pick up the new entity_ids. ``found_new`` is
        false on this path, so the rebuild must also fire on
        ``ids_changed``."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        # New ESPHome entry + device representing the post-re-add state.
        new_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP-new")
        new_entry.add_to_hass(hass)
        new_device = dev_reg.async_get_or_create(
            config_entry_id=new_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
            manufacturer=EPP_MANUFACTURER,
            model=EPP_MODELS[0],
        )
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            config_entry=new_entry,
            device_id=new_device.id,
        )

        # Pre-populate manager.devices with the OLD (now-stale) device_id
        # and entry_id — both differ from what async_discover will find
        # in the registry. async_discover sees the same MAC under
        # different IDs (the re-add flow) and must rebuild the state
        # listener so it tracks the freshly-created entity_ids, not the
        # ones attached to the dead device_id.
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP",
            host="192.168.1.50",
            esphome_config_entry_id="stale-entry-id",
            device_id="stale-device-id",
        )

        with (
            patch.object(manager, "_refresh_state_listener") as mock_refresh,
            patch.object(manager, "async_update_zone_entities", new_callable=AsyncMock),
        ):
            await manager.async_discover()

        # Existing-mac rediscovery with new IDs must trigger a rebuild
        # so the listener tracks the new entity_ids.
        mock_refresh.assert_called()
        # Manager state updated to point at the new IDs.
        assert manager.devices["AA:BB:CC:DD:EE:FF"].device_id == new_device.id
        assert manager.devices["AA:BB:CC:DD:EE:FF"].esphome_config_entry_id == new_entry.entry_id


# ---------------------------------------------------------------------------
# Debounced push request tests
# ---------------------------------------------------------------------------


class TestRequestPush:
    """Tests for DeviceManager._request_push — the trailing-debounce wrapper.

    The frontend's calibration / delete-calibration / save flows fire 3
    sequential WS commands (set_settings → set_setup → set_room_layout) for
    a single user action. Each WS handler used to `await _push_config_to_device`,
    fanning out into 3 full config pushes within ~10ms. _request_push
    collapses these into a single trailing-debounced push.
    """

    async def test_coalesces_rapid_fire_calls(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Three calls inside the debounce window collapse into one push."""
        mac = "AA:BB:CC:DD:EE:FF"
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_push(mac, delay=0.05)
            manager._request_push(mac, delay=0.05)
            manager._request_push(mac, delay=0.05)
            # Wait past the debounce window for the trailing fire.
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        mock_push.assert_awaited_once_with(mac)

    async def test_separate_macs_each_push(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Debounce is per-mac — calls for different devices don't collapse."""
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_push("AA:BB:CC:DD:EE:01", delay=0.05)
            manager._request_push("AA:BB:CC:DD:EE:02", delay=0.05)
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        assert mock_push.await_count == 2
        called_macs = {call.args[0] for call in mock_push.await_args_list}
        assert called_macs == {"AA:BB:CC:DD:EE:01", "AA:BB:CC:DD:EE:02"}

    async def test_calls_separated_by_more_than_delay_each_push(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Calls for the same mac with a gap larger than `delay` produce two pushes."""
        mac = "AA:BB:CC:DD:EE:FF"
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_push(mac, delay=0.03)
            await asyncio.sleep(0.08)  # well past the first window
            await hass.async_block_till_done()
            manager._request_push(mac, delay=0.03)
            await asyncio.sleep(0.08)
            await hass.async_block_till_done()

        assert mock_push.await_count == 2

    async def test_request_push_does_not_schedule_after_stop(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_stop sets _stopping; subsequent _request_push calls are no-ops."""
        manager._stopping = True
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_push("AA:BB:CC:DD:EE:FF", delay=0.05)
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        mock_push.assert_not_awaited()

    async def test_async_stop_drains_pending_pushes(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A push pending in the debounce window is cancelled on async_stop.

        Without this, the timer task would outlive the config entry and HA
        2026.4+ pytest fixtures fail the test for leaked tasks.
        """
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_push("AA:BB:CC:DD:EE:FF", delay=0.5)  # long delay
            # Don't wait — call async_stop while the timer is still pending.
            await manager.async_stop()

        mock_push.assert_not_awaited()
        # Pending tracking dict empty after stop.
        assert not manager._pending_pushes

    async def test_failed_push_marks_mac_for_retry(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """If the debounced push fails (e.g. fires while ESPHome is reloading
        and the device is offline), the mac is recorded so the next
        _on_device_available run can recover instead of skipping under the
        entity-update guard.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        # Push returns False — simulates the device being offline mid-reload.
        with patch.object(manager, "_push_config_to_device", AsyncMock(return_value=False)):
            manager._request_push(mac, delay=0.02)
            await asyncio.sleep(0.08)
            await hass.async_block_till_done()

        assert mac in manager._failed_pushes

    async def test_successful_push_clears_failed_marker(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """A successful push clears any previous failure marker for the mac."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._failed_pushes.add(mac)  # pretend a previous failure left a marker

        with patch.object(manager, "_push_config_to_device", AsyncMock(return_value=True)):
            manager._request_push(mac, delay=0.02)
            await asyncio.sleep(0.08)
            await hass.async_block_till_done()

        assert mac not in manager._failed_pushes

    async def test_does_not_cancel_in_flight_push(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A new _request_push during an in-flight push must not cancel it.

        Regression: previously _pending_pushes[mac] tracked the task across
        both the debounce-sleep phase AND the actual push phase. A new
        _request_push call would see the not-done task and cancel it,
        raising CancelledError mid _push_config_to_device — interrupting
        a network write and leaving the device unsynced. The fix removes
        the entry once the task transitions from sleep to push, so a
        concurrent request schedules a follow-up timer instead.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        push_started = asyncio.Event()
        push_can_finish = asyncio.Event()
        cancelled = False

        async def slow_push(_mac: str) -> bool:
            nonlocal cancelled
            push_started.set()
            try:
                await push_can_finish.wait()
            except asyncio.CancelledError:
                cancelled = True
                raise
            return True

        with patch.object(manager, "_push_config_to_device", side_effect=slow_push) as mock_push:
            manager._request_push(mac, delay=0.02)
            # Wait until the first push is actually running (past the sleep).
            await asyncio.wait_for(push_started.wait(), timeout=1.0)
            # The task has removed itself from _pending_pushes during its
            # sync transition between sleep-end and the push await.
            assert mac not in manager._pending_pushes

            # Issue a second request while the first is in-flight.
            manager._request_push(mac, delay=0.02)
            # Yield once so the new timer task gets registered.
            await asyncio.sleep(0)
            # New timer is registered; first push is still running.
            assert mac in manager._pending_pushes
            assert not cancelled

            # Let the first push finish.
            push_can_finish.set()
            # Give the second timer time to elapse and push to fire.
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        assert mock_push.await_count == 2
        assert not cancelled


class TestRequestPipelinePush:
    """Tests for DeviceManager._request_pipeline_push — the trailing-debounce
    wrapper around the pipeline push.

    A card mounting with `show_heatmap: true` opens `overview/subscribe` AND
    `overview/subscribe_heatmap` back-to-back; each handler used to fire a
    fire-and-forget `async_push_pipeline_to_device`, so the ESP32 got
    `epp_set_pipeline` twice per mount. _request_pipeline_push collapses these
    into a single trailing-debounced push. It mirrors _request_push's
    trailing-edge machinery exactly, but awaits _push_pipeline_to_device and
    never touches `_failed_pushes` (that recovery bookkeeping is config-only).
    """

    async def test_coalesces_rapid_fire_calls(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Two calls inside the debounce window collapse into one pipeline push."""
        mac = "AA:BB:CC:DD:EE:FF"
        with patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_pipeline_push(mac, delay=0.05)
            manager._request_pipeline_push(mac, delay=0.05)
            # Wait past the debounce window for the trailing fire.
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        mock_push.assert_awaited_once_with(mac)

    async def test_separate_macs_each_push(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Debounce is per-mac — calls for different devices don't collapse."""
        with patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_pipeline_push("AA:BB:CC:DD:EE:01", delay=0.05)
            manager._request_pipeline_push("AA:BB:CC:DD:EE:02", delay=0.05)
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        assert mock_push.await_count == 2
        called_macs = {call.args[0] for call in mock_push.await_args_list}
        assert called_macs == {"AA:BB:CC:DD:EE:01", "AA:BB:CC:DD:EE:02"}

    async def test_calls_separated_by_more_than_delay_each_push(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Calls for the same mac with a gap larger than `delay` produce two pushes."""
        mac = "AA:BB:CC:DD:EE:FF"
        with patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_pipeline_push(mac, delay=0.03)
            await asyncio.sleep(0.08)  # well past the first window
            await hass.async_block_till_done()
            manager._request_pipeline_push(mac, delay=0.03)
            await asyncio.sleep(0.08)
            await hass.async_block_till_done()

        assert mock_push.await_count == 2

    async def test_request_pipeline_push_does_not_schedule_after_stop(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_stop sets _stopping; subsequent _request_pipeline_push calls are no-ops."""
        manager._stopping = True
        with patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_pipeline_push("AA:BB:CC:DD:EE:FF", delay=0.05)
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        mock_push.assert_not_awaited()

    async def test_async_stop_drains_pending_pipeline_pushes(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A pipeline push pending in the debounce window is cancelled on async_stop.

        Without this, the timer task would outlive the config entry and HA
        2026.4+ pytest fixtures fail the test for leaked tasks.
        """
        with patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_pipeline_push("AA:BB:CC:DD:EE:FF", delay=0.5)  # long delay
            # Don't wait — call async_stop while the timer is still pending.
            await manager.async_stop()

        mock_push.assert_not_awaited()
        # Pending tracking dict empty after stop.
        assert not manager._pending_pipeline_pushes

    async def test_does_not_cancel_in_flight_pipeline_push(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A new _request_pipeline_push during an in-flight push must not cancel it.

        Regression mirror of _request_push: _pending_pipeline_pushes[mac] must
        stop tracking the task once it transitions from the debounce-sleep into
        the actual push, so a concurrent request schedules a follow-up timer
        instead of cancelling the in-flight push (which would interrupt a
        network write and leave the device unsynced).
        """
        mac = "AA:BB:CC:DD:EE:FF"
        push_started = asyncio.Event()
        push_can_finish = asyncio.Event()
        cancelled = False

        async def slow_push(_mac: str) -> None:
            nonlocal cancelled
            push_started.set()
            try:
                await push_can_finish.wait()
            except asyncio.CancelledError:
                cancelled = True
                raise

        with patch.object(manager, "_push_pipeline_to_device", side_effect=slow_push) as mock_push:
            manager._request_pipeline_push(mac, delay=0.02)
            # Wait until the first push is actually running (past the sleep).
            await asyncio.wait_for(push_started.wait(), timeout=1.0)
            # The task has removed itself from _pending_pipeline_pushes during
            # its sync transition between sleep-end and the push await.
            assert mac not in manager._pending_pipeline_pushes

            # Issue a second request while the first is in-flight.
            manager._request_pipeline_push(mac, delay=0.02)
            # Yield once so the new timer task gets registered.
            await asyncio.sleep(0)
            # New timer is registered; first push is still running.
            assert mac in manager._pending_pipeline_pushes
            assert not cancelled

            # Let the first push finish.
            push_can_finish.set()
            # Give the second timer time to elapse and push to fire.
            await asyncio.sleep(0.1)
            await hass.async_block_till_done()

        assert mock_push.await_count == 2
        assert not cancelled

    async def test_cancelled_pending_push_drops_from_dict(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Cancelling a still-pending timer runs `_drop`, which removes the
        task from `_pending_pipeline_pushes` (the cancel-before-fire path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        with patch.object(manager, "_push_pipeline_to_device", new_callable=AsyncMock) as mock_push:
            manager._request_pipeline_push(mac, delay=0.5)  # long delay, stays pending
            pending = manager._pending_pipeline_pushes[mac]
            pending.cancel()
            # Let the cancellation settle so the done-callback (`_drop`) runs.
            await asyncio.sleep(0)
            await hass.async_block_till_done()

        mock_push.assert_not_awaited()
        assert mac not in manager._pending_pipeline_pushes


# ---------------------------------------------------------------------------
# Stale connection and start/stop tests
# ---------------------------------------------------------------------------


class TestSessionLifecycle:
    """Tests for session edge cases and async_start/async_stop."""

    async def test_open_session_stale_reconnects(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Open session cleans up stale connection and reconnects."""
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50")

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_conn_cls:
            stale_conn = MagicMock()
            stale_conn.connected = False
            stale_conn.async_disconnect = AsyncMock()

            new_conn = MagicMock()
            new_conn.async_connect = AsyncMock()
            new_conn.connected = True

            # First call returns stale, second returns new
            mock_conn_cls.return_value = new_conn

            # Pre-populate with stale connection
            manager._active_connections["AA:BB:CC:DD:EE:FF"] = stale_conn

            result = await manager.async_open_session("AA:BB:CC:DD:EE:FF")

        stale_conn.async_disconnect.assert_awaited_once()
        new_conn.async_connect.assert_awaited_once()
        assert result is new_conn

    async def test_device_connection_on_stop_marks_disconnected(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """aioesphomeapi on_stop callback flips connected=False and clears subscribers."""
        from custom_components.eppgrid.device_manager import DeviceConnection

        captured_on_stop: list = []

        class FakeClient:
            def __init__(self, *args, **kwargs) -> None:
                pass

            async def connect(self, on_stop=None, login=False, log_errors=True) -> None:
                captured_on_stop.append(on_stop)

            async def list_entities_services(self):
                return ([], [])

            async def disconnect(self) -> None:
                pass

        with patch("custom_components.eppgrid.device_manager._connection.APIClient", FakeClient):
            conn = DeviceConnection("192.168.1.50")
            await conn.async_connect()

            # Simulate a live state subscriber
            conn._state_subscribers.append(lambda _state: None)
            conn._states_subscribed = True
            assert conn.connected is True

            # aioesphomeapi reports the underlying socket died
            assert len(captured_on_stop) == 1 and captured_on_stop[0] is not None
            on_stop = captured_on_stop[0]
            result = on_stop(False)
            if asyncio.iscoroutine(result):
                await result

        assert conn.connected is False
        assert conn._state_subscribers == []
        assert conn._states_subscribed is False

    async def test_async_start_registers_listeners(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_start discovers devices and registers event listeners."""
        with patch.object(manager, "async_discover", new_callable=AsyncMock):
            await manager.async_start()

        # Two bus listeners: entity_registry_updated and device_registry_updated.
        # The state-change tracker is targeted (async_track_state_change_event)
        # and lives on _state_track_unsub, not _unsub_listeners.
        assert len(manager._unsub_listeners) == 2

        # Cleanup
        await manager.async_stop()
        assert len(manager._unsub_listeners) == 0

    async def test_async_start_treats_unknown_states_as_offline(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """async_start must not push to a device whose entities are all unknown.

        The startup probe shares `_is_device_available` semantics: `unknown`
        (and missing) states count as offline. The previous hand-rolled probe
        only treated `unavailable` as offline, so an all-unknown device got a
        doomed connect/push attempt at startup.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )
        entity = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-temperature",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        hass.states.async_set(entity.entity_id, "unknown")
        await hass.async_block_till_done()

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id=device.id)

        with (
            patch.object(manager, "async_discover", new_callable=AsyncMock),
            patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail,
        ):
            await manager.async_start()
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()
        assert mac not in manager._pushing
        await manager.async_stop()


# ---------------------------------------------------------------------------
# set_connection_failed tests
# ---------------------------------------------------------------------------


class TestSetConnectionFailed:
    """Transition semantics of the public `set_connection_failed` accessor.

    The only-fire-on-transition broadcast behaviour used to live in the
    `subscribe_device` websocket handler (mutating `_connection_failed`
    directly); it now lives here so the handler can stay a thin delegate.
    """

    MAC = "AA:BB:CC:DD:EE:FF"

    async def test_failure_broadcasts_only_on_transition(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        cb = MagicMock()
        manager.on_device_list_changed(cb)

        manager.set_connection_failed(self.MAC, True)
        assert cb.call_count == 1
        # Repeated failures against an already-failing mac are silent.
        manager.set_connection_failed(self.MAC, True)
        assert cb.call_count == 1

    async def test_recovery_re_arms_failure_broadcast(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        cb = MagicMock()
        manager.on_device_list_changed(cb)

        manager.set_connection_failed(self.MAC, True)
        assert cb.call_count == 1
        # Clearing never broadcasts...
        manager.set_connection_failed(self.MAC, False)
        assert cb.call_count == 1
        # ...but re-arms the next failure as a transition.
        manager.set_connection_failed(self.MAC, True)
        assert cb.call_count == 2


# ---------------------------------------------------------------------------
# Session refcounting tests
# ---------------------------------------------------------------------------


class TestSessionRefcounting:
    """Refcounted sessions: N subscribers share one connection and only the
    last release closes it. Force-close paths (device offline, removal,
    shutdown) bypass the count and reset it."""

    MAC = "AA:BB:CC:DD:EE:FF"

    def _seed(self, manager: DeviceManager) -> None:
        manager.devices[self.MAC] = ManagedDevice(mac=self.MAC, name="EPP", host="192.168.1.50")

    @staticmethod
    def _make_conn() -> MagicMock:
        conn = MagicMock()
        conn.async_connect = AsyncMock()
        conn.async_disconnect = AsyncMock()
        conn.connected = True
        return conn

    async def test_second_subscriber_release_closes_not_first(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Two subscribers on the same mac: the first release must NOT close
        the shared session (the second subscriber's streams ride on it); the
        second release closes it — disconnect awaited exactly once, after the
        second release."""
        self._seed(manager)
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = lambda *a, **kw: self._make_conn()

            conn = await manager.async_open_session(self.MAC)
            conn2 = await manager.async_open_session(self.MAC)
            assert conn2 is conn  # shared session

            # First release: session stays up.
            assert manager.release_session(self.MAC, conn) is None
            await hass.async_block_till_done()
            conn.async_disconnect.assert_not_awaited()
            assert manager.get_session(self.MAC) is conn

            # Second (last) release: session closes.
            close_task = manager.release_session(self.MAC, conn)
            assert close_task is not None
            await close_task
            conn.async_disconnect.assert_awaited_once()
            assert manager.get_session(self.MAC) is None

    async def test_release_is_safe_against_double_release(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A stale second release for an already-closed session must be a
        no-op — it must not decrement a count that now belongs to nobody nor
        schedule a spurious close."""
        self._seed(manager)
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = lambda *a, **kw: self._make_conn()

            conn = await manager.async_open_session(self.MAC)
            close_task = manager.release_session(self.MAC, conn)
            assert close_task is not None
            await close_task

            # Second release of the same (now closed) reference: no-op.
            assert manager.release_session(self.MAC, conn) is None
            await hass.async_block_till_done()
            conn.async_disconnect.assert_awaited_once()

    async def test_force_close_bypasses_count_and_resets(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """The device-offline transition force-closes the session regardless
        of how many subscribers hold references, and resets the counter so a
        later open starts fresh."""
        self._seed(manager)
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = lambda *a, **kw: self._make_conn()

            conn = await manager.async_open_session(self.MAC)
            await manager.async_open_session(self.MAC)  # count = 2

            # Offline transition routes through schedule_close_session (pinned
            # by test_state_changed_offline_transition_uses_schedule_close).
            await manager.schedule_close_session(self.MAC)
            conn.async_disconnect.assert_awaited_once()
            assert manager.get_session(self.MAC) is None

            # Counter was reset: a fresh open needs only ONE release to close.
            conn2 = await manager.async_open_session(self.MAC)
            assert conn2 is not conn
            close_task = manager.release_session(self.MAC, conn2)
            assert close_task is not None
            await close_task
            conn2.async_disconnect.assert_awaited_once()

    async def test_stale_release_does_not_close_new_session(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """A release carrying a reference to a force-closed connection must
        not touch the replacement session another subscriber opened — the
        old reference died with the force-close."""
        self._seed(manager)
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = lambda *a, **kw: self._make_conn()

            conn1 = await manager.async_open_session(self.MAC)
            await manager.schedule_close_session(self.MAC)  # force close (device offline)
            conn2 = await manager.async_open_session(self.MAC)
            assert conn2 is not conn1

            # Stale release for conn1: must not decrement conn2's count.
            assert manager.release_session(self.MAC, conn1) is None
            await hass.async_block_till_done()
            conn2.async_disconnect.assert_not_awaited()
            assert manager.get_session(self.MAC) is conn2

            # conn2's single reference still closes it.
            close_task = manager.release_session(self.MAC, conn2)
            assert close_task is not None
            await close_task
            conn2.async_disconnect.assert_awaited_once()

    async def test_async_stop_clears_refcounts(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_stop force-closes everything; counters must not survive it."""
        self._seed(manager)
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = lambda *a, **kw: self._make_conn()
            await manager.async_open_session(self.MAC)
            await manager.async_open_session(self.MAC)

        await manager.async_stop()
        assert manager._session_refcounts == {}

    async def test_device_removed_force_closes_with_subscribers(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """_on_device_removed must keep force-closing regardless of count."""
        self._seed(manager)
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = lambda *a, **kw: self._make_conn()
            conn = await manager.async_open_session(self.MAC)
            await manager.async_open_session(self.MAC)  # count = 2

            await manager._on_device_removed(self.MAC)

        conn.async_disconnect.assert_awaited_once()
        assert manager._session_refcounts == {}

    async def test_stale_release_after_a_flap_does_not_touch_the_replacement_refcount(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The panel holds its session across a flap; its unsub carries a dead conn.

        Once the panel stops closing its session on the availability edge (#336), the
        `subscribe_device` unsub fires with the PRE-flap connection. That release must
        not decrement the refcount that now belongs to the replacement session (which
        the re-armed streams own) — otherwise the first view teardown after a flap
        closes a session other subscribers are still using.
        """
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)

        conn1 = self._make_conn()
        conn2 = self._make_conn()
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = [conn1, conn2]

            # The panel opens its write session.
            opened = await manager.async_open_session(mac)
            assert opened is conn1
            assert manager._session_refcounts[mac] == 1

            # The device flaps: conn1 dies. A fresh open (what a re-armed stream does)
            # evicts the dead conn and starts the replacement's count from zero.
            conn1.connected = False
            manager._on_session_lost(conn1)
            await hass.async_block_till_done()

            reopened = await manager.async_open_session(mac)
            assert reopened is conn2
            assert manager._session_refcounts[mac] == 1

            # The panel's unsub finally fires, carrying the DEAD conn.
            manager.release_session(mac, conn1)

            # The replacement's reference is untouched and the session is still live.
            assert manager._session_refcounts[mac] == 1
            assert manager.get_session(mac) is conn2

    async def test_writes_reach_the_replacement_session_after_a_flap(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """`get_session` returns the NEW connection after a flap, so panel writes work.

        The panel's write commands (set_settings, dismiss_target) resolve the session
        via `get_session(mac)`. With durable streams re-opening the session, the panel
        does not reopen anything itself — this is what makes that safe (#336).
        """
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)

        conn1 = self._make_conn()
        conn2 = self._make_conn()
        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls:
            mock_cls.side_effect = [conn1, conn2]

            await manager.async_open_session(mac)
            conn1.connected = False
            manager._on_session_lost(conn1)
            await hass.async_block_till_done()
            assert manager.get_session(mac) is None  # nothing live between the two

            await manager.async_open_session(mac)
            assert manager.get_session(mac) is conn2


# ---------------------------------------------------------------------------
# Zone entity management tests
# ---------------------------------------------------------------------------


class TestZoneEntities:
    """Tests for async_update_zone_entities."""

    async def test_update_zone_entities_calibrated(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Calibrated device enables zone 0 as 'Zone Rest of Room'."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create zone entities and keep references
        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 should be enabled with name "Zone Rest of Room"
        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by is None
        assert zone0.name == "Zone Rest of Room"

        # Zone 1 should be enabled and renamed "Zone Office"
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by is None
        assert zone1.name == "Zone Office"

        # Zone 2 should be disabled (unused)
        zone2 = ent_reg.async_get(zone2_entry.entity_id)
        assert zone2.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_disables_unused(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Unused zone slots are disabled by integration."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # No named zones
        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
        ] + [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 always enabled
        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by is None

        # Zone 1 unused — disabled
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_respects_user_disabled(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Named zone with disabled_by=USER is not re-enabled."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # User explicitly disabled this entity
        ent_reg.async_update_entity(zone1_entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 1 should remain user-disabled
        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by == er.RegistryEntryDisabler.USER

    async def test_update_zone_entities_respects_user_disabled_zone0(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Zone-0 presence ("Rest of Room") with disabled_by=USER is not re-enabled.

        The zone-0 branch lacked the USER skip-guard that the named-zone and
        target-count branches have, so a user who manually disabled the
        Rest of Room presence entity got it force-re-enabled on every zone
        update.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        # User explicitly disabled the Rest of Room presence entity
        ent_reg.async_update_entity(zone0_entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
        ] + [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        zone0 = ent_reg.async_get(zone0_entry.entity_id)
        assert zone0.disabled_by == er.RegistryEntryDisabler.USER, (
            "zone 0 presence must stay user-disabled, not be force-re-enabled"
        )

    async def test_update_zone_entities_disable_does_not_overwrite_user_disabler(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Disabling an unused zone must not stamp INTEGRATION over a USER disabler.

        If the user disabled the entity by hand and the zone is later deleted,
        overwriting USER with INTEGRATION would make a future zone re-create
        silently re-enable an entity the user wanted off.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ent_reg.async_update_entity(zone1_entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER)

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # Zone 1 does not exist → disable path runs for its entities.
        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
        ] + [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        zone1 = ent_reg.async_get(zone1_entry.entity_id)
        assert zone1.disabled_by == er.RegistryEntryDisabler.USER, (
            "disable path must not overwrite a USER disabler with INTEGRATION"
        )

    async def test_update_zone_entities_unknown_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """Unknown device is a no-op."""
        await manager.async_update_zone_entities("00:00:00:00:00:00", [None] * (MAX_ZONES + 1))
        # Should not raise

    async def test_update_zone_entities_indexes_named_zones_by_slot_position(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Zone N's name comes from zone_slots[N] (length-8 indexing), not [N-1]."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # Length-8 slots: index 0 = zone 0, index 1 = "Kitchen", index 2 = "Bedroom".
        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Kitchen"},
            {"name": "Bedroom"},
            None,
            None,
            None,
            None,
            None,
        ]
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        assert ent_reg.async_get(zone1_entry.entity_id).name == "Zone Kitchen"
        assert ent_reg.async_get(zone2_entry.entity_id).name == "Zone Bedroom"

    async def test_update_zone_entities_target_count_only_for_existing_zones(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """zone_target_count entities are only enabled for zones that exist in the grid."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create zone_target_count entities
        ztc0 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_0_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ztc1 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        ztc2 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_2_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_target_count": True}}

        # Only zone 0 (room) + zone 1 (named "Office") exist
        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 target count should be enabled with room name
        ztc0_entry = ent_reg.async_get(ztc0.entity_id)
        assert ztc0_entry.disabled_by is None
        assert ztc0_entry.name == "Zone Rest of Room Target Count"
        # Zone 1 target count should be enabled with zone name
        ztc1_entry = ent_reg.async_get(ztc1.entity_id)
        assert ztc1_entry.disabled_by is None
        assert ztc1_entry.name == "Zone Office Target Count"
        # Zone 2 target count should be disabled (unused slot)
        assert ent_reg.async_get(ztc2.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_tolerates_malformed_slot(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Malformed zone slots (missing 'name', non-dict) don't crash entity updates.

        Even if corrupt data ever reaches storage, async_update_zone_entities
        must use `.get('name')` with a fallback rather than raising KeyError.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create zone 1 entities for both presence + target_count
        zone1_pres = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_tc = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone2_pres = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_2_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True, "zone_target_count": True}}

        # Slot 1 is a dict without 'name'; slot 2 is a non-dict (malformed).
        zone_slots = [
            {"type": "default"},
            {"color": "#ff0000", "type": "default"},  # missing 'name'
            "not a dict",  # non-dict malformed slot
            None,
            None,
            None,
            None,
            None,
        ]

        # Must not raise.
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Slot 1 (dict without name) should still be enabled, with a default fallback name.
        z1p = ent_reg.async_get(zone1_pres.entity_id)
        assert z1p.disabled_by is None
        assert z1p.name  # not empty
        z1tc = ent_reg.async_get(zone1_tc.entity_id)
        assert z1tc.disabled_by is None
        assert z1tc.name

        # Slot 2 ("not a dict") is treated as non-existent → disabled by integration.
        z2p = ent_reg.async_get(zone2_pres.entity_id)
        assert z2p.disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_target_count_disabled_when_setting_off(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """zone_target_count entities are all disabled when setting is off."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        ztc0 = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_0_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_target_count": False}}

        zone_slots = [
            {"type": "default", "trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
            {"name": "Office"},
        ] + [None] * (MAX_ZONES - 1)
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Even zone 0 should be disabled when zone_target_count setting is off
        assert ent_reg.async_get(ztc0.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_fail_closed_on_legacy_length_7(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Legacy length-7 layout in storage disables all zone entities (fail-closed).

        Before the length-8 migration, storage held a length-7 zone_slots list
        where index 0 was the FIRST named zone (not zone 0 / room). If discovery
        replays that legacy shape through async_update_zone_entities, we MUST
        NOT silently shift indices — instead treat every zone as non-existent
        so the user sees entities disabled until they re-save their layout via
        the panel with the new length-8 shape.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_tc = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-sensor-zone_1_target_count",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True, "zone_target_count": True}}

        # Legacy length-7 layout: index 0 was once "first named zone".
        zone_slots = [{"name": "Office"}] + [None] * 6
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 MUST be disabled — we cannot trust any index semantics.
        assert ent_reg.async_get(zone0_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        # Zone 1 entities MUST be disabled — do not silently adopt the old "Office" name.
        assert ent_reg.async_get(zone1_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        assert ent_reg.async_get(zone1_tc.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_fail_closed_when_slot0_is_none(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Length-8 zone_slots with slot 0 = None disables all zone entities."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        zone_slots = [None] * (MAX_ZONES + 1)  # slot 0 is None — malformed
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        assert ent_reg.async_get(zone0_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        assert ent_reg.async_get(zone1_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION

    async def test_update_zone_entities_fail_closed_when_slot0_not_dict(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Length-8 zone_slots with slot 0 = non-dict (e.g. list) disables all zone entities."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        zone0_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_0_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )
        zone1_entry = ent_reg.async_get_or_create(
            "binary_sensor",
            "esphome",
            unique_id="AA:BB:CC:DD:EE:FF-binary_sensor-zone_1_presence",
            config_entry=esphome_entry,
            device_id=device.id,
        )

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", host="192.168.1.50", device_id=device.id
        )
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"settings": {"zone_presence": True}}

        # Slot 0 is a list — not a dict. Malformed.
        zone_slots: list = [["not", "a", "dict"]] + [None] * MAX_ZONES
        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        assert ent_reg.async_get(zone0_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION
        assert ent_reg.async_get(zone1_entry.entity_id).disabled_by == er.RegistryEntryDisabler.INTEGRATION


# ---------------------------------------------------------------------------
# Helper function tests
# ---------------------------------------------------------------------------


class TestHelpers:
    """Tests for _extract_mac, _extract_host, _expand_zone_slot."""

    def test_expand_zone_slot_maps_legacy_types_to_closest_semantics(self) -> None:
        """Pre-0.95 layouts stored `rest` / `thoroughfare` zone types.

        They must expand to the timing of their closest modern equivalents —
        rest→bed (600 s timeout: someone sleeping must not time out) and
        thoroughfare→transit (3 s: walk-through spaces clear fast) — NOT to
        the generic `default` row (10 s), which would break bedrooms saved
        on old layouts.
        """
        from custom_components.eppgrid.device_manager import ZONE_TYPE_DEFAULTS
        from custom_components.eppgrid.device_manager._helpers import _expand_zone_slot

        rest = _expand_zone_slot({"name": "Bed", "color": "#aabbcc", "type": "rest"})
        for field, value in ZONE_TYPE_DEFAULTS["bed"].items():
            assert rest[field] == value, f"rest.{field} should match bed defaults"

        thoroughfare = _expand_zone_slot({"name": "Hall", "color": "#aabbcc", "type": "thoroughfare"})
        for field, value in ZONE_TYPE_DEFAULTS["transit"].items():
            assert thoroughfare[field] == value, f"thoroughfare.{field} should match transit defaults"

        # Unrecognised types still fall back to the default row.
        unknown = _expand_zone_slot({"name": "X", "color": "#aabbcc", "type": "mystery"})
        for field, value in ZONE_TYPE_DEFAULTS["default"].items():
            assert unknown[field] == value

    async def test_extract_mac_no_mac_connection(self, hass: HomeAssistant) -> None:
        """Returns None when device has no MAC connection."""
        dev_reg = dr.async_get(hass)
        entry = MockConfigEntry(domain="test", data={}, title="Test")
        entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={("test", "123")},
            name="No MAC Device",
        )
        assert _extract_mac(device) is None

    def test_extract_mac_normalizes_unformatted_input(self) -> None:
        """An unformatted MAC connection (no colons) is still returned in canonical AA:BB:... form."""
        device = MagicMock()
        device.connections = {("mac", "aabbccddeeff")}
        assert _extract_mac(device) == "AA:BB:CC:DD:EE:FF"

    def test_extract_mac_normalizes_dash_separators(self) -> None:
        """Dash-separated MAC inputs are normalized to colon-separated uppercase."""
        device = MagicMock()
        device.connections = {("mac", "aa-bb-cc-dd-ee-ff")}
        assert _extract_mac(device) == "AA:BB:CC:DD:EE:FF"

    async def test_extract_host_no_config_entry(self, hass: HomeAssistant) -> None:
        """Returns None when config_entry_id is None."""
        dev_reg = dr.async_get(hass)
        entry = MockConfigEntry(domain="test", data={}, title="Test")
        entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={("test", "456")},
        )
        assert _extract_host(device, None, hass) is None

    async def test_extract_host_missing_entry(self, hass: HomeAssistant) -> None:
        """Returns None when config entry doesn't exist."""
        dev_reg = dr.async_get(hass)
        entry = MockConfigEntry(domain="test", data={}, title="Test")
        entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={("test", "789")},
        )
        assert _extract_host(device, "nonexistent_entry_id", hass) is None

    async def test_extract_host_returns_host(self, hass: HomeAssistant) -> None:
        """Returns host from ESPHome config entry."""
        dev_reg = dr.async_get(hass)
        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.99"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            identifiers={("esphome", "abc")},
        )
        assert _extract_host(device, esphome_entry.entry_id, hass) == "192.168.1.99"


class TestUniqueIdMatchingAnchors:
    """Discovery / firmware-version helpers must anchor unique_id matches.

    Substring matching can false-match e.g. `firmware_version_history` against
    `firmware_version`; require an explicit `-` separator before the object_id.
    """

    async def test_async_discover_ignores_firmware_version_substring_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """A sensor whose object_id merely contains 'firmware_version' must not register the device."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={(dr.CONNECTION_NETWORK_MAC, "AA:BB:CC:DD:EE:FF")},
            name="EPP",
            manufacturer=EPP_MANUFACTURER,
            model=EPP_MODELS[0],
        )

        # An unrelated sensor whose object_id happens to contain "firmware_version"
        # as a substring (e.g. a future "firmware_version_history" sensor).
        ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-firmware_version_history",
            device_id=device.id,
            config_entry=esphome_entry,
        )

        await manager.async_discover()
        assert "AA:BB:CC:DD:EE:FF" not in manager.devices

    async def test_read_firmware_version_ignores_substring_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_firmware_version must not pick up a `firmware_version_history` sensor."""
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={(dr.CONNECTION_NETWORK_MAC, "AA:BB:CC:DD:EE:FF")},
            name="EPP",
        )

        # Only a "firmware_version_history" sensor exists — the proper
        # firmware_version sensor is missing, so we should report None
        # (= "unknown"), not pick up the history sensor's state.
        history = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-firmware_version_history",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        hass.states.async_set(history.entity_id, "old-history-value")

        assert manager.read_firmware_version(device.id) is None

    async def test_zone_entity_lookup_anchors_zone_index(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """async_update_zone_entities's single-pass scan must not let
        `zone_2_presence` substring-match an unrelated `_zone_2_presence_extra`
        entity. The anchored `endswith` check is the same protection the old
        `_find_zone_entity` helper used; this test pins it on the new path.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={(dr.CONNECTION_NETWORK_MAC, "AA:BB:CC:DD:EE:FF")},
            name="EPP",
        )
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="EPP",
            host="192.168.1.50",
            device_id=device.id,
        )

        # A non-canonical entity whose object_id happens to contain
        # `zone_2_presence` as a substring. `async_update_zone_entities` must
        # leave it alone (no rename, no disable) — substring-matching it as
        # zone 2's presence entity would clobber an unrelated sensor.
        bogus = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-zone_2_presence_extra",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        original_disabled_by = ent_reg.async_get(bogus.entity_id).disabled_by

        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", [{}, None, None, None, None, None, None, None])

        after = ent_reg.async_get(bogus.entity_id)
        assert after is not None
        assert after.name is None
        assert after.disabled_by == original_disabled_by

    async def test_read_current_connection_count_ignores_substring_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """read_current_connection_count must anchor on `-current_connections`.

        A sensor whose object_id merely ends in the words
        `current_connections` mid-identifier (no `-` separator) must not be
        picked up as the Current Connections sensor.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={(dr.CONNECTION_NETWORK_MAC, "AA:BB:CC:DD:EE:FF")},
            name="EPP",
        )
        bogus = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-max_current_connections",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        hass.states.async_set(bogus.entity_id, "7")

        assert manager.read_current_connection_count(device.id) is None

    async def test_on_state_changed_firmware_arrival_hook_ignores_substring_entity(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """The firmware_version-arrival hook in `_on_state_changed` must anchor
        on `-firmware_version`, not substring-match.

        With a real firmware_version sensor already live, an unrelated
        `firmware_version_history` sensor transitioning offline→value would
        otherwise trip the hook and re-spawn `_on_device_available`.
        """
        dev_reg = dr.async_get(hass)
        ent_reg = er.async_get(hass)

        esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP")
        esphome_entry.add_to_hass(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id=esphome_entry.entry_id,
            connections={(dr.CONNECTION_NETWORK_MAC, "AA:BB:CC:DD:EE:FF")},
            name="EPP",
        )
        fw_entry = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-firmware_version",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        history = ent_reg.async_get_or_create(
            "sensor",
            "esphome",
            "AA:BB:CC:DD:EE:FF-sensor-firmware_version_history",
            device_id=device.id,
            config_entry=esphome_entry,
        )
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id=device.id)
        # Real firmware version is readable, so a substring match would let
        # the hook proceed all the way to the re-spawn.
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
        manager._pushing.add(mac)

        with patch.object(manager, "_on_device_available", new_callable=AsyncMock) as mock_avail:
            old_state = MagicMock()
            old_state.state = STATE_UNAVAILABLE
            new_state = MagicMock()
            new_state.state = "some-history-value"
            event = MagicMock()
            event.data = {
                "entity_id": history.entity_id,
                "old_state": old_state,
                "new_state": new_state,
            }
            manager._on_state_changed(event)
            await hass.async_block_till_done()

        mock_avail.assert_not_awaited()


# ---------------------------------------------------------------------------
# Build flags tests
# ---------------------------------------------------------------------------


class TestBuildFlags:
    """Tests for async_fetch_build_flags, caching, and list_devices exposure."""

    async def test_fetch_build_flags_returns_dict(self) -> None:
        """async_fetch_build_flags returns response dict from get_build_flags action."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        expected_flags = {
            "bluetooth_enabled": True,
            "co2_enabled": False,
            "ethernet_enabled": True,
            "board_revision": "1.1",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "pro",
        }

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_resp = MagicMock()
            mock_resp.response_data = json.dumps(expected_flags).encode()
            mock_client.execute_service = AsyncMock(return_value=mock_resp)
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            result = await conn.async_fetch_build_flags()

        assert result == expected_flags

    async def test_fetch_build_flags_no_service(self) -> None:
        """async_fetch_build_flags returns empty dict when service not available."""
        conn = DeviceConnection("192.168.1.100")

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], []))
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            result = await conn.async_fetch_build_flags()

        assert result == {}

    async def test_fetch_build_flags_reraises_connection_error(self) -> None:
        """async_fetch_build_flags propagates transient connection errors."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_client.execute_service = AsyncMock(side_effect=ConnectionError("timeout"))
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            with pytest.raises(ConnectionError):
                await conn.async_fetch_build_flags()

    async def test_fetch_build_flags_raises_on_none_response(self) -> None:
        """A ``None`` response from the device is a malformed reply, not an empty cacheable result."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_client.execute_service = AsyncMock(return_value=None)
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            with pytest.raises(ValueError):
                await conn.async_fetch_build_flags()

    async def test_push_config_caches_build_flags_temporary_conn(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device caches build flags after push via temporary connection."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        expected_flags = {"bluetooth_enabled": True, "model": "pro"}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value=expected_flags)
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_fetch_build_flags.assert_awaited_once()
        assert manager._build_flags[mac] == expected_flags

    async def test_push_config_caches_build_flags_session_conn(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device caches build flags after push via session connection."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        expected_flags = {"co2_enabled": True, "board_revision": "1.2"}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        session_conn.async_execute_service = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value=expected_flags)
        manager._active_connections[mac] = session_conn

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_fetch_build_flags.assert_awaited_once()
        assert manager._build_flags[mac] == expected_flags

    async def test_push_path_build_flags_arrival_broadcasts_session_conn(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """First build-flags arrival via the session push path fires the
        device-list broadcast, same as `_fetch_build_flags` does elsewhere.

        The previous inline `contextlib.suppress(Exception)` fetch cached the
        flags silently — the frontend never learned the device's variant until
        an unrelated change re-fired the broadcast.
        """
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        expected_flags = {"co2_enabled": True}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        session_conn.async_execute_service = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value=expected_flags)
        manager._active_connections[mac] = session_conn

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            assert await manager._push_config_to_device(mac) is True

        assert manager._build_flags[mac] == expected_flags
        cb.assert_called()

    async def test_push_path_build_flags_arrival_broadcasts_temp_conn(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Same as the session-path test, for the temporary-connection push."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        expected_flags = {"bluetooth_enabled": True}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value=expected_flags)
        mock_conn.async_disconnect = AsyncMock()

        cb = MagicMock()
        manager.on_device_list_changed(cb)

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            assert await manager._push_config_to_device(mac) is True

        assert manager._build_flags[mac] == expected_flags
        cb.assert_called()

    async def test_push_config_negative_caches_empty_flags(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device caches empty build flags so a second save doesn't re-fetch."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            await manager._push_config_to_device(mac)
            # second save — must not re-fetch
            await manager._push_config_to_device(mac)

        assert mac in manager._build_flags
        assert manager._build_flags[mac] == {}
        mock_conn.async_fetch_build_flags.assert_awaited_once()

    async def test_fetch_build_flags_negative_caches_empty(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_fetch_build_flags caches empty result so a second call doesn't re-fetch."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        await manager._fetch_build_flags(mac)
        await manager._fetch_build_flags(mac)

        assert manager._build_flags[mac] == {}
        session_conn.async_fetch_build_flags.assert_awaited_once()

    async def test_list_devices_includes_build_flags(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices spreads cached build flags into device info."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP Device", host="192.168.1.50", available=True)
        manager._build_flags[mac] = {
            "bluetooth_enabled": True,
            "co2_enabled": False,
            "ethernet_enabled": True,
            "board_revision": "1.1",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "pro",
        }

        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["bluetooth_enabled"] is True
        assert result[0]["co2_enabled"] is False
        assert result[0]["ethernet_enabled"] is True
        assert result[0]["board_revision"] == "1.1"
        assert result[0]["sensor_variant"] == "ld2450"
        assert result[0]["firmware_channel"] == "stable"
        assert result[0]["model"] == "pro"

    async def test_list_devices_surfaces_heatmap_build_flag(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices passes through the heatmap build flag without dropping it."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP Device", host="192.168.1.50", available=True)
        manager._build_flags[mac] = {"heatmap": True}

        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["heatmap"] is True

        # Also test heatmap=False flows through as a boolean (not dropped or coerced).
        manager._build_flags[mac] = {"heatmap": False}
        result = manager.list_devices()
        assert len(result) == 1
        assert result[0]["heatmap"] is False

    async def test_push_config_skips_fetch_when_cached_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device skips build-flags fetch when cached (session path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_push_config = AsyncMock()
        session_conn.async_execute_service = AsyncMock()
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        with patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION):
            result = await manager._push_config_to_device(mac)

        assert result is True
        session_conn.async_fetch_build_flags.assert_not_awaited()
        assert manager._build_flags[mac] == {"model": "pro"}

    async def test_push_config_skips_fetch_when_cached_temporary(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_push_config_to_device skips build-flags fetch when cached (temp-connection path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        store.devices[mac] = {"calibration": {"perspective": [1.0] * 8}}
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_push_config = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            result = await manager._push_config_to_device(mac)

        assert result is True
        mock_conn.async_fetch_build_flags.assert_not_awaited()
        assert manager._build_flags[mac] == {"model": "pro"}

    async def test_fetch_build_flags_skips_when_cached_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_fetch_build_flags skips when already cached (session path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        session_conn = MagicMock()
        session_conn.connected = True
        session_conn.async_fetch_build_flags = AsyncMock(return_value={})
        manager._active_connections[mac] = session_conn

        await manager._fetch_build_flags(mac)

        session_conn.async_fetch_build_flags.assert_not_awaited()

    async def test_fetch_build_flags_skips_when_cached_temporary(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """_fetch_build_flags skips when already cached (temp-connection path)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"model": "pro"}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_fetch_build_flags = AsyncMock(return_value={})
        mock_conn.async_disconnect = AsyncMock()

        with patch(
            "custom_components.eppgrid.device_manager.DeviceConnection",
            return_value=mock_conn,
        ):
            await manager._fetch_build_flags(mac)

        mock_conn.async_fetch_build_flags.assert_not_awaited()
        mock_conn.async_connect.assert_not_awaited()

    async def test_fetch_build_flags_times_out_fast(self) -> None:
        """async_fetch_build_flags raises TimeoutError within the override window."""
        conn = DeviceConnection("192.168.1.100")

        mock_svc = MagicMock()
        mock_svc.name = "get_build_flags"

        async def hang(*_args: object, **_kwargs: object) -> None:
            await asyncio.sleep(60)
            return None

        with patch("custom_components.eppgrid.device_manager._connection.APIClient") as mock_cls:
            mock_client = mock_cls.return_value
            mock_client.connect = AsyncMock()
            mock_client.list_entities_services = AsyncMock(return_value=([], [mock_svc]))
            mock_client.execute_service = AsyncMock(side_effect=hang)
            mock_client.disconnect = AsyncMock()

            await conn.async_connect()
            loop = asyncio.get_running_loop()
            start = loop.time()
            with pytest.raises(asyncio.TimeoutError):
                await conn.async_fetch_build_flags(timeout=0.05)
            elapsed = loop.time() - start

        # Tight bound proves the override was honored (not the 10s default).
        assert elapsed < 0.5, f"expected timeout~=0.05s, took {elapsed:.3f}s"

    async def test_list_devices_no_build_flags(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        """list_devices works without cached build flags (no extra keys)."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP Device", host="192.168.1.50", available=True)
        # No build flags cached

        result = manager.list_devices()
        assert len(result) == 1
        assert "bluetooth_enabled" not in result[0]
        assert "model" not in result[0]


def test_dismiss_target_service_missing_raises_translation_keyed_error():
    """When epp_dismiss_target service is missing, raise HomeAssistantError with translation metadata."""
    from homeassistant.exceptions import HomeAssistantError

    from custom_components.eppgrid.const import DOMAIN
    from custom_components.eppgrid.device_manager import _raise_service_unavailable

    with pytest.raises(HomeAssistantError) as exc:
        _raise_service_unavailable("epp_dismiss_target")

    assert exc.value.translation_domain == DOMAIN
    assert exc.value.translation_key == "service_not_available"
    assert exc.value.translation_placeholders == {"service": "epp_dismiss_target"}


def test_zone_entity_names_resolve_english():
    """Zone name resolver must look up the requested language and interpolate user name."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("en", index=0, zone_name=None, target_count=False) == "Zone Rest of Room"
    assert _resolve_zone_name("en", index=1, zone_name="Kitchen", target_count=False) == "Zone Kitchen"
    assert _resolve_zone_name("en", index=0, zone_name=None, target_count=True) == "Zone Rest of Room Target Count"
    assert _resolve_zone_name("en", index=1, zone_name="Kitchen", target_count=True) == "Zone Kitchen Target Count"


def test_zone_entity_names_resolve_spanish():
    """Spanish locale returns Castilian zone names with prefix translated, user name verbatim."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("es", index=1, zone_name="Cocina", target_count=False) == "Zona Cocina"
    assert _resolve_zone_name("es-ES", index=1, zone_name="Cocina", target_count=False) == "Zona Cocina"
    assert (
        _resolve_zone_name("es", index=0, zone_name=None, target_count=True)
        == "Número de objetivos en zona Resto de la habitación"
    )


def test_zone_entity_names_resolve_czech():
    """Czech locale returns Czech zone names with prefix translated, user name verbatim."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("cs", index=1, zone_name="Kuchyně", target_count=False) == "Zóna Kuchyně"
    assert _resolve_zone_name("cs-CZ", index=1, zone_name="Kuchyně", target_count=False) == "Zóna Kuchyně"
    assert _resolve_zone_name("cs", index=0, zone_name=None, target_count=True) == "Počet cílů v zóně Zbytek místnosti"


def test_resolve_zone_name_falls_back_to_english_for_unknown_language():
    """Unknown languages fall back to English."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("xx", index=0, zone_name=None, target_count=False) == "Zone Rest of Room"
    assert _resolve_zone_name("zz-ZZ", index=1, zone_name="Kitchen", target_count=False) == "Zone Kitchen"


def test_resolve_zone_name_strips_redundant_zone_prefix():
    """Names already starting with the localized prefix must not be double-prefixed."""
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    # English: default "Zone 1" → "Zone 1", not "Zone Zone 1"
    assert _resolve_zone_name("en", index=1, zone_name="Zone 1", target_count=False) == "Zone 1"
    assert _resolve_zone_name("en", index=2, zone_name="Zone 2", target_count=True) == "Zone 2 Target Count"

    # English: custom name starting with "Zone" → no double prefix
    assert _resolve_zone_name("en", index=1, zone_name="Zone of Danger", target_count=False) == "Zone of Danger"

    # Spanish: name starting with "Zona" → no double prefix
    assert _resolve_zone_name("es", index=1, zone_name="Zona Cocina", target_count=False) == "Zona Cocina"

    # Spanish: English default "Zone 1" → localized "Zona 1"
    assert _resolve_zone_name("es", index=3, zone_name="Zone 3", target_count=False) == "Zona 3"

    # Czech: name starting with "Zóna" → no double prefix
    assert _resolve_zone_name("cs", index=1, zone_name="Zóna Kuchyně", target_count=False) == "Zóna Kuchyně"

    # Czech: English default "Zone 3" → localized "Zóna 3"
    assert _resolve_zone_name("cs", index=3, zone_name="Zone 3", target_count=False) == "Zóna 3"

    # Names not starting with the prefix still get it
    assert _resolve_zone_name("en", index=1, zone_name="Kitchen", target_count=False) == "Zone Kitchen"


def test_resolve_zone_name_strips_prefix_from_other_locale():
    """A name saved under another locale must still get its prefix stripped.

    Example: user named the zone in Spanish ("Zona Cocina"), then switched HA
    locale to English. We must not produce "Zone Zona Cocina".
    """
    from custom_components.eppgrid.device_manager import _resolve_zone_name

    assert _resolve_zone_name("en", index=1, zone_name="Zona Cocina", target_count=False) == "Zone Cocina"
    assert _resolve_zone_name("en", index=2, zone_name="Zona Sala", target_count=True) == "Zone Sala Target Count"


def test_zone_type_defaults_match_frontend():
    """Python ZONE_TYPE_DEFAULTS must match frontend/src/lib/zone-defaults.ts.

    The two tables are the single source of truth for non-custom zone timing
    — if they drift, upgrade rollouts silently diverge between the frontend
    display (resolveZone0Params / getZoneThresholds) and what the backend
    actually pushes to firmware. Keep them in lockstep.
    """
    import re
    from pathlib import Path

    from custom_components.eppgrid.device_manager import ZONE_TYPE_DEFAULTS

    ts_path = Path(__file__).parent.parent / "frontend/src/lib/zone-defaults.ts"
    ts_source = ts_path.read_text()
    assert "ZONE_TYPE_DEFAULTS" in ts_source, "zone-defaults.ts missing ZONE_TYPE_DEFAULTS"

    # Entries look like:
    #   default: { trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
    # Match those directly anywhere in the file — only ZONE_TYPE_DEFAULTS
    # uses exactly this 4-field shape with these field names in order.
    entry_re = re.compile(
        r"(\w+):\s*\{\s*"
        r"trigger:\s*(\d+(?:\.\d+)?),\s*"
        r"renew:\s*(\d+(?:\.\d+)?),\s*"
        r"timeout:\s*(\d+(?:\.\d+)?),\s*"
        r"handoff_timeout:\s*(\d+(?:\.\d+)?)\s*\}"
    )
    ts_defaults: dict[str, dict[str, float]] = {}
    for name, t, r, to, h in entry_re.findall(ts_source):
        ts_defaults[name] = {
            "trigger": float(t),
            "renew": float(r),
            "timeout": float(to),
            "handoff_timeout": float(h),
        }

    assert ts_defaults, "Failed to parse any entries from ZONE_TYPE_DEFAULTS"

    # Every type in the Python table must exist in TS with identical values.
    # (TS may have extra types like "custom"; we only assert shared keys match.)
    for type_name, fields in ZONE_TYPE_DEFAULTS.items():
        assert type_name in ts_defaults, f"type {type_name!r} missing from TS ZONE_TYPE_DEFAULTS"
        for field_name, py_value in fields.items():
            ts_value = ts_defaults[type_name][field_name]
            assert float(ts_value) == float(py_value), f"{type_name}.{field_name}: Python={py_value} vs TS={ts_value}"

    # custom is user-authoritative and must NOT have a defaults row in either
    # table. Adding one would make resolveZoneParams's custom branch ambiguous.
    assert "custom" not in ts_defaults, "TS ZONE_TYPE_DEFAULTS should not contain 'custom'"
    assert "custom" not in ZONE_TYPE_DEFAULTS, "Python ZONE_TYPE_DEFAULTS should not contain 'custom'"

    # Reverse direction: every TS type must also exist in Python. Guards
    # against adding a new type to the frontend while forgetting the backend
    # mirror — which would silently fall through to the "default" defaults
    # in _expand_zone_slot.
    ts_only = set(ts_defaults) - set(ZONE_TYPE_DEFAULTS)
    assert not ts_only, f"TS ZONE_TYPE_DEFAULTS has types missing from Python: {ts_only}"


# ---------------------------------------------------------------------------
# async_trigger_ota tests
# ---------------------------------------------------------------------------


class TestAsyncTriggerOtaSessionReuse:
    """Tests for DeviceManager.async_trigger_ota — held-session path + temp-conn fallback.

    The trigger now opens (or reuses) a PERSISTENT session via `async_open_session`
    and holds it past the trigger so `subscribe_ota_progress` can reuse it to stream
    progress; it only falls back to a short-lived temp connection when
    `async_open_session` returns None (device unavailable)."""

    @pytest.fixture(autouse=True)
    def _manifest_published(self):
        """Pre-flight manifest HEAD returns 200 so these session-path tests
        reach the OTA trigger rather than bailing on the availability check."""
        with patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(status=200),
        ):
            yield

    async def test_async_trigger_ota_reuses_active_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """When an active session exists for the mac, OTA is triggered through it
        (reused by `async_open_session`) instead of opening a fresh
        DeviceConnection."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"ethernet_enabled": False}

        seeded = MagicMock()
        seeded.connected = True
        seeded.async_execute_service = AsyncMock()
        manager._active_connections[mac] = seeded

        # `async_open_session` finds the seeded live connection and reuses it, so
        # no fresh DeviceConnection is constructed. Stub the grace-window release
        # scheduler so the reuse assertion isn't muddied by a lingering timer
        # (the release handoff is covered by the preflight suite).
        with (
            patch("custom_components.eppgrid.device_manager.DeviceConnection") as mock_cls,
            patch.object(manager, "_schedule_ota_session_release"),
        ):
            await manager.async_trigger_ota(mac)
            mock_cls.assert_not_called()  # session reused, no fresh conn

        seeded.async_execute_service.assert_awaited_once()
        call_name = seeded.async_execute_service.await_args.args[0]
        call_payload = seeded.async_execute_service.await_args.args[1]
        assert call_name == "set_update_manifest"
        assert "manifest" in call_payload["url"] or "wifi" in call_payload["url"] or "ethernet" in call_payload["url"]

    async def test_async_trigger_ota_falls_back_to_temp_conn_when_no_session(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """When `async_open_session` returns None (device unavailable), OTA opens
        a fresh short-lived DeviceConnection and triggers via
        async_execute_service on it, then disconnects."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"ethernet_enabled": True}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_execute_service = AsyncMock()
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "async_open_session", new=AsyncMock(return_value=None)),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
        ):
            await manager.async_trigger_ota(mac)

        mock_conn.async_connect.assert_awaited_once()
        mock_conn.async_execute_service.assert_awaited_once()
        call_name = mock_conn.async_execute_service.await_args.args[0]
        assert call_name == "set_update_manifest"
        mock_conn.async_disconnect.assert_awaited_once()

    async def test_async_trigger_ota_session_translation_error_propagates(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """If the held session raises HomeAssistantError (e.g. service missing),
        propagate it rather than wrapping it as a generic 'could not contact'."""
        from homeassistant.exceptions import HomeAssistantError

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"ethernet_enabled": False}

        seeded = MagicMock()
        seeded.connected = True
        seeded.async_execute_service = AsyncMock(side_effect=HomeAssistantError("translated"))

        # The held session comes from `async_open_session`; its ref is released
        # on the failure path (identity no-op here — not in _active_connections).
        with (
            patch.object(manager, "async_open_session", new=AsyncMock(return_value=seeded)),
            pytest.raises(HomeAssistantError, match="translated"),
        ):
            await manager.async_trigger_ota(mac)

    async def test_async_trigger_ota_session_unexpected_error_wrapped(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """A non-HomeAssistantError raised by the held session is wrapped with a
        stable, user-readable message (so the panel doesn't surface raw
        aioesphomeapi internals)."""
        from homeassistant.exceptions import HomeAssistantError

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"ethernet_enabled": False}

        seeded = MagicMock()
        seeded.connected = True
        seeded.async_execute_service = AsyncMock(side_effect=ConnectionError("socket gone"))

        with (
            patch.object(manager, "async_open_session", new=AsyncMock(return_value=seeded)),
            pytest.raises(HomeAssistantError, match="Could not contact device"),
        ):
            await manager.async_trigger_ota(mac)

    async def test_async_trigger_ota_temp_conn_unexpected_error_wrapped(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """When the fallback temp-conn path raises a non-HomeAssistantError,
        wrap it (still disconnect)."""
        from homeassistant.exceptions import HomeAssistantError

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"ethernet_enabled": False}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock(side_effect=OSError("dns fail"))
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "async_open_session", new=AsyncMock(return_value=None)),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
            pytest.raises(HomeAssistantError, match="Could not contact device"),
        ):
            await manager.async_trigger_ota(mac)

        mock_conn.async_disconnect.assert_awaited_once()

    async def test_async_trigger_ota_temp_conn_translation_error_propagates(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """A HomeAssistantError raised from the temp-conn path (e.g. service
        missing) propagates without being wrapped as a generic 'could not
        contact'."""
        from homeassistant.exceptions import HomeAssistantError

        mac = "AA:BB:CC:DD:EE:FF"
        manager.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50")
        manager._build_flags[mac] = {"ethernet_enabled": False}

        mock_conn = MagicMock()
        mock_conn.async_connect = AsyncMock()
        mock_conn.async_execute_service = AsyncMock(side_effect=HomeAssistantError("translated"))
        mock_conn.async_disconnect = AsyncMock()

        with (
            patch.object(manager, "async_open_session", new=AsyncMock(return_value=None)),
            patch(
                "custom_components.eppgrid.device_manager.DeviceConnection",
                return_value=mock_conn,
            ),
            pytest.raises(HomeAssistantError, match="translated"),
        ):
            await manager.async_trigger_ota(mac)

        mock_conn.async_disconnect.assert_awaited_once()


def test_mac_for_device_id_maps_registry_id_to_mac(hass):
    """mac_for_device_id resolves a registry device_id to its mac, else None."""
    from unittest.mock import MagicMock

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice

    mgr = DeviceManager(hass, MagicMock())
    dev = ManagedDevice(mac="AA:BB:CC:DD:EE:01", name="LR")
    dev.device_id = "dev1"
    mgr.devices["AA:BB:CC:DD:EE:01"] = dev
    mgr._device_id_to_mac["dev1"] = "AA:BB:CC:DD:EE:01"

    assert mgr.mac_for_device_id("dev1") == "AA:BB:CC:DD:EE:01"
    assert mgr.mac_for_device_id("nope") is None


def test_esphome_entry_id_for_mac_maps_mac_to_esphome_entry(hass):
    """esphome_entry_id_for_mac resolves a mac to its ESPHome config-entry id, else None."""
    from unittest.mock import MagicMock

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice

    mgr = DeviceManager(hass, MagicMock())
    mgr.devices["AA:BB:CC:DD:EE:01"] = ManagedDevice(
        mac="AA:BB:CC:DD:EE:01", name="LR", esphome_config_entry_id="esph1"
    )

    assert mgr.esphome_entry_id_for_mac("AA:BB:CC:DD:EE:01") == "esph1"
    assert mgr.esphome_entry_id_for_mac("nope") is None


class TestStateStream:
    """Tests for the durable state-stream record."""

    def _stream(self, on_availability=None):
        from custom_components.eppgrid.device_manager._streams import StateStream

        return StateStream(
            mac="AA:BB:CC:DD:EE:01",
            counter_attr="grid_target_subs",
            make_on_state=lambda mac, conn: lambda state: None,
            on_availability=on_availability or (lambda available: None),
        )

    def test_starts_unarmed(self):
        stream = self._stream()
        assert stream.armed is False
        assert stream.closed is False

    def test_armed_once_a_connection_is_bound(self):
        stream = self._stream()
        stream.conn = MagicMock()
        stream.cb = lambda state: None
        assert stream.armed is True

    def test_notify_dedupes_repeated_values(self):
        seen: list[bool] = []
        stream = self._stream(on_availability=seen.append)
        stream.notify(True)
        stream.notify(True)
        stream.notify(False)
        stream.notify(False)
        stream.notify(True)
        assert seen == [True, False, True]

    def test_notify_fires_on_first_false(self):
        """Initial state is unknown, so the first notify always emits."""
        seen: list[bool] = []
        stream = self._stream(on_availability=seen.append)
        stream.notify(False)
        assert seen == [False]

    def test_notify_swallows_callback_errors(self):
        stream = self._stream(on_availability=MagicMock(side_effect=RuntimeError("ws closed")))
        stream.notify(True)  # must not raise

    def test_notify_closed_fires_the_owner_callback(self):
        from custom_components.eppgrid.device_manager._streams import StateStream

        fired: list[bool] = []
        stream = StateStream(
            mac="AA:BB:CC:DD:EE:01",
            counter_attr="grid_target_subs",
            make_on_state=lambda mac, conn: lambda state: None,
            on_availability=lambda available: None,
            on_closed=lambda: fired.append(True),
        )
        stream.notify_closed()
        assert fired == [True]

    def test_notify_closed_fires_at_most_once(self):
        """The teardown paths can both reach a stream (device removed during unload)."""
        from custom_components.eppgrid.device_manager._streams import StateStream

        fired: list[bool] = []
        stream = StateStream(
            mac="AA:BB:CC:DD:EE:01",
            counter_attr="grid_target_subs",
            make_on_state=lambda mac, conn: lambda state: None,
            on_availability=lambda available: None,
            on_closed=lambda: fired.append(True),
        )
        stream.notify_closed()
        stream.notify_closed()
        assert fired == [True]

    def test_notify_closed_without_a_callback_is_a_noop(self):
        """`on_closed` is optional — an older caller registers no handler."""
        self._stream().notify_closed()  # must not raise

    def test_notify_closed_swallows_callback_errors(self):
        from custom_components.eppgrid.device_manager._streams import StateStream

        stream = StateStream(
            mac="AA:BB:CC:DD:EE:01",
            counter_attr="grid_target_subs",
            make_on_state=lambda mac, conn: lambda state: None,
            on_availability=lambda available: None,
            on_closed=MagicMock(side_effect=RuntimeError("ws closed")),
        )
        stream.notify_closed()  # must not raise

    def test_records_with_matching_fields_are_still_distinct(self):
        """The record is used with IDENTITY semantics — `eq=False` is load-bearing.

        `async_add_state_stream`'s close does `streams.remove(stream)`, which removes the
        first EQUAL element, not the identical one. Structural equality (a dataclass's
        default) would therefore drop the WRONG record for two streams on a mac whose
        fields happen to match — the survivor would keep a callback on the connection
        with no owner, and the subscriber count would go out of step. Today's callers
        build per-WS-command closures so no two streams ever match, but the manager API
        is general: a caller sharing a module-level callback pair would hit it.
        """
        from custom_components.eppgrid.device_manager._streams import StateStream

        def make_on_state(mac, conn):
            return lambda state: None

        def on_availability(available):
            return None

        # Same callables in both records: structurally equal, distinct subscriptions.
        fields = {
            "mac": "AA:BB:CC:DD:EE:01",
            "counter_attr": "grid_target_subs",
            "make_on_state": make_on_state,
            "on_availability": on_availability,
        }
        first, second = StateStream(**fields), StateStream(**fields)

        assert first != second
        assert len({first, second}) == 2  # hashable, by identity

        streams = [first, second]
        streams.remove(second)
        assert streams == [first]
        assert streams[0] is first

    def test_mark_closed_flags_notifies_and_is_idempotent(self):
        """The shared terminal tail of async_stop and _on_device_removed.

        Both signals, in order — offline THEN gone — and both at most once: the
        teardown loops walk every stream, and a client that unsubs from its own
        callback can re-enter a path that marks the stream closed again.
        """
        seen: list[bool] = []
        closed: list[bool] = []
        stream = self._stream(on_availability=seen.append)
        stream.on_closed = lambda: closed.append(True)
        stream.notify(True)

        stream.mark_closed()
        stream.mark_closed()

        assert stream.closed is True
        assert seen == [True, False]
        assert closed == [True]


async def _settle(rounds: int = 20) -> None:
    """Drain the loop's ready queue without advancing time.

    Lets already-scheduled tasks run up to their next real await (a gate, a lock)
    so a test can assert on a precise interleaving.
    """
    for _ in range(rounds):
        await asyncio.sleep(0)


class TestStateStreams:
    """Durable frontend state streams: arm, close, and refcount behaviour."""

    @pytest.fixture(autouse=True)
    async def _cancel_stream_retries(self, manager):
        """Cancel any stream-arming backoff task a test leaves behind.

        A stream left unarmed on an available device schedules a retry that keeps
        running by design (#334) — in production `async_stop` cancels it. Tests that
        drive those failure paths without a manager teardown would otherwise leave a
        task sleeping on the backoff past the end of the test.
        """
        yield
        tasks = list(manager._stream_retry_tasks.values())
        manager._stream_retry_tasks.clear()
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def _armable(self, manager):
        """Give the manager one available device and a stubbed session open.

        The conn starts `connected=True` — a stream armed on it is armed on a LIVE
        connection. A test that drives a session loss must flip it to False first:
        `DeviceConnection._on_stop` calls `_release_references()` (which clears
        `connected`) before it invokes the manager's hook.
        """
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)
        conn = MagicMock()
        conn.mac = mac
        conn.entities = []
        conn.connected = True
        conn.subscribe_states = AsyncMock()
        conn.unsubscribe_states = MagicMock()
        manager.async_open_session = AsyncMock(return_value=conn)
        manager.release_session = MagicMock(return_value=None)
        manager.request_pipeline_push = MagicMock()
        return mac, conn

    async def test_add_stream_arms_against_the_live_session(self, hass, manager):
        mac, conn = self._armable(manager)
        built: list[Any] = []
        seen: list[bool] = []

        def make_on_state(stream_mac, device_conn):
            built.append((stream_mac, device_conn))
            return lambda state: None

        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=make_on_state,
            on_availability=seen.append,
        )

        assert unsub is not None
        manager.async_open_session.assert_awaited_once_with(mac)
        assert built == [(mac, conn)]
        conn.subscribe_states.assert_awaited_once()
        assert seen == [True]
        # The subscriber count is taken once, at add.
        assert manager._target_subs[mac]["grid_target_subs"] == 1

    async def test_unknown_mac_returns_none(self, hass, manager):
        unsub = await manager.async_add_state_stream(
            "AA:BB:CC:DD:EE:99",
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        assert unsub is None

    async def test_unsub_disarms_releases_and_decrements(self, hass, manager):
        mac, conn = self._armable(manager)
        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        unsub()

        conn.unsubscribe_states.assert_called_once()
        manager.release_session.assert_called_once_with(mac, conn)
        assert mac not in manager._target_subs
        assert mac not in manager._state_streams

    async def test_unsub_is_idempotent(self, hass, manager):
        mac, conn = self._armable(manager)
        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        unsub()
        unsub()

        assert conn.unsubscribe_states.call_count == 1
        assert manager.release_session.call_count == 1

    async def test_add_stream_rolls_back_when_the_arm_pass_raises(self, hass, manager):
        """Registration is all-or-nothing: no unsub handle means no registration.

        The caller only receives its teardown handle on the happy path, so a stream
        left behind here could never be torn down: its subscriber count would pin the
        device to the fast pipeline for the life of the manager, and a later re-arm
        would push frames into a WS subscription id nobody owns.
        """
        mac, _conn = self._armable(manager)
        manager._ensure_streams = AsyncMock(side_effect=RuntimeError("boom"))

        with pytest.raises(RuntimeError, match="boom"):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )

        assert mac not in manager._state_streams
        assert mac not in manager._target_subs

    async def test_add_stream_rolls_back_when_cancelled(self, hass, manager):
        """Same rollback on cancellation — the WS handler task can be cancelled mid-await."""
        mac, _conn = self._armable(manager)
        manager._ensure_streams = AsyncMock(side_effect=asyncio.CancelledError())

        with pytest.raises(asyncio.CancelledError):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )

        assert mac not in manager._state_streams
        assert mac not in manager._target_subs

    async def test_add_stream_rollback_disarms_a_stream_that_already_armed(self, hass, manager):
        """A failure AFTER the arm must also drop the callback and release the session ref."""
        mac, conn = self._armable(manager)
        real_ensure_streams = manager._ensure_streams

        async def _arm_then_raise(stream_mac):
            await real_ensure_streams(stream_mac)
            raise RuntimeError("boom")

        manager._ensure_streams = _arm_then_raise

        with pytest.raises(RuntimeError, match="boom"):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )

        conn.unsubscribe_states.assert_called_once()
        manager.release_session.assert_called_once_with(mac, conn)
        assert mac not in manager._state_streams
        assert mac not in manager._target_subs

    async def test_offline_device_registers_the_stream_unarmed(self, hass, manager):
        """No session yet — the stream still registers so it can arm on recovery."""
        mac, _conn = self._armable(manager)
        manager._is_device_available = MagicMock(return_value=False)
        seen: list[bool] = []

        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        assert unsub is not None
        manager.async_open_session.assert_not_awaited()
        assert seen == [False]
        assert manager._state_streams[mac][0].armed is False
        # Unsub on an unarmed stream releases nothing but still deregisters.
        unsub()
        manager.release_session.assert_not_called()
        assert mac not in manager._state_streams

    async def test_subscribe_failure_leaves_stream_unarmed_and_releases(self, hass, manager):
        mac, conn = self._armable(manager)
        conn.subscribe_states = AsyncMock(side_effect=RuntimeError("connection is closed"))
        seen: list[bool] = []

        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        assert unsub is not None
        assert manager._state_streams[mac][0].armed is False
        manager.release_session.assert_called_once_with(mac, conn)
        assert seen == [False]

    async def test_subscribe_failure_unsubscribes_the_orphaned_callback(self, hass, manager):
        """A failed subscribe must take its callback back off the connection.

        `DeviceConnection.subscribe_states` rolls back its own append on failure, so
        against a real connection this cleanup is a no-op — it pins `_arm_stream`'s
        own contract rather than relying on that connection-internal invariant. A
        callback that did survive could never be removed: the stream is left unarmed
        (`conn is None`), so `_disarm_stream` skips it; while another stream keeps
        the connection alive, the orphan would keep firing into a dead handler and
        the next re-arm would register a SECOND callback on the same connection —
        every frame delivered twice.
        """
        mac, conn = self._armable(manager)
        conn.subscribe_states = AsyncMock(side_effect=RuntimeError("connection is closed"))
        built: list[Any] = []

        def make_on_state(_mac, _conn):
            cb = MagicMock()
            built.append(cb)
            return cb

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=make_on_state,
            on_availability=lambda a: None,
        )

        conn.unsubscribe_states.assert_called_once_with(built[0])
        manager.release_session.assert_called_once_with(mac, conn)

    async def test_cancelled_subscribe_releases_the_session_ref(self, hass, manager):
        """A cancellation inside `subscribe_states` must not leak the session ref.

        `DeviceConnection.subscribe_states` can suspend on its `_subscribe_lock`, so a
        CancelledError can land in that await with the stream still unarmed
        (`stream.conn is None`). `async_add_state_stream`'s rollback would then see
        nothing to disarm and release nothing — one session ref pinning the device's
        connection open for the life of the manager, and the "registration is
        all-or-nothing" contract broken.
        """
        mac, conn = self._armable(manager)
        conn.subscribe_states = AsyncMock(side_effect=asyncio.CancelledError())

        with pytest.raises(asyncio.CancelledError):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )

        conn.unsubscribe_states.assert_called_once()
        # Exactly once: the arm pass releases the ref it took, and the rollback's
        # `_disarm_stream` (which sees an unarmed stream) must not release it again.
        manager.release_session.assert_called_once_with(mac, conn)
        assert mac not in manager._state_streams
        assert mac not in manager._target_subs

    async def test_disarm_does_not_decrement_the_subscriber_count(self, hass, manager):
        """Disarm is a connection-level event, not a client-level one.

        `_target_subs` is per-mac precisely so subscriber counts survive connection
        replacement. Decrementing on session loss would gate the device's emission
        pipeline off while a WS client is still subscribed and waiting for the
        re-arm — the previously-fixed "target disappears" bug.
        """
        mac, conn = self._armable(manager)
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        stream = manager._state_streams[mac][0]
        assert stream.armed is True

        manager._disarm_stream(stream)

        assert stream.armed is False
        conn.unsubscribe_states.assert_called_once()
        manager.release_session.assert_called_once_with(mac, conn)
        # The count is untouched — the client is still subscribed.
        assert manager._target_subs[mac]["grid_target_subs"] == 1

        # And a second disarm releases nothing further (the ref is already gone).
        manager._disarm_stream(stream)
        assert manager.release_session.call_count == 1
        assert manager._target_subs[mac]["grid_target_subs"] == 1

    async def test_open_session_returning_none_leaves_stream_unarmed(self, hass, manager):
        """Device looks available but the connect fails — register, report offline."""
        mac, _conn = self._armable(manager)
        manager.async_open_session = AsyncMock(return_value=None)
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        assert manager._state_streams[mac][0].armed is False
        manager.release_session.assert_not_called()
        assert seen == [False]

    async def test_open_session_raising_leaves_stream_unarmed(self, hass, manager):
        mac, _conn = self._armable(manager)
        manager.async_open_session = AsyncMock(side_effect=RuntimeError("connect timed out"))
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        assert manager._state_streams[mac][0].armed is False
        assert seen == [False]

    async def test_close_during_open_releases_the_session_ref(self, hass, manager):
        """The WS client went away mid-open: the ref we just took must not leak."""
        mac, conn = self._armable(manager)

        async def open_then_close(_mac):
            # Simulate the client's unsub landing while we were connecting.
            manager._state_streams[mac][0].closed = True
            return conn

        manager.async_open_session = AsyncMock(side_effect=open_then_close)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        manager.release_session.assert_called_once_with(mac, conn)
        conn.subscribe_states.assert_not_awaited()
        assert manager._state_streams[mac][0].armed is False

    async def test_close_during_subscribe_unsubscribes_and_releases(self, hass, manager):
        """Same race, one await later: the callback we just registered must come off."""
        mac, conn = self._armable(manager)

        async def subscribe_then_close(_cb):
            manager._state_streams[mac][0].closed = True

        conn.subscribe_states = AsyncMock(side_effect=subscribe_then_close)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        conn.unsubscribe_states.assert_called_once()
        manager.release_session.assert_called_once_with(mac, conn)
        assert manager._state_streams[mac][0].armed is False

    async def test_ensure_streams_is_a_noop_when_nothing_is_pending(self, hass, manager):
        """An already-armed stream is not re-armed by a second reconciler pass."""
        mac, conn = self._armable(manager)
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        await manager._ensure_streams(mac)

        manager.async_open_session.assert_awaited_once()
        assert conn.subscribe_states.await_count == 1

    async def test_ensure_streams_does_not_arm_while_stopping(self, hass, manager):
        """Shutdown must not open new sessions — including for unknown macs."""
        mac, _conn = self._armable(manager)
        manager._is_device_available = MagicMock(return_value=False)
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        manager._is_device_available = MagicMock(return_value=True)
        manager._stopping = True

        await manager._ensure_streams(mac)
        await manager._ensure_streams("AA:BB:CC:DD:EE:99")

        manager.async_open_session.assert_not_awaited()
        assert manager._state_streams[mac][0].armed is False

    async def test_stopping_mid_lock_aborts_the_arm(self, hass, manager):
        """`_stopping` is re-checked after the lock: a shutdown that lands while
        another pass holds it must not arm a stream behind async_stop's back."""
        mac, _conn = self._armable(manager)
        manager._is_device_available = MagicMock(return_value=False)
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        manager._is_device_available = MagicMock(return_value=True)

        lock = manager._stream_locks.setdefault(mac, asyncio.Lock())
        await lock.acquire()
        task = asyncio.create_task(manager._ensure_streams(mac))
        await asyncio.sleep(0)  # let the task queue on the lock
        manager._stopping = True
        lock.release()
        await task

        manager.async_open_session.assert_not_awaited()
        assert manager._state_streams[mac][0].armed is False

    async def test_two_streams_on_one_mac_are_independent(self, hass, manager):
        """Unsubbing one client must not disturb the other's stream or its count."""
        mac, conn = self._armable(manager)

        unsub_grid = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        unsub_heatmap = await manager.async_add_state_stream(
            mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        grid, heatmap = manager._state_streams[mac]
        assert grid.armed is True
        assert heatmap.armed is True
        assert conn.subscribe_states.await_count == 2

        unsub_grid()

        # The survivor keeps its callback, its session ref, and its count: the mac
        # is only deregistered when the LAST stream goes.
        assert manager._state_streams[mac] == [heatmap]
        assert heatmap.armed is True
        assert manager._target_subs[mac]["heatmap_subs"] == 1
        assert manager._target_subs[mac]["grid_target_subs"] == 0
        assert manager.release_session.call_count == 1
        assert conn.unsubscribe_states.call_count == 1

        # And the reconciler leaves the still-armed survivor alone.
        await manager._ensure_streams(mac)
        assert conn.subscribe_states.await_count == 2
        assert manager.async_open_session.await_count == 2

        unsub_heatmap()
        assert mac not in manager._state_streams
        assert mac not in manager._target_subs
        assert manager.release_session.call_count == 2

    async def test_unsub_removes_the_identical_record_not_a_matching_one(self, hass, manager):
        """Two streams whose fields match: the unsub must drop the one it belongs to.

        The registry stores streams in a list and the close does `list.remove`, which
        goes by equality. A future caller sharing a module-level callback pair between
        two streams on one mac (nothing in the API forbids it) would otherwise have the
        WRONG record removed: the survivor keeps a callback on the connection with no
        owner, and its subscriber count is released while it is still streaming.
        """
        mac, _conn = self._armable(manager)

        def make_on_state(_mac, _conn):
            return on_state

        def on_state(state):
            return None

        def on_availability(available):
            return None

        shared = {
            "counter_attr": "grid_target_subs",
            "make_on_state": make_on_state,
            "on_availability": on_availability,
        }
        await manager.async_add_state_stream(mac, **shared)
        unsub_second = await manager.async_add_state_stream(mac, **shared)
        first, second = manager._state_streams[mac]

        unsub_second()

        assert manager._state_streams[mac] == [first]
        assert manager._state_streams[mac][0] is first
        assert first.armed is True
        assert second.armed is False
        assert manager._target_subs[mac]["grid_target_subs"] == 1

    async def test_stream_lock_identity_survives_unsub_to_empty(self, hass, manager):
        """The per-mac lock object must never be swapped out.

        An `_ensure_streams` pass can be holding (or waiting on) the lock across an
        await when the mac's last stream unsubs. Popping the lock there lets the next
        pass mint a fresh one and run *concurrently* with the old holder — see
        `test_waiter_on_the_old_lock_cannot_double_arm` for what that costs.
        """
        mac, _conn = self._armable(manager)

        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        first_lock = manager._stream_locks[mac]

        unsub()
        assert mac not in manager._state_streams

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        assert manager._stream_locks[mac] is first_lock

    async def test_waiter_on_the_old_lock_cannot_double_arm(self, hass, manager):
        """The interleaving a swapped-out lock would allow, end to end.

        Pass A is parked in `async_open_session` holding the mac's lock; pass B is
        queued on it; the mac's last stream unsubs; a new client adds a stream. With a
        stable lock the newcomer serializes behind B and the new stream is armed
        exactly once. A fresh lock lets the newcomer arm in parallel with B: two
        callbacks on one connection (every frame delivered twice), one of them
        orphaned, and a session ref that is never released.
        """
        mac, conn = self._armable(manager)
        gates: list[asyncio.Event] = []

        async def gated_open(_mac):
            gate = asyncio.Event()
            gates.append(gate)
            await gate.wait()
            return conn

        manager._is_device_available = MagicMock(return_value=False)
        unsub_first = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        manager._is_device_available = MagicMock(return_value=True)
        manager.async_open_session = AsyncMock(side_effect=gated_open)

        # A: takes the mac's lock, parks in the open for the first stream.
        holder = asyncio.create_task(manager._ensure_streams(mac))
        await _settle()
        assert len(gates) == 1
        # B: queued on that same lock object.
        waiter = asyncio.create_task(manager._ensure_streams(mac))
        await _settle()

        # The only client goes away — the mac's stream list empties while A is parked.
        unsub_first()
        assert mac not in manager._state_streams

        # A new client arrives for the same mac, still while A is parked.
        adder = asyncio.create_task(
            manager.async_add_state_stream(
                mac,
                counter_attr="heatmap_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
        )
        await _settle()

        gates[0].set()  # A resumes, finds its stream closed, hands the lock to B
        await _settle()
        # B is now arming the new stream. The newcomer must still be waiting on the
        # lock, not opening a second session for the same stream.
        opens_after_handoff = len(gates)

        for gate in gates:
            gate.set()
        await asyncio.gather(holder, waiter, adder)

        assert opens_after_handoff == 2
        assert conn.subscribe_states.await_count == 1
        assert manager._state_streams[mac][0].armed is True
        # One release: the ref A took for the stream that closed under it.
        assert manager.release_session.call_count == 1

    async def test_session_loss_disarms_then_rearms_on_a_fresh_connection(self, hass, manager):
        """The card's stream must survive a device flap — issue #334."""
        mac, conn = self._armable(manager)
        conn2 = MagicMock()
        conn2.entities = []
        conn2.connected = True
        conn2.subscribe_states = AsyncMock()
        conn2.unsubscribe_states = MagicMock()
        manager.async_open_session = AsyncMock(side_effect=[conn, conn2])
        built: list[Any] = []
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: built.append(c) or (lambda s: None),
            on_availability=seen.append,
        )
        assert built == [conn]

        # The device's API connection dies: aioesphomeapi fires on_stop.
        conn.connected = False
        manager._on_session_lost(conn)
        await hass.async_block_till_done()

        # Re-armed against the REPLACEMENT connection, with a callback rebuilt
        # from the factory (entity keys are only knowable from the live conn).
        assert built == [conn, conn2]
        conn2.subscribe_states.assert_awaited_once()
        assert seen == [True, False, True]
        # The count survives the flap: taken once at add, never re-taken.
        assert manager._target_subs[mac]["grid_target_subs"] == 1

    async def test_session_loss_while_device_offline_waits_for_availability(self, hass, manager):
        """Offline device: don't hammer it — arm when it comes back."""
        mac, conn = self._armable(manager)
        conn2 = MagicMock()
        conn2.entities = []
        conn2.connected = True
        conn2.subscribe_states = AsyncMock()
        manager.async_open_session = AsyncMock(side_effect=[conn, conn2])
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        manager._is_device_available = MagicMock(return_value=False)
        conn.connected = False
        manager._on_session_lost(conn)
        await hass.async_block_till_done()

        assert manager.async_open_session.await_count == 1  # no reopen attempt
        assert seen == [True, False]
        assert manager._state_streams[mac][0].armed is False

        # Device comes back — the availability hook re-runs the reconciler.
        manager._is_device_available = MagicMock(return_value=True)
        await manager._ensure_streams(mac)

        assert manager.async_open_session.await_count == 2
        assert seen == [True, False, True]

    async def test_closed_stream_is_not_rearmed(self, hass, manager):
        mac, conn = self._armable(manager)
        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        unsub()
        manager.async_open_session.reset_mock()

        manager._on_session_lost(conn)
        await hass.async_block_till_done()

        manager.async_open_session.assert_not_awaited()

    async def test_open_session_passes_on_stop_hook(self, hass, manager):
        """A session connection must tell the manager when it dies."""
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)
        manager._on_session_lost = MagicMock()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as conn_cls:
            conn = conn_cls.return_value
            conn.async_connect = AsyncMock()
            conn.connected = True
            await manager.async_open_session(mac)

        # The bare bound method, not a `partial` closing over a mac: the connection
        # hands ITSELF to the hook, so the manager can match streams by identity.
        on_stop = conn_cls.call_args.kwargs["on_stop"]
        assert on_stop is manager._on_session_lost
        on_stop(conn)
        manager._on_session_lost.assert_called_once_with(conn)

    async def test_device_removed_drops_streams(self, hass, manager):
        mac, _conn = self._armable(manager)
        seen: list[bool] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        await manager._on_device_removed(mac)

        assert mac not in manager._state_streams
        assert seen == [True, False]

    async def test_async_stop_tells_the_client_its_stream_is_gone(self, hass, manager):
        """A config-entry reload kills the stream the card is still subscribed to.

        The card cannot tell that apart from a device flap, so the manager must
        say so — otherwise the card sits on the offline banner until it remounts.
        """
        mac, _conn = self._armable(manager)
        closed: list[bool] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append(True),
        )

        await manager.async_stop()

        assert closed == [True]

    async def test_device_removal_tells_the_client_its_stream_is_gone(self, hass, manager):
        mac, _conn = self._armable(manager)
        closed: list[bool] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append(True),
        )

        await manager._on_device_removed(mac)

        assert closed == [True]

    async def test_client_unsub_does_not_fire_the_closed_signal(self, hass, manager):
        """The client tore it down itself — telling it to re-subscribe would loop."""
        mac, _conn = self._armable(manager)
        closed: list[bool] = []
        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append(True),
        )

        unsub()

        assert closed == []

    async def test_device_flap_does_not_fire_the_closed_signal(self, hass, manager):
        """A flap is what durable streams exist to survive — the stream is NOT gone."""
        mac, conn = self._armable(manager)
        closed: list[bool] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append(True),
        )

        conn.connected = False
        manager._on_session_lost(conn)
        await hass.async_block_till_done()

        assert closed == []

    async def test_a_raising_closed_callback_does_not_break_the_stop_loop(self, hass, manager):
        """A websocket that died mid-teardown must not strand the OTHER clients.

        Both streams here are on one mac, so a raise out of the first one's callback
        would abandon the second inside the same drop loop — it would keep its
        subscription open against a manager that no longer has its stream.
        """
        mac, _conn = self._armable(manager)
        closed: list[str] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=MagicMock(side_effect=RuntimeError("ws already closed")),
        )
        await manager.async_add_state_stream(
            mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append("second"),
        )

        await manager.async_stop()

        assert closed == ["second"]
        assert manager._state_streams == {}

    async def test_a_raising_closed_callback_does_not_break_the_removal_loop(self, hass, manager):
        mac, _conn = self._armable(manager)
        closed: list[str] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=MagicMock(side_effect=RuntimeError("ws already closed")),
        )
        await manager.async_add_state_stream(
            mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append("second"),
        )

        await manager._on_device_removed(mac)

        assert closed == ["second"]
        assert mac not in manager._state_streams

    async def test_a_client_unsubbing_from_its_closed_callback_does_not_break_the_stop_loop(self, hass, manager):
        """The signal's whole point is to make the client react — including re-entrantly.

        A client holding streams on two devices can unsub one from inside the other's
        `on_closed`. That re-enters `_close`, which drops the second mac's now-empty
        list from `_state_streams` — the very dict async_stop's drop loop is walking.
        Iterating a live view would raise `RuntimeError: dictionary changed size during
        iteration` out of async_stop, aborting the unload with connections still open.
        """
        mac_a, conn = self._armable(manager)
        mac_b = "AA:BB:CC:DD:EE:02"
        manager.devices[mac_b] = ManagedDevice(mac=mac_b, name="Kitchen", host="192.168.1.51")
        manager.async_open_session = AsyncMock(return_value=conn)

        closed: list[str] = []
        unsubs: dict[str, Any] = {}

        def _unsub_the_other() -> None:
            closed.append(mac_a)
            unsubs[mac_b]()

        # `mac_a` first: async_stop walks `_state_streams` in insertion order, so its
        # callback must run while `mac_b`'s entry is still in the dict being walked.
        await manager.async_add_state_stream(
            mac_a,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=_unsub_the_other,
        )
        unsubs[mac_b] = await manager.async_add_state_stream(
            mac_b,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
            on_closed=lambda: closed.append(mac_b),
        )

        await manager.async_stop()

        assert closed == [mac_a]  # mac_b's stream was closed BY the client, so no signal
        assert manager._state_streams == {}

    async def test_async_stop_drops_streams(self, hass, manager):
        mac, _conn = self._armable(manager)
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        await manager.async_stop()

        assert manager._state_streams == {}

    async def test_device_available_rearms_streams_before_the_config_push(self, hass, manager):
        """The availability transition is the recovery trigger for a stream whose
        device was still offline when its session died (`_ensure_streams` no-ops
        then). It must run ahead of the config push — here the entity-update guard
        skips that push entirely, and the card must stream regardless."""
        mac, conn = self._armable(manager)
        conn2 = MagicMock()
        conn2.entities = []
        conn2.connected = True
        conn2.subscribe_states = AsyncMock()
        manager.async_open_session = AsyncMock(side_effect=[conn, conn2])
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        manager._is_device_available = MagicMock(return_value=False)
        conn.connected = False
        manager._on_session_lost(conn)
        await hass.async_block_till_done()
        assert manager._state_streams[mac][0].armed is False

        manager._is_device_available = MagicMock(return_value=True)
        manager._entity_update_macs.add(mac)
        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as push:
            await manager._on_device_available(mac)
            await hass.async_block_till_done()

        push.assert_not_awaited()
        assert manager._state_streams[mac][0].armed is True
        assert seen == [True, False, True]

    async def test_session_loss_while_stopping_spawns_nothing(self, hass, manager):
        """async_stop disconnects every session in Phase 3 — AFTER its Phase 2 task
        drain. A reconcile spawned from those on_stop callbacks would escape the
        drain and outlive the config entry (which HA's test harness fails on)."""
        mac, conn = self._armable(manager)
        seen: list[bool] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )
        manager._stopping = True
        conn.connected = False

        with patch.object(manager, "_spawn") as spawn:
            manager._on_session_lost(conn)

        spawn.assert_not_called()
        # The streams are still torn down and the clients still told.
        assert manager._state_streams[mac][0].armed is False
        assert seen == [True, False]

    async def test_session_loss_survives_a_client_unsubbing_from_its_own_callback(self, hass, manager):
        """`notify` runs client code, which may unsub in response — removing the
        stream from the very list `_on_session_lost` is walking. Walking that list
        live would skip the NEXT stream: it would keep a callback on the dead
        connection and never hear about the outage."""
        mac, conn = self._armable(manager)
        unsubs: list[Any] = []
        other: list[bool] = []

        def quit_on_loss(available: bool) -> None:
            if not available:
                unsubs[0]()

        unsubs.append(
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=quit_on_loss,
            )
        )
        await manager.async_add_state_stream(
            mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=other.append,
        )
        assert other == [True]
        manager._stopping = True  # park the reconcile — it's covered elsewhere
        conn.connected = False

        manager._on_session_lost(conn)

        # The self-unsubbing client is gone; the survivor is disarmed and informed.
        survivor = manager._state_streams[mac][0]
        assert survivor.counter_attr == "heatmap_subs"
        assert survivor.armed is False
        assert other == [True, False]
        assert conn.unsubscribe_states.call_count == 2

    async def test_session_loss_leaves_a_stream_armed_on_a_live_connection_alone(self, hass, manager):
        """A stale on_stop must not tear down its successor's streams.

        aioesphomeapi delivers the hook as a detached task, so a callback from a
        connection that has already been REPLACED can land while the streams are armed
        on the live replacement. Disarming those would flap the client False→True and
        decrement a session ref that belongs to the fresh connection. The hook carries
        the dead connection itself, so the match is by identity — it never has to infer
        "is this stale?" from the successor's liveness.
        """
        mac, conn = self._armable(manager)
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )
        assert seen == [True]

        # The stop comes from a dead PREDECESSOR on the same mac; the stream is armed
        # on `conn`, its live successor.
        dead = MagicMock()
        dead.mac = mac
        dead.connected = False
        manager._on_session_lost(dead)
        await hass.async_block_till_done()

        assert manager._state_streams[mac][0].armed is True
        assert manager._state_streams[mac][0].conn is conn
        assert seen == [True]
        manager.release_session.assert_not_called()
        conn.unsubscribe_states.assert_not_called()
        dead.unsubscribe_states.assert_not_called()

    async def test_device_removed_mid_arm_releases_instead_of_rearming(self, hass, manager):
        """A drop must mark its streams closed, or an in-flight arm re-arms them.

        `_arm_stream` is parked inside `subscribe_states` when the device is removed.
        Unless the drop marks the stream closed, the arm resumes past both of its
        `stream.closed` guards: it registers a callback on a torn-down connection and
        tells the client `available=True` for a device that no longer exists.
        """
        mac, conn = self._armable(manager)
        gate = asyncio.Event()
        seen: list[bool] = []

        async def gated_subscribe(_cb):
            await gate.wait()

        conn.subscribe_states = AsyncMock(side_effect=gated_subscribe)

        adder = asyncio.create_task(
            manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=seen.append,
            )
        )
        await _settle()
        stream = manager._state_streams[mac][0]
        assert stream.armed is False  # parked inside subscribe_states

        await manager._on_device_removed(mac)
        assert mac not in manager._state_streams
        assert seen == [False]

        gate.set()  # the arm resumes into a manager that has dropped the device
        await adder
        await hass.async_block_till_done()

        assert stream.armed is False
        assert seen == [False]  # never told the removed device was live
        conn.unsubscribe_states.assert_called_once()
        manager.release_session.assert_called_once_with(mac, conn)

    async def test_async_stop_drops_streams_before_disconnecting(self, hass, manager):
        """Teardown must not route stream drops through `release_session`.

        aioesphomeapi delivers on_stop as a detached task, so `_on_session_lost` can
        land inside async_stop's Phase-3 disconnect gather — with `_state_streams` and
        `_active_connections` both still populated. `release_session` then identity-
        matches, sees the last ref, and schedules a close AFTER the Phase-2 drain
        emptied `_pending_closes`: a task escaping teardown (which is exactly what the
        `_stopping` guard exists to prevent), racing a second disconnect against the
        one already in flight.

        Runs the real `async_open_session` / `release_session` (the `_armable` helper
        mocks both, which is why the rest of the suite is blind to this).
        """
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)
        manager.request_pipeline_push = MagicMock()
        manager._push_pipeline_to_device = AsyncMock()
        seen: list[bool] = []

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as conn_cls:
            conn = conn_cls.return_value
            conn.mac = mac
            conn.entities = []
            conn.connected = True
            conn.async_connect = AsyncMock()
            conn.subscribe_states = AsyncMock()
            conn.unsubscribe_states = MagicMock()

            async def _disconnect() -> None:
                # The detached on_stop lands while the Phase-3 gather is in flight.
                conn.connected = False
                manager._on_session_lost(conn)

            conn.async_disconnect = AsyncMock(side_effect=_disconnect)

            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=seen.append,
            )
            stream = manager._state_streams[mac][0]
            assert manager._active_connections[mac] is conn
            assert manager._session_refcounts[mac] == 1

            with patch.object(manager, "schedule_close_session", wraps=manager.schedule_close_session) as sched:
                await manager.async_stop()
                await hass.async_block_till_done()

        # No close scheduled past the drain, and no second disconnect racing Phase 3.
        sched.assert_not_called()
        assert conn.async_disconnect.await_count == 1
        assert manager._pending_closes == {}
        assert manager._state_streams == {}
        assert stream.closed is True
        assert stream.armed is False
        assert seen == [True, False]  # the client was told its stream died

    async def test_async_stop_notifies_streams_when_session_loss_lands_late(self, hass, manager):
        """The other half of the same race: on_stop is detached, so it can land after
        teardown has finished. If async_stop dropped `_state_streams` without telling
        the clients, `_on_session_lost` early-returns and the card is never told its
        stream died — issue #334's failure mode, reintroduced by the teardown."""
        mac, conn = self._armable(manager)
        seen: list[bool] = []
        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )

        await manager.async_stop()
        conn.connected = False
        manager._on_session_lost(conn)  # detached delivery, after teardown

        assert manager._state_streams == {}
        assert seen == [True, False]

    async def test_async_stop_ignores_a_release_from_an_arm_parked_across_teardown(self, hass, manager):
        """A parked `_arm_stream` must not schedule a close past the Phase-2 drain.

        The arm is awaited by its caller (`async_add_state_stream`, i.e. the WS handler),
        so it is NOT in `_pending_tasks` and the drain never waits for it. Phase 3 marks
        its stream closed; when the arm resumes inside the disconnect gather it takes the
        `stream.closed` branch and calls `release_session` — with `_active_connections`
        not yet cleared, that identity-matches, takes the last ref and schedules a close:
        a task created AFTER the drain, disconnecting a connection already mid-disconnect.

        Runs the real `async_open_session` / `release_session` / `schedule_close_session`
        (the `_armable` helper mocks the last two, which is why the rest of the suite is
        blind to this).
        """
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)
        manager.request_pipeline_push = MagicMock()
        manager._push_pipeline_to_device = AsyncMock()
        gate = asyncio.Event()
        seen: list[bool] = []

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as conn_cls:
            conn = conn_cls.return_value
            conn.entities = []
            conn.connected = True
            conn.async_connect = AsyncMock()
            conn.unsubscribe_states = MagicMock()

            async def _gated_subscribe(_cb) -> None:
                await gate.wait()

            conn.subscribe_states = AsyncMock(side_effect=_gated_subscribe)

            async def _disconnect() -> None:
                # Mid-gather: `_active_connections` and `_session_refcounts` still hold
                # this conn. Let the parked arm resume right here.
                conn.connected = False
                gate.set()
                await _settle()

            conn.async_disconnect = AsyncMock(side_effect=_disconnect)

            adder = asyncio.create_task(
                manager.async_add_state_stream(
                    mac,
                    counter_attr="grid_target_subs",
                    make_on_state=lambda m, c: lambda s: None,
                    on_availability=seen.append,
                )
            )
            await _settle()
            stream = manager._state_streams[mac][0]
            assert stream.armed is False  # parked inside subscribe_states
            assert manager._active_connections[mac] is conn
            assert manager._session_refcounts[mac] == 1

            with patch.object(manager, "schedule_close_session", wraps=manager.schedule_close_session) as sched:
                await manager.async_stop()
                await adder
                await hass.async_block_till_done()

        sched.assert_not_called()
        assert conn.async_disconnect.await_count == 1
        assert manager._pending_closes == {}
        # The arm still took its callback back off the connection it was parked on.
        conn.unsubscribe_states.assert_called_once()
        assert stream.closed is True
        assert stream.armed is False
        assert seen == [False]  # never armed, so the client was only ever told False

    async def test_open_session_racing_teardown_does_not_strand_a_connection(self, hass, manager):
        """An open parked in `async_connect` must not land a live conn past teardown.

        `release_session` no-ops while stopping — teardown owns the refcounts and the
        disconnects — so a connection stored into `_active_connections` AFTER Phase 3
        cleared it would be closed by nobody: a live ESPHome connection (and its session
        ref) surviving unload. Teardown therefore has to own the tail of an in-flight
        open too, and refuse a fresh one outright.
        """
        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._is_device_available = MagicMock(return_value=True)
        gate = asyncio.Event()

        with patch("custom_components.eppgrid.device_manager.DeviceConnection") as conn_cls:
            conn = conn_cls.return_value
            conn.entities = []
            conn.connected = True
            conn.async_disconnect = AsyncMock()

            async def _connect() -> None:
                await gate.wait()

            conn.async_connect = AsyncMock(side_effect=_connect)

            opener = asyncio.create_task(manager.async_open_session(mac))
            await _settle()
            assert manager._active_connections == {}  # parked inside async_connect

            await manager.async_stop()
            gate.set()
            assert await opener is None
            # And a fresh open after teardown never even builds a connection.
            assert await manager.async_open_session(mac) is None

        assert conn_cls.call_count == 1
        assert manager._active_connections == {}
        assert manager._session_refcounts == {}
        conn.async_disconnect.assert_awaited_once()  # the parked open cleaned up after itself

    # -- retry backoff (device available, our own connect fails) ------------

    async def test_failed_open_retries_until_it_arms(self, hass, manager):
        mac, conn = self._armable(manager)
        manager._stream_retry_delays = (0.0,)
        manager.async_open_session = AsyncMock(side_effect=[None, conn])
        seen: list[bool] = []

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=seen.append,
        )
        assert seen == [False]

        await asyncio.sleep(0)
        await hass.async_block_till_done()

        assert manager.async_open_session.await_count == 2
        conn.subscribe_states.assert_awaited_once()
        assert seen == [False, True]

    async def test_retry_stops_once_the_stream_is_closed(self, hass, manager):
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (0.0,)
        manager.async_open_session = AsyncMock(return_value=None)

        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        unsub()
        await hass.async_block_till_done()

        assert mac not in manager._stream_retry_tasks

    async def test_only_one_retry_task_per_mac(self, hass, manager):
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (30.0,)
        manager.async_open_session = AsyncMock(return_value=None)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        first = manager._stream_retry_tasks[mac]
        await manager._ensure_streams(mac)

        assert manager._stream_retry_tasks[mac] is first
        first.cancel()

    async def test_async_stop_cancels_retry_tasks(self, hass, manager):
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (30.0,)
        manager.async_open_session = AsyncMock(return_value=None)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        task = manager._stream_retry_tasks[mac]

        await manager.async_stop()

        assert task.cancelled() or task.done()
        assert manager._stream_retry_tasks == {}

    async def test_retry_backoff_escalates_and_holds_at_the_last_delay(self, hass, manager):
        """One task drives the whole backoff — a fresh task per pass would reset it.

        Re-entering the schedule from each `_ensure_streams` pass would restart the
        sequence at its first delay: a permanently-failing connect would then poll the
        device forever at that interval instead of backing off.
        """
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (1.0, 3.0)
        manager.async_open_session = AsyncMock(return_value=None)
        slept: list[float] = []
        real_sleep = asyncio.sleep  # the patch below replaces the module attribute

        async def fake_sleep(delay: float) -> None:
            # Patching the module attribute catches every sleeper on the loop, and
            # `async_block_till_done` yields with `sleep(0)` — record only the
            # backoff's own (always non-zero) waits.
            if delay:
                slept.append(delay)
                if len(slept) == 4:
                    # Let the retry loop exit: the client's WS subscription went away.
                    manager._state_streams.pop(mac, None)
            await real_sleep(0)

        with patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=fake_sleep):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
            await hass.async_block_till_done()

        assert slept == [1.0, 3.0, 3.0, 3.0]
        assert mac not in manager._stream_retry_tasks

    async def test_device_removed_cancels_the_retry(self, hass, manager):
        """Nothing can arm a removed device's streams — the backoff must not outlive it."""
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (30.0,)
        manager.async_open_session = AsyncMock(return_value=None)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        task = manager._stream_retry_tasks[mac]

        await manager._on_device_removed(mac)
        await hass.async_block_till_done()

        assert manager._stream_retry_tasks == {}
        assert task.done()

    async def test_no_retry_is_scheduled_while_stopping(self, hass, manager):
        """async_stop cancels the retries in Phase 1 — one spawned after that (from a
        reconcile still settling in the Phase 2 drain) would outlive the config entry."""
        mac, _conn = self._armable(manager)
        manager._stopping = True

        with patch.object(manager, "_spawn") as spawn:
            manager._schedule_stream_retry(mac)

        spawn.assert_not_called()
        assert manager._stream_retry_tasks == {}

    async def test_offline_device_does_not_schedule_a_retry(self, hass, manager):
        """The availability transition already re-runs the reconciler — polling an
        offline device on top of that is pure churn."""
        mac, _conn = self._armable(manager)
        manager._is_device_available = MagicMock(return_value=False)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )

        assert manager._stream_retry_tasks == {}

    async def test_cancelled_arm_still_leaves_a_retry_for_the_other_streams(self, hass, manager):
        """A cancelled arm pass must not strand ANOTHER client's stream unarmed.

        The reconciler arms every unarmed stream for the mac, so the pass belongs to all
        of them — but it runs inside whichever WS handler triggered it, and that handler's
        task can be cancelled (the user closes the tab) while it is parked in the open for
        someone else's stream. `async_add_state_stream`'s rollback closes only ITS OWN
        stream; without the reconciliation running on the way out, the other stream is
        left registered-but-unarmed on an AVAILABLE device with no retry armed and no
        further trigger coming — #334's failure mode, until the next flap.
        """
        mac, conn = self._armable(manager)
        manager._stream_retry_delays = (30.0,)

        # A heatmap card subscribes while the device is offline: registered, unarmed,
        # and deliberately without a retry (the availability transition is its trigger).
        manager._is_device_available = MagicMock(return_value=False)
        await manager.async_add_state_stream(
            mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        heatmap = manager._state_streams[mac][0]
        assert manager._stream_retry_tasks == {}

        # The device comes back. A second card's subscribe handler wins the mac's stream
        # lock, snapshots both streams, and parks in the open for the heatmap one.
        manager._is_device_available = MagicMock(return_value=True)
        gate = asyncio.Event()

        async def gated_open(_mac):
            await gate.wait()
            return conn

        manager.async_open_session = AsyncMock(side_effect=gated_open)
        adder = asyncio.create_task(
            manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
        )
        await _settle()
        assert heatmap.armed is False  # the pass is parked opening the heatmap's session

        # The second card's tab closes: HA cancels its WS handler task mid-arm.
        adder.cancel()
        with pytest.raises(asyncio.CancelledError):
            await adder
        await _settle()

        # Only the cancelled handler's own stream is rolled back. The heatmap stream is
        # still registered and still unarmed — so the backoff has to be armed for it.
        assert manager._state_streams[mac] == [heatmap]
        assert heatmap.armed is False
        assert heatmap.closed is False
        assert mac in manager._stream_retry_tasks, "the surviving stream has no way back"

    async def test_retry_stands_down_when_the_device_goes_offline(self, hass, manager):
        """HA marks the device unavailable a beat AFTER our own connect starts failing.

        From then on the backoff is pure churn — `_ensure_streams` early-returns on an
        offline device, and `_on_device_available` is what re-arms it. Left ticking, the
        task wakes every 30s for the life of the config entry and holds `attempt` at the
        top of the backoff for when the device does come back.
        """
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (1.0,)
        manager.async_open_session = AsyncMock(return_value=None)
        slept: list[float] = []
        real_sleep = asyncio.sleep  # the patch below replaces the module attribute

        async def fake_sleep(delay: float) -> None:
            # `async_block_till_done` yields with `sleep(0)` — record only the backoff's
            # own (always non-zero) waits.
            if delay:
                slept.append(delay)
                # The device drops off the network while the backoff task is parked.
                manager._is_device_available = MagicMock(return_value=False)
                if len(slept) > 3:
                    # Still ticking: break the loop so the assertion below reports the
                    # bug instead of the test hanging.
                    manager._state_streams.pop(mac, None)
            await real_sleep(0)

        with patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=fake_sleep):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
            task = manager._stream_retry_tasks[mac]
            await hass.async_block_till_done()

        assert slept == [1.0]
        assert manager.async_open_session.await_count == 1  # the initial arm, no retry pass
        assert task.done()
        assert manager._stream_retry_tasks == {}

    async def test_arming_elsewhere_retires_the_sleeping_retry(self, hass, manager):
        """A parked backoff task owns the mac's retry slot until it wakes.

        Once the streams arm by another path, that slot is dead weight: a device that
        flaps before the task wakes drives `_on_session_lost` → a failed arm →
        `_schedule_stream_retry`, which no-ops against the stale task, so recovery waits
        out its escalated delay instead of rescheduling from the first.
        """
        mac, conn = self._armable(manager)
        manager._stream_retry_delays = (30.0,)
        manager.async_open_session = AsyncMock(return_value=None)

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        task = manager._stream_retry_tasks[mac]

        # The device comes back: the availability transition re-runs the reconciler,
        # which arms the stream while the backoff task is still sleeping.
        manager.async_open_session = AsyncMock(return_value=conn)
        await manager._ensure_streams(mac)

        conn.subscribe_states.assert_awaited_once()
        assert manager._stream_retry_tasks == {}, "the armed mac still owns a retry slot"
        # Bounded: a task left parked would only settle after its 30s backoff.
        await asyncio.wait_for(asyncio.gather(task, return_exceptions=True), timeout=1.0)
        assert task.done()

    async def test_retry_releases_its_slot_the_moment_its_own_pass_arms(self, hass, manager):
        """The retry's own successful pass must not loop into another sleep holding the slot.

        The sibling test covers the case where some OTHER path arms the streams. When the
        retry task itself arms them, looping back to the top would park it on the next
        (escalated) delay still owning `_stream_retry_tasks[mac]`, so the next failure
        would find the slot taken and wait that delay out instead of retrying from the
        first — the same stale-slot bug, reached from the other side.
        """
        mac, conn = self._armable(manager)
        manager._stream_retry_delays = (1.0, 30.0)
        manager.async_open_session = AsyncMock(side_effect=[None, conn])
        slept: list[float] = []
        real_sleep = asyncio.sleep

        async def fake_sleep(delay: float) -> None:
            if delay:
                slept.append(delay)
            await real_sleep(0)

        with patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=fake_sleep):
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
            task = manager._stream_retry_tasks[mac]
            await hass.async_block_till_done()

        conn.subscribe_states.assert_awaited_once()
        assert slept == [1.0], "the retry slept again holding the mac's slot after arming"
        assert task.done()
        assert manager._stream_retry_tasks == {}

    async def test_unsub_of_the_last_stream_retires_the_sleeping_retry(self, hass, manager):
        """The client's own unsub is a third way for the retry slot to go stale.

        Popping the mac's last stream leaves a parked backoff task owning
        `_stream_retry_tasks[mac]` for the rest of its (escalated) delay. It is not a
        leak — it exits on its next tick — but a user who re-opens the dashboard before
        it wakes gets a fresh subscription whose failed arm calls `_schedule_stream_retry`
        into that stale slot, where it no-ops: recovery then waits out the OLD delay
        (up to 30s) instead of restarting the backoff at the first.
        """
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (1.0, 30.0)
        manager.async_open_session = AsyncMock(return_value=None)
        slept: list[float] = []
        real_sleep = asyncio.sleep  # the patch below replaces the module attribute
        parked = asyncio.Event()  # never set: a backoff that outlasts the test

        async def fake_sleep(delay: float) -> None:
            # `async_block_till_done` yields with `sleep(0)` — only the backoff's own
            # (always non-zero) waits park here.
            if delay:
                slept.append(delay)
                await parked.wait()
            await real_sleep(0)

        with patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=fake_sleep):
            unsub = await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
            assert unsub is not None
            await _settle()
            stale = manager._stream_retry_tasks[mac]
            assert slept == [1.0]  # parked on the first delay

            unsub()  # the card's tab closes — the mac's last stream

            assert manager._stream_retry_tasks == {}, "the unsubbed mac still owns a retry slot"
            await _settle()
            assert stale.done()

            # The user re-opens the dashboard well inside the old backoff, and the arm
            # fails again.
            await manager.async_add_state_stream(
                mac,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, c: lambda s: None,
                on_availability=lambda a: None,
            )
            await _settle()

        fresh = manager._stream_retry_tasks[mac]
        assert fresh is not stale, "the stale task still owns the slot"
        assert slept == [1.0, 1.0], "the new backoff resumed the stale task's escalated delay"
        fresh.cancel()

    async def test_unsub_from_inside_the_retrys_own_pass_does_not_kill_it(self, hass, manager):
        """`_close` is the CLIENT's callback and can run INSIDE the retry task.

        The retry's `_ensure_streams` pass arms the stream and notifies the client, which
        is free to unsub from that very callback — re-entering `_close` on the retry
        task's own stack. Retiring the slot's task there without an identity check would
        cancel the retry task from within itself, tearing down the pass mid-flight.
        """
        mac, conn = self._armable(manager)
        manager._stream_retry_delays = (0.0,)
        manager.async_open_session = AsyncMock(side_effect=[None, conn])
        seen: list[bool] = []
        handle: dict[str, Callable[[], None]] = {}

        def on_availability(available: bool) -> None:
            seen.append(available)
            if available:
                handle["unsub"]()

        unsub = await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=on_availability,
        )
        assert unsub is not None
        handle["unsub"] = unsub
        assert seen == [False]  # the initial arm failed; the backoff is armed
        task = manager._stream_retry_tasks[mac]

        await hass.async_block_till_done()

        assert seen == [False, True]  # the retry's pass armed it and the client unsubbed
        assert task.done()
        assert not task.cancelled(), "the retry task cancelled itself from the client's unsub"
        assert manager._stream_retry_tasks == {}
        conn.unsubscribe_states.assert_called_once()  # the unsub still disarmed cleanly
        assert mac not in manager._state_streams
        assert mac not in manager._target_subs

    async def test_async_stop_is_bounded_when_a_retry_hangs_in_the_open(self, hass, manager):
        """Phase 1 must cancel the retries WITHOUT awaiting their unwind.

        `_pending_pushes` can be gathered there because a push task leaves that dict
        before its network write — a cancel can only ever land in its debounce sleep.
        `_stream_retry_tasks[mac]` is held across the whole `_ensure_streams` pass, so
        the cancel can land inside the session open (or its stale-connection
        disconnect, or `subscribe_states`) against a device that has dropped off the
        network. An unbounded gather on that unwind would hold unload past
        `_stop_timeout` — the docstring's hard upper bound. Phase 2's drain is what
        settles the task, under that bound.
        """
        mac, _conn = self._armable(manager)
        manager._stream_retry_delays = (0.0,)
        manager._stop_timeout = 0.1
        entered = asyncio.Event()
        never = asyncio.Event()
        opens = 0

        async def hanging_open(_mac):
            nonlocal opens
            opens += 1
            if opens == 1:
                return None  # the initial arm fails, scheduling the retry
            entered.set()
            try:
                await never.wait()
            except asyncio.CancelledError:
                # A cancelled `async_open_session` unwinds by disconnecting the stale
                # connection — a gracious close (not force=True) that hangs when the
                # device is off the network.
                await never.wait()
                raise
            return None

        manager.async_open_session = hanging_open

        await manager.async_add_state_stream(
            mac,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, c: lambda s: None,
            on_availability=lambda a: None,
        )
        task = manager._stream_retry_tasks[mac]
        await asyncio.wait_for(entered.wait(), timeout=2.0)

        # Unbounded, this never returns: the retry's unwind never completes on its own.
        await asyncio.wait_for(manager.async_stop(), timeout=2.0)

        assert task.done()
        assert manager._stream_retry_tasks == {}
        assert all(t.done() for t in manager._pending_tasks), "a task escaped teardown"

    # -- Poll-delivery seam (heatmap polls instead of push; issue #365) --------
    #
    # A stream carrying a `poll_fn` drives a periodic poller INSTEAD of a PUSH
    # `subscribe_states` subscription. These tests construct a poll `StateStream`
    # directly (the `async_add_state_stream(poll_fn=...)` plumbing arrives in a
    # later task) and drive `_arm_stream`/`_disarm_stream`/`mark_closed`/`async_stop`
    # against it. Everything else (session keep-alive, refcount, availability) is
    # reused unchanged, so the existing PUSH tests above still pin that behaviour.

    async def test_poll_stream_arms_with_a_poll_task_not_subscribe_states(self, hass, manager):
        """Arming a poll stream starts a poll task and never calls subscribe_states."""
        mac, conn = self._armable(manager)
        seen_conn: list[Any] = []
        emitted: list[Any] = []

        async def poll_fn(c):
            seen_conn.append(c)
            return [1, 2, 3]

        stream = StateStream(
            mac=mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: emitted.append,
            on_availability=lambda a: None,
            poll_fn=poll_fn,
            poll_interval=0.01,
        )
        manager._state_streams.setdefault(mac, []).append(stream)

        assert await manager._arm_stream(stream) is True
        assert stream.poll_task is not None
        assert stream.armed is True
        # PUSH path untouched: an armed poll stream never subscribes to state frames.
        conn.subscribe_states.assert_not_called()

        await asyncio.sleep(0.03)  # let the poller tick a few times
        assert emitted and emitted[0] == [1, 2, 3]
        assert seen_conn[0] is conn  # poll_fn is fed the live connection

        task = stream.poll_task
        manager._disarm_stream(stream)
        # Disarm cancels the poller and releases the session, and — unlike the PUSH
        # path — does NOT call unsubscribe_states.
        assert stream.poll_task is None
        conn.unsubscribe_states.assert_not_called()
        manager.release_session.assert_called_once_with(mac, conn)
        await asyncio.gather(task, return_exceptions=True)
        assert task.done()

    async def test_poll_stream_skips_tick_on_none_or_error(self, hass, manager):
        """A tick where poll_fn returns None (old fw) or raises skips cb; the loop continues."""
        mac, _conn = self._armable(manager)
        emitted: list[Any] = []
        drained = asyncio.Event()
        results: list[Any] = [None, "boom", [9]]

        async def poll_fn(c):
            if not results:
                drained.set()  # the poller has run past every scripted tick
                return None
            item = results.pop(0)
            if item == "boom":
                raise RuntimeError("transient fetch error")
            return item

        stream = StateStream(
            mac=mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: emitted.append,
            on_availability=lambda a: None,
            poll_fn=poll_fn,
            poll_interval=0.01,
        )
        manager._state_streams.setdefault(mac, []).append(stream)

        assert await manager._arm_stream(stream) is True
        # Bounded wait: a 4th poll_fn call (list now empty) sets the event, proving
        # the loop ticked past the None and the raise to reach the successful [9].
        await asyncio.wait_for(drained.wait(), timeout=2.0)

        # Only the successful [9] tick called cb; the None and the raise were skipped.
        assert emitted == [[9]]

        task = stream.poll_task
        manager._disarm_stream(stream)
        await asyncio.gather(task, return_exceptions=True)

    async def test_mark_closed_cancels_the_poll_task(self, hass, manager):
        """Terminal teardown cancels the poller — async_stop Phase 3 reaches streams here."""
        mac, _conn = self._armable(manager)

        async def poll_fn(c):
            return [1]

        stream = StateStream(
            mac=mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda item: None,
            on_availability=lambda a: None,
            poll_fn=poll_fn,
            poll_interval=0.01,
        )
        manager._state_streams.setdefault(mac, []).append(stream)

        assert await manager._arm_stream(stream) is True
        task = stream.poll_task
        assert task is not None

        stream.mark_closed()

        assert stream.closed is True
        assert stream.poll_task is None
        await asyncio.gather(task, return_exceptions=True)
        assert task.done()

    async def test_async_stop_cancels_poll_tasks_without_hanging(self, hass, manager):
        """Phase 1 cancels forever-looping poll tasks BEFORE the drain, so stop can't hang."""
        mac, _conn = self._armable(manager)
        # Wide drain bound: on the success path the poll task is cancelled in Phase 1
        # and async_stop returns at once; a regression that left it looping would make
        # the Phase 2 drain wait out this whole window.
        manager._stop_timeout = 10.0

        async def poll_fn(c):
            return [1]  # never None -> a poll task that loops until cancelled

        stream = StateStream(
            mac=mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: lambda item: None,
            on_availability=lambda a: None,
            poll_fn=poll_fn,
            poll_interval=0.01,
        )
        manager._state_streams.setdefault(mac, []).append(stream)

        assert await manager._arm_stream(stream) is True
        task = stream.poll_task
        assert task is not None

        # Bounded well under `_stop_timeout`: a hung drain blows this, not the timeout.
        await asyncio.wait_for(manager.async_stop(), timeout=2.0)

        assert task.done()
        assert manager._state_streams == {}
        assert all(t.done() for t in manager._pending_tasks), "a task escaped teardown"

    async def test_poll_arm_rollback_releases_session_when_make_on_state_raises(self, hass, manager):
        """A raise in the poll branch rolls back all-or-nothing, like the push path.

        The poll branch calls `make_on_state` and spawns the poller — either can raise
        (a `make_on_state` bug, task creation during shutdown). An unprotected failure
        would leak the session `async_open_session` just took and leave the stream
        half-armed, breaking `async_add_state_stream`'s all-or-nothing invariant. The
        arm must return False, give the ref back via `release_session`, and leave the
        stream unarmed.
        """
        mac, conn = self._armable(manager)

        def make_on_state(_mac, _conn):
            raise RuntimeError("callback build failed")

        async def poll_fn(c):
            return None  # never reached — make_on_state raises first

        stream = StateStream(
            mac=mac,
            counter_attr="heatmap_subs",
            make_on_state=make_on_state,
            on_availability=lambda a: None,
            poll_fn=poll_fn,
            poll_interval=0.01,
        )
        manager._state_streams.setdefault(mac, []).append(stream)

        assert await manager._arm_stream(stream) is False
        # Left unarmed: no connection bound, no poller spawned.
        assert stream.conn is None
        assert stream.poll_task is None
        assert stream.armed is False
        # The session ref `async_open_session` took is given back, not pinned open.
        manager.release_session.assert_called_once_with(mac, conn)
        # No poller ever ran, so the push subscription path stays untouched too.
        conn.subscribe_states.assert_not_called()

    async def test_poll_emit_failure_does_not_kill_the_poller(self, hass, manager):
        """A `cb(item)` raise skips that emit but keeps the poller alive for later ticks.

        Unlike a `poll_fn` failure (which just skips a tick), an unguarded emit raise
        would kill the poll task permanently with no re-arm. The emit is isolated to
        match the PUSH path's per-callback `_fan_out`: the first delivery raises, and a
        LATER successful delivery proves the loop survived and kept ticking.
        """
        mac, _conn = self._armable(manager)
        recorded: list[Any] = []
        recorded_after_raise = asyncio.Event()
        calls = {"n": 0}

        def cb(item):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("emit boom")  # first emit dies
            recorded.append(item)
            recorded_after_raise.set()  # a later emit succeeded -> poller survived

        async def poll_fn(c):
            return [1]

        stream = StateStream(
            mac=mac,
            counter_attr="heatmap_subs",
            make_on_state=lambda m, c: cb,
            on_availability=lambda a: None,
            poll_fn=poll_fn,
            poll_interval=0.01,
        )
        manager._state_streams.setdefault(mac, []).append(stream)

        assert await manager._arm_stream(stream) is True
        task = stream.poll_task
        assert task is not None

        # Bounded wait: only a LATER successful emit fires this event, so reaching it
        # proves the poller did not die on the first emit's raise.
        await asyncio.wait_for(recorded_after_raise.wait(), timeout=2.0)
        assert calls["n"] >= 2
        assert recorded and recorded[0] == [1]
        assert not task.done()  # still looping

        manager._disarm_stream(stream)
        await asyncio.gather(task, return_exceptions=True)


class TestOverviewStreamRecovery:
    """The card's stream must survive a device flap — issue #334.

    End-to-end across the two layers that broke: the REAL non-admin WS scaffolding
    (`_start_overview_stream`) on a REAL `DeviceManager`. The card is non-admin and
    has no device-list hook of its own, so recovery has to come from the manager —
    the callback is bound to a disposable `DeviceConnection`, and nothing re-armed
    it when that connection died. (The panel used to recover by watching the device
    list and resubscribing instead; #336 retired that and moved the panel's own
    three streams onto this same manager-owned recovery.)
    """

    class FakeDeviceConnection:
        """DeviceConnection stand-in: real subscriber bookkeeping, no network.

        `key` is per-connection: the entity key map is only knowable from the live
        connection and a device can renumber its entities across an OTA, so a
        replacement connection is given a DIFFERENT key. A re-arm that reused the
        dead connection's callback (or its cached key map) would decode nothing.
        """

        def __init__(self, key: int = 1, mac: str = "AA:BB:CC:DD:EE:01") -> None:
            self.key = key
            self.mac = mac
            self.entities = [
                TextSensorInfo(object_id="target_1_position", key=key, name="Target 1 Position"),
            ]
            self.subscribers: list[Any] = []
            self.connected = True

        async def subscribe_states(self, cb) -> None:
            if not self.connected:
                raise RuntimeError("Cannot subscribe to states: connection is closed")
            self.subscribers.append(cb)

        def unsubscribe_states(self, cb) -> None:
            with contextlib.suppress(ValueError):
                self.subscribers.remove(cb)

        def emit_target(self, position: str) -> None:
            state = TextSensorState(key=self.key, state=position, missing_state=False)
            for cb in list(self.subscribers):
                cb(state)

        def kill(self) -> None:
            """Mirror `_release_references`: a dead connection drops its subscribers."""
            self.connected = False
            self.subscribers.clear()

    async def test_card_keeps_streaming_after_a_device_flap(self, hass, manager):
        from custom_components.eppgrid.websocket_api._devices import _make_grid_target_on_state
        from custom_components.eppgrid.websocket_api._overview import _start_overview_stream

        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._device_id_to_mac["dev1"] = mac
        manager._store.devices = {mac: {}}
        manager._is_device_available = MagicMock(return_value=True)

        # Two successive device connections: the original, and its replacement
        # after the flap.
        # The replacement renumbers its entities (an OTA can): the rebuilt callback
        # must come from connection #2, not the dead one's key map.
        conns = [self.FakeDeviceConnection(key=1), self.FakeDeviceConnection(key=2)]
        opened: list[Any] = []

        async def _open(_mac):
            conn = conns[len(opened)]
            opened.append(conn)
            return conn

        manager.async_open_session = AsyncMock(side_effect=_open)
        manager.release_session = MagicMock(return_value=None)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {"id": 1, "type": "eppgrid/overview/subscribe", "device_id": "dev1"}

        await _start_overview_stream(
            connection,
            msg,
            manager,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, dc: _make_grid_target_on_state(connection, msg["id"], m, dc),
            send_snapshot=True,
            protocol="full",
        )

        assert len(opened) == 1
        assert len(conns[0].subscribers) == 1

        # The device flaps: its API connection dies, taking every state
        # subscriber with it (exactly what `_release_references` does).
        conns[0].kill()
        manager._on_session_lost(conns[0])
        # `_settle`, not `async_block_till_done`: the latter would also await the
        # debounced pipeline push's real-time sleep.
        await _settle()

        # The manager re-armed the stream on the REPLACEMENT connection, rebuilding
        # the callback from the factory — the entity key map is only knowable from
        # the live connection.
        assert len(opened) == 2
        assert len(conns[1].subscribers) == 1

        # A frame on the new connection reaches the card.
        connection.send_message.reset_mock()
        conns[1].emit_target("100,200,active")
        target_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "targets" in c.args[0].get("event", {})
        ]
        assert target_events, "expected the card to receive a frame after the flap"

        # Teardown: drop the stream, then stop the manager so no debounced
        # pipeline-push task outlives the test.
        connection.subscriptions[1]()
        await manager.async_stop()
        await hass.async_block_till_done()

    async def test_card_mount_collapses_into_one_pipeline_push(self, hass, manager):
        """A mounting card opens `overview/subscribe` then `overview/subscribe_heatmap`
        back-to-back. The device must see exactly ONE `epp_set_pipeline`, carrying the
        SETTLED counts.

        Both subscribes record their subscriber count BEFORE arming (the count is
        per-mac and must survive a flap), so the first one's session open already sees
        a non-empty `_target_subs`. Pushing from there directly would spend a second
        round-trip on the ESP32's scarce API slots — exactly while it is recovering —
        to deliver counts that were stale the moment they were read (`{grid:1,
        heatmap:0}`). Runs the REAL `async_open_session`, which is where that push lives.
        """
        from custom_components.eppgrid.websocket_api._devices import _make_grid_target_on_state
        from custom_components.eppgrid.websocket_api._devices import _make_heatmap_on_state
        from custom_components.eppgrid.websocket_api._overview import _start_overview_stream

        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50", device_id="dev1")
        manager._device_id_to_mac["dev1"] = mac
        manager._store.devices[mac] = {}
        manager._is_device_available = MagicMock(return_value=True)
        # `heatmap_interval` is stripped for pre-1.3.0 firmware, and the counts are
        # what this test is reading — so give the device a version that keeps it.
        manager.read_firmware_version = MagicMock(return_value="1.6.0")

        conn = self.FakeDeviceConnection()
        conn.async_connect = AsyncMock()
        conn.async_disconnect = AsyncMock()
        conn.async_execute_service = AsyncMock()

        connection = MagicMock()
        connection.subscriptions = {}

        with patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=conn):
            await _start_overview_stream(
                connection,
                {"id": 1, "type": "eppgrid/overview/subscribe", "device_id": "dev1"},
                manager,
                counter_attr="grid_target_subs",
                make_on_state=lambda m, dc: _make_grid_target_on_state(connection, 1, m, dc),
                send_snapshot=True,
                protocol="full",
            )
            await _start_overview_stream(
                connection,
                {"id": 2, "type": "eppgrid/overview/subscribe_heatmap", "device_id": "dev1"},
                manager,
                counter_attr="heatmap_subs",
                make_on_state=lambda m, dc: _make_heatmap_on_state(connection, 2),
                send_snapshot=False,
                protocol="closed_only",
            )
            await hass.async_block_till_done()

            pipelines = [
                call.args[1]
                for call in conn.async_execute_service.await_args_list
                if call.args[0] == "epp_set_pipeline"
            ]

        assert len(pipelines) == 1
        # The final counts, not the mid-mount ones: grid drives display/zone_state.
        # heatmap_interval no longer varies with heatmap_subs (pull transport,
        # issue #365) — it stays 0 regardless of the heatmap subscription.
        assert pipelines[0]["display_interval"] == 200
        assert pipelines[0]["zone_state_interval"] == 1000
        assert pipelines[0]["heatmap_interval"] == 0

        connection.subscriptions[1]()
        connection.subscriptions[2]()
        await manager.async_stop()
        await hass.async_block_till_done()


class TestPanelStreamRecovery:
    """The panel's live streams must survive a device flap — issue #336.

    The card got this in #334/#335; the panel was left on the hand-rolled path, so its
    live view, zone editor, calibration wizard and heatmap froze silently when our
    session socket died while HA still believed the device was available.
    """

    async def test_panel_keeps_streaming_after_a_device_flap(self, hass, manager):
        from custom_components.eppgrid.websocket_api._devices import _make_grid_target_on_state
        from custom_components.eppgrid.websocket_api._devices import _start_panel_stream

        mac = "AA:BB:CC:DD:EE:01"
        manager.devices[mac] = ManagedDevice(mac=mac, name="Bedroom", host="192.168.1.50")
        manager._store.devices = {mac: {}}
        manager._is_device_available = MagicMock(return_value=True)

        # The replacement renumbers its entities (an OTA can): a re-arm that reused the
        # dead conn's key map would decode nothing.
        conns = [
            TestOverviewStreamRecovery.FakeDeviceConnection(key=1),
            TestOverviewStreamRecovery.FakeDeviceConnection(key=2),
        ]
        opened: list[Any] = []

        async def _open(_mac):
            conn = conns[len(opened)]
            opened.append(conn)
            return conn

        manager.async_open_session = AsyncMock(side_effect=_open)
        manager.release_session = MagicMock(return_value=None)

        connection = MagicMock()
        connection.subscriptions = {}
        msg = {
            "id": 1,
            "type": "eppgrid/subscribe_grid_targets",
            "mac": mac,
            "availability": True,
        }

        await _start_panel_stream(
            connection,
            msg,
            manager,
            counter_attr="grid_target_subs",
            make_on_state=lambda m, dc: _make_grid_target_on_state(connection, msg["id"], m, dc),
        )

        assert len(opened) == 1
        assert len(conns[0].subscribers) == 1

        # Reset so only the flap's own availability events are captured below — the
        # initial arm already sent its own rising `{"available": True}` (`_arm_stream`
        # notifies True on every successful arm, including the first), which would
        # otherwise satisfy a set-membership check on `events` even if the flap's
        # events came out in the wrong ORDER (see the ordered assertion below).
        connection.send_message.reset_mock()

        # The device flaps: its API connection dies, taking every state subscriber with
        # it (exactly what `_release_references` does).
        conns[0].kill()
        manager._on_session_lost(conns[0])
        # `_settle`, not `async_block_till_done`: the latter would also await the
        # debounced pipeline push's real-time sleep.
        await _settle()

        # Re-armed on the REPLACEMENT connection, callback rebuilt from the factory.
        assert len(opened) == 2
        assert len(conns[1].subscribers) == 1

        # The panel was told the device dropped and came back, in that ORDER. A bug
        # that fires `notify(False)` right after the re-arm's `notify(True)` — frames
        # flow but the panel stays stuck on the offline banner — would still satisfy
        # a set-membership `{"available": True} in events` / `{"available": False} in
        # events` check; asserting the exact ordered sequence catches it.
        events = [
            c.args[0]["event"]
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "available" in c.args[0].get("event", {})
        ]
        assert events == [{"available": False}, {"available": True}]

        # A frame on the new connection reaches the panel.
        connection.send_message.reset_mock()
        conns[1].emit_target("100,200,active")
        target_events = [
            c
            for c in connection.send_message.call_args_list
            if c.args and isinstance(c.args[0], dict) and "targets" in c.args[0].get("event", {})
        ]
        assert target_events, "expected the panel to receive a frame after the flap"

        # The subscriber count survived the flap — taken once at registration, never
        # re-taken. Decrementing it on connection loss would silence the device's
        # pipeline for a still-subscribed client ("target disappears").
        assert manager._target_subs[mac]["grid_target_subs"] == 1

        connection.subscriptions[1]()
        await manager.async_stop()
        await hass.async_block_till_done()


class TestIsEppDevice:
    """Model matching for discovery.

    `_is_epp_device` is the one predicate behind discovery, the entity-create
    pre-filter and the delete-guard. It has to accept every board this
    integration supports and nothing else: too narrow and a Lite running our
    firmware never appears in the panel, too broad and the delete-guard starts
    protecting devices that are not ours.
    """

    @staticmethod
    def _device(*, manufacturer: str, model: str | None) -> MagicMock:
        device = MagicMock()
        device.manufacturer = manufacturer
        device.model = model
        return device

    @pytest.mark.parametrize("model", EPP_MODELS)
    def test_accepts_every_supported_model(self, model: str) -> None:
        from custom_components.eppgrid.device_manager._helpers import _is_epp_device

        assert _is_epp_device(self._device(manufacturer=EPP_MANUFACTURER, model=model)) is True

    def test_rejects_another_model_from_the_same_manufacturer(self) -> None:
        """Everything Smart Technology ships other devices; only ours qualify."""
        from custom_components.eppgrid.device_manager._helpers import _is_epp_device

        device = self._device(manufacturer=EPP_MANUFACTURER, model="Everything Smart Thermostat")
        assert _is_epp_device(device) is False

    def test_rejects_a_matching_model_from_another_manufacturer(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _is_epp_device

        device = self._device(manufacturer="SomeoneElse", model=EPP_MODELS[0])
        assert _is_epp_device(device) is False

    def test_rejects_a_device_with_no_model(self) -> None:
        """ESPHome leaves `model` unset on devices with no project block."""
        from custom_components.eppgrid.device_manager._helpers import _is_epp_device

        assert _is_epp_device(self._device(manufacturer=EPP_MANUFACTURER, model=None)) is False
