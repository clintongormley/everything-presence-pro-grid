# Architecture

Everything Presence Pro (EPP) is a Home Assistant custom integration for the
Everything Presence Pro mmWave radar sensor. It provides room-level and
zone-level occupancy detection, target tracking, and environmental sensing
through firmware running on the ESP32 device, a thin HA integration for device
management and config storage, and a Lit-based frontend panel for calibration,
zone editing, and live visualization.

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
│   │   ├── _flasher.py            # Flashable devices, ESPHome device CRUD
│   │   └── _overview.py           # Non-admin read-only commands for the dashboard card
│   ├── firmware_proxy.py        # Auth-required proxy for firmware binaries from GitHub Releases
│   ├── diagnostics.py           # HA diagnostics dump (entry + per-device snapshots, MAC/host redacted)
│   ├── repairs.py               # Repairs flow: triggers OTA from firmware_behind_<mac>, polls version sensor
│   ├── zone_name_translations.py # Zone entity name translation via entity_registry
│   ├── strings.json             # HA UI strings (config flow)
│   ├── translations/            # HA-managed locale translations
│   ├── brand/                   # Brand assets (icons)
│   └── frontend/
│       ├── eppgrid-panel.js     # Built panel bundle
│       └── eppgrid-card.js      # Built dashboard card bundle
├── frontend/
│   ├── src/
│   │   ├── eppgrid-panel.ts         # Orchestrator (view routing, controllers, inlined views)
│   │   ├── eppgrid-card.ts          # Dashboard card element (<eppgrid-card>), read-only
│   │   ├── eppgrid-card-editor.ts   # Visual config editor for the dashboard card
│   │   ├── index.ts                 # Panel bundle entry — re-exports EPPGridPanel
│   │   ├── card/
│   │   │   ├── index.ts             # Card bundle entry — registers card + editor elements
│   │   │   └── overview-store.ts    # Module-level ref-counted store (one WS sub per device)
│   │   ├── panel-mount-guard.ts     # Re-mount guard for HA frontend rebuilds
│   │   ├── localize.ts              # IntlMessageFormat translation factory + language-availability detection
│   │   ├── translations/            # en.json, es.json (nested string keys)
│   │   ├── types.ts                 # Shared type definitions
│   │   ├── constants.ts             # SVG data, catalog, labels, thresholds
│   │   ├── styles.ts                # HA theme tokens, reusable CSS fragments
│   │   ├── controllers/
│   │   │   ├── device-controller.ts      # WS subscriptions, device loading
│   │   │   ├── grid-state-controller.ts  # Grid/zone/furniture mutation, configurations
│   │   │   ├── target-controller.ts      # Target/sensor/zone state, zone engine
│   │   │   ├── flasher-controller.ts     # Serial port + USB flash state machine
│   │   │   └── panel-host.ts             # Typed `PanelHost` interface declaring every panel field/method the controllers touch (friend-class shape)
│   │   ├── components/
│   │   │   ├── epp-wizard.ts             # Calibration wizard (guide, corners, capture)
│   │   │   ├── epp-flasher-view.ts       # USB flash + WiFi provisioning UI
│   │   │   ├── epp-settings-view.ts      # Device settings (accordions, ranges)
│   │   │   ├── epp-grid.ts               # Shared grid renderer (live + editor)
│   │   │   ├── epp-live-sidebar.ts       # Sensor/zone status display
│   │   │   ├── epp-zone-sidebar.ts       # Zone list + type controls
│   │   │   ├── epp-zone-color-picker.ts  # Zone colour popover (preset swatches + custom fallback)
│   │   │   ├── epp-overlay-sidebar.ts    # Entry/interference/suppress paint controls
│   │   │   ├── epp-furniture-sidebar.ts  # Furniture catalog
│   │   │   ├── epp-furniture-overlay.ts  # Furniture drag/resize/rotate
│   │   │   ├── epp-info-tip.ts           # Shared (?) help tooltip
│   │   │   └── epp-language-banner.ts    # "Request a translation" nudge for unshipped HA languages
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
│   │       ├── furniture-contrast.ts     # Auto furniture tone vs room colour (WCAG contrast)
│   │       ├── view-hash.ts              # URL fragment ↔ ViewState encoding
│   │       ├── help-url.ts               # Panel state → contextual user-guide URL
│   │       ├── tablist-nav.ts            # Roving-tabindex keyboard nav for ARIA tablists
│   │       ├── storage.ts                # localStorage helper (selected device MAC)
│   │       ├── safe-unsub.ts             # HA WS unsubscribe wrapper (swallows stale-subscription errors)
│   │       ├── usb-flash-service.ts      # esptool.js orchestration + manifest fetch
│   │       └── improv-serial.ts          # Improv Serial protocol
│   ├── rollup.config.js         # Bundles TS → built JS
│   ├── biome.json               # TS linter/formatter config
│   └── vitest.config.ts         # Frontend test config
├── firmware/
│   ├── components/epp/          # Custom ESPHome component
│   ├── lib/epp_zone_engine/     # C++ zone engine library + tests
│   ├── lib/epp_component_helpers/ # Header-only host-testable helpers (NVS layout, ring buffer, JSON writer, etc.) + tests
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
├── bin/promote.sh               # Promote a pre-release to latest
├── pyproject.toml               # Python config (ruff)
└── .github/workflows/           # CI: tests, firmware builds, release, pages, codeql
```

## Firmware (ESP32)

All signal processing runs on-device in the C++ zone engine:

1. **LD2450 UART** (~10Hz raw frames) → rolling-window median filter
    (`epp_rolling_window.h`)
1. **Perspective transform** maps sensor coords to room coords
    (`epp_calibration.h`)
1. **Zone engine** processes through the rolling window + per-zone state machine
    (`epp_zone_engine.h`); cells encode zone membership in 3 bits and overlay
    kind (none / entry-point / interference / suppress) in a 2-bit field
1. **Sensor presence** — static (SEN0609 mmWave) and motion (PIR) binary sensors
    are fed into the zone engine with software-managed timeouts
    (active→pending→inactive). Hardware timeouts are set to 1s for debounce;
    the zone engine manages the real timeout. When both sensors are inactive
    and no zones have active targets, the sensor-assisted clear force-clears
    pending zones after a configurable grace delay (`assisted_clear_timeout`,
    default 5 s; 0 = immediate). The feature is on by default and can be
    disabled via `assisted_clear_enabled`.
1. **Relay output** (`epp_relay.h`) — optional GPIO follows zone state with a
    user-selectable trigger mode (motion / presence / occupancy) and contact
    mode (NO / NC).
1. **Publishing**: raw targets (5Hz), grid targets (5Hz), zone state (1Hz). A
    composite `mmWave Presence` binary sensor combines static presence with
    target tracking (motion-independent), useful for follow-on automations.

Config (perspective coefficients, grid bytes, zone slots, relay mode) is
received via ESPHome API actions, parsed by `epp_zone_config_parser.h`, and
persisted in NVS. The firmware does not own zone-type defaults — the backend
expands non-`custom` types into trigger/renew/timeout values before sending, so
the firmware sees a single, uniform config schema.

Headers (under `firmware/lib/epp_zone_engine/include/`):

| Header                     | Purpose                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| `epp_types.h`              | Grid constants (20×20, 300mm), cell byte layout, `MAX_ZONES=7`, `MAX_TARGETS=3` |
| `epp_grid.h`               | Cell-byte accessors (zone bits, overlay bits, room bit)                         |
| `epp_window.h`             | `TargetWindow` / `WindowOutput` value types (shared by windows)                 |
| `epp_rolling_window.h`     | Time-windowed median filter over LD2450 frames                                  |
| `epp_calibration.h`        | Perspective transform application                                               |
| `epp_zone_config_parser.h` | JSON `zone_slots` parser (treats `type` as informational)                       |
| `epp_zone_engine.h`        | Per-zone state machine, sensor fusion, handoff                                  |
| `epp_relay.h`              | Relay trigger/contact mode evaluation                                           |

See `firmware/lib/epp_zone_engine/` for the implementation and tests.

**Diagnostic sensors** (in `firmware/common/everything-presence-pro-base.yaml`):
`Heap Free`, `Heap Largest Block`, `Heap Min Free`, `Loop Time`, `Uptime`, and
`Reset Reason`. All are `entity_category: diagnostic`. `Heap Min Free` is the
monotonically-decreasing low-water mark (resets only on reboot), so
cross-referencing it with `Uptime` and `Reset Reason` in HA history is the
fastest way to distinguish OOM-driven reboots from network blips.

**BLE Scan switch** (in `firmware/common/bluetooth-base.yaml`): runtime toggle
for the `esp32_ble_tracker` scan, exposed as a config-category switch. Disabling
reboots the device so any in-flight `bluetooth_proxy` GATT-client connections
drop cleanly; an `esphome.on_boot` reconciliation re-applies the persisted OFF
state immediately on restart (template switches restore state but don't replay
actions). PR #149's OTA `on_error` hook checks the toggle before restarting
scan, so a failed OTA can't silently override the user's preference. The BLE
controller stack (~10-15 KB) stays loaded regardless.

**Pre-OTA reboot** (`DeviceManager.async_reboot_and_wait`): because that
resident BLE stack plus heap fragmentation can leave a no-PSRAM ESP32 with too
little contiguous heap for the OTA's mbedTLS handshake — the download then dies
mid-flight with `ESP_ERR_HTTP_CONNECT` (field-confirmed at a ~775 B
`Heap Min Free`) — `async_trigger_ota` always reboots the device first. It
presses the ESPHome **Restart Device** button (present on in-field firmware, so
it works on the build being updated *from*) and waits for the `firmware_version`
sensor to cycle offline → online before pushing `set_update_manifest`, so the
device flashes from a fresh, unfragmented heap. The reboot is **best-effort**:
if no restart button is found or the device doesn't return, the OTA is still
attempted. Success/failure is still judged by the Repairs flow polling
`firmware_version` for the new pinned version (the pre-flight reboot's
old-version reconnect doesn't count as success).

## HA Integration

The Python integration is a thin layer between the device and the frontend. It
does **no** signal processing — that's all firmware.

### Integration Lifecycle (`__init__.py`)

`async_setup_entry` creates the store, starts the device manager, and registers
WebSocket commands. The bundled JS module is served at
`/eppgrid_static/eppgrid-panel.js?v={hash}` (MD5 cache-buster) and registered as
the panel's webcomponent module via `panel_custom.async_register_panel`. The
sidebar panel is registered conditionally on the `sidebar_panel` config flag and
is admin-only (`require_admin=True`); HA hides it from non-admin users and
rejects direct URL access.

### Device Manager (`device_manager/`)

Discovers ESPHome devices with `zone_engine_version` entities. Reads the
`Config Protocol` sensor to determine firmware-integration compatibility: old
firmware shows a banner prompting the user to upgrade, and config commands
refuse to push until the firmware reports a compatible version. Manages
on-demand aioesphomeapi connections for frontend sessions (via
`DeviceConnection` in `_connection.py`). Pushes stored config to devices on save
and on reconnect via temporary connections (separate from the frontend session
to avoid consuming API slots or racing with UI subscriptions). Manages ESPHome
zone entity enable/disable/rename. Fetches build flags from firmware on connect.
Subscribes to device log stream when any log category is set above None,
re-emitting messages under
`custom_components.eppgrid.device_manager._connection.device_logs`.

Surfaces firmware-version mismatches via HA's Repairs framework
(`firmware_behind_{mac}` / `firmware_ahead_{mac}` issues) so users see the
mismatch in **Settings → Repairs** without opening the panel. Issues are raised
on initial discovery (`async_discover`), on post-OTA reconnect
(`_on_device_available`), and when the firmware_version sensor transitions late
(`_on_state_changed`); they're cleared on device removal and re-synced on
rename. The integration is now the source of truth for firmware-update detection
— the device-side `update.http_request` auto-poll is disabled
(`update_interval: never` in the variant YAMLs) to eliminate the recurring
~30-50 KB TLS-handshake spike to GitHub Pages.

### Storage (`storage.py`)

Persists per-device config (calibration, room layout, zone slots, sensor
settings) and **saved configurations** (named room layouts the user can restore
— calibration + zones + furniture + settings) via HA's `Store` API. Settings are
stored sparsely: only fields that differ from `SETTINGS_DEFAULTS` are written,
and missing fields are filled from defaults on restore.

### WebSocket API (`websocket_api/`)

Relays device state to the frontend and handles config commands. Two live
subscriptions parse ESPHome text sensor updates into structured events:

- `subscribe_raw_targets` — sensor-space positions for calibration
- `subscribe_grid_targets` — grid positions + zone state + sensor data

Config commands (`set_setup`, `set_room_layout`, `set_settings`,
`set_distance_override`, `set_entity_enabled`, `save_configuration`,
`list_configurations`, `delete_configuration`,
`set_show_room_calibration_tutorial`) check config protocol compatibility before
executing, then save to storage and push to the device. Configuration
*application* is client-side: the panel reads a saved configuration via
`list_configurations`/`get_config` and replays it as a sequence of the regular
set\_\* commands — there is no server-side `apply_configuration` command. An
`update_firmware` command triggers OTA; `subscribe_ota_progress` streams the
live progress events. `dismiss_target` is a read-side helper for ghost-target
dismissal. The integration also exposes a `/api/eppgrid/firmware/` HTTP view
(`firmware_proxy.py`) that proxies to the version-pinned GitHub Release, dodging
GitHub's missing CORS headers for the in-browser flasher; it requires HA bearer
auth, caps the body at 16 MiB, and times out after 60 s.

State-mutating commands carry `@websocket_api.require_admin`. Read-only `list_*`
/ `subscribe_*` / `get_config` / `dismiss_target` are open to any authenticated
user.

A `diagnostics.py` module supplies HA's standard diagnostics download
(integration entry + per-device entity snapshots) for support cases.

See [data-catalog.md](data-catalog.md) for the complete data field inventory.

### Device Groups (`device_groups/`)

A device group combines several physical EPP Grid devices into one logical
presence sensor, exposing **merged** presence + zone `binary_sensor` entities
under a single HA device. This lets a user cover one room with multiple radars
and consume a single occupancy entity that is `on` when *any* member sees
presence.

The feature does no signal processing of its own — it OR-aggregates the member
devices' existing ESPHome presence/zone entities:

- **`DeviceGroupManager` (`device_groups/__init__.py`)** — CRUD owner. Create /
    update / delete validate the constraints in `const.py` (`MAX_DEVICE_GROUPS`,
    `MAX_SOURCES_PER_DEVICE_GROUP`, `MAX_ZONE_GROUPS_PER_DEVICE_GROUP`), persist
    to `storage.py`, (re)spawn an `Aggregator` per group, fire change listeners
    (consumed by the WS subscription), and ask the binary_sensor platform to
    reconcile entities. Delete also removes the group's HA device-registry
    entry.
- **`Aggregator` (`_aggregator.py`)** — one per group. Subscribes to the member
    entities' state changes via `async_track_state_change_event` and recomputes
    three output maps: `presence[slot]`, `zone_groups[zg_id]`, and
    `zone_passthroughs[(mac, idx)]`. Each is OR-aggregated by the pure
    `or_presence()` in `_aggregation.py` (`on` if any source is `on`, `off` if
    all available sources are `off`, `None` if nothing contributes —
    `unknown`/`unavailable` are ignored).
- **`_registry.py`** — resolves a `(mac, slot)` to a concrete ESPHome
    `entity_id`, and builds the per-source `SourceState` (which presence slots
    are enabled and which zones are configured/named) used for projection.
- **`_projection.py` — `derive_exposed_entities()`** — pure function mapping a
    group definition + source state to the list of entities the group *will*
    expose: presence is the union of enabled slots minus `excluded_presence`;
    each zone group becomes one merged entity; ungrouped enabled zones pass
    through (minus `excluded_zones`), name-collision-resolved with a source-name
    prefix. The **combined Rest of room** is an implicit zone group synthesised
    from every source's zone 0 — it is never stored in `zone_groups` and carries
    the reserved id `rest_of_room`; its entity unique_id follows the scheme
    `eppgrid_device_group_{group_id}_zone_group_rest_of_room`. It can be
    suppressed by including `"rest_of_room"` in `excluded_zone_groups`. Both
    `derive_exposed_entities` (Python) and its mirror `deriveExposedEntities`
    (TypeScript) accept keyword exclusion args (`excluded_presence`,
    `excluded_zones`, `excluded_zone_groups`) — keep the two in sync (see
    *Firmware ↔ TypeScript Sync* for the general policy; the same discipline
    applies here). `zone_groups` members use zone index **1–7** only (zone 0 is
    always the implicit combined Rest of room; a legacy zone-0 member in a
    stored group is rewritten by the v3→v4 migration). **This is mirrored
    verbatim in the frontend** (`lib/device-groups-projection.ts`) so the editor
    can preview entities without a round trip.
- **`binary_sensor.py`** — the `Platform.BINARY_SENSOR` platform, forwarded from
    `async_setup_entry`. A `_PlatformProxy.sync_all()` reconciles live entities
    to the current group definitions (presence / zone-group / zone-passthrough
    entity classes), wiring each to its aggregator output key, and applies each
    group's `area_id` to the HA device registry.
- **WS API (`websocket_api/_device_groups.py`)** — admin-only list / create /
    update / delete / subscribe commands. See data-catalog.md for the message
    schemas. Note the wire param is `group_id` (not `id`) because HA reserves
    top-level `id` for the message envelope.

Frontend side: `controllers/device-groups-controller.ts` is the WS client
(subscribe + CRUD), `views/epp-device-groups-view.ts` is the list/editor host
wired into the panel's **Device Groups** tab, and the
`components/epp-device-group-editor.ts` composes the two-section editor. It
carries the exclusion sets (`excludedPresence`, `excludedZones`,
`excludedZoneGroups`) in its draft state and emits the full group payload
(sources + zone_groups + exclusions) on save; the backend recomputes the exposed
entities. The two editor sections are:

- `components/epp-device-source-list.ts` — the **Devices** section: an
    add-device dropdown (only not-yet-added devices) above a list of the
    included devices, each with an availability badge and a delete button; emits
    `source-toggled` (add / remove).
- `components/epp-sensor-list.ts` (replaces `epp-zone-merge-list.ts`) — the
    **Sensors** section: presence rows with coverage indicators, the combined
    Rest of room row, passthrough zones, merged zones, and the List ⇄ Merge
    mode; emits `exclusions-changed` and `zone-groups-changed`.

Two shared helpers back the UI:

- **`components/epp-kebab-menu.ts`** — a reusable ⋮ overflow menu used by the
    group list cards, the merged-zone boxes, and (after migration) the panel's
    live-overview menu. It renders HA's native `ha-button-menu` + `ha-list-item`
    when those are registered and falls back to a self-contained popover under
    older HA / happy-dom; it supports left icons, dividers, and a danger item,
    and emits `item-select` `{id}`.
- **`lib/device-groups-labels.ts`** — `PRESENCE_LABELS`, `exposedSensorChips()`
    (the group's presence + zone sensors as one chip list: Occupancy first, then
    the remaining presence sensors alphabetically, then the zones
    alphabetically, with numeric-aware name comparison), and
    `EDIT_DELETE_KEBAB_ITEMS` (the shared Edit/Delete kebab items), so the list
    view and the editor render identical, consistent labels.
- **`components/epp-confirm-dialog.ts`** — a reusable themed modal (reusing the
    panel's shared `dialogStyles`) for confirm/alert prompts; the device-groups
    view uses it for delete-confirm and save/delete errors instead of the
    browser's `window.confirm`/`alert`.

The editor tracks unsaved changes (an order-insensitive `canon()` snapshot) and
emits `dirty-changed`; the view relays it to the panel as `form-dirty-changed`,
which feeds the panel's `NavigationGuardController` so leaving with unsaved
edits (tab switch, browser nav, page unload) warns via the shared unsaved-
changes dialog. The panel renders its global dialogs once, unconditionally, in
`render()` so every tab/status branch shows them.

## TypeScript Frontend

### Build System

Rollup bundles `src/index.ts` → minified ES module at
`custom_components/.../frontend/eppgrid-panel.js`. TypeScript with strict mode
and experimental decorators for Lit. Biome for linting/formatting.

### Embedding: panel and dashboard card

There are two distinct frontend mounting surfaces, each with a different access
model:

**Admin panel** — `panel_custom.async_register_panel` registers
`<eppgrid-panel>` as a full-screen webcomponent on the `/eppgrid` URL with
`require_admin=True`. HA hides it from non-admin users and rejects direct URL
access. The panel is admin-gated because it **mutates** device config
(calibration, zones, settings, OTA flashing); it is not appropriate for shared
household dashboards.

**Read-only dashboard card** (`custom:eppgrid-card`) — a separate Lit element
that displays a live map and/or sensor sidebar for a single device, with no
mutation capability. It is backed by non-admin WebSocket commands, so it can be
placed on dashboards visible to any authenticated household user. See
[Dashboard Card Architecture](#dashboard-card-architecture) below.

### Dashboard Card Architecture

`custom:eppgrid-card` is a self-contained read-only display surface. Key design
points:

**Separate JS bundle.** The card ships as `eppgrid-card.js`, a second Rollup
output (`src/card/index.ts` entry) built alongside the panel bundle. It is
registered as a **Lovelace module resource** (not via `add_extra_js_url`). The
reason: `add_extra_js_url` injects the module before HA lazily installs the
scoped-custom-element-registry polyfill; that polyfill swaps
`window.customElements` for a fresh registry, silently dropping any element
registered before the swap. Lovelace resources load during Lovelace init,
post-swap, so the element is always present. YAML-mode dashboards have no
mutable resource store, so `add_extra_js_url` is used as a fallback there.
(`__init__.py`: `_register_card_resource` / `_unregister_card_resource`)

**Component reuse.** The card renders `<epp-grid>` (read-only, with
`showOverlays`) and `<epp-live-sidebar>` (with `presenceKeys` / `showZones` /
`envKeys` / `interactive=false`) — the same components the panel uses in its
live-overview view. No duplication of rendering logic.

**Non-admin backend commands** (`websocket_api/_overview.py`):

- `eppgrid/overview/list_devices` — returns the list of EPP devices (device_id,
    mac, name) for the card editor's device picker. Synchronous, no admin gate.
- `eppgrid/overview/subscribe` — sends a stored-layout snapshot (so the card can
    draw the room even while the device is offline), then opens a refcounted
    device session and streams the same `{targets, sensors, zones}` frames as
    `subscribe_grid_targets`, reusing `_make_grid_target_on_state`. The command
    owns the session lifecycle (open + release).

**`OverviewStore` (`frontend/src/card/overview-store.ts`).** A module-level,
ref-counted store keyed by `device_id`. Multiple cards for the same device share
a single `eppgrid/overview/subscribe` WebSocket subscription; the last card to
disconnect closes it. The backend `DeviceManager` independently ref-counts the
ESPHome session per MAC, so there is only ever one physical TCP connection to a
device regardless of how many cards or panel sessions are open.

**`getEntitySuggestion` (HA 2026.6+).** When the dashboard card picker is opened
for an entity, `getEntitySuggestion` checks whether that entity's device is a
known EPP device (using a lazily-populated cache filled via
`eppgrid/overview/list_devices`) and, if so, suggests `custom:eppgrid-card`
pre-filled with the matching `device_id`. Because the lookup is async but the HA
API is synchronous, the cache is warmed on first call; reopening the picker
after the cache resolves returns the suggestion.

### Panel Architecture

The frontend is a Lit-based component tree rooted in `<eppgrid-panel>`, which
acts as orchestrator and renders the live overview / editor inline. State flows
via reactive controllers; rendering of focused sub-views (wizard, flasher,
settings, sidebars, grid) is delegated to dedicated components.

**Orchestrator (`eppgrid-panel.ts`)** — View routing (live / editor / settings /
wizard / flash), device selector, global dialogs, navigation guards, controller
creation, and the `_renderLiveOverview()` / `_renderEditor()` templates that
compose `<epp-grid>` with the appropriate sidebars.

**Controllers** (shared state, no DOM):

- `DeviceController` — WS subscriptions, device loading, session lifecycle,
    online/offline tracking
- `GridStateController` — grid/zone/furniture mutation, settings, saved
    configurations (load/save/apply)
- `TargetController` — target/sensor/zone state, frontend zone-engine replica,
    detection-event log
- `FlasherController` — Web Serial port lifecycle, USB flash + WiFi provisioning
    state machine

**View / sub-view components:**

- `<epp-wizard>` — calibration flow (guide, 4-corner capture, perspective solve)
- `<epp-flasher-view>` — USB flash + WiFi provisioning UI
- `<epp-settings-view>` — accordion panels for detection ranges, reporting, env
    offsets, LED/relay control, log levels, entity toggles
- `<epp-grid>` — grid cell rendering, target dots, furniture overlay, FOV
    darkness, beyond-range hatching (used by both live and editor)
- `<epp-live-sidebar>` — presence/zone/environment sensor display
- `<epp-zone-sidebar>` — zone list, type controls, add/remove
- `<epp-overlay-sidebar>` — entry-point / interference / suppress paint controls
- `<epp-furniture-sidebar>` — sticker catalog, custom icons
- `<epp-furniture-overlay>` — drag, resize, rotate furniture items
- `<epp-info-tip>` — shared `(?)` help affordance: click-toggled, fixed-position
    tooltip (one open at a time; stays clickable even inside disabled rows)

**State flow:** Controllers own cross-cutting state (device, grid, targets,
flasher). Components receive data as properties and fire `CustomEvent`s for
mutations. The orchestrator wires events to controller methods. On device load,
it sets `DeviceController.onTargetData` and `onRawTargetData` callbacks that
route incoming WS data through `TargetController` to the panel's reactive state
— these must be set before subscriptions start.

**Navigation protection:** Intercepts `beforeunload` and
`history.pushState/replaceState` when unsaved changes exist.

**View persistence:** `lib/view-hash.ts` encodes the active view + sidebar tab
into the URL fragment (`#zones`, `#overlays`, `#furniture`, `#settings`,
`#tutorial`, `#calibrate`), so each browser tab keeps its own view across
reloads and HA frontend rebuilds.

