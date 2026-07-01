import { describe, expect, it, vi } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import type { FurnitureItem } from "../../lib/furniture.js";
import {
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	cellIsInside,
	cellSetOverlay,
	cellSetZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
	initGridFromRoom,
} from "../../lib/grid.js";
import {
	classifyCellInSensor,
	computeSensorFov,
} from "../../lib/room-geometry.js";
import { ZONE_COLORS } from "../../lib/zone-defaults.js";
import type { Target } from "../../types.js";

function createGrid(overrides: Record<string, any> = {}): EppGrid {
	const el = document.createElement("epp-grid") as any;
	el.grid = initGridFromRoom(3000, 4000);
	el.zoneConfigs = new Array(7).fill(null);
	el.targets = [];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.sidebarTab = "zones";
	el.editable = false;
	el.activeZone = null;
	el.occupancy = {};
	el.targetPrevXY = [];
	el.localize = (k: string) => k;
	el.maxGridPx = 480;
	el.frozenBounds = null;
	Object.assign(el, overrides);
	return el as EppGrid;
}

const SAMPLE_FURNITURE: FurnitureItem = {
	id: "f1",
	type: "svg",
	icon: "armchair",
	label: "Chair",
	x: 100,
	y: 200,
	width: 800,
	height: 800,
	rotation: 0,
	lockAspect: false,
};

/** Lowercased inline `style` of every rendered `.cell`, for colour assertions. */
function cellStyles(el: EppGrid): string[] {
	return Array.from(
		el.shadowRoot!.querySelectorAll(".cell") as NodeListOf<HTMLElement>,
	).map((c) => (c.getAttribute("style") ?? "").toLowerCase());
}

describe("epp-grid element", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-grid")).toBeDefined();
	});

	it("creates with default properties", () => {
		const el = createGrid();
		expect(el.grid).toBeDefined();
		expect(el.editable).toBe(false);
		expect(el.occupancy).toEqual({});
	});

	it("reflects editable property to the editable attribute", async () => {
		// The CSS rules `:host(:not([editable]))` and `:host([editable])` rely
		// on the attribute being present, so the property must reflect.
		// Without reflection, the wrapper's overflow:hidden stays applied in
		// editor mode and clips overflowing children (e.g. the furniture
		// rotation handle that sits above its item).
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		expect(el.hasAttribute("editable")).toBe(true);

		el.editable = false;
		await el.updateComplete;
		expect(el.hasAttribute("editable")).toBe(false);

		document.body.removeChild(el);
	});
});

describe("epp-grid render", () => {
	it("renders grid-targets-wrapper and grid divs", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const wrapper = el.shadowRoot!.querySelector(".grid-targets-wrapper");
		expect(wrapper).not.toBeNull();

		const grid = el.shadowRoot!.querySelector(".grid");
		expect(grid).not.toBeNull();

		document.body.removeChild(el);
	});

	it("renders cells matching visible range", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(".cell");
		expect(cells.length).toBeGreaterThan(0);

		document.body.removeChild(el);
	});

	it("renders grid-dimensions when metrics available", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const dims = el.shadowRoot!.querySelector(".grid-dimensions");
		expect(dims).not.toBeNull();

		document.body.removeChild(el);
	});

	it("renders no grid-dimensions when showDimensions is false", async () => {
		// Calibrated grid (metrics available) but the caption is suppressed.
		const el = createGrid({ showDimensions: false });
		document.body.appendChild(el);
		await el.updateComplete;

		const dims = el.shadowRoot!.querySelector(".grid-dimensions");
		expect(dims).toBeNull();

		document.body.removeChild(el);
	});

	it("renders no grid-dimensions when no room", async () => {
		const el = createGrid({ grid: new Uint8Array(GRID_CELL_COUNT) });
		document.body.appendChild(el);
		await el.updateComplete;

		const dims = el.shadowRoot!.querySelector(".grid-dimensions");
		// Empty grid has no metrics
		expect(dims).toBeNull();

		document.body.removeChild(el);
	});
});

describe("epp-grid cell events", () => {
	it("dispatches cell-paint down on pointerdown", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		expect(cell).not.toBeNull();
		cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("down");
		expect(typeof events[0].detail.index).toBe("number");

		document.body.removeChild(el);
	});

	it("dispatches cell-paint enter on pointerenter", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("enter");

		document.body.removeChild(el);
	});

	it("coalesces consecutive pointerenters on the same cell", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));

		// Re-entering the same cell should not refire — only the first enter dispatches
		expect(events.length).toBe(1);

		document.body.removeChild(el);
	});

	it("re-fires pointerenter on the same cell when a new drag starts (pointerdown resets coalesce state)", async () => {
		// Drag can end with a window-level pointerup outside the grid; the next
		// stroke must still paint the cell the user clicks first, even if it
		// was the last cell they hovered.
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		// Drag ended outside the grid — no pointerup event reaches epp-grid
		cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		// User now drags back over the same cell
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));

		// First enter, then pointerdown, then enter again on the same cell — all 3
		expect(events.length).toBe(3);
		expect(events[0].detail.action).toBe("enter");
		expect(events[1].detail.action).toBe("down");
		expect(events[2].detail.action).toBe("enter");

		document.body.removeChild(el);
	});

	it("re-fires pointerenter when entering a different cell", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cells = el.shadowRoot!.querySelectorAll(".cell");
		const cellA = cells[0] as HTMLElement;
		const cellB = cells[1] as HTMLElement;
		expect(cellA).not.toBeNull();
		expect(cellB).not.toBeNull();
		cellA.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		cellB.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		cellA.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));

		expect(events.length).toBe(3);
		expect(events.map((e) => e.detail.index)).toEqual([
			events[0].detail.index,
			events[1].detail.index,
			events[2].detail.index,
		]);
		// First and third are different cells (A then B then A again)
		expect(events[0].detail.index).not.toBe(events[1].detail.index);
		expect(events[1].detail.index).not.toBe(events[2].detail.index);

		document.body.removeChild(el);
	});

	it("dispatches cell-paint up on pointerup on grid", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		grid.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("up");

		document.body.removeChild(el);
	});

	it("dispatches cell-paint up on pointercancel (touch-scroll takeover)", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		grid.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("up");

		document.body.removeChild(el);
	});

	it("does not dispatch cell-paint at all in live view (editable=false)", async () => {
		// Live view used to attach the paint handlers anyway, dispatching
		// cell-paint events nothing listened to on every hover.
		const el = createGrid({ editable: false });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		grid.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

		expect(events.length).toBe(0);

		document.body.removeChild(el);
	});

	it("disables touch-action on the paintable grid so strokes aren't hijacked for scrolling", () => {
		// Only the editable grid opts out of touch gestures — the live view
		// must keep scrolling normally.
		const cssText = (
			(customElements.get("epp-grid") as any).styles as { cssText: string }
		).cssText;
		expect(cssText).toMatch(
			/:host\(\[editable\]\)\s+\.grid\s*{[^}]*touch-action:\s*none/,
		);
	});

	it("releases pointer capture when the cell already holds it (touch-drag fix)", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		expect(cell).not.toBeNull();

		// happy-dom lacks implicit pointer capture, so monkey-patch the cell to
		// simulate a touch-pointer that the browser has already captured.
		const POINTER_ID = 42;
		cell.hasPointerCapture = (_id: number) => true;
		const releaseSpy = vi.fn();
		cell.releasePointerCapture = releaseSpy;

		cell.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				pointerId: POINTER_ID,
			}),
		);

		expect(releaseSpy).toHaveBeenCalledOnce();
		expect(releaseSpy).toHaveBeenCalledWith(POINTER_ID);

		document.body.removeChild(el);
	});
});

