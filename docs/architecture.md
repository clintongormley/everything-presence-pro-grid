# Architecture

Everything Presence Pro (EPP) is a Home Assistant custom integration for the
Everything Presence Pro mmWave radar sensor. It provides room-level and
zone-level occupancy detection, target tracking, and environmental sensing
through a Python backend connected to the device via ESPHome API, and a
Lit-based frontend panel for calibration, zone editing, and live visualization.

## System Overview

```
┌──────────────────────┐
│  EPP Device (ESP32)  │
│  LD2450 mmWave radar │
│  PIR, BH1750, SHTC3  │
└──────────┬───────────┘
           │ ESPHome API (TCP, noise PSK)
           │ ~10 Hz raw frames
           ▼
┌──────────────────────────────────────────────────┐
│  Python Backend (coordinator.py)                 │
│                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Calibration │  │ Zone Engine  │  │ Entities │ │
│  │ perspective │  │ grid, window │  │ sensors, │ │
│  │ transform   │  │ state machine│  │ binary   │ │
│  └──────┬─────┘  └──────┬───────┘  └────┬─────┘ │
│         │               │               │       │
│         └───────┬───────┘               │       │
│                 ▼                       ▼       │
│         dispatcher signals ──────► HA states    │
│                 │                               │
│                 ▼                               │
│         websocket API ──────────────────────┐   │
└─────────────────────────────────────────────┼───┘
                                              │
           WebSocket subscription             │
                                              ▼
┌──────────────────────────────────────────────────┐
│  TypeScript Frontend (Lit panel)                 │
│                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Calibration │  │ Zone Editor  │  │   Live   │ │
│  │   Wizard    │  │ grid paint,  │  │ Overview │ │
│  │ 4-corner    │  │ zone CRUD,   │  │ targets, │ │
│  │ capture     │  │ furniture    │  │ sensors  │ │
│  └────────────┘  └──────────────┘  └──────────┘ │
│                                                  │
│  Local zone engine replica (live preview)        │
└──────────────────────────────────────────────────┘
```

## Directory Layout

```
everything-presence-pro-grid/
├── custom_components/eppgrid/
│   ├── __init__.py            # Entry point: setup, panel registration
│   ├── manifest.json          # Integration metadata
│   ├── const.py               # Constants, grid geometry, zone defaults
│   ├── coordinator.py         # ESPHome connection, state, processing pipeline
│   ├── calibration.py         # Perspective transform (8-coefficient homography)
│   ├── zone_engine.py         # Grid, TumblingWindow, ZoneEngine, state machine
│   ├── config_flow.py         # HA config UI (host → name)
│   ├── binary_sensor.py       # Occupancy, motion, presence, zone occupancy
│   ├── sensor.py              # Environment, target position/speed, zone counts
│   ├── websocket_api.py       # Frontend ↔ backend commands and subscriptions
│   └── frontend/
│       └── eppgrid-panel.js   # Built JS bundle
├── frontend/
│   ├── src/
│   │   ├── eppgrid-panel.ts       # Orchestrator (view routing, controllers, dialogs)
│   │   ├── types.ts               # Shared type definitions
│   │   ├── constants.ts           # SVG data, catalog, labels, thresholds
│   │   ├── styles.ts              # HA theme tokens, reusable CSS fragments
│   │   ├── index.ts               # Export entry point
│   │   ├── controllers/
│   │   │   ├── device-controller.ts    # WS subscriptions, device loading
│   │   │   ├── grid-state-controller.ts # Grid/zone/furniture mutation, templates
│   │   │   └── target-controller.ts    # Target/sensor/zone state, zone engine
│   │   ├── components/
│   │   │   ├── epp-wizard.ts           # Calibration wizard (guide, corners, capture)
│   │   │   ├── epp-live-view.ts        # Live overview composite
│   │   │   ├── epp-editor-view.ts      # Zone/furniture editor composite
│   │   │   ├── epp-settings-view.ts    # Device settings (accordions, ranges)
│   │   │   ├── epp-grid.ts             # Shared grid renderer
│   │   │   ├── epp-live-sidebar.ts     # Sensor/zone status display
│   │   │   ├── epp-zone-sidebar.ts     # Zone list + type controls
│   │   │   ├── epp-furniture-sidebar.ts # Furniture catalog
│   │   │   └── epp-furniture-overlay.ts # Furniture drag/resize/rotate
│   │   └── lib/
│   │       ├── zone-engine.ts       # Pure-function zone state machine
│   │       ├── perspective.ts       # Homography math
│   │       ├── grid.ts             # Cell encoding, room bounds
│   │       ├── coordinates.ts      # Target → grid mapping
│   │       └── zone-defaults.ts    # Zone types, thresholds, colors
│   ├── rollup.config.js       # Bundles TS → built JS
│   ├── biome.json             # TS linter/formatter config
│   └── vitest.config.ts       # Frontend test config
├── tests/                     # Python tests (pytest)
├── docs/
│   └── backend-data-catalog.md  # Data field inventory per functional area
├── pyproject.toml             # Python config (ruff, pytest)
└── .github/workflows/        # CI: tests, HACS, hassfest
```