**Mount survival:** `panel-mount-guard.ts` installs MutationObservers that
detect when the HA frontend tears down and rebuilds the panel host (idle
re-renders, dashboard hot-reloads) and re-attaches `<eppgrid-panel>` rather than
starting from scratch.

**Localization:** `localize.ts` returns a `localize(key, params)` function
backed by `IntlMessageFormat`, with `translations/{en,es}.json` as the string
catalogues. Zone *entity* display names are localized server-side in
`zone_name_translations.py` via the entity registry, since the relevant string
keys are constructed dynamically per zone.

### USB Flashing & WiFi Provisioning

The Flash Firmware tab provides USB-based firmware flashing and WiFi
provisioning via the Web Serial API and esptool.js, all running in the browser.

**Key files:**

- `lib/usb-flash-service.ts` — esptool.js flash orchestration, manifest fetch
- `lib/improv-serial.ts` — Improv Serial protocol (packet building, parsing,
    buffer management)
- `components/epp-flasher-view.ts` — Flash UI (device list, variant selector,
    WiFi provisioning)
- `controllers/flasher-controller.ts` — Serial port lifecycle, USB state machine

**Firmware manifests + binaries** are proxied through the HA backend at
`/api/eppgrid/firmware/` (see `firmware_proxy.py`) to avoid CORS issues with
GitHub Releases. The proxy fetches from the per-version release at
`github.com/.../releases/download/v{FIRMWARE_VERSION}/`, so the integration
always installs the firmware version it was tested against — independent of the
"latest" pointer used by the standalone ESP Web Tools page. `FIRMWARE_VERSION`
is pinned in `const.py`.

