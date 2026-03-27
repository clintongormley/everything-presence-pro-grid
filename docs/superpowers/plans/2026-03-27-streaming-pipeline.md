# Streaming Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the firmware rolling median, perspective transform, and zone engine processing pipeline with structured event streaming to the frontend via websocket subscriptions.

**Architecture:** A RollingWindow replaces the TumblingWindow -- it maintains a 1s circular buffer of frames, computes median on every frame at ~10Hz, and expires old frames by timestamp. The epp component runs the full pipeline every frame (median -> transform -> zone engine) and publishes at configurable throttled rates: raw + grid positions at 5Hz, zone state at 1Hz. The backend parses text sensor state updates into structured JSON events matching the frontend's expected format.

**Tech Stack:** C++17 (doctest, CMake), ESPHome YAML, Python 3.13, Home Assistant websocket API

**Spec:** `docs/superpowers/specs/2026-03-27-streaming-pipeline.md`

---

## File Structure

```
firmware/lib/epp_zone_engine/
  include/epp_rolling_window.h   -- NEW: RollingWindow class declaration
  src/epp_rolling_window.cpp     -- NEW: RollingWindow implementation
  tests/test_rolling_window.cpp  -- NEW: TDD tests for RollingWindow
  CMakeLists.txt                 -- MODIFY: add epp_rolling_window.cpp to library sources
  tests/CMakeLists.txt           -- MODIFY: add test_rolling_window.cpp test target

firmware/components/epp/
  epp_component.h                -- MODIFY: add RollingWindow, raw sensors, throttle fields, zone_state sensor
  epp_component.cpp              -- MODIFY: rewrite loop() to 3-stage pipeline + 2 publish throttles
  __init__.py                    -- MODIFY: add raw_target_positions, zone_state schemas + codegen

firmware/common/
  everything-presence-pro-base.yaml  -- MODIFY: add raw_target_positions, zone_state, globals, API action

custom_components/eppgrid/
  device_manager.py              -- MODIFY: cache entity list in DeviceConnection, add pipeline push
  websocket_api.py               -- MODIFY: rewrite subscribe_grid_targets, add subscribe_raw_targets, add set_pipeline

tests/
  test_websocket_api_v2.py       -- MODIFY: add tests for new/rewritten websocket handlers
  test_device_manager.py         -- MODIFY: add tests for entity caching
```

---

## Build & Test Commands

**C++ (initial build):**
```bash
cd firmware/lib/epp_zone_engine && cmake -B build -DEPP_BUILD_TOOLS=OFF -DCMAKE_POLICY_VERSION_MINIMUM=3.5 && cmake --build build && cd build && ctest --output-on-failure
```

**C++ (incremental):**
```bash
cd firmware/lib/epp_zone_engine/build && cmake --build . && ctest --output-on-failure
```

**Python tests:**
```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/ -v
```

**ESPHome compile:**
```bash
/Users/clintongormley/workspace/.venv/bin/python -m esphome compile firmware/variants/wifi.yaml
```

---

### Task 1: RollingWindow C++ Library (TDD)

Create the RollingWindow class that maintains a time-based circular buffer of frames and computes a rolling median. This replaces the TumblingWindow for the streaming pipeline. Uses existing `TargetInput`, `WindowOutput`, `TargetWindow`, `compute_median` from `epp_tumbling_window.h`.

**Files:** `firmware/lib/epp_zone_engine/include/epp_rolling_window.h`, `firmware/lib/epp_zone_engine/src/epp_rolling_window.cpp`, `firmware/lib/epp_zone_engine/tests/test_rolling_window.cpp`, `firmware/lib/epp_zone_engine/CMakeLists.txt`, `firmware/lib/epp_zone_engine/tests/CMakeLists.txt`

- [ ] **Step 1: Create the header file `epp_rolling_window.h`**

