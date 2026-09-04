"""Device-registry lookup shims that span HA 2025.2 → 2026.8+.

HA 2026.8 made device identifiers and connections unique *per config entry* and
added the entry-scoped lookups ``async_get_device_by_identifier`` /
``async_get_device_by_connection``, deprecating the bare
``async_get_device(identifiers=…/connections=…)`` (which can now match more than
one device). eppgrid still supports HA 2025.2 (``hacs.json``), where the new
methods don't exist, so these helpers feature-detect the entry-scoped API and
fall back to the bare lookup on older HA.

Feature detection is by ``hasattr`` on the registry — the HA-idiomatic
capability check — rather than a version string, so it survives backports.
"""

from __future__ import annotations

from typing import Any

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceEntry
from homeassistant.helpers.device_registry import DeviceRegistry


def device_by_identifier(
    registry: DeviceRegistry,
    identifier: tuple[str, str],
    config_entry_id: str | None,
) -> DeviceEntry | None:
    """Look up a device by a single identifier, scoped to its owning config entry.

    On HA 2026.8+ this uses the unambiguous entry-scoped lookup; on older HA (or
    when ``config_entry_id`` is unknown) it falls back to the bare identifier
    lookup, which was globally unique pre-2026.8.
    """
    if config_entry_id and hasattr(registry, "async_get_device_by_identifier"):
        return registry.async_get_device_by_identifier(identifier, config_entry_id)
    return registry.async_get_device(identifiers={identifier})


def device_by_connection(
    registry: DeviceRegistry,
    connection: tuple[str, str],
    config_entry_id: str | None,
) -> DeviceEntry | None:
    """Look up a device by a single connection, scoped to its owning config entry.

    On HA 2026.8+ this uses the unambiguous entry-scoped lookup; on older HA (or
    when ``config_entry_id`` is unknown — a transient pre-discovery window) it
    falls back to the bare connection lookup. That fallback is safe because
    eppgrid never registers a MAC-connection device of its own and the ESPHome
    device is normally the sole registry entry for that MAC; it would only pick
    the wrong device if some *other* integration claimed the identical MAC, which
    the entry-scoped path (used once the id is known) rules out.
    """
    if config_entry_id and hasattr(registry, "async_get_device_by_connection"):
        return registry.async_get_device_by_connection(connection, config_entry_id)
    return registry.async_get_device(connections={connection})


def config_entry_id_for_domain(hass: Any, device: DeviceEntry, domain: str) -> str | None:
    """Return the id of ``device``'s config entry owned by ``domain`` (or ``None``).

    HA 2026.9 deprecated reading ``DeviceEntry.config_entries`` directly (a runtime
    warning now for custom integrations; removed in HA Core 2027.9) and shipped
    ``dr.async_get_device_and_config_entry_for_domain(hass, device_id, domain=…)``,
    which returns ``(device, config_entry)`` for a domain in one call. eppgrid still
    supports HA 2025.2 (``hacs.json``), where that helper doesn't exist, so we
    feature-detect it and otherwise fall back to iterating ``device.config_entries``
    — non-deprecated on that floor — and resolving each id to its entry's domain.

    Feature detection is by ``getattr`` on the ``device_registry`` module — the
    HA-idiomatic capability check — rather than a version string, so it survives
    backports.
    """
    helper = getattr(dr, "async_get_device_and_config_entry_for_domain", None)
    if helper is not None:
        _device, entry = helper(hass, device.id, domain=domain)
        return entry.entry_id if entry is not None else None
    for entry_id in device.config_entries:
        entry = hass.config_entries.async_get_entry(entry_id)
        if entry is not None and entry.domain == domain:
            return entry_id
    return None


def all_devices(registry: DeviceRegistry) -> list[DeviceEntry]:
    """Return every main device entry, portably across HA 2025.2 → 2026.9+.

    HA 2026.9 wrapped ``DeviceRegistry.devices`` in a view whose iteration yields
    the ``DeviceEntry`` values (the supported way to enumerate the registry),
    while using it *as a mapping* — ``.values()``, ``[]``, ``.get()`` — is
    deprecated (and raises in the test harness). On HA ≤ 2026.8 ``.devices`` is a
    plain ``id -> entry`` mapping, so iterating it yields *keys*, not entries, and
    the entries are read via ``.values()``.

    Detect which shape we have by the *actual value* iteration yields, not by a
    proxy capability: ``async_get_devices`` shipped in 2026.8.x — a full release
    before the entry-yielding view — so keying the branch off it wrongly reads
    id *strings* on 2026.8.x and hands them to callers expecting ``DeviceEntry``.
    A registry key is always a ``str``; a ``DeviceEntry`` never is, so peeking at
    the first yielded item discriminates the two exactly. On the 2026.9 view we
    then iterate (the supported enumeration) and never touch the deprecated
    ``.values()``; on older HA we read ``.values()`` (non-deprecated there).
    """
    first = next(iter(registry.devices), None)
    if first is None:
        return []  # empty registry — same result either shape
    if isinstance(first, str):
        # HA ≤ 2026.8: iteration yielded an id key → read entries via .values().
        return list(registry.devices.values())
    # HA 2026.9+: iteration yields DeviceEntry values directly.
    return list(registry.devices)
