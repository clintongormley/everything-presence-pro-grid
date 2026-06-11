import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";

import "./components/epp-flasher-view.js";
import "./components/epp-furniture-overlay.js";
import "./components/epp-furniture-sidebar.js";
import "./components/epp-grid.js";
import "./components/epp-live-sidebar.js";
import type { ZoneStateSummary } from "./components/epp-live-sidebar.js";
import "./components/epp-settings-view.js";
import "./components/epp-wizard.js";
import type { EppWizard } from "./components/epp-wizard.js";
import "./components/epp-overlay-sidebar.js";
import "./components/epp-zone-sidebar.js";
import { DeviceController } from "./controllers/device-controller.js";
import { FlasherController } from "./controllers/flasher-controller.js";
import {
	GridStateController,
	serializeFurniture,
	serializeSlot,
} from "./controllers/grid-state-controller.js";
import { TargetController } from "./controllers/target-controller.js";
import type { PaintAction } from "./lib/cell-painting.js";
import { parseConfig } from "./lib/config-serialization.js";
import { renderConfigurationThumbnail } from "./lib/configuration-thumbnail.js";
import {
	mapTargetToGridCell,
	mapTargetToPercent,
	targetCellIndex,
} from "./lib/coordinates.js";
import {
	type FurnitureItem,
	type FurnitureSticker,
	mmToPx,
	pxToMm,
} from "./lib/furniture.js";
import {
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	cellIsInside,
	cellSetOverlay,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
	getRawRoomBounds,
	getRoomBounds,
	initGridFromRoom,
	MAX_RANGE,
	type OverlayMode,
} from "./lib/grid.js";
import { getHelpUrl, type PanelTab } from "./lib/help-url.js";
import { applyPerspective, getInversePerspective } from "./lib/perspective.js";
import {
	autoDetectionRange,
	boundsToRoomMm,
	computeMaxRangeMm,
	computeSensorFov,
	getGridRoomMetrics,
	getSensorRoomPosition,
	getVisibleRoomBounds,
	type SensorFov,
} from "./lib/room-geometry.js";
import {
	buildSparseEntities,
	isSettingsValueDefault,
	SETTINGS_DEFAULTS,
	SETTINGS_FIELD_MAP,
} from "./lib/settings-defaults.js";
import { persistSelectedMac } from "./lib/storage.js";
import {
	detectIpAddress,
	flashFirmware,
	queryImprovState,
	runWifiProvision,
	runWifiScan,
} from "./lib/usb-flash-service.js";
import {
	DEFAULT_SIDEBAR_TAB,
	parseViewHash,
	type SidebarTab,
	type ViewMode,
	type ViewState,
	viewHash,
} from "./lib/view-hash.js";
import {
	getZoneThresholds,
	INITIAL_ZONE_SLOTS,
	resolveZoneParams,
	type Zone0Config,
	type ZoneConfig,
	type ZoneSlots,
} from "./lib/zone-defaults.js";
import type { ZoneEngineResult, ZoneEngineState } from "./lib/zone-engine.js";
import { setupLocalize } from "./localize.js";
import {
	ensureObserversAttached,
	installPanelMountGuard,
} from "./panel-mount-guard.js";
import { buttonStyles, dialogStyles, headerStyles } from "./styles.js";
import type { DeviceInfo, HaAddResult, RawTarget, Target } from "./types.js";

// ZoneSlots / INITIAL_ZONE_SLOTS moved to lib/zone-defaults.ts so the
// controllers can import them without a circular type dep on this module.

type SensorState = {
	occupancy: boolean;
	static_presence: boolean;
	motion_presence: boolean;
	target_presence: boolean;
	mmwave: boolean;
	illuminance: number | null;
	temperature: number | null;
	humidity: number | null;
	co2: number | null;
};

// Factory — returns a fresh object each call. Sensor state is mutated in-place
// during render (see `_sensorState.occupancy = ...` in render paths), so
// handing out the same reference would corrupt future resets.
const createInitialSensorState = (): SensorState => ({
	occupancy: false,
	static_presence: false,
	motion_presence: false,
	target_presence: false,
	mmwave: false,
	illuminance: null,
	temperature: null,
	humidity: null,
	co2: null,
});

const createInitialZoneState = (): ZoneStateSummary => ({
	occupancy: {},
	target_counts: {},
	frame_count: 0,
});

const hostStyles = css`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--ha-font-family-body, "Roboto", sans-serif);
  }
`;

const panelStyles = css`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }
`;

const protocolFullpageStyles = css`
  .protocol-fullpage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 48px 24px;
    margin: 16px;
    border-radius: 12px;
    text-align: center;
    flex: 1;
  }
  .protocol-fullpage-warning {
    background: var(--warning-color, #ff9800);
    color: white;
  }
  .protocol-fullpage-info {
    background: var(--info-color, #2196f3);
    color: white;
  }
  .protocol-fullpage ha-icon {
    --mdc-icon-size: 48px;
  }
  .protocol-fullpage p {
    margin: 0;
    font-size: 16px;
    max-width: 480px;
    line-height: 1.5;
  }
  .protocol-fullpage .wizard-btn {
    box-shadow: inset 0 0 0 2px white;
  }
  .protocol-link {
    color: white;
    font-weight: 500;
    text-decoration: underline;
    font-size: 16px;
  }
`;

// Exported so panel-layout.test.ts can introspect .cssText for regression checks.
export const layoutStyles = css`
  .editor-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .grid-column {
    min-width: 0;
    max-width: min-content;
  }

  .grid-container {
    position: relative;
    max-width: 100%;
    overflow: visible;
  }

  .sidebar-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .zone-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--card-background-color, #fff);
    border-left: 1px solid var(--divider-color, #e0e0e0);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: visible;
  }

  .zone-sidebar.scrollable {
    max-height: 70vh;
  }

  .sidebar-title {
    font-size: 15px;
    font-weight: 600;
    padding: 10px 12px 8px;
    color: var(--primary-text-color, #212121);
  }
`;

const liveMenuStyles = css`
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 4px 12px;
  }

  .sidebar-header .sidebar-title {
    padding: 0;
  }

  .sidebar-menu-wrapper {
    position: relative;
  }

  .sidebar-menu-btn {
    background: none;
    border: none;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
  }

  .sidebar-menu-btn:hover {
    background: var(--secondary-background-color, #f0f0f0);
  }

  .sidebar-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 100;
    min-width: 220px;
    padding: 4px 0;
  }

  .sidebar-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: none;
    color: var(--primary-text-color, #212121);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .sidebar-menu-item:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
`;

// ---------------------------------------------------------------------------
// Shared history interception (unsaved-changes navigation guard)
//
// history.pushState/replaceState are wrapped ONCE at module level; the
// wrapper dispatches to whichever panel instances are currently connected
// via a registry that instances join in connectedCallback and leave in
// disconnectedCallback. The bare originals are restored only when the
// registry empties.
//
// Per-instance wrapping is unsafe under the mount guard's duplicate-panel
// cleanup (see panel-mount-guard.ts): the guard mounts panel A, HA's
// ha-panel-custom appends its own duplicate B (B's wrapper lands on top of
// A's), then removeDuplicateEppPanels keeps A and removes B. B's disconnect
// sees "my wrapper is the installed one" and restores the BARE original —
// leaving the still-connected A with no interception, so HA-router
// navigation while dirty discards unsaved edits without the dialog. A
// refcounted shared wrapper is ordering-independent: either instance can
// disconnect first and the survivor keeps its interception.
// ---------------------------------------------------------------------------

type HistoryMethod = typeof history.pushState;

