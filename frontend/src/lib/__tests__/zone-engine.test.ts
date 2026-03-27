import { beforeEach, describe, expect, it } from "vitest";
import {
	CELL_ROOM_BIT,
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
	return { x, y, signal, speed: 0, status };
}

function makeNullTarget() {
	return {
		x: null as number | null,
		y: null as number | null,
		signal: 0,
		speed: 0,
		status: "inactive" as const,
	};
}

function makeDefaultParams(
	overrides: Partial<ZoneEngineParams> = {},
): ZoneEngineParams {
	const zoneConfigs: (import("../zone-defaults.js").ZoneConfig | null)[] =
		new Array(MAX_ZONES).fill(null);
	// Zone 1: entrance type
	zoneConfigs[0] = {
		name: "Zone 1",
		color: "#ff0000",
		type: "entrance",
	};

	return {
		targets: [],
		grid: makeParityGrid(),
		roomWidth: 1200,
		roomDepth: 1200,
		zoneConfigs,
		roomType: "normal",
		roomTrigger: 5,
		roomRenew: 3,
		roomTimeout: 10,
		roomHandoffTimeout: 3,
		roomEntryPoint: false,
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

	it("target with signal >= trigger causes occupancy (entrance zone, no gating)", () => {
		// Entrance zone 1: trigger=3, entry_point=true (entrance type)
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 3)],
		});
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
		// Occupy zone 1
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		runLocalZoneEngine(state, params1);

		// Target disappears (signal=0)
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
			now: now + 1,
		});
		const result2 = runLocalZoneEngine(state, params2);
		expect(result2.occupancy[1]).toBe(true); // still occupied (pending)

		// Past timeout (entrance timeout=5s)
		const params3 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
			now: now + 7,
		});
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
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 3)],
		});
		const result = runLocalZoneEngine(state, params);
		expect(result.occupancy[1]).toBe(true); // immediate
	});

	it("target reappears during pending -> back to occupied", () => {
		const now = Date.now() / 1000;
		// Occupy zone 1
		const params1 = makeDefaultParams({
			targets: [makeTarget(450, 450, 5)],
			now,
		});
		runLocalZoneEngine(state, params1);

		// Target gone -> pending
		const params2 = makeDefaultParams({
			targets: [makeTarget(450, 450, 0, "inactive")],
			now: now + 1,
		});
		const result2 = runLocalZoneEngine(state, params2);
		expect(result2.occupancy[1]).toBe(true); // pending

		// Target reappears with signal >= renew (2)
		const params3 = makeDefaultParams({
			targets: [makeTarget(450, 450, 2)],
			now: now + 2,
		});
		const result3 = runLocalZoneEngine(state, params3);
		expect(result3.occupancy[1]).toBe(true); // back to occupied
	});

	it("two targets in different zones -> both zones occupied", () => {
		const now = Date.now() / 1000;
		const params = makeDefaultParams({
			targets: [makeTarget(450, 450, 5), makeTarget(150, 150, 7)],
			now,
		});

		// First tick: zone 1 immediate (entry point), zone 0 gating
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
});
