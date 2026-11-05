"""End-to-end tests for the non-admin eppgrid/clear_heatmap WS command.

Modeled on test_websocket_e2e.py: a real websocket client (hass_ws_client)
talks to the real websocket_api component, which dispatches to our registered
handler — so command registration, schema enforcement, and (lack of) admin
auth are exercised together, not just the handler body in isolation.
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock

from homeassistant.core import HomeAssistant

from tests.ha_harness import MockConfigEntry
from tests.ha_harness import WebSocketGenerator
from tests.test_websocket_api import setup_integration

MAC = "AA:BB:CC:DD:EE:FF"


async def test_clear_heatmap_success(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """Resolves device_id -> mac, clears the heatmap on the session, acks."""
    mock_dm = await setup_integration(hass, config_entry)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock()
    mock_dm.mac_for_device_id = MagicMock(return_value=MAC)
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap", "device_id": "dev1"})
    msg = await client.receive_json()

    assert msg["id"] == 1
    assert msg["type"] == "result"
    assert msg["success"] is True
    session.async_clear_heatmap.assert_awaited_once_with()
    mock_dm.mac_for_device_id.assert_called_once_with("dev1")
    mock_dm.get_session.assert_called_once_with(MAC)


async def test_clear_heatmap_unknown_device(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An unresolvable device_id yields device_not_found."""
    mock_dm = await setup_integration(hass, config_entry)
    mock_dm.mac_for_device_id = MagicMock(return_value=None)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap", "device_id": "nope"})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "device_not_found"


async def test_clear_heatmap_offline(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """A known device with no active session yields no_session."""
    mock_dm = await setup_integration(hass, config_entry)
    mock_dm.mac_for_device_id = MagicMock(return_value=MAC)
    mock_dm.get_session = MagicMock(return_value=None)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap", "device_id": "dev1"})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "no_session"


async def test_clear_heatmap_execute_error(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An exception raised while clearing the heatmap yields clear_heatmap_failed."""
    mock_dm = await setup_integration(hass, config_entry)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock(side_effect=RuntimeError("boom"))
    mock_dm.mac_for_device_id = MagicMock(return_value=MAC)
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap", "device_id": "dev1"})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "clear_heatmap_failed"


async def test_clear_heatmap_offline_device_times_out(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An unreachable device that never confirms the clear (timeout) also yields
    clear_heatmap_failed -- not a false success. This is the crux of the fix: the
    action is now response-confirmed, so a device that's offline/unresponsive
    raises instead of silently 'succeeding' as it did when the action was
    fire-and-forget.
    """
    mock_dm = await setup_integration(hass, config_entry)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock(side_effect=TimeoutError())
    mock_dm.mac_for_device_id = MagicMock(return_value=MAC)
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap", "device_id": "dev1"})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "clear_heatmap_failed"


async def test_clear_heatmap_reachable_by_non_admin_user(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """The command carries no @require_admin — a non-admin connection succeeds.

    This is the crux of the task: eppgrid/clear_heatmap lives in the
    overview (card-facing, non-admin) command family, unlike every
    config-mutating command elsewhere in the integration.
    hass_ws_client only takes an access token (not a user dict) to pick
    the authenticated user; hass_read_only_access_token (from
    the HA test harness) is the read-only, non-admin one.
    """
    mock_dm = await setup_integration(hass, config_entry)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock()
    mock_dm.mac_for_device_id = MagicMock(return_value=MAC)
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap", "device_id": "dev1"})
    msg = await client.receive_json()

    assert msg["success"] is True
    session.async_clear_heatmap.assert_awaited_once_with()
