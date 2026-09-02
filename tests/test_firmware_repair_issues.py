"""Repairs issues for firmware/integration version mismatches.

The eppgrid integration pins FIRMWARE_VERSION and treats it as the source of
truth for which firmware version a given integration release expects. When a
discovered device runs a different version, the integration surfaces it via
HA's Repairs framework so the user sees the mismatch in Settings → Repairs
without having to open the EPP Grid panel.

Two issue types per device, both keyed by MAC:
  - firmware_behind_{mac}: device runs older firmware than integration wants
  - firmware_ahead_{mac}:  device runs newer firmware than integration wants

Either issue is cleared as soon as the version comes back in line. Offline
devices (None version) leave existing issues alone — we just don't have data
to act on.
"""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.const import FIRMWARE_VERSION
from custom_components.eppgrid.device_manager._helpers import _sync_firmware_repair_issue


def _bump(version: str, *, kind: str) -> str:
    # Parse the numeric release with packaging.version.Version — the same
    # library _compare_firmware_version uses — so a pre-release FIRMWARE_VERSION
    # like "1.1.0-rc.1" works (naive int(split(".")) chokes on "0-rc").
    from packaging.version import Version

    major, minor = (*Version(version).release, 0, 0)[:2]
    if kind == "behind":
        # An older release: drop minor by 1 (or major if minor is 0)
        return f"{major}.{max(minor - 1, 0)}.0" if minor > 0 else f"{max(major - 1, 0)}.99.0"
    if kind == "ahead":
        return f"{major}.{minor + 1}.0"
    raise ValueError(kind)


def test_bump_handles_prerelease_firmware_version() -> None:
    """_bump must tolerate a pre-release FIRMWARE_VERSION (e.g. an -rc release).

    Production comparison (_compare_firmware_version) uses
    packaging.version.Version, which parses "1.1.0-rc.1" fine. The test helper
    must too — a firmware-changing pre-release bumps FIRMWARE_VERSION to
    "X.Y.Z-rc.N", and naive int(split(".")) chokes on the "0-rc" segment.
    """
    from packaging.version import Version

    pre = "1.1.0-rc.1"
    assert Version(_bump(pre, kind="behind")) < Version(pre)
    assert Version(_bump(pre, kind="ahead")) > Version(pre)


async def test_creates_behind_issue_when_device_older(hass: HomeAssistant) -> None:
    behind_version = _bump(FIRMWARE_VERSION, kind="behind")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:01", device_name="Living Room", fw_ver=behind_version)

    reg = ir.async_get(hass)
    issue = reg.async_get_issue(DOMAIN, "firmware_behind_AA:BB:CC:DD:EE:01")
    assert issue is not None, "expected firmware_behind issue to be created when device runs older firmware"
    assert issue.translation_key == "firmware_behind"
    assert issue.translation_placeholders == {
        "device_name": "Living Room",
        "current_version": behind_version,
        "required_version": FIRMWARE_VERSION,
    }
    assert issue.severity == ir.IssueSeverity.WARNING
    # firmware_behind issues are fixable via FirmwareUpdateRepairFlow in
    # repairs.py, which triggers an OTA on Submit. See
    # tests/test_firmware_repair_fix_flow.py for the flow's coverage.
    assert issue.is_fixable is True


async def test_creates_ahead_issue_when_device_newer(hass: HomeAssistant) -> None:
    ahead_version = _bump(FIRMWARE_VERSION, kind="ahead")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:02", device_name="Bedroom", fw_ver=ahead_version)

    reg = ir.async_get(hass)
    issue = reg.async_get_issue(DOMAIN, "firmware_ahead_AA:BB:CC:DD:EE:02")
    assert issue is not None, "expected firmware_ahead issue to be created when device runs newer firmware"
    assert issue.translation_key == "firmware_ahead"
    assert issue.translation_placeholders == {
        "device_name": "Bedroom",
        "current_version": ahead_version,
        "required_version": FIRMWARE_VERSION,
    }


