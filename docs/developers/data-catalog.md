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
  ├── discovers ESPHome devices with firmware_version
  ├── opens aioesphomeapi connection for frontend sessions
  ├── subscribe_states → fans out to subscription handlers
  ├── stores config in EPPGridStore → pushes to device via API actions
  └── manages ESPHome entity enable/disable/rename

Frontend (eppgrid-panel.ts — orchestrator)
  ├── subscribe_device → opens session connection
  ├── subscribe_grid_targets → structured events (positions, zones, sensors)
  ├── subscribe_raw_targets → raw sensor-space positions
  ├── orchestrator wires DeviceController callbacks → TargetController → panel state
  ├── commands: set_setup, set_room_layout, set_env_calibration, etc.
  ├── controllers/
  │   ├── device-controller.ts — WS subscriptions, device loading
  │   ├── grid-state-controller.ts — grid/zone/furniture mutation, saved configurations
  │   ├── target-controller.ts — target/sensor/zone state, zone engine, debug logs
  │   ├── flasher-controller.ts — serial port + USB flash state machine
  │   └── panel-host.ts — typed PanelHost interface declaring every panel field/method the controllers touch
  ├── components/
  │   ├── epp-wizard.ts — calibration wizard (guide, corners, capture)
  │   ├── epp-settings-view.ts — device settings (accordions, ranges, reporting)
  │   ├── epp-flasher-view.ts — USB/Wi-Fi firmware flasher flow
  │   ├── epp-grid.ts — shared grid renderer (live + editor)
  │   ├── epp-live-sidebar.ts — sensor/zone status display
  │   ├── epp-zone-sidebar.ts — zone list + type controls
  │   ├── epp-overlay-sidebar.ts — Entry/Exit, Interference, Suppress paint modes
  │   ├── epp-furniture-sidebar.ts — furniture catalog + custom icons
  │   └── epp-furniture-overlay.ts — furniture drag/resize/rotate
  └── lib/
      └── zone-engine.ts — pure-function zone occupancy state machine
```

## 1. ESPHome Entities

All entities are created by ESPHome firmware with `disabled_by_default` where appropriate. The integration manages enable/disable/rename.

### Enabled by Default

| Entity | Type | Source |
|--------|------|--------|
| Occupancy | binary_sensor | zone engine processed (active/pending = on, inactive = off) |
| Zone Engine Version | text_sensor | firmware version string |
| Config Protocol | sensor | config protocol version integer (e.g. `1`) |
| Current Connections | sensor | current API client count (diagnostic, accuracy_decimals=0) |
| Heap Free | sensor | current free heap bytes (diagnostic, 60s update via `debug` platform) |
| Heap Largest Block | sensor | largest free contiguous block — TLS handshake limiter (diagnostic) |
| Heap Min Free | sensor | all-time low-water mark via `heap_caps_get_minimum_free_size` (diagnostic) |
| Loop Time | sensor | ESPHome main loop time in ms (diagnostic) |

### Disabled by Default

| Entity | Type | Source |
|--------|------|--------|
| Temperature | sensor | SHTC3 + calibration offset |
| Humidity | sensor | SHTC3 + calibration offset |
| Illuminance | sensor | BH1750 + calibration offset |
| Motion Presence | binary_sensor | zone engine processed (active/pending = on, inactive = off) |
| Static Presence | binary_sensor | zone engine processed (active/pending = on, inactive = off) |
| Target Presence | binary_sensor | zone engine device-level tracking |
| Tracking Presence | binary_sensor | LD2450 any-target-detected |
| mmWave Presence | binary_sensor | static presence OR any zone OCCUPIED — ignores PIR motion, off when only zones are PENDING_CLEAR and static is INACTIVE |
| Zone 0-7 Presence | binary_sensor | zone engine per-zone state |
| Target 1-3 Position | text_sensor | "x,y,status" post-transform |
| Raw Target 1-3 | text_sensor | "x,y" pre-transform (sensor-space) |
| Zone State | text_sensor | JSON with zone engine tick results |
| Target 1-3 X | sensor (mm) | per-target X position post-transform |
| Target 1-3 Y | sensor (mm) | per-target Y position post-transform |
| Target 1-3 Signal | sensor | per-target signal strength |
| Target 1-3 Active | binary_sensor | per-target active flag |
| Target 1-3 Zone | sensor | zone index the target currently occupies |
| Zone 0-7 Target Count | sensor | number of active targets in each zone |
| Target Count | sensor | total number of active targets |

## 2. Live Streaming

Two websocket subscriptions, both using the same device session connection.

### `subscribe_device_list` — fleet view

Broadcasts the live device list to the panel's home view. Initial fetch is delivered immediately on subscribe; subsequent events fire when the device manager adds, removes, renames, or updates availability/firmware status of any managed device.

**Request:** `{ "type": "eppgrid/subscribe_device_list" }`

**Event payload:** the same shape as the `list_devices` response; subscribers replay it through their reducer to keep the device list current.

### `subscribe_flashable_devices` — flasher view

Broadcasts the live flashable-devices list (every ESPHome device matching the Everything Presence Pro hardware signature, regardless of which firmware it currently runs). Initial fetch is delivered on subscribe; subsequent events fire on add / remove / availability change / firmware-version flip after OTA.

**Request:** `{ "type": "eppgrid/subscribe_flashable_devices" }`

**Event payload:** the same shape as the `list_flashable_devices` response.

### `subscribe_device` — session lifecycle

Opens the aioesphomeapi connection. Sessions are refcounted per device: every successful open (`subscribe_device` or `subscribe_ota_progress`, from any client) takes one reference via `DeviceManager.async_open_session`, every unsubscribe releases one via `DeviceManager.release_session`, and the connection only closes when the last reference is released — two panel clients on the same device share one connection and the first unsubscribe doesn't tear down the second client's streams. Force-close paths (device offline transition, device removal, host change, config-entry unload) bypass the count and reset it; stale releases against a force-closed connection are identity-checked no-ops.

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
        "mmwave": true,
        "static_state": "I",
        "motion_state": "P",
        "occupancy_state": true,
        "temperature": 22.5,
        "humidity": 45.0,
        "illuminance": 120.0,
        "co2": null
    },
    "zones": {
        "occupancy": {"0": true, "1": false},
        "target_counts": {},
        "frame_count": 10,
        "debug_log": "S:I M:P Occ:1|T0:Z1:A:9|Z1:O:9"
    }
}
```

