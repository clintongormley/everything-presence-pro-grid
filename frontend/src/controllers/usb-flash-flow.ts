import type { WifiNetwork } from "../lib/improv-serial.js";
import {
	detectIpAddress,
	flashFirmware,
	queryImprovState,
	runWifiProvision,
	runWifiScan,
} from "../lib/usb-flash-service.js";
import type { FlashableDevice, HaAddResult, UsbFlashState } from "../types.js";

/**
 * What the USB flash flow needs from its owner (FlasherController in
 * practice — the controller passes itself, and tsc verifies it
 * structurally satisfies this contract, same pattern as PanelHost).
 */
export interface UsbFlashHost {
	hass: any;
	readonly opId: number;
	opRunning: boolean;
	usbFlashState: UsbFlashState | null;
	wifiNetworks: WifiNetwork[];
	flashableDevices: FlashableDevice[];
	firmwareBaseUrl: string;
	/**
	 * Host hook — ask the user to confirm deleting an original-firmware
	 * device's old ESPHome config entry before flashing over it. The panel
	 * wires this to its themed template-dialog. Resolves true to proceed
	 * (delete + flash) or false to abort the flash cleanly. When the hook
	 * is not wired, the flow aborts (safe default — never delete without
	 * an explicit confirmation).
	 */
	confirmDeleteOriginalFirmware?: () => Promise<boolean>;
	bumpOpId(): void;
	updateUsbState(state: UsbFlashState): void;
	resetUsbState(): Promise<void>;
	setCancelledDeviceIpHint(ip: string | null): void;
	deleteEsphomeDevice(configEntryId: string): Promise<void>;
	addEsphomeDevice(host: string): Promise<HaAddResult>;
}

// After a fresh WiFi association the device's API socket / mDNS / DHCP can
// take up to ~50s to settle. Retry at a steady 10s cadence so the UI has
// predictable progress rather than front-loaded flurry + long silence.
const HA_ADD_RETRY_DELAY_MS = 10_000;
const HA_ADD_MAX_ATTEMPTS = 6;

/**
 * UsbFlashFlow owns the USB flash / WiFi-provisioning pipeline and all of
 * its serial-port state (port + reader/writer locks + in-flight wifi_check
 * abort handles). It is created and owned by FlasherController, which
 * exposes thin `handle*` delegates for the panel's view-event handlers.
 *
 * Cancellation model: every async step snapshots `host.opId` on entry and
 * bails out when the id moved (the controller bumps it on cancel/reset/tab
 * switch). The flow never renders — it publishes progress exclusively via
 * `host.updateUsbState()`.
 */
export class UsbFlashFlow {
	private _host: UsbFlashHost;
	private _serialPort: SerialPort | null = null;
	// Serial reader/writer locks held during the USB flash / WiFi
	// provisioning flow.
	private _serialReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
	private _serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
	// In-flight wifi_check (queryImprovState) abort + settle handles, so
	// teardown paths can abort the poll and wait for it to release its
	// serial locks before close().
	private _wifiCheckAbort: AbortController | null = null;
	private _wifiCheckPromise: Promise<unknown> | null = null;

	constructor(host: UsbFlashHost) {
		this._host = host;
	}

	get serialPort(): SerialPort | null {
		return this._serialPort;
	}

	set serialPort(port: SerialPort | null) {
		this._serialPort = port;
	}

	// Releases any held reader/writer locks before closing the port.
	// close() rejects with "the port has a readable or writable stream"
	// while a lock is still held, leaving the port half-open and unusable
	// until the page reloads. Returns the close promise so callers that
	// need the port fully released (resetUsbState) can await it.
	tearDownSerialPort(): Promise<void> {
		try {
			this._serialReader?.releaseLock();
		} catch {}
		try {
			this._serialWriter?.releaseLock();
		} catch {}
		this._serialReader = null;
		this._serialWriter = null;
		const closing =
			this._serialPort?.close().catch(() => {}) ?? Promise.resolve();
		this._serialPort = null;
		return closing;
	}

