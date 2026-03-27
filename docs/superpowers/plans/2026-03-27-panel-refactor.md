# EPPGridPanel Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break the 6044-line monolithic `eppgrid-panel.ts` into focused sub-components, reactive controllers, and pure-logic modules while keeping all 17 existing integration tests passing throughout.

**Architecture:** Bottom-up extraction: types/constants first, then pure-function zone engine, then reactive controllers for shared state, then leaf Lit components, then composite views, finally reduce the orchestrator. Each task follows TDD red-green: write failing test → implement → verify green → commit.

**Tech Stack:** Lit 3, TypeScript 5, Vitest 4 (happy-dom), Rollup

**Test command:** `cd frontend && npx vitest run`
**Build command:** `cd frontend && npm run build`

---

## Phase 1: Foundation (types, constants, styles)

### Task 1: Extract types to `types.ts`

**Files:**
- Create: `frontend/src/types.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Create `types.ts` with types cut from panel**

Cut lines 70-98 from `eppgrid-panel.ts` (the type/interface definitions) and line 170 (`SetupStep`) into a new file. The panel will re-import them.

```typescript
// frontend/src/types.ts
export type TargetStatus = "active" | "pending" | "inactive";

export interface Target {
	x: number;
	y: number;
	speed: number;
	status: TargetStatus;
	signal: number;
}

export interface RawTarget {
	raw_x: number | null;
	raw_y: number | null;
}

export interface DeviceInfo {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	configured: boolean;
}

export interface WizardCorner {
	raw_x: number;
	raw_y: number;
	offset_side: number;
	offset_fb: number;
}

export type SetupStep = "guide" | "corners" | "preview";
```

- [ ] **Step 2: Update panel imports**

Remove the type definitions from `eppgrid-panel.ts` and add:

```typescript
import type { Target, RawTarget, DeviceInfo, WizardCorner, TargetStatus, SetupStep } from "./types.js";
```

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run`
Expected: All 17 panel tests pass, all lib tests pass.

- [ ] **Step 4: Run build**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```
git add frontend/src/types.ts frontend/src/eppgrid-panel.ts
git commit -m "refactor: extract shared types to types.ts"
```

---

### Task 2: Extract constants to `constants.ts`

**Files:**
- Create: `frontend/src/constants.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Create `constants.ts`**

Move from `eppgrid-panel.ts`:
- `FLOOR_PLAN_SVGS` (lines 103-168)
- `FURNITURE_CATALOG` (lines 172-335)
- `CORNER_LABELS` (lines 337-342)
- `CORNER_OFFSET_LABELS` (lines 343-348)
- `CAPTURE_DURATION_S` (line 351)
- `TARGET_COLORS` (line 354)
- `DEBUG_LOG_MAX = 100` (from the static class property on line 439)
- `FOV_HALF_ANGLE` and `FOV_X_EXTENT` (from static class properties on lines 1647-1648)

```typescript
// frontend/src/constants.ts
import type { FurnitureSticker } from "./lib/furniture.js";
import { MAX_RANGE } from "./lib/grid.js";

export const FLOOR_PLAN_SVGS: Record<string, { viewBox: string; content: string }> = {
	// ... (exact content from lines 103-168)
};

export const FURNITURE_CATALOG: FurnitureSticker[] = [
	// ... (exact content from lines 172-335)
];

export const CORNER_LABELS = [
	"corners.front_left",
	"corners.front_right",
	"corners.back_right",
	"corners.back_left",
];

export const CORNER_OFFSET_LABELS: [string, string][] = [
	["corners.left_wall", "corners.front_wall"],
	["corners.right_wall", "corners.front_wall"],
	["corners.right_wall", "corners.back_wall"],
	["corners.left_wall", "corners.back_wall"],
];

export const CAPTURE_DURATION_S = 5;

export const TARGET_COLORS = ["#2196F3", "#FF5722", "#4CAF50"];

export const DEBUG_LOG_MAX = 100;

export const FOV_HALF_ANGLE = Math.PI / 3;
export const FOV_X_EXTENT = MAX_RANGE * Math.sin(Math.PI / 3);
```

- [ ] **Step 2: Update panel imports**

Remove the constant definitions from `eppgrid-panel.ts`. Replace the `static readonly` references (`EPPGridPanel._DEBUG_LOG_MAX`, `EPPGridPanel.FOV_HALF_ANGLE`, `EPPGridPanel.FOV_X_EXTENT`) with the imported constants. Add:

```typescript
import {
	FLOOR_PLAN_SVGS,
	FURNITURE_CATALOG,
	CORNER_LABELS,
	CORNER_OFFSET_LABELS,
	CAPTURE_DURATION_S,
	TARGET_COLORS,
	DEBUG_LOG_MAX,
	FOV_HALF_ANGLE,
	FOV_X_EXTENT,
} from "./constants.js";
```

- [ ] **Step 3: Run tests and build**

Run: `cd frontend && npx vitest run && npm run build`
Expected: All pass.

- [ ] **Step 4: Commit**

```
git add frontend/src/constants.ts frontend/src/eppgrid-panel.ts
git commit -m "refactor: extract constants to constants.ts"
```

---

### Task 3: Extract shared styles to `styles.ts`

**Files:**
- Create: `frontend/src/styles.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Create `styles.ts` with reusable CSS fragments**

Extract CSS that will be shared across multiple components. Each fragment is a `css` tagged template. Components will spread these into their own `static styles` arrays.

