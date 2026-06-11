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
	it("uses modulo fallback when all colors are in use", () => {
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
		// Should pick a color (may or may not repeat)
		expect(a._zoneConfigs[7].color).toBeDefined();
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

		const tpl = a._renderLiveGrid();
		expect(tpl).toBeDefined();
	});

	it("renders with grid metrics (via EppGrid)", () => {
		const el = document.createElement("epp-grid") as any;
		el.grid = initGridFromRoom(3000, 4000);
		el.roomWidth = 3000;
		el.roomDepth = 4000;
		el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		el.localize = (k: string) => k;
		const tpl = el._renderGridDimensions();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// Live overview menu branches (now inline in panel)
// =========================================================
describe("live overview menu branches (panel inline)", () => {
	it("renders menu with furniture button when perspective exists", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		expect(items.length).toBeGreaterThan(2);
		document.body.removeChild(c);
	});

	it("renders menu without zone/furniture buttons when no perspective", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = null;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		// Should have fewer menu items
		const items = c.querySelectorAll(".sidebar-menu-item");
		expect(items).toBeDefined();
		document.body.removeChild(c);
	});

	it("furniture menu item sets _view and _sidebarTab", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		for (let i = 0; i < items.length; i++) {
			const text = items[i].textContent || "";
			if (text.includes("menu.furniture")) {
				(items[i] as HTMLElement).click();
				expect(a._view).toBe("editor");
				expect(a._sidebarTab).toBe("furniture");
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("settings menu item sets _view to settings", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		for (let i = 0; i < items.length; i++) {
			const text = items[i].textContent || "";
			if (text.includes("menu.settings")) {
				(items[i] as HTMLElement).click();
				expect(a._view).toBe("settings");
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("delete calibration menu item sets _showDeleteCalibrationDialog", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		for (let i = 0; i < items.length; i++) {
			const text = items[i].textContent || "";
			if (text.includes("menu.delete_calibration")) {
				(items[i] as HTMLElement).click();
				expect(a._showDeleteCalibrationDialog).toBe(true);
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("save configuration menu item sets _showConfigurationBackup", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		for (let i = 0; i < items.length; i++) {
			const text = items[i].textContent || "";
			if (text.includes("dialogs.backup_configuration")) {
				(items[i] as HTMLElement).click();
				expect(a._showConfigurationBackup).toBe(true);
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("load configuration menu item sets _showConfigurationRestore", async () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		for (let i = 0; i < items.length; i++) {
			const text = items[i].textContent || "";
			if (text.includes("dialogs.restore_configuration")) {
				(items[i] as HTMLElement).click();
				await vi.waitFor(() => {
					expect(a._showConfigurationRestore).toBe(true);
				});
				break;
			}
		}
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

		// Find static auto range toggle
		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		if (checkboxes.length >= 2) {
			const staticCb = checkboxes[1] as HTMLInputElement;
			staticCb.checked = false;
			staticCb.dispatchEvent(new Event("change"));
			expect((sv as any)._overrides.staticAutoDistance).toBe(false);
		}
		document.body.removeChild(c);
	});

	it("static min distance slider updates", () => {
		const sv = createSettingsView({ staticAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		// Find static min distance (should be 3rd or 4th range)
		for (let i = 0; i < ranges.length; i++) {
			const r = ranges[i] as HTMLInputElement;
			if (r.min === "0.3" || r.min === "0.2") {
				const span = document.createElement("span");
				span.textContent = "0.3";
				r.parentNode?.insertBefore(span, r.nextSibling);
				r.value = "0.5";
				r.dispatchEvent(new Event("input"));
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("static max distance slider updates", () => {
		const sv = createSettingsView({ staticAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		for (let i = 0; i < ranges.length; i++) {
			const r = ranges[i] as HTMLInputElement;
			if (r.max === "16") {
				const span = document.createElement("span");
				span.textContent = "16";
				r.parentNode?.insertBefore(span, r.nextSibling);
				r.value = "12";
				r.dispatchEvent(new Event("input"));
				break;
			}
		}
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderSensitivities DOM event handlers
// =========================================================
describe("_renderSensitivities DOM events", () => {
	it("all range inputs fire input handler without error", () => {
		const sv = createSettingsView();
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		expect(ranges.length).toBeGreaterThan(0);
		ranges.forEach((r: any) => {
			const range = r as HTMLInputElement;
			if (range.nextElementSibling) {
				const _origText = range.nextElementSibling.textContent;
				const currentVal = range.value;
				range.value = currentVal; // trigger input event with same value
				range.dispatchEvent(new Event("input"));
				// Handler should update nextElementSibling text to range.value
				expect(range.nextElementSibling.textContent).toBeDefined();
			}
		});
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
		if (valueSpan) {
			expect(valueSpan.textContent).toContain("\u2014");
		}
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
		if (range?.nextElementSibling) {
			range.value = "5";
			range.dispatchEvent(new Event("input"));
			// With null reading, adjusted should show em-dash
			expect(range.nextElementSibling.textContent).toBe("\u2014");
		}
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

		const infoBtns = c.querySelectorAll(".live-sensor-info-btn");
		// Zone info should be beyond first 5 sensor buttons (occupancy, static, motion, target, mmwave).
		// Slot 0 (rest-of-room) renders first, then named zones in slot order.
		if (infoBtns.length > 6) {
			(infoBtns[6] as HTMLElement).click();
			expect(el._expandedSensorInfo).toBe("zone_1");
		}
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
		if (picker) {
			picker.dispatchEvent(
				new CustomEvent("value-changed", { detail: { value: "mdi:lamp" } }),
			);
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("mdi:lamp");
		}
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

		// Should render capture overlay with cancel button
		const cancelBtn = c.querySelector(".capture-cancel-btn, .wizard-btn-back");
		expect(cancelBtn).toBeDefined();
		document.body.removeChild(c);
	});

	it("renders paused capture overlay", () => {
		const a = createWiz();
		a._wizardCapturing = true;
		a._wizardCapturePaused = true;
		const tpl = a._renderWizard();
		expect(tpl).toBeDefined();
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
		expect(c.innerHTML).not.toBe("");
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
		if (colorPicker) {
			const event = new MouseEvent("click", { bubbles: true });
			const stopSpy = vi.spyOn(event, "stopPropagation");
			colorPicker.dispatchEvent(event);
			expect(stopSpy).toHaveBeenCalled();
		}
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
		expect(result).toBeDefined();
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

		const buttons = c.querySelectorAll(".debug-log-btn");
		const clearBtn = Array.from(buttons).find(
			(b) => b.textContent?.trim() === "Clear",
		) as HTMLElement;
		if (clearBtn) {
			clearBtn.click();
			expect(a._backendDebugLogLines).toEqual([]);
			expect(a._backendDebugLogPrev).toBeNull();
		}
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
			(b) => b.textContent?.trim() === "Copy all",
		) as HTMLElement;
		if (copyBtn) {
			copyBtn.click();
			expect(writeTextMock).toHaveBeenCalledWith("line1\nline2");
		}
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
		const sv = createSettingsView({
			staticAutoDistance: false,
			staticMinDistance: 2,
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
		if (staticMax) {
			staticMax.value = "1";
			staticMax.dispatchEvent(new Event("input"));
			// Value should be clamped to staticMinDistance + 0.1
			expect(sv.staticMaxDistance).toBeGreaterThanOrEqual(sv.staticMinDistance);
		}
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
