import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TargetData } from "../../controllers/device-controller.js";
import { DeviceController } from "../../controllers/device-controller.js";
import type { DeviceInfo, RawTarget } from "../../types.js";

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
			expect(ctrl.loading).toBe(true);
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
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
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
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
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
				},
				{
					mac: "aa",
					name: "Alpha",
					host: null,
					available: true,
					configured: true,
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

		it("calls host.requestUpdate after loading", async () => {
			const devices: DeviceInfo[] = [
				{ mac: "aa", name: "A", host: null, available: true, configured: true },
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});
	});

	// --- loadDeviceConfig ---
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
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub1) },
			};
			await ctrl.openDeviceSession("aa");

			const unsub2 = vi.fn();
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(unsub2) },
			};
			await ctrl.openDeviceSession("bb");

			expect(unsub1).toHaveBeenCalled();
			expect(ctrl.hasDeviceSession).toBe(true);
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
				targets: [{ x: 100, y: 200, speed: 0, status: "active", signal: 50 }],
				sensors: {
					occupancy: true,
					static_presence: false,
					motion_presence: false,
					target_presence: false,
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
					illuminance: null,
					temperature: null,
					humidity: null,
					co2: null,
				},
				zones: null,
			});
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
	});

	// --- hass getter/setter ---
	describe("hass", () => {
		it("stores and returns the hass reference", () => {
			const h = mockHass();
			ctrl.hass = h;
			expect(ctrl.hass).toBe(h);
		});
	});
});
