import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	GRID_CELL_COUNT,
	initGridFromRoom,
} from "../lib/grid.js";
import { ZONE_TYPE_DEFAULTS } from "../lib/zone-defaults.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	a._zoneConfigs = new Array(7).fill(null);
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._devices = [];
	a._selectedMac = "";
	a._perspective = null;
	a._roomWidth = 0;
	a._roomDepth = 0;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._setupStep = null;
	a._saving = false;
	a._showUnsavedDialog = false;
	a._pendingNavigation = null;
	a._view = "live";
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
	return el;
}

describe("_initialize", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("does nothing when hass is null", async () => {
		const a = el as any;
		el.hass = null;
		await a._initialize();
		expect(a._loading).toBe(false); // unchanged from setup
	});

	it("loads devices and config when hass is available", async () => {
		const a = el as any;
		const devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Sensor 1",
				host: "192.168.1.10",
				available: true,
				configured: true,
			},
		];
		el.hass = {
			callWS: vi.fn().mockImplementation((msg: any) => {
				if (msg.type === "eppgrid/list_devices") {
					return Promise.resolve({ devices });
				}
				if (msg.type === "eppgrid/get_config") {
					return Promise.resolve({
						config: {
							calibration: {
								perspective: null,
								room_width: 0,
								room_depth: 0,
							},
							room_layout: {},
						},
					});
				}
				return Promise.resolve({});
			}),
			connection: {
				subscribeMessage: vi.fn().mockResolvedValue(() => {}),
			},
		};

		await a._initialize();

		expect(a._loading).toBe(false);
		expect(a._devices).toEqual(devices);
	});
});

describe("_loadDevices", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("sorts devices alphabetically by name", async () => {
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockResolvedValue({
				devices: [
					{
						mac: "AA:BB:CC:DD:EE:02",
						name: "Zebra",
						host: null,
						available: true,
						configured: true,
					},
					{
						mac: "AA:BB:CC:DD:EE:01",
						name: "Apple",
						host: null,
						available: true,
						configured: true,
					},
				],
			}),
		};

		await a._loadDevices();

		expect(a._devices[0].name).toBe("Apple");
		expect(a._devices[1].name).toBe("Zebra");
	});

	it("sets _devices to empty on error", async () => {
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("fail")),
		};

		await a._loadDevices();

		expect(a._devices).toEqual([]);
	});

	it("selects the stored mac from localStorage if available", async () => {
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockResolvedValue({
				devices: [
					{
						mac: "AA:BB:CC:DD:EE:01",
						name: "A",
						host: null,
						available: true,
						configured: true,
					},
					{
						mac: "AA:BB:CC:DD:EE:02",
						name: "B",
						host: null,
						available: true,
						configured: true,
					},
				],
			}),
		};

		localStorage.setItem("epp_selected_mac", "AA:BB:CC:DD:EE:02");

		await a._loadDevices();

		expect(a._selectedMac).toBe("AA:BB:CC:DD:EE:02");

		localStorage.removeItem("epp_selected_mac");
	});

	it("selects first device when stored mac not found", async () => {
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockResolvedValue({
				devices: [
					{
						mac: "AA:BB:CC:DD:EE:01",
						name: "A",
						host: null,
						available: true,
						configured: true,
					},
				],
			}),
		};

		localStorage.setItem("epp_selected_mac", "nonexistent");

		await a._loadDevices();

		expect(a._selectedMac).toBe("AA:BB:CC:DD:EE:01");

		localStorage.removeItem("epp_selected_mac");
	});

	it("sets empty string when no devices available", async () => {
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockResolvedValue({ devices: [] }),
		};

		await a._loadDevices();

		expect(a._selectedMac).toBe("");
	});
});

describe("_loadDeviceConfig", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("calls get_config and opens device session", async () => {
		const a = el as any;
		const unsubFn = vi.fn();
		el.hass = {
			callWS: vi.fn().mockResolvedValue({
				config: {
					calibration: {
						perspective: [1, 0, 0, 0, 1, 0, 0, 0],
						room_width: 3000,
						room_depth: 4000,
					},
					room_layout: {},
				},
			}),
			connection: {
				subscribeMessage: vi.fn().mockResolvedValue(unsubFn),
			},
		};

		await a._loadDeviceConfig("AA:BB:CC:DD:EE:01");

		expect(el.hass.callWS).toHaveBeenCalledWith({
			type: "eppgrid/get_config",
			mac: "AA:BB:CC:DD:EE:01",
		});
		expect(el.hass.connection.subscribeMessage).toHaveBeenCalled();
	});

	it("handles error gracefully", async () => {
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("fail")),
			connection: {
				subscribeMessage: vi.fn().mockResolvedValue(() => {}),
			},
		};

		// Should not throw
		await expect(
			a._loadDeviceConfig("AA:BB:CC:DD:EE:01"),
		).resolves.toBeUndefined();
	});
});

