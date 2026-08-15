"""DeviceConnection._decode_heatmap_b64 decodes the firmware heatmap payload.

Moved here from tests/test_websocket_api.py (#365): the decoder itself moved from
websocket_api/_devices.py into device_manager/_connection.py so the new
async_fetch_heatmap (polled epp_get_heatmap action) can decode without an import
cycle. Pure relocation -- assertions are unchanged.
"""

from __future__ import annotations

import base64

from custom_components.eppgrid.device_manager._connection import _decode_heatmap_b64


def test_decode_heatmap_b64_roundtrip() -> None:
    raw = bytearray(400)
    raw[0] = 255
    raw[399] = 128
    encoded = base64.b64encode(bytes(raw)).decode("ascii")

    cells = _decode_heatmap_b64(encoded)
    assert len(cells) == 400
    assert cells[0] == 255
    assert cells[399] == 128
    assert cells[1] == 0


def test_decode_heatmap_b64_rejects_bad_input() -> None:
    assert _decode_heatmap_b64("") == [0] * 400
    assert _decode_heatmap_b64("not-base64!!") == [0] * 400
    # wrong length (too short) -> all zero
    short = base64.b64encode(bytes(10)).decode("ascii")
    assert _decode_heatmap_b64(short) == [0] * 400
