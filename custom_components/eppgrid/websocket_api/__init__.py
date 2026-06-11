"""WebSocket API for EPP Grid frontend."""

from __future__ import annotations

import functools
import inspect
import json
import logging
import math
import re
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_loaded_integration

from ..const import DOMAIN
from ..const import NUM_ZONE_SLOTS
from ..device_manager import _compare_firmware_version

_LOGGER = logging.getLogger(__name__)


def _integration_version(hass: HomeAssistant) -> str:
    """Return the integration version from the loaded integration metadata."""
    try:
        return async_get_loaded_integration(hass, DOMAIN).version or "unknown"
    except Exception:  # defensive: integration loader may raise during teardown
        return "unknown"


_TIMING_FIELDS = ("trigger", "renew", "timeout", "handoff_timeout")

# Reusable schema validators for common string fields. Bound lengths and
# enforce regex shapes at the websocket boundary so unknown / oversized
# inputs never reach storage or firmware pushes.
# Accept any-case hex in the regex but normalize to uppercase so handlers
# can compare against `manager.devices` (whose keys are uppercase via
# `_extract_mac` -> `.upper()`). Without normalization, a lowercase but
# otherwise valid MAC passes schema validation and then fails the
# `_require_known_device` lookup, surfacing as a confusing "device_not_found".
MAC_SCHEMA: vol.All = vol.All(
    str,
    vol.Match(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$"),
    lambda v: v.upper(),
)
NAME_SCHEMA: vol.All = vol.All(str, vol.Length(min=1, max=128))
ENTITY_ID_SCHEMA: vol.All = vol.All(str, vol.Length(min=1, max=255))
CONFIG_ENTRY_ID_SCHEMA: vol.All = vol.All(str, vol.Length(min=1, max=64))
HOST_SCHEMA: vol.All = vol.All(str, vol.Length(min=1, max=253))
COLOR_HEX_SCHEMA: vol.Match = vol.Match(r"^#[0-9A-Fa-f]{6}$")


def _check_finite(value: float) -> float:
    """Raise vol.Invalid unless the (already-coerced) float is finite.

    vol.Coerce(float) happily accepts the strings "NaN" / "Infinity". A NaN
    that reaches storage is re-serialized by orjson as `null`, which then
    breaks config pushes after a restart. Must run BEFORE any vol.Range:
    every comparison against NaN is False, so NaN slips straight through
    Range's < / > checks.
    """
    if not math.isfinite(value):
        raise vol.Invalid("must be a finite number")
    return value


def finite_float(min: float = -1e6, max: float = 1e6) -> vol.All:
    """Schema factory: coerced, finite float within [min, max].

    Single definition of the `Coerce(float) → _check_finite → Range` chain —
    _check_finite must run BEFORE Range (NaN slips through every < / >
    comparison), and the factory keeps call sites from re-assembling the
    chain in the wrong order.
    """
    return vol.All(vol.Coerce(float), _check_finite, vol.Range(min=min, max=max))


# Finite-float schema for numeric fields with no natural tighter range.
# ±1e6 generously bounds everything the frontend sends (mm coordinates,
# metres, seconds, sensor offsets) while rejecting absurd magnitudes.
# Fields with a tighter domain use `finite_float(min=…, max=…)` directly.
FINITE_FLOAT_SCHEMA: vol.All = finite_float()

# Cap a configuration blob's serialized JSON size at 256 KiB. Stored
# configurations include grid bytes (~400 ints), zone slots (8), and
# settings (a few dozen scalars) — well under 32 KiB in practice. The
# 256 KiB ceiling is generous but keeps a malicious client from filling
# .storage/eppgrid with arbitrary blobs.
_MAX_CONFIGURATION_JSON_BYTES = 256 * 1024


def _json_size_bytes(value: Any) -> int:
    """Return the UTF-8 byte size of a value's compact JSON serialization.

    `ensure_ascii=False` + `.encode("utf-8")` measures what HA's storage
    actually writes (orjson emits raw UTF-8, not \\uXXXX escapes). Counting
    characters of ASCII-escaped JSON would over-count multi-byte text ~3x
    and falsely reject legitimate non-ASCII configuration names/labels.
    """
    return len(json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def _bounded_dict(value: Any) -> dict:
    """Validate a dict value's JSON-serialized size is under the configured cap."""
    if not isinstance(value, dict):
        raise vol.Invalid("must be a dict")
    try:
        size = _json_size_bytes(value)
    except (TypeError, ValueError) as err:
        raise vol.Invalid(f"value not JSON-serializable: {err}") from err
    if size > _MAX_CONFIGURATION_JSON_BYTES:
        raise vol.Invalid(f"serialized size {size} bytes exceeds cap {_MAX_CONFIGURATION_JSON_BYTES}")
    return value


CONFIGURATION_DICT_SCHEMA: Any = _bounded_dict

# Cap the furniture list's serialized JSON at 64 KiB. A real room holds a
# couple dozen items at ~200 bytes each (~5 KiB); the cap keeps a malicious
# client from filling .storage/eppgrid via thousands of items while staying
# far above any legitimate layout.
_MAX_FURNITURE_JSON_BYTES = 64 * 1024

# A furniture item as serialized by the frontend (`applyLayout` in
# grid-state-controller.ts / the overlay one-shot save in eppgrid-panel.ts):
# explicit known keys only. `id` is stripped by the frontend before saving
# (parseFurniture regenerates ids on load) but is accepted — bounded — for
# safety. PREVENT_EXTRA plus bounded strings and finite geometry keep
# arbitrary blobs out of storage. Geometry (`x`/`y`/`width`/`height`) is
# required — the frontend always sends it, and a degenerate item without it
# can't be rendered.
_FURNITURE_ITEM_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): vol.All(str, vol.Length(max=64)),
        vol.Optional("type"): vol.In(["icon", "svg"]),
        vol.Optional("icon"): vol.All(str, vol.Length(max=128)),
        vol.Optional("label"): vol.All(str, vol.Length(max=128)),
        vol.Required("x"): FINITE_FLOAT_SCHEMA,
        vol.Required("y"): FINITE_FLOAT_SCHEMA,
        vol.Required("width"): FINITE_FLOAT_SCHEMA,
        vol.Required("height"): FINITE_FLOAT_SCHEMA,
        vol.Optional("rotation"): FINITE_FLOAT_SCHEMA,
        vol.Optional("lockAspect"): bool,
    },
    extra=vol.PREVENT_EXTRA,
)