describe("epp-grid target rendering", () => {
	it("renders target dots for active targets", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});

	it("does not render dots for inactive targets", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "inactive", signal: 0 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("renders pending targets with reduced opacity", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "pending", signal: 5 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		expect(dot.style.opacity).toBe("0.3");

		document.body.removeChild(el);
	});

	it("renders signal badge for active targets with signal > 0", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const overlay = el.shadowRoot!.querySelector(
			".targets-overlay",
		) as HTMLElement;
		// Signal badge is a div with the signal number
		expect(overlay.textContent).toContain("7");

		document.body.removeChild(el);
	});

	it("falls back to targetPrevXY for pending targets off-grid", async () => {
		const targets: Target[] = [
			{ x: 999999, y: 999999, status: "pending", signal: 5 },
		];
		const el = createGrid({
			targets,
			targetPrevXY: [{ x: 1500, y: 2000 }],
		});
		document.body.appendChild(el);
		await el.updateComplete;

		// Should render the dot using the fallback position
		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});

	it("renders nothing for a pending target whose prevXY fallback is ALSO off-grid", async () => {
		// Off-grid positions must never render pinned to the clamped edge —
		// the same rule active targets already follow.
		const targets: Target[] = [
			{ x: 999999, y: 999999, status: "pending", signal: 5 },
		];
		const el = createGrid({
			targets,
			targetPrevXY: [{ x: 888888, y: 888888 }],
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});
});

