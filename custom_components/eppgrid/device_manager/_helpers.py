"""Pure helper functions for device_manager — no shared state."""

from __future__ import annotations

import logging
from typing import Any
from typing import NoReturn

from aioesphomeapi import LogLevel
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from ..const import DOMAIN
from ..const import EPP_MANUFACTURER
from ..const import EPP_MODELS
from ..const import NUM_ZONE_SLOTS
from ..const import STATIC_ON_DELAY_MAX
from ..zone_name_translations import ZONE_NAMES

# Every locale's "Zone"/"Zona"/... prefix (the text before the `{name}`
# placeholder in each `zone_with_name` template). Built once at import time so
# _resolve_zone_name doesn't rebuild it on every call. Used to strip a stale
# prefix saved under one locale before re-prefixing under another.
_ZONE_NAME_PREFIXES: frozenset[str] = frozenset(
    loc_table.get("zone_with_name", ZONE_NAMES["en"]["zone_with_name"]).split("{name}")[0].rstrip()
    for loc_table in ZONE_NAMES.values()
)

# Mirror of frontend ZONE_TYPE_DEFAULTS — test_zone_type_defaults_match_frontend
# asserts the two agree. Non-custom zones store only `type`; the backend
# expands via _expand_zone_slot on push so firmware always receives full timing.
ZONE_TYPE_DEFAULTS: dict[str, dict[str, float]] = {
    "default": {"trigger": 5, "renew": 3, "timeout": 10.0, "handoff_timeout": 3.0},
    "bed": {"trigger": 8, "renew": 2, "timeout": 600.0, "handoff_timeout": 10.0},
    "seating": {"trigger": 7, "renew": 1, "timeout": 30.0, "handoff_timeout": 10.0},
    "transit": {"trigger": 3, "renew": 2, "timeout": 3.0, "handoff_timeout": 1.0},
}

# Pre-0.95 layouts stored `rest` / `thoroughfare` zone types. Map them to
# the timing of their closest modern equivalents — rest→bed (600 s timeout:
# someone sleeping must not time out) and thoroughfare→transit (3 s) — NOT
# the generic `default` row (10 s), which would break bedrooms saved on old
# layouts. The frontend's display-side mapping (LEGACY_ZONE_TYPE_MAP in
# frontend/src/lib/config-serialization.ts) mirrors this table and must stay
# in sync.
_LEGACY_ZONE_TYPE_MAP: dict[str, str] = {
    "rest": "bed",
    "thoroughfare": "transit",
}


# Map aioesphomeapi LogLevel values to Python logging levels
_ESPHOME_TO_PYTHON_LOG = {
    LogLevel.LOG_LEVEL_ERROR: logging.ERROR,
    LogLevel.LOG_LEVEL_WARN: logging.WARNING,
    LogLevel.LOG_LEVEL_INFO: logging.INFO,
    LogLevel.LOG_LEVEL_CONFIG: logging.INFO,
    LogLevel.LOG_LEVEL_DEBUG: logging.DEBUG,
    LogLevel.LOG_LEVEL_VERBOSE: logging.DEBUG,
    LogLevel.LOG_LEVEL_VERY_VERBOSE: logging.DEBUG,
}


def is_valid_zone_slots_shape(value: Any) -> bool:
    """Length-8 list with a dict at index 0 (zone 0) — matches the websocket
    validator. Inner shape guards (push, entity update) share this one rule
    so they can't drift.
    """
    return isinstance(value, list) and len(value) == NUM_ZONE_SLOTS and isinstance(value[0], dict)


