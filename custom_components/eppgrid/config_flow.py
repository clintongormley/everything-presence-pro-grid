"""Config flow for Everything Presence Pro Grid."""
from __future__ import annotations

from homeassistant.config_entries import ConfigFlow

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
