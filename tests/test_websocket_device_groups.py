"""Tests for device_groups websocket commands."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.const import DOMAIN
from tests.ha_harness import MockConfigEntry
from tests.ha_harness import WebSocketGenerator

from ._esphome_helpers import add_esphome_source


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
async def setup_with_sources(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    enable_custom_integrations: None,
) -> None:
    add_esphome_source(hass, "AA:BB:CC:DD:EE:FF", "occupancy")
    add_esphome_source(hass, "11:22:33:44:55:66", "occupancy")
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()


class TestList:
    async def test_list_empty(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id({"type": "eppgrid/list_device_groups"})
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["device_groups"] == []


class TestCreate:
    async def test_create_returns_record_with_id(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "Master Bedroom",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["device_group"]["id"]
        assert msg["result"]["device_group"]["name"] == "Master Bedroom"
        assert "exposed_entities" in msg["result"]["device_group"]

    async def test_create_rejects_missing_name(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is False

    async def test_create_persists_zone_groups_and_exclusions(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        """create must persist the full config in one step — historically it
        dropped zone_groups. Verify via the manager's stored record so this
        test does not depend on _serialize_group (covered in B5)."""
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
                "zone_groups": [
                    {
                        "id": "zg1",
                        "name": "Beds",
                        "members": [
                            {"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 1},
                            {"mac": "11:22:33:44:55:66", "zone_index": 1},
                        ],
                    }
                ],
                "excluded_presence": ["motion_presence"],
                "excluded_zones": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2}],
                "excluded_zone_groups": ["rest_of_room"],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True
        gid = msg["result"]["device_group"]["id"]

        stored = hass.data[DOMAIN].device_groups.get_group(gid)
        assert stored["zone_groups"][0]["id"] == "zg1"
        assert stored["excluded_presence"] == ["motion_presence"]
        assert stored["excluded_zones"] == [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2}]
        assert stored["excluded_zone_groups"] == ["rest_of_room"]

    async def test_create_accepts_exclusion_fields(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
                "zone_groups": [],
                "excluded_presence": ["motion_presence"],
                "excluded_zones": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2}],
                "excluded_zone_groups": ["rest_of_room"],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True

    async def test_create_rejects_excluded_zone_index_0(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
                "excluded_zones": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 0}],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is False


class TestUpdate:
    async def test_update_full_payload(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "Old",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        created = (await client.receive_json())["result"]["device_group"]

        await client.send_json_auto_id(
            {
                "type": "eppgrid/update_device_group",
                "group_id": created["id"],
                "name": "New",
                "sources": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
                "area_id": "bedroom",
                "zone_groups": [],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["device_group"]["name"] == "New"
        assert msg["result"]["device_group"]["sources"][0]["mac"] == "AA:BB:CC:DD:EE:FF"

    async def test_update_round_trips_exclusions(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        created = (await client.receive_json())["result"]["device_group"]

        await client.send_json_auto_id(
            {
                "type": "eppgrid/update_device_group",
                "group_id": created["id"],
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
                "area_id": None,
                "zone_groups": [],
                "excluded_presence": ["occupancy", "static_presence"],
                "excluded_zones": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 4}],
                "excluded_zone_groups": ["rest_of_room"],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True

        stored = hass.data[DOMAIN].device_groups.get_group(created["id"])
        assert stored["excluded_presence"] == ["occupancy", "static_presence"]
        assert stored["excluded_zones"] == [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 4}]
        assert stored["excluded_zone_groups"] == ["rest_of_room"]

    async def test_update_accepts_exclusion_fields(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        created = (await client.receive_json())["result"]["device_group"]

        await client.send_json_auto_id(
            {
                "type": "eppgrid/update_device_group",
                "group_id": created["id"],
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
                "area_id": None,
                "zone_groups": [],
                "excluded_presence": ["occupancy"],
                "excluded_zones": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 3}],
                "excluded_zone_groups": ["rest_of_room"],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True

    async def test_update_rejects_zone_0_in_zone_group_member(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        """Manual merges are zones 1-7 only; Rest of room (zone 0) is now an
        implicit combined group synthesised by the projection, never a stored
        zone_group member. zone_index 0 must fail schema validation."""
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        created = (await client.receive_json())["result"]["device_group"]

        await client.send_json_auto_id(
            {
                "type": "eppgrid/update_device_group",
                "group_id": created["id"],
                "name": "G",
                "sources": ["AA:BB:CC:DD:EE:FF"],
                "area_id": None,
                "zone_groups": [
                    {
                        "id": "zg1",
                        "name": "Whole room",
                        "members": [{"mac": "AA:BB:CC:DD:EE:FF", "zone_index": 0}],
                    }
                ],
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is False
        assert msg["error"]["code"] == "invalid_format"


class TestDelete:
    async def test_delete_removes_record(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "A",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        gid = (await client.receive_json())["result"]["device_group"]["id"]

        await client.send_json_auto_id(
            {
                "type": "eppgrid/delete_device_group",
                "group_id": gid,
            }
        )
        msg = await client.receive_json()
        assert msg["success"] is True

        await client.send_json_auto_id({"type": "eppgrid/list_device_groups"})
        msg = await client.receive_json()
        assert msg["result"]["device_groups"] == []


class TestSubscribe:
    async def test_subscribe_sends_initial_state(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id({"type": "eppgrid/subscribe_device_groups"})
        ack = await client.receive_json()
        assert ack["success"] is True
        evt = await client.receive_json()
        assert evt["type"] == "event"
        assert evt["event"]["device_groups"] == []
        # candidate_sources is always present so the editor can render device
        # zones before a group is saved.
        assert "candidate_sources" in evt["event"]

    async def test_subscribe_candidate_sources_expose_device_zones(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        """Every managed device appears as a candidate source with its zones, so
        the editor can show a device's zones the moment it's toggled."""
        mac = "AA:BB:CC:DD:EE:FF"
        manager = hass.data[DOMAIN]
        # Present this MAC as a managed device with a named, enabled zone.
        manager.devices[mac] = object()
        manager._store.devices[mac] = {
            "name": "Bedroom Sensor",
            "room_layout": {"zone_slots": [{"type": "default"}, None, {"name": "Desk"}, None, None, None, None, None]},
        }
        add_esphome_source(hass, mac, "zone_2_presence")

        client = await hass_ws_client(hass)
        await client.send_json_auto_id({"type": "eppgrid/subscribe_device_groups"})
        await client.receive_json()  # ack
        evt = await client.receive_json()

        cands = {c["mac"]: c for c in evt["event"]["candidate_sources"]}
        assert mac in cands
        assert cands[mac]["name"] == "Bedroom Sensor"
        assert {"index": 2, "name": "Zone Desk", "enabled": True} in cands[mac]["zones"]

    async def test_candidate_source_prefers_managed_device_name(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        """The friendly device name (not the MAC) identifies a source/zone."""
        from types import SimpleNamespace

        mac = "AA:BB:CC:DD:EE:FF"
        manager = hass.data[DOMAIN]
        manager.devices[mac] = SimpleNamespace(name="Living Room")

        client = await hass_ws_client(hass)
        await client.send_json_auto_id({"type": "eppgrid/subscribe_device_groups"})
        await client.receive_json()  # ack
        evt = await client.receive_json()

        cands = {c["mac"]: c for c in evt["event"]["candidate_sources"]}
        assert cands[mac]["name"] == "Living Room"

    async def test_subscribe_fires_on_create(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        client = await hass_ws_client(hass)
        await client.send_json_auto_id({"type": "eppgrid/subscribe_device_groups"})
        await client.receive_json()  # ack
        await client.receive_json()  # initial event

        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "A",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        # Either result-of-create or subscription event arrives first; accept either.
        msgs = []
        for _ in range(2):
            msgs.append(await client.receive_json())
        events = [m for m in msgs if m.get("type") == "event"]
        assert events, "expected a subscription event after create"
        assert len(events[0]["event"]["device_groups"]) == 1


class TestSerialize:
    async def test_serialize_group_surfaces_exclusions_and_prunes_exposed(
        self,
        hass: HomeAssistant,
        setup_with_sources: None,
        hass_ws_client: WebSocketGenerator,
    ) -> None:
        """The serialized group must echo the exclusion fields, and an excluded
        presence slot must not appear in exposed_entities.presence."""
        client = await hass_ws_client(hass)
        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "Baseline",
                "sources": ["AA:BB:CC:DD:EE:FF"],
            }
        )
        baseline = (await client.receive_json())["result"]["device_group"]
        assert "occupancy" in baseline["exposed_entities"]["presence"]
        assert baseline["excluded_presence"] == []
        assert baseline["excluded_zones"] == []
        assert baseline["excluded_zone_groups"] == []

        await client.send_json_auto_id(
            {
                "type": "eppgrid/create_device_group",
                "name": "Excluded",
                "sources": ["AA:BB:CC:DD:EE:FF"],
                "excluded_presence": ["occupancy"],
                "excluded_zone_groups": ["rest_of_room"],
            }
        )
        excluded = (await client.receive_json())["result"]["device_group"]
        assert excluded["excluded_presence"] == ["occupancy"]
        assert excluded["excluded_zone_groups"] == ["rest_of_room"]
        assert "occupancy" not in excluded["exposed_entities"]["presence"]