def _bounded_furniture_size(value: list) -> list:
    """Validate the furniture list's total serialized size is under the cap."""
    size = _json_size_bytes(value)
    if size > _MAX_FURNITURE_JSON_BYTES:
        raise vol.Invalid(f"serialized furniture size {size} bytes exceeds cap {_MAX_FURNITURE_JSON_BYTES}")
    return value


FURNITURE_SCHEMA: vol.All = vol.All([_FURNITURE_ITEM_SCHEMA], _bounded_furniture_size)

# Per-slot length / format caps for `_validate_zone_slots`. Bound here so a
# malicious client can't flood storage with megabyte-long zone names or types.
_ZONE_NAME_MAX = 64
_ZONE_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

# Accepted zone-type vocabulary. Includes the live frontend enum
# (Zone0Config["type"]) plus the two legacy pre-0.95 aliases that
# _expand_zone_slot maps to modern types. Stored configs written before this
# validator ran may still carry the legacy values, so they must pass.
# The firmware ignores `type` entirely — timing values drive behaviour.
_ZONE_TYPE_VOCAB: frozenset[str] = frozenset(
    {
        # Live frontend vocabulary (Zone0Config["type"] union in zone-defaults.ts)
        "default",
        "bed",
        "seating",
        "transit",
        "custom",
        # Legacy pre-0.95 — rest→bed, thoroughfare→transit (see _LEGACY_ZONE_TYPE_MAP)
        "rest",
        "thoroughfare",
    }
)