async def test_clears_both_issues_when_compatible(hass: HomeAssistant) -> None:
    mac = "AA:BB:CC:DD:EE:03"
    # Pre-create both kinds of issue, simulating a previous mismatch state
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_ahead_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_ahead",
    )

    _sync_firmware_repair_issue(hass, mac=mac, device_name="Office", fw_ver=FIRMWARE_VERSION)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None
    assert reg.async_get_issue(DOMAIN, f"firmware_ahead_{mac}") is None


async def test_offline_device_leaves_existing_issue_alone(hass: HomeAssistant) -> None:
    """When fw_ver is None we have no data to act on — don't change issue state.

    Removing an issue when the device goes offline would mask a real problem
    that needs the user's attention as soon as the device comes back.
    """
    mac = "AA:BB:CC:DD:EE:04"
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )

    _sync_firmware_repair_issue(hass, mac=mac, device_name="Garage", fw_ver=None)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is not None, (
        "offline device should leave existing firmware_behind issue intact"
    )


async def test_switching_from_behind_to_ahead_clears_behind(hass: HomeAssistant) -> None:
    """Repeated calls update — old issue from a previous status is cleared."""
    mac = "AA:BB:CC:DD:EE:05"
    behind_version = _bump(FIRMWARE_VERSION, kind="behind")
    _sync_firmware_repair_issue(hass, mac=mac, device_name="Hallway", fw_ver=behind_version)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is not None

    # User OTAs to a newer-than-integration version
    ahead_version = _bump(FIRMWARE_VERSION, kind="ahead")
    _sync_firmware_repair_issue(hass, mac=mac, device_name="Hallway", fw_ver=ahead_version)

    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None, (
        "firmware_behind issue must be cleared once the device transitions to firmware_ahead"
    )
    assert reg.async_get_issue(DOMAIN, f"firmware_ahead_{mac}") is not None


# ---------------------------------------------------------------------------
# Integration with DeviceManager
# ---------------------------------------------------------------------------


async def test_on_device_available_clears_repair_after_ota_brings_versions_in_line(hass: HomeAssistant) -> None:
    """OTA recovery: pre-existing firmware_behind issue clears once the device
    reconnects on the matching version.

    The OTA path is: device runs old fw → issue raised → user OTAs → device
    reboots and reconnects → firmware_version sensor reports new value →
    `_on_device_available` runs → issue must be cleared.
    """
    from unittest.mock import AsyncMock
    from unittest.mock import patch

    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:11"

    esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.51"}, title="EPP Bedroom")
    esphome_entry.add_to_hass(hass)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Bedroom",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )

    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_bedroom_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )

    # Pre-state: device was on an older version, issue was raised
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )

    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(
        mac=mac,
        name="EPP Bedroom",
        host="192.168.1.51",
        esphome_config_entry_id=esphome_entry.entry_id,
        device_id=device.id,
    )

    # Device comes back online reporting the matching firmware version. Mock
    # _push_config_to_device — it's incidental to what we're testing here, and
    # the real path opens a network socket which the HA test framework blocks.
    hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
    with patch.object(manager, "_push_config_to_device", new=AsyncMock(return_value=True)):
        await manager._on_device_available(mac)

    assert ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None, (
        "firmware_behind issue must be cleared once a device reconnects on the matching firmware"
    )


async def test_repair_issues_cleared_on_device_removal(hass: HomeAssistant) -> None:
    """Removing a device from HA must clear its Repairs issues.

    Without cleanup the firmware_behind_{mac} entry hangs around forever for
    a device that no longer exists in HA — confusing the user and cluttering
    Settings → Repairs.
    """
    from homeassistant.helpers import device_registry as dr
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:20"

    esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.60"}, title="EPP Old")
    esphome_entry.add_to_hass(hass)
    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Old",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )

    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(
        mac=mac,
        name="EPP Old",
        host="192.168.1.60",
        esphome_config_entry_id=esphome_entry.entry_id,
        device_id=device.id,
    )

    # Pre-existing repair from before the user removed the device
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )

    await manager._on_device_removed(mac)

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None
    assert reg.async_get_issue(DOMAIN, f"firmware_ahead_{mac}") is None


