// Bit 0: room (0=outside, 1=inside)
// Bits 1-3: zone (0=room default, 1-7=named zone)
// Bits 4-5: overlay (0=none, 1=entry, 2=interference, 3=suppress)
// Bits 6-7: unused
export const CELL_ROOM_BIT = 0x01;
export const CELL_ZONE_MASK = 0x0e; // bits 1-3
export const CELL_ZONE_SHIFT = 1;
export const CELL_OVERLAY_MASK = 0x30; // bits 4-5
export const CELL_OVERLAY_SHIFT = 4;
export const CELL_ZONE_AND_OVERLAY_MASK = 0x3e; // bits 1-5
export const CELL_OVERLAY_NONE = 0;
export const CELL_OVERLAY_ENTRY = 1;
export const CELL_OVERLAY_INTERFERENCE = 2;
export const CELL_OVERLAY_SUPPRESS = 3;
export const MAX_ZONES = 7; // named zones 1-7
export const NUM_ZONE_SLOTS = 8; // zone 0 + named zones 1-7

export const GRID_COLS = 20;
export const GRID_ROWS = 20;
export const GRID_CELL_COUNT = GRID_COLS * GRID_ROWS;
export const GRID_CELL_MM = 300; // each cell represents 300mm x 300mm
export const MAX_RANGE = 6000;

export const cellIsInside = (v: number): boolean => (v & CELL_ROOM_BIT) !== 0;
export const cellZone = (v: number): number => (v >> CELL_ZONE_SHIFT) & 0x07;
export const cellSetInside = (v: number, inside: boolean): number =>
	inside ? v | CELL_ROOM_BIT : v & ~CELL_ROOM_BIT;
export const cellSetZone = (v: number, zone: number): number =>
	(v & ~CELL_ZONE_MASK) | ((zone & 0x07) << CELL_ZONE_SHIFT);
export const cellOverlay = (v: number): number =>
	(v >> CELL_OVERLAY_SHIFT) & 0x03;
export const cellSetOverlay = (v: number, kind: number): number =>
	(v & ~CELL_OVERLAY_MASK) | ((kind & 0x03) << CELL_OVERLAY_SHIFT);

/** UI-level overlay mode. null = not in overlay paint mode. */
export type OverlayMode = "entry" | "interference" | "suppress" | null;

export const OVERLAY_MODE_TO_KIND: Record<NonNullable<OverlayMode>, number> = {
	entry: CELL_OVERLAY_ENTRY,
	interference: CELL_OVERLAY_INTERFERENCE,
	suppress: CELL_OVERLAY_SUPPRESS,
};

interface GridBounds {
	minCol: number;
	maxCol: number;
	minRow: number;
	maxRow: number;
}

/** Get raw room bounds without padding (only actual inside cells). */
export function getRawRoomBounds(grid: Uint8Array): GridBounds {
	let minCol = GRID_COLS;
	let maxCol = 0;
	let minRow = GRID_ROWS;
	let maxRow = 0;
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (cellIsInside(grid[i])) {
			const col = i % GRID_COLS;
			const row = Math.floor(i / GRID_COLS);
			if (col < minCol) minCol = col;
			if (col > maxCol) maxCol = col;
			if (row < minRow) minRow = row;
			if (row > maxRow) maxRow = row;
		}
	}
	return { minCol, maxCol, minRow, maxRow };
}

/** Get room bounds with 1-cell padding around inside cells. */
export function getRoomBounds(grid: Uint8Array): GridBounds {
	const { minCol, maxCol, minRow, maxRow } = getRawRoomBounds(grid);
	return {
		minCol: Math.max(0, minCol - 1),
		maxCol: Math.min(GRID_COLS - 1, maxCol + 1),
		minRow: Math.max(0, minRow - 1),
		maxRow: Math.min(GRID_ROWS - 1, maxRow + 1),
	};
}

/** Returns true if any cell has the inside-room bit set. */
export function gridHasInsideRoom(grid: Uint8Array): boolean {
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (cellIsInside(grid[i])) return true;
	}
	return false;
}

/**
 * Compute the cell-space bounding-box offset between two grids' inside-room
 * footprints. Returns `(0, 0)` if either grid has no inside-room cells.
 * Callers that have already computed the `hasInsideRoom` flags for either
 * grid can pass them to avoid the redundant scans.
 */