**USB flash flow:**

1. User selects serial port via Web Serial API
1. esptool.js detects chip, uploads stub, flashes firmware + appends a 2 KB
    `0xFF` write at `0x9000` to erase the otadata partition. Without this the
    bootloader keeps booting whichever ota_X partition the previous OTA wrote
    to — even though we just wrote firmware.bin to ota_0.
1. MAC detected from esptool terminal output during `loader.main()`
1. `beforeFlash` callback checks MAC against installed devices — if original
    firmware with ESPHome entry, confirms and deletes the old entry
1. After flash, `transport.disconnect()` releases reader (port stays open via
    CH340 monkey-patch — see Serial Port Lifecycle below)

**WiFi check / auto-skip** (wifi variants only, runs immediately after flash):

1. `queryImprovState` does an Improv handshake and reads `CURRENT_STATE`. If the
    device boots into `PROVISIONED` (already had creds in NVS), it delegates to
    `detectIpAddress` which polls `GET_CURRENT_STATE` every 2 s for up to 30 s
    waiting for a non-`0.0.0.0` IP (cold-boot DHCP can take 7–20 s).
1. If a real IP arrives → skip WiFi setup, go straight to HA-add.
1. Otherwise (unprovisioned, or no IP within budget) → fall through to the WiFi
    provisioning flow below.
