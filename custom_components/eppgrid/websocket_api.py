"""WebSocket API for EPP Grid frontend."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

_REGISTERED: set[str] = set()


def async_register_websocket_commands(
    hass: HomeAssistant, manager: Any
) -> None:
    """Register WebSocket commands."""
    if DOMAIN in _REGISTERED:
        return
    _REGISTERED.add(DOMAIN)

    websocket_api.async_register_command(hass, websocket_list_devices)
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_set_setup)
    websocket_api.async_register_command(hass, websocket_set_room_layout)
    websocket_api.async_register_command(hass, websocket_list_templates)
    websocket_api.async_register_command(hass, websocket_save_template)
    websocket_api.async_register_command(hass, websocket_delete_template)
    websocket_api.async_register_command(hass, websocket_apply_template)
    websocket_api.async_register_command(hass, websocket_subscribe_grid_targets)
    websocket_api.async_register_command(hass, websocket_subscribe_raw_targets)
    websocket_api.async_register_command(hass, websocket_set_entity_enabled)
    websocket_api.async_register_command(hass, websocket_set_env_calibration)
    websocket_api.async_register_command(hass, websocket_set_motion_timeout)
    websocket_api.async_register_command(hass, websocket_set_tracking)
    websocket_api.async_register_command(hass, websocket_set_static_presence)
    websocket_api.async_register_command(hass, websocket_set_pipeline)


def _get_manager(hass: HomeAssistant) -> Any:
    """Get the device manager."""
    return hass.data.get(DOMAIN)


# -- list_devices --

@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_devices"})
@callback
def websocket_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List discovered EPP devices."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    connection.send_result(msg["id"], {"devices": manager.list_devices()})


# -- get_config --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/get_config",
    vol.Required("mac"): str,
})
@callback
def websocket_get_config(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get stored config for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    config = manager._store.get_device(msg["mac"])
    connection.send_result(msg["id"], {"config": config})


# -- set_setup (perspective calibration) --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_setup",
    vol.Required("mac"): str,
    vol.Required("perspective"): vol.All([vol.Coerce(float)], vol.Length(min=8, max=8)),
    vol.Required("room_width"): vol.Coerce(float),
    vol.Required("room_depth"): vol.Coerce(float),
})
@websocket_api.async_response
async def websocket_set_setup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save perspective calibration for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
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
    await manager._store.async_save()

    # Push calibration to device
    await manager._push_config_to_device(mac)

    # Enable zone 0 now that device is calibrated
    from .const import MAX_ZONES
    zone_slots = device_config.get("room_layout", {}).get("zone_slots", [None] * MAX_ZONES)
    await manager.async_update_zone_entities(mac, zone_slots)

    connection.send_result(msg["id"])


# -- set_room_layout --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_room_layout",
    vol.Required("mac"): str,
    vol.Required("grid_bytes"): [int],
    vol.Required("zone_slots"): list,
    vol.Required("room_type"): str,
    vol.Optional("room_trigger"): vol.Coerce(int),
    vol.Optional("room_renew"): vol.Coerce(int),
    vol.Optional("room_timeout"): vol.Coerce(float),
    vol.Optional("room_handoff_timeout"): vol.Coerce(float),
    vol.Optional("room_entry_point", default=False): bool,
    vol.Optional("furniture", default=[]): list,
})
@websocket_api.async_response
async def websocket_set_room_layout(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save room layout, zones, and furniture for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["room_layout"] = {
        "grid_bytes": msg["grid_bytes"],
        "zone_slots": msg["zone_slots"],
        "room_type": msg["room_type"],
        "room_trigger": msg.get("room_trigger"),
        "room_renew": msg.get("room_renew"),
        "room_timeout": msg.get("room_timeout"),
        "room_handoff_timeout": msg.get("room_handoff_timeout"),
        "room_entry_point": msg.get("room_entry_point", False),
        "furniture": msg.get("furniture", []),
    }
    await manager._store.async_save()

    # Push config to device if connected
    dev = manager.devices.get(mac)
    if dev and dev.host:
        await manager._push_config_to_device(mac)

    # Update ESPHome entity enable/disable/rename
    await manager.async_update_zone_entities(mac, msg["zone_slots"])

    connection.send_result(msg["id"])


# -- Template commands --

@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_templates"})
@callback
def websocket_list_templates(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List saved room templates."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    connection.send_result(msg["id"], {"templates": manager._store.templates})


@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/save_template",
    vol.Required("name"): str,
    vol.Required("template"): dict,
})
@websocket_api.async_response
async def websocket_save_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save a room template."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    manager._store.templates[msg["name"]] = msg["template"]
    await manager._store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/delete_template",
    vol.Required("name"): str,
})
@websocket_api.async_response
async def websocket_delete_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a room template."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    manager._store.templates.pop(msg["name"], None)
    await manager._store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/apply_template",
    vol.Required("mac"): str,
    vol.Required("template_name"): str,
})
@websocket_api.async_response
async def websocket_apply_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Apply a template to a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    template = manager._store.templates.get(msg["template_name"])
    if template is None:
        connection.send_error(msg["id"], "not_found", "Template not found")
        return
    device_config = manager._store.devices.setdefault(msg["mac"], {})
    device_config["room_layout"] = dict(template)
    await manager._store.async_save()
    connection.send_result(msg["id"])


# -- Helper --

def _build_entity_key_map(entities: list) -> dict[str, int]:
    """Map entity names to their numeric state keys."""
    key_map = {}
    for entity in entities:
        if hasattr(entity, 'key') and hasattr(entity, 'name'):
            key_map[entity.name] = entity.key
    return key_map


# -- subscribe_raw_targets --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/subscribe_raw_targets",
    vol.Required("mac"): str,
})
@websocket_api.async_response
async def websocket_subscribe_raw_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stream raw target positions from device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = await manager.async_get_or_create_connection(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "not_found", "Device not available")
        return

    key_map = _build_entity_key_map(device_conn._entities)

    # Map raw target sensor keys to indices
    raw_keys = {}
    for i in range(3):
        name = f"Raw Target {i}"
        if name in key_map:
            raw_keys[key_map[name]] = i

    # Accumulated state
    raw_targets = [{"raw_x": None, "raw_y": None} for _ in range(3)]

    @callback
    def _on_state(state: Any) -> None:
        from aioesphomeapi import TextSensorState
        if not isinstance(state, TextSensorState):
            return
        if state.key not in raw_keys:
            return
        idx = raw_keys[state.key]
        if state.state:
            parts = state.state.split(",")
            raw_targets[idx] = {"raw_x": float(parts[0]), "raw_y": float(parts[1])}
        else:
            raw_targets[idx] = {"raw_x": None, "raw_y": None}
        connection.send_message(
            websocket_api.event_message(msg["id"], {"targets": list(raw_targets)})
        )

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        hass.async_create_task(manager.async_release_connection(mac))
    connection.subscriptions[msg["id"]] = _unsub


# -- subscribe_grid_targets --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/subscribe_grid_targets",
    vol.Required("mac"): str,
})
@websocket_api.async_response
async def websocket_subscribe_grid_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stream target positions, zone state, and sensor data from device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = await manager.async_get_or_create_connection(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "not_found", "Device not available")
        return

    key_map = _build_entity_key_map(device_conn._entities)

    # Map target position sensor keys to indices
    target_keys = {}
    for i in range(3):
        name = f"Target {i} Position"
        if name in key_map:
            target_keys[key_map[name]] = i

    # Zone state text sensor key
    zone_state_key = key_map.get("Zone State")

    # Binary sensor keys for sensors dict
    sensor_keys = {}
    for name, field in (
        ("Occupancy", "occupancy"),
        ("Static Presence", "static_presence"),
        ("Motion Presence", "motion_presence"),
        ("Zone Tracking", "target_presence"),
    ):
        if name in key_map:
            sensor_keys[key_map[name]] = field

    # Accumulated state
    targets = [{"x": None, "y": None, "signal": 0, "status": "inactive"} for _ in range(3)]
    sensors = {"occupancy": False, "static_presence": False, "motion_presence": False, "target_presence": False}
    zones = {"occupancy": {}, "target_counts": {}, "frame_count": 0}

    @callback
    def _on_state(state: Any) -> None:
        from aioesphomeapi import TextSensorState, BinarySensorState
        import json as json_mod

        if isinstance(state, TextSensorState):
            if state.key in target_keys:
                idx = target_keys[state.key]
                if state.state:
                    parts = state.state.split(",")
                    targets[idx]["x"] = float(parts[0])
                    targets[idx]["y"] = float(parts[1])
                else:
                    targets[idx] = {"x": None, "y": None, "signal": 0, "status": "inactive"}
                # Send full event on each position update (5Hz)
                connection.send_message(
                    websocket_api.event_message(msg["id"], {
                        "targets": list(targets),
                        "sensors": dict(sensors),
                        "zones": dict(zones),
                    })
                )
            elif zone_state_key is not None and state.key == zone_state_key and state.state:
                # Parse zone state JSON (1Hz)
                try:
                    zs = json_mod.loads(state.state)
                    # Update target signal/status
                    for i, t in enumerate(zs.get("targets", [])):
                        if i < 3:
                            targets[i]["signal"] = t.get("signal", 0)
                            targets[i]["status"] = t.get("status", "inactive")
                    # Update zone data
                    zone_occ = zs.get("zones", {}).get("occupancy", [])
                    zones["occupancy"] = {str(i): v for i, v in enumerate(zone_occ)}
                    zones["frame_count"] = zs.get("frame_count", 0)
                    sensors["target_presence"] = zs.get("zones", {}).get("tracking", False)
                except (ValueError, KeyError):
                    pass

        elif isinstance(state, BinarySensorState):
            if state.key in sensor_keys:
                field = sensor_keys[state.key]
                sensors[field] = state.state

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        hass.async_create_task(manager.async_release_connection(mac))
    connection.subscriptions[msg["id"]] = _unsub


# -- set_entity_enabled --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_entity_enabled",
    vol.Required("mac"): str,
    vol.Required("entity_id"): str,
    vol.Required("enabled"): bool,
})
@callback
def websocket_set_entity_enabled(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Enable or disable an ESPHome entity on a managed device."""
    ent_reg = er.async_get(hass)
    if msg["enabled"]:
        ent_reg.async_update_entity(msg["entity_id"], disabled_by=None)
    else:
        ent_reg.async_update_entity(
            msg["entity_id"], disabled_by=er.RegistryEntryDisabler.INTEGRATION
        )
    connection.send_result(msg["id"])


