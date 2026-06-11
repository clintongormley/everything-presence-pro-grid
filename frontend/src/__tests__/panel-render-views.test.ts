import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-grid.js";
import type { EppFurnitureSidebar } from "../components/epp-furniture-sidebar.js";
import type { EppGrid } from "../components/epp-grid.js";
import type { EppSettingsView } from "../components/epp-settings-view.js";
import type { EppWizard } from "../components/epp-wizard.js";
import { GRID_CELL_COUNT, initGridFromRoom } from "../lib/grid.js";
import { ZONE_COLORS } from "../lib/zone-defaults.js";
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
	a._showHitCounts = false;
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
	el.grid = new Uint8Array(GRID_CELL_COUNT);
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

function createWizard(overrides?: Partial<Record<string, unknown>>): EppWizard {
	const el = document.createElement("epp-wizard") as EppWizard;
	const a = el as any;
	a.hass = { callWS: vi.fn().mockResolvedValue({}) };
	a.selectedMac = "AA:BB:CC:DD:EE:01";
	a.rawTargets = [];
	a.sensorState = { occupancy: false };
	a.devices = [{ mac: "AA:BB:CC:DD:EE:01", name: "Test" }];
	a.localize = (k: string) => k;
	a.initialRoomWidth = 0;
	a.initialRoomDepth = 0;
	a.mode = "wizard";
	a._setupStep = "guide";
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
	a._smoothBuffer = [];
	a._perspective = null;
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

function createGrid(overrides?: Partial<Record<string, unknown>>): EppGrid {
	const el = document.createElement("epp-grid") as EppGrid;
	el.grid = initGridFromRoom(3000, 4000);
	el.zoneConfigs = new Array(7).fill(null);
	el.targets = [];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.furniture = [];
	el.localize = Object.assign(((k: string) => k) as typeof el.localize, {
		formatNumber: (v: number, d = 1) => v.toFixed(d),
		lang: "en",
	});
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

describe("render() dispatches to correct view", () => {
	it("renders loading state when _loading is true", () => {
		const a = createPanel() as any;
		a._loading = true;
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders loading when devices is empty", () => {
		const a = createPanel() as any;
		a._loading = false;
		a._devices = [];
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders wizard when _view is 'tutorial'", () => {
		const a = createPanel() as any;
		a._view = "tutorial";
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders settings view", () => {
		const a = createPanel() as any;
		a._view = "settings";
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders editor view with perspective", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		// Need a grid with some room cells for proper rendering
		a._grid = initGridFromRoom(3000, 4000);
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders live overview", () => {
		const a = createPanel() as any;
		a._view = "live";
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("renders delete calibration dialog", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._showDeleteCalibrationDialog = true;
		const result = a.render();
		expect(result).toBeDefined();
	});
});

describe("render() handles offline device", () => {
	it("renders offline banner (not uncalibrated-fov wizard) when device is offline and uncalibrated", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._perspective = null;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test",
				host: null,
				available: false,
				configured: true,
				firmware_status: "unavailable",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).not.toContain("uncalibrated-fov");
		expect(str).toContain("connection.offline");
	});

	it("renders offline banner when device is offline and calibrated", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._grid = initGridFromRoom(3000, 4000);
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test",
				host: null,
				available: false,
				configured: true,
				firmware_status: "unavailable",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("connection.offline");
	});

	it("still renders uncalibrated-fov wizard when device is online and uncalibrated", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._perspective = null;
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

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("uncalibrated-fov");
		expect(str).not.toContain("connection.offline");
	});
});

