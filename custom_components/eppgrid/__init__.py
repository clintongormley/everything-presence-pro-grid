"""Everything Presence Grid — calibration UI and device management."""

from __future__ import annotations

import hashlib
import logging
import os

import homeassistant.components.frontend as _ha_frontend
import voluptuous as vol
from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_AREA_ID
from homeassistant.const import ATTR_DEVICE_ID
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.const import ATTR_LABEL_ID
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.core import ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.service import async_register_admin_service

from .const import CARD_BUNDLE_HASH_KEY
from .const import CARD_RESOURCE_ID_KEY
from .const import CURRENT_BUNDLE_HASH_KEY
from .const import DOMAIN
from .device_groups._registry import zone_name_from_store
from .device_manager import DeviceManager
from .firmware_cache import async_register_firmware_cache
from .firmware_proxy import FirmwareProxyView
from .storage import EPPGridStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
CARD_JS = "eppgrid-card.js"

SERVICE_CLEAR_HEATMAP = "clear_heatmap"

CLEAR_HEATMAP_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_DEVICE_ID): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_AREA_ID): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_LABEL_ID): vol.All(cv.ensure_list, [cv.string]),
    }
)


def _resolve_target_device_ids(hass: HomeAssistant, call: ServiceCall) -> set[str]:
    """Expand a service-call target (device/entity/area/label) to device_ids."""
    dev_reg = dr.async_get(hass)
    ent_reg = er.async_get(hass)
    device_ids: set[str] = set()

    device_ids.update(call.data.get(ATTR_DEVICE_ID, []))

    for entity_id in call.data.get(ATTR_ENTITY_ID, []):
        ent = ent_reg.async_get(entity_id)
        if ent and ent.device_id:
            device_ids.add(ent.device_id)

    for area_id in call.data.get(ATTR_AREA_ID, []):
        for dev in dr.async_entries_for_area(dev_reg, area_id):
            device_ids.add(dev.id)
        for ent in er.async_entries_for_area(ent_reg, area_id):
            if ent.device_id:
                device_ids.add(ent.device_id)

    for label_id in call.data.get(ATTR_LABEL_ID, []):
        for dev in dr.async_entries_for_label(dev_reg, label_id):
            device_ids.add(dev.id)
        for ent in er.async_entries_for_label(ent_reg, label_id):
            if ent.device_id:
                device_ids.add(ent.device_id)

    return device_ids


def _has_target(call: ServiceCall) -> bool:
    # Key PRESENCE, not truthiness: an explicitly-supplied-but-empty target
    # (e.g. {"device_id": []} from a templated automation) must still count
    # as "targeted" so it resolves to zero devices and clears nothing — not
    # fall through to the no-target "clear everything" branch.
    return any(k in call.data for k in (ATTR_DEVICE_ID, ATTR_ENTITY_ID, ATTR_AREA_ID, ATTR_LABEL_ID))


def _async_register_services(hass: HomeAssistant) -> None:
    """Register the eppgrid.clear_heatmap admin action (idempotent)."""
    if hass.services.has_service(DOMAIN, SERVICE_CLEAR_HEATMAP):
        return

    async def _handle_clear_heatmap(call: ServiceCall) -> None:
        manager = hass.data.get(DOMAIN)
        if manager is None:
            raise HomeAssistantError("Integration not loaded")

        if _has_target(call):
            device_ids = _resolve_target_device_ids(hass, call)
            targets: list[tuple[str, str]] = []  # (device_id, mac)
            for device_id in device_ids:
                mac = manager.mac_for_device_id(device_id)
                if mac is not None:  # ignore non-eppgrid devices
                    targets.append((device_id, mac))
            failed: list[str] = []
            for device_id, mac in targets:
                session = manager.get_session(mac)
                if session is None:
                    failed.append(device_id)
                    continue
                try:
                    await session.async_clear_heatmap()
                except Exception:
                    _LOGGER.exception("clear_heatmap failed for %s", mac)
                    failed.append(device_id)
            if failed:
                raise HomeAssistantError(f"Could not clear the heatmap for: {', '.join(sorted(failed))}")
        else:
            # No target → clear all managed devices, skipping unreachable ones.
            for mac in list(manager.devices.keys()):
                session = manager.get_session(mac)
                if session is None:
                    _LOGGER.debug("clear_heatmap: skipping offline device %s", mac)
                    continue
                try:
                    await session.async_clear_heatmap()
                except Exception:
                    _LOGGER.debug("clear_heatmap: skipping %s (execute failed)", mac, exc_info=True)

    async_register_admin_service(
        hass, DOMAIN, SERVICE_CLEAR_HEATMAP, _handle_clear_heatmap, schema=CLEAR_HEATMAP_SCHEMA
    )


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
    """Set up Everything Presence Grid from a config entry."""
    store = EPPGridStore(hass)
    await store.async_load()

    manager = DeviceManager(hass, store)

    # Register the static path unconditionally so Lovelace dashboards can
    # fetch the bundled JS module even when the sidebar panel is disabled.
    await _register_frontend_resources(hass)
    await _register_card_resource(hass)

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
    await async_register_firmware_cache(hass)

    try:
        await manager.async_start()
        hass.data[DOMAIN] = manager
        _async_register_services(hass)
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

    if hass.services.has_service(DOMAIN, SERVICE_CLEAR_HEATMAP):
        hass.services.async_remove(DOMAIN, SERVICE_CLEAR_HEATMAP)

    await async_apply_panel_visibility(hass, False)
    await _unregister_card_resource(hass)

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


