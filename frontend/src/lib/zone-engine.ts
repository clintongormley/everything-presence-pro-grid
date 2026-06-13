import { mapTargetToGridCell } from "./coordinates.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	cellIsInside,
	cellOverlay,
	cellZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
} from "./grid.js";
import { getZoneThresholds, type ZoneConfig } from "./zone-defaults.js";

// ---- Interfaces ----

export interface ZoneState {
	occupied: boolean;
	pendingSince: number | null;
	confirmedTargets: Set<number>;
}

export interface ZoneEngineState {
	localZoneState: Map<number, ZoneState>;
	targetPrev: ({ col: number; row: number } | null)[];
	targetGateCount: number[];
	targetPrevXY: ({ x: number; y: number } | null)[];
	// Last in-room zone per target; persists across ticks regardless of how
	// many targets the next tick happens to contain. Mirrors the firmware's
	// `target_last_zone_` semantics so the overlay-exit handoff (Step 2b)
	// can fire even when the target list shrinks to empty.
	lastZone: (number | null)[];
	// Sticky flag: target's last in-room cell carried (or neighboured) an
	// entry overlay. Cleared together with lastZone after the handoff fires.
	lastOnOverlay: boolean[];
	// Cell index each target was dismissed at, or -1. Mirrors firmware
	// dismissed_cell_: while the target stays on its dismissed cell it is
	// ignored; moving to a different cell clears the dismissal.
	dismissedCells: number[];
	// Stuck-target reference: position + first-seen timestamp of a target
	// dwelling at bit-identical coordinates. Mirrors firmware stuck_ref_x_/
	// stuck_ref_y_/stuck_since_s_/stuck_has_ref_ (null = no reference).
	stuckRef: ({ x: number; y: number; since: number } | null)[];
	staticState: "active" | "pending" | "inactive";
	motionState: "active" | "pending" | "inactive";
	staticPendingSince: number | null;
	motionPendingSince: number | null;
	sensorsEverActive: boolean;
}

export interface ZoneEngineParams {
	targets: {
		x: number | null;
		y: number | null;
		signal: number;
		status: string;
		// Sticky raw-frame entry-overlay flag from the OverlayTracker (mirror of
		// the firmware component's `zone_input.targets[i].on_overlay`). The
		// engine ORs this with "current median cell is entry overlay" — see the
		// lastOnOverlay assignment below and firmware epp_zone_engine.cpp:300.
		onOverlay?: boolean;
	}[];
	grid: Uint8Array;
	roomWidth: number;
	roomDepth: number;
	zoneConfigs: (ZoneConfig | null)[];
	roomType: ZoneConfig["type"];
	roomTrigger: number;
	roomRenew: number;
	roomTimeout: number;
	roomHandoffTimeout: number;
	staticPresence?: boolean;
	motionPresence?: boolean;
	staticTimeout?: number; // seconds
	motionTimeout?: number; // seconds
	// Stuck-target auto-dismiss timeout in seconds; 0 (default) disables.
	// Mirrors firmware set_stuck_target_timeout.
	stuckTargetTimeout?: number;
	now?: number; // seconds (defaults to Date.now() / 1000)
}

export interface ZoneEngineResult {
	occupancy: Record<number, boolean>;
	targets: { status: "active" | "pending" | "inactive" }[];
	staticState: "active" | "pending" | "inactive";
	motionState: "active" | "pending" | "inactive";
	sensorOccupancy: boolean;
	mmwave: boolean;
}

// ---- Factory ----

export function createZoneEngineState(): ZoneEngineState {
	return {
		localZoneState: new Map(),
		targetPrev: [null, null, null],
		targetGateCount: [0, 0, 0],
		targetPrevXY: [null, null, null],
		lastZone: [null, null, null],
		lastOnOverlay: [false, false, false],
		dismissedCells: [-1, -1, -1],
		stuckRef: [null, null, null],
		staticState: "inactive",
		motionState: "inactive",
		staticPendingSince: null,
		motionPendingSince: null,
		sensorsEverActive: false,
	};
}

