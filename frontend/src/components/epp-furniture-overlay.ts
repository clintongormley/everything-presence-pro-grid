import { LitElement, html, css, nothing, svg } from "lit";
import { property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { FLOOR_PLAN_SVGS } from "../constants.js";
import { mmToPx } from "../lib/furniture.js";
import { GRID_CELL_MM, GRID_COLS } from "../lib/grid.js";
import type { FurnitureItem } from "../lib/furniture.js";

export class EppFurnitureOverlay extends LitElement {
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ type: Number }) roomWidth = 3000;
	@property({ type: Number }) cellPx = 28;
	@property({ type: Number }) minCol = 0;
	@property({ type: Number }) minRow = 0;
	@property({ type: Number }) visCols = 20;
	@property({ type: Number }) visRows = 20;
	@property({ attribute: false }) sidebarTab = "zones";
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

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

		.furniture-item {
			position: absolute;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid rgba(0, 0, 0, 0.3);
			border-radius: 4px;
			background: transparent;
			pointer-events: auto;
			cursor: grab;
			transform-origin: center center;
			user-select: none;
		}

		.furniture-item:hover {
			border-color: var(--primary-color, #03a9f4);
		}

		.furniture-item.selected {
			outline: 2px solid var(--primary-color, #03a9f4);
			outline-offset: -1px;
			box-shadow: 0 0 8px rgba(3, 169, 244, 0.4);
			z-index: 10;
		}

		.furniture-item ha-icon {
			color: rgba(0, 0, 0, 0.6);
			pointer-events: none;
		}

		.furn-svg {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.furn-handle {
			position: absolute;
			width: 8px;
			height: 8px;
			background: var(--primary-color, #03a9f4);
			border: 1px solid #fff;
			border-radius: 2px;
			pointer-events: auto;
			z-index: 2;
		}

		.furn-handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
		.furn-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
		.furn-handle-e { right: -4px; top: 50%; transform: translateY(-50%); cursor: e-resize; }
		.furn-handle-w { left: -4px; top: 50%; transform: translateY(-50%); cursor: w-resize; }
		.furn-handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
		.furn-handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
		.furn-handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
		.furn-handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }

		.furn-rotate-stem {
			position: absolute;
			top: -32px;
			left: 50%;
			transform: translateX(-50%);
			width: 2px;
			height: 32px;
			background: var(--primary-color, #03a9f4);
			pointer-events: none;
		}

		.furn-rotate-handle {
			position: absolute;
			top: -48px;
			left: 50%;
			transform: translateX(-50%);
			width: 20px;
			height: 20px;
			background: var(--primary-color, #03a9f4);
			border: 2px solid #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: grab;
			pointer-events: auto;
			color: #fff;
		}

		.furn-delete-btn {
			position: absolute;
			top: -24px;
			right: -4px;
			width: 20px;
			height: 20px;
			background: var(--error-color, #f44336);
			border: 1px solid #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			pointer-events: auto;
			color: #fff;
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

	private _onItemPointerDown(e: PointerEvent, id: string): void {
		this._fireEvent("furniture-select", id);
		this._fireEvent("furniture-pointer-down", { e, id, type: "move" });
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
		});
	}

	private _onRotatePointerDown(e: PointerEvent, id: string): void {
		this._fireEvent("furniture-pointer-down", { e, id, type: "rotate" });
	}

	private _onDeletePointerDown(e: PointerEvent, id: string): void {
		e.stopPropagation();
		this._fireEvent("furniture-delete", id);
	}

	render() {
		if (!this.furniture.length) return nothing;

		const roomCols = Math.ceil(this.roomWidth / GRID_CELL_MM);
		const startCol = Math.floor((GRID_COLS - roomCols) / 2);
		const step = this.cellPx + 1;

		const interactive = this.sidebarTab === "furniture";
		return html`
			<div class="furniture-overlay ${interactive ? "" : "non-interactive"}">
				${this.furniture.map((item) => {
					const leftPx =
						(startCol - this.minCol) * step + this._mmToPx(item.x);
					const topPx =
						(0 - this.minRow) * step + this._mmToPx(item.y);
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
								item.type === "svg" && FLOOR_PLAN_SVGS[item.icon]
									? svg`<svg viewBox="${FLOOR_PLAN_SVGS[item.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${unsafeSVG(FLOOR_PLAN_SVGS[item.icon].content)}
									</svg>`
									: html`<ha-icon icon="${item.icon}" style="--mdc-icon-size: ${Math.min(wPx, hPx) * 0.6}px;"></ha-icon>`
							}
							${
								selected
									? html`
										<!-- Resize handles -->
										<div class="furn-handle furn-handle-n" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "n")}></div>
										<div class="furn-handle furn-handle-s" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "s")}></div>
										<div class="furn-handle furn-handle-e" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "e")}></div>
										<div class="furn-handle furn-handle-w" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "w")}></div>
										<div class="furn-handle furn-handle-ne" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "ne")}></div>
										<div class="furn-handle furn-handle-nw" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "nw")}></div>
										<div class="furn-handle furn-handle-se" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "se")}></div>
										<div class="furn-handle furn-handle-sw" @pointerdown=${(e: PointerEvent) => this._onResizePointerDown(e, item.id, "sw")}></div>
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
