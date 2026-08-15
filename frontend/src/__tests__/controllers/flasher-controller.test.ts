import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlasherController } from "../../controllers/flasher-controller.js";
import type { FlashableDevice } from "../../types.js";

function mockHost() {
	return {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

function mockHass(devices: FlashableDevice[] = []) {
	return {
		callWS: vi.fn().mockResolvedValue({ devices }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
}

describe("FlasherController", () => {
	let host: ReturnType<typeof mockHost>;
	let hass: ReturnType<typeof mockHass>;
	let ctrl: FlasherController;

	beforeEach(() => {
		host = mockHost();
		hass = mockHass();
		ctrl = new FlasherController(host);
		ctrl.hass = hass;
	});

	// --- Construction ---
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("initializes with empty state", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.flashableDevices).toEqual([]);
			expect(freshCtrl.loading).toBe(true);
		});

		it("initializes USB state fields to defaults", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.usbConnected).toBe(false);
			expect(freshCtrl.usbDeviceMac).toBeNull();
			expect(freshCtrl.usbExistingDevice).toBeNull();
		});

		it("opRunning defaults to false", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.opRunning).toBe(false);
		});
	});

	// --- Lifecycle ---
	describe("hostDisconnected", () => {
		it("does not throw when called", () => {
			expect(() => ctrl.hostDisconnected()).not.toThrow();
		});
	});

	// --- loadDevices ---
	describe("loadDevices", () => {
		it("calls eppgrid/list_flashable_devices", async () => {
			await ctrl.loadDevices();
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/list_flashable_devices",
			});
		});

		it("sets flashableDevices from response", async () => {
			const devices: FlashableDevice[] = [
				{
					mac: "aa:bb:cc:dd:ee:ff",
					name: "Sensor A",
					host: "192.168.1.10",
					available: true,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-123",
					update_available: false,
					firmware_status: "compatible",
				},
			];
			ctrl.hass = mockHass(devices);
			await ctrl.loadDevices();
			expect(ctrl.flashableDevices).toEqual(devices);
		});

		it("sets loading=false after successful load", async () => {
			await ctrl.loadDevices();
			expect(ctrl.loading).toBe(false);
		});

		it("calls host.requestUpdate after loading", async () => {
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("handles WS error gracefully — sets empty array and loading=false", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("ws error")),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.flashableDevices).toEqual([]);
			expect(ctrl.loading).toBe(false);
		});

		it("calls host.requestUpdate on error", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockRejectedValue(new Error("ws error")),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("sets loading=false and returns when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.loadDevices();
			expect(ctrl.loading).toBe(false);
		});

		it("stores firmwareBaseUrl from response", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({
					devices: [],
					firmware_base_url: "https://example.com/fw",
				}),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.firmwareBaseUrl).toBe("https://example.com/fw");
		});

		it("defaults firmwareBaseUrl to empty string when not in response", async () => {
			ctrl.hass = {
				callWS: vi.fn().mockResolvedValue({ devices: [] }),
				connection: { subscribeMessage: vi.fn() },
			};
			await ctrl.loadDevices();
			expect(ctrl.firmwareBaseUrl).toBe("");
		});

		it("accepts same-origin relative paths and http(s) URLs", async () => {
			for (const ok of [
				"/api/eppgrid/firmware",
				"/api/fw",
				"https://example.com/fw",
				"http://homeassistant.local:8123/api/eppgrid/firmware",
			]) {
				ctrl.hass = {
					callWS: vi
						.fn()
						.mockResolvedValue({ devices: [], firmware_base_url: ok }),
					connection: { subscribeMessage: vi.fn() },
				};
				await ctrl.loadDevices();
				expect(ctrl.firmwareBaseUrl).toBe(ok);
			}
		});

		it("rejects unsafe firmwareBaseUrl values", async () => {
			for (const bad of [
				"javascript:alert(1)",
				"data:text/html,<script>alert(1)</script>",
				"file:///etc/passwd",
				"vbscript:msgbox(1)",
				"//evil.example.com/fw",
				"not a url",
				42,
				null,
			]) {
				ctrl.hass = {
					callWS: vi
						.fn()
						.mockResolvedValue({ devices: [], firmware_base_url: bad }),
					connection: { subscribeMessage: vi.fn() },
				};
				await ctrl.loadDevices();
				expect(ctrl.firmwareBaseUrl).toBe("");
			}
		});
	});

	// --- subscribeDeviceList ---
	describe("subscribeDeviceList", () => {
		it("subscribes to eppgrid/subscribe_flashable_devices", async () => {
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(vi.fn());
			await ctrl.subscribeDeviceList();
			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_flashable_devices" },
			);
		});

		it("applies device list from subscription callback", async () => {
			const devices: FlashableDevice[] = [
				{
					mac: "aa:bb:cc:dd:ee:ff",
					name: "Sensor A",
					host: "192.168.1.10",
					available: true,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-123",
					update_available: false,
					firmware_status: "compatible",
				},
			];
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: any) => {
					cb({
						devices,
						firmware_base_url: "https://example.com/fw",
						latest_firmware_version: "2.0",
					});
					return Promise.resolve(vi.fn());
				});
			await ctrl.subscribeDeviceList();
			expect(ctrl.flashableDevices).toEqual(devices);
			expect(ctrl.firmwareBaseUrl).toBe("https://example.com/fw");
			expect(ctrl.firmwareVersion).toBe("2.0");
			expect(ctrl.loading).toBe(false);
		});

		it("fires onDeviceListChanged callback", async () => {
			const cb = vi.fn();
			ctrl.onDeviceListChanged = cb;
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((msgCb: any) => {
					msgCb({ devices: [] });
					return Promise.resolve(vi.fn());
				});
			await ctrl.subscribeDeviceList();
			expect(cb).toHaveBeenCalled();
		});

		it("falls back to loadDevices on subscription error", async () => {
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("fail"));
			const loadSpy = vi.spyOn(ctrl, "loadDevices");
			await ctrl.subscribeDeviceList();
			expect(loadSpy).toHaveBeenCalled();
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await ctrl.subscribeDeviceList();
			// No error thrown, no subscription
		});

		it("unsubscribes previous subscription before resubscribing", async () => {
			const unsub1 = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub1);
			await ctrl.subscribeDeviceList();

			const unsub2 = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub2);
			await ctrl.subscribeDeviceList();

			expect(unsub1).toHaveBeenCalled();
		});

		it("immediately unsubscribes a late device_list resolution after unsubscribeDeviceList", async () => {
			// Race fix: subscribe → unsubscribe before promise resolves →
			// promise resolves. Without a generation token, the unsub
			// would be stored on a torn-down controller.
			let resolveSub!: (unsub: () => void) => void;
			const unsubFn = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockImplementation(() => {
				return new Promise<() => void>((resolve) => {
					resolveSub = resolve;
				});
			});

			ctrl.subscribeDeviceList();
			ctrl.unsubscribeDeviceList();
			resolveSub(unsubFn);
			await new Promise((r) => setTimeout(r, 0));

			expect(unsubFn).toHaveBeenCalledTimes(1);
			expect((ctrl as any)._unsubDeviceList).toBeUndefined();
		});
	});

	// --- unsubscribeDeviceList ---
	describe("unsubscribeDeviceList", () => {
		it("calls unsub function from subscription", async () => {
			const unsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub);
			await ctrl.subscribeDeviceList();
			ctrl.unsubscribeDeviceList();
			expect(unsub).toHaveBeenCalled();
		});

		it("does not throw when no subscription exists", () => {
			expect(() => ctrl.unsubscribeDeviceList()).not.toThrow();
		});

		it("handles stale subscription gracefully", async () => {
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(() => {
				throw new Error("stale");
			});
			await ctrl.subscribeDeviceList();
			expect(() => ctrl.unsubscribeDeviceList()).not.toThrow();
		});
	});

	// --- hostDisconnected cleans up subscription ---
	describe("hostDisconnected with subscription", () => {
		it("unsubscribes device list on disconnect", async () => {
			const unsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(unsub);
			await ctrl.subscribeDeviceList();
			ctrl.hostDisconnected();
			expect(unsub).toHaveBeenCalled();
		});
	});

	// --- deleteEsphomeDevice ---
	describe("deleteEsphomeDevice", () => {
		it("calls eppgrid/delete_esphome_device with config_entry_id", async () => {
			await ctrl.deleteEsphomeDevice("entry-abc");
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/delete_esphome_device",
				config_entry_id: "entry-abc",
			});
		});

		it("does nothing when hass is null", async () => {
			ctrl.hass = null;
			await expect(
				ctrl.deleteEsphomeDevice("entry-abc"),
			).resolves.toBeUndefined();
			expect(hass.callWS).not.toHaveBeenCalled();
		});
	});

	// --- addEsphomeDevice ---
	describe("addEsphomeDevice", () => {
		it("calls eppgrid/add_esphome_device with host and returns the WS response", async () => {
			(hass.callWS as ReturnType<typeof vi.fn>).mockResolvedValue({
				type: "added",
			});
			const result = await ctrl.addEsphomeDevice("192.168.1.10");
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/add_esphome_device",
				host: "192.168.1.10",
			});
			expect(result).toEqual({ type: "added" });
		});

		it("passes through already_added, needs_auth, cannot_connect, failed results", async () => {
			for (const outcome of [
				{ type: "already_added" },
				{ type: "needs_auth" },
				{ type: "cannot_connect" },
				{ type: "failed", reason: "invalid_auth" },
			]) {
				(hass.callWS as ReturnType<typeof vi.fn>).mockResolvedValue(outcome);
				const result = await ctrl.addEsphomeDevice("192.168.1.10");
				expect(result).toEqual(outcome);
			}
		});

		it("returns failed/no_hass when hass is null", async () => {
			ctrl.hass = null;
			const result = await ctrl.addEsphomeDevice("192.168.1.10");
			expect(result).toEqual({ type: "failed", reason: "no_hass" });
			expect(hass.callWS).not.toHaveBeenCalled();
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

	// --- USB Flash State ---
	describe("USB flash state", () => {
		it("initializes usbFlashState to null", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.usbFlashState).toBeNull();
		});

		it("initializes wifiNetworks to empty array", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.wifiNetworks).toEqual([]);
		});

		it("initializes serialPort to null", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.serialPort).toBeNull();
		});
	});

	// --- serialPort getter/setter ---
	describe("serialPort", () => {
		it("stores a port via setter and retrieves it via getter", () => {
			const mockPort = {
				open: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as SerialPort;

			ctrl.serialPort = mockPort;
			expect(ctrl.serialPort).toBe(mockPort);
		});

		it("returns null when no port has been set", () => {
			const freshHost = mockHost();
			const freshCtrl = new FlasherController(freshHost);
			expect(freshCtrl.serialPort).toBeNull();
		});

		it("can be reset to null after being set", () => {
			const mockPort = {
				open: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as SerialPort;

			ctrl.serialPort = mockPort;
			ctrl.serialPort = null;
			expect(ctrl.serialPort).toBeNull();
		});
	});

	describe("updateUsbState", () => {
		it("sets usbFlashState and requests update", () => {
			ctrl.updateUsbState({ step: "flashing", progress: 42 });
			expect(ctrl.usbFlashState).toEqual({ step: "flashing", progress: 42 });
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("merges partial state updates", () => {
			ctrl.updateUsbState({ step: "flashing", progress: 0 });
			ctrl.updateUsbState({ step: "flashing", progress: 75 });
			expect(ctrl.usbFlashState).toEqual({ step: "flashing", progress: 75 });
		});
	});

	describe("resetUsbState", () => {
		it("clears USB flash state", async () => {
			ctrl.updateUsbState({ step: "flashing" });
			await ctrl.resetUsbState();
			expect(ctrl.usbFlashState).toBeNull();
			expect(ctrl.wifiNetworks).toEqual([]);
		});

		it("increments opId", () => {
			const before = ctrl.opId;
			ctrl.resetUsbState();
			expect(ctrl.opId).toBe(before + 1);
		});

		it("clears serialPort", () => {
			ctrl.serialPort = { close: vi.fn().mockResolvedValue(undefined) } as any;
			ctrl.resetUsbState();
			expect(ctrl.serialPort).toBeNull();
		});

		it("closes an open serial port and releases its locks", async () => {
			// The panel's tab-bar buttons call resetUsbState directly when the
			// user switches tabs mid-flash. Without close() the OS keeps the
			// port open and unreachable until the page reloads.
			const reader = { releaseLock: vi.fn() };
			const writer = { releaseLock: vi.fn() };
			const port = { close: vi.fn().mockResolvedValue(undefined) };
			(ctrl as any)._flow._serialReader = reader;
			(ctrl as any)._flow._serialWriter = writer;
			ctrl.serialPort = port as any;

			await ctrl.resetUsbState();

			expect(reader.releaseLock).toHaveBeenCalled();
			expect(writer.releaseLock).toHaveBeenCalled();
			expect(port.close).toHaveBeenCalledTimes(1);
			expect(ctrl.serialPort).toBeNull();
			expect((ctrl as any)._flow._serialReader).toBeNull();
			expect((ctrl as any)._flow._serialWriter).toBeNull();
		});

		it("awaits port.close before resolving", async () => {
			let resolveClose!: () => void;
			const port = {
				close: vi.fn().mockReturnValue(
					new Promise<void>((r) => {
						resolveClose = r;
					}),
				),
			};
			ctrl.serialPort = port as any;

			let settled = false;
			const p = ctrl.resetUsbState().then(() => {
				settled = true;
			});
			await new Promise((r) => setTimeout(r, 0));
			expect(settled).toBe(false);

			resolveClose();
			await p;
			expect(settled).toBe(true);
		});

		it("aborts an in-flight wifi check and closes the port only after it settles", async () => {
			// Mirrors the panel's flasher-cancel teardown: abort the
			// queryImprovState poll, wait for it to settle (so its reader
			// lock is released), THEN close the port — close() rejects while
			// a lock is still held, leaving the port half-open.
			const abort = { abort: vi.fn() };
			let settleWifi!: () => void;
			const wifiPromise = new Promise<void>((r) => {
				settleWifi = r;
			});
			(ctrl as any)._flow._wifiCheckAbort = abort;
			(ctrl as any)._flow._wifiCheckPromise = wifiPromise;
			const port = { close: vi.fn().mockResolvedValue(undefined) };
			ctrl.serialPort = port as any;

			const p = ctrl.resetUsbState();
			expect(abort.abort).toHaveBeenCalledTimes(1);
			expect(port.close).not.toHaveBeenCalled();

			settleWifi();
			await p;

			expect(port.close).toHaveBeenCalledTimes(1);
			expect((ctrl as any)._flow._wifiCheckAbort).toBeNull();
			expect((ctrl as any)._flow._wifiCheckPromise).toBeNull();
		});

		it("defers the usbFlashState clear until the port teardown resolves (cancelling feedback)", async () => {
			// epp-flasher-view keeps its "Cancelling…" button up only while
			// usbFlashState is non-null. Clearing it before close() resolves
			// re-renders the variant picker while the port is still unwinding
			// (~1-2s), making the cancel click look like it skipped a step.
			ctrl.updateUsbState({ step: "wifi_check" });
			let resolveClose!: () => void;
			const port = {
				close: vi.fn().mockReturnValue(
					new Promise<void>((r) => {
						resolveClose = r;
					}),
				),
			};
			ctrl.serialPort = port as any;

			const p = ctrl.resetUsbState();
			await new Promise((r) => setTimeout(r, 0));
			expect(ctrl.usbFlashState).toEqual({ step: "wifi_check" });

			resolveClose();
			await p;
			expect(ctrl.usbFlashState).toBeNull();
		});

		it("keeps usbFlashState non-null while an aborted in-flight wifi check settles", async () => {
			ctrl.updateUsbState({ step: "wifi_check" });
			let settleWifi!: () => void;
			(ctrl as any)._flow._wifiCheckAbort = { abort: vi.fn() };
			(ctrl as any)._flow._wifiCheckPromise = new Promise<void>((r) => {
				settleWifi = r;
			});
			ctrl.serialPort = {
				close: vi.fn().mockResolvedValue(undefined),
			} as any;

			const p = ctrl.resetUsbState();
			await new Promise((r) => setTimeout(r, 0));
			expect(ctrl.usbFlashState).toEqual({ step: "wifi_check" });

			settleWifi();
			await p;
			expect(ctrl.usbFlashState).toBeNull();
		});

		it("tolerates a rejecting in-flight wifi check", async () => {
			(ctrl as any)._flow._wifiCheckAbort = { abort: vi.fn() };
			(ctrl as any)._flow._wifiCheckPromise = Promise.reject(
				new Error("aborted"),
			);
			const port = { close: vi.fn().mockResolvedValue(undefined) };
			ctrl.serialPort = port as any;

			await ctrl.resetUsbState();

			expect(port.close).toHaveBeenCalledTimes(1);
		});
	});

	describe("hostDisconnected with USB", () => {
		it("closes serial port if open", () => {
			const mockPort = { close: vi.fn().mockResolvedValue(undefined) };
			(ctrl as any)._flow._serialPort = mockPort;
			ctrl.hostDisconnected();
			expect(mockPort.close).toHaveBeenCalled();
		});

		it("releases reader/writer locks before closing the port", () => {
			// Web Serial close() rejects with "the port has a readable or
			// writable stream" if a reader/writer lock is still held. Fail
			// to release them in hostDisconnected and the port stays open
			// across panel reloads, blocking the next flash attempt.
			const reader = { releaseLock: vi.fn() };
			const writer = { releaseLock: vi.fn() };
			const port = { close: vi.fn().mockResolvedValue(undefined) };
			(ctrl as any)._flow._serialReader = reader;
			(ctrl as any)._flow._serialWriter = writer;
			(ctrl as any)._flow._serialPort = port;

			ctrl.hostDisconnected();

			expect(reader.releaseLock).toHaveBeenCalled();
			expect(writer.releaseLock).toHaveBeenCalled();
			expect(port.close).toHaveBeenCalled();
		});
	});

	// --- OTA state management ---
	describe("OTA state management", () => {
		let host: ReturnType<typeof mockHost>;
		let hass: ReturnType<typeof mockHass>;
		let ctrl: FlasherController;

		beforeEach(() => {
			host = mockHost();
			hass = mockHass();
			ctrl = new FlasherController(host);
			ctrl.hass = hass;
		});

		it("initializes with empty otaStates", () => {
			expect(ctrl.otaStates).toEqual({});
		});

		it("startOta sets updating state and calls update_firmware", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "updating",
				progress: 0,
				errorKey: null,
			});
			expect(hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/update_firmware",
				mac: "AA:BB:CC:DD:EE:01",
			});
		});

		it("startOta subscribes to ota progress", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(hass.connection.subscribeMessage).toHaveBeenCalledWith(
				expect.any(Function),
				{ type: "eppgrid/subscribe_ota_progress", mac: "AA:BB:CC:DD:EE:01" },
			);
		});

		it("startOtaAll starts an OTA for each mac", () => {
			const spy = vi.spyOn(ctrl, "startOta").mockResolvedValue(undefined);

			ctrl.startOtaAll(["AA:BB:CC:DD:EE:01", "AA:BB:CC:DD:EE:02"]);

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:01");
			expect(spy).toHaveBeenCalledWith("AA:BB:CC:DD:EE:02");
		});

		it("startOtaAll with an empty list starts nothing", () => {
			const spy = vi.spyOn(ctrl, "startOta").mockResolvedValue(undefined);

			ctrl.startOtaAll([]);

			expect(spy).not.toHaveBeenCalled();
		});

		it("updates progress on subscription events", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 65 });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "updating",
				progress: 65,
				errorKey: null,
			});
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("stays updating through the reboot window after progress (no premature connection_lost)", async () => {
			// After the download the device reboots into the new firmware and its
			// API connection goes silent for the reboot window. The backend
			// confirms success off the durable firmware-version signal once the
			// device returns, so the panel must NOT declare connection_lost during
			// that silence — the old 10s watchdog is what made a successful update
			// read as "failed".
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 50 });

			vi.advanceTimersByTime(10000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
			vi.useRealTimers();
		});

		it("honors a late backend success after the reboot window", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 50 });
			// The reboot takes a while; the connection is silent, then the backend
			// reports success once the device returns on the new version.
			vi.advanceTimersByTime(45000);
			callback({ state: "success", version: "0.90.0-alpha" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
			vi.useRealTimers();
		});

		it("transitions to error on timeout when progress stopped mid-update", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 50 });

			// Only after the full reboot-grace window (the device never came back)
			// does the panel give up with connection_lost.
			vi.advanceTimersByTime(180000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.connection_lost",
			});
			vi.useRealTimers();
		});

		it("transitions to error on timeout when no progress was received", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			// No events arrive — initial timeout fires after 15s
			vi.advanceTimersByTime(15000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.update_timeout",
			});
			vi.useRealTimers();
		});

		it("transitions to success state", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success", version: "0.90.0-alpha" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
		});

		it("uses event.error_key from backend if present", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({
				state: "error",
				error_key: "flasher.errors.ota_failed_version_unchanged",
			});

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.ota_failed_version_unchanged",
			});
		});

		it("falls back to update_failed_generic when no error_key", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "error" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.update_failed_generic",
			});
		});

		it("dismissOtaError clears state for a device", () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.connection_lost",
			};
			ctrl.dismissOtaError("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("sets error when update_firmware call fails", async () => {
			hass.callWS = vi.fn().mockRejectedValue(new Error("Device offline"));

			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.start_failed",
			});
		});

		it("maps firmware_not_published WS error to its specific error key", async () => {
			// The backend bails out fast (no 180s spin) when the pinned-version
			// firmware manifest isn't published yet, raising a HomeAssistantError
			// whose translation_key the WS layer forwards as `error.translation_key`.
			// Surface the accurate "still being published" copy instead of the
			// generic "is the device online?" message.
			hass.callWS = vi.fn().mockRejectedValue({
				code: "update_failed",
				message: "Firmware 1.1.0 is not available to download yet",
				translation_key: "firmware_not_published",
			});

			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.firmware_not_published",
			});
		});

		it("sets error when subscription fails after update_firmware succeeds", async () => {
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("sub failed"));

			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.connect_failed",
			});
		});

		it("error event with no message uses update_failed_generic key", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "error" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.update_failed_generic",
			});
		});

		it("_otaSuccess auto-dismisses after 5 seconds", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success" });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");

			vi.advanceTimersByTime(5000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			expect(host.requestUpdate).toHaveBeenCalled();
			vi.useRealTimers();
		});

		it("_otaSuccess auto-dismiss does not delete if state changed", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success" });

			// Manually change state before timeout fires
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 0,
				errorKey: null,
			};

			vi.advanceTimersByTime(5000);

			// Should NOT have been deleted because state is no longer "success"
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeDefined();
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
			vi.useRealTimers();
		});

		it("progress >= 100 triggers _otaSuccess", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 100 });

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
		});

		it("updating event with progress=0 uses 15s timeout", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 0 });

			// After 10s, should still be updating (15s timeout)
			vi.advanceTimersByTime(10000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");

			// After 15s total, should have timed out
			vi.advanceTimersByTime(5000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].errorKey).toBe(
				"flasher.errors.update_timeout",
			);
			vi.useRealTimers();
		});

		it("updating event with progress > 0 waits the reboot-grace window before connection_lost", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 25 });

			// Still waiting just before the grace window elapses (the device is
			// rebooting into the new firmware) — no premature failure.
			vi.advanceTimersByTime(179000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");

			// Only once the full window passes with no terminal event does it give up.
			vi.advanceTimersByTime(1000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].errorKey).toBe(
				"flasher.errors.connection_lost",
			);
			vi.useRealTimers();
		});

		it("timeout does not fire if state is no longer updating", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 50 });

			// Manually change state before timeout
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "success",
				progress: null,
				errorKey: null,
			};

			vi.advanceTimersByTime(10000);

			// Should still be success, not error
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");
			vi.useRealTimers();
		});

		it("_checkOtaDevicesOffline sets error when device goes offline during OTA", async () => {
			// Start OTA
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			// Directly set updating state
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 50,
				errorKey: null,
			};

			// Simulate device going offline via _applyDeviceList
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: false,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: true,
					firmware_status: "firmware_behind",
				},
			];

			// Call _checkOtaDevicesOffline directly
			(ctrl as any)._checkOtaDevicesOffline();

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.device_offline",
			});
		});

		it("_checkOtaDevicesOffline skips devices not in updating state", () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.connection_lost",
			};
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: false,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: false,
					firmware_status: "compatible",
				},
			];

			(ctrl as any)._checkOtaDevicesOffline();

			// Should NOT have changed
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].errorKey).toBe(
				"flasher.errors.connection_lost",
			);
		});

		it("_checkOtaDevicesOffline skips available devices", () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 50,
				errorKey: null,
			};
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: true,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: true,
					firmware_status: "firmware_behind",
				},
			];

			(ctrl as any)._checkOtaDevicesOffline();

			// Should still be updating
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
		});

		it("_checkOtaDevicesOffline ignores offline during the pre-OTA reboot (no progress yet)", () => {
			// startOta optimistically sets state "updating" / progress 0 on click,
			// then the backend reboots the device to free heap for the TLS
			// handshake BEFORE the download starts. During that reboot the device
			// is briefly unavailable, but no real OTA progress has arrived yet —
			// so this offline is the EXPECTED reboot, not a failure, and must not
			// be reported as "device went offline during update". (The offline
			// check predates the pre-OTA reboot feature and never accounted for it.)
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 0,
				errorKey: null,
			};
			ctrl.flashableDevices = [
				{
					mac: "AA:BB:CC:DD:EE:01",
					name: "Test",
					host: "192.168.1.10",
					available: false,
					firmware_type: "eppgrid",
					firmware_version: "1.0.0",
					esphome_config_entry_id: "entry-1",
					update_available: true,
					firmware_status: "firmware_behind",
				},
			];

			(ctrl as any)._checkOtaDevicesOffline();

			// Still updating — the pre-OTA reboot offline must not flip to error.
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].errorKey).toBeNull();
		});

		it("ignores the pre-OTA reboot offline pushed via _applyDeviceList while update_firmware is pending", async () => {
			// End-to-end shape of the reported bug: startOta sets the optimistic
			// {updating, progress:0} synchronously, then awaits update_firmware,
			// which blocks on the backend's pre-OTA reboot. While that call is
			// pending the device reboots and HA pushes a device list with
			// available:false — which must NOT be reported as a failed update.
			let resolveUpdate: () => void = () => {};
			hass.callWS = vi.fn().mockImplementation((msg: { type: string }) =>
				msg.type === "eppgrid/update_firmware"
					? new Promise<void>((r) => {
							resolveUpdate = r;
						})
					: Promise.resolve({ devices: [] }),
			);

			// Fire but don't await — startOta blocks on the pending update_firmware.
			const started = ctrl.startOta("AA:BB:CC:DD:EE:01");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toMatchObject({
				state: "updating",
				progress: 0,
			});

			// Pre-OTA reboot drops the device offline; HA pushes the device list.
			(ctrl as any)._applyDeviceList({
				devices: [
					{
						mac: "AA:BB:CC:DD:EE:01",
						name: "Test",
						host: "192.168.1.10",
						available: false,
						firmware_type: "eppgrid",
						firmware_version: "1.0.0",
						esphome_config_entry_id: "entry-1",
						update_available: true,
						firmware_status: "firmware_behind",
					},
				],
			});

			// The expected reboot offline must not flip the update to error.
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("updating");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].errorKey).toBeNull();

			// Let startOta finish, then clear its progress sub + watchdog timer.
			resolveUpdate();
			await started;
			ctrl.dismissOtaError("AA:BB:CC:DD:EE:01");
		});

		it("connection swap drops stale OTA subscriptions and clears in-flight OTA state", async () => {
			// HA reconnects with a new connection while OTA is in flight.
			// The unsub callback we hold belongs to the dead socket — calling
			// it does nothing useful, and leaving the otaStates entry around
			// makes the UI claim an update is still happening on a freshly
			// reconnected device. Drop the stale state so the user gets a
			// clean slate after the reconnect settles.
			vi.useFakeTimers();
			const oldUnsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(oldUnsub);
			await ctrl.startOta("AA:BB:CC:DD:EE:01");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeDefined();
			expect((ctrl as any)._otaUnsubs["AA:BB:CC:DD:EE:01"]).toBe(oldUnsub);

			// Connection swap — assign a hass with a different connection.
			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};

			expect((ctrl as any)._otaUnsubs["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			expect((ctrl as any)._otaTimeouts["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			vi.useRealTimers();
		});

		it("connection swap drops a stale device-list subscription unsub", async () => {
			const staleUnsub = vi.fn();
			hass.connection.subscribeMessage = vi.fn().mockResolvedValue(staleUnsub);
			await ctrl.subscribeDeviceList();
			expect((ctrl as any)._unsubDeviceList).toBe(staleUnsub);

			ctrl.hass = {
				callWS: vi.fn(),
				connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
			};

			// Synchronous post-swap: the stale unsub is dropped immediately
			// (the resubscribe is async and runs on a microtask).
			expect((ctrl as any)._unsubDeviceList).toBeUndefined();
		});

		it("connection swap auto-resubscribes the device-list on the new connection", async () => {
			// Without resubscribe, the panel stops getting device-list updates
			// until the user navigates away and back. The flasher tab silently
			// goes stale on every HA reconnect — bad UX with no error surface.
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
				type: "eppgrid/subscribe_flashable_devices",
			});
			expect((ctrl as any)._unsubDeviceList).toBe(newUnsub);
			// Stale unsub belongs to the dead socket — must not be invoked.
			expect(staleUnsub).not.toHaveBeenCalled();
		});

		it("connection swap auto-resubscribes even when prior subscribe was still in-flight", async () => {
			// `_unsubDeviceList` is only assigned after `subscribeMessage()`
			// resolves. If a HA reconnect happens while the original subscribe
			// is still pending, gating resubscribe on `_unsubDeviceList`
			// silently misses this race and the panel ends up stale even
			// though the user clearly intended to be subscribed.
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
				type: "eppgrid/subscribe_flashable_devices",
			});
			expect((ctrl as any)._unsubDeviceList).toBe(newUnsub);
		});

		it("connection swap does NOT auto-resubscribe when there was no prior subscription", async () => {
			// If the panel was never listening on the old conn, swapping in a
			// new conn shouldn't kick off a fresh subscription unprompted —
			// `subscribeDeviceList()` is the panel's responsibility on mount.
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

		it("OTA success flow tolerates a throwing unsub callback without leaving state half-done", async () => {
			// _unsubOta historically called the stored callback without
			// try/catch. A stale subscription whose .then() resolved on a
			// dead socket can throw on invoke; in the success path that
			// would abort _otaSuccess before the auto-dismiss timer was
			// scheduled and before _resetOtaTimeout ran, leaving the
			// otaStates entry stuck on "success" forever.
			vi.useFakeTimers();
			const throwingUnsub = vi.fn(() => {
				throw new Error("stale subscription");
			});
			hass.connection.subscribeMessage = vi
				.fn()
				.mockResolvedValue(throwingUnsub);

			await ctrl.startOta("AA:BB:CC:DD:EE:01");
			const callback = hass.connection.subscribeMessage.mock.calls[0][0];

			expect(() => callback({ state: "success" })).not.toThrow();
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("success");

			// Auto-dismiss fires — proves the success path completed
			// past the throwing unsub.
			vi.advanceTimersByTime(5000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			vi.useRealTimers();
		});

		it("hostDisconnected cleans up OTA subscriptions and timeouts", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			ctrl.hostDisconnected();

			expect(ctrl.otaStates).toEqual({});
			vi.useRealTimers();
		});

		it("_applyDeviceList triggers _checkOtaDevicesOffline", async () => {
			ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
				state: "updating",
				progress: 50,
				errorKey: null,
			};

			// Subscribe to device list so _applyDeviceList works
			hass.connection.subscribeMessage = vi
				.fn()
				.mockImplementation((cb: any) => {
					cb({
						devices: [
							{
								mac: "AA:BB:CC:DD:EE:01",
								name: "Test",
								host: "192.168.1.10",
								available: false,
								firmware_type: "eppgrid",
								firmware_version: "1.0.0",
								esphome_config_entry_id: "entry-1",
								update_available: true,
								firmware_status: "firmware_behind",
							},
						],
					});
					return Promise.resolve(vi.fn());
				});

			await ctrl.subscribeDeviceList();

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.device_offline",
			});
		});

		it("unknown event state does not orphan the watchdog timer", async () => {
			// _handleOtaEvent should never leave us in updating state with no
			// armed timeout. If the backend ever sends an unrecognised state
			// (forward compatibility), the watchdog should still be armed so
			// a stuck device doesn't appear as a perpetually-spinning UI.
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: 25 });
			callback({ state: "made_up_state" });

			// Original watchdog should still fire — we're still updating.
			vi.advanceTimersByTime(180000);

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			vi.useRealTimers();
		});

		it("hostDisconnected clears the success-pending auto-dismiss timer", async () => {
			// The 5-second post-success cleanup timeout was previously not
			// tracked in _otaTimeouts. hostDisconnected's per-mac
			// _resetOtaTimeout loop never saw it, so the timer survived the
			// teardown and only fizzled out because otaStates was nulled.
			// A *tracked* timer would be explicitly cleared.
			vi.useFakeTimers();
			const clearSpy = vi.spyOn(globalThis, "clearTimeout");

			await ctrl.startOta("AA:BB:CC:DD:EE:01");
			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "success" });

			const beforeClears = clearSpy.mock.calls.length;
			ctrl.hostDisconnected();
			expect(clearSpy.mock.calls.length).toBeGreaterThan(beforeClears);

			clearSpy.mockRestore();
			vi.useRealTimers();
		});

		it("updating event with null progress uses 15s timeout", async () => {
			vi.useFakeTimers();
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({ state: "updating", progress: null });

			vi.advanceTimersByTime(15000);
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].state).toBe("error");
			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"].errorKey).toBe(
				"flasher.errors.update_timeout",
			);
			vi.useRealTimers();
		});

		// --- otaStates immutability ---
		// The panel binds `.otaStates=${ctrl.otaStates}` on epp-flasher-view.
		// Lit dirty-checks by reference, so in-place mutation of the Record
		// means progress/success/error NEVER repaint unless unrelated hass
		// churn happens to re-render the panel. Every transition must
		// reassign the Record.
		describe("otaStates immutability", () => {
			it("reassigns otaStates when startOta begins", async () => {
				const before = ctrl.otaStates;
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				expect(ctrl.otaStates).not.toBe(before);
			});

			it("reassigns otaStates on a progress event", async () => {
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				const callback = hass.connection.subscribeMessage.mock.calls[0][0];
				const before = ctrl.otaStates;
				callback({ state: "updating", progress: 65 });
				expect(ctrl.otaStates).not.toBe(before);
			});

			it("reassigns otaStates on success and on the auto-dismiss delete", async () => {
				vi.useFakeTimers();
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				const callback = hass.connection.subscribeMessage.mock.calls[0][0];
				const beforeSuccess = ctrl.otaStates;
				callback({ state: "success" });
				expect(ctrl.otaStates).not.toBe(beforeSuccess);

				const beforeDismiss = ctrl.otaStates;
				vi.advanceTimersByTime(5000);
				expect(ctrl.otaStates).not.toBe(beforeDismiss);
				expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
				vi.useRealTimers();
			});

			it("reassigns otaStates on an error event", async () => {
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				const callback = hass.connection.subscribeMessage.mock.calls[0][0];
				const before = ctrl.otaStates;
				callback({ state: "error" });
				expect(ctrl.otaStates).not.toBe(before);
			});

			it("reassigns otaStates on watchdog timeout", async () => {
				vi.useFakeTimers();
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				const before = ctrl.otaStates;
				vi.advanceTimersByTime(15000);
				expect(ctrl.otaStates).not.toBe(before);
				vi.useRealTimers();
			});

			it("reassigns otaStates on dismissOtaError", async () => {
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				const callback = hass.connection.subscribeMessage.mock.calls[0][0];
				callback({ state: "error" });
				const before = ctrl.otaStates;
				ctrl.dismissOtaError("AA:BB:CC:DD:EE:01");
				expect(ctrl.otaStates).not.toBe(before);
				expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			});

			it("reassigns otaStates when a device goes offline mid-OTA", async () => {
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				// Genuine mid-OTA: the device has reported real download progress
				// (progress > 0), so a subsequent offline is a true failure — as
				// opposed to the optimistic progress-0 set on click during the
				// expected pre-OTA reboot.
				ctrl.otaStates["AA:BB:CC:DD:EE:01"] = {
					state: "updating",
					progress: 50,
					errorKey: null,
				};
				ctrl.flashableDevices = [
					{
						mac: "AA:BB:CC:DD:EE:01",
						name: "Test",
						host: "192.168.1.10",
						available: false,
						firmware_type: "eppgrid",
						firmware_version: "1.0.0",
						esphome_config_entry_id: "entry-1",
						update_available: true,
						firmware_status: "firmware_behind",
					},
				];
				const before = ctrl.otaStates;
				(ctrl as any)._checkOtaDevicesOffline();
				expect(ctrl.otaStates).not.toBe(before);
			});
		});

		// --- startOta guards ---
		describe("startOta guards", () => {
			it("two rapid startOta for the same mac issue only one update_firmware call", async () => {
				const p1 = ctrl.startOta("AA:BB:CC:DD:EE:01");
				const p2 = ctrl.startOta("AA:BB:CC:DD:EE:01");
				await Promise.all([p1, p2]);

				expect(
					hass.callWS.mock.calls.filter(
						(c: any[]) => c[0].type === "eppgrid/update_firmware",
					),
				).toHaveLength(1);
				expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(1);
			});

			it("startOta for a different mac is not blocked by another device updating", async () => {
				await ctrl.startOta("AA:BB:CC:DD:EE:01");
				await ctrl.startOta("AA:BB:CC:DD:EE:02");

				expect(
					hass.callWS.mock.calls.filter(
						(c: any[]) => c[0].type === "eppgrid/update_firmware",
					),
				).toHaveLength(2);
			});

			it("a late-resolving OTA subscription after hostDisconnected is immediately unsubscribed", async () => {
				let resolveSub!: (unsub: () => void) => void;
				const unsub = vi.fn();
				hass.connection.subscribeMessage = vi.fn().mockImplementation(
					() =>
						new Promise<() => void>((resolve) => {
							resolveSub = resolve;
						}),
				);

				const p = ctrl.startOta("AA:BB:CC:DD:EE:01");
				// Let callWS settle so subscribeMessage is in flight.
				await new Promise((r) => setTimeout(r, 0));
				ctrl.hostDisconnected();
				resolveSub(unsub);
				await p;

				expect(unsub).toHaveBeenCalledTimes(1);
				expect((ctrl as any)._otaUnsubs["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			});

			it("a late-resolving OTA subscription after a connection swap is immediately unsubscribed", async () => {
				let resolveSub!: (unsub: () => void) => void;
				const unsub = vi.fn();
				hass.connection.subscribeMessage = vi.fn().mockImplementation(
					() =>
						new Promise<() => void>((resolve) => {
							resolveSub = resolve;
						}),
				);

				const p = ctrl.startOta("AA:BB:CC:DD:EE:01");
				await new Promise((r) => setTimeout(r, 0));
				// HA reconnect: new connection object.
				ctrl.hass = {
					callWS: vi.fn(),
					connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
				};
				resolveSub(unsub);
				await p;

				expect(unsub).toHaveBeenCalledTimes(1);
				expect((ctrl as any)._otaUnsubs["AA:BB:CC:DD:EE:01"]).toBeUndefined();
			});

			it("startOta replaces a stale subscription for the same mac without orphaning its unsub", async () => {
				// Defensive: if a subscription somehow survives for this mac
				// (e.g. an error state that never delivered its event), a new
				// startOta must release it instead of overwriting the record
				// entry and leaking the server-side subscription.
				const oldUnsub = vi.fn();
				(ctrl as any)._otaUnsubs["AA:BB:CC:DD:EE:01"] = oldUnsub;
				ctrl.otaStates = {
					"AA:BB:CC:DD:EE:01": {
						state: "error",
						progress: null,
						errorKey: "flasher.errors.update_failed_generic",
					},
				};

				await ctrl.startOta("AA:BB:CC:DD:EE:01");

				expect(oldUnsub).toHaveBeenCalledTimes(1);
				expect((ctrl as any)._otaUnsubs["AA:BB:CC:DD:EE:01"]).not.toBe(
					oldUnsub,
				);
			});
		});

		// --- device-reported error messages ---
		it("stores errorParams.message from a device error event so the view can interpolate it", async () => {
			await ctrl.startOta("AA:BB:CC:DD:EE:01");

			const callback = hass.connection.subscribeMessage.mock.calls[0][0];
			callback({
				state: "error",
				error_key: "flasher.errors.ota_device_error",
				message: "ESP_ERR_HTTP_CONNECT",
			});

			expect(ctrl.otaStates["AA:BB:CC:DD:EE:01"]).toEqual({
				state: "error",
				progress: null,
				errorKey: "flasher.errors.ota_device_error",
				errorParams: { message: "ESP_ERR_HTTP_CONNECT" },
			});
		});
	});
});