describe("render() preserves settings view across transient device states", () => {
	// HA debounces ESPHome config-entry reloads 30s after the last entity
	// disabled_by change, so saving an entity toggle in eppgrid causes the
	// device to flicker offline ~30s later. The settings view's `_overrides`
	// are private LitElement state — if the view is unmounted during that
	// window, unsaved edits are wiped. Keep the settings view mounted.

	it("keeps epp-settings-view mounted when device is offline", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test",
				host: null,
				available: false,
				configured: true,
				firmware_status: "unavailable",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("epp-settings-view");
		// Status is still surfaced inline so the user knows save will fail.
		expect(str).toContain("connection.offline");
	});

	it("keeps epp-settings-view mounted when device is reconnecting", () => {
		const a = createPanel() as any;
		a._view = "settings";
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
		// Force the controller's reconnecting flag via its private backing.
		(a._deviceCtrl as any)._reconnecting = true;

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("epp-settings-view");
		expect(str).toContain("connection.connecting");
	});

	it("keeps epp-settings-view mounted when firmware is incompatible", () => {
		const a = createPanel() as any;
		a._view = "settings";
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
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("epp-settings-view");
	});

	it("keeps epp-settings-view mounted while the HA websocket is down", () => {
		// The HA-reconnecting branch used to swap the whole template out,
		// unmounting <epp-settings-view> and wiping its private `_overrides`
		// mid-edit — exactly what the inline-banner design exists to prevent.
		const a = createPanel() as any;
		a._view = "settings";
		a._haConnected = false;

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("epp-settings-view");
		// Status is still surfaced inline so the user knows HA is away.
		expect(str).toContain("connection.ha_reconnecting");
	});

	it("keeps epp-settings-view mounted while the panel is (re)loading", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._loading = true;

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("epp-settings-view");
	});

	it("falls back to the full-page HA-reconnecting banner when not in settings view", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._haConnected = false;

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).not.toContain("epp-settings-view");
		expect(str).toContain("connection.ha_reconnecting");
	});

	it("falls back to full-page banner when not in settings view", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test",
				host: null,
				available: false,
				configured: true,
				firmware_status: "unavailable",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).not.toContain("epp-settings-view");
		expect(str).toContain("connection.offline");
	});
});

describe("_renderHeader", () => {
	it("returns defined result", () => {
		const a = createPanel() as any;
		const result = a._renderHeader();
		expect(result).toBeDefined();
	});
});

describe("_renderWizard (via EppWizard)", () => {
	it("renders guide step", () => {
		const a = createWizard() as any;
		a._setupStep = "guide";
		const result = a._renderWizard();
		expect(result).toBeDefined();
	});

	it("renders corners step", () => {
		const a = createWizard() as any;
		a._setupStep = "corners";
		const result = a._renderWizardCorners();
		expect(result).toBeDefined();
	});

	it("renders with capture in progress", () => {
		const a = createWizard() as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		a._wizardCaptureProgress = 0.5;
		const result = a._renderWizard();
		expect(result).toBeDefined();
	});

	it("renders with capture paused", () => {
		const a = createWizard() as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		a._wizardCapturePaused = true;
		const result = a._renderWizard();
		expect(result).toBeDefined();
	});
});

describe("_renderWizardGuide (via EppWizard)", () => {
	it("renders guide content", () => {
		const a = createWizard() as any;
		const result = a._renderWizardGuide();
		expect(result).toBeDefined();
	});
});

describe("_renderWizardCorners (via EppWizard)", () => {
	it("renders corner marking step with no targets", () => {
		const a = createWizard() as any;
		a.rawTargets = [];
		const result = a._renderWizardCorners();
		expect(result).toBeDefined();
	});

	it("renders with active target", () => {
		const a = createWizard() as any;
		a.rawTargets = [{ raw_x: 100, raw_y: 200 }];
		const result = a._renderWizardCorners();
		expect(result).toBeDefined();
	});

	it("renders with too many targets", () => {
		const a = createWizard() as any;
		a.rawTargets = [
			{ raw_x: 100, raw_y: 200 },
			{ raw_x: 300, raw_y: 400 },
		];
		const result = a._renderWizardCorners();
		expect(result).toBeDefined();
	});

	it("renders when all corners marked", () => {
		const a = createWizard() as any;
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
		];
		const result = a._renderWizardCorners();
		expect(result).toBeDefined();
	});

	it("renders wizard saving state", () => {
		const a = createWizard() as any;
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
		];
		a._wizardSaving = true;
		const result = a._renderWizardCorners();
		expect(result).toBeDefined();
	});
});

describe("_renderMiniSensorView (via EppWizard)", () => {
	it("renders sensor FOV view without targets", () => {
		const a = createWizard() as any;
		a.rawTargets = [];
		const result = a._renderMiniSensorView();
		expect(result).toBeDefined();
	});

	it("renders with targets on the FOV view", () => {
		const a = createWizard() as any;
		a.rawTargets = [{ raw_x: 500, raw_y: 1000 }];
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		const result = a._renderMiniSensorView();
		expect(result).toBeDefined();
	});
});

describe("_renderSaveCancelButtons", () => {
	it("renders for editor view", () => {
		const a = createPanel() as any;
		a._view = "editor";
		const result = a._renderSaveCancelButtons();
		expect(result).toBeDefined();
	});

	it("renders for settings view", () => {
		const a = createPanel() as any;
		a._view = "settings";
		const result = a._renderSaveCancelButtons();
		expect(result).toBeDefined();
	});
});

