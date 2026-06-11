import { beforeEach, describe, expect, it } from "vitest";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	cellSetOverlay,
	cellSetZone,
	GRID_CELL_COUNT,
	GRID_COLS,
} from "../grid.js";
import {
	createZoneEngineState,
	runLocalZoneEngine,
	type ZoneEngineParams,
	type ZoneEngineState,
} from "../zone-engine.js";

const MAX_ZONES = 7;

/** Room: 1200x1200mm, centered in 20-col grid -> cols 8-11, rows 0-3. */
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

function makeTarget(
	x: number,
	y: number,
	signal: number,
	status: "active" | "pending" | "inactive" = "active",
) {
	return { x, y, signal, status };
}

function makeNullTarget() {
	return {
		x: null as number | null,
		y: null as number | null,
		signal: 0,
		status: "inactive" as const,
	};
}

function makeDefaultParams(
	overrides: Partial<ZoneEngineParams> = {},
): ZoneEngineParams {
	const zoneConfigs: (import("../zone-defaults.js").ZoneConfig | null)[] =
		new Array(MAX_ZONES).fill(null);
	// Zone 1: custom type (trigger=3, renew=2, timeout=5, handoff=1)
	zoneConfigs[0] = {
		name: "Zone 1",
		color: "#ff0000",
		type: "custom",
		trigger: 3,
		renew: 2,
		timeout: 5,
		handoff_timeout: 1,
	};

	return {
		targets: [],
		grid: makeParityGrid(),
		roomWidth: 1200,
		roomDepth: 1200,
		zoneConfigs,
		roomType: "default",
		roomTrigger: 5,
		roomRenew: 3,
		roomTimeout: 10,
		roomHandoffTimeout: 3,
		now: Date.now() / 1000,
		...overrides,
	};
}

describe("createZoneEngineState", () => {
	it("returns correct initial state", () => {
		const state = createZoneEngineState();
		expect(state.localZoneState).toBeInstanceOf(Map);
		expect(state.localZoneState.size).toBe(0);
		expect(state.targetPrev).toEqual([null, null, null]);
		expect(state.targetGateCount).toEqual([0, 0, 0]);
		expect(state.targetPrevXY).toEqual([null, null, null]);
	});
});

