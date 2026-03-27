# EPPGridPanel Refactoring Spec

**Status:** Draft — file is still evolving; re-read `eppgrid-panel.ts` before creating an implementation plan.

## Goal

Break the 6000-line monolithic `EPPGridPanel` Lit element into focused sub-components, reactive controllers, and pure-logic modules. The result should be a component tree where each file has a single clear responsibility, can be understood in isolation, and is independently testable.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Splitting strategy | Lit sub-components | Long-term maintainability; clear ownership boundaries |
| State management | Reactive controllers + props down / events up | Controllers for cross-cutting state (device, grid, targets); props/events for component-specific interactions |
| CSS | Shared theme module + co-located component styles | HA theme variables in shared `styles.ts`; component-specific styles in each element |
| Existing tests | Keep as integration tests | Safety net during refactor; they test via `<epp-grid-panel>` which still renders everything |
| New tests | TDD red-green per extracted file | Write unit tests before implementation for each new component/controller/module |

## Architecture

### Controllers (shared state, no DOM)

Controllers are created by the orchestrator and passed to sub-components as properties. They call `this.host.requestUpdate()` when state changes.

#### `DeviceController`
- `devices`, `selectedMac`, `loading`
- Holds `hass` reference
- Manages WS subscriptions (targets, sensors, zones)
- Fires callbacks when target/sensor/zone data arrives

#### `GridStateController`
- `grid` (Uint8Array), `zoneConfigs`, `activeZone`
- `roomWidth`, `roomDepth`, `perspective`
- `furniture`
- `dirty`, `saving`
- Methods: paint cell, add/remove zone, add/remove/update furniture
- Save/load layout via WS
- Template persistence (localStorage)

#### `TargetController`
- `targets`, `rawTargets`
- `sensorState` (occupancy, illuminance, temperature, humidity, CO2, etc.)
- `zoneState` (backend occupancy, target counts, frame count)
- `localZoneState` (frontend zone engine replica output)
- Receives data from `DeviceController` callbacks

### Components

#### `<epp-grid-panel>` — Orchestrator
- **File:** `eppgrid-panel.ts` (dramatically reduced)
- Creates and owns all three controllers
- View routing (`live` | `editor` | `settings` | `wizard`)
- Device selector dropdown
- View tab bar
- Global dialogs (rename, unsaved changes, delete calibration)
- Navigation guards (dirty state, history interception)
- Passes controllers to child components as properties

#### `<epp-wizard>` — Calibration Flow
- **File:** `components/epp-wizard.ts`
- Setup steps: guide, corners, preview
- Corner capture with smoothing and progress bar
- Mini sensor FOV visualization
- Room dimension auto-computation
- Perspective solve and save
- Receives: `DeviceController` (for WS save, raw targets)
- Fires: `calibration-complete` event

#### `<epp-live-view>` — Live Monitoring
- **File:** `components/epp-live-view.ts`
- Composes `<epp-grid>` (read-only mode) and `<epp-live-sidebar>`
- Receives: all three controllers

#### `<epp-editor-view>` — Zone/Furniture Editor
- **File:** `components/epp-editor-view.ts`
- Composes `<epp-grid>` (editable mode), `<epp-zone-sidebar>`, `<epp-furniture-sidebar>`
- Save/cancel button bar
- Template save/load dialogs
- Debug log panels (frontend + backend)
- Receives: all three controllers

#### `<epp-settings-view>` — Device Settings
- **File:** `components/epp-settings-view.ts`
- Accordion panels: detection ranges, sensitivities, reporting
- Environment offset sliders with info tooltips
- Save/cancel button bar
- Receives: `DeviceController`, `GridStateController`

#### `<epp-grid>` — Grid Renderer (shared)
- **File:** `components/epp-grid.ts`
- Renders visible cells with zoom (room bounds)
- Editable vs read-only mode (property)
- Cell painting (mousedown/enter/up) in editable mode
- Target dots overlay
- Sensor FOV wedge (uncalibrated mode)
- Room dimension labels
- Composes `<epp-furniture-overlay>`
- Receives: `GridStateController`, `TargetController`
- Fires: `cell-paint`, `paint-start`, `paint-end` events

#### `<epp-furniture-overlay>` — Furniture Layer
- **File:** `components/epp-furniture-overlay.ts`
- Renders furniture items with SVG/icons
- Drag move, resize handles, rotate handle, delete button
- Pointer event handling (down/move/up)
- Receives: `GridStateController` (furniture list, room bounds)
- Fires: `furniture-move`, `furniture-resize`, `furniture-rotate`, `furniture-delete` events

#### `<epp-zone-sidebar>` — Zone List
- **File:** `components/epp-zone-sidebar.ts`
- Room boundary type controls (type, trigger, renew, timeout, handoff)
- Zone list with color swatches, names, thresholds
- Add/remove zone buttons
- Receives: `GridStateController`, `TargetController` (for live zone state preview)
- Fires: `zone-add`, `zone-remove`, `zone-select`, `zone-config-change` events

#### `<epp-furniture-sidebar>` — Furniture Catalog
- **File:** `components/epp-furniture-sidebar.ts`
- Sticker catalog grid
- Custom icon picker
- Selected furniture info/controls
- Receives: `GridStateController`
- Fires: `furniture-add`, `furniture-add-custom`, `furniture-select` events

