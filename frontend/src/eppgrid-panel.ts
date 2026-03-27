import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";

import "./components/epp-editor-view.js";
import "./components/epp-furniture-overlay.js";
import "./components/epp-furniture-sidebar.js";
import "./components/epp-grid.js";
import "./components/epp-live-sidebar.js";
import "./components/epp-live-view.js";
import "./components/epp-settings-view.js";
import "./components/epp-wizard.js";
import "./components/epp-zone-sidebar.js";
import { DeviceController } from "./controllers/device-controller.js";
import { GridStateController } from "./controllers/grid-state-controller.js";
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
	cellIsInside,
	cellZone,
	GRID_CELL_COUNT,
	GRID_CELL_MM,
	GRID_COLS,
	GRID_ROWS,
	getRawRoomBounds,
	getRoomBounds,
	initGridFromRoom,
	MAX_ZONES,
} from "./lib/grid.js";
import { getCellColor } from "./lib/heatmap.js";
import { applyPerspective, getInversePerspective } from "./lib/perspective.js";
import {
	autoDetectionRange,
	computeMaxRangeMm,
	computeSensorFov,
	getGridRoomMetrics,
	getSensorRoomPosition,
	isCellInSensorRange,
	type SensorFov,
} from "./lib/room-geometry.js";
import {
	getZoneThresholds,
	ZONE_TYPE_DEFAULTS,
	type ZoneConfig,
} from "./lib/zone-defaults.js";
import type { ZoneEngineResult, ZoneEngineState } from "./lib/zone-engine.js";
import { setupLocalize } from "./localize.js";
import {
	buttonStyles,
	dialogStyles,
	hostStyles,
	panelStyles,
} from "./styles.js";
import type { DeviceInfo, RawTarget, SetupStep, Target } from "./types.js";

export class EPPGridPanel extends LitElement {
	@property({ attribute: false }) hass: any;

	// Device controller — owns WS subscriptions and device loading
	private _deviceCtrl = new DeviceController(this);
	// Grid state controller — owns zone/furniture/template/paint/save logic
	private _gridCtrl = new GridStateController(this);
	// Target controller — owns target/sensor/zone state processing, zone engine, debug logging
	private _targetCtrl = new TargetController(this);
	private _localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;
	private _currentLang = "";

	// Grid data: byte per cell using the encoding above
	@state() private _grid: Uint8Array = new Uint8Array(GRID_CELL_COUNT);
	@state() private _zoneConfigs: (ZoneConfig | null)[] = new Array(
		MAX_ZONES,
	).fill(null);
	@state() private _activeZone: number | null = null; // null = none selected, 0 = room, 1-7 = named zones
	@state() private _roomType: ZoneConfig["type"] = "normal";
	@state() private _roomTrigger: number = ZONE_TYPE_DEFAULTS.normal.trigger;
	@state() private _roomRenew: number = ZONE_TYPE_DEFAULTS.normal.renew;
	@state() private _roomTimeout: number = ZONE_TYPE_DEFAULTS.normal.timeout;
	@state() private _roomHandoffTimeout: number =
		ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
	@state() private _roomEntryPoint = false;
	@state() private _targetAutoRange = true;
	@state() private _targetMaxDistance = 6.0;
	@state() private _staticAutoRange = true;
	@state() private _staticMinDistance = 0.3;
	@state() private _staticMaxDistance = 16.0;
	@state() private _sidebarTab: "zones" | "furniture" | "live" = "zones";
	@state() private _showDeleteCalibrationDialog = false;
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

	// Multi-device support
	@state() private _devices: DeviceInfo[] = [];
	@state() private _selectedMac = "";
	@state() private _loading = true;

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
	// Getter/setter proxies for _unsubTargets and _unsubDisplay so that
	// existing tests can read/write them via (el as any)._unsubTargets etc.
	private get _unsubTargets(): (() => void) | undefined {
		return (this._deviceCtrl as any)._unsubTargets;
	}
	private set _unsubTargets(v: (() => void) | undefined) {
		(this._deviceCtrl as any)._unsubTargets = v;
	}
	private get _unsubDisplay(): (() => void) | undefined {
		return (this._deviceCtrl as any)._unsubDisplay;
	}
	private set _unsubDisplay(v: (() => void) | undefined) {
		(this._deviceCtrl as any)._unsubDisplay = v;
	}

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
		this._initialize();
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
		this._closeDeviceSession();
		window.removeEventListener("beforeunload", this._beforeUnloadHandler);
		window.removeEventListener("click", this._dismissTooltips);
		window.removeEventListener("keydown", this._onKeyDown);

