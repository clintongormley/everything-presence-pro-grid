import { nothing, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-grid.js";
import "../ui/epp-sheet.js";
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

// Shared render-to-DOM fixture: templates are rendered into a container
// attached to <body> so custom elements upgrade and assertions can run
// against real DOM rather than just "the template exists".
const containers: HTMLDivElement[] = [];

afterEach(() => {
	for (const c of containers) c.remove();
	containers.length = 0;
});

function renderTo(tpl: unknown): HTMLDivElement {
	const c = document.createElement("div");
	document.body.appendChild(c);
	containers.push(c);
	render(tpl, c);
	return c;
}

describe("render() dispatches to correct view", () => {
	it("renders loading state when _loading is true", () => {
		const a = createPanel() as any;
		a._loading = true;
		const c = renderTo(a.render());
		const loading = c.querySelector(".loading-container");
		expect(loading).not.toBeNull();
		expect(loading!.textContent).toContain("common.loading");
	});

	it("renders the no-devices empty state when devices is empty and none selected", () => {
		const a = createPanel() as any;
		a._loading = false;
		a._devices = [];
		a._selectedMac = "";
		const c = renderTo(a.render());
		const empty = c.querySelector(".empty-state");
		expect(empty).not.toBeNull();
		expect(empty!.textContent).toContain("flasher.no_eppgrid_devices");
	});

	it("renders wizard when _view is 'tutorial'", () => {
		const a = createPanel() as any;
		a._view = "tutorial";
		const c = renderTo(a.render());
		const wiz = c.querySelector("epp-wizard") as any;
		expect(wiz).not.toBeNull();
		expect(wiz.initialStep).toBe("guide");
	});

	it("renders settings view", () => {
		const a = createPanel() as any;
		a._view = "settings";
		const c = renderTo(a.render());
		const sv = c.querySelector("epp-settings-view") as any;
		expect(sv).not.toBeNull();
		expect(sv.openAccordions).toBe(a._openAccordions);
	});

	it("renders editor view with perspective", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		// Need a grid with some room cells for proper rendering
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a.render());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid).not.toBeNull();
		expect(grid.editable).toBe(true);
		expect(c.querySelector("epp-zone-sidebar")).not.toBeNull();
	});

	it("renders live overview", () => {
		const a = createPanel() as any;
		a._view = "live";
		const c = renderTo(a.render());
		expect(c.querySelector("epp-live-sidebar")).not.toBeNull();
		const grid = c.querySelector("epp-grid") as any;
		expect(grid).not.toBeNull();
		expect(grid.editable).toBe(false);
	});

	it("renders editor in a bottom sheet when _isMobile is true", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._isMobile = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		// Bottom sheet present, with the grid full-width and the sidebar content
		// inside it; the desktop side-by-side layout is gone.
		const sheet = c.querySelector("epp-sheet");
		expect(sheet).not.toBeNull();
		expect(c.querySelector(".editor-mobile")).not.toBeNull();
		expect(c.querySelector(".editor-layout")).toBeNull();
		expect(c.querySelector(".zone-sidebar")).toBeNull();
		// Grid full-width in the mobile grid-container.
		const grid = c.querySelector(
			".editor-mobile .grid-container epp-grid",
		) as any;
		expect(grid).not.toBeNull();
		expect(grid.editable).toBe(true);
		// Sidebar content (zones tab is the default) slotted into the sheet.
		expect(sheet!.querySelector("epp-zone-sidebar")).not.toBeNull();
		// Sub-tab switcher in the sheet peek.
		const tabs = sheet!.querySelectorAll(".sidebar-tabs .sidebar-tab");
		expect(tabs.length).toBe(3);
	});

	it("keeps the desktop side-by-side editor layout when _isMobile is false", () => {
		const a = createPanel() as any;
		a._view = "editor";
		// _isMobile defaults to false (happy-dom matchMedia matches:false).
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		expect(c.querySelector(".editor-layout")).not.toBeNull();
		expect(c.querySelector(".zone-sidebar")).not.toBeNull();
		expect(c.querySelector("epp-sheet")).toBeNull();
		expect(c.querySelector(".editor-mobile")).toBeNull();
	});

	it("switches sub-tab from the mobile sheet peek without leaving the editor", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._isMobile = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		const furnitureTab = [
			...c.querySelectorAll<HTMLButtonElement>(".sidebar-tabs .sidebar-tab"),
		].find((b) => b.getAttribute("aria-selected") === "false");
		expect(furnitureTab).not.toBeUndefined();
		furnitureTab!.click();
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).not.toBe("zones");
	});

	it("renders the editor save bar in the sheet actions only when dirty", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._isMobile = true;
		a._grid = initGridFromRoom(3000, 4000);
		// Clean: no actions slot content.
		a._dirty = false;
		let c = renderTo(a._renderEditor());
		expect(c.querySelector('epp-sheet [slot="actions"]')).toBeNull();
		// Dirty: save bar present in the actions slot.
		a._dirty = true;
		c = renderTo(a._renderEditor());
		expect(
			c.querySelector('epp-sheet [slot="actions"] .save-cancel-bar'),
		).not.toBeNull();
	});

	it("tracks the bottom sheet open state from sheet-open-changed", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._isMobile = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		const sheet = c.querySelector("epp-sheet") as HTMLElement;
		expect(a._editorSheetOpen).toBe(false);
		sheet.dispatchEvent(
			new CustomEvent("sheet-open-changed", {
				detail: { open: true },
				bubbles: true,
				composed: true,
			}),
		);
		expect(a._editorSheetOpen).toBe(true);
	});

	it("keeps the active zone selected when tapping inside the mobile sheet", () => {
		// Regression: on mobile the editor controls live inside <epp-sheet>
		// (slotted), not in a .zone-sidebar. The panel-level @click handler must
		// exempt epp-sheet so a tap that selects a zone (or hits the Room button)
		// in the sheet doesn't immediately clear _activeZone on the same click.
		const a = createPanel() as any;
		a._view = "editor";
		a._isMobile = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		const sheet = c.querySelector("epp-sheet") as HTMLElement;
		expect(sheet).not.toBeNull();
		// User has a zone selected (e.g. just tapped a zone row in the sheet).
		a._activeZone = 2;
		a._justPainted = false;
		// A click originating inside the sheet bubbles up to the .panel handler.
		const target =
			(sheet.querySelector("epp-zone-sidebar") as HTMLElement) ?? sheet;
		target.dispatchEvent(
			new MouseEvent("click", { bubbles: true, composed: true }),
		);
		// Active zone must survive — the sheet is exempted in onPanelClick.
		expect(a._activeZone).toBe(2);
	});

	it("flips _isMobile when the media query change fires", () => {
		const a = createPanel() as any;
		// _onMql mirrors MediaQueryListEvent.matches onto _isMobile.
		a._onMql({ matches: true } as MediaQueryListEvent);
		expect(a._isMobile).toBe(true);
		a._onMql({ matches: false } as MediaQueryListEvent);
		expect(a._isMobile).toBe(false);
	});

	it("renders delete calibration dialog", () => {
		const a = createPanel() as any;
		a._view = "live";
		a._showDeleteCalibrationDialog = true;
		const c = renderTo(a.render());
		const dialog = c.querySelector("epp-dialog[open]");
		expect(dialog).not.toBeNull();
		expect(dialog?.getAttribute("heading")).toContain(
			"dialogs.delete_calibration_title",
		);
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
	it("renders the device picker with the selected device", () => {
		const a = createPanel() as any;
		const c = renderTo(a._renderHeader());
		const select = c.querySelector("ha-select") as any;
		expect(select).not.toBeNull();
		expect(select.value).toBe("AA:BB:CC:DD:EE:01");
		expect(select.options).toEqual([
			{ value: "AA:BB:CC:DD:EE:01", label: "Test" },
		]);
	});
});