1. Cancel during this phase aborts the polling loop via `AbortSignal` and awaits
    the in-flight promise before closing the port — closing while a reader lock
    is still held leaves the port unusable for retries.

**WiFi provisioning flow** (used when auto-skip falls through):

1. WiFi scan via Improv SCAN command
1. User selects network, enters password
1. Send credentials via Improv WIFI_SETTINGS command
1. Wait for PROVISIONING (0x03) → PROVISIONED (0x04) state transition (confirms
    creds saved to NVS)
1. `detectIpAddress` polls until a non-`0.0.0.0` IP is returned
1. Auto-add device to HA via `eppgrid/add_esphome_device` WebSocket API

**Error / retry routing:** The error state carries the `lastStep` it
transitioned from plus the `variant` for flash-phase errors. The Retry button
re-runs the flash for `connecting`/`flashing`/`wifi_check` failures and the
WiFi-config flow for everything else. Start Over always resets to the variant
picker.

**Serial port lifecycle (CH340 workaround):** `transport.disconnect()` calls
`port.close()` internally. On CH340 USB-serial chips (VendorID 0x1a86, ProductID
0x55d3), closing and reopening leaves the port in a zombie state. Fixed by
monkey-patching `port.close` to a no-op before creating Transport, restoring
after disconnect. Port stays open for WiFi provisioning after flash.

