# Architecture

Everything Presence Pro (EPP) is a Home Assistant custom integration for the
Everything Presence Pro mmWave radar sensor. It provides room-level and
zone-level occupancy detection, target tracking, and environmental sensing
through firmware running on the ESP32 device, a thin HA integration for
device management and config storage, and a Lit-based frontend panel for
calibration, zone editing, and live visualization.

## System Overview

```
┌──────────────────────────────────────────────────────┐
│  EPP Device (ESP32)                                  │
│                                                      │
│  LD2450 mmWave → rolling median → perspective        │
│                  transform → zone engine             │
│  PIR, BH1750, SHTC3, SEN0609                        │
│                                                      │
│  Publishes: ESPHome entities + text sensor streams   │
│  Receives: config via ESPHome API actions            │
└──────────┬───────────────────────────────────────────┘
           │ ESPHome API (TCP, noise PSK)
           ▼
┌──────────────────────────────────────────────────────┐
│  HA Integration (thin relay layer)                   │
│                                                      │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ DeviceManager │  │  Storage  │  │ WebSocket API│  │
│  │ discovery,    │  │ per-device│  │ relay device │  │
│  │ connections,  │  │ config,   │  │ state to     │  │
│  │ config push   │  │ saved cfgs│  │ frontend     │  │
│  └──────────────┘  └───────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
           │ WebSocket subscriptions
           ▼
┌──────────────────────────────────────────────────────┐
│  TypeScript Frontend (Lit panel)                     │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Calibration │  │ Zone Editor  │  │    Live      │ │
│  │   Wizard    │  │ grid paint,  │  │  Overview    │ │
│  │ 4-corner    │  │ zone CRUD,   │  │  targets,    │ │
│  │ capture     │  │ furniture    │  │  sensors     │ │
│  └────────────┘  └──────────────┘  └──────────────┘ │
│                                                      │
│  Local zone engine replica (live preview in editor)  │
└──────────────────────────────────────────────────────┘
```

## Directory Layout

