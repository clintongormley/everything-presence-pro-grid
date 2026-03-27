#pragma once

#include "esphome/core/component.h"
#include "esphome/components/binary_sensor/binary_sensor.h"
#include "esphome/components/text_sensor/text_sensor.h"

#include "epp_calibration.h"
#include "epp_grid.h"
#include "epp_rolling_window.h"
#include "epp_tumbling_window.h"
#include "epp_zone_engine.h"

#include <string>

namespace epp {

struct ParsedTarget {
  float x = 0.0f;       // mm, sensor coordinate space (transformed)
  float y = 0.0f;       // mm
  bool detected = false;
};

class EPPComponent : public esphome::Component {
 public:
  void setup() override;
  void loop() override;
  float get_setup_priority() const override;

  /// Called from LD2450 UART lambda with parsed target data
  void feed_targets(float x1, float y1, bool d1,
                    float x2, float y2, bool d2,
                    float x3, float y3, bool d3);

  /// Configuration services (called from API actions)
  void set_perspective(const std::string &perspective, float room_width, float room_depth);
  void set_grid(const std::string &grid_data, float origin_x, float origin_y);
  void set_zones(const std::string &zones_json);

  // Sensor setters (called from generated code)
  void set_device_tracking_sensor(esphome::binary_sensor::BinarySensor *sensor) {
    device_tracking_sensor_ = sensor;
  }
  void set_firmware_version_sensor(esphome::text_sensor::TextSensor *sensor) {
    firmware_version_sensor_ = sensor;
  }
  void set_zone_occupancy_sensor(int index, esphome::binary_sensor::BinarySensor *sensor) {
    if (index >= 0 && index < MAX_ZONE_SLOTS)
      zone_occupancy_sensors_[index] = sensor;
  }
  void set_target_position_sensor(int index, esphome::text_sensor::TextSensor *sensor) {
    if (index >= 0 && index < MAX_TARGETS)
      target_position_sensors_[index] = sensor;
  }
  void set_raw_target_sensor(int index, esphome::text_sensor::TextSensor *sensor) {
    if (index >= 0 && index < NUM_TARGETS)
      raw_target_sensors_[index] = sensor;
  }
  void set_zone_state_sensor(esphome::text_sensor::TextSensor *sensor) {
    zone_state_sensor_ = sensor;
  }
  void set_window_duration(uint32_t ms) { window_.set_window_duration(ms); }
  void set_display_interval(uint32_t ms) { display_interval_ms_ = ms; }
  void set_zone_publish_interval(uint32_t ms) { zone_publish_interval_ms_ = ms; }

 protected:
  static constexpr int NUM_TARGETS = 3;
  static constexpr uint8_t NVS_SCHEMA_VERSION = 1;

  // Target data from LD2450
  ParsedTarget targets_[NUM_TARGETS]{};
  bool frame_ready_ = false;
  uint32_t frame_count_ = 0;

  // Zone engine pipeline
  SensorTransform transform_;
  Grid grid_;
  RollingWindow window_{1000};
  ZoneEngine zone_engine_;

  // NVS persistence
  void restore_from_nvs_();
  void save_perspective_to_nvs_();
  void save_grid_to_nvs_();
  void save_zones_to_nvs_(const std::string &zones_json);

  // Cached perspective blob for NVS (8 coeffs + room_width + room_depth)
  float persp_cache_[10]{};
  bool has_persp_cache_ = false;

  // Cached zones JSON for NVS persistence
  std::string last_zones_json_;

  // Previous state for transition logging
  bool prev_tracking_{false};
  bool prev_zone_occ_[MAX_ZONE_SLOTS]{};

  // Sensor pointers
  esphome::binary_sensor::BinarySensor *device_tracking_sensor_{nullptr};
  esphome::text_sensor::TextSensor *firmware_version_sensor_{nullptr};
  esphome::binary_sensor::BinarySensor *zone_occupancy_sensors_[MAX_ZONE_SLOTS]{};
  esphome::text_sensor::TextSensor *target_position_sensors_[MAX_TARGETS]{};

  // Raw target text sensors (pre-transform, post-median)
  esphome::text_sensor::TextSensor *raw_target_sensors_[NUM_TARGETS]{};

  // Zone state text sensor (JSON at 1Hz)
  esphome::text_sensor::TextSensor *zone_state_sensor_{nullptr};

  // Publish throttle intervals (ms)
  uint32_t display_interval_ms_ = 200;
  uint32_t zone_publish_interval_ms_ = 1000;

  // Publish throttle timestamps
  uint32_t last_display_publish_ms_ = 0;
  uint32_t last_zone_publish_ms_ = 0;

  // Cached zone result
  ProcessingResult last_zone_result_{};
};

}  // namespace epp
