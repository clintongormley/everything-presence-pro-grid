"""Verify that ZONES_JSON_MAX in const.py matches the firmware header.

The firmware cap is defined as:
  firmware/lib/epp_zone_engine/include/epp_zone_config_parser.h
    constexpr size_t ZONES_JSON_MAX = 8192;

The Python mirror in const.py is used by the device push guard in
device_manager/_connection.py. If they diverge, the guard may silently
accept payloads that the firmware rejects. This test catches the divergence
at CI time.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _read_firmware_zones_json_max() -> int:
    """Parse ZONES_JSON_MAX from the C++ header using a regex."""
    header = (REPO_ROOT / "firmware" / "lib" / "epp_zone_engine" / "include" / "epp_zone_config_parser.h").read_text()
    match = re.search(r"constexpr\s+size_t\s+ZONES_JSON_MAX\s*=\s*(\d+)\s*;", header)
    assert match, "ZONES_JSON_MAX not found in epp_zone_config_parser.h"
    return int(match.group(1))


def test_python_zones_json_max_matches_firmware_header() -> None:
    """Python ZONES_JSON_MAX must equal the firmware header value.

    Both must be bumped together if the firmware cap changes.
    """
    from custom_components.eppgrid.const import ZONES_JSON_MAX

    firmware_value = _read_firmware_zones_json_max()
    assert firmware_value == ZONES_JSON_MAX, (
        f"custom_components/eppgrid/const.py ZONES_JSON_MAX={ZONES_JSON_MAX} "
        f"but firmware/lib/epp_zone_engine/include/epp_zone_config_parser.h "
        f"ZONES_JSON_MAX={firmware_value}. "
        f"Bump both together when changing the firmware cap."
    )
