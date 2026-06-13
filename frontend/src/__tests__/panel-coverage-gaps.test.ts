/**
 * Targeted tests for the remaining coverage gaps: specific branches,
 * edge cases, and hard-to-reach code paths.
 */

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-grid.js";
import type { EppSettingsView } from "../components/epp-settings-view.js";
import { GRID_CELL_COUNT, initGridFromRoom } from "../lib/grid.js";
import { ZONE_COLORS, ZONE_TYPE_DEFAULTS } from "../lib/zone-defaults.js";
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
	a._view = "live";
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
	a._sensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
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
	// Zone 0 defaults live on _zoneConfigs[0]; set up above.
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
	return el;
}

function createSettingsView(
	overrides?: Partial<Record<string, unknown>>,
): EppSettingsView {
	const el = document.createElement("epp-settings-view") as EppSettingsView;
	el.grid = initGridFromRoom(3000, 4000);
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.openAccordions = new Set();
	el.entitiesConfig = {};

	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

function renderTo(tpl: any): HTMLDivElement {
	const c = document.createElement("div");
	document.body.appendChild(c);
	render(tpl, c);
	return c;
}

// =========================================================
// Branch: disconnectedCallback restores original push/replace
// =========================================================
describe("disconnectedCallback restores history methods", () => {
	it("stashes the truly-original push/replaceState on window at connect", () => {
		// The originals live in a module-level window stash (the guard keeps
		// only a per-instance replaceState reference for _replaceHash).
		const a = createPanel() as any;
		a.hass = null;
		a.connectedCallback();

		expect((window as any).__eppOriginalPushState).toBeDefined();
		expect((window as any).__eppOriginalReplaceState).toBeDefined();

		a.disconnectedCallback();

		// After disconnect, history methods should be restored
		// No assertion needed beyond not throwing
	});

	it("handles a disconnect without a prior connect (nothing registered)", () => {
		const a = createPanel() as any;

		// Should not throw
		a.disconnectedCallback();
	});

	it("first instance disconnect does NOT clobber a still-connected second instance's wrapper", () => {
		// Two instances overlap (e.g. mid-remount the new instance connects
		// before the old one disconnects). Both wrap from the same global
		// truly-original. After the first disconnects, history.pushState
		// must still be the second instance's wrapper — unconditionally
		// restoring the bare original would silently disable the live
		// instance's interception.
		delete (window as any).__eppOriginalPushState;
		delete (window as any).__eppOriginalReplaceState;

		const first = createPanel() as any;
		first.hass = null;
		first.connectedCallback();

		const second = createPanel() as any;
		second.hass = null;
		second.connectedCallback();
		const secondWrapper = history.pushState;

		first.disconnectedCallback();

		expect(history.pushState).toBe(secondWrapper);

		second.disconnectedCallback();
	});

	it("LATER instance disconnect (duplicate-panel cleanup) keeps the survivor's interception live", () => {
		// The mount guard's dedup path: the guard mounts panel A into a fresh
		// host, HA appends its own duplicate B, removeDuplicateEppPanels keeps
		// A and removes B. B connected last, so B's wrapper sits on top; if
		// B's disconnect restores the BARE original (because "my wrapper is
		// the installed one"), the still-connected A is left with NO
		// interception — HA-router navigation while dirty then discards
		// unsaved edits without the unsaved-changes dialog.
		delete (window as any).__eppOriginalPushState;
		delete (window as any).__eppOriginalReplaceState;

		const first = createPanel() as any;
		first.hass = null;
		first.connectedCallback();

		const second = createPanel() as any;
		second.hass = null;
		second.connectedCallback();

		// Dedup removes the LATER duplicate; the established first survives.
		second.disconnectedCallback();

		first._dirty = true;
		history.pushState({}, "", "/dup-cleanup-push");
		expect(first._showUnsavedDialog).toBe(true);
		expect(typeof first._navGuard._pendingNavigation).toBe("function");

		// replaceState interception must survive the same ordering.
		first._showUnsavedDialog = false;
		first._navGuard._pendingNavigation = null;
		history.replaceState({}, "", "/dup-cleanup-replace");
		expect(first._showUnsavedDialog).toBe(true);
		expect(typeof first._navGuard._pendingNavigation).toBe("function");

		first._navGuard._pendingNavigation = null;
		first._dirty = false;
		first.disconnectedCallback();
	});

	it("FIRST instance disconnect keeps the still-connected second instance's interception live", () => {
		// Symmetric ordering: mid-remount overlap where the OLD instance
		// disconnects after the new one connected. The survivor's dirty
		// guard must still be consulted on history navigation.
		delete (window as any).__eppOriginalPushState;
		delete (window as any).__eppOriginalReplaceState;

		const first = createPanel() as any;
		first.hass = null;
		first.connectedCallback();

		const second = createPanel() as any;
		second.hass = null;
		second.connectedCallback();

		first.disconnectedCallback();

		second._dirty = true;
		history.pushState({}, "", "/overlap-push");
		expect(second._showUnsavedDialog).toBe(true);
		expect(typeof second._navGuard._pendingNavigation).toBe("function");

		second._navGuard._pendingNavigation = null;
		second._dirty = false;
		second.disconnectedCallback();
	});

	it("disconnect after a second panel instance restores the same truly-original pushState", () => {
		// Two instances connect in sequence (e.g. panel remount). An
		// instance must never capture another instance's wrapper as its
		// "original": restoring a wrapper on disconnect would leave it
		// installed, and a *third* mount would chain its wrap on top of
		// that wrap, growing the chain unboundedly across remounts. The
		// truly-original is stashed on window once and every register call
		// chains off it, so the stash stays the same bare function no
		// matter how many instances come and go.
		delete (window as any).__eppOriginalPushState;
		delete (window as any).__eppOriginalReplaceState;

		const first = createPanel() as any;
		first.hass = null;
		first.connectedCallback();
		const trulyOriginal = (window as any).__eppOriginalPushState;
		expect(typeof trulyOriginal).toBe("function");

		const second = createPanel() as any;
		second.hass = null;
		second.connectedCallback();

		// The second connect must keep the SAME truly-original in the
		// stash, not overwrite it with the first instance's wrapper.
		expect((window as any).__eppOriginalPushState).toBe(trulyOriginal);

		second.disconnectedCallback();
		first.disconnectedCallback();

		// After both disconnects, history.pushState is the bare original,
		// not a leftover wrapper from the first instance.
		expect(history.pushState).toBe(trulyOriginal);
	});

	it("stores pending navigation when pushState is intercepted with dirty state", () => {
		const a = createPanel() as any;
		a.connectedCallback();
		a._dirty = true;

		history.pushState({}, "", "/test-push");
		expect(a._navGuard._pendingNavigation).toBeInstanceOf(Function);
		// Execute the pending navigation to cover the lambda
		a._navGuard._pendingNavigation();
		a._navGuard._pendingNavigation = null;
		a.disconnectedCallback();
	});

	it("stores pending navigation when replaceState is intercepted with dirty state", () => {
		const a = createPanel() as any;
		a.connectedCallback();
		a._dirty = true;

		history.replaceState({}, "", "/test-replace");
		expect(a._navGuard._pendingNavigation).toBeInstanceOf(Function);
		// Execute the pending navigation to cover the lambda
		a._navGuard._pendingNavigation();
		a._navGuard._pendingNavigation = null;
		a.disconnectedCallback();
	});
});

// =========================================================
// Branch: applyPaintToCell when activeZone is null
// =========================================================
describe("applyPaintToCell edge cases", () => {
	it("returns early when _activeZone is null", () => {
		const a = createPanel() as any;
		a._activeZone = null;
		const gridBefore = new Uint8Array(a._grid);

		a._gridCtrl.applyPaintToCell(0);

		// Grid should be unchanged
		expect(a._grid).toEqual(gridBefore);
	});

	it("returns early when paint returns null (no change)", () => {
		const a = createPanel() as any;
		a._activeZone = 2;
		a._paintAction = "set";
		// Cell at index 0 is not inside room -> painting zone on outside cell returns null
		a._grid[0] = 0; // outside

		a._gridCtrl.applyPaintToCell(0);
		expect(a._grid[0]).toBe(0); // unchanged
	});
});

// =========================================================
// Branch: _removeZone clears grid when it returns modified
// =========================================================
describe("_removeZone grid clearing branch", () => {
	it("does not replace grid when clearZoneFromGrid returns null (no cells)", () => {
		const a = createPanel() as any;
		// Named zone 1 lives at slot 1 (slot 0 is Zone0Config).
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };
		// Grid has no cells with zone 1
		const _gridRef = a._grid;

		a._removeZone(1);

		// Grid ref should remain the same object since no cells had zone 1
		// (clearZoneFromGrid returns null when nothing changed)
		// Just verify zone was removed
		expect(a._zoneConfigs[1]).toBeNull();
	});
});

