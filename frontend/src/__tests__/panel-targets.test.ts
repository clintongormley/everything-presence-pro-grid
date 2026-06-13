import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { mapTargetToGridCell, mapTargetToPercent } from "../lib/coordinates.js";
import { GRID_CELL_COUNT, getRawRoomBounds } from "../lib/grid.js";
import { applyPerspective, getInversePerspective } from "../lib/perspective.js";
import { getSensorRoomPosition } from "../lib/room-geometry.js";

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
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
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

/** Set up callbacks as _loadDeviceConfig does, then subscribe to targets */
function subscribeTargets(el: EPPGridPanel, mac: string): void {
	const a = el as any;
	a._deviceCtrl.hass = el.hass;
	a._deviceCtrl.onTargetData = (data: any) =>
		a._targetCtrl.handleTargetData(data);
	a._deviceCtrl.onRawTargetData = (rawTargets: any) =>
		a._targetCtrl.handleRawTargetData(rawTargets);
	a._deviceCtrl.subscribeTargets(mac);
}

/** Set up raw target callback, then subscribe to display */
function subscribeDisplay(el: EPPGridPanel, mac: string): void {
	const a = el as any;
	a._deviceCtrl.hass = el.hass;
	a._deviceCtrl.onRawTargetData = (rawTargets: any) =>
		a._targetCtrl.handleRawTargetData(rawTargets);
	a._deviceCtrl.subscribeDisplay(mac);
}

describe("_loadDeviceConfig sets up callbacks before subscribing", () => {
	it("sets onTargetData and onRawTargetData before subscribeTargets runs", async () => {
		const el = createPanel();
		const a = el as any;

		let callbacksSetBeforeSubscribe = false;
		const origSubscribe = a._deviceCtrl.subscribeTargets.bind(a._deviceCtrl);
		a._deviceCtrl.subscribeTargets = vi
			.fn()
			.mockImplementation((mac: string) => {
				callbacksSetBeforeSubscribe =
					typeof a._deviceCtrl.onTargetData === "function" &&
					typeof a._deviceCtrl.onRawTargetData === "function";
				return origSubscribe(mac);
			});

		el.hass = {
			callWS: vi.fn().mockResolvedValue({ config: null }),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
		};

		await a._loadDeviceConfig("AA:BB");

		expect(a._deviceCtrl.subscribeTargets).toHaveBeenCalled();
		expect(callbacksSetBeforeSubscribe).toBe(true);
	});

	it("target and raw data flows from WS events to panel state", async () => {
		const el = createPanel();
		const a = el as any;

		let gridHandler: (event: any) => void;
		let rawHandler: (event: any) => void;
		el.hass = {
			callWS: vi.fn().mockResolvedValue({ config: null }),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
					if (msg.type === "eppgrid/subscribe_grid_targets") gridHandler = cb;
					if (msg.type === "eppgrid/subscribe_raw_targets") rawHandler = cb;
					return Promise.resolve(vi.fn());
				}),
			},
		};

		await a._loadDeviceConfig("AA:BB");

		// Fire grid targets event
		gridHandler!({
			targets: [{ x: 100, y: 200, status: "active", signal: 5 }],
			sensors: { occupancy: true },
		});
		expect(a._targets).toHaveLength(1);
		expect(a._targets[0].x).toBe(100);
		expect(a._sensorState.occupancy).toBe(true);

		// Fire raw targets event
		rawHandler!({
			targets: [{ raw_x: 50, raw_y: 100 }],
		});
		expect(a._rawTargets).toHaveLength(1);
		expect(a._rawTargets[0].raw_x).toBe(50);
	});
});

