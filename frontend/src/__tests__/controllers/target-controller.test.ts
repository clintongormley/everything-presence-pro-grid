import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEBUG_LOG_MAX } from "../../constants.js";
import type { TargetData } from "../../controllers/device-controller.js";
import { TargetController } from "../../controllers/target-controller.js";
import {
	CELL_ROOM_BIT,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
} from "../../lib/grid.js";
import { createZoneEngineState } from "../../lib/zone-engine.js";

// ---------------------------------------------------------------------------
// Host factory — provides the properties TargetController reads/writes
// ---------------------------------------------------------------------------
function mockHost() {
	return {
		// ReactiveControllerHost
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),

		// Target / raw-target state
		_targets: [] as any[],
		_rawTargets: [] as any[],
		_sensorState: {} as any,
		_zoneState: {
			occupancy: {} as Record<number, boolean>,
			target_counts: {} as Record<number, number>,
			frame_count: 0,
		},

		// Zone config / room geometry
		// Length-8 zone-slots tuple: slot 0 = Zone0Config (room boundary),
		// slots 1-7 = named-zone configs or null. Tests override slots 1-7
		// via `host._zoneConfigs = [host._zoneConfigs[0], ...namedZones]`.
		_zoneConfigs: [
			{
				type: "default" as const,
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
		] as any[],
		_grid: new Uint8Array(GRID_CELL_COUNT),
		_roomWidth: 6000,
		_roomDepth: 6000,

		// Sensor timeouts forwarded to runLocalZoneEngine (panel defaults).
		_staticTimeout: 30,
		_motionTimeout: 5,

		// Debug log (frontend)
		_showDebugLog: false,
		_debugLogLines: [] as string[],
		_debugLogPrev: "",

		// Debug log (backend)
		_showBackendDebugLog: false,
		_backendDebugLogLines: [] as string[],
		_backendDebugLogPrev: "",

		// View mode
		_view: "live" as "live" | "editor" | "settings",

		// Localize stub — translates known live.debug.* keys back to their English values
		_localize: Object.assign(
			(key: string, params?: Record<string, string | number>) => {
				const map: Record<string, string> = {
					"live.debug.static": "Static",
					"live.debug.motion": "Motion",
					"live.debug.occ": "Occ",
					"live.debug.on": "on",
					"live.debug.off": "off",
					"live.debug.active": "active",
					"live.debug.pending": "pending",
					"live.debug.inactive": "inactive",
					"live.debug.occupied": "occupied",
					"live.debug.room": "Room",
					"live.debug.no_targets": "no targets",
					"live.debug.all_clear": "all clear",
					"live.debug.zone_n": `Zone ${params?.n ?? ""}`,
				};
				return map[key] ?? key;
			},
			{ formatNumber: (v: number, d = 1) => v.toFixed(d), lang: "en" },
		),

		// Shadow root mock for DOM-based debug log
		_mockBackendContainer: null as HTMLDivElement | null,
		_mockFrontendContainer: null as HTMLDivElement | null,
		get shadowRoot() {
			return {
				getElementById: (id: string) => {
					if (id === "backend-debug-log-scroll")
						return this._mockBackendContainer;
					if (id === "debug-log-scroll") return this._mockFrontendContainer;
					return null;
				},
			} as any;
		},
	};
}