```
everything-presence-pro-grid/
├── custom_components/eppgrid/
│   ├── __init__.py              # Entry point: setup, panel + Lovelace card registration
│   ├── manifest.json            # Integration metadata
│   ├── const.py                 # Constants (domain, grid geometry, FIRMWARE_VERSION)
│   ├── config_flow.py           # HA config UI (singleton confirm step)
│   ├── device_manager/          # Discovery, connections, config push, log relay
│   │   ├── __init__.py            # DeviceManager + ManagedDevice
│   │   ├── _connection.py         # DeviceConnection (per-device aioesphomeapi wrapper)
│   │   └── _helpers.py            # Pure helpers: zone-slot expand, version compare, etc.
│   ├── storage.py               # Per-device config + saved configurations (room layouts)
│   ├── websocket_api/           # Frontend ↔ device relay, commands
│   │   ├── __init__.py            # Registration, validators, error/version helpers
│   │   ├── _devices.py            # Device list/config, sessions, settings, pipeline
│   │   ├── _firmware.py           # OTA, dismiss target
│   │   └── _flasher.py            # Flashable devices, ESPHome device CRUD
│   ├── firmware_proxy.py        # CORS-free proxy for firmware binaries from GitHub Releases
│   ├── diagnostics.py           # HA diagnostics dump (entry + per-device snapshots)
│   ├── zone_name_translations.py # Zone entity name translation via entity_registry
│   ├── strings.json             # HA UI strings (config flow)
│   ├── translations/            # HA-managed locale translations
│   ├── brand/                   # Brand assets (icons)
│   └── frontend/
│       └── eppgrid-panel.js     # Built JS bundle
├── frontend/
│   ├── src/
│   │   ├── eppgrid-panel.ts         # Orchestrator (view routing, controllers, inlined views)
│   │   ├── index.ts                 # Export entry; registers card + dashboard strategy
│   │   ├── strategy.ts              # Lovelace dashboard strategy (auto-generates the view)
│   │   ├── panel-mount-guard.ts     # Re-mount guard for HA frontend rebuilds
│   │   ├── localize.ts              # IntlMessageFormat translation factory
│   │   ├── translations/            # en.json, es.json (nested string keys)
│   │   ├── types.ts                 # Shared type definitions
│   │   ├── constants.ts             # SVG data, catalog, labels, thresholds
│   │   ├── styles.ts                # HA theme tokens, reusable CSS fragments
│   │   ├── controllers/
│   │   │   ├── device-controller.ts      # WS subscriptions, device loading
│   │   │   ├── grid-state-controller.ts  # Grid/zone/furniture mutation, configurations
│   │   │   ├── target-controller.ts      # Target/sensor/zone state, zone engine
│   │   │   └── flasher-controller.ts     # Serial port + USB flash state machine
│   │   ├── components/
│   │   │   ├── epp-device-card.ts        # Lovelace card wrapper around <eppgrid-panel>
│   │   │   ├── epp-wizard.ts             # Calibration wizard (guide, corners, capture)
│   │   │   ├── epp-flasher-view.ts       # USB flash + WiFi provisioning UI
│   │   │   ├── epp-settings-view.ts      # Device settings (accordions, ranges)
│   │   │   ├── epp-grid.ts               # Shared grid renderer (live + editor)
│   │   │   ├── epp-live-sidebar.ts       # Sensor/zone status display
│   │   │   ├── epp-zone-sidebar.ts       # Zone list + type controls
│   │   │   ├── epp-overlay-sidebar.ts    # Entry/interference/suppress paint controls
│   │   │   ├── epp-furniture-sidebar.ts  # Furniture catalog
│   │   │   └── epp-furniture-overlay.ts  # Furniture drag/resize/rotate
│   │   └── lib/
│   │       ├── zone-engine.ts            # Pure-function zone state machine (firmware mirror)
│   │       ├── perspective.ts            # Homography math
│   │       ├── grid.ts                   # Cell encoding (zone bits + 2-bit overlay), bounds
│   │       ├── coordinates.ts            # Target → grid mapping, smoothing
│   │       ├── room-geometry.ts          # FOV cone, range, sensor-position derivation
│   │       ├── zone-defaults.ts          # Zone type defaults, palette, threshold resolver
│   │       ├── settings-defaults.ts      # ENTITY_DEFAULTS + SETTINGS_DEFAULTS (sparse storage)
│   │       ├── cell-painting.ts          # Stroke-based cell paint helpers
│   │       ├── config-serialization.ts   # Saved-configuration encode/decode
│   │       ├── configuration-thumbnail.ts # SVG thumbnail of a saved configuration
│   │       ├── furniture.ts              # Furniture model + sticker definitions
│   │       ├── heatmap.ts                # Per-zone CSS color resolution
│   │       ├── view-hash.ts              # URL fragment ↔ ViewState encoding
│   │       ├── storage.ts                # localStorage helper (selected device MAC)
│   │       ├── usb-flash-service.ts      # esptool.js orchestration + manifest fetch
│   │       └── improv-serial.ts          # Improv Serial protocol
│   ├── rollup.config.js         # Bundles TS → built JS
│   ├── biome.json               # TS linter/formatter config
│   └── vitest.config.ts         # Frontend test config
├── firmware/
│   ├── components/epp/          # Custom ESPHome component
│   ├── lib/epp_zone_engine/     # C++ zone engine library + tests
│   ├── common/                  # Shared ESPHome YAML fragments (LD2450, SEN0609, CO2, BLE, ethernet, base)
│   └── variants/                # 2 firmware variants: wifi-ble-co2, ethernet-ble-co2
├── docs/
│   ├── developers/
│   │   ├── architecture.md      # This file
│   │   ├── code-layout.md       # File-level inventory
│   │   ├── contributing.md
│   │   └── data-catalog.md      # Data field inventory
│   └── user-guide/              # End-user documentation
├── tests/                       # Python tests (pytest)
├── bin/release.sh               # Release-PR helper
├── pyproject.toml               # Python config (ruff)
└── .github/workflows/           # CI: tests, firmware builds, release, pages, codeql
```