async def test_repair_issue_resyncs_on_device_rename(hass: HomeAssistant) -> None:
    """A device rename must update the placeholder name on the Repairs issue.

    `_sync_firmware_repair_issue` re-creates the issue with fresh placeholders
    when called, so the device-registry update path needs to invoke it for
    the issue title/description to track the new name.
    """
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:21"
    behind_version = _bump(FIRMWARE_VERSION, kind="behind")

    esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.61"}, title="Original")
    esphome_entry.add_to_hass(hass)
    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="Original",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )
    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_original_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )
    hass.states.async_set(fw_entry.entity_id, behind_version)

    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(
        mac=mac,
        name="Original",
        host="192.168.1.61",
        esphome_config_entry_id=esphome_entry.entry_id,
        device_id=device.id,
    )
    manager._device_id_to_mac[device.id] = mac

    # Initial sync: issue exists with name "Original"
    from custom_components.eppgrid.device_manager._helpers import _sync_firmware_repair_issue

    _sync_firmware_repair_issue(hass, mac=mac, device_name="Original", fw_ver=behind_version)
    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}")
    assert issue is not None
    assert issue.translation_placeholders is not None
    assert issue.translation_placeholders["device_name"] == "Original"

    # User renames the device in HA
    dev_reg.async_update_device(device.id, name_by_user="Renamed")
    manager.devices[mac].name = "Renamed"

    # Simulate device-registry "update" event being delivered to the manager
    fake_event = type("E", (), {"data": {"action": "update", "device_id": device.id}})()
    manager._on_device_registry_updated(fake_event)
    await hass.async_block_till_done()

    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}")
    assert issue is not None
    assert issue.translation_placeholders["device_name"] == "Renamed", (
        "device-registry update must re-sync the Repairs issue so the title/description tracks the new name"
    )


async def test_late_firmware_version_arrival_re_syncs_repair_issue(hass: HomeAssistant) -> None:
    """firmware_version sensor often arrives after _on_device_available fires.

    On reconnect, ESPHome entities come online one by one in undefined order.
    `_on_device_available` is triggered by the first entity that flips to a
    real state — at that moment the firmware_version sensor may still be
    'unavailable', so `read_firmware_version` returns None and the Repairs
    sync exits early (it's correct to leave issues alone when offline).

    Without a follow-up trigger, the stale Repairs issue persists. Hooking
    state-change events for the firmware_version sensor specifically — when
    it transitions from offline to a real value — fixes the race.
    """
    from unittest.mock import AsyncMock
    from unittest.mock import patch

    from homeassistant.const import STATE_UNAVAILABLE
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:30"

    esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.70"}, title="EPP Late")
    esphome_entry.add_to_hass(hass)
    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Late",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )
    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_late_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )

    # Pre-state: stale firmware_behind issue from before reboot
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"firmware_behind_{mac}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="firmware_behind",
    )

    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(
        mac=mac,
        name="EPP Late",
        host="192.168.1.70",
        esphome_config_entry_id=esphome_entry.entry_id,
        device_id=device.id,
    )
    # The state-change handler also schedules `_on_device_available` for any
    # entity transitioning offline → online; that path opens sockets to push
    # config, which CI's strict-mode HA test framework blocks. Patch it to a
    # no-op for this test — we're only verifying the new firmware_version
    # re-sync hook, not the device-came-online flow.
    with patch.object(manager, "_on_device_available", new=AsyncMock()):
        hass.bus.async_listen("state_changed", manager._on_state_changed)

        # Pre-state on the bus: firmware_version sensor is offline, so any
        # subsequent transition has the right "old_state" baseline.
        hass.states.async_set(fw_entry.entity_id, STATE_UNAVAILABLE)
        await hass.async_block_till_done()

        # Stale issue persists from before reboot — created above. The simulated
        # bug condition is that the initial sync (which would have fired from
        # _on_device_available against an unavailable firmware_version sensor)
        # returned early without clearing it.
        assert ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}") is not None

        # Now the firmware_version sensor catches up and reports the matching version
        hass.states.async_set(fw_entry.entity_id, FIRMWARE_VERSION)
        await hass.async_block_till_done()

    assert ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None, (
        "stale firmware_behind issue must be cleared when the firmware_version "
        "sensor transitions from unavailable to the matching version"
    )


