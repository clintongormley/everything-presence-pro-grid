"""Card-facing WebSocket commands powering the dashboard overview card.

Unlike every other eppgrid command, these are NOT @require_admin: the overview
card is meant for shared dashboards viewed by household (non-admin) users. They
expose display data and permit one display-data reset (eppgrid/clear_heatmap);
they never mutate device *configuration*.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from typing import Literal

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback

from . import _require_manager
from . import _send_device_not_found
from . import _send_exception
from . import _send_no_session
from ._devices import _make_grid_target_on_state
from ._devices import _make_heatmap_on_state
from ._durable_stream import start_durable_stream


async def _start_overview_stream(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
    *,
    counter_attr: str,
    make_on_state: Callable[[str, Any], Callable[[Any], None]],
    send_snapshot: bool,
    protocol: Literal["frames_only", "closed_only", "full"],
    poll_fn: Callable[[Any], Any] | None = None,
) -> None:
    """Resolve the card's `device_id` to a mac, then start a durable stream.

    `poll_fn`, when given, switches the stream to the POLL delivery seam (issue
    #365, heatmap) — forwarded unchanged to `start_durable_stream`.
    """
    mac = manager.mac_for_device_id(msg["device_id"])
    if mac is None:
        _send_device_not_found(connection, msg["id"])
        return
    await start_durable_stream(
        connection,
        msg,
        manager,
        mac=mac,
        counter_attr=counter_attr,
        make_on_state=make_on_state,
        send_snapshot=send_snapshot,
        protocol=protocol,
        poll_fn=poll_fn,
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/overview/list_devices",
    }
)
@callback
@_require_manager
def websocket_overview_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """List EPP devices (device_id, name, room dimensions) for the card editor's picker.

    Only devices with a registry device_id are returned — the card stores a
    device_id and needs it to resolve a mac server-side on subscribe. Room
    dimensions are included from calibration data (0 when uncalibrated).
    """
    devices = []
    for mac, dev in manager.devices.items():
        if dev.device_id is None:
            continue
        cal = manager.store.devices.get(mac, {}).get("calibration", {})
        devices.append(
            {
                "device_id": dev.device_id,
                "name": dev.name,
                # mm; 0 when the device has no calibration yet. The card editor
                # uses these to show the recommended crop ratio for a floor plan.
                "room_width": cal.get("room_width") or 0,
                "room_depth": cal.get("room_depth") or 0,
            }
        )
    devices.sort(key=lambda d: (d["name"].casefold(), d["device_id"]))
    connection.send_result(msg["id"], devices)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/overview/subscribe",
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
@_require_manager
async def websocket_overview_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream read-only overview data for a device (non-admin).

    Sends one stored-layout snapshot (so the card can draw the room even while
    offline), then registers a durable stream that emits the same
    {targets, sensors, zones} frames as subscribe_grid_targets — and keeps
    emitting them across a connection loss, since the manager re-arms it.
    """
    await _start_overview_stream(
        connection,
        msg,
        manager,
        counter_attr="grid_target_subs",
        make_on_state=lambda mac, dc: _make_grid_target_on_state(connection, msg["id"], mac, dc),
        send_snapshot=True,
        protocol="full",
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/overview/subscribe_heatmap",
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
@_require_manager
async def websocket_overview_subscribe_heatmap(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Stream the on-device activity heatmap for a device (non-admin).

    Resolves the card's device_id to a mac and registers a durable stream, same
    lifecycle as websocket_overview_subscribe, but never sends a config snapshot —
    this command only streams heatmap cells — and never relays the manager's live
    availability notifications, which deployed card bundles would mistake for an
    empty heatmap frame (see `_on_availability`). Polled from the device (issue
    #365) rather than pushed via `subscribe_states`.
    """
    await _start_overview_stream(
        connection,
        msg,
        manager,
        counter_attr="heatmap_subs",
        make_on_state=lambda mac, dc: _make_heatmap_on_state(connection, msg["id"], mac, dc),
        send_snapshot=False,
        protocol="closed_only",
        poll_fn=lambda conn: conn.async_fetch_heatmap(),
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/clear_heatmap",
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
@_require_manager
async def websocket_clear_heatmap(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Clear a device's heatmap (RAM + NVS) (non-admin).

    A display-data reset, not a config mutation — see this module's
    docstring. Resolves the card's device_id to a mac server-side, same as
    the other overview commands, so the client never handles a mac directly.
    """
    mac = manager.mac_for_device_id(msg["device_id"])
    if mac is None:
        _send_device_not_found(connection, msg["id"])
        return
    session = manager.get_session(mac)
    if session is None:
        _send_no_session(connection, msg["id"])
        return
    try:
        await session.async_clear_heatmap()
    except Exception as err:
        _send_exception(connection, msg["id"], "clear_heatmap_failed", err)
        return
    connection.send_result(msg["id"])
