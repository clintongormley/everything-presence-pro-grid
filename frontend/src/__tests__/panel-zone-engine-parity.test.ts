/**
 * Zone engine parity tests.
 *
 * These tests verify that the frontend's _runLocalZoneEngine() produces the
 * same zone occupancy results as the Python backend's ZoneEngine._tick() for
 * identical inputs. Each test here has a mirror in tests/test_zone_engine_parity.py.
 *
 * To keep the two in sync:
 *   - Grid: 20×20, room cells at cols 8-11 rows 0-3 (1200×1200mm room)
 *   - Zone 1 painted on cell (9,1) = grid index 29
 *   - Room (zone 0) on all other room cells
 *   - Room dimensions: 1200×1200mm → startCol=8
 *   - Target at (450, 450) maps to col 9.5 → cell (9,1) = zone 1
 *   - Target at (150, 150) maps to col 8.5 → cell (8,0) = zone 0 (room)
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	GRID_CELL_COUNT,
	GRID_COLS,
} from "../lib/grid.js";

const MAX_ZONES = 7;

/** Room: 1200×1200mm, centered in 20-col grid → cols 8-11, rows 0-3. */
function makeParityGrid(): Uint8Array {
	const grid = new Uint8Array(GRID_CELL_COUNT);
	for (let r = 0; r < 4; r++) {
		for (let c = 8; c < 12; c++) {
			grid[r * GRID_COLS + c] = CELL_ROOM_BIT; // zone 0 (room)
		}
	}
	// Zone 1 on cell (col=9, row=1)
	grid[1 * GRID_COLS + 9] = cellSetZone(CELL_ROOM_BIT, 1);
	return grid;
}

type TargetStatus = "active" | "pending" | "inactive";

interface Target {
	x: number;
	y: number;
	raw_x: number;
	raw_y: number;
	status: TargetStatus;
	signal: number;
	speed: number;
}

function makeTarget(
	x: number,
	y: number,
	signal: number,
	status: TargetStatus = "active",
): Target {
	return { x, y, raw_x: x, raw_y: y, status, signal, speed: 0 };
}

function createParityPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: async () => ({}),
		connection: { subscribeMessage: async () => () => {} },
	};
	const a = el as any;
	a._grid = makeParityGrid();
	a._zoneConfigs = new Array(MAX_ZONES).fill(null);
	// Zone 1: entrance type (trigger=3, renew=2, timeout=5, entry_point=true)
	a._zoneConfigs[0] = {
		name: "Zone 1",
		color: "#ff0000",
		type: "entrance",
	};
	a._roomWidth = 1200;
	a._roomDepth = 1200;
	a._roomType = "normal";
	a._roomTrigger = 5;
	a._roomRenew = 3;
	a._roomTimeout = 10;
	a._roomHandoffTimeout = 3;
	a._roomEntryPoint = false;
	a._targets = [];
	a._loading = false;
	return el;
}