describe("_renderWizard (via EppWizard)", () => {
	it("renders guide step", () => {
		const a = createWizard() as any;
		a._setupStep = "guide";
		const c = renderTo(a._renderWizard());
		expect(c.textContent).toContain("wizard.how_calibration_works");
		expect(c.querySelector(".capture-overlay")).toBeNull();
	});

	it("renders corners step", () => {
		const a = createWizard() as any;
		a._setupStep = "corners";
		const c = renderTo(a._renderWizardCorners());
		expect(c.querySelector(".wizard-card")).not.toBeNull();
		expect(c.querySelectorAll(".corner-chip").length).toBe(4);
	});

	it("renders with capture in progress", () => {
		const a = createWizard() as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		a._wizardCaptureProgress = 0.5;
		const c = renderTo(a._renderWizard());
		expect(c.querySelector(".capture-overlay")).not.toBeNull();
		const fill = c.querySelector(".capture-fill") as HTMLElement;
		expect(fill).not.toBeNull();
		expect(fill.getAttribute("style")).toContain("width: 50%");
	});

	it("renders with capture paused", () => {
		const a = createWizard() as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		a._wizardCapturePaused = true;
		const c = renderTo(a._renderWizard());
		expect(c.querySelector(".capture-overlay")).not.toBeNull();
		expect(c.textContent).toContain("wizard.paused");
	});
});