## Firmware (ESP32)

All signal processing runs on-device in the C++ zone engine:

1. **LD2450 UART** (~10Hz raw frames) → rolling-window median filter
   (`epp_rolling_window.h`)
2. **Perspective transform** maps sensor coords to room coords
   (`epp_calibration.h`)
3. **Zone engine** processes through the rolling window + per-zone state machine
   (`epp_zone_engine.h`); cells encode zone membership in 3 bits and overlay
   kind (none / entry-point / interference / suppress) in a 2-bit field
4. **Sensor presence** — static (SEN0609 mmWave) and motion (PIR) binary sensors
   are fed into the zone engine with software-managed timeouts
   (active→pending→inactive). Hardware timeouts are set to 1s for debounce; the
   zone engine manages the real timeout. When both sensors are inactive and no
   zones have active targets, pending zones are force-cleared immediately.
5. **Relay output** (`epp_relay.h`) — optional GPIO follows zone state with a
   user-selectable trigger mode (motion / presence / occupancy) and contact mode
   (NO / NC).
6. **Publishing**: raw targets (5Hz), grid targets (5Hz), zone state (1Hz). A
   composite `mmWave Presence` binary sensor combines static presence with
   target tracking (motion-independent), useful for follow-on automations.

Config (perspective coefficients, grid bytes, zone slots, relay mode) is
received via ESPHome API actions, parsed by `epp_zone_config_parser.h`, and
persisted in NVS. The firmware does not own zone-type defaults — the backend
expands non-`custom` types into trigger/renew/timeout values before sending,
so the firmware sees a single, uniform config schema.

Headers (under `firmware/lib/epp_zone_engine/include/`):

| Header | Purpose |
|---|---|
| `epp_types.h` | Grid constants (20×20, 300mm), cell byte layout, `MAX_ZONES=7`, `MAX_TARGETS=3` |
| `epp_grid.h` | Cell-byte accessors (zone bits, overlay bits, room bit) |
| `epp_window.h` | `TargetWindow` / `WindowOutput` value types (shared by windows) |
| `epp_rolling_window.h` | Time-windowed median filter over LD2450 frames |
| `epp_calibration.h` | Perspective transform application |
| `epp_zone_config_parser.h` | JSON `zone_slots` parser (treats `type` as informational) |
| `epp_zone_engine.h` | Per-zone state machine, sensor fusion, handoff |
| `epp_relay.h` | Relay trigger/contact mode evaluation |

See `firmware/lib/epp_zone_engine/` for the implementation and tests.

**Diagnostic sensors** (in `firmware/common/everything-presence-pro-base.yaml`):
`Heap Free`, `Heap Largest Block`, `Heap Min Free`, `Loop Time`, `Uptime`,
and `Reset Reason`. All are `entity_category: diagnostic`. `Heap Min Free`
is the monotonically-decreasing low-water mark (resets only on reboot), so
cross-referencing it with `Uptime` and `Reset Reason` in HA history is the
fastest way to distinguish OOM-driven reboots from network blips.

**OTA scan pause** (in `firmware/common/bluetooth-base.yaml`): the
`ota_http_request` block is extended with `on_begin: stop_scan` and
`on_error: start_scan` hooks so the BLE scan pauses for the duration
of an OTA download. The mbedtls TLS context held during the multi-second
binary fetch is the largest transient heap consumer on this firmware;
combined with `bluetooth_proxy` + active scan it has caused OOM-driven
reboots mid-OTA.

## HA Integration

The Python integration is a thin layer between the device and the frontend.
It does **no** signal processing — that's all firmware.

### Integration Lifecycle (`__init__.py`)

`async_setup_entry` creates the store, starts the device manager, and registers
WebSocket commands. The bundled JS module is exposed at
`/eppgrid_static/eppgrid-panel.js?v={hash}` (MD5 cache-buster) and added as a
global `extra_js_url`, so `<epp-device-card>` and the dashboard strategy are
available everywhere — not just on the sidebar panel page. The sidebar panel
itself is registered conditionally on the `sidebar_panel` config flag.

