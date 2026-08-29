"""End-to-end tests for the admin, MAC-based eppgrid/clear_heatmap_device WS
command.

Modeled on test_ws_clear_heatmap.py: a real websocket client (hass_ws_client)
talks to the real websocket_api component, which dispatches to our registered
handler — so command registration, schema enforcement, and admin auth are
exercised together, not just the handler body in isolation.

This is the admin panel's counterpart to the non-admin, device_id-based
eppgrid/clear_heatmap (which lives in the overview/card family). The panel
works in terms of MAC addresses, hence a MAC-based variant here, guarded by
@require_admin like every other panel-facing command in _devices.py.
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from tests.test_websocket_api import register_managed_device
from tests.test_websocket_api import setup_integration

MAC = "AA:BB:CC:DD:EE:FF"


async def test_clear_heatmap_device_success(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """Clears the heatmap on the session for a known mac, acks."""
    mock_dm = await setup_integration(hass, config_entry)
    register_managed_device(mock_dm, MAC)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock()
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap_device", "mac": MAC})
    msg = await client.receive_json()

    assert msg["id"] == 1
    assert msg["type"] == "result"
    assert msg["success"] is True
    session.async_clear_heatmap.assert_awaited_once_with()
    mock_dm.get_session.assert_called_once_with(MAC)


async def test_clear_heatmap_device_unknown_device(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An unregistered mac yields device_not_found."""
    await setup_integration(hass, config_entry)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap_device", "mac": MAC})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "device_not_found"


async def test_clear_heatmap_device_offline(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """A known device with no active session yields no_session."""
    mock_dm = await setup_integration(hass, config_entry)
    register_managed_device(mock_dm, MAC)
    mock_dm.get_session = MagicMock(return_value=None)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap_device", "mac": MAC})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "no_session"


async def test_clear_heatmap_device_execute_error(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An exception raised while clearing the heatmap yields clear_heatmap_failed."""
    mock_dm = await setup_integration(hass, config_entry)
    register_managed_device(mock_dm, MAC)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock(side_effect=RuntimeError("boom"))
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap_device", "mac": MAC})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "clear_heatmap_failed"


async def test_clear_heatmap_device_requires_admin(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """The command carries @require_admin — a non-admin connection is rejected.

    Unlike eppgrid/clear_heatmap (the card-facing, non-admin overview
    command), this MAC-based variant is admin-only like every other
    panel-facing command in _devices.py.
    """
    mock_dm = await setup_integration(hass, config_entry)
    register_managed_device(mock_dm, MAC)
    session = MagicMock()
    session.async_clear_heatmap = AsyncMock()
    mock_dm.get_session = MagicMock(return_value=session)

    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json({"id": 1, "type": "eppgrid/clear_heatmap_device", "mac": MAC})
    msg = await client.receive_json()

    assert msg["success"] is False
    assert msg["error"]["code"] == "unauthorized"
