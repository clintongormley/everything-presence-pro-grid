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

import hashlib
import json
import logging
import os
import secrets
import shutil
import socket
import time

import aiohttp
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.network import NoURLAvailableError
from homeassistant.helpers.network import get_url

from .const import DOMAIN

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
        try:
            ip = await hass.async_add_executor_job(probe_source_ip, device_host)
        except Exception:
            # Best-effort probe: a blocked or unusual socket must never break
            # OTA — fall through to get_url / GitHub-direct.
            _LOGGER.debug("Source-IP probe for %s failed; falling back", device_host, exc_info=True)
            ip = None
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


FW_CACHE_URL_PREFIX = f"/{DOMAIN}_fw"
_FW_CACHE_REGISTERED_KEY = f"{DOMAIN}_fw_cache_registered"

# Real firmware artifacts are ~1-2 MiB; 16 MiB leaves plenty of headroom while
# bounding the memory cost of a hostile or misconfigured upstream (mirrors
# firmware_proxy.py's _MAX_RESPONSE_BYTES).
_MAX_FIRMWARE_BYTES = 16 * 1024 * 1024

# Bound the upstream fetch to keep a stalled host from holding an HA event-loop
# slot indefinitely. total covers the whole exchange; sock_read guards against
# slow-loris bodies (mirrors firmware_proxy.py's _UPSTREAM_TIMEOUT).
_STAGE_TIMEOUT = aiohttp.ClientTimeout(total=60, sock_read=15)

# Keep recently-staged token dirs so a concurrent multi-device OTA (each stage
# runs before its own pre-OTA reboot + device fetch) never deletes another
# device's in-flight firmware. Only sweep dirs older than this.
_STALE_TOKEN_AGE_S = 3600


class FirmwareStageError(Exception):
    """Staging firmware into the local cache failed; fall back to GitHub-direct."""


def firmware_cache_dir(hass: HomeAssistant) -> str:
    """Absolute path of the firmware cache directory."""
    return hass.config.path(f"{DOMAIN}/firmware_cache")


async def async_register_firmware_cache(hass: HomeAssistant) -> None:
    """Create + register the cache dir for unauthenticated static serving (once).

    Best-effort: registration failure (disk error, HTTP-layer rejection, ...) is
    logged and swallowed rather than raised, so it can never fail config-entry
    setup. The registered flag is only set on success; async_stage_firmware()
    gates on that flag so a failed registration coherently forces the
    GitHub-direct fallback instead of handing a device a local URL that would
    404 because nothing is actually being served there.
    """
    if hass.data.get(_FW_CACHE_REGISTERED_KEY):
        return
    cache_dir = firmware_cache_dir(hass)
    try:
        await hass.async_add_executor_job(lambda: os.makedirs(cache_dir, exist_ok=True))
        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path=FW_CACHE_URL_PREFIX, path=cache_dir, cache_headers=False)]
        )
    except Exception as err:  # best-effort registration must never fail config-entry setup
        _LOGGER.warning("Could not register local firmware cache; OTA will use GitHub-direct: %s", err)
        return
    hass.data[_FW_CACHE_REGISTERED_KEY] = True


async def async_stage_firmware(hass: HomeAssistant, source_base: str, variant: str) -> str:
    """Download+verify {variant}.json and {variant}.ota.bin from `source_base` into
    a fresh token dir under the cache and return the served path segment. Raises
    FirmwareStageError on any failure so the caller can fall back."""
    if not hass.data.get(_FW_CACHE_REGISTERED_KEY):
        raise FirmwareStageError("firmware cache static path not registered")
    session = async_get_clientsession(hass)
    manifest_url = f"{source_base}/{variant}.json"
    try:
        async with session.get(manifest_url, timeout=_STAGE_TIMEOUT) as resp:
            if resp.status != 200:
                raise FirmwareStageError(f"manifest {manifest_url} returned {resp.status}")
            manifest_bytes = await resp.read()
    except (aiohttp.ClientError, TimeoutError) as err:
        raise FirmwareStageError(f"manifest fetch failed: {err}") from err

    try:
        manifest = json.loads(manifest_bytes)
        build = next(b for b in manifest["builds"] if isinstance(b.get("ota"), dict))
        rel_path = build["ota"]["path"]
        expected_md5 = build["ota"]["md5"].lower()
    except (ValueError, KeyError, TypeError, StopIteration, AttributeError) as err:
        raise FirmwareStageError(f"bad manifest: {err}") from err
    if "/" in rel_path or not rel_path.endswith(".ota.bin"):
        raise FirmwareStageError(f"unexpected ota path {rel_path!r}")

    bin_url = f"{source_base}/{rel_path}"
    buf = bytearray()
    try:
        async with session.get(bin_url, timeout=_STAGE_TIMEOUT) as resp:
            if resp.status != 200:
                raise FirmwareStageError(f"binary {bin_url} returned {resp.status}")
            async for chunk in resp.content.iter_chunked(64 * 1024):
                buf += chunk
                if len(buf) > _MAX_FIRMWARE_BYTES:
                    raise FirmwareStageError("firmware exceeds size cap")
    except (aiohttp.ClientError, TimeoutError) as err:
        raise FirmwareStageError(f"binary fetch failed: {err}") from err

    if hashlib.md5(buf).hexdigest() != expected_md5:
        raise FirmwareStageError("firmware md5 mismatch")

    token = secrets.token_hex(8)
    cache_dir = firmware_cache_dir(hass)

    def _commit() -> None:
        dest = os.path.join(cache_dir, token)
        os.makedirs(dest, exist_ok=True)
        with open(os.path.join(dest, rel_path), "wb") as f:
            f.write(bytes(buf))
        with open(os.path.join(dest, f"{variant}.json"), "wb") as f:
            f.write(manifest_bytes)
        now = time.time()
        for name in os.listdir(cache_dir):
            path = os.path.join(cache_dir, name)
            if name == token or not os.path.isdir(path):
                continue
            try:
                if now - os.path.getmtime(path) > _STALE_TOKEN_AGE_S:
                    shutil.rmtree(path, ignore_errors=True)
            except OSError:
                continue

    try:
        await hass.async_add_executor_job(_commit)
    except OSError as err:
        raise FirmwareStageError(f"failed to write staged firmware: {err}") from err
    return f"{FW_CACHE_URL_PREFIX}/{token}"


async def async_local_ota_manifest_url(
    hass: HomeAssistant, device_host: str | None, source_base: str, variant: str
) -> str | None:
    """Return an HA-local manifest URL the device can fetch, or None to fall back
    to GitHub-direct. Fails soft: any resolution/staging error returns None."""
    if not hass.data.get(_FW_CACHE_REGISTERED_KEY):
        # Local serving can never succeed without the static path registered
        # (see async_stage_firmware below) — skip the network probe entirely
        # rather than pay its cost (and, in a device-facing socket call, its
        # failure surface) for an outcome that's already decided.
        return None
    try:
        base = await resolve_reachable_base_url(hass, device_host)
    except Exception:
        _LOGGER.debug("Reachable-URL resolution failed; using GitHub-direct", exc_info=True)
        return None
    if base is None:
        return None
    try:
        served = await async_stage_firmware(hass, source_base, variant)
    except FirmwareStageError as err:
        _LOGGER.warning("Local firmware staging failed (%s); using GitHub-direct", err)
        return None
    return f"{base}{served}/{variant}.json"