interface HistoryInterceptor {
	/**
	 * Offer a history call to the panel. Returns true when the panel
	 * captured it (unsaved-changes dialog shown, call swallowed).
	 */
	intercept(original: HistoryMethod, args: Parameters<HistoryMethod>): boolean;
	/** A delegated call moved the URL fragment — sync view state. */
	hashMoved(): void;
}

const historyInterceptors = new Set<HistoryInterceptor>();
let installedPushState: HistoryMethod | null = null;
let installedReplaceState: HistoryMethod | null = null;
// Module-level copies of the bare originals, captured at install time, so
// restore-on-empty doesn't depend on the window stash still being intact.
let originalPushState: HistoryMethod | null = null;
let originalReplaceState: HistoryMethod | null = null;

function makeSharedHistoryWrapper(original: HistoryMethod): HistoryMethod {
	return (data, unused, url) => {
		for (const interceptor of historyInterceptors) {
			if (interceptor.intercept(original, [data, unused, url])) return;
		}
		const before = location.hash;
		original(data, unused, url);
		if (location.hash !== before) {
			for (const interceptor of historyInterceptors) {
				interceptor.hashMoved();
			}
		}
	};
}

function registerHistoryInterceptor(interceptor: HistoryInterceptor): void {
	historyInterceptors.add(interceptor);
	if (installedPushState && history.pushState === installedPushState) {
		return; // our shared wrapper is already live
	}
	// Stash the truly-original (pre-wrap) methods on window once: a reloaded
	// module instance would otherwise capture a previous module's wrapper as
	// "original", chaining wrappers unboundedly across remounts.
	const w = window as any;
	if (!w.__eppOriginalPushState) {
		w.__eppOriginalPushState = history.pushState.bind(history);
	}
	if (!w.__eppOriginalReplaceState) {
		w.__eppOriginalReplaceState = history.replaceState.bind(history);
	}
	originalPushState = w.__eppOriginalPushState as HistoryMethod;
	originalReplaceState = w.__eppOriginalReplaceState as HistoryMethod;
	installedPushState = makeSharedHistoryWrapper(originalPushState);
	installedReplaceState = makeSharedHistoryWrapper(originalReplaceState);
	history.pushState = installedPushState;
	history.replaceState = installedReplaceState;
}

function unregisterHistoryInterceptor(interceptor: HistoryInterceptor): void {
	historyInterceptors.delete(interceptor);
	if (historyInterceptors.size > 0) return;
	// Last connected instance gone — restore the originals, but only if our
	// wrapper is still the installed one. A freshly loaded module instance
	// may have installed its own wrapper on top (it dispatches through ITS
	// registry); restoring the bare original here would strip it.
	if (originalPushState && history.pushState === installedPushState) {
		history.pushState = originalPushState;
	}
	if (originalReplaceState && history.replaceState === installedReplaceState) {
		history.replaceState = originalReplaceState;
	}
	installedPushState = null;
	installedReplaceState = null;
	originalPushState = null;
	originalReplaceState = null;
}

export class EPPGridPanel extends LitElement {
	@property({ attribute: false }) hass: any;

	// Device controller — owns WS subscriptions and device loading
	private _deviceCtrl = new DeviceController(this);
	// Grid state controller — owns zone/furniture/template/paint/save logic.
	// Pass `this` directly so tsc verifies the panel structurally satisfies
	// PanelHost (i.e. that every `_field` PanelHost lists actually exists
	// here with the declared type). The panel's `@state _field`s are public
	// so the contract holds — the `_` prefix is the social marker for
	// internal-only state.
	private _gridCtrl = new GridStateController(this);
	// Target controller — owns target/sensor/zone state processing, zone engine, debug logging
	private _targetCtrl = new TargetController(this);
	// Flasher controller — owns OTA flash state and flashable device list
	private _flasherCtrl = new FlasherController(this);
	_localize: import("./localize.js").LocalizeFn = Object.assign(
		((k: string) => k) as import("./localize.js").LocalizeFn,
		{ formatNumber: (v: number, d = 1) => v.toFixed(d), lang: "en" },
	);
	private _currentLang = "";

