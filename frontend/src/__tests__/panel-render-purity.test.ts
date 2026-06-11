/**
 * Tests for PR 10 (pre-1.0 review) fixes:
 *
 *   Item 1 — `_renderEditor` must not mutate `_targets[i].status` or
 *            `_sensorState` during render.
 *   Item 2 — `runLocalZoneEngine` must read stable `_targets` (the same
 *            object refs the panel originally received).
 *   Item 8 — `_zoneEngineState.localZoneState` must get a fresh Map identity
 *            after each engine tick so Lit re-renders consumers.
 *   Item 3 (panel listener) — panel must clear its own `_dismissedTargets`
 *            entry when `<epp-grid>` dispatches `target-undismissed`.
 */

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-grid.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import { initGridFromRoom } from "../lib/grid.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = initGridFromRoom(3000, 4000);
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._view = "editor";
	a._devices = [
		{
			mac: "AA:BB:CC:DD:EE:01",
			name: "T",
			host: null,
			available: true,
			configured: true,
		},
	];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._targets = [];
	a._rawTargets = [];
	a._sensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		mmwave: false,
		illuminance: 150,
		temperature: 22.5,
		humidity: 45,
		co2: 400,
	};
	a._zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
	a._openAccordions = new Set();
	a._showUnsavedDialog = false;
	a._navGuard._pendingNavigation = null;
	a._saving = false;
	a._showDeleteCalibrationDialog = false;
	a._showConfigurationBackup = false;
	a._showConfigurationRestore = false;
	a._entitiesConfig = {};
	a._targetAutoDistance = true;
	a._targetMaxDistance = 6;
	a._staticAutoDistance = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	a._zoneEngineState = createZoneEngineState();
	a._showCustomIconPicker = false;
	a._customIconValue = "";
	a._isPainting = false;
	a._frozenBounds = null;
	a._sidebarTab = "zones";
	a._wizardCornerIndex = 0;
	a._wizardCorners = [null, null, null, null];
	a._wizardRoomWidth = 3000;
	a._wizardRoomDepth = 4000;
	a._wizardCapturing = false;
	a._wizardCaptureProgress = 0;
	a._wizardCapturePaused = false;
	a._wizardCaptureCancelled = false;
	a._wizardOffsetSide = "";
	a._wizardOffsetFb = "";
	a._wizardSaving = false;
	a._configurationName = "";
	a._fovCache = null;
	a._fovPerspective = null;
	a._dismissedTargets = new Map();
	return el;
}

function renderTo(tpl: any): HTMLDivElement {
	const c = document.createElement("div");
	document.body.appendChild(c);
	render(tpl, c);
	return c;
}

// ============================================================
// Item 1 — render purity: do NOT mutate _targets or _sensorState
// ============================================================
describe("_renderEditor purity", () => {
	it("does not mutate _targets[i] reference or its .status during render", () => {
		const a = createPanel() as any;
		// Provide a target whose status the engine *might* change.
		const original = {
			x: 1500,
			y: 2000,
			raw_x: 1500,
			raw_y: 2000,
			speed: 0,
			status: "inactive" as const,
			signal: 7,
		};
		a._targets = [original];
		const originalRef = a._targets[0];
		const statusBefore = originalRef.status;

		// Render the editor twice (multiple engine ticks) — per the fix the
		// panel must build a *new* targets array for the child component instead
		// of mutating its own state.
		a._renderEditor();
		a._renderEditor();

		// _targets array element is still the same object the panel received.
		expect(a._targets[0]).toBe(originalRef);
		// Its status field was not overwritten in place.
		expect(originalRef.status).toBe(statusBefore);
	});

	it("does not mutate _sensorState during render", () => {
		const a = createPanel() as any;
		// Pick a starting state that the (current/buggy) renderer would
		// actively rewrite: occupancy=false, but static_presence=true so the
		// pre-fix OR-assignment forces occupancy → true.
		a._sensorState = {
			occupancy: false,
			static_presence: true,
			motion_presence: false,
			target_presence: false,
			mmwave: false,
			illuminance: 150,
			temperature: 22.5,
			humidity: 45,
			co2: 400,
		};
		const sensorRef = a._sensorState;
		const occBefore = sensorRef.occupancy;
		const mmwaveBefore = sensorRef.mmwave;

		a._renderEditor();
		a._renderEditor();

		// Same object reference, untouched fields — the fix must build a
		// local copy and route consumers off that copy.
		expect(a._sensorState).toBe(sensorRef);
		expect(sensorRef.occupancy).toBe(occBefore);
		expect(sensorRef.mmwave).toBe(mmwaveBefore);
	});
});

