import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import "../ui/epp-button.js";
import "../ui/epp-card.js";
import "../ui/epp-field.js";
import "../ui/epp-toggle.js";
import "./epp-zone-merge-list.js";
import { exposedSensorChips } from "../lib/device-groups-labels.js";
import { deriveExposedEntities } from "../lib/device-groups-projection.js";
import { chipStyles } from "../styles.js";
import type {
	DeviceGroup,
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceInfo,
} from "../types.js";

interface EditorDraft {
	id: string | null;
	name: string;
	area_id: string | null;
	sourceMacs: string[];
	zone_groups: DeviceGroupZoneGroup[];
}

/** Canonical string for a draft, order-insensitive where order is irrelevant
 *  (source toggles, group members), so dirty-tracking ignores reorderings. */
function canon(d: EditorDraft): string {
	return JSON.stringify({
		name: d.name,
		area_id: d.area_id,
		sourceMacs: [...d.sourceMacs].sort(),
		zone_groups: [...d.zone_groups]
			.map((g) => ({
				id: g.id,
				name: g.name,
				members: g.members.map((m) => `${m.mac}|${m.zone_index}`).sort(),
			}))
			.sort((a, b) => a.id.localeCompare(b.id)),
	});
}

/**
 * Editor for one device group. Fires `save` (full payload) or `cancel`, and
 * `dirty-changed` ({dirty}) whenever the form diverges from / returns to its
 * loaded state. Deletion is handled from the list view's per-group kebab.
 */
export class EppDeviceGroupEditor extends LitElement {
	static styles = [
		chipStyles,
		css`
		:host { display: block; }
		.card-content {
			padding: var(--epp-space-4, 16px);
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-4, 16px);
		}
		/* The form rows live in .editor-scroll, which carries the column layout +
		   16px row gap that .card-content used to apply directly. On desktop
		   .card-content has two children (.editor-scroll, .actions) with the same
		   16px gap between them, so the spacing above the actions bar is unchanged
		   (16px gap + .actions margin-top 4px, exactly as before the wrapper). */
		.editor-scroll {
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-4, 16px);
		}
		.field { display: block; }
		ha-area-picker {
			display: block;
			width: 100%;
		}
		.section h3 {
			margin: 0 0 var(--epp-space-2, 8px) 0;
			font-size: var(--epp-font-md, 15px);
			font-weight: var(--epp-weight-semibold, 600);
		}
		/* Kept as an in-place tokenised container rather than <epp-card>: it's a
		   tight inset list of toggle rows (2px 12px padding, internal row
		   dividers, 10px radius), not a card-padded surface — epp-card bakes in
		   16px padding + 16px radius on its shadow .card with no external
		   override, which would loosen the row list and change its look. */
		.source-box {
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-md, 10px);
			padding: 2px var(--epp-space-3, 12px);
		}
		.source-row {
			display: flex;
			align-items: center;
			gap: var(--epp-space-3, 12px);
			padding: 6px 0;
			min-height: 36px;
		}
		.source-row + .source-row {
			border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
		}
		.source-name {
			flex: 1;
			min-width: 0;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.source-row.missing .source-name {
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.missing-tag {
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			font-size: var(--epp-font-sm, 13px);
		}
		.missing-warning {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: 6px;
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.missing-warning ha-icon { --mdc-icon-size: 18px; }
		.chips { display: flex; flex-wrap: wrap; gap: var(--epp-space-1, 4px); }
		.actions {
			display: flex;
			gap: var(--epp-space-2, 8px);
			justify-content: space-between;
			align-items: center;
			margin-top: var(--epp-space-1, 4px);
		}

		/* Mobile: pin the Cancel/Save .actions bar to the bottom of the screen and
		   let the form body scroll inside .editor-scroll. The fill-height chain is
		   :host -> ha-card -> .card-content (all flex columns filling the height
		   handed down by the view), then .editor-scroll grows + scrolls while
		   .actions stays put. .editor-scroll has NO desktop rule, so desktop layout
		   is byte-identical. Placed AFTER the base rules so it wins on source order
		   (mobile @media before base rules go silently dead). */
		@media (max-width: 819px) {
			:host {
				display: flex;
				flex-direction: column;
				min-height: 0;
			}
			ha-card {
				display: flex;
				flex-direction: column;
				flex: 1;
				min-height: 0;
			}
			.card-content {
				flex: 1;
				min-height: 0;
			}
			.editor-scroll {
				flex: 1;
				min-height: 0;
				overflow-y: auto;
			}
			.actions {
				flex-shrink: 0;
			}
		}
	`,
	];

