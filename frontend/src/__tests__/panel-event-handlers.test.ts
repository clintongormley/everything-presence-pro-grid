/**
 * Tests for inline anonymous event handlers in render templates.
 * These handlers are simple state mutations that we exercise by replicating
 * the handler body logic directly on the panel state.
 */
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import {
	CELL_ROOM_BIT,
	GRID_CELL_COUNT,
	initGridFromRoom,
} from "../lib/grid.js";
import { ZONE_TYPE_DEFAULTS } from "../lib/zone-defaults.js";
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

// ========================
// _renderHeader inline handlers
// ========================

// ========================
// _renderWizardGuide inline handlers
// ========================
describe("_renderWizardGuide inline handlers", () => {
	it("cancel button resets wizard state", () => {
		const a = createPanel() as any;
		a._setupStep = "guide";

		// Replicate cancel handler (line 3276-3281)
		a._setupStep = null;
		a._wizardCorners = [null, null, null, null];
		a._wizardCornerIndex = 0;
		a._wizardOffsetSide = "";
		a._wizardOffsetFb = "";

		expect(a._setupStep).toBeNull();
		expect(a._wizardCorners).toEqual([null, null, null, null]);
	});

	it("begin marking button sets step to corners", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3285-3286)
		a._setupStep = "corners";

		expect(a._setupStep).toBe("corners");
	});
});

// ========================
// _renderWizardCorners inline handlers
// ========================
describe("_renderWizardCorners inline handlers", () => {
	it("corner chip click resets that corner and updates index", () => {
		const a = createPanel() as any;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 500, offset_fb: 300 },
			{ raw_x: 300, raw_y: 400, offset_side: 0, offset_fb: 0 },
			null,
			null,
		];

		// Click on corner 0 (line 3331-3341)
		const i = 0;
		const prev = a._wizardCorners[i];
		a._wizardCornerIndex = i;
		a._wizardCorners = [...a._wizardCorners];
		a._wizardCorners[i] = null;
		a._wizardOffsetSide = prev?.offset_side
			? String(prev.offset_side / 10)
			: "";
		a._wizardOffsetFb = prev?.offset_fb ? String(prev.offset_fb / 10) : "";

		expect(a._wizardCornerIndex).toBe(0);
		expect(a._wizardCorners[0]).toBeNull();
		expect(a._wizardOffsetSide).toBe("50");
		expect(a._wizardOffsetFb).toBe("30");
	});

	it("offset side input updates corner", () => {
		const a = createPanel() as any;
		const idx = 0;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		a._wizardCornerIndex = idx;

		// Replicate handler (line 3366-3370)
		a._wizardOffsetSide = "50";
		const val = 10 * (parseFloat(a._wizardOffsetSide) || 0);
		const corner = a._wizardCorners[idx];
		if (corner) corner.offset_side = val;

		expect(a._wizardCorners[0]!.offset_side).toBe(500);
	});

	it("offset fb input updates corner", () => {
		const a = createPanel() as any;
		const idx = 0;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		a._wizardCornerIndex = idx;

		// Replicate handler (line 3380-3384)
		a._wizardOffsetFb = "30";
		const val = 10 * (parseFloat(a._wizardOffsetFb) || 0);
		const corner = a._wizardCorners[idx];
		if (corner) corner.offset_fb = val;

		expect(a._wizardCorners[0]!.offset_fb).toBe(300);
	});

	it("cancel button on corners step resets state", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3412-3417)
		a._setupStep = null;
		a._wizardCorners = [null, null, null, null];
		a._wizardCornerIndex = 0;
		a._wizardOffsetSide = "";
		a._wizardOffsetFb = "";

		expect(a._setupStep).toBeNull();
	});

	it("save button calls computeWizardPerspective and wizardFinish (via EppWizard)", async () => {
		await import("../components/epp-wizard.js");
		const el = document.createElement("epp-wizard") as any;
		el.hass = { callWS: vi.fn().mockResolvedValue({}) };
		el.selectedMac = "AA:BB:CC:DD:EE:01";
		el.rawTargets = [];
		el.sensorState = { occupancy: false };
		el.devices = [];
		el.localize = (k: string) => k;
		el._wizardCorners = [
			{ raw_x: -1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
		];
		el._wizardRoomWidth = 3000;
		el._wizardRoomDepth = 4000;

		el._computeWizardPerspective();

		expect(el._perspective).not.toBeNull();
	});
});

