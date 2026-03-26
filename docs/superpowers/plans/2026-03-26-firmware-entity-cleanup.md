# Firmware Entity Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all configuration entities from ESPHome firmware YAML, replace them with globals + API actions, and clean up the integration's entity management code. After this change, firmware entities are observable state only; all settings flow through API actions that the integration pushes on connect/reconnect.

**Architecture:** Configuration entities (numbers, selects, switches, buttons) in the three firmware base YAMLs are replaced by typed globals. Four new API actions (`epp_set_env_calibration`, `epp_set_motion_timeout`, `epp_set_tracking`, `epp_set_static_presence`) let the integration push settings to the device. The LD2450 UART lambda shrinks from ~350 lines of entity publishing and throttling to ~30 lines that parse targets, feed the zone engine, and publish occupancy. The integration drops its entity disable/rename logic (`async_manage_device_entities`) since firmware now handles `disabled_by_default` directly. New websocket commands and store fields let the frontend manage device settings.

**Tech Stack:** ESPHome YAML, C++ lambdas, Python 3.13, Home Assistant Core, aioesphomeapi

**Spec:** `docs/superpowers/specs/2026-03-26-firmware-entity-cleanup.md`

---

## File Structure

```
firmware/common/
  everything-presence-pro-base.yaml  — remove config entities, add globals + API actions
  ld2450-base.yaml                   — gut to ~80 lines, add global + API action
  sen0609-base.yaml                  — gut to ~60 lines, add global + API action

custom_components/eppgrid/
  device_manager.py    — remove async_manage_device_entities, extend async_push_config
  websocket_api.py     — add settings commands + set_entity_enabled
  storage.py           — no changes (store already supports arbitrary device config keys)
  const.py             — no changes
```

---

### Task 1: Clean Up `ld2450-base.yaml`

This is the largest reduction (~865 lines to ~80). Do it first because it has no dependents outside its own file (entities removed here are not referenced by other YAML files).

**File:** `firmware/common/ld2450-base.yaml`

- [ ] **Step 1: Remove the `esphome:` on_boot block**

Delete the `esphome:` section (lines 1-5) that presses `get_mmwave_firmware` on boot. The firmware version button is being removed.

- [ ] **Step 2: Replace all globals with the single `tracking_max_range` global**

Delete the existing six globals (`mmwave_update_time`, `mmwave_update_interval`, `target1_last_update`, `entities_update_count`, `entities_update_max_count`, `extra_entities`). Replace with:

```yaml
globals:
  - id: tracking_max_range
    type: float
    initial_value: '6000'
```

- [ ] **Step 3: Remove the `interval:` stale target watchdog**

Delete the entire `interval:` section (lines 34-46) that checks for stuck targets.

- [ ] **Step 4: Remove the `text_sensor:` section**

Delete the `Tracking Sensor Firmware` text sensor (lines 48-53).

- [ ] **Step 5: Gut the `button:` section — keep only `Reboot Tracking Sensor`**

Remove:
- `get_mmwave_firmware` (internal button, lines 56-80)
- `factory_reset_ld2450_sensor` (lines 93-109)

Keep `reboot_ld2450_sensor` (lines 81-92) but simplify: it no longer needs `ld2450_configuration` switch. Rewrite to send the reboot command directly via raw UART bytes (enter config mode, send reboot, done).

- [ ] **Step 6: Remove the entire `switch:` section**

Delete all four switches:
- `ld2450_configuration` (internal config mode toggle)
- `ld2450_bluetooth`
- `ld2450_stale_reset` (Auto-Clear Stuck Targets)
- `ld2450_upside_down` (Upside Down Mounting)

- [ ] **Step 7: Simplify the `binary_sensor:` section**

Keep only `Tracking Presence` (`ld2450_occupancy`). Remove its `delayed_off` filter (zone engine handles timeouts). Add `disabled_by_default: true`. Delete the three `Target N Active` binary sensors.