// ============================================================
// Item 2 — engine reads stable inputs
// ============================================================
describe("runLocalZoneEngine input stability", () => {
	it("sees the same _targets object refs across consecutive ticks", () => {
		const a = createPanel() as any;
		const t0 = {
			x: 1500,
			y: 2000,
			raw_x: 1500,
			raw_y: 2000,
			speed: 0,
			status: "active" as const,
			signal: 7,
		};
		a._targets = [t0];
		const ref = a._targets[0];

		// Tick 1: render
		a._renderEditor();
		// After render, the engine input must still be the original target.
		expect(a._targets[0]).toBe(ref);

		// Tick 2: render again — still the same.
		a._renderEditor();
		expect(a._targets[0]).toBe(ref);
	});
});

// ============================================================
// Item 8 — localZoneState identity changes after each tick
// ============================================================
describe("zoneEngineState.localZoneState identity", () => {
	it("becomes a new Map identity after each engine tick", () => {
		const a = createPanel() as any;
		// Place an active target in a zone-painted cell so the engine
		// actually writes into localZoneState.
		a._targets = [
			{
				x: 1500,
				y: 2000,
				raw_x: 1500,
				raw_y: 2000,
				speed: 0,
				status: "active" as const,
				signal: 7,
			},
		];

		a._runLocalZoneEngine();
		const after1 = a._zoneEngineState.localZoneState;
		a._runLocalZoneEngine();
		const after2 = a._zoneEngineState.localZoneState;
		a._runLocalZoneEngine();
		const after3 = a._zoneEngineState.localZoneState;

		// Fresh Map identity each tick — Lit can detect the change
		// when this is passed to <epp-zone-sidebar>.
		expect(after2).not.toBe(after1);
		expect(after3).not.toBe(after2);
	});
});

// ============================================================
// Item 3 (panel side) — panel listens for `target-undismissed`
// ============================================================
describe("panel handles target-undismissed from <epp-grid>", () => {
	it("clears the matching _dismissedTargets entry from the live grid site", async () => {
		const a = createPanel() as any;
		a._view = "live";
		a._dismissedTargets = new Map([
			[0, 130],
			[1, 200],
		]);
		const before = a._dismissedTargets;

		// Render live overview to a container so the lit `@target-undismissed`
		// binding is wired up on the <epp-grid> element.
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const grid = c.querySelector("epp-grid") as HTMLElement | null;
		expect(grid).not.toBeNull();
		grid?.dispatchEvent(
			new CustomEvent("target-undismissed", {
				detail: { targetIndex: 0 },
				bubbles: true,
				composed: true,
			}),
		);

		// New Map identity, key 0 removed, key 1 preserved.
		expect(a._dismissedTargets).not.toBe(before);
		expect(a._dismissedTargets.has(0)).toBe(false);
		expect(a._dismissedTargets.get(1)).toBe(200);

		document.body.removeChild(c);
	});

	it("clears the matching _dismissedTargets entry from the editor site", async () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._dismissedTargets = new Map([
			[2, 42],
			[3, 99],
		]);
		const before = a._dismissedTargets;

		const tpl = a._renderEditor();
		const c = renderTo(tpl);

		const grid = c.querySelector("epp-grid") as HTMLElement | null;
		expect(grid).not.toBeNull();
		grid?.dispatchEvent(
			new CustomEvent("target-undismissed", {
				detail: { targetIndex: 2 },
				bubbles: true,
				composed: true,
			}),
		);

		expect(a._dismissedTargets).not.toBe(before);
		expect(a._dismissedTargets.has(2)).toBe(false);
		expect(a._dismissedTargets.get(3)).toBe(99);

		document.body.removeChild(c);
	});

	it("does not allocate a new Map when targetIndex is not present", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._dismissedTargets = new Map([[0, 130]]);
		const before = a._dismissedTargets;

		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const grid = c.querySelector("epp-grid") as HTMLElement | null;
		grid?.dispatchEvent(
			new CustomEvent("target-undismissed", {
				detail: { targetIndex: 99 },
				bubbles: true,
				composed: true,
			}),
		);

		// No spurious churn when nothing matched.
		expect(a._dismissedTargets).toBe(before);

		document.body.removeChild(c);
	});

	it("schedules a re-render when _dismissedTargets is reassigned", async () => {
		// Regression for Copilot review on PR 168: `_dismissedTargets` was a
		// non-reactive private field. `_handleTargetUndismissed` reassigned it
		// without `requestUpdate()`, so the child kept seeing the old Map
		// until some unrelated state change happened to trigger a re-render.
		// The field must be `@state` so reassignment alone schedules an
		// update — both for `_handleTargetUndismissed` and for `_dismissTarget`
		// (which previously patched around the gap with a manual
		// `requestUpdate()`).
		const a = createPanel() as any;
		document.body.appendChild(a);
		// Drain any pending updates from initial mount so the test only
		// observes the effect of the field reassignment.
		while (a.isUpdatePending) await a.updateComplete;

		a._dismissedTargets = new Map([[0, 130]]);
		expect(a.isUpdatePending).toBe(true);

		document.body.removeChild(a);
	});
});
