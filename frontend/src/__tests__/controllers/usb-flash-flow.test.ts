/**
 * Tests for the USB flash / WiFi-provisioning flow owned by
 * FlasherController (controllers/usb-flash-flow.ts), driven through the
 * controller's public handle* entry points:
 *   handleUsbFlash(variant)
 *   handleUsbWifiConfig()
 *   handleWifiProvision(ssid, password)
 *   handleWifiScan()
 *   handleRetryHaAdd()
 *   handleFlasherCancel()
 *
 * Moved here from panel-usb-flash.test.ts when the flow left the panel.
 * Serial-lock internals are asserted via the controller's private _flow.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlasherController } from "../../controllers/flasher-controller.js";

// Mock the USB flash service module before any imports that use it
vi.mock("../../lib/usb-flash-service.js", () => ({
	flashFirmware: vi.fn(),
	runWifiScan: vi.fn(),
	runWifiProvision: vi.fn(),
	detectIpAddress: vi.fn(),
	queryImprovState: vi.fn(),
}));

// Mock improv-serial (used transitively by usb-flash-service)
vi.mock("../../lib/improv-serial.js", () => ({
	buildScanCommand: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
	buildWifiCommand: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
	buildGetInfoCommand: vi.fn().mockReturnValue(new Uint8Array([3, 3, 0])),
	parseScanResults: vi.fn().mockReturnValue(null),
	releaseReader: vi.fn((reader?: { releaseLock?: () => void }) => {
		// Mirror the real helper: swallow releaseLock errors internally.
		try {
			reader?.releaseLock?.();
		} catch {}
	}),
	TYPE_CURRENT_STATE: 0x01,
	TYPE_ERROR_STATE: 0x02,
	TYPE_RPC_RESULT: 0x04,
	ERROR_UNABLE_TO_CONNECT: 0x03,
}));

import {
	detectIpAddress,
	flashFirmware,
	queryImprovState,
	runWifiProvision,
	runWifiScan,
} from "../../lib/usb-flash-service.js";

/** Reset all mocks to their default happy-path implementations. */
function resetServiceMocks() {
	(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
		async (_port: any, _variant: any, _onProgress: any, options: any) => {
			if (options?.beforeFlash) {
				await options.beforeFlash(undefined);
			}
		},
	);
	(runWifiScan as ReturnType<typeof vi.fn>).mockResolvedValue({
		writer: { releaseLock: vi.fn() },
		reader: { releaseLock: vi.fn() },
		networks: [{ ssid: "TestNet", rssi: -50, authRequired: true }],
	});
	(runWifiProvision as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
	(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
		"192.168.1.42",
	);
	(queryImprovState as ReturnType<typeof vi.fn>).mockRejectedValue(
		new Error("no state"),
	);
}

function makeMockPort() {
	return {
		open: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		readable: { getReader: vi.fn() },
		writable: { getWriter: vi.fn() },
		setSignals: vi.fn().mockResolvedValue(undefined),
	};
}

/** Standalone controller with a mock Lit host — the flow's real owner. */
function createCtrl(): FlasherController {
	const host = {
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
	const ctrl = new FlasherController(host as any);
	ctrl.hass = {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
	return ctrl;
}

/** The flow instance owning the serial state (private — test back door). */
function flowOf(ctrl: FlasherController): any {
	return (ctrl as any)._flow;
}

describe("_handleUsbFlash", () => {
	let ctrl: FlasherController;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		ctrl = createCtrl();
		mockPort = makeMockPort();

		vi.stubGlobal("navigator", {
			...navigator,
			serial: {
				requestPort: vi.fn().mockResolvedValue(mockPort),
			},
		});
	});

	it("shows fatal error immediately when opRunning is true", async () => {
		ctrl.opRunning = true;

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			fatal: true,
			errorKey: "usb.errors.serial_port_busy",
		});
	});

	it("sets state to connecting, then flashing, then wifi_scan, then wifi_provision on success", async () => {
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("connecting");
		expect(steps).toContain("flashing");
		expect(steps).toContain("wifi_scan");
		expect(steps).toContain("wifi_provision");
	});

	it("stores the serial port on the controller after requestPort", async () => {
		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.serialPort).toBe(mockPort);
	});

	it("calls flashFirmware with the port and variant", async () => {
		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(flashFirmware).toHaveBeenCalledWith(
			mockPort,
			"eppgrid-wifi",
			expect.any(Function),
			expect.objectContaining({
				beforeFlash: expect.any(Function),
				baseUrl: expect.any(String),
			}),
		);
	});

	it("calls runWifiScan after flashing", async () => {
		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("stores wifi networks on the controller after scanning", async () => {
		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.wifiNetworks).toEqual([
			{ ssid: "TestNet", rssi: -50, authRequired: true },
		]);
	});

	it("stores _serialWriter and _serialReader from scan result", async () => {
		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(flowOf(ctrl)._serialWriter).toBeDefined();
		expect(flowOf(ctrl)._serialReader).toBeDefined();
	});

	it("resets state (not error) when requestPort throws NotFoundError", async () => {
		const notFound = new DOMException("No port selected", "NotFoundError");
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(notFound);

		const resetSpy = vi.spyOn(ctrl, "resetUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(resetSpy).toHaveBeenCalled();
		// resetUsbState defers the state clear until its (here: instant —
		// no port was ever opened) teardown resolves.
		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toBeNull();
	});

	it("sets error state when requestPort throws a non-NotFoundError", async () => {
		const boom = new Error("USB exploded");
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(boom);

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("sets error state when flashFirmware throws", async () => {
		(flashFirmware as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Flash failed"),
		);

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("sets error state when runWifiScan throws", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Scan failed"),
		);

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("reports flashing progress via updateUsbState callback", async () => {
		let capturedProgressCallback: ((pct: number) => void) | undefined;
		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			(_port: any, _variant: any, onProgress: (pct: number) => void) => {
				capturedProgressCallback = onProgress;
				return Promise.resolve();
			},
		);

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		// The callback was captured during flashFirmware; call it retroactively
		// to verify its shape (it's already been stored in the closure)
		// Alternatively, we can observe that if we call it after the fact it
		// would call updateUsbState — verify by calling the stored cb directly
		if (capturedProgressCallback) {
			capturedProgressCallback(55);
			const flashingCalls = updateSpy.mock.calls.filter(
				(c: any[]) => c[0].step === "flashing" && c[0].progress === 55,
			);
			expect(flashingCalls.length).toBeGreaterThan(0);
		}
	});

	it("skips WiFi provisioning for ethernet variants and sets complete", async () => {
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("ethernet");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("connecting");
		expect(steps).toContain("flashing");
		expect(steps).toContain("complete");
		expect(steps).not.toContain("wifi_scan");
		expect(steps).not.toContain("wifi_provision");
		// Port should be closed and nulled
		expect(mockPort.close).toHaveBeenCalled();
		expect(ctrl.serialPort).toBeNull();
	});

	it("swallows port.close() error for ethernet variants", async () => {
		mockPort.close.mockRejectedValue(new Error("close failed"));
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("ethernet-poe");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("complete");
		expect(ctrl.serialPort).toBeNull();
	});

	it("sets error with 'Unknown error' message when err has no message", async () => {
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(
			{ name: "SomeError" }, // no .message
		);

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("asks the confirmDeleteOriginalFirmware hook and deletes the old config when confirmed", async () => {
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "original",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "entry-123",
				update_available: false,
				firmware_status: "compatible",
			},
		];

		const confirmHook = vi.fn().mockResolvedValue(true);
		ctrl.confirmDeleteOriginalFirmware = confirmHook;
		const deleteSpy = vi
			.spyOn(ctrl, "deleteEsphomeDevice")
			.mockResolvedValue(undefined);

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		await ctrl.handleUsbFlash("ethernet-ble-co2");

		expect(confirmHook).toHaveBeenCalled();
		expect(deleteSpy).toHaveBeenCalledWith("entry-123");
	});

	it("treats user-decline-confirm as a clean cancel (resetUsbState, no error UI)", async () => {
		// Pre-fix: `lastStep="flashing"` was already set when the confirm
		// dialog popped, so the throw landed in the catch block which
		// rendered "flash_failed". A user-cancel should not look like a
		// failure — clear the state instead.
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "original",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "entry-123",
				update_available: false,
				firmware_status: "compatible",
			},
		];

		const confirmHook = vi.fn().mockResolvedValue(false);
		ctrl.confirmDeleteOriginalFirmware = confirmHook;

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		await ctrl.handleUsbFlash("ethernet-ble-co2");

		expect(confirmHook).toHaveBeenCalled();
		// resetUsbState defers the state clear until its (here: instant —
		// the handler already closed and nulled the port) teardown resolves.
		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toBeNull();
	});

	it("aborts the flash cleanly when no confirm hook is wired (never deletes unconfirmed)", async () => {
		// Safe default: an unwired hook must behave like a decline — the
		// flow may never delete a user's ESPHome config entry without an
		// explicit confirmation.
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "original",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "entry-123",
				update_available: false,
				firmware_status: "compatible",
			},
		];

		ctrl.confirmDeleteOriginalFirmware = undefined;
		const deleteSpy = vi
			.spyOn(ctrl, "deleteEsphomeDevice")
			.mockResolvedValue(undefined);

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		await ctrl.handleUsbFlash("ethernet-ble-co2");

		expect(deleteSpy).not.toHaveBeenCalled();
		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toBeNull();
	});

	it("awaits port.close before transitioning to error state", async () => {
		// Pre-fix: close() was fire-and-forget. The "error" UI rendered
		// while the port was still closing in the background. On the next
		// retry attempt the port lock could still be held, surfacing as a
		// confusing "serial port busy" instead of letting the user just
		// retry.
		const events: string[] = [];
		mockPort.close = vi.fn().mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					setTimeout(() => {
						events.push("close-resolved");
						resolve();
					}, 0);
				}),
		);
		(flashFirmware as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("device disconnected"),
		);

		const origUpdate = ctrl.updateUsbState.bind(ctrl);
		ctrl.updateUsbState = (s: any) => {
			if (s.step === "error") events.push("error-set");
			origUpdate(s);
		};

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(events).toEqual(["close-resolved", "error-set"]);
	});

	it("still reaches the error state when the cleanup close() rejects", async () => {
		// Web Serial close() can reject (e.g. "port already closed" after a
		// device yank). The error UI must come up regardless.
		mockPort.close = vi.fn().mockRejectedValue(new Error("close failed"));
		(flashFirmware as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("device disconnected"),
		);

		await ctrl.handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.device_disconnected",
		});
		expect(ctrl.serialPort).toBeNull();
	});

	it("still resets cleanly when close() rejects during a confirm-decline unwind", async () => {
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "original",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "entry-123",
				update_available: false,
				firmware_status: "compatible",
			},
		];
		ctrl.confirmDeleteOriginalFirmware = vi.fn().mockResolvedValue(false);
		mockPort.close = vi.fn().mockRejectedValue(new Error("close failed"));

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		await ctrl.handleUsbFlash("eppgrid-wifi");

		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toBeNull();
		expect(ctrl.serialPort).toBeNull();
	});

	it("skips confirm when device has eppgrid firmware", async () => {
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "eppgrid",
				firmware_version: "2.0.0",
				esphome_config_entry_id: "entry-123",
				update_available: false,
				firmware_status: "compatible",
			},
		];

		const confirmHook = vi.fn().mockResolvedValue(true);
		ctrl.confirmDeleteOriginalFirmware = confirmHook;

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");
		await ctrl.handleUsbFlash("ethernet-ble-co2");

		expect(confirmHook).not.toHaveBeenCalled();
		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("complete");
	});

	it("skips confirm when MAC does not match any device", async () => {
		ctrl.flashableDevices = [];

		const confirmHook = vi.fn().mockResolvedValue(true);
		ctrl.confirmDeleteOriginalFirmware = confirmHook;

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");
		await ctrl.handleUsbFlash("ethernet-ble-co2");

		expect(confirmHook).not.toHaveBeenCalled();
		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("complete");
	});

	it("sets complete with variant for ethernet", async () => {
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("ethernet-ble-co2");

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0].variant).toBe("ethernet-ble-co2");
	});

	it("silently returns when error thrown and opId is stale (cancelled)", async () => {
		// Make flashFirmware reject, but increment _opId to simulate cancel
		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(async () => {
			ctrl.bumpOpId(); // simulate cancel
			throw new Error("Flash failed after cancel");
		});

		await ctrl.handleUsbFlash("eppgrid-wifi");

		// Should not show error — just set opRunning false
		expect(ctrl.usbFlashState?.step).not.toBe("error");
		expect(ctrl.opRunning).toBe(false);
	});

	it("skips wifi_scan when device reports PROVISIONED + real IP after flashing", async () => {
		(queryImprovState as ReturnType<typeof vi.fn>).mockResolvedValue({
			state: "PROVISIONED",
			ip: "192.168.1.42",
			writer: { releaseLock: vi.fn() },
			reader: { releaseLock: vi.fn() },
		});

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_check");
		expect(steps).not.toContain("wifi_scan");
		const configured = updateSpy.mock.calls.find(
			(c: any[]) => c[0].step === "wifi_configured",
		);
		expect(configured?.[0]).toMatchObject({
			ip: "192.168.1.42",
			autoSkipped: true,
		});
		expect(runWifiScan).not.toHaveBeenCalled();
		// Port stays open so the Configure WiFi override can reuse it
		expect(mockPort.close).not.toHaveBeenCalled();
		expect(ctrl.serialPort).toBe(mockPort);
	});

	it("waits at least 20s for the Improv URL on a fresh boot", async () => {
		// After a full flash the device cold-boots, loads creds from NVS, and
		// only reports its IP via Improv after WiFi + DHCP complete — which
		// can take 7-10s or longer. The default 3s readDelay is too short.
		(queryImprovState as ReturnType<typeof vi.fn>).mockResolvedValue({
			state: "PROVISIONED",
			ip: "192.168.1.42",
			writer: { releaseLock: vi.fn() },
			reader: { releaseLock: vi.fn() },
		});

		await ctrl.handleUsbFlash("eppgrid-wifi");

		const opts = (queryImprovState as ReturnType<typeof vi.fn>).mock
			.calls[0][1];
		expect(opts).toBeDefined();
		expect(opts.readDelay).toBeGreaterThanOrEqual(20000);
	});

	it("falls through to wifi_scan when device reports PROVISIONED but no usable IP", async () => {
		// queryImprovState's contract: ip is undefined when DHCP never
		// produced a real address (no "0.0.0.0" sentinel string).
		(queryImprovState as ReturnType<typeof vi.fn>).mockResolvedValue({
			state: "PROVISIONED",
			ip: undefined,
			writer: { releaseLock: vi.fn() },
			reader: { releaseLock: vi.fn() },
		});

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_check");
		expect(steps).toContain("wifi_scan");
		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("falls through to wifi_scan when device reports AUTHORIZED (no creds)", async () => {
		(queryImprovState as ReturnType<typeof vi.fn>).mockResolvedValue({
			state: "AUTHORIZED",
			writer: { releaseLock: vi.fn() },
			reader: { releaseLock: vi.fn() },
		});

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_check");
		expect(steps).toContain("wifi_scan");
	});

	it("falls through to wifi_scan when queryImprovState throws", async () => {
		(queryImprovState as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("boom"),
		);

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_check");
		expect(steps).toContain("wifi_scan");
	});
});

