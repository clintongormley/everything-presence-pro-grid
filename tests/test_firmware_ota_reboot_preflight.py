"""Pre-flight reboot before an OTA.

Field finding: on a no-PSRAM ESP32 running the wifi-ble-co2 build, the resident
Bluetooth stack (controller + proxy, which stays loaded even with scanning off)
leaves so little free heap that the HTTPS OTA's mbedTLS handshake can't
allocate — the device fails the download with `ESP_ERR_HTTP_CONNECT` at a
~775-byte heap low-water mark. A manual reboot reliably fixes it (a fresh,
unfragmented heap fits the TLS context), so the integration reboots the device
and waits for it to come back *before* every OTA. The firmware already pauses
BLE scanning during the OTA and restores it after, so the reboot is the only
piece the integration must add.

`async_reboot_and_wait` presses the device's ESPHome **Restart Device** button
(present on in-field firmware, so it works on the old build we're updating
*from*) and waits for the firmware_version sensor to cycle offline → online,
confirming a real reboot completed before we hand the device the OTA manifest.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.common import async_fire_time_changed
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.eppgrid.device_manager import _OTA_SESSION_GRACE_S
from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.storage import EPPGridStore

MAC = "AA:BB:CC:DD:EE:01"


def _setup_device_with_restart_button(hass: HomeAssistant, manager: DeviceManager) -> str:
    """Register an esphome device with a Restart Device button + firmware_version
    sensor, wire it into the manager, and return the restart button's entity_id.
    """
    entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP Bath")
    entry.add_to_hass(hass)

    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        connections={("mac", MAC.lower())},
        name="EPP Bath",
        manufacturer="EverythingSmartTechnology",
        model="Everything Presence Pro",
    )

    ent_reg = er.async_get(hass)
    restart = ent_reg.async_get_or_create(
        "button",
        "esphome",
        f"{MAC}-restart",
        device_id=device.id,
        original_device_class="restart",
        suggested_object_id="epp_bath_restart_device",
    )
    ent_reg.async_get_or_create(
        "sensor",
        "esphome",
        f"{MAC}-firmware_version",
        device_id=device.id,
        suggested_object_id="epp_bath_firmware_version",
    )

    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP Bath", host="192.168.1.50", device_id=device.id)
    return restart.entity_id


@pytest.fixture
def manager(hass: HomeAssistant) -> DeviceManager:
    return DeviceManager(hass, EPPGridStore(hass))


async def test_reboot_and_wait_presses_the_restart_button(hass: HomeAssistant, manager: DeviceManager) -> None:
    """It must press the device's ESPHome Restart Device button (identified by
    device_class=restart), not some other button (e.g. Calibrate CO2)."""
    restart_entity_id = _setup_device_with_restart_button(hass, manager)
    calls = async_mock_service(hass, "button", "press")

    # Device is already back online on the first poll so the wait returns fast.
    with (
        patch.object(manager, "read_firmware_version", side_effect=[None, "1.1.0"]),
        patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
    ):
        await manager.async_reboot_and_wait(MAC)

    assert len(calls) == 1
    assert calls[0].data.get("entity_id") == restart_entity_id


async def test_reboot_and_wait_returns_after_device_cycles_offline_then_online(
    hass: HomeAssistant, manager: DeviceManager
) -> None:
    """The wait must confirm a real reboot: firmware_version goes unavailable
    (None) and then reports again — only then is the device freshly booted with
    the heap headroom the OTA needs."""
    _setup_device_with_restart_button(hass, manager)
    async_mock_service(hass, "button", "press")

    # offline-poll sees the stale value then None; online-poll then sees a value.
    versions = iter(["1.1.0", None, "1.1.0"])
    with (
        patch.object(manager, "read_firmware_version", side_effect=lambda *_a, **_k: next(versions)),
        patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
    ):
        await manager.async_reboot_and_wait(MAC)  # must not raise


async def test_reboot_and_wait_raises_when_device_never_returns(hass: HomeAssistant, manager: DeviceManager) -> None:
    """If the device never reports a version again after the reboot, the wait
    must time out with a HomeAssistantError so the OTA caller can surface a
    clear failure instead of hanging or silently flashing a dead device."""
    _setup_device_with_restart_button(hass, manager)
    async_mock_service(hass, "button", "press")

    # Clock jumps 1000 s per call so any deadline is blown on the next read,
    # regardless of exactly how many times the impl samples the clock.
    clock = iter(i * 1000.0 for i in range(1000))
    with (
        patch.object(manager, "read_firmware_version", return_value=None),
        patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
        patch("custom_components.eppgrid.device_manager.time.monotonic", side_effect=lambda: next(clock)),
        pytest.raises(HomeAssistantError),
    ):
        await manager.async_reboot_and_wait(MAC)


async def test_reboot_and_wait_raises_when_no_restart_button(hass: HomeAssistant, manager: DeviceManager) -> None:
    """A device registered without a Restart Device button can't be rebooted —
    raise so the OTA caller's best-effort wrapper can log it and carry on."""
    entry = MockConfigEntry(domain="esphome", data={"host": "192.168.1.50"}, title="EPP NoButton")
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        connections={("mac", MAC.lower())},
        name="EPP NoButton",
    )
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP NoButton", host="192.168.1.50", device_id=device.id)

    with pytest.raises(HomeAssistantError) as excinfo:
        await manager.async_reboot_and_wait(MAC)
    assert excinfo.value.translation_key == "restart_button_unavailable"