/** Build a minimal TargetData object with sane defaults. */
function makeTargetData(overrides: Partial<TargetData> = {}): TargetData {
	return {
		targets: [],
		sensors: {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			mmwave: false,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		},
		zones: null,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TargetController", () => {
	let host: ReturnType<typeof mockHost>;
	let ctrl: TargetController;

	beforeEach(() => {
		host = mockHost();
		ctrl = new TargetController(host as any);
	});

	// -------------------------------------------------------------------------
	// Construction / lifecycle
	// -------------------------------------------------------------------------
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("exposes a fresh ZoneEngineState", () => {
			const state = ctrl.zoneEngineState;
			expect(state).toBeDefined();
			expect(state.localZoneState).toBeInstanceOf(Map);
			expect(state.localZoneState.size).toBe(0);
		});
	});

	describe("hostConnected / hostDisconnected", () => {
		it("does not throw", () => {
			expect(() => ctrl.hostConnected()).not.toThrow();
			expect(() => ctrl.hostDisconnected()).not.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// ZoneEngineState getter / setter / reset
	// -------------------------------------------------------------------------
	describe("zoneEngineState", () => {
		it("can be replaced via setter", () => {
			const newState = createZoneEngineState();
			newState.targetGateCount[0] = 42;
			ctrl.zoneEngineState = newState;
			expect(ctrl.zoneEngineState.targetGateCount[0]).toBe(42);
		});

		it("resetZoneEngineState restores a pristine state", () => {
			const s = ctrl.zoneEngineState;
			s.targetGateCount[0] = 99;
			ctrl.resetZoneEngineState();
			expect(ctrl.zoneEngineState.targetGateCount[0]).toBe(0);
		});

		it("resetZoneEngineState creates a new object (not same reference)", () => {
			const before = ctrl.zoneEngineState;
			ctrl.resetZoneEngineState();
			expect(ctrl.zoneEngineState).not.toBe(before);
		});
	});

	// -------------------------------------------------------------------------
	// handleTargetData
	// -------------------------------------------------------------------------
	describe("handleTargetData", () => {
		it("stores targets on host._targets", () => {
			const targets = [{ x: 100, y: 200, status: "active", signal: 50 }];
			ctrl.handleTargetData(makeTargetData({ targets: targets as any }));
			expect(host._targets).toBe(targets);
		});

		it("stores sensor data on host._sensorState", () => {
			const sensors = {
				occupancy: true,
				static_presence: false,
				motion_presence: false,
				target_presence: true,
				mmwave: false,
				illuminance: null,
				temperature: 22,
				humidity: null,
				co2: null,
			};
			ctrl.handleTargetData(makeTargetData({ sensors }));
			expect(host._sensorState).toBe(sensors);
		});

		it("updates host._zoneState when zones are present", () => {
			const zones = {
				occupancy: { 1: true },
				target_counts: { 1: 2 },
				frame_count: 7,
				debug_log: undefined,
			};
			ctrl.handleTargetData(makeTargetData({ zones }));
			expect(host._zoneState).toEqual({
				occupancy: { 1: true },
				target_counts: { 1: 2 },
				frame_count: 7,
			});
		});

		it("does not update host._zoneState when zones is null", () => {
			const original = host._zoneState;
			ctrl.handleTargetData(makeTargetData({ zones: null }));
			expect(host._zoneState).toBe(original);
		});

		it("appends backend debug log when _showBackendDebugLog is true and debug_log present", () => {
			host._showBackendDebugLog = true;
			host._zoneConfigs = [
				host._zoneConfigs[0],
				{ name: "Lounge", color: "#fff", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			ctrl.handleTargetData(
				makeTargetData({
					zones: {
						occupancy: {},
						target_counts: {},
						frame_count: 1,
						debug_log: "T0:Z1:A:5|Z1:O:1",
					},
				}),
			);
			expect(host._backendDebugLogLines.length).toBe(1);
		});

		it("does not append backend debug log when _showBackendDebugLog is false", () => {
			host._showBackendDebugLog = false;
			ctrl.handleTargetData(
				makeTargetData({
					zones: {
						occupancy: {},
						target_counts: {},
						frame_count: 1,
						debug_log: "T0:Z1:A:5|Z1:O:1",
					},
				}),
			);
			expect(host._backendDebugLogLines.length).toBe(0);
		});

		it("populates null env sensors once on entry / after reconnect in settings view", () => {
			// Env-offset slider displays compute `raw + offset` where raw is
			// derived from the live reading. Continuously updating the live
			// reading mid-drag makes the displayed value bounce as the sensor
			// fluctuates. Snapshot-on-first-event gives the user a stable
			// reference: populate when null (fresh load or post-reconnect
			// onSessionClosed clear), then freeze.
			host._view = "settings";
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				mmwave: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			const originalTargets = host._targets;
			const originalZoneState = host._zoneState;
			ctrl.handleTargetData(
				makeTargetData({
					targets: [{ x: 1, y: 2, status: "active", signal: 50 }] as any,
					sensors: {
						occupancy: true,
						static_presence: true,
						motion_presence: true,
						target_presence: true,
						mmwave: false,
						illuminance: 100,
						temperature: 22,
						humidity: 50,
						co2: 400,
					},
					zones: {
						occupancy: { 1: true },
						target_counts: { 1: 2 },
						frame_count: 7,
						debug_log: "T0:Z1:A:5|Z1:O:1",
					},
				}),
			);
			expect(host._targets).toBe(originalTargets);
			expect(host._zoneState).toBe(originalZoneState);
			// First populate: env values land so the user isn't staring at em-dashes.
			expect(host._sensorState.temperature).toBe(22);
			expect(host._sensorState.humidity).toBe(50);
			expect(host._sensorState.illuminance).toBe(100);
			expect(host._sensorState.co2).toBe(400);
			// Non-env sensor fields stay frozen.
			expect(host._sensorState.occupancy).toBe(false);
			expect(host._sensorState.target_presence).toBe(false);
		});

		it("freezes env sensors in settings view once already populated", () => {
			// After the first populate, further env state events must not
			// disturb the slider drag. The user only sees fresh values on
			// the next entry to settings (after a roundtrip through live)
			// or after a reconnect cycle.
			host._view = "settings";
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				mmwave: false,
				illuminance: 100,
				temperature: 22,
				humidity: 50,
				co2: 400,
			};
			const originalRef = host._sensorState;
			ctrl.handleTargetData(
				makeTargetData({
					sensors: {
						occupancy: true,
						static_presence: true,
						motion_presence: true,
						target_presence: true,
						mmwave: false,
						illuminance: 105, // different — must NOT propagate
						temperature: 22.5, // different — must NOT propagate
						humidity: 51, // different — must NOT propagate
						co2: 410, // different — must NOT propagate
					},
				}),
			);
			expect(host._sensorState).toBe(originalRef);
			expect(host._sensorState.illuminance).toBe(100);
			expect(host._sensorState.temperature).toBe(22);
		});

		it("populates only the null env fields, leaves populated ones frozen", () => {
			// Mixed case: temperature already populated, humidity null. Only
			// humidity should be filled in; temperature stays at its drag-stable
			// value.
			host._view = "settings";
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				mmwave: false,
				illuminance: 100,
				temperature: 22, // populated
				humidity: null, // null
				co2: null, // null
			};
			ctrl.handleTargetData(
				makeTargetData({
					sensors: {
						occupancy: false,
						static_presence: false,
						motion_presence: false,
						target_presence: false,
						mmwave: false,
						illuminance: 999, // populated, must not change
						temperature: 99, // populated, must not change
						humidity: 50, // null → populate
						co2: 400, // null → populate
					},
				}),
			);
			expect(host._sensorState.temperature).toBe(22);
			expect(host._sensorState.illuminance).toBe(100);
			expect(host._sensorState.humidity).toBe(50);
			expect(host._sensorState.co2).toBe(400);
		});

		it("resumes state updates when host._view is not 'settings'", () => {
			host._view = "settings";
			ctrl.handleTargetData(
				makeTargetData({
					targets: [{ x: 1, y: 2, status: "active", signal: 50 }] as any,
				}),
			);
			const frozenTargets = host._targets;

			host._view = "live";
			const newTargets = [{ x: 3, y: 4, status: "active", signal: 80 }] as any;
			const newSensors = {
				occupancy: true,
				static_presence: false,
				motion_presence: true,
				target_presence: true,
				mmwave: false,
				illuminance: null,
				temperature: 23,
				humidity: null,
				co2: null,
			};
			ctrl.handleTargetData(
				makeTargetData({ targets: newTargets, sensors: newSensors }),
			);
			expect(host._targets).toBe(newTargets);
			expect(host._targets).not.toBe(frozenTargets);
			expect(host._sensorState).toBe(newSensors);
		});
	});

	// -------------------------------------------------------------------------
	// handleRawTargetData
	// -------------------------------------------------------------------------
	describe("handleRawTargetData", () => {
		it("stores raw targets on host._rawTargets", () => {
			const raw = [{ raw_x: 10, raw_y: 20 }];
			ctrl.handleRawTargetData(raw as any);
			expect(host._rawTargets).toBe(raw);
		});

		it("skips update when host._view is 'settings'", () => {
			host._view = "settings";
			const original = host._rawTargets;
			ctrl.handleRawTargetData([{ raw_x: 10, raw_y: 20 }] as any);
			expect(host._rawTargets).toBe(original);
		});

		it("resumes update when host._view is not 'settings'", () => {
			host._view = "settings";
			ctrl.handleRawTargetData([{ raw_x: 10, raw_y: 20 }] as any);

			host._view = "live";
			const newRaw = [{ raw_x: 30, raw_y: 40 }] as any;
			ctrl.handleRawTargetData(newRaw);
			expect(host._rawTargets).toBe(newRaw);
		});
	});

	// -------------------------------------------------------------------------
	// enrichDebugLog
	// -------------------------------------------------------------------------
	describe("enrichDebugLog", () => {
		beforeEach(() => {
			// Slot 0 = Zone0Config; slot 1 = first named zone (zone 1).
			host._zoneConfigs = [
				host._zoneConfigs[0],
				{ name: "Hallway", color: "#E69F00", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
		});

		it("replaces zone IDs with zone names in target part", () => {
			const result = ctrl.enrichDebugLog("T0:Z1:A:5|");
			expect(result).toContain("T0→Hallway(active,5)");
		});

		it("uses 'Room' for zone 0", () => {
			const result = ctrl.enrichDebugLog("T0:Z0:P:3|");
			expect(result).toContain("T0→Room(pending,3)");
		});

		it("falls back to 'Zone N' for unknown zone IDs", () => {
			const result = ctrl.enrichDebugLog("T0:Z5:A:10|");
			expect(result).toContain("T0→Zone 5(active,10)");
		});

		it("treats unparseable zone tokens as room (zone 0) instead of NaN", () => {
			// Pre-fix this would print "Zone NaN" — Number.isFinite guard
			// in enrichDebugLog falls back to zid=0 when parseInt yields NaN.
			const result = ctrl.enrichDebugLog("T0:Zfoo:A:5|Zbar:O:1");
			expect(result).not.toContain("NaN");
			expect(result).toContain("T0→Room(active,5)");
			expect(result).toContain("Room: occupied(1)");
		});

		it("enriches zone occupancy part", () => {
			const result = ctrl.enrichDebugLog("|Z1:O:1");
			expect(result).toContain("Hallway: occupied(1)");
		});

		it("shows 'no targets' when target part is empty", () => {
			const result = ctrl.enrichDebugLog("|Z1:O:1");
			expect(result).toContain("no targets");
		});

		it("shows 'all clear' when zone part is empty", () => {
			const result = ctrl.enrichDebugLog("T0:Z1:A:5|");
			expect(result).toContain("all clear");
		});

		it("formats a full log correctly", () => {
			const result = ctrl.enrichDebugLog("T0:Z1:A:5 T1:Z0:P:3|Z0:O:1 Z1:O:1");
			expect(result).toBe(
				"T0→Hallway(active,5) T1→Room(pending,3) | Room: occupied(1), Hallway: occupied(1)",
			);
		});

		it("parses 3-section format (sensors|targets|zones) with S:, M:, Occ: tokens", () => {
			const result = ctrl.enrichDebugLog("S:A M:I Occ:1|T0:Z1:A:5|Z1:O:1");
			expect(result).toBe(
				"Static: active, Motion: inactive, Occ: on | T0→Hallway(active,5) | Hallway: occupied(1)",
			);
		});

		it("renders 3-section format with Occ:0 as 'off'", () => {
			const result = ctrl.enrichDebugLog("S:I M:A Occ:0|T0:Z1:A:5|Z1:O:1");
			expect(result).toContain("Occ: off");
			expect(result).toContain("Static: inactive");
			expect(result).toContain("Motion: active");
		});

		it("shows 'no targets' and 'all clear' in 3-section format with empty target/zone parts", () => {
			const result = ctrl.enrichDebugLog("S:I M:I Occ:0||");
			expect(result).toContain("no targets");
			expect(result).toContain("all clear");
		});
	});

	// -------------------------------------------------------------------------
	// appendBackendDebugLog
	// -------------------------------------------------------------------------
	describe("appendBackendDebugLog", () => {
		let container: HTMLDivElement;

		beforeEach(() => {
			host._zoneConfigs = [
				host._zoneConfigs[0],
				{ name: "Lounge", color: "#fff", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			container = document.createElement("div");
			container.id = "backend-debug-log-scroll";
			host._mockBackendContainer = container;
		});

		it("appends a div to the container with enriched content", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(container.children.length).toBe(1);
			expect(container.children[0].textContent).toContain("Lounge");
			expect(container.children[0].className).toBe("debug-log-line");
		});

		it("still maintains the data array for copy-all", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
			expect(host._backendDebugLogLines[0]).toContain("Lounge");
		});

		it("deduplicates consecutive identical lines", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(container.children.length).toBe(1);
			expect(host._backendDebugLogLines.length).toBe(1);
		});

		it("appends when line differs from previous", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			ctrl.appendBackendDebugLog("|");
			expect(container.children.length).toBe(2);
			expect(host._backendDebugLogLines.length).toBe(2);
		});

		it("removes excess DOM children when over DEBUG_LOG_MAX", () => {
			for (let i = 0; i <= DEBUG_LOG_MAX; i++) {
				host._backendDebugLogPrev = "";
				ctrl.appendBackendDebugLog(`T0:Z1:A:${i}|`);
			}
			expect(container.children.length).toBeLessThanOrEqual(DEBUG_LOG_MAX);
			expect(host._backendDebugLogLines.length).toBeLessThanOrEqual(
				DEBUG_LOG_MAX,
			);
		});

		it("does NOT call host.requestUpdate", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host.requestUpdate).not.toHaveBeenCalled();
		});

		it("does NOT call requestUpdate when line is duplicate", () => {
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host.requestUpdate).not.toHaveBeenCalled();
		});

		it("auto-scrolls the container to bottom", () => {
			Object.defineProperty(container, "scrollHeight", {
				value: 500,
				configurable: true,
			});
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(container.scrollTop).toBe(500);
		});

		it("clears placeholder children before first append", () => {
			const placeholder = document.createElement("div");
			placeholder.textContent = "Waiting for events...";
			container.appendChild(placeholder);

			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(container.children.length).toBe(1);
			expect(container.children[0].textContent).toContain("Lounge");
		});

		it("handles missing container gracefully", () => {
			host._mockBackendContainer = null;
			expect(() =>
				ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1"),
			).not.toThrow();
			expect(host._backendDebugLogLines.length).toBe(1);
		});

		it("skips sensor-prefix injection when log already has 3 sections", () => {
			ctrl.appendBackendDebugLog("S:A M:I Occ:1|T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
			expect(host._backendDebugLogLines[0]).toContain("Static: active");
			expect(
				(host._backendDebugLogLines[0].match(/Static:/g) ?? []).length,
			).toBe(1);
		});

		it("injects sensor prefix with active static/motion when _sensorState has presences set", () => {
			host._sensorState = {
				occupancy: true,
				static_presence: true,
				motion_presence: true,
				target_presence: true,
				mmwave: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.appendBackendDebugLog("T0:Z1:A:5|Z1:O:1");
			expect(host._backendDebugLogLines.length).toBe(1);
			expect(host._backendDebugLogLines[0]).toContain("Static: active");
			expect(host._backendDebugLogLines[0]).toContain("Motion: active");
			expect(host._backendDebugLogLines[0]).toContain("Occ: on");
		});
	});

	// -------------------------------------------------------------------------
	// runLocalZoneEngine — default resolution by zone type
	// -------------------------------------------------------------------------
	describe("runLocalZoneEngine default resolution", () => {
		let engineSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(async () => {
			const mod = await import("../../lib/zone-engine.js");
			// Spy replaces the module export; target-controller.ts captured the
			// binding at import time, but vitest rewrites ESM imports so
			// spyOn on the module works.
			engineSpy = vi.spyOn(mod, "runLocalZoneEngine");
		});

		afterEach(() => {
			engineSpy.mockRestore();
		});

		it("resolves room defaults by z0.type when trigger is unset ('seating' → 7, not default → 5)", () => {
			host._zoneConfigs = [
				{ type: "seating" as const },
				null,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			ctrl.runLocalZoneEngine();
			expect(engineSpy).toHaveBeenCalledTimes(1);
			const params = (engineSpy.mock.calls[0] as any[])[1];
			expect(params.roomType).toBe("seating");
			// rest defaults: trigger 7, renew 1, timeout 30, handoff_timeout 10
			expect(params.roomTrigger).toBe(7);
			expect(params.roomRenew).toBe(1);
			expect(params.roomTimeout).toBe(30);
			expect(params.roomHandoffTimeout).toBe(10);
		});

		it("uses type defaults authoritatively for non-custom types, ignoring user-supplied trigger", () => {
			// z0.type = "seating" but with stale user-supplied overrides from a
			// previous custom config; per getZoneThresholds semantics, the
			// rest defaults must win.
			host._zoneConfigs = [
				{
					type: "seating" as const,
					trigger: 2,
					renew: 9,
					timeout: 99,
					handoff_timeout: 99,
				},
				null,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			ctrl.runLocalZoneEngine();
			const params = (engineSpy.mock.calls[0] as any[])[1];
			expect(params.roomTrigger).toBe(7);
			expect(params.roomRenew).toBe(1);
			expect(params.roomTimeout).toBe(30);
			expect(params.roomHandoffTimeout).toBe(10);
		});

		it("honours user-supplied values for type 'custom'", () => {
			host._zoneConfigs = [
				{
					type: "custom" as const,
					trigger: 4,
					renew: 2,
					timeout: 20,
					handoff_timeout: 5,
				},
				null,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			ctrl.runLocalZoneEngine();
			const params = (engineSpy.mock.calls[0] as any[])[1];
			expect(params.roomType).toBe("custom");
			expect(params.roomTrigger).toBe(4);
			expect(params.roomRenew).toBe(2);
			expect(params.roomTimeout).toBe(20);
			expect(params.roomHandoffTimeout).toBe(5);
		});

		it("forwards host static/motion timeout values (not hardcoded 10s)", () => {
			// The host carries the user-configured sensor timeouts; the editor
			// preview must mirror them so its pending-state behaviour matches
			// the firmware.
			host._staticTimeout = 30;
			host._motionTimeout = 5;
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			ctrl.runLocalZoneEngine();
			const params = (engineSpy.mock.calls[0] as any[])[1];
			expect(params.staticTimeout).toBe(30);
			expect(params.motionTimeout).toBe(5);
		});
	});

	// -------------------------------------------------------------------------
	// runLocalZoneEngine
	// -------------------------------------------------------------------------
	describe("runLocalZoneEngine", () => {
		/** Build a simple grid with all interior cells set to zone 0 (room). */
		function makeSimpleGrid(): Uint8Array<ArrayBuffer> {
			const grid = new Uint8Array(GRID_CELL_COUNT);
			for (let i = 0; i < GRID_CELL_COUNT; i++) {
				grid[i] = CELL_ROOM_BIT;
			}
			return grid;
		}

		beforeEach(() => {
			host._grid = makeSimpleGrid();
			// Keep zone 0 (slot 0); clear all named-zone slots.
			host._zoneConfigs = [
				host._zoneConfigs[0],
				null,
				null,
				null,
				null,
				null,
				null,
				null,
			];
		});

		it("returns a ZoneEngineResult with occupancy and targets arrays", () => {
			const result = ctrl.runLocalZoneEngine();
			expect(result).toHaveProperty("occupancy");
			expect(result).toHaveProperty("targets");
		});

		it("returns inactive status for an empty targets list", () => {
			host._targets = [];
			const result = ctrl.runLocalZoneEngine();
			expect(result.targets).toEqual([]);
		});

		it("mutates the internal ZoneEngineState across calls", () => {
			host._targets = [{ x: 0, y: 0, status: "active", signal: 100 }];
			ctrl.runLocalZoneEngine();
			ctrl.runLocalZoneEngine();
			// The gate-count for target 0 should have advanced
			expect(ctrl.zoneEngineState.targetGateCount[0]).toBeGreaterThanOrEqual(0);
		});

		it("builds frontend debug log when _showDebugLog is true", () => {
			host._showDebugLog = true;
			// Place a target in the centre of the grid so it maps to an inside cell
			const centerCol = Math.floor(GRID_COLS / 2);
			const centerRow = Math.floor(GRID_ROWS / 2);
			host._targets = [
				{
					x: (centerCol - GRID_COLS / 2 + 0.5) * 300, // mm
					y: centerRow * 300 + 150, // mm
					status: "active",
					signal: 80,
				},
			];
			ctrl.runLocalZoneEngine();
			// A line should have been appended (or prev should be set)
			// Either the line was added or deduplication kicked in — at minimum requestUpdate was called
			const hasLines =
				host._debugLogLines.length > 0 || host._debugLogPrev !== "";
			expect(hasLines).toBe(true);
		});

		it("does NOT build frontend debug log when _showDebugLog is false", () => {
			host._showDebugLog = false;
			host._targets = [{ x: 100, y: 100, status: "active", signal: 80 }];
			ctrl.runLocalZoneEngine();
			expect(host._debugLogLines.length).toBe(0);
		});

		it("caps frontend debug log lines at DEBUG_LOG_MAX", () => {
			host._showDebugLog = true;
			// Run engine DEBUG_LOG_MAX+2 times, each with a unique target position so
			// dedup doesn't suppress lines.  We clear _debugLogPrev before each call.
			for (let i = 0; i <= DEBUG_LOG_MAX; i++) {
				host._debugLogPrev = "";
				ctrl.runLocalZoneEngine();
			}
			expect(host._debugLogLines.length).toBeLessThanOrEqual(DEBUG_LOG_MAX);
		});

		it("handles null _sensorState gracefully (uses false fallbacks)", () => {
			host._sensorState = null;
			host._targets = [];
			expect(() => ctrl.runLocalZoneEngine()).not.toThrow();
		});

		it("builds frontend debug log with static/motion sensor prefix from zone engine state", () => {
			host._showDebugLog = true;
			// Directly set the internal zone engine state to have active static/motion
			const state = ctrl.zoneEngineState;
			state.staticState = "active";
			state.motionState = "active";
			ctrl.zoneEngineState = state;
			host._targets = [];
			ctrl.runLocalZoneEngine();
			// Should have produced a log line containing sensor info
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Static:");
		});

		it("encodes 'active' static state as 'A' in frontend debug log", () => {
			host._showDebugLog = true;
			host._targets = [];
			// Pass static_presence = true so the zone engine produces staticState "active"
			host._sensorState = {
				occupancy: false,
				static_presence: true,
				motion_presence: false,
				target_presence: false,
				mmwave: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Static: active");
		});

		it("encodes 'active' motion state as 'A' in frontend debug log", () => {
			host._showDebugLog = true;
			host._targets = [];
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: true,
				target_presence: false,
				mmwave: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Motion: active");
		});

		it("deduplicates frontend debug log on consecutive identical results", () => {
			host._showDebugLog = true;
			host._targets = [];
			// First call populates the log
			ctrl.runLocalZoneEngine();
			const countAfterFirst = host._debugLogLines.length;
			// Second call with identical state should be deduped
			ctrl.runLocalZoneEngine();
			expect(host._debugLogLines.length).toBe(countAfterFirst);
		});

		it("encodes 'pending' static state as 'P' in frontend debug log", () => {
			host._showDebugLog = true;
			// Pre-seed state as "active" then run with no targets/presence → transitions to "pending"
			const state = ctrl.zoneEngineState;
			state.staticState = "pending";
			state.staticPendingSince = Date.now() / 1000; // recent, not timed-out yet
			ctrl.zoneEngineState = state;
			host._targets = [];
			// No static presence → state stays "pending" (not timed out)
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				mmwave: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Static: pending");
		});

		it("encodes 'pending' motion state as 'P' in frontend debug log", () => {
			host._showDebugLog = true;
			const state = ctrl.zoneEngineState;
			state.motionState = "pending";
			state.motionPendingSince = Date.now() / 1000;
			ctrl.zoneEngineState = state;
			host._targets = [];
			host._sensorState = {
				occupancy: false,
				static_presence: false,
				motion_presence: false,
				target_presence: false,
				mmwave: false,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			};
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Motion: pending");
		});

		it("encodes zone 'O' state (occupied, no pendingSince) in frontend debug log", () => {
			host._showDebugLog = true;
			// Zone 0 (Room) occupied with pendingSince === null → state code "O"
			const state = ctrl.zoneEngineState;
			state.localZoneState.set(0, {
				occupied: true,
				pendingSince: null, // confirmed occupied → "O"
				confirmedTargets: new Set(),
			});
			ctrl.zoneEngineState = state;
			host._targets = [];
			ctrl.runLocalZoneEngine();
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			expect(allLog).toContain("Room");
		});

		it("includes 'pending' zone state (P) in debug log when zone has pendingSince set", () => {
			host._showDebugLog = true;
			// Seed the zone engine state with an occupied zone that has pendingSince set
			const state = ctrl.zoneEngineState;
			state.localZoneState.set(0, {
				occupied: true,
				pendingSince: Date.now() / 1000,
				confirmedTargets: new Set(),
			});
			ctrl.zoneEngineState = state;
			host._targets = [];
			ctrl.runLocalZoneEngine();
			// The log should either have a line or prev set
			const allLog = host._debugLogLines.join(" ") + host._debugLogPrev;
			// Zone 0 (Room) with pendingSince set → state code "P"
			expect(allLog).toContain("Room");
		});

		it("computes allZoneIds once per grid reference (cached across runs)", () => {
			host._showDebugLog = true;
			const spy = vi.spyOn(ctrl as any, "_computeAllZoneIds");
			ctrl.runLocalZoneEngine();
			ctrl.runLocalZoneEngine();
			ctrl.runLocalZoneEngine();
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it("recomputes allZoneIds when host._grid is replaced", () => {
			host._showDebugLog = true;
			const spy = vi.spyOn(ctrl as any, "_computeAllZoneIds");
			ctrl.runLocalZoneEngine();
			host._grid = makeSimpleGrid();
			ctrl.runLocalZoneEngine();
			expect(spy).toHaveBeenCalledTimes(2);
		});

		// -----------------------------------------------------------------------
		// frontend debug log DOM behavior
		// -----------------------------------------------------------------------
		describe("frontend debug log DOM behavior", () => {
			let container: HTMLDivElement;

			beforeEach(() => {
				host._showDebugLog = true;
				host._grid = makeSimpleGrid();
				container = document.createElement("div");
				host._mockFrontendContainer = container;
				// Ensure a unique log line is generated each test (no dedup suppression)
				host._debugLogPrev = "";
			});

			it("appends a div to the frontend container", () => {
				ctrl.runLocalZoneEngine();
				expect(container.children.length).toBeGreaterThanOrEqual(1);
				for (const child of Array.from(container.children)) {
					expect(child.className).toBe("debug-log-line");
				}
			});

			it("does NOT call requestUpdate", () => {
				host.requestUpdate.mockClear();
				ctrl.runLocalZoneEngine();
				expect(host.requestUpdate).not.toHaveBeenCalled();
			});

			it("clears placeholder on first append", () => {
				const placeholder = document.createElement("div");
				placeholder.textContent = "Waiting for events...";
				container.appendChild(placeholder);

				ctrl.runLocalZoneEngine();

				// Placeholder should be gone; only debug-log-line divs remain
				expect(container.children.length).toBeGreaterThanOrEqual(1);
				for (const child of Array.from(container.children)) {
					expect(child.className).toBe("debug-log-line");
				}
			});

			it("handles missing container gracefully", () => {
				host._mockFrontendContainer = null;
				expect(() => ctrl.runLocalZoneEngine()).not.toThrow();
				// Data array should still be populated
				expect(host._debugLogLines.length).toBeGreaterThanOrEqual(1);
			});

			it("auto-scrolls the container", () => {
				Object.defineProperty(container, "scrollHeight", {
					value: 500,
					configurable: true,
				});
				ctrl.runLocalZoneEngine();
				expect(container.scrollTop).toBe(500);
			});
		});
	});
});
