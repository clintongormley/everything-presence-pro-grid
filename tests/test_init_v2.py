"""Tests for EPP Grid auto-setup."""
from __future__ import annotations

from unittest.mock import patch, AsyncMock

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.eppgrid.const import DOMAIN


class TestAutoSetup:
    async def test_setup_registers_panel(self, hass: HomeAssistant) -> None:
        """Setting up the integration registers the sidebar panel."""
        with patch(
            "custom_components.eppgrid.panel_custom.async_register_panel",
            new_callable=AsyncMock,
        ) as mock_panel:
            assert await async_setup_component(hass, DOMAIN, {DOMAIN: {}})
            mock_panel.assert_called_once()

    async def test_setup_stores_manager_in_hass_data(self, hass: HomeAssistant) -> None:
        """Manager is accessible via hass.data[DOMAIN]."""
        assert await async_setup_component(hass, DOMAIN, {DOMAIN: {}})
        assert DOMAIN in hass.data
        assert hasattr(hass.data[DOMAIN], "devices")

    async def test_setup_without_config_key(self, hass: HomeAssistant) -> None:
        """Integration can be loaded without explicit config."""
        assert await async_setup_component(hass, DOMAIN, {})
        assert DOMAIN in hass.data
