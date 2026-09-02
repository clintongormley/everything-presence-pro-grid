"""Config flow for Everything Presence Grid."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.config_entries import ConfigFlow
from homeassistant.config_entries import OptionsFlow
from homeassistant.core import callback

from . import async_apply_panel_visibility
from .const import DOMAIN


class EPPGridConfigFlow(ConfigFlow, domain=DOMAIN):  # type: ignore[call-arg]
    """Config flow — single confirm step, singleton integration."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="Everything Presence Grid", data={})

        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Get the options flow."""
        return EPPGridOptionsFlow()


class EPPGridOptionsFlow(OptionsFlow):
    """Options flow for the sidebar-panel and tutorial toggles.

    The EPPGridStore is the single source of truth for both options;
    entry.options is never written with meaningful data (and never read).
    """

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> Any:
        """Handle options."""
        manager = self.hass.data.get(DOMAIN)
        if manager is None:
            # Entry errored or is unloaded — there is no store to read or
            # update, so "succeeding" here would silently drop the changes.
            return self.async_abort(reason="not_loaded")

        store = manager.store
        if user_input is not None:
            new_sidebar_panel = user_input["sidebar_panel"]
            new_show_tutorial = user_input["show_room_calibration_tutorial"]
            if store.sidebar_panel != new_sidebar_panel or store.show_room_calibration_tutorial != new_show_tutorial:
                store.sidebar_panel = new_sidebar_panel
                store.show_room_calibration_tutorial = new_show_tutorial
                await store.async_save()
                manager.fire_device_list_changed()
                # Apply the sidebar toggle directly — no config-entry reload,
                # so ESPHome connections stay up. Idempotent.
                await async_apply_panel_visibility(self.hass, new_sidebar_panel)
            return self.async_create_entry(data={})

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required("sidebar_panel", default=store.sidebar_panel): bool,
                    vol.Required(
                        "show_room_calibration_tutorial",
                        default=store.show_room_calibration_tutorial,
                    ): bool,
                }
            ),
        )