describe("epp-grid occupancy", () => {
	it("applies box-shadow to occupied zone cells", async () => {
		const grid = initGridFromRoom(3000, 4000);
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "default" };

		// Paint zone 1 on inside cells
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetZone(grid[i], 1);
			}
		}

		const el = createGrid({
			grid,
			zoneConfigs,
			occupancy: { 1: true },
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		// At least one cell should have box-shadow for occupancy
		const hasOccupancyShadow = Array.from(cells).some((c) =>
			c.style.cssText.includes("box-shadow"),
		);
		expect(hasOccupancyShadow).toBe(true);

		document.body.removeChild(el);
	});

	it("gives occupied zone cells a zone-colored outer glow that overflows cell bounds", async () => {
		const grid = initGridFromRoom(3000, 4000);
		const zoneConfigs = new Array(7).fill(null);
		const zoneColor = ZONE_COLORS[0]; // "#B8E7FF"
		zoneConfigs[0] = { name: "Zone 1", color: zoneColor, type: "default" };

		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetZone(grid[i], 1);
			}
		}

		const el = createGrid({
			grid,
			zoneConfigs,
			occupancy: { 1: true },
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const shadowed = Array.from(cells).find((c) =>
			c.style.cssText.includes("box-shadow"),
		);
		expect(shadowed).toBeDefined();
		const css = shadowed!.style.cssText.toLowerCase();
		// Outer shadow (no inset) so it can overlap adjacent cells.
		expect(css).not.toContain("inset");
		// Shadow references the zone color (e.g., via color-mix).
		expect(css).toContain(zoneColor.toLowerCase());
		// Not the old dark-grey outline.
		expect(css).not.toContain("rgba(0,0,0,0.4)");
		// Non-zero blur radius present.
		expect(css).toMatch(/box-shadow:[^;]*\b([1-9]\d*)px\b/);
		// Positioned + elevated so the outer shadow paints on top of neighbors.
		expect(css).toContain("position: relative");
		expect(css).toContain("z-index: 1");

		document.body.removeChild(el);
	});

	it("gives occupied rest-of-room (zone 0) cells the same outer glow approach", async () => {
		const grid = initGridFromRoom(3000, 4000);
		// initGridFromRoom marks all inside cells with zone 0 by default.

		const el = createGrid({
			grid,
			zoneConfigs: new Array(7).fill(null),
			occupancy: { 0: true },
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const shadowed = Array.from(cells).find((c) =>
			c.style.cssText.includes("box-shadow"),
		);
		expect(shadowed).toBeDefined();
		const css = shadowed!.style.cssText.toLowerCase();
		// Same outer-glow treatment as named zones.
		expect(css).not.toContain("inset");
		expect(css).not.toContain("rgba(0,0,0,0.4)");
		expect(css).toContain("position: relative");
		expect(css).toContain("z-index: 1");
		expect(css).toMatch(/box-shadow:[^;]*\b([1-9]\d*)px\b/);

		document.body.removeChild(el);
	});
});

describe("epp-grid plain mode (clean card map)", () => {
	// A grid whose inside cells carry a named zone, an interference overlay, and
	// occupancy — i.e. every "detection-zone detail" the plain map must drop.
	function paintedGrid() {
		const grid = initGridFromRoom(3000, 4000);
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetZone(grid[i], 1);
				grid[i] = cellSetOverlay(grid[i], CELL_OVERLAY_INTERFERENCE);
			}
		}
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "default" };
		return { grid, zoneConfigs };
	}

	it("reflects the plain property to the plain attribute (for the gridless CSS)", async () => {
		const el = createGrid({ plain: true });
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.hasAttribute("plain")).toBe(true);

		(el as unknown as { plain: boolean }).plain = false;
		await el.updateComplete;
		expect(el.hasAttribute("plain")).toBe(false);

		document.body.removeChild(el);
	});

	it("removes the gridlines in plain mode (:host([plain]) .grid gap:0)", () => {
		const cssText = (
			customElements.get("epp-grid") as unknown as {
				styles: { cssText: string };
			}
		).styles.cssText;
		const idx = cssText.indexOf(":host([plain]) .grid");
		expect(idx).toBeGreaterThan(-1);
		const rule = cssText.slice(idx, cssText.indexOf("}", idx));
		expect(rule).toMatch(/gap:\s*0/);
	});

	it("renders inside cells as the room color, not the zone color", async () => {
		const { grid, zoneConfigs } = paintedGrid();
		const el = createGrid({
			grid,
			zoneConfigs,
			occupancy: { 1: true },
			plain: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;
		const styles = cellStyles(el);
		// No cell paints the zone color…
		expect(styles.some((s) => s.includes("#b8e7ff"))).toBe(false);
		// …inside cells fall back to the flat room (card-background) color.
		expect(styles.some((s) => s.includes("--card-background-color"))).toBe(
			true,
		);
		document.body.removeChild(el);
	});

	it("drops the occupancy glow in plain mode (no box-shadow)", async () => {
		const { grid, zoneConfigs } = paintedGrid();
		const el = createGrid({
			grid,
			zoneConfigs,
			occupancy: { 1: true },
			plain: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;
		expect(cellStyles(el).some((s) => s.includes("box-shadow"))).toBe(false);
		document.body.removeChild(el);
	});

	it("drops overlay stripes in plain mode (no background-image)", async () => {
		const { grid, zoneConfigs } = paintedGrid();
		const el = createGrid({
			grid,
			zoneConfigs,
			occupancy: { 1: true },
			plain: true,
			showOverlays: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;
		expect(cellStyles(el).some((s) => s.includes("background-image"))).toBe(
			false,
		);
		document.body.removeChild(el);
	});

	it("keeps out-of-range range shading in plain mode", async () => {
		const { grid, zoneConfigs } = paintedGrid();
		const normal = createGrid({ grid, zoneConfigs });
		document.body.appendChild(normal);
		await normal.updateComplete;
		const normalHatch = cellStyles(normal).filter((s) =>
			s.includes("#c8c8c8"),
		).length;
		document.body.removeChild(normal);
		expect(normalHatch).toBeGreaterThan(0); // sanity: the fixture has out-of-range cells

		const el = createGrid({ grid, zoneConfigs, plain: true });
		document.body.appendChild(el);
		await el.updateComplete;
		const plainHatch = cellStyles(el).filter((s) =>
			s.includes("#c8c8c8"),
		).length;
		expect(plainHatch).toBe(normalHatch);
		document.body.removeChild(el);
	});
});

describe("epp-grid rest-of-room colour", () => {
	const ROOM = "rgb(10, 20, 30)";

	it("recolours rest-of-room (zone 0) cells in the full grid while keeping painted zones", async () => {
		const grid = initGridFromRoom(3000, 4000);
		// Paint every other inside cell as zone 1 so both zone 0 and zone 1 remain.
		let n = 0;
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT && n++ % 2 === 0) {
				grid[i] = cellSetZone(grid[i], 1);
			}
		}
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "default" };
		const el = createGrid({ grid, zoneConfigs, roomColor: ROOM });
		document.body.appendChild(el);
		await el.updateComplete;
		const styles = cellStyles(el);
		expect(styles.some((s) => s.includes(ROOM))).toBe(true); // rest-of-room recoloured
		expect(styles.some((s) => s.includes("#b8e7ff"))).toBe(true); // zone 1 kept
		document.body.removeChild(el);
	});

	it("uses the room colour for the whole room in plain mode", async () => {
		const grid = initGridFromRoom(3000, 4000);
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) grid[i] = cellSetZone(grid[i], 1);
		}
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "default" };
		const el = createGrid({ grid, zoneConfigs, plain: true, roomColor: ROOM });
		document.body.appendChild(el);
		await el.updateComplete;
		const styles = cellStyles(el);
		expect(styles.some((s) => s.includes(ROOM))).toBe(true); // flattened to room colour
		expect(styles.some((s) => s.includes("#b8e7ff"))).toBe(false); // zone colour dropped
		document.body.removeChild(el);
	});
});

describe("epp-grid fill mode (card fills available width)", () => {
	// The cell's inline `width: Npx` is computed from cellPx in render(), so we can
	// drive the measured width directly (happy-dom has no layout) and read it back.
	function cellPx(el: any): number {
		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement | null;
		return cell ? Number.parseInt(cell.style.width || "0", 10) : 0;
	}

	it("grows cells past the 48px desktop cap to fill the measured width when fill is set", async () => {
		const el = createGrid({ fill: true }) as any;
		el._availPx = 1500; // a wide measured container
		document.body.appendChild(el);
		await el.updateComplete;
		expect(cellPx(el)).toBeGreaterThan(48);
		document.body.removeChild(el);
	});

	it("keeps cells capped at the 48px desktop max when fill is off", async () => {
		const el = createGrid({ fill: false }) as any;
		el._availPx = 1500;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(cellPx(el)).toBeLessThanOrEqual(48);
		document.body.removeChild(el);
	});

	it("ignores a small available height in fill mode (fills width, grows tall)", async () => {
		const el = createGrid({ fill: true }) as any;
		el._availPx = 1500;
		el._availHeightPx = 250; // would otherwise bound the grid height
		document.body.appendChild(el);
		await el.updateComplete;
		// Height is not allowed to shrink a fill map below its width-driven size.
		expect(cellPx(el)).toBeGreaterThan(48);
		document.body.removeChild(el);
	});
});

