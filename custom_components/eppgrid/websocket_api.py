"""WebSocket API for EPP Grid frontend."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

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
    """Stream target positions and zone state from device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = await manager.async_get_or_create_connection(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "not_found", "Device not available")
        return

    @callback
    def _on_state(state: Any) -> None:
        """Forward device state to frontend."""
        from aioesphomeapi import BinarySensorState, SensorState, TextSensorState

        data: dict[str, Any] = {}
        if isinstance(state, TextSensorState):
            data = {"type": "text", "key": state.key, "state": state.state}
        elif isinstance(state, BinarySensorState):
            data = {"type": "binary", "key": state.key, "state": state.state}
        elif isinstance(state, SensorState):
            data = {"type": "sensor", "key": state.key, "state": state.state}
        if data:
            connection.send_message(
                websocket_api.event_message(msg["id"], data)
            )

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        hass.async_create_task(manager.async_release_connection(mac))

    connection.subscriptions[msg["id"]] = _unsub
