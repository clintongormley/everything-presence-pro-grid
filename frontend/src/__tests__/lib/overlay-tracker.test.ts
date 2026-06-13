/**
 * OverlayTracker unit tests — the TS mirror of the firmware component's
 * Stage 2b raw-frame sticky overlay tracking (epp_component.cpp lines 114-147).
 * Each case pins one branch of the component logic; keep them in lockstep with
 * the component and the parity-harness simulation in test_parity.cpp.
 */

import { describe, expect, it } from "vitest";
import {
	CELL_OVERLAY_ENTRY,
	CELL_ROOM_BIT,
	cellSetOverlay,
	GRID_CELL_COUNT,
	GRID_COLS,
} from "../../lib/grid.js";
import { OverlayTracker } from "../../lib/overlay-tracker.js";

// Full-width room → roomStartCol(6000) === 0, so col = x/300, row = y/300.
const ROOM_WIDTH = 6000;
const ROOM_DEPTH = 6000;

/** Build a grid: every cell a room cell; mark the listed cells entry-overlay. */
function makeGrid(entryCells: [number, number][]): Uint8Array {
	const grid = new Uint8Array(GRID_CELL_COUNT);
	for (let i = 0; i < GRID_CELL_COUNT; i++) grid[i] = CELL_ROOM_BIT;
	for (const [col, row] of entryCells) {
		const idx = row * GRID_COLS + col;
		grid[idx] = cellSetOverlay(grid[idx], CELL_OVERLAY_ENTRY);
	}
	return grid;
}

// Cell (col=2,row=1) is entry overlay → x∈[600,900), y∈[300,600).
const ENTRY_XY = { x: 750, y: 450 };
// Cell (col=4,row=1) is a plain room cell → x∈[1200,1500), y∈[300,600).
const ROOM_XY = { x: 1350, y: 450 };
const grid = makeGrid([[2, 1]]);

function active(x: number, y: number) {
	return [{ active: true, x, y }];
}
function inactive() {
	return [{ active: false, x: null, y: null }];
}

describe("OverlayTracker", () => {
	it("sets the flag when an active frame lands on an entry cell", () => {
		const tr = new OverlayTracker();
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
	});

	it("clears the flag on a non-entry room cell", () => {
		const tr = new OverlayTracker();
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
		// Same target moves to a plain room cell (prevActive stays true).
		tr.update(active(ROOM_XY.x, ROOM_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(false);
	});

	it("latches the flag while the target is outside the room", () => {
		const tr = new OverlayTracker();
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
		// Out-of-grid position (col >= GRID_COLS) while still active → latched.
		tr.update(active(60000, 450), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
	});

	it("latches the flag while the target is inactive", () => {
		const tr = new OverlayTracker();
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
		tr.update(inactive(), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
	});

	it("resets the flag on slot reuse (inactive→active transition)", () => {
		const tr = new OverlayTracker();
		// Target A touches the entry cell, then goes inactive (flag latched).
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		tr.update(inactive(), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
		// Slot reused by a brand-new target B that appears mid-room (plain cell).
		// inactive→active must reset the stale flag, then the room cell clears it.
		tr.update(active(ROOM_XY.x, ROOM_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(false);
	});

	it("slot reuse resets before an out-of-room frame can leak the old flag", () => {
		const tr = new OverlayTracker();
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		tr.update(inactive(), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
		// New target appears already out-of-room: the reset fires on the
		// transition, so the flag is false even though no room cell clears it.
		tr.update(active(60000, 450), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(false);
	});

	it("tracks each slot independently", () => {
		const tr = new OverlayTracker();
		tr.update(
			[
				{ active: true, x: ENTRY_XY.x, y: ENTRY_XY.y },
				{ active: true, x: ROOM_XY.x, y: ROOM_XY.y },
			],
			grid,
			ROOM_WIDTH,
			ROOM_DEPTH,
		);
		expect(tr.onOverlay[0]).toBe(true);
		expect(tr.onOverlay[1]).toBe(false);
	});

	it("reset() clears all per-slot state", () => {
		const tr = new OverlayTracker();
		tr.update(active(ENTRY_XY.x, ENTRY_XY.y), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(true);
		tr.reset();
		expect(tr.onOverlay[0]).toBe(false);
		// After reset, the next active frame is treated as a brand-new target
		// (prevActive was cleared) — so an out-of-room appearance stays false.
		tr.update(active(60000, 450), grid, ROOM_WIDTH, ROOM_DEPTH);
		expect(tr.onOverlay[0]).toBe(false);
	});
});
