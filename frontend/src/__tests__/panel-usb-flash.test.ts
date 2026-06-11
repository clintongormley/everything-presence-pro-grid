/**
 * Tests for the USB flash handler private methods in EPPGridPanel:
 *   _handleUsbFlash(variant)
 *   _handleWifiProvision(ssid, password)
 *   _handleWifiScan()
 *
 * These are tested by calling private methods directly via `(panel as any)`.
 */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EPPGridPanel } from "../eppgrid-panel.js";

// Mock the USB flash service module before any imports that use it
vi.mock("../lib/usb-flash-service.js", () => ({
	flashFirmware: vi.fn(),
	runWifiScan: vi.fn(),
	runWifiProvision: vi.fn(),
	detectIpAddress: vi.fn(),
	queryImprovState: vi.fn(),
}));

// Mock improv-serial (used transitively by usb-flash-service)
vi.mock("../lib/improv-serial.js", () => ({
	buildScanCommand: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
	buildWifiCommand: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
	buildGetInfoCommand: vi.fn().mockReturnValue(new Uint8Array([3, 3, 0])),
	parseScanResults: vi.fn().mockReturnValue(null),
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
} from "../lib/usb-flash-service.js";

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

function createPanel(): EPPGridPanel {
	const el = new EPPGridPanel();
	(el as any).hass = {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
	};
	return el;
}

describe("_handleUsbFlash", () => {
	let panel: EPPGridPanel;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		mockPort = makeMockPort();

		vi.stubGlobal("navigator", {
			...navigator,
			serial: {
				requestPort: vi.fn().mockResolvedValue(mockPort),
			},
		});
	});

	it("shows fatal error immediately when opRunning is true", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.opRunning = true;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			fatal: true,
			errorKey: "usb.errors.serial_port_busy",
		});
	});

	it("sets state to connecting, then flashing, then wifi_scan, then wifi_provision on success", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("connecting");
		expect(steps).toContain("flashing");
		expect(steps).toContain("wifi_scan");
		expect(steps).toContain("wifi_provision");
	});

	it("stores the serial port on the controller after requestPort", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.serialPort).toBe(mockPort);
	});

	it("calls flashFirmware with the port and variant", async () => {
		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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
		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("stores wifi networks on the controller after scanning", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.wifiNetworks).toEqual([
			{ ssid: "TestNet", rssi: -50, authRequired: true },
		]);
	});

	it("stores _serialWriter and _serialReader from scan result", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect((ctrl as any)._serialWriter).toBeDefined();
		expect((ctrl as any)._serialReader).toBeDefined();
	});

	it("resets state (not error) when requestPort throws NotFoundError", async () => {
		const notFound = new DOMException("No port selected", "NotFoundError");
		(
			navigator.serial.requestPort as ReturnType<typeof vi.fn>
		).mockRejectedValue(notFound);

		const ctrl = (panel as any)._flasherCtrl;
		const resetSpy = vi.spyOn(ctrl, "resetUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("sets error state when flashFirmware throws", async () => {
		(flashFirmware as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Flash failed"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("sets error state when runWifiScan throws", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Scan failed"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("ethernet");

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
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("ethernet-poe");

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

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "usb.errors.flash_failed",
		});
	});

	it("calls window.confirm and deleteEsphomeDevice when device matches original firmware", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "original",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "entry-123",
			},
		];

		vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
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

		await (panel as any)._handleUsbFlash("ethernet-ble-co2");

		expect(window.confirm).toHaveBeenCalled();
		expect(deleteSpy).toHaveBeenCalledWith("entry-123");
	});

	it("treats user-decline-confirm as a clean cancel (resetUsbState, no error UI)", async () => {
		// Pre-fix: `lastStep="flashing"` was already set when the confirm
		// dialog popped, so the throw landed in the catch block which
		// rendered "flash_failed". A user-cancel should not look like a
		// failure — clear the state instead.
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "original",
				firmware_version: "1.0.0",
				esphome_config_entry_id: "entry-123",
			},
		];

		vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		await (panel as any)._handleUsbFlash("ethernet-ble-co2");

		expect(window.confirm).toHaveBeenCalled();
		// resetUsbState defers the state clear until its (here: instant —
		// the handler already closed and nulled the port) teardown resolves.
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

		const ctrl = (panel as any)._flasherCtrl;
		const origUpdate = ctrl.updateUsbState.bind(ctrl);
		ctrl.updateUsbState = (s: any) => {
			if (s.step === "error") events.push("error-set");
			origUpdate(s);
		};

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		expect(events).toEqual(["close-resolved", "error-set"]);
	});

	it("skips confirm when device has eppgrid firmware", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.flashableDevices = [
			{
				mac: "AA:BB:CC:DD:EE:FF",
				name: "Test",
				host: "192.168.1.10",
				available: true,
				firmware_type: "eppgrid",
				firmware_version: "2.0.0",
				esphome_config_entry_id: "entry-123",
			},
		];

		vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");
		await (panel as any)._handleUsbFlash("ethernet-ble-co2");

		expect(window.confirm).not.toHaveBeenCalled();
		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("complete");
	});

	it("skips confirm when MAC does not match any device", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.flashableDevices = [];

		vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(
			async (_port: any, _variant: any, _onProgress: any, options: any) => {
				if (options?.beforeFlash) {
					await options.beforeFlash("AA:BB:CC:DD:EE:FF");
				}
			},
		);

		const updateSpy = vi.spyOn(ctrl, "updateUsbState");
		await (panel as any)._handleUsbFlash("ethernet-ble-co2");

		expect(window.confirm).not.toHaveBeenCalled();
		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("complete");
	});

	it("sets complete with variant for ethernet", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("ethernet-ble-co2");

		const completeCall = (updateSpy.mock.calls as any[][]).find(
			(c) => c[0].step === "complete",
		);
		expect(completeCall?.[0].variant).toBe("ethernet-ble-co2");
	});

	it("silently returns when error thrown and opId is stale (cancelled)", async () => {
		const ctrl = (panel as any)._flasherCtrl;

		// Make flashFirmware reject, but increment _opId to simulate cancel
		(flashFirmware as ReturnType<typeof vi.fn>).mockImplementation(async () => {
			(ctrl as any)._opId++; // simulate cancel via private field
			throw new Error("Flash failed after cancel");
		});

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

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

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_check");
		expect(steps).toContain("wifi_scan");
	});

	it("falls through to wifi_scan when queryImprovState throws", async () => {
		(queryImprovState as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("boom"),
		);

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbFlash("eppgrid-wifi");

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_check");
		expect(steps).toContain("wifi_scan");
	});
});