describe("epp-grid furniture overlay", () => {
	it("renders furniture overlay when furniture provided", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const overlay = el.shadowRoot!.querySelector("epp-furniture-overlay");
		expect(overlay).not.toBeNull();

		document.body.removeChild(el);
	});

	it("does not render furniture overlay when empty", async () => {
		const el = createGrid({ furniture: [] });
		document.body.appendChild(el);
		await el.updateComplete;

		const overlay = el.shadowRoot!.querySelector("epp-furniture-overlay");
		expect(overlay).toBeNull();

		document.body.removeChild(el);
	});

	it("re-emits furniture-select event", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("furniture-select", (e) =>
			events.push(e as CustomEvent),
		);

		const overlay = el.shadowRoot!.querySelector(
			"epp-furniture-overlay",
		) as any;
		overlay.dispatchEvent(
			new CustomEvent("furniture-select", {
				detail: "f1",
				bubbles: true,
				composed: true,
			}),
		);

		expect(events.length).toBe(1);
		expect(events[0].detail).toBe("f1");

		document.body.removeChild(el);
	});

	it("re-emits furniture-delete event", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("furniture-delete", (e) =>
			events.push(e as CustomEvent),
		);

		const overlay = el.shadowRoot!.querySelector(
			"epp-furniture-overlay",
		) as any;
		overlay.dispatchEvent(
			new CustomEvent("furniture-delete", {
				detail: "f1",
				bubbles: true,
				composed: true,
			}),
		);

		expect(events.length).toBe(1);
		expect(events[0].detail).toBe("f1");

		document.body.removeChild(el);
	});

	it("re-emits furniture-pointer-down event", async () => {
		const el = createGrid({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("furniture-pointer-down", (e) =>
			events.push(e as CustomEvent),
		);

		const overlay = el.shadowRoot!.querySelector(
			"epp-furniture-overlay",
		) as any;
		overlay.dispatchEvent(
			new CustomEvent("furniture-pointer-down", {
				detail: {
					e: new PointerEvent("pointerdown"),
					id: "f1",
					type: "move",
				},
				bubbles: true,
				composed: true,
			}),
		);

		expect(events.length).toBe(1);
		expect(events[0].detail.id).toBe("f1");

		document.body.removeChild(el);
	});
});

// Beyond-max-range cells use CELL_BG_BEYOND_MAX_RANGE (cross-hatch on #fff).
// JSDOM collapses the compound gradient so only the surviving fill colour
// reliably distinguishes it from CELL_BG_OUT_OF_RANGE (#c8c8c8) and from the
// #cc3333 interference patterns.
function isBeyondMaxRangeCell(c: HTMLElement): boolean {
	const bg = c.style.cssText;
	return (
		bg.includes("repeating-linear-gradient") &&
		bg.includes("#fff") &&
		!bg.includes("#cc3333")
	);
}

