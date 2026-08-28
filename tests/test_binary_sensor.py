"""End-to-end test: device group creates HA binary_sensor entities."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.const import STATE_OFF
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import DOMAIN

from ._esphome_helpers import register_esphome_source
from ._registry_helpers import get_device_by_identifier


@pytest.fixture(autouse=True)
def _stub_frontend_deps(hass):
    """The integration hard-depends on frontend/panel_custom (no hass_frontend
    in CI). Mark them loaded so dependency resolution passes, and stub panel
    registration so a real config-entry setup works without a built frontend."""
    hass.config.components.add("frontend")
    hass.config.components.add("panel_custom")
    with (
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=test",
        ),
        patch("custom_components.eppgrid._register_card_resource", new_callable=AsyncMock),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        yield


@pytest.fixture
async def integration_with_group(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> dict:
    """Set up the integration with one device group and two fake source entities."""
    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    b = register_esphome_source(hass, "11:22:33:44:55:66", "occupancy")
    hass.states.async_set(a.entity_id, STATE_OFF)
    hass.states.async_set(b.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Master Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
    )
    await hass.async_block_till_done()
    return {"group": group, "source_a": a.entity_id, "source_b": b.entity_id}


async def test_helper_occupancy_entity_created_with_expected_unique_id(
    hass: HomeAssistant, integration_with_group: dict
) -> None:
    group = integration_with_group["group"]
    er_ = er.async_get(hass)
    expected_uid = f"eppgrid_device_group_{group['id']}_occupancy"
    entry = er_.async_get_entity_id("binary_sensor", DOMAIN, expected_uid)
    assert entry is not None


async def test_helper_occupancy_initially_off(hass: HomeAssistant, integration_with_group: dict) -> None:
    group = integration_with_group["group"]
    er_ = er.async_get(hass)
    eid = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group['id']}_occupancy",
    )
    assert hass.states.get(eid).state == STATE_OFF


async def test_helper_occupancy_turns_on_when_source_on(hass: HomeAssistant, integration_with_group: dict) -> None:
    group = integration_with_group["group"]
    er_ = er.async_get(hass)
    helper = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group['id']}_occupancy",
    )
    hass.states.async_set(integration_with_group["source_a"], STATE_ON)
    await hass.async_block_till_done()
    assert hass.states.get(helper).state == STATE_ON


async def test_presence_entity_name_is_translation_driven(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """Presence helper names come from the translation_key (strings.json), not a
    hardcoded title-cased _attr_name — so `mmwave_presence` renders as
    'mmWave presence', not 'Mmwave Presence'."""
    er_ = er.async_get(hass)
    src = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "mmwave_presence")
    hass.states.async_set(src.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Master Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
    )
    await hass.async_block_till_done()

    eid = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group['id']}_mmwave_presence",
    )
    entry = er_.async_get(eid)
    assert entry.translation_key == "device_group_mmwave_presence"
    assert entry.original_name == "mmWave presence"


async def test_helper_has_virtual_device_in_registry(hass: HomeAssistant, integration_with_group: dict) -> None:
    group = integration_with_group["group"]
    dr_ = dr.async_get(hass)
    device = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    assert device is not None
    assert device.name == "Master Bedroom Presence"


@pytest.fixture
async def integration_with_group_and_zones(
    hass: HomeAssistant, config_entry: MockConfigEntry, enable_custom_integrations
) -> dict:
    # Source A: occupancy + zone_2_presence (named "Bed Left")
    a_occ = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    a_z2 = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "zone_2_presence")
    # Source B: occupancy + zone_3_presence (named "Bed Right")
    b_occ = register_esphome_source(hass, "11:22:33:44:55:66", "occupancy")
    b_z3 = register_esphome_source(hass, "11:22:33:44:55:66", "zone_3_presence")
    for e in (a_occ, a_z2, b_occ, b_z3):
        hass.states.async_set(e.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    # Seed zone names into store so zone_name_fn returns something. room_layout
    # is persisted as a dict with a zone_slots list (the real storage shape).
    manager._store.devices["AA:BB:CC:DD:EE:FF"] = {
        "room_layout": {
            "zone_slots": [
                {"type": "default"},
                None,
                {"name": "Bed Left", "type": "presence", "color": "#ff0000"},
                None,
                None,
                None,
                None,
                None,
            ],
        },
    }
    manager._store.devices["11:22:33:44:55:66"] = {
        "room_layout": {
            "zone_slots": [
                {"type": "default"},
                None,
                None,
                {"name": "Bed Right", "type": "presence", "color": "#ff0000"},
                None,
                None,
                None,
                None,
            ],
        },
    }

    group = await manager.device_groups.async_create(
        name="Master Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
    )
    # Add a zone group merging bed-left + bed-right
    await manager.device_groups.async_update(
        id=group["id"],
        name=group["name"],
        sources=group["sources"],
        area_id=None,
        zone_groups=[
            {
                "id": "zg1",
                "name": "Bed",
                "members": [
                    {"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2},
                    {"mac": "11:22:33:44:55:66", "zone_index": 3},
                ],
            }
        ],
    )
    await hass.async_block_till_done()
    return {
        "group_id": group["id"],
        "source_a_occ": a_occ.entity_id,
        "source_a_z2": a_z2.entity_id,
        "source_b_occ": b_occ.entity_id,
        "source_b_z3": b_z3.entity_id,
    }


async def test_zone_group_entity_created(hass: HomeAssistant, integration_with_group_and_zones: dict) -> None:
    group_id = integration_with_group_and_zones["group_id"]
    er_ = er.async_get(hass)
    eid = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group_id}_zone_group_zg1",
    )
    assert eid is not None


async def test_renaming_zone_group_updates_entity_name(
    hass: HomeAssistant, integration_with_group_and_zones: dict
) -> None:
    """Renaming a zone group must update the existing helper entity's friendly
    name (sync_all skips re-creating existing uids, so it must refresh names)."""
    gid = integration_with_group_and_zones["group_id"]
    er_ = er.async_get(hass)
    eid = er_.async_get_entity_id("binary_sensor", DOMAIN, f"eppgrid_device_group_{gid}_zone_group_zg1")
    assert eid is not None
    assert hass.states.get(eid).attributes["friendly_name"].endswith("Zone Bed")

    manager = hass.data[DOMAIN]
    await manager.device_groups.async_update(
        id=gid,
        name="Master Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
        area_id=None,
        zone_groups=[
            {
                "id": "zg1",
                "name": "Bedroom",
                "members": [
                    {"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2},
                    {"mac": "11:22:33:44:55:66", "zone_index": 3},
                ],
            }
        ],
    )
    await hass.async_block_till_done()

    assert hass.states.get(eid).attributes["friendly_name"].endswith("Zone Bedroom")


async def test_zone_group_aggregates_members(hass: HomeAssistant, integration_with_group_and_zones: dict) -> None:
    group_id = integration_with_group_and_zones["group_id"]
    er_ = er.async_get(hass)
    helper = er_.async_get_entity_id(
        "binary_sensor",
        DOMAIN,
        f"eppgrid_device_group_{group_id}_zone_group_zg1",
    )
    hass.states.async_set(
        integration_with_group_and_zones["source_b_z3"],
        STATE_ON,
    )
    await hass.async_block_till_done()
    assert hass.states.get(helper).state == STATE_ON


async def test_colliding_passthrough_zone_entities_are_source_prefixed(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """When two sources expose a passthrough zone with the same name, the helper
    entity names are disambiguated with the source device name — matching the
    projection/preview (e.g. 'Left Bedroom Desk' / 'Right Bedroom Desk')."""
    er_ = er.async_get(hass)
    for mac in ("AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"):
        occ = register_esphome_source(hass, mac, "occupancy")
        hass.states.async_set(occ.entity_id, STATE_OFF)
    a_z = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "zone_2_presence")
    b_z = register_esphome_source(hass, "11:22:33:44:55:66", "zone_3_presence")
    hass.states.async_set(a_z.entity_id, STATE_OFF)
    hass.states.async_set(b_z.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    # Device names + a same-named "Desk" zone on each source (zones NOT merged).
    manager._store.devices["AA:BB:CC:DD:EE:FF"] = {
        "name": "Left Bedroom",
        "room_layout": {"zone_slots": [{"type": "default"}, None, {"name": "Desk"}, None, None, None, None, None]},
    }
    manager._store.devices["11:22:33:44:55:66"] = {
        "name": "Right Bedroom",
        "room_layout": {"zone_slots": [{"type": "default"}, None, None, {"name": "Desk"}, None, None, None, None]},
    }

    group = await manager.device_groups.async_create(
        name="Combined",
        sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
    )
    await hass.async_block_till_done()

    a_eid = er_.async_get_entity_id(
        "binary_sensor", DOMAIN, f"eppgrid_device_group_{group['id']}_zone_pass_AA:BB:CC:DD:EE:FF_2"
    )
    b_eid = er_.async_get_entity_id(
        "binary_sensor", DOMAIN, f"eppgrid_device_group_{group['id']}_zone_pass_11:22:33:44:55:66_3"
    )
    assert a_eid and b_eid
    assert hass.states.get(a_eid).attributes["friendly_name"].endswith("Left Bedroom Zone Desk")
    assert hass.states.get(b_eid).attributes["friendly_name"].endswith("Right Bedroom Zone Desk")


async def test_merging_a_zone_purges_its_passthrough_entity(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """Merging a zone into a group must fully remove its old passthrough entity
    from the registry — not leave it lingering as 'unavailable'."""
    er_ = er.async_get(hass)
    occ = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    z2 = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "zone_2_presence")
    hass.states.async_set(occ.entity_id, STATE_OFF)
    hass.states.async_set(z2.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    manager._store.devices["AA:BB:CC:DD:EE:FF"] = {
        "name": "Dev",
        "room_layout": {"zone_slots": [{"type": "default"}, None, {"name": "Desk"}, None, None, None, None, None]},
    }
    group = await manager.device_groups.async_create(name="G", sources=["AA:BB:CC:DD:EE:FF"])
    await hass.async_block_till_done()

    pass_uid = f"eppgrid_device_group_{group['id']}_zone_pass_AA:BB:CC:DD:EE:FF_2"
    assert er_.async_get_entity_id("binary_sensor", DOMAIN, pass_uid) is not None

    # Merge zone 2 into a named zone group.
    await manager.device_groups.async_update(
        id=group["id"],
        name="G",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=None,
        zone_groups=[{"id": "zg1", "name": "Bed", "members": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2}]}],
    )
    await hass.async_block_till_done()

    assert er_.async_get_entity_id("binary_sensor", DOMAIN, pass_uid) is None


async def test_group_area_id_applied_to_device_registry(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """area_id stored on the group must be reflected in the HA device registry."""
    ar_ = ar.async_get(hass)
    area = ar_.async_create("Bedroom")

    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    hass.states.async_set(a.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=area.id,
    )
    await hass.async_block_till_done()

    dr_ = dr.async_get(hass)
    dev = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    assert dev is not None
    assert dev.area_id == area.id


async def test_clearing_group_area_id_clears_device_registry_area(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """Setting a group's area_id back to None must clear the HA device-registry
    area assignment — otherwise the virtual device stays stuck in the old area."""
    ar_ = ar.async_get(hass)
    area = ar_.async_create("Bedroom")

    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    hass.states.async_set(a.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=area.id,
    )
    await hass.async_block_till_done()

    dr_ = dr.async_get(hass)
    dev = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    assert dev is not None and dev.area_id == area.id

    # Clear the area.
    await manager.device_groups.async_update(
        id=group["id"],
        name=group["name"],
        sources=group["sources"],
        area_id=None,
        zone_groups=[],
    )
    await hass.async_block_till_done()

    dev = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    assert dev is not None
    assert dev.area_id is None


async def test_presence_change_does_not_overwrite_manual_area(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """Area reconciliation must happen only on group CRUD, not on every presence
    transition — otherwise a manual area the user sets on the group device gets
    reverted on the next motion event."""
    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    hass.states.async_set(a.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
    )  # no stored area_id
    await hass.async_block_till_done()

    ar_ = ar.async_get(hass)
    area = ar_.async_create("Bedroom")
    dr_ = dr.async_get(hass)
    dev = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    # User manually assigns the group device to an area in HA.
    dr_.async_update_device(dev.id, area_id=area.id)

    # A presence transition fires the aggregator's notify -> platform sync.
    hass.states.async_set(a.entity_id, STATE_ON)
    await hass.async_block_till_done()

    dev = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    assert dev.area_id == area.id


async def test_late_created_group_device_gets_configured_area(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """If a group's device is first created by a state/registry-driven sync
    (its source was enabled after the group was created), the configured
    area_id must still be applied to the device."""
    ar_ = ar.async_get(hass)
    area = ar_.async_create("Bedroom")

    er_ = er.async_get(hass)
    # Source registered but DISABLED -> no presence slot -> no entity/device yet.
    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy", disabled=True)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Bedroom Presence",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=area.id,
    )
    await hass.async_block_till_done()

    dr_ = dr.async_get(hass)
    # No device yet — the only source slot is disabled.
    assert get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}")) is None

    # Enable the source -> registry event -> sync creates the entity + device.
    er_.async_update_entity(a.entity_id, disabled_by=None)
    await hass.async_block_till_done()

    dev = get_device_by_identifier(dr_, (DOMAIN, f"device_group:{group['id']}"))
    assert dev is not None
    assert dev.area_id == area.id


async def test_passthrough_zone_entity_uses_configured_zone_name(
    hass: HomeAssistant,
    integration_with_group_and_zones: dict,
) -> None:
    """Passthrough zone entity name should use the user-configured zone name, not 'Zone N'."""
    er_ = er.async_get(hass)

    # Source A zone 2 is NOT in a zone group — it appears as a passthrough.
    # The fixture seeds zone_name as "Bed Left" for AA:BB:CC:DD:EE:FF zone 2.
    # BUT the zone_group merges zone 2 from A and zone 3 from B, so both are grouped.
    # Let's create a standalone group without zone_groups to get a passthrough.
    manager = hass.data[DOMAIN]
    standalone = await manager.device_groups.async_create(
        name="Single Sensor Group",
        sources=["AA:BB:CC:DD:EE:FF"],
    )
    await hass.async_block_till_done()

    uid = f"eppgrid_device_group_{standalone['id']}_zone_pass_AA:BB:CC:DD:EE:FF_2"
    entry = er_.async_get_entity_id("binary_sensor", DOMAIN, uid)
    assert entry is not None, "Passthrough zone entity not found"

    state = hass.states.get(entry)
    assert state is not None
    # The entity friendly name is composed of device name + entity name.
    # The entity's _attr_name should be "Bed Left", not "Zone 2".
    assert state.attributes.get("friendly_name", "").endswith("Bed Left"), (
        f"Expected entity name 'Bed Left', got friendly_name={state.attributes.get('friendly_name')!r}"
    )


from custom_components.eppgrid.const import REST_OF_ROOM_ID  # noqa: E402


async def test_combined_rest_of_room_entity_created_and_ors_zone_zero(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """The implicit combined Rest of Room is created via the zone-group path with
    id rest_of_room and ORs every source's zone 0."""
    er_ = er.async_get(hass)
    a0 = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")
    b0 = register_esphome_source(hass, "11:22:33:44:55:66", "zone_0_presence")
    hass.states.async_set(a0.entity_id, STATE_OFF)
    hass.states.async_set(b0.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(
        name="Combined", sources=["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"]
    )
    await hass.async_block_till_done()

    uid = f"eppgrid_device_group_{group['id']}_zone_group_{REST_OF_ROOM_ID}"
    eid = er_.async_get_entity_id("binary_sensor", DOMAIN, uid)
    assert eid is not None
    assert hass.states.get(eid).attributes["friendly_name"].endswith("Zone Rest of Room")

    hass.states.async_set(b0.entity_id, STATE_ON)
    await hass.async_block_till_done()
    assert hass.states.get(eid).state == STATE_ON


async def test_no_per_device_zone_zero_passthrough_entity(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """Per-device zone-0 passthroughs are no longer created — only the combined
    Rest of Room exists."""
    er_ = er.async_get(hass)
    a0 = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")
    hass.states.async_set(a0.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(name="G", sources=["AA:BB:CC:DD:EE:FF"])
    await hass.async_block_till_done()

    stale = f"eppgrid_device_group_{group['id']}_zone_pass_AA:BB:CC:DD:EE:FF_0"
    assert er_.async_get_entity_id("binary_sensor", DOMAIN, stale) is None


async def test_excluding_rest_of_room_removes_its_entity(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    """Adding rest_of_room to excluded_zone_groups (via update) reconciles the
    combined RoR entity away."""
    er_ = er.async_get(hass)
    a0 = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "zone_0_presence")
    hass.states.async_set(a0.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(name="G", sources=["AA:BB:CC:DD:EE:FF"])
    await hass.async_block_till_done()

    uid = f"eppgrid_device_group_{group['id']}_zone_group_{REST_OF_ROOM_ID}"
    assert er_.async_get_entity_id("binary_sensor", DOMAIN, uid) is not None

    await manager.device_groups.async_update(
        id=group["id"],
        name="G",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=None,
        zone_groups=[],
        excluded_zone_groups=[REST_OF_ROOM_ID],
    )
    await hass.async_block_till_done()

    assert er_.async_get_entity_id("binary_sensor", DOMAIN, uid) is None


async def test_excluding_a_presence_slot_removes_its_entity(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations,
) -> None:
    er_ = er.async_get(hass)
    a = register_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    hass.states.async_set(a.entity_id, STATE_OFF)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    manager = hass.data[DOMAIN]
    group = await manager.device_groups.async_create(name="G", sources=["AA:BB:CC:DD:EE:FF"])
    await hass.async_block_till_done()

    uid = f"eppgrid_device_group_{group['id']}_occupancy"
    assert er_.async_get_entity_id("binary_sensor", DOMAIN, uid) is not None

    await manager.device_groups.async_update(
        id=group["id"],
        name="G",
        sources=["AA:BB:CC:DD:EE:FF"],
        area_id=None,
        zone_groups=[],
        excluded_presence=["occupancy"],
    )
    await hass.async_block_till_done()

    assert er_.async_get_entity_id("binary_sensor", DOMAIN, uid) is None
