/**
 * Zone-engine parity tests.
 *
 * SHARED-FIXTURE CONTRACT
 * `frontend/src/lib/zone-engine.ts` is a TS port of the firmware engine
 * (`firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`) and MUST produce
 * identical zone-state decisions. Both engines are driven by the SAME fixture:
 *
 *   firmware/lib/epp_zone_engine/tests/fixtures/parity_scenarios.json
 *
 *   - C++ side: firmware/lib/epp_zone_engine/tests/test_parity.cpp (doctest)
 *   - TS side:  the "Shared-fixture parity" describe below (vitest)
 *
 * EDIT THE FIXTURE → RUN BOTH SUITES:
 *   cd firmware/lib/epp_zone_engine/build && \
 *     cmake --build . --target epp_parity_tests && ./tests/epp_parity_tests
 *   cd frontend && npx vitest run src/__tests__/panel-zone-engine-parity.test.ts
 *
 * Scenarios that fail on one engine because of a known divergence are tagged
 * in the fixture (`known_divergence.ts` / `known_divergence.cpp`) and tracked
 * for Task 7.2. The TS side runs tagged scenarios via `it.fails` so the suite
 * turns loud the moment a divergence is fixed; the C++ side skips them with a
 * logged KNOWN-DIVERGENCE message. Fix the engine → delete the tag.
 *
 * Fixture schema: firmware/lib/epp_zone_engine/tests/fixtures/README.md.
 *
 * The describes after the fixture block are TS-engine specifics: panel-path
 * integration and internals (pendingSince, targetPrevXY, lastZone) that the
 * shared fixture cannot express. The fixture block is the parity source of
 * truth — do not add hand-written mirrors of fixture scenarios here.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	cellSetOverlay,
	cellSetZone,
	GRID_CELL_COUNT,
	GRID_CELL_MM,
	GRID_COLS,
	roomStartCol,
} from "../lib/grid.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import {
	createZoneEngineState,
	runLocalZoneEngine,
	type ZoneEngineParams,
} from "../lib/zone-engine.js";

// ---------------------------------------------------------------------------
// Shared fixture loading
// ---------------------------------------------------------------------------

interface FixtureTick {
	t: number;
	targets: { x: number; y: number; frames: number }[];
}

interface FixtureExpectedTarget {
	status: "active" | "pending" | "inactive";
	x?: number;
	y?: number;
	signal?: number;
}

interface FixtureExpected {
	zone_occupancy: Record<string, boolean>;
	targets?: FixtureExpectedTarget[];
}

interface FixtureScenario {
	known_divergence?: { ts?: string; cpp?: string };
	ticks: FixtureTick[];
	expected: FixtureExpected[];
}

interface ParityFixtures {
	grid: {
		room_cells: [number, number][];
		zone_cells: Record<string, [number, number][]>;
		overlay_entry_cells?: [number, number][];
		overlay_suppress_cells?: [number, number][];
	};
	zones: Record<
		string,
		{
			type: string;
			trigger: number;
			renew: number;
			timeout: number;
			handoff_timeout: number;
		}
	>;
	scenarios: Record<string, FixtureScenario>;
}

const FIXTURE_PATH = join(
	__dirname,
	"..",
	"..",
	"..",
	"firmware",
	"lib",
	"epp_zone_engine",
	"tests",
	"fixtures",
	"parity_scenarios.json",
);

const fixtures = JSON.parse(
	readFileSync(FIXTURE_PATH, "utf8"),
) as ParityFixtures;

// ---------------------------------------------------------------------------
// Fixture → engine-params interpretation layer.
//
// The reference interpretation is test_parity.cpp (build_grid / build_zones /
// build_window); each helper below is a line-for-line mirror. The single
// genuine translation is the coordinate frame:
//
//   C++ harness grid: origin (0,0), 20×20 cells of 300mm
//                     → col = floor(x / 300), row = floor(y / 300)
//   TS engine:        room-space mm, room centred horizontally
//                     → col = roomStartCol(roomWidth) + x / 300, row = y / 300
//
// So roomWidth/roomDepth are derived from the fixture's room cells and every
// fixture x is shifted left by startCol·300, making both harnesses resolve
// identical grid cells for identical fixture coordinates.
// ---------------------------------------------------------------------------

/** Mirror of test_parity.cpp build_grid(). */
function buildFixtureGrid(g: ParityFixtures["grid"]): Uint8Array {
	const grid = new Uint8Array(GRID_CELL_COUNT);
	for (const [col, row] of g.room_cells) {
		grid[row * GRID_COLS + col] = CELL_ROOM_BIT;
	}
	for (const [zidStr, cells] of Object.entries(g.zone_cells)) {
		const zid = Number(zidStr);
		for (const [col, row] of cells) {
			grid[row * GRID_COLS + col] = cellSetZone(CELL_ROOM_BIT, zid);
		}
	}
	for (const [col, row] of g.overlay_entry_cells ?? []) {
		const idx = row * GRID_COLS + col;
		grid[idx] = cellSetOverlay(grid[idx], CELL_OVERLAY_ENTRY);
	}
	for (const [col, row] of g.overlay_suppress_cells ?? []) {
		const idx = row * GRID_COLS + col;
		grid[idx] = cellSetOverlay(grid[idx], CELL_OVERLAY_SUPPRESS);
	}
	return grid;
}

