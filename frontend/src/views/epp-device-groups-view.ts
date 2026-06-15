import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import "../ui/epp-button.js";
import "../ui/epp-card.js";
import "../components/epp-confirm-dialog.js";
import "../components/epp-device-group-editor.js";
import "../components/epp-kebab-menu.js";
import type { DeviceGroupsController } from "../controllers/device-groups-controller.js";
import {
	EDIT_DELETE_KEBAB_ITEMS,
	exposedSensorChips,
} from "../lib/device-groups-labels.js";
import { chipStyles } from "../styles.js";
import type { DeviceGroup, DeviceGroupSource, DeviceInfo } from "../types.js";

export class EppDeviceGroupsView extends LitElement {
	static styles = [
		chipStyles,
		css`
		:host { display: block; padding: 16px; }
		.content {
			max-width: 600px;
			margin: 0 auto;
		}
		.card-header {
			font-size: var(--epp-font-xl, 18px);
			font-weight: 400;
			line-height: 48px;
			padding: var(--epp-space-2, 8px) var(--epp-space-4, 16px) 0;
			color: var(--ha-card-header-color, var(--primary-text-color, #212121));
		}
		.card-content {
			padding: var(--epp-space-4, 16px);
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-3, 12px);
		}
		/* epp-card supplies the surface (border/radius/padding); .group-card is the
		   flex row laid out inside its default slot. */
		.group-card {
			display: flex;
			align-items: flex-start;
			gap: var(--epp-space-3, 12px);
		}
		.group-info { flex: 1; min-width: 0; }
		.group-name {
			font-size: var(--epp-font-base, 14px);
			font-weight: var(--epp-weight-semibold, 600);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.group-devices {
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			margin-top: var(--epp-space-1, 4px);
		}
		.group-warning {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: var(--epp-space-1, 4px);
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.group-warning ha-icon { --mdc-icon-size: 18px; }
		.group-sensors {
			display: flex;
			align-items: baseline;
			flex-wrap: wrap;
			gap: 6px;
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			margin-top: 6px;
		}
		.empty {
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			text-align: center;
			padding: var(--epp-space-2, 8px) 0;
		}
		.footer {
			display: flex;
			justify-content: flex-end;
			margin-top: var(--epp-space-1, 4px);
		}
		epp-card { display: block; }
		epp-kebab-menu { flex-shrink: 0; margin: -6px -8px -6px 0; }

		/* Mobile: fill the panel height so the editor's Save/Cancel bar can pin to
		   the bottom of the screen while its body scrolls. :host and the .content
		   wrapper become a flex column that fills the height handed down by the
		   panel (.tab-layout > epp-device-groups-view), letting the editor inside
		   establish its own scroll/pin regions. .content drops its 600px reading
		   cap and goes full-width — full-width is fine on a phone. The list mode
		   reuses the same .content, but its single ha-card simply sits at the top
		   and the view scrolls naturally (overflow inherited from .tab-layout), so
		   a long list still scrolls rather than clipping. Placed AFTER the base
		   rules so it wins on source order (mobile @media before base rules go
		   silently dead). */
		@media (max-width: 819px) {
			:host {
				display: flex;
				flex-direction: column;
				min-height: 0;
			}
			.content {
				flex: 1;
				min-height: 0;
				display: flex;
				flex-direction: column;
				width: 100%;
				max-width: none;
			}
		}
	`,
	];

	@property({ attribute: false }) hass!: { [key: string]: unknown };
	@property({ attribute: false }) controller!: DeviceGroupsController;
	@property({ attribute: false }) availableDevices: DeviceInfo[] = [];

	@state() private _groups: DeviceGroup[] = [];
	@state() private _editingGroup: DeviceGroup | null = null;
	@state() private _creatingNew = false;
	// True while the open editor has unsaved changes; mirrored up to the panel
	// (`form-dirty-changed`) so its nav guard warns before leaving.
	@state() private _editorDirty = false;
	// The single themed confirm/alert dialog, configured per use.
	@state() private _dialog:
		| { kind: "delete"; id: string }
		| { kind: "error"; heading: string; message: string }
		| null = null;

	private _unsub: (() => void) | null = null;

	connectedCallback() {
		super.connectedCallback();
		this._unsub = this.controller.onChange((groups) => {
			this._groups = groups;
		});
		// Seed from the controller's cache. The controller is panel-owned and
		// subscribe() is idempotent — after switching tabs and back, the
		// remounted view re-subscribes but no fresh event fires, so without this
		// the list would render empty until the next change.
		this._groups = this.controller.groups;
		this.controller.subscribe();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._unsub?.();
	}

	render() {
		const body =
			this._editingGroup || this._creatingNew
				? this._renderEditor()
				: this._renderList();
		return html`${body}${this._renderDialog()}`;
	}

	private _renderEditor() {
		return html`
			<div class="content">
				<epp-device-group-editor
					.hass=${this.hass}
					.availableDevices=${this.availableDevices}
					.existingGroup=${this._editingGroup}
					.sourcesByMac=${this._sourcesByMac()}
					@save=${this._handleSave}
					@cancel=${this._handleCancel}
					@dirty-changed=${this._onEditorDirty}
				></epp-device-group-editor>
			</div>
		`;
	}

