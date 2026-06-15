import type { ReactiveController } from "lit";
import {
	applyOverlayPaintToCell,
	applyPaintToCell,
	clearZoneFromGrid,
	determineOverlayPaintAction,
	determinePaintAction,
} from "../lib/cell-painting.js";
import {
	clampFurnitureMove,
	computeFurnitureResize,
	computeFurnitureRotation,
	createFurnitureItem,
	type FurnitureItem,
	type FurnitureSticker,
	isFurnitureOutsideGrid,
	removeFurnitureItem,
	snapRotation,
	updateFurnitureItem,
} from "../lib/furniture.js";
import {
	alignTemplateGrid,
	cellIsInside,
	cellZone,
	computeAlignmentOffset,
	GRID_CELL_COUNT,
	GRID_CELL_MM,
	getRoomBounds,
	gridHasInsideRoom,
	initGridFromRoom,
	MAX_ZONES,
	NUM_ZONE_SLOTS,
	OVERLAY_MODE_TO_KIND,
	type OverlayMode,
	roomStartCol,
} from "../lib/grid.js";
import { autoDetectionRange, boundsToRoomMm } from "../lib/room-geometry.js";
import {
	cloneSettingsDefault,
	ENTITY_DEFAULTS,
	SETTINGS_DEFAULTS,
	SETTINGS_FIELD_MAP,
	type SettingsHostProp,
} from "../lib/settings-defaults.js";
import {
	ZONE_COLORS,
	type Zone0Config,
	type ZoneConfig,
	type ZoneSlots,
} from "../lib/zone-defaults.js";
import type { PanelHost } from "./panel-host.js";

// GridHost re-export kept so existing test imports keep working without churn.
export type { PanelHost as GridHost } from "./panel-host.js";

function overlayModeToKind(mode: OverlayMode): number | null {
	return mode === null ? null : OVERLAY_MODE_TO_KIND[mode];
}

/**
 * Serialize a zone slot for storage / wire. Non-custom types drop timing —
 * backend + frontend resolve it from ZONE_TYPE_DEFAULTS at push/render time.
 */
export function serializeSlot(
	z: Zone0Config | ZoneConfig | null,
	idx: number,
): Record<string, unknown> | null {
	if (z === null) return null;
	if (idx === 0) {
		const z0 = z as Zone0Config;
		const slot: Record<string, unknown> = { type: z0.type };
		if (z0.type === "custom") {
			slot.trigger = z0.trigger;
			slot.renew = z0.renew;
			slot.timeout = z0.timeout;
			slot.handoff_timeout = z0.handoff_timeout;
		}
		return slot;
	}
	const nz = z as ZoneConfig;
	const slot: Record<string, unknown> = {
		name: nz.name,
		color: nz.color,
		type: nz.type,
	};
	if (nz.type === "custom") {
		slot.trigger = nz.trigger;
		slot.renew = nz.renew;
		slot.timeout = nz.timeout;
		slot.handoff_timeout = nz.handoff_timeout;
	}
	return slot;
}

/**
 * Serialize a furniture item for the `set_room_layout` wire payload.
 * Exactly these nine fields — the local-only `id` is intentionally dropped
 * (the backend regenerates ids on load via parseFurniture).
 */
export function serializeFurniture(f: FurnitureItem): Record<string, unknown> {
	return {
		type: f.type,
		icon: f.icon,
		label: f.label,
		x: f.x,
		y: f.y,
		width: f.width,
		height: f.height,
		rotation: f.rotation,
		lockAspect: f.lockAspect,
	};
}

/** Operations that can fail and surface through {@link GridStateController.onError}. */
export type GridOp =
	| "apply_layout"
	| "save_settings"
	| "save_configuration"
	| "load_configuration";

export class GridStateController implements ReactiveController {
	private host: PanelHost;

	/**
	 * Optional host hook for surfacing controller errors to the UI. The op
	 * name doubles as the `errors.*` translation-key suffix for the panel's
	 * dismissible error banner. The panel wires this at construction so
	 * failures surface even for ops that run before/without attachment.
	 */
	onError?: (op: GridOp, error: unknown) => void;

