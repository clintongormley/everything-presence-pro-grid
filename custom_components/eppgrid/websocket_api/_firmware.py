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
from ..device_manager import _REBOOT_POLL_INTERVAL_S
from ..device_manager import OtaOutcome
from . import _LOGGER
from . import _OTA_LOG_CATEGORY
from . import _OTA_LOG_LEVEL
from . import MAC_SCHEMA
from . import _connection_is_closed
from . import _require_known_device
from . import _require_manager
from . import _send_exception
from . import _send_no_session

# Outer safety net: if no terminal state arrives within this window after the
# OTA starts, emit `state: error` so the UI doesn't spin forever. The
# firmware-version outcome watcher fast-fails an interrupted flash well before
# this, so this is only reached when the device neither returns on the target
# version nor goes cleanly offline.
_OTA_OUTER_TIMEOUT_S = 240
# Device must sit on the old firmware continuously (after going offline) for
# this long before we call an OTA aborted — debounces a between-chunk online
# blip during the blocking fetch.
_OTA_ABORT_STABLE_S = 10

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

# ESPHome delivers coloured log lines; strip ANSI CSI escape sequences (colour
# codes etc.) before parsing so terminal control codes never reach the panel
# popover — and so a reset code sitting between `]` and `: ` can't defeat the
# component-tag split below.
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def _classify_ota_error_key(message: str, *, served_locally: bool) -> str:
    """Map a device OTA-error log line to the panel error_key it should raise.

    A download/connect failure splits on whether HA served the firmware over the
    LAN: `ota_download_unreachable` (HA may have advertised an address the device
    can't reach — the GitHub-direct retry helps) vs `ota_download_unreachable_direct`
    (the manifest was already GitHub-direct, so retrying GitHub won't help and the
    "from Home Assistant" framing would be wrong — it's the device's own
    connectivity)."""
    if _OTA_DOWNLOAD_FAIL_RE.search(message):
        return (
            "flasher.errors.ota_download_unreachable"
            if served_locally
            else "flasher.errors.ota_download_unreachable_direct"
        )
    return "flasher.errors.ota_device_error"


# -- update_firmware (trigger OTA) --


