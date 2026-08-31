"""Unit tests for the device-registry compat shim (`dr_compat`).

The entry-scoped registry lookups ``async_get_device_by_identifier`` /
``async_get_device_by_connection`` only exist in HA 2026.8+. eppgrid still
supports HA 2025.2 (see ``hacs.json``), so the helpers must feature-detect the
new API and fall back to the pre-2026.8 ``async_get_device(identifiers=…/
connections=…)`` lookup, which was globally unique before per-config-entry
uniqueness landed.

These tests pin the version dispatch directly with fake registries — one that
exposes the new methods (HA 2026.8+) and one that does not (HA 2025.2) — because
the installed HA under test lacks the new API, so a real-registry test could only
exercise the fallback branch.
"""

from __future__ import annotations

from custom_components.eppgrid.dr_compat import all_devices
from custom_components.eppgrid.dr_compat import device_by_connection
from custom_components.eppgrid.dr_compat import device_by_identifier

_IDENTIFIER = ("eppgrid", "device_group:abc")
_CONNECTION = ("mac", "11:22:33:44:55:66")
_ENTRY_ID = "entry123"


class _NewRegistry:
    """HA 2026.8+ registry: exposes the entry-scoped lookups."""

    def __init__(self, result: object) -> None:
        self.result = result
        self.by_identifier_calls: list[tuple] = []
        self.by_connection_calls: list[tuple] = []
        self.bare_calls: list[tuple] = []

    def async_get_device_by_identifier(self, identifier, config_entry_id):
        self.by_identifier_calls.append((identifier, config_entry_id))
        return self.result

    def async_get_device_by_connection(self, connection, config_entry_id):
        self.by_connection_calls.append((connection, config_entry_id))
        return self.result

    def async_get_device(self, identifiers=None, connections=None):
        self.bare_calls.append((identifiers, connections))
        return self.result


class _OldRegistry:
    """HA 2025.2 registry: only the pre-2026.8 bare lookup exists."""

    def __init__(self, result: object) -> None:
        self.result = result
        self.bare_calls: list[tuple] = []

    def async_get_device(self, identifiers=None, connections=None):
        self.bare_calls.append((identifiers, connections))
        return self.result


class TestDeviceByIdentifier:
    def test_new_ha_uses_entry_scoped_lookup(self) -> None:
        sentinel = object()
        reg = _NewRegistry(sentinel)

        result = device_by_identifier(reg, _IDENTIFIER, _ENTRY_ID)

        assert result is sentinel
        assert reg.by_identifier_calls == [(_IDENTIFIER, _ENTRY_ID)]
        assert reg.bare_calls == []

    def test_old_ha_falls_back_to_bare_lookup(self) -> None:
        sentinel = object()
        reg = _OldRegistry(sentinel)

        result = device_by_identifier(reg, _IDENTIFIER, _ENTRY_ID)

        assert result is sentinel
        assert reg.bare_calls == [({_IDENTIFIER}, None)]

    def test_missing_entry_id_falls_back_to_bare_lookup(self) -> None:
        """Without a config entry to scope by, the entry-scoped API can't be used."""
        reg = _NewRegistry(object())

        device_by_identifier(reg, _IDENTIFIER, None)

        assert reg.by_identifier_calls == []
        assert reg.bare_calls == [({_IDENTIFIER}, None)]


class TestDeviceByConnection:
    def test_new_ha_uses_entry_scoped_lookup(self) -> None:
        sentinel = object()
        reg = _NewRegistry(sentinel)

        result = device_by_connection(reg, _CONNECTION, _ENTRY_ID)

        assert result is sentinel
        assert reg.by_connection_calls == [(_CONNECTION, _ENTRY_ID)]
        assert reg.bare_calls == []

    def test_missing_entry_id_falls_back_to_bare_lookup(self) -> None:
        """Case 3: an ESPHome device not yet discovered has no known entry id;
        the bare connection lookup stays correct because eppgrid never registers
        a MAC-connection device, so the match is unambiguous."""
        sentinel = object()
        reg = _NewRegistry(sentinel)

        result = device_by_connection(reg, _CONNECTION, None)

        assert result is sentinel
        assert reg.by_connection_calls == []
        assert reg.bare_calls == [(None, {_CONNECTION})]

    def test_old_ha_falls_back_to_bare_lookup(self) -> None:
        sentinel = object()
        reg = _OldRegistry(sentinel)

        result = device_by_connection(reg, _CONNECTION, _ENTRY_ID)

        assert result is sentinel
        assert reg.bare_calls == [(None, {_CONNECTION})]


class _EntriesView:
    """HA 2026.9+ ``DeviceRegistry.devices``: iterating yields ``DeviceEntry``
    values (the supported enumeration); mapping access such as ``.values()`` is
    deprecated and now raises in the test harness."""

    def __init__(self, entries: list[object]) -> None:
        self._entries = entries

    def __iter__(self):
        return iter(self._entries)

    def values(self):  # pragma: no cover - must never be called on new HA
        raise AssertionError("`.values()` is deprecated on the 2026.9 devices view; iterate instead")


class _ViewRegistry:
    """HA 2026.9+ registry: ``.devices`` is the entry-yielding view and the
    non-deprecated ``async_get_devices`` bulk lookup is present."""

    def __init__(self, entries: list[object]) -> None:
        self.devices = _EntriesView(entries)

    def async_get_devices(self, *, identifiers=None, connections=None, config_entry_id=None):
        return list(self.devices)


class _DictRegistry:
    """Floor HA (≤2025.2): ``.devices`` is a plain id->entry mapping and there is
    no ``async_get_devices``; entries are read via ``.values()``."""

    def __init__(self, mapping: dict[str, object]) -> None:
        self.devices = dict(mapping)


class _MiddleRegistry:
    """HA 2026.8.x: ``async_get_devices`` already exists, but ``.devices`` is
    still a plain id->entry mapping whose iteration yields *keys*, not entries —
    the entry-yielding view only lands in 2026.9. A shim that treats
    ``async_get_devices`` as a proxy for "iteration yields entries" reads device
    id *strings* here and hands them to callers expecting ``DeviceEntry`` objects."""

    def __init__(self, mapping: dict[str, object]) -> None:
        self.devices = dict(mapping)

    def async_get_devices(self, *, identifiers=None, connections=None, config_entry_id=None):
        return []


class TestAllDevices:
    def test_new_ha_iterates_view_entries(self) -> None:
        e1, e2 = object(), object()
        reg = _ViewRegistry([e1, e2])

        assert all_devices(reg) == [e1, e2]

    def test_old_ha_reads_mapping_values(self) -> None:
        e1, e2 = object(), object()
        reg = _DictRegistry({"id1": e1, "id2": e2})

        assert all_devices(reg) == [e1, e2]

    def test_ha_2026_8_has_async_get_devices_but_key_yielding_mapping(self) -> None:
        """HA 2026.8.x has ``async_get_devices`` yet still iterates keys — the
        helper must return entries (via ``.values()``), never the id strings."""
        e1, e2 = object(), object()
        reg = _MiddleRegistry({"id1": e1, "id2": e2})

        assert all_devices(reg) == [e1, e2]

    def test_returns_a_fresh_list_not_a_live_view(self) -> None:
        """Callers may mutate the registry while iterating the result, so the
        helper must return an independent list, not a live view/values object."""
        reg = _DictRegistry({"id1": object()})

        result = all_devices(reg)

        assert isinstance(result, list)