# Timing-field schema factories — bounds match the frontend slider/input ranges
# in frontend/src/components/epp-zone-sidebar.ts (trigger/renew: range 1-9;
# timeout: number 0-3600; handoff_timeout: number 0-300). Lower bounds are
# inclusive-0 for timeout/handoff so legacy stored values of 0 still pass.
_TRIGGER_RENEW_SCHEMA: vol.All = finite_float(min=1, max=9)
_TIMEOUT_SCHEMA: vol.All = finite_float(min=0, max=3600)
_HANDOFF_TIMEOUT_SCHEMA: vol.All = finite_float(min=0, max=300)

_TIMING_SCHEMAS: dict[str, vol.All] = {
    "trigger": _TRIGGER_RENEW_SCHEMA,
    "renew": _TRIGGER_RENEW_SCHEMA,
    "timeout": _TIMEOUT_SCHEMA,
    "handoff_timeout": _HANDOFF_TIMEOUT_SCHEMA,
}

# Wire-level vocabulary for the firmware's `epp_set_log_level` action — must
# match the string-comparison branches in firmware/common/everything-presence-pro-base.yaml.
_OTA_LOG_CATEGORY = "system"
_OTA_LOG_LEVEL = "Error"


# Known keys per slot type. Slot 0 has no name/color; named slots require them.
# PREVENT_EXTRA is enforced manually below; voluptuous Schema would require
# two separate Schema objects (zone0 vs named) and then re-assemble the list,
# losing position-aware error messages. The manual approach is cleaner here.
_SLOT0_KNOWN_KEYS: frozenset[str] = frozenset({"type"} | set(_TIMING_FIELDS))
_NAMED_SLOT_KNOWN_KEYS: frozenset[str] = frozenset({"name", "color", "type"} | set(_TIMING_FIELDS))


def _validate_slot_timing(slot: dict, index: int) -> None:
    """Validate timing fields on one slot dict, normalising in place.

    Two-stage check: a strict type gate first (str/bool must NOT slip through
    `vol.Coerce(float)` — "5" coerces fine and `bool ⊂ int`), then the bounded
    finite-float schema from _TIMING_SCHEMAS. Coerced values are written back
    so storage holds plain floats.
    """
    for field, schema in _TIMING_SCHEMAS.items():
        if field not in slot:
            continue
        if not isinstance(slot[field], (int, float)) or isinstance(slot[field], bool):
            raise vol.Invalid(f"zone_slots[{index}] '{field}' must be numeric when present")
        try:
            slot[field] = schema(slot[field])
        except vol.Invalid as exc:
            raise vol.Invalid(f"zone_slots[{index}] '{field}': {exc}") from exc


