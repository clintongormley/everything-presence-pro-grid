"""Diagnostics support for EPP Grid integration."""

from __future__ import annotations

import re
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_loaded_integration

from .const import DOMAIN
from .const import FIRMWARE_VERSION
from .device_manager import DeviceManager

# Network-layer identifiers that leak device identity in publicly-shared
# diagnostics dumps. We also re-key MAC-keyed dicts (stored_configs,
# entity_states) so the key itself doesn't leak the MAC.
_REDACT_FIELDS = {"mac", "host"}


def _reindex_by_mac(mac_keyed: dict[str, Any], mac_to_index: dict[str, str]) -> dict[str, Any]:
    """Replace MAC keys with stable `device_N` indices.

    Unknown MACs (present in the dict but not in the manager's devices map) get
    a fresh `unknown_N` slot so collisions don't merge separate entries.
    """
    out: dict[str, Any] = {}
    next_unknown = 0
    for mac, value in mac_keyed.items():
        key = mac_to_index.get(mac)
        if key is None:
            key = f"unknown_{next_unknown}"
            next_unknown += 1
        out[key] = value
    return out


def _mac_hex_fragments(mac: str) -> list[str]:
    """Derive the hex fragments of a MAC address that may appear in entity_ids.

    ESPHome's default device name embeds the last 6 hex chars of the MAC (e.g.
    ``ddeeff`` for ``AA:BB:CC:DD:EE:FF``), which then appears slugified in
    entity_ids even after the device is renamed. We collect both the
    colon-stripped lowercase hex pairs — last 3 octets as one run — and the
    full lowercase colon-stripped MAC in case anything uses the whole address.

    Returns lower-case strings only; callers must lower() the target before
    comparing.
    """
    # Strip colons and lower — "AA:BB:CC:DD:EE:FF" → "aabbccddeeff"
    plain = mac.replace(":", "").lower()
    fragments = []
    if len(plain) == 12:
        # Last 6 hex chars (last 3 octets) — the ESPHome default name suffix
        fragments.append(plain[6:])
        # Full 12-char hex — handles anything that embeds the whole MAC
        fragments.append(plain)
    return fragments


def _redact_mac_fragments_in_text(text: str, fragments: list[str]) -> str:
    """Replace occurrences of MAC hex fragments in ``text`` with 'redacted'.

    Case-insensitive; fragments are already lowercase, so we only need to
    lower the text for matching and then reconstruct. We use re.sub with
    IGNORECASE for simplicity and to handle mixed-case edge cases.
    """
    for frag in fragments:
        text = re.sub(re.escape(frag), "redacted", text, flags=re.IGNORECASE)
    return text


def _redact_mac_fragments_in_keys(states: dict[str, str], fragments: list[str]) -> dict[str, str]:
    """Return a copy of ``states`` with MAC hex fragments redacted from keys."""
    return {_redact_mac_fragments_in_text(k, fragments): v for k, v in states.items()}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    from homeassistant.util import slugify

    manager: DeviceManager = hass.data[DOMAIN]

    # Build a stable MAC -> index mapping so MAC-keyed dicts don't leak the
    # MAC string in the dump. Index order tracks `manager.devices` insertion.
    mac_to_index = {mac: f"device_{i}" for i, mac in enumerate(manager.devices)}

    # Collect entity states per device. Entity_ids are re-keyed to avoid leaking
    # the MAC. Two complementary passes are applied:
    #
    # 1. Name-slug replacement: ESPHome's default entity_id embeds the slugified
    #    device name. For a *current-name* match we replace that prefix with the
    #    stable device_N index. This covers the common case where the device name
    #    has not changed since first registration.
    #
    # 2. MAC-fragment replacement: A RENAMED device still has entity_ids slugged
    #    from its OLD default name (e.g. ``everything_presence_pro_ddeeff_…``).
    #    After step 1 the old-name prefix doesn't match the new name slug, so
    #    the MAC hex fragment would survive in the key. We derive the hex
    #    fragments from the known MAC and replace any occurrences.
    ent_reg = er.async_get(hass)
    entity_states: dict[str, dict[str, str]] = {}
    for mac, dev in manager.devices.items():
        if dev.device_id is None:
            entity_states[mac] = {}
            continue
        name_slug = slugify(dev.name)
        mac_fragments = _mac_hex_fragments(mac)
        states: dict[str, str] = {}
        for ent_entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
            state = hass.states.get(ent_entry.entity_id)
            if state is None:
                continue
            domain, _, object_id = ent_entry.entity_id.partition(".")
            # Pass 1: replace current-name slug prefix with device_N index.
            if name_slug and (object_id == name_slug or object_id.startswith(f"{name_slug}_")):
                object_id = f"{mac_to_index[mac]}{object_id[len(name_slug) :]}"
            # Pass 2: redact any remaining MAC hex fragments (handles renamed
            # devices whose entity_ids still embed the old-name MAC suffix).
            object_id = _redact_mac_fragments_in_text(object_id, mac_fragments)
            states[f"{domain}.{object_id}"] = state.state
        entity_states[mac] = states

    # Also redact MAC fragments from the devices[].name field — a device whose
    # stored name was never overridden still carries the default name which
    # embeds the MAC hex digits.
    devices_list = manager.list_devices()
    for dev_entry in devices_list:
        mac = dev_entry.get("mac", "")
        if not isinstance(mac, str):
            continue
        fragments = _mac_hex_fragments(mac)
        if fragments and isinstance(dev_entry.get("name"), str):
            dev_entry["name"] = _redact_mac_fragments_in_text(dev_entry["name"], fragments)

    try:
        integration_version = async_get_loaded_integration(hass, DOMAIN).version or "unknown"
    except Exception:  # defensive: loader may raise during teardown
        integration_version = "unknown"

    payload: dict[str, Any] = {
        "integration_version": integration_version,
        "firmware_version": FIRMWARE_VERSION,
        "devices": devices_list,
        "stored_configs": _reindex_by_mac(dict(manager.store.devices), mac_to_index),
        "configurations": dict(manager.store.configurations),
        "entity_states": _reindex_by_mac(entity_states, mac_to_index),
    }
    return async_redact_data(payload, _REDACT_FIELDS)