describe("target data flow via DeviceController", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("processes target events correctly", async () => {
		const a = el as any;
		let handler: (event: any) => void;
		let callCount = 0;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) handler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(el, "e1");

		// Trigger event
		handler!({
			targets: [
				{ x: 100, y: 200, status: "active", signal: 5 },
				{ x: 300, y: 400, status: "inactive", signal: 0 },
			],
			sensors: {
				occupancy: true,
				static_presence: true,
				motion_presence: false,
				target_presence: false,
				illuminance: 150,
				temperature: 22.5,
				humidity: 45,
				co2: 400,
			},
			zones: {
				occupancy: { 1: true },
				target_counts: { 1: 1 },
				frame_count: 10,
			},
		});

		expect(a._targets).toHaveLength(2);
		expect(a._targets[0].status).toBe("active");
		// raw_x/raw_y no longer live on Target — they come from _rawTargets
		expect(a._targets[0]).not.toHaveProperty("raw_x");
		expect(a._targets[1].status).toBe("inactive");

		expect(a._sensorState.occupancy).toBe(true);
		expect(a._sensorState.illuminance).toBe(150);
		expect(a._sensorState.temperature).toBe(22.5);

		expect(a._zoneState.occupancy).toEqual({ 1: true });
		expect(a._zoneState.target_counts).toEqual({ 1: 1 });
		expect(a._zoneState.frame_count).toBe(10);
	});

	it("handles pending targets via status field", async () => {
		const a = el as any;
		let handler: (event: any) => void;
		let callCount = 0;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) handler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(el, "e1");

		handler!({
			targets: [{ x: 150, y: 250, status: "pending", signal: 0 }],
		});

		expect(a._targets[0].status).toBe("pending");
		expect(a._targets[0].x).toBe(150);
	});

	it("active targets retain active status", async () => {
		const a = el as any;
		let handler: (event: any) => void;
		let callCount = 0;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) handler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(el, "e1");

		handler!({
			targets: [{ x: 100, y: 200, status: "active", signal: 5 }],
		});

		expect(a._targets[0].status).toBe("active");
		expect(a._targets[0].x).toBe(100);
	});

	it("handles event without sensors or zones", async () => {
		const a = el as any;
		let handler: (event: any) => void;
		let callCount = 0;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					if (callCount++ === 0) handler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		subscribeTargets(el, "e1");

		handler!({
			targets: [{ x: 100, y: 200, status: "active", signal: 3 }],
		});

		// Sensor state should remain unchanged
		expect(a._sensorState.occupancy).toBe(false);
		expect(a._zoneState.frame_count).toBe(0);
	});
});

describe("onSessionClosed (env sensor preservation)", () => {
	it("preserves env sensor values across session close", async () => {
		// Why: env-offset slider displays compute `raw + offset` from
		// _sensorState.{illuminance,temperature,humidity,co2}. If those go
		// to null during a transient device-offline window, Lit's render
		// produces "—" and clobbers the user's drag-set DOM value. After
		// reconnect, render produces `reading` and the display ends up
		// showing the raw live reading instead of the user's edit.
		// Preserve env values so the render output (and thus Lit's cache)
		// stays the same across the offline cycle.
		const el = createPanel();
		const a = el as any;
		await a._subscribeDevices();
		a._sensorState = {
			occupancy: true,
			static_presence: true,
			motion_presence: true,
			target_presence: true,
			mmwave: true,
			illuminance: 100,
			temperature: 22,
			humidity: 50,
			co2: 400,
		};
		a._targets = [{ x: 1, y: 2, status: "active", signal: 5 }];

		a._deviceCtrl.onSessionClosed();

		// High-frequency state (targets, occupancy/presence flags) is cleared
		// because stale flags are visibly misleading on the live grid.
		expect(a._targets).toEqual([]);
		expect(a._sensorState.occupancy).toBe(false);
		expect(a._sensorState.static_presence).toBe(false);
		// Env values stay so the offset slider's render output is stable.
		expect(a._sensorState.illuminance).toBe(100);
		expect(a._sensorState.temperature).toBe(22);
		expect(a._sensorState.humidity).toBe(50);
		expect(a._sensorState.co2).toBe(400);
	});

	it("clears _dismissedTargets so the hide-map can't carry across a session switch", async () => {
		// The dismissed-targets map is keyed by cell index; left intact across a
		// device/session switch it could briefly hide a target sitting on a
		// previously-dismissed cell on the new device.
		const el = createPanel();
		const a = el as any;
		await a._subscribeDevices();
		a._dismissedTargets = new Map([[0, 42]]);

		a._deviceCtrl.onSessionClosed();

		expect(a._dismissedTargets.size).toBe(0);
	});
});

describe("_closeDeviceSession", () => {
	it("clears targets and rawTargets", () => {
		const el = createPanel();
		const a = el as any;
		a._targets = [
			{
				x: 1,
				y: 2,
				status: "active",
				signal: 5,
			},
		];
		a._rawTargets = [{ raw_x: 10, raw_y: 20 }];

		a._closeDeviceSession();

		expect(a._targets).toEqual([]);
		expect(a._rawTargets).toEqual([]);
	});

	it("delegates to deviceCtrl.closeDeviceSession", () => {
		const el = createPanel();
		const a = el as any;
		const spy = vi
			.spyOn(a._deviceCtrl, "closeDeviceSession")
			.mockImplementation(() => {});

		a._closeDeviceSession();

		expect(spy).toHaveBeenCalled();
	});
});

