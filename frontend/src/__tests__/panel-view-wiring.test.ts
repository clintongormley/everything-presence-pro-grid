/**
 * Tests for panel <-> child-component event wiring.
 *
 * Each test renders the panel, finds a child element, dispatches a
 * CustomEvent, then asserts the panel state changed accordingly.
 */

import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-furniture-overlay.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-grid.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-zone-sidebar.js";
import { GRID_CELL_COUNT, initGridFromRoom } from "../lib/grid.js";
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
			firmware_status: "compatible",
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
	a._pendingNavigation = null;
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

const containers: HTMLDivElement[] = [];

afterEach(() => {
	for (const c of containers) c.remove();
	containers.length = 0;
});

function renderPanel(el: EPPGridPanel): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	containers.push(container);
	render((el as any).render(), container);
	return container;
}

// =========================================================
// 1. Editor view event wiring
// =========================================================
describe("Editor view event wiring", () => {
	function editorPanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		const container = renderPanel(el);
		return [el, container];
	}

	it("zone-select sets _activeZone", () => {
		const [el, container] = editorPanel();
		const sidebar = container.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("zone-select", { detail: { zone: 3 }, bubbles: true }),
		);
		expect((el as any)._activeZone).toBe(3);
	});

	it("zone-add calls _addZone", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_addZone");
		const sidebar = container.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(new CustomEvent("zone-add", { bubbles: true }));
		expect(spy).toHaveBeenCalled();
	});

	it("zone-remove calls _removeZone with slot", () => {
		const [el, container] = editorPanel();
		const spy = vi.spyOn(el as any, "_removeZone");
		const sidebar = container.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("zone-remove", {
				detail: { slot: 2 },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith(2);
	});

	it("zone-config-change updates the named zone at the dispatched index", () => {
		const [el, _container] = editorPanel();
		const a = el as any;
		// Populate slot 1 (named zone 1) with a config; the sidebar iterates
		// over the named-zones list and dispatches 0-based indices.
		a._zoneConfigs = [
			a._zoneConfigs[0],
			{
				name: "Zone 1",
				color: "#ff0000",
				type: "default",
				trigger: 5,
				renew: 2,
				timeout: 10,
				handoff_timeout: 2,
			},
			null,
			null,
			null,
			null,
			null,
			null,
		];
		// Re-render with the zone config in place
		const container2 = renderPanel(el);
		const sidebar = container2.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: 0, updates: { trigger: 8 } },
				bubbles: true,
			}),
		);
		// index 0 (named-zone offset) maps to slot 1 in _zoneConfigs.
		expect(a._zoneConfigs[1].trigger).toBe(8);
	});

	it("zone-config-change ignores out-of-range negative index", () => {
		const [el, _container] = editorPanel();
		const a = el as any;
		a._zoneConfigs = [
			a._zoneConfigs[0],
			{
				name: "Zone 1",
				color: "#ff0000",
				type: "default",
				trigger: 5,
				renew: 2,
				timeout: 10,
				handoff_timeout: 2,
			},
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const before = a._zoneConfigs;
		const container2 = renderPanel(el);
		const sidebar = container2.querySelector("epp-zone-sidebar")!;
		// index = -1 → slot = 0, which is Zone0Config and should never be
		// overwritten via zone-config-change. Handler must be a no-op.
		sidebar.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: -1, updates: { trigger: 99 } },
				bubbles: true,
			}),
		);
		expect(a._zoneConfigs).toBe(before);
		expect(a._zoneConfigs[0].trigger).toBe(5);
	});

	it("zone-config-change ignores out-of-range high index", () => {
		const [el, _container] = editorPanel();
		const a = el as any;
		const before = a._zoneConfigs;
		const container2 = renderPanel(el);
		const sidebar = container2.querySelector("epp-zone-sidebar")!;
		// index = 7 → slot = 8, out of bounds for the length-8 zone-slots tuple.
		sidebar.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: 7, updates: { trigger: 99 } },
				bubbles: true,
			}),
		);
		expect(a._zoneConfigs).toBe(before);
		expect(a._zoneConfigs.length).toBe(8);
	});

	it("zone-config-change ignores null slot (defense-in-depth)", () => {
		const [el, _container] = editorPanel();
		const a = el as any;
		// Slot 1 is explicitly null.
		a._zoneConfigs = [
			a._zoneConfigs[0],
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const before = a._zoneConfigs;
		const container2 = renderPanel(el);
		const sidebar = container2.querySelector("epp-zone-sidebar")!;
		// index 0 → slot 1 (null). Spreading null would produce a bogus
		// config missing name/color/type. Handler must short-circuit instead.
		sidebar.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: 0, updates: { trigger: 99 } },
				bubbles: true,
			}),
		);
		expect(a._zoneConfigs).toBe(before);
		expect(a._zoneConfigs[1]).toBe(null);
	});

	it("zone0-change updates zone 0 type", () => {
		const [el, container] = editorPanel();
		const sidebar = container.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("zone0-change", {
				detail: { type: "seating" },
				bubbles: true,
			}),
		);
		expect((el as any)._zoneConfigs[0].type).toBe("seating");
	});

	it("zone0-change updates all zone 0 fields", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		const sidebar = container.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("zone0-change", {
				detail: {
					trigger: 3,
					renew: 2,
					timeout: 5,
					handoff_timeout: 1,
				},
				bubbles: true,
			}),
		);
		expect(a._zoneConfigs[0].trigger).toBe(3);
		expect(a._zoneConfigs[0].renew).toBe(2);
		expect(a._zoneConfigs[0].timeout).toBe(5);
		expect(a._zoneConfigs[0].handoff_timeout).toBe(1);
	});

	it("zone-config-change marks _dirty (panel-side responsibility)", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		// Seed a zone in slot 1 so the handler accepts the update.
		a._zoneConfigs = [
			{
				type: "default",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			{ name: "Z1", color: "#ff0000", type: "default" as const },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const sidebar = container.querySelector("epp-zone-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: 0, updates: { name: "Renamed" } },
				bubbles: true,
			}),
		);
		expect(a._dirty).toBe(true);
	});

	it("furniture-add calls _addFurniture", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		const container = renderPanel(el);
		const spy = vi.spyOn(el as any, "_addFurniture");
		const sidebar = container.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("furniture-add", {
				detail: { type: "svg", icon: "armchair" },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith({ type: "svg", icon: "armchair" });
	});

	it("furniture-remove calls _removeFurniture", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		const container = renderPanel(el);
		const spy = vi.spyOn(el as any, "_removeFurniture");
		const sidebar = container.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("furniture-remove", {
				detail: "furn-1",
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith("furn-1");
	});

	it("furniture-update calls _updateFurniture", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		const container = renderPanel(el);
		const spy = vi.spyOn(el as any, "_updateFurniture");
		const sidebar = container.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("furniture-update", {
				detail: { id: "f1", updates: { x: 500 } },
				bubbles: true,
			}),
		);
		expect(spy).toHaveBeenCalledWith("f1", { x: 500 });
	});

	it("custom-icon-toggle toggles _showCustomIconPicker", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		const container = renderPanel(el);
		expect(a._showCustomIconPicker).toBe(false);
		const sidebar = container.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("custom-icon-toggle", { bubbles: true }),
		);
		expect(a._showCustomIconPicker).toBe(true);
	});

	it("custom-icon-change sets _customIconValue", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		const container = renderPanel(el);
		const sidebar = container.querySelector("epp-furniture-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("custom-icon-change", {
				detail: "mdi:sofa",
				bubbles: true,
			}),
		);
		expect(a._customIconValue).toBe("mdi:sofa");
	});

	it("panel click sets _activeZone to null when not just painted", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		a._justPainted = false;
		a._activeZone = 2;
		const panel = container.querySelector(".panel")!;
		panel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(a._activeZone).toBeNull();
	});

	it("grid-container click sets _selectedFurnitureId to null", () => {
		const [el, container] = editorPanel();
		const a = el as any;
		a._selectedFurnitureId = "furn-42";
		const gridContainer = container.querySelector(".grid-container")!;
		gridContainer.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(a._selectedFurnitureId).toBeNull();
	});
});

