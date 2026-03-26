"""Everything Presence Pro Grid — calibration UI and device management."""
from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .device_manager import DeviceManager
from .storage import EPPGridStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

DEV_MODE = bool(os.environ.get("EPPGRID_DEV_MODE"))

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")


def _hash_file(path: str) -> str:
    """Return MD5 hash prefix of a file for cache-busting."""
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up Everything Presence Pro Grid."""
    store = EPPGridStore(hass)
    await store.async_load()

    manager = DeviceManager(hass, store)

    # Register sidebar panel (unless disabled)
    if store.sidebar_panel:
        await _register_panel(hass)

    hass.data[DOMAIN] = manager
    async_register_websocket_commands(hass, manager)
    await manager.async_start()

    if DEV_MODE:
        _LOGGER.info("Dev mode enabled — loading Python zone engine and recording tools")
        from .coordinator import EPPGridCoordinator  # noqa: F401
        # Dev-mode websocket commands can be registered here in future

    return True


async def _register_panel(hass: HomeAssistant) -> None:
    """Register the frontend sidebar panel."""
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path=f"/{DOMAIN}_static",
            path=FRONTEND_DIR,
            cache_headers=False,
        )
    ])
    js_path = os.path.join(FRONTEND_DIR, "eppgrid-panel.js")
    try:
        js_hash = await hass.async_add_executor_job(_hash_file, js_path)
    except OSError:
        js_hash = "0"
    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="eppgrid-panel",
        module_url=f"/{DOMAIN}_static/eppgrid-panel.js?v={js_hash}",
        sidebar_title="Everything Presence Pro Grid",
        sidebar_icon="mdi:radar",
        require_admin=False,
        config={},
    )
