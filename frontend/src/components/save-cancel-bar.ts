import { html } from "lit";
import type { LocalizeFn } from "../localize.js";

/**
 * Shared Save/Cancel button bar used by the editor sidebar (panel) and the
 * settings view — previously two byte-identical copies that had already
 * drifted once.
 *
 * Renders `ha-button` when it's registered in this HA frontend (Web
 * Awesome, 2026.x); falls back to plain themed buttons so the panel stays
 * usable on HA versions where ha-button isn't registered in the panel's
 * scope. Both branches keep the `.save-cancel-bar` / `.save-btn` /
 * `.cancel-btn` hooks so callers' CSS and tests don't care which one
 * rendered.
 */
export function renderSaveCancelBar(
	saving: boolean,
	dirty: boolean,
	localize: LocalizeFn,
	onSave: () => void,
	onCancel: () => void,
) {
	const saveLabel = saving
		? localize("common.saving")
		: localize("common.save");
	const disabled = saving || !dirty;
	if (customElements.get("ha-button")) {
		return html`
      <div class="save-cancel-bar">
        <ha-button class="cancel-btn" @click=${onCancel}>${localize("common.cancel")}</ha-button>
        <ha-button class="save-btn" appearance="accent" .disabled=${disabled} @click=${onSave}>${saveLabel}</ha-button>
      </div>
    `;
	}
	return html`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back cancel-btn" @click=${onCancel}>${localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary save-btn" ?disabled=${disabled} @click=${onSave}>${saveLabel}</button>
      </div>
    `;
}
