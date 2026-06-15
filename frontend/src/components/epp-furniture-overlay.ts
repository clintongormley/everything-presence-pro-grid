import { css, html, LitElement, nothing, svg } from "lit";
import { property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { FLOOR_PLAN_SVGS } from "../constants.js";
import type { FurnitureItem } from "../lib/furniture.js";
import { getResizeCursor, mmToPx } from "../lib/furniture.js";
import { roomStartCol } from "../lib/grid.js";
import type { SidebarTab } from "../lib/view-hash.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

export class EppFurnitureOverlay extends LitElement {
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ type: Number }) roomWidth = 3000;
	@property({ type: Number }) cellPx = 28;
	@property({ type: Number }) minCol = 0;
	@property({ type: Number }) minRow = 0;
	@property({ type: Number }) visCols = 20;
	@property({ type: Number }) visRows = 20;
	@property({ attribute: false }) sidebarTab: SidebarTab = "zones";
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	static styles = css`
		:host {
			display: contents;
		}

		.furniture-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			pointer-events: none;
			z-index: 15;
		}

		.furniture-overlay.non-interactive {
			pointer-events: none !important;
		}

		.furniture-overlay.non-interactive .furniture-item {
			pointer-events: none !important;
			opacity: 0.6;
		}

		/* touch-action: none on every draggable surface — otherwise the
		   browser claims the touch gesture for scrolling mid-drag and fires
		   pointercancel, wedging the drag. */
		.furniture-item {
			position: absolute;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: 4px;
			background: transparent;
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			pointer-events: auto;
			cursor: grab;
			transform-origin: center center;
			user-select: none;
			touch-action: none;
		}

		.furniture-item:hover {
			border-color: var(--epp-accent, var(--primary-color, #03a9f4));
		}

		.furniture-item.selected {
			outline: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
			outline-offset: -1px;
			box-shadow: 0 0 8px
				color-mix(in srgb, var(--epp-accent, #03a9f4) 40%, transparent);
			z-index: 10;
		}

		.furniture-item ha-icon {
			pointer-events: none;
		}

		.furn-svg {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.furn-handle {
			position: absolute;
			width: 22px;
			height: 22px;
			background: transparent;
			pointer-events: auto;
			z-index: 2;
			display: flex;
			align-items: center;
			justify-content: center;
			touch-action: none;
		}

		/* Visible square (8×8) sits centered inside the larger touch area. */
		.furn-handle::before {
			content: "";
			width: 8px;
			height: 8px;
			background: var(--epp-accent, var(--primary-color, #03a9f4));
			border: 1px solid var(--epp-surface, var(--card-background-color, #fff));
			border-radius: 2px;
		}

		.furn-handle-n { top: -11px; left: 50%; transform: translateX(-50%); }
		.furn-handle-s { bottom: -11px; left: 50%; transform: translateX(-50%); }
		.furn-handle-e { right: -11px; top: 50%; transform: translateY(-50%); }
		.furn-handle-w { left: -11px; top: 50%; transform: translateY(-50%); }
		.furn-handle-ne { top: -11px; right: -11px; }
		.furn-handle-nw { top: -11px; left: -11px; }
		.furn-handle-se { bottom: -11px; right: -11px; }
		.furn-handle-sw { bottom: -11px; left: -11px; }

		/* Transparent >=44px centered touch hit area on each interactive handle.
		   Uses ::after (the visible nub uses ::before on .furn-handle, and is the
		   element's own circle on the rotate/delete handles). Does not change any
		   handle geometry/offset or the drag/rotate/delete math. */
		@media (max-width: 819px) {
			.furn-handle::after,
			.furn-rotate-handle::after,
			.furn-delete-btn::after {
				content: "";
				position: absolute;
				top: 50%;
				left: 50%;
				width: 44px;
				height: 44px;
				transform: translate(-50%, -50%);
				/* transparent — just enlarges the touch hit target */
			}
		}

		.furn-rotate-stem {
			position: absolute;
			top: -32px;
			left: 50%;
			transform: translateX(-50%);
			width: 2px;
			height: 32px;
			background: var(--epp-accent, var(--primary-color, #03a9f4));
			pointer-events: none;
		}

		.furn-rotate-handle {
			position: absolute;
			top: -48px;
			left: 50%;
			transform: translateX(-50%);
			width: 20px;
			height: 20px;
			background: var(--epp-accent, var(--primary-color, #03a9f4));
			border: 2px solid var(--epp-accent-text, #fff);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: grab;
			pointer-events: auto;
			color: var(--epp-accent-text, #fff);
			touch-action: none;
		}

		.furn-delete-btn {
			position: absolute;
			top: -24px;
			right: -4px;
			width: 20px;
			height: 20px;
			background: var(--epp-danger, var(--error-color, #f44336));
			border: 1px solid var(--epp-accent-text, #fff);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			pointer-events: auto;
			color: var(--epp-accent-text, #fff);
		}
	`;

	private _mmToPx(mm: number): number {
		return mmToPx(mm, this.cellPx);
	}

	private _fireEvent(name: string, detail?: any): void {
		this.dispatchEvent(
			new CustomEvent(name, { bubbles: true, composed: true, detail }),
		);
	}

	private _itemRotation(id: string): number {
		return this.furniture.find((f) => f.id === id)?.rotation ?? 0;
	}

	private _onItemPointerDown(e: PointerEvent, id: string): void {
		this._fireEvent("furniture-select", id);
		this._fireEvent("furniture-pointer-down", {
			e,
			id,
			type: "move",
			rotation: this._itemRotation(id),
		});
	}

	private _onResizePointerDown(
		e: PointerEvent,
		id: string,
		handle: string,
	): void {
		this._fireEvent("furniture-pointer-down", {
			e,
			id,
			type: "resize",
			handle,
			rotation: this._itemRotation(id),
		});
	}

	private _onRotatePointerDown(e: PointerEvent, id: string): void {
		this._fireEvent("furniture-pointer-down", {
			e,
			id,
			type: "rotate",
			rotation: this._itemRotation(id),
		});
	}

	private _onDeletePointerDown(e: PointerEvent, id: string): void {
		e.stopPropagation();
		this._fireEvent("furniture-delete", id);
	}

	render() {
		if (!this.furniture.length) return nothing;

		const startCol = roomStartCol(this.roomWidth);
		const step = this.cellPx + 1;

		const interactive = this.sidebarTab === "furniture";
		return html`
			<div class="furniture-overlay ${interactive ? "" : "non-interactive"}">
				${this.furniture.map((item) => {
					const leftPx = (startCol - this.minCol) * step + this._mmToPx(item.x);
					const topPx = (0 - this.minRow) * step + this._mmToPx(item.y);
					const wPx = this._mmToPx(item.width);
					const hPx = this._mmToPx(item.height);
					const selected = this.selectedFurnitureId === item.id;

					return html`
						<div
							class="furniture-item ${selected ? "selected" : ""}"
							data-id="${item.id}"
							style="
								left: ${leftPx}px; top: ${topPx}px;
								width: ${wPx}px; height: ${hPx}px;
								transform: rotate(${item.rotation}deg);
							"
							@pointerdown=${(e: PointerEvent) => this._onItemPointerDown(e, item.id)}
						>
							${
								// Object.hasOwn: a plain-object catalog makes prototype
								// members ("constructor", …) truthy under bare indexing.
								item.type === "svg" && Object.hasOwn(FLOOR_PLAN_SVGS, item.icon)
									? svg`<svg viewBox="${FLOOR_PLAN_SVGS[item.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${unsafeSVG(FLOOR_PLAN_SVGS[item.icon].content)}
									</svg>`
									: html`<ha-icon icon="${item.icon}" style="--mdc-icon-size: ${Math.min(wPx, hPx) * 0.6}px;"></ha-icon>`
							}
							${
								selected
									? html`
										<!-- Resize handles (cursor follows visual rotation) -->
										${(
											["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const
										).map(
											(h) => html`
												<div
													class="furn-handle furn-handle-${h}"
													style="cursor: ${getResizeCursor(h, item.rotation)};"
													@pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, h)}
												></div>
											`,
										)}
										<!-- Rotate handle with stem -->
										<div class="furn-rotate-stem"></div>
										<div class="furn-rotate-handle" @pointerdown=${(e: PointerEvent) => this._onRotatePointerDown(e, item.id)}>
											<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
										<!-- Delete button -->
										<div class="furn-delete-btn" @pointerdown=${(e: PointerEvent) => this._onDeletePointerDown(e, item.id)}>
											<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
									`
									: nothing
							}
						</div>
					`;
				})}
			</div>
		`;
	}
}

if (!customElements.get("epp-furniture-overlay")) {
	customElements.define("epp-furniture-overlay", EppFurnitureOverlay);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-furniture-overlay": EppFurnitureOverlay;
	}
}
