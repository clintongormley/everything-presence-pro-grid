import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { MAX_TARGETS, TARGET_COLORS } from "../constants.js";
import { mapTargetToGridCell, targetCellIndex } from "../lib/coordinates.js";
import type { FurnitureItem } from "../lib/furniture.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	cellIsInside,
	cellOverlay,
	cellZone,
	GRID_COLS,
	GRID_ROWS,
	MAX_RANGE,
} from "../lib/grid.js";
import {
	CELL_BG_BEYOND_MAX_RANGE,
	CELL_BG_OUT_OF_RANGE,
	getCellColor,
} from "../lib/heatmap.js";
import {
	classifyCellInSensor,
	computeSensorFov,
	getGridRoomMetrics,
	getVisibleRoomBounds,
	type SensorFov,
} from "../lib/room-geometry.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import type { Target } from "../types.js";
import "./epp-furniture-overlay.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

const OVERLAY_STRIPE_CSS: Record<number, string> = {
	[CELL_OVERLAY_ENTRY]:
		"background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(60,60,60,0.7) 6px, rgba(60,60,60,0.7) 8px);",
	[CELL_OVERLAY_INTERFERENCE]:
		"background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, var(--error-color, #cc3333) 5px, var(--error-color, #cc3333) 7px);",
	[CELL_OVERLAY_SUPPRESS]:
		"background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, var(--error-color, #cc3333) 5px, var(--error-color, #cc3333) 7px), repeating-linear-gradient(45deg, transparent, transparent 5px, var(--error-color, #cc3333) 5px, var(--error-color, #cc3333) 7px);",
};

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
	@property({ type: Boolean, reflect: true }) editable = false;
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ type: Boolean }) showHitCounts = false;
	@property({ attribute: false }) occupancy: Record<number, boolean> = {};
	@property({ attribute: false }) targetPrevXY: ({
		x: number;
		y: number;
	} | null)[] = [];
	@property({ attribute: false }) heatmapColors: Map<number, string> | null =
		null;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;
	/** Maximum detection range in mm */
	@property({ type: Number }) maxRangeMm = MAX_RANGE;
	/** Maximum pixel size for the grid (live=480, editor=520) */
	/** Map of target index → dismissed cell index (ephemeral, not persisted) */
	@property({ attribute: false }) dismissedTargets: Map<number, number> =
		new Map();
	@property({ type: Number }) maxGridPx = 480;
	/** Frozen bounds during painting (editor only) */
	@property({ attribute: false }) frozenBounds: {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} | null = null;

	static styles = css`
		:host {
			display: block;
		}

		.grid-targets-wrapper {
			position: relative;
			display: inline-block;
			vertical-align: top;
		}

		:host(:not([editable])) .grid-targets-wrapper {
			overflow: hidden;
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
			transition: opacity 0.1s;
		}

		:host([editable]) .cell {
			cursor: pointer;
		}

		:host([editable]) .cell:hover {
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
			border: 2px solid var(--card-background-color, #fff);
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
			transform: translate(-50%, -50%);
			z-index: 10;
			pointer-events: auto;
		}

		.target-dot.clickable {
			cursor: pointer;
		}

		:host([editable]) .target-dot {
			pointer-events: none;
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

	willUpdate(changedProperties: PropertyValues) {
		// Detect targets that have moved off their dismissed cell and dispatch
		// `target-undismissed` events. Mutation of `this.dismissedTargets` lives
		// in the parent (panel) — the child only signals the transition.
		if (
			!changedProperties.has("targets") &&
			!changedProperties.has("dismissedTargets") &&
			!changedProperties.has("roomWidth") &&
			!changedProperties.has("roomDepth")
		) {
			return;
		}
		if (this.dismissedTargets.size === 0) return;
		for (const [i, dismissedIdx] of this.dismissedTargets) {
			const t = this.targets[i];
			if (!t || t.status === "inactive" || t.x == null || t.y == null) continue;
			const pos = mapTargetToGridCell(t.x, t.y, this.roomWidth, this.roomDepth);
			if (!pos) continue;
			// Bounds-checked: an off-grid target (idx === null) has by definition
			// moved off its dismissed cell. The raw row*GRID_COLS+col aliased
			// col ≥ 20 into the next row and could coincide with dismissedIdx,
			// suppressing the undismiss.
			const idx = targetCellIndex(pos);
			if (idx !== dismissedIdx) {
				this.dispatchEvent(
					new CustomEvent("target-undismissed", {
						detail: { targetIndex: i },
						bubbles: true,
						composed: true,
					}),
				);
			}
		}
	}

	render() {
		const bounds =
			this.frozenBounds ??
			getVisibleRoomBounds(
				this.grid,
				this._getSensorFov(),
				this.roomWidth,
				this.maxRangeMm,
			);
		const noRoom = bounds.minCol > bounds.maxCol;
		const minCol = noRoom ? 0 : bounds.minCol;
		const maxCol = noRoom ? GRID_COLS - 1 : bounds.maxCol;
		const minRow = noRoom ? 0 : bounds.minRow;
		const maxRow = noRoom ? GRID_ROWS - 1 : bounds.maxRow;
		const visCols = maxCol - minCol + 1;
		const visRows = maxRow - minRow + 1;
		const cellPx = Math.min(
			Math.floor(this.maxGridPx / visCols),
			Math.floor(this.maxGridPx / visRows),
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
				${this._renderTargetDots(minCol, maxCol, minRow, maxRow, visCols, visRows)}
			</div>
			${this._renderGridDimensions()}
		`;
	}

	// FOV is recomputed only when the `perspective` array reference changes.
	// Contract: callers replace the array on update (the panel and wizard both
	// reassign the field rather than mutating in place), so reference equality
	// is a sufficient invalidation signal.
	// Sentinel marks "no perspective cached yet" so degenerate perspectives
	// (computeSensorFov returns null) still benefit from the cache instead
	// of recomputing on every render.
	private static readonly _FOV_UNCACHED: object = {};
	private _fovCache: SensorFov | null = null;
	private _fovPerspective: number[] | null | object = EppGrid._FOV_UNCACHED;

	private _getSensorFov(): SensorFov | null {
		if (!this.perspective) return null;
		if (this._fovPerspective === this.perspective) return this._fovCache;
		this._fovCache = computeSensorFov(this.perspective);
		this._fovPerspective = this.perspective;
		return this._fovCache;
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
		const fov = this._getSensorFov();
		const maxRange = this.maxRangeMm;

		const cells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				const idx = r * GRID_COLS + c;
				const cellVal = this.grid[idx];
				const status = classifyCellInSensor(
					c,
					r,
					fov,
					this.roomWidth,
					maxRange,
				);
				const inRange = status === "in_range";
				const inside = cellIsInside(cellVal);
				let bg: string;
				if (status === "in_range") {
					bg = getCellColor(cellVal, this.zoneConfigs);
				} else if (status === "beyond_max_range" && inside) {
					// Only inside-room cells get the hatch-on-white "configured out"
					// decoration; outside-room padding rendered as plain outside so
					// it doesn't read as an inside-room cell limited by config.
					bg = CELL_BG_BEYOND_MAX_RANGE;
				} else if (status === "beyond_max_range") {
					bg = getCellColor(cellVal, this.zoneConfigs);
				} else {
					bg = CELL_BG_OUT_OF_RANGE;
				}
				let occupancyStyle = "";
				if (inRange && cellIsInside(cellVal)) {
					const zoneId = cellZone(cellVal);
					if (heatmap) {
						const overlay = heatmap.get(zoneId);
						if (overlay) {
							bg = `linear-gradient(${overlay}, ${overlay}), linear-gradient(${bg}, ${bg})`;
						}
					}
					if (occupancy[zoneId]) {
						const namedColor =
							zoneId > 0 ? this.zoneConfigs[zoneId - 1]?.color : null;
						const zoneColor = namedColor ?? "#999";
						const mixBase = namedColor ? "#222" : "#444";
						occupancyStyle = `position: relative; z-index: 1; box-shadow: 0 0 8px 1px color-mix(in srgb, ${zoneColor} 60%, ${mixBase});`;
					}
				}
				const overlayMarker =
					inRange && cellIsInside(cellVal)
						? (OVERLAY_STRIPE_CSS[cellOverlay(cellVal)] ?? "")
						: "";
				cells.push(html`
					<div
						class="cell"
						style="background: ${bg}; width: ${cellPx}px; height: ${cellPx}px; ${occupancyStyle} ${overlayMarker}"
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
		// Reset coalesce state at the start of every drag. The matching mouseup
		// might be window-level (drag ends outside the grid), so we can't rely
		// on _onCellMouseUp alone to clear _lastEnterIdx — otherwise the next
		// stroke would skip the first enter on a re-entered cell.
		this._lastEnterIdx = -1;
		this.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index, action: "down" },
				bubbles: true,
				composed: true,
			}),
		);
	}

	// Throttle: skip repeats on the same cell during a continuous hover.
	// Native mouseenter can re-fire as the DOM re-renders mid-drag, and even
	// during plain hover Lit re-renders bind fresh listeners. Coalescing here
	// prevents ~900 redundant dispatches across the shadow DOM boundary.
	private _lastEnterIdx = -1;

	private _onCellMouseEnter(index: number): void {
		if (index === this._lastEnterIdx) return;
		this._lastEnterIdx = index;
		this.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { index, action: "enter" },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onCellMouseUp(): void {
		this._lastEnterIdx = -1;
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
		maxCol: number,
		minRow: number,
		maxRow: number,
		visCols: number,
		visRows: number,
	) {
		return html`
			<div class="targets-overlay" style="pointer-events: none;">
				${repeat(
					this.targets.slice(0, MAX_TARGETS),
					(_t, i) => i,
					(t, i) => {
						if (t.status === "inactive") return nothing;
						let pos =
							t.x != null && t.y != null
								? mapTargetToGridCell(t.x, t.y, this.roomWidth, this.roomDepth)
								: null;
						const onGrid =
							pos &&
							pos.col >= minCol &&
							pos.col <= maxCol &&
							pos.row >= minRow &&
							pos.row <= maxRow;
						if (t.status === "pending" && !onGrid && this.targetPrevXY[i]) {
							pos = mapTargetToGridCell(
								this.targetPrevXY[i]!.x,
								this.targetPrevXY[i]!.y,
								this.roomWidth,
								this.roomDepth,
							);
						} else if (!onGrid) {
							// Active target with a position outside the visible bounds
							// must not render at the clamped edge.
							return nothing;
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
						// Bounds-checked cell index (null when off-grid, e.g. a pending
						// fallback position) shared by the dismissed + overlay checks.
						const cellIdx = targetCellIndex(pos);
						// Hide dismissed targets while they remain on the dismissed cell.
						// Detection of "moved off the cell" lives in willUpdate, where
						// the target-undismissed event is dispatched. The child never
						// mutates this.dismissedTargets — that's the parent's prop.
						if (cellIdx !== null && this.dismissedTargets.get(i) === cellIdx) {
							return nothing;
						}
						// Interference/suppress cells don't confirm presence by themselves:
						// suppress is skipped by the engine, interference requires continuity.
						// Hide the dot when the zone isn't already occupied via another path.
						if (cellIdx !== null && cellIdx < this.grid.length) {
							const overlay = cellOverlay(this.grid[cellIdx]);
							if (
								overlay === CELL_OVERLAY_INTERFERENCE ||
								overlay === CELL_OVERLAY_SUPPRESS
							) {
								const zid = cellZone(this.grid[cellIdx]);
								if (!this.occupancy[zid]) {
									return nothing;
								}
							}
						}
						const opacity = t.status === "pending" ? 0.3 : 1;
						return html`
							<div
								class="target-dot ${this.editable ? "" : "clickable"}"
								style="left: ${xPct}%; top: ${yPct}%; background: ${TARGET_COLORS[i]}; opacity: ${opacity}; transition: opacity 0.5s ease;"
								@click=${(e: Event) => {
									if (this.editable) return;
									e.stopPropagation();
									this.dispatchEvent(
										new CustomEvent("target-click", {
											detail: {
												targetIndex: i,
												x: t.x,
												y: t.y,
												pctX: xPct,
												pctY: yPct,
											},
											bubbles: true,
											composed: true,
										}),
									);
								}}
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
					},
				)}
			</div>
		`;
	}

	private _renderGridDimensions() {
		const metrics = getGridRoomMetrics(
			this.grid,
			this.roomWidth,
			this.perspective,
			this._getSensorFov(),
			this.maxRangeMm,
		);
		if (!metrics) return nothing;
		return html`
			<div class="grid-dimensions">
				${this.localize("live.grid_dimensions", {
					width: metrics.widthM,
					depth: metrics.depthM,
					furthest: metrics.furthestM,
				})}
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
