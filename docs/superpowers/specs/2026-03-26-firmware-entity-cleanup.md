# Firmware Entity Cleanup Spec

## Goal

Clean up ESPHome firmware entities so HA shows only what users need. Remove unnecessary entities from firmware, make configuration entities internal (settable via API actions from the frontend settings page), and set appropriate `disabled_by_default` values.

## Principles

1. **All entities are ESPHome-owned** — the integration creates zero entities
2. **Firmware is the source of truth** for which entities exist
3. **`disabled_by_default: true`** in firmware for entities that start hidden
4. **Configuration via API actions** not entity manipulation — same pattern as zone config
5. **Internal entities** retain functionality without cluttering HA

## Entity Audit

### Enabled by Default

| Entity | File | Notes |
|--------|------|-------|
| Occupancy | base | Combined occupancy (PIR + static + tracking) |
| Zone Engine Version | epp component | Diagnostic, used for device discovery |

### Disabled by Default (`disabled_by_default: true`)

| Entity | File | Notes |
|--------|------|-------|
| Humidity | base | Env sensor |
| Illuminance | base | Env sensor |
| Temperature | base | Env sensor |
| mmWave Presence | base | Presence component |
| Static Presence | sen0609 | Already has gpio binary sensor |
| Tracking Presence | ld2450 | LD2450-derived presence |
| Motion Presence | base | **Renamed from "Motion"** |
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

These entities remain functional in firmware (used in lambdas/filters) but invisible in HA. Settable via new API actions from the frontend settings page.

**everything-presence-pro-base.yaml:**
| Entity | ID | Used by |
|--------|-----|---------|
| Occupancy Timeout | `occupancy_off_delay` | Occupancy `delayed_off` filter |
| Motion Timeout | `pir_off_delay` | Motion `delayed_off` filter |
| Temperature Calibration | `env_temperature_offset` | Temperature sensor filter |
| Humidity Calibration | `env_humidity_offset` | Humidity sensor filter |
| Illuminance Calibration | `env_illuminance_offset` | Illuminance sensor filter |

**ld2450-base.yaml:**
| Entity | ID | Used by |
|--------|-----|---------|
| Tracking Presence Timeout | `ld2450_off_delay` | Tracking Presence `delayed_off` |
| Tracking Detection Range | `ld2450_max_distance` | UART parsing range filter |
| Tracking Sensor Angle | `ld2450_installation_angle` | UART parsing angle correction |
| Upside Down Mounting | `ld2450_upside_down` | UART parsing coordinate flip |
| Auto-Clear Stuck Targets | `ld2450_stale_reset` | Stale target watchdog |
| Stuck Target Timeout | `ld2450_stale_timeout` | Stale target watchdog |

**sen0609-base.yaml:**
| Entity | ID | Used by |
|--------|-----|---------|
| Static Presence Sensor Enable | `dfrobot_sensor` | Sensor on/off |
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
- Update Speed, Target Update Rate, Target Tracking Detail selects (controlled entity publish rate — no longer needed)
- Tracking Sensor Firmware text sensor
- LD2450 Bluetooth switch
- Factory Reset Tracking Sensor button

**sen0609-base.yaml — Replaced by API actions:**
- Apply Static Range Settings button
- Apply Static Sensitivity Settings button
- Static Presence Debug Output switch
- Static Presence Target Output switch
- Factory Reset Static Presence Sensor button

**everything-presence-pro-base.yaml — Not needed:**
- Network Type select (diagnostic, not user-facing)
- CO2 Sensor select (diagnostic, not user-facing)
- Bluetooth Proxy select (diagnostic, not user-facing)
- Apply Update button (replaced by Firmware Update entity)

## New API Actions

API actions are defined in the ESPHome `api:` section and called by the integration via `aioesphomeapi`. Values are persisted by ESPHome's `restore_value: true` on the internal entities.

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

### `epp_set_timeouts`

Sets occupancy and motion timeouts.

```yaml
- action: epp_set_timeouts
  variables:
    occupancy_timeout: float    # seconds, default 15
    motion_timeout: float       # seconds, default 10
  then:
    - lambda: |-
        id(occupancy_off_delay).make_call().set_value(occupancy_timeout).perform();
        id(pir_off_delay).make_call().set_value(motion_timeout).perform();
```

### `epp_set_tracking`

Sets LD2450 tracking sensor configuration.

