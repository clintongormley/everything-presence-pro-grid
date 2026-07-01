"""Device, configuration, session, and settings websocket commands."""

from __future__ import annotations

import base64
import binascii
import json
import math
from collections.abc import Callable
from typing import Any
from typing import Literal

import voluptuous as vol
from aioesphomeapi import BinarySensorState
from aioesphomeapi import SensorState
from aioesphomeapi import TextSensorState
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from ..const import DOMAIN
from ..const import GRID_COLS
from ..const import GRID_ROWS
from ..const import STATIC_ON_DELAY_MAX
from ..const import empty_zone_slots
from . import _LOGGER
from . import CONFIGURATION_DICT_SCHEMA
from . import ENTITY_ID_SCHEMA
from . import FINITE_FLOAT_SCHEMA
from . import FURNITURE_SCHEMA
from . import MAC_SCHEMA
from . import NAME_SCHEMA
from . import _connection_is_closed
from . import _get_manager
from . import _require_known_device
from . import _require_manager
from . import _send_no_session
from . import _validate_zone_slots
from . import finite_float

# Dense length of the firmware `Heatmap` text-sensor payload once decoded —
# one byte per grid cell, row-major, normalized 0..255.
_HEATMAP_CELL_COUNT = GRID_COLS * GRID_ROWS


def _parse_position_csv(raw: str) -> tuple[float, float, str | None] | None:
    """Parse a `x,y` or `x,y,status` text-sensor value from the firmware.

    Returns (x, y, status) or None if the string is malformed (too few
    fields, non-numeric coordinates, etc.). The status field is None when
    the firmware emits only two fields (raw target sensor) and a string
    like "active"/"pending" when it emits three (grid target sensor).
    """
    parts = raw.split(",")
    if len(parts) < 2:
        return None
    try:
        x = float(parts[0])
        y = float(parts[1])
    except (ValueError, IndexError):
        return None
    status = parts[2] if len(parts) >= 3 else None
    return x, y, status


# -- subscribe_device_list --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/subscribe_device_list"})
@websocket_api.require_admin
@callback
@_require_manager
def websocket_subscribe_device_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Subscribe to device list changes. Sends initial list immediately."""

    @callback
    def _send_update(devices: list[dict[str, Any]] | None = None) -> None:
        # Change events hand us the payload the manager computed ONCE for
        # all subscribers; only the on-subscribe initial send (no payload)
        # fetches its own snapshot.
        if devices is None:
            devices = manager.list_devices()
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "devices": devices,
                    "show_room_calibration_tutorial": manager.store.show_room_calibration_tutorial,
                },
            )
        )

    unsub = manager.on_device_list_changed(_send_update)

    connection.send_result(msg["id"])
    _send_update()

    connection.subscriptions[msg["id"]] = unsub


# -- list_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_devices"})
@websocket_api.require_admin
@callback
@_require_manager
def websocket_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """List discovered EPP devices."""
    connection.send_result(
        msg["id"],
        {
            "devices": manager.list_devices(),
            "show_room_calibration_tutorial": manager.store.show_room_calibration_tutorial,
        },
    )


# -- set_show_room_calibration_tutorial --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_show_room_calibration_tutorial",
        vol.Required("value"): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_set_show_room_calibration_tutorial(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Persist the global show_room_calibration_tutorial flag."""
    new_value = msg["value"]
    if manager.store.show_room_calibration_tutorial == new_value:
        connection.send_result(msg["id"])
        return
    manager.store.show_room_calibration_tutorial = new_value
    await manager.store.async_save()
    manager.fire_device_list_changed()
    connection.send_result(msg["id"])


# -- configure_device --


