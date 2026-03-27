# Streaming Pipeline Spec

## Goal

Implement the target data streaming pipeline so the frontend gets structured events at the correct rates from both `subscribe_raw_targets` and `subscribe_grid_targets`.

## Pipeline

```
LD2450 UART (10Hz raw frames)
  → epp component receives via feed_targets()
    → 5Hz rolling median smoother (new)
      → publish raw_x, raw_y text sensors  ←── subscribe_raw_targets
      → perspective transform
        → publish x, y text sensors (5Hz)  ←── subscribe_grid_targets (positions)
        → tumbling window (1Hz)
          → zone engine tick
            → publish zone occupancy, target signal/status  ←── subscribe_grid_targets (state)
```

The median smoother is the single source of truth. Everything downstream consumes its output.

## Firmware Changes

### Rolling Median Smoother (new, in epp component)

A 200ms rolling median that outputs at 5Hz (every 200ms). Accumulates the ~2 raw frames per window and computes median x,y per target. Simpler than the 1s tumbling window — just needs a small circular buffer.

```cpp
struct MedianSmoother {
    static constexpr int WINDOW_FRAMES = 3;  // ~2 frames at 10Hz per 200ms window
    float xs[MAX_TARGETS][WINDOW_FRAMES];
    float ys[MAX_TARGETS][WINDOW_FRAMES];
    bool detected[MAX_TARGETS][WINDOW_FRAMES];
    int count = 0;
    uint32_t last_emit_ms = 0;

    void accumulate(const ParsedTarget targets[], int n);
    bool should_emit(uint32_t now_ms);  // true every 200ms
    void emit(ParsedTarget output[]);   // median of accumulated samples
    void reset();
};
```

### epp_component.h additions

```cpp
// 5Hz median smoother for display
MedianSmoother smoother_;

// Smoothed raw positions (pre-transform) — published at 5Hz
ParsedTarget smoothed_raw_[NUM_TARGETS]{};

// Smoothed transformed positions — published at 5Hz
ParsedTarget smoothed_grid_[NUM_TARGETS]{};

// Text sensor pointers for raw target positions
esphome::text_sensor::TextSensor *raw_target_sensors_[NUM_TARGETS]{};

// Setter
void set_raw_target_sensor(int index, esphome::text_sensor::TextSensor *sensor);
```

### epp_component.cpp loop() changes

Current `loop()` does: transform → tumbling window → zone tick (1Hz) → publish everything.

New `loop()`:

