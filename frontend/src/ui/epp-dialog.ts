import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

/**
 * Themed modal dialog shell. Owns the overlay + card chrome (tokenised from the
 * panel's shared `.template-dialog` pattern) so every dialog matches. The caller
 * owns `open`; the dialog does NOT close itself — it emits `dialog-dismiss` on
 * Escape so the caller runs its existing close/cancel logic. Slots: default =
 * body content, `actions` = footer buttons.
 */
export class EppDialog extends LitElement {
	@property({ type: Boolean }) open = false;
	@property({ type: String }) heading = "";
	/** a11y label used when there is no visible heading. */
	@property({ type: String }) label = "";

	static styles = css`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .card {
      background: var(--epp-surface, var(--card-background-color, #fff));
      border-radius: var(--epp-radius-lg, 16px);
      padding: var(--epp-space-5, 24px);
      min-width: 320px;
      max-width: 440px;
      max-height: 85vh;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--epp-space-4, 16px);
      box-shadow: var(--epp-elevation-2, 0 6px 20px rgba(0, 0, 0, 0.18));
    }
    h3 {
      margin: 0;
      flex-shrink: 0;
      font-size: var(--epp-font-xl, 18px);
      font-weight: var(--epp-weight-medium, 500);
      color: var(--epp-text, var(--primary-text-color, #212121));
    }
    .body {
      flex: 1 1 auto;
      overflow-y: auto;
      min-height: 0;
    }
    .actions {
      display: flex;
      flex-shrink: 0;
      justify-content: flex-end;
      gap: var(--epp-space-3, 12px);
    }
  `;

	connectedCallback(): void {
		super.connectedCallback();
		document.addEventListener("keydown", this._onKeydown);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this._onKeydown);
	}

	private _onKeydown = (e: KeyboardEvent): void => {
		if (this.open && e.key === "Escape") {
			this.dispatchEvent(
				new CustomEvent("dialog-dismiss", { bubbles: true, composed: true }),
			);
		}
	};

	render() {
		if (!this.open) return nothing;
		return html`
      <div class="overlay">
        <div
          class="card"
          role="dialog"
          aria-modal="true"
          aria-label=${this.heading || this.label || nothing}
        >
          ${this.heading ? html`<h3>${this.heading}</h3>` : nothing}
          <div class="body"><slot></slot></div>
          <div class="actions"><slot name="actions"></slot></div>
        </div>
      </div>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-dialog")) {
	customElements.define("epp-dialog", EppDialog);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-dialog": EppDialog;
	}
}
