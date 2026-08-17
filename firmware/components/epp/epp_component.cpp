#include "epp_component.h"
#include "epp_zone_config_parser.h"
#include "epp_nvs_layout.h"
#include "epp_change_detector.h"
#include "epp_target_validity.h"
#include "epp_target_zone.h"
#include "epp_json_writer.h"
#include "epp_perspective_parser.h"
#include "esphome/core/log.h"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstring>
#include <mbedtls/base64.h>
#include <nvs_flash.h>
#include <nvs.h>
#include <type_traits>

namespace epp {

static const char *const TAG = "epp";
static const char *const NVS_NAMESPACE = "epp";

// Human-readable target status for the transport text sensors. Shared by the
// display and zone-state publish blocks so the strings can't drift apart.
static const char *status_str(TargetStatus status) {
  switch (status) {
    case TargetStatus::ACTIVE: return "active";
    case TargetStatus::PENDING: return "pending";
    default: return "inactive";
  }
}

void EPPComponent::setup() {
  ESP_LOGI(TAG, "EPP Zone Engine component initialized");

  // Capture boot wall-clock so the relay gate can compute a settling window.
  boot_ms_ = esphome::millis();

  // Publish firmware version
  if (firmware_version_sensor_ != nullptr) {
    firmware_version_sensor_->publish_state(FIRMWARE_VERSION_STR);
  }

  restore_from_nvs_();
}

void EPPComponent::loop() {
  uint32_t now = esphome::millis();
  float ts = now / 1000.0f;

  // === PROCESSING PIPELINE — drain ALL queued frames (if any) ===
  //
  // If loop() ran on time we drain a single frame. If ESPHome was held up
  // (e.g. by a slow component) and multiple LD2450 frames have arrived, we
  // process them all in FIFO order so the rolling window and zone engine
  // see every sample — no silent merging that would otherwise distort the
  // median or under-count detection events.
  //
  // We do NOT early-return when the ring buffer is empty: the publish
  // throttles below need to fire unconditionally so a dead LD2450 produces
  // observable "no signal" state in HA rather than every sensor freezing
  // at its last value. See is_frame_stale in epp_frame_staleness.h.
  TargetFrame frame;
  while (frame_buffer_.pop(frame)) {
    // last_frame_ms_ / has_received_frame_ are set in feed_targets so the
    // stale-frame watchdog reflects actual receipt time, not drain time.

    // Stage 1: Feed raw positions into rolling median.
    // NaN guard: LD2450 occasionally emits NaN; without this they'd poison
    // the rolling median's running stats. The window has no internal NaN
    // filter so we sanitise at the producer boundary.
    TargetInput raw_inputs[NUM_TARGETS];
    for (int i = 0; i < NUM_TARGETS; i++) {
      raw_inputs[i] = {frame.targets[i].x, frame.targets[i].y,
                       frame.targets[i].detected && frame.targets[i].y != 0.0f &&
                       std::isfinite(frame.targets[i].x) &&
                       std::isfinite(frame.targets[i].y)};
    }
    window_.feed(raw_inputs, NUM_TARGETS, now);

    // Stage 2: Get smoothed raw, transform to grid coordinates.
    // Hoist has_perspective() out of the inner loop: pre-calibration the
    // transform is identity, so we can pass median_x/median_y straight through
    // without paying the function-call overhead and identity branch per slot.
    const bool xform = transform_.has_perspective();
    const auto &win = window_.output();
    TargetInput grid_inputs[NUM_TARGETS];
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (win.targets[i].active) {
        if (xform) {
          auto [rx, ry] = transform_.apply(
              win.targets[i].median_x, win.targets[i].median_y);
          grid_inputs[i] = {rx, ry, true};
        } else {
          grid_inputs[i] = {win.targets[i].median_x, win.targets[i].median_y, true};
        }
      } else {
        grid_inputs[i] = {0.0f, 0.0f, false};
      }
    }

    // Stage 2b: Track per-frame overlay cell crossings
    // The median position may skip over boundary overlay cells, so we check
    // each raw frame's transformed position directly. The flag is sticky:
    // set when any frame lands on an overlay cell, cleared when a frame
    // lands on a non-overlay room cell.
    //
    // NOTE: this is component glue (no host-test coverage) — the equivalent
    // logic IS host-tested on the TS side (frontend overlay-tracker) and the
    // parity harness simulates this stage for the fixture scenarios; keep
    // all three in lockstep when editing.
    for (int i = 0; i < NUM_TARGETS; i++) {
      bool raw_active = raw_inputs[i].active;
      // Slot-reuse guard: the LD2450 reuses target slots, so an
      // inactive→active transition means a brand-new target. Without this
      // reset the sticky flag from the previous occupant leaks into the new
      // target, granting it instant entry-overlay confirmation it never
      // earned. Tradeoff: a single dropped raw frame also resets the flag —
      // acceptable, since a real entry re-touches the overlay cell within a
      // frame or two while a ghost popping up mid-room never does.
      if (raw_active && !target_prev_raw_active_[i]) {
        target_touched_overlay_[i] = false;
      }
      if (raw_active) {
        float fx = raw_inputs[i].x;
        float fy = raw_inputs[i].y;
        if (xform) {
          auto [tx, ty] = transform_.apply(fx, fy);
          fx = tx;
          fy = ty;
        }
        int cell = grid_.xy_to_cell(fx, fy);
        if (cell != -1 && grid_.cell_is_room(cell)) {
          if (grid_.cell_overlay(cell) == CELL_OVERLAY_ENTRY) {
            target_touched_overlay_[i] = true;
          } else {
            target_touched_overlay_[i] = false;
          }
        }
        // If outside room, keep current flag value (sticky until next room cell)
      } else {
        // Target inactive — don't clear, let zone engine use the flag
      }
      target_prev_raw_active_[i] = raw_active;
    }

    // Stage 3: Zone engine tick — uses transformed positions + frame counts
    WindowOutput zone_input;
    zone_input.total_frames = win.total_frames;
    for (int i = 0; i < NUM_TARGETS; i++) {
      zone_input.targets[i].active = win.targets[i].active;
      zone_input.targets[i].frame_count = win.targets[i].frame_count;
      zone_input.targets[i].median_x = grid_inputs[i].x;
      zone_input.targets[i].median_y = grid_inputs[i].y;
      zone_input.targets[i].on_overlay = target_touched_overlay_[i];
    }
    // Build sensor input for zone engine
    SensorInput sensor_input;
    if (static_presence_sensor_ != nullptr)
      sensor_input.static_on = static_presence_sensor_->state;
    if (motion_presence_sensor_ != nullptr)
      sensor_input.motion_on = motion_presence_sensor_->state;
    sensor_input.static_timeout = static_timeout_;
    sensor_input.motion_timeout = motion_timeout_;

    const auto &result = zone_engine_.tick(zone_input, ts, sensor_input);

    // Heatmap: bump the cell each validly-detected target occupies this frame.
    // Gate on the target window's `active` flag only: an inactive window has no
    // confirmed median position to bump. (Zone "pending" is a per-zone state,
    // not a per-target one — it does not apply here; don't "fix" this to include
    // pending.)
    for (int i = 0; i < epp::MAX_TARGETS; i++) {
      const auto &tw = zone_input.targets[i];
      if (!tw.active) continue;
      int cell = grid_.xy_to_cell(tw.median_x, tw.median_y);
      if (cell >= 0 && grid_.cell_is_room(cell)) heatmap_.bump(cell);
    }

    // Output zone engine log entries immediately (before throttle may overwrite)
    for (int i = 0; i < result.log_count; ++i) {
      if (result.log[i].level == epp::LogLevel::INFO) {
        ESP_LOGI(TAG, "%s", result.log[i].message);
      } else {
        ESP_LOGD(TAG, "%s", result.log[i].message);
      }
    }

    // Accumulate structured events across ticks; the publish throttle below ships
    // and clears them at ~1Hz, so a one-tick event isn't lost ~9/10 ticks.
    for (int i = 0; i < result.event_count; ++i) {
      event_queue_.push(result.events[i]);
    }

    // Cache the result for the publish throttles below, skipping the trailing
    // LogEntry log[16] buffer (~1.5 KB): its entries were already flushed to
    // the ESP log just above and nothing reads the log from the cache, so the
    // previous full-struct assignment was copying dead data on every drained
    // frame at 10Hz. Same offsetof idiom as the engine's own result_ reset in
    // ZoneEngine::tick(). last_zone_result_.log_count stays 0 from brace-init,
    // so any future reader of the cached log sees "no entries".
    static_assert(std::is_trivially_copyable<ProcessingResult>::value,
                  "partial memcpy of ProcessingResult requires trivial copyability");
    std::memcpy(&last_zone_result_, &result, offsetof(ProcessingResult, log));
    last_window_output_ = win;
  }