async def test_reboot_and_wait_warns_but_returns_when_offline_never_observed(
    hass: HomeAssistant, manager: DeviceManager, caplog: pytest.LogCaptureFixture
) -> None:
    """A fast reboot can reconnect within a poll interval, so the device may
    never be *seen* offline. That's fine: warn (so a no-op press isn't silently
    treated as a reboot), but still return once it's online — don't raise."""
    _setup_device_with_restart_button(hass, manager)
    async_mock_service(hass, "button", "press")

    # Device is reported online throughout (offline never observed). Clock: the
    # offline poll's deadline is already blown on its first while-check (no read,
    # returns False → warn); the online poll's first check is within deadline.
    clock = iter([0.0, 1000.0, 2000.0, 2001.0, 2002.0])
    with (
        patch.object(manager, "read_firmware_version", return_value="1.1.0"),
        patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
        patch("custom_components.eppgrid.device_manager.time.monotonic", side_effect=lambda: next(clock)),
        caplog.at_level("WARNING"),
    ):
        await manager.async_reboot_and_wait(MAC)  # must not raise

    assert "never went offline" in caplog.text


# ---------------------------------------------------------------------------
# async_trigger_ota pre-flight: always reboot before handing over the manifest
# ---------------------------------------------------------------------------


def _fake_head_session(status: int = 200) -> MagicMock:
    """A fake aiohttp session whose .head() yields ``status`` (manifest check)."""
    resp = MagicMock()
    resp.status = status
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=resp)
    cm.__aexit__ = AsyncMock(return_value=False)
    session = MagicMock()
    session.head = MagicMock(return_value=cm)
    return session


def _mock_ota_conn() -> MagicMock:
    conn = MagicMock()
    conn.async_connect = AsyncMock()
    conn.async_disconnect = AsyncMock()
    conn.async_execute_service = AsyncMock()
    return conn


async def test_trigger_ota_reboots_before_setting_manifest(hass: HomeAssistant, manager: DeviceManager) -> None:
    """The OTA must reboot the device for a fresh heap *before* it hands over the
    update manifest — otherwise the device flashes from its tight, fragmented
    steady-state heap and the TLS download fails.

    The trigger now hands the manifest over a held persistent session (opened by
    `async_open_session`) rather than a one-shot temp connection, but the
    reboot-then-manifest ordering must be unchanged."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    order: list[str] = []
    conn = _mock_ota_conn()
    conn.async_execute_service.side_effect = lambda *a, **k: order.append("manifest")

    async def _reboot(_mac: str) -> None:
        order.append("reboot")

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        patch.object(manager, "async_reboot_and_wait", side_effect=_reboot),
    ):
        await manager.async_trigger_ota(MAC)

    assert order == ["reboot", "manifest"]

    # Flush the held-session release timer so it doesn't linger past the test
    # (real release_session no-ops: nothing is in `_active_connections`).
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
    await hass.async_block_till_done()


async def test_trigger_ota_proceeds_when_reboot_fails(hass: HomeAssistant, manager: DeviceManager) -> None:
    """The pre-flight reboot is best-effort: if it fails (e.g. no restart button,
    or the device didn't come back), the OTA must still be attempted rather than
    blocked — a failed reboot mustn't be strictly worse than the old no-reboot
    behaviour. The manifest still goes over the held session."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        patch.object(
            manager,
            "async_reboot_and_wait",
            side_effect=HomeAssistantError("device did not come back"),
        ) as reboot_mock,
    ):
        await manager.async_trigger_ota(MAC)

    reboot_mock.assert_awaited_once()
    conn.async_execute_service.assert_awaited_once()
    name, _payload = conn.async_execute_service.await_args.args
    assert name == "set_update_manifest"

    # Flush the held-session release timer so it doesn't linger past the test.
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
    await hass.async_block_till_done()