Create `firmware/lib/epp_zone_engine/include/epp_rolling_window.h` with the `RollingWindow` class declaration. Include `epp_tumbling_window.h` to reuse `TargetInput`, `WindowOutput`, `TargetWindow`, and `compute_median`. The class uses millisecond timestamps (uint32_t) unlike TumblingWindow which uses float seconds.

```cpp
#pragma once

#include "epp_tumbling_window.h"  // TargetInput, WindowOutput, TargetWindow, compute_median

namespace epp {

class RollingWindow {
public:
    explicit RollingWindow(uint32_t window_ms = 1000);

    /// Feed a frame with its timestamp (ms). Expires frames older than window_ms.
    void feed(const TargetInput targets[], int target_count, uint32_t timestamp_ms);

    /// Compute current output (median of frames within window).
    /// Always valid after at least one feed() call.
    WindowOutput output() const;

    void set_window_duration(uint32_t ms) { window_ms_ = ms; }
    void reset();

private:
    static constexpr int MAX_FRAMES = 16;

    struct Frame {
        TargetInput targets[MAX_TARGETS];
        uint32_t timestamp_ms;
    };

    uint32_t window_ms_;
    Frame frames_[MAX_FRAMES];
    int head_ = 0;
    int count_ = 0;

    void expire_old(uint32_t now_ms);
};

}  // namespace epp
```

- [ ] **Step 2: Write the test file `test_rolling_window.cpp` (RED phase)**

Create `firmware/lib/epp_zone_engine/tests/test_rolling_window.cpp` with all test cases. Use doctest and the same `make_frame` helper pattern as `test_tumbling_window.cpp`. Tests cover:

1. **Single frame** -- feeding one frame produces correct output with median = that frame's values, frame_count=1, total_frames=1
2. **Multiple frames within window** -- feeding 5 frames at 100ms intervals, output() median matches expected values
3. **Time-based expiry** -- feed 10 frames at 100ms intervals (0-900ms), then feed at 1500ms; frames before 500ms should be expired; verify frame_count reflects only non-expired active frames
4. **Median computation** -- feed frames with x values [1, 3, 5, 2, 4], verify median_x = 3.0
5. **frame_count per target** -- target 0 active every frame, target 1 active only on even frames; verify frame_counts differ correctly
6. **total_frames** -- verify total_frames counts all frames in window regardless of target activity
7. **Empty window** -- output() before any feed() returns all-inactive targets
8. **Variable frame rates** -- feed at irregular intervals (80ms, 120ms, 90ms, 110ms), verify correct behavior
9. **Runtime duration change** -- feed frames with 1000ms window, change to 500ms, verify old frames are expelled
10. **Buffer overflow / wrap** -- feed > MAX_FRAMES frames rapidly, verify oldest are dropped and output stays valid
11. **Inactive targets don't contribute** -- targets with active=false don't affect median or frame_count
12. **Reset clears state** -- after reset(), output() returns all-inactive

```cpp
// Use: #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
// Include doctest and epp_rolling_window.h
// Helper: make_frame() same as tumbling window tests
```

- [ ] **Step 3: Add RollingWindow source and test to CMakeLists**

In `firmware/lib/epp_zone_engine/CMakeLists.txt`, add `src/epp_rolling_window.cpp` to the `add_library(epp_zone_engine ...)` source list.

In `firmware/lib/epp_zone_engine/tests/CMakeLists.txt`, add:

```cmake
add_executable(epp_rolling_window_tests
    test_rolling_window.cpp
)
target_link_libraries(epp_rolling_window_tests PRIVATE epp_zone_engine doctest::doctest)

doctest_discover_tests(epp_rolling_window_tests)
```

- [ ] **Step 4: Create stub `epp_rolling_window.cpp` and verify tests FAIL**

Create `firmware/lib/epp_zone_engine/src/epp_rolling_window.cpp` with just the constructor and empty method stubs (feed does nothing, output returns default WindowOutput, reset does nothing). Build and run tests to confirm they fail (RED phase).

```bash
cd firmware/lib/epp_zone_engine/build && cmake --build . && ctest --output-on-failure
```

