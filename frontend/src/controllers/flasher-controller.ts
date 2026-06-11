import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { WifiNetwork } from "../lib/improv-serial.js";
import { safeUnsub } from "../lib/safe-unsub.js";
import type {
	FlashableDevice,
	HaAddResult,
	OtaDeviceState,
	UsbFlashState,
} from "../types.js";

/**
 * Backend supplies the firmware base URL — validate before we splice it into
 * manifest URLs or hand it to the esp-web-flasher iframe.
 *
 * Accepted: same-origin relative path (the HA backend's default
 * `/api/eppgrid/firmware`) or an absolute http(s):// URL. Rejects
 * `javascript:`, `data:`, `file:`, `vbscript:`, protocol-relative `//host`,
 * and anything else that could execute or escape origin.
 */
function sanitizeFirmwareBaseUrl(raw: unknown): string {
	if (typeof raw !== "string" || raw === "") return "";
	// Same-origin relative path (must NOT be protocol-relative `//host`).
	if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
	try {
		const u = new URL(raw);
		return u.protocol === "https:" || u.protocol === "http:" ? raw : "";
	} catch {
		return "";
	}
}

export class FlasherController implements ReactiveController {
	flashableDevices: FlashableDevice[] = [];
	firmwareBaseUrl = "";
	firmwareVersion = "";
	integrationVersion = "";
	loading = true;
	usbConnected = false;
	usbDeviceMac: string | null = null;
	usbExistingDevice: FlashableDevice | null = null;
	usbFlashState: UsbFlashState | null = null;
	wifiNetworks: WifiNetwork[] = [];
	otaStates: Record<string, OtaDeviceState> = {};
	cancelledDeviceIpHint: string | null = null;
	private _cancelledIpTimeout: ReturnType<typeof setTimeout> | null = null;

	onDeviceListChanged?: () => void;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubDeviceList?: () => void;
	private _serialPort: SerialPort | null = null;
	private _opId = 0;
	private _opRunning = false;
	private _otaUnsubs: Record<string, () => void> = {};
	private _otaTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
	// Generation token for OTA subscriptions. Bumped on hostDisconnected and
	// connection swap so a late-resolving subscribeMessage promise releases
	// its unsub instead of stashing it on a torn-down/stale controller.
	private _otaGen = 0;
	// Generation token for the flashable-devices subscription. Bumped on
	// (un)subscribe and connection swap so a late-resolving subscribeMessage
	// promise drops its unsub instead of stashing it on a torn-down controller.
	private _deviceListGen = 0;
	// Subscription *intent* — true between subscribeDeviceList() entry and
	// unsubscribeDeviceList()/hostDisconnected(). Distinct from
	// `_unsubDeviceList`, which only tracks *completed* subscriptions; we
	// need intent so a connection swap mid-`subscribeMessage()` still
	// triggers resubscribe instead of silently dropping the request.
	private _wantDeviceListSub = false;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {}
	hostDisconnected(): void {
		this._wantDeviceListSub = false;
		this.unsubscribeDeviceList();
		this._tearDownSerialPort();
		this._otaGen++;
		for (const mac of Object.keys(this._otaUnsubs)) {
			this._unsubOta(mac);
		}
		for (const mac of Object.keys(this._otaTimeouts)) {
			this._resetOtaTimeout(mac);
		}
		this.otaStates = {};
		if (this._cancelledIpTimeout) {
			clearTimeout(this._cancelledIpTimeout);
			this._cancelledIpTimeout = null;
		}
	}