def _expand_zone_slot(slot: dict[str, Any]) -> dict[str, Any]:
    """Expand to full timing for firmware push. Returns a copy.

    Custom: user-supplied timing is authoritative.
    Non-custom: ZONE_TYPE_DEFAULTS always wins (stored timing is overwritten,
    not defaulted — keeps the defaults-table the single source of truth).
    Legacy pre-0.95 types resolve via _LEGACY_ZONE_TYPE_MAP; the stored
    `type` value itself is left untouched (firmware ignores it — see
    epp_zone_config_parser.h).
    """
    if slot.get("type") == "custom":
        return dict(slot)
    # `type` is guaranteed to be a string by _validate_zone_slots at the ws boundary;
    # the dict[str, Any] type erases that, hence the ignore.
    zone_type: str = slot.get("type")  # type: ignore[assignment]
    zone_type = _LEGACY_ZONE_TYPE_MAP.get(zone_type, zone_type)
    defaults = ZONE_TYPE_DEFAULTS.get(zone_type, ZONE_TYPE_DEFAULTS["default"])
    expanded = dict(slot)
    expanded["trigger"] = defaults["trigger"]
    expanded["renew"] = defaults["renew"]
    expanded["timeout"] = defaults["timeout"]
    expanded["handoff_timeout"] = defaults["handoff_timeout"]
    return expanded


def _static_presence_args(source: dict[str, Any]) -> dict[str, Any]:
    """Build the epp_set_static_presence service payload from a settings or
    distance-override dict.

    Shared by both push paths so the field set and the threshold inversion
    stay in lockstep. Both the UI threshold and the chip's setSensitivity run
    1-9; threshold is "higher = harder to trigger" and sensitivity is "higher
    = more sensitive", so they invert as ``10 - threshold`` (1->9 .. 9->1).
    Thresholds are clamped to 1-9 to guard against legacy values stored when
    the slider still allowed 0, which would otherwise emit an out-of-range 10.
    The on-delay is likewise clamped to the DFRobot C4001 range [0, 2]s to
    guard against legacy values stored when the slider allowed up to 30s; the
    sensor silently rejects anything above its limit otherwise.
    """

    def _sensitivity(key: str) -> int:
        return 10 - max(1, min(9, source.get(key, 3)))

    return {
        "min_range": source.get("static_min_distance", 0.3),
        "max_range": source.get("static_max_distance", 16.0),
        "trigger_range": source.get("static_max_distance", 16.0),
        "trigger_sensitivity": _sensitivity("static_trigger_threshold"),
        "sustain_sensitivity": _sensitivity("static_renew_threshold"),
        # NB: static_timeout is intentionally NOT here. It is a live zone-engine
        # value pushed via the dedicated epp_set_static_timeout service; bundling
        # it into this DFRobot-reconfigure payload would reset the sensor (~8s)
        # on every timeout change. See `async_push_config`.
        "on_delay": min(max(source.get("static_on_delay", 0.0), 0.0), STATIC_ON_DELAY_MAX),
        "led_enabled": True,
    }


def _resolve_zone_name(
    language: str,
    *,
    index: int,
    zone_name: str | None,
    target_count: bool,
) -> str:
    """Build a translated zone entity name.

    Zone 0 = Rest of Room; zone >0 uses the user-provided name as a placeholder.
    `target_count=True` selects the '... Target Count' variant.
    Falls back to English when the requested language is absent.
    """
    base_lang = language.split("-")[0]
    table = ZONE_NAMES.get(language) or ZONE_NAMES.get(base_lang) or ZONE_NAMES["en"]
    en = ZONE_NAMES["en"]
    if index == 0:
        key = "zone_rest_of_room_target_count" if target_count else "zone_rest_of_room"
        return table.get(key, en[key])
    # If the name already starts with any locale's "Zone"/"Zona"/... prefix,
    # strip it so we don't double-prefix (e.g. user saved "Zona Cocina" under
    # an es session and is now viewing under en — still want "Zone Cocina",
    # not "Zone Zona Cocina").
    if zone_name:
        for prefix in _ZONE_NAME_PREFIXES:
            if prefix and zone_name.startswith(prefix + " "):
                zone_name = zone_name.removeprefix(prefix + " ")
                break

    key = "zone_with_name_target_count" if target_count else "zone_with_name"
    template = table.get(key, en[key])
    return template.replace("{name}", zone_name or "")


