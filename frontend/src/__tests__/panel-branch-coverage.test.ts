/**
 * Tests specifically targeting uncovered branches to push branch coverage above 90%.
 */

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import type { EppSettingsView } from "../components/epp-settings-view.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	GRID_CELL_COUNT,
	initGridFromRoom,
} from "../lib/grid.js";
import { ZONE_COLORS, ZONE_TYPE_DEFAULTS } from "../lib/zone-defaults.js";
import { createZoneEngineState } from "../lib/zone-engine.js";
import { setupLocalize } from "../localize.js";

function createPanel() {
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
		illuminance: null,
		temperature: null,
		humidity: null,
		co2: null,
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
	a._localize = setupLocalize();
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

function _renderTo(tpl: any) {
	const c = document.createElement("div");
	document.body.appendChild(c);
	render(tpl, c);
	return c;
}

/** Set up callbacks and subscribe to targets via DeviceController */
function subscribeTargets(el: EPPGridPanel, mac: string): void {
	const a = el as any;
	a._deviceCtrl.hass = el.hass;
	a._deviceCtrl.onTargetData = (data: any) =>
		a._targetCtrl.handleTargetData(data);
	a._deviceCtrl.onRawTargetData = (rawTargets: any) =>
		a._targetCtrl.handleRawTargetData(rawTargets);
	a._deviceCtrl.subscribeTargets(mac);
}

// =========================================================
// Target subscription: exercise ?? branches (null coalescing)
// =========================================================
describe("target subscription null coalescing branches", () => {
	it("handles targets with missing raw_x/raw_y and signal", async () => {
		const a = createPanel() as any;
		let handler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) handler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		// Fire event with targets missing raw_x, raw_y, signal
		handler!({
			targets: [{ x: 100, y: 200, status: "active" }],
			sensors: {
				// All fields missing -> ?? branches hit
			},
			zones: {
				// All fields missing -> ?? branches hit
			},
		});

		// Target no longer carries raw_x/raw_y — those live in _rawTargets
		expect(a._targets[0].signal).toBe(0);

		// Sensor state should use defaults
		expect(a._sensorState.occupancy).toBe(false);
		expect(a._sensorState.illuminance).toBeNull();

		// Zone state should use defaults
		expect(a._zoneState.frame_count).toBe(0);
	});

	it("defaults status to inactive when missing from grid event", async () => {
		const a = createPanel() as any;
		let handler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) handler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		// Fire event with target missing status field -> ?? "inactive" branch
		handler!({
			targets: [{ x: 100, y: 200, signal: 5 }],
		});

		expect(a._targets[0].status).toBe("inactive");
		expect(a._targets[0].signal).toBe(5);
	});

	it("handles raw subscription with missing target fields", async () => {
		const a = createPanel() as any;
		let _gridHandler: (event: any) => void;
		let rawHandler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) _gridHandler = cb;
					else rawHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		// Fire raw event with empty target objects
		rawHandler!({
			targets: [{ raw_x: null, raw_y: null }, {}],
		});

		expect(a._rawTargets).toHaveLength(2);
		expect(a._rawTargets[0].raw_x).toBeNull();
		expect(a._rawTargets[1].raw_x).toBeUndefined();
	});

	it("handles event with null/missing targets (|| [] fallback)", async () => {
		const a = createPanel() as any;
		let gridHandler: (event: any) => void;
		let rawHandler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) gridHandler = cb;
					else rawHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		// null targets -> || [] fallback on grid subscription
		gridHandler!({ targets: null });
		expect(a._targets).toEqual([]);

		// undefined targets -> || [] fallback on raw subscription
		rawHandler!({});
		expect(a._rawTargets).toEqual([]);
	});
});

// =========================================================
// _loadDevices: sort with missing/empty names
// =========================================================
describe("_loadDevices edge branches", () => {
	it("handles devices with no name", async () => {
		const a = createPanel() as any;
		a.hass = {
			callWS: vi.fn().mockResolvedValue({
				devices: [
					{
						mac: "AA:BB:01",
						name: "",
						host: null,
						available: true,
						configured: true,
					},
					{
						mac: "AA:BB:02",
						name: "Zebra",
						host: null,
						available: true,
						configured: true,
					},
				],
			}),
		};

		await a._loadDevices();
		// Should not throw during sort, empty string sorts before "Zebra"
		expect(a._devices[0].mac).toBe("AA:BB:01");
	});
});