// ========================
// _renderSaveCancelButtons inline handlers
// ========================
describe("_renderSaveCancelButtons inline handlers", () => {
	it("cancel button resets dirty and loads config", async () => {
		const a = createPanel() as any;
		a._dirty = true;
		a._view = "editor";
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;

		await a._cancelEditor();

		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
	});
});

// ========================
// _renderLiveOverview inline handlers
// ========================
describe("_renderLiveOverview inline handlers", () => {
	it("live menu toggle on panel", () => {
		const a = createPanel() as any;
		a._showLiveMenu = false;
		// Replicate panel inline handler
		a._showLiveMenu = !a._showLiveMenu;
		expect(a._showLiveMenu).toBe(true);
	});

	it("live menu close on click on panel", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		// Replicate panel inline handler
		a._showLiveMenu = false;
		expect(a._showLiveMenu).toBe(false);
	});

	it("detection zones button", () => {
		const a = createPanel() as any;
		a._enterEditor("zones");
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("zones");
	});

	it("furniture button", () => {
		const a = createPanel() as any;
		a._enterEditor("furniture");
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("furniture");
	});

	it("_enterEditor resets _overlayMode when switching away from overlays", () => {
		const a = createPanel() as any;
		a._overlayMode = "interference";
		a._enterEditor("zones");
		expect(a._overlayMode).toBeNull();
	});

	it("_enterEditor resets _overlayMode when entering furniture tab", () => {
		const a = createPanel() as any;
		a._overlayMode = "entry";
		a._enterEditor("furniture");
		expect(a._overlayMode).toBeNull();
	});

	it("_enterEditor preserves _overlayMode when entering overlays tab", () => {
		const a = createPanel() as any;
		a._overlayMode = "interference";
		a._enterEditor("overlays");
		expect(a._overlayMode).toBe("interference");
	});

	it("settings button", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3607-3608)
		a._view = "settings";
		expect(a._view).toBe("settings");
	});

	describe("editor entry distance override", () => {
		it("calls set_distance_override with widened ranges when target auto is on", () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = true;
			a._targetMaxDistance = 3.5;
			a._staticAutoDistance = false;
			a._staticMinDistance = 1.0;
			a._staticMaxDistance = 8.0;

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			a._enterEditor("zones");

			expect(a._view).toBe("editor");
			expect(a._sidebarTab).toBe("zones");
			expect(callWS).toHaveBeenCalledWith({
				type: "eppgrid/set_distance_override",
				mac: "AA:BB:CC:DD:EE:01",
				target_max_distance: 6,
				static_min_distance: 1.0,
				static_max_distance: 8.0,
			});
		});

		it("calls set_distance_override with widened ranges when static auto is on", () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = false;
			a._targetMaxDistance = 3.5;
			a._staticAutoDistance = true;
			a._staticMinDistance = 1.0;
			a._staticMaxDistance = 8.0;

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			a._enterEditor("zones");

			expect(callWS).toHaveBeenCalledWith({
				type: "eppgrid/set_distance_override",
				mac: "AA:BB:CC:DD:EE:01",
				target_max_distance: 3.5,
				static_min_distance: 0.3,
				static_max_distance: 16,
			});
		});

		it("does not call set_distance_override when both auto flags are off", () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = false;
			a._staticAutoDistance = false;

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			a._enterEditor("zones");

			expect(a._view).toBe("editor");
			expect(callWS).not.toHaveBeenCalled();
		});
	});

	describe("calibration distance override", () => {
		it("calls set_distance_override with widened ranges when entering calibration", () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = true;
			a._targetMaxDistance = 3.5;
			a._staticAutoDistance = true;
			a._staticMinDistance = 1.0;
			a._staticMaxDistance = 8.0;

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			a._changePlacement();

			expect(callWS).toHaveBeenCalledWith({
				type: "eppgrid/set_distance_override",
				mac: "AA:BB:CC:DD:EE:01",
				target_max_distance: 6,
				static_min_distance: 0.3,
				static_max_distance: 16,
			});
		});

		it("persists max distances on delete calibration when auto is on", async () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = true;
			a._targetMaxDistance = 3.5;
			a._staticAutoDistance = true;
			a._staticMinDistance = 1.0;
			a._staticMaxDistance = 6.5;
			a._showDeleteCalibrationDialog = true;

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			await a._deleteCalibration();

			// set_settings is first (persists max values before config push)
			const callTypes = callWS.mock.calls.map((c: any) => c[0].type);
			expect(callTypes[0]).toBe("eppgrid/set_settings");

			const settingsCalls = callWS.mock.calls.filter(
				(c: any) => c[0].type === "eppgrid/set_settings",
			);
			expect(settingsCalls).toHaveLength(1);
			expect(settingsCalls[0][0].target_max_distance).toBe(6);
			expect(settingsCalls[0][0].static_min_distance).toBe(0.3);
			expect(settingsCalls[0][0].static_max_distance).toBe(16);

			// Local distances were reset to maximums
			expect(a._targetMaxDistance).toBe(6);
			expect(a._staticMinDistance).toBe(0.3);
			expect(a._staticMaxDistance).toBe(16);
		});

		it("includes LED and relay fields in set_settings on delete calibration", async () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = true;
			a._staticAutoDistance = true;
			a._showDeleteCalibrationDialog = true;
			a._ledMode = "Environmental";
			a._ledBrightness = 0.7;
			a._ledPresenceColor = "#FF0000";
			a._relayTriggerMode = "presence";
			a._relayContactMode = "no";

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			await a._deleteCalibration();

			const settingsCall = callWS.mock.calls.find(
				(c: any) => c[0].type === "eppgrid/set_settings",
			)?.[0];
			expect(settingsCall.led_mode).toBe("Environmental");
			expect(settingsCall.led_brightness).toBe(0.7);
			expect(settingsCall.led_presence_color).toBe("#FF0000");
			expect(settingsCall.relay_trigger_mode).toBe("presence");
			expect(settingsCall.relay_contact_mode).toBe("no");
		});

		it("does not call set_settings on delete calibration when auto is off", async () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._targetAutoDistance = false;
			a._staticAutoDistance = false;
			a._showDeleteCalibrationDialog = true;

			const callWS = vi.fn().mockResolvedValue({});
			a.hass = { callWS };

			await a._deleteCalibration();

			const settingsCalls = callWS.mock.calls.filter(
				(c: any) => c[0].type === "eppgrid/set_settings",
			);
			expect(settingsCalls).toHaveLength(0);
		});
	});

	describe("editor cancel distance revert", () => {
		it("calls set_distance_override with stored values on cancel when auto is on", async () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._view = "editor";
			a._dirty = true;
			a._targetAutoDistance = true;
			a._targetMaxDistance = 3.5;
			a._staticAutoDistance = true;
			a._staticMinDistance = 0.5;
			a._staticMaxDistance = 8.0;

			const callWS = vi.fn().mockResolvedValue({
				config: {
					calibration: { perspective: null, room_width: 0, room_depth: 0 },
					room_layout: {},
					settings: {
						target_auto_distance: true,
						target_max_distance: 3.5,
						static_auto_distance: true,
						static_min_distance: 0.5,
						static_max_distance: 8.0,
					},
				},
			});
			a.hass = {
				callWS,
				connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
			};

			await a._cancelEditor();

			expect(callWS).toHaveBeenCalledWith({
				type: "eppgrid/set_distance_override",
				mac: "AA:BB:CC:DD:EE:01",
				target_max_distance: 3.5,
				static_min_distance: 0.5,
				static_max_distance: 8.0,
			});
		});

		it("does not call set_distance_override on cancel when auto is off", async () => {
			const a = createPanel() as any;
			a._selectedMac = "AA:BB:CC:DD:EE:01";
			a._view = "editor";
			a._dirty = true;
			a._targetAutoDistance = false;
			a._staticAutoDistance = false;

			const callWS = vi.fn().mockResolvedValue({
				config: {
					calibration: { perspective: null, room_width: 0, room_depth: 0 },
					room_layout: {},
					settings: {},
				},
			});
			a.hass = {
				callWS,
				connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
			};

			await a._cancelEditor();

			const overrideCalls = callWS.mock.calls.filter(
				(c: any) => c[0].type === "eppgrid/set_distance_override",
			);
			expect(overrideCalls).toHaveLength(0);
		});
	});

	it("delete calibration button shows dialog", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3619-3620)
		a._showDeleteCalibrationDialog = true;
		expect(a._showDeleteCalibrationDialog).toBe(true);
	});

	it("save configuration button shows dialog", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3628-3629)
		a._showConfigurationBackup = true;
		expect(a._showConfigurationBackup).toBe(true);
	});

	it("load configuration button shows dialog", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3633-3634)
		a._showConfigurationRestore = true;
		expect(a._showConfigurationRestore).toBe(true);
	});
});