describe("_handleWifiProvision", () => {
	let ctrl: FlasherController;
	let oldWriter: { releaseLock: ReturnType<typeof vi.fn> };
	let oldReader: { releaseLock: ReturnType<typeof vi.fn> };
	let freshWriter: { releaseLock: ReturnType<typeof vi.fn> };
	let freshReader: { releaseLock: ReturnType<typeof vi.fn> };
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		resetServiceMocks();
		ctrl = createCtrl();

		oldWriter = { releaseLock: vi.fn() };
		oldReader = { releaseLock: vi.fn() };
		freshWriter = { releaseLock: vi.fn() };
		freshReader = { releaseLock: vi.fn() };
		mockPort = makeMockPort();

		// getWriter returns fresh writer; getReader returns fresh reader
		mockPort.writable.getWriter.mockReturnValue(freshWriter);
		mockPort.readable.getReader.mockReturnValue(freshReader);

		// Pre-wire ctrl with a serial port and old writer/reader (as _handleUsbFlash would)
		ctrl.serialPort = mockPort as any;
		flowOf(ctrl)._serialWriter = oldWriter;
		flowOf(ctrl)._serialReader = oldReader;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function flushProvision(ssid: string, password: string) {
		const promise = ctrl.handleWifiProvision(ssid, password);
		await vi.advanceTimersByTimeAsync(200);
		return promise;
	}

	it("sets error when serial port is not available (no writable)", async () => {
		// Port without writable
		ctrl.serialPort = { readable: {}, writable: null } as any;

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			errorKey: "usb.errors.serial_port_unavailable",
		});
	});

	it("sets error when serial port is null", async () => {
		ctrl.serialPort = null;

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			errorKey: "usb.errors.serial_port_unavailable",
		});
	});

	it("releases old reader/writer locks before getting fresh ones", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(oldReader.releaseLock).toHaveBeenCalled();
		expect(oldWriter.releaseLock).toHaveBeenCalled();
	});

	it("calls runWifiProvision with fresh writer, ssid, password", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(runWifiProvision).toHaveBeenCalledWith(
			freshWriter,
			"MySSID",
			"s3cr3t",
		);
	});

	it("does not RTS reset — Improv handles WiFi in-session", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(mockPort.setSignals).not.toHaveBeenCalled();
	});

	it("sets state to wifi_connecting then reading_ip", async () => {
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await flushProvision("MySSID", "s3cr3t");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("reading_ip");
	});

	it("calls detectIpAddress with reader, writer, and 60000ms timeout", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(detectIpAddress).toHaveBeenCalledWith(
			freshReader,
			freshWriter,
			60000,
		);
	});

	it("releases fresh reader and writer locks after sending credentials", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(freshReader.releaseLock).toHaveBeenCalled();
		expect(freshWriter.releaseLock).toHaveBeenCalled();
	});

	it("closes the serial port after provisioning", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(mockPort.close).toHaveBeenCalled();
	});

	it("sets ctrl.serialPort to null after closing", async () => {
		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.serialPort).toBeNull();
	});

	it("still completes when the post-provision close() rejects", async () => {
		// close() can reject after the device reboots onto WiFi and drops the
		// USB CDC endpoint — the provision already succeeded, so the flow
		// must carry on to wifi_configured + HA-add.
		mockPort.close = vi.fn().mockRejectedValue(new Error("device rebooted"));
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await flushProvision("MySSID", "s3cr3t");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_configured");
		expect(steps).not.toContain("error");
		expect(ctrl.serialPort).toBeNull();
	});

	it("calls addEsphomeDevice with the detected IP", async () => {
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValue(undefined as any);

		await flushProvision("MySSID", "s3cr3t");

		expect(addSpy).toHaveBeenCalledWith("192.168.1.42");
	});

	it("sets state to wifi_configured with IP after detectIpAddress returns", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await flushProvision("MySSID", "s3cr3t");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_configured");
		// wifi_configured must appear before complete
		const wifiConfiguredIdx = steps.indexOf("wifi_configured");
		const completeIdx = steps.indexOf("complete");
		expect(wifiConfiguredIdx).toBeLessThan(completeIdx);
		// wifi_configured carried the IP
		const wifiConfiguredCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "wifi_configured",
		);
		expect(wifiConfiguredCall?.[0].ip).toBe("192.168.1.42");
	});

	it("transitions to complete with haAdd=added when addEsphomeDevice resolves with added", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await flushProvision("MySSID", "s3cr3t");

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		});
	});

	it.each([
		["already_added", { type: "already_added" }],
		["needs_auth", { type: "needs_auth" }],
		["failed with reason", { type: "failed", reason: "invalid_auth" }],
	])("transitions to complete with haAdd=%s from addEsphomeDevice", async (_label: string, outcome: any) => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue(outcome);
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await flushProvision("MySSID", "s3cr3t");

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: outcome,
		});
	});

	it("transitions to complete with haAdd=failed when addEsphomeDevice throws", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		vi.spyOn(ctrl, "addEsphomeDevice").mockRejectedValue(
			new Error("connection timeout"),
		);
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await flushProvision("MySSID", "s3cr3t");

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "failed", reason: "connection timeout" },
		});
		// Must NOT transition to the error step on HA-add failure
		expect(
			(updateSpy.mock.calls as any[][]).some((c) => c[0].step === "error"),
		).toBe(false);
	});

	it("auto-retries once after cannot_connect on initial add", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = ctrl.handleWifiProvision("MySSID", "s3cr3t");
		await vi.advanceTimersByTimeAsync(11000); // 200ms initial + 10s retry delay
		await promise;

		expect(addSpy).toHaveBeenCalledTimes(2);
		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		});
	});

	it("keeps cannot_connect when all retries fail", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({
			type: "cannot_connect",
		});
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = ctrl.handleWifiProvision("MySSID", "s3cr3t");
		// 200ms provision + 5 × 10s backoff = 50.2s
		await vi.advanceTimersByTimeAsync(51000);
		await promise;

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		});
	});

	it("does not retry when initial add returns non-cannot_connect failure", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValue({ type: "needs_auth" });

		await flushProvision("MySSID", "s3cr3t");

		expect(addSpy).toHaveBeenCalledTimes(1);
	});

	it("records haAdd=failed when auto-retry throws", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		vi.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockRejectedValueOnce(new Error("network dropped"));
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = ctrl.handleWifiProvision("MySSID", "s3cr3t");
		await vi.advanceTimersByTimeAsync(11000);
		await promise;

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "failed", reason: "network dropped" },
		});
	});

	it("retries up to 6 times at 10s intervals on persistent cannot_connect", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = ctrl.handleWifiProvision("MySSID", "s3cr3t");
		// 200ms provision + 5 × 10s retry delays = 50.2s
		await vi.advanceTimersByTimeAsync(51000);
		await promise;

		expect(addSpy).toHaveBeenCalledTimes(6);
		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		});
	});

	it("exposes haAddAttempt on usbFlashState during retry loop", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		vi.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = ctrl.handleWifiProvision("MySSID", "s3cr3t");
		await vi.advanceTimersByTimeAsync(21000);
		await promise;

		// Attempts 2 and 3 should have published progress into wifi_configured.
		const retryCalls = (updateSpy.mock.calls as any[][])
			.map((c) => c[0])
			.filter(
				(s) =>
					s.step === "wifi_configured" && typeof s.haAddAttempt === "number",
			);
		expect(retryCalls.length).toBeGreaterThanOrEqual(2);
		const attempts = retryCalls.map((s) => s.haAddAttempt);
		expect(attempts).toContain(2);
		expect(attempts).toContain(3);
		expect(retryCalls[0].haAddMaxAttempts).toBe(6);
	});

	it("aborts backoff promptly when opId changes mid-retry", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValue({ type: "cannot_connect" });

		const promise = ctrl.handleWifiProvision("MySSID", "s3cr3t");
		// Reach the middle of the first 10s backoff.
		await vi.advanceTimersByTimeAsync(11200);
		expect(addSpy).toHaveBeenCalledTimes(2);

		// Cancel: bump opId and advance only one poll step (250ms).
		ctrl.bumpOpId();
		await vi.advanceTimersByTimeAsync(300);
		await promise;

		// Retry loop must have exited without waiting out the remaining backoff.
		expect(addSpy).toHaveBeenCalledTimes(2);
	});

	it("sets error state when runWifiProvision throws", async () => {
		(runWifiProvision as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("provision failed"),
		);

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.provisioning_failed",
		});
	});

	it("sets error state when detectIpAddress throws", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("timeout"),
		);

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.provisioning_failed",
		});
	});

	it("releases reader/writer and sets them to null on error", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("timeout"),
		);

		await flushProvision("MySSID", "s3cr3t");

		expect(flowOf(ctrl)._serialReader).toBeNull();
		expect(flowOf(ctrl)._serialWriter).toBeNull();
	});

	it("uses fallback error message 'WiFi provisioning failed' when err has no message", async () => {
		(runWifiProvision as ReturnType<typeof vi.fn>).mockRejectedValue({});

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.provisioning_failed",
		});
	});
});

