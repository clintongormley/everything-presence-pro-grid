import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { mmToPx, pxToMm } from "../lib/furniture.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";
import { getZoneThresholds, resolveZoneParams } from "../lib/zone-defaults.js";
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
			name: "Test",
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
	return el;
}

// The panel's accordion toggling lives in <epp-settings-view> (its
// toggleAccordion + the panel's @accordion-toggle listener); the panel's
// duplicate _toggleAccordion was dead code and has been removed.

describe("_getRoomBounds", () => {
	it("returns bounds for empty grid", () => {
		const a = createPanel() as any;
		const result = a._getRoomBounds();
		expect(result).toHaveProperty("minCol");
		expect(result).toHaveProperty("maxCol");
		expect(result).toHaveProperty("minRow");
		expect(result).toHaveProperty("maxRow");
	});
});

describe("mmToPx and pxToMm (lib/furniture)", () => {
	it("converts mm to px", () => {
		// mmToPx formula: (mm / 300) * (cellPx + 1)
		// 300mm with cellPx=28 -> (300/300) * 29 = 29
		const px = mmToPx(300, 28);
		expect(px).toBeCloseTo(29, 0);
	});

	it("converts px to mm", () => {
		// pxToMm formula: (px / (cellPx + 1)) * 300
		// 29px with cellPx=28 -> (29/29) * 300 = 300
		const mm = pxToMm(29, 28);
		expect(mm).toBeCloseTo(300, 0);
	});

	// The 1px gap mmToPx adds is the grid's inter-cell gap. In the clean-map
	// card the grid collapses that gap to 0 (gap: 0), so the true per-cell pitch
	// is cellPx, not cellPx+1. The `gap` argument lets the overlay convert
	// against the grid's actual pitch instead of assuming 1px. (pxToMm has no
	// gap arg — its drag-path callers are editor-only, always gridlined.)
	it("mmToPx scales by cellPx alone when gap is 0 (clean-map pitch)", () => {
		// gap=0: 300mm at cellPx=28 -> (300/300) * 28 = 28
		expect(mmToPx(300, 28, 0)).toBeCloseTo(28, 5);
	});

	it("defaults to a 1px gap when gap is omitted (back-compat)", () => {
		expect(mmToPx(300, 28)).toBeCloseTo(29, 5);
		expect(pxToMm(29, 28)).toBeCloseTo(300, 5);
	});
});

describe("_onCellMouseEnter", () => {
	it("applies paint when _isPainting is true", () => {
		const a = createPanel() as any;
		a._isPainting = true;
		a._activeZone = 0;
		a._paintAction = "set";

		a._onCellMouseEnter(0);

		expect(a._grid[0]).toBe(0x01); // CELL_ROOM_BIT = 0x01
	});

	it("does nothing when _isPainting is false", () => {
		const a = createPanel() as any;
		a._isPainting = false;

		a._onCellMouseEnter(0);
		expect(a._grid[0]).toBe(0);
	});
});

describe("_onCellMouseUp", () => {
	it("resets painting state", () => {
		const a = createPanel() as any;
		a._isPainting = true;
		a._frozenBounds = { minCol: 0, maxCol: 10, minRow: 0, maxRow: 10 };

		a._onCellMouseUp();

		expect(a._isPainting).toBe(false);
		expect(a._frozenBounds).toBeNull();
	});
});

describe("getZoneThresholds (lib/zone-defaults)", () => {
	function thresholdsFor(a: any, zid: number) {
		const z0 = resolveZoneParams(a._zoneConfigs[0]);
		return getZoneThresholds(
			zid,
			a._zoneConfigs.slice(1),
			z0.type,
			z0.trigger,
			z0.renew,
			z0.timeout,
			z0.handoff_timeout,
		);
	}

	it("returns thresholds for boundary zone", () => {
		const a = createPanel() as any;
		const result = thresholdsFor(a, 0);
		expect(result).toHaveProperty("trigger");
		expect(result).toHaveProperty("renew");
		expect(result).toHaveProperty("timeout");
		expect(result).toHaveProperty("handoffTimeout");
	});

	it("uses zone-specific thresholds for named zones", () => {
		const a = createPanel() as any;
		// Named zone 1 lives at slot 1 (slot 0 is Zone0Config).
		a._zoneConfigs = [
			a._zoneConfigs[0],
			{
				name: "Kitchen",
				color: "#ff0000",
				type: "custom",
				trigger: 7,
				renew: 5,
				timeout: 15,
				handoff_timeout: 5,
			},
			null,
			null,
			null,
			null,
			null,
			null,
		];

		const result = thresholdsFor(a, 1);
		expect(result.trigger).toBe(7);
		expect(result.renew).toBe(5);
		expect(result.timeout).toBe(15);
		expect(result.handoffTimeout).toBe(5);
	});
});

describe("connectedCallback and disconnectedCallback", () => {
	it("connectedCallback sets up event listeners", () => {
		const el = createPanel();
		const _a = el as any;
		// Prevent actual initialization
		el.hass = null;

		// Spy on addEventListener
		const addSpy = vi.spyOn(window, "addEventListener");
		el.connectedCallback();

		expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
		expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

		addSpy.mockRestore();
		el.disconnectedCallback();
	});

	it("disconnectedCallback removes event listeners", () => {
		const el = createPanel();
		const _a = el as any;
		el.hass = null;

		el.connectedCallback();

		const removeSpy = vi.spyOn(window, "removeEventListener");
		el.disconnectedCallback();

		expect(removeSpy).toHaveBeenCalledWith(
			"beforeunload",
			expect.any(Function),
		);
		expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

		removeSpy.mockRestore();
	});
});