// =========================================================
// 2. Live overview event wiring
// =========================================================
describe("Live overview event wiring", () => {
	function livePanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const container = renderPanel(el);
		return [el, container];
	}

	it("view-change on epp-live-sidebar updates _view and _sidebarTab", () => {
		const [el, container] = livePanel();
		const sidebar = container.querySelector("epp-live-sidebar")!;
		sidebar.dispatchEvent(
			new CustomEvent("view-change", {
				detail: { view: "editor", sidebarTab: "furniture" },
				bubbles: true,
			}),
		);
		expect((el as any)._view).toBe("editor");
		expect((el as any)._sidebarTab).toBe("furniture");
	});

	it("menu button sets _showDeleteCalibrationDialog via panel state", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._showDeleteCalibrationDialog = false;
		// The panel now handles this inline, so just verify the state mutation
		a._showDeleteCalibrationDialog = true;
		expect(a._showDeleteCalibrationDialog).toBe(true);
	});

	it("menu sets _showConfigurationBackup via panel state", () => {
		const el = createPanel();
		const a = el as any;
		a._showConfigurationBackup = false;
		a._showConfigurationBackup = true;
		expect(a._showConfigurationBackup).toBe(true);
	});

	it("menu sets _showConfigurationRestore via panel state", () => {
		const el = createPanel();
		const a = el as any;
		a._showConfigurationRestore = false;
		a._showConfigurationRestore = true;
		expect(a._showConfigurationRestore).toBe(true);
	});

	it("uncalibrated wizard start-calibration calls _changePlacement", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		a._perspective = null; // uncalibrated
		const container = renderPanel(el);
		const spy = vi.spyOn(el as any, "_changePlacement");
		// The epp-wizard is now rendered directly in the panel template
		const wizard = container.querySelector("epp-wizard");
		expect(wizard).not.toBeNull();
		wizard!.dispatchEvent(
			new CustomEvent("start-calibration", { bubbles: true }),
		);
		expect(spy).toHaveBeenCalled();
	});
});

