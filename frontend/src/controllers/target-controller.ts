import type { ReactiveController } from "lit";
import { DEBUG_LOG_MAX } from "../constants.js";
import { formatEvent } from "../lib/detection-events.js";
import { OverlayTracker } from "../lib/overlay-tracker.js";
import { applyPerspective } from "../lib/perspective.js";
import { resolveZoneParams, type ZoneConfig } from "../lib/zone-defaults.js";
import {
	createZoneEngineState,
	dismissTarget,
	resetForGridChange,
	resetForZoneConfigChange,
	runLocalZoneEngine,
	type ZoneEngineResult,
	type ZoneEngineState,
} from "../lib/zone-engine.js";
import type { RawTarget } from "../types.js";
import type { TargetData } from "./device-controller.js";
import type { PanelHost } from "./panel-host.js";

// TargetHost re-export kept so existing test imports keep working without churn.
export type { PanelHost as TargetHost } from "./panel-host.js";

// Max points kept per target's live movement-trail polyline (frontend-only,
// ephemeral — see host._targetTrails).
const TRAIL_MAX = 60;

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

	// Mirror of the firmware component's raw-frame sticky entry-overlay tracker
	// (epp_component.cpp Stage 2b). On-device this is driven by RAW radar frames
	// at 10 Hz; here it's fed from the raw-target stream (handleRawTargetData),
	// falling back to median positions when no raw frame arrived this cycle (the
	// raw stream is unavailable in some editor states — a frontend-only
	// degradation the on-device component never hits). Its per-slot flags feed
	// each engine target's `onOverlay`.
	private _overlayTracker = new OverlayTracker();

	// True when a raw frame fed the tracker since the last engine tick. The raw
	// stream is authoritative (matches the component); the median fallback only
	// runs when no raw frame arrived. Reset after each engine tick.
	private _rawFedThisCycle = false;

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
		this._overlayTracker.reset();
		this._rawFedThisCycle = false;
	}

	/**
	 * Mirror of firmware set_grid's per-target reset — called whenever the
	 * panel applies a grid edit (paint, overlay, template load). Continuity
	 * coords, gating, dismissals and stuck refs are old-grid-relative; zone
	 * occupancy state is preserved.
	 */
	resetEngineForGridChange(): void {
		resetForGridChange(this._zoneEngineState);
		// The tracker's latched flags are cell-based and OLD-grid-relative, so a
		// grid edit invalidates them — reset alongside the engine's overlay
		// sticky (firmware set_grid clears target_overlay_sticky_).
		this._overlayTracker.reset();
		this._rawFedThisCycle = false;
	}

	/**
	 * Mirror of firmware set_zones — called whenever the panel applies a
	 * zone-config edit (add/remove zone, threshold/type change). Resets
	 * per-target tracking AND all zone runtimes + sensor presence state.
	 */
	resetEngineForZoneConfigChange(): void {
		resetForZoneConfigChange(this._zoneEngineState);
		// firmware set_zones also clears target_overlay_sticky_ — mirror it.
		this._overlayTracker.reset();
		this._rawFedThisCycle = false;
	}

	/**
	 * Mirror the panel's dismiss-target action into the local engine so the
	 * editor preview collapses the zone immediately, exactly like the
	 * firmware's dismiss_target service does on-device.
	 */
	dismissTarget(targetIndex: number, cellIndex: number): void {
		dismissTarget(
			this._zoneEngineState,
			targetIndex,
			cellIndex,
			this.host._grid,
		);
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
		// Live movement trails (frontend-only, ephemeral).
		if (this.host._view === "live" || this.host._view === "editor") {
			const trails = this.host._targetTrails;
			for (let i = 0; i < data.targets.length && i < trails.length; i++) {
				const t = data.targets[i];
				if (t.x != null && t.y != null && t.status === "active") {
					const line = trails[i];
					line.push({ x: t.x, y: t.y });
					if (line.length > TRAIL_MAX) line.splice(0, line.length - TRAIL_MAX);
				} else {
					// Target slot went inactive (or was never valid) — clear its
					// trail immediately. Otherwise the departed target's polyline
					// lingers forever, and since the LD2450 reuses slots, a NEW
					// target landing in slot i would inherit the OLD target's
					// trail as a spurious line jumping across the room.
					trails[i].length = 0;
				}
			}
		}
		this.host._sensorState = data.sensors;
		if (data.zones) {
			this.host._zoneState = {
				occupancy: data.zones.occupancy,
				target_counts: data.zones.target_counts,
				frame_count: data.zones.frame_count,
			};
			if (this.host._showBackendDebugLog) {
				// New firmware streams discrete semantic events; old firmware only
				// sends the legacy snapshot string. Prefer events when present,
				// fall back to the snapshot enrichment path for BWC.
				if (data.zones.events && data.zones.events.length > 0) {
					this.appendBackendEvents(data.zones.events);
				} else if (data.zones.debug_log) {
					this.appendBackendDebugLog(data.zones.debug_log);
				}
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
			// Feed the overlay tracker from the MEDIAN positions only when the
			// raw stream didn't already feed it this cycle (raw is authoritative
			// and matches the component). The median path is a frontend-only
			// fallback for editor states where the raw stream isn't flowing.
			if (!this._rawFedThisCycle) {
				this._overlayTracker.update(
					this.host._targets.map((t) => ({
						active: t.status === "active",
						x: t.x,
						y: t.y,
					})),
					this.host._grid,
					this.host._roomWidth,
					this.host._roomDepth,
				);
			}
			// Tick the local engine once per target frame and cache the result
			// for _renderEditor — renders between frames reuse the cache.
			this.runLocalZoneEngine();
			// Next cycle decides raw-vs-median afresh.
			this._rawFedThisCycle = false;
		}
	}

	/**
	 * Process incoming raw target data from the display subscription.
	 */
	handleRawTargetData(rawTargets: RawTarget[]): void {
		if (this.host._view === "settings") return;
		this.host._rawTargets = rawTargets;
		// Feed the overlay tracker from the RAW stream — the authoritative path,
		// mirroring the firmware component (epp_component.cpp Stage 2b runs on
		// raw frames). Raw coords are sensor-space; apply the client-side
		// perspective to reach the room-space mm frame the tracker maps from
		// (the component applies transform_.apply(fx, fy) before xy_to_cell).
		const h = this.host._perspective;
		const targets = rawTargets.map((t) => {
			if (t.raw_x == null || t.raw_y == null) {
				return { active: false, x: null, y: null };
			}
			if (h) {
				const p = applyPerspective(h, t.raw_x, t.raw_y);
				return { active: true, x: p.x, y: p.y };
			}
			// No perspective yet (pre-calibration) — can't reach room space;
			// treat as not-tracking so a stale flag isn't set from raw space.
			return { active: false, x: null, y: null };
		});
		this._overlayTracker.update(
			targets,
			this.host._grid,
			this.host._roomWidth,
			this.host._roomDepth,
		);
		this._rawFedThisCycle = true;
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
		// Attach each target's sticky entry-overlay flag (index-aligned) from the
		// tracker, mirroring the firmware feeding zone_input.targets[i].on_overlay.
		const overlayFlags = this._overlayTracker.onOverlay;
		const result = runLocalZoneEngine(this._zoneEngineState, {
			targets: this.host._targets.map((t, i) => ({
				...t,
				onOverlay: overlayFlags[i] ?? false,
			})),
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
			stuckTargetTimeout: this.host._stuckTargetTimeout,
			assistedClearEnabled: this.host._assistedClearEnabled,
			assistedClearTimeout: this.host._assistedClearTimeout,
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
	private _zoneNameResolver(): (zid: number) => string {
		const t = this.host._localize;
		return (zid: number): string => {
			if (zid === 0) return t("live.debug.room");
			const cfg = this.host._zoneConfigs[zid];
			return cfg && "name" in cfg
				? cfg.name
				: t("live.debug.zone_n", { n: zid });
		};
	}

	enrichDebugLog(raw: string): string {
		const t = this.host._localize;
		const zoneName = this._zoneNameResolver();
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
		this._appendLogLine(body, linesField, containerId);
	}

	/**
	 * Timestamp + remount-reset + cap + DOM-append for a single log line,
	 * WITHOUT the consecutive-duplicate dedup. `_appendLog` layers dedup on
	 * top of this (snapshot strings repeat frame-to-frame); discrete
	 * detection events skip dedup and call this directly (each event is a
	 * distinct occurrence, even two identical codes in a row).
	 */
	private _appendLogLine(
		body: string,
		linesField: "_backendDebugLogLines" | "_debugLogLines",
		containerId: string,
	): void {
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
	 * Render discrete backend detection-log events (new firmware path). Each
	 * wire code (e.g. "zo:1", "sc", "te:0:3") is mapped to a friendly,
	 * localized line via formatEvent and appended WITHOUT dedup — each event
	 * is a distinct occurrence. The zone-name / target-label resolvers mirror
	 * enrichDebugLog's: zone 0 → the room, a configured slot → its name,
	 * otherwise "Zone N"; targets are rendered 1-based.
	 */
	appendBackendEvents(events: string[]): void {
		const t = this.host._localize;
		const zoneName = this._zoneNameResolver();
		const targetLabel = (tid: number): string =>
			t("live.debug.target_n", { n: tid + 1 });
		for (const code of events) {
			const body = formatEvent(code, zoneName, targetLabel, t);
			this._appendLogLine(
				body,
				"_backendDebugLogLines",
				"backend-debug-log-scroll",
			);
		}
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

	/**
	 * Render the local zone-engine replica's detection-log events (Phase 6).
	 * The replica emits the SAME compact wire codes as the firmware engine
	 * (see zone-engine.ts / detection-events.ts); each is mapped through the
	 * SAME formatEvent mapper as backend events (appendBackendEvents) so the
	 * editor preview and the live device read identically. Each event is a
	 * discrete occurrence and is appended WITHOUT dedup (via _appendLogLine).
	 */
	private _buildFrontendDebugLog(result: ZoneEngineResult): void {
		const t = this.host._localize;
		const zoneName = this._zoneNameResolver();
		const targetLabel = (tid: number): string =>
			t("live.debug.target_n", { n: tid + 1 });
		for (const code of result.events) {
			const body = formatEvent(code, zoneName, targetLabel, t);
			this._appendLogLine(body, "_debugLogLines", "debug-log-scroll");
		}
	}
}
