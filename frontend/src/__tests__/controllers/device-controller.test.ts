import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceController } from "../../controllers/device-controller.js";
import type { DeviceInfo } from "../../types.js";

function mockHost() {
	return {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

function mockHass(devices: DeviceInfo[] = []) {
	return {
		callWS: vi.fn().mockResolvedValue({ devices }),
		connection: {
			subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
		},
	};
}

function makeDevice(mac: string, available: boolean): DeviceInfo {
	return {
		mac,
		name: "EPP",
		host: null,
		available,
		configured: true,
		firmware_status: "compatible",
		current_connection_count: null,
		area: null,
	};
}

describe("DeviceController", () => {
	let host: ReturnType<typeof mockHost>;
	let hass: ReturnType<typeof mockHass>;
	let ctrl: DeviceController;

	beforeEach(() => {
		host = mockHost();
		hass = mockHass();
		ctrl = new DeviceController(host);
		ctrl.hass = hass;
		localStorage.clear();
	});

	// --- Construction ---
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("initializes with default state", () => {
			expect(ctrl.devices).toEqual([]);
			expect(ctrl.selectedMac).toBe("");
		});
	});

	// --- Lifecycle ---
	describe("hostDisconnected", () => {
		it("closes the device session", async () => {
			ctrl.hass = mockHass();
			await ctrl.openDeviceSession("aa:bb");
			expect(ctrl.hasDeviceSession).toBe(true);
			ctrl.hostDisconnected();
			expect(ctrl.hasDeviceSession).toBe(false);
		});
	});

	// --- loadDevices ---
	describe("loadDevices", () => {
		it("loads and sorts devices by name", async () => {
			const devices: DeviceInfo[] = [
				{
					mac: "bb",
					name: "Zed",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			expect(ctrl.devices).toHaveLength(2);
			expect(ctrl.devices[0].name).toBe("Alpha");
			expect(ctrl.devices[1].name).toBe("Zed");
		});

		it("selects the first device by default", async () => {
			const devices: DeviceInfo[] = [
				{
					mac: "bb",
					name: "Zed",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			// Sorted, so "Alpha" (mac "aa") is first
			expect(ctrl.selectedMac).toBe("aa");
		});

		it("restores selected mac from localStorage", async () => {
			localStorage.setItem("epp_selected_mac", "bb");
			const devices: DeviceInfo[] = [
				{
					mac: "bb",
					name: "Zed",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			expect(ctrl.selectedMac).toBe("bb");
		});

		it("falls back to first device when stored mac not found", async () => {
			localStorage.setItem("epp_selected_mac", "gone");
			const devices: DeviceInfo[] = [
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();

			expect(ctrl.selectedMac).toBe("aa");
		});

		it("sets empty devices on callWS failure", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("fail")),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.devices).toEqual([]);
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.loadDevices();
			expect(ctrl.devices).toEqual([]);
		});

		it("populates showRoomCalibrationTutorial from the response", async () => {
			const devices: DeviceInfo[] = [];
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({
					devices,
					show_room_calibration_tutorial: false,
				}),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.showRoomCalibrationTutorial).toBe(false);
		});

		it("defaults showRoomCalibrationTutorial to true when flag is missing", async () => {
			ctrl.hass = mockHass([]);
			await ctrl.loadDevices();
			expect(ctrl.showRoomCalibrationTutorial).toBe(true);
		});

		it("calls host.requestUpdate after loading", async () => {
			const devices: DeviceInfo[] = [
				{
					mac: "aa",
					name: "A",
					host: null,
					available: true,
					configured: true,
					firmware_status: "compatible",
					current_connection_count: null,
					area: null,
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});
	});

	// --- loadDeviceConfig ---
	describe("setShowRoomCalibrationTutorial", () => {
		it("updates the flag and triggers a host update when the value changes", () => {
			ctrl.showRoomCalibrationTutorial = true;
			host.requestUpdate.mockClear();

			ctrl.setShowRoomCalibrationTutorial(false);

			expect(ctrl.showRoomCalibrationTutorial).toBe(false);
			expect(host.requestUpdate).toHaveBeenCalledTimes(1);
		});

		it("does not trigger a host update when the value is unchanged", () => {
			ctrl.showRoomCalibrationTutorial = true;
			host.requestUpdate.mockClear();

			ctrl.setShowRoomCalibrationTutorial(true);

			expect(host.requestUpdate).not.toHaveBeenCalled();
		});
	});

	describe("subscribeDeviceList", () => {
		it("updates showRoomCalibrationTutorial from subscription messages", async () => {
			let capturedCb: ((msg: any) => void) | null = null;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn((cb: any) => {
						capturedCb = cb;
						return Promise.resolve(() => {});
					}),
				},
			};

			await ctrl.subscribeDeviceList();
			expect(capturedCb).not.toBeNull();

			capturedCb!({ devices: [], show_room_calibration_tutorial: false });
			expect(ctrl.showRoomCalibrationTutorial).toBe(false);

			capturedCb!({ devices: [], show_room_calibration_tutorial: true });
			expect(ctrl.showRoomCalibrationTutorial).toBe(true);
		});
	});

	describe("reopenSession", () => {
		it("opens the device session and subscribes to targets without fetching config", async () => {
			const unsub = vi.fn();
			const callWS = vi.fn().mockResolvedValue({ config: {} });
			const subscribeMessage = vi.fn().mockResolvedValue(unsub);
			ctrl.hass = { callWS, connection: { subscribeMessage } };

			await ctrl.reopenSession("aa");

			// No config fetch on the reconnect path.
			const getConfigCalls = callWS.mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/get_config",
			);
			expect(getConfigCalls).toHaveLength(0);

			// Session and target subscriptions are opened.
			const subTypes = subscribeMessage.mock.calls.map(
				(c: any[]) => c[1]?.type,
			);
			expect(subTypes).toContain("eppgrid/subscribe_device");
			expect(subTypes).toContain("eppgrid/subscribe_grid_targets");
			expect(ctrl.hasDeviceSession).toBe(true);
		});

		it("dedupes concurrent calls — only one session-open pipeline runs at a time", async () => {
			// Panel `updated()` can fire very frequently (every hass prop
			// update).  Without re-entrancy protection, multiple concurrent
			// reopens would churn subscriptions.  Verify a second call
			// while the first is in flight reuses the in-flight promise
			// rather than kicking off a parallel subscribe.
			let resolveDevice!: (unsub: () => void) => void;
			const subscribeMessage = vi.fn().mockImplementation((_cb, msg) => {
				if (msg.type === "eppgrid/subscribe_device") {
					return new Promise<() => void>((resolve) => {
						resolveDevice = resolve;
					});
				}
				return Promise.resolve(vi.fn());
			});
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: { subscribeMessage },
			};

			const p1 = ctrl.reopenSession("aa");
			const p2 = ctrl.reopenSession("aa");
			await new Promise((r) => setTimeout(r, 0));

			// Only ONE subscribe_device call has been issued so far.
			const deviceSubs = subscribeMessage.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(deviceSubs).toHaveLength(1);

			resolveDevice(vi.fn());
			await Promise.all([p1, p2]);

			// Still only ONE subscribe_device call after both resolve.
			const finalDeviceSubs = subscribeMessage.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(finalDeviceSubs).toHaveLength(1);
		});

		it("allows a fresh reopen after a previous one completes", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: {
					subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
				},
			};

			await ctrl.reopenSession("aa");
			await ctrl.reopenSession("aa");

			const deviceSubs = (
				ctrl.hass.connection.subscribeMessage as any
			).mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(deviceSubs).toHaveLength(2);
		});

		it("does NOT dedupe concurrent calls for different macs — the new mac must open its own session", async () => {
			// Simulates a device-switch arriving while a reopen for the
			// previous mac is still in flight. The reopen for the new mac
			// must eventually subscribe to the new device, not silently
			// attach the panel to the old one.
			let resolveAa!: (unsub: () => void) => void;
			const unsubs: Record<string, () => void> = {};
			const subscribeMessage = vi.fn().mockImplementation((_cb, msg) => {
				if (msg.type === "eppgrid/subscribe_device") {
					if (msg.mac === "aa") {
						return new Promise<() => void>((resolve) => {
							resolveAa = (fn) => {
								unsubs.aa = fn;
								resolve(fn);
							};
						});
					}
					const unsubBb = vi.fn();
					unsubs.bb = unsubBb;
					return Promise.resolve(unsubBb);
				}
				return Promise.resolve(vi.fn());
			});
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: { subscribeMessage },
			};

			const p1 = ctrl.reopenSession("aa");
			const p2 = ctrl.reopenSession("bb");
			resolveAa(vi.fn());
			await Promise.all([p1, p2]);

			const deviceSubs = subscribeMessage.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			const subbedMacs = deviceSubs.map((c: any[]) => c[1].mac);
			expect(subbedMacs).toContain("aa");
			expect(subbedMacs).toContain("bb");
			// After both settle, the "bb" session is the live one.
			expect(ctrl.hasDeviceSession).toBe(true);
		});
	});

	describe("loadDeviceConfig", () => {
		it("returns the config from the backend", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: { key: "val" } }),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			const config = await ctrl.loadDeviceConfig("aa");
			expect(config).toEqual({ key: "val" });
		});

		it("returns null when callWS fails", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("nope")),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			const config = await ctrl.loadDeviceConfig("aa");
			expect(config).toBeNull();
		});

		it("opens a device session and subscribes to targets", async () => {
			const unsubFn = vi.fn();
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: {} }),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsubFn) },
			};
			await ctrl.loadDeviceConfig("aa");
			expect(ctrl.hasDeviceSession).toBe(true);
			// subscribeMessage called for: device session, grid targets, raw targets
			expect(ctrl.hass.connection.subscribeMessage).toHaveBeenCalledTimes(3);
		});

		it("dedupes concurrent calls for the same mac via the in-flight promise", async () => {
			// Without the dedupe, a second call returns null (reconnecting
			// guard) and the caller has no way to await the original load.
			// With dedupe, both callers get the same resolved config.
			let resolveCallWs!: (v: any) => void;
			const callWS = vi.fn().mockImplementation((req: any) => {
				if (req.type === "eppgrid/get_config") {
					return new Promise((resolve) => {
						resolveCallWs = resolve;
					});
				}
				return Promise.resolve({});
			});
			ctrl.hass = {
				callWS,
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};

			const p1 = ctrl.loadDeviceConfig("aa");
			const p2 = ctrl.loadDeviceConfig("aa");

			resolveCallWs({ config: { foo: "bar" } });
			const [r1, r2] = await Promise.all([p1, p2]);

			expect(r1).toEqual({ foo: "bar" });
			expect(r2).toEqual({ foo: "bar" });
			// get_config call only once — second caller piggybacked on the
			// in-flight promise.
			const getConfigCalls = (callWS as any).mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/get_config",
			);
			expect(getConfigCalls).toHaveLength(1);
		});
	});

	// --- Session management ---
	describe("openDeviceSession", () => {
		it("subscribes to eppgrid/subscribe_device", async () => {
			await ctrl.openDeviceSession("aa");
			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_device", mac: "aa" },
			);
			expect(ctrl.hasDeviceSession).toBe(true);
		});

		it("closes previous session before opening new one", async () => {
			const unsub1 = vi.fn();
			const conn = { subscribeMessage: vi.fn().mockResolvedValue(unsub1) };
			ctrl.hass = {
				callWS: vi.fn(),
				connection: conn,
			};
			await ctrl.openDeviceSession("aa");

			// Same connection — unsub1 should be called when opening new session
			conn.subscribeMessage.mockResolvedValue(vi.fn());
			await ctrl.openDeviceSession("bb");

			expect(unsub1).toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(true);
		});

		it("clears stale subscriptions when connection changes", async () => {
			const unsub1 = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub1) },
			};
			await ctrl.openDeviceSession("aa");
			expect(ctrl.hasDeviceSession).toBe(true);

			// New connection — stale sub is cleared without calling unsub
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			expect(ctrl.hasDeviceSession).toBe(false);
			expect(unsub1).not.toHaveBeenCalled();
		});

		it("clears the device-list subscription unsub on connection change", async () => {
			// Stale unsubs against the dead connection do nothing useful and
			// hide the fact that there's no live subscription on the new
			// connection. Drop them so resubscribe is a clean slate.
			const unsub = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub) },
			};
			await ctrl.subscribeDeviceList();
			expect((ctrl as any)._unsubDeviceList).toBe(unsub);

			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			expect((ctrl as any)._unsubDeviceList).toBeUndefined();
		});

		it("cancels the target retry timer on connection change", async () => {
			// Without this, the retry timer fires after reconnect, sees
			// hass.connection !== conn, and silently returns — but the
			// timer is still scheduled and pinned in memory until then.
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi
						.fn()
						.mockRejectedValueOnce(new Error("unknown command"))
						.mockResolvedValue(vi.fn()),
				},
			};
			ctrl.subscribeTargets("aa");
			// Allow grid subscribe rejection to schedule the retry timer.
			await new Promise((r) => setTimeout(r, 0));
			expect((ctrl as any)._targetRetryTimer).toBeDefined();

			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			expect((ctrl as any)._targetRetryTimer).toBeUndefined();
		});

		it("does nothing when mac is empty", async () => {
			await ctrl.openDeviceSession("");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.openDeviceSession("aa");
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("handles subscription failure gracefully", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(new Error("fail")),
				},
			};
			await ctrl.openDeviceSession("aa");
			expect(ctrl.hasDeviceSession).toBe(false);
			expect(warn).toHaveBeenCalledWith(
				"Failed to open device session:",
				expect.any(Error),
			);
			warn.mockRestore();
		});

		it("sets connectionFailed when subscription fails with connection_failed code", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			const err = Object.assign(new Error("fail"), {
				code: "connection_failed",
			});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(err),
				},
			};
			expect(ctrl.connectionFailed).toBe(false);
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(true);
			warn.mockRestore();
		});

		it("sets connectionFailed when subscription fails with not_found code", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			const err = Object.assign(new Error("fail"), { code: "not_found" });
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(err),
				},
			};
			expect(ctrl.connectionFailed).toBe(false);
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(true);
			warn.mockRestore();
		});

		it("does not set connectionFailed for unrelated errors", async () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(new Error("unrelated")),
				},
			};
			expect(ctrl.connectionFailed).toBe(false);
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(false);
			warn.mockRestore();
		});

		it("clears connectionFailed on successful session", async () => {
			(ctrl as any)._connectionFailed = true;
			await ctrl.openDeviceSession("aa");
			expect(ctrl.connectionFailed).toBe(false);
		});
	});

	describe("closeDeviceSession", () => {
		it("calls unsubscribe and clears the session", async () => {
			const unsub = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub) },
			};
			await ctrl.openDeviceSession("aa");
			ctrl.closeDeviceSession();
			expect(unsub).toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("handles stale unsub gracefully", async () => {
			const unsub = vi.fn().mockImplementation(() => {
				throw new Error("stale");
			});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub) },
			};
			await ctrl.openDeviceSession("aa");
			// Should not throw
			ctrl.closeDeviceSession();
			expect(ctrl.hasDeviceSession).toBe(false);
		});
	});

	// --- Target subscription ---
	describe("subscribeTargets", () => {
		it("subscribes to grid targets and display", () => {
			ctrl.subscribeTargets("aa");
			const calls = hass.connection.subscribeMessage.mock.calls;
			expect(calls).toHaveLength(2);
			expect(calls[0][1]).toEqual({
				type: "eppgrid/subscribe_grid_targets",
				mac: "aa",
			});
			expect(calls[1][1]).toEqual({
				type: "eppgrid/subscribe_raw_targets",
				mac: "aa",
			});
		});

		it("does nothing when hass is null", () => {
			ctrl.hass = null;
			ctrl.subscribeTargets("aa");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("does nothing when mac is empty", () => {
			ctrl.subscribeTargets("");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("unsubscribes previous target subscription", () => {
			const unsub = vi.fn();
			// Manually set previous unsub
			(ctrl as any)._unsubTargets = unsub;
			ctrl.subscribeTargets("aa");
			expect(unsub).toHaveBeenCalled();
		});

		it("does not throw when the previous unsub is stale (e.g. after a connection drop)", () => {
			// A connection drop can leave _unsubTargets pointing at a closure
			// against the dead socket; calling it throws. subscribeTargets
			// must swallow that so the new subscription still goes through.
			(ctrl as any)._unsubTargets = () => {
				throw new Error("stale");
			};
			expect(() => ctrl.subscribeTargets("aa")).not.toThrow();
		});

		it("calls onTargetData callback with processed event data", async () => {
			let capturedCallback: ((event: any) => void) | undefined;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_grid_targets") {
							capturedCallback = cb;
						}
						return Promise.resolve(vi.fn());
					}),
				},
			};

			const onTargetData = vi.fn();
			ctrl.onTargetData = onTargetData;
			ctrl.subscribeTargets("aa");

			// Wait for subscription promises
			await new Promise((r) => setTimeout(r, 0));

			expect(capturedCallback).toBeDefined();
			capturedCallback!({
				targets: [{ x: 100, y: 200, status: "active", signal: 50 }],
				sensors: { occupancy: true, static_presence: false },
				zones: {
					occupancy: { 1: true },
					target_counts: { 1: 2 },
					frame_count: 5,
				},
			});

			expect(onTargetData).toHaveBeenCalledWith({
				targets: [{ x: 100, y: 200, status: "active", signal: 50 }],
				sensors: {
					occupancy: true,
					static_presence: false,
					motion_presence: false,
					target_presence: false,
					mmwave: false,
					illuminance: null,
					temperature: null,
					humidity: null,
					co2: null,
				},
				zones: {
					occupancy: { 1: true },
					target_counts: { 1: 2 },
					frame_count: 5,
					debug_log: undefined,
				},
			});
		});

		it("handles events without sensors or zones", async () => {
			let capturedCallback: ((event: any) => void) | undefined;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_grid_targets") {
							capturedCallback = cb;
						}
						return Promise.resolve(vi.fn());
					}),
				},
			};

			const onTargetData = vi.fn();
			ctrl.onTargetData = onTargetData;
			ctrl.subscribeTargets("aa");
			await new Promise((r) => setTimeout(r, 0));

			capturedCallback!({ targets: [] });
			expect(onTargetData).toHaveBeenCalledWith({
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
			});
		});
	});

	describe("subscribeTargets retry", () => {
		it("retries subscription after failure", async () => {
			vi.useFakeTimers();
			const unsub = vi.fn();
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValueOnce(new Error("unknown command"))
				.mockResolvedValueOnce(vi.fn()) // display sub
				.mockResolvedValueOnce(unsub); // grid retry

			ctrl.subscribeTargets("aa");

			// First attempt fails, display succeeds
			await vi.advanceTimersByTimeAsync(0);

			// Retry fires after 2s
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(3);
			expect((ctrl as any)._unsubTargets).toBe(unsub);

			vi.useRealTimers();
		});

		it("does not retry after unsubscribeTargets is called", async () => {
			vi.useFakeTimers();
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValueOnce(new Error("unknown command"))
				.mockResolvedValueOnce(vi.fn());

			ctrl.subscribeTargets("aa");
			await vi.advanceTimersByTimeAsync(0);

			ctrl.unsubscribeTargets();

			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			// Only 2 initial calls (grid + display), no retry
			expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(2);

			vi.useRealTimers();
		});
		it("clears pending retry timer on new subscribeTargets call", async () => {
			vi.useFakeTimers();
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValueOnce(new Error("unknown command"))
				.mockResolvedValueOnce(vi.fn()) // display sub
				.mockResolvedValueOnce(vi.fn()) // second grid sub
				.mockResolvedValueOnce(vi.fn()); // second display sub

			ctrl.subscribeTargets("aa");
			await vi.advanceTimersByTimeAsync(0);

			// Retry is pending — call subscribeTargets again before it fires
			ctrl.subscribeTargets("bb");
			await vi.advanceTimersByTimeAsync(0);

			// Advance past where the old retry would have fired
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			// Should have: grid(aa) + display(aa) + grid(bb) + display(bb) = 4
			// NOT 5 (no stale retry for "aa")
			expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(4);

			vi.useRealTimers();
		});
	});

	describe("unsubscribeTargets", () => {
		it("calls unsub and clears references", () => {
			const unsub = vi.fn();
			(ctrl as any)._unsubTargets = unsub;
			ctrl.unsubscribeTargets();
			expect(unsub).toHaveBeenCalled();
			expect((ctrl as any)._unsubTargets).toBeUndefined();
		});

		it("handles stale unsub gracefully", () => {
			(ctrl as any)._unsubTargets = () => {
				throw new Error("stale");
			};
			ctrl.unsubscribeTargets();
			expect((ctrl as any)._unsubTargets).toBeUndefined();
		});
	});

	// --- Display subscription ---
	describe("subscribeDisplay", () => {
		it("subscribes to raw targets", () => {
			ctrl.subscribeDisplay("aa");
			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_raw_targets", mac: "aa" },
			);
		});

		it("does nothing when hass is null", () => {
			ctrl.hass = null;
			ctrl.subscribeDisplay("aa");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("does nothing when mac is empty", () => {
			ctrl.subscribeDisplay("");
			expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
		});

		it("calls onRawTargetData callback with processed data", async () => {
			let capturedCallback: ((event: any) => void) | undefined;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation((cb: any) => {
						capturedCallback = cb;
						return Promise.resolve(vi.fn());
					}),
				},
			};

			const onRawTargetData = vi.fn();
			ctrl.onRawTargetData = onRawTargetData;
			ctrl.subscribeDisplay("aa");
			await new Promise((r) => setTimeout(r, 0));

			capturedCallback!({ targets: [{ raw_x: 10, raw_y: 20 }] });
			expect(onRawTargetData).toHaveBeenCalledWith([{ raw_x: 10, raw_y: 20 }]);
		});

		it("swallows subscription rejection without surfacing an uncaught promise", async () => {
			const unhandled: unknown[] = [];
			const handler = (reason: unknown) => {
				unhandled.push(reason);
			};
			process.on("unhandledRejection", handler);
			try {
				ctrl.hass = {
					callWS: vi.fn(),
					connection: {
						subscribeMessage: vi
							.fn()
							.mockRejectedValue(new Error("socket closed")),
					},
				};
				ctrl.subscribeDisplay("aa");
				// Let the microtask queue flush so the rejection fires if uncaught.
				await new Promise((r) => setTimeout(r, 0));
				await new Promise((r) => setTimeout(r, 0));
				expect(unhandled).toEqual([]);
			} finally {
				process.off("unhandledRejection", handler);
				// Cancel the retry the failed subscribe scheduled — this test
				// runs on real timers and must not leave a 2s callback behind.
				ctrl.unsubscribeDisplay();
			}
		});
	});

	describe("unsubscribeDisplay", () => {
		it("calls unsub and clears reference", () => {
			const unsub = vi.fn();
			(ctrl as any)._unsubDisplay = unsub;
			ctrl.unsubscribeDisplay();
			expect(unsub).toHaveBeenCalled();
			expect((ctrl as any)._unsubDisplay).toBeUndefined();
		});

		it("handles stale unsub gracefully", () => {
			(ctrl as any)._unsubDisplay = () => {
				throw new Error("stale");
			};
			ctrl.unsubscribeDisplay();
			expect((ctrl as any)._unsubDisplay).toBeUndefined();
		});
	});

	// --- selectDevice ---
	describe("selectDevice", () => {
		it("updates selectedMac and saves to localStorage", () => {
			ctrl.selectDevice("cc:dd");
			expect(ctrl.selectedMac).toBe("cc:dd");
			expect(localStorage.getItem("epp_selected_mac")).toBe("cc:dd");
		});

		it("calls host.requestUpdate", () => {
			ctrl.selectDevice("cc:dd");
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("resets availability tracker to avoid stale-edge reconnect", () => {
			const onSelectedAvailable = vi.fn();
			ctrl.onSelectedAvailable = onSelectedAvailable;

			// Prime: "aa" available → offline. Tracker latches to false.
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);
			onSelectedAvailable.mockClear();

			// User switches to "bb" — tracker must reset so the next push
			// is treated as an initial observation (prev === null) and not
			// a stale false→true rising edge.
			ctrl.selectDevice("bb");
			(ctrl as any)._applyDeviceList([makeDevice("bb", true)]);

			expect(onSelectedAvailable).not.toHaveBeenCalled();
		});
	});

	// --- hass getter/setter ---
	describe("hass", () => {
		it("stores and returns the hass reference", () => {
			const h = mockHass();
			ctrl.hass = h;
			expect(ctrl.hass).toBe(h);
		});
	});

	// --- reconnecting guard ---
	describe("reconnecting", () => {
		it("is false initially", () => {
			expect(ctrl.reconnecting).toBe(false);
		});

		it("is true while loadDeviceConfig is in progress", async () => {
			let resolveSubscribe!: (unsub: () => void) => void;
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: {} }),
				connection: {
					subscribeMessage: vi.fn().mockImplementation(
						() =>
							new Promise<() => void>((resolve) => {
								resolveSubscribe = resolve;
							}),
					),
				},
			};

			const promise = ctrl.loadDeviceConfig("aa");
			// Allow callWS to resolve and openDeviceSession to start
			await new Promise((r) => setTimeout(r, 0));

			expect(ctrl.reconnecting).toBe(true);

			resolveSubscribe(vi.fn());
			await promise;

			expect(ctrl.reconnecting).toBe(false);
		});

		it("is false after loadDeviceConfig fails", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("fail")),
				connection: {
					subscribeMessage: vi.fn().mockRejectedValue(new Error("no connect")),
				},
			};
			vi.spyOn(console, "warn").mockImplementation(() => {});

			await ctrl.loadDeviceConfig("aa");
			expect(ctrl.reconnecting).toBe(false);

			vi.restoreAllMocks();
		});

		it("prevents duplicate subscribe_device calls during async gap", async () => {
			let resolveFirst!: (unsub: () => void) => void;
			const subscribeMock = vi
				.fn()
				.mockImplementationOnce(
					() =>
						new Promise<() => void>((resolve) => {
							resolveFirst = resolve;
						}),
				)
				.mockResolvedValue(vi.fn());

			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ config: {} }),
				connection: { subscribeMessage: subscribeMock },
			};

			// First call — starts the async subscribe
			const p1 = ctrl.loadDeviceConfig("aa");
			await new Promise((r) => setTimeout(r, 0));

			// Second call while first is pending — should be blocked by guard
			expect(ctrl.reconnecting).toBe(true);
			const p2 = ctrl.loadDeviceConfig("aa");

			resolveFirst(vi.fn());
			await p1;
			await p2;

			// Only ONE subscribe_device call should have been made
			const deviceSubs = subscribeMock.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(deviceSubs).toHaveLength(1);
		});
	});

	// --- Availability edge transitions ---
	describe("availability transitions", () => {
		it("fires onSelectedAvailable (not reopenSession directly) when selected device transitions offline→online", async () => {
			// The controller hands off to the host via onSelectedAvailable
			// so the host can choose reopenSession vs loadDeviceConfig based
			// on whether it has already loaded config for this device.
			const onSelectedAvailable = vi.fn();
			ctrl.onSelectedAvailable = onSelectedAvailable;

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			ctrl.selectedMac = "aa";
			onSelectedAvailable.mockClear();

			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);
			expect(onSelectedAvailable).not.toHaveBeenCalled();

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			expect(onSelectedAvailable).toHaveBeenCalledWith("aa");
		});

		it("does not fire onSelectedAvailable when a non-selected device flips availability", async () => {
			const onSelectedAvailable = vi.fn();
			ctrl.onSelectedAvailable = onSelectedAvailable;

			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", true),
			]);
			ctrl.selectedMac = "aa";
			onSelectedAvailable.mockClear();

			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", false),
			]);
			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", true),
			]);

			expect(onSelectedAvailable).not.toHaveBeenCalled();
		});

		it("does not fire onSelectedAvailable on the first device_list message", async () => {
			// The host's first-load flow drives the initial connect, so the
			// controller must not pre-empt it when prev === null.
			const onSelectedAvailable = vi.fn();
			ctrl.onSelectedAvailable = onSelectedAvailable;

			ctrl.selectedMac = "aa";
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);

			expect(onSelectedAvailable).not.toHaveBeenCalled();
		});

		it("closes device session when selected device transitions online→offline", async () => {
			const closeSpy = vi.spyOn(ctrl, "closeDeviceSession");

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			ctrl.selectedMac = "aa";
			closeSpy.mockClear();

			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);

			expect(closeSpy).toHaveBeenCalledTimes(1);
		});

		it("fires onSessionClosed so host can clear live-target state", () => {
			const onClosed = vi.fn();
			ctrl.onSessionClosed = onClosed;

			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			ctrl.selectedMac = "aa";
			onClosed.mockClear();

			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);

			expect(onClosed).toHaveBeenCalledTimes(1);
		});

		it("fires onSessionClosed when firmware_status flips to unavailable while available stays true", () => {
			// Entity-level flap scenario: a non-critical entity stays online so
			// HA still reports `available: true`, but the firmware_version
			// sensor went unavailable (so `firmware_status="unavailable"`). The
			// backend's per-state close fired when any entity went offline,
			// leaving the live-target stream dead even though `available`
			// never flipped.
			const onClosed = vi.fn();
			ctrl.onSessionClosed = onClosed;

			(ctrl as any)._applyDeviceList([
				{
					...makeDevice("aa", true),
					firmware_status: "compatible",
				},
			]);
			ctrl.selectedMac = "aa";
			onClosed.mockClear();

			(ctrl as any)._applyDeviceList([
				{
					...makeDevice("aa", true),
					firmware_status: "unavailable",
				},
			]);

			expect(onClosed).toHaveBeenCalledTimes(1);
		});

		it("fires onSelectedAvailable when firmware_status recovers from unavailable while available stays true", () => {
			const onSelectedAvailable = vi.fn();
			ctrl.onSelectedAvailable = onSelectedAvailable;

			(ctrl as any)._applyDeviceList([
				{
					...makeDevice("aa", true),
					firmware_status: "compatible",
				},
			]);
			ctrl.selectedMac = "aa";
			onSelectedAvailable.mockClear();

			// firmware_version sensor goes unavailable — `available` stays
			// true because other entities are still reporting.
			(ctrl as any)._applyDeviceList([
				{
					...makeDevice("aa", true),
					firmware_status: "unavailable",
				},
			]);
			expect(onSelectedAvailable).not.toHaveBeenCalled();

			// firmware_version sensor comes back. The host needs to re-open
			// the session (the backend closed its end when the entity went
			// offline) so the live target stream resumes.
			(ctrl as any)._applyDeviceList([
				{
					...makeDevice("aa", true),
					firmware_status: "compatible",
				},
			]);
			expect(onSelectedAvailable).toHaveBeenCalledWith("aa");
		});
	});

	describe("subscription generation tokens", () => {
		it("immediately unsubscribes a late grid_targets resolution after unsubscribeTargets", async () => {
			// Subscribe → unsubscribe before promise resolves → promise resolves.
			// Without a generation token, the resolved unsub gets stashed on
			// `_unsubTargets` and the server-side subscription leaks.
			let resolveSub!: (unsub: () => void) => void;
			const unsubFn = vi.fn();
			const subscribeMock = vi.fn().mockImplementation((_cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_grid_targets") {
					return new Promise<() => void>((resolve) => {
						resolveSub = resolve;
					});
				}
				return Promise.resolve(vi.fn());
			});
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: subscribeMock },
			};

			ctrl.subscribeTargets("aa");
			ctrl.unsubscribeTargets();
			resolveSub(unsubFn);
			await new Promise((r) => setTimeout(r, 0));

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect((ctrl as any)._unsubTargets).toBeUndefined();
		});

		it("immediately unsubscribes a late raw_targets resolution after unsubscribeDisplay", async () => {
			let resolveSub!: (unsub: () => void) => void;
			const unsubFn = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation(() => {
						return new Promise<() => void>((resolve) => {
							resolveSub = resolve;
						});
					}),
				},
			};

			ctrl.subscribeDisplay("aa");
			ctrl.unsubscribeDisplay();
			resolveSub(unsubFn);
			await new Promise((r) => setTimeout(r, 0));

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect((ctrl as any)._unsubDisplay).toBeUndefined();
		});

		it("immediately unsubscribes a late device_list resolution after unsubscribeDeviceList", async () => {
			let resolveSub!: (unsub: () => void) => void;
			const unsubFn = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn().mockImplementation(() => {
						return new Promise<() => void>((resolve) => {
							resolveSub = resolve;
						});
					}),
				},
			};

			ctrl.subscribeDeviceList();
			ctrl.unsubscribeDeviceList();
			resolveSub(unsubFn);
			await new Promise((r) => setTimeout(r, 0));

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect((ctrl as any)._unsubDeviceList).toBeUndefined();
		});

		it("immediately unsubscribes a late grid_targets resolution after a connection swap", async () => {
			// HA reconnects with a new connection while a subscribe is in
			// flight. The pending promise resolves on the OLD connection;
			// any unsub it returns is dead, but storing it would mask the
			// fact that the new connection has no live subscription.
			let resolveSub!: (unsub: () => void) => void;
			const unsubFn = vi.fn();
			const subscribeMock = vi.fn().mockImplementation((_cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_grid_targets") {
					return new Promise<() => void>((resolve) => {
						resolveSub = resolve;
					});
				}
				return Promise.resolve(vi.fn());
			});
			const oldConn = { subscribeMessage: subscribeMock };
			ctrl.hass = { callWS: vi.fn(), connection: oldConn };

			ctrl.subscribeTargets("aa");

			// Connection swaps before the subscription resolves
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};

			resolveSub(unsubFn);
			await new Promise((r) => setTimeout(r, 0));

			expect((ctrl as any)._unsubTargets).toBeUndefined();
			expect(unsubFn).toHaveBeenCalledTimes(1);
		});
	});

	describe("dirty-guarded auto-switch", () => {
		// When the selected device disappears from a NON-empty push, the
		// controller auto-switches to devices[0] and the panel then loads the
		// new device's config straight over any unsaved editor edits with no
		// prompt. With unsaved edits, defer the switch instead: the missing
		// mac stays selected (the render path already treats
		// missing-from-list as offline) until the host is clean again.

		it("defers the auto-switch when the selected mac disappears while the host is dirty", () => {
			localStorage.setItem("epp_selected_mac", "aa");
			ctrl.isHostDirty = () => true;
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			expect(ctrl.selectedMac).toBe("aa");

			(ctrl as any)._applyDeviceList([makeDevice("bb", true)]);

			expect(ctrl.selectedMac).toBe("aa");
		});

		it("auto-switches as before when the host is clean", () => {
			localStorage.setItem("epp_selected_mac", "aa");
			ctrl.isHostDirty = () => false;
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);

			(ctrl as any)._applyDeviceList([makeDevice("bb", true)]);

			expect(ctrl.selectedMac).toBe("bb");
		});

		it("reconnects to the deferred device when it returns (USB-reflash flow)", () => {
			// Delete + re-add with the same mac: the deferred selection must
			// observe offline (session closed) then online (host reopens via
			// onSelectedAvailable), exactly like a regular availability blip.
			localStorage.setItem("epp_selected_mac", "aa");
			const onClosed = vi.fn();
			const onSelectedAvailable = vi.fn();
			ctrl.isHostDirty = () => true;
			ctrl.onSessionClosed = onClosed;
			ctrl.onSelectedAvailable = onSelectedAvailable;
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);

			// Device deleted; another remains. Deferred — but the missing
			// device counts as offline, so the session closes.
			(ctrl as any)._applyDeviceList([makeDevice("bb", true)]);
			expect(ctrl.selectedMac).toBe("aa");
			expect(onClosed).toHaveBeenCalledTimes(1);

			// Device re-added (same mac) — selection sticks and the host is
			// told to reconnect.
			(ctrl as any)._applyDeviceList([
				makeDevice("aa", true),
				makeDevice("bb", true),
			]);
			expect(ctrl.selectedMac).toBe("aa");
			expect(onSelectedAvailable).toHaveBeenCalledWith("aa");
		});
	});

	describe("loadDevices availability tracker", () => {
		it("resets the availability tracker when loadDevices changes the selection", async () => {
			// Same contract as _applyDeviceList/selectDevice: a selection
			// change must treat the next push as an initial observation, not
			// fire a stale false→true rising edge from the previous device.
			localStorage.setItem("epp_selected_mac", "aa");
			const onSelectedAvailable = vi.fn();
			ctrl.onSelectedAvailable = onSelectedAvailable;
			(ctrl as any)._applyDeviceList([makeDevice("aa", true)]);
			(ctrl as any)._applyDeviceList([makeDevice("aa", false)]);
			onSelectedAvailable.mockClear();

			// One-shot reload returns a different device set; selection moves
			// to "bb".
			ctrl.hass = mockHass([makeDevice("bb", true)]);
			await ctrl.loadDevices();
			expect(ctrl.selectedMac).toBe("bb");

			(ctrl as any)._applyDeviceList([makeDevice("bb", true)]);

			expect(onSelectedAvailable).not.toHaveBeenCalled();
		});
	});

	describe("device-list resubscribe after connection swap", () => {
		it("connection swap auto-resubscribes the device-list on the new connection", async () => {
			// Without resubscribe the panel stops getting device-list pushes
			// after an HA reconnect — selection/availability silently go stale.
			const staleUnsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(staleUnsub);
			await ctrl.subscribeDeviceList();
			expect((ctrl as any)._unsubDeviceList).toBe(staleUnsub);

			const newUnsub = vi.fn();
			const newSubscribe = vi.fn().mockResolvedValue(newUnsub);
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: newSubscribe },
			};

			// Microtask drain so the awaited resubscribe in `set hass` resolves.
			await Promise.resolve();
			await Promise.resolve();

			expect(newSubscribe).toHaveBeenCalledWith(expect.any(Function), {
				type: "eppgrid/subscribe_device_list",
			});
			expect((ctrl as any)._unsubDeviceList).toBe(newUnsub);
			// Stale unsub belongs to the dead socket — must not be invoked.
			expect(staleUnsub).not.toHaveBeenCalled();
		});

		it("connection swap auto-resubscribes even when the prior subscribe was still in flight", async () => {
			// `_unsubDeviceList` only exists after subscribeMessage resolves;
			// gating the resubscribe on it would silently miss a swap landing
			// mid-subscribe. Track intent separately (see flasher-controller).
			let resolveOld: (unsub: () => void) => void = () => {};
			const oldUnsub = vi.fn();
			const oldSubPromise = new Promise<() => void>((r) => {
				resolveOld = r;
			});
			hass.connection.subscribeMessage = vi.fn().mockReturnValue(oldSubPromise);

			void ctrl.subscribeDeviceList();
			expect((ctrl as any)._unsubDeviceList).toBeUndefined();

			const newUnsub = vi.fn();
			const newSubscribe = vi.fn().mockResolvedValue(newUnsub);
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: newSubscribe },
			};

			// Old subscribe finally resolves; generation token discards it.
			resolveOld(oldUnsub);
			for (let i = 0; i < 5; i++) await Promise.resolve();

			expect(newSubscribe).toHaveBeenCalledWith(expect.any(Function), {
				type: "eppgrid/subscribe_device_list",
			});
			expect((ctrl as any)._unsubDeviceList).toBe(newUnsub);
		});

		it("connection swap does NOT auto-resubscribe when there was no prior subscription", async () => {
			const newSubscribe = vi.fn().mockResolvedValue(vi.fn());
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: newSubscribe },
			};
			await Promise.resolve();
			await Promise.resolve();

			expect(newSubscribe).not.toHaveBeenCalled();
			expect((ctrl as any)._unsubDeviceList).toBeUndefined();
		});
	});

	describe("capped subscription retries", () => {
		it("stops retrying grid-targets after 5 attempts and surfaces connectionFailed", async () => {
			vi.useFakeTimers();
			try {
				const subscribeMock = vi
					.fn()
					.mockImplementation((_cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_grid_targets") {
							return Promise.reject(new Error("unknown command"));
						}
						return Promise.resolve(vi.fn());
					});
				ctrl.hass = {
					callWS: vi.fn(),
					connection: { subscribeMessage: subscribeMock },
				};

				ctrl.subscribeTargets("aa");
				await vi.advanceTimersByTimeAsync(0);
				// Drive well past 5 retry windows.
				for (let i = 0; i < 8; i++) {
					await vi.advanceTimersByTimeAsync(2000);
				}

				const gridSubs = subscribeMock.mock.calls.filter(
					(c: any[]) => c[1]?.type === "eppgrid/subscribe_grid_targets",
				);
				expect(gridSubs).toHaveLength(5);
				expect(ctrl.connectionFailed).toBe(true);
				expect((ctrl as any)._targetRetryTimer).toBeUndefined();
			} finally {
				vi.useRealTimers();
			}
		});

		it("retries the raw-targets subscription after a transient failure", async () => {
			vi.useFakeTimers();
			try {
				const unsub = vi.fn();
				const subscribeMock = vi
					.fn()
					.mockRejectedValueOnce(new Error("unknown command"))
					.mockResolvedValueOnce(unsub);
				ctrl.hass = {
					callWS: vi.fn(),
					connection: { subscribeMessage: subscribeMock },
				};

				ctrl.subscribeDisplay("aa");
				await vi.advanceTimersByTimeAsync(0);
				await vi.advanceTimersByTimeAsync(2000);

				expect(subscribeMock).toHaveBeenCalledTimes(2);
				expect((ctrl as any)._unsubDisplay).toBe(unsub);
				expect(ctrl.connectionFailed).toBe(false);
			} finally {
				vi.useRealTimers();
			}
		});

		it("stops retrying raw-targets after 5 attempts and surfaces connectionFailed", async () => {
			vi.useFakeTimers();
			try {
				const subscribeMock = vi
					.fn()
					.mockRejectedValue(new Error("unknown command"));
				ctrl.hass = {
					callWS: vi.fn(),
					connection: { subscribeMessage: subscribeMock },
				};

				ctrl.subscribeDisplay("aa");
				await vi.advanceTimersByTimeAsync(0);
				for (let i = 0; i < 8; i++) {
					await vi.advanceTimersByTimeAsync(2000);
				}

				expect(subscribeMock).toHaveBeenCalledTimes(5);
				expect(ctrl.connectionFailed).toBe(true);
			} finally {
				vi.useRealTimers();
			}
		});

		it("does not retry raw-targets after unsubscribeDisplay", async () => {
			vi.useFakeTimers();
			try {
				const subscribeMock = vi
					.fn()
					.mockRejectedValue(new Error("unknown command"));
				ctrl.hass = {
					callWS: vi.fn(),
					connection: { subscribeMessage: subscribeMock },
				};

				ctrl.subscribeDisplay("aa");
				await vi.advanceTimersByTimeAsync(0);
				ctrl.unsubscribeDisplay();
				for (let i = 0; i < 3; i++) {
					await vi.advanceTimersByTimeAsync(2000);
				}

				expect(subscribeMock).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("device session generation token", () => {
		// The ESP32 backend has only a handful of API connection slots and
		// refcounts `subscribe_device` sessions — a leaked subscription holds
		// a slot until the browser websocket closes. These tests pin the
		// in-flight-subscribe races that used to leak.

		function pendingDeviceSubHass() {
			let resolveSub!: (unsub: () => void) => void;
			const subscribeMock = vi.fn().mockImplementation((_cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device") {
					return new Promise<() => void>((resolve) => {
						resolveSub = resolve;
					});
				}
				return Promise.resolve(vi.fn());
			});
			const hass = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: { subscribeMessage: subscribeMock },
			};
			return {
				hass,
				subscribeMock,
				resolveSub: (fn: () => void) => resolveSub(fn),
			};
		}

		it("immediately unsubscribes a late subscribe_device resolution after hostDisconnected", async () => {
			// Subscribe in flight → host disconnects → subscribe resolves.
			// Without a generation token the unsub is stashed on the dead
			// controller and the server-side session leaks.
			const { hass, resolveSub } = pendingDeviceSubHass();
			const unsubFn = vi.fn();
			ctrl.hass = hass;

			const p = ctrl.openDeviceSession("aa");
			ctrl.hostDisconnected();
			resolveSub(unsubFn);
			await p;

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("immediately unsubscribes a late subscribe_device resolution after closeDeviceSession", async () => {
			const { hass, resolveSub } = pendingDeviceSubHass();
			const unsubFn = vi.fn();
			ctrl.hass = hass;

			const p = ctrl.openDeviceSession("aa");
			ctrl.closeDeviceSession();
			resolveSub(unsubFn);
			await p;

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("immediately unsubscribes a late subscribe_device resolution after a connection swap", async () => {
			const { hass, resolveSub } = pendingDeviceSubHass();
			const unsubFn = vi.fn();
			ctrl.hass = hass;

			const p = ctrl.openDeviceSession("aa");
			// Connection swaps before the subscription resolves.
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};
			resolveSub(unsubFn);
			await p;

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("does not subscribe targets when the host disconnects while reopenSession's session-open is in flight", async () => {
			// reopenSession's continuation must not resurrect the full target
			// pipeline (with fresh tokens!) on a controller that has already
			// been torn down.
			const { hass, subscribeMock, resolveSub } = pendingDeviceSubHass();
			ctrl.hass = hass;

			const p = ctrl.reopenSession("aa");
			ctrl.hostDisconnected();
			resolveSub(vi.fn());
			await p;

			const targetSubs = subscribeMock.mock.calls.filter(
				(c: any[]) =>
					c[1]?.type === "eppgrid/subscribe_grid_targets" ||
					c[1]?.type === "eppgrid/subscribe_raw_targets",
			);
			expect(targetSubs).toHaveLength(0);
		});

		it("does not open a session when the host disconnects while a different-mac reopen is queued", async () => {
			// reopenSession("bb") queues behind an in-flight reopen for "aa"
			// (`await inFlight.promise`); hostDisconnected lands while it
			// waits. A generation check can't catch this: the queued
			// continuation runs openDeviceSession, which mints itself a
			// fresh, current token — the bumps that happened while it was
			// queued are invisible to it. Without a disposed flag it opens a
			// brand-new session on the dead controller that nothing will
			// ever close.
			let resolveAa!: (unsub: () => void) => void;
			const subscribeMock = vi.fn().mockImplementation((_cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device" && msg.mac === "aa") {
					return new Promise<() => void>((resolve) => {
						resolveAa = resolve;
					});
				}
				return Promise.resolve(vi.fn());
			});
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: { subscribeMessage: subscribeMock },
			};

			const p1 = ctrl.reopenSession("aa");
			const p2 = ctrl.reopenSession("bb"); // queued behind "aa"
			ctrl.hostDisconnected();
			resolveAa(vi.fn());
			await Promise.all([p1, p2]);

			const deviceSubMacs = subscribeMock.mock.calls
				.filter((c: any[]) => c[1]?.type === "eppgrid/subscribe_device")
				.map((c: any[]) => c[1].mac);
			expect(deviceSubMacs).not.toContain("bb");
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("does not open a session when the host disconnects while a different-mac config load is queued", async () => {
			// Same race via loadDeviceConfig's queue await: the queued "bb"
			// load resumes after hostDisconnected, snapshots a token that is
			// current by construction, and would reopen a session on the
			// dead controller.
			let resolveConfigAa!: (v: any) => void;
			const callWS = vi.fn().mockImplementation((req: any) => {
				if (req.type === "eppgrid/get_config" && req.mac === "aa") {
					return new Promise((resolve) => {
						resolveConfigAa = resolve;
					});
				}
				return Promise.resolve({ config: {} });
			});
			const subscribeMock = vi.fn().mockResolvedValue(vi.fn());
			ctrl.hass = { callWS, connection: { subscribeMessage: subscribeMock } };

			const p1 = ctrl.loadDeviceConfig("aa");
			const p2 = ctrl.loadDeviceConfig("bb"); // queued behind "aa"
			ctrl.hostDisconnected();
			resolveConfigAa({ config: {} });
			await Promise.all([p1, p2]);

			const deviceSubs = subscribeMock.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(deviceSubs).toHaveLength(0);
			expect(ctrl.hasDeviceSession).toBe(false);
		});

		it("a queued reopen proceeds when the host reconnects before the queue releases", async () => {
			// The disposed flag must be an intent flag, not a one-way latch:
			// HA re-attaches the same panel element on suspend/restore, so a
			// hostDisconnected→hostConnected cycle while a reopen is queued
			// must let the queued continuation open its session normally.
			let resolveAa!: (unsub: () => void) => void;
			const subscribeMock = vi.fn().mockImplementation((_cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device" && msg.mac === "aa") {
					return new Promise<() => void>((resolve) => {
						resolveAa = resolve;
					});
				}
				return Promise.resolve(vi.fn());
			});
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: { subscribeMessage: subscribeMock },
			};

			const p1 = ctrl.reopenSession("aa");
			const p2 = ctrl.reopenSession("bb"); // queued behind "aa"
			ctrl.hostDisconnected();
			ctrl.hostConnected();
			resolveAa(vi.fn());
			await Promise.all([p1, p2]);

			const deviceSubMacs = subscribeMock.mock.calls
				.filter((c: any[]) => c[1]?.type === "eppgrid/subscribe_device")
				.map((c: any[]) => c[1].mac);
			expect(deviceSubMacs).toContain("bb");
			expect(ctrl.hasDeviceSession).toBe(true);
		});

		it("does not reopen the session when the host disconnects while loadDeviceConfig's fetch is in flight", async () => {
			// hostDisconnected lands while get_config is pending. Resuming the
			// pipeline afterwards would open a brand-new session (fresh token)
			// that nothing will ever close.
			let resolveConfig!: (v: any) => void;
			const callWS = vi.fn().mockImplementation((req: any) => {
				if (req.type === "eppgrid/get_config") {
					return new Promise((resolve) => {
						resolveConfig = resolve;
					});
				}
				return Promise.resolve({});
			});
			const subscribeMock = vi.fn().mockResolvedValue(vi.fn());
			ctrl.hass = { callWS, connection: { subscribeMessage: subscribeMock } };

			const p = ctrl.loadDeviceConfig("aa");
			ctrl.hostDisconnected();
			resolveConfig({ config: { foo: "bar" } });
			await p;

			const deviceSubs = subscribeMock.mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			);
			expect(deviceSubs).toHaveLength(0);
		});
	});

	describe("_applyDeviceList defensive handling", () => {
		it("does not crash and treats it as empty list when devices field is missing", async () => {
			// The backend's subscribe_device_list push could omit `devices`
			// during a transient marshal failure. Without a default, the
			// `.sort` call on undefined throws and tears down the
			// subscription callback.
			let capturedCb: ((msg: any) => void) | null = null;
			ctrl.hass = {
				callWS: vi.fn(),
				connection: {
					subscribeMessage: vi.fn((cb: any) => {
						capturedCb = cb;
						return Promise.resolve(() => {});
					}),
				},
			};
			await ctrl.subscribeDeviceList();

			expect(() => capturedCb!({})).not.toThrow();
			expect(ctrl.devices).toEqual([]);
		});

		it("does not mutate the backend-supplied devices array", () => {
			// The connection layer caches the last push and re-fires it on
			// reconnect. If we sort in place, subsequent re-pushes show up
			// already sorted, masking ordering bugs and (worse) accumulating
			// any prior in-place mutations.
			const incoming: DeviceInfo[] = [
				makeDevice("zz", true),
				makeDevice("aa", true),
			];
			incoming[0].name = "Zed";
			incoming[1].name = "Alpha";
			const snapshot = [...incoming];

			(ctrl as any)._applyDeviceList(incoming);

			expect(incoming).toEqual(snapshot);
			expect(ctrl.devices.map((d) => d.name)).toEqual(["Alpha", "Zed"]);
		});
	});

	describe("loadDevices defensive handling", () => {
		it("does not mutate the backend-supplied devices array", async () => {
			const incoming: DeviceInfo[] = [
				makeDevice("zz", true),
				makeDevice("aa", true),
			];
			incoming[0].name = "Zed";
			incoming[1].name = "Alpha";
			const snapshot = [...incoming];

			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ devices: incoming }),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();

			expect(incoming).toEqual(snapshot);
		});
	});

	describe("_applyDeviceList seeds selectedMac from localStorage on empty list", () => {
		it("seeds selectedMac from localStorage when an empty list arrives with no prior selection", () => {
			// Scenario: HA restart, panel mounts with _selectedMac="" but
			// localStorage still has the user's previous choice. First
			// subscribe push arrives empty (integration still booting).
			// Without the seed, the render falls through to the "no devices"
			// placeholder; with it, the offline banner is shown instead and
			// the persisted selection survives the reconnect window.
			localStorage.setItem("epp_selected_mac", "aa");
			expect(ctrl.selectedMac).toBe("");

			(ctrl as any)._applyDeviceList([]);

			expect(ctrl.selectedMac).toBe("aa");
		});

		it("does not overwrite an already-set selectedMac on empty list", () => {
			localStorage.setItem("epp_selected_mac", "bb");
			ctrl.selectedMac = "aa";

			(ctrl as any)._applyDeviceList([]);

			// Empty list is ambiguous; preserve whatever selection we had.
			expect(ctrl.selectedMac).toBe("aa");
		});
	});
});
