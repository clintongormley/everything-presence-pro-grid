"""Tests for EPP Grid websocket API (v2 — MAC-keyed)."""
from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.device_manager import ManagedDevice


@pytest.fixture(autouse=True)
def clear_registered(monkeypatch):
    """Clear the _REGISTERED set before each test to prevent double-registration errors."""
    import custom_components.eppgrid.websocket_api as ws
    ws._REGISTERED.clear()
    yield


@pytest.fixture
async def setup_integration(hass: HomeAssistant) -> None:
    """Set up the integration via config entry."""
    entry = MockConfigEntry(domain=DOMAIN, data={}, title="EPP Grid")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


class TestListDevices:
    async def test_list_devices_empty(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns empty list when no devices discovered."""
        client = await hass_ws_client(hass)
        await client.send_json({"id": 1, "type": "eppgrid/list_devices"})
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["devices"] == []

    async def test_list_devices_with_device(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns discovered devices."""
        manager = hass.data[DOMAIN]
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="Lounge EPP", host="192.168.1.100"
        )
        client = await hass_ws_client(hass)
        await client.send_json({"id": 1, "type": "eppgrid/list_devices"})
        msg = await client.receive_json()
        assert msg["success"] is True
        assert len(msg["result"]["devices"]) == 1
        assert msg["result"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"


class TestGetConfig:
    async def test_get_config_unknown_device(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns empty config for unconfigured device."""
        client = await hass_ws_client(hass)
        await client.send_json({
            "id": 1,
            "type": "eppgrid/get_config",
            "mac": "AA:BB:CC:DD:EE:FF",
        })
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["config"] is None

    async def test_get_config_known_device(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns stored config for known device."""
        manager = hass.data[DOMAIN]
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"name": "Lounge"}
        client = await hass_ws_client(hass)
        await client.send_json({
            "id": 1,
            "type": "eppgrid/get_config",
            "mac": "AA:BB:CC:DD:EE:FF",
        })
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["config"]["name"] == "Lounge"