```yaml
- action: epp_set_tracking
  variables:
    max_range: float            # cm, default 600
    angle: float                # degrees, default 0
    upside_down: bool           # default false
    presence_timeout: float     # seconds, default 15
    stale_reset: bool           # default false
    stale_timeout: float        # seconds, default 3
  then:
    - lambda: |-
        id(ld2450_max_distance).make_call().set_value(max_range).perform();
        id(ld2450_installation_angle).make_call().set_value(angle).perform();
        if (upside_down) id(ld2450_upside_down).turn_on(); else id(ld2450_upside_down).turn_off();
        id(ld2450_off_delay).make_call().set_value(presence_timeout).perform();
        if (stale_reset) id(ld2450_stale_reset).turn_on(); else id(ld2450_stale_reset).turn_off();
        id(ld2450_stale_timeout).make_call().set_value(stale_timeout).perform();
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
    sensor_enabled: bool        # default true
  then:
    - lambda: |-
        // Set internal entity values (triggers restore_value persistence)
        id(dfrobot_min_distance).make_call().set_value(min_range).perform();
        id(dfrobot_max_distance).make_call().set_value(max_range).perform();
        id(dfrobot_sustain_sensitivity).make_call().set_value(sustain_sensitivity).perform();
        id(dfrobot_trigger_sensitivity).make_call().set_value(trigger_sensitivity).perform();
    // Apply range to sensor via UART
    - switch.turn_off: dfrobot_sensor
    - delay: 1s
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
    // Save all config
    - uart.write:
        id: uart_bus_dfrobot
        data: "saveConfig\r\n"
    - delay: 1s
    // Set remaining internal values and restart sensor
    - lambda: |-
        id(dfrobot_trigger_distance).make_call().set_value(trigger_range).perform();
        id(dfrobot_off_delay).make_call().set_value(timeout).perform();
        id(dfrobot_on_delay).make_call().set_value(on_delay).perform();
    - switch.turn_on: dfrobot_sensor
```

## LD2450 UART Lambda Simplification

The UART debug lambda in `ld2450-base.yaml` currently:
1. Parses target coordinates
2. Feeds EPP zone engine (at full LD2450 rate)
3. Throttles entity updates based on `mmwave_update_interval` and `entities_update_max_count`
4. Publishes to 21 target entities based on `extra_entities` detail level

After cleanup, it only needs steps 1 and 2. The entity publishing code (~300 lines), throttling globals, and detail level selects are all removed. The lambda shrinks from ~350 lines to ~50 lines.

## Integration Changes

### Simplify `async_manage_device_entities`

With the firmware handling `disabled_by_default` and removing unnecessary entities, the integration's entity management simplifies to:

- **Zone entities**: Existing `async_update_zone_entities` logic (unchanged)
- **Motion rename**: Rename "Motion" → "Motion Presence" on discovery (or handle in firmware by renaming the entity in YAML)
- **No more disable-on-discovery**: Firmware's `disabled_by_default` handles this

**Decision**: Rename "Motion" to "Motion Presence" in the firmware YAML (`name: "Motion Presence"`) rather than in the integration. This eliminates the need for `async_manage_device_entities` entirely except for zone entity management.

### New Websocket Commands for Settings

Add websocket commands that the frontend settings page calls:

- `eppgrid/set_env_calibration` → stores in `EPPGridStore`, calls `epp_set_env_calibration` API action
- `eppgrid/set_timeouts` → stores, calls `epp_set_timeouts`
- `eppgrid/set_tracking` → stores, calls `epp_set_tracking`
- `eppgrid/set_static_presence` → stores, calls `epp_set_static_presence`

These follow the same pattern as `set_setup` and `set_room_layout`: save to store, push to device, push on reconnect.

### Update `DeviceConnection.async_push_config`

Extend to push the new config sections alongside perspective/grid/zones:

```python
async def async_push_config(self, config: dict[str, Any]) -> None:
    # ... existing perspective, grid, zones push ...

    # Push env calibration
    cal_offsets = config.get("env_calibration")
    if cal_offsets:
        service = self._services.get("epp_set_env_calibration")
        if service:
            await self._client.execute_service(service, cal_offsets)

    # Push timeouts
    timeouts = config.get("timeouts")
    if timeouts:
        service = self._services.get("epp_set_timeouts")
        if service:
            await self._client.execute_service(service, timeouts)

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
| `everything-presence-pro-base.yaml` | 932 | ~870 | Remove 3 selects, 1 button; make 5 entities internal; rename Motion; add 2 API actions |
| `ld2450-base.yaml` | 865 | ~150 | Remove 21 target entities + publishing code + 3 selects; make 6 entities internal; add 1 API action |
| `sen0609-base.yaml` | 387 | ~200 | Remove 5 buttons/switches; make 9 entities internal; add 1 API action |

### Integration Files

| File | Change |
|------|--------|
| `device_manager.py` | Remove `_KEEP_ENTITIES`, `_DEFER_ENTITIES`, `_ENTITY_RENAMES`, `_ESPHOME_UID_RE`, `async_manage_device_entities`, `_extract_esphome_object_id`; extend `async_push_config` |
| `websocket_api.py` | Add 4 settings websocket commands |

## Out of Scope

- Frontend settings page UI (separate spec)
- CO2 base YAML changes (follows same pattern when addressed)
- Bluetooth base YAML changes
