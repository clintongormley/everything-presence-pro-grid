"""Config flow for Everything Presence Pro Grid."""
from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.config_entries import ConfigFlow
from homeassistant.config_entries import OptionsFlow
from homeassistant.core import callback

from .const import DOMAIN


class EPPGridConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow — single confirm step, singleton integration."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="Everything Presence Pro Grid", data={})

        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Get the options flow."""
        return EPPGridOptionsFlow(config_entry)


class EPPGridOptionsFlow(OptionsFlow):
    """Options flow for toggling sidebar panel."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        self._config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> Any:
        """Handle options."""
        if user_input is not None:
            # Update the store's sidebar_panel setting
            store = self.hass.data.get(DOMAIN)
            if store is not None:
                manager = store  # hass.data[DOMAIN] is the DeviceManager
                manager._store.sidebar_panel = user_input["sidebar_panel"]
                await manager._store.async_save()
            return self.async_create_entry(title="", data=user_input)

        # Get current value from store
        sidebar_panel = True
        manager = self.hass.data.get(DOMAIN)
        if manager is not None:
            sidebar_panel = manager._store.sidebar_panel

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required("sidebar_panel", default=sidebar_panel): bool,
            }),
        )
