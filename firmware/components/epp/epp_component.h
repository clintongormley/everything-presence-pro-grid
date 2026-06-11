#pragma once

#include "esphome/core/component.h"
#include "esphome/components/binary_sensor/binary_sensor.h"
#include "esphome/components/sensor/sensor.h"
#include "esphome/components/text_sensor/text_sensor.h"
#include "esphome/components/switch/switch.h"

#include "epp_calibration.h"
#include "epp_grid.h"
#include "epp_rolling_window.h"
#include "epp_zone_engine.h"
#include "epp_relay.h"
#include "epp_frame_ring_buffer.h"
#include "epp_frame_staleness.h"
#include "epp_nvs_layout.h"
#include "epp_relay_publish.h"
#include "epp_indexed_setter.h"

#include <string>

namespace epp {

// Number of LD2450 hardware targets. Distinct from the engine's MAX_TARGETS
// (which is the post-processing slot count); kept at namespace scope so it can
// be referenced in EPPComponent::feed_targets's parameter array bounds.
inline constexpr int NUM_TARGETS = 3;

// loop() copies frame.targets[NUM_TARGETS] into WindowOutput / engine arrays
// sized MAX_TARGETS — if the two ever diverge, the per-target loops silently
// read or write out of bounds. Pin the equality at compile time.
static_assert(NUM_TARGETS == MAX_TARGETS,
              "LD2450 hardware target count must match the zone engine's MAX_TARGETS");

struct ParsedTarget {
  float x = 0.0f;       // mm, sensor coordinate space (transformed)
  float y = 0.0f;       // mm
  bool detected = false;
};

class EPPComponent : public esphome::Component {
 public:
  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override;

  /// Called from LD2450 UART lambda with parsed target data.
  /// `xy[i][0]` = x_mm, `xy[i][1]` = y_mm; `detected[i]` = whether the LD2450
  /// reported a real return for slot i. Float arrays (rather than ParsedTarget)
  /// keep the yaml lambda free of any C++-type dependency.
  void feed_targets(const float xy[NUM_TARGETS][2], const bool detected[NUM_TARGETS]);

  /// Configuration services (called from API actions)
  void set_perspective(const std::string &perspective, float room_width, float room_depth);
  void set_grid(const std::string &grid_data, float origin_x, float origin_y);
  void set_zones(const std::string &zones_json);
  void dismiss_target(int target_index, int cell_index);

  // Sensor setters (called from generated code)
  void set_device_tracking_sensor(esphome::binary_sensor::BinarySensor *sensor) {
    device_tracking_sensor_ = sensor;
  }
  void set_firmware_version_sensor(esphome::text_sensor::TextSensor *sensor) {
    firmware_version_sensor_ = sensor;
  }
  void set_zone_occupancy_sensor(int index, esphome::binary_sensor::BinarySensor *sensor) {
    set_at(zone_occupancy_sensors_, index, sensor);
  }
  void set_target_position_sensor(int index, esphome::text_sensor::TextSensor *sensor) {
    set_at(target_position_sensors_, index, sensor);
  }
  void set_raw_target_sensor(int index, esphome::text_sensor::TextSensor *sensor) {
    set_at(raw_target_sensors_, index, sensor);
  }
  void set_zone_state_sensor(esphome::text_sensor::TextSensor *sensor) {
    zone_state_sensor_ = sensor;
  }
  void set_entity_target_interval(uint32_t ms) { entity_target_interval_ms_ = ms; }
  void set_entity_zone_interval(uint32_t ms) { entity_zone_interval_ms_ = ms; }
  void set_display_interval(uint32_t ms) { display_interval_ms_ = ms; }
  void set_zone_state_interval(uint32_t ms) { zone_state_interval_ms_ = ms; }
  void set_static_presence_sensor(esphome::binary_sensor::BinarySensor *sensor) {
    static_presence_sensor_ = sensor;
  }
  void set_motion_presence_sensor(esphome::binary_sensor::BinarySensor *sensor) {
    motion_presence_sensor_ = sensor;
  }
  void set_static_presence_output(esphome::binary_sensor::BinarySensor *sensor) {
    static_presence_output_ = sensor;
  }
  void set_motion_presence_output(esphome::binary_sensor::BinarySensor *sensor) {
    motion_presence_output_ = sensor;
  }
  void set_occupancy_output(esphome::binary_sensor::BinarySensor *sensor) {
    occupancy_output_ = sensor;
  }
  void set_mmwave_output(esphome::binary_sensor::BinarySensor *sensor) {
    mmwave_output_ = sensor;
  }
  void set_static_timeout(float timeout) { static_timeout_ = timeout; }
  void set_motion_timeout(float timeout) { motion_timeout_ = timeout; }
  void set_stuck_target_timeout(float seconds) { zone_engine_.set_stuck_target_timeout(seconds); }

  void set_relay(const std::string &trigger_mode, const std::string &contact_mode);
  void set_relay_switch(esphome::switch_::Switch *sw) { relay_switch_ = sw; }