### Device Manager (`device_manager/`)

Discovers ESPHome devices with `zone_engine_version` entities. Reads the
`Config Protocol` sensor to determine firmware-integration compatibility:
old firmware shows a banner prompting the user to upgrade, and config
commands refuse to push until the firmware reports a compatible version.
Manages on-demand aioesphomeapi connections for frontend sessions (via
`DeviceConnection` in `_connection.py`). Pushes stored config to devices
on save and on reconnect via temporary connections (separate from the
frontend session to avoid consuming API slots or racing with UI
subscriptions). Manages ESPHome zone entity enable/disable/rename.
Fetches build flags from firmware on connect. Subscribes to device log
stream when any log category is set above None, re-emitting messages under
`custom_components.eppgrid.device_manager._connection.device_logs`.

Surfaces firmware-version mismatches via HA's Repairs framework
(`firmware_behind_{mac}` / `firmware_ahead_{mac}` issues) so users see
the mismatch in **Settings → Repairs** without opening the panel. Issues
are raised on initial discovery (`async_discover`), on post-OTA reconnect
(`_on_device_available`), and when the firmware_version sensor transitions
late (`_on_state_changed`); they're cleared on device removal and re-synced
on rename. The integration is now the source of truth for firmware-update
detection — the device-side `update.http_request` auto-poll is disabled
(`update_interval: never` in the variant YAMLs) to eliminate the recurring
~30-50 KB TLS-handshake spike to GitHub Pages.

### Storage (`storage.py`)

Persists per-device config (calibration, room layout, zone slots, sensor
settings) and **saved configurations** (named room layouts the user can
restore — calibration + zones + furniture + settings) via HA's `Store` API.
Settings are stored sparsely: only fields that differ from `SETTINGS_DEFAULTS`
are written, and missing fields are filled from defaults on restore. A legacy
`templates` key is one-time migrated to `configurations` on first load.

### WebSocket API (`websocket_api/`)

Relays device state to the frontend and handles config commands. Two live
subscriptions parse ESPHome text sensor updates into structured events:

- `subscribe_raw_targets` — sensor-space positions for calibration
- `subscribe_grid_targets` — grid positions + zone state + sensor data

Config commands (`set_setup`, `set_room_layout`, `set_settings`,
`save_configuration`, `list_configurations`, `delete_configuration`,
`apply_configuration`, etc.) check config protocol compatibility before
executing, then save to storage and push to the device. An `update_firmware`
command triggers OTA. The integration also exposes a `/api/eppgrid/firmware/`
HTTP view (`firmware_proxy.py`) that proxies to the version-pinned GitHub
Release, dodging GitHub's missing CORS headers for the in-browser flasher.

A `diagnostics.py` module supplies HA's standard diagnostics download
(integration entry + per-device entity snapshots) for support cases.

See [data-catalog.md](data-catalog.md) for the complete
data field inventory.

## TypeScript Frontend

### Build System

Rollup bundles `src/index.ts` → minified ES module at
`custom_components/.../frontend/eppgrid-panel.js`.
TypeScript with strict mode and experimental decorators for Lit.
Biome for linting/formatting.

### Embedding Surfaces

The bundle exposes two ways to mount the same panel:

1. **Sidebar panel** — `panel_custom` registers `<eppgrid-panel>` as a
   full-screen webcomponent on the `/eppgrid` URL.
2. **Lovelace card** — `<epp-device-card>` is a thin Lit wrapper that mounts
   `<eppgrid-panel>` on any dashboard. A built-in dashboard *strategy*
   (`EPPGridStrategy`, registered as `customStrategies.eppgrid`) generates a
   single-card view automatically.

Both reuse the same `eppgrid-panel.js` bundle, registered both as a custom
panel module and as a global `extra_js_url` so the card is available on every
dashboard.

### Panel Architecture

The frontend is a Lit-based component tree rooted in `<eppgrid-panel>`, which
acts as orchestrator and renders the live overview / editor inline. State
flows via reactive controllers; rendering of focused sub-views (wizard,
flasher, settings, sidebars, grid) is delegated to dedicated components.

