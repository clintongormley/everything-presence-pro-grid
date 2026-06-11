import { describe, expect, it } from "vitest";
import { renderConfigurationThumbnail } from "../../lib/configuration-thumbnail.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	CELL_ZONE_SHIFT,
	cellSetOverlay,
	GRID_CELL_COUNT,
	GRID_COLS,
} from "../../lib/grid.js";

function makeGrid(
	insideCells: {
		col: number;
		row: number;
		zone?: number;
		overlay?: number; // CELL_OVERLAY_* value
	}[],
): number[] {
	const grid = new Array(GRID_CELL_COUNT).fill(0);
	for (const { col, row, zone, overlay } of insideCells) {
		let val = CELL_ROOM_BIT | ((zone ?? 0) << CELL_ZONE_SHIFT);
		if (overlay) val = cellSetOverlay(val, overlay);
		grid[row * GRID_COLS + col] = val;
	}
	return grid;
}

describe("renderConfigurationThumbnail", () => {
	it("renders svg with rect elements for inside cells", async () => {
		// 2x2 room at cols 9-10, rows 0-1 (centered in 20-col grid for 600mm width)
		const grid = makeGrid([
			{ col: 9, row: 0 },
			{ col: 10, row: 0 },
			{ col: 9, row: 1 },
			{ col: 10, row: 1 },
		]);
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			600,
			600,
			[],
		);

		// Result is a Lit SVGTemplateResult — render into a div to inspect DOM
		const container = document.createElement("div");

		// Use Lit's render to get DOM
		const { render } = await import("lit");
		render(result, container);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		// viewBox should crop to room bounds with 1-cell padding: cols 8-11, rows 0-2
		// That's getRoomBounds behavior: min-1, max+1 clamped
		expect(svg!.getAttribute("viewBox")).toBeTruthy();

		// Should have rect elements for inside cells
		const rects = svg!.querySelectorAll("rect");
		expect(rects.length).toBeGreaterThanOrEqual(4);
	});

	it("returns empty svg when grid has no inside cells", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			[],
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		// No rects since no inside cells
		const rects = svg!.querySelectorAll("rect");
		expect(rects.length).toBe(0);
	});

	it("renders furniture items as outlined rects", async () => {
		// Room: 3000mm wide, centered at cols 5-14 (10 cols), rows 0-9 (10 rows)
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "icon" as const,
				icon: "mdi:bed",
				label: "Bed",
				x: 300, // 300mm from left edge of room
				y: 600, // 600mm from top edge of room
				width: 1200,
				height: 900,
				rotation: 0,
				lockAspect: false,
			},
		];
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		// Should have a furniture rect with stroke and no fill
		const svgEl = container.querySelector("svg");
		const allRects = svgEl!.querySelectorAll("rect");
		const furnitureRects = Array.from(allRects).filter(
			(r) => r.getAttribute("fill") === "none",
		);
		expect(furnitureRects.length).toBe(1);
		expect(furnitureRects[0].getAttribute("stroke")).toBeTruthy();
	});

	it("renders furniture with rotation as transform", async () => {
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "icon" as const,
				icon: "mdi:bed",
				label: "Bed",
				x: 300,
				y: 600,
				width: 1200,
				height: 900,
				rotation: 45,
				lockAspect: false,
			},
		];
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg");
		const allRects = svgEl!.querySelectorAll("rect");
		const furnitureRects = Array.from(allRects).filter(
			(r) => r.getAttribute("fill") === "none",
		);
		expect(furnitureRects.length).toBe(1);
		// Should have transform with rotation
		expect(furnitureRects[0].getAttribute("transform")).toContain("rotate");
	});

	it("renders entry/exit overlay pattern on cells", async () => {
		const grid = makeGrid([
			{ col: 10, row: 0 },
			{ col: 10, row: 1, overlay: CELL_OVERLAY_ENTRY },
		]);
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			300,
			600,
			[],
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg")!;
		// Should have a <defs> with a pattern for entry overlay (id carries a
		// per-render suffix so multiple thumbnails in one shadow root can't
		// collide)
		const patterns = svgEl.querySelectorAll("defs pattern");
		const entryPattern = Array.from(patterns).find((p) =>
			p.id.startsWith("overlay-entry"),
		);
		expect(entryPattern).toBeTruthy();

		// Should have a rect using THAT pattern instance
		const overlayRects = Array.from(svgEl.querySelectorAll("rect")).filter(
			(r) => r.getAttribute("fill") === `url(#${entryPattern!.id})`,
		);
		expect(overlayRects.length).toBe(1);
	});

	it("renders interference source overlay pattern on cells", async () => {
		const grid = makeGrid([
			{ col: 10, row: 0 },
			{ col: 10, row: 1, overlay: CELL_OVERLAY_INTERFERENCE },
		]);
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			300,
			600,
			[],
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg")!;
		const patterns = svgEl.querySelectorAll("defs pattern");
		const interferencePattern = Array.from(patterns).find((p) =>
			p.id.startsWith("overlay-interference"),
		);
		expect(interferencePattern).toBeTruthy();

		const overlayRects = Array.from(svgEl.querySelectorAll("rect")).filter(
			(r) => r.getAttribute("fill") === `url(#${interferencePattern!.id})`,
		);
		expect(overlayRects.length).toBe(1);
	});

	it("renders suppress interference overlay pattern on cells", async () => {
		const grid = makeGrid([
			{ col: 10, row: 0 },
			{ col: 10, row: 1, overlay: CELL_OVERLAY_SUPPRESS },
		]);
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			300,
			600,
			[],
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg")!;
		const patterns = svgEl.querySelectorAll("defs pattern");
		const suppressPattern = Array.from(patterns).find((p) =>
			p.id.startsWith("overlay-suppress"),
		);
		expect(suppressPattern).toBeTruthy();

		const overlayRects = Array.from(svgEl.querySelectorAll("rect")).filter(
			(r) => r.getAttribute("fill") === `url(#${suppressPattern!.id})`,
		);
		expect(overlayRects.length).toBe(1);
	});

	it("gives each rendered thumbnail its own pattern ids (no cross-thumbnail collisions)", async () => {
		// All saved-configuration thumbnails render into the SAME shadow
		// root; with duplicate ids every url(#…) resolves to the FIRST
		// thumbnail's pattern, so later thumbnails draw the wrong overlay.
		const grid = makeGrid([
			{ col: 10, row: 0 },
			{ col: 10, row: 1, overlay: CELL_OVERLAY_ENTRY },
		]);
		const renderOnce = async () => {
			const result = renderConfigurationThumbnail(
				grid,
				new Array(7).fill(null),
				300,
				600,
				[],
			);
			const container = document.createElement("div");
			const { render } = await import("lit");
			render(result, container);
			return Array.from(container.querySelectorAll("svg defs pattern")).map(
				(p) => p.id,
			);
		};

		const first = await renderOnce();
		const second = await renderOnce();
		expect(first.length).toBeGreaterThan(0);
		for (const id of first) {
			expect(second).not.toContain(id);
		}
	});

	it("renders SVG furniture with actual floor plan drawing", async () => {
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "svg" as const,
				icon: "bed-double",
				label: "Double Bed",
				x: 300,
				y: 600,
				width: 1600,
				height: 2000,
				rotation: 0,
				lockAspect: false,
			},
		];
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg")!;
		// Should have a <g> group for the SVG furniture with inner SVG paths
		const groups = svgEl.querySelectorAll("g");
		const furnitureGroup = Array.from(groups).find(
			(g) => g.querySelector("rect, path, line, circle, ellipse") !== null,
		);
		expect(furnitureGroup).toBeTruthy();

		// Should NOT have a plain outlined fallback rect for this item
		const outlinedRects = Array.from(svgEl.querySelectorAll("rect")).filter(
			(r) =>
				r.getAttribute("fill") === "none" &&
				r.getAttribute("stroke")?.includes("rgba(0,0,0"),
		);
		expect(outlinedRects.length).toBe(0);
	});

	it("renders icon-type furniture as outlined rect fallback", async () => {
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "icon" as const,
				icon: "mdi:lamp",
				label: "Lamp",
				x: 300,
				y: 600,
				width: 600,
				height: 600,
				rotation: 0,
				lockAspect: true,
			},
		];
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg")!;
		// Icon-type should still render as outlined rect
		const outlinedRects = Array.from(svgEl.querySelectorAll("rect")).filter(
			(r) =>
				r.getAttribute("fill") === "none" &&
				r.getAttribute("stroke")?.includes("rgba(0,0,0"),
		);
		expect(outlinedRects.length).toBe(1);
	});

	it("renders SVG furniture with rotation transform on group", async () => {
		const grid = makeGrid(
			Array.from({ length: 100 }, (_, i) => ({
				col: 5 + (i % 10),
				row: Math.floor(i / 10),
			})),
		);
		const furniture = [
			{
				id: "f1",
				type: "svg" as const,
				icon: "bed-double",
				label: "Double Bed",
				x: 300,
				y: 600,
				width: 1600,
				height: 2000,
				rotation: 90,
				lockAspect: false,
			},
		];
		const result = renderConfigurationThumbnail(
			grid,
			new Array(7).fill(null),
			3000,
			3000,
			furniture,
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const svgEl = container.querySelector("svg")!;
		// The furniture group should have a transform containing rotate
		const groups = Array.from(svgEl.querySelectorAll("g"));
		const rotatedGroup = groups.find((g) =>
			g.getAttribute("transform")?.includes("rotate"),
		);
		expect(rotatedGroup).toBeTruthy();
	});

	it("applies zone colors to cells", async () => {
		const grid = makeGrid([
			{ col: 10, row: 0, zone: 0 },
			{ col: 10, row: 1, zone: 1 },
		]);
		const zoneConfigs = [
			{ name: "Kitchen", color: "#E69F00", type: "default" as const },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const result = renderConfigurationThumbnail(
			grid,
			zoneConfigs,
			300,
			600,
			[],
		);

		const container = document.createElement("div");
		const { render } = await import("lit");
		render(result, container);

		const rects = container.querySelectorAll("svg rect");
		const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
		// Zone 1 cell should use the zone color
		expect(fills).toContain("#E69F00");
	});
});
