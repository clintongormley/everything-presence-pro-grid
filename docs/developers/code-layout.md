# Code layout

Quick orientation: the repository is four subsystems plus CI glue. This page
walks through each so you can answer "where does X live?" without grepping.

```
everything-presence-pro-grid/
├── custom_components/eppgrid/   # Python HA integration
├── frontend/                    # TypeScript/Lit panel
├── firmware/                    # ESPHome + C++ libs
├── docs/                        # This site
├── .githooks/pre-push           # Pre-push hook (required to be set up)
├── scripts/pre-push-fast.sh     # Lightweight pre-push gate (run manually)
├── tests/                       # Python tests
├── .github/workflows/           # CI
├── pyproject.toml               # Python config (ruff, pytest)
├── requirements_test.txt        # Python dev deps
├── requirements-docs.txt        # Docs deps
├── mkdocs.yml                   # Docs site config
├── hacs.json                    # HACS metadata
└── README.md
```

## Integration (`custom_components/eppgrid/`)

Python HA custom component. Thin by design — it does no signal processing. Its
job is to discover devices, manage connections, relay state to the panel, and
persist config.

Top-level modules:

- **`__init__.py`** — `async_setup_entry`, storage init, device-manager startup,
    WebSocket command registration, frontend-panel registration (admin-only),
    and Lovelace card resource registration (`_register_card_resource` /
    `_unregister_card_resource`) for the dashboard card bundle.
- **`config_flow.py`** — HA config flow. Mostly a shell because the
    integration's real "discovery" happens by scanning the entity registry for
    ESPHome devices that match the firmware signature (see `device_manager/`).
- **`storage.py`** — per-device config persistence via HA's `Store` API.
    Calibration, room layout, zone slots, furniture, sensor settings, plus a
    separate "saved configurations" store (named room layouts the user can
    restore later). Settings are stored sparsely — only fields that differ from
    `SETTINGS_DEFAULTS` are written; missing fields are filled from defaults on
    restore.
- **`firmware_proxy.py`** — auth-required HTTP view (`requires_auth = True`)
    that proxies firmware manifests + binaries from
    `github.com/.../releases/download/v{FIRMWARE_VERSION}/` so the in-browser
    flasher avoids GitHub's missing CORS headers. 60 s upstream timeout, 16 MiB
    body cap.
- **`diagnostics.py`** — HA diagnostics platform. Lets users download a JSON
    dump of integration state for issue reports, with MAC and host fields
    redacted.
- **`repairs.py`** — Repairs flow that triggers OTA from a
    `firmware_behind_<mac>` issue and polls the device's version sensor until it
    flips (3 min timeout).
- **`zone_name_translations.py`** — translates structural zone-entity prefixes
    (`Zone <N> Presence` → `Zone <name> Presence`) via the entity registry.
    User-supplied portions are kept as-is.
- **`const.py`** — constants. Notably `MANIFEST_BASE_URL` (the per-version
    GitHub Releases URL the proxy fetches from), `FIRMWARE_VERSION` (the
    firmware version this integration release expects), `MAC_SCHEMA` and the
    various input-validation schemas.
- **`strings.json`** and **`translations/`** — user-facing strings. The pre-push
    hook checks that strings.json updates ride alongside relevant code changes.
- **`brand/`** — brand assets (icons) used by the HA UI.
- **`frontend/eppgrid-panel.js`** — the built panel bundle (tracked in git — see
    [Contributing](contributing.md)).
- **`frontend/eppgrid-card.js`** — the built dashboard card bundle (second
    Rollup output, also tracked in git).

The two main subsystems are split into packages:

### `device_manager/`

The workhorse. Discovers Everything Presence Pro devices in the ESPHome entity
registry, opens `aioesphomeapi` connections on demand, pushes saved config,
manages entity enable/disable based on settings, subscribes to device logs.