## Python Backend

### Integration Lifecycle (`__init__.py`)

`async_setup_entry` creates the coordinator, loads config from
`entry.options`, connects to the device, registers a device in the device
registry, forwards setup to entity platforms (binary_sensor, sensor), and
registers the frontend panel (once per hass instance, with cache-busting
via MD5 hash of the JS bundle).

`async_unload_entry` unloads platforms and disconnects the coordinator.

### Coordinator (`coordinator.py`)

The coordinator is the central hub. It manages the ESPHome connection,
holds all runtime state, runs the processing pipeline, and dispatches
signals to entities and the websocket subscription.

**Connection lifecycle:**
1. `async_connect()` creates an `APIClient` wrapped in `ReconnectLogic`
2. On connect: `subscribe_targets()` lists entities, classifies them by
   name pattern (e.g. `target_1_x`, `mmwave`, `illuminance`), and
   subscribes to state updates
3. `_on_state()` routes each update to `_handle_binary_sensor()` or
   `_handle_sensor()`, which update internal state and trigger rebuilds

**Processing pipeline:**

```
ESPHome state callback
  → _handle_sensor() / _handle_binary_sensor()
    → _schedule_rebuild()
      → _build_calibrated_targets()    # perspective transform + grid gating
        → zone_engine.feed_raw()       # tumbling window + state machine
          → ProcessingResult           # targets: list[TargetResult], zone occupancy, signals
      → dispatch SIGNAL_TARGETS_UPDATED
      → dispatch SIGNAL_SENSORS_UPDATED
```

`_build_calibrated_targets()` applies the perspective transform and then
checks if the calibrated position falls inside a room cell on the grid.
Targets outside the grid are reported as inactive, preventing them from
escaping the grid visually or triggering ghost presence.

Between window ticks, display updates are throttled to 200ms via
`_do_display_update()` for smooth target dot animation.

**Dispatcher signals** (suffixed with `_{entry_id}`):
- `SIGNAL_TARGETS_UPDATED` — target positions, zone occupancy changed
- `SIGNAL_SENSORS_UPDATED` — environment sensor values changed
- `SIGNAL_ZONES_UPDATED` — zone configuration changed

### Calibration (`calibration.py`)

`SensorTransform` holds an 8-coefficient projective homography and room
dimensions. The `apply(x, y)` method maps raw sensor coordinates to
room-space coordinates:

```
rx = (a·sx + b·sy + c) / (g·sx + h·sy + 1)
ry = (d·sx + e·sy + f) / (g·sx + h·sy + 1)
```

The perspective coefficients are computed by the frontend wizard from
4 captured corners and sent to the backend via the `set_setup` websocket
command.

### Zone Engine (`zone_engine.py`)

The zone engine converts calibrated target positions into per-zone
occupancy state. It has three layers: Grid, TumblingWindow, and ZoneEngine.

**Grid** — A 20×20 grid of 300mm cells. Each cell is 1 byte:
- Bit 0: room flag (inside/outside)
- Bits 1-3: zone ID (0 = room boundary, 1-7 = named zones)
- Bits 4-7: reserved

`xy_to_cell(x, y)` maps room coordinates to a cell index (or None if
outside). The grid can be larger than the calibrated room rectangle
because `compute_extent()` projects the full 120° FOV through the
perspective transform.

**TumblingWindow** — Accumulates raw target frames over a 1-second window,
then emits per-target median positions and frame counts (signal strength
0-9).

**ZoneEngine** — Processes each window tick through:

1. **Target evaluation** — Map each target to a grid cell and zone. Check
   continuity (Chebyshev distance ≤ 5 cells from previous position).
   Apply entry-point gating: non-entry zones require 2 consecutive
   qualifying ticks at `min(threshold + 2, 8)` before confirming a
   discontinuous target.

2. **Handoff detection** — When a target moves between zones, the source
   zone transitions to PENDING with an accelerated timeout
   (`pending_since = now - (timeout - handoff_timeout)`).

3. **State machine** — Per-zone, 3-state:
   - CLEAR → OCCUPIED: when a target is confirmed (signal ≥ trigger)
   - OCCUPIED → PENDING: when all confirmed targets leave
   - PENDING → CLEAR: after timeout expires
   - PENDING → OCCUPIED: if a target re-enters before timeout

Output is a `ProcessingResult` with `targets: list[TargetResult]` (each
carrying `status` of `"active"`, `"pending"`, or `"inactive"`), zone
occupancy, and target signal strengths.

### Entity Platforms

