# Backend Data Catalog

Data flows between firmware, integration, and frontend.

## Architecture

```
ESPHome firmware (ESP32)
  ├── LD2450 UART → rolling median → perspective transform → zone engine
  ├── SEN0609 GPIO → static presence
  ├── SHTC3/BH1750 → temperature, humidity, illuminance
  └── publishes ESPHome entities + text sensor streams

HA Integration (eppgrid)
  ├── discovers ESPHome devices with zone_engine_version
  ├── opens aioesphomeapi connection for frontend sessions
  ├── subscribe_states → fans out to subscription handlers
  ├── stores config in EPPGridStore → pushes to device via API actions
  └── manages ESPHome entity enable/disable/rename

Frontend (eppgrid-panel.ts)
  ├── subscribe_device → opens session connection
  ├── subscribe_grid_targets → structured events (positions, zones, sensors)
  ├── subscribe_raw_targets → raw sensor-space positions
  ├── commands: set_setup, set_room_layout, set_env_calibration, etc.
  └── components/
      ├── epp-live-view.ts — live overview composite (header, grid, sidebar, menu)
      ├── epp-live-sidebar.ts — sensor/zone status sidebar
      ├── epp-zone-sidebar.ts — zone editing sidebar
      ├── epp-furniture-sidebar.ts — furniture editing sidebar
      ├── epp-furniture-overlay.ts — furniture drag/resize overlay
      ├── epp-grid.ts — grid rendering component
      └── epp-settings-view.ts — settings panel
```

## 1. ESPHome Entities

All entities are created by ESPHome firmware with `disabled_by_default` where appropriate. The integration manages enable/disable/rename.

### Enabled by Default

| Entity | Type | Source |
|--------|------|--------|
| Occupancy | binary_sensor | PIR OR static OR tracking (combined) |
| Zone Engine Version | text_sensor | firmware version string |

### Disabled by Default

| Entity | Type | Source |
|--------|------|--------|
| Temperature | sensor | SHTC3 + calibration offset |
| Humidity | sensor | SHTC3 + calibration offset |
| Illuminance | sensor | BH1750 + calibration offset |
| Motion Presence | binary_sensor | PIR sensor |
| Static Presence | binary_sensor | SEN0609 GPIO |
| Tracking Presence | binary_sensor | LD2450 any-target-detected |
| mmWave Presence | binary_sensor | static OR tracking combined |
| Zone 0-7 Occupancy | binary_sensor | zone engine per-zone state |
| Zone Tracking | binary_sensor | zone engine device-level tracking |
| Target 0-2 Position | text_sensor | "x,y,status" post-transform |
| Raw Target 0-2 | text_sensor | "x,y" pre-transform (sensor-space) |
| Zone State | text_sensor | JSON with zone engine tick results |

## 2. Live Streaming

Two websocket subscriptions, both using the same device session connection.

### `subscribe_device` — session lifecycle

Opens the aioesphomeapi connection. Closes on unsubscribe.

**Request:** `{ "type": "eppgrid/subscribe_device", "mac": str }`

### `subscribe_raw_targets` — calibration & FOV overlay

Parses Raw Target text sensor updates into structured events.

**Request:** `{ "type": "eppgrid/subscribe_raw_targets", "mac": str }`

**Event payload:**
```json
{
    "targets": [
        {"raw_x": 1234.0, "raw_y": -567.0},
        {"raw_x": null, "raw_y": null},
        {"raw_x": null, "raw_y": null}
    ]
}
```

### `subscribe_grid_targets` — live overview & zone editor

Parses Target Position, Zone State, and sensor entity updates into structured events.

**Request:** `{ "type": "eppgrid/subscribe_grid_targets", "mac": str }`