- **`__init__.py`** — `DeviceManager` and `ManagedDevice`: discovery, lifecycle
    (start / stop / reload), config-push debouncing, log relay, Repairs
    integration.
- **`_connection.py`** — `DeviceConnection`: per-device `aioesphomeapi` wrapper.
    `async_open_session`, `async_execute_service`, `async_push_config`, OTA,
    build-flag fetching, state subscription.
- **`_helpers.py`** — pure helpers: `_expand_zone_slot` (resolves non-custom
    zone types to timing values), version compare, MAC normalisation,
    `is_valid_zone_slots_shape`, etc.

### `websocket_api/`

Frontend ↔ device relay. Each module is a small group of related WS commands;
the package-level `__init__.py` registers them all and provides shared
validators.

- **`__init__.py`** — registration, voluptuous schemas (with length / range
    bounds + MAC regex), `_require_manager` decorator, error helpers.
- **`_devices.py`** — device list + per-device session, get_config, set_setup,
    set_room_layout, set_settings, set_distance_override, set_entity_enabled,
    save_configuration, list_configurations, delete_configuration,
    set_show_room_calibration_tutorial, plus the live `subscribe_device`,
    `subscribe_grid_targets`, `subscribe_raw_targets` streams.
- **`_firmware.py`** — `update_firmware` (OTA), `subscribe_ota_progress`,
    `dismiss_target`.
- **`_flasher.py`** — `list_flashable_devices`, `subscribe_flashable_devices`,
    `add_esphome_device`, `delete_esphome_device` (USB / Wi-Fi flasher support).
- **`_overview.py`** — `eppgrid/overview/list_devices` and
    `eppgrid/overview/subscribe`: non-admin, read-only commands powering the
    dashboard card. Unlike all other commands these carry **no**
    `@websocket_api.require_admin` gate, so the card can appear on shared
    household dashboards.

Every other command carries `@websocket_api.require_admin` — the panel is
admin-only, so both state-mutating and read-only (`list_*` / `subscribe_*` /
`get_config` / `dismiss_target`) panel commands are gated to administrators.

For the flow of data through these files at runtime, see
[Architecture](architecture.md).

## Frontend (`frontend/src/`)

TypeScript/Lit panel. Mounted in HA via `panel_custom`, admin-only.

Top-level files:

- **`index.ts`** — panel bundle entry point. Re-exports `EPPGridPanel`.
- **`eppgrid-panel.ts`** — top-level `<eppgrid-panel>` custom element. Tab bar
    (Device Configuration / Flash Firmware), global state, event routing, view +
    setup-step management, Lit reactive controllers. The USB/Wi-Fi flash flow
    and the unsaved-changes navigation guard have been extracted into their own
    controllers (see `controllers/usb-flash-flow.ts` and
    `controllers/navigation-guard.ts`).
- **`eppgrid-card.ts`** — `<eppgrid-card>` Lit element: read-only dashboard
    card. Implements the HA card surface (`setConfig`, `hass`, `getCardSize`,
    `getGridOptions`, `getConfigElement`, `getStubConfig`), renders `<epp-grid>`
    and/or `<epp-live-sidebar>`, and registers `window.customCards` with
    `getEntitySuggestion` (HA 2026.6+).
- **`eppgrid-card-editor.ts`** — `<eppgrid-card-editor>` visual config editor.
    Uses `ha-form` with a `buildSchema()` driven by the device list from
    `eppgrid/overview/list_devices`; handles nested presence/environmental
    sensor groups.
- **`card/index.ts`** — card bundle entry point. Imports `eppgrid-card.ts` and
    `eppgrid-card-editor.ts`, registering both custom elements and the
    `window.customCards` entry.
- **`card/overview-store.ts`** — `OverviewStore`: module-level, ref-counted
    store keyed by `device_id`. Collapses multiple cards for the same device
    into one `eppgrid/overview/subscribe` WebSocket subscription; replays cached
    state to late subscribers; handles connection replacement gracefully.
