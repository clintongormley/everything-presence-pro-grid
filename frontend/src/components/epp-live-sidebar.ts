import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import { MAX_ZONES } from "../lib/grid.js";

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

export interface ZoneState {
	occupancy: Record<number, boolean>;
	target_counts: Record<number, number>;
	frame_count: number;
}

export class EppLiveSidebar extends LitElement {
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

	@property({ attribute: false }) zoneState: ZoneState = {
		occupancy: {},
		target_counts: {},
		frame_count: 0,
	};

	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];

	@property({ attribute: false }) perspective: number[] | null = null;

	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	@state() private _expandedSensorInfo: string | null = null;

	static styles = css`
    :host {
      display: block;
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

    .live-sensor-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 13px;
    }

    .live-sensor-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .live-sensor-dot.on {
      background: #4CAF50;
    }

    .live-sensor-dot.off {
      background: var(--disabled-text-color, #bbb);
    }

    .live-sensor-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .live-sensor-state {
      font-size: 12px;
      color: var(--secondary-text-color, #888);
      flex-shrink: 0;
    }

    .live-sensor-state.detected {
      color: #4CAF50;
      font-weight: 500;
    }

    .live-sensor-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      margin-left: auto;
    }

    .live-sensor-info-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #aaa);
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .live-sensor-info-btn:hover {
      color: var(--primary-color, #03a9f4);
    }

    .live-sensor-info-text {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      padding: 2px 12px 8px 30px;
      line-height: 1.4;
    }

    .live-nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      padding: 6px 4px;
      font-size: 13px;
      border-radius: 6px;
      text-align: left;
    }

    .live-nav-link:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
  `;

	render() {
		const ss = this.sensorState;
		const zs = this.zoneState;

		const sensorDefs: {
			id: string;
			label: string;
			on: boolean;
			info: string;
		}[] = [
			{
				id: "occupancy",
				label: this.localize("live.occupancy"),
				on: ss.occupancy,
				info: this.localize("info.occupancy"),
			},
			{
				id: "static",
				label: this.localize("live.static_presence"),
				on: ss.static_presence,
				info: this.localize("info.static_presence"),
			},
			{
				id: "motion",
				label: this.localize("live.motion_presence"),
				on: ss.motion_presence,
				info: this.localize("info.motion_presence"),
			},
			{
				id: "target",
				label: this.localize("live.target_presence"),
				on: ss.target_presence,
				info: this.localize("info.target_presence"),
			},
		];

		// Zone occupancy entries: always include rest-of-room, plus configured zones
		const zoneDefs: typeof sensorDefs = [];
		for (let i = 0; i < MAX_ZONES; i++) {
			const zone = this.zoneConfigs[i];
			if (!zone) continue;
			const slot = i + 1;
			const occupied = zs.occupancy[slot] ?? false;
			const count = zs.target_counts[slot] ?? 0;
			zoneDefs.push({
				id: `zone_${slot}`,
				label: zone.name,
				on: occupied,
				info: this.localize("info.zone_occupancy", { slot, count }),
			});
		}
		// Rest-of-room zone (slot 0) — always shown
		const rorOccupied = zs.occupancy[0] ?? false;
		const rorCount = zs.target_counts[0] ?? 0;
		zoneDefs.push({
			id: "zone_0",
			label: this.localize("sidebar.rest_of_room"),
			on: rorOccupied,
			info: this.localize("info.rest_of_room_occupancy", {
				count: rorCount,
			}),
		});

		// Environment sensors
		const envSensors: { id: string; label: string; value: string }[] = [];
		if (ss.illuminance !== null)
			envSensors.push({
				id: "illuminance",
				label: this.localize("entities.illuminance"),
				value: `${ss.illuminance.toFixed(1)} lux`,
			});
		if (ss.temperature !== null)
			envSensors.push({
				id: "temperature",
				label: this.localize("entities.temperature"),
				value: `${ss.temperature.toFixed(1)} °C`,
			});
		if (ss.humidity !== null)
			envSensors.push({
				id: "humidity",
				label: this.localize("entities.humidity"),
				value: `${ss.humidity.toFixed(1)} %`,
			});
		if (ss.co2 !== null)
			envSensors.push({
				id: "co2",
				label: this.localize("entities.co2"),
				value: `${Math.round(ss.co2)} ppm`,
			});

		return html`
      <div style="padding: 8px 0;">
        <div class="live-section-header">${this.localize("live.presence")}</div>
        ${sensorDefs.map(
					(s) => html`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${s.on ? "on" : "off"}"></div>
            <span class="live-sensor-label">${s.label}</span>
            <span class="live-sensor-state ${s.on ? "detected" : ""}">${s.on ? this.localize("live.detected") : this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${() => {
								this._expandedSensorInfo =
									this._expandedSensorInfo === s.id ? null : s.id;
							}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${
						this._expandedSensorInfo === s.id
							? html`
            <div class="live-sensor-info-text">${s.info}</div>
          `
							: nothing
					}
        `,
				)}

        ${
					this.perspective
						? html`
        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        <button class="live-section-header live-section-link" @click=${() => {
					this.dispatchEvent(
						new CustomEvent("view-change", {
							detail: { view: "editor", sidebarTab: "zones" },
							bubbles: true,
							composed: true,
						}),
					);
				}}>${this.localize("sidebar.detection_zones")}</button>
        ${zoneDefs.map(
					(s) => html`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${s.on ? "on" : "off"}"></div>
            <span class="live-sensor-label">${s.label}</span>
            <span class="live-sensor-state ${s.on ? "detected" : ""}">${s.on ? this.localize("live.detected") : this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${() => {
								this._expandedSensorInfo =
									this._expandedSensorInfo === s.id ? null : s.id;
							}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${
						this._expandedSensorInfo === s.id
							? html`
            <div class="live-sensor-info-text">${s.info}</div>
          `
							: nothing
					}
        `,
				)}
        `
						: nothing
				}

        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        ${
					envSensors.length
						? html`
          <div class="live-section-header">${this.localize("live.environment")}</div>
          ${envSensors.map(
						(s) => html`
            <div class="live-sensor-row">
              <span class="live-sensor-label">${s.label}</span>
              <span class="live-sensor-value">${s.value}</span>
            </div>
          `,
					)}
        `
						: nothing
				}

      </div>
    `;
	}
}

customElements.define("epp-live-sidebar", EppLiveSidebar);
