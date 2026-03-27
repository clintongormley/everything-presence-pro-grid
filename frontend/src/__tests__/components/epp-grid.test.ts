import { describe, expect, it, vi } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import type { FurnitureItem } from "../../lib/furniture.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
	initGridFromRoom,
} from "../../lib/grid.js";
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
	el.showHitCounts = false;
	el.occupancy = {};
	el.targetPrevXY = [];
	el.heatmapColors = null;
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
	it("dispatches cell-paint down on mousedown", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		expect(cell).not.toBeNull();
		cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("down");
		expect(typeof events[0].detail.index).toBe("number");

		document.body.removeChild(el);
	});

	it("dispatches cell-paint enter on mouseenter", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const cell = el.shadowRoot!.querySelector(".cell") as HTMLElement;
		cell.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("enter");

		document.body.removeChild(el);
	});

	it("dispatches cell-paint up on mouseup on grid", async () => {
		const el = createGrid({ editable: true });
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("cell-paint", (e) => events.push(e as CustomEvent));

		const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
		grid.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

		expect(events.length).toBe(1);
		expect(events[0].detail.action).toBe("up");

		document.body.removeChild(el);
	});
});

describe("epp-grid target rendering", () => {
	it("renders target dots for active targets", async () => {
		const targets: Target[] = [
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
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
			{ x: 1500, y: 2000, speed: 0, status: "inactive", signal: 0 },
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
			{ x: 1500, y: 2000, speed: 0, status: "pending", signal: 5 },
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
			{ x: 1500, y: 2000, speed: 0, status: "active", signal: 7 },
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
			{ x: 999999, y: 999999, speed: 0, status: "pending", signal: 5 },
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
});

describe("epp-grid occupancy", () => {
	it("applies box-shadow to occupied zone cells", async () => {
		const grid = initGridFromRoom(3000, 4000);
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "normal" };

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
});

describe("epp-grid heatmap", () => {
	it("applies heatmap overlay to zone cells", async () => {
		const grid = initGridFromRoom(3000, 4000);
		const zoneConfigs = new Array(7).fill(null);
		zoneConfigs[0] = { name: "Zone 1", color: ZONE_COLORS[0], type: "normal" };

		for (let i = 0; i < grid.length; i++) {
			if (grid[i] & CELL_ROOM_BIT) {
				grid[i] = cellSetZone(grid[i], 1);
			}
		}

		const heatmapColors = new Map<number, string>();
		heatmapColors.set(1, "rgba(255,0,0,0.5)");

		const el = createGrid({
			grid,
			zoneConfigs,
			showHitCounts: true,
			heatmapColors,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const cells = el.shadowRoot!.querySelectorAll(
			".cell",
		) as NodeListOf<HTMLElement>;
		const hasGradient = Array.from(cells).some((c) =>
			c.style.background.includes("linear-gradient"),
		);
		expect(hasGradient).toBe(true);

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
});