def _raise_service_unavailable(service: str) -> NoReturn:
    """Raise translation-keyed HomeAssistantError for a missing service."""
    raise HomeAssistantError(
        f"Service {service} not available",
        translation_domain=DOMAIN,
        translation_key="service_not_available",
        translation_placeholders={"service": service},
    )


def _raise_device_not_connected(operation: str) -> NoReturn:
    """Raise translation-keyed HomeAssistantError for a dead connection.

    Used by push paths that previously no-opped when ``_client`` was None
    (``_on_stop`` racing the push): silently returning made callers report
    success while nothing reached the device, so their failure/retry paths
    never armed.
    """
    raise HomeAssistantError(
        f"Cannot {operation}: device connection is closed",
        translation_domain=DOMAIN,
        translation_key="device_not_connected",
    )


_TARGET_ENTITY_KEYS = ("target_xy", "target_active", "target_signal", "target_zone", "target_count")
_ZONE_ENTITY_KEYS = ("zone_presence", "zone_target_count")


def _compute_pipeline(
    config: dict[str, Any],
    raw_target_subs: int,
    grid_target_subs: int,
    heatmap_subs: int = 0,
) -> dict[str, int]:
    """Derive all pipeline intervals from current settings and subscriber counts."""
    settings = config.get("settings", {})

    target_rate = settings.get("target_update_rate_ms", 1000)
    zone_rate = settings.get("zone_update_rate_ms", 1000)

    any_target = any(settings.get(k) for k in _TARGET_ENTITY_KEYS)
    any_zone = any(settings.get(k) for k in _ZONE_ENTITY_KEYS)

    has_display_sub = raw_target_subs > 0 or grid_target_subs > 0

    return {
        "entity_target_interval": target_rate if any_target else 0,
        "entity_zone_interval": zone_rate if any_zone else 0,
        "display_interval": 200 if has_display_sub else 0,
        "zone_state_interval": 1000 if grid_target_subs > 0 else 0,
        # Pull transport (issue #365): the heatmap is fetched on demand via the
        # epp_get_heatmap action, never published by the firmware timer. The field
        # stays in the pipeline (old firmware still declares the epp_set_pipeline
        # arg and requires a value) but is always 0.
        "heatmap_interval": 0,
    }


def _compare_firmware_version(device_version: str) -> str | None:
    """Compare device firmware version against the integration's pinned version.

    Returns one of: 'compatible', 'firmware_behind', 'firmware_ahead', or
    ``None`` for unparseable inputs. Callers normalize ``None`` to
    'unavailable' so the frontend's firmware-status union
    (compatible/firmware_behind/firmware_ahead/unavailable/unknown) only
    ever sees values it knows how to render.
    """
    from packaging.version import Version

    from ..const import FIRMWARE_VERSION

    try:
        dev_ver = Version(device_version)
        req_ver = Version(FIRMWARE_VERSION)
    except Exception:
        return None
    if dev_ver == req_ver:
        return "compatible"
    if dev_ver < req_ver:
        return "firmware_behind"
    return "firmware_ahead"


HEATMAP_MIN_FIRMWARE = "1.3.0"


def supports_heatmap(version: str | None) -> bool:
    """True when firmware includes the Heatmap entity + pipeline field.

    Compares against a fixed floor (``HEATMAP_MIN_FIRMWARE``), independent of
    the integration's pinned ``FIRMWARE_VERSION`` — after a future bump to,
    say, 1.4.0, a genuinely-heatmap-capable 1.3.0 device must still read as
    supported rather than being judged against the (unrelated) exact-pin
    compatibility check `_compare_firmware_version` performs.
    """
    if not version:
        return False
    try:
        from packaging.version import Version

        return Version(version) >= Version(HEATMAP_MIN_FIRMWARE)
    except Exception:
        return False