describe("_applyConfig", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("applies calibration data from config", () => {
		const a = el as any;
		const config = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
				room_depth: 4000,
			},
			room_layout: {},
		};

		a._applyConfig(config);

		expect(a._perspective).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
		expect(a._roomWidth).toBe(3000);
		expect(a._roomDepth).toBe(4000);
		expect(a._setupStep).toBeNull();
	});

	it("applies furniture from config", () => {
		const a = el as any;
		const config = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
				room_depth: 4000,
			},
			room_layout: {
				furniture: [
					{
						type: "svg",
						icon: "armchair",
						label: "Chair",
						x: 100,
						y: 200,
						width: 800,
						height: 800,
						rotation: 0,
					},
				],
			},
		};

		a._applyConfig(config);

		expect(a._furniture).toHaveLength(1);
		expect(a._furniture[0].icon).toBe("armchair");
	});

	it("applies room thresholds from config", () => {
		const a = el as any;
		const config = {
			calibration: {
				perspective: null,
				room_width: 0,
				room_depth: 0,
			},
			room_layout: {
				room_type: "entrance",
				room_trigger: 3,
				room_renew: 2,
				room_timeout: 5,
				room_handoff_timeout: 2,
				room_entry_point: true,
			},
		};

		a._applyConfig(config);

		expect(a._roomType).toBe("entrance");
		expect(a._roomTrigger).toBe(3);
		expect(a._roomRenew).toBe(2);
		expect(a._roomTimeout).toBe(5);
		expect(a._roomHandoffTimeout).toBe(2);
		expect(a._roomEntryPoint).toBe(true);
	});

	it("applies reporting and offsets config", () => {
		const a = el as any;
		const config = {
			calibration: { perspective: null, room_width: 0, room_depth: 0 },
			room_layout: {},
			reporting: { room_occupancy: true },
			offsets: { illuminance: 10 },
		};

		a._applyConfig(config);

		expect(a._reportingConfig).toEqual({ room_occupancy: true });
		expect(a._offsetsConfig).toEqual({ illuminance: 10 });
	});
});

describe("_applyLayout", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("calls set_room_layout and resets dirty", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._roomType = "normal";
		a._roomTrigger = 5;
		a._roomRenew = 3;
		a._roomTimeout = 10;
		a._roomHandoffTimeout = 3;
		a._roomEntryPoint = false;

		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		expect(el.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/set_room_layout",
				mac: "AA:BB:CC:DD:EE:01",
			}),
		);
		expect(a._dirty).toBe(false);
		expect(a._saving).toBe(false);
		expect(a._view).toBe("live");
	});

	it("strips zones with zero painted cells on save", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._grid = initGridFromRoom(3000, 4000);
		a._zoneConfigs[0] = { name: "Z1", color: "#ff0000", type: "normal" };
		a._zoneConfigs[1] = { name: "Z2", color: "#00ff00", type: "normal" };
		// Paint one cell with zone 1 but leave zone 2 unpainted
		for (let i = 0; i < a._grid.length; i++) {
			if (a._grid[i] & CELL_ROOM_BIT) {
				a._grid[i] = cellSetZone(a._grid[i], 1);
				break;
			}
		}
		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
		};

		await a._applyLayout();

		// Zone 1 kept (has cells), zone 2 removed (no cells)
		expect(a._zoneConfigs[0]).not.toBeNull();
		expect(a._zoneConfigs[1]).toBeNull();
	});

	it("resets _saving on error", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;

		el.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("fail")),
		};

		await expect(a._applyLayout()).rejects.toThrow("fail");
		expect(a._saving).toBe(false);
	});
});

describe("_saveSettings", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("resets saving flag even when container is missing", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._saving = false;

		const callWS = vi.fn().mockResolvedValue({});
		el.hass = { callWS };

		// Provide a minimal shadowRoot mock with no .settings-container
		Object.defineProperty(el, "shadowRoot", {
			value: {
				querySelector: () => null,
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		await a._saveSettings();

		// _saveSettings is now a stub that just resets state
		expect(a._saving).toBe(false);
	});
});

describe("_deleteCalibration", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("resets all calibration state and calls backend", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._dirty = true;

		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._deleteCalibration();

		expect(a._perspective).toBeNull();
		expect(a._roomWidth).toBe(0);
		expect(a._roomDepth).toBe(0);
		expect(a._zoneConfigs.every((z: any) => z === null)).toBe(true);
		expect(a._furniture).toEqual([]);
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
		expect(a._roomType).toBe("normal");
		expect(a._roomEntryPoint).toBe(false);

		// Should have called set_setup and set_room_layout
		expect(el.hass.callWS).toHaveBeenCalledTimes(2);
	});

	it("handles backend error gracefully", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];

		const err = vi.spyOn(console, "error").mockImplementation(() => {});
		el.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("fail")),
		};

		await a._deleteCalibration();

		expect(err).toHaveBeenCalled();
		expect(a._dirty).toBe(false);
		err.mockRestore();
	});
});

describe("_onDeviceChange", () => {
	it("guards navigation and loads new config", async () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = false;
		a._selectedMac = "old";

		el.hass = {
			callWS: vi.fn().mockResolvedValue({
				config: {
					calibration: {
						perspective: null,
						room_width: 0,
						room_depth: 0,
					},
					room_layout: {},
				},
			}),
			connection: {
				subscribeMessage: vi.fn().mockResolvedValue(() => {}),
			},
		};

		const fakeEvent = {
			target: { value: "new_mac" },
		};

		await a._onDeviceChange(fakeEvent);

		expect(a._selectedMac).toBe("new_mac");
	});

	it("shows unsaved dialog when dirty", async () => {
		const el = createPanel();
		const a = el as any;
		a._dirty = true;

		const fakeEvent = {
			target: { value: "new_mac" },
		};

		a._onDeviceChange(fakeEvent);

		expect(a._showUnsavedDialog).toBe(true);
	});
});
