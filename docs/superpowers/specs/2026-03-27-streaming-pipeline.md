# Streaming Pipeline Spec

## Goal

Implement the target data streaming pipeline so the frontend gets structured events at the correct rates from both `subscribe_raw_targets` and `subscribe_grid_targets`.

## Pipeline

```
LD2450 UART (10Hz raw frames)
  → epp component feed_targets()
    → rolling median window (1s, computed on every frame at 10Hz)
      → every 200ms (5Hz publish):
        → publish raw median x,y text sensors  ←── subscribe_raw_targets
        → perspective transform
          → publish grid x,y text sensors  ←── subscribe_grid_targets (positions)
      → every 1s (1Hz zone tick):
        → zone engine tick with current window output
          → publish zones, signal, status  ←── subscribe_grid_targets (state)
```

One rolling window, two publish rates. The window processes every frame at 10Hz to preserve full precision. Publication is throttled to 5Hz for display and 1Hz for zone state.

## Firmware Changes

### Replace TumblingWindow with RollingWindow

The existing `TumblingWindow` resets after each tick, losing accumulated data. A `RollingWindow` maintains a circular buffer of the last ~1s of frames and computes median over the current buffer contents at any time.

```cpp
class RollingWindow {
public:
    explicit RollingWindow(float window_s = 1.0f);

    /// Feed a frame (called at 10Hz). Updates internal buffer.
    void feed(const TargetInput targets[], int target_count, float timestamp);

    /// Compute current output (median of frames within window).
    /// Can be called at any rate — always reflects latest state.
    WindowOutput output() const;

    void reset();

private:
    static constexpr int MAX_FRAMES = 12;  // 1s at 10Hz + margin

    struct Frame {
        TargetInput targets[MAX_TARGETS];
        float timestamp;
    };

    float window_s_;
    Frame frames_[MAX_FRAMES];
    int head_ = 0;
    int count_ = 0;

    void expire_old(float now);
};
```

The `WindowOutput` struct stays the same (`TargetWindow` with `median_x`, `median_y`, `frame_count`, `active`). The zone engine's interface is unchanged — it still receives `WindowOutput` from `window.output()`.

**Key difference from TumblingWindow:**
- Tumbling: `feed()` returns `true` on tick, output is only valid then, buffer resets
- Rolling: `feed()` always updates, `output()` is always valid, buffer slides

The rolling window computes `frame_count` per target as the number of frames where that target was active within the window. This is what the zone engine uses for threshold detection — it scales automatically.

### epp_component.h changes

```cpp
// Replace TumblingWindow with RollingWindow
RollingWindow window_{1.0f};

// Raw target text sensors (pre-transform, published at 5Hz)
esphome::text_sensor::TextSensor *raw_target_sensors_[NUM_TARGETS]{};

// Publish throttle
uint32_t last_display_publish_ms_ = 0;
uint32_t last_zone_tick_ms_ = 0;

// Cached zone result (signal/status update at 1Hz, positions at 5Hz)
// Used by subscribe_grid_targets to merge 5Hz positions with 1Hz state
TickResult last_zone_result_{};

void set_raw_target_sensor(int index, esphome::text_sensor::TextSensor *sensor);
```

### epp_component.cpp loop() rewrite

