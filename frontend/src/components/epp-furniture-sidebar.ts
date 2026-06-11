import { css, html, LitElement, nothing, svg } from "lit";
import { property, state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { FLOOR_PLAN_SVGS, FURNITURE_CATALOG } from "../constants.js";
import {
	type FurnitureItem,
	type FurnitureSticker,
	filterAndSortStickers,
} from "../lib/furniture.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { buttonStyles, dialogStyles, sidebarRowStyles } from "../styles.js";

export class EppFurnitureSidebar extends LitElement {
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ attribute: false }) hass: any = undefined;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;
	@property({ attribute: false }) showCustomIconPicker = false;
	@property({ attribute: false }) customIconValue = "";
	@state() private _searchQuery = "";

	static styles = [
		dialogStyles,
		buttonStyles,
		sidebarRowStyles,
		css`
			:host {
				display: block;
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

			.furn-search {
				position: sticky;
				top: 0;
				z-index: 2;
				width: 100%;
				padding: 6px 8px;
				margin-bottom: 6px;
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
			<input
				type="search"
				class="furn-search"
				.value=${this._searchQuery}
				placeholder=${this.localize("furniture.search_placeholder")}
				aria-label=${this.localize("furniture.search_placeholder")}
				@input=${(e: Event) => {
					this._searchQuery = (e.target as HTMLInputElement).value;
				}}
			/>

			${
				selected
					? html`
						<div class="furn-selected-info">
							<div class="sidebar-item-row">
								<ha-icon icon="${selected.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
								<strong>${this.localize(selected.label)}</strong>
								<button class="sidebar-remove-btn" @click=${() => this._fireRemove(selected.id)}>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							<div class="furn-dims">
								<label>
									${this.localize("dimensions.width_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(selected.width / 10))}
										@change=${(e: Event) => this._fireDimensionUpdate(selected.id, "width", (e.target as HTMLInputElement).value)}
									/>
								</label>
								<label>
									${this.localize("dimensions.height_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(selected.height / 10))}
										@change=${(e: Event) => this._fireDimensionUpdate(selected.id, "height", (e.target as HTMLInputElement).value)}
									/>
								</label>
								<label>
									${this.localize("dimensions.rotation")}
									<input type="number" step="5" .value=${String(
										// Render the stored value (trimmed to one decimal place
										// to avoid long floats from free-rotate drags) so what
										// the user sees matches what's saved and emitted.
										Math.round(selected.rotation * 10) / 10,
									)}
										@change=${(e: Event) => {
											const v = parseFloat(
												(e.target as HTMLInputElement).value,
											);
											if (!Number.isFinite(v)) return;
											const wrapped = ((v % 360) + 360) % 360;
											this._fireUpdate(selected.id, { rotation: wrapped });
										}}
									/>
								</label>
							</div>
						</div>
					`
					: nothing
			}

			<div class="furn-catalog">
				${filterAndSortStickers(
					FURNITURE_CATALOG,
					this._searchQuery,
					this.localize,
				).map(
					(s) => html`
						<button class="furn-sticker" @click=${() => this._fireAdd(s)}>
							${
								// Object.hasOwn: a plain-object catalog makes prototype
								// members ("constructor", …) truthy under bare indexing.
								s.type === "svg" && Object.hasOwn(FLOOR_PLAN_SVGS, s.icon)
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
					this.dispatchEvent(
						new CustomEvent("custom-icon-toggle", {
							bubbles: true,
							composed: true,
						}),
					);
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
										// Coerce null/undefined to empty string — the panel
										// reflects this back into customIconValue and downstream
										// code (`.trim()`, `<ha-icon icon=...>`) assumes string.
										// Use `??` (not `||`) so an actual "" the user typed is
										// preserved verbatim.
										this.dispatchEvent(
											new CustomEvent("custom-icon-change", {
												detail: e.detail?.value ?? "",
												bubbles: true,
												composed: true,
											}),
										);
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
											this.dispatchEvent(
												new CustomEvent("custom-icon-toggle", {
													bubbles: true,
													composed: true,
												}),
											);
											this.dispatchEvent(
												new CustomEvent("custom-icon-change", {
													detail: "",
													bubbles: true,
													composed: true,
												}),
											);
										}}
									>${this.localize("common.cancel")}</button>
									<button class="wizard-btn wizard-btn-primary"
										?disabled=${!this.customIconValue.trim()}
										@click=${() => {
											this.dispatchEvent(
												new CustomEvent("furniture-add-custom", {
													detail: this.customIconValue.trim(),
													bubbles: true,
													composed: true,
												}),
											);
											this.dispatchEvent(
												new CustomEvent("custom-icon-change", {
													detail: "",
													bubbles: true,
													composed: true,
												}),
											);
											this.dispatchEvent(
												new CustomEvent("custom-icon-toggle", {
													bubbles: true,
													composed: true,
												}),
											);
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

	/**
	 * Width/height mirror the rotation handler's Number.isFinite guard —
	 * a cleared field parses to NaN, which previously flowed straight into
	 * state and rendered as `width: NaNpx`. Values clamp to ≥ 100mm so the
	 * item can't collapse below a grabbable size.
	 */
	private _fireDimensionUpdate(
		id: string,
		field: "width" | "height",
		rawCm: string,
	): void {
		const v = parseInt(rawCm, 10);
		if (!Number.isFinite(v)) return;
		this._fireUpdate(id, { [field]: Math.max(100, v * 10) });
	}
}

if (!customElements.get("epp-furniture-sidebar")) {
	customElements.define("epp-furniture-sidebar", EppFurnitureSidebar);
}
