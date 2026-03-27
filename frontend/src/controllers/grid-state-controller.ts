import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
	applyPaintToCell,
	clearZoneFromGrid,
	determinePaintAction,
	type PaintAction,
} from "../lib/cell-painting.js";
import {
	clampFurnitureMove,
	computeFurnitureResize,
	computeFurnitureRotation,
	createFurnitureItem,
	type FurnitureItem,
	type FurnitureSticker,
	removeFurnitureItem,
	updateFurnitureItem,
} from "../lib/furniture.js";
import {
	cellIsInside,
	cellZone,
	GRID_CELL_MM,
	GRID_COLS,
	getRoomBounds,
	initGridFromRoom,
	MAX_ZONES,
	updateRoomDimensionsFromGrid,
} from "../lib/grid.js";
import { ZONE_COLORS, type ZoneConfig } from "../lib/zone-defaults.js";

/**
 * Host interface — the subset of the panel that this controller reads/writes.
 *
 * Using `any` for the host reference is intentional: the panel's `@state`
 * properties are private, and tests access them via `(el as any)._prop`.
 * A typed interface would force those properties to be public, which we
 * don't want yet.  The controller is a method-organizer — it groups related
 * logic while the reactive state stays on the panel.
 */
export type GridHost = ReactiveControllerHost & Record<string, any>;

export class GridStateController implements ReactiveController {
	private host: GridHost;

	constructor(host: GridHost) {
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
		if (this.host._activeZone === null) return;
		this.host._isPainting = true;
		this.host._frozenBounds = getRoomBounds(this.host._grid);

		this.host._paintAction = determinePaintAction(
			this.host._grid[index],
			this.host._activeZone,
		);

		this.applyPaintToCell(index);

		// Listen on window so releasing outside the grid ends the paint
		const onUp = () => {
			this.onCellMouseUp();
			window.removeEventListener("mouseup", onUp);
		};
		window.addEventListener("mouseup", onUp);
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
		if (this.host._activeZone === null) return;
		const newValue = applyPaintToCell(
			this.host._grid[index],
			this.host._activeZone,
			this.host._paintAction,
		);
		if (newValue === null) return; // no change (e.g. zone paint on outside cell)

		this.host._grid = new Uint8Array(this.host._grid);
		this.host._grid[index] = newValue;
		this.host._dirty = true;

		// Update room dimensions when boundary changes
		if (this.host._activeZone === 0) {
			this.updateRoomDimensionsFromGrid();
		}

		this.host.requestUpdate();
	}

	updateRoomDimensionsFromGrid(): void {
		const { roomWidth, roomDepth } = updateRoomDimensionsFromGrid(
			this.host._grid,
		);
		this.host._roomWidth = roomWidth;
		this.host._roomDepth = roomDepth;
	}

	initGridFromRoom(): void {
		this.host._grid = initGridFromRoom(
			this.host._roomWidth,
			this.host._roomDepth,
		);
	}

	// =====================================================================
	// Zone management
	// =====================================================================

	addZone(): void {
		const firstEmpty = this.host._zoneConfigs.findIndex(
			(z: ZoneConfig | null) => z === null,
		);
		if (firstEmpty === -1) return; // All 7 slots full

		// Pick first unused color
		const usedColors = new Set(
			this.host._zoneConfigs
				.filter((z: ZoneConfig | null): z is ZoneConfig => z !== null)
				.map((z: ZoneConfig) => z.color),
		);
		const color =
			ZONE_COLORS.find((c) => !usedColors.has(c)) ??
			ZONE_COLORS[firstEmpty % ZONE_COLORS.length];
		const configs = [...this.host._zoneConfigs];
		configs[firstEmpty] = {
			name: `Zone ${firstEmpty + 1}`,
			color,
			type: "normal",
		};
		this.host._zoneConfigs = configs;
		this.host._activeZone = firstEmpty + 1; // 1-based slot number
		this.host._dirty = true;
	}

