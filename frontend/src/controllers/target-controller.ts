import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Target, RawTarget } from "../types.js";
import type { TargetData } from "./device-controller.js";
import type { ZoneConfig } from "../lib/zone-defaults.js";
import {
	createZoneEngineState,
	runLocalZoneEngine,
	type ZoneEngineResult,
	type ZoneEngineState,
} from "../lib/zone-engine.js";
import { computeHeatmapColors } from "../lib/heatmap.js";
import { cellIsInside, cellZone, GRID_COLS, GRID_ROWS } from "../lib/grid.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import { DEBUG_LOG_MAX } from "../constants.js";

/**
 * Host interface — the subset of the panel that this controller reads/writes.
 *
 * Using `any` for the host reference is intentional: the panel's `@state`
 * properties are private, and tests access them via `(el as any)._prop`.
 * A typed interface would force those properties to be public, which we
 * don't want yet.  The controller is a method-organizer — it groups related
 * logic while the reactive state stays on the panel.
 */
export type TargetHost = ReactiveControllerHost & Record<string, any>;

/**
 * TargetController manages target data, sensor state, zone state, zone engine,
 * and debug logging.  It receives data from DeviceController callbacks and
 * runs the local zone engine.
 *
 * Reactive `@state` properties remain on the panel for Lit reactivity and
 * test compatibility.  This controller groups the related logic.
 */
export class TargetController implements ReactiveController {
	private host: TargetHost;

