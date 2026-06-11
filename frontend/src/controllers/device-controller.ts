import type { ReactiveController, ReactiveControllerHost } from "lit";
import { safeUnsub } from "../lib/safe-unsub.js";
import { persistSelectedMac, readStoredMac } from "../lib/storage.js";
import type { DeviceInfo, RawTarget, Target, TargetStatus } from "../types.js";

// Cap for the grid/raw-target subscribe retries. The first attempt counts:
// after SUBSCRIBE_RETRY_LIMIT total attempts the controller stops retrying
// and surfaces `connectionFailed` so the panel shows the connection banner
// instead of silently spinning forever.
const SUBSCRIBE_RETRY_LIMIT = 5;
const SUBSCRIBE_RETRY_DELAY_MS = 2000;

/**
 * Structured target/sensor/zone data delivered by the grid-targets subscription.
 */
export interface TargetData {
	targets: Target[];
	sensors: {
		occupancy: boolean;
		static_presence: boolean;
		motion_presence: boolean;
		target_presence: boolean;
		mmwave: boolean;
		static_state?: "A" | "P" | "I";
		motion_state?: "A" | "P" | "I";
		occupancy_state?: boolean;
		illuminance: number | null;
		temperature: number | null;
		humidity: number | null;
		co2: number | null;
	};
	zones: {
		occupancy: Record<number, boolean>;
		target_counts: Record<number, number>;
		frame_count: number;
		debug_log?: string;
	} | null;
}

/**
 * DeviceController manages device discovery, selection, WebSocket session
 * lifecycle, and target/display subscriptions.
 *
 * It implements Lit's ReactiveController interface so the host element
 * re-renders when the controller's observable state changes.
 */
export class DeviceController implements ReactiveController {
	// --- Observable state ---
	devices: DeviceInfo[] = [];
	selectedMac = "";
	showRoomCalibrationTutorial = true;

	// --- Callbacks set by the host ---
	onTargetData?: (data: TargetData) => void;
	onRawTargetData?: (targets: RawTarget[]) => void;
	onDeviceListChanged?: () => void;
	onSessionClosed?: () => void;
	/** Selected device transitioned to available. Host decides whether to
	 * reopen the session (config already loaded) or load config fresh. */
	onSelectedAvailable?: (mac: string) => void;
	/** Host's unsaved-edits state. While true, _applyDeviceList defers the
	 * auto-switch to another device when the selected mac disappears from a
	 * non-empty push — switching would make the host load the replacement
	 * device's config straight over the user's edits with no prompt. */
	isHostDirty?: () => boolean;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubDevice?: () => void;
	private _unsubDeviceList?: () => void;
	private _unsubTargets?: () => void;
	private _unsubDisplay?: () => void;
	private _targetRetryTimer?: ReturnType<typeof setTimeout>;
	private _displayRetryTimer?: ReturnType<typeof setTimeout>;
	private _reconnecting = false;
	private _connectionFailed = false;
	private _lastSelectedOnline: boolean | null = null;
	private _reopenInFlight?: { mac: string; promise: Promise<void> };
	private _loadConfigInFlight?: { mac: string; promise: Promise<any> };
	// Generation tokens — incremented on (un)subscribe and connection swap.
	// A subscribeMessage promise that resolves while its token has been
	// bumped (host disconnected, user switched device, hass replaced) drops
	// the returned unsub immediately so the server-side subscription doesn't
	// leak.
	private _targetsGen = 0;
	private _displayGen = 0;
	private _deviceListGen = 0;
	// Guards the `subscribe_device` session itself. The backend refcounts
	// these sessions and the ESP32 has only a few API connection slots, so a
	// leaked late-resolving subscribe holds a slot until the websocket
	// closes. Bumped by closeDeviceSession (and therefore hostDisconnected)
	// and on connection swap; checked after every await in the session-open
	// pipeline.
	private _sessionGen = 0;
	// Device-list subscription *intent* — true between subscribeDeviceList()
	// entry and unsubscribeDeviceList()/hostDisconnected(). Distinct from
	// `_unsubDeviceList`, which only tracks *completed* subscriptions; we
	// need intent so a connection swap mid-`subscribeMessage()` still
	// triggers resubscribe instead of silently dropping the request (same
	// pattern as flasher-controller).
	private _wantDeviceListSub = false;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {}
	hostDisconnected(): void {
		this.unsubscribeDeviceList();
		this.closeDeviceSession();
	}