describe("_handleWifiScan", () => {
	let ctrl: FlasherController;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		ctrl = createCtrl();
	});

	it("returns early without calling runWifiScan when serialPort is null", async () => {
		ctrl.serialPort = null;

		await ctrl.handleWifiScan();

		expect(runWifiScan).not.toHaveBeenCalled();
	});

	it("calls runWifiScan with the serial port when port is set", async () => {
		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;

		await ctrl.handleWifiScan();

		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("updates wifiNetworks on the controller after a scan", async () => {
		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;

		await ctrl.handleWifiScan();

		expect(ctrl.wifiNetworks).toEqual([
			{ ssid: "TestNet", rssi: -50, authRequired: true },
		]);
	});

	it("stores new _serialWriter and _serialReader from scan result", async () => {
		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;

		await ctrl.handleWifiScan();

		expect(flowOf(ctrl)._serialWriter).toBeDefined();
		expect(flowOf(ctrl)._serialReader).toBeDefined();
	});

	it("sets state to wifi_provision after successful scan", async () => {
		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleWifiScan();

		const calls = updateSpy.mock.calls as any[][];
		const lastCall = calls[calls.length - 1];
		expect(lastCall[0].step).toBe("wifi_provision");
	});

	it("releases old reader lock before re-scanning when locks exist", async () => {
		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;

		const oldReader = { releaseLock: vi.fn() };
		const oldWriter = { releaseLock: vi.fn() };
		flowOf(ctrl)._serialReader = oldReader;
		flowOf(ctrl)._serialWriter = oldWriter;

		await ctrl.handleWifiScan();

		expect(oldReader.releaseLock).toHaveBeenCalled();
		expect(oldWriter.releaseLock).toHaveBeenCalled();
	});

	it("shows error state when runWifiScan fails", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("scan error"),
		);

		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;
		ctrl.usbFlashState = { step: "wifi_provision" };

		// Should not throw
		await expect(ctrl.handleWifiScan()).resolves.toBeUndefined();

		// State should show error
		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.scan_failed",
		});
	});

	it("silently ignores releaseLock errors before re-scanning", async () => {
		const mockPort = makeMockPort();
		ctrl.serialPort = mockPort as any;

		const throwingReader = {
			releaseLock: vi.fn().mockImplementation(() => {
				throw new Error("already released");
			}),
		};
		const throwingWriter = {
			releaseLock: vi.fn().mockImplementation(() => {
				throw new Error("already released");
			}),
		};
		flowOf(ctrl)._serialReader = throwingReader;
		flowOf(ctrl)._serialWriter = throwingWriter;

		// Should not throw despite releaseLock errors
		await expect(ctrl.handleWifiScan()).resolves.toBeUndefined();

		expect(runWifiScan).toHaveBeenCalled();
	});

	describe("_handleWifiScan from autoSkipped", () => {
		let ctrl: FlasherController;
		let mockPort: ReturnType<typeof makeMockPort>;

		beforeEach(() => {
			vi.clearAllMocks();
			resetServiceMocks();
			ctrl = createCtrl();
			mockPort = makeMockPort();
		});

		it("invalidates opId when triggered during wifi_configured autoSkipped state", async () => {
			ctrl.serialPort = mockPort as any;
			ctrl.updateUsbState({
				step: "wifi_configured",
				ip: "192.168.1.42",
				autoSkipped: true,
			});
			const beforeOp = ctrl.opId;

			await ctrl.handleWifiScan();

			expect(ctrl.opId).not.toBe(beforeOp);
			expect(ctrl.usbFlashState?.step).toBe("wifi_provision");
		});

		it("bails out without touching state if opId is bumped while runWifiScan is in flight", async () => {
			ctrl.serialPort = mockPort as any;
			ctrl.updateUsbState({ step: "wifi_scan" });

			const freshReader = { releaseLock: vi.fn() };
			const freshWriter = { releaseLock: vi.fn() };
			// Simulate runWifiScan completing AFTER the user has cancelled (opId bumped).
			(runWifiScan as ReturnType<typeof vi.fn>).mockImplementation(async () => {
				ctrl.bumpOpId();
				return {
					writer: freshWriter,
					reader: freshReader,
					networks: [{ ssid: "Late", rssi: -50, authRequired: true }],
				};
			});
			const updateSpy = vi.spyOn(ctrl, "updateUsbState");

			await ctrl.handleWifiScan();

			// Should not have transitioned to wifi_provision after the stale scan result.
			const provisionCall = updateSpy.mock.calls.find(
				(c: any[]) => c[0]?.step === "wifi_provision",
			);
			expect(provisionCall).toBeUndefined();
			// And the fresh locks should have been released, not stored on the controller.
			expect(freshReader.releaseLock).toHaveBeenCalled();
			expect(freshWriter.releaseLock).toHaveBeenCalled();
		});
	});
});