describe("runLocalZoneEngine", () => {
	let state: ZoneEngineState;

	beforeEach(() => {
		state = createZoneEngineState();
	});

	it("empty grid returns empty occupancy", () => {
		const params = makeDefaultParams({ targets: [] });
		const result = runLocalZoneEngine(state, params);
		// All zones should be false
		expect(result.occupancy[0]).toBe(false);
		expect(result.occupancy[1]).toBe(false);
		expect(result.targets).toHaveLength(0);
	});

	it("target with signal >= trigger causes occupancy (overlay entry, no gating)", () => {
		const grid = makeParityGrid();
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 3)],
		});
		params.grid = grid;
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(true);
		expect(result.occupancy[0]).toBe(false);
	});

	it("target with signal < trigger does NOT cause occupancy", () => {
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 2)],
		});
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(false);
	});

	it("occupancy persists during pending timeout after target leaves", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		// Occupy zone 1
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		params1.grid = grid;
		runLocalZoneEngine(state, params1);

		// Target disappears (signal=0)
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
			now: now + 1,
		});
		params2.grid = grid;
		const result2 = runLocalZoneEngine(state, params2);
		expect(result2.occupancy[1]).toBe(true); // still occupied (pending)

		// Past timeout (custom zone timeout=5s)
		const params3 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
			now: now + 7,
		});
		params3.grid = grid;
		const result3 = runLocalZoneEngine(state, params3);
		expect(result3.occupancy[1]).toBe(false); // cleared
	});

	it("target status transitions: active -> pending -> inactive", () => {
		const now = Date.now() / 1000;

		// Tick 1: zone 1 occupied
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		const r1 = runLocalZoneEngine(state, params1);
		expect(r1.targets[0].status).toBe("active");

		// Tick 2: target in confirmedTargets
		runLocalZoneEngine(state, params1);

		// Target disappears -> pending
		const params2 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 1,
		});
		const r2 = runLocalZoneEngine(state, params2);
		expect(r2.targets[0].status).toBe("pending");

		// Past timeout -> inactive
		const params3 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 7,
		});
		const r3 = runLocalZoneEngine(state, params3);
		expect(r3.targets[0].status).toBe("inactive");
	});

	it("inactive target (signal=0) -> all zones clear", () => {
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
		});
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[0]).toBe(false);
		expect(result.occupancy[1]).toBe(false);
	});

	it("target in room (zone 0) with signal >= gated threshold -> occupied after gating", () => {
		const now = Date.now() / 1000;
		// Room zone 0: trigger=5, gated threshold = min(5+2, 8) = 7
		const params = makeDefaultParams({
			targets: [makeTarget(150, 150, 7)],
			now,
		});

		// First tick: gate_count=1, not yet confirmed
		let result = runLocalZoneEngine(state, params);
		expect(result.occupancy[0]).toBe(false);

		// Second tick: continuous from tick 1 -> confirmed
		result = runLocalZoneEngine(state, params);
		expect(result.occupancy[0]).toBe(true);
	});

	it("entry-point zone bypasses gating", () => {
		const grid = makeParityGrid();
		// Cell (9,1) = index 29 is zone 1. Set overlay entry bit.
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 3)],
		});
		params.grid = grid;
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(true); // immediate
	});

	it("cell overlay entry bypasses gating (not zone entry_point)", () => {
		// Zone 0 (default type, no entry_point) but cell has overlay
		const grid = makeParityGrid();
		// Cell at (8,0) = index 8 — zone 0, inside room. Set overlay bit.
		grid[8] = cellSetOverlay(grid[8], CELL_OVERLAY_ENTRY);
		const params = makeDefaultParams({
			targets: [makeTarget(150, 150, 5)], // target lands on cell (8,0) = zone 0
			zoneConfigs: [
				{ name: "Zone 1", color: "#56B4E9", type: "default" },
				...new Array(6).fill(null),
			],
		});
		params.grid = grid;
		// Zone 0 trigger=5, gated would be 7. Signal=5 would fail gating.
		// But overlay entry → no gating → signal=5 >= trigger=5 → confirmed immediately.
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[0]).toBe(true);
	});

	it("target reappears during pending -> back to occupied", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		// Occupy zone 1
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		params1.grid = grid;
		runLocalZoneEngine(state, params1);

		// Target gone -> pending
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
			now: now + 1,
		});
		params2.grid = grid;
		const result2 = runLocalZoneEngine(state, params2);
		expect(result2.occupancy[1]).toBe(true); // pending

		// Target reappears with signal >= renew (2)
		const params3 = makeDefaultParams({
			targets: [makeTarget(450, 450, 2)],
			now: now + 2,
		});
		params3.grid = grid;
		const result3 = runLocalZoneEngine(state, params3);
		expect(result3.occupancy[1]).toBe(true); // back to occupied
	});

	it("two targets in different zones -> both zones occupied", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 5), makeTarget(150, 150, 7)],
			now,
		});
		params.grid = grid;

		// First tick: zone 1 immediate (overlay entry), zone 0 gating
		let result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(true);
		expect(result.occupancy[0]).toBe(false);

		// Second tick: zone 0 continuous -> confirmed
		result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(true);
		expect(result.occupancy[0]).toBe(true);
	});

	it("target outside grid -> no zone occupancy", () => {
		const params = makeDefaultParams({
			targets: [makeTarget(9000, 9000, 9)],
		});
		const result = runLocalZoneEngine(state, params);
		for (const v of Object.values(result.occupancy)) {
			expect(v).toBe(false);
		}
	});

	it("target on non-room cell inside grid -> no zone occupancy", () => {
		const params = makeDefaultParams({
			targets: [makeTarget(-900, 150, 9)],
		});
		const result = runLocalZoneEngine(state, params);
		for (const v of Object.values(result.occupancy)) {
			expect(v).toBe(false);
		}
	});

	it("continuity: target moving within 5 cells skips gating", () => {
		const now = Date.now() / 1000;
		// First establish position in zone 0 via gating
		const params1 = makeDefaultParams({
			targets: [makeTarget(150, 150, 9)],
			now,
		});
		runLocalZoneEngine(state, params1); // gate count 1
		runLocalZoneEngine(state, params1); // continuous -> occupied

		// Move to adjacent cell (still zone 0) — continuous
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 150, 5)],
			now: now + 1,
		});
		const result = runLocalZoneEngine(state, params2);
		expect(result.occupancy[0]).toBe(true);
	});

	it("records targetPrevXY for in-room targets", () => {
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
		});
		runLocalZoneEngine(state, params);
		expect(state.targetPrevXY[0]).toEqual({ x: 450, y: 450 });
	});

	it("handoff: target moves from zone 1 to zone 0, zone 1 goes pending", () => {
		const now = Date.now() / 1000;
		// Establish zone 1 occupied
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		runLocalZoneEngine(state, params1); // tick 1
		runLocalZoneEngine(state, params1); // tick 2: confirmedTargets

		// Target moves to zone 0
		const params2 = makeDefaultParams({
			targets: [makeTarget(150, 150, 7)],
			now: now + 1,
		});
		runLocalZoneEngine(state, params2); // handoff triggers zone 1 pending
		const result = runLocalZoneEngine(state, params2); // zone 0 confirmed

		expect(result.targets[0].status).toBe("active");
		expect(result.occupancy[0]).toBe(true);
		expect(result.occupancy[1]).toBe(true); // still pending
	});

	it("no targets -> empty targets list", () => {
		const params = makeDefaultParams({ targets: [] });
		const result = runLocalZoneEngine(state, params);
		expect(result.targets).toHaveLength(0);
	});

	it("tracked target outside room -> pending with prior room presence", () => {
		const now = Date.now() / 1000;
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		runLocalZoneEngine(state, params1); // tick 1
		runLocalZoneEngine(state, params1); // tick 2: confirmedTargets

		// Target moves outside room but still tracked
		const params2 = makeDefaultParams({
			targets: [makeTarget(-900, 150, 9)],
			now: now + 1,
		});
		const result = runLocalZoneEngine(state, params2);
		expect(result.targets[0].status).toBe("pending");
	});

	it("signal=0 but tracking in pending zone -> status=pending", () => {
		const now = Date.now() / 1000;
		// Occupy zone 1
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		runLocalZoneEngine(state, params1); // tick 1
		runLocalZoneEngine(state, params1); // tick 2: confirmedTargets

		// Same position but signal=0
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0)],
			now: now + 1,
		});
		const result = runLocalZoneEngine(state, params2);
		expect(result.targets[0].status).toBe("pending");
	});

	it("sensor state: static active when sensor on", () => {
		const params = makeDefaultParams({
			targets: [],
			staticPresence: true,
			staticTimeout: 5,
		});
		const result = runLocalZoneEngine(state, params);
		expect(result.staticState).toBe("active");
	});

	it("sensor state: static pending when sensor goes off", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now,
			}),
		);
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 1,
			}),
		);
		expect(result.staticState).toBe("pending");
	});

	it("sensor state: static inactive after timeout", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now,
			}),
		);
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 1,
			}),
		);
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 7,
			}),
		);
		expect(result.staticState).toBe("inactive");
	});

	it("sensor state: static reactivates during pending", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now,
			}),
		);
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 1,
			}),
		);
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now: now + 2,
			}),
		);
		expect(result.staticState).toBe("active");
	});

	it("sensor state: motion follows same lifecycle", () => {
		const now = Date.now() / 1000;
		const r1 = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				motionPresence: true,
				motionTimeout: 3,
				now,
			}),
		);
		expect(r1.motionState).toBe("active");
		const r2 = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				motionPresence: false,
				motionTimeout: 3,
				now: now + 1,
			}),
		);
		expect(r2.motionState).toBe("pending");
		const r3 = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				motionPresence: false,
				motionTimeout: 3,
				now: now + 5,
			}),
		);
		expect(r3.motionState).toBe("inactive");
	});

	it("sensor state: defaults to inactive when not provided", () => {
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [] }),
		);
		expect(result.staticState).toBe("inactive");
		expect(result.motionState).toBe("inactive");
	});

	it("force-clear: pending zones cleared when sensors inactive and no active zones", () => {
		const now = Date.now() / 1000;
		// Use short sensor timeouts (1s) so they expire well before zone timeout (5s)
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 5)],
				staticPresence: true,
				staticTimeout: 1,
				motionPresence: true,
				motionTimeout: 1,
				now,
			}),
		);
		// Target disappears at now+1, zone 1 goes PENDING_CLEAR (timeout=5s, expires at now+6)
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeNullTarget()],
				staticPresence: true,
				staticTimeout: 1,
				motionPresence: true,
				motionTimeout: 1,
				now: now + 1,
			}),
		);
		// Sensors go off at now+2
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeNullTarget()],
				staticPresence: false,
				staticTimeout: 1,
				motionPresence: false,
				motionTimeout: 1,
				now: now + 2,
			}),
		);
		// At now+3.5: sensors expired (1s timeout from now+2), zone still has 2.5s left
		// Force-clear should fire and clear the zone immediately
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeNullTarget()],
				staticPresence: false,
				staticTimeout: 1,
				motionPresence: false,
				motionTimeout: 1,
				now: now + 3.5,
			}),
		);
		expect(result.occupancy[1]).toBe(false); // force-cleared before zone timeout
	});

	it("force-clear: does NOT clear if a zone has active targets", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 5)],
				staticPresence: true,
				staticTimeout: 2,
				now,
			}),
		);
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 5)],
				staticPresence: false,
				staticTimeout: 2,
				now: now + 1,
			}),
		);
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 5)],
				staticPresence: false,
				staticTimeout: 2,
				now: now + 4,
			}),
		);
		expect(result.occupancy[1]).toBe(true);
	});

	it("overlay exit accelerates pending clear (handoff timeout)", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		// Cell (9,1) = index 29 is zone 1 (custom type: timeout=5, handoff=1).
		// Set overlay entry bit.
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);

		// Tick 1: target in zone 1, confirmed
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		params1.grid = grid;
		runLocalZoneEngine(state, params1);
		expect(state.localZoneState.get(1)?.occupied).toBe(true);

		// Tick 2: target disappears — should use handoff_timeout (1s) not timeout (5s)
		const params2 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 1,
		});
		params2.grid = grid;
		runLocalZoneEngine(state, params2);
		// Zone should be pending (occupied=true, pendingSince set)
		expect(state.localZoneState.get(1)?.occupied).toBe(true);
		expect(state.localZoneState.get(1)?.pendingSince).not.toBeNull();

		// Tick 3: 1.5s later (past handoff_timeout=1s, but before full timeout=5s)
		const params3 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 2.5,
		});
		params3.grid = grid;
		const result3 = runLocalZoneEngine(state, params3);
		// Should have cleared — handoff timeout is 1s
		expect(result3.occupancy[1]).toBe(false);
	});

	it("non-overlay exit uses full timeout (no acceleration)", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		// Zone 0 (default: timeout=10, handoff=3). No overlay.
		// Cell (8,0) = index 8. Need 2 gating ticks to confirm zone 0.
		const params1a = makeDefaultParams({
			targets: [makeTarget(150, 150, 7)],
			now,
		});
		params1a.grid = grid;
		runLocalZoneEngine(state, params1a); // gating tick 1
		const params1b = makeDefaultParams({
			targets: [makeTarget(150, 150, 7)],
			now: now + 1,
		});
		params1b.grid = grid;
		runLocalZoneEngine(state, params1b); // gating tick 2 → confirmed
		expect(state.localZoneState.get(0)?.occupied).toBe(true);

		// Target disappears — no overlay → full timeout (10s)
		const params2 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 2,
		});
		params2.grid = grid;
		runLocalZoneEngine(state, params2);

		// 5s later — should still be occupied (timeout=10s)
		const params3 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 7,
		});
		params3.grid = grid;
		const result3 = runLocalZoneEngine(state, params3);
		expect(result3.occupancy[0]).toBe(true); // still pending

		// 12s later — should clear
		const params4 = makeDefaultParams({
			targets: [makeNullTarget()],
			now: now + 14,
		});
		params4.grid = grid;
		const result4 = runLocalZoneEngine(state, params4);
		expect(result4.occupancy[0]).toBe(false);
	});

	it("mmwave: false with no input", () => {
		const now = Date.now() / 1000;
		const r = runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [], now }),
		);
		expect(r.mmwave).toBe(false);
	});

	it("mmwave: true when static presence active", () => {
		const now = Date.now() / 1000;
		const r = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now,
			}),
		);
		expect(r.mmwave).toBe(true);
	});

	it("mmwave: true while static presence pending", () => {
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now,
			}),
		);
		const r = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 1,
			}),
		);
		expect(r.mmwave).toBe(true);
	});

	it("mmwave: ignores motion-only presence", () => {
		const now = Date.now() / 1000;
		const r = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				motionPresence: true,
				motionTimeout: 5,
				now,
			}),
		);
		// motion alone must not turn mmwave on
		expect(r.mmwave).toBe(false);
	});

	it("mmwave: true when zone OCCUPIED with all sensors off", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 3)],
			now,
		});
		params.grid = grid;
		const r = runLocalZoneEngine(state, params);
		expect(r.occupancy[1]).toBe(true);
		expect(r.mmwave).toBe(true);
	});

	it("mmwave: off when static inactive and tracker pending (zone PENDING_CLEAR)", () => {
		const now = Date.now() / 1000;
		const grid = makeParityGrid();
		grid[29] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);

		// Confirm zone 1 with motion held on so force-clear cannot fire later.
		const p1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 3)],
			motionPresence: true,
			motionTimeout: 100,
			now,
		});
		p1.grid = grid;
		runLocalZoneEngine(state, p1);

		// Target gone, motion still on → zone goes PENDING_CLEAR but stays
		// occupied (force-clear blocked by motion); static was never on.
		const p2 = makeDefaultParams({
			targets: [makeNullTarget()],
			motionPresence: true,
			motionTimeout: 100,
			now: now + 1,
		});
		p2.grid = grid;
		const r = runLocalZoneEngine(state, p2);
		expect(r.occupancy[1]).toBe(true); // tracker still on (pending)
		expect(r.staticState).toBe("inactive");
		expect(r.mmwave).toBe(false); // static off + tracker pending → off
	});

	it("occupancy result: true when sensor active/pending, false when all inactive", () => {
		const now = Date.now() / 1000;
		const r1 = runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [], now }),
		);
		expect(r1.sensorOccupancy).toBe(false);
		const r2 = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: true,
				staticTimeout: 5,
				now: now + 1,
			}),
		);
		expect(r2.sensorOccupancy).toBe(true);
		const r3 = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 2,
			}),
		);
		expect(r3.sensorOccupancy).toBe(true);
		const r4 = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				staticPresence: false,
				staticTimeout: 5,
				now: now + 8,
			}),
		);
		expect(r4.sensorOccupancy).toBe(false);
	});
});

