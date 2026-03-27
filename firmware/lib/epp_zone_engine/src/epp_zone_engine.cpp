#include "epp_zone_engine.h"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace epp {

// ---------------------------------------------------------------------------
// Construction / configuration
// ---------------------------------------------------------------------------

ZoneEngine::ZoneEngine() {
    std::memset(target_prev_col_, 0, sizeof(target_prev_col_));
    std::memset(target_prev_row_, 0, sizeof(target_prev_row_));
    std::memset(target_has_prev_, 0, sizeof(target_has_prev_));
    std::memset(target_prev_x_, 0, sizeof(target_prev_x_));
    std::memset(target_prev_y_, 0, sizeof(target_prev_y_));
    std::memset(target_has_prev_xy_, 0, sizeof(target_has_prev_xy_));
    std::memset(target_gate_count_, 0, sizeof(target_gate_count_));
}

void ZoneEngine::set_grid(const Grid& grid) {
    grid_ = grid;
}

const Grid& ZoneEngine::grid() const {
    return grid_;
}

void ZoneEngine::set_zones(const ZoneConfig zones[], int count) {
    // Clear all slots
    std::memset(zone_enabled_, 0, sizeof(zone_enabled_));

    // Always include zone 0 (room-level) with normal type defaults.
    ZoneTypeDefaults defaults = zone_type_defaults(ZoneType::NORMAL);
    zones_[0] = ZoneRuntime{};
    zones_[0].config.id = 0;
    zones_[0].config.type = ZoneType::NORMAL;
    zones_[0].config.trigger = defaults.trigger;
    zones_[0].config.renew = defaults.renew;
    zones_[0].config.timeout = defaults.timeout;
    zones_[0].config.handoff_timeout = defaults.handoff_timeout;
    zones_[0].config.entry_point = false;
    zone_enabled_[0] = true;
    zone_count_ = 1;

    for (int i = 0; i < count; ++i) {
        const ZoneConfig& zc = zones[i];
        int idx = zc.id;
        if (idx < 0 || idx >= MAX_ZONE_SLOTS) continue;

        if (idx == 0) {
            // Override zone 0 with provided config
            zones_[0] = ZoneRuntime{};
            zones_[0].config = zc;
        } else {
            zones_[idx] = ZoneRuntime{};
            zones_[idx].config = zc;
            zone_enabled_[idx] = true;
            if (idx >= zone_count_) {
                zone_count_ = idx + 1;
            }
        }
    }

    // Reset per-target tracking
    for (int i = 0; i < MAX_TARGETS; ++i) {
        target_has_prev_[i] = false;
        target_has_prev_xy_[i] = false;
        target_gate_count_[i] = 0;
    }
}

int ZoneEngine::find_zone_index(int zone_id) const {
    if (zone_id < 0 || zone_id >= zone_count_) return -1;
    if (!zone_enabled_[zone_id]) return -1;
    return zone_id;
}

// ---------------------------------------------------------------------------
// tick() — the core state machine, matching Python ZoneEngine._tick()
// ---------------------------------------------------------------------------

