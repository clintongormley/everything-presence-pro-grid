import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import "../ui/epp-dialog.js";
import "../ui/epp-button.js";

/**
 * Themed modal confirm/alert dialog, composed from <epp-dialog> so it matches
 * every other dialog. The caller owns `open`; the dialog emits `confirm` /
 * `cancel` (it does not close itself). Set `hideCancel` for a single-button
 * alert, `danger` to render the confirm action in the error colour.
 */
export class EppConfirmDialog extends LitElement {
	static styles = css`
		.message {
			margin: 0;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
		}
	`;

	@property({ type: Boolean }) open = false;
	@property() heading = "";
	@property() message = "";
	@property() confirmLabel = "Confirm";
	@property() cancelLabel = "Cancel";
	@property({ type: Boolean }) danger = false;
	/** Alert mode: only the confirm/OK button is shown. */
	@property({ type: Boolean }) hideCancel = false;

	render() {
		return html`
			<epp-dialog
				?open=${this.open}
				.heading=${this.heading}
				.label=${this.heading || this.confirmLabel}
				@dialog-dismiss=${this._cancel}
			>
				${this.message ? html`<p class="message">${this.message}</p>` : nothing}
				${
					this.hideCancel
						? nothing
						: html`<epp-button
								slot="actions"
								variant="text"
								data-testid="dialog-cancel"
								@click=${this._cancel}
								>${this.cancelLabel}</epp-button
							>`
				}
				<epp-button
					slot="actions"
					variant=${this.danger ? "danger" : "primary"}
					data-testid="dialog-confirm"
					@click=${this._confirm}
					>${this.confirmLabel}</epp-button
				>
			</epp-dialog>
		`;
	}

	private _confirm() {
		this.dispatchEvent(
			new CustomEvent("confirm", { bubbles: true, composed: true }),
		);
	}

	private _cancel() {
		this.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
	}
}

if (!customElements.get("epp-confirm-dialog")) {
	customElements.define("epp-confirm-dialog", EppConfirmDialog);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-confirm-dialog": EppConfirmDialog;
	}
}