def _validate_zone_slots(value: Any) -> list:
    """Validate the shape of a `zone_slots` list coming from the frontend.

    Enforces at the websocket boundary (fail-closed) so malformed data never
    reaches storage / firmware pushes / entity renaming:

    - Must be a list of exactly NUM_ZONE_SLOTS entries.
    - Slot 0 (zone 0, "rest of room") must be a dict with a `type` from
      _ZONE_TYPE_VOCAB; no unknown keys (PREVENT_EXTRA).
    - Slots 1-7 (named zones) must be `None` OR a dict with required string
      keys `name`, `color`, and `type`; no unknown keys.
    - Optional timing fields (trigger/renew: 1..9; timeout: 0..3600;
      handoff_timeout: 0..300), when present, must be finite numbers within
      the frontend slider/input bounds.
    """
    if not isinstance(value, list) or len(value) != NUM_ZONE_SLOTS:
        raise vol.Invalid(f"zone_slots must be a list of length {NUM_ZONE_SLOTS}")

    # --- Slot 0 ---
    zone0 = value[0]
    if not isinstance(zone0, dict):
        raise vol.Invalid("zone_slots[0] (zone 0) must be a dict")
    unknown0 = set(zone0) - _SLOT0_KNOWN_KEYS
    if unknown0:
        raise vol.Invalid(f"zone_slots[0] has unknown keys: {sorted(unknown0)}")
    if "type" not in zone0 or not isinstance(zone0["type"], str):
        raise vol.Invalid("zone_slots[0] must have string 'type'")
    if zone0["type"] not in _ZONE_TYPE_VOCAB:
        raise vol.Invalid(f"zone_slots[0] 'type' must be one of {sorted(_ZONE_TYPE_VOCAB)!r}, got {zone0['type']!r}")
    _validate_slot_timing(zone0, 0)

    # --- Slots 1-7 (named zones) ---
    for i, slot in enumerate(value[1:], start=1):
        if slot is None:
            continue
        if not isinstance(slot, dict):
            raise vol.Invalid(f"zone_slots[{i}] must be null or a dict")
        unknown_n = set(slot) - _NAMED_SLOT_KNOWN_KEYS
        if unknown_n:
            raise vol.Invalid(f"zone_slots[{i}] has unknown keys: {sorted(unknown_n)}")
        if "name" not in slot or not isinstance(slot["name"], str):
            raise vol.Invalid(f"zone_slots[{i}] must have string 'name'")
        if len(slot["name"]) > _ZONE_NAME_MAX:
            raise vol.Invalid(f"zone_slots[{i}] 'name' must be ≤ {_ZONE_NAME_MAX} chars")
        if "color" not in slot or not isinstance(slot["color"], str):
            raise vol.Invalid(f"zone_slots[{i}] must have string 'color'")
        if not _ZONE_COLOR_RE.match(slot["color"]):
            raise vol.Invalid(f"zone_slots[{i}] 'color' must match {_ZONE_COLOR_RE.pattern}")
        if "type" not in slot or not isinstance(slot["type"], str):
            raise vol.Invalid(f"zone_slots[{i}] must have string 'type'")
        if slot["type"] not in _ZONE_TYPE_VOCAB:
            raise vol.Invalid(
                f"zone_slots[{i}] 'type' must be one of {sorted(_ZONE_TYPE_VOCAB)!r}, got {slot['type']!r}"
            )
        _validate_slot_timing(slot, i)

    return value


def _send_no_session(connection: websocket_api.ActiveConnection, msg_id: int) -> None:
    """Send the standard no-session error.

    ONE code+key pairing (`no_session` / `no_active_session`) for every
    handler that needs a live device session and doesn't have one —
    raw/grid target streams, distance override, dismiss target, and the
    OTA progress watcher.
    """
    connection.send_error(
        msg_id,
        "no_session",
        "No active session — call subscribe_device first",
        translation_domain=DOMAIN,
        translation_key="no_active_session",
    )


def _send_not_loaded(connection: websocket_api.ActiveConnection, msg_id: int) -> None:
    """Send the standard 'Integration not loaded' error via translation key."""
    connection.send_error(
        msg_id,
        "not_ready",
        "Integration not loaded",
        translation_domain=DOMAIN,
        translation_key="integration_not_loaded",
    )


def _send_no_firmware_variant(connection: websocket_api.ActiveConnection, msg_id: int, network: str) -> None:
    """Send 'no firmware variant' error with network type as translation placeholder."""
    connection.send_error(
        msg_id,
        "unknown_variant",
        f"No firmware variant for network type: {network}",
        translation_domain=DOMAIN,
        translation_key="no_firmware_variant",
        translation_placeholders={"network": network},
    )


# Map _check_firmware_version() return codes to (translation_key, English fallback)
# pairs. `firmware_behind` / `firmware_ahead` reuse the same string as the wire
# code; `unavailable` is the offline-device case where no firmware version was
# reported, which we route to the existing `device_not_available` exception.
_FIRMWARE_VERSION_ERRORS: dict[str, tuple[str, str]] = {
    "firmware_behind": ("firmware_behind", "Firmware update required"),
    "firmware_ahead": ("firmware_ahead", "Integration update required"),
    "unavailable": ("device_not_available", "Device not available"),
}