Verify: rolling window tests fail, all existing tests still pass.

- [ ] **Step 5: Implement RollingWindow (GREEN phase)**

Implement the full `epp_rolling_window.cpp`:

- **Constructor**: initialize `window_ms_`, zero `head_` and `count_`
- **feed()**: call `expire_old(timestamp_ms)`, copy targets into `frames_[head_]`, set timestamp, advance head with wraparound (`head_ = (head_ + 1) % MAX_FRAMES`), increment count (capped at MAX_FRAMES -- if count was already MAX_FRAMES, the oldest frame is overwritten)
- **expire_old()**: iterate through stored frames, remove those where `now_ms - frame.timestamp_ms > window_ms_`. Implementation: find the oldest frame that is still within the window by scanning from the tail. The tail index is `(head_ - count_ + MAX_FRAMES) % MAX_FRAMES`. Walk forward, decrementing count for each expired frame.
- **output()**: iterate through all frames in the buffer (from tail to head), accumulate per-target x/y values for active frames into stack arrays (max MAX_FRAMES entries), compute median using `compute_median()`, set frame_count per target, set total_frames = count_
- **reset()**: set `head_ = 0`, `count_ = 0`

```bash
cd firmware/lib/epp_zone_engine/build && cmake --build . && ctest --output-on-failure
```

Verify: all rolling window tests pass, all existing tests still pass.

- [ ] **Step 6: Commit**

Commit message: "Add RollingWindow C++ library with time-based expiry and rolling median"

Files: `epp_rolling_window.h`, `epp_rolling_window.cpp`, `test_rolling_window.cpp`, both `CMakeLists.txt`

---

### Task 2: epp Component Changes (C++ + Python)

Update the epp ESPHome component to use RollingWindow, add raw target sensors and zone_state sensor, and rewrite loop() to the 3-stage pipeline with 2 publish throttles.

**Files:** `firmware/components/epp/epp_component.h`, `firmware/components/epp/epp_component.cpp`, `firmware/components/epp/__init__.py`

- [ ] **Step 1: Update `epp_component.h` -- add includes and new members**

Add `#include "epp_rolling_window.h"` to the includes.

Add to the `EPPComponent` class:

Public setters:
```cpp
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
```

Protected members:
```cpp
// Replace: TumblingWindow window_;
// With:
RollingWindow window_{1000};

// Raw target text sensors (pre-transform, post-median)
esphome::text_sensor::TextSensor *raw_target_sensors_[NUM_TARGETS]{};

// Zone state text sensor (JSON at 1Hz)
esphome::text_sensor::TextSensor *zone_state_sensor_{nullptr};

// Publish throttle intervals (ms) -- output throttles only
uint32_t display_interval_ms_ = 200;    // default 5Hz
uint32_t zone_publish_interval_ms_ = 1000; // default 1Hz

// Publish throttle timestamps
uint32_t last_display_publish_ms_ = 0;
uint32_t last_zone_publish_ms_ = 0;

// Cached zone result for merging into grid target events
ProcessingResult last_zone_result_{};
```

- [ ] **Step 2: Rewrite `epp_component.cpp` loop()**

Replace the entire `loop()` method body with the 3-stage pipeline from the spec:

**Stage 1 (every frame):** Build `TargetInput raw_inputs[]` from `targets_[]`, gating out y==0. Feed into `window_.feed(raw_inputs, NUM_TARGETS, now)` where `now = esphome::millis()`.

**Stage 2 (every frame):** Get `window_.output()`, apply `transform_.apply()` to each active target's median position to produce `grid_inputs[]`.

**Stage 3 (every frame):** Build a `WindowOutput zone_input` combining the window's frame counts with the grid-transformed positions. Call `zone_engine_.tick(zone_input, ts)` where `ts = now / 1000.0f`. Cache result in `last_zone_result_`.