describe("mapTargetToPercent (lib/coordinates)", () => {
	it("maps target position to percentage", () => {
		const result = mapTargetToPercent(2000, 2000, 4000, 4000);
		expect(result.x).toBeCloseTo(50, 0);
		expect(result.y).toBeCloseTo(50, 0);
	});
});

describe("mapTargetToGridCell (lib/coordinates)", () => {
	it("maps target position to grid cell", () => {
		const result = mapTargetToGridCell(3000, 3000, 6000, 6000);
		expect(result).not.toBeNull();
		expect(result!.col).toBeGreaterThan(0);
		expect(result!.row).toBeGreaterThan(0);
	});
});

describe("getInversePerspective (lib/perspective)", () => {
	it("returns null when perspective is null", () => {
		expect(getInversePerspective(null)).toBeNull();
	});

	it("returns inverse when perspective is set", () => {
		const result = getInversePerspective([1, 0, 0, 0, 1, 0, 0, 0]);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(8);
	});
});

describe("applyPerspective (lib/perspective)", () => {
	it("applies perspective transform to a point", () => {
		const h = [1, 0, 0, 0, 1, 0, 0, 0];

		const result = applyPerspective(h, 100, 200);
		expect(result.x).toBeCloseTo(100);
		expect(result.y).toBeCloseTo(200);
	});
});

describe("_getSensorFov", () => {
	it("returns null when perspective is null", () => {
		const el = createPanel();
		const a = el as any;
		a._perspective = null;

		expect(a._getSensorFov()).toBeNull();
	});

	it("returns FOV and caches it", () => {
		const el = createPanel();
		const a = el as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];

		const fov1 = a._getSensorFov();
		expect(fov1).not.toBeNull();

		// Should return cached result
		const fov2 = a._getSensorFov();
		expect(fov2).toBe(fov1);
	});

	it("recomputes on perspective change", () => {
		const el = createPanel();
		const a = el as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];

		const fov1 = a._getSensorFov();
		a._perspective = [2, 0, 0, 0, 2, 0, 0, 0];
		const fov2 = a._getSensorFov();

		expect(fov2).not.toBe(fov1);
	});
});

describe("_computeMaxRangeMm", () => {
	it("returns manual distance in mm when auto-range is off", () => {
		const el = createPanel();
		const a = el as any;
		a._targetAutoDistance = false;
		a._targetMaxDistance = 6;

		const result = a._computeMaxRangeMm();
		expect(result).toBe(6000);
	});

	it("_renderLiveGrid uses cached max-range, not full-grid scan per render", () => {
		const el = createPanel();
		const a = el as any;
		a._targetAutoDistance = true;
		a._targetMaxDistance = 6;

		const spy = vi.spyOn(a, "_autoDetectionRange");

		a._renderLiveGrid();
		a._renderLiveGrid();
		a._renderLiveGrid();

		expect(spy).toHaveBeenCalledTimes(1);
	});
});

describe("raw target display subscription", () => {
	it("writes raw positions directly to _rawTargets", async () => {
		const el = createPanel();
		const a = el as any;
		let displayHandler: (event: any) => void;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					displayHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		// Set up existing grid targets (no raw_x/raw_y)
		a._targets = [
			{
				x: 100,
				y: 200,
				status: "active",
				signal: 3,
			},
			{
				x: 300,
				y: 400,
				status: "inactive",
				signal: 0,
			},
		];

		subscribeDisplay(el, "e1");

		// Fire a raw targets event
		displayHandler!({
			targets: [
				{ raw_x: 111, raw_y: 211 },
				{ raw_x: 311, raw_y: 411 },
			],
		});

		// _rawTargets is written directly
		expect(a._rawTargets).toHaveLength(2);
		expect(a._rawTargets[0].raw_x).toBe(111);
		expect(a._rawTargets[0].raw_y).toBe(211);
		expect(a._rawTargets[1].raw_x).toBe(311);
		expect(a._rawTargets[1].raw_y).toBe(411);

		// _targets remain unchanged (grid-space only)
		expect(a._targets[0].x).toBe(100);
		expect(a._targets[0].y).toBe(200);
		expect(a._targets[0].signal).toBe(3);
		expect(a._targets[0].status).toBe("active");
		expect(a._targets[0]).not.toHaveProperty("raw_x");
	});

	it("writes only provided raw targets to _rawTargets", async () => {
		const el = createPanel();
		const a = el as any;
		let displayHandler: (event: any) => void;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					displayHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		// Two grid targets
		a._targets = [
			{
				x: 100,
				y: 200,
				status: "active",
				signal: 3,
			},
			{
				x: 300,
				y: 400,
				status: "inactive",
				signal: 0,
			},
		];

		subscribeDisplay(el, "e1");

		// Raw targets event provides only one target
		displayHandler!({
			targets: [{ raw_x: 111, raw_y: 211 }],
		});

		// _rawTargets reflects exactly what the event provided
		expect(a._rawTargets).toHaveLength(1);
		expect(a._rawTargets[0].raw_x).toBe(111);
		expect(a._rawTargets[0].raw_y).toBe(211);

		// _targets remain unchanged
		expect(a._targets[0].x).toBe(100);
		expect(a._targets[1].x).toBe(300);
	});

	it("handles raw targets event with empty targets array", async () => {
		const el = createPanel();
		const a = el as any;
		let displayHandler: (event: any) => void;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					displayHandler = cb;
					return Promise.resolve(() => {});
				}),
			},
		};

		a._targets = [
			{
				x: 100,
				y: 200,
				status: "active",
				signal: 3,
			},
		];

		subscribeDisplay(el, "e1");

		// Fire event with no targets field (falls back to [])
		displayHandler!({});

		// _rawTargets is empty, _targets unchanged
		expect(a._rawTargets).toEqual([]);
		expect(a._targets[0].x).toBe(100);
	});
});