**Data rates:**
- Target entity sensors (X, Y, signal, active, zone) + target_count: at entity_target_interval (user-configured Hz), only published when the corresponding entity toggle is enabled
- Zone entity sensors (presence, target_count): at entity_zone_interval (user-configured Hz), only published when the corresponding entity toggle is enabled
- Display stream (raw + grid text sensors): at display_interval (200ms default), only published when at least one frontend session is subscribed
- Zone state JSON: at zone_state_interval (1000ms default), only published when at least one frontend session is subscribed
- System outputs (device tracking, presence binary sensors, relay): fixed 1000ms regardless of frontend subscription

## 3. Commands

### `list_devices`

Returns discovered EPP devices.

**Request:** `{ "type": "eppgrid/list_devices" }`
**Response:**
```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Living Room Sensor",
            "host": "192.168.1.50",
            "available": true,
            "configured": true,
            "area": "Living Room",
            "firmware_status": "compatible",
            "current_connection_count": 1,
            "bluetooth_enabled": false,
            "co2_enabled": true,
            "ethernet_enabled": false,
            "board_revision": "v2",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "epp-pro"
        }
    ]
}
```

`name` is the stored config name when present; otherwise it comes from the HA device-registry entry (`name_by_user` if set, otherwise `name`), and if there is no registry entry it falls back to the discovered/cached device name. Renames in HA or ESPHome are reflected on the next call.

`area` is the assigned HA area name, or `null` if the device is not in an area.

`firmware_status` is `"compatible"`, `"firmware_behind"`, or `"firmware_ahead"` — comparing the device's `Firmware Version` text sensor to the integration's `FIRMWARE_VERSION` using semver.

The build flag fields (`bluetooth_enabled`, `co2_enabled`, `ethernet_enabled`, `board_revision`, `sensor_variant`, `firmware_channel`, `model`) are optional — they are only present after the device has connected and build flags have been fetched via the `get_build_flags` API action. Build flags are merged without overriding the base fields above (`mac`, `name`, `host`, `available`, `configured`, `area`, `firmware_status`, `current_connection_count`) — flag data comes from the device and must not rewrite identity fields.

### `get_config`

Returns stored config for a device.