**Firmware updates** for Everything Presence Pro Grid devices use a custom
ESPHome API action, `set_update_manifest`, which sets the source URL on the
device's `http_request`-platform `update` entity and then calls `update.perform`
on it. The flow is triggered by the integration via the
`eppgrid/update_firmware` WebSocket command. Raw OTA push is not used — newer
ESPHome uses NOISE encryption which is incompatible with direct protocol
implementation. Original firmware devices can only be converted via USB flash.

### Library Modules

**perspective.ts** — `solvePerspective(src, dst)` solves the 8-coefficient
homography from 4 point pairs via Gaussian elimination.
`applyPerspective(h, x, y)` applies the transform. `getInversePerspective(h)`
inverts via 3×3 matrix inversion.

**grid.ts** — Cell-byte accessors. The lower 3 bits hold zone membership (0=room
background, 1–7=named zones); bits 4–5 hold a 4-state overlay field
(`CELL_OVERLAY_NONE` / `_ENTRY` / `_INTERFERENCE` / `_SUPPRESS`) read with
`cellOverlay`, written with `cellSetOverlay`. Plus `cellIsInside`, `cellZone`,
`cellSetZone`, room-bounds calculation, and grid initialization from room
dimensions. Constants: `GRID_COLS=20`, `GRID_ROWS=20`, `GRID_CELL_MM=300`.

