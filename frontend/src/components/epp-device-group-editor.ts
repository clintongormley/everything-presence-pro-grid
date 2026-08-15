import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import "../ui/epp-button.js";
import "../ui/epp-card.js";
import "../ui/epp-field.js";
import "./epp-device-source-list.js";
import "./epp-sensor-list.js";
import { saveCancelBarStyles } from "../styles.js";
import type {
	DeviceGroup,
	DeviceGroupSource,
	DeviceGroupZoneGroup,
	DeviceGroupZoneMember,
	DeviceInfo,
} from "../types.js";

interface EditorDraft {
	id: string | null;
	name: string;
	area_id: string | null;
	sourceMacs: string[];
	zone_groups: DeviceGroupZoneGroup[];
	excludedPresence: string[];
	excludedZones: DeviceGroupZoneMember[];
	excludedZoneGroups: string[];
}

/** Canonical string for a draft, order-insensitive where order is irrelevant
 *  (source toggles, group members, exclusion sets), so dirty-tracking ignores reorderings. */
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
		excludedPresence: [...d.excludedPresence].sort(),
		excludedZones: [...d.excludedZones]
			.map((m) => `${m.mac}|${m.zone_index}`)
			.sort(),
		excludedZoneGroups: [...d.excludedZoneGroups].sort(),
	});
}

/**
 * Editor for one device group. Fires `save` (full payload) or `cancel`, and
 * `dirty-changed` ({dirty}) whenever the form diverges from / returns to its
 * loaded state. Deletion is handled from the list view's per-group kebab.
 */
export class EppDeviceGroupEditor extends LitElement {
	static styles = [
		saveCancelBarStyles,
		css`
		/* Fill the device-groups view's bounded .content and pin the Cancel/Save
		   .save-cancel-bar to the bottom while the form scrolls inside .editor-scroll.
		   Fill-height chain: :host -> ha-card -> .card-content -> .editor-scroll
		   (flex columns). Applies at all widths (desktop + mobile). */
		:host {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-height: 0;
		}
		ha-card {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-height: 0;
		}
		.card-content {
			padding: var(--epp-space-4, 16px);
			display: flex;
			flex-direction: column;
			flex: 1;
			min-height: 0;
		}
		/* The form rows live in .editor-scroll, which carries the column layout +
		   16px row gap that .card-content used to apply directly (before .card-content
		   became the fill-height flex parent for the scroll region + pinned actions).
		   .editor-scroll fills the card and scrolls; the .save-cancel-bar footer pins
		   below it with its own top divider. */
		.editor-scroll {
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-4, 16px);
			flex: 1;
			min-height: 0;
			overflow-y: auto;
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
		.save-cancel-bar {
			/* Shared chrome (display/justify/align/border-top) is in saveCancelBarStyles.
			   Consistent footer with the editor sidebar / settings Save/Cancel bars:
			   a transparent footer with a 1px top divider. Negative margins break it
			   out of .card-content's 16px padding so the line spans the card width;
			   the buttons re-inset via padding. */
			gap: var(--epp-space-2, 8px);
			flex-shrink: 0;
			margin: 0 calc(-1 * var(--epp-space-4, 16px)) calc(-1 * var(--epp-space-4, 16px));
			padding: var(--epp-space-3, 12px) var(--epp-space-4, 16px);
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
		excludedPresence: [],
		excludedZones: [],
		excludedZoneGroups: [],
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
						excludedPresence: this.existingGroup.excluded_presence ?? [],
						excludedZones: this.existingGroup.excluded_zones ?? [],
						excludedZoneGroups: this.existingGroup.excluded_zone_groups ?? [],
					}
				: {
						id: null,
						name: "",
						area_id: null,
						sourceMacs: [],
						zone_groups: [],
						excludedPresence: [],
						excludedZones: [],
						excludedZoneGroups: [],
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
							<epp-device-source-list
								.availableDevices=${this.availableDevices}
								.selectedMacs=${this._draft.sourceMacs}
								.missingSources=${this._missingSources()}
								@source-toggled=${(e: CustomEvent) => {
									e.stopPropagation();
									this._toggleSource(
										e.detail.mac as string,
										e.detail.on as boolean,
									);
								}}
							></epp-device-source-list>
						</div>

						<div class="section">
							<epp-sensor-list
								.sources=${this._draftSources()}
								.zoneGroups=${this._draft.zone_groups}
								.excludedPresence=${this._draft.excludedPresence}
								.excludedZones=${this._draft.excludedZones}
								.excludedZoneGroups=${this._draft.excludedZoneGroups}
								@zone-groups-changed=${(e: CustomEvent) => {
									e.stopPropagation();
									this._update({ zone_groups: e.detail.zone_groups });
								}}
								@exclusions-changed=${(e: CustomEvent) => {
									e.stopPropagation();
									this._update({
										excludedPresence: e.detail.excluded_presence,
										excludedZones: e.detail.excluded_zones,
										excludedZoneGroups: e.detail.excluded_zone_groups,
									});
								}}
							></epp-sensor-list>
						</div>
					</div>

					<div class="save-cancel-bar">
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

	// Sources still referenced by the group whose device no longer exists
	// (backend reports available: false). Shown as removable rows so the user
	// can drop them.
	private _missingSources(): { mac: string; name: string }[] {
		if (!this.existingGroup) return [];
		return this.existingGroup.sources
			.filter((s) => !s.available && this._draft.sourceMacs.includes(s.mac))
			.map((s) => ({ mac: s.mac, name: s.name }));
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
		// as "Unknown device" on reload). Also drop any excluded zones for that mac.
		this._update({
			sourceMacs: this._draft.sourceMacs.filter((m) => m !== mac),
			zone_groups: this._draft.zone_groups
				.map((g) => ({ ...g, members: g.members.filter((m) => m.mac !== mac) }))
				.filter((g) => g.members.length > 0),
			excludedZones: this._draft.excludedZones.filter((m) => m.mac !== mac),
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
					excluded_presence: this._draft.excludedPresence,
					excluded_zones: this._draft.excludedZones,
					excluded_zone_groups: this._draft.excludedZoneGroups,
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

if (!customElements.get("epp-device-group-editor")) {
	customElements.define("epp-device-group-editor", EppDeviceGroupEditor);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-group-editor": EppDeviceGroupEditor;
	}
}