describe("epp-grid darkness (sensor FOV)", () => {
	it("renders dark background for cells outside sensor FOV", async () => {
		// Perspective: sensor at centre-top (1500,0), looking down (+Y)
		// h = [1,0,1500, 0,1,0, 0,0] → identity with x-offset 1500
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const hasDarkCell = Array.from(cells).some((c) =>
			c.style.cssText.includes("c8c8c8"),
		);
		expect(hasDarkCell).toBe(true);

		document.body.removeChild(el);
	});

	it("no dark cells when perspective is null", async () => {
		const el = createGrid({
			perspective: null,
			maxRangeMm: 6000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const hasDarkCell = Array.from(cells).some((c) =>
			c.style.cssText.includes("c8c8c8"),
		);
		expect(hasDarkCell).toBe(false);

		document.body.removeChild(el);
	});

	it("cells beyond maxRangeMm render with beyond-max-range decoration (hatch on white, not c8c8c8)", async () => {
		// Sensor at centre-top looking down, tiny range = 500mm
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 500,
			roomWidth: 3000,
			roomDepth: 4000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const beyondCount = Array.from(cells).filter(isBeyondMaxRangeCell).length;
		expect(beyondCount).toBeGreaterThan(0);

		document.body.removeChild(el);
	});

	it("does not apply beyond-max-range decoration to outside-room padding cells", async () => {
		// Sensor at top-centre of a 3×3m room, with a very tight range so
		// most cells classify as beyond_max_range.  The visible grid adds a
		// 1-cell padding ring around the inside room — those padding cells
		// are *outside* the room and must not render as inside-cell hatch
		// (#fff + cross-hatch), which would read as inside-but-limited.
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 500,
			roomWidth: 3000,
			roomDepth: 3000,
			grid: initGridFromRoom(3000, 3000),
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		// JSDOM strips `var()` from style.cssText, so read the raw style
		// attribute instead — it preserves everything the template emitted.
		const styles = Array.from(cells).map((c) => c.getAttribute("style") ?? "");

		// Any cell rendered with the outside-room colour (CELL_COLOR_OUTSIDE)
		// must not also carry the beyond-max-range hatch on white — the two
		// are mutually exclusive.
		const conflicting = styles.filter(
			(s) =>
				s.includes("secondary-background-color") &&
				s.includes("repeating-linear-gradient"),
		);
		expect(conflicting).toEqual([]);

		// Sanity check: at least one padding cell exists with the outside
		// colour, otherwise the test silently passes on an empty set.
		const outsideCells = styles.filter((s) =>
			s.includes("secondary-background-color"),
		);
		expect(outsideCells.length).toBeGreaterThan(0);

		document.body.removeChild(el);
	});

	it("does not emit cell-paint for beyond-max-range cells", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 500,
			roomWidth: 3000,
			roomDepth: 4000,
			editable: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const beyondCell = Array.from(cells).find(isBeyondMaxRangeCell);
		expect(beyondCell).toBeDefined();
		beyondCell!.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true }),
		);

		expect(events.length).toBe(0);

		document.body.removeChild(el);
	});

	it("does not emit cell-paint for dark cells on pointerdown", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
			editable: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const darkCell = Array.from(cells).find((c) =>
			c.style.cssText.includes("c8c8c8"),
		);
		expect(darkCell).toBeDefined();
		darkCell!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

		expect(events.length).toBe(0);

		document.body.removeChild(el);
	});

	it("does not render interference stripes on dark cells", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const grid = initGridFromRoom(3000, 4000);
		// Set interference on ALL inside cells so any dark inside cell would show stripes
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetOverlay(grid[i], CELL_OVERLAY_INTERFERENCE);
			}
		}
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
			grid,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		// Dark cells should NOT have interference stripes (#cc3333)
		const darkWithStripes = Array.from(cells).filter(
			(c) =>
				c.style.cssText.includes("c8c8c8") &&
				c.style.cssText.includes("cc3333"),
		);
		expect(darkWithStripes.length).toBe(0);

		document.body.removeChild(el);
	});

	it("fadeUncovered replaces the out-of-cone cross-hatch with a faded room wash", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
			fadeUncovered: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const styles = cellStyles(el);

		// the out-of-cone grey cross-hatch (#c8c8c8) is gone
		expect(styles.some((s) => s.includes("#c8c8c8"))).toBe(false);
		// at least one in-room cell now shows the faded wash
		expect(
			styles.some((s) => s.includes("color-mix") && s.includes("#808080")),
		).toBe(true);

		document.body.removeChild(el);
	});

	it("fadeUncovered keeps outside-room cells as the plain outside colour, never hatched or washed", async () => {
		const opts = {
			perspective: [1, 0, 1500, 0, 1, 0, 0, 0],
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
		};

		// Panel baseline (fade off): outside-room out-of-cone padding cells render
		// the grey cross-hatch, so they do NOT count as the outside colour here.
		const panel = createGrid({ ...opts });
		document.body.appendChild(panel);
		await panel.updateComplete;
		const panelOutside = cellStyles(panel).filter((s) =>
			s.includes("secondary-background-color"),
		).length;
		document.body.removeChild(panel);

		const el = createGrid({ ...opts, fadeUncovered: true });
		document.body.appendChild(el);
		await el.updateComplete;
		const outside = cellStyles(el).filter((s) =>
			s.includes("secondary-background-color"),
		);

		// Outside cells exist and none are hatched...
		expect(outside.length).toBeGreaterThan(0); // padding ring exists
		expect(outside.some((s) => s.includes("repeating-linear-gradient"))).toBe(
			false,
		);
		// ...and none are washed either. Fade mode paints EVERY outside-room cell
		// the plain outside colour (converting the panel's out-of-cone hatch to it
		// too), so it must have strictly MORE outside-coloured cells than the panel.
		// Dropping the `inside` guard (washing outside cells) would push this count
		// down to the panel's, so the strict `>` pins the guard.
		expect(outside.length).toBeGreaterThan(panelOutside);

		document.body.removeChild(el);
	});

	it("fadeUncovered fades beyond-max-range cells instead of the white hatch", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 500,
			roomWidth: 3000,
			roomDepth: 4000,
			fadeUncovered: true,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const styles = cellStyles(el);

		// no beyond-max-range hatch on white (#fff, not the #cc3333 interference)
		const beyondHatch = styles.filter(
			(s) =>
				s.includes("repeating-linear-gradient") &&
				s.includes("#fff") &&
				!s.includes("#cc3333"),
		);
		expect(beyondHatch).toEqual([]);
		expect(
			styles.some((s) => s.includes("color-mix") && s.includes("#808080")),
		).toBe(true);

		document.body.removeChild(el);
	});

	it("keeps the cross-hatch when fadeUncovered is false (default)", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
		}); // fadeUncovered defaults false

		document.body.appendChild(el);
		await el.updateComplete;

		const styles = cellStyles(el);

		expect(styles.some((s) => s.includes("#c8c8c8"))).toBe(true);
		expect(
			styles.some((s) => s.includes("color-mix") && s.includes("#808080")),
		).toBe(false);

		document.body.removeChild(el);
	});

	it("fades the configured roomColor when fadeUncovered is set", async () => {
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const el = createGrid({
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
			fadeUncovered: true,
			roomColor: "rgb(10, 20, 30)",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const styles = cellStyles(el);

		expect(
			styles.some((s) =>
				s.includes("color-mix(in srgb, rgb(10, 20, 30) 88%, #808080)"),
			),
		).toBe(true);

		document.body.removeChild(el);
	});

	it("washes out-of-coverage cells inside the room rectangle even without the room bit", async () => {
		// Field bug: a device whose stored footprint drops the out-of-cone cells'
		// room bit even though they sit inside the room's bounding rectangle. They
		// must still fade — not fall back to the plain outside colour as though
		// they were beyond the room.
		const perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
		const opts = {
			perspective,
			maxRangeMm: 6000,
			roomWidth: 3000,
			roomDepth: 4000,
		};

		const grid = initGridFromRoom(opts.roomWidth, opts.roomDepth);
		const fov = computeSensorFov(perspective);
		let cleared = 0;
		for (let r = 0; r < GRID_ROWS; r++) {
			for (let c = 0; c < GRID_COLS; c++) {
				const idx = r * GRID_COLS + c;
				if (!cellIsInside(grid[idx])) continue;
				if (
					classifyCellInSensor(c, r, fov, opts.roomWidth, opts.maxRangeMm) ===
					"out_of_cone"
				) {
					grid[idx] &= ~CELL_ROOM_BIT; // footprint drops this in-rect cell
					cleared++;
				}
			}
		}
		expect(cleared).toBeGreaterThan(0); // fixture actually dropped some cells

		const el = createGrid({ ...opts, grid, fadeUncovered: true });
		document.body.appendChild(el);
		await el.updateComplete;
		const washed = cellStyles(el).filter(
			(s) => s.includes("color-mix") && s.includes("#808080"),
		).length;
		document.body.removeChild(el);

		// Every cleared cell is out-of-coverage and inside the room rectangle, so
		// all of them fade despite lacking the room bit (pre-fix: 0 washed, as they
		// fell through to the outside colour).
		expect(washed).toBe(cleared);
	});
});

describe("epp-grid target-click event", () => {
	it("dispatches target-click event when target dot is clicked", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("target-click", (e) => events.push(e as CustomEvent));

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		dot.click();

		expect(events.length).toBe(1);
		expect(events[0].detail.targetIndex).toBe(0);
		expect(events[0].detail.x).toBe(1500);
		expect(events[0].detail.y).toBe(2000);

		document.body.removeChild(el);
	});
});

