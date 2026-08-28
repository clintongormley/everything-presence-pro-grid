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


def all_devices(registry: DeviceRegistry) -> list[DeviceEntry]:
    """Return every main device entry, portably across HA 2025.2 → 2026.9+.

    HA 2026.9 wrapped ``DeviceRegistry.devices`` in a view whose iteration yields
    the ``DeviceEntry`` values (the supported way to enumerate the registry),
    while using it *as a mapping* — ``.values()``, ``[]``, ``.get()`` — is
    deprecated (and raises in the test harness). On HA 2025.2 ``.devices`` is a
    plain ``id -> entry`` mapping, so iterating it yields *keys*, not entries, and
    the entries are read via ``.values()``.

    Feature-detect the 2026.9 API (``async_get_devices``, which lands together
    with the view) and iterate the view directly on new HA; fall back to
    ``.values()`` on older HA. ``async_get_devices`` itself is *not* usable here
    — with no identifiers/connections it returns an empty list, not all devices.
    """
    if hasattr(registry, "async_get_devices"):
        return list(registry.devices)
    return list(registry.devices.values())
