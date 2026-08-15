"""Download + md5-verify firmware into a locally-served cache dir."""

from __future__ import annotations

import hashlib
import json
import os
import time
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import aiohttp
import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid import firmware_cache

_SOURCE = "https://example.test/fw/v1.7.0"
_VARIANT = "wifi-ble-co2"
_BIN = b"\x00\x01\x02\x03firmware-bytes"
_MD5 = hashlib.md5(_BIN).hexdigest()


def _manifest(md5: str = _MD5, path: str = f"{_VARIANT}.ota.bin") -> bytes:
    return json.dumps(
        {
            "name": "EPP Grid",
            "version": "1.7.0",
            "builds": [{"chipFamily": "ESP32", "ota": {"path": path, "md5": md5}}],
        }
    ).encode()


def _fake_get(bodies: dict[str, bytes], status: dict[str, int] | None = None) -> MagicMock:
    """A fake aiohttp session whose .get(url) yields the mapped body/status."""
    status = status or {}

    def _get(url, *_a, **_k):
        resp = MagicMock()
        resp.status = status.get(url, 200)
        body = bodies.get(url, b"")
        resp.read = AsyncMock(return_value=body)

        async def _iter(_n):
            yield body

        resp.content.iter_chunked = _iter
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=resp)
        cm.__aexit__ = AsyncMock(return_value=False)
        return cm

    session = MagicMock()
    session.get = MagicMock(side_effect=_get)
    return session


@pytest.fixture
def cache_dir(hass: HomeAssistant, tmp_path) -> str:
    """A staging-ready cache dir: patched path + the cache marked registered.

    async_stage_firmware() now gates on _FW_CACHE_REGISTERED_KEY (a failed
    async_register_firmware_cache() must force the GitHub-direct fallback
    rather than hand out a URL nothing is serving), so every staging test
    needs the flag set as if registration had already succeeded.
    """
    d = str(tmp_path / "fw_cache")
    hass.data[firmware_cache._FW_CACHE_REGISTERED_KEY] = True
    with patch.object(firmware_cache, "firmware_cache_dir", return_value=d):
        yield d


async def test_stage_writes_manifest_and_verified_bin(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(),
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)):
        served = await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)

    assert served.startswith(f"{firmware_cache.FW_CACHE_URL_PREFIX}/")
    token = served.rsplit("/", 1)[1]
    assert os.path.isfile(os.path.join(cache_dir, token, f"{_VARIANT}.json"))
    assert os.path.isfile(os.path.join(cache_dir, token, f"{_VARIANT}.ota.bin"))


async def test_stage_raises_on_md5_mismatch(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(md5="deadbeef" * 4),
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_on_missing_release(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {f"{_SOURCE}/{_VARIANT}.json": b""}
    status = {f"{_SOURCE}/{_VARIANT}.json": 404}
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies, status)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_rejects_non_relative_ota_path(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(path="https://evil.test/x.ota.bin"),
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_cleans_up_only_stale_token_dirs(hass: HomeAssistant, cache_dir: str) -> None:
    """Cleanup is age-based, not delete-all-others: staging runs before the
    per-mac OTA lock and the device's ~10-30s pre-OTA reboot, so a concurrent
    device's just-staged token dir must survive until it fetches its binary.
    Only dirs older than _STALE_TOKEN_AGE_S are swept; a recent dir (standing
    in for another device's in-flight OTA) is retained.
    """
    stale_dir = os.path.join(cache_dir, "stale-token")
    os.makedirs(stale_dir)
    old_mtime = time.time() - 7200
    os.utime(stale_dir, (old_mtime, old_mtime))

    recent_dir = os.path.join(cache_dir, "recent-token")
    os.makedirs(recent_dir)  # default mtime: "now", like another device's in-flight stage

    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(),
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)):
        served = await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)
    token = served.rsplit("/", 1)[1]

    remaining = set(os.listdir(cache_dir))
    assert remaining == {token, "recent-token"}
    assert "stale-token" not in remaining


