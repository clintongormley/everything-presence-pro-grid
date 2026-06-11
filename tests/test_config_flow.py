"""Tests for EPP Grid config flow."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import _PANEL_REGISTERED_KEY
from custom_components.eppgrid.config_flow import EPPGridConfigFlow
from custom_components.eppgrid.config_flow import EPPGridOptionsFlow
from custom_components.eppgrid.const import DOMAIN

MODULE_URL = "/eppgrid_static/eppgrid-panel.js?v=deadbeef"


class TestConfigFlow:
    """Tests for EPPGridConfigFlow."""

    async def test_step_user_shows_form(self, hass: HomeAssistant) -> None:
        """First call with no input shows the form."""
        flow = EPPGridConfigFlow()
        flow.hass = hass
        result = await flow.async_step_user(user_input=None)
        assert result["type"] == "form"
        assert result["step_id"] == "user"

    async def test_step_user_creates_entry(self, hass: HomeAssistant) -> None:
        """Submitting form creates a config entry."""
        flow = EPPGridConfigFlow()
        flow.hass = hass
        result = await flow.async_step_user(user_input={})
        assert result["type"] == "create_entry"
        assert result["title"] == "Everything Presence Pro Grid"
        assert result["data"] == {}

    async def test_step_user_singleton(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """Second instance is aborted."""
        flow = EPPGridConfigFlow()
        flow.hass = hass
        result = await flow.async_step_user(user_input=None)
        assert result["type"] == "abort"
        assert result["reason"] == "single_instance_allowed"

    async def test_get_options_flow(self) -> None:
        """async_get_options_flow returns EPPGridOptionsFlow."""
        entry = MagicMock()
        flow = EPPGridConfigFlow.async_get_options_flow(entry)
        assert isinstance(flow, EPPGridOptionsFlow)


def _mock_manager(
    *,
    sidebar_panel: bool = True,
    show_tutorial: bool = True,
) -> MagicMock:
    """Build a DeviceManager mock exposing the public `store` accessor."""
    manager = MagicMock()
    manager.store.sidebar_panel = sidebar_panel
    manager.store.show_room_calibration_tutorial = show_tutorial
    manager.store.async_save = AsyncMock()
    return manager


class TestOptionsFlow:
    """Tests for EPPGridOptionsFlow."""

    async def test_init_aborts_when_not_loaded(self, hass: HomeAssistant) -> None:
        """With the integration not loaded there is no store to edit — abort instead of showing the form."""
        flow = EPPGridOptionsFlow()
        flow.hass = hass
        result = await flow.async_step_init(user_input=None)
        assert result["type"] == "abort"
        assert result["reason"] == "not_loaded"

    async def test_submit_aborts_when_not_loaded(self, hass: HomeAssistant) -> None:
        """Submitting while not loaded aborts instead of silently succeeding; no panel changes happen."""
        flow = EPPGridOptionsFlow()
        flow.hass = hass
        with (
            patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
            patch("custom_components.eppgrid.async_remove_panel") as mock_remove,
        ):
            result = await flow.async_step_init(
                user_input={"sidebar_panel": False, "show_room_calibration_tutorial": False}
            )
        assert result["type"] == "abort"
        assert result["reason"] == "not_loaded"
        mock_panel.assert_not_awaited()
        mock_remove.assert_not_called()

    async def test_init_shows_form_with_manager(self, hass: HomeAssistant) -> None:
        """Form reads sidebar_panel from the manager store."""
        hass.data[DOMAIN] = _mock_manager(sidebar_panel=False)

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        result = await flow.async_step_init(user_input=None)
        assert result["type"] == "form"
        assert result["step_id"] == "init"

    async def test_init_form_schema_includes_tutorial_toggle(self, hass: HomeAssistant) -> None:
        """The options form exposes show_room_calibration_tutorial with the stored value as default."""
        hass.data[DOMAIN] = _mock_manager(show_tutorial=False)

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        result = await flow.async_step_init(user_input=None)
        schema = result["data_schema"].schema
        keys = {str(k): k for k in schema}
        assert "show_room_calibration_tutorial" in keys
        assert keys["show_room_calibration_tutorial"].default() is False

    async def test_init_saves_setting(self, hass: HomeAssistant) -> None:
        """Submitting options saves sidebar_panel and tutorial flag to the store, not entry.options."""
        mock_manager = _mock_manager()
        hass.data[DOMAIN] = mock_manager
        hass.data[_PANEL_REGISTERED_KEY] = True

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        with patch("custom_components.eppgrid.async_remove_panel"):
            result = await flow.async_step_init(
                user_input={"sidebar_panel": False, "show_room_calibration_tutorial": False}
            )
        assert result["type"] == "create_entry"
        # entry.options must stay empty — the store is the single source of truth.
        assert result["data"] == {}
        assert mock_manager.store.sidebar_panel is False
        assert mock_manager.store.show_room_calibration_tutorial is False
        mock_manager.store.async_save.assert_awaited_once()

    async def test_submit_sidebar_on_registers_panel_without_reload(self, hass: HomeAssistant) -> None:
        """Toggling the sidebar on registers the panel directly — no config-entry reload."""
        mock_manager = _mock_manager(sidebar_panel=False)
        hass.data[DOMAIN] = mock_manager

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        with (
            patch(
                "custom_components.eppgrid._register_frontend_resources",
                new_callable=AsyncMock,
                return_value=MODULE_URL,
            ),
            patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
            patch.object(hass.config_entries, "async_reload", new_callable=AsyncMock) as mock_reload,
        ):
            result = await flow.async_step_init(
                user_input={"sidebar_panel": True, "show_room_calibration_tutorial": False}
            )

        assert result["type"] == "create_entry"
        mock_panel.assert_awaited_once_with(hass, MODULE_URL)
        assert hass.data[_PANEL_REGISTERED_KEY] is True
        mock_reload.assert_not_awaited()

    async def test_submit_sidebar_off_removes_panel_without_reload(self, hass: HomeAssistant) -> None:
        """Toggling the sidebar off removes the panel directly — no config-entry reload."""
        mock_manager = _mock_manager(sidebar_panel=True)
        hass.data[DOMAIN] = mock_manager
        hass.data[_PANEL_REGISTERED_KEY] = True

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        with (
            patch("custom_components.eppgrid.async_remove_panel") as mock_remove,
            patch.object(hass.config_entries, "async_reload", new_callable=AsyncMock) as mock_reload,
        ):
            result = await flow.async_step_init(
                user_input={"sidebar_panel": False, "show_room_calibration_tutorial": True}
            )

        assert result["type"] == "create_entry"
        mock_remove.assert_called_once_with(hass, DOMAIN, warn_if_unknown=False)
        assert _PANEL_REGISTERED_KEY not in hass.data
        mock_reload.assert_not_awaited()

    async def test_tutorial_change_saves_and_broadcasts_only(self, hass: HomeAssistant) -> None:
        """A tutorial-flag change saves the store and re-broadcasts; the panel is left alone."""
        mock_manager = _mock_manager()
        hass.data[DOMAIN] = mock_manager
        hass.data[_PANEL_REGISTERED_KEY] = True

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        with (
            patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
            patch("custom_components.eppgrid.async_remove_panel") as mock_remove,
            patch.object(hass.config_entries, "async_reload", new_callable=AsyncMock) as mock_reload,
        ):
            result = await flow.async_step_init(
                user_input={"sidebar_panel": True, "show_room_calibration_tutorial": False}
            )

        assert result["type"] == "create_entry"
        assert mock_manager.store.show_room_calibration_tutorial is False
        mock_manager.store.async_save.assert_awaited_once()
        mock_manager.fire_device_list_changed.assert_called_once()
        mock_panel.assert_not_awaited()  # already registered — left alone
        mock_remove.assert_not_called()
        mock_reload.assert_not_awaited()

    async def test_init_skips_save_and_broadcast_when_unchanged(self, hass: HomeAssistant) -> None:
        """If neither flag changes, the options submit must not save or broadcast."""
        mock_manager = _mock_manager(sidebar_panel=True, show_tutorial=False)
        hass.data[DOMAIN] = mock_manager
        hass.data[_PANEL_REGISTERED_KEY] = True

        flow = EPPGridOptionsFlow()
        flow.hass = hass
        result = await flow.async_step_init(user_input={"sidebar_panel": True, "show_room_calibration_tutorial": False})
        assert result["type"] == "create_entry"
        mock_manager.store.async_save.assert_not_awaited()
        mock_manager.fire_device_list_changed.assert_not_called()
