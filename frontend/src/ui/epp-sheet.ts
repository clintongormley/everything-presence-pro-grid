import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

/**
 * Persistent themed bottom sheet. The `peek` slot is always visible (with a
 * grab handle); tapping the handle toggles between collapsed (peek only) and
 * open (peek + default content + `actions` footer). Tapping the handle toggles
 * `open` (peek↔expanded); `open` is also a settable property the consumer can
 * control. `sheet-open-changed` { detail: { open } } is emitted on every toggle
 * so the consumer can observe/sync it. Used only below the mobile breakpoint
 * (the consumer renders it conditionally).
 */
export class EppSheet extends LitElement {
	@property({ type: Boolean, reflect: true }) open = false;

	@state() private _hasActions = false;
	private _onActionsSlotChange = (e: Event) => {
		this._hasActions =
			(e.target as HTMLSlotElement).assignedNodes({ flatten: true }).length > 0;
	};

	static styles = css`
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      background: var(--epp-surface, var(--card-background-color, #fff));
      border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
      border-radius: var(--epp-radius-lg, 16px) var(--epp-radius-lg, 16px) 0 0;
      box-shadow: var(--epp-elevation-2, 0 -6px 20px rgba(0, 0, 0, 0.18));
      display: flex;
      flex-direction: column;
      max-height: 85vh;
    }
    .handle-bar {
      flex-shrink: 0;
      padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
      cursor: pointer;
      touch-action: none;
    }
    .handle-bar:focus-visible {
      outline: var(--epp-focus-ring, 2px solid var(--primary-color, #03a9f4));
      outline-offset: -2px;
    }
    .handle {
      width: 40px;
      height: 4px;
      border-radius: var(--epp-radius-pill, 9999px);
      background: var(--epp-border, var(--divider-color, #e0e0e0));
      margin: 0 auto var(--epp-space-2, 8px);
    }
    .body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 0 var(--epp-space-3, 12px);
    }
    .body[hidden] { display: none; }
    .actions {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      gap: var(--epp-space-3, 12px);
      padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
      border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    }
    .actions[hidden] { display: none; }
  `;

	private _toggle = () => {
		this.open = !this.open;
		this.dispatchEvent(
			new CustomEvent("sheet-open-changed", {
				detail: { open: this.open },
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _onKeydown = (e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			this._toggle();
		}
	};

	render() {
		return html`
      <div
        class="handle-bar"
        role="button"
        tabindex="0"
        aria-expanded=${this.open ? "true" : "false"}
        aria-label="Toggle controls"
        @click=${this._toggle}
        @keydown=${this._onKeydown}
      >
        <div class="handle"></div>
        <slot name="peek"></slot>
      </div>
      <div class="body" ?hidden=${!this.open}><slot></slot></div>
      <div class="actions" ?hidden=${!this.open || !this._hasActions}>
        <slot name="actions" @slotchange=${this._onActionsSlotChange}></slot>
      </div>
    `;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-sheet")) {
	customElements.define("epp-sheet", EppSheet);
}
/* v8 ignore stop */

declare global {
	interface HTMLElementTagNameMap {
		"epp-sheet": EppSheet;
	}
}
