import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { STATIC_ON_DELAY_MAX } from "../lib/config-serialization.js";
import {
	autoDetectionRange,
	getGridRoomMetrics,
} from "../lib/room-geometry.js";
import {
	SETTINGS_DEFAULTS,
	SETTINGS_FIELD_MAP,
} from "../lib/settings-defaults.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { buttonStyles, settingStyles, toggleStyles } from "../styles.js";
import "./epp-info-tip.js";
import "../ui/epp-card.js";
import "../ui/epp-toggle.js";
import { renderSaveCancelBar } from "./save-cancel-bar.js";

/** Option shape consumed by ha-select's `.options` property. */
interface SelectOption {
	value: string;
	label: string;
}

// Wire values are English (firmware protocol); labels are localized at
// render time via the memoised option arrays.
const LOG_LEVELS = ["None", "Error", "Warning", "Info", "Debug"];

// Firmware log categories, in display order. Every category is always shown:
// BLE and CO2 used to be gated on the device's build flags, but hiding rows the
// user expects to see was more surprising than showing a category whose hardware
// happens to be absent (its logs simply never fire). `key` is the wire value
// passed to the firmware's epp_set_log_level action; label/tip are translation
// keys.
const LOG_CATEGORIES: { key: string; label: string; tip: string }[] = [
	{ key: "system", label: "settings.log_system", tip: "info.log_system" },
	{ key: "epp", label: "settings.log_epp", tip: "info.log_epp" },
	{ key: "led", label: "settings.log_led", tip: "info.log_led" },
	{
		key: "networking",
		label: "settings.log_networking",
		tip: "info.log_networking",
	},
	{ key: "ble", label: "settings.log_ble", tip: "info.log_ble" },
	{ key: "co2", label: "settings.log_co2", tip: "info.log_co2" },
];

// Numeric reset-button defaults keyed by the override/_fireChange key
// (camelCase prop name), derived from the canonical SETTINGS_DEFAULTS via
// SETTINGS_FIELD_MAP — hard-coded duplicates here drifted from the values
// the restore-defaults flow applies.
const SLIDER_DEFAULTS: Record<string, number> = Object.fromEntries(
	SETTINGS_FIELD_MAP.flatMap(([key, prop]) => {
		const value = SETTINGS_DEFAULTS[key];
		return typeof value === "number" ? [[prop.slice(1), value]] : [];
	}),
);

/** One slider row in the sensitivities section. */
interface SliderRowDescriptor {
	/** Translation key for the row label. */
	label: string;
	/** Override/_fireChange key, e.g. "motionTimeout". */
	key: string;
	/** Current value (from the panel prop). */
	value: number;
	min: number;
	max: number;
	step?: number;
	/** Unit suffix shown after the value ("s" or ""). */
	unit: string;
	/** Value the reset button restores. */
	defaultValue: number;
	/** Translation key for the info tooltip. */
	tip: string;
	/** Grey out + disable the row (dependent on a toggle). */
	disabled?: boolean;
}

/** One entity-reporting toggle row. */
interface ToggleRowDescriptor {
	/** Translation key for the row label. */
	label: string;
	/** Entity key in entitiesConfig, e.g. "room_occupancy". */
	key: string;
	/** Default state when neither overrides nor saved config have the key. */
	defaultValue: boolean;
	/** Translation key for the info tooltip. */
	tip: string;
	/** Disable the toggle (e.g. zone entities need a calibration). */
	disabled?: boolean;
}

export interface SensorState {
	occupancy: boolean;
	static_presence: boolean;
	motion_presence: boolean;
	target_presence: boolean;
	illuminance: number | null;
	temperature: number | null;
	humidity: number | null;
	co2: number | null;
}

const accordionStyles = css`
  .accordion {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin-bottom: 12px;
    background: var(--card-background-color, #fff);
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    cursor: pointer;
    user-select: none;
    background: var(--card-background-color, #fff);
    border: none;
    border-radius: 12px;
    width: 100%;
    text-align: left;
    font-size: 15px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .accordion-header[data-open] {
    border-radius: 12px 12px 0 0;
  }

  .accordion-header:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .accordion-header ha-icon {
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color, #757575);
  }

  .accordion-header .accordion-title {
    flex: 1;
  }

  .accordion-chevron {
    transition: transform 0.2s ease;
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color, #757575);
  }

  .accordion-chevron[data-open] {
    transform: rotate(180deg);
  }

  .accordion-body {
    padding: 0 16px 16px;
  }
`;

// Styles for the row's trailing controls: the reset (restart) button
// (class "setting-info"), the shared <epp-info-tip>, and the disabled-row
// grey-out. The tooltip itself now lives in epp-info-tip.ts.
const settingControlStyles = css`
  .setting-info {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: 8px;
  }

  button.setting-info {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .setting-info ha-icon {
    --mdc-icon-size: 18px;
    color: var(--primary-text-color, #212121);
  }

  epp-info-tip {
    margin-left: 8px;
  }

  /* Grey out a disabled row's controls but keep the info tip usable — the
     documentation must stay available even when the option it documents is
     disabled. */
  .setting-row.row-disabled > :not(epp-info-tip) {
    opacity: 0.5;
    pointer-events: none;
  }
`;

