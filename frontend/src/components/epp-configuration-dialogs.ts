import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { renderConfigurationThumbnail } from "../lib/configuration-thumbnail.js";
import type { FurnitureItem } from "../lib/furniture.js";
import { getGridRoomMetrics, type SensorFov } from "../lib/room-geometry.js";
import type { Zone0Config, ZoneConfig } from "../lib/zone-defaults.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { buttonStyles, dialogStyles } from "../styles.js";

/**
 * Saved-configuration entry as cached by `GridStateController`. Declared
 * structurally here (rather than importing the controller's type) so the
 * component has no dependency on the controllers layer.
 */
export interface ConfigurationEntry {
	name: string;
	grid: number[];
	// Length-8 zone slots: slot 0 = Zone0Config (room boundary),
	// slots 1-7 = named ZoneConfig | null.
	zones: (Zone0Config | ZoneConfig | null)[];
	roomWidth: number;
	roomDepth: number;
	furniture?: FurnitureItem[];
	settings?: Record<string, unknown>;
}

/**
 * Configuration backup/restore dialogs.
 *
 * Renders the "backup configuration" name dialog and the "restore
 * configuration" card grid (with SVG thumbnails and FOV-aware room
 * metrics). Pure view component: all persistence stays with the panel /
 * GridStateController — the component only emits events:
 *
 *   - `configuration-name-change` (detail: string) — backup name input edits
 *   - `configuration-save` — backup dialog Save clicked
 *   - `configuration-load` (detail: name) — restore card activated
 *   - `configuration-delete` (detail: name) — card delete button clicked
 *   - `backup-cancel` — backup dialog dismissed
 *   - `restore-close` — restore dialog dismissed
 */
export class EppConfigurationDialogs extends LitElement {
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;
	@property({ type: Boolean }) showBackup = false;
	@property({ type: Boolean }) showRestore = false;
	@property({ attribute: false }) configurations: ConfigurationEntry[] = [];
	@property({ type: String }) configurationName = "";
	// FOV inputs for the card-size metrics — computed by the panel
	// (perspective + computeMaxRangeMm + getSensorFov) and passed down.
	@property({ attribute: false }) perspective: number[] | null = null;
	@property({ type: Number }) maxRangeMm = 0;
	@property({ attribute: false }) sensorFov: SensorFov | null = null;

	static styles = [
		dialogStyles,
		buttonStyles,
		css`
      .overlay-help {
        font-size: 13px;
        color: var(--secondary-text-color, #757575);
        margin: 0;
      }
    `,
	];

	// Configuration card metrics cache — keyed by configuration object reference.
	// Invalidated when perspective or max-range changes (FOV inputs).
	// fetchConfigurations returns fresh objects each call, so stale entries drop
	// naturally via WeakMap GC when the old array is replaced.
	private _configurationMetricsCache = new WeakMap<
		object,
		{
			perspective: number[] | null;
			maxRangeMm: number;
			widthM: number;
			depthM: number;
		}
	>();

	private _getConfigurationMetrics(t: {
		grid: number[];
		roomWidth: number;
		roomDepth: number;
	}): { widthM: number; depthM: number } {
		const perspective = this.perspective;
		const maxRangeMm = this.maxRangeMm;
		const cached = this._configurationMetricsCache.get(t);
		if (
			cached &&
			cached.perspective === perspective &&
			cached.maxRangeMm === maxRangeMm
		) {
			return { widthM: cached.widthM, depthM: cached.depthM };
		}
		const metrics = getGridRoomMetrics(
			new Uint8Array(t.grid),
			t.roomWidth,
			perspective,
			this.sensorFov,
			maxRangeMm,
		);
		const widthM = metrics ? metrics.widthM : t.roomWidth / 1000;
		const depthM = metrics ? metrics.depthM : t.roomDepth / 1000;
		this._configurationMetricsCache.set(t, {
			perspective,
			maxRangeMm,
			widthM,
			depthM,
		});
		return { widthM, depthM };
	}

