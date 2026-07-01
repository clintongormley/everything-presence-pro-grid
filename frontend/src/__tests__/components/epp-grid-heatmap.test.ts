import { describe, expect, it } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import { initGridFromRoom } from "../../lib/grid.js";

/** Full 6000x6000mm room -> every cell (20x20 @ 300mm) has the room bit set. */
function fullRoomGrid(): Uint8Array {
	return initGridFromRoom(6000, 6000);
}

async function grid(props: Partial<EppGrid>): Promise<EppGrid> {
	const el = document.createElement("epp-grid") as EppGrid;
	Object.assign(el, {
		roomWidth: 6000,
		roomDepth: 6000,
		grid: fullRoomGrid(),
		...props,
	});
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-grid heatmap overlay", () => {
	it("hides the heatmap overlay unless showHeatmap is set", async () => {
		const el = await grid({
			showHeatmap: false,
			heatmapCells: new Array(400).fill(10),
		});
		expect(el.shadowRoot!.querySelector(".heatmap-overlay")).toBeNull();
	});

	it("renders one heat cell per non-zero value when enabled", async () => {
		const cells = new Array(400).fill(0);
		cells[0] = 255;
		cells[21] = 128;
		const el = await grid({ showHeatmap: true, heatmapCells: cells });
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		expect(overlay).not.toBeNull();
		expect(overlay!.querySelectorAll(".heat-cell").length).toBe(2);
	});

	it("renders no trail svg when there are no trails", async () => {
		const el = await grid({ showHeatmap: true, trails: [] });
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		expect(overlay).not.toBeNull();
		expect(overlay!.querySelector(".trail")).toBeNull();
	});

	it("renders no trail svg for a trail with fewer than 2 points", async () => {
		const el = await grid({
			showHeatmap: true,
			trails: [[{ x: 1000, y: 1000 }]],
		});
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		expect(overlay!.querySelector(".trail")).toBeNull();
	});

	it("renders no trail svg when the room dimensions are invalid", async () => {
		const el = await grid({
			showHeatmap: true,
			roomWidth: 0,
			roomDepth: 0,
			trails: [
				[
					{ x: 1000, y: 1000 },
					{ x: 2000, y: 2000 },
				],
			],
		});
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		expect(overlay!.querySelector(".trail")).toBeNull();
	});

	it("renders a polyline for a trail with 2+ resolvable points", async () => {
		const el = await grid({
			showHeatmap: true,
			trails: [
				[
					{ x: 1000, y: 1000 },
					{ x: 2000, y: 2000 },
					{ x: 3000, y: 3000 },
				],
			],
		});
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		const svg = overlay!.querySelector(".trail");
		expect(svg).not.toBeNull();
		const polyline = svg!.querySelector("polyline");
		expect(polyline).not.toBeNull();
		const points = polyline!.getAttribute("points")!.trim().split(/\s+/);
		expect(points.length).toBe(3);
	});

	it("renders multiple trail polylines, one per target", async () => {
		const el = await grid({
			showHeatmap: true,
			trails: [
				[
					{ x: 500, y: 500 },
					{ x: 1500, y: 1500 },
				],
				[
					{ x: 4000, y: 4000 },
					{ x: 4500, y: 4500 },
				],
			],
		});
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		const svg = overlay!.querySelector(".trail");
		expect(svg!.querySelectorAll("polyline").length).toBe(2);
	});
});
