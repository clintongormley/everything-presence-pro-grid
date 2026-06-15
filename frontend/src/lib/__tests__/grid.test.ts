import { describe, expect, it, vi } from "vitest";
import {
	alignTemplateGrid,
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_MASK,
	CELL_OVERLAY_NONE,
	CELL_OVERLAY_SHIFT,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	CELL_ZONE_AND_OVERLAY_MASK,
	CELL_ZONE_MASK,
	cellCenterMm,
	cellIsInside,
	cellOverlay,
	cellSetInside,
	cellSetOverlay,
	cellSetZone,
	cellZone,
	computeAlignmentOffset,
	fitCellPx,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
	getRawRoomBounds,
	getRoomBounds,
	gridHasInsideRoom,
	initGridFromRoom,
	MAX_ZONES,
	roomStartCol,
} from "../grid.js";

describe("cellIsInside", () => {
	it("returns true when room bit is set", () => {
		expect(cellIsInside(0x01)).toBe(true);
		expect(cellIsInside(0x0f)).toBe(true);
	});

	it("returns false when room bit is clear", () => {
		expect(cellIsInside(0x00)).toBe(false);
		expect(cellIsInside(0x0e)).toBe(false);
	});
});

describe("cellZone", () => {
	it("extracts zone 0 from a plain inside cell", () => {
		expect(cellZone(CELL_ROOM_BIT)).toBe(0);
	});

	it("extracts correct zone 1-7", () => {
		for (let z = 0; z <= 7; z++) {
			const val = (z << 1) | CELL_ROOM_BIT;
			expect(cellZone(val)).toBe(z);
		}
	});

	it("ignores the room bit", () => {
		// zone 3, room bit clear
		const val = 3 << 1;
		expect(cellZone(val)).toBe(3);
	});
});

describe("cellSetInside", () => {
	it("sets room bit while preserving zone", () => {
		const val = cellSetZone(0, 5);
		const result = cellSetInside(val, true);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(5);
	});

	it("clears room bit while preserving zone", () => {
		const val = cellSetZone(CELL_ROOM_BIT, 3);
		const result = cellSetInside(val, false);
		expect(cellIsInside(result)).toBe(false);
		expect(cellZone(result)).toBe(3);
	});

	it("round-trips with cellIsInside", () => {
		const val = 0x00;
		expect(cellIsInside(cellSetInside(val, true))).toBe(true);
		expect(cellIsInside(cellSetInside(val, false))).toBe(false);
	});
});

describe("cellSetZone", () => {
	it("sets zone while preserving room bit", () => {
		const result = cellSetZone(CELL_ROOM_BIT, 4);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(4);
	});

	it("overwrites previous zone", () => {
		let val = cellSetZone(CELL_ROOM_BIT, 2);
		val = cellSetZone(val, 6);
		expect(cellZone(val)).toBe(6);
		expect(cellIsInside(val)).toBe(true);
	});

	it("clamps zone to 3 bits (0-7)", () => {
		const result = cellSetZone(0, 0xff);
		expect(cellZone(result)).toBe(7);
	});

	it("round-trips with cellZone", () => {
		for (let z = 0; z <= MAX_ZONES; z++) {
			expect(cellZone(cellSetZone(CELL_ROOM_BIT, z))).toBe(z);
		}
	});
});

describe("getRoomBounds", () => {
	it("returns padded bounds around inside cells", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		// Place a 3x2 room block starting at col=5, row=3
		for (let r = 3; r < 5; r++) {
			for (let c = 5; c < 8; c++) {
				grid[r * GRID_COLS + c] = CELL_ROOM_BIT;
			}
		}
		const bounds = getRoomBounds(grid);
		expect(bounds.minCol).toBe(4); // 5-1
		expect(bounds.maxCol).toBe(8); // 7+1
		expect(bounds.minRow).toBe(2); // 3-1
		expect(bounds.maxRow).toBe(5); // 4+1
	});

	it("clamps padding to grid edges", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		// Place cell at top-left corner (0,0)
		grid[0] = CELL_ROOM_BIT;
		const bounds = getRoomBounds(grid);
		expect(bounds.minCol).toBe(0);
		expect(bounds.minRow).toBe(0);
		expect(bounds.maxCol).toBe(1); // 0+1
		expect(bounds.maxRow).toBe(1); // 0+1
	});

	it("clamps padding at bottom-right corner", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		grid[(GRID_ROWS - 1) * GRID_COLS + (GRID_COLS - 1)] = CELL_ROOM_BIT;
		const bounds = getRoomBounds(grid);
		expect(bounds.maxCol).toBe(GRID_COLS - 1);
		expect(bounds.maxRow).toBe(GRID_ROWS - 1);
	});

	it("handles empty grid gracefully", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		const bounds = getRoomBounds(grid);
		// With no inside cells, minCol=GRID_COLS and maxCol=0 before padding
		// After padding: minCol = max(0, 20-1)=19, maxCol = min(19, 0+1)=1
		// This is the expected degenerate result for an empty grid
		expect(bounds.minCol).toBeGreaterThanOrEqual(0);
		expect(bounds.maxCol).toBeLessThan(GRID_COLS);
	});
});