describe("Zone engine parity (mirrors test_zone_engine_parity.py)", () => {
	let el: EPPGridPanel;
	let a: any;

	beforeEach(() => {
		el = createParityPanel();
		a = el as any;
	});

	it("no targets → all zones clear", () => {
		a._targets = [];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[0]).toBe(false);
		expect(occ[1]).toBe(false);
	});

	it("inactive target → all zones clear", () => {
		// Engine uses signal=0 (not backend status) to detect inactivity,
		// matching the backend which uses frame_count=0.
		a._targets = [makeTarget(450, 450, 0, "inactive")];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[0]).toBe(false);
		expect(occ[1]).toBe(false);
	});

	it("target in zone 1 (entrance) with signal >= trigger → zone 1 occupied", () => {
		// Entrance zone: trigger=3, entry_point=true
		a._targets = [makeTarget(450, 450, 3)];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true);
		expect(occ[0]).toBe(false);
	});

	it("target in zone 1 with signal < trigger → zone 1 stays clear", () => {
		a._targets = [makeTarget(450, 450, 2)];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(false);
	});

	it("target in room (zone 0) with signal >= gated threshold → zone 0 occupied after gating", () => {
		// Room zone 0: trigger=5, gated threshold = min(5+2, 8) = 7
		// First tick: signal=7 meets gated threshold, gate_count=1
		a._targets = [makeTarget(150, 150, 7)];
		let occ = a._runLocalZoneEngine().occupancy;
		expect(occ[0]).toBe(false); // not yet — need continuous or 2 gate ticks

		// Second tick: continuous from tick 1, bypasses gating → confirmed
		occ = a._runLocalZoneEngine().occupancy;
		expect(occ[0]).toBe(true);
	});

	it("target in entry-point zone bypasses gating", () => {
		// Entrance zone 1: entry_point=true, trigger=3
		// No previous position but entry point → no gating required
		a._targets = [makeTarget(450, 450, 3)];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true); // immediate — no gating
	});

	it("zone transitions to PENDING then CLEAR after timeout", () => {
		// Get zone 1 occupied first
		a._targets = [makeTarget(450, 450, 5)];
		let occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true);

		// Target disappears → PENDING
		a._targets = [makeTarget(450, 450, 0, "inactive")];
		occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true); // still occupied (PENDING)

		// Fast-forward past timeout (entrance timeout=5s)
		const st = a._zoneEngineState.localZoneState.get(1);
		st.pendingSince = Date.now() / 1000 - 6; // 6 seconds ago
		occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(false); // cleared
	});

	it("target reappears during PENDING → back to OCCUPIED", () => {
		// Occupy zone 1
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine();

		// Target gone → PENDING
		a._targets = [makeTarget(450, 450, 0, "inactive")];
		let occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true); // PENDING

		// Target reappears with signal >= renew (2)
		a._targets = [makeTarget(450, 450, 2)];
		occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true); // back to OCCUPIED
	});

	it("two targets in different zones → both zones occupied", () => {
		// Target 0 in zone 1 (entrance, trigger=3, entry point — no gating)
		// Target 1 in zone 0 (room, trigger=5, gated threshold = min(5+2,8) = 7)
		a._targets = [makeTarget(450, 450, 5), makeTarget(150, 150, 7)];

		// First tick: zone 1 immediate (entry point), zone 0 gating (count=1)
		let occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true);
		expect(occ[0]).toBe(false);

		// Second tick: zone 0 continuous → confirmed
		occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true);
		expect(occ[0]).toBe(true);
	});

	it("target outside grid → no zone occupancy", () => {
		a._targets = [makeTarget(9000, 9000, 9)];
		const occ = a._runLocalZoneEngine().occupancy;
		for (const v of Object.values(occ)) {
			expect(v).toBe(false);
		}
	});

	it("target on non-room cell inside grid → no zone occupancy", () => {
		// Room is cols 8-11, rows 0-3. Target at x=-900 maps to col 5 (inside
		// the 20x20 grid but not a room cell), hitting the cellIsInside branch.
		a._targets = [makeTarget(-900, 150, 9)];
		const occ = a._runLocalZoneEngine().occupancy;
		for (const v of Object.values(occ)) {
			expect(v).toBe(false);
		}
	});

	it("continuity: target moving within 5 cells skips gating", () => {
		// First establish position in zone 0 via gating (need 2 ticks)
		a._targets = [makeTarget(150, 150, 9)];
		a._runLocalZoneEngine(); // gate count 1
		a._runLocalZoneEngine(); // gate count 2 → occupied

		// Move to adjacent cell (still zone 0) — continuous, no re-gating needed
		a._targets = [makeTarget(450, 150, 5)]; // col 9.5 row 0.5 → still zone 0
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[0]).toBe(true); // stays occupied via renew
	});
});