const ProcessingResult& ZoneEngine::tick(const WindowOutput& window, float timestamp) {
    int frames = std::max(window.total_frames, RAW_FPS);

    // Clear result
    result_ = ProcessingResult{};
    result_.frame_count = frames;

    // Per-zone tracking: confirmed flag and best signal
    bool zone_confirmed[MAX_ZONE_SLOTS]{};
    int zone_signal[MAX_ZONE_SLOTS]{};

    // Per-target zone assignments for handoff detection
    int target_zone_prev[MAX_TARGETS];
    int target_zone_curr[MAX_TARGETS];
    int target_signal[MAX_TARGETS]{};
    bool target_has_signal[MAX_TARGETS]{};
    for (int i = 0; i < MAX_TARGETS; ++i) {
        target_zone_prev[i] = -1;  // -1 = None
        target_zone_curr[i] = -1;
    }

    // Track which targets are active
    bool target_active[MAX_TARGETS]{};

    // -----------------------------------------------------------------------
    // Step 1: Per-target evaluation (Python lines 510-604)
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        const TargetWindow& tw = window.targets[i];

        if (!tw.active) {
            // Target gone: clear tracking state
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            continue;
        }

        target_active[i] = true;
        // Signal = proportion of frames target was active (0-9 scale, rounded)
        int signal = (frames > 0) ? std::min((tw.frame_count * 9 + frames / 2) / frames, 9) : 0;
        int cell = grid_.xy_to_cell(tw.median_x, tw.median_y);

        if (cell == -1 || !grid_.cell_is_room(cell)) {
            target_signal[i] = signal;
            target_has_signal[i] = true;
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            continue;
        }

        target_signal[i] = signal;
        target_has_signal[i] = true;
        int zone_id = grid_.cell_zone(cell);
        target_zone_curr[i] = zone_id;

        // Store actual x,y for faded-dot rendering
        target_prev_x_[i] = tw.median_x;
        target_prev_y_[i] = tw.median_y;
        target_has_prev_xy_[i] = true;

        // Compute current cell position as (col, row)
        int col = static_cast<int>((tw.median_x - grid_.origin_x()) / grid_.cell_size());
        int row = static_cast<int>((tw.median_y - grid_.origin_y()) / grid_.cell_size());

        // Determine previous zone from previous position
        if (target_has_prev_[i]) {
            int prev_col = target_prev_col_[i];
            int prev_row = target_prev_row_[i];
            float prev_cx = grid_.origin_x() + prev_col * grid_.cell_size() + grid_.cell_size() / 2.0f;
            float prev_cy = grid_.origin_y() + prev_row * grid_.cell_size() + grid_.cell_size() / 2.0f;
            int prev_cell = grid_.xy_to_cell(prev_cx, prev_cy);
            if (prev_cell != -1) {
                target_zone_prev[i] = grid_.cell_zone(prev_cell);
            }
        }

        // Continuity check: Chebyshev distance from previous position
        bool continuous = false;
        if (target_has_prev_[i]) {
            int dist_col = std::abs(col - target_prev_col_[i]);
            int dist_row = std::abs(row - target_prev_row_[i]);
            int dist = std::max(dist_col, dist_row);
            continuous = (dist <= MAX_MOVEMENT_CELLS);
        }

        // Track best signal per zone
        zone_signal[zone_id] = std::max(zone_signal[zone_id], signal);

        // Determine if this target is confirmed in this zone
        int zi = find_zone_index(zone_id);
        if (zi >= 0) {
            ZoneRuntime& rt = zones_[zi];
            int trigger_thresh = threshold_to_frame_count(rt.config.trigger);
            int renew_thresh = threshold_to_frame_count(rt.config.renew);

            // Determine effective threshold based on zone state
            int base_thresh;
            if (rt.state == ZoneState::CLEAR) {
                base_thresh = trigger_thresh;
            } else {
                // OCCUPIED or PENDING_CLEAR
                base_thresh = renew_thresh;
            }

            bool entry_point = rt.config.entry_point;
            bool needs_gating = !entry_point && !continuous;

            if (needs_gating && rt.state == ZoneState::CLEAR) {
                // Gating: raise threshold, cap at 8
                int gated_thresh = std::min(base_thresh + 2, 8);
                if (tw.frame_count >= gated_thresh) {
                    target_gate_count_[i] += 1;
                    if (target_gate_count_[i] >= 2) {
                        // Confirmed after 2 qualifying ticks
                        zone_confirmed[zone_id] = true;
                        rt.confirmed_targets |= (1 << i);
                        target_prev_col_[i] = col;
                        target_prev_row_[i] = row;
                        target_has_prev_[i] = true;
                        target_gate_count_[i] = 0;
                    } else {
                        // gate_count == 1: record position for next tick's
                        // distance check but don't confirm
                        target_prev_col_[i] = col;
                        target_prev_row_[i] = row;
                        target_has_prev_[i] = true;
                    }
                } else {
                    // Below gated threshold: reset tracking
                    target_has_prev_[i] = false;
                    target_gate_count_[i] = 0;
                }
            } else {
                // Not gated: entry point zone, continuous movement,
                // or already occupied/pending
                if (tw.frame_count >= base_thresh) {
                    zone_confirmed[zone_id] = true;
                    rt.confirmed_targets |= (1 << i);
                    target_prev_col_[i] = col;
                    target_prev_row_[i] = row;
                    target_has_prev_[i] = true;
                    target_gate_count_[i] = 0;
                } else {
                    target_prev_col_[i] = col;
                    target_prev_row_[i] = row;
                    target_has_prev_[i] = true;
                }
            }
        } else {
            // No runtime for this zone — still record position for continuity
            target_prev_col_[i] = col;
            target_prev_row_[i] = row;
            target_has_prev_[i] = true;
        }
    }

    // -----------------------------------------------------------------------
    // Step 2: Handoff detection (Python lines 606-632)
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        int prev_zid = target_zone_prev[i];
        int curr_zid = target_zone_curr[i];
        if (prev_zid < 0 || curr_zid < 0 || prev_zid == curr_zid) continue;

        // Target i moved from prev_zid to curr_zid
        int src_zi = find_zone_index(prev_zid);
        if (src_zi >= 0) {
            ZoneRuntime& src_rt = zones_[src_zi];
            // Remove this target from the source zone's confirmed set
            src_rt.confirmed_targets &= ~(1 << i);
            // If this was the last confirmed target and zone is occupied,
            // accelerate pending timeout
            if (src_rt.confirmed_targets == 0 && src_rt.state == ZoneState::OCCUPIED) {
                src_rt.state = ZoneState::PENDING_CLEAR;
                src_rt.pending_since = timestamp - (src_rt.config.timeout - src_rt.config.handoff_timeout);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Step 3: State machine per zone (Python lines 635-659)
    // -----------------------------------------------------------------------
    for (int zi = 0; zi < zone_count_; ++zi) {
        if (!zone_enabled_[zi]) continue;
        ZoneRuntime& rt = zones_[zi];
        int zone_id = rt.config.id;
        bool confirmed = zone_confirmed[zone_id];
        result_.zone_target_counts[zone_id] = zone_signal[zone_id];

        switch (rt.state) {
            case ZoneState::CLEAR:
                if (confirmed) {
                    rt.state = ZoneState::OCCUPIED;
                    rt.pending_since = -1.0f;
                }
                break;

            case ZoneState::OCCUPIED:
                if (!confirmed) {
                    rt.state = ZoneState::PENDING_CLEAR;
                    rt.pending_since = timestamp;
                }
                break;

            case ZoneState::PENDING_CLEAR:
                if (confirmed) {
                    rt.state = ZoneState::OCCUPIED;
                    rt.pending_since = -1.0f;
                } else if (rt.pending_since >= 0.0f &&
                           (timestamp - rt.pending_since) >= rt.config.timeout) {
                    rt.state = ZoneState::CLEAR;
                    rt.pending_since = -1.0f;
                    rt.confirmed_targets = 0;
                }
                break;
        }

        result_.zone_occupancy[zone_id] = (rt.state != ZoneState::CLEAR);
        result_.zone_states[zone_id] = rt.state;
    }

    // -----------------------------------------------------------------------
    // Step 4: Per-target results (Python lines 661-701)
    // -----------------------------------------------------------------------
    result_.target_count = 0;
    for (int i = 0; i < MAX_TARGETS; ++i) {
        bool in_room = (target_zone_curr[i] >= 0);

        if (target_active[i] && target_has_signal[i] && target_signal[i] > 0 && in_room) {
            const TargetWindow& tw = window.targets[i];
            TargetResult& tr = result_.targets[result_.target_count];
            tr.x = tw.median_x;
            tr.y = tw.median_y;
            tr.status = TargetStatus::ACTIVE;
            tr.signal = target_signal[i];
            result_.target_count++;
        } else {
            // Check if this target is pending in any zone
            bool is_pending = false;
            if (!target_active[i] || !in_room) {
                for (int zi = 0; zi < zone_count_; ++zi) {
                    ZoneRuntime& rt = zones_[zi];
                    if (rt.state == ZoneState::PENDING_CLEAR &&
                        (rt.confirmed_targets & (1 << i)) != 0) {
                        is_pending = true;
                        break;
                    }
                }
            }

            if (is_pending) {
                TargetResult& tr = result_.targets[result_.target_count];
                if (target_has_prev_xy_[i]) {
                    tr.x = target_prev_x_[i];
                    tr.y = target_prev_y_[i];
                } else {
                    tr.x = NAN;
                    tr.y = NAN;
                }
                tr.status = TargetStatus::PENDING;
                tr.signal = 0;
                result_.target_count++;
            } else {
                TargetResult& tr = result_.targets[result_.target_count];
                tr.x = NAN;
                tr.y = NAN;
                tr.status = TargetStatus::INACTIVE;
                tr.signal = 0;
                result_.target_count++;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Step 5: Cleanup (Python lines 703-710)
    // Remove inactive targets from confirmed_targets of non-PENDING zones
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        if (!window.targets[i].active) {
            for (int zi = 0; zi < zone_count_; ++zi) {
                if (zones_[zi].state != ZoneState::PENDING_CLEAR) {
                    zones_[zi].confirmed_targets &= ~(1 << i);
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Step 6: device_tracking_present (Python line 713)
    // -----------------------------------------------------------------------
    result_.device_tracking_present = false;
    for (int zi = 0; zi < zone_count_; ++zi) {
        if (!zone_enabled_[zi]) continue;
        if (result_.zone_occupancy[zones_[zi].config.id]) {
            result_.device_tracking_present = true;
            break;
        }
    }

    return result_;
}

}  // namespace epp
