import { css, html, LitElement, nothing } from "lit";
import { state } from "lit/decorators.js";
import "./components/epp-grid.js";
import "./components/epp-live-sidebar.js";
import {
	type OverviewState,
	subscribeOverview,
} from "./card/overview-store.js";
import { TemplateField } from "./card/template-subscription.js";
import type { SensorState } from "./components/epp-live-sidebar.js";
import { parseConfig } from "./lib/config-serialization.js";
import { isRgbTriple } from "./lib/furniture-contrast.js";
import { MAX_RANGE } from "./lib/grid.js";
import { defaultLocalize, type LocalizeFn, setupLocalize } from "./localize.js";
import { tokens } from "./ui/tokens.js";

type EnvKey = "temperature" | "humidity" | "illuminance" | "co2";
type PresenceKey =
	| "occupancy"
	| "static_presence"
	| "motion_presence"
	| "target_presence"
	| "mmwave";

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
	layout?: "horizontal" | "vertical";
	sensors?: {
		presence?: Partial<Record<PresenceKey, boolean>>;
		zones?: boolean;
		environmental?: Partial<Record<EnvKey, boolean>>;
	};
	show_furniture?: boolean;
	show_overlays?: boolean;
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
	layout: "horizontal" | "vertical";
	show_furniture: boolean;
	show_overlays: boolean;
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
		layout: config.layout ?? "vertical",
		show_furniture: config.show_furniture !== false,
		show_overlays: config.show_overlays !== false,
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
	private _unsub: (() => void) | null = null;
	private _subConn: unknown = null;
	private _subDevice: string | null = null;

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
	}

	get hass():
		| { connection: unknown; locale?: { language?: string } }
		| undefined {
		return this.__hass;
	}

	connectedCallback(): void {
		super.connectedCallback();
		this._maybeResubscribe();
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._unsub?.();
		this._unsub = null;
		this._subConn = null;
		this._subDevice = null;
		this._primaryField.dispose();
		this._secondaryField.dispose();
	}

	private _maybeResubscribe(): void {
		const hass = this.__hass;
		const deviceId = this._config?.device_id;
		if (!hass || !deviceId) {
			this._unsub?.();
			this._unsub = null;
			this._subConn = null;
			this._subDevice = null;
			return;
		}
		if (
			this._unsub &&
			this._subConn === hass.connection &&
			this._subDevice === deviceId
		) {
			return;
		}
		this._unsub?.();
		this._subConn = hass.connection;
		this._subDevice = deviceId;
		this._unsub = subscribeOverview(hass, deviceId, (s) => {
			if (s.snapshot !== this._lastSnapshot) {
				this._lastSnapshot = s.snapshot;
				this._parsedSnapshot = s.snapshot ? parseConfig(s.snapshot) : null;
			}
			this._data = s;
			this.requestUpdate();
		});
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
		return { device_id: "" };
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
				.plain=${!cfg.show_grid}
				.roomColor=${rgbCss(cfg.room_color)}
				.roomColorRgb=${cfg.room_color}
				.fill=${true}
			></epp-grid>
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
		name: "Everything Presence Pro Grid (Beta)",
		description:
			"Live overview map and sensors for an Everything Presence Pro Grid device.",
		preview: true,
		getEntitySuggestion,
	});
}