**Event payload:**
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
        "target_presence": true,
        "temperature": 22.5,
        "humidity": 45.0,
        "illuminance": 120.0,
        "co2": null
    },
    "zones": {
        "occupancy": {"0": true, "1": false},
        "target_counts": {},
        "frame_count": 10,
        "debug_log": "T0:Z1:A:9|Z1:O:9"
    }
}
```

**Data rates:**
- Target positions: 5Hz (from firmware display_interval)
- Zone state + signal/status: 1Hz (from firmware zone_publish_interval)
- Sensor values: on change

## 3. Commands

### `list_devices`

Returns discovered EPP devices.

**Request:** `{ "type": "eppgrid/list_devices" }`
**Response:** `{ "devices": [{"mac", "name", "host", "available", "configured"}] }`

### `get_config`

Returns stored config for a device.

**Request:** `{ "type": "eppgrid/get_config", "mac": str }`
**Response:** `{ "config": {...} }` — calibration, room_layout, env_calibration, etc.

### `set_setup`

Saves perspective calibration. Clears room layout. Pushes to device.

**Request:** `{ "type": "eppgrid/set_setup", "mac": str, "perspective": float[8], "room_width": float, "room_depth": float }`

### `set_room_layout`

Saves grid, zones, room settings, furniture. Pushes to device. Updates zone entity enable/disable/rename.

**Request:** `{ "type": "eppgrid/set_room_layout", "mac": str, "grid_bytes": int[], "zone_slots": list, "room_type": str, ... }`

### `set_entity_enabled`

Enables/disables an ESPHome entity.

**Request:** `{ "type": "eppgrid/set_entity_enabled", "mac": str, "entity_id": str, "enabled": bool }`

### Settings Commands

All follow the same pattern: save to store, push to device via API action.

| Command | Config Key | API Action |
|---------|-----------|------------|
| `set_env_calibration` | `env_calibration` | `epp_set_env_calibration` |
| `set_motion_timeout` | `motion_timeout` | `epp_set_motion_timeout` |
| `set_tracking` | `tracking` | `epp_set_tracking` |
| `set_static_presence` | `static_presence` | `epp_set_static_presence` |
| `set_pipeline` | `pipeline` | `epp_set_pipeline` |

### Template Commands

| Command | Description |
|---------|------------|
| `list_templates` | List saved room templates |
| `save_template` | Save a room template |
| `delete_template` | Delete a room template |
| `apply_template` | Apply a template to a device |

## 4. Firmware Data Pipeline

```
LD2450 UART (~10Hz)
  → rolling median (1s window, computed every frame)
    → perspective transform (every frame)
      → zone engine (every frame, counts frames per zone)

Publishing (output throttles):
  → raw median      → 5Hz (Raw Target text sensors)
  → grid positions  → 5Hz (Target Position text sensors, includes status)
  → zone state      → 1Hz (Zone State JSON text sensor + binary sensors)
```

### Debug Log Format

Both firmware and frontend zone engine produce the same raw format:

```
T0:Z1:A:9 T1:Z0:P:3|Z0:O:9 Z1:P:3
```

- Before `|`: targets — `T{idx}:Z{zone_id}:{A|P}:{signal}`
- After `|`: zones — `Z{zone_id}:{O|P}:{signal}`

The frontend enricher replaces zone IDs with names for display.

## 5. Configuration Storage

`EPPGridStore` persists per-device config keyed by MAC:

```python
{
    "AA:BB:CC:DD:EE:FF": {
        "calibration": {"perspective": [8 floats], "room_width": float, "room_depth": float},
        "room_layout": {"grid_bytes": [400 ints], "zone_slots": [...], "room_type": str, ...},
        "env_calibration": {"temperature_offset": float, "humidity_offset": float, "illuminance_offset": float},
        "motion_timeout": {"timeout": float},
        "tracking": {"max_range": float},
        "static_presence": {"min_range": float, "max_range": float, ...},
        "pipeline": {"display_interval": int, "zone_publish_interval": int, "window_duration": int},
    }
}
```

All config is pushed to the device on save and on reconnect.