describe("getRawRoomBounds", () => {
	it("returns exact bounds without padding", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		for (let r = 3; r < 5; r++) {
			for (let c = 5; c < 8; c++) {
				grid[r * GRID_COLS + c] = CELL_ROOM_BIT;
			}
		}
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minCol).toBe(5);
		expect(bounds.maxCol).toBe(7);
		expect(bounds.minRow).toBe(3);
		expect(bounds.maxRow).toBe(4);
	});

	it("returns inverted bounds for empty grid (minCol > maxCol)", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minCol).toBeGreaterThan(bounds.maxCol);
	});
});

describe("initGridFromRoom", () => {
	it("creates grid with correct number of inside cells", () => {
		// 3000mm x 1500mm = 10 cols x 5 rows = 50 cells
		const grid = initGridFromRoom(3000, 1500);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBe(50);
	});

	it("centers the room horizontally", () => {
		// 1800mm = 6 cols, centered in 20-col grid → starts at col 7
		const grid = initGridFromRoom(1800, 600);
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minCol).toBe(7);
		expect(bounds.maxCol).toBe(12);
		expect(bounds.minRow).toBe(0);
		expect(bounds.maxRow).toBe(1);
	});

	it("starts room at row 0 (sensor at front wall)", () => {
		const grid = initGridFromRoom(6000, 6000);
		const bounds = getRawRoomBounds(grid);
		expect(bounds.minRow).toBe(0);
	});

	it("returns all-outside grid for zero dimensions", () => {
		const grid = initGridFromRoom(0, 0);
		let count = 0;
		for (let i = 0; i < GRID_CELL_COUNT; i++) {
			if (cellIsInside(grid[i])) count++;
		}
		expect(count).toBe(0);
	});

	it("has correct grid size", () => {
		const grid = initGridFromRoom(3000, 3000);
		expect(grid.length).toBe(GRID_CELL_COUNT);
	});
});

describe("cellOverlay", () => {
	it("returns CELL_OVERLAY_NONE for plain room cell", () => {
		expect(cellOverlay(CELL_ROOM_BIT)).toBe(CELL_OVERLAY_NONE);
	});

	it("extracts entry kind from bits 4-5", () => {
		const v = CELL_ROOM_BIT | (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_ENTRY);
	});

	it("extracts interference kind from bits 4-5", () => {
		const v = CELL_ROOM_BIT | (CELL_OVERLAY_INTERFERENCE << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_INTERFERENCE);
	});

	it("extracts suppress kind from bits 4-5", () => {
		const v = CELL_ROOM_BIT | (CELL_OVERLAY_SUPPRESS << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_SUPPRESS);
	});

	it("ignores bits outside the overlay mask", () => {
		// Set bits 6-7 (unused) and zone bits — should not affect overlay read
		const v = 0b11_00_111_1 | (CELL_OVERLAY_INTERFERENCE << CELL_OVERLAY_SHIFT);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_INTERFERENCE);
	});
});