	// Grid data: byte per cell using the encoding above
	@state() _grid: Uint8Array = new Uint8Array(GRID_CELL_COUNT);
	// Length-8 zone-slots tuple: slot 0 = room-boundary Zone0Config (always
	// populated); slots 1-7 = named zones (ZoneConfig | null).
	@state() _zoneConfigs: ZoneSlots = INITIAL_ZONE_SLOTS;
	@state() _activeZone: number | null = null; // null = none selected, 0 = room, 1-7 = named zones
	@state() _targetAutoDistance = true;
	@state() _targetMaxDistance = 6.0;
	@state() _stuckTargetTimeout = 300;
	@state() _staticAutoDistance = true;
	@state() _staticMinDistance = 0.3;
	@state() _staticMaxDistance = 16.0;
	@state() _temperatureOffset = 0;
	@state() _humidityOffset = 0;
	@state() _illuminanceOffset = 0;
	@state() _motionTimeout = 5;
	@state() _staticTimeout = 30;
	@state() _staticTriggerThreshold = 3;
	@state() _staticRenewThreshold = 3;
	@state() _staticOnDelay = 0;
	@state() _logLevels: Record<string, string> = {};
	@state() private _bluetoothEnabled = false;
	@state() private _co2Enabled = false;
	@state() _ledMode = "Manual Control";
	@state() _ledBrightness = 1.0;
	@state() _ledPresenceColor = "#CC33FF";
	@state() _relayTriggerMode = "disabled";
	@state() _relayContactMode = "no";
	@state() _targetUpdateRateMs = 1000;
	@state() _zoneUpdateRateMs = 1000;
	@state() _entitiesConfig: Record<string, any> = {};
	@state() _sidebarTab: SidebarTab = parseViewHash(
		typeof location !== "undefined" ? location.hash : "",
	).sidebarTab;
	@state() private _panelTab: PanelTab = "config";
	@state() private _showDeleteCalibrationDialog = false;
	@state() private _showLiveMenu = false;
	@state() private _showCustomIconPicker = false;
	@state() private _customIconValue = "";
	@state() _furniture: FurnitureItem[] = [];
	@state() _selectedFurnitureId: string | null = null;
	private _furnitureClipboard: FurnitureItem | null = null;
	// Non-reactive: pointer drag bookkeeping. Repaint is driven by @state fields the drag handlers update (e.g. _furniture).
	_dragState: {
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
	@state() _targets: Target[] = [];
	@state() _rawTargets: RawTarget[] = [];
	@state() _sensorState: SensorState = createInitialSensorState();
	@state() _zoneState: ZoneStateSummary = createInitialZoneState();
	@state() _showDebugLog = false;
	_debugLogLines: string[] = [];
	_debugLogPrev: string | null = null;
	@state() _showBackendDebugLog = false;
	_backendDebugLogLines: string[] = [];
	_backendDebugLogPrev: string | null = null;
	// Zone engine state — delegated to TargetController
	private get _zoneEngineState(): ZoneEngineState {
		return this._targetCtrl.zoneEngineState;
	}
	private set _zoneEngineState(value: ZoneEngineState) {
		this._targetCtrl.zoneEngineState = value;
	}
	@state() _overlayMode: OverlayMode = null;
	@state() private _targetMenu: {
		x: number;
		y: number;
		targetIndex: number;
		pctX: number;
		pctY: number;
	} | null = null;
	@state() private _dismissedTargets: Map<number, number> = new Map();
	@state() _isPainting = false;
	_justPainted = false;
	@state() _paintAction: PaintAction = "set";
	_frozenBounds: {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} | null = null;
	@state() _saving = false;
	@state() _dirty = false;
	@state() private _showUnsavedDialog = false;
	private _pendingNavigation: (() => void) | null = null;
	@state() _showConfigurationBackup = false;
	@state() _showConfigurationRestore = false;
	@state() _configurationName = "";

	// Multi-device support
	@state() private _devices: DeviceInfo[] = [];
	@state() _selectedMac = "";
	@state() private _loading = true;
	// Tracks which device we've successfully loaded config for, so
	// reconnect paths can re-establish the live stream without refetching
	// config (which would clobber unsaved edits and, during HA startup,
	// can race with the backend returning an empty config before the
	// store is fully loaded — setting _perspective to null and flipping
	// the editor view to the uncalibrated-FOV wizard).
	private _loadedConfigMac: string | null = null;
	// Consecutive empty device-list retries. Used to escape from a
	// persisted-selection + genuinely-empty-list deadlock (user deleted
	// last device, or localStorage has a stale mac from a prior session)
	// by showing the "no devices configured" placeholder once we're
	// confident the integration isn't just slow to discover devices.
	@state() private _initRetryCount = 0;

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
			// the outage — re-bootstrap so the UI recovers without a manual
			// reload. `_initialize` keys off `_loadedConfigMac` so it won't
			// refetch config for a device we've already loaded.
			this._initialize().catch(() => {
				// _initialize already traps its own failures; guard here too so
				// a late rejection can't surface as uncaught.
			});
		}
	};
	private _onHaDisconnected = (): void => {
		this._haConnected = false;
	};

	// View mode: live (default), editor (grid/zones), or settings (configuration).
	// Per-tab state — derived from the URL fragment so each browser tab has
	// its own view, the sidebar icon (no fragment) returns to live, and
	// reload preserves the *current* tab's view.
	@state() _view: ViewMode = parseViewHash(
		typeof location !== "undefined" ? location.hash : "",
	).view;
	@state() private _openAccordions: Set<string> = new Set();

	// Perspective transform state (client-side, set after corner marking)
	@state() _perspective: number[] | null = null;
	@state() _roomWidth = 0; // mm
	@state() _roomDepth = 0; // mm

	// Device session + target subscriptions (delegated to _deviceCtrl)

	private _beforeUnloadHandler = (e: BeforeUnloadEvent) => {
		if (this._dirty) {
			e.preventDefault();
			e.returnValue = "";
		}
	};

	private _originalPushState: typeof history.pushState | null = null;
	private _originalReplaceState: typeof history.replaceState | null = null;
	// This instance's entry in the module-level history-interception
	// registry (see registerHistoryInterceptor above). Created once on
	// first connect and reused across reconnects.
	private _historyInterceptor: HistoryInterceptor | null = null;

	private _interceptNavigation = (): boolean => {
		if (!this._dirty) return false;
		this._showUnsavedDialog = true;
		this._pendingNavigation = null; // no specific action — just allow navigation on discard
		return true;
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
			// Paste clamps to the PHYSICAL room bounds (drag clamps to the
			// FOV-aware visible bounds) — a paste must not silently relocate
			// furniture that legitimately sits in an out-of-FOV corner.
			const mm = boundsToRoomMm(this._getRoomBounds(), this._roomWidth);
			const offset = 300; // 1 cell offset so paste is visible
			const newItem: FurnitureItem = {
				...cb,
				id,
				x: Math.max(mm.minX, Math.min(mm.maxX - cb.width, cb.x + offset)),
				y: Math.max(mm.minY, Math.min(mm.maxY - cb.height, cb.y + offset)),
			};
			this._furniture = [...this._furniture, newItem];
			this._selectedFurnitureId = newItem.id;
			this._dirty = true;
		}
	};

	connectedCallback(): void {
		super.connectedCallback();
		// installPanelMountGuard runs at module load, before HA has built
		// the panel resolver — so the observers couldn't attach then.
		// Now that we're connected, the tree exists; wire them up.
		ensureObserversAttached();
		this._initialize().catch(() => {
			// _initialize traps its own failures; guard here so that any
			// late rejection can't surface as "Uncaught (in promise)".
		});
		window.addEventListener("beforeunload", this._beforeUnloadHandler);
		window.addEventListener("keydown", this._onKeyDown);
		window.addEventListener("hashchange", this._onHashChange);

		// Intercept HA's client-side routing. pushState/replaceState do
		// not fire hashchange/popstate even when the hash changes, so
		// after delegating the shared wrapper syncs if (and only if) the
		// hash moved. Interception is installed once at module level and
		// dispatches through a registry of connected instances — see
		// registerHistoryInterceptor above for why per-instance wrapping
		// breaks under duplicate-panel cleanup.
		this._historyInterceptor ??= {
			intercept: (original, args) => {
				if (!this._interceptNavigation()) return false;
				this._pendingNavigation = () => {
					original(...args);
					window.dispatchEvent(new PopStateEvent("popstate"));
					this._onHashChange();
				};
				return true;
			},
			hashMoved: () => this._onHashChange(),
		};
		registerHistoryInterceptor(this._historyInterceptor);
		// The register call above guarantees the window stash exists; keep
		// per-instance references for _replaceHash (panel-driven hash writes
		// must not re-enter the interceptor).
		const w = window as any;
		this._originalPushState = w.__eppOriginalPushState as HistoryMethod;
		this._originalReplaceState = w.__eppOriginalReplaceState as HistoryMethod;
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
		window.removeEventListener("keydown", this._onKeyDown);
		window.removeEventListener("hashchange", this._onHashChange);

		// Leave the shared history-interception registry. The originals are
		// restored only when the LAST connected instance leaves, so neither
		// teardown ordering of an overlap-mount (duplicate-panel cleanup or
		// remount overlap) can strip a live instance's interception.
		if (this._historyInterceptor) {
			unregisterHistoryInterceptor(this._historyInterceptor);
		}
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
		// `_sidebarTab` is the editor's sub-tab — meaningful only when
		// `_view === "editor"`. Six code paths set `_view = "live"` without
		// touching `_sidebarTab`, leaving stale values (e.g. "furniture") that
		// downstream consumers wrongly treat as live signal — the original case
		// was furniture staying draggable on the live overview after a save,
		// where a stray click marked the panel dirty. Enforce the invariant
		// here so no caller has to remember.
		if (changed.has("_view") && this._view !== "editor") {
			this._sidebarTab = DEFAULT_SIDEBAR_TAB;
		}
		if (changed.has("_view") || changed.has("_sidebarTab")) {
			this._syncHashFromState();
		}
	}

	/**
	 * Write the URL fragment via the un-patched replaceState (saved in
	 * connectedCallback) so panel-driven hash updates don't re-enter
	 * the dirty-navigation interceptor.
	 */
	private _replaceHash(hash: string): void {
		if (typeof location === "undefined") return;
		if (hash === location.hash) return;
		const target = `${location.pathname}${location.search}${hash}`;
		const replace =
			this._originalReplaceState ?? history.replaceState.bind(history);
		// Preserve history.state so HA's router state isn't clobbered.
		replace(history.state, "", target);
	}

	private _syncHashFromState(): void {
		this._replaceHash(
			viewHash({ view: this._view, sidebarTab: this._sidebarTab }),
		);
	}

	/**
	 * Move to a target view + sub-tab. Centralises the side effects
	 * (overlay-mode reset, range widening) so click handlers and
	 * URL-driven navigation behave the same.
	 */
	private _applyView(state: ViewState): void {
		this._view = state.view;
		this._sidebarTab = state.sidebarTab;
		if (state.view === "editor" && state.sidebarTab !== "overlays") {
			this._overlayMode = null;
		}
		if (
			state.view === "editor" ||
			state.view === "tutorial" ||
			state.view === "calibrate"
		) {
			this._pushWidenedDistanceOverride();
		}
	}

	/**
	 * React to external hash changes (browser back/forward, sidebar
	 * icon, manual URL edit). When dirty, snap the URL back so the
	 * queued navigation only fires once the user discards.
	 */
	private _onHashChange = (): void => {
		const next = parseViewHash(location.hash);
		if (next.view === this._view && next.sidebarTab === this._sidebarTab) {
			return;
		}
		if (this._dirty) {
			this._replaceHash(
				viewHash({ view: this._view, sidebarTab: this._sidebarTab }),
			);
		}
		this._guardNavigation(() => this._applyView(next));
	};

	updated(changedProps: PropertyValues): void {
		if (changedProps.has("hass") && this.hass) {
			this._deviceCtrl.hass = this.hass;
			this._flasherCtrl.hass = this.hass;
			const conn = this.hass.connection;
			if (conn) {
				// HA keeps pushing `hass` to panels it has already removed
				// from the DOM, and Lit still runs the update cycle on those
				// zombies. Re-attaching here would undo disconnectedCallback's
				// teardown and pin the dead panel in memory via the
				// connection's listener list.
				if (this.isConnected) {
					this._attachConnectionListeners(conn);
				}
				if (typeof conn.connected === "boolean") {
					this._haConnected = conn.connected;
				}
			}
			if (!this._haConnected) return;
			if (this._loading && !this._devices.length) {
				this._initialize().catch(() => {
					// _initialize traps its own failures; guard here (as at the
					// other call sites) so a late rejection can't surface as
					// "Uncaught (in promise)".
				});
			} else if (
				this._selectedMac &&
				this._isSelectedDeviceAvailable() &&
				!this._deviceCtrl.hasDeviceSession &&
				!this._deviceCtrl.reconnecting
			) {
				// Session lost (e.g. after HA reconnect) — re-establish it,
				// falling back to a config fetch only if we haven't loaded
				// config for this device yet.
				this._ensureSession(this._selectedMac);
			}
		}
	}

	private _initRetryTimer?: ReturnType<typeof setTimeout>;

	/**
	 * Re-establish the live session for `mac`, loading config from the
	 * backend only if we haven't already loaded it for this device. The
	 * "already loaded" path preserves any unsaved editor edits and
	 * avoids racing with an HA-startup window where the backend store
	 * may not yet be populated.
	 */
	private _ensureSession(mac: string): void {
		// A zombie panel (removed from the DOM while async work was still in
		// flight) must not (re)open device sessions nothing will ever close.
		if (!this.isConnected) return;
		if (this._loadedConfigMac === mac) {
			// reopenSession traps its own failures; .catch guards a late
			// rejection surfacing as "Uncaught (in promise)".
			this._deviceCtrl.reopenSession(mac).catch(() => {});
		} else {
			// _loadDeviceConfig traps its own failures; .catch guards a late
			// rejection surfacing as "Uncaught (in promise)".
			this._loadDeviceConfig(mac).catch(() => {});
		}
	}

	// In-flight _initialize run, shared by concurrent callers (see below).
	private _initializeInFlight: Promise<void> | null = null;

	private async _initialize(): Promise<void> {
		// Dedupe concurrent runs: while `_loading && !_devices.length`, every
		// `hass` property push re-enters _initialize via updated(), and each
		// run tears down and re-creates the device-list subscription (~2
		// subscribes + 1 unsub per mount). Concurrent callers share the
		// in-flight run instead.
		if (this._initializeInFlight) return this._initializeInFlight;
		const promise = this._runInitialize();
		this._initializeInFlight = promise;
		try {
			await promise;
		} finally {
			if (this._initializeInFlight === promise) {
				this._initializeInFlight = null;
			}
		}
	}

	private async _runInitialize(): Promise<void> {
		if (!this.hass) return;
		if (!this.isConnected) return;
		const isRetry = this._initRetryTimer !== undefined;
		if (this._initRetryTimer) {
			clearTimeout(this._initRetryTimer);
			this._initRetryTimer = undefined;
		}
		if (!isRetry && this._devices.length === 0) {
			// Only show the loading screen on a genuinely empty panel. On a
			// reconnect re-init (_onHaReady) the device list is still in
			// memory; flipping `_loading` would swap the whole UI for the
			// loading screen — a flash on every reconnect, and an unmount of
			// the settings view mid-edit.
			this._loading = true;
		}
		this._deviceCtrl.hass = this.hass;
		await this._subscribeDevices();
		// Re-check after the await: the panel could have been disconnected
		// (user navigated away) while subscribeDevices was in flight.
		// Scheduling a retry on a detached host pins the panel in memory and
		// runs _initialize() against torn-down controllers.
		if (!this.isConnected) return;
		if (this._devices.length === 0) {
			// Either first boot before devices are configured, or the HA
			// integration is still coming up after a restart (custom WS
			// commands not yet registered, initial push empty).  Retry
			// silently so the UI doesn't flicker between "no devices" and
			// "loading" every 2 seconds.
			this._initRetryCount += 1;
			this._loading = false;
			this._initRetryTimer = setTimeout(() => {
				if (!this.isConnected) return;
				// _initialize traps its own failures; .catch guards a late
				// rejection surfacing as "Uncaught (in promise)".
				this._initialize().catch(() => {});
			}, 2000);
			return;
		}
		this._initRetryCount = 0;
		if (this._selectedMac && this._isSelectedDeviceAvailable()) {
			this._ensureSession(this._selectedMac);
		}
		this._loading = false;
	}

	private async _subscribeDevices(): Promise<void> {
		this._deviceCtrl.hass = this.hass;
		// Lets the controller defer the auto-switch to another device while
		// the user has unsaved edits (see _applyDeviceList's dirty-guard).
		this._deviceCtrl.isHostDirty = () => this._dirty;
		this._deviceCtrl.onDeviceListChanged = () => {
			const prevMac = this._selectedMac;
			this._devices = this._deviceCtrl.devices;
			this._selectedMac = this._deviceCtrl.selectedMac;
			if (this._devices.length > 0) {
				this._initRetryCount = 0;
			}
			if (
				prevMac !== "" &&
				this._selectedMac !== "" &&
				prevMac !== this._selectedMac
			) {
				// Selection auto-switched to a different device (previous
				// one was removed from HA, another remained).
				persistSelectedMac(this._selectedMac);
				this._furnitureClipboard = null;
				if (this._isSelectedDeviceAvailable()) {
					this._loadDeviceConfig(this._selectedMac).catch(() => {});
				}
			}
		};
		this._deviceCtrl.onSelectedAvailable = (mac) => {
			this._ensureSession(mac);
		};
		this._deviceCtrl.onSessionClosed = () => {
			// Live-data has no meaning once the device is gone — clear it so
			// the UI doesn't keep showing stale readings. Config-derived
			// state (perspective, furniture, zones) is intentionally kept
			// so the user returns to where they were when the device
			// comes back.
			//
			// Env sensor values (temperature/humidity/illuminance/co2) are
			// preserved across the close: the offset-slider render computes
			// `raw + offset` from these values. Going to null produces "—"
			// which Lit then clobbers the @input-set DOM value with, and
			// after reconnect the display ends up at the live reading rather
			// than the user's drag value. Env readings change slowly so a
			// few-second-stale value is preferable to the clobber.
			const prev = this._sensorState;
			this._targets = [];
			this._rawTargets = [];
			this._sensorState = {
				...createInitialSensorState(),
				temperature: prev.temperature,
				humidity: prev.humidity,
				illuminance: prev.illuminance,
				co2: prev.co2,
			};
			this._zoneState = createInitialZoneState();
			this._targetCtrl.resetZoneEngineState();
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
		// Re-check after the await (mirroring _initialize): if the panel was
		// removed while the load was in flight, don't apply config to a dead
		// element, and close whatever session survived the teardown race.
		if (!this.isConnected) {
			this._deviceCtrl.closeDeviceSession();
			return;
		}
		if (this._selectedMac !== mac) {
			this._deviceCtrl.closeDeviceSession();
			return;
		}
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
		this._stuckTargetTimeout = s.stuckTargetTimeout;
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

		this._loadedConfigMac = this._selectedMac;
	}

	private _closeDeviceSession(): void {
		this._deviceCtrl.closeDeviceSession();
		this._targets = [];
		this._rawTargets = [];
		this._sensorState = createInitialSensorState();
		this._zoneState = createInitialZoneState();
		this._targetCtrl.resetZoneEngineState();
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
		rotation?: number,
	): void {
		this._gridCtrl.onFurniturePointerDown(e, id, type, handle, rotation);
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

	/**
	 * Build the full settings payload sent to `eppgrid/set_settings`.
	 *
	 * Derived from `SETTINGS_FIELD_MAP` so the snake_case → panel-property
	 * mapping has a single source of truth. The fields here MUST stay in sync
	 * with `_emitSave()` in `components/epp-settings-view.ts` — that method
	 * builds the same payload from the live settings-view overrides during an
	 * active edit session.
	 */
	_buildSettingsPayload(): Record<string, any> {
		const payload: Record<string, any> = {};
		for (const [key, prop] of SETTINGS_FIELD_MAP) {
			const value = (this as Record<string, unknown>)[prop];
			payload[key] =
				value ?? (SETTINGS_DEFAULTS as Record<string, unknown>)[key];
		}
		return payload;
	}

	/**
	 * Build a sparse settings payload for backup storage — only fields whose
	 * current value differs from their default. A configuration with all-default
	 * settings produces `{}`. The restore flow fills missing fields back in from
	 * `SETTINGS_DEFAULTS`.
	 *
	 * Stays in sync with `_buildSettingsPayload()` and `SETTINGS_DEFAULTS`.
	 */
	_buildSparseSettings(): Record<string, any> {
		const full = this._buildSettingsPayload();
		const sparse: Record<string, any> = {};
		for (const [key, value] of Object.entries(full)) {
			// Entities are sparse-handled below against per-entity defaults.
			if (key === "entities") continue;
			const defaultValue = (SETTINGS_DEFAULTS as Record<string, any>)[key];
			if (!isSettingsValueDefault(value, defaultValue)) {
				sparse[key] = value;
			}
		}

		// Coupled-field rules: drop fields whose meaning depends on a gating
		// field that's at its default.
		if (!("target_auto_distance" in sparse)) {
			// Distance values are only meaningful when auto-distance is off. When
			// the auto flag is at its default (true), the actual max/min are derived
			// from room geometry at apply-time, so storing them as "non-default" is
			// misleading.
			delete sparse.target_max_distance;
		}
		if (!("static_auto_distance" in sparse)) {
			delete sparse.static_min_distance;
			delete sparse.static_max_distance;
		}
		if (!("relay_trigger_mode" in sparse)) {
			// When relay is disabled (default), contact mode is meaningless.
			delete sparse.relay_contact_mode;
		}

		// Entities: only include flags that differ from their per-entity default.
		const sparseEntities = buildSparseEntities(full.entities);
		if (Object.keys(sparseEntities).length > 0) {
			sparse.entities = sparseEntities;
		}

		return sparse;
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

	private _enterEditor(tab: SidebarTab): void {
		this._guardNavigation(() =>
			this._applyView({ view: "editor", sidebarTab: tab }),
		);
	}

	// -- Configuration management (backend WS API) --

	private _getConfigurations() {
		return this._gridCtrl.configurations;
	}

	private async _saveConfiguration(): Promise<void> {
		try {
			await this._gridCtrl.saveConfiguration();
		} catch (err) {
			console.error("Failed to save configuration", err);
		}
	}

	private async _loadConfiguration(name: string): Promise<void> {
		try {
			await this._gridCtrl.loadConfiguration(name);
		} catch (err) {
			console.error(`Failed to load configuration "${name}"`, err);
		}
	}

	private async _deleteConfiguration(name: string): Promise<void> {
		try {
			await this._gridCtrl.deleteConfiguration(name);
		} catch (err) {
			console.error(`Failed to delete configuration "${name}"`, err);
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
			target.x ?? 0,
			target.y ?? 0,
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
	// Sentinel marks "no perspective cached yet" so degenerate perspectives
	// (computeSensorFov returns null) still benefit from the cache instead
	// of recomputing on every render.
	private static readonly _FOV_UNCACHED: object = {};
	private _fovCache: SensorFov | null = null;
	private _fovPerspective: number[] | null | object =
		EPPGridPanel._FOV_UNCACHED;

	private _getSensorFov(): SensorFov | null {
		if (!this._perspective) return null;
		if (this._fovPerspective === this._perspective) return this._fovCache;
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

	// Configuration card metrics cache — keyed by configuration object reference.
	// Invalidated when perspective or max-range changes (FOV inputs).
	// fetchConfigurations returns fresh objects each call, so stale entries drop
	// naturally via WeakMap GC when the old array is replaced.
	private _configurationMetricsCache = new WeakMap<
		object,
		{
			perspective: number[] | null;
			maxRangeMm: number;
			widthM: number;
			depthM: number;
		}
	>();

	private _getConfigurationMetrics(t: {
		grid: number[];
		roomWidth: number;
		roomDepth: number;
	}): { widthM: number; depthM: number } {
		const perspective = this._perspective;
		const maxRangeMm = this._computeMaxRangeMm();
		const cached = this._configurationMetricsCache.get(t);
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
		this._configurationMetricsCache.set(t, {
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
		if (target.x == null || target.y == null) return null;
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
      margin-top: 4px;
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

    .tab-help {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      padding: 12px 16px;
      color: var(--app-header-text-color, white);
      opacity: 0.7;
      text-decoration: none;
      cursor: pointer;
      --mdc-icon-size: 24px;
    }

    .tab-help:hover,
    .tab-help:focus-visible {
      opacity: 1;
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
      ${this._showConfigurationBackup ? this._renderConfigurationBackupDialog() : nothing}
      ${this._showConfigurationRestore ? this._renderConfigurationRestoreDialog() : nothing}
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
						void this._flasherCtrl.resetUsbState();
						this._panelTab = "config";
						this._loadDevices();
					}}>${this._localize("tabs.device_configuration")}</button>
				<button class="tab ${this._panelTab === "flasher" ? "active" : ""}"
					@click=${() => {
						void this._flasherCtrl.resetUsbState();
						this._panelTab = "flasher";
						if (this._flasherCtrl.loading) {
							this._flasherCtrl.hass = this.hass;
							this._flasherCtrl.subscribeDeviceList();
						}
					}}>${this._localize("tabs.flash_firmware")}</button>
				<a class="tab-help"
					href=${getHelpUrl({
						panelTab: this._panelTab,
						view: this._view,
						sidebarTab: this._sidebarTab,
					})}
					target="_blank"
					rel="noopener noreferrer"
					aria-label=${this._localize("tabs.help")}
				>
					<ha-icon icon="mdi:help-circle-outline"></ha-icon>
				</a>
			</div>
		`;
	}

	render() {
		if (this._panelTab === "flasher") {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
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
						void this._flasherCtrl.resetUsbState();
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
						// Clear the error AND start a fresh OTA — dismissing alone
						// made "Retry" a two-click flow (the second click being the
						// Update button that reappeared).
						this._flasherCtrl.dismissOtaError(e.detail.mac);
						this._flasherCtrl.startOta(e.detail.mac);
					}}
					@wifi-complete=${() => {
						void this._flasherCtrl.resetUsbState();
						this._loadDevices();
						this._panelTab = "config";
					}}
				></epp-flasher-view>
			</div>`;
		}

		// While the user is editing settings, swapping the whole template out
		// for a connection/loading screen unmounts <epp-settings-view>, which
		// wipes its private `_overrides` (every unsaved toggle / slider edit).
		// HA debounces ESPHome reloads 30s after a disabled_by change, so a
		// settings save reliably triggers a brief offline window 30s later —
		// long enough to lose any in-flight edits the user made after
		// clicking Save. Every full-page status branch below must honour
		// this and inline a banner above the settings view instead.
		const inSettingsEdit = this._view === "settings" && this._selectedMac;
		const haDisconnected =
			this.hass?.connection?.connected === false || !this._haConnected;

		if (haDisconnected && !inSettingsEdit) {
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

		if (this._loading && !inSettingsEdit) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">${this._localize("common.loading")}</div>
			</div>`;
		}

		// Show the "no devices configured" placeholder when either we have
		// no prior selection, or the list has been stably empty for several
		// retries (user deleted the last device, or the persisted selection
		// is stale from a prior session). A short retry window gives the
		// HA integration time to re-discover devices after a restart before
		// we fall back to the CTA.
		const emptyListStable = this._initRetryCount >= 3;
		if (!this._devices.length && (!this._selectedMac || emptyListStable)) {
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

		if (this._view === "tutorial" || this._view === "calibrate") {
			return html`<div class="tab-layout">
        ${this._renderTabBar()}
        <div class="panel">
          ${this._renderHeader()}
          <epp-wizard
            .rawTargets=${this._rawTargets}
            .sensorState=${{ occupancy: this._sensorState.occupancy }}
            .localize=${this._localize}
            .initialRoomWidth=${this._roomWidth}
            .initialRoomDepth=${this._roomDepth}
            .initialStep=${this._view === "tutorial" ? "guide" : "corners"}
            @dismiss-tutorial=${() => this._onDismissTutorial()}
            @begin-corners=${() => {
							this._view = "calibrate";
						}}
            @wizard-save=${(e: CustomEvent) => this._onWizardSave(e)}
          @wizard-cancel=${() => {
						this._view = "live";
					}}
          ></epp-wizard>
        </div>
      </div>`;
		}

		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		// Missing-from-list is treated as offline so a transient empty
		// device list during HA reload shows the offline banner instead
		// of falling through to a half-rendered grid without data.
		const isOffline =
			!!this._selectedMac && (!dev || dev.firmware_status === "unavailable");
		const protocolOk = !dev || dev.firmware_status === "compatible";

		// Compute the inline status banner for settings-view editing (see the
		// `inSettingsEdit` comment above for why the full-page branches must
		// not unmount the settings view).
		let settingsStatusBanner: any = nothing;
		if (inSettingsEdit) {
			if (haDisconnected) {
				settingsStatusBanner = html`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				`;
			} else if (this._deviceCtrl.reconnecting) {
				settingsStatusBanner = html`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				`;
			} else if (this._deviceCtrl.connectionFailed || isOffline) {
				settingsStatusBanner = this._renderConnectionBanner();
			} else if (!protocolOk) {
				settingsStatusBanner = this._renderProtocolBanner();
			}
		}

		if (this._deviceCtrl.reconnecting && !inSettingsEdit) {
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

		if ((this._deviceCtrl.connectionFailed || isOffline) && !inSettingsEdit) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;
		}

		if (!protocolOk && !inSettingsEdit) {
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
				? this._renderSettings(settingsStatusBanner)
				: this._view === "editor" && this._perspective
					? this._renderEditor()
					: this._renderLiveOverview();

		return html`<div class="tab-layout">${this._renderTabBar()}${content}${this._renderGlobalDialogs()}</div>`;
	}

	/**
	 * Persist a finished calibration from the wizard.
	 *
	 * Contract: the wizard validates + computes the homography, dispatches
	 * `wizard-save` with the payload and disables its Save button; the panel
	 * owns the `eppgrid/set_setup` call (matching how every other view
	 * persists). On success the panel navigates to live, unmounting the
	 * wizard; on failure it calls `saveFailed()` on the wizard element so the
	 * wizard re-enables Save and shows a localized error.
	 */
	private async _onWizardSave(e: CustomEvent): Promise<void> {
		// currentTarget is only valid during synchronous dispatch — capture it
		// before the first await.
		const wizard = e.currentTarget as EppWizard;
		const { perspective, roomWidth, roomDepth } = e.detail;
		try {
			await this.hass.callWS({
				type: "eppgrid/set_setup",
				mac: this._selectedMac,
				perspective,
				room_width: roomWidth,
				room_depth: roomDepth,
			});
		} catch (err) {
			console.error("Failed to save calibration", err);
			wizard.saveFailed();
			return;
		}
		this._perspective = perspective;
		this._roomWidth = roomWidth;
		this._roomDepth = roomDepth;
		this._initGridFromRoom();
		// Furniture is anchored to the old room dimensions/footprint; clear it
		// so the user re-places it under the new calibration.
		this._furniture = [];
		this._view = "live";
		// set_setup enables zone_presence — update local state
		this._entitiesConfig = {
			...this._entitiesConfig,
			zone_presence: true,
		};
		await this._gridCtrl.applyLayout().catch((err: unknown) => {
			console.error("Failed to apply layout after calibration", err);
		});
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
					stuck_target_timeout: this._stuckTargetTimeout,
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
			await this.hass.callWS({
				type: "eppgrid/set_room_layout",
				mac: this._selectedMac,
				grid_bytes: Array.from(this._grid),
				zone_slots: this._zoneConfigs.map((z, idx) =>
					idx === 0 ? serializeSlot(z, 0) : null,
				),
				furniture: [],
			});
		} catch (e) {
			console.error("Failed to delete calibration", e);
		}
		this._dirty = false;
		this._view = "live";
	}

	private _changePlacement(): void {
		this._guardNavigation(() =>
			this._applyView({
				view: this._deviceCtrl.showRoomCalibrationTutorial
					? "tutorial"
					: "calibrate",
				sidebarTab: this._sidebarTab,
			}),
		);
	}

	private async _onDismissTutorial(): Promise<void> {
		const prior = this._deviceCtrl.showRoomCalibrationTutorial;
		this._deviceCtrl.setShowRoomCalibrationTutorial(false);
		try {
			await this.hass.callWS({
				type: "eppgrid/set_show_room_calibration_tutorial",
				value: false,
			});
		} catch (e) {
			console.error("Failed to persist show_room_calibration_tutorial", e);
			this._deviceCtrl.setShowRoomCalibrationTutorial(prior);
		}
	}

	private _renderHeader() {
		// Skip the picker when the list is empty: ha-select would otherwise
		// fall back to showing the raw `.value` (the deleted device's MAC)
		// because no option matches. The offline banner still renders below.
		if (!this._devices.length) {
			return html`<div class="panel-header"></div>`;
		}
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
							persistSelectedMac(val);
							// Furniture clipboard belongs to the previous device's
							// layout — reset it so paste doesn't smuggle stale items
							// into the new device.
							this._furnitureClipboard = null;
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
		const dev = this._devices.find((d) => d.mac === this._selectedMac);
		const isOffline =
			!!this._selectedMac && (!dev || dev.firmware_status === "unavailable");

		if (!this._deviceCtrl.connectionFailed && !isOffline) return nothing;

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
			this._ensureSession(this._selectedMac);
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
				.occupancy=${occupancy}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.localize=${this._localize}
				.maxGridPx=${480}
				.maxRangeMm=${this._computeMaxRangeMm()}
				@furniture-select=${(e: CustomEvent) => {
					this._selectedFurnitureId = e.detail;
				}}
				@furniture-pointer-down=${(e: CustomEvent) => {
					const { e: ptrEvent, id, type, handle, rotation } = e.detail;
					this._onFurniturePointerDown(ptrEvent, id, type, handle, rotation);
				}}
				@furniture-delete=${(e: CustomEvent) => {
					this._removeFurniture(e.detail);
				}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${(e: CustomEvent) => {
					this._showTargetMenu(e.detail);
				}}
				@target-undismissed=${(e: CustomEvent) => {
					this._handleTargetUndismissed(e.detail.targetIndex);
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

	// Wraps the shared bounds-checked helper; keeps the -1 sentinel the
	// panel's callers test with `idx >= 0` / `idx < 0`.
	private _targetCellIndex(x: number, y: number): number {
		const pos = mapTargetToGridCell(x, y, this._roomWidth, this._roomDepth);
		if (!pos) return -1;
		return targetCellIndex(pos) ?? -1;
	}

	/**
	 * Clear a dismissed-target entry in response to `target-undismissed`
	 * dispatched by `<epp-grid>` (a target moved off its dismissed cell).
	 * The grid component no longer mutates `dismissedTargets` itself; the
	 * panel owns that state and rebuilds the Map for Lit reactivity.
	 */
	private _handleTargetUndismissed(targetIndex: number): void {
		if (!this._dismissedTargets.has(targetIndex)) return;
		this._dismissedTargets = new Map(this._dismissedTargets);
		this._dismissedTargets.delete(targetIndex);
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
	}

	private async _setOverlay(kind: number): Promise<void> {
		if (!this._targetMenu) return;
		const idx = this._targetCellIndex(this._targetMenu.x, this._targetMenu.y);
		if (idx < 0 || !cellIsInside(this._grid[idx])) {
			this._closeTargetMenu();
			return;
		}
		const previousByte = this._grid[idx];
		const optimisticByte = cellSetOverlay(this._grid[idx], kind);
		const next = new Uint8Array(this._grid);
		next[idx] = optimisticByte;
		this._grid = next;
		this._closeTargetMenu();
		// One-shot save: persist directly without going through applyLayout
		// (which prunes zones, filters furniture, switches view, and clears
		// the dirty flag — all undesirable for a single overlay click).
		try {
			await this.hass.callWS({
				type: "eppgrid/set_room_layout",
				mac: this._selectedMac,
				grid_bytes: Array.from(this._grid),
				zone_slots: this._zoneConfigs.map((z, i) => serializeSlot(z, i)),
				furniture: this._furniture.map(serializeFurniture),
			});
		} catch (err) {
			// Roll back ONLY the cell we mutated, and only if it still holds our
			// optimistic value. Reverting the whole _grid reference would clobber
			// any other edits the user made while the WS call was in flight.
			if (this._grid[idx] === optimisticByte) {
				const reverted = new Uint8Array(this._grid);
				reverted[idx] = previousByte;
				this._grid = reverted;
			}
			console.warn("[eppgrid] set overlay cell failed", err);
		}
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
				<button class="target-menu-item" @click=${() => this._setOverlay(CELL_OVERLAY_INTERFERENCE)}>
					${this._localize("live.mark_interference")}
				</button>
				<button class="target-menu-item" @click=${() => this._setOverlay(CELL_OVERLAY_SUPPRESS)}>
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
											this._guardNavigation(() =>
												this._applyView({
													view: "settings",
													sidebarTab: this._sidebarTab,
												}),
											);
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
                    <button class="sidebar-menu-item" @click=${() => {
											this._showConfigurationBackup = true;
										}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.backup_configuration")}
                    </button>
                    <button class="sidebar-menu-item" @click=${async () => {
											await this._gridCtrl.fetchConfigurations();
											this._showConfigurationRestore = true;
										}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.restore_configuration")}
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
                .hasPerspective=${this._perspective != null}
                .localize=${this._localize}
                @view-change=${(e: CustomEvent) => {
									this._guardNavigation(() =>
										this._applyView({
											view: e.detail.view,
											sidebarTab: e.detail.sidebarTab ?? this._sidebarTab,
										}),
									);
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

	private _renderSettings(statusBanner: unknown = nothing) {
		return html`
      <div class="panel">
        ${this._renderHeader()}
        ${statusBanner}
        <epp-settings-view
          .sensorState=${this._sensorState}
          .targetAutoDistance=${this._targetAutoDistance}
          .targetMaxDistance=${this._targetMaxDistance}
          .stuckTargetTimeout=${this._stuckTargetTimeout}
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
		// Run local zone engine replica and compute occupancy for editor view.
		// IMPORTANT: this method must be a pure function of state — do NOT
		// mutate `_targets[i].status` or `_sensorState`. Build derived data
		// in local variables and route the children off those.
		const engineResult = this._runLocalZoneEngine();
		const editorOccupancy = engineResult.occupancy;

		// Build a NEW targets array overlaying engine-computed status onto
		// each target. Every element is a fresh object so downstream
		// consumers can never mutate the original `_targets[i]` refs.
		const editorTargets = this._targets.map((t, i) => ({
			...t,
			status: engineResult.targets[i]?.status ?? t.status,
		}));

		// Editor preview previously mutated `_sensorState.occupancy` and
		// `_sensorState.mmwave` here, contaminating live-view consumers
		// (see `.sensorState=...` bindings in `_renderLiveOverview` /
		// wizard). Nothing in this template currently consumes those
		// fields, so the derivation has been removed entirely; should a
		// child component ever need them, build a local
		// `editorSensorState = { ...this._sensorState, occupancy, mmwave }`
		// and pass it explicitly — never mutate `this._sensorState`.

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
                .targets=${editorTargets}
                .roomWidth=${this._roomWidth}
                .roomDepth=${this._roomDepth}
                .perspective=${this._perspective}
                .furniture=${this._furniture}
                .selectedFurnitureId=${this._selectedFurnitureId}
                .sidebarTab=${this._sidebarTab}
                .editable=${true}
                .activeZone=${this._activeZone}
                .occupancy=${editorOccupancy}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .localize=${this._localize}
                .maxGridPx=${480}
                .maxRangeMm=${this._editorMaxRangeMm()}
                .frozenBounds=${this._frozenBounds}
                .dismissedTargets=${this._dismissedTargets}
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
									const { e: ptrEvent, id, type, handle, rotation } = e.detail;
									this._onFurniturePointerDown(
										ptrEvent,
										id,
										type,
										handle,
										rotation,
									);
								}}
                @furniture-delete=${(e: CustomEvent) => {
									this._removeFurniture(e.detail);
								}}
                @target-undismissed=${(e: CustomEvent) => {
									this._handleTargetUndismissed(e.detail.targetIndex);
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
											this._dirty = true;
										}}
                    @zone0-change=${(e: CustomEvent<Partial<Zone0Config>>) => {
											const current = this._zoneConfigs[0];
											const next = [...this._zoneConfigs];
											next[0] = { ...current, ...e.detail };
											this._zoneConfigs = next as unknown as ZoneSlots;
											this._dirty = true;
										}}
                  ></epp-zone-sidebar>`
								: this._sidebarTab === "overlays"
									? html`<epp-overlay-sidebar
                    .overlayMode=${this._overlayMode}
                    .localize=${this._localize}
                    @overlay-select=${(
											e: CustomEvent<{ mode: OverlayMode }>,
										) => {
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

	private _renderConfigurationBackupDialog() {
		return html`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.backup_configuration")}</h3>
          <input
            type="text"
            class="configuration-name-input"
            placeholder="${this._localize("dialogs.configuration_name")}"
            .value=${this._configurationName}
            @input=${(e: Event) => {
							this._configurationName = (e.target as HTMLInputElement).value;
						}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${() => {
								this._showConfigurationBackup = false;
							}}
            >${this._localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this._configurationName.trim()}
              @click=${() => this._saveConfiguration()}
            >${this._localize("common.save")}</button>
          </div>
        </div>
      </div>
    `;
	}

	private _renderConfigurationRestoreDialog() {
		// Only show configurations whose zone array fits the current slot
		// schema (length = 8). Older or malformed entries are filtered out
		// because loading them would fail.
		const configurations = this._getConfigurations().filter(
			(t: { zones?: unknown }) =>
				Array.isArray(t.zones) && t.zones.length === 8,
		);
		return html`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.restore_configuration")}</h3>
          ${
						configurations.length === 0
							? html`<p class="overlay-help">${this._localize("dialogs.no_configurations")}</p>`
							: html`<div class="configuration-card-grid">
                  ${configurations.map(
										(t) => html`
                    <div class="configuration-card"
                      role="button"
                      tabindex="0"
                      @click=${() => this._loadConfiguration(t.name)}
                      @keydown=${(e: KeyboardEvent) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													this._loadConfiguration(t.name);
												}
											}}
                    >
                      <button class="configuration-card-delete"
                        type="button"
                        aria-label="${this._localize("common.delete")}"
                        @click=${(e: Event) => {
													e.stopPropagation();
													this._deleteConfiguration(t.name);
												}}
                        @keydown=${(e: KeyboardEvent) => {
													e.stopPropagation();
												}}
                      >
                        <ha-icon icon="mdi:close"></ha-icon>
                      </button>
                      <div class="configuration-card-thumbnail">
                        ${renderConfigurationThumbnail(
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
                      <div class="configuration-card-info">
                        <div class="configuration-card-name">${t.name}</div>
                        <div class="configuration-card-size">${(() => {
													// Same FOV-aware metrics the live footer uses; cached
													// per template to avoid re-scanning the grid every render.
													const { widthM, depthM } =
														this._getConfigurationMetrics(t);
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
								this._showConfigurationRestore = false;
							}}
            >${this._localize("common.close")}</button>
          </div>
        </div>
      </div>
    `;
	}

	/** Run local zone engine replica — delegated to TargetController. */
	private _runLocalZoneEngine(): ZoneEngineResult {
		return this._targetCtrl.runLocalZoneEngine();
	}

	/** Enrich a raw debug log string — delegated to TargetController. */
	private _enrichDebugLog(raw: string): string {
		return this._targetCtrl.enrichDebugLog(raw);
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
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            class="live-section-header live-section-link"
            style="font-size: 12px; gap: 4px; min-width: 0; overflow: hidden;"
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
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button
                class="debug-log-btn"
                @click=${() => {
									navigator.clipboard
										.writeText(this._backendDebugLogLines.join("\n"))
										.catch((err) =>
											console.warn("Clipboard write failed", err),
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
          `
							: nothing
					}
        </div>
        ${
					this._showBackendDebugLog
						? html`
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
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            class="live-section-header live-section-link"
            style="font-size: 12px; gap: 4px; min-width: 0; overflow: hidden;"
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
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button
                class="debug-log-btn"
                @click=${() => {
									navigator.clipboard
										.writeText(this._debugLogLines.join("\n"))
										.catch((err) =>
											console.warn("Clipboard write failed", err),
										);
								}}
              >${this._localize("live.debug.copy_all")}</button>
              <button
                class="debug-log-btn"
                @click=${() => {
									this._debugLogLines = [];
									this._debugLogPrev = null;
									const el =
										this.shadowRoot?.getElementById("debug-log-scroll");
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
          `
							: nothing
					}
        </div>
        ${
					this._showDebugLog
						? html`
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
					const { e: ptrEvent, id, type, handle, rotation } = e.detail;
					this._onFurniturePointerDown(ptrEvent, id, type, handle, rotation);
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
				void ctrl.resetUsbState();
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
					accessToken: this.hass?.auth?.accessToken,
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
				void ctrl.resetUsbState();
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
				if (ctrl.serialPort) {
					try {
						await ctrl.serialPort.close().catch(() => {});
					} catch {}
					ctrl.serialPort = null;
				}
				ctrl.opRunning = false;
				void ctrl.resetUsbState();
				return;
			}
			const lastStep = ctrl.usbFlashState?.step;
			// Clean up port on error — don't leave it dangling. Await the
			// close so the "error" UI renders only after the port is fully
			// released (unawaited close left the port lock pending and the
			// next retry surfaced as "serial port busy").
			if (ctrl.serialPort) {
				try {
					await ctrl.serialPort.close().catch(() => {});
				} catch {}
				ctrl.serialPort = null;
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
			console.debug(`[wifi-provision] sending WIFI_SETTINGS ssid="${ssid}"`);
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

	// After a fresh WiFi association the device's API socket / mDNS / DHCP can
	// take up to ~50s to settle. Retry at a steady 10s cadence so the UI has
	// predictable progress rather than front-loaded flurry + long silence.
	private static readonly HA_ADD_RETRY_DELAY_MS = 10_000;
	private static readonly HA_ADD_MAX_ATTEMPTS = 6;

	private async _addToHaWithRetry(ip: string): Promise<HaAddResult> {
		const ctrl = this._flasherCtrl;
		const myOp = ctrl.opId;
		const maxAttempts = EPPGridPanel.HA_ADD_MAX_ATTEMPTS;
		const delay = EPPGridPanel.HA_ADD_RETRY_DELAY_MS;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			if (attempt > 1) {
				ctrl.updateUsbState({
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
				haAdd = await ctrl.addEsphomeDevice(ip);
			} catch (err) {
				const msg = (err as { message?: string })?.message;
				return { type: "failed", reason: msg ?? "unknown" };
			}
			if (ctrl.opId !== myOp) return haAdd;
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
		const ctrl = this._flasherCtrl;
		const step = 250;
		let remaining = ms;
		while (remaining > 0) {
			if (ctrl.opId !== expectedOpId) return true;
			const chunk = Math.min(remaining, step);
			await new Promise((r) => setTimeout(r, chunk));
			remaining -= chunk;
		}
		return ctrl.opId !== expectedOpId;
	}

	private async _addToHa(ip: string): Promise<void> {
		const ctrl = this._flasherCtrl;
		const myOp = ctrl.opId;

		const haAdd = await this._addToHaWithRetry(ip);
		if (ctrl.opId !== myOp) return;

		ctrl.updateUsbState({ step: "complete", ip, haAdd });
	}

	private async _handleRetryHaAdd(): Promise<void> {
		const ctrl = this._flasherCtrl;
		const state = ctrl.usbFlashState;
		if (state?.step !== "complete" || !state.ip) return;

		const ip = state.ip;
		const myOp = ctrl.opId;
		ctrl.updateUsbState({ step: "wifi_configured", ip });
		const haAdd = await this._addToHaWithRetry(ip);
		if (ctrl.opId !== myOp) return;
		ctrl.updateUsbState({ step: "complete", ip, haAdd });
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
		ctrl.opRunning = false;
		// resetUsbState bumps opId, aborts any in-flight polling
		// (queryImprovState during wifi_check), waits for the aborted op to
		// settle so its serial locks are released, and only then closes the
		// port — close() while a lock is still held rejects with "the port
		// has a readable or writable stream" and leaves the port open +
		// unusable for the next flash attempt. It clears usbFlashState only
		// after that teardown, so the view's "Cancelling…" feedback stays up
		// for the duration of the unwind.
		await ctrl.resetUsbState();
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