async def test_trigger_ota_holds_persistent_session_for_progress(hass: HomeAssistant, manager: DeviceManager) -> None:
    """The trigger must open (or reuse) a PERSISTENT session and hand the
    manifest over THAT session, then HOLD it open so the imminent
    `subscribe_ota_progress` can reuse it and stream 0->100%. Progress can only
    stream over a session that already existed when the download started — the
    device refuses new API connections mid-download. So: `async_open_session`
    is used (not a temp connection), and our reference is NOT released
    synchronously at trigger time (the session is held for the handoff)."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)) as open_mock,
        patch.object(manager, "release_session") as release_mock,
        patch.object(manager, "_temp_connection") as temp_mock,
    ):
        await manager.async_trigger_ota(MAC)

        open_mock.assert_awaited_once_with(MAC)
        conn.async_execute_service.assert_awaited_once()
        name, _payload = conn.async_execute_service.await_args.args
        assert name == "set_update_manifest"
        release_mock.assert_not_called()  # session held for the progress handoff
        temp_mock.assert_not_called()  # never fell back to a temp connection

        # Flush the held-session release timer so it doesn't linger past the test.
        async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
        await hass.async_block_till_done()


async def test_trigger_ota_releases_held_session_after_grace(hass: HomeAssistant, manager: DeviceManager) -> None:
    """The reference the trigger took on the held session is released after the
    grace window. If `subscribe_ota_progress` attached in the meantime it holds
    its own reference and the session survives the download; if none arrived,
    this drop takes the count to zero and closes it — the handoff safety net."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        patch.object(manager, "release_session") as release_mock,
    ):
        await manager.async_trigger_ota(MAC)
        release_mock.assert_not_called()  # not released synchronously — held

        async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
        await hass.async_block_till_done()

        release_mock.assert_called_once_with(MAC, conn)


async def test_trigger_ota_falls_back_to_temp_conn_when_no_session(hass: HomeAssistant, manager: DeviceManager) -> None:
    """When `async_open_session` returns None — HA has the device marked
    unavailable (the post-reboot reconnect can briefly lag the entity state) —
    the trigger must still land, over a short-lived connection, so the update
    proceeds. That device then rides the sessionless outcome watch (no
    incremental bar, but success/failure is still reported)."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    temp_conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=None)),
        # The temp-conn fallback constructs a DeviceConnection directly.
        patch("custom_components.eppgrid.device_manager.DeviceConnection", return_value=temp_conn),
    ):
        await manager.async_trigger_ota(MAC)

    temp_conn.async_execute_service.assert_awaited_once()
    name, _payload = temp_conn.async_execute_service.await_args.args
    assert name == "set_update_manifest"


async def test_trigger_ota_releases_held_session_on_trigger_failure(
    hass: HomeAssistant, manager: DeviceManager
) -> None:
    """If the manifest hand-off over the held session raises, the reference the
    trigger took must be released (not leaked) before the error propagates —
    otherwise a failed trigger strands an open session reference nothing drops."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    conn = _mock_ota_conn()
    conn.async_execute_service.side_effect = RuntimeError("boom")

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        patch.object(manager, "release_session") as release_mock,
        pytest.raises(HomeAssistantError),
    ):
        await manager.async_trigger_ota(MAC)

    release_mock.assert_called_once_with(MAC, conn)


async def test_trigger_ota_releases_held_session_on_cancellation(hass: HomeAssistant, manager: DeviceManager) -> None:
    """If the trigger is cancelled while handing over the manifest (unload /
    shutdown / websocket drop), the reference the trigger took must still be
    released before `CancelledError` propagates. `CancelledError` derives from
    `BaseException`, so it bypasses the `except HomeAssistantError` / `except
    Exception` handlers — without an unconditional release it would strand the
    held session's reference."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    conn = _mock_ota_conn()
    conn.async_execute_service.side_effect = asyncio.CancelledError()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        patch.object(manager, "release_session") as release_mock,
        pytest.raises(asyncio.CancelledError),
    ):
        await manager.async_trigger_ota(MAC)

    release_mock.assert_called_once_with(MAC, conn)


async def test_schedule_ota_session_release_skips_while_stopping(hass: HomeAssistant, manager: DeviceManager) -> None:
    """`_schedule_ota_session_release` must NOT arm a timer once shutdown has
    begun. `async_stop` (which sets `_stopping`) has already cancelled and
    cleared the release timers and owns the refcounts + disconnects, so a timer
    armed after that would outlive the config entry (HA 2026.4+ fails the test on
    a lingering timer). This can happen if unload starts while `async_trigger_ota`
    is mid-hand-off and then resumes uncancelled. The held connection is closed by
    `async_stop`'s teardown, so skipping the timer strands nothing."""
    conn = _mock_ota_conn()
    manager._stopping = True

    manager._schedule_ota_session_release(MAC, conn)

    assert MAC not in manager._ota_session_releases  # no timer armed while stopping