async def _ensure_static_hash_path(hass: HomeAssistant, js_filename: str) -> str:
    """Hash a frontend bundle, register its content-hashed static path once per process, and return the served URL."""
    js_path = os.path.join(FRONTEND_DIR, js_filename)
    try:
        js_hash = await hass.async_add_executor_job(_hash_file, js_path)
    except OSError:
        js_hash = "0"
    registered: set[str] = hass.data.setdefault(_STATIC_HASH_PATHS_KEY, set())
    if js_hash not in registered:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path=f"/{DOMAIN}_static/{js_hash}", path=FRONTEND_DIR, cache_headers=True)]
        )
        registered.add(js_hash)
    return f"/{DOMAIN}_static/{js_hash}/{js_filename}"


async def _register_frontend_resources(hass: HomeAssistant) -> str:
    """Register a content-hashed static path for the bundle and return its URL.

    The bundle's content hash is embedded in the URL PATH
    (`/eppgrid_static/<hash>/eppgrid-panel.js`) rather than a `?v=` query.
    The Home Assistant companion app's service worker caches by URL and ignores
    query strings, so a query cache-bust was served stale across versions; a
    hashed path makes each bundle a genuinely distinct resource, forcing a fresh
    fetch (an integration reload re-registers the panel at the new path).

    Each hash's prefix is registered once per HA process (old hashes' prefixes
    linger harmlessly until restart). The hash is the bundle's content hash and
    the panel is always re-registered at the current hash, so a client is only
    ever pointed at a URL whose content is fixed for that hash — hence immutable
    cache headers. (All hash prefixes map to the same directory, so an old hash
    path would in fact serve whatever bundle is on disk now; that's harmless
    because the panel never points a client back at a superseded hash, and
    production deploys via an HA restart that clears the lingering prefixes.) No
    base `/eppgrid_static` mapping is registered, so the hashed prefixes can't
    collide with it in the aiohttp router.
    """
    module_url = await _ensure_static_hash_path(hass, "eppgrid-panel.js")

    # Stash the current hash so the eppgrid/frontend_version WS command can hand
    # it back to an open panel, which reloads itself when its own hash differs.
    hass.data[CURRENT_BUNDLE_HASH_KEY] = module_url.split("/")[2]

    return module_url


async def _register_card_resource(hass: HomeAssistant) -> None:
    """Serve the dashboard card bundle and register it as a Lovelace module resource.

    Cards must load as a Lovelace resource (not add_extra_js_url): add_extra_js_url
    injects the module before HA installs the scoped-custom-element-registry
    polyfill, which then swaps the registry and drops the element. Resources are
    loaded during Lovelace init (post-swap). YAML-mode dashboards have no
    mutable resource store, so fall back to add_extra_js_url there.
    """
    card_url = await _ensure_static_hash_path(hass, CARD_JS)

    # Stash the card bundle hash so the eppgrid/frontend_version WS command can
    # hand it back to an open dashboard card, which reloads itself when its own
    # hash differs (mirrors the panel; the card is a separate bundle/hash).
    hass.data[CARD_BUNDLE_HASH_KEY] = card_url.split("/")[2]

    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is not None and hasattr(resources, "async_create_item"):
        if not getattr(resources, "loaded", False):
            await resources.async_load()
            resources.loaded = True
        for item in resources.async_items():
            url = item.get("url", "")
            if url == card_url:
                hass.data[CARD_RESOURCE_ID_KEY] = item.get("id")
                return
            if f"/{DOMAIN}_static/" in url and url.split("?")[0].endswith(f"/{CARD_JS}"):
                await resources.async_update_item(item["id"], {"url": card_url})
                hass.data[CARD_RESOURCE_ID_KEY] = item["id"]
                return
        created = await resources.async_create_item({"res_type": "module", "url": card_url})
        if isinstance(created, dict):
            hass.data[CARD_RESOURCE_ID_KEY] = created.get("id")
    else:
        # YAML-mode dashboards: no mutable resource store.
        _ha_frontend.add_extra_js_url(hass, card_url)


async def _unregister_card_resource(hass: HomeAssistant) -> None:
    """Remove the Lovelace card resource registered at setup, if any."""
    resource_id = hass.data.pop(CARD_RESOURCE_ID_KEY, None)
    if resource_id is None:
        return
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is not None and hasattr(resources, "async_delete_item"):
        try:
            await resources.async_delete_item(resource_id)
        except Exception:
            _LOGGER.exception("Failed to remove eppgrid card Lovelace resource")


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
        sidebar_title="Everything Presence Grid",
        sidebar_icon="mdi:radar",
        require_admin=True,
        config={},
    )