  // Structured target entity setters
  void set_target_x_sensor(int index, esphome::sensor::Sensor *sensor) {
    set_at(target_x_sensors_, index, sensor);
  }
  void set_target_y_sensor(int index, esphome::sensor::Sensor *sensor) {
    set_at(target_y_sensors_, index, sensor);
  }
  void set_target_signal_sensor(int index, esphome::sensor::Sensor *sensor) {
    set_at(target_signal_sensors_, index, sensor);
  }
  void set_target_active_sensor(int index, esphome::binary_sensor::BinarySensor *sensor) {
    set_at(target_active_sensors_, index, sensor);
  }
  void set_target_zone_sensor(int index, esphome::sensor::Sensor *sensor) {
    set_at(target_zone_sensors_, index, sensor);
  }
  void set_zone_target_count_sensor(int index, esphome::sensor::Sensor *sensor) {
    set_at(zone_target_count_sensors_, index, sensor);
  }
  void set_target_count_sensor(esphome::sensor::Sensor *sensor) {
    target_count_sensor_ = sensor;
  }

 protected:
  // Derived from esphome.project.version in yaml. ESPHome defines the macro
  // during codegen; the fallback covers builds outside ESPHome (unit tests).
  #ifndef ESPHOME_PROJECT_VERSION
  #define ESPHOME_PROJECT_VERSION "0.0.0-dev"
  #endif
  static constexpr const char* FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION;

  // Target data from LD2450 — pushed by feed_targets() (UART lambda),
  // drained by loop(). The ring buffer protects against ESPHome scheduling
  // jitter: if loop() runs late and a second UART frame arrives before the
  // first is consumed, both are preserved (oldest dropped on overflow). See
  // epp_frame_ring_buffer.h for the full rationale.
  //
  // FRAME_BUFFER_CAPACITY: 3 frames at 10Hz LD2450 → 300ms of slack before
  // the oldest gets evicted. ESPHome loop()s under typical load run every
  // ~16ms; 300ms is a generous margin without burning RAM.
  static constexpr size_t FRAME_BUFFER_CAPACITY = 3;
  struct TargetFrame {
    ParsedTarget targets[NUM_TARGETS]{};
  };
  FrameRingBuffer<TargetFrame, FRAME_BUFFER_CAPACITY> frame_buffer_;
  uint32_t frames_dropped_ = 0;  // bumped when push() reports overflow
  uint32_t last_frames_dropped_log_ = 0;  // last frames_dropped_ value logged
  uint32_t last_frames_dropped_log_ts_ = 0;  // ms when last drop log fired
  // Only log frame drops when the delta since last log clears this threshold,
  // otherwise sustained drops at 10Hz spam the log every second forever. Five
  // dropped frames means loop() hung roughly half a second — clearly worth
  // surfacing while still leaving headroom for transient single-frame jitter.
  static constexpr uint32_t FRAME_DROP_LOG_THRESHOLD = 5;

  // Zone engine pipeline
  SensorTransform transform_;
  Grid grid_;
  RollingWindow window_;
  ZoneEngine zone_engine_;
  bool target_touched_overlay_[MAX_TARGETS]{};

  // NVS persistence
  void restore_from_nvs_();
  void save_perspective_to_nvs_();
  void save_grid_to_nvs_();
  void save_zones_to_nvs_(const std::string &zones_json);
  void save_relay_to_nvs_();

  // Cached perspective blob for NVS (8 coeffs + room_width + room_depth).
  // Doubles as the idempotency cache for set_perspective() — see
  // epp_change_detector.h.
  float persp_cache_[10]{};
  bool has_persp_cache_ = false;

  // Cached zones JSON for NVS persistence + idempotency.
  std::string last_zones_json_;
  bool has_zones_cache_ = false;

  // Cached grid blob for NVS idempotency.
  uint8_t last_grid_blob_[GRID_BLOB_SIZE]{};
  bool has_grid_cache_ = false;

  // Sensor pointers
  esphome::binary_sensor::BinarySensor *device_tracking_sensor_{nullptr};
  esphome::text_sensor::TextSensor *firmware_version_sensor_{nullptr};
  esphome::binary_sensor::BinarySensor *zone_occupancy_sensors_[MAX_ZONE_SLOTS]{};
  esphome::text_sensor::TextSensor *target_position_sensors_[MAX_TARGETS]{};

  // Raw target text sensors (pre-transform, post-median)
  esphome::text_sensor::TextSensor *raw_target_sensors_[NUM_TARGETS]{};

  // Zone state text sensor (JSON at 1Hz)
  esphome::text_sensor::TextSensor *zone_state_sensor_{nullptr};

  // Sensor presence inputs (references to raw hardware binary sensors)
  esphome::binary_sensor::BinarySensor *static_presence_sensor_{nullptr};
  esphome::binary_sensor::BinarySensor *motion_presence_sensor_{nullptr};
  float static_timeout_{DEFAULT_STATIC_TIMEOUT_S};
  float motion_timeout_{DEFAULT_MOTION_TIMEOUT_S};

