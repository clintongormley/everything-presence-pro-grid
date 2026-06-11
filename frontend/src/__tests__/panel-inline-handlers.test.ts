/**
 * Tests for inline event handler logic and other uncovered code paths
 * in the panel component.
 */
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import {
	CELL_ROOM_BIT,
	GRID_CELL_COUNT,
	GRID_COLS,
	initGridFromRoom,
} from "../lib/grid.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
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
			name: "Test Sensor",
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
	a._temperatureOffset = 0;
	a._humidityOffset = 0;
	a._illuminanceOffset = 0;
	a._motionTimeout = 5;
	a._staticTimeout = 30;
	a._staticTriggerThreshold = 3;
	a._staticRenewThreshold = 3;
	a._staticOnDelay = 0;
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

describe("_onFurnitureDrag with active drag state", () => {
	it("handles move drag", () => {
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

		// Mock the grid element
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

		a._onFurnitureDrag({ clientX: 520, clientY: 310 });

		expect(a._dirty).toBe(true);
	});

	it("handles resize drag", () => {
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
			type: "resize",
			id: "f1",
			startX: 500,
			startY: 300,
			origX: 100,
			origY: 200,
			origW: 800,
			origH: 800,
			origRot: 0,
			handle: "se",
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

		a._onFurnitureDrag({ clientX: 520, clientY: 310 });

		expect(a._dirty).toBe(true);
	});

	it("handles rotate drag", () => {
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
			centerX: 500,
			centerY: 300,
			startAngle: 0,
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

		a._onFurnitureDrag({ clientX: 520, clientY: 310 });

		expect(a._dirty).toBe(true);
	});

	it("returns early when no grid element found", () => {
		const a = createPanel() as any;
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
				querySelector: () => null,
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		a._onFurnitureDrag({ clientX: 520, clientY: 310 });
		// Should not throw
		expect(a._dirty).toBe(false);
	});
});

describe("_saveSettings delegation", () => {
	it("delegates to _gridCtrl.saveSettings with payload", async () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { callWS };

		const payload = { motion_timeout: 10 };
		await a._saveSettings(payload);

		expect(callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/set_settings",
				mac: "AA:BB:CC:DD:EE:01",
				motion_timeout: 10,
			}),
		);
	});
});

describe("_applyLayout zone/furniture serialization", () => {
	it("serializes zone configs including threshold fields", async () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._zoneConfigs[1] = {
			name: "Kitchen",
			color: "#ff0000",
			type: "custom",
			trigger: 7,
			renew: 4,
			timeout: 15,
			handoff_timeout: 5,
		};
		// Set up a proper room grid and paint a cell with zone 1 so it doesn't get pruned
		a._grid = initGridFromRoom(3000, 4000);
		a._grid[5 * GRID_COLS + 5] = 0x03; // CELL_ROOM_BIT | (1 << CELL_ZONE_SHIFT)
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
				rotation: 45,
				lockAspect: false,
			},
		];

		a.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		const call = a.hass.callWS.mock.calls[0][0];
		// zone_slots is a length-8 array: slot 0 is the Zone0Config (room
		// boundary), slot 1 is named zone 1.
		expect(call.zone_slots).toHaveLength(8);
		expect(call.zone_slots[0]).toEqual(
			expect.objectContaining({ type: "default" }),
		);
		expect(call.zone_slots[1]).toEqual(
			expect.objectContaining({
				name: "Kitchen",
				type: "custom",
				trigger: 7,
			}),
		);
		expect(call.furniture).toHaveLength(1);
		expect(call.furniture[0].rotation).toBe(45);
	});
});

