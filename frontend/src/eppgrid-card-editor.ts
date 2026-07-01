import { html, LitElement, nothing } from "lit";
import { state } from "lit/decorators.js";
import { applyCardDefaults, type EppGridCardConfig } from "./eppgrid-card.js";
import { defaultLocalize, type LocalizeFn, setupLocalize } from "./localize.js";

interface DeviceOption {
	device_id: string;
	name: string;
}

/** Pure: build the ha-form schema for the given device options. Testable. */
export function buildSchema(devices: DeviceOption[]): unknown[] {
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
		{ name: "show_sensors", selector: { boolean: {} } },
		{ name: "show_grid", selector: { boolean: {} } },
		{ name: "show_furniture", selector: { boolean: {} } },
		{ name: "show_overlays", selector: { boolean: {} } },
		{ name: "room_color", selector: { color_rgb: {} } },
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
	];
}

export class EppGridCardEditor extends LitElement {
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
	}

	set hass(hass: {
		callWS: (msg: unknown) => Promise<unknown>;
		locale?: { language?: string };
	}) {
		this.__hass = hass;
		this._localize = setupLocalize(hass);
		this._loadDevices();
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
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config },
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		if (!this.__hass || !this._config) return nothing;
		return html`
			<ha-form
				.hass=${this.__hass}
				.data=${applyCardDefaults(this._config)}
				.schema=${buildSchema(this._devices)}
				.computeLabel=${this._computeLabel}
				@value-changed=${this._valueChanged}
			></ha-form>
		`;
	}
}

if (!customElements.get("eppgrid-card-editor")) {
	customElements.define("eppgrid-card-editor", EppGridCardEditor);
}