	// --- Hass reference ---
	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		const oldConn = this._hass?.connection;
		this._hass = value;
		if (value?.connection && value.connection !== oldConn && oldConn) {
			// Connection changed — stale subscriptions are dead.
			// Use subscription *intent* (`_wantDeviceListSub`), not the
			// completed-subscription flag (`_unsubDeviceList`): if the swap
			// lands while subscribeMessage() is still pending, the unsub
			// hasn't been stashed yet — gating on it would silently drop the
			// request and leave the device list stale after the reconnect.
			const wantsDeviceListSub = this._wantDeviceListSub;
			this._unsubDevice = undefined;
			this._unsubTargets = undefined;
			this._unsubDisplay = undefined;
			this._unsubDeviceList = undefined;
			if (this._targetRetryTimer) {
				clearTimeout(this._targetRetryTimer);
				this._targetRetryTimer = undefined;
			}
			if (this._displayRetryTimer) {
				clearTimeout(this._displayRetryTimer);
				this._displayRetryTimer = undefined;
			}
			// Bump generation tokens so any in-flight subscribeMessage
			// promises against the old connection drop their unsub when
			// they finally resolve.
			this._targetsGen++;
			this._displayGen++;
			this._deviceListGen++;
			this._sessionGen++;
			if (wantsDeviceListSub) {
				// .catch in case subscribeDeviceList ever throws outside its
				// try/catch (loadDevices fallback etc.) — fire-and-forget
				// without a rejection handler would surface as an unhandled
				// promise rejection.
				void this.subscribeDeviceList().catch(() => {});
			}
		}
	}

	// --- Public: whether a device session is currently open ---
	get hasDeviceSession(): boolean {
		return !!this._unsubDevice;
	}

	// --- Public: whether a loadDeviceConfig/openDeviceSession is in progress ---
	get reconnecting(): boolean {
		return this._reconnecting;
	}

	// --- Public: whether the last connection attempt failed ---
	get connectionFailed(): boolean {
		return this._connectionFailed;
	}

	setShowRoomCalibrationTutorial(value: boolean): void {
		if (this.showRoomCalibrationTutorial === value) return;
		this.showRoomCalibrationTutorial = value;
		this._host.requestUpdate();
	}

	// --- Device loading ---
	async loadDevices(): Promise<void> {
		if (!this._hass) return;
		try {
			const result = await this._hass.callWS({
				type: "eppgrid/list_devices",
			});
			this.devices = [...((result as any).devices as DeviceInfo[])].sort(
				(a, b) => (a.name || "").localeCompare(b.name || ""),
			);
			this.setShowRoomCalibrationTutorial(
				(result as any).show_room_calibration_tutorial ?? true,
			);
		} catch {
			this.devices = [];
			this._host.requestUpdate();
			return;
		}

		const prevSelectedMac = this.selectedMac;
		const stored = readStoredMac();
		const match =
			stored && this.devices.find((d: DeviceInfo) => d.mac === stored);
		this.selectedMac = match ? stored! : (this.devices[0]?.mac ?? "");
		if (prevSelectedMac !== this.selectedMac) {
			// Same reset as _applyDeviceList: treat the next push as an
			// initial observation for the new device so we don't fire a stale
			// false→true rising edge latched from the previous selection.
			this._lastSelectedOnline = null;
		}
		this._host.requestUpdate();
	}

	/**
	 * Subscribe to real-time device list updates from the backend.
	 * Receives the initial list immediately, then pushes updates on add/remove.
	 */
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
					this.setShowRoomCalibrationTutorial(
						msg.show_room_calibration_tutorial ?? true,
					);
					this._applyDeviceList((msg.devices as DeviceInfo[]) ?? []);
				},
				{ type: "eppgrid/subscribe_device_list" },
			);
			if (this._deviceListGen !== token) {
				try {
					unsub();
				} catch {}
				return;
			}
			this._unsubDeviceList = unsub;
		} catch {
			// Fallback to one-shot load if subscription not supported
			await this.loadDevices();
		}
	}

	unsubscribeDeviceList(): void {
		this._wantDeviceListSub = false;
		this._deviceListGen++;
		safeUnsub(this._unsubDeviceList);
		this._unsubDeviceList = undefined;
	}

	private _applyDeviceList(devices: DeviceInfo[]): void {
		this.devices = [...devices].sort((a, b) =>
			(a.name || "").localeCompare(b.name || ""),
		);
		// A transient empty list during HA/integration reload is
		// indistinguishable from a real deletion, so never invalidate the
		// current selection on an empty list — otherwise the panel flips
		// to the "no devices" placeholder mid-reconnect. An empty list
		// just means "I don't know yet".
		const prevSelectedMac = this.selectedMac;
		const stored = readStoredMac();
		if (this.devices.length > 0) {
			const match = stored && this.devices.find((d) => d.mac === stored);
			const next = match ? stored! : this.devices[0].mac;
			// Dirty-guard the auto-switch: if the selected device vanished
			// from a non-empty push while the host has unsaved edits, keep it
			// selected instead of flipping to the replacement — the render
			// path already treats missing-from-list as offline, and the user
			// can still switch via the picker's unsaved-changes guard. The
			// switch happens on the next push once the host is clean, and a
			// re-added device (USB reflash) reconnects through the normal
			// offline→online edge below.
			const deferSwitch =
				next !== this.selectedMac &&
				!!this.selectedMac &&
				!this.devices.some((d) => d.mac === this.selectedMac) &&
				(this.isHostDirty?.() ?? false);
			if (!deferSwitch) {
				this.selectedMac = next;
			}
		} else if (!this.selectedMac && stored) {
			// Empty list but a previous selection is persisted — seed from
			// localStorage so the UI falls through to the offline banner
			// (which treats missing-from-list as offline) instead of the
			// "no devices configured" placeholder.
			this.selectedMac = stored;
		}
		if (prevSelectedMac !== this.selectedMac) {
			// Treat the next push as an initial observation for the new
			// device so we don't fire a stale false→true rising edge.
			this._lastSelectedOnline = null;
		}

		const selected = this.devices.find((d) => d.mac === this.selectedMac);
		// Treat `firmware_status="unavailable"` as offline even when HA still
		// reports `available: true` — that combination happens when only the
		// `firmware_version` text sensor went unavailable while other entities
		// are still reporting. The backend's per-state handler closes its end
		// of the session whenever any entity goes offline, so without
		// tracking firmware_status we'd leave the live target stream dead
		// once it recovers.
		const nowOnline =
			(selected?.available ?? false) &&
			selected?.firmware_status !== "unavailable";
		const prev = this._lastSelectedOnline;
		this._lastSelectedOnline = nowOnline;

		if (prev === true && !nowOnline) {
			this.closeDeviceSession();
			this.onSessionClosed?.();
		}
		// Initial push (prev === null) is skipped — the host's first-load
		// flow drives the initial connect.  On a real offline→online
		// transition, hand off to the host so it can choose between
		// reopenSession (config already in memory) and a fresh config load.
		if (prev === false && nowOnline && this.selectedMac) {
			this.onSelectedAvailable?.(this.selectedMac);
		}

		this.onDeviceListChanged?.();
		this._host.requestUpdate();
	}

	/**
	 * Fetch the device config from the backend.
	 * Returns the raw config object for the host to apply.
	 * Also opens the device session and subscribes to data streams.
	 */
	async loadDeviceConfig(mac: string): Promise<any> {
		// Dedupe concurrent loads for the same mac so callers always get the
		// same config rather than null on re-entry.  Different macs still
		// queue: the user switching device mid-load shouldn't start a fresh
		// load before the prior one's session/subscribe pipeline settles.
		const inFlight = this._loadConfigInFlight;
		if (inFlight) {
			if (inFlight.mac === mac) return inFlight.promise;
			await inFlight.promise.catch(() => {});
		}
		const entry: { mac: string; promise: Promise<any> } = {
			mac,
			promise: undefined as unknown as Promise<any>,
		};
		entry.promise = (async () => {
			this._reconnecting = true;
			this._host.requestUpdate();
			try {
				// Snapshot the session generation before the fetch: if the
				// host disconnects (or the session is explicitly closed, e.g.
				// the device went offline) while get_config is in flight,
				// resuming the pipeline would open a fresh session that
				// nothing will ever close.
				const sessionToken = this._sessionGen;
				let config: any = null;
				try {
					const result = await this._hass.callWS({
						type: "eppgrid/get_config",
						mac,
					});
					config = (result as any).config;
				} catch {
					// Device may not be ready yet
				}
				if (this._sessionGen !== sessionToken) return config;
				await this.reopenSession(mac);
				return config;
			} finally {
				this._reconnecting = false;
				if (this._loadConfigInFlight === entry) {
					this._loadConfigInFlight = undefined;
				}
				this._host.requestUpdate();
			}
		})();
		this._loadConfigInFlight = entry;
		return entry.promise;
	}

	/**
	 * Re-establish the live device session and target/display streams
	 * without re-fetching config. Used on reconnect paths where the
	 * host's in-memory config is still valid — avoids clobbering any
	 * unsaved edits with a server round-trip.
	 *
	 * Dedupes concurrent calls for the same mac: the panel's `updated()`
	 * guard fires on every hass property change, which would otherwise
	 * kick off many parallel `openDeviceSession` pipelines while the
	 * first subscribe is still in flight, leaking subscriptions
	 * server-side.  A call for a *different* mac (e.g. user switched
	 * devices mid-reconnect) waits for the in-flight one to finish,
	 * then starts a fresh reopen so the new selection wins.
	 */
	async reopenSession(mac: string): Promise<void> {
		if (!this._hass || !mac) return;
		const inFlight = this._reopenInFlight;
		if (inFlight) {
			if (inFlight.mac === mac) return inFlight.promise;
			// Different mac requested — let the old reopen settle so its
			// subscribe / closeDeviceSession sequence doesn't race with
			// ours, then proceed with a fresh reopen for the new mac.
			await inFlight.promise.catch(() => {});
		}
		const entry: { mac: string; promise: Promise<void> } = {
			mac,
			promise: undefined as unknown as Promise<void>,
		};
		entry.promise = (async () => {
			try {
				await this.openDeviceSession(mac);
				// Post-await staleness check: openDeviceSession only stores
				// `_unsubDevice` when its `_sessionGen` token is still current,
				// so this also covers the host disconnecting (or the
				// connection swapping) while the subscribe was in flight —
				// without it we'd resurrect the whole target pipeline, with
				// fresh tokens, on a dead controller.
				if (this._unsubDevice) {
					this.subscribeTargets(mac);
				}
			} finally {
				if (this._reopenInFlight === entry) {
					this._reopenInFlight = undefined;
				}
			}
		})();
		this._reopenInFlight = entry;
		return entry.promise;
	}

	// --- Session management ---
	async openDeviceSession(mac: string): Promise<void> {
		this.closeDeviceSession();
		if (!this._hass || !mac) return;
		const token = ++this._sessionGen;
		try {
			const unsub = await this._hass.connection.subscribeMessage(
				() => {}, // session has no events, just lifecycle
				{ type: "eppgrid/subscribe_device", mac },
			);
			if (this._sessionGen !== token) {
				// The host disconnected, the session was closed, or the
				// connection swapped while the subscribe was in flight.
				// Release the just-created server-side session immediately —
				// stashing the unsub on a torn-down controller would leak it.
				try {
					unsub();
				} catch {}
				return;
			}
			this._unsubDevice = unsub;
			this._connectionFailed = false;
			this._host.requestUpdate();
		} catch (e) {
			if (this._sessionGen !== token) return;
			console.warn("Failed to open device session:", e);
			const err = e as Record<string, unknown>;
			this._connectionFailed =
				err?.code === "connection_failed" || err?.code === "not_found";
			this._host.requestUpdate();
		}
	}

	closeDeviceSession(): void {
		this._sessionGen++;
		this.unsubscribeTargets();
		safeUnsub(this._unsubDevice);
		this._unsubDevice = undefined;
	}

	// --- Target subscription ---
	subscribeTargets(mac: string): void {
		// Tear down any prior subscription via unsubscribeTargets so we get
		// the same try/catch + generation-bump treatment as the explicit
		// unsubscribe path. A stale unsub against a dead connection throws,
		// and would otherwise abort the whole resubscribe pipeline.
		this.unsubscribeTargets();
		if (!this._hass || !mac) return;

		const conn = this._hass.connection;

		this._subscribeGridTargets(conn, mac);
		this.subscribeDisplay(mac);
	}

	unsubscribeTargets(): void {
		this.unsubscribeDisplay();
		this._targetsGen++;
		if (this._targetRetryTimer) {
			clearTimeout(this._targetRetryTimer);
			this._targetRetryTimer = undefined;
		}
		safeUnsub(this._unsubTargets);
		this._unsubTargets = undefined;
	}

	private _subscribeGridTargets(conn: any, mac: string, attempt = 1): void {
		const token = ++this._targetsGen;
		conn
			.subscribeMessage(
				(event: any) => {
					const targets: Target[] = (event.targets || []).map((t: any) => ({
						x: t.x,
						y: t.y,
						status: (t.status as TargetStatus) ?? "inactive",
						signal: t.signal ?? 0,
					}));
					const sensors = event.sensors
						? {
								occupancy: event.sensors.occupancy ?? false,
								static_presence: event.sensors.static_presence ?? false,
								motion_presence: event.sensors.motion_presence ?? false,
								target_presence: event.sensors.target_presence ?? false,
								mmwave: event.sensors.mmwave ?? false,
								static_state: event.sensors.static_state,
								motion_state: event.sensors.motion_state,
								occupancy_state: event.sensors.occupancy_state,
								illuminance: event.sensors.illuminance ?? null,
								temperature: event.sensors.temperature ?? null,
								humidity: event.sensors.humidity ?? null,
								co2: event.sensors.co2 ?? null,
							}
						: {
								occupancy: false,
								static_presence: false,
								motion_presence: false,
								target_presence: false,
								mmwave: false,
								static_state: undefined,
								motion_state: undefined,
								occupancy_state: undefined,
								illuminance: null,
								temperature: null,
								humidity: null,
								co2: null,
							};
					const zones = event.zones
						? {
								occupancy: event.zones.occupancy ?? {},
								target_counts: event.zones.target_counts ?? {},
								frame_count: event.zones.frame_count ?? 0,
								debug_log: event.zones.debug_log,
							}
						: null;
					this.onTargetData?.({ targets, sensors, zones });
				},
				{
					type: "eppgrid/subscribe_grid_targets",
					mac,
				},
			)
			.then((unsub: () => void) => {
				if (this._targetsGen !== token) {
					try {
						unsub();
					} catch {}
					return;
				}
				this._unsubTargets = unsub;
			})
			.catch(() => {
				if (this._targetsGen !== token) return;
				if (attempt >= SUBSCRIBE_RETRY_LIMIT) {
					// Out of retries — surface the same connection-failed
					// state the session-open path uses so the panel shows the
					// banner instead of silently retrying forever.
					this._connectionFailed = true;
					this._host.requestUpdate();
					return;
				}
				if (this._targetRetryTimer) {
					clearTimeout(this._targetRetryTimer);
				}
				this._targetRetryTimer = setTimeout(() => {
					this._targetRetryTimer = undefined;
					if (this._hass?.connection !== conn) return;
					this._subscribeGridTargets(conn, mac, attempt + 1);
				}, SUBSCRIBE_RETRY_DELAY_MS);
			});
	}

	// --- Raw display subscription ---
	subscribeDisplay(mac: string): void {
		this.unsubscribeDisplay();
		if (!this._hass || !mac) return;
		this._subscribeRawTargets(this._hass.connection, mac);
	}

	private _subscribeRawTargets(conn: any, mac: string, attempt = 1): void {
		const token = ++this._displayGen;
		conn
			.subscribeMessage(
				(event: any) => {
					const rawTargets: RawTarget[] = (event.targets || []).map(
						(t: any) => ({
							raw_x: t.raw_x,
							raw_y: t.raw_y,
						}),
					);
					this.onRawTargetData?.(rawTargets);
				},
				{
					type: "eppgrid/subscribe_raw_targets",
					mac,
				},
			)
			.then((unsub: () => void) => {
				if (this._displayGen !== token) {
					try {
						unsub();
					} catch {}
					return;
				}
				this._unsubDisplay = unsub;
			})
			.catch(() => {
				// The WS lib only auto-resubscribes *established* subscriptions
				// on reconnect — a rejected initial subscribe is gone for good,
				// which used to leave the raw-target stream silently dead.
				// Retry like the grid stream, then surface connection-failed.
				if (this._displayGen !== token) return;
				if (attempt >= SUBSCRIBE_RETRY_LIMIT) {
					this._connectionFailed = true;
					this._host.requestUpdate();
					return;
				}
				if (this._displayRetryTimer) {
					clearTimeout(this._displayRetryTimer);
				}
				this._displayRetryTimer = setTimeout(() => {
					this._displayRetryTimer = undefined;
					if (this._hass?.connection !== conn) return;
					this._subscribeRawTargets(conn, mac, attempt + 1);
				}, SUBSCRIBE_RETRY_DELAY_MS);
			});
	}

	unsubscribeDisplay(): void {
		this._displayGen++;
		if (this._displayRetryTimer) {
			clearTimeout(this._displayRetryTimer);
			this._displayRetryTimer = undefined;
		}
		safeUnsub(this._unsubDisplay);
		this._unsubDisplay = undefined;
	}

	// --- Device selection ---
	selectDevice(mac: string): void {
		this.selectedMac = mac;
		this._lastSelectedOnline = null;
		this._connectionFailed = false;
		persistSelectedMac(mac);
		this._host.requestUpdate();
	}
}