	private _renderList() {
		return html`
			<div class="content">
				<ha-card>
					<div class="card-header">Device Groups</div>
					<div class="card-content">
						${
							this._groups.length === 0
								? html`<p class="empty">No device groups yet.</p>`
								: this._groups.map((g) => this._renderGroupCard(g))
						}
						<div class="footer">
							<epp-button
								variant="primary"
								data-testid="create-group"
								@click=${() => {
									this._creatingNew = true;
								}}
							>
								Add a device group
							</epp-button>
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}

	private _renderGroupCard(g: DeviceGroup) {
		const devices = g.sources
			.map((s) => s.name)
			.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
			.join(", ");
		const sensors = exposedSensorChips(g.exposed_entities);
		const hasMissing = g.sources.some((s) => !s.available);
		return html`
			<epp-card>
				<div class="group-card">
					<div class="group-info">
						<div class="group-name">${g.name}</div>
						${
							hasMissing
								? html`<div class="group-warning" data-testid="group-warning">
										<ha-icon icon="mdi:alert"></ha-icon>
										Some source devices no longer exist
									</div>`
								: nothing
						}
						${
							devices
								? html`<div class="group-devices">${devices}</div>`
								: nothing
						}
						${
							sensors.length
								? html`<div class="group-sensors">
										${sensors.map(
											(s) =>
												html`<span
													class="chip ${s.kind === "zone" ? "zone" : ""}"
													data-testid="sensor-chip"
													>${s.name}</span
												>`,
										)}
									</div>`
								: nothing
						}
					</div>
					<epp-kebab-menu
						.items=${EDIT_DELETE_KEBAB_ITEMS}
						@item-select=${(e: CustomEvent<{ id: string }>) =>
							this._onKebab(g, e.detail.id)}
					></epp-kebab-menu>
				</div>
			</epp-card>
		`;
	}

	private _onKebab(g: DeviceGroup, id: string) {
		if (id === "edit") this._editingGroup = g;
		else if (id === "delete") this._dialog = { kind: "delete", id: g.id };
	}

	// The editor reports its dirty state; mirror it and bubble a
	// `form-dirty-changed` up to the panel so its nav guard can warn before a
	// tab switch / browser navigation / page unload.
	private _onEditorDirty(e: CustomEvent<{ dirty: boolean }>) {
		e.stopPropagation();
		this._setDirty(e.detail.dirty);
	}

	private _setDirty(dirty: boolean) {
		if (dirty === this._editorDirty) return;
		this._editorDirty = dirty;
		this.dispatchEvent(
			new CustomEvent("form-dirty-changed", {
				detail: { dirty },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _closeEditor() {
		this._setDirty(false);
		this._editingGroup = null;
		this._creatingNew = false;
	}

	private _renderDialog() {
		const d = this._dialog;
		const cfg =
			d?.kind === "delete"
				? {
						heading: "Delete device group?",
						message: "This removes the group and all its helper entities.",
						confirmLabel: "Delete",
						danger: true,
						hideCancel: false,
					}
				: d?.kind === "error"
					? {
							heading: d.heading,
							message: d.message,
							confirmLabel: "OK",
							danger: false,
							hideCancel: true,
						}
					: {
							heading: "",
							message: "",
							confirmLabel: "OK",
							danger: false,
							hideCancel: false,
						};
		return html`<epp-confirm-dialog
			.open=${d !== null}
			.heading=${cfg.heading}
			.message=${cfg.message}
			.confirmLabel=${cfg.confirmLabel}
			.danger=${cfg.danger}
			.hideCancel=${cfg.hideCancel}
			@confirm=${this._onDialogConfirm}
			@cancel=${this._onDialogCancel}
		></epp-confirm-dialog>`;
	}

	private _onDialogConfirm() {
		const d = this._dialog;
		this._dialog = null;
		if (!d) return;
		if (d.kind === "delete") this._deleteById(d.id);
		// "error" just dismisses.
	}

	private _onDialogCancel() {
		this._dialog = null;
	}

	private _sourcesByMac(): Record<string, DeviceGroupSource> {
		const map: Record<string, DeviceGroupSource> = {};
		// Saved-group sources first (cover a device no longer reported by the
		// manager), then every managed device's current source state so the
		// editor has zones for any device the moment it is toggled.
		for (const g of this._groups) {
			for (const s of g.sources) map[s.mac] = s;
		}
		for (const s of this.controller.candidateSources) map[s.mac] = s;
		return map;
	}

	private async _handleSave(e: CustomEvent) {
		e.stopPropagation();
		const d = e.detail;
		try {
			if (d.id) {
				await this.controller.update(d);
			} else {
				await this.controller.create(d.name, d.sources, d.area_id);
			}
			this._closeEditor();
		} catch (err) {
			console.error("Failed to save device group", err);
			this._dialog = {
				kind: "error",
				heading: "Save failed",
				message: err instanceof Error ? err.message : String(err),
			};
		}
	}

	private _handleCancel(e: CustomEvent) {
		e.stopPropagation();
		// Cancel is an explicit discard — close immediately (and clear the dirty
		// flag so navigation isn't blocked). The unsaved-changes warning is only
		// for *navigating away* (tab switch / browser nav), handled by the panel.
		this._closeEditor();
	}

	private async _deleteById(id: string) {
		try {
			await this.controller.delete(id);
			this._closeEditor();
		} catch (err) {
			console.error("Failed to delete device group", err);
			this._dialog = {
				kind: "error",
				heading: "Delete failed",
				message: err instanceof Error ? err.message : String(err),
			};
		}
	}
}

customElements.define("epp-device-groups-view", EppDeviceGroupsView);

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-groups-view": EppDeviceGroupsView;
	}
}
