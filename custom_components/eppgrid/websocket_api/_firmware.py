"""Firmware OTA + dismiss-target commands."""

from __future__ import annotations

import asyncio
import contextlib
import re
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.core import callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_call_later

from ..const import FIRMWARE_VERSION
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

# Deployed firmware's `set_update_manifest` action starts the OTA a fixed 1s
# after kicking off an asynchronous manifest fetch (the fetch runs in a
# background task on ESP32). When several devices flash at once that fetch can
# miss the 1s deadline, so the update forces `perform` with an empty firmware
# URL and no-ops, logging "URL is invalid…" (precursor) then "URL not set;
# cannot start update" (the terminal signal). The manifest is warm after that
# first fetch, so re-issuing it flashes from the now-populated URL. We retry a
# bounded number of times before surfacing the failure. (Root cause is fixed
# forward in firmware >=1.2.1, which waits for the fetch to finish; this keeps
# upgrades from already-deployed firmware working.)
_OTA_EMPTY_URL_SIGNAL = "URL not set"
_OTA_EMPTY_URL_PRECURSOR = "URL is invalid and/or must be prefixed"
_OTA_EMPTY_URL_RETRY_MAX = 3

# Device OTA-error log patterns that mean the firmware download couldn't
# connect/complete — `Code: -1` (transport failure, no HTTP response; anchored
# with `(?!\d)` so `Code: -10x` and other negative codes don't match),
# `ESP_ERR_HTTP_CONNECT` (couldn't open the connection), `ESP_ERR_NO_MEM`
# (explicit OOM). These almost always mean the device couldn't reach the
# download server: with the pre-OTA reboot and HA-local (plain-HTTP) serving,
# the old out-of-heap-for-TLS cause is largely gone. We route them to a distinct
# error_key whose translation points at network reachability instead of the
# opaque ESP_ERR. A positive HTTP status (e.g. `Code: 404`) means the server
# answered, so it falls through to the generic key.
_OTA_DOWNLOAD_FAIL_RE = re.compile(r"ESP_ERR_HTTP_CONNECT|ESP_ERR_NO_MEM|Code: -1(?!\d)")