```cpp
void EPPComponent::loop() {
    if (!frame_ready_) return;
    frame_ready_ = false;
    frame_count_++;

    uint32_t now = esphome::millis();
    float ts = now / 1000.0f;

    // Feed every raw frame into rolling window (10Hz)
    TargetInput raw_inputs[NUM_TARGETS];
    for (int i = 0; i < NUM_TARGETS; i++) {
        raw_inputs[i] = {targets_[i].x, targets_[i].y,
                         targets_[i].detected && targets_[i].y != 0.0f};
    }
    window_.feed(raw_inputs, NUM_TARGETS, ts);

    // 5Hz: publish display data
    if (now - last_display_publish_ms_ >= 200) {
        last_display_publish_ms_ = now;
        const auto &win = window_.output();

        // Publish raw target positions (pre-transform)
        for (int i = 0; i < NUM_TARGETS; i++) {
            if (raw_target_sensors_[i] != nullptr) {
                if (win.targets[i].active) {
                    char buf[32];
                    snprintf(buf, sizeof(buf), "%.0f,%.0f",
                             win.targets[i].median_x,
                             win.targets[i].median_y);
                    raw_target_sensors_[i]->publish_state(buf);
                } else {
                    raw_target_sensors_[i]->publish_state("");
                }
            }
        }

        // Transform → publish grid target positions
        for (int i = 0; i < NUM_TARGETS; i++) {
            if (target_position_sensors_[i] != nullptr) {
                if (win.targets[i].active) {
                    auto [rx, ry] = transform_.apply(
                        win.targets[i].median_x, win.targets[i].median_y);
                    char buf[32];
                    snprintf(buf, sizeof(buf), "%.0f,%.0f", rx, ry);
                    target_position_sensors_[i]->publish_state(buf);
                } else {
                    target_position_sensors_[i]->publish_state("");
                }
            }
        }
    }

    // 1Hz: zone engine tick
    if (now - last_zone_tick_ms_ >= 1000) {
        last_zone_tick_ms_ = now;

        // Transform the window output for zone engine
        const auto &win = window_.output();
        TargetInput grid_inputs[NUM_TARGETS];
        for (int i = 0; i < NUM_TARGETS; i++) {
            if (win.targets[i].active) {
                auto [rx, ry] = transform_.apply(
                    win.targets[i].median_x, win.targets[i].median_y);
                grid_inputs[i] = {rx, ry, true};
            } else {
                grid_inputs[i] = {0.0f, 0.0f, false};
            }
        }

        // Build WindowOutput for zone engine (with transformed coords)
        WindowOutput zone_input;
        zone_input.total_frames = win.total_frames;
        for (int i = 0; i < NUM_TARGETS; i++) {
            zone_input.targets[i].active = win.targets[i].active;
            zone_input.targets[i].frame_count = win.targets[i].frame_count;
            if (win.targets[i].active) {
                zone_input.targets[i].median_x = grid_inputs[i].x;
                zone_input.targets[i].median_y = grid_inputs[i].y;
            }
        }

        const auto &result = zone_engine_.tick(zone_input, ts);
        last_zone_result_ = result;

        // Publish zone occupancy binary sensors
        for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
            if (zone_occupancy_sensors_[i] != nullptr)
                zone_occupancy_sensors_[i]->publish_state(result.zone_occupancy[i]);
        }

        // Publish device tracking
        if (device_tracking_sensor_ != nullptr)
            device_tracking_sensor_->publish_state(result.device_tracking_present);

        // State transition logging
        if (result.device_tracking_present != prev_tracking_) {
            ESP_LOGI(TAG, "Tracking: %s",
                     result.device_tracking_present ? "present" : "clear");
            prev_tracking_ = result.device_tracking_present;
        }
        for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
            if (result.zone_occupancy[i] != prev_zone_occ_[i]) {
                ESP_LOGI(TAG, "Zone %d: %s", i,
                         result.zone_occupancy[i] ? "occupied" : "clear");
                prev_zone_occ_[i] = result.zone_occupancy[i];
            }
        }
    }
}
```

### ESPHome YAML changes

Add `raw_target_positions` to the epp component config in `everything-presence-pro-base.yaml`:

```yaml
epp:
  id: epp_component
  # ... existing config ...
  raw_target_positions:
    target_0:
      name: "Raw Target 0"
      disabled_by_default: true
    target_1:
      name: "Raw Target 1"
      disabled_by_default: true
    target_2:
      name: "Raw Target 2"
      disabled_by_default: true
```

### epp `__init__.py` changes

Add `raw_target_positions` schema and code generation:

```python
CONF_RAW_TARGET_POSITIONS = "raw_target_positions"

RAW_TARGET_POSITIONS_SCHEMA = cv.Schema(
    {cv.Optional(f"target_{i}"): text_sensor.text_sensor_schema() for i in range(3)}
)

CONFIG_SCHEMA = cv.Schema({
    # ... existing ...
    cv.Optional(CONF_RAW_TARGET_POSITIONS): RAW_TARGET_POSITIONS_SCHEMA,
})

async def to_code(config):
    # ... existing ...
    if CONF_RAW_TARGET_POSITIONS in config:
        raw_conf = config[CONF_RAW_TARGET_POSITIONS]
        for i in range(3):
            key = f"target_{i}"
            if key in raw_conf:
                sens = await text_sensor.new_text_sensor(raw_conf[key])
                cg.add(var.set_raw_target_sensor(i, sens))
```