**Display publish throttle (default 5Hz):** When `now - last_display_publish_ms_ >= display_interval_ms_`:
- Publish raw target positions to `raw_target_sensors_[]` as `"x,y"` (smoothed, pre-transform). Empty string for inactive.
- Publish grid target positions to `target_position_sensors_[]` as `"x,y"` (post-transform). Empty string for inactive. Note: format changes from `"x,y,signal,status"` to `"x,y"`.

**Zone state publish throttle (default 1Hz):** When `now - last_zone_publish_ms_ >= zone_publish_interval_ms_`:
- Publish zone occupancy binary sensors
- Publish device tracking binary sensor
- Publish zone_state text sensor as compact JSON: `{"targets":[{"signal":N,"status":"S"},...],"zones":{"occupancy":[bool,...],"tracking":bool},"frame_count":N}`
- State transition logging (same as existing)

Remove the old target-activity logging block (`if (result.targets[i].status != TargetStatus::INACTIVE)`) and the periodic frame_count logging block (`if (frame_count_ % 100 == 0)`).

- [ ] **Step 3: Update `__init__.py` -- add raw_target_positions schema**

Add after existing constants:
```python
CONF_RAW_TARGET_POSITIONS = "raw_target_positions"
```

Add schema:
```python
RAW_TARGET_POSITIONS_SCHEMA = cv.Schema(
    {cv.Optional(f"target_{i}"): text_sensor.text_sensor_schema() for i in range(3)}
)
```

Add to `CONFIG_SCHEMA`:
```python
cv.Optional(CONF_RAW_TARGET_POSITIONS): RAW_TARGET_POSITIONS_SCHEMA,
```

Add to `to_code()`:
```python
if CONF_RAW_TARGET_POSITIONS in config:
    raw_conf = config[CONF_RAW_TARGET_POSITIONS]
    for i in range(3):
        key = f"target_{i}"
        if key in raw_conf:
            sens = await text_sensor.new_text_sensor(raw_conf[key])
            cg.add(var.set_raw_target_sensor(i, sens))
```

- [ ] **Step 4: Update `__init__.py` -- add zone_state schema**

Add constant:
```python
CONF_ZONE_STATE = "zone_state"
```

Add to `CONFIG_SCHEMA`:
```python
cv.Optional(CONF_ZONE_STATE): text_sensor.text_sensor_schema(),
```

Add to `to_code()`:
```python
if CONF_ZONE_STATE in config:
    sens = await text_sensor.new_text_sensor(config[CONF_ZONE_STATE])
    cg.add(var.set_zone_state_sensor(sens))
```

- [ ] **Step 5: ESPHome compile to verify**

```bash
/Users/clintongormley/workspace/.venv/bin/python -m esphome compile firmware/variants/wifi.yaml
```

Verify: compiles without errors.

- [ ] **Step 6: Commit**

Commit message: "Rewrite epp component to rolling median pipeline with throttled publishing"

Files: `epp_component.h`, `epp_component.cpp`, `__init__.py`

---

### Task 3: YAML Configuration -- Globals, Sensors, and API Action

Add the new text sensors, globals, and API action to the firmware YAML.

**File:** `firmware/common/everything-presence-pro-base.yaml`

- [ ] **Step 1: Add `raw_target_positions` to the epp config block**

Add after the existing `target_positions:` section in the `epp:` block:

```yaml
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

- [ ] **Step 2: Add `zone_state` to the epp config block**

Add after `raw_target_positions:`:

```yaml
  zone_state:
    name: "Zone State"
    disabled_by_default: true
```

- [ ] **Step 3: Add `display_interval_ms` and `zone_publish_interval_ms` globals**

Add to the existing `globals:` section:

```yaml
  - id: display_interval_ms
    type: uint32_t
    initial_value: '200'
  - id: zone_publish_interval_ms
    type: uint32_t
    initial_value: '1000'
```

- [ ] **Step 4: Add `epp_set_pipeline` API action**

Add to the `api: actions:` section:

```yaml
    - action: epp_set_pipeline
      variables:
        display_interval: int
        zone_publish_interval: int
        window_duration: int
      then:
        - lambda: |-
            id(display_interval_ms) = display_interval;
            id(zone_publish_interval_ms) = zone_publish_interval;
            id(epp_component).set_window_duration(window_duration);