describe("_renderLiveOverview", () => {
	it("renders live overview with perspective", () => {
		const a = createPanel() as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._grid = initGridFromRoom(3000, 4000);
		const result = a._renderLiveOverview();
		expect(result).toBeDefined();
	});

	it("renders live overview without perspective (uncalibrated)", () => {
		const a = createPanel() as any;
		a._perspective = null;
		const result = a._renderLiveOverview();
		expect(result).toBeDefined();
	});

	it("renders with live menu open on panel", () => {
		const a = createPanel() as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._showLiveMenu = true;
		const result = a._renderLiveOverview();
		expect(result).toBeDefined();
	});

	it("renders with live menu open and no perspective on panel", () => {
		const a = createPanel() as any;
		a._perspective = null;
		a._showLiveMenu = true;
		const result = a._renderLiveOverview();
		expect(result).toBeDefined();
	});
});

describe("_renderLiveGrid", () => {
	it("renders a grid with targets", () => {
		const a = createPanel() as any;
		a._grid = initGridFromRoom(3000, 4000);
		a._targets = [
			{
				x: 1500,
				y: 2000,
				raw_x: 1500,
				raw_y: 2000,
				status: "active" as const,
				signal: 5,
			},
		];
		const result = a._renderLiveGrid();
		expect(result).toBeDefined();
	});

	it("renders with hit counts enabled", () => {
		const a = createPanel() as any;
		a._grid = initGridFromRoom(3000, 4000);
		a._showHitCounts = true;
		a._targets = [
			{
				x: 1500,
				y: 2000,
				raw_x: 1500,
				raw_y: 2000,
				status: "active" as const,
				signal: 7,
			},
		];
		const result = a._renderLiveGrid();
		expect(result).toBeDefined();
	});

	it("renders with no room bounds (empty grid)", () => {
		const a = createPanel() as any;
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		const result = a._renderLiveGrid();
		expect(result).toBeDefined();
	});
});

describe("_renderGridDimensions (via EppGrid)", () => {
	it("returns nothing when no metrics", () => {
		const a = createGrid({
			grid: new Uint8Array(GRID_CELL_COUNT),
			roomWidth: 0,
			perspective: null,
		}) as any;
		const result = a._renderGridDimensions();
		expect(result).toBeDefined();
	});
});

describe("_renderUncalibratedFov (via EppWizard)", () => {
	it("renders FOV view with no occupancy", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.sensorState = { occupancy: false };
		a.rawTargets = [];
		const result = a._renderUncalibratedFov();
		expect(result).toBeDefined();
	});

	it("renders FOV view with occupancy", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.sensorState = { occupancy: true };
		const result = a._renderUncalibratedFov();
		expect(result).toBeDefined();
	});

	it("renders with active targets", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.rawTargets = [{ raw_x: 500, raw_y: 1000 }];
		const result = a._renderUncalibratedFov();
		expect(result).toBeDefined();
	});

	it("skips targets with null raw positions", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.rawTargets = [{ raw_x: null, raw_y: null }];
		const result = a._renderUncalibratedFov();
		expect(result).toBeDefined();
	});

	it("shows targets with raw positions even if status is inactive", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.rawTargets = [{ raw_x: 500, raw_y: 1000 }];
		const result = a._renderUncalibratedFov();
		expect(result).toBeDefined();
	});
});

describe("_renderSettings", () => {
	it("renders settings page with closed accordions", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set();
		const result = a._renderSettings();
		expect(result).toBeDefined();
	});

	it("renders with open detection accordion", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["detection"]);
		const result = a._renderSettings();
		expect(result).toBeDefined();
	});

	it("renders with open sensitivity accordion", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["sensitivity"]);
		const result = a._renderSettings();
		expect(result).toBeDefined();
	});

	it("renders with open reporting accordion", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["reporting"]);
		const result = a._renderSettings();
		expect(result).toBeDefined();
	});

	it("renders with all accordions open", () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["detection", "sensitivity", "reporting"]);
		const result = a._renderSettings();
		expect(result).toBeDefined();
	});
});

describe("_renderSettingsSection (via EppSettingsView)", () => {
	it("renders detection section", () => {
		const sv = createSettingsView() as any;
		const result = sv.renderSettingsSection("detection");
		expect(result).toBeDefined();
	});

	it("renders sensitivity section", () => {
		const sv = createSettingsView() as any;
		const result = sv.renderSettingsSection("sensitivity");
		expect(result).toBeDefined();
	});

	it("renders reporting section", () => {
		const sv = createSettingsView() as any;
		const result = sv.renderSettingsSection("reporting");
		expect(result).toBeDefined();
	});

	it("returns nothing for unknown section", () => {
		const sv = createSettingsView() as any;
		const result = sv.renderSettingsSection("unknown");
		expect(result).toBeDefined();
	});
});