describe("_handleUsbWifiConfig", () => {
	let ctrl: FlasherController;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		ctrl = createCtrl();
		mockPort = makeMockPort();

		vi.stubGlobal("navigator", {
			...navigator,
			serial: {
				requestPort: vi.fn().mockResolvedValue(mockPort),
			},
		});
	});

	it("requests port, runs wifi scan, and sets wifi_provision state on success", async () => {
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbWifiConfig();

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("connecting");
		expect(steps).toContain("wifi_scan");
		expect(steps).toContain("wifi_provision");
	});

	it("resets state on NotFoundError (user cancelled port picker)", async () => {
		const notFound = new DOMException("No port selected", "NotFoundError");
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(notFound);

		const resetSpy = vi.spyOn(ctrl, "resetUsbState");

		await ctrl.handleUsbWifiConfig();

		expect(resetSpy).toHaveBeenCalled();
	});

	it("sets error state when runWifiScan throws", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("scan failed"),
		);

		await ctrl.handleUsbWifiConfig();

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.scan_failed",
		});
	});

	it("proceeds to wifi_provision when no networks found (allows manual SSID)", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockResolvedValue({
			writer: { releaseLock: vi.fn() },
			reader: { releaseLock: vi.fn() },
			networks: [],
		});

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleUsbWifiConfig();

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_provision");
		expect(ctrl.wifiNetworks).toEqual([]);
	});
});