def strip_unsupported_pipeline_fields(pipeline: dict[str, int], fw_ver: str | None) -> None:
    """Drop pipeline fields the device's firmware can't accept (in place, BWC).

    Pre-1.3.0 ``epp_set_pipeline`` has no ``heatmap_interval`` variable, so
    pushing it would feed that firmware's service an unknown argument. Centralised
    here so both push paths (`_push_pipeline_to_device` and the temp-connection
    push) stay in sync as the pipeline schema evolves.
    """
    if not supports_heatmap(fw_ver):
        pipeline.pop("heatmap_interval", None)


def _sync_firmware_repair_issue(
    hass: HomeAssistant,
    *,
    mac: str,
    device_name: str,
    fw_ver: str | None,
) -> None:
    """Create or clear Repairs issues based on the device's firmware version.

    The integration's pinned FIRMWARE_VERSION is the source of truth for
    which firmware a given release expects. This raises a Repairs issue
    when the device is on a different version so the user notices without
    having to open the EPP Grid panel.

    Offline devices (fw_ver is None) leave existing issues alone — clearing
    them on disconnect would mask a real problem the moment the device
    reappears.
    """
    from homeassistant.helpers import issue_registry as ir

    from ..const import FIRMWARE_VERSION

    behind_id = f"firmware_behind_{mac}"
    ahead_id = f"firmware_ahead_{mac}"

    if fw_ver is None:
        return

    status = _compare_firmware_version(fw_ver)
    if status is None:
        # Unparseable version → leave any prior issue alone (clearing would
        # mask a real "behind" state if the parse failure is transient);
        # never raise a new issue we can't act on.
        return
    placeholders = {
        "device_name": device_name,
        "current_version": fw_ver,
        "required_version": FIRMWARE_VERSION,
    }

    if status == "firmware_behind":
        ir.async_delete_issue(hass, DOMAIN, ahead_id)
        ir.async_create_issue(
            hass,
            DOMAIN,
            behind_id,
            # Fixable: the user can trigger an OTA update directly from the
            # Repairs UI via FirmwareUpdateRepairFlow in repairs.py, which
            # calls the same set_update_manifest action the panel uses.
            # Single-click resolution from Settings -> Repairs.
            is_fixable=True,
            severity=ir.IssueSeverity.WARNING,
            translation_key="firmware_behind",
            translation_placeholders=placeholders,
        )
    elif status == "firmware_ahead":
        ir.async_delete_issue(hass, DOMAIN, behind_id)
        ir.async_create_issue(
            hass,
            DOMAIN,
            ahead_id,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="firmware_ahead",
            translation_placeholders=placeholders,
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, behind_id)
        ir.async_delete_issue(hass, DOMAIN, ahead_id)


def _is_epp_device(device: dr.DeviceEntry) -> bool:
    """Return True when a HA device carries the EPP manufacturer/model signature.

    Shared by discovery, the entity-create pre-filter, and the delete-guard so
    the check cannot drift between call sites.
    """
    return device.manufacturer == EPP_MANUFACTURER and device.model in EPP_MODELS


def _extract_mac(device: dr.DeviceEntry) -> str | None:
    """Extract MAC address from device connections, normalised to AA:BB:... form.

    Routes through `dr.format_mac` so unformatted inputs (no colons,
    dash-separated, mixed case) all collapse to the same canonical form,
    then uppercased to match storage / WS conventions.
    """
    for conn_type, conn_id in device.connections:
        if conn_type == "mac":
            return dr.format_mac(conn_id).upper()
    return None


try:
    # aioesphomeapi ships the canonical object_id derivation (snake_case +
    # sanitize) — the same transform ESPHome uses to mint object_ids. Reuse it
    # so this never drifts from upstream.
    from aioesphomeapi.object_id import compute_object_id as _esphome_compute_object_id
