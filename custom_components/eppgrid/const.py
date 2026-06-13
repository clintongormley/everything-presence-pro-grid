"""Constants for the Everything Presence Pro integration."""

DOMAIN = "eppgrid"

# Grid
GRID_COLS = 20
GRID_ROWS = 20
GRID_CELL_SIZE_MM = 300  # Fixed 300mm x 300mm cells

# ESPHome API
DEFAULT_PORT = 6053

# DFRobot C4001 static-presence trigger delay ("on delay") hardware limit.
# The sensor's setLatency trigger parameter accepts 0-2s (0.01s resolution);
# values above this are silently rejected by the sensor.
STATIC_ON_DELAY_MAX = 2.0

MAX_ZONES = 7
NUM_ZONE_SLOTS = MAX_ZONES + 1  # 8: zone 0 + named zones 1-7

# Upper bound (bytes) on a zones JSON payload accepted by the firmware.
# Mirror of ZONES_JSON_MAX in
# firmware/lib/epp_zone_engine/include/epp_zone_config_parser.h —
# tests/test_firmware_zones_json_max.py asserts the two agree.
# Both must be bumped together if the firmware cap changes.
ZONES_JSON_MAX: int = 8192


def empty_zone_slots() -> list[dict[str, str] | None]:
    """Return a fresh fallback layout when a device has no stored room_layout.

    Must satisfy is_valid_zone_slots_shape (length-8 list, dict at slot 0).
    Returned as a fresh list with a fresh slot-0 dict so callers can safely
    mutate without leaking changes into other call sites.
    """
    return [{"type": "default"}, *([None] * MAX_ZONES)]


# Firmware version this integration requires.
# Must match the firmware's Firmware Version text sensor value.
# Bump when releasing new firmware. GitHub release tag is v{FIRMWARE_VERSION}.
FIRMWARE_VERSION = "1.1.0"

# Original EPP firmware identifiers (for device discovery)
EPP_MANUFACTURER = "EverythingSmartTechnology"
EPP_MODEL = "Everything Presence Pro"

# Browser-side firmware artifacts (ESP Web Flasher) — GitHub release
# assets for v{FIRMWARE_VERSION}. The ESP Web Tools manifest there has
# absolute parts+offsets needed for an initial USB flash, and the proxy
# at /api/eppgrid/firmware/{filename} fetches these server-side so the
# browser doesn't need direct GitHub connectivity.
MANIFEST_BASE_URL = (
    f"https://github.com/clintongormley/everything-presence-pro-grid/releases/download/v{FIRMWARE_VERSION}"
)

# Pinned-version manifest for the integration's OTA button (Path B) on
# GitHub Pages. The ESP32's update.http_request component fetches this
# manifest and then the OTA bin it references, so we need same-origin
# manifest+bin to keep mbedtls within the heap budget.
#
# Why not MANIFEST_BASE_URL (GitHub releases): the release-asset URL
# 302-redirects to a signed release-assets.githubusercontent.com URL,
# requiring a second TLS context for the OTA bin fetch. The ESP32 fails
# the second mbedtls_ssl_setup with MBEDTLS_ERR_SSL_ALLOC_FAILED, the HTTP
# client can't open a socket, and the OTA aborts with "firmware unchanged".
# Pages keeps both fetches on clintongormley.github.io with relative paths
# (stage-firmware.sh publishes fw/v{V}/{variant}.json and {variant}.ota.bin
# side by side), so a single TLS session covers everything.
#
# ESPHome's own update entity uses fw/latest/ on the same Pages site as
# the "always-newest" channel; this URL is the per-version pin.
OTA_MANIFEST_BASE_URL = f"https://clintongormley.github.io/everything-presence-pro-grid/fw/v{FIRMWARE_VERSION}"

# Map UI network choice to firmware variant filename (matches fw/ filenames)
FIRMWARE_VARIANTS = {
    "wifi": "wifi-ble-co2",
    "ethernet": "ethernet-ble-co2",
}