// ---- Engine ----

const MAX_MOVEMENT_CELLS = 5;
const MAX_TARGETS = 3;

/**
 * Dismiss a target at a cell — mirror of firmware ZoneEngine::dismiss_target.
 * Drops only THIS target's confirmation bit (other targets confirmed in the
 * same zone keep their evidence); when that was the last evidence, the zone
 * collapses to CLEAR immediately (no PENDING_CLEAR — a dismiss is an explicit
 * action, not a sensor-driven transition). Also used by the engine's own
 * stuck-target auto-dismiss.
 */
export function dismissTarget(
	state: ZoneEngineState,
	targetIndex: number,
	cellIndex: number,
	grid: Uint8Array,
): void {
	if (targetIndex < 0 || targetIndex >= MAX_TARGETS) return;
	state.dismissedCells[targetIndex] = cellIndex;

	if (
		cellIndex >= 0 &&
		cellIndex < GRID_CELL_COUNT &&
		cellIsInside(grid[cellIndex])
	) {
		const zid = cellZone(grid[cellIndex]);
		// localZoneState only ever holds configured zones — the lookup is the
		// TS equivalent of firmware's find_zone_index(zone_id) >= 0 check.
		const st = state.localZoneState.get(zid);
		if (st) {
			st.confirmedTargets.delete(targetIndex);
			if (st.confirmedTargets.size === 0) {
				st.occupied = false;
				st.pendingSince = null;
			}
		}
	}

	// Reset this target's tracking only.
	state.targetPrev[targetIndex] = null;
	state.targetGateCount[targetIndex] = 0;
	state.lastOnOverlay[targetIndex] = false;
	state.lastZone[targetIndex] = null;
	state.stuckRef[targetIndex] = null;
}

/**
 * Mirror of firmware ZoneEngine::set_grid's per-target reset: prev-cell
 * coords, gating, overlay sticky, lastZone, dismissals and stuck refs are
 * all OLD-grid-relative and must not carry across a grid edit. Zone
 * occupancy state is intentionally preserved (only a zone-config change
 * resets it — see resetForZoneConfigChange).
 */
export function resetForGridChange(state: ZoneEngineState): void {
	for (let i = 0; i < MAX_TARGETS; i++) {
		state.targetPrev[i] = null;
		state.targetPrevXY[i] = null;
		state.targetGateCount[i] = 0;
		state.lastOnOverlay[i] = false;
		state.lastZone[i] = null;
		state.dismissedCells[i] = -1;
		state.stuckRef[i] = null;
	}
}

/**
 * Mirror of firmware ZoneEngine::set_zones: everything set_grid resets,
 * PLUS every zone's runtime back to CLEAR and the sensor-presence state
 * machine back to its initial state.
 */
export function resetForZoneConfigChange(state: ZoneEngineState): void {
	resetForGridChange(state);
	state.localZoneState.clear();
	state.staticState = "inactive";
	state.motionState = "inactive";
	state.staticPendingSince = null;
	state.motionPendingSince = null;
	state.sensorsEverActive = false;
}

/**
 * Mirror of firmware `find_zone_index(zid) >= 0`: zone 0 (room boundary) is
 * always configured; named zones 1-7 are configured iff their slot holds a
 * config. Painted-but-unconfigured zone ids are treated as disabled — they
 * can never confirm or occupy (firmware `find_zone_index` returns -1).
 */
function isZoneConfigured(
	zid: number,
	zoneConfigs: (ZoneConfig | null)[],
): boolean {
	if (zid === 0) return true;
	return zid >= 1 && zid <= zoneConfigs.length && zoneConfigs[zid - 1] != null;
}

function getOrCreateZoneState(state: ZoneEngineState, zid: number): ZoneState {
	let st = state.localZoneState.get(zid);
	if (!st) {
		st = {
			occupied: false,
			pendingSince: null,
			confirmedTargets: new Set(),
		};
		state.localZoneState.set(zid, st);
	}
	return st;
}