export class EppSettingsView extends LitElement {
	@property({ attribute: false }) sensorState: SensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		illuminance: null,
		temperature: null,
		humidity: null,
		co2: null,
	};

	@property({ type: Boolean }) targetAutoDistance = true;
	@property({ type: Number }) targetMaxDistance = 6.0;
	@property({ type: Number }) stuckTargetTimeout = 300;
	@property({ type: Boolean }) assistedClearEnabled = true;
	@property({ type: Number }) assistedClearTimeout = 5;
	@property({ type: Boolean }) staticAutoDistance = true;
	@property({ type: Number }) staticMinDistance = 0.3;
	@property({ type: Number }) staticMaxDistance = 16.0;

	@property({ attribute: false }) openAccordions: Set<string> = new Set();

	@property({ attribute: false }) perspective: number[] | null = null;
	@property({ type: Number }) roomWidth = 0;
	@property({ type: Number }) roomDepth = 0;
	@property({ attribute: false }) grid: Uint8Array = new Uint8Array(0);

	@property({ type: Boolean }) saving = false;
	@property({ type: Boolean }) dirty = false;

	@property({ type: Number }) temperatureOffset = 0;
	@property({ type: Number }) humidityOffset = 0;
	@property({ type: Number }) illuminanceOffset = 0;
	@property({ type: Number }) motionTimeout = 5;
	@property({ type: Number }) staticTimeout = 30;
	@property({ type: Number }) staticTriggerThreshold = 3;
	@property({ type: Number }) staticRenewThreshold = 3;
	@property({ type: Number }) staticOnDelay = 0;
	@property({ attribute: false }) entitiesConfig: Record<string, boolean> = {};
	@property({ attribute: false }) logLevels: Record<string, string> = {};
	@property({ type: Boolean }) co2Enabled = false;

	@property({ type: String }) ledMode = "Manual Control";
	@property({ type: Number }) ledBrightness = 1.0;
	@property({ type: String }) ledPresenceColor = "#CC33FF";

	@property({ type: String }) relayTriggerMode = "disabled";
	@property({ type: String }) relayContactMode = "no";

	@property({ type: Number }) targetUpdateRateMs = 1000;
	@property({ type: Number }) zoneUpdateRateMs = 1000;

	// Non-reactive overrides — stores user edits without triggering Lit re-renders.
	// The 5Hz target data stream re-renders the panel at high frequency; if slider
	// handlers update reactive properties, Lit crashes with concurrent re-renders.
	private _overrides: Record<string, any> = {};

	// Tracks user edits since the last time the parent's `dirty` prop was true.
	// Read during render() (no setter side-effects), so the natural panel
	// re-render cycle picks it up — no DOM mutation needed.
	private _localDirty = false;

	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	// Shared no-op closed handler — stops the ha-select's "closed" event from
	// bubbling out to ancestor menu/dialog widgets that would otherwise treat
	// it as their own close signal.
	private _stopClosed = (e: Event): void => {
		e.stopPropagation();
	};

	// ---------------------------------------------------------------------
	// Memoised derived data. The view re-renders at 5Hz from the live sensor
	// stream; rebuilding option arrays every render hands ha-select a new
	// `.options` reference each time (forcing it to re-initialise), and the
	// geometry helpers scan the full grid. Both are lazy caches keyed on the
	// inputs they derive from (the epp-grid `_getScan` pattern — willUpdate
	// isn't suitable because unit tests invoke the render helpers directly,
	// outside the reactive-update lifecycle).
	// ---------------------------------------------------------------------

	private _optionCache: {
		localize: LocalizeFn;
		co2Enabled: boolean;
		rateOptions: SelectOption[];
		logLevelOptions: SelectOption[];
		ledModes: SelectOption[];
		relayTriggerModes: SelectOption[];
		relayContactModes: SelectOption[];
	} | null = null;

	private _getOptions(): NonNullable<EppSettingsView["_optionCache"]> {
		const c = this._optionCache;
		if (c && c.localize === this.localize && c.co2Enabled === this.co2Enabled) {
			return c;
		}
		const l = this.localize;
		const ledModes = [
			{ value: "Manual Control", label: l("settings.manual_control") },
			{ value: "Presence", label: l("settings.presence") },
		];
		if (this.co2Enabled) {
			ledModes.push(
				{ value: "Environmental", label: l("settings.environmental") },
				{
					value: "Environmental + Presence",
					label: l("settings.environmental_presence"),
				},
			);
		}
		this._optionCache = {
			localize: l,
			co2Enabled: this.co2Enabled,
			rateOptions: [
				{ value: "200", label: l("settings.frequency.5hz") },
				{ value: "500", label: l("settings.frequency.2hz") },
				{ value: "1000", label: l("settings.frequency.1hz") },
				{ value: "2000", label: l("settings.frequency.0_5hz") },
			],
			logLevelOptions: LOG_LEVELS.map((level) => ({
				value: level,
				label: l(`settings.log_level.${level.toLowerCase()}`),
			})),
			ledModes,
			relayTriggerModes: [
				{ value: "disabled", label: l("settings.relay_disabled") },
				{ value: "motion", label: l("settings.relay_motion") },
				{ value: "presence", label: l("settings.relay_presence") },
				{ value: "occupancy", label: l("settings.relay_occupancy") },
			],
			relayContactModes: [
				{ value: "no", label: l("settings.relay_normally_open") },
				{ value: "nc", label: l("settings.relay_normally_closed") },
			],
		};
		return this._optionCache;
	}

	private _geomCache: {
		grid: Uint8Array;
		perspective: number[] | null;
		roomWidth: number;
		roomDepth: number;
		autoRange: number;
		metrics: ReturnType<typeof getGridRoomMetrics>;
	} | null = null;

	private _getGeometry(): NonNullable<EppSettingsView["_geomCache"]> {
		const c = this._geomCache;
		if (
			c &&
			c.grid === this.grid &&
			c.perspective === this.perspective &&
			c.roomWidth === this.roomWidth &&
			c.roomDepth === this.roomDepth
		) {
			return c;
		}
		this._geomCache = {
			grid: this.grid,
			perspective: this.perspective,
			roomWidth: this.roomWidth,
			roomDepth: this.roomDepth,
			autoRange: autoDetectionRange(
				this.roomWidth,
				this.roomDepth,
				this.perspective,
				this.grid,
			),
			metrics: getGridRoomMetrics(this.grid, this.roomWidth, this.perspective),
		};
		return this._geomCache;
	}

	// Tooltip lifecycle (open/close + outside-click/Escape/scroll/resize) is
	// owned by the shared <epp-info-tip> component rendered by infoTip().
	static styles = [
		accordionStyles,
		buttonStyles,
		settingStyles,
		toggleStyles,
		settingControlStyles,
		css`
      :host {
        display: block;
      }

      .settings-container {
        width: 560px;
        max-width: 100%;
        margin: 0 auto;
        padding: 0 16px;
        box-sizing: border-box;
      }

      .setting-row ha-select {
        width: 140px;
        flex-shrink: 0;
      }

      .setting-row ha-select.wide-select {
        width: 220px;
      }

      .save-cancel-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        border-top: 1px solid var(--divider-color, #eee);
        margin-top: auto;
      }

      /* Mobile: pin the Save/Cancel bar to the bottom of the screen and let
         the accordion list scroll inside .settings-scroll. Placed AFTER the
         base .settings-container / .save-cancel-bar rules so it wins on source
         order (mobile @media blocks placed before base rules go silently dead). */
      @media (max-width: 819px) {
        :host {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .settings-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          width: 100%;
        }
        .settings-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .save-cancel-bar {
          flex-shrink: 0;
        }
      }
    `,
	];

	render() {
		const sections: { id: string; label: string; icon: string }[] = [
			{
				id: "reporting",
				label: "settings.entities",
				icon: "mdi:format-list-checks",
			},
			{
				id: "detection",
				label: "settings.detection_ranges",
				icon: "mdi:signal-distance-variant",
			},
			{
				id: "sensitivity",
				label: "settings.sensor_calibration",
				icon: "mdi:tune-vertical",
			},
			{
				id: "led_relay",
				label: "settings.led_and_relay",
				icon: "mdi:led-variant-on",
			},
			{
				id: "logging",
				label: "settings.logging",
				icon: "mdi:math-log",
			},
		];

		return html`
      <div class="settings-container">
        <div class="settings-scroll">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${sections.map((s) => {
					const open = this.openAccordions.has(s.id);
					return html`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${open} @click=${() => this.toggleAccordion(s.id)}>
                <ha-icon icon=${s.icon}></ha-icon>
                <span class="accordion-title">${this.localize(s.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${open}></ha-icon>
              </button>
              ${
								open
									? html`
                <div class="accordion-body">
                  ${this.renderSettingsSection(s.id)}
                </div>
              `
									: nothing
							}
            </div>
          `;
				})}
        </div>
        ${this.renderSaveCancelButtons()}
      </div>
    `;
	}

	toggleAccordion(id: string) {
		const newSet = this.openAccordions.has(id)
			? new Set<string>()
			: new Set([id]);
		this.openAccordions = newSet;
		this.dispatchEvent(
			new CustomEvent("accordion-toggle", {
				detail: newSet,
				bubbles: true,
				composed: true,
			}),
		);
	}

	renderSettingsSection(id: string) {
		switch (id) {
			case "detection":
				return this.renderDetectionRanges();
			case "sensitivity":
				return this.renderSensitivities();
			case "reporting":
				return this.renderEntities();
			case "led_relay":
				return html`${this.renderLed()}${this.renderRelay()}`;
			case "logging":
				return this.renderLogging();
			default:
				return nothing;
		}
	}

	renderEnvOffset(
		label: string,
		readingOrGetter: number | null | (() => number | null),
		offsetKey: string,
		min: number,
		max: number,
		step: number,
		unit: string,
		precision: number,
		tip: string,
		displayMin = -Infinity,
		displayMax = Infinity,
	) {
		const propName = `${offsetKey}Offset` as keyof this;
		const getReading: () => number | null =
			typeof readingOrGetter === "function"
				? (readingOrGetter as () => number | null)
				: () => readingOrGetter;
		const reading = getReading();
		const savedOffset = (this as any)[propName] ?? 0;
		// Display with the user's in-flight edit (override) when present —
		// the 5Hz live stream re-renders mid-drag, and recomputing from the
		// saved prop alone made the text snap back while the slider kept the
		// dragged position.
		const offset = this._overrides[`${offsetKey}Offset`] ?? savedOffset;
		// reading already has the SAVED offset applied by the coordinator,
		// so subtract that (not the override) to get the raw value
		const raw = reading != null ? reading - savedOffset : null;
		const clamp = (v: number) => Math.max(displayMin, Math.min(displayMax, v));
		const adjusted =
			raw != null
				? this.localize.formatNumber(clamp(raw + offset), precision)
				: "—";
		return html`
      <div class="setting-row">
        <label>${label}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${offsetKey} data-precision=${precision} data-display-min=${displayMin} data-display-max=${displayMax} min=${min} max=${max} step=${step} .value=${String(offset)} @input=${(
					e: Event,
				) => {
					const el = e.target as HTMLInputElement;
					const off = parseFloat(el.value);
					// Pull live reading and offset at event time — the closure must
					// not rely on render-time values, since `sensorState` updates
					// between renders while the slider remains bound.
					const liveReading = getReading();
					const liveOffset = (this as any)[propName] ?? 0;
					const liveRaw = liveReading != null ? liveReading - liveOffset : null;
					const val =
						liveRaw != null
							? this.localize.formatNumber(clamp(liveRaw + off), precision)
							: "—";
					this._setSettingValue(el, val);
					this._overrides[`${offsetKey}Offset`] = off;
					this._fireDirty();
				}} /><span class="setting-value">${adjusted}</span> ${unit}</span>
        ${this.resetBtn(0)}${this.infoTip(tip)}
      </div>
    `;
	}

	/**
	 * Update display text without replacing Lit's tracked text node.
	 * Setting .textContent destroys child nodes and breaks Lit's ChildPart
	 * references, causing "Cannot set properties of null" on the next re-render.
	 */
	private _setText(el: Element, text: string): void {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const node = walker.nextNode();
		if (node) (node as Text).data = text;
		else el.textContent = text;
	}

	/**
	 * Update the `.setting-value` span next to a slider input. Resolves the
	 * span via the slider's parent rather than `nextElementSibling`, so
	 * inserting wrapper elements in the markup doesn't silently break the
	 * display update.
	 */
	private _setSettingValue(slider: HTMLInputElement, text: string): void {
		const value = slider.parentElement?.querySelector(".setting-value");
		if (value instanceof HTMLElement) this._setText(value, text);
	}

	private _resetSlider(settingRow: HTMLElement, value: number, key?: string) {
		const slider = settingRow.querySelector(
			".setting-range",
		) as HTMLInputElement;
		if (!slider) return;
		slider.value = String(value);
		const display = slider.parentElement?.querySelector(
			".setting-value",
		) as HTMLElement | null;
		if (display) {
			if (slider.dataset.offsetKey) {
				// Env offset slider. Recompute from the LIVE reading exactly like
				// the @input handler does — re-parsing the rendered display text
				// is locale-hostile (Intl output like "1434,5" or "1,234.5" turns
				// parseFloat into silent data loss). offsetKey names the
				// SensorState field the reading comes from.
				const key = slider.dataset.offsetKey;
				const reading = (this.sensorState as any)[key] as
					| number
					| null
					| undefined;
				if (reading == null) {
					// No live reading — keep the em dash so the user still knows
					// there's no live data; just record the new offset below.
					this._setText(display, "—");
				} else {
					const savedOffset = ((this as any)[`${key}Offset`] as number) ?? 0;
					const raw = reading - savedOffset;
					const precision = parseInt(slider.dataset.precision ?? "0", 10);
					const dMin = parseFloat(slider.dataset.displayMin ?? "-Infinity");
					const dMax = parseFloat(slider.dataset.displayMax ?? "Infinity");
					const adjusted = Math.max(dMin, Math.min(dMax, raw + value));
					this._setText(
						display,
						this.localize.formatNumber(adjusted, precision),
					);
				}
				this._overrides[`${slider.dataset.offsetKey}Offset`] = value;
			} else {
				this._setText(display, String(value));
			}
		}
		if (key) {
			this._overrides[key] = value;
		}
		// Mark dirty without mutating DOM — the next panel-driven re-render
		// (≤200ms at 5Hz) reads this and re-enables the save button.
		this._localDirty = true;
	}

	resetBtn(defaultValue: number, key?: string) {
		return html`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.reset_to_default")}
			title=${this.localize("settings.reset_to_default")}
			@click=${(e: Event) => {
				e.stopPropagation();
				const row = (e.currentTarget as HTMLElement).closest(
					".setting-row",
				) as HTMLElement;
				if (row) this._resetSlider(row, defaultValue, key);
				if (key) {
					this._fireChange(key, defaultValue);
				} else {
					this._fireDirty();
				}
			}}
		><ha-icon icon="mdi:restart"></ha-icon></button>`;
	}

	infoTip(text: string) {
		return html`<epp-info-tip .text=${text} .localize=${this.localize}></epp-info-tip>`;
	}

	renderDetectionRanges() {
		const { autoRange, metrics } = this._getGeometry();
		const targetAutoVal = autoRange > 0 ? Math.min(autoRange, 6) : 6;
		const staticMaxAutoVal = autoRange > 0 ? Math.min(autoRange, 16) : 16;
		const targetVal = this.targetAutoDistance
			? targetAutoVal
			: this.targetMaxDistance;
		const staticMaxVal = this.staticAutoDistance
			? staticMaxAutoVal
			: this.staticMaxDistance;
		return html`
      <div class="settings-section">
        ${metrics ? html`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${this.localize.formatNumber(metrics.furthestM, 1)}m</span></p>` : nothing}
        <epp-card heading=${this.localize("settings.target_sensor")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <epp-toggle
              .checked=${this.targetAutoDistance}
              @value-changed=${(e: CustomEvent<{ value: boolean }>) => {
								e.stopPropagation();
								const checked = e.detail.value;
								if (!checked) {
									this._overrides.targetMaxDistance = targetVal;
									this._fireChange("targetMaxDistance", targetVal);
								}
								this._overrides.targetAutoDistance = checked;
								this._fireChange("targetAutoDistance", checked);
							}}
            ></epp-toggle>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row${this.targetAutoDistance ? " row-disabled" : ""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(targetVal)} min="0.5" max="6" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								const v = Number(el.value);
								this._overrides.targetMaxDistance = v;
								this._fireChange("targetMaxDistance", v);
								this._setSettingValue(el, this.localize.formatNumber(v, 1));
							}} /><span class="setting-value">${this.localize.formatNumber(targetVal, 1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(targetAutoVal, "targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </epp-card>
        <epp-card heading=${this.localize("settings.static_sensor")}>
          <!-- .setting-row conversion deferred — see comment above -->
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <epp-toggle
              .checked=${this.staticAutoDistance}
              @value-changed=${(e: CustomEvent<{ value: boolean }>) => {
								e.stopPropagation();
								const checked = e.detail.value;
								if (!checked) {
									this._overrides.staticMinDistance = 0.3;
									this._fireChange("staticMinDistance", 0.3);
									this._overrides.staticMaxDistance = staticMaxVal;
									this._fireChange("staticMaxDistance", staticMaxVal);
								}
								this._overrides.staticAutoDistance = checked;
								this._fireChange("staticAutoDistance", checked);
							}}
            ></epp-toggle>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row${this.staticAutoDistance ? " row-disabled" : ""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance ? 0.3 : this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								let v = Number(el.value);
								const maxD =
									this._overrides.staticMaxDistance ?? this.staticMaxDistance;
								if (v >= maxD) {
									v = Math.round((maxD - 0.1) * 10) / 10;
									el.value = String(v);
								}
								this._overrides.staticMinDistance = v;
								this._fireChange("staticMinDistance", v);
								this._setSettingValue(el, this.localize.formatNumber(v, 1));
							}} /><span class="setting-value">${this.localize.formatNumber(this.staticAutoDistance ? 0.3 : this.staticMinDistance, 1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(0.3, "staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row${this.staticAutoDistance ? " row-disabled" : ""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(staticMaxVal)} min="2.4" max="16" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								let v = Number(el.value);
								const minD =
									this._overrides.staticMinDistance ?? this.staticMinDistance;
								if (v <= minD) {
									v = Math.round((minD + 0.1) * 10) / 10;
									el.value = String(v);
								}
								this._overrides.staticMaxDistance = v;
								this._fireChange("staticMaxDistance", v);
								this._setSettingValue(el, this.localize.formatNumber(v, 1));
							}} /><span class="setting-value">${this.localize.formatNumber(staticMaxVal, 1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(staticMaxAutoVal, "staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </epp-card>
      </div>
    `;
	}

	/** Render one sensitivity slider row from a descriptor. */
	renderSliderRow(d: SliderRowDescriptor) {
		return html`
      <div class="setting-row${d.disabled ? " row-disabled" : ""}">
        <label>${this.localize(d.label)}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" ?disabled=${d.disabled ?? false} .value=${String(d.value)} min=${d.min} max=${d.max} step=${d.step ?? 1} @input=${(
					e: Event,
				) => {
					const el = e.target as HTMLInputElement;
					const v = Number(el.value);
					this._overrides[d.key] = v;
					this._setSettingValue(el, el.value);
					this._fireChange(d.key, v);
				}} /><span class="setting-value">${d.value}</span><span class="setting-unit">${d.unit}</span></span>
        ${this.resetBtn(d.defaultValue, d.key)}${this.infoTip(this.localize(d.tip))}
      </div>
    `;
	}

	renderSensitivities() {
		const groups: { title: string; rows: SliderRowDescriptor[] }[] = [
			{
				title: "settings.motion_sensor",
				rows: [
					{
						label: "settings.presence_timeout",
						key: "motionTimeout",
						value: this.motionTimeout,
						min: 0,
						max: 120,
						unit: "s",
						defaultValue: SLIDER_DEFAULTS.motionTimeout,
						tip: "info.motion_timeout",
					},
				],
			},
			{
				title: "settings.static_sensor",
				rows: [
					{
						label: "settings.presence_delay",
						key: "staticOnDelay",
						value: this.staticOnDelay,
						min: 0,
						max: STATIC_ON_DELAY_MAX,
						step: 0.1,
						unit: "s",
						defaultValue: SLIDER_DEFAULTS.staticOnDelay,
						tip: "info.presence_delay",
					},
					{
						label: "settings.presence_timeout",
						key: "staticTimeout",
						value: this.staticTimeout,
						min: 0,
						max: 120,
						unit: "s",
						defaultValue: SLIDER_DEFAULTS.staticTimeout,
						tip: "info.static_timeout",
					},
					{
						label: "settings.trigger_threshold",
						key: "staticTriggerThreshold",
						value: this.staticTriggerThreshold,
						min: 1,
						max: 9,
						unit: "",
						defaultValue: SLIDER_DEFAULTS.staticTriggerThreshold,
						tip: "info.trigger_threshold",
					},
					{
						label: "settings.renew_threshold",
						key: "staticRenewThreshold",
						value: this.staticRenewThreshold,
						min: 1,
						max: 9,
						unit: "",
						defaultValue: SLIDER_DEFAULTS.staticRenewThreshold,
						tip: "info.renew_threshold",
					},
				],
			},
			{
				title: "settings.target_sensor",
				rows: [
					{
						label: "settings.stuck_target_timeout",
						key: "stuckTargetTimeout",
						value: this.stuckTargetTimeout,
						min: 0,
						max: 600,
						unit: "s",
						defaultValue: SLIDER_DEFAULTS.stuckTargetTimeout,
						tip: "info.stuck_target_timeout",
					},
				],
			},
		];

		return html`
      <div class="settings-section">
        ${groups.map(
					(g) => html`
        <epp-card heading=${this.localize(g.title)}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          ${g.rows.map((row) => this.renderSliderRow(row))}
        </epp-card>
        `,
				)}
        <epp-card heading=${this.localize("settings.assisted_clear")}>
          <!-- .setting-row conversion deferred — see comment above -->
          <div class="setting-row">
            <label>${this.localize("settings.assisted_clear_enabled")}</label>
            <epp-toggle
              .checked=${this.assistedClearEnabled}
              @value-changed=${(e: CustomEvent<{ value: boolean }>) => {
								e.stopPropagation();
								const checked = e.detail.value;
								this._overrides.assistedClearEnabled = checked;
								this._fireChange("assistedClearEnabled", checked);
							}}
            ></epp-toggle>
            ${this.infoTip(this.localize("info.assisted_clear_enabled"))}
          </div>
          ${this.renderSliderRow({
						label: "settings.assisted_clear_timeout",
						key: "assistedClearTimeout",
						value: this.assistedClearTimeout,
						min: 0,
						max: 600,
						unit: "s",
						defaultValue: SLIDER_DEFAULTS.assistedClearTimeout,
						tip: "info.assisted_clear_timeout",
						disabled: !this.assistedClearEnabled,
					})}
        </epp-card>
        <epp-card heading=${this.localize("settings.environmental")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"), () => this.sensorState.illuminance, "illuminance", -500, 500, 1, "lux", 1, this.localize("info.illuminance_offset"), 0)}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"), () => this.sensorState.humidity, "humidity", -50, 50, 0.1, "%", 1, this.localize("info.humidity_offset"), 0, 100)}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"), () => this.sensorState.temperature, "temperature", -20, 20, 0.1, "°C", 1, this.localize("info.temperature_offset"))}
        </epp-card>
      </div>
    `;
	}

	/** Render one entity-reporting toggle row from a descriptor. */
	private renderEntityToggleRow(
		d: ToggleRowDescriptor,
		isOn: (key: string, fallback: boolean) => boolean,
		onChange: (key: string, value: boolean) => void,
	) {
		return html`
      <div class="setting-row">
        <label>${this.localize(d.label)}</label>
        <epp-toggle
          data-entity-key=${d.key}
          .checked=${isOn(d.key, d.defaultValue)}
          .disabled=${d.disabled ?? false}
          @value-changed=${(e: CustomEvent<{ value: boolean }>) => {
						e.stopPropagation();
						onChange(d.key, e.detail.value);
					}}
        ></epp-toggle>
        ${this.infoTip(this.localize(d.tip))}
      </div>
    `;
	}

	renderEntities() {
		// Check overrides first, then saved config, then fallback
		const saved: Record<string, boolean> = this.entitiesConfig || {};
		const overrides = this._overrides.entities || {};
		const isOn = (key: string, fallback: boolean) =>
			overrides[key] ?? saved[key] ?? fallback;

		const entityToggleHandler = (key: string, value: boolean) => {
			if (!this._overrides.entities) this._overrides.entities = {};
			this._overrides.entities[key] = value;
			this._fireChange("entitiesConfig", {
				...(this.entitiesConfig || {}),
				...this._overrides.entities,
			});
		};

		const o = this._overrides;
		const anyZoneOn =
			isOn("zone_presence", true) || isOn("zone_target_count", false);
		const anyTargetOn =
			isOn("target_xy", false) ||
			isOn("target_active", false) ||
			isOn("target_signal", false) ||
			isOn("target_zone", false) ||
			isOn("target_count", false);

		// Zone/XY entities need a calibration to produce meaningful data.
		const needsCal = !this.perspective;
		const ROOM_TOGGLES: ToggleRowDescriptor[] = [
			{
				label: "entities.occupancy",
				key: "room_occupancy",
				defaultValue: true,
				tip: "info.room_occupancy",
			},
			{
				label: "entities.static_presence",
				key: "room_static_presence",
				defaultValue: false,
				tip: "info.room_static",
			},
			{
				label: "entities.motion_presence",
				key: "room_motion_presence",
				defaultValue: false,
				tip: "info.room_motion",
			},
			{
				label: "entities.target_presence",
				key: "room_target_presence",
				defaultValue: false,
				tip: "info.room_target_presence",
			},
			{
				label: "entities.mmwave",
				key: "room_mmwave",
				defaultValue: false,
				tip: "info.room_mmwave",
			},
			{
				label: "entities.target_count",
				key: "target_count",
				defaultValue: false,
				tip: "info.room_target_count",
			},
		];
		const ZONE_TOGGLES: ToggleRowDescriptor[] = [
			{
				label: "entities.zone_presence",
				key: "zone_presence",
				defaultValue: true,
				tip: "info.zone_presence",
				disabled: needsCal,
			},
			{
				label: "entities.zone_target_count",
				key: "zone_target_count",
				defaultValue: false,
				tip: "info.zone_target_count",
				disabled: needsCal,
			},
		];
		const TARGET_TOGGLES: ToggleRowDescriptor[] = [
			{
				label: "entities.xy",
				key: "target_xy",
				defaultValue: false,
				tip: "info.xy",
				disabled: needsCal,
			},
			{
				label: "entities.active",
				key: "target_active",
				defaultValue: false,
				tip: "info.active",
			},
			{
				label: "entities.target_signal",
				key: "target_signal",
				defaultValue: false,
				tip: "info.target_signal",
			},
			{
				label: "entities.target_zone",
				key: "target_zone",
				defaultValue: false,
				tip: "info.target_zone",
			},
		];
		const ENV_TOGGLES: ToggleRowDescriptor[] = [
			{
				label: "entities.illuminance",
				key: "env_illuminance",
				defaultValue: false,
				tip: "info.illuminance",
			},
			{
				label: "entities.humidity",
				key: "env_humidity",
				defaultValue: false,
				tip: "info.humidity",
			},
			{
				label: "entities.temperature",
				key: "env_temperature",
				defaultValue: false,
				tip: "info.temperature",
			},
			{
				label: "entities.co2",
				key: "env_co2",
				defaultValue: false,
				tip: "info.co2",
			},
		];
		const rows = (descriptors: ToggleRowDescriptor[]) =>
			descriptors.map((d) =>
				this.renderEntityToggleRow(d, isOn, entityToggleHandler),
			);

		const rateOptions = this._getOptions().rateOptions;

		return html`
      <div class="settings-section">
        <epp-card heading=${this.localize("entities.room_level")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          ${rows(ROOM_TOGGLES)}
        </epp-card>
        <epp-card heading=${this.localize("entities.zone_level")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${rows(ZONE_TOGGLES)}
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(o.zoneUpdateRateMs ?? this.zoneUpdateRateMs)}
              .options=${rateOptions}
              .disabled=${!anyZoneOn}
              @selected=${(e: CustomEvent<{ value: string }>) => {
								const val = e.detail.value;
								if (val) {
									const v = Number(val);
									this._overrides.zoneUpdateRateMs = v;
									this._fireChange("zoneUpdateRateMs", v);
									// requestUpdate is required: ha-select doesn't keep the
									// user's pick visible on its own — only `.value` does, and
									// _fireChange alone won't re-evaluate the binding once the
									// parent's `dirty` prop is already true.
									this.requestUpdate();
								}
							}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </epp-card>
        <epp-card heading=${this.localize("entities.target_level")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${rows(TARGET_TOGGLES)}
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(o.targetUpdateRateMs ?? this.targetUpdateRateMs)}
              .options=${rateOptions}
              .disabled=${!anyTargetOn}
              @selected=${(e: CustomEvent<{ value: string }>) => {
								const val = e.detail.value;
								if (val) {
									const v = Number(val);
									this._overrides.targetUpdateRateMs = v;
									this._fireChange("targetUpdateRateMs", v);
									// requestUpdate is required: see zone update rate handler.
									this.requestUpdate();
								}
							}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </epp-card>
        <epp-card heading=${this.localize("settings.environmental")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${rows(ENV_TOGGLES)}
        </epp-card>
      </div>
    `;
	}

	renderLogging() {
		const logLevelOptions = this._getOptions().logLevelOptions;

		return html`
      <div class="settings-section">
        <epp-card>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          ${LOG_CATEGORIES.map((c) => {
						const overrides = this._overrides.logLevels || {};
						const current = overrides[c.key] ?? this.logLevels[c.key] ?? "None";
						return html`
              <div class="setting-row">
                <label>${this.localize(c.label)}</label>
                <ha-select
                  .value=${current}
                  .options=${logLevelOptions}
                  @selected=${(e: CustomEvent<{ value: string }>) => {
										const val = e.detail.value;
										if (!val || val === current) return;
										if (!this._overrides.logLevels)
											this._overrides.logLevels = {};
										this._overrides.logLevels[c.key] = val;
										this._fireChange("logLevels", {
											...(this.logLevels || {}),
											...this._overrides.logLevels,
										});
										// requestUpdate keeps the captured `current` in sync with
										// `_overrides.logLevels[c.key]` so the `val === current`
										// early return works on subsequent picks.
										this.requestUpdate();
									}}
                  @closed=${this._stopClosed}
                ></ha-select>
                <button
								type="button"
								class="setting-info"
								aria-label=${this.localize("settings.reset_to_default")}
								title=${this.localize("settings.reset_to_default")}
								@click=${(e: Event) => {
									e.stopPropagation();
									if (!this._overrides.logLevels)
										this._overrides.logLevels = {};
									this._overrides.logLevels[c.key] = "None";
									this._fireChange("logLevels", {
										...(this.logLevels || {}),
										...this._overrides.logLevels,
									});
									// requestUpdate refreshes the ha-select's `.value` binding
									// so the dropdown displays "None" after reset.
									this.requestUpdate();
								}}
							><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(c.tip))}
              </div>
            `;
					})}
        </epp-card>
      </div>
    `;
	}

	renderLed() {
		const mode = this._overrides.ledMode ?? this.ledMode;
		const showBrightness = mode !== "Manual Control";
		const showPresenceColor =
			mode === "Presence" || mode === "Environmental + Presence";
		const modes = this._getOptions().ledModes;
		const brightness = this._overrides.ledBrightness ?? this.ledBrightness;
		const color = this._overrides.ledPresenceColor ?? this.ledPresenceColor;

		return html`
      <div class="settings-section">
        <epp-card heading=${this.localize("settings.led")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          <div class="setting-row">
            <label>${this.localize("settings.led_mode")}</label>
            <ha-select class="wide-select" .value=${mode} .options=${modes} @selected=${(
							e: CustomEvent<{ value: string }>,
						) => {
							const val = e.detail.value;
							if (val) {
								this._overrides.ledMode = val;
								this._fireChange("ledMode", val);
								// requestUpdate is required: changing mode shows/hides the
								// brightness slider and presence color rows downstream.
								this.requestUpdate();
							}
						}} @closed=${this._stopClosed}>
            </ha-select>
            ${this.infoTip(this.localize("info.led_mode"))}
          </div>
          ${
						showBrightness
							? html`
          <div class="setting-row">
            <label>${this.localize("settings.led_brightness")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" data-led-brightness min="0.1" max="1" step="0.05" .value=${String(brightness)} @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const v = parseFloat(el.value);
							this._overrides.ledBrightness = v;
							this._setSettingValue(el, `${Math.round(v * 100)}%`);
							this._fireChange("ledBrightness", v);
						}} /><span class="setting-value">${Math.round(brightness * 100)}%</span></span>
            ${this.resetBtn(SLIDER_DEFAULTS.ledBrightness, "ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>`
							: nothing
					}
          ${
						showPresenceColor
							? html`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${color} @input=${(e: Event) => {
							const v = (e.target as HTMLInputElement).value;
							this._overrides.ledPresenceColor = v;
							this._fireChange("ledPresenceColor", v);
						}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>`
							: nothing
					}
        </epp-card>
      </div>
    `;
	}

	renderRelay() {
		const {
			relayTriggerModes: TRIGGER_MODES,
			relayContactModes: CONTACT_MODES,
		} = this._getOptions();

		const currentTrigger =
			this._overrides.relayTriggerMode ?? this.relayTriggerMode;
		const currentContact =
			this._overrides.relayContactMode ?? this.relayContactMode;
		const isAutomatic = currentTrigger !== "disabled";

		return html`
      <div class="settings-section">
        <epp-card heading=${this.localize("settings.relay")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          <div class="setting-row">
            <label>${this.localize("settings.relay_trigger_mode")}</label>
            <ha-select class="wide-select"
              .value=${currentTrigger}
              .options=${TRIGGER_MODES}
              @selected=${(e: CustomEvent<{ value: string }>) => {
								const val = e.detail.value;
								if (!val || val === currentTrigger) return;
								this._overrides.relayTriggerMode = val;
								this._fireChange("relayTriggerMode", val);
								// requestUpdate is required: switching to/from "disabled"
								// shows or hides the contact mode row, and refreshes the
								// captured `currentTrigger` for the early-return check.
								this.requestUpdate();
							}}
              @closed=${this._stopClosed}
            ></ha-select>
            ${this.infoTip(this.localize("info.relay_trigger_mode"))}
          </div>
          ${
						isAutomatic
							? html`
            <div class="setting-row">
              <label>${this.localize("settings.relay_contact_mode")}</label>
              <ha-select class="wide-select"
                .value=${currentContact}
                .options=${CONTACT_MODES}
                @selected=${(e: CustomEvent<{ value: string }>) => {
									const val = e.detail.value;
									if (!val || val === currentContact) return;
									this._overrides.relayContactMode = val;
									this._fireChange("relayContactMode", val);
									// requestUpdate refreshes the captured `currentContact` so
									// the `val === currentContact` early return reflects the
									// latest override on subsequent picks.
									this.requestUpdate();
								}}
                @closed=${this._stopClosed}
              ></ha-select>
              ${this.infoTip(this.localize("info.relay_contact_mode"))}
            </div>
          `
							: nothing
					}
        </epp-card>
      </div>
    `;
	}

	renderSaveCancelButtons() {
		// Reset the local-edit flag once the parent has flipped its `dirty`
		// prop back to false (post-save). Keeping the flag in sync this way
		// avoids a stale-enabled save button without needing updated() hooks
		// that would race with concurrent re-renders.
		if (!this.dirty && this._localDirty && !this.saving) {
			this._localDirty = false;
		}
		const isDirty = this.dirty || this._localDirty;
		return renderSaveCancelBar({
			saving: this.saving,
			dirty: isDirty,
			localize: this.localize,
			onSave: () => this._emitSave(),
			onCancel: () => {
				this.dispatchEvent(
					new CustomEvent("cancel", {
						bubbles: true,
						composed: true,
					}),
				);
			},
		});
	}

	/**
	 * Emit a `save` event with the full settings payload to be sent to
	 * `eppgrid/set_settings`.
	 *
	 * The bulk of the payload is driven by `SETTINGS_FIELD_MAP` — iterating the
	 * map guarantees every registered field is included, so a new field added to
	 * the map automatically flows through here. Only the five auto-distance fields
	 * and the two merge-object fields (`entities`, `log_levels`) are handled
	 * explicitly because they require logic beyond a plain override-or-saved read.
	 *
	 * Adding a new settings field requires updating ONLY `SETTINGS_DEFAULTS` in
	 * `lib/settings-defaults.ts` (plus the map entry). The drift regression test in
	 * `epp-settings-view.test.ts` enforces that every map key appears in the
	 * emitted payload.
	 */
	private _emitSave() {
		const o = this._overrides;

		const targetAuto = o.targetAutoDistance ?? this.targetAutoDistance;
		const staticAuto = o.staticAutoDistance ?? this.staticAutoDistance;

		// When auto is on, compute distances from room geometry instead of using
		// the stored manual values which may be stale.
		let targetMaxDist = o.targetMaxDistance ?? this.targetMaxDistance;
		let staticMinDist = o.staticMinDistance ?? this.staticMinDistance;
		let staticMaxDist = o.staticMaxDistance ?? this.staticMaxDistance;

		if (targetAuto || staticAuto) {
			const { autoRange } = this._getGeometry();
			if (targetAuto) {
				targetMaxDist = autoRange > 0 ? Math.min(autoRange, 6) : 6;
			}
			if (staticAuto) {
				staticMinDist = 0.3;
				staticMaxDist = autoRange > 0 ? Math.min(autoRange, 16) : 16;
			}
		}

		// Pre-computed values for the five fields that need special treatment.
		// All other map fields fall through to the generic override-or-saved read.
		const EXPLICIT: Record<string, unknown> = {
			target_auto_distance: targetAuto,
			target_max_distance: targetMaxDist,
			static_auto_distance: staticAuto,
			static_min_distance: staticMinDist,
			static_max_distance: staticMaxDist,
			// Merge: saved base + live overrides (never replace wholesale)
			entities: { ...this.entitiesConfig, ...(o.entities || {}) },
			log_levels: { ...this.logLevels, ...(o.logLevels || {}) },
		};

		// Build the payload from SETTINGS_FIELD_MAP so a new field added to the
		// map is automatically included here without any manual edits.
		const detail: Record<string, unknown> = {};
		for (const [key, prop] of SETTINGS_FIELD_MAP) {
			if (key in EXPLICIT) {
				detail[key] = EXPLICIT[key];
			} else {
				// prop is "_camelCase"; the settings-view exposes the same name
				// without the leading underscore as a public reactive property.
				const publicProp = prop.slice(1); // "_motionTimeout" → "motionTimeout"
				detail[key] =
					o[publicProp] ??
					(this as unknown as Record<string, unknown>)[publicProp];
			}
		}

		this.dispatchEvent(
			new CustomEvent("save", {
				detail,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireChange(key: string, value: unknown) {
		this.dispatchEvent(
			new CustomEvent("setting-change", {
				detail: { key, value },
				bubbles: true,
				composed: true,
			}),
		);
		this._fireDirty();
	}

	private _fireDirty() {
		// Track edits in a non-reactive flag — the panel re-renders at 5Hz so
		// the save button picks up the change on the next frame without us
		// having to call requestUpdate (which would race with the panel's
		// concurrent re-render and crash Lit).
		this._localDirty = true;
		this.dispatchEvent(
			new CustomEvent("dirty", {
				bubbles: true,
				composed: true,
			}),
		);
	}
}

if (!customElements.get("epp-settings-view")) {
	customElements.define("epp-settings-view", EppSettingsView);
}
