import { nothing } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	GRID_CELL_COUNT,
	initGridFromRoom,
	NUM_ZONE_SLOTS,
} from "../lib/grid.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	a._zoneConfigs = [
		{ type: "normal", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
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
				subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
					if (msg.type === "eppgrid/subscribe_device_list") {
						cb({ devices });
						return Promise.resolve(() => {});
					}
					return Promise.resolve(() => {});
				}),
			},
		};

		await a._initialize();

		expect(a._loading).toBe(false);
		expect(a._devices).toEqual(devices);
	});

	it("retries when subscribe_device_list fails", async () => {
		vi.useFakeTimers();
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
		let subCount = 0;
		let listCount = 0;
		el.hass = {
			callWS: vi.fn().mockImplementation((msg: any) => {
				if (msg.type === "eppgrid/list_devices") {
					listCount++;
					if (listCount === 1) return Promise.reject(new Error("unknown"));
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
				subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
					if (msg.type === "eppgrid/subscribe_device_list") {
						subCount++;
						if (subCount <= 2) return Promise.reject(new Error("unknown"));
						cb({ devices });
						return Promise.resolve(() => {});
					}
					return Promise.resolve(() => {});
				}),
			},
		};

		a._initialize();
		await vi.advanceTimersByTimeAsync(0);

		// First attempt: subscription fails, fallback loadDevices also fails — no devices
		expect(a._devices).toEqual([]);

		// Retry fires after 2s — subscription fails again, fallback loadDevices succeeds
		await vi.advanceTimersByTimeAsync(2000);
		await vi.advanceTimersByTimeAsync(0);

		expect(a._devices).toEqual(devices);
		expect(a._loading).toBe(false);

		vi.useRealTimers();
	});

	it("clears previous retry timer on re-entry", async () => {
		vi.useFakeTimers();
		const a = el as any;
		el.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("unknown")),
			connection: {
				subscribeMessage: vi.fn().mockResolvedValue(() => {}),
			},
		};

		// First call schedules retry
		a._initialize();
		await vi.advanceTimersByTimeAsync(0);
		const firstTimer = a._initRetryTimer;
		expect(firstTimer).toBeDefined();

		// Second call before retry fires should clear the first timer
		a._initialize();
		await vi.advanceTimersByTimeAsync(0);
		expect(a._initRetryTimer).not.toBe(firstTimer);

		vi.useRealTimers();
	});

	it("does not flip _loading back to true during retry when no devices found", async () => {
		vi.useFakeTimers();
		const a = el as any;

		let subCount = 0;
		const secondSubscribe: { release: () => void } = {
			release: () => {
				/* set below */
			},
		};
		el.hass = {
			callWS: vi.fn().mockResolvedValue({ devices: [] }),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
					if (msg.type === "eppgrid/subscribe_device_list") {
						subCount++;
						cb({ devices: [] });
						if (subCount === 1) {
							return Promise.resolve(() => {});
						}
						return new Promise<() => void>((resolve) => {
							secondSubscribe.release = () => resolve(() => {});
						});
					}
					return Promise.resolve(() => {});
				}),
			},
		};

		await a._initialize();
		expect(a._loading).toBe(false);
		expect(a._devices).toEqual([]);

		// Fire the retry timer and let _initialize start running.
		vi.advanceTimersByTime(2000);
		await Promise.resolve();
		await Promise.resolve();

		// During the retry, _loading MUST NOT flip back to true, or the UI
		// flickers between "no devices" and "loading" every 2 seconds.
		expect(a._loading).toBe(false);

		secondSubscribe.release();
		await vi.advanceTimersByTimeAsync(0);
		expect(a._loading).toBe(false);

		vi.useRealTimers();
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