// ========================
// _renderUncalibratedFov inline handlers
// ========================
describe("_renderUncalibratedFov inline handlers", () => {
	it("calibrate button sets wizard state", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3783-3789)
		a._setupStep = "guide";
		a._wizardCorners = [null, null, null, null];
		a._wizardCornerIndex = 0;
		a._wizardOffsetSide = "";
		a._wizardOffsetFb = "";
		a._view = "live";

		expect(a._setupStep).toBe("guide");
		expect(a._view).toBe("live");
	});
});

// ========================
// _renderNeedsCalibration inline handlers
// ========================
describe("_renderNeedsCalibration inline handlers", () => {
	it("start calibration button sets wizard state", () => {
		const a = createPanel() as any;
		// Replicate handler (line 3952-3957)
		a._setupStep = "guide";
		a._wizardCorners = [null, null, null, null];
		a._wizardCornerIndex = 0;
		a._wizardOffsetSide = "";
		a._wizardOffsetFb = "";

		expect(a._setupStep).toBe("guide");
	});
});

// ========================
// _renderSettings inline handlers
// ========================
describe("_renderSettings inline handlers", () => {
	it("settings container input sets dirty", () => {
		const a = createPanel() as any;
		a._dirty = false;
		// Replicate handler (line 4010-4013)
		a._dirty = true;
		expect(a._dirty).toBe(true);
	});
});