describe("_renderWizardGuide (via EppWizard)", () => {
	it("renders guide content", () => {
		const a = createWizard() as any;
		const c = renderTo(a._renderWizardGuide());
		expect(c.textContent).toContain("wizard.begin_marking");
		expect(c.querySelector("ha-checkbox")).not.toBeNull();
	});
});

describe("_renderWizardCorners (via EppWizard)", () => {
	it("renders corner marking step with no targets", () => {
		const a = createWizard() as any;
		a.rawTargets = [];
		const c = renderTo(a._renderWizardCorners());
		const warning = c.querySelector(".no-target-warning") as HTMLElement;
		expect(warning).not.toBeNull();
		expect(warning.getAttribute("style")).toContain("visibility: visible");
		expect(warning.textContent).toContain("wizard.no_target");
		const mark = c.querySelector(
			"epp-button[variant='primary']",
		) as HTMLElement & { disabled: boolean };
		expect(mark.disabled).toBe(true);
	});

	it("renders with active target", () => {
		const a = createWizard() as any;
		a.rawTargets = [{ raw_x: 100, raw_y: 200 }];
		const c = renderTo(a._renderWizardCorners());
		const warning = c.querySelector(".no-target-warning") as HTMLElement;
		expect(warning.getAttribute("style")).toContain("visibility: hidden");
		const mark = c.querySelector(
			"epp-button[variant='primary']",
		) as HTMLElement & { disabled: boolean };
		expect(mark.disabled).toBe(false);
		expect(mark.textContent).toContain("wizard.mark_corner");
	});

	it("renders with too many targets", () => {
		const a = createWizard() as any;
		a.rawTargets = [
			{ raw_x: 100, raw_y: 200 },
			{ raw_x: 300, raw_y: 400 },
		];
		const c = renderTo(a._renderWizardCorners());
		const warning = c.querySelector(".no-target-warning") as HTMLElement;
		expect(warning.getAttribute("style")).toContain("visibility: visible");
		expect(warning.textContent).toContain("wizard.multiple_targets");
		const mark = c.querySelector(
			"epp-button[variant='primary']",
		) as HTMLElement & { disabled: boolean };
		expect(mark.disabled).toBe(true);
	});

	it("renders when all corners marked", () => {
		const a = createWizard() as any;
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
		];
		const c = renderTo(a._renderWizardCorners());
		expect(c.querySelectorAll(".corner-chip.done").length).toBe(4);
		expect(c.textContent).toContain("wizard.save_prompt");
		const save = c.querySelector(
			"epp-button[variant='primary']",
		) as HTMLElement & { disabled: boolean };
		expect(save.textContent).toContain("common.save");
		expect(save.disabled).toBe(false);
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
		const c = renderTo(a._renderWizardCorners());
		const save = c.querySelector(
			"epp-button[variant='primary']",
		) as HTMLElement & { disabled: boolean };
		expect(save.disabled).toBe(true);
		expect(save.textContent).toContain("common.saving");
	});
});

describe("_renderMiniSensorView (via EppWizard)", () => {
	it("renders sensor FOV view without targets", () => {
		const a = createWizard() as any;
		a.rawTargets = [];
		const c = renderTo(a._renderMiniSensorView());
		expect(c.querySelector(".sensor-fov-svg")).not.toBeNull();
		expect(c.querySelectorAll(".mini-grid-target").length).toBe(0);
		expect(c.querySelectorAll(".mini-grid-captured").length).toBe(0);
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
		const c = renderTo(a._renderMiniSensorView());
		expect(c.querySelectorAll(".mini-grid-target").length).toBe(1);
		expect(c.querySelectorAll(".mini-grid-captured").length).toBe(1);
	});
});

describe("_renderSaveCancelButtons", () => {
	it("renders cancel and save buttons", () => {
		const a = createPanel() as any;
		a._view = "editor";
		const c = renderTo(a._renderSaveCancelButtons());
		expect(c.querySelector(".save-cancel-bar")).not.toBeNull();
		expect(c.querySelector(".cancel-btn")?.textContent).toContain(
			"common.cancel",
		);
		expect(c.querySelector(".save-btn")?.textContent).toContain("common.save");
	});

	it("disables save when clean and enables it when dirty", () => {
		const a = createPanel() as any;
		a._dirty = false;
		let c = renderTo(a._renderSaveCancelButtons());
		expect((c.querySelector(".save-btn") as HTMLButtonElement).disabled).toBe(
			true,
		);
		a._dirty = true;
		c = renderTo(a._renderSaveCancelButtons());
		expect((c.querySelector(".save-btn") as HTMLButtonElement).disabled).toBe(
			false,
		);
	});
});