/** Derive room dimensions + x shift from the fixture's room cells. */
function fixtureRoomGeometry(g: ParityFixtures["grid"]): {
	roomWidth: number;
	roomDepth: number;
	xOffsetMm: number;
} {
	let minCol = GRID_COLS;
	let maxCol = -1;
	let maxRow = -1;
	for (const [col, row] of g.room_cells) {
		if (col < minCol) minCol = col;
		if (col > maxCol) maxCol = col;
		if (row > maxRow) maxRow = row;
	}
	const roomWidth = (maxCol - minCol + 1) * GRID_CELL_MM;
	const roomDepth = (maxRow + 1) * GRID_CELL_MM;
	// Sanity check: the TS engine centres the room horizontally. If the
	// fixture grid ever places the room at different columns, every mapped
	// coordinate would silently shift one or more cells — fail loudly instead.
	if (roomStartCol(roomWidth) !== minCol) {
		throw new Error(
			`parity fixture grid places the room at col ${minCol}, but the TS ` +
				`engine centres a ${roomWidth}mm room at col ${roomStartCol(roomWidth)}` +
				" — fixture coordinates would silently shift; fix the fixture grid",
		);
	}
	return { roomWidth, roomDepth, xOffsetMm: minCol * GRID_CELL_MM };
}

/**
 * Mirror of test_parity.cpp build_zones(). The C++ harness ignores the
 * fixture's `type` field and applies the explicit thresholds to every zone;
 * mapping each zone to TS type "custom" gives the explicit values the same
 * authority (non-custom TS types would override them with type defaults).
 */
function buildFixtureZoneParams(
	zones: ParityFixtures["zones"],
): Pick<
	ZoneEngineParams,
	| "zoneConfigs"
	| "roomType"
	| "roomTrigger"
	| "roomRenew"
	| "roomTimeout"
	| "roomHandoffTimeout"
> {
	const z0 = zones["0"];
	if (!z0) throw new Error("parity fixture: zones must define zone 0");
	const zoneConfigs: (ZoneConfig | null)[] = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	for (const [zidStr, cfg] of Object.entries(zones)) {
		const zid = Number(zidStr);
		if (zid === 0) continue;
		zoneConfigs[zid - 1] = {
			name: `Zone ${zid}`,
			color: "#000000",
			type: "custom",
			trigger: cfg.trigger,
			renew: cfg.renew,
			timeout: cfg.timeout,
			handoff_timeout: cfg.handoff_timeout,
		};
	}
	return {
		zoneConfigs,
		roomType: "custom",
		roomTrigger: z0.trigger,
		roomRenew: z0.renew,
		roomTimeout: z0.timeout,
		roomHandoffTimeout: z0.handoff_timeout,
	};
}

/**
 * Mirror of test_parity.cpp build_window(): `frames > 0` means the sensor is
 * tracking (x/y in mm, signal = min(frames, 9) per frame_count_to_signal);
 * `frames == 0` sets active=false in the C++ harness, whose TS equivalent is
 * x/y null ("sensor not tracking"). Fixture x is shifted into the TS engine's
 * room-relative frame (see coordinate note above).
 */
function buildFixtureTargets(
	tick: FixtureTick,
	xOffsetMm: number,
): ZoneEngineParams["targets"] {
	return tick.targets.map((t) =>
		t.frames > 0
			? {
					x: t.x - xOffsetMm,
					y: t.y,
					signal: Math.min(t.frames, 9),
					status: "active",
				}
			: { x: null, y: null, signal: 0, status: "inactive" },
	);
}