/**
 * Per-tick mutable context threaded through the firmware-named step functions.
 * The firmware (epp_zone_engine.cpp) keeps these as either member state (the
 * `state` object here) or function-local arrays inside `ZoneEngine::tick`; this
 * struct is the TS equivalent of those tick-locals, so each step helper reads
 * and writes the same fields the firmware step does.
 */
interface TickContext {
	state: ZoneEngineState;
	params: ZoneEngineParams;
	now: number;
	zoneConfirmed: Map<number, boolean>;
	targetSignal: Map<number, number>;
	targetZonePrev: (number | null)[];
	targetZoneCurr: (number | null)[];
	// Mirror of firmware target_active[]: sensor is tracking AND produced
	// frames this window. Pending targets echoed by the backend (x/y non-null
	// but signal=0) correspond to firmware tw.active=false.
	targetActive: boolean[];
	occupancy: Record<number, boolean>;
}

/**
 * runLocalZoneEngine — TS mirror of `epp::ZoneEngine::tick`
 * (firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp). The body is split
 * into per-step helpers named after the firmware's Step comments so future
 * parity audits diff structurally. Firmware step → TS helper map:
 *
 *   Step 1   (cpp ~216-444): per-target evaluation       → stepPerTargetEval
 *   Step 1b  (cpp ~447-485): per-target transition log    → (firmware logging
 *                                                            only; no TS mirror)
 *   Step 2   (cpp ~488-509): handoff detection            → stepHandoffDetection
 *   Step 2b  (cpp ~512-548): overlay exit handoff         → stepOverlayExitHandoff
 *   Step 3   (cpp ~551-590): per-zone state machine       → stepZoneStateMachine
 *            (cpp set_zones reset of stale zones folded in here in TS)
 *   Step 4   (cpp ~596-651): per-target results           → stepTargetResults
 *   Step 5   (cpp ~654-665): cleanup confirmed bits        → stepCleanupConfirmed
 *   Step 5b  (cpp ~668-715): sensor presence state machine → stepSensorPresence
 *   Step 5c  (cpp ~718-747): force-clear pending zones     → stepForceClear
 *   Step 5d  (cpp ~766-796): compute occupancy + mmwave    → stepComputeOccupancy
 *
 * This is a PURE structural refactor: thresholds, ordering and conditions are
 * unchanged. The parity suites (panel-zone-engine-parity.test.ts and
 * test_parity.cpp) are the oracle.
 */
export function runLocalZoneEngine(
	state: ZoneEngineState,
	params: ZoneEngineParams,
): ZoneEngineResult {
	const ctx: TickContext = {
		state,
		params,
		now: params.now ?? Date.now() / 1000,
		zoneConfirmed: new Map(),
		targetSignal: new Map(),
		targetZonePrev: [null, null, null],
		targetZoneCurr: [null, null, null],
		targetActive: [false, false, false],
		occupancy: {},
	};

	stepPerTargetEval(ctx);
	stepHandoffDetection(ctx);
	stepOverlayExitHandoff(ctx);
	stepZoneStateMachine(ctx);
	const targetResults = stepTargetResults(ctx);
	stepCleanupConfirmed(ctx);
	stepSensorPresence(ctx);
	stepForceClear(ctx);
	const { sensorOccupancy, mmwave } = stepComputeOccupancy(ctx);

	return {
		occupancy: ctx.occupancy,
		targets: targetResults,
		staticState: state.staticState,
		motionState: state.motionState,
		sensorOccupancy,
		mmwave,
	};
}

/**
 * Step 1 — Per-target evaluation. Mirror of firmware epp_zone_engine.cpp
 * ~216-444 (Python lines 510-604). For each target slot: clear tracking when
 * gone, map to a grid cell, apply dismiss/stuck/suppress gates, then run the
 * confirm logic (instant entry, gating, renew) against the zone thresholds.
 */