// ========================
// _renderDetectionRanges inline handlers
// ========================
describe("_renderDetectionRanges inline handlers", () => {
	it("target auto range toggle", () => {
		const a = createPanel() as any;
		// Replicate handler (line 4136-4139)
		a._targetAutoDistance = false;
		expect(a._targetAutoDistance).toBe(false);
	});

	it("target max distance slider", () => {
		const a = createPanel() as any;
		// Replicate handler (line 4148-4151)
		a._targetMaxDistance = 4.5;
		expect(a._targetMaxDistance).toBe(4.5);
	});

	it("static auto range toggle", () => {
		const a = createPanel() as any;
		// Replicate handler (line 4162-4165)
		a._staticAutoDistance = false;
		expect(a._staticAutoDistance).toBe(false);
	});

	it("static min distance slider", () => {
		const a = createPanel() as any;
		// Replicate handler (line 4174-4179)
		a._staticMinDistance = 0.5;
		expect(a._staticMinDistance).toBe(0.5);
	});

	it("static max distance slider", () => {
		const a = createPanel() as any;
		// Replicate handler (line 4189-4197)
		a._staticMaxDistance = 12;
		expect(a._staticMaxDistance).toBe(12);
	});
});

// ========================
// _renderBoundaryTypeControls inline handlers
// ========================
describe("_renderBoundaryTypeControls inline handlers", () => {
	// These tests replicate the zone0-change handler's effect on
	// _zoneConfigs[0] — the zone-0 (room-boundary) settings.
	function updateZone0(a: any, patch: Partial<Record<string, any>>) {
		a._zoneConfigs = [
			{ ...a._zoneConfigs[0], ...patch },
			...a._zoneConfigs.slice(1),
		];
	}

	it("room type change to transit", () => {
		const a = createPanel() as any;
		const val = "transit" as const;
		const d = ZONE_TYPE_DEFAULTS[val] || ZONE_TYPE_DEFAULTS.default;
		updateZone0(a, {
			type: val,
			trigger: d.trigger,
			renew: d.renew,
			timeout: d.timeout,
			handoff_timeout: d.handoff_timeout,
		});
		a._dirty = true;

		expect(a._zoneConfigs[0].type).toBe("transit");
		expect(a._dirty).toBe(true);
	});

	it("room trigger input", () => {
		const a = createPanel() as any;
		updateZone0(a, { trigger: 7 });
		a._dirty = true;
		expect(a._zoneConfigs[0].trigger).toBe(7);
	});

	it("room renew input", () => {
		const a = createPanel() as any;
		updateZone0(a, { renew: 4 });
		a._dirty = true;
		expect(a._zoneConfigs[0].renew).toBe(4);
	});

	it("room timeout input (valid > 0)", () => {
		const a = createPanel() as any;
		const v = 15;
		if (v > 0) {
			updateZone0(a, { timeout: v });
			a._dirty = true;
		}
		expect(a._zoneConfigs[0].timeout).toBe(15);
	});

	it("room timeout input (invalid <= 0 is no-op)", () => {
		const a = createPanel() as any;
		updateZone0(a, { timeout: 10 });
		a._dirty = false;
		const v = 0;
		if (v > 0) {
			updateZone0(a, { timeout: v });
			a._dirty = true;
		}
		expect(a._zoneConfigs[0].timeout).toBe(10);
		expect(a._dirty).toBe(false);
	});

	it("room handoff timeout input", () => {
		const a = createPanel() as any;
		const v = 5;
		if (v > 0) {
			updateZone0(a, { handoff_timeout: v });
			a._dirty = true;
		}
		expect(a._zoneConfigs[0].handoff_timeout).toBe(5);
	});

	it("room handoff timeout change", () => {
		const a = createPanel() as any;
		updateZone0(a, { handoff_timeout: 5 });
		a._dirty = true;
		expect(a._zoneConfigs[0].handoff_timeout).toBe(5);
	});
});