	/**
	 * Abort any in-flight wifi_check (queryImprovState poll), wait for it
	 * to settle so its serial locks are released, then tear down the port.
	 * The abort + handle-nulling run synchronously (before the first
	 * await), so fire-and-forget callers still invalidate the in-flight op
	 * immediately.
	 */
	async cancelAndTearDown(): Promise<void> {
		const abort = this._wifiCheckAbort;
		const inFlight = this._wifiCheckPromise;
		this._wifiCheckAbort = null;
		this._wifiCheckPromise = null;
		abort?.abort();
		if (inFlight) {
			try {
				await inFlight;
			} catch {
				/* aborted op rejecting is expected */
			}
		}
		await this.tearDownSerialPort();
	}

	async handleUsbWifiConfig(): Promise<void> {
		const host = this._host;
		if (host.opRunning) {
			host.updateUsbState({
				step: "error",
				errorKey: "usb.errors.serial_port_busy",
				fatal: true,
			});
			return;
		}
		const myOp = host.opId;
		host.opRunning = true;
		try {
			if (!this._serialPort) {
				host.updateUsbState({ step: "connecting" });
				this._serialPort = await navigator.serial.requestPort();
			}
			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}

			host.updateUsbState({ step: "wifi_scan" });
			const { writer, reader, networks } = await runWifiScan(this._serialPort);
			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}

			host.wifiNetworks = networks;
			host.updateUsbState({ step: "wifi_provision" });