```

- [ ] **Step 5: ESPHome compile to verify**

```bash
/Users/clintongormley/workspace/.venv/bin/python -m esphome compile firmware/variants/wifi.yaml
```

Verify: compiles without errors.

- [ ] **Step 6: Commit**

Commit message: "Add raw target sensors, zone state sensor, pipeline globals and API action"

Files: `everything-presence-pro-base.yaml`

---

### Task 4: Backend -- Cache Entity List in DeviceConnection

Modify `DeviceConnection.async_connect()` to cache the entity list returned by `list_entities_services()`. This enables subscription handlers to map entity keys to roles (e.g., which key is "Raw Target 0" vs "Target 0 Position").

**Files:** `custom_components/eppgrid/device_manager.py`, `tests/test_device_manager.py`

- [ ] **Step 1: Write test for entity caching (RED phase)**

Add a test class `TestEntityCaching` to `tests/test_device_manager.py`:

```python
class TestEntityCaching:
    async def test_entities_cached_on_connect(self) -> None:
        """async_connect() caches entity list from list_entities_services()."""
```

Mock `APIClient.connect` and `APIClient.list_entities_services` to return a known entity list. After `async_connect()`, verify `conn._entities` contains the expected entities.

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_device_manager.py -v -k TestEntityCaching
```

Verify: test fails because `_entities` attribute doesn't exist yet.

- [ ] **Step 2: Implement entity caching (GREEN phase)**

In `DeviceConnection.__init__()`, add:
```python
self._entities: list = []
```

In `DeviceConnection.async_connect()`, change:
```python
_entities, services = await client.list_entities_services()
```
to:
```python
entities, services = await client.list_entities_services()
```

And add after `self._services = ...`:
```python
self._entities = entities
```

In `DeviceConnection.async_disconnect()`, add:
```python
self._entities.clear()
```

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_device_manager.py -v -k TestEntityCaching
```

Verify: test passes.

- [ ] **Step 3: Run full Python test suite**

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/ -v
```

Verify: all tests pass.

- [ ] **Step 4: Commit**

Commit message: "Cache entity list in DeviceConnection for key-to-role mapping"

Files: `device_manager.py`, `test_device_manager.py`

---

### Task 5: Backend -- Rewrite subscribe_grid_targets + Add subscribe_raw_targets

Rewrite `websocket_subscribe_grid_targets` to produce structured events and add a new `websocket_subscribe_raw_targets` handler. Both use entity key mapping from the cached entity list.

**Files:** `custom_components/eppgrid/websocket_api.py`, `tests/test_websocket_api_v2.py`

- [ ] **Step 1: Write tests for subscribe_raw_targets (RED phase)**

Add a test class `TestSubscribeRawTargets` to `tests/test_websocket_api_v2.py`:

Tests:
1. **test_subscribe_raw_targets_sends_structured_event** -- Mock a DeviceConnection with cached entities that include `TextSensorInfo` entries with names like "Raw Target 0", "Raw Target 1", "Raw Target 2". Simulate a `TextSensorState` callback with key matching "Raw Target 0" and state "1234,-567". Verify the websocket event has the structure: `{"targets": [{"raw_x": 1234.0, "raw_y": -567.0}, {"raw_x": null, ...}, ...]}`
2. **test_subscribe_raw_targets_inactive** -- Simulate state callback with empty string state. Verify target has `raw_x: null, raw_y: null`.
3. **test_subscribe_raw_targets_device_not_found** -- Verify error when mac doesn't match a device.

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_websocket_api_v2.py -v -k TestSubscribeRawTargets
```

Verify: tests fail because the handler doesn't exist.

- [ ] **Step 2: Write tests for rewritten subscribe_grid_targets (RED phase)**

Add a test class `TestSubscribeGridTargetsStructured` to `tests/test_websocket_api_v2.py`:

Tests:
1. **test_grid_targets_position_event** -- Mock cached entities with `TextSensorInfo` for "Target 0 Position" etc. Simulate a TextSensorState with state "1500,2000". Verify event structure: `{"targets": [{"x": 1500.0, "y": 2000.0, "signal": 0, "status": "inactive"}, ...], "sensors": {...}, "zones": {...}}`
2. **test_grid_targets_zone_state_update** -- Simulate a TextSensorState for "Zone State" with JSON payload. Verify zone state and target signal/status are updated in subsequent position events.
3. **test_grid_targets_binary_sensor_update** -- Simulate BinarySensorState updates for occupancy. Verify sensors dict is updated.
4. **test_grid_targets_inactive_position** -- Simulate empty string state for a target position. Verify target has `x: null, y: null`.

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_websocket_api_v2.py -v -k TestSubscribeGridTargetsStructured
```