describe("_handleWifiProvision", () => {
	let panel: EPPGridPanel;
	let oldWriter: { releaseLock: ReturnType<typeof vi.fn> };
	let oldReader: { releaseLock: ReturnType<typeof vi.fn> };
	let freshWriter: { releaseLock: ReturnType<typeof vi.fn> };
	let freshReader: { releaseLock: ReturnType<typeof vi.fn> };
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		resetServiceMocks();
		panel = createPanel();

		oldWriter = { releaseLock: vi.fn() };
		oldReader = { releaseLock: vi.fn() };
		freshWriter = { releaseLock: vi.fn() };
		freshReader = { releaseLock: vi.fn() };
		mockPort = makeMockPort();

		// getWriter returns fresh writer; getReader returns fresh reader
		mockPort.writable.getWriter.mockReturnValue(freshWriter);
		mockPort.readable.getReader.mockReturnValue(freshReader);

		// Pre-wire ctrl with a serial port and old writer/reader (as _handleUsbFlash would)
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		(ctrl as any)._serialWriter = oldWriter;
		(ctrl as any)._serialReader = oldReader;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function flushProvision(ssid: string, password: string) {
		const promise = (panel as any)._handleWifiProvision(ssid, password);
		await vi.advanceTimersByTimeAsync(200);
		return promise;
	}

	it("sets error when serial port is not available (no writable)", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		// Port without writable
		ctrl.serialPort = { readable: {}, writable: null };

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toEqual({
			step: "error",
			errorKey: "usb.errors.serial_port_unavailable",
		});
	});

	it("sets error when serial port is null", async () => {
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.serialPort).toBeNull();
	});

	it("calls addEsphomeDevice with the detected IP", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValue(undefined);

		await flushProvision("MySSID", "s3cr3t");

		expect(addSpy).toHaveBeenCalledWith("192.168.1.42");
	});

	it("sets state to wifi_configured with IP after detectIpAddress returns", async () => {
		(detectIpAddress as ReturnType<typeof vi.fn>).mockResolvedValue(
			"192.168.1.42",
		);
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = (panel as any)._handleWifiProvision("MySSID", "s3cr3t");
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
		const ctrl = (panel as any)._flasherCtrl;
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({
			type: "cannot_connect",
		});
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = (panel as any)._handleWifiProvision("MySSID", "s3cr3t");
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
		const ctrl = (panel as any)._flasherCtrl;
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
		const ctrl = (panel as any)._flasherCtrl;
		vi.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockRejectedValueOnce(new Error("network dropped"));
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = (panel as any)._handleWifiProvision("MySSID", "s3cr3t");
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
		const ctrl = (panel as any)._flasherCtrl;
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = (panel as any)._handleWifiProvision("MySSID", "s3cr3t");
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
		const ctrl = (panel as any)._flasherCtrl;
		vi.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "cannot_connect" })
			.mockResolvedValueOnce({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = (panel as any)._handleWifiProvision("MySSID", "s3cr3t");
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
		const ctrl = (panel as any)._flasherCtrl;
		const addSpy = vi
			.spyOn(ctrl, "addEsphomeDevice")
			.mockResolvedValue({ type: "cannot_connect" });

		const promise = (panel as any)._handleWifiProvision("MySSID", "s3cr3t");
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

		const ctrl = (panel as any)._flasherCtrl;

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

		const ctrl = (panel as any)._flasherCtrl;

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

		const ctrl = (panel as any)._flasherCtrl;

		await flushProvision("MySSID", "s3cr3t");

		expect((ctrl as any)._serialReader).toBeNull();
		expect((ctrl as any)._serialWriter).toBeNull();
	});

	it("uses fallback error message 'WiFi provisioning failed' when err has no message", async () => {
		(runWifiProvision as ReturnType<typeof vi.fn>).mockRejectedValue({});

		const ctrl = (panel as any)._flasherCtrl;

		await flushProvision("MySSID", "s3cr3t");

		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.provisioning_failed",
		});
	});
});