**Orchestrator (`eppgrid-panel.ts`)** — View routing
(live / editor / settings / wizard / flash), device selector, global dialogs,
navigation guards, controller creation, and the `_renderLiveOverview()` /
`_renderEditor()` templates that compose `<epp-grid>` with the appropriate
sidebars.

**Controllers** (shared state, no DOM):
- `DeviceController` — WS subscriptions, device loading, session lifecycle,
  online/offline tracking
- `GridStateController` — grid/zone/furniture mutation, settings, saved
  configurations (load/save/apply)
- `TargetController` — target/sensor/zone state, frontend zone-engine replica,
  detection-event log
- `FlasherController` — Web Serial port lifecycle, USB flash + WiFi
  provisioning state machine

**View / sub-view components:**
- `<epp-wizard>` — calibration flow (guide, 4-corner capture, perspective solve)
- `<epp-flasher-view>` — USB flash + WiFi provisioning UI
- `<epp-settings-view>` — accordion panels for detection ranges, reporting,
  env offsets, LED/relay control, log levels, entity toggles
- `<epp-grid>` — grid cell rendering, target dots, furniture overlay,
  FOV darkness, beyond-range hatching (used by both live and editor)
- `<epp-live-sidebar>` — presence/zone/environment sensor display
- `<epp-zone-sidebar>` — zone list, type controls, add/remove
- `<epp-overlay-sidebar>` — entry-point / interference / suppress paint controls
- `<epp-furniture-sidebar>` — sticker catalog, custom icons
- `<epp-furniture-overlay>` — drag, resize, rotate furniture items
- `<epp-device-card>` — Lovelace card wrapper around `<eppgrid-panel>`

**State flow:** Controllers own cross-cutting state (device, grid, targets,
flasher). Components receive data as properties and fire `CustomEvent`s for
mutations. The orchestrator wires events to controller methods. On device
load, it sets `DeviceController.onTargetData` and `onRawTargetData` callbacks
that route incoming WS data through `TargetController` to the panel's reactive
state — these must be set before subscriptions start.

**Navigation protection:** Intercepts `beforeunload` and
`history.pushState/replaceState` when unsaved changes exist.

**View persistence:** `lib/view-hash.ts` encodes the active view + sidebar
tab into the URL fragment (`#zones`, `#overlays`, `#furniture`, `#settings`,
`#tutorial`, `#calibrate`), so each browser tab keeps its own view across
reloads and HA frontend rebuilds.

**Mount survival:** `panel-mount-guard.ts` installs MutationObservers that
detect when the HA frontend tears down and rebuilds the panel host (idle
re-renders, dashboard hot-reloads) and re-attaches `<eppgrid-panel>` rather
than starting from scratch.

**Localization:** `localize.ts` returns a `localize(key, params)` function
backed by `IntlMessageFormat`, with `translations/{en,es}.json` as the
string catalogues. Zone *entity* display names are localized server-side
in `zone_name_translations.py` via the entity registry, since the relevant
string keys are constructed dynamically per zone.

### USB Flashing & WiFi Provisioning

The Flash Firmware tab provides USB-based firmware flashing and WiFi
provisioning via the Web Serial API and esptool.js, all running in the
browser.

**Key files:**
- `lib/usb-flash-service.ts` — esptool.js flash orchestration, manifest fetch
- `lib/improv-serial.ts` — Improv Serial protocol (packet building, parsing, buffer management)
- `components/epp-flasher-view.ts` — Flash UI (device list, variant selector, WiFi provisioning)
- `controllers/flasher-controller.ts` — Serial port lifecycle, USB state machine

**Firmware manifests + binaries** are proxied through the HA backend at
`/api/eppgrid/firmware/` (see `firmware_proxy.py`) to avoid CORS issues
with GitHub Releases. The proxy fetches from the per-version release at
`github.com/.../releases/download/v{FIRMWARE_VERSION}/`, so the integration
always installs the firmware version it was tested against — independent
of the "latest" pointer used by the standalone ESP Web Tools page.
`FIRMWARE_VERSION` is pinned in `const.py`.