- **`panel-mount-guard.ts`** — re-mount guard for HA frontend rebuilds (panel
    can disappear and reappear without an unmount notification).
- **`localize.ts`** — `IntlMessageFormat` translation factory. LRU-capped
    formatter cache.
- **`types.ts`, `constants.ts`, `styles.ts`** — shared types, SVG / catalog /
    threshold constants, HA theme tokens and reusable CSS fragments.
- **`translations/en.json`, `es.json`** — user-facing strings for the panel,
    nested keys.

### `components/`

Lit components for the visual surfaces.

- `epp-grid.ts` — the grid canvas (rendering, mouse events, target dots, FOV /
    out-of-range / beyond-max-range hatching).
- `epp-wizard.ts` — calibration wizard (guide + 4-corner capture + perspective
    solve).
- `epp-flasher-view.ts` — USB flash + Wi-Fi provisioning UI.
- `epp-settings-view.ts` — device settings (accordions for ranges, reporting,
    env offsets, LED/relay, log levels, entity toggles).
- `epp-zone-sidebar.ts`, `epp-overlay-sidebar.ts`, `epp-furniture-sidebar.ts`,
    `epp-furniture-overlay.ts`, `epp-live-sidebar.ts` — editor-mode sidebars and
    furniture overlay.
- `epp-configuration-dialogs.ts` — saved-configuration backup (name) and restore
    (pick + apply) dialogs.
- `save-cancel-bar.ts` — shared Save/Cancel button bar (one copy for the editor
    sidebar and the settings view; renders `ha-button` when registered, falls
    back to themed buttons otherwise).

### `controllers/`

Lit reactive controllers. Each owns a slice of cross-cutting state.

- `device-controller.ts` — WS subscriptions, device loading, hass-swap
    re-subscribe.
- `grid-state-controller.ts` — mutable grid state (cells, room boundary,
    overlays, furniture), saved-configurations apply / save.
- `target-controller.ts` — target / sensor / zone state, frontend zone-engine
    mirror, debug logs.
- `flasher-controller.ts` — serial port + USB flash state machine.
- `usb-flash-flow.ts` — the USB/Wi-Fi flash flow itself (detect → flash → Improv
    Wi-Fi provision → register in HA), extracted from the panel. Drives
    `FlasherController` via a structural `UsbFlashHost` contract; the host wires
    the "delete original-firmware config entry?" confirmation hook.
- `navigation-guard.ts` — unsaved-changes navigation guard `ReactiveController`.
    Refcounted module-level `history.pushState`/`replaceState` wrapper plus a
    per-instance dirty-guard, ordering-safe under the mount guard's
    duplicate-panel cleanup.
- `panel-host.ts` — typed `PanelHost` interface declaring every panel `_field` /
    `_method` the controllers touch (replaces the previous `Record<string, any>`
    shape so `tsc` catches typos).

### `lib/`

Pure-logic modules — no Lit, no HA, testable in isolation.

- `zone-engine.ts` — state-machine replica of the firmware's zone engine. Kept
    deliberately in sync so the frontend previews match firmware behaviour.
- `perspective.ts` — homography math (solve + apply + invert).
- `grid.ts` — cell byte encoding (room bit, zone bits, 2-bit overlay enum),
    bounds.
- `cell-painting.ts` — click/drag painting for zones, overlays, and room
    boundaries.
- `coordinates.ts` — target → grid cell mapping via the perspective transform,
    smoothing.
- `room-geometry.ts` — FOV cone, range, sensor-position derivation.
- `furniture.ts` — furniture model, sticker definitions, presets.
- `heatmap.ts` — per-zone CSS colour resolution + hatched-cell backgrounds
    (`CELL_BG_OUT_OF_RANGE`, `CELL_BG_BEYOND_MAX_RANGE`).
