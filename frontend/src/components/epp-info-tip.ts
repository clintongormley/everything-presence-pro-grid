import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

// The single open tip across all instances (and all host components) — opening
// one closes whichever other tip is showing.
let openTip: EppInfoTip | null = null;

/**
 * Standard help affordance: a (?) icon button that opens a click-toggled,
 * fixed-position tooltip. Always interactive — the host forces
 * `pointer-events: auto` so a disabled/`pointer-events: none` ancestor row
 * cannot take the documentation away with the option it documents.
 */
export class EppInfoTip extends LitElement {
	@property({ type: String }) text = "";

	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	static styles = [
		css`
      :host {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        pointer-events: auto;
        opacity: 1;
      }

      button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        color: var(--secondary-text-color, #757575);
        font: inherit;
      }

      button:hover {
        color: var(--primary-color, #03a9f4);
      }

      ha-icon {
        --mdc-icon-size: 18px;
      }

      .info-tip-tooltip {
        display: none;
        position: fixed;
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 12px;
        color: var(--primary-text-color, #212121);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        white-space: normal;
        width: 240px;
        z-index: 9999;
        line-height: 1.4;
        pointer-events: none;
        text-align: left;
      }
    `,
	];

	render() {
		// The static id="tip" / aria-describedby="tip" pair is safe because each
		// instance has its own shadow root — ids are shadow-scoped, so there is
		// no document-wide collision across the many tips on a page. (This relies
		// on the tooltip staying inside the shadow root; if it were ever portaled
		// to light DOM the ids would need to be made unique.)
		return html`<button
			type="button"
			aria-label=${this.localize("settings.show_info")}
			aria-describedby="tip"
			title=${this.localize("settings.show_info")}
			@click=${this._toggle}
		><ha-icon icon="mdi:help-circle-outline"></ha-icon><span id="tip" class="info-tip-tooltip" role="tooltip">${this.text}</span></button>`;
	}

	private get _tooltip(): HTMLElement | null {
		return this.shadowRoot?.querySelector(".info-tip-tooltip") ?? null;
	}

	private _toggle(e: Event): void {
		e.stopPropagation();
		const wasOpen = openTip === this;
		openTip?._close();
		if (wasOpen) return;
		// The click handler only exists on rendered DOM, so the tooltip span
		// is always present here.
		const tip = this._tooltip as HTMLElement;
		const btn = e.currentTarget as HTMLElement;
		const rect = btn.getBoundingClientRect();
		tip.style.display = "block";
		tip.style.left = `${Math.max(8, Math.min(rect.right - 240, window.innerWidth - 256))}px`;
		tip.style.top = `${rect.bottom + 6}px`;
		openTip = this;
		this._attachListeners();
	}

	private _close(): void {
		const tip = this._tooltip;
		if (tip) tip.style.display = "none";
		if (openTip === this) openTip = null;
		this._detachListeners();
	}

	// Listeners only live while this tip is the open one. removeEventListener
	// is a no-op when nothing is registered, so _detachListeners needs no guard
	// and stays correct on the never-opened / double-close paths.
	private _attachListeners(): void {
		document.addEventListener("keydown", this._onKeydown);
		document.addEventListener("pointerdown", this._onPointerDown, true);
		window.addEventListener("scroll", this._onViewportChange, true);
		window.addEventListener("resize", this._onViewportChange);
	}

	private _detachListeners(): void {
		document.removeEventListener("keydown", this._onKeydown);
		document.removeEventListener("pointerdown", this._onPointerDown, true);
		window.removeEventListener("scroll", this._onViewportChange, true);
		window.removeEventListener("resize", this._onViewportChange);
	}

	private _onKeydown = (e: KeyboardEvent): void => {
		if (e.key === "Escape") this._close();
	};

	private _onViewportChange = (): void => {
		this._close();
	};

	private _onPointerDown = (e: Event): void => {
		if (e.composedPath().includes(this)) return;
		this._close();
	};

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._close();
	}
}

if (!customElements.get("epp-info-tip")) {
	customElements.define("epp-info-tip", EppInfoTip);
}
