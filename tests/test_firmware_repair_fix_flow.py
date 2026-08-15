"""Repairs fix flow that triggers an OTA from the firmware_behind issue.

The Repairs framework lets us mark issues as `is_fixable=True` and provide
a `RepairsFlow` so that clicking Submit in HA Settings → Repairs runs a
defined action. The flow has three user-visible steps:

  1. confirm — show the device name + version delta, ask the user to confirm
  2. progress — kick off the OTA in a background task; show a spinner
     while we poll the device's firmware_version sensor for the matching
     value (the same UX as the ESPHome native Update entity)
  3. finish (success) or failed (with retry) — terminal screens

firmware_ahead issues stay unfixable: the device is on a newer version
than the integration expects, and the resolution is to update the
integration via HACS — which we can't drive from a Repairs flow.
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
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


def _make_flow(hass: HomeAssistant, mac: str = "AA:BB:CC:DD:EE:01") -> Any:
    """Build a flow instance with required attributes wired up.

    The Repairs framework normally sets these via `async_init`; for unit tests
    we just bypass that machinery and assign directly.
    """
    from custom_components.eppgrid.repairs import FirmwareUpdateRepairFlow

    flow = FirmwareUpdateRepairFlow(mac=mac)
    flow.hass = hass
    flow.handler = DOMAIN
    flow.issue_id = f"firmware_behind_{mac}"
    return flow


# ---------------------------------------------------------------------------
# Issue fixability and flow dispatch
# ---------------------------------------------------------------------------


async def test_firmware_behind_issue_is_fixable(hass: HomeAssistant) -> None:
    behind = _bump(FIRMWARE_VERSION, kind="behind")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:40", device_name="Living Room", fw_ver=behind)

    issue = ir.async_get(hass).async_get_issue(DOMAIN, "firmware_behind_AA:BB:CC:DD:EE:40")
    assert issue is not None and issue.is_fixable is True


async def test_firmware_ahead_issue_stays_unfixable(hass: HomeAssistant) -> None:
    ahead = _bump(FIRMWARE_VERSION, kind="ahead")
    _sync_firmware_repair_issue(hass, mac="AA:BB:CC:DD:EE:41", device_name="Bedroom", fw_ver=ahead)

    issue = ir.async_get(hass).async_get_issue(DOMAIN, "firmware_ahead_AA:BB:CC:DD:EE:41")
    assert issue is not None and issue.is_fixable is False


async def test_create_fix_flow_returns_handler_for_firmware_behind(hass: HomeAssistant) -> None:
    from homeassistant.components.repairs import RepairsFlow

    from custom_components.eppgrid.repairs import async_create_fix_flow

    flow = await async_create_fix_flow(hass, "firmware_behind_AA:BB:CC:DD:EE:42", data=None)
    assert isinstance(flow, RepairsFlow)


async def test_create_fix_flow_raises_for_unknown_issue_id(hass: HomeAssistant) -> None:
    from custom_components.eppgrid.repairs import async_create_fix_flow

    with pytest.raises(HomeAssistantError):
        await async_create_fix_flow(hass, "some_other_issue_id", data=None)


# ---------------------------------------------------------------------------
# init / confirm steps — show the dialog (don't auto-submit)
# ---------------------------------------------------------------------------


async def test_init_step_shows_confirm_form_not_immediate_create_entry(hass: HomeAssistant) -> None:
    """The flow's first step must show a confirm form — *not* immediately
    create_entry — so the user gets a chance to read what's about to happen
    and cancel.

    A previous version of this flow returned the form from `step_id="init"`
    with an empty schema, which the Repairs UI auto-confirmed: the user
    clicked the issue and saw "Repaired" instantly with no dialog. The fix
    is to use `step_id="confirm"` (the documented confirm-step convention).
    """
    flow = _make_flow(hass)
    result = await flow.async_step_init(user_input=None)

    assert result["type"] == "form", (
        "init must show a form so the user can confirm — got "
        f"type={result['type']!r}, which would skip the dialog entirely"
    )
    assert result["step_id"] == "confirm", (
        f"step_id must be 'confirm' so the Repairs UI renders a confirm dialog. "
        f"Got step_id={result['step_id']!r}, which the UI may auto-confirm with no dialog."
    )


async def test_confirm_step_passes_through_issue_placeholders(hass: HomeAssistant) -> None:
    """Confirm dialog must show the device name + version delta from the issue
    placeholders so the user knows what they're about to update.
    """
    behind = _bump(FIRMWARE_VERSION, kind="behind")
    mac = "AA:BB:CC:DD:EE:50"
    _sync_firmware_repair_issue(hass, mac=mac, device_name="Bedroom", fw_ver=behind)

    flow = _make_flow(hass, mac=mac)
    result = await flow.async_step_init(user_input=None)

    placeholders = result.get("description_placeholders") or {}
    assert placeholders.get("device_name") == "Bedroom"
    assert placeholders.get("current_version") == behind
    assert placeholders.get("required_version") == FIRMWARE_VERSION


# ---------------------------------------------------------------------------
# progress step — spinner while OTA + version-match-poll runs
# ---------------------------------------------------------------------------


async def _pending_task() -> None:
    """A coroutine that never completes — used so async_create_task gives us
    a Task whose `.done()` stays False during the test.
    """
    await asyncio.Event().wait()


async def test_confirm_submit_transitions_to_progress(hass: HomeAssistant) -> None:
    """Submitting the confirm form must transition to a progress step that
    shows a spinner — same UX as the ESPHome native Update entity. Going
    straight from confirm → create_entry would tell the user "Repaired"
    before the OTA has even finished downloading.
    """
    flow = _make_flow(hass)

    with patch.object(flow, "_run_ota_task", new=_pending_task):
        try:
            result = await flow.async_step_confirm(user_input={})
            assert result["type"] == "progress", (
                f"submitting confirm must show progress, got type={result['type']!r}. "
                "Returning create_entry here would dismiss the dialog before the "
                "OTA has actually completed."
            )
        finally:
            if flow._ota_task is not None:
                flow._ota_task.cancel()


async def test_progress_step_shows_spinner_while_task_runs(hass: HomeAssistant) -> None:
    """While the OTA task hasn't finished, the progress step keeps the
    spinner visible (`type=progress`). Returning `progress_done` here would
    dismiss the spinner before the OTA actually completes."""
    flow = _make_flow(hass)
    flow._ota_task = asyncio.get_running_loop().create_task(_pending_task())
    try:
        result = await flow.async_step_progress(user_input=None)
        assert result["type"] == "progress"
        assert result.get("progress_action") == "installing"
    finally:
        flow._ota_task.cancel()


async def test_progress_step_completes_when_task_done_successfully(hass: HomeAssistant) -> None:
    """When the OTA task finishes cleanly, progress transitions to finish
    (which closes the dialog as Repaired)."""
    flow = _make_flow(hass)
    fut = asyncio.get_running_loop().create_future()
    fut.set_result(None)
    flow._ota_task = fut

    result = await flow.async_step_progress(user_input=None)
    assert result["type"] == "progress_done"
    assert result["step_id"] == "finish"


async def test_progress_step_transitions_to_failed_on_task_exception(hass: HomeAssistant) -> None:
    """An exception in the OTA task must surface to a failed step (with retry)
    rather than bubbling up as an unhandled flow error."""
    flow = _make_flow(hass)
    fut = asyncio.get_running_loop().create_future()
    fut.set_exception(HomeAssistantError("device offline"))
    flow._ota_task = fut

    result = await flow.async_step_progress(user_input=None)
    assert result["type"] == "progress_done"
    assert result["step_id"] == "failed"


async def test_finish_step_creates_entry(hass: HomeAssistant) -> None:
    """The terminal success step closes the flow with create_entry."""
    flow = _make_flow(hass)
    result = await flow.async_step_finish(user_input=None)
    assert result["type"] == "create_entry"


async def test_failed_step_offers_retry(hass: HomeAssistant) -> None:
    """The failed step must show a form (so the user can retry) — not
    abort the flow."""
    flow = _make_flow(hass)
    flow._error_message = "Device offline"

    result = await flow.async_step_failed(user_input=None)
    assert result["type"] == "form"
    assert result["step_id"] == "failed"


async def test_failed_step_retry_resets_and_returns_to_progress(hass: HomeAssistant) -> None:
    """Submitting the failed form must clear state and re-run the OTA task."""
    flow = _make_flow(hass)
    failed = asyncio.get_running_loop().create_future()
    failed.set_exception(HomeAssistantError("first try failed"))
    # Consume the exception so it's not flagged as unretrieved during teardown.
    failed.exception()
    flow._ota_task = failed
    flow._error_message = "first try failed"

    with patch.object(flow, "_run_ota_task", new=_pending_task):
        try:
            result = await flow.async_step_failed(user_input={})

            assert result["type"] == "progress", "retry must kick the flow back into the progress step"
            assert flow._ota_task is not None and not flow._ota_task.done(), (
                "retry must replace the previous (failed) task with a fresh one"
            )
        finally:
            if flow._ota_task is not None and not flow._ota_task.done():
                flow._ota_task.cancel()


# ---------------------------------------------------------------------------
# OTA task — trigger + poll-for-version-match
# ---------------------------------------------------------------------------


async def test_run_ota_task_triggers_then_waits_for_version_match(hass: HomeAssistant) -> None:
    """The background task must trigger the OTA *and then* wait for the device
    to come back on the new firmware (via `async_wait_for_firmware_version`)
    before reporting done. Returning immediately after set_update_manifest would
    tell the user "done" before the device has even finished downloading.
    """
    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:60"
    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(mac=mac, name="X", host="192.168.1.99", device_id="dev1")
    hass.data[DOMAIN] = manager

    trigger_called = AsyncMock()
    wait_called = AsyncMock(return_value=True)

    flow = _make_flow(hass, mac=mac)

    with (
        patch.object(manager, "async_trigger_ota", new=trigger_called),
        patch.object(manager, "async_wait_for_firmware_version", new=wait_called),
    ):
        await flow._run_ota_task()

    trigger_called.assert_awaited_once_with(mac)
    # Must wait for completion, and target the pinned version.
    wait_called.assert_awaited_once()
    assert wait_called.await_args.args[:2] == (mac, FIRMWARE_VERSION)


async def test_progress_step_handles_cancelled_task_as_failed(hass: HomeAssistant) -> None:
    """A cancelled OTA task (HA shutdown, integration reload) must be treated
    as failed — not bubbled up as an unhandled CancelledError.

    `Future.exception()` raises `CancelledError` when called on a cancelled
    future, so the progress step's exception-check branch needs an explicit
    cancelled-state check first.
    """
    flow = _make_flow(hass)
    fut = asyncio.get_running_loop().create_future()
    fut.cancel()
    flow._ota_task = fut

    result = await flow.async_step_progress(user_input=None)
    assert result["type"] == "progress_done"
    assert result["step_id"] == "failed"


async def test_run_ota_task_fails_fast_when_device_unknown(hass: HomeAssistant) -> None:
    """If the device is no longer in `manager.devices` after the trigger,
    the task must fail immediately with a curated error — not delegate to the
    completion wait (which would report a misleading timeout instead).
    """
    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.storage import EPPGridStore

    manager = DeviceManager(hass, EPPGridStore(hass))
    hass.data[DOMAIN] = manager  # no devices registered
    flow = _make_flow(hass, mac="AA:BB:CC:DD:EE:62")

    wait_called = AsyncMock(return_value=True)
    with (
        patch.object(manager, "async_trigger_ota", new=AsyncMock()),
        patch.object(manager, "async_wait_for_firmware_version", new=wait_called),
        pytest.raises(HomeAssistantError) as excinfo,
    ):
        await flow._run_ota_task()

    # Fail-fast: the completion wait never ran, and the error carries the
    # curated device_not_found translation key (not the timeout message).
    wait_called.assert_not_awaited()
    assert excinfo.value.translation_key == "device_not_found"


async def test_run_ota_task_raises_clean_error_when_integration_unloaded(hass: HomeAssistant) -> None:
    """If the integration is unloaded between flow start and task run,
    `_run_ota_task` must surface a HomeAssistantError instead of a raw
    KeyError from `hass.data[DOMAIN]`.
    """
    hass.data.pop(DOMAIN, None)  # Simulate unloaded
    flow = _make_flow(hass)

    with pytest.raises(HomeAssistantError):
        await flow._run_ota_task()


async def test_run_ota_task_times_out_when_firmware_never_matches(hass: HomeAssistant) -> None:
    """If the device never reports the matching version, the task must time
    out so the flow can show the failed step rather than spinning forever.
    """
    from custom_components.eppgrid.device_manager import DeviceManager
    from custom_components.eppgrid.device_manager import ManagedDevice
    from custom_components.eppgrid.storage import EPPGridStore

    mac = "AA:BB:CC:DD:EE:61"
    manager = DeviceManager(hass, EPPGridStore(hass))
    manager.devices[mac] = ManagedDevice(mac=mac, name="X", host="192.168.1.99", device_id="dev1")
    hass.data[DOMAIN] = manager

    flow = _make_flow(hass, mac=mac)

    with (
        patch.object(manager, "async_trigger_ota", new=AsyncMock()),
        # The device never comes back on the new version within the window.
        patch.object(manager, "async_wait_for_firmware_version", new=AsyncMock(return_value=False)),
        pytest.raises(HomeAssistantError),
    ):
        await flow._run_ota_task()


async def test_format_error_localises_via_cached_translation(hass: HomeAssistant) -> None:
    """A HomeAssistantError with translation metadata renders from HA's cached
    translation template (not the English str(exc)), so non-English UIs keep
    their localised OTA-failure copy."""
    from custom_components.eppgrid.repairs import _format_error

    exc = HomeAssistantError(
        "english fallback",
        translation_domain=DOMAIN,
        translation_key="ota_trigger_failed",
        translation_placeholders={"mac": "AA:BB", "error": "boom"},
    )
    template = {f"component.{DOMAIN}.exceptions.ota_trigger_failed.message": "OTA failed for {mac}: {error}"}
    with patch("homeassistant.helpers.translation.async_get_cached_translations", return_value=template):
        assert _format_error(hass, exc) == "OTA failed for AA:BB: boom"


async def test_format_error_falls_back_to_template_on_bad_placeholders(hass: HomeAssistant) -> None:
    """If the template references a placeholder the exception didn't provide,
    return the raw template rather than crashing on the format() KeyError."""
    from custom_components.eppgrid.repairs import _format_error

    exc = HomeAssistantError(
        "english fallback",
        translation_domain=DOMAIN,
        translation_key="ota_trigger_failed",
        translation_placeholders={},
    )
    template = {f"component.{DOMAIN}.exceptions.ota_trigger_failed.message": "OTA failed for {mac}"}
    with patch("homeassistant.helpers.translation.async_get_cached_translations", return_value=template):
        assert _format_error(hass, exc) == "OTA failed for {mac}"


async def test_format_error_uses_str_for_plain_exception(hass: HomeAssistant) -> None:
    """An exception without translation metadata renders via str()."""
    from custom_components.eppgrid.repairs import _format_error

    assert _format_error(hass, HomeAssistantError("plain message")) == "plain message"
