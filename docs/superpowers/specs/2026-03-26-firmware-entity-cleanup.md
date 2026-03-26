# Firmware Entity Cleanup Spec

## Goal

Clean up ESPHome firmware entities so HA shows only what users need. Remove unnecessary entities from firmware, make configuration entities internal (settable via API actions from the frontend settings page), and set appropriate `disabled_by_default` values.

## Principles

1. **All entities are ESPHome-owned** — the integration creates zero entities
2. **Firmware is the source of truth** for which entities exist and their default disabled state
3. **`disabled_by_default: true`** in firmware for entities that start hidden — the frontend can enable them
4. **Settings via API actions, state via entities** — configuration goes through API actions (same pattern as zone config), observable state through entities. No ESPHome number/select/switch entities exposed to HA for configuration.
5. **Internal entities** retain functionality in firmware lambdas without appearing in HA
6. **Frontend manages entity visibility** — the frontend enables/disables and renames entities as the user configures the device. The integration does NOT force-disable on discovery; firmware defaults handle that.

## Entity Audit

### Enabled by Default

| Entity | File | Notes |
|--------|------|-------|
| Occupancy | base | Combined occupancy (PIR + static + tracking). Remove `delayed_off` filter — underlying sources have their own timeouts. |
| Zone Engine Version | epp component | Diagnostic, used for device discovery |

### Disabled by Default (`disabled_by_default: true`)

| Entity | File | Notes |
|--------|------|-------|
| Humidity | base | Env sensor |
| Illuminance | base | Env sensor |
| Temperature | base | Env sensor |
| mmWave Presence | base | Presence component |
| Static Presence | sen0609 | GPIO binary sensor |
| Tracking Presence | ld2450 | LD2450-derived presence. Remove `delayed_off` filter — zone engine handles timeouts. |
| Motion Presence | base | **Renamed from "Motion"** in firmware YAML |
| Zone 0–7 Occupancy | epp component | Already `disabled_by_default: true` ✓ |
| Zone Tracking | epp component | Already `disabled_by_default: true` ✓ |
| Target 0–2 Position | epp component | Already `disabled_by_default: true` ✓ |

### Defer (Keep As-Is, Decide Later)

| Entity | File | Notes |
|--------|------|-------|
| Firmware Update | base (http_request) | OTA updates |
| LED | base | RGB LED light |
| LED Brightness | base | LED config |
| LED Mode | base | LED config |
| Relay Contact Mode | base | Relay config |
| Relay Output | base | Relay switch |
| Relay Trigger Mode | base | Relay config |
| Restart Device | base | Button |
| Reboot Tracking Sensor | ld2450 | Button, `disabled_by_default: true` |

### Make Internal (`internal: true`)

These entities remain functional in firmware (used in lambdas/filters) but invisible in HA. Settable via new API actions.

**everything-presence-pro-base.yaml:**
| Entity | ID | Used by |
|--------|-----|---------|
| Motion Timeout | `pir_off_delay` | Motion Presence `delayed_off` filter |
| Temperature Calibration | `env_temperature_offset` | Temperature sensor filter |
| Humidity Calibration | `env_humidity_offset` | Humidity sensor filter |
| Illuminance Calibration | `env_illuminance_offset` | Illuminance sensor filter |

**ld2450-base.yaml:**
| Entity | ID | Used by |
|--------|-----|---------|
| Tracking Detection Range | `ld2450_max_distance` | UART parsing range filter |

**sen0609-base.yaml:**
| Entity | ID | Used by |
|--------|-----|---------|
| Static Presence Sensor Enable | `dfrobot_sensor` | Sensor on/off (always on, but needed for UART command sequences) |
| Static Presence Min Range | `dfrobot_min_distance` | Range config |
| Static Presence Max Range | `dfrobot_max_distance` | Range config |
| Static Presence Trigger Range | `dfrobot_trigger_distance` | Trigger range |
| Static Presence Timeout | `dfrobot_off_delay` | Timeout config |
| Static Presence On Delay | `dfrobot_on_delay` | On delay config |
| Static Presence Sustain Sensitivity | `dfrobot_sustain_sensitivity` | Sensitivity |
| Static Presence Trigger Sensitivity | `dfrobot_trigger_sensitivity` | Sensitivity |
| Static Presence LED | `dfrobot_led_output` | Sensor LED |

### Remove Entirely from Firmware

**ld2450-base.yaml — Target entities (data streamed via `subscribe_grid_targets`):**
- Target 1/2/3 X, Y, Speed, Resolution, Angle, Distance (18 sensor entities)
- Target 1/2/3 Active (3 binary sensors)
- All entity update throttling code (`entities_update_count`, `entities_update_max_count`, `extra_entities`, `mmwave_update_time`, `mmwave_update_interval` globals)
- Update Speed, Target Update Rate, Target Tracking Detail selects
- Tracking Sensor Firmware text sensor
- LD2450 Bluetooth switch
- Factory Reset Tracking Sensor button
- Tracking Presence Timeout (`ld2450_off_delay`) — zone engine handles timeouts
- Tracking Sensor Angle (`ld2450_installation_angle`) — reset chip to 0 and remove
- Upside Down Mounting (`ld2450_upside_down`) — remove
- Auto-Clear Stuck Targets (`ld2450_stale_reset`) + Stuck Target Timeout (`ld2450_stale_timeout`) — remove, along with the interval watchdog code

