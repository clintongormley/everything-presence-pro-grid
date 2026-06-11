"""Diagnostics support for EPP Grid integration."""

from __future__ import annotations

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


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    manager: DeviceManager = hass.data[DOMAIN]

    # Collect entity states per device
    ent_reg = er.async_get(hass)
    entity_states: dict[str, dict[str, str]] = {}
    for mac, dev in manager.devices.items():
        if dev.device_id is None:
            entity_states[mac] = {}
            continue
        states: dict[str, str] = {}
        for ent_entry in er.async_entries_for_device(ent_reg, dev.device_id, include_disabled_entities=True):
            state = hass.states.get(ent_entry.entity_id)
            if state is not None:
                states[ent_entry.entity_id] = state.state
        entity_states[mac] = states

    try:
        integration_version = async_get_loaded_integration(hass, DOMAIN).version or "unknown"
    except Exception:  # defensive: loader may raise during teardown
        integration_version = "unknown"

    # Build a stable MAC -> index mapping so MAC-keyed dicts don't leak the
    # MAC string in the dump. Index order tracks `manager.devices` insertion.
    mac_to_index = {mac: f"device_{i}" for i, mac in enumerate(manager.devices)}

    payload: dict[str, Any] = {
        "integration_version": integration_version,
        "firmware_version": FIRMWARE_VERSION,
        "devices": manager.list_devices(),
        "stored_configs": _reindex_by_mac(dict(manager.store.devices), mac_to_index),
        "configurations": dict(manager.store.configurations),
        "entity_states": _reindex_by_mac(entity_states, mac_to_index),
    }
    return async_redact_data(payload, _REDACT_FIELDS)
