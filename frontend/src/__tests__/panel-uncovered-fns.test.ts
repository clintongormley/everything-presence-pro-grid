/**
 * Tests for uncovered inline arrow-function event handlers in
 * eppgrid-panel.ts template methods.
 *
 * Each test renders a template returned by a private method, then
 * dispatches the relevant CustomEvent on the child element so
 * the inline handler is exercised.
 */
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-grid.js";
import "../components/epp-furniture-overlay.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
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
	a._view = "live";
	a._devices = [
		{
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: null,
			available: true,
			configured: true,
			firmware_status: "compatible",
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
	a._showLiveMenu = false;
	return el;
}

let container: HTMLDivElement;

afterEach(() => {
	if (container?.isConnected) document.body.removeChild(container);
});

function renderTo(template: any): HTMLDivElement {
	container = document.createElement("div");
	document.body.appendChild(container);
	render(template, container);
	return container;
}

// ---------------------------------------------------------
// _renderLiveGrid inline handlers (lines 1004, 1007, 1011)
// ---------------------------------------------------------
describe("_renderLiveGrid inline event handlers", () => {
	it("@furniture-select sets _selectedFurnitureId", () => {
		const a = createPanel() as any;
		const tpl = a._renderLiveGrid();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;
		grid.dispatchEvent(
			new CustomEvent("furniture-select", { detail: "furn-99", bubbles: true }),
		);
		expect(a._selectedFurnitureId).toBe("furn-99");
	});

	it("@furniture-pointer-down calls _onFurniturePointerDown", () => {
		const a = createPanel() as any;
		const spy = vi
			.spyOn(a, "_onFurniturePointerDown")
			.mockImplementation(() => {});
		const tpl = a._renderLiveGrid();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;
		const fakePtr = { clientX: 10, clientY: 20 };
		grid.dispatchEvent(
			new CustomEvent("furniture-pointer-down", {
				detail: {
					e: fakePtr,
					id: "f1",
					type: "move",
					handle: null,
					rotation: 30,
				},
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith(fakePtr, "f1", "move", null, 30);
	});

	it("@furniture-delete calls _removeFurniture", () => {
		const a = createPanel() as any;
		const spy = vi.spyOn(a, "_removeFurniture").mockImplementation(() => {});
		const tpl = a._renderLiveGrid();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;
		grid.dispatchEvent(
			new CustomEvent("furniture-delete", { detail: "f1", bubbles: true }),
		);
		expect(spy).toHaveBeenCalledWith("f1");
	});
});

// ---------------------------------------------------------
// _renderLiveOverview menu: _changePlacement (line 1103)
// ---------------------------------------------------------
describe("_renderLiveOverview menu room calibration button", () => {
	it("@click on room calibration calls _changePlacement", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const spy = vi.spyOn(a, "_changePlacement").mockImplementation(() => {});
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		// Find the menu item whose text includes "room_calibration" (localize returns key)
		const items = c.querySelectorAll(
			".sidebar-menu-item",
		) as NodeListOf<HTMLElement>;
		let clicked = false;
		for (const item of items) {
			if (item.textContent?.includes("room_calibration")) {
				item.click();
				clicked = true;
				break;
			}
		}
		expect(clicked).toBe(true);
		expect(spy).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------
// _renderEditor inline handlers on epp-grid (lines 1268, 1274, 1277, 1281)
// ---------------------------------------------------------
describe("_renderEditor epp-grid inline event handlers", () => {
	function editorPanel() {
		const a = createPanel() as any;
		a._view = "editor";
		return a;
	}

	it("@cell-paint dispatches cell painting actions", () => {
		const a = editorPanel();
		const downSpy = vi
			.spyOn(a, "_onCellMouseDown")
			.mockImplementation(() => {});
		const enterSpy = vi
			.spyOn(a, "_onCellMouseEnter")
			.mockImplementation(() => {});
		const upSpy = vi.spyOn(a, "_onCellMouseUp").mockImplementation(() => {});
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;

		grid.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index: 5, action: "down" },
				bubbles: true,
			}),
		);
		expect(downSpy).toHaveBeenCalledWith(5);

		grid.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index: 7, action: "enter" },
				bubbles: true,
			}),
		);
		expect(enterSpy).toHaveBeenCalledWith(7);

		grid.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index: 0, action: "up" },
				bubbles: true,
			}),
		);
		expect(upSpy).toHaveBeenCalled();
	});

	it("@furniture-select on editor grid sets _selectedFurnitureId", () => {
		const a = editorPanel();
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;
		grid.dispatchEvent(
			new CustomEvent("furniture-select", { detail: "f-abc", bubbles: true }),
		);
		expect(a._selectedFurnitureId).toBe("f-abc");
	});

	it("@furniture-pointer-down on editor grid calls handler", () => {
		const a = editorPanel();
		const spy = vi
			.spyOn(a, "_onFurniturePointerDown")
			.mockImplementation(() => {});
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;
		const fakePtr = { clientX: 1, clientY: 2 };
		grid.dispatchEvent(
			new CustomEvent("furniture-pointer-down", {
				detail: {
					e: fakePtr,
					id: "f2",
					type: "resize",
					handle: "se",
					rotation: 90,
				},
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith(fakePtr, "f2", "resize", "se", 90);
	});

	it("@furniture-delete on editor grid calls _removeFurniture", () => {
		const a = editorPanel();
		const spy = vi.spyOn(a, "_removeFurniture").mockImplementation(() => {});
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const grid = c.querySelector("epp-grid")!;
		grid.dispatchEvent(
			new CustomEvent("furniture-delete", { detail: "f2", bubbles: true }),
		);
		expect(spy).toHaveBeenCalledWith("f2");
	});
});

// ---------------------------------------------------------
// _renderEditor furniture sidebar handlers (lines 1347, 1356, 1365)
// ---------------------------------------------------------
describe("_renderEditor furniture sidebar inline event handlers", () => {
	function furnitureEditorPanel() {
		const a = createPanel() as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		return a;
	}

	it("@furniture-add-custom calls _addCustomFurniture", () => {
		const a = furnitureEditorPanel();
		const spy = vi.spyOn(a, "_addCustomFurniture").mockImplementation(() => {});
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const sidebar = c.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("furniture-add-custom", {
				detail: { icon: "mdi:lamp", label: "Lamp" },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith({ icon: "mdi:lamp", label: "Lamp" });
	});

	it("@furniture-select on furniture sidebar sets _selectedFurnitureId", () => {
		const a = furnitureEditorPanel();
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const sidebar = c.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("furniture-select", { detail: "f-xyz", bubbles: true }),
		);
		expect(a._selectedFurnitureId).toBe("f-xyz");
	});

	it("@dirty on furniture sidebar sets _dirty", () => {
		const a = furnitureEditorPanel();
		expect(a._dirty).toBe(false);
		const tpl = a._renderEditor();
		const c = renderTo(tpl);
		const sidebar = c.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(new CustomEvent("dirty", { bubbles: true }));
		expect(a._dirty).toBe(true);
	});
});

// ---------------------------------------------------------
// _renderHeader: ha-select @selected guard navigation (line 922)
// ---------------------------------------------------------
describe("_renderHeader device selector", () => {
	it("@selected with new device value triggers navigation guard", async () => {
		const a = createPanel() as any;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Sensor 1",
				host: null,
				available: true,
				configured: true,
			},
			{
				mac: "AA:BB:CC:DD:EE:02",
				name: "Sensor 2",
				host: null,
				available: true,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const guardSpy = vi
			.spyOn(a._navGuard, "guardNavigation")
			.mockImplementation(async (...args: unknown[]) => {
				const cb = args[0] as () => Promise<void>;
				await cb();
			});

		const tpl = a._renderHeader();
		const c = renderTo(tpl);
		const select = c.querySelector("ha-select")!;
		// The @selected handler reads e.detail.value
		select.dispatchEvent(
			new CustomEvent("selected", {
				bubbles: true,
				detail: { value: "AA:BB:CC:DD:EE:02" },
			}),
		);

		expect(guardSpy).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------
// _renderProtocolBanner: update firmware button (line 951)
// ---------------------------------------------------------
describe("_renderProtocolBanner update firmware button", () => {
	it("@click navigates to flasher tab when firmware_behind", () => {
		const a = createPanel() as any;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test",
				host: null,
				available: true,
				configured: true,
				firmware_status: "firmware_behind",
			},
		];
		a._panelTab = "config";
		const tpl = a._renderProtocolBanner();
		const c = renderTo(tpl);
		const btn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		expect(btn).not.toBeNull();
		btn.click();
		expect(a._panelTab).toBe("flasher");
	});
});

// ---------------------------------------------------------
// _renderConfigurationRestoreDialog: delete configuration button (line 1429)
// ---------------------------------------------------------
describe("_renderConfigurationRestoreDialog delete configuration button", () => {
	it("@click calls _deleteConfiguration with configuration name", () => {
		const a = createPanel() as any;
		// Seed a configuration into localStorage
		const templates = [
			{
				name: "MyTemplate",
				roomWidth: 3000,
				roomDepth: 4000,
				grid: "",
				zones: new Array(8).fill(null),
				furniture: [],
			},
		];
		vi.spyOn(a, "_getConfigurations").mockReturnValue(templates);
		const spy = vi
			.spyOn(a, "_deleteConfiguration")
			.mockImplementation(() => {});

		const tpl = a._renderConfigurationRestoreDialog();
		const c = renderTo(tpl);
		const deleteBtn = c.querySelector(
			".configuration-card-delete",
		) as HTMLElement;
		expect(deleteBtn).not.toBeNull();
		deleteBtn.click();
		expect(spy).toHaveBeenCalledWith("MyTemplate");
	});
});

// ---------------------------------------------------------
// _renderFurnitureOverlay inline handlers (lines 1694, 1697, 1701)
// ---------------------------------------------------------
describe("_renderFurnitureOverlay inline event handlers", () => {
	function overlayPanel() {
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
		return a;
	}

	it("@furniture-select sets _selectedFurnitureId", () => {
		const a = overlayPanel();
		const tpl = a._renderFurnitureOverlay(20, 0, 0, 15, 20);
		const c = renderTo(tpl);
		const overlay = c.querySelector("epp-furniture-overlay")!;
		overlay.dispatchEvent(
			new CustomEvent("furniture-select", { detail: "f1", bubbles: true }),
		);
		expect(a._selectedFurnitureId).toBe("f1");
	});

	it("@furniture-pointer-down calls _onFurniturePointerDown", () => {
		const a = overlayPanel();
		const spy = vi
			.spyOn(a, "_onFurniturePointerDown")
			.mockImplementation(() => {});
		const tpl = a._renderFurnitureOverlay(20, 0, 0, 15, 20);
		const c = renderTo(tpl);
		const overlay = c.querySelector("epp-furniture-overlay")!;
		const fakePtr = { clientX: 5, clientY: 5 };
		overlay.dispatchEvent(
			new CustomEvent("furniture-pointer-down", {
				detail: {
					e: fakePtr,
					id: "f1",
					type: "move",
					handle: null,
					rotation: 0,
				},
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith(fakePtr, "f1", "move", null, 0);
	});

	it("@furniture-delete calls _removeFurniture", () => {
		const a = overlayPanel();
		const spy = vi.spyOn(a, "_removeFurniture").mockImplementation(() => {});
		const tpl = a._renderFurnitureOverlay(20, 0, 0, 15, 20);
		const c = renderTo(tpl);
		const overlay = c.querySelector("epp-furniture-overlay")!;
		overlay.dispatchEvent(
			new CustomEvent("furniture-delete", { detail: "f1", bubbles: true }),
		);
		expect(spy).toHaveBeenCalledWith("f1");
	});
});