def _send_firmware_version_error(connection: websocket_api.ActiveConnection, msg_id: int, proto_err: str) -> None:
    """Send a firmware version mismatch error with translation metadata.

    `proto_err` is the code returned by `_check_firmware_version`. The wire-level
    error code (`proto_err`) is preserved for frontend dispatch; the
    `translation_key` is mapped via `_FIRMWARE_VERSION_ERRORS` to a key that
    actually exists in strings.json.
    """
    translation_key, fallback = _FIRMWARE_VERSION_ERRORS.get(
        proto_err, ("device_not_available", "Device not available")
    )
    connection.send_error(
        msg_id,
        proto_err,
        fallback,
        translation_domain=DOMAIN,
        translation_key=translation_key,
    )


def _send_exception(connection: websocket_api.ActiveConnection, msg_id: int, code: str, err: BaseException) -> None:
    """Send an error from a caught exception, preserving translation metadata if present.

    HomeAssistantError instances raised by our own helpers carry
    translation_domain / translation_key / translation_placeholders; pass these
    through so the frontend can localize. Other exceptions fall back to str(err).
    """
    domain = getattr(err, "translation_domain", None)
    key = getattr(err, "translation_key", None)
    placeholders = getattr(err, "translation_placeholders", None)
    if domain and key:
        connection.send_error(
            msg_id,
            code,
            str(err),
            translation_domain=domain,
            translation_key=key,
            translation_placeholders=placeholders,
        )
    else:
        connection.send_error(msg_id, code, str(err))


def async_register_websocket_commands(hass: HomeAssistant, manager: Any) -> None:
    """Register WebSocket commands.

    `websocket_api.async_register_command` is idempotent — it stores the
    handler in `hass.data` indexed by command type, so re-registration on
    config-entry reload simply overwrites the prior entry.
    """
    websocket_api.async_register_command(hass, websocket_subscribe_device_list)
    websocket_api.async_register_command(hass, websocket_list_devices)
    websocket_api.async_register_command(hass, websocket_set_show_room_calibration_tutorial)
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_set_setup)
    websocket_api.async_register_command(hass, websocket_set_room_layout)
    websocket_api.async_register_command(hass, websocket_list_configurations)
    websocket_api.async_register_command(hass, websocket_save_configuration)
    websocket_api.async_register_command(hass, websocket_delete_configuration)
    websocket_api.async_register_command(hass, websocket_subscribe_device)
    websocket_api.async_register_command(hass, websocket_subscribe_grid_targets)
    websocket_api.async_register_command(hass, websocket_subscribe_raw_targets)
    websocket_api.async_register_command(hass, websocket_set_entity_enabled)
    websocket_api.async_register_command(hass, websocket_set_settings)
    websocket_api.async_register_command(hass, websocket_set_distance_override)
    websocket_api.async_register_command(hass, websocket_update_firmware)
    websocket_api.async_register_command(hass, websocket_subscribe_ota_progress)
    websocket_api.async_register_command(hass, websocket_dismiss_target)
    websocket_api.async_register_command(hass, websocket_subscribe_flashable_devices)
    websocket_api.async_register_command(hass, websocket_list_flashable_devices)
    websocket_api.async_register_command(hass, websocket_delete_esphome_device)
    websocket_api.async_register_command(hass, websocket_add_esphome_device)


def _get_manager(hass: HomeAssistant) -> Any:
    """Get the device manager."""
    return hass.data.get(DOMAIN)


def _require_known_device(connection: websocket_api.ActiveConnection, manager: Any, msg: dict[str, Any]) -> bool:
    """Return True if `msg["mac"]` is a known device, else send `device_not_found` and return False.

    Used by state-mutating handlers that would otherwise persist storage entries
    keyed on arbitrary unknown MAC addresses.
    """
    if msg["mac"] not in manager.devices:
        connection.send_error(
            msg["id"],
            "device_not_found",
            "Device not found",
            translation_domain=DOMAIN,
            translation_key="device_not_found",
        )
        return False
    return True


