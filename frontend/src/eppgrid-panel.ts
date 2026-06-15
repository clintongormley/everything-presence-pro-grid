import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";

import "./ui/index.js";
import "./components/epp-configuration-dialogs.js";
import "./components/epp-flasher-view.js";
import "./components/epp-furniture-sidebar.js";
import "./components/epp-grid.js";
import "./components/epp-kebab-menu.js";
import "./components/epp-live-sidebar.js";
import type { KebabEntry } from "./components/epp-kebab-menu.js";
import type { ZoneStateSummary } from "./components/epp-live-sidebar.js";
import "./components/epp-settings-view.js";
import "./components/epp-wizard.js";
import type { EppWizard } from "./components/epp-wizard.js";
import { renderSaveCancelBar } from "./components/save-cancel-bar.js";
import "./components/epp-overlay-sidebar.js";
import "./components/epp-zone-sidebar.js";
import "./views/epp-device-groups-view.js";
import { DeviceController } from "./controllers/device-controller.js";
import { DeviceGroupsController } from "./controllers/device-groups-controller.js";
import { FlasherController } from "./controllers/flasher-controller.js";
import {
	GridStateController,
	serializeFurniture,
	serializeSlot,
} from "./controllers/grid-state-controller.js";
import { NavigationGuardController } from "./controllers/navigation-guard.js";
import { TargetController } from "./controllers/target-controller.js";
import type { PaintAction } from "./lib/cell-painting.js";
import { parseConfig } from "./lib/config-serialization.js";
import { mapTargetToGridCell, targetCellIndex } from "./lib/coordinates.js";
import type { FurnitureItem, FurnitureSticker } from "./lib/furniture.js";
import {
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	cellIsInside,
	cellSetOverlay,
	GRID_CELL_COUNT,
	getRoomBounds,
	initGridFromRoom,
	MAX_RANGE,
	type OverlayMode,
} from "./lib/grid.js";
import { getHelpUrl, type PanelTab } from "./lib/help-url.js";
import {
	autoDetectionRange,
	boundsToRoomMm,
	computeMaxRangeMm,
	computeSensorFov,
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
	DEFAULT_SIDEBAR_TAB,
	parseViewHash,
	type SidebarTab,
	type ViewMode,
	type ViewState,
} from "./lib/view-hash.js";
import {
	INITIAL_ZONE_SLOTS,
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
import type { DeviceInfo, RawTarget, Target } from "./types.js";
import { tokens } from "./ui/tokens.js";

// ZoneSlots / INITIAL_ZONE_SLOTS moved to lib/zone-defaults.ts so the
// controllers can import them without a circular type dep on this module.

// Everything Presence Pro Grid logo, inlined from custom_components/eppgrid/
// brand/icon.svg so it ships in the bundle (no extra static path / request).
// Sized via the .epp-logo CSS rule; viewBox preserved for crisp scaling.
const EPP_LOGO = html`
	<svg
		class="epp-logo"
		viewBox="0 0 256 256"
		role="img"
		aria-label="Everything Presence Pro Grid"
	>
		<rect width="256" height="256" rx="48" fill="#0f172a" />
		<g stroke="#4d6d9f" stroke-width="3">
			<path
				d="M32 32v192M64 32v192M96 32v192M128 32v192M160 32v192M192 32v192M224 32v192"
			/>
			<path
				d="M32 32h192M32 64h192M32 96h192M32 128h192M32 160h192M32 192h192M32 224h192"
			/>
		</g>
		<path
			d="M 128 48 L 32 195.5 A 176 176 0 0 0 224 195.5 Z"
			fill="#0ea5e9"
			fill-opacity="0.32"
			stroke="#7dd3fc"
			stroke-width="3.5"
			stroke-linejoin="round"
		/>
		<g
			fill="none"
			stroke="#7dd3fc"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-dasharray="0 6"
			opacity="0.85"
		>
			<path d="M 96 97.17 A 58.67 58.67 0 0 0 160 97.17" />
			<path d="M 64 146.34 A 117.33 117.33 0 0 0 192 146.34" />
		</g>
		<circle cx="128" cy="160" r="12" fill="#fb923c" />
		<circle
			cx="128"
			cy="160"
			r="22"
			fill="none"
			stroke="#fb923c"
			stroke-width="3"
			opacity="0.6"
		/>
		<circle cx="128" cy="48" r="12" fill="#f8fafc" />
		<circle
			cx="128"
			cy="48"
			r="20"
			fill="none"
			stroke="#f8fafc"
			stroke-width="2.5"
			opacity="0.55"
		/>
	</svg>
`;

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

// Factory — returns a fresh object each call so resets and the
// settings-view snapshot merge (`{ ...createInitialSensorState(), ... }` in
// onSessionClosed) never alias a shared object.
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

export const panelStyles = css`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }

  @media (max-width: 819px) {
    :host {
      --epp-control-height: 44px;
    }
    .panel {
      /* Hard-cap at the viewport. In real HA the panel-host's container is
         content-sized, so without this cap .panel grows to the grid's content
         width (~maxGridPx) and the whole page scrolls horizontally on a narrow
         phone. 100vw is viewport-relative (definite) regardless of how the
         ancestor chain is sized, so it constrains .panel — and thus the grid's
         measured host width — to the viewport. min-width:0 also drops the flex
         min-content floor (:host is display:flex; .panel is its flex item).
         (Mobile @media only — desktop layout is byte-identical.) */
      max-width: 100vw;
      padding: var(--epp-space-3, 12px);
      min-width: 0;
    }
    .panel-header ha-select {
      width: 100%;
    }
  }

  .controller-error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 16px 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--error-color, #db4437);
    color: var(--text-primary-color, #fff);
    font-size: 14px;
  }

  .controller-error-banner span {
    flex: 1;
  }

  .controller-error-dismiss {
    display: flex;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 2px;
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

  /* Mobile editor: grid full-width, controls in a persistent bottom sheet.
     This container only renders below 820px (the _isMobile branch), so these
     rules never affect the desktop layout. */
  .editor-mobile {
    display: block;
  }

  /* Sidebar-tab switcher — rendered in the mobile bottom-sheet peek only. */
  .sidebar-tabs {
    display: flex;
    gap: 4px;
  }

  .sidebar-tabs .sidebar-tab {
    flex: 1;
    appearance: none;
    border: none;
    background: transparent;
    padding: 8px 4px;
    border-radius: var(--epp-radius-md, 8px);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--secondary-text-color, #727272);
    cursor: pointer;
  }

  .sidebar-tabs .sidebar-tab.active {
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-color, #03a9f4);
  }

  @media (max-width: 819px) {
    .editor-layout {
      flex-direction: column;
      align-items: stretch;
    }
    .zone-sidebar {
      width: auto;
      border-left: none;
    }
    .grid-column {
      max-width: 100%;
      text-align: center;
    }
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
`;

// The shared history-interception registry (unsaved-changes navigation
// guard) lives in controllers/navigation-guard.ts together with the
// NavigationGuardController that joins/leaves it per panel instance.

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
	// The IIFE wires the error hook at construction (not connectedCallback)
	// so failures surface even when ops run before/without attachment.
	private _gridCtrl = (() => {
		const ctrl = new GridStateController(this);
		ctrl.onError = (op) => {
			this._controllerError = op;
		};
		return ctrl;
	})();
	// Target controller — owns target/sensor/zone state processing, zone engine, debug logging
	private _targetCtrl = new TargetController(this);
	// Flasher controller — owns OTA flash state, flashable device list, and
	// the USB flash / WiFi-provisioning flow. The IIFE wires the
	// delete-confirm hook at construction (same rationale as _gridCtrl's
	// error hook): the flow must never run without a confirmation path.
	private _flasherCtrl = (() => {
		const ctrl = new FlasherController(this);
		ctrl.confirmDeleteOriginalFirmware = () =>
			this._requestFlasherDeleteConfirm();
		return ctrl;
	})();
	// Device groups controller — owns group CRUD and WS subscription
	@state() private _deviceGroupsCtrl?: DeviceGroupsController;
	// Navigation guard — owns the unsaved-changes guard (beforeunload,
	// hashchange, the shared history-interception registry entry) and the
	// pending-navigation queue behind the dialog. Pass `this` directly so
	// tsc verifies the panel structurally satisfies NavigationGuardHost.
	private _navGuard = new NavigationGuardController(this);
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
	@state() _assistedClearEnabled = true;
	@state() _assistedClearTimeout = 5;
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
	@state() private _co2Enabled = false;
	@state() _ledMode = "Manual Control";
	@state() _ledBrightness = 1.0;
	@state() _ledPresenceColor = "#CC33FF";
	@state() _relayTriggerMode = "disabled";
	@state() _relayContactMode = "no";
	@state() _targetUpdateRateMs = 1000;
	@state() _zoneUpdateRateMs = 1000;
	@state() _entitiesConfig: Record<string, boolean> = {};
	@state() _sidebarTab: SidebarTab = parseViewHash(
		typeof location !== "undefined" ? location.hash : "",
	).sidebarTab;
	@state() private _panelTab: PanelTab = "config";
	@state() private _showDeleteCalibrationDialog = false;
	// Themed replacement for the old window.confirm() in the USB flash flow:
	// the flow's beforeFlash hook awaits the promise while the dialog is up.
	@state() private _showFlasherDeleteConfirm = false;
	private _flasherDeleteConfirmResolve: ((ok: boolean) => void) | null = null;
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
	// Mobile/responsive: below 820px the editor renders the grid full-width
	// with the sidebar controls in a bottom sheet (epp-sheet); at/above 820px
	// the desktop side-by-side layout is used unchanged. Driven by matchMedia
	// wired in connectedCallback (defaults false so the desktop layout — and
	// every editor render test, which runs with happy-dom's matches:false — is
	// the byte-identical existing markup).
	@state() private _isMobile = false;
	// Defaults open so the inline controls sheet is visible immediately under
	// the grid in the mobile editor (no swipe needed); tap-to-collapse still works.
	@state() private _editorSheetOpen = true;
	private _mql?: MediaQueryList;
	private _onMql = (e: MediaQueryListEvent | MediaQueryList) => {
		this._isMobile = e.matches;
	};
	// Failed grid-controller op (applyLayout/saveSettings/save/load
	// configuration) — rendered as a dismissible banner; the op name doubles
	// as the `errors.*` translation-key suffix. Cleared when a new op starts
	// or the user dismisses it.
	@state() private _controllerError: string | null = null;
	// Not `private`: part of the NavigationGuardHost contract (the guard
	// raises/clears it; the panel renders the dialog).
	@state() _showUnsavedDialog = false;
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
		// beforeunload / hashchange / history interception are owned by
		// _navGuard (hostConnected ran in super.connectedCallback() above).
		window.addEventListener("keydown", this._onKeyDown);
		// Mobile breakpoint: editor switches to the bottom-sheet layout below
		// 820px. Seed the flag from the current match, then track changes.
		this._mql = window.matchMedia("(max-width: 819px)");
		this._isMobile = this._mql.matches;
		this._mql.addEventListener("change", this._onMql);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		if (this._initRetryTimer) {
			clearTimeout(this._initRetryTimer);
			this._initRetryTimer = undefined;
		}
		this._closeDeviceSession();
		this._detachConnectionListeners();
		// beforeunload / hashchange / history-interception teardown is owned
		// by _navGuard (hostDisconnected ran in super.disconnectedCallback()).
		window.removeEventListener("keydown", this._onKeyDown);
		this._mql?.removeEventListener("change", this._onMql);
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
			this._navGuard.syncHashFromState();
		}
	}

	/**
	 * Move to a target view + sub-tab. Centralises the side effects
	 * (overlay-mode reset, range widening) so click handlers and
	 * URL-driven navigation behave the same. Not `private`: it's part of
	 * the NavigationGuardHost contract (the guard applies hash-driven
	 * navigation through it).
	 */
	_applyView(state: ViewState): void {
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

	updated(changedProps: PropertyValues): void {
		if (changedProps.has("hass") && this.hass) {
			this._deviceCtrl.hass = this.hass;
			this._flasherCtrl.hass = this.hass;
			if (this.hass.connection && !this._deviceGroupsCtrl) {
				this._deviceGroupsCtrl = new DeviceGroupsController(
					this.hass.connection,
				);
			}
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
			// Clear the UI hide-map too: it's keyed by cell index and would
			// otherwise carry across a device/session switch, briefly hiding a
			// target sitting on a previously-dismissed cell on the new device
			// (mirrors the engine's dismissedCells reset).
			this._dismissedTargets = new Map();
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
		this._assistedClearEnabled = s.assistedClearEnabled;
		this._assistedClearTimeout = s.assistedClearTimeout;
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
	 * downstream components and helpers expect. Memoised on the _zoneConfigs
	 * reference (clone-then-mutate everywhere) so child components see a
	 * stable array identity across re-renders and skip needless updates. */
	private _namedZonesCache: (ZoneConfig | null)[] | null = null;
	private _namedZonesCacheConfigs: ZoneSlots | null = null;

	private _namedZones(): (ZoneConfig | null)[] {
		if (
			this._namedZonesCache === null ||
			this._namedZonesCacheConfigs !== this._zoneConfigs
		) {
			this._namedZonesCache = this._zoneConfigs.slice(
				1,
			) as (ZoneConfig | null)[];
			this._namedZonesCacheConfigs = this._zoneConfigs;
		}
		return this._namedZonesCache;
	}

	/** Memoised `{ occupancy }` binding for the wizard views — rebuilt only
	 * when occupancy flips so re-renders don't hand the wizard a fresh object
	 * (defeating its dirty-check) on every panel render. */
	private _wizardSensorStateCache: { occupancy: boolean } | null = null;

	private _getWizardSensorState(): { occupancy: boolean } {
		const occupancy = this._sensorState.occupancy;
		if (
			this._wizardSensorStateCache === null ||
			this._wizardSensorStateCache.occupancy !== occupancy
		) {
			this._wizardSensorStateCache = { occupancy };
		}
		return this._wizardSensorStateCache;
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
		this._controllerError = null;
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
		this._controllerError = null;
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
		// Auto-distance widens to the sensor maxima — the canonical defaults
		// in SETTINGS_DEFAULTS, not panel-local magic numbers.
		if (this._targetAutoDistance || this._staticAutoDistance) {
			this.hass
				?.callWS({
					type: "eppgrid/set_distance_override",
					mac: this._selectedMac,
					target_max_distance: this._targetAutoDistance
						? SETTINGS_DEFAULTS.target_max_distance
						: this._targetMaxDistance,
					static_min_distance: this._staticAutoDistance
						? SETTINGS_DEFAULTS.static_min_distance
						: this._staticMinDistance,
					static_max_distance: this._staticAutoDistance
						? SETTINGS_DEFAULTS.static_max_distance
						: this._staticMaxDistance,
				})
				?.catch(() => {});
		}
	}

	private _enterEditor(tab: SidebarTab): void {
		this._navGuard.guardNavigation(() =>
			this._applyView({ view: "editor", sidebarTab: tab }),
		);
	}

	// Items for the live-overview kebab. Editor entries (zones/overlays/
	// furniture) and the delete-calibration entry are gated on having a
	// calibration (`_perspective`), matching the old inline menu exactly.
	private _liveMenuItems(): KebabEntry[] {
		const items: KebabEntry[] = [];
		if (this._perspective) {
			items.push(
				{
					id: "zones",
					label: this._localize("menu.detection_zones"),
					icon: "mdi:vector-square",
				},
				{
					id: "overlays",
					label: this._localize("menu.overlays"),
					icon: "mdi:blur",
				},
				{
					id: "furniture",
					label: this._localize("menu.furniture"),
					icon: "mdi:sofa",
				},
			);
		}
		items.push({
			id: "settings",
			label: this._localize("menu.settings"),
			icon: "mdi:cog",
		});
		items.push({ divider: true });
		items.push({
			id: "calibration",
			label: this._localize("menu.room_calibration"),
			icon: "mdi:target",
		});
		if (this._perspective) {
			items.push({
				id: "delete_calibration",
				label: this._localize("menu.delete_calibration"),
				icon: "mdi:delete",
				danger: true,
			});
		}
		items.push({ divider: true });
		items.push(
			{
				id: "backup",
				label: this._localize("dialogs.backup_configuration"),
				icon: "mdi:content-save",
			},
			{
				id: "restore",
				label: this._localize("dialogs.restore_configuration"),
				icon: "mdi:folder-open",
			},
		);
		return items;
	}

	private _onLiveMenuSelect = async (
		e: CustomEvent<{ id: string }>,
	): Promise<void> => {
		switch (e.detail.id) {
			case "zones":
			case "overlays":
			case "furniture":
				this._enterEditor(e.detail.id as SidebarTab);
				break;
			case "settings":
				this._navGuard.guardNavigation(() =>
					this._applyView({
						view: "settings",
						sidebarTab: this._sidebarTab,
					}),
				);
				break;
			case "calibration":
				this._changePlacement();
				break;
			case "delete_calibration":
				this._showDeleteCalibrationDialog = true;
				break;
			case "backup":
				this._showConfigurationBackup = true;
				break;
			case "restore":
				await this._gridCtrl.fetchConfigurations();
				this._showConfigurationRestore = true;
				break;
		}
	};

	// -- Configuration management (backend WS API) --

	private _getConfigurations() {
		return this._gridCtrl.configurations;
	}

	private async _saveConfiguration(): Promise<void> {
		this._controllerError = null;
		try {
			await this._gridCtrl.saveConfiguration();
		} catch (err) {
			// Banner state is set by the controller's onError hook; this
			// catch just keeps the rejection from surfacing as unhandled.
			console.error("Failed to save configuration", err);
		}
	}

	private async _loadConfiguration(name: string): Promise<void> {
		this._controllerError = null;
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

	// -- Device selector --

	// -- Styles --

	static styles = [
		tokens,
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
      padding: 0 var(--epp-space-4, 16px);
      flex-shrink: 0;
    }

    .epp-logo {
      align-self: center;
      width: 40px;
      height: 40px;
      margin-right: var(--epp-space-3, 12px);
      flex-shrink: 0;
    }

    .tab {
      padding: var(--epp-space-3, 12px) 20px;
      border: none;
      background: none;
      color: var(--app-header-text-color, white);
      cursor: pointer;
      font-size: var(--epp-font-base, 14px);
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 3px solid transparent;
    }

    .tab.active {
      opacity: 1;
      border-bottom-color: var(--app-header-text-color, white);
    }

    .tab-icon,
    .tab-label-short {
      display: none;
    }

    @media (max-width: 819px) {
      .tab-bar {
        flex-wrap: nowrap;
        padding: 0 var(--epp-space-2, 8px);
      }
      .epp-logo {
        display: none;
      }
      .tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--epp-space-2, 8px) var(--epp-space-1, 4px);
        font-size: var(--epp-font-xs, 12px);
      }
      .tab-icon {
        display: block;
        --mdc-icon-size: 22px;
      }
      .tab-label-full {
        display: none;
      }
      .tab-label-short {
        display: inline;
      }
      .tab-help {
        padding: var(--epp-space-2, 8px);
        align-self: center;
      }
    }

    .tab-help {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      padding: var(--epp-space-3, 12px) var(--epp-space-4, 16px);
      color: var(--app-header-text-color, white);
      opacity: 0.7;
      text-decoration: none;
      cursor: pointer;
      --mdc-icon-size: var(--epp-space-5, 24px);
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
      ${
				this._showConfigurationBackup || this._showConfigurationRestore
					? html`<epp-configuration-dialogs
            .localize=${this._localize}
            .showBackup=${this._showConfigurationBackup}
            .showRestore=${this._showConfigurationRestore}
            .configurations=${this._getConfigurations()}
            .configurationName=${this._configurationName}
            .perspective=${this._perspective}
            .maxRangeMm=${this._computeMaxRangeMm()}
            .sensorFov=${this._getSensorFov()}
            @configuration-name-change=${(e: CustomEvent<string>) => {
							this._configurationName = e.detail;
						}}
            @configuration-save=${() => this._saveConfiguration()}
            @configuration-load=${(e: CustomEvent<string>) =>
							this._loadConfiguration(e.detail)}
            @configuration-delete=${(e: CustomEvent<string>) =>
							this._deleteConfiguration(e.detail)}
            @backup-cancel=${() => {
							this._showConfigurationBackup = false;
						}}
            @restore-close=${() => {
							this._showConfigurationRestore = false;
						}}
          ></epp-configuration-dialogs>`
					: nothing
			}
      <epp-dialog
				?open=${this._showUnsavedDialog}
				heading=${this._localize("dialogs.unsaved_changes")}
				@dialog-dismiss=${() => this._navGuard.cancelPendingNavigation()}
			>
				<p class="overlay-help">${this._localize("dialogs.unsaved_changes_body")}</p>
				<epp-button slot="actions" variant="text"
					@click=${() => this._navGuard.cancelPendingNavigation()}
				>${this._localize("common.cancel")}</epp-button>
				<epp-button slot="actions" variant="danger"
					@click=${() => this._navGuard.discardAndNavigate()}
				>${this._localize("common.discard")}</epp-button>
			</epp-dialog>
      <epp-dialog
				?open=${this._showDeleteCalibrationDialog}
				heading=${this._localize("dialogs.delete_calibration_title")}
				@dialog-dismiss=${() => {
					this._showDeleteCalibrationDialog = false;
				}}
			>
				<p class="overlay-help">${this._localize("dialogs.delete_calibration_body")}</p>
				<epp-button slot="actions" variant="text"
					@click=${() => {
						this._showDeleteCalibrationDialog = false;
					}}
				>${this._localize("common.cancel")}</epp-button>
				<epp-button slot="actions" variant="danger"
					@click=${this._deleteCalibration}
				>${this._localize("common.delete")}</epp-button>
			</epp-dialog>
    `;
	}

	// Host hook for FlasherController.confirmDeleteOriginalFirmware — shows
	// the themed delete-confirm dialog and resolves with the user's choice.
	private _requestFlasherDeleteConfirm(): Promise<boolean> {
		// Only one confirm can be pending; treat a stale one as cancelled so
		// its awaiting flow unwinds instead of hanging forever.
		this._flasherDeleteConfirmResolve?.(false);
		this._showFlasherDeleteConfirm = true;
		return new Promise<boolean>((resolve) => {
			this._flasherDeleteConfirmResolve = resolve;
		});
	}

	private _resolveFlasherDeleteConfirm(ok: boolean): void {
		this._showFlasherDeleteConfirm = false;
		this._flasherDeleteConfirmResolve?.(ok);
		this._flasherDeleteConfirmResolve = null;
	}

	private _renderFlasherDeleteConfirmDialog() {
		return html`
			<epp-dialog
				?open=${this._showFlasherDeleteConfirm}
				heading=${this._localize("flasher.confirm_delete_title")}
				@dialog-dismiss=${() => this._resolveFlasherDeleteConfirm(false)}
			>
				<p class="overlay-help">${this._localize("flasher.confirm_delete_message")}</p>
				<epp-button slot="actions" variant="text"
					@click=${() => this._resolveFlasherDeleteConfirm(false)}
				>${this._localize("common.cancel")}</epp-button>
				<epp-button slot="actions" variant="danger"
					@click=${() => this._resolveFlasherDeleteConfirm(true)}
				>${this._localize("common.delete")}</epp-button>
			</epp-dialog>
		`;
	}

	private _renderTabBar() {
		return html`
			<div class="tab-bar">
				${EPP_LOGO}
				<button class="tab ${this._panelTab === "config" ? "active" : ""}"
					@click=${() =>
						this._navGuard.guardNavigation(() => {
							void this._flasherCtrl.resetUsbState();
							this._panelTab = "config";
							this._loadDevices();
						})}>
					<ha-icon class="tab-icon" icon="mdi:cog-outline"></ha-icon>
					<span class="tab-label-full">${this._localize("tabs.device_configuration")}</span>
					<span class="tab-label-short">${this._localize("tabs.device_configuration_short")}</span>
				</button>
				<button class="tab ${this._panelTab === "flasher" ? "active" : ""}"
					@click=${() =>
						this._navGuard.guardNavigation(() => {
							void this._flasherCtrl.resetUsbState();
							this._panelTab = "flasher";
							if (this._flasherCtrl.loading) {
								this._flasherCtrl.hass = this.hass;
								this._flasherCtrl.subscribeDeviceList();
							}
						})}>
					<ha-icon class="tab-icon" icon="mdi:flash"></ha-icon>
					<span class="tab-label-full">${this._localize("tabs.flash_firmware")}</span>
					<span class="tab-label-short">${this._localize("tabs.flash_firmware_short")}</span>
				</button>
				<button class="tab ${this._panelTab === "device-groups" ? "active" : ""}"
					@click=${() =>
						this._navGuard.guardNavigation(() => {
							void this._flasherCtrl.resetUsbState();
							this._panelTab = "device-groups";
						})}>
					<ha-icon class="tab-icon" icon="mdi:devices"></ha-icon>
					<span class="tab-label-full">${this._localize("tabs.device_groups")}</span>
					<span class="tab-label-short">${this._localize("tabs.device_groups_short")}</span>
				</button>
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
		// Global dialogs (incl. the unsaved-changes guard dialog) render once,
		// unconditionally — every tab/status branch below early-returns its own
		// layout, so rendering the dialogs per-branch repeatedly dropped them on
		// some branches and left navigation blocked with no visible dialog.
		return html`${this._renderTabContent()}${this._renderGlobalDialogs()}`;
	}

	private _renderTabContent() {
		if (this._panelTab === "flasher") {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
					.flashableDevices=${this._flasherCtrl.flashableDevices}
					.loading=${this._flasherCtrl.loading}
					.localize=${this._localize}
					.usbFlashState=${this._flasherCtrl.usbFlashState}
					.wifiNetworks=${this._flasherCtrl.wifiNetworks}
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
						void this._flasherCtrl.handleUsbFlash(e.detail.variant);
					}}
					@usb-wifi-config=${() => {
						void this._flasherCtrl.handleUsbWifiConfig();
					}}
					@usb-retry=${() => {
						this._flasherCtrl.handleUsbRetry();
					}}
					@retry-ha-add=${() => {
						void this._flasherCtrl.handleRetryHaAdd();
					}}
					@flasher-cancel=${() => {
						void this._flasherCtrl.handleFlasherCancel();
					}}
					@wifi-scan=${() => {
						void this._flasherCtrl.handleWifiScan();
					}}
					@wifi-provision=${(e: CustomEvent) => {
						void this._flasherCtrl.handleWifiProvision(
							e.detail.ssid,
							e.detail.password,
						);
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
				></epp-flasher-view>
				${this._renderFlasherDeleteConfirmDialog()}
			</div>`;
		}

		if (this._panelTab === "device-groups") {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				${
					this._deviceGroupsCtrl
						? html`<epp-device-groups-view
								.hass=${this.hass}
								.controller=${this._deviceGroupsCtrl}
								.availableDevices=${this._devices}
								@form-dirty-changed=${(e: CustomEvent<{ dirty: boolean }>) => {
									this._dirty = e.detail.dirty;
								}}
							></epp-device-groups-view>`
						: html`<div class="panel">${this._localize("common.loading")}</div>`
				}
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
					<epp-button variant="primary" @click=${() =>
						this._navGuard.guardNavigation(() => {
							this._panelTab = "flasher";
							this._flasherCtrl.hass = this.hass;
							this._flasherCtrl.subscribeDeviceList();
						})}>
							${this._localize("flasher.flash_from_tab")}
					</epp-button>
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
            .sensorState=${this._getWizardSensorState()}
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
			</div>`;
		}

		if ((this._deviceCtrl.connectionFailed || isOffline) && !inSettingsEdit) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
			</div>`;
		}

		if (!protocolOk && !inSettingsEdit) {
			return html`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
			</div>`;
		}

		const content =
			this._view === "settings"
				? this._renderSettings(settingsStatusBanner)
				: this._view === "editor" && this._perspective
					? this._renderEditor()
					: this._renderLiveOverview();

		return html`<div class="tab-layout">${this._renderTabBar()}${this._renderControllerErrorBanner()}${content}</div>`;
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
		this._grid = new Uint8Array(GRID_CELL_COUNT);
		this._zoneConfigs = INITIAL_ZONE_SLOTS;
		this._furniture = [];
		// set_setup will disable zone_presence and target_xy — update local state
		this._entitiesConfig = {
			...this._entitiesConfig,
			zone_presence: false,
			target_xy: false,
		};
		// Reset auto distances to the canonical default maximums and persist
		// before clearing calibration, so _push_config_to_device sends the
		// correct values.
		if (this._targetAutoDistance) {
			this._targetMaxDistance = SETTINGS_DEFAULTS.target_max_distance;
		}
		if (this._staticAutoDistance) {
			this._staticMinDistance = SETTINGS_DEFAULTS.static_min_distance;
			this._staticMaxDistance = SETTINGS_DEFAULTS.static_max_distance;
		}
		// Clear calibration and layout on the backend
		try {
			if (this._targetAutoDistance || this._staticAutoDistance) {
				// Full payload from SETTINGS_FIELD_MAP via _buildSettingsPayload
				// (the distance resets above flow in through panel state) — a
				// hand-built field list here silently missed new settings.
				await this.hass.callWS({
					type: "eppgrid/set_settings",
					mac: this._selectedMac,
					...this._buildSettingsPayload(),
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
		this._navGuard.guardNavigation(() =>
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
						this._navGuard.guardNavigation(async () => {
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

	/**
	 * Dismissible banner for failed grid-controller operations (apply
	 * layout, save settings, save/load configuration). The op name set by
	 * the controller's onError hook selects the `errors.*` translation.
	 */
	private _renderControllerErrorBanner() {
		if (!this._controllerError) return nothing;
		return html`
			<div class="controller-error-banner" role="alert">
				<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
				<span>${this._localize(`errors.${this._controllerError}`)}</span>
				<button
					class="controller-error-dismiss"
					aria-label=${this._localize("common.close")}
					@click=${() => {
						this._controllerError = null;
					}}
				>
					<ha-icon icon="mdi:close"></ha-icon>
				</button>
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
						? html`<epp-button variant="primary"
						@click=${() => {
							this._panelTab = "flasher";
							if (this._flasherCtrl.loading) {
								this._flasherCtrl.hass = this.hass;
								this._flasherCtrl.subscribeDeviceList();
							}
						}}
					>${this._localize("protocol.update_firmware")}</epp-button>`
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
					<epp-button variant="primary"
						@click=${() => this._retryConnection()}
					>${this._localize("connection.retry")}</epp-button>
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
				<epp-button variant="primary"
					@click=${() => this._retryConnection()}
				>${this._localize("connection.retry")}</epp-button>
			</div>
		`;
	}

	private _retryConnection(): void {
		if (this._selectedMac) {
			this._ensureSession(this._selectedMac);
		}
	}

	private _renderLiveGrid() {
		// Pure render: last-in-room-position tracking for the pending-target
		// display lives in TargetController.handleTargetData (per data frame),
		// and the backend occupancy map is passed through by reference so
		// epp-grid's dirty-check only fires on real zone-state frames.
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
				.occupancy=${this._zoneState.occupancy}
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
			// Mirror the dismiss into the local zone engine so the editor
			// preview collapses the zone immediately — same semantics as the
			// firmware's dismiss_target service applied on-device below.
			this._targetCtrl.dismissTarget(targetIndex, idx);

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
		this._zoneEngineGridChanged();
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

	// Editor-only save bar: rendered exclusively from _renderEditor (the
	// settings view renders its own bar inside <epp-settings-view>), so the
	// handlers call the editor flows directly — the old per-view ternaries
	// were dead branches.
	private _renderSaveCancelButtons() {
		return renderSaveCancelBar({
			saving: this._saving,
			dirty: this._dirty,
			localize: this._localize,
			onSave: () => {
				// applyLayout traps its own failures (controller onError
				// banner); .catch guards a late rejection surfacing as
				// "Uncaught (in promise)".
				this._applyLayout().catch(() => {});
			},
			onCancel: () => {
				this._cancelEditor();
			},
		});
	}

	private _renderLiveOverview() {
		const gridContent = this._perspective
			? this._renderLiveGrid()
			: html`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${this._getWizardSensorState()}
            .localize=${this._localize}
            @start-calibration=${() => this._changePlacement()}
          ></epp-wizard>`;

		return html`
      <div class="panel" @click=${(e: MouseEvent) => {
				if (!(e.target instanceof Element)) return;
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
              <epp-kebab-menu
                .items=${this._liveMenuItems()}
                @item-select=${this._onLiveMenuSelect}
              ></epp-kebab-menu>
            </div>
            <div class="sidebar-scroll">
              <epp-live-sidebar
                .sensorState=${this._sensorState}
                .zoneState=${this._zoneState}
                .zoneConfigs=${this._namedZones()}
                .hasPerspective=${this._perspective != null}
                .localize=${this._localize}
                @view-change=${(e: CustomEvent) => {
									this._navGuard.guardNavigation(() =>
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
          .assistedClearEnabled=${this._assistedClearEnabled}
          .assistedClearTimeout=${this._assistedClearTimeout}
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
		// Editor occupancy preview comes from the local zone engine replica.
		// The engine ticks once per target frame (TargetController.
		// handleTargetData) and caches its result; renders read the cache so
		// pointermove-driven re-renders don't advance engine time. The lazy
		// fallback covers the first render before any frame has arrived.
		// IMPORTANT: this method must be a pure function of state — do NOT
		// mutate `_targets[i].status` or `_sensorState`. Build derived data
		// in local variables and route the children off those.
		const engineResult =
			this._targetCtrl.editorEngineResult ?? this._runLocalZoneEngine();
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

		// The <epp-grid> element is identical between the desktop and mobile
		// layouts — extract it once so both branches bind it verbatim. (The
		// `.grid-container` wrapper + its furniture-deselect @click are kept per
		// branch because their surrounding column differs.)
		const gridTemplate = html`
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
              ></epp-grid>`;

		// Furniture-deselect handler for the grid-container wrapper — clicking
		// off a furniture item clears the selection. Shared verbatim by both
		// branches' wrappers.
		const onGridContainerClick = (e: Event) => {
			// `<epp-sheet>` is never a descendant of `.grid-container` (mobile: a
			// sibling inside `.editor-mobile`; desktop: absent), so a sheet click
			// never reaches this handler — the active-zone-preserving exemption
			// lives in `onPanelClick`. This handler only clears furniture selection.
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
		};

		// activeZone-deselect handler for the .panel wrapper — clicking outside
		// the grid and sidebar deselects the active zone (unless we just
		// painted). Shared verbatim by both branches' panel wrappers.
		// We match `.grid-container` (the light-DOM wrapper around <epp-grid>),
		// NOT `.grid` (which lives in <epp-grid>'s shadow DOM): a grid-cell click
		// retargets to the <epp-grid> host at this panel-level handler, so a
		// `.grid` check is always null for grid taps and would wrongly deselect.
		const onPanelClick = (e: Event) => {
			const el = e.target as HTMLElement;
			if (
				!el.closest(".grid-container") &&
				!el.closest(".zone-sidebar") &&
				!el.closest("epp-sheet")
			) {
				if (!this._justPainted) this._activeZone = null;
			}
		};

		if (this._isMobile) {
			return html`
      <div class="panel" @click=${onPanelClick}>
        ${this._renderHeader()}
        <div class="editor-mobile">
          <div class="grid-container" @click=${onGridContainerClick}>
            ${gridTemplate}
          </div>
          <epp-sheet
            inline
            ?open=${this._editorSheetOpen}
            @sheet-open-changed=${(e: CustomEvent<{ open: boolean }>) => {
							this._editorSheetOpen = e.detail.open;
						}}
          >
            <div slot="peek">${this._renderSidebarTabs()}</div>
            ${this._renderSidebarContent()}
            ${this._dirty ? html`<div slot="actions">${this._renderSaveCancelButtons()}</div>` : nothing}
          </epp-sheet>
        </div>
      </div>
    `;
		}

		return html`
      <div class="panel" @click=${onPanelClick}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" @click=${onGridContainerClick}>
            ${gridTemplate}
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
            ${this._renderSidebarContent()}
            </div>
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `;
	}

	/**
	 * The `_sidebarTab`-conditional sidebar component block
	 * (zones/overlays/furniture). Extracted from `_renderEditor` so both the
	 * desktop sidebar and the mobile bottom-sheet body render it verbatim —
	 * the bindings are unchanged from the original inline markup.
	 */
	private _renderSidebarContent() {
		return this._sidebarTab === "zones"
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
											// Engine input changed → firmware set_zones reset.
											this._zoneEngineZoneConfigChanged();
										}}
                    @zone0-change=${(e: CustomEvent<Partial<Zone0Config>>) => {
											const current = this._zoneConfigs[0];
											const next = [...this._zoneConfigs];
											next[0] = { ...current, ...e.detail };
											this._zoneConfigs = next as unknown as ZoneSlots;
											this._dirty = true;
											// Engine input changed → firmware set_zones reset.
											this._zoneEngineZoneConfigChanged();
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
                  ></epp-furniture-sidebar>`;
	}

	/**
	 * Editor sidebar-tab switcher (zones / overlays / furniture). The desktop
	 * editor has no inline switcher — the sub-tab is chosen from the live
	 * overview's kebab on the way into the editor — so this is the switcher the
	 * mobile bottom-sheet peek needs to let the user change sub-tab without
	 * leaving the editor. It writes `_sidebarTab` via the existing `_applyView`
	 * path (same state-write the kebab uses), keeping `_overlayMode` in sync.
	 * Rendered in the sheet peek only (mobile); always shown there so the bar
	 * is consistent regardless of which sub-tab is active.
	 */
	private _renderSidebarTabs() {
		const tabs: { id: SidebarTab; label: string }[] = [
			{ id: "zones", label: this._localize("menu.detection_zones") },
			{ id: "overlays", label: this._localize("menu.overlays") },
			{ id: "furniture", label: this._localize("menu.furniture") },
		];
		return html`
      <div class="sidebar-tabs" role="tablist">
        ${tabs.map(
					(t) => html`<button
            class="sidebar-tab ${this._sidebarTab === t.id ? "active" : ""}"
            role="tab"
            aria-selected=${this._sidebarTab === t.id ? "true" : "false"}
            @click=${(e: Event) => {
							// Stop the click bubbling to epp-sheet's handle-bar (which
							// would toggle the sheet open/closed on tab-switch).
							e.stopPropagation();
							this._applyView({ view: "editor", sidebarTab: t.id });
						}}
          >${t.label}</button>`,
				)}
      </div>
    `;
	}

	/** Run local zone engine replica — delegated to TargetController. */
	private _runLocalZoneEngine(): ZoneEngineResult {
		return this._targetCtrl.runLocalZoneEngine();
	}

	/**
	 * Zone-engine reset hooks (PanelHost contract). Called whenever a grid /
	 * zone-config edit is applied so the local engine mirrors the firmware's
	 * set_grid / set_zones resets. Not `private`: part of the PanelHost
	 * structural interface used by GridStateController.
	 */
	_zoneEngineGridChanged(): void {
		this._targetCtrl.resetEngineForGridChange();
		// Symmetry with the engine's dismissedCells reset — drop the UI
		// hide-map so a grid change can't keep hiding a target on a cell
		// index that no longer maps to the same physical location.
		this._dismissedTargets = new Map();
	}

	_zoneEngineZoneConfigChanged(): void {
		this._targetCtrl.resetEngineForZoneConfigChange();
		this._dismissedTargets = new Map();
	}

	/**
	 * Shared renderer for the two collapsible debug-log sections (frontend
	 * zone-engine log in the editor, backend log on the live overview) —
	 * previously two ~70-line near-identical templates that only differed in
	 * which state fields and scroll container they target. The log lines
	 * themselves are appended imperatively by TargetController (see
	 * _appendToLogContainer); this template only renders the chrome and the
	 * waiting-for-events placeholder.
	 */
	private _renderDebugLogSection(
		showField: "_showDebugLog" | "_showBackendDebugLog",
		linesField: "_debugLogLines" | "_backendDebugLogLines",
		prevField: "_debugLogPrev" | "_backendDebugLogPrev",
		containerId: string,
	) {
		const show = this[showField];
		return html`
      <div style="margin-top: 8px; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            class="live-section-header live-section-link"
            style="font-size: 12px; gap: 4px; min-width: 0; overflow: hidden;"
            @click=${() => {
							this[showField] = !this[showField];
							if (!this[showField]) {
								this[linesField] = [];
								this[prevField] = null;
							}
						}}
          >
            <ha-icon icon=${show ? "mdi:chevron-down" : "mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
            ${this._localize("live.debug.detection_events")}
          </button>
          ${
						show
							? html`
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button
                class="debug-log-btn"
                @click=${() => {
									navigator.clipboard
										.writeText(this[linesField].join("\n"))
										.catch((err) =>
											console.warn("Clipboard write failed", err),
										);
								}}
              >${this._localize("live.debug.copy_all")}</button>
              <button
                class="debug-log-btn"
                @click=${() => {
									this[linesField] = [];
									this[prevField] = null;
									const el = this.shadowRoot?.getElementById(containerId);
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
					show
						? html`
          <div class="debug-log-container" id=${containerId}>
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `
						: nothing
				}
      </div>
    `;
	}

	private _renderBackendDebugLog() {
		return this._renderDebugLogSection(
			"_showBackendDebugLog",
			"_backendDebugLogLines",
			"_backendDebugLogPrev",
			"backend-debug-log-scroll",
		);
	}

	private _renderDebugLog() {
		return this._renderDebugLogSection(
			"_showDebugLog",
			"_debugLogLines",
			"_debugLogPrev",
			"debug-log-scroll",
		);
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
