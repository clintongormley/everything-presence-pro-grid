"""Device, configuration, session, and settings websocket commands."""

from __future__ import annotations

import json
import math
from typing import Any

import voluptuous as vol
from aioesphomeapi import BinarySensorState
from aioesphomeapi import SensorState
from aioesphomeapi import TextSensorState
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er

from ..const import DOMAIN
from ..const import GRID_COLS
from ..const import GRID_ROWS
from ..const import STATIC_ON_DELAY_MAX
from ..const import empty_zone_slots
from . import _LOGGER
from . import CONFIGURATION_DICT_SCHEMA
from . import ENTITY_ID_SCHEMA
from . import MAC_SCHEMA
from . import NAME_SCHEMA
from . import _get_manager
from . import _require_known_device
from . import _require_manager
from . import _validate_zone_slots


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
    def _send_update() -> None:
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "devices": manager.list_devices(),
                    "show_room_calibration_tutorial": manager._store.show_room_calibration_tutorial,
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
            "show_room_calibration_tutorial": manager._store.show_room_calibration_tutorial,
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
    if manager._store.show_room_calibration_tutorial == new_value:
        connection.send_result(msg["id"])
        return
    manager._store.show_room_calibration_tutorial = new_value
    await manager._store.async_save()
    manager._fire_device_list_changed()
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
    config = manager._store.devices.get(msg["mac"])
    # Return a shallow copy to avoid mutating the stored config
    response = dict(config) if config else {}
    response["entities"] = _get_entity_states(hass, msg["mac"])
    connection.send_result(msg["id"], {"config": response})


# -- set_setup (perspective calibration) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_setup",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("perspective"): vol.All([vol.Coerce(float)], vol.Length(min=8, max=8)),
        # `room_width` / `room_depth` are millimetres (the firmware grid uses
        # GRID_CELL_SIZE_MM=300 mm cells and the connection layer feeds these
        # straight into the grid push). 0 is the "delete calibration" sentinel
        # (handled in the body). 50 000 mm = 50 m, far above any real room —
        # rejects negatives and absurd-large values that would otherwise be
        # persisted before the firmware push silently no-ops them.
        vol.Required("room_width"): vol.All(vol.Coerce(float), vol.Range(min=0, max=50_000)),
        vol.Required("room_depth"): vol.All(vol.Coerce(float), vol.Range(min=0, max=50_000)),
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
    device_config = manager._store.devices.setdefault(mac, {})
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
    await manager._store.async_save()
    manager._request_push(mac)

    # Arm the guard before _apply_entity_states triggers an ESPHome reload,
    # so the reconnect doesn't fire a redundant push.
    if deleting:
        manager._schedule_entity_update_clear(mac)
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
        vol.Required("grid_bytes"): vol.All(
            [vol.All(int, vol.Range(min=0, max=255))],
            vol.Length(min=1, max=GRID_COLS * GRID_ROWS),
        ),
        vol.Required("zone_slots"): _validate_zone_slots,
        vol.Optional("furniture", default=[]): list,
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
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["room_layout"] = {
        "grid_bytes": msg["grid_bytes"],
        "zone_slots": msg["zone_slots"],
        "furniture": msg.get("furniture", []),
    }
    await manager._store.async_save()
    dev = manager.devices.get(mac)
    if dev and dev.host:
        manager._request_push(mac)

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
    connection.send_result(msg["id"], {"configurations": manager._store.configurations})


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
    manager._store.configurations[msg["name"]] = msg["configuration"]
    await manager._store.async_save()
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
    manager._store.configurations.pop(msg["name"], None)
    await manager._store.async_save()
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
        if key is None or key not in expanded:
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
    """Open a session connection for a device. Closes on unsubscribe."""
    mac = msg["mac"]
    try:
        device_conn = await manager.async_open_session(mac)
    except Exception as err:
        _LOGGER.warning("Failed to open session for %s: %s", mac, err)
        # Only broadcast on the OK→failing transition. Repeated failures
        # against an already-failing mac don't represent a state change for
        # device-list subscribers and would spam every consumer on every retry.
        if mac not in manager._connection_failed:
            manager._connection_failed.add(mac)
            manager._fire_device_list_changed()
        connection.send_error(
            msg["id"],
            "connection_failed",
            "Failed to connect to device",
            translation_domain=DOMAIN,
            translation_key="connection_failed",
        )
        return
    if device_conn is None:
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
    manager._connection_failed.discard(mac)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        manager.schedule_close_session(mac)

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
    mac = msg["mac"]
    device_conn = manager.get_session(mac)
    if device_conn is None:
        connection.send_error(
            msg["id"],
            "no_session",
            "No active session — call subscribe_device first",
            translation_domain=DOMAIN,
            translation_key="no_active_session",
        )
        return

    key_map = _build_entity_key_map(device_conn._entities)

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

    await device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    device_conn.raw_target_subs += 1
    if manager:
        hass.async_create_task(manager._push_pipeline_to_device(mac))

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.raw_target_subs -= 1
        mgr = _get_manager(hass)
        if mgr:
            hass.async_create_task(mgr._push_pipeline_to_device(mac))

    connection.subscriptions[msg["id"]] = _unsub