			this._serialWriter = writer;
			this._serialReader = reader;
			host.opRunning = false;
		} catch (err: any) {
			host.opRunning = false;
			if (host.opId !== myOp) return;
			if (err?.name === "NotFoundError") {
				void host.resetUsbState();
				return;
			}
			const lastStep = host.usbFlashState?.step;
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
			};
			host.updateUsbState({
				step: "error",
				lastStep,
				errorKey: e.errorKey ?? "wifi.errors.scan_failed",
				errorParams: e.errorParams as
					| Record<string, string | number>
					| undefined,
			});
		}
	}

	async handleUsbFlash(variant: string): Promise<void> {
		const host = this._host;
		if (host.opRunning) {
			host.updateUsbState({
				step: "error",
				errorKey: "usb.errors.serial_port_busy",
				fatal: true,
			});
			return;
		}
		const myOp = host.opId;
		host.opRunning = true;
		try {
			// Step 1: Request serial port
			host.updateUsbState({ step: "connecting" });
			const port = await navigator.serial.requestPort();
			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}
			this._serialPort = port;

			// Step 2: Flash firmware
			host.updateUsbState({ step: "flashing", progress: 0 });
			await flashFirmware(
				port,
				variant,
				(pct) => {
					host.updateUsbState({ step: "flashing", progress: pct });
				},
				{
					baseUrl: host.firmwareBaseUrl,
					accessToken: host.hass?.auth?.accessToken,
					beforeFlash: async (mac: string | undefined) => {
						if (!mac) return;
						const matched = host.flashableDevices.find(
							(d) => d.mac.toUpperCase() === mac,
						);
						if (
							matched?.firmware_type === "original" &&
							matched?.esphome_config_entry_id
						) {
							const ok =
								(await host.confirmDeleteOriginalFirmware?.()) ?? false;
							if (!ok)
								throw Object.assign(new Error("Flash cancelled"), {
									errorKey: "flasher.errors.flash_cancelled",
								});
							await host.deleteEsphomeDevice(matched.esphome_config_entry_id);
						}
					},
				},
			);
			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}

			if (variant.startsWith("ethernet")) {
				// Ethernet variants have no WiFi — skip provisioning
				await port.close().catch(() => {});
				this._serialPort = null;
				host.opRunning = false;
				host.updateUsbState({ step: "complete", variant });
				return;
			}

			// Step 3: Check if device is already provisioned (firmware-upgrade path)
			host.updateUsbState({ step: "wifi_check" });
			let skipIp: string | null = null;
			let skipWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
			let skipReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
			try {
				// After a fresh flash the device cold-boots, loads creds from NVS, then
				// re-associates with WiFi + gets DHCP. The Improv URL (which carries the
				// IP we need) only shows up after that full sequence — often 7-10s, up
				// to 20s on a slow AP. Use a generous readDelay so we don't fall through
				// to wifi_scan on a device that actually has valid creds.
				// AbortController + in-flight promise tracking so
				// handleFlasherCancel can both signal abort AND await the
				// op's settlement before closing the port (otherwise the
				// reader lock is still held when close() runs and close
				// rejects, leaving the port open and unusable for retries).
				const abortCtrl = new AbortController();
				this._wifiCheckAbort = abortCtrl;
				const queryPromise = queryImprovState(
					port,
					{ readDelay: 30000 },
					{ signal: abortCtrl.signal },
				);
				this._wifiCheckPromise = queryPromise;
				const info = await queryPromise;
				this._wifiCheckAbort = null;
				this._wifiCheckPromise = null;
				// queryImprovState returns ip only for a real detected address
				// (undefined otherwise — no 0.0.0.0 sentinel).
				if (info.state === "PROVISIONED" && info.ip) {
					skipIp = info.ip;
					skipWriter = info.writer;
					skipReader = info.reader;
				} else {
					try {
						info.writer.releaseLock();
					} catch {}
					try {
						info.reader.releaseLock();
					} catch {}
				}
			} catch {
				// Fall through to scan flow — runWifiScan has its own handshake-with-retry.
			}

			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}

			if (skipIp && skipWriter && skipReader) {
				// Device is already on the network — release the query's serial locks
				// so `runWifiScan` can re-acquire them if the user clicks the
				// "Configure WiFi" override. Keep the port itself open and attached
				// to serialPort for that override path.
				try {
					skipReader.releaseLock();
				} catch {}
				try {
					skipWriter.releaseLock();
				} catch {}
				host.updateUsbState({
					step: "wifi_configured",
					ip: skipIp,
					autoSkipped: true,
				});
				host.opRunning = false;
				await this._addToHa(skipIp);
				return;
			}

			// Step 4: WiFi scan
			host.updateUsbState({ step: "wifi_scan" });
			const { writer, reader, networks } = await runWifiScan(port);
			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}

			host.wifiNetworks = networks;
			host.updateUsbState({ step: "wifi_provision" });

			this._serialWriter = writer;
			this._serialReader = reader;
			host.opRunning = false;
		} catch (err: any) {
			if (host.opId !== myOp) {
				host.opRunning = false;
				return;
			}
			if (err?.name === "NotFoundError") {
				// User cancelled port picker
				void host.resetUsbState();
				return;
			}
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
				name?: string;
			};
			// User-cancel from the original-firmware confirm dialog throws
			// flasher.errors.flash_cancelled. The pre-fix path landed in the
			// generic "error" UI because lastStep was already "flashing";
			// surface this as a clean reset so the user can pick a different
			// device or retry without a confusing failure banner.
			if (e.errorKey === "flasher.errors.flash_cancelled") {
				if (this._serialPort) {
					try {
						await this._serialPort.close().catch(() => {});
					} catch {}
					this._serialPort = null;
				}
				host.opRunning = false;
				void host.resetUsbState();
				return;
			}
			const lastStep = host.usbFlashState?.step;
			// Clean up port on error — don't leave it dangling. Await the
			// close so the "error" UI renders only after the port is fully
			// released (unawaited close left the port lock pending and the
			// next retry surfaced as "serial port busy").
			if (this._serialPort) {
				try {
					await this._serialPort.close().catch(() => {});
				} catch {}
				this._serialPort = null;
			}
			const msg = e.message ?? "Unknown error";
			const isPortBusy = /already open|already closed/i.test(msg);
			const isDisconnect =
				/stream stopped|NetworkError|disconnected|break|lost|No response from device/i.test(
					msg,
				);
			const fallbackKey = isPortBusy
				? "usb.errors.serial_port_busy"
				: isDisconnect
					? "usb.errors.device_disconnected"
					: "usb.errors.flash_failed";
			host.opRunning = false;
			host.updateUsbState({
				step: "error",
				lastStep,
				variant,
				errorKey: e.errorKey ?? fallbackKey,
				errorParams: e.errorParams as
					| Record<string, string | number>
					| undefined,
				fatal: isPortBusy || e.errorKey === "usb.errors.serial_port_busy",
			});
		}
	}

	async handleWifiProvision(ssid: string, password: string): Promise<void> {
		const host = this._host;
		const myOp = host.opId;
		const port = this._serialPort;
		if (!port?.writable || !port?.readable) {
			host.updateUsbState({
				step: "error",
				errorKey: "usb.errors.serial_port_unavailable",
			});
			return;
		}

		// Release any old reader/writer locks before getting fresh ones
		try {
			this._serialReader?.releaseLock();
		} catch {}
		try {
			this._serialWriter?.releaseLock();
		} catch {}

		const writer = port.writable.getWriter();
		const reader = port.readable.getReader();
		this._serialWriter = writer;
		this._serialReader = reader;

		try {
			host.updateUsbState({ step: "wifi_connecting" });
			console.debug(`[wifi-provision] sending WIFI_SETTINGS ssid="${ssid}"`);
			await runWifiProvision(writer, ssid, password);
			if (host.opId !== myOp) return;

			// Wait for PROVISIONED state (creds saved to NVS)
			host.updateUsbState({ step: "reading_ip" });
			const ip = await detectIpAddress(reader, writer, 60000);
			if (host.opId !== myOp) return;

			reader.releaseLock();
			writer.releaseLock();

			this._serialReader = null;
			this._serialWriter = null;
			await port.close().catch(() => {});
			this._serialPort = null;

			// WiFi side succeeded. Intermediate state while HA-add runs.
			host.updateUsbState({ step: "wifi_configured", ip });

			await this._addToHa(ip);
		} catch (err: any) {
			try {
				this._serialReader?.releaseLock();
			} catch {}
			try {
				this._serialWriter?.releaseLock();
			} catch {}
			this._serialReader = null;
			this._serialWriter = null;
			if (host.opId !== myOp) return;
			const lastStep = host.usbFlashState?.step;
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
			};
			host.updateUsbState({
				step: "error",
				lastStep,
				errorKey: e.errorKey ?? "wifi.errors.provisioning_failed",
				errorParams: e.errorParams as
					| Record<string, string | number>
					| undefined,
			});
		}
	}

	private async _addToHaWithRetry(ip: string): Promise<HaAddResult> {
		const host = this._host;
		const myOp = host.opId;
		const maxAttempts = HA_ADD_MAX_ATTEMPTS;
		const delay = HA_ADD_RETRY_DELAY_MS;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			if (attempt > 1) {
				host.updateUsbState({
					step: "wifi_configured",
					ip,
					haAddAttempt: attempt,
					haAddMaxAttempts: maxAttempts,
				});
				const cancelled = await this._sleepUntilOpChanges(delay, myOp);
				if (cancelled) return { type: "cannot_connect" };
			}

			let haAdd: HaAddResult;
			try {
				haAdd = await host.addEsphomeDevice(ip);
			} catch (err) {
				const msg = (err as { message?: string })?.message;
				return { type: "failed", reason: msg ?? "unknown" };
			}
			if (host.opId !== myOp) return haAdd;
			if (haAdd.type !== "cannot_connect") return haAdd;
		}
		return { type: "cannot_connect" };
	}

	// Sleep up to `ms`, waking early (returning true) if opId changes so cancel
	// doesn't have to wait out the full backoff. Polls at 250ms granularity.
	private async _sleepUntilOpChanges(
		ms: number,
		expectedOpId: number,
	): Promise<boolean> {
		const host = this._host;
		const step = 250;
		let remaining = ms;
		while (remaining > 0) {
			if (host.opId !== expectedOpId) return true;
			const chunk = Math.min(remaining, step);
			await new Promise((r) => setTimeout(r, chunk));
			remaining -= chunk;
		}
		return host.opId !== expectedOpId;
	}

	private async _addToHa(ip: string): Promise<void> {
		const host = this._host;
		const myOp = host.opId;

		const haAdd = await this._addToHaWithRetry(ip);
		if (host.opId !== myOp) return;

		host.updateUsbState({ step: "complete", ip, haAdd });
	}

	async handleRetryHaAdd(): Promise<void> {
		const host = this._host;
		const state = host.usbFlashState;
		if (state?.step !== "complete" || !state.ip) return;

		const ip = state.ip;
		const myOp = host.opId;
		host.updateUsbState({ step: "wifi_configured", ip });
		const haAdd = await this._addToHaWithRetry(ip);
		if (host.opId !== myOp) return;
		host.updateUsbState({ step: "complete", ip, haAdd });
	}

	handleUsbRetry(): void {
		const state = this._host.usbFlashState;
		const lastStep = state?.lastStep;
		const variant = state?.variant;
		try {
			this._serialReader?.releaseLock();
		} catch {}
		try {
			this._serialWriter?.releaseLock();
		} catch {}
		this._serialReader = null;
		this._serialWriter = null;
		// Route retry to the step that actually failed. Flash-phase failures
		// (connecting, flashing, wifi_check) re-run the full flash; WiFi-phase
		// failures retry the WiFi config flow (which prompts for a new port).
		const isFlashPhase =
			lastStep === "connecting" ||
			lastStep === "flashing" ||
			lastStep === "wifi_check";
		if (isFlashPhase && variant) {
			void this.handleUsbFlash(variant);
		} else {
			void this.handleUsbWifiConfig();
		}
	}

	async handleFlasherCancel(): Promise<void> {
		const host = this._host;
		const state = host.usbFlashState;
		if (state?.step === "wifi_configured" && state.ip) {
			host.setCancelledDeviceIpHint(state.ip);
		}
		host.opRunning = false;
		// resetUsbState bumps opId, aborts any in-flight polling
		// (queryImprovState during wifi_check), waits for the aborted op to
		// settle so its serial locks are released, and only then closes the
		// port — close() while a lock is still held rejects with "the port
		// has a readable or writable stream" and leaves the port open +
		// unusable for the next flash attempt. It clears usbFlashState only
		// after that teardown, so the view's "Cancelling…" feedback stays up
		// for the duration of the unwind.
		await host.resetUsbState();
	}

	async handleWifiScan(): Promise<void> {
		const host = this._host;
		if (!this._serialPort) return;
		host.bumpOpId();
		const myOp = host.opId;
		try {
			host.updateUsbState({ step: "wifi_scan" });
			// Release old locks before re-scanning
			try {
				this._serialReader?.releaseLock();
			} catch {}
			try {
				this._serialWriter?.releaseLock();
			} catch {}

			const result = await runWifiScan(this._serialPort);
			if (host.opId !== myOp) {
				// Cancelled or superseded while the scan was in flight — release
				// the fresh locks and bail out so we don't resurrect the flow.
				try {
					result.reader.releaseLock();
				} catch {}
				try {
					result.writer.releaseLock();
				} catch {}
				return;
			}
			this._serialWriter = result.writer;
			this._serialReader = result.reader;
			host.wifiNetworks = result.networks;
			host.updateUsbState({ step: "wifi_provision" });
		} catch (err: any) {
			if (host.opId !== myOp) return;
			console.error("WiFi scan failed:", err);
			const lastStep = host.usbFlashState?.step;
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
			};
			host.updateUsbState({
				step: "error",
				lastStep,
				errorKey: e.errorKey ?? "wifi.errors.scan_failed",
				errorParams: e.errorParams as
					| Record<string, string | number>
					| undefined,
			});
		}
	}
}
