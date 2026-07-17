import { css, html, LitElement, nothing } from "lit";
import { state } from "lit/decorators.js";
import {
	applyCardDefaults,
	clampOpacity,
	type EppGridCardConfig,
} from "./eppgrid-card.js";
import { defaultLocalize, type LocalizeFn, setupLocalize } from "./localize.js";
import "./ui/epp-field.js";

interface DeviceOption {
	device_id: string;
	name: string;
	room_width?: number;
	room_depth?: number;
}

/**
 * Pure: build the ha-form schema for the given device options. Testable.
 * `hideShowGrid` omits the "Show grid" toggle — it has no effect once a floor
 * plan is set (the map always renders the clean look then), so the editor
 * hides the now-inert control rather than leave it silently ignored.
 */
export function buildSchema(
	devices: DeviceOption[],
	hideShowGrid = false,
): unknown[] {
	return [
		{
			name: "device_id",
			required: true,
			selector: {
				select: {
					mode: "dropdown",
					options: devices.map((d) => ({ value: d.device_id, label: d.name })),
				},
			},
		},
		{ name: "primary", selector: { template: {} } },
		{ name: "secondary", selector: { template: {} } },
		{
			name: "layout",
			selector: {
				select: {
					mode: "dropdown",
					options: [
						{ value: "horizontal", label: "Horizontal" },
						{ value: "vertical", label: "Vertical" },
					],
				},
			},
		},
		{ name: "show_map", selector: { boolean: {} } },
		...(hideShowGrid ? [] : [{ name: "show_grid", selector: { boolean: {} } }]),
		{ name: "show_furniture", selector: { boolean: {} } },
		{ name: "show_overlays", selector: { boolean: {} } },
		{
			name: "show_heatmap",
			selector: {
				select: {
					mode: "dropdown",
					options: [
						{ value: "off", label: "Off" },
						{ value: "on", label: "On" },
						{ value: "toggle", label: "Toggle on card" },
					],
				},
			},
		},
		// show_sensors sits directly above the sensors config dropdown it gates.
		{ name: "show_sensors", selector: { boolean: {} } },
		{
			name: "sensors",
			type: "expandable",
			title: "Sensors",
			schema: [
				{
					name: "presence",
					type: "expandable",
					title: "Presence",
					schema: [
						{ name: "occupancy", selector: { boolean: {} } },
						{ name: "static_presence", selector: { boolean: {} } },
						{ name: "motion_presence", selector: { boolean: {} } },
						{ name: "target_presence", selector: { boolean: {} } },
						{ name: "mmwave", selector: { boolean: {} } },
					],
				},
				{ name: "zones", selector: { boolean: {} } },
				{
					name: "environmental",
					type: "expandable",
					title: "Environmental",
					schema: [
						{ name: "temperature", selector: { boolean: {} } },
						{ name: "humidity", selector: { boolean: {} } },
						{ name: "illuminance", selector: { boolean: {} } },
						{ name: "co2", selector: { boolean: {} } },
					],
				},
			],
		},
		{ name: "room_color", selector: { color_rgb: {} } },
	];
}

export class EppGridCardEditor extends LitElement {
	static styles = css`
		.reset-room-color {
			margin-top: var(--epp-space-2, 8px);
			background: none;
			border: none;
			padding: 0;
			color: var(--primary-color, #03a9f4);
			cursor: pointer;
			font: inherit;
			text-decoration: underline;
		}
		.floor-plan-section {
			margin-top: var(--epp-space-3, 12px);
		}
		.fp-label {
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-text-muted, var(--secondary-text-color));
			margin-bottom: var(--epp-space-2, 8px);
		}
		.fp-ratio-hint {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
			margin-top: var(--epp-space-2, 8px);
			font-size: var(--epp-font-xs, 12px);
			color: var(--epp-text-muted, var(--secondary-text-color));
		}
		.fp-ratio-proxy {
			flex: 0 0 auto;
			width: 48px;
			border: 1px solid var(--epp-accent, var(--primary-color));
			border-radius: var(--epp-radius-sm, 6px);
		}
		.fp-opacity-row {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
			margin-top: var(--epp-space-2, 8px);
		}
		.fp-opacity {
			flex: 1;
		}
		.fp-opacity-val {
			font-size: var(--epp-font-xs, 12px);
			color: var(--epp-text-muted, var(--secondary-text-color));
			width: 3em;
			text-align: right;
		}
	`;

	private __hass?: {
		callWS: (msg: unknown) => Promise<unknown>;
		locale?: { language?: string };
	};
	private _config?: EppGridCardConfig;
	private _localize: LocalizeFn = defaultLocalize;
	@state() private _devices: DeviceOption[] = [];
	private _loading = false;

	setConfig(config: EppGridCardConfig): void {
		this._config = config;
		// React to config changes (e.g. our own upload → floor_plan set) so the
		// opacity row and the hidden "Show grid" toggle update without waiting for
		// the next hass tick.
		this.requestUpdate();
	}