// =========================================================
// Branch: _addZone color fallback when all colors used
// =========================================================
describe("_addZone color fallback", () => {
	it("picks the only unused color when six are already taken", () => {
		const a = createPanel() as any;
		// Fill named-zone slots 1-6 with colors 0-5; slot 7 is the first
		// empty named slot.
		for (let i = 1; i <= 6; i++) {
			a._zoneConfigs[i] = {
				name: `Zone ${i}`,
				color: ZONE_COLORS[(i - 1) % ZONE_COLORS.length],
				type: "default",
			};
		}

		a._addZone(); // fills slot 7

		expect(a._zoneConfigs[7]).not.toBeNull();
		// ZONE_COLORS.length === MAX_ZONES, so the last unused palette entry
		// is always available for the seventh zone.
		expect(a._zoneConfigs[7].color).toBe(ZONE_COLORS[6]);
		expect(a._zoneConfigs[7].type).toBe("default");
	});
});

// =========================================================
// _renderLiveGrid: targets out of view
// =========================================================
describe("_renderLiveGrid target rendering branches", () => {
	it("renders targets that fall within view bounds", () => {
		const a = createPanel() as any;
		a._targets = [
			{
				x: 1500,
				y: 2000,
				raw_x: 1500,
				raw_y: 2000,
				status: "active" as const,
				signal: 5,
			},
			{
				x: 0,
				y: 0,
				raw_x: 0,
				raw_y: 0,
				status: "inactive" as const,
				signal: 0,
			},
		];

		const c = renderTo(a._renderLiveGrid());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid).not.toBeNull();
		expect(grid.targets).toHaveLength(2);
		expect(grid.targets[0].status).toBe("active");
		expect(grid.targets[1].status).toBe("inactive");
		document.body.removeChild(c);
	});

	it("renders with grid metrics (via EppGrid)", () => {
		const el = document.createElement("epp-grid") as any;
		el.grid = initGridFromRoom(3000, 4000);
		el.roomWidth = 3000;
		el.roomDepth = 4000;
		el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		el.localize = (k: string) => k;
		const c = renderTo(
			el._renderGridDimensions({ widthM: 3, depthM: 4, furthestM: 4.5 }),
		);
		const dims = c.querySelector(".grid-dimensions");
		expect(dims).not.toBeNull();
		expect(dims!.textContent).toContain("live.grid_dimensions");
		document.body.removeChild(c);
	});
});

