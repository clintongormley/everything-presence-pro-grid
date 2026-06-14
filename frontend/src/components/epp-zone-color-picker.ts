import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { DocumentListenerGroup } from "../lib/document-listeners.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

// Vertical gap (px) between the trigger dot and the popover below it.
const POPOVER_GAP_PX = 6;

/**
 * Zone colour picker: a trigger dot that opens a popover of preset swatches
 * plus a custom native-picker fallback. Emits `value-changed` with the chosen
 * `#RRGGBB` hex. Presets used by other zones get an advisory in-use marker but
 * stay selectable.
 */
export class EppZoneColorPicker extends LitElement {
	@property({ attribute: false }) value = "#000000";
	@property({ attribute: false }) presets: string[] = [];
	@property({ attribute: false }) usedColors: string[] = [];
	@property({ type: Boolean }) occupiedGlow = false;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	@state() private _open = false;

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._dismiss.detach();
	}

	static styles = css`
		:host { display: inline-flex; }
		.trigger {
			width: 16px;
			height: 16px;
			padding: 0;
			border: 1px solid rgba(0, 0, 0, 0.2);
			border-radius: 50%;
			cursor: pointer;
			flex-shrink: 0;
		}
		.popover {
			position: fixed;
			z-index: 30;
			padding: 12px;
			background: var(--card-background-color, #fff);
			border: 1px solid var(--divider-color, #e0e0e0);
			border-radius: 10px;
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(5, 24px);
			gap: 10px;
		}
		.swatch {
			width: 24px;
			height: 24px;
			padding: 0;
			border: 1px solid rgba(0, 0, 0, 0.25);
			border-radius: 50%;
			cursor: pointer;
			position: relative;
		}
		.swatch.selected {
			box-shadow:
				0 0 0 2px var(--card-background-color, #fff),
				0 0 0 4px var(--primary-color, #03a9f4);
		}
		.swatch.in-use::after {
			content: "";
			position: absolute;
			top: -2px;
			right: -2px;
			width: 9px;
			height: 9px;
			border-radius: 50%;
			background: var(--secondary-text-color, #757575);
			border: 1.5px solid var(--card-background-color, #fff);
		}
		.swatch.custom {
			background: conic-gradient(
				red, orange, yellow, lime, cyan, blue, magenta, red
			);
		}
		.custom-glyph {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #fff;
			font-size: 15px;
			font-weight: 700;
			line-height: 1;
			text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
			pointer-events: none;
		}
		.custom-input {
			position: absolute;
			width: 1px;
			height: 1px;
			opacity: 0;
			pointer-events: none;
		}
	`;

	render() {
		const glow = this.occupiedGlow
			? `box-shadow: 0 0 6px 2px ${this.value};`
			: "";
		return html`
			<button
				class="trigger"
				type="button"
				aria-haspopup="dialog"
				aria-expanded=${this._open ? "true" : "false"}
				aria-label=${this.localize("color.choose")}
				style="background: ${this.value}; ${glow}"
				@click=${this._toggle}
			></button>
			${this._open ? this._renderPopover() : nothing}
		`;
	}

	private _renderPopover() {
		const normValue = this.value.toLowerCase();
		const used = new Set(this.usedColors.map((c) => c.toLowerCase()));
		const customSelected = !this.presets.some(
			(c) => c.toLowerCase() === normValue,
		);
		return html`
			<div class="popover" role="dialog">
				<div class="grid">
					${this.presets.map((color, i) => {
						const isSel = color.toLowerCase() === normValue;
						const inUseLabel = used.has(color.toLowerCase())
							? this.localize("color.in_use")
							: null;
						const presetLabel = this.localize("color.preset", { n: i + 1 });
						const ariaLabel = inUseLabel
							? `${presetLabel}, ${inUseLabel}`
							: presetLabel;
						return html`<button
							class="swatch preset ${isSel ? "selected" : ""} ${
								inUseLabel ? "in-use" : ""
							}"
							type="button"
							data-color=${color}
							style="background: ${color};"
							title=${inUseLabel ?? nothing}
							aria-label=${ariaLabel}
							aria-pressed=${isSel ? "true" : "false"}
							@click=${() => this._select(color)}
						></button>`;
					})}
					<label
						class="swatch custom ${customSelected ? "selected" : ""}"
						style=${customSelected ? `background: ${this.value};` : ""}
						title=${this.localize("color.custom")}
					>
						<span class="custom-glyph">${customSelected ? "✎" : "+"}</span>
						<input
							class="custom-input"
							type="color"
							.value=${this.value}
							@change=${(e: Event) =>
								this._select((e.target as HTMLInputElement).value)}
						/>
					</label>
				</div>
			</div>
		`;
	}

	private _toggle = (): void => {
		if (this._open) {
			this._close();
		} else {
			this._open = true;
			this._dismiss.attach();
		}
	};

	private _focusTrigger(): void {
		(this.shadowRoot?.querySelector(".trigger") as HTMLElement | null)?.focus();
	}

	private _select(color: string): void {
		// Close first so a value-changed listener sees the popover already closed.
		this._close();
		this.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: color },
				bubbles: true,
				composed: true,
			}),
		);
		// Return focus so a keyboard user who picked a swatch lands on the trigger.
		this._focusTrigger();
	}

	private _close = (): void => {
		this._open = false;
		this._dismiss.detach();
	};

	private _onOutside = (e: Event): void => {
		// Clicks on our own trigger/popover are in our composed path — ignore so
		// the trigger's own click can toggle without racing this closed.
		if (e.composedPath().includes(this)) return;
		this._close();
	};

	private _onKeydown = (e: Event): void => {
		if ((e as KeyboardEvent).key === "Escape") {
			this._close();
			this._focusTrigger();
		}
	};

	// Global dismiss listeners, active only while the popover is open. Declared
	// after the handler fields it references (DocumentListenerGroup throws if a
	// listener is undefined at construction). Capture phase so an inner
	// scroll container (the sidebar's scroll area) still dismisses the popover.
	private _dismiss = new DocumentListenerGroup([
		{
			target: document,
			type: "pointerdown",
			listener: this._onOutside,
			options: true,
		},
		{
			target: document,
			type: "keydown",
			listener: this._onKeydown,
			options: true,
		},
		{ target: window, type: "scroll", listener: this._close, options: true },
		{ target: window, type: "resize", listener: this._close, options: true },
	]);

	updated(): void {
		if (!this._open) return;
		const popover = this.shadowRoot?.querySelector(
			".popover",
		) as HTMLElement | null;
		const trigger = this.shadowRoot?.querySelector(
			".trigger",
		) as HTMLElement | null;
		if (!popover || !trigger) return;
		// Anchor the fixed popover under the trigger. Deliberate read (rect) then
		// write (inline styles); writes don't touch reactive state, so no loop.
		const r = trigger.getBoundingClientRect();
		popover.style.left = `${r.left}px`;
		popover.style.top = `${r.bottom + POPOVER_GAP_PX}px`;
	}
}

if (!customElements.get("epp-zone-color-picker")) {
	customElements.define("epp-zone-color-picker", EppZoneColorPicker);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-zone-color-picker": EppZoneColorPicker;
	}
}