- `furniture-contrast.ts` — WCAG luminance/contrast maths + light/dark tone
    selection (`furnitureContrast`, `parseRgb`).
- `furniture-tones.ts` — per-item furniture tone from the cell rendered under
    each item (always on; `<epp-grid>` reads the cell background, memoised).
- `zone-defaults.ts` — default thresholds per zone type, palette, threshold
    resolver.
- `settings-defaults.ts` — `ENTITY_DEFAULTS` + `SETTINGS_DEFAULTS` tables
    (drives the sparse storage shape).
- `config-serialization.ts` — saved-configuration encode / decode.
- `configuration-thumbnail.ts` — SVG thumbnail of a saved configuration.
- `view-hash.ts` — URL fragment ↔ ViewState encoding (`#zones`, `#overlays`,
    `#furniture`, `#settings`).
- `help-url.ts` — `(panelTab, view, sidebarTab)` → contextual user-guide URL
    (drives the help icon in the panel tab-bar).
- `storage.ts` — `localStorage` helper (e.g. selected device MAC).
- `safe-unsub.ts` — wrapper around HA WebSocket unsubscribe callbacks that
    swallows the "stale subscription" error from already-torn-down connections.
- `improv-serial.ts` — Improv Serial protocol implementation.
- `usb-flash-service.ts` — `esptool.js` orchestration + manifest fetch.
- `overlay-tracker.ts` — per-slot sticky entry-overlay tracker, the TS mirror of
    the firmware component's raw-frame Stage 2b. Feeds `target.onOverlay` into
    the frontend zone-engine so previews match firmware entry-overlay
    confirmation.
- `document-listeners.ts` — `DocumentListenerGroup` helper: attach/detach
    lifecycle for transient document/window listeners (Escape / outside-click /
    scroll / resize) used by popovers, tooltips, and overlays. Both calls
    idempotent.

### Tests

- **`__tests__/`** — Vitest specs mirroring the source tree. See
    [Contributing](contributing.md) for how to run them.

### Build

- **`rollup.config.js`** — two-output Rollup config. First output: panel bundle
    (`src/index.ts` → `custom_components/eppgrid/frontend/eppgrid-panel.js`).
    Second output: dashboard card bundle (`src/card/index.ts` →
    `custom_components/eppgrid/frontend/eppgrid-card.js`). Both are committed to
    git so Home Assistant serves them without a build step.
- **`biome.json`** — linter / formatter config.
- **`vitest.config.ts`** — frontend test config (90% lines / 85% branches / 90%
    functions / 90% statements per-file thresholds).

## Firmware (`firmware/`)

ESPHome-based, with a custom C++ component and two host-testable C++ libraries.

### `variants/`

The shipping firmware variants — each is a thin top-level YAML that includes the
`common/` fragments it needs.

- `wifi-ble-co2.yaml` — Wi-Fi, with BLE and CO2.
- `ethernet-ble-co2.yaml` — Ethernet, with BLE and CO2.

### `common/`

Shared YAML fragments. Variants `!include` the ones they want.

- `everything-presence-pro-base.yaml` — entity declarations, device config,
    update component, custom-action wiring.
- `ld2450-base.yaml` — LD2450 mmWave radar UART parsing.
- `sen0609-base.yaml` — SEN0609 static-presence GPIO sensor.
- `co2-base.yaml` — SCD4x CO2 sensor snippet.
- `bluetooth-base.yaml` — `esp32_ble_tracker` + `bluetooth_proxy` block.
- `ethernet-base.yaml` — `ethernet:` block (W5500 SPI Ethernet).

### `components/epp/`

The custom ESPHome component (C++) that wires the zone engine and helper libs
into the ESPHome component lifecycle. Reads LD2450 frames from a UART lambda,
runs them through the rolling-median filter and perspective transform, pushes
results to the zone-engine library, publishes outputs back through ESPHome
sensors.

### `lib/epp_zone_engine/`