**USB flash flow:**
1. User selects serial port via Web Serial API
2. esptool.js detects chip, uploads stub, flashes firmware + appends a
   2 KB `0xFF` write at `0x9000` to erase the otadata partition. Without
   this the bootloader keeps booting whichever ota_X partition the previous
   OTA wrote to — even though we just wrote firmware.bin to ota_0.
3. MAC detected from esptool terminal output during `loader.main()`
4. `beforeFlash` callback checks MAC against installed devices — if original
   firmware with ESPHome entry, confirms and deletes the old entry
5. After flash, `transport.disconnect()` releases reader (port stays open
   via CH340 monkey-patch — see Serial Port Lifecycle below)

**WiFi check / auto-skip** (wifi variants only, runs immediately after flash):
1. `queryImprovState` does an Improv handshake and reads `CURRENT_STATE`.
   If the device boots into `PROVISIONED` (already had creds in NVS), it
   delegates to `detectIpAddress` which polls `GET_CURRENT_STATE` every
   2 s for up to 30 s waiting for a non-`0.0.0.0` IP (cold-boot DHCP can
   take 7–20 s).
2. If a real IP arrives → skip WiFi setup, go straight to HA-add.
3. Otherwise (unprovisioned, or no IP within budget) → fall through to the
   WiFi provisioning flow below.
4. Cancel during this phase aborts the polling loop via `AbortSignal` and
   awaits the in-flight promise before closing the port — closing while a
   reader lock is still held leaves the port unusable for retries.

**WiFi provisioning flow** (used when auto-skip falls through):
1. WiFi scan via Improv SCAN command
2. User selects network, enters password
3. Send credentials via Improv WIFI_SETTINGS command
4. Wait for PROVISIONING (0x03) → PROVISIONED (0x04) state transition
   (confirms creds saved to NVS)
5. `detectIpAddress` polls until a non-`0.0.0.0` IP is returned
6. Auto-add device to HA via `eppgrid/add_esphome_device` WebSocket API

**Error / retry routing:** The error state carries the `lastStep` it
transitioned from plus the `variant` for flash-phase errors. The Retry
button re-runs the flash for `connecting`/`flashing`/`wifi_check` failures
and the WiFi-config flow for everything else. Start Over always resets
to the variant picker.

**Serial port lifecycle (CH340 workaround):**
`transport.disconnect()` calls `port.close()` internally. On CH340 USB-serial
chips (VendorID 0x1a86, ProductID 0x55d3), closing and reopening leaves the
port in a zombie state. Fixed by monkey-patching `port.close` to a no-op
before creating Transport, restoring after disconnect. Port stays open for
WiFi provisioning after flash.

**Firmware updates** for Everything Presence Pro Grid devices use a custom
ESPHome API action, `set_update_manifest`, which sets the source URL on the
device's `http_request`-platform `update` entity and then calls `update.perform`
on it. The flow is triggered by the integration via the `eppgrid/update_firmware`
WebSocket command. Raw OTA push is not used — newer ESPHome uses NOISE
encryption which is incompatible with direct protocol implementation.
Original firmware devices can only be converted via USB flash.

### Library Modules

**perspective.ts** — `solvePerspective(src, dst)` solves the 8-coefficient
homography from 4 point pairs via Gaussian elimination.
`applyPerspective(h, x, y)` applies the transform.
`getInversePerspective(h)` inverts via 3×3 matrix inversion.

**grid.ts** — Cell-byte accessors. The lower 3 bits hold zone membership
(0=room background, 1–7=named zones); bits 4–5 hold a 4-state overlay field
(`CELL_OVERLAY_NONE` / `_ENTRY` / `_INTERFERENCE` / `_SUPPRESS`) read with
`cellOverlay`, written with `cellSetOverlay`. Plus `cellIsInside`, `cellZone`,
`cellSetZone`, room-bounds calculation, and grid initialization from room
dimensions. Constants: `GRID_COLS=20`, `GRID_ROWS=20`, `GRID_CELL_MM=300`.