  // Sensor presence outputs (zone engine processed state)
  esphome::binary_sensor::BinarySensor *static_presence_output_{nullptr};
  esphome::binary_sensor::BinarySensor *motion_presence_output_{nullptr};
  esphome::binary_sensor::BinarySensor *occupancy_output_{nullptr};
  esphome::binary_sensor::BinarySensor *mmwave_output_{nullptr};

  // Structured target entity sensors (per-target x, y, signal, active, zone)
  esphome::sensor::Sensor *target_x_sensors_[NUM_TARGETS]{};
  esphome::sensor::Sensor *target_y_sensors_[NUM_TARGETS]{};
  esphome::sensor::Sensor *target_signal_sensors_[NUM_TARGETS]{};
  esphome::binary_sensor::BinarySensor *target_active_sensors_[NUM_TARGETS]{};
  esphome::sensor::Sensor *target_zone_sensors_[NUM_TARGETS]{};

  // Structured zone entity sensors (per-zone target count)
  esphome::sensor::Sensor *zone_target_count_sensors_[MAX_ZONE_SLOTS]{};

  // Room-level target count
  esphome::sensor::Sensor *target_count_sensor_{nullptr};

  // Relay
  esphome::switch_::Switch *relay_switch_{nullptr};
  RelayTriggerMode relay_trigger_mode_{RelayTriggerMode::DISABLED};
  RelayContactMode relay_contact_mode_{RelayContactMode::NORMALLY_OPEN};

  // Publish throttle intervals (ms) — 0 = disabled
  uint32_t entity_target_interval_ms_ = 0;
  uint32_t entity_zone_interval_ms_ = 0;
  uint32_t display_interval_ms_ = 0;
  uint32_t zone_state_interval_ms_ = 0;
  static constexpr uint32_t SYSTEM_INTERVAL_MS = 1000;

  // Publish throttle timestamps
  uint32_t last_entity_target_ms_ = 0;
  uint32_t last_entity_zone_ms_ = 0;
  uint32_t last_display_publish_ms_ = 0;
  uint32_t last_zone_state_ms_ = 0;
  uint32_t last_system_ms_ = 0;

  // Cached zone result
  ProcessingResult last_zone_result_{};
  // Cached window output (rolling-median view) of the most recent frame
  // processed. Used by the Display throttle when no new frames arrived this
  // loop tick. See M6 stale-frame handling.
  WindowOutput last_window_output_{};

  // Cached last-published values for the System block's binary_sensor outputs.
  // ESPHome's binary_sensor::publish_state already dedupes the wire transport,
  // but the API event still fires every call. Skip when the value matches our
  // last publish to keep HA's event stream quiet. -1 sentinel = never published.
  int8_t last_device_tracking_published_ = -1;
  int8_t last_static_presence_published_ = -1;
  int8_t last_motion_presence_published_ = -1;
  int8_t last_occupancy_published_ = -1;
  int8_t last_mmwave_published_ = -1;

  // Cached last-published text for the Display block's text_sensor outputs.
  // Same rationale as the binary_sensor caches above: the empty-string publish
  // when no targets are present floods HA every display tick (e.g. 4 Hz). Skip
  // when the new payload matches the cached one.
  std::string last_raw_target_text_[NUM_TARGETS]{};
  std::string last_target_position_text_[NUM_TARGETS]{};
  bool has_last_raw_target_text_[NUM_TARGETS]{};
  bool has_last_target_position_text_[NUM_TARGETS]{};

  // Boot settling — gate relay state changes until the device has either
  // received its first frame or waited out BOOT_SETTLE_MS. Template switches
  // re-fire turn_on/turn_off on boot from HA's restored state, and acting on
  // the very first loop tick (before LD2450 frames or HA restoration) can
  // produce a brief incorrect state. See project memory feedback_template_switch_restore.
  bool boot_settled_ = false;
  uint32_t boot_ms_ = 0;
  static constexpr uint32_t BOOT_SETTLE_MS = 2000;

  // Track our own last-issued relay desired state so we don't fight a
  // user-driven toggle from HA. See epp_relay_publish.h for the rationale.
  // Reading relay_switch_->state instead would re-issue every loop tick after
  // the user toggled the switch, undoing user intent.
  bool relay_desired_state_ = false;
  bool has_relay_desired_state_ = false;

  // Stale-frame watchdog. If the LD2450 stops sending (radar dies, UART hangs)
  // the throttle timers must still fire and publish "no signal" so HA sees
  // the device go offline rather than having every sensor frozen at its last
  // value. STALE_FRAME_MS is generous: at 10Hz LD2450 rate, 5s = 50 missed
  // frames, well past any plausible scheduling jitter. See is_frame_stale in
  // epp_frame_staleness.h.
  uint32_t last_frame_ms_ = 0;
  bool has_received_frame_ = false;
  bool was_stale_ = false;  // edge-detect for one-shot stale/recover log lines
  static constexpr uint32_t STALE_FRAME_MS = 5000;
};

}  // namespace epp
