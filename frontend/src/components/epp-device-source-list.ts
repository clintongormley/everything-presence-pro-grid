import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import "../ui/epp-icon-button.js";
import "../ui/epp-tooltip.js";
import type { DeviceInfo } from "../types.js";
import { renderSelect } from "../ui/select.js";

interface MissingSource {
	mac: string;
	name: string;
}

/**
 * Devices section of the Device Groups editor: an "Add a device" dropdown
 * (only devices not yet added) above a list of the added devices, each with an
 * online/offline badge and a delete button. Devices that no longer exist show
 * warning-styled with a delete. Emits `source-toggled` {mac, on} — add = on:true,
 * delete = on:false.
 */
export class EppDeviceSourceList extends LitElement {
	static styles = css`
		:host { display: block; }
		.add-picker { display: block; width: 100%; margin-bottom: var(--epp-space-2, 8px); }
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
		.empty {
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			font-size: var(--epp-font-sm, 13px);
			padding: 6px 0;
			margin: 0;
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
		.badge { font-size: var(--epp-font-sm, 13px); white-space: nowrap; }
		.badge.online { color: var(--epp-success, var(--success-color, #43a047)); }
		.badge.offline { color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
		.badge.missing { color: var(--epp-warning, var(--warning-color, #ff9800)); }
	`;

	@property({ attribute: false }) availableDevices: DeviceInfo[] = [];
	@property({ attribute: false }) selectedMacs: string[] = [];
	@property({ attribute: false }) missingSources: MissingSource[] = [];

	private _label(d: DeviceInfo): string {
		return d.area ? `${d.name} (${d.area})` : d.name;
	}

	render() {
		const selected = new Set(this.selectedMacs);
		const added = this.availableDevices.filter((d) => selected.has(d.mac));
		const candidates = this.availableDevices.filter(
			(d) => !selected.has(d.mac),
		);
		const empty = added.length === 0 && this.missingSources.length === 0;
		return html`
			${candidates.length ? this._renderAddPicker(candidates) : nothing}
			<div class="source-box">
				${empty ? html`<p class="empty" data-testid="no-devices">No devices added yet.</p>` : nothing}
				${added.map((d) => this._renderAddedRow(d))}
				${this.missingSources.map((s) => this._renderMissingRow(s))}
			</div>
			${
				this.missingSources.length
					? html`<div class="missing-warning" data-testid="missing-warning">
							<ha-icon icon="mdi:alert"></ha-icon>
							Some source devices no longer exist. Remove them and save.
						</div>`
					: nothing
			}
		`;
	}

	private _renderAddPicker(candidates: DeviceInfo[]) {
		const opts = candidates.map((d) => ({
			value: d.mac,
			label: this._label(d),
		}));
		if (customElements.get("ha-select")) {
			return renderSelect({
				className: "add-picker",
				testId: "add-picker",
				label: "Add a device",
				value: "",
				options: opts,
				onSelect: (mac) => this._add(mac),
			});
		}
		return html`<select
			class="add-picker"
			data-testid="add-picker"
			data-value=""
			@change=${(e: Event) => this._add((e.target as HTMLSelectElement).value)}
		>
			<option value="" disabled selected>Add a device</option>
			${opts.map((o) => html`<option value=${o.value}>${o.label}</option>`)}
		</select>`;
	}

	// A native <select>'s value can't be re-bound in the same render as its
	// rebuilt <option>s; after a pick, force it back to the placeholder here.
	updated() {
		const sel =
			this.renderRoot.querySelector<HTMLSelectElement>("select.add-picker");
		if (sel && sel.value !== "") sel.value = "";
	}

	private _add(mac: string) {
		if (mac) this._emitSourceToggled(mac, true);
	}

	private _renderAddedRow(d: DeviceInfo) {
		const badge = d.available
			? html`<span class="badge online" data-testid="device-badge">● Online</span>`
			: html`<span class="badge offline" data-testid="device-badge">● Offline</span>`;
		return html`<div class="source-row" data-testid="device-row">
			<span class="source-name">${this._label(d)}</span>
			${badge} ${this._renderDelete(d.mac)}
		</div>`;
	}

	private _renderMissingRow(s: MissingSource) {
		return html`<div class="source-row missing" data-testid="device-row">
			<span class="source-name">${s.name}</span>
			<span class="badge missing" data-testid="device-badge">⚠ no longer exists</span>
			${this._renderDelete(s.mac)}
		</div>`;
	}

	private _renderDelete(mac: string) {
		return html`<epp-tooltip content="Remove device">
			<epp-icon-button
				data-testid="device-delete"
				data-mac=${mac}
				icon="mdi:delete"
				label="Remove device"
				variant="danger"
				@click=${() => this._emitSourceToggled(mac, false)}
			></epp-icon-button>
		</epp-tooltip>`;
	}

	private _emitSourceToggled(mac: string, on: boolean) {
		this.dispatchEvent(
			new CustomEvent("source-toggled", {
				detail: { mac, on },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-device-source-list")) {
	customElements.define("epp-device-source-list", EppDeviceSourceList);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-device-source-list": EppDeviceSourceList;
	}
}