  // Stale-frame check: if the LD2450 has stopped sending, synthesize an empty
  // window output and processing result so the publish blocks below emit
  // "no signal" / INACTIVE state instead of the last known good values. This
  // is what gives HA a visible "device offline" signal rather than frozen
  // sensors that look alive.
  bool stale = is_frame_stale(now, last_frame_ms_, has_received_frame_, STALE_FRAME_MS);
  // One-shot edge log: surface the LD2450 going silent (and recovering) once,
  // not every tick. Cold-start (has_received_frame_ == false) is treated as
  // stale by is_frame_stale but we don't log a "lost" line until at least one
  // frame has been seen, otherwise every boot logs a phantom radar failure.
  // For the same reason, only latch was_stale_ after we've seen a real frame —
  // otherwise the first frame after cold-start would trip the !stale &&
  // was_stale_ branch and log a spurious "frames recovered" line.
  if (stale && !was_stale_ && has_received_frame_) {
    ESP_LOGW(TAG, "LD2450 frames stale (last frame %ums ago); publishing offline state",
             now - last_frame_ms_);
  } else if (!stale && was_stale_) {
    ESP_LOGI(TAG, "LD2450 frames recovered");
  }
  if (has_received_frame_) {
    was_stale_ = stale;
  }

  // Tracker connectivity health — are frames arriving at all? — independent of
  // whether any target is present (the LD2450 streams ~10Hz even in an empty
  // room). Drives the Tracking Sensor entity published in Timer 5 below. Here
  // it also surfaces the dead-from-boot case (#407) that the was_stale_ edge
  // above cannot: that log is gated on has_received_frame_, so a tracker that
  // never sends a first frame stays silent. Warn once, when the tracker has
  // been silent for STALE_FRAME_MS since boot with still no frame seen.
  TrackerHealth health = tracker_health(now, last_frame_ms_, has_received_frame_,
                                        boot_ms_, STALE_FRAME_MS);
  if (health == TrackerHealth::OFFLINE && !has_received_frame_ && !never_came_up_warned_) {
    ESP_LOGW(TAG, "LD2450 has sent no frames %ums after boot; tracking sensor may be "
                  "disconnected or dead",
             now - boot_ms_);
    never_came_up_warned_ = true;
  }

  // Static const so we don't pay the value-init cost (ProcessingResult holds a
  // log buffer) on every loop tick. Both default to "all inactive / no log".
  static const WindowOutput STALE_WIN{};
  static const ProcessingResult STALE_RESULT{};

  // The publish block below references `win` (last frame's window output)
  // and `result` (cached in last_zone_result_). When stale, point them at the
  // empty synthesized values so each throttle publishes the offline state.
  const auto &win = stale ? STALE_WIN : last_window_output_;
  const auto &result = stale ? STALE_RESULT : last_zone_result_;

  // === PUBLISH THROTTLES (do not affect processing) ===

  // Timer 1: Display (internal transport text sensors, frontend only)
  if (display_interval_ms_ > 0 && now - last_display_publish_ms_ >= display_interval_ms_) {
    last_display_publish_ms_ = now;

    // Skip publish_state when the payload matches the last publish so the
    // empty-string flood (when no targets are active) doesn't spam HA every
    // display tick. ESPHome text_sensor doesn't dedupe string publishes.
    auto publish_text_if_changed = [](esphome::text_sensor::TextSensor *sensor,
                                       const char *value, std::string &cache,
                                       bool &has_cache) {
      if (sensor == nullptr) return;
      if (has_cache && cache == value) return;
      sensor->publish_state(value);
      cache = value;
      has_cache = true;
    };

    // Publish raw target positions (pre-transform, smoothed)
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (raw_target_sensors_[i] != nullptr) {
        if (win.targets[i].active) {
          char buf[32];
          snprintf(buf, sizeof(buf), "%.0f,%.0f",
                   win.targets[i].median_x,
                   win.targets[i].median_y);
          publish_text_if_changed(raw_target_sensors_[i], buf,
                                  last_raw_target_text_[i],
                                  has_last_raw_target_text_[i]);
        } else {
          publish_text_if_changed(raw_target_sensors_[i], "",
                                  last_raw_target_text_[i],
                                  has_last_raw_target_text_[i]);
        }
      }
    }