def _check_firmware_version(manager: Any, mac: str) -> str | None:
    """Check firmware version compatibility. Returns error code or None if OK."""
    dev = manager.devices.get(mac)
    if dev is None:
        return None  # Unknown device — let the command handle it
    fw_ver = manager.read_firmware_version(dev.device_id)
    if fw_ver is None:
        return "unavailable"
    status = _compare_firmware_version(fw_ver)
    if status == "compatible":
        return None
    if status is None:
        # Unparseable version. `_push_config_to_device`'s gate also rejects
        # this case — without this branch, `_check_firmware_version` would
        # return None (looks compatible), the handler would persist storage
        # and respond OK, while the underlying push silently skipped, leaving
        # HA state diverged from the device.
        return "unavailable"
    return status


def _require_manager(func=None, *, check_firmware: bool = False):
    """Inject the device manager as a 4th positional arg.

    Short-circuits with `not_ready` when the integration is unloaded. With
    `check_firmware=True`, also runs `_check_firmware_version(manager, msg["mac"])`
    and short-circuits with the matching firmware-version error before the handler
    is invoked. Works for both sync (`@callback`) and async (`@async_response`)
    handlers — picks the wrapper shape via `iscoroutinefunction`.
    """

    def decorate(fn):
        if inspect.iscoroutinefunction(fn):

            @functools.wraps(fn)
            async def async_wrapper(
                hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
            ) -> None:
                manager = _get_manager(hass)
                if manager is None:
                    _send_not_loaded(connection, msg["id"])
                    return
                if check_firmware:
                    proto_err = _check_firmware_version(manager, msg["mac"])
                    if proto_err:
                        _send_firmware_version_error(connection, msg["id"], proto_err)
                        return
                await fn(hass, connection, msg, manager)

            return async_wrapper

        @functools.wraps(fn)
        def sync_wrapper(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
            manager = _get_manager(hass)
            if manager is None:
                _send_not_loaded(connection, msg["id"])
                return
            if check_firmware:
                proto_err = _check_firmware_version(manager, msg["mac"])
                if proto_err:
                    _send_firmware_version_error(connection, msg["id"], proto_err)
                    return
            fn(hass, connection, msg, manager)

        return sync_wrapper

    if func is None:
        return decorate
    return decorate(func)


# Submodule re-exports — must come after the helpers above (_get_manager,
# _send_*, _integration_version) so submodules can import them at load time.
# These re-exports keep `from .websocket_api import websocket_X` working for
# tests and let async_register_websocket_commands reference them by bare name.
from ._devices import _apply_entity_states  # noqa: E402, F401
from ._devices import _build_entity_key_map  # noqa: E402, F401
from ._devices import _entity_key_for_object_id  # noqa: E402, F401
from ._devices import _get_entity_states  # noqa: E402, F401
from ._devices import _object_id_from_unique_id  # noqa: E402, F401
from ._devices import websocket_delete_configuration  # noqa: E402
from ._devices import websocket_get_config  # noqa: E402
from ._devices import websocket_list_configurations  # noqa: E402
from ._devices import websocket_list_devices  # noqa: E402
from ._devices import websocket_save_configuration  # noqa: E402
from ._devices import websocket_set_distance_override  # noqa: E402
from ._devices import websocket_set_entity_enabled  # noqa: E402
from ._devices import websocket_set_room_layout  # noqa: E402
from ._devices import websocket_set_settings  # noqa: E402
from ._devices import websocket_set_setup  # noqa: E402
from ._devices import websocket_set_show_room_calibration_tutorial  # noqa: E402
from ._devices import websocket_subscribe_device  # noqa: E402
from ._devices import websocket_subscribe_device_list  # noqa: E402
from ._devices import websocket_subscribe_grid_targets  # noqa: E402
from ._devices import websocket_subscribe_raw_targets  # noqa: E402
from ._firmware import websocket_dismiss_target  # noqa: E402
from ._firmware import websocket_subscribe_ota_progress  # noqa: E402
from ._firmware import websocket_update_firmware  # noqa: E402
from ._flasher import _map_esphome_flow_result  # noqa: E402, F401
from ._flasher import websocket_add_esphome_device  # noqa: E402
from ._flasher import websocket_delete_esphome_device  # noqa: E402
from ._flasher import websocket_list_flashable_devices  # noqa: E402
from ._flasher import websocket_subscribe_flashable_devices  # noqa: E402
