"""Flasher and ESPHome device management commands."""

from __future__ import annotations

import asyncio
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from ..const import DOMAIN
from . import _LOGGER
from . import CONFIG_ENTRY_ID_SCHEMA
from . import HOST_SCHEMA
from . import _integration_version
from . import _require_manager
from . import _send_exception


async def _flashable_payload(hass: HomeAssistant, manager: Any) -> dict[str, Any]:
    """Build the payload shared by `subscribe_flashable_devices` / `list_flashable_devices`."""
    from ..const import FIRMWARE_VERSION

    devices = await manager.list_flashable_devices()
    return {
        "devices": devices,
        "firmware_base_url": "/api/eppgrid/firmware",
        "latest_firmware_version": f"v{FIRMWARE_VERSION}",
        "integration_version": _integration_version(hass),
    }


# -- subscribe_flashable_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/subscribe_flashable_devices"})
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_subscribe_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Subscribe to flashable device list changes."""
    # Track every in-flight push so _unsub can cancel them. A single
    # `latest task` reference would lose older tasks when `_on_changed`
    # fires faster than they finish — the older tasks would then keep
    # awaiting `list_flashable_devices` after the subscription is closed.
    in_flight: set[asyncio.Task] = set()
    closed = False

    async def _send_update() -> None:
        try:
            payload = await _flashable_payload(hass, manager)
        except asyncio.CancelledError:
            raise
        except Exception:
            # Subsequent pushes happen on a long-lived subscription — log
            # and skip this update rather than tearing the subscription
            # down on a transient error.
            _LOGGER.exception("Failed to fetch flashable devices for subscriber")
            return
        if closed:
            return
        try:
            connection.send_message(websocket_api.event_message(msg["id"], payload))
        except Exception:
            # Connection closed mid-send (or any other transport error). The
            # subscription is being torn down; just log and bow out.
            _LOGGER.debug("send_message failed for flashable_devices subscriber", exc_info=True)

    @callback
    def _on_changed(_devices: list[dict[str, Any]] | None = None) -> None:
        # `_devices` is the shared `list_devices()` payload the manager
        # fans out to all device-list subscribers; the flashable view needs
        # the richer async `list_flashable_devices()` payload instead, so
        # the argument is accepted (per the callback contract) but unused.
        if closed:
            return
        task = hass.async_create_task(_send_update())
        in_flight.add(task)
        task.add_done_callback(in_flight.discard)

    # Register the change callback BEFORE fetching the initial payload.
    # Otherwise a `_fire_device_list_changed` that lands during the await
    # is silently dropped: `on_device_list_changed` does not replay missed
    # events, so a new subscriber would be stuck with stale data until the
    # next change.
    unsub = manager.on_device_list_changed(_on_changed)

    try:
        initial_payload = await _flashable_payload(hass, manager)
    except Exception as err:
        unsub()
        _send_exception(connection, msg["id"], "fetch_failed", err)
        return

    connection.send_result(msg["id"])
    try:
        connection.send_message(websocket_api.event_message(msg["id"], initial_payload))
    except Exception:
        # Connection went away between send_result and the first event. The
        # `_unsub` wrapper isn't yet in `connection.subscriptions`, so without
        # this cleanup the device-list callback would leak forever.
        _LOGGER.debug("Initial send_message failed for flashable_devices subscriber", exc_info=True)
        unsub()
        return

    @callback
    def _unsub() -> None:
        nonlocal closed
        closed = True
        unsub()
        for task in in_flight:
            if not task.done():
                task.cancel()

    connection.subscriptions[msg["id"]] = _unsub


# -- list_flashable_devices --


@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_flashable_devices"})
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_list_flashable_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """List all EPP devices available for flashing."""
    connection.send_result(msg["id"], await _flashable_payload(hass, manager))


# -- delete_esphome_device --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/delete_esphome_device",
        vol.Required("config_entry_id"): CONFIG_ENTRY_ID_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_delete_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete an ESPHome config entry (and its device/entities)."""
    entry = hass.config_entries.async_get_entry(msg["config_entry_id"])
    if entry is None:
        connection.send_error(
            msg["id"],
            "not_found",
            "Config entry not found",
            translation_domain=DOMAIN,
            translation_key="config_entry_not_found",
        )
        return
    if entry.domain != "esphome":
        connection.send_error(
            msg["id"],
            "invalid_entry",
            "Only ESPHome config entries can be deleted by this command",
            translation_domain=DOMAIN,
            translation_key="only_esphome_can_be_deleted",
        )
        return
    # Scope to EPP hardware: the entry must own at least one device carrying
    # the EPP manufacturer/model signature (same check discovery uses).
    # Without this, an admin panel client could remove ANY ESPHome
    # integration in the installation through this command. Fail-closed:
    # an entry with no registered devices yet is also rejected.
    from homeassistant.helpers import device_registry as dr

    from ..const import EPP_MANUFACTURER
    from ..const import EPP_MODEL

    dev_reg = dr.async_get(hass)
    if not any(
        device.manufacturer == EPP_MANUFACTURER and device.model == EPP_MODEL
        for device in dr.async_entries_for_config_entry(dev_reg, msg["config_entry_id"])
    ):
        connection.send_error(
            msg["id"],
            "not_epp_device",
            "Config entry is not an Everything Presence Pro device",
            translation_domain=DOMAIN,
            translation_key="not_epp_device",
        )
        return
    try:
        await hass.config_entries.async_remove(msg["config_entry_id"])
    except Exception as err:
        _send_exception(connection, msg["id"], "delete_failed", err)
        return
    connection.send_result(msg["id"])


# -- add_esphome_device --


def _map_esphome_flow_result(result: dict[str, Any]) -> dict[str, str]:
    """Map an ESPHome config-flow result dict to a HaAddResult dict."""
    flow_type = result.get("type")
    if flow_type == "create_entry":
        return {"type": "added"}
    if flow_type == "form":
        # HA paused the flow at a form step. Inspect errors to distinguish
        # connection failures (device not yet reachable on port 6053, often
        # because the API server hasn't finished starting) from auth prompts.
        errors = result.get("errors") or {}
        base_error = errors.get("base", "")
        if base_error in ("connection_error", "resolve_error", "cannot_connect"):
            return {"type": "cannot_connect"}
        return {"type": "needs_auth"}
    if flow_type == "abort":
        reason = result.get("reason") or "unknown"
        if reason in ("already_configured", "already_configured_updates"):
            return {"type": "already_added"}
        if reason in ("cannot_connect", "connection_error"):
            return {"type": "cannot_connect"}
        return {"type": "failed", "reason": reason}
    return {"type": "failed", "reason": str(flow_type) if flow_type else "unknown"}


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/add_esphome_device",
        vol.Required("host"): HOST_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_add_esphome_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add an ESPHome device by triggering its config flow."""
    try:
        # If an ESPHome config entry already points at this host, short-circuit.
        # This avoids starting a flow that would need to reach the device before
        # it can return already_configured — which fails if the device API
        # hasn't come up yet.
        host = msg["host"]
        for entry in hass.config_entries.async_entries("esphome"):
            if entry.data.get("host") == host:
                connection.send_result(msg["id"], {"type": "already_added"})
                return

        flow_context: dict[str, Any] = {"source": "user", "user_id": connection.user.id}
        result = await hass.config_entries.flow.async_init(
            "esphome",
            context=flow_context,
            data={"host": host, "port": 6053},
        )
        connection.send_result(msg["id"], _map_esphome_flow_result(result))
    except Exception as err:
        _send_exception(connection, msg["id"], "add_failed", err)