describe("_renderDetectionRanges (via EppSettingsView)", () => {
	it("renders with auto range enabled", () => {
		const sv = createSettingsView({
			targetAutoDistance: true,
			staticAutoDistance: true,
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with auto range disabled", () => {
		const sv = createSettingsView({
			targetAutoDistance: false,
			staticAutoDistance: false,
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with grid room metrics", () => {
		const sv = createSettingsView({ grid: initGridFromRoom(3000, 4000) });
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});
});

describe("_renderSensitivities (via EppSettingsView)", () => {
	it("renders sensitivity section with sensor state", () => {
		const sv = createSettingsView();
		const result = (sv as any).renderSensitivities();
		expect(result).toBeDefined();
	});
});

describe("_renderEnvOffset (via EppSettingsView)", () => {
	it("renders offset control with a reading", () => {
		const sv = createSettingsView({ illuminanceOffset: 10 });
		const result = (sv as any).renderEnvOffset(
			"Illuminance offset",
			150,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			0,
			"Adjust illuminance.",
		);
		expect(result).toBeDefined();
	});

	it("renders offset control with null reading", () => {
		const sv = createSettingsView();
		const result = (sv as any).renderEnvOffset(
			"Temperature offset",
			null,
			"temperature",
			-20,
			20,
			0.1,
			"\u00b0C",
			1,
			"Adjust temperature.",
		);
		expect(result).toBeDefined();
	});

	it("renders with no saved offset", () => {
		const sv = createSettingsView();
		const result = (sv as any).renderEnvOffset(
			"Humidity offset",
			45,
			"humidity",
			-50,
			50,
			0.1,
			"%",
			1,
			"Adjust humidity.",
		);
		expect(result).toBeDefined();
	});
});

describe("_infoTip (via EppSettingsView)", () => {
	it("returns defined result", () => {
		const sv = createSettingsView();
		const result = (sv as any).infoTip("Some tip text");
		expect(result).toBeDefined();
	});
});

describe("_renderEntities (via EppSettingsView)", () => {
	it("renders reporting toggles", () => {
		const sv = createSettingsView({
			entitiesConfig: {
				room_occupancy: true,
				room_static_presence: false,
			},
		});
		const result = (sv as any).renderEntities();
		expect(result).toBeDefined();
	});

	it("renders with empty reporting config", () => {
		const sv = createSettingsView({ entitiesConfig: {} });
		const result = (sv as any).renderEntities();
		expect(result).toBeDefined();
	});
});

describe("_renderEditor", () => {
	it("renders editor view with zones sidebar", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._sidebarTab = "zones";
		a._grid = initGridFromRoom(3000, 4000);
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor with targets showing signal badges", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._sidebarTab = "zones";
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._grid = initGridFromRoom(3000, 4000);
		a._targets = [
			{
				x: 1500,
				y: 2000,
				raw_x: 1500,
				raw_y: 2000,
				status: "inactive" as const,
				signal: 7,
			},
			{
				x: null,
				y: null,
				raw_x: null,
				raw_y: null,
				status: "inactive" as const,
				signal: 0,
			},
		];
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor view with furniture sidebar", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		a._grid = initGridFromRoom(3000, 4000);
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor with configuration backup dialog", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showConfigurationBackup = true;
		a._grid = initGridFromRoom(3000, 4000);
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor with configuration restore dialog", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showConfigurationRestore = true;
		a._grid = initGridFromRoom(3000, 4000);
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor with unsaved dialog", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showUnsavedDialog = true;
		a._grid = initGridFromRoom(3000, 4000);
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor with targets", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._grid = initGridFromRoom(3000, 4000);
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
				x: 500,
				y: 1000,
				raw_x: 500,
				raw_y: 1000,
				status: "pending" as const,
				signal: 3,
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
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor with frozen bounds during painting", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._grid = initGridFromRoom(3000, 4000);
		a._frozenBounds = { minCol: 5, maxCol: 15, minRow: 2, maxRow: 12 };
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});

	it("renders editor on empty grid (no room)", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		const result = a._renderEditor();
		expect(result).toBeDefined();
	});
});

describe("_renderConfigurationBackupDialog", () => {
	it("renders save dialog", () => {
		const a = createPanel() as any;
		a._configurationName = "Test";
		const result = a._renderConfigurationBackupDialog();
		expect(result).toBeDefined();
	});
});

describe("_renderConfigurationRestoreDialog", () => {
	it("renders restore dialog with no configurations", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [];
		const result = a._renderConfigurationRestoreDialog();
		expect(result).toBeDefined();
	});

	it("renders restore dialog with configurations", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{ name: "T1", grid: [], zones: [], roomWidth: 3000, roomDepth: 4000 },
			{ name: "T2", grid: [], zones: [], roomWidth: 5000, roomDepth: 6000 },
		];
		const result = a._renderConfigurationRestoreDialog();
		expect(result).toBeDefined();
	});
});