function stepPerTargetEval(ctx: TickContext): void {
	const { state, params, now } = ctx;
	const { zoneConfirmed, targetSignal, targetZonePrev, targetZoneCurr } = ctx;
	const targetActive = ctx.targetActive;

	for (let i = 0; i < MAX_TARGETS; i++) {
		const t = i < params.targets.length ? params.targets[i] : null;

		// Mirror firmware `!tw.active` (target gone): the sensor isn't
		// tracking (x/y null), the slot is absent from this frame, or the
		// rolling window holds no active frames (signal<=0 — the backend
		// echoes pending targets with a position but signal 0). All three
		// must clear tracking state exactly like the firmware does, so a
		// reappearing target can't inherit stale continuity/gating.
		if (!t || t.x == null || t.y == null || t.signal <= 0) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			state.stuckRef[i] = null;
			continue;
		}

		targetActive[i] = true;
		const signal = t.signal;
		targetSignal.set(i, signal);

		const pos = mapTargetToGridCell(
			t.x,
			t.y,
			params.roomWidth,
			params.roomDepth,
		);
		if (!pos) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			state.stuckRef[i] = null;
			continue;
		}
		const col = Math.floor(pos.col);
		const row = Math.floor(pos.row);
		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			state.stuckRef[i] = null;
			continue;
		}
		const idx = row * GRID_COLS + col;
		const cellVal = params.grid[idx];
		if (!cellIsInside(cellVal)) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			state.stuckRef[i] = null;
			continue;
		}

		// Check if this target is dismissed at this cell (firmware checks
		// this right after the in-room test, before suppress/stuck).
		if (state.dismissedCells[i] === idx) {
			// Target still at dismissed location — skip
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		if (state.dismissedCells[i] >= 0) {
			// Target moved to a different cell — clear dismiss
			state.dismissedCells[i] = -1;
		}

		// Stuck-target detection: dwell at exactly the same (x, y) for
		// stuckTargetTimeout seconds → auto-dismiss via the same path as a
		// manual click-dismiss. 0 disables. Bit-exact comparison is
		// intentional (mirrors firmware): the LD2450 produces deterministic
		// per-tick coordinates, and any 1mm jitter from a real human breaks
		// the streak.
		const stuckTimeout = params.stuckTargetTimeout ?? 0;
		if (stuckTimeout > 0) {
			const ref = state.stuckRef[i];
			if (ref !== null && t.x === ref.x && t.y === ref.y) {
				if (now - ref.since >= stuckTimeout) {
					dismissTarget(state, i, idx, params.grid);
					// dismissTarget reset prev/gate/overlay/lastZone/stuckRef.
					// Skip remaining per-target work — the dismiss collapses
					// the zone.
					continue;
				}
			} else {
				state.stuckRef[i] = { x: t.x, y: t.y, since: now };
			}
		}

		// Interference suppress: skip this cell entirely
		const overlay = cellOverlay(cellVal);
		if (overlay === CELL_OVERLAY_SUPPRESS) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const hasInterference = overlay === CELL_OVERLAY_INTERFERENCE;

		const zid = cellZone(cellVal);
		targetZoneCurr[i] = zid;
		// Mirror firmware target_last_zone_: persist last in-room zone across
		// ticks. Used by overlay-exit handoff regardless of how the next tick's
		// target list looks.
		state.lastZone[i] = zid;
		// Mirror firmware epp_zone_engine.cpp:300 exactly:
		//   target_overlay_sticky_[i] = tw.on_overlay || (overlay == ENTRY)
		// The raw-frame sticky flag (t.onOverlay, from the OverlayTracker /
		// firmware component) is ORed with "current median cell is an entry
		// overlay". The firmware does NOT scan a 3×3 neighbourhood — that scan
		// was a TS-only divergence (Task 7.2, item 10) and is now removed.
		state.lastOnOverlay[i] =
			(t.onOverlay ?? false) || overlay === CELL_OVERLAY_ENTRY;

		const prev = state.targetPrev[i];
		if (prev !== null) {
			const prevIdx = prev.row * GRID_COLS + prev.col;
			if (
				prevIdx >= 0 &&
				prevIdx < GRID_CELL_COUNT &&
				cellIsInside(params.grid[prevIdx])
			) {
				targetZonePrev[i] = cellZone(params.grid[prevIdx]);
			}
		}

		// Record last in-room position (room-space mm) for pending display
		state.targetPrevXY[i] = { x: t.x, y: t.y };

		let continuous = false;
		if (prev !== null) {
			const dist = Math.max(Math.abs(col - prev.col), Math.abs(row - prev.row));
			continuous = dist <= MAX_MOVEMENT_CELLS;
		}

		// Mirror firmware's `find_zone_index(zone_id)` gate: only configured
		// zones run the confirm logic; painted-but-unconfigured zones still
		// record position for continuity but can never confirm.
		if (!isZoneConfigured(zid, params.zoneConfigs)) {
			state.targetPrev[i] = { col, row };
			continue;
		}

		const thresholds = getZoneThresholds(
			zid,
			params.zoneConfigs,
			params.roomType,
			params.roomTrigger,
			params.roomRenew,
			params.roomTimeout,
			params.roomHandoffTimeout,
		);
		const { trigger, renew } = thresholds;

		// Get-or-create the zone state HERE (not lazily in the Step-3 state
		// machine): a target confirmed on its very first tick must land in
		// confirmedTargets, exactly like the firmware's unconditional
		// `rt.confirmed_targets |= (1 << i)`.
		const st = getOrCreateZoneState(state, zid);
		const isClear = !st.occupied;

		// No first appearance: targets cannot originate in interference zones.
		// They must be handed off from a clean zone (continuity required).
		// Only applies when zone is CLEAR — once occupied, targets can be re-confirmed.
		if (hasInterference && !continuous && isClear) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		// Interference: renew requires signal 9 to prevent fans sustaining occupancy
		const effectiveRenew = hasInterference ? 9 : renew;

		let baseTrigger = isClear ? trigger : effectiveRenew;
		// Mirror firmware epp_zone_engine.cpp:379 — read the engine's sticky
		// overlay bit (just assigned to state.lastOnOverlay[i] above), not a
		// freshly recomputed value, so the gating and exit-handoff paths agree.
		const onEntryOverlay = state.lastOnOverlay[i];
		const needsGating = !onEntryOverlay && !continuous;
		// Instant entry suppressed when target cell carries interference —
		// overlay on a neighbour must not negate the raised threshold.
		if (onEntryOverlay && isClear && !hasInterference) {
			baseTrigger = 1;
		}

		if (needsGating && isClear) {
			// Gating: raise threshold and require consecutive qualifying ticks.
			// At 10Hz tick rate, 2 ticks = ~200ms. If false positives become
			// a problem: increase gate count, use wall-clock gating, or raise offset.
			const gatedThresh = Math.min(baseTrigger + 2, 8);
			if (signal >= gatedThresh) {
				state.targetGateCount[i]++;
				if (state.targetGateCount[i] >= 2) {
					zoneConfirmed.set(zid, true);
					st.confirmedTargets.add(i);
					state.targetPrev[i] = { col, row };
					state.targetGateCount[i] = 0;
				} else {
					state.targetPrev[i] = { col, row };
				}
			} else {
				state.targetPrev[i] = null;
				state.targetGateCount[i] = 0;
			}
		} else {
			if (signal >= baseTrigger) {
				zoneConfirmed.set(zid, true);
				st.confirmedTargets.add(i);
				state.targetPrev[i] = { col, row };
				state.targetGateCount[i] = 0;
			} else {
				state.targetPrev[i] = { col, row };
			}
		}
	}
}

