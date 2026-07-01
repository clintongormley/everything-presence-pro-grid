#pragma once
//
// NVS layout constants and global schema version.
//
// The EPP component persists four blobs to NVS — perspective, grid, zones,
// relay — under the "epp" namespace. A single schema version gates the whole
// set: on a version mismatch, restore_from_nvs_ erases the namespace and
// starts fresh. The blobs are tightly coupled in practice — a partial
// restore (e.g. a painted grid with no zone configs, or a perspective with
// no painted cells) produces an unusable device, so wiping all four is the
// same outcome the user gets from reconfiguring one.
//
// Now that we have shipped to real users, a schema bump wipes everyone's
// painted grid, zones, perspective and relay config on upgrade. Any change
// that alters a stored blob's byte length is effectively a wipe today:
// restore_from_nvs_ in epp_component.cpp checks `persp_len == sizeof(...)`
// and `grid_len == GRID_BLOB_SIZE` with strict equality and silently skips
// non-matching blobs, so even an "additive" append of a new field falls
// through to defaults unless restore is taught to accept the previous
// length and default the new field.
//
// Before bumping the schema or changing a blob's layout:
//   - Prefer adding a new NVS key for new state instead of rewriting an
//     existing blob — new keys default cleanly when absent.
//   - If you must change an existing blob, update restore_from_nvs_ to
//     accept the previous blob length and populate the new field from a
//     default, then write the new layout back the next time it's saved.
//   - Bump NVS_SCHEMA_VERSION only when no migration is feasible; call out
//     the wipe in the release notes.
//
// To bump the schema (last resort, wipes user config):
//   1. Change the on-flash byte layout in epp_component.cpp's save_*_to_nvs_().
//   2. Increment NVS_SCHEMA_VERSION below by one.
//   3. Update tests/test_nvs_layout.cpp.

#include <cstddef>
#include <cstdint>

#include "epp_types.h"

namespace epp {

// On-flash size of the grid blob. Layout: GRID_CELL_COUNT cell bytes followed
// by two little-endian floats (origin_x, origin_y). Pinned by a static_assert
// so a future GRID_COLS/ROWS change can't silently shift the layout.
static_assert(sizeof(float) == 4,
              "epp NVS grid blob format assumes 32-bit float (IEEE-754 single)");
static constexpr size_t GRID_BLOB_SIZE = GRID_CELL_COUNT + 2 * sizeof(float);

// Upper bound on the base64-encoded grid input the API service should accept.
// Standard base64 expansion is ceil(n/3)*4 bytes plus an optional final
// newline. We allow 4 extra bytes of padding/whitespace slack so a stray
// newline or trailing space from the WS layer doesn't trigger a false
// rejection. Anything larger is treated as a buggy or malicious caller and
// rejected before the base64 decoder is invoked. The runtime check in
// tests/test_nvs_layout.cpp pins the numeric bounds (>= the canonical 536
// for 400 bytes, <= a sane upper limit) so future GRID_COLS/ROWS changes
// can't silently produce a too-small ceiling.
static constexpr size_t GRID_BASE64_MAX = ((GRID_CELL_COUNT + 2) / 3) * 4 + 4;
static_assert(GRID_BASE64_MAX >= GRID_CELL_COUNT,
              "Encoded form must be at least as big as decoded form");

// Schema version of the persisted NVS blob set. Bump on any on-flash byte
// layout change. 0 is the "absent key" sentinel returned by nvs_get_u8 on
// fresh install. The value was 2 because pre-0.100 firmware wrote a global
// `version=2` key alongside today's blob layouts; matching that value meant
// existing installs migrated without a wipe — the per-blob refactor in 0.100
// didn't actually change any blob's byte layout.
//
// Bumped to 3 to add the "heatmap" blob (see save_heatmap_to_nvs_ /
// restore_from_nvs_ in epp_component.cpp). This wipes the namespace on first
// boot of the new firmware (existing behaviour on version mismatch), so
// calibration/grid/zones re-push on reconnect — acceptable, already handled
// by the integration's on-reconnect config push.
static constexpr uint8_t NVS_SCHEMA_VERSION = 3;

}  // namespace epp