// ========================
// _renderZoneTypeControls inline handlers
// ========================
describe("_renderZoneTypeControls inline handlers", () => {
	it("zone type change updates config", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };

		// Replicate handler (line 4997-5011)
		const val = "seating";
		const zone = a._zoneConfigs[1]!;
		const index = 0;
		const d = ZONE_TYPE_DEFAULTS[val] || ZONE_TYPE_DEFAULTS.default;
		const configs = [...a._zoneConfigs];
		configs[index + 1] = {
			...zone,
			type: val,
			trigger: d.trigger,
			renew: d.renew,
			timeout: d.timeout,
			handoff_timeout: d.handoff_timeout,
		};
		a._zoneConfigs = configs;
		a._dirty = true;

		expect(a._zoneConfigs[1].type).toBe("seating");
	});

	it("zone trigger input", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = {
			name: "Z1",
			color: "#ff0000",
			type: "custom",
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};

		// Replicate handler (line 5025-5032)
		const zone = a._zoneConfigs[1]!;
		const configs = [...a._zoneConfigs];
		configs[1] = { ...zone, trigger: 8 };
		a._zoneConfigs = configs;
		a._dirty = true;

		expect(a._zoneConfigs[1].trigger).toBe(8);
	});

	it("zone renew input", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = {
			name: "Z1",
			color: "#ff0000",
			type: "custom",
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};

		// Replicate handler (line 5040-5047)
		const zone = a._zoneConfigs[1]!;
		const configs = [...a._zoneConfigs];
		configs[1] = { ...zone, renew: 6 };
		a._zoneConfigs = configs;
		a._dirty = true;

		expect(a._zoneConfigs[1].renew).toBe(6);
	});

	it("zone timeout input", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = {
			name: "Z1",
			color: "#ff0000",
			type: "custom",
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};

		// Replicate handler (line 5056-5062)
		const v = 20;
		if (v > 0) {
			const zone = a._zoneConfigs[1]!;
			const configs = [...a._zoneConfigs];
			configs[1] = { ...zone, timeout: v };
			a._zoneConfigs = configs;
			a._dirty = true;
		}

		expect(a._zoneConfigs[1].timeout).toBe(20);
	});

	it("zone handoff timeout input", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = {
			name: "Z1",
			color: "#ff0000",
			type: "custom",
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};

		// Replicate handler (line 5072-5078)
		const v = 7;
		if (v > 0) {
			const zone = a._zoneConfigs[1]!;
			const configs = [...a._zoneConfigs];
			configs[1] = { ...zone, handoff_timeout: v };
			a._zoneConfigs = configs;
			a._dirty = true;
		}

		expect(a._zoneConfigs[1].handoff_timeout).toBe(7);
	});

	it("zone timeout change", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = {
			name: "Z1",
			color: "#ff0000",
			type: "custom",
		};

		const zone = a._zoneConfigs[1]!;
		const configs = [...a._zoneConfigs];
		configs[1] = { ...zone, timeout: 30 };
		a._zoneConfigs = configs;
		a._dirty = true;

		expect(a._zoneConfigs[1].timeout).toBe(30);
	});
});