describe("_beforeUnloadHandler", () => {
	it("sets returnValue when dirty", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = true;

		const event = new Event("beforeunload") as BeforeUnloadEvent;
		const preventSpy = vi.spyOn(event, "preventDefault");

		a._navGuard._beforeUnloadHandler(event);

		expect(preventSpy).toHaveBeenCalled();
	});

	it("does nothing when not dirty", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = false;

		const event = new Event("beforeunload") as BeforeUnloadEvent;
		const preventSpy = vi.spyOn(event, "preventDefault");

		a._navGuard._beforeUnloadHandler(event);

		expect(preventSpy).not.toHaveBeenCalled();
	});
});

describe("_interceptNavigation", () => {
	it("returns false and does nothing when not dirty", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = false;

		const result = a._navGuard._interceptNavigation();

		expect(result).toBe(false);
		expect(a._showUnsavedDialog).toBe(false);
	});

	it("returns true and shows dialog when dirty", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = true;

		const result = a._navGuard._interceptNavigation();

		expect(result).toBe(true);
		expect(a._showUnsavedDialog).toBe(true);
		expect(a._navGuard._pendingNavigation).toBeNull();
	});
});

describe("updated lifecycle", () => {
	it("re-initializes when hass changes and loading", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = true;
		a._devices = [];

		// Mock _initialize to track calls
		const initSpy = vi.spyOn(a, "_initialize").mockResolvedValue(undefined);

		const props = new Map();
		props.set("hass", undefined);

		a.updated(props);

		expect(initSpy).toHaveBeenCalled();
		initSpy.mockRestore();
	});

	it("does not re-initialize when hass has not changed", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = true;
		a._devices = [];

		const initSpy = vi.spyOn(a, "_initialize").mockResolvedValue(undefined);

		const props = new Map();
		// hass not in changedProps

		a.updated(props);

		expect(initSpy).not.toHaveBeenCalled();
		initSpy.mockRestore();
	});

	it("does not re-initialize when devices already loaded", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = true;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "A",
				host: null,
				available: true,
				configured: true,
			},
		];

		const initSpy = vi.spyOn(a, "_initialize").mockResolvedValue(undefined);

		const props = new Map();
		props.set("hass", undefined);

		a.updated(props);

		expect(initSpy).not.toHaveBeenCalled();
		initSpy.mockRestore();
	});
});

describe("_onFurniturePointerDown", () => {
	it("sets up drag state for move", () => {
		const el = createPanel();
		const a = el as any;
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

		const mockEvent = {
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
			clientX: 500,
			clientY: 300,
		};

		// Mock addEventListener
		const addSpy = vi
			.spyOn(window, "addEventListener")
			.mockImplementation(() => {});

		a._onFurniturePointerDown(mockEvent, "f1", "move");

		expect(a._selectedFurnitureId).toBe("f1");
		expect(a._dragState).not.toBeNull();
		expect(a._dragState.type).toBe("move");
		expect(a._dragState.id).toBe("f1");

		addSpy.mockRestore();
	});

	it("returns early when item not found", () => {
		const el = createPanel();
		const a = el as any;
		a._furniture = [];

		const mockEvent = {
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
			clientX: 500,
			clientY: 300,
		};

		a._onFurniturePointerDown(mockEvent, "nonexistent", "move");

		expect(a._dragState).toBeNull();
	});
});

describe("_onFurnitureDrag", () => {
	it("returns early when no drag state", () => {
		const el = createPanel();
		const a = el as any;
		a._dragState = null;

		// Should not throw
		a._onFurnitureDrag({ clientX: 0, clientY: 0 });
	});
});

describe("history navigation interception", () => {
	it("pushState is intercepted when dirty", () => {
		const el = createPanel();
		const a = el as any;
		el.hass = null; // Prevent initialization

		// Save original
		const _origPush = history.pushState.bind(history);

		el.connectedCallback();

		a._dirty = true;
		history.pushState({}, "", "/test");

		expect(a._showUnsavedDialog).toBe(true);
		expect(a._navGuard._pendingNavigation).not.toBeNull();

		el.disconnectedCallback();
		// Ensure originals are restored
	});

	it("replaceState is intercepted when dirty", () => {
		const el = createPanel();
		const a = el as any;
		el.hass = null;

		el.connectedCallback();

		a._dirty = true;
		history.replaceState({}, "", "/test");

		expect(a._showUnsavedDialog).toBe(true);
		expect(a._navGuard._pendingNavigation).not.toBeNull();

		el.disconnectedCallback();
	});

	it("pushState passes through when not dirty", () => {
		const el = createPanel();
		const a = el as any;
		el.hass = null;

		el.connectedCallback();

		a._dirty = false;
		// Should not throw or show dialog
		history.pushState({}, "", "");
		expect(a._showUnsavedDialog).toBe(false);

		el.disconnectedCallback();
	});

	it("replaceState passes through when not dirty", () => {
		const el = createPanel();
		const a = el as any;
		el.hass = null;

		el.connectedCallback();

		a._dirty = false;
		history.replaceState({}, "", "");
		expect(a._showUnsavedDialog).toBe(false);

		el.disconnectedCallback();
	});
});