Result:
```yaml
binary_sensor:
  - platform: template
    name: "Tracking Presence"
    device_class: occupancy
    id: ld2450_occupancy
    disabled_by_default: true
```

- [ ] **Step 8: Remove the entire `number:` section**

Delete all four numbers:
- `ld2450_off_delay` (Tracking Presence Timeout)
- `ld2450_max_distance` (Tracking Detection Range)
- `ld2450_installation_angle` (Tracking Sensor Angle)
- `ld2450_stale_timeout` (Stuck Target Timeout)

- [ ] **Step 9: Remove the entire `sensor:` section**

Delete all 18 target sensor entities (Target 1/2/3 X, Y, Speed, Resolution, Angle, Distance).

- [ ] **Step 10: Remove the entire `select:` section**

Delete all three selects:
- `Update speed`
- `Target Update Rate`
- `Target Tracking Detail`

- [ ] **Step 11: Rewrite the UART debug lambda**

Keep the `uart:` bus config and `debug:` block. Replace the ~350-line lambda with the simplified version from the spec:

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

- [ ] **Step 12: Add the `epp_set_tracking` API action**

This action lives in `everything-presence-pro-base.yaml` (Task 3), not here. However, verify the `tracking_max_range` global ID matches what the API action references.

- [ ] **Step 13: Verify the reboot button works without `ld2450_configuration` switch**

The reboot button currently calls `switch.turn_on: ld2450_configuration` then sends reboot bytes. Inline the config-mode enter bytes into the reboot button's `on_press`:

```yaml
button:
  - platform: template
    name: "Reboot Tracking Sensor"
    id: reboot_ld2450_sensor
    disabled_by_default: true
    entity_category: config
    on_press:
      then:
        - uart.write:
            id: uart_bus
            data: [0xFD, 0xFC, 0xFB, 0xFA, 0x04, 0x00, 0xFF, 0x00, 0x01, 0x00, 0x04, 0x03, 0x02, 0x01]
        - delay: 1s
        - uart.write:
            id: uart_bus
            data: [0xFD, 0xFC, 0xFB, 0xFA, 0x02, 0x00, 0xA3, 0x00, 0x04, 0x03, 0x02, 0x01]
```

---

### Task 2: Clean Up `sen0609-base.yaml`

**File:** `firmware/common/sen0609-base.yaml`

- [ ] **Step 1: Replace globals**

Remove `dfrobot_factory_resetting`. Add:

```yaml
globals:
  - id: dfrobot_sensor_running
    type: bool
    initial_value: 'true'
```

- [ ] **Step 2: Keep the `Static Presence` binary sensor, add `disabled_by_default`**

The GPIO binary sensor stays but gets `disabled_by_default: true`:

```yaml
binary_sensor:
  - platform: gpio
    name: Static Presence
    id: dfrobot_presence
    device_class: occupancy
    disabled_by_default: true
    pin:
      number: GPIO34
```

- [ ] **Step 3: Remove the entire `switch:` section**

Delete all three switches:
- `dfrobot_sensor` (Static Presence Sensor Enable)
- `dfrobot_uart_presence` (Static Presence Debug Output)
- `dfrobot_uart_target` (Static Presence Target Output)

- [ ] **Step 4: Remove the entire `number:` section**

Delete all seven numbers:
- `dfrobot_min_distance`, `dfrobot_max_distance` (range)
- `dfrobot_trigger_distance` (trigger range)
- `dfrobot_off_delay` (timeout)
- `dfrobot_on_delay` (on delay)
- `dfrobot_sustain_sensitivity`, `dfrobot_trigger_sensitivity`

- [ ] **Step 5: Remove the entire `button:` section**

Delete all four buttons:
- `set_dfrobot_distance` (Apply Static Range Settings)
- `set_dfrobot_sensitivity` (Apply Static Sensitivity Settings)
- `restart_dfrobot` (internal)
- `factory_reset_dfrobot` (Factory Reset Static Presence Sensor)

- [ ] **Step 6: Remove the `light:` and `output:` sections**

Delete the `Static Presence LED` light and `dfrobot_led_output` template output.

