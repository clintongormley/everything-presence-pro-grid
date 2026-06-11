import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	type OverlayMode,
} from "../lib/grid.js";
import { overlayStripeGradient } from "../lib/heatmap.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

// Swatches share the canonical stripe gradients with the grid cells
// (see overlayStripeGradient), at a 4px pitch fitting the 16px dot.
const OVERLAY_ITEMS: {
	mode: NonNullable<OverlayMode>;
	labelKey: string;
	dotCss: string;
}[] = [
	{
		mode: "entry",
		labelKey: "overlays.entry_exit",
		dotCss: overlayStripeGradient(CELL_OVERLAY_ENTRY, 4),
	},
	{
		mode: "interference",
		labelKey: "overlays.interference",
		dotCss: overlayStripeGradient(CELL_OVERLAY_INTERFERENCE, 4),
	},
	{
		mode: "suppress",
		labelKey: "overlays.suppress",
		dotCss: overlayStripeGradient(CELL_OVERLAY_SUPPRESS, 4),
	},
];

export class EppOverlaySidebar extends LitElement {
	@property({ attribute: false }) overlayMode: OverlayMode = null;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	static styles = css`
		:host {
			display: block;
		}

		.overlay-scroll-area {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		/* Real <button>s for keyboard access; reset the UA button chrome. */
		.overlay-item {
			display: flex;
			flex-direction: column;
			gap: 4px;
			padding: 6px 8px;
			border-radius: 8px;
			cursor: pointer;
			border: 2px solid var(--divider-color, #e0e0e0);
			transition: border-color 0.2s;
			background: none;
			font: inherit;
			color: inherit;
			text-align: left;
			width: 100%;
		}

		.overlay-item:hover {
			background: var(--secondary-background-color, #f5f5f5);
		}

		.overlay-item.active {
			border-color: var(--primary-color, #03a9f4);
		}

		.overlay-item-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.overlay-dot {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			flex-shrink: 0;
			border: 1px solid #ccc;
		}

		.overlay-name {
			flex: 1;
			font-size: 14px;
		}

		.overlay-hint {
			font-size: 11px;
			color: var(--secondary-text-color, #757575);
		}

	`;

	render() {
		return html`
			<div class="overlay-scroll-area">
				${OVERLAY_ITEMS.map(
					(item) => html`
						<button
							type="button"
							class="overlay-item ${this.overlayMode === item.mode ? "active" : ""}"
							@click=${() => {
								// Clicking the active mode toggles painting off.
								this.dispatchEvent(
									new CustomEvent("overlay-select", {
										detail: {
											mode: this.overlayMode === item.mode ? null : item.mode,
										},
										bubbles: true,
										composed: true,
									}),
								);
							}}
						>
							<div class="overlay-item-row">
								<div
									class="overlay-dot"
									style="background: ${item.dotCss};"
								></div>
								<span class="overlay-name"
									>${this.localize(item.labelKey)}</span
								>
								<span class="overlay-hint"
									>${this.localize("overlays.click_to_paint")}</span
								>
							</div>
						</button>
					`,
				)}
			</div>
		`;
	}
}

/* v8 ignore start — the already-defined path only triggers on HA panel
   re-import (module re-eval), unreachable in a single test environment */
if (!customElements.get("epp-overlay-sidebar")) {
	customElements.define("epp-overlay-sidebar", EppOverlaySidebar);
}
/* v8 ignore stop */
