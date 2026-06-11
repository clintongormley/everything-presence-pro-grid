#include "epp_zone_engine.h"

#include <algorithm>
#include <cmath>
#include <cstdarg>
#include <cstddef>
#include <cstdio>
#include <cstring>

namespace epp {

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

void ZoneEngine::log_(LogLevel level, const char* fmt, ...) {
    if (result_.log_count >= MAX_LOG_ENTRIES) return;
    LogEntry& entry = result_.log[result_.log_count];
    entry.level = level;
    va_list args;
    va_start(args, fmt);
    vsnprintf(entry.message, sizeof(entry.message), fmt, args);
    va_end(args);
    result_.log_count++;
}

// ---------------------------------------------------------------------------
// Construction / configuration
// ---------------------------------------------------------------------------

ZoneEngine::ZoneEngine() {
    // Every array/scalar member is already zero-initialized by its in-class
    // brace initializer; only the -1 "unknown" sentinels need explicit setup.
    for (int i = 0; i < MAX_TARGETS; ++i) {
        target_log_zone_[i] = -1;
        target_last_zone_[i] = -1;
        dismissed_cell_[i] = -1;
    }
}

void ZoneEngine::set_grid(const Grid& grid) {
    grid_ = grid;
    // Per-target prev-cell coords are indexed by the OLD grid's coordinate
    // system; reset them so the next tick computes fresh continuity from the
    // new grid. dismissed_cell_ is also a cell-index reference under the OLD
    // grid — keeping it would silently suppress occupancy at whatever room
    // location the same index now points to. target_log_zone_ /
    // target_log_in_room_ are also OLD-grid-relative; carrying them across
    // would emit spurious "left zone" / "below threshold" entries on the
    // first post-edit tick. Zone state is intentionally preserved (only
    // set_zones resets).
    for (int i = 0; i < MAX_TARGETS; ++i) {
        target_has_prev_[i] = false;
        target_has_prev_xy_[i] = false;
        target_gate_count_[i] = 0;
        target_overlay_sticky_[i] = false;
        target_last_zone_[i] = -1;
        dismissed_cell_[i] = -1;
        target_log_zone_[i] = -1;
        target_log_in_room_[i] = false;
        stuck_has_ref_[i] = false;
    }
}

const Grid& ZoneEngine::grid() const {
    return grid_;
}

void ZoneEngine::set_zones(const ZoneConfig zones[], int count) {
    // Reset every slot up front (not just the ones we're about to configure)
    // so a disabled slot can't carry stale state into a future re-enable.
    std::memset(zone_enabled_, 0, sizeof(zone_enabled_));
    for (int i = 0; i < MAX_ZONE_SLOTS; ++i) {
        zones_[i] = ZoneRuntime{};
    }

    // Zone 0 gets ZoneConfig's in-class defaults; the wire payload's slot 0
    // overrides below if supplied.
    zone_enabled_[0] = true;
    zone_count_ = 1;

    // Invariant (set by parse_zone_configs): zc.id IS the slot index, in
    // [0, MAX_ZONE_SLOTS). Manual callers must follow suit; out-of-range or
    // duplicate ids are silently dropped (last-writer-wins on duplicates).
    for (int i = 0; i < count; ++i) {
        const ZoneConfig& zc = zones[i];
        int idx = zc.id;
        if (idx < 0 || idx >= MAX_ZONE_SLOTS) continue;

        if (idx == 0) {
            zones_[0].config = zc;
        } else {
            zones_[idx].config = zc;
            zone_enabled_[idx] = true;
            if (idx >= zone_count_) {
                zone_count_ = idx + 1;
            }
        }
    }

    // Reset per-target tracking — including target_last_zone_ (zone-membership
    // memory) and dismissed_cell_ (sticky dismiss). Otherwise a manual dismiss
    // before a re-config can silently suppress occupancy in the new layout.
    for (int i = 0; i < MAX_TARGETS; ++i) {
        target_has_prev_[i] = false;
        target_has_prev_xy_[i] = false;
        target_gate_count_[i] = 0;
        target_log_zone_[i] = -1;
        target_log_in_room_[i] = false;
        target_last_zone_[i] = -1;
        dismissed_cell_[i] = -1;
        target_overlay_sticky_[i] = false;
        stuck_has_ref_[i] = false;
    }

    // Reset sensor state
    static_state_ = SensorPresenceState::INACTIVE;
    motion_state_ = SensorPresenceState::INACTIVE;
    static_pending_since_ = -1.0f;
    motion_pending_since_ = -1.0f;
    sensors_ever_active_ = false;
    prev_occupancy_ = false;
}

void ZoneEngine::dismiss_target(int target_index, int cell_index) {
    if (target_index < 0 || target_index >= MAX_TARGETS) return;
    dismissed_cell_[target_index] = cell_index;

    // Drop only THIS target's confirmation bit. Other targets confirmed in the
    // same zone keep their evidence — clearing the whole bitmask would falsely
    // unoccupy a still-populated zone.
    if (cell_index >= 0 && cell_index < grid_.cell_count() && grid_.cell_is_room(cell_index)) {
        int zone_id = grid_.cell_zone(cell_index);
        int zi = find_zone_index(zone_id);
        if (zi >= 0) {
            ZoneRuntime& rt = zones_[zi];
            rt.confirmed_targets &= ~(1 << target_index);
            if (rt.confirmed_targets == 0) {
                // Last evidence gone — collapse the zone to CLEAR immediately.
                // (We do NOT route through PENDING_CLEAR here: a manual dismiss
                // is an explicit user action, not a sensor-driven transition.)
                rt.state = ZoneState::CLEAR;
                rt.pending_since = -1.0f;
            }
            // If other bits remain, leave state/pending_since alone — the
            // tick loop will run state machine on next frame as usual.
        }
    }

    // Reset this target's tracking only.
    target_has_prev_[target_index] = false;
    target_gate_count_[target_index] = 0;
    target_overlay_sticky_[target_index] = false;
    target_last_zone_[target_index] = -1;
    stuck_has_ref_[target_index] = false;
}

void ZoneEngine::set_stuck_target_timeout(float seconds) {
    stuck_target_timeout_s_ = seconds < 0.0f ? 0.0f : seconds;
}

int ZoneEngine::find_zone_index(int zone_id) const {
    if (zone_id < 0 || zone_id >= zone_count_) return -1;
    if (!zone_enabled_[zone_id]) return -1;
    return zone_id;
}

// ---------------------------------------------------------------------------
// tick() — the core state machine, matching Python ZoneEngine._tick()
// ---------------------------------------------------------------------------

const ProcessingResult& ZoneEngine::tick(const WindowOutput& window, float timestamp,
                                         const SensorInput& sensors) {
    // Snapshot previous states for transition logging
    ZoneState prev_zone_state[MAX_ZONE_SLOTS]{};
    for (int zi = 0; zi < zone_count_; ++zi) {
        if (zone_enabled_[zi]) {
            prev_zone_state[zones_[zi].config.id] = zones_[zi].state;
        }
    }
    SensorPresenceState prev_static = static_state_;
    SensorPresenceState prev_motion = motion_state_;

    // Clear result (skip zeroing log buffer — log_count gates access)
    std::memset(&result_, 0, offsetof(ProcessingResult, log));
    result_.log_count = 0;
    result_.frame_count = window.total_frames;

    // Per-zone tracking: confirmed flag, best signal, and target count
    bool zone_confirmed[MAX_ZONE_SLOTS]{};
    int zone_signal[MAX_ZONE_SLOTS]{};
    int zone_target_count[MAX_ZONE_SLOTS]{};

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

    // Per-target state for transition logging
    int target_confirmed_zone[MAX_TARGETS];
    bool target_in_room[MAX_TARGETS]{};
    for (int i = 0; i < MAX_TARGETS; ++i) target_confirmed_zone[i] = -1;

    // target_last_zone_[i] persists the last zone a target was in while in-room.
    // Used by overlay exit handoff (Step 2b) to know which zone to accelerate.

    // -----------------------------------------------------------------------
    // Step 1: Per-target evaluation (Python lines 510-604)
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        const TargetWindow& tw = window.targets[i];

        if (!tw.active) {
            // Target gone: clear tracking state
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            stuck_has_ref_[i] = false;
            continue;
        }

        target_active[i] = true;
        // Signal = number of frames in the rolling window where the target
        // was active, capped at 9. Identical to the value the frontend
        // receives, so the firmware's signal-vs-trigger comparison reaches
        // the same decision as the frontend's editor preview.
        int signal = frame_count_to_signal(tw.frame_count);
        int cell = grid_.xy_to_cell(tw.median_x, tw.median_y);

        if (cell == -1 || !grid_.cell_is_room(cell)) {
            target_signal[i] = signal;
            target_has_signal[i] = true;
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            stuck_has_ref_[i] = false;
            continue;
        }

        target_signal[i] = signal;
        target_has_signal[i] = true;
        target_in_room[i] = true;

        // Check if this target is dismissed at this cell
        if (dismissed_cell_[i] == cell) {
            // Target still at dismissed location — skip
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            continue;
        } else if (dismissed_cell_[i] >= 0) {
            // Target moved to a different cell — clear dismiss
            dismissed_cell_[i] = -1;
        }

        // Stuck-target detection: dwell at exactly the same (x, y) for
        // stuck_target_timeout_s_ seconds → auto-dismiss via the same path
        // as a manual click-dismiss. 0 disables.
        if (stuck_target_timeout_s_ > 0.0f) {
            // Bit-exact comparison is intentional: LD2450 produces deterministic per-tick coordinates, and any 1mm jitter from a real human breaks the streak. See design doc.
            if (stuck_has_ref_[i] &&
                tw.median_x == stuck_ref_x_[i] &&
                tw.median_y == stuck_ref_y_[i]) {
                if (timestamp - stuck_since_s_[i] >= stuck_target_timeout_s_) {
                    log_(LogLevel::INFO,
                         "T%d auto-dismissed (stuck at %.1f,%.1f for %.1fs)",
                         i, tw.median_x, tw.median_y, stuck_target_timeout_s_);
                    dismiss_target(i, cell);
                    // dismiss_target reset target_has_prev_/gate/overlay/last_zone/stuck for us.
                    // Skip remaining per-target work — the dismiss collapses the zone.
                    continue;
                }
            } else {
                stuck_ref_x_[i] = tw.median_x;
                stuck_ref_y_[i] = tw.median_y;
                stuck_since_s_[i] = timestamp;
                stuck_has_ref_[i] = true;
            }
        }

        // Interference suppress: skip this cell entirely
        int overlay = grid_.cell_overlay(cell);
        if (overlay == CELL_OVERLAY_SUPPRESS) {
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            continue;
        }
        bool has_interference = (overlay == CELL_OVERLAY_INTERFERENCE);

        // Engine-side sticky overlay flag: track whichever of (raw-frame
        // sticky from component, current cell is entry overlay) was true
        // while this target was in-room. Step 2b reads this — never
        // window.targets[i].on_overlay — so we don't depend on the caller
        // continuing to set on_overlay after the target goes inactive.
        target_overlay_sticky_[i] = tw.on_overlay || (overlay == CELL_OVERLAY_ENTRY);

        int zone_id = grid_.cell_zone(cell);
        target_zone_curr[i] = zone_id;
        target_last_zone_[i] = zone_id;

        // Store actual x,y for faded-dot rendering
        target_prev_x_[i] = tw.median_x;
        target_prev_y_[i] = tw.median_y;
        target_has_prev_xy_[i] = true;

        // Compute current cell position as (col, row). Reuse Grid's helper
        // so this and xy_to_cell stay in lockstep on rounding/sign behaviour.
        int col = 0, row = 0;
        if (!grid_.xy_to_col_row(tw.median_x, tw.median_y, col, row)) {
            // Should be unreachable: cell != -1 above already guaranteed inside-grid.
            // Bail defensively rather than store garbage in target_prev_col_/row_.
            target_has_prev_[i] = false;
            target_gate_count_[i] = 0;
            continue;
        }

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

        // Track best signal and target count per zone
        zone_signal[zone_id] = std::max(zone_signal[zone_id], signal);
        zone_target_count[zone_id]++;

        // Determine if this target is confirmed in this zone
        int zi = find_zone_index(zone_id);
        if (zi >= 0) {
            ZoneRuntime& rt = zones_[zi];
            int trigger_thresh = clamp_threshold(rt.config.trigger);
            int renew_thresh = clamp_threshold(rt.config.renew);

            // No first appearance: targets cannot originate in interference zones.
            // They must be handed off from a clean zone (continuity required).
            // Only applies when zone is CLEAR — once occupied, targets can be re-confirmed.
            if (has_interference && !continuous && rt.state == ZoneState::CLEAR) {
                target_has_prev_[i] = false;
                target_gate_count_[i] = 0;
                continue;
            }

            // Interference: renew requires signal 9 to prevent fans sustaining occupancy
            if (has_interference) {
                renew_thresh = 9;
            }

            // Determine effective threshold based on zone state
            int base_thresh;
            if (rt.state == ZoneState::CLEAR) {
                base_thresh = trigger_thresh;
            } else {
                // OCCUPIED or PENDING_CLEAR
                base_thresh = renew_thresh;
            }

            // Use raw-frame on_overlay (sticky from component) — catches cases
            // where the median position hasn't reached the overlay cell yet.
            bool on_overlay = target_overlay_sticky_[i];
            bool needs_gating = !on_overlay && !continuous;
            // Instant entry suppressed when target cell carries interference —
            // overlay on a neighbour must not negate the raised threshold.
            if (on_overlay && rt.state == ZoneState::CLEAR && !has_interference) {
                base_thresh = 1;
            }

            if (needs_gating && rt.state == ZoneState::CLEAR) {
                // Gating: raise threshold and require consecutive qualifying ticks.
                // At 10Hz tick rate, 2 ticks = ~200ms — enough to filter single-frame
                // noise but fast enough to feel responsive. If false positives become
                // a problem, options:
                //   - Increase gate count (e.g. 10-20 for ~1-2s wall-clock delay)
                //   - Switch to wall-clock gating (require sustained signal for N seconds)
                //   - Increase gated_thresh offset (currently +2)
                int gated_thresh = std::min(base_thresh + 2, 8);
                if (signal >= gated_thresh) {
                    target_gate_count_[i] += 1;
                    if (target_gate_count_[i] >= 2) {
                        // Confirmed after 2 qualifying ticks
                        target_confirmed_zone[i] = zone_id;
                        zone_confirmed[zone_id] = true;
                        rt.confirmed_targets |= (1 << i);
                        target_prev_col_[i] = col;
                        target_prev_row_[i] = row;
                        target_has_prev_[i] = true;
                        target_gate_count_[i] = 0;
                    } else {
                        // gate_count == 1: record position for next tick's
                        // distance check but don't confirm
                        log_(LogLevel::DEBUG, "T%d gating in zone %d (%d/2, signal %d)",
                             i, zone_id, target_gate_count_[i], signal);
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
                if (signal >= base_thresh) {
                    target_confirmed_zone[i] = zone_id;
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
    // Step 1b: Per-target transition logging (event-driven, not per-tick)
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        int prev_zone = target_log_zone_[i];
        int curr_zone = target_confirmed_zone[i];
        bool was_in_room = target_log_in_room_[i];
        bool is_in_room = target_in_room[i];

        // Entered a zone (newly confirmed or changed zone)
        if (curr_zone >= 0 && curr_zone != prev_zone) {
            log_(LogLevel::DEBUG, "T%d entered zone %d (signal %d)",
                 i, curr_zone, target_signal[i]);
        }

        // Left a zone — use specific reason when available
        if (prev_zone >= 0 && curr_zone != prev_zone) {
            if (curr_zone >= 0) {
                // Moved to another zone (handoff will log separately)
            } else if (is_in_room) {
                // Still in room but signal dropped
                log_(LogLevel::DEBUG, "T%d below threshold in zone %d (signal %d)",
                     i, prev_zone, target_signal[i]);
            } else if (target_active[i]) {
                // Target left the room entirely
                log_(LogLevel::DEBUG, "T%d left room (was zone %d)", i, prev_zone);
            } else {
                log_(LogLevel::DEBUG, "T%d left zone %d", i, prev_zone);
            }
        }

        // Left room (was in room, target still tracked but outside)
        if (was_in_room && !is_in_room && target_active[i] && prev_zone < 0) {
            log_(LogLevel::DEBUG, "T%d left room", i);
        }

        // Update log state for next tick
        target_log_zone_[i] = curr_zone;
        target_log_in_room_[i] = is_in_room;
    }

    // -----------------------------------------------------------------------
    // Step 2: Handoff detection (Python lines 606-632)
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        int prev_zid = target_zone_prev[i];
        int curr_zid = target_zone_curr[i];
        if (prev_zid < 0 || curr_zid < 0 || prev_zid == curr_zid) continue;

        // Target i moved from prev_zid to curr_zid
        log_(LogLevel::DEBUG, "T%d handoff zone %d -> zone %d", i, prev_zid, curr_zid);
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
    // Step 2b: Overlay exit handoff — target disappears from overlay cell
    // When the last confirmed target goes inactive from an overlay cell,
    // accelerate the pending clear to use handoff_timeout instead of timeout.
    // We keep confirmed_targets intact so the target renders as PENDING.
    // -----------------------------------------------------------------------
    for (int i = 0; i < MAX_TARGETS; ++i) {
        bool gone = !target_active[i];
        bool left_room = target_active[i] && target_zone_curr[i] < 0;
        // Use engine's sticky bit, not window.targets[i].on_overlay — we
        // can't rely on a caller maintaining stickiness for inactive targets.
        bool on_overlay = target_overlay_sticky_[i];
        if ((gone || left_room) && on_overlay) {
            int prev_zid = target_last_zone_[i];
            int zi = find_zone_index(prev_zid);
            if (zi >= 0) {
                ZoneRuntime& rt = zones_[zi];
                int remaining = rt.confirmed_targets & ~(1 << i);
                if (remaining == 0) {
                    float accel = timestamp - (rt.config.timeout - rt.config.handoff_timeout);
                    if (rt.state == ZoneState::OCCUPIED) {
                        rt.state = ZoneState::PENDING_CLEAR;
                        rt.pending_since = accel;
                    } else if (rt.state == ZoneState::PENDING_CLEAR && rt.pending_since > accel) {
                        rt.pending_since = accel;
                    }
                    log_(LogLevel::DEBUG, "T%d overlay exit handoff: zone %d, handoff=%.1fs",
                         i, prev_zid, rt.config.handoff_timeout);
                }
                // Consume: don't re-fire on subsequent ticks. Only when the
                // zone lookup succeeded — consuming for a disabled zone would
                // throw the handoff state away without ever using it (the TS
                // engine mirrors this exactly).
                target_last_zone_[i] = -1;
                target_overlay_sticky_[i] = false;
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
        result_.zone_target_counts[zone_id] = zone_target_count[zone_id];

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
    // NOTE: zone state-transition logging is deferred until after Step 5c so
    // that force-clear (which can run AFTER step 3 and rewrite state) emits
    // its own "clear" transition log instead of being silently swallowed.

    // -----------------------------------------------------------------------
    // Step 4: Per-target results (Python lines 661-701)
    // Always populate x/y/signal from raw sensor data so the frontend can
    // make its own zone engine decisions with unsaved grid edits.
    // -----------------------------------------------------------------------
    result_.target_count = 0;
    for (int i = 0; i < MAX_TARGETS; ++i) {
        const TargetWindow& tw = window.targets[i];
        TargetResult& tr = result_.targets[result_.target_count];
        bool in_room = (target_zone_curr[i] >= 0);

        if (target_active[i] && target_has_signal[i] && target_signal[i] > 0 && in_room) {
            tr.x = tw.median_x;
            tr.y = tw.median_y;
            tr.status = TargetStatus::ACTIVE;
            tr.signal = target_signal[i];
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
                // Pending: use last-known in-room position for faded dot
                if (target_has_prev_xy_[i]) {
                    tr.x = target_prev_x_[i];
                    tr.y = target_prev_y_[i];
                } else {
                    tr.x = NAN;
                    tr.y = NAN;
                }
                tr.status = TargetStatus::PENDING;
                tr.signal = 0;
            } else if (tw.active && target_has_signal[i]) {
                // Not confirmed but sensor sees target — send raw position
                // so frontend can process with its own (possibly edited) grid
                tr.x = tw.median_x;
                tr.y = tw.median_y;
                tr.status = TargetStatus::INACTIVE;
                tr.signal = target_signal[i];
            } else {
                tr.x = NAN;
                tr.y = NAN;
                tr.status = TargetStatus::INACTIVE;
                tr.signal = 0;
            }
        }
        result_.target_count++;
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
    // Step 5b: Sensor presence state machine
    // -----------------------------------------------------------------------
    if (sensors.static_on) {
        static_state_ = SensorPresenceState::ACTIVE;
        static_pending_since_ = -1.0f;
        sensors_ever_active_ = true;
    } else if (static_state_ == SensorPresenceState::ACTIVE) {
        static_state_ = SensorPresenceState::PENDING;
        static_pending_since_ = timestamp;
    } else if (static_state_ == SensorPresenceState::PENDING) {
        if (static_pending_since_ >= 0.0f &&
            (timestamp - static_pending_since_) >= sensors.static_timeout) {
            static_state_ = SensorPresenceState::INACTIVE;
            static_pending_since_ = -1.0f;
        }
    }

    if (sensors.motion_on) {
        motion_state_ = SensorPresenceState::ACTIVE;
        motion_pending_since_ = -1.0f;
        sensors_ever_active_ = true;
    } else if (motion_state_ == SensorPresenceState::ACTIVE) {
        motion_state_ = SensorPresenceState::PENDING;
        motion_pending_since_ = timestamp;
    } else if (motion_state_ == SensorPresenceState::PENDING) {
        if (motion_pending_since_ >= 0.0f &&
            (timestamp - motion_pending_since_) >= sensors.motion_timeout) {
            motion_state_ = SensorPresenceState::INACTIVE;
            motion_pending_since_ = -1.0f;
        }
    }

    // Log sensor state transitions
    if (static_state_ != prev_static) {
        const char* name =
            static_state_ == SensorPresenceState::ACTIVE ? "active" :
            static_state_ == SensorPresenceState::PENDING ? "pending" : "inactive";
        log_(LogLevel::INFO, "Static: %s", name);
    }
    if (motion_state_ != prev_motion) {
        const char* name =
            motion_state_ == SensorPresenceState::ACTIVE ? "active" :
            motion_state_ == SensorPresenceState::PENDING ? "pending" : "inactive";
        log_(LogLevel::INFO, "Motion: %s", name);
    }

    result_.static_state = static_state_;
    result_.motion_state = motion_state_;

    // -----------------------------------------------------------------------
    // Step 5c: Force-clear pending zones when all sensors inactive
    // Only applies once sensors have been seen as active (prevents force-clear
    // in sensor-free deployments where sensors are always INACTIVE by default).
    // -----------------------------------------------------------------------
    if (sensors_ever_active_ &&
        static_state_ == SensorPresenceState::INACTIVE &&
        motion_state_ == SensorPresenceState::INACTIVE) {
        bool any_occupied = false;
        for (int zi = 0; zi < zone_count_; ++zi) {
            if (!zone_enabled_[zi]) continue;
            if (zones_[zi].state == ZoneState::OCCUPIED) {
                any_occupied = true;
                break;
            }
        }
        if (!any_occupied) {
            for (int zi = 0; zi < zone_count_; ++zi) {
                if (!zone_enabled_[zi]) continue;
                if (zones_[zi].state == ZoneState::PENDING_CLEAR) {
                    int zid = zones_[zi].config.id;
                    log_(LogLevel::INFO, "Zone %d: force-clear", zid);
                    zones_[zi].state = ZoneState::CLEAR;
                    zones_[zi].pending_since = -1.0f;
                    zones_[zi].confirmed_targets = 0;
                    result_.zone_occupancy[zid] = false;
                    result_.zone_states[zid] = ZoneState::CLEAR;
                }
            }
        }
    }

    // Deferred state-transition logging (after Step 3 + Step 5c).
    // Force-clear can rewrite state from PENDING_CLEAR to CLEAR; doing the
    // transition log here means the user sees the final state transition
    // instead of step 3's intermediate value being swallowed.
    for (int zi = 0; zi < zone_count_; ++zi) {
        if (!zone_enabled_[zi]) continue;
        ZoneRuntime& rt = zones_[zi];
        int zone_id = rt.config.id;
        if (rt.state != prev_zone_state[zone_id]) {
            const char* state_name =
                rt.state == ZoneState::OCCUPIED ? "occupied" :
                rt.state == ZoneState::PENDING_CLEAR ? "pending" : "clear";
            log_(LogLevel::INFO, "Zone %d: %s", zone_id, state_name);
        }
    }

    // -----------------------------------------------------------------------
    // Step 5d: Compute occupancy (any zone occupied/pending OR sensor active/pending)
    // -----------------------------------------------------------------------
    result_.occupancy = false;
    if (static_state_ != SensorPresenceState::INACTIVE ||
        motion_state_ != SensorPresenceState::INACTIVE) {
        result_.occupancy = true;
    } else {
        for (int zi = 0; zi < zone_count_; ++zi) {
            if (!zone_enabled_[zi]) continue;
            if (result_.zone_occupancy[zones_[zi].config.id]) {
                result_.occupancy = true;
                break;
            }
        }
    }

    // mmwave: combines static presence + target tracker, ignores motion (PIR).
    // On when static is active/pending OR any zone is OCCUPIED.
    // PENDING_CLEAR alone (target tracker "pending") does not count.
    result_.mmwave = false;
    if (static_state_ != SensorPresenceState::INACTIVE) {
        result_.mmwave = true;
    } else {
        for (int zi = 0; zi < zone_count_; ++zi) {
            if (!zone_enabled_[zi]) continue;
            if (zones_[zi].state == ZoneState::OCCUPIED) {
                result_.mmwave = true;
                break;
            }
        }
    }

    // Log occupancy transitions
    if (result_.occupancy != prev_occupancy_) {
        log_(LogLevel::INFO, "Occupancy: %s", result_.occupancy ? "on" : "off");
        prev_occupancy_ = result_.occupancy;
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
