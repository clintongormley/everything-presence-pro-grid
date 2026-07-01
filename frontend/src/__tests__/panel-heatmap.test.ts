import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-grid.js";
import "../ui/index.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";
import { persistHeatmapEnabled } from "../lib/storage.js";

const MAC = "AA:BB:CC:DD:EE:01";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	// Force isConnected=true without appending — appendChild fires
	// connectedCallback which auto-runs _initialize and races with the
	// explicit calls each test makes. _initialize early-exits on
	// !isConnected to avoid scheduling retries against a detached host.
	Object.defineProperty(el, "isConnected", {
		value: true,
		configurable: true,
	});
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
	a._devices = [];
	a._selectedMac = "";
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._saving = false;
	a._showUnsavedDialog = false;
	a._navGuard._pendingNavigation = null;
	a._view = "live";
	a._targets = [];
	a._rawTargets = [];
	a._targetTrails = [[], [], []];
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
	return el;
}

function selectCalibratedDevice(
	panel: EPPGridPanel,
	overrides: Record<string, unknown> = {},
): void {
	const a = panel as any;
	a._devices = [
		{
			mac: MAC,
			name: "T",
			host: null,
			available: true,
			configured: true,
			firmware_status: "compatible",
			current_connection_count: 3,
			...overrides,
		},
	];
	a._selectedMac = MAC;
}

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

describe("heatmap panel wiring", () => {
	it("shows the heatmap toggle on live and passes showHeatmap to epp-grid when on", () => {
		const panel = createPanel() as any;
		selectCalibratedDevice(panel, { firmware_status: "compatible" });
		panel._view = "live";
		const c = renderTo(panel._renderLiveOverview());

		const toggle = c.querySelector("epp-toggle.heatmap-toggle") as any;
		expect(toggle).not.toBeNull();
		expect(toggle.disabled).toBeFalsy();

		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: true },
				bubbles: true,
				composed: true,
			}),
		);

		expect(panel._heatmapEnabled).toBe(true);

		render(panel._renderLiveOverview(), c);
		const grid = c.querySelector("epp-grid") as any;
		expect(grid.showHeatmap).toBe(true);
	});

	it("disables the heatmap toggle when firmware is behind", () => {
		const panel = createPanel() as any;
		selectCalibratedDevice(panel, { firmware_status: "firmware_behind" });
		panel._view = "live";
		const c = renderTo(panel._renderLiveOverview());

		const toggle = c.querySelector("epp-toggle.heatmap-toggle") as any;
		expect(toggle).not.toBeNull();
		expect(toggle.disabled).toBe(true);
	});

	it("disables the toggle with a memory hint when the build flag is false", () => {
		const panel = createPanel() as any;
		selectCalibratedDevice(panel, {
			firmware_status: "compatible",
			heatmap: false,
		});
		panel._view = "live";
		const c = renderTo(panel._renderLiveOverview());

		const toggle = c.querySelector("epp-toggle.heatmap-toggle") as any;
		expect(toggle).not.toBeNull();
		expect(toggle.disabled).toBe(true);

		const tip = c.querySelector("epp-tooltip") as any;
		expect(tip?.content).toMatch(/memory/i);
	});

	it("passes _targetTrails through to epp-grid as .trails", () => {
		const panel = createPanel() as any;
		selectCalibratedDevice(panel, { firmware_status: "compatible" });
		panel._view = "live";
		panel._targetTrails = [[{ x: 1, y: 2 }], [], []];
		const c = renderTo(panel._renderLiveOverview());

		const grid = c.querySelector("epp-grid") as any;
		expect(grid.trails).toEqual([[{ x: 1, y: 2 }], [], []]);
	});

	it("shows the heatmap toggle in the editor grid column too", () => {
		const panel = createPanel() as any;
		selectCalibratedDevice(panel, { firmware_status: "compatible" });
		panel._view = "editor";
		panel._sidebarTab = "zones";
		const c = renderTo(panel._renderEditor());

		const toggle = c.querySelector("epp-toggle.heatmap-toggle") as any;
		expect(toggle).not.toBeNull();
	});
});

describe("heatmap restore on device load", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("does not act on a stale stored 'on' flag when firmware is behind", async () => {
		const panel = createPanel() as any;
		persistHeatmapEnabled(MAC, true);
		selectCalibratedDevice(panel, { firmware_status: "firmware_behind" });
		const setHeatmapEnabled = vi.spyOn(panel._deviceCtrl, "setHeatmapEnabled");

		await panel._loadDeviceConfig(MAC);

		expect(panel._heatmapEnabled).toBe(false);
		expect(setHeatmapEnabled).toHaveBeenCalledWith(false);
	});

	it("does not act on a stale stored 'on' flag when the build flag is false (no_memory)", async () => {
		const panel = createPanel() as any;
		persistHeatmapEnabled(MAC, true);
		selectCalibratedDevice(panel, {
			firmware_status: "compatible",
			heatmap: false,
		});
		const setHeatmapEnabled = vi.spyOn(panel._deviceCtrl, "setHeatmapEnabled");

		await panel._loadDeviceConfig(MAC);

		expect(panel._heatmapEnabled).toBe(false);
		expect(setHeatmapEnabled).toHaveBeenCalledWith(false);
	});

	it("restores the stored 'on' flag when the device is available", async () => {
		const panel = createPanel() as any;
		persistHeatmapEnabled(MAC, true);
		selectCalibratedDevice(panel, { firmware_status: "compatible" });
		const setHeatmapEnabled = vi.spyOn(panel._deviceCtrl, "setHeatmapEnabled");

		await panel._loadDeviceConfig(MAC);

		expect(panel._heatmapEnabled).toBe(true);
		expect(setHeatmapEnabled).toHaveBeenCalledWith(true);
	});

	it("leaves the persisted preference itself untouched when unavailable", async () => {
		const panel = createPanel() as any;
		persistHeatmapEnabled(MAC, true);
		selectCalibratedDevice(panel, { firmware_status: "firmware_behind" });

		await panel._loadDeviceConfig(MAC);

		// The stored preference is not overwritten — only whether we ACT on
		// it at load time is gated. A later reconnect on compatible firmware
		// should still see "on".
		expect(localStorage.getItem(`epp_heatmap_enabled_${MAC}`)).toBe("1");
	});
});