```typescript
// frontend/src/styles.ts
import { css } from "lit";

/** HA theme-aware host defaults */
export const hostStyles = css`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--paper-font-body1_-_font-family, "Roboto", sans-serif);
  }
`;

/** Panel container */
export const panelStyles = css`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }
`;

/** Dialog overlay + card */
export const dialogStyles = css`
  .template-dialog {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .template-dialog-card {
    background: var(--card-background-color, #fff);
    border-radius: 16px;
    padding: 24px;
    min-width: 320px;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }
  .template-dialog-card h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }
  .template-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
`;

/** Wizard buttons (primary + back) */
export const buttonStyles = css`
  .wizard-btn {
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  .wizard-btn-primary {
    background: var(--primary-color, #03a9f4);
    color: #fff;
  }
  .wizard-btn-primary:hover { filter: brightness(1.1); }
  .wizard-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .wizard-btn-back {
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color, #212121);
  }
  .wizard-btn-back:hover {
    background: var(--divider-color, #e0e0e0);
  }
`;

/** Accordion (settings) */
export const accordionStyles = css`
  .accordion {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin-bottom: 8px;
    overflow: hidden;
    background: var(--card-background-color, #fff);
  }
  .accordion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    cursor: pointer;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    font: inherit;
    color: var(--primary-text-color, #212121);
  }
  .accordion-title { flex: 1; font-weight: 500; }
  .accordion-chevron {
    transition: transform 0.2s;
    --mdc-icon-size: 20px;
  }
  .accordion-chevron[data-open] { transform: rotate(180deg); }
  .accordion-body { padding: 0 16px 16px; }
`;

/** Setting controls (label + range/toggle rows) */
export const settingStyles = css`
  .setting-group {
    margin-bottom: 16px;
  }
  .setting-group h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 500;
  }
  .setting-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    font-size: 13px;
  }
  .setting-row label { flex: 1; }
  .setting-input-unit {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .setting-range { width: 120px; }
  .setting-value {
    min-width: 28px;
    text-align: right;
    font-weight: 500;
  }
  .setting-unit {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    min-width: 20px;
  }
`;

/** Toggle switch */
export const toggleStyles = css`
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--divider-color, #ccc);
    border-radius: 20px;
    transition: 0.2s;
  }
  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 16px; width: 16px;
    left: 2px; bottom: 2px;
    background: #fff;
    border-radius: 50%;
    transition: 0.2s;
  }
  .toggle-switch input:checked + .toggle-slider {
    background: var(--primary-color, #03a9f4);
  }
  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(16px);
  }
`;

/** Info tooltip */
export const tooltipStyles = css`
  .setting-info {
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    --mdc-icon-size: 16px;
    color: var(--secondary-text-color, #999);
  }
  .setting-info-tooltip {
    display: none;
    position: fixed;
    width: 240px;
    padding: 10px 14px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    font-size: 13px;
    line-height: 1.4;
    z-index: 200;
  }
`;
```

- [ ] **Step 2: Update panel to import and spread shared styles**

In `eppgrid-panel.ts`, import the style fragments and change `static styles` to an array that spreads the shared ones plus the panel-specific remainder:

```typescript
import {
	hostStyles, panelStyles, dialogStyles, buttonStyles,
	accordionStyles, settingStyles, toggleStyles, tooltipStyles,
} from "./styles.js";

// In the class:
static styles = [
	hostStyles, panelStyles, dialogStyles, buttonStyles,
	accordionStyles, settingStyles, toggleStyles, tooltipStyles,
	css`
		/* ... remaining panel-specific styles ... */
	`,
];
```

Remove the duplicated CSS rules from the panel's inline `css` block (the ones that now live in `styles.ts`).

- [ ] **Step 3: Run tests and build**

Run: `cd frontend && npx vitest run && npm run build`
Expected: All pass.

- [ ] **Step 4: Commit**

```
git add frontend/src/styles.ts frontend/src/eppgrid-panel.ts
git commit -m "refactor: extract shared styles to styles.ts"
```

---

## Phase 2: Zone Engine (pure function extraction)

### Task 4: Write zone engine tests

**Files:**
- Create: `frontend/src/lib/__tests__/zone-engine.test.ts`

The zone engine is currently `_runLocalZoneEngine()` (lines 4878-5151) — a ~270 line method with mutable state. We'll extract it as a pure function that takes all inputs and returns outputs.

- [ ] **Step 1: Write failing tests for zone engine**

```typescript
// frontend/src/lib/__tests__/zone-engine.test.ts
import { describe, expect, it } from "vitest";
import {
	runLocalZoneEngine,
	createZoneEngineState,
	type ZoneEngineState,
	type ZoneEngineResult,
} from "../zone-engine.js";
import { GRID_COLS, GRID_ROWS, GRID_CELL_COUNT } from "../grid.js";
import type { ZoneConfig } from "../zone-defaults.js";

function makeGrid(): Uint8Array {
	// Grid with all cells as room (zone 0, inside=1): value = 0x80
	const grid = new Uint8Array(GRID_CELL_COUNT);
	for (let r = 10; r < 20; r++) {
		for (let c = 40; c < 56; c++) {
			grid[r * GRID_COLS + c] = 0x80; // inside bit set, zone 0
		}
	}
	return grid;
}

function makeTarget(x: number, y: number, signal: number) {
	return { x, y, speed: 0, status: "active" as const, signal };
}

describe("createZoneEngineState", () => {
	it("returns initial empty state", () => {
		const state = createZoneEngineState();
		expect(state.localZoneState).toBeInstanceOf(Map);
		expect(state.localZoneState.size).toBe(0);
		expect(state.targetPrev).toEqual([null, null, null]);
		expect(state.targetGateCount).toEqual([0, 0, 0]);
		expect(state.targetPrevXY).toEqual([null, null, null]);
	});
});

describe("runLocalZoneEngine", () => {
	it("returns empty occupancy for empty grid", () => {
		const state = createZoneEngineState();
		const result = runLocalZoneEngine({
			targets: [],
			grid: new Uint8Array(GRID_CELL_COUNT),
			zoneConfigs: new Array(7).fill(null),
			roomType: "normal",
			roomTrigger: 5,
			roomRenew: 3,
			roomTimeout: 10,
			roomHandoffTimeout: 3,
			roomEntryPoint: false,
			roomWidth: 5000,
			roomDepth: 5000,
			state,
		});
		expect(result.occupancy).toEqual({});
		expect(result.targets).toEqual([]);
	});

	it("detects occupancy when target signal meets trigger threshold", () => {
		const grid = makeGrid();
		const state = createZoneEngineState();
		// Target at center of room cells — needs to map to inside cell
		const target = makeTarget(2400, 1500, 7);
		const result = runLocalZoneEngine({
			targets: [target],
			grid,
			zoneConfigs: new Array(7).fill(null),
			roomType: "normal",
			roomTrigger: 5,
			roomRenew: 3,
			roomTimeout: 10,
			roomHandoffTimeout: 3,
			roomEntryPoint: false,
			roomWidth: 5000,
			roomDepth: 5000,
			state,
		});
		expect(result.occupancy[0]).toBe(true);
		expect(result.targets[0].status).toBe("active");
	});

	it("does not detect occupancy when signal is below trigger", () => {
		const grid = makeGrid();
		const state = createZoneEngineState();
		const target = makeTarget(2400, 1500, 2); // signal below default trigger of 5
		const result = runLocalZoneEngine({
			targets: [target],
			grid,
			zoneConfigs: new Array(7).fill(null),
			roomType: "normal",
			roomTrigger: 5,
			roomRenew: 3,
			roomTimeout: 10,
			roomHandoffTimeout: 3,
			roomEntryPoint: false,
			roomWidth: 5000,
			roomDepth: 5000,
			state,
		});
		expect(result.occupancy[0]).toBeFalsy();
	});

	it("transitions to pending after target disappears", () => {
		const grid = makeGrid();
		const state = createZoneEngineState();
		const params = {
			grid,
			zoneConfigs: new Array(7).fill(null) as (ZoneConfig | null)[],
			roomType: "normal" as const,
			roomTrigger: 5,
			roomRenew: 3,
			roomTimeout: 10,
			roomHandoffTimeout: 3,
			roomEntryPoint: false,
			roomWidth: 5000,
			roomDepth: 5000,
			state,
		};

		// First tick: target present with good signal
		runLocalZoneEngine({ ...params, targets: [makeTarget(2400, 1500, 7)] });
		expect(state.localZoneState.get(0)?.occupied).toBe(true);

		// Second tick: target gone
		const result = runLocalZoneEngine({ ...params, targets: [] });
		// Zone should still be occupied (pending timeout)
		expect(result.occupancy[0]).toBe(true);
		expect(state.localZoneState.get(0)?.pendingSince).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/__tests__/zone-engine.test.ts`
Expected: FAIL — module `../zone-engine.js` not found.

- [ ] **Step 3: Commit failing test**

```
git add frontend/src/lib/__tests__/zone-engine.test.ts
git commit -m "test: add failing zone engine tests (red)"
```

---

### Task 5: Implement zone engine

**Files:**
- Create: `frontend/src/lib/zone-engine.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

- [ ] **Step 1: Create `zone-engine.ts`**

Extract the logic from `_runLocalZoneEngine()` (lines 4878-5151) into a pure function. The mutable state (`_localZoneState`, `_targetPrev`, `_targetGateCount`, `_targetPrevXY`) becomes a `ZoneEngineState` object passed in and mutated by the function.

```typescript
// frontend/src/lib/zone-engine.ts
import type { Target } from "../types.js";
import { cellIsInside, cellZone, GRID_CELL_COUNT, GRID_COLS, GRID_ROWS } from "./grid.js";
import { mapTargetToGridCell } from "./coordinates.js";
import { getZoneThresholds, type ZoneConfig } from "./zone-defaults.js";

export interface ZoneEngineState {
	localZoneState: Map<number, {
		occupied: boolean;
		pendingSince: number | null;
		confirmedTargets: Set<number>;
	}>;
	targetPrev: ({ col: number; row: number } | null)[];
	targetGateCount: number[];
	targetPrevXY: ({ x: number; y: number } | null)[];
}

export interface ZoneEngineResult {
	occupancy: Record<number, boolean>;
	targets: { status: "active" | "pending" | "inactive" }[];
}

export interface ZoneEngineParams {
	targets: Target[];
	grid: Uint8Array;
	zoneConfigs: (ZoneConfig | null)[];
	roomType: ZoneConfig["type"];
	roomTrigger: number;
	roomRenew: number;
	roomTimeout: number;
	roomHandoffTimeout: number;
	roomEntryPoint: boolean;
	roomWidth: number;
	roomDepth: number;
	state: ZoneEngineState;
	now?: number;
}

export function createZoneEngineState(): ZoneEngineState {
	return {
		localZoneState: new Map(),
		targetPrev: [null, null, null],
		targetGateCount: [0, 0, 0],
		targetPrevXY: [null, null, null],
	};
}

export function runLocalZoneEngine(params: ZoneEngineParams): ZoneEngineResult {
	const {
		targets, grid, zoneConfigs,
		roomType, roomTrigger, roomRenew, roomTimeout, roomHandoffTimeout, roomEntryPoint,
		roomWidth, roomDepth, state,
	} = params;
	const now = params.now ?? Date.now() / 1000;
	const MAX_MOVEMENT_CELLS = 5;
	const MAX_TARGETS = 3;

	const zoneConfirmed: Map<number, boolean> = new Map();
	const targetSignal: Map<number, number> = new Map();
	const targetZonePrev: (number | null)[] = [null, null, null];
	const targetZoneCurr: (number | null)[] = [null, null, null];

	for (let i = 0; i < MAX_TARGETS && i < targets.length; i++) {
		const t = targets[i];
		if (t.x == null || t.y == null) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		const signal = t.signal;
		if (signal <= 0) continue;

		targetSignal.set(i, signal);

		const pos = mapTargetToGridCell(t.x, t.y, roomWidth, roomDepth);
		if (!pos) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const col = Math.floor(pos.col);
		const row = Math.floor(pos.row);
		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const idx = row * GRID_COLS + col;
		const cellVal = grid[idx];
		if (!cellIsInside(cellVal)) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		const zid = cellZone(cellVal);
		targetZoneCurr[i] = zid;

		const prev = state.targetPrev[i];
		if (prev !== null) {
			const prevIdx = prev.row * GRID_COLS + prev.col;
			if (prevIdx >= 0 && prevIdx < GRID_CELL_COUNT && cellIsInside(grid[prevIdx])) {
				targetZonePrev[i] = cellZone(grid[prevIdx]);
			}
		}

		state.targetPrevXY[i] = { x: t.x, y: t.y };

		let continuous = false;
		if (prev !== null) {
			const dist = Math.max(Math.abs(col - prev.col), Math.abs(row - prev.row));
			continuous = dist <= MAX_MOVEMENT_CELLS;
		}

		const thresholds = getZoneThresholds(
			zid, zoneConfigs,
			roomType, roomTrigger, roomRenew, roomTimeout, roomHandoffTimeout, roomEntryPoint,
		);
		const st = state.localZoneState.get(zid);
		const isOccupied = st?.occupied ?? false;
		const isClear = !isOccupied;

		const baseTrigger = isClear ? thresholds.trigger : thresholds.renew;
		const needsGating = !thresholds.entryPoint && !continuous;

		if (needsGating && isClear) {
			const gatedThresh = Math.min(baseTrigger + 2, 8);
			if (signal >= gatedThresh) {
				state.targetGateCount[i]++;
				if (state.targetGateCount[i] >= 2) {
					zoneConfirmed.set(zid, true);
					if (st) st.confirmedTargets.add(i);
					state.targetPrev[i] = { col, row };
					state.targetGateCount[i] = 0;
				} else {
					state.targetPrev[i] = { col, row };
				}
			} else {
				state.targetPrev[i] = null;
				state.targetGateCount[i] = 0;
			}
		} else {
			if (signal >= baseTrigger) {
				zoneConfirmed.set(zid, true);
				if (st) st.confirmedTargets.add(i);
				state.targetPrev[i] = { col, row };
				state.targetGateCount[i] = 0;
			} else {
				state.targetPrev[i] = { col, row };
			}
		}
	}

	// Handoff detection
	for (let i = 0; i < MAX_TARGETS; i++) {
		const prevZid = targetZonePrev[i];
		const currZid = targetZoneCurr[i];
		if (prevZid === null || currZid === null || prevZid === currZid) continue;

		const srcSt = state.localZoneState.get(prevZid);
		if (!srcSt) continue;
		srcSt.confirmedTargets.delete(i);
		if (srcSt.confirmedTargets.size === 0 && srcSt.occupied && srcSt.pendingSince === null) {
			const th = getZoneThresholds(
				prevZid, zoneConfigs,
				roomType, roomTrigger, roomRenew, roomTimeout, roomHandoffTimeout, roomEntryPoint,
			);
			srcSt.pendingSince = now - (th.timeout - th.handoffTimeout);
		}
	}

	// State machine per zone
	const occupancy: Record<number, boolean> = {};
	const allZoneIds = new Set<number>();
	for (let i = 0; i < grid.length; i++) {
		if (cellIsInside(grid[i])) allZoneIds.add(cellZone(grid[i]));
	}
	for (const zid of allZoneIds) {
		let st = state.localZoneState.get(zid);
		if (!st) {
			st = { occupied: false, pendingSince: null, confirmedTargets: new Set() };
			state.localZoneState.set(zid, st);
		}
		const th = getZoneThresholds(
			zid, zoneConfigs,
			roomType, roomTrigger, roomRenew, roomTimeout, roomHandoffTimeout, roomEntryPoint,
		);
		const confirmed = zoneConfirmed.get(zid) ?? false;

		if (!st.occupied) {
			if (confirmed) {
				st.occupied = true;
				st.pendingSince = null;
			}
		} else if (st.pendingSince === null) {
			if (!confirmed) {
				st.pendingSince = now;
			}
		} else {
			if (confirmed) {
				st.pendingSince = null;
			} else {
				if (now - st.pendingSince >= th.timeout) {
					st.occupied = false;
					st.pendingSince = null;
					st.confirmedTargets.clear();
				}
			}
		}
		occupancy[zid] = st.occupied;
	}

	// activeTargets = sensor is tracking
	const activeTargets = new Set<number>();
	for (let i = 0; i < MAX_TARGETS && i < targets.length; i++) {
		if (targets[i].x != null && targets[i].y != null) {
			activeTargets.add(i);
		}
	}

	// Clean up stale confirmed targets
	for (let i = 0; i < MAX_TARGETS && i < targets.length; i++) {
		if (!activeTargets.has(i)) {
			for (const st of state.localZoneState.values()) {
				if (st.pendingSince === null) {
					st.confirmedTargets.delete(i);
				}
			}
		}
	}

	// Build per-target status
	const targetResults: { status: "active" | "pending" | "inactive" }[] = [];
	for (let i = 0; i < MAX_TARGETS && i < targets.length; i++) {
		const sig = targetSignal.get(i) ?? 0;
		const inRoom = targetZoneCurr[i] !== null;
		if (activeTargets.has(i) && sig > 0 && inRoom) {
			targetResults.push({ status: "active" });
		} else {
			let isPending = false;
			if (!activeTargets.has(i) || !inRoom) {
				for (const [, st] of state.localZoneState) {
					if (st.occupied && st.pendingSince !== null && st.confirmedTargets.has(i)) {
						isPending = true;
						break;
					}
				}
			}
			targetResults.push({ status: isPending ? "pending" : "inactive" });
		}
	}

	return { occupancy, targets: targetResults };
}
```

- [ ] **Step 2: Run zone engine tests**

Run: `cd frontend && npx vitest run src/lib/__tests__/zone-engine.test.ts`
Expected: All PASS (green).

- [ ] **Step 3: Wire panel to use extracted zone engine**

In `eppgrid-panel.ts`:
1. Import `runLocalZoneEngine`, `createZoneEngineState`, `type ZoneEngineState` from `./lib/zone-engine.js`
2. Replace the private fields `_localZoneState`, `_targetPrev`, `_targetGateCount`, `_targetPrevXY` with a single `private _zoneEngineState: ZoneEngineState = createZoneEngineState();`
3. Replace the body of `_runLocalZoneEngine()` with a call to the extracted function:

```typescript
private _runLocalZoneEngine(): ZoneEngineResult {
	return runLocalZoneEngine({
		targets: this._targets,
		grid: this._grid,
		zoneConfigs: this._zoneConfigs,
		roomType: this._roomType,
		roomTrigger: this._roomTrigger,
		roomRenew: this._roomRenew,
		roomTimeout: this._roomTimeout,
		roomHandoffTimeout: this._roomHandoffTimeout,
		roomEntryPoint: this._roomEntryPoint,
		roomWidth: this._roomWidth,
		roomDepth: this._roomDepth,
		state: this._zoneEngineState,
	});
}
```

4. Update `_renderVisibleCells` and `_renderLiveGrid` to read `_zoneEngineState.targetPrevXY` instead of `this._targetPrevXY`.

- [ ] **Step 4: Run all tests and build**

Run: `cd frontend && npx vitest run && npm run build`
Expected: All pass — both new zone engine tests and existing integration tests.

- [ ] **Step 5: Commit**

```
git add frontend/src/lib/zone-engine.ts frontend/src/lib/__tests__/zone-engine.test.ts frontend/src/eppgrid-panel.ts
git commit -m "refactor: extract zone engine to pure function with TDD tests"
```

---

## Phase 3: Controllers

### Task 6: DeviceController

**Files:**
- Create: `frontend/src/controllers/device-controller.ts`
- Create: `frontend/src/__tests__/controllers/device-controller.test.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

The DeviceController manages: `devices`, `selectedMac`, `loading`, `hass`, and the WS subscriptions (`_unsubDevice`, `_unsubTargets`, `_unsubDisplay`). It provides callbacks for when target/sensor/zone data arrives.

- [ ] **Step 1: Write failing DeviceController tests**

```typescript
// frontend/src/__tests__/controllers/device-controller.test.ts
import { describe, expect, it, vi } from "vitest";
import { DeviceController } from "../../controllers/device-controller.js";

// Minimal ReactiveControllerHost mock
function mockHost() {
	return {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

// Minimal hass mock
function mockHass(devices: any[] = []) {
	return {
		callWS: vi.fn().mockResolvedValue({ devices }),
		connection: {
			subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
		},
		locale: { language: "en" },
	};
}

describe("DeviceController", () => {
	it("starts in loading state with empty devices", () => {
		const ctrl = new DeviceController(mockHost());
		expect(ctrl.devices).toEqual([]);
		expect(ctrl.selectedMac).toBe("");
		expect(ctrl.loading).toBe(true);
	});

	it("loadDevices populates device list", async () => {
		const host = mockHost();
		const ctrl = new DeviceController(host);
		const hass = mockHass([
			{ mac: "aa:bb", name: "Sensor 1", host: null, available: true, configured: true },
		]);
		ctrl.hass = hass;
		await ctrl.loadDevices();
		expect(ctrl.devices).toHaveLength(1);
		expect(ctrl.devices[0].mac).toBe("aa:bb");
		expect(ctrl.selectedMac).toBe("aa:bb");
		expect(host.requestUpdate).toHaveBeenCalled();
	});

	it("closeSession unsubscribes all", async () => {
		const host = mockHost();
		const ctrl = new DeviceController(host);
		const unsub = vi.fn();
		const hass = mockHass();
		hass.connection.subscribeMessage.mockResolvedValue(unsub);
		ctrl.hass = hass;
		await ctrl.openSession("aa:bb");
		ctrl.closeSession();
		expect(unsub).toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/controllers/device-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement DeviceController**

```typescript
// frontend/src/controllers/device-controller.ts
import type { ReactiveControllerHost, ReactiveController } from "lit";
import type { DeviceInfo, Target, RawTarget } from "../types.js";
import { DEBUG_LOG_MAX } from "../constants.js";

export interface TargetData {
	targets: Target[];
	sensors: {
		occupancy: boolean;
		static_presence: boolean;
		motion_presence: boolean;
		target_presence: boolean;
		illuminance: number | null;
		temperature: number | null;
		humidity: number | null;
		co2: number | null;
	};
	zones: {
		occupancy: Record<number, boolean>;
		target_counts: Record<number, number>;
		frame_count: number;
		debug_log?: string;
	};
}

export type TargetCallback = (data: TargetData) => void;
export type RawTargetCallback = (targets: RawTarget[]) => void;

export class DeviceController implements ReactiveController {
	host: ReactiveControllerHost;
	devices: DeviceInfo[] = [];
	selectedMac = "";
	loading = true;
	hass: any = null;

	private _unsubDevice?: () => void;
	private _unsubTargets?: () => void;
	private _unsubDisplay?: () => void;
	private _onTargetData?: TargetCallback;
	private _onRawTargetData?: RawTargetCallback;

	constructor(host: ReactiveControllerHost) {
		this.host = host;
		(host as any).addController?.(this);
	}

	hostConnected() {}

	hostDisconnected() {
		this.closeSession();
	}

	setCallbacks(onTarget: TargetCallback, onRaw: RawTargetCallback) {
		this._onTargetData = onTarget;
		this._onRawTargetData = onRaw;
	}

	async loadDevices(): Promise<void> {
		if (!this.hass) return;
		this.loading = true;
		this.host.requestUpdate();
		try {
			const result = await this.hass.callWS({ type: "eppgrid/list_devices" });
			this.devices = ((result as any).devices as DeviceInfo[]).sort((a, b) =>
				(a.name || "").localeCompare(b.name || ""),
			);
		} catch {
			this.devices = [];
			this.loading = false;
			this.host.requestUpdate();
			return;
		}

		const stored = localStorage.getItem("epp_selected_mac");
		const match = stored && this.devices.find((d) => d.mac === stored);
		this.selectedMac = match ? stored! : (this.devices[0]?.mac ?? "");
		this.loading = false;
		this.host.requestUpdate();
	}

	async loadDeviceConfig(mac: string): Promise<any> {
		if (!this.hass) return null;
		try {
			const result = await this.hass.callWS({ type: "eppgrid/get_config", mac });
			return (result as any).config;
		} catch {
			return null;
		}
	}

	async openSession(mac: string): Promise<void> {
		this.closeSession();
		if (!this.hass || !mac) return;
		try {
			this._unsubDevice = await this.hass.connection.subscribeMessage(
				() => {},
				{ type: "eppgrid/subscribe_device", mac },
			);
		} catch (e) {
			console.warn("Failed to open device session:", e);
		}
	}

	subscribeTargets(mac: string): void {
		this._unsubscribeDisplay();
		if (this._unsubTargets) {
			try { this._unsubTargets(); } catch { /* stale */ }
			this._unsubTargets = undefined;
		}
		if (!this.hass || !mac) return;

		this.hass.connection
			.subscribeMessage(
				(event: any) => {
					if (this._onTargetData) {
						this._onTargetData({
							targets: (event.targets || []).map((t: any) => ({
								x: t.x, y: t.y, speed: 0,
								status: t.status ?? "inactive",
								signal: t.signal ?? 0,
							})),
							sensors: {
								occupancy: event.sensors?.occupancy ?? false,
								static_presence: event.sensors?.static_presence ?? false,
								motion_presence: event.sensors?.motion_presence ?? false,
								target_presence: event.sensors?.target_presence ?? false,
								illuminance: event.sensors?.illuminance ?? null,
								temperature: event.sensors?.temperature ?? null,
								humidity: event.sensors?.humidity ?? null,
								co2: event.sensors?.co2 ?? null,
							},
							zones: {
								occupancy: event.zones?.occupancy ?? {},
								target_counts: event.zones?.target_counts ?? {},
								frame_count: event.zones?.frame_count ?? 0,
								debug_log: event.zones?.debug_log,
							},
						});
					}
				},
				{ type: "eppgrid/subscribe_grid_targets", mac },
			)
			.then((unsub: () => void) => { this._unsubTargets = unsub; });

		this._subscribeDisplay(mac);
	}

	private _subscribeDisplay(mac: string): void {
		this._unsubscribeDisplay();
		if (!this.hass || !mac) return;

		this.hass.connection
			.subscribeMessage(
				(event: any) => {
					if (this._onRawTargetData) {
						this._onRawTargetData(
							(event.targets || []).map((t: any) => ({
								raw_x: t.raw_x, raw_y: t.raw_y,
							})),
						);
					}
				},
				{ type: "eppgrid/subscribe_raw_targets", mac },
			)
			.then((unsub: () => void) => { this._unsubDisplay = unsub; });
	}

	private _unsubscribeDisplay(): void {
		if (this._unsubDisplay) {
			try { this._unsubDisplay(); } catch { /* stale */ }
			this._unsubDisplay = undefined;
		}
	}

	closeSession(): void {
		this._unsubscribeDisplay();
		if (this._unsubTargets) {
			try { this._unsubTargets(); } catch { /* stale */ }
			this._unsubTargets = undefined;
		}
		if (this._unsubDevice) {
			try { this._unsubDevice(); } catch { /* stale */ }
			this._unsubDevice = undefined;
		}
	}

	get hasSession(): boolean {
		return this._unsubDevice !== undefined;
	}

	async selectDevice(mac: string): Promise<any> {
		this.closeSession();
		this.selectedMac = mac;
		localStorage.setItem("epp_selected_mac", mac);
		const config = await this.loadDeviceConfig(mac);
		await this.openSession(mac);
		if (this.hasSession) {
			this.subscribeTargets(mac);
		}
		this.host.requestUpdate();
		return config;
	}
}
```

- [ ] **Step 4: Run controller tests**

Run: `cd frontend && npx vitest run src/__tests__/controllers/device-controller.test.ts`
Expected: All PASS.

- [ ] **Step 5: Wire panel to use DeviceController**

In `eppgrid-panel.ts`:
1. Import and create `DeviceController` in the class
2. Replace `_devices`, `_selectedMac`, `_loading` with controller properties
3. Replace `_initialize`, `_loadDevices`, `_loadDeviceConfig`, `_openDeviceSession`, `_closeDeviceSession`, `_subscribeTargets`, `_unsubscribeTargets`, `_subscribeDisplay`, `_unsubscribeDisplay` with controller method calls
4. Set up target/raw-target callbacks to update the panel's `@state` properties

This is a large wiring step. The key is to delegate to the controller while keeping the panel's render methods working by reading from `this._deviceCtrl.devices` etc.

- [ ] **Step 6: Run all tests and build**

Run: `cd frontend && npx vitest run && npm run build`
Expected: All pass.

- [ ] **Step 7: Commit**

```
git add frontend/src/controllers/device-controller.ts frontend/src/__tests__/controllers/device-controller.test.ts frontend/src/eppgrid-panel.ts
git commit -m "refactor: extract DeviceController with TDD tests"
```

---

### Task 7: GridStateController

**Files:**
- Create: `frontend/src/controllers/grid-state-controller.ts`
- Create: `frontend/src/__tests__/controllers/grid-state-controller.test.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

Manages: `grid`, `zoneConfigs`, `activeZone`, `roomWidth`, `roomDepth`, `perspective`, `furniture`, `dirty`, `saving`, and room threshold config (`roomType`, `roomTrigger`, `roomRenew`, `roomTimeout`, `roomHandoffTimeout`, `roomEntryPoint`). Provides methods for paint, zone add/remove, furniture CRUD, template save/load.

Follow the same pattern as Task 6:
1. Write failing tests for state mutations (paint cell, add zone, remove zone, add furniture, save/load template)
2. Implement the controller
3. Wire the panel to delegate to the controller
4. Run all tests + build
5. Commit

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Run tests — verify red**
- [ ] **Step 3: Implement GridStateController**
- [ ] **Step 4: Run controller tests — verify green**
- [ ] **Step 5: Wire panel to use GridStateController**
- [ ] **Step 6: Run all tests and build — verify green**
- [ ] **Step 7: Commit**

```
git commit -m "refactor: extract GridStateController with TDD tests"
```

---

### Task 8: TargetController

**Files:**
- Create: `frontend/src/controllers/target-controller.ts`
- Create: `frontend/src/__tests__/controllers/target-controller.test.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

Manages: `targets`, `rawTargets`, `sensorState`, `zoneState`, `zoneEngineState` (the zone engine's mutable state), debug log lines. Receives data from DeviceController callbacks, runs zone engine, emits updated state.

Follow the same pattern:
1. Write failing tests
2. Implement
3. Wire panel
4. Verify all tests pass
5. Commit

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Run tests — verify red**
- [ ] **Step 3: Implement TargetController**
- [ ] **Step 4: Run controller tests — verify green**
- [ ] **Step 5: Wire panel to use TargetController**
- [ ] **Step 6: Run all tests and build — verify green**
- [ ] **Step 7: Commit**

```
git commit -m "refactor: extract TargetController with TDD tests"
```

---

## Phase 4: Leaf Components

Each component extraction follows the same pattern:
1. Write test that the custom element can be created and renders expected structure
2. Create the component file — move the render method and its styles from the panel
3. Update the panel to use `<epp-xyz>` instead of calling `this._renderXyz()`
4. Verify all tests pass
5. Commit

### Task 9: `<epp-live-sidebar>`

**Files:**
- Create: `frontend/src/components/epp-live-sidebar.ts`
- Create: `frontend/src/__tests__/components/epp-live-sidebar.test.ts`
- Modify: `frontend/src/eppgrid-panel.ts`

Most self-contained component — pure display, no user mutations. Takes `sensorState`, `zoneState`, `zoneConfigs`, `perspective`, and `localize` as properties, fires `view-change` event when user clicks zone editing link.

- [ ] **Step 1: Write failing test**

```typescript
// frontend/src/__tests__/components/epp-live-sidebar.test.ts
import { describe, expect, it } from "vitest";
import "../../components/epp-live-sidebar.js";

describe("epp-live-sidebar", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-live-sidebar")).toBeDefined();
	});

	it("can be created", () => {
		const el = document.createElement("epp-live-sidebar");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders presence section", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: true, static_presence: false,
			motion_presence: false, target_presence: false,
			illuminance: null, temperature: null, humidity: null, co2: null,
		};
		el.zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
		el.zoneConfigs = new Array(7).fill(null);
		el.perspective = null;
		el.localize = (k: string) => k;
		const result = el.render();
		expect(result).toBeDefined();
	});
});
```

- [ ] **Step 2: Run test — verify red**
- [ ] **Step 3: Implement component — move `_renderLiveSidebar()` and its styles**
- [ ] **Step 4: Update panel to use `<epp-live-sidebar>` — pass props, listen for events**
- [ ] **Step 5: Run all tests and build — verify green**
- [ ] **Step 6: Commit**

```
git commit -m "refactor: extract epp-live-sidebar component"
```

---

### Task 10: `<epp-zone-sidebar>`

Extract `_renderZoneSidebar()`, `_renderBoundaryTypeControls()`, `_renderZoneTypeControls()` and their styles. Takes `GridStateController` and `TargetController` as properties. Fires events for zone add/remove/select/config changes.

- [ ] **Step 1-6:** Same TDD pattern as Task 9.

```
git commit -m "refactor: extract epp-zone-sidebar component"
```

---

### Task 11: `<epp-furniture-sidebar>`

Extract `_renderFurnitureSidebar()` and its styles. Takes furniture list, selected ID, `hass`, `localize` as properties. Fires events for add/remove/select, custom icon add.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-furniture-sidebar component"
```