describe("cellSetOverlay", () => {
	it("sets entry kind, preserves room and zone", () => {
		const v = cellSetZone(CELL_ROOM_BIT, 5);
		const result = cellSetOverlay(v, CELL_OVERLAY_ENTRY);
		expect(cellOverlay(result)).toBe(CELL_OVERLAY_ENTRY);
		expect(cellIsInside(result)).toBe(true);
		expect(cellZone(result)).toBe(5);
	});

	it("overwrites previous overlay kind", () => {
		let v = cellSetOverlay(CELL_ROOM_BIT, CELL_OVERLAY_ENTRY);
		v = cellSetOverlay(v, CELL_OVERLAY_SUPPRESS);
		expect(cellOverlay(v)).toBe(CELL_OVERLAY_SUPPRESS);
	});

	it("clears overlay when kind is CELL_OVERLAY_NONE", () => {
		const v = cellSetOverlay(CELL_ROOM_BIT, CELL_OVERLAY_INTERFERENCE);
		const result = cellSetOverlay(v, CELL_OVERLAY_NONE);
		expect(cellOverlay(result)).toBe(CELL_OVERLAY_NONE);
	});

	it("clamps kind to 2 bits (0-3)", () => {
		const result = cellSetOverlay(0, 0xff);
		expect(cellOverlay(result)).toBe(3);
	});

	it("round-trips for each kind", () => {
		for (const k of [
			CELL_OVERLAY_NONE,
			CELL_OVERLAY_ENTRY,
			CELL_OVERLAY_INTERFERENCE,
			CELL_OVERLAY_SUPPRESS,
		]) {
			expect(cellOverlay(cellSetOverlay(CELL_ROOM_BIT, k))).toBe(k);
		}
	});
});

describe("CELL_ZONE_AND_OVERLAY_MASK", () => {
	it("covers bits 1-5", () => {
		expect(CELL_ZONE_AND_OVERLAY_MASK).toBe(0b00111110);
	});

	it("equals CELL_ZONE_MASK | CELL_OVERLAY_MASK", () => {
		expect(CELL_ZONE_AND_OVERLAY_MASK).toBe(CELL_ZONE_MASK | CELL_OVERLAY_MASK);
	});
});

describe("gridHasInsideRoom", () => {
	it("returns false for an all-zero grid", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		expect(gridHasInsideRoom(grid)).toBe(false);
	});

	it("returns true when any cell has the room bit set", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		grid[42] = CELL_ROOM_BIT;
		expect(gridHasInsideRoom(grid)).toBe(true);
	});

	it("returns false when only non-room bits are set", () => {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		grid[0] = CELL_ZONE_MASK; // zone bits but no room bit
		grid[1] = CELL_OVERLAY_MASK; // overlay bits but no room bit
		expect(gridHasInsideRoom(grid)).toBe(false);
	});
});

describe("computeAlignmentOffset", () => {
	function buildGrid(cells: Array<[number, number, number]>): Uint8Array {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		for (const [r, c, bits] of cells) {
			grid[r * GRID_COLS + c] |= bits;
		}
		return grid;
	}

	it("returns the diff of bounding-box top-left corners when both grids have inside-room cells", () => {
		const template = buildGrid([
			[2, 3, CELL_ROOM_BIT],
			[3, 4, CELL_ROOM_BIT],
		]);
		const current = buildGrid([
			[5, 6, CELL_ROOM_BIT],
			[6, 7, CELL_ROOM_BIT],
		]);
		expect(computeAlignmentOffset(template, current)).toEqual({ dr: 3, dc: 3 });
	});

	it("returns (0, 0) when template has no inside-room cells", () => {
		const template = new Uint8Array(GRID_CELL_COUNT);
		const current = buildGrid([[5, 5, CELL_ROOM_BIT]]);
		expect(computeAlignmentOffset(template, current)).toEqual({ dr: 0, dc: 0 });
	});

	it("returns (0, 0) when current has no inside-room cells", () => {
		const template = buildGrid([[5, 5, CELL_ROOM_BIT]]);
		const current = new Uint8Array(GRID_CELL_COUNT);
		expect(computeAlignmentOffset(template, current)).toEqual({ dr: 0, dc: 0 });
	});

	it("honors precomputed hasInsideRoom flags without re-scanning", () => {
		const template = buildGrid([[2, 3, CELL_ROOM_BIT]]);
		const current = buildGrid([[5, 6, CELL_ROOM_BIT]]);
		// If we lie and say either is empty, the helper returns (0, 0).
		expect(computeAlignmentOffset(template, current, false, true)).toEqual({
			dr: 0,
			dc: 0,
		});
		expect(computeAlignmentOffset(template, current, true, false)).toEqual({
			dr: 0,
			dc: 0,
		});
		// If we tell the truth, we get the normal offset.
		expect(computeAlignmentOffset(template, current, true, true)).toEqual({
			dr: 3,
			dc: 3,
		});
	});
});