/**
 * Step 2 — Handoff detection. Mirror of firmware epp_zone_engine.cpp ~488-509
 * (Python lines 606-632). When a target moves between zones, drop its bit from
 * the source zone; if that emptied an OCCUPIED zone, accelerate its pending
 * timeout to handoff_timeout.
 */
function stepHandoffDetection(ctx: TickContext): void {
	const { state, params, now, targetZonePrev, targetZoneCurr } = ctx;

	for (let i = 0; i < MAX_TARGETS; i++) {
		const prevZid = targetZonePrev[i];
		const currZid = targetZoneCurr[i];
		if (prevZid === null || currZid === null || prevZid === currZid) continue;

		// Mirror firmware `if (src_zi >= 0)`: unconfigured source zones have
		// no runtime to hand off from.
		if (!isZoneConfigured(prevZid, params.zoneConfigs)) continue;
		const srcSt = state.localZoneState.get(prevZid);
		if (!srcSt) continue;
		srcSt.confirmedTargets.delete(i);
		if (
			srcSt.confirmedTargets.size === 0 &&
			srcSt.occupied &&
			srcSt.pendingSince === null
		) {
			const handoffThresholds = getZoneThresholds(
				prevZid,
				params.zoneConfigs,
				params.roomType,
				params.roomTrigger,
				params.roomRenew,
				params.roomTimeout,
				params.roomHandoffTimeout,
			);
			const { timeout, handoffTimeout } = handoffThresholds;
			srcSt.pendingSince = now - (timeout - handoffTimeout);
		}
	}
}