### Target position text sensor format change

Currently target position sensors publish `"x,y,signal,status"`. Change to `"x,y"` — signal and status come from the zone engine at 1Hz and are included in the structured event by the backend, not embedded in the text sensor value.

## Backend Changes

### `subscribe_raw_targets`

Add new websocket command. Opens a device connection, subscribes to state changes, filters for raw target text sensor updates, reformats into the structured event the frontend expects.

The handler maintains a 3-element array of `{raw_x, raw_y}`. On each raw target text sensor update, it updates the corresponding element and sends the full array.

**Event format:**
```json
{
    "targets": [
        {"raw_x": 1234.0, "raw_y": -567.0},
        {"raw_x": null, "raw_y": null},
        {"raw_x": null, "raw_y": null}
    ]
}
```

### `subscribe_grid_targets`

Rewrite the existing handler to accumulate state from text sensor and binary sensor updates into the structured format the frontend expects.

The handler maintains:
- `targets[3]` — positions from target_position text sensors (5Hz)
- `zones` — occupancy from zone binary sensors (1Hz)
- `sensors` — from other binary/sensor entities

On each target position text sensor update (5Hz), send a full event with the latest accumulated state.

**Event format:**
```json
{
    "targets": [
        {"x": 1500.0, "y": 2000.0, "signal": 5, "status": "active"},
        {"x": null, "y": null, "signal": 0, "status": "inactive"},
        {"x": null, "y": null, "signal": 0, "status": "inactive"}
    ],
    "sensors": {
        "occupancy": true,
        "static_presence": false,
        "motion_presence": false,
        "target_presence": true
    },
    "zones": {
        "occupancy": {"0": true, "1": false},
        "target_counts": {},
        "frame_count": 0
    }
}
```

### Signal and status in grid events

The zone engine produces `signal` and `status` per target at 1Hz. These need to reach the backend's `subscribe_grid_targets` handler.

**Approach:** A single `zone_state` text sensor publishes JSON at 1Hz with all zone tick results:

```json
{"targets":[{"signal":5,"status":"active"},{"signal":0,"status":"inactive"},{"signal":0,"status":"inactive"}],"zones":{"occupancy":[true,false,false,false,false,false,false,false],"tracking":true},"frame_count":10}
```

The backend handler parses this JSON, updates the cached signal/status/zones, and the next 5Hz position update includes the latest values.

Add to epp component YAML:
```yaml
epp:
  zone_state:
    name: "Zone State"
    disabled_by_default: true
```

### Entity key mapping

The `subscribe_states` callback receives states by numeric `key`. To map keys to roles, `DeviceConnection.async_connect()` should cache the entity list:

```python
async def async_connect(self) -> None:
    # ... existing connect code ...
    entities, services = await self._client.list_entities_services()
    self._services = {s.name: s for s in services}
    self._entities = entities  # cache for key mapping
```

## Frontend Changes

### `_subscribeDisplay` → `subscribe_raw_targets`

Reimplement the stubbed-out method:

```typescript
private _subscribeDisplay(mac: string): void {
    this._unsubscribeDisplay();
    if (!this.hass || !mac) return;

    this.hass.connection
        .subscribeMessage(
            (event: any) => {
                this._rawTargets = (event.targets || []).map((t: any) => ({
                    raw_x: t.raw_x,
                    raw_y: t.raw_y,
                }));
            },
            {
                type: "eppgrid/subscribe_raw_targets",
                mac,
            },
        )
        .then((unsub: () => void) => {
            this._unsubDisplay = unsub;
        });
}
```

### `subscribe_grid_targets` handler

No changes needed — the frontend already parses the structured `{targets, sensors, zones}` format. The backend now produces it.

## Out of Scope

- Settings page reimplementation (separate task)
- RollingWindow C++ unit tests (should be added but can follow)
- Removing TumblingWindow (keep for now, remove after RollingWindow is proven)
