"""Everything Presence Pro Grid — calibration UI and device management."""

from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .device_manager import DeviceManager
from .firmware_proxy import FirmwareProxyView
from .storage import EPPGridStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

# Key in hass.data marking that the static path has been registered with the
# HTTP component. Static path registration can only happen once per HA process
# and will error on duplicate registration, so we guard it with a flag.
_STATIC_PATH_REGISTERED_KEY = f"{DOMAIN}_static_path_registered"
# Key tracking whether the sidebar panel was registered, so unload can remove
# it without warning when the user had it disabled.
_PANEL_REGISTERED_KEY = f"{DOMAIN}_panel_registered"
# Key marking that the firmware proxy view has been registered.
# HomeAssistantView.register appends a fresh route on every call (no dedupe),
# so an unguarded call would stack duplicate /api/eppgrid/firmware routes on
# each config-entry reload. Like the static path, register once per process.
_PROXY_VIEW_REGISTERED_KEY = f"{DOMAIN}_proxy_view_registered"


def _hash_file(path: str) -> str:
    """Return MD5 hash prefix of a file for cache-busting."""
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Everything Presence Pro Grid from a config entry."""
    store = EPPGridStore(hass)
    await store.async_load()

    manager = DeviceManager(hass, store)

    # Register the static path unconditionally so Lovelace dashboards can
    # fetch the bundled JS module even when the sidebar panel is disabled.
    await _register_frontend_resources(hass)

    # WS command registration is idempotent; the handlers look the manager up
    # via hass.data[DOMAIN] and tolerate it being absent, so registering them
    # before the manager is published is safe.
    async_register_websocket_commands(hass, manager)

    if not hass.data.get(_PROXY_VIEW_REGISTERED_KEY):
        hass.http.register_view(FirmwareProxyView())
        hass.data[_PROXY_VIEW_REGISTERED_KEY] = True

    try:
        await manager.async_start()
        hass.data[DOMAIN] = manager

        # Register the panel LAST. HA never calls async_unload_entry for a
        # failed setup, so registering it before a fallible step would leave
        # a stale panel behind and every retry would die on panel_custom's
        # "Overwriting panel" ValueError until restart.
        await async_apply_panel_visibility(hass, store.sidebar_panel)
    except Exception:
        # Unwind so a retry starts from a clean slate: don't leak a
        # half-started manager (or its listeners) and don't leave a panel
        # registered that the retry can't overwrite.
        hass.data.pop(DOMAIN, None)
        await async_apply_panel_visibility(hass, False)
        await manager.async_stop()
        raise

    # Options changes are applied directly by the options flow (store write +
    # panel registration/removal) — deliberately no update listener: a reload
    # here would tear down every ESPHome connection just to flip a toggle.

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    manager = hass.data.pop(DOMAIN, None)
    if manager is not None:
        await manager.async_stop()

    await async_apply_panel_visibility(hass, False)

    return True


async def async_apply_panel_visibility(hass: HomeAssistant, visible: bool) -> None:
    """Register or remove the sidebar panel so it matches ``visible``.

    Idempotent: registering is skipped when the panel is already up, and
    removal is skipped when it never was. Used by setup/unload and called
    directly by the options flow so a sidebar toggle doesn't need a full
    config-entry reload.
    """
    if visible:
        if hass.data.get(_PANEL_REGISTERED_KEY):
            return
        # Re-deriving the module URL is cheap: the static path registration
        # inside is guarded once-per-process; only the cache-bust hash is
        # recomputed.
        module_url = await _register_frontend_resources(hass)
        await _register_panel(hass, module_url)
        hass.data[_PANEL_REGISTERED_KEY] = True
    elif hass.data.pop(_PANEL_REGISTERED_KEY, False):
        async_remove_panel(hass, DOMAIN, warn_if_unknown=False)


async def _register_frontend_resources(hass: HomeAssistant) -> str:
    """Register the static path serving the bundled JS module.

    Returns the versioned module URL for `panel_custom.async_register_panel` to
    load on panel access. The static path is registered only once per HA
    process. The hash is recomputed on every call so reloads pick up new
    bundles via the cache-bust query string.
    """
    if not hass.data.get(_STATIC_PATH_REGISTERED_KEY):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    url_path=f"/{DOMAIN}_static",
                    path=FRONTEND_DIR,
                    cache_headers=False,
                )
            ]
        )
        hass.data[_STATIC_PATH_REGISTERED_KEY] = True

    js_path = os.path.join(FRONTEND_DIR, "eppgrid-panel.js")
    try:
        js_hash = await hass.async_add_executor_job(_hash_file, js_path)
    except OSError:
        js_hash = "0"

    return f"/{DOMAIN}_static/eppgrid-panel.js?v={js_hash}"


async def _register_panel(hass: HomeAssistant, module_url: str) -> None:
    """Register the frontend sidebar panel.

    The panel is admin-only: HA hides the sidebar entry for non-admin users
    and rejects direct URL access. Mutating WS commands are already gated by
    @websocket_api.require_admin (PR #174); locking the panel down keeps the
    UX consistent — non-admins don't see a panel they can't usefully use.
    """
    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="eppgrid-panel",
        module_url=module_url,
        sidebar_title="Everything Presence Pro Grid",
        sidebar_icon="mdi:radar",
        require_admin=True,
        config={},
    )