	@property({ attribute: false }) hass!: { [key: string]: unknown };
	@property({ attribute: false }) availableDevices: DeviceInfo[] = [];
	@property({ attribute: false }) existingGroup: DeviceGroup | null = null;
	// Map of every known source by MAC, used to render the zone merge UI for
	// any selected source. Populated by the parent view from the candidate
	// sources (every managed device) so a device's zones show as soon as it is
	// toggled — not only after the group is saved.
	@property({ attribute: false }) sourcesByMac: Record<
		string,
		DeviceGroupSource
	> = {};

	@state() private _draft: EditorDraft = {
		id: null,
		name: "",
		area_id: null,
		sourceMacs: [],
		zone_groups: [],
	};

	// Canonical snapshot of the loaded form; the form is "dirty" when the
	// current draft diverges from it. Last dirty value emitted, so we only
	// fire `dirty-changed` on a transition.
	private _pristine = canon(this._draft);
	private _emittedDirty = false;

	willUpdate(changed: Map<string, unknown>) {
		if (changed.has("existingGroup")) {
			this._draft = this.existingGroup
				? {
						id: this.existingGroup.id,
						name: this.existingGroup.name,
						area_id: this.existingGroup.area_id,
						sourceMacs: this.existingGroup.sources.map((s) => s.mac),
						zone_groups: this.existingGroup.zone_groups,
					}
				: {
						id: null,
						name: "",
						area_id: null,
						sourceMacs: [],
						zone_groups: [],
					};
			this._pristine = canon(this._draft);
		}
	}

	updated() {
		const dirty = this._isDirty();
		if (dirty !== this._emittedDirty) {
			this._emittedDirty = dirty;
			this.dispatchEvent(
				new CustomEvent("dirty-changed", {
					detail: { dirty },
					bubbles: true,
					composed: true,
				}),
			);
		}
	}

	private _isDirty(): boolean {
		return canon(this._draft) !== this._pristine;
	}

	render() {
		const missing = this._missingSources();
		return html`
			<ha-card>
				<div class="card-content">
					<div class="editor-scroll">
						<div class="field">${this._renderNameField()}</div>
						<div class="field">
							<ha-area-picker
								.hass=${this.hass}
								.value=${this._draft.area_id ?? ""}
								@value-changed=${(e: CustomEvent) => {
									e.stopPropagation();
									this._update({ area_id: (e.detail.value as string) || null });
								}}
							></ha-area-picker>
						</div>

						<div class="section">
							<h3>Source devices</h3>
							<div class="source-box">
								${this.availableDevices.map((d) => this._renderSourceRow(d))}
								${missing.map((s) => this._renderMissingSourceRow(s))}
							</div>
							${
								missing.length
									? html`<div class="missing-warning" data-testid="missing-warning">
											<ha-icon icon="mdi:alert"></ha-icon>
											Some source devices no longer exist. Turn them off and save
											to remove them.
										</div>`
									: nothing
							}
						</div>

						<div class="section">
							<epp-zone-merge-list
								.sources=${this._draftSources()}
								.zoneGroups=${this._draft.zone_groups}
								@zone-groups-changed=${(e: CustomEvent) => {
									e.stopPropagation();
									this._update({ zone_groups: e.detail.zone_groups });
								}}
							></epp-zone-merge-list>
						</div>

						${this._renderSensorsPreview()}
					</div>

					<div class="actions">
						<epp-button variant="text" @click=${this._cancel}>Cancel</epp-button>
						<epp-button
							variant="primary"
							.disabled=${!(this._canSave() && this._isDirty())}
							@click=${this._save}
							>Save</epp-button
						>
					</div>
				</div>
			</ha-card>
		`;
	}