**coordinates.ts** — `mapTargetToGridCell(x, y, roomWidth, roomDepth)`
maps room-space coordinates to fractional grid cell position (room centered
horizontally). `rawToFovPct()` maps raw sensor coords to FOV percentages for
the wizard. `getSmoothedValue()` provides 1-second rolling median for capture
smoothing.

**room-geometry.ts** — `computeSensorFov(perspective)` derives sensor
position and look-direction in room-space from the perspective transform.
`isCellInSensorRange(col, row, fov, roomWidth, maxRangeMm)` distinguishes
cells outside the 120° FOV cone from cells beyond the configured max range —
`<epp-grid>` darkens the former and cross-hatches the latter, and both block
painting. `autoDetectionRange()` computes range from the furthest room cell.

**zone-defaults.ts** — `Zone0Config` (zone 0 settings: type + timing) and
`ZoneConfig` (named zones: `Zone0Config` + name + color) interfaces.
`ZONE_TYPE_DEFAULTS` table for the four built-in zone types
(`default`, `bed`, `seating`, `transit`) — `custom` has no entry and uses
user-supplied trigger/renew/timeout/handoff values exclusively.
`getZoneThresholds()` resolves the effective values for any zone.
`COLOR_PALETTE` holds 7 colorblind-friendly colors.

**settings-defaults.ts** — `ENTITY_DEFAULTS` (per-entity disabled-by-default
map: only the core occupancy/presence/env entities are enabled; everything
else opt-in) and `SETTINGS_DEFAULTS` (full settings shape with default
values). `buildSparseEntities()` / `expandEntities()` and
`isSettingsValueDefault()` drive the sparse-on-save / fill-on-restore
behavior used by saved configurations.

**cell-painting.ts** — Stroke-based zone/overlay paint helpers (line
rasterization, in-bounds filtering) used by the editor.

**config-serialization.ts** — Encode/decode for saved configurations
(calibration + room layout + zones + furniture + sparse settings).

**configuration-thumbnail.ts** — SVG thumbnail of a saved configuration
(zone fills, furniture stickers, FOV-aware bounds) shown in the picker.

**furniture.ts** — `FurnitureItem` model, sticker catalog, coordinate
helpers (room-space ↔ overlay-space).

**heatmap.ts** — Per-zone CSS color resolution used by both the grid
component and the live sidebar.

**view-hash.ts** — URL fragment ↔ `ViewState` (view + sidebar tab) encoding
for per-tab view persistence.

**storage.ts** — `localStorage` helper for cross-tab device-selection memory
(`persistSelectedMac`).

**improv-serial.ts**, **usb-flash-service.ts** — see USB Flashing &
WiFi Provisioning below.

### Local Zone Engine Replica (`lib/zone-engine.ts`)

The frontend contains a pure-function replica of the firmware's zone engine
state machine for live preview in the editor. It implements the same algorithms:

- Target → grid cell mapping
- Continuity check (Chebyshev ≤ 5 cells)
- Entry-point gating
- Trigger/renew threshold comparison
- CLEAR/OCCUPIED/PENDING state machine with timeouts
- Handoff detection with accelerated timeout
- Sensor presence state machine (active→pending→inactive) with force-clear

**Keeping the C++ and TypeScript implementations in sync is critical.**

## Firmware ↔ TypeScript Sync Requirements

The zone engine must behave identically in firmware and frontend:

| Algorithm | C++ (firmware) | TypeScript (frontend) |
|-----------|---------------|----------------------|
| Cell encoding (zone bits + overlay field) | `epp_grid.h`, `epp_types.h` | `lib/grid.ts` |
| Target → cell | `epp_zone_engine.cpp` | `lib/coordinates.ts` |
| Zone state machine | `epp_zone_engine.cpp` | `lib/zone-engine.ts` |
| Sensor state machine | `epp_zone_engine.cpp` | `lib/zone-engine.ts` |
| Perspective transform | `epp_calibration.h` | `lib/perspective.ts` |
| Zone-slot config schema | `epp_zone_config_parser.h` | `lib/config-serialization.ts` |