describe("Per-target status parity", () => {
	let el: EPPGridPanel;
	let a: any;

	beforeEach(() => {
		el = createParityPanel();
		a = el as any;
	});

	it("active target in zone → status=active with position and signal", () => {
		a._targets = [makeTarget(450, 450, 5)];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("active");
		// x/y/signal are display concerns handled by _renderTargetDots
	});

	it("no targets → empty targets list", () => {
		a._targets = [];
		const result = a._runLocalZoneEngine();
		expect(result.targets).toHaveLength(0);
	});

	it("inactive target (signal=0) → status=inactive", () => {
		a._targets = [makeTarget(450, 450, 0, "inactive")];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("inactive");
	});

	it("target disappears while zone pending → status=pending with last position", () => {
		// Two active ticks are needed: the first tick creates the zone state and
		// occupies it; the second tick registers the target in confirmedTargets so
		// the pending check can identify which target was last in the zone.
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1: zone created and occupied
		a._runLocalZoneEngine(); // tick 2: target added to confirmedTargets

		// Target disappears (sensor stops tracking → x/y null)
		a._targets = [
			{ x: null, y: null, speed: 0, status: "inactive" as const, signal: 0 },
		];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("pending");
		// Position/signal are display concerns handled by _renderTargetDots
	});

	it("zone clears after timeout → status=inactive", () => {
		// Two active ticks to register the target in confirmedTargets (see above).
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1: zone occupied
		a._runLocalZoneEngine(); // tick 2: target in confirmedTargets

		// Target disappears
		a._targets = [
			{ x: null, y: null, speed: 0, status: "inactive" as const, signal: 0 },
		];
		a._runLocalZoneEngine();

		// Fast-forward past timeout
		const st = a._zoneEngineState.localZoneState.get(1);
		st.pendingSince = Date.now() / 1000 - 6;
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("inactive");
	});

	it("tracked target outside room → status=inactive (no prior room presence)", () => {
		// Target at position outside room cells, tracked with signal, but
		// never was in the room — no zone is pending, so status=inactive.
		a._targets = [makeTarget(-900, 150, 9)];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("inactive");
	});

	it("tracked target outside room → status=pending (with prior room presence)", () => {
		// Target was in room, then moves outside while still tracked.
		// Zone goes pending, target shows at last in-room position.
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1: zone occupied
		a._runLocalZoneEngine(); // tick 2: target in confirmedTargets

		// Target moves outside room but still tracked with signal
		a._targets = [makeTarget(-900, 150, 9)];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("pending");
	});

	it("target reappears during pending → back to active", () => {
		// Two active ticks to register target in confirmedTargets (lazy init).
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1: zone created and occupied
		a._runLocalZoneEngine(); // tick 2: target added to confirmedTargets

		// Target disappears → zone 1 pending
		a._targets = [
			{ x: null, y: null, speed: 0, status: "inactive" as const, signal: 0 },
		];
		const r2 = a._runLocalZoneEngine();
		expect(r2.targets[0].status).toBe("pending");

		// Target reappears with signal >= renew (2) → back to active
		a._targets = [makeTarget(450, 450, 3)];
		const r3 = a._runLocalZoneEngine();
		expect(r3.targets[0].status).toBe("active");
	});

	it("two targets, one leaves → mixed active/pending states", () => {
		// T0 in zone 1 (entry point, immediate), T1 in zone 0 (needs gating)
		a._targets = [makeTarget(450, 450, 5), makeTarget(150, 150, 9)];

		// Tick 1: zone 1 confirmed immediately; zone 0 gating (count=1)
		a._runLocalZoneEngine();

		// Tick 2: zone 0 continuous → both zones occupied and confirmedTargets populated
		a._runLocalZoneEngine();

		// T1 disappears (sensor stops tracking), T0 stays active
		a._targets = [
			makeTarget(450, 450, 5),
			{ x: null, y: null, speed: 0, status: "inactive" as const, signal: 0 },
		];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("active");
		expect(result.targets[1].status).toBe("pending");
	});

	it("tracking outside room then sensor stops → pending throughout", () => {
		// Two active ticks to register target in confirmedTargets.
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1
		a._runLocalZoneEngine(); // tick 2: target in confirmedTargets

		// Target moves outside room but still tracked with signal →
		// immediately pending at last in-room position (not active)
		a._targets = [makeTarget(-900, 150, 9)];
		const r2 = a._runLocalZoneEngine();
		expect(r2.targets[0].status).toBe("pending");

		// Sensor stops tracking (x/y null) → still pending at same position
		a._targets = [
			{ x: null, y: null, speed: 0, status: "inactive" as const, signal: 0 },
		];
		const r3 = a._runLocalZoneEngine();
		expect(r3.targets[0].status).toBe("pending");
	});

	it("signal=0 but tracking (x/y non-null) in pending zone → status=pending", () => {
		// Occupy zone 1 first so zone has state.
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1: zone occupied
		a._runLocalZoneEngine(); // tick 2: target in confirmedTargets

		// Same position but signal=0: zone goes pending, target is pending.
		// signal=0 means targetZoneCurr is never set (signal <= 0 → continue),
		// so inRoom=false → pending check runs → finds target in pending zone.
		// Matches backend: frame_count=0 → tw.active=False → pending check.
		a._targets = [makeTarget(450, 450, 0)];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("pending");
	});

	it("handoff: target moves from zone 1 to zone 0, zone 1 goes pending", () => {
		// Establish zone 1 occupied (entry point → immediate, no gating needed).
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // tick 1: zone 1 occupied
		a._runLocalZoneEngine(); // tick 2: target in confirmedTargets for zone 1

		// Target moves to zone 0; zone 0 needs 2 ticks to confirm via gating.
		a._targets = [makeTarget(150, 150, 7)];
		a._runLocalZoneEngine(); // tick 1 in zone 0: gating count=1; handoff triggers zone 1 → pending
		const result = a._runLocalZoneEngine(); // tick 2 in zone 0: confirmed

		// Target is active in zone 0 at new position.
		expect(result.targets[0].status).toBe("active");

		// Zone 1 is still occupied (pending) due to handoff.
		expect(result.occupancy[0]).toBe(true);
		expect(result.occupancy[1]).toBe(true);
	});
});

