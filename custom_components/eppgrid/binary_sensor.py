"""Binary sensor platform — exposes the entities for each Device Group."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .const import PRESENCE_SLOTS
from .const import REST_OF_ROOM_ID
from .const import REST_OF_ROOM_NAME
from .device_groups._aggregator import Aggregator
from .device_groups._projection import resolve_name_collisions
from .dr_compat import device_by_identifier

_LOGGER = logging.getLogger(__name__)

_PRESENCE_DEVICE_CLASS: dict[str, BinarySensorDeviceClass | None] = {
    "occupancy": BinarySensorDeviceClass.OCCUPANCY,
    "static_presence": BinarySensorDeviceClass.OCCUPANCY,
    "motion_presence": BinarySensorDeviceClass.MOTION,
    "target_presence": BinarySensorDeviceClass.OCCUPANCY,
    "mmwave_presence": BinarySensorDeviceClass.OCCUPANCY,
}


def _passthrough_names(aggregator: Aggregator) -> dict[tuple[str, int], str]:
    """Collision-resolved display names for a group's passthrough zones.

    Uses the same `resolve_name_collisions` rule as the projection/preview so the
    created entity names match what the panel shows (e.g. two "Desk" zones
    become "Left Bedroom Desk" / "Right Bedroom Desk").
    """
    keys = list(aggregator.outputs.get("zone_passthroughs", {}))
    raw = [aggregator.zone_name(mac, idx) or f"Zone {idx}" for mac, idx in keys]
    sources = [aggregator.device_name(mac) for mac, _ in keys]
    return dict(zip(keys, resolve_name_collisions(raw, sources), strict=True))


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary_sensor platform for Device Groups."""
    manager = hass.data[DOMAIN]
    platform_proxy = _PlatformProxy(hass, async_add_entities, entry.entry_id)
    manager.device_groups.attach_platform(platform_proxy)
    platform_proxy.sync_all(manager.device_groups.list_groups())


