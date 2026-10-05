"""Admin HA action eppgrid.clear_heatmap."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import pytest
import yaml
from homeassistant.core import Context
from homeassistant.exceptions import HomeAssistantError
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import selector
from pytest_homeassistant_custom_component.common import MockUser

from custom_components.eppgrid import _async_register_services
from custom_components.eppgrid.const import DOMAIN
from tests.test_websocket_api import setup_integration

SERVICES_YAML = Path(__file__).parent.parent / "custom_components" / "eppgrid" / "services.yaml"


def _session(ok=True):
    s = MagicMock()
    s.async_clear_heatmap = AsyncMock(side_effect=None if ok else RuntimeError("boom"))
    return s


async def test_no_target_clears_all(hass, config_entry):
    mgr = await setup_integration(hass, config_entry)
    sessions = {"AA": _session(), "BB": _session()}
    mgr.devices = {"AA": MagicMock(), "BB": MagicMock()}
    mgr.get_session = MagicMock(side_effect=lambda mac: sessions.get(mac))

    await hass.services.async_call(DOMAIN, "clear_heatmap", {}, blocking=True)

    for s in sessions.values():
        s.async_clear_heatmap.assert_awaited_once_with()


async def test_empty_explicit_target_clears_nothing(hass, config_entry):
    """An explicitly-supplied but EMPTY target key (e.g. {"device_id": []} from a
    templated automation) must resolve to zero devices — NOT fall through to the
    "no target -> clear all" branch. Destructive, no-undo action; an empty target
    must be a no-op, not a surprise full sweep.
    """
    mgr = await setup_integration(hass, config_entry)
    sessions = {"AA": _session(), "BB": _session()}
    mgr.devices = {"AA": MagicMock(), "BB": MagicMock()}
    mgr.get_session = MagicMock(side_effect=lambda mac: sessions.get(mac))

    # Must not raise — an explicit target resolving to nothing has no failures
    # to report.
    await hass.services.async_call(DOMAIN, "clear_heatmap", {"device_id": []}, blocking=True)

    for s in sessions.values():
        s.async_clear_heatmap.assert_not_awaited()


async def test_explicit_device_target(hass, config_entry):
    mgr = await setup_integration(hass, config_entry)
    session = _session()
    mgr.mac_for_device_id = MagicMock(return_value="AA")
    mgr.get_session = MagicMock(return_value=session)

    await hass.services.async_call(DOMAIN, "clear_heatmap", {"device_id": ["dev1"]}, blocking=True)

    session.async_clear_heatmap.assert_awaited_once_with()


async def test_explicit_offline_raises(hass, config_entry):
    mgr = await setup_integration(hass, config_entry)
    mgr.mac_for_device_id = MagicMock(return_value="AA")
    mgr.get_session = MagicMock(return_value=None)  # offline

    # Match on the message so this can't pass vacuously via ServiceNotFound
    # (which is itself a HomeAssistantError subclass).
    with pytest.raises(HomeAssistantError, match="dev1"):
        await hass.services.async_call(DOMAIN, "clear_heatmap", {"device_id": ["dev1"]}, blocking=True)


async def test_explicit_execute_error_raises(hass, config_entry):
    """A device whose clear call raises is also collected into the failure error."""
    mgr = await setup_integration(hass, config_entry)
    mgr.mac_for_device_id = MagicMock(return_value="AA")
    session = _session(ok=False)
    mgr.get_session = MagicMock(return_value=session)

    with pytest.raises(HomeAssistantError, match="dev1"):
        await hass.services.async_call(DOMAIN, "clear_heatmap", {"device_id": ["dev1"]}, blocking=True)
    session.async_clear_heatmap.assert_awaited_once_with()


async def test_clear_all_skips_offline(hass, config_entry):
    mgr = await setup_integration(hass, config_entry)
    ok = _session()
    mgr.devices = {"AA": MagicMock(), "BB": MagicMock()}
    mgr.get_session = MagicMock(side_effect=lambda mac: ok if mac == "AA" else None)

    # Must NOT raise even though BB is offline.
    await hass.services.async_call(DOMAIN, "clear_heatmap", {}, blocking=True)
    ok.async_clear_heatmap.assert_awaited_once_with()


async def test_clear_all_skips_execute_error(hass, config_entry):
    """Clear-all never raises, even when a reachable device's clear call errors."""
    mgr = await setup_integration(hass, config_entry)
    ok = _session()
    bad = _session(ok=False)
    mgr.devices = {"AA": MagicMock(), "BB": MagicMock()}
    mgr.get_session = MagicMock(side_effect=lambda mac: {"AA": ok, "BB": bad}.get(mac))

    await hass.services.async_call(DOMAIN, "clear_heatmap", {}, blocking=True)
    ok.async_clear_heatmap.assert_awaited_once_with()
    bad.async_clear_heatmap.assert_awaited_once_with()


