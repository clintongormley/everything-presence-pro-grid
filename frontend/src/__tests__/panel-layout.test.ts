import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import {
	type EPPGridPanel,
	layoutStyles,
	panelStyles,
} from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-grid.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";
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
	a._navGuard._pendingNavigation = null;
	a._saving = false;
	a._showDeleteCalibrationDialog = false;
	a._showConfigurationBackup = false;
	a._showConfigurationRestore = false;
	a._reportingConfig = {};
	a._offsetsConfig = {};
	a._targetAutoRange = true;
	a._targetMaxDistance = 6;
	a._staticAutoRange = true;
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

describe("layout styles", () => {
	const layoutCss = layoutStyles.cssText;

	it("sidebar has flex-shrink: 0 to prevent squeezing", () => {
		// Extract the base (desktop) .zone-sidebar block — the one with
		// width: 240px, not the @media (max-width: 819px) width: auto override.
		const match = layoutCss.match(
			/\.zone-sidebar\s*\{([^}]*width:\s*240px[^}]*)\}/,
		);
		expect(match).not.toBeNull();
		const sidebarCss = match![1];
		expect(sidebarCss).toMatch(/flex-shrink:\s*0/);
	});

	it("sidebar does not clip overflow (so menu is not cut off)", () => {
		const match = layoutCss.match(
			/\.zone-sidebar\s*\{([^}]*width:\s*240px[^}]*)\}/,
		);
		expect(match).not.toBeNull();
		const sidebarCss = match![1];
		// Should NOT have overflow: hidden
		expect(sidebarCss).not.toMatch(/overflow:\s*hidden/);
	});

	it("grid-column constrains width to grid via max-width: min-content", () => {
		// Match the base (desktop) rule, identified by min-width — a separate
		// mobile media-query rule also targets .grid-column (max-width: 100%).
		const match = layoutCss.match(/\.grid-column\s*\{([^}]*min-width[^}]*)\}/);
		expect(match).not.toBeNull();
		const gridColCss = match![1];
		expect(gridColCss).toMatch(/min-width:\s*0/);
		expect(gridColCss).toMatch(/max-width:\s*min-content/);
		// No overflow:hidden — would clip furniture resize/rotate handles
		expect(gridColCss).not.toMatch(/overflow:\s*hidden/);
	});

	it("has scrollable sidebar-scroll wrapper", () => {
		const match = layoutCss.match(/\.sidebar-scroll\s*\{([^}]+)\}/);
		expect(match).not.toBeNull();
		const scrollCss = match![1];
		expect(scrollCss).toMatch(/overflow-y:\s*auto/);
		expect(scrollCss).toMatch(/min-height:\s*0/);
		expect(scrollCss).toMatch(/flex:\s*1/);
	});

	it("layout mobile overrides come after their base rules (cascade order)", () => {
		// Media queries add NO specificity; at equal specificity the LATER rule in
		// the concatenated cssText wins. The mobile @media (max-width: 819px) block
		// overrides .zone-sidebar (width:auto) and .grid-column (max-width:100%), so
		// it MUST come after the base .zone-sidebar (width:240px) and base
		// .grid-column (max-width:min-content) declarations — otherwise the bases win
		// and the grid overflows / the live sidebar stays narrow on phones.
		const sidebarBaseIdx = layoutCss.indexOf("240px");
		const gridColBaseIdx = layoutCss.indexOf("min-content");
		const mediaIdx = layoutCss.indexOf("@media (max-width: 819px)");

		expect(sidebarBaseIdx).toBeGreaterThan(-1);
		expect(gridColBaseIdx).toBeGreaterThan(-1);
		expect(mediaIdx).toBeGreaterThan(sidebarBaseIdx);
		expect(mediaIdx).toBeGreaterThan(gridColBaseIdx);
	});

	it("mobile .panel sets min-width: 0 to drop the flex min-content floor", () => {
		// Bug 1: :host is display:flex; .panel is its flex item, defaulting to
		// min-width:auto → floored at the grid's min-content (~maxGridPx), which
		// overflows a narrow phone. The fix adds min-width:0 to the .panel rule
		// inside the mobile @media (max-width: 819px) block so .panel shrinks to
		// the viewport. happy-dom can't evaluate flex layout, so this is a
		// lightweight cssText guard: the min-width:0 must live AFTER the mobile
		// media-query marker (i.e. inside that block, not the base .panel rule).
		const panelCss = panelStyles.cssText;
		const mediaIdx = panelCss.indexOf("@media (max-width: 819px)");
		const minWidthIdx = panelCss.indexOf("min-width: 0");
		expect(mediaIdx).toBeGreaterThan(-1);
		expect(minWidthIdx).toBeGreaterThan(mediaIdx);
	});
});

