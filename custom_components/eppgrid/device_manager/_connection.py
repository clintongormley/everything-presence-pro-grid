"""DeviceConnection — on-demand aioesphomeapi client wrapper for one device."""

from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import logging
from collections.abc import Callable
from typing import Any

from aioesphomeapi import APIClient
from aioesphomeapi import LogLevel
from aioesphomeapi import UserService

from ..const import DEFAULT_PORT
from ..const import GRID_CELL_SIZE_MM
from ..const import GRID_COLS
from ._helpers import _ESPHOME_TO_PYTHON_LOG
from ._helpers import _expand_zone_slot
from ._helpers import _raise_device_not_connected
from ._helpers import _raise_service_unavailable
from ._helpers import _static_presence_args
from ._helpers import is_valid_zone_slots_shape

_LOGGER = logging.getLogger(__name__)
_DEVICE_LOGGER = logging.getLogger(f"{__name__}.device_logs")


def _fan_out(callbacks: list[Any], invoke: Callable[[Any], None], label: str) -> None:
    """Invoke ``invoke(cb)`` for every callback, isolating failures.

    Shared drop-on-failure policy for the state and log fan-out paths: a
    callback that raises must not stop later callbacks or propagate into
    aioesphomeapi's packet path, and is dropped after logging once —
    keeping it registered would flood HA logs at the device's emit rate
    (potentially many Hz on a busy device).
    """
    failed: list[Any] = []
    for cb in list(callbacks):
        try:
            invoke(cb)
        except Exception:
            _LOGGER.exception("%s raised; dropping it", label)
            failed.append(cb)
    for cb in failed:
        with contextlib.suppress(ValueError):
            callbacks.remove(cb)


