import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import {
	autoDetectionRange,
	getGridRoomMetrics,
} from "../lib/room-geometry.js";
import {
	accordionStyles,
	buttonStyles,
	settingStyles,
	toggleStyles,
	tooltipStyles,
} from "../styles.js";

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

	@property({ type: Boolean }) targetAutoRange = true;
	@property({ type: Number }) targetMaxDistance = 6.0;
	@property({ type: Boolean }) staticAutoRange = true;
	@property({ type: Number }) staticMinDistance = 0.3;
	@property({ type: Number }) staticMaxDistance = 16.0;

	@property({ attribute: false }) openAccordions: Set<string> = new Set();

	@property({ attribute: false }) perspective: number[] | null = null;
	@property({ type: Number }) roomWidth = 0;
	@property({ type: Number }) roomDepth = 0;
	@property({ attribute: false }) grid: Uint8Array = new Uint8Array(0);

	@property({ type: Boolean }) saving = false;
	@property({ type: Boolean }) dirty = false;

	@property({ attribute: false }) reportingConfig: Record<string, boolean> = {};
	@property({ attribute: false }) offsetsConfig: Record<string, number> = {};

	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	static styles = [
		accordionStyles,
		buttonStyles,
		settingStyles,
		toggleStyles,
		tooltipStyles,
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

      .save-cancel-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        border-top: 1px solid var(--divider-color, #eee);
        margin-top: auto;
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
		];

		return html`
      <div class="settings-container" @input=${() => {
				this._fireDirty();
			}} @change=${() => {
				this._fireDirty();
			}}>
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
				return this.renderReporting();
			default:
				return nothing;
		}
	}

	renderEnvOffset(
		label: string,
		reading: number | null,
		offsetKey: string,
		min: number,
		max: number,
		step: number,
		unit: string,
		precision: number,
		tip: string,
	) {
		const savedOffsets: Record<string, number> = this.offsetsConfig || {};
		const offset = savedOffsets[offsetKey] ?? 0;
		// reading already has the saved offset applied by the coordinator,
		// so subtract it to get the raw value
		const raw = reading != null ? reading - offset : null;
		const adjusted = raw != null ? (raw + offset).toFixed(precision) : "\u2014";
		return html`
      <div class="setting-row">
        <label>${label}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${offsetKey} .value=${String(offset)} min=${min} max=${max} step=${step} @input=${(
					e: Event,
				) => {
					const el = e.target as HTMLInputElement;
					const off = parseFloat(el.value);
					const val = raw != null ? (raw + off).toFixed(precision) : "\u2014";
					el.nextElementSibling!.textContent = val;
				}} /><span class="setting-value">${adjusted}</span> ${unit}</span>
        ${this.infoTip(tip)}
      </div>
    `;
	}

	infoTip(text: string) {
		return html`<span class="setting-info"
      @click=${(e: Event) => {
				e.stopPropagation();
				const icon = e.currentTarget as HTMLElement;
				const tip = icon.querySelector(".setting-info-tooltip") as HTMLElement;
				if (!tip) return;
				const wasOpen = tip.style.display === "block";
				// Close any other open tooltips
				this.shadowRoot!.querySelectorAll(".setting-info-tooltip").forEach(
					(t) => {
						(t as HTMLElement).style.display = "none";
					},
				);
				if (wasOpen) return;
				const rect = icon.getBoundingClientRect();
				tip.style.display = "block";
				tip.style.left = `${Math.max(8, Math.min(rect.right - 240, window.innerWidth - 256))}px`;
				tip.style.top = `${rect.bottom + 6}px`;
			}}
    ><ha-icon icon="mdi:help-circle-outline"></ha-icon><span class="setting-info-tooltip">${text}</span></span>`;
	}

	renderDetectionRanges() {
		const autoRange = autoDetectionRange(
			this.roomWidth,
			this.roomDepth,
			this.perspective,
			this.grid,
		);
		const metrics = getGridRoomMetrics(
			this.grid,
			this.roomWidth,
			this.perspective,
		);
		const targetVal = this.targetAutoRange
			? autoRange > 0
				? Math.min(autoRange, 6)
				: 6
			: this.targetMaxDistance;
		const staticMaxVal = this.staticAutoRange
			? autoRange > 0
				? Math.min(autoRange, 16)
				: 16
			: this.staticMaxDistance;
		const autoStyle = "opacity: 0.5; pointer-events: none;";
		return html`
      <div class="settings-section">
        ${metrics ? html`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${metrics.furthestM}m</span></p>` : nothing}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" ?checked=${this.targetAutoRange}
                @change=${(e: Event) => {
									const checked = (e.target as HTMLInputElement).checked;
									if (!checked) {
										this.targetMaxDistance = targetVal;
										this._fireChange("targetMaxDistance", targetVal);
									}
									this.targetAutoRange = checked;
									this._fireChange("targetAutoRange", checked);
								}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoRange ? autoStyle : ""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(targetVal)} min="0.5" max="6" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								this.targetMaxDistance = Number(el.value);
								this._fireChange("targetMaxDistance", Number(el.value));
								el.nextElementSibling!.textContent = el.value;
							}} /><span class="setting-value">${targetVal}</span><span class="setting-unit">m</span></span>
            ${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" ?checked=${this.staticAutoRange}
                @change=${(e: Event) => {
									const checked = (e.target as HTMLInputElement).checked;
									if (!checked) {
										this.staticMaxDistance = staticMaxVal;
										this._fireChange("staticMaxDistance", staticMaxVal);
									}
									this.staticAutoRange = checked;
									this._fireChange("staticAutoRange", checked);
								}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoRange ? autoStyle : ""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoRange ? 0.3 : this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								let v = Number(el.value);
								if (v >= this.staticMaxDistance) {
									v = this.staticMaxDistance - 0.1;
									el.value = String(v);
								}
								this.staticMinDistance = v;
								this._fireChange("staticMinDistance", v);
								el.nextElementSibling!.textContent = String(v);
							}} /><span class="setting-value">${this.staticAutoRange ? 0.3 : this.staticMinDistance}</span><span class="setting-unit">m</span></span>
            ${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoRange ? autoStyle : ""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(staticMaxVal)} min="2.4" max="16" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								let v = Number(el.value);
								if (v <= this.staticMinDistance) {
									v = this.staticMinDistance + 0.1;
									el.value = String(v);
								}
								this.staticMaxDistance = v;
								this._fireChange("staticMaxDistance", v);
								el.nextElementSibling!.textContent = String(v);
							}} /><span class="setting-value">${staticMaxVal}</span><span class="setting-unit">m</span></span>
            ${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `;
	}

	renderSensitivities() {
		return html`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" value="5" min="0" max="120" step="1" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							el.nextElementSibling!.textContent = el.value;
						}} /><span class="setting-value">5</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" value="30" min="0" max="120" step="1" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							el.nextElementSibling!.textContent = el.value;
						}} /><span class="setting-value">30</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" value="3" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							el.nextElementSibling!.textContent = el.value;
						}} /><span class="setting-value">3</span><span class="setting-unit"></span></span>
            ${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" value="3" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							el.nextElementSibling!.textContent = el.value;
						}} /><span class="setting-value">3</span><span class="setting-unit"></span></span>
            ${this.infoTip(this.localize("info.renew_threshold"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"), this.sensorState.illuminance, "illuminance", -500, 500, 1, "lux", 0, this.localize("info.illuminance_offset"))}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"), this.sensorState.humidity, "humidity", -50, 50, 0.1, "%", 1, this.localize("info.humidity_offset"))}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"), this.sensorState.temperature, "temperature", -20, 20, 0.1, "\u00b0C", 1, this.localize("info.temperature_offset"))}
        </div>
      </div>
    `;
	}

	renderReporting() {
		// Load saved reporting state from config
		const saved: Record<string, boolean> = this.reportingConfig || {};
		const isOn = (key: string, fallback: boolean) => saved[key] ?? fallback;

		return html`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.occupancy")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_occupancy" ?checked=${isOn("room_occupancy", true)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_occupancy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.static_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_static_presence" ?checked=${isOn("room_static_presence", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_static"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.motion_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_motion_presence" ?checked=${isOn("room_motion_presence", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_motion"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_target_presence" ?checked=${isOn("room_target_presence", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_target_count" ?checked=${isOn("room_target_count", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_count"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.zone_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.zone_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="zone_presence" ?checked=${isOn("zone_presence", true)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="zone_target_count" ?checked=${isOn("zone_target_count", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_target_count"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.target_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.xy")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="target_xy" ?checked=${isOn("target_xy", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.xy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.active")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="target_active" ?checked=${isOn("target_active", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.active"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.illuminance")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_illuminance" ?checked=${isOn("env_illuminance", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.illuminance"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.humidity")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_humidity" ?checked=${isOn("env_humidity", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.humidity"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.temperature")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_temperature" ?checked=${isOn("env_temperature", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.temperature"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.co2")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_co2" ?checked=${isOn("env_co2", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.co2"))}
          </div>
        </div>
      </div>
    `;
	}

	renderSaveCancelButtons() {
		return html`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${() => {
						this.dispatchEvent(
							new CustomEvent("cancel", {
								bubbles: true,
								composed: true,
							}),
						);
					}}
        >${this.localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this.saving || !this.dirty}
          @click=${() => {
						this.dispatchEvent(
							new CustomEvent("save", {
								bubbles: true,
								composed: true,
							}),
						);
					}}
        >${this.saving ? this.localize("common.saving") : this.localize("common.save")}</button>
      </div>
    `;
	}

	private _fireChange(key: string, value: unknown) {
		this.dispatchEvent(
			new CustomEvent("setting-change", {
				detail: { key, value },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireDirty() {
		this.dispatchEvent(
			new CustomEvent("dirty", {
				bubbles: true,
				composed: true,
			}),
		);
	}
}

customElements.define("epp-settings-view", EppSettingsView);