- [ ] **Step 7: Keep the `uart:` bus config unchanged**

The UART bus configuration (`uart_bus_dfrobot`) and its debug block stay exactly as-is. The `epp_set_static_presence` API action (defined in `everything-presence-pro-base.yaml`) sends UART commands through this bus.

---

### Task 3: Clean Up `everything-presence-pro-base.yaml`

**File:** `firmware/common/everything-presence-pro-base.yaml`

- [ ] **Step 1: Add new globals**

Add four globals below the existing `epp:` section (or wherever globals are natural):

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

- [ ] **Step 2: Add new API actions to the `api:` section**

Append four new actions after the existing `epp_set_zones` action:

1. `epp_set_env_calibration` — sets the three env offset globals, forces sensor re-read
2. `epp_set_motion_timeout` — sets the `motion_timeout` global
3. `epp_set_tracking` — sets the `tracking_max_range` global (defined in `ld2450-base.yaml`)
4. `epp_set_static_presence` — sends UART commands to `uart_bus_dfrobot`, calls `saveConfig`, restarts sensor

Use the exact action YAML from the spec.

- [ ] **Step 3: Update sensor filter lambdas to use globals**

Temperature filter: change `id(env_temperature_offset).state` to `id(env_temp_offset)`
Humidity filter: change `id(env_humidity_offset).state` to `id(env_humidity_offset)`
Illuminance filter: change `id(env_illuminance_offset).state` to `id(env_illuminance_offset)`

- [ ] **Step 4: Add `disabled_by_default: true` to environmental sensors**

Add `disabled_by_default: true` to the Temperature, Humidity, and Illuminance sensor entries.

- [ ] **Step 5: Rename `Motion` to `Motion Presence` and update its filter**

Change `name: Motion` to `name: Motion Presence`. Add `disabled_by_default: true`. Replace the `delayed_off` filter:

Before: `delayed_off: !lambda 'return id(pir_off_delay).state * 1000.0;'`
After: `delayed_off: !lambda 'return id(motion_timeout) * 1000.0;'`

- [ ] **Step 6: Remove `delayed_off` filter from Occupancy binary sensor**

Delete the `filters:` block from the Occupancy template sensor entirely. The underlying sources (motion, static, tracking) have their own timeouts.

- [ ] **Step 7: Add `disabled_by_default: true` to mmWave Presence**

The `mmwave_occupancy` template binary sensor gets `disabled_by_default: true`. Also remove its `delayed_off` filter (same reasoning as Occupancy — constituent sensors handle it).

- [ ] **Step 8: Remove configuration number entities**

Delete these number entities:
- `occupancy_off_delay` (Occupancy Timeout)
- `pir_off_delay` (Motion Timeout)
- `env_temperature_offset` (Temperature Calibration)
- `env_humidity_offset` (Humidity Calibration)
- `env_illuminance_offset` (Illuminance Calibration)

Keep `led_brightness_multiplier` (LED Brightness) — it is in the "defer" list.

- [ ] **Step 9: Remove configuration selects**

Delete these select entities:
- `firmware_network` (Network Type)
- `firmware_co2` (CO2 Sensor)
- `firmware_ble` (Bluetooth Proxy)

Keep: `relay_contact_mode`, `system_alarm_mode` (Relay Trigger Mode), `led_mode_select` (LED Mode) — all in the "defer" list.

- [ ] **Step 10: Remove the `Apply Update` button**

Delete the `Apply Update` button entity and its firmware manifest lambda. Keep `Restart Device`.

- [ ] **Step 11: Update `on_client_connected` LED check**

The current lambda references `id(led_mode_select).current_option()` which stays. No change needed here, but verify it still compiles after the select removals.

- [ ] **Step 12: Update relay/alarm lambdas**

The `update_relay_state` script and the `on_state` lambdas in `Motion` and `Occupancy` binary sensors reference `relay_contact_mode` and `system_alarm_mode` — both kept. Verify they compile after changes.

---