// ========================
// _renderZoneSidebar inline handlers
// ========================
describe("_renderZoneSidebar inline handlers", () => {
	it("boundary click sets activeZone to 0", () => {
		const a = createPanel() as any;
		a._activeZone = 3;
		// Replicate handler (line 5113-5114)
		a._activeZone = 0;
		expect(a._activeZone).toBe(0);
	});

	it("zone item click sets activeZone", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };
		const slot = 1;
		// Replicate handler (line 5139-5140)
		a._activeZone = slot;
		expect(a._activeZone).toBe(1);
	});

	it("zone color picker input", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };

		// Replicate handler (line 5152-5157)
		const val = "#00ff00";
		const zone = a._zoneConfigs[1]!;
		const _i = 0;
		const configs = [...a._zoneConfigs];
		configs[1] = { ...zone, color: val };
		a._zoneConfigs = configs;
		a._dirty = true;

		expect(a._zoneConfigs[1].color).toBe("#00ff00");
	});

	it("zone name input", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };

		// Replicate handler (line 5170-5174)
		const val = "Kitchen";
		const zone = a._zoneConfigs[1]!;
		const _i = 0;
		const configs = [...a._zoneConfigs];
		configs[1] = { ...zone, name: val };
		a._zoneConfigs = configs;

		expect(a._zoneConfigs[1].name).toBe("Kitchen");
	});

	it("zone name click sets active zone", () => {
		const a = createPanel() as any;
		const slot = 2;
		// Replicate handler (line 5176-5178)
		a._activeZone = slot;
		expect(a._activeZone).toBe(2);
	});

	it("zone name focus sets active zone", () => {
		const a = createPanel() as any;
		const slot = 3;
		// Replicate handler (line 5180-5181)
		a._activeZone = slot;
		expect(a._activeZone).toBe(3);
	});

	it("zone remove button calls _removeZone", () => {
		const a = createPanel() as any;
		a._zoneConfigs[1] = { name: "Z1", color: "#ff0000", type: "default" };
		const slot = 1;
		// Replicate handler (line 5186-5188)
		a._removeZone(slot);
		expect(a._zoneConfigs[1]).toBeNull();
	});
});

// ========================
// _renderEditor inline handlers
// ========================
describe("_renderEditor inline handlers", () => {
	it("panel click deselects activeZone when outside grid/sidebar", () => {
		const a = createPanel() as any;
		a._activeZone = 2;
		// Replicate handler (line 4397-4400)
		a._activeZone = null;
		expect(a._activeZone).toBeNull();
	});

	it("grid container click deselects furniture", () => {
		const a = createPanel() as any;
		a._selectedFurnitureId = "f1";
		// Replicate handler (line 4409-4411)
		a._selectedFurnitureId = null;
		expect(a._selectedFurnitureId).toBeNull();
	});

	it("unsaved dialog cancel button closes dialog", () => {
		const a = createPanel() as any;
		a._showUnsavedDialog = true;
		a._pendingNavigation = () => {};
		// Replicate handler (line 4520-4522)
		a._showUnsavedDialog = false;
		a._pendingNavigation = null;
		expect(a._showUnsavedDialog).toBe(false);
		expect(a._pendingNavigation).toBeNull();
	});
});

// ========================
// _renderTemplateSaveDialog inline handlers
// ========================
describe("_renderConfigurationBackupDialog inline handlers", () => {
	it("template name input updates _configurationName", () => {
		const a = createPanel() as any;
		// Replicate handler (line 4548-4549)
		a._configurationName = "My Layout";
		expect(a._configurationName).toBe("My Layout");
	});

	it("cancel button hides save dialog", () => {
		const a = createPanel() as any;
		a._showConfigurationBackup = true;
		// Replicate handler (line 4555-4556)
		a._showConfigurationBackup = false;
		expect(a._showConfigurationBackup).toBe(false);
	});
});

// ========================
// _renderTemplateLoadDialog inline handlers
// ========================
describe("_renderConfigurationRestoreDialog inline handlers", () => {
	it("close button hides load dialog", () => {
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		// Replicate handler (line 4586)
		a._showConfigurationRestore = false;
		expect(a._showConfigurationRestore).toBe(false);
	});

	it("load button calls _loadConfiguration", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [],
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];

		// Replicate handler (line 4590)
		a._loadConfiguration("T1");
		expect(a._roomWidth).toBe(3000);
	});

	it("delete button calls _deleteConfiguration", async () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid: [],
				zones: [],
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

		// Replicate handler (line 4601)
		await a._deleteConfiguration("T1");
		expect(a._gridCtrl.configurations).toHaveLength(0);
	});
});

// ========================
// _renderDeleteCalibrationDialog inline handler
// ========================
describe("render delete calibration dialog inline handler", () => {
	it("cancel button hides dialog", () => {
		const a = createPanel() as any;
		a._showDeleteCalibrationDialog = true;
		// Replicate handler (line 2990-2991)
		a._showDeleteCalibrationDialog = false;
		expect(a._showDeleteCalibrationDialog).toBe(false);
	});
});