describe("epp-grid target dot cursor guard", () => {
	it("target dot has clickable class when not editable", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, editable: false });
		document.body.appendChild(el);
		await el.updateComplete;

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		expect(dot.classList.contains("clickable")).toBe(true);

		document.body.removeChild(el);
	});

	it("target dot does not have clickable class when editable", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		expect(dot).not.toBeNull();
		expect(dot.classList.contains("clickable")).toBe(false);

		document.body.removeChild(el);
	});

	it("cells use pointer cursor only when editable", async () => {
		// Live overview (editable=false) should render the grid as a passive
		// display — only target dots are clickable. Painting-mode cells
		// (editable=true) keep the pointer cursor to signal they accept clicks.
		const editEl = createGrid({ editable: true });
		document.body.appendChild(editEl);
		await editEl.updateComplete;
		const editCell = editEl.shadowRoot!.querySelector(".cell") as HTMLElement;
		expect(editCell).not.toBeNull();
		expect(getComputedStyle(editCell).cursor).toBe("pointer");
		document.body.removeChild(editEl);

		const liveEl = createGrid({ editable: false });
		document.body.appendChild(liveEl);
		await liveEl.updateComplete;
		const liveCell = liveEl.shadowRoot!.querySelector(".cell") as HTMLElement;
		expect(liveCell).not.toBeNull();
		expect(getComputedStyle(liveCell).cursor).not.toBe("pointer");
		document.body.removeChild(liveEl);
	});

	it("click on target dot in edit mode does not dispatch target-click", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("target-click", (e) => events.push(e as CustomEvent));

		const dot = el.shadowRoot!.querySelector(".target-dot") as HTMLElement;
		dot.click();

		expect(events.length).toBe(0);

		document.body.removeChild(el);
	});
});