	// Releases any held reader/writer locks before closing the port.
	// close() rejects with "the port has a readable or writable stream"
	// while a lock is still held, leaving the port half-open and unusable
	// until the page reloads.
	private _tearDownSerialPort(): void {
		try {
			(this as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(this as any)._serialWriter?.releaseLock();
		} catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		this._serialPort?.close().catch(() => {});
		this._serialPort = null;
	}

	// otaStates is bound by the panel as `.otaStates=${ctrl.otaStates}` on
	// epp-flasher-view; Lit dirty-checks the property by reference. Every
	// transition must REASSIGN the Record (never mutate in place), or
	// progress/success/error would only repaint on unrelated hass churn.
	private _setOtaState(mac: string, next: OtaDeviceState): void {
		this.otaStates = { ...this.otaStates, [mac]: next };
	}

	private _deleteOtaState(mac: string): void {
		if (!(mac in this.otaStates)) return;
		const { [mac]: _removed, ...rest } = this.otaStates;
		this.otaStates = rest;
	}

	async startOta(mac: string): Promise<void> {
		// Already updating — a second click (or a retry race) must not fire
		// a duplicate update_firmware call / progress subscription.
		if (this.otaStates[mac]?.state === "updating") return;
		const token = this._otaGen;
		this._setOtaState(mac, { state: "updating", progress: 0, errorKey: null });
		this._host.requestUpdate();

		try {
			await this._hass!.callWS({
				type: "eppgrid/update_firmware",
				mac,
			});
		} catch {
			if (this._otaGen !== token) return;
			this._setOtaState(mac, {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.start_failed",
			});
			this._host.requestUpdate();
			return;
		}
		if (this._otaGen !== token) return;

		try {
			const unsub = await this._hass!.connection.subscribeMessage(
				(event: any) => {
					this._handleOtaEvent(mac, event);
				},
				{ type: "eppgrid/subscribe_ota_progress", mac },
			);
			if (this._otaGen !== token) {
				// Disconnected / connection swapped while subscribing — the
				// controller no longer wants this subscription.
				try {
					unsub();
				} catch {}
				return;
			}
			// Never orphan a previous subscription's unsub for this mac.
			this._unsubOta(mac);
			this._otaUnsubs[mac] = unsub;
			// Start initial timeout — if no progress events arrive at all,
			// the device rejected the update or something went wrong
			this._startOtaTimeout(mac, 15000);
		} catch {
			if (this._otaGen !== token) return;
			this._setOtaState(mac, {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.connect_failed",
			});
			this._host.requestUpdate();
		}
	}

	private _handleOtaEvent(mac: string, event: any): void {
		switch (event.state) {
			case "updating": {
				const progress = event.progress ?? null;
				if (progress != null && progress >= 100) {
					this._otaSuccess(mac);
				} else {
					this._setOtaState(mac, {
						state: "updating",
						progress,
						errorKey: null,
					});
					this._startOtaTimeout(
						mac,
						progress != null && progress > 0 ? 10000 : 15000,
					);
				}
				break;
			}
			case "success":
				this._otaSuccess(mac);
				break;
			case "error": {
				const errorKey: string =
					event.error_key ?? "flasher.errors.update_failed_generic";
				this._setOtaState(mac, {
					state: "error",
					progress: null,
					errorKey,
					// Log-derived OTA failures carry the device's message; the
					// ota_device_error translation interpolates {message}.
					errorParams: { message: event.message ?? "" },
				});
				this._resetOtaTimeout(mac);
				this._unsubOta(mac);
				break;
			}
			default:
				// Unknown state — leave the watchdog armed so a stuck device
				// still trips the existing timeout instead of spinning forever.
				break;
		}
		this._host.requestUpdate();
	}

	private _otaSuccess(mac: string): void {
		this._setOtaState(mac, {
			state: "success",
			progress: null,
			errorKey: null,
		});
		this._unsubOta(mac);
		this._resetOtaTimeout(mac);
		this._otaTimeouts[mac] = setTimeout(() => {
			delete this._otaTimeouts[mac];
			if (this.otaStates[mac]?.state === "success") {
				this._deleteOtaState(mac);
				this._host.requestUpdate();
			}
		}, 5000);
	}

	private _startOtaTimeout(mac: string, ms: number): void {
		this._resetOtaTimeout(mac);
		this._otaTimeouts[mac] = setTimeout(() => {
			const ota = this.otaStates[mac];
			if (!ota || ota.state !== "updating") return;
			if (ota.progress != null && ota.progress > 0) {
				// Had progress then stopped — connection lost
				this._setOtaState(mac, {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.connection_lost",
				});
			} else {
				// No progress ever received — update failed to start
				this._setOtaState(mac, {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.update_timeout",
				});
			}
			this._unsubOta(mac);
			this._host.requestUpdate();
		}, ms);
	}

	private _resetOtaTimeout(mac: string): void {
		const t = this._otaTimeouts[mac];
		if (t) {
			clearTimeout(t);
			delete this._otaTimeouts[mac];
		}
	}

	dismissOtaError(mac: string): void {
		this._unsubOta(mac);
		this._resetOtaTimeout(mac);
		this._deleteOtaState(mac);
		this._host.requestUpdate();
	}

	private _unsubOta(mac: string): void {
		const unsub = this._otaUnsubs[mac];
		if (unsub) {
			try {
				unsub();
			} catch {
				/* stale subscription — invoke can throw if the socket died */
			}
			delete this._otaUnsubs[mac];
		}
	}

	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		const oldConn = this._hass?.connection;
		this._hass = value;
		if (value?.connection && value.connection !== oldConn && oldConn) {
			// Connection swap (HA reconnect / hass replacement): every unsub
			// we hold belongs to the dead socket. Drop them, clear OTA
			// watchdog timers, and forget any in-flight OTA state — the
			// device's actual update progress is unrecoverable from the new
			// connection, and leaving "updating" on screen would be a lie.
			//
			// Use subscription *intent* (`_wantDeviceListSub`), not the
			// completed-subscription flag (`_unsubDeviceList`): if the panel
			// fired off subscribeDeviceList() without awaiting and the swap
			// lands while subscribeMessage() is still pending, the unsub
			// hasn't been stashed yet — gating on it would silently drop the
			// request and leave the flasher tab stale after the reconnect.
			const wantsSub = this._wantDeviceListSub;
			this._unsubDeviceList = undefined;
			this._deviceListGen++;
			this._otaGen++;
			for (const mac of Object.keys(this._otaUnsubs)) {
				delete this._otaUnsubs[mac];
			}
			for (const mac of Object.keys(this._otaTimeouts)) {
				this._resetOtaTimeout(mac);
			}
			this.otaStates = {};
			this._host.requestUpdate();
			if (wantsSub) {
				// .catch in case subscribeDeviceList ever throws outside its
				// try/catch (loadDevices / sanitizeFirmwareBaseUrl etc.) —
				// fire-and-forget without a rejection handler would surface
				// as an unhandled promise rejection.
				void this.subscribeDeviceList().catch(() => {});
			}
		}
	}