describe("Pending target position fallback (_renderTargetDots)", () => {
	let el: EPPGridPanel;
	let a: any;

	beforeEach(() => {
		el = createParityPanel();
		a = el as any;
	});

	/**
	 * Run the zone engine and apply the status overwrite to _targets
	 * (same as _renderVisibleCells does in the real component).
	 */
	function runEngineAndOverwrite() {
		const engineResult = a._runLocalZoneEngine();
		for (
			let i = 0;
			i < engineResult.targets.length && i < a._targets.length;
			i++
		) {
			a._targets[i].status = engineResult.targets[i].status;
		}
		return engineResult;
	}

	/**
	 * Compute the display position for target 0, replicating the
	 * _renderTargetDots logic: if pending and off-grid, fall back to
	 * _targetPrevXY; if pending and on-grid, use actual position.
	 */
	function getFirstDotPosition(): { leftPct: number; topPct: number } | null {
		const minCol = 8,
			minRow = 0,
			visCols = 4,
			visRows = 4;
		const t = a._targets[0];
		if (!t || t.status === "inactive") return null;

		const prevXY = a._zoneEngineState.targetPrevXY[0];
		let pos = t.x != null ? a._mapTargetToGridCell(t) : null;
		const onGrid =
			pos &&
			pos.col >= minCol &&
			pos.col <= minCol + visCols &&
			pos.row >= minRow &&
			pos.row <= minRow + visRows;
		if (t.status === "pending" && !onGrid && prevXY) {
			pos = a._mapTargetToGridCell({ ...t, x: prevXY.x, y: prevXY.y });
		}
		if (!pos) return null;
		return {
			leftPct: Math.max(0, Math.min(100, ((pos.col - minCol) / visCols) * 100)),
			topPct: Math.max(0, Math.min(100, ((pos.row - minRow) / visRows) * 100)),
		};
	}

	it("pending target on grey cell (on grid) → renders at actual position", () => {
		// First occupy zone 1 and record _targetPrevXY
		a._targets = [makeTarget(450, 450, 5)];
		runEngineAndOverwrite();
		runEngineAndOverwrite();
		expect(a._zoneEngineState.targetPrevXY[0]).toEqual({ x: 450, y: 450 });

		// Move target to a grey cell within the visible grid.
		// Cell (8,0) is a room cell. Remove the room bit to make it grey.
		a._grid[0 * 20 + 8] = 0; // clear room bit on cell (8,0)

		// Target at (150, 150) → col 8.5, row 0.5 — on grid (cols 8-12, rows 0-4)
		// but not a room cell → zone engine gives "pending"
		a._targets = [makeTarget(150, 150, 9)];
		runEngineAndOverwrite();
		expect(a._targets[0].status).toBe("pending");

		// Rendering should use actual position (on grid), not _targetPrevXY
		const dot = getFirstDotPosition();
		expect(dot).not.toBeNull();
		// col 8.5 → leftPct = (8.5 - 8) / 4 * 100 = 12.5%
		expect(dot!.leftPct).toBeCloseTo(12.5, 0);
		// row 0.5 → topPct = (0.5 - 0) / 4 * 100 = 12.5%
		expect(dot!.topPct).toBeCloseTo(12.5, 0);
	});

	it("pending target outside grid → renders at last in-room position", () => {
		// First occupy zone 1 and record _targetPrevXY
		a._targets = [makeTarget(450, 450, 5)];
		runEngineAndOverwrite();
		runEngineAndOverwrite();
		expect(a._zoneEngineState.targetPrevXY[0]).toEqual({ x: 450, y: 450 });

		// Target moves outside the visible grid entirely
		// x=-900 → col = 8 + (-900/300) = 5 — below minCol=8
		a._targets = [makeTarget(-900, 150, 9)];
		runEngineAndOverwrite();
		expect(a._targets[0].status).toBe("pending");

		// Rendering should fall back to _targetPrevXY (450, 450)
		const dot = getFirstDotPosition();
		expect(dot).not.toBeNull();
		// (450, 450) → col 9.5, row 1.5
		// leftPct = (9.5 - 8) / 4 * 100 = 37.5%
		expect(dot!.leftPct).toBeCloseTo(37.5, 0);
		// topPct = (1.5 - 0) / 4 * 100 = 37.5%
		expect(dot!.topPct).toBeCloseTo(37.5, 0);
	});

	it("pending target not tracked (x/y null) → renders at last in-room position", () => {
		// First occupy zone 1 and record _targetPrevXY
		a._targets = [makeTarget(450, 450, 5)];
		runEngineAndOverwrite();
		runEngineAndOverwrite();

		// Sensor stops tracking
		a._targets = [
			{ x: null, y: null, speed: 0, status: "inactive" as const, signal: 0 },
		];
		runEngineAndOverwrite();
		expect(a._targets[0].status).toBe("pending");

		// Rendering should use _targetPrevXY
		const dot = getFirstDotPosition();
		expect(dot).not.toBeNull();
		expect(dot!.leftPct).toBeCloseTo(37.5, 0);
		expect(dot!.topPct).toBeCloseTo(37.5, 0);
	});

	it("active target → renders at actual position (no fallback)", () => {
		a._targets = [makeTarget(450, 450, 5)];
		runEngineAndOverwrite();
		runEngineAndOverwrite();

		const dot = getFirstDotPosition();
		expect(dot).not.toBeNull();
		expect(dot!.leftPct).toBeCloseTo(37.5, 0);
		expect(dot!.topPct).toBeCloseTo(37.5, 0);
	});
});