	constructor(host: PanelHost) {
		this.host = host;
		host.addController(this);
	}

	// --- ReactiveController lifecycle ---
	hostConnected(): void {}
	hostDisconnected(): void {}

	// =====================================================================
	// Grid / Zone mutation
	// =====================================================================

	onCellMouseDown(index: number): void {
		// Furniture tab: deselect furniture on grid click, no painting
		if (this.host._sidebarTab === "furniture") {
			this.host._selectedFurnitureId = null;
			return;
		}
		const overlayKind = overlayModeToKind(this.host._overlayMode);
		if (overlayKind !== null) {
			this.host._paintAction = determineOverlayPaintAction(
				this.host._grid[index],
				overlayKind,
			);
		} else if (
			this.host._sidebarTab === "zones" &&
			this.host._activeZone !== null
		) {
			this.host._paintAction = determinePaintAction(
				this.host._grid[index],
				this.host._activeZone,
			);
		} else {
			return;
		}
		this.host._isPainting = true;
		this.host._frozenBounds = this.host._getVisibleRoomBounds();
		this.applyPaintToCell(index);
		// pointerup ends a stroke released outside the grid; pointercancel ends
		// one the browser takes over (touch-scroll) — without it the stroke
		// stays live and the next touch anywhere keeps painting.
		const onUp = () => {
			this.onCellMouseUp();
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onUp);
		};
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onUp);
	}

	onCellMouseEnter(index: number): void {
		if (this.host._isPainting) {
			this.applyPaintToCell(index);
		}
	}

	onCellMouseUp(): void {
		if (this.host._isPainting) {
			// Flag to prevent the panel click handler from deselecting the zone
			this.host._justPainted = true;
			requestAnimationFrame(() => {
				this.host._justPainted = false;
			});
		}
		this.host._isPainting = false;
		this.host._frozenBounds = null;
	}

	applyPaintToCell(index: number): void {
		let newValue: number | null;
		const overlayKind = overlayModeToKind(this.host._overlayMode);
		if (overlayKind !== null) {
			newValue = applyOverlayPaintToCell(
				this.host._grid[index],
				overlayKind,
				this.host._paintAction,
			);
		} else {
			if (this.host._activeZone === null) return;
			newValue = applyPaintToCell(
				this.host._grid[index],
				this.host._activeZone,
				this.host._paintAction,
			);
		}
		if (newValue === null || newValue === this.host._grid[index]) return;

		// Clone-then-mutate: _grid is a Lit @state, so the reference swap
		// alone schedules the re-render (no requestUpdate needed).
		this.host._grid = new Uint8Array(this.host._grid);
		this.host._grid[index] = newValue;
		this.host._dirty = true;
		// Grid changed → per-target continuity/dismiss state is stale
		// (firmware set_grid semantics).
		this.host._zoneEngineGridChanged();
	}

	initGridFromRoom(): void {
		this.host._grid = initGridFromRoom(
			this.host._roomWidth,
			this.host._roomDepth,
		);
		this.host._zoneEngineGridChanged();
	}

	// =====================================================================
	// Zone management
	// =====================================================================

	addZone(): void {
		// Slot 0 is the always-present Zone0Config; named zones live in 1..7.
		// findIndex returns the first slot that's null — for a length-8 tuple
		// that's guaranteed to be >=1, so the index is directly the slot number.
		const configs: (ZoneConfig | Zone0Config | null)[] = [
			...this.host._zoneConfigs,
		];
		const firstEmpty = configs.findIndex((z, idx) => idx > 0 && z === null);
		if (firstEmpty === -1) return; // All 7 named slots full

		// Pick first unused color. ZONE_COLORS.length === MAX_ZONES (7), so when
		// adding the Nth named zone (N <= 7) at most N-1 colors are taken — find
		// always returns a value.
		const usedColors = new Set(
			configs
				.filter((z, idx): z is ZoneConfig => idx > 0 && z !== null)
				.map((z) => (z as ZoneConfig).color),
		);
		const color = ZONE_COLORS.find((c) => !usedColors.has(c)) as string;
		const name =
			this.host._localize?.("live.debug.zone_n", { n: firstEmpty }) ??
			`Zone ${firstEmpty}`;
		configs[firstEmpty] = {
			name,
			color,
			type: "default",
		};
		this.host._zoneConfigs = configs as unknown as ZoneSlots;
		this.host._activeZone = firstEmpty; // slot index = 1-based zone number
		this.host._dirty = true;
		// Zone configs changed → full engine reset (firmware set_zones
		// semantics: every ZoneRuntime back to CLEAR).
		this.host._zoneEngineZoneConfigChanged();
	}

	removeZone(slot: number): void {
		if (slot < 1 || slot > MAX_ZONES || this.host._zoneConfigs[slot] === null)
			return;
		// Clear all grid cells with this zone back to zone 0
		const cleared = clearZoneFromGrid(this.host._grid, slot);
		if (cleared) this.host._grid = cleared;
		// No renumbering — just null out the slot
		const configs: (ZoneConfig | Zone0Config | null)[] = [
			...this.host._zoneConfigs,
		];
		configs[slot] = null;
		this.host._zoneConfigs = configs as unknown as ZoneSlots;
		if (this.host._activeZone === slot) {
			this.host._activeZone = null;
		}
		this.host._dirty = true;
		// Covers both the grid mutation (cleared cells) and the config
		// change — the zone-config reset is a superset of the grid reset.
		this.host._zoneEngineZoneConfigChanged();
	}

	// =====================================================================
	// Furniture management
	// =====================================================================

	addFurniture(sticker: FurnitureSticker): void {
		const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
		const item = createFurnitureItem(
			sticker,
			this.host._roomWidth,
			this.host._roomDepth,
			id,
		);
		this.host._furniture = [...this.host._furniture, item];
		this.host._selectedFurnitureId = item.id;
		this.host._dirty = true;
	}

	addCustomFurniture(icon: string): void {
		this.addFurniture({
			type: "icon",
			icon,
			label: "furniture.custom",
			defaultWidth: 600,
			defaultHeight: 600,
			lockAspect: false,
		});
	}

	removeFurniture(id: string): void {
		this.host._furniture = removeFurnitureItem(this.host._furniture, id);
		if (this.host._selectedFurnitureId === id)
			this.host._selectedFurnitureId = null;
		this.host._dirty = true;
	}

	updateFurniture(id: string, updates: Partial<FurnitureItem>): void {
		this.host._furniture = updateFurnitureItem(
			this.host._furniture,
			id,
			updates,
		);
		this.host._dirty = true;
	}

	onFurniturePointerDown(
		e: PointerEvent,
		id: string,
		type: "move" | "resize" | "rotate",
		handle?: string,
		rotation?: number,
	): void {
		e.preventDefault();
		e.stopPropagation();
		this.host._selectedFurnitureId = id;
		const item = (this.host._furniture as FurnitureItem[]).find(
			(f) => f.id === id,
		);
		if (!item) return;
		// Prefer the rotation forwarded by the overlay event (captured at the
		// moment of the click) so resize/move stay correct even if the parent
		// array got swapped between render and event dispatch.
		const startRotation = rotation ?? item.rotation;

		// For rotate, find the item's center on screen
		let centerX = 0,
			centerY = 0,
			startAngle = 0;
		if (type === "rotate") {
			// Pierce through epp-grid -> epp-furniture-overlay shadow DOMs.
			// Match data-id in JS rather than interpolating the id into an
			// attribute selector: ids come from stored config blobs, and a
			// crafted id with quotes/brackets would make querySelector throw
			// a SyntaxError (CSS.escape-d strings additionally trip
			// happy-dom's stricter selector parser in tests).
			const overlayRoot = this.host.shadowRoot
				?.querySelector("epp-grid")
				?.shadowRoot?.querySelector("epp-furniture-overlay")?.shadowRoot;
			let el: HTMLElement | null = null;
			if (overlayRoot) {
				for (const candidate of overlayRoot.querySelectorAll<HTMLElement>(
					".furniture-item",
				)) {
					if (candidate.dataset.id === id) {
						el = candidate;
						break;
					}
				}
			}
			if (el) {
				const rect = el.getBoundingClientRect();
				centerX = rect.left + rect.width / 2;
				centerY = rect.top + rect.height / 2;
				startAngle =
					Math.atan2(e.clientY - centerY, e.clientX - centerX) *
					(180 / Math.PI);
			}
		}

		this.host._dragState = {
			type,
			id,
			startX: e.clientX,
			startY: e.clientY,
			origX: item.x,
			origY: item.y,
			origW: item.width,
			origH: item.height,
			origRot: startRotation,
			handle,
			centerX,
			centerY,
			startAngle,
		};

		const onMove = (ev: PointerEvent) => this.onFurnitureDrag(ev);
		// pointercancel fires instead of pointerup when the browser takes the
		// gesture over (touch-scroll); without it the drag wedges permanently
		// and the next touch anywhere keeps dragging.
		const onUp = () => {
			this.host._dragState = null;
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onUp);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onUp);
	}

	onFurnitureDrag(e: PointerEvent): void {
		if (!this.host._dragState) return;
		const ds = this.host._dragState;

		// Get cellPx from the grid container (pierce epp-grid's shadow DOM)
		const gridEl = this.host.shadowRoot
			?.querySelector("epp-grid")
			?.shadowRoot?.querySelector(".grid") as HTMLElement | null;
		if (!gridEl) return;
		const cellPx = gridEl.firstElementChild
			? (gridEl.firstElementChild as HTMLElement).offsetWidth
			: 28;

		const dx = e.clientX - ds.startX;
		const dy = e.clientY - ds.startY;

		if (ds.type === "move") {
			const item = (this.host._furniture as FurnitureItem[]).find(
				(f) => f.id === ds.id,
			);
			// Clamp to the FOV-aware visible bounds (not the physical room
			// bounds) so a drag can't park furniture in hidden cells.
			const mm = boundsToRoomMm(
				this.host._getVisibleRoomBounds(),
				this.host._roomWidth,
			);
			const pos = clampFurnitureMove(
				ds.origX,
				ds.origY,
				dx,
				dy,
				cellPx,
				item?.width ?? 0,
				item?.height ?? 0,
				mm.minX,
				mm.maxX,
				mm.minY,
				mm.maxY,
				ds.origRot,
			);
			this.updateFurniture(ds.id, pos);
		} else if (ds.type === "resize" && ds.handle) {
			const item = (this.host._furniture as FurnitureItem[]).find(
				(f) => f.id === ds.id,
			);
			const resized = computeFurnitureResize(
				ds.handle,
				dx,
				dy,
				cellPx,
				ds.origX,
				ds.origY,
				ds.origW,
				ds.origH,
				item?.lockAspect ?? false,
				ds.origRot,
			);
			this.updateFurniture(ds.id, resized);
		} else if (ds.type === "rotate") {
			const currentAngle =
				Math.atan2(
					e.clientY - (ds.centerY ?? 0),
					e.clientX - (ds.centerX ?? 0),
				) *
				(180 / Math.PI);
			this.updateFurniture(ds.id, {
				rotation: snapRotation(
					computeFurnitureRotation(
						ds.origRot,
						ds.startAngle ?? 0,
						currentAngle,
					),
				),
			});
		}
	}

	// =====================================================================
	// Saved configurations (backend WS API)
	// =====================================================================

	configurations: {
		name: string;
		grid: number[];
		// Length-8 zone slots: slot 0 = Zone0Config (room boundary),
		// slots 1-7 = named ZoneConfig | null.
		zones: (Zone0Config | ZoneConfig | null)[];
		roomWidth: number;
		roomDepth: number;
		furniture?: FurnitureItem[];
		settings?: { [key: string]: any };
	}[] = [];

	async fetchConfigurations(): Promise<void> {
		try {
			const resp = await this.host.hass.callWS({
				type: "eppgrid/list_configurations",
			});
			const dict = resp.configurations || {};
			this.configurations = Object.entries(dict).map(
				([name, data]: [string, any]) => ({
					...data,
					name,
				}),
			);
		} catch {
			this.configurations = [];
		}
	}

	async saveConfiguration(): Promise<void> {
		const name = this.host._configurationName.trim();
		if (!name) return;
		const zones = this.host._zoneConfigs.map((z, i) => serializeSlot(z, i));
		const configuration = {
			grid: Array.from(this.host._grid),
			zones,
			roomWidth: this.host._roomWidth,
			roomDepth: this.host._roomDepth,
			furniture: this.host._furniture.map((f) => ({ ...f })),
			settings: this.host._buildSparseSettings(),
		};
		try {
			await this.host.hass.callWS({
				type: "eppgrid/save_configuration",
				name,
				configuration,
			});
		} catch (err) {
			this.onError?.("save_configuration", err);
			throw err;
		}
		this.host._showConfigurationBackup = false;
		this.host._configurationName = "";
		await this.fetchConfigurations();
	}

	async loadConfiguration(name: string): Promise<void> {
		try {
			await this._loadConfiguration(name);
		} catch (err) {
			this.onError?.("load_configuration", err);
			throw err;
		}
	}

	private async _loadConfiguration(name: string): Promise<void> {
		const cfg = this.configurations.find((t) => t.name === name);
		if (!cfg) return;
		const zones = cfg.zones || [];
		// Length-8 with a populated, well-shaped zone 0 and correctly-shaped
		// named slots is required (per no-BWC policy). Old- or corrupt-format
		// configurations throw so the user re-saves them. Leave the restore dialog
		// open so the failure is visible and the user can try another configuration.
		const isZone0Shape = (s: any): boolean =>
			s != null && typeof s === "object" && typeof s.type === "string";
		const isNamedZoneShape = (s: any): boolean =>
			s === null ||
			(s != null &&
				typeof s === "object" &&
				typeof s.name === "string" &&
				typeof s.color === "string" &&
				typeof s.type === "string");
		const oldFormatError = new Error(
			`Configuration "${name}" is in an old format — please re-save it`,
		);
		if (zones.length !== NUM_ZONE_SLOTS) {
			throw oldFormatError;
		}
		if (!isZone0Shape(zones[0])) {
			throw oldFormatError;
		}
		for (let i = 1; i < NUM_ZONE_SLOTS; i++) {
			if (!isNamedZoneShape(zones[i])) {
				throw oldFormatError;
			}
		}
		// Grid is fail-closed like zones: a saved configuration has a re-save
		// recourse, so corrupt data errors loudly instead of silently loading
		// a half-empty room. (Contrast with parseGrid in config-serialization,
		// which zero-pad-repairs the device's own stored layout blob — there
		// is no re-save recourse for that path.)
		if (
			!Array.isArray(cfg.grid) ||
			cfg.grid.length !== GRID_CELL_COUNT ||
			!cfg.grid.every((v) => typeof v === "number" && Number.isFinite(v))
		) {
			throw oldFormatError;
		}

		// Snapshot pre-load state so we can roll back if the BEFORE-applyLayout
		// portion (settings push) fails. Without a rollback the panel
		// silently shows the loaded blob's UI state while the device still
		// has the prior settings — a worse failure than "nothing changed".
		// applyLayout failures keep state + _dirty=true so the user can hit
		// Apply to retry; that recovery path stays untouched.
		const snapshot = {
			grid: this.host._grid,
			zoneConfigs: this.host._zoneConfigs,
			roomWidth: this.host._roomWidth,
			roomDepth: this.host._roomDepth,
			furniture: this.host._furniture,
			showConfigurationRestore: this.host._showConfigurationRestore,
			dirty: this.host._dirty,
			settings: new Map<SettingsHostProp, unknown>(),
		};

		// Apply layout. alignTemplateGrid translates template zone/overlay bits
		// to match the current inside-room footprint. When the current grid has
		// no inside-room cells (uncalibrated device), it falls back to a verbatim
		// copy — in that case we also restore room dims from the backup and skip
		// furniture translation.
		const templateGrid = new Uint8Array(cfg.grid);
		const currentHasRoom = gridHasInsideRoom(this.host._grid);
		const templateHasRoom = gridHasInsideRoom(templateGrid);
		this.host._grid = alignTemplateGrid(templateGrid, this.host._grid);
		this.host._zoneConfigs = Array.from(
			{ length: NUM_ZONE_SLOTS },
			(_, i) => zones[i] ?? null,
		) as unknown as ZoneSlots;
		if (!currentHasRoom) {
			this.host._roomWidth = cfg.roomWidth;
			this.host._roomDepth = cfg.roomDepth;
			this.host._furniture = (cfg.furniture || []).map((f: any) => ({
				...f,
			}));
		} else {
			// Translate furniture by the same cell offset zones got, plus a
			// dim-correction for the assumed-centered render anchor. See
			// epp-furniture-overlay.ts: furniture x is mm from startCol, which
			// depends on roomWidth.
			const { dr, dc } = computeAlignmentOffset(
				templateGrid,
				this.host._grid,
				templateHasRoom,
				currentHasRoom,
			);
			const startColB = roomStartCol(cfg.roomWidth);
			const startColC = roomStartCol(this.host._roomWidth);
			const dxMm = (dc + startColB - startColC) * GRID_CELL_MM;
			const dyMm = dr * GRID_CELL_MM;
			this.host._furniture = (cfg.furniture || []).map((f: any) => ({
				...f,
				x: f.x + dxMm,
				y: f.y + dyMm,
			}));
		}

		// Apply settings (skip only when missing — undefined/null means "no settings
		// in blob, leave device as-is"). An empty object {} means "all defaults",
		// which restores every field to its canonical default value.
		const s = cfg.settings;
		const hasSettings = s != null && typeof s === "object";
		// `prop` is typed as `SettingsHostProp` (a union of literal property
		// names on PanelHost), so `this.host[prop]` resolves to the real field
		// type. Indexed assignments need an `any`-typed RHS because the union
		// members have heterogeneous types — but a typo in the prop name still
		// fails the compile.
		if (hasSettings) {
			for (const [key, prop] of SETTINGS_FIELD_MAP) {
				snapshot.settings.set(prop, this.host[prop]);
				if (key === "entities") {
					const sparse =
						"entities" in s ? (s as Record<string, any>).entities : undefined;
					(this.host as any)[prop] = {
						...ENTITY_DEFAULTS,
						...(sparse || {}),
					};
				} else {
					// cloneSettingsDefault (not SETTINGS_DEFAULTS[key]) so
					// object-valued defaults (log_levels) land in host state
					// as fresh copies — the canonical objects are frozen and
					// must never be aliased into mutable panel state.
					// Host cast: prop is a UNION of property names whose value
					// types differ, so a union-keyed write demands the (never)
					// intersection type — the cast is about the heterogeneous
					// host index, not the RHS (cloneSettingsDefault is now
					// generically typed to the key's real value type).
					(this.host as any)[prop] =
						key in s
							? (s as Record<string, any>)[key]
							: cloneSettingsDefault(key);
				}
			}
		}

		this.host._showConfigurationRestore = false;
		// Loaded configuration replaced grid AND zone configs — full engine
		// reset (firmware receives set_grid + set_zones on apply).
		this.host._zoneEngineZoneConfigChanged();
		// Mark dirty before auto-apply: if applyLayout throws (e.g. websocket
		// failure), the UI state has changed but the backend hasn't, so the
		// user needs an Apply button to retry. On success, applyLayout clears
		// _dirty = false itself.
		this.host._dirty = true;

		// Push settings BEFORE applyLayout. If auto-distance is enabled in the
		// restored settings, applyLayout will fire its own set_settings with
		// current-room auto-computed distances — and we want those values to win
		// on the device, not the (possibly stale) max_distance from the saved
		// blob. Reversing the order would clobber applyLayout's auto-correction.
		// Use _buildSettingsPayload() (not ...s) so sparse blobs get all fields
		// filled in from panel state (which was just populated above with
		// defaults+blob values), satisfying the WS schema.
		if (hasSettings) {
			try {
				await this.host.hass.callWS({
					type: "eppgrid/set_settings",
					mac: this.host._selectedMac,
					...this.host._buildSettingsPayload(),
				});
			} catch (err) {
				// Settings push failed — restore pre-load snapshot so the
				// panel doesn't claim a state the device doesn't have. Every
				// restored field is a Lit @state, so the assignments schedule
				// the re-render themselves.
				this.host._grid = snapshot.grid;
				this.host._zoneConfigs = snapshot.zoneConfigs;
				this.host._roomWidth = snapshot.roomWidth;
				this.host._roomDepth = snapshot.roomDepth;
				this.host._furniture = snapshot.furniture;
				this.host._showConfigurationRestore = snapshot.showConfigurationRestore;
				this.host._dirty = snapshot.dirty;
				for (const [prop, value] of snapshot.settings) {
					(this.host as any)[prop] = value;
				}
				throw err;
			}
		}

		await this.applyLayout();
	}

	async deleteConfiguration(name: string): Promise<void> {
		await this.host.hass.callWS({
			type: "eppgrid/delete_configuration",
			name,
		});
		await this.fetchConfigurations();
		this.host.requestUpdate();
	}

	// =====================================================================
	// Save operations
	// =====================================================================

	async applyLayout(): Promise<void> {
		// Build pruned zone slots locally (don't commit until after WS save).
		// Pre-fix this committed in place before the await; a WS failure left
		// the panel claiming the prune happened while the device still had
		// the old zones, mismatching state across the next save.
		const zoneCellCounts = new Map<number, number>();
		for (let i = 0; i < this.host._grid.length; i++) {
			if (cellIsInside(this.host._grid[i])) {
				const zid = cellZone(this.host._grid[i]);
				if (zid > 0) {
					zoneCellCounts.set(zid, (zoneCellCounts.get(zid) ?? 0) + 1);
				}
			}
		}
		const prunedSlots: (ZoneConfig | Zone0Config | null)[] =
			this.host._zoneConfigs.map(
				(z: ZoneConfig | Zone0Config | null, idx: number) => {
					// Slot 0 is the Zone0Config (room boundary) and is always kept.
					if (idx === 0) return z;
					if (z !== null && (zoneCellCounts.get(idx) ?? 0) === 0) return null;
					return z;
				},
			);

		// Filter furniture completely outside the room (use physical room
		// bounds, not FOV-aware bounds, so furniture in out-of-FOV areas
		// isn't silently dropped on save)
		const bounds = getRoomBounds(this.host._grid);
		let filteredFurniture = this.host._furniture as FurnitureItem[];
		if (bounds.minCol <= bounds.maxCol && bounds.minRow <= bounds.maxRow) {
			const mm = boundsToRoomMm(bounds, this.host._roomWidth);
			filteredFurniture = filteredFurniture.filter(
				(f) => !isFurnitureOutsideGrid(f, mm.minX, mm.maxX, mm.minY, mm.maxY),
			);
		}

		// References at save time: edits made while the WS round-trip is in
		// flight replace these (clone-then-mutate everywhere), so reference
		// inequality afterwards means "the user kept editing" — those edits
		// were NOT saved and must stay dirty / un-clobbered.
		const gridAtSave = this.host._grid;
		const zonesAtSave = this.host._zoneConfigs;
		const furnitureAtSave = this.host._furniture;

		this.host._saving = true;
		try {
			await this.host.hass.callWS({
				type: "eppgrid/set_room_layout",
				mac: this.host._selectedMac,
				grid_bytes: Array.from(gridAtSave),
				zone_slots: prunedSlots.map((z, idx) => serializeSlot(z, idx)),
				furniture: filteredFurniture.map(serializeFurniture),
			});
			// Save settings after layout — only needed when auto distances
			// may have changed; manual distances don't change with layout.
			if (this.host._targetAutoDistance || this.host._staticAutoDistance) {
				const autoRange = autoDetectionRange(
					this.host._roomWidth,
					this.host._roomDepth,
					this.host._perspective,
					this.host._grid,
				);
				const targetMaxDefault = SETTINGS_DEFAULTS.target_max_distance;
				const staticMaxDefault = SETTINGS_DEFAULTS.static_max_distance;
				const targetMaxDist = this.host._targetAutoDistance
					? autoRange > 0
						? Math.min(autoRange, targetMaxDefault)
						: targetMaxDefault
					: this.host._targetMaxDistance;
				const staticMinDist = this.host._staticAutoDistance
					? SETTINGS_DEFAULTS.static_min_distance
					: this.host._staticMinDistance;
				const staticMaxDist = this.host._staticAutoDistance
					? autoRange > 0
						? Math.min(autoRange, staticMaxDefault)
						: staticMaxDefault
					: this.host._staticMaxDistance;

				// Base payload from SETTINGS_FIELD_MAP via the host's
				// _buildSettingsPayload, then the three auto-computed distance
				// overrides on top — a hand-built field list here silently
				// missed new settings fields (the drift hazard catalogued in
				// settings-defaults.ts).
				await this.host.hass.callWS({
					type: "eppgrid/set_settings",
					mac: this.host._selectedMac,
					...this.host._buildSettingsPayload(),
					target_max_distance: targetMaxDist,
					static_min_distance: staticMinDist,
					static_max_distance: staticMaxDist,
				});
			}
			// Commit pruned slots / filtered furniture and clear _dirty only
			// after every save acknowledged AND only if the user didn't edit
			// meanwhile: the pruned/filtered copies were derived from the
			// pre-save state and would clobber newer edits, and in-flight
			// edits were never sent — the Apply button must survive them.
			const editedDuringSave =
				this.host._grid !== gridAtSave ||
				this.host._zoneConfigs !== zonesAtSave ||
				this.host._furniture !== furnitureAtSave;
			if (!editedDuringSave) {
				this.host._zoneConfigs = prunedSlots as unknown as ZoneSlots;
				this.host._furniture = filteredFurniture;
				this.host._dirty = false;
				// Navigation is scoped by editedDuringSave too: when edits
				// survived the save, silently switching to the live view would
				// hide the user's dirty work mid-edit — stay in the editor.
				this.host._selectedFurnitureId = null;
				this.host._overlayMode = null;
				this.host._view = "live";
			}
			// The device just ran set_grid + set_zones for this layout —
			// mirror its full reset so the local engine starts the next
			// editor session from the same state as the firmware.
			this.host._zoneEngineZoneConfigChanged();
		} catch (err) {
			this.onError?.("apply_layout", err);
			throw err;
		} finally {
			this.host._saving = false;
		}
	}

	async saveSettings(payload: Record<string, any>): Promise<void> {
		this.host._saving = true;
		try {
			// Whitelist payload keys against SETTINGS_FIELD_MAP so a stray key
			// (caller typo, stale field) never reaches the WS schema.
			const sanitized: Record<string, any> = {};
			for (const [key] of SETTINGS_FIELD_MAP) {
				if (key in payload) {
					sanitized[key] = payload[key];
				}
			}
			await this.host.hass.callWS({
				type: "eppgrid/set_settings",
				mac: this.host._selectedMac,
				...sanitized,
			});
			// Mirror saved values back into panel state so the settings page
			// shows the correct state if reopened before a full config reload.
			// Driven by SETTINGS_FIELD_MAP — the previous hand-written 21-field
			// mirror silently dropped newly added settings.
			for (const [key, prop] of SETTINGS_FIELD_MAP) {
				if (key in sanitized && sanitized[key] != null) {
					(this.host as any)[prop] = sanitized[key];
				}
			}
			this.host._dirty = false;
			this.host._view = "live";
		} catch (e) {
			// Stay on settings page, keep dirty. Always log for diagnostics;
			// also notify the host so it can surface the failure in the UI.
			console.error("Failed to save settings:", e);
			this.onError?.("save_settings", e);
		} finally {
			this.host._saving = false;
		}
	}
}