describe("live overview layout structure", () => {
	it("left column uses grid-column class", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		const result = a._renderLiveOverview();

		// Render to a temp container to inspect DOM
		const container = document.createElement("div");
		render(result, container);

		const editorLayout = container.querySelector(".editor-layout");
		expect(editorLayout).not.toBeNull();
		const leftCol = editorLayout!.firstElementChild as HTMLElement;
		expect(leftCol.classList.contains("grid-column")).toBe(true);
	});

	it("left column does not use inline min-width style", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		const result = a._renderLiveOverview();

		const container = document.createElement("div");
		render(result, container);

		const editorLayout = container.querySelector(".editor-layout");
		const leftCol = editorLayout!.firstElementChild as HTMLElement;
		// Should use CSS class, not inline style
		expect(leftCol.style.minWidth).toBe("");
	});

	it("sidebar content is wrapped in sidebar-scroll", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		const result = a._renderLiveOverview();

		const container = document.createElement("div");
		render(result, container);

		const sidebar = container.querySelector(".zone-sidebar");
		expect(sidebar).not.toBeNull();
		const scroll = sidebar!.querySelector(".sidebar-scroll");
		expect(scroll).not.toBeNull();
		// The live sidebar component should be inside the scroll wrapper
		expect(scroll!.querySelector("epp-live-sidebar")).not.toBeNull();
	});
});

describe("editor layout structure", () => {
	it("left column uses grid-column class", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		const result = a._renderEditor();

		const container = document.createElement("div");
		render(result, container);

		const editorLayout = container.querySelector(".editor-layout");
		expect(editorLayout).not.toBeNull();
		const leftCol = editorLayout!.firstElementChild as HTMLElement;
		expect(leftCol.classList.contains("grid-column")).toBe(true);
	});

	it("sidebar content is wrapped in sidebar-scroll", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		const result = a._renderEditor();

		const container = document.createElement("div");
		render(result, container);

		const sidebar = container.querySelector(".zone-sidebar");
		expect(sidebar).not.toBeNull();
		const scroll = sidebar!.querySelector(".sidebar-scroll");
		expect(scroll).not.toBeNull();
	});

	it("grid-container click uses composedPath to detect furniture items", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		a._selectedFurnitureId = "test-id";

		const result = a._renderEditor();
		const container = document.createElement("div");
		render(result, container);

		const gridContainer = container.querySelector(
			".grid-container",
		) as HTMLElement;

		// Simulate a click whose composedPath includes a .furniture-item
		const furnitureItem = document.createElement("div");
		furnitureItem.classList.add("furniture-item");
		const clickEvent = new MouseEvent("click", { bubbles: true });
		Object.defineProperty(clickEvent, "composedPath", {
			value: () => [furnitureItem, gridContainer],
		});
		gridContainer.dispatchEvent(clickEvent);

		// Selection should NOT be cleared
		expect(a._selectedFurnitureId).toBe("test-id");
	});

	it("grid-container click clears selection when not on furniture", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		a._selectedFurnitureId = "test-id";

		const result = a._renderEditor();
		const container = document.createElement("div");
		render(result, container);

		const gridContainer = container.querySelector(
			".grid-container",
		) as HTMLElement;

		// Simulate a click whose composedPath has no .furniture-item
		const cellDiv = document.createElement("div");
		cellDiv.classList.add("cell");
		const clickEvent = new MouseEvent("click", { bubbles: true });
		Object.defineProperty(clickEvent, "composedPath", {
			value: () => [cellDiv, gridContainer],
		});
		gridContainer.dispatchEvent(clickEvent);

		// Selection SHOULD be cleared
		expect(a._selectedFurnitureId).toBeNull();
	});
});

describe("setup wizard layout structure", () => {
	it("wraps wizard in .panel so content is centered like other views", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "tutorial";

		const result = a.render();
		const container = document.createElement("div");
		render(result, container);

		const panel = container.querySelector(".panel");
		expect(panel).not.toBeNull();
		const wizard = panel!.querySelector("epp-wizard");
		expect(wizard).not.toBeNull();
	});

	it("wizard header uses the panel device dropdown that shows area", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "tutorial";
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Grid",
				area: "Living Room",
				host: null,
				available: true,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const container = document.createElement("div");
		render(result, container);

		const headers = container.querySelectorAll(".panel-header");
		expect(headers.length).toBe(1);
		const haSelect = headers[0].querySelector("ha-select") as any;
		expect(haSelect).not.toBeNull();
		expect(haSelect.options).toEqual([
			{ value: "AA:BB:CC:DD:EE:01", label: "Grid (Living Room)" },
		]);
	});
});
