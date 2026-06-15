import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
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
	fitCellPx,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
	MAX_RANGE,
} from "../lib/grid.js";
import {
	CELL_BG_BEYOND_MAX_RANGE,
	CELL_BG_OUT_OF_RANGE,
	getCellColor,
	overlayStripeGradient,
} from "../lib/heatmap.js";
import {
	type CellRangeStatus,
	classifyCellInSensor,
	computeSensorFov,
	getGridRoomMetrics,
	getVisibleRoomBounds,
	type SensorFov,
} from "../lib/room-geometry.js";
import type { SidebarTab } from "../lib/view-hash.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import type { Target } from "../types.js";
import "./epp-furniture-overlay.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";

// Cell decorations for painted overlays. Pitch (6px entry, 5px the others)
// preserved from the original hand-written gradients; the gradient itself is
// shared with the overlay-sidebar swatches via overlayStripeGradient.
const OVERLAY_STRIPE_CSS: Record<number, string> = {
	[CELL_OVERLAY_ENTRY]: `background-image: ${overlayStripeGradient(CELL_OVERLAY_ENTRY, 6)};`,
	[CELL_OVERLAY_INTERFERENCE]: `background-image: ${overlayStripeGradient(CELL_OVERLAY_INTERFERENCE, 5)};`,
	[CELL_OVERLAY_SUPPRESS]: `background-image: ${overlayStripeGradient(CELL_OVERLAY_SUPPRESS, 5)};`,
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
	@property({ attribute: false }) sidebarTab: SidebarTab = "zones";
	@property({ type: Boolean, reflect: true }) editable = false;
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ attribute: false }) occupancy: Record<number, boolean> = {};
	@property({ attribute: false }) targetPrevXY: ({
		x: number;
		y: number;
	} | null)[] = [];
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;
	/** Maximum detection range in mm */
	@property({ type: Number }) maxRangeMm = MAX_RANGE;
	/** Maximum pixel size for the grid (both call sites currently pass 480) */
	@property({ type: Number }) maxGridPx = 480;
	/** Map of target index → dismissed cell index (ephemeral, not persisted) */
	@property({ attribute: false }) dismissedTargets: Map<number, number> =
		new Map();
	/** Frozen bounds during painting (editor only) */
	@property({ attribute: false }) frozenBounds: {
		minCol: number;
		maxCol: number;
		minRow: number;
		maxRow: number;
	} | null = null;

	/** Measured content width of the host (px); 0 = unmeasured (e.g. unit tests). */
	@state() private _availPx = 0;
	private _ro?: ResizeObserver;
	/** TEMP DEBUG — on-screen width readout (empty in unit tests / no layout). */
	@state() private _dbg = "";

	/* v8 ignore start -- happy-dom has no real layout/ResizeObserver callback */
	connectedCallback(): void {
		super.connectedCallback();
		if (typeof ResizeObserver !== "undefined") {
			this._ro = new ResizeObserver((entries) => {
				const w = entries[0]?.contentRect.width ?? 0;
				if (w && Math.abs(w - this._availPx) >= 1)
					this._availPx = Math.floor(w);
			});
			this._ro.observe(this);
		}
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._ro?.disconnect();
	}
	/* v8 ignore stop */

	/* v8 ignore start -- happy-dom has no layout (clientWidth 0); measured visually */
	// Deterministic, synchronous width measurement that doesn't depend on the
	// ResizeObserver. In the HA companion webview the observer doesn't deliver a
	// usable callback, leaving _availPx at 0 → fitCellPx snaps to the ceiling cell
	// size and overflows. The host's own clientWidth tracks the constrained parent
	// (`:host { display: block }`), so reading it here fits the grid to the viewport.
	// Converges in 2 renders: clientWidth stays constant regardless of cell size, so
	// the second pass sees |w - _availPx| < 1 and stops.
	firstUpdated(): void {
		this._measureAvail();
	}
	updated(): void {
		this._measureAvail();
	}
	private _measureAvail(): void {
		const w = this.clientWidth;
		if (w && Math.abs(w - this._availPx) >= 1) this._availPx = w;
		// TEMP DEBUG — remove after diagnosing the mobile grid-width issue.
		if (w) this._dbg = this._buildDbg();
	}

	// TEMP DEBUG helper — report widths up the ancestor chain so the on-device
	// layout can be diagnosed (mobile has no usable console).
	private _buildDbg(): string {
		const r = (el: Element | null | undefined) =>
			el
				? `${Math.round(el.getBoundingClientRect().width)}/${el.clientWidth}/${el.scrollWidth}`
				: "—";
		const gc = this.parentElement; // .grid-container
		const em = gc?.parentElement; // .editor-mobile / .grid-column
		const panel = em?.parentElement; // .panel (or deeper)
		const root = this.getRootNode();
		const pHost = root instanceof ShadowRoot ? root.host : null;
		const gridEl = this.renderRoot?.querySelector?.(".grid");
		return [
			`iw=${window.innerWidth} host=${r(this)}`,
			`gc=${r(gc)} em=${r(em)}`,
			`panel=${r(panel)} pHost=${r(pHost)}`,
			`grid=${r(gridEl)} avail=${this._availPx}`,
		].join("\n");
	}
	/* v8 ignore stop */

	static styles = css`
		:host {
			display: block;
		}

		/* TEMP DEBUG overlay — remove after diagnosing the mobile grid width. */
		.dbg {
			position: fixed;
			top: 0;
			left: 0;
			z-index: 99999;
			max-width: 100vw;
			background: rgba(0, 0, 0, 0.85);
			color: #0f0;
			font: 11px/1.3 monospace;
			white-space: pre-wrap;
			padding: 3px 5px;
			pointer-events: none;
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

		/* Paint strokes must own the touch gesture — otherwise the browser
		   claims it for scrolling and fires pointercancel mid-stroke. The
		   live grid stays scrollable. */
		:host([editable]) .grid {
			touch-action: none;
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
		const scan = this._getScan();
		const bounds = this.frozenBounds ?? scan.bounds;
		const noRoom = bounds.minCol > bounds.maxCol;
		const minCol = noRoom ? 0 : bounds.minCol;
		const maxCol = noRoom ? GRID_COLS - 1 : bounds.maxCol;
		const minRow = noRoom ? 0 : bounds.minRow;
		const maxRow = noRoom ? GRID_ROWS - 1 : bounds.maxRow;
		const visCols = maxCol - minCol + 1;
		const visRows = maxRow - minRow + 1;
		// The grid adds a 2px border (×2) + (visCols-1)×1px gaps on top of the
		// cells; subtract that from the measured width so the grid fits exactly.
		const gridChromePx = this._availPx > 0 ? 4 + (visCols - 1) : 0;
		const cellPx = fitCellPx(
			this.maxGridPx,
			// When measured, clamp to ≥1px so a "measured but tiny" width (chrome
			// exceeds the available px in an extreme-narrow/transient layout) still
			// shrinks. A negative value would read as "unmeasured" in fitCellPx and
			// snap to the ceiling — overflowing instead of shrinking. The unmeasured
			// branch keeps passing _availPx unchanged so fitCellPx's own fallback
			// applies when _availPx <= 0.
			this._availPx > 0
				? Math.max(1, this._availPx - gridChromePx)
				: this._availPx,
			visCols,
			visRows,
		);

		return html`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${visCols}, ${cellPx}px); grid-template-rows: repeat(${visRows}, ${cellPx}px);"
					@pointerup=${this.editable ? this._onStrokeEnd : nothing}
					@pointercancel=${this.editable ? this._onStrokeEnd : nothing}
				>
					${this._renderVisibleCells(scan.status, minCol, maxCol, minRow, maxRow, cellPx)}
				</div>
				${this._renderFurnitureOverlay(cellPx, minCol, minRow, visCols, visRows)}
				${this._renderTargetDots(minCol, maxCol, minRow, maxRow, visCols, visRows)}
			</div>
			${this._renderGridDimensions(scan.metrics)}
			${this._dbg ? html`<div class="dbg">${this._dbg}</div>` : nothing}
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

	// Full-grid scan cache, following the _fovCache invalidation pattern:
	// reference keys (grid / perspective / fov) rely on the same contract —
	// callers replace those values, never mutate them in place. Holds the
	// per-cell FOV classification, the visible room bounds and the room
	// metrics; without it every render — each live tick, every painted
	// cell — re-ran ~4 full-grid scans (≈1600 classifyCellInSensor calls).
	// Deliberately keys on the full grid ref: per-cell classification doesn't
	// depend on which cells are painted, but simplicity wins over granularity.
	private _scanCache: {
		grid: Uint8Array;
		fov: SensorFov | null;
		perspective: number[] | null;
		roomWidth: number;
		maxRangeMm: number;
		status: CellRangeStatus[];
		bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number };
		metrics: { widthM: number; depthM: number; furthestM: number } | null;
	} | null = null;

	private _getScan(): NonNullable<EppGrid["_scanCache"]> {
		const fov = this._getSensorFov();
		const c = this._scanCache;
		if (
			c &&
			c.grid === this.grid &&
			c.fov === fov &&
			// perspective participates beyond fov: getGridRoomMetrics falls back
			// to it directly when the fov is degenerate (computeSensorFov → null).
			c.perspective === this.perspective &&
			c.roomWidth === this.roomWidth &&
			c.maxRangeMm === this.maxRangeMm
		) {
			return c;
		}
		const status: CellRangeStatus[] = new Array(GRID_CELL_COUNT);
		for (let r = 0; r < GRID_ROWS; r++) {
			for (let col = 0; col < GRID_COLS; col++) {
				status[r * GRID_COLS + col] = classifyCellInSensor(
					col,
					r,
					fov,
					this.roomWidth,
					this.maxRangeMm,
				);
			}
		}
		this._scanCache = {
			grid: this.grid,
			fov,
			perspective: this.perspective,
			roomWidth: this.roomWidth,
			maxRangeMm: this.maxRangeMm,
			status,
			bounds: getVisibleRoomBounds(
				this.grid,
				fov,
				this.roomWidth,
				this.maxRangeMm,
			),
			metrics: getGridRoomMetrics(
				this.grid,
				this.roomWidth,
				this.perspective,
				fov,
				this.maxRangeMm,
			),
		};
		return this._scanCache;
	}

	private _renderVisibleCells(
		status: CellRangeStatus[],
		minCol: number,
		maxCol: number,
		minRow: number,
		maxRow: number,
		cellPx: number,
	) {
		const occupancy = this.occupancy;

		const cells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				const idx = r * GRID_COLS + c;
				const cellVal = this.grid[idx];
				const cellStatus = status[idx];
				const inRange = cellStatus === "in_range";
				const inside = cellIsInside(cellVal);
				let bg: string;
				if (cellStatus === "in_range") {
					bg = getCellColor(cellVal, this.zoneConfigs);
				} else if (cellStatus === "beyond_max_range" && inside) {
					// Only inside-room cells get the hatch-on-white "configured out"
					// decoration; outside-room padding rendered as plain outside so
					// it doesn't read as an inside-room cell limited by config.
					bg = CELL_BG_BEYOND_MAX_RANGE;
				} else if (cellStatus === "beyond_max_range") {
					bg = getCellColor(cellVal, this.zoneConfigs);
				} else {
					bg = CELL_BG_OUT_OF_RANGE;
				}
				let occupancyStyle = "";
				if (inRange && cellIsInside(cellVal)) {
					const zoneId = cellZone(cellVal);
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
				// Paint handlers only exist in the editor AND on paintable cells —
				// the live grid is a passive display (hover there used to dispatch
				// cell-paint events nothing listened to).
				const paintable = this.editable && inRange;
				// Cells stay <div>s deliberately: they form a pointer-driven
				// painting surface (no discrete click semantics), and 400 focusable
				// buttons would wreck both keyboard navigation and render cost.
				cells.push(html`
					<div
						class="cell"
						style="background: ${bg}; width: ${cellPx}px; height: ${cellPx}px; ${occupancyStyle} ${overlayMarker}"
						@pointerdown=${
							paintable
								? (e: PointerEvent) => this._onCellPointerDown(idx, e)
								: nothing
						}
						@pointerenter=${
							paintable ? () => this._onCellPointerEnter(idx) : nothing
						}
					></div>
				`);
			}
		}
		return cells;
	}

	private _onCellPointerDown(index: number, e: PointerEvent): void {
		// Touch pointers are implicitly captured by the pointerdown target,
		// which would retarget the whole stroke to the first cell. Release the
		// capture so per-cell pointerenter keeps firing as the finger moves
		// (the grid's touch-action: none stops the browser claiming the
		// gesture for scrolling). Guarded: synthetic test events and mouse
		// pointers hold no capture, and happy-dom lacks the API entirely.
		const target = e.target as Element | null;
		if (target?.hasPointerCapture?.(e.pointerId)) {
			target.releasePointerCapture(e.pointerId);
		}
		// Reset coalesce state at the start of every drag. The matching
		// pointerup might be window-level (drag ends outside the grid), so we
		// can't rely on _onStrokeEnd alone to clear _lastEnterIdx — otherwise
		// the next stroke would skip the first enter on a re-entered cell.
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
	// Native pointerenter can re-fire as the DOM re-renders mid-drag, and even
	// during plain hover Lit re-renders bind fresh listeners. Coalescing here
	// prevents ~900 redundant dispatches across the shadow DOM boundary.
	private _lastEnterIdx = -1;

	private _onCellPointerEnter(index: number): void {
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

	// Bound handler for both pointerup and pointercancel on the grid —
	// a touch-scroll takeover must end the stroke exactly like a release.
	private _onStrokeEnd = (): void => {
		this._lastEnterIdx = -1;
		this.dispatchEvent(
			new CustomEvent("cell-paint", {
				detail: { action: "up" },
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _renderTargetDots(
		minCol: number,
		maxCol: number,
		minRow: number,
		maxRow: number,
		visCols: number,
		visRows: number,
	) {
		// Plain indexed loop: dots are identified by their positional index,
		// so repeat()'s keyed-reordering machinery (previously keyed BY that
		// index) bought nothing over positional reuse.
		const dots = [];
		const count = Math.min(this.targets.length, MAX_TARGETS);
		for (let i = 0; i < count; i++) {
			dots.push(
				this._renderTargetDot(
					this.targets[i],
					i,
					minCol,
					maxCol,
					minRow,
					maxRow,
					visCols,
					visRows,
				),
			);
		}
		return html`
			<div class="targets-overlay" style="pointer-events: none;">${dots}</div>
		`;
	}

	private _renderTargetDot(
		t: Target,
		i: number,
		minCol: number,
		maxCol: number,
		minRow: number,
		maxRow: number,
		visCols: number,
		visRows: number,
	) {
		if (t.status === "inactive") return nothing;
		const inBounds = (p: { col: number; row: number } | null) =>
			p !== null &&
			p.col >= minCol &&
			p.col <= maxCol &&
			p.row >= minRow &&
			p.row <= maxRow;
		let pos =
			t.x != null && t.y != null
				? mapTargetToGridCell(t.x, t.y, this.roomWidth, this.roomDepth)
				: null;
		if (t.status === "pending" && !inBounds(pos) && this.targetPrevXY[i]) {
			pos = mapTargetToGridCell(
				this.targetPrevXY[i].x,
				this.targetPrevXY[i].y,
				this.roomWidth,
				this.roomDepth,
			);
		}
		// Off-grid positions never render — neither an active target nor a
		// pending target whose prevXY fallback is also off-grid may show up
		// pinned to the clamped edge.
		if (pos === null || !inBounds(pos)) return nothing;
		const xPct = Math.max(
			0,
			Math.min(100, ((pos.col - minCol) / visCols) * 100),
		);
		const yPct = Math.max(
			0,
			Math.min(100, ((pos.row - minRow) / visRows) * 100),
		);
		// Bounds-checked cell index (null when off-grid) shared by the
		// dismissed + overlay checks.
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
	}

	private _renderGridDimensions(
		metrics: { widthM: number; depthM: number; furthestM: number } | null,
	) {
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

		// The overlay's furniture-* events are `composed: true` and bubble
		// straight through this component's shadow boundary to the panel —
		// no stopPropagation/re-dispatch pass-through wrappers needed.
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