describe("updated() reconnecting guard", () => {
	it("does not call _loadDeviceConfig when reconnecting is true", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = false;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "T",
				host: null,
				available: true,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		// Simulate: no active session but reconnecting in progress
		a._deviceCtrl.closeDeviceSession();
		a._deviceCtrl._reconnecting = true;

		const loadSpy = vi
			.spyOn(a, "_loadDeviceConfig")
			.mockResolvedValue(undefined);

		const changed = new Map<string, any>([["hass", undefined]]);
		a.updated(changed);

		expect(loadSpy).not.toHaveBeenCalled();
		loadSpy.mockRestore();
		a._deviceCtrl._reconnecting = false;
	});

	it("calls _loadDeviceConfig when session is lost and not reconnecting", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = false;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "T",
				host: null,
				available: true,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		// Simulate: no active session and not reconnecting
		a._deviceCtrl.closeDeviceSession();

		const loadSpy = vi
			.spyOn(a, "_loadDeviceConfig")
			.mockResolvedValue(undefined);

		const changed = new Map<string, any>([["hass", undefined]]);
		a.updated(changed);

		expect(loadSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:01");
		loadSpy.mockRestore();
	});

	it("does not auto-load config for a device reporting available=false", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = false;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:02",
				name: "NewDevice",
				host: null,
				available: false,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:02";
		a._haConnected = true;

		// Simulate: no active session and not reconnecting
		a._deviceCtrl.closeDeviceSession();

		const loadSpy = vi
			.spyOn(a, "_loadDeviceConfig")
			.mockResolvedValue(undefined);

		const changed = new Map<string, any>([["hass", undefined]]);
		a.updated(changed);

		expect(loadSpy).not.toHaveBeenCalled();
		loadSpy.mockRestore();
	});

	it("auto-loads config once the selected device flips to available=true", () => {
		const el = createPanel();
		const a = el as any;
		a._loading = false;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:02",
				name: "NewDevice",
				host: null,
				available: false,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:02";
		a._haConnected = true;

		// Simulate: no active session and not reconnecting
		a._deviceCtrl.closeDeviceSession();

		const loadSpy = vi
			.spyOn(a, "_loadDeviceConfig")
			.mockResolvedValue(undefined);

		const changed = new Map<string, any>([["hass", undefined]]);

		// First update: device is still unavailable, guard must block
		a.updated(changed);
		expect(loadSpy).not.toHaveBeenCalled();

		// Device list push flips availability — next update must trigger load
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:02",
				name: "NewDevice",
				host: null,
				available: true,
				configured: true,
			},
		];
		a.updated(changed);

		expect(loadSpy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:02");
		loadSpy.mockRestore();
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

	it("applies zone 0 (room-boundary) settings from zone_slots[0]", () => {
		const a = el as any;
		const config = {
			calibration: {
				perspective: null,
				room_width: 0,
				room_depth: 0,
			},
			room_layout: {
				zone_slots: [
					{
						type: "thoroughfare",
						trigger: 3,
						renew: 2,
						timeout: 5,
						handoff_timeout: 2,
					},
					null,
					null,
					null,
					null,
					null,
					null,
					null,
				],
			},
		};

		a._applyConfig(config);

		expect(a._zoneConfigs[0]).toEqual({
			type: "thoroughfare",
			trigger: 3,
			renew: 2,
			timeout: 5,
			handoff_timeout: 2,
		});
	});

	it("applies settings from config", () => {
		const a = el as any;
		const config = {
			calibration: { perspective: null, room_width: 0, room_depth: 0 },
			room_layout: {},
			settings: {
				temperature_offset: -1.5,
				humidity_offset: 2.0,
				illuminance_offset: -10,
				motion_timeout: 10,
				target_auto_distance: false,
				target_max_distance: 4,
				static_auto_distance: false,
				static_min_distance: 1,
				static_max_distance: 8,
				static_trigger_threshold: 5,
				static_renew_threshold: 4,
				static_timeout: 60,
				static_on_delay: 2,
			},
			entities: { room_occupancy: true },
		};
		a._applyConfig(config);
		expect(a._temperatureOffset).toBe(-1.5);
		expect(a._humidityOffset).toBe(2.0);
		expect(a._illuminanceOffset).toBe(-10);
		expect(a._motionTimeout).toBe(10);
		expect(a._targetAutoDistance).toBe(false);
		expect(a._targetMaxDistance).toBe(4);
		expect(a._staticAutoDistance).toBe(false);
		expect(a._staticMinDistance).toBe(1);
		expect(a._staticMaxDistance).toBe(8);
		expect(a._staticTriggerThreshold).toBe(5);
		expect(a._staticRenewThreshold).toBe(4);
		expect(a._staticTimeout).toBe(60);
		expect(a._staticOnDelay).toBe(2);
		expect(a._entitiesConfig).toEqual({ room_occupancy: true });
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
		a._zoneConfigs = [
			{
				type: "normal",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];

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
		// Slot 0 is zone 0; slots 1..7 are named zones 1..7.
		a._zoneConfigs = [
			{ type: "normal" },
			{ name: "Z1", color: "#ff0000", type: "normal" },
			{ name: "Z2", color: "#00ff00", type: "normal" },
			null,
			null,
			null,
			null,
			null,
		];
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
		expect(a._zoneConfigs[1]).not.toBeNull();
		expect(a._zoneConfigs[2]).toBeNull();
	});

	it("saves settings after layout", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._targetAutoDistance = true;
		a._targetMaxDistance = 6;
		a._staticAutoDistance = true;
		a._staticMinDistance = 0.3;
		a._staticMaxDistance = 16;
		a._temperatureOffset = 0;
		a._humidityOffset = 0;
		a._illuminanceOffset = 0;
		a._motionTimeout = 5;
		a._staticTimeout = 30;
		a._staticTriggerThreshold = 3;
		a._staticRenewThreshold = 3;
		a._staticOnDelay = 0;
		a._entitiesConfig = {};

		const callWS = vi.fn().mockResolvedValue({});
		el.hass = { callWS };

		await a._applyLayout();

		const types = callWS.mock.calls.map((c: any) => c[0].type);
		expect(types).toContain("eppgrid/set_room_layout");
		expect(types).toContain("eppgrid/set_settings");
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

	it("sends auto-computed distances in set_settings when auto is on", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._grid = initGridFromRoom(3000, 4000);
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._targetAutoDistance = true;
		a._targetMaxDistance = 99; // stale — should be replaced
		a._staticAutoDistance = true;
		a._staticMinDistance = 5.0; // stale — should be replaced with 0.3
		a._staticMaxDistance = 99; // stale — should be replaced
		a._zoneConfigs = new Array(8).fill(null);

		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		// Second callWS is the set_settings call
		const settingsCall = el.hass.callWS.mock.calls[1][0];
		expect(settingsCall.type).toBe("eppgrid/set_settings");
		expect(settingsCall.target_max_distance).not.toBe(99);
		expect(settingsCall.target_max_distance).toBeLessThanOrEqual(6);
		expect(settingsCall.static_min_distance).toBe(0.3);
		expect(settingsCall.static_max_distance).not.toBe(99);
		expect(settingsCall.static_max_distance).toBeLessThanOrEqual(16);
	});

	it("includes LED and relay fields in set_settings from zone save", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._grid = initGridFromRoom(3000, 4000);
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._targetAutoDistance = true;
		a._staticAutoDistance = true;
		a._zoneConfigs = new Array(8).fill(null);
		a._ledMode = "Presence";
		a._ledBrightness = 0.5;
		a._ledPresenceColor = "#00FF00";
		a._relayTriggerMode = "motion";
		a._relayContactMode = "nc";

		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		const settingsCall = el.hass.callWS.mock.calls[1][0];
		expect(settingsCall.type).toBe("eppgrid/set_settings");
		expect(settingsCall.led_mode).toBe("Presence");
		expect(settingsCall.led_brightness).toBe(0.5);
		expect(settingsCall.led_presence_color).toBe("#00FF00");
		expect(settingsCall.relay_trigger_mode).toBe("motion");
		expect(settingsCall.relay_contact_mode).toBe("nc");
	});

	it("does not call set_settings when both auto flags are off", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._grid = initGridFromRoom(3000, 4000);
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;
		a._targetMaxDistance = 4.0;
		a._staticMinDistance = 1.0;
		a._staticMaxDistance = 8.0;
		a._zoneConfigs = new Array(8).fill(null);

		el.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		await a._applyLayout();

		const calls = el.hass.callWS.mock.calls.map((c: any) => c[0].type);
		expect(calls).toContain("eppgrid/set_room_layout");
		expect(calls).not.toContain("eppgrid/set_settings");
	});
});