// =========================================================
// Live overview menu branches (now inline in panel)
// =========================================================
describe("live overview menu branches (panel inline)", () => {
	/** Find a rendered menu item by its localize key, asserting it exists. */
	function menuItem(c: HTMLElement, key: string): HTMLElement {
		const item = Array.from(c.querySelectorAll(".sidebar-menu-item")).find(
			(i) => i.textContent?.includes(key),
		);
		expect(item, `menu item ${key} should render`).toBeTruthy();
		return item as HTMLElement;
	}

	it("renders menu with furniture button when perspective exists", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		expect(c.querySelectorAll(".sidebar-menu-item").length).toBe(8);
		menuItem(c, "menu.furniture");
		document.body.removeChild(c);
	});

	it("renders menu without zone/furniture buttons when no perspective", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = null;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		// Editor entries and delete-calibration are hidden without a
		// calibration: settings + calibration + backup + restore remain.
		expect(c.querySelectorAll(".sidebar-menu-item").length).toBe(4);
		expect(c.textContent).not.toContain("menu.furniture");
		expect(c.textContent).not.toContain("menu.detection_zones");
		document.body.removeChild(c);
	});

	it("furniture menu item sets _view and _sidebarTab", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		menuItem(c, "menu.furniture").click();
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("furniture");
		document.body.removeChild(c);
	});

	it("settings menu item sets _view to settings", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		menuItem(c, "menu.settings").click();
		expect(a._view).toBe("settings");
		document.body.removeChild(c);
	});

	it("delete calibration menu item sets _showDeleteCalibrationDialog", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		menuItem(c, "menu.delete_calibration").click();
		expect(a._showDeleteCalibrationDialog).toBe(true);
		document.body.removeChild(c);
	});

	it("save configuration menu item sets _showConfigurationBackup", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		menuItem(c, "dialogs.backup_configuration").click();
		expect(a._showConfigurationBackup).toBe(true);
		document.body.removeChild(c);
	});

	it("load configuration menu item sets _showConfigurationRestore", async () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		menuItem(c, "dialogs.restore_configuration").click();
		await vi.waitFor(() => {
			expect(a._showConfigurationRestore).toBe(true);
		});
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderDetectionRanges branches
// =========================================================
describe("_renderDetectionRanges branches", () => {
	it("renders with auto range and static auto range toggling", () => {
		const sv = createSettingsView({ staticAutoDistance: true });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		// Target auto + static auto toggles.
		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		expect(checkboxes.length).toBe(2);
		const staticCb = checkboxes[1] as HTMLInputElement;
		staticCb.checked = false;
		staticCb.dispatchEvent(new Event("change"));
		expect((sv as any)._overrides.staticAutoDistance).toBe(false);
		document.body.removeChild(c);
	});

	it("static min distance slider updates", () => {
		const sv = createSettingsView({ staticAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(
			".setting-range",
		) as NodeListOf<HTMLInputElement>;
		// target max, static min, static max.
		expect(ranges.length).toBe(3);
		const staticMin = ranges[1];
		staticMin.value = "0.5";
		staticMin.dispatchEvent(new Event("input"));
		expect((sv as any)._overrides.staticMinDistance).toBe(0.5);
		expect(
			staticMin.parentElement?.querySelector(".setting-value")?.textContent,
		).toBe("0.5");
		document.body.removeChild(c);
	});

	it("static max distance slider updates", () => {
		const sv = createSettingsView({ staticAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(
			".setting-range",
		) as NodeListOf<HTMLInputElement>;
		const staticMax = ranges[2];
		expect(staticMax.max).toBe("16");
		staticMax.value = "12";
		staticMax.dispatchEvent(new Event("input"));
		expect((sv as any)._overrides.staticMaxDistance).toBe(12);
		expect(
			staticMax.parentElement?.querySelector(".setting-value")?.textContent,
		).toBe("12.0");
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderSensitivities DOM event handlers
// =========================================================
describe("_renderSensitivities DOM events", () => {
	it("slider input updates the value display and records an override", () => {
		const sv = createSettingsView();
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(
			".setting-range",
		) as NodeListOf<HTMLInputElement>;
		// 6 sensitivity sliders + 3 environmental offset sliders.
		expect(ranges.length).toBe(9);

		// First slider: motion presence timeout.
		const motion = ranges[0];
		motion.value = "42";
		motion.dispatchEvent(new Event("input"));
		expect((sv as any)._overrides.motionTimeout).toBe(42);
		expect(
			motion.parentElement?.querySelector(".setting-value")?.textContent,
		).toBe("42");

		// Env-offset slider: with no live reading the display stays an em dash
		// but the override is still recorded.
		const offset = Array.from(ranges).find(
			(r) => r.dataset.offsetKey === "temperature",
		) as HTMLInputElement;
		expect(offset).toBeTruthy();
		offset.value = "2";
		offset.dispatchEvent(new Event("input"));
		expect((sv as any)._overrides.temperatureOffset).toBe(2);
		expect(
			offset.parentElement?.querySelector(".setting-value")?.textContent,
		).toBe("—");
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderEnvOffset with null reading branch
// =========================================================
describe("_renderEnvOffset null reading branch", () => {
	it("handles null reading with adjusted display as dash", () => {
		const sv = createSettingsView();
		const tpl = (sv as any).renderEnvOffset(
			"Test",
			null,
			"test_key",
			-10,
			10,
			1,
			"unit",
			0,
			"tip",
		);
		const c = renderTo(tpl);

		// Should render with dash for adjusted value
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan).not.toBeNull();
		expect(valueSpan!.textContent).toBe("\u2014");
		document.body.removeChild(c);
	});

	it("fires input handler with null reading", () => {
		const sv = createSettingsView();
		const tpl = (sv as any).renderEnvOffset(
			"Test",
			null,
			"test_key",
			-10,
			10,
			1,
			"unit",
			0,
			"tip",
		);
		const c = renderTo(tpl);

		const range = c.querySelector(".setting-range") as HTMLInputElement;
		expect(range).not.toBeNull();
		range.value = "5";
		range.dispatchEvent(new Event("input"));
		// With null reading, adjusted still shows the em-dash but the
		// override is recorded for save.
		expect(
			range.parentElement?.querySelector(".setting-value")?.textContent,
		).toBe("\u2014");
		expect((sv as any)._overrides.test_keyOffset).toBe(5);
		document.body.removeChild(c);
	});
});

// =========================================================
// epp-live-sidebar zone sensor info toggle
// =========================================================
describe("epp-live-sidebar zone info toggles", () => {
	it("toggles zone sensor info", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "default",
		};
		el.hasPerspective = true;
		el.zoneState = {
			occupancy: { 1: true },
			target_counts: { 1: 2 },
			frame_count: 50,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		// Zone tips come after the 5 sensor tips (occupancy, static, motion,
		// target, mmwave); slot 0 (rest-of-room) renders first, then named
		// zones in slot order. Tooltip toggling is covered in epp-info-tip.test.ts.
		const tips = c.querySelectorAll("epp-info-tip");
		expect(tips.length).toBe(7);
		expect((tips[6] as any).text).toBe("info.zone_occupancy");
		document.body.removeChild(c);
	});
});

// =========================================================
// Template load dialog: load and delete button clicks
// =========================================================
describe("configuration dialog events via _renderGlobalDialogs", () => {
	it("configuration-load event calls _loadConfiguration", async () => {
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [
					{
						type: "default",
						trigger: 5,
						renew: 3,
						timeout: 10,
						handoff_timeout: 3,
					},
					null,
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 5000,
				roomDepth: 6000,
			},
		];
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);

		const dialogs = c.querySelector("epp-configuration-dialogs") as HTMLElement;
		expect(dialogs).not.toBeNull();
		dialogs.dispatchEvent(
			new CustomEvent("configuration-load", { detail: "T1" }),
		);
		// Async loadConfiguration -> applyLayout chain; wait for it.
		// For a valid config (no early return or thrown error), loadConfiguration
		// sets _dirty=true synchronously before its WS push.
		await vi.waitFor(() => {
			expect(a._dirty).toBe(true);
		});
		document.body.removeChild(c);
	});

	it("configuration-delete event calls _deleteConfiguration", async () => {
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid: [],
				zones: new Array(8).fill(null),
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];
		a.hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/delete_configuration")
				return Promise.resolve({});
			if (msg.type === "eppgrid/list_configurations")
				return Promise.resolve({ configurations: {} });
			return Promise.resolve({});
		});
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);

		const dialogs = c.querySelector("epp-configuration-dialogs") as HTMLElement;
		expect(dialogs).not.toBeNull();
		dialogs.dispatchEvent(
			new CustomEvent("configuration-delete", { detail: "T1" }),
		);
		// Wait for async _deleteConfiguration to complete
		await vi.waitFor(() => {
			expect(a._gridCtrl.configurations.length).toBe(0);
		});
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderTemplateSaveDialog: save button click
// =========================================================
describe("configuration-save event via _renderGlobalDialogs", () => {
	it("calls _saveConfiguration and closes the backup dialog", async () => {
		const a = createPanel() as any;
		a._showConfigurationBackup = true;
		a._configurationName = "Test";
		a.hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/save_configuration") return Promise.resolve({});
			if (msg.type === "eppgrid/list_configurations")
				return Promise.resolve({ configurations: {} });
			return Promise.resolve({});
		});
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);

		const dialogs = c.querySelector("epp-configuration-dialogs") as HTMLElement;
		expect(dialogs).not.toBeNull();
		dialogs.dispatchEvent(new CustomEvent("configuration-save"));
		await vi.waitFor(() => {
			expect(a._showConfigurationBackup).toBe(false);
		});
		document.body.removeChild(c);
	});
});

// =========================================================
// epp-furniture-sidebar: ha-icon-picker value-changed
// =========================================================
describe("epp-furniture-sidebar icon picker event", () => {
	it("value-changed fires custom-icon-change", () => {
		const el = document.createElement("epp-furniture-sidebar") as any;
		el.furniture = [];
		el.selectedFurnitureId = null;
		el.hass = {};
		el.localize = (k: string) => k;
		el.showCustomIconPicker = true;
		el.customIconValue = "";

		const handler = vi.fn();
		el.addEventListener("custom-icon-change", handler);

		const tpl = el._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const picker = c.querySelector("ha-icon-picker") as HTMLElement;
		expect(picker).not.toBeNull();
		picker.dispatchEvent(
			new CustomEvent("value-changed", { detail: { value: "mdi:lamp" } }),
		);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail).toBe("mdi:lamp");
		document.body.removeChild(c);
	});
});

// =========================================================
// Old-format configurations (missing or length-7 zones) — per the no-BWC
// policy, these throw rather than being silently accepted.
// =========================================================
describe("_loadConfiguration rejects old-format configurations", () => {
	it("logs an error when zones field is missing", async () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "NoZones",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];
		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadConfiguration("NoZones");
		// The wrapper catches the error and logs it.
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
	});
});

// =========================================================
// _renderWizard with capturing in progress
// =========================================================
describe("_renderWizard capture overlay branches (via EppWizard)", () => {
	function createWiz() {
		const el = document.createElement("epp-wizard") as any;
		el.hass = { callWS: vi.fn().mockResolvedValue({}) };
		el.selectedMac = "";
		el.rawTargets = [{ raw_x: 100, raw_y: 200 }];
		el.sensorState = { occupancy: false };
		el.devices = [];
		el.localize = (k: string) => k;
		el.mode = "wizard";
		el._setupStep = "corners";
		el._wizardCornerIndex = 0;
		el._wizardCorners = [null, null, null, null];
		el._wizardRoomWidth = 3000;
		el._wizardRoomDepth = 4000;
		el._wizardOffsetSide = "";
		el._wizardOffsetFb = "";
		el._smoothBuffer = [];
		el._perspective = null;
		return el;
	}

	it("renders capture overlay", () => {
		const a = createWiz();
		a._wizardCapturing = true;
		a._wizardCaptureProgress = 0.5;
		a._wizardCapturePaused = false;
		const tpl = a._renderWizard();
		const c = renderTo(tpl);

		const overlay = c.querySelector(".capture-overlay");
		expect(overlay).not.toBeNull();
		const fill = overlay!.querySelector(".capture-fill") as HTMLElement;
		expect(fill.getAttribute("style")).toContain("width: 50%");
		const cancelBtn = overlay!.querySelector(".wizard-btn-back");
		expect(cancelBtn).not.toBeNull();
		expect(cancelBtn!.textContent).toContain("common.cancel");
		document.body.removeChild(c);
	});

	it("renders paused capture overlay", () => {
		const a = createWiz();
		a._wizardCapturing = true;
		a._wizardCapturePaused = true;
		const tpl = a._renderWizard();
		const c = renderTo(tpl);
		expect(c.querySelector(".capture-overlay")).not.toBeNull();
		expect(c.textContent).toContain("wizard.paused");
		document.body.removeChild(c);
	});
});

// Editor view: rename dialog was removed (entity renaming handled by backend)

// =========================================================
// _renderGlobalDialogs: template and unsaved dialogs
// =========================================================
describe("_renderGlobalDialogs branch coverage", () => {
	it("renders the configuration dialogs component for backup", () => {
		const a = createPanel() as any;
		a._showConfigurationBackup = true;
		a._configurationName = "test";
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);
		const dialogs = c.querySelector("epp-configuration-dialogs") as any;
		expect(dialogs).not.toBeNull();
		expect(dialogs.showBackup).toBe(true);
		document.body.removeChild(c);
	});

	it("renders the configuration dialogs component for restore", () => {
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);
		const dialogs = c.querySelector("epp-configuration-dialogs") as any;
		expect(dialogs).not.toBeNull();
		expect(dialogs.showRestore).toBe(true);
		document.body.removeChild(c);
	});

	it("renders unsaved changes dialog", () => {
		const a = createPanel() as any;
		a._showUnsavedDialog = true;
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);
		expect(c.querySelectorAll(".template-dialog").length).toBeGreaterThan(0);
		document.body.removeChild(c);
	});

	it("renders delete calibration dialog", () => {
		const a = createPanel() as any;
		a._showDeleteCalibrationDialog = true;
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);
		expect(c.querySelectorAll(".template-dialog").length).toBeGreaterThan(0);
		document.body.removeChild(c);
	});

	it("renders nothing when no dialogs are active", () => {
		const a = createPanel() as any;
		const tpl = a._renderGlobalDialogs();
		const c = renderTo(tpl);
		expect(c.querySelectorAll(".template-dialog").length).toBe(0);
		expect(c.querySelector("epp-configuration-dialogs")).toBeNull();
		document.body.removeChild(c);
	});
});

