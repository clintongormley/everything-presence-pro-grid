"""Repairs fix flow for firmware-version mismatch issues.

When `_sync_firmware_repair_issue` raises a `firmware_behind_{mac}` issue,
HA shows a Submit button on the Repairs UI. Clicking it walks the user
through this flow:

  1. confirm  — show device name + version delta, ask the user to confirm
  2. progress — kick off OTA + wait for the device to come back on the
                matching firmware version. Spinner UX matches the ESPHome
                native Update entity.
  3. finish   — success: close the dialog as Repaired
     failed   — error: keep the dialog open with a retry button

`firmware_ahead_{mac}` issues are intentionally not fixable from here:
the resolution is to update the integration via HACS, which we have no
way to drive from a Repairs flow.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import voluptuous as vol
from homeassistant import data_entry_flow
from homeassistant.components.repairs import RepairsFlow
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN
from .const import FIRMWARE_VERSION

_LOGGER = logging.getLogger(__name__)

_FIRMWARE_BEHIND_PREFIX = "firmware_behind_"

# How long to wait for the device to come back on the new firmware before we
# give up and offer the user a retry. A successful OTA on typical WiFi is
# 1-3 min (download + reboot + reconnect + sensor refresh); 3 min keeps a
# small safety margin while bailing fast on real failures so the user can
# retry without the dialog feeling stuck. False-fail on a slow OTA is
# recoverable: the firmware_version sensor eventually updates and the
# Repairs issue auto-clears via _on_state_changed, and the failed step
# offers a retry button anyway.
_OTA_COMPLETION_TIMEOUT_S = 3 * 60

# Poll interval while waiting for the firmware_version sensor to flip to the
# new value.
_OTA_POLL_INTERVAL_S = 2


def _format_error(hass: HomeAssistant, exc: BaseException) -> str:
    """Render a user-facing error string from an exception, preserving i18n.

    HomeAssistantError instances raised by `DeviceManager.async_trigger_ota`
    carry `translation_domain` + `translation_key` + `translation_placeholders`
    so callers can localise the message. `str(exc)` would drop that metadata
    and show the English fallback in non-English UIs, regressing the existing
    i18n behaviour. Look the translated template up via HA's cached
    translations and format it with the placeholders.
    """
    if isinstance(exc, HomeAssistantError) and exc.translation_key:
        from homeassistant.helpers.translation import async_get_cached_translations

        domain = exc.translation_domain or DOMAIN
        translations = async_get_cached_translations(hass, hass.config.language, "exceptions", integrations=[domain])
        template = translations.get(f"component.{domain}.exceptions.{exc.translation_key}.message")
        if template:
            placeholders = exc.translation_placeholders or {}
            try:
                return template.format(**placeholders)
            except (KeyError, IndexError):
                return template
    return str(exc)


class FirmwareUpdateRepairFlow(RepairsFlow):
    """Confirm + trigger an OTA update for a device with outdated firmware."""

    def __init__(self, mac: str) -> None:
        """Initialize the flow."""
        super().__init__()
        self._mac = mac
        self._ota_task: asyncio.Future[None] | None = None
        self._error_message: str | None = None

    # -- entry / dispatch ----------------------------------------------------

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> data_entry_flow.FlowResult:
        """Entry point — delegate to the confirm step.

        The confirm step lives at `step_id="confirm"` (not `init`) because
        the Repairs UI auto-confirms a form on the init step with an empty
        schema, skipping the dialog entirely.
        """
        return await self.async_step_confirm(user_input=None)

    # -- step: confirm -------------------------------------------------------

    async def async_step_confirm(self, user_input: dict[str, Any] | None = None) -> data_entry_flow.FlowResult:
        """Show the confirm dialog. On submit, kick off OTA + show progress."""
        if user_input is not None:
            self._start_ota_task()
            return await self.async_step_progress(user_input=None)

        return self.async_show_form(
            step_id="confirm",
            data_schema=vol.Schema({}),
            description_placeholders=self._issue_placeholders(),
        )

    # -- step: progress ------------------------------------------------------

    async def async_step_progress(self, user_input: dict[str, Any] | None = None) -> data_entry_flow.FlowResult:
        """Show a spinner while the OTA task runs; transition when it ends."""
        if self._ota_task is None:
            # Defensive: should never be None when we reach this step from
            # confirm, but if Repairs UI re-enters the step somehow we want
            # to recover by re-starting the task rather than crashing.
            self._start_ota_task()
            assert self._ota_task is not None

        if not self._ota_task.done():
            return self.async_show_progress(
                step_id="progress",
                progress_action="installing",
                progress_task=self._ota_task,
                description_placeholders=self._issue_placeholders(),
            )

        # Task done — branch on outcome. Check cancelled() before calling
        # exception() because Future.exception() raises CancelledError on a
        # cancelled future rather than returning the cancellation as an exc.
        # Cancellation can happen on integration reload or HA shutdown.
        if self._ota_task.cancelled():
            self._error_message = "Update was cancelled (integration reload or shutdown)."
            _LOGGER.warning("OTA fix flow for %s cancelled", self._mac)
            return self.async_show_progress_done(next_step_id="failed")

        exc = self._ota_task.exception()
        if exc is not None:
            self._error_message = _format_error(self.hass, exc)
            _LOGGER.warning("OTA fix flow for %s failed: %s", self._mac, exc)
            return self.async_show_progress_done(next_step_id="failed")
        return self.async_show_progress_done(next_step_id="finish")

    # -- step: finish (success terminal) -------------------------------------

    async def async_step_finish(self, user_input: dict[str, Any] | None = None) -> data_entry_flow.FlowResult:
        """Successful completion — close the dialog as Repaired."""
        return self.async_create_entry(data={})

    # -- step: failed (error terminal with retry) ----------------------------

    async def async_step_failed(self, user_input: dict[str, Any] | None = None) -> data_entry_flow.FlowResult:
        """Show the error and offer a retry. Submitting kicks the OTA again."""
        if user_input is not None:
            # Retry — clear stale state and re-run from progress
            self._ota_task = None
            self._error_message = None
            self._start_ota_task()
            return await self.async_step_progress(user_input=None)

        placeholders = self._issue_placeholders()
        placeholders["error"] = self._error_message or ""
        return self.async_show_form(
            step_id="failed",
            data_schema=vol.Schema({}),
            description_placeholders=placeholders,
        )

    # -- helpers -------------------------------------------------------------

    def _start_ota_task(self) -> None:
        """Kick off the background OTA + version-match-poll task."""
        self._ota_task = self.hass.async_create_task(self._run_ota_task())

    async def _run_ota_task(self) -> None:
        """Trigger the OTA, then poll firmware_version until it matches.

        Returning before the device reports the matching version would tell
        the user "Repaired" while the OTA was still flashing — same problem
        as the original implementation. Polling matches the UX of the
        ESPHome Update entity, which only flips state once flashing
        completes and the device reconnects.

        Raises HomeAssistantError on trigger failure or on timeout.
        """
        manager = self.hass.data.get(DOMAIN)
        if manager is None:
            raise HomeAssistantError("EPP Grid integration not loaded")

        # `async_trigger_ota` raises HomeAssistantError itself on every
        # failure path (unknown device, no host/flags/variant, service call).
        await manager.async_trigger_ota(self._mac)

        dev = manager.devices.get(self._mac)
        if dev is None:
            # The device vanished between trigger and poll (removed/re-added).
            # Fail fast — polling read_firmware_version(None) would burn the
            # full completion timeout and then report a misleading timeout.
            raise HomeAssistantError(
                f"Device {self._mac} is no longer known to the integration",
                translation_domain=DOMAIN,
                translation_key="device_not_found",
            )
        deadline = time.monotonic() + _OTA_COMPLETION_TIMEOUT_S
        while time.monotonic() < deadline:
            fw_ver = manager.read_firmware_version(dev.device_id)
            if fw_ver == FIRMWARE_VERSION:
                return
            await asyncio.sleep(_OTA_POLL_INTERVAL_S)

        raise HomeAssistantError(
            f"OTA started but {self._mac} did not come back on firmware "
            f"{FIRMWARE_VERSION} within {_OTA_COMPLETION_TIMEOUT_S}s — check "
            "the device manually."
        )

    def _issue_placeholders(self) -> dict[str, str]:
        """Return the original issue's translation placeholders.

        Used by both the confirm and progress dialogs so the text refers to
        the same device + version delta the user saw on the Repairs entry.
        """
        issue_registry = ir.async_get(self.hass)
        if issue := issue_registry.async_get_issue(DOMAIN, self.issue_id):
            return dict(issue.translation_placeholders or {})
        return {}


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    """Create the appropriate fix flow for a given issue id."""
    if issue_id.startswith(_FIRMWARE_BEHIND_PREFIX):
        mac = issue_id.removeprefix(_FIRMWARE_BEHIND_PREFIX)
        return FirmwareUpdateRepairFlow(mac=mac)
    raise HomeAssistantError(f"No fix flow registered for issue id: {issue_id}")