# -- set_env_calibration --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_env_calibration",
    vol.Required("mac"): str,
    vol.Required("temperature_offset"): vol.Coerce(float),
    vol.Required("humidity_offset"): vol.Coerce(float),
    vol.Required("illuminance_offset"): vol.Coerce(float),
})
@websocket_api.async_response
async def websocket_set_env_calibration(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save environment calibration offsets."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["env_calibration"] = {
        "temperature_offset": msg["temperature_offset"],
        "humidity_offset": msg["humidity_offset"],
        "illuminance_offset": msg["illuminance_offset"],
    }
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])


# -- set_motion_timeout --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_motion_timeout",
    vol.Required("mac"): str,
    vol.Required("timeout"): vol.Coerce(float),
})
@websocket_api.async_response
async def websocket_set_motion_timeout(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save motion timeout."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["motion_timeout"] = {"timeout": msg["timeout"]}
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])


# -- set_tracking --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_tracking",
    vol.Required("mac"): str,
    vol.Required("max_range"): vol.Coerce(float),
})
@websocket_api.async_response
async def websocket_set_tracking(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save tracking sensor configuration."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["tracking"] = {"max_range": msg["max_range"]}
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])


# -- set_static_presence --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_static_presence",
    vol.Required("mac"): str,
    vol.Required("min_range"): vol.Coerce(float),
    vol.Required("max_range"): vol.Coerce(float),
    vol.Required("trigger_range"): vol.Coerce(float),
    vol.Required("sustain_sensitivity"): vol.Coerce(int),
    vol.Required("trigger_sensitivity"): vol.Coerce(int),
    vol.Required("timeout"): vol.Coerce(float),
    vol.Required("on_delay"): vol.Coerce(float),
    vol.Required("led_enabled"): bool,
})
@websocket_api.async_response
async def websocket_set_static_presence(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save static presence sensor configuration."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["static_presence"] = {
        "min_range": msg["min_range"],
        "max_range": msg["max_range"],
        "trigger_range": msg["trigger_range"],
        "sustain_sensitivity": msg["sustain_sensitivity"],
        "trigger_sensitivity": msg["trigger_sensitivity"],
        "timeout": msg["timeout"],
        "on_delay": msg["on_delay"],
        "led_enabled": msg["led_enabled"],
    }
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])


# -- set_pipeline --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_pipeline",
    vol.Required("mac"): str,
    vol.Required("display_interval_ms"): vol.All(vol.Coerce(int), vol.Range(min=50, max=1000)),
    vol.Required("zone_publish_interval_ms"): vol.All(vol.Coerce(int), vol.Range(min=100, max=2000)),
    vol.Required("window_duration_ms"): vol.All(vol.Coerce(int), vol.Range(min=200, max=2000)),
})
@websocket_api.async_response
async def websocket_set_pipeline(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save pipeline settings."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["pipeline"] = {
        "display_interval": msg["display_interval_ms"],
        "zone_publish_interval": msg["zone_publish_interval_ms"],
        "window_duration": msg["window_duration_ms"],
    }
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])
