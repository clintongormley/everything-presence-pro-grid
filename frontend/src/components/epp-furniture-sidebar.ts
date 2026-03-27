import { LitElement, html, css, nothing, svg } from "lit";
import { property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { dialogStyles, buttonStyles } from "../styles.js";
import { FLOOR_PLAN_SVGS, FURNITURE_CATALOG } from "../constants.js";
import type { FurnitureItem, FurnitureSticker } from "../lib/furniture.js";

export class EppFurnitureSidebar extends LitElement {
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ attribute: false }) hass: any = undefined;
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;
	@property({ attribute: false }) showCustomIconPicker = false;
	@property({ attribute: false }) customIconValue = "";

	static styles = [
		dialogStyles,
		buttonStyles,
		css`
			:host {
				display: block;
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
			}

			.furn-selected-info {
				display: flex;
				flex-direction: column;
				gap: 8px;
				padding: 8px;
				border: 2px solid var(--primary-color, #03a9f4);
				border-radius: 8px;
				margin-bottom: 8px;
			}

			.furn-dims {
				display: flex;
				gap: 6px;
			}

			.furn-dims label {
				flex: 1;
				font-size: 11px;
				color: var(--secondary-text-color, #757575);
				display: flex;
				flex-direction: column;
				gap: 2px;
			}

			.furn-dims input {
				width: 100%;
				padding: 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-catalog {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 4px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.furn-sticker {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 4px;
				padding: 8px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: var(--card-background-color, #fff);
				cursor: pointer;
				font-size: 11px;
				color: var(--primary-text-color, #212121);
				text-align: center;
				transition: background 0.15s;
			}

			.furn-sticker:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.furn-sticker span {
				line-height: 1.2;
			}

			.furn-sticker-svg {
				width: 28px;
				height: 28px;
			}
		`,
	];

	render() {
		return this._renderFurnitureSidebar();
	}

	_renderFurnitureSidebar() {
		const selected = this.furniture.find(
			(f) => f.id === this.selectedFurnitureId,
		);

		return html`
			${
				selected
					? html`
						<div class="furn-selected-info">
							<div class="zone-item-row">
								<ha-icon icon="${selected.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
								<strong>${this.localize(selected.label)}</strong>
								<button class="zone-remove-btn" @click=${() => this._fireRemove(selected.id)}>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							<div class="furn-dims">
								<label>
									${this.localize("dimensions.width_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(selected.width / 10))}
										@change=${(e: Event) => this._fireUpdate(selected.id, { width: parseInt((e.target as HTMLInputElement).value) * 10 })}
									/>
								</label>
								<label>
									${this.localize("dimensions.height_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(selected.height / 10))}
										@change=${(e: Event) => this._fireUpdate(selected.id, { height: parseInt((e.target as HTMLInputElement).value) * 10 })}
									/>
								</label>
								<label>
									${this.localize("dimensions.rotation")}
									<input type="number" step="5" .value=${String(Math.round(selected.rotation))}
										@change=${(e: Event) => this._fireUpdate(selected.id, { rotation: parseInt((e.target as HTMLInputElement).value) % 360 })}
									/>
								</label>
							</div>
						</div>
					`
					: nothing
			}

			<div class="furn-catalog">
				${FURNITURE_CATALOG.map(
					(s) => html`
						<button class="furn-sticker" @click=${() => this._fireAdd(s)}>
							${
								s.type === "svg" && FLOOR_PLAN_SVGS[s.icon]
									? svg`<svg viewBox="${FLOOR_PLAN_SVGS[s.icon].viewBox}" class="furn-sticker-svg">
										${unsafeSVG(FLOOR_PLAN_SVGS[s.icon].content)}
									</svg>`
									: html`<ha-icon icon="${s.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`
							}
							<span>${this.localize(s.label)}</span>
						</button>
					`,
				)}
				<button class="furn-sticker furn-custom" @click=${() => {
					this.dispatchEvent(new CustomEvent("custom-icon-toggle", { bubbles: true, composed: true }));
				}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			${
				this.showCustomIconPicker
					? html`
						<div class="template-dialog">
							<div class="template-dialog-card">
								<h3>${this.localize("furniture.custom_icon")}</h3>
								<ha-icon-picker
									.hass=${this.hass}
									.value=${this.customIconValue}
									@value-changed=${(e: CustomEvent) => {
										this.dispatchEvent(new CustomEvent("custom-icon-change", {
											detail: e.detail.value || "",
											bubbles: true,
											composed: true,
										}));
									}}
								></ha-icon-picker>
								${
									this.customIconValue.trim()
										? html`
											<div style="text-align: center;">
												<ha-icon icon="${this.customIconValue.trim()}" style="--mdc-icon-size: 48px;"></ha-icon>
											</div>
										`
										: nothing
								}
								<div class="template-dialog-actions">
									<button class="wizard-btn wizard-btn-back"
										@click=${() => {
											this.dispatchEvent(new CustomEvent("custom-icon-toggle", { bubbles: true, composed: true }));
											this.dispatchEvent(new CustomEvent("custom-icon-change", {
												detail: "",
												bubbles: true,
												composed: true,
											}));
										}}
									>${this.localize("common.cancel")}</button>
									<button class="wizard-btn wizard-btn-primary"
										?disabled=${!this.customIconValue.trim()}
										@click=${() => {
											this.dispatchEvent(new CustomEvent("furniture-add-custom", {
												detail: this.customIconValue.trim(),
												bubbles: true,
												composed: true,
											}));
											this.dispatchEvent(new CustomEvent("custom-icon-change", {
												detail: "",
												bubbles: true,
												composed: true,
											}));
											this.dispatchEvent(new CustomEvent("custom-icon-toggle", { bubbles: true, composed: true }));
										}}
									>${this.localize("common.add")}</button>
								</div>
							</div>
						</div>
					`
					: nothing
			}
		`;
	}

	private _fireAdd(sticker: FurnitureSticker): void {
		this.dispatchEvent(
			new CustomEvent("furniture-add", {
				detail: sticker,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireRemove(id: string): void {
		this.dispatchEvent(
			new CustomEvent("furniture-remove", {
				detail: id,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireUpdate(id: string, updates: Partial<FurnitureItem>): void {
		this.dispatchEvent(
			new CustomEvent("furniture-update", {
				detail: { id, updates },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

if (!customElements.get("epp-furniture-sidebar")) {
	customElements.define("epp-furniture-sidebar", EppFurnitureSidebar);
}