@websocket_api.websocket_command(
    {
        vol.Required("type"): "eppgrid/update_firmware",
        vol.Required("mac"): MAC_SCHEMA,
        # "auto" (default) prefers HA-local serving with a GitHub-direct
        # fallback; "github" forces the GitHub-direct URL, skipping local
        # serving — the panel's "Download from GitHub" retry for when HA
        # advertised a URL the device can't reach (e.g. HA in Docker).
        vol.Optional("source", default="auto"): vol.In(["auto", "github"]),
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
        # Any source other than "github" (including missing) prefers HA-local
        # serving — the schema defaults it to "auto".
        await manager.async_trigger_ota(msg["mac"], prefer_local=msg.get("source") != "github")
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
    # Best-effort live session — used ONLY for incremental progress logs/state.
    # Right after a device's OTA is triggered it is usually OFFLINE (the
    # http_request download blocks the main loop), so a session frequently can't
    # be opened — especially under "Upgrade all", where only the currently-
    # streamed device has a reusable one. A missing session must NOT abandon the
    # update: the reboot-proof, entity-based outcome watch
    # (`async_wait_for_ota_outcome`, below) reports success/failure with no
    # session at all, so we downgrade to that sessionless path instead of
    # erroring out. `async_open_session` returns the shared session when one is
    # active, taking one subscriber reference released in `_release_watcher`.
    device_conn = None
    with contextlib.suppress(Exception):
        device_conn = await manager.async_open_session(mac)
    if device_conn is not None and not device_conn.connected:
        # Raced closed between open and here — release the reference the open took
        # (else the dead session's refcount never drains), then fall through to the
        # sessionless path rather than AttributeError-ing on it.
        manager.release_session(mac, device_conn)
        device_conn = None

    # Start sentinel: latched once we've seen evidence that the device is
    # mid-OTA — either explicit `in_progress=True`, or a `latest != current`
    # reading. We need both signals because a fast OTA can complete between
    # subscribe time and the first state delivery, leaving the panel stuck
    # on "updating" forever if we waited for `in_progress=True`.
    was_in_progress = False
    ever_active = False  # stricter: True only after seeing in_progress=True
    saw_progress = False  # True once real download bytes flow (has_progress set)
    primed_started = False  # sessionless-prime "started" signal, kept OUT of saw_progress
    url_retries = 0  # empty-URL-race re-issues fired so far (see _OTA_EMPTY_URL_*)
    done = False  # shared guard: once a terminal event is sent, stop
    timer_cancel: Any = None  # async_call_later cancel handle for the outer timeout
    version_task: Any = None  # reboot-proof completion watch (firmware-version return)
    retry_task: Any = None  # background re-open of a live session during the download

    def _prime_ota_started() -> None:
        # Prime the OTA-start sentinels. The frontend only subscribes AFTER a
        # successful trigger, so the OTA is in flight; latch it as started so
        # `_await_ota_outcome` reports success (version->target) / fast-fails an
        # abort even when no live `_on_state` fires. On the sessionless path there
        # is no `_on_state` at all; on the held-session path `_on_state` exists but
        # may never fire (the panel can subscribe after the fast download's
        # in_progress states have passed). Latch a SEPARATE `primed_started`
        # flag rather than `saw_progress`: the outcome watch keys "started" off
        # `saw_progress or primed_started`, while `_on_state` keeps `saw_progress`
        # as its REAL download-byte flag. Otherwise, once the background retry
        # attaches a live session, a primed `saw_progress` would defeat that
        # method's zero-byte empty-URL step-aside and surface a premature failure.
        # Known gap: the firmware's empty-URL manifest-race retry is log-driven
        # (see `_on_log`), so on the pure sessionless path (no session ever
        # attaching) an old (<1.2.1) device that hits that race falls to the outer
        # timeout instead of auto-retrying. The race is fixed forward in firmware,
        # so this only affects upgrades from pre-1.2.1.
        nonlocal was_in_progress, primed_started
        was_in_progress = True
        primed_started = True

    # `_on_log` (below) references ESPLogLevel even on the sessionless path where
    # it is never registered, so import it unconditionally. `_attach_live_session`
    # uses it too for the shared log subscription.
    from aioesphomeapi import LogLevel as ESPLogLevel

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
        # A locally-served OTA that never completes is most likely a device that
        # couldn't reach HA to download it — especially on the sessionless path,
        # where the device error log that would classify a connect failure isn't
        # available (only the streamed device gets it, so a plain "Upgrade all"
        # non-selected device would otherwise time out with no escape hatch).
        # Surface the reachability error, which offers the "Download from GitHub"
        # retry, instead of a bare timeout. A GitHub-direct OTA keeps the generic
        # timeout — the device has internet, so switching source wouldn't help.
        if manager.ota_was_locally_served(mac):
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {
                        "state": "error",
                        "message": "no response within the time limit",
                        "error_key": "flasher.errors.ota_download_unreachable",
                    },
                )
            )
            return
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
    def _cancel_retry_task() -> None:
        """Stop the background live-session retry — the subscription is going
        away, so there's no point re-opening a session for progress. Skips
        self-cancellation for symmetry with `_cancel_version_task` (the retry
        never routes back into `_unsub`, so this is defensive)."""
        nonlocal retry_task
        if retry_task is not None and retry_task is not asyncio.current_task():
            retry_task.cancel()
            retry_task = None

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
    def _report_failure(error_key: str) -> None:
        """Send a terminal error event once (idempotent via `done`)."""
        nonlocal done
        if done:
            return
        done = True
        _cancel_timer()
        _cancel_version_task()
        connection.send_message(websocket_api.event_message(msg["id"], {"state": "error", "error_key": error_key}))

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
        text = _ANSI_RE.sub("", text).rstrip()
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
                    "error_key": _classify_ota_error_key(clean_msg, served_locally=manager.ota_was_locally_served(mac)),
                },
            )
        )

    async def _async_revert_log_level(conn: Any) -> None:
        # Restore the firmware's `system` category to whatever the user has
        # configured (or "None" if unconfigured). Without this, the device
        # keeps emitting ERROR logs after the OTA panel closes. Takes the
        # connection explicitly rather than closing over the outer `device_conn`:
        # the subscribe-fail downgrade rebinds `device_conn = None` right after
        # scheduling this task, so a closure would revert against None (a no-op
        # that strands the bump) unless the task's `device_conn` read happened to
        # run eagerly before the rebind — too fragile to rely on.
        stored_level = manager.store.devices.get(mac, {}).get("log_levels", {}).get(_OTA_LOG_CATEGORY, "None")
        try:
            await conn.async_execute_service(
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
        conn = device_conn
        # Both `_release_watcher` call sites guard on `device_conn is not None`, so
        # this never triggers at runtime — it restores the non-None narrowing that
        # #388 removed when it dropped the early returns in favour of the
        # sessionless downgrade. Unreachable, hence excluded from coverage.
        if conn is None:  # pragma: no cover
            return
        ota = conn.ota
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
        closing = manager.release_session(mac, conn)
        if not last_watcher or closing is not None:
            return
        if bumped:
            # `conn` was captured at entry, so it stays the live connection even
            # though the subscribe-fail downgrade may rebind `device_conn` to None
            # right after this call.
            hass.async_create_task(_async_revert_log_level(conn))
        if started:
            conn.unsubscribe_logs()

    async def _attach_live_session(conn: Any) -> bool:
        """Wire this OTA watcher onto a live session for incremental progress.

        Bumps the shared watcher refcount (subscribing device logs + raising the
        log level on the FIRST watcher), then subscribes to UpdateState + error
        logs. On success sets the outer ``device_conn`` to ``conn`` and returns
        True; on ANY attach-step failure (subscribe_logs, the state subscribe, or
        add_log_callback) it unwinds (revert the bump / drop the log sub if we were
        the last watcher, release the session reference) and returns False with
        ``device_conn`` left None, so the caller stays on the sessionless outcome
        watch — it never propagates an ordinary exception. Used both for the
        session opened at subscribe time (where ``_unsub`` isn't registered yet, so
        this self-unwind is the only cleanup path) and for one re-opened by the
        background retry once the device becomes reachable during the download.
        """
        nonlocal device_conn
        device_conn = conn
        # Shared watcher state lives on the DeviceConnection (`ota`): N
        # concurrent OTA watchers (two tabs, two users) share ONE device log
        # subscription and ONE log-level bump, reverted only when the last
        # watcher releases.
        conn.ota.watchers += 1
        try:
            if conn.ota.watchers == 1:
                if not conn.is_log_subscribed:
                    conn.subscribe_logs(ESPLogLevel.LOG_LEVEL_ERROR)
                    conn.ota.started_log_sub = True

                # Firmware silences the ESPHome logger to NONE on boot, so even
                # ERROR messages from http_request.ota / http_request.update never
                # leave the device — the subscribe-logs surface above reads nothing.
                # Bump the system log level to Error here so OTA failures actually
                # reach the frontend. This bump is best-effort (older firmware
                # doesn't expose the action, and doesn't silence to NONE anyway), so
                # its OWN failure must not unwind the attach — hence the inner catch.
                try:
                    await conn.async_execute_service(
                        "epp_set_log_level",
                        {"category": _OTA_LOG_CATEGORY, "level": _OTA_LOG_LEVEL},
                    )
                    conn.ota.bumped_log_level = True
                except HomeAssistantError:
                    # Older firmware doesn't expose epp_set_log_level — fine; the
                    # ESPHome OTA logger isn't silenced on those builds anyway.
                    _LOGGER.debug("Device %s does not expose epp_set_log_level", mac)
                except Exception:
                    _LOGGER.debug("Failed to bump device log level for OTA visibility", exc_info=True)

            await conn.subscribe_states(_on_state)
            conn.add_log_callback(_on_log)
        except Exception:
            # Any attach step (subscribe_logs, subscribe_states, add_log_callback)
            # raised — typically the connection raced to close after the watcher
            # bump. Undo this watcher's contributions (revert the bump / drop the
            # log sub if we're the last watcher, release the session reference),
            # then downgrade to the sessionless outcome watch rather than abandoning
            # the update. At subscribe time `_unsub` isn't registered yet, so this
            # is the ONLY cleanup path there. `CancelledError` is deliberately NOT
            # caught (it derives from BaseException, not Exception): a cancel
            # propagates so the canceller — `_unsub` — owns the single release,
            # avoiding a double free.
            _LOGGER.debug(
                "Failed to attach live OTA session on %s; using sessionless watch",
                mac,
                exc_info=True,
            )
            _release_watcher()
            device_conn = None
            return False
        return True

    if device_conn is not None:
        # A live session was open at subscribe time (the currently-streamed
        # device under "Upgrade all", or a single online device). Attach it.
        await _attach_live_session(device_conn)

    if device_conn is None:
        # No live session (offline mid-reboot/download, a raced-closed open, or a
        # failed attach): fall back to the reboot-proof, entity-based outcome
        # watch. A background retry (below) upgrades this to live progress once
        # the device is reachable again during the download.
        _prime_ota_started()
    elif manager.take_ota_flash_expected(mac):
        # We hold a live session, but `_on_state` may never fire: under "Update
        # all" the panel can subscribe AFTER the fast download's in_progress
        # states have passed, so `was_in_progress` would never latch and the
        # reboot-proof outcome watch's success would be gated out — the device
        # sits on the new version but the spinner hangs. The trigger recorded that
        # a real flash (old->target) is in flight for this mac, so prime the start
        # sentinel. (A device already on target is never marked, so this doesn't
        # fabricate success for it.)
        _prime_ota_started()

    async def _await_ota_outcome() -> None:
        """Classify the OTA off the durable firmware-version signal (reboot-proof;
        the per-connection `_on_state` is torn down by the flash reboot). Fast-fails
        a flash that parked back on the OLD firmware, instead of spinning the full
        outer timeout. (A device that goes offline and never returns is left to the
        outer timer — see OtaOutcome.TIMEOUT.)"""
        try:
            outcome = await manager.async_wait_for_ota_outcome(
                mac,
                FIRMWARE_VERSION,
                _OTA_OUTER_TIMEOUT_S,
                _OTA_ABORT_STABLE_S,
                lambda: saw_progress or primed_started,
            )
        except Exception:
            _LOGGER.debug("Firmware-version outcome watch failed for %s", mac, exc_info=True)
            return
        # Mirror the version-return guard: only act if we actually saw the OTA
        # start (`was_in_progress`), so a device already on FIRMWARE_VERSION can't
        # report instant success and a coincidental offline read can't fabricate a
        # failure.
        if not was_in_progress:
            return
        # A failed flash can also be surfaced by `_on_state` (ota_failed_version_
        # unchanged) if a successor connection delivers the terminal state first;
        # whichever path wins, `done` makes the terminal event idempotent, so the
        # user sees exactly one failure — just possibly a different error_key.
        if outcome == OtaOutcome.SUCCESS:
            _report_success(FIRMWARE_VERSION)
        elif outcome == OtaOutcome.ABORTED:
            _report_failure("flasher.errors.ota_interrupted")
        # OtaOutcome.TIMEOUT → the outer timer (`_on_timeout`) owns it.

    async def _retry_open_session() -> None:
        """Re-open a live session once the device is reachable during the download.

        `async_trigger_ota` reboots the device before flashing (to free heap for
        the TLS handshake), so at subscribe time it is usually OFFLINE and
        `async_open_session` returned None — leaving this watcher on the
        sessionless outcome watch (success/failure only, no incremental bar). The
        device becomes reachable again while downloading (that's how the streamed
        device streams 0→100), but sessions don't auto-reconnect, so poll for one
        here; when a connected session opens, `_attach_live_session` upgrades this
        watcher to stream incremental progress too. Stops on `done`, once a
        session attaches, or after covering the outer-timeout window. Runs as a
        background task tied to this subscription's lifetime — cancelled by
        `_unsub` / the connection-closed teardown, and auto-cancelled on HA
        shutdown.
        """
        nonlocal device_conn

        def _should_stop() -> bool:
            # Read the stop condition through a helper so mypy doesn't narrow
            # `done`/`device_conn` to their pre-await values: both are mutated
            # ACROSS the awaits below — `done` by the terminal callbacks, and
            # `device_conn` by a successful attach — which mypy can't model.
            return done or device_conn is not None

        interval = _REBOOT_POLL_INTERVAL_S
        # Cover roughly the outer-timeout download window; guard div-by-zero when
        # the interval is patched to 0 in tests.
        attempts = int(_OTA_OUTER_TIMEOUT_S / interval) if interval > 0 else _OTA_OUTER_TIMEOUT_S
        for _ in range(max(1, attempts)):
            await asyncio.sleep(interval)
            if _should_stop():
                return
            try:
                conn = await manager.async_open_session(mac)
            except Exception:
                # Device still offline / transient open failure — retry.
                _LOGGER.debug("OTA live-session retry: open failed for %s", mac, exc_info=True)
                continue
            if conn is None:
                continue
            if not conn.connected:
                # Raced closed between open and here — release the reference the
                # open took, then retry.
                manager.release_session(mac, conn)
                continue
            if _should_stop():
                # A terminal event or another attach landed during the open —
                # release the just-opened reference and stop.
                manager.release_session(mac, conn)
                return
            if await _attach_live_session(conn):
                return
            # Attach failed — the connection raced closed during the subscribe.
            # `_attach_live_session` self-unwinds on any ordinary error (releases
            # the session reference it was given and resets device_conn), so just
            # loop and retry on the next tick. A cancel (unsubscribe) propagates out
            # of the awaited attach, ending this task; `_unsub` owns that release.

    if device_conn is None:
        # No `_on_state` to arm the outer safety-net timer, so arm it here — the
        # TIMEOUT outcome is owned by `_on_timeout` (a device that goes offline
        # and never returns falls to it).
        _arm_timer()
        # Background-retry a live session so this device streams incremental
        # progress once it's reachable during the download — the sessionless
        # outcome watch still owns success/failure if a session never opens.
        retry_task = hass.async_create_background_task(_retry_open_session(), name=f"eppgrid_ota_progress_retry_{mac}")
    version_task = hass.async_create_task(_await_ota_outcome())
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
        _cancel_retry_task()
        if device_conn is not None:
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
