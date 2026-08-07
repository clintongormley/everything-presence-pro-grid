"""Regression tests for issue #355 — HA 2026.8+ ESPHome unique_id format.

HA 2026.8 bundles an ``aioesphomeapi`` whose ``build_device_unique_id`` defaults
to *version 3*, changing entity unique_ids from the legacy
``{mac}-{entity_type}-{object_id}`` (dash-joined, mangled object_id) to
``{mac}/{device_id}/{entity_type}/{name}`` (slash-joined, unmangled name). Every
integration matcher that keyed on the ``-{object_id}`` suffix silently stopped
matching, so EPP Grid firmware devices read as "original firmware, flash over
USB", discovery found nothing, and zone/settings/device-group lookups broke.

These tests pin the normalisation (`_esphome_object_id`) and the device-facing
paths that depend on it against both formats.
"""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.const import EPP_MANUFACTURER
from custom_components.eppgrid.const import EPP_MODELS
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager._helpers import _esphome_object_id
from custom_components.eppgrid.storage import EPPGridStore
from custom_components.eppgrid.websocket_api._devices import _entity_key_for_object_id
from custom_components.eppgrid.websocket_api._devices import _object_id_from_unique_id


class TestEsphomeObjectId:
    """`_esphome_object_id` collapses every HA unique_id format to the object_id."""

    def test_v1_dash_object_id(self) -> None:
        assert _esphome_object_id("112233445566-text_sensor-firmware_version") == "firmware_version"

    def test_v2_dash_name(self) -> None:
        assert _esphome_object_id("112233445566-text_sensor-Firmware Version") == "firmware_version"

    def test_v3_slash_name(self) -> None:
        assert _esphome_object_id("112233445566/0/text_sensor/Firmware Version") == "firmware_version"

    def test_v3_zone_name_to_object_id(self) -> None:
        assert _esphome_object_id("112233445566/0/binary_sensor/Zone 3 Presence") == "zone_3_presence"

    def test_v1_sub_device_at_suffix_is_stripped(self) -> None:
        """HA appends ``@{device_id}`` to v1/v2 unique_ids for sub-device entities."""
        assert _esphome_object_id("112233445566-binary_sensor-zone_3_presence@2") == "zone_3_presence"

    def test_equality_does_not_shadow_prefixed_object_id(self) -> None:
        """`current_connections` and `max_current_connections` stay distinct.

        Matching by equality on the normalised object_id (not a suffix) is what
        stops `max_current_connections` from being read as `current_connections`.
        """
        assert _esphome_object_id("112233445566/0/sensor/Max Current Connections") == "max_current_connections"
        assert _esphome_object_id("112233445566/0/sensor/Current Connections") == "current_connections"


class TestSettingsEntityKeyMapping:
    """The settings-toggle object_id → frontend key mapping survives v3."""

    def test_v3_zone_presence_maps_to_zone_presence_key(self) -> None:
        object_id = _object_id_from_unique_id("112233445566/0/binary_sensor/Zone 2 Presence")
        assert _entity_key_for_object_id(object_id) == "zone_presence"

    def test_v3_co2_maps_to_env_co2_key(self) -> None:
        object_id = _object_id_from_unique_id("112233445566/0/sensor/CO2")
        assert _entity_key_for_object_id(object_id) == "env_co2"


def _make_v3_epp_device(hass: HomeAssistant, *, mac: str, host: str, version: str) -> None:
    """Register an ESPHome EPP Grid device whose firmware_version sensor uses the
    HA 2026.8+ version-3 (slash, unmangled name) unique_id."""
    esphome_entry = MockConfigEntry(domain="esphome", data={"host": host}, title="EPP v3")
    esphome_entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={(dr.CONNECTION_NETWORK_MAC, mac)},
        name="Everything Presence Pro 445566",
        manufacturer=EPP_MANUFACTURER,
        model=EPP_MODELS[0],
        sw_version=version,
    )
    mac_hex = mac.replace(":", "").lower()
    entity = er.async_get(hass).async_get_or_create(
        "sensor",
        "esphome",
        f"{mac_hex}/0/text_sensor/Firmware Version",
        device_id=device.id,
        config_entry=esphome_entry,
    )
    hass.states.async_set(entity.entity_id, version)


class TestDiscoveryAndFirmwareReadV3:
    @pytest.fixture
    def manager(self, hass: HomeAssistant) -> DeviceManager:
        return DeviceManager(hass, EPPGridStore(hass))

    async def test_discover_finds_v3_firmware_version_device(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        _make_v3_epp_device(hass, mac="11:22:33:44:55:66", host="192.168.1.60", version="1.6.0")

        await manager.async_discover()

        assert "11:22:33:44:55:66" in manager.devices

    async def test_read_firmware_version_v3(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        _make_v3_epp_device(hass, mac="11:22:33:44:55:66", host="192.168.1.60", version="1.6.0")
        await manager.async_discover()

        dev = manager.devices["11:22:33:44:55:66"]
        assert manager.read_firmware_version(dev.device_id) == "1.6.0"