---

### Task 12: `<epp-furniture-overlay>`

Extract `_renderFurnitureOverlay()` and furniture interaction handlers (`_onFurniturePointerDown`, `_onFurnitureDrag`). Takes furniture list, room dimensions, cell size, grid bounds, selected ID, interactive flag. Fires move/resize/rotate/delete/select events.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-furniture-overlay component"
```

---

### Task 13: `<epp-grid>`

Extract `_renderVisibleCells()`, `_renderTargetDots()`, `_renderGridDimensions()`, `_renderUncalibratedFov()` and grid cell painting handlers. Takes grid state, target state, editable flag. Fires cell paint events.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-grid component"
```

---

### Task 14: `<epp-settings-view>`

Extract `_renderSettings()`, `_renderSettingsSection()`, `_renderDetectionRanges()`, `_renderSensitivities()`, `_renderReporting()`, `_renderEnvOffset()`, and accordion/settings styles. Takes device controller and grid state controller. Fires save/cancel events.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-settings-view component"
```

---

### Task 15: `<epp-wizard>`

Extract `_renderWizard()`, `_renderWizardGuide()`, `_renderWizardCorners()`, `_renderMiniSensorView()`, `_renderNeedsCalibration()` and all wizard state/logic (`_wizardStartCapture`, `_wizardCancelCapture`, `_computeWizardPerspective`, `_wizardFinish`, etc.). Takes device controller (for WS save and raw targets). Fires `calibration-complete` event.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-wizard component"
```

