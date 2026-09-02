"""Device manager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections.abc import AsyncIterator
from collections.abc import Awaitable
from collections.abc import Callable
from collections.abc import Coroutine
from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from aioesphomeapi import APIConnectionError
from aioesphomeapi import LogLevel
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.const import STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.core import State
from homeassistant.core import callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.event import async_track_state_change_event

from ..const import FIRMWARE_VERSION
from ..const import MAX_ZONES
from ..const import empty_zone_slots
from ..dr_compat import all_devices
from ..firmware_cache import FW_CACHE_URL_PREFIX
from ..firmware_cache import async_local_ota_manifest_url
from ..storage import EPPGridStore
from ._connection import DeviceConnection
from ._connection import OtaWatcherState as OtaWatcherState  # re-export for tests
from ._helpers import ZONE_TYPE_DEFAULTS as ZONE_TYPE_DEFAULTS  # re-export for tests
from ._helpers import _area_name
from ._helpers import _compare_firmware_version
from ._helpers import _compute_pipeline
from ._helpers import _esphome_object_id
from ._helpers import _extract_host
from ._helpers import _extract_mac
from ._helpers import _extract_noise_psk
from ._helpers import _is_epp_device
from ._helpers import _is_esphome_entity
from ._helpers import _raise_service_unavailable as _raise_service_unavailable  # re-export for tests
from ._helpers import _resolve_zone_name
from ._helpers import _sync_firmware_repair_issue
from ._helpers import is_valid_zone_slots_shape
from ._helpers import strip_unsupported_pipeline_fields
from ._streams import StateStream

_LOGGER = logging.getLogger(__name__)


class OtaOutcome(StrEnum):
    """Terminal classification of an OTA attempt (see async_wait_for_ota_outcome).

    StrEnum so callers/tests may still compare against the raw string, but the
    members give the manager -> watcher contract a typo-proof, greppable surface
    (a mistyped member is an immediate AttributeError, not a silent no-op).
    """

    SUCCESS = "success"
    ABORTED = "aborted"  # flash didn't take: device settled back on the old version
    TIMEOUT = "timeout"  # outer window elapsed, or the device was never watched


# Pre-flight reboot before an OTA. A freshly-booted device has its full heap; on
# a no-PSRAM ESP32 the resident BLE stack + fragmentation otherwise leave too
# little for the OTA's mbedTLS handshake, and the download fails mid-flight with
# ESP_ERR_HTTP_CONNECT. We press the device's Restart Device button and wait for
# the firmware_version sensor to cycle offline -> online before handing it the
# OTA manifest. Tunables:
_REBOOT_POLL_INTERVAL_S = 2
# Soft: how long to watch for the device to drop off after the restart press.
# A clean reboot closes the API connection within a second or two, so this only
# needs to cover the disconnect-detection lag. Kept short so a fast reboot whose
# offline blip we never observe (or a no-op press) adds little latency before
# the hard online wait below — which is the real correctness guard.
_REBOOT_OFFLINE_TIMEOUT_S = 12
# Hard: how long to wait for it to come back. Exceeding this means the reboot
# didn't recover, so we raise rather than flash a non-responsive device.
_REBOOT_ONLINE_TIMEOUT_S = 90

# How long `async_trigger_ota` keeps the session it opened alive after the
# trigger, waiting for `subscribe_ota_progress` to reuse it. The device refuses
# NEW API connections once the download starts, so the session must be opened
# BEFORE the trigger and held across the gap until the panel subscribes (~12s
# observed under a bulk "Update all"). Generous margin; the subscriber's own ref
# becomes the keep-alive once it attaches.
_OTA_SESSION_GRACE_S = 45

# Transient errors that justify retrying the build-flags fetch on next call.
# Anything else (AttributeError, TypeError, ...) signals a programmer bug and
# should propagate so the test suite catches it instead of getting silently
# swallowed at debug level.
_BUILD_FLAGS_TRANSIENT: tuple[type[BaseException], ...] = (
    TimeoutError,
    asyncio.TimeoutError,
    OSError,
    ValueError,
    RuntimeError,
    APIConnectionError,
)
_BUILD_FLAGS_CONNECT_TRANSIENT: tuple[type[BaseException], ...] = (
    TimeoutError,
    asyncio.TimeoutError,
    OSError,
    ConnectionError,
    APIConnectionError,
)

# States that count as "device offline" for the availability transition guard.
# Treat 'unknown' like 'unavailable' — newly-added ESPHome entities can go
# unknown → value without passing through unavailable, and that transition
# still means the device just came online.
_OFFLINE_STATES: frozenset[str] = frozenset({STATE_UNAVAILABLE, STATE_UNKNOWN})
# `read_firmware_version` treats unavailable, unknown, AND empty string as
# 'no data'. Mirror that for the firmware-arrival guard in `_on_state_changed`;
# otherwise `unavailable → "" → real_version` would slip past because the
# second transition has `old_state=""` which the narrower `_OFFLINE_STATES`
# set wouldn't match, and the push retrigger would never fire.
_FW_OFFLINE_STATES: frozenset[str] = frozenset({STATE_UNAVAILABLE, STATE_UNKNOWN, ""})

#: Default debounce delay for `_request_push` / `request_push`.
_PUSH_DEBOUNCE_DEFAULT: float = 0.1
#: Default delay for `_schedule_entity_update_clear` / `schedule_entity_update_clear`.
_ENTITY_UPDATE_CLEAR_DEFAULT: float = 60.0

#: Type for device-list-change callbacks. The shared payload must be treated
#: as read-only — all subscribers receive the **same** list object, so
#: mutating it would corrupt other subscribers' view of the data.
DeviceListCallback = Callable[[list[dict[str, Any]]], None]


@dataclass
class ManagedDevice:
    """Tracked ESPHome device with zone engine firmware.

    Fields partition into:
      * discovery-derived, re-synced in place on every discovery pass:
        ``name``, ``host``, ``esphome_config_entry_id``, ``device_id``
      * runtime, preserved across rediscovery: ``available``
    """

    mac: str
    name: str
    host: str | None = None
    esphome_config_entry_id: str | None = None
    device_id: str | None = None
    available: bool = False

    def update_from_discovery(
        self,
        *,
        name: str,
        host: str | None,
        esphome_config_entry_id: str | None,
        device_id: str | None,
    ) -> None:
        """Re-sync the discovery-derived fields in place, preserving runtime state.

        Replacing the object instead would reset ``available`` to the
        dataclass default (False); the next real offline transition would
        then fail the ``dev.available`` guard in ``_on_state_changed`` and
        never fire the device-list broadcast — the panel would show the
        device available through the whole outage.
        """
        self.name = name
        self.host = host
        self.esphome_config_entry_id = esphome_config_entry_id
        self.device_id = device_id


class DeviceManager:
    """Discovers ESPHome zone engine devices, manages connections and config."""

    # Per-call disconnect timeout used by async_stop. Class-level so tests
    # can shorten it via instance attribute without subclassing.
    _disconnect_timeout: float = 5.0
    # Bound on the task-drain phase of async_stop. A hung
    # _on_device_available / _on_device_removed / async_discover task
    # would otherwise block unload indefinitely; on timeout the surviving
    # tasks are cancelled and we move on.
    _stop_timeout: float = 5.0
    # Trailing-edge debounce window for `_request_discover`. Class-level so
    # tests can shorten it via instance attribute without subclassing.
    _discover_debounce: float = 1.0
    # Connect timeout for short-lived `_temp_connection` connections (OTA
    # fallback, build-flags fetch, on-boot config push). Class-level so tests
    # can shorten it via instance attribute without subclassing.
    _temp_connection_timeout: float = 30.0

    def __init__(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        self._hass = hass
        self._store = store
        self.devices: dict[str, ManagedDevice] = {}
        # Reverse index device_id → mac, kept in sync with `self.devices` at
        # every insert/remove site so registry-update dispatch is O(1) instead
        # of O(N) per HA device-registry event.
        self._device_id_to_mac: dict[str, str] = {}
        # Cache of (fw_ver, device_name) used in the last Repairs sync per mac.
        # `_on_device_registry_updated` fires on every HA device-registry change
        # (rename, area edit, label tweak…); only re-touch the issue registry
        # when something the issue depends on actually changed.
        self._last_repair_sync: dict[str, tuple[str | None, str]] = {}
        self._unsub_listeners: list[Any] = []
        self._pushing: set[str] = set()
        self._entity_update_macs: set[str] = set()
        # Cancel callables for the 60s "clear from _entity_update_macs" timers
        # scheduled by _schedule_entity_update_clear, keyed by mac. Tracked so
        # async_stop can cancel any in-flight handles instead of leaking them
        # past the config entry's lifetime.
        self._entity_update_clear_cancels: dict[str, Any] = {}
        # Cancel callables for the grace-window timers scheduled by
        # `_schedule_ota_session_release`, keyed by mac. The trigger opens a
        # session and holds it past the OTA trigger so `subscribe_ota_progress`
        # can reuse it to stream progress; this timer drops the trigger's own
        # ref after the grace window. Tracked so `async_stop` can cancel any
        # in-flight handle instead of leaking it past the config entry.
        self._ota_session_releases: dict[str, Any] = {}
        # Macs with a REAL OTA flash (old firmware -> target) in flight, recorded
        # by `async_trigger_ota`. `subscribe_ota_progress` consumes this to prime
        # the reboot-proof outcome watch for a held-session device whose live
        # `_on_state` never fires (the panel can subscribe after the fast download's
        # in_progress states have passed) — WITHOUT fabricating success for an
        # already-current device (the trigger never marks those).
        self._ota_flash_expected: set[str] = set()
        self._build_flags: dict[str, dict[str, Any]] = {}
        # One connection per device, kept alive for the frontend session
        self._active_connections: dict[str, DeviceConnection] = {}
        # Subscriber references to `_active_connections[mac]`. Incremented by
        # every successful async_open_session, decremented by release_session;
        # the session closes only when the LAST reference is released. Force-
        # close paths (device offline/removed, shutdown) bypass the count and
        # reset it — the session is dead regardless of who holds references.
        self._session_refcounts: dict[str, int] = {}
        # Live frontend target-stream subscriber counts, keyed by mac then by
        # stream kind ("raw_target_subs" / "grid_target_subs"). These gate the
        # device's emission pipeline (see `_compute_pipeline`). They live HERE,
        # at the manager/mac level, NOT on the ephemeral `DeviceConnection`:
        # a device flap tears the connection down and reopens a fresh one whose
        # own counters would start at zero, so a pipeline computed from those
        # would tell the device "no subscribers" and silence it while clients
        # are still subscribed — the v1.1.0 "target disappears in the editor"
        # freeze. Keyed by mac, the counts survive connection replacement, and
        # `async_open_session` re-pushes the pipeline on reopen so emission
        # resumes without a page refresh.
        self._target_subs: dict[str, dict[str, int]] = {}
        # Durable frontend state streams, keyed by mac. A `DeviceConnection` is
        # disposable — it dies on a device flap and `_release_references` drops
        # every state subscriber with it — but a WS client's subscription is not:
        # it stays open until the client goes away. These streams are the unit we
        # re-arm across that replacement (see `_ensure_streams`), which is what
        # keeps the dashboard card streaming after a flap instead of silently
        # freezing until the card element remounts (#334).
        self._state_streams: dict[str, list[StateStream]] = {}
        # Serializes `_ensure_streams` per mac so two triggers (session lost +
        # device available) can't both arm the same stream. Entries are NEVER
        # dropped when a mac's last stream unsubs — only when the device itself
        # goes away — because serialization is by lock *identity*: a pass can be
        # holding (or queued on) this lock across an `async_open_session` await
        # while the stream list empties, and swapping in a fresh lock would let
        # the next pass run concurrently with that holder. Both would then arm
        # the same stream: two callbacks on one connection (every frame
        # delivered twice, one callback orphaned) and a session ref that is
        # never released. Same rule as `_session_locks` / `_push_locks` /
        # `_ota_locks`.
        self._stream_locks: dict[str, asyncio.Lock] = {}
        # Retry backoff for arming streams when HA reports the device available but
        # our own API connect fails (the ESP32's API slots are limited, and HA's
        # entity state lags a reboot). Without it a stream would sit unarmed until
        # the next availability transition — which may never come. ONE task per mac
        # drives the whole sequence (`_schedule_stream_retry`); the last delay
        # repeats for as long as unarmed streams remain. Instance attributes so
        # tests can shrink the delays.
        self._stream_retry_delays: tuple[float, ...] = (1.0, 3.0, 9.0, 30.0)
        self._stream_retry_tasks: dict[str, asyncio.Task] = {}
        # Skip cache for the static-presence (DFRobot) reconfigure, keyed by mac.
        # Lives HERE, at the manager/mac level, NOT on the ephemeral
        # `DeviceConnection` (same rationale as `_target_subs`): re-running the
        # reconfigure stops/restarts the sensor for ~8s, so it must only fire
        # when a static parameter actually changes. A per-connection cache would
        # start empty after every flap/page-refresh and reconfigure needlessly;
        # keyed by mac it survives connection replacement. Shared by reference
        # into each `DeviceConnection` and cleared on device offline so the first
        # push after a (re)join re-applies.
        self._static_presence_cache: dict[str, dict[str, Any]] = {}
        self._session_locks: dict[str, asyncio.Lock] = {}
        # Serializes `_push_config_to_device` per mac. Without this, the
        # firmware_version-arrival re-spawn in `_on_state_changed` could
        # land while the initial `_on_device_available` is still mid-
        # `_fetch_build_flags`, opening overlapping connections to the
        # same device — ESP32 has a hard concurrent-connection limit.
        self._push_locks: dict[str, asyncio.Lock] = {}
        # Serializes async_trigger_ota for a given mac. Held only while the
        # set_update_manifest call is in flight; concurrent callers fail-fast
        # with `ota_in_progress` rather than firing a duplicate OTA.
        self._ota_locks: dict[str, asyncio.Lock] = {}
        # The manifest URL actually handed to the device on its most recent
        # async_trigger_ota — either the HA-local URL or the GitHub-direct
        # fallback. async_resend_ota_manifest re-sends this same URL rather
        # than re-resolving, so a resend during the firmware's empty-URL race
        # can't flip a device from local-serving to GitHub-direct mid-flash.
        self._ota_manifest_urls: dict[str, str] = {}
        # In-flight close tasks keyed by mac. async_open_session awaits these
        # before opening so a quick close→reopen doesn't return a connection
        # that the close task is about to disconnect.
        self._pending_closes: dict[str, asyncio.Task] = {}
        # Pending debounce timer per mac for `_request_push`. The dict key
        # supports cancel-prev-on-new-request; tasks are also tracked in
        # `_pending_tasks` (via _spawn) so async_stop's drain catches any
        # that escape the Phase 1 cancel loop.
        self._pending_pushes: dict[str, asyncio.Task] = {}
        # Pending debounce timer per mac for `_request_pipeline_push`. Same
        # lifecycle discipline as `_pending_pushes` (cancel-prev-on-new-request,
        # tracked via _spawn, cancelled in async_stop Phase 1) but debounces the
        # pipeline push — a card mounting with heatmap opens two subscribe
        # commands back-to-back, each of which kicks a pipeline push.
        self._pending_pipeline_pushes: dict[str, asyncio.Task] = {}
        # Pending debounce timer for `_request_discover` — same lifecycle
        # discipline as `_pending_pushes` (cancel-prev-on-new-request,
        # tracked via _spawn, cancelled in async_stop Phase 1). One slot,
        # not per-mac: discovery is a single full-registry scan.
        self._pending_discover: asyncio.Task | None = None
        # Macs whose last debounced push returned False (no host, exception,
        # offline mid-reload). The entity-update guard normally suppresses
        # _on_device_available's reconnect push as redundant — but when a
        # debounced push has already failed, the device is unsynced and we
        # need that reconnect push as a recovery path.
        self._failed_pushes: set[str] = set()
        # Macs whose last subscribe_device attempt failed to open a session.
        # Only the *transition* from "OK" → "failing" fires the device-list
        # broadcast; consecutive retries against the same already-failing
        # device are silent so we don't spam every subscriber on every poll.
        self._connection_failed: set[str] = set()
        self._device_list_callbacks: list[DeviceListCallback] = []
        # Unsub callables for ESPHome config-entry update listeners, keyed by entry_id
        self._entry_update_unsubs: dict[str, Any] = {}
        # Tracks fire-and-forget tasks scheduled by event handlers so
        # async_stop can drain them. Tasks self-remove via add_done_callback
        # so the set stays bounded under steady state.
        self._pending_tasks: set[asyncio.Task] = set()
        # Flipped at the very top of async_stop. Guards
        # `_ensure_esphome_entry_listener` so an in-flight async_discover
        # can't re-register a listener after Phase 1 has already cleared
        # `_entry_update_unsubs`.
        self._stopping: bool = False
        # Unsub callable for the targeted state-change tracker. Rebuilt
        # whenever the managed-device set changes — see _refresh_state_listener.
        self._state_track_unsub: Any = None

    @property
    def store(self) -> EPPGridStore:
        """The persistent store backing this manager (no setter; the store object itself is mutable)."""
        return self._store

    def _stopping_now(self) -> bool:
        """Read `_stopping` fresh.

        The plain attribute is narrowed to False by mypy after an early-return
        check and stays narrowed across awaits, so every post-await re-check
        would be flagged unreachable — but `_stopping` can flip during exactly
        those awaits, which is what the re-checks exist to catch. Deliberately
        a method, not a property: mypy narrows a property read the same way
        it narrows a plain attribute, so a second re-check later in the same
        function (e.g. `async_open_session`'s two re-checks) would still be
        flagged. A call expression is not narrowed.
        """
        return self._stopping

    # -- public wrappers ----------------------------------------------------
    # Thin pass-throughs over private implementation methods, so external
    # callers (websocket_api, config_flow, diagnostics) never reach into
    # `_`-prefixed members of the manager.

    @callback
    def request_push(self, mac: str) -> None:
        """Request a debounced config push for `mac` — see `_request_push`."""
        self._request_push(mac)

    @callback
    def request_pipeline_push(self, mac: str) -> None:
        """Request a debounced pipeline push for `mac` — see `_request_pipeline_push`."""
        self._request_pipeline_push(mac)

    @callback
    def fire_device_list_changed(self) -> None:
        """Notify device-list subscribers — see `_fire_device_list_changed`."""
        self._fire_device_list_changed()

    @callback
    def schedule_entity_update_clear(self, mac: str) -> None:
        """Arm the entity-registry-update reload guard for `mac` — see
        ``_schedule_entity_update_clear``."""
        self._schedule_entity_update_clear(mac)

    @callback
    def set_connection_failed(self, mac: str, failed: bool) -> None:
        """Record the outcome of a session-open attempt for `mac`.

        Only the OK→failing *transition* fires the device-list broadcast:
        consecutive failures against an already-failing device are silent so
        every poll/retry doesn't spam every device-list subscriber. Clearing
        (``failed=False``) never broadcasts — a successful open's own flow
        handles any notification it needs.
        """
        if failed:
            if mac not in self._connection_failed:
                self._connection_failed.add(mac)
                self._fire_device_list_changed()
        else:
            self._connection_failed.discard(mac)

    async def async_push_pipeline_to_device(self, mac: str) -> None:
        """Recompute and push pipeline intervals — see `_push_pipeline_to_device`."""
        await self._push_pipeline_to_device(mac)

    @staticmethod
    def manage_log_subscription(conn: DeviceConnection, config: dict[str, Any]) -> None:
        """Sync a connection's device-log subscription with stored log levels
        — see `_manage_log_subscription`."""
        DeviceManager._manage_log_subscription(conn, config)

    @callback
    def on_device_list_changed(self, cb: DeviceListCallback) -> Callable[[], None]:
        """Register a callback for device list changes. Returns an unsub callable.

        The callback receives the fresh ``list_devices()`` payload as its
        single argument — computed ONCE per change event and shared across
        all subscribers, so N subscribers don't trigger N registry scans.
        The shared payload must be treated as read-only — all subscribers
        receive the same list object.
        """
        self._device_list_callbacks.append(cb)

        @callback
        def unsub() -> None:
            if cb in self._device_list_callbacks:
                self._device_list_callbacks.remove(cb)

        return unsub

    @callback
    def _fire_device_list_changed(self) -> None:
        """Notify all subscribers that the device list has changed.

        Computes the ``list_devices()`` payload once and fans it out — each
        subscriber independently re-scanning the registries would make every
        change event O(subscribers x devices x entities).
        """
        if not self._device_list_callbacks:
            return
        devices = self.list_devices()
        for cb in list(self._device_list_callbacks):
            try:
                cb(devices)
            except Exception:
                _LOGGER.exception("Device list change callback failed")

    def _spawn(self, coro: Coroutine[Any, Any, Any]) -> asyncio.Task:
        """Schedule a fire-and-forget coroutine and track the task.

        Tracking is required so async_stop can await in-flight work
        before tearing down — HA 2026.4+ pytest fails the test on any
        task that survives the config entry.
        """
        task = self._hass.async_create_task(coro)
        self._pending_tasks.add(task)
        task.add_done_callback(self._pending_tasks.discard)
        return task

    async def async_start(self) -> None:
        """Start discovery and event listeners."""
        await self.async_discover()
        self._unsub_listeners.append(
            self._hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_entity_registry_updated)
        )
        # Targeted state-change tracker; rebuilt on each managed-device
        # change so we only see events for entities we care about.
        self._refresh_state_listener()
        # Listen for device removal to clean up stored settings
        self._unsub_listeners.append(
            self._hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, self._on_device_registry_updated)
        )
        # Push config to devices that are already available — the
        # state_changed listener only catches future transitions, so devices
        # that connected before the integration loaded would be missed.
        self._kick_available_devices(list(self.devices))

    @callback
    def _schedule_entity_update_clear(self, mac: str, delay: float = _ENTITY_UPDATE_CLEAR_DEFAULT) -> None:
        """Flag mac as having a pending entity-registry-update reload, then
        clear that flag after `delay` seconds.

        The flag suppresses our reaction to the entity-registry events that
        ESPHome fires when it re-discovers entities post-config-push. Any
        prior pending timer for the same mac is cancelled — re-scheduling
        replaces, never stacks. The cancel callable is tracked so async_stop
        can drop in-flight timers cleanly (HA 2026.4+ pytest fails the test
        if a timer outlives the config entry).
        """
        if (cancel := self._entity_update_clear_cancels.pop(mac, None)) is not None:
            cancel()
        self._entity_update_macs.add(mac)
        self._entity_update_clear_cancels[mac] = async_call_later(
            self._hass, delay, lambda _now: self._clear_entity_update(mac)
        )

    @callback
    def _clear_entity_update(self, mac: str) -> None:
        """Timer fire-callback: drop the entity-update flag and the cancel handle."""
        self._entity_update_macs.discard(mac)
        self._entity_update_clear_cancels.pop(mac, None)

    @callback
    def _refresh_state_listener(self) -> None:
        """Rebuild the targeted state-change tracker.

        Drops the previous unsub, computes the entity_id set across every
        managed device, and registers ``async_track_state_change_event``
        for that set. Called on start and whenever managed devices change.
        """
        if self._state_track_unsub is not None:
            self._state_track_unsub()
            self._state_track_unsub = None
        ent_reg = er.async_get(self._hass)
        entity_ids: list[str] = []
        # Iterate a snapshot of values — this method runs from event
        # callbacks, and a concurrent task could add or remove devices
        # mid-rebuild, raising RuntimeError on the live iterator.
        for dev in list(self.devices.values()):
            if dev.device_id is None:
                continue
            for entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
                if entry.platform == "esphome":
                    entity_ids.append(entry.entity_id)
        if not entity_ids:
            return
        self._state_track_unsub = async_track_state_change_event(self._hass, entity_ids, self._on_state_changed)

    async def async_stop(self) -> None:
        """Stop listeners and close all connections.

        Order matters:

        1. Set ``_stopping`` so ``_ensure_esphome_entry_listener`` refuses
           to re-register listeners, then cancel event/state listeners
           and drop ``_entry_update_unsubs`` synchronously so no NEW work
           is spawned (and no entry-update callbacks fire) while we drain.
        2. Drain in-flight tasks (``_pending_tasks`` then
           ``_pending_closes``) under a bounded ``wait_for``. The tracked
           tasks (``_on_device_available``, ``_on_device_removed``,
           ``async_discover``, ``schedule_close_session``) all perform
           network I/O with no internal stop-time timeout, so a hung
           device must not block unload — survivors are cancelled and
           awaited again to settle.
        3. Drop the durable state streams, THEN disconnect all active
           connections in parallel, each bounded by ``_disconnect_timeout``.
           On timeout we force the local cleanup via ``_release_references()``:
           a ``wait_for`` cancelled BEFORE the connection actually stopped means
           aioesphomeapi never gets to schedule its ``on_stop`` task at all, so
           nothing else would ever release the ``DeviceConnection``'s references.
        """
        self._stopping = True

        # Phase 1: stop new work being spawned. With ``_stopping`` set,
        # any in-flight ``async_discover`` that resumes during the task
        # drain will hit the guard in ``_ensure_esphome_entry_listener``
        # and decline to re-register — so it's safe to clear the
        # entry-update unsubs now, BEFORE the drain. Doing so closes the
        # window where a concurrent ``hass.config_entries.async_update_entry``
        # could fire ``_on_esphome_entry_updated`` against a manager
        # that's already half-shut.
        for unsub in self._unsub_listeners:
            unsub()
        self._unsub_listeners.clear()
        for unsub in self._entry_update_unsubs.values():
            unsub()
        self._entry_update_unsubs.clear()
        if self._state_track_unsub is not None:
            self._state_track_unsub()
            self._state_track_unsub = None
        for cancel in self._entity_update_clear_cancels.values():
            cancel()
        self._entity_update_clear_cancels.clear()
        for cancel in self._ota_session_releases.values():
            cancel()
        self._ota_session_releases.clear()
        self._ota_flash_expected.clear()
        # Cancel pending debounce timers from `_request_push`. They're
        # `asyncio.sleep` waits, so cancellation lands inside the helper's
        # CancelledError handler which returns cleanly. Await the gather
        # here (instead of relying on Phase 2's drain) so a degenerate
        # async_stop with no other pending tasks still yields to the loop
        # and lets the cancellations settle before the manager goes away.
        if self._pending_pushes:
            push_tasks = list(self._pending_pushes.values())
            self._pending_pushes.clear()
            for task in push_tasks:
                task.cancel()
            await asyncio.gather(*push_tasks, return_exceptions=True)
        # Same treatment for pending debounced pipeline pushes — a trailing-edge
        # pipeline push must not fire against a manager that's shutting down.
        if self._pending_pipeline_pushes:
            pipeline_push_tasks = list(self._pending_pipeline_pushes.values())
            self._pending_pipeline_pushes.clear()
            for task in pipeline_push_tasks:
                task.cancel()
            await asyncio.gather(*pipeline_push_tasks, return_exceptions=True)
        # The stream-arming backoff tasks get the cancel but NOT the await. The pushes
        # above can be gathered here because a push task drops out of its dict before the
        # network write, so a cancel can only ever land in its debounce sleep.
        # `_stream_retry_tasks[mac]` is deliberately held for the WHOLE of
        # `_ensure_streams`, so this cancel can land inside a session open, the graceful
        # disconnect of a stale connection, or a `subscribe_states` — and awaiting that
        # unwind against a device that has dropped off the network is unbounded, which
        # would defeat `_stop_timeout` as the hard upper bound on unload. `_spawn` tracks
        # the task, so Phase 2's drain settles it under that bound instead.
        for retry_task in self._stream_retry_tasks.values():
            retry_task.cancel()
        self._stream_retry_tasks.clear()
        # Same treatment for long-lived heatmap poll tasks: they loop until cancelled,
        # so the Phase 2 `_drain(_pending_tasks)` (which tracks them via `_spawn`) would
        # otherwise time out waiting for one to settle. Cancel here; `_run_poll_stream`
        # then returns on its next await and the drain awaits its fast settle. Phase 3's
        # `mark_closed` cancel is idempotent, so this leaves that a safe no-op.
        for streams in self._state_streams.values():
            for stream in streams:
                if stream.poll_task is not None:
                    stream.poll_task.cancel()
        # Same treatment for a pending debounced discovery — it must not
        # fire a full-registry scan against a manager that's shutting down.
        if (pending_discover := self._pending_discover) is not None:
            self._pending_discover = None
            pending_discover.cancel()
            await asyncio.gather(pending_discover, return_exceptions=True)

        # Phase 2: drain tracked tasks with a bounded timeout. _pending_tasks
        # is awaited before _pending_closes because state-change callbacks
        # may schedule fresh closes onto _pending_closes; running tasks
        # first lets those schedule first, then the closes drain in one go.
        async def _drain(tasks: list[asyncio.Task], label: str) -> None:
            if not tasks:
                return
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=self._stop_timeout,
                )
            except TimeoutError:
                still_running = [t for t in tasks if not t.done()]
                _LOGGER.warning(
                    "Timed out draining %s on stop; cancelling %d remaining task(s)",
                    label,
                    len(still_running),
                )
                for t in still_running:
                    t.cancel()
                # Give cancelled tasks a tick to settle. Bound this too —
                # a task that suppresses CancelledError would otherwise
                # block async_stop indefinitely, defeating _stop_timeout
                # as a hard upper bound.
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(
                        asyncio.gather(*still_running, return_exceptions=True),
                        timeout=self._stop_timeout,
                    )
                still_alive = sum(1 for t in still_running if not t.done())
                if still_alive:
                    _LOGGER.error(
                        "%d %s task(s) ignored cancellation on stop; leaking",
                        still_alive,
                        label,
                    )

        await _drain(list(self._pending_tasks), "_pending_tasks")
        await _drain(list(self._pending_closes.values()), "_pending_closes")
        self._pending_closes.clear()

        # Phase 3: drop the streams, then disconnect.
        #
        # The streams must go BEFORE the disconnects. aioesphomeapi runs on_stop as an
        # EAGER task — inline within our own `client.disconnect()` for this self-initiated
        # close, arbitrary (from the read loop) for an unexpected drop — so
        # `_on_session_lost` can land at any point: mid-gather, where `_disarm_stream` →
        # `release_session` would take the last session ref and schedule a close AFTER the
        # Phase-2 drain (a task escaping teardown, racing a second disconnect against the
        # one in flight); or after `_state_streams` is gone, where it early-returns and the
        # clients are never told their stream died. Dropping the streams first is what
        # keeps both cases safe. Marking each stream closed also stops an `_arm_stream`
        # still in flight (an un-tracked one, awaited by `async_add_state_stream`) from
        # re-arming it onto a connection we are tearing down. Tearing down here — rather
        # than through `_disarm_stream` — deliberately bypasses `release_session`: the
        # refcounts are dropped wholesale below.
        #
        # `notify_closed` is what separates this from a device flap on the wire: the
        # client's subscription is still open, but the stream behind it is gone and the
        # fresh manager a reload brings up knows nothing of it, so only the client can
        # revive it (by re-subscribing). Iterate copies of both the dict and each list —
        # `notify_closed` hands control to the client, which may unsub other streams (on
        # any mac) in response, re-entering `_close` and mutating what we are walking.
        for streams in list(self._state_streams.values()):
            for stream in list(streams):
                stream.conn = None
                stream.cb = None
                stream.mark_closed()
        self._state_streams.clear()
        self._stream_locks.clear()

        async def _safe_disconnect(conn: DeviceConnection) -> None:
            try:
                await asyncio.wait_for(conn.async_disconnect(), timeout=self._disconnect_timeout)
            except TimeoutError:
                _LOGGER.warning(
                    "Timed out disconnecting from %s; forcing local cleanup",
                    conn._host,
                )
                # wait_for cancelled async_disconnect mid-flight, so
                # _on_stop won't run; release references locally to
                # avoid a phantom-connected wrapper.
                conn._release_references()
            except Exception:
                _LOGGER.warning("Error disconnecting from %s", conn._host, exc_info=True)
                conn._release_references()

        if self._active_connections:
            await asyncio.gather(
                *(_safe_disconnect(c) for c in self._active_connections.values()),
                return_exceptions=True,
            )
        self._active_connections.clear()
        self._session_refcounts.clear()
        self._target_subs.clear()
        self._static_presence_cache.clear()

    def _ota_variant(self, mac: str) -> str:
        """Resolve the firmware variant filename stem for a device.

        Shared by `_ota_manifest_url` and the local-serving path. Raises
        HomeAssistantError with a translation_key on every failure path.
        """
        from ..const import DEFAULT_FIRMWARE_MODEL
        from ..const import DOMAIN as _DOMAIN
        from ..const import FIRMWARE_VARIANTS

        dev = self.devices.get(mac)
        if dev is None:
            raise HomeAssistantError(
                f"Device {mac} not found",
                translation_domain=_DOMAIN,
                translation_key="device_not_found",
            )
        if dev.host is None:
            raise HomeAssistantError(
                f"Device {mac} host unknown",
                translation_domain=_DOMAIN,
                translation_key="device_host_unknown",
            )
        flags = self._build_flags.get(mac, {})
        if not flags:
            raise HomeAssistantError(
                f"Build flags for {mac} not yet available",
                translation_domain=_DOMAIN,
                translation_key="build_flags_unavailable",
            )
        # Firmware from before the `model` flag existed is all Pro; the Lite has
        # only ever run builds that report it. `co2_enabled` predates both and
        # is reported by every build that exposes get_build_flags, so a missing
        # value can only be firmware old enough to be a Pro, which always has it.
        model = flags.get("model") or DEFAULT_FIRMWARE_MODEL
        network = "ethernet" if flags.get("ethernet_enabled") else "wifi"
        co2 = bool(flags.get("co2_enabled", True))
        variant = FIRMWARE_VARIANTS.get((model, network, co2))
        if variant is None:
            # Offering the wrong build is not cosmetic: a mismatched model
            # flashes firmware compiled for different pins, and a CO2 build on a
            # board without the add-on fails the scd4x component and parks the
            # device in error state. No variant can be right here, so refuse.
            raise HomeAssistantError(
                f"No firmware variant for model {model!r} on network type: {network} (co2={co2})",
                translation_domain=_DOMAIN,
                translation_key="no_firmware_variant",
                translation_placeholders={"model": model, "network": network},
            )
        return variant

    def _ota_manifest_url(self, mac: str) -> str:
        """Resolve the pinned-version GitHub Pages manifest URL for a device.

        This is the GitHub-direct fallback URL; the local-serving path in
        `async_trigger_ota` overrides it when HA can serve the firmware itself.
        """
        from ..const import OTA_MANIFEST_BASE_URL

        return f"{OTA_MANIFEST_BASE_URL}/{self._ota_variant(mac)}.json"

    async def async_resend_ota_manifest(self, mac: str) -> None:
        """Re-issue the OTA manifest after the firmware's empty-URL race.

        Deployed firmware's `set_update_manifest` action starts the OTA a fixed
        1 s after kicking off an asynchronous manifest fetch; when several
        devices flash at once that fetch can miss the deadline, so the update
        no-ops with an empty firmware URL ("URL not set; cannot start update").
        The manifest is warm after that first fetch, so a bare re-send flashes
        from the now-populated URL.

        Unlike `async_trigger_ota` this skips the pre-OTA reboot (the device is
        idle — the failed attempt downloaded nothing) and the duplicate-OTA
        guard (this *is* the retry). Best-effort: it logs and swallows every
        failure so it can run from the OTA progress watcher's log callback; the
        watcher's outer timeout still surfaces a terminal failure if the retries
        never take.

        Re-sends the SAME URL `async_trigger_ota` resolved for this device
        (local or GitHub-direct) — falls back to re-resolving only if none was
        stored, so a resend can't flip a device mid-flash from local-serving to
        GitHub-direct (or vice versa).
        """
        manifest_url = self._ota_manifest_urls.get(mac)
        if manifest_url is None:
            try:
                manifest_url = self._ota_manifest_url(mac)
            except HomeAssistantError:
                _LOGGER.warning("Cannot re-issue OTA manifest for %s; build info unavailable", mac, exc_info=True)
                return
        session = self.get_session(mac)
        if session is None:
            _LOGGER.warning("No live session to re-issue OTA manifest for %s", mac)
            return
        try:
            await session.async_execute_service("set_update_manifest", {"url": manifest_url})
            _LOGGER.info("Re-issued OTA manifest for %s (%s)", mac, manifest_url)
        except Exception:
            _LOGGER.warning("Failed to re-issue OTA manifest for %s", mac, exc_info=True)

    async def async_trigger_ota(self, mac: str, *, prefer_local: bool = True) -> None:
        """Trigger firmware OTA update on a device.

        Derives the firmware variant from cached build flags and constructs
        the manifest URL from `OTA_MANIFEST_BASE_URL`. Before handing that URL
        to the device, first attempts HA-local serving (`firmware_cache`): if
        HA can download+verify the firmware and reach the device over the
        LAN, the device fetches it from HA instead, so devices with no
        internet access can still update; this falls back to the
        GitHub-direct `OTA_MANIFEST_BASE_URL` URL whenever local serving isn't
        possible or fails. Either way, calls the device's
        `set_update_manifest` API action over a temporary connection. Shared
        by the panel's `update_firmware` websocket handler and the Repairs
        framework's `FirmwareUpdateRepairFlow`.

        `prefer_local=False` skips HA-local serving entirely and hands the
        device the GitHub-direct URL. This is the panel's "Download from
        GitHub" retry: HA can advertise a URL the device can't reach (e.g. HA
        in a Docker bridge network hands out its container IP), and HA has no
        way to detect that device-side failure — so the user can force the
        direct path, which an internet-connected device can always fetch.

        Raises HomeAssistantError with a translation_key on every failure
        path so callers can map the failure to a user-facing message.
        """
        from ..const import DOMAIN as _DOMAIN

        manifest_url = self._ota_manifest_url(mac)

        # Reject a duplicate OTA before any network I/O: a concurrent trigger
        # for this mac must fail-fast with ota_in_progress, not waste a manifest
        # probe (or let a manifest result mask the in-progress state). We only
        # check `locked()` here; the manifest HEAD below runs OUTSIDE the held
        # lock so a slow probe never blocks an unrelated OTA.
        lock = self._ota_locks.setdefault(mac, asyncio.Lock())
        if lock.locked():
            raise HomeAssistantError(
                f"OTA already in progress for {mac}",
                translation_domain=_DOMAIN,
                translation_key="ota_in_progress",
            )

        # Pre-flight: confirm the pinned-version manifest actually exists before
        # handing its URL to the device. If the release hasn't been published
        # yet (a 404), the device fetches nothing, never reflashes, and the
        # caller's completion poll spins the full timeout before surfacing a
        # misleading "OTA failed mid-flash" error. A quick HEAD lets us bail out
        # immediately with an accurate message. Fail OPEN on connectivity errors
        # reaching the CDN from the HA host — the device fetches over its own
        # network path, so a transient blip on our side must not ground a
        # legitimate update.
        from aiohttp import ClientError
        from aiohttp import ClientTimeout

        session = async_get_clientsession(self._hass)
        try:
            async with session.head(manifest_url, allow_redirects=True, timeout=ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    raise HomeAssistantError(
                        f"Firmware {FIRMWARE_VERSION} is not available to download yet ({manifest_url})",
                        translation_domain=_DOMAIN,
                        translation_key="firmware_not_published",
                        translation_placeholders={"version": FIRMWARE_VERSION},
                    )
        except (ClientError, TimeoutError):
            _LOGGER.warning(
                "Could not reach %s to verify firmware availability; proceeding with OTA anyway",
                manifest_url,
            )

        # Prefer serving the firmware from HA over the LAN so a device with no
        # internet access can still update. Falls back to the GitHub-direct URL
        # (already in `manifest_url`) if HA has no device-reachable URL or the
        # download/verify fails. Reused by async_resend_ota_manifest. Skipped
        # when the caller forces GitHub-direct (`prefer_local=False`).
        from ..const import OTA_MANIFEST_BASE_URL

        if prefer_local:
            dev = self.devices.get(mac)
            local_url = await async_local_ota_manifest_url(
                self._hass,
                dev.host if dev else None,
                OTA_MANIFEST_BASE_URL,
                self._ota_variant(mac),
            )
            if local_url:
                _LOGGER.info("OTA for %s will be served locally from HA (%s)", mac, local_url)
                manifest_url = local_url
        else:
            _LOGGER.info("OTA for %s will be served GitHub-direct (local serving bypassed by request)", mac)
        self._ota_manifest_urls[mac] = manifest_url

        async with lock:
            # Pre-flight: reboot the device so the OTA flashes from a fresh,
            # unfragmented heap. On a no-PSRAM ESP32 the resident BLE stack
            # otherwise leaves too little for the mbedTLS handshake and the
            # download dies mid-flight with ESP_ERR_HTTP_CONNECT (field-confirmed
            # at a ~775 B heap low-water mark; a manual reboot reliably fixes it).
            # Best-effort: a failed reboot must not block the update — the device
            # may still have enough headroom, and if it's truly unreachable the
            # set_update_manifest below fails loudly on its own.
            try:
                await self.async_reboot_and_wait(mac)
            except Exception:
                # Strictly best-effort: any failure (no button, device didn't
                # return, or a stray error from the button-press service) must
                # not block the update. CancelledError is BaseException, so a
                # real cancellation still propagates.
                _LOGGER.warning("Pre-OTA reboot of %s failed; attempting the update anyway", mac, exc_info=True)

            # Record whether a REAL flash (old -> target) is in flight, so
            # `subscribe_ota_progress` can prime the reboot-proof outcome watch even
            # when the held session's `_on_state` never fires (under "Update all" the
            # panel can subscribe after the fast ~30s download's in_progress states
            # have passed). The device is on its OLD firmware here — just rebooted,
            # not yet flashed — so a version != target means a flash will change it;
            # == target means no flash is expected (an already-current device: the
            # watch must not fabricate a success for it).
            dev = self.devices.get(mac)
            current_version = self.read_firmware_version(dev.device_id) if dev is not None else None
            # Only mark when the version is KNOWN and differs. A None reading
            # (offline / unavailable / no device_id) is NOT treated as "flash
            # expected": we can't confirm a real old->target change, and such a
            # device is offline anyway so it takes the sessionless path (which
            # primes on its own). This keeps an unknown state from fabricating a
            # success for a device that may already be current.
            if current_version is not None and current_version != FIRMWARE_VERSION:
                self._ota_flash_expected.add(mac)
            else:
                self._ota_flash_expected.discard(mac)

            # Open (or reuse) a PERSISTENT session and trigger over it, then hold
            # it open. Progress can only stream over a session that exists BEFORE
            # the download starts: once the device is downloading it refuses new
            # API connections (field-confirmed — every re-open reads the device
            # unavailable for the whole download). `subscribe_ota_progress` reuses
            # THIS session to stream 0->100%. `async_open_session` reuses an
            # existing live session when there is one (so it never opens a second
            # connection against the device's per-API-client cap) and takes one
            # subscriber ref, which `_schedule_ota_session_release` drops after a
            # grace window once the panel has had time to subscribe.
            conn = await self.async_open_session(mac)
            if conn is not None:
                triggered = False
                try:
                    await conn.async_execute_service("set_update_manifest", {"url": manifest_url})
                    triggered = True
                except HomeAssistantError:
                    raise
                except Exception as err:
                    # Wrap aioesphomeapi (and any other unexpected) exceptions so
                    # callers see a stable message-bearing type rather than raw
                    # technical text from a third-party library. Carry translation
                    # metadata so the websocket / Repairs surfaces can localize the
                    # message — the docstring promises a translation_key on every
                    # failure path.
                    _LOGGER.warning("OTA via held session for %s failed", mac, exc_info=True)
                    raise HomeAssistantError(
                        f"Could not contact device {mac}: {err}",
                        translation_domain=_DOMAIN,
                        translation_key="ota_trigger_failed",
                        translation_placeholders={"mac": mac, "error": str(err)},
                    ) from err
                finally:
                    if not triggered:
                        # The trigger didn't complete: an error above, or a
                        # `CancelledError` (unload / shutdown / websocket drop) that
                        # skips both excepts because it derives from BaseException.
                        # Drop OUR ref so a failed/cancelled trigger doesn't strand
                        # the held session. On success the grace-window release owns
                        # the ref instead — see below.
                        self.release_session(mac, conn)
                _LOGGER.info("Triggered OTA via held session for %s (manifest=%s)", mac, manifest_url)
                self._schedule_ota_session_release(mac, conn)
                return

            # `async_open_session` returned None: HA marks the device unavailable
            # (entity state can briefly lag the post-reboot reconnect). Fall back to
            # a short-lived connection so the trigger still lands — this device then
            # rides the sessionless outcome watch (no incremental bar, but success/
            # failure is still reported).
            try:
                async with self._temp_connection(mac) as tconn:
                    await tconn.async_execute_service("set_update_manifest", {"url": manifest_url})
                _LOGGER.info("Triggered OTA via temp conn for %s (no held session; manifest=%s)", mac, manifest_url)
            except HomeAssistantError:
                raise
            except Exception as err:
                _LOGGER.warning("OTA temp-conn for %s failed", mac, exc_info=True)
                raise HomeAssistantError(
                    f"Could not contact device {mac}: {err}",
                    translation_domain=_DOMAIN,
                    translation_key="ota_trigger_failed",
                    translation_placeholders={"mac": mac, "error": str(err)},
                ) from err

    def ota_was_locally_served(self, mac: str) -> bool:
        """Whether the OTA manifest URL last handed to `mac` is an HA-local
        served URL (contains the `/eppgrid_fw/` cache path) rather than
        GitHub-direct. Drives the download-failure error message and the
        "Download from GitHub" retry, which only help when HA was the source the
        device couldn't reach — not when the manifest was already GitHub-direct.
        """
        return f"{FW_CACHE_URL_PREFIX}/" in (self._ota_manifest_urls.get(mac) or "")

    async def async_reboot_and_wait(self, mac: str) -> None:
        """Reboot a device and block until it has rebooted and reconnected.

        Presses the device's ESPHome **Restart Device** button (the entity whose
        device_class is ``restart``) and waits for its firmware_version sensor to
        cycle offline -> online, confirming a fresh boot. A freshly-booted device
        has the heap headroom the OTA's TLS handshake needs — the resident BLE
        stack otherwise leaves too little on a no-PSRAM ESP32 and the download
        fails mid-flight with ESP_ERR_HTTP_CONNECT. The button exists on in-field
        firmware, so this works on the old build we're updating *from*.

        Raises HomeAssistantError when no restart button is found or the device
        never reports a version again within the online timeout. Callers that
        treat the reboot as best-effort must catch it.
        """
        from ..const import DOMAIN as _DOMAIN

        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            raise HomeAssistantError(
                f"Device {mac} has no registry device_id; cannot reboot before OTA",
                translation_domain=_DOMAIN,
                translation_key="restart_button_unavailable",
            )
        device_id = dev.device_id

        ent_reg = er.async_get(self._hass)
        entries = er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True)
        restart_entity_id = next(
            (
                entry.entity_id
                for entry in entries
                if entry.platform == "esphome"
                and entry.domain == "button"
                and "restart" in (entry.device_class, entry.original_device_class)
            ),
            None,
        )
        if restart_entity_id is None:
            raise HomeAssistantError(
                f"No Restart Device button found for {mac}; cannot reboot before OTA",
                translation_domain=_DOMAIN,
                translation_key="restart_button_unavailable",
            )

        _LOGGER.info("Rebooting %s before OTA to free heap (pressing %s)", mac, restart_entity_id)
        await self._hass.services.async_call("button", "press", {"entity_id": restart_entity_id}, blocking=True)

        # Confirm a real reboot before the OTA flashes: the firmware_version
        # sensor must first drop off (soft — we may miss the disconnect window,
        # so a still-connected pre-reboot reading isn't mistaken for "back"),
        # then report again (hard — raise if it never returns). The device's
        # entity set is stable across a reboot, so reuse the entries scanned
        # above on every poll instead of re-scanning the registry each time.
        if not await self._poll_until(
            lambda: self.read_firmware_version(device_id, entries=entries) is None,
            _REBOOT_OFFLINE_TIMEOUT_S,
        ):
            # Never saw it drop off — the press likely didn't reboot it. Don't
            # pretend it worked: log it, then still wait for the online check.
            _LOGGER.warning(
                "%s never went offline after the restart press; the reboot may not have taken — continuing anyway",
                mac,
            )
        if not await self._poll_until(
            lambda: self.read_firmware_version(device_id, entries=entries) is not None,
            _REBOOT_ONLINE_TIMEOUT_S,
        ):
            raise HomeAssistantError(
                f"Device {mac} did not come back online within {_REBOOT_ONLINE_TIMEOUT_S}s after reboot",
                translation_domain=_DOMAIN,
                translation_key="device_reboot_timeout",
            )
        _LOGGER.info("%s reconnected after reboot", mac)

    async def _poll_until(self, predicate: Callable[[], bool], timeout_s: float) -> bool:
        """Poll ``predicate`` every ``_REBOOT_POLL_INTERVAL_S`` until it returns
        true or ``timeout_s`` elapses; returns whether it became true in time."""
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            if predicate():
                return True
            await asyncio.sleep(_REBOOT_POLL_INTERVAL_S)
        return False

    def _find_esphome_entry(
        self, device_id: str | None, suffix: str, *, entries: list[er.RegistryEntry] | None = None
    ) -> er.RegistryEntry | None:
        """The registry entry for the ESPHome sensor whose object_id is
        ``suffix`` on a device, or ``None``.

        Shared matcher for `_read_sensor_state` (reads its state) and
        `_firmware_version_entity_id` (returns its entity_id). Matches by exact
        object_id equality (via `_esphome_object_id`, which normalises every HA
        unique_id format), so an unrelated object_id that merely *contains* the
        suffix (e.g. ``max_current_connections`` vs ``current_connections``)
        can't false-match.

        ``entries`` lets the caller pass pre-fetched device entries so callers
        looping over many devices don't re-scan the entity registry per call.
        """
        if device_id is None:
            return None
        if entries is None:
            ent_reg = er.async_get(self._hass)
            entries = er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True)
        for entry in entries:
            if _is_esphome_entity(entry, "sensor", suffix):
                return entry
        return None

    def _read_sensor_state(
        self, device_id: str | None, suffix: str, *, entries: list[er.RegistryEntry] | None = None
    ) -> str | None:
        """Read the live state of the ESPHome sensor whose object_id is
        ``suffix`` on a device.

        Returns the state string, or ``None`` when the device is unknown, the
        entity is unavailable / unknown / empty, or it doesn't exist. See
        `_find_esphome_entry` for the match rule.
        """
        entry = self._find_esphome_entry(device_id, suffix, entries=entries)
        if entry is None:
            return None
        state = self._hass.states.get(entry.entity_id)
        if state is not None and state.state not in (None, "unknown", "unavailable", ""):
            return state.state
        return None

    def read_firmware_version(
        self, device_id: str | None, *, entries: list[er.RegistryEntry] | None = None
    ) -> str | None:
        """Read the Firmware Version text sensor value for a device.

        Returns the version string, or ``None`` when the entity is missing
        or has no live state (see `_read_sensor_state`).

        Callers must treat ``None`` as 'unknown' — never compare against a
        synthetic ``"0.0.0"``, which would collide with a real (very old)
        firmware version and trigger a fake ``firmware_behind`` Repairs issue.
        """
        return self._read_sensor_state(device_id, "firmware_version", entries=entries)

    def _firmware_version_entity_id(
        self, device_id: str | None, *, entries: list[er.RegistryEntry] | None = None
    ) -> str | None:
        """The entity_id of the device's Firmware Version sensor, or None — so
        callers can subscribe to its state-change events (a hard unplug shows up
        as a sub-poll `unavailable` blip a periodic read can miss)."""
        entry = self._find_esphome_entry(device_id, "firmware_version", entries=entries)
        return entry.entity_id if entry is not None else None

    async def async_wait_for_firmware_version(self, mac: str, target: str, timeout_s: float) -> bool:
        """Poll until the device's Firmware Version entity reads ``target``.

        Returns True once it matches within ``timeout_s``, else False. Reads the
        durable HA entity state (via `read_firmware_version`), NOT a device
        connection — so it confirms an OTA completed by observing the device
        return on the new version across the flash reboot, exactly the signal a
        page refresh reads. This is the OTA watcher's reboot-proof completion
        path: its per-connection `subscribe_states` callback is torn down when
        the flash reboot replaces the connection, so the terminal
        `current==latest` UpdateState never reaches it.
        """
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return False
        device_id = dev.device_id
        ent_reg = er.async_get(self._hass)
        entries = er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True)
        return await self._poll_until(
            lambda: self.read_firmware_version(device_id, entries=entries) == target,
            timeout_s,
        )

    async def async_wait_for_ota_outcome(
        self,
        mac: str,
        target: str,
        timeout_s: float,
        abort_stable_s: float,
        download_started: Callable[[], bool],
    ) -> OtaOutcome:
        """Watch the durable firmware-version entity through an OTA and classify it.

        Reads the same reboot-proof signal as `async_wait_for_firmware_version`
        (the Firmware Version entity: a version string when online, ``None`` when
        offline/unavailable), and returns:

          "success" — the device came back on ``target``.
          "aborted" — after the download started, the device went offline (the
                      `http_request` OTA fetch blocks the main loop, so the device
                      reads offline while downloading — and again for the reboot)
                      and then settled back on the OLD firmware, staying there for
                      ``abort_stable_s`` continuously. A successful flash returns
                      on the NEW version; only a flash that did not take (e.g.
                      power lost mid-flash, device runs the old image) parks on the
                      old version. The stability window debounces a brief
                      between-chunk online blip so a still-downloading device is
                      never mis-read as aborted.
          "timeout" — ``timeout_s`` elapsed with none of the above (a device that
                      went offline and never returned falls here — the outer timer
                      owns it).

        ``download_started`` gates all of this so the pre-OTA reboot
        (`async_trigger_ota` reboots before flashing, which also reads as
        offline->back-on-old) is never mistaken for a started download.

        Alongside the 2s poll, a scoped `async_track_state_change_event`
        listener on this device's firmware-version entity latches
        ``went_offline`` on any transition into an offline state — catching the
        sub-poll `unavailable` blip a hard unplug produces (HA holds the stale
        old value through the outage, then surfaces `unavailable` for a fraction
        of a second once it notices the disconnect, by which point the device is
        already back — too brief for the poll to sample). The listener is gated
        on ``download_started()`` so the pre-OTA reboot stays excluded.
        """
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return OtaOutcome.TIMEOUT
        device_id = dev.device_id
        ent_reg = er.async_get(self._hass)
        entries = er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True)

        # Edge-triggered offline catch (see the docstring): the poll below only
        # samples every 2s and misses the sub-second `unavailable` blip a real
        # unplug produces, so listen for the transition too. Gated on
        # `download_started()` directly — not the poll's lagged `armed` latch —
        # so a blip in the first ~2s of the download isn't dropped, while the
        # pre-OTA reboot (no download bytes yet) stays excluded.
        armed = False
        went_offline = False
        old_stable_since: float | None = None

        @callback
        def _on_fw_change(event: Any) -> None:
            nonlocal went_offline, old_stable_since
            if not download_started():
                return
            new_state = event.data.get("new_state")
            if new_state is None or new_state.state in _FW_OFFLINE_STATES:
                # Latch offline AND reset the stability clock — mirrors the poll's
                # `version is None` path — so `abort_stable_s` is measured from the
                # device settling back on the old version *after* the outage. HA
                # holds the stale old value through the outage, so without this a
                # brief blip would find `old_stable_since` already older than the
                # window and abort immediately, false-failing a still-downloading
                # device.
                went_offline = True
                old_stable_since = None

        entity_id = self._firmware_version_entity_id(device_id, entries=entries)
        unsub = (
            async_track_state_change_event(self._hass, [entity_id], _on_fw_change) if entity_id is not None else None
        )
        try:
            deadline = time.monotonic() + timeout_s
            while time.monotonic() < deadline:
                now = time.monotonic()
                version = self.read_firmware_version(device_id, entries=entries)
                if version == target:
                    return OtaOutcome.SUCCESS
                if not armed:
                    if download_started():
                        armed = True
                elif version is None:
                    # Offline (blocking fetch / reboot / genuinely gone). The
                    # level-triggered path — catches a sustained offline the edge
                    # listener can't — and it resets the stability clock so a brief
                    # blip can't accumulate toward an abort.
                    went_offline = True
                    old_stable_since = None
                else:
                    # Online on a non-target (old) version.
                    if old_stable_since is None:
                        old_stable_since = now
                    if went_offline and now - old_stable_since >= abort_stable_s:
                        return OtaOutcome.ABORTED
                await asyncio.sleep(_REBOOT_POLL_INTERVAL_S)
            return OtaOutcome.TIMEOUT
        finally:
            if unsub is not None:
                unsub()

    def read_current_connection_count(
        self, device_id: str | None, *, entries: list[er.RegistryEntry] | None = None
    ) -> int | None:
        """Read the Current Connections sensor value for a device.

        Returns the count (int), or None if the entity is missing or unavailable.
        """
        raw = self._read_sensor_state(device_id, "current_connections", entries=entries)
        if raw is None:
            return None
        try:
            return int(float(raw))
        except (ValueError, TypeError):
            return None

    async def async_discover(self) -> None:
        """Scan entity registry for ESPHome devices with firmware_version."""
        ent_reg = er.async_get(self._hass)
        dev_reg = dr.async_get(self._hass)

        found_new = False
        ids_changed = False
        newly_discovered: list[str] = []
        for entry in ent_reg.entities.values():
            if entry.platform != "esphome":
                continue
            if entry.domain != "sensor":
                continue
            if _esphome_object_id(entry.unique_id) != "firmware_version":
                continue
            if entry.device_id is None:
                continue

            device = dev_reg.async_get(entry.device_id)
            if device is None:
                continue

            if not _is_epp_device(device):
                continue

            mac = _extract_mac(device)
            if mac is None:
                continue

            host = _extract_host(device, entry.config_entry_id, self._hass)
            device_name = device.name_by_user or device.name or "EPP Device"

            is_new = mac not in self.devices
            existing = self.devices.get(mac)
            # Detect re-add flows where the same MAC reappears under a
            # different HA device_id or ESPHome config_entry_id. The
            # entity_ids attached to that mac change, so the targeted
            # state-change tracker must be rebuilt — found_new alone
            # (which triggers the rebuild below) wouldn't catch this
            # case and we'd stay subscribed to the dead entity_ids.
            if existing is not None and (
                existing.device_id != device.id or existing.esphome_config_entry_id != entry.config_entry_id
            ):
                ids_changed = True
            if existing is not None and existing.device_id and existing.device_id != device.id:
                self._device_id_to_mac.pop(existing.device_id, None)
            # If the same MAC is rediscovered under a different ESPHome
            # config entry (e.g. user removed and re-added the integration
            # without going through HA's device-removal flow):
            #   - drop the stale entry-update listener so the rest of the
            #     code doesn't leak it AND host-update events on the new
            #     entry actually fire,
            #   - close any active session — its APIClient is bound to the
            #     old host and would otherwise keep being reused by
            #     get_session()/_push_config_to_device(),
            #   - drop the push guard so the next online transition
            #     re-pushes config on the new connection.
            if (
                existing is not None
                and existing.esphome_config_entry_id is not None
                and existing.esphome_config_entry_id != entry.config_entry_id
            ):
                stale_unsub = self._entry_update_unsubs.pop(existing.esphome_config_entry_id, None)
                if stale_unsub is not None:
                    stale_unsub()
                self._pushing.discard(mac)
                if mac in self._active_connections:
                    await self.async_close_session(mac)
            if existing is None:
                self.devices[mac] = ManagedDevice(
                    mac=mac,
                    name=device_name,
                    host=host,
                    esphome_config_entry_id=entry.config_entry_id,
                    device_id=device.id,
                )
            else:
                existing.update_from_discovery(
                    name=device_name,
                    host=host,
                    esphome_config_entry_id=entry.config_entry_id,
                    device_id=device.id,
                )
            self._device_id_to_mac[device.id] = mac
            # Re-register the listener on every discovery — `_ensure_esphome_entry_listener`
            # is idempotent (skips if already subscribed for this entry_id), so this
            # is a no-op for unchanged entries and a fresh subscribe for new ones.
            self._ensure_esphome_entry_listener(entry.config_entry_id)

            self._maybe_sync_repair_issue(
                mac,
                device_name=self.devices[mac].name,
                fw_ver=self.read_firmware_version(device.id),
            )

            if is_new:
                found_new = True
                newly_discovered.append(mac)
                _LOGGER.info("Discovered zone engine device: %s (%s)", device.name, mac)
                # Always sync — the empty fallback resets stale entity registry
                # entries left behind by a device delete+readd.
                config = self._store.devices.get(mac)
                zone_slots = config.get("room_layout", {}).get("zone_slots") if config else None
                # Only fall back when the key is actually missing (None);
                # falsy-but-present values (e.g. []) must pass through so
                # async_update_zone_entities can fail closed on malformed shapes.
                if zone_slots is None:
                    zone_slots = empty_zone_slots()
                await self.async_update_zone_entities(mac, zone_slots)

        # Rebuild the state-change tracker on either a brand-new device
        # OR on an existing device's HA registry IDs changing — entity
        # set could have shifted under a re-add. _fire_device_list_changed
        # only triggers for new devices to preserve the existing semantics
        # (frontend doesn't need to refetch on a silent IP/device_id swap).
        if found_new or ids_changed:
            self._refresh_state_listener()
        if found_new:
            self._fire_device_list_changed()

        # Kick the push/build-flags path for devices that were ALREADY online
        # when discovery registered them (their first-appearance states land
        # before the mac is in `self.devices`, so `_on_state_changed` drops
        # them). Reuse the `ent_reg` already bound at the top of this method.
        self._kick_available_devices(newly_discovered, ent_reg)

    def _kick_available_devices(self, macs: Iterable[str], ent_reg: er.EntityRegistry | None = None) -> None:
        """Spawn `_on_device_available` for each already-online mac not already
        being pushed.

        Compensates for `_on_state_changed` only catching FUTURE offline->online
        transitions. Two callers share it:
          - `async_start`, for devices already connected when the integration
            loaded, and
          - `async_discover`, for devices already online when their mac is first
            registered.
        Without this the config push and `_fetch_build_flags` never run and
        `list_devices` ships no has_* flags (an uncalibrated Lite then shows
        every presence row).
        """
        if ent_reg is None:
            ent_reg = er.async_get(self._hass)
        for mac in macs:
            if mac in self._pushing:
                continue
            dev = self.devices.get(mac)
            if dev is None:
                continue
            # Only push to devices that are actually online, per the shared
            # `_is_device_available` definition: `unknown` counts as offline
            # just like `unavailable` (devices with no entities yet count as
            # "unknown = try to connect").
            entries = (
                er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)
                if dev.device_id
                else None
            )
            if not self._is_device_available(mac, entries=entries):
                continue
            self._pushing.add(mac)
            self._spawn(self._on_device_available(mac))

    def _maybe_sync_repair_issue(self, mac: str, *, device_name: str, fw_ver: str | None) -> None:
        """Call `_sync_firmware_repair_issue` only if (fw_ver, name) changed.

        Cuts redundant issue-registry writes from every device-registry update
        event. Cache key is the pair the issue actually renders.
        """
        key = (fw_ver, device_name)
        if self._last_repair_sync.get(mac) == key:
            return
        self._last_repair_sync[mac] = key
        _sync_firmware_repair_issue(
            self._hass,
            mac=mac,
            device_name=device_name,
            fw_ver=fw_ver,
        )

    @callback
    def _on_entity_registry_updated(self, event: Any) -> None:
        """Handle entity registry changes — re-discover on new entities only."""
        if event.data.get("action") != "create":
            return
        entity_id = event.data.get("entity_id", "")
        ent_reg = er.async_get(self._hass)
        entry = ent_reg.async_get(entity_id)
        if entry is None or entry.platform != "esphome":
            return
        # Cheap pre-filter: every ESPHome entity create used to trigger a
        # state-listener rebuild PLUS a full-registry discovery scan — an
        # O(N²) burst when a 50-entity non-EPP ESPHome device is added.
        # Discovery only ever manages devices carrying the EPP
        # manufacturer/model signature, so resolve the device once and bail
        # when it can't possibly be ours. A not-yet-resolvable device (no
        # device_id, or the registry entry hasn't landed) is treated as
        # potentially-EPP and falls through.
        device = None
        if entry.device_id:
            dev_reg = dr.async_get(self._hass)
            device = dev_reg.async_get(entry.device_id)
            if device is not None and not _is_epp_device(device):
                return
        # New EPP-candidate entity — refresh the targeted state-change
        # tracker so the new entity_id gets included, whether it's on a
        # brand-new device (about to be discovered below) or an existing
        # managed one.
        self._refresh_state_listener()
        # Skip only if the entity's device is already discovered AND the
        # underlying HA device.id matches what we have. If device.id changed
        # for a known MAC (the user removed and re-added the ESPHome
        # integration without going through HA's device-removal flow), we
        # need to re-run discovery so the rediscovery branch in
        # async_discover gets a chance to swap listeners and close the stale
        # session. Skipping here would freeze us on the old entry forever.
        if device is not None:
            mac = _extract_mac(device)
            if mac and mac in self.devices and self.devices[mac].device_id == entry.device_id:
                return
        self._request_discover()

    @callback
    def _request_discover(self) -> None:
        """Request a debounced ``async_discover`` run (trailing-edge).

        The burst of entity-registry create events for a single new device
        (one event per entity) collapses into ONE full-registry discovery
        scan that runs ``_discover_debounce`` seconds after the LAST event.
        Mirrors ``_request_push``: only the debounce-sleep phase is
        cancellable; once the scan starts it runs to completion, and
        ``_spawn`` tracks the task so async_stop's drain catches it.
        """
        if self._stopping:
            return
        if (existing := self._pending_discover) is not None and not existing.done():
            existing.cancel()

        task: asyncio.Task

        async def _delayed_discover() -> None:
            try:
                await asyncio.sleep(self._discover_debounce)
            except asyncio.CancelledError:
                return
            # Sync section between sleep-end and the next await: atomic vs.
            # concurrent _request_discover calls (no event-loop yields here).
            if self._pending_discover is task:
                self._pending_discover = None
            await self.async_discover()

        task = self._spawn(_delayed_discover())
        self._pending_discover = task

        def _drop(_: asyncio.Task) -> None:
            # Cancellation path: task didn't reach the in-flight removal,
            # so the slot still points at us. Identity check protects
            # against a newer task taking our slot before we settle.
            if self._pending_discover is task:
                self._pending_discover = None

        task.add_done_callback(_drop)

    @callback
    def _on_state_changed(self, event: Any) -> None:
        """Detect when a managed device becomes available."""
        new_state: State | None = event.data.get("new_state")
        old_state: State | None = event.data.get("old_state")
        if new_state is None:
            return
        # First appearance (old_state=None) is treated as the device just
        # coming online: register-then-publish-state semantics produce a
        # None → value transition that's indistinguishable from
        # STATE_UNAVAILABLE → value from our point of view.
        old_state_value = old_state.state if old_state is not None else STATE_UNAVAILABLE

        # Hot-path guard: every state change of every tracked entity lands
        # here, and everything below acts only on availability transitions.
        # A plain value→value sensor update (the overwhelmingly common case)
        # must bail before paying the ent_reg/dev_reg lookups and MAC
        # extraction. The old side uses the wider `_FW_OFFLINE_STATES` set so
        # the firmware-version `"" → value` arrival still gets through.
        if old_state_value not in _FW_OFFLINE_STATES and new_state.state not in _OFFLINE_STATES:
            return

        # Check if this entity belongs to a managed ESPHome device
        ent_reg = er.async_get(self._hass)
        entry = ent_reg.async_get(event.data.get("entity_id", ""))
        if entry is None or entry.platform != "esphome" or entry.device_id is None:
            return

        dev_reg = dr.async_get(self._hass)
        device = dev_reg.async_get(entry.device_id)
        if device is None:
            return

        mac = _extract_mac(device)
        if not mac or mac not in self.devices:
            return

        # Re-sync Repairs whenever the firmware_version sensor specifically
        # transitions from offline to a real value. Handles the post-OTA
        # reconnect race: _on_device_available fires for the first entity
        # to come online, but firmware_version may still be unavailable at
        # that moment, so the initial sync exits early with fw_ver=None.
        # Without this hook the stale issue would persist forever.
        # Use read_firmware_version for the new value rather than
        # new_state.state directly, so we treat empty string the same as
        # unavailable/unknown — read_firmware_version is the single source
        # of truth for "is this a real firmware version".
        if (
            _is_esphome_entity(entry, "sensor", "firmware_version")
            and old_state_value in _FW_OFFLINE_STATES
            and new_state.state not in _FW_OFFLINE_STATES
        ):
            fw_ver = self.read_firmware_version(entry.device_id)
            if fw_ver is not None:
                self._maybe_sync_repair_issue(
                    mac,
                    device_name=self.devices[mac].name,
                    fw_ver=fw_ver,
                )
                # Re-spawn the push: the version-gated push in
                # `_push_config_to_device` returns True (skip) when
                # `fw_ver` is unknown, so the initial `_on_device_available`
                # exits without entering its retry loop and leaves
                # `_pushing` set. Now that we know the version, kick off
                # another attempt — `_pushing` stays set throughout
                # (debouncing concurrent state-changes), and the second
                # call's `_push_config_to_device` sees the real version
                # so the gate resolves to compatible/incompatible
                # instead of unknown.
                if mac in self._pushing:
                    self._spawn(self._on_device_available(mac))

        if new_state.state in _OFFLINE_STATES:
            # Device went offline — allow a fresh push when it comes back and
            # close any active session so the stale APIClient is replaced on
            # the next frontend reconnect. Route through schedule_close_session
            # so the task is tracked in `_pending_closes` and async_stop can
            # drain it instead of leaking past teardown.
            self._pushing.discard(mac)
            # Forget the static-presence skip cache: the device left, so the
            # first push after it rejoins must re-apply the DFRobot config.
            self._static_presence_cache.pop(mac, None)
            if mac in self._active_connections:
                self.schedule_close_session(mac)
            # Only fire the broadcast on the actual available→unavailable
            # transition. ESPHome streams an unavailable→unknown ping while a
            # device is disconnected, and per-entity offline events for the
            # same device would otherwise spam every device-list subscriber
            # for each entity-flip during a single disconnect.
            dev = self.devices.get(mac)
            if dev is not None and dev.available:
                dev.available = False
                self._fire_device_list_changed()
            return

        if old_state_value not in _OFFLINE_STATES:
            return

        # Device came online — push config once. The `_pushing` guard
        # debounces the burst of per-entity transitions on reconnect so we
        # don't kick off N parallel push tasks; subsequent transitions still
        # need to notify subscribers, otherwise an entity that flips back
        # *after* the first task fires its event (e.g. `firmware_version`
        # arriving late) leaves the frontend stuck on a stale
        # `firmware_status="unavailable"` until something else triggers a
        # refresh.
        if mac not in self._pushing:
            self._pushing.add(mac)
            self._spawn(self._on_device_available(mac))
        else:
            self._fire_device_list_changed()

    @callback
    def _ensure_esphome_entry_listener(self, entry_id: str | None) -> None:
        """Register an ESPHome config-entry update listener once per entry."""
        # Refuse to register during shutdown — async_stop already cleared
        # `_entry_update_unsubs` in Phase 1, and re-registering here would
        # leak the listener past stop.
        if self._stopping:
            return
        if entry_id is None or entry_id in self._entry_update_unsubs:
            return
        entry = self._hass.config_entries.async_get_entry(entry_id)
        if entry is None:
            return
        self._entry_update_unsubs[entry_id] = entry.add_update_listener(self._on_esphome_entry_updated)

    async def _on_esphome_entry_updated(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Pick up IP changes from the ESPHome integration without an HA restart."""
        new_host = entry.data.get("host")
        for mac, dev in list(self.devices.items()):
            if dev.esphome_config_entry_id != entry.entry_id:
                continue
            if dev.host == new_host:
                return
            _LOGGER.info("ESPHome host for %s changed: %s → %s", dev.name, dev.host, new_host)
            dev.host = new_host
            # Drop the push guard so the next online transition re-pushes config.
            self._pushing.discard(mac)
            # Close the stale session; its APIClient is bound to the old IP.
            if mac in self._active_connections:
                await self.async_close_session(mac)
            return

    @callback
    def _on_device_registry_updated(self, event: Any) -> None:
        """Handle device registry changes — clean up on remove, push refresh on update."""
        action = event.data.get("action")
        if action not in ("remove", "update"):
            return

        device_id = event.data.get("device_id")
        mac = self._device_id_to_mac.get(device_id) if device_id else None
        if mac is None:
            return

        if action == "remove":
            self._spawn(self._on_device_removed(mac))
            return

        # Update (rename, area change, etc.) — refresh the cached friendly
        # name and re-sync the Repairs issue so its title/description tracks
        # the new name, then notify subscribers so the frontend re-fetches
        # list_devices and picks up the fresh data.
        dev_reg = dr.async_get(self._hass)
        device = dev_reg.async_get(device_id) if device_id else None
        if device is not None:
            new_name = device.name_by_user or device.name or "EPP Device"
            self.devices[mac].name = new_name
            self._maybe_sync_repair_issue(
                mac,
                device_name=new_name,
                fw_ver=self.read_firmware_version(device_id),
            )
        self._fire_device_list_changed()

    async def _on_device_removed(self, mac: str) -> None:
        """Clean up stored settings and runtime state for a removed device."""
        from homeassistant.helpers import issue_registry as ir

        from ..const import DOMAIN as _DOMAIN

        await self.async_close_session(mac)
        self._store.devices.pop(mac, None)
        dev = self.devices.pop(mac, None)
        if dev is not None:
            if dev.device_id:
                self._device_id_to_mac.pop(dev.device_id, None)
            if dev.esphome_config_entry_id:
                unsub = self._entry_update_unsubs.pop(dev.esphome_config_entry_id, None)
                if unsub is not None:
                    unsub()
        # Drop the device's streams: nothing can ever arm them again. This is the
        # authoritative teardown, not a fallback — the close above fires on_stop, and
        # aioesphomeapi runs on_stop as an EAGER task: inline within our own
        # `client.disconnect()`, so `_on_session_lost` has most likely already run by
        # the time we reach here (`notify` de-dupes either way). Marking each stream
        # closed is what stops an `_arm_stream` still in flight from resuming past its
        # `stream.closed` guards and re-arming onto the connection we just tore down —
        # leaving a callback on a dead connection and a client whose last signal is
        # `available=True` for a device that is gone.
        # Safe to pop the lock even with an `_ensure_streams` pass still holding it:
        # every stream in that pass's snapshot is now `closed`, so it releases instead
        # of arming (its release is balanced against the ref its own `async_open_session`
        # took). A re-added device mints a fresh lock and a disjoint set of streams —
        # the two passes cannot both arm.
        # `notify_closed` on top of `notify(False)`: an offline device eventually comes
        # back and re-arms the stream, but a REMOVED one never will — the client must
        # re-subscribe (against a re-added device) or give up. Iterate a copy: the list
        # is already detached from `_state_streams`, but `notify_closed` runs the
        # client's callback, which is free to unsub other streams and re-enter `_close`.
        for stream in list(self._state_streams.pop(mac, [])):
            self._disarm_stream(stream)
            stream.mark_closed()
        self._stream_locks.pop(mac, None)
        # Nothing can ever arm this device's streams again, so the backoff has
        # nothing left to retry — it would otherwise sit sleeping until its next
        # tick (up to the last delay) past the device's lifetime.
        if (retry := self._stream_retry_tasks.pop(mac, None)) is not None and not retry.done():
            retry.cancel()
        self._build_flags.pop(mac, None)
        self._session_locks.pop(mac, None)
        self._ota_locks.pop(mac, None)
        self._ota_manifest_urls.pop(mac, None)
        self._push_locks.pop(mac, None)
        self._target_subs.pop(mac, None)
        self._static_presence_cache.pop(mac, None)
        self._connection_failed.discard(mac)
        self._entity_update_macs.discard(mac)
        self._failed_pushes.discard(mac)
        self._pushing.discard(mac)
        self._last_repair_sync.pop(mac, None)
        # Cancel the pending debounced pushes (they would push to a device that
        # no longer exists) and the entity-update-clear timer (its mac entry
        # in `_entity_update_macs` is already gone; the timer would leak past
        # the device's lifetime otherwise).
        if (pending_push := self._pending_pushes.pop(mac, None)) is not None:
            pending_push.cancel()
        if (pending_pipeline := self._pending_pipeline_pushes.pop(mac, None)) is not None:
            pending_pipeline.cancel()
        if (cancel_clear := self._entity_update_clear_cancels.pop(mac, None)) is not None:
            cancel_clear()
        # Clear any Repairs issues we raised for this device — they'd
        # otherwise hang in HA Settings → Repairs forever for a device
        # that no longer exists.
        ir.async_delete_issue(self._hass, _DOMAIN, f"firmware_behind_{mac}")
        ir.async_delete_issue(self._hass, _DOMAIN, f"firmware_ahead_{mac}")
        # Synchronous — explicit user action, must be durable across crashes.
        # A delayed-save here can resurrect the deleted config if HA is
        # force-restarted within the debounce window.
        await self._store.async_save()
        self._refresh_state_listener()
        self._fire_device_list_changed()
        _LOGGER.info("Cleaned up settings for removed device %s", mac)

    async def _on_device_available(self, mac: str) -> None:
        """Push stored config when a managed device comes online."""
        dev = self.devices.get(mac)
        if dev is not None:
            dev.available = True
            # Re-evaluate firmware-version repair issues after reconnect:
            # this is the OTA recovery path (reboot → reconnect → new
            # firmware_version state arrives) where the issue from the
            # previous version needs to be cleared or replaced.
            self._maybe_sync_repair_issue(
                mac,
                device_name=dev.name,
                fw_ver=self.read_firmware_version(dev.device_id),
            )

        # Re-arm durable frontend streams FIRST: a card that sat on a dashboard
        # through the flap must resume streaming even if the config push below is
        # skipped (entity-update guard) or fails and retries with backoff — that
        # path can take many seconds, and until then the card shows nothing.
        if self._state_streams.get(mac):
            self._spawn(self._ensure_streams(mac))

        # Skip push if we caused this reconnect via entity registry updates.
        # Don't clear the guard here — multiple entities cycle through
        # unavailable→available during an ESPHome reload, creating multiple
        # tasks.  The 60-second timer in websocket_set_settings handles cleanup.
        if mac in self._entity_update_macs and mac not in self._failed_pushes:
            _LOGGER.debug("Skipping redundant push for %s (entity update guard)", mac)
            # Must broadcast the false→true transition even when skipping the
            # push: stream recovery is the manager's own job via
            # _ensure_streams above, but this broadcast is what lets the
            # panel bootstrap a session+config for a device that had none
            # (e.g. it was offline when the panel mounted) — that path is
            # only wired to the device-list push, not to stream state.
            self._fire_device_list_changed()
            return
        # Recovery path: if a debounced push failed (likely fired during the
        # ESPHome reload that armed the guard), drop the marker and fall
        # through to push so the device gets the latest config.
        self._failed_pushes.discard(mac)

        _LOGGER.info("Device %s became available, pushing config", mac)
        if not await self._push_config_to_device(mac):
            # Bounded exponential backoff. Re-check availability between
            # attempts so we don't keep hammering a device HA already
            # knows is offline.
            #
            # Close the (likely-stale) session ONCE before the loop, not
            # on every iteration: the first push failed because of that
            # session, but subsequent retries should leave whatever
            # session the user might have opened mid-backoff alone — the
            # 1s/3s/9s window is long enough for a panel reconnect, and
            # tearing it down on the next iteration would surface as a
            # flaky reconnect.
            await self.async_close_session(mac)
            for delay in (1.0, 3.0, 9.0):
                await asyncio.sleep(delay)
                if not self._is_device_available(mac):
                    self._pushing.discard(mac)
                    return
                if await self._push_config_to_device(mac):
                    break
            else:
                self._pushing.discard(mac)

        self._fire_device_list_changed()

    @staticmethod
    def _manage_log_subscription(conn: DeviceConnection, config: dict[str, Any]) -> None:
        """Subscribe/unsubscribe device logs based on stored log levels."""
        log_levels = config.get("log_levels", {})
        any_enabled = any(v != "None" for v in log_levels.values())
        if any_enabled:
            esphome_level_map = {
                "Error": LogLevel.LOG_LEVEL_ERROR,
                "Warning": LogLevel.LOG_LEVEL_WARN,
                "Info": LogLevel.LOG_LEVEL_INFO,
                "Debug": LogLevel.LOG_LEVEL_DEBUG,
            }
            # Find the most permissive level (highest LogLevel value = most verbose)
            active_levels = [v for v in log_levels.values() if v != "None"]
            esphome_level = max(
                (esphome_level_map.get(v, LogLevel.LOG_LEVEL_WARN) for v in active_levels),
                default=LogLevel.LOG_LEVEL_WARN,
            )
            conn.subscribe_logs(esphome_level)
        else:
            conn.unsubscribe_logs()

    def _request_push(self, mac: str, delay: float = _PUSH_DEBOUNCE_DEFAULT) -> None:
        """Request a debounced config push for `mac` (trailing-edge).

        Multiple rapid-fire calls within `delay` seconds collapse into a
        single push that runs `delay` after the LAST call. Push reads
        storage at fire time — callers must `await store.async_save()` first.

        Fire-and-forget. If you need push_ok, call _push_config_to_device
        directly.
        """
        if self._stopping:
            return
        # _pending_pushes only tracks the debounce-sleep phase. Once a task
        # transitions into the actual push (post-sleep), it removes itself
        # from the dict so this cancel path can't interrupt an in-flight
        # network write — a concurrent _request_push schedules a follow-up
        # instead, which serialises behind the running one via _push_locks.
        if (existing := self._pending_pushes.get(mac)) is not None and not existing.done():
            existing.cancel()

        task: asyncio.Task

        async def _delayed_push() -> None:
            try:
                await asyncio.sleep(delay)
            except asyncio.CancelledError:
                return
            # Sync section between sleep-end and the next await: atomic vs.
            # concurrent _request_push calls (no event-loop yields here).
            if self._pending_pushes.get(mac) is task:
                del self._pending_pushes[mac]
            ok = await self._push_config_to_device(mac)
            # Track failure so _on_device_available's entity-update-guard
            # branch can run a recovery push instead of silently skipping.
            if ok:
                self._failed_pushes.discard(mac)
            else:
                self._failed_pushes.add(mac)

        # _spawn tracks the task in `_pending_tasks` so async_stop's Phase 2
        # drain catches it as a backstop.
        task = self._spawn(_delayed_push())
        self._pending_pushes[mac] = task

        def _drop(_: asyncio.Task) -> None:
            # Cancellation path: task didn't reach the in-flight removal,
            # so the dict still points at us. Identity check protects
            # against a newer task taking our slot before we settle.
            if self._pending_pushes.get(mac) is task:
                self._pending_pushes.pop(mac, None)

        task.add_done_callback(_drop)

    def _request_pipeline_push(self, mac: str, delay: float = _PUSH_DEBOUNCE_DEFAULT) -> None:
        """Request a debounced pipeline push for `mac` (trailing-edge).

        Mirrors `_request_push` exactly, but the delayed body awaits
        `_push_pipeline_to_device` instead of `_push_config_to_device` and
        does NOT touch `_failed_pushes` (that recovery bookkeeping is
        config-push-only). A card mounting with heatmap opens two subscribe
        commands back-to-back, each of which requests a pipeline push;
        coalescing collapses the pair into a single push that reads the final
        subscriber counts at fire time.

        Fire-and-forget. If you need the push to complete before returning,
        call `async_push_pipeline_to_device` directly.
        """
        if self._stopping:
            return
        # _pending_pipeline_pushes only tracks the debounce-sleep phase. Once a
        # task transitions into the actual push (post-sleep), it removes itself
        # from the dict so this cancel path can't interrupt an in-flight
        # network write — a concurrent _request_pipeline_push schedules a
        # follow-up instead.
        if (existing := self._pending_pipeline_pushes.get(mac)) is not None and not existing.done():
            existing.cancel()

        task: asyncio.Task

        async def _delayed_push() -> None:
            try:
                await asyncio.sleep(delay)
            except asyncio.CancelledError:
                return
            # Sync section between sleep-end and the next await: atomic vs.
            # concurrent _request_pipeline_push calls (no event-loop yields here).
            if self._pending_pipeline_pushes.get(mac) is task:
                del self._pending_pipeline_pushes[mac]
            await self._push_pipeline_to_device(mac)

        # _spawn tracks the task in `_pending_tasks` so async_stop's Phase 2
        # drain catches it as a backstop.
        task = self._spawn(_delayed_push())
        self._pending_pipeline_pushes[mac] = task

        def _drop(_: asyncio.Task) -> None:
            # Cancellation path: task didn't reach the in-flight removal,
            # so the dict still points at us. Identity check protects
            # against a newer task taking our slot before we settle.
            if self._pending_pipeline_pushes.get(mac) is task:
                self._pending_pipeline_pushes.pop(mac, None)

        task.add_done_callback(_drop)

    @callback
    def mac_for_device_id(self, device_id: str) -> str | None:
        """Resolve an HA registry device_id to its mac (O(1)), or None if unknown."""
        return self._device_id_to_mac.get(device_id)

    @callback
    def esphome_entry_id_for_mac(self, mac: str) -> str | None:
        """The ESPHome config-entry id owning this mac's device (O(1)), or None."""
        return getattr(self.devices.get(mac), "esphome_config_entry_id", None)

    @callback
    def note_target_subscribe(self, mac: str, kind: str) -> None:
        """Record one new frontend target-stream subscriber for `mac`.

        `kind` is the stream counter name ("raw_target_subs" /
        "grid_target_subs"). Counts are held per-mac (see `_target_subs`) so
        they survive connection replacement — the WS subscribe handler calls
        this instead of mutating the ephemeral connection.
        """
        counts = self._target_subs.setdefault(mac, {"raw_target_subs": 0, "grid_target_subs": 0, "heatmap_subs": 0})
        counts[kind] += 1

    @callback
    def note_target_unsubscribe(self, mac: str, kind: str) -> None:
        """Record the loss of one frontend target-stream subscriber for `mac`.

        Floors at zero: a subscriber's increment can land on a connection that
        was later replaced while its `_unsub` fires against the surviving
        per-mac count, so a stray decrement must not drive the count negative
        (which would otherwise leave emission wrongly gated after the next
        subscribe). Drops the mac entry once both counts reach zero.
        """
        counts = self._target_subs.get(mac)
        if counts is None:
            return
        counts[kind] = max(0, counts.get(kind, 0) - 1)
        if sum(counts.values()) == 0:
            self._target_subs.pop(mac, None)

    async def async_add_state_stream(
        self,
        mac: str,
        *,
        counter_attr: str,
        make_on_state: Callable[[str, Any], Callable[[Any], None]],
        on_availability: Callable[[bool], None],
        on_closed: Callable[[], None] | None = None,
        poll_fn: Callable[[Any], Awaitable[Any]] | None = None,
    ) -> Callable[[], None] | None:
        """Register a durable state stream for `mac` and arm it if possible.

        Returns an idempotent unsub callable, or None when `mac` is unknown.

        The stream survives connection replacement: the manager re-arms it (see
        `_ensure_streams`) whenever a session comes back, rebuilding the callback
        from `make_on_state` against the new connection. Callers therefore must
        NOT hold a `DeviceConnection` themselves.

        `on_availability` reports liveness — the device dropped, the device came back
        — for a stream the manager still holds. `on_closed` reports that the manager
        no longer holds it at all (config entry unload/reload, device removed):
        nothing here can revive it, so a caller that still wants frames must
        re-subscribe. The two are distinct precisely because they are
        indistinguishable to the client otherwise, and re-subscribing on a mere flap
        would churn the wire and defeat the durable stream.

        The subscriber count is taken here and released in unsub — NOT on
        arm/disarm. `_target_subs` is per-mac precisely so it survives a flap;
        decrementing it on connection loss would silence the device's pipeline
        for a client that is still subscribed.

        `poll_fn`, when given, switches the stream to the POLL delivery seam
        (issue #365, heatmap): `_arm_stream` drives a periodic poller instead of a
        PUSH `subscribe_states` subscription, feeding `make_on_state`'s callback
        each item `poll_fn` fetches rather than a device state. `None` (the
        default) is the ordinary PUSH stream every other caller uses.

        Registration is all-or-nothing: if the arm pass below raises or is
        cancelled, the stream is rolled back before the exception propagates.
        """
        if mac not in self.devices:
            return None

        stream = StateStream(
            mac=mac,
            counter_attr=counter_attr,
            make_on_state=make_on_state,
            on_availability=on_availability,
            on_closed=on_closed,
            poll_fn=poll_fn,
        )
        self._state_streams.setdefault(mac, []).append(stream)
        self.note_target_subscribe(mac, counter_attr)
        self.request_pipeline_push(mac)

        @callback
        def _close() -> None:
            """Deregister the stream: disarm it, drop it, release its subscriber count.

            Idempotent (the `closed` flag), which is what makes it safe as both the
            caller's unsub and the rollback below — and safe when `async_stop` or
            `_on_device_removed` already closed the stream out from under us.

            Deliberately does NOT fire `notify_closed`: that signal means "the manager
            dropped your stream, re-subscribe if you still want one", and here the
            CALLER dropped it. Telling it to re-subscribe would loop.
            """
            if stream.closed:
                return
            stream.closed = True
            self._disarm_stream(stream)
            streams = self._state_streams.get(mac)
            if streams is not None:
                with contextlib.suppress(ValueError):
                    streams.remove(stream)
                if not streams:
                    self._state_streams.pop(mac, None)
                    # Last stream for the mac: the backoff has nothing left to arm, and a
                    # task parked on its (escalated) delay would own the mac's retry slot
                    # until it woke — so a client that re-subscribes in that window and
                    # fails to arm would find `_schedule_stream_retry` no-op against the
                    # stale task and wait the old delay out instead of backing off from
                    # the first. Identity-checked because this is the CLIENT's callback:
                    # it re-enters from inside the retry task itself whenever that task's
                    # `_ensure_streams` pass notifies a client that unsubs in response, and
                    # cancelling there would kill the task mid-pass from within itself. Its
                    # own exit is the loop's post-arm check, and `_drop` clears the slot.
                    retry = self._stream_retry_tasks.get(mac)
                    if retry is not None and retry is not asyncio.current_task():
                        self._stream_retry_tasks.pop(mac, None)
                        retry.cancel()
            # Read the counter key back off the record, not the parameter: the record
            # is what the subscribe was booked against, so it stays the one place the
            # key lives.
            self.note_target_unsubscribe(stream.mac, stream.counter_attr)
            self.request_pipeline_push(mac)

        try:
            await self._ensure_streams(mac)
        except BaseException:
            # The caller only gets its teardown handle on the happy path, so a stream
            # left registered here could NEVER be closed: its subscriber count would
            # pin the device to the fast pipeline for the life of the manager, and a
            # later re-arm would push frames into a WS subscription id nobody owns.
            # `CancelledError` is the live case — this runs inside the WS handler's
            # task — hence `BaseException`, not `Exception`. The rollback IS this
            # stream's close, pairing exactly once with the subscribe above.
            _close()
            raise

        return _close

    def _disarm_stream(self, stream: StateStream) -> None:
        """Drop a stream's callback from its connection and release its session ref.

        Safe on an unarmed stream, and safe when the connection is already dead:
        `release_session` identity-checks against the active session, so a ref
        that a force-close already reset is not double-released.

        A poll-source stream (`poll_task` set) has no PUSH subscription to drop —
        cancelling its poller is the teardown. A push stream (`poll_task is None`)
        keeps the exact original behaviour: `unsubscribe_states` then release.
        """
        conn, cb, task = stream.conn, stream.cb, stream.poll_task
        stream.conn = None
        stream.cb = None
        stream.poll_task = None
        if conn is None:
            return
        if task is not None:
            task.cancel()
        else:
            with contextlib.suppress(Exception):
                conn.unsubscribe_states(cb)
        self.release_session(stream.mac, conn)

    @callback
    def _on_session_lost(self, conn: DeviceConnection) -> None:
        """`conn`'s API connection stopped — disarm the streams it carried, then re-arm.

        Reaches us from `DeviceConnection.on_stop`, which aioesphomeapi runs as an EAGER
        task: inline within our own `client.disconnect()` for a self-initiated close —
        which can fire this callback WHILE we are still inside `async_close_session`,
        `_session_locks[mac]` held by that very call — arbitrary, from the read loop, for
        an unexpected drop. Either way this can land at any point after the connection
        died, including while we hold `_session_locks[mac]` somewhere up the stack. The
        reconcile must not be awaited here — `_ensure_streams` takes `_stream_locks[mac]`
        and then, through `async_open_session`, `_session_locks[mac]`. `_spawn` runs it on
        a fresh task and tracks it, so async_stop's drain still catches it.

        The hook carries the connection, not just its mac, because that detached delivery
        means a stale on_stop from a REPLACED connection can arrive after its successor
        armed these streams: only the streams this EXACT connection carried may be
        disarmed. Tearing down a successor's would flap the client False→True and release
        a session ref that belongs to the live connection.

        Covers both an unexpected drop and our own force-close: `_ensure_streams`
        no-ops while the device is offline, and `_on_device_available` re-runs it
        when the device comes back.

        Subscriber counts are untouched — they belong to the client, not the
        connection (see `_target_subs`).
        """
        mac = conn.mac
        streams = self._state_streams.get(mac)
        if not streams:
            return
        # Iterate a copy: `notify` runs the client's callback, which is free to
        # unsub in response — that removes the stream from this very list.
        for stream in list(streams):
            if stream.conn is not conn:
                continue
            self._disarm_stream(stream)
            if not stream.closed:
                stream.notify(False)
        if self._stopping:
            return
        self._spawn(self._ensure_streams(mac))

    def _unarmed_streams(self, mac: str) -> list[StateStream]:
        """Streams a client still wants for `mac` that aren't on a connection yet."""
        return [s for s in self._state_streams.get(mac, []) if not s.closed and not s.armed]

    async def _ensure_streams(self, mac: str) -> None:
        """Arm every unarmed stream for `mac`. Idempotent; safe to call often.

        This is the single reconciler behind stream recovery: it runs when a
        stream is added, when a session is lost (device flap, forced close), and
        when the device comes back online.
        """
        if self._stopping or not self._state_streams.get(mac):
            return
        lock = self._stream_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            if self._stopping_now():
                return
            pending = self._unarmed_streams(mac)
            if not pending:
                return
            if mac not in self.devices or not self._is_device_available(mac):
                # Device is gone or offline. Nothing to arm — the availability
                # transition re-runs us.
                for stream in pending:
                    stream.notify(False)
                return
            armed_any = False
            try:
                for stream in pending:
                    if await self._arm_stream(stream):
                        armed_any = True
            finally:
                # `finally`, not a plain tail: the pass belongs to EVERY stream in
                # `pending`, but it runs inside whichever caller triggered it — in
                # practice a WS handler's task, via `async_add_state_stream`, which HA
                # cancels when the client goes away. `_arm_stream` propagates that
                # cancellation, and the caller's rollback closes only ITS OWN stream, so
                # without reconciling on the way out another client's stream would be
                # left registered-but-unarmed on an available device with no retry armed
                # — #334's failure mode, until the next flap. `_schedule_stream_retry`
                # no-ops while stopping, so the shutdown path stays clean.
                if armed_any:
                    # Counts are already recorded; the device's pipeline was set from
                    # the defaults on reconnect, so re-push it now that we're live.
                    self.request_pipeline_push(mac)
                # Anything still unarmed means the device looked available but our own
                # connect (or subscribe) failed (or, on the exception path, that the arm
                # pass never got to it). No further trigger is coming — the availability
                # transition already happened — so drive a backoff retry. Re-read the
                # list rather than reusing `pending`: an arm can await, and a client may
                # have unsubbed (closing its stream) meanwhile.
                if self._unarmed_streams(mac):
                    self._schedule_stream_retry(mac)
                elif (retry := self._stream_retry_tasks.get(mac)) is not None and retry is not asyncio.current_task():
                    # Everything armed while a backoff task from an earlier failure was still
                    # sleeping. Retire it: parked, it owns the mac's retry slot for the rest of
                    # its delay, so a device that flaps in that window would have to wait that
                    # delay out instead of rescheduling from the first one. Cancelling here is
                    # safe because we hold `_stream_locks[mac]`: a retry task can only be in its
                    # sleep or blocked on this very lock, never mid-network-I/O. It never cancels
                    # ITSELF — its own pass leaves through the loop's post-arm exit.
                    self._stream_retry_tasks.pop(mac, None)
                    retry.cancel()

    def _schedule_stream_retry(self, mac: str) -> None:
        """Keep retrying `_ensure_streams(mac)` while streams remain unarmed.

        ONE task per mac drives the entire backoff sequence, and it re-checks its own
        exit conditions on every tick. A task per `_ensure_streams` pass would instead
        restart the delays at their first entry each time it re-scheduled — a failing
        connect would then be re-attempted at that shortest interval forever, never
        backing off. Re-entrant calls (this task's own `_ensure_streams` still finds
        the stream unarmed) therefore no-op against the live task.

        Cancellable, but not instantly: the task holds its slot across `_ensure_streams`
        too, so a cancel can land in a session open or a subscribe as well as in the
        sleep. `async_stop` Phase 1 therefore only REQUESTS the cancel; `_spawn` tracks
        the task, and the Phase 2 drain settles the unwind under `_stop_timeout`.
        """
        if self._stopping:
            return
        existing = self._stream_retry_tasks.get(mac)
        if existing is not None and not existing.done():
            return

        async def _retry() -> None:
            delays = self._stream_retry_delays
            attempt = 0
            while not self._stopping:
                # Hold at the last delay for as long as unarmed streams remain: the
                # device may be rebooting, or out of API slots, for a long time.
                delay = delays[min(attempt, len(delays) - 1)]
                attempt += 1
                try:
                    await asyncio.sleep(delay)
                except asyncio.CancelledError:
                    return
                # Stop as soon as this backoff has nothing to contribute — the streams
                # armed, every client unsubbed, the device was removed, or it went
                # offline. An offline device is `_on_device_available`'s to recover:
                # `_ensure_streams` early-returns while it is down, so ticking on would
                # just churn the lock for the life of the config entry, and would hold
                # `attempt` at the top of the backoff for when it does come back.
                # Never a busy loop: each pass is gated behind the sleep above.
                # `_stopping_now`: same post-await re-check as `_ensure_streams` —
                # not currently flagged by mypy (the `while` loop join widens the
                # narrowing), but structurally identical, so kept consistent.
                if (
                    not self._unarmed_streams(mac)
                    or self._stopping_now()
                    or mac not in self.devices
                    or not self._is_device_available(mac)
                ):
                    return
                await self._ensure_streams(mac)
                # Leave the moment the pass armed everything, rather than holding the
                # mac's retry slot through another sleep — a fresh failure in that window
                # must be able to schedule its own retry from the first delay.
                if not self._unarmed_streams(mac):
                    return

        task = self._spawn(_retry())
        self._stream_retry_tasks[mac] = task

        def _drop(_: asyncio.Task) -> None:
            # Identity-checked: a later task may already own the slot (this one was
            # cancelled and replaced), and `async_stop` clears the dict wholesale.
            if self._stream_retry_tasks.get(mac) is task:
                self._stream_retry_tasks.pop(mac, None)

        task.add_done_callback(_drop)

    async def _arm_stream(self, stream: StateStream) -> bool:
        """Open/reuse a session and register this stream's callback on it."""
        mac = stream.mac
        try:
            opened = await self.async_open_session(mac)
        except Exception as err:
            _LOGGER.debug("State stream: open session failed for %s: %s", mac, err)
            opened = None
        if opened is None:
            stream.notify(False)
            return False
        conn: DeviceConnection = opened

        cb: Callable[[Any], None] | None = None

        def _abandon() -> None:
            """Take the callback back off the connection and give the session ref back.

            Every failed exit below owes both. The unsubscribe is defence in depth:
            `DeviceConnection.subscribe_states` appends `cb` before the client call that
            can raise and rolls that append back itself, so it is normally a no-op — but
            nothing else could ever remove a `cb` that DID survive, because the stream
            stays unarmed and `_disarm_stream` would see `conn is None`. While another
            stream keeps the connection alive, such an orphan would keep firing into a
            dead handler, and the next re-arm would add a SECOND callback to the same
            connection: every frame delivered twice. Suppressed like `_disarm_stream`'s —
            a raise from a connection that died under us must not skip the release and
            leak the ref that opened it, pinning the connection open for the life of the
            manager. `cb` is read at call time, so this covers the pre-subscribe exit too.
            """
            if cb is not None:
                with contextlib.suppress(Exception):
                    conn.unsubscribe_states(cb)
            self.release_session(mac, conn)

        if stream.closed_now():
            # The client went away while we were opening.
            _abandon()
            return False
        if stream.poll_fn is not None:
            # Poll-source stream (heatmap): drive a periodic poller instead of a PUSH
            # `subscribe_states` subscription. `stream.conn`/`cb`/`poll_task` are set
            # synchronously here — there is NO await between the `closed_now()` check
            # above and returning — so the push path's second `closed_now()` re-check
            # stays push-only, and `_run_poll_stream`'s `stream.conn is conn` guard is
            # already valid on its first iteration.
            #
            # This mirrors the push path's all-or-nothing rollback — `make_on_state`
            # or the spawn can raise (a `make_on_state` bug, task creation during
            # shutdown), and a bare failure would leak the session `async_open_session`
            # just took and leave the stream half-armed. The one deliberate difference:
            # `stream.conn`/`cb` are committed BEFORE the spawn, not after. HA runs
            # `_spawn`'s coroutine EAGERLY, so `_run_poll_stream` reads
            # `stream.conn is conn` synchronously inside `_spawn` on its first tick;
            # committing them afterwards would make that first tick see `conn is None`
            # and exit at once (freezing the poller). The except paths roll all three
            # fields back and hand the ref to `_abandon` (which reads the SAME outer
            # `cb`, so a callback that got built is unsubscribed too — a no-op for a
            # poll stream, defence in depth as on the push path), so a failed arm still
            # leaves nothing armed and no ref leaked.
            try:
                cb = stream.make_on_state(mac, conn)
                stream.conn = conn
                stream.cb = cb
                stream.poll_task = self._spawn(self._run_poll_stream(stream, conn, cb, stream.poll_fn))
            except Exception as err:
                _LOGGER.debug("State stream: poll arm failed for %s: %s", mac, err)
                stream.conn = None
                stream.cb = None
                stream.poll_task = None
                _abandon()
                stream.notify(False)
                return False
            except BaseException:
                stream.conn = None
                stream.cb = None
                stream.poll_task = None
                _abandon()
                raise
            stream.notify(True)
            return True
        try:
            cb = stream.make_on_state(mac, conn)
            await conn.subscribe_states(cb)
        except Exception as err:
            _LOGGER.debug("State stream: subscribe failed for %s: %s", mac, err)
            _abandon()
            stream.notify(False)
            return False
        except BaseException:
            # Cancellation, in practice: `DeviceConnection.subscribe_states` can suspend
            # on its `_subscribe_lock`, so a CancelledError can land in that await with
            # `stream.conn` still None. `async_add_state_stream`'s rollback then finds an
            # unarmed stream and releases nothing — hence `_abandon` here. Re-raise
            # unconditionally: a swallowed CancelledError breaks task cancellation.
            # `notify` is skipped — the client is going away with us.
            _abandon()
            raise
        if stream.closed_now():
            # The client went away while we were subscribing.
            _abandon()
            return False
        stream.conn = conn
        stream.cb = cb
        stream.notify(True)
        return True

    async def _run_poll_stream(
        self,
        stream: StateStream,
        conn: DeviceConnection,
        cb: Callable[[Any], None],
        poll_fn: Callable[[Any], Awaitable[Any]],
    ) -> None:
        """Delivery loop for a poll-source stream: fetch on an interval and feed cb.

        Runs until the stream is closed/disarmed (cancelled by _disarm_stream /
        mark_closed) or the connection is replaced (stream.conn is not conn). An
        immediate first poll gives an instant overlay. poll_fn returning None
        (e.g. old firmware without the action) or raising just skips that tick.
        """
        try:
            while not stream.closed and stream.conn is conn:
                try:
                    item = await poll_fn(conn)
                except Exception as err:
                    # Transient (device flap, service unavailable on old fw): skip
                    # this tick and try again on the next one, keeping the loop alive.
                    _LOGGER.debug("Poll fetch failed for %s (%s): %s", stream.mac, stream.counter_attr, err)
                    item = None
                if item is not None and not stream.closed:
                    # Isolate the emit the same way the PUSH path does via `_fan_out`:
                    # a `poll_fn` failure only skips a tick (handled above), but an
                    # unguarded `cb(item)` raise would kill the poll task permanently
                    # with no re-arm. `CancelledError` (a BaseException) still
                    # propagates to the outer handler.
                    try:
                        cb(item)
                    except Exception as err:
                        # An emit failure must not kill the poller — drop this frame
                        # and keep ticking, same policy as the push path's `_fan_out`.
                        _LOGGER.debug("Poll emit failed for %s (%s): %s", stream.mac, stream.counter_attr, err)
                await asyncio.sleep(stream.poll_interval)
        except asyncio.CancelledError:
            return

    async def _push_pipeline_to_device(self, mac: str) -> None:
        """Recompute pipeline intervals and push to device."""
        # No live session — nothing to push to; the device picks the pipeline up on its
        # next full push. Checked FIRST: `read_firmware_version` below scans every one of
        # the device's registry entries, and a card mounting against an OFFLINE device
        # requests a push all the same, so the wasted scan is not hypothetical.
        session = self.get_session(mac)
        if session is None:
            return

        config = self._store.devices.get(mac, {})
        # Subscriber counts come from the per-mac map, NOT `session`: a freshly
        # reopened connection's own counters are zero even while clients are
        # subscribed (see `_target_subs`).
        counts = self._target_subs.get(mac, {})
        raw_subs = counts.get("raw_target_subs", 0)
        grid_subs = counts.get("grid_target_subs", 0)
        heatmap_subs = counts.get("heatmap_subs", 0)

        pipeline = _compute_pipeline(config, raw_subs, grid_subs, heatmap_subs)

        dev = self.devices.get(mac)
        fw_ver = self.read_firmware_version(dev.device_id if dev is not None else None)
        strip_unsupported_pipeline_fields(pipeline, fw_ver)

        try:
            await session.async_execute_service("epp_set_pipeline", pipeline)
            _LOGGER.info("Pushed pipeline to %s", mac)
        except HomeAssistantError:
            # Service not available on older firmware — silently skip.
            _LOGGER.debug("Device %s does not expose epp_set_pipeline", mac)

    @contextlib.asynccontextmanager
    async def _temp_connection(self, mac: str) -> AsyncIterator[DeviceConnection]:
        """Open a short-lived connection to `mac`'s device for one operation.

        Shared by every temporary-connection site (OTA fallback, build-flags
        fetch, on-boot config push): connect is bounded by
        ``_temp_connection_timeout`` and the connection is always torn down on
        exit. Disconnect failures are logged and swallowed so cleanup can't
        mask the body's real error. Error handling around the *body* stays at
        each call site — the semantics differ (wrap as ``ota_trigger_failed``,
        drop transient errors, return push failure).
        """
        from ..const import DOMAIN as _DOMAIN

        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            # Callers pre-check device/host; this guard keeps a future caller
            # from dereferencing None and surfaces a curated error instead.
            raise HomeAssistantError(
                f"Device {mac} not found",
                translation_domain=_DOMAIN,
                translation_key="device_not_found",
            )
        conn = DeviceConnection(
            dev.host,
            noise_psk=_extract_noise_psk(dev.esphome_config_entry_id, self._hass),
            mac=mac,
            static_presence_cache=self._static_presence_cache,
        )
        try:
            await asyncio.wait_for(
                conn.async_connect(),
                timeout=self._temp_connection_timeout,
            )
            yield conn
        finally:
            try:
                await conn.async_disconnect()
            except Exception:
                _LOGGER.warning("Temp-connection cleanup disconnect for %s failed", mac, exc_info=True)

    async def _fetch_build_flags(self, mac: str, conn: DeviceConnection | None = None) -> None:
        """Fetch and cache build flags from a device, broadcasting on arrival.

        Only caches successful results (including the legitimate "{}" =
        firmware doesn't expose get_build_flags). Transient failures are
        logged and left uncached so the next call retries.

        ``conn`` lets a caller that already holds an open connection (the
        temporary-connection push path) reuse it — opening a second
        connection would race the ESP32's hard concurrent-connection limit.
        Without ``conn``, an active session is preferred for the same reason,
        falling back to a fresh temporary connection.
        """
        if mac in self._build_flags:
            return
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return

        existing = conn or self.get_session(mac)
        if existing is not None:
            try:
                flags = await existing.async_fetch_build_flags()
            except _BUILD_FLAGS_TRANSIENT as err:
                _LOGGER.debug("build_flags fetch via existing conn failed for %s: %s", mac, err)
                return
            self._build_flags[mac] = flags
            if flags:
                self._fire_device_list_changed()
            return

        try:
            async with self._temp_connection(mac) as temp_conn:
                try:
                    flags = await temp_conn.async_fetch_build_flags()
                except _BUILD_FLAGS_TRANSIENT as err:
                    _LOGGER.debug("build_flags fetch via fresh conn failed for %s: %s", mac, err)
                    return
                self._build_flags[mac] = flags
                if flags:
                    self._fire_device_list_changed()
        except _BUILD_FLAGS_CONNECT_TRANSIENT as err:
            _LOGGER.debug("Failed to connect for build_flags fetch from %s: %s", mac, err)

    async def _push_config_to_device(self, mac: str) -> bool:
        """Push config to device, preferring an existing session connection.

        Serialized per mac via `_push_locks` so concurrent invocations
        (e.g., the initial state-change spawn racing the firmware_version-
        arrival re-spawn) don't open overlapping connections to the same
        device — ESP32 has a hard concurrent-connection limit.
        """
        async with self._push_locks.setdefault(mac, asyncio.Lock()):
            return await self._do_push_config_to_device(mac)

    async def _do_push_config_to_device(self, mac: str) -> bool:
        """Inner push body. Always called with `_push_locks[mac]` held."""
        config = self._store.devices.get(mac)
        if config is None:
            await self._fetch_build_flags(mac)
            return True
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return False

        # Gate on firmware compatibility: the wire format for zones,
        # calibration, and pipeline can change between firmware versions,
        # and pushing a stale-shaped payload to a mismatched firmware
        # risks the device interpreting fields incorrectly. The device
        # keeps running on its NVS-persisted config; the Repairs OTA
        # flow (firmware_behind only) is the recovery path.
        fw_ver = self.read_firmware_version(dev.device_id)
        status = _compare_firmware_version(fw_ver) if fw_ver is not None else None
        if status != "compatible":
            if fw_ver is None:
                # Sensor not yet readable — typical reconnect race where
                # another entity transitions online before firmware_version
                # publishes. Recovery happens in `_on_state_changed`'s
                # firmware_version-arrival hook, which clears `_pushing`
                # and re-spawns `_on_device_available`.
                _LOGGER.debug("Skipping push to %s: firmware_version not yet readable", mac)
            elif status == "firmware_behind":
                _LOGGER.warning(
                    "Skipping config push to %s (%s): device firmware %s is behind the integration's "
                    "pinned %s. Device retains its persisted settings; run the OTA from Repairs to "
                    "apply new config.",
                    dev.name,
                    mac,
                    fw_ver,
                    FIRMWARE_VERSION,
                )
            elif status == "firmware_ahead":
                _LOGGER.warning(
                    "Skipping config push to %s (%s): device firmware %s is ahead of the integration's "
                    "pinned %s. Device retains its persisted settings; update the integration via HACS "
                    "to apply new config.",
                    dev.name,
                    mac,
                    fw_ver,
                    FIRMWARE_VERSION,
                )
            else:
                _LOGGER.warning(
                    "Skipping config push to %s (%s): device firmware %s could not be parsed. "
                    "Device retains its persisted settings.",
                    dev.name,
                    mac,
                    fw_ver,
                )
            # Still cache build flags so async_trigger_ota can build the
            # manifest URL — the Repairs OTA path must work even when the
            # config push itself is skipped.
            await self._fetch_build_flags(mac)
            # Return True so `_on_device_available` doesn't tear down the
            # active session via its push-failure backoff. The version
            # won't change without an OTA (cycles offline→online and
            # resets `_pushing`); the race case recovers via the
            # firmware_version-arrival hook in `_on_state_changed`.
            return True

        # Prefer existing session connection (avoids ESP32 concurrent connection limit)
        session_conn = self.get_session(mac)
        if session_conn is not None:
            try:
                await session_conn.async_push_config(config)
                await self._push_pipeline_to_device(mac)
                # `_fetch_build_flags` no-ops when already cached, reuses
                # this session, drops only transient errors, and fires the
                # device-list broadcast on first arrival.
                await self._fetch_build_flags(mac)
                self._manage_log_subscription(session_conn, config)
                return True
            except Exception:
                _LOGGER.warning("Failed to push config to %s (%s) via session", dev.name, mac)
                await self.async_close_session(mac)
                return False

        # No active session — use temporary connection (e.g., on-boot push)
        try:
            async with self._temp_connection(mac) as conn:
                await conn.async_push_config(config)
                # The emission pipeline is DEVICE-global, and the subscriber counts are
                # per-mac (see `_target_subs`) precisely so they outlive any one
                # connection: a temp connection must therefore push the SAME pipeline a
                # session would. This branch runs with clients streaming — a reconnect
                # reaches the push before the re-arm pass has stored its session — and
                # both writers land on the device with last-write-wins, so hard-coding
                # zeros here would silence a stream the card still believes is live.
                counts = self._target_subs.get(mac, {})
                pipeline = _compute_pipeline(
                    config,
                    counts.get("raw_target_subs", 0),
                    counts.get("grid_target_subs", 0),
                    counts.get("heatmap_subs", 0),
                )
                # (`fw_ver` is already known-"compatible" here, so this strip is
                # a no-op today — kept for defense if the gating above changes.)
                strip_unsupported_pipeline_fields(pipeline, fw_ver)
                with contextlib.suppress(HomeAssistantError):
                    await conn.async_execute_service("epp_set_pipeline", pipeline)
                # Reuse the open temp connection for the flags fetch — see
                # the session-path comment for the helper's semantics.
                await self._fetch_build_flags(mac, conn=conn)
            return True
        except Exception:
            _LOGGER.warning("Failed to push config to %s (%s)", dev.name, mac)
            return False

    def _is_device_available(self, mac: str, *, entries: list[er.RegistryEntry] | None = None) -> bool:
        """Check HA entity states to determine if a device is reachable.

        Returns True if any ESPHome entity is in a live state (not
        unavailable or unknown), or if there are no ESPHome entities to
        check (unknown = try to connect).
        Returns False only if entities exist and ALL are unavailable/unknown.
        """
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return True  # No device tracking — try to connect
        if entries is None:
            ent_reg = er.async_get(self._hass)
            entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)
        has_esphome_entity = False
        for entry in entries:
            if entry.platform != "esphome":
                continue
            has_esphome_entity = True
            state = self._hass.states.get(entry.entity_id)
            if state is not None and state.state not in ("unavailable", "unknown"):
                return True
        return not has_esphome_entity  # No entities = unknown = try

    async def _await_pending_close(self, mac: str) -> None:
        """Wait for any in-flight close task for `mac` to finish. Loops because
        a new close can be scheduled while we await the previous one."""
        while (pending := self._pending_closes.get(mac)) is not None and not pending.done():
            with contextlib.suppress(Exception):
                await pending

    async def async_open_session(self, mac: str) -> DeviceConnection | None:
        """Open a persistent connection for a frontend session.

        Returns the connection, or None if the device is not available.
        Each successful call takes one subscriber reference on the session
        (see `_session_refcounts`); callers must pair it with exactly one
        `release_session(mac, conn)` when they no longer need the session.

        Refuses to open while stopping: `release_session` no-ops during teardown
        (async_stop owns the refcounts and the disconnects), so a connection that
        reached `_active_connections` after Phase 3 cleared it would be closed by
        nobody — a live connection surviving unload. Callers all treat None as
        "device not available".
        """
        if self._stopping:
            return None
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return None
        # Fast-fail if HA already knows the device is unavailable
        if not self._is_device_available(mac):
            return None
        # Wait for any pending close to complete first — otherwise a quick
        # unsubscribe→re-subscribe sequence races the close task and the
        # caller gets back a connection that's about to be disconnected.
        # Drain BEFORE taking the lock only. Draining again inside the lock
        # would deadlock: a close scheduled while we were queued for the
        # lock also queues on this lock (async_close_session acquires it),
        # so awaiting it while holding the lock waits forever. Such a close
        # simply runs after we release — which is correct: it pops
        # `_active_connections` and disconnects whatever we stored.
        await self._await_pending_close(mac)
        if self._stopping_now():
            # Teardown can begin while we were parked on the pending-close
            # await above. Re-check here too — otherwise we'd fall through to
            # a full connect + noise handshake (up to 30s) started during/
            # after unload, only to be torn down by the post-connect guard
            # below: a wasted API connection slot and an untracked coroutine
            # outliving async_stop.
            return None
        lock = self._session_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            if self._stopping_now():
                # Same rationale as above: a shutdown that lands while we were
                # queued on this lock (e.g. a contended session) must not let
                # us proceed to construct a DeviceConnection.
                return None
            if mac in self._active_connections:
                conn = self._active_connections[mac]
                if conn.connected:
                    self._session_refcounts[mac] = self._session_refcounts.get(mac, 0) + 1
                    return conn
                # Stale connection — clean up. Pop it from the active map AND
                # drop its refcount BEFORE the disconnect await: references to
                # the dead conn died with it, and a release_session arriving
                # mid-replacement must identity-mismatch (no-op) rather than
                # decrement the count that belongs to the fresh conn below.
                self._active_connections.pop(mac, None)
                self._session_refcounts.pop(mac, None)
                await conn.async_disconnect()
            conn = DeviceConnection(
                dev.host,
                noise_psk=_extract_noise_psk(dev.esphome_config_entry_id, self._hass),
                mac=mac,
                static_presence_cache=self._static_presence_cache,
                # Durable state streams hold no connection of their own: this hook
                # is how they learn the one under them died (see `_on_session_lost`).
                on_stop=self._on_session_lost,
            )
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            # Re-check after the connect: if HA flipped the device offline while we
            # were inside async_connect, storing the new conn would strand a live
            # session against a device the rest of the system already considers gone.
            # Same for a teardown that began while we were parked there — Phase 3 has
            # already cleared `_active_connections`, so this conn would be stranded.
            # `_stopping_now`: same post-await re-check as above — not currently
            # flagged by mypy (the `or` keeps the branch reachable via the other
            # operand), but structurally identical, so kept consistent.
            if self._stopping_now() or not self._is_device_available(mac):
                await conn.async_disconnect()
                return None
            self._active_connections[mac] = conn
            self._session_refcounts[mac] = self._session_refcounts.get(mac, 0) + 1
            _LOGGER.info("Opened session for %s (%s)", dev.name, mac)
            # Subscribe to device logs if log levels are configured
            config = self._store.devices.get(mac)
            if config:
                self._manage_log_subscription(conn, config)
            # A reopened connection comes up with its emission pipeline at the
            # device's defaults. If frontend subscribers are already tracked for
            # this mac — they survive the connection swap (see `_target_subs`) —
            # re-push the pipeline so target/zone emission resumes immediately
            # instead of staying silent until a page refresh re-subscribes.
            #
            # DEBOUNCED, not spawned directly: a card mounts by opening
            # `overview/subscribe` then `overview/subscribe_heatmap` back-to-back, and
            # each records its subscriber count BEFORE arming the stream that opens this
            # session. A direct push would fire an immediate `epp_set_pipeline` carrying
            # the counts as they stood mid-mount, and the arm pass's debounced push would
            # then send the settled ones — two round-trips against a device whose API
            # slots are scarcest exactly when it is recovering. `_request_pipeline_push`
            # collapses them into ONE push with the final counts; its delay is invisible
            # here, since this is fire-and-forget either way.
            if self._target_subs.get(mac):
                self._request_pipeline_push(mac)
            return conn

    @callback
    def release_session(self, mac: str, conn: DeviceConnection) -> asyncio.Task | None:
        """Release one subscriber reference to the active session for `mac`.

        `conn` must be the connection the caller got back from
        `async_open_session`. When it is no longer the active session — a
        force-close (device offline/removed, shutdown) or stale-replacement
        already invalidated the reference — the release is a no-op: the
        count now belongs to whoever opened the replacement session.

        Returns the scheduled close task when this release was the last
        reference (the session is now closing); None otherwise.

        While stopping, always returns `None` — `async_stop` owns the
        refcounts and the disconnects, so a close scheduled here would
        escape the Phase-2 drain.
        """
        if self._stopping:
            # Teardown owns the refcounts and the disconnects (async_stop Phase 3).
            # A close scheduled here lands after the Phase-2 drain and races a second
            # disconnect against the one already in flight.
            return None
        if self._active_connections.get(mac) is not conn:
            return None
        count = self._session_refcounts.get(mac, 0)
        if count > 1:
            self._session_refcounts[mac] = count - 1
            return None
        self._session_refcounts.pop(mac, None)
        return self.schedule_close_session(mac)

    def _schedule_ota_session_release(self, mac: str, conn: DeviceConnection) -> None:
        """Release the ref `async_trigger_ota` took, after a grace window.

        The trigger opens a session and holds it past the trigger so the imminent
        `subscribe_ota_progress` can reuse it and stream progress (the device
        won't accept a NEW connection once the download starts). This drops OUR
        ref after `_OTA_SESSION_GRACE_S`: if a subscriber attached it holds its
        own ref and the session survives the download; if none arrived, this
        release takes the count to zero and closes it. `release_session` is
        identity-checked and no-ops while stopping, so a stale/duplicate release
        is safe. Tracked so `async_stop` can drop the timer cleanly (HA 2026.4+
        fails the test if a timer outlives the config entry).
        """
        if self._stopping:
            # Shutdown has begun: `async_stop` already cancelled/cleared these
            # timers and owns the refcounts + disconnects (it closes the held conn
            # in Phase 3). Arming a timer now — e.g. a trigger that resumed
            # uncancelled after unload started — would outlive the config entry.
            # `release_session` no-ops while stopping anyway, so just don't arm it.
            return
        if (cancel := self._ota_session_releases.pop(mac, None)) is not None:
            cancel()

        @callback
        def _release(_now: Any) -> None:
            self._ota_session_releases.pop(mac, None)
            self.release_session(mac, conn)

        self._ota_session_releases[mac] = async_call_later(self._hass, _OTA_SESSION_GRACE_S, _release)

    def take_ota_flash_expected(self, mac: str) -> bool:
        """Whether `async_trigger_ota` recorded a real flash (old -> target) in
        flight for `mac`, CONSUMING the flag (one-shot per trigger).

        Lets `subscribe_ota_progress` prime the reboot-proof outcome watch for a
        held-session device whose live `_on_state` never fires, without letting a
        stale flag fabricate success on a later re-subscribe. An already-current
        device is never marked, so this returns False for it — preserving the
        'no flash -> no fabricated success' guard.
        """
        if mac in self._ota_flash_expected:
            self._ota_flash_expected.discard(mac)
            return True
        return False

    async def async_close_session(self, mac: str) -> None:
        """Force-close the frontend session connection for a device.

        Bypasses the subscriber refcount and resets it — callers (device
        removed, device offline, host changed, push failure, shutdown) use
        this when the session is dead regardless of who holds references.
        Outstanding `release_session` calls for the closed connection
        no-op via the identity check.

        Acquires the per-mac session lock so a close issued concurrently
        with an in-flight open serializes after it. Without the lock, close
        could run against an empty `_active_connections` (open is still
        inside `async_connect`) and return a no-op while open then stores a
        live conn the caller of close believed was torn down.
        """
        lock = self._session_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            conn = self._active_connections.pop(mac, None)
            self._session_refcounts.pop(mac, None)
            if conn is not None:
                await conn.async_disconnect()
                dev = self.devices.get(mac)
                name = dev.name if dev else mac
                _LOGGER.info("Closed session for %s (%s)", name, mac)

    @callback
    def schedule_close_session(self, mac: str) -> asyncio.Task:
        """Schedule async_close_session (a force-close) as a tracked task.

        Like async_close_session this bypasses the subscriber refcount and
        resets it — multi-subscriber callers want `release_session` instead.

        Subsequent async_open_session calls for the same mac await this task
        before opening a fresh session — otherwise a quick close→reopen
        sequence races the close and returns the about-to-be-closed conn.
        Re-scheduling while a close is already in flight returns the existing
        task instead of starting a duplicate.
        """
        existing = self._pending_closes.get(mac)
        if existing is not None and not existing.done():
            return existing
        task = self._hass.async_create_task(self.async_close_session(mac))
        self._pending_closes[mac] = task

        def _drop(_: asyncio.Task) -> None:
            # Only forget the task if it's still the one we registered. A
            # close that errored mid-flight could otherwise be replaced by a
            # new schedule before this callback fires.
            if self._pending_closes.get(mac) is task:
                self._pending_closes.pop(mac, None)

        task.add_done_callback(_drop)
        return task

    def get_session(self, mac: str) -> DeviceConnection | None:
        """Get the active session connection for a device, or None."""
        conn = self._active_connections.get(mac)
        if conn is not None and conn.connected:
            return conn
        return None

    def list_devices(self) -> list[dict[str, Any]]:
        """Return serializable list of managed devices for the frontend."""
        dev_reg = dr.async_get(self._hass)
        area_reg = ar.async_get(self._hass)
        ent_reg = er.async_get(self._hass)
        result = []
        for mac, dev in self.devices.items():
            config = self._store.devices.get(mac)
            entries = (
                er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)
                if dev.device_id
                else []
            )
            fw_ver = self.read_firmware_version(dev.device_id, entries=entries)
            registry_entry = dev_reg.async_get(dev.device_id) if dev.device_id else None
            fresh_name = ((registry_entry.name_by_user or registry_entry.name) if registry_entry else None) or dev.name
            area_name = _area_name(area_reg, registry_entry.area_id if registry_entry else None)
            device_entry = {
                "mac": mac,
                "name": config.get("name", fresh_name) if config else fresh_name,
                "host": dev.host,
                "available": self._is_device_available(mac, entries=entries),
                "configured": config is not None,
                "area": area_name,
                "firmware_status": (
                    (_compare_firmware_version(fw_ver) if fw_ver is not None else None) or "unavailable"
                ),
                "current_connection_count": self.read_current_connection_count(dev.device_id, entries=entries),
            }
            # Merge cached build flags WITHOUT letting them clobber the base
            # fields above — get_build_flags data comes from the device, and
            # a buggy/malicious firmware must not rewrite identity fields
            # like `mac` / `host` / `available` in the frontend payload.
            for key, value in self._build_flags.get(mac, {}).items():
                device_entry.setdefault(key, value)
            result.append(device_entry)
        return result

    async def list_flashable_devices(self) -> list[dict[str, Any]]:
        """Return all ESPHome EPP devices — both original and EPP Grid firmware."""
        dev_reg = dr.async_get(self._hass)
        ent_reg = er.async_get(self._hass)
        area_reg = ar.async_get(self._hass)
        result: list[dict[str, Any]] = []
        seen_macs: set[str] = set()

        for device in all_devices(dev_reg):
            # Must be an EPP device (check manufacturer + model)
            if not _is_epp_device(device):
                continue

            mac = _extract_mac(device)
            if mac is None or mac in seen_macs:
                continue
            seen_macs.add(mac)

            # Find the ESPHome config entry for this device
            esphome_config_entry_id = None
            for entry_id in device.config_entries:
                entry = self._hass.config_entries.async_get_entry(entry_id)
                if entry is not None and entry.domain == "esphome":
                    esphome_config_entry_id = entry_id
                    break

            host = _extract_host(device, esphome_config_entry_id, self._hass)

            # One registry scan per device for all three checks below.
            # `include_disabled_entities=True` so a user-disabled entity
            # doesn't make the device look like it has no entities at all
            # (which would mis-report availability=False on a fully-disabled
            # device that's actually online).
            entries = er.async_entries_for_device(ent_reg, device.id, include_disabled_entities=True)

            has_firmware_version = any(_is_esphome_entity(e, "sensor", "firmware_version") for e in entries)

            # Filter to ESPHome — HA devices can aggregate entities from
            # multiple integrations; a live non-ESPHome sibling shouldn't
            # mark this flashable target available when every ESPHome
            # entity is offline.
            available = any(
                e.platform == "esphome"
                and (state := self._hass.states.get(e.entity_id)) is not None
                and state.state not in ("unavailable", "unknown")
                for e in entries
            )

            # Check if an update is available via ESPHome update entity. Loop
            # past disabled / not-yet-published update entities until we find
            # one with a readable state, otherwise a disabled sibling can mask
            # a real "update available".
            update_available = False
            for ent_entry in entries:
                if ent_entry.domain == "update" and ent_entry.platform == "esphome":
                    state = self._hass.states.get(ent_entry.entity_id)
                    if state is not None:
                        if state.state == "on":
                            update_available = True
                        break

            managed_dev = self.devices.get(mac)
            fw_ver = (
                self.read_firmware_version(managed_dev.device_id, entries=entries)
                if has_firmware_version and managed_dev is not None
                else None
            )
            sw_fallback = (device.sw_version or "").split(" (")[0] or "unknown"
            display_name = device.name_by_user or device.name or "EPP Device"
            # The HA area this device lives in, surfaced on the flasher row so a
            # device can be placed at a glance. Prefer the device's own area; for
            # a sub-device linked to the ESPHome node via `via_device` that has no
            # area of its own, fall back to the parent node's area. None when
            # neither is assigned.
            area_id = device.area_id
            if area_id is None and device.via_device_id:
                parent = dev_reg.async_get(device.via_device_id)
                if parent is not None:
                    area_id = parent.area_id
            area_name = _area_name(area_reg, area_id)
            result.append(
                {
                    "mac": mac,
                    "name": display_name,
                    "area": area_name,
                    "host": host,
                    "available": available,
                    "firmware_type": "eppgrid" if has_firmware_version else "original",
                    "firmware_version": (
                        (fw_ver or sw_fallback) if has_firmware_version and managed_dev is not None else sw_fallback
                    ),
                    "firmware_status": (
                        ((_compare_firmware_version(fw_ver) if fw_ver is not None else None) or "unavailable")
                        if has_firmware_version and managed_dev is not None
                        else "unknown"
                    ),
                    "esphome_config_entry_id": esphome_config_entry_id,
                    "update_available": update_available,
                }
            )

        return result

    async def async_update_zone_entities(self, mac: str, zone_slots: list[dict[str, Any] | None]) -> None:
        """Enable/disable and rename ESPHome zone entities for a device.

        Handles both zone_presence and zone_target_count entities.
        When enabled, zone 0 + named zones are enabled; unused slots are disabled.

        Fails closed on malformed ``zone_slots`` shape. A legacy 0.93.x layout
        stored with length 7 (or any other shape where slot 0 is not a dict)
        would otherwise silently shift indices — the user's old "first named
        zone" would get renamed into zone 0, etc. Instead we treat every zone
        as non-existent and disable all HA zone entities until the user
        re-applies their layout via the panel (which writes length-8 shape).
        """
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return

        # Shape guard: fail-closed on anything that isn't the expected length-8
        # list with a dict at slot 0.
        shape_ok = is_valid_zone_slots_shape(zone_slots)

        language = self._hass.config.language
        ent_reg = er.async_get(self._hass)
        config = self._store.devices.get(mac) or {}
        settings = config.get("settings", {})
        zone_presence = settings.get("zone_presence", False)
        zone_target_count = settings.get("zone_target_count", False)

        def _zone_exists(i: int) -> bool:
            """Check if zone slot i exists.

            When the shape is OK, zone 0 (room) always exists, and named slots
            1..7 exist only when they are dicts. When the shape is malformed,
            every zone is treated as non-existent — the loop below then falls
            through to the INTEGRATION-disable path for each entity.
            """
            if not shape_ok:
                return False
            if i == 0:
                return True
            slot = zone_slots[i]
            return isinstance(slot, dict)

        # Build (zone_index, suffix) → RegistryEntry from a single device scan.
        # Previously this method called `_find_zone_entity` 16 times, each time
        # walking the *entire* entity registry, for ~16N work per push.
        # Match by exact object_id (via `_esphome_object_id`, format-normalised)
        # so neighbouring sensors that merely contain "zone_3_presence" can't
        # false-match.
        zone_entries: dict[tuple[int, str], er.RegistryEntry] = {}
        for entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
            if entry.platform != "esphome":
                continue
            object_id = _esphome_object_id(entry.unique_id)
            for i in range(MAX_ZONES + 1):
                if object_id == f"zone_{i}_presence":
                    zone_entries[(i, "presence")] = entry
                    break
                if object_id == f"zone_{i}_target_count":
                    zone_entries[(i, "target_count")] = entry
                    break

        for i in range(MAX_ZONES + 1):  # zones 0-7
            exists = _zone_exists(i)
            # Zone 0 ("Rest of Room") has no user-supplied name; named slots
            # carry one. Guard the slot read behind shape_ok — malformed
            # shapes may be shorter than MAX_ZONES + 1.
            slot = zone_slots[i] if shape_ok and i > 0 else None
            # .get() with fallback — _resolve_zone_name tolerates zone_name=None.
            zone_name = slot.get("name") if isinstance(slot, dict) else None

            presence_entry = zone_entries.get((i, "presence"))
            if presence_entry is not None:
                enabled = zone_presence and exists
                self._apply_zone_entity(
                    ent_reg,
                    presence_entry,
                    enabled=enabled,
                    name=(
                        _resolve_zone_name(language, index=i, zone_name=zone_name, target_count=False)
                        if enabled
                        else None
                    ),
                )

            tc_entry = zone_entries.get((i, "target_count"))
            if tc_entry is not None:
                enabled = zone_target_count and exists
                self._apply_zone_entity(
                    ent_reg,
                    tc_entry,
                    enabled=enabled,
                    name=(
                        _resolve_zone_name(language, index=i, zone_name=zone_name, target_count=True)
                        if enabled
                        else None
                    ),
                )

    @staticmethod
    def _apply_zone_entity(
        ent_reg: er.EntityRegistry,
        entry: er.RegistryEntry,
        *,
        enabled: bool,
        name: str | None,
    ) -> None:
        """Enable/disable + rename one zone entity, respecting the USER disabler.

        Single implementation for all presence and target-count branches of
        `async_update_zone_entities` — the previous three-way duplication is
        what let the zone-0 branch ship without the USER guard:

        - an entity the user disabled by hand is never touched: neither
          re-enabled nor re-stamped with the INTEGRATION disabler;
        - enabling applies the resolved zone name;
        - disabling only writes when the entity isn't already disabled
          (sets INTEGRATION and clears the name).
        """
        if entry.disabled_by == er.RegistryEntryDisabler.USER:
            return
        if enabled:
            ent_reg.async_update_entity(entry.entity_id, disabled_by=None, name=name)
        elif entry.disabled_by is None:
            ent_reg.async_update_entity(
                entry.entity_id,
                disabled_by=er.RegistryEntryDisabler.INTEGRATION,
                name=None,
            )