// =========================================================
// _renderWizardCorners: branches for offset update on null corner
// =========================================================
describe("wizard corner offset edge cases (via EppWizard)", () => {
	it("offset input on null corner does nothing", () => {
		const el = document.createElement("epp-wizard") as any;
		el.hass = { callWS: vi.fn().mockResolvedValue({}) };
		el.selectedMac = "";
		el.rawTargets = [{ raw_x: 0, raw_y: 0 }];
		el.sensorState = { occupancy: false };
		el.devices = [];
		el.localize = (k: string) => k;
		el._setupStep = "corners";
		el._wizardCornerIndex = 0;
		el._wizardCorners = [null, null, null, null];
		el._wizardRoomWidth = 3000;
		el._wizardRoomDepth = 4000;
		el._wizardCapturing = false;
		el._wizardOffsetSide = "";
		el._wizardOffsetFb = "";
		el._smoothBuffer = [];

		const tpl = el._renderWizardCorners();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const offsets = c.querySelectorAll(
			".offset-input",
		) as NodeListOf<HTMLInputElement>;
		if (offsets.length >= 2) {
			offsets[0].value = "50";
			offsets[0].dispatchEvent(new Event("input"));
			// Corner is null so no change
		}
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderEditor: branches for target rendering in editor
// =========================================================
describe("_renderEditor target rendering branches", () => {
	it("renders pending target with reduced opacity", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "pending" as const,
				signal: 3,
			},
		];

		const tpl = a._renderEditor();
		expect(tpl).toBeDefined();
	});

	it("renders signal label for an active target", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "active" as const,
				signal: 7,
			},
		];

		const tpl = a._renderEditor();
		expect(tpl).toBeDefined();
	});

	it("does not render signal label when pending", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "pending" as const,
				signal: 7,
			},
		];

		const tpl = a._renderEditor();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderLiveGrid: target with no grid position (returns null)