	// Live preview of the entities this group will create — presence sensors
	// (the union of enabled slots across sources) plus zone entities — computed
	// with the same projection the backend uses.
	private _renderSensorsPreview() {
		const exposed = deriveExposedEntities(
			this._draftSources(),
			this._draft.zone_groups,
		);
		if (exposed.presence.length === 0 && exposed.zones.length === 0) {
			return nothing;
		}
		return html`
			<div class="section">
				<h3>Sensors that will be created</h3>
				<div class="chips" data-testid="sensors-preview">
					${exposedSensorChips(exposed).map(
						(s) =>
							html`<span
								class="chip ${s.kind === "zone" ? "zone" : ""}"
								data-testid="sensor-chip"
								>${s.name}</span
							>`,
					)}
				</div>
			</div>
		`;
	}

	// Name field. epp-field picks ha-input / ha-textfield / native input
	// internally and emits one normalized `value-changed`.
	private _renderNameField() {
		return html`
			<epp-field
				data-testid="name-field"
				type="text"
				.label=${"Device name"}
				.value=${this._draft.name}
				@value-changed=${(e: CustomEvent) => {
					e.stopPropagation();
					this._update({ name: e.detail.value as string });
				}}
			></epp-field>
		`;
	}

	// One row per device: name on the left, an HA toggle on the right.
	private _renderSourceRow(d: DeviceInfo) {
		const label = d.area ? `${d.name} (${d.area})` : d.name;
		return html`<div class="source-row">
			<span class="source-name">${label}</span>
			${this._toggleControl(d.mac)}
		</div>`;
	}

	// Per-source on/off toggle. The handler closes over `mac` so the right
	// device toggles regardless of the event target. epp-field/epp-toggle wraps
	// ha-switch / checkbox internally; data-mac stays on the host for targeting.
	private _toggleControl(mac: string) {
		const checked = this._draft.sourceMacs.includes(mac);
		return html`<epp-toggle
			data-testid="device-toggle"
			data-mac=${mac}
			.checked=${checked}
			@value-changed=${(e: CustomEvent) => {
				e.stopPropagation();
				this._toggleSource(mac, e.detail.value as boolean);
			}}
		></epp-toggle>`;
	}

	// Sources still referenced by the group whose device no longer exists
	// (backend reports available: false). Shown as removable rows so the user
	// can drop them.
	private _missingSources(): { mac: string; name: string }[] {
		if (!this.existingGroup) return [];
		return this.existingGroup.sources
			.filter((s) => !s.available && this._draft.sourceMacs.includes(s.mac))
			.map((s) => ({ mac: s.mac, name: s.name }));
	}

	private _renderMissingSourceRow(s: { mac: string; name: string }) {
		return html`<div class="source-row missing" data-testid="missing-source">
			<span class="source-name"
				>${s.name}<span class="missing-tag"> — no longer available</span></span
			>
			${this._toggleControl(s.mac)}
		</div>`;
	}

	private _draftSources(): DeviceGroupSource[] {
		// Resolve currently-selected MACs against known sources (every managed
		// device is present in sourcesByMac), so toggling a device immediately
		// surfaces its zones in the merge UI.
		return this._draft.sourceMacs
			.map((mac) => this.sourcesByMac[mac])
			.filter((s): s is DeviceGroupSource => Boolean(s));
	}

	private _canSave(): boolean {
		return this._draft.name.trim() !== "" && this._draft.sourceMacs.length >= 1;
	}

	private _update(patch: Partial<EditorDraft>) {
		this._draft = { ...this._draft, ...patch };
	}

	private _toggleSource(mac: string, on: boolean) {
		if (on) {
			this._update({ sourceMacs: [...this._draft.sourceMacs, mac] });
			return;
		}
		// Removing a source: also drop it from any merged zone, and drop merged
		// zones left with no members — otherwise the saved group keeps zone
		// members referencing a device that is no longer a source (they'd show
		// as "Unknown device" on reload).
		this._update({
			sourceMacs: this._draft.sourceMacs.filter((m) => m !== mac),
			zone_groups: this._draft.zone_groups
				.map((g) => ({ ...g, members: g.members.filter((m) => m.mac !== mac) }))
				.filter((g) => g.members.length > 0),
		});
	}

	private _save() {
		this.dispatchEvent(
			new CustomEvent("save", {
				detail: {
					id: this._draft.id,
					name: this._draft.name.trim(),
					sources: this._draft.sourceMacs,
					area_id: this._draft.area_id,
					zone_groups: this._draft.zone_groups,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _cancel() {
		this.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
	}
}

customElements.define("epp-device-group-editor", EppDeviceGroupEditor);

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-group-editor": EppDeviceGroupEditor;
	}
}
