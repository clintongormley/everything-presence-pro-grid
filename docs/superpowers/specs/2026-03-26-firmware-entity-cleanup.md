# Firmware Entity Cleanup Spec

## Goal

Clean up ESPHome firmware so HA shows only observable state entities. All configuration moves to API actions + globals, following the same pattern as zone config.

## Principles

1. **All entities are ESPHome-owned** — the integration creates zero entities
2. **Entities = observable state** (sensors, binary sensors). No ESPHome number/select/switch entities for configuration.
3. **Settings = API actions + globals** — configuration goes through API actions that set globals, same as zone config. Integration is the source of truth; pushes on connect/reconnect.
4. **`disabled_by_default: true`** for entities that start hidden — the frontend can enable them
5. **No internal entities for config** — globals replace `restore_value` entities. The SEN0609 persists its own config via `saveConfig` UART command. For everything else, the integration pushes config on reconnect (a few seconds of defaults on boot is fine).
6. **Frontend manages entity visibility** — enables/disables/renames entities. Integration does NOT force-disable on discovery.

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
| LED Brightness | base | LED config number |
| LED Mode | base | LED config select |
| Relay Contact Mode | base | Relay config select |
| Relay Output | base | Relay switch |
| Relay Trigger Mode | base | Relay config select |
| Restart Device | base | Button |
| Reboot Tracking Sensor | ld2450 | Button, `disabled_by_default: true` |

### Remove Entirely from Firmware

All configuration entities are removed. Their functionality is replaced by globals + API actions.

**ld2450-base.yaml:**
- Target 1/2/3 X, Y, Speed, Resolution, Angle, Distance (18 sensor entities)
- Target 1/2/3 Active (3 binary sensors)
- All entity update throttling code and globals (`entities_update_count`, `entities_update_max_count`, `extra_entities`, `mmwave_update_time`, `mmwave_update_interval`)
- Update Speed, Target Update Rate, Target Tracking Detail selects
- Tracking Sensor Firmware text sensor
- LD2450 Bluetooth switch
- Factory Reset Tracking Sensor button
- Tracking Presence Timeout number (`ld2450_off_delay`)
- Tracking Detection Range number (`ld2450_max_distance`) → replaced by global
- Tracking Sensor Angle number (`ld2450_installation_angle`) → reset chip to 0 and remove
- Upside Down Mounting switch (`ld2450_upside_down`)
- Auto-Clear Stuck Targets switch + Stuck Target Timeout number + interval watchdog
- Tracking Configuration Mode switch (`ld2450_configuration`) — internal, but no longer needed

**sen0609-base.yaml:**
- Static Presence Sensor Enable switch (`dfrobot_sensor`) → replaced by global (always on, toggled during UART sequences)
- Static Presence Min/Max Range numbers → replaced by globals
- Static Presence Trigger Range number → replaced by global
- Static Presence Timeout number → replaced by global
- Static Presence On Delay number → replaced by global
- Static Presence Sustain/Trigger Sensitivity numbers → replaced by globals
- Static Presence LED light + output → replaced by global
- Apply Static Range Settings button
- Apply Static Sensitivity Settings button
- Static Presence Debug Output switch
- Static Presence Target Output switch
- Factory Reset Static Presence Sensor button
- `dfrobot_factory_resetting` global (no longer needed without factory reset)

**everything-presence-pro-base.yaml:**
- Occupancy Timeout number (`occupancy_off_delay`) → remove AND remove `delayed_off` filter from Occupancy
- Motion Timeout number (`pir_off_delay`) → replaced by global
- Temperature/Humidity/Illuminance Calibration numbers → replaced by globals
- Network Type select
- CO2 Sensor select
- Bluetooth Proxy select
- Apply Update button

## New Globals

Replace all configuration entities with simple typed globals. API actions set them; lambdas read them.

**everything-presence-pro-base.yaml:**
```yaml
globals:
  - id: env_temp_offset
    type: float
    initial_value: '0'
  - id: env_humidity_offset
    type: float
    initial_value: '0'
  - id: env_illuminance_offset
    type: float
    initial_value: '0'
  - id: motion_timeout
    type: float
    initial_value: '10'
```

**ld2450-base.yaml:**
```yaml
globals:
  - id: tracking_max_range
    type: float
    initial_value: '6000'     # mm (was cm in entity, use mm for consistency with LD2450)
```

**sen0609-base.yaml:**
```yaml
globals:
  - id: dfrobot_sensor_running
    type: bool
    initial_value: 'true'
```

Note: SEN0609 settings don't need globals for range/sensitivity/timeout because the sensor persists them via `saveConfig` UART command. The API action sends UART commands directly using its parameters. Only the sensor on/off state needs a global for the UART stop/start sequences.

## New API Actions

API actions defined in the ESPHome `api:` section, called by the integration via `aioesphomeapi`.

### `epp_set_env_calibration`

```yaml
- action: epp_set_env_calibration
  variables:
    temperature_offset: float
    humidity_offset: float
    illuminance_offset: float
  then:
    - lambda: |-
        id(env_temp_offset) = temperature_offset;
        id(env_humidity_offset) = humidity_offset;
        id(env_illuminance_offset) = illuminance_offset;
        // Force sensor re-read to apply new offsets
        id(shtc3_sensor).update();
        id(illuminance_sensor).update();
```

### `epp_set_motion_timeout`

```yaml
- action: epp_set_motion_timeout
  variables:
    timeout: float
  then:
    - lambda: |-
        id(motion_timeout) = timeout;
```

### `epp_set_tracking`