The zone engine library, pure logic, no ESPHome dependencies.

- `src/` — implementation.
- `include/` — public headers (`epp_grid.h`, `epp_zone_engine.h`,
    `epp_calibration.h`, `epp_rolling_window.h`, `epp_relay.h`, `epp_window.h`,
    `epp_zone_config_parser.h`, `epp_types.h`).
- `tests/` — doctest unit tests including the parity test against the frontend
    zone engine.
- `CMakeLists.txt` — host build.

### `lib/epp_component_helpers/`

A header-only library of small pure helpers extracted from `components/epp/` so
they're testable on the host. Each module is a single `.h` plus a single doctest
test file.

- `epp_change_detector.h` — `did_*_change` predicates for idempotent NVS writes.
- `epp_frame_ring_buffer.h` — SPSC ring buffer used for LD2450 frames between
    the UART lambda and `loop()`.
- `epp_frame_staleness.h` — `is_frame_stale` (cold-start, threshold boundary,
    `millis()` wraparound).
- `epp_indexed_setter.h` — `set_at(array, index, value)` template helper for the
    per-target sensor setters.
- `epp_json_writer.h` — `BoundedWriter` for size-capped zone-state JSON.
- `epp_nvs_layout.h` — `GRID_BLOB_SIZE`, `GRID_BASE64_MAX`,
    `NVS_SCHEMA_VERSION`.
- `epp_perspective_parser.h` — strict comma-separated coefficient parser
    (rejects NaN / Inf / wrong count).
- `epp_relay_publish.h` — relay desired-state computation + publish.
- `epp_target_validity.h` — `is_target_valid(status, x, y)` (status +
    finite-coords check).

Each library builds and tests standalone via CMake. The pre-push hook builds and
tests **both** when firmware code changes; see [Contributing](contributing.md).

## Docs (`docs/`)

This site. MkDocs Material source.

- `user-guide/` — the user-facing pages.
- `developers/` — this section.
- `images/` — screenshots and the logo.
- `handoffs/` — point-in-time engineering handoff notes (gitignored content kept
    locally).
- `superpowers/` — planning and spec documents (gitignored; not published to the
    site).
- `mkdocs.yml` (in repo root) — site config, nav, theme, plugins.

## CI (`.github/workflows/`)

- **`tests.yml`** — Python (HA 2025.2.0 floor, HA stable, HA dev), Frontend
    (Vitest + coverage), C++ tests (CMake + CTest, both libs).
- **`nightly.yml`** — daily (and `workflow_dispatch`) run of the Python +
    Frontend suites against the **latest** upstream deps (HA stable + dev,
    latest `aioesphomeapi`, frontend deps resolved fresh from `package.json`).
    Catches a breaking upstream release between commits. Separate from
    `tests.yml` so its noise never blocks a PR.
- **`firmware.yml`** — compiles each firmware variant on changes under
    `firmware/`.
- **`hacs.yml`** — HACS integration validation.
- **`hassfest.yml`** — HA integration metadata validation.
- **`codeql.yml`** — CodeQL analysis (Python, JS/TS, C/C++).
- **`pages.yml`** — builds and deploys this docs site to GitHub Pages, and
    stages `fw/` from the GitHub `latest` release. Triggers on push to main
    *and* on `release: released`, so promoting a pre-release to latest
    republishes Pages without needing a fresh tag.
- **`firmware-release.yml`** — on tag push, validates that the manifest,
    `manifest.json`, and `FIRMWARE_VERSION` all agree (via
    `.github/scripts/validate-release.sh`), then compiles the firmware variants
    and uploads ESP Web Tools manifests + binaries as release assets. Publishes
    every release as a **pre-release** (never auto-marked `latest`); promote it
    after testing with `bin/promote.sh <version>`.

______________________________________________________________________

See [Contributing](contributing.md) for how to actually build and test these,
and [Architecture](architecture.md) for the runtime data flow between them.