**binary_sensor.py** — Room-level: occupancy (combined), motion (PIR),
static presence (mmWave), target presence. Per-target: active state (×3).
Per-zone: occupancy (×8, including rest-of-room). All subscribe to
dispatcher signals and call `async_write_ha_state()` on update.

**sensor.py** — Environment: illuminance, temperature, humidity, CO2
(with additive offsets). Per-target: XY sensor, XY grid, distance, angle,
speed, resolution (×3 each). Per-zone: target count (×8). Most target and
zone entities are disabled by default.

### WebSocket API (`websocket_api.py`)

Commands registered once per hass instance:

| Command | Purpose |
|---------|---------|
| `list_entries` | List configured devices with calibration/layout status |
| `get_config` | Retrieve full config (zones, calibration, grid, layout, reporting, offsets) |
| `set_setup` | Save perspective transform and room dimensions |
| `set_zones` | Update zone configuration |
| `set_room_layout` | Save grid bytes, zone slots, furniture; manages zone entity enable/disable |
| `subscribe_raw_targets` | 5 Hz smoothed sensor-space positions (calibration, FOV overlay) |
| `subscribe_grid_targets` | 5 Hz grid positions + cached 1 Hz zone/sensor state (grid view, zone editor) |
| `rename_zone_entities` | Batch-rename zone entity IDs |
| `set_reporting` | Toggle which entities are enabled; set sensor offsets |

Two live data subscriptions, both driven by the DisplayBuffer rolling median:

**`subscribe_raw_targets`** (5 Hz) — sensor-space positions for calibration and FOV overlay:
```json
{
  "target_count": 1,
  "targets": [{"raw_x": 1234.0, "raw_y": 2100.0}, ...]
}
```

**`subscribe_grid_targets`** (5 Hz positions, 1 Hz cached state) — calibrated grid positions plus zone engine state:
```json
{
  "targets": [{"x": 1500, "y": 2000, "signal": 7, "status": "active"}, ...],
  "sensors": {"occupancy", "static_presence", "motion_presence", "target_presence", "illuminance", "temperature", "humidity", "co2"},
  "zones": {"occupancy": {id: bool}, "target_counts": {id: int}, "frame_count": int, "debug_log": str}
}
```

### Config Entry Structure

```
entry.data:
  host, mac, device_name

entry.options.config:
  calibration:  {perspective, room_width, room_depth}
  grid:         base64-encoded cell bytes
  grid_origin_x, grid_origin_y, grid_cols, grid_rows
  zones:        [{id, name, type, trigger, renew, timeout, ...}]  (legacy)
  room_layout:  {grid_bytes, zone_slots, furniture, room_type, room_trigger, ...}
  reporting:    {room_occupancy: bool, target_xy_grid: bool, ...}
  offsets:      {illuminance, temperature, humidity}
```

## TypeScript Frontend

### Build System

Rollup bundles `src/index.ts` → minified ES module at
`custom_components/.../frontend/eppgrid-panel.js`.
TypeScript with strict mode and experimental decorators for Lit.
Biome for linting/formatting.

### Panel Architecture

The frontend is a Lit-based component tree rooted in `<eppgrid-panel>`,
which serves as an orchestrator. State flows via reactive controllers,
rendering is delegated to focused sub-components.

**Orchestrator (`eppgrid-panel.ts`)** — View routing (live/editor/settings/wizard),
device selector, global dialogs, navigation guards, controller creation.

**Controllers** (shared state, no DOM):
- `DeviceController` — WS subscriptions, device loading, session lifecycle
- `GridStateController` — grid/zone/furniture mutation, template persistence, save
- `TargetController` — target/sensor/zone state, zone engine, debug logs

**Composite views:**
- `<epp-live-view>` — live grid + sidebar + menu dropdown
- `<epp-editor-view>` — editable grid + zone/furniture sidebars + debug log
- `<epp-settings-view>` — accordion panels for detection ranges, reporting, env offsets
- `<epp-wizard>` — calibration flow (guide, 4-corner capture, perspective solve)

**Shared components:**
- `<epp-grid>` — grid cell rendering, target dots, furniture overlay (live + editor)
- `<epp-live-sidebar>` — presence/zone/environment sensor display
- `<epp-zone-sidebar>` — zone list, type controls, add/remove
- `<epp-furniture-sidebar>` — sticker catalog, custom icons
- `<epp-furniture-overlay>` — drag, resize, rotate furniture items

**State flow:** Controllers own cross-cutting state (device, grid, targets).
Components receive data as properties, fire `CustomEvent`s for mutations.
The orchestrator wires events to controller methods.

**Navigation protection:** Intercepts `beforeunload` and
`history.pushState/replaceState` when unsaved changes exist.

### Library Modules