async def test_register_firmware_cache_is_idempotent(hass: HomeAssistant, tmp_path) -> None:
    """A second call does not re-register the static path (module docstring: 'once')."""
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with patch.object(firmware_cache, "firmware_cache_dir", return_value=str(tmp_path / "fw_cache")):
        await firmware_cache.async_register_firmware_cache(hass)
        await firmware_cache.async_register_firmware_cache(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    assert hass.data[firmware_cache._FW_CACHE_REGISTERED_KEY] is True


async def test_register_firmware_cache_is_fail_soft_on_registration_error(hass: HomeAssistant, tmp_path) -> None:
    """A registration failure (HTTP-layer rejection, disk error, ...) is logged and
    swallowed — never raised — and the registered flag stays unset so the next
    entry setup retries, and async_stage_firmware() sees "not registered" and
    forces the GitHub-direct fallback rather than handing out a dead URL."""
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock(side_effect=RuntimeError("boom"))

    with patch.object(firmware_cache, "firmware_cache_dir", return_value=str(tmp_path / "fw_cache")):
        await firmware_cache.async_register_firmware_cache(hass)  # must not raise

    assert firmware_cache._FW_CACHE_REGISTERED_KEY not in hass.data


async def test_stage_raises_when_cache_not_registered(hass: HomeAssistant, tmp_path) -> None:
    """If registration never succeeded (flag unset), staging must fail fast
    rather than write into — and hand out a URL for — an unserved directory."""
    with (
        patch.object(firmware_cache, "firmware_cache_dir", return_value=str(tmp_path / "fw_cache")),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


def _fake_get_raising(raise_url: str, exc: BaseException) -> MagicMock:
    """A fake aiohttp session whose .get(raise_url) raises `exc` on __aenter__, and
    otherwise returns a 200/empty response — used to exercise the transport-error
    branches (aiohttp.ClientError / TimeoutError) distinct from a bad status code."""

    def _get(url, *_a, **_k):
        cm = MagicMock()
        if url == raise_url:
            cm.__aenter__ = AsyncMock(side_effect=exc)
        else:
            resp = MagicMock()
            resp.status = 200
            resp.read = AsyncMock(return_value=_manifest())
            cm.__aenter__ = AsyncMock(return_value=resp)
        cm.__aexit__ = AsyncMock(return_value=False)
        return cm

    session = MagicMock()
    session.get = MagicMock(side_effect=_get)
    return session


async def test_stage_raises_on_manifest_network_error(hass: HomeAssistant, cache_dir: str) -> None:
    session = _fake_get_raising(f"{_SOURCE}/{_VARIANT}.json", aiohttp.ClientConnectionError("boom"))
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=session),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_on_malformed_manifest_json(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {f"{_SOURCE}/{_VARIANT}.json": b"not-json"}
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_on_non_string_md5(hass: HomeAssistant, cache_dir: str) -> None:
    """A manifest whose md5 isn't a string (`.lower()` -> AttributeError) must
    surface as FirmwareStageError, not an unhandled AttributeError."""
    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(md5=12345),  # type: ignore[arg-type]
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_on_binary_non_200_status(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(),
        f"{_SOURCE}/{_VARIANT}.ota.bin": b"",
    }
    status = {f"{_SOURCE}/{_VARIANT}.ota.bin": 500}
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies, status)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_when_binary_exceeds_size_cap(hass: HomeAssistant, cache_dir: str) -> None:
    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(),
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)),
        patch.object(firmware_cache, "_MAX_FIRMWARE_BYTES", 4),
        pytest.raises(firmware_cache.FirmwareStageError, match="size cap"),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_on_binary_network_error(hass: HomeAssistant, cache_dir: str) -> None:
    session = _fake_get_raising(f"{_SOURCE}/{_VARIANT}.ota.bin", aiohttp.ClientConnectionError("boom"))
    with (
        patch.object(firmware_cache, "async_get_clientsession", return_value=session),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_stage_raises_on_commit_oserror(hass: HomeAssistant, tmp_path) -> None:
    """A disk error while writing the staged files (full disk, permission denied,
    cleanup race, ...) must surface as FirmwareStageError, not a raw OSError —
    Task 3's fallback only catches FirmwareStageError.

    Points the cache dir at a plain FILE (not a directory), so _commit()'s
    os.makedirs(dest, exist_ok=True) hits a real NotADirectoryError/OSError
    without monkeypatching os itself.
    """
    blocked = tmp_path / "fw_cache"
    blocked.write_bytes(b"not a directory")
    hass.data[firmware_cache._FW_CACHE_REGISTERED_KEY] = True

    bodies = {
        f"{_SOURCE}/{_VARIANT}.json": _manifest(),
        f"{_SOURCE}/{_VARIANT}.ota.bin": _BIN,
    }
    with (
        patch.object(firmware_cache, "firmware_cache_dir", return_value=str(blocked)),
        patch.object(firmware_cache, "async_get_clientsession", return_value=_fake_get(bodies)),
        pytest.raises(firmware_cache.FirmwareStageError),
    ):
        await firmware_cache.async_stage_firmware(hass, _SOURCE, _VARIANT)


async def test_local_url_composes_base_and_served_manifest(hass: HomeAssistant, cache_dir: str) -> None:
    with (
        patch.object(firmware_cache, "resolve_reachable_base_url", AsyncMock(return_value="http://192.168.1.10:8123")),
        patch.object(firmware_cache, "async_stage_firmware", AsyncMock(return_value="/eppgrid_fw/abc123")),
    ):
        url = await firmware_cache.async_local_ota_manifest_url(hass, "192.168.1.50", _SOURCE, _VARIANT)
    assert url == f"http://192.168.1.10:8123/eppgrid_fw/abc123/{_VARIANT}.json"


async def test_local_url_none_when_cache_not_registered(hass: HomeAssistant) -> None:
    """Without a registered static path, local serving can never succeed —
    async_local_ota_manifest_url must short-circuit before even probing the
    device's reachability, so it never pays for (or risks) a network call
    whose result is already moot."""
    with patch.object(firmware_cache, "resolve_reachable_base_url", AsyncMock()) as mock_resolve:
        url = await firmware_cache.async_local_ota_manifest_url(hass, "192.168.1.50", _SOURCE, _VARIANT)
    assert url is None
    mock_resolve.assert_not_called()


async def test_local_url_none_when_no_reachable_base(hass: HomeAssistant) -> None:
    hass.data[firmware_cache._FW_CACHE_REGISTERED_KEY] = True
    with patch.object(firmware_cache, "resolve_reachable_base_url", AsyncMock(return_value=None)):
        url = await firmware_cache.async_local_ota_manifest_url(hass, "192.168.1.50", _SOURCE, _VARIANT)
    assert url is None


async def test_local_url_none_when_resolve_reachable_base_url_raises_unexpectedly(hass: HomeAssistant) -> None:
    """The design invariant is "local serving must NEVER break OTA": even an
    exception type resolve_reachable_base_url() isn't documented to raise
    (a bug, an unusual environment, ...) must still yield the GitHub-direct
    fallback (None), not propagate out of async_local_ota_manifest_url."""
    hass.data[firmware_cache._FW_CACHE_REGISTERED_KEY] = True
    with patch.object(firmware_cache, "resolve_reachable_base_url", AsyncMock(side_effect=RuntimeError("boom"))):
        url = await firmware_cache.async_local_ota_manifest_url(hass, "192.168.1.50", _SOURCE, _VARIANT)
    assert url is None


async def test_local_url_none_when_staging_fails(hass: HomeAssistant) -> None:
    hass.data[firmware_cache._FW_CACHE_REGISTERED_KEY] = True
    with (
        patch.object(firmware_cache, "resolve_reachable_base_url", AsyncMock(return_value="http://192.168.1.10:8123")),
        patch.object(
            firmware_cache, "async_stage_firmware", AsyncMock(side_effect=firmware_cache.FirmwareStageError("boom"))
        ),
    ):
        url = await firmware_cache.async_local_ota_manifest_url(hass, "192.168.1.50", _SOURCE, _VARIANT)
    assert url is None