    // Publish grid target positions from zone engine result.
    // Always send position when sensor sees a target (even if zone engine
    // didn't confirm it) so the frontend can process with its own grid.
    for (int i = 0; i < NUM_TARGETS; i++) {
      if (target_position_sensors_[i] != nullptr) {
        if (i < result.target_count && !std::isnan(result.targets[i].x)) {
          char buf[64];
          snprintf(buf, sizeof(buf), "%.0f,%.0f,%s",
                   result.targets[i].x, result.targets[i].y,
                   status_str(result.targets[i].status));
          publish_text_if_changed(target_position_sensors_[i], buf,
                                  last_target_position_text_[i],
                                  has_last_target_position_text_[i]);
        } else {
          publish_text_if_changed(target_position_sensors_[i], "",
                                  last_target_position_text_[i],
                                  has_last_target_position_text_[i]);
        }
      }
    }
  }

  // Timer 2: Zone state (internal transport JSON, frontend only)
  if (zone_state_interval_ms_ > 0 && now - last_zone_state_ms_ >= zone_state_interval_ms_) {
    last_zone_state_ms_ = now;

    // Publish zone state as compact JSON
    if (zone_state_sensor_ != nullptr) {
      // Compute sensor state codes (used in the static_state/motion_state fields)
      const char *static_code = result.static_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.static_state == SensorPresenceState::PENDING ? "P" : "I";
      const char *motion_code = result.motion_state == SensorPresenceState::ACTIVE ? "A" :
                                 result.motion_state == SensorPresenceState::PENDING ? "P" : "I";

      // BoundedWriter prevents the snprintf-accumulator underflow bug — see
      // epp_json_writer.h. Once truncated, further printf calls are no-ops
      // and ok() returns false so we can log a clear warning.
      char json[512];
      BoundedWriter w(json, sizeof(json));
      w.printf("{\"targets\":[");
      for (int i = 0; i < NUM_TARGETS; i++) {
        const char *status =
            (i < result.target_count) ? status_str(result.targets[i].status) : "inactive";
        int signal = (i < result.target_count) ? result.targets[i].signal : 0;
        w.printf("%s{\"signal\":%d,\"status\":\"%s\"}",
                 i > 0 ? "," : "", signal, status);
      }
      w.printf("],\"zones\":{\"occupancy\":[");
      for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
        w.printf("%s%s", i > 0 ? "," : "",
                 result.zone_occupancy[i] ? "true" : "false");
      }
      w.printf("],\"tracking\":%s},"
               "\"static_state\":\"%s\",\"motion_state\":\"%s\",\"occupancy\":%s,"
               "\"mmwave\":%s,"
               "\"frame_count\":%d,\"ev\":[",
               result.device_tracking_present ? "true" : "false",
               static_code, motion_code,
               result.occupancy ? "true" : "false",
               result.mmwave ? "true" : "false",
               result.frame_count);

      // Structured detection-log events accumulated across the ~10 ticks since
      // the last publish, serialized as the JSON array body.
      event_queue_.serialize(w);
      w.printf("]}");
      if (!w.ok()) {
        ESP_LOGW(TAG, "zone-state JSON truncated to %u/%u bytes",
                 (unsigned)w.size(), (unsigned)sizeof(json));
      }
      zone_state_sensor_->publish_state(json);
    }

    // Drain the event queue every interval regardless of sensor presence.
    // If the zone-state sensor is unwired, events would otherwise accumulate
    // forever (overflowing CAP and inflating dropped_ unboundedly).
    event_queue_.clear();
  }

  // Timer 3: Entity target (structured HA entities, user Hz)
  if (entity_target_interval_ms_ > 0 && now - last_entity_target_ms_ >= entity_target_interval_ms_) {
    last_entity_target_ms_ = now;

    int active_count = 0;
    for (int i = 0; i < NUM_TARGETS; i++) {
      bool active = is_target_active(result, i);
      if (active) active_count++;

      if (target_x_sensors_[i] != nullptr)
        target_x_sensors_[i]->publish_state(active ? result.targets[i].x : NAN);
      if (target_y_sensors_[i] != nullptr)
        target_y_sensors_[i]->publish_state(active ? result.targets[i].y : NAN);
      if (target_signal_sensors_[i] != nullptr)
        target_signal_sensors_[i]->publish_state(active ? static_cast<float>(result.targets[i].signal) : NAN);
      if (target_active_sensors_[i] != nullptr)
        target_active_sensors_[i]->publish_state(active);
      if (target_zone_sensors_[i] != nullptr) {
        // `active` is the per-slot status check the throttle uses for x/y/etc.
        // target_zone_or_invalid layers the is_target_valid finite-coords gate
        // plus the grid bounds check on top, returning -1 when the position
        // can't be resolved to a zone — published as NAN.
        int zone = active ? target_zone_or_invalid(grid_, result.targets[i].status,
                                                   result.targets[i].x, result.targets[i].y)
                          : -1;
        target_zone_sensors_[i]->publish_state(zone >= 0 ? static_cast<float>(zone) : NAN);
      }
    }
    if (target_count_sensor_ != nullptr)
      target_count_sensor_->publish_state(static_cast<float>(active_count));
  }

  // Timer 4: Entity zone (structured HA entities, user Hz)
  if (entity_zone_interval_ms_ > 0 && now - last_entity_zone_ms_ >= entity_zone_interval_ms_) {
    last_entity_zone_ms_ = now;

    for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
      if (zone_occupancy_sensors_[i] != nullptr)
        zone_occupancy_sensors_[i]->publish_state(result.zone_occupancy[i]);
      if (zone_target_count_sensors_[i] != nullptr)
        zone_target_count_sensors_[i]->publish_state(static_cast<float>(result.zone_target_counts[i]));
    }
  }

  // Timer 5: System (fixed 1000ms, always runs)
  if (now - last_system_ms_ >= SYSTEM_INTERVAL_MS) {
    last_system_ms_ = now;

    // Surface frame-buffer overflow when new drops accumulate past the
    // threshold. The ring buffer absorbs short scheduling stalls silently;
    // persistent drops mean loop() can't keep up with the LD2450 producer
    // and want investigation. We rate-limit on the *delta* since last log
    // (not equality) so sustained 10Hz drops don't spam every second
    // indefinitely with monotonically growing totals.
    uint32_t drop_delta = frames_dropped_ - last_frames_dropped_log_;
    if (drop_delta >= FRAME_DROP_LOG_THRESHOLD) {
      ESP_LOGW(TAG, "LD2450 frame ring buffer dropped %u frames in %ums (total %u)",
               drop_delta, now - last_frames_dropped_log_ts_, frames_dropped_);
      last_frames_dropped_log_ = frames_dropped_;
      last_frames_dropped_log_ts_ = now;
    }

    // Skip publish_state when the value matches our last publish so the API
    // event stream isn't flooded once per second with unchanged binary states.
    // ESPHome dedupes the wire-side transport but still fires the API event.
    auto publish_bool_if_changed = [](esphome::binary_sensor::BinarySensor *sensor,
                                      bool value, int8_t &cache) {
      if (sensor == nullptr) return;
      int8_t v = value ? 1 : 0;
      if (cache == v) return;
      sensor->publish_state(value);
      cache = v;
    };

    publish_bool_if_changed(device_tracking_sensor_,
                            result.device_tracking_present,
                            last_device_tracking_published_);
    publish_bool_if_changed(static_presence_output_,
                            result.static_state != SensorPresenceState::INACTIVE,
                            last_static_presence_published_);
    publish_bool_if_changed(motion_presence_output_,
                            result.motion_state != SensorPresenceState::INACTIVE,
                            last_motion_presence_published_);
    publish_bool_if_changed(occupancy_output_,
                            result.occupancy,
                            last_occupancy_published_);
    publish_bool_if_changed(mmwave_output_,
                            result.mmwave,
                            last_mmwave_published_);
    // Tracking-sensor connectivity (frames arriving?). Held unpublished during
    // STARTING (the first-frame grace) so a healthy sensor's first published
    // state is "connected" and a dead-from-boot one's is "disconnected" — never
    // a transient wrong value. device_class connectivity: on = connected.
    if (health != TrackerHealth::STARTING) {
      publish_bool_if_changed(tracking_health_sensor_,
                              health == TrackerHealth::ONLINE,
                              last_tracking_health_published_);
    }

    // Relay evaluation.
    // Gate side-effecting relay state changes until boot has settled — see
    // boot_settled_ rationale in epp_component.h. Without this gate the very
    // first loop tick can flip the relay before the LD2450 has produced any
    // frames and before HA has restored template switch state, causing a
    // brief incorrect output state on every boot. Open the gate when either
    // the first frame has arrived OR the 2s settle window has elapsed — the
    // grace period ensures a broken/disconnected LD2450 doesn't leave the
    // relay state machine permanently inert.
    if (!boot_settled_) {
      if (has_received_frame_ || now - boot_ms_ >= BOOT_SETTLE_MS) {
        boot_settled_ = true;
      }
    }
    if (boot_settled_ && relay_switch_ != nullptr) {
      RelayEvalInput relay_input{
          relay_trigger_mode_,
          relay_contact_mode_,
          result.motion_state != SensorPresenceState::INACTIVE,
          result.static_state != SensorPresenceState::INACTIVE,
          result.occupancy,
      };
      auto relay_result = evaluate_relay(relay_input);
      // Use the component's own last-issued desired state — never read
      // relay_switch_->state directly. The switch's state can be flipped by
      // HA, an automation, or an optimistic update; reacting to it makes
      // us fight user intent on the next loop tick. See epp_relay_publish.h.
      if (relay_should_update(relay_result.desired_state,
                              relay_desired_state_,
                              has_relay_desired_state_)) {
        if (relay_result.desired_state) {
          relay_switch_->turn_on();
        } else {
          relay_switch_->turn_off();
        }
        relay_desired_state_ = relay_result.desired_state;
        has_relay_desired_state_ = true;
      }
    }
  }

  // Timer 6: Heatmap decay — every 5 min, multiply all cells so activity
  // fades with a ~14-day half-life. 4032 five-minute ticks == 14 days.
  static constexpr uint32_t HEATMAP_DECAY_INTERVAL_MS = 5u * 60u * 1000u;
  static constexpr uint32_t HEATMAP_HALF_LIFE_TICKS = 4032u;
  if (now - last_heatmap_decay_ms_ >= HEATMAP_DECAY_INTERVAL_MS) {
    last_heatmap_decay_ms_ = now;
    heatmap_.decay(std::pow(0.5f, 1.0f / (float) HEATMAP_HALF_LIFE_TICKS));
  }

  // Timer 8: Heatmap NVS save — hourly, so accumulated activity survives
  // reboot/OTA without wearing flash on every decay/publish tick.
  static constexpr uint32_t HEATMAP_NVS_INTERVAL_MS = 60u * 60u * 1000u;
  if (now - last_heatmap_nvs_ms_ >= HEATMAP_NVS_INTERVAL_MS) {
    last_heatmap_nvs_ms_ = now;
    save_heatmap_to_nvs_();
  }
}