describe("interference zones", () => {
	let state: ZoneEngineState;

	beforeEach(() => {
		state = createZoneEngineState();
	});

	it("interference does not change trigger threshold (trigger uses normal zone value)", () => {
		// Zone 1 trigger=3. With interference, trigger stays 3.
		// Target enters via continuity, signal 3 >= trigger 3 → should occupy.
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_INTERFERENCE,
		);
		grid[1 * GRID_COLS + 8] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_ENTRY,
		);

		// First tick: establish position in clean cell
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(150, 450, 9)],
				grid,
				now,
			}),
		);

		// Second tick: move to interference cell with continuity
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 3)], // signal 3 >= trigger 3
				grid,
				now: now + 0.1,
			}),
		);
		expect(result.occupancy[1]).toBe(true);
	});

	it("interference sets renew threshold to 9", () => {
		// Occupy zone 1 via continuity, then check renew.
		// Zone 1 renew=2, but with interference renew=9.
		// Signal 8 < 9 → should start pending-clear.
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_INTERFERENCE,
		);
		grid[1 * GRID_COLS + 8] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_ENTRY,
		);

		const now = Date.now() / 1000;
		// Tick 1: clean cell
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(150, 450, 9)],
				grid,
				now,
			}),
		);
		// Tick 2: enter interference cell → occupies (trigger=3, signal=9)
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 9)],
				grid,
				now: now + 0.1,
			}),
		);
		expect(state.localZoneState.get(1)?.occupied).toBe(true);

		// Tick 3: signal drops to 8 < renew(9) → pending-clear
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 8)],
				grid,
				now: now + 0.2,
			}),
		);
		expect(state.localZoneState.get(1)?.pendingSince).not.toBeNull();
	});

	it("suppress overlay prevents detection entirely", () => {
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_SUPPRESS,
		);
		grid[1 * GRID_COLS + 8] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_ENTRY,
		);

		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 9)],
			grid,
		});
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(false);
	});

	it("no first appearance: target without continuity is skipped in interference zone", () => {
		// A target appearing directly in an interference cell with no prior position
		// should be skipped — it must be handed off from a clean zone.
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_INTERFERENCE,
		);
		// Adjacent overlay to bypass gating — but "no first appearance" should still block
		grid[1 * GRID_COLS + 8] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_ENTRY,
		);

		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 9)], // max signal
			grid,
		});
		const result = runLocalZoneEngine(state, params);
		// Even with max signal, target has no continuity → skipped
		expect(result.occupancy[1]).toBe(false);
	});

	it("no first appearance: target with continuity from clean zone is allowed", () => {
		// First tick: target in clean zone 0 cell (col=8, row=1) → establishes position
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_INTERFERENCE,
		);
		grid[1 * GRID_COLS + 8] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_ENTRY,
		);

		const params1 = makeDefaultParams({
			targets: [makeTarget(150, 450, 9)], // cell (8,1) — clean zone 0
			grid,
		});
		runLocalZoneEngine(state, params1);

		// Second tick: target moves to interference cell (col=9, row=1) — has continuity
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)], // signal 5 >= effectiveTrigger 5
			grid,
			now: (params1.now ?? Date.now() / 1000) + 0.1,
		});
		const result = runLocalZoneEngine(state, params2);
		expect(result.occupancy[1]).toBe(true);
	});

	it("no first appearance: persistent ghost never gains continuity", () => {
		// Simulates a fan: same target appears at same interference cell every tick,
		// but never has continuity because targetPrev is cleared each time.
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_INTERFERENCE,
		);

		const now = Date.now() / 1000;
		for (let tick = 0; tick < 10; tick++) {
			const params = makeDefaultParams({
				targets: [makeTarget(450, 450, 9)],
				grid,
				now: now + tick * 0.1,
			});
			const result = runLocalZoneEngine(state, params);
			expect(result.occupancy[1]).toBe(false);
		}
	});

	it("no first appearance: does not apply when zone is already occupied", () => {
		// First: occupy zone via continuity from clean zone
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_INTERFERENCE,
		);
		grid[1 * GRID_COLS + 8] = cellSetOverlay(
			cellSetZone(CELL_ROOM_BIT, 1),
			CELL_OVERLAY_ENTRY,
		);

		// Tick 1: target in clean cell
		const now = Date.now() / 1000;
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(150, 450, 9)],
				grid,
				now,
			}),
		);

		// Tick 2: target moves to interference cell — continuity → occupies
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 9)],
				grid,
				now: now + 0.1,
			}),
		);
		expect(state.localZoneState.get(1)?.occupied).toBe(true);

		// Tick 3: target disappears then reappears at same cell — no continuity
		// but zone is OCCUPIED, so target should still be counted (renew path)
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeNullTarget()],
				grid,
				now: now + 0.2,
			}),
		);
		runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 9)],
				grid,
				now: now + 0.3,
			}),
		);
		// Zone should still be occupied (or at least pending), not cleared
		const zs = state.localZoneState.get(1);
		expect(zs?.occupied).toBe(true);
	});
});