**perspective.ts** — `solvePerspective(src, dst)` solves the 8-coefficient
homography from 4 point pairs via Gaussian elimination.
`applyPerspective(h, x, y)` applies the transform.
`getInversePerspective(h)` inverts via 3×3 matrix inversion.

**grid.ts** — Cell bit operations (`cellIsInside`, `cellZone`,
`cellSetZone`), room bounds calculation, grid initialization from room
dimensions. Constants: `GRID_COLS=20`, `GRID_ROWS=20`, `GRID_CELL_MM=300`.

**coordinates.ts** — `mapTargetToGridCell(x, y, roomWidth, roomDepth)`
maps room-space coordinates to fractional grid cell position (room
centered horizontally). `rawToFovPct()` maps raw sensor coords to FOV
percentages for the wizard. `getSmoothedValue()` provides 1-second rolling
median for capture smoothing.

**zone-defaults.ts** — `ZoneConfig` interface, `ZONE_TYPE_DEFAULTS` with
thresholds per zone type, color palette (7 colorblind-friendly colors),
`getZoneThresholds()` resolver.

### Local Zone Engine Replica (`lib/zone-engine.ts`)

The frontend contains a pure-function replica of the backend's zone engine
state machine for live preview in the editor. It implements the same algorithms:

- Target → grid cell mapping
- Continuity check (Chebyshev ≤ 5 cells)
- Entry-point gating (2 consecutive qualifying ticks at doubled threshold)
- Trigger/renew threshold comparison
- CLEAR/OCCUPIED/PENDING state machine with timeouts
- Handoff detection with accelerated timeout

This allows the zone editor to show live occupancy changes as the user
paints zones, before saving. **Keeping the Python and TypeScript
implementations in sync is critical** — see the sync requirements section.

## Python ↔ TypeScript Sync Requirements

The detection zones functional area requires strict parity between the
Python backend and the TypeScript frontend. Both implement:

| Algorithm | Python | TypeScript |
|-----------|--------|------------|
| Cell encoding | `zone_engine.py` Grid | `grid.ts` |
| Target → cell | `zone_engine.py` `xy_to_cell` | `coordinates.ts` `mapTargetToGridCell` |
| Zone state machine | `zone_engine.py` `_tick` | `lib/zone-engine.ts` `runLocalZoneEngine` |
| Entry-point gating | `zone_engine.py` lines ~460-500 | `lib/zone-engine.ts` |
| Handoff detection | `zone_engine.py` lines ~502-528 | `lib/zone-engine.ts` |
| Zone type defaults | `const.py` | `zone-defaults.ts` |
| Perspective transform | `calibration.py` | `perspective.ts` |

Any change to zone detection logic must be made in both languages
simultaneously.

## Testing

### Python (pytest)

Tests live in `tests/` with fixtures in `conftest.py`. ESPHome API calls
are mocked via `unittest.mock.patch`. Key fixture: `mock_esphome_client`
patches `APIClient` and `ReconnectLogic` to prevent network calls.

| File | Covers |
|------|--------|
| `test_init.py` | Setup, teardown, panel registration, config loading |
| `test_config_flow.py` | User/name steps, connection errors, duplicate detection |
| `test_coordinator.py` | State management, config roundtrip, entity classification, grid gating |
| `test_zone_engine.py` | Grid operations, tumbling window, state machine, thresholds, handoff |
| `test_sensor.py` | Environment sensors, offsets, target properties, zone counts |
| `test_binary_sensor.py` | Occupancy, motion, presence, per-target, per-zone |
| `test_calibration.py` | Transform application, serialization, edge cases |
| `test_websocket_api.py` | All websocket commands |

Config: `pyproject.toml` — ruff for lint/format, pytest-asyncio with
`asyncio_mode = "auto"`.

### TypeScript (vitest)

Tests live in `frontend/src/__tests__/` with happy-dom for DOM simulation.
39 test files, 1169 tests.

| Directory | Covers |
|-----------|--------|
| `panel-*.test.ts` | Integration tests for orchestrator |
| `controllers/*.test.ts` | DeviceController, GridStateController, TargetController |
| `components/*.test.ts` | All 9 extracted components |
| `lib/*.test.ts` | Pure-function modules (grid, coordinates, perspective, zone-engine, etc.) |

### CI (.github/workflows/)

- **tests.yml** — Python tests against 3 HA versions (oldest supported,
  stable, dev) × 2 Python versions + frontend lint and vitest
- **hacs.yml** — HACS repository structure validation
- **hassfest.yml** — manifest.json schema validation

## Future Direction

The Python backend currently performs all processing (calibration, zone
detection, entity state). Over time, much of this will move to custom
firmware on the EPP device itself. The four functional areas (HA entities,
live overview, room calibration, detection zones) will transition from
Python-computed to firmware-provided data. See
[backend-data-catalog.md](backend-data-catalog.md) for the complete
inventory of data fields per functional area.