#### `<epp-live-sidebar>` — Live Sensor Readings
- **File:** `components/epp-live-sidebar.ts`
- Presence/occupancy status
- Per-zone occupancy and target counts
- Environment sensors (illuminance, temperature, humidity, CO2)
- Expandable sensor info sections
- Receives: `TargetController`, `GridStateController`

### Modules (pure functions)

#### `lib/zone-engine.ts` — Frontend Zone Engine
- Extracted from `_runLocalZoneEngine()` (~270 lines)
- Pure function: takes grid, targets, zone configs, previous state, timestamp
- Returns updated zone state (per-zone occupancy, confirmed targets, pending timers)
- No DOM, no `this` — fully testable in isolation

#### Existing `lib/` modules — unchanged
- `cell-painting.ts`, `config-serialization.ts`, `coordinates.ts`, `furniture.ts`, `grid.ts`, `heatmap.ts`, `perspective.ts`, `room-geometry.ts`, `zone-defaults.ts`

### Shared Styles

#### `styles.ts` — Theme Tokens & Reusable CSS
- HA theme CSS custom properties (`--primary-color`, `--card-background-color`, `--primary-text-color`, `--divider-color`, etc.)
- Reusable CSS fragments exported as `css` tagged templates:
  - Accordion (header, content, chevron animation)
  - Setting controls (label, input, range slider, toggle)
  - Info tooltips
  - Dialog/overlay backdrop
  - Button styles (primary, secondary, danger)
- Each component imports and spreads what it needs into its own `static styles`

### Constants

#### `constants.ts`
- `FLOOR_PLAN_SVGS` — SVG data for furniture types
- `FURNITURE_CATALOG` — sticker definitions
- `CORNER_LABELS`, `CORNER_OFFSET_LABELS`
- `CAPTURE_DURATION_S`
- `TARGET_COLORS`
- `DEBUG_LOG_MAX`
- `FOV_HALF_ANGLE`, `FOV_X_EXTENT`

## File Structure

```
frontend/src/
├── eppgrid-panel.ts                  ← orchestrator (reduced to ~300-400 lines)
├── constants.ts                      ← shared constants
├── styles.ts                         ← HA theme tokens + reusable CSS
├── controllers/
│   ├── device-controller.ts
│   ├── grid-state-controller.ts
│   └── target-controller.ts
├── components/
│   ├── epp-wizard.ts
│   ├── epp-live-view.ts
│   ├── epp-editor-view.ts
│   ├── epp-settings-view.ts
│   ├── epp-grid.ts
│   ├── epp-furniture-overlay.ts
│   ├── epp-zone-sidebar.ts
│   ├── epp-furniture-sidebar.ts
│   └── epp-live-sidebar.ts
├── lib/
│   ├── zone-engine.ts                ← NEW: extracted from panel
│   ├── cell-painting.ts              ← existing
│   ├── config-serialization.ts
│   ├── coordinates.ts
│   ├── furniture.ts
│   ├── grid.ts
│   ├── heatmap.ts
│   ├── perspective.ts
│   ├── room-geometry.ts
│   └── zone-defaults.ts
├── __tests__/
│   ├── panel-*.test.ts               ← existing integration tests (unchanged)
│   ├── controllers/
│   │   ├── device-controller.test.ts
│   │   ├── grid-state-controller.test.ts
│   │   └── target-controller.test.ts
│   ├── components/
│   │   ├── epp-wizard.test.ts
│   │   ├── epp-live-view.test.ts
│   │   ├── epp-editor-view.test.ts
│   │   ├── epp-settings-view.test.ts
│   │   ├── epp-grid.test.ts
│   │   ├── epp-furniture-overlay.test.ts
│   │   ├── epp-zone-sidebar.test.ts
│   │   ├── epp-furniture-sidebar.test.ts
│   │   └── epp-live-sidebar.test.ts
│   └── lib/
│       └── zone-engine.test.ts
├── localize.ts
├── translations/
└── index.ts
```

## Testing Strategy

### Existing Tests
The 17 `panel-*.test.ts` files remain as integration tests. They instantiate `<epp-grid-panel>` which still renders everything via sub-components. These must keep passing throughout the refactor.

### New Tests (TDD)
For each new file, follow the red-green cycle:

1. **Write test** — define expected behavior (rendering, state transitions, events)
2. **Run test** — confirm it fails (red)
3. **Implement** — write the minimum code to pass
4. **Run test** — confirm it passes (green)
5. **Refactor** — clean up while keeping tests green

**Controllers:** Test state mutations, subscription lifecycle, callback firing.
**Components:** Test rendering output with mock controller state, event dispatch on user interaction.
**Zone engine:** Test occupancy transitions, timer logic, edge cases — pure function, no mocking needed.

## Implementation Notes

- Register sub-components with `customElements.define()` in each component file
- The orchestrator imports all component files to trigger registration
- Controllers implement `ReactiveController` interface (`hostConnected`, `hostDisconnected`)
- Sub-components accept controllers via `@property({ attribute: false })`
- Events use `CustomEvent` with typed `detail` payloads
- Localization: pass `_localize` function down as a property or via a controller