describe("_renderLiveOverview", () => {
	it("renders live overview with perspective", () => {
		const a = createPanel() as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderLiveOverview());
		expect(c.querySelector("epp-grid")).not.toBeNull();
		expect(c.querySelector("epp-live-sidebar")).not.toBeNull();
		expect(c.querySelector("epp-wizard")).toBeNull();
	});

	it("renders live overview without perspective (uncalibrated)", () => {
		const a = createPanel() as any;
		a._perspective = null;
		const c = renderTo(a._renderLiveOverview());
		const wiz = c.querySelector("epp-wizard");
		expect(wiz).not.toBeNull();
		expect(wiz!.getAttribute("mode")).toBe("uncalibrated-fov");
		expect(c.querySelector("epp-grid")).toBeNull();
	});

	it("renders the live-overview kebab with all entries when calibrated", () => {
		const a = createPanel() as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const c = renderTo(a._renderLiveOverview());
		const kebab = c.querySelector("epp-kebab-menu") as unknown as {
			items: { id?: string; divider?: true }[];
		};
		expect(kebab).not.toBeNull();
		// Zones/overlays/furniture + settings + calibration + delete +
		// backup + restore.
		const ids = kebab.items.filter((i) => !i.divider).map((i) => i.id);
		expect(ids.length).toBe(8);
		expect(ids).toContain("delete_calibration");
	});

	it("hides editor + delete-calibration entries when uncalibrated", () => {
		const a = createPanel() as any;
		a._perspective = null;
		const c = renderTo(a._renderLiveOverview());
		const kebab = c.querySelector("epp-kebab-menu") as unknown as {
			items: { id?: string; divider?: true }[];
		};
		expect(kebab).not.toBeNull();
		const ids = kebab.items.filter((i) => !i.divider).map((i) => i.id);
		// Editor entries and delete-calibration are hidden without a
		// calibration: settings + calibration + backup + restore remain.
		expect(ids).toEqual(["settings", "calibration", "backup", "restore"]);
	});
});

describe("_renderLiveGrid", () => {
	it("renders a grid with the panel state bound", () => {
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
		const c = renderTo(a._renderLiveGrid());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid).not.toBeNull();
		expect(grid.grid).toBe(a._grid);
		expect(grid.roomWidth).toBe(3000);
		expect(grid.roomDepth).toBe(4000);
		expect(grid.maxGridPx).toBe(480);
	});

	it("passes targets through to epp-grid", () => {
		const a = createPanel() as any;
		a._grid = initGridFromRoom(3000, 4000);
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
		const c = renderTo(a._renderLiveGrid());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid.targets).toHaveLength(1);
		expect(grid.targets[0].status).toBe("active");
		expect(grid.targets[0].signal).toBe(7);
	});

	it("renders with no room bounds (empty grid)", () => {
		const a = createPanel() as any;
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		const c = renderTo(a._renderLiveGrid());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid).not.toBeNull();
		expect(grid.grid).toBe(a._grid);
		expect(grid.targets).toEqual([]);
	});
});

describe("_renderGridDimensions (via EppGrid)", () => {
	it("returns nothing when no metrics", () => {
		const a = createGrid({
			grid: new Uint8Array(GRID_CELL_COUNT),
			roomWidth: 0,
			perspective: null,
		}) as any;
		expect(a._renderGridDimensions(null)).toBe(nothing);
	});
});

describe("_renderUncalibratedFov (via EppWizard)", () => {
	it("renders FOV view with no occupancy", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.sensorState = { occupancy: false };
		a.rawTargets = [];
		const c = renderTo(a._renderUncalibratedFov());
		expect(c.textContent).toContain("wizard.no_presence");
		expect(c.querySelectorAll("circle[r='5']").length).toBe(0);
	});

	it("renders FOV view with occupancy", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.sensorState = { occupancy: true };
		const c = renderTo(a._renderUncalibratedFov());
		expect(c.textContent).toContain("live.detected");
		expect(c.textContent).not.toContain("wizard.no_presence");
	});

	it("renders with active targets", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.rawTargets = [{ raw_x: 500, raw_y: 1000 }];
		const c = renderTo(a._renderUncalibratedFov());
		expect(c.querySelectorAll("circle[r='5']").length).toBe(1);
	});

	it("skips targets with null raw positions", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.rawTargets = [{ raw_x: null, raw_y: null }];
		const c = renderTo(a._renderUncalibratedFov());
		expect(c.querySelectorAll("circle[r='5']").length).toBe(0);
	});

	it("shows targets with raw positions even if status is inactive", () => {
		const a = createWizard({ mode: "uncalibrated-fov" }) as any;
		a.rawTargets = [{ raw_x: 500, raw_y: 1000, status: "inactive" }];
		const c = renderTo(a._renderUncalibratedFov());
		expect(c.querySelectorAll("circle[r='5']").length).toBe(1);
	});
});

