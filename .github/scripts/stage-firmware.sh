#!/usr/bin/env bash
#
# Stage freshly-built firmware artifacts into fw/v{VERSION}/ (always) and,
# unless STAGE_LATEST=0, mirror them into fw/latest/ — using the short-name
# convention the HA integration and ESPHome http_request OTA source URLs expect.
#
# Input: artifacts/everything-presence-pro-{variant}.{bin,ota.bin,-bootloader.bin,-partitions.bin}
# Output: fw/v{VERSION}/{variant}.{bin,json,ota.bin,-bootloader.bin,-partitions.bin}  (always)
#         fw/latest/{variant}.{bin,json,ota.bin,-bootloader.bin,-partitions.bin}      (STAGE_LATEST=1, default)
#
# Required env:
#   VERSION   — firmware version (e.g. "0.90.0-alpha")
#   ARTIFACTS — directory containing the long-named firmware build outputs
# Optional env:
#   STAGE_LATEST — "1" (default) also mirrors into fw/latest/; "0" stages only
#                  fw/v{VERSION}/. The Pages pipeline stages /releases/latest
#                  with the default, then re-runs with STAGE_LATEST=0 to publish
#                  the integration's pinned (possibly prerelease) FIRMWARE_VERSION
#                  for the panel's OTA button WITHOUT moving the stable channel
#                  that ESPHome's native update entity reads via fw/latest/.
#
set -euo pipefail

: "${VERSION:?VERSION env var required}"
: "${ARTIFACTS:=artifacts}"
: "${STAGE_LATEST:=1}"

VARIANTS=(wifi-ble-co2 ethernet-ble-co2 wifi-lite-co2)

variant_label() {
  # Human-readable label for the manifest `name` field — shown in the
  # ESPHome / HA firmware-update UI. The Lite label names the board, because
  # the manifest `name` is the only place the update UI says which model this
  # firmware is for.
  case "$1" in
    wifi-ble-co2)     echo "WiFi + BLE + CO2" ;;
    ethernet-ble-co2) echo "Ethernet + BLE + CO2" ;;
    wifi-lite-co2)    echo "Lite, WiFi + CO2" ;;
    *)                echo "$1" ;;
  esac
}

# The per-version dir is the source of truth (the manifest md5 is computed
# there); fw/latest/ is an optional mirror gated on STAGE_LATEST so a
# prerelease pass can publish fw/v{VERSION}/ without moving the stable channel.
DEST="fw/v${VERSION}"
mkdir -p "$DEST"
[ "$STAGE_LATEST" = "1" ] && mkdir -p fw/latest

for VARIANT in "${VARIANTS[@]}"; do
  ART="everything-presence-pro-${VARIANT}"
  LABEL=$(variant_label "$VARIANT")

  for SUFFIX in .bin .ota.bin -bootloader.bin -partitions.bin; do
    [ -f "${ARTIFACTS}/${ART}${SUFFIX}" ] \
      || { echo "missing artifact: ${ARTIFACTS}/${ART}${SUFFIX}" >&2; exit 1; }
  done

  cp "${ARTIFACTS}/${ART}.bin"             "${DEST}/${VARIANT}.bin"
  cp "${ARTIFACTS}/${ART}.ota.bin"         "${DEST}/${VARIANT}.ota.bin"
  cp "${ARTIFACTS}/${ART}-bootloader.bin"  "${DEST}/${VARIANT}-bootloader.bin"
  cp "${ARTIFACTS}/${ART}-partitions.bin"  "${DEST}/${VARIANT}-partitions.bin"

  OTA_MD5=$(md5sum "${DEST}/${VARIANT}.ota.bin" | cut -d' ' -f1)

  cat > "${DEST}/${VARIANT}.json" <<EOF
{
  "name": "Everything Presence Pro Grid (${LABEL})",
  "version": "${VERSION}",
  "home_assistant_domain": "esphome",
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        {"path": "${VARIANT}-bootloader.bin", "offset": 4096},
        {"path": "${VARIANT}-partitions.bin", "offset": 32768},
        {"path": "${VARIANT}.bin", "offset": 65536}
      ],
      "ota": {
        "path": "${VARIANT}.ota.bin",
        "md5": "${OTA_MD5}"
      }
    }
  ]
}
EOF

  if [ "$STAGE_LATEST" = "1" ]; then
    for FILE in "${VARIANT}.bin" "${VARIANT}.ota.bin" "${VARIANT}-bootloader.bin" "${VARIANT}-partitions.bin" "${VARIANT}.json"; do
      cp "${DEST}/${FILE}" "fw/latest/${FILE}"
    done
  fi
done