describe("_handleWifiScan", () => {
	let panel: EPPGridPanel;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
	});

	it("returns early without calling runWifiScan when serialPort is null", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = null;

		await (panel as any)._handleWifiScan();

		expect(runWifiScan).not.toHaveBeenCalled();
	});

	it("calls runWifiScan with the serial port when port is set", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		await (panel as any)._handleWifiScan();

		expect(runWifiScan).toHaveBeenCalledWith(mockPort);
	});

	it("updates wifiNetworks on the controller after a scan", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		await (panel as any)._handleWifiScan();

		expect(ctrl.wifiNetworks).toEqual([
			{ ssid: "TestNet", rssi: -50, authRequired: true },
		]);
	});

	it("stores new _serialWriter and _serialReader from scan result", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		await (panel as any)._handleWifiScan();

		expect((ctrl as any)._serialWriter).toBeDefined();
		expect((ctrl as any)._serialReader).toBeDefined();
	});

	it("sets state to wifi_provision after successful scan", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleWifiScan();

		const calls = updateSpy.mock.calls as any[][];
		const lastCall = calls[calls.length - 1];
		expect(lastCall[0].step).toBe("wifi_provision");
	});

	it("releases old reader lock before re-scanning when locks exist", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

		const oldReader = { releaseLock: vi.fn() };
		const oldWriter = { releaseLock: vi.fn() };
		(ctrl as any)._serialReader = oldReader;
		(ctrl as any)._serialWriter = oldWriter;

		await (panel as any)._handleWifiScan();

		expect(oldReader.releaseLock).toHaveBeenCalled();
		expect(oldWriter.releaseLock).toHaveBeenCalled();
	});

	it("shows error state when runWifiScan fails", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("scan error"),
		);

		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		ctrl.usbFlashState = { step: "wifi_provision" };

		// Should not throw
		await expect((panel as any)._handleWifiScan()).resolves.toBeUndefined();

		// State should show error
		expect(ctrl.usbFlashState).toMatchObject({
			step: "error",
			errorKey: "wifi.errors.scan_failed",
		});
	});

	it("silently ignores releaseLock errors before re-scanning", async () => {
		const mockPort = makeMockPort();
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;

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
		(ctrl as any)._serialReader = throwingReader;
		(ctrl as any)._serialWriter = throwingWriter;

		// Should not throw despite releaseLock errors
		await expect((panel as any)._handleWifiScan()).resolves.toBeUndefined();

		expect(runWifiScan).toHaveBeenCalled();
	});

	describe("_handleWifiScan from autoSkipped", () => {
		let panel: EPPGridPanel;
		let mockPort: ReturnType<typeof makeMockPort>;

		beforeEach(() => {
			vi.clearAllMocks();
			resetServiceMocks();
			panel = createPanel();
			mockPort = makeMockPort();
		});

		it("invalidates opId when triggered during wifi_configured autoSkipped state", async () => {
			const ctrl = (panel as any)._flasherCtrl;
			ctrl.serialPort = mockPort;
			ctrl.updateUsbState({
				step: "wifi_configured",
				ip: "192.168.1.42",
				autoSkipped: true,
			});
			const beforeOp = ctrl.opId;

			await (panel as any)._handleWifiScan();

			expect(ctrl.opId).not.toBe(beforeOp);
			expect(ctrl.usbFlashState?.step).toBe("wifi_provision");
		});

		it("bails out without touching state if opId is bumped while runWifiScan is in flight", async () => {
			const ctrl = (panel as any)._flasherCtrl;
			ctrl.serialPort = mockPort;
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

			await (panel as any)._handleWifiScan();

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
	let panel: EPPGridPanel;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		mockPort = makeMockPort();

		vi.stubGlobal("navigator", {
			...navigator,
			serial: {
				requestPort: vi.fn().mockResolvedValue(mockPort),
			},
		});
	});

	it("requests port, runs wifi scan, and sets wifi_provision state on success", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbWifiConfig();

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

		const ctrl = (panel as any)._flasherCtrl;
		const resetSpy = vi.spyOn(ctrl, "resetUsbState");

		await (panel as any)._handleUsbWifiConfig();

		expect(resetSpy).toHaveBeenCalled();
	});

	it("sets error state when runWifiScan throws", async () => {
		(runWifiScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("scan failed"),
		);

		const ctrl = (panel as any)._flasherCtrl;

		await (panel as any)._handleUsbWifiConfig();

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

		const ctrl = (panel as any)._flasherCtrl;
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleUsbWifiConfig();

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toContain("wifi_provision");
		expect(ctrl.wifiNetworks).toEqual([]);
	});
});