describe("_handleRetryHaAdd", () => {
	let ctrl: FlasherController;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		resetServiceMocks();
		ctrl = createCtrl();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("re-enters wifi_configured and emits complete with new haAdd on retry", async () => {
		ctrl.usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		};
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleRetryHaAdd();

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toEqual(["wifi_configured", "complete"]);
		expect(updateSpy.mock.calls[1][0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		});
	});

	it("is a no-op when step is not complete", async () => {
		ctrl.usbFlashState = { step: "error" };
		const addSpy = vi.spyOn(ctrl, "addEsphomeDevice");
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleRetryHaAdd();

		expect(addSpy).not.toHaveBeenCalled();
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("is a no-op when ip is missing", async () => {
		ctrl.usbFlashState = { step: "complete", haAdd: { type: "failed" } };
		const addSpy = vi.spyOn(ctrl, "addEsphomeDevice");

		await ctrl.handleRetryHaAdd();

		expect(addSpy).not.toHaveBeenCalled();
	});

	it("records haAdd=failed when retry throws", async () => {
		ctrl.usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		};
		vi.spyOn(ctrl, "addEsphomeDevice").mockRejectedValue(
			new Error("network unreachable"),
		);
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await ctrl.handleRetryHaAdd();

		const completeCall = updateSpy.mock.calls[1][0];
		expect(completeCall).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "failed", reason: "network unreachable" },
		});
	});

	it("does not overwrite reset state when cancelled mid-retry", async () => {
		ctrl.usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		};
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({
			type: "cannot_connect",
		});
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = ctrl.handleRetryHaAdd();
		// Let attempt 1 resolve (cannot_connect) so we are inside the first backoff.
		await vi.advanceTimersByTimeAsync(50);
		expect(
			updateSpy.mock.calls.some((c: any[]) => c[0].step === "complete"),
		).toBe(false);

		// Simulate cancel: bump opId and clear state as the cancel handler would.
		ctrl.bumpOpId();
		ctrl.usbFlashState = null;
		await vi.advanceTimersByTimeAsync(300);
		await promise;

		// After cancel, retry handler must not publish a stale `complete` state.
		const lateComplete = updateSpy.mock.calls.some(
			(c: any[]) => c[0].step === "complete",
		);
		expect(lateComplete).toBe(false);
	});
});