float EPPComponent::get_setup_priority() const {
  return esphome::setup_priority::DATA;
}

void EPPComponent::dump_config() {
  ESP_LOGCONFIG(TAG, "EPP Zone Engine:");
  ESP_LOGCONFIG(TAG, "  Firmware Version: %s", FIRMWARE_VERSION_STR);
  ESP_LOGCONFIG(TAG, "  Throttle intervals (ms, 0 = disabled):");
  ESP_LOGCONFIG(TAG, "    display:       %u", display_interval_ms_);
  ESP_LOGCONFIG(TAG, "    zone_state:    %u", zone_state_interval_ms_);
  ESP_LOGCONFIG(TAG, "    entity_target: %u", entity_target_interval_ms_);
  ESP_LOGCONFIG(TAG, "    entity_zone:   %u", entity_zone_interval_ms_);
  ESP_LOGCONFIG(TAG, "    system:        %u (fixed)", SYSTEM_INTERVAL_MS);
  ESP_LOGCONFIG(TAG, "  Sensor wiring:");
  ESP_LOGCONFIG(TAG, "    device_tracking:  %s", device_tracking_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "    tracking_health:  %s", tracking_health_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "    firmware_version: %s", firmware_version_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "    zone_state:       %s", zone_state_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "    static_input:     %s", static_presence_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "    motion_input:     %s", motion_presence_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "    target_count:     %s", target_count_sensor_ ? "yes" : "no");
  ESP_LOGCONFIG(TAG, "  Sensor timeouts: static=%.1fs motion=%.1fs", static_timeout_, motion_timeout_);
  ESP_LOGCONFIG(TAG, "  Relay: trigger=%d contact=%d switch=%s",
                static_cast<int>(relay_trigger_mode_),
                static_cast<int>(relay_contact_mode_),
                relay_switch_ ? "wired" : "unwired");
  ESP_LOGCONFIG(TAG, "  NVS restore status:");
  ESP_LOGCONFIG(TAG, "    perspective: %s", has_persp_cache_ ? "loaded" : "absent");
  ESP_LOGCONFIG(TAG, "    grid:        %s", has_grid_cache_ ? "loaded" : "absent");
  ESP_LOGCONFIG(TAG, "    zones:       %s", has_zones_cache_ ? "loaded" : "absent");
}