**coordinates.ts** — `mapTargetToGridCell(x, y, roomWidth, roomDepth)` maps
room-space coordinates to fractional grid cell position (room centered
horizontally). `rawToFovPct()` maps raw sensor coords to FOV percentages for the
wizard. `getSmoothedValue()` provides 1-second rolling median for capture
smoothing.

**room-geometry.ts** — `computeSensorFov(perspective)` derives sensor position
and look-direction in room-space from the perspective transform.
`isCellInSensorRange(col, row, fov, roomWidth, maxRangeMm)` distinguishes cells
outside the 120° FOV cone from cells beyond the configured max range —
`<epp-grid>` darkens the former and cross-hatches the latter, and both block
painting. `autoDetectionRange()` computes range from the furthest room cell.

**zone-defaults.ts** — `Zone0Config` (zone 0 settings: type + timing) and
`ZoneConfig` (named zones: `Zone0Config` + name + color) interfaces.
`ZONE_TYPE_DEFAULTS` table for the four built-in zone types (`default`, `bed`,
`seating`, `transit`) — `custom` has no entry and uses user-supplied
trigger/renew/timeout/handoff values exclusively. `getZoneThresholds()` resolves
the effective values for any zone. `COLOR_PALETTE` holds 7 colorblind-friendly
colors.