describe("epp-zone-sidebar renders boundary type controls", () => {
	it("renders for default type", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zone0 = { type: "default" };
		el.activeZone = 0;
		el.zoneConfigs = new Array(7).fill(null);
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders for custom type", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zone0 = { type: "custom" };
		el.activeZone = 0;
		el.zoneConfigs = new Array(7).fill(null);
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders for transit type", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zone0 = { type: "transit" };
		el.activeZone = 0;
		el.zoneConfigs = new Array(7).fill(null);
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("epp-zone-sidebar renders zone type controls", () => {
	it("renders for default zone", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = [
			{ name: "Zone 1", color: "#ff0000", type: "default" },
			...new Array(6).fill(null),
		];
		el.activeZone = 1;
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders for custom zone with explicit thresholds", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = [
			{
				name: "Zone 1",
				color: "#ff0000",
				type: "custom",
				trigger: 7,
				renew: 4,
				timeout: 15,
				handoff_timeout: 5,
			},
			...new Array(6).fill(null),
		];
		el.activeZone = 1;
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("epp-zone-sidebar renders zone sidebar", () => {
	it("renders with no zones configured", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with zones configured", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "default",
		};
		el.zoneConfigs[1] = {
			name: "Living",
			color: ZONE_COLORS[1],
			type: "default",
		};
		el.activeZone = 1;
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with active boundary zone", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with zone occupancy glow", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = { name: "Z1", color: ZONE_COLORS[0], type: "default" };
		el.activeZone = 1;
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
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with all zones full (no add button)", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		for (let i = 0; i < 7; i++) {
			el.zoneConfigs[i] = {
				name: `Zone ${i + 1}`,
				color: ZONE_COLORS[i % ZONE_COLORS.length],
				type: "default",
			};
		}
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("_renderFurnitureOverlay", () => {
	it("returns nothing when no furniture", () => {
		const a = createPanel() as any;
		a._furniture = [];
		const result = a._renderFurnitureOverlay(28, 0, 0, 20, 20);
		expect(result).toBeDefined();
	});

	it("renders furniture items", () => {
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
		const result = a._renderFurnitureOverlay(28, 0, 0, 20, 20);
		expect(result).toBeDefined();
	});

	it("renders icon-type furniture", () => {
		const a = createPanel() as any;
		a._furniture = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:desk",
				label: "Desk",
				x: 100,
				y: 200,
				width: 1400,
				height: 700,
				rotation: 45,
				lockAspect: false,
			},
		];
		a._sidebarTab = "furniture";
		a._selectedFurnitureId = null;
		const result = a._renderFurnitureOverlay(28, 0, 0, 20, 20);
		expect(result).toBeDefined();
	});

	it("renders non-interactive when not in furniture tab", () => {
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
		a._sidebarTab = "zones";
		const result = a._renderFurnitureOverlay(28, 0, 0, 20, 20);
		expect(result).toBeDefined();
	});
});

describe("epp-live-sidebar via panel", () => {
	it("renders live sidebar with basic sensors", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with zone occupancy", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "default",
		};
		el.zoneState = {
			occupancy: { 1: true },
			target_counts: { 1: 2 },
			frame_count: 50,
		};
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with no env sensors", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders with expanded sensor info", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el._expandedSensorInfo = "occupancy";
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders without configured zones (still shows rest-of-room)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("epp-furniture-sidebar renders via component", () => {
	function createFurnSidebar(
		overrides: Record<string, any> = {},
	): EppFurnitureSidebar {
		const el = document.createElement("epp-furniture-sidebar") as any;
		el.furniture = [];
		el.selectedFurnitureId = null;
		el.hass = {};
		el.localize = (k: string) => k;
		el.showCustomIconPicker = false;
		el.customIconValue = "";
		Object.assign(el, overrides);
		return el as EppFurnitureSidebar;
	}

	it("renders furniture catalog", () => {
		const el = createFurnSidebar();
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with selected furniture", () => {
		const el = createFurnSidebar({
			furniture: [
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
			],
			selectedFurnitureId: "f1",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with custom icon picker open", () => {
		const el = createFurnSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with empty custom icon value", () => {
		const el = createFurnSidebar({
			showCustomIconPicker: true,
			customIconValue: "",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});
});
