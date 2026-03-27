import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { DeviceInfo, RawTarget, Target, TargetStatus } from "../types.js";

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
	loading = true;

	// --- Callbacks set by the host ---
	onTargetData?: (data: TargetData) => void;
	onRawTargetData?: (targets: RawTarget[]) => void;

	private _host: ReactiveControllerHost;
	private _hass: any = null;
	private _unsubDevice?: () => void;
	private _unsubTargets?: () => void;
	private _unsubDisplay?: () => void;

	constructor(host: ReactiveControllerHost) {
		this._host = host;
		host.addController(this);
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {}
	hostDisconnected(): void {
		this.closeDeviceSession();
	}

	// --- Hass reference ---
	get hass(): any {
		return this._hass;
	}
	set hass(value: any) {
		this._hass = value;
	}

	// --- Public: whether a device session is currently open ---
	get hasDeviceSession(): boolean {
		return !!this._unsubDevice;
	}

	// --- Device loading ---
	async loadDevices(): Promise<void> {
		if (!this._hass) return;
		try {
			const result = await this._hass.callWS({
				type: "eppgrid/list_devices",
			});
			this.devices = ((result as any).devices as DeviceInfo[]).sort((a, b) =>
				(a.name || "").localeCompare(b.name || ""),
			);
		} catch {
			this.devices = [];
			this._host.requestUpdate();
			return;
		}

		const stored = localStorage.getItem("epp_selected_mac");
		const match =
			stored && this.devices.find((d: DeviceInfo) => d.mac === stored);
		this.selectedMac = match ? stored! : (this.devices[0]?.mac ?? "");
		this._host.requestUpdate();
	}

	/**
	 * Fetch the device config from the backend.
	 * Returns the raw config object for the host to apply.
	 * Also opens the device session and subscribes to data streams.
	 */
	async loadDeviceConfig(mac: string): Promise<any> {
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
		// Open device session, then subscribe to data streams
		await this.openDeviceSession(mac);
		if (this._unsubDevice) {
			this.subscribeTargets(mac);
		}
		return config;
	}

	// --- Session management ---
	async openDeviceSession(mac: string): Promise<void> {
		this.closeDeviceSession();
		if (!this._hass || !mac) return;
		try {
			this._unsubDevice = await this._hass.connection.subscribeMessage(
				() => {}, // session has no events, just lifecycle
				{ type: "eppgrid/subscribe_device", mac },
			);
		} catch (e) {
			console.warn("Failed to open device session:", e);
		}
	}

	closeDeviceSession(): void {
		this.unsubscribeTargets();
		if (this._unsubDevice) {
			try {
				this._unsubDevice();
			} catch {
				/* stale subscription */
			}
			this._unsubDevice = undefined;
		}
	}

	// --- Target subscription ---
	subscribeTargets(mac: string): void {
		this.unsubscribeDisplay();
		if (this._unsubTargets) {
			this._unsubTargets();
			this._unsubTargets = undefined;
		}
		if (!this._hass || !mac) return;

		const conn = this._hass.connection;

		conn
			.subscribeMessage(
				(event: any) => {
					const targets: Target[] = (event.targets || []).map((t: any) => ({
						x: t.x,
						y: t.y,
						speed: 0,
						status: (t.status as TargetStatus) ?? "inactive",
						signal: t.signal ?? 0,
					}));
					const sensors = event.sensors
						? {
								occupancy: event.sensors.occupancy ?? false,
								static_presence: event.sensors.static_presence ?? false,
								motion_presence: event.sensors.motion_presence ?? false,
								target_presence: event.sensors.target_presence ?? false,
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
				this._unsubTargets = unsub;
			});
		this.subscribeDisplay(mac);
	}

	unsubscribeTargets(): void {
		this.unsubscribeDisplay();
		if (this._unsubTargets) {
			try {
				this._unsubTargets();
			} catch {
				/* stale subscription */
			}
			this._unsubTargets = undefined;
		}
	}

	// --- Raw display subscription ---
	subscribeDisplay(mac: string): void {
		this.unsubscribeDisplay();
		if (!this._hass || !mac) return;

		this._hass.connection
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
				this._unsubDisplay = unsub;
			});
	}

	unsubscribeDisplay(): void {
		if (this._unsubDisplay) {
			try {
				this._unsubDisplay();
			} catch {
				/* stale subscription */
			}
			this._unsubDisplay = undefined;
		}
	}

	// --- Device selection ---
	selectDevice(mac: string): void {
		this.selectedMac = mac;
		localStorage.setItem("epp_selected_mac", mac);
		this._host.requestUpdate();
	}
}