/**
 * Structural guards — mirror of the REQUIRE guards in test_parity.cpp
 * run_scenario(). Called at collection time so a malformed scenario fails the
 * whole suite loudly (even for known-divergence scenarios, which `it.fails`
 * would otherwise mask).
 */
function validateScenario(name: string, s: FixtureScenario): void {
	const fail = (msg: string): never => {
		throw new Error(`parity fixture scenario "${name}": ${msg}`);
	};
	if (!Array.isArray(s.ticks) || s.ticks.length === 0) {
		fail('"ticks" must be a non-empty array');
	}
	if (!Array.isArray(s.expected)) fail('"expected" must be an array');
	if (s.ticks.length !== s.expected.length) {
		fail(
			`ticks (${s.ticks.length}) and expected (${s.expected.length}) lengths differ`,
		);
	}
	s.ticks.forEach((tick, i) => {
		if (typeof tick.t !== "number") fail(`tick ${i}: missing numeric "t"`);
		if (!Array.isArray(tick.targets)) {
			fail(`tick ${i}: missing "targets" array`);
		}
	});
	s.expected.forEach((exp, i) => {
		if (typeof exp.zone_occupancy !== "object" || exp.zone_occupancy === null) {
			fail(`expected ${i}: missing "zone_occupancy" object`);
		}
		exp.targets?.forEach((t, j) => {
			if (!["active", "pending", "inactive"].includes(t.status)) {
				fail(`expected ${i} target ${j}: invalid "status"`);
			}
		});
	});
}

describe("Shared-fixture parity (parity_scenarios.json drives both engines)", () => {
	const scenarioEntries = Object.entries(fixtures.scenarios);
	const geometry = fixtureRoomGeometry(fixtures.grid);
	const grid = buildFixtureGrid(fixtures.grid);
	const zoneParams = buildFixtureZoneParams(fixtures.zones);

	// Mirror of REQUIRE(!scenarios.empty()): an empty scenarios object would
	// otherwise register zero tests and report success while testing nothing.
	it("fixture provides at least one scenario", () => {
		expect(scenarioEntries.length).toBeGreaterThan(0);
	});

	for (const [name, scenario] of scenarioEntries) {
		validateScenario(name, scenario);

		// KNOWN-DIVERGENCE(7.2): scenarios tagged `known_divergence.ts` are
		// expected to fail on THIS engine until Task 7.2 fixes the divergence.
		// `it.fails` passes while they fail and fails loudly once they pass —
		// at which point Task 7.2 deletes the fixture tag.
		const tsTag = scenario.known_divergence?.ts;
		const itFn = tsTag ? it.fails : it;
		const title = tsTag ? `${name} [KNOWN-DIVERGENCE(7.2): ${tsTag}]` : name;

		itFn(title, () => {
			const state = createZoneEngineState();
			scenario.ticks.forEach((tick, i) => {
				const result = runLocalZoneEngine(state, {
					targets: buildFixtureTargets(tick, geometry.xOffsetMm),
					grid,
					roomWidth: geometry.roomWidth,
					roomDepth: geometry.roomDepth,
					...zoneParams,
					// Fixture-driven clock — never Date.now(), so timeout
					// scenarios are exact instead of wall-clock approximations.
					now: tick.t,
				});

				const expected = scenario.expected[i];
				for (const [zidStr, expOcc] of Object.entries(
					expected.zone_occupancy,
				)) {
					expect(
						result.occupancy[Number(zidStr)],
						`tick ${i}: zone ${zidStr} occupancy`,
					).toBe(expOcc);
				}

				expected.targets?.forEach((expT, j) => {
					// Mirror of REQUIRE(j < result.target_count).
					expect(
						result.targets.length,
						`tick ${i}: target ${j} missing from result`,
					).toBeGreaterThan(j);
					expect(result.targets[j].status, `tick ${i}: target ${j}`).toBe(
						expT.status,
					);
					// expT.x / expT.y / expT.signal are asserted by the C++ suite
					// only: the TS engine reports status alone (pending-position
					// display is a render concern handled via targetPrevXY).
				});
			});
		});
	}
});