def _regenerate_entity_ids(hass: HomeAssistant, device_id: str, old_name: str | None, new_name: str) -> None:
    """Rewrite a device's entity_ids from its old name slug to the new one.

    Mirrors HA's native "rename device → update entity IDs?": for each entity on
    the device whose id is built from the old device-name slug, swap that prefix
    to the new name's slug, deduping collisions. Entities the user customized
    (id not derived from the old slug) are left untouched. Caller gates this to
    first-naming only, so it runs only while the device is greenfield.
    """
    from homeassistant.util import slugify

    old_slug = slugify(old_name or "")
    new_slug = slugify(new_name)
    if not old_slug or not new_slug or old_slug == new_slug:
        return

    ent_reg = er.async_get(hass)
    for entry in er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True):
        domain, _, object_id = entry.entity_id.partition(".")
        if object_id != old_slug and not object_id.startswith(f"{old_slug}_"):
            continue
        candidate = f"{domain}.{new_slug}{object_id[len(old_slug) :]}"
        if candidate == entry.entity_id:
            continue
        unique = candidate
        suffix = 2
        while ent_reg.async_get(unique) is not None:
            unique = f"{candidate}_{suffix}"
            suffix += 1
        ent_reg.async_update_entity(entry.entity_id, new_entity_id=unique)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/configure_device",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Optional("name"): vol.Any(NAME_SCHEMA, None),
        vol.Optional("area_id"): vol.Any(str, None),
        vol.Optional("recreate_entity_ids", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_configure_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Set a device's name + area in the HA registry; optionally regen entity ids."""
    if not _require_known_device(connection, manager, msg):
        return
    mac = msg["mac"]
    device = manager.devices[mac]
    name = msg.get("name")
    area_id = msg.get("area_id")
    # .get fallback (not msg["..."]) because unit tests call this handler
    # directly, bypassing the voluptuous schema that supplies the default.
    recreate_entity_ids = msg.get("recreate_entity_ids", False)

    dev_reg = dr.async_get(hass)
    updates: dict[str, Any] = {}
    if name:
        updates["name_by_user"] = name
    if area_id:
        updates["area_id"] = area_id
    if updates and device.device_id:
        dev_reg.async_update_device(device.device_id, **updates)

    if name and recreate_entity_ids and device.device_id:
        # name_by_user updates above don't touch the registry `name` (the
        # node-name slug the old entity_ids derive from), so reading it here
        # — only when we actually regenerate — is equivalent to reading it up
        # front, and skips the lookup on the common no-regen path.
        reg_dev = dev_reg.async_get(device.device_id)
        old_name = reg_dev.name if reg_dev is not None else None
        _regenerate_entity_ids(hass, device.device_id, old_name, name)

    manager.fire_device_list_changed()
    connection.send_result(msg["id"])


# -- get_config --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/get_config",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@callback
@_require_manager
def websocket_get_config(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Get stored config for a device."""
    config = manager.store.devices.get(msg["mac"])
    # Return a shallow copy to avoid mutating the stored config
    response = dict(config) if config else {}
    response["entities"] = _get_entity_states(hass, msg["mac"])
    connection.send_result(msg["id"], {"config": response})


# -- set_setup (perspective calibration) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_setup",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("perspective"): vol.All([FINITE_FLOAT_SCHEMA], vol.Length(min=8, max=8)),
        # `room_width` / `room_depth` are millimetres (the firmware grid uses
        # GRID_CELL_SIZE_MM=300 mm cells and the connection layer feeds these
        # straight into the grid push). 0 is the "delete calibration" sentinel
        # (handled in the body). 50 000 mm = 50 m, far above any real room —
        # rejects negatives and absurd-large values that would otherwise be
        # persisted before the firmware push silently no-ops them.
        vol.Required("room_width"): finite_float(min=0, max=50_000),
        vol.Required("room_depth"): finite_float(min=0, max=50_000),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager(check_firmware=True)
async def websocket_set_setup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Save perspective calibration for a device."""
    if not _require_known_device(connection, manager, msg):
        return
    mac = msg["mac"]
    device_config = manager.store.devices.setdefault(mac, {})
    device_config["calibration"] = {
        "perspective": msg["perspective"],
        "room_width": msg["room_width"],
        "room_depth": msg["room_depth"],
    }
    # Clear room layout when calibration changes (grid dimensions may differ)
    device_config.pop("room_layout", None)
    # Store zone_presence flag — true on calibration, false on delete
    settings = device_config.get("settings", {})
    settings["zone_presence"] = msg["room_width"] > 0
    # Disable target entities when calibration is deleted (user must opt-in after re-calibration)
    deleting = msg["room_width"] <= 0
    if deleting:
        settings["target_xy"] = False
    device_config["settings"] = settings
    await manager.store.async_save()
    manager.request_push(mac)

    # Arm the reload guard BEFORE any entity-registry mutation — both
    # _apply_entity_states and async_update_zone_entities can trigger an
    # ESPHome reload, and the reconnect must not fire a redundant push.
    manager.schedule_entity_update_clear(mac)
    if deleting:
        _apply_entity_states(hass, mac, {"target_xy": False})

    # `room_layout` was popped above when calibration changed, so the zone
    # slots always fall back to the empty layout here.
    await manager.async_update_zone_entities(mac, empty_zone_slots())

    connection.send_result(msg["id"])


# -- set_room_layout --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_room_layout",
        vol.Required("mac"): MAC_SCHEMA,
        # Firmware rejects any grid push that isn't exactly the full grid, so
        # require all GRID_COLS*GRID_ROWS entries — a short list would persist
        # to storage and then silently fail every subsequent config push.
        vol.Required("grid_bytes"): vol.All(
            [vol.All(int, vol.Range(min=0, max=255))],
            vol.Length(min=GRID_COLS * GRID_ROWS, max=GRID_COLS * GRID_ROWS),
        ),
        vol.Required("zone_slots"): _validate_zone_slots,
        vol.Optional("furniture", default=[]): FURNITURE_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager(check_firmware=True)
async def websocket_set_room_layout(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Save room layout, zones, and furniture for a device."""
    if not _require_known_device(connection, manager, msg):
        return
    mac = msg["mac"]
    device_config = manager.store.devices.setdefault(mac, {})
    device_config["room_layout"] = {
        "grid_bytes": msg["grid_bytes"],
        "zone_slots": msg["zone_slots"],
        "furniture": msg.get("furniture", []),
    }
    await manager.store.async_save()
    # No host gate: the debounced push reads the device at fire time and
    # no-ops safely (marking the mac for the failed-push recovery path)
    # when the host is still unknown.
    manager.request_push(mac)

    # Arm the reload guard BEFORE the zone-entity registry mutations — they
    # can trigger an ESPHome reload, and the reconnect must not fire a
    # redundant push.
    manager.schedule_entity_update_clear(mac)
    # Update ESPHome entity enable/disable/rename
    await manager.async_update_zone_entities(mac, msg["zone_slots"])

    connection.send_result(msg["id"])


# -- Configuration commands --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_configurations"})
@websocket_api.require_admin
@callback
@_require_manager
def websocket_list_configurations(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """List saved configurations."""
    connection.send_result(msg["id"], {"configurations": manager.store.configurations})


# Cap on the number of stored named configurations. Each blob can be up to
# _MAX_CONFIGURATION_JSON_BYTES, so without a count cap a client could grow
# .storage/eppgrid without bound, one save_configuration call at a time.
_MAX_CONFIGURATIONS = 50


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/save_configuration",
        vol.Required("name"): NAME_SCHEMA,
        vol.Required("configuration"): CONFIGURATION_DICT_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_save_configuration(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Save a named configuration."""
    configurations = manager.store.configurations
    # Overwriting an existing name is always allowed — only NEW names count
    # against the cap.
    if msg["name"] not in configurations and len(configurations) >= _MAX_CONFIGURATIONS:
        connection.send_error(
            msg["id"],
            "too_many_configurations",
            f"Cannot store more than {_MAX_CONFIGURATIONS} configurations — delete one first",
            translation_domain=DOMAIN,
            translation_key="too_many_configurations",
            translation_placeholders={"max": str(_MAX_CONFIGURATIONS)},
        )
        return
    configurations[msg["name"]] = msg["configuration"]
    await manager.store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/delete_configuration",
        vol.Required("name"): NAME_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_delete_configuration(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Delete a saved configuration."""
    manager.store.configurations.pop(msg["name"], None)
    await manager.store.async_save()
    connection.send_result(msg["id"])


# -- Helper --


# Map ESPHome entity object_ids to frontend entity keys.
# unique_id format: {MAC}-{platform}-{object_id}
# Single object_ids map 1:1; prefix patterns (ending with _) match multiple
# entities (e.g. zone_0_presence, zone_1_presence, ...).
_ENTITY_OBJECT_ID_MAP: dict[str, str] = {
    "occupancy": "room_occupancy",
    "static_presence": "room_static_presence",
    "motion_presence": "room_motion_presence",
    "target_presence": "room_target_presence",
    "mmwave_presence": "room_mmwave",
    "temperature": "env_temperature",
    "humidity": "env_humidity",
    "illuminance": "env_illuminance",
    "co2": "env_co2",
    "calibrate_co2": "env_co2_calibrate",
    "system_alarm_relay": "relay_output",
    "target_count": "target_count",
}

# Entity keys that should follow another key's enable/disable state.
# When the leader key is toggled, followers are toggled to match.
_ENTITY_KEY_FOLLOWERS: dict[str, list[str]] = {
    "env_co2": ["env_co2_calibrate"],
}

# Prefix patterns: object_ids starting with these prefixes map to a category key.
_ENTITY_PREFIX_MAP: list[tuple[str, str, str]] = [
    ("zone_", "_presence", "zone_presence"),
    ("zone_", "_target_count", "zone_target_count"),
    ("target_", "_x", "target_xy"),
    ("target_", "_y", "target_xy"),
    ("target_", "_signal", "target_signal"),
    ("target_", "_active", "target_active"),
    ("target_", "_zone", "target_zone"),
]


def _object_id_from_unique_id(unique_id: str) -> str:
    """Extract the object_id from an ESPHome unique_id (after last '-')."""
    return unique_id.rsplit("-", 1)[-1] if "-" in unique_id else unique_id


def _entity_key_for_object_id(object_id: str) -> str | None:
    """Map an ESPHome object_id to its frontend entity key, or None.

    Expects the extracted object_id (e.g. "co2", "zone_0_presence"),
    not the full unique_id. Use _object_id_from_unique_id() first.
    """
    if object_id in _ENTITY_OBJECT_ID_MAP:
        return _ENTITY_OBJECT_ID_MAP[object_id]
    for prefix, suffix, key in _ENTITY_PREFIX_MAP:
        if object_id.startswith(prefix) and object_id.endswith(suffix):
            return key
    return None


_FOLLOWER_KEYS: frozenset[str] = frozenset(k for followers in _ENTITY_KEY_FOLLOWERS.values() for k in followers)

# Zone presence / target_count entities are enabled/disabled exclusively by
# `async_update_zone_entities` (device_manager), which is layout-aware — only
# zone 0 + named slots are enabled, unused slots stay disabled. The
# `zone_presence` / `zone_target_count` category keys map to ALL zone slots, so
# `_apply_entity_states` must NOT act on them: enabling the category here would
# (transiently) enable the unused slots, which `async_update_zone_entities` then
# re-disables in the same save. That disabled_by churn fires entity-registry
# events that reload the ESPHome config entry and bounce the device connection
# on EVERY settings save (re-pushing config + resetting the static sensor).
_LAYOUT_MANAGED_KEYS: frozenset[str] = frozenset({"zone_presence", "zone_target_count"})


def _get_entity_states(hass: HomeAssistant, mac: str) -> dict[str, bool]:
    """Read entity enabled/disabled states from HA entity registry.

    Follower keys (e.g. env_co2_calibrate) are excluded — the toggle state
    should reflect only the primary entity, not its followers.

    For category keys (zone_presence, target_xy, …): any-enabled means
    the category is on. `async_update_zone_entities` legitimately leaves
    zone-key entries partially INTEGRATION-disabled (unused slots 4-7),
    so AND semantics would falsely report off whenever those slots exist.
    A USER-manually-disabled sibling is also fine to mask — the user is
    still receiving data from the enabled siblings.
    """
    manager = _get_manager(hass)
    if manager is None:
        return {}
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        return {}
    ent_reg = er.async_get(hass)
    entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)

    result: dict[str, bool] = {}
    for entry in entries:
        object_id = _object_id_from_unique_id(entry.unique_id)
        key = _entity_key_for_object_id(object_id)
        if key is None or key in _FOLLOWER_KEYS:
            continue
        enabled = entry.disabled_by is None
        if key in result:
            result[key] = result[key] or enabled
        else:
            result[key] = enabled
    return result


def _apply_entity_states(hass: HomeAssistant, mac: str, entities: dict[str, bool]) -> None:
    """Apply entity enable/disable changes to HA entity registry (idempotent)."""
    manager = _get_manager(hass)
    if manager is None:
        return
    dev = manager.devices.get(mac)
    if dev is None or dev.device_id is None:
        return
    ent_reg = er.async_get(hass)
    entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)

    # Expand follower keys: if env_co2 is toggled, also toggle env_co2_calibrate
    expanded = dict(entities)
    for leader, followers in _ENTITY_KEY_FOLLOWERS.items():
        if leader in expanded:
            for follower in followers:
                expanded.setdefault(follower, expanded[leader])

    for entry in entries:
        object_id = _object_id_from_unique_id(entry.unique_id)
        key = _entity_key_for_object_id(object_id)
        # Layout-managed zone keys are owned by async_update_zone_entities.
        if key is None or key not in expanded or key in _LAYOUT_MANAGED_KEYS:
            continue
        # Never overwrite entities the user has manually disabled
        if entry.disabled_by == er.RegistryEntryDisabler.USER:
            continue
        desired = expanded[key]
        if desired:
            ent_reg.async_update_entity(entry.entity_id, disabled_by=None)
        else:
            ent_reg.async_update_entity(entry.entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION)


def _build_entity_key_map(entities: list) -> dict[str, int]:
    """Map entity names to their numeric state keys."""
    key_map = {}
    for entity in entities:
        if hasattr(entity, "key") and hasattr(entity, "name"):
            key_map[entity.name] = entity.key
    return key_map


# -- subscribe_device (session lifecycle) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_device",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_subscribe_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Open a session connection for a device.

    Sessions are refcounted: each successful subscribe takes one reference,
    each unsubscribe releases one, and the manager closes the connection
    only when the LAST reference is released (see
    `DeviceManager.async_open_session` / `release_session`).
    """
    mac = msg["mac"]
    try:
        device_conn = await manager.async_open_session(mac)
    except Exception as err:
        _LOGGER.warning("Failed to open session for %s: %s", mac, err)
        # The manager broadcasts only on the OK→failing transition — repeated
        # failures against an already-failing mac don't represent a state
        # change for device-list subscribers.
        manager.set_connection_failed(mac, True)
        connection.send_error(
            msg["id"],
            "connection_failed",
            "Failed to connect to device",
            translation_domain=DOMAIN,
            translation_key="connection_failed",
        )
        return
    if device_conn is None:
        # Wire code stays `not_found` (not `device_not_found`): the frontend
        # dispatches on it — device-controller.ts treats `connection_failed`
        # and `not_found` as "connection failed" when opening a session.
        connection.send_error(
            msg["id"],
            "not_found",
            "Device not available",
            translation_domain=DOMAIN,
            translation_key="device_not_available",
        )
        return
    # Successful open clears the failure flag so the next failure (if any)
    # is a transition and re-fires the broadcast.
    manager.set_connection_failed(mac, False)
    connection.send_result(msg["id"])

    released = False

    @callback
    def _unsub() -> None:
        # Release (not force-close) the session reference this subscriber
        # took via async_open_session: other clients subscribed to the same
        # device share the connection, and the manager only closes it when
        # the last reference is released. The `released` guard keeps a
        # double-invoked unsub from stealing someone else's reference.
        nonlocal released
        if released:
            return
        released = True
        manager.release_session(mac, device_conn)

    connection.subscriptions[msg["id"]] = _unsub
    if _connection_is_closed(connection):
        # The WS connection closed while we were awaiting async_open_session:
        # HA's async_handle_close already ran (iterating + clearing the
        # subscriptions it had at close time) and will NOT cancel this
        # background task, so the unsub we just registered will never be
        # invoked. Release the refcount the open took, now — otherwise it
        # leaks (the ESP32 API slot stays held until a force-close). The
        # `released` guard makes this safe vs. a later unsub.
        _unsub()


# -- target stream subscriptions (raw + grid) --


async def _start_target_stream(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
    *,
    counter_attr: Literal["raw_target_subs", "grid_target_subs", "heatmap_subs"],
    make_on_state: Callable[[Any], Callable[[Any], None]],
) -> None:
    """Shared scaffolding for `subscribe_raw_targets` / `subscribe_grid_targets`.

    Session lookup with the standard no-session error, the per-stream state
    callback (built by ``make_on_state`` from the live session), the
    subscriber-counter increment (``counter_attr``) with a pipeline kick,
    and the symmetric unsubscribe.
    """
    mac = msg["mac"]
    device_conn = manager.get_session(mac)
    if device_conn is None:
        _send_no_session(connection, msg["id"])
        return

    on_state = make_on_state(device_conn)
    await device_conn.subscribe_states(on_state)
    connection.send_result(msg["id"])

    # Count the subscriber on the manager, keyed by mac — NOT on `device_conn`.
    # The count must outlive this connection: when the device flaps and the
    # session is reopened on a fresh connection, a per-connection counter would
    # reset to zero and the recomputed pipeline would silence the device while
    # this subscription is still live (the "target disappears" freeze).
    manager.note_target_subscribe(mac, counter_attr)
    hass.async_create_task(manager.async_push_pipeline_to_device(mac))

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(on_state)
        # Re-fetch the manager instead of closing over `manager`: the unsub
        # can fire after a config-entry unload tore that manager down, and
        # the fresh lookup returning None skips the decrement + pipeline kick
        # instead of poking a dead manager.
        mgr = _get_manager(hass)
        if mgr:
            mgr.note_target_unsubscribe(mac, counter_attr)
            hass.async_create_task(mgr.async_push_pipeline_to_device(mac))

    connection.subscriptions[msg["id"]] = _unsub


# -- subscribe_raw_targets --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_raw_targets",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_subscribe_raw_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream raw target positions from the device session."""

    def _make_on_state(device_conn: Any) -> Any:
        key_map = _build_entity_key_map(device_conn.entities)

        # Map raw target sensor keys to indices (display names are 1-based)
        raw_keys = {}
        for i in range(3):
            name = f"Raw Target {i + 1}"
            if name in key_map:
                raw_keys[key_map[name]] = i

        # Accumulated state
        raw_targets: list[dict[str, float | None]] = [{"raw_x": None, "raw_y": None} for _ in range(3)]

        @callback
        def _on_state(state: Any) -> None:
            if not isinstance(state, TextSensorState):
                return
            if state.key not in raw_keys:
                return
            idx = raw_keys[state.key]
            if state.state:
                parsed = _parse_position_csv(state.state)
                if parsed is None:
                    return  # garbled firmware emit — drop silently
                raw_targets[idx] = {"raw_x": parsed[0], "raw_y": parsed[1]}
            else:
                raw_targets[idx] = {"raw_x": None, "raw_y": None}
            connection.send_message(websocket_api.event_message(msg["id"], {"targets": list(raw_targets)}))

        return _on_state

    await _start_target_stream(
        hass,
        connection,
        msg,
        manager,
        counter_attr="raw_target_subs",
        make_on_state=_make_on_state,
    )


# -- subscribe_grid_targets --


def _make_grid_target_on_state(
    connection: websocket_api.ActiveConnection,
    msg_id: int,
    mac: str,
    device_conn: Any,
) -> Callable[[Any], None]:
    """Build the per-session state callback that accumulates target/zone/sensor
    state and emits the full snapshot to `connection` for `msg_id`.

    Shared by `subscribe_grid_targets` (admin) and `overview/subscribe`
    (non-admin) so both stream identical {targets, sensors, zones} frames.
    """
    key_map = _build_entity_key_map(device_conn.entities)

    target_keys = {}
    for i in range(3):
        name = f"Target {i + 1} Position"
        if name in key_map:
            target_keys[key_map[name]] = i

    zone_state_key = key_map.get("Zone State")

    binary_sensor_keys = {}
    for name, field in (
        ("Occupancy", "occupancy"),
        ("Static Presence", "static_presence"),
        ("Motion Presence", "motion_presence"),
        ("Zone Tracking", "target_presence"),
        ("mmWave Presence", "mmwave"),
    ):
        if name in key_map:
            binary_sensor_keys[key_map[name]] = field

    numeric_sensor_keys = {}
    for name, field in (
        ("Temperature", "temperature"),
        ("Humidity", "humidity"),
        ("Illuminance", "illuminance"),
        ("CO2", "co2"),
    ):
        if name in key_map:
            numeric_sensor_keys[key_map[name]] = field

    targets: list[dict[str, float | int | str | None]] = [
        {"x": None, "y": None, "signal": 0, "status": "inactive"} for _ in range(3)
    ]
    sensors: dict[str, Any] = {
        "occupancy": False,
        "static_presence": False,
        "motion_presence": False,
        "target_presence": False,
        "mmwave": False,
        "temperature": None,
        "humidity": None,
        "illuminance": None,
        "co2": None,
    }
    zones: dict[str, Any] = {"occupancy": {}, "target_counts": {}, "frame_count": 0}

    @callback
    def _emit() -> None:
        connection.send_message(
            websocket_api.event_message(
                msg_id,
                {
                    "targets": list(targets),
                    "sensors": dict(sensors),
                    "zones": dict(zones),
                },
            )
        )

    @callback
    def _on_state(state: Any) -> None:
        if isinstance(state, TextSensorState):
            if state.key in target_keys:
                idx = target_keys[state.key]
                if state.state:
                    parsed = _parse_position_csv(state.state)
                    if parsed is None:
                        return
                    targets[idx]["x"] = parsed[0]
                    targets[idx]["y"] = parsed[1]
                    if parsed[2] is not None:
                        targets[idx]["status"] = parsed[2]
                else:
                    targets[idx] = {"x": None, "y": None, "signal": 0, "status": "inactive"}
                _emit()
            elif zone_state_key is not None and state.key == zone_state_key and state.state:
                try:
                    zs = json.loads(state.state)
                    for i, t in enumerate(zs.get("targets", [])):
                        if i < 3:
                            targets[i]["signal"] = t.get("signal", 0)
                            targets[i]["status"] = t.get("status", "inactive")
                    zone_occ = zs.get("zones", {}).get("occupancy", [])
                    zones["occupancy"] = {str(i): v for i, v in enumerate(zone_occ)}
                    zones["frame_count"] = zs.get("frame_count", 0)
                    debug_log = zs.get("debug_log")
                    if debug_log:
                        zones["debug_log"] = debug_log
                    events = zs.get("ev")
                    if isinstance(events, list):
                        valid_events = [e for e in events if isinstance(e, str)]
                        if valid_events:
                            zones["events"] = valid_events
                    sensors["target_presence"] = zs.get("zones", {}).get("tracking", False)
                    static_state = zs.get("static_state")
                    if static_state is not None:
                        sensors["static_state"] = static_state
                    motion_state = zs.get("motion_state")
                    if motion_state is not None:
                        sensors["motion_state"] = motion_state
                    fw_occupancy = zs.get("occupancy")
                    if fw_occupancy is not None:
                        sensors["occupancy_state"] = fw_occupancy
                    fw_mmwave = zs.get("mmwave")
                    if fw_mmwave is not None:
                        sensors["mmwave"] = fw_mmwave
                except (ValueError, KeyError, TypeError, AttributeError) as err:
                    _LOGGER.debug(
                        "grid_target stream: bad zone-state JSON for %s: %s",
                        mac,
                        err,
                    )
                    return
                _emit()
                zones.pop("events", None)

        elif isinstance(state, BinarySensorState):
            if state.key in binary_sensor_keys:
                sensors[binary_sensor_keys[state.key]] = state.state
                _emit()

        elif isinstance(state, SensorState) and state.key in numeric_sensor_keys:
            field = numeric_sensor_keys[state.key]
            sensors[field] = None if math.isnan(state.state) else state.state
            _emit()

    return _on_state


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_grid_targets",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_subscribe_grid_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream target positions, zone state, and sensor data from the device session."""
    mac = msg["mac"]
    await _start_target_stream(
        hass,
        connection,
        msg,
        manager,
        counter_attr="grid_target_subs",
        make_on_state=lambda dc: _make_grid_target_on_state(connection, msg["id"], mac, dc),
    )


# -- subscribe_heatmap --


def _decode_heatmap_b64(value: str) -> list[int]:
    """Decode the firmware Heatmap text sensor to a dense 400-length 0..255 list.

    Returns an all-zero list of length `_HEATMAP_CELL_COUNT` for any input that
    isn't a clean, correctly-sized base64 blob (empty, garbled, or the wrong
    decoded length) rather than raising — the caller streams this straight to
    the frontend, and a malformed one-off firmware emit must not crash the
    subscription.
    """
    if not value:
        return [0] * _HEATMAP_CELL_COUNT
    try:
        data = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        return [0] * _HEATMAP_CELL_COUNT
    if len(data) != _HEATMAP_CELL_COUNT:
        return [0] * _HEATMAP_CELL_COUNT
    return list(data)


def _make_heatmap_on_state(
    connection: websocket_api.ActiveConnection, msg_id: int, mac: str, device_conn: Any
) -> Callable[[Any], None]:
    """Build the per-session state callback that decodes and emits the
    on-device activity heatmap for `subscribe_heatmap`.
    """
    key_map = _build_entity_key_map(device_conn.entities)
    heatmap_key = key_map.get("Heatmap")

    @callback
    def _on_state(state: Any) -> None:
        if heatmap_key is None:
            return
        if isinstance(state, TextSensorState) and state.key == heatmap_key and state.state:
            cells = _decode_heatmap_b64(state.state)
            connection.send_message(websocket_api.event_message(msg_id, {"cells": cells}))

    return _on_state


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_heatmap",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_subscribe_heatmap(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream the on-device activity heatmap for a device session."""
    mac = msg["mac"]
    await _start_target_stream(
        hass,
        connection,
        msg,
        manager,
        counter_attr="heatmap_subs",
        make_on_state=lambda dc: _make_heatmap_on_state(connection, msg["id"], mac, dc),
    )


# -- set_entity_enabled --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_entity_enabled",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("entity_id"): ENTITY_ID_SCHEMA,
        vol.Required("enabled"): bool,
    }
)
@websocket_api.require_admin
@callback
@_require_manager(check_firmware=True)
def websocket_set_entity_enabled(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Enable or disable an ESPHome entity on a managed device.

    Scoped to entities belonging to `msg["mac"]`'s HA device — without the
    ownership check this admin command could toggle ANY entity in the
    installation (e.g. disable someone's alarm panel).
    """
    if not _require_known_device(connection, manager, msg):
        return
    dev = manager.devices[msg["mac"]]
    if dev.device_id is None:
        # HA device not resolved yet (ESPHome entry still setting up) — we
        # can't verify ownership, so fail closed.
        connection.send_error(
            msg["id"],
            "device_not_available",
            "Device not available",
            translation_domain=DOMAIN,
            translation_key="device_not_available",
        )
        return
    ent_reg = er.async_get(hass)
    # Registry lookup by entity_id includes disabled entities (unlike
    # `async_entries_for_device`, which needs include_disabled_entities=True)
    # — essential here since this command's whole job is re-enabling them.
    entry = ent_reg.async_get(msg["entity_id"])
    if entry is None:
        # Curated error — letting async_update_entity raise KeyError would
        # surface as an opaque unknown_error to the frontend.
        connection.send_error(
            msg["id"],
            "entity_not_found",
            "Entity not found",
            translation_domain=DOMAIN,
            translation_key="entity_not_found",
        )
        return
    if entry.device_id != dev.device_id:
        connection.send_error(
            msg["id"],
            "entity_not_on_device",
            "Entity does not belong to this device",
            translation_domain=DOMAIN,
            translation_key="entity_not_on_device",
        )
        return
    # Arm the reload guard BEFORE the registry write — toggling an ESPHome
    # entity triggers an integration reload, and the reconnect must not fire
    # a redundant push.
    manager.schedule_entity_update_clear(msg["mac"])
    if msg["enabled"]:
        ent_reg.async_update_entity(msg["entity_id"], disabled_by=None)
    else:
        ent_reg.async_update_entity(msg["entity_id"], disabled_by=er.RegistryEntryDisabler.INTEGRATION)
    connection.send_result(msg["id"])


# -- set_settings (unified settings command) --

_SETTINGS_KEYS = (
    "temperature_offset",
    "humidity_offset",
    "illuminance_offset",
    "motion_timeout",
    "target_auto_distance",
    "target_max_distance",
    "stuck_target_timeout",
    "assisted_clear_enabled",
    "assisted_clear_timeout",
    "static_auto_distance",
    "static_min_distance",
    "static_max_distance",
    "static_trigger_threshold",
    "static_renew_threshold",
    "static_timeout",
    "static_on_delay",
    "led_mode",
    "led_brightness",
    "led_presence_color",
    "relay_trigger_mode",
    "relay_contact_mode",
)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_settings",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("temperature_offset"): FINITE_FLOAT_SCHEMA,
        vol.Required("humidity_offset"): FINITE_FLOAT_SCHEMA,
        vol.Required("illuminance_offset"): FINITE_FLOAT_SCHEMA,
        vol.Required("motion_timeout"): FINITE_FLOAT_SCHEMA,
        vol.Required("target_auto_distance"): bool,
        vol.Required("target_max_distance"): FINITE_FLOAT_SCHEMA,
        vol.Required("stuck_target_timeout"): finite_float(min=0, max=600),
        vol.Required("assisted_clear_enabled"): bool,
        vol.Required("assisted_clear_timeout"): finite_float(min=0, max=600),
        vol.Required("static_auto_distance"): bool,
        vol.Required("static_min_distance"): FINITE_FLOAT_SCHEMA,
        vol.Required("static_max_distance"): FINITE_FLOAT_SCHEMA,
        vol.Required("static_trigger_threshold"): vol.Coerce(int),
        vol.Required("static_renew_threshold"): vol.Coerce(int),
        vol.Required("static_timeout"): FINITE_FLOAT_SCHEMA,
        vol.Required("static_on_delay"): finite_float(min=0, max=STATIC_ON_DELAY_MAX),
        vol.Required("led_mode"): vol.In(["Manual Control", "Presence", "Environmental", "Environmental + Presence"]),
        vol.Required("led_brightness"): finite_float(min=0.1, max=1.0),
        vol.Required("led_presence_color"): vol.Match(r"^#[0-9A-Fa-f]{6}$"),
        vol.Required("relay_trigger_mode"): vol.In(["disabled", "motion", "presence", "occupancy"]),
        vol.Required("relay_contact_mode"): vol.In(["no", "nc"]),
        vol.Optional("entities"): {str: bool},
        vol.Optional("log_levels"): {str: vol.In(["None", "Error", "Warning", "Info", "Debug"])},
        vol.Optional("target_update_rate_ms"): vol.All(vol.Coerce(int), vol.In([200, 500, 1000, 2000])),
        vol.Optional("zone_update_rate_ms"): vol.All(vol.Coerce(int), vol.In([200, 500, 1000, 2000])),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager(check_firmware=True)
async def websocket_set_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Save all device settings in one call."""
    if not _require_known_device(connection, manager, msg):
        return
    mac = msg["mac"]
    device_config = manager.store.devices.setdefault(mac, {})
    new_settings = {k: msg[k] for k in _SETTINGS_KEYS}
    # Preserve entity toggle and rate flags — they're managed by entity toggles,
    # not by the settings form payload.
    old_settings = device_config.get("settings", {})
    for key in (
        "zone_presence",
        "target_xy",
        "target_active",
        "target_signal",
        "target_zone",
        "zone_target_count",
        "target_count",
        "target_update_rate_ms",
        "zone_update_rate_ms",
    ):
        if key in old_settings:
            new_settings[key] = old_settings[key]
    # Optional rate keys in the payload override the preserved values.
    for key in ("target_update_rate_ms", "zone_update_rate_ms"):
        if key in msg:
            new_settings[key] = msg[key]
    # Persist entity flags before push so _push_config_to_device sees correct flags
    entities = msg.get("entities")
    if entities:
        persisted_entity_keys = (
            "zone_presence",
            "target_xy",
            "target_active",
            "target_signal",
            "target_zone",
            "zone_target_count",
            "target_count",
        )
        for ekey in persisted_entity_keys:
            if ekey in entities:
                new_settings[ekey] = entities[ekey]
    device_config["settings"] = new_settings
    log_levels = msg.get("log_levels")
    if log_levels is not None:
        device_config["log_levels"] = log_levels
    await manager.store.async_save()
    manager.request_push(mac)
    # Auto-enable/disable relay switch entity based on trigger mode
    relay_enabled = msg["relay_trigger_mode"] != "disabled"
    manager.schedule_entity_update_clear(mac)
    _apply_entity_states(hass, mac, {"relay_output": relay_enabled})
    # Manage device log subscription on the active session (if any)
    session_conn = manager.get_session(mac)
    if session_conn is not None:
        manager.manage_log_subscription(session_conn, device_config)
    if entities:
        _apply_entity_states(hass, mac, entities)
        # Zone entities need layout-aware handling: enable zone_0 + named zones only
        if "zone_presence" in entities or "zone_target_count" in entities:
            layout = device_config.get("room_layout", {})
            # Only fall back when the key is actually missing (None); a
            # falsy-but-present value (e.g. []) must pass through so
            # async_update_zone_entities can fail closed on malformed shapes.
            zone_slots = layout.get("zone_slots")
            if zone_slots is None:
                zone_slots = empty_zone_slots()
            await manager.async_update_zone_entities(mac, zone_slots)
        await manager.async_push_pipeline_to_device(mac)
    connection.send_result(msg["id"])


# -- set_distance_override (temporary range push, no persist) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_distance_override",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("target_max_distance"): FINITE_FLOAT_SCHEMA,
        vol.Required("static_min_distance"): FINITE_FLOAT_SCHEMA,
        vol.Required("static_max_distance"): FINITE_FLOAT_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager(check_firmware=True)
async def websocket_set_distance_override(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Push distance override to device without persisting."""
    mac = msg["mac"]
    session = manager.get_session(mac)
    if session is None:
        # Don't lie to the frontend with `success` — the override never
        # reaches the device when no session is open, so the slider in the
        # UI would silently fail to take effect.
        _send_no_session(connection, msg["id"])
        return
    device_config = manager.store.devices.get(mac, {})
    stored_settings = device_config.get("settings", {})
    override = {
        "target_max_distance": msg["target_max_distance"],
        "static_min_distance": msg["static_min_distance"],
        "static_max_distance": msg["static_max_distance"],
        "static_trigger_threshold": stored_settings.get("static_trigger_threshold", 3),
        "static_renew_threshold": stored_settings.get("static_renew_threshold", 3),
        "static_timeout": stored_settings.get("static_timeout", 30.0),
        "static_on_delay": stored_settings.get("static_on_delay", 0.0),
    }
    await session.async_push_distance_override(override)
    connection.send_result(msg["id"])