### Task 4: Update Integration — Remove `async_manage_device_entities`

**File:** `custom_components/eppgrid/device_manager.py`

- [ ] **Step 1: Remove entity management constants and helpers**

Delete:
- `_ESPHOME_UID_RE` regex (line 25)
- `_KEEP_ENTITIES` frozenset (lines 28-33)
- `_DEFER_ENTITIES` frozenset (lines 36-41)
- `_ENTITY_RENAMES` dict (lines 44-46)
- `_extract_esphome_object_id` function (lines 418-421)

- [ ] **Step 2: Remove `async_manage_device_entities` method**

Delete the entire `async_manage_device_entities` method (lines 325-367) from `DeviceManager`.

- [ ] **Step 3: Remove the call in `async_discover`**

In the `async_discover` method, delete the line:
```python
await self.async_manage_device_entities(mac)
```

- [ ] **Step 4: Remove unused imports**

Remove the `re` import (only used by the deleted regex). Keep `er` import (still used by `async_update_zone_entities`).

---

### Task 5: Extend `async_push_config` for New Settings

**File:** `custom_components/eppgrid/device_manager.py`

- [ ] **Step 1: Add setting push logic to `async_push_config`**

After the existing zones push, add a loop that pushes new config sections if they exist in the stored config:

```python
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
            _LOGGER.info("Pushed %s to %s", key, self._host)
```

The `motion_timeout` config data shape is `{"timeout": float}`. The `tracking` data shape is `{"max_range": float}`. The `env_calibration` data shape is `{"temperature_offset": float, "humidity_offset": float, "illuminance_offset": float}`. The `static_presence` data shape matches the `epp_set_static_presence` action variables.

---

### Task 6: Add New Websocket Commands

**File:** `custom_components/eppgrid/websocket_api.py`

