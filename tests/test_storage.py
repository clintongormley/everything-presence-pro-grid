"""Tests for EPP Grid storage layer."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a store instance."""
    return EPPGridStore(hass)


class TestEPPGridStore:
    async def test_load_empty(self, store: EPPGridStore) -> None:
        """First load returns empty devices and templates."""
        await store.async_load()
        assert store.devices == {}
        assert store.templates == {}
        assert store.sidebar_panel is True

    async def test_save_and_load_device(self, store: EPPGridStore) -> None:
        """Device config round-trips through save/load."""
        await store.async_load()
        config = {
            "name": "Lounge",
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
        }
        store.devices["AA:BB:CC:DD:EE:FF"] = config
        await store.async_save()

        store2 = EPPGridStore(store._hass)
        await store2.async_load()
        assert store2.devices["AA:BB:CC:DD:EE:FF"]["name"] == "Lounge"

    async def test_save_and_load_template(self, store: EPPGridStore) -> None:
        """Template config round-trips through save/load."""
        await store.async_load()
        store.templates["bedroom"] = {"furniture": [{"type": "bed"}]}
        await store.async_save()

        store2 = EPPGridStore(store._hass)
        await store2.async_load()
        assert store2.templates["bedroom"]["furniture"][0]["type"] == "bed"

    async def test_get_device_returns_none_for_unknown(self, store: EPPGridStore) -> None:
        """get_device returns None for unknown MAC."""
        await store.async_load()
        assert store.get_device("XX:XX:XX:XX:XX:XX") is None

    async def test_sidebar_panel_default_true(self, store: EPPGridStore) -> None:
        """sidebar_panel defaults to True."""
        await store.async_load()
        assert store.sidebar_panel is True

    async def test_sidebar_panel_persists(self, store: EPPGridStore) -> None:
        """sidebar_panel setting round-trips."""
        await store.async_load()
        store.sidebar_panel = False
        await store.async_save()

        store2 = EPPGridStore(store._hass)
        await store2.async_load()
        assert store2.sidebar_panel is False