class DeviceConnection:
    """On-demand API connection to an EPP device."""

    def __init__(self, host: str, port: int = DEFAULT_PORT, noise_psk: str = "") -> None:
        self._host = host
        self._port = port
        self._noise_psk = noise_psk
        self._client: APIClient | None = None
        self._services: dict[str, UserService] = {}
        self._entities: list = []
        self._state_subscribers: list[Any] = []
        self._states_subscribed: bool = False
        self._subscribe_lock = asyncio.Lock()
        self._log_callbacks: list[Any] = []
        self._unsub_logs: Any = None
        self.connected: bool = False
        self.raw_target_subs: int = 0
        self.grid_target_subs: int = 0
        # Shared OTA-progress watcher state, owned by
        # websocket_api._firmware.websocket_subscribe_ota_progress: N
        # concurrent watchers share ONE device log subscription and ONE
        # log-level bump on this connection, reverted only when the last
        # watcher releases. Lives here (per-connection) so the state dies
        # with the connection instead of leaking across reconnects.
        self.ota_watchers: int = 0
        self.ota_started_log_sub: bool = False
        self.ota_bumped_log_level: bool = False

    async def async_connect(self) -> None:
        """Connect to the device and cache available services."""
        if self.connected:
            return
        client = APIClient(self._host, self._port, "", noise_psk=self._noise_psk)

        async def _on_stop(expected_disconnect: bool) -> None:
            self._release_references()

        try:
            await client.connect(on_stop=_on_stop, login=True)
            entities, services = await client.list_entities_services()
        except asyncio.CancelledError:
            # CancelledError must be cleaned up too: callers typically wrap
            # us in asyncio.wait_for, so a timeout firing between a
            # successful connect() and the entity listing lands here. Without
            # the disconnect, the connected APIClient is orphaned
            # (`self._client` was never assigned, so nothing can ever close
            # it) and holds one of the ESP32's hard-limited API slots
            # forever. disconnect(force=True) tears down synchronously inside
            # aioesphomeapi (no internal awaits), so the cleanup can neither
            # be interrupted by a second cancellation nor stretch the
            # caller's deadline; the bare `raise` preserves the original
            # cancellation so the caller's timeout machinery can classify it.
            await client.disconnect(force=True)
            raise
        except Exception:
            # Plain failures clean up gracefully — only the cancel path above
            # needs the synchronous force teardown.
            await client.disconnect()
            raise
        self._client = client
        self._services = {s.name: s for s in services}
        self._entities = entities
        self.connected = True
        _LOGGER.debug("Connected to %s", self._host)

    async def async_disconnect(self) -> None:
        """Disconnect from the device. Idempotent.

        Delegates reference cleanup to ``_on_stop`` (the aioesphomeapi
        disconnect callback). Only clears local state directly when no
        client was ever set up — in that case ``_on_stop`` won't fire,
        so the defensive release covers the partially-constructed path.
        """
        self.unsubscribe_logs()
        if self._client is not None:
            await self._client.disconnect()
            # _on_stop runs from disconnect and clears references.
            return
        # No client to disconnect — clear local state defensively.
        self._release_references()

    def _release_references(self) -> None:
        """Release references to the (now-dead) APIClient without contacting it."""
        self.connected = False
        self._client = None
        self._services.clear()
        self._entities = []
        self._state_subscribers.clear()
        self._states_subscribed = False
        self._log_callbacks.clear()
        self._unsub_logs = None
        # OTA watcher state is per-connection: a dead connection took its
        # log subscription and level bump with it.
        self.ota_watchers = 0
        self.ota_started_log_sub = False
        self.ota_bumped_log_level = False

    async def subscribe_states(self, cb: Any) -> None:
        """Add a state subscriber. Idempotent under concurrent callers.

        Raises ``RuntimeError`` if the connection is closed — silently
        appending to ``_state_subscribers`` on a dead client would leave
        the caller with a subscription that never fires (``_client`` is
        ``None`` so we'd skip the underlying ``client.subscribe_states``).
        """
        async with self._subscribe_lock:
            if self._client is None:
                raise RuntimeError("Cannot subscribe to states: connection is closed")
            self._state_subscribers.append(cb)
            if not self._states_subscribed:
                self._states_subscribed = True
                self._client.subscribe_states(self._dispatch_state)

    def unsubscribe_states(self, cb: Any) -> None:
        """Remove a state subscriber."""
        with contextlib.suppress(ValueError):
            self._state_subscribers.remove(cb)

    def _dispatch_state(self, state: Any) -> None:
        """Fan out state updates to all subscribers — see `_fan_out` for the
        shared isolation / drop-on-failure policy."""
        _fan_out(self._state_subscribers, lambda cb: cb(state), "State subscriber")

    def add_log_callback(self, cb: Any) -> None:
        """Add a log callback. Receives raw log messages from the device."""
        self._log_callbacks.append(cb)

    def remove_log_callback(self, cb: Any) -> None:
        """Remove a log callback."""
        with contextlib.suppress(ValueError):
            self._log_callbacks.remove(cb)

    def subscribe_logs(self, log_level: LogLevel = LogLevel.LOG_LEVEL_DEBUG) -> None:
        """Subscribe to device log messages and re-emit via Python logger."""
        if self._client is None:
            return

        # If already subscribed, unsubscribe first (level may have changed)
        if self._unsub_logs is not None:
            self._unsub_logs()
            self._unsub_logs = None

        def _on_log(msg: Any) -> None:
            py_level = _ESPHOME_TO_PYTHON_LOG.get(msg.level)
            if py_level is None:
                return
            text = msg.message
            if isinstance(text, bytes):
                text = text.decode("utf-8", errors="replace")
            text = text.rstrip()
            if text:
                _DEVICE_LOGGER.log(py_level, "[%s] %s", self._host, text)
            # Same isolation / drop-on-failure policy as _dispatch_state.
            _fan_out(self._log_callbacks, lambda cb: cb(msg), "Log callback")

        self._unsub_logs = self._client.subscribe_logs(_on_log, log_level=log_level)
        _LOGGER.debug("Subscribed to device logs from %s (level=%s)", self._host, log_level)

    def unsubscribe_logs(self) -> None:
        """Stop receiving device log messages AND stop the device sending them.

        Dropping the local callback alone is not enough: per aioesphomeapi
        semantics the DEVICE keeps streaming log frames for the rest of the
        connection's lifetime — wasted radio/CPU on the device and wasted
        frame parsing here. A fresh subscribe at ``LOG_LEVEL_NONE`` tells
        the device to stop; its local callback is released immediately
        (it exists only to carry the level change to the device).
        """
        if self._unsub_logs is None:
            return
        self._unsub_logs()
        self._unsub_logs = None
        if self._client is not None:
            try:
                unsub_none = self._client.subscribe_logs(lambda _msg: None, log_level=LogLevel.LOG_LEVEL_NONE)
                unsub_none()
            except Exception:
                # Connection already dead or dying (async_disconnect calls us
                # right before disconnect) — the stream stops with it anyway.
                _LOGGER.debug(
                    "Could not send LOG_LEVEL_NONE to %s; connection is going away",
                    self._host,
                    exc_info=True,
                )
        _LOGGER.debug("Unsubscribed from device logs from %s", self._host)

    async def async_execute_service(
        self,
        name: str,
        payload: dict[str, Any] | None = None,
        *,
        timeout: float = 30.0,
        return_response: bool = False,
    ) -> Any:
        """Execute a named ESPHome user service over this connection.

        Single entry point for callers — replaces direct ``conn._services``
        and ``conn._client`` reach-throughs. Raises ``HomeAssistantError``
        with a translation key when the service isn't available or the
        connection is dead, so WS handlers can map the failure to a
        user-facing message.

        ``return_response=False`` (default) is fire-and-forget: the message
        is sent and the call returns immediately. We forward ``None`` to
        aioesphomeapi (its own fire-and-forget sentinel) rather than
        ``False``, because ``False`` arms an ``ExecuteServiceResponse``
        listener that ESPHome never fulfils for ``SUPPORTS_RESPONSE_NONE``
        services — the wait would block for the full timeout, and forever
        for actions like ``set_update_manifest`` whose handler reboots the
        device mid-execution.
        """
        if self._client is None:
            _raise_service_unavailable(name)
        svc = self._services.get(name)
        if svc is None:
            _raise_service_unavailable(name)
        if not return_response:
            await self._client.execute_service(svc, payload or {}, return_response=None)
            return None
        return await asyncio.wait_for(
            self._client.execute_service(svc, payload or {}, return_response=True),
            timeout=timeout,
        )

    async def async_fetch_build_flags(self, timeout: float = 10.0) -> dict[str, Any]:
        """Fetch build flags from the device via the get_build_flags action.

        Returns ``{}`` only when the device firmware doesn't expose
        ``get_build_flags`` (older firmware, original EPP firmware) — that
        result is safely cacheable. All transient failures (timeout,
        connection error, malformed JSON, dropped client) propagate so the
        caller can decide whether to retry.
        """
        if self._client is None:
            raise RuntimeError("DeviceConnection is not connected")
        svc = self._services.get("get_build_flags")
        if svc is None:
            return {}
        resp = await asyncio.wait_for(
            self._client.execute_service(svc, {}, return_response=True),
            timeout=timeout,
        )
        if resp is None or not resp.response_data:
            raise ValueError("get_build_flags returned no response_data")
        decoded = json.loads(resp.response_data)
        if not isinstance(decoded, dict):
            raise ValueError(f"get_build_flags returned non-dict: {type(decoded).__name__}")
        return decoded

    async def async_push_distance_override(self, override: dict[str, Any]) -> None:
        """Push distance override to device without persisting.

        Raises ``HomeAssistantError`` when the client is dead (``_on_stop``
        racing the push) — a silent no-op would report success to the
        websocket caller while the override never reached the device.
        """
        if self._client is None:
            _raise_device_not_connected("push distance override")
        svc = self._services.get("epp_set_tracking")
        if svc:
            await self._client.execute_service(
                svc,
                {"max_range": override.get("target_max_distance", 6.0) * 1000},
            )
        svc = self._services.get("epp_set_static_presence")
        if svc:
            await self._client.execute_service(svc, _static_presence_args(override))

    async def async_dismiss_target(self, target_index: int, cell_index: int) -> None:
        """Send dismiss target command to firmware."""
        service = self._services.get("epp_dismiss_target")
        if not service or not self._client:
            _raise_service_unavailable("epp_dismiss_target")
        await self._client.execute_service(service, {"target_index": target_index, "cell_index": cell_index})

    async def async_push_config(self, config: dict[str, Any]) -> None:
        """Push perspective, grid, and zones to the device.

        Raises ``HomeAssistantError`` when the client is dead (``_on_stop``
        racing the push between ``get_session`` and this call) — a silent
        no-op would make ``_do_push_config_to_device`` return True, leaving
        the device unsynced with the ``_failed_pushes`` recovery never armed.
        """
        if self._client is None:
            _raise_device_not_connected("push config")

        # Per-section detail at debug; one info summary at the end. Push
        # happens on every reconnect so 10 lines per device used to flood the
        # HA log on a busy network.
        pushed: list[str] = []

        cal = config.get("calibration", {})
        perspective = cal.get("perspective")
        if perspective:
            service = self._services.get("epp_set_perspective")
            if service:
                await self._client.execute_service(
                    service,
                    {
                        "perspective": ",".join(str(c) for c in perspective),
                        "room_width": cal.get("room_width", 0.0),
                        "room_depth": cal.get("room_depth", 0.0),
                    },
                )
                _LOGGER.debug("Pushed perspective to %s", self._host)
                pushed.append("perspective")

        layout = config.get("room_layout", {})
        grid_bytes = layout.get("grid_bytes")
        if grid_bytes:
            service = self._services.get("epp_set_grid")
            if service:
                grid_b64 = base64.b64encode(bytes(grid_bytes)).decode("ascii")
                # Compute origin from grid dimensions (room centered in grid)
                room_width = cal.get("room_width", 6000.0)
                room_cols = max(1, -(-int(room_width) // GRID_CELL_SIZE_MM))
                start_col = (GRID_COLS - room_cols) // 2
                origin_x = -start_col * GRID_CELL_SIZE_MM
                await self._client.execute_service(
                    service,
                    {
                        "grid_data": grid_b64,
                        "origin_x": float(origin_x),
                        "origin_y": 0.0,
                    },
                )
                _LOGGER.debug("Pushed grid to %s", self._host)
                pushed.append("grid")

        zone_slots = layout.get("zone_slots")
        if zone_slots is not None:
            # Skip the zone push on malformed shape; other config pushes
            # (perspective/grid/settings) still run. Legacy 0.93.x storage
            # would trip this because it had length-7 zone_slots.
            if not is_valid_zone_slots_shape(zone_slots):
                length = len(zone_slots) if isinstance(zone_slots, list) else "N/A"
                slot0_type = type(zone_slots[0]).__name__ if isinstance(zone_slots, list) and zone_slots else "N/A"
                _LOGGER.warning(
                    "Skipping zone push — malformed zone_slots (length %s, slot 0 type %s)",
                    length,
                    slot0_type,
                )
            else:
                service = self._services.get("epp_set_zones")
                if service:
                    # Count named zones (1-7); zone 0 is always present at index 0 and
                    # isn't a "named" zone for logging purposes.
                    named = [s for s in zone_slots[1:] if s is not None]
                    # Expand non-custom slots to include type defaults — storage
                    # / wire stays lean, firmware sees a fully-populated record.
                    expanded_slots = [_expand_zone_slot(s) if s is not None else None for s in zone_slots]
                    zone_data = {"zone_slots": expanded_slots}
                    await self._client.execute_service(
                        service,
                        {
                            "zones_json": json.dumps(zone_data),
                        },
                    )
                    _LOGGER.debug("Pushed %d zones to %s", len(named), self._host)
                    pushed.append(f"zones={len(named)}")

        # Push device settings from unified settings key
        settings = config.get("settings")
        if settings is not None:
            svc = self._services.get("epp_set_env_calibration")
            if svc:
                await self._client.execute_service(
                    svc,
                    {
                        "temperature_offset": settings.get("temperature_offset", 0.0),
                        "humidity_offset": settings.get("humidity_offset", 0.0),
                        "illuminance_offset": settings.get("illuminance_offset", 0.0),
                    },
                )
                _LOGGER.debug("Pushed env_calibration to %s", self._host)
                pushed.append("env_calibration")

            svc = self._services.get("epp_set_motion_timeout")
            if svc:
                await self._client.execute_service(
                    svc,
                    {"timeout": settings.get("motion_timeout", 5.0)},
                )
                _LOGGER.debug("Pushed motion_timeout to %s", self._host)
                pushed.append("motion_timeout")

            svc = self._services.get("epp_set_tracking")
            if svc:
                await self._client.execute_service(
                    svc,
                    {"max_range": settings.get("target_max_distance", 6.0) * 1000},
                )
                _LOGGER.debug("Pushed tracking to %s", self._host)
                pushed.append("tracking")

            svc = self._services.get("epp_set_stuck_target_timeout")
            if svc:
                await self._client.execute_service(
                    svc,
                    {"timeout": settings.get("stuck_target_timeout", 300.0)},
                )
                _LOGGER.debug("Pushed stuck_target_timeout to %s", self._host)
                pushed.append("stuck_target_timeout")

            svc = self._services.get("epp_set_static_presence")
            if svc:
                await self._client.execute_service(svc, _static_presence_args(settings))
                _LOGGER.debug("Pushed static_presence to %s", self._host)
                pushed.append("static_presence")

            svc = self._services.get("epp_set_led")
            if svc:
                color_hex = settings.get("led_presence_color", "#CC33FF")
                await self._client.execute_service(
                    svc,
                    {
                        "mode": settings.get("led_mode", "Manual Control"),
                        "brightness": settings.get("led_brightness", 1.0),
                        "presence_red": int(color_hex[1:3], 16) / 255.0,
                        "presence_green": int(color_hex[3:5], 16) / 255.0,
                        "presence_blue": int(color_hex[5:7], 16) / 255.0,
                    },
                )
                _LOGGER.debug("Pushed led to %s", self._host)
                pushed.append("led")

            svc = self._services.get("epp_set_relay")
            if svc:
                await self._client.execute_service(
                    svc,
                    {
                        "trigger_mode": settings.get("relay_trigger_mode", "disabled"),
                        "contact_mode": settings.get("relay_contact_mode", "no"),
                    },
                )
                _LOGGER.debug("Pushed relay settings to %s", self._host)
                pushed.append("relay")

        # Push log levels
        log_levels = config.get("log_levels")
        if log_levels:
            svc = self._services.get("epp_set_log_level")
            if svc:
                for category, level in log_levels.items():
                    await self._client.execute_service(
                        svc,
                        {"category": category, "level": level},
                    )
                _LOGGER.debug("Pushed log levels to %s", self._host)
                pushed.append("log_levels")

        if pushed:
            _LOGGER.info("Pushed config to %s (%s)", self._host, ", ".join(pushed))