void EPPComponent::feed_targets(const float xy[NUM_TARGETS][2],
                                const bool detected[NUM_TARGETS]) {
  // SPSC safety: this producer (LD2450 UART lambda) and the loop() consumer
  // both run on ESPHome's single main FreeRTOS task, so ring-buffer push/pop
  // never interleave — revisit if either ever moves to another task/core.
  TargetFrame frame;
  for (int i = 0; i < NUM_TARGETS; i++) {
    frame.targets[i] = {xy[i][0], xy[i][1], detected[i]};
  }
  // Record receipt time for the stale-frame watchdog. If we set last_frame_ms_
  // in loop()'s drain instead, a delayed loop draining old buffered frames
  // would clear staleness for another STALE_FRAME_MS window even though the
  // radar may have stopped sending — see is_frame_stale in
  // epp_frame_staleness.h.
  last_frame_ms_ = esphome::millis();
  has_received_frame_ = true;
  if (!frame_buffer_.push(frame)) {
    // Buffer was full — oldest frame evicted. Bump the counter so the issue
    // is visible in diagnostics rather than disappearing silently.
    frames_dropped_++;
  }
}

// ---------------------------------------------------------------------------
// Service: dismiss_target
// ---------------------------------------------------------------------------

void EPPComponent::dismiss_target(int target_index, int cell_index) {
  // Glue-layer bounds check: HA can call this with arbitrary ints. cell_index
  // == -1 is a valid sentinel meaning "no cell" (used by zone_engine to clear
  // a per-target dismissal). The engine bounds-checks too, but short-
  // circuiting bad user input here keeps the log clean and avoids touching
  // engine state with garbage indices.
  if (target_index < 0 || target_index >= MAX_TARGETS) {
    ESP_LOGW(TAG, "dismiss_target: target_index %d out of range [0, %d)",
             target_index, MAX_TARGETS);
    return;
  }
  if (cell_index < -1 || cell_index >= GRID_CELL_COUNT) {
    ESP_LOGW(TAG, "dismiss_target: cell_index %d out of range [-1, %d)",
             cell_index, GRID_CELL_COUNT);
    return;
  }
  zone_engine_.dismiss_target(target_index, cell_index);
  ESP_LOGI(TAG, "Dismissed target %d at cell %d", target_index, cell_index);
}

// ---------------------------------------------------------------------------
// Service: set_perspective
// ---------------------------------------------------------------------------

void EPPComponent::set_perspective(const std::string &perspective,
                                   float room_width, float room_depth) {
  // Strict parser: requires exactly 8 finite floats, no empty fields, no
  // trailing garbage. See epp_perspective_parser.h for the full contract.
  // Logging stays here so the parser remains a pure helper testable on host.
  float coeffs[8];
  if (!parse_perspective_coefficients(perspective, coeffs)) {
    // Don't echo the full payload — a buggy or malicious caller could spam logs
    // / wear flash by submitting megabytes of garbage. A length-bounded prefix
    // is enough for triage.
    constexpr size_t MAX_LOG_PREFIX = 64;
    ESP_LOGE(TAG, "Invalid perspective payload (need 8 finite comma-separated floats), len=%u, prefix=\"%.*s\"",
             static_cast<unsigned>(perspective.size()),
             static_cast<int>(std::min(perspective.size(), MAX_LOG_PREFIX)),
             perspective.c_str());
    return;
  }

  // Room dimensions must be strictly positive: downstream target→cell mapping
  // divides by these values, and zero/negative dims silently produce garbage
  // (NaN/Inf cells, wrong-sign coordinates). Reject at the glue boundary so
  // bad input from HA is logged instead of silently corrupting state.
  if (!(room_width > 0.0f) || !(room_depth > 0.0f)) {
    ESP_LOGE(TAG, "Invalid room dimensions: width=%.1f depth=%.1f (both must be > 0)",
             room_width, room_depth);
    return;
  }

  transform_.set_coefficients(coeffs, room_width, room_depth);

  // Build candidate cache, then test against the prior cache before
  // overwriting. Skipping nvs_set_blob saves a flash erase cycle when the
  // frontend republishes identical config.
  float candidate[10];
  memcpy(candidate, coeffs, 8 * sizeof(float));
  candidate[8] = room_width;
  candidate[9] = room_depth;

  bool changed = did_perspective_change(candidate, has_persp_cache_, persp_cache_);

  memcpy(persp_cache_, candidate, sizeof(persp_cache_));
  has_persp_cache_ = true;

  ESP_LOGI(TAG, "Perspective set: room %.0fx%.0f mm", room_width, room_depth);

  if (changed) {
    // Perspective changed → target→cell mapping changed → previously-accumulated
    // heat is now spatially misaligned. Gated on `changed` so the integration's
    // identical config re-push on every reconnect does NOT wipe the heatmap
    // (that push would otherwise reset it, and even clobber the NVS-restored
    // heat right after boot).
    reset_heatmap_();
    save_perspective_to_nvs_();
  } else {
    ESP_LOGD(TAG, "Perspective unchanged, skipping NVS write");
  }
}

// ---------------------------------------------------------------------------
// Service: set_grid
// ---------------------------------------------------------------------------