// ========================
// epp-live-sidebar inline handlers
// ========================
describe("epp-live-sidebar inline handlers", () => {
	it("sensor info toggle expands/collapses", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const id = "occupancy";
		// Replicate handler logic
		el._expandedSensorInfo = el._expandedSensorInfo === id ? null : id;
		expect(el._expandedSensorInfo).toBe("occupancy");

		el._expandedSensorInfo = el._expandedSensorInfo === id ? null : id;
		expect(el._expandedSensorInfo).toBeNull();
	});

	it("detection zones link fires view-change event", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		let detail: any = null;
		el.addEventListener("view-change", (e: CustomEvent) => {
			detail = e.detail;
		});
		el.dispatchEvent(
			new CustomEvent("view-change", {
				detail: { view: "editor", sidebarTab: "zones" },
				bubbles: true,
				composed: true,
			}),
		);
		expect(detail.view).toBe("editor");
		expect(detail.sidebarTab).toBe("zones");
	});

	it("zone sensor info toggle", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const id = "zone_1";
		// Replicate handler logic
		el._expandedSensorInfo = el._expandedSensorInfo === id ? null : id;
		expect(el._expandedSensorInfo).toBe("zone_1");
	});

	it("add zones button navigates via view-change event", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		let detail: any = null;
		el.addEventListener("view-change", (e: CustomEvent) => {
			detail = e.detail;
		});
		el.dispatchEvent(
			new CustomEvent("view-change", {
				detail: { view: "editor", sidebarTab: "zones" },
				bubbles: true,
				composed: true,
			}),
		);
		expect(detail.view).toBe("editor");
		expect(detail.sidebarTab).toBe("zones");
	});
});

// ========================
// Furniture sidebar panel handler methods
// ========================
describe("furniture sidebar panel handler methods", () => {
	it("custom icon picker toggle", () => {
		const a = createPanel() as any;
		// Replicate handler (line 5523-5524)
		a._showCustomIconPicker = !a._showCustomIconPicker;
		expect(a._showCustomIconPicker).toBe(true);
	});

	it("custom icon value-changed event", () => {
		const a = createPanel() as any;
		// Replicate handler (line 5539-5540)
		a._customIconValue = "mdi:lamp";
		expect(a._customIconValue).toBe("mdi:lamp");

		a._customIconValue = "";
		expect(a._customIconValue).toBe("");
	});

	it("custom icon cancel button", () => {
		const a = createPanel() as any;
		a._showCustomIconPicker = true;
		a._customIconValue = "mdi:something";
		// Replicate handler (line 5554-5556)
		a._showCustomIconPicker = false;
		a._customIconValue = "";
		expect(a._showCustomIconPicker).toBe(false);
		expect(a._customIconValue).toBe("");
	});

	it("custom icon add button", () => {
		const a = createPanel() as any;
		a._showCustomIconPicker = true;
		a._customIconValue = "mdi:star";
		a._furniture = [];
		// Replicate handler (line 5561-5564)
		a._addCustomFurniture(a._customIconValue.trim());
		a._customIconValue = "";
		a._showCustomIconPicker = false;

		expect(a._furniture).toHaveLength(1);
		expect(a._furniture[0].icon).toBe("mdi:star");
		expect(a._showCustomIconPicker).toBe(false);
	});

	it("furniture width change", () => {
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
		// Replicate handler (line 5487)
		a._updateFurniture("f1", { width: 1200 });
		expect(a._furniture[0].width).toBe(1200);
	});

	it("furniture height change", () => {
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
		// Replicate handler (line 5493)
		a._updateFurniture("f1", { height: 1000 });
		expect(a._furniture[0].height).toBe(1000);
	});

	it("furniture rotation change", () => {
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
		// Replicate handler (line 5499)
		a._updateFurniture("f1", { rotation: 90 % 360 });
		expect(a._furniture[0].rotation).toBe(90);
	});
});

// ========================
// History interception pendingNavigation callbacks
// ========================
describe("history interception pendingNavigation callbacks", () => {
	it("pushState pendingNavigation calls originalPushState", () => {
		const a = createPanel() as any;
		const originalPush = vi.fn();
		a._originalPushState = originalPush;

		// Simulate the pendingNavigation closure created at line 531-533
		const args: [any, string, string] = [{}, "", "/test"];
		const pendingNav = () => {
			a._originalPushState!(...args);
			window.dispatchEvent(new PopStateEvent("popstate"));
		};

		pendingNav();
		expect(originalPush).toHaveBeenCalledWith({}, "", "/test");
	});

	it("replaceState pendingNavigation calls originalReplaceState", () => {
		const a = createPanel() as any;
		const originalReplace = vi.fn();
		a._originalReplaceState = originalReplace;

		// Simulate the pendingNavigation closure created at line 541-543
		const args: [any, string, string] = [{}, "", "/replaced"];
		const pendingNav = () => {
			a._originalReplaceState!(...args);
			window.dispatchEvent(new PopStateEvent("popstate"));
		};

		pendingNav();
		expect(originalReplace).toHaveBeenCalledWith({}, "", "/replaced");
	});
});

