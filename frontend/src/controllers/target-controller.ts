import type { ReactiveController } from "lit";
import { DEBUG_LOG_MAX } from "../constants.js";
import { mapTargetToGridCell } from "../lib/coordinates.js";
import { cellIsInside, cellZone, GRID_COLS, GRID_ROWS } from "../lib/grid.js";
import { resolveZoneParams, type ZoneConfig } from "../lib/zone-defaults.js";
import {
	createZoneEngineState,
	runLocalZoneEngine,
	type ZoneEngineResult,
	type ZoneEngineState,
} from "../lib/zone-engine.js";
import type { RawTarget } from "../types.js";
import type { TargetData } from "./device-controller.js";
import type { PanelHost } from "./panel-host.js";

// TargetHost re-export kept so existing test imports keep working without churn.
export type { PanelHost as TargetHost } from "./panel-host.js";

/**
 * TargetController manages target data, sensor state, zone state, zone engine,
 * and debug logging.  It receives data from DeviceController callbacks and
 * runs the local zone engine.
 *
 * Reactive `@state` properties remain on the panel for Lit reactivity and
 * test compatibility.  This controller groups the related logic.
 */
export class TargetController implements ReactiveController {
	private host: PanelHost;

	constructor(host: PanelHost) {
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

	// Latest editor engine tick, refreshed per target frame (see
	// handleTargetData). Renders read this instead of ticking the engine —
	// _renderEditor used to tick once per render, including pointermove-driven
	// renders, advancing engine time faster than real target frames.
	private _editorEngineResult: ZoneEngineResult | null = null;

	get editorEngineResult(): ZoneEngineResult | null {
		return this._editorEngineResult;
	}

	resetZoneEngineState(): void {
		this._zoneEngineState = createZoneEngineState();
		this._editorEngineResult = null;
	}

	// =====================================================================
	// Target data processing (called from DeviceController callbacks)
	// =====================================================================

	/**
	 * Process incoming target data from the device subscription.
	 * Updates host's _targets, _sensorState, _zoneState, and debug log.
	 */
	handleTargetData(data: TargetData): void {
		if (this.host._view === "settings") {
			// Env-offset sliders display `raw + offset` where raw is derived
			// from the live sensor reading. Propagating live updates mid-drag
			// makes the displayed value bounce as the sensor fluctuates.
			// Snapshot model: populate any field that's currently null
			// (fresh load, post-reconnect onSessionClosed clear), then freeze.
			// Targets/zones are skipped entirely — they'd re-render the panel
			// at the 5Hz target rate and fight slider drag handlers.
			const cur = this.host._sensorState;
			const s = data.sensors;
			const updates: Partial<typeof cur> = {};
			if (cur.temperature == null && s.temperature != null) {
				updates.temperature = s.temperature;
			}
			if (cur.humidity == null && s.humidity != null) {
				updates.humidity = s.humidity;
			}
			if (cur.illuminance == null && s.illuminance != null) {
				updates.illuminance = s.illuminance;
			}
			if (cur.co2 == null && s.co2 != null) {
				updates.co2 = s.co2;
			}
			if (Object.keys(updates).length > 0) {
				this.host._sensorState = { ...cur, ...updates };
			}
			return;
		}
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
		if (this.host._view === "live") {
			// Track last in-room position for the live overview's pending-target
			// display. Live uses backend status — "active" means the target is
			// inside the SAVED room grid. (Editor view skips this: there the
			// local zone engine maintains targetPrevXY against the edited grid.)
			// Done here, per data frame, so renders stay pure functions of state.
			const prevXY = this._zoneEngineState.targetPrevXY;
			for (let i = 0; i < data.targets.length && i < prevXY.length; i++) {
				const t = data.targets[i];
				if (t.x != null && t.y != null && t.status === "active") {
					prevXY[i] = { x: t.x, y: t.y };
				}
			}
		} else if (this.host._view === "editor") {
			// Tick the local engine once per target frame and cache the result
			// for _renderEditor — renders between frames reuse the cache.
			this.runLocalZoneEngine();
		}
	}

	/**
	 * Process incoming raw target data from the display subscription.
	 */
	handleRawTargetData(rawTargets: RawTarget[]): void {
		if (this.host._view === "settings") return;
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
		const ss = this.host._sensorState;
		const slots = this.host._zoneConfigs;
		const z0 = resolveZoneParams(slots[0]);
		const result = runLocalZoneEngine(this._zoneEngineState, {
			targets: this.host._targets,
			grid: this.host._grid,
			roomWidth: this.host._roomWidth,
			roomDepth: this.host._roomDepth,
			// slots is [Zone0Config, ZoneConfig|null × 7]; slice(1) is named zones only.
			zoneConfigs: slots.slice(1) as (ZoneConfig | null)[],
			roomType: z0.type,
			roomTrigger: z0.trigger,
			roomRenew: z0.renew,
			roomTimeout: z0.timeout,
			roomHandoffTimeout: z0.handoff_timeout,
			staticPresence: ss?.static_presence ?? false,
			motionPresence: ss?.motion_presence ?? false,
			// Use the host's configured timeouts so the editor preview's
			// pending-state behaviour mirrors the firmware's.
			staticTimeout: this.host._staticTimeout,
			motionTimeout: this.host._motionTimeout,
		});

		// Engine mutates `localZoneState` (a Map) in place. Lit's
		// shouldUpdate compares property references, so without a fresh
		// identity the `<epp-zone-sidebar>` won't re-render. Reassign the
		// engine state with a shallow copy of the Map so consumers see
		// reference change while preserving entry identity.
		this._zoneEngineState = {
			...this._zoneEngineState,
			localZoneState: new Map(this._zoneEngineState.localZoneState),
		};

		// Build raw debug log (same format as firmware)
		if (this.host._showDebugLog) {
			this._buildFrontendDebugLog(result);
		}

		this._editorEngineResult = result;
		return result;
	}

	// =====================================================================
	// Debug log enrichment
	// =====================================================================

	/**
	 * Enrich a raw debug log string (from firmware or frontend zone engine)
	 * by replacing zone IDs with zone names.
	 * Raw format: "S:A M:P Occ:1|T0:Z1:A:5 T1:Z0:P:3|Z0:O:1 Z1:O:1"
	 * Legacy:     "T0:Z1:A:5 T1:Z0:P:3|Z0:O:1 Z1:O:1"
	 * Enriched:   "Static: active, Motion: pending, Occ: on | T0→Hallway(active,5) | Hallway: occupied(1)"
	 */
	enrichDebugLog(raw: string): string {
		const t = this.host._localize;
		const zoneName = (zid: number): string => {
			if (zid === 0) return t("live.debug.room");
			const cfg = this.host._zoneConfigs[zid];
			return cfg && "name" in cfg
				? cfg.name
				: t("live.debug.zone_n", { n: zid });
		};
		const statusName: Record<string, string> = {
			A: t("live.debug.active"),
			P: t("live.debug.pending"),
			I: t("live.debug.inactive"),
			O: t("live.debug.occupied"),
		};
		const labels = {
			static: t("live.debug.static"),
			motion: t("live.debug.motion"),
			occ: t("live.debug.occ"),
			on: t("live.debug.on"),
			off: t("live.debug.off"),
		};

		const parts = raw.split("|");

		// New 3-section format: sensors|targets|zones
		// Legacy 2-section format: targets|zones
		let sensorPart: string;
		let targetPart: string;
		let zonePart: string;

		if (parts.length >= 3) {
			sensorPart = parts[0];
			targetPart = parts[1];
			zonePart = parts[2];
		} else {
			sensorPart = "";
			targetPart = parts[0] || "";
			zonePart = parts[1] || "";
		}

		// Sensors section
		let sStr = "";
		if (sensorPart.trim()) {
			const sensorTokens = sensorPart.trim().split(/\s+/);
			const sensorLabels: string[] = [];
			for (const tok of sensorTokens) {
				const [key, val] = tok.split(":");
				if (key === "S")
					sensorLabels.push(`${labels.static}: ${statusName[val] ?? val}`);
				else if (key === "M")
					sensorLabels.push(`${labels.motion}: ${statusName[val] ?? val}`);
				else if (key === "Occ")
					sensorLabels.push(
						`${labels.occ}: ${val === "1" ? labels.on : labels.off}`,
					);
			}
			sStr = sensorLabels.join(", ");
		}

		// Targets section
		const targets = (targetPart || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((s) => {
				const [tn, z, st, sig] = s.split(":");
				const parsed = parseInt(z?.replace("Z", "") ?? "0", 10);
				const zid = Number.isFinite(parsed) ? parsed : 0;
				return `${tn}→${zoneName(zid)}(${statusName[st] ?? st},${sig})`;
			});

		// Zones section
		const zones = (zonePart || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((s) => {
				const [z, st, cnt] = s.split(":");
				const parsed = parseInt(z?.replace("Z", "") ?? "0", 10);
				const zid = Number.isFinite(parsed) ? parsed : 0;
				return `${zoneName(zid)}: ${statusName[st] ?? st}(${cnt})`;
			});

		const tStr = targets.length
			? targets.join(" ")
			: t("live.debug.no_targets");
		const zStr = zones.length ? zones.join(", ") : t("live.debug.all_clear");

		if (sStr) {
			return `${sStr} | ${tStr} | ${zStr}`;
		}
		return `${tStr} | ${zStr}`;
	}

	// =====================================================================
	// Debug log line management
	// =====================================================================

	/**
	 * Shared dedupe + timestamp + cap pipeline for backend / frontend logs.
	 * The line arrays are plain fields (NOT Lit @state), so neither push()
	 * nor the cap-slice triggers a re-render — the visible DOM is updated
	 * imperatively by `_appendToLogContainer`, and the arrays exist solely
	 * to back the "Copy all" button.
	 */
	private _appendLog(
		body: string,
		prevField: "_backendDebugLogPrev" | "_debugLogPrev",
		linesField: "_backendDebugLogLines" | "_debugLogLines",
		containerId: string,
	): void {
		if (body === this.host[prevField]) return;
		this.host[prevField] = body;
		// Container remount (a view switch destroys and recreates the live
		// view while the toggle stays on) leaves a fresh, empty container
		// but a full backing array — "Copy all" would copy lines that are
		// no longer displayed. Reset the array whenever the container holds
		// no rendered log lines.
		const container = this.host.shadowRoot?.getElementById(containerId);
		if (
			container &&
			!container.querySelector(".debug-log-line") &&
			this.host[linesField].length > 0
		) {
			this.host[linesField] = [];
		}
		const ts = new Date().toLocaleTimeString(
			this.host._localize?.lang ?? "en-GB",
			{
				hour12: false,
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 1,
			},
		);
		const line = `${ts} ${body}`;
		this.host[linesField].push(line);
		if (this.host[linesField].length > DEBUG_LOG_MAX) {
			this.host[linesField] = this.host[linesField].slice(-DEBUG_LOG_MAX);
		}
		this._appendToLogContainer(containerId, line);
	}

	/**
	 * Append a backend debug log line (from zone data subscription).
	 * Deduplicates against previous line and caps at DEBUG_LOG_MAX.
	 */
	appendBackendDebugLog(rawDebugLog: string): void {
		// If the firmware log doesn't have the sensor prefix (no 3-section format),
		// prepend sensor state from the host's sensorState
		let enrichedRaw = rawDebugLog;
		const parts = rawDebugLog.split("|");
		if (parts.length < 3) {
			const ss = this.host._sensorState;
			const staticCode = ss?.static_presence ? "A" : "I";
			const motionCode = ss?.motion_presence ? "A" : "I";
			const occCode = ss?.occupancy ? "1" : "0";
			enrichedRaw = `S:${staticCode} M:${motionCode} Occ:${occCode}|${rawDebugLog}`;
		}

		const body = this.enrichDebugLog(enrichedRaw);
		this._appendLog(
			body,
			"_backendDebugLogPrev",
			"_backendDebugLogLines",
			"backend-debug-log-scroll",
		);
	}

	/**
	 * Append a frontend debug log line (from local zone engine).
	 * Deduplicates against previous line and caps at DEBUG_LOG_MAX.
	 */
	private _appendFrontendDebugLog(body: string): void {
		this._appendLog(
			body,
			"_debugLogPrev",
			"_debugLogLines",
			"debug-log-scroll",
		);
	}

	/**
	 * Append a log line to a scrollable debug-log container by ID.
	 * Clears any placeholder on first real line and caps at DEBUG_LOG_MAX.
	 */
	private _appendToLogContainer(containerId: string, line: string): void {
		const container = this.host.shadowRoot?.getElementById(containerId);
		if (!container) return;
		if (
			container.children.length === 1 &&
			!container.children[0].classList.contains("debug-log-line")
		) {
			container.innerHTML = "";
		}
		const div = document.createElement("div");
		div.className = "debug-log-line";
		div.textContent = line;
		container.appendChild(div);
		while (container.children.length > DEBUG_LOG_MAX) {
			container.firstChild?.remove();
		}
		container.scrollTop = container.scrollHeight;
	}

	// allZoneIds is recomputed only when the grid reference changes. The
	// codebase replaces _grid via clone-then-mutate (grid-state-controller and
	// _setOverlay), so reference equality is a valid invalidation key.
	private _allZoneIdsCache: Set<number> | null = null;
	private _allZoneIdsCacheGrid: Uint8Array | null = null;

	private _computeAllZoneIds(grid: Uint8Array): Set<number> {
		const ids = new Set<number>();
		for (let i = 0; i < grid.length; i++) {
			if (cellIsInside(grid[i])) ids.add(cellZone(grid[i]));
		}
		return ids;
	}

	private _getAllZoneIds(): Set<number> {
		const grid = this.host._grid;
		if (this._allZoneIdsCache !== null && this._allZoneIdsCacheGrid === grid) {
			return this._allZoneIdsCache;
		}
		const ids = this._computeAllZoneIds(grid);
		this._allZoneIdsCache = ids;
		this._allZoneIdsCacheGrid = grid;
		return ids;
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
			if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) continue;
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
				zoneSignal.set(zid, Math.max(zoneSignal.get(zid) ?? 0, t.signal));
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

		const allZoneIds = this._getAllZoneIds();
		const zoneParts: string[] = [];
		for (const zid of allZoneIds) {
			const st = this._zoneEngineState.localZoneState.get(zid);
			if (st?.occupied) {
				const state = st.pendingSince !== null ? "P" : "O";
				zoneParts.push(`Z${zid}:${state}:${zoneSignal.get(zid) ?? 0}`);
			}
		}
		// Sensor state prefix
		const staticCode =
			result.staticState === "active"
				? "A"
				: result.staticState === "pending"
					? "P"
					: "I";
		const motionCode =
			result.motionState === "active"
				? "A"
				: result.motionState === "pending"
					? "P"
					: "I";
		const occCode = result.sensorOccupancy ? "1" : "0";
		const sensorPrefix = `S:${staticCode} M:${motionCode} Occ:${occCode}`;

		const raw = `${sensorPrefix}|${targetParts.join(" ")}|${zoneParts.join(" ")}`;
		const body = this.enrichDebugLog(raw);
		this._appendFrontendDebugLog(body);
	}
}
