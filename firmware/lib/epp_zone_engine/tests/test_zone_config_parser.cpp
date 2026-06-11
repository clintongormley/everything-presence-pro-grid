#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <ArduinoJson.h>

#include <cstring>
#include <string>

#include "epp_types.h"
#include "epp_zone_engine.h"
#include "epp_zone_config_parser.h"

using namespace epp;

namespace {

/// Parse a JSON string through ArduinoJson, then through the shared helper.
/// Returns the number of entries written. `out` must have at least
/// `MAX_ZONE_SLOTS` entries.
int parse_from_string(const char *json, ZoneConfig out[]) {
  JsonDocument doc;
  auto err = deserializeJson(doc, json);
  REQUIRE(err == DeserializationError::Ok);
  int count = 0;
  parse_zone_configs(doc, out, count);
  return count;
}

}  // namespace

TEST_CASE("zone_slots[0] provides zone 0 timing (no id/name, just timing)") {
  // New unified shape: zone 0 lives in zone_slots[0] with only timing fields.
  // Named zones 1-7 live in zone_slots[1..7] and carry id/name/color.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"id\":1,\"name\":\"Living\",\"type\":\"rest\",\"trigger\":7,\"renew\":1,\"timeout\":30.0,\"handoff_timeout\":10.0},"
      "null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 2);

  // Zone 0 (slot 0): parsed from zone_slots[0], not from root room_* fields.
  CHECK(configs[0].id == 0);
  CHECK(configs[0].trigger == 5);
  CHECK(configs[0].renew == 3);
  CHECK(configs[0].timeout == doctest::Approx(10.0f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(3.0f));

  // Zone 1 (slot 1): parsed from zone_slots[1], id = slot index.
  CHECK(configs[1].id == 1);
  CHECK(configs[1].trigger == 7);
  CHECK(configs[1].renew == 1);
  CHECK(configs[1].timeout == doctest::Approx(30.0f));
  CHECK(configs[1].handoff_timeout == doctest::Approx(10.0f));
}

TEST_CASE("zone 0 timing values from wire are respected") {
  // Proves the parser reads trigger/renew/timeout/handoff_timeout from
  // zone_slots[0] and not from root-level room_* fields. The root-level
  // fields are absent here.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"rest\",\"trigger\":7,\"renew\":1,\"timeout\":30.0,\"handoff_timeout\":10.0},"
      "null,null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 1);
  CHECK(configs[0].id == 0);
  CHECK(configs[0].trigger == 7);
  CHECK(configs[0].renew == 1);
  CHECK(configs[0].timeout == doctest::Approx(30.0f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(10.0f));
}

TEST_CASE("float-typed trigger/renew parse to the wire value, not the default") {
  // Regression: the HA validator briefly normalised timing values to float
  // in storage, so a custom zone arrived as "trigger": 7.0. ArduinoJson v7's
  // `|` operator is type-strict — is<int>() is false for a float-typed
  // value — so an int-default extraction (`z["trigger"] | 5`) silently
  // returned the DEFAULT (5/3) instead of the user's timing. The parser must
  // tolerate float-typed integers as defense-in-depth.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"custom\",\"trigger\":7.0,\"renew\":4.0,\"timeout\":30.0,\"handoff_timeout\":5.0},"
      "null,null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 1);
  CHECK(configs[0].trigger == 7);
  CHECK(configs[0].renew == 4);
  CHECK(configs[0].timeout == doctest::Approx(30.0f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(5.0f));
}

TEST_CASE("non-integral trigger/renew round to nearest (matching backend half-up)") {
  // Nothing legitimate sends 6.6, but legacy storage predating the websocket
  // validator could. Round-to-nearest matches the backend's half-up coercion
  // so device and HA agree on the effective timing.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"trigger\":6.6,\"renew\":2.4,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 1);
  CHECK(configs[0].trigger == 7);
  CHECK(configs[0].renew == 2);
}

TEST_CASE("null at zone_slots[0] emits no zone-0 entry") {
  // If backend guarantee fails (zone 0 missing), the parser must not
  // fabricate one. Downstream, ZoneEngine::set_zones falls back to
  // ZoneConfig's in-class defaults for zone 0.
  const char *json =
      "{"
      "\"zone_slots\":["
      "null,"
      "{\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  // Only the slot-1 entry is written; zone 0 is absent.
  REQUIRE(count == 1);
  CHECK(configs[0].id == 1);
}

TEST_CASE("missing zone_slots array yields no zones") {
  const char *json = "{}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  CHECK(count == 0);
}

TEST_CASE("non-object slot entries are skipped (no phantom zones)") {
  // If the stored JSON is corrupted and a slot is a string/number/array,
  // parse_zone_configs must NOT fabricate a zone with default thresholds.
  const char *json =
      "{"
      "\"zone_slots\":["
      "\"not an object\","
      "42,"
      "[],"
      "{\"id\":3,\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  // Only the valid object at slot 3 produces a zone.
  REQUIRE(count == 1);
  CHECK(configs[0].id == 3);
}

TEST_CASE("parsed configs do not retain pointers into the JsonDocument") {
  // PR-8 item M3: epp_component.cpp uses a `JsonDocument doc; deserializeJson(doc, json);
  // parse_zone_configs(doc, ...);` pattern, then lets `doc` go out of scope.
  // For this to be safe, ZoneConfig must store all its fields by VALUE — no
  // const char * pointers into the doc's internal buffer. This test pins
  // that invariant by populating ZoneConfig from a parser doc, destroying
  // the doc, and checking the values still read correctly.
  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 0;
  {
    const char *json =
        "{"
        "\"zone_slots\":["
        "{\"trigger\":7,\"renew\":4,\"timeout\":33.5,\"handoff_timeout\":4.25},"
        "{\"trigger\":2,\"renew\":1,\"timeout\":12.0,\"handoff_timeout\":3.0},"
        "null,null,null,null,null,null"
        "]"
        "}";
    JsonDocument doc;
    REQUIRE(deserializeJson(doc, json) == DeserializationError::Ok);
    parse_zone_configs(doc, configs, count);
    // doc is destroyed at the end of this scope; if ZoneConfig held char* into
    // its buffer, the assertions below would dereference freed memory.
  }

  REQUIRE(count == 2);
  CHECK(configs[0].id == 0);
  CHECK(configs[0].trigger == 7);
  CHECK(configs[0].renew == 4);
  CHECK(configs[0].timeout == doctest::Approx(33.5f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(4.25f));
  CHECK(configs[1].id == 1);
  CHECK(configs[1].trigger == 2);
}

TEST_CASE("slot id field is ignored in favour of slot index") {
  // Even if the payload carries an id, the slot position wins. Prevents a
  // stale id from shifting a zone's slot.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"id\":99,\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 2);
  CHECK(configs[0].id == 0);  // slot 0
  CHECK(configs[1].id == 1);  // slot 1, not 99
}

TEST_CASE("slot index beyond MAX_ZONE_SLOTS is rejected (no out-of-range id)") {
  // Payload with 10 valid slots but only first 8 must be written; slots 8/9
  // must NOT produce entries with id >= MAX_ZONE_SLOTS.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0}"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == MAX_ZONE_SLOTS);
  for (int i = 0; i < count; ++i) {
    CHECK(configs[i].id == i);
    CHECK(configs[i].id < MAX_ZONE_SLOTS);
  }
}

TEST_CASE("nulls cannot push id beyond MAX_ZONE_SLOTS-1") {
  // Two leading nulls + 8 valid objects means slot indices 2..9. Indices 8-9
  // would write id=8/9 which exceed valid zone IDs. Must be rejected.
  const char *json =
      "{"
      "\"zone_slots\":["
      "null,null,"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0}"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  // Only slots 2..7 produce entries (6 entries total). Slots 8, 9 must be dropped.
  REQUIRE(count == 6);
  for (int i = 0; i < count; ++i) {
    CHECK(configs[i].id < MAX_ZONE_SLOTS);
  }
  CHECK(configs[0].id == 2);
  CHECK(configs[5].id == 7);
}

TEST_CASE("trigger and renew are clamped to [1, 9]") {
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"trigger\":0,\"renew\":-3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"trigger\":99,\"renew\":50,\"timeout\":10.0,\"handoff_timeout\":3.0}"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 2);
  // 0 / -3 → 1
  CHECK(configs[0].trigger == 1);
  CHECK(configs[0].renew == 1);
  // 99 / 50 → 9
  CHECK(configs[1].trigger == 9);
  CHECK(configs[1].renew == 9);
}

TEST_CASE("negative timeout / handoff_timeout are clamped to 0") {
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"trigger\":5,\"renew\":3,\"timeout\":-1.0,\"handoff_timeout\":-2.5}"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 1);
  CHECK(configs[0].timeout == doctest::Approx(0.0f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(0.0f));
}

// ---------------------------------------------------------------------------
// parse_zones_json — size-capped entry point.
//
// deserializeJson on an unbounded string lets a large LAN payload force a
// matching transient heap allocation on the 320KB-heap ESP32 (ArduinoJson v7
// grows its pool on demand). parse_zones_json applies ZONES_JSON_MAX BEFORE
// deserializing; both set_zones() and the NVS boot-restore path in
// epp_component.cpp go through it so the two can't drift.
// ---------------------------------------------------------------------------

TEST_CASE("parse_zones_json rejects payloads larger than ZONES_JSON_MAX before parsing") {
  // Valid-looking prefix padded past the cap. Content doesn't matter — the
  // size gate must fire before the parser ever sees the bytes.
  std::string big = "{\"zone_slots\":[]}";
  big.append(ZONES_JSON_MAX + 1 - big.size(), ' ');
  REQUIRE(big.size() == ZONES_JSON_MAX + 1);

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 0;
  CHECK(parse_zones_json(big.c_str(), big.size(), configs, count) ==
        ZonesJsonStatus::TOO_LARGE);
  CHECK(count == 0);
}

TEST_CASE("parse_zones_json accepts a payload of exactly ZONES_JSON_MAX bytes") {
  // Valid JSON padded with trailing whitespace to exactly the cap — proves
  // the boundary is inclusive (size > cap rejects, size == cap parses).
  std::string json =
      "{\"zone_slots\":["
      "{\"trigger\":7,\"renew\":2,\"timeout\":20.0,\"handoff_timeout\":5.0}"
      "]}";
  json.append(ZONES_JSON_MAX - json.size(), ' ');
  REQUIRE(json.size() == ZONES_JSON_MAX);

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 0;
  CHECK(parse_zones_json(json.c_str(), json.size(), configs, count) ==
        ZonesJsonStatus::OK);
  REQUIRE(count == 1);
  CHECK(configs[0].trigger == 7);
  CHECK(configs[0].renew == 2);
}

TEST_CASE("parse_zones_json surfaces malformed JSON as PARSE_ERROR with a message") {
  const char *bad = "{\"zone_slots\":[";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 0;
  const char *error = nullptr;
  CHECK(parse_zones_json(bad, std::strlen(bad), configs, count, &error) ==
        ZonesJsonStatus::PARSE_ERROR);
  CHECK(count == 0);
  REQUIRE(error != nullptr);
  CHECK(std::strlen(error) > 0);
}

TEST_CASE("ZONES_JSON_MAX leaves ample headroom over a typical full payload") {
  // Typical-worst payload the backend sends: all 8 slots fully populated
  // with timing fields plus the frontend-only metadata fields the firmware
  // ignores (id/name/color/type), ASCII names.
  std::string json = "{\"zone_slots\":[";
  for (int i = 0; i < MAX_ZONE_SLOTS; ++i) {
    if (i > 0) json += ",";
    json +=
        "{\"id\":7,\"name\":\"A fairly long user-chosen zone name\","
        "\"color\":\"#a1b2c3\",\"type\":\"sleeping_area\","
        "\"trigger\":9,\"renew\":9,\"timeout\":86400.5,\"handoff_timeout\":86400.5}";
  }
  json += "]}";

  // Require >= 2x headroom so typical payloads never brush the cap.
  CHECK(json.size() * 2 <= ZONES_JSON_MAX);

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 0;
  CHECK(parse_zones_json(json.c_str(), json.size(), configs, count) ==
        ZonesJsonStatus::OK);
  CHECK(count == MAX_ZONE_SLOTS);
}

TEST_CASE("ZONES_JSON_MAX accepts the worst frontend-producible payload (BWC)") {
  // The HA websocket boundary caps zone names at 64 chars and types at 32;
  // json.dumps escapes each non-ASCII char as a 6-byte \uXXXX sequence. A
  // payload of 7 named slots with fully-escaped maximal names/types plus
  // full timing is the largest input a legitimate backend can produce — the
  // firmware cap must never reject it, or those users' zones silently stop
  // applying on push (BWC).
  std::string name;   // 64 chars x 6 bytes escaped
  for (int i = 0; i < 64; ++i) name += "\\u4e2d";
  std::string type;   // 32 chars x 6 bytes escaped
  for (int i = 0; i < 32; ++i) type += "\\u4e2d";

  std::string json = "{\"zone_slots\":[";
  // zone 0: type + timing only
  json += "{\"type\":\"" + type + "\","
          "\"trigger\":9,\"renew\":9,\"timeout\":-2.2250738585072014e-308,"
          "\"handoff_timeout\":-2.2250738585072014e-308}";
  for (int i = 1; i < MAX_ZONE_SLOTS; ++i) {
    json += ",{\"name\":\"" + name + "\",\"color\":\"#a1b2c3\","
            "\"type\":\"" + type + "\","
            "\"trigger\":-2.2250738585072014e-308,\"renew\":9,"
            "\"timeout\":-2.2250738585072014e-308,"
            "\"handoff_timeout\":-2.2250738585072014e-308}";
  }
  json += "]}";

  CHECK(json.size() <= ZONES_JSON_MAX);

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 0;
  CHECK(parse_zones_json(json.c_str(), json.size(), configs, count) ==
        ZonesJsonStatus::OK);
  CHECK(count == MAX_ZONE_SLOTS);
}

TEST_CASE("parse_zones_json zeroes count on TOO_LARGE even when caller passes dirty count") {
  std::string big = "{\"zone_slots\":[]}";
  big.append(ZONES_JSON_MAX + 1 - big.size(), ' ');
  REQUIRE(big.size() == ZONES_JSON_MAX + 1);

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 99;  // dirty — must be zeroed by parse_zones_json
  CHECK(parse_zones_json(big.c_str(), big.size(), configs, count) ==
        ZonesJsonStatus::TOO_LARGE);
  CHECK(count == 0);
}

TEST_CASE("parse_zones_json zeroes count on PARSE_ERROR even when caller passes dirty count") {
  const char *bad = "{\"zone_slots\":[";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = 42;  // dirty — must be zeroed by parse_zones_json
  const char *error = nullptr;
  CHECK(parse_zones_json(bad, std::strlen(bad), configs, count, &error) ==
        ZonesJsonStatus::PARSE_ERROR);
  CHECK(count == 0);
  REQUIRE(error != nullptr);
}