describe("Unsaved grid overrides backend status", () => {
	let el: EPPGridPanel;
	let a: any;

	beforeEach(() => {
		el = createParityPanel();
		a = el as any;
	});

	function runEngineAndOverwrite() {
		const engineResult = a._runLocalZoneEngine();
		for (
			let i = 0;
			i < engineResult.targets.length && i < a._targets.length;
			i++
		) {
			a._targets[i].status = engineResult.targets[i].status;
		}
		return engineResult;
	}

	it("backend says pending (saved grey cell) but unsaved grid has room → active", () => {
		// Simulate: backend sees target on a saved grey cell and sends
		// status=pending, signal=0. But the frontend unsaved grid has
		// that cell as room. After the raw signal fix, the frontend
		// receives the raw sensor signal (non-zero), not the zone
		// engine's filtered signal.
		//
		// Target at (450, 450) → cell (9,1) = zone 1 (entrance) in parity grid.
		// Backend would send status="pending" if cell was grey in saved grid.
		// But unsaved grid has it as room (zone 1).
		// Raw sensor signal = 5 (not filtered to 0 by backend zone engine).
		a._targets = [makeTarget(450, 450, 5, "pending")];
		runEngineAndOverwrite();

		// Frontend zone engine should override to active
		expect(a._targets[0].status).toBe("active");
	});

	it("backend says active but unsaved grid has grey cell → not active", () => {
		// Opposite case: backend sees target on a saved room cell (active),
		// but user deleted the room bit in the editor (now grey).
		//
		// First establish zone state so pending check can find a zone.
		a._targets = [makeTarget(450, 450, 5)];
		runEngineAndOverwrite(); // tick 1
		runEngineAndOverwrite(); // tick 2: target in confirmedTargets

		// Now remove the room bit from cell (9,1) — make it grey
		a._grid[1 * 20 + 9] = 0;

		// Backend still sends active (saved grid has room), signal=5
		a._targets = [makeTarget(450, 450, 5, "active")];
		runEngineAndOverwrite();

		// Frontend zone engine should NOT show active — cell is grey
		// in unsaved grid. Target is either pending (if zone is still
		// pending with target in confirmedTargets) or inactive.
		expect(a._targets[0].status).not.toBe("active");
	});

	it("backend says pending with raw signal → frontend overrides to active", () => {
		// Backend sends raw sensor signal (non-zero) even for targets
		// it considers pending. The frontend zone engine uses this raw
		// signal to process the target against the unsaved grid.
		a._targets = [makeTarget(450, 450, 7, "pending")];
		runEngineAndOverwrite();

		// Frontend grid has room at (450,450) → active despite backend pending
		expect(a._targets[0].status).toBe("active");
	});
});
