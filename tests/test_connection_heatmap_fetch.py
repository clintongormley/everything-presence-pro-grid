"""DeviceConnection.async_fetch_heatmap — pull primitive for the polled heatmap.

Issue #365: the heatmap moved from a firmware text_sensor (push) to a polled
epp_get_heatmap response action (pull). This locks the transport semantics a
later task's poll loop depends on: ``None`` iff the action is absent on the
connected device (old firmware — safe to skip on), the decoded 400-int cell
list on success, and a raise for every transient failure (timeout, dropped
client, empty/garbled response) so the poll loop can distinguish "nothing to
show" from "something went wrong and should be retried".

Modeled on ``async_fetch_build_flags`` / ``tests/test_connection_clear_heatmap.py``.
"""

from __future__ import annotations

import asyncio
import base64
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import pytest

from custom_components.eppgrid.device_manager._connection import DeviceConnection
from custom_components.eppgrid.device_manager._connection import _decode_heatmap_b64


def _resp(data: bytes) -> SimpleNamespace:
    """A minimal stand-in for aioesphomeapi's ExecuteServiceResponse."""
    return SimpleNamespace(response_data=data)


def _make_conn_with_service(name: str) -> DeviceConnection:
    """A connected DeviceConnection whose _services exposes ``name``."""
    conn = DeviceConnection("192.168.1.100")
    conn._client = MagicMock()
    conn._client.execute_service = AsyncMock()
    conn._services = {name: MagicMock(name=name)}
    return conn


def _make_conn_without_service() -> DeviceConnection:
    """A connected DeviceConnection whose _services has no epp_get_heatmap."""
    conn = DeviceConnection("192.168.1.100")
    conn._client = MagicMock()
    conn._client.execute_service = AsyncMock()
    conn._services = {}
    return conn


async def test_async_fetch_heatmap_returns_decoded_cells():
    # 400 known bytes -> base64 -> {"b64": ...}; service present
    cells = [(i % 256) for i in range(400)]
    b64 = base64.b64encode(bytes(cells)).decode()
    conn = _make_conn_with_service("epp_get_heatmap")
    conn._client.execute_service.return_value = _resp(json.dumps({"b64": b64}).encode())
    assert await conn.async_fetch_heatmap() == cells


async def test_async_fetch_heatmap_returns_none_when_action_absent():
    conn = _make_conn_without_service()
    assert await conn.async_fetch_heatmap() is None
    conn._client.execute_service.assert_not_called()


async def test_async_fetch_heatmap_raises_on_empty_response_data():
    conn = _make_conn_with_service("epp_get_heatmap")
    conn._client.execute_service.return_value = _resp(b"")
    with pytest.raises(ValueError):
        await conn.async_fetch_heatmap()


async def test_async_fetch_heatmap_propagates_timeout():
    conn = _make_conn_with_service("epp_get_heatmap")
    conn._client.execute_service.side_effect = asyncio.TimeoutError
    with pytest.raises(asyncio.TimeoutError):
        await conn.async_fetch_heatmap()


async def test_async_fetch_heatmap_raises_on_bad_json():
    conn = _make_conn_with_service("epp_get_heatmap")
    conn._client.execute_service.return_value = _resp(b"not json")
    with pytest.raises(Exception):  # noqa: B017 -- json.loads raises JSONDecodeError; asserting the base class is the point
        await conn.async_fetch_heatmap()


async def test_async_fetch_heatmap_raises_when_client_is_none():
    """Dropped client (post-disconnect race) must raise, not silently return None."""
    conn = _make_conn_with_service("epp_get_heatmap")
    conn._client = None
    with pytest.raises(RuntimeError):
        await conn.async_fetch_heatmap()


def test_wire_format_matches_firmware_encoding():
    # Firmware does base64(encode_normalized()) — a 400-byte array. This is the
    # exact inverse _decode_heatmap_b64 must accept.
    arr = [((i * 7) % 256) for i in range(400)]
    assert _decode_heatmap_b64(base64.b64encode(bytes(arr)).decode()) == arr