describe("_renderSettings", () => {
	async function renderSettings(a: any): Promise<EppSettingsView> {
		const c = renderTo(a._renderSettings());
		const sv = c.querySelector("epp-settings-view") as EppSettingsView;
		expect(sv).not.toBeNull();
		await sv.updateComplete;
		return sv;
	}

	it("renders settings page with closed accordions", async () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set();
		const sv = await renderSettings(a);
		expect(sv.shadowRoot!.querySelectorAll(".accordion-header").length).toBe(5);
		expect(sv.shadowRoot!.querySelectorAll(".accordion-body").length).toBe(0);
	});

	it("renders with open detection accordion", async () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["detection"]);
		const sv = await renderSettings(a);
		const body = sv.shadowRoot!.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			body!.querySelector('epp-card[heading="settings.target_sensor"]'),
		).not.toBeNull();
	});

	it("renders with open sensitivity accordion", async () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["sensitivity"]);
		const sv = await renderSettings(a);
		const body = sv.shadowRoot!.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			body!.querySelector('epp-card[heading="settings.motion_sensor"]'),
		).not.toBeNull();
	});

	it("renders with open reporting accordion", async () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["reporting"]);
		const sv = await renderSettings(a);
		const body = sv.shadowRoot!.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			body!.querySelector('epp-card[heading="entities.room_level"]'),
		).not.toBeNull();
	});

	it("renders with all accordions open", async () => {
		const a = createPanel() as any;
		a._view = "settings";
		a._openAccordions = new Set(["detection", "sensitivity", "reporting"]);
		const sv = await renderSettings(a);
		expect(sv.shadowRoot!.querySelectorAll(".accordion-body").length).toBe(3);
	});
});

describe("_renderSettingsSection (via EppSettingsView)", () => {
	it("renders detection section", () => {
		const sv = createSettingsView() as any;
		const c = renderTo(sv.renderSettingsSection("detection"));
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			c.querySelector('epp-card[heading="settings.target_sensor"]'),
		).not.toBeNull();
		expect(c.querySelectorAll(".setting-range").length).toBe(3);
	});

	it("renders sensitivity section", () => {
		const sv = createSettingsView() as any;
		const c = renderTo(sv.renderSettingsSection("sensitivity"));
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			c.querySelector('epp-card[heading="settings.motion_sensor"]'),
		).not.toBeNull();
		// 6 sensitivity sliders + assisted-clear timeout + 3 environmental offset sliders.
		expect(c.querySelectorAll(".setting-range").length).toBe(10);
	});

	it("renders reporting section", () => {
		const sv = createSettingsView() as any;
		const c = renderTo(sv.renderSettingsSection("reporting"));
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			c.querySelector('epp-card[heading="entities.room_level"]'),
		).not.toBeNull();
		// 6 room + 2 zone + 4 target + 4 environmental toggles.
		expect(c.querySelectorAll("epp-toggle").length).toBe(16);
	});

	it("returns nothing for unknown section", () => {
		const sv = createSettingsView() as any;
		expect(sv.renderSettingsSection("unknown")).toBe(nothing);
	});
});

describe("_renderDetectionRanges (via EppSettingsView)", () => {
	function dimmedRows(c: HTMLElement): Element[] {
		// Disabled rows are greyed out via the .row-disabled class (the row's
		// controls get pointer-events: none in CSS, while the info tip stays
		// interactive).
		return Array.from(c.querySelectorAll(".setting-row.row-disabled"));
	}

	it("renders with auto range enabled", () => {
		const sv = createSettingsView({
			targetAutoDistance: true,
			staticAutoDistance: true,
		});
		const c = renderTo((sv as any).renderDetectionRanges());
		// All three distance sliders are dimmed/locked in auto mode.
		expect(dimmedRows(c).length).toBe(3);
	});

	it("renders with auto range disabled", () => {
		const sv = createSettingsView({
			targetAutoDistance: false,
			staticAutoDistance: false,
		});
		const c = renderTo((sv as any).renderDetectionRanges());
		expect(dimmedRows(c).length).toBe(0);
		const ranges = c.querySelectorAll(
			".setting-range",
		) as NodeListOf<HTMLInputElement>;
		// Sliders reflect the configured (non-auto) distances.
		expect(ranges[0].value).toBe("6");
		expect(ranges[1].value).toBe("0.3");
		expect(ranges[2].value).toBe("16");
	});

	it("renders with grid room metrics", () => {
		const sv = createSettingsView({ grid: initGridFromRoom(3000, 4000) });
		const c = renderTo((sv as any).renderDetectionRanges());
		expect(c.textContent).toContain("settings.furthest_point");
	});
});