except ImportError:  # older aioesphomeapi predates object_id.py — keep a local copy

    def _esphome_compute_object_id(name: str) -> str:
        """Reproduce ESPHome's object_id derivation: snake_case then sanitize."""
        snake = "".join("_" if c == " " else c.lower() if "A" <= c <= "Z" else c for c in name)
        return "".join(c if ("a" <= c <= "z" or "0" <= c <= "9" or c in "_-") else "_" for c in snake)


def _esphome_object_id(unique_id: str) -> str:
    """Normalise an ESPHome entity-registry ``unique_id`` to its object_id.

    Home Assistant's ESPHome integration has shipped three unique_id formats:

      * v1 (legacy): ``{mac}-{entity_type}-{object_id}`` — dash-joined, the
        object_id already ``snake_case`` + ``sanitize``d.
      * v2: ``{mac}-{entity_type}-{name}`` — dash-joined, unmangled name.
      * v3 (HA 2026.8+, aioesphomeapi ``build_device_unique_id`` default):
        ``{mac}/{device_id}/{entity_type}/{name}`` — slash-joined, unmangled
        name, sub-device id as a path segment.

    For a sub-device entity the v1/v2 forms additionally carry an ``@{device_id}``
    suffix (``build_device_unique_id`` appends it; v3 already encodes device_id
    in the path). EPP firmware is a single device (device_id 0) so this never
    fires in practice, but stripping it keeps the normalisation honest.

    Dropping the ``@{device_id}`` suffix, taking the final segment (after ``/``
    for v3, else after ``-``) and re-applying :func:`_esphome_compute_object_id`
    collapses all three formats to the same object_id (``firmware_version``,
    ``zone_0_presence``, …). The transform is idempotent on an already-mangled
    v1 object_id, so callers can match on the result regardless of which HA
    version registered the entity. Match by EQUALITY (not ``endswith``):
    equality also stops ``max_current_connections`` shadowing
    ``current_connections``.
    """
    head, sep, device_id = unique_id.rpartition("@")
    if sep and device_id.isdigit():  # HA's "@{device_id}" sub-device suffix (v1/v2)
        unique_id = head
    tail = unique_id.rsplit("/", 1)[-1] if "/" in unique_id else unique_id.rsplit("-", 1)[-1]
    return _esphome_compute_object_id(tail)


def _is_esphome_entity(entry: er.RegistryEntry, domain: str, object_id: str) -> bool:
    """True if ``entry`` is the ESPHome entity for ``object_id`` in ``domain``.

    Centralises the platform/domain/object_id selection rule so every call site
    matches ESPHome entities the same way — by equality on the format-normalised
    object_id (see `_esphome_object_id`), never a raw unique_id substring.
    """
    return entry.platform == "esphome" and entry.domain == domain and _esphome_object_id(entry.unique_id) == object_id


def _extract_host(device: dr.DeviceEntry, config_entry_id: str | None, hass: HomeAssistant) -> str | None:
    """Try to extract the host/IP from the ESPHome config entry."""
    if config_entry_id is None:
        return None
    entry = hass.config_entries.async_get_entry(config_entry_id)
    if entry is None:
        return None
    return entry.data.get("host")


def _extract_noise_psk(config_entry_id: str | None, hass: HomeAssistant) -> str:
    """Read ``noise_psk`` from an ESPHome config entry, or return ``""``.

    Encrypted ESPHome devices store the PSK on the integration's config
    entry (sibling of ``host``); the EPP integration mirrors the value
    onto its own ``DeviceConnection`` so the wrapped ``APIClient`` can
    authenticate. Missing entry / missing key both return ``""``, matching
    the unencrypted-device default.
    """
    if config_entry_id is None:
        return ""
    entry = hass.config_entries.async_get_entry(config_entry_id)
    if entry is None:
        return ""
    return entry.data.get("noise_psk", "") or ""
