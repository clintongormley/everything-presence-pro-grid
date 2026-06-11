// Tests for target_zone_or_invalid.
//
// The helper was a file-local static in epp_component.cpp. Moving it to the
// host-testable helpers lib lets us verify the -1 contract here.
//
// A default-constructed Grid is 20x20 cells of 300mm at the origin, all
// cells zone 0.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cmath>

#include "epp_target_zone.h"
#include "epp_types.h"
#include "epp_grid.h"

using namespace epp;

TEST_CASE("INACTIVE status returns -1 (invalid)") {
  Grid g;
  CHECK(target_zone_or_invalid(g, TargetStatus::INACTIVE, 300.0f, 300.0f) == -1);
}

TEST_CASE("NaN coordinates return -1 (invalid)") {
  Grid g;
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, NAN, 300.0f) == -1);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 300.0f, NAN) == -1);
}

TEST_CASE("position outside grid bounds returns -1") {
  Grid g;
  // Grid is 20x20 cells at 300mm each = 6000x6000mm. Anything outside is OOB.
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 7000.0f, 300.0f) == -1);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 300.0f, 7000.0f) == -1);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, -1.0f, 300.0f) == -1);
}

TEST_CASE("valid ACTIVE target returns the zone painted on its cell") {
  // Paint zone 3 onto the target's cell so this distinguishes a real
  // cell_zone lookup from a hardcoded 0 (every cell of a fresh Grid is
  // zone 0, which any stub would also return).
  Grid g;
  int cell = g.xy_to_cell(300.0f, 300.0f);
  REQUIRE(cell >= 0);
  g.cell(cell) = static_cast<uint8_t>(3 << CELL_ZONE_SHIFT);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 300.0f, 300.0f) == 3);
  // A cell that wasn't painted still reports the default zone 0.
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 900.0f, 900.0f) == 0);
}

TEST_CASE("valid PENDING target returns zone (not -1)") {
  // PENDING is a real trackable status; position is queryable.
  Grid g;
  int zone = target_zone_or_invalid(g, TargetStatus::PENDING, 300.0f, 300.0f);
  CHECK(zone >= 0);
}

TEST_CASE("origin (0,0) with ACTIVE returns zone (regression: was treated as invalid)") {
  // Mirrors the is_target_valid regression: (0,0) is a valid position.
  Grid g;
  int zone = target_zone_or_invalid(g, TargetStatus::ACTIVE, 0.0f, 0.0f);
  // (0,0) is at the grid origin; cell 0; zone 0 in a fresh grid.
  CHECK(zone == 0);
}
