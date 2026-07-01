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
		events?: string[];
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
	onHeatmapData?: (cells: number[]) => void;
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
	private _unsubHeatmap?: () => void;
	private _targetRetryTimer?: ReturnType<typeof setTimeout>;
	private _displayRetryTimer?: ReturnType<typeof setTimeout>;
	private _heatmapRetryTimer?: ReturnType<typeof setTimeout>;
	// Heatmap subscription *intent* — true between setHeatmapEnabled(true) and
	// setHeatmapEnabled(false)/teardown. Mirrors `_wantDeviceListSub`: a
	// connection swap or resubscribe (subscribeTargets) needs to know whether
	// to re-open the heatmap sub, independent of whether one happens to be
	// in flight or already stashed.
	private _heatmapEnabled = false;
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
	private _heatmapGen = 0;
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
	// True while the host is disconnected. The generation tokens can't
	// catch a *queued* reopen/config-load (the different-mac
	// `await inFlight.promise` paths): the queued continuation runs
	// openDeviceSession, which mints itself a fresh, current token — the
	// bumps that happened while it waited are invisible to it. Checked
	// after the queue awaits so a controller torn down mid-queue doesn't
	// open a session nothing will ever close.
	private _disposed = false;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	/**
	 * Claim the next generation for one of the token fields above.
	 * The returned handle reports staleness: `stale()` becomes true once a
	 * later claim or bump supersedes this one, meaning the awaited result
	 * must be dropped (and its unsub released) instead of stashed.
	 */
	private _claimGen(
		field:
			| "_targetsGen"
			| "_displayGen"
			| "_heatmapGen"
			| "_deviceListGen"
			| "_sessionGen",
	): { stale: () => boolean } {
		const token = ++this[field];
		return { stale: () => this[field] !== token };
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {
		// HA re-attaches the same panel element on suspend/restore, so the
		// disposed flag is intent, not a one-way latch.
		this._disposed = false;
	}
	hostDisconnected(): void {
		this._disposed = true;
		this.unsubscribeDeviceList();
		this.closeDeviceSession();
		this._unsubscribeHeatmap();
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
			this._unsubHeatmap = undefined;
			this._unsubDeviceList = undefined;
			if (this._targetRetryTimer) {
				clearTimeout(this._targetRetryTimer);
				this._targetRetryTimer = undefined;
			}
			if (this._displayRetryTimer) {
				clearTimeout(this._displayRetryTimer);
				this._displayRetryTimer = undefined;
			}
			if (this._heatmapRetryTimer) {
				clearTimeout(this._heatmapRetryTimer);
				this._heatmapRetryTimer = undefined;
			}
			// Bump generation tokens so any in-flight subscribeMessage
			// promises against the old connection drop their unsub when
			// they finally resolve.
			this._targetsGen++;
			this._displayGen++;
			this._heatmapGen++;
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
		safeUnsub(this._unsubDeviceList);
		this._unsubDeviceList = undefined;
		if (!this._hass) return;
		const claim = this._claimGen("_deviceListGen");
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
			if (claim.stale()) {
				safeUnsub(unsub);
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
			// offline→online edge below. Boundary: the guard only covers the
			// selected-mac-missing case — a stored-mac change while the device
			// is still listed intentionally switches (out of scope here).
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
			// The host may have disconnected while we were queued; bail
			// before fetching/opening anything on the dead controller.
			if (this._disposed) return null;
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
			// The host may have disconnected while we were queued; bail
			// before opening a session on the dead controller.
			if (this._disposed) return;
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
		const claim = this._claimGen("_sessionGen");
		try {
			const unsub = await this._hass.connection.subscribeMessage(
				() => {}, // session has no events, just lifecycle
				{ type: "eppgrid/subscribe_device", mac },
			);
			if (claim.stale()) {
				// The host disconnected, the session was closed, or the
				// connection swapped while the subscribe was in flight.
				// Release the just-created server-side session immediately —
				// stashing the unsub on a torn-down controller would leak it.
				safeUnsub(unsub);
				return;
			}
			this._unsubDevice = unsub;
			this._connectionFailed = false;
			this._host.requestUpdate();
		} catch (e) {
			if (claim.stale()) return;
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
		if (this._heatmapEnabled) this._subscribeHeatmap();
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

	private _subscribeGridTargets(conn: any, mac: string): void {
		this._subscribeStream(conn, mac, {
			type: "eppgrid/subscribe_grid_targets",
			genField: "_targetsGen",
			timerField: "_targetRetryTimer",
			unsubField: "_unsubTargets",
			onEvent: (event: any) => {
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
							events: event.zones.events,
						}
					: null;
				this.onTargetData?.({ targets, sensors, zones });
			},
		});
	}

	// --- Raw display subscription ---
	subscribeDisplay(mac: string): void {
		this.unsubscribeDisplay();
		if (!this._hass || !mac) return;
		this._subscribeRawTargets(this._hass.connection, mac);
	}

	private _subscribeRawTargets(conn: any, mac: string): void {
		this._subscribeStream(conn, mac, {
			type: "eppgrid/subscribe_raw_targets",
			genField: "_displayGen",
			timerField: "_displayRetryTimer",
			unsubField: "_unsubDisplay",
			onEvent: (event: any) => {
				const rawTargets: RawTarget[] = (event.targets || []).map((t: any) => ({
					raw_x: t.raw_x,
					raw_y: t.raw_y,
				}));
				this.onRawTargetData?.(rawTargets);
			},
		});
	}

	/**
	 * Shared subscribe/retry scaffolding for the live data streams (grid
	 * targets, raw targets, heatmap). Each stream owns its own generation
	 * token, retry timer and unsub slot — named via `stream` — so the
	 * streams tear down independently; everything else (stash-or-drop on
	 * resolution, capped retry on rejection) lives here so a future
	 * backoff or cap change is a one-site edit.
	 */
	private _subscribeStream(
		conn: any,
		mac: string,
		stream: {
			type: string;
			genField: "_targetsGen" | "_displayGen" | "_heatmapGen";
			timerField:
				| "_targetRetryTimer"
				| "_displayRetryTimer"
				| "_heatmapRetryTimer";
			unsubField: "_unsubTargets" | "_unsubDisplay" | "_unsubHeatmap";
			onEvent: (event: any) => void;
			// True for the heatmap stream: it's an OPTIONAL overlay, so
			// exhausting its retries must not latch `_connectionFailed` (which
			// drives the panel's connection-failed banner) — the core
			// target/display streams may be perfectly healthy. Left undefined
			// (falsy) for those non-optional streams, which still latch.
			optional?: boolean;
		},
		attempt = 1,
	): void {
		const claim = this._claimGen(stream.genField);
		conn
			.subscribeMessage(stream.onEvent, { type: stream.type, mac })
			.then((unsub: () => void) => {
				if (claim.stale()) {
					// Torn down (or resubscribed) while the subscribe was in
					// flight — release the server-side subscription now.
					safeUnsub(unsub);
					return;
				}
				this[stream.unsubField] = unsub;
				if (this._connectionFailed) {
					// An earlier attempt exhausted its retries and latched the
					// connection banner — a subscribe succeeding now means the
					// connection is back, so self-heal it.
					this._connectionFailed = false;
					this._host.requestUpdate();
				}
			})
			.catch(() => {
				// The WS lib only auto-resubscribes *established* subscriptions
				// on reconnect — a rejected initial subscribe is gone for good,
				// which would leave the stream silently dead. Retry on a timer,
				// then surface connection-failed.
				if (claim.stale()) return;
				if (attempt >= SUBSCRIBE_RETRY_LIMIT) {
					// Out of retries — surface the same connection-failed
					// state the session-open path uses so the panel shows the
					// banner instead of silently retrying forever. Skipped for
					// optional streams (heatmap): those can legitimately fail
					// (e.g. no device session open yet) while the core streams
					// are fine, so they must not trigger the banner.
					if (!stream.optional) {
						this._connectionFailed = true;
						this._host.requestUpdate();
					}
					return;
				}
				const pending = this[stream.timerField];
				if (pending) {
					clearTimeout(pending);
				}
				this[stream.timerField] = setTimeout(() => {
					this[stream.timerField] = undefined;
					if (this._hass?.connection !== conn) return;
					this._subscribeStream(conn, mac, stream, attempt + 1);
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

	// --- Heatmap subscription ---
	/**
	 * Records heatmap-overlay intent and opens/closes the
	 * `eppgrid/subscribe_heatmap` subscription against `selectedMac` to
	 * match. Mirrors `_wantDeviceListSub`'s intent flag: `subscribeTargets`
	 * and the `hass` connection-swap path both re-open the heatmap sub iff
	 * `_heatmapEnabled`, so a reconnect (or the user re-enabling the
	 * overlay) always converges on the right subscription state.
	 */
	setHeatmapEnabled(enabled: boolean): void {
		this._heatmapEnabled = enabled;
		// `_subscribeHeatmap` unsubscribes any existing sub first, so the enable
		// path needs no separate teardown; only the disable path does.
		if (enabled) this._subscribeHeatmap();
		else this._unsubscribeHeatmap();
	}

	private _subscribeHeatmap(): void {
		this._unsubscribeHeatmap();
		if (!this._hass || !this.selectedMac || !this._heatmapEnabled) return;
		this._subscribeStream(this._hass.connection, this.selectedMac, {
			type: "eppgrid/subscribe_heatmap",
			genField: "_heatmapGen",
			timerField: "_heatmapRetryTimer",
			unsubField: "_unsubHeatmap",
			optional: true,
			onEvent: (event: any) => {
				this.onHeatmapData?.(event.cells ?? []);
			},
		});
	}

	private _unsubscribeHeatmap(): void {
		this._heatmapGen++;
		if (this._heatmapRetryTimer) {
			clearTimeout(this._heatmapRetryTimer);
			this._heatmapRetryTimer = undefined;
		}
		safeUnsub(this._unsubHeatmap);
		this._unsubHeatmap = undefined;
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