/**
 * Step 2b — Overlay exit handoff. Mirror of firmware epp_zone_engine.cpp
 * ~512-548. When the target disappears or leaves the room from an overlay
 * cell, accelerate the source zone's pending timeout to the configured
 * handoff_timeout. Iterates MAX_TARGETS (not just the current targets list)
 * and reads state.lastZone/lastOnOverlay so the handoff fires even when the
 * backend's target list shrinks.
 */
function stepOverlayExitHandoff(ctx: TickContext): void {
	const { state, params, now, targetZoneCurr } = ctx;

	for (let i = 0; i < MAX_TARGETS; i++) {
		const t = i < params.targets.length ? params.targets[i] : null;
		const isGone = !t || t.x == null || t.y == null;
		// Mirror firmware Step 2b: an active target counts as "left room"
		// whenever it failed to land in a zone this tick. That covers
		// out-of-grid, non-room cells, AND the CELL_OVERLAY_SUPPRESS
		// early-continue (which doesn't set targetZoneCurr).
		const leftRoom = !isGone && targetZoneCurr[i] === null;
		const lastZid = state.lastZone[i];
		if ((isGone || leftRoom) && state.lastOnOverlay[i] && lastZid !== null) {
			// Mirror firmware `find_zone_index(prev_zid) >= 0`: an
			// unconfigured zone has no runtime to accelerate — and the
			// handoff state is consumed ONLY when the lookup succeeds, so a
			// disabled zone never silently swallows it.
			if (isZoneConfigured(lastZid, params.zoneConfigs)) {
				const st = state.localZoneState.get(lastZid);
				if (st?.occupied) {
					// Check if this target is the only confirmed target remaining
					let remaining = 0;
					for (const tid of st.confirmedTargets) {
						if (tid !== i) remaining++;
					}
					if (remaining === 0) {
						const th = getZoneThresholds(
							lastZid,
							params.zoneConfigs,
							params.roomType,
							params.roomTrigger,
							params.roomRenew,
							params.roomTimeout,
							params.roomHandoffTimeout,
						);
						const accel = now - (th.timeout - th.handoffTimeout);
						if (st.pendingSince === null) {
							st.pendingSince = accel;
						} else if (st.pendingSince > accel) {
							st.pendingSince = accel;
						}
					}
				}
				// Consume so subsequent ticks don't re-fire the same handoff.
				state.lastZone[i] = null;
				state.lastOnOverlay[i] = false;
			}
		}
	}
}

/**
 * Step 3 — Per-zone state machine. Mirror of firmware epp_zone_engine.cpp
 * ~551-590 (Python lines 635-659). Advances each configured zone's
 * CLEAR/OCCUPIED/PENDING_CLEAR state from the per-tick `zoneConfirmed` map and
 * writes `ctx.occupancy`. The trailing stale-zone purge folds in firmware
 * set_zones' reset of any zone whose grid cells or config disappeared.
 */