// ---------------------------------------------------------------------------
// TS-engine specifics.
//
// Everything below exercises behaviour the shared fixture cannot express:
// the panel/TargetController integration path, engine-internal state
// (pendingSince, lastZone, targetPrevXY), inputs the C++ harness cannot
// produce (signal=0 while still tracked — frames=0 forces active=false
// there), and editor-only concerns (unsaved grid overrides, dot rendering).
// ---------------------------------------------------------------------------

/** Room: 1200×1200mm, centered in 20-col grid → cols 8-11, rows 0-3. */
function makeParityGrid(): Uint8Array {
	const grid = new Uint8Array(GRID_CELL_COUNT);
	for (let r = 0; r < 4; r++) {
		for (let c = 8; c < 12; c++) {
			grid[r * GRID_COLS + c] = CELL_ROOM_BIT; // zone 0 (room)
		}
	}
	// Zone 1 on cell (col=9, row=1) with entry overlay
	grid[1 * GRID_COLS + 9] = cellSetOverlay(
		cellSetZone(CELL_ROOM_BIT, 1),
		CELL_OVERLAY_ENTRY,
	);
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
}

function makeTarget(
	x: number,
	y: number,
	signal: number,
	status: TargetStatus = "active",
): Target {
	return { x, y, raw_x: x, raw_y: y, status, signal };
}

function createParityPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: async () => ({}),
		connection: { subscribeMessage: async () => () => {} },
	};
	const a = el as any;
	a._grid = makeParityGrid();
	// Length-8 zone slots tuple; slot 0 = Zone0Config, slot 1 = named zone 1
	// configured as custom (trigger=3, renew=2, timeout=5, handoff=1).
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		{
			name: "Zone 1",
			color: "#ff0000",
			type: "custom",
			trigger: 3,
			renew: 2,
			timeout: 5,
			handoff_timeout: 1,
		},
		null,
		null,
		null,
		null,
		null,
		null,
	];
	a._roomWidth = 1200;
	a._roomDepth = 1200;
	a._targets = [];
	a._loading = false;
	return el;
}

