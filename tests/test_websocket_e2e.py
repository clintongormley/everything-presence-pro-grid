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

from typing import Any

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from tests.test_websocket_api import setup_integration

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