class _PlatformProxy:
    """Tracks created entities; can add/remove on demand."""

    def __init__(self, hass: HomeAssistant, async_add_entities: AddEntitiesCallback, entry_id: str) -> None:
        self._hass = hass
        self._async_add = async_add_entities
        # Our (eppgrid) config-entry id — scopes the device-registry lookup on
        # HA 2026.8+, where identifiers are unique only per config entry.
        self._entry_id = entry_id
        # unique_id -> entity
        self._entities: dict[str, BinarySensorEntity] = {}

    def sync_all(self, groups: list[dict[str, Any]], *, reconcile_area: bool = True) -> None:
        """Reconcile entities to match the set of groups + their outputs.

        Adds new entities for: presence slots present in aggregator.outputs,
        zone groups defined on the group, and passthrough zones present in
        aggregator.outputs. Removes entities that no longer belong (e.g. when
        a group is deleted or a zone group is removed).

        `reconcile_area` writes each group's stored area_id to the HA device
        registry; pass False for state-driven syncs (every presence change)
        so we don't continuously overwrite an area the user set manually — area
        only changes via group CRUD.
        """
        new_entities: list[BinarySensorEntity] = []
        for group in groups:
            aggregator = self._hass.data[DOMAIN].device_groups.get_aggregator(group["id"])
            if aggregator is None:
                continue
            new_entities.extend(self._build_presence_entities(group, aggregator))
            new_entities.extend(self._build_zone_entities(group, aggregator))
        if new_entities:
            self._async_add(new_entities)
        self._apply_area_assignments(groups, force=reconcile_area)
        # Remove entities for deleted groups / removed zones.
        active_uids = self._compute_active_uids(groups)
        ent_reg = er.async_get(self._hass)
        for uid in list(self._entities.keys()):
            if uid not in active_uids:
                e = self._entities.pop(uid)
                entity_id = e.entity_id
                if entity_id and ent_reg.async_get(entity_id):
                    # Purge the registry entry too — removing only the live
                    # entity would leave a merged-away zone lingering as an
                    # "unavailable" entity on the device page. Registry removal
                    # also tears down the running entity.
                    ent_reg.async_remove(entity_id)
                else:
                    self._hass.async_create_task(e.async_remove(force_remove=True))

    def _build_presence_entities(self, group: dict[str, Any], aggregator: Aggregator) -> list[BinarySensorEntity]:
        out: list[BinarySensorEntity] = []
        for slot in PRESENCE_SLOTS:
            if slot not in aggregator.outputs.get("presence", {}):
                continue
            uid = f"eppgrid_device_group_{group['id']}_{slot}"
            if uid in self._entities:
                continue
            e = DeviceGroupPresenceEntity(group, slot, aggregator)
            self._entities[uid] = e
            out.append(e)
        return out

    def _build_zone_entities(self, group: dict[str, Any], aggregator: Aggregator) -> list[BinarySensorEntity]:
        out: list[BinarySensorEntity] = []
        stored_zgs = {zg["id"]: zg for zg in group.get("zone_groups", [])}
        for zg_id in aggregator.outputs.get("zone_groups", {}):
            uid = f"eppgrid_device_group_{group['id']}_zone_group_{zg_id}"
            zg: dict[str, Any]
            if zg_id == REST_OF_ROOM_ID:
                # Implicit combined Rest of Room — not in stored zone_groups.
                zg = {"id": REST_OF_ROOM_ID}
                name = REST_OF_ROOM_NAME
            else:
                stored = stored_zgs.get(zg_id)
                if stored is None:
                    # Aggregator output references a zone group not in the current
                    # definition (transient desync mid-update); the stale entity is
                    # reconciled away by _compute_active_uids, so skip it here.
                    continue
                zg = stored
                # A merged zone is a zone sensor too — name it "Zone {name}".
                name = f"Zone {zg['name']}"
            existing = self._entities.get(uid)
            if isinstance(existing, DeviceGroupZoneGroupEntity):
                # Refresh the name so a zone-group rename updates the entity.
                existing.update_name(name)
                continue
            e = DeviceGroupZoneGroupEntity(group, zg, name, aggregator)
            self._entities[uid] = e
            out.append(e)
        for (mac, idx), name in _passthrough_names(aggregator).items():
            uid = f"eppgrid_device_group_{group['id']}_zone_pass_{mac}_{idx}"
            existing = self._entities.get(uid)
            if isinstance(existing, DeviceGroupZonePassthroughEntity):
                existing.update_name(name)
                continue
            e = DeviceGroupZonePassthroughEntity(group, mac, idx, name, aggregator)
            self._entities[uid] = e
            out.append(e)
        return out

    def _apply_area_assignments(self, groups: list[dict[str, Any]], *, force: bool) -> None:
        """Reconcile each group's HA device area to its stored area_id.

        ``force`` (group CRUD): the stored area_id is authoritative — set it
        unconditionally, including clearing to None when the user removes the
        area.

        not ``force`` (state-driven sync): only apply an *initial* area to a
        device that has none yet. This covers a device first created by a late
        state/registry sync (e.g. its source was enabled after the group was
        created) without overwriting an area the user set manually on every
        presence change.
        """
        dr_ = dr.async_get(self._hass)
        for g in groups:
            dev = device_by_identifier(dr_, (DOMAIN, f"device_group:{g['id']}"), self._entry_id)
            if dev is None:
                continue
            target = g.get("area_id")
            if force:
                if dev.area_id != target:
                    dr_.async_update_device(dev.id, area_id=target)
            elif dev.area_id is None and target is not None:
                dr_.async_update_device(dev.id, area_id=target)

    def _compute_active_uids(self, groups: list[dict[str, Any]]) -> set[str]:
        uids: set[str] = set()
        for g in groups:
            agg = self._hass.data[DOMAIN].device_groups.get_aggregator(g["id"])
            if agg is None:
                continue
            for slot in agg.outputs.get("presence", {}):
                uids.add(f"eppgrid_device_group_{g['id']}_{slot}")
            for zg_id in agg.outputs.get("zone_groups", {}):
                uids.add(f"eppgrid_device_group_{g['id']}_zone_group_{zg_id}")
            for mac, idx in agg.outputs.get("zone_passthroughs", {}):
                uids.add(f"eppgrid_device_group_{g['id']}_zone_pass_{mac}_{idx}")
        return uids