describe("_saveSettings", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("calls set_settings WS command with payload", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;

		const callWS = vi.fn().mockResolvedValue({});
		el.hass = { callWS };

		const payload = {
			target_auto_distance: true,
			target_max_distance: 6.0,
			static_auto_distance: true,
			static_min_distance: 0.3,
			static_max_distance: 16.0,
			motion_timeout: 5,
			static_timeout: 30,
			static_trigger_threshold: 3,
			static_renew_threshold: 3,
			static_on_delay: 0,
			temperature_offset: 0,
			humidity_offset: 0,
			illuminance_offset: 0,
			entities: { room_occupancy: true },
		};

		await a._saveSettings(payload);

		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/set_settings",
			mac: "AA:BB:CC:DD:EE:01",
			...payload,
		});
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
		expect(a._saving).toBe(false);
	});

	it("syncs all settings back to panel state after save", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		// Set initial panel state to different values
		a._motionTimeout = 5;
		a._staticTimeout = 30;
		a._staticTriggerThreshold = 3;
		a._staticRenewThreshold = 3;
		a._staticOnDelay = 0;
		a._targetAutoDistance = true;
		a._targetMaxDistance = 6.0;
		a._staticAutoDistance = true;
		a._staticMinDistance = 0.3;
		a._staticMaxDistance = 16.0;

		el.hass = { callWS: vi.fn().mockResolvedValue({}) };

		const payload = {
			motion_timeout: 10,
			static_timeout: 60,
			static_trigger_threshold: 5,
			static_renew_threshold: 7,
			static_on_delay: 2,
			target_auto_distance: false,
			target_max_distance: 4.0,
			static_auto_distance: false,
			static_min_distance: 1.0,
			static_max_distance: 8.0,
			temperature_offset: 1.5,
			humidity_offset: -3,
			illuminance_offset: 50,
			entities: { room_occupancy: true },
		};

		await a._saveSettings(payload);

		expect(a._motionTimeout).toBe(10);
		expect(a._staticTimeout).toBe(60);
		expect(a._staticTriggerThreshold).toBe(5);
		expect(a._staticRenewThreshold).toBe(7);
		expect(a._staticOnDelay).toBe(2);
		expect(a._targetAutoDistance).toBe(false);
		expect(a._targetMaxDistance).toBe(4.0);
		expect(a._staticAutoDistance).toBe(false);
		expect(a._staticMinDistance).toBe(1.0);
		expect(a._staticMaxDistance).toBe(8.0);
	});

	it("stays on settings page on WS error", async () => {
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._dirty = true;
		a._view = "settings";

		el.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("validation")),
		};

		await a._saveSettings({});

		expect(a._saving).toBe(false);
		expect(a._view).toBe("settings");
		expect(a._dirty).toBe(true);
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
		// Slot 0 is always populated with the default Zone0Config; slots 1-7
		// are reset to null.
		expect(a._zoneConfigs[0]).toMatchObject({ type: "normal" });
		expect(a._zoneConfigs.slice(1).every((z: any) => z === null)).toBe(true);
		expect(a._furniture).toEqual([]);
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");

		// set_distance_override (widen) + set_setup — set_setup handler
		// already clears room_layout, so no follow-up set_room_layout call.
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

	it("does not call set_room_layout — set_setup already clears it", async () => {
		// set_setup handler already pops room_layout, saves the store, pushes
		// config, and updates zone entities. Calling set_room_layout after it
		// is redundant and would now fail the calibration guard (room_width=0).
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a._roomWidth = 3000;
		a._roomDepth = 4000;

		const callWS = vi.fn().mockResolvedValue({});
		el.hass = { callWS };

		await a._deleteCalibration();

		const types = callWS.mock.calls.map((c: any) => c[0].type);
		expect(types).not.toContain("eppgrid/set_room_layout");
	});
});

