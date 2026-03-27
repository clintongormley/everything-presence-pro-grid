import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { TARGET_COLORS } from "../constants.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import type { FurnitureItem } from "../lib/furniture.js";
import {
	cellIsInside,
	cellZone,
	GRID_COLS,
	getRoomBounds,
} from "../lib/grid.js";
import { getCellColor } from "../lib/heatmap.js";
import { getGridRoomMetrics } from "../lib/room-geometry.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import type { Target } from "../types.js";
import "./epp-furniture-overlay.js";

export class EppGrid extends LitElement {
	@property({ attribute: false }) grid: Uint8Array = new Uint8Array(0);
	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];
	@property({ attribute: false }) targets: Target[] = [];
	@property({ type: Number }) roomWidth = 0;
	@property({ type: Number }) roomDepth = 0;
	@property({ attribute: false }) perspective: number[] | null = null;
	@property({ attribute: false }) furniture: FurnitureItem[] = [];
	@property({ attribute: false }) selectedFurnitureId: string | null = null;
	@property({ attribute: false }) sidebarTab: string = "zones";
	@property({ type: Boolean }) editable = false;
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ type: Boolean }) showHitCounts = false;
	@property({ attribute: false }) occupancy: Record<number, boolean> = {};
	@property({ attribute: false }) targetPrevXY: ({
		x: number;
		y: number;
	} | null)[] = [];
	@property({ attribute: false }) heatmapColors: Map<number, string> | null =
		null;
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;
	/** Maximum pixel size for the grid (live=480, editor=520) */
	@property({ type: Number }) maxGridPx = 480;
	/** Width fraction of parent element to use (default 0.55) */
	@property({ type: Number }) widthFraction = 0.55;
	/** Frozen bounds during painting (editor only) */
	@property({ attribute: false }) frozenBounds: {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} | null = null;

	static styles = css`
		:host {
			display: contents;
		}

		.grid-targets-wrapper {
			position: relative;
			display: inline-block;
		}

		.grid {
			display: grid;
			gap: 1px;
			background: var(--divider-color, #e0e0e0);
			border: 2px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			overflow: hidden;
			user-select: none;
		}

		.cell {
			cursor: pointer;
			transition: opacity 0.1s;
		}

		.cell:hover {
			opacity: 0.75;
		}

		.targets-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			pointer-events: none;
			z-index: 20;
		}

		.target-dot {
			position: absolute;
			width: 14px;
			height: 14px;
			border-radius: 50%;
			background: var(--primary-color, #03a9f4);
			border: 2px solid #fff;
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
			transform: translate(-50%, -50%);
			z-index: 10;
		}

		.target-dot.moving {
			background: #4caf50;
		}

		.target-dot.stationary {
			background: #ff9800;
		}

		.grid-dimensions {
			text-align: center;
			font-size: 12px;
			color: var(--secondary-text-color, #757575);
			margin-top: 8px;
		}
	`;

	render() {
		const bounds = this.frozenBounds ?? getRoomBounds(this.grid);
		const noRoom = bounds.minCol > bounds.maxCol;
		const minCol = noRoom ? 0 : bounds.minCol;
		const maxCol = noRoom ? GRID_COLS - 1 : bounds.maxCol;
		const minRow = noRoom ? 0 : bounds.minRow;
		const maxRow = noRoom ? bounds.maxRow : bounds.maxRow;
		const visCols = maxCol - minCol + 1;
		const visRows = maxRow - minRow + 1;
		const parentWidth =
			this.offsetWidth || this.parentElement?.offsetWidth || 800;
		const maxPx = Math.min(this.maxGridPx, parentWidth * this.widthFraction);
		const cellPx = Math.min(
			Math.floor(maxPx / visCols),
			Math.floor(maxPx / visRows),
			32,
		);

		return html`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${visCols}, ${cellPx}px); grid-template-rows: repeat(${visRows}, ${cellPx}px);"
					@mouseup=${this._onCellMouseUp}
				>
					${this._renderVisibleCells(minCol, maxCol, minRow, maxRow, cellPx)}
				</div>
				${this._renderFurnitureOverlay(cellPx, minCol, minRow, visCols, visRows)}
				${this._renderTargetDots(minCol, minRow, visCols, visRows)}
			</div>
			${this._renderGridDimensions()}
		`;
	}

	private _renderVisibleCells(
		minCol: number,
		maxCol: number,
		minRow: number,
		maxRow: number,
		cellPx: number,
	) {
		const heatmap = this.heatmapColors;
		const occupancy = this.occupancy;

		const cells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				const idx = r * GRID_COLS + c;
				const cellVal = this.grid[idx];
				const inRange = true;
				let bg = inRange ? getCellColor(cellVal, this.zoneConfigs) : "#1a1a1a";
				let border = "";
				if (inRange && cellIsInside(cellVal)) {
					const zoneId = cellZone(cellVal);
					if (heatmap) {
						const overlay = heatmap.get(zoneId);
						if (overlay) {
							bg = `linear-gradient(${overlay}, ${overlay}), linear-gradient(${bg}, ${bg})`;
						}
					}
					if (occupancy[zoneId]) {
						border = `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);`;
					}
				}
				cells.push(html`
					<div
						class="cell"
						style="background: ${bg}; width: ${cellPx}px; height: ${cellPx}px; ${border}"
						@mousedown=${() => {
							if (inRange) this._onCellMouseDown(idx);
						}}
						@mouseenter=${() => {
							if (inRange) this._onCellMouseEnter(idx);
						}}
					></div>
				`);
			}
		}
		return cells;
	}

	private _onCellMouseDown(index: number): void {
		this.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index, action: "down" },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onCellMouseEnter(index: number): void {
		this.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index, action: "enter" },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onCellMouseUp(): void {
		this.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { action: "up" },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _renderTargetDots(
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		return html`
			<div class="targets-overlay" style="pointer-events: none;">
				${this.targets.map((t, i) => {
					if (t.status === "inactive") return nothing;
					let pos =
						t.x != null
							? mapTargetToGridCell(t.x, t.y, this.roomWidth, this.roomDepth)
							: null;
					const onGrid =
						pos &&
						pos.col >= minCol &&
						pos.col <= minCol + visCols &&
						pos.row >= minRow &&
						pos.row <= minRow + visRows;
					if (t.status === "pending" && !onGrid && this.targetPrevXY[i]) {
						pos = mapTargetToGridCell(
							this.targetPrevXY[i]!.x,
							this.targetPrevXY[i]!.y,
							this.roomWidth,
							this.roomDepth,
						);
					}
					if (!pos) return nothing;
					const xPct = Math.max(
						0,
						Math.min(100, ((pos.col - minCol) / visCols) * 100),
					);
					const yPct = Math.max(
						0,
						Math.min(100, ((pos.row - minRow) / visRows) * 100),
					);
					return html`
						<div
							class="target-dot"
							style="left: ${xPct}%; top: ${yPct}%; background: ${TARGET_COLORS[i] || TARGET_COLORS[0]}; opacity: ${t.status === "pending" ? 0.3 : 1}; transition: opacity 0.5s ease;"
						></div>
						${
							t.status === "active" && t.signal > 0
								? html`
									<div style="position: absolute; left: ${xPct}%; top: ${yPct}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
										${t.signal}
									</div>
								`
								: nothing
						}
					`;
				})}
			</div>
		`;
	}

	private _renderGridDimensions() {
		const metrics = getGridRoomMetrics(
			this.grid,
			this.roomWidth,
			this.perspective,
		);
		if (!metrics) return nothing;
		return html`
			<div class="grid-dimensions">
				${metrics.widthM}m × ${metrics.depthM}m · Furthest point: ${metrics.furthestM}m
			</div>
		`;
	}

	private _renderFurnitureOverlay(
		cellPx: number,
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		if (!this.furniture.length) return nothing;

		return html`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${cellPx}
				.minCol=${minCol}
				.minRow=${minRow}
				.visCols=${visCols}
				.visRows=${visRows}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				@furniture-select=${(e: CustomEvent) => {
					e.stopPropagation();
					this.dispatchEvent(
						new CustomEvent("furniture-select", {
							detail: e.detail,
							bubbles: true,
							composed: true,
						}),
					);
				}}
				@furniture-pointer-down=${(e: CustomEvent) => {
					e.stopPropagation();
					this.dispatchEvent(
						new CustomEvent("furniture-pointer-down", {
							detail: e.detail,
							bubbles: true,
							composed: true,
						}),
					);
				}}
				@furniture-delete=${(e: CustomEvent) => {
					e.stopPropagation();
					this.dispatchEvent(
						new CustomEvent("furniture-delete", {
							detail: e.detail,
							bubbles: true,
							composed: true,
						}),
					);
				}}
			></epp-furniture-overlay>
		`;
	}
}

if (!customElements.get("epp-grid")) {
	customElements.define("epp-grid", EppGrid);
}

declare global {
	interface HTMLElementTagNameMap {
		"epp-grid": EppGrid;
	}
}