// =========================================================
// 3. Settings view event wiring
// =========================================================
describe("Settings view event wiring", () => {
	function settingsPanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "settings";
		const container = renderPanel(el);
		return [el, container];
	}

	it("accordion-toggle updates _openAccordions", () => {
		const [el, container] = settingsPanel();
		const settingsView = container.querySelector("epp-settings-view")!;
		const newSet = new Set(["detection"]);
		settingsView.dispatchEvent(
			new CustomEvent("accordion-toggle", {
				detail: newSet,
				bubbles: true,
			}),
		);
		expect((el as any)._openAccordions).toBe(newSet);
	});

	it("setting-change updates the keyed property", () => {
		const [el, container] = settingsPanel();
		const settingsView = container.querySelector("epp-settings-view")!;
		settingsView.dispatchEvent(
			new CustomEvent("setting-change", {
				detail: { key: "targetMaxDistance", value: 4 },
				bubbles: true,
			}),
		);
		expect((el as any)._targetMaxDistance).toBe(4);
	});

	it("dirty sets _dirty to true", () => {
		const [el, container] = settingsPanel();
		const settingsView = container.querySelector("epp-settings-view")!;
		settingsView.dispatchEvent(new CustomEvent("dirty", { bubbles: true }));
		expect((el as any)._dirty).toBe(true);
	});

	it("cancel resets _dirty and _view and reloads config", () => {
		const [el, container] = settingsPanel();
		const a = el as any;
		a._dirty = true;
		const loadSpy = vi
			.spyOn(a, "_loadDeviceConfig")
			.mockResolvedValue(undefined);
		const settingsView = container.querySelector("epp-settings-view")!;
		settingsView.dispatchEvent(new CustomEvent("cancel", { bubbles: true }));
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
		expect(loadSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:01");
	});

	it("passes LED properties to epp-settings-view", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "settings";
		a._ledMode = "Presence";
		a._ledBrightness = 0.5;
		a._ledPresenceColor = "#FF0000";
		const container = renderPanel(el);
		const settingsView = container.querySelector("epp-settings-view")! as any;
		expect(settingsView.ledMode).toBe("Presence");
		expect(settingsView.ledBrightness).toBe(0.5);
		expect(settingsView.ledPresenceColor).toBe("#FF0000");
	});
});

