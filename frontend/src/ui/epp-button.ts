import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

export type EppButtonVariant = "primary" | "neutral" | "danger" | "text";

/** Token-styled action button. Native click bubbles (composed) from the host. */
export class EppButton extends LitElement {
	@property({ type: String }) variant: EppButtonVariant = "neutral";
	@property({ type: Boolean }) disabled = false;
	@property({ type: String }) type: "button" | "submit" = "button";
	/** Optional leading mdi icon, e.g. "mdi:content-save". */
	@property({ type: String }) icon = "";

	static styles = css`
    :host { display: inline-block; }
    button {
      font: inherit;
      cursor: pointer;
      border: 1px solid transparent;
      border-radius: var(--epp-radius-md, 10px);
      min-height: var(--epp-control-height, 40px);
      padding: 0 var(--epp-space-4, 16px);
      font-size: var(--epp-font-base, 14px);
      font-weight: var(--epp-weight-semibold, 600);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--epp-space-2, 8px);
    }
    button:focus-visible {
      outline: var(--epp-focus-ring, 2px solid var(--primary-color, #03a9f4));
      outline-offset: 2px;
    }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    .primary { background: var(--epp-accent, var(--primary-color, #03a9f4)); color: var(--epp-accent-text, #fff); }
    .neutral {
      background: var(--epp-surface, var(--card-background-color, #fff));
      color: var(--epp-text, var(--primary-text-color, #212121));
      border-color: var(--epp-border, var(--divider-color, #e0e0e0));
    }
    .danger { background: var(--epp-danger, var(--error-color, #f44336)); color: #fff; }
    .text { background: transparent; color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
    ha-icon { --mdc-icon-size: 18px; }
  `;

	render() {
		return html`
      <button
        class=${this.variant}
        type=${this.type}
        ?disabled=${this.disabled}
      >
        ${this.icon ? html`<ha-icon icon=${this.icon}></ha-icon>` : nothing}
        <slot></slot>
      </button>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-button")) {
	customElements.define("epp-button", EppButton);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-button": EppButton;
	}
}