**Request:** `{ "type": "eppgrid/get_config", "mac": str }`
**Response:** `{ "config": {...} }` — calibration, room_layout, env_calibration, etc.

### `update_firmware`

Triggers OTA firmware update on a device via the `set_update_manifest` API action. Derives the firmware variant (`wifi-ble-co2` or `ethernet-ble-co2`) from build flags and constructs the manifest URL from `FIRMWARE_VERSION` using GitHub Pages (`https://clintongormley.github.io/everything-presence-pro-grid/fw/v{VERSION}/{variant}.json`). Uses a temporary connection (not the persistent session).

**Request:** `{ "type": "eppgrid/update_firmware", "mac": str }`

### `subscribe_ota_progress`

Subscribes to OTA firmware update progress for a device. Takes one refcounted session reference via `async_open_session` (shared with `subscribe_device` — see the session-lifecycle section). Subscribes to ESPHome `UpdateState` entity changes and device log messages to forward progress, success, and error events to the frontend. Uses a shared `done` flag so only one terminal event (success or error) is sent.

N concurrent OTA watchers on the same device share ONE device log subscription and ONE `epp_set_log_level` bump (tracked in the `OtaWatcherState` dataclass on the `DeviceConnection`); the bump is reverted to the stored level — and the log subscription dropped — only when the last watcher unsubscribes, and skipped entirely when that release also closes the session.

When the device session can't be opened (device offline/unknown, or the connection raced to close), the command returns the standard no-session error: code `no_session`, translation key `no_active_session`.

**Request:** `{ "type": "eppgrid/subscribe_ota_progress", "mac": str }`

**Events:**
- `{ "state": "updating", "progress": float|null }` — download progress (0-100 or null for indeterminate)
- `{ "state": "success", "version": str }` — update complete, versions match
- `{ "state": "error", "message": str, "error_key": str }` — update failed (log error, version mismatch, or timeout). `error_key` is a frontend translation key (`flasher.errors.*`) — the frontend renders errors exclusively through it. Log-derived failures use `flasher.errors.ota_device_error`, whose translation interpolates the cleaned device text via the `{message}` placeholder.

The handler also monitors device log messages for `http_request.ota` and `http_request.update` errors, forwarding the actual error message immediately. Unsubscribe releases the session reference; the manager closes the connection when no other subscriber holds one.

### Firmware Version Guard

All config commands (`set_setup`, `set_room_layout`, `set_entity_enabled`, `set_settings`) check `firmware_status` before executing. On mismatch, they return an error with code `"firmware_behind"`, `"firmware_ahead"`, or `"unavailable"`.

In parallel, `device_manager._sync_firmware_repair_issue` raises an HA Repairs framework issue (`firmware_behind_{mac}` or `firmware_ahead_{mac}`) for any discovered device whose version doesn't match `FIRMWARE_VERSION`, and clears it once the versions come back in line. Hooks fire from `async_discover` (initial discovery) and `_on_device_available` (post-OTA reconnect), so users see the mismatch in HA Settings → Repairs without having to open the panel. Translations live under `issues.firmware_behind` / `issues.firmware_ahead` in `strings.json`.

