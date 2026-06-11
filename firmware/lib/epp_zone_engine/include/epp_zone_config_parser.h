#pragma once

#include <ArduinoJson.h>

#include <cstddef>
#include <cstdint>

#include "epp_types.h"
#include "epp_zone_engine.h"

namespace epp {

/// Upper bound (bytes) on a zones JSON payload accepted from the API service
/// or the NVS boot-restore path. Anything larger is a buggy or malicious
/// caller and is rejected BEFORE deserializeJson is invoked, so ArduinoJson
/// never grows its heap pool to match attacker-controlled input (a large LAN
/// payload would otherwise force a matching transient allocation on the
/// 320 KB-heap ESP32). Mirrors GRID_BASE64_MAX for set_grid().
///
/// Sizing: the HA websocket boundary caps zone names at 64 chars and types
/// at 32 (custom_components/eppgrid/websocket_api/_validate_zone_slots);
/// json.dumps escapes non-ASCII as 6-byte \uXXXX sequences, so the
/// worst frontend-producible payload — 7 named slots with fully-escaped
/// maximal names and types plus full timing — is ~5.7 KB. 8 KB therefore
/// never rejects a legitimate payload (BWC) while a typical 8-zone payload
/// stays under 1.5 KB. Both bounds are pinned by tests in
/// tests/test_zone_config_parser.cpp.
constexpr size_t ZONES_JSON_MAX = 8192;

/// Outcome of parse_zones_json.
enum class ZonesJsonStatus : uint8_t {
  OK = 0,
  TOO_LARGE = 1,    // input exceeds ZONES_JSON_MAX; nothing was parsed
  PARSE_ERROR = 2,  // deserializeJson failed; nothing was parsed
};

/// Parse zone configs from `doc["zone_slots"]`. Writes up to MAX_ZONE_SLOTS
/// entries into `out`, updating `count`.
///
/// Slot index IS the zone id (any `id` in the payload is ignored). Null or
/// non-object entries are skipped. Slot indices >= MAX_ZONE_SLOTS are dropped
/// — the writer side guarantees the array is at most MAX_ZONE_SLOTS, so
/// reaching one indicates a malformed payload. If slot 0 is missing/null the
/// parser emits no zone-0 entry; downstream, ZoneEngine::set_zones seeds
/// zone 0 from ZoneConfig's in-class defaults so occupancy tracking still
/// runs.
///
/// The payload's `"type"` field (if present) is informational-only and is
/// ignored by firmware. The backend is the sole owner of type→timing
/// expansion and pushes the resolved timing values directly.
///
/// Trigger/renew are clamped to [1, 9] (matches the 0-9 signal scale; 0 means
/// "always trigger" which is degenerate). Timeout/handoff_timeout are clamped
/// to >= 0 to fail-safe on malformed payloads.
///
/// Callers must pass a freshly-initialised `out` and `count == 0`.
inline void parse_zone_configs(const JsonDocument &doc, ZoneConfig out[], int &count) {
  JsonArrayConst slots = doc["zone_slots"].as<JsonArrayConst>();
  for (size_t i = 0; i < slots.size() && count < MAX_ZONE_SLOTS; i++) {
    if (i >= static_cast<size_t>(MAX_ZONE_SLOTS)) break;  // slot index out of range
    if (slots[i].isNull()) {
      continue;  // unused named-zone slot; slot 0 null → engine falls back to struct defaults
    }
    if (!slots[i].is<JsonObjectConst>()) {
      continue;  // corrupt/non-object entry — don't fabricate a zone from bad data
    }
    JsonObjectConst z = slots[i].as<JsonObjectConst>();
    int trigger = z["trigger"] | 5;
    int renew = z["renew"] | 3;
    float timeout = z["timeout"] | 10.0f;
    float handoff_timeout = z["handoff_timeout"] | 3.0f;
    if (trigger < 1) trigger = 1;
    if (trigger > 9) trigger = 9;
    if (renew < 1) renew = 1;
    if (renew > 9) renew = 9;
    if (timeout < 0.0f) timeout = 0.0f;
    if (handoff_timeout < 0.0f) handoff_timeout = 0.0f;
    out[count] = {
        static_cast<int>(i),  // index = slot position (0 = zone 0, 1-7 = named)
        trigger,
        renew,
        timeout,
        handoff_timeout,
    };
    count++;
  }
}

/// Size-capped deserialize + parse, shared by set_zones() (LAN input) and
/// restore_from_nvs_() (saved blob) in epp_component.cpp so the two paths
/// can't drift. Rejects inputs over ZONES_JSON_MAX before deserializeJson
/// ever runs — see the constant's rationale above.
///
/// The JsonDocument lives on this function's stack and is destroyed on
/// return; parse_zone_configs copies primitives only (no pointers into the
/// doc are retained — pinned by the retention-guard test in
/// tests/test_zone_config_parser.cpp).
///
/// On PARSE_ERROR, `error` (when non-null) receives a pointer to a static
/// ArduinoJson description string (safe to use after return).
///
/// Unlike parse_zone_configs, this function zeroes `count` on entry, so
/// callers are not required to initialise it to 0 — on TOO_LARGE or
/// PARSE_ERROR the count is guaranteed to be 0 on return.
inline ZonesJsonStatus parse_zones_json(const char *json, size_t len,
                                        ZoneConfig out[], int &count,
                                        const char **error = nullptr) {
  count = 0;
  if (len > ZONES_JSON_MAX) return ZonesJsonStatus::TOO_LARGE;
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json, len);
  if (err) {
    if (error != nullptr) *error = err.c_str();
    return ZonesJsonStatus::PARSE_ERROR;
  }
  parse_zone_configs(doc, out, count);
  return ZonesJsonStatus::OK;
}

}  // namespace epp