---

## Phase 5: Composite Components & Orchestrator

### Task 16: `<epp-live-view>`

Composes `<epp-grid>` (read-only) + `<epp-live-sidebar>` + backend debug log + menu dropdown. Takes all three controllers.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-live-view component"
```

---

### Task 17: `<epp-editor-view>`

Composes `<epp-grid>` (editable) + `<epp-zone-sidebar>` / `<epp-furniture-sidebar>` (tabbed) + `<epp-furniture-overlay>` + debug log + save/cancel buttons + template dialogs. Takes all three controllers.

- [ ] **Step 1-6:** Same TDD pattern.

```
git commit -m "refactor: extract epp-editor-view component"
```

---

### Task 18: Reduce orchestrator

**Files:**
- Modify: `frontend/src/eppgrid-panel.ts`

After all components are extracted, the panel should be ~300-400 lines containing:
- Controller creation and ownership
- `render()` with view routing to `<epp-wizard>`, `<epp-live-view>`, `<epp-editor-view>`, `<epp-settings-view>`
- Device selector (`_renderHeader`)
- Global dialogs (unsaved changes, delete calibration)
- Navigation guards (dirty state, history interception)
- Keyboard shortcuts delegation

- [ ] **Step 1: Remove all dead code from panel**

Any methods that were moved to components/controllers and are no longer called should be removed.

- [ ] **Step 2: Run all tests and build**

Run: `cd frontend && npx vitest run && npm run build`
Expected: All pass — both new component/controller tests and all 17 original integration tests.

- [ ] **Step 3: Commit**

```
git commit -m "refactor: reduce eppgrid-panel to orchestrator (~400 lines)"
```

---

## Phase 6: Final Verification

### Task 19: Full verification

- [ ] **Step 1: Run full test suite with coverage**

Run: `cd frontend && npx vitest run --coverage`
Expected: All tests pass. Coverage meets 90% thresholds per file.

- [ ] **Step 2: Run build**

Run: `cd frontend && npm run build`
Expected: Clean build, no warnings.

- [ ] **Step 3: Run lint**

Run: `cd frontend && npx biome check src/`
Expected: No errors.

- [ ] **Step 4: Manual smoke test**

Load the panel in a browser against a running HA instance. Verify:
- Device selector works
- Live view shows targets and sensor state
- Editor view: grid painting, zone add/remove, furniture drag/resize/rotate
- Settings view: accordions, sliders, toggles
- Wizard: calibration flow start to finish
- Templates: save and load
- Navigation guards: unsaved changes dialog

- [ ] **Step 5: Final commit**

```
git commit -m "refactor: panel refactoring complete - verify all tests and build"
```