describe("_renderSensitivities (via EppSettingsView)", () => {
	it("renders sensitivity section with sensor state", () => {
		const sv = createSettingsView();
		const c = renderTo((sv as any).renderSensitivities());
		// Heading is now in epp-card shadow DOM; check the heading attribute.
		expect(
			c.querySelector('epp-card[heading="settings.environmental"]'),
		).not.toBeNull();
		expect(c.querySelectorAll(".setting-range").length).toBe(10);
	});
});

describe("_renderEnvOffset (via EppSettingsView)", () => {
	it("renders offset control with a reading", () => {
		const sv = createSettingsView({ illuminanceOffset: 10 });
		const c = renderTo(
			(sv as any).renderEnvOffset(
				"Illuminance offset",
				150,
				"illuminance",
				-500,
				500,
				1,
				"lux",
				0,
				"Adjust illuminance.",
			),
		);
		// reading 150 already includes the saved offset 10: raw 140 + 10.
		expect(c.querySelector(".setting-value")?.textContent).toBe("150");
		expect((c.querySelector(".setting-range") as HTMLInputElement).value).toBe(
			"10",
		);
	});

	it("renders offset control with null reading", () => {
		const sv = createSettingsView();
		const c = renderTo(
			(sv as any).renderEnvOffset(
				"Temperature offset",
				null,
				"temperature",
				-20,
				20,
				0.1,
				"°C",
				1,
				"Adjust temperature.",
			),
		);
		expect(c.querySelector(".setting-value")?.textContent).toBe("—");
	});

	it("renders with no saved offset", () => {
		const sv = createSettingsView();
		const c = renderTo(
			(sv as any).renderEnvOffset(
				"Humidity offset",
				45,
				"humidity",
				-50,
				50,
				0.1,
				"%",
				1,
				"Adjust humidity.",
			),
		);
		expect(c.querySelector(".setting-value")?.textContent).toBe("45.0");
		expect((c.querySelector(".setting-range") as HTMLInputElement).value).toBe(
			"0",
		);
	});
});

describe("_infoTip (via EppSettingsView)", () => {
	it("delegates to a shared epp-info-tip carrying the tip text", () => {
		const sv = createSettingsView();
		const c = renderTo((sv as any).infoTip("Some tip text"));
		const tip = c.querySelector("epp-info-tip") as any;
		expect(tip).not.toBeNull();
		expect(tip.text).toBe("Some tip text");
	});
});

describe("_renderEntities (via EppSettingsView)", () => {
	function toggle(c: HTMLElement, key: string): any {
		const el = c.querySelector(`epp-toggle[data-entity-key="${key}"]`) as any;
		expect(el).not.toBeNull();
		return el;
	}

	it("renders reporting toggles", () => {
		const sv = createSettingsView({
			entitiesConfig: {
				room_occupancy: true,
				room_static_presence: false,
			},
		});
		const c = renderTo((sv as any).renderEntities());
		expect(toggle(c, "room_occupancy").checked).toBe(true);
		expect(toggle(c, "room_static_presence").checked).toBe(false);
	});

	it("renders with empty reporting config", () => {
		const sv = createSettingsView({ entitiesConfig: {} });
		const c = renderTo((sv as any).renderEntities());
		// Defaults apply: occupancy + zone presence on, the rest off.
		expect(toggle(c, "room_occupancy").checked).toBe(true);
		expect(toggle(c, "zone_presence").checked).toBe(true);
		// A perspective is configured, so zone toggles are not disabled.
		expect(toggle(c, "zone_presence").disabled).toBe(false);
		expect(toggle(c, "target_xy").checked).toBe(false);
	});
});