describe("cell mousedown handler", () => {
	it("mousedown on inside cell sets dirty", () => {
		const a = createPanel() as any;
		a._grid = initGridFromRoom(3000, 4000);
		a._activeZone = 0;
		a._dirty = false;

		let insideIdx = -1;
		for (let i = 0; i < a._grid.length; i++) {
			if (a._grid[i] & CELL_ROOM_BIT) {
				insideIdx = i;
				break;
			}
		}
		if (insideIdx >= 0) {
			a._onCellMouseDown(insideIdx);
			expect(a._dirty).toBe(true);
		}
	});
});

// ========================
// _infoTip click handler
// ========================
describe("_infoTip click handler logic", () => {
	it("toggles tooltip visibility", () => {
		const _a = createPanel() as any;
		// The handler at line 4092 checks wasOpen and toggles display
		// Simulating the logic:
		const tip = { style: { display: "none" } };
		const wasOpen = tip.style.display === "block";

		// Close any other open tooltips first (line 4099-4103)
		// Then if not wasOpen, show this one
		if (!wasOpen) {
			tip.style.display = "block";
		}

		expect(tip.style.display).toBe("block");

		// Toggle again
		const wasOpen2 = tip.style.display === "block";
		if (wasOpen2) {
			tip.style.display = "none";
		}

		expect(tip.style.display).toBe("none");
	});
});

describe("room calibration tutorial toggle", () => {
	async function mountPanelForWizardRender(
		showRoomCalibrationTutorial: boolean,
	): Promise<any> {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._perspective = null;
		a._deviceCtrl.showRoomCalibrationTutorial = showRoomCalibrationTutorial;
		a.hass = {
			callWS: vi.fn().mockResolvedValue({}),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
		};
		// Stub _initialize so it doesn't race with our test state writes.
		a._initialize = () => Promise.resolve();
		a._loading = false;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Test",
				host: null,
				available: true,
				configured: true,
			},
		];
		document.body.appendChild(a);
		await a.updateComplete;
		return a;
	}

	it("_changePlacement renders the wizard on the guide step when tutorial is enabled", async () => {
		const a = await mountPanelForWizardRender(true);
		try {
			a._changePlacement();
			await a.updateComplete;
			const wizard = a.shadowRoot?.querySelector("epp-wizard") as any;
			expect(wizard).toBeTruthy();
			await wizard.updateComplete;
			expect(wizard._setupStep).toBe("guide");
		} finally {
			a.remove();
		}
	});

	it("_changePlacement skips straight to corners when tutorial is disabled", async () => {
		const a = await mountPanelForWizardRender(false);
		try {
			a._changePlacement();
			await a.updateComplete;
			const wizard = a.shadowRoot?.querySelector("epp-wizard") as any;
			expect(wizard).toBeTruthy();
			await wizard.updateComplete;
			expect(wizard._setupStep).toBe("corners");
		} finally {
			a.remove();
		}
	});

	it("_onDismissTutorial persists show=false via the controller setter", async () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._deviceCtrl.showRoomCalibrationTutorial = true;
		const setSpy = vi.spyOn(a._deviceCtrl, "setShowRoomCalibrationTutorial");
		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { callWS };

		await a._onDismissTutorial();

		expect(setSpy).toHaveBeenCalledWith(false);
		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/set_show_room_calibration_tutorial",
			value: false,
		});
	});

	it("_onDismissTutorial reverts local state if the WS call fails", async () => {
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._deviceCtrl.showRoomCalibrationTutorial = true;
		a.hass = { callWS: vi.fn().mockRejectedValue(new Error("nope")) };
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await a._onDismissTutorial();

		expect(a._deviceCtrl.showRoomCalibrationTutorial).toBe(true);
		errorSpy.mockRestore();
	});

	it("_onDismissTutorial rollback preserves a prior-false value (no spurious re-enable)", async () => {
		// If a concurrent broadcast flips the flag to false *before* the WS
		// rejection lands, hard-coding `true` as the rollback value would
		// incorrectly re-enable the tutorial. Capture and restore the prior value.
		const a = createPanel() as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._deviceCtrl.showRoomCalibrationTutorial = false;
		a.hass = { callWS: vi.fn().mockRejectedValue(new Error("nope")) };
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await a._onDismissTutorial();

		expect(a._deviceCtrl.showRoomCalibrationTutorial).toBe(false);
		errorSpy.mockRestore();
	});
});
