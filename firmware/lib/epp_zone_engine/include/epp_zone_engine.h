#pragma once

#include "epp_grid.h"
#include "epp_window.h"
#include "epp_types.h"

#include <algorithm>
#include <cstddef>
#include <cstdint>

namespace epp {

// ---------------------------------------------------------------------------
// Configuration & result structs
// ---------------------------------------------------------------------------

struct ZoneConfig {
    int id = 0;                     // 0-7 (0=rest-of-room)
    int trigger = 5;
    int renew = 3;
    float timeout = 10.0f;
    float handoff_timeout = 3.0f;
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
    SensorPresenceState static_state = SensorPresenceState::INACTIVE;
    SensorPresenceState motion_state = SensorPresenceState::INACTIVE;
    bool occupancy = false;
    bool mmwave = false;

    // Diagnostic log entries produced during this tick.
    // Keep log/log_count LAST: ZoneEngine::tick()'s reset and the component's
    // publish cache both use offsetof(ProcessingResult, log) to skip the
    // ~1.5 KB buffer when clearing/copying the fields above.
    LogEntry log[MAX_LOG_ENTRIES]{};
    int log_count = 0;
};

// Invariant: log/log_count must be last. ZoneEngine::tick()'s reset and the
// component's publish cache both copy offsetof(ProcessingResult, log) bytes —
// any field appended after log_count would be silently excluded. Pin the layout
// at compile time so a future field addition fails loudly instead of silently.
// Both asserts are exact (== rather than >= / < alignof): no padding exists
// between log and log_count or after log_count today, so a field inserted
// anywhere behind log — or padding appearing from a type change — forces
// re-derivation of this invariant rather than slipping through a slack bound.
static_assert(offsetof(ProcessingResult, log_count) ==
                  offsetof(ProcessingResult, log) + sizeof(ProcessingResult::log),
              "log_count must immediately follow log — no fields or padding in between");
static_assert(sizeof(ProcessingResult) - offsetof(ProcessingResult, log_count) -
                  sizeof(ProcessingResult::log_count) == 0,
              "nothing may follow log_count (fields or tail padding) — the "
              "partial-copy/reset idiom excludes them");

// ---------------------------------------------------------------------------
// Internal runtime state per zone
// ---------------------------------------------------------------------------

// Default sensor presence timeouts (seconds). Single source of truth for the
// engine and the ESPHome component glue — keeps the two from drifting apart.
constexpr float DEFAULT_STATIC_TIMEOUT_S = 10.0f;
constexpr float DEFAULT_MOTION_TIMEOUT_S = 10.0f;

struct SensorInput {
    bool static_on = false;
    bool motion_on = false;
    float static_timeout = DEFAULT_STATIC_TIMEOUT_S;
    float motion_timeout = DEFAULT_MOTION_TIMEOUT_S;
};

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
    const ProcessingResult& tick(const WindowOutput& window, float timestamp,
                                 const SensorInput& sensors = SensorInput{});
    void dismiss_target(int target_index, int cell_index);
    void set_stuck_target_timeout(float seconds);
    void set_assisted_clear(bool enabled, float timeout);

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
    int target_last_zone_[MAX_TARGETS]{};   // last zone while in-room (-1 = unknown)
    int dismissed_cell_[MAX_TARGETS]{};     // cell index target was dismissed at, or -1
    bool target_overlay_sticky_[MAX_TARGETS]{};  // last in-room on_overlay value

    // Stuck-target tracking — dwelling at exactly the same (x, y) for
    // stuck_target_timeout_s_ seconds triggers an auto-dismiss via
    // dismiss_target(). 0 disables the feature.
    float stuck_target_timeout_s_ = 0.0f;
    float stuck_ref_x_[MAX_TARGETS]{};
    float stuck_ref_y_[MAX_TARGETS]{};
    float stuck_since_s_[MAX_TARGETS]{};   // first-tick timestamp at ref coords
    bool  stuck_has_ref_[MAX_TARGETS]{};

    // Per-target log state (for transition-only logging)
    int target_log_zone_[MAX_TARGETS]{};      // zone confirmed in last tick (-1 = none)
    bool target_log_in_room_[MAX_TARGETS]{};  // was in room last tick

    // Sensor presence state tracking
    SensorPresenceState static_state_ = SensorPresenceState::INACTIVE;
    SensorPresenceState motion_state_ = SensorPresenceState::INACTIVE;
    float static_pending_since_ = -1.0f;
    float motion_pending_since_ = -1.0f;
    bool sensors_ever_active_ = false;  // true once any sensor has been ACTIVE
    bool prev_occupancy_ = false;       // previous tick's occupancy for transition logging

    // Sensor-assisted clear ("force-clear") config + grace-timer state.
    // enabled defaults true (preserve shipped behaviour); timeout defaults 0
    // so an un-pushed device clears immediately like today. since = -1 sentinel
    // (no grace timer running).
    bool assisted_clear_enabled_ = true;
    float assisted_clear_timeout_s_ = 0.0f;
    float assisted_clear_since_ = -1.0f;

    ProcessingResult result_{};

    /// Find the ZoneRuntime index for a given zone_id. Returns -1 if not found.
    /// Invariant: slot index == config.id; established by parse_zone_configs.
    int find_zone_index(int zone_id) const;

    /// Append a log entry to result_.log[] (silently drops if full)
    void log_(LogLevel level, const char* fmt, ...)
        __attribute__((format(printf, 3, 4)));
};

}  // namespace epp