function stepZoneStateMachine(ctx: TickContext): void {
	const { state, params, now, zoneConfirmed } = ctx;
	const occupancy = ctx.occupancy;
	const allZoneIds = new Set<number>();
	for (let i = 0; i < params.grid.length; i++) {
		if (cellIsInside(params.grid[i])) allZoneIds.add(cellZone(params.grid[i]));
	}
	for (const zid of allZoneIds) {
		// Painted-but-unconfigured zone ids are disabled (firmware
		// find_zone_index returns -1): no state machine, no zone state —
		// report unoccupied, mirroring the firmware's zeroed zone_occupancy.
		if (!isZoneConfigured(zid, params.zoneConfigs)) {
			occupancy[zid] = false;
			continue;
		}
		const st = getOrCreateZoneState(state, zid);
		const zoneThresholds = getZoneThresholds(
			zid,
			params.zoneConfigs,
			params.roomType,
			params.roomTrigger,
			params.roomRenew,
			params.roomTimeout,
			params.roomHandoffTimeout,
		);
		const { timeout } = zoneThresholds;
		const confirmed = zoneConfirmed.get(zid) ?? false;

		if (!st.occupied) {
			if (confirmed) {
				st.occupied = true;
				st.pendingSince = null;
			}
		} else if (st.pendingSince === null) {
			if (!confirmed) {
				st.pendingSince = now;
			}
		} else {
			if (confirmed) {
				st.pendingSince = null;
			} else {
				if (now - st.pendingSince >= timeout) {
					st.occupied = false;
					st.pendingSince = null;
					st.confirmedTargets.clear();
				}
			}
		}
		occupancy[zid] = st.occupied;
	}

	// Clear stale zones no longer in the grid (or no longer configured —
	// firmware set_zones resets every ZoneRuntime, so a zone whose config
	// disappears must not keep occupancy state around).
	for (const zid of state.localZoneState.keys()) {
		if (!allZoneIds.has(zid) || !isZoneConfigured(zid, params.zoneConfigs)) {
			state.localZoneState.delete(zid);
		}
	}
}

/**
 * Step 4 — Per-target results. Mirror of firmware epp_zone_engine.cpp ~596-651
 * (Python lines 661-701). Builds the per-target active/pending/inactive status.
 * Runs BEFORE Step-5 cleanup and Step-5c force-clear, exactly like the
 * firmware: on a force-clear tick the target must still publish its pending
 * status — the cleared zone only affects the NEXT tick's results. Only status
 * is needed; position for pending display is handled by targetPrevXY in the
 * rendering layer.
 */
function stepTargetResults(
	ctx: TickContext,
): { status: "active" | "pending" | "inactive" }[] {
	const { state, params, targetSignal, targetZoneCurr, targetActive } = ctx;
	const targetResults: { status: "active" | "pending" | "inactive" }[] = [];
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const sig = targetSignal.get(i) ?? 0;
		const inRoom = targetZoneCurr[i] !== null;
		if (targetActive[i] && sig > 0 && inRoom) {
			targetResults.push({ status: "active" });
		} else {
			let isPending = false;
			if (!targetActive[i] || !inRoom) {
				for (const [, st] of state.localZoneState) {
					if (
						st.occupied &&
						st.pendingSince !== null &&
						st.confirmedTargets.has(i)
					) {
						isPending = true;
						break;
					}
				}
			}
			targetResults.push({ status: isPending ? "pending" : "inactive" });
		}
	}
	return targetResults;
}

/**
 * Step 5 — Cleanup. Mirror of firmware epp_zone_engine.cpp ~654-665 (Python
 * lines 703-710). Removes inactive targets from confirmed_targets of
 * non-PENDING zones. Iterates ALL slots: an absent/inactive slot must release
 * its confirmation bits exactly like firmware `!window.targets[i].active`.
 */