**settings-defaults.ts** — `ENTITY_DEFAULTS` (per-entity disabled-by-default
map: only the core occupancy/presence/env entities are enabled; everything else
opt-in) and `SETTINGS_DEFAULTS` (full settings shape with default values).
`buildSparseEntities()` / `expandEntities()` and `isSettingsValueDefault()`
drive the sparse-on-save / fill-on-restore behavior used by saved
configurations.

**cell-painting.ts** — Stroke-based zone/overlay paint helpers (line
rasterization, in-bounds filtering) used by the editor.

**config-serialization.ts** — Encode/decode for saved configurations
(calibration + room layout + zones + furniture + sparse settings).

**configuration-thumbnail.ts** — SVG thumbnail of a saved configuration (zone
fills, furniture stickers, FOV-aware bounds) shown in the picker.

**furniture.ts** — `FurnitureItem` model, sticker catalog, coordinate helpers
(room-space ↔ overlay-space).

**heatmap.ts** — Per-zone CSS color resolution used by both the grid component
and the live sidebar.

**furniture-contrast.ts** — Picks the furniture tone (near-white or near-dark)
that maximizes WCAG contrast against a custom `room_color`, paired with an
opposite-tone outline so furniture stays legible over painted zones.
`relativeLuminance` / `contrastRatio` / `furnitureContrast` / `isRgbTriple`.
Applied by `<epp-grid>` only when `room_color` is set (otherwise furniture keeps
the default theme grey — no change).

**view-hash.ts** — URL fragment ↔ `ViewState` (view + sidebar tab) encoding for
per-tab view persistence.

**help-url.ts** — Pure mapping from `(panelTab, view, sidebarTab)` to the
matching user-guide page URL, used by the help icon in the panel tab-bar.

**storage.ts** — `localStorage` helper for cross-tab device-selection memory
(`persistSelectedMac`).

**improv-serial.ts**, **usb-flash-service.ts** — see USB Flashing & WiFi
Provisioning below.

### Local Zone Engine Replica (`lib/zone-engine.ts`)

The frontend contains a pure-function replica of the firmware's zone engine
state machine for live preview in the editor. It implements the same algorithms:

- **Step 0 — pending relocation:** before per-target evaluation, a held PENDING
    target whose slot is reused by a far new entrant is parked into a free slot
    (entrance-gated; distance-only fallback when no entry overlay is
    configured), preserving its original pending timer.
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

| Algorithm                                 | C++ (firmware)              | TypeScript (frontend)         |
| ----------------------------------------- | --------------------------- | ----------------------------- |
| Cell encoding (zone bits + overlay field) | `epp_grid.h`, `epp_types.h` | `lib/grid.ts`                 |
| Target → cell                             | `epp_zone_engine.cpp`       | `lib/coordinates.ts`          |
| Zone state machine                        | `epp_zone_engine.cpp`       | `lib/zone-engine.ts`          |
| Sensor state machine                      | `epp_zone_engine.cpp`       | `lib/zone-engine.ts`          |
| Perspective transform                     | `epp_calibration.h`         | `lib/perspective.ts`          |
| Zone-slot config schema                   | `epp_zone_config_parser.h`  | `lib/config-serialization.ts` |

Zone-type defaults are owned by the **backend** (`custom_components/eppgrid/`)
and `frontend/src/lib/zone-defaults.ts` — the firmware no longer contains a
defaults table. Both must agree, since the backend expands non-`custom` zones
before pushing config and the frontend renders the same expansion live.

## Testing

### C++ (doctest)

Two host-testable libraries, each with its own CMake build and CTest run:

- `firmware/lib/epp_zone_engine/tests/`: zone engine, zone-engine logging,
    parity (frontend↔firmware fixtures), grid, calibration, rolling window,
    zone-config parser, relay.
- `firmware/lib/epp_component_helpers/tests/`: NVS layout, frame ring buffer,
    frame staleness, change detector, indexed setter, JSON writer, perspective
    parser, relay publish, target validity.

The pre-push hook builds and tests both when firmware code changes.

### TypeScript (vitest)

Tests live in `frontend/src/__tests__/` with happy-dom for DOM simulation.

