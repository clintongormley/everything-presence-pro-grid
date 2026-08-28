"""Portable device-registry helpers for tests, spanning HA 2025.2 → 2026.9+.

HA 2026.9 escalated three long-standing ``device_registry`` deprecations to hard
errors in the custom-integration test harness:

* ``async_get_device(identifiers=…/connections=…)`` — identifiers and
  connections are no longer globally unique, so use the entry-scoped lookups or
  ``async_get_devices``.
* ``DeviceRegistry.devices`` used as a *mapping* (``.values()`` / ``[]`` /
  ``.get()``) — iterate the view to get the entries instead.
* ``async_get_or_create(via_device=…)`` — link sub-devices via ``via_device_id``.

eppgrid still supports the HA 2025.2 floor (``hacs.json``), where the new API
does not exist, so tests can't simply switch to it. These helpers feature-detect
the 2026.9 API (``async_get_devices``, which lands with the change) and fall back
to the pre-2026.9 calls on older HA — the same version span the production
``dr_compat`` shim covers.
"""

from __future__ import annotations

from typing import Any

from homeassistant.helpers import device_registry as dr


def get_device_by_identifier(reg: dr.DeviceRegistry, identifier: tuple[str, str]) -> dr.DeviceEntry | None:
    """Return the device carrying ``identifier`` (any config entry), or ``None``."""
    get_all = getattr(reg, "async_get_devices", None)
    if get_all is not None:
        return next(iter(get_all(identifiers={identifier})), None)
    return reg.async_get_device(identifiers={identifier})


def get_device_by_connection(reg: dr.DeviceRegistry, connection: tuple[str, str]) -> dr.DeviceEntry | None:
    """Return the device carrying ``connection`` (any config entry), or ``None``."""
    get_all = getattr(reg, "async_get_devices", None)
    if get_all is not None:
        return next(iter(get_all(connections={connection})), None)
    return reg.async_get_device(connections={connection})


def create_sub_device(reg: dr.DeviceRegistry, parent: dr.DeviceEntry, **kwargs: Any) -> dr.DeviceEntry:
    """Create a sub-device linked to ``parent``, portably across HA versions.

    HA 2026.9 replaced the ``via_device=(identifier)`` kwarg with
    ``via_device_id=<parent device id>``; older HA has only ``via_device``.
    Either way the child ends up with ``via_device_id == parent.id``.
    """
    if hasattr(reg, "async_get_devices"):
        return reg.async_get_or_create(via_device_id=parent.id, **kwargs)
    return reg.async_get_or_create(via_device=next(iter(parent.identifiers)), **kwargs)