describe("_applyLayout removes furniture outside grid", () => {
	it("excludes furniture completely outside the visible grid bounds", async () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		// Set up a small 2x2 room in the grid (cols 9-10, rows 0-1)
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._grid[9] = CELL_ROOM_BIT;
		a._grid[10] = CELL_ROOM_BIT;
		a._grid[9 + GRID_COLS] = CELL_ROOM_BIT;
		a._grid[10 + GRID_COLS] = CELL_ROOM_BIT;
		a._roomWidth = 600; // 2 cells
		a._roomDepth = 600;
		a._furniture = [
			{
				id: "inside",
				type: "svg",
				icon: "armchair",
				label: "Inside",
				x: 0,
				y: 0,
				width: 300,
				height: 300,
				rotation: 0,
				lockAspect: false,
			},
			{
				id: "outside",
				type: "svg",
				icon: "bed-double",
				label: "Outside",
				x: 5000,
				y: 5000,
				width: 600,
				height: 600,
				rotation: 0,
				lockAspect: false,
			},
		];

		a.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		const call = a.hass.callWS.mock.calls[0][0];
		expect(call.furniture).toHaveLength(1);
		expect(call.furniture[0].icon).toBe("armchair");
		// Also verify panel state was updated
		expect(a._furniture).toHaveLength(1);
		expect(a._furniture[0].id).toBe("inside");
	});
});

describe("_wizardStartCapture cancellation (via EppWizard)", () => {
	it("cancels capture when _wizardCaptureCancelled is set", async () => {
		await import("../components/epp-wizard.js");
		const el = document.createElement("epp-wizard") as any;
		el.hass = { callWS: vi.fn().mockResolvedValue({}) };
		el.selectedMac = "";
		el.rawTargets = [{ raw_x: 100, raw_y: 200 }];
		el.sensorState = { occupancy: false };
		el.devices = [];
		el.localize = (k: string) => k;
		el._setupStep = "corners";
		el._wizardCornerIndex = 0;
		el._wizardCorners = [null, null, null, null];
		el._wizardCapturing = false;
		el._wizardCaptureCancelled = false;
		el._wizardCapturePaused = false;
		el._wizardCaptureProgress = 0;
		el._wizardOffsetSide = "";
		el._wizardOffsetFb = "";
		el._smoothBuffer = [];

		el._wizardStartCapture();
		expect(el._wizardCapturing).toBe(true);

		// Cancel immediately
		el._wizardCancelCapture();
		expect(el._wizardCapturing).toBe(false);
		expect(el._wizardCaptureCancelled).toBe(true);
	});
});

describe("_onFurniturePointerDown with rotate type", () => {
	it("computes start angle for rotation", () => {
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

		// Mock nested shadow DOM: host -> epp-grid -> epp-furniture-overlay -> .furniture-item.
		// The controller queries all .furniture-item elements and matches
		// dataset.id in JS (no id interpolation into the selector).
		const mockFurnitureItem = {
			dataset: { id: "f1" },
			getBoundingClientRect: () => ({
				left: 100,
				top: 100,
				width: 200,
				height: 200,
			}),
		};
		const overlayShadow = {
			querySelectorAll: (sel: string) =>
				sel === ".furniture-item" ? [mockFurnitureItem] : [],
		};
		const overlay = { shadowRoot: overlayShadow };
		const eppGridShadow = {
			querySelector: (sel: string) =>
				sel === "epp-furniture-overlay" ? overlay : null,
		};
		const eppGrid = { shadowRoot: eppGridShadow };
		Object.defineProperty(a, "shadowRoot", {
			value: {
				querySelector: (sel: string) => (sel === "epp-grid" ? eppGrid : null),
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		const addSpy = vi
			.spyOn(window, "addEventListener")
			.mockImplementation(() => {});

		const mockEvent = {
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
			clientX: 300,
			clientY: 200,
		};

		a._onFurniturePointerDown(mockEvent, "f1", "rotate");

		expect(a._dragState).not.toBeNull();
		expect(a._dragState.type).toBe("rotate");
		expect(a._dragState.centerX).toBe(200); // 100 + 200/2
		expect(a._dragState.centerY).toBe(200); // 100 + 200/2

		addSpy.mockRestore();
	});
});
