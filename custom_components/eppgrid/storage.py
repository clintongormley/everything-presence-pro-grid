"""Persistent storage for EPP Grid device configs and templates."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = DOMAIN


class EPPGridStore:
    """Store for per-device configuration and room templates."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store[dict[str, Any]](hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}
        self.templates: dict[str, dict[str, Any]] = {}
        self.sidebar_panel: bool = True

    async def async_load(self) -> None:
        """Load stored data."""
        data = await self._store.async_load()
        if data is None:
            return
        self.devices = data.get("devices", {})
        self.templates = data.get("templates", {})
        self.sidebar_panel = data.get("sidebar_panel", True)

    async def async_save(self) -> None:
        """Persist current data."""
        await self._store.async_save({
            "devices": self.devices,
            "templates": self.templates,
            "sidebar_panel": self.sidebar_panel,
        })

    def get_device(self, mac: str) -> dict[str, Any] | None:
        """Get config for a device by MAC, or None."""
        return self.devices.get(mac)
