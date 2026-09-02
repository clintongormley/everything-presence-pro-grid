"""Forward guard: recognise whatever unique_id format the *installed* aioesphomeapi
produces — not just the v1/v3 strings hardcoded in ``test_esphome_unique_id_v3.py``.

Issue #355 slipped through CI even though the nightly ``dev`` job already ran against
Home Assistant dev with the latest ``aioesphomeapi``: every fixture hardcoded the
legacy ``{mac}-{type}-{object_id}`` v1 string, so bumping the dependency never fed
the integration the new ``{mac}/{device_id}/{type}/{name}`` v3 format. The break lived
at the device→integration boundary, which the suite mocked in the old format.

These tests close that blind spot by minting unique_ids through the installed builder
at its *default* version, so the exercised format tracks the library automatically:

  * v1 on the ``2025.2.0`` floor job (aioesphomeapi defaults to version 1),
  * v3 on the ``stable`` / ``dev`` jobs (HA 2026.8+ defaults to version 3),
  * and whatever ships next — with no fixture edit.

If a future release changes the format in a way ``_esphome_object_id`` cannot collapse,
this fails on the nightly ``dev`` job instead of a user's device silently dropping out.
The ``version=2`` cases additionally pin the name-mangling path on every job (the floor
and local runs default to v1, whose object_id is already mangled), which is the exact
transform #355 regressed.
"""

from __future__ import annotations

import pytest
from aioesphomeapi import BinarySensorInfo
from aioesphomeapi import TextSensorInfo
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager._helpers import _esphome_object_id
from custom_components.eppgrid.storage import EPPGridStore

from ._esphome_helpers import installed_esphome_unique_id
from ._esphome_helpers import register_installed_epp_firmware_device

_MAC = "11:22:33:44:55:66"


class TestInstalledFormatObjectId:
    """``_esphome_object_id`` collapses the installed builder's output to the object_id."""

    @pytest.mark.parametrize(
        ("entity_info", "expected"),
        [
            (TextSensorInfo(object_id="firmware_version", name="Firmware Version", key=1), "firmware_version"),
            (BinarySensorInfo(object_id="zone_3_presence", name="Zone 3 Presence", key=2), "zone_3_presence"),
        ],
    )
    def test_default_format_collapses_to_object_id(self, entity_info: object, expected: str) -> None:
        """Default version = whatever the installed library ships (v1 here, v3 on HA 2026.8+)."""
        unique_id = installed_esphome_unique_id(_MAC, entity_info)
        assert _esphome_object_id(unique_id) == expected

    @pytest.mark.parametrize(
        ("entity_info", "expected"),
        [
            (TextSensorInfo(object_id="firmware_version", name="Firmware Version", key=1), "firmware_version"),
            (BinarySensorInfo(object_id="zone_3_presence", name="Zone 3 Presence", key=2), "zone_3_presence"),
        ],
    )
    def test_name_format_collapses_to_object_id(self, entity_info: object, expected: str) -> None:
        """version=2 emits the unmangled ``name`` (portable across all aioesphomeapi
        versions), so the object_id must come from re-mangling the name — the #355 transform."""
        unique_id = installed_esphome_unique_id(_MAC, entity_info, version=2)
        assert _esphome_object_id(unique_id) == expected


class TestDiscoveryInstalledFormat:
    """Discovery and firmware-read work against the installed builder's format end-to-end."""

    @pytest.fixture
    def manager(self, hass: HomeAssistant) -> DeviceManager:
        return DeviceManager(hass, EPPGridStore(hass))

    @pytest.fixture(autouse=True)
    def _stub_on_device_available(self):
        # Discovery now kicks `_on_device_available` for an already-online
        # device (to fetch build flags); stub it so these discovery/firmware-
        # read unit tests don't open a real connection.
        from unittest.mock import AsyncMock
        from unittest.mock import patch

        with patch.object(DeviceManager, "_on_device_available", new=AsyncMock()):
            yield

    # None → installed default (v1 locally / on the floor, v3 on HA 2026.8+);
    # 2 → the unmangled-name path, exercised on every job.
    @pytest.mark.parametrize("uid_version", [None, 2])
    async def test_discover_finds_installed_format_device(
        self, hass: HomeAssistant, manager: DeviceManager, uid_version: int | None
    ) -> None:
        register_installed_epp_firmware_device(
            hass, _MAC, host="192.168.1.60", version="1.6.0", uid_version=uid_version
        )

        await manager.async_discover()

        assert _MAC in manager.devices

    @pytest.mark.parametrize("uid_version", [None, 2])
    async def test_read_firmware_version_installed_format(
        self, hass: HomeAssistant, manager: DeviceManager, uid_version: int | None
    ) -> None:
        register_installed_epp_firmware_device(
            hass, _MAC, host="192.168.1.60", version="1.6.0", uid_version=uid_version
        )
        await manager.async_discover()

        dev = manager.devices[_MAC]
        assert manager.read_firmware_version(dev.device_id) == "1.6.0"
