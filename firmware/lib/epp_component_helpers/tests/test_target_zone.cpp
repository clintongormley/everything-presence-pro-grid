// Tests for target_zone_or_invalid.
//
// The helper was a file-local static in epp_component.cpp. Moving it to the
// host-testable helpers lib lets us verify the -1 contract here.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cmath>

#include "epp_target_zone.h"
#include "epp_types.h"
#include "epp_grid.h"

using namespace epp;

namespace {

// A default-constructed grid (all cells zone 0, 20x20 at origin)
Grid make_default_grid() { return Grid{}; }

}  // namespace

TEST_CASE("INACTIVE status returns -1 (invalid)") {
  Grid g = make_default_grid();
  CHECK(target_zone_or_invalid(g, TargetStatus::INACTIVE, 300.0f, 300.0f) == -1);
}

TEST_CASE("NaN coordinates return -1 (invalid)") {
  Grid g = make_default_grid();
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, NAN, 300.0f) == -1);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 300.0f, NAN) == -1);
}

TEST_CASE("position outside grid bounds returns -1") {
  Grid g = make_default_grid();
  // Grid is 20x20 cells at 300mm each = 6000x6000mm. Anything outside is OOB.
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 7000.0f, 300.0f) == -1);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, 300.0f, 7000.0f) == -1);
  CHECK(target_zone_or_invalid(g, TargetStatus::ACTIVE, -1.0f, 300.0f) == -1);
}

TEST_CASE("valid ACTIVE target in default grid returns zone 0") {
  // Default-constructed Grid has all cells at zone 0 (CELL_ZONE_MASK bits all 0).
  Grid g = make_default_grid();
  int zone = target_zone_or_invalid(g, TargetStatus::ACTIVE, 300.0f, 300.0f);
  CHECK(zone == 0);
}

TEST_CASE("valid PENDING target returns zone (not -1)") {
  // PENDING is a real trackable status; position is queryable.
  Grid g = make_default_grid();
  int zone = target_zone_or_invalid(g, TargetStatus::PENDING, 300.0f, 300.0f);
  CHECK(zone >= 0);
}

TEST_CASE("origin (0,0) with ACTIVE returns zone (regression: was treated as invalid)") {
  // Mirrors the is_target_valid regression: (0,0) is a valid position.
  Grid g = make_default_grid();
  int zone = target_zone_or_invalid(g, TargetStatus::ACTIVE, 0.0f, 0.0f);
  // (0,0) is at the grid origin; cell 0; zone 0 in a default grid.
  CHECK(zone == 0);
}
