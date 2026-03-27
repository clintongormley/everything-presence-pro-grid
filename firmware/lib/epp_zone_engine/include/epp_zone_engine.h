#pragma once

#include "epp_grid.h"
#include "epp_tumbling_window.h"
#include "epp_types.h"

#include <algorithm>
#include <cstdint>

namespace epp {

// ---------------------------------------------------------------------------
// Configuration & result structs
// ---------------------------------------------------------------------------

struct ZoneConfig {
    int id = 0;                     // 0-7 (0=rest-of-room)
    ZoneType type = ZoneType::NORMAL;
    int trigger = 5;
    int renew = 3;
    float timeout = 10.0f;
    float handoff_timeout = 3.0f;
    bool entry_point = false;
};

struct TargetResult {
    float x = 0.0f;
    float y = 0.0f;
    TargetStatus status = TargetStatus::INACTIVE;
    int signal = 0;
};

struct ProcessingResult {
    bool device_tracking_present = false;
    bool zone_occupancy[MAX_ZONE_SLOTS]{};
    ZoneState zone_states[MAX_ZONE_SLOTS]{};
    int zone_target_counts[MAX_ZONE_SLOTS]{};
    int frame_count = 0;
    TargetResult targets[MAX_TARGETS];
    int target_count = 0;
};

// ---------------------------------------------------------------------------
// Internal runtime state per zone
// ---------------------------------------------------------------------------

struct ZoneRuntime {
    ZoneConfig config;
    ZoneState state = ZoneState::CLEAR;
    float pending_since = -1.0f;
    uint8_t confirmed_targets = 0;  // bitmask (bits 0-2 for targets 0-2)
};

// ---------------------------------------------------------------------------
// ZoneEngine — state machine that converts calibrated target positions
//              into per-zone occupancy.
// ---------------------------------------------------------------------------

class ZoneEngine {
public:
    ZoneEngine();

    void set_grid(const Grid& grid);
    const Grid& grid() const;
    void set_zones(const ZoneConfig zones[], int count);
    const ProcessingResult& tick(const WindowOutput& window, float timestamp);

private:
    Grid grid_;
    ZoneRuntime zones_[MAX_ZONE_SLOTS]{};
    bool zone_enabled_[MAX_ZONE_SLOTS]{};  // which slots are configured
    int zone_count_ = 0;  // highest configured zone_id + 1

    // Per-target tracking state
    int target_prev_col_[MAX_TARGETS]{};
    int target_prev_row_[MAX_TARGETS]{};
    bool target_has_prev_[MAX_TARGETS]{};
    float target_prev_x_[MAX_TARGETS]{};
    float target_prev_y_[MAX_TARGETS]{};
    bool target_has_prev_xy_[MAX_TARGETS]{};
    int target_gate_count_[MAX_TARGETS]{};

    ProcessingResult result_;

    /// Find the ZoneRuntime index for a given zone_id. Returns -1 if not found.
    int find_zone_index(int zone_id) const;
};

}  // namespace epp