describe("TS-engine specifics: zone occupancy via panel path", () => {
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

	it("target in zone 1 (custom) with signal >= trigger → zone 1 occupied", () => {
		// Custom zone: trigger=3
		a._targets = [makeTarget(450, 450, 3)];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[1]).toBe(true);
		expect(occ[0]).toBe(false);
	});

	it("target in zone 0 with signal < trigger → zone 0 stays clear", () => {
		// Zone 0 (no overlay): trigger=5, signal=4 → below trigger
		a._targets = [makeTarget(150, 150, 4)];
		const occ = a._runLocalZoneEngine().occupancy;
		expect(occ[0]).toBe(false);
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

	it("target in overlay-entry zone bypasses gating", () => {
		// Custom zone 1: trigger=3, cell has overlay entry bit
		// No previous position but overlay entry → no gating required
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

		// Fast-forward past timeout (custom zone timeout=5s)
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
		// Target 0 in zone 1 (custom, trigger=3, overlay entry — no gating)
		// Target 1 in zone 0 (room, trigger=5, gated threshold = min(5+2,8) = 7)
		a._targets = [makeTarget(450, 450, 5), makeTarget(150, 150, 7)];

		// First tick: zone 1 immediate (overlay entry), zone 0 gating (count=1)
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

describe("TS-engine specifics: per-target status via panel path", () => {
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
		// A single active tick both occupies the zone AND registers the
		// target in confirmedTargets (first-tick confirm — parity with the
		// firmware's unconditional `rt.confirmed_targets |= (1 << i)`).
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // zone occupied + target in confirmedTargets

		// Target disappears (sensor stops tracking → x/y null)
		a._targets = [{ x: null, y: null, status: "inactive" as const, signal: 0 }];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("pending");
		// Position/signal are display concerns handled by _renderTargetDots
	});

	it("zone clears after timeout → status=inactive", () => {
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // zone occupied + target in confirmedTargets

		// Target disappears
		a._targets = [{ x: null, y: null, status: "inactive" as const, signal: 0 }];
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
		a._runLocalZoneEngine(); // zone occupied + target in confirmedTargets

		// Target moves outside room but still tracked with signal
		a._targets = [makeTarget(-900, 150, 9)];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("pending");
	});

	it("target reappears during pending → back to active", () => {
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // zone occupied + target in confirmedTargets

		// Target disappears → zone 1 pending
		a._targets = [{ x: null, y: null, status: "inactive" as const, signal: 0 }];
		const r2 = a._runLocalZoneEngine();
		expect(r2.targets[0].status).toBe("pending");

		// Target reappears with signal >= renew (2) → back to active
		a._targets = [makeTarget(450, 450, 3)];
		const r3 = a._runLocalZoneEngine();
		expect(r3.targets[0].status).toBe("active");
	});

	it("two targets, one leaves → mixed active/pending states", () => {
		// T0 in zone 1 (overlay entry, immediate), T1 in zone 0 (needs gating)
		a._targets = [makeTarget(450, 450, 5), makeTarget(150, 150, 9)];

		// Tick 1: zone 1 confirmed immediately; zone 0 gating (count=1)
		a._runLocalZoneEngine();

		// Tick 2: zone 0 continuous → both zones occupied and confirmedTargets populated
		a._runLocalZoneEngine();

		// T1 disappears (sensor stops tracking), T0 stays active
		a._targets = [
			makeTarget(450, 450, 5),
			{ x: null, y: null, status: "inactive" as const, signal: 0 },
		];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("active");
		expect(result.targets[1].status).toBe("pending");
	});

	it("tracking outside room then sensor stops → pending throughout", () => {
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // zone occupied + target in confirmedTargets

		// Target moves outside room but still tracked with signal →
		// immediately pending at last in-room position (not active)
		a._targets = [makeTarget(-900, 150, 9)];
		const r2 = a._runLocalZoneEngine();
		expect(r2.targets[0].status).toBe("pending");

		// Sensor stops tracking (x/y null) → still pending at same position
		a._targets = [{ x: null, y: null, status: "inactive" as const, signal: 0 }];
		const r3 = a._runLocalZoneEngine();
		expect(r3.targets[0].status).toBe("pending");
	});

	it("signal=0 but tracking (x/y non-null) in pending zone → status=pending", () => {
		// Not expressible in the shared fixture: the C++ harness derives
		// active from frames, so frames=0 always means "not tracking" there.
		// Occupy zone 1 first so zone has state.
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // zone occupied + target in confirmedTargets

		// Same position but signal=0: the firmware-equivalent of
		// tw.active=false — tracking clears, the zone goes pending, and the
		// target reports pending from the pending-zone membership check.
		a._targets = [makeTarget(450, 450, 0)];
		const result = a._runLocalZoneEngine();
		expect(result.targets[0].status).toBe("pending");
	});

	it("handoff: target moves from zone 1 to zone 0, zone 1 goes pending", () => {
		// Establish zone 1 occupied (overlay entry → immediate, no gating needed).
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine(); // zone 1 occupied + target in confirmedTargets

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

	it("overlay-exit handoff: lastZone is consumed and does not re-fire", () => {
		// After the handoff fires, lastZone[i] should be cleared so subsequent
		// empty-target ticks don't keep accelerating the same zone.
		// (Occupancy-level handoff timing is covered by the shared fixture's
		// test_overlay_exit_handoff / test_overlay_exit_handoff_suppress_cell;
		// this checks the engine-internal consume gating.)
		a._targets = [makeTarget(450, 450, 5)];
		a._runLocalZoneEngine();
		a._runLocalZoneEngine();

		a._targets = [];
		a._runLocalZoneEngine(); // handoff fires here, pendingSince accelerated
		const st1 = a._zoneEngineState.localZoneState.get(1);
		const firstPendingSince = st1.pendingSince;

		// Subsequent empty tick (still no targets): pendingSince must NOT
		// be re-accelerated to a newer/larger value.
		a._runLocalZoneEngine();
		const st2 = a._zoneEngineState.localZoneState.get(1);
		expect(st2.pendingSince).toBe(firstPendingSince);
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
	 * Run the zone engine and apply the status overwrite to _targets,
	 * mirroring what the editor render path does in the real component.
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
		let pos =
			t.x != null
				? mapTargetToGridCell(t.x, t.y, a._roomWidth, a._roomDepth)
				: null;
		const onGrid =
			pos &&
			pos.col >= minCol &&
			pos.col <= minCol + visCols &&
			pos.row >= minRow &&
			pos.row <= minRow + visRows;
		if (t.status === "pending" && !onGrid && prevXY) {
			pos = mapTargetToGridCell(prevXY.x, prevXY.y, a._roomWidth, a._roomDepth);
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
		a._targets = [{ x: null, y: null, status: "inactive" as const, signal: 0 }];
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
		// Target at (450, 450) → cell (9,1) = zone 1 (custom) in parity grid.
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