`firmware_behind` issues are `is_fixable=True` and resolve via `repairs.FirmwareUpdateRepairFlow` — Submit in the Repairs UI walks the user through a confirm step and triggers an OTA via `repairs._trigger_ota` (the same `set_update_manifest` API action the panel's Update Firmware button uses). `firmware_ahead` stays unfixable: the resolution is to update the integration via HACS, which the Repairs framework can't drive.

Because the integration is now the source of truth for firmware-update detection, the device-side auto-poll on `update.http_request` is set to `update_interval: never` in the variant YAMLs. The OTA button and the panel's `set_update_manifest` action still drive the same component for explicit checks/installs.

### `set_setup`

Saves perspective calibration. Clears room layout. Pushes to device. Sets `settings.zone_presence` to `true` on calibration (`room_width > 0`) or `false` on delete (`room_width = 0`), then calls `async_update_zone_entities` to enable/disable zone entities accordingly.

**Request:** `{ "type": "eppgrid/set_setup", "mac": str, "perspective": float[8], "room_width": float, "room_depth": float }`

### `set_room_layout`

Saves grid, zones, furniture. Pushes config to device. Updates zone entity enable/disable/rename via `async_update_zone_entities`. Zone presence entities are named `"Zone {name}"` (e.g. `"Zone Armchair"`), target count entities `"Zone {name} Target Count"`. Zone 0 uses `"Zone Rest of Room"` / `"Zone Rest of Room Target Count"`.

**Request:** `{ "type": "eppgrid/set_room_layout", "mac": str, "grid_bytes": int[400], "zone_slots": ZoneSlot[8], "furniture": FurnitureItem[] }`

`grid_bytes` must contain exactly `GRID_COLS * GRID_ROWS` (400) entries — firmware rejects partial grids, so the schema does too. Each `furniture` item is validated against the shape the frontend serializes (`type`/`icon`/`label` bounded strings, **required** finite `x`/`y`/`width`/`height` geometry, optional finite `rotation`, `lockAspect` bool, optional bounded `id`; unknown keys rejected) and the list's serialized JSON is capped at 64 KiB.

`zone_slots` is a fixed-length-8 array. Slot 0 is zone 0 (always present, no name/color); slots 1-7 are named zones or `null` when unused.

```
ZoneSlot[0] = Zone0Config {
    type: "default" | "bed" | "seating" | "transit" | "custom",
    // trigger/renew/timeout/handoff_timeout present ONLY when type === "custom"
    trigger?: int,
    renew?: int,
    timeout?: float,
    handoff_timeout?: float
}

ZoneSlot[1..7] = ZoneConfig | null
ZoneConfig = Zone0Config & {
    name: str,
    color: str  // hex "#rrggbb"
}
```

The timing types are load-bearing, not stylistic: the websocket validator (`_validate_slot_timing`) normalises `trigger`/`renew` to **int** and `timeout`/`handoff_timeout` to **float** before storage. The firmware's ArduinoJson extraction is type-strict — a float-typed `"trigger": 7.0` in the pushed JSON would silently fall back to the default (5) on older parsers — so storage and pushes must keep trigger/renew as JSON integers. The firmware parser (`epp_zone_config_parser.h`) additionally tolerates float-typed timing as defense-in-depth, rounding half-up to match the validator.

Non-custom types (`default` / `bed` / `seating` / `transit`) carry only `type` (plus `name` / `color` on named slots) in storage and on the websocket. Their timing is resolved from `ZONE_TYPE_DEFAULTS` — defined in `frontend/src/lib/zone-defaults.ts` and mirrored in `custom_components/eppgrid/device_manager/_helpers.py`. The backend expands non-custom slots with those defaults just before pushing to firmware. **Firmware is type-agnostic** — it only sees expanded timing fields and never knows the type names. Adding/renaming a type or tweaking defaults therefore requires only a frontend + backend code change; HA restart triggers a re-push that propagates new values to the device. Upgrading the defaults = bump both tables; `test_zone_type_defaults_match_frontend` fails if they drift. Layouts saved before this change — with legacy type values — still load: the backend maps `"rest"`→`bed` timing (600 s timeout) and `"thoroughfare"`→`transit` timing (3 s) via `_LEGACY_ZONE_TYPE_MAP` in `_helpers.py` (the stored `type` string itself is left untouched); `"normal"` and anything else unrecognised falls through to the Default timing row. NOTE: the frontend's display-side normalization in `frontend/src/lib/config-serialization.ts` still shows all legacy types as Default — aligning it with the backend mapping is a tracked frontend task.

Wire-protocol-wise this is a 0.94.0-or-newer contract. Earlier firmware (0.93.x) received zone 0 as top-level `room_type`/`room_trigger`/`room_renew`/`room_timeout`/`room_handoff_timeout` fields; those were removed before public release. Any further wire-format change must keep the existing fields readable or ship a migration — the public-release contract is what users have running.

Each cell in `grid_bytes` is a uint8 with bit layout: bit 0 = room (inside/outside), bits 1-3 = zone (0-7), bits 4-5 = 4-state overlay enum (`0` none, `1` entry/exit, `2` interference, `3` suppress), bits 6-7 unused. Pinned by `CELL_ROOM_BIT` / `CELL_ZONE_MASK` / `CELL_OVERLAY_MASK` in `frontend/src/lib/grid.ts` and the matching constants in `firmware/lib/epp_zone_engine/include/epp_grid.h`.

### `set_entity_enabled`

Enables/disables an ESPHome entity. Scoped to the requested device: the `entity_id` must belong to `mac`'s HA device, otherwise the command returns `entity_not_on_device` (or `entity_not_found` for unknown entity ids).

**Request:** `{ "type": "eppgrid/set_entity_enabled", "mac": str, "entity_id": str, "enabled": bool }`

### `set_settings`

Saves all device settings (offsets, timeouts, distances, thresholds, LED, relay, entities, log levels) in one call. Pushes full config to device. Auto-enables/disables relay switch entity based on `relay_trigger_mode`. When `entities` is provided and modifies `disabled_by`, sets `_entity_update_macs` guard to suppress the redundant reconnect push caused by the ESPHome config entry reload. When `entities.zone_presence` is provided, persists to `settings.zone_presence` and calls `async_update_zone_entities` (if enabling) for layout-aware zone naming.

**Request:** `{ "type": "eppgrid/set_settings", "mac": str, "temperature_offset": float, ..., "led_mode": str, "led_brightness": float, "led_presence_color": str, "static_led_enabled": bool, "relay_trigger_mode": str, "relay_contact_mode": str, "entities": { ... }, "log_levels": { ... } }`

**LED settings:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `led_mode` | string | `"Manual Control"` | One of: Manual Control, Occupancy, Environmental, Environmental + Occupancy |
| `led_brightness` | float | `1.0` | RGB LED brightness multiplier (0.1–1.0) |
| `led_presence_color` | string | `"#CC33FF"` | Hex RGB color for occupancy indication |
| `static_led_enabled` | bool | `true` | Enable/disable SEN0609 indicator LED |

**Relay settings:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `relay_trigger_mode` | string | `"disabled"` | One of: disabled, motion, presence, occupancy |
| `relay_contact_mode` | string | `"no"` | One of: no (Normally Open), nc (Normally Closed) |

**Update rate settings (optional):**

| Key | Type | Valid values | Description |
|-----|------|-------------|-------------|
| `target_update_rate_ms` | int | 200, 500, 1000, 2000 | Target entity sensor publish rate (stored in `settings.target_update_rate_ms`) |
| `zone_update_rate_ms` | int | 200, 500, 1000, 2000 | Zone entity sensor publish rate (stored in `settings.zone_update_rate_ms`) |

**Sensor-assisted clear settings:**

| Key | Type | Default | Valid values | Description |
|-----|------|---------|-------------|-------------|
| `assisted_clear_enabled` | bool | `true` | — | Enables sensor-assisted clear: pending zones are force-cleared once both presence sensors are inactive and no zone is occupied. Pushed to firmware via `epp_set_assisted_clear`. |
| `assisted_clear_timeout` | float (s) | `5` | 0–600 | Grace delay the room must stay empty before pending zones are cleared; `0` = immediate. Pushed to firmware via `epp_set_assisted_clear`. |

Both keys thread through the settings pipeline exactly like `stuck_target_timeout` (member of `_SETTINGS_KEYS`, `vol.Required` in the schema). New installs get the 5 s default; pre-existing installs are migrated to `0` (immediate) by the v2→v3 store migration — see [Configuration Storage](#5-configuration-storage).

**Entity toggle keys (within `entities` dict) — additions:**

| Key | Description |
|-----|-------------|
| `target_active` | Enable/disable Target 1-3 Active binary sensors |
| `target_signal` | Enable/disable Target 1-3 Signal sensors |
| `target_zone` | Enable/disable Target 1-3 Zone sensors |
| `zone_target_count` | Enable/disable Zone 0-7 Target Count sensors |

**Firmware push:** LED mode/brightness/color pushed via `epp_set_led` action (mode, brightness, presence_red/green/blue as 0.0–1.0 floats). SEN0609 LED toggle passed through existing `epp_set_static_presence` action's `led_enabled` parameter. Relay settings pushed via `epp_set_relay` action (trigger_mode, contact_mode).

### `set_distance_override`

Pushes tracking + static presence ranges to firmware via session without persisting. Used by the editor to temporarily widen ranges on entry (so the sensor sees the full area) and revert on cancel.

**Request:** `{ "type": "eppgrid/set_distance_override", "mac": str, "target_max_distance": float, "static_min_distance": float, "static_max_distance": float }`

### Pipeline intervals (firmware push)

Pipeline intervals are derived by `_compute_pipeline` from the device's stored `settings` (entity flags + `target_update_rate_ms` / `zone_update_rate_ms`) and live subscriber counts, then pushed to the firmware via the `epp_set_pipeline` ESPHome service. Backend-internal — not a WS command surface.

| Field | Source |
|-------|--------|
| `entity_target_interval` | `settings.target_update_rate_ms` if any target entity is enabled, else `0` |
| `entity_zone_interval` | `settings.zone_update_rate_ms` if any zone entity is enabled, else `0` |
| `display_interval` | `200` when a frontend raw or grid subscription is open, else `0` |
| `zone_state_interval` | `1000` when a frontend grid subscription is open, else `0` |

The subscriber counts that gate `display_interval` / `zone_state_interval` are held on the `DeviceManager` keyed by MAC (`_target_subs`), incremented/decremented by the `subscribe_raw_targets` / `subscribe_grid_targets` handlers via `note_target_subscribe` / `note_target_unsubscribe`. They deliberately do **not** live on the `DeviceConnection`: a device flap tears the connection down and reopens a fresh one whose own counters would reset to zero, so a pipeline recomputed from those would tell the device "no subscribers" and silence target/zone emission while clients are still subscribed — the v1.1.0 "target disappears in the editor" freeze. Keyed by MAC the counts survive connection replacement, the decrement floors at zero (a stray unsubscribe whose increment landed on a since-replaced connection can't drive it negative), and `async_open_session` re-pushes the pipeline on reopen so emission resumes without a page refresh.

The firmware rolling-median window is fixed at 1000ms (10 frames at the LD2450's nominal 10Hz). Signal is `min(frame_count, 9)` over that window, so it stays bounded on sensor over-delivery and matches the comparison space the frontend uses.

### `dismiss_target`

Marks a single target slot as dismissed at a given grid cell so the firmware's ghost-suppression logic can ignore that target when it next appears in that cell. Used by the panel's "Mark as ghost" UI.

**Request:** `{ "type": "eppgrid/dismiss_target", "mac": str, "target_index": 0..2, "cell_index": -1..GRID_CELL_COUNT-1 }`

`cell_index = -1` means "any cell" (clears the dismiss flag for that target).

Errors: `device_not_found` for an unknown MAC (standard `_require_known_device` check), `no_session` / `no_active_session` when no live session exists (including known-but-offline devices), `dismiss_failed` when the firmware service call fails.

### `set_show_room_calibration_tutorial`

Per-device toggle for the calibration-tutorial overlay shown above the wizard. Persisted alongside the rest of the device's settings.

**Request:** `{ "type": "eppgrid/set_show_room_calibration_tutorial", "mac": str, "enabled": bool }`

### Saved-Configuration Commands

| Command | Description |
|---------|------------|
| `list_configurations` | List saved configurations (grid + zones + sparse settings) |
| `save_configuration` | Save the current configuration under a name |
| `delete_configuration` | Delete a saved configuration |

`save_configuration` caps each blob's serialized JSON at 256 KiB (measured as UTF-8 bytes, matching what HA storage writes) and the store at 50 named configurations — saving a new name beyond that returns `too_many_configurations`; overwriting an existing name is always allowed.

Restoring a configuration is a frontend-side operation: the configuration
dialog applies the saved `grid_bytes`/`zone_slots`/`settings` into panel
state and then calls `set_room_layout` and `set_settings` through the usual
path. There is no server-side `apply_configuration` command.

### Flasher Commands

#### `list_flashable_devices`

Returns all ESPHome devices matching EPP manufacturer/model, regardless of whether they run original or Everything Presence Pro Grid firmware.

**Request:** `{ "type": "eppgrid/list_flashable_devices" }`
**Response:**
```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Presence Pro Kitchen",
            "host": "192.168.1.42",
            "available": false,
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            "update_available": false,
            "esphome_config_entry_id": "abc123"
        }
    ]
}
```

`firmware_type` is `"original"` (no `firmware_version` entity) or `"eppgrid"` (has `firmware_version` entity). `update_available` is `true` when the device runs Everything Presence Pro Grid firmware and a newer version is available. `firmware_version` is the current firmware version string. `firmware_status` is `"compatible"`, `"firmware_behind"`, `"firmware_ahead"`, `"unknown"`, or `"unavailable"`.

#### `delete_esphome_device`

Removes an ESPHome config entry (used to clean up after flashing). Scoped to EPP hardware: the entry must be an ESPHome entry (`only_esphome_can_be_deleted` otherwise) AND own at least one device-registry entry carrying the EPP manufacturer/model signature — otherwise the command returns `not_epp_device`. Entries with no registered devices yet are rejected (fail-closed).

**Request:** `{ "type": "eppgrid/delete_esphome_device", "config_entry_id": str }`

#### `add_esphome_device`

Triggers the ESPHome config flow for a given host (used to add a freshly-flashed device).

**Request:** `{ "type": "eppgrid/add_esphome_device", "host": str }`

### Device-Group Commands

All device-group commands are admin-only (`@websocket_api.require_admin`) and
handled in `websocket_api/_device_groups.py`. Inputs are validated at the
boundary (name 1-128 chars; 1-8 uppercase MACs matching the standard
`AA:BB:...` format; ≤16 zone groups, ≤16 members each). Failures return
`invalid_input`; an unknown `group_id` returns `not_found`; a not-yet-loaded
manager returns `device_groups_unavailable`.

> **Wire-param note:** create/update/delete take **`group_id`**, not `id` — HA
> reserves top-level `id` for the message envelope.

#### `list_device_groups`

**Request:** `{ "type": "eppgrid/list_device_groups" }`
**Response:** `{ "device_groups": [<group>, ...] }`

#### `create_device_group`

**Request:** `{ "type": "eppgrid/create_device_group", "name": str, "sources": [MAC, ...], "area_id"?: str | null }`
**Response:** `{ "device_group": <group> }`

#### `update_device_group`

**Request:** `{ "type": "eppgrid/update_device_group", "group_id": str, "name": str, "sources": [MAC, ...], "area_id": str | null, "zone_groups": [<zone_group>, ...] }`
**Response:** `{ "device_group": <group> }`

#### `delete_device_group`

Also removes the group's HA device-registry entry and its exposed entities.

**Request:** `{ "type": "eppgrid/delete_device_group", "group_id": str }`
**Response:** `{}`

#### `subscribe_device_groups`

Streams the full group list on subscribe and again on any create/update/delete.

**Request:** `{ "type": "eppgrid/subscribe_device_groups" }`
**Event:** `{ "device_groups": [<group>, ...] }`

The serialized `<group>` shape (see `_serialize_group`) augments the stored
definition with resolved, read-time fields — each source carries its display
`name`, `available` flag, `enabled_presence` slots and `zones`
(`{index, name, enabled}`), plus a derived `exposed_entities`:

```json
{
    "id": "…",
    "name": "Master Bedroom",
    "area_id": "bedroom",
    "sources": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Bedroom Left",
            "available": true,
            "enabled_presence": ["occupancy", "static_presence"],
            "zones": [{ "index": 2, "name": "Bed", "enabled": true }]
        }
    ],
    "zone_groups": [
        { "id": "zg_1a2b3c4d", "name": "Bed", "members": [{ "mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2 }] }
    ],
    "exposed_entities": {
        "presence": ["occupancy", "static_presence"],
        "zones": [
            { "kind": "group", "id": "zg_1a2b3c4d", "name": "Zone Bed", "available": true },
            { "kind": "passthrough", "mac": "AA:BB:CC:DD:EE:FF", "zone_index": 3, "name": "Desk", "available": true }
        ]
    }
}
```

`exposed_entities` is computed by `derive_exposed_entities` (mirrored in the
frontend's `lib/device-groups-projection.ts`) and is never persisted — see
section 5 and architecture.md → *Device Groups*.

## 4. Firmware Data Pipeline

```
LD2450 UART (~10Hz)
  → rolling median (fixed 1000ms window, computed every frame)
    → perspective transform (every frame)
      → zone engine (every frame, counts frames per zone)

Publishing (5 independent output timers):
  → entity_target   → user Hz   target_N_{x,y,signal,active,zone} + target_count
                                 (only published when entity enable flag is set)
  → entity_zone     → user Hz   zone_N_{presence,target_count}
                                 (only published when entity enable flag is set)
  → display         → 200ms     raw + grid text sensors
                                 (only published when frontend is subscribed)
  → zone_state      → 1000ms    zone state JSON text sensor
                                 (only published when frontend is subscribed)
  → system          → 1000ms    device tracking + presence outputs + relay
                                 (always published)
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
        "room_layout": {"grid_bytes": [400 ints], "zone_slots": ZoneSlot[8], "furniture": [...]},
        "env_calibration": {"temperature_offset": float, "humidity_offset": float, "illuminance_offset": float},
        "motion_timeout": {"timeout": float},
        "tracking": {"max_range": float},
        "static_presence": {"min_range": float, "max_range": float, ...},
        "relay": {"trigger_mode": str, "contact_mode": str},
    }
}
```

`room_layout.zone_slots` is a fixed-length-8 array using the same `ZoneSlot`
shape as the `set_room_layout` wire payload: slot 0 holds zone 0 (always
present), slots 1-7 hold named zones or `null`. This is the 0.94.0-or-newer
storage format; layouts written by 0.93.x (with top-level `room_*` fields)
are not migrated and must be re-applied once after upgrade.

Saved configurations are stored separately in `EPPGridStore.configurations`
using a matching shape:

```python
{
    "Living Room Setup": {
        "grid_bytes": [400 ints],
        "zone_slots": ZoneSlot[8],   // same shape as room_layout.zone_slots
        "room_width": float,
        "room_depth": float,
        "furniture": [...],
        "settings": dict,            // sparse: only non-default fields
    }
}
```

All config is pushed to the device on save and on reconnect. The push
prefers the existing frontend session connection when one is active
(avoids the ESP32 concurrent connection limit); otherwise it creates a
temporary connection (e.g., on-boot push when no frontend is open).

**Store migrations** are handled by `_MigratingStore._async_migrate_func`
(`STORAGE_VERSION` is currently **3**):

- **v1 → v2** — adds the `device_groups` list (see below).
- **v2 → v3** — stamps `assisted_clear_timeout: 0` into the `settings` of every
  pre-existing device and saved configuration so upgraded installs keep clearing
  pending zones immediately, matching the old hard-coded behaviour. New installs
  (no stored settings to migrate) fall through to the 5 s frontend default.
  `assisted_clear_enabled` needs no stamping — absent means default `true`.

**Device groups** are persisted separately in `EPPGridStore.device_groups`
(added by the v1→v2 store migration) as a list of definitions:

```python
[
    {
        "id": str,                  # UUID hex, server-assigned
        "name": str,                # 1-128 chars
        "area_id": str | None,      # HA area applied to the group's device
        "sources": [str, ...],      # 1-8 member MACs (uppercase)
        "zone_groups": [
            {
                "id": str,
                "name": str,        # 1-128 chars
                "members": [
                    {"mac": str, "zone_index": int},   # zone_index 0-7 (0 = rest of room)
                    ...                                 # 0-16 members
                ],
            },
            ...                     # up to MAX_ZONE_GROUPS_PER_DEVICE_GROUP (16)
        ],
    },
    ...                             # up to MAX_DEVICE_GROUPS (32)
]
```

Only the *definition* is stored. The exposed entity list (`exposed_entities`)
is derived at read time by `device_groups/_projection.py` and is never
persisted. Live presence/zone state is held in the per-group runtime
`Aggregator`, not in the store. See architecture.md → *Device Groups* for the
aggregation and entity-creation flow.

## 6. Diagnostics

The integration implements the HA diagnostics platform (`diagnostics.py`). Users can download a JSON dump from Settings > Devices & Services > Everything Presence Pro Grid.

**Contents:**

| Key | Description |
|-----|-------------|
| `integration_version` | Version from `async_get_loaded_integration(hass, DOMAIN).version` |
| `firmware_version` | `FIRMWARE_VERSION` constant |
| `devices` | Output of `manager.list_devices()` — all managed devices with build flags |
| `stored_configs` | Raw `EPPGridStore.devices` — per-device calibration, room layout, settings |
| `configurations` | Raw `EPPGridStore.configurations` — saved configurations |
| `entity_states` | Per-device dict of `{entity_id: state_value}` for all HA entities (including disabled) |

Redaction: `mac` / `host` fields are redacted via `async_redact_data`; MAC-keyed dicts (`stored_configs`, `entity_states`) are re-keyed to stable `device_N` indices; and entity_ids inside `entity_states` have their device-name prefix replaced by the same `device_N` index — default ESPHome device names embed the MAC's last hex digits, which would otherwise leak through the entity_id keys.