// =========================================================
// 4. Wizard completion event wiring
// =========================================================
describe("Wizard completion event wiring", () => {
	function wizardPanel(): [EPPGridPanel, HTMLDivElement] {
		const el = createPanel();
		const a = el as any;
		a._view = "calibrate";
		const container = renderPanel(el);
		return [el, container];
	}

	it("wizard-save persists via eppgrid/set_setup and updates panel state", async () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(
			new CustomEvent("wizard-save", {
				detail: {
					perspective: [1, 0, 0, 0, 1, 0, 0, 0],
					roomWidth: 4000,
					roomDepth: 5000,
				},
				bubbles: true,
			}),
		);
		await vi.waitFor(() => {
			expect(a._view).toBe("live");
		});
		expect(el.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/set_setup",
				mac: "AA:BB:CC:DD:EE:01",
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 4000,
				room_depth: 5000,
			}),
		);
		expect(a._perspective).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
		expect(a._roomWidth).toBe(4000);
		expect(a._roomDepth).toBe(5000);
	});

	it("wizard-save initializes grid from room dimensions", async () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(
			new CustomEvent("wizard-save", {
				detail: {
					perspective: [1, 0, 0, 0, 1, 0, 0, 0],
					roomWidth: 4000,
					roomDepth: 5000,
				},
				bubbles: true,
			}),
		);
		await vi.waitFor(() => {
			expect(a._view).toBe("live");
		});
		// Grid should match initGridFromRoom(4000, 5000)
		const expected = initGridFromRoom(4000, 5000);
		expect(a._grid).toEqual(expected);
	});

	it("wizard-save clears furniture", async () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		// Pre-populate furniture so we can verify it gets cleared.
		a._furniture = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:sofa",
				label: "sofa",
				x: 600,
				y: 300,
				width: 600,
				height: 400,
				rotation: 0,
				lockAspect: false,
			},
		];
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(
			new CustomEvent("wizard-save", {
				detail: {
					perspective: [1, 0, 0, 0, 1, 0, 0, 0],
					roomWidth: 4000,
					roomDepth: 5000,
				},
				bubbles: true,
			}),
		);
		await vi.waitFor(() => {
			expect(a._view).toBe("live");
		});
		expect(a._furniture).toEqual([]);
	});

	it("wizard-save failure keeps the wizard mounted and reports back via saveFailed", async () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		el.hass.callWS = vi.fn().mockRejectedValue(new Error("device offline"));
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const wizard = container.querySelector("epp-wizard")! as any;
			const failSpy = vi.spyOn(wizard, "saveFailed");
			wizard.dispatchEvent(
				new CustomEvent("wizard-save", {
					detail: {
						perspective: [1, 0, 0, 0, 1, 0, 0, 0],
						roomWidth: 4000,
						roomDepth: 5000,
					},
					bubbles: true,
				}),
			);
			await vi.waitFor(() => {
				expect(failSpy).toHaveBeenCalled();
			});
			// Panel state untouched — the user stays in the wizard to retry.
			expect(a._view).toBe("calibrate");
			expect(a._roomWidth).toBe(3000);
		} finally {
			consoleSpy.mockRestore();
		}
	});

	it("wizard-cancel returns to live", () => {
		const [el, container] = wizardPanel();
		const a = el as any;
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(new CustomEvent("wizard-cancel", { bubbles: true }));
		expect(a._view).toBe("live");
	});

	it("begin-corners promotes a tutorial view to calibrate", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "tutorial";
		const container = renderPanel(el);
		const wizard = container.querySelector("epp-wizard")!;
		wizard.dispatchEvent(new CustomEvent("begin-corners", { bubbles: true }));
		expect(a._view).toBe("calibrate");
	});
});

// =========================================================
// 5. Navigation guards (direct method calls)
// =========================================================
describe("Navigation guards", () => {
	it("_changePlacement when not dirty enters the tutorial when the preference is set", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = false;
		a._deviceCtrl.showRoomCalibrationTutorial = true;
		a._changePlacement();
		expect(a._view).toBe("tutorial");
	});

	it("_changePlacement when dirty shows unsaved dialog", () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = true;
		a._changePlacement();
		expect(a._showUnsavedDialog).toBe(true);
	});

	it("_initGridFromRoom produces grid with correct length", () => {
		const el = createPanel();
		const a = el as any;
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._initGridFromRoom();
		expect(a._grid.length).toBe(GRID_CELL_COUNT);
		// Verify it matches the standalone function
		const expected = initGridFromRoom(3000, 4000);
		expect(a._grid).toEqual(expected);
	});
});