async def test_late_arrival_ignores_empty_string_firmware_version(hass: HomeAssistant) -> None:
    """Empty string is also "no data" — must not be treated as a real version.

    `read_firmware_version()` treats `STATE_UNAVAILABLE`, `STATE_UNKNOWN`,
    `None`, AND empty string as offline. The state-change hook needs to use
    the same definition; otherwise a transition from unavailable → "" would
    pass to `_sync_firmware_repair_issue` with an empty version, which
    `_compare_firmware_version` returns "firmware_behind" for (parse-failure
    fallback) and creates a bogus issue.
    """
    from unittest.mock import AsyncMock
    from unittest.mock import patch

    from homeassistant.const import STATE_UNAVAILABLE
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:31"

    esphome_entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.71"}, title="EPP Empty")
    esphome_entry.add_to_hass(hass)
    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Empty",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )
    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_empty_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )

    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(
        mac=mac,
        name="EPP Empty",
        host="192.168.1.71",
        esphome_config_entry_id=esphome_entry.entry_id,
        device_id=device.id,
    )

    with patch.object(manager, "_on_device_available", new=AsyncMock()):
        hass.bus.async_listen("state_changed", manager._on_state_changed)
        hass.states.async_set(fw_entry.entity_id, STATE_UNAVAILABLE)
        await hass.async_block_till_done()

        # Transition from unavailable → "" (empty string). This must NOT raise
        # a Repairs issue — empty string is not a real firmware version.
        hass.states.async_set(fw_entry.entity_id, "")
        await hass.async_block_till_done()

    reg = ir.async_get(hass)
    assert reg.async_get_issue(DOMAIN, f"firmware_behind_{mac}") is None, (
        "transition to empty string must not create a firmware_behind issue — "
        "empty string is the same 'no data' signal as unavailable, not a real version"
    )


async def test_async_discover_creates_repair_issue_for_outdated_device(hass: HomeAssistant) -> None:
    """async_discover must surface a firmware-version mismatch via Repairs.

    The integration's source-of-truth check needs to fire as soon as a device
    is discovered, not just when the panel happens to make an API call.
    """
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.storage import EPPGridStore

    behind_version = _bump(FIRMWARE_VERSION, kind="behind")
    mac = "AA:BB:CC:DD:EE:10"

    esphome_entry = MockConfigEntry(
        domain="esphome",
        data={"host": "192.168.1.50"},
        title="EPP Living Room",
    )
    esphome_entry.add_to_hass(hass)

    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get_or_create(
        config_entry_id=esphome_entry.entry_id,
        connections={("mac", mac.lower())},
        name="EPP Living Room",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )

    ent_reg = er.async_get(hass)
    fw_entry = ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        unique_id=f"{mac}-sensor-firmware_version",
        suggested_object_id="epp_firmware_version",
        config_entry=esphome_entry,
        device_id=device.id,
    )
    hass.states.async_set(fw_entry.entity_id, behind_version)

    manager = DeviceManager(hass, EPPGridStore(hass))
    # Discovery now kicks `_on_device_available` for an already-online device
    # (build-flags fetch); stub it so this repair-issue test doesn't open a
    # real connection — the issue is raised in the discovery loop itself.
    from unittest.mock import AsyncMock
    from unittest.mock import patch

    with patch.object(manager, "_on_device_available", new=AsyncMock()):
        await manager.async_discover()
        # Discovery fire-and-forgets `_on_device_available` for the already-online
        # device; drain it while still stubbed so no task lingers into teardown.
        await hass.async_block_till_done()

    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"firmware_behind_{mac}")
    assert issue is not None, "discovering a device on older firmware must raise a Repairs issue"
    assert issue.translation_placeholders is not None
    assert issue.translation_placeholders["device_name"] == "EPP Living Room"
    assert issue.translation_placeholders["current_version"] == behind_version