void EPPComponent::set_grid(const std::string &grid_data,
                            float origin_x, float origin_y) {
  // Reject obviously-oversized inputs before invoking mbedtls. The WS API has
  // already deserialised this string, so we can't prevent the upstream alloc,
  // but capping here avoids handing a multi-MB blob to the decoder and gives
  // the operator a clear log line. See GRID_BASE64_MAX in epp_nvs_layout.h.
  if (grid_data.size() > GRID_BASE64_MAX) {
    ESP_LOGE(TAG, "Grid base64 input too large (%u bytes, max %u)",
             (unsigned)grid_data.size(), (unsigned)GRID_BASE64_MAX);
    return;
  }

  uint8_t decoded[GRID_CELL_COUNT];
  size_t decoded_len = 0;

  int ret = mbedtls_base64_decode(decoded, sizeof(decoded), &decoded_len,
                                  reinterpret_cast<const unsigned char *>(grid_data.c_str()),
                                  grid_data.length());
  if (ret != 0) {
    ESP_LOGE(TAG, "Base64 decode failed (error %d)", ret);
    return;
  }

  if (decoded_len != GRID_CELL_COUNT) {
    ESP_LOGE(TAG, "Grid data: expected %d bytes, got %d", GRID_CELL_COUNT, (int)decoded_len);
    return;
  }

  grid_ = Grid(origin_x, origin_y);
  grid_.load_from_bytes(decoded, GRID_CELL_COUNT);
  zone_engine_.set_grid(grid_);

  int entry_count = 0;
  int interference_count = 0;
  int suppress_count = 0;
  for (int i = 0; i < GRID_CELL_COUNT; i++) {
    int kind = grid_.cell_overlay(i);
    if (kind == CELL_OVERLAY_ENTRY) entry_count++;
    else if (kind == CELL_OVERLAY_INTERFERENCE) interference_count++;
    else if (kind == CELL_OVERLAY_SUPPRESS) suppress_count++;
  }
  ESP_LOGI(TAG, "Grid set: origin (%.0f, %.0f), %d cells, %d entry / %d interference / %d suppress",
           origin_x, origin_y, GRID_CELL_COUNT, entry_count, interference_count, suppress_count);

  // Build candidate blob (same layout as save_grid_to_nvs_) and test
  // against the cache before writing. The cache is updated unconditionally
  // so future calls compare against the latest in-RAM grid.
  uint8_t candidate[GRID_BLOB_SIZE];
  memcpy(candidate, decoded, GRID_CELL_COUNT);
  memcpy(candidate + GRID_CELL_COUNT, &origin_x, sizeof(float));
  memcpy(candidate + GRID_CELL_COUNT + sizeof(float), &origin_y, sizeof(float));

  bool changed = did_grid_change(candidate, sizeof(candidate),
                                 has_grid_cache_,
                                 last_grid_blob_, sizeof(last_grid_blob_));
  memcpy(last_grid_blob_, candidate, sizeof(last_grid_blob_));
  has_grid_cache_ = true;

  if (changed) {
    // Cell↔space mapping changed → previously-accumulated heat is misaligned.
    // Gated on `changed` so the integration's identical config re-push on every
    // reconnect does NOT wipe the heatmap (and so the NVS-restored heat survives
    // the on-reconnect re-push right after boot).
    reset_heatmap_();
    save_grid_to_nvs_();
  } else {
    ESP_LOGD(TAG, "Grid unchanged, skipping NVS write");
  }
}

// ---------------------------------------------------------------------------
// Service: set_zones
// ---------------------------------------------------------------------------

void EPPComponent::set_zones(const std::string &zones_json) {
  // parse_zones_json caps the input at ZONES_JSON_MAX BEFORE deserializing —
  // ArduinoJson v7 grows its pool to fit the input, so an unbounded LAN
  // payload would otherwise force a matching transient heap allocation on
  // the 320KB-heap ESP32 (mirrors the GRID_BASE64_MAX cap in set_grid). The
  // same helper guards the NVS boot-restore path so the two can't drift.
  ZoneConfig configs[MAX_ZONE_SLOTS];
  int count = 0;
  const char *parse_error = nullptr;
  ZonesJsonStatus status =
      parse_zones_json(zones_json.c_str(), zones_json.size(), configs, count, &parse_error);
  // LAN-input rejections log at ERROR, matching set_grid: a malformed
  // payload from the API is a buggy or hostile caller, not an expected
  // condition. (The NVS boot-restore path keeps WARN — corrupt flash is
  // an anticipated failure mode there.)
  if (status == ZonesJsonStatus::TOO_LARGE) {
    ESP_LOGE(TAG, "Zones JSON too large (%u bytes, max %u), rejecting",
             (unsigned)zones_json.size(), (unsigned)ZONES_JSON_MAX);
    return;
  }
  if (status != ZonesJsonStatus::OK) {
    ESP_LOGE(TAG, "Failed to parse zones JSON: %s",
             parse_error != nullptr ? parse_error : "unknown");
    return;
  }

  zone_engine_.set_zones(configs, count);
  ESP_LOGI(TAG, "Configured %d zones", count);

  // Skip the flash write when the JSON matches the last saved payload.
  if (did_zones_change(zones_json, has_zones_cache_, last_zones_json_)) {
    save_zones_to_nvs_(zones_json);
  } else {
    ESP_LOGD(TAG, "Zones unchanged, skipping NVS write");
  }
}

// ---------------------------------------------------------------------------
// Service: set_relay
// ---------------------------------------------------------------------------

static RelayTriggerMode trigger_mode_from_str(const std::string &s) {
    if (s == "motion") return RelayTriggerMode::MOTION;
    if (s == "presence") return RelayTriggerMode::PRESENCE;
    if (s == "occupancy") return RelayTriggerMode::OCCUPANCY;
    return RelayTriggerMode::DISABLED;
}

static RelayContactMode contact_mode_from_str(const std::string &s) {
    if (s == "nc") return RelayContactMode::NORMALLY_CLOSED;
    return RelayContactMode::NORMALLY_OPEN;
}

void EPPComponent::set_relay(const std::string &trigger_mode, const std::string &contact_mode) {
    relay_trigger_mode_ = trigger_mode_from_str(trigger_mode);
    relay_contact_mode_ = contact_mode_from_str(contact_mode);
    ESP_LOGI(TAG, "Relay set: trigger=%s contact=%s", trigger_mode.c_str(), contact_mode.c_str());
    save_relay_to_nvs_();
}

// ---------------------------------------------------------------------------
// NVS persistence — restore
// ---------------------------------------------------------------------------

