import { cellIsInside, cellZone, GRID_CELL_COUNT, GRID_COLS, GRID_ROWS } from "./grid.js";
import { mapTargetToGridCell } from "./coordinates.js";
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
}

export interface ZoneEngineParams {
	targets: { x: number | null; y: number | null; signal: number; speed: number; status: string }[];
	grid: Uint8Array;
	roomWidth: number;
	roomDepth: number;
	zoneConfigs: (ZoneConfig | null)[];
	roomType: ZoneConfig["type"];
	roomTrigger: number;
	roomRenew: number;
	roomTimeout: number;
	roomHandoffTimeout: number;
	roomEntryPoint: boolean;
	now?: number; // seconds (defaults to Date.now() / 1000)
}

export interface ZoneEngineResult {
	occupancy: Record<number, boolean>;
	targets: { status: "active" | "pending" | "inactive" }[];
}

// ---- Factory ----

export function createZoneEngineState(): ZoneEngineState {
	return {
		localZoneState: new Map(),
		targetPrev: [null, null, null],
		targetGateCount: [0, 0, 0],
		targetPrevXY: [null, null, null],
	};
}

// ---- Engine ----

const MAX_MOVEMENT_CELLS = 5;
const MAX_TARGETS = 3;

export function runLocalZoneEngine(
	state: ZoneEngineState,
	params: ZoneEngineParams,
): ZoneEngineResult {
	const now = params.now ?? Date.now() / 1000;

	const zoneConfirmed: Map<number, boolean> = new Map();
	const targetSignal: Map<number, number> = new Map();
	const targetZonePrev: (number | null)[] = [null, null, null];
	const targetZoneCurr: (number | null)[] = [null, null, null];

	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const t = params.targets[i];

		// Check if sensor is tracking (x/y non-null), NOT backend status.
		// The zone editor ignores backend status and recalculates its own.
		if (t.x == null || t.y == null) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		const signal = t.signal;
		if (signal <= 0) continue;

		targetSignal.set(i, signal);

		const pos = mapTargetToGridCell(t.x, t.y, params.roomWidth, params.roomDepth);
		if (!pos) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const col = Math.floor(pos.col);
		const row = Math.floor(pos.row);
		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}
		const idx = row * GRID_COLS + col;
		const cellVal = params.grid[idx];
		if (!cellIsInside(cellVal)) {
			state.targetPrev[i] = null;
			state.targetGateCount[i] = 0;
			continue;
		}

		const zid = cellZone(cellVal);
		targetZoneCurr[i] = zid;

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
			const dist = Math.max(
				Math.abs(col - prev.col),
				Math.abs(row - prev.row),
			);
			continuous = dist <= MAX_MOVEMENT_CELLS;
		}

		const thresholds = getZoneThresholds(
			zid,
			params.zoneConfigs,
			params.roomType,
			params.roomTrigger,
			params.roomRenew,
			params.roomTimeout,
			params.roomHandoffTimeout,
			params.roomEntryPoint,
		);
		const { trigger, renew, entryPoint } = thresholds;
		const st = state.localZoneState.get(zid);
		const isOccupied = st?.occupied ?? false;
		const isClear = !isOccupied;

		const baseTrigger = isClear ? trigger : renew;
		const needsGating = !entryPoint && !continuous;

		if (needsGating && isClear) {
			const gatedThresh = Math.min(baseTrigger + 2, 8);
			if (signal >= gatedThresh) {
				state.targetGateCount[i]++;
				if (state.targetGateCount[i] >= 2) {
					zoneConfirmed.set(zid, true);
					if (st) st.confirmedTargets.add(i);
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
				if (st) st.confirmedTargets.add(i);
				state.targetPrev[i] = { col, row };
				state.targetGateCount[i] = 0;
			} else {
				state.targetPrev[i] = { col, row };
			}
		}
	}

	// Handoff detection
	for (let i = 0; i < MAX_TARGETS; i++) {
		const prevZid = targetZonePrev[i];
		const currZid = targetZoneCurr[i];
		if (prevZid === null || currZid === null || prevZid === currZid) continue;

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
				params.roomEntryPoint,
			);
			const { timeout, handoffTimeout } = handoffThresholds;
			srcSt.pendingSince = now - (timeout - handoffTimeout);
		}
	}

	// State machine per zone
	const occupancy: Record<number, boolean> = {};
	const allZoneIds = new Set<number>();
	for (let i = 0; i < params.grid.length; i++) {
		if (cellIsInside(params.grid[i])) allZoneIds.add(cellZone(params.grid[i]));
	}
	for (const zid of allZoneIds) {
		let st = state.localZoneState.get(zid);
		if (!st) {
			st = {
				occupied: false,
				pendingSince: null,
				confirmedTargets: new Set(),
			};
			state.localZoneState.set(zid, st);
		}
		const zoneThresholds = getZoneThresholds(
			zid,
			params.zoneConfigs,
			params.roomType,
			params.roomTrigger,
			params.roomRenew,
			params.roomTimeout,
			params.roomHandoffTimeout,
			params.roomEntryPoint,
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

	// activeTargets = sensor is tracking (mirrors backend tw.active)
	const activeTargets = new Set<number>();
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		if (params.targets[i].x != null && params.targets[i].y != null) {
			activeTargets.add(i);
		}
	}

	// Clean up stale confirmed targets in non-pending zones
	// (mirrors backend _tick lines 705-709)
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		if (!activeTargets.has(i)) {
			for (const st of state.localZoneState.values()) {
				if (st.pendingSince === null) {
					st.confirmedTargets.delete(i);
				}
			}
		}
	}

	// Build per-target status (mirrors backend _tick lines 661-700).
	// Only status is needed — position for pending display is handled
	// by targetPrevXY in the rendering layer.
	const targetResults: { status: "active" | "pending" | "inactive" }[] = [];
	for (let i = 0; i < MAX_TARGETS && i < params.targets.length; i++) {
		const sig = targetSignal.get(i) ?? 0;
		const inRoom = targetZoneCurr[i] !== null;
		if (activeTargets.has(i) && sig > 0 && inRoom) {
			targetResults.push({ status: "active" });
		} else {
			let isPending = false;
			if (!activeTargets.has(i) || !inRoom) {
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

	return { occupancy, targets: targetResults };
}