**sen0609-base.yaml — Replaced by API actions or not needed:**
- Apply Static Range Settings button
- Apply Static Sensitivity Settings button
- Static Presence Debug Output switch
- Static Presence Target Output switch
- Factory Reset Static Presence Sensor button

**everything-presence-pro-base.yaml — Not needed:**
- Occupancy Timeout (`occupancy_off_delay`) — remove entity AND `delayed_off` filter from Occupancy
- Network Type select
- CO2 Sensor select
- Bluetooth Proxy select
- Apply Update button

## New API Actions

API actions defined in the ESPHome `api:` section, called by the integration via `aioesphomeapi`. Values persisted by ESPHome's `restore_value: true` on internal entities.

### `epp_set_env_calibration`

Sets environment sensor calibration offsets.

```yaml
- action: epp_set_env_calibration
  variables:
    temperature_offset: float   # °C, default 0
    humidity_offset: float      # %, default 0
    illuminance_offset: float   # lx, default 0
  then:
    - lambda: |-
        id(env_temperature_offset).make_call().set_value(temperature_offset).perform();
        id(env_humidity_offset).make_call().set_value(humidity_offset).perform();
        id(env_illuminance_offset).make_call().set_value(illuminance_offset).perform();
```

### `epp_set_motion_timeout`

Sets PIR motion timeout.

```yaml
- action: epp_set_motion_timeout
  variables:
    timeout: float              # seconds, default 10
  then:
    - lambda: |-
        id(pir_off_delay).make_call().set_value(timeout).perform();
```

### `epp_set_tracking`

Sets LD2450 tracking sensor configuration.

```yaml
- action: epp_set_tracking
  variables:
    max_range: float            # cm, default 600
  then:
    - lambda: |-
        id(ld2450_max_distance).make_call().set_value(max_range).perform();
```

### `epp_set_static_presence`

Sets SEN0609 static presence sensor configuration. Handles the UART command sequence that was previously in the Apply Range/Sensitivity buttons.

```yaml
- action: epp_set_static_presence
  variables:
    min_range: float            # meters, default 0.6
    max_range: float            # meters, default 6
    trigger_range: float        # meters, default 6
    sustain_sensitivity: int    # 0-9, default 7
    trigger_sensitivity: int    # 0-9, default 5
    timeout: float              # seconds, default 15
    on_delay: float             # seconds, default 0
    led_enabled: bool           # default false
  then:
    - lambda: |-
        // Set internal entity values (triggers restore_value persistence)
        id(dfrobot_min_distance).make_call().set_value(min_range).perform();
        id(dfrobot_max_distance).make_call().set_value(max_range).perform();
        id(dfrobot_sustain_sensitivity).make_call().set_value(sustain_sensitivity).perform();
        id(dfrobot_trigger_sensitivity).make_call().set_value(trigger_sensitivity).perform();
    // Stop sensor for config changes
    - switch.turn_off: dfrobot_sensor
    - delay: 1s
    // Apply range
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setRange %.1f %.1f\r\n", min_range, max_range);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    // Apply trigger range
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setTrigRange %.1f\r\n", trigger_range);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    // Apply sensitivity
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setSensitivity %d %d\r\n", sustain_sensitivity, trigger_sensitivity);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    // Apply latency (on_delay + timeout)
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setLatency %.2f %.0f\r\n", on_delay, timeout);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    // Apply LED setting
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          return led_enabled
            ? std::vector<unsigned char>{'s','e','t','L','e','d','M','o','d','e',' ','1',' ','0','\r','\n'}
            : std::vector<unsigned char>{'s','e','t','L','e','d','M','o','d','e',' ','1',' ','1','\r','\n'};
    - delay: 1s
    // Save and restart sensor
    - uart.write:
        id: uart_bus_dfrobot
        data: "saveConfig\r\n"
    - delay: 1s
    - lambda: |-
        id(dfrobot_trigger_distance).make_call().set_value(trigger_range).perform();
        id(dfrobot_off_delay).make_call().set_value(timeout).perform();
        id(dfrobot_on_delay).make_call().set_value(on_delay).perform();
    - switch.turn_on: dfrobot_sensor
```

## LD2450 UART Lambda Simplification

The UART debug lambda in `ld2450-base.yaml` currently:
1. Parses target coordinates from 30-byte frames
2. Applies range filtering via `ld2450_max_distance`
3. Feeds EPP zone engine at full LD2450 rate
4. Throttles entity updates based on configurable intervals
5. Publishes to 21 target entities based on detail level