	async loadDevices(): Promise<void> {
		if (!this._hass) {
			this.loading = false;
			this._host.requestUpdate();
			return;
		}
		try {
			const resp = await this._hass.callWS({
				type: "eppgrid/list_flashable_devices",
			});
			this.flashableDevices = resp.devices;
			this.firmwareBaseUrl = sanitizeFirmwareBaseUrl(resp.firmware_base_url);
			this.firmwareVersion = resp.latest_firmware_version ?? "";
		} catch {
			this.flashableDevices = [];
		}
		this.loading = false;
		this._host.requestUpdate();
	}

	async subscribeDeviceList(): Promise<void> {
		// Mark intent first, then inline the unsubscribe-style teardown
		// (gen bump + safeUnsub of any prior unsub). We can't reuse
		// unsubscribeDeviceList() here because it clears
		// `_wantDeviceListSub` — and we need that flag to stay true so a
		// connection swap landing while subscribeMessage() is in flight
		// still triggers a resubscribe.
		this._wantDeviceListSub = true;
		this._deviceListGen++;
		safeUnsub(this._unsubDeviceList);
		this._unsubDeviceList = undefined;
		if (!this._hass) return;
		const token = ++this._deviceListGen;
		try {
			const unsub = await this._hass.connection.subscribeMessage(
				(msg: any) => {
					this._applyDeviceList(msg);
				},
				{ type: "eppgrid/subscribe_flashable_devices" },
			);
			if (this._deviceListGen !== token) {
				try {
					unsub();
				} catch {}
				return;
			}
			this._unsubDeviceList = unsub;
		} catch {
			await this.loadDevices();
		}
	}