```cpp
void EPPComponent::loop() {
    if (!frame_ready_) return;
    frame_ready_ = false;
    frame_count_++;

    uint32_t now = esphome::millis();
    float ts = now / 1000.0f;

    // Accumulate raw frame into median smoother
    smoother_.accumulate(targets_, NUM_TARGETS);

    // 5Hz: emit smoothed positions
    if (smoother_.should_emit(now)) {
        smoother_.emit(smoothed_raw_);

        // Publish raw target positions (pre-transform)
        for (int i = 0; i < NUM_TARGETS; i++) {
            if (raw_target_sensors_[i] != nullptr) {
                if (smoothed_raw_[i].detected && smoothed_raw_[i].y != 0.0f) {
                    char buf[32];
                    snprintf(buf, sizeof(buf), "%.0f,%.0f",
                             smoothed_raw_[i].x, smoothed_raw_[i].y);
                    raw_target_sensors_[i]->publish_state(buf);
                } else {
                    raw_target_sensors_[i]->publish_state("");
                }
            }
        }

        // Transform smoothed raw → grid coordinates
        TargetInput inputs[MAX_TARGETS];
        for (int i = 0; i < NUM_TARGETS; i++) {
            if (smoothed_raw_[i].detected && smoothed_raw_[i].y != 0.0f) {
                auto [rx, ry] = transform_.apply(
                    smoothed_raw_[i].x, smoothed_raw_[i].y);
                inputs[i] = {rx, ry, true};
                smoothed_grid_[i] = {rx, ry, true};
            } else {
                inputs[i] = {0.0f, 0.0f, false};
                smoothed_grid_[i] = {0.0f, 0.0f, false};
            }
        }

        // Publish transformed target positions (x,y only, 5Hz)
        for (int i = 0; i < NUM_TARGETS; i++) {
            if (target_position_sensors_[i] != nullptr) {
                if (smoothed_grid_[i].detected) {
                    char buf[32];
                    snprintf(buf, sizeof(buf), "%.0f,%.0f",
                             smoothed_grid_[i].x, smoothed_grid_[i].y);
                    target_position_sensors_[i]->publish_state(buf);
                } else {
                    target_position_sensors_[i]->publish_state("");
                }
            }
        }

        // Feed tumbling window with transformed coordinates
        window_.feed(inputs, MAX_TARGETS, ts);
    }

    // 1Hz: zone engine tick (from tumbling window)
    // The tumbling window accumulates the 5Hz inputs and ticks at ~1s
    if (window_.ticked()) {
        const auto &result = zone_engine_.tick(window_.output(), ts);

        // Publish zone occupancy binary sensors
        for (int i = 0; i < MAX_ZONE_SLOTS; i++) {
            if (zone_occupancy_sensors_[i] != nullptr)
                zone_occupancy_sensors_[i]->publish_state(result.zone_occupancy[i]);
        }

        // Publish device tracking
        if (device_tracking_sensor_ != nullptr)
            device_tracking_sensor_->publish_state(result.device_tracking_present);

        // Cache latest zone result for grid target events
        // (signal and status are updated at 1Hz, positions at 5Hz)
        last_result_ = result;
    }
}
```

**Note:** The tumbling window interface needs a small change — currently `feed()` returns `bool ticked` and you must call `output()` in the same call. We need to either:
- Split into `feed()` + `ticked()` + `output()`, or
- Continue calling `feed()` at 5Hz instead of 10Hz (which changes the window's sample count but the zone engine is designed for this — it uses frame_count, not fixed sample assumptions)

The simplest approach: feed the tumbling window at 5Hz (from the smoother output) instead of 10Hz. The zone engine's `threshold_to_frame_count` uses the actual frame count from the window, so reducing from ~10 to ~5 frames per window doesn't break anything — the thresholds just need to be calibrated for the new rate.

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

Currently target position sensors publish `"x,y,signal,status"`. Change to just `"x,y"` — signal and status come from the zone engine at 1Hz and will be included in the structured event by the backend, not embedded in the text sensor value.

## Backend Changes

### `subscribe_raw_targets`

Add new websocket command. Opens a device connection, subscribes to state changes, filters for raw target text sensor updates, reformats into the structured event the frontend expects.

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/subscribe_raw_targets",
    vol.Required("mac"): str,
})
@websocket_api.async_response
async def websocket_subscribe_raw_targets(hass, connection, msg):
    manager = _get_manager(hass)
    mac = msg["mac"]
    device_conn = await manager.async_get_or_create_connection(mac)

    # Build key→index mapping from entity list
    raw_keys = {}  # entity key → target index
    for entity in device_conn.entities:
        if "raw_target_" in entity.unique_id:
            # Extract index from unique_id
            ...

    @callback
    def _on_state(state):
        if isinstance(state, TextSensorState) and state.key in raw_keys:
            # Parse "x,y" or "" and build targets array
            targets = [{"raw_x": None, "raw_y": None}] * 3
            # ... parse and send event
            connection.send_message(
                websocket_api.event_message(msg["id"], {"targets": targets})
            )

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub():
        hass.async_create_task(manager.async_release_connection(mac))
    connection.subscriptions[msg["id"]] = _unsub
