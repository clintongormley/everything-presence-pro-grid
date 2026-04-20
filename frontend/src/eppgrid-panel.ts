import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";

import "./components/epp-flasher-view.js";
import "./components/epp-furniture-overlay.js";
import "./components/epp-furniture-sidebar.js";
import "./components/epp-grid.js";
import "./components/epp-live-sidebar.js";
import "./components/epp-settings-view.js";
import "./components/epp-wizard.js";
import "./components/epp-overlay-sidebar.js";
import "./components/epp-zone-sidebar.js";
import { DeviceController } from "./controllers/device-controller.js";
import { FlasherController } from "./controllers/flasher-controller.js";
import {
	GridStateController,
	serializeSlot,
} from "./controllers/grid-state-controller.js";
import { TargetController } from "./controllers/target-controller.js";
import type { PaintAction } from "./lib/cell-painting.js";
import { parseConfig } from "./lib/config-serialization.js";
import { mapTargetToGridCell, mapTargetToPercent } from "./lib/coordinates.js";
import {
	type FurnitureItem,
	type FurnitureSticker,
	mmToPx,
	pxToMm,
} from "./lib/furniture.js";
import {
	CELL_INTERFERENCE_SUPPRESS,
	cellIsInside,
	cellSetInterference,
	cellZone,
	GRID_CELL_COUNT,
	GRID_CELL_MM,
	GRID_COLS,
	GRID_ROWS,
	getRawRoomBounds,
	getRoomBounds,
	initGridFromRoom,
	MAX_RANGE,
} from "./lib/grid.js";
import { CELL_BG_OUT_OF_RANGE, getCellColor } from "./lib/heatmap.js";
import { applyPerspective, getInversePerspective } from "./lib/perspective.js";
import {
	autoDetectionRange,
	computeMaxRangeMm,
	computeSensorFov,
	getGridRoomMetrics,
	getSensorRoomPosition,
	getVisibleRoomBounds,
	isCellInSensorRange,
	type SensorFov,
} from "./lib/room-geometry.js";
import { renderTemplateThumbnail } from "./lib/template-thumbnail.js";
import {
	detectIpAddress,
	flashFirmware,
	queryImprovState,
	runWifiProvision,
	runWifiScan,
} from "./lib/usb-flash-service.js";
import {
	getZoneThresholds,
	resolveZoneParams,
	type Zone0Config,
	type ZoneConfig,
} from "./lib/zone-defaults.js";
import type { ZoneEngineResult, ZoneEngineState } from "./lib/zone-engine.js";
import { setupLocalize } from "./localize.js";
import { installPanelMountGuard } from "./panel-mount-guard.js";
import {
	buttonStyles,
	dialogStyles,
	headerStyles,
	hostStyles,
	layoutStyles,
	liveMenuStyles,
	panelStyles,
	protocolFullpageStyles,
} from "./styles.js";
import type {
	DeviceInfo,
	HaAddResult,
	RawTarget,
	SetupStep,
	Target,
} from "./types.js";

/**
 * Length-8 tuple of zone configurations.
 * Slot 0 is always `Zone0Config` (the room-boundary zone).
 * Slots 1-7 hold named zones (`ZoneConfig | null`).
 */
export type ZoneSlots = readonly [
	Zone0Config,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
];

// Slot 0 carries only `type` for non-custom — timing is resolved from
// ZONE_TYPE_DEFAULTS at read/push time (see resolveZoneParams).
const INITIAL_ZONE_SLOTS: ZoneSlots = [
	{ type: "normal" },
	null,
	null,
	null,
	null,
	null,
	null,
	null,
];

export class EPPGridPanel extends LitElement {
	@property({ attribute: false }) hass: any;

	// Device controller — owns WS subscriptions and device loading
	private _deviceCtrl = new DeviceController(this);
	// Grid state controller — owns zone/furniture/template/paint/save logic
	private _gridCtrl = new GridStateController(this);
	// Target controller — owns target/sensor/zone state processing, zone engine, debug logging
	private _targetCtrl = new TargetController(this);
	// Flasher controller — owns OTA flash state and flashable device list
	private _flasherCtrl = new FlasherController(this);
	private _localize: import("./localize.js").LocalizeFn = Object.assign(
		((k: string) => k) as import("./localize.js").LocalizeFn,
		{ formatNumber: (v: number, d = 1) => v.toFixed(d), lang: "en" },
	);
	private _currentLang = "";