async def test_non_eppgrid_target_ignored(hass, config_entry):
    mgr = await setup_integration(hass, config_entry)
    mgr.mac_for_device_id = MagicMock(return_value=None)  # not our device
    mgr.get_session = MagicMock()

    # Nothing to clear, no error.
    await hass.services.async_call(DOMAIN, "clear_heatmap", {"device_id": ["other"]}, blocking=True)
    mgr.get_session.assert_not_called()


async def test_area_target_resolved(hass, config_entry):
    """A device tied to an area is resolved via the device registry and cleared."""
    mgr = await setup_integration(hass, config_entry)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("esphome", "area_target_device")},
        name="Office",
    )
    dev_reg.async_update_device(device.id, area_id="bedroom")

    session = _session()
    mgr.mac_for_device_id = MagicMock(side_effect=lambda did: "AA" if did == device.id else None)
    mgr.get_session = MagicMock(return_value=session)

    await hass.services.async_call(DOMAIN, "clear_heatmap", {"area_id": ["bedroom"]}, blocking=True)

    session.async_clear_heatmap.assert_awaited_once_with()


async def test_label_target_resolved(hass, config_entry):
    """A device tagged with a label is resolved via the device registry and cleared."""
    mgr = await setup_integration(hass, config_entry)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("esphome", "label_target_device")},
        name="Kitchen",
    )
    dev_reg.async_update_device(device.id, labels={"presence"})

    session = _session()
    mgr.mac_for_device_id = MagicMock(side_effect=lambda did: "AA" if did == device.id else None)
    mgr.get_session = MagicMock(return_value=session)

    await hass.services.async_call(DOMAIN, "clear_heatmap", {"label_id": ["presence"]}, blocking=True)

    session.async_clear_heatmap.assert_awaited_once_with()


async def test_entity_target_resolved(hass, config_entry):
    """An explicit entity target resolves to its owning device via the entity registry."""
    mgr = await setup_integration(hass, config_entry)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("esphome", "entity_target_device")},
        name="Hallway",
    )
    ent_reg = er.async_get(hass)
    entity = ent_reg.async_get_or_create(
        "binary_sensor",
        "esphome",
        "hallway_occupancy",
        config_entry=config_entry,
        device_id=device.id,
        suggested_object_id="hallway_occupancy",
    )

    session = _session()
    mgr.mac_for_device_id = MagicMock(side_effect=lambda did: "AA" if did == device.id else None)
    mgr.get_session = MagicMock(return_value=session)

    await hass.services.async_call(DOMAIN, "clear_heatmap", {"entity_id": [entity.entity_id]}, blocking=True)

    session.async_clear_heatmap.assert_awaited_once_with()