	private _dispatch(type: string, detail?: unknown): void {
		this.dispatchEvent(
			new CustomEvent(type, { detail, bubbles: true, composed: true }),
		);
	}

	render() {
		return html`
      ${this.showBackup ? this._renderBackupDialog() : nothing}
      ${this.showRestore ? this._renderRestoreDialog() : nothing}
    `;
	}

	private _renderBackupDialog() {
		return html`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this.localize("dialogs.backup_configuration")}</h3>
          <input
            type="text"
            class="configuration-name-input"
            placeholder="${this.localize("dialogs.configuration_name")}"
            .value=${this.configurationName}
            @input=${(e: Event) => {
							this._dispatch(
								"configuration-name-change",
								(e.target as HTMLInputElement).value,
							);
						}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${() => this._dispatch("backup-cancel")}
            >${this.localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this.configurationName.trim()}
              @click=${() => this._dispatch("configuration-save")}
            >${this.localize("common.save")}</button>
          </div>
        </div>
      </div>
    `;
	}

	private _renderRestoreDialog() {
		// Only show configurations whose zone array fits the current slot
		// schema (length = 8). Older or malformed entries are filtered out
		// because loading them would fail.
		const configurations = this.configurations.filter(
			(t: { zones?: unknown }) =>
				Array.isArray(t.zones) && t.zones.length === 8,
		);
		return html`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this.localize("dialogs.restore_configuration")}</h3>
          ${
						configurations.length === 0
							? html`<p class="overlay-help">${this.localize("dialogs.no_configurations")}</p>`
							: html`<div class="configuration-card-grid">
                  ${configurations.map(
										(t) => html`
                    <div class="configuration-card"
                      role="button"
                      tabindex="0"
                      @click=${() => this._dispatch("configuration-load", t.name)}
                      @keydown=${(e: KeyboardEvent) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													this._dispatch("configuration-load", t.name);
												}
											}}
                    >
                      <button class="configuration-card-delete"
                        type="button"
                        aria-label="${this.localize("common.delete")}"
                        @click=${(e: Event) => {
													e.stopPropagation();
													this._dispatch("configuration-delete", t.name);
												}}
                        @keydown=${(e: KeyboardEvent) => {
													e.stopPropagation();
												}}
                      >
                        <ha-icon icon="mdi:close"></ha-icon>
                      </button>
                      <div class="configuration-card-thumbnail">
                        ${renderConfigurationThumbnail(
													t.grid,
													// New schema: zones is length-8 with slot 0 =
													// Zone0Config and slots 1-7 = named zones. The
													// thumbnail only uses the named zones (for cell
													// colouring, indexed by zoneId-1), so strip slot 0.
													(t.zones?.slice(1) as (ZoneConfig | null)[]) ??
														new Array(7).fill(null),
													t.roomWidth,
													t.roomDepth,
													t.furniture ?? [],
												)}
                      </div>
                      <div class="configuration-card-info">
                        <div class="configuration-card-name">${t.name}</div>
                        <div class="configuration-card-size">${(() => {
													// Same FOV-aware metrics the live footer uses; cached
													// per configuration to avoid re-scanning the grid
													// every render.
													const { widthM, depthM } =
														this._getConfigurationMetrics(t);
													return `${this.localize.formatNumber(widthM, 1)}m × ${this.localize.formatNumber(depthM, 1)}m`;
												})()}</div>
                      </div>
                    </div>
                  `,
									)}
                </div>`
					}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${() => this._dispatch("restore-close")}
            >${this.localize("common.close")}</button>
          </div>
        </div>
      </div>
    `;
	}
}

if (!customElements.get("epp-configuration-dialogs")) {
	customElements.define("epp-configuration-dialogs", EppConfigurationDialogs);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-configuration-dialogs": EppConfigurationDialogs;
	}
}
