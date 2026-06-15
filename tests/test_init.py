"""Tests for integration setup and unload."""

from __future__ import annotations

import json
import os
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid import _PANEL_REGISTERED_KEY
from custom_components.eppgrid import async_apply_panel_visibility
from custom_components.eppgrid import async_setup_entry
from custom_components.eppgrid import async_unload_entry
from custom_components.eppgrid.const import DOMAIN


@pytest.fixture(autouse=True)
def _mock_platform_forward():
    """Stub the binary_sensor platform forward/unload.

    These tests drive async_setup_entry/async_unload_entry directly (not via
    hass.config_entries.async_setup), so the entry never reaches the LOADED
    state that async_forward_entry_setups requires. The device-groups feature
    added that forward; patch it here so the setup-orchestration assertions
    below stay focused on __init__ wiring, not platform loading.
    """
    with (
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
            new_callable=AsyncMock,
            return_value=True,
        ),
    ):
        yield


async def test_setup_entry_registers_manager(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Setup creates a DeviceManager and stores it in hass.data."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        result = await async_setup_entry(hass, config_entry)

    assert result is True
    assert DOMAIN in hass.data
    mock_dm.async_start.assert_awaited_once()


async def test_setup_entry_registers_frontend_resources_always(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Frontend resources are registered even when sidebar_panel is disabled so Lovelace cards work on dashboards."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ) as mock_resources,
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
    ):
        mock_store = mock_store_cls.return_value
        mock_store.async_load = AsyncMock()
        mock_store.sidebar_panel = False
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_resources.assert_awaited_once_with(hass)
    mock_panel.assert_not_awaited()


async def test_setup_entry_registers_panel_when_enabled(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Panel is registered with the versioned module URL when sidebar_panel is True."""
    if hass.http is None:
        hass.http = MagicMock()

    module_url = "/eppgrid_static/eppgrid-panel.js?v=deadbeef"
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources", new_callable=AsyncMock, return_value=module_url
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_panel.assert_awaited_once_with(hass, module_url)


async def test_setup_entry_skips_panel_when_disabled(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Panel is not registered when sidebar_panel is False."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
    ):
        mock_store = mock_store_cls.return_value
        mock_store.async_load = AsyncMock()
        mock_store.sidebar_panel = False
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        await async_setup_entry(hass, config_entry)

    mock_panel.assert_not_awaited()


async def test_unload_entry_stops_manager(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload stops the DeviceManager and removes from hass.data."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
            new_callable=AsyncMock,
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

        result = await async_unload_entry(hass, config_entry)
    assert result is True
    assert DOMAIN not in hass.data
    mock_dm.async_stop.assert_awaited_once()


async def test_unload_entry_no_manager(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload succeeds even if no manager was stored."""
    with patch(
        "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
        new_callable=AsyncMock,
    ):
        result = await async_unload_entry(hass, config_entry)
    assert result is True


async def test_unload_entry_returns_false_when_platform_unload_fails(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """If the binary_sensor platform fails to unload, async_unload_entry must
    return False and leave the manager published, so HA keeps the entry loaded
    rather than orphaning entities/devices."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
            new_callable=AsyncMock,
            return_value=False,
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

        result = await async_unload_entry(hass, config_entry)

    assert result is False
    assert DOMAIN in hass.data
    mock_dm.async_stop.assert_not_awaited()


async def test_options_update_does_not_reload_entry(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Options changes are applied directly by the options flow — no update listener, no reload.

    A reload would tear down every ESPHome connection just to toggle the
    sidebar panel or the tutorial flag.
    """
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch.object(hass.config_entries, "async_reload", new_callable=AsyncMock) as mock_reload,
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

        hass.config_entries.async_update_entry(config_entry, options={"sidebar_panel": False})
        await hass.async_block_till_done()

    assert not config_entry.update_listeners
    mock_reload.assert_not_awaited()


async def test_apply_panel_visibility_registers_panel_once(hass: HomeAssistant) -> None:
    """async_apply_panel_visibility(True) registers the panel and is idempotent."""
    module_url = "/eppgrid_static/eppgrid-panel.js?v=deadbeef"
    with (
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value=module_url,
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
    ):
        await async_apply_panel_visibility(hass, True)
        await async_apply_panel_visibility(hass, True)

    mock_panel.assert_awaited_once_with(hass, module_url)
    assert hass.data[_PANEL_REGISTERED_KEY] is True


async def test_apply_panel_visibility_removes_registered_panel(hass: HomeAssistant) -> None:
    """async_apply_panel_visibility(False) removes a registered panel and clears the flag."""
    hass.data[_PANEL_REGISTERED_KEY] = True
    with patch("custom_components.eppgrid.async_remove_panel") as mock_remove:
        await async_apply_panel_visibility(hass, False)

    mock_remove.assert_called_once_with(hass, DOMAIN, warn_if_unknown=False)
    assert _PANEL_REGISTERED_KEY not in hass.data


async def test_apply_panel_visibility_noop_when_not_registered(hass: HomeAssistant) -> None:
    """async_apply_panel_visibility(False) is a no-op when no panel was registered."""
    with patch("custom_components.eppgrid.async_remove_panel") as mock_remove:
        await async_apply_panel_visibility(hass, False)

    mock_remove.assert_not_called()


async def test_unload_entry_removes_panel(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload removes the sidebar panel."""
    if hass.http is None:
        hass.http = MagicMock()

    module_url = "/eppgrid_static/eppgrid-panel.js?v=deadbeef"
    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value=module_url,
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch("custom_components.eppgrid.async_remove_panel") as mock_remove_panel,
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
            new_callable=AsyncMock,
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

        await async_unload_entry(hass, config_entry)

    mock_remove_panel.assert_called_once()


async def test_unload_entry_skips_panel_when_not_registered(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """Unload does not call async_remove_panel when sidebar panel was disabled."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch("custom_components.eppgrid.EPPGridStore") as mock_store_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch("custom_components.eppgrid.async_remove_panel") as mock_remove_panel,
        patch(
            "homeassistant.config_entries.ConfigEntries.async_forward_entry_setups",
            new_callable=AsyncMock,
        ),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
            new_callable=AsyncMock,
        ),
    ):
        mock_store = mock_store_cls.return_value
        mock_store.async_load = AsyncMock()
        mock_store.sidebar_panel = False
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()
        await async_setup_entry(hass, config_entry)

        await async_unload_entry(hass, config_entry)

    mock_remove_panel.assert_not_called()


async def test_register_panel(hass: HomeAssistant) -> None:
    """_register_panel registers the panel with the given module URL."""
    from custom_components.eppgrid import _register_panel

    module_url = "/eppgrid_static/eppgrid-panel.js?v=abcd1234"
    with patch("custom_components.eppgrid.panel_custom.async_register_panel", new_callable=AsyncMock) as mock_panel:
        await _register_panel(hass, module_url)

    mock_panel.assert_awaited_once()
    call_kwargs = mock_panel.call_args[1]
    assert call_kwargs["module_url"] == module_url
    # Panel is admin-only: HA hides the sidebar entry for non-admin users and
    # rejects direct URL access. The integration's mutating WS commands are
    # already gated by @websocket_api.require_admin (PR #174); locking the
    # panel down keeps the UX consistent — non-admins don't see a panel they
    # can't usefully use.
    assert call_kwargs["require_admin"] is True


async def test_register_frontend_resources_registers_static_path(hass: HomeAssistant) -> None:
    """_register_frontend_resources registers a content-hashed path and returns its URL."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with patch("custom_components.eppgrid._hash_file", return_value="abcd1234"):
        module_url = await _register_frontend_resources(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    # The hash lives in the PATH (not a ?v= query) so the companion app's
    # service worker, which ignores query strings, can't serve a stale copy.
    assert module_url == "/eppgrid_static/abcd1234/eppgrid-panel.js"
    configs = hass.http.async_register_static_paths.call_args.args[0]
    assert any(c.url_path == "/eppgrid_static/abcd1234" for c in configs)


async def test_register_frontend_resources_hash_oserror(hass: HomeAssistant) -> None:
    """_register_frontend_resources falls back to '0' hash on OSError."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    async def executor_raises(func, *args):
        raise OSError("not found")

    with patch.object(hass, "async_add_executor_job", side_effect=executor_raises):
        module_url = await _register_frontend_resources(hass)

    assert module_url == "/eppgrid_static/0/eppgrid-panel.js"


async def test_register_frontend_resources_registers_static_path_once(hass: HomeAssistant) -> None:
    """Static path registers once across reload; the URL is recomputed each call."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with patch("custom_components.eppgrid._hash_file", return_value="abcd1234"):
        first = await _register_frontend_resources(hass)
        second = await _register_frontend_resources(hass)

    assert first == second == "/eppgrid_static/abcd1234/eppgrid-panel.js"
    hass.http.async_register_static_paths.assert_awaited_once()


async def test_register_frontend_resources_recomputes_hash_on_reload(hass: HomeAssistant) -> None:
    """If the bundle changes between calls, the new hash is reflected in the returned URL."""
    from custom_components.eppgrid import _register_frontend_resources

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    hashes = iter(["abcd1234", "ef567890"])
    with patch("custom_components.eppgrid._hash_file", side_effect=lambda _p: next(hashes)):
        first = await _register_frontend_resources(hass)
        second = await _register_frontend_resources(hass)

    assert first == "/eppgrid_static/abcd1234/eppgrid-panel.js"
    assert second == "/eppgrid_static/ef567890/eppgrid-panel.js"
    # A new bundle hash → a new path registered (one per distinct hash).
    assert hass.http.async_register_static_paths.await_count == 2


async def test_setup_entry_unwinds_on_start_failure_and_allows_retry(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """A failing manager.async_start leaves no panel, no hass.data entry, and a stopped manager.

    HA never calls async_unload_entry for a failed setup, so anything left
    behind (most critically the sidebar panel) would break every retry with
    panel_custom's "Overwriting panel" ValueError until restart.
    """
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock) as mock_panel,
        patch("custom_components.eppgrid.async_remove_panel") as mock_remove_panel,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock(side_effect=RuntimeError("device exploded"))
        mock_dm.async_stop = AsyncMock()

        with pytest.raises(RuntimeError):
            await async_setup_entry(hass, config_entry)

        # Nothing half-set-up may leak: the panel was never registered (so
        # nothing to remove either), the manager is not published, and its
        # listeners were torn down again.
        mock_panel.assert_not_awaited()
        mock_remove_panel.assert_not_called()
        assert DOMAIN not in hass.data
        assert _PANEL_REGISTERED_KEY not in hass.data
        mock_dm.async_stop.assert_awaited_once()

        # A retry must succeed — no stale panel registration blocking it.
        mock_dm.async_start = AsyncMock()
        assert await async_setup_entry(hass, config_entry) is True
        assert hass.data[DOMAIN] is mock_dm
        mock_panel.assert_awaited_once()


async def test_setup_unwind_stop_failure_does_not_mask_original_error(
    hass: HomeAssistant, config_entry: MockConfigEntry, caplog
) -> None:
    """If the unwind's manager.async_stop itself raises, the ORIGINAL setup
    error must still propagate — a raising cleanup would otherwise replace
    e.g. ConfigEntryNotReady (retry later) with the cleanup's exception
    (permanent SETUP_ERROR). The cleanup error must be logged, not swallowed."""
    import logging

    from homeassistant.exceptions import ConfigEntryNotReady

    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        caplog.at_level(logging.ERROR, logger="custom_components.eppgrid"),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock(side_effect=ConfigEntryNotReady("device offline"))
        mock_dm.async_stop = AsyncMock(side_effect=RuntimeError("stop exploded"))

        with pytest.raises(ConfigEntryNotReady):
            await async_setup_entry(hass, config_entry)

        mock_dm.async_stop.assert_awaited_once()
    assert DOMAIN not in hass.data
    assert "manager.async_stop failed during setup unwind" in caplog.text


async def test_setup_unwind_panel_visibility_failure_does_not_mask_original_error(
    hass: HomeAssistant, config_entry: MockConfigEntry, caplog
) -> None:
    """If async_apply_panel_visibility(False) raises during unwind, async_stop
    must still run and the original setup error must still propagate."""
    import logging

    from homeassistant.exceptions import ConfigEntryNotReady

    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch(
            "custom_components.eppgrid.async_apply_panel_visibility",
            new_callable=AsyncMock,
        ) as mock_panel_vis,
        caplog.at_level(logging.ERROR, logger="custom_components.eppgrid"),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock(side_effect=ConfigEntryNotReady("device offline"))
        mock_dm.async_stop = AsyncMock()

        call_count = 0

        async def panel_vis_side_effect(h, visible):
            nonlocal call_count
            call_count += 1
            if not visible:
                raise RuntimeError("panel removal exploded")

        mock_panel_vis.side_effect = panel_vis_side_effect

        with pytest.raises(ConfigEntryNotReady):
            await async_setup_entry(hass, config_entry)

        mock_dm.async_stop.assert_awaited_once()
    assert DOMAIN not in hass.data
    assert "async_apply_panel_visibility(False) failed during setup unwind" in caplog.text


async def test_setup_entry_unwinds_on_panel_failure(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """If panel registration itself fails, the started manager is stopped and unpublished."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch(
            "custom_components.eppgrid._register_panel",
            new_callable=AsyncMock,
            side_effect=ValueError("Overwriting panel eppgrid"),
        ),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()

        with pytest.raises(ValueError):
            await async_setup_entry(hass, config_entry)

    assert DOMAIN not in hass.data
    assert _PANEL_REGISTERED_KEY not in hass.data
    mock_dm.async_stop.assert_awaited_once()


async def test_setup_unwind_unloads_binary_sensor_platform(hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
    """If a step after the binary_sensor forward fails, the unwind unloads the
    platform so a retry doesn't leak orphaned helper entities."""
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch(
            "custom_components.eppgrid._register_panel",
            new_callable=AsyncMock,
            side_effect=ValueError("Overwriting panel eppgrid"),
        ),
        patch(
            "homeassistant.config_entries.ConfigEntries.async_unload_platforms",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_unload,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()

        with pytest.raises(ValueError):
            await async_setup_entry(hass, config_entry)

        mock_unload.assert_awaited_once()


async def test_setup_entry_registers_panel_after_manager_start(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The fallible manager.async_start runs before the irreversible panel registration."""
    if hass.http is None:
        hass.http = MagicMock()

    order: list[str] = []

    async def record_start() -> None:
        order.append("start")

    async def record_panel(*args: object) -> None:
        order.append("panel")

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", side_effect=record_panel),
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock(side_effect=record_start)
        await async_setup_entry(hass, config_entry)

    assert order == ["start", "panel"]


async def test_setup_entry_registers_proxy_view_once_across_reloads(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The firmware proxy view registers once per HA process, not once per reload.

    HomeAssistantView.register appends a fresh route on every call, so an
    unguarded call would stack duplicate /api/eppgrid/firmware routes on each
    options-change reload.
    """
    if hass.http is None:
        hass.http = MagicMock()

    with (
        patch("custom_components.eppgrid.DeviceManager") as mock_dm_cls,
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=deadbeef",
        ),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
        patch.object(hass.http, "register_view") as mock_register_view,
    ):
        mock_dm = mock_dm_cls.return_value
        mock_dm.async_start = AsyncMock()
        mock_dm.async_stop = AsyncMock()

        await async_setup_entry(hass, config_entry)
        await async_unload_entry(hass, config_entry)
        await async_setup_entry(hass, config_entry)

    assert mock_register_view.call_count == 1


def test_manifest_declares_hard_dependencies() -> None:
    """Setup hard-uses these HA components; declaring them guarantees load order."""
    manifest_path = os.path.join(os.path.dirname(__file__), "..", "custom_components", "eppgrid", "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["dependencies"] == ["frontend", "http", "panel_custom", "repairs", "websocket_api"]


async def test_hash_file(tmp_path) -> None:
    """_hash_file returns first 8 chars of MD5 hex digest."""
    from custom_components.eppgrid import _hash_file

    test_file = tmp_path / "test.js"
    test_file.write_bytes(b"hello world")

    result = _hash_file(str(test_file))
    assert len(result) == 8
    assert result.isalnum()
