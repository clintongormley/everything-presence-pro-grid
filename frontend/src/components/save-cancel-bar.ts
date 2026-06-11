import { html } from "lit";
import type { LocalizeFn } from "../localize.js";

/** Named options for {@link renderSaveCancelBar} — replaces the old five
 * positional params (two adjacent booleans were an easy transposition). */
export interface SaveCancelBarOptions {
	saving: boolean;
	dirty: boolean;
	localize: LocalizeFn;
	onSave: () => void;
	onCancel: () => void;
}

/**
 * Shared Save/Cancel button bar used by the editor sidebar (panel) and the
 * settings view — previously two byte-identical copies that had already
 * drifted once.
 *
 * Renders `ha-button` when it's registered in this HA frontend (Web
 * Awesome, 2026.x); falls back to plain themed buttons so the panel stays
 * usable on HA versions where ha-button isn't registered in the panel's
 * scope. The guard is belt-and-braces for core chrome: the flasher view
 * already uses ha-button unguarded (so 2026.x is the de-facto support
 * floor), but this bar sits on every editor/settings screen and the
 * fallback is cheap. Both branches keep the `.save-cancel-bar` /
 * `.save-btn` / `.cancel-btn` hooks so callers' CSS and tests don't care
 * which one rendered.
 */
export function renderSaveCancelBar(opts: SaveCancelBarOptions) {
	const { saving, dirty, localize, onSave, onCancel } = opts;
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
