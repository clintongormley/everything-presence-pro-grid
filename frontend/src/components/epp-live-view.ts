import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import "./epp-live-sidebar.js";

export interface LiveViewSensorState {
	occupancy: boolean;
	static_presence: boolean;
	motion_presence: boolean;
	target_presence: boolean;
	illuminance: number | null;
	temperature: number | null;
	humidity: number | null;
	co2: number | null;
}

export interface LiveViewZoneState {
	occupancy: Record<number, boolean>;
	target_counts: Record<number, number>;
	frame_count: number;
}

export class EppLiveView extends LitElement {
	@property({ attribute: false }) perspective: number[] | null = null;

	@property({ attribute: false }) sensorState: LiveViewSensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		illuminance: null,
		temperature: null,
		humidity: null,
		co2: null,
	};

	@property({ attribute: false }) zoneState: LiveViewZoneState = {
		occupancy: {},
		target_counts: {},
		frame_count: 0,
	};

	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];

	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	/** Pre-rendered header template from the panel */
	@property({ attribute: false }) headerTemplate: TemplateResult | typeof nothing = nothing;

	/** Pre-rendered grid template (live grid or uncalibrated FOV) from the panel */
	@property({ attribute: false }) gridTemplate: TemplateResult | typeof nothing = nothing;

	/** Pre-rendered backend debug log template from the panel */
	@property({ attribute: false }) debugLogTemplate: TemplateResult | typeof nothing = nothing;

	@state() showMenu = false;

	static styles = css`
    :host {
      display: block;
    }

    .panel {
      padding: 24px;
      max-width: 1100px;
      margin: 0 auto;
      font-size: 14px;
    }

    .editor-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .grid-container {
      position: relative;
      display: inline-block;
      max-width: 100%;
      overflow: visible;
    }

    .zone-sidebar {
      width: 240px;
      max-height: 70vh;
      background: var(--card-background-color, #fff);
      border-left: 1px solid var(--divider-color, #e0e0e0);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: hidden;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 4px 4px 12px;
    }

    .sidebar-title {
      font-size: 15px;
      font-weight: 600;
      padding: 10px 12px 8px;
      color: var(--primary-text-color, #212121);
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

	render() {
		return html`
      <div class="panel" @click=${(e: MouseEvent) => {
				if (!(e.target instanceof Element)) return;
				if (this.showMenu && !e.target.closest(".sidebar-menu-wrapper")) {
					this.showMenu = false;
				}
			}}>
        ${this.headerTemplate}
        <div class="editor-layout">
          <div style="flex: 1; min-width: 0;">
            ${nothing}
            <div class="grid-container">
              ${this.gridTemplate}
            </div>
            ${this.debugLogTemplate}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this.localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${() => {
									this.showMenu = !this.showMenu;
								}}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${
									this.showMenu
										? html`
                  <div class="sidebar-menu" @click=${() => {
										this.showMenu = false;
									}}>
                    ${
											this.perspective
												? html`
                      <button class="sidebar-menu-item" @click=${() => {
												this._fireNavigate("editor", "zones");
											}}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${() => {
												this._fireNavigate("editor", "furniture");
											}}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.furniture")}
                      </button>
                    `
												: nothing
										}
                    <button class="sidebar-menu-item" @click=${() => {
											this._fireNavigate("settings");
										}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${() => {
											this._fireAction("change-placement");
										}}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.room_calibration")}
                    </button>
                    ${
											this.perspective
												? html`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${() => {
												this._fireAction("show-delete-calibration");
											}}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.delete_calibration")}
                      </button>
                    `
												: nothing
										}
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${() => {
											this._fireAction("show-template-save");
										}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("dialogs.save_template")}
                    </button>
                    <button class="sidebar-menu-item" @click=${() => {
											this._fireAction("show-template-load");
										}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("dialogs.load_template")}
                    </button>
                  </div>
                `
										: nothing
								}
              </div>
            </div>
            <epp-live-sidebar
              .sensorState=${this.sensorState}
              .zoneState=${this.zoneState}
              .zoneConfigs=${this.zoneConfigs}
              .perspective=${this.perspective}
              .localize=${this.localize}
              @view-change=${(e: CustomEvent) => {
								this._fireNavigate(e.detail.view, e.detail.sidebarTab);
							}}
            ></epp-live-sidebar>
          </div>
        </div>
      </div>
    `;
	}

	private _fireNavigate(view: string, sidebarTab?: string) {
		this.dispatchEvent(
			new CustomEvent("navigate-view", {
				detail: { view, sidebarTab },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireAction(action: string) {
		this.dispatchEvent(
			new CustomEvent("live-view-action", {
				detail: { action },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

if (!customElements.get("epp-live-view")) {
	customElements.define("epp-live-view", EppLiveView);
}
