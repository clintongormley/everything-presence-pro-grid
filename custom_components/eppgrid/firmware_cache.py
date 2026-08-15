"""Download firmware to Home Assistant and serve it to internet-restricted devices.

The device's ESPHome `http_request` update component fetches an ESP Web Tools
manifest and then the OTA binary it references. Normally that URL points straight
at GitHub Pages, so the device needs internet access. This module lets HA (which
does have internet) download those artifacts and serve them over the LAN, then
hand the device an HA-local URL — so a device that can reach only Home Assistant
can still update. Everything here fails soft: any error returns a sentinel that
tells the caller to fall back to the GitHub-direct URL.
"""

from __future__ import annotations

import logging
import socket

from homeassistant.core import HomeAssistant
from homeassistant.helpers.network import NoURLAvailableError
from homeassistant.helpers.network import get_url

_LOGGER = logging.getLogger(__name__)


def probe_source_ip(host: str) -> str | None:
    """Return HA's source IP on the route to `host`, or None.

    Opens a UDP socket and connect()s it to the device. UDP connect sends no
    packets; it just makes the kernel pick the source address it would route to
    that host — i.e. HA's address as the device sees it. Tries IPv4 then IPv6.
    """
    for family in (socket.AF_INET, socket.AF_INET6):
        sock = None
        try:
            sock = socket.socket(family, socket.SOCK_DGRAM)
            sock.connect((host, 9))
            return sock.getsockname()[0]
        except OSError:
            continue
        finally:
            if sock is not None:
                sock.close()
    return None


async def resolve_reachable_base_url(hass: HomeAssistant, device_host: str | None) -> str | None:
    """Resolve an absolute base URL (no trailing slash) the device can use to
    reach HA, or None to signal the caller to use the GitHub-direct fallback."""
    if device_host:
        ip = await hass.async_add_executor_job(probe_source_ip, device_host)
        if ip:
            scheme = "https" if getattr(hass.http, "ssl_certificate", None) else "http"
            port = hass.http.server_port
            host = f"[{ip}]" if ":" in ip else ip
            return f"{scheme}://{host}:{port}"
    try:
        internal = get_url(
            hass,
            allow_internal=True,
            allow_external=False,
            prefer_external=False,
            require_current_request=False,
        )
    except NoURLAvailableError:
        return None
    return internal.rstrip("/") if internal else None
