"""Everything Presence Pro Grid — calibration UI and device management."""

from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .device_groups._registry import zone_name_from_store
from .device_manager import DeviceManager
from .firmware_proxy import FirmwareProxyView
from .storage import EPPGridStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

# Key in hass.data marking that the static path has been registered with the
# HTTP component. Static path registration can only happen once per HA process
# and will error on duplicate registration, so we guard it with a flag.
_STATIC_HASH_PATHS_KEY = f"{DOMAIN}_static_hash_paths"
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

    from .device_groups import DeviceGroupManager

    device_groups_manager = DeviceGroupManager(hass, store)
    # Attach as a sibling on the existing DeviceManager so callers can reach it
    # via `hass.data[DOMAIN].device_groups`. Created here (before the manager is
    # published) but started inside the try below so a failure unwinds cleanly.
    manager.device_groups = device_groups_manager  # type: ignore[attr-defined]
    device_groups_manager.set_callbacks(
        device_name_fn=lambda mac: (
            getattr(manager.devices.get(mac), "name", None) or store.devices.get(mac, {}).get("name") or mac
        ),
        zone_name_fn=lambda mac, i: zone_name_from_store(store, mac, i),
    )

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
        await device_groups_manager.async_start()
        await hass.config_entries.async_forward_entry_setups(entry, [Platform.BINARY_SENSOR])

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
        # If the binary_sensor platform was already forwarded before the failing
        # step, unload it so a retry doesn't leave orphaned helper entities
        # bound to a now-stopped manager. Safe (no-op) if it never loaded.
        try:
            await hass.config_entries.async_unload_platforms(entry, [Platform.BINARY_SENSOR])
        except Exception:
            _LOGGER.exception("async_unload_platforms failed during setup unwind")
        try:
            await async_apply_panel_visibility(hass, False)
        except Exception:
            _LOGGER.exception("async_apply_panel_visibility(False) failed during setup unwind")
        # A raising cleanup must not mask the original setup error — it would
        # e.g. turn ConfigEntryNotReady (retry later) into a permanent
        # SETUP_ERROR.
        try:
            await device_groups_manager.async_stop()
        except Exception:
            _LOGGER.exception("device_groups_manager.async_stop failed during setup unwind")
        try:
            await manager.async_stop()
        except Exception:
            _LOGGER.exception("manager.async_stop failed during setup unwind")
        raise

    # Options changes are applied directly by the options flow (store write +
    # panel registration/removal) — deliberately no update listener: a reload
    # here would tear down every ESPHome connection just to flip a toggle.

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # If the platform won't unload, report failure and keep the manager/panel in
    # place — HA then treats the entry as still loaded rather than orphaning the
    # device-group entities.
    unload_ok = await hass.config_entries.async_unload_platforms(entry, [Platform.BINARY_SENSOR])
    if not unload_ok:
        return False

    manager = hass.data.pop(DOMAIN, None)
    if manager is not None:
        if hasattr(manager, "device_groups"):
            await manager.device_groups.async_stop()
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
    """Register a content-hashed static path for the bundle and return its URL.

    The bundle's content hash is embedded in the URL PATH
    (`/eppgrid_static/<hash>/eppgrid-panel.js`) rather than a `?v=` query.
    The Home Assistant companion app's service worker caches by URL and ignores
    query strings, so a query cache-bust was served stale across versions; a
    hashed path makes each bundle a genuinely distinct resource, forcing a fresh
    fetch (an integration reload re-registers the panel at the new path).

    Each hash's prefix is registered once per HA process (old hashes' prefixes
    linger harmlessly until restart). The content at a hashed path never
    changes, so it is served with immutable cache headers. No base
    `/eppgrid_static` mapping is registered, so the hashed prefixes can't
    collide with it in the aiohttp router.
    """
    js_path = os.path.join(FRONTEND_DIR, "eppgrid-panel.js")
    try:
        js_hash = await hass.async_add_executor_job(_hash_file, js_path)
    except OSError:
        js_hash = "0"

    registered: set[str] = hass.data.setdefault(_STATIC_HASH_PATHS_KEY, set())
    if js_hash not in registered:
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    url_path=f"/{DOMAIN}_static/{js_hash}",
                    path=FRONTEND_DIR,
                    cache_headers=True,
                )
            ]
        )
        registered.add(js_hash)

    return f"/{DOMAIN}_static/{js_hash}/eppgrid-panel.js"


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