	constructor(host: TargetHost) {
		this.host = host;
		host.addController(this);
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {}
	hostDisconnected(): void {}

	// =====================================================================
	// Zone engine state (owned by controller, exposed to host via getter)
	// =====================================================================

	private _zoneEngineState: ZoneEngineState = createZoneEngineState();

	get zoneEngineState(): ZoneEngineState {
		return this._zoneEngineState;
	}

	set zoneEngineState(value: ZoneEngineState) {
		this._zoneEngineState = value;
	}

	resetZoneEngineState(): void {
		this._zoneEngineState = createZoneEngineState();
	}

	// =====================================================================
	// Target data processing (called from DeviceController callbacks)
	// =====================================================================

	/**
	 * Process incoming target data from the device subscription.
	 * Updates host's _targets, _sensorState, _zoneState, and debug log.
	 */
	handleTargetData(data: TargetData): void {
		this.host._targets = data.targets;
		this.host._sensorState = data.sensors;
		if (data.zones) {
			this.host._zoneState = {
				occupancy: data.zones.occupancy,
				target_counts: data.zones.target_counts,
				frame_count: data.zones.frame_count,
			};
			if (this.host._showBackendDebugLog && data.zones.debug_log) {
				this.appendBackendDebugLog(data.zones.debug_log);
			}
		}
	}

	/**
	 * Process incoming raw target data from the display subscription.
	 */
	handleRawTargetData(rawTargets: RawTarget[]): void {
		this.host._rawTargets = rawTargets;
	}

	// =====================================================================
	// Zone engine
	// =====================================================================

	/**
	 * Run the local zone engine replica (matches backend zone_engine._tick).
	 * Also builds and appends the frontend debug log when _showDebugLog is on.
	 */
	runLocalZoneEngine(): ZoneEngineResult {
		const result = runLocalZoneEngine(this._zoneEngineState, {
			targets: this.host._targets,
			grid: this.host._grid,
			roomWidth: this.host._roomWidth,
			roomDepth: this.host._roomDepth,
			zoneConfigs: this.host._zoneConfigs,
			roomType: this.host._roomType,
			roomTrigger: this.host._roomTrigger,
			roomRenew: this.host._roomRenew,
			roomTimeout: this.host._roomTimeout,
			roomHandoffTimeout: this.host._roomHandoffTimeout,
			roomEntryPoint: this.host._roomEntryPoint,
		});

		// Build raw debug log (same format as firmware)
		if (this.host._showDebugLog) {
			this._buildFrontendDebugLog(result);
		}

		return result;
	}

	// =====================================================================
	// Debug log enrichment
	// =====================================================================

	/**
	 * Enrich a raw debug log string (from firmware or frontend zone engine)
	 * by replacing zone IDs with zone names.
	 * Raw format: "T0:Z1:A:5 T1:Z0:P:3|Z0:O:1 Z1:O:1"
	 * Enriched:   "T0->Entrance(active,5) T1->Room(pending,3) | Entrance: occupied(1)"
	 */
	enrichDebugLog(raw: string): string {
		const zoneName = (zid: number): string => {
			if (zid === 0) return "Room";
			const cfg = this.host._zoneConfigs[zid - 1];
			return cfg ? cfg.name : `Zone ${zid}`;
		};
		const statusName: Record<string, string> = {
			A: "active",
			P: "pending",
			O: "occupied",
		};
		const [targetPart, zonePart] = raw.split("|");
		const targets = (targetPart || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((s) => {
				const [t, z, st, sig] = s.split(":");
				const zid = parseInt(z?.replace("Z", "") ?? "0");
				return `${t}→${zoneName(zid)}(${statusName[st] ?? st},${sig})`;
			});
		const zones = (zonePart || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((s) => {
				const [z, st, cnt] = s.split(":");
				const zid = parseInt(z?.replace("Z", "") ?? "0");
				return `${zoneName(zid)}: ${statusName[st] ?? st}(${cnt})`;
			});
		const tStr = targets.length ? targets.join(" ") : "no targets";
		const zStr = zones.length ? zones.join(", ") : "all clear";
		return `${tStr} | ${zStr}`;
	}

	// =====================================================================
	// Heatmap delegation
	// =====================================================================

	/**
	 * Compute rgba overlay colour per zone based on hit counts.
	 */
	computeHeatmapColors(): Map<number, string> {
		return computeHeatmapColors(
			this.host._zoneState.target_counts,
			this.host._zoneConfigs,
		);
	}

	// =====================================================================
	// Debug log line management
	// =====================================================================

	/**
	 * Append a backend debug log line (from zone data subscription).
	 * Deduplicates against previous line and caps at DEBUG_LOG_MAX.
	 */
	appendBackendDebugLog(rawDebugLog: string): void {
		const body = this.enrichDebugLog(rawDebugLog);
		if (body !== this.host._backendDebugLogPrev) {
			this.host._backendDebugLogPrev = body;
			const ts = new Date().toLocaleTimeString("en-GB", {
				hour12: false,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 1,
			});
			this.host._backendDebugLogLines.push(`${ts} ${body}`);
			if (this.host._backendDebugLogLines.length > DEBUG_LOG_MAX) {
				this.host._backendDebugLogLines =
					this.host._backendDebugLogLines.slice(-DEBUG_LOG_MAX);
			}
			this.host.requestUpdate();
		}
	}

	/**
	 * Append a frontend debug log line (from local zone engine).
	 * Deduplicates against previous line and caps at DEBUG_LOG_MAX.
	 */
	private _appendFrontendDebugLog(body: string): void {
		if (body !== this.host._debugLogPrev) {
			this.host._debugLogPrev = body;
			const ts = new Date().toLocaleTimeString("en-GB", {
				hour12: false,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 1,
			});
			this.host._debugLogLines.push(`${ts} ${body}`);
			if (this.host._debugLogLines.length > DEBUG_LOG_MAX) {
				this.host._debugLogLines = this.host._debugLogLines.slice(
					-DEBUG_LOG_MAX,
				);
			}
			this.host.requestUpdate();
		}
	}

	/**
	 * Build the frontend debug log from zone engine results.
	 * Computes target-to-zone mapping and zone signal levels, then
	 * formats and appends the debug log line.
	 */
	private _buildFrontendDebugLog(result: ZoneEngineResult): void {
		const MAX_TARGETS = 3;
		// Compute target→zone mapping for debug log
		const targetZoneCurr: (number | null)[] = [null, null, null];
		for (let i = 0; i < MAX_TARGETS && i < this.host._targets.length; i++) {
			const t = this.host._targets[i];
			if (t.x == null || t.y == null || t.signal <= 0) continue;
			const pos = mapTargetToGridCell(
				t.x,
				t.y,
				this.host._roomWidth,
				this.host._roomDepth,
			);
			if (!pos) continue;
			const col = Math.floor(pos.col);
			const row = Math.floor(pos.row);
			if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS)
				continue;
			const idx = row * GRID_COLS + col;
			if (!cellIsInside(this.host._grid[idx])) continue;
			targetZoneCurr[i] = cellZone(this.host._grid[idx]);
		}

		// Compute best signal per zone (matches firmware zone_signal[])
		const zoneSignal: Map<number, number> = new Map();
		for (let i = 0; i < MAX_TARGETS && i < this.host._targets.length; i++) {
			const t = this.host._targets[i];
			if (t.x == null || t.y == null || t.signal <= 0) continue;
			const zid = targetZoneCurr[i];
			if (zid !== null) {
				zoneSignal.set(
					zid,
					Math.max(zoneSignal.get(zid) ?? 0, t.signal),
				);
			}
		}

		const targetParts: string[] = [];
		for (let i = 0; i < MAX_TARGETS && i < this.host._targets.length; i++) {
			const t = this.host._targets[i];
			if (t.x == null || t.y == null) continue;
			const sig = t.signal;
			if (sig <= 0) continue;
			const zid = targetZoneCurr[i];
			const s = result.targets[i]?.status === "pending" ? "P" : "A";
			targetParts.push(`T${i}:Z${zid ?? 0}:${s}:${sig}`);
		}

		const allZoneIds = new Set<number>();
		for (let i = 0; i < this.host._grid.length; i++) {
			if (cellIsInside(this.host._grid[i]))
				allZoneIds.add(cellZone(this.host._grid[i]));
		}
		const zoneParts: string[] = [];
		for (const zid of allZoneIds) {
			const st = this._zoneEngineState.localZoneState.get(zid);
			if (st?.occupied) {
				const state = st.pendingSince !== null ? "P" : "O";
				zoneParts.push(
					`Z${zid}:${state}:${zoneSignal.get(zid) ?? 0}`,
				);
			}
		}
		const raw = `${targetParts.join(" ")}|${zoneParts.join(" ")}`;
		const body = this.enrichDebugLog(raw);
		this._appendFrontendDebugLog(body);
	}
}