export function computeAlignmentOffset(
	templateGrid: Uint8Array,
	currentGrid: Uint8Array,
	templateHasRoom?: boolean,
	currentHasRoom?: boolean,
): { dr: number; dc: number } {
	const tHasRoom = templateHasRoom ?? gridHasInsideRoom(templateGrid);
	const cHasRoom = currentHasRoom ?? gridHasInsideRoom(currentGrid);
	if (!tHasRoom || !cHasRoom) {
		return { dr: 0, dc: 0 };
	}
	const tBounds = getRawRoomBounds(templateGrid);
	const cBounds = getRawRoomBounds(currentGrid);
	return {
		dr: cBounds.minRow - tBounds.minRow,
		dc: cBounds.minCol - tBounds.minCol,
	};
}

/**
 * Translate template zone/overlay bits to align with the current grid's
 * inside-room footprint. Inside-room bits come from `currentGrid`; template
 * bits that fall outside the current inside-room (or out of bounds) are
 * silently dropped. The function is otherwise pure but emits a `console.warn`
 * in the two fallback branches (empty current grid, or empty template grid).
 */
export function alignTemplateGrid(
	templateGrid: Uint8Array,
	currentGrid: Uint8Array,
): Uint8Array {
	const tHasRoom = gridHasInsideRoom(templateGrid);
	const cHasRoom = gridHasInsideRoom(currentGrid);

	// Empty-current fallback: verbatim template copy.
	if (!cHasRoom) {
		console.warn(
			"[eppgrid] alignTemplateGrid: current grid has no inside-room cells; falling back to verbatim template copy",
		);
		return new Uint8Array(templateGrid);
	}

	const result = new Uint8Array(GRID_CELL_COUNT);
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		result[i] = currentGrid[i] & CELL_ROOM_BIT;
	}

	if (!tHasRoom) {
		console.warn(
			"[eppgrid] alignTemplateGrid: template has no inside-room cells; falling back to offset (0,0)",
		);
	}
	const { dr, dc } = computeAlignmentOffset(
		templateGrid,
		currentGrid,
		tHasRoom,
		cHasRoom,
	);

	for (let r = 0; r < GRID_ROWS; r++) {
		for (let c = 0; c < GRID_COLS; c++) {
			const srcIdx = r * GRID_COLS + c;
			const srcCell = templateGrid[srcIdx];
			if (tHasRoom && (srcCell & CELL_ROOM_BIT) === 0) continue;
			const tBits = srcCell & CELL_ZONE_AND_OVERLAY_MASK;
			if (tBits === 0) continue;
			const r2 = r + dr;
			const c2 = c + dc;
			if (r2 < 0 || r2 >= GRID_ROWS || c2 < 0 || c2 >= GRID_COLS) continue;
			const destIdx = r2 * GRID_COLS + c2;
			if ((result[destIdx] & CELL_ROOM_BIT) === 0) continue;
			result[destIdx] |= tBits;
		}
	}

	return result;
}

/**
 * First grid column occupied by the room. The room is centered horizontally
 * in the 20-column grid; partial cells round up to a whole column. This is
 * the single source of the cell-space ↔ room-space x-offset — every
 * conversion between grid columns and room-relative mm must go through it.
 */
export function roomStartCol(roomWidthMm: number): number {
	const roomCols = Math.ceil(roomWidthMm / GRID_CELL_MM);
	return Math.floor((GRID_COLS - roomCols) / 2);
}

/**
 * Centre of grid cell (col, row) in room-space mm. Rows are anchored at the
 * front wall (startRow = 0, where the sensor sits), so y is room-width
 * independent; x is relative to the room's left edge and can be negative
 * for columns left of the room.
 */
export function cellCentreMm(
	col: number,
	row: number,
	roomWidthMm: number,
): { x: number; y: number } {
	return {
		x: (col - roomStartCol(roomWidthMm) + 0.5) * GRID_CELL_MM,
		y: (row + 0.5) * GRID_CELL_MM,
	};
}

/** Initialize a grid from room dimensions (mm). Room is centered horizontally. */
export function initGridFromRoom(
	roomWidth: number,
	roomDepth: number,
): Uint8Array {
	const grid = new Uint8Array(GRID_CELL_COUNT);

	const roomCols = Math.ceil(roomWidth / GRID_CELL_MM);
	const roomRows = Math.ceil(roomDepth / GRID_CELL_MM);
	const startCol = roomStartCol(roomWidth);
	const startRow = 0; // sensor is at front wall

	for (let r = 0; r < GRID_ROWS; r++) {
		for (let c = 0; c < GRID_COLS; c++) {
			const idx = r * GRID_COLS + c;
			const inRoom =
				c >= startCol &&
				c < startCol + roomCols &&
				r >= startRow &&
				r < startRow + roomRows;

			if (inRoom) {
				grid[idx] = CELL_ROOM_BIT; // inside room, zone 0
			}
		}
	}

	return grid;
}
