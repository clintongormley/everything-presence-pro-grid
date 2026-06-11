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
import { GRID_CELL_COUNT } from "../lib/grid.js";
import { DOCS_BASE_URL } from "../lib/help-url.js";
import { createZoneEngineState } from "../lib/zone-engine.js";
import { setupLocalize } from "../localize.js";

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
	a._sidebarTab = "zones";
	a._panelTab = "config";
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
	a._entitiesConfig = {};
	a._targetAutoDistance = true;
	a._targetMaxDistance = 6;
	a._staticAutoDistance = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	a._zoneEngineState = createZoneEngineState();
	a._showCustomIconPicker = false;
	a._haConnected = true;
	a._localize = setupLocalize();
	return el;
}

function renderPanel(setup: (a: any) => void): HTMLElement {
	const el = createPanel();
	setup(el as any);
	const container = document.createElement("div");
	render((el as any).render(), container);
	return container;
}

function findHelpLink(container: HTMLElement): HTMLAnchorElement {
	const link = container.querySelector(
		".tab-bar a.tab-help",
	) as HTMLAnchorElement | null;
	expect(link).not.toBeNull();
	return link as HTMLAnchorElement;
}

describe("tab-bar help link", () => {
	it("opens in a new tab with rel=noopener noreferrer", () => {
		const c = renderPanel((a) => {
			a._view = "live";
			a._sidebarTab = "zones";
			a._panelTab = "config";
		});
		const link = findHelpLink(c);
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toContain("noopener");
		expect(link.getAttribute("rel")).toContain("noreferrer");
	});

	it("contains an mdi:help-circle-outline icon", () => {
		const c = renderPanel((a) => {
			a._view = "live";
			a._sidebarTab = "zones";
			a._panelTab = "config";
		});
		const link = findHelpLink(c);
		const icon = link.querySelector("ha-icon");
		expect(icon).not.toBeNull();
		expect(icon?.getAttribute("icon")).toBe("mdi:help-circle-outline");
	});

	it("has aria-label from the tabs.help translation key", () => {
		const c = renderPanel((a) => {
			a._view = "live";
			a._sidebarTab = "zones";
			a._panelTab = "config";
		});
		const link = findHelpLink(c);
		expect(link.getAttribute("aria-label")).toBe(setupLocalize()("tabs.help"));
	});

	it("links to live-overview on the live view", () => {
		const c = renderPanel((a) => {
			a._view = "live";
			a._sidebarTab = "zones";
			a._panelTab = "config";
		});
		expect(findHelpLink(c).href).toBe(
			`${DOCS_BASE_URL}user-guide/live-overview/`,
		);
	});

	it("links to detection-zones on editor + zones", () => {
		const c = renderPanel((a) => {
			a._view = "editor";
			a._sidebarTab = "zones";
			a._panelTab = "config";
		});
		expect(findHelpLink(c).href).toBe(
			`${DOCS_BASE_URL}user-guide/detection-zones/`,
		);
	});

	it("links to overlays on editor + overlays", () => {
		const c = renderPanel((a) => {
			a._view = "editor";
			a._sidebarTab = "overlays";
			a._panelTab = "config";
		});
		expect(findHelpLink(c).href).toBe(`${DOCS_BASE_URL}user-guide/overlays/`);
	});

	it("links to furniture on editor + furniture", () => {
		const c = renderPanel((a) => {
			a._view = "editor";
			a._sidebarTab = "furniture";
			a._panelTab = "config";
		});
		expect(findHelpLink(c).href).toBe(`${DOCS_BASE_URL}user-guide/furniture/`);
	});

	it("links to settings on the settings view", () => {
		const c = renderPanel((a) => {
			a._view = "settings";
			a._sidebarTab = "zones";
			a._panelTab = "config";
		});
		expect(findHelpLink(c).href).toBe(`${DOCS_BASE_URL}user-guide/settings/`);
	});

	it("links to calibration on tutorial and calibrate", () => {
		for (const view of ["tutorial", "calibrate"] as const) {
			const c = renderPanel((a) => {
				a._view = view;
				a._sidebarTab = "zones";
				a._panelTab = "config";
			});
			expect(findHelpLink(c).href).toBe(
				`${DOCS_BASE_URL}user-guide/calibration/`,
			);
		}
	});

	it("links to flashing-firmware on the flasher tab regardless of _view", () => {
		const c = renderPanel((a) => {
			a._view = "settings"; // ignored
			a._sidebarTab = "zones";
			a._panelTab = "flasher";
		});
		expect(findHelpLink(c).href).toBe(
			`${DOCS_BASE_URL}user-guide/flashing-firmware/`,
		);
	});
});