void EPPComponent::restore_from_nvs_() {
  // Open RW because we may need to wipe and/or stamp the version key.
  // nvs_open(RW) creates the namespace if it doesn't exist, so any error
  // here is a real init / corruption / partition problem — not a normal
  // first-boot path.
  nvs_handle_t handle;
  esp_err_t open_err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
  if (open_err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS namespace: %s", esp_err_to_name(open_err));
    return;
  }

  // Single global schema gate. The four blobs (perspective, grid, zones,
  // relay) are coupled in practice — losing any one leaves the device
  // unusable until the user reconfigures, at which point HA repushes the
  // others anyway — so a real version mismatch wipes the whole namespace
  // rather than restoring a partial set.
  //
  // stored_version == 0 (key absent) means a firmware that didn't write
  // this key: a truly fresh install, or a 0.100.x install that used the
  // since-removed per-blob version keys. Both cases stamp the current
  // version and then fall through to load whatever blobs are present —
  // the blob byte layouts are stable across that era so anything stored
  // is still readable.
  uint8_t stored_version = 0;
  nvs_get_u8(handle, "version", &stored_version);
  if (stored_version != 0 && stored_version != NVS_SCHEMA_VERSION) {
    ESP_LOGW(TAG, "NVS schema mismatch (stored=%u, expected=%u), wiping namespace",
             stored_version, NVS_SCHEMA_VERSION);
    nvs_erase_all(handle);
    nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
    nvs_commit(handle);
    nvs_close(handle);
    return;
  }
  if (stored_version == 0) {
    nvs_set_u8(handle, "version", NVS_SCHEMA_VERSION);
    nvs_commit(handle);
  }

  // Restore perspective (8 floats + room_width + room_depth = 40 bytes)
  size_t persp_len = sizeof(persp_cache_);
  if (nvs_get_blob(handle, "persp", persp_cache_, &persp_len) == ESP_OK &&
      persp_len == sizeof(persp_cache_)) {
    transform_.set_coefficients(persp_cache_, persp_cache_[8], persp_cache_[9]);
    has_persp_cache_ = true;
    ESP_LOGI(TAG, "Restored perspective from NVS");
  }

  // Restore grid (GRID_CELL_COUNT cell bytes + origin_x + origin_y).
  // GRID_BLOB_SIZE is centralised in epp_nvs_layout.h and pinned by a
  // static_assert there.
  size_t grid_len = GRID_BLOB_SIZE;
  uint8_t grid_buf[GRID_BLOB_SIZE];
  if (nvs_get_blob(handle, "grid", grid_buf, &grid_len) == ESP_OK && grid_len == GRID_BLOB_SIZE) {
    float origin_x, origin_y;
    memcpy(&origin_x, grid_buf + GRID_CELL_COUNT, sizeof(float));
    memcpy(&origin_y, grid_buf + GRID_CELL_COUNT + sizeof(float), sizeof(float));
    grid_ = Grid(origin_x, origin_y);
    grid_.load_from_bytes(grid_buf, GRID_CELL_COUNT);
    zone_engine_.set_grid(grid_);
    // Seed the idempotency cache so a republish of the same grid won't
    // trigger a redundant flash write on first connect after boot.
    memcpy(last_grid_blob_, grid_buf, sizeof(last_grid_blob_));
    has_grid_cache_ = true;
    ESP_LOGI(TAG, "Restored grid from NVS (origin %.0f, %.0f)", origin_x, origin_y);
  }

  // Restore heatmap (GRID_CELL_COUNT floats, see epp_heatmap.h).
  size_t hm_len = epp::Heatmap::blob_size();
  uint8_t hm_buf[epp::Heatmap::blob_size()];
  if (nvs_get_blob(handle, "heatmap", hm_buf, &hm_len) == ESP_OK &&
      hm_len == epp::Heatmap::blob_size()) {
    heatmap_.deserialize(hm_buf, hm_len);
    ESP_LOGI(TAG, "Restored heatmap from NVS");
  }

  // Restore relay settings
  uint8_t relay_trig = 0;
  if (nvs_get_u8(handle, "relay_trig", &relay_trig) == ESP_OK) {
    if (relay_trig <= static_cast<uint8_t>(RelayTriggerMode::OCCUPANCY)) {
      relay_trigger_mode_ = static_cast<RelayTriggerMode>(relay_trig);
    } else {
      ESP_LOGW(TAG, "Invalid relay trigger mode %d in NVS, defaulting to DISABLED", relay_trig);
      relay_trigger_mode_ = RelayTriggerMode::DISABLED;
    }
    uint8_t relay_cont = 0;
    nvs_get_u8(handle, "relay_cont", &relay_cont);
    if (relay_cont <= static_cast<uint8_t>(RelayContactMode::NORMALLY_CLOSED)) {
      relay_contact_mode_ = static_cast<RelayContactMode>(relay_cont);
    } else {
      ESP_LOGW(TAG, "Invalid relay contact mode %d in NVS, defaulting to NO", relay_cont);
      relay_contact_mode_ = RelayContactMode::NORMALLY_OPEN;
    }
    ESP_LOGI(TAG, "Restored relay settings from NVS (trigger=%d, contact=%d)",
             static_cast<int>(relay_trigger_mode_), static_cast<int>(relay_contact_mode_));
  }

  // Restore zones (stored as JSON string)
  size_t str_len = 0;
  if (nvs_get_str(handle, "zones", nullptr, &str_len) == ESP_OK && str_len > 1) {
    // nvs_get_str writes str_len bytes (payload + trailing null) into the
    // buffer, so allocate the full capacity and trim the null afterward.
    // Allocating str_len - 1 would let nvs_get_str write one byte past the
    // std::string's logical end into its internal terminator slot (UB).
    std::string zones_str(str_len, '\0');
    esp_err_t err = nvs_get_str(handle, "zones", &zones_str[0], &str_len);
    if (err != ESP_OK) {
      ESP_LOGW(TAG, "Failed to read zones from NVS: %s", esp_err_to_name(err));
      nvs_close(handle);
      return;
    }
    // Trim the embedded null terminator that nvs_get_str wrote at the end.
    if (!zones_str.empty() && zones_str.back() == '\0') {
      zones_str.pop_back();
    }
    // Parse and apply but don't re-save — the shared parse_zones_json helper
    // applies the same ZONES_JSON_MAX cap as set_zones(), so an oversized
    // blob (only possible via NVS corruption or a flash written by different
    // firmware) can't force a large transient parse allocation at boot.
    ZoneConfig configs[MAX_ZONE_SLOTS];
    int count = 0;
    const char *parse_error = nullptr;
    ZonesJsonStatus status = parse_zones_json(zones_str.c_str(), zones_str.size(),
                                              configs, count, &parse_error);
    if (status == ZonesJsonStatus::OK) {
      zone_engine_.set_zones(configs, count);
      last_zones_json_ = zones_str;
      has_zones_cache_ = true;  // seed idempotency cache (see set_zones)
      ESP_LOGI(TAG, "Restored %d zones from NVS", count);
    } else if (status == ZonesJsonStatus::TOO_LARGE) {
      ESP_LOGW(TAG, "Zones blob in NVS too large (%u bytes, max %u), skipping restore",
               (unsigned)zones_str.size(), (unsigned)ZONES_JSON_MAX);
    } else {
      // Without this log, a corrupt blob silently drops all zones at boot.
      // The user would see no zones in HA and no clue why.
      ESP_LOGW(TAG, "Corrupt zones JSON in NVS, skipping restore: %s",
               parse_error != nullptr ? parse_error : "unknown");
    }
  }

  nvs_close(handle);
}