		// Restore original history methods
		if (this._originalPushState) history.pushState = this._originalPushState;
		if (this._originalReplaceState)
			history.replaceState = this._originalReplaceState;
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
			if (this._loading && !this._devices.length) {
				this._initialize();
			} else if (this._selectedMac && !this._deviceCtrl.hasDeviceSession) {
				// Session lost (e.g. after HA reconnect) — re-open
				this._loadDeviceConfig(this._selectedMac);
			}
		}
		if (this._showDebugLog) {
			const el = this.shadowRoot?.getElementById("debug-log-scroll");
			if (el) el.scrollTop = el.scrollHeight;
		}
		if (this._showBackendDebugLog) {
			const el = this.shadowRoot?.getElementById("backend-debug-log-scroll");
			if (el) el.scrollTop = el.scrollHeight;
		}
	}

	private async _initialize(): Promise<void> {
		if (!this.hass) return;
		this._loading = true;
		this._deviceCtrl.hass = this.hass;
		await this._loadDevices();
		if (this._selectedMac) {
			await this._loadDeviceConfig(this._selectedMac);
		}
		this._loading = false;
	}

	private async _loadDevices(): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		await this._deviceCtrl.loadDevices();
		this._devices = this._deviceCtrl.devices;
		this._selectedMac = this._deviceCtrl.selectedMac;
	}

	private async _loadDeviceConfig(mac: string): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		const config = await this._deviceCtrl.loadDeviceConfig(mac);
		if (config) {
			this._applyConfig(config);
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
		this._zoneConfigs = parsed.zoneConfigs;

		// Apply room thresholds
		this._roomType = parsed.roomThresholds.roomType;
		this._roomTrigger = parsed.roomThresholds.roomTrigger;
		this._roomRenew = parsed.roomThresholds.roomRenew;
		this._roomTimeout = parsed.roomThresholds.roomTimeout;
		this._roomHandoffTimeout = parsed.roomThresholds.roomHandoffTimeout;
		this._roomEntryPoint = parsed.roomThresholds.roomEntryPoint;

		// Load reporting config and offsets
		(this as any)._reportingConfig = parsed.reportingConfig;
		(this as any)._offsetsConfig = parsed.offsetsConfig;
	}

	private async _openDeviceSession(mac: string): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		await this._deviceCtrl.openDeviceSession(mac);
	}

	private _closeDeviceSession(): void {
		this._deviceCtrl.closeDeviceSession();
		this._targets = [];
		this._rawTargets = [];
	}

	private _subscribeTargets(mac: string): void {
		this._deviceCtrl.hass = this.hass;
		this._deviceCtrl.onTargetData = (data) => {
			this._targetCtrl.handleTargetData(data);
		};
		this._deviceCtrl.onRawTargetData = (rawTargets) => {
			this._targetCtrl.handleRawTargetData(rawTargets);
		};
		this._deviceCtrl.subscribeTargets(mac);
	}

	private _unsubscribeTargets(): void {
		this._deviceCtrl.unsubscribeTargets();
		this._targets = [];
		this._rawTargets = [];
	}

	private _subscribeDisplay(mac: string): void {
		this._deviceCtrl.hass = this.hass;
		this._deviceCtrl.onRawTargetData = (rawTargets) => {
			this._targetCtrl.handleRawTargetData(rawTargets);
		};
		this._deviceCtrl.subscribeDisplay(mac);
	}

	private _unsubscribeDisplay(): void {
		this._deviceCtrl.unsubscribeDisplay();
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

	private _updateRoomDimensionsFromGrid(): void {
		this._gridCtrl.updateRoomDimensionsFromGrid();
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

	private _getCellColor(index: number): string {
		return getCellColor(this._grid[index], this._zoneConfigs);
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

	/** Save the current grid and zone config to the backend */
	private async _applyLayout(): Promise<void> {
		return this._gridCtrl.applyLayout();
	}

	private async _saveSettings(): Promise<void> {
		return this._gridCtrl.saveSettings();
	}

	// -- Template management (localStorage) --

	private _getTemplates() {
		return this._gridCtrl.getTemplates();
	}

	private _saveTemplate(): void {
		this._gridCtrl.saveTemplate();
	}

	private _loadTemplate(name: string): void {
		this._gridCtrl.loadTemplate(name);
	}

	private _deleteTemplate(name: string): void {
		this._gridCtrl.deleteTemplate(name);
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

	private _isCellInSensorRange(col: number, row: number): boolean {
		const fov = this._getSensorFov();
		const autoRange = this._autoDetectionRange();
		const maxRangeMm = computeMaxRangeMm(
			this._targetAutoRange,
			autoRange,
			this._targetMaxDistance,
		);
		return isCellInSensorRange(col, row, fov, this._roomWidth, maxRangeMm);
	}

	/** Compute room dimensions and furthest point from sensor based on grid */
	private _getGridRoomMetrics(): {
		widthM: string;
		depthM: string;
		furthestM: string;
	} | null {
		return getGridRoomMetrics(this._grid, this._roomWidth, this._perspective);
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

	private async _onDeviceChange(e: Event): Promise<void> {
		const select = e.target as HTMLSelectElement;
		const mac = select.value;
		this._guardNavigation(async () => {
			this._closeDeviceSession();
			this._selectedMac = mac;
			localStorage.setItem("epp_selected_mac", mac);
			await this._loadDeviceConfig(mac);
		});
	}

	// -- Styles --

	static styles = [
		hostStyles,
		panelStyles,
		dialogStyles,
		buttonStyles,
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

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 16px;
      text-align: center;
    }

    .device-select {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
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

  `,
	];

	// -- Render methods --

	private _renderGlobalDialogs() {
		return html`
      ${this._showTemplateSave ? this._renderTemplateSaveDialog() : nothing}
      ${this._showTemplateLoad ? this._renderTemplateLoadDialog() : nothing}
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

	render() {
		if (this._loading) {
			return html`<div class="loading-container">${this._localize("common.loading")}</div>`;
		}

		if (!this._devices.length) {
			return html`<div class="loading-container">${this._localize("common.loading")}</div>`;
		}

		if (this._setupStep !== null) {
			return html`
        <epp-wizard
          .hass=${this.hass}
          .selectedMac=${this._selectedMac}
          .rawTargets=${this._rawTargets}
          .sensorState=${{ occupancy: this._sensorState.occupancy }}
          .devices=${this._devices}
          .localize=${this._localize}
          .initialRoomWidth=${this._roomWidth}
          .initialRoomDepth=${this._roomDepth}
          @calibration-complete=${(e: CustomEvent) => {
						const { perspective, roomWidth, roomDepth } = e.detail;
						this._perspective = perspective;
						this._roomWidth = roomWidth;
						this._roomDepth = roomDepth;
						this._initGridFromRoom();
						this._setupStep = null;
						this._view = "live";
					}}
          @wizard-cancel=${() => {
						this._setupStep = null;
					}}
        ></epp-wizard>
      `;
		}

		const content =
			this._view === "settings"
				? this._renderSettings()
				: this._view === "editor" && this._perspective
					? this._renderEditor()
					: this._renderLiveOverview();

		return html`${content}${this._renderGlobalDialogs()}`;
	}

	private async _deleteCalibration(): Promise<void> {
		this._showDeleteCalibrationDialog = false;
		this._perspective = null;
		this._roomWidth = 0;
		this._roomDepth = 0;
		this._grid = new Uint8Array(GRID_COLS * GRID_ROWS);
		this._zoneConfigs = new Array(MAX_ZONES).fill(null);
		this._roomType = "normal";
		this._roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
		this._roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
		this._roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
		this._roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
		this._roomEntryPoint = false;
		this._furniture = [];
		// Clear calibration and layout on the backend
		try {
			await this.hass.callWS({
				type: "eppgrid/set_setup",
				mac: this._selectedMac,
				perspective: [0, 0, 0, 0, 0, 0, 0, 0],
				room_width: 0,
				room_depth: 0,
			});
			await this.hass.callWS({
				type: "eppgrid/set_room_layout",
				mac: this._selectedMac,
				grid_bytes: Array.from(this._grid),
				zone_slots: this._zoneConfigs.map(() => null),
				room_type: "normal",
				furniture: [],
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
		});
	}

	private _renderHeader() {
		const headerBtns = nothing;

		return html`
      <div class="panel-header">
        <select
          class="device-select"
          .value=${this._selectedMac}
          @change=${(e: Event) => {
						const val = (e.target as HTMLSelectElement).value;
						if (val === "__add__") {
							window.open("/config/integrations/integration/eppgrid", "_blank");
							(e.target as HTMLSelectElement).value = this._selectedMac;
							return;
						}
						this._onDeviceChange(e);
					}}
        >
          ${this._devices.map(
						(d) => html`
              <option value=${d.mac}>
                ${d.name}
              </option>
            `,
					)}
          <option value="__add__">${this._localize("common.add_another_sensor")}</option>
        </select>
        ${headerBtns}
      </div>
    `;
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
				.zoneConfigs=${this._zoneConfigs}
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
		`;
	}

	private _renderSaveCancelButtons() {
		const saveHandler =
			this._view === "settings" ? this._saveSettings : this._applyLayout;
		return html`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${() => {
						this._dirty = false;
						this._view = "live";
						this._loadDeviceConfig(this._selectedMac);
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
		return html`
      <epp-live-view
        .perspective=${this._perspective}
        .sensorState=${this._sensorState}
        .zoneState=${this._zoneState}
        .zoneConfigs=${this._zoneConfigs}
        .localize=${this._localize}
        .headerTemplate=${this._renderHeader()}
        .gridTemplate=${
					this._perspective
						? this._renderLiveGrid()
						: html`<epp-wizard
							mode="uncalibrated-fov"
							.rawTargets=${this._rawTargets}
							.sensorState=${{ occupancy: this._sensorState.occupancy }}
							.localize=${this._localize}
							@start-calibration=${() => this._changePlacement()}
						></epp-wizard>`
				}
        .debugLogTemplate=${this._perspective ? this._renderBackendDebugLog() : nothing}
        @navigate-view=${(e: CustomEvent) => {
					const { view, sidebarTab } = e.detail;
					this._view = view;
					if (sidebarTab) this._sidebarTab = sidebarTab;
				}}
        @live-view-action=${(e: CustomEvent) => {
					switch (e.detail.action) {
						case "change-placement":
							this._changePlacement();
							break;
						case "show-delete-calibration":
							this._showDeleteCalibrationDialog = true;
							break;
						case "show-template-save":
							this._showTemplateSave = true;
							break;
						case "show-template-load":
							this._showTemplateLoad = true;
							break;
					}
				}}
      ></epp-live-view>
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
          .targetAutoRange=${this._targetAutoRange}
          .targetMaxDistance=${this._targetMaxDistance}
          .staticAutoRange=${this._staticAutoRange}
          .staticMinDistance=${this._staticMinDistance}
          .staticMaxDistance=${this._staticMaxDistance}
          .openAccordions=${this._openAccordions}
          .perspective=${this._perspective}
          .roomWidth=${this._roomWidth}
          .roomDepth=${this._roomDepth}
          .grid=${this._grid}
          .saving=${this._saving}
          .dirty=${this._dirty}
          .reportingConfig=${(this as any)._reportingConfig || {}}
          .offsetsConfig=${(this as any)._offsetsConfig || {}}
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
          @save=${this._saveSettings}
          @cancel=${() => {
						this._dirty = false;
						this._view = "live";
						this._loadDeviceConfig(this._selectedMac);
					}}
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
      <epp-editor-view
        .sidebarTab=${this._sidebarTab}
        .zoneConfigs=${this._zoneConfigs}
        .activeZone=${this._activeZone}
        .roomType=${this._roomType}
        .roomTrigger=${this._roomTrigger}
        .roomRenew=${this._roomRenew}
        .roomTimeout=${this._roomTimeout}
        .roomHandoffTimeout=${this._roomHandoffTimeout}
        .roomEntryPoint=${this._roomEntryPoint}
        .localZoneState=${this._zoneEngineState.localZoneState}
        .furniture=${this._furniture}
        .selectedFurnitureId=${this._selectedFurnitureId}
        .hass=${this.hass}
        .showCustomIconPicker=${this._showCustomIconPicker}
        .customIconValue=${this._customIconValue}
        .localize=${this._localize}
        .headerTemplate=${this._renderHeader()}
        .gridTemplate=${html`
          <epp-grid
            .grid=${this._grid}
            .zoneConfigs=${this._zoneConfigs}
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
            .maxGridPx=${520}
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
        `}
        .debugLogTemplate=${this._sidebarTab === "zones" ? this._renderDebugLog() : nothing}
        .saveCancelTemplate=${this._renderSaveCancelButtons()}
        @editor-panel-click=${() => {
					if (this._justPainted) return;
					this._activeZone = null;
				}}
        @editor-grid-container-click=${() => {
					this._selectedFurnitureId = null;
				}}
        @zone-select=${(e: CustomEvent) => {
					this._activeZone = e.detail.zone;
				}}
        @zone-add=${() => {
					this._addZone();
				}}
        @zone-remove=${(e: CustomEvent) => {
					this._removeZone(e.detail.slot);
				}}
        @zone-config-change=${(e: CustomEvent) => {
					const { index, updates } = e.detail;
					const configs = [...this._zoneConfigs];
					configs[index] = { ...configs[index]!, ...updates };
					this._zoneConfigs = configs;
				}}
        @room-config-change=${(e: CustomEvent) => {
					const { updates } = e.detail;
					if (updates.roomType !== undefined) this._roomType = updates.roomType;
					if (updates.roomTrigger !== undefined)
						this._roomTrigger = updates.roomTrigger;
					if (updates.roomRenew !== undefined)
						this._roomRenew = updates.roomRenew;
					if (updates.roomTimeout !== undefined)
						this._roomTimeout = updates.roomTimeout;
					if (updates.roomHandoffTimeout !== undefined)
						this._roomHandoffTimeout = updates.roomHandoffTimeout;
					if (updates.roomEntryPoint !== undefined)
						this._roomEntryPoint = updates.roomEntryPoint;
				}}
        @dirty=${() => {
					this._dirty = true;
				}}
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
        @custom-icon-toggle=${() => {
					this._showCustomIconPicker = !this._showCustomIconPicker;
				}}
        @custom-icon-change=${(e: CustomEvent) => {
					this._customIconValue = e.detail;
				}}
      ></epp-editor-view>
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
							: templates.map(
									(t) => html`
              <div class="template-item">
                <span class="template-item-name">${t.name}</span>
                <span class="template-item-size">${(t.roomWidth / 1000).toFixed(1)}m x ${(t.roomDepth / 1000).toFixed(1)}m</span>
                <button
                  class="wizard-btn wizard-btn-primary template-item-btn"
                  @click=${() => this._loadTemplate(t.name)}
                >${this._localize("common.load")}</button>
                <button
                  class="zone-remove-btn"
                  @click=${() => this._deleteTemplate(t.name)}
                >
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </div>
            `,
								)
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

		const cells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				const idx = r * GRID_COLS + c;
				const cellVal = this._grid[idx];
				// FOV blackout disabled — needs calibration refinement
				// const inRange = this._isCellInSensorRange(c, r);
				const inRange = true;
				let bg = inRange ? this._getCellColor(idx) : "#1a1a1a";
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
		entryPoint: boolean;
	} {
		return getZoneThresholds(
			zid,
			this._zoneConfigs,
			this._roomType,
			this._roomTrigger,
			this._roomRenew,
			this._roomTimeout,
			this._roomHandoffTimeout,
			this._roomEntryPoint,
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
          Detection events
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
            >Copy all</button>
            <button
              class="debug-log-btn"
              @click=${() => {
								this._backendDebugLogLines = [];
								this._backendDebugLogPrev = null;
								this.requestUpdate();
							}}
            >Clear</button>
          </div>
          <div class="debug-log-container" id="backend-debug-log-scroll">
            ${
							this._backendDebugLogLines.length === 0
								? html`<div style="color: var(--secondary-text-color, #999); font-style: italic;">Waiting for events...</div>`
								: this._backendDebugLogLines.map(
										(line) => html`<div class="debug-log-line">${line}</div>`,
									)
						}
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
          Detection events
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
            >Copy all</button>
            <button
              class="debug-log-btn"
              @click=${() => {
								this._debugLogLines = [];
								this._debugLogPrev = null;
								this.requestUpdate();
							}}
            >Clear</button>
          </div>
          <div class="debug-log-container" id="debug-log-scroll">
            ${
							this._debugLogLines.length === 0
								? html`<div style="color: var(--secondary-text-color, #999); font-style: italic;">Waiting for events...</div>`
								: this._debugLogLines.map(
										(line) => html`<div class="debug-log-line">${line}</div>`,
									)
						}
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
}

if (!customElements.get("eppgrid-panel")) {
	customElements.define("eppgrid-panel", EPPGridPanel);
}

declare global {
	interface HTMLElementTagNameMap {
		"eppgrid-panel": EPPGridPanel;
	}
}
