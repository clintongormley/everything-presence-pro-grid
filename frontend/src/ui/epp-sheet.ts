import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

/**
 * Persistent themed bottom sheet. The `peek` slot is always visible (with a
 * visual grab handle). `open` is a consumer-controlled property that gates the
 * default content (`.body`) and `actions` footer; the handle itself is a
 * non-interactive grab indicator (it no longer toggles `open`, so a tap can't
 * collapse/hide the panel). Used only below the mobile breakpoint (the consumer
 * renders it conditionally).
 */
export class EppSheet extends LitElement {
	@property({ type: Boolean, reflect: true }) open = false;
	/**
	 * When set, the sheet flows inline in normal document order (e.g. directly
	 * below the grid in the mobile editor) instead of being fixed to the bottom
	 * of the viewport. Keeps the panel chrome (rounded top, border, shadow,
	 * scrolling body) — only the positioning changes.
	 */
	@property({ type: Boolean, reflect: true }) inline = false;

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
    :host([inline]) {
      position: relative;
      left: auto;
      right: auto;
      bottom: auto;
      z-index: auto;
      /* Inline (mobile editor): fill the remaining flex height below the grid
         and let the .body scroll internally. Override the fixed-sheet's
         max-height:85vh cap so the sheet reaches the viewport bottom and the
         .actions footer (Save/Cancel) stays pinned there. */
      flex: 1 1 auto;
      min-height: 0;
      max-height: none;
    }
    .handle-bar {
      flex-shrink: 0;
      padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
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
      /* Reserve the scrollbar gutter so toggling the body's vertical scrollbar
         (e.g. when selecting a zone grows the sheet content) doesn't reflow the
         body width and shift the grid above it. */
      scrollbar-gutter: stable;
      padding: 0 var(--epp-space-3, 12px);
    }
    .body[hidden] { display: none; }
    .actions {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      gap: var(--epp-space-3, 12px);
      padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
      /* No border-top here: the sole consumer slots the editor's
         .save-cancel-bar, which carries its own border-top divider. A border
         here too rendered TWO stacked lines above the Save/Cancel row. */
    }
    .actions[hidden] { display: none; }
  `;

	render() {
		return html`
      <div class="handle-bar">
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