Verify: tests fail.

- [ ] **Step 3: Implement helper -- build entity key map**

Add a private helper function in `websocket_api.py` that takes a `DeviceConnection`'s cached entities and returns a dict mapping role names to entity keys:

```python
def _build_entity_key_map(entities: list) -> dict[str, int]:
    """Build a map from entity name to numeric key for state subscriptions."""
    from aioesphomeapi import TextSensorInfo, BinarySensorInfo, SensorInfo
    key_map = {}
    for entity_list in entities:
        for entity in entity_list if isinstance(entity_list, list) else [entity_list]:
            if isinstance(entity, (TextSensorInfo, BinarySensorInfo, SensorInfo)):
                key_map[entity.name] = entity.key
    return key_map
```

Note: `list_entities_services()` returns a flat list of entity info objects. Inspect the actual structure returned by aioesphomeapi to build the map correctly. The key attribute is `entity.key` and the name is `entity.name`.

- [ ] **Step 4: Implement `websocket_subscribe_raw_targets`**

Add handler:
```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/subscribe_raw_targets",
    vol.Required("mac"): str,
})
@websocket_api.async_response
async def websocket_subscribe_raw_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
```

Logic:
1. Get or create device connection via manager
2. Build key map from cached entities
3. Find keys for "Raw Target 0", "Raw Target 1", "Raw Target 2"
4. Build a reverse map: `{key: index}` for the 3 raw target sensors
5. Maintain `raw_targets = [{"raw_x": None, "raw_y": None}] * 3`
6. On each TextSensorState matching a raw target key:
   - Parse "x,y" string to floats (or set null if empty)
   - Update the corresponding element
   - Send full `{"targets": raw_targets}` event
7. Register unsubscribe callback

Register in `async_register_websocket_commands()`.

- [ ] **Step 5: Rewrite `websocket_subscribe_grid_targets`**

Replace the existing handler body with structured event logic:

1. Get or create device connection
2. Build key map from cached entities
3. Find keys for:
   - Target positions: "Target 0 Position", "Target 1 Position", "Target 2 Position"
   - Zone state: "Zone State"
   - Binary sensors: occupancy, zone occupancy, device tracking, etc.
4. Maintain accumulated state:
   - `targets = [{"x": None, "y": None, "signal": 0, "status": "inactive"}] * 3`
   - `sensors = {"occupancy": False, "static_presence": False, "motion_presence": False, "target_presence": False}`
   - `zones = {"occupancy": {}, "target_counts": {}, "frame_count": 0}`
5. On TextSensorState for target position keys:
   - Parse "x,y" to floats (or null if empty)
   - Update the corresponding target
   - Send full `{"targets": targets, "sensors": sensors, "zones": zones}` event
6. On TextSensorState for "Zone State" key:
   - Parse JSON payload
   - Update target signal/status from `payload["targets"]`
   - Update zone occupancy from `payload["zones"]["occupancy"]`
   - Update sensors.target_presence from `payload["zones"]["tracking"]`
   - Update frame_count from `payload["frame_count"]`
   - Do NOT send an event here (position updates trigger events at 5Hz)