describe("alignTemplateGrid", () => {
	// Helper: build a grid by marking specific cells with bits.
	// Each entry is [row, col, bits-to-OR-in].
	function buildGrid(cells: Array<[number, number, number]>): Uint8Array {
		const grid = new Uint8Array(GRID_CELL_COUNT);
		for (const [r, c, bits] of cells) {
			grid[r * GRID_COLS + c] |= bits;
		}
		return grid;
	}

	it("aligns identical footprints with offset (0,0) and preserves zones", () => {
		// Template: 2x2 room at rows 5-6, cols 5-6. Cell (5,5) has zone 1.
		const template = buildGrid([
			[5, 5, CELL_ROOM_BIT | (1 << 1)], // inside + zone 1
			[5, 6, CELL_ROOM_BIT],
			[6, 5, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
		]);
		// Current: same inside-room footprint, no zones.
		const current = buildGrid([
			[5, 5, CELL_ROOM_BIT],
			[5, 6, CELL_ROOM_BIT],
			[6, 5, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
		]);

		const result = alignTemplateGrid(template, current);

		// All four cells still inside-room.
		expect(cellIsInside(result[5 * GRID_COLS + 5])).toBe(true);
		expect(cellIsInside(result[5 * GRID_COLS + 6])).toBe(true);
		expect(cellIsInside(result[6 * GRID_COLS + 5])).toBe(true);
		expect(cellIsInside(result[6 * GRID_COLS + 6])).toBe(true);
		// Zone 1 lands on the same cell.
		expect(cellZone(result[5 * GRID_COLS + 5])).toBe(1);
		// Other inside-room cells have zone 0.
		expect(cellZone(result[5 * GRID_COLS + 6])).toBe(0);
	});

	it("translates zones by the bounding-box-corner offset", () => {
		// Template room top-left at (2, 3); zone 1 at (2, 4).
		const template = buildGrid([
			[2, 3, CELL_ROOM_BIT],
			[2, 4, CELL_ROOM_BIT | (1 << 1)],
			[3, 3, CELL_ROOM_BIT],
			[3, 4, CELL_ROOM_BIT],
		]);
		// Current room top-left at (5, 6).
		const current = buildGrid([
			[5, 6, CELL_ROOM_BIT],
			[5, 7, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
			[6, 7, CELL_ROOM_BIT],
		]);

		const result = alignTemplateGrid(template, current);

		// Offset (+3, +3): zone 1 was at (2, 4), now at (5, 7).
		expect(cellZone(result[5 * GRID_COLS + 7])).toBe(1);
		// Old zone position is empty (zone 0).
		expect(cellZone(result[2 * GRID_COLS + 4])).toBe(0);
	});

	it("uses independent min row and min col so notched corners still align walls", () => {
		// Template: left wall at col 3, top wall at row 0, but cell (0, 3) is OUTSIDE
		// (notched). Inside cells: (0, 4), (1, 3), (1, 4). Zone 1 at (1, 3).
		const template = buildGrid([
			[0, 4, CELL_ROOM_BIT],
			[1, 3, CELL_ROOM_BIT | (1 << 1)],
			[1, 4, CELL_ROOM_BIT],
		]);
		// Current: same room shape (notched corner at (5, 6)), shifted +5 rows / +3 cols.
		const current = buildGrid([
			[5, 7, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
			[6, 7, CELL_ROOM_BIT],
		]);

		const result = alignTemplateGrid(template, current);

		// Template bounding-box corner = (min_row=0 from (0,4), min_col=3 from (1,3)) = (0, 3).
		// Current bounding-box corner = (min_row=5 from (5,7), min_col=6 from (6,6)) = (5, 6).
		// Offset = (+5, +3). Zone 1 was at (1, 3) → translates to (6, 6).
		expect(cellZone(result[6 * GRID_COLS + 6])).toBe(1);
	});

	it("silently drops template zones that translate outside current inside-room", () => {
		// Template room: 2x2 at (5,5)-(6,6). Zone 1 at (6, 6).
		const template = buildGrid([
			[5, 5, CELL_ROOM_BIT],
			[5, 6, CELL_ROOM_BIT],
			[6, 5, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT | (1 << 1)],
		]);
		// Current room: only top-left cell at (5, 5). The translated zone-1
		// position (6, 6) is not inside-room in current — should be dropped.
		const current = buildGrid([[5, 5, CELL_ROOM_BIT]]);

		const result = alignTemplateGrid(template, current);

		// Cell (6, 6) is NOT inside-room in current, so it gets no zone bits.
		expect(cellIsInside(result[6 * GRID_COLS + 6])).toBe(false);
		expect(cellZone(result[6 * GRID_COLS + 6])).toBe(0);
		// Cell (5, 5) is inside-room in current; no zone was at its source either.
		expect(cellZone(result[5 * GRID_COLS + 5])).toBe(0);
	});

	it("silently drops template zones that translate out of grid bounds", () => {
		// Template room top-left at (0, 0), zone 1 at (0, 0).
		const template = buildGrid([
			[0, 0, CELL_ROOM_BIT | (1 << 1)],
			[0, 1, CELL_ROOM_BIT],
		]);
		// Current room top-left at (GRID_ROWS - 1, GRID_COLS - 1). The template
		// would translate (0, 1) to (GRID_ROWS - 1, GRID_COLS) — out of bounds.
		const current = buildGrid([[GRID_ROWS - 1, GRID_COLS - 1, CELL_ROOM_BIT]]);

		const result = alignTemplateGrid(template, current);

		// (GRID_ROWS - 1, GRID_COLS - 1) gets zone 1 (translated from (0, 0)).
		expect(
			cellZone(result[(GRID_ROWS - 1) * GRID_COLS + (GRID_COLS - 1)]),
		).toBe(1);
		// No crash, no garbage in adjacent rows from row-wrap.
	});

	it("translates overlay bits (entry/interference/suppress) under the same offset", () => {
		const template = buildGrid([
			[2, 3, CELL_ROOM_BIT],
			[2, 4, CELL_ROOM_BIT | (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT)],
			[3, 3, CELL_ROOM_BIT | (CELL_OVERLAY_INTERFERENCE << CELL_OVERLAY_SHIFT)],
			[3, 4, CELL_ROOM_BIT | (CELL_OVERLAY_SUPPRESS << CELL_OVERLAY_SHIFT)],
		]);
		// Current shifted by (+3, +3).
		const current = buildGrid([
			[5, 6, CELL_ROOM_BIT],
			[5, 7, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
			[6, 7, CELL_ROOM_BIT],
		]);

		const result = alignTemplateGrid(template, current);

		expect(cellOverlay(result[5 * GRID_COLS + 7])).toBe(CELL_OVERLAY_ENTRY);
		expect(cellOverlay(result[6 * GRID_COLS + 6])).toBe(
			CELL_OVERLAY_INTERFERENCE,
		);
		expect(cellOverlay(result[6 * GRID_COLS + 7])).toBe(CELL_OVERLAY_SUPPRESS);
	});

	it("takes inside-room bits exclusively from current grid when current is non-empty", () => {
		// Template room at (2, 2)-(3, 3). Current room at (5, 5)-(6, 6) — DISJOINT.
		const template = buildGrid([
			[2, 2, CELL_ROOM_BIT],
			[2, 3, CELL_ROOM_BIT],
			[3, 2, CELL_ROOM_BIT],
			[3, 3, CELL_ROOM_BIT],
		]);
		const current = buildGrid([
			[5, 5, CELL_ROOM_BIT],
			[5, 6, CELL_ROOM_BIT],
			[6, 5, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
		]);

		const result = alignTemplateGrid(template, current);

		// Template's inside-room positions are NOT inside-room in result.
		expect(cellIsInside(result[2 * GRID_COLS + 2])).toBe(false);
		expect(cellIsInside(result[3 * GRID_COLS + 3])).toBe(false);
		// Current's inside-room positions ARE inside-room in result.
		expect(cellIsInside(result[5 * GRID_COLS + 5])).toBe(true);
		expect(cellIsInside(result[6 * GRID_COLS + 6])).toBe(true);
	});

	it("drops zone bits set on template cells that are NOT inside-room (tHasRoom branch)", () => {
		// Template has a valid 2x2 inside-room footprint AND a stray zone-1 bit
		// outside the room. The stray bit should be ignored.
		const template = buildGrid([
			[5, 5, CELL_ROOM_BIT],
			[5, 6, CELL_ROOM_BIT],
			[6, 5, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
			[0, 0, 1 << 1], // stray zone 1 outside the template room (no CELL_ROOM_BIT)
		]);
		const current = buildGrid([
			[5, 5, CELL_ROOM_BIT],
			[5, 6, CELL_ROOM_BIT],
			[6, 5, CELL_ROOM_BIT],
			[6, 6, CELL_ROOM_BIT],
		]);

		const result = alignTemplateGrid(template, current);

		// Stray bit at (0, 0) is dropped — not copied to (0, 0) of result.
		expect(cellZone(result[0 * GRID_COLS + 0])).toBe(0);
		// Result room cells have no zones (template's inside cells had no zones either).
		expect(cellZone(result[5 * GRID_COLS + 5])).toBe(0);
	});

	it("falls back to offset (0,0) when template has no inside-room cells", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		// Template has zone bits but NO inside-room bits.
		const template = buildGrid([
			[5, 5, 1 << 1], // zone 1, but bit 0 (room) is NOT set
		]);
		const current = buildGrid([[5, 5, CELL_ROOM_BIT]]);

		const result = alignTemplateGrid(template, current);

		// Offset is (0, 0): zone 1 lands at template's original (5, 5) AND survives
		// the clip because current's (5, 5) is inside-room.
		expect(cellZone(result[5 * GRID_COLS + 5])).toBe(1);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it("returns template grid copied verbatim when current has no inside-room cells", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const template = buildGrid([
			[2, 3, CELL_ROOM_BIT],
			[2, 4, CELL_ROOM_BIT | (1 << 1)],
			[3, 3, CELL_ROOM_BIT | (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT)],
		]);
		const current = new Uint8Array(GRID_CELL_COUNT); // all zeros

		const result = alignTemplateGrid(template, current);

		// Template bits 0-5 are copied verbatim (including inside-room bits).
		expect(cellIsInside(result[2 * GRID_COLS + 3])).toBe(true);
		expect(cellIsInside(result[2 * GRID_COLS + 4])).toBe(true);
		expect(cellZone(result[2 * GRID_COLS + 4])).toBe(1);
		expect(cellOverlay(result[3 * GRID_COLS + 3])).toBe(CELL_OVERLAY_ENTRY);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe("roomStartCol", () => {
	it("centres a 3000mm room (10 cols) at startCol 5", () => {
		// roomCols = ceil(3000/300) = 10; startCol = floor((20-10)/2) = 5
		expect(roomStartCol(3000)).toBe(5);
	});

	it("rounds partial cells up before centring", () => {
		// 3100mm → ceil(3100/300) = 11 cols; startCol = floor((20-11)/2) = 4
		expect(roomStartCol(3100)).toBe(4);
	});

	it("returns 0 for a room spanning the full grid width", () => {
		expect(roomStartCol(GRID_COLS * 300)).toBe(0);
	});
});

describe("cellCenterMm", () => {
	it("maps the first room column's centre to x=150mm", () => {
		// startCol = 5 for a 3000mm room; col 5 centre = (5-5+0.5)*300 = 150
		const { x, y } = cellCenterMm(5, 0, 3000);
		expect(x).toBe(150);
		expect(y).toBe(150);
	});

	it("maps row independent of room width (sensor at front wall)", () => {
		expect(cellCenterMm(10, 3, 3000).y).toBe(3.5 * 300);
		expect(cellCenterMm(10, 3, 5500).y).toBe(3.5 * 300);
	});

	it("yields negative x for columns left of the room", () => {
		expect(cellCenterMm(4, 0, 3000).x).toBe(-150);
	});
});

describe("fitCellPx", () => {
	it("caps by the maxGridPx ceiling when the container is wide", () => {
		expect(fitCellPx(480, 900, 20, 20)).toBe(24); // 480/20=24; 900 doesn't constrain
	});
	it("shrinks to fit a narrow container", () => {
		expect(fitCellPx(480, 360, 20, 20)).toBe(18); // 360/20=18 < 24
	});
	it("never returns less than 1", () => {
		expect(fitCellPx(480, 5, 20, 20)).toBe(1);
	});
	it("uses the smaller of the col/row ceiling", () => {
		expect(fitCellPx(480, 1000, 20, 10)).toBe(24); // min(480/20,480/10)=24
	});
	it("falls back to the ceiling when the container is unmeasured", () => {
		expect(fitCellPx(480, 0, 20, 20)).toBe(24);
		expect(fitCellPx(480, -1, 20, 20)).toBe(24);
	});
	it("caps cell size at 32px for small grids", () => {
		// floor(480/10)=48, but capped at 32; wide container doesn't constrain
		expect(fitCellPx(480, 900, 10, 10)).toBe(32);
	});
});