describe("_renderEditor", () => {
	it("renders editor view with zones sidebar", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._sidebarTab = "zones";
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		expect(c.querySelector("epp-zone-sidebar")).not.toBeNull();
		expect(c.querySelector("epp-furniture-sidebar")).toBeNull();
		expect((c.querySelector("epp-grid") as any).editable).toBe(true);
	});

	it("passes fresh target objects to the grid (render purity)", () => {
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
		const c = renderTo(a._renderEditor());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid.targets).toHaveLength(2);
		// Each editor target is a fresh object; the originals must never be
		// mutated by the render path.
		expect(grid.targets[0]).not.toBe(a._targets[0]);
		expect(grid.targets[0].x).toBe(1500);
		expect(a._targets[0].status).toBe("inactive");
	});

	it("renders editor view with furniture sidebar", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a._renderEditor());
		expect(c.querySelector("epp-furniture-sidebar")).not.toBeNull();
		expect(c.querySelector("epp-zone-sidebar")).toBeNull();
	});

	it("renders editor with configuration backup dialog", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showConfigurationBackup = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a.render());
		expect(c.querySelector("epp-grid")).not.toBeNull();
		const dialogs = c.querySelector("epp-configuration-dialogs") as any;
		expect(dialogs).not.toBeNull();
		expect(dialogs.showBackup).toBe(true);
	});

	it("renders editor with configuration restore dialog", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showConfigurationRestore = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a.render());
		const dialogs = c.querySelector("epp-configuration-dialogs") as any;
		expect(dialogs).not.toBeNull();
		expect(dialogs.showRestore).toBe(true);
	});

	it("renders editor with unsaved dialog", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showUnsavedDialog = true;
		a._grid = initGridFromRoom(3000, 4000);
		const c = renderTo(a.render());
		const dialog = c.querySelector("epp-dialog[open]");
		expect(dialog).not.toBeNull();
		expect(dialog?.getAttribute("heading")).toContain(
			"dialogs.unsaved_changes",
		);
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
		const c = renderTo(a._renderEditor());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid.targets).toHaveLength(3);
		expect(grid.targets.map((t: any) => t.x)).toEqual([1500, 500, 0]);
	});

	it("renders editor with frozen bounds during painting", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._grid = initGridFromRoom(3000, 4000);
		a._frozenBounds = { minCol: 5, maxCol: 15, minRow: 2, maxRow: 12 };
		const c = renderTo(a._renderEditor());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid.frozenBounds).toBe(a._frozenBounds);
	});

	it("renders editor on empty grid (no room)", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		const c = renderTo(a._renderEditor());
		const grid = c.querySelector("epp-grid") as any;
		expect(grid).not.toBeNull();
		expect(grid.grid).toBe(a._grid);
	});
});

describe("epp-zone-sidebar renders boundary type controls", () => {
	function boundarySidebar(type: string) {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zone0 = { type };
		el.activeZone = 0;
		el.zoneConfigs = new Array(7).fill(null);
		return el;
	}

	it("renders for default type", () => {
		const el = boundarySidebar("default");
		const c = renderTo(el.render());
		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		expect(select).not.toBeNull();
		expect(select.dataset.value).toBe("default");
		// Non-custom types lock the threshold controls.
		const trigger = c.querySelector('input[type="range"]') as HTMLInputElement;
		expect(trigger.disabled).toBe(true);
	});

	it("renders for custom type", () => {
		const el = boundarySidebar("custom");
		const c = renderTo(el.render());
		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		expect(select.dataset.value).toBe("custom");
		const trigger = c.querySelector('input[type="range"]') as HTMLInputElement;
		expect(trigger.disabled).toBe(false);
	});

	it("renders for transit type", () => {
		const el = boundarySidebar("transit");
		const c = renderTo(el.render());
		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		expect(select.dataset.value).toBe("transit");
		const trigger = c.querySelector('input[type="range"]') as HTMLInputElement;
		expect(trigger.disabled).toBe(true);
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
		const c = renderTo(el.render());
		const name = c.querySelector(".zone-name-input") as HTMLInputElement;
		expect(name.value).toBe("Zone 1");
		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		expect(select.dataset.value).toBe("default");
		const trigger = c.querySelector(
			'.zone-settings-row input[type="range"]',
		) as HTMLInputElement;
		expect(trigger.disabled).toBe(true);
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
		const c = renderTo(el.render());
		const ranges = c.querySelectorAll(
			'.zone-settings-row input[type="range"]',
		) as NodeListOf<HTMLInputElement>;
		expect(ranges).toHaveLength(2);
		expect(ranges[0].value).toBe("7"); // trigger
		expect(ranges[0].disabled).toBe(false);
		expect(ranges[1].value).toBe("4"); // renew
		const numbers = c.querySelectorAll(
			'.zone-settings-row input[type="number"]',
		) as NodeListOf<HTMLInputElement>;
		expect(numbers[0].value).toBe("15"); // timeout
		expect(numbers[1].value).toBe("5"); // handoff timeout
	});
});