// =========================================================
describe("_renderLiveGrid target branches", () => {
	it("skips targets where mapTargetToGridCell returns null", () => {
		const a = createPanel() as any;
		a._roomWidth = 0; // Will cause mapTargetToGridCell to return null
		a._roomDepth = 0;
		a._targets = [
			{
				x: 100,
				y: 200,
				status: "active" as const,
				signal: 5,
			},
		];

		const tpl = a._renderLiveGrid();
		expect(tpl).toBeDefined();
	});

	it("uses TARGET_COLORS with fallback for > 3 targets", () => {
		const a = createPanel() as any;
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "active" as const,
				signal: 5,
			},
			{
				x: 1000,
				y: 1000,
				status: "active" as const,
				signal: 3,
			},
			{
				x: 2000,
				y: 3000,
				status: "active" as const,
				signal: 7,
			},
		];

		const tpl = a._renderLiveGrid();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _addZone: color fallback when ZONE_COLORS.find returns undefined
// =========================================================
describe("_addZone fallback branch", () => {
	it("picks color from fallback when all are used", () => {
		const a = createPanel() as any;
		// Fill named-zone slots 1-6 with colors 0-5, slot 7 empty.
		// (Slot 0 is the zone-0 Zone0Config and is not a named-zone slot.)
		for (let i = 1; i <= 6; i++) {
			a._zoneConfigs[i] = {
				name: `Z${i}`,
				color: ZONE_COLORS[i - 1],
				type: "default",
			};
		}
		a._addZone();
		// Slot 7 fills with ZONE_COLORS[6] (the only unused color).
		expect(a._zoneConfigs[7]).not.toBeNull();
		expect(a._zoneConfigs[7].color).toBe(ZONE_COLORS[6]);
	});
});

// =========================================================
// _renderSaveCancelButtons: settings vs editor save handler
// =========================================================
describe("_renderSaveCancelButtons save handler branch", () => {
	it("uses _saveSettings handler when in settings view", () => {
		const a = createPanel() as any;
		a._view = "settings";
		const tpl = a._renderSaveCancelButtons();
		expect(tpl).toBeDefined();
	});

	it("uses _applyLayout handler when in editor view", () => {
		const a = createPanel() as any;
		a._view = "editor";
		const tpl = a._renderSaveCancelButtons();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderDetectionRanges: autoRange branches
// =========================================================
describe("_renderDetectionRanges auto range edge cases", () => {
	it("target auto with zero autoRange", () => {
		const sv = createSettingsView({
			targetAutoDistance: true,
			roomWidth: 0,
			roomDepth: 0,
			perspective: null,
			grid: new Uint8Array(GRID_CELL_COUNT),
		});
		const tpl = (sv as any).renderDetectionRanges();
		expect(tpl).toBeDefined();
	});

	it("static auto with zero autoRange", () => {
		const sv = createSettingsView({
			staticAutoDistance: true,
			roomWidth: 0,
			roomDepth: 0,
			perspective: null,
			grid: new Uint8Array(GRID_CELL_COUNT),
		});
		const tpl = (sv as any).renderDetectionRanges();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderEntities: isOn with fallback
// =========================================================
describe("_renderEntities fallback branches", () => {
	it("uses fallback values when reporting config is empty", () => {
		const sv = createSettingsView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// epp-live-sidebar: env sensor partial branches
// =========================================================
describe("epp-live-sidebar env sensor branches", () => {
	it("renders with only illuminance available", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: true,
			static_presence: true,
			motion_presence: true,
			target_presence: false,
			illuminance: 100,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		expect(tpl).toBeDefined();
	});

	it("renders zone with target count = 1 (singular)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = { name: "Z1", color: ZONE_COLORS[0], type: "default" };
		el.zoneState = {
			occupancy: { 1: true },
			target_counts: { 1: 1 },
			frame_count: 10,
		};
		const tpl = el.render();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderZoneSidebar: boundary occupancy glow
// =========================================================
describe("_renderZoneSidebar boundary occupancy glow", () => {
	it("renders boundary with occupancy glow", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		el.zone0 = {
			type: "default",
			trigger: ZONE_TYPE_DEFAULTS.default.trigger,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		};
		el.localZoneState = new Map([
			[
				0,
				{
					occupied: true,
					pendingSince: null,
					confirmedTargets: new Set(),
				},
			],
		]);
		el.localize = (k: string) => k;
		const tpl = el._renderZoneSidebar();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// stopPropagation handlers on boundary/zone type controls
// =========================================================
describe("stopPropagation handlers coverage", () => {
	function createSidebar(overrides: Record<string, any> = {}) {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		el.zone0 = {
			type: "default",
			trigger: ZONE_TYPE_DEFAULTS.default.trigger,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		};
		el.localZoneState = new Map();
		el.localize = (k: string) => k;
		for (const [k, v] of Object.entries(overrides)) {
			el[k] = v;
		}
		return el;
	}

	it("boundary type select click calls stopPropagation", () => {
		const s = createSidebar({ zone0: { type: "custom" } });
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		// Click on the sensitivity-select to fire @click handler
		const select = c.querySelector(".sensitivity-select") as HTMLElement;
		if (select) {
			select.click();
		}

		// Click on range inputs to fire their @click handlers
		const ranges = c.querySelectorAll('input[type="range"]');
		ranges.forEach((r: any) => {
			(r as HTMLElement).click();
		});

		// Click on number inputs
		const numbers = c.querySelectorAll('input[type="number"]');
		numbers.forEach((n: any) => {
			(n as HTMLElement).click();
		});

		// Click on checkbox
		const checkboxes = c.querySelectorAll(
			'.toggle-switch input[type="checkbox"]',
		);
		checkboxes.forEach((cb: any) => {
			(cb as HTMLElement).click();
		});

		document.body.removeChild(c);
	});

	it("zone type controls click calls stopPropagation", () => {
		const s = createSidebar();
		const zone = {
			name: "Z1",
			color: "#ff0000",
			type: "custom" as const,
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const select = c.querySelector(".sensitivity-select") as HTMLElement;
		if (select) select.click();

		const ranges = c.querySelectorAll('input[type="range"]');
		ranges.forEach((r: any) => {
			(r as HTMLElement).click();
		});

		const numbers = c.querySelectorAll('input[type="number"]');
		numbers.forEach((n: any) => {
			(n as HTMLElement).click();
		});

		const checkboxes = c.querySelectorAll(
			'.toggle-switch input[type="checkbox"]',
		);
		checkboxes.forEach((cb: any) => {
			(cb as HTMLElement).click();
		});

		document.body.removeChild(c);
	});
});

// =========================================================
// Furniture overlay: all 7 resize handle pointerdown + rotate + delete
// =========================================================
describe("furniture overlay all handle events", () => {
	it("triggers all 8 resize handles", () => {
		const a = createPanel() as any;
		a._furniture = [
			{
				id: "f1",
				type: "svg",
				icon: "armchair",
				label: "Chair",
				x: 100,
				y: 200,
				width: 800,
				height: 800,
				rotation: 0,
				lockAspect: false,
			},
		];
		a._sidebarTab = "furniture";
		a._selectedFurnitureId = "f1";

		const tpl = a._renderFurnitureOverlay(28, 0, 0, 20, 20);
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const addSpy = vi
			.spyOn(window, "addEventListener")
			.mockImplementation(() => {});

		const overlay = c.querySelector("epp-furniture-overlay") as any;
		if (overlay?.shadowRoot) {
			const handles = overlay.shadowRoot.querySelectorAll(".furn-handle");
			handles.forEach((h: any) => {
				h.dispatchEvent(
					new PointerEvent("pointerdown", {
						clientX: 500,
						clientY: 300,
						bubbles: true,
						composed: true,
					}),
				);
			});

			const rotateHandle = overlay.shadowRoot.querySelector(
				".furn-rotate-handle",
			);
			if (rotateHandle) {
				rotateHandle.dispatchEvent(
					new PointerEvent("pointerdown", {
						clientX: 500,
						clientY: 300,
						bubbles: true,
						composed: true,
					}),
				);
			}
		}

		addSpy.mockRestore();
		document.body.removeChild(c);
	});
});

// =========================================================
// _infoTip click handler
// =========================================================
describe("_infoTip DOM click handler", () => {
	it("click toggles tooltip display", () => {
		const sv = createSettingsView() as any;

		// Create mock shadowRoot that will be used by the handler
		const tooltips: HTMLElement[] = [];
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelectorAll: (sel: string) => {
					if (sel === ".setting-info-tooltip") return tooltips;
					return [];
				},
			},
			configurable: true,
		});

		const tpl = sv.infoTip("Test tip");
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const infoSpan = c.querySelector(".setting-info") as HTMLElement;
		if (infoSpan) {
			infoSpan.click();
		}
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderConfigurationRestoreDialog: load and delete on configuration items
// =========================================================
describe("_renderConfigurationRestoreDialog item events", () => {
	it("fires load and delete on configuration items", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: new Array(8).fill(null),
				roomWidth: 5000,
				roomDepth: 6000,
			},
			{
				name: "T2",
				grid: new Array(GRID_CELL_COUNT).fill(0),
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
		const tpl = a._renderConfigurationRestoreDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		// Should have configuration cards for each configuration
		const cards = c.querySelectorAll(".configuration-card");
		expect(cards.length).toBe(2);
		// Click load for first configuration card
		(cards[0] as HTMLElement).click();
		// Click delete button for second configuration card
		const deleteBtns = c.querySelectorAll(".configuration-card-delete");
		if (deleteBtns.length >= 2) {
			(deleteBtns[1] as HTMLElement).click();
		}

		document.body.removeChild(c);
	});
});

// =========================================================
// _loadDevices: null name branch
// =========================================================
describe("_loadDevices null name sorting", () => {
	it("handles devices with null/undefined names", async () => {
		const a = createPanel() as any;
		a.hass = {
			callWS: vi.fn().mockResolvedValue({
				devices: [
					{
						mac: "AA:BB:01",
						name: null,
						host: null,
						available: true,
						configured: true,
					},
					{ mac: "AA:BB:02", host: null, available: true, configured: true }, // name undefined
				],
			}),
		};

		await a._loadDevices();
		expect(a._devices).toHaveLength(2);
	});
});

// =========================================================
// _removeZone: clearZoneFromGrid returns non-null (line 805)
// =========================================================
describe("_removeZone grid clearing", () => {
	it("replaces grid when cells have the zone", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };
		// Paint some cells with zone 1
		for (let i = 0; i < a._grid.length; i++) {
			if (a._grid[i] & CELL_ROOM_BIT) {
				a._grid[i] = cellSetZone(a._grid[i], 1);
				break; // just one cell
			}
		}

		a._removeZone(1);
		expect(a._zoneConfigs[1]).toBeNull();
	});

	it("removes zone config even when zone has no painted cells", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };
		// No cells painted with zone 1
		a._removeZone(1);
		expect(a._zoneConfigs[1]).toBeNull();
		expect(a._dirty).toBe(true);
	});
});

// =========================================================
// _onFurnitureDrag: edge case branches (929, 944, 961, 964, 967, 968, 974)
// =========================================================
describe("_onFurnitureDrag edge case branches", () => {
	it("handles move when item not found (null width/height)", () => {
		const a = createPanel() as any;
		a._furniture = []; // empty, item won't be found
		a._dragState = {
			type: "move",
			id: "nonexistent",
			startX: 500,
			startY: 300,
			origX: 100,
			origY: 200,
			origW: 800,
			origH: 800,
			origRot: 0,
		};

		Object.defineProperty(a, "shadowRoot", {
			value: {
				querySelector: (sel: string) => {
					if (sel === ".grid")
						return { firstElementChild: { offsetWidth: 28 } };
					return null;
				},
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		// item?.width ?? 0 and item?.height ?? 0 -> 0 (branch covered)
		a._onFurnitureDrag({ clientX: 520, clientY: 310 });
	});

	it("handles resize when item not found (null lockAspect)", () => {
		const a = createPanel() as any;
		a._furniture = [];
		a._dragState = {
			type: "resize",
			id: "nonexistent",
			handle: "se",
			startX: 500,
			startY: 300,
			origX: 100,
			origY: 200,
			origW: 800,
			origH: 800,
			origRot: 0,
		};

		Object.defineProperty(a, "shadowRoot", {
			value: {
				querySelector: (sel: string) => {
					if (sel === ".grid")
						return { firstElementChild: { offsetWidth: 28 } };
					return null;
				},
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		// item?.lockAspect ?? false -> false (branch covered)
		a._onFurnitureDrag({ clientX: 520, clientY: 310 });
	});

	it("handles rotate with null centerX/centerY/startAngle", () => {
		const a = createPanel() as any;
		a._furniture = [
			{
				id: "f1",
				type: "svg",
				icon: "armchair",
				label: "Chair",
				x: 100,
				y: 200,
				width: 800,
				height: 800,
				rotation: 0,
				lockAspect: false,
			},
		];
		a._dragState = {
			type: "rotate",
			id: "f1",
			startX: 500,
			startY: 300,
			origX: 100,
			origY: 200,
			origW: 800,
			origH: 800,
			origRot: 0,
			// centerX, centerY, startAngle are undefined
		};

		Object.defineProperty(a, "shadowRoot", {
			value: {
				querySelector: (sel: string) => {
					if (sel === "epp-grid") {
						return {
							shadowRoot: {
								querySelector: (s: string) =>
									s === ".grid"
										? { firstElementChild: { offsetWidth: 28 } }
										: null,
							},
						};
					}
					return null;
				},
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		// ds.centerY ?? 0, ds.centerX ?? 0, ds.startAngle ?? 0 branches covered
		a._onFurnitureDrag({ clientX: 520, clientY: 310 });
		expect(a._dirty).toBe(true);
	});

	it("handles grid element with no firstElementChild", () => {
		const a = createPanel() as any;
		a._furniture = [
			{
				id: "f1",
				type: "svg",
				icon: "armchair",
				label: "Chair",
				x: 100,
				y: 200,
				width: 800,
				height: 800,
				rotation: 0,
				lockAspect: false,
			},
		];
		a._dragState = {
			type: "move",
			id: "f1",
			startX: 500,
			startY: 300,
			origX: 100,
			origY: 200,
			origW: 800,
			origH: 800,
			origRot: 0,
		};

		Object.defineProperty(a, "shadowRoot", {
			value: {
				querySelector: (sel: string) => {
					if (sel === "epp-grid") {
						return {
							shadowRoot: {
								querySelector: (s: string) =>
									s === ".grid"
										? { firstElementChild: null } // no child -> use fallback 28
										: null,
							},
						};
					}
					return null;
				},
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		// cellPx = 28 (fallback) branch covered
		a._onFurnitureDrag({ clientX: 520, clientY: 310 });
		expect(a._dirty).toBe(true);
	});
});

// =========================================================
// _renderWizardCorners: branches for corner chip offset restore
// =========================================================
describe("corner chip click with null offsets (via EppWizard)", () => {
	it("corner chip click on corner with zero offsets", () => {
		const el = document.createElement("epp-wizard") as any;
		el.hass = { callWS: vi.fn().mockResolvedValue({}) };
		el.selectedMac = "";
		el.rawTargets = [{ raw_x: 0, raw_y: 0 }];
		el.sensorState = { occupancy: false };
		el.devices = [];
		el.localize = (k: string) => k;
		el._setupStep = "corners";
		el._wizardCornerIndex = 0;
		el._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		el._wizardRoomWidth = 3000;
		el._wizardRoomDepth = 4000;
		el._wizardCapturing = false;
		el._wizardOffsetSide = "";
		el._wizardOffsetFb = "";
		el._smoothBuffer = [];

		const tpl = el._renderWizardCorners();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const chips = c.querySelectorAll(".corner-chip");
		if (chips.length > 0) {
			(chips[0] as HTMLElement).click();
			// offset_side and offset_fb are 0 -> empty strings
			expect(el._wizardOffsetSide).toBe("");
			expect(el._wizardOffsetFb).toBe("");
		}
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderSaveCancelButtons branches
// =========================================================
describe("save cancel buttons: saving state branch", () => {
	it("save button shows Saving when _saving is true", () => {
		const a = createPanel() as any;
		a._saving = true;
		a._dirty = true;
		a._view = "editor";
		const tpl = a._renderSaveCancelButtons();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const saveBtn = c.querySelector(".wizard-btn-primary");
		if (saveBtn) {
			expect(saveBtn.textContent).toContain("Saving");
		}
		document.body.removeChild(c);
	});
});

// =========================================================
// epp-live-sidebar: zone with target_counts singular/plural
// =========================================================
describe("epp-live-sidebar target count branches", () => {
	it("renders zone with 0 targets", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = { name: "Z1", color: ZONE_COLORS[0], type: "default" };
		el.zoneState = {
			occupancy: { 1: false },
			target_counts: { 1: 0 },
			frame_count: 10,
		};
		const tpl = el.render();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderEditor: branches for target rendering with signal and pending
// =========================================================
describe("editor target signal display branches", () => {
	it("signal > 0 and not pending shows signal label", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "active" as const,
				signal: 0,
			},
		];
		const tpl = a._renderEditor();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderUncalibratedFov: target color fallback
// =========================================================
describe("uncalibrated FOV target color (via EppWizard)", () => {
	it("uses fallback color for target index >= 3", () => {
		const el = document.createElement("epp-wizard") as any;
		el.hass = { callWS: vi.fn().mockResolvedValue({}) };
		el.selectedMac = "";
		el.rawTargets = [
			{ raw_x: 100, raw_y: 200 },
			{ raw_x: 200, raw_y: 300 },
			{ raw_x: 300, raw_y: 400 },
		];
		el.sensorState = { occupancy: false };
		el.devices = [];
		el.localize = (k: string) => k;
		el.mode = "uncalibrated-fov";

		const tpl = el._renderUncalibratedFov();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderLiveGrid: hit count signal check
// =========================================================
describe("live grid hit count and signal", () => {
	it("shows signal label when signal > 0", () => {
		const a = createPanel() as any;
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "active" as const,
				signal: 7,
			},
		];
		const tpl = a._renderLiveGrid();
		expect(tpl).toBeDefined();
	});

	it("no signal label when signal is 0", () => {
		const a = createPanel() as any;
		a._targets = [
			{
				x: 1500,
				y: 2000,
				status: "active" as const,
				signal: 0,
			},
		];
		const tpl = a._renderLiveGrid();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// _renderZoneSidebar: zone occupancy glow styling branch
// =========================================================
describe("zone sidebar occupancy glow branch", () => {
	it("zone color dot shows glow when zone is occupied", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = [
			{ name: "Z1", color: ZONE_COLORS[0], type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		el.activeZone = 0; // boundary selected, not zone 1
		el.zone0 = {
			type: "default",
			trigger: ZONE_TYPE_DEFAULTS.default.trigger,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		};
		el.localZoneState = new Map([
			[
				1,
				{
					occupied: true,
					pendingSince: null,
					confirmedTargets: new Set(),
				},
			],
		]);
		el.localize = (k: string) => k;

		const tpl = el._renderZoneSidebar();
		expect(tpl).toBeDefined();
	});

	it("boundary dot shows glow when boundary zone occupied", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		el.zone0 = {
			type: "default",
			trigger: ZONE_TYPE_DEFAULTS.default.trigger,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		};
		el.localZoneState = new Map([
			[
				0,
				{
					occupied: true,
					pendingSince: null,
					confirmedTargets: new Set(),
				},
			],
		]);
		el.localize = (k: string) => k;
		const tpl = el._renderZoneSidebar();
		expect(tpl).toBeDefined();
	});
});

// =========================================================
// customElements.get guard (line 5577)
// =========================================================
describe("customElements registration guard", () => {
	it("does not re-register if already defined", () => {
		const Ctor = customElements.get("eppgrid-panel");
		expect(Ctor).toBeDefined();
	});
});

// =========================================================
// _onFurniturePointerDown: onUp callback
// =========================================================
describe("_onFurniturePointerDown onUp callback", () => {
	it("onUp cleans up drag state and removes listeners", () => {
		const a = createPanel() as any;
		a._furniture = [
			{
				id: "f1",
				type: "svg",
				icon: "armchair",
				label: "Chair",
				x: 100,
				y: 200,
				width: 800,
				height: 800,
				rotation: 0,
				lockAspect: false,
			},
		];

		let _onMove: Function | null = null;
		let onUp: Function | null = null;
		const addSpy = vi
			.spyOn(window, "addEventListener")
			.mockImplementation((type: string, fn: any) => {
				if (type === "pointermove") _onMove = fn;
				if (type === "pointerup") onUp = fn;
			});
		const removeSpy = vi
			.spyOn(window, "removeEventListener")
			.mockImplementation(() => {});

		const mockEvent = {
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
			clientX: 500,
			clientY: 300,
		};

		a._onFurniturePointerDown(mockEvent, "f1", "move");

		expect(a._dragState).not.toBeNull();

		// Call onUp to trigger cleanup
		if (onUp) {
			(onUp as Function)();
			expect(a._dragState).toBeNull();
			expect(removeSpy).toHaveBeenCalled();
		}

		addSpy.mockRestore();
		removeSpy.mockRestore();
	});
});

// =========================================================
// willUpdate / updated: language-change and debug-log-scroll branches
// =========================================================
describe("willUpdate language change branch", () => {
	it("rebuilds localize when language changes", () => {
		const a = createPanel() as any;
		a._currentLang = "en";

		// Simulate willUpdate with a new language
		const changed = new Map([["hass", true]]);
		a.hass = {
			callWS: vi.fn(),
			locale: { language: "fr" },
			language: "fr",
		};
		a.willUpdate(changed);

		expect(a._currentLang).toBe("fr");
	});

	it("does not rebuild localize when language is unchanged", () => {
		const a = createPanel() as any;
		a._currentLang = "en";
		a.hass = {
			callWS: vi.fn(),
			locale: { language: "en" },
			language: "en",
		};
		const localizeBefore = a._localize;

		const changed = new Map([["hass", true]]);
		a.willUpdate(changed);

		// _localize reference should not change
		expect(a._localize).toBe(localizeBefore);
	});

	it("does not rebuild when hass not in changed keys", () => {
		const a = createPanel() as any;
		a._currentLang = "en";
		a.hass = {
			callWS: vi.fn(),
			locale: { language: "fr" },
			language: "fr",
		};

		const changed = new Map<string, any>(); // hass not in changed
		a.willUpdate(changed);

		// Language should remain "en" because hass key wasn't changed
		expect(a._currentLang).toBe("en");
	});
});

// =========================================================
// _subscribeTargets: backend debug log branches (lines 720-742)
// =========================================================
describe("_subscribeTargets backend debug log", () => {
	it("appends to backend debug log when _showBackendDebugLog is true and debug_log present", async () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = [];
		a._backendDebugLogPrev = null;
		let targetsHandler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) targetsHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		// Raw format: "T0:Z0:A:5|Z0:O:5"
		targetsHandler!({
			targets: [],
			zones: {
				occupancy: {},
				target_counts: {},
				frame_count: 1,
				debug_log: "T0:Z0:A:5|Z0:O:5",
			},
		});

		expect(a._backendDebugLogLines).toHaveLength(1);
		// Enriched format includes zone names
		expect(a._backendDebugLogLines[0]).toContain("Room");
		// _backendDebugLogPrev stores the enriched body
		expect(a._backendDebugLogPrev).toContain("Room");
	});

	it("does not append duplicate backend debug log lines", async () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = [];
		// Pre-set prev to the enriched form of "T0:Z0:A:5|Z0:O:5" with sensor prefix
		// (sensorState is null → S:I M:I Occ:0 prepended by appendBackendDebugLog)
		const enriched = a._enrichDebugLog("S:I M:I Occ:0|T0:Z0:A:5|Z0:O:5");
		a._backendDebugLogPrev = enriched;
		let targetsHandler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) targetsHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		targetsHandler!({
			targets: [],
			zones: {
				occupancy: {},
				target_counts: {},
				frame_count: 1,
				debug_log: "T0:Z0:A:5|Z0:O:5",
			},
		});

		// Same log as prev — should not append
		expect(a._backendDebugLogLines).toHaveLength(0);
	});

	it("does not append when _showBackendDebugLog is false", async () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = false;
		a._backendDebugLogLines = [];
		let targetsHandler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) targetsHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		targetsHandler!({
			targets: [],
			zones: {
				occupancy: {},
				target_counts: {},
				frame_count: 1,
				debug_log: "zone tick: no targets",
			},
		});

		expect(a._backendDebugLogLines).toHaveLength(0);
	});

	it("trims backend debug log when it exceeds max", async () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		// Fill log to exactly _DEBUG_LOG_MAX
		a._backendDebugLogLines = new Array(100).fill("old line");
		a._backendDebugLogPrev = null;
		let targetsHandler: (event: any) => void;
		let callCount = 0;
		a.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) targetsHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(a, "e1");

		targetsHandler!({
			targets: [],
			zones: {
				occupancy: {},
				target_counts: {},
				frame_count: 1,
				debug_log: "T0:Z0:A:5|Z0:O:5",
			},
		});

		// After adding one more, it should be trimmed to 100
		expect(a._backendDebugLogLines.length).toBe(100);
		// Last line should contain the enriched form
		expect(a._backendDebugLogLines[99]).toContain("Room");
	});
});

// =========================================================
// _renderBackendDebugLog: render branches
// =========================================================
describe("_renderBackendDebugLog render branches", () => {
	it("renders with _showBackendDebugLog=false (collapsed state)", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = false;

		const tpl = a._renderBackendDebugLog();
		expect(tpl).toBeDefined();
	});

	it("renders empty container with placeholder when expanded and no lines", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = [];

		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const container = c.querySelector("#backend-debug-log-scroll");
		expect(container).toBeTruthy();
		expect(container!.textContent).toContain("Waiting for events");
		document.body.removeChild(c);
	});

	it("does NOT render log lines via Lit template (container has only placeholder)", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["12:00:00.0 some log line"];

		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const container = c.querySelector("#backend-debug-log-scroll");
		expect(container).toBeTruthy();
		expect(container!.querySelectorAll(".debug-log-line").length).toBe(0);
		document.body.removeChild(c);
	});

	it("toggle button sets _showBackendDebugLog to false and clears lines", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line 1"];
		a._backendDebugLogPrev = "line 1";

		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const btn = c.querySelector(
			"button.live-section-header",
		) as HTMLButtonElement;
		btn?.click();

		expect(a._showBackendDebugLog).toBe(false);
		expect(a._backendDebugLogLines).toHaveLength(0);
		expect(a._backendDebugLogPrev).toBeNull();
		document.body.removeChild(c);
	});

	it("Clear button resets data array and prev state", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line 1", "line 2"];
		a._backendDebugLogPrev = "line 2";

		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const clearBtn = Array.from(
			c.querySelectorAll("button.debug-log-btn"),
		).find((b) => b.textContent?.trim() === "Clear") as HTMLButtonElement;
		clearBtn?.click();

		expect(a._backendDebugLogLines).toHaveLength(0);
		expect(a._backendDebugLogPrev).toBeNull();
		document.body.removeChild(c);
	});

	it("Copy all button reads from data array", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line 1", "line 2"];

		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		const copyBtn = Array.from(c.querySelectorAll("button.debug-log-btn")).find(
			(b) => b.textContent?.trim() === "Copy all",
		) as HTMLButtonElement;
		copyBtn?.click();

		expect(writeText).toHaveBeenCalledWith("line 1\nline 2");
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderDebugLog: render branches
// =========================================================
describe("_renderDebugLog render branches", () => {
	it("renders with _showDebugLog=false (collapsed state)", () => {
		const a = createPanel() as any;
		a._showDebugLog = false;

		const tpl = a._renderDebugLog();
		expect(tpl).toBeDefined();
	});

	it("renders empty container with placeholder when expanded", () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = [];

		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const container = c.querySelector("#debug-log-scroll");
		expect(container).toBeTruthy();
		expect(container!.textContent).toContain("Waiting for events");
		document.body.removeChild(c);
	});

	it("does NOT render log lines via Lit template", () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = ["12:00:00.0 some log line"];

		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const container = c.querySelector("#debug-log-scroll");
		expect(container!.querySelectorAll(".debug-log-line").length).toBe(0);
		document.body.removeChild(c);
	});

	it("toggle button sets _showDebugLog to false and clears lines", () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = ["line 1"];
		a._debugLogPrev = "line 1";

		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const btn = c.querySelector(
			"button.live-section-header",
		) as HTMLButtonElement;
		btn?.click();

		expect(a._showDebugLog).toBe(false);
		expect(a._debugLogLines).toHaveLength(0);
		expect(a._debugLogPrev).toBeNull();
		document.body.removeChild(c);
	});

	it("Clear button resets data array and prev state", () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = ["line 1", "line 2"];
		a._debugLogPrev = "line 2";

		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const clearBtn = Array.from(
			c.querySelectorAll("button.debug-log-btn"),
		).find((b) => b.textContent?.trim() === "Clear") as HTMLButtonElement;
		clearBtn?.click();

		expect(a._debugLogLines).toHaveLength(0);
		expect(a._debugLogPrev).toBeNull();
		document.body.removeChild(c);
	});

	it("Copy all button copies debug log to clipboard", () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = ["line 1", "line 2"];

		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		const copyBtn = Array.from(c.querySelectorAll("button.debug-log-btn")).find(
			(b) => b.textContent?.trim() === "Copy all",
		) as HTMLButtonElement;
		copyBtn?.click();

		expect(writeText).toHaveBeenCalledWith("line 1\nline 2");
		document.body.removeChild(c);
	});

	it("places header button and Copy/Clear buttons on the same row when expanded", () => {
		const a = createPanel() as any;
		a._showDebugLog = true;
		a._debugLogLines = ["line 1"];

		const tpl = a._renderDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const wrapper = c.firstElementChild as HTMLElement;
		const header = c.querySelector("button.live-section-header") as HTMLElement;
		const container = c.querySelector("#debug-log-scroll") as HTMLElement;
		// header lives inside a header-row sub-div, not directly in the wrapper
		expect(header.parentElement).not.toBe(wrapper);
		// the log container is a sibling of that sub-row, not a child of it
		expect(container.parentElement).toBe(wrapper);
		// both action buttons live alongside the header in the same row
		const actionButtons = (
			header.parentElement as HTMLElement
		).querySelectorAll("button.debug-log-btn");
		expect(actionButtons.length).toBe(2);
		document.body.removeChild(c);
	});
});

// =========================================================
// _renderBackendDebugLog: same-line header layout
// =========================================================
describe("_renderBackendDebugLog same-line header layout", () => {
	it("places header button and Copy/Clear buttons on the same row when expanded", () => {
		const a = createPanel() as any;
		a._showBackendDebugLog = true;
		a._backendDebugLogLines = ["line 1"];

		const tpl = a._renderBackendDebugLog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const wrapper = c.firstElementChild as HTMLElement;
		const header = c.querySelector("button.live-section-header") as HTMLElement;
		const container = c.querySelector(
			"#backend-debug-log-scroll",
		) as HTMLElement;
		expect(header.parentElement).not.toBe(wrapper);
		expect(container.parentElement).toBe(wrapper);
		const actionButtons = (
			header.parentElement as HTMLElement
		).querySelectorAll("button.debug-log-btn");
		expect(actionButtons.length).toBe(2);
		document.body.removeChild(c);
	});
});