// ---------------------------------------------------------------------------
// NVS persistence — save
// ---------------------------------------------------------------------------

void EPPComponent::save_perspective_to_nvs_() {
  if (!has_persp_cache_) return;

  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  // Check every NVS call: if any fails we must clear has_persp_cache_ so the
  // next set_perspective() call retries instead of being suppressed by the
  // idempotency cache (set_perspective short-circuits when the new value
  // equals persp_cache_ and has_persp_cache_ is true).
  esp_err_t err = nvs_set_blob(handle, "persp", persp_cache_, sizeof(persp_cache_));
  if (err == ESP_OK) err = nvs_commit(handle);
  nvs_close(handle);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to save perspective to NVS: %s", esp_err_to_name(err));
    has_persp_cache_ = false;
    return;
  }
  ESP_LOGD(TAG, "Perspective saved to NVS (40 bytes)");
}

void EPPComponent::save_grid_to_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  // Pack cell data + origin into blob (size = GRID_BLOB_SIZE)
  uint8_t buf[GRID_BLOB_SIZE];
  for (int i = 0; i < GRID_CELL_COUNT; i++) {
    buf[i] = grid_.cell(i);
  }
  float ox = grid_.origin_x();
  float oy = grid_.origin_y();
  memcpy(buf + GRID_CELL_COUNT, &ox, sizeof(float));
  memcpy(buf + GRID_CELL_COUNT + sizeof(float), &oy, sizeof(float));

  // Check every NVS call: on failure clear has_grid_cache_ so set_grid()'s
  // idempotency check doesn't permanently suppress the retry.
  esp_err_t err = nvs_set_blob(handle, "grid", buf, sizeof(buf));
  if (err == ESP_OK) err = nvs_commit(handle);
  nvs_close(handle);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to save grid to NVS: %s", esp_err_to_name(err));
    has_grid_cache_ = false;
    return;
  }
  ESP_LOGD(TAG, "Grid saved to NVS (%d bytes)", (int)sizeof(buf));
}

void EPPComponent::reset_heatmap_() {
  heatmap_.reset();
}

void EPPComponent::clear_heatmap() {
  reset_heatmap_();          // zero the RAM accumulator (cells_)
  if (save_heatmap_to_nvs_()) {    // persist the zeroed accumulator to NVS ("heatmap")
    ESP_LOGI(TAG, "Heatmap cleared (RAM + NVS)");
  } else {
    ESP_LOGW(TAG, "Heatmap cleared (RAM only); NVS persist failed — may return after reboot");
  }
}

std::string EPPComponent::get_heatmap_base64() {
  uint8_t norm[GRID_CELL_COUNT];
  heatmap_.encode_normalized(norm);
  // base64 of 400 bytes -> 536 chars + NUL; GRID_BASE64_MAX is the same
  // ceil(n/3)*4 + slack formula used for the set_grid decode path.
  char encoded[GRID_BASE64_MAX];
  size_t encoded_len = 0;
  int ret = mbedtls_base64_encode(reinterpret_cast<unsigned char *>(encoded), sizeof(encoded),
                                  &encoded_len, norm, sizeof(norm));
  if (ret != 0) {
    ESP_LOGE(TAG, "Heatmap base64 encode failed (error %d)", ret);
    return std::string();
  }
  return std::string(encoded, encoded_len);
}

bool EPPComponent::save_heatmap_to_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return false;
  }

  uint8_t buf[epp::Heatmap::blob_size()];
  heatmap_.serialize(buf);

  esp_err_t err = nvs_set_blob(handle, "heatmap", buf, sizeof(buf));
  if (err == ESP_OK) err = nvs_commit(handle);
  nvs_close(handle);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to save heatmap to NVS: %s", esp_err_to_name(err));
    return false;
  }
  ESP_LOGD(TAG, "Heatmap saved to NVS (%d bytes)", (int)sizeof(buf));
  return true;
}

void EPPComponent::save_zones_to_nvs_(const std::string &zones_json) {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  last_zones_json_ = zones_json;
  has_zones_cache_ = true;
  // Check every NVS call: on failure clear has_zones_cache_ so set_zones()'s
  // idempotency check doesn't permanently suppress the retry.
  esp_err_t err = nvs_set_str(handle, "zones", zones_json.c_str());
  if (err == ESP_OK) err = nvs_commit(handle);
  nvs_close(handle);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to save zones to NVS: %s", esp_err_to_name(err));
    has_zones_cache_ = false;
    return;
  }
  ESP_LOGD(TAG, "Zones saved to NVS (%d bytes)", (int)zones_json.size());
}

void EPPComponent::save_relay_to_nvs_() {
  nvs_handle_t handle;
  if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open NVS for writing");
    return;
  }

  // No idempotency cache to clear here — every set_relay() rewrites
  // unconditionally — so just log and return on failure.
  esp_err_t err = nvs_set_u8(handle, "relay_trig", static_cast<uint8_t>(relay_trigger_mode_));
  if (err == ESP_OK) err = nvs_set_u8(handle, "relay_cont", static_cast<uint8_t>(relay_contact_mode_));
  if (err == ESP_OK) err = nvs_commit(handle);
  nvs_close(handle);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to save relay settings to NVS: %s", esp_err_to_name(err));
    return;
  }
  ESP_LOGD(TAG, "Relay settings saved to NVS");
}

}  // namespace epp