```

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

The handler maintains local state for positions (5Hz from target text sensors), zone occupancy (1Hz from binary sensors), and sensor readings. On each target position update, it sends a full event with the latest accumulated state.

```python
@websocket_api.async_response
async def websocket_subscribe_grid_targets(hass, connection, msg):
    manager = _get_manager(hass)
    mac = msg["mac"]
    device_conn = await manager.async_get_or_create_connection(mac)

    # Map entity keys to their roles
    target_keys = {}    # key → target index (from target_position text sensors)
    zone_keys = {}      # key → zone index (from zone_occupancy binary sensors)
    sensor_keys = {}    # key → sensor name

    # ... build mappings from device_conn.entities ...

    # Accumulated state
    targets = [{"x": None, "y": None, "signal": 0, "status": "inactive"}] * 3
    zones = {"occupancy": {}, "target_counts": {}, "frame_count": 0}
    sensors = {}

    @callback
    def _on_state(state):
        nonlocal targets, zones, sensors

        if isinstance(state, TextSensorState):
            if state.key in target_keys:
                idx = target_keys[state.key]
                if state.state:
                    parts = state.state.split(",")
                    targets[idx]["x"] = float(parts[0])
                    targets[idx]["y"] = float(parts[1])
                else:
                    targets[idx] = {"x": None, "y": None,
                                    "signal": 0, "status": "inactive"}
                # Send full event on each position update (5Hz)
                connection.send_message(
                    websocket_api.event_message(msg["id"], {
                        "targets": targets,
                        "sensors": sensors,
                        "zones": zones,
                    })
                )

        elif isinstance(state, BinarySensorState):
            if state.key in zone_keys:
                zone_idx = zone_keys[state.key]
                zones["occupancy"][str(zone_idx)] = state.state

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])
```

**Event format** (matches frontend expectations from data catalog):
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

### Key mapping challenge

The `subscribe_states` callback receives states by numeric `key` (an ESPHome internal entity key), not by name or unique_id. To map keys to roles (which text sensor is target_0 vs raw_target_0), the handler needs to call `list_entities_services()` first and build the mapping from entity names/unique_ids.

The `DeviceConnection.async_connect()` already calls `list_entities_services()` and caches services. It should also cache the entity list for key mapping.

Add to `DeviceConnection`:

```python
async def async_connect(self) -> None:
    # ... existing connect code ...
    entities, services = await self._client.list_entities_services()
    self._services = {s.name: s for s in services}
    self._entities = entities  # NEW: cache for key mapping
```

## Frontend Changes

### `_subscribeDisplay` → `subscribe_raw_targets`

Reimplement the stubbed-out method to use the new `subscribe_raw_targets` command:

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

This is identical to the old code except `entry_id` → `mac`.

### `subscribe_grid_targets` handler

No changes needed — the frontend already parses the structured `{targets, sensors, zones}` format. The backend now produces it.

## Signal and Status

The data catalog says `signal` and `status` update at 1Hz (from zone engine ticks). The target positions update at 5Hz. The backend accumulates both — each 5Hz position update sends the full event with the latest signal/status from the last zone tick.

The zone engine's `TickResult` contains `targets[i].signal` and `targets[i].status`. The epp component needs to publish these separately from positions (since they update at different rates). Options:

**A)** Add dedicated text sensors for signal/status per target (6 more text sensors)
**B)** Publish signal/status as part of a single zone state text sensor (1 text sensor with JSON)
**C)** Keep signal/status embedded in the target position text sensor (current format, but updates at 5Hz not 1Hz)

**Recommendation: C with a twist.** The target position text sensors publish `"x,y"` at 5Hz. A separate `zone_state` text sensor publishes JSON with all zone results at 1Hz:

```json
{"targets":[{"signal":5,"status":"active"},...],"zones":{"occupancy":[true,false,...],"tracking":true},"debug":"..."}
```

This way the backend receives one update per zone tick with all the state it needs, instead of 8+ separate binary sensor updates.

## Out of Scope

- Settings page reimplementation (separate task)
- Sensor state (occupancy, temperature, etc.) in grid events — needs entity key mapping for sensor entities
- Debug log in zone state