describe("cancelledDeviceIpHint", () => {
	it("stores the IP and auto-clears after 8 seconds", async () => {
		vi.useFakeTimers();
		const host = { requestUpdate: vi.fn(), addController: vi.fn() };
		const ctrl = new FlasherController(host as any);

		ctrl.setCancelledDeviceIpHint("192.168.1.42");
		expect(ctrl.cancelledDeviceIpHint).toBe("192.168.1.42");
		expect(host.requestUpdate).toHaveBeenCalled();

		vi.advanceTimersByTime(8000);
		expect(ctrl.cancelledDeviceIpHint).toBeNull();
		vi.useRealTimers();
	});

	it("clears on subsequent setCancelledDeviceIpHint(null)", () => {
		const host = { requestUpdate: vi.fn(), addController: vi.fn() };
		const ctrl = new FlasherController(host as any);
		ctrl.setCancelledDeviceIpHint("192.168.1.42");
		ctrl.setCancelledDeviceIpHint(null);
		expect(ctrl.cancelledDeviceIpHint).toBeNull();
	});

	it("hostDisconnected clears the pending IP-hint timeout so it doesn't fire after teardown", () => {
		// The 8-second auto-clear timer captures `this`, so if the panel is
		// torn down (HA reload, hot-replace) before it fires we'd land in
		// `requestUpdate` on a detached controller. Clearing the timer in
		// hostDisconnected closes that window.
		vi.useFakeTimers();
		const host = { requestUpdate: vi.fn(), addController: vi.fn() };
		const ctrl = new FlasherController(host as any);

		ctrl.setCancelledDeviceIpHint("192.168.1.42");
		host.requestUpdate.mockClear();

		ctrl.hostDisconnected();

		vi.advanceTimersByTime(10000);
		expect(host.requestUpdate).not.toHaveBeenCalled();
		vi.useRealTimers();
	});
});

describe("FlasherController error translation keys", () => {
	let host: any;
	let controller: FlasherController;

	beforeEach(() => {
		host = { addController: vi.fn(), requestUpdate: vi.fn() };
		controller = new FlasherController(host);
		(controller as any)._hass = {
			callWS: vi.fn().mockRejectedValue(new Error("nope")),
			connection: { subscribeMessage: vi.fn() },
		};
	});

	it("sets errorKey when callWS rejects in startOta", async () => {
		await controller.startOta("aa:bb:cc:dd:ee:ff");
		expect(controller.otaStates["aa:bb:cc:dd:ee:ff"]).toEqual({
			state: "error",
			progress: null,
			errorKey: "flasher.errors.start_failed",
		});
	});
});