	set hass(hass: {
		callWS: (msg: unknown) => Promise<unknown>;
		locale?: { language?: string };
	}) {
		this.__hass = hass;
		this._localize = setupLocalize(hass);
		this._loadDevices();
		// Order-independent, like _loadDevices: HA may set hass after connecting.
		void this._ensurePictureUpload();
		this.requestUpdate();
	}

	get hass():
		| {
				callWS: (msg: unknown) => Promise<unknown>;
				locale?: { language?: string };
		  }
		| undefined {
		return this.__hass;
	}

	connectedCallback(): void {
		super.connectedCallback();
		this._loadDevices();
		void this._ensurePictureUpload();
	}

	// HA lazy-loads <ha-picture-upload> only through a handful of consumers (the
	// media selector, the person/area dialogs) — none of which a fresh dashboard
	// has opened, so our editor would find it unregistered and fall back to the URL
	// field. Nudge HA to import it by briefly mounting a media <ha-selector>
	// (ha-selector-media statically imports ha-picture-upload), wait for the
	// element to define, then re-render so the real upload control replaces the
	// fallback. Best-effort: any failure (older HA, no ha-selector) simply leaves
	// the URL fallback in place. `_preloadTimeoutMs` is overridable in tests.
	private _pictureUploadRequested = false;
	protected _preloadTimeoutMs = 4000;

	private async _ensurePictureUpload(): Promise<void> {
		if (this._pictureUploadRequested || this._hasPictureUpload) return;
		// Need both a live DOM connection (so the probe upgrades and imports) and
		// hass. If either is missing, don't latch — connectedCallback and `set hass`
		// both re-invoke, so the attempt isn't lost whichever order HA uses.
		if (!this.isConnected || !this.__hass) return;
		this._pictureUploadRequested = true;
		try {
			if (customElements.get("ha-selector")) {
				const probe = document.createElement("ha-selector");
				(probe as unknown as { hass: unknown }).hass = this.__hass;
				(probe as unknown as { selector: unknown }).selector = { media: {} };
				probe.style.display = "none";
				(this.shadowRoot ?? this).appendChild(probe);
				await Promise.race([
					customElements.whenDefined("ha-picture-upload"),
					new Promise((resolve) => setTimeout(resolve, this._preloadTimeoutMs)),
				]);
				probe.remove();
			}
		} catch {
			// Leave the URL fallback in place.
		}
		this.requestUpdate();
	}

	private async _loadDevices(): Promise<void> {
		if (!this.__hass || this._devices.length || this._loading) return;
		this._loading = true;
		try {
			const list = (await this.__hass.callWS({
				type: "eppgrid/overview/list_devices",
			})) as DeviceOption[];
			this._devices = list ?? [];
			if (this._config && !this._config.device_id && this._devices.length > 0) {
				this.dispatchEvent(
					new CustomEvent("config-changed", {
						detail: {
							config: {
								...this._config,
								device_id: this._devices[0].device_id,
							},
						},
						bubbles: true,
						composed: true,
					}),
				);
			}
		} catch {
			this._devices = [];
		} finally {
			this._loading = false;
		}
	}

	_computeLabel = (schema: { name: string }): string => {
		const key = `card.editor.${schema.name}`;
		const s = this._localize(key);
		return s === key ? schema.name : s;
	};

	// Exposed for testing; HA fires `value-changed` from <ha-form>.
	_valueChanged(ev: {
		stopPropagation: () => void;
		detail: { value: EppGridCardConfig };
	}): void {
		ev.stopPropagation();
		// <ha-form> only round-trips the keys in our schema, so re-emitting its
		// value verbatim would drop HA-managed keys such as `grid_options` (the
		// layout width the user set by resizing the card in a Sections
		// dashboard), `visibility`, and `view_layout`. Merge the form's values
		// over the existing config so those passthrough keys survive. ha-form
		// emits every schema key on each change (a cleared field arrives as ""
		// rather than being omitted), so this merge never leaves a stale schema
		// value from `this._config`.
		let config = { ...this._config, ...ev.detail.value };
		if (config.show_map === false && config.show_sensors === false) {
			// Never let the user end up with nothing to show — re-enable the map.
			config = { ...config, show_map: true };
		}
		this._emitConfigChanged(config);
	}

	// Reset the room colour back to "auto" (the theme default). HA's color_rgb
	// selector has no clear affordance, so this is the only way back once a
	// colour is picked. Drops room_color from the config, preserving all other
	// keys (including HA-managed passthroughs).
	private _resetRoomColor = (): void => {
		if (!this._config) return;
		const config = { ...this._config };
		delete config.room_color;
		this._emitConfigChanged(config);
	};