describe("_handleRetryHaAdd", () => {
	let panel: EPPGridPanel;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		resetServiceMocks();
		panel = createPanel();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("re-enters wifi_configured and emits complete with new haAdd on retry", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		};
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({ type: "added" });
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleRetryHaAdd();

		const steps = updateSpy.mock.calls.map((c: any[]) => c[0].step);
		expect(steps).toEqual(["wifi_configured", "complete"]);
		expect(updateSpy.mock.calls[1][0]).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		});
	});

	it("is a no-op when step is not complete", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.usbFlashState = { step: "error" };
		const addSpy = vi.spyOn(ctrl, "addEsphomeDevice");
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleRetryHaAdd();

		expect(addSpy).not.toHaveBeenCalled();
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("is a no-op when ip is missing", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.usbFlashState = { step: "complete", haAdd: { type: "failed" } };
		const addSpy = vi.spyOn(ctrl, "addEsphomeDevice");

		await (panel as any)._handleRetryHaAdd();

		expect(addSpy).not.toHaveBeenCalled();
	});

	it("records haAdd=failed when retry throws", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		};
		vi.spyOn(ctrl, "addEsphomeDevice").mockRejectedValue(
			new Error("network unreachable"),
		);
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		await (panel as any)._handleRetryHaAdd();

		const completeCall = updateSpy.mock.calls[1][0];
		expect(completeCall).toMatchObject({
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "failed", reason: "network unreachable" },
		});
	});

	it("does not overwrite reset state when cancelled mid-retry", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "cannot_connect" },
		};
		vi.spyOn(ctrl, "addEsphomeDevice").mockResolvedValue({
			type: "cannot_connect",
		});
		const updateSpy = vi.spyOn(ctrl, "updateUsbState");

		const promise = (panel as any)._handleRetryHaAdd();
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
	let panel: EPPGridPanel;
	let mockPort: ReturnType<typeof makeMockPort>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		mockPort = makeMockPort();
	});

	it("resets usbFlashState and closes port", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		ctrl.updateUsbState({ step: "wifi_scan" });

		await (panel as any)._handleFlasherCancel();

		expect(ctrl.usbFlashState).toBeNull();
		expect(ctrl.serialPort).toBeNull();
	});

	it("captures IP hint when cancelling from wifi_configured state", () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		ctrl.updateUsbState({ step: "wifi_configured", ip: "192.168.1.42" });

		(panel as any)._handleFlasherCancel();

		expect(ctrl.cancelledDeviceIpHint).toBe("192.168.1.42");
	});

	it("does NOT capture IP hint when cancelling from other states", () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		ctrl.updateUsbState({ step: "wifi_scan" });

		(panel as any)._handleFlasherCancel();

		expect(ctrl.cancelledDeviceIpHint).toBeNull();
	});

	it("keeps usbFlashState up until the serial teardown resolves (Cancelling… feedback)", async () => {
		// While the port is still unwinding (~1-2s) the flash screen — with
		// epp-flasher-view's disabled "Cancelling…" button — must stay up.
		// Clearing usbFlashState first re-renders the variant picker while
		// the port is still closing.
		const ctrl = (panel as any)._flasherCtrl;
		let resolveClose!: () => void;
		mockPort.close = vi.fn().mockReturnValue(
			new Promise<void>((r) => {
				resolveClose = r;
			}),
		);
		ctrl.serialPort = mockPort;
		ctrl.updateUsbState({ step: "wifi_check" });

		const p = (panel as any)._handleFlasherCancel();
		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toEqual({ step: "wifi_check" });

		resolveClose();
		await p;
		expect(ctrl.usbFlashState).toBeNull();
	});

	it("closes the port after the in-flight op settles, so the next flash can re-open it", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = mockPort;
		ctrl.updateUsbState({ step: "wifi_check" });

		await (panel as any)._handleFlasherCancel();

		// Earlier we left the port open to avoid a Chrome crash on locked
		// streams, but that meant subsequent flash attempts hit "Serial
		// port busy". Now we abort + await the in-flight op first so locks
		// release before close().
		expect(mockPort.close).toHaveBeenCalledTimes(1);
	});
});