Zone-type defaults are owned by the **backend** (`custom_components/eppgrid/`)
and `frontend/src/lib/zone-defaults.ts` — the firmware no longer contains a
defaults table. Both must agree, since the backend expands non-`custom` zones
before pushing config and the frontend renders the same expansion live.

## Testing

### C++ (doctest)

Tests in `firmware/lib/epp_zone_engine/tests/`: zone engine, zone-engine
logging, parity (frontend↔firmware fixtures), grid, calibration, rolling
window, zone-config parser, relay.

### TypeScript (vitest)

Tests live in `frontend/src/__tests__/` with happy-dom for DOM simulation.

| Path | Covers |
|------|--------|
| `panel-*.test.ts` | Integration tests for the orchestrator (35+ files: navigation, render, configurations, settings, wizard, flasher, mount-guard, URL hash, reconnect, parity, …) |
| `controllers/*.test.ts` | DeviceController, GridStateController, TargetController, FlasherController |
| `components/*.test.ts` | All shared components |
| `lib/*.test.ts` | Pure-function modules (grid, coordinates, perspective, zone-engine, settings-defaults, view-hash, …) |
| `localize.test.ts`, `translations-coverage.test.ts`, `translations-spanish-coverage.test.ts` | i18n parity |
| `strategy.test.ts` | Lovelace dashboard strategy |

### Python (pytest)

Tests in `tests/`: init lifecycle, config flow, storage, device manager,
websocket API, diagnostics, flasher backend, firmware<->const version
alignment, environmental defaults, mmWave entity wiring, translation
coverage.

### CI (.github/workflows/)

- **tests.yml** — Python tests (multiple HA versions), frontend lint +
  vitest + coverage, C++ ctest
- **firmware.yml** — C++ tests + ESPHome compilation for both variants
  (on push to main touching `firmware/`)
- **firmware-release.yml** — Tag-triggered firmware build + ESP Web Tools
  manifest publish
- **pages.yml** — Stages `fw/` from the GitHub `latest` release for OTA
- **codeql.yml** — CodeQL static analysis
- **hacs.yml** — HACS repository structure validation
- **hassfest.yml** — manifest.json schema validation

### Firmware Release Deployment

Firmware binaries and manifests are hosted on **GitHub Releases** and proxied
through the HA backend at `/api/eppgrid/firmware/` to avoid CORS issues
(GitHub Releases serves with `application/octet-stream` and no CORS headers).
The firmware version is pinned by `FIRMWARE_VERSION` in `const.py`. The
proxy fetches from the version-pinned release URL, so installs from the
panel are always reproducible — independent of which release the GitHub
"latest" pointer happens to refer to.

**Release script (`bin/release.sh`)** — opens a release PR. Pre-flights
semver, on-main, clean-tree, tag-not-exists, and origin-up-to-date. Bumps
`manifest.json` (always) and `FIRMWARE_VERSION` (only when `firmware/`
changed since the previous tag) so the integration version and firmware
version remain independent — they only re-align when the firmware actually
changes.

**firmware-release.yml** — Triggered by tag push (`v*`). First runs
`.github/scripts/validate-release.sh`, which fails the workflow if
`manifest.json` ≠ tag, or if the three firmware-version files (manifest
template, `FIRMWARE_VERSION`, etc.) disagree. If the tag bumps the firmware
version it compiles the variants, generates ESP Web Tools manifests, and
publishes them as release assets. Tags `make_latest=true` only for
firmware-changing non-pre-release tags; pre-releases (`-alpha`, `-beta`,
`-rc`) are never auto-promoted.

**pages.yml** — Triggers on push to main *and* on `release: released`.
Stages `fw/` from the GitHub `latest` release via `gh api /releases/latest`
(simpler than scanning + filtering). Promoting a pre-release to latest in
the GitHub UI re-fires this workflow without needing a fresh tag.