describe("epp-grid frozenBounds", () => {
	it("uses frozenBounds when set", async () => {
		const el = createGrid({
			frozenBounds: { minCol: 5, maxCol: 15, minRow: 2, maxRow: 12 },
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(".cell");
		// 11 cols * 11 rows = 121 cells
		expect(cells.length).toBe(121);

		document.body.removeChild(el);
	});

	it("falls back to full grid (20x20) when no inside cells", async () => {
		const el = createGrid({
			grid: new Uint8Array(GRID_CELL_COUNT), // empty — no inside cells
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(".cell");
		// Full grid fallback: 20 cols * 20 rows = 400
		expect(cells.length).toBe(400);

		document.body.removeChild(el);
	});
});

describe("epp-grid dismissedTargets", () => {
	// For roomWidth=3000, roomDepth=4000, GRID_CELL_MM=300:
	//   startCol = floor((20-10)/2) = 5
	//   target x=1500, y=2000 → col=10, row=6.67 → idx = 6*20+10 = 130
	//   target x=1800, y=2000 → col=11, row=6.67 → idx = 6*20+11 = 131

	it("hides a target whose dismissed cell matches its current cell", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		// Target is at cell 130 — dismissed at cell 130 → should be hidden
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("shows a target that has moved away from its dismissed cell and dispatches target-undismissed", async () => {
		const targets: Target[] = [
			{ x: 1800, y: 2000, status: "active", signal: 7 },
		];
		// Target is now at cell 131, but was dismissed at cell 130 → event fires
		// and the parent (simulated by a listener here) reassigns the Map.
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);

		// Simulate the panel-side handler: clone+delete on event.
		el.addEventListener("target-undismissed", (e) => {
			const idx = (e as CustomEvent).detail.targetIndex as number;
			el.dismissedTargets = new Map(el.dismissedTargets);
			el.dismissedTargets.delete(idx);
		});

		await el.updateComplete;
		// Wait one more microtask cycle in case the listener triggered a re-render.
		await el.updateComplete;

		// Dot should be visible after parent has cleared the dismiss entry.
		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});

	it("dispatches target-undismissed event when target moves away from dismissed cell", async () => {
		const targets: Target[] = [
			{ x: 1800, y: 2000, status: "active", signal: 7 },
		];
		// Target is now at cell 131, but was dismissed at cell 130
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);

		const events: CustomEvent[] = [];
		el.addEventListener("target-undismissed", (e) =>
			events.push(e as CustomEvent),
		);

		await el.updateComplete;

		expect(events.length).toBe(1);
		expect(events[0].detail.targetIndex).toBe(0);

		document.body.removeChild(el);
	});

	it("does NOT mutate the dismissedTargets Map passed in by the parent", async () => {
		// The child must treat dismissedTargets as a one-way prop. The parent
		// owns the map; the child only dispatches the target-undismissed event.
		const targets: Target[] = [
			{ x: 1800, y: 2000, status: "active", signal: 7 },
		];
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);

		await el.updateComplete;

		// The exact Map instance should still contain its original entry.
		expect(dismissedTargets.has(0)).toBe(true);
		expect(dismissedTargets.get(0)).toBe(130);

		document.body.removeChild(el);
	});

	it("fires target-undismissed for a target that moved off-grid, even when the unchecked index would alias the dismissed cell", async () => {
		// roomWidth=3000 → startCol=5. x=4500 → col = 5 + 15 = 20 (off-grid
		// right edge), y=300 → row=1. The historical unchecked index
		// row*GRID_COLS+col = 1*20+20 = 40 aliases into (row 2, col 0) — if the
		// target was dismissed on cell 40, the aliased index suppressed the
		// undismiss event even though the target is nowhere near that cell.
		const targets: Target[] = [
			{ x: 4500, y: 300, status: "active", signal: 7 },
		];
		const dismissedTargets = new Map([[0, 40]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);

		const events: CustomEvent[] = [];
		el.addEventListener("target-undismissed", (e) =>
			events.push(e as CustomEvent),
		);

		await el.updateComplete;

		expect(events.length).toBe(1);
		expect(events[0].detail.targetIndex).toBe(0);

		document.body.removeChild(el);
	});

	it("does NOT re-fire target-undismissed on subsequent updates with no movement", async () => {
		// Once the parent has handled the event and cleared the dismiss, further
		// re-renders (e.g. unrelated property changes) must not re-fire the event.
		const targets: Target[] = [
			{ x: 1800, y: 2000, status: "active", signal: 7 },
		];
		const dismissedTargets = new Map([[0, 130]]);
		const el = createGrid({ targets, dismissedTargets });
		document.body.appendChild(el);

		const events: CustomEvent[] = [];
		el.addEventListener("target-undismissed", (e) =>
			events.push(e as CustomEvent),
		);

		await el.updateComplete;
		expect(events.length).toBe(1);

		// Trigger an unrelated property change. Neither targets nor
		// dismissedTargets changed, so willUpdate must NOT re-dispatch.
		el.maxGridPx = 500;
		await el.updateComplete;

		expect(events.length).toBe(1);

		document.body.removeChild(el);
	});
});

describe("epp-grid interference target suppression", () => {
	// For roomWidth=3000, roomDepth=4000: target at x=1500,y=2000 → cell 130
	// cell 130 is inside the room (CELL_ROOM_BIT set by initGridFromRoom)

	it("hides a target on an interference cell when zone is not occupied", async () => {
		const grid = initGridFromRoom(3000, 4000);
		// Cell 130: set interference (zone stays 0 = unoccupied)
		grid[130] = cellSetOverlay(grid[130], CELL_OVERLAY_INTERFERENCE);

		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		const el = createGrid({ targets, grid, occupancy: {} });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("shows a target on an interference cell when the zone IS occupied", async () => {
		const grid = initGridFromRoom(3000, 4000);
		// Cell 130: set interference AND zone 1
		grid[130] = cellSetOverlay(grid[130], CELL_OVERLAY_INTERFERENCE);
		grid[130] = cellSetZone(grid[130], 1);

		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		// Zone 1 is occupied
		const el = createGrid({ targets, grid, occupancy: { 1: true } });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});
});

describe("epp-grid interference stripes", () => {
	/** Return the first cell that has an interference stripe style. */
	function findInterferenceCell(el: EppGrid): HTMLElement | null {
		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		for (const c of cells) {
			if (c.style.cssText.includes("cc3333")) return c;
		}
		return null;
	}

	function buildGridWithInterference(kind: number): Uint8Array {
		const grid = initGridFromRoom(3000, 4000);
		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetOverlay(grid[i], kind);
			}
		}
		return grid;
	}

	it("renders -45deg cc3333 stripe for interference (level 1)", async () => {
		const grid = buildGridWithInterference(CELL_OVERLAY_INTERFERENCE);
		const el = createGrid({ grid });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = findInterferenceCell(el);
		expect(cell).not.toBeNull();
		const style = cell!.style.cssText;
		expect(style).toContain("-45deg");
		expect(style).toContain("#cc3333");
		// Single stripe pattern — not a cross-hatch
		expect(style.match(/-45deg/g)?.length).toBe(1);

		document.body.removeChild(el);
	});

	it("renders cross-hatch (both -45deg and 45deg) for suppress interference", async () => {
		const grid = buildGridWithInterference(CELL_OVERLAY_SUPPRESS);
		const el = createGrid({ grid });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = findInterferenceCell(el);
		expect(cell).not.toBeNull();
		const style = cell!.style.cssText;
		expect(style).toContain("-45deg");
		expect(style).toContain("45deg");
		expect(style).toContain("#cc3333");

		document.body.removeChild(el);
	});

	it("does not render interference stripes on outside cells", async () => {
		// Build a grid where all cells are outside (no CELL_ROOM_BIT) but have
		// interference bits set manually — outside cells must not show stripes.
		const grid = new Uint8Array(GRID_CELL_COUNT);
		for (let i = 0; i < grid.length; i++) {
			// Set interference without room bit
			grid[i] = cellSetOverlay(grid[i], CELL_OVERLAY_INTERFERENCE);
		}
		const el = createGrid({ grid });
		document.body.appendChild(el);
		await el.updateComplete;

		const cell = findInterferenceCell(el);
		expect(cell).toBeNull();

		document.body.removeChild(el);
	});
});

describe("epp-grid target dot bounds check", () => {
	// For roomWidth=3000, roomDepth=4000:
	//   visible bounds with 1-cell padding: minCol=4, maxCol=15, minRow=0, maxRow=14
	//   visCols=12, visRows=15
	// Target x=3300, y=2100 → col = 5 + 11 = 16, row = 7 → just outside the
	// visible right edge (maxCol=15). Off-by-one bug in the bounds check
	// historically rendered this dot clamped to 100% on the right edge.

	it("does not render a target whose mapped column is just past maxCol", async () => {
		const targets: Target[] = [
			{ x: 3300, y: 2100, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("does not render a target whose mapped row is just past maxRow", async () => {
		// row = (maxRow+1)*300 = 15*300 = 4500
		const targets: Target[] = [
			{ x: 1500, y: 4500, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(0);

		document.body.removeChild(el);
	});

	it("still renders a target whose mapped cell is exactly at maxCol", async () => {
		// col = 5 + 3000/300 = 15 = maxCol → must still render (boundary inclusive)
		const targets: Target[] = [
			{ x: 3000, y: 2100, status: "active", signal: 7 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".target-dot");
		expect(dots.length).toBe(1);

		document.body.removeChild(el);
	});
});

describe("epp-grid target dot keying (per-target identity)", () => {
	// When targets reorder/become inactive, Lit must reuse DOM nodes by key
	// (target index) rather than positionally — otherwise the per-target color
	// and signal pill follow the wrong target.

	it("renders each target dot with its own color (TARGET_COLORS[i])", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
			{ x: 1800, y: 2000, status: "active", signal: 9 },
		];
		const el = createGrid({ targets });
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(
			".target-dot",
		) as NodeListOf<HTMLElement>;
		expect(dots.length).toBe(2);
		// Target 0 → TARGET_COLORS[0] (#2196F3 — blue)
		expect(dots[0].style.background.toLowerCase()).toContain("#2196f3");
		// Target 1 → TARGET_COLORS[1] (#FF5722 — red-orange)
		expect(dots[1].style.background.toLowerCase()).toContain("#ff5722");

		document.body.removeChild(el);
	});

	it("keeps each target's color and signal bound to its index when one becomes inactive", async () => {
		// Two active targets at distinct positions/signals.
		const el = createGrid({
			targets: [
				{ x: 1500, y: 2000, status: "active", signal: 7 },
				{ x: 1800, y: 2000, status: "active", signal: 9 },
			],
		});
		document.body.appendChild(el);
		await el.updateComplete;

		// Now mark target 0 as inactive — only target 1 should remain visible.
		// Without keyed rendering, Lit would reuse the first DOM node (with
		// color/signal of target 0) for the remaining template, leaking state.
		el.targets = [
			{ x: 1500, y: 2000, status: "inactive", signal: 0 },
			{ x: 1800, y: 2000, status: "active", signal: 9 },
		];
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(
			".target-dot",
		) as NodeListOf<HTMLElement>;
		expect(dots.length).toBe(1);
		// The remaining dot must reflect target index 1 (red-orange).
		expect(dots[0].style.background.toLowerCase()).toContain("#ff5722");

		// And the signal pill content must be 9, not 7.
		const overlay = el.shadowRoot!.querySelector(
			".targets-overlay",
		) as HTMLElement;
		expect(overlay.textContent).toContain("9");
		expect(overlay.textContent).not.toContain("7");

		document.body.removeChild(el);
	});
});

describe("epp-grid cell sizing (measured available width)", () => {
	// Number of repeated columns in `grid-template-columns: repeat(N, Xpx)`.
	const visColsOf = (grid: HTMLElement): number => {
		const m = grid.style.gridTemplateColumns.match(/repeat\((\d+),/);
		return m ? Number(m[1]) : 0;
	};
	// The per-cell px from `repeat(N, Xpx)`.
	const cellPxOf = (grid: HTMLElement): number => {
		const m = grid.style.gridTemplateColumns.match(/repeat\(\d+,\s*(\d+)px\)/);
		return m ? Number(m[1]) : 0;
	};

	it("shrinks the grid when measured available width is tinier than the grid chrome", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		const visCols = visColsOf(grid);
		expect(visCols).toBeGreaterThan(0);

		// Grid chrome is 4px (2px border ×2) + (visCols-1)px gaps. Pick a measured
		// available width SMALLER than that chrome so `availPx - chrome` is < 0.
		const gridChromePx = 4 + (visCols - 1);
		const tinyAvail = Math.max(1, gridChromePx - 5);
		expect(tinyAvail).toBeLessThan(gridChromePx);

		// `_availPx` is a private @state; set it directly (happy-dom has no real
		// ResizeObserver) and force a re-render.
		(el as unknown as { _availPx: number })._availPx = tinyAvail;
		(el as unknown as { requestUpdate: () => void }).requestUpdate();
		await el.updateComplete;

		// With a measured-but-tiny width the grid must SHRINK, not snap to the
		// 48px desktop maxCell ceiling and overflow.
		const cellPx = cellPxOf(grid);
		expect(cellPx).toBeGreaterThan(0);
		expect(cellPx).toBeLessThan(32);

		document.body.removeChild(el);
	});

	it("uses the ceiling cell size when the width is unmeasured", async () => {
		// Unmeasured (_availPx === 0, the default in tests) keeps the desktop
		// look: the cell snaps to the desktop maxCell ceiling (48px), not 1px.
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		expect(cellPxOf(grid)).toBe(48);

		document.body.removeChild(el);
	});

	it("fits the cells to a generous measured width without exceeding the ceiling", async () => {
		// Use a shallow room so the desktop height-fit path isn't the binding
		// constraint under happy-dom's short 768px viewport (which would cap a
		// deep room below the ceiling). This isolates width-fitting against the
		// 48px ceiling — the case that matters on a real, taller desktop viewport.
		const el = createGrid({
			grid: initGridFromRoom(3000, 2000),
			roomDepth: 2000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		const visCols = visColsOf(grid);

		// A wide-enough measured width must leave the cell at the 48px desktop ceiling
		// (unchanged from the unmeasured desktop look).
		const wide = 48 * visCols + (4 + (visCols - 1)) + 100;
		(el as unknown as { _availPx: number })._availPx = wide;
		(el as unknown as { requestUpdate: () => void }).requestUpdate();
		await el.updateComplete;

		expect(cellPxOf(grid)).toBe(48);

		document.body.removeChild(el);
	});

	it("schedules a post-layout re-measure on mount (self-corrects async layout above the grid)", async () => {
		// Defense in depth for the live↔editor flicker class: a freshly-mounted
		// desktop grid can read its viewport `top` before an async-rendering sibling
		// above it (e.g. the header's ha-select) has laid out, latching a stale
		// available-height that the width-only ResizeObserver never corrects.
		// firstUpdated() schedules ONE post-layout re-measure so any such transient
		// self-corrects within a frame instead of persisting. (The .panel-header CSS
		// reserve prevents the known case; this guards future late-laying-out chrome.)
		let rafCb: FrameRequestCallback | null = null;
		const rafSpy = vi
			.spyOn(globalThis, "requestAnimationFrame")
			.mockImplementation((cb: FrameRequestCallback) => {
				rafCb = cb;
				return 1;
			});
		try {
			const el = createGrid();
			document.body.appendChild(el);
			await el.updateComplete;

			// firstUpdated scheduled the post-layout re-measure...
			expect(rafSpy).toHaveBeenCalled();
			expect(typeof rafCb).toBe("function");

			// ...and when the frame fires it re-measures.
			const measureSpy = vi.spyOn(
				el as unknown as { _measureAvail: () => void },
				"_measureAvail",
			);
			(rafCb as unknown as FrameRequestCallback)(0);
			expect(measureSpy).toHaveBeenCalled();

			document.body.removeChild(el);
		} finally {
			rafSpy.mockRestore();
		}
	});

	it("re-measures on a window resize and detaches the handler when removed", async () => {
		// The ResizeObserver only tracks the host's WIDTH, so a height-only viewport
		// change (desktop vertical resize, mobile URL-bar collapse, devtools dock
		// height) wouldn't otherwise re-measure the height cap. A window 'resize'
		// hook closes that gap; it must detach on disconnect so a removed grid
		// doesn't keep re-measuring.
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		const measureSpy = vi.spyOn(
			el as unknown as { _measureAvail: () => void },
			"_measureAvail",
		);
		window.dispatchEvent(new Event("resize"));
		expect(measureSpy).toHaveBeenCalled();

		// After removal the handler is detached: a stray resize must not re-measure.
		document.body.removeChild(el);
		measureSpy.mockClear();
		window.dispatchEvent(new Event("resize"));
		expect(measureSpy).not.toHaveBeenCalled();
	});
});