After cleanup, it only needs steps 1–3. Remove:
- All entity publishing code (~300 lines)
- Throttling globals and logic
- Angle correction code (`ld2450_installation_angle` — reset chip to 0)
- Upside down coordinate flipping (`ld2450_upside_down`)
- Stale target watchdog interval

The lambda shrinks from ~350 lines to ~30 lines:

```cpp
if (bytes.size() != 30) return;

float max_distance = float(id(ld2450_max_distance).state) * 10;
const static int16_t MIN_INT16_VAL = -32768;

auto parse_target = [&](int offset, float &ex, float &ey) -> bool {
  bool detected = *((uint16_t *)(&bytes[offset + 6])) != 0;
  if (!detected) return false;
  int16_t px = *((int16_t *)(&bytes[offset]));
  if (px < 0) px += MIN_INT16_VAL; else px = -px;
  int16_t py = *((int16_t *)(&bytes[offset + 2]));
  if (py < 0) py += MIN_INT16_VAL; else py = -py;
  float dist = sqrt(px * px + py * py);
  if (dist > max_distance) return false;
  ex = px; ey = py;
  return true;
};

float x1=0,y1=0, x2=0,y2=0, x3=0,y3=0;
bool p1 = parse_target(4, x1, y1);
bool p2 = parse_target(12, x2, y2);
bool p3 = parse_target(20, x3, y3);

id(epp_component).feed_targets(x1,y1,p1, x2,y2,p2, x3,y3,p3);
id(ld2450_occupancy).publish_state(p1 || p2 || p3);
```

## Integration Changes

### Remove `async_manage_device_entities`

With firmware handling `disabled_by_default` and the frontend managing entity enable/disable, the integration no longer needs to classify or disable entities on discovery. Remove:
- `_KEEP_ENTITIES`, `_DEFER_ENTITIES`, `_ENTITY_RENAMES` constants
- `_ESPHOME_UID_RE` regex
- `async_manage_device_entities` method
- `_extract_esphome_object_id` function
- The call to `async_manage_device_entities` in `async_discover`

**Keep**: `async_update_zone_entities` — the frontend calls this when zone configuration changes.

### Entity Enable/Disable Websocket Commands

The frontend needs to enable/disable any ESPHome entity on the device (not just zones). Add:

```
eppgrid/set_entity_enabled  {mac, entity_id, enabled}
```

This calls `ent_reg.async_update_entity(entity_id, disabled_by=None)` or `disabled_by=INTEGRATION`.

### New Websocket Commands for Settings

Add websocket commands the frontend settings page calls:

- `eppgrid/set_env_calibration` → stores in `EPPGridStore`, calls `epp_set_env_calibration` API action
- `eppgrid/set_motion_timeout` → stores, calls `epp_set_motion_timeout`
- `eppgrid/set_tracking` → stores, calls `epp_set_tracking`
- `eppgrid/set_static_presence` → stores, calls `epp_set_static_presence`

These follow the same pattern as `set_setup` and `set_room_layout`: save to store, push to device, push on reconnect.

### Update `DeviceConnection.async_push_config`

Extend to push the new config sections alongside perspective/grid/zones:

```python
async def async_push_config(self, config: dict[str, Any]) -> None:
    # ... existing perspective, grid, zones push ...

    # Push env calibration
    env_cal = config.get("env_calibration")
    if env_cal:
        service = self._services.get("epp_set_env_calibration")
        if service:
            await self._client.execute_service(service, env_cal)

    # Push motion timeout
    motion = config.get("motion_timeout")
    if motion:
        service = self._services.get("epp_set_motion_timeout")
        if service:
            await self._client.execute_service(service, motion)

    # Push tracking config
    tracking = config.get("tracking")
    if tracking:
        service = self._services.get("epp_set_tracking")
        if service:
            await self._client.execute_service(service, tracking)

    # Push static presence config
    static_presence = config.get("static_presence")
    if static_presence:
        service = self._services.get("epp_set_static_presence")
        if service:
            await self._client.execute_service(service, static_presence)
```

## Summary of Changes by File

### Firmware Files

| File | Lines Before | Est. Lines After | Change |
|------|-------------|-----------------|--------|
| `everything-presence-pro-base.yaml` | 932 | ~850 | Remove 4 selects, 1 button, 1 number; make 4 entities internal; rename Motion; remove Occupancy `delayed_off`; add 3 API actions |
| `ld2450-base.yaml` | 865 | ~100 | Remove 21 target entities + publishing code + 3 selects + 5 config entities + watchdog; make 1 entity internal; add 1 API action |
| `sen0609-base.yaml` | 387 | ~200 | Remove 5 buttons/switches; make 9 entities internal; add 1 API action |

### Integration Files

| File | Change |
|------|--------|
| `device_manager.py` | Remove `async_manage_device_entities` and related constants; extend `async_push_config` with new settings |
| `websocket_api.py` | Add settings websocket commands + `set_entity_enabled` |

## Out of Scope

- Frontend settings page UI (separate spec)
- CO2 base YAML changes (follows same pattern when addressed)
- Bluetooth base YAML changes