class DeviceGroupPresenceEntity(BinarySensorEntity):
    """A helper entity that mirrors `Aggregator.outputs['presence'][slot]`."""

    _attr_should_poll = False
    _attr_has_entity_name = True

    def __init__(
        self,
        group: dict[str, Any],
        slot: str,
        aggregator: Aggregator,
    ) -> None:
        self._group_id = group["id"]
        self._slot = slot
        self._aggregator = aggregator
        self._unsub: Callable[[], None] | None = None
        self._attr_unique_id = f"eppgrid_device_group_{group['id']}_{slot}"
        # Name is i18n-driven from strings.json — do NOT set _attr_name, which
        # would override the localised name (and the "mmWave presence" casing).
        self._attr_translation_key = f"device_group_{slot}"
        self._attr_device_class = _PRESENCE_DEVICE_CLASS.get(slot)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"device_group:{group['id']}")},
            name=group["name"],
            manufacturer="Everything Presence Grid",
            model="Device Group",
        )

    @property
    def is_on(self) -> bool | None:
        return self._aggregator.outputs["presence"].get(self._slot)

    @property
    def available(self) -> bool:
        return self._aggregator.outputs["presence"].get(self._slot) is not None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = self._aggregator.attach_entity_listener(
            self._slot,
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await super().async_will_remove_from_hass()


class DeviceGroupZoneGroupEntity(BinarySensorEntity):
    """A helper entity that mirrors `Aggregator.outputs['zone_groups'][zg_id]`."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    def __init__(
        self,
        group: dict[str, Any],
        zone_group: dict[str, Any],
        name: str,
        aggregator: Aggregator,
    ) -> None:
        self._zg_id = zone_group["id"]
        self._aggregator = aggregator
        self._unsub: Callable[[], None] | None = None
        self._attr_unique_id = f"eppgrid_device_group_{group['id']}_zone_group_{zone_group['id']}"
        self._attr_name = name
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"device_group:{group['id']}")},
            name=group["name"],
            manufacturer="Everything Presence Grid",
            model="Device Group",
        )

    def update_name(self, name: str) -> None:
        """Refresh the entity name (e.g. after a zone-group rename) and push it."""
        if self._attr_name != name:
            self._attr_name = name
            if self.hass is not None:
                self.async_write_ha_state()

    @property
    def is_on(self) -> bool | None:
        return self._aggregator.outputs["zone_groups"].get(self._zg_id)

    @property
    def available(self) -> bool:
        return self._aggregator.outputs["zone_groups"].get(self._zg_id) is not None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = self._aggregator.attach_entity_listener(
            f"zone_group:{self._zg_id}",
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await super().async_will_remove_from_hass()


class DeviceGroupZonePassthroughEntity(BinarySensorEntity):
    """A helper entity that mirrors `Aggregator.outputs['zone_passthroughs'][(mac, idx)]`."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    def __init__(
        self,
        group: dict[str, Any],
        mac: str,
        zone_index: int,
        name: str,
        aggregator: Aggregator,
    ) -> None:
        self._mac = mac
        self._zone_index = zone_index
        self._aggregator = aggregator
        self._unsub: Callable[[], None] | None = None
        self._attr_unique_id = f"eppgrid_device_group_{group['id']}_zone_pass_{mac}_{zone_index}"
        # Collision-resolved name supplied by the platform (matches the preview).
        self._attr_name = name
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"device_group:{group['id']}")},
            name=group["name"],
            manufacturer="Everything Presence Grid",
            model="Device Group",
        )

    def update_name(self, name: str) -> None:
        """Refresh the entity name (e.g. after a zone rename) and push it."""
        if self._attr_name != name:
            self._attr_name = name
            if self.hass is not None:
                self.async_write_ha_state()

    @property
    def is_on(self) -> bool | None:
        return self._aggregator.outputs["zone_passthroughs"].get((self._mac, self._zone_index))

    @property
    def available(self) -> bool:
        return self._aggregator.outputs["zone_passthroughs"].get((self._mac, self._zone_index)) is not None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = self._aggregator.attach_entity_listener(
            f"zone_pass:{self._mac}:{self._zone_index}",
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await super().async_will_remove_from_hass()
