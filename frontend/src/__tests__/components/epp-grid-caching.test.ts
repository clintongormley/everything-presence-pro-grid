import { beforeEach, describe, expect, it, vi } from "vitest";

// Wrap the room-geometry scanners in spies (pass-through to the real
// implementations) so we can count full-grid scans per render. Every epp-grid
// render used to run ~4 of them — getVisibleRoomBounds (400× classify),
// _renderVisibleCells (400× classify) and getGridRoomMetrics (2 more passes)
// — on every live tick and every painted cell.
vi.mock("../../lib/room-geometry.js", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../lib/room-geometry.js")>();
	return {
		...actual,
		classifyCellInSensor: vi.fn(actual.classifyCellInSensor),
		getVisibleRoomBounds: vi.fn(actual.getVisibleRoomBounds),
		getGridRoomMetrics: vi.fn(actual.getGridRoomMetrics),
	};
});

import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import { initGridFromRoom } from "../../lib/grid.js";
import {
	classifyCellInSensor,
	getGridRoomMetrics,
	getVisibleRoomBounds,
} from "../../lib/room-geometry.js";
import type { Target } from "../../types.js";

function createGrid(overrides: Record<string, any> = {}): EppGrid {
	const el = document.createElement("epp-grid") as any;
	el.grid = initGridFromRoom(3000, 4000);
	el.zoneConfigs = new Array(7).fill(null);
	el.targets = [];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	// Sensor at centre-top looking down → real FOV classification work
	el.perspective = [1, 0, 1500, 0, 1, 0, 0, 0];
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.sidebarTab = "zones";
	el.editable = false;
	el.occupancy = {};
	el.targetPrevXY = [];
	el.localize = (k: string) => k;
	el.maxGridPx = 480;
	el.frozenBounds = null;
	el.maxRangeMm = 6000;
	Object.assign(el, overrides);
	return el as EppGrid;
}

function clearSpies(): void {
	vi.mocked(classifyCellInSensor).mockClear();
	vi.mocked(getVisibleRoomBounds).mockClear();
	vi.mocked(getGridRoomMetrics).mockClear();
}

describe("epp-grid full-grid scan caching", () => {
	beforeEach(() => {
		clearSpies();
	});

	it("does not rescan the grid when only live data (targets/occupancy) changes", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		clearSpies();

		// Simulate a live tick: new targets array + occupancy update.
		const targets: Target[] = [
			{ x: 1500, y: 2000, status: "active", signal: 7 },
		];
		el.targets = targets;
		el.occupancy = { 0: true };
		await el.updateComplete;

		expect(classifyCellInSensor).not.toHaveBeenCalled();
		expect(getVisibleRoomBounds).not.toHaveBeenCalled();
		expect(getGridRoomMetrics).not.toHaveBeenCalled();

		document.body.removeChild(el);
	});

	it("rescans when the grid reference changes (painted cell)", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		clearSpies();

		const next = new Uint8Array(el.grid);
		next[0] = next[0] ^ 0x01;
		el.grid = next;
		await el.updateComplete;

		expect(classifyCellInSensor).toHaveBeenCalled();

		document.body.removeChild(el);
	});

	it("rescans when maxRangeMm changes", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		clearSpies();

		el.maxRangeMm = 3000;
		await el.updateComplete;

		expect(classifyCellInSensor).toHaveBeenCalled();

		document.body.removeChild(el);
	});

	it("renders cells from the cached classification (no per-cell classify on cache hit)", async () => {
		const el = createGrid();
		document.body.appendChild(el);
		await el.updateComplete;

		clearSpies();

		// An unrelated prop change re-renders all cells but must hit the cache.
		el.selectedFurnitureId = "nope";
		await el.updateComplete;

		expect(classifyCellInSensor).not.toHaveBeenCalled();

		document.body.removeChild(el);
	});
});