	/** Dispatch a `config-changed` event carrying the updated card config. */
	private _emitConfigChanged(config: EppGridCardConfig): void {
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _selectedDevice(): DeviceOption | undefined {
		return this._devices.find((d) => d.device_id === this._config?.device_id);
	}

	/** Recommended crop-ratio hint (or a calibrate-first prompt) for the plan. */
	private _renderRatioHint(w: number, d: number) {
		if (!(w > 0 && d > 0)) {
			return html`<div class="fp-ratio-hint">
				${this._localize("card.editor.floor_plan_calibrate_first")}
			</div>`;
		}
		// Normalise so the shorter side is 1 → the ratio is always >= 1 (e.g.
		// "1.40 : 1") regardless of whether the room is landscape or portrait; the
		// metres (width × depth) already convey the orientation. The proxy box keeps
		// the true w/d aspect so it looks the right shape.
		const big = Math.max(w, d);
		const small = Math.min(w, d);
		const proxy = `aspect-ratio:${w} / ${d};`;
		return html`<div class="fp-ratio-hint">
			<span class="fp-ratio-proxy" style=${proxy}></span>
			<span>${this._localize("card.editor.floor_plan_ratio", {
				width: (w / 1000).toFixed(1),
				depth: (d / 1000).toFixed(1),
				ratio: (big / small).toFixed(2),
			})}</span>
		</div>`;
	}

	private get _hasPictureUpload(): boolean {
		return !!customElements.get("ha-picture-upload");
	}

	private _renderUpload(w: number, d: number) {
		const aspectRatio = w > 0 && d > 0 ? w / d : undefined;
		if (this._hasPictureUpload) {
			// HA's native upload → stores the image in image_upload and yields a
			// /api/image/serve/{id}/original URL. `crop` locks the cropper to the
			// room ratio so uploads never distort under stretch.
			return html`<ha-picture-upload
				.hass=${this.__hass}
				.value=${this._config?.floor_plan ?? null}
				original
				?crop=${aspectRatio !== undefined}
				.cropOptions=${aspectRatio !== undefined ? { round: false, aspectRatio } : undefined}
				@change=${this._onPictureChanged}
			></ha-picture-upload>`;
		}
		// Fallback: the epp-field primitive (design-system input that carries its
		// own ha-input/ha-textfield/native registration guard and tokens — never
		// hand-roll an input when a primitive exists). Also lets power users point
		// at a self-hosted /local/… image.
		return html`<epp-field
			class="fp-url"
			.value=${this._config?.floor_plan ?? ""}
			.label=${this._localize("card.editor.floor_plan_url")}
			@value-changed=${this._onUrlChanged}
		></epp-field>`;
	}

	private _onPictureChanged = (e: Event): void => {
		// ha-picture-upload's `change` is composed — stop it crossing our boundary
		// into HA's editor host (matches _onUrlChanged / _valueChanged).
		e.stopPropagation();
		const val = (e.target as unknown as { value: string | null }).value;
		this._writeFloorPlan(val || undefined);
	};

	private _onUrlChanged = (e: Event): void => {
		// epp-field is composed:true — stop the event re-crossing our boundary.
		e.stopPropagation();
		const val = String((e as CustomEvent).detail?.value ?? "").trim();
		this._writeFloorPlan(val || undefined);
	};

	private _writeFloorPlan(url: string | undefined): void {
		if (!this._config) return;
		const config = { ...this._config };
		if (url) {
			config.floor_plan = url;
		} else {
			delete config.floor_plan;
			delete config.floor_plan_opacity;
		}
		this._emitConfigChanged(config);
	}

	private _renderOpacity() {
		const val = clampOpacity(this._config?.floor_plan_opacity);
		return html`<div class="fp-opacity-row">
			<label class="fp-label">${this._localize("card.editor.floor_plan_opacity")}</label>
			<input
				class="fp-opacity"
				type="range"
				min="0"
				max="100"
				step="5"
				.value=${String(val)}
				aria-label=${this._localize("card.editor.floor_plan_opacity")}
				@input=${this._onOpacityInput}
			/>
			<span class="fp-opacity-val">${val}%</span>
		</div>`;
	}

	private _onOpacityInput = (e: Event): void => {
		if (!this._config) return;
		const v = Number((e.target as HTMLInputElement).value);
		this._emitConfigChanged({ ...this._config, floor_plan_opacity: v });
	};

	private _renderFloorPlanSection() {
		const dev = this._selectedDevice();
		const w = dev?.room_width ?? 0;
		const d = dev?.room_depth ?? 0;
		return html`<div class="floor-plan-section">
			<div class="fp-label">${this._localize("card.editor.floor_plan")}</div>
			${this._renderUpload(w, d)}
			${this._renderRatioHint(w, d)}
			${this._config?.floor_plan ? this._renderOpacity() : nothing}
		</div>`;
	}

	render() {
		if (!this.__hass || !this._config) return nothing;
		return html`
			<ha-form
				.hass=${this.__hass}
				.data=${applyCardDefaults(this._config)}
				.schema=${buildSchema(this._devices, !!this._config?.floor_plan)}
				.computeLabel=${this._computeLabel}
				@value-changed=${this._valueChanged}
			></ha-form>
			${
				this._config.room_color
					? html`<button
							type="button"
							class="reset-room-color"
							@click=${this._resetRoomColor}
						>
							${this._localize("card.editor.reset_room_color")}
						</button>`
					: nothing
			}
			${this._renderFloorPlanSection()}
		`;
	}
}

if (!customElements.get("eppgrid-card-editor")) {
	customElements.define("eppgrid-card-editor", EppGridCardEditor);
}