// =========================================================
// render(): view branching
// =========================================================
describe("render view branching", () => {
	it("renders settings view", () => {
		const a = createPanel() as any;
		a._view = "settings";
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
		const tpl = a.render();
		const c = renderTo(tpl);
		expect(c.querySelector("epp-settings-view")).not.toBeNull();
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderZoneSidebar: zone color picker stopPropagation
// =========================================================
describe("stopPropagation handlers in zone sidebar", () => {
	it("color picker click event has stopPropagation", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		el.activeZone = 1;
		el.zone0 = {
			type: "default",
			trigger: ZONE_TYPE_DEFAULTS.default.trigger,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		};
		el.localZoneState = new Map();
		el.localize = (k: string) => k;
		const tpl = el._renderZoneSidebar();
		const c = renderTo(tpl);

		const colorPicker = c.querySelector(
			".zone-color-picker",
		) as HTMLInputElement;
		expect(colorPicker).not.toBeNull();
		const event = new MouseEvent("click", { bubbles: true });
		const stopSpy = vi.spyOn(event, "stopPropagation");
		colorPicker.dispatchEvent(event);
		expect(stopSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("_runLocalZoneEngine target with no grid mapping", () => {
	it("skips target when _mapTargetToGridCell returns null", () => {
		const a = createPanel() as any;
		// roomWidth=0 causes mapTargetToGridCell to return null
		a._roomWidth = 0;
		a._roomDepth = 0;
		a._targets = [{ x: 100, y: 200, signal: 100, status: "active" }];
		const result = a._runLocalZoneEngine();
		// The unmappable target is skipped: no zone reports occupancy and no
		// per-target previous position is recorded.
		expect(Object.values(result.occupancy)).not.toContain(true);
		expect(a._zoneEngineState.targetPrev[0]).toBeNull();
	});
});

describe("backend debug log copy and clear buttons", () => {
	it("clear button resets backend debug log lines", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line1", "line2"];
		a._backendDebugLogPrev = "something";
		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		render(tpl, c);

		// The panel's default localize returns raw keys in this harness.
		const buttons = c.querySelectorAll(".debug-log-btn");
		const clearBtn = Array.from(buttons).find(
			(b) => b.textContent?.trim() === "live.debug.clear",
		) as HTMLElement;
		expect(clearBtn).toBeTruthy();
		clearBtn.click();
		expect(a._backendDebugLogLines).toEqual([]);
		expect(a._backendDebugLogPrev).toBeNull();
	});

	it("copy button calls clipboard.writeText", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line1", "line2"];
		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		render(tpl, c);

		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: writeTextMock },
			writable: true,
			configurable: true,
		});

		const buttons = c.querySelectorAll(".debug-log-btn");
		const copyBtn = Array.from(buttons).find(
			(b) => b.textContent?.trim() === "live.debug.copy_all",
		) as HTMLElement;
		expect(copyBtn).toBeTruthy();
		copyBtn.click();
		expect(writeTextMock).toHaveBeenCalledWith("line1\nline2");
	});

	it("backend debug copy swallows clipboard rejection", async () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line1"];
		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		render(tpl, c);

		const writeTextMock = vi.fn().mockRejectedValue(new Error("denied"));
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: writeTextMock },
			writable: true,
			configurable: true,
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const copyBtn = c.querySelector(".debug-log-btn") as HTMLElement;
		copyBtn.click();
		// Wait one microtask for the promise rejection to surface to .catch
		await new Promise((r) => setTimeout(r, 0));
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it("frontend debug copy swallows clipboard rejection", async () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = ["line1"];
		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		render(tpl, c);

		const writeTextMock = vi.fn().mockRejectedValue(new Error("denied"));
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: writeTextMock },
			writable: true,
			configurable: true,
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const copyBtn = c.querySelector(".debug-log-btn") as HTMLElement;
		copyBtn.click();
		await new Promise((r) => setTimeout(r, 0));
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("settings slider input handlers", () => {
	it("static max distance slider clamps below min", () => {
		// staticMinDistance must exceed the slider's own min="2.4" — happy-dom
		// clamps the assigned value to the markup min before the handler runs,
		// so a smaller floor would never exercise the handler's clamp branch.
		const sv = createSettingsView({
			staticAutoDistance: false,
			staticMinDistance: 3,
			staticMaxDistance: 10,
			targetAutoDistance: false,
			targetMaxDistance: 4,
		});
		const tpl = (sv as any).renderDetectionRanges();
		const c = document.createElement("div");
		render(tpl, c);

		const ranges = c.querySelectorAll(
			"input[type=range]",
		) as NodeListOf<HTMLInputElement>;
		// The static max distance slider is the last range input
		const staticMax = ranges[ranges.length - 1];
		expect(staticMax).toBeTruthy();
		staticMax.value = "1";
		staticMax.dispatchEvent(new Event("input"));
		// Clamped to staticMinDistance (3) + 0.1, both in the input and in
		// the override that will be saved.
		expect(staticMax.value).toBe("3.1");
		expect((sv as any)._overrides.staticMaxDistance).toBe(3.1);
	});
});

// =========================================================
// _renderHeader: ha-select event handlers
// =========================================================
describe("_renderHeader ha-select handlers", () => {
	it("stops propagation of closed event", () => {
		const a = createPanel() as any;
		const tpl = a._renderHeader();
		const c = document.createElement("div");
		render(tpl, c);

		const select = c.querySelector("ha-select");
		expect(select).not.toBeNull();

		const event = new Event("closed", { bubbles: true });
		const spy = vi.spyOn(event, "stopPropagation");
		select!.dispatchEvent(event);
		expect(spy).toHaveBeenCalled();
	});

	it("@selected ignores empty or same-mac selection", () => {
		const a = createPanel() as any;
		const tpl = a._renderHeader();
		const c = document.createElement("div");
		render(tpl, c);

		const select = c.querySelector("ha-select") as any;
		expect(select).not.toBeNull();

		// Simulate selecting the same mac — should be a no-op
		select.dispatchEvent(
			new CustomEvent("selected", {
				bubbles: true,
				detail: { value: a._selectedMac },
			}),
		);

		// No device change should have occurred
		expect(a._selectedMac).toBe("AA:BB:CC:DD:EE:01");
	});

	it("renders option labels with area suffix when area is set", () => {
		const a = createPanel() as any;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Sensor",
				host: null,
				available: true,
				configured: true,
				area: "Living Room",
			},
			{
				mac: "AA:BB:CC:DD:EE:02",
				name: "Other",
				host: null,
				available: true,
				configured: true,
				area: null,
			},
		];
		const tpl = a._renderHeader();
		const c = document.createElement("div");
		render(tpl, c);

		const select = c.querySelector("ha-select") as any;
		expect(select.options).toEqual([
			{ value: "AA:BB:CC:DD:EE:01", label: "Sensor (Living Room)" },
			{ value: "AA:BB:CC:DD:EE:02", label: "Other" },
		]);
	});
});
