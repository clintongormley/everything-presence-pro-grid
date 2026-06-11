#pragma once
//
// target_zone_or_invalid: Grid + validity helper shared by the zone-state
// debug log and the per-target zone entity publish in epp_component.cpp.
//
// Centralising this lookup-with-bounds-check sequence prevents the two
// callsites from drifting. Moved from a file-local static in epp_component.cpp
// into the host-testable helpers lib so the -1 contract can be verified
// independently of the ESPHome component.

#include "epp_grid.h"
#include "epp_target_validity.h"
#include "epp_types.h"

namespace epp {

/// Returns the zone id at the target's grid cell, or -1 when:
///   - the target has no queryable position (status INACTIVE or non-finite coords
///     per is_target_valid), OR
///   - the target's position maps outside the grid bounds.
///
/// Callers map -1 differently: the zone-state debug log maps it to zone 0
/// (historical display convention); the per-target zone entity publishes NAN.
inline int target_zone_or_invalid(const Grid &grid, TargetStatus status, float x, float y) {
  if (!is_target_valid(status, x, y)) return -1;
  int cell = grid.xy_to_cell(x, y);
  if (cell < 0 || cell >= GRID_CELL_COUNT) return -1;
  return grid.cell_zone(cell);
}

}  // namespace epp