| Path                                                                                         | Covers                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel-*.test.ts`                                                                            | Integration tests for the orchestrator (35+ files: navigation, render, configurations, settings, wizard, flasher, mount-guard, URL hash, reconnect, parity, …) |
| `controllers/*.test.ts`                                                                      | DeviceController, GridStateController, TargetController, FlasherController                                                                                     |
| `components/*.test.ts`                                                                       | All shared components                                                                                                                                          |
| `lib/*.test.ts`                                                                              | Pure-function modules (grid, coordinates, perspective, zone-engine, settings-defaults, view-hash, …)                                                           |
| `localize.test.ts`, `translations-coverage.test.ts`, `translations-spanish-coverage.test.ts` | i18n parity                                                                                                                                                    |
| `strategy.test.ts`                                                                           | Lovelace dashboard strategy                                                                                                                                    |

### Python (pytest)

Tests in `tests/`: init lifecycle, config flow, storage, device manager,
websocket API, diagnostics, flasher backend, firmware\<->const version
alignment, environmental defaults, mmWave entity wiring, translation coverage.

### CI (.github/workflows/)

- **tests.yml** — Python tests (multiple HA versions), frontend lint + vitest +
    coverage, C++ ctest
- **nightly.yml** — scheduled run of the Python + frontend suites against the
    latest upstream deps (HA stable + dev, latest aioesphomeapi, frontend deps
    resolved fresh); catches breaking upstream releases between commits
- **firmware.yml** — C++ tests + ESPHome compilation for both variants (on push
    to main touching `firmware/`)
- **firmware-release.yml** — Tag-triggered firmware build + ESP Web Tools
    manifest publish
- **pages.yml** — Stages `fw/` for OTA: `fw/latest/` from the GitHub `latest`
    release, plus `fw/v{FIRMWARE_VERSION}/` for the version the integration pins
    (even when it's a prerelease)
- **post-release-bump.yml** — On `release: released`, rolls `main` forward to
    the next minor (manifest only)
- **codeql.yml** — CodeQL static analysis
- **hacs.yml** — HACS repository structure validation
- **hassfest.yml** — manifest.json schema validation

### Firmware Release Deployment

Firmware binaries and manifests are hosted on **GitHub Releases** and proxied
through the HA backend at `/api/eppgrid/firmware/` to avoid CORS issues (GitHub
Releases serves with `application/octet-stream` and no CORS headers). The
firmware version is pinned by `FIRMWARE_VERSION` in `const.py`. The proxy
fetches from the version-pinned release URL, so installs from the panel are
always reproducible — independent of which release the GitHub "latest" pointer
happens to refer to.

**Release script (`bin/release.sh`)** — opens a release PR. Pre-flights semver,
on-main, clean-tree, tag-not-exists, and origin-up-to-date. Bumps
`manifest.json` (always) and `FIRMWARE_VERSION` (only when `firmware/` changed
since the previous tag) so the integration version and firmware version remain
independent — they only re-align when the firmware actually changes.

**firmware-release.yml** — Triggered by tag push (`v*`). First runs
`.github/scripts/validate-release.sh`, which fails the workflow if
`manifest.json` ≠ tag, or if the three firmware-version files (manifest
template, `FIRMWARE_VERSION`, etc.) disagree. It then **always** compiles both
variants, generates ESP Web Tools manifests, and publishes them as release
assets — every tag rebuilds firmware unconditionally, so an integration-only
release attaches a byte-identical rebuild of the unchanged firmware (the
integration keeps `FIRMWARE_VERSION` pointed at the release where the firmware
last changed). **Every release is published as a pre-release**
(`prerelease=true`, `make_latest=false`) — none are ever auto-marked the GitHub
`latest`. After testing, promote with `bin/promote.sh <version>` (which runs
`gh release edit v<version> --prerelease=false --latest=true`).

**pages.yml** — Triggers on push to main *and* on `release: released`. Stages
firmware in two passes:

1. `fw/latest/` from the GitHub `latest` release via `gh api /releases/latest`
    (simpler than scanning + filtering). Since releases start as pre-releases,
    `fw/latest/` stays on the previous promoted release until you promote the
    new one; promotion fires `release: released`, re-running this workflow
    without needing a fresh tag. This is the channel ESPHome's *native* update
    entity reads, so it must only ever advance to a promoted (stable) release.
1. `fw/v{FIRMWARE_VERSION}/` for the version the integration pins in `const.py`
    — staged with `STAGE_LATEST=0` so it does **not** move `fw/latest/`. The
    panel's OTA button fetches `OTA_MANIFEST_BASE_URL` =
    `fw/v{FIRMWARE_VERSION}/` (Path B), so without this pass a
    prerelease-pinned integration 404s on every OTA. Skipped when the pinned
    version already *is* `latest`. This is what lets beta testers OTA-update
    onto a pre-release the GitHub `latest` pointer (and the native update entity)
    deliberately ignore.

**post-release-bump.yml** — Triggers on `release: released` (promotion), not on
tag push: every tag is published as a pre-release, so bumping at tag time would
fire for an unfinished release. On promotion it computes the next minor from the
released tag and, **only if that is strictly ahead of the current
`manifest.json` version** (forward-only guard, so promoting an old release can't
regress `main`), runs `bin/bump-version.sh <next>` (manifest only — never
`FIRMWARE_VERSION` or firmware YAML) and opens an auto-merging
`chore/post-release-bump` PR. The PR is created with a `RELEASE_PAT`
fine-grained secret (contents + PRs write) — a `GITHUB_TOKEN` PR wouldn't
trigger the required status checks the `main` ruleset demands — and needs the
repo's "Allow auto-merge" setting enabled.
