import { css, html, LitElement, nothing } from "lit";
import { state } from "lit/decorators.js";
import "./components/epp-grid.js";
import "./components/epp-live-sidebar.js";
import "./ui/epp-toggle.js";
import "./ui/epp-tooltip.js";
import { DeviceSubscription } from "./card/device-subscription.js";
import { subscribeHeatmap } from "./card/heatmap-store.js";
import {
	type OverviewState,
	subscribeOverview,
} from "./card/overview-store.js";
import { TemplateField } from "./card/template-subscription.js";
import type { SensorState } from "./components/epp-live-sidebar.js";
import { parseConfig } from "./lib/config-serialization.js";
import { isRgbTriple } from "./lib/furniture-contrast.js";
import { MAX_RANGE } from "./lib/grid.js";
import {
	persistCardHeatmapEnabled,
	readCardHeatmapEnabled,
} from "./lib/storage.js";
import { createTrails, updateTrails } from "./lib/target-trails.js";
import {
	checkForNewBundle,
	parseBundleHash,
	safeSessionStorage,
} from "./lib/version-check.js";
import { defaultLocalize, type LocalizeFn, setupLocalize } from "./localize.js";
import { tokens } from "./ui/tokens.js";

// Content hash of the running card bundle, read from its own content-hashed URL
// (`/eppgrid_static/<hash>/eppgrid-card.js`). Compared against the server's
// current card hash so an open dashboard card reloads itself after an upgrade.
// null when the URL isn't the hashed bundle path (e.g. in tests) — the check
// then no-ops. The card is a separate bundle from the panel (its own hash), and
// they share the SPA's sessionStorage, so it uses its own loop-guard key.
const CARD_CURRENT_BUNDLE_HASH = parseBundleHash(import.meta.url);
const CARD_RELOAD_GUARD_KEY = "eppgrid_reload_for_card_hash";
// How long to wait before re-checking the served bundle when the integration
// hasn't answered yet (still starting up after an upgrade+restart).
const BUNDLE_CHECK_RETRY_MS = 2000;

type EnvKey = "temperature" | "humidity" | "illuminance" | "co2";
type PresenceKey =
	| "occupancy"
	| "static_presence"
	| "motion_presence"
	| "target_presence"
	| "mmwave";

export type HeatmapMode = "off" | "on" | "toggle";

/**
 * Normalize the config's `show_heatmap` (boolean for backward compat, or a mode
 * string going forward) to a `HeatmapMode`. Legacy `true` → "on"; `false`,
 * `undefined`, and anything unexpected → "off".
 */
export function normalizeHeatmapMode(
	v: boolean | HeatmapMode | undefined,
): HeatmapMode {
	if (v === true || v === "on") return "on";
	if (v === "toggle") return "toggle";
	return "off";
}

export interface EppGridCardConfig {
	type: string;
	device_id: string;
	primary?: string;
	secondary?: string;
	show_map?: boolean;
	show_sensors?: boolean;
	show_grid?: boolean;
	/** Custom fill for the unpainted rest-of-room area, as an [r, g, b] triple. */
	room_color?: [number, number, number];
	/** URL of the floor-plan background image (uploaded serve URL or any user URL). */
	floor_plan?: string;
	/** Floor-plan opacity, 0–100 (%). */
	floor_plan_opacity?: number;
	layout?: "horizontal" | "vertical";
	sensors?: {
		presence?: Partial<Record<PresenceKey, boolean>>;
		zones?: boolean;
		environmental?: Partial<Record<EnvKey, boolean>>;
	};
	show_furniture?: boolean;
	show_overlays?: boolean;
	show_heatmap?: boolean | HeatmapMode;
	/**
	 * HA-managed keys the card itself never reads but must preserve through the
	 * editor round-trip (see `EppGridCardEditor._valueChanged`): `grid_options`
	 * holds the width/height the user set by resizing the card in a Sections
	 * dashboard; `visibility`/`view_layout` drive conditional display and legacy
	 * layout. Declared so a future field-by-field config rebuild can't silently
	 * drop them.
	 */
	grid_options?: {
		columns?: number | "full";
		rows?: number | "auto";
		min_columns?: number;
		max_columns?: number;
		min_rows?: number;
		max_rows?: number;
	};
	visibility?: unknown;
	view_layout?: unknown;
}