describe("settings cancel", () => {
	it("reloads config on cancel", async () => {
		const el = createPanel();
		const a = el as any;
		a._selectedMac = "AA:BB:CC:DD:EE:01";
		a._view = "settings";
		a._dirty = true;

		const callWS = vi.fn().mockResolvedValue({
			config: {
				calibration: { perspective: null, room_width: 0, room_depth: 0 },
				room_layout: {},
				settings: {},
			},
		});
		el.hass = {
			callWS,
			connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
		};

		await a._cancelSettings();

		const types = callWS.mock.calls.map((c: any) => c[0].type);
		expect(types).toContain("eppgrid/get_config");
		expect(a._dirty).toBe(false);
		expect(a._view).toBe("live");
	});
});

describe("_renderConnectionBanner", () => {
	it("renders connection banner when connectionFailed is true", () => {
		const el = createPanel();
		const a = el as any;
		a._deviceCtrl._connectionFailed = true;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "T",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
				current_connection_count: 3,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a._renderConnectionBanner();
		expect(result).not.toBe(undefined);
		const str = (result as any).strings.join("");
		expect(str).toContain("protocol-fullpage");
	});

	it("returns nothing when connectionFailed is false", () => {
		const el = createPanel();
		const a = el as any;
		a._deviceCtrl._connectionFailed = false;

		const result = a._renderConnectionBanner();
		expect(result).toBe(nothing);
	});

	it("renders offline banner when device firmware_status is unavailable", () => {
		const el = createPanel();
		const a = el as any;
		a._deviceCtrl._connectionFailed = true;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "T",
				host: null,
				available: false,
				configured: true,
				firmware_status: "unavailable",
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a._renderConnectionBanner();
		const str = (result as any).strings.join("");
		// Should use info style, not warning
		expect(str).toContain("protocol-fullpage-info");
		expect(str).not.toContain("protocol-fullpage-warning");
		// Values should contain the offline localization key
		const vals = JSON.stringify((result as any).values);
		expect(vals).toContain("connection.offline");
	});
});

describe("_zoneConfigs shape", () => {
	it("exposes zone 0 settings via _zoneConfigs[0]", () => {
		const panel = createPanel();
		const a = panel as any;
		expect(a._zoneConfigs).toHaveLength(NUM_ZONE_SLOTS);
		expect(a._zoneConfigs[0]).toMatchObject({ type: "normal" });
		// Old fields are gone:
		expect(a._roomType).toBeUndefined();
		expect(a._roomTrigger).toBeUndefined();
		expect(a._roomRenew).toBeUndefined();
		expect(a._roomTimeout).toBeUndefined();
		expect(a._roomHandoffTimeout).toBeUndefined();
	});
});
