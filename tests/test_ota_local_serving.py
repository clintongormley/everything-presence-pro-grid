"""async_trigger_ota prefers an HA-local manifest URL, else GitHub-direct."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.storage import EPPGridStore

MAC = "AA:BB:CC:DD:EE:01"


def _fake_head_session(status: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.status = status
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=resp)
    cm.__aexit__ = AsyncMock(return_value=False)
    session = MagicMock()
    session.head = MagicMock(return_value=cm)
    return session


@pytest.fixture
def manager(hass: HomeAssistant) -> DeviceManager:
    mgr = DeviceManager(hass, EPPGridStore(hass))
    mgr.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50")
    mgr._build_flags[MAC] = {"ethernet_enabled": False}
    return mgr


async def _run_trigger(manager: DeviceManager, local_url: str | None) -> str:
    """Trigger OTA with reboot + head stubbed; return the URL handed to the device.

    The trigger hands the manifest over the persistent session `async_open_session`
    returns, then schedules a grace-window release. Stub the release scheduler so
    the test doesn't leak a lingering timer; we only care about the URL here."""
    session = MagicMock()
    session.async_execute_service = AsyncMock()
    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=session)),
        patch.object(manager, "_schedule_ota_session_release"),
        patch(
            "custom_components.eppgrid.device_manager.async_local_ota_manifest_url",
            new=AsyncMock(return_value=local_url),
        ),
    ):
        await manager.async_trigger_ota(MAC)
    _name, payload = session.async_execute_service.await_args.args
    return payload["url"]


async def test_trigger_uses_local_url_when_available(manager: DeviceManager) -> None:
    url = await _run_trigger(manager, "http://192.168.1.10:8123/eppgrid_fw/tok/wifi-ble-co2.json")
    assert url == "http://192.168.1.10:8123/eppgrid_fw/tok/wifi-ble-co2.json"


async def test_trigger_falls_back_to_github_when_no_local_url(manager: DeviceManager) -> None:
    url = await _run_trigger(manager, None)
    assert url.startswith("https://clintongormley.github.io/")
    assert url.endswith("/wifi-ble-co2.json")


async def test_trigger_forces_github_when_prefer_local_false(manager: DeviceManager) -> None:
    """A caller can force the GitHub-direct URL, bypassing HA-local serving
    entirely — the panel's 'Download from GitHub' retry after a local-serving
    fetch failure (e.g. HA in Docker advertising an unreachable container IP)."""
    session = MagicMock()
    session.async_execute_service = AsyncMock()
    local_mock = AsyncMock(return_value="http://192.168.1.10:8123/eppgrid_fw/tok/wifi-ble-co2.json")
    with (
        patch(
            "custom_components.eppgrid.device_manager.async_get_clientsession",
            return_value=_fake_head_session(200),
        ),
        patch.object(manager, "async_reboot_and_wait", new=AsyncMock()),
        patch.object(manager, "async_open_session", new=AsyncMock(return_value=session)),
        patch.object(manager, "_schedule_ota_session_release"),
        patch("custom_components.eppgrid.device_manager.async_local_ota_manifest_url", new=local_mock),
    ):
        await manager.async_trigger_ota(MAC, prefer_local=False)
    # Local serving must not even be attempted.
    local_mock.assert_not_awaited()
    _name, payload = session.async_execute_service.await_args.args
    assert payload["url"].startswith("https://clintongormley.github.io/")
    assert payload["url"].endswith("/wifi-ble-co2.json")


def test_ota_was_locally_served(manager: DeviceManager) -> None:
    """`ota_was_locally_served` distinguishes an HA-local served URL (the
    `/eppgrid_fw/` cache path) from a GitHub-direct one — so the download-failure
    UX only offers the GitHub retry when HA was the (unreachable) source."""
    manager._ota_manifest_urls[MAC] = "http://192.168.1.10:8123/eppgrid_fw/tok/wifi-ble-co2.json"
    assert manager.ota_was_locally_served(MAC) is True

    manager._ota_manifest_urls[MAC] = (
        "https://clintongormley.github.io/everything-presence-pro-grid/fw/v1.8.0/wifi-ble-co2.json"
    )
    assert manager.ota_was_locally_served(MAC) is False

    # Unknown mac (no stored URL) → not locally served.
    assert manager.ota_was_locally_served("FF:FF:FF:FF:FF:FF") is False


async def test_resend_reuses_the_resolved_url(manager: DeviceManager) -> None:
    local = "http://192.168.1.10:8123/eppgrid_fw/tok/wifi-ble-co2.json"
    await _run_trigger(manager, local)
    session = MagicMock()
    session.async_execute_service = AsyncMock()
    with patch.object(manager, "get_session", return_value=session):
        await manager.async_resend_ota_manifest(MAC)
    _name, payload = session.async_execute_service.await_args.args
    assert payload["url"] == local