	removeZone(slot: number): void {
		if (
			slot < 1 ||
			slot > MAX_ZONES ||
			this.host._zoneConfigs[slot - 1] === null
		)
			return;
		// Clear all grid cells with this zone back to zone 0
		const cleared = clearZoneFromGrid(this.host._grid, slot);
		if (cleared) this.host._grid = cleared;
		// No renumbering — just null out the slot
		const configs = [...this.host._zoneConfigs];
		configs[slot - 1] = null;
		this.host._zoneConfigs = configs;
		if (this.host._activeZone === slot) {
			this.host._activeZone = null;
		}
		this.host._dirty = true;
		this.host.requestUpdate();
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
	): void {
		e.preventDefault();
		e.stopPropagation();
		this.host._selectedFurnitureId = id;
		const item = (this.host._furniture as FurnitureItem[]).find(
			(f) => f.id === id,
		);
		if (!item) return;

		// For rotate, find the item's center on screen
		let centerX = 0,
			centerY = 0,
			startAngle = 0;
		if (type === "rotate") {
			const el = this.host.shadowRoot?.querySelector(
				`.furniture-item[data-id="${id}"]`,
			) as HTMLElement | null;
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
			origRot: item.rotation,
			handle,
			centerX,
			centerY,
			startAngle,
		};

		const onMove = (ev: PointerEvent) => this.onFurnitureDrag(ev);
		const onUp = () => {
			this.host._dragState = null;
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}

	onFurnitureDrag(e: PointerEvent): void {
		if (!this.host._dragState) return;
		const ds = this.host._dragState;

		// Get cellPx from the grid container
		const gridEl = this.host.shadowRoot?.querySelector(
			".grid",
		) as HTMLElement | null;
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
			// Compute visible grid bounds in room-relative mm
			const bounds = getRoomBounds(this.host._grid);
			const roomCols = Math.ceil(this.host._roomWidth / GRID_CELL_MM);
			const startCol = Math.floor((GRID_COLS - roomCols) / 2);
			const visMinX = (bounds.minCol - startCol) * GRID_CELL_MM;
			const visMaxX = (bounds.maxCol + 1 - startCol) * GRID_CELL_MM;
			const visMinY = bounds.minRow * GRID_CELL_MM; // startRow = 0
			const visMaxY = (bounds.maxRow + 1) * GRID_CELL_MM;
			const pos = clampFurnitureMove(
				ds.origX,
				ds.origY,
				dx,
				dy,
				cellPx,
				item?.width ?? 0,
				item?.height ?? 0,
				visMinX,
				visMaxX,
				visMinY,
				visMaxY,
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
				rotation: computeFurnitureRotation(
					ds.origRot,
					ds.startAngle ?? 0,
					currentAngle,
				),
			});
		}
	}

	// =====================================================================
	// Template management (localStorage)
	// =====================================================================

	getTemplates(): {
		name: string;
		grid: number[];
		zones: (ZoneConfig | null)[];
		roomWidth: number;
		roomDepth: number;
		furniture?: FurnitureItem[];
	}[] {
		try {
			return JSON.parse(localStorage.getItem("epp_layout_templates") || "[]");
		} catch {
			return [];
		}
	}

	saveTemplate(): void {
		const name = (this.host._templateName as string).trim();
		if (!name) return;
		const templates = this.getTemplates();
		// Overwrite if same name exists
		const existing = templates.findIndex((t) => t.name === name);
		const entry = {
			name,
			grid: Array.from(this.host._grid as Uint8Array),
			zones: (this.host._zoneConfigs as (ZoneConfig | null)[]).map((z) =>
				z !== null ? { ...z } : null,
			),
			roomWidth: this.host._roomWidth as number,
			roomDepth: this.host._roomDepth as number,
			furniture: (this.host._furniture as FurnitureItem[]).map((f) => ({
				...f,
			})),
		};
		if (existing >= 0) {
			templates[existing] = entry;
		} else {
			templates.push(entry);
		}
		localStorage.setItem("epp_layout_templates", JSON.stringify(templates));
		this.host._showTemplateSave = false;
		this.host._templateName = "";
	}

	loadTemplate(name: string): void {
		const templates = this.getTemplates();
		const tmpl = templates.find((t) => t.name === name);
		if (!tmpl) return;
		this.host._grid = new Uint8Array(tmpl.grid);
		// Pad to 7 slots for backwards compat with old packed templates
		const zones = tmpl.zones || [];
		this.host._zoneConfigs = Array.from(
			{ length: MAX_ZONES },
			(_, i) => zones[i] ?? null,
		);
		this.host._roomWidth = tmpl.roomWidth;
		this.host._roomDepth = tmpl.roomDepth;
		this.host._furniture = (tmpl.furniture || []).map((f: any) => ({
			...f,
		}));
		this.host._showTemplateLoad = false;
	}

	deleteTemplate(name: string): void {
		const templates = this.getTemplates().filter((t) => t.name !== name);
		localStorage.setItem("epp_layout_templates", JSON.stringify(templates));
		this.host.requestUpdate();
	}

	// =====================================================================
	// Save operations
	// =====================================================================

	async applyLayout(): Promise<void> {
		// Remove zones with zero painted cells
		const zoneCellCounts = new Map<number, number>();
		for (let i = 0; i < this.host._grid.length; i++) {
			if (cellIsInside(this.host._grid[i])) {
				const zid = cellZone(this.host._grid[i]);
				if (zid > 0) {
					zoneCellCounts.set(zid, (zoneCellCounts.get(zid) ?? 0) + 1);
				}
			}
		}
		for (let i = 0; i < this.host._zoneConfigs.length; i++) {
			if (
				this.host._zoneConfigs[i] !== null &&
				(zoneCellCounts.get(i + 1) ?? 0) === 0
			) {
				this.host._zoneConfigs[i] = null;
			}
		}

		this.host._saving = true;
		try {
			await this.host.hass.callWS({
				type: "eppgrid/set_room_layout",
				mac: this.host._selectedMac,
				grid_bytes: Array.from(this.host._grid),
				room_type: this.host._roomType,
				room_trigger: this.host._roomTrigger,
				room_renew: this.host._roomRenew,
				room_timeout: this.host._roomTimeout,
				room_handoff_timeout: this.host._roomHandoffTimeout,
				room_entry_point: this.host._roomEntryPoint,
				zone_slots: (this.host._zoneConfigs as (ZoneConfig | null)[]).map(
					(z) =>
						z !== null
							? {
									name: z.name,
									color: z.color,
									type: z.type,
									trigger: z.trigger,
									renew: z.renew,
									timeout: z.timeout,
									handoff_timeout: z.handoff_timeout,
									entry_point: z.entry_point,
								}
							: null,
				),
				furniture: (this.host._furniture as FurnitureItem[]).map((f) => ({
					type: f.type,
					icon: f.icon,
					label: f.label,
					x: f.x,
					y: f.y,
					width: f.width,
					height: f.height,
					rotation: f.rotation,
					lockAspect: f.lockAspect,
				})),
			});
			this.host._dirty = false;
			this.host._view = "live";
		} finally {
			this.host._saving = false;
		}
	}

	async saveSettings(): Promise<void> {
		this.host._saving = true;
		try {
			// TODO: Settings page will be reimplemented using the new
			// set_env_calibration, set_motion_timeout, set_tracking,
			// set_static_presence websocket commands
			this.host._dirty = false;
			this.host._view = "live";
		} finally {
			this.host._saving = false;
		}
	}
}