async def test_trigger_ota_marks_flash_expected_when_device_on_old_version(
    hass: HomeAssistant, manager: DeviceManager
) -> None:
    """The trigger must record that a REAL flash (old->target) is in flight when
    the device is on an OLD firmware version at trigger time. `subscribe_ota_progress`
    consumes this (one-shot) to prime the reboot-proof outcome watch for a
    held-session device whose live `_on_state` never fires."""
    from custom_components.eppgrid.const import FIRMWARE_VERSION

    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        # Device is on an OLD version (just rebooted, not yet flashed) — a flash
        # WILL change it, so the trigger must mark it.
        patch.object(manager, "read_firmware_version", return_value="1.7.0"),
    ):
        assert FIRMWARE_VERSION != "1.7.0"  # sanity: the fixture version really is old
        await manager.async_trigger_ota(MAC)

    # Consumed one-shot: True the first time, False on the re-subscribe.
    assert manager.take_ota_flash_expected(MAC) is True
    assert manager.take_ota_flash_expected(MAC) is False

    # Flush the held-session release timer so it doesn't linger past the test.
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
    await hass.async_block_till_done()


async def test_trigger_ota_does_not_mark_flash_expected_when_version_unknown(
    hass: HomeAssistant, manager: DeviceManager
) -> None:
    """If the device's firmware version can't be read at trigger time (None —
    offline / unavailable / no device_id), the trigger must NOT mark flash-expected:
    an unknown state must never let the held-session path fabricate a success for a
    device that may already be current. Such a device is offline anyway, so it takes
    the sessionless path (which primes on its own); the flag is only for the
    held-session path, where the version is KNOWN to differ from the target."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    manager._ota_flash_expected.add(MAC)  # pre-seed to prove an unknown version clears it
    conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        # Version can't be read (device offline / unavailable at trigger time).
        patch.object(manager, "read_firmware_version", return_value=None),
    ):
        await manager.async_trigger_ota(MAC)

    assert manager.take_ota_flash_expected(MAC) is False

    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
    await hass.async_block_till_done()


async def test_trigger_ota_clears_flash_expected_when_device_already_on_target(
    hass: HomeAssistant, manager: DeviceManager
) -> None:
    """A device ALREADY on the target version at trigger time is not flashing —
    no `old->target` change will happen. The trigger must NOT mark it (and must
    DISCARD any stale flag), so the outcome watch can't fabricate a success for a
    device that never flashed. Pre-seed a stale flag to prove it's cleared."""
    from custom_components.eppgrid.const import FIRMWARE_VERSION

    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    manager._build_flags[MAC] = {"ethernet_enabled": False}
    manager._ota_flash_expected.add(MAC)  # stale flag from a prior trigger
    conn = _mock_ota_conn()

    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=conn)),
        # Device is already on the target version — no flash expected.
        patch.object(manager, "read_firmware_version", return_value=FIRMWARE_VERSION),
    ):
        await manager.async_trigger_ota(MAC)

    assert manager.take_ota_flash_expected(MAC) is False

    # Flush the held-session release timer so it doesn't linger past the test.
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=_OTA_SESSION_GRACE_S + 1))
    await hass.async_block_till_done()


class TestWaitForFirmwareVersion:
    """`async_wait_for_firmware_version` is the OTA watcher's reboot-proof
    completion path: it confirms an update by watching the durable
    firmware_version entity return on the target version across the flash
    reboot (the same signal a page refresh reads), not a per-connection
    state subscription that the reboot tears down.
    """

    async def test_returns_true_once_version_reaches_target(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        _setup_device_with_restart_button(hass, manager)
        # Device is still on the old version, then comes back on the target.
        versions = iter(["1.7.0", "9.9.9"])
        with (
            patch.object(manager, "read_firmware_version", side_effect=lambda *_a, **_k: next(versions)),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
        ):
            reached = await manager.async_wait_for_firmware_version(MAC, "9.9.9", 300)
        assert reached is True

    async def test_returns_false_on_timeout(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        _setup_device_with_restart_button(hass, manager)
        clock = iter(i * 1000.0 for i in range(1000))
        with (
            patch.object(manager, "read_firmware_version", return_value="1.7.0"),
            patch("custom_components.eppgrid.device_manager.asyncio.sleep", new=AsyncMock()),
            patch("custom_components.eppgrid.device_manager.time.monotonic", side_effect=lambda: next(clock)),
        ):
            reached = await manager.async_wait_for_firmware_version(MAC, "9.9.9", 300)
        assert reached is False

    async def test_returns_false_when_device_unknown(self, hass: HomeAssistant, manager: DeviceManager) -> None:
        # No device registered for this mac — nothing to watch.
        reached = await manager.async_wait_for_firmware_version("00:00:00:00:00:00", "9.9.9", 300)
        assert reached is False