	unsubscribeDeviceList(): void {
		this._wantDeviceListSub = false;
		this._deviceListGen++;
		safeUnsub(this._unsubDeviceList);
		this._unsubDeviceList = undefined;
	}

	private _applyDeviceList(resp: any): void {
		this.flashableDevices = resp.devices ?? [];
		this.firmwareBaseUrl = sanitizeFirmwareBaseUrl(resp.firmware_base_url);
		this.firmwareVersion = resp.latest_firmware_version ?? "";
		this.integrationVersion = resp.integration_version ?? "";
		this.loading = false;
		this.onDeviceListChanged?.();
		this._host.requestUpdate();
		this._checkOtaDevicesOffline();
	}

	private _checkOtaDevicesOffline(): void {
		for (const [mac, ota] of Object.entries(this.otaStates)) {
			if (ota.state !== "updating") continue;
			const device = this.flashableDevices.find((d) => d.mac === mac);
			if (device && !device.available) {
				this._setOtaState(mac, {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.device_offline",
				});
				this._unsubOta(mac);
				this._resetOtaTimeout(mac);
				this._host.requestUpdate();
			}
		}
	}

	async deleteEsphomeDevice(configEntryId: string): Promise<void> {
		if (!this._hass) return;
		await this._hass.callWS({
			type: "eppgrid/delete_esphome_device",
			config_entry_id: configEntryId,
		});
	}

	async addEsphomeDevice(host: string): Promise<HaAddResult> {
		if (!this._hass) return { type: "failed", reason: "no_hass" };
		return (await this._hass.callWS({
			type: "eppgrid/add_esphome_device",
			host,
		})) as HaAddResult;
	}

	updateUsbState(state: UsbFlashState): void {
		this.usbFlashState = state;
		this._host.requestUpdate();
	}

	/** Increment to signal in-flight operations to bail out. */
	get opId(): number {
		return this._opId;
	}

	get opRunning(): boolean {
		return this._opRunning;
	}
	set opRunning(v: boolean) {
		this._opRunning = v;
	}

	resetUsbState(): void {
		this.usbFlashState = null;
		this.wifiNetworks = [];
		this._opId++;
		try {
			(this as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(this as any)._serialWriter?.releaseLock();
		} catch {}
		(this as any)._serialReader = null;
		(this as any)._serialWriter = null;
		this._serialPort = null;
		this._host.requestUpdate();
	}

	setCancelledDeviceIpHint(ip: string | null): void {
		this.cancelledDeviceIpHint = ip;
		if (this._cancelledIpTimeout) {
			clearTimeout(this._cancelledIpTimeout);
			this._cancelledIpTimeout = null;
		}
		if (ip) {
			this._cancelledIpTimeout = setTimeout(() => {
				this.cancelledDeviceIpHint = null;
				this._cancelledIpTimeout = null;
				this._host.requestUpdate();
			}, 8000);
		}
		this._host.requestUpdate();
	}

	/** Invalidate any in-flight operation keyed off the current opId. */
	bumpOpId(): void {
		this._opId++;
	}

	set serialPort(port: SerialPort | null) {
		this._serialPort = port;
	}

	get serialPort(): SerialPort | null {
		return this._serialPort;
	}
}
