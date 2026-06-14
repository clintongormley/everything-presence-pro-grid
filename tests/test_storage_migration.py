"""Tests for EPPGridStore version migration."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.storage import STORAGE_VERSION
from custom_components.eppgrid.storage import EPPGridStore


def test_storage_version_is_three() -> None:
    """Bumped to v3 to stamp assisted_clear_timeout for pre-existing installs."""
    assert STORAGE_VERSION == 3


async def test_migration_from_v1_adds_empty_device_groups(hass: HomeAssistant, hass_storage: dict) -> None:
    """A v1 dict (no device_groups key) migrates to v2 with [] added."""
    hass_storage[DOMAIN] = {
        "version": 1,
        "key": DOMAIN,
        "data": {
            "devices": {"AA:BB:CC:DD:EE:FF": {"calibration": {}}},
            "configurations": {"bedroom": {"grid_bytes": [0]}},
            "sidebar_panel": False,
            "show_room_calibration_tutorial": True,
        },
    }
    store = EPPGridStore(hass)
    await store.async_load()

    # Existing keys preserved.
    assert "AA:BB:CC:DD:EE:FF" in store.devices
    assert "bedroom" in store.configurations
    assert store.sidebar_panel is False
    # New key initialized empty.
    assert store.device_groups == []


async def test_migration_v1_to_v3_runs_both_migrations(hass: HomeAssistant, hass_storage: dict) -> None:
    """A v1 dict migrates straight through to v3, running both migration blocks.

    A pre-existing v1 install that skips v2 must still pick up the device_groups
    list (v1->v2) AND the assisted_clear_timeout stamp on existing settings
    dicts (v2->v3) in a single load.
    """
    hass_storage[DOMAIN] = {
        "version": 1,
        "key": DOMAIN,
        "data": {
            "devices": {"AA:BB:CC:DD:EE:FF": {"settings": {"motion_timeout": 5}}},
            "configurations": {},
        },
    }
    store = EPPGridStore(hass)
    await store.async_load()

    # v1 -> v2 ran: device_groups added.
    assert store.device_groups == []
    # v2 -> v3 ran: existing settings dict got the immediate-clear stamp.
    assert store.devices["AA:BB:CC:DD:EE:FF"]["settings"]["assisted_clear_timeout"] == 0


async def test_fresh_store_has_empty_device_groups(hass: HomeAssistant) -> None:
    """A fresh store (no data on disk) initializes device_groups=[]."""
    store = EPPGridStore(hass)
    await store.async_load()
    assert store.device_groups == []


async def test_migration_v2_to_v3_stamps_assisted_clear_timeout(hass: HomeAssistant, hass_storage: dict) -> None:
    """v2 -> v3 stamps assisted_clear_timeout=0 into existing settings dicts.

    Pre-existing installs predate the sensor-assisted-clear timeout and must
    keep clearing immediately. Devices/configs that already have a settings
    dict get a 0 stamped in; a device with no settings dict (never configured)
    is treated as new and left alone so it picks up the 5s default.
    """
    hass_storage[DOMAIN] = {
        "version": 2,
        "key": DOMAIN,
        "data": {
            "devices": {
                "AA:BB:CC:DD:EE:FF": {"settings": {"motion_timeout": 5}},
                "11:22:33:44:55:66": {},  # no settings -> treated as new, untouched
            },
            "configurations": {"my-config": {"settings": {"static_timeout": 30}}},
            "device_groups": [],
        },
    }
    store = EPPGridStore(hass)
    await store.async_load()

    # Existing device settings get the immediate-clear stamp.
    assert store.devices["AA:BB:CC:DD:EE:FF"]["settings"]["assisted_clear_timeout"] == 0
    # Migration stamps the timeout only -- it must NOT stamp assisted_clear_enabled.
    assert "assisted_clear_enabled" not in store.devices["AA:BB:CC:DD:EE:FF"]["settings"]
    # Settings-less device is left untouched (no settings dict created).
    assert "settings" not in store.devices["11:22:33:44:55:66"]
    # Saved configurations get the stamp too.
    assert store.configurations["my-config"]["settings"]["assisted_clear_timeout"] == 0
    assert "assisted_clear_enabled" not in store.configurations["my-config"]["settings"]


async def test_migration_v2_to_v3_does_not_overwrite_existing_value(hass: HomeAssistant, hass_storage: dict) -> None:
    """Migration uses setdefault semantics: an existing value is preserved."""
    hass_storage[DOMAIN] = {
        "version": 2,
        "key": DOMAIN,
        "data": {
            "devices": {
                "AA:BB:CC:DD:EE:FF": {"settings": {"assisted_clear_timeout": 7}},
            },
            "configurations": {"my-config": {"settings": {"assisted_clear_timeout": 3}}},
            "device_groups": [],
        },
    }
    store = EPPGridStore(hass)
    await store.async_load()

    assert store.devices["AA:BB:CC:DD:EE:FF"]["settings"]["assisted_clear_timeout"] == 7
    assert store.configurations["my-config"]["settings"]["assisted_clear_timeout"] == 3


async def test_save_round_trip_persists_device_groups(hass: HomeAssistant) -> None:
    """Saving and re-loading preserves device_groups list."""
    store = EPPGridStore(hass)
    await store.async_load()
    store.device_groups = [
        {
            "id": "abc",
            "name": "Master Bedroom",
            "area_id": "master_bedroom",
            "sources": ["AA:BB:CC:DD:EE:FF"],
            "zone_groups": [],
        }
    ]
    await store.async_save()

    store2 = EPPGridStore(hass)
    await store2.async_load()
    assert len(store2.device_groups) == 1
    assert store2.device_groups[0]["name"] == "Master Bedroom"
