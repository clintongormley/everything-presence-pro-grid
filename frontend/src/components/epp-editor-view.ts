import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import type { FurnitureItem } from "../lib/furniture.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import type { LocalZoneInfo } from "./epp-zone-sidebar.js";
import "./epp-zone-sidebar.js";
import "./epp-furniture-sidebar.js";

export class EppEditorView extends LitElement {
	@property({ attribute: false }) sidebarTab: "zones" | "furniture" = "zones";

	// Zone sidebar props
	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ attribute: false }) roomType: string = "normal";
	@property({ type: Number }) roomTrigger = 0;
	@property({ type: Number }) roomRenew = 0;
	@property({ type: Number }) roomTimeout = 0;
	@property({ type: Number }) roomHandoffTimeout = 0;
	@property({ type: Boolean }) roomEntryPoint = false;
	@property({ attribute: false }) localZoneState: Map<number, LocalZoneInfo> =
		new Map();

	// Furniture sidebar props
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ attribute: false }) hass: any = null;
	@property({ type: Boolean }) showCustomIconPicker = false;
	@property({ attribute: false }) customIconValue = "";

	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	/** Pre-rendered header template from the panel */
	@property({ attribute: false }) headerTemplate:
		| TemplateResult
		| typeof nothing = nothing;

	/** Pre-rendered grid template (epp-grid with all bindings) from the panel */
	@property({ attribute: false }) gridTemplate:
		| TemplateResult
		| typeof nothing = nothing;

	/** Pre-rendered debug log template from the panel */
	@property({ attribute: false }) debugLogTemplate:
		| TemplateResult
		| typeof nothing = nothing;

	/** Pre-rendered save/cancel buttons template from the panel */
	@property({ attribute: false }) saveCancelTemplate:
		| TemplateResult
		| typeof nothing = nothing;

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

    .sidebar-title {
      font-size: 15px;
      font-weight: 600;
      padding: 10px 12px 8px;
      color: var(--primary-text-color, #212121);
    }
  `;

	render() {
		return html`
      <div class="panel" @click=${(e: Event) => {
				const el = e.target as HTMLElement;
				if (!el.closest(".grid") && !el.closest(".zone-sidebar")) {
					this.dispatchEvent(
						new CustomEvent("editor-panel-click", {
							bubbles: true,
							composed: true,
						}),
					);
				}
			}}>
        ${this.headerTemplate}

        <div class="editor-layout">
          <div style="flex: 1; min-width: 0;">
            ${nothing}
            <!-- Grid -->
            <div class="grid-container" @click=${(e: Event) => {
							if (!(e.target as HTMLElement).closest(".furniture-item")) {
								this.dispatchEvent(
									new CustomEvent("editor-grid-container-click", {
										bubbles: true,
										composed: true,
									}),
								);
							}
						}}>
              ${this.gridTemplate}
            </div>
            ${this.debugLogTemplate}
          </div>

          <!-- Sidebar -->
          <div class="zone-sidebar">
            <div class="sidebar-title">${this.sidebarTab === "furniture" ? this.localize("sidebar.furniture") : this.localize("sidebar.detection_zones")}</div>
            ${
							this.sidebarTab === "zones"
								? html`<epp-zone-sidebar
									.zoneConfigs=${this.zoneConfigs}
									.activeZone=${this.activeZone}
									.roomType=${this.roomType}
									.roomTrigger=${this.roomTrigger}
									.roomRenew=${this.roomRenew}
									.roomTimeout=${this.roomTimeout}
									.roomHandoffTimeout=${this.roomHandoffTimeout}
									.roomEntryPoint=${this.roomEntryPoint}
									.localZoneState=${this.localZoneState}
									.localize=${this.localize}
								></epp-zone-sidebar>`
								: html`<epp-furniture-sidebar
									.furniture=${this.furniture}
									.selectedFurnitureId=${this.selectedFurnitureId}
									.hass=${this.hass}
									.localize=${this.localize}
									.showCustomIconPicker=${this.showCustomIconPicker}
									.customIconValue=${this.customIconValue}
								></epp-furniture-sidebar>`
						}
            ${this.saveCancelTemplate}
          </div>
        </div>
      </div>
    `;
	}
}

if (!customElements.get("epp-editor-view")) {
	customElements.define("epp-editor-view", EppEditorView);
}