type ResolvedCardConfig = Omit<EppGridCardConfig, "sensors"> & {
	show_map: boolean;
	show_sensors: boolean;
	show_grid: boolean;
	room_color?: [number, number, number];
	floor_plan?: string;
	floor_plan_opacity: number;
	layout: "horizontal" | "vertical";
	show_furniture: boolean;
	show_overlays: boolean;
	show_heatmap: HeatmapMode;
	primary: string;
	secondary: string;
	sensors: {
		presence: Record<PresenceKey, boolean>;
		zones: boolean;
		environmental: Record<EnvKey, boolean>;
	};
};

/**
 * An [r, g, b] config triple → a CSS `rgb()` string, or undefined when unset or
 * malformed. Hand-written YAML can supply a bad value the TS type doesn't
 * enforce; a malformed triple degrades to undefined (the default room colour)
 * rather than emitting invalid CSS like `rgb(10, 20, undefined)`.
 */
export function rgbCss(
	rgb: [number, number, number] | undefined,
): string | undefined {
	if (!isRgbTriple(rgb)) {
		return undefined;
	}
	return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Clamp a config opacity (0–100) to range; undefined/NaN → 100 (fully opaque). */
export function clampOpacity(v: number | undefined): number {
	if (typeof v !== "number" || Number.isNaN(v)) return 100;
	return Math.max(0, Math.min(100, v));
}

export function applyCardDefaults(
	config: Partial<EppGridCardConfig>,
): ResolvedCardConfig {
	const fromSrc = <K extends string>(
		src: Partial<Record<K, boolean>> | undefined,
		key: K,
	): boolean => (src ? src[key] === true : true);
	const sensors = config.sensors ?? {};
	const envSrc = sensors.environmental;
	const presSrc = sensors.presence;
	return {
		type: config.type ?? "custom:eppgrid-card",
		device_id: config.device_id ?? "",
		primary: config.primary ?? "",
		secondary: config.secondary ?? "",
		show_map: config.show_map !== false,
		show_sensors: config.show_sensors !== false,
		show_grid: config.show_grid !== false,
		room_color: config.room_color,
		floor_plan: config.floor_plan,
		floor_plan_opacity: clampOpacity(config.floor_plan_opacity),
		layout: config.layout ?? "vertical",
		show_furniture: config.show_furniture !== false,
		show_overlays: config.show_overlays !== false,
		show_heatmap: normalizeHeatmapMode(config.show_heatmap),
		sensors: {
			presence: {
				// presence absent entirely → all on; presence present → only keys explicitly true
				occupancy: fromSrc(presSrc, "occupancy"),
				static_presence: fromSrc(presSrc, "static_presence"),
				motion_presence: fromSrc(presSrc, "motion_presence"),
				target_presence: fromSrc(presSrc, "target_presence"),
				mmwave: fromSrc(presSrc, "mmwave"),
			},
			zones: sensors.zones !== false,
			environmental: {
				// env absent entirely → all on; env present → only keys explicitly true
				temperature: fromSrc(envSrc, "temperature"),
				humidity: fromSrc(envSrc, "humidity"),
				illuminance: fromSrc(envSrc, "illuminance"),
				co2: fromSrc(envSrc, "co2"),
			},
		},
	};
}

const EMPTY_SENSORS: SensorState = {
	occupancy: false,
	static_presence: false,
	motion_presence: false,
	target_presence: false,
	mmwave: false,
	illuminance: null,
	temperature: null,
	humidity: null,
	co2: null,
};
const EMPTY_ZONES = { occupancy: {}, target_counts: {}, frame_count: 0 };

export class EppGridCard extends LitElement {
	static styles = [
		tokens,
		css`
			:host {
				display: block;
				container-type: inline-size;
				--epp-card-sensors-width: 240px;
			}
			.card-header {
				padding: var(--epp-space-3) var(--epp-space-3) 0;
			}
			.card-primary {
				font-size: var(--epp-font-lg);
				font-weight: var(--epp-weight-semibold);
				color: var(--epp-text);
			}
			.card-secondary {
				font-size: var(--epp-font-sm);
				color: var(--epp-text-muted);
				margin-top: var(--epp-space-1);
			}
			.overview {
				display: flex;
				gap: var(--epp-space-3);
			}
			.overview--vertical,
			.overview--single {
				flex-direction: column;
			}
			.overview--horizontal {
				flex-direction: row;
				align-items: flex-start;
			}
			.overview--horizontal .map {
				flex: 1 1 auto;
				min-width: 0;
			}
			.overview--horizontal .sensors {
				flex: 0 0 var(--epp-card-sensors-width);
			}
			.map {
				position: relative;
			}
			.heatmap-overlay {
				position: absolute;
				right: var(--epp-space-2);
				bottom: var(--epp-space-2);
				display: inline-flex;
				align-items: center;
				padding: var(--epp-space-1) var(--epp-space-2);
				background: var(--epp-surface);
				border: 1px solid var(--epp-border);
				border-radius: var(--epp-radius-pill);
			}
			.content {
				padding: var(--epp-space-3);
			}
			.placeholder {
				padding: var(--epp-space-5);
				color: var(--epp-text-muted);
				text-align: center;
			}
			.offline {
				font-size: var(--epp-font-xs);
				color: var(--epp-warning);
				padding: 0 var(--epp-space-3) var(--epp-space-2);
			}
			@container (max-width: 500px) {
				/* Stack the two parts. align-items:stretch (overriding the row
				   layout's flex-start) is essential: it gives the map a definite
				   full width so the aspect-locked epp-grid fits the card instead of
				   sizing off its height path and overflowing/collapsing. flex is
				   reset to content-height so neither part grows along the column. */
				.overview--horizontal {
					flex-direction: column;
					align-items: stretch;
				}
				.overview--horizontal .map,
				.overview--horizontal .sensors {
					flex: 0 0 auto;
				}
			}
		`,
	];

	@state() private _config?: EppGridCardConfig;
	@state() private _data: OverviewState = {
		snapshot: null,
		data: null,
		available: true,
		connected: false,
	};

	private __hass?: { connection: unknown; locale?: { language?: string } };
	private _localize: LocalizeFn = defaultLocalize;

	// Stale-bundle self-reload (mirrors the panel; see lib/version-check.ts).
	// Overridable in tests. Defaults read the running card bundle's own hash and
	// reload the whole dashboard.
	private _currentBundleHash: string | null = CARD_CURRENT_BUNDLE_HASH;
	private _reloadPage: () => void = () => location.reload();
	// Armed on mount and re-armed on each reconnect (connection swap); stays set
	// until a version check gets a definitive answer.
	private _bundleCheckPending = true;
	private _bundleCheckInFlight = false;
	// While the integration is still coming up (its WS command isn't registered
	// yet, or the hash isn't stored), the check can't resolve. Retry on a timer
	// rather than off `set hass` — that setter fires on every state update, so
	// hanging retries on it would spam `frontend_version` on a busy dashboard,
	// multiplied by every card. Overridable interval for tests.
	private _bundleRetryTimer?: ReturnType<typeof setTimeout>;
	private _bundleRetryMs = BUNDLE_CHECK_RETRY_MS;

	private _heatmapCells: number[] = [];
	private _targetTrails = createTrails();

	// Viewer's runtime heatmap choice, used only in "toggle" mode. Seeded from
	// (and persisted to) a card-only per-device localStorage key in setConfig /
	// the toggle handler. Irrelevant in "on"/"off" mode.
	@state() private _heatmapOn = false;

	private _overviewSub = new DeviceSubscription<OverviewState>({
		getHass: () => this.__hass,
		getDeviceId: () => this._config?.device_id,
		subscribeFn: subscribeOverview,
		onResubscribe: () => {
			this._targetTrails = createTrails();
			// A reconnect (connection swap after an upgrade+restart) bumps the
			// served card hash — re-arm so we re-verify once the stream is back.
			this._bundleCheckPending = true;
			void this._maybeCheckForNewBundle();
		},
		onData: (s) => {
			if (s.snapshot !== this._lastSnapshot) {
				this._lastSnapshot = s.snapshot;
				this._parsedSnapshot = s.snapshot ? parseConfig(s.snapshot) : null;
			}
			this._data = s;
			updateTrails(this._targetTrails, (s.data?.targets ?? []) as never);
			this.requestUpdate();
		},
	});

	private _heatmapSub = new DeviceSubscription<number[]>({
		getHass: () => this.__hass,
		getDeviceId: () => this._config?.device_id,
		enabled: () => this._heatmapVisible() && this._resolved?.show_map === true,
		subscribeFn: subscribeHeatmap,
		onData: (cells) => {
			this._heatmapCells = cells;
			this.requestUpdate();
		},
	});

	private _resolved?: ResolvedCardConfig;
	private _presenceKeys: PresenceKey[] | null = null;
	private _envKeys: EnvKey[] | null = null;
	private _parsedSnapshot: ReturnType<typeof parseConfig> | null = null;
	private _lastSnapshot: unknown = undefined;

	private _primaryField = new TemplateField(() => this.requestUpdate());
	private _secondaryField = new TemplateField(() => this.requestUpdate());

	setConfig(config: EppGridCardConfig): void {
		this._config = config;
		this._resolved = applyCardDefaults(config);
		// Seed the runtime heatmap switch from the card-only per-device
		// preference (only meaningful in "toggle" mode; default off).
		this._heatmapOn =
			this._resolved.show_heatmap === "toggle" && config.device_id
				? readCardHeatmapEnabled(config.device_id)
				: false;
		const rawPres = config?.sensors?.presence;
		this._presenceKeys = rawPres
			? (Object.keys(rawPres).filter(
					(k) => rawPres[k as PresenceKey],
				) as PresenceKey[])
			: null;
		const rawEnv = config?.sensors?.environmental;
		this._envKeys = rawEnv
			? (Object.keys(rawEnv).filter((k) => rawEnv[k as EnvKey]) as EnvKey[])
			: null;
		this._maybeResubscribe();
		this._updateTemplates();
	}

	set hass(hass: { connection: unknown; locale?: { language?: string } }) {
		this.__hass = hass;
		this._localize = setupLocalize(hass);
		this._maybeResubscribe();
		this._updateTemplates();
		this.requestUpdate();
		// No bundle check here: `set hass` fires on every state update. The check
		// runs from connectedCallback / onResubscribe and self-schedules its own
		// retry (see _maybeCheckForNewBundle).
	}

	get hass():
		| { connection: unknown; locale?: { language?: string } }
		| undefined {
		return this.__hass;
	}

	connectedCallback(): void {
		super.connectedCallback();
		this._maybeResubscribe();
		void this._maybeCheckForNewBundle();
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._clearBundleRetry();
		this._overviewSub.dispose();
		this._heatmapSub.dispose();
		this._primaryField.dispose();
		this._secondaryField.dispose();
	}

	private _maybeResubscribe(): void {
		this._overviewSub.ensure();
		this._heatmapSub.ensure();
	}

	/**
	 * Reload the dashboard once the served card bundle is newer than the one this
	 * card is running (an upgrade the open tab never re-fetched — a custom
	 * element can't be redefined for the page's lifetime). Runs from
	 * connectedCallback and on reconnect (onResubscribe re-arms it), so unlike
	 * the panel it also checks on the initial mount and a stale tab that
	 * navigates to the dashboard self-corrects; the loop guard keeps that to one
	 * reload per server hash. When the integration hasn't answered yet the check
	 * schedules a timed retry (never off the hot `set hass` path). The card is a
	 * separate bundle from the panel, so it compares its own hash against the
	 * server's `card_hash` (not the panel `hash`). Fail-open: any WS/network
	 * error leaves the page as-is (checkForNewBundle swallows it).
	 */
	private async _maybeCheckForNewBundle(): Promise<void> {
		if (!this._bundleCheckPending || this._bundleCheckInFlight) return;
		this._bundleCheckInFlight = true;
		try {
			const resolved = await checkForNewBundle({
				currentHash: this._currentBundleHash,
				fetchServerHash: async () => {
					const hass = this.__hass as
						| {
								callWS?: (
									msg: unknown,
								) => Promise<{ card_hash?: string | null }>;
						  }
						| undefined;
					const res = await hass?.callWS?.({
						type: "eppgrid/frontend_version",
					});
					return res?.card_hash ?? null;
				},
				reload: this._reloadPage,
				storage: safeSessionStorage(),
				guardKey: CARD_RELOAD_GUARD_KEY,
			});
			if (resolved) {
				this._bundleCheckPending = false;
				this._clearBundleRetry();
			} else {
				// Backend still coming up — poll on a timer, not on hass updates.
				this._scheduleBundleRetry();
			}
		} finally {
			this._bundleCheckInFlight = false;
		}
	}

	private _scheduleBundleRetry(): void {
		// One timer at a time; don't pin a detached card in memory.
		if (this._bundleRetryTimer !== undefined || !this.isConnected) return;
		this._bundleRetryTimer = setTimeout(() => {
			this._bundleRetryTimer = undefined;
			void this._maybeCheckForNewBundle();
		}, this._bundleRetryMs);
	}

	private _clearBundleRetry(): void {
		if (this._bundleRetryTimer !== undefined) {
			clearTimeout(this._bundleRetryTimer);
			this._bundleRetryTimer = undefined;
		}
	}

	private _updateTemplates(): void {
		if (!this._resolved) return;
		const vars = { config: this._config };
		this._primaryField.update(this.__hass, this._resolved.primary, vars);
		this._secondaryField.update(this.__hass, this._resolved.secondary, vars);
	}

	getCardSize(): number {
		const cfg = this._resolved ?? applyCardDefaults(this._config ?? {});
		const showMap = cfg.show_map;
		const showSensors = cfg.show_sensors;
		let size = 1;
		if (showMap) size += 6;
		if (showSensors && !showMap) size += 4;
		return size;
	}

	getGridOptions(): { columns: number; rows: string; min_columns: number } {
		const cfg = this._resolved ?? applyCardDefaults(this._config ?? {});
		const showMap = cfg.show_map;
		const showSensors = cfg.show_sensors;
		if (showMap && showSensors)
			return { columns: 12, rows: "auto", min_columns: 6 };
		if (showMap) return { columns: 8, rows: "auto", min_columns: 6 };
		return { columns: 6, rows: "auto", min_columns: 4 };
	}

	static getConfigElement(): HTMLElement {
		return document.createElement("eppgrid-card-editor");
	}

	static getStubConfig(): Partial<EppGridCardConfig> {
		// New cards default to "map only": sensors off. Set here (not in
		// applyCardDefaults) so this only affects freshly-added cards — existing
		// cards that omit show_sensors keep the sensors-on default on upgrade.
		return { device_id: "", show_sensors: false };
	}

	render() {
		if (!this._config || !this._resolved) return nothing;
		const cfg = this._resolved;
		const primary = this._primaryField.text;
		const secondary = this._secondaryField.text;
		const header =
			primary || secondary
				? html`<div class="card-header">
						${primary ? html`<div class="card-primary">${primary}</div>` : nothing}
						${secondary ? html`<div class="card-secondary">${secondary}</div>` : nothing}
					</div>`
				: nothing;
		if (!cfg.device_id) {
			return html`<ha-card>${header}<div class="placeholder">${this._localize("card.no_device")}</div></ha-card>`;
		}
		if (!cfg.show_map && !cfg.show_sensors) {
			return html`<ha-card>${header}<div class="placeholder">${this._localize("card.nothing_to_show")}</div></ha-card>`;
		}
		const both = cfg.show_map && cfg.show_sensors;
		const layout = both ? cfg.layout : "single";

		return html`
			<ha-card>
				${header}
				${
					this._data.available === false
						? html`<div class="offline">${this._localize("card.offline")}</div>`
						: nothing
				}
				<div class="content">
					<div class="overview overview--${layout}">
						${cfg.show_map ? html`<div class="map">${this._renderMap(cfg)}</div>` : nothing}
						${cfg.show_sensors ? html`<div class="sensors">${this._renderSensors(cfg)}</div>` : nothing}
					</div>
				</div>
			</ha-card>
		`;
	}

	/**
	 * Effective "is the heatmap being shown right now" — the single boolean that
	 * gates the subscription and the render. "on" is always visible; "toggle"
	 * follows the viewer's runtime switch; "off" is never visible.
	 */
	private _heatmapVisible(): boolean {
		const cfg = this._resolved;
		return (
			cfg != null &&
			(cfg.show_heatmap === "on" ||
				(cfg.show_heatmap === "toggle" && this._heatmapOn))
		);
	}

	private _onHeatmapToggle = (e: CustomEvent<{ value: boolean }>): void => {
		this._heatmapOn = e.detail.value;
		const id = this._config?.device_id;
		if (id) persistCardHeatmapEnabled(id, this._heatmapOn);
		// Re-evaluate the subscription gate so the stream opens/closes on demand.
		this._heatmapSub.ensure();
	};

	// Bare switch overlaid bottom-right of the map (no visible label — the
	// epp-toggle primitive omits the label span when empty). The switch's
	// accessible name is supplied via controlLabel (an aria-label on the
	// control); epp-tooltip adds the visible hover hint (design system forbids
	// raw title=). The positioned `.heatmap-overlay` wrapper is a plain div in
	// this card's own shadow tree, so its `position: absolute` never depends on
	// cross-shadow-boundary cascade order against epp-tooltip's own `:host` rule.
	private _renderHeatmapToggle() {
		const label = this._localize("card.heatmap_toggle");
		return html`<div class="heatmap-overlay">
			<epp-tooltip content=${label}>
				<epp-toggle
					.controlLabel=${label}
					.checked=${this._heatmapOn}
					@value-changed=${this._onHeatmapToggle}
				></epp-toggle>
			</epp-tooltip>
		</div>`;
	}

	private _renderMap(cfg: ResolvedCardConfig) {
		if (this._data.snapshot == null) {
			return html`<div class="placeholder">${this._localize("card.loading")}</div>`;
		}
		const parsed = this._parsedSnapshot;
		if (!parsed || parsed.calibration.perspective == null) {
			return html`<div class="placeholder">${this._localize("card.uncalibrated")}</div>`;
		}
		const data = this._data.data;
		const maxRange = parsed.settings.targetAutoDistance
			? MAX_RANGE
			: Math.round(parsed.settings.targetMaxDistance * 1000);
		// maxGridPx=480: map is aspect-locked and width-fit; a height:100% fill chain caused scroll-driven resize oscillation
		const heatmapVisible = this._heatmapVisible();
		return html`
			<epp-grid
				.grid=${parsed.grid}
				.zoneConfigs=${parsed.zoneConfigs}
				.targets=${(data?.targets ?? []) as never}
				.roomWidth=${parsed.calibration.roomWidth}
				.roomDepth=${parsed.calibration.roomDepth}
				.perspective=${parsed.calibration.perspective}
				.furniture=${cfg.show_furniture ? parsed.furniture : []}
				.occupancy=${data?.zones?.occupancy ?? {}}
				.localize=${this._localize}
				.maxRangeMm=${maxRange}
				.maxGridPx=${480}
				.showOverlays=${cfg.show_overlays}
				.showDimensions=${false}
				.showSignal=${false}
				.plain=${!!cfg.floor_plan || !cfg.show_grid}
				.roomColor=${rgbCss(cfg.room_color)}
				.floorPlan=${cfg.floor_plan}
				.floorPlanOpacity=${cfg.floor_plan_opacity / 100}
				.fill=${true}
				.fadeUncovered=${true}
				.heatmapCells=${heatmapVisible ? this._heatmapCells : []}
				.trails=${heatmapVisible ? this._targetTrails : []}
				?showHeatmap=${heatmapVisible}
			></epp-grid>
			${cfg.show_heatmap === "toggle" ? this._renderHeatmapToggle() : nothing}
		`;
	}

	private _renderSensors(cfg: ResolvedCardConfig) {
		const parsed = this._parsedSnapshot;
		const data = this._data.data;
		const s = cfg.sensors;
		return html`
			<epp-live-sidebar
				.sensorState=${data?.sensors ?? EMPTY_SENSORS}
				.zoneState=${data?.zones ?? EMPTY_ZONES}
				.zoneConfigs=${parsed?.zoneConfigs ?? []}
				.hasPerspective=${parsed?.calibration.perspective != null}
				.localize=${this._localize}
				.presenceKeys=${this._presenceKeys}
				.showZones=${s.zones}
				.envKeys=${this._envKeys}
				.interactive=${false}
				.showInfoTips=${false}
			></epp-live-sidebar>
		`;
	}
}

if (!customElements.get("eppgrid-card")) {
	customElements.define("eppgrid-card", EppGridCard);
}

// --- Entity suggestion (HA 2026.6+) ---
// getEntitySuggestion is synchronous, but EPP devices can only be identified
// authoritatively via the backend device list, so we lazily cache it; the
// picker can be reopened if the first open predates the cache.

let _eppDeviceIds: Set<string> | null = null;
let _eppDeviceIdsLoading = false;

function _ensureEppDeviceIds(hass: {
	callWS?: (msg: unknown) => Promise<unknown>;
}): void {
	if (_eppDeviceIds !== null || _eppDeviceIdsLoading || !hass?.callWS) return;
	_eppDeviceIdsLoading = true;
	hass
		.callWS({ type: "eppgrid/overview/list_devices" })
		.then((list) => {
			_eppDeviceIds = new Set(
				((list as { device_id: string }[]) ?? []).map((d) => d.device_id),
			);
		})
		.catch(() => {
			_eppDeviceIds = new Set();
		})
		.finally(() => {
			_eppDeviceIdsLoading = false;
		});
}

/** Suggest the card when the picked entity belongs to a known EPP device. */
export function getEntitySuggestion(
	hass: {
		callWS?: (msg: unknown) => Promise<unknown>;
		entities?: Record<string, { device_id?: string }>;
	},
	entityId: string,
): { config: { type: string; device_id: string } } | null {
	_ensureEppDeviceIds(hass); // warms the cache; first call may return null until it resolves
	const deviceId = hass?.entities?.[entityId]?.device_id;
	if (!deviceId || _eppDeviceIds === null || !_eppDeviceIds.has(deviceId)) {
		return null;
	}
	return { config: { type: "custom:eppgrid-card", device_id: deviceId } };
}

// Test-only: reset the module cache between tests.
export function __resetEntitySuggestionCache(): void {
	_eppDeviceIds = null;
	_eppDeviceIdsLoading = false;
}

interface CustomCardEntry {
	type: string;
	name: string;
	description: string;
	preview: boolean;
	getEntitySuggestion?: typeof getEntitySuggestion;
}
const w = window as unknown as { customCards?: CustomCardEntry[] };
w.customCards = w.customCards || [];
if (!w.customCards.some((c) => c.type === "eppgrid-card")) {
	w.customCards.push({
		type: "eppgrid-card",
		name: "Everything Presence Pro Grid",
		description:
			"Live overview map and sensors for an Everything Presence Pro Grid device.",
		preview: true,
		getEntitySuggestion,
	});
}
