import { css, html, LitElement, nothing, type PropertyValues, svg } from "lit";
import { property, state } from "lit/decorators.js";
import { MAX_TARGETS, TARGET_COLORS } from "../constants.js";
import { mapTargetToGridCell, targetCellIndex } from "../lib/coordinates.js";
import { planRectPct } from "../lib/floor-plan.js";
import type { FurnitureItem } from "../lib/furniture.js";
import { parseRgb } from "../lib/furniture-contrast.js";
import {
	computeFurnitureTones,
	type FurnitureItemTone,
} from "../lib/furniture-tones.js";
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
	getRawRoomBounds,
	MAX_RANGE,
} from "../lib/grid.js";
import {
	CELL_BG_BEYOND_MAX_RANGE,
	CELL_BG_OUT_OF_RANGE,
	fadedRoomColor,
	getCellColor,
	heatCellColor,
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
import type { EppFurnitureOverlay } from "./epp-furniture-overlay.js";
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
	/** When false, painted overlay stripes (entry/interference/suppress) are hidden. */
	@property({ type: Boolean }) showOverlays = true;
	/** When false, the dimensions + furthest-point caption below the grid is hidden. */
	@property({ type: Boolean }) showDimensions = true;
	/**
	 * Clean-map mode (overview card "Show grid" off). Drops the gridlines (gap →
	 * 0 via the reflected [plain] attribute), zone colouring, occupancy glow and
	 * overlay stripes — keeping only the in/out-of-range shading, targets and
	 * furniture. Reflected so the `:host([plain])` CSS can null the gap.
	 */
	@property({ type: Boolean, reflect: true }) plain = false;
	/**
	 * Optional CSS fill for the unpainted rest-of-room (zone 0) cells; undefined
	 * keeps the theme card background. Painted zones and outside cells ignore it.
	 * In plain mode (zones flattened) it colours the whole in-range room.
	 */
	@property({ attribute: false }) roomColor?: string;
	/**
	 * Fill mode (overview card): let the grid grow to fill its measured width
	 * instead of stopping at the desktop cell cap, and drop the viewport-height
	 * bound so the map fills the card's width (growing taller to match) rather
	 * than leaving whitespace. The panel leaves this false to keep its caps.
	 */
	@property({ type: Boolean }) fill = false;
	/**
	 * Overview mode (card): render in-room out-of-coverage cells (outside the
	 * 120° cone or beyond the configured max range) as a faint wash of the room
	 * colour instead of the cross-hatch, and never hatch outside-room cells, so
	 * the room reads as a clean rectangle. Defaults off — the panel keeps the
	 * detailed FOV cross-hatch used during calibration and zone editing.
	 */
	@property({ type: Boolean }) fadeUncovered = false;
	/**
	 * Mobile flag: use the compact mobile cell-size tier (see render(): a 480px /
	 * 32px cell cap instead of the desktop 960px / 48px). It NO LONGER changes how
	 * the height budget is derived — both desktop and mobile now container-measure
	 * the box the panel gives us (see _measureAvail). On mobile the panel bounds that
	 * box declaratively (a flex-shrinkable grid column capped at 45vh), so a sibling
	 * rendered below the map — the detection log — simply takes its space and the map
	 * shrinks to fit (#338), exactly as on desktop.
	 */
	@property({ type: Boolean }) mobile = false;
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
	/** Dense 400-entry (20x20) activity heatmap, 0..255 per cell; 0 = no heat. */
	@property({ attribute: false }) heatmapCells: number[] = [];
	/** When true, renders the `.heatmap-overlay` (heat cells + live trails). */
	@property({ type: Boolean }) showHeatmap = false;
	/** Per-target trail point history (room-space mm), one array per target. */
	@property({ attribute: false }) trails: Array<
		Array<{ x: number; y: number }>
	> = [];
	/** Floor-plan background image URL; undefined → no plan layer. */
	@property({ attribute: false }) floorPlan?: string;
	/** Floor-plan opacity, 0..1. */
	@property({ type: Number }) floorPlanOpacity = 1;
	/** Set when the plan image fails to load, so we drop the layer this render. */
	@state() private _planError = false;

	/** Measured content width of the host (px); 0 = unmeasured (e.g. unit tests). */
	@state() private _availPx = 0;
	/** Measured available height for the grid (px); 0 = unmeasured. */
	@state() private _availHeightPx = 0;
	/** Per-item furniture tone, id → {color, halo}; memoised, recomputed only
	 *  when a cell-background-affecting property changes (never on target moves). */
	@state() private _furnitureTones?: Map<string, FurnitureItemTone>;
	private _ro?: ResizeObserver;
	/** Pending post-layout re-measure scheduled in firstUpdated (see below). */
	private _settleRaf?: number;

	// Re-measure the box on a height-only viewport change. Our ResizeObserver keys
	// off OUR box, and a pure-height viewport change (a mobile URL bar collapsing or
	// the soft keyboard opening) reshapes that box without changing our WIDTH — the
	// width-only RO comparison a naive observer runs would miss it. The RO is also
	// documented as unreliable in the HA companion webview, so this window-resize
	// hook is the caller-agnostic backstop that keeps the measured budget fresh on
	// both axes. _measureAvail's own >=1px dirty-guards make a no-change measure a
	// no-op, so over-calling costs nothing. Detached on disconnect.
	private _onResize = (): void => {
		this._measureAvail();
	};

	connectedCallback(): void {
		super.connectedCallback();
		if (typeof ResizeObserver !== "undefined") {
			// Our BOX is the height budget now (see _measureAvail), so the observer
			// has to react to height as well as width. This is the primary
			// re-measure trigger and the only caller-agnostic one: a sibling BELOW
			// the grid (the panel's detection log) expanding shrinks our box without
			// changing any of the grid's properties, so Lit's updated() never fires.
			this._ro = new ResizeObserver(() => {
				this._measureAvail();
			});
			this._ro.observe(this);
		}
		window.addEventListener("resize", this._onResize);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._ro?.disconnect();
		window.removeEventListener("resize", this._onResize);
		if (this._settleRaf !== undefined) {
			cancelAnimationFrame(this._settleRaf);
			this._settleRaf = undefined;
		}
	}

	// Synchronous measurement on the first update, rather than waiting for the
	// ResizeObserver's first (async) callback: without it _availPx stays 0 for
	// that first frame, and fitCellPx reads 0 as "unmeasured" and snaps to the
	// ceiling cell size, so the grid would overflow before self-correcting a
	// tick later. The host's own clientWidth tracks the constrained parent
	// (`:host { display: flex }` — still block-level in layout terms, so the
	// clientWidth reasoning is unchanged), so reading it here fits the grid to
	// the viewport from the first paint. Converges in 2 renders: clientWidth
	// stays constant regardless of cell size, so the second pass sees
	// |w - _availPx| < 1 and stops.
	firstUpdated(): void {
		this._measureAvail();
		// Defense in depth: re-measure once after the next frame. A freshly-mounted
		// grid can measure its box (clientHeight) before an async-rendering sibling
		// above it in the column — e.g. the header's ha-select, which is 0px until
		// it upgrades — has laid out and claimed its space, so the box we read here
		// can be transiently taller than its settled size, over-measuring the
		// height budget. One post-layout re-measure self-corrects it, bounding any
		// such transient to <=1 frame. (The .panel-header CSS reserve prevents the
		// known case; this guards future late-laying-out chrome above the grid.)
		if (typeof requestAnimationFrame !== "undefined") {
			this._settleRaf = requestAnimationFrame(() => {
				this._settleRaf = undefined;
				if (this.isConnected) this._measureAvail();
			});
		}
	}
	updated(changed: PropertyValues): void {
		this._measureAvail();
		this._updateFurnitureTones(changed);
	}

	private _updateFurnitureTones(changed: PropertyValues): void {
		if (!this.furniture.length) {
			this._furnitureTones = undefined;
			return;
		}
		// Cell backgrounds depend on these; target/occupancy/selection changes
		// (the hot path) do not, so we skip the getComputedStyle reads for them.
		const affects =
			changed.has("furniture") ||
			changed.has("grid") ||
			changed.has("zoneConfigs") ||
			changed.has("roomColor") ||
			changed.has("roomWidth") ||
			changed.has("roomDepth") ||
			changed.has("plain") ||
			changed.has("perspective") ||
			changed.has("maxRangeMm") ||
			// a paint-stroke freeze/unfreeze changes which cells are rendered, so
			// a cell newly revealed under an item must be re-read.
			changed.has("frozenBounds");
		if (!affects && this._furnitureTones !== undefined) return;
		this._furnitureTones = computeFurnitureTones(
			this.furniture,
			this.roomWidth,
			this.roomDepth,
			(idx) => this._readCellRgb(idx),
		);
		// Setting `_furnitureTones` here (inside `updated()`, after the cells
		// this computation reads have themselves rendered) schedules a second
		// Lit update to re-render the overlay's `.furnitureTones` binding — a
		// single `await el.updateComplete` in callers/tests does not wait for
		// that cascade (Lit's documented `updateComplete` contract: it
		// resolves before a property set inside `updated()` is applied). The
		// overlay element already exists in the DOM from the render that just
		// happened, so push the value onto it directly too — the later
		// reactive re-render is then a harmless no-op (same value, `nothing`
		// diff) rather than the only path to consistency.
		const overlay = this.shadowRoot?.querySelector<EppFurnitureOverlay>(
			"epp-furniture-overlay",
		);
		if (overlay) overlay.furnitureTones = this._furnitureTones;
	}

	private _readCellRgb(idx: number): [number, number, number] | null {
		// Only cells inside the visible/in-range window are rendered, so a cell
		// outside it legitimately has no element — null then means "keep the
		// default grey for this item", not an error.
		const cell = this.shadowRoot?.querySelector(`.cell[data-idx="${idx}"]`);
		if (!cell) return null;
		return parseRgb(getComputedStyle(cell).backgroundColor);
	}

	private _measureAvail(): void {
		const w = this.clientWidth;
		if (w && Math.abs(w - this._availPx) >= 1) this._availPx = w;
		// Fill mode (the dashboard overview card) fills the WIDTH and grows tall — it
		// has no height budget at all, so don't measure one, and zero it so a mode
		// flip can never leave a stale budget latched. Mobile does NOT early-return
		// here any more: it container-measures the box just like desktop, because the
		// panel now bounds the mobile box declaratively (a flex column capped at 45vh)
		// instead of the grid guessing a viewport fraction (#338).
		if (this.fill) {
			this._availHeightPx = 0;
			return;
		}
		// Measure THE BOX WE WERE GIVEN, never the window. The panel makes the grid
		// card flex:1 of a height-bounded column, so this clientHeight is a pure
		// function of the layout: it cannot feed back from the map's own content,
		// and — unlike a viewport-relative getBoundingClientRect().top — it does not
		// change when an ancestor scrolls. That makes the scroll-driven re-render
		// loop that fed PR #339 structurally impossible now, not merely avoided.
		// The dimensions caption renders INSIDE this box, below the map, so its
		// measured height comes off the top of the budget.
		const h = Math.floor(this.clientHeight - this._captionBlockPx());
		// 0 is fitCellPx's "never measured" sentinel: it drops the height term and
		// falls back to WIDTH-fit. So 0 must mean exactly that, and nothing else.
		//
		// A MEASURED box that is merely tiny — even one shorter than the caption
		// inside it, so `h` goes negative — is not unmeasured. It is a real box that
		// really is that small, and the map must keep shrinking to fit it. Resolving
		// it to 0 instead inverts the invariant: the map snaps to the width-fit
		// ceiling and gets BIGGER as its box gets smaller. That is #339's failure
		// mode, and it was still reachable here — at a ~400px viewport (in HA, whose
		// app header eats ~64px above the panel, ~465-485px: a window snapped to the
		// top half of a 1080p screen) the card's remainder fell to 19px against a
		// 27px caption and the map went 33px -> 738px, overflowing a 53px card and
		// hanging below the fold.
		//
		// So a laid-out host floors at 1px (fitCellPx already floors its result at
		// 1px, so this is the smallest map, not an arbitrary reserve — the 200px
		// floor that CAUSED #339 is not coming back in another costume). Only a host
		// with no layout at all — detached, display:none, or happy-dom, where every
		// box is 0 — resolves to 0. Either way we never keep the previous, larger
		// value: a latched budget height-fits the map to space that no longer exists.
		//
		// This mirrors the width axis (see the clamp in render()), which has always
		// drawn exactly this distinction.
		const laidOut = this.clientWidth > 0 || this.clientHeight > 0;
		const avail = h > 0 ? h : laidOut ? 1 : 0;
		if (Math.abs(avail - this._availHeightPx) >= 1) this._availHeightPx = avail;
	}

	/**
	 * The caption's margin-top (px), memoised on first read.
	 *
	 * It comes from THIS COMPONENT'S OWN static stylesheet
	 * (`.grid-dimensions { margin-top: 8px }`) — a constant no caller, theme or
	 * layout can change at runtime — so re-deriving it via getComputedStyle is pure
	 * waste, and _captionBlockPx() runs on the ~10Hz live path (every sensor frame
	 * re-renders the grid, and updated() re-measures). Same caching idiom, and the
	 * same reason, as _updateFurnitureTones above: keep getComputedStyle off the hot
	 * path when its answer cannot have moved.
	 */
	private _captionMarginPx?: number;

	/** Height (px) the dimensions caption occupies inside our box, margin included. */
	private _captionBlockPx(): number {
		const cap = this.shadowRoot?.querySelector<HTMLElement>(".grid-dimensions");
		if (!cap) return 0;
		this._captionMarginPx ??=
			Number.parseFloat(getComputedStyle(cap).marginTop) || 0;
		// offsetHeight is deliberately NOT memoised: the caption's text wraps at
		// narrow widths, so its height really does change with the layout — and a
		// stale (too small) one inflates the height budget and overflows the map out
		// of its card. It is also cheap here: the layout flush it forces is already
		// paid for by the clientWidth read at the top of _measureAvail.
		return cap.offsetHeight + this._captionMarginPx;
	}

	/**
	 * Re-read our box, synchronously.
	 *
	 * The ResizeObserver already covers this case correctly — a caller expanding a
	 * sibling BELOW the grid (the panel's detection log) shrinks our box, and the
	 * observer fires. What it does not cover is LATENCY: observer callbacks are
	 * delivered after layout, on a later tick, so the map would visibly re-fit one
	 * frame after the log opened. The panel calls this from its own updated(),
	 * which runs after the DOM is written but within the same frame, so the map
	 * resizes in the SAME paint as the thing that displaced it.
	 *
	 * The observer remains the correctness guarantee (it needs no caller to
	 * remember); this is the smoothness one. Cheap to over-call: a no-change
	 * measure is a no-op, because the >=1px guards in _measureAvail skip the
	 * assignment and nothing re-renders.
	 */
	remeasure(): void {
		this._measureAvail();
	}

	static styles = css`
		:host {
			/* A centred flex column holding the map and its dimensions caption. The
			   panel makes our container (.grid-container) flex:1 of a height-bounded
			   column, so the box we're given is usually TALLER than the map — the
			   card is the "expansion area" that shows the space the map can use, and
			   the map floats in the middle of it. align-items does the horizontal
			   centring the old \`text-align: center\` used to do (.grid-targets-wrapper
			   is a flex item now, so it no longer shrink-wraps its own line box; it
			   would otherwise stretch, or hug the left edge, whenever the map is
			   narrower than the column). The absolutely-positioned overlays are
			   relative to the wrapper, so centring the wrapper moves the whole
			   positioning context together — overlay maths is unaffected. */
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}

		/* Never let flex SHRINK these: a transient over-tall map (measured budget
		   one frame stale) would otherwise be squashed into the wrapper's
		   overflow:hidden and clipped, instead of simply overhanging for a frame
		   and self-correcting on the next measure. */
		.grid-targets-wrapper,
		.grid-dimensions {
			flex: 0 0 auto;
		}

		.grid-targets-wrapper {
			position: relative;
			/* Defensive reset, not a fix for our own CSS: the host no longer sets
			   text-align itself (it centres via align-items on the flex column —
			   see :host above), so there's nothing of ours to reset here. But
			   text-align is inherited, and the host's own used value still
			   depends on whatever its light-DOM ancestor sets — a centred or
			   right-aligned ancestor outside our shadow boundary could otherwise
			   leak through into the grid-dimensions caption / cell content. Pin
			   it here regardless. */
			text-align: left;
			/* Own the overlay z-indexes. The targets (z-index 20), furniture (15)
			   and heatmap (15) overlays are absolutely positioned with positive
			   z-indexes; without a stacking context here those values leak to the
			   page root and outrank HA's sticky dashboard header (a small z-index),
			   so a tall card scrolled under the header paints its furniture over the
			   toolbar. container-type on the card host does NOT create a stacking
			   context (verified), so isolate here. */
			isolation: isolate;
		}

		:host(:not([editable])) .grid-targets-wrapper {
			overflow: hidden;
		}

		/* Floor-plan background layer. Positioned in the same percentage space
		   as the target dots (see planRectPct) so plan and targets align; sits
		   below the grid (z 1) and the furniture/target overlays (15/20). */
		.floor-plan {
			position: absolute;
			z-index: 0;
			overflow: hidden;
			pointer-events: none;
		}
		.floor-plan img {
			width: 100%;
			height: 100%;
			object-fit: fill;
			display: block;
		}

		.grid {
			display: grid;
			gap: 1px;
			background: var(--divider-color, #e0e0e0);
			border: 2px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			overflow: hidden;
			user-select: none;
			position: relative;
			z-index: 1;
		}

		/* Clean-map mode: no gridlines. The 1px gaps + divider background that
		   draw the graph-paper lines collapse, so cells merge into smooth
		   in/out-of-range regions; the border stays as the map frame. */
		:host([plain]) .grid {
			gap: 0;
			background: transparent;
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

		.heatmap-overlay {
			position: absolute;
			inset: 0;
			pointer-events: none;
			z-index: 15;
		}

		.heat-cell {
			position: absolute;
			transform: translate(-50%, -50%);
		}

		.trail {
			position: absolute;
			inset: 0;
			overflow: visible;
		}

		.grid-dimensions {
			text-align: center;
			font-size: 12px;
			color: var(--secondary-text-color, #757575);
			margin-top: 8px;
		}
	`;

	willUpdate(changedProperties: PropertyValues) {
		if (changedProperties.has("floorPlan")) this._planError = false;
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
		// Plain (clean-map) mode collapses the inter-cell gaps to 0, so only the
		// 2px border (×2) remains as chrome; otherwise each gap adds 1px.
		const gapPx = this.plain ? 0 : 1;
		// The grid adds a 2px border (×2) + (visCols-1)×gap on top of the cells;
		// subtract that from the measured width so the grid fits exactly.
		const gridChromePx = this._availPx > 0 ? 4 + (visCols - 1) * gapPx : 0;
		// Desktop allows a larger grid + bigger cells than the 480/32 mobile caps.
		const isDesktop = !this.mobile;
		// Fill mode (card) lifts the caps once the width is measured so the grid
		// grows to fill its container; the unmeasured first render keeps the small
		// cap so it doesn't flash huge before the real width arrives.
		const uncap = this.fill && this._availPx > 0;
		// uncap only fires once the width is measured, so the width-fit term in
		// fitCellPx is finite and Infinity here just means "no separate cap".
		const effMaxGridPx = uncap
			? Number.POSITIVE_INFINITY
			: isDesktop
				? 960
				: this.maxGridPx;
		const effMaxCellPx = uncap ? Number.POSITIVE_INFINITY : isDesktop ? 48 : 32;
		// The height budget, by mode:
		//  - fill (card): none — it fills the width and the dashboard scrolls.
		//  - everything else (desktop AND mobile): the measured box. Any positive
		//    value IS the truth — the box really is that small — so the map simply
		//    fits it. There is deliberately no minimum: a floor that dropped the
		//    budget to 0 below its threshold is what made #339 invert (smaller box →
		//    width-fit → 3x BIGGER map). _measureAvail() guarantees 0 here means
		//    "never measured" and NOTHING else, so the width-fit fallback below can
		//    only fire on an unmeasured host — never on a small one. The panel bounds
		//    the mobile box (a flex column capped at 45vh) just as it bounds the
		//    desktop one, so the same measured budget now serves both (#338).
		const availHeightPx = this.fill ? 0 : this._availHeightPx;
		// Vertical chrome mirrors the width chrome: 2px border (×2) + (visRows-1)
		// ×gap. Subtract it so the cells fit the height budget exactly.
		const gridChromeHpx = availHeightPx > 0 ? 4 + (visRows - 1) * gapPx : 0;
		const cellPx = fitCellPx(
			effMaxGridPx,
			// When measured, clamp to ≥1px so a "measured but tiny" width (chrome
			// exceeds the available px in an extreme-narrow/transient layout) still
			// shrinks. A negative value would read as "unmeasured" in fitCellPx and
			// snap to the ceiling — overflowing instead of shrinking. The unmeasured
			// branch keeps passing _availPx unchanged so fitCellPx's own fallback
			// applies when _availPx <= 0.
			this._availPx > 0
				? Math.max(1, this._availPx - gridChromePx)
				: this._availPx,
			availHeightPx > 0 ? Math.max(1, availHeightPx - gridChromeHpx) : 0,
			visCols,
			visRows,
			effMaxCellPx,
		);

		return html`
			<div class="grid-targets-wrapper">
				${this._renderFloorPlan(scan.rawBounds, minCol, minRow, visCols, visRows)}
				<div
					class="grid"
					style="grid-template-columns: repeat(${visCols}, ${cellPx}px); grid-template-rows: repeat(${visRows}, ${cellPx}px);"
					@pointerup=${this.editable ? this._onStrokeEnd : nothing}
					@pointercancel=${this.editable ? this._onStrokeEnd : nothing}
				>
					${this._renderVisibleCells(scan.status, minCol, maxCol, minRow, maxRow, cellPx, scan.rawBounds)}
				</div>
				${this._renderFurnitureOverlay(cellPx, gapPx, minCol, minRow, visCols, visRows)}
				${this._renderTargetDots(minCol, maxCol, minRow, maxRow, visCols, visRows)}
				${this._renderHeatmap(cellPx, minCol, minRow, visCols, visRows)}
			</div>
			${this.showDimensions ? this._renderGridDimensions(scan.metrics) : nothing}
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
		showDimensions: boolean;
		status: CellRangeStatus[];
		bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number };
		rawBounds: {
			minCol: number;
			maxCol: number;
			minRow: number;
			maxRow: number;
		};
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
			c.maxRangeMm === this.maxRangeMm &&
			c.showDimensions === this.showDimensions
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
			showDimensions: this.showDimensions,
			status,
			bounds: getVisibleRoomBounds(
				this.grid,
				fov,
				this.roomWidth,
				this.maxRangeMm,
			),
			// The room's physical bounding rectangle (unpadded). fadeUncovered
			// keys the wash on this so out-of-coverage cells that lost their room
			// bit but sit inside the rectangle still read as room.
			rawBounds: getRawRoomBounds(this.grid),
			// Only the dimensions caption consumes metrics; skip the extra grid
			// scan when it's hidden (e.g. the overview card).
			metrics: this.showDimensions
				? getGridRoomMetrics(
						this.grid,
						this.roomWidth,
						this.perspective,
						fov,
						this.maxRangeMm,
					)
				: null,
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
		rawBounds: {
			minCol: number;
			maxCol: number;
			minRow: number;
			maxRow: number;
		},
	) {
		const occupancy = this.occupancy;
		const plain = this.plain;
		const showOverlays = this.showOverlays;
		// Plain mode flattens zones by colouring with empty configs, so every
		// in-range cell falls back to the room colour while outside cells still
		// read as outside — getCellColor stays the single source of cell-fill truth.
		const cellBgConfigs = plain ? [] : this.zoneConfigs;
		const cellBg = (v: number): string =>
			getCellColor(v, cellBgConfigs, this.roomColor);
		// Overview fade is a wash of the room colour — the same for every cell,
		// so build it once here rather than per cell in the loop below.
		const faded = this.fadeUncovered ? fadedRoomColor(this.roomColor) : "";
		const planActive = this._planActive;
		// fadeUncovered fills the room's bounding RECTANGLE (rawBounds), keyed on
		// the rectangle rather than each cell's room bit: a footprint that drops
		// the out-of-cone cells still has them inside the rectangle, so they read
		// as (uncovered) room. Cells beyond the rectangle keep the outside colour.
		const inRoomRect = (col: number, row: number): boolean =>
			col >= rawBounds.minCol &&
			col <= rawBounds.maxCol &&
			row >= rawBounds.minRow &&
			row <= rawBounds.maxRow;

		const cells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				const idx = r * GRID_COLS + c;
				const cellVal = this.grid[idx];
				const cellStatus = status[idx];
				const inRange = cellStatus === "in_range";
				const inside = cellIsInside(cellVal);
				const inRoom = inRoomRect(c, r);
				let bg: string;
				if (inRange) {
					bg = cellBg(cellVal);
				} else if (this.fadeUncovered) {
					// Overview: out-of-coverage cells inside the room rectangle (out of
					// cone / beyond max range) fade to a wash of the room colour so the
					// room reads as a clean rectangle; cells beyond the rectangle keep
					// the plain outside colour.
					bg = inRoom ? faded : cellBg(cellVal);
				} else if (cellStatus === "beyond_max_range" && inside) {
					// Only inside-room cells get the hatch-on-white "configured out"
					// decoration; outside-room padding rendered as plain outside so
					// it doesn't read as an inside-room cell limited by config.
					bg = CELL_BG_BEYOND_MAX_RANGE;
				} else if (cellStatus === "beyond_max_range") {
					bg = cellBg(cellVal);
				} else {
					bg = CELL_BG_OUT_OF_RANGE;
				}
				// A floor plan replaces the flat room fill in clean (plain) mode:
				// make in-room-rectangle cells transparent so the plan (a layer
				// below the grid) shows through and blends against the card, not the
				// room colour. Out-of-rectangle cells keep their outside shading; the
				// plan layer is clipped to the same rectangle.
				if (planActive && plain && inRoom) {
					bg = "transparent";
				}
				let occupancyStyle = "";
				// Plain mode drops the occupancy glow (a detection-zone cue).
				if (!plain && inRange && inside) {
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
					!plain && showOverlays && inRange && inside
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
						data-idx="${idx}"
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
					// The detail is the target (targetIndex + its room coordinates x/y, in
					// mm) and where the dot IS: its centre in CLIENT coordinates. It does
					// NOT carry xPct/yPct — those are percentages of the MAP, and the map
					// is not the box a listener draws in (the panel's card is bigger, with
					// the map centred inside it — #338), so a percentage of it is not a
					// position anyone else can use; passing one is how the target menu
					// ended up ~300px from its dot. The dot is `translate(-50%, -50%)`, so
					// its rect centre IS the point it marks.
					const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
					this.dispatchEvent(
						new CustomEvent("target-click", {
							detail: {
								targetIndex: i,
								x: t.x,
								y: t.y,
								clientX: r.left + r.width / 2,
								clientY: r.top + r.height / 2,
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

	private _onPlanError = (): void => {
		this._planError = true;
	};

	/** A floor plan is set and its image hasn't failed to load. */
	private get _planActive(): boolean {
		return !!this.floorPlan && !this._planError;
	}

	private _renderFloorPlan(
		rawBounds: {
			minCol: number;
			maxCol: number;
			minRow: number;
			maxRow: number;
		},
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		// Gated on `plain` to match the transparent-cell override in
		// _renderVisibleCells: the plan only shows through in clean mode, so both
		// gates agree (the card forces `plain` whenever a floor plan is set). This
		// keeps the component self-consistent — no plan drawn behind opaque cells.
		if (!this._planActive || !this.plain) return nothing;
		// No room rectangle (uncalibrated / empty grid) → nothing to anchor to.
		if (rawBounds.minCol > rawBounds.maxCol) return nothing;
		const r = planRectPct(rawBounds, minCol, minRow, visCols, visRows);
		const op = Math.max(0, Math.min(1, this.floorPlanOpacity));
		return html`
			<div
				class="floor-plan"
				style="left:${r.leftPct}%;top:${r.topPct}%;width:${r.widthPct}%;height:${r.heightPct}%;opacity:${op};"
			>
				<img src=${this.floorPlan} alt="" @error=${this._onPlanError} />
			</div>
		`;
	}

	private _renderHeatmap(
		cellPx: number,
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		if (!this.showHeatmap) return nothing;
		const heat = this.heatmapCells;
		const rects = [];
		for (let i = 0; i < heat.length; i++) {
			const v = heat[i];
			if (!v) continue;
			const col = (i % GRID_COLS) + 0.5;
			const row = Math.floor(i / GRID_COLS) + 0.5;
			const xPct = ((col - minCol) / visCols) * 100;
			const yPct = ((row - minRow) / visRows) * 100;
			if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) continue;
			rects.push(html`<div
				class="heat-cell"
				style="left:${xPct}%;top:${yPct}%;width:${cellPx}px;height:${cellPx}px;background:${heatCellColor(v)};"
			></div>`);
		}
		return html`<div class="heatmap-overlay">
			${rects}
			${this._renderTrails(minCol, minRow, visCols, visRows)}
		</div>`;
	}

	private _renderTrails(
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		const lines = this.trails
			.map((pts) => this._trailPolyline(pts, minCol, minRow, visCols, visRows))
			.filter((p) => p !== null);
		if (lines.length === 0) return nothing;
		return html`<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>`;
	}

	private _trailPolyline(
		pts: Array<{ x: number; y: number }>,
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		if (pts.length < 2) return null;
		const coords = pts
			.map((p) => {
				const cell = mapTargetToGridCell(
					p.x,
					p.y,
					this.roomWidth,
					this.roomDepth,
				);
				if (!cell) return null;
				const xPct = ((cell.col - minCol) / visCols) * 100;
				const yPct = ((cell.row - minRow) / visRows) * 100;
				return `${xPct},${yPct}`;
			})
			.filter((c): c is string => c !== null);
		if (coords.length < 2) return null;
		return svg`<polyline
			points=${coords.join(" ")}
			fill="none" stroke="rgba(3,169,244,0.7)" stroke-width="0.6"
			stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"
		/>`;
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
		gapPx: number,
		minCol: number,
		minRow: number,
		visCols: number,
		visRows: number,
	) {
		if (!this.furniture.length) return nothing;

		// The overlay's furniture-* events are `composed: true` and bubble
		// straight through this component's shadow boundary to the panel —
		// no stopPropagation/re-dispatch pass-through wrappers needed.
		// gapPx is the grid's inter-cell gap (0 in clean-map mode) so furniture
		// maps mm on the same pitch as the cells it overlays.
		return html`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${cellPx}
				.gapPx=${gapPx}
				.minCol=${minCol}
				.minRow=${minRow}
				.visCols=${visCols}
				.visRows=${visRows}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				.furnitureTones=${this._furnitureTones}
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