describe("flasher-cancel handler", () => {
	let ctrl: FlasherController;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		ctrl = createCtrl();
		mockPort = makeMockPort();
	});

	it("resets usbFlashState and closes port", async () => {
		ctrl.serialPort = mockPort as any;
		ctrl.updateUsbState({ step: "wifi_scan" });

		await ctrl.handleFlasherCancel();

		expect(ctrl.usbFlashState).toBeNull();
		expect(ctrl.serialPort).toBeNull();
	});

	it("completes the cancel even when port.close() rejects during teardown", async () => {
		// close() rejecting (already-closed / yanked device) must not leave
		// the cancel hanging or the stale flash state on screen.
		mockPort.close = vi.fn().mockRejectedValue(new Error("already closed"));
		ctrl.serialPort = mockPort as any;
		ctrl.updateUsbState({ step: "wifi_scan" });

		await ctrl.handleFlasherCancel();

		expect(ctrl.usbFlashState).toBeNull();
		expect(ctrl.serialPort).toBeNull();
	});

	it("captures IP hint when cancelling from wifi_configured state", () => {
		ctrl.serialPort = mockPort as any;
		ctrl.updateUsbState({ step: "wifi_configured", ip: "192.168.1.42" });

		ctrl.handleFlasherCancel();

		expect(ctrl.cancelledDeviceIpHint).toBe("192.168.1.42");
	});

	it("does NOT capture IP hint when cancelling from other states", () => {
		ctrl.serialPort = mockPort as any;
		ctrl.updateUsbState({ step: "wifi_scan" });

		ctrl.handleFlasherCancel();

		expect(ctrl.cancelledDeviceIpHint).toBeNull();
	});

	it("keeps usbFlashState up until the serial teardown resolves (Cancelling… feedback)", async () => {
		// While the port is still unwinding (~1-2s) the flash screen — with
		// epp-flasher-view's disabled "Cancelling…" button — must stay up.
		// Clearing usbFlashState first re-renders the variant picker while
		// the port is still closing.
		let resolveClose!: () => void;
		mockPort.close = vi.fn().mockReturnValue(
			new Promise<void>((r) => {
				resolveClose = r;
			}),
		);
		ctrl.serialPort = mockPort as any;
		ctrl.updateUsbState({ step: "wifi_check" });

		const p = ctrl.handleFlasherCancel();
		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toEqual({ step: "wifi_check" });

		resolveClose();
		await p;
		expect(ctrl.usbFlashState).toBeNull();
	});

	it("closes the port after the in-flight op settles, so the next flash can re-open it", async () => {
		ctrl.serialPort = mockPort as any;
		ctrl.updateUsbState({ step: "wifi_check" });

		await ctrl.handleFlasherCancel();

		// Earlier we left the port open to avoid a Chrome crash on locked
		// streams, but that meant subsequent flash attempts hit "Serial
		// port busy". Now we abort + await the in-flight op first so locks
		// release before close().
		expect(mockPort.close).toHaveBeenCalledTimes(1);
	});
});
