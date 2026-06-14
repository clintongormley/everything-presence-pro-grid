"""Persistent storage for EPP Grid device configs and saved configurations."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 3
STORAGE_KEY = DOMAIN


class _MigratingStore(Store[dict[str, Any]]):
    """Store subclass that runs schema migrations on load."""

    async def _async_migrate_func(
        self,
        old_major_version: int,
        old_minor_version: int,
        old_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Migrate stored data forward.

        v1 -> v2: add `device_groups` list (empty default).
        v2 -> v3: stamp `assisted_clear_timeout: 0` into existing device and
            saved-configuration settings so installs that predate the
            sensor-assisted-clear timeout keep clearing immediately. New
            installs (no settings dict) pick up the 5 s default instead.
        """
        if old_major_version < 2:
            old_data.setdefault("device_groups", [])
        if old_major_version < 3:
            for device in old_data.get("devices", {}).values():
                settings = device.get("settings") if isinstance(device, dict) else None
                if isinstance(settings, dict):
                    settings.setdefault("assisted_clear_timeout", 0)
            for config in old_data.get("configurations", {}).values():
                settings = config.get("settings") if isinstance(config, dict) else None
                if isinstance(settings, dict):
                    settings.setdefault("assisted_clear_timeout", 0)
        return old_data


class EPPGridStore:
    """Store for per-device configuration and saved configurations."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = _MigratingStore(hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}
        self.configurations: dict[str, dict[str, Any]] = {}
        self.sidebar_panel: bool = True
        self.show_room_calibration_tutorial: bool = True
        self.device_groups: list[dict[str, Any]] = []

    async def async_load(self) -> None:
        """Load stored data."""
        data = await self._store.async_load()
        if data is None:
            return
        self.devices = data.get("devices", {})
        self.sidebar_panel = data.get("sidebar_panel", True)
        self.show_room_calibration_tutorial = data.get("show_room_calibration_tutorial", True)
        self.configurations = data.get("configurations", {})
        self.device_groups = data.get("device_groups", [])

    async def async_save(self) -> None:
        """Persist current data."""
        await self._store.async_save(
            {
                "devices": self.devices,
                "configurations": self.configurations,
                "sidebar_panel": self.sidebar_panel,
                "show_room_calibration_tutorial": self.show_room_calibration_tutorial,
                "device_groups": self.device_groups,
            }
        )