```yaml
- action: epp_set_tracking
  variables:
    max_range: float    # mm
  then:
    - lambda: |-
        id(tracking_max_range) = max_range;
```

### `epp_set_static_presence`

Sends UART commands directly to the SEN0609. The sensor persists its own config.

```yaml
- action: epp_set_static_presence
  variables:
    min_range: float
    max_range: float
    trigger_range: float
    sustain_sensitivity: int
    trigger_sensitivity: int
    timeout: float
    on_delay: float
    led_enabled: bool
  then:
    # Stop sensor for config changes
    - uart.write:
        id: uart_bus_dfrobot
        data: "sensorStop\r\n"
    - delay: 1s
    # Apply range
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setRange %.1f %.1f\r\n", min_range, max_range);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    # Apply trigger range
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setTrigRange %.1f\r\n", trigger_range);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    # Apply sensitivity
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setSensitivity %d %d\r\n", sustain_sensitivity, trigger_sensitivity);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    # Apply latency
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          auto ms = str_sprintf("setLatency %.2f %.0f\r\n", on_delay, timeout);
          return std::vector<unsigned char>(ms.begin(), ms.end());
    - delay: 1s
    # Apply LED setting
    - uart.write:
        id: uart_bus_dfrobot
        data: !lambda |-
          return led_enabled
            ? std::vector<unsigned char>{'s','e','t','L','e','d','M','o','d','e',' ','1',' ','0','\r','\n'}
            : std::vector<unsigned char>{'s','e','t','L','e','d','M','o','d','e',' ','1',' ','1','\r','\n'};
    - delay: 1s
    # Save and restart sensor
    - uart.write:
        id: uart_bus_dfrobot
        data: "saveConfig\r\n"
    - delay: 1s
    - uart.write:
        id: uart_bus_dfrobot
        data: "sensorStart\r\n"
    - delay: 1s
```

## Lambda Updates

### Temperature/Humidity sensor filters

Before:
```yaml
filters:
  - lambda: "return x + id(env_temperature_offset).state;"
```

After:
```yaml
filters:
  - lambda: "return x + id(env_temp_offset);"
```

### Motion binary sensor

Before:
```yaml
filters:
  - delayed_off: !lambda 'return id(pir_off_delay).state * 1000.0;'
```

After:
```yaml
filters:
  - delayed_off: !lambda 'return id(motion_timeout) * 1000.0;'
```

### Occupancy binary sensor

Remove `delayed_off` filter entirely. The lambda remains unchanged.

### Tracking Presence binary sensor

Remove `delayed_off` filter entirely (zone engine handles timeouts).

### LD2450 UART lambda

Shrinks from ~350 lines to ~30 lines. Remove all entity publishing, throttling, angle correction, upside-down flipping, stale target watchdog:

```cpp
if (bytes.size() != 30) return;

float max_distance = id(tracking_max_range);
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

Firmware handles `disabled_by_default`. Remove:
- `_KEEP_ENTITIES`, `_DEFER_ENTITIES`, `_ENTITY_RENAMES` constants
- `_ESPHOME_UID_RE` regex and `_extract_esphome_object_id` function
- `async_manage_device_entities` method and its call in `async_discover`

### Entity Enable/Disable Websocket Command

The frontend needs to enable/disable any ESPHome entity on the device:

```
eppgrid/set_entity_enabled  {mac, entity_id, enabled}
```

Calls `ent_reg.async_update_entity(entity_id, disabled_by=None)` or `disabled_by=INTEGRATION`.

### New Websocket Commands for Settings

- `eppgrid/set_env_calibration` → stores in `EPPGridStore`, pushes `epp_set_env_calibration`
- `eppgrid/set_motion_timeout` → stores, pushes `epp_set_motion_timeout`
- `eppgrid/set_tracking` → stores, pushes `epp_set_tracking`
- `eppgrid/set_static_presence` → stores, pushes `epp_set_static_presence`

Same pattern as `set_setup` and `set_room_layout`: save to store, push to device, push on reconnect.

### Update `DeviceConnection.async_push_config`

Extend to push new config sections alongside perspective/grid/zones:

```python
async def async_push_config(self, config: dict[str, Any]) -> None:
    # ... existing perspective, grid, zones push ...

    for key, action_name in (
        ("env_calibration", "epp_set_env_calibration"),
        ("motion_timeout", "epp_set_motion_timeout"),
        ("tracking", "epp_set_tracking"),
        ("static_presence", "epp_set_static_presence"),
    ):
        data = config.get(key)
        if data:
            service = self._services.get(action_name)
            if service:
                await self._client.execute_service(service, data)
```

## Summary of Changes by File

### Firmware Files

| File | Lines Before | Est. Lines After | Change |
|------|-------------|-----------------|--------|
| `everything-presence-pro-base.yaml` | 932 | ~820 | Remove 8 config entities + 4 selects + 1 button; add 4 globals; rename Motion; remove Occupancy delayed_off; add 3 API actions |
| `ld2450-base.yaml` | 865 | ~80 | Remove ALL config entities + target entities + publishing code; add 1 global; add 1 API action |
| `sen0609-base.yaml` | 387 | ~60 | Remove ALL entities except Static Presence binary sensor; add 1 global; add 1 API action; keep UART bus config |

### Integration Files

| File | Change |
|------|--------|
| `device_manager.py` | Remove `async_manage_device_entities` and related constants; extend `async_push_config` |
| `websocket_api.py` | Add settings commands + `set_entity_enabled` |

## Out of Scope

- Frontend settings page UI (separate spec)
- CO2 base YAML changes (follows same pattern when addressed)
- Bluetooth base YAML changes
