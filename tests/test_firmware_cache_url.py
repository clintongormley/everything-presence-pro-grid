"""Resolve the base URL an internet-restricted device can use to reach HA."""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
import pytest_socket
from homeassistant.core import HomeAssistant
from homeassistant.helpers.network import NoURLAvailableError

from custom_components.eppgrid import firmware_cache


def _fake_http(port: int = 8123, ssl: bool = False) -> MagicMock:
    http = MagicMock()
    http.server_port = port
    http.ssl_certificate = "/x/cert.pem" if ssl else None
    return http


async def test_base_url_uses_probed_source_ip_over_http(hass: HomeAssistant) -> None:
    hass.http = _fake_http(port=8123, ssl=False)
    with patch.object(firmware_cache, "probe_source_ip", return_value="192.168.1.10"):
        url = await firmware_cache.resolve_reachable_base_url(hass, "192.168.1.50")
    assert url == "http://192.168.1.10:8123"


async def test_base_url_uses_https_when_ha_has_ssl(hass: HomeAssistant) -> None:
    hass.http = _fake_http(port=8123, ssl=True)
    with patch.object(firmware_cache, "probe_source_ip", return_value="192.168.1.10"):
        url = await firmware_cache.resolve_reachable_base_url(hass, "192.168.1.50")
    assert url == "https://192.168.1.10:8123"


async def test_base_url_brackets_ipv6_literal(hass: HomeAssistant) -> None:
    hass.http = _fake_http(port=8123, ssl=False)
    with patch.object(firmware_cache, "probe_source_ip", return_value="fd00::1"):
        url = await firmware_cache.resolve_reachable_base_url(hass, "fd00::50")
    assert url == "http://[fd00::1]:8123"


async def test_base_url_falls_back_to_get_url_when_probe_fails(hass: HomeAssistant) -> None:
    hass.http = _fake_http()
    with (
        patch.object(firmware_cache, "probe_source_ip", return_value=None),
        patch.object(firmware_cache, "get_url", return_value="http://homeassistant.local:8123/"),
    ):
        url = await firmware_cache.resolve_reachable_base_url(hass, "192.168.1.50")
    assert url == "http://homeassistant.local:8123"


async def test_base_url_none_when_probe_and_get_url_both_fail(hass: HomeAssistant) -> None:
    hass.http = _fake_http()
    with (
        patch.object(firmware_cache, "probe_source_ip", return_value=None),
        patch.object(firmware_cache, "get_url", side_effect=NoURLAvailableError),
    ):
        url = await firmware_cache.resolve_reachable_base_url(hass, "192.168.1.50")
    assert url is None


async def test_base_url_falls_back_to_get_url_when_probe_raises(hass: HomeAssistant) -> None:
    hass.http = _fake_http()
    with (
        patch.object(firmware_cache, "probe_source_ip", side_effect=RuntimeError("blocked")),
        patch.object(firmware_cache, "get_url", return_value="http://homeassistant.local:8123/"),
    ):
        url = await firmware_cache.resolve_reachable_base_url(hass, "192.168.1.50")
    assert url == "http://homeassistant.local:8123"


async def test_base_url_none_when_no_host(hass: HomeAssistant) -> None:
    hass.http = _fake_http()
    with (
        patch.object(firmware_cache, "probe_source_ip", return_value=None),
        patch.object(firmware_cache, "get_url", side_effect=NoURLAvailableError),
    ):
        url = await firmware_cache.resolve_reachable_base_url(hass, None)
    assert url is None


@pytest.fixture
def network_unblocked() -> Iterator[None]:
    """Clear pytest-socket restrictions for the test, then re-establish them on teardown.

    The HA test plugin unconditionally disables real socket creation before every
    test (see tests/test_external_doc_links.py for the same pattern/rationale).
    `probe_source_ip` opens a real UDP socket, so this test needs the restriction
    lifted; teardown reinstates it so no other test is affected.
    """
    pytest_socket._remove_restrictions()
    try:
        yield
    finally:
        pytest_socket.socket_allow_hosts(["127.0.0.1"], allow_unix_socket=True)
        pytest_socket.disable_socket(allow_unix_socket=True)


def test_probe_source_ip_returns_loopback_for_loopback_target(network_unblocked: None) -> None:
    ip = firmware_cache.probe_source_ip("127.0.0.1")
    assert isinstance(ip, str) and ip


def test_probe_source_ip_stays_fail_soft_when_connect_raises() -> None:
    """Any address-shape rejection on connect (e.g. a platform demanding a
    4-tuple for AF_INET6) must fall through to None, never propagate."""

    class _Boom:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        def connect(self, *args: object) -> None:
            raise TypeError("bad address tuple")

        def close(self) -> None:
            pass

    # Patching socket.socket itself means no real socket is created, so the
    # pytest-socket guard never triggers (no network_unblocked needed).
    with patch.object(firmware_cache.socket, "socket", return_value=_Boom()):
        assert firmware_cache.probe_source_ip("fe80::1") is None