	// Grid data: byte per cell using the encoding above
	@state() private _grid: Uint8Array = new Uint8Array(GRID_CELL_COUNT);
	// Length-8 zone-slots tuple: slot 0 = room-boundary Zone0Config (always
	// populated); slots 1-7 = named zones (ZoneConfig | null).
	@state() private _zoneConfigs: ZoneSlots = INITIAL_ZONE_SLOTS;
	@state() private _activeZone: number | null = null; // null = none selected, 0 = room, 1-7 = named zones
	@state() private _targetAutoDistance = true;
	@state() private _targetMaxDistance = 6.0;
	@state() private _staticAutoDistance = true;
	@state() private _staticMinDistance = 0.3;
	@state() private _staticMaxDistance = 16.0;
	@state() private _temperatureOffset = 0;
	@state() private _humidityOffset = 0;
	@state() private _illuminanceOffset = 0;
	@state() private _motionTimeout = 5;
	@state() private _staticTimeout = 30;
	@state() private _staticTriggerThreshold = 3;
	@state() private _staticRenewThreshold = 3;
	@state() private _staticOnDelay = 0;
	@state() private _logLevels: Record<string, string> = {};
	@state() private _bluetoothEnabled = false;
	@state() private _co2Enabled = false;
	@state() private _ledMode = "Manual Control";
	@state() private _ledBrightness = 1.0;
	@state() private _ledPresenceColor = "#CC33FF";
	@state() private _relayTriggerMode = "disabled";
	@state() private _relayContactMode = "no";
	@state() private _targetUpdateRateMs = 1000;
	@state() private _zoneUpdateRateMs = 1000;
	@state() private _entitiesConfig: Record<string, any> = {};
	@state() private _sidebarTab: "zones" | "overlays" | "furniture" | "live" =
		"zones";
	@state() private _panelTab: "config" | "flasher" = "config";
	@state() private _showDeleteCalibrationDialog = false;
	@state() private _showLiveMenu = false;
	@state() private _showCustomIconPicker = false;
	@state() private _customIconValue = "";
	@state() private _furniture: FurnitureItem[] = [];
	@state() private _selectedFurnitureId: string | null = null;
	private _furnitureClipboard: FurnitureItem | null = null;
	private _dragState: {
		type: "move" | "resize" | "rotate";
		id: string;
		startX: number;
		startY: number;
		origX: number;
		origY: number;
		origW: number;
		origH: number;
		origRot: number;
		handle?: string;
		centerX?: number; // screen coords of item center (for rotate)
		centerY?: number;
		startAngle?: number; // angle at drag start
	} | null = null;
	@state() private _targets: Target[] = [];
	@state() private _rawTargets: RawTarget[] = [];
	@state() private _sensorState: {
		occupancy: boolean;
		static_presence: boolean;
		motion_presence: boolean;
		target_presence: boolean;
		illuminance: number | null;
		temperature: number | null;
		humidity: number | null;
		co2: number | null;
	} = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		illuminance: null,
		temperature: null,
		humidity: null,
		co2: null,
	};
	@state() private _zoneState: {
		occupancy: Record<number, boolean>;
		target_counts: Record<number, number>;
		frame_count: number;
	} = { occupancy: {}, target_counts: {}, frame_count: 0 };
	@state() private _showHitCounts = false;
	@state() private _showDebugLog = false;
	private _debugLogLines: string[] = [];
	private _debugLogPrev: string | null = null;
	@state() private _showBackendDebugLog = false;
	private _backendDebugLogLines: string[] = [];
	private _backendDebugLogPrev: string | null = null;
	// Zone engine state — delegated to TargetController
	private get _zoneEngineState(): ZoneEngineState {
		return this._targetCtrl.zoneEngineState;
	}
	private set _zoneEngineState(value: ZoneEngineState) {
		this._targetCtrl.zoneEngineState = value;
	}
	@state() private _overlayMode: string | null = null;
	@state() private _targetMenu: {
		x: number;
		y: number;
		targetIndex: number;
		pctX: number;
		pctY: number;
	} | null = null;
	private _dismissedTargets: Map<number, number> = new Map();
	@state() private _isPainting = false;
	private _justPainted = false;
	@state() private _paintAction: PaintAction = "set";
	private _frozenBounds: {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} | null = null;
	@state() private _saving = false;
	@state() private _dirty = false;
	@state() private _showUnsavedDialog = false;
	private _pendingNavigation: (() => void) | null = null;
	@state() private _showTemplateSave = false;
	@state() private _showTemplateLoad = false;
	@state() private _templateName = "";
	@state() private _templateError: string | null = null;

	// Multi-device support
	@state() private _devices: DeviceInfo[] = [];
	@state() private _selectedMac = "";
	@state() private _loading = true;

	// HA WebSocket connection state. Tracks the live state of
	// `hass.connection.connected` so we can render a "reconnecting" UI
	// while the backend is unreachable and re-initialise once it returns.
	@state() private _haConnected = true;
	private _listeningConnection: any = null;
	private _onHaReady = (): void => {
		const wasDisconnected = !this._haConnected;
		this._haConnected = true;
		if (wasDisconnected) {
			// Device list / session subscriptions may have been torn down during
			// the outage — re-bootstrap so the UI recovers without a manual reload.
			this._initialize().catch(() => {
				// _initialize already traps its own failures; guard here too so
				// a late rejection can't surface as uncaught.
			});
		}
	};
	private _onHaDisconnected = (): void => {
		this._haConnected = false;
	};

	// Setup wizard — perspective corner marking
	@state() private _setupStep: SetupStep | null = null;

	// View mode: live (default), editor (grid/zones), or settings (configuration)
	@state() private _view: "live" | "editor" | "settings" = "live";
	@state() private _openAccordions: Set<string> = new Set();

	// Perspective transform state (client-side, set after corner marking)
	@state() private _perspective: number[] | null = null;
	@state() private _roomWidth = 0; // mm
	@state() private _roomDepth = 0; // mm

	// Device session + target subscriptions (delegated to _deviceCtrl)

	private _beforeUnloadHandler = (e: BeforeUnloadEvent) => {
		if (this._dirty) {
			e.preventDefault();
			e.returnValue = "";
		}
	};

	private _originalPushState: typeof history.pushState | null = null;
	private _originalReplaceState: typeof history.replaceState | null = null;

	private _interceptNavigation = (): boolean => {
		if (!this._dirty) return false;
		this._showUnsavedDialog = true;
		this._pendingNavigation = null; // no specific action — just allow navigation on discard
		return true;
	};

	private _dismissTooltips = () => {
		this.shadowRoot!.querySelectorAll(".setting-info-tooltip").forEach((t) => {
			(t as HTMLElement).style.display = "none";
		});
	};

	private _onKeyDown = (e: KeyboardEvent): void => {
		if (this._view !== "editor" || this._sidebarTab !== "furniture") return;
		if (!this._selectedFurnitureId) return;

		// Ignore if user is typing in an editable element (including shadow DOM)
		const editable = e.composedPath().some((el) => {
			if (!(el instanceof HTMLElement)) return false;
			const tag = el.tagName;
			return (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				tag === "SELECT" ||
				el.isContentEditable
			);
		});
		if (editable) return;

		if (e.key === "Backspace" || e.key === "Delete") {
			e.preventDefault();
			this._removeFurniture(this._selectedFurnitureId);
		} else if (e.key === "Escape") {
			e.preventDefault();
			this._selectedFurnitureId = null;
		} else if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
			const item = this._furniture.find(
				(f) => f.id === this._selectedFurnitureId,
			);
			if (item) this._furnitureClipboard = { ...item };
		} else if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
			const item = this._furniture.find(
				(f) => f.id === this._selectedFurnitureId,
			);
			if (item) {
				this._furnitureClipboard = { ...item };
				this._removeFurniture(item.id);
			}
		} else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
			if (!this._furnitureClipboard) return;
			e.preventDefault();
			const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
			const cb = this._furnitureClipboard;
			const bounds = this._getRoomBounds();
			const roomCols = Math.ceil(this._roomWidth / GRID_CELL_MM);
			const startCol = Math.floor((GRID_COLS - roomCols) / 2);
			const visMinX = (bounds.minCol - startCol) * GRID_CELL_MM;
			const visMaxX = (bounds.maxCol + 1 - startCol) * GRID_CELL_MM;
			const visMinY = bounds.minRow * GRID_CELL_MM;
			const visMaxY = (bounds.maxRow + 1) * GRID_CELL_MM;
			const offset = 300; // 1 cell offset so paste is visible
			const newItem: FurnitureItem = {
				...cb,
				id,
				x: Math.max(visMinX, Math.min(visMaxX - cb.width, cb.x + offset)),
				y: Math.max(visMinY, Math.min(visMaxY - cb.height, cb.y + offset)),
			};
			this._furniture = [...this._furniture, newItem];
			this._selectedFurnitureId = newItem.id;
			this._dirty = true;
		}
	};

	connectedCallback(): void {
		super.connectedCallback();
		this._initialize().catch(() => {
			// _initialize traps its own failures; guard here so that any
			// late rejection can't surface as "Uncaught (in promise)".
		});
		window.addEventListener("beforeunload", this._beforeUnloadHandler);
		window.addEventListener("click", this._dismissTooltips);
		window.addEventListener("keydown", this._onKeyDown);

		// Intercept HA's client-side routing (pushState/replaceState)
		this._originalPushState = history.pushState.bind(history);
		this._originalReplaceState = history.replaceState.bind(history);

		history.pushState = (...args) => {
			if (this._interceptNavigation()) {
				this._pendingNavigation = () => {
					this._originalPushState!(...args);
					window.dispatchEvent(new PopStateEvent("popstate"));
				};
				return;
			}
			this._originalPushState!(...args);
		};
		history.replaceState = (...args) => {
			if (this._interceptNavigation()) {
				this._pendingNavigation = () => {
					this._originalReplaceState!(...args);
					window.dispatchEvent(new PopStateEvent("popstate"));
				};
				return;
			}
			this._originalReplaceState!(...args);
		};
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		if (this._initRetryTimer) {
			clearTimeout(this._initRetryTimer);
			this._initRetryTimer = undefined;
		}
		this._closeDeviceSession();
		this._detachConnectionListeners();
		window.removeEventListener("beforeunload", this._beforeUnloadHandler);
		window.removeEventListener("click", this._dismissTooltips);
		window.removeEventListener("keydown", this._onKeyDown);

		// Restore original history methods
		if (this._originalPushState) history.pushState = this._originalPushState;
		if (this._originalReplaceState)
			history.replaceState = this._originalReplaceState;
	}

	private _attachConnectionListeners(conn: any): void {
		if (!conn || this._listeningConnection === conn) return;
		this._detachConnectionListeners();
		if (typeof conn.addEventListener !== "function") return;
		conn.addEventListener("ready", this._onHaReady);
		conn.addEventListener("disconnected", this._onHaDisconnected);
		this._listeningConnection = conn;
	}

	private _detachConnectionListeners(): void {
		const conn = this._listeningConnection;
		if (conn && typeof conn.removeEventListener === "function") {
			conn.removeEventListener("ready", this._onHaReady);
			conn.removeEventListener("disconnected", this._onHaDisconnected);
		}
		this._listeningConnection = null;
	}

	willUpdate(changed: PropertyValues) {
		if (changed.has("hass")) {
			const newLang = this.hass?.locale?.language ?? this.hass?.language;
			if (newLang !== this._currentLang) {
				this._currentLang = newLang;
				this._localize = setupLocalize(this.hass);
			}
		}
	}

	updated(changedProps: PropertyValues): void {
		if (changedProps.has("hass") && this.hass) {
			this._deviceCtrl.hass = this.hass;
			this._flasherCtrl.hass = this.hass;
			const conn = this.hass.connection;
			if (conn) {
				this._attachConnectionListeners(conn);
				if (typeof conn.connected === "boolean") {
					this._haConnected = conn.connected;
				}
			}
			if (!this._haConnected) return;
			if (this._loading && !this._devices.length) {
				this._initialize();
			} else if (
				this._selectedMac &&
				this._isSelectedDeviceAvailable() &&
				!this._deviceCtrl.hasDeviceSession &&
				!this._deviceCtrl.reconnecting
			) {
				// Session lost (e.g. after HA reconnect) — re-open
				this._loadDeviceConfig(this._selectedMac);
			}
		}
	}

	private _initRetryTimer?: ReturnType<typeof setTimeout>;

	private async _initialize(): Promise<void> {
		if (!this.hass) return;
		const isRetry = this._initRetryTimer !== undefined;
		if (this._initRetryTimer) {
			clearTimeout(this._initRetryTimer);
			this._initRetryTimer = undefined;
		}
		if (!isRetry) {
			this._loading = true;
		}
		this._deviceCtrl.hass = this.hass;
		await this._subscribeDevices();
		if (!this._selectedMac && this._devices.length === 0) {
			// Integration may not be loaded yet — retry silently in the
			// background so the UI does not flicker between "no devices"
			// and "loading" every 2 seconds.
			this._loading = false;
			this._initRetryTimer = setTimeout(() => this._initialize(), 2000);
			return;
		}
		if (this._selectedMac && this._isSelectedDeviceAvailable()) {
			await this._loadDeviceConfig(this._selectedMac);
		}
		this._loading = false;
	}

	private async _subscribeDevices(): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		this._deviceCtrl.onDeviceListChanged = () => {
			this._devices = this._deviceCtrl.devices;
			this._selectedMac = this._deviceCtrl.selectedMac;
		};
		await this._deviceCtrl.subscribeDeviceList();
		this._devices = this._deviceCtrl.devices;
		this._selectedMac = this._deviceCtrl.selectedMac;
	}

	private _isSelectedDeviceAvailable(): boolean {
		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		return !!dev?.available;
	}

	private async _loadDevices(): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		await this._deviceCtrl.loadDevices();
		this._devices = this._deviceCtrl.devices;
		this._selectedMac = this._deviceCtrl.selectedMac;
	}

	private async _loadDeviceConfig(mac: string): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		this._deviceCtrl.onTargetData = (data) => {
			this._targetCtrl.handleTargetData(data);
		};
		this._deviceCtrl.onRawTargetData = (rawTargets) => {
			this._targetCtrl.handleRawTargetData(rawTargets);
		};
		const config = await this._deviceCtrl.loadDeviceConfig(mac);
		if (config) {
			this._applyConfig(config);
		}
		const dev = this._devices.find((d) => d.mac === mac);
		if (dev) {
			this._bluetoothEnabled = dev.bluetooth_enabled ?? false;
			this._co2Enabled = dev.co2_enabled ?? false;
		}
	}

	private _applyConfig(config: any): void {
		const parsed = parseConfig(config);

		// Apply calibration
		this._perspective = parsed.calibration.perspective;
		this._roomWidth = parsed.calibration.roomWidth;
		this._roomDepth = parsed.calibration.roomDepth;
		this._setupStep = null;

		// Apply layout
		this._furniture = parsed.furniture;
		this._grid = parsed.grid;
		this._zoneConfigs = [
			parsed.zone0,
			...parsed.zoneConfigs,
		] as unknown as ZoneSlots;

		// Apply settings
		const s = parsed.settings;
		this._temperatureOffset = s.temperatureOffset;
		this._humidityOffset = s.humidityOffset;
		this._illuminanceOffset = s.illuminanceOffset;
		this._motionTimeout = s.motionTimeout;
		this._targetAutoDistance = s.targetAutoDistance;
		this._targetMaxDistance = s.targetMaxDistance;
		this._staticAutoDistance = s.staticAutoDistance;
		this._staticMinDistance = s.staticMinDistance;
		this._staticMaxDistance = s.staticMaxDistance;
		this._staticTriggerThreshold = s.staticTriggerThreshold;
		this._staticRenewThreshold = s.staticRenewThreshold;
		this._staticTimeout = s.staticTimeout;
		this._staticOnDelay = s.staticOnDelay;
		this._relayTriggerMode = s.relayTriggerMode;
		this._relayContactMode = s.relayContactMode;
		this._targetUpdateRateMs = s.targetUpdateRateMs;
		this._zoneUpdateRateMs = s.zoneUpdateRateMs;
		this._entitiesConfig = s.entities;
		// Apply log levels
		this._logLevels = parsed.settings.logLevels;
		this._ledMode = parsed.settings.ledMode;
		this._ledBrightness = parsed.settings.ledBrightness;
		this._ledPresenceColor = parsed.settings.ledPresenceColor;
	}

	private _closeDeviceSession(): void {
		this._deviceCtrl.closeDeviceSession();
		this._targets = [];
		this._rawTargets = [];
	}

	// -- Grid cell painting --

	private _onCellMouseDown(index: number): void {
		this._gridCtrl.onCellMouseDown(index);
	}

	private _onCellMouseEnter(index: number): void {
		this._gridCtrl.onCellMouseEnter(index);
	}

	private _onCellMouseUp(): void {
		this._gridCtrl.onCellMouseUp();
	}

	private _applyPaintToCell(index: number): void {
		this._gridCtrl.applyPaintToCell(index);
	}

	// -- Zone management --

	private _addZone(): void {
		this._gridCtrl.addZone();
	}

	private _removeZone(slot: number): void {
		this._gridCtrl.removeZone(slot);
	}

	// -- Furniture management --

	private _addFurniture(sticker: FurnitureSticker): void {
		this._gridCtrl.addFurniture(sticker);
	}

	private _addCustomFurniture(icon: string): void {
		this._gridCtrl.addCustomFurniture(icon);
	}

	private _removeFurniture(id: string): void {
		this._gridCtrl.removeFurniture(id);
	}

	private _updateFurniture(id: string, updates: Partial<FurnitureItem>): void {
		this._gridCtrl.updateFurniture(id, updates);
	}

	/** Convert mm in room-space to px in the visible grid */
	private _mmToPx(mm: number, cellPx: number): number {
		return mmToPx(mm, cellPx);
	}

	/** Convert px delta back to mm */
	private _pxToMm(px: number, cellPx: number): number {
		return pxToMm(px, cellPx);
	}

	private _onFurniturePointerDown(
		e: PointerEvent,
		id: string,
		type: "move" | "resize" | "rotate",
		handle?: string,
	): void {
		this._gridCtrl.onFurniturePointerDown(e, id, type, handle);
	}

	private _onFurnitureDrag(e: PointerEvent): void {
		this._gridCtrl.onFurnitureDrag(e);
	}

	// -- Grid cell display helpers --

	/** Return named-zone slots (indices 1..7) as the length-7 array that
	 * downstream components and helpers expect. */
	private _namedZones(): (ZoneConfig | null)[] {
		return this._zoneConfigs.slice(1) as (ZoneConfig | null)[];
	}

	private _getCellColor(index: number): string {
		return getCellColor(this._grid[index], this._namedZones());
	}

	/** Compute the bounding box of inside-room cells (for zoom) */
	private _getRoomBounds(): {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} {
		return getRoomBounds(this._grid);
	}

	/** Bounds excluding out-of-FOV cells — used by the editor/controller. */
	_getVisibleRoomBounds(): {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} {
		return getVisibleRoomBounds(
			this._grid,
			this._getSensorFov(),
			this._roomWidth,
			this._editorMaxRangeMm(),
		);
	}

	/** Save the current grid and zone config to the backend */
	private async _applyLayout(): Promise<void> {
		return this._gridCtrl.applyLayout();
	}

	private async _saveSettings(payload?: Record<string, any>): Promise<void> {
		return this._gridCtrl.saveSettings(payload || {});
	}

	private async _cancelSettings(): Promise<void> {
		this._dirty = false;
		this._view = "live";
		// Reload saved config to restore panel state to saved values
		await this._loadDeviceConfig(this._selectedMac);
	}

	private async _cancelEditor(): Promise<void> {
		const needsRevert = this._targetAutoDistance || this._staticAutoDistance;
		this._dirty = false;
		this._selectedFurnitureId = null;
		this._overlayMode = null;
		// Reload config (reopens session), then revert widened ranges on the
		// new session. Must reload first because _loadDeviceConfig tears down
		// the old session.
		await this._loadDeviceConfig(this._selectedMac);
		this._view = "live";
		if (needsRevert) {
			await this.hass
				?.callWS({
					type: "eppgrid/set_distance_override",
					mac: this._selectedMac,
					target_max_distance: this._targetMaxDistance,
					static_min_distance: this._staticMinDistance,
					static_max_distance: this._staticMaxDistance,
				})
				?.catch(() => {});
		}
	}

	private _pushWidenedDistanceOverride(): void {
		if (this._targetAutoDistance || this._staticAutoDistance) {
			this.hass
				?.callWS({
					type: "eppgrid/set_distance_override",
					mac: this._selectedMac,
					target_max_distance: this._targetAutoDistance
						? 6
						: this._targetMaxDistance,
					static_min_distance: this._staticAutoDistance
						? 0.3
						: this._staticMinDistance,
					static_max_distance: this._staticAutoDistance
						? 16
						: this._staticMaxDistance,
				})
				?.catch(() => {});
		}
	}

	private _enterEditor(tab: "zones" | "overlays" | "furniture"): void {
		this._view = "editor";
		this._sidebarTab = tab;
		if (tab !== "overlays") this._overlayMode = null;
		this._pushWidenedDistanceOverride();
	}

	// -- Template management (backend WS API) --

	private _getTemplates() {
		return this._gridCtrl.templates;
	}

	private _templateErrorKey(err: unknown, op: "save" | "load"): string {
		const code = (err as { code?: string } | null)?.code;
		if (code === "not_calibrated") return "dialogs.template_not_calibrated";
		return op === "save"
			? "dialogs.template_save_failed"
			: "dialogs.template_load_failed";
	}

	private async _saveTemplate(): Promise<void> {
		try {
			await this._gridCtrl.saveTemplate();
		} catch (err) {
			console.error("Failed to save template", err);
			this._templateError = this._templateErrorKey(err, "save");
		}
	}

	private async _loadTemplate(name: string): Promise<void> {
		try {
			await this._gridCtrl.loadTemplate(name);
		} catch (err) {
			console.error(`Failed to load template "${name}"`, err);
			this._templateError = this._templateErrorKey(err, "load");
		}
	}

	private async _deleteTemplate(name: string): Promise<void> {
		try {
			await this._gridCtrl.deleteTemplate(name);
		} catch (err) {
			console.error(`Failed to delete template "${name}"`, err);
		}
	}

	/** Initialize grid from room dimensions after wizard finishes */
	private _initGridFromRoom(): void {
		this._grid = initGridFromRoom(this._roomWidth, this._roomDepth);
	}

	// -- Coordinate mapping (perspective transform) --

	/**
	 * Map a target to percentage coordinates for the editor grid.
	 * Uses the backend's already-transformed x/y (perspective applied server-side).
	 */
	private _mapTargetToPercent(target: Target): { x: number; y: number } {
		return mapTargetToPercent(
			target.x,
			target.y,
			this._roomWidth,
			this._roomDepth,
		);
	}

	/** Compute the inverse perspective (room→sensor) from the forward perspective. */
	private _getInversePerspective(): number[] | null {
		return getInversePerspective(this._perspective);
	}

	/** Apply a perspective transform (8 coefficients) to a point. */
	private _applyPerspective(
		h: number[],
		x: number,
		y: number,
	): { x: number; y: number } {
		return applyPerspective(h, x, y);
	}

	/** Check if a grid cell (col, row) is within the sensor's FOV and range.
	 *  Works in sensor-space: transform cell's room-space position back to
	 *  sensor-space via the inverse perspective, then check distance and FOV angle.
	 */
	/** Cache sensor FOV geometry in room-space (recomputed when perspective changes). */
	private _fovCache: SensorFov | null = null;
	private _fovPerspective: number[] | null = null;

	private _getSensorFov(): SensorFov | null {
		if (!this._perspective) return null;
		if (this._fovCache && this._fovPerspective === this._perspective)
			return this._fovCache;

		this._fovCache = computeSensorFov(this._perspective);
		this._fovPerspective = this._perspective;
		return this._fovCache;
	}

	// _computeMaxRangeMm does a full-grid scan via _autoDetectionRange when
	// auto-distance is on; cache against the inputs so hot paths (template
	// card render, per-cell range check) don't re-scan every render.
	private _maxRangeCache: number | null = null;
	private _maxRangeCacheGrid: Uint8Array | null = null;
	private _maxRangeCacheAuto: boolean | null = null;
	private _maxRangeCacheMax: number | null = null;

	private _computeMaxRangeMm(): number {
		if (
			this._maxRangeCache !== null &&
			this._maxRangeCacheGrid === this._grid &&
			this._maxRangeCacheAuto === this._targetAutoDistance &&
			this._maxRangeCacheMax === this._targetMaxDistance
		) {
			return this._maxRangeCache;
		}
		const value = computeMaxRangeMm(
			this._targetAutoDistance,
			this._targetAutoDistance ? this._autoDetectionRange() : 0,
			this._targetMaxDistance,
		);
		this._maxRangeCacheGrid = this._grid;
		this._maxRangeCacheAuto = this._targetAutoDistance;
		this._maxRangeCacheMax = this._targetMaxDistance;
		this._maxRangeCache = value;
		return value;
	}

	// Template card metrics cache — keyed by template object reference.
	// Invalidated when perspective or max-range changes (FOV inputs).
	// fetchTemplates returns fresh objects each call, so stale entries drop
	// naturally via WeakMap GC when the old array is replaced.
	private _templateMetricsCache = new WeakMap<
		object,
		{
			perspective: number[] | null;
			maxRangeMm: number;
			widthM: number;
			depthM: number;
		}
	>();

	private _getTemplateMetrics(t: {
		grid: number[];
		roomWidth: number;
		roomDepth: number;
	}): { widthM: number; depthM: number } {
		const perspective = this._perspective;
		const maxRangeMm = this._computeMaxRangeMm();
		const cached = this._templateMetricsCache.get(t);
		if (
			cached &&
			cached.perspective === perspective &&
			cached.maxRangeMm === maxRangeMm
		) {
			return { widthM: cached.widthM, depthM: cached.depthM };
		}
		const metrics = getGridRoomMetrics(
			new Uint8Array(t.grid),
			t.roomWidth,
			perspective,
			this._getSensorFov(),
			maxRangeMm,
		);
		const widthM = metrics ? metrics.widthM : t.roomWidth / 1000;
		const depthM = metrics ? metrics.depthM : t.roomDepth / 1000;
		this._templateMetricsCache.set(t, {
			perspective,
			maxRangeMm,
			widthM,
			depthM,
		});
		return { widthM, depthM };
	}

	/**
	 * Max range for the editor grid.  When auto-distance is on the firmware
	 * is widened to MAX_RANGE during editing (_pushWidenedDistanceOverride),
	 * so the FOV visualisation must match.  When manual, use the user's value.
	 */
	private _editorMaxRangeMm(): number {
		return this._targetAutoDistance
			? MAX_RANGE
			: this._targetMaxDistance * 1000;
	}

	/** Get raw room bounds without padding (only actual inside cells) */
	private _getRawRoomBounds(): {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} {
		return getRawRoomBounds(this._grid);
	}

	/** Map a target to a fractional grid cell position (col, row) */
	private _mapTargetToGridCell(
		target: Target,
	): { col: number; row: number } | null {
		return mapTargetToGridCell(
			target.x,
			target.y,
			this._roomWidth,
			this._roomDepth,
		);
	}

	// -- Device selector --

	/** Guard navigation when dirty — shows dialog and queues the action */
	private _guardNavigation(action: () => void): void {
		if (this._dirty) {
			this._pendingNavigation = action;
			this._showUnsavedDialog = true;
		} else {
			action();
		}
	}

	private _discardAndNavigate(): void {
		this._dirty = false;
		this._showUnsavedDialog = false;
		if (this._pendingNavigation) {
			this._pendingNavigation();
			this._pendingNavigation = null;
		}
	}

	// -- Styles --

	static styles = [
		hostStyles,
		panelStyles,
		dialogStyles,
		buttonStyles,
		headerStyles,
		protocolFullpageStyles,
		layoutStyles,
		liveMenuStyles,
		css`
    .cell {
      cursor: pointer;
      transition: opacity 0.1s;
    }

    .cell:hover {
      opacity: 0.75;
    }

    .overlay-help {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 16px;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    .save-cancel-bar {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      border-top: 1px solid var(--divider-color, #eee);
      margin-top: auto;
    }

    .live-section-link {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
    }

    .live-section-link:hover {
      text-decoration: underline;
    }

    .live-section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px 6px;
    }

    .debug-log-container {
      max-height: 200px;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--card-background-color, #1e1e1e);
      border: 1px solid var(--divider-color, #333);
      border-radius: 6px;
      padding: 6px 8px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
    }

    .debug-log-line {
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--primary-text-color, #e0e0e0);
    }

    .debug-log-btn {
      background: none;
      border: 1px solid var(--divider-color, #444);
      border-radius: 4px;
      color: var(--secondary-text-color, #999);
      font-size: 10px;
      padding: 2px 8px;
      cursor: pointer;
    }

    .debug-log-btn:hover {
      color: var(--primary-text-color);
      border-color: var(--primary-text-color, #ccc);
    }

    .target-menu-backdrop {
      position: absolute;
      inset: 0;
      z-index: 30;
    }

    .target-menu {
      position: absolute;
      transform: translate(-50%, 8px);
      z-index: 31;
      background: var(--card-background-color, #1e1e1e);
      border: 1px solid var(--divider-color, #444);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      padding: 4px 0;
      min-width: 180px;
    }

    .target-menu-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--primary-text-color, #e0e0e0);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }

    .target-menu-item:hover {
      background: var(--secondary-background-color, #333);
    }

    .tab-layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .tab-layout > :not(.tab-bar) {
      flex: 1;
      overflow: auto;
    }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background: var(--app-header-background-color, var(--primary-color));
      padding: 0 16px;
      flex-shrink: 0;
    }

    .tab {
      padding: 12px 20px;
      border: none;
      background: none;
      color: var(--app-header-text-color, white);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 3px solid transparent;
    }

    .tab.active {
      opacity: 1;
      border-bottom-color: var(--app-header-text-color, white);
    }

    .primary-btn {
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

  `,
	];

	// -- Render methods --

	private _renderGlobalDialogs() {
		return html`
      ${this._showTemplateSave ? this._renderTemplateSaveDialog() : nothing}
      ${this._showTemplateLoad ? this._renderTemplateLoadDialog() : nothing}
      ${
				this._templateError
					? html`
          <div class="template-dialog template-error-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.template_error_title")}</h3>
              <p class="overlay-help">${this._localize(this._templateError)}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-primary"
                  @click=${() => {
										this._templateError = null;
									}}
                >${this._localize("common.ok") || "OK"}</button>
              </div>
            </div>
          </div>
        `
					: nothing
			}
      ${
				this._showUnsavedDialog
					? html`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.unsaved_changes")}</h3>
              <p class="overlay-help">${this._localize("dialogs.unsaved_changes_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${() => {
										this._showUnsavedDialog = false;
										this._pendingNavigation = null;
									}}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${this._discardAndNavigate}
                >${this._localize("common.discard")}</button>
              </div>
            </div>
          </div>
        `
					: nothing
			}
      ${
				this._showDeleteCalibrationDialog
					? html`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.delete_calibration_title")}</h3>
              <p class="overlay-help">${this._localize("dialogs.delete_calibration_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${() => {
										this._showDeleteCalibrationDialog = false;
									}}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${this._deleteCalibration}
                >${this._localize("common.delete")}</button>
              </div>
            </div>
          </div>
        `
					: nothing
			}
    `;
	}

	private _renderTabBar() {
		return html`
			<div class="tab-bar">
				<button class="tab ${this._panelTab === "config" ? "active" : ""}"
					@click=${() => {
						this._flasherCtrl.resetUsbState();
						this._panelTab = "config";
						this._loadDevices();
					}}>${this._localize("tabs.device_configuration")}</button>
				<button class="tab ${this._panelTab === "flasher" ? "active" : ""}"
					@click=${() => {
						this._flasherCtrl.resetUsbState();
						this._panelTab = "flasher";
						if (this._flasherCtrl.loading) {
							this._flasherCtrl.hass = this.hass;
							this._flasherCtrl.subscribeDeviceList();
						}
					}}>${this._localize("tabs.flash_firmware")}</button>
			</div>
		`;
	}

	render() {
		if (this._panelTab === "flasher") {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
					.hass=${this.hass}
					.flashableDevices=${this._flasherCtrl.flashableDevices}
					.loading=${this._flasherCtrl.loading}
					.localize=${this._localize}
					.usbFlashState=${this._flasherCtrl.usbFlashState}
					.wifiNetworks=${this._flasherCtrl.wifiNetworks}
					.firmwareBaseUrl=${this._flasherCtrl.firmwareBaseUrl}
					.firmwareVersion=${this._flasherCtrl.firmwareVersion}
					.integrationVersion=${this._flasherCtrl.integrationVersion}
					.otaStates=${this._flasherCtrl.otaStates}
					.cancelledDeviceIpHint=${this._flasherCtrl.cancelledDeviceIpHint}
					@flash-complete=${() => {
						this._flasherCtrl.resetUsbState();
						this._loadDevices();
						this._panelTab = "config";
					}}
					@usb-flash=${(e: CustomEvent) => {
						this._handleUsbFlash(e.detail.variant);
					}}
					@usb-wifi-config=${() => {
						this._handleUsbWifiConfig();
					}}
					@usb-retry=${this._handleUsbRetry}
					@retry-ha-add=${this._handleRetryHaAdd}
					@flasher-cancel=${this._handleFlasherCancel}
					@wifi-scan=${() => {
						this._handleWifiScan();
					}}
					@wifi-provision=${(e: CustomEvent) => {
						this._handleWifiProvision(e.detail.ssid, e.detail.password);
					}}
					@update-firmware=${(e: CustomEvent) => {
						this._flasherCtrl.startOta(e.detail.mac);
					}}
					@retry-ota=${(e: CustomEvent) => {
						this._flasherCtrl.dismissOtaError(e.detail.mac);
					}}
					@wifi-complete=${() => {
						this._flasherCtrl.resetUsbState();
						this._loadDevices();
						this._panelTab = "config";
					}}
				></epp-flasher-view>
			</div>`;
		}

		if (this.hass?.connection?.connected === false || !this._haConnected) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				</div>
			</div>`;
		}

		if (this._loading) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">${this._localize("common.loading")}</div>
			</div>`;
		}

		if (!this._devices.length) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="empty-state">
					<p>${this._localize("flasher.no_eppgrid_devices")}</p>
					<button class="primary-btn" @click=${() => {
						this._panelTab = "flasher";
						this._flasherCtrl.hass = this.hass;
						this._flasherCtrl.subscribeDeviceList();
					}}>
							${this._localize("flasher.flash_from_tab")}
					</button>
				</div>
			</div>`;
		}

		if (this._setupStep !== null) {
			return html`<div class="tab-layout">
        ${this._renderTabBar()}
        <div class="panel">
          ${this._renderHeader()}
          <epp-wizard
            .hass=${this.hass}
            .selectedMac=${this._selectedMac}
            .rawTargets=${this._rawTargets}
            .sensorState=${{ occupancy: this._sensorState.occupancy }}
            .localize=${this._localize}
            .initialRoomWidth=${this._roomWidth}
            .initialRoomDepth=${this._roomDepth}
            @calibration-complete=${async (e: CustomEvent) => {
							const { perspective, roomWidth, roomDepth } = e.detail;
							this._perspective = perspective;
							this._roomWidth = roomWidth;
							this._roomDepth = roomDepth;
							this._initGridFromRoom();
							this._setupStep = null;
							this._view = "live";
							// set_setup enables zone_presence — update local state
							this._entitiesConfig = {
								...this._entitiesConfig,
								zone_presence: true,
							};
							await this._gridCtrl.applyLayout().catch((err: unknown) => {
								console.error("Failed to apply layout after calibration", err);
							});
						}}
          @wizard-cancel=${() => {
						this._setupStep = null;
					}}
          ></epp-wizard>
        </div>
      </div>`;
		}

		if (this._deviceCtrl.reconnecting) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				</div>
				${this._renderGlobalDialogs()}
			</div>`;
		}

		if (this._deviceCtrl.connectionFailed) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;
		}

		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		const protocolOk =
			!dev ||
			dev.firmware_status === "compatible" ||
			dev.firmware_status === "unavailable";

		if (!protocolOk) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;
		}

		const content =
			this._view === "settings"
				? this._renderSettings()
				: this._view === "editor" && this._perspective
					? this._renderEditor()
					: this._renderLiveOverview();

		return html`<div class="tab-layout">${this._renderTabBar()}${content}${this._renderGlobalDialogs()}</div>`;
	}

	private async _deleteCalibration(): Promise<void> {
		this._showDeleteCalibrationDialog = false;
		this._perspective = null;
		this._roomWidth = 0;
		this._roomDepth = 0;
		this._grid = new Uint8Array(GRID_COLS * GRID_ROWS);
		this._zoneConfigs = INITIAL_ZONE_SLOTS;
		this._furniture = [];
		// set_setup will disable zone_presence and target_xy — update local state
		this._entitiesConfig = {
			...this._entitiesConfig,
			zone_presence: false,
			target_xy: false,
		};
		// Reset auto distances to maximums and persist before clearing
		// calibration, so _push_config_to_device sends the correct values.
		if (this._targetAutoDistance) {
			this._targetMaxDistance = 6;
		}
		if (this._staticAutoDistance) {
			this._staticMinDistance = 0.3;
			this._staticMaxDistance = 16;
		}
		// Clear calibration and layout on the backend
		try {
			if (this._targetAutoDistance || this._staticAutoDistance) {
				await this.hass.callWS({
					type: "eppgrid/set_settings",
					mac: this._selectedMac,
					temperature_offset: this._temperatureOffset,
					humidity_offset: this._humidityOffset,
					illuminance_offset: this._illuminanceOffset,
					motion_timeout: this._motionTimeout,
					target_auto_distance: this._targetAutoDistance,
					target_max_distance: this._targetMaxDistance,
					static_auto_distance: this._staticAutoDistance,
					static_min_distance: this._staticMinDistance,
					static_max_distance: this._staticMaxDistance,
					static_trigger_threshold: this._staticTriggerThreshold,
					static_renew_threshold: this._staticRenewThreshold,
					static_timeout: this._staticTimeout,
					static_on_delay: this._staticOnDelay,
					led_mode: this._ledMode,
					led_brightness: this._ledBrightness,
					led_presence_color: this._ledPresenceColor,
					relay_trigger_mode: this._relayTriggerMode,
					relay_contact_mode: this._relayContactMode,
					entities: this._entitiesConfig || {},
				});
			}
			await this.hass.callWS({
				type: "eppgrid/set_setup",
				mac: this._selectedMac,
				perspective: [0, 0, 0, 0, 0, 0, 0, 0],
				room_width: 0,
				room_depth: 0,
			});
		} catch (e) {
			console.error("Failed to delete calibration", e);
		}
		this._dirty = false;
		this._view = "live";
	}

	private _changePlacement(): void {
		this._guardNavigation(() => {
			this._setupStep = "guide";
			this._pushWidenedDistanceOverride();
		});
	}

	private _renderHeader() {
		return html`
      <div class="panel-header">
        <ha-select
          .value=${this._selectedMac}
          .options=${this._devices.map((d) => ({
						value: d.mac,
						label: d.area ? `${d.name} (${d.area})` : d.name,
					}))}
          @selected=${(e: CustomEvent<{ value: string }>) => {
						const val = e.detail.value;
						if (!val || val === this._selectedMac) return;
						this._guardNavigation(async () => {
							this._closeDeviceSession();
							this._selectedMac = val;
							localStorage.setItem("epp_selected_mac", val);
							await this._loadDeviceConfig(val);
						});
					}}
          @closed=${(e: Event) => e.stopPropagation()}
        ></ha-select>
      </div>
    `;
	}

	private _renderProtocolBanner() {
		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		if (!dev || dev.firmware_status === "compatible") return nothing;

		const status = dev.firmware_status;
		const isBehind = status === "firmware_behind";
		const isUnavailable = status === "unavailable";
		const message = isUnavailable
			? this._localize("protocol.unavailable")
			: isBehind
				? this._localize("protocol.firmware_behind")
				: this._localize("protocol.firmware_ahead");

		const isAhead = status === "firmware_ahead";
		return html`
			<div class="protocol-fullpage protocol-fullpage-${isBehind ? "warning" : "info"}">
				<ha-icon icon=${isBehind ? "mdi:alert-circle-outline" : "mdi:information-outline"}></ha-icon>
				<p>${message}</p>
				${
					isBehind
						? html`<button class="wizard-btn wizard-btn-primary"
						@click=${() => {
							this._panelTab = "flasher";
							if (this._flasherCtrl.loading) {
								this._flasherCtrl.hass = this.hass;
								this._flasherCtrl.subscribeDeviceList();
							}
						}}
					>${this._localize("protocol.update_firmware")}</button>`
						: nothing
				}
				${
					isAhead
						? html`<a href="/hacs/repository/1172848595" class="protocol-link"
					>${this._localize("protocol.open_hacs")}</a>`
						: nothing
				}
			</div>
		`;
	}

	private _renderConnectionBanner() {
		if (!this._deviceCtrl.connectionFailed) return nothing;

		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		const isOffline = dev?.firmware_status === "unavailable";

		if (isOffline) {
			return html`
				<div class="protocol-fullpage protocol-fullpage-info">
					<ha-icon icon="mdi:access-point-off"></ha-icon>
					<p>${this._localize("connection.offline")}</p>
					<button class="wizard-btn wizard-btn-primary"
						@click=${() => this._retryConnection()}
					>${this._localize("connection.retry")}</button>
				</div>
			`;
		}

		const count = dev?.current_connection_count;

		return html`
			<div class="protocol-fullpage protocol-fullpage-warning">
				<ha-icon icon="mdi:connection"></ha-icon>
				<p>${this._localize("connection.failed")}</p>
				${count != null ? html`<p>${this._localize("connection.client_count", { count })}</p>` : nothing}
				<p style="opacity: 0.7; font-size: 0.9em">${this._localize("connection.check_connections")}</p>
				<button class="wizard-btn wizard-btn-primary"
					@click=${() => this._retryConnection()}
				>${this._localize("connection.retry")}</button>
			</div>
		`;
	}

	private _retryConnection(): void {
		if (this._selectedMac) {
			this._loadDeviceConfig(this._selectedMac);
		}
	}

	private _renderLiveGrid() {
		// Track last in-room position for pending display (live overview
		// uses backend status — active means target is in saved room grid)
		for (let i = 0; i < this._targets.length; i++) {
			const t = this._targets[i];
			if (t.x != null && t.y != null && t.status === "active") {
				this._zoneEngineState.targetPrevXY[i] = { x: t.x, y: t.y };
			}
		}

		// Build backend occupancy map
		const occupancy: Record<number, boolean> = {};
		for (const [k, v] of Object.entries(this._zoneState.occupancy)) {
			occupancy[Number(k)] = v as boolean;
		}

		return html`
			<epp-grid
				.grid=${this._grid}
				.zoneConfigs=${this._namedZones()}
				.targets=${this._targets}
				.roomWidth=${this._roomWidth}
				.roomDepth=${this._roomDepth}
				.perspective=${this._perspective}
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.sidebarTab=${this._sidebarTab}
				.showHitCounts=${this._showHitCounts}
				.occupancy=${occupancy}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.heatmapColors=${this._showHitCounts ? this._computeHeatmapColors() : null}
				.localize=${this._localize}
				.maxGridPx=${480}
				.maxRangeMm=${computeMaxRangeMm(this._targetAutoDistance, this._autoDetectionRange(), this._targetMaxDistance)}
				@furniture-select=${(e: CustomEvent) => {
					this._selectedFurnitureId = e.detail;
				}}
				@furniture-pointer-down=${(e: CustomEvent) => {
					const { e: ptrEvent, id, type, handle } = e.detail;
					this._onFurniturePointerDown(ptrEvent, id, type, handle);
				}}
				@furniture-delete=${(e: CustomEvent) => {
					this._removeFurniture(e.detail);
				}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${(e: CustomEvent) => {
					this._showTargetMenu(e.detail);
				}}
			></epp-grid>
		`;
	}

	private _showTargetMenu(detail: {
		targetIndex: number;
		x: number;
		y: number;
		pctX: number;
		pctY: number;
	}): void {
		this._targetMenu = detail;
	}

	private _closeTargetMenu(): void {
		this._targetMenu = null;
	}

	private _targetCellIndex(x: number, y: number): number {
		const pos = mapTargetToGridCell(x, y, this._roomWidth, this._roomDepth);
		if (!pos) return -1;
		const col = Math.floor(pos.col);
		const row = Math.floor(pos.row);
		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return -1;
		return row * GRID_COLS + col;
	}

	private async _dismissTarget(): Promise<void> {
		if (!this._targetMenu) return;
		const { targetIndex, x, y } = this._targetMenu;
		const idx = this._targetCellIndex(x, y);
		if (idx >= 0) {
			this._dismissedTargets = new Map(this._dismissedTargets);
			this._dismissedTargets.set(targetIndex, idx);

			try {
				await this.hass.callWS({
					type: "eppgrid/dismiss_target",
					mac: this._selectedMac,
					target_index: targetIndex,
					cell_index: idx,
				});
			} catch (err) {
				console.error("Failed to dismiss target:", err);
			}
		}
		this._closeTargetMenu();
		this.requestUpdate();
	}

	private async _setInterference(level: number): Promise<void> {
		if (!this._targetMenu) return;
		const idx = this._targetCellIndex(this._targetMenu.x, this._targetMenu.y);
		if (idx < 0 || !cellIsInside(this._grid[idx])) {
			this._closeTargetMenu();
			return;
		}
		this._grid = new Uint8Array(this._grid);
		this._grid[idx] = cellSetInterference(this._grid[idx], level);
		this._dirty = true;
		this._closeTargetMenu();
		await this._gridCtrl.applyLayout();
	}

	private _renderTargetMenu() {
		if (!this._targetMenu) return nothing;
		const { pctX, pctY } = this._targetMenu;
		return html`
			<div class="target-menu-backdrop" @click=${() => this._closeTargetMenu()}></div>
			<div class="target-menu" style="left: ${pctX}%; top: ${pctY}%;">
				<button class="target-menu-item" @click=${() => this._dismissTarget()}>
					${this._localize("live.delete_target")}
				</button>
				<button class="target-menu-item" @click=${() => this._setInterference(1)}>
					${this._localize("live.mark_interference")}
				</button>
				<button class="target-menu-item" @click=${() => this._setInterference(CELL_INTERFERENCE_SUPPRESS)}>
					${this._localize("live.suppress_detection")}
				</button>
			</div>
		`;
	}

	private _renderSaveCancelButtons() {
		const saveHandler =
			this._view === "settings" ? this._saveSettings : this._applyLayout;
		return html`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${() => {
						if (this._view === "editor") {
							this._cancelEditor();
						} else {
							this._cancelSettings();
						}
					}}
        >${this._localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this._saving || !this._dirty}
          @click=${saveHandler}
        >${this._saving ? this._localize("common.saving") : this._localize("common.save")}</button>
      </div>
    `;
	}

	private _renderLiveOverview() {
		const gridContent = this._perspective
			? this._renderLiveGrid()
			: html`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${{ occupancy: this._sensorState.occupancy }}
            .localize=${this._localize}
            @start-calibration=${() => this._changePlacement()}
          ></epp-wizard>`;

		return html`
      <div class="panel" @click=${(e: MouseEvent) => {
				if (!(e.target instanceof Element)) return;
				if (this._showLiveMenu && !e.target.closest(".sidebar-menu-wrapper")) {
					this._showLiveMenu = false;
				}
				if (this._targetMenu && !e.target.closest(".target-menu")) {
					this._closeTargetMenu();
				}
			}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" style="position: relative;">
              ${gridContent}
              ${this._targetMenu ? this._renderTargetMenu() : nothing}
            </div>
            ${this._perspective ? this._renderBackendDebugLog() : nothing}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this._localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${() => {
									this._showLiveMenu = !this._showLiveMenu;
								}}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${
									this._showLiveMenu
										? html`
                  <div class="sidebar-menu" @click=${() => {
										this._showLiveMenu = false;
									}}>
                    ${
											this._perspective
												? html`
                      <button class="sidebar-menu-item" @click=${() => {
												this._enterEditor("zones");
											}}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${() => {
												this._enterEditor("overlays");
											}}>
                        <ha-icon icon="mdi:blur" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.overlays")}
                      </button>
                      <button class="sidebar-menu-item" @click=${() => {
												this._enterEditor("furniture");
											}}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.furniture")}
                      </button>
                    `
												: nothing
										}
                    <button class="sidebar-menu-item" @click=${() => {
											this._view = "settings";
										}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${() => this._changePlacement()}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.room_calibration")}
                    </button>
                    ${
											this._perspective
												? html`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${() => {
												this._showDeleteCalibrationDialog = true;
											}}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.delete_calibration")}
                      </button>
                    `
												: nothing
										}
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item"
                      aria-disabled=${!this._perspective}
                      @click=${() => {
												if (!this._perspective) {
													this._templateError =
														"dialogs.template_not_calibrated";
													return;
												}
												this._showTemplateSave = true;
											}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.save_template")}
                    </button>
                    <button class="sidebar-menu-item"
                      aria-disabled=${!this._perspective}
                      @click=${async () => {
												if (!this._perspective) {
													this._templateError =
														"dialogs.template_not_calibrated";
													return;
												}
												await this._gridCtrl.fetchTemplates();
												this._showTemplateLoad = true;
											}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.load_template")}
                    </button>
                  </div>
                `
										: nothing
								}
              </div>
            </div>
            <div class="sidebar-scroll">
              <epp-live-sidebar
                .sensorState=${this._sensorState}
                .zoneState=${this._zoneState}
                .zoneConfigs=${this._namedZones()}
                .perspective=${this._perspective}
                .localize=${this._localize}
                @view-change=${(e: CustomEvent) => {
									this._view = e.detail.view;
									if (e.detail.sidebarTab)
										this._sidebarTab = e.detail.sidebarTab;
								}}
              ></epp-live-sidebar>
            </div>
          </div>
        </div>
      </div>
    `;
	}

	private _toggleAccordion(id: string) {
		this._openAccordions = this._openAccordions.has(id)
			? new Set()
			: new Set([id]);
	}

	/** Get the sensor position in room-space mm by transforming sensor origin (0,0). */
	private _getSensorRoomPosition(): { x: number; y: number } | null {
		return getSensorRoomPosition(this._perspective);
	}

	private _autoDetectionRange(): number {
		return autoDetectionRange(
			this._roomWidth,
			this._roomDepth,
			this._perspective,
			this._grid,
		);
	}

	private _renderSettings() {
		return html`
      <div class="panel">
        ${this._renderHeader()}
        <epp-settings-view
          .sensorState=${this._sensorState}
          .targetAutoDistance=${this._targetAutoDistance}
          .targetMaxDistance=${this._targetMaxDistance}
          .staticAutoDistance=${this._staticAutoDistance}
          .staticMinDistance=${this._staticMinDistance}
          .staticMaxDistance=${this._staticMaxDistance}
          .openAccordions=${this._openAccordions}
          .perspective=${this._perspective}
          .roomWidth=${this._roomWidth}
          .roomDepth=${this._roomDepth}
          .grid=${this._grid}
          .saving=${this._saving}
          .dirty=${this._dirty}
          .entitiesConfig=${this._entitiesConfig || {}}
          .temperatureOffset=${this._temperatureOffset}
          .humidityOffset=${this._humidityOffset}
          .illuminanceOffset=${this._illuminanceOffset}
          .motionTimeout=${this._motionTimeout}
          .staticTimeout=${this._staticTimeout}
          .staticTriggerThreshold=${this._staticTriggerThreshold}
          .staticRenewThreshold=${this._staticRenewThreshold}
          .staticOnDelay=${this._staticOnDelay}
          .logLevels=${this._logLevels}
          .bluetoothEnabled=${this._bluetoothEnabled}
          .co2Enabled=${this._co2Enabled}
          .ledMode=${this._ledMode}
          .ledBrightness=${this._ledBrightness}
          .ledPresenceColor=${this._ledPresenceColor}
          .relayTriggerMode=${this._relayTriggerMode}
          .relayContactMode=${this._relayContactMode}
          .targetUpdateRateMs=${this._targetUpdateRateMs}
          .zoneUpdateRateMs=${this._zoneUpdateRateMs}
          .localize=${this._localize}
          @accordion-toggle=${(e: CustomEvent) => {
						this._openAccordions = e.detail;
					}}
          @setting-change=${(e: CustomEvent) => {
						const { key, value } = e.detail;
						(this as any)[`_${key}`] = value;
					}}
          @dirty=${() => {
						this._dirty = true;
					}}
          @save=${(e: CustomEvent) => this._saveSettings(e.detail)}
          @cancel=${() => this._cancelSettings()}
        ></epp-settings-view>
      </div>
    `;
	}

	private _renderEditor() {
		// Run local zone engine replica and compute occupancy for editor view
		const engineResult = this._runLocalZoneEngine();
		const editorOccupancy = engineResult.occupancy;

		// Overwrite _targets status from frontend zone engine
		for (
			let i = 0;
			i < engineResult.targets.length && i < this._targets.length;
			i++
		) {
			this._targets[i].status = engineResult.targets[i].status;
		}

		// Derive sensors.occupancy from unsaved zone config
		const roomOccupied = Object.values(editorOccupancy).some((v) => v);
		this._sensorState.occupancy =
			this._sensorState.static_presence ||
			this._sensorState.motion_presence ||
			roomOccupied;

		return html`
      <div class="panel" @click=${(e: Event) => {
				const el = e.target as HTMLElement;
				if (!el.closest(".grid") && !el.closest(".zone-sidebar")) {
					if (!this._justPainted) this._activeZone = null;
				}
			}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" @click=${(e: Event) => {
							const onFurniture = e
								.composedPath()
								.some(
									(el) =>
										el instanceof HTMLElement &&
										el.classList.contains("furniture-item"),
								);
							if (!onFurniture) {
								this._selectedFurnitureId = null;
							}
						}}>
              <epp-grid
                .grid=${this._grid}
                .zoneConfigs=${this._namedZones()}
                .targets=${this._targets}
                .roomWidth=${this._roomWidth}
                .roomDepth=${this._roomDepth}
                .perspective=${this._perspective}
                .furniture=${this._furniture}
                .selectedFurnitureId=${this._selectedFurnitureId}
                .sidebarTab=${this._sidebarTab}
                .editable=${true}
                .activeZone=${this._activeZone}
                .showHitCounts=${this._showHitCounts}
                .occupancy=${editorOccupancy}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .heatmapColors=${this._showHitCounts ? this._computeHeatmapColors() : null}
                .localize=${this._localize}
                .maxGridPx=${480}
                .maxRangeMm=${this._editorMaxRangeMm()}
                .frozenBounds=${this._frozenBounds}
                @cell-paint=${(e: CustomEvent) => {
									const { index, action } = e.detail;
									if (action === "down") this._onCellMouseDown(index);
									else if (action === "enter") this._onCellMouseEnter(index);
									else if (action === "up") this._onCellMouseUp();
								}}
                @furniture-select=${(e: CustomEvent) => {
									this._selectedFurnitureId = e.detail;
								}}
                @furniture-pointer-down=${(e: CustomEvent) => {
									const { e: ptrEvent, id, type, handle } = e.detail;
									this._onFurniturePointerDown(ptrEvent, id, type, handle);
								}}
                @furniture-delete=${(e: CustomEvent) => {
									this._removeFurniture(e.detail);
								}}
              ></epp-grid>
            </div>
            ${this._sidebarTab === "zones" || this._sidebarTab === "overlays" ? this._renderDebugLog() : nothing}
          </div>
          <div class="zone-sidebar scrollable">
            <div class="sidebar-title">${
							this._sidebarTab === "furniture"
								? this._localize("sidebar.furniture")
								: this._sidebarTab === "overlays"
									? this._localize("sidebar.overlays")
									: this._localize("sidebar.detection_zones")
						}</div>
            <div class="sidebar-scroll">
            ${
							this._sidebarTab === "zones"
								? html`<epp-zone-sidebar
                    .zoneConfigs=${this._namedZones()}
                    .activeZone=${this._activeZone}
                    .zone0=${this._zoneConfigs[0]}
                    .localZoneState=${this._zoneEngineState.localZoneState}
                    .localize=${this._localize}
                    @zone-select=${(e: CustomEvent) => {
											this._activeZone = e.detail.zone;
											this._overlayMode = null;
										}}
                    @zone-add=${() => {
											this._addZone();
										}}
                    @zone-remove=${(e: CustomEvent) => {
											this._removeZone(e.detail.slot);
										}}
                    @zone-config-change=${(e: CustomEvent) => {
											const { index, updates } = e.detail;
											// Sidebar index is 0-based over named zones; slot = index + 1.
											const slot = index + 1;
											if (slot < 1 || slot >= this._zoneConfigs.length) return;
											const current = this._zoneConfigs[slot];
											if (current === null) return;
											const configs = [...this._zoneConfigs];
											configs[slot] = { ...current, ...updates };
											this._zoneConfigs = configs as unknown as ZoneSlots;
										}}
                    @zone0-change=${(e: CustomEvent<Partial<Zone0Config>>) => {
											const current = this._zoneConfigs[0];
											const next = [...this._zoneConfigs];
											next[0] = { ...current, ...e.detail };
											this._zoneConfigs = next as unknown as ZoneSlots;
										}}
                    @dirty=${() => {
											this._dirty = true;
										}}
                  ></epp-zone-sidebar>`
								: this._sidebarTab === "overlays"
									? html`<epp-overlay-sidebar
                    .overlayMode=${this._overlayMode}
                    .localize=${this._localize}
                    @overlay-select=${(e: CustomEvent) => {
											this._overlayMode = e.detail.mode;
										}}
                  ></epp-overlay-sidebar>`
									: html`<epp-furniture-sidebar
                    .furniture=${this._furniture}
                    .selectedFurnitureId=${this._selectedFurnitureId}
                    .hass=${this.hass}
                    .localize=${this._localize}
                    .showCustomIconPicker=${this._showCustomIconPicker}
                    .customIconValue=${this._customIconValue}
                    @furniture-add=${(e: CustomEvent) => {
											this._addFurniture(e.detail);
										}}
                    @furniture-add-custom=${(e: CustomEvent) => {
											this._addCustomFurniture(e.detail);
										}}
                    @furniture-remove=${(e: CustomEvent) => {
											this._removeFurniture(e.detail);
										}}
                    @furniture-update=${(e: CustomEvent) => {
											this._updateFurniture(e.detail.id, e.detail.updates);
										}}
                    @furniture-select=${(e: CustomEvent) => {
											this._selectedFurnitureId = e.detail;
										}}
                    @custom-icon-toggle=${() => {
											this._showCustomIconPicker = !this._showCustomIconPicker;
										}}
                    @custom-icon-change=${(e: CustomEvent) => {
											this._customIconValue = e.detail;
										}}
                    @dirty=${() => {
											this._dirty = true;
										}}
                  ></epp-furniture-sidebar>`
						}
            </div>
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `;
	}

	private _renderTemplateSaveDialog() {
		return html`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.save_template")}</h3>
          <input
            type="text"
            class="template-name-input"
            placeholder="${this._localize("dialogs.template_name")}"
            .value=${this._templateName}
            @input=${(e: Event) => {
							this._templateName = (e.target as HTMLInputElement).value;
						}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${() => {
								this._showTemplateSave = false;
							}}
            >${this._localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this._templateName.trim()}
              @click=${() => this._saveTemplate()}
            >${this._localize("common.save")}</button>
          </div>
        </div>
      </div>
    `;
	}

	private _renderTemplateLoadDialog() {
		const templates = this._getTemplates();
		return html`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.load_template")}</h3>
          ${
						templates.length === 0
							? html`<p class="overlay-help">${this._localize("dialogs.no_templates")}</p>`
							: html`<div class="template-card-grid">
                  ${templates.map(
										(t) => html`
                    <div class="template-card"
                      role="button"
                      tabindex="0"
                      @click=${() => this._loadTemplate(t.name)}
                      @keydown=${(e: KeyboardEvent) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													this._loadTemplate(t.name);
												}
											}}
                    >
                      <button class="template-card-delete"
                        type="button"
                        aria-label="${this._localize("common.delete")}"
                        @click=${(e: Event) => {
													e.stopPropagation();
													this._deleteTemplate(t.name);
												}}
                        @keydown=${(e: KeyboardEvent) => {
													e.stopPropagation();
												}}
                      >
                        <ha-icon icon="mdi:close"></ha-icon>
                      </button>
                      <div class="template-card-thumbnail">
                        ${renderTemplateThumbnail(
													t.grid,
													// New schema: zones is length-8 with slot 0 =
													// Zone0Config and slots 1-7 = named zones. The
													// thumbnail only uses the named zones (for cell
													// colouring, indexed by zoneId-1), so strip slot 0.
													(t.zones?.slice(1) as (ZoneConfig | null)[]) ??
														new Array(7).fill(null),
													t.roomWidth,
													t.roomDepth,
													t.furniture ?? [],
												)}
                      </div>
                      <div class="template-card-info">
                        <div class="template-card-name">${t.name}</div>
                        <div class="template-card-size">${(() => {
													// Same FOV-aware metrics the live footer uses; cached
													// per template to avoid re-scanning the grid every render.
													const { widthM, depthM } =
														this._getTemplateMetrics(t);
													return `${this._localize.formatNumber(widthM, 1)}m × ${this._localize.formatNumber(depthM, 1)}m`;
												})()}</div>
                      </div>
                    </div>
                  `,
									)}
                </div>`
					}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${() => {
								this._showTemplateLoad = false;
							}}
            >${this._localize("common.close")}</button>
          </div>
        </div>
      </div>
    `;
	}

	private _renderVisibleCells(
		minCol: number,
		maxCol: number,
		minRow: number,
		maxRow: number,
		cellPx: number,
		useBackendOccupancy = false,
	) {
		// Pre-compute heatmap colours per zone if enabled
		const heatmap = this._showHitCounts ? this._computeHeatmapColors() : null;

		let occupancy: Record<number, boolean>;

		if (useBackendOccupancy) {
			// Use zone occupancy from backend websocket data
			occupancy = {};
			for (const [k, v] of Object.entries(this._zoneState.occupancy)) {
				occupancy[Number(k)] = v as boolean;
			}
		} else {
			// Run local zone engine replica (matches backend zone_engine._tick)
			const engineResult = this._runLocalZoneEngine();
			occupancy = engineResult.occupancy;

			// Overwrite _targets status from frontend zone engine.
			// Position for pending targets is handled by the shared rendering
			// logic using _zoneEngineState.targetPrevXY.
			for (
				let i = 0;
				i < engineResult.targets.length && i < this._targets.length;
				i++
			) {
				this._targets[i].status = engineResult.targets[i].status;
			}

			// Derive sensors.occupancy from unsaved zone config
			const roomOccupied = Object.values(occupancy).some((v) => v);
			this._sensorState.occupancy =
				this._sensorState.static_presence ||
				this._sensorState.motion_presence ||
				roomOccupied;
		}

		const fov = this._getSensorFov();
		const maxRangeMm = this._computeMaxRangeMm();

		const cells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				const idx = r * GRID_COLS + c;
				const cellVal = this._grid[idx];
				const inRange = isCellInSensorRange(
					c,
					r,
					fov,
					this._roomWidth,
					maxRangeMm,
				);
				let bg = inRange ? this._getCellColor(idx) : CELL_BG_OUT_OF_RANGE;
				let border = "";
				if (inRange && cellIsInside(cellVal)) {
					const zoneId = cellZone(cellVal);
					if (heatmap) {
						const overlay = heatmap.get(zoneId);
						if (overlay) {
							bg = `linear-gradient(${overlay}, ${overlay}), linear-gradient(${bg}, ${bg})`;
						}
					}
					if (occupancy[zoneId]) {
						border = `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);`;
					}
				}
				cells.push(html`
          <div
            class="cell"
            style="background: ${bg}; width: ${cellPx}px; height: ${cellPx}px; ${border}"
            @mousedown=${() => {
							if (inRange) this._onCellMouseDown(idx);
						}}
            @mouseenter=${() => {
							if (inRange) this._onCellMouseEnter(idx);
						}}
          ></div>
        `);
			}
		}
		return cells;
	}

	/** Run local zone engine replica — delegated to TargetController. */
	private _runLocalZoneEngine(): ZoneEngineResult {
		return this._targetCtrl.runLocalZoneEngine();
	}

	/** Enrich a raw debug log string — delegated to TargetController. */
	private _enrichDebugLog(raw: string): string {
		return this._targetCtrl.enrichDebugLog(raw);
	}

	/** Compute rgba overlay colour per zone — delegated to TargetController. */
	private _computeHeatmapColors(): Map<number, string> {
		return this._targetCtrl.computeHeatmapColors();
	}

	/** Get trigger/renew/timeout for a zone from the current editor state. */
	private _getZoneThresholds(zid: number): {
		trigger: number;
		renew: number;
		timeout: number;
		handoffTimeout: number;
	} {
		const z0 = resolveZoneParams(this._zoneConfigs[0]);
		return getZoneThresholds(
			zid,
			this._namedZones(),
			z0.type,
			z0.trigger,
			z0.renew,
			z0.timeout,
			z0.handoff_timeout,
		);
	}

	private _renderBackendDebugLog() {
		return html`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${() => {
						this._showBackendDebugLog = !this._showBackendDebugLog;
						if (!this._showBackendDebugLog) {
							this._backendDebugLogLines = [];
							this._backendDebugLogPrev = null;
						}
					}}
        >
          <ha-icon icon=${this._showBackendDebugLog ? "mdi:chevron-down" : "mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          ${this._localize("live.debug.detection_events")}
        </button>
        ${
					this._showBackendDebugLog
						? html`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${() => {
								navigator.clipboard.writeText(
									this._backendDebugLogLines.join("\n"),
								);
							}}
            >${this._localize("live.debug.copy_all")}</button>
            <button
              class="debug-log-btn"
              @click=${() => {
								this._backendDebugLogLines = [];
								this._backendDebugLogPrev = null;
								const el = this.shadowRoot?.getElementById(
									"backend-debug-log-scroll",
								);
								if (el) {
									el.innerHTML = "";
									const placeholder = document.createElement("div");
									placeholder.style.cssText =
										"color: var(--secondary-text-color, #999); font-style: italic;";
									placeholder.textContent = this._localize(
										"live.debug.waiting_for_events",
									);
									el.appendChild(placeholder);
								}
							}}
            >${this._localize("live.debug.clear")}</button>
          </div>
          <div class="debug-log-container" id="backend-debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `
						: nothing
				}
      </div>
    `;
	}

	private _renderDebugLog() {
		return html`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${() => {
						this._showDebugLog = !this._showDebugLog;
						if (!this._showDebugLog) {
							this._debugLogLines = [];
							this._debugLogPrev = null;
						}
					}}
        >
          <ha-icon icon=${this._showDebugLog ? "mdi:chevron-down" : "mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          ${this._localize("live.debug.detection_events")}
        </button>
        ${
					this._showDebugLog
						? html`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${() => {
								navigator.clipboard.writeText(this._debugLogLines.join("\n"));
							}}
            >${this._localize("live.debug.copy_all")}</button>
            <button
              class="debug-log-btn"
              @click=${() => {
								this._debugLogLines = [];
								this._debugLogPrev = null;
								const el = this.shadowRoot?.getElementById("debug-log-scroll");
								if (el) {
									el.innerHTML = "";
									const placeholder = document.createElement("div");
									placeholder.style.cssText =
										"color: var(--secondary-text-color, #999); font-style: italic;";
									placeholder.textContent = this._localize(
										"live.debug.waiting_for_events",
									);
									el.appendChild(placeholder);
								}
							}}
            >${this._localize("live.debug.clear")}</button>
          </div>
          <div class="debug-log-container" id="debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `
						: nothing
				}
      </div>
    `;
	}

	private _renderFurnitureOverlay(
		cellPx: number,
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		if (!this._furniture.length) return nothing;

		return html`
			<epp-furniture-overlay
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.roomWidth=${this._roomWidth}
				.cellPx=${cellPx}
				.minCol=${minCol}
				.minRow=${minRow}
				.visCols=${visCols}
				.visRows=${visRows}
				.sidebarTab=${this._sidebarTab}
				.localize=${this._localize}
				@furniture-select=${(e: CustomEvent) => {
					this._selectedFurnitureId = e.detail;
				}}
				@furniture-pointer-down=${(e: CustomEvent) => {
					const { e: ptrEvent, id, type, handle } = e.detail;
					this._onFurniturePointerDown(ptrEvent, id, type, handle);
				}}
				@furniture-delete=${(e: CustomEvent) => {
					this._removeFurniture(e.detail);
				}}
			></epp-furniture-overlay>
		`;
	}

	private async _handleUsbWifiConfig(): Promise<void> {
		const ctrl = this._flasherCtrl;
		if (ctrl.opRunning) {
			ctrl.updateUsbState({
				step: "error",
				errorKey: "usb.errors.serial_port_busy",
				fatal: true,
			});
			return;
		}
		const myOp = ctrl.opId;
		ctrl.opRunning = true;
		try {
			if (!ctrl.serialPort) {
				ctrl.updateUsbState({ step: "connecting" });
				ctrl.serialPort = await navigator.serial.requestPort();
			}
			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}

			ctrl.updateUsbState({ step: "wifi_scan" });
			const { writer, reader, networks } = await runWifiScan(ctrl.serialPort);
			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}

			ctrl.wifiNetworks = networks;
			ctrl.updateUsbState({ step: "wifi_provision" });

			(ctrl as any)._serialWriter = writer;
			(ctrl as any)._serialReader = reader;
			ctrl.opRunning = false;
		} catch (err: any) {
			ctrl.opRunning = false;
			if (ctrl.opId !== myOp) return;
			if (err?.name === "NotFoundError") {
				ctrl.resetUsbState();
				return;
			}
			const lastStep = ctrl.usbFlashState?.step;
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
			};
			ctrl.updateUsbState({
				step: "error",
				lastStep,
				errorKey: e.errorKey ?? "wifi.errors.scan_failed",
				errorParams: e.errorParams as
					| Record<string, string | number>
					| undefined,
			});
		}
	}

	private async _handleUsbFlash(variant: string): Promise<void> {
		const ctrl = this._flasherCtrl;
		if (ctrl.opRunning) {
			ctrl.updateUsbState({
				step: "error",
				errorKey: "usb.errors.serial_port_busy",
				fatal: true,
			});
			return;
		}
		const myOp = ctrl.opId;
		ctrl.opRunning = true;
		try {
			// Step 1: Request serial port
			ctrl.updateUsbState({ step: "connecting" });
			const port = await navigator.serial.requestPort();
			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}
			ctrl.serialPort = port;

			// Step 2: Flash firmware
			ctrl.updateUsbState({ step: "flashing", progress: 0 });
			await flashFirmware(
				port,
				variant,
				(pct) => {
					ctrl.updateUsbState({ step: "flashing", progress: pct });
				},
				{
					baseUrl: ctrl.firmwareBaseUrl,
					beforeFlash: async (mac: string | undefined) => {
						if (!mac) return;
						const matched = ctrl.flashableDevices.find(
							(d) => d.mac.toUpperCase() === mac,
						);
						if (
							matched?.firmware_type === "original" &&
							matched?.esphome_config_entry_id
						) {
							const ok = window.confirm(
								this._localize("flasher.confirm_delete_message"),
							);
							if (!ok)
								throw Object.assign(new Error("Flash cancelled"), {
									errorKey: "flasher.errors.flash_cancelled",
								});
							await ctrl.deleteEsphomeDevice(matched.esphome_config_entry_id);
						}
					},
				},
			);
			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}

			if (variant.startsWith("ethernet")) {
				// Ethernet variants have no WiFi — skip provisioning
				await port.close().catch(() => {});
				ctrl.serialPort = null;
				ctrl.opRunning = false;
				ctrl.updateUsbState({ step: "complete", variant });
				return;
			}

			// Step 3: Check if device is already provisioned (firmware-upgrade path)
			ctrl.updateUsbState({ step: "wifi_check" });
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
				// _handleFlasherCancel can both signal abort AND await the
				// op's settlement before closing the port (otherwise the
				// reader lock is still held when close() runs and close
				// rejects, leaving the port open and unusable for retries).
				const abortCtrl = new AbortController();
				(ctrl as any)._wifiCheckAbort = abortCtrl;
				const queryPromise = queryImprovState(
					port,
					{ readDelay: 30000 },
					{ signal: abortCtrl.signal },
				);
				(ctrl as any)._wifiCheckPromise = queryPromise;
				const info = await queryPromise;
				(ctrl as any)._wifiCheckAbort = null;
				(ctrl as any)._wifiCheckPromise = null;
				if (info.state === "PROVISIONED" && info.ip && info.ip !== "0.0.0.0") {
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

			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}

			if (skipIp && skipWriter && skipReader) {
				// Device is already on the network — release the query's serial locks
				// so `runWifiScan` can re-acquire them if the user clicks the
				// "Configure WiFi" override. Keep the port itself open and attached
				// to ctrl.serialPort for that override path.
				try {
					skipReader.releaseLock();
				} catch {}
				try {
					skipWriter.releaseLock();
				} catch {}
				ctrl.updateUsbState({
					step: "wifi_configured",
					ip: skipIp,
					autoSkipped: true,
				});
				ctrl.opRunning = false;
				await this._addToHa(skipIp);
				return;
			}

			// Step 4: WiFi scan
			ctrl.updateUsbState({ step: "wifi_scan" });
			const { writer, reader, networks } = await runWifiScan(port);
			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}

			ctrl.wifiNetworks = networks;
			ctrl.updateUsbState({ step: "wifi_provision" });

			(ctrl as any)._serialWriter = writer;
			(ctrl as any)._serialReader = reader;
			ctrl.opRunning = false;
		} catch (err: any) {
			if (ctrl.opId !== myOp) {
				ctrl.opRunning = false;
				return;
			}
			if (err?.name === "NotFoundError") {
				// User cancelled port picker
				ctrl.resetUsbState();
				return;
			}
			const lastStep = ctrl.usbFlashState?.step;
			// Clean up port on error — don't leave it dangling
			if (ctrl.serialPort) {
				try {
					ctrl.serialPort.close().catch(() => {});
				} catch {}
				ctrl.serialPort = null;
			}
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
				name?: string;
			};
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
			ctrl.opRunning = false;
			ctrl.updateUsbState({
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

	private async _handleWifiProvision(
		ssid: string,
		password: string,
	): Promise<void> {
		const ctrl = this._flasherCtrl;
		const myOp = ctrl.opId;
		const port = ctrl.serialPort;
		if (!port?.writable || !port?.readable) {
			ctrl.updateUsbState({
				step: "error",
				errorKey: "usb.errors.serial_port_unavailable",
			});
			return;
		}

		// Release any old reader/writer locks before getting fresh ones
		try {
			(ctrl as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(ctrl as any)._serialWriter?.releaseLock();
		} catch {}

		const writer = port.writable.getWriter();
		const reader = port.readable.getReader();
		(ctrl as any)._serialWriter = writer;
		(ctrl as any)._serialReader = reader;

		try {
			ctrl.updateUsbState({ step: "wifi_connecting" });
			await runWifiProvision(writer, ssid, password);
			if (ctrl.opId !== myOp) return;

			// Wait for PROVISIONED state (creds saved to NVS)
			ctrl.updateUsbState({ step: "reading_ip" });
			const ip = await detectIpAddress(reader, writer, 60000);
			if (ctrl.opId !== myOp) return;

			reader.releaseLock();
			writer.releaseLock();

			(ctrl as any)._serialReader = null;
			(ctrl as any)._serialWriter = null;
			await port.close().catch(() => {});
			ctrl.serialPort = null;

			// WiFi side succeeded. Intermediate state while HA-add runs.
			ctrl.updateUsbState({ step: "wifi_configured", ip });

			await this._addToHa(ip);
		} catch (err: any) {
			try {
				(ctrl as any)._serialReader?.releaseLock();
			} catch {}
			try {
				(ctrl as any)._serialWriter?.releaseLock();
			} catch {}
			(ctrl as any)._serialReader = null;
			(ctrl as any)._serialWriter = null;
			if (ctrl.opId !== myOp) return;
			const lastStep = ctrl.usbFlashState?.step;
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
			};
			ctrl.updateUsbState({
				step: "error",
				lastStep,
				errorKey: e.errorKey ?? "wifi.errors.provisioning_failed",
				errorParams: e.errorParams as
					| Record<string, string | number>
					| undefined,
			});
		}
	}

	private async _addToHa(ip: string): Promise<void> {
		const ctrl = this._flasherCtrl;
		const myOp = ctrl.opId;

		let haAdd: HaAddResult;
		try {
			haAdd = await ctrl.addEsphomeDevice(ip);
		} catch (err) {
			const msg = (err as { message?: string })?.message;
			haAdd = { type: "failed", reason: msg ?? "unknown" };
		}
		if (ctrl.opId !== myOp) return;

		// The device's ESPHome API may not have finished booting on the
		// first attempt right after WiFi associates. Retry once silently.
		if (haAdd.type === "cannot_connect") {
			await new Promise((r) => setTimeout(r, 3000));
			if (ctrl.opId !== myOp) return;
			try {
				haAdd = await ctrl.addEsphomeDevice(ip);
			} catch (err) {
				const msg = (err as { message?: string })?.message;
				haAdd = { type: "failed", reason: msg ?? "unknown" };
			}
			if (ctrl.opId !== myOp) return;
		}

		ctrl.updateUsbState({ step: "complete", ip, haAdd });
	}

	private async _handleRetryHaAdd(): Promise<void> {
		const ctrl = this._flasherCtrl;
		const state = ctrl.usbFlashState;
		if (state?.step !== "complete" || !state.ip) return;

		ctrl.updateUsbState({ step: "wifi_configured", ip: state.ip });

		let haAdd: HaAddResult;
		try {
			haAdd = await ctrl.addEsphomeDevice(state.ip);
		} catch (err) {
			const msg = (err as { message?: string })?.message;
			haAdd = { type: "failed", reason: msg ?? "unknown" };
		}
		ctrl.updateUsbState({ step: "complete", ip: state.ip, haAdd });
	}

	private _handleUsbRetry = (): void => {
		const ctrl = this._flasherCtrl;
		const state = ctrl.usbFlashState;
		const lastStep = state?.lastStep;
		const variant = state?.variant;
		try {
			(ctrl as any)._serialReader?.releaseLock();
		} catch {}
		try {
			(ctrl as any)._serialWriter?.releaseLock();
		} catch {}
		(ctrl as any)._serialReader = null;
		(ctrl as any)._serialWriter = null;
		// Route retry to the step that actually failed. Flash-phase failures
		// (connecting, flashing, wifi_check) re-run the full flash; WiFi-phase
		// failures retry the WiFi config flow (which prompts for a new port).
		const isFlashPhase =
			lastStep === "connecting" ||
			lastStep === "flashing" ||
			lastStep === "wifi_check";
		if (isFlashPhase && variant) {
			this._handleUsbFlash(variant);
		} else {
			this._handleUsbWifiConfig();
		}
	};

	private async _handleFlasherCancel(): Promise<void> {
		const ctrl = this._flasherCtrl;
		const state = ctrl.usbFlashState;
		if (state?.step === "wifi_configured" && state.ip) {
			ctrl.setCancelledDeviceIpHint(state.ip);
		}
		// Abort any in-flight polling (queryImprovState during wifi_check).
		const abortCtrl = (ctrl as any)._wifiCheckAbort;
		const inFlight = (ctrl as any)._wifiCheckPromise as
			| Promise<unknown>
			| undefined;
		if (abortCtrl?.abort) {
			abortCtrl.abort();
			(ctrl as any)._wifiCheckAbort = null;
		}
		const port = ctrl.serialPort;
		ctrl.bumpOpId();
		ctrl.opRunning = false;
		// Wait for the aborted op to actually settle before closing the
		// port — otherwise close() runs while the reader lock is still
		// held, rejects with "the port has a readable or writable stream",
		// and the port stays open + unusable for the next flash attempt.
		if (inFlight) {
			try {
				await inFlight;
			} catch {}
			(ctrl as any)._wifiCheckPromise = null;
		}
		if (port) {
			try {
				await port.close();
			} catch {}
		}
		ctrl.resetUsbState();
	}

	private async _handleWifiScan(): Promise<void> {
		const ctrl = this._flasherCtrl;
		if (!ctrl.serialPort) return;
		ctrl.bumpOpId();
		const myOp = ctrl.opId;
		try {
			ctrl.updateUsbState({ step: "wifi_scan" });
			const writer = (ctrl as any)._serialWriter;
			const reader = (ctrl as any)._serialReader;
			// Release old locks before re-scanning
			try {
				reader?.releaseLock();
			} catch {}
			try {
				writer?.releaseLock();
			} catch {}

			const result = await runWifiScan(ctrl.serialPort);
			if (ctrl.opId !== myOp) {
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
			(ctrl as any)._serialWriter = result.writer;
			(ctrl as any)._serialReader = result.reader;
			ctrl.wifiNetworks = result.networks;
			ctrl.updateUsbState({ step: "wifi_provision" });
		} catch (err: any) {
			if (ctrl.opId !== myOp) return;
			console.error("WiFi scan failed:", err);
			const lastStep = ctrl.usbFlashState?.step;
			const e = err as {
				errorKey?: string;
				errorParams?: Record<string, unknown>;
				message?: string;
			};
			ctrl.updateUsbState({
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

if (!customElements.get("eppgrid-panel")) {
	customElements.define("eppgrid-panel", EPPGridPanel);
}

installPanelMountGuard();

declare global {
	interface HTMLElementTagNameMap {
		"eppgrid-panel": EPPGridPanel;
	}
}
