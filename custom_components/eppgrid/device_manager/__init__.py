"""Device manager: discovery, connections, config push, entity management."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Coroutine
from dataclasses import dataclass
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
from homeassistant.helpers.event import async_call_later

from ..const import EPP_MANUFACTURER
from ..const import EPP_MODEL
from ..const import FIRMWARE_VERSION
from ..const import MAX_ZONES
from ..const import empty_zone_slots
from ..storage import EPPGridStore
from ._connection import DeviceConnection
from ._helpers import ZONE_TYPE_DEFAULTS as ZONE_TYPE_DEFAULTS  # re-export for tests
from ._helpers import _compare_firmware_version
from ._helpers import _compute_pipeline
from ._helpers import _extract_host
from ._helpers import _extract_mac
from ._helpers import _extract_noise_psk
from ._helpers import _raise_service_unavailable as _raise_service_unavailable  # re-export for tests
from ._helpers import _resolve_zone_name
from ._helpers import _sync_firmware_repair_issue
from ._helpers import is_valid_zone_slots_shape

_LOGGER = logging.getLogger(__name__)

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


@dataclass
class ManagedDevice:
    """Tracked ESPHome device with zone engine firmware."""

    mac: str
    name: str
    host: str | None = None
    esphome_config_entry_id: str | None = None
    device_id: str | None = None
    available: bool = False


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
        self._build_flags: dict[str, dict[str, Any]] = {}
        # One connection per device, kept alive for the frontend session
        self._active_connections: dict[str, DeviceConnection] = {}
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
        # In-flight close tasks keyed by mac. async_open_session awaits these
        # before opening so a quick close→reopen doesn't return a connection
        # that the close task is about to disconnect.
        self._pending_closes: dict[str, asyncio.Task] = {}
        # Pending debounce timer per mac for `_request_push`. The dict key
        # supports cancel-prev-on-new-request; tasks are also tracked in
        # `_pending_tasks` (via _spawn) so async_stop's drain catches any
        # that escape the Phase 1 cancel loop.
        self._pending_pushes: dict[str, asyncio.Task] = {}
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
        self._device_list_callbacks: list[Any] = []
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

    @callback
    def on_device_list_changed(self, cb: Any) -> Any:
        """Register a callback for device list changes. Returns an unsub callable."""
        self._device_list_callbacks.append(cb)

        @callback
        def unsub() -> None:
            if cb in self._device_list_callbacks:
                self._device_list_callbacks.remove(cb)

        return unsub

    @callback
    def _fire_device_list_changed(self) -> None:
        """Notify all subscribers that the device list has changed."""
        for cb in list(self._device_list_callbacks):
            try:
                cb()
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
        ent_reg = er.async_get(self._hass)
        for mac in list(self.devices):
            if mac not in self._pushing:
                dev = self.devices[mac]
                # Only push to devices that are actually online — check if at
                # least one entity has a non-unavailable state.
                if dev.device_id:
                    entries = er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True)
                    if entries and all(
                        (s := self._hass.states.get(e.entity_id)) is None or s.state == STATE_UNAVAILABLE
                        for e in entries
                    ):
                        continue
                self._pushing.add(mac)
                self._spawn(self._on_device_available(mac))

    @callback
    def _schedule_entity_update_clear(self, mac: str, delay: float = 60.0) -> None:
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
        from homeassistant.helpers.event import async_track_state_change_event

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
        3. Disconnect all active connections in parallel, each bounded by
           ``_disconnect_timeout``. On timeout we force the local cleanup
           via ``_release_references()`` because aioesphomeapi's
           ``_on_stop`` only fires after ``client.disconnect()`` finishes
           — a cancelled ``wait_for`` would otherwise leave the
           ``DeviceConnection`` half-initialised.
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

        # Phase 3: bounded parallel disconnect.
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

    async def async_trigger_ota(self, mac: str) -> None:
        """Trigger firmware OTA update on a device.

        Derives the firmware variant from cached build flags, constructs the
        manifest URL from `OTA_MANIFEST_BASE_URL`, and calls the device's
        `set_update_manifest` API action over a temporary connection. Shared
        by the panel's `update_firmware` websocket handler and the Repairs
        framework's `FirmwareUpdateRepairFlow`.

        Raises HomeAssistantError with a translation_key on every failure
        path so callers can map the failure to a user-facing message.
        """
        from ..const import DOMAIN as _DOMAIN
        from ..const import FIRMWARE_VARIANTS
        from ..const import OTA_MANIFEST_BASE_URL

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
        network = "ethernet" if flags.get("ethernet_enabled") else "wifi"
        variant = FIRMWARE_VARIANTS.get(network)
        if variant is None:
            raise HomeAssistantError(
                f"No firmware variant for network type: {network}",
                translation_domain=_DOMAIN,
                translation_key="no_firmware_variant",
                translation_placeholders={"network": network},
            )
        manifest_url = f"{OTA_MANIFEST_BASE_URL}/{variant}.json"

        lock = self._ota_locks.setdefault(mac, asyncio.Lock())
        if lock.locked():
            raise HomeAssistantError(
                f"OTA already in progress for {mac}",
                translation_domain=_DOMAIN,
                translation_key="ota_in_progress",
            )
        async with lock:
            # Prefer the live session if one exists — opening a second connection
            # would race against the device's per-API-client connection cap.
            session = self.get_session(mac)
            if session is not None:
                try:
                    await session.async_execute_service("set_update_manifest", {"url": manifest_url})
                    _LOGGER.info("Triggered OTA via session for %s (manifest=%s)", mac, manifest_url)
                    return
                except HomeAssistantError:
                    raise
                except Exception as err:
                    # Wrap aioesphomeapi (and any other unexpected) exceptions so
                    # callers see a stable message-bearing type rather than raw
                    # technical text from a third-party library. Carry
                    # translation metadata so the websocket / Repairs surfaces
                    # can localize the message — the docstring promises a
                    # translation_key on every failure path.
                    _LOGGER.warning("OTA via session for %s failed", mac, exc_info=True)
                    raise HomeAssistantError(
                        f"Could not contact device {mac}: {err}",
                        translation_domain=_DOMAIN,
                        translation_key="ota_trigger_failed",
                        translation_placeholders={"mac": mac, "error": str(err)},
                    ) from err

            # No session — fall back to a fresh, short-lived connection.
            conn = DeviceConnection(
                dev.host,
                noise_psk=_extract_noise_psk(dev.esphome_config_entry_id, self._hass),
            )
            try:
                await conn.async_connect()
                await conn.async_execute_service("set_update_manifest", {"url": manifest_url})
                _LOGGER.info("Triggered OTA via temp conn for %s (manifest=%s)", mac, manifest_url)
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
            finally:
                # Best-effort cleanup. A failure here would otherwise mask
                # the real OTA error (or surface a non-HA exception that the
                # websocket handler doesn't catch) — log and swallow.
                try:
                    await conn.async_disconnect()
                except Exception:
                    _LOGGER.warning("OTA cleanup disconnect for %s failed", mac, exc_info=True)

    def read_firmware_version(
        self, device_id: str | None, *, entries: list[er.RegistryEntry] | None = None
    ) -> str | None:
        """Read the Firmware Version text sensor value for a device.

        Returns the version string, or ``None`` when:
          * ``device_id`` is unknown (caller has no device to look up)
          * the entity is unavailable / unknown / empty
          * the entity does not exist at all (older or non-EPP firmware)

        Callers must treat ``None`` as 'unknown' — never compare against a
        synthetic ``"0.0.0"``, which would collide with a real (very old)
        firmware version and trigger a fake ``firmware_behind`` Repairs issue.

        ``entries`` lets the caller pass pre-fetched device entries so callers
        looping over many devices don't re-scan the entity registry per
        helper call.
        """
        if device_id is None:
            return None
        if entries is None:
            ent_reg = er.async_get(self._hass)
            entries = er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True)
        for entry in entries:
            if (
                entry.platform == "esphome"
                and entry.domain == "sensor"
                and entry.unique_id.endswith("-firmware_version")
            ):
                state = self._hass.states.get(entry.entity_id)
                if state is not None and state.state not in (None, "unknown", "unavailable", ""):
                    return state.state
                return None
        return None

    def read_current_connection_count(
        self, device_id: str | None, *, entries: list[er.RegistryEntry] | None = None
    ) -> int | None:
        """Read the Current Connections sensor value for a device.

        Returns the count (int), or None if the entity is missing or unavailable.
        """
        if device_id is None:
            return None
        if entries is None:
            ent_reg = er.async_get(self._hass)
            entries = er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True)
        for entry in entries:
            if entry.platform == "esphome" and entry.unique_id.endswith("current_connections"):
                state = self._hass.states.get(entry.entity_id)
                if state is not None and state.state not in (None, "unknown", "unavailable", ""):
                    try:
                        return int(float(state.state))
                    except (ValueError, TypeError):
                        pass
                return None
        return None

    async def async_discover(self) -> None:
        """Scan entity registry for ESPHome devices with firmware_version."""
        ent_reg = er.async_get(self._hass)
        dev_reg = dr.async_get(self._hass)

        found_new = False
        ids_changed = False
        for entry in ent_reg.entities.values():
            if entry.platform != "esphome":
                continue
            if entry.domain != "sensor":
                continue
            if not entry.unique_id.endswith("-firmware_version"):
                continue
            if entry.device_id is None:
                continue

            device = dev_reg.async_get(entry.device_id)
            if device is None:
                continue

            if device.manufacturer != EPP_MANUFACTURER or device.model != EPP_MODEL:
                continue

            mac = _extract_mac(device)
            if mac is None:
                continue

            host = _extract_host(device, entry.config_entry_id, self._hass)

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
            self.devices[mac] = ManagedDevice(
                mac=mac,
                name=device.name_by_user or device.name or "EPP Device",
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
        # New ESPHome entity — refresh the targeted state-change tracker so
        # the new entity_id gets included, whether it's on a brand-new
        # device (about to be discovered below) or an existing managed one.
        self._refresh_state_listener()
        # Skip only if the entity's device is already discovered AND the
        # underlying HA device.id matches what we have. If device.id changed
        # for a known MAC (the user removed and re-added the ESPHome
        # integration without going through HA's device-removal flow), we
        # need to re-run discovery so the rediscovery branch in
        # async_discover gets a chance to swap listeners and close the stale
        # session. Skipping here would freeze us on the old entry forever.
        if entry.device_id:
            dev_reg = dr.async_get(self._hass)
            device = dev_reg.async_get(entry.device_id)
            if device:
                mac = _extract_mac(device)
                if mac and mac in self.devices and self.devices[mac].device_id == entry.device_id:
                    return
        self._spawn(self.async_discover())

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

        # Treat 'unknown' like 'unavailable' — newly-added ESPHome entities
        # can go unknown → value without passing through unavailable, and
        # that transition still means the device just came online.
        offline_states = (STATE_UNAVAILABLE, STATE_UNKNOWN)

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
        # `read_firmware_version` treats unavailable, unknown, AND empty
        # string as 'no data'. Mirror that here for the transition guard;
        # otherwise `unavailable → "" → real_version` would slip past
        # because the second transition has `old_state=""` which the
        # narrower `offline_states` set wouldn't match, and the push
        # retrigger would never fire.
        fw_offline_states = (STATE_UNAVAILABLE, STATE_UNKNOWN, "")
        if (
            entry.domain == "sensor"
            and "firmware_version" in entry.unique_id
            and old_state_value in fw_offline_states
            and new_state.state not in fw_offline_states
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

        if new_state.state in offline_states:
            # Device went offline — allow a fresh push when it comes back and
            # close any active session so the stale APIClient is replaced on
            # the next frontend reconnect. Route through schedule_close_session
            # so the task is tracked in `_pending_closes` and async_stop can
            # drain it instead of leaking past teardown.
            self._pushing.discard(mac)
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

        if old_state_value not in offline_states:
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
        self._build_flags.pop(mac, None)
        self._session_locks.pop(mac, None)
        self._ota_locks.pop(mac, None)
        self._connection_failed.discard(mac)
        self._entity_update_macs.discard(mac)
        self._pushing.discard(mac)
        self._last_repair_sync.pop(mac, None)
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

        # Skip push if we caused this reconnect via entity registry updates.
        # Don't clear the guard here — multiple entities cycle through
        # unavailable→available during an ESPHome reload, creating multiple
        # tasks.  The 60-second timer in websocket_set_settings handles cleanup.
        if mac in self._entity_update_macs and mac not in self._failed_pushes:
            _LOGGER.debug("Skipping redundant push for %s (entity update guard)", mac)
            # Must broadcast the false→true transition even when skipping the
            # push, else the frontend's recovery hook (onSelectedAvailable)
            # never runs and its WS state subs stay attached to the
            # torn-down DeviceConnection.
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

    def _request_push(self, mac: str, delay: float = 0.1) -> None:
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

    async def _push_pipeline_to_device(self, mac: str) -> None:
        """Recompute pipeline intervals and push to device."""
        config = self._store.devices.get(mac, {})
        session = self.get_session(mac)
        raw_subs = session.raw_target_subs if session else 0
        grid_subs = session.grid_target_subs if session else 0

        pipeline = _compute_pipeline(config, raw_subs, grid_subs)

        # Push via session if available, otherwise skip (device will get it on next full push)
        if session is not None and session.connected:
            try:
                await session.async_execute_service("epp_set_pipeline", pipeline)
                _LOGGER.info("Pushed pipeline to %s", mac)
            except HomeAssistantError:
                # Service not available on older firmware — silently skip.
                _LOGGER.debug("Device %s does not expose epp_set_pipeline", mac)

    async def _fetch_build_flags(self, mac: str) -> None:
        """Fetch and cache build flags from a device.

        Only caches successful results (including the legitimate "{}" =
        firmware doesn't expose get_build_flags). Transient failures are
        logged and left uncached so the next call retries.
        """
        if mac in self._build_flags:
            return
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return

        # Prefer existing session to avoid hitting ESP32 concurrent connection limit
        session = self.get_session(mac)
        if session is not None:
            try:
                flags = await session.async_fetch_build_flags()
            except _BUILD_FLAGS_TRANSIENT as err:
                _LOGGER.debug("build_flags fetch via session failed for %s: %s", mac, err)
                return
            self._build_flags[mac] = flags
            if flags:
                self._fire_device_list_changed()
            return

        conn = DeviceConnection(
            dev.host,
            noise_psk=_extract_noise_psk(dev.esphome_config_entry_id, self._hass),
        )
        try:
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            try:
                flags = await conn.async_fetch_build_flags()
            except _BUILD_FLAGS_TRANSIENT as err:
                _LOGGER.debug("build_flags fetch via fresh conn failed for %s: %s", mac, err)
                return
            self._build_flags[mac] = flags
            if flags:
                self._fire_device_list_changed()
        except _BUILD_FLAGS_CONNECT_TRANSIENT as err:
            _LOGGER.debug("Failed to connect for build_flags fetch from %s: %s", mac, err)
        finally:
            await conn.async_disconnect()

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
                if mac not in self._build_flags:
                    with contextlib.suppress(Exception):
                        self._build_flags[mac] = await session_conn.async_fetch_build_flags()
                self._manage_log_subscription(session_conn, config)
                return True
            except Exception:
                _LOGGER.warning("Failed to push config to %s (%s) via session", dev.name, mac)
                await self.async_close_session(mac)
                return False

        # No active session — use temporary connection (e.g., on-boot push)
        conn = DeviceConnection(
            dev.host,
            noise_psk=_extract_noise_psk(dev.esphome_config_entry_id, self._hass),
        )
        try:
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            await conn.async_push_config(config)
            # Push pipeline directly (no subscribers on temp connections)
            pipeline = _compute_pipeline(config, 0, 0)
            with contextlib.suppress(HomeAssistantError):
                await conn.async_execute_service("epp_set_pipeline", pipeline)
            if mac not in self._build_flags:
                with contextlib.suppress(Exception):
                    self._build_flags[mac] = await conn.async_fetch_build_flags()
            return True
        except Exception:
            _LOGGER.warning("Failed to push config to %s (%s)", dev.name, mac)
            return False
        finally:
            await conn.async_disconnect()

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
        Returns the connection, or None if the device is not available."""
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
        lock = self._session_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            if mac in self._active_connections:
                conn = self._active_connections[mac]
                if conn.connected:
                    return conn
                # Stale connection — clean up
                await conn.async_disconnect()
            conn = DeviceConnection(
                dev.host,
                noise_psk=_extract_noise_psk(dev.esphome_config_entry_id, self._hass),
            )
            await asyncio.wait_for(conn.async_connect(), timeout=30)
            # Re-check availability after the connect: if HA flipped the
            # device offline while we were inside async_connect, storing the
            # new conn would strand a live session against a device the rest
            # of the system already considers gone.
            if not self._is_device_available(mac):
                await conn.async_disconnect()
                return None
            self._active_connections[mac] = conn
            _LOGGER.info("Opened session for %s (%s)", dev.name, mac)
            # Subscribe to device logs if log levels are configured
            config = self._store.devices.get(mac)
            if config:
                self._manage_log_subscription(conn, config)
            return conn

    async def async_close_session(self, mac: str) -> None:
        """Close the frontend session connection for a device.

        Acquires the per-mac session lock so a close issued concurrently
        with an in-flight open serializes after it. Without the lock, close
        could run against an empty `_active_connections` (open is still
        inside `async_connect`) and return a no-op while open then stores a
        live conn the caller of close believed was torn down.
        """
        lock = self._session_locks.setdefault(mac, asyncio.Lock())
        async with lock:
            conn = self._active_connections.pop(mac, None)
            if conn is not None:
                await conn.async_disconnect()
                dev = self.devices.get(mac)
                name = dev.name if dev else mac
                _LOGGER.info("Closed session for %s (%s)", name, mac)

    @callback
    def schedule_close_session(self, mac: str) -> asyncio.Task:
        """Schedule async_close_session as a tracked task for the given mac.

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
            area_name: str | None = None
            if registry_entry and registry_entry.area_id:
                area = area_reg.async_get_area(registry_entry.area_id)
                if area is not None:
                    area_name = area.name
            result.append(
                {
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
                    **self._build_flags.get(mac, {}),
                }
            )
        return result

    async def list_flashable_devices(self) -> list[dict[str, Any]]:
        """Return all ESPHome EPP devices — both original and EPP Grid firmware."""
        dev_reg = dr.async_get(self._hass)
        ent_reg = er.async_get(self._hass)
        result: list[dict[str, Any]] = []
        seen_macs: set[str] = set()

        for device in dev_reg.devices.values():
            # Must be an EPP device (check manufacturer + model)
            if device.manufacturer != EPP_MANUFACTURER:
                continue
            if device.model != EPP_MODEL:
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

            has_firmware_version = any(
                e.platform == "esphome" and e.domain == "sensor" and e.unique_id.endswith("-firmware_version")
                for e in entries
            )

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
            result.append(
                {
                    "mac": mac,
                    "name": device.name_by_user or device.name or "EPP Device",
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
        # Anchored `endswith` (not substring) so neighbouring sensors that
        # happen to contain "zone_3_presence" can't false-match.
        zone_entries: dict[tuple[int, str], er.RegistryEntry] = {}
        for entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
            if entry.platform != "esphome":
                continue
            for i in range(MAX_ZONES + 1):
                if entry.unique_id.endswith(f"-zone_{i}_presence"):
                    zone_entries[(i, "presence")] = entry
                    break
                if entry.unique_id.endswith(f"-zone_{i}_target_count"):
                    zone_entries[(i, "target_count")] = entry
                    break

        for i in range(MAX_ZONES + 1):  # zones 0-7
            exists = _zone_exists(i)

            # Zone presence entity
            presence_entry = zone_entries.get((i, "presence"))
            if presence_entry is not None:
                entity_id = presence_entry.entity_id
                if not zone_presence or not exists:
                    ent_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION, name=None)
                elif i == 0:
                    ent_reg.async_update_entity(
                        entity_id,
                        disabled_by=None,
                        name=_resolve_zone_name(language, index=0, zone_name=None, target_count=False),
                    )
                else:
                    zone = zone_slots[i]
                    if presence_entry.disabled_by == er.RegistryEntryDisabler.USER:
                        pass  # Don't override user-disabled entities
                    else:
                        # .get() with fallback — _resolve_zone_name tolerates zone_name=None.
                        zone_name = zone.get("name") if isinstance(zone, dict) else None
                        ent_reg.async_update_entity(
                            entity_id,
                            disabled_by=None,
                            name=_resolve_zone_name(language, index=i, zone_name=zone_name, target_count=False),
                        )

            # Zone target count entity
            tc_entry = zone_entries.get((i, "target_count"))
            if tc_entry is not None:
                tc_entity_id = tc_entry.entity_id
                if tc_entry.disabled_by == er.RegistryEntryDisabler.USER:
                    pass  # Don't override user-disabled entities
                elif zone_target_count and exists:
                    if i == 0:
                        ent_reg.async_update_entity(
                            tc_entity_id,
                            disabled_by=None,
                            name=_resolve_zone_name(language, index=0, zone_name=None, target_count=True),
                        )
                    else:
                        zone = zone_slots[i]
                        zone_name = zone.get("name") if isinstance(zone, dict) else None
                        ent_reg.async_update_entity(
                            tc_entity_id,
                            disabled_by=None,
                            name=_resolve_zone_name(language, index=i, zone_name=zone_name, target_count=True),
                        )
                else:
                    ent_reg.async_update_entity(
                        tc_entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION, name=None
                    )
