import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

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

	private get _normValue(): string {
		return this.value.toLowerCase();
	}

	private _isPresetValue(): boolean {
		return this.presets.some((c) => c.toLowerCase() === this._normValue);
	}

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
		const used = new Set(this.usedColors.map((c) => c.toLowerCase()));
		const customSelected = !this._isPresetValue();
		return html`
			<div class="popover" role="dialog">
				<div class="grid">
					${this.presets.map((color, i) => {
						const isSel = color.toLowerCase() === this._normValue;
						const isUsed = used.has(color.toLowerCase());
						return html`<button
							class="swatch preset ${isSel ? "selected" : ""} ${
								isUsed ? "in-use" : ""
							}"
							type="button"
							data-color=${color}
							style="background: ${color};"
							title=${isUsed ? this.localize("color.in_use") : nothing}
							aria-label=${this.localize("color.preset", { n: i + 1 })}
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
		this._open = !this._open;
	};

	private _select(color: string): void {
		// Close first so a value-changed listener sees the popover already closed.
		this._open = false;
		this.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: color },
				bubbles: true,
				composed: true,
			}),
		);
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