async def test_area_target_resolved_via_entity(hass, config_entry):
    """An entity whose OWN area_id (not its device's) matches is also resolved."""
    mgr = await setup_integration(hass, config_entry)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("esphome", "entity_area_device")},
        name="Study",
    )
    # Device itself has no area — only the entity does.
    ent_reg = er.async_get(hass)
    entity = ent_reg.async_get_or_create(
        "binary_sensor",
        "esphome",
        "study_occupancy",
        config_entry=config_entry,
        device_id=device.id,
        suggested_object_id="study_occupancy",
        # HA 2026.10+ only lets an entity with a name of its own have its own area.
        original_name="Occupancy",
    )
    ent_reg.async_update_entity(entity.entity_id, area_id="attic")

    session = _session()
    mgr.mac_for_device_id = MagicMock(side_effect=lambda did: "AA" if did == device.id else None)
    mgr.get_session = MagicMock(return_value=session)

    await hass.services.async_call(DOMAIN, "clear_heatmap", {"area_id": ["attic"]}, blocking=True)

    session.async_clear_heatmap.assert_awaited_once_with()


async def test_label_target_resolved_via_entity(hass, config_entry):
    """An entity labeled directly (not via its device) is also resolved."""
    mgr = await setup_integration(hass, config_entry)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("esphome", "entity_label_device")},
        name="Garage",
    )
    # Device itself has no label — only the entity does.
    ent_reg = er.async_get(hass)
    entity = ent_reg.async_get_or_create(
        "binary_sensor",
        "esphome",
        "garage_occupancy",
        config_entry=config_entry,
        device_id=device.id,
        suggested_object_id="garage_occupancy",
    )
    ent_reg.async_update_entity(entity.entity_id, labels={"security"})

    session = _session()
    mgr.mac_for_device_id = MagicMock(side_effect=lambda did: "AA" if did == device.id else None)
    mgr.get_session = MagicMock(return_value=session)

    await hass.services.async_call(DOMAIN, "clear_heatmap", {"label_id": ["security"]}, blocking=True)

    session.async_clear_heatmap.assert_awaited_once_with()


async def test_register_services_is_idempotent(hass, config_entry):
    """Calling the registration helper again is a no-op (guarded by has_service)."""
    await setup_integration(hass, config_entry)

    # Should not raise (e.g. "service already registered") and should leave
    # the existing registration untouched.
    _async_register_services(hass)

    assert hass.services.has_service(DOMAIN, "clear_heatmap")


async def test_integration_not_loaded_raises(hass, config_entry):
    """Calling the service after the manager has been torn down raises cleanly."""
    await setup_integration(hass, config_entry)
    hass.data.pop(DOMAIN, None)

    with pytest.raises(HomeAssistantError, match="not loaded"):
        await hass.services.async_call(DOMAIN, "clear_heatmap", {}, blocking=True)


async def test_non_admin_rejected(hass, config_entry):
    """A non-admin caller is rejected by the admin-service gate."""
    await setup_integration(hass, config_entry)

    user = MockUser(groups=[]).add_to_hass(hass)
    non_admin_context = Context(user_id=user.id)

    with pytest.raises(Unauthorized):
        await hass.services.async_call(DOMAIN, "clear_heatmap", {}, blocking=True, context=non_admin_context)


def test_services_yaml_target_is_unrestricted_and_valid():
    """The target picker is deliberately unfiltered — no manufacturer/model/
    integration restriction on device or entity.

    The physical EPP sensors' entities are esphome-owned (not eppgrid-owned),
    so the picker can't be scoped to "EPP entities" via a static filter
    anyway. Filtering is delegated to the resolver instead:
    `_resolve_target_device_ids` + `manager.mac_for_device_id` already ignore
    any resolved device_id that isn't an eppgrid-managed device (see
    `test_non_eppgrid_target_ignored`), so a bare target is both simpler and
    exactly as safe.

    This test guards two things: (1) the target is still unrestricted (no
    filter key crept back in), and (2) it's still a structurally valid HA
    `TargetSelector` config — a plain "the key exists" check wouldn't have
    caught the earlier invalid `entity: {device: {...}}` shape, so we run it
    through the real selector, not just yaml.safe_load.
    """
    doc = yaml.safe_load(SERVICES_YAML.read_text())
    target = doc["clear_heatmap"].get("target")

    # Unrestricted: either absent (None) or an empty mapping — never a filter.
    assert target in (None, {})

    selector.TargetSelector(target)  # raises voluptuous.Invalid on a bad shape
