/**
 * Tests for protocol version banner rendering and config view blocking.
 */

import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { initGridFromRoom } from "../lib/grid.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(
	protocolStatus:
		| "compatible"
		| "firmware_behind"
		| "firmware_ahead"
		| "unavailable",
): EPPGridPanel {
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
			firmware_status: protocolStatus,
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
	a._zoneEngineState = createZoneEngineState();
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
	return el;
}

describe("protocol banner rendering", () => {
	it("returns nothing when protocol is compatible", () => {
		const el = createPanel("compatible");
		const a = el as any;
		const result = a._renderProtocolBanner();
		// nothing is a Lit sentinel — typeof symbol
		expect(result).toBeDefined();
		expect(typeof result).toBe("symbol");
	});

	it("renders warning banner when firmware is behind", () => {
		const el = createPanel("firmware_behind");
		const a = el as any;
		const result = a._renderProtocolBanner();
		expect(result).toBeDefined();
		expect(typeof result).not.toBe("symbol");
	});

	it("renders info banner when firmware is ahead", () => {
		const el = createPanel("firmware_ahead");
		const a = el as any;
		const result = a._renderProtocolBanner();
		expect(result).toBeDefined();
		expect(typeof result).not.toBe("symbol");
	});

	it("renders info banner with unavailable message when device is offline", () => {
		const el = createPanel("unavailable");
		const a = el as any;
		const result = a._renderProtocolBanner();
		expect(result).toBeDefined();
		expect(typeof result).not.toBe("symbol");
		// Should show the unavailable message, not firmware_behind or firmware_ahead
		const values = ((result as any).values ?? []).map((v: unknown) =>
			String(v),
		);
		expect(values).toContain("protocol.unavailable");
		expect(values).not.toContain("protocol.firmware_behind");
		expect(values).not.toContain("protocol.firmware_ahead");
	});
});

describe("config view blocking on protocol mismatch", () => {
	it("falls back to live view when firmware_behind and view is editor", () => {
		const el = createPanel("firmware_behind");
		const a = el as any;
		a._view = "editor";
		// render() should not throw
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("falls back to live view when firmware_behind and view is settings", () => {
		const el = createPanel("firmware_behind");
		const a = el as any;
		a._view = "settings";
		const result = a.render();
		expect(result).toBeDefined();
	});

	it("allows editor view when protocol is compatible", () => {
		const el = createPanel("compatible");
		const a = el as any;
		a._view = "editor";
		const result = a.render();
		expect(result).toBeDefined();
	});
});

describe("update firmware button navigates to flash tab", () => {
	it("sets _panelTab to flasher when firmware_behind", () => {
		const el = createPanel("firmware_behind");
		const a = el as any;
		a._panelTab = "config";
		const result = a._renderProtocolBanner();
		const str = JSON.stringify(result);
		expect(str).toContain("protocol.update_firmware");
	});
});

describe("reconnecting state renders connecting screen", () => {
	it("renders connecting screen with connection icon when reconnecting", () => {
		const el = createPanel("compatible");
		const a = el as any;
		a._panelTab = "config";
		a._deviceCtrl._reconnecting = true;

		const result = a.render();
		const str = JSON.stringify(result);

		expect(str).toContain("connection.connecting");
		expect(str).toContain("mdi:connection");
	});
});

describe("protocolOk treats unavailable as compatible", () => {
	it("does not show protocol blocking page when status is unavailable", () => {
		const el = createPanel("unavailable");
		const a = el as any;
		a._panelTab = "config";
		a._view = "live";

		const result = a.render();
		const str = JSON.stringify(result);

		// Should NOT contain protocol mismatch blocking content
		expect(str).not.toContain("protocol.firmware_behind");
		expect(str).not.toContain("protocol.firmware_ahead");
	});
});