7. On BinarySensorState for known sensor keys:
   - Update the corresponding sensor value
   - Do NOT send an event (position updates trigger events)
8. Register unsubscribe callback

- [ ] **Step 6: Run tests to verify (GREEN phase)**

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_websocket_api_v2.py -v -k "TestSubscribeRawTargets or TestSubscribeGridTargetsStructured"
```

Verify: all new tests pass.

- [ ] **Step 7: Run full Python test suite**

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/ -v
```

Verify: all tests pass (including any existing subscribe_grid_targets tests that may need updating to match the new event format).

- [ ] **Step 8: Commit**

Commit message: "Rewrite grid target subscription and add raw target subscription with structured events"

Files: `websocket_api.py`, `test_websocket_api_v2.py`

---

### Task 6: Backend -- Add set_pipeline Websocket Command + Push Config

Add a websocket command to configure pipeline settings and push them to the device via the `epp_set_pipeline` API action.

**Files:** `custom_components/eppgrid/websocket_api.py`, `custom_components/eppgrid/device_manager.py`, `tests/test_websocket_api_v2.py`

- [ ] **Step 1: Write tests for set_pipeline (RED phase)**

Add a test class `TestSetPipeline` to `tests/test_websocket_api_v2.py`:

Tests:
1. **test_set_pipeline_saves_and_pushes** -- Send `eppgrid/set_pipeline` with `{mac, display_interval_ms: 100, zone_publish_interval_ms: 500, window_duration_ms: 800}`. Verify it stores under `device_config["pipeline"]` in the store and calls `_push_config_to_device`.
2. **test_set_pipeline_not_ready** -- Verify error when integration not loaded.

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_websocket_api_v2.py -v -k TestSetPipeline
```

Verify: tests fail.

- [ ] **Step 2: Implement `websocket_set_pipeline`**

Add handler:
```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_pipeline",
    vol.Required("mac"): str,
    vol.Required("display_interval_ms"): vol.All(vol.Coerce(int), vol.Range(min=50, max=1000)),
    vol.Required("zone_publish_interval_ms"): vol.All(vol.Coerce(int), vol.Range(min=100, max=2000)),
    vol.Required("window_duration_ms"): vol.All(vol.Coerce(int), vol.Range(min=200, max=2000)),
})
@websocket_api.async_response
async def websocket_set_pipeline(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
```

Logic:
1. Get manager
2. Store pipeline config: `device_config["pipeline"] = {"display_interval": msg["display_interval_ms"], "zone_publish_interval": msg["zone_publish_interval_ms"], "window_duration": msg["window_duration_ms"]}`
3. Save store
4. Push config to device
5. Send result

Register in `async_register_websocket_commands()`.

- [ ] **Step 3: Add pipeline to `async_push_config` in DeviceConnection**

In `device_manager.py`, add `("pipeline", "epp_set_pipeline")` to the push config loop at the end of `async_push_config()`:

```python
for key, action_name in (
    ("env_calibration", "epp_set_env_calibration"),
    ("motion_timeout", "epp_set_motion_timeout"),
    ("tracking", "epp_set_tracking"),
    ("static_presence", "epp_set_static_presence"),
    ("pipeline", "epp_set_pipeline"),
):
```

The pipeline config dict keys (`display_interval`, `zone_publish_interval`, `window_duration`) match the API action variable names, so the generic push loop handles it correctly.

- [ ] **Step 4: Run tests to verify (GREEN phase)**

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/test_websocket_api_v2.py -v -k TestSetPipeline
```

Verify: tests pass.

- [ ] **Step 5: Run full test suite**

```bash
/Users/clintongormley/workspace/.venv/bin/pytest tests/ -v
```

Verify: all tests pass.

- [ ] **Step 6: Commit**

Commit message: "Add set_pipeline websocket command and config push for pipeline tuning"

Files: `websocket_api.py`, `device_manager.py`, `test_websocket_api_v2.py`
