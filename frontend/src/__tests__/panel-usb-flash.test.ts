/**
 * Panel-level tests for the USB flash flow: event wiring from
 * epp-flasher-view to FlasherController, and the themed delete-confirm
 * dialog backing the controller's confirmDeleteOriginalFirmware hook.
 *
 * The flow logic itself (flash / provision / scan / retry / cancel) is
 * tested in controllers/usb-flash-flow.test.ts.
 */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlasherController } from "../controllers/flasher-controller.js";
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

/** The controller-owned flow instance (private — test back door). */
function flowOf(ctrl: FlasherController): any {
	return (ctrl as any)._flow;
}

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

	it("@usb-flash calls the controller's handleUsbFlash with variant", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi.spyOn(ctrl, "handleUsbFlash").mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-flash", {
				detail: { variant: "eppgrid-ble" },
				bubbles: true,
			}),
		);

		expect(spy).toHaveBeenCalledWith("eppgrid-ble");
	});

	it("@usb-wifi-config calls the controller's handleUsbWifiConfig", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi
			.spyOn(ctrl, "handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-wifi-config", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@retry-ha-add calls the controller's handleRetryHaAdd", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi.spyOn(ctrl, "handleRetryHaAdd").mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("retry-ha-add", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@flasher-cancel calls the controller's handleFlasherCancel", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi
			.spyOn(ctrl, "handleFlasherCancel")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("flasher-cancel", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@usb-retry with open port retries WiFi config instead of resetting", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const mockReader = { releaseLock: vi.fn() };
		const mockWriter = { releaseLock: vi.fn() };
		const mockPort = makeMockPort();
		flowOf(ctrl)._serialReader = mockReader;
		flowOf(ctrl)._serialWriter = mockWriter;
		ctrl.serialPort = mockPort;

		const wifiSpy = vi
			.spyOn(flowOf(ctrl), "handleUsbWifiConfig")
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
			.spyOn(flowOf(ctrl), "handleUsbWifiConfig")
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
			.spyOn(flowOf(ctrl), "handleUsbFlash")
			.mockResolvedValue(undefined);
		const wifiSpy = vi
			.spyOn(flowOf(ctrl), "handleUsbWifiConfig")
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
			.spyOn(flowOf(ctrl), "handleUsbFlash")
			.mockResolvedValue(undefined);
		const wifiSpy = vi
			.spyOn(flowOf(ctrl), "handleUsbWifiConfig")
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
			.spyOn(flowOf(ctrl), "handleUsbFlash")
			.mockResolvedValue(undefined);
		const wifiSpy = vi
			.spyOn(flowOf(ctrl), "handleUsbWifiConfig")
			.mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true }),
		);

		expect(wifiSpy).toHaveBeenCalled();
		expect(flashSpy).not.toHaveBeenCalled();
	});

	it("@wifi-scan calls the controller's handleWifiScan", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi.spyOn(ctrl, "handleWifiScan").mockResolvedValue(undefined);

		getFlasherView().dispatchEvent(
			new CustomEvent("wifi-scan", { bubbles: true }),
		);

		expect(spy).toHaveBeenCalled();
	});

	it("@wifi-provision calls the controller's handleWifiProvision with ssid and password", () => {
		const ctrl = (panel as any)._flasherCtrl;
		const spy = vi
			.spyOn(ctrl, "handleWifiProvision")
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

// =========================================================
// Flasher delete-confirm dialog — themed template-dialog
// replacement for the old window.confirm()
// =========================================================
describe("flasher delete-confirm dialog", () => {
	let panel: EPPGridPanel;
	let container: HTMLDivElement;

	beforeEach(() => {
		vi.clearAllMocks();
		resetServiceMocks();
		panel = createPanel();
		(panel as any)._panelTab = "flasher";
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	function rerender() {
		render((panel as any).render(), container);
	}

	function getDialogButton(label: string): HTMLElement {
		const buttons = container.querySelectorAll(
			".template-dialog .template-dialog-actions button",
		);
		const btn = Array.from(buttons).find((b) =>
			b.textContent?.includes(label),
		) as HTMLElement;
		if (!btn) throw new Error(`dialog button "${label}" not found`);
		return btn;
	}

	it("wires confirmDeleteOriginalFirmware on the flasher controller", () => {
		const ctrl = (panel as any)._flasherCtrl;
		expect(typeof ctrl.confirmDeleteOriginalFirmware).toBe("function");
	});

	it("shows the themed template-dialog when the flow requests confirmation", () => {
		const ctrl = (panel as any)._flasherCtrl;
		void ctrl.confirmDeleteOriginalFirmware();
		rerender();

		const dialog = container.querySelector(".template-dialog");
		expect(dialog).not.toBeNull();
		expect(dialog?.textContent).toContain("flasher.confirm_delete_message");
	});

	it("resolves true and closes the dialog when the user confirms", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const promise = ctrl.confirmDeleteOriginalFirmware();
		rerender();

		getDialogButton("common.delete").click();

		await expect(promise).resolves.toBe(true);
		rerender();
		expect(container.querySelector(".template-dialog")).toBeNull();
	});

	it("resolves false and closes the dialog when the user cancels", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const promise = ctrl.confirmDeleteOriginalFirmware();
		rerender();

		getDialogButton("common.cancel").click();

		await expect(promise).resolves.toBe(false);
		rerender();
		expect(container.querySelector(".template-dialog")).toBeNull();
	});

	it("does not use window.confirm", async () => {
		const confirmSpy = vi.fn().mockReturnValue(true);
		vi.stubGlobal("confirm", confirmSpy);

		const ctrl = (panel as any)._flasherCtrl;
		const promise = ctrl.confirmDeleteOriginalFirmware();
		rerender();
		getDialogButton("common.delete").click();
		await promise;

		expect(confirmSpy).not.toHaveBeenCalled();
	});

	it("resolves a stale pending confirm as cancelled when a new one starts", async () => {
		const ctrl = (panel as any)._flasherCtrl;
		const first = ctrl.confirmDeleteOriginalFirmware();
		const second = ctrl.confirmDeleteOriginalFirmware();

		// The superseded confirm must unwind its awaiting flow (as decline),
		// not hang forever.
		await expect(first).resolves.toBe(false);

		rerender();
		getDialogButton("common.delete").click();
		await expect(second).resolves.toBe(true);
	});
});