- [ ] **Step 1: Add `eppgrid/set_entity_enabled` command**

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_entity_enabled",
    vol.Required("mac"): str,
    vol.Required("entity_id"): str,
    vol.Required("enabled"): bool,
})
@callback
def websocket_set_entity_enabled(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Enable or disable an ESPHome entity on a managed device."""
    ent_reg = er.async_get(hass)
    if msg["enabled"]:
        ent_reg.async_update_entity(msg["entity_id"], disabled_by=None)
    else:
        ent_reg.async_update_entity(
            msg["entity_id"], disabled_by=er.RegistryEntryDisabler.INTEGRATION
        )
    connection.send_result(msg["id"])
```

Register it in `async_register_websocket_commands`. Add `from homeassistant.helpers import entity_registry as er` import.

- [ ] **Step 2: Add `eppgrid/set_env_calibration` command**

Validates `temperature_offset`, `humidity_offset`, `illuminance_offset` (all `float`). Stores under `device_config["env_calibration"]`. Pushes to device via `_push_config_to_device`.

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_env_calibration",
    vol.Required("mac"): str,
    vol.Required("temperature_offset"): vol.Coerce(float),
    vol.Required("humidity_offset"): vol.Coerce(float),
    vol.Required("illuminance_offset"): vol.Coerce(float),
})
@websocket_api.async_response
async def websocket_set_env_calibration(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["env_calibration"] = {
        "temperature_offset": msg["temperature_offset"],
        "humidity_offset": msg["humidity_offset"],
        "illuminance_offset": msg["illuminance_offset"],
    }
    await manager._store.async_save()
    await manager._push_config_to_device(mac)
    connection.send_result(msg["id"])
```

- [ ] **Step 3: Add `eppgrid/set_motion_timeout` command**

Validates `timeout` (`float`). Stores under `device_config["motion_timeout"]`. Pushes to device.

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_motion_timeout",
    vol.Required("mac"): str,
    vol.Required("timeout"): vol.Coerce(float),
})
```

Store shape: `{"timeout": msg["timeout"]}`.

- [ ] **Step 4: Add `eppgrid/set_tracking` command**

Validates `max_range` (`float`, in mm). Stores under `device_config["tracking"]`. Pushes to device.

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_tracking",
    vol.Required("mac"): str,
    vol.Required("max_range"): vol.Coerce(float),
})
```

Store shape: `{"max_range": msg["max_range"]}`.

- [ ] **Step 5: Add `eppgrid/set_static_presence` command**

Validates all eight SEN0609 parameters. Stores under `device_config["static_presence"]`. Pushes to device.

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_static_presence",
    vol.Required("mac"): str,
    vol.Required("min_range"): vol.Coerce(float),
    vol.Required("max_range"): vol.Coerce(float),
    vol.Required("trigger_range"): vol.Coerce(float),
    vol.Required("sustain_sensitivity"): vol.Coerce(int),
    vol.Required("trigger_sensitivity"): vol.Coerce(int),
    vol.Required("timeout"): vol.Coerce(float),
    vol.Required("on_delay"): vol.Coerce(float),
    vol.Required("led_enabled"): bool,
})
```

- [ ] **Step 6: Register all new commands**

Add all five new command functions to the `async_register_websocket_commands` registration block.

---

### Task 7: Integration Tests

**Files:**
- `tests/test_device_manager.py` (extend)
- `tests/test_websocket_api_v2.py` (extend)

- [ ] **Step 1: Add tests for `async_push_config` with new settings keys**

Test that when device config contains `env_calibration`, `motion_timeout`, `tracking`, or `static_presence` keys, `async_push_config` calls `execute_service` with the correct action name and data.

- [ ] **Step 2: Add tests verifying `async_manage_device_entities` is gone**

Confirm that `DeviceManager` no longer has an `async_manage_device_entities` method.

- [ ] **Step 3: Add tests for `set_entity_enabled` websocket command**

Test enabling and disabling an entity via the new websocket command.

- [ ] **Step 4: Add tests for each settings websocket command**

For each of the four new settings commands, test that:
- The config is stored correctly under the right key
- The device push is triggered
- The result is sent back

---

### Task 8: Verification and Compile Check

- [ ] **Step 1: Verify `ld2450-base.yaml` compiles**

Check that no removed IDs are referenced by other YAML files. Search all YAML files for references to removed IDs: `ld2450_max_distance`, `ld2450_installation_angle`, `ld2450_upside_down`, `ld2450_stale_reset`, `ld2450_stale_timeout`, `ld2450_configuration`, `ld2450_target1_x`, etc.

- [ ] **Step 2: Verify `sen0609-base.yaml` compiles**

Search all YAML files for references to removed IDs: `dfrobot_sensor`, `dfrobot_min_distance`, `dfrobot_max_distance`, `dfrobot_trigger_distance`, `dfrobot_off_delay`, `dfrobot_on_delay`, `dfrobot_sustain_sensitivity`, `dfrobot_trigger_sensitivity`, `dfrobot_factory_resetting`, `dfrobot_led_output`, `set_dfrobot_distance`, `set_dfrobot_sensitivity`, `factory_reset_dfrobot`.

- [ ] **Step 3: Verify `everything-presence-pro-base.yaml` compiles**

Search for references to removed IDs: `occupancy_off_delay`, `pir_off_delay`, `env_temperature_offset`, `env_humidity_offset`, `env_illuminance_offset`, `firmware_network`, `firmware_co2`, `firmware_ble`.

- [ ] **Step 4: Verify integration tests pass**

Run `pytest tests/` to confirm all existing tests still pass with the entity management removal and new websocket commands.

---

## Dependency Order

```
Task 1 (ld2450)  ─┐
Task 2 (sen0609) ─┤── can be done in parallel
Task 3 (base)    ─┘── depends on Task 1 (tracking_max_range global) and Task 2 (uart_bus_dfrobot for API action)
Task 4 (remove entity mgmt) ── independent of firmware tasks
Task 5 (push config) ── depends on Task 4 (same file)
Task 6 (websocket) ── depends on Task 5 (calls _push_config_to_device)
Task 7 (tests) ── depends on Tasks 4-6
Task 8 (verify) ── depends on all above
```