def _classify_ota_error_key(message: str) -> str:
    """Map a device OTA-error log line to the panel error_key it should raise."""
    if _OTA_DOWNLOAD_FAIL_RE.search(message):
        return "flasher.errors.ota_download_unreachable"
    return "flasher.errors.ota_device_error"


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
    saw_progress = False  # True once real download bytes flow (has_progress set)
    url_retries = 0  # empty-URL-race re-issues fired so far (see _OTA_EMPTY_URL_*)
    done = False  # shared guard: once a terminal event is sent, stop
    timer_cancel: Any = None  # async_call_later cancel handle for the outer timeout
    version_task: Any = None  # reboot-proof completion watch (firmware-version return)

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
        _cancel_version_task()
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
    def _cancel_version_task() -> None:
        """Stop the firmware-version completion poll — the OTA has settled.

        Any terminal event (success, error, timeout) makes the poll pointless:
        on failure the device never reaches the target version, so it would
        otherwise spin the full `_OTA_OUTER_TIMEOUT_S` (pinning its captured
        `entries` closure the whole time — one dangling poll per failed device
        under "update all"). Skips self-cancellation when the version task is
        itself the caller (via `_report_success`), which would raise
        CancelledError into a task that is already finishing.
        """
        nonlocal version_task
        if version_task is not None and version_task is not asyncio.current_task():
            version_task.cancel()
            version_task = None

    @callback
    def _report_success(version: str | None) -> None:
        """Send the terminal success event once (idempotent via `done`)."""
        nonlocal done
        if done:
            return
        done = True
        _cancel_timer()
        _cancel_version_task()
        connection.send_message(websocket_api.event_message(msg["id"], {"state": "success", "version": version}))

    @callback
    def _on_state(state: Any) -> None:
        nonlocal was_in_progress, ever_active, saw_progress, done
        from aioesphomeapi import UpdateState

        if done or not isinstance(state, UpdateState):
            return

        # Latch start sentinel from either signal — see the variable comment.
        if state.in_progress or (
            state.latest_version and state.current_version and state.latest_version != state.current_version
        ):
            was_in_progress = True
            _arm_timer()

        # `has_progress` is only set once the OTA backend reports real download
        # bytes (OTA_IN_PROGRESS). The empty-URL no-op flips in_progress on
        # (INSTALLING) but never gets there, so this stays False for it —
        # letting us tell a zero-byte race from a genuine download that failed.
        if state.in_progress and state.has_progress:
            saw_progress = True

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
            _report_success(state.current_version)
        elif ever_active:
            # We saw in_progress=True earlier and now it's False with the
            # version unchanged. If no bytes ever downloaded (has_progress
            # never set), this is the firmware's empty-URL no-op, not a real
            # install failure — step aside and let the log-driven retry in
            # _on_log own it (or the outer timeout backstop if the error log
            # never arrives). Only a genuine download-then-fail surfaces here.
            if not saw_progress:
                return
            done = True
            _cancel_timer()
            _cancel_version_task()
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
        nonlocal done, url_retries
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
        # Extract message after the ESPHome component tag
        # Format: [E][http_request.ota:294]: Actual message here
        parts = text.split("]: ", 1)
        clean_msg = parts[1] if len(parts) > 1 else text

        # Transparent retry for the firmware's empty-URL manifest race (see the
        # _OTA_EMPTY_URL_* constants). The "URL is invalid…" precursor carries
        # no actionable info and always precedes the "URL not set" signal, so
        # drop it without spending a retry; the signal drives a bounded
        # re-issue of the (now-warm) manifest before we surface a failure.
        if _OTA_EMPTY_URL_PRECURSOR in clean_msg:
            return
        if _OTA_EMPTY_URL_SIGNAL in clean_msg and url_retries < _OTA_EMPTY_URL_RETRY_MAX:
            url_retries += 1
            _LOGGER.info(
                "OTA for %s started before its firmware manifest finished loading; re-issuing (%d/%d)",
                mac,
                url_retries,
                _OTA_EMPTY_URL_RETRY_MAX,
            )
            hass.async_create_task(manager.async_resend_ota_manifest(mac))
            return

        done = True
        _cancel_timer()
        _cancel_version_task()
        # The frontend renders error events exclusively via `error_key`
        # (flasher-controller falls back to update_failed_generic when the
        # key is absent) — without it, the extracted device message never
        # reaches the user. The key's translation interpolates {message}.
        # A download/connect failure gets the low-memory key, which explains
        # the likely cause and the reboot-and-retry remedy rather than just
        # echoing the raw ESP_ERR.
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "state": "error",
                    "message": clean_msg,
                    "error_key": _classify_ota_error_key(clean_msg),
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

    async def _await_version_return() -> None:
        """Report success once the device returns on the target firmware version.

        The `_on_state` path only sees success when the terminal
        `current==latest` UpdateState arrives before the flash reboot tears down
        the connection it's subscribed to — a race the panel usually loses
        (fast local serving, concurrent multi-device updates). This watches the
        durable firmware-version entity instead, so completion is confirmed the
        same way a page refresh does: the device coming back on the new version.
        """
        try:
            reached = await manager.async_wait_for_firmware_version(mac, FIRMWARE_VERSION, _OTA_OUTER_TIMEOUT_S)
        except Exception:
            _LOGGER.debug("Firmware-version completion watch failed for %s", mac, exc_info=True)
            return
        # Only treat "on target version" as success if we actually saw an OTA
        # start (`was_in_progress` — mirrors the `_on_state` guard). Otherwise a
        # device already on FIRMWARE_VERSION when OTA is (re-)triggered would
        # report instant success off the first poll without any flash happening.
        if reached and was_in_progress:
            _report_success(FIRMWARE_VERSION)

    version_task = hass.async_create_task(_await_version_return())
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
        _cancel_version_task()
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