describe("getSensorRoomPosition (lib/room-geometry)", () => {
	it("returns null when perspective is null", () => {
		expect(getSensorRoomPosition(null)).toBeNull();
	});

	it("returns position when perspective is set", () => {
		const result = getSensorRoomPosition([1, 0, 0, 0, 1, 0, 0, 0]);
		expect(result).not.toBeNull();
		expect(typeof result!.x).toBe("number");
		expect(typeof result!.y).toBe("number");
	});
});

describe("_autoDetectionRange", () => {
	it("returns a number", () => {
		const el = createPanel();
		const a = el as any;
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];

		const result = a._autoDetectionRange();
		expect(typeof result).toBe("number");
	});
});

describe("getRawRoomBounds (lib/grid)", () => {
	it("returns bounds object", () => {
		const result = getRawRoomBounds(new Uint8Array(GRID_CELL_COUNT));
		expect(result).toHaveProperty("minCol");
		expect(result).toHaveProperty("maxCol");
		expect(result).toHaveProperty("minRow");
		expect(result).toHaveProperty("maxRow");
	});
});

describe("raw targets event writing", () => {
	it("writes raw positions to _rawTargets independently of _targets", () => {
		const el = createPanel();
		const a = el as any;

		// Set up existing targets (as if from subscribe_grid_targets)
		a._targets = [
			{
				x: 10,
				y: 20,
				status: "active",
				signal: 5,
			},
			{
				x: 30,
				y: 40,
				status: "pending",
				signal: 3,
			},
			{
				x: 0,
				y: 0,
				status: "inactive",
				signal: 0,
			},
		];

		// Simulate raw targets event callback
		let callback: (event: any) => void;
		el.hass = {
			callWS: vi.fn(),
			connection: {
				subscribeMessage: vi.fn().mockImplementation((cb: any) => {
					callback = cb;
					return Promise.resolve(vi.fn());
				}),
			},
		};
		subscribeDisplay(el, "e1");

		// Fire raw targets event
		callback!({
			targets: [
				{ raw_x: 50, raw_y: 100 },
				{ raw_x: 150, raw_y: 200 },
				{ raw_x: 0, raw_y: 0 },
			],
		});

		// _rawTargets written directly
		expect(a._rawTargets).toHaveLength(3);
		expect(a._rawTargets[0].raw_x).toBe(50);
		expect(a._rawTargets[0].raw_y).toBe(100);
		expect(a._rawTargets[1].raw_x).toBe(150);
		expect(a._rawTargets[1].raw_y).toBe(200);
		expect(a._rawTargets[2].raw_x).toBe(0);
		expect(a._rawTargets[2].raw_y).toBe(0);

		// _targets unchanged — grid fields preserved
		expect(a._targets[0].x).toBe(10);
		expect(a._targets[0].y).toBe(20);
		expect(a._targets[0].signal).toBe(5);
		expect(a._targets[0].status).toBe("active");
		expect(a._targets[1].status).toBe("pending");
		expect(a._targets[0]).not.toHaveProperty("raw_x");
	});
});