describe("inactive-target tracking (firmware !tw.active parity)", () => {
	// The shared fixture cannot express "x/y non-null but signal=0": its C++
	// harness derives active from frames, so frames=0 always means
	// not-tracking there. The backend DOES send such targets (pending echo
	// with last-known position, signal 0) — they correspond to firmware
	// tw.active=false and must clear continuity/gating identically.
	it("signal=0 while still tracked clears continuity and gating", () => {
		const state = createZoneEngineState();
		const now = 100;

		// Tick 1: zone 0 (gated thresh 7), signal 7 → gate=1, prev recorded.
		const r1 = runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [makeTarget(150, 150, 7)], now }),
		);
		expect(r1.occupancy[0]).toBe(false);

		// Tick 2: same position but signal=0 → firmware-equivalent of
		// tw.active=false → tracking must be cleared.
		runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [makeTarget(150, 150, 0)], now: now + 1 }),
		);
		expect(state.targetPrev[0]).toBeNull();
		expect(state.targetGateCount[0]).toBe(0);

		// Tick 3: target reactivates at the same cell. Without the clear it
		// would inherit continuity and confirm immediately; the firmware
		// restarts gating instead (gate=1, not confirmed).
		const r3 = runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [makeTarget(150, 150, 7)], now: now + 2 }),
		);
		expect(r3.occupancy[0]).toBe(false);
	});

	it("pending-echo target (signal=0) does not count as active for cleanup", () => {
		const state = createZoneEngineState();
		const now = 100;
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		// Occupy zone 1 (single tick — first-tick confirm registers target 0).
		runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [makeTarget(450, 450, 5)], grid, now }),
		);
		expect(state.localZoneState.get(1)?.confirmedTargets.has(0)).toBe(true);

		// Backend pending echo: position present, signal 0. Zone goes
		// pending and the target reports pending (not inactive).
		const r = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [makeTarget(450, 450, 0)],
				grid,
				now: now + 1,
			}),
		);
		expect(r.occupancy[1]).toBe(true);
		expect(r.targets[0].status).toBe("pending");
	});
});