describe("epp-zone-sidebar renders zone sidebar", () => {
	it("renders with no zones configured", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		const c = renderTo(el.render());
		// Only the room row, plus the add-zone button.
		expect(c.querySelectorAll(".zone-item").length).toBe(1);
		expect(c.querySelector(".add-zone-btn")).not.toBeNull();
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
		const c = renderTo(el.render());
		expect(c.querySelectorAll(".zone-item").length).toBe(3);
		const names = Array.from(
			c.querySelectorAll(".zone-name-input"),
		) as HTMLInputElement[];
		expect(names.map((n) => n.value)).toEqual(["Kitchen", "Living"]);
		// The active zone-item is the Kitchen row (slot 1).
		const active = c.querySelector(".zone-item.active");
		expect(active).not.toBeNull();
		expect(
			(active!.querySelector(".zone-name-input") as HTMLInputElement).value,
		).toBe("Kitchen");
	});

	it("renders with active boundary zone", () => {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		const c = renderTo(el.render());
		const active = c.querySelector(".zone-item.active");
		expect(active).not.toBeNull();
		expect(active!.textContent).toContain("sidebar.room");
		// The boundary row expands its type controls when selected.
		expect(active!.querySelector(".sensitivity-select")).not.toBeNull();
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
		const c = renderTo(el.render());
		// Active + occupied zone renders the color picker with the glow on.
		const picker = c.querySelector("epp-zone-color-picker") as any;
		expect(picker).not.toBeNull();
		expect(picker.occupiedGlow).toBe(true);
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
		const c = renderTo(el.render());
		expect(c.querySelectorAll(".zone-item").length).toBe(8);
		expect(c.querySelector(".add-zone-btn")).toBeNull();
	});
});

describe("epp-live-sidebar via panel", () => {
	it("renders live sidebar with basic sensors", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const c = renderTo(el.render());
		expect(c.textContent).toContain("live.presence");
		// Occupancy, static, motion, target presence and mmwave rows.
		expect(c.querySelectorAll(".live-sensor-row").length).toBe(5);
	});

	it("renders with zone occupancy", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
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
		const c = renderTo(el.render());
		const rows = Array.from(c.querySelectorAll(".live-sensor-row"));
		const kitchen = rows.find((r) => r.textContent?.includes("Kitchen"));
		expect(kitchen).toBeTruthy();
		expect(
			kitchen!
				.querySelector(".live-sensor-state")!
				.classList.contains("detected"),
		).toBe(true);
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
		const c = renderTo(el.render());
		expect(c.querySelectorAll(".live-sensor-value").length).toBe(0);
		expect(c.textContent).not.toContain("live.environment");
	});

	it("attaches an info tip carrying each sensor's info text", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const c = renderTo(el.render());
		const tips = Array.from(c.querySelectorAll("epp-info-tip"));
		expect(tips.length).toBeGreaterThan(0);
		const occupancyTip = tips.find((t) => (t as any).text === "info.occupancy");
		expect(occupancyTip).toBeTruthy();
	});

	it("renders without configured zones (still shows rest-of-room)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		const c = renderTo(el.render());
		expect(c.textContent).toContain("sidebar.rest_of_room");
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
		const c = renderTo((el as any)._renderFurnitureSidebar());
		expect(c.querySelector(".furn-search")).not.toBeNull();
		expect(c.querySelectorAll(".furn-sticker").length).toBeGreaterThan(1);
		expect(c.querySelector(".furn-selected-info")).toBeNull();
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
		const c = renderTo((el as any)._renderFurnitureSidebar());
		expect(c.querySelector(".furn-selected-info")).not.toBeNull();
		const dims = c.querySelectorAll(
			'.furn-dims input[type="number"]',
		) as NodeListOf<HTMLInputElement>;
		expect(dims).toHaveLength(3);
		expect(dims[0].value).toBe("80"); // width cm
		expect(dims[1].value).toBe("80"); // height cm
		expect(dims[2].value).toBe("45"); // rotation
	});

	it("renders with custom icon picker open", () => {
		const el = createFurnSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const c = renderTo((el as any)._renderFurnitureSidebar());
		expect(c.querySelector("epp-dialog[open]")).not.toBeNull();
		expect(c.querySelector("ha-icon-picker")).not.toBeNull();
		const add = c.querySelector(
			"epp-dialog[open] .wizard-btn-primary",
		) as HTMLButtonElement;
		expect(add.disabled).toBe(false);
	});

	it("renders with empty custom icon value", () => {
		const el = createFurnSidebar({
			showCustomIconPicker: true,
			customIconValue: "",
		});
		const c = renderTo((el as any)._renderFurnitureSidebar());
		const add = c.querySelector(
			"epp-dialog[open] .wizard-btn-primary",
		) as HTMLButtonElement;
		expect(add.disabled).toBe(true);
	});
});
