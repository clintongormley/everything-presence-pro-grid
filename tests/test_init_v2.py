"""Tests for EPP Grid setup via config entry."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN


@pytest.fixture
async def config_entry(hass: HomeAssistant) -> MockConfigEntry:
    """Create and set up a config entry."""
    entry = MockConfigEntry(domain=DOMAIN, data={}, title="EPP Grid")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


class TestSetupEntry:
    async def test_setup_registers_panel(self, hass: HomeAssistant) -> None:
        """Setting up the integration registers the sidebar panel."""
        with patch(
            "custom_components.eppgrid.panel_custom.async_register_panel",
            new_callable=AsyncMock,
        ) as mock_panel:
            entry = MockConfigEntry(domain=DOMAIN, data={}, title="EPP Grid")
            entry.add_to_hass(hass)
            await hass.config_entries.async_setup(entry.entry_id)
            await hass.async_block_till_done()
            mock_panel.assert_called_once()

    async def test_setup_stores_manager_in_hass_data(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Manager is accessible via hass.data[DOMAIN]."""
        assert DOMAIN in hass.data
        assert hasattr(hass.data[DOMAIN], "devices")

    async def test_unload_entry(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Unloading removes manager from hass.data."""
        assert DOMAIN in hass.data
        await hass.config_entries.async_unload(config_entry.entry_id)
        assert DOMAIN not in hass.data