// =========================================================
// Inline event handlers on epp-flasher-view in render()
// =========================================================
describe("epp-flasher-view inline event handlers", () => {
	let panel: EPPGridPanel;
	let container: HTMLDivElement;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		// Put panel in flasher tab so epp-flasher-view is rendered
		(panel as any)._panelTab = "flasher";
		// Ensure flasher ctrl has hass so loadDevices doesn't choke
		(panel as any)._flasherCtrl.hass = (panel as any).hass;
		container = document.createElement("div");
		document.body.appendChild(container);
		render((panel as any).render(), container);
	});

	afterEach(() => {
		container.remove();
	});

	function getFlasherView(): Element {
		const el = container.querySelector("epp-flasher-view");
		if (!el) throw new Error("epp-flasher-view not found");
		return el;
	}

	it("@flash-complete calls resetUsbState, _loadDevices, and switches to config tab", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const resetSpy = vi.spyOn(ctrl, "resetUsbState");
		const loadSpy = vi
			.spyOn(panel as any, "_loadDevices")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("flash-complete", { bubbles: true }),
		);

		expect(resetSpy).toHaveBeenCalled();
		expect(loadSpy).toHaveBeenCalled();
		expect((panel as any)._panelTab).toBe("config");
	});

	it("@usb-flash calls _handleUsbFlash with variant", () => {
		const spy = vi
			.spyOn(panel as any, "_handleUsbFlash")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-flash", {
				detail: { variant: "eppgrid-ble" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("eppgrid-ble");
	});

	it("@usb-retry with open port retries WiFi config instead of resetting", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const mockReader = { releaseLock: vi.fn() };
		const mockWriter = { releaseLock: vi.fn() };
		const mockPort = makeMockPort();
		(ctrl as any)._serialReader = mockReader;
		(ctrl as any)._serialWriter = mockWriter;
		ctrl.serialPort = mockPort;

		const wifiSpy = vi
			.spyOn(panel as any, "_handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(mockReader.releaseLock).toHaveBeenCalled();
		expect(mockWriter.releaseLock).toHaveBeenCalled();
		expect(wifiSpy).toHaveBeenCalled();
	});

	it("@usb-retry without port retries WiFi config (prompts for new port)", () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.serialPort = null;
		const wifiSpy = vi
			.spyOn(panel as any, "_handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(wifiSpy).toHaveBeenCalled();
	});

	it("@usb-retry re-runs flash when the error happened during flashing", () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.updateUsbState({
			step: "error",
			lastStep: "flashing",
			variant: "eppgrid-wifi",
			errorKey: "usb.errors.flash_failed",
		});

		const flashSpy = vi
			.spyOn(panel as any, "_handleUsbFlash")
			.mockResolvedValue(undefined);
		const wifiSpy = vi
			.spyOn(panel as any, "_handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(flashSpy).toHaveBeenCalledWith("eppgrid-wifi");
		expect(wifiSpy).not.toHaveBeenCalled();
	});

	it("@usb-retry re-runs flash when the error happened while connecting", () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.updateUsbState({
			step: "error",
			lastStep: "connecting",
			variant: "eppgrid-ble",
			errorKey: "usb.errors.flash_failed",
		});

		const flashSpy = vi
			.spyOn(panel as any, "_handleUsbFlash")
			.mockResolvedValue(undefined);
		const wifiSpy = vi
			.spyOn(panel as any, "_handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(flashSpy).toHaveBeenCalledWith("eppgrid-ble");
		expect(wifiSpy).not.toHaveBeenCalled();
	});

	it("@usb-retry retries WiFi config when the error happened during wifi steps", () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.updateUsbState({
			step: "error",
			lastStep: "wifi_scan",
			errorKey: "wifi.errors.scan_failed",
		});

		const flashSpy = vi
			.spyOn(panel as any, "_handleUsbFlash")
			.mockResolvedValue(undefined);
		const wifiSpy = vi
			.spyOn(panel as any, "_handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(wifiSpy).toHaveBeenCalled();
		expect(flashSpy).not.toHaveBeenCalled();
	});

	it("@wifi-scan calls _handleWifiScan", () => {
		const spy = vi
			.spyOn(panel as any, "_handleWifiScan")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("wifi-scan", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@wifi-provision calls _handleWifiProvision with ssid and password", () => {
		const spy = vi
			.spyOn(panel as any, "_handleWifiProvision")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("wifi-provision", {
				detail: { ssid: "HomeNet", password: "pass123" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("HomeNet", "pass123");
	});

	// The @wifi-complete listener was removed along with the flasher view's
	// unreachable connected-confirmation screen — real success flows through
	// @flash-complete (covered above).

	it("@update-firmware calls flasherCtrl.startOta", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi.spyOn(ctrl, "startOta").mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("update-firmware", {
				detail: { mac: "aa:bb:cc" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("aa:bb:cc");
	});

	it("@retry-ota dismisses the error then starts a fresh OTA", () => {
		// "Retry" used to only clear the error — the user needed a second
		// click on "Update" to actually retry. The handler must chain
		// dismissOtaError + startOta.
		const ctrl = (panel as any)._flasherCtrl;
		const dismissSpy = vi.spyOn(ctrl, "dismissOtaError");
		const startSpy = vi.spyOn(ctrl, "startOta").mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("retry-ota", {
				detail: { mac: "aa:bb:cc" },
				bubbles: true,
			}),
		);

		expect(dismissSpy).toHaveBeenCalledWith("aa:bb:cc");
		expect(startSpy).toHaveBeenCalledWith("aa:bb:cc");
	});

	it("@retry-ota issues an eppgrid/update_firmware WS call", () => {
		// End-to-end through the real controller: the retry click must reach
		// the backend, not just mutate frontend state.
		getFlasherView().dispatchEvent(
			new CustomEvent("retry-ota", {
				detail: { mac: "aa:bb:cc" },
				bubbles: true,
			}),
		);

		expect((panel as any).hass.callWS).toHaveBeenCalledWith({
			type: "eppgrid/update_firmware",
			mac: "aa:bb:cc",
		});
	});

	it("switching to flasher tab resets stale usbFlashState", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		ctrl.usbFlashState = { step: "complete", variant: "ethernet-ble-co2" };
		const resetSpy = vi.spyOn(ctrl, "resetUsbState");

		// Simulate clicking the "Flash Firmware" tab
		const tabButtons = container.querySelectorAll(".tab");
		const flasherTab = Array.from(tabButtons).find(
			(btn) => btn.textContent?.trim() === "tabs.flash_firmware",
		) as HTMLElement;
		expect(flasherTab).toBeTruthy();
		flasherTab.click();

		expect(resetSpy).toHaveBeenCalled();
		// resetUsbState defers the state clear until its (here: instant —
		// no port open) teardown resolves.
		await new Promise((r) => setTimeout(r, 0));
		expect(ctrl.usbFlashState).toBeNull();
	});
});
