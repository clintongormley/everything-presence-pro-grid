"""End-to-end WebSocket API tests over a real websocket connection.

test_websocket_api.py invokes handlers directly with a MagicMock connection,
so command registration, voluptuous schema enforcement at the WS layer, admin
auth, and result/event serialization are never exercised together. These
tests drive the full stack instead: a real websocket client (hass_ws_client,
admin by default) talks to the real websocket_api component, which dispatches
to our registered handlers. Only the DeviceManager boundary is mocked (the
same setup_integration helper the direct-call tests use) — everything between
the wire and the manager is real.
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from tests.test_websocket_api import setup_integration
from tests.test_websocket_ota import make_mock_device_conn

MAC = "AA:BB:CC:DD:EE:FF"

DEVICE: dict[str, Any] = {
    "mac": MAC,
    "name": "EPP",
    "host": "192.168.1.50",
    "available": True,
    "configured": True,
}


async def test_list_devices_round_trip(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """eppgrid/list_devices end-to-end: registration → dispatch → handler →
    send_result serialization back over the wire (admin user)."""
    mock_dm = await setup_integration(hass, config_entry)
    mock_dm.list_devices.return_value = [dict(DEVICE)]
    mock_dm.store.show_room_calibration_tutorial = True

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/list_devices"})
    msg = await client.receive_json()

    assert msg["id"] == 1
    assert msg["type"] == "result"
    assert msg["success"] is True
    assert msg["result"]["devices"] == [DEVICE]
    assert msg["result"]["show_room_calibration_tutorial"] is True


async def test_set_settings_nan_rejected_at_ws_layer(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """A schema violation ("NaN" offset) is rejected by the WS layer's
    voluptuous validation with invalid_format — the handler never runs.

    This is the exact NaN footgun finite_float exists for: JSON can't encode
    NaN, so a broken client sends the string "NaN", vol.Coerce(float) happily
    produces nan, and only the finite check stops it. Direct-call tests can't
    cover this because they bypass websocket_command's schema enforcement.
    """
    mock_dm = await setup_integration(hass, config_entry)

    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "eppgrid/set_settings",
            "mac": MAC,
            "temperature_offset": "NaN",
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
    )
    msg = await client.receive_json()

    assert msg["id"] == 1
    assert msg["type"] == "result"
    assert msg["success"] is False
    assert msg["error"]["code"] == "invalid_format"
    assert "temperature_offset" in msg["error"]["message"]
    # Validation failed before dispatch — the handler must not have run.
    mock_dm.store.async_save.assert_not_awaited()
    mock_dm.request_push.assert_not_called()


async def test_subscribe_device_list_event_then_unsubscribe(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """eppgrid/subscribe_device_list end-to-end: result, then the initial
    event, then a manager-driven change event, then a clean unsubscribe via
    the core unsubscribe_events command (exercising connection.subscriptions
    bookkeeping and event_message serialization)."""
    mock_dm = await setup_integration(hass, config_entry)
    mock_dm.list_devices.return_value = [dict(DEVICE)]
    mock_dm.store.show_room_calibration_tutorial = False

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/subscribe_device_list"})

    result = await client.receive_json()
    assert result["id"] == 1
    assert result["type"] == "result"
    assert result["success"] is True

    # Initial snapshot event arrives immediately after the result.
    event = await client.receive_json()
    assert event["id"] == 1
    assert event["type"] == "event"
    assert event["event"]["devices"] == [DEVICE]
    assert event["event"]["show_room_calibration_tutorial"] is False

    # The handler subscribed at the manager boundary; push a change through
    # the captured callback and it must reach the wire as another event.
    mock_dm.on_device_list_changed.assert_called_once()
    push_update = mock_dm.on_device_list_changed.call_args[0][0]
    changed = [dict(DEVICE, available=False)]
    push_update(changed)

    event2 = await client.receive_json()
    assert event2["id"] == 1
    assert event2["type"] == "event"
    assert event2["event"]["devices"] == changed

    # Clean unsubscribe through the core command: success + the manager-side
    # unsub callable is invoked exactly once.
    await client.send_json({"id": 2, "type": "unsubscribe_events", "subscription": 1})
    unsub_result = await client.receive_json()
    assert unsub_result["id"] == 2
    assert unsub_result["success"] is True
    mock_dm.on_device_list_changed.return_value.assert_called_once()


# ---------------------------------------------------------------------------
# Real-websocket-close hardening for the open-during-close refcount leak.
#
# test_websocket_api.py / test_websocket_ota.py already cover this leak, but
# they SIMULATE the close (`subscriptions.clear()` + manually swapping
# `send_message` to `_connect_closed_error`) — encoding the exact same internal
# assumption the fix (`_connection_is_closed`) relies on. If a future HA renames
# `_connect_closed_error` or reworks the close mechanism, both the fix AND those
# simulated tests would break together, silently.
#
# These tests drive a REAL websocket close: a real authenticated client over the
# real websocket_api component, closed mid-await so HA's actual
# `ActiveConnection.async_handle_close` runs (real `subscriptions.clear()`, real
# `send_message` swap). `_connection_is_closed` is therefore exercised against
# the real HA connection object — if it ever stops matching reality, the refcount
# leaks and these tests fail. That's the defense-in-depth the simulated tests
# can't provide.
#
# Determinism (no sleep races): `async_open_session` is gated on a pair of
# asyncio.Events. The handler sets `entered` immediately before awaiting
# `proceed`; the test waits on `entered` (so it knows the handler is parked
# inside the await), closes the client, lets HA run `async_handle_close`, THEN
# sets `proceed` so the parked handler resumes and hits the
# `_connection_is_closed` branch.
#
# Manager choice: the mocked DeviceManager (the e2e/regression-test mock) with
# `release_session` as a MagicMock. The mock carries no real refcount, so the
# assertion target is "release_session awaited/called exactly once with the
# (mac, conn) the open returned" — identical to the existing regression tests,
# but now triggered by a REAL close. (A real DeviceManager + fake
# DeviceConnection would let us assert refcount==0 directly, but it pulls the
# whole aioesphomeapi session machinery into the e2e harness for no extra
# coverage of the close path itself, which is what's under test here.)
# ---------------------------------------------------------------------------


class _OpenGate:
    """Two-event gate that parks `async_open_session` deterministically.

    The handler enters `async_open_session`, sets `entered`, then awaits
    `proceed`. The test drives the close between those two points.
    """

    conn: Any

    def __init__(self) -> None:
        self.entered = asyncio.Event()
        self.proceed = asyncio.Event()

    async def open(self, mac: str) -> Any:
        self.entered.set()
        await self.proceed.wait()
        return self.conn


async def test_subscribe_device_real_close_during_open_releases_session(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """eppgrid/subscribe_device: a REAL websocket close landing while the
    handler is parked inside `async_open_session` must release the session
    refcount exactly once — driven through HA's real `async_handle_close`,
    so `_connection_is_closed` runs against the genuine connection object.
    """
    mock_dm = await setup_integration(hass, config_entry)

    gate = _OpenGate()
    gate.conn = MagicMock(name="device_conn")
    mock_dm.async_open_session = AsyncMock(side_effect=gate.open)
    mock_dm.release_session = MagicMock(return_value=None)
    mock_dm.set_connection_failed = MagicMock()

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/subscribe_device", "mac": MAC})

    # Wait (deterministically) until the handler is parked inside the gated
    # open — no sleep race.
    async with asyncio.timeout(5):
        await gate.entered.wait()

    # Close the REAL client websocket and let HA run its real
    # `async_handle_close` (clears subscriptions, swaps send_message).
    await client.close()
    await hass.async_block_till_done()

    # Release the gate so the parked handler resumes and hits the
    # `_connection_is_closed` branch.
    gate.proceed.set()
    await hass.async_block_till_done()

    # No leak: the refcount the open took is released exactly once, with the
    # connection the open returned.
    mock_dm.release_session.assert_called_once_with(MAC, gate.conn)


async def test_subscribe_ota_progress_real_close_during_open_releases_session(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """eppgrid/subscribe_ota_progress: same real-close hardening as
    subscribe_device — the OTA watcher's refcount must be released exactly once
    when a real close lands during the gated `async_open_session`.
    """
    mock_dm = await setup_integration(hass, config_entry)

    gate = _OpenGate()
    # A real-enough device connection: `connected=True`, real OtaWatcherState,
    # subscribe_states/add_log_callback stubs — so the handler proceeds past
    # the connectivity gate and the log bump to the `_connection_is_closed`
    # check, exactly as production would.
    gate.conn = make_mock_device_conn()
    mock_dm.async_open_session = AsyncMock(side_effect=gate.open)
    mock_dm.release_session = MagicMock(return_value=None)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/subscribe_ota_progress", "mac": MAC})

    async with asyncio.timeout(5):
        await gate.entered.wait()

    await client.close()
    await hass.async_block_till_done()

    gate.proceed.set()
    await hass.async_block_till_done()

    mock_dm.release_session.assert_called_once_with(MAC, gate.conn)