# -- subscribe_grid_targets --


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
    device_conn = manager.get_session(mac)
    if device_conn is None:
        connection.send_error(
            msg["id"],
            "no_session",
            "No active session — call subscribe_device first",
            translation_domain=DOMAIN,
            translation_key="no_active_session",
        )
        return

    key_map = _build_entity_key_map(device_conn._entities)

    # Map target position sensor keys to indices (display names are 1-based)
    target_keys = {}
    for i in range(3):
        name = f"Target {i + 1} Position"
        if name in key_map:
            target_keys[key_map[name]] = i

    # Zone state text sensor key
    zone_state_key = key_map.get("Zone State")

    # Binary sensor keys for sensors dict
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

    # Numeric sensor keys for environmental data
    numeric_sensor_keys = {}
    for name, field in (
        ("Temperature", "temperature"),
        ("Humidity", "humidity"),
        ("Illuminance", "illuminance"),
        ("CO2", "co2"),
    ):
        if name in key_map:
            numeric_sensor_keys[key_map[name]] = field

    # Accumulated state
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
    def _on_state(state: Any) -> None:
        if isinstance(state, TextSensorState):
            if state.key in target_keys:
                idx = target_keys[state.key]
                if state.state:
                    parsed = _parse_position_csv(state.state)
                    if parsed is None:
                        return  # garbled firmware emit — drop silently
                    targets[idx]["x"] = parsed[0]
                    targets[idx]["y"] = parsed[1]
                    # Status comes from position text sensor (active/pending)
                    if parsed[2] is not None:
                        targets[idx]["status"] = parsed[2]
                else:
                    targets[idx] = {"x": None, "y": None, "signal": 0, "status": "inactive"}
                # Send full event on each position update (5Hz)
                connection.send_message(
                    websocket_api.event_message(
                        msg["id"],
                        {
                            "targets": list(targets),
                            "sensors": dict(sensors),
                            "zones": dict(zones),
                        },
                    )
                )
            elif zone_state_key is not None and state.key == zone_state_key and state.state:
                # Parse zone state JSON (1Hz)
                try:
                    zs = json.loads(state.state)
                    # Update target signal/status
                    for i, t in enumerate(zs.get("targets", [])):
                        if i < 3:
                            targets[i]["signal"] = t.get("signal", 0)
                            targets[i]["status"] = t.get("status", "inactive")
                    # Update zone data
                    zone_occ = zs.get("zones", {}).get("occupancy", [])
                    zones["occupancy"] = {str(i): v for i, v in enumerate(zone_occ)}
                    zones["frame_count"] = zs.get("frame_count", 0)
                    debug_log = zs.get("debug_log")
                    if debug_log:
                        zones["debug_log"] = debug_log
                    sensors["target_presence"] = zs.get("zones", {}).get("tracking", False)
                    # Parse sensor presence states from firmware
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
                    # Send event on zone state update (not just target position updates)
                    # so sensor state changes appear in the log without delay
                    connection.send_message(
                        websocket_api.event_message(
                            msg["id"],
                            {
                                "targets": list(targets),
                                "sensors": dict(sensors),
                                "zones": dict(zones),
                            },
                        )
                    )
                except (ValueError, KeyError) as err:
                    # Malformed zone-state JSON from firmware (truncated buffer,
                    # boot-time garbage). Drop the frame but log so we don't lose
                    # visibility when a real parse bug regresses.
                    _LOGGER.debug(
                        "subscribe_grid_targets: bad zone-state JSON for %s: %s",
                        mac,
                        err,
                    )

        elif isinstance(state, BinarySensorState):
            if state.key in binary_sensor_keys:
                sensors[binary_sensor_keys[state.key]] = state.state
                # Push the update — without this, env/binary sensor changes
                # only reach the frontend when piggy-backed on a target or
                # zone-state event. After a reconnect with no target movement
                # and quiet zone state, env sliders stay at "—" indefinitely.
                connection.send_message(
                    websocket_api.event_message(
                        msg["id"],
                        {
                            "targets": list(targets),
                            "sensors": dict(sensors),
                            "zones": dict(zones),
                        },
                    )
                )

        elif isinstance(state, SensorState) and state.key in numeric_sensor_keys:
            field = numeric_sensor_keys[state.key]
            sensors[field] = None if math.isnan(state.state) else state.state
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {
                        "targets": list(targets),
                        "sensors": dict(sensors),
                        "zones": dict(zones),
                    },
                )
            )

    await device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    device_conn.grid_target_subs += 1
    if manager:
        hass.async_create_task(manager._push_pipeline_to_device(mac))

    @callback
    def _unsub() -> None:
        device_conn.unsubscribe_states(_on_state)
        device_conn.grid_target_subs -= 1
        mgr = _get_manager(hass)
        if mgr:
            hass.async_create_task(mgr._push_pipeline_to_device(mac))

    connection.subscriptions[msg["id"]] = _unsub


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
    """Enable or disable an ESPHome entity on a managed device."""
    ent_reg = er.async_get(hass)
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
        vol.Required("temperature_offset"): vol.Coerce(float),
        vol.Required("humidity_offset"): vol.Coerce(float),
        vol.Required("illuminance_offset"): vol.Coerce(float),
        vol.Required("motion_timeout"): vol.Coerce(float),
        vol.Required("target_auto_distance"): bool,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("stuck_target_timeout"): vol.All(vol.Coerce(float), vol.Range(min=0, max=600)),
        vol.Required("static_auto_distance"): bool,
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
        vol.Required("static_trigger_threshold"): vol.Coerce(int),
        vol.Required("static_renew_threshold"): vol.Coerce(int),
        vol.Required("static_timeout"): vol.Coerce(float),
        vol.Required("static_on_delay"): vol.All(vol.Coerce(float), vol.Range(min=0, max=STATIC_ON_DELAY_MAX)),
        vol.Required("led_mode"): vol.In(["Manual Control", "Presence", "Environmental", "Environmental + Presence"]),
        vol.Required("led_brightness"): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=1.0)),
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
    device_config = manager._store.devices.setdefault(mac, {})
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
    device_config["settings"] = new_settings
    if "target_update_rate_ms" in msg:
        new_settings["target_update_rate_ms"] = msg["target_update_rate_ms"]
    if "zone_update_rate_ms" in msg:
        new_settings["zone_update_rate_ms"] = msg["zone_update_rate_ms"]
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
                device_config.setdefault("settings", {})[ekey] = entities[ekey]
    log_levels = msg.get("log_levels")
    if log_levels is not None:
        device_config["log_levels"] = log_levels
    await manager._store.async_save()
    manager._request_push(mac)
    # Auto-enable/disable relay switch entity based on trigger mode
    relay_enabled = msg["relay_trigger_mode"] != "disabled"
    manager._schedule_entity_update_clear(mac)
    _apply_entity_states(hass, mac, {"relay_output": relay_enabled})
    # Manage device log subscription on the active session (if any)
    session_conn = manager.get_session(mac)
    if session_conn is not None:
        manager._manage_log_subscription(session_conn, device_config)
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
        await manager._push_pipeline_to_device(mac)
    connection.send_result(msg["id"])


# -- set_distance_override (temporary range push, no persist) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/set_distance_override",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("target_max_distance"): vol.Coerce(float),
        vol.Required("static_min_distance"): vol.Coerce(float),
        vol.Required("static_max_distance"): vol.Coerce(float),
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
        connection.send_error(
            msg["id"],
            "no_session",
            "No active session — call subscribe_device first",
            translation_domain=DOMAIN,
            translation_key="no_active_session",
        )
        return
    device_config = manager._store.devices.get(mac, {})
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