describe("unconfigured zones (firmware find_zone_index parity)", () => {
	it("painted-but-unconfigured zone never confirms and gets no state", () => {
		const state = createZoneEngineState();
		const grid = makeParityGrid();
		// Paint cell (10,1) as zone 2; zone 2 has no config (slot null).
		grid[1 * GRID_COLS + 10] = cellSetZone(CELL_ROOM_BIT, 2);
		const params = makeDefaultParams({
			targets: [makeTarget(750, 450, 9)], // cell (10,1)
			grid,
		});
		runLocalZoneEngine(state, params);
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[2]).toBe(false);
		expect(state.localZoneState.has(2)).toBe(false);
		// Position is still recorded for continuity (firmware else-branch).
		expect(state.targetPrev[0]).toEqual({ col: 10, row: 1 });
	});

	it("zone state is dropped when its config disappears between ticks", () => {
		const state = createZoneEngineState();
		const now = 100;
		const grid = makeParityGrid();
		grid[1 * GRID_COLS + 9] = cellSetOverlay(grid[29], CELL_OVERLAY_ENTRY);
		// Occupy configured zone 1.
		runLocalZoneEngine(
			state,
			makeDefaultParams({ targets: [makeTarget(450, 450, 5)], grid, now }),
		);
		expect(state.localZoneState.get(1)?.occupied).toBe(true);

		// Same grid, but zone 1's config is now null (slot deleted).
		const result = runLocalZoneEngine(
			state,
			makeDefaultParams({
				targets: [],
				grid,
				zoneConfigs: new Array(MAX_ZONES).fill(null),
				now: now + 1,
			}),
		);
		expect(result.occupancy[1]).toBe(false);
		expect(state.localZoneState.has(1)).toBe(false);
	});
});

describe("stale zone cleanup", () => {
	it("clears occupancy for zones no longer in the grid", () => {
		const state = createZoneEngineState();
		const grid = new Uint8Array(GRID_CELL_COUNT);
		// Start with zone 0 and zone 1 in the grid
		grid[0] = CELL_ROOM_BIT; // zone 0
		grid[1] = cellSetZone(CELL_ROOM_BIT, 1); // zone 1

		const targets = [{ x: 0, y: 0, status: "active" as const, signal: 9 }];
		const params = makeDefaultParams({
			grid,
			targets,
			roomWidth: 6000,
			roomDepth: 6000,
		});

		// Run twice to pass gating (needs 2 consecutive ticks)
		runLocalZoneEngine(state, params);
		runLocalZoneEngine(state, params);
		expect(state.localZoneState.get(0)?.occupied).toBe(true);

		// Now repaint all cells into zone 1 (zone 0 no longer in grid)
		grid[0] = cellSetZone(CELL_ROOM_BIT, 1);

		// Next tick: zone 0 should be cleared from state
		const result = runLocalZoneEngine(state, params);
		expect(state.localZoneState.get(0)?.occupied).toBeFalsy();
		expect(result.occupancy[0]).toBeFalsy();
	});
});
