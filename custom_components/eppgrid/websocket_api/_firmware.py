"""Firmware OTA + dismiss-target commands."""

from __future__ import annotations

import contextlib
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_call_later

from ..const import GRID_COLS
from ..const import GRID_ROWS
from . import _LOGGER
from . import _OTA_LOG_CATEGORY
from . import _OTA_LOG_LEVEL
from . import MAC_SCHEMA
from . import _connection_is_closed
from . import _require_known_device
from . import _require_manager
from . import _send_exception
from . import _send_no_session

# Outer safety net: if no terminal state arrives within 5 minutes after the
# OTA starts, emit `state: error` so the UI doesn't spin forever.
_OTA_OUTER_TIMEOUT_S = 300

# -- update_firmware (trigger OTA) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/update_firmware",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_update_firmware(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Trigger firmware OTA update — delegates to DeviceManager.async_trigger_ota."""
    try:
        await manager.async_trigger_ota(msg["mac"])
    except HomeAssistantError as err:
        _send_exception(connection, msg["id"], "update_failed", err)
        return
    connection.send_result(msg["id"])


# -- subscribe_ota_progress --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/subscribe_ota_progress",
        vol.Required("mac"): MAC_SCHEMA,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_subscribe_ota_progress(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Subscribe to OTA firmware update progress for a device."""
    mac = msg["mac"]
    # Always go through async_open_session: it returns the existing session
    # when one is active and takes one subscriber reference either way, so
    # this watcher and any subscribe_device clients share the connection and
    # the manager only closes it when the LAST reference is released.
    device_conn = None
    with contextlib.suppress(Exception):
        device_conn = await manager.async_open_session(mac)
    if device_conn is None:
        _send_no_session(connection, msg["id"])
        return
    if not device_conn.connected:
        # The connection raced to close between the open and here; treat it
        # the same as "no session" rather than letting subsequent
        # execute_service calls AttributeError — but release the reference
        # the open just took, or the dead session's refcount never drains.
        manager.release_session(mac, device_conn)
        _send_no_session(connection, msg["id"])
        return

    # Start sentinel: latched once we've seen evidence that the device is
    # mid-OTA — either explicit `in_progress=True`, or a `latest != current`
    # reading. We need both signals because a fast OTA can complete between
    # subscribe time and the first state delivery, leaving the panel stuck
    # on "updating" forever if we waited for `in_progress=True`.
    was_in_progress = False
    ever_active = False  # stricter: True only after seeing in_progress=True
    done = False  # shared guard: once a terminal event is sent, stop
    timer_cancel: Any = None  # async_call_later cancel handle for the outer timeout

    # Ensure device logs are subscribed so _on_log callbacks fire
    from aioesphomeapi import LogLevel as ESPLogLevel

    # Shared watcher state lives on the DeviceConnection (`ota`): N
    # concurrent OTA watchers (two tabs, two users) share ONE device log
    # subscription and ONE log-level bump, reverted only when the last
    # watcher releases.
    device_conn.ota.watchers += 1
    if device_conn.ota.watchers == 1:
        if not device_conn.is_log_subscribed:
            device_conn.subscribe_logs(ESPLogLevel.LOG_LEVEL_ERROR)
            device_conn.ota.started_log_sub = True

        # Firmware silences the ESPHome logger to NONE on boot, so even ERROR
        # messages from http_request.ota / http_request.update never leave the
        # device — the subscribe-logs surface above reads nothing. Bump the
        # system log level to Error here so OTA failures actually reach the
        # frontend. Older firmware that doesn't expose this action is left
        # alone (older firmware also doesn't silence to NONE, so it works).
        try:
            await device_conn.async_execute_service(
                "epp_set_log_level",
                {"category": _OTA_LOG_CATEGORY, "level": _OTA_LOG_LEVEL},
            )
            device_conn.ota.bumped_log_level = True
        except HomeAssistantError:
            # Older firmware doesn't expose epp_set_log_level — fine; the
            # ESPHome OTA logger isn't silenced on those builds anyway.
            _LOGGER.debug("Device %s does not expose epp_set_log_level", mac)
        except Exception:
            _LOGGER.debug("Failed to bump device log level for OTA visibility", exc_info=True)

    @callback
    def _arm_timer() -> None:
        nonlocal timer_cancel
        if timer_cancel is not None or done:
            return
        timer_cancel = async_call_later(hass, _OTA_OUTER_TIMEOUT_S, _on_timeout)

    @callback
    def _on_timeout(_now: Any) -> None:
        nonlocal done, timer_cancel
        timer_cancel = None
        if done:
            return
        done = True
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "state": "error",
                    "message": "OTA update timed out",
                    "error_key": "flasher.errors.ota_timeout",
                },
            )
        )

    @callback
    def _cancel_timer() -> None:
        nonlocal timer_cancel
        if timer_cancel is not None:
            timer_cancel()
            timer_cancel = None

    @callback
    def _on_state(state: Any) -> None:
        nonlocal was_in_progress, ever_active, done
        from aioesphomeapi import UpdateState

        if done or not isinstance(state, UpdateState):
            return

        # Latch start sentinel from either signal — see the variable comment.
        if state.in_progress or (
            state.latest_version and state.current_version and state.latest_version != state.current_version
        ):
            was_in_progress = True
            _arm_timer()

        if state.in_progress:
            ever_active = True
            progress = state.progress if state.has_progress else None
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {
                        "state": "updating",
                        "progress": progress,
                    },
                )
            )
            return

        # in_progress=False
        if not was_in_progress:
            return  # baseline / pre-OTA — nothing to report

        if state.current_version and state.current_version == state.latest_version:
            done = True
            _cancel_timer()
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {
                        "state": "success",
                        "version": state.current_version,
                    },
                )
            )
        elif ever_active:
            # We saw in_progress=True earlier and now it's False with the
            # version unchanged — actual install failure.
            done = True
            _cancel_timer()
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {
                        "state": "error",
                        "message": "Update failed — firmware version unchanged",
                        "error_key": "flasher.errors.ota_failed_version_unchanged",
                    },
                )
            )

    @callback
    def _on_log(log_msg: Any) -> None:
        nonlocal done
        if done:
            return

        if log_msg.level != ESPLogLevel.LOG_LEVEL_ERROR:
            return
        text = log_msg.message
        if isinstance(text, bytes):
            text = text.decode("utf-8", errors="replace")
        text = text.rstrip()
        if not text:
            return
        # Drop noise: recovery transitions and the vague unspecified flag.
        # Other `set Error flag: <message>` lines carry an actionable suffix
        # (e.g. "Failed to install firmware") and pass through to the user.
        if "cleared Error flag" in text:
            return
        if "set Error flag: unspecified" in text:
            return
        # Match any OTA-relevant component tag — `.ota` and `.update` are the
        # ESPHome OTA components, `.idf` is the underlying ESP-IDF HTTP
        # client (where ESP_ERR_HTTP_CONNECT etc. surface). Also catches
        # `[E][component:...]: http_request.update set Error flag: ...`
        # because the body mentions the qualified component name.
        if not any(tag in text for tag in ("http_request.ota", "http_request.update", "http_request.idf")):
            return
        done = True
        _cancel_timer()
        # Extract message after the ESPHome component tag
        # Format: [E][http_request.ota:294]: Actual message here
        parts = text.split("]: ", 1)
        clean_msg = parts[1] if len(parts) > 1 else text
        # The frontend renders error events exclusively via `error_key`
        # (flasher-controller falls back to update_failed_generic when the
        # key is absent) — without it, the extracted device message never
        # reaches the user. The key's translation interpolates {message}.
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "state": "error",
                    "message": clean_msg,
                    "error_key": "flasher.errors.ota_device_error",
                },
            )
        )

    async def _async_revert_log_level() -> None:
        # Restore the firmware's `system` category to whatever the user has
        # configured (or "None" if unconfigured). Without this, the device
        # keeps emitting ERROR logs after the OTA panel closes.
        stored_level = manager.store.devices.get(mac, {}).get("log_levels", {}).get(_OTA_LOG_CATEGORY, "None")
        try:
            await device_conn.async_execute_service(
                "epp_set_log_level",
                {"category": _OTA_LOG_CATEGORY, "level": stored_level},
            )
        except Exception:
            _LOGGER.debug("Failed to revert device log level after OTA", exc_info=True)

    def _release_watcher() -> None:
        """Drop this watcher's shared state + session reference.

        The LAST watcher reverts the shared log-level bump and tears down
        the log subscription it started — unless its release also closed
        the session (no other subscribers). In that case the log
        subscription dies with the connection, but the bumped device-side
        log LEVEL persists across connections; we still skip the revert
        because the closing session can no longer carry the service call.
        The stale level self-heals on the device's next boot (firmware
        resets log levels) or the next config push of the stored
        log_levels.
        """
        ota = device_conn.ota
        ota.watchers -= 1
        # `<= 0` (not `== 0`): a force-closed connection resets the shared
        # state mid-flight, so a late release can land on an already-zeroed
        # counter — clamp instead of going negative.
        last_watcher = ota.watchers <= 0
        bumped = started = False
        if last_watcher:
            ota.watchers = 0
            bumped = ota.bumped_log_level
            started = ota.started_log_sub
            ota.bumped_log_level = False
            ota.started_log_sub = False
        closing = manager.release_session(mac, device_conn)
        if not last_watcher or closing is not None:
            return
        if bumped:
            hass.async_create_task(_async_revert_log_level())
        if started:
            device_conn.unsubscribe_logs()

    try:
        await device_conn.subscribe_states(_on_state)
    except Exception:
        # Connection raced to close after the bump — undo this watcher's
        # contributions (revert the bump / drop the log sub if we're the
        # last watcher, release the session reference) before erroring out.
        _LOGGER.debug("Failed to subscribe to states for OTA progress on %s", mac, exc_info=True)
        _release_watcher()
        _send_no_session(connection, msg["id"])
        return
    device_conn.add_log_callback(_on_log)
    connection.send_result(msg["id"])

    released = False

    @callback
    def _unsub() -> None:
        nonlocal released
        if released:
            # Guard the shared counters against a double-invoked unsub —
            # a second decrement would steal another watcher's reference.
            return
        released = True
        _cancel_timer()
        device_conn.unsubscribe_states(_on_state)
        device_conn.remove_log_callback(_on_log)
        _release_watcher()

    connection.subscriptions[msg["id"]] = _unsub
    if _connection_is_closed(connection):
        # The WS connection closed while we were awaiting (session open, log
        # bump, subscribe_states): HA's async_handle_close already ran and
        # will NOT cancel this background task, so the unsub we just
        # registered will never be invoked. Tear down this watcher's shared
        # state and release the refcount the open took, now — otherwise it
        # leaks. `_unsub` routes through the `released`-guarded
        # `_release_watcher`, so it's safe vs. a later call.
        _unsub()


# -- dismiss_target (ephemeral, firmware-only) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/dismiss_target",
        vol.Required("mac"): MAC_SCHEMA,
        vol.Required("target_index"): vol.All(vol.Coerce(int), vol.Range(min=0, max=2)),
        vol.Required("cell_index"): vol.All(vol.Coerce(int), vol.Range(min=0, max=GRID_COLS * GRID_ROWS - 1)),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
@_require_manager
async def websocket_dismiss_target(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
) -> None:
    """Dismiss a target at a specific cell (ephemeral, firmware-only)."""
    if not _require_known_device(connection, manager, msg):
        return
    mac = msg["mac"]

    try:
        session = manager.get_session(mac)
        if session is None:
            # Known device but no live session (offline devices land here
            # too — without a session there's nothing to dismiss against).
            _send_no_session(connection, msg["id"])
            return
        await session.async_dismiss_target(msg["target_index"], msg["cell_index"])
    except Exception as err:
        _send_exception(connection, msg["id"], "dismiss_failed", err)
        return

    connection.send_result(msg["id"])