function stepCleanupConfirmed(ctx: TickContext): void {
	const { state, targetActive } = ctx;

	for (let i = 0; i < MAX_TARGETS; i++) {
		if (!targetActive[i]) {
			for (const st of state.localZoneState.values()) {
				if (st.pendingSince === null) {
					st.confirmedTargets.delete(i);
				}
			}
		}
	}
}

/**
 * Step 5b — Sensor presence state machine. Mirror of firmware
 * epp_zone_engine.cpp ~668-715. Advances the static and motion PIR presence
 * states (ACTIVE/PENDING/INACTIVE) from the per-tick sensor inputs.
 */
function stepSensorPresence(ctx: TickContext): void {
	const { state, params, now } = ctx;

	const staticOn = params.staticPresence ?? false;
	const motionOn = params.motionPresence ?? false;
	const staticTimeout = params.staticTimeout ?? 10;
	const motionTimeout = params.motionTimeout ?? 10;

	if (staticOn) {
		state.staticState = "active";
		state.staticPendingSince = null;
		state.sensorsEverActive = true;
	} else if (state.staticState === "active") {
		state.staticState = "pending";
		state.staticPendingSince = now;
	} else if (
		state.staticState === "pending" &&
		state.staticPendingSince !== null
	) {
		if (now - state.staticPendingSince >= staticTimeout) {
			state.staticState = "inactive";
			state.staticPendingSince = null;
		}
	}

	if (motionOn) {
		state.motionState = "active";
		state.motionPendingSince = null;
		state.sensorsEverActive = true;
	} else if (state.motionState === "active") {
		state.motionState = "pending";
		state.motionPendingSince = now;
	} else if (
		state.motionState === "pending" &&
		state.motionPendingSince !== null
	) {
		if (now - state.motionPendingSince >= motionTimeout) {
			state.motionState = "inactive";
			state.motionPendingSince = null;
		}
	}
}

/**
 * Step 5c — Force-clear pending zones when all sensors inactive. Mirror of
 * firmware epp_zone_engine.cpp ~718-747. Only applies once sensors have been
 * seen as active (prevents force-clear on sensor-free deployments where
 * sensors are always default-inactive). When both sensors are inactive and no
 * zone is OCCUPIED, every PENDING zone is cleared.
 */
function stepForceClear(ctx: TickContext): void {
	const { state } = ctx;
	const occupancy = ctx.occupancy;

	if (
		state.sensorsEverActive &&
		state.staticState === "inactive" &&
		state.motionState === "inactive"
	) {
		let anyOccupied = false;
		for (const [, st] of state.localZoneState) {
			if (st.occupied && st.pendingSince === null) {
				anyOccupied = true;
				break;
			}
		}
		if (!anyOccupied) {
			for (const [zid, st] of state.localZoneState) {
				if (st.occupied && st.pendingSince !== null) {
					st.occupied = false;
					st.pendingSince = null;
					st.confirmedTargets.clear();
					occupancy[zid] = false;
				}
			}
		}
	}
}

/**
 * Step 5d — Compute occupancy + mmwave. Mirror of firmware
 * epp_zone_engine.cpp ~766-796. sensorOccupancy is true when any sensor is
 * active/pending OR any zone is occupied/pending. mmwave combines static
 * presence + the target tracker (ignores motion/PIR): on when static is
 * active/pending OR any zone is OCCUPIED (not PENDING_CLEAR).
 */
function stepComputeOccupancy(ctx: TickContext): {
	sensorOccupancy: boolean;
	mmwave: boolean;
} {
	const { state } = ctx;
	const occupancy = ctx.occupancy;

	const sensorOccupancy =
		state.staticState !== "inactive" ||
		state.motionState !== "inactive" ||
		Object.values(occupancy).some((v) => v);

	let mmwave = state.staticState !== "inactive";
	if (!mmwave) {
		for (const [, st] of state.localZoneState) {
			if (st.occupied && st.pendingSince === null) {
				mmwave = true;
				break;
			}
		}
	}

	return { sensorOccupancy, mmwave };
}
