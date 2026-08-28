"""Call-site tests for the HA 2026.8+ entry-scoped device-registry path.

The HA 2025.2 floor (``hacs.json``) has no ``async_get_device_by_identifier`` /
``async_get_device_by_connection``, so on it the real-registry suites only ever
exercise the pre-2026.8 fallback branch of `dr_compat`; latest HA now ships the
real methods. Either way these tests install a *controlled* stand-in for the
entry-scoped API on the real registry — an entry-scoped lookup that returns a
device **only** when it belongs to the given config entry, exactly as
per-config-entry uniqueness behaves — so the scoping is deterministic across the
whole supported range, and prove each call site forwards the *correct* owning
config-entry id.

Teeth: under strict scoping the compat helper commits to the entry-scoped method
(it does not fall back once the method exists and a truthy id is supplied), so a
call site that forwards the *wrong non-None* config-entry id resolves to ``None``
and the asserted behaviour (area applied / device deleted / sources resolved)
breaks — verified by mutation. Forwarding *no* id can't be caught here: the bare
fallback still resolves in these single-device worlds, and a two-devices-share-a-
MAC world can't be built pre-2026.8 (the registry enforces global connection
uniqueness). That None/absent path is the pre-2026.8 behaviour the real-registry
suites already cover.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from homeassistant.const import STATE_OFF
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.device_groups._registry import build_source_index

from ._esphome_helpers import register_esphome_source
from ._registry_helpers import get_device_by_connection
from ._registry_helpers import get_device_by_identifier

# The two config-entry-setup tests below need frontend/panel_custom stubbed; the
# build_source_index test doesn't set up the entry but the fixture is harmless there.
pytestmark = pytest.mark.usefixtures("stub_frontend_deps")


def _simulate_ha_2026_8(monkeypatch, hass: HomeAssistant) -> None:
    """Add entry-scoped registry lookups that enforce per-config-entry uniqueness."""
    reg = dr.async_get(hass)

    def by_identifier(identifier, config_entry_id):
        dev = get_device_by_identifier(reg, identifier)
        if dev is None or config_entry_id not in dev.config_entries:
            return None
        return dev

    def by_connection(connection, config_entry_id):
        dev = get_device_by_connection(reg, connection)
        if dev is None or config_entry_id not in dev.config_entries:
            return None
        return dev

    monkeypatch.setattr(reg, "async_get_device_by_identifier", by_identifier, raising=False)
    monkeypatch.setattr(reg, "async_get_device_by_connection", by_connection, raising=False)


async def test_area_reconcile_uses_our_entry_id(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
    monkeypatch,
) -> None:
    """Case 1: the group's area is applied via a lookup scoped to the eppgrid entry."""
    area = ar.async_get(hass).async_create("Bedroom")
    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    hass.states.async_set(a.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    _simulate_ha_2026_8(monkeypatch, hass)

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=area.id,
    )
    await hass.async_block_till_done()

    dev = get_device_by_identifier(dr.async_get(hass), (DOMAIN, f"device_group:{group['id']}"))
    assert dev is not None
    assert dev.area_id == area.id


async def test_delete_removes_device_using_our_entry_id(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
    hass_ws_client: WebSocketGenerator,
    monkeypatch,
) -> None:
    """Case 2: deleting a group removes its virtual device via an entry-scoped lookup."""
    register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(name="A", sources=["AA:BB:CC:DD:EE:FF"])
    await hass.async_block_till_done()

    dr_ = dr.async_get(hass)
    ident = (DOMAIN, f"device_group:{group['id']}")
    assert get_device_by_identifier(dr_, ident) is not None

    _simulate_ha_2026_8(monkeypatch, hass)

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "eppgrid/delete_device_group", "group_id": group["id"]})
    msg = await client.receive_json()
    assert msg["success"] is True
    await hass.async_block_till_done()

    assert get_device_by_identifier(dr_, ident) is None


async def test_build_source_index_uses_esphome_entry_id(
    hass: HomeAssistant,
    monkeypatch,
) -> None:
    """Case 3: source resolution scopes the connection lookup to the ESPHome entry
    that owns the device — not eppgrid's own entry."""
    mac = "11:22:33:44:55:66"
    register_esphome_source(hass, mac, "occupancy")

    dr_ = dr.async_get(hass)
    dev = get_device_by_connection(dr_, (dr.CONNECTION_NETWORK_MAC, dr.format_mac(mac)))
    assert dev is not None
    esphome_entry_id = next(iter(dev.config_entries))

    # Stand in for the DeviceManager: build_source_index resolves the ESPHome
    # entry id via manager.esphome_entry_id_for_mac(mac).
    hass.data[DOMAIN] = SimpleNamespace(esphome_entry_id_for_mac=lambda m: esphome_entry_id if m == mac else None)

    _simulate_ha_2026_8(monkeypatch, hass)

    index = build_source_index(hass, mac)
    assert "occupancy" in index
