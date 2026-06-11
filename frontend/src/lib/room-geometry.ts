import {
	cellCentreMm,
	cellIsInside,
	GRID_CELL_COUNT,
	GRID_CELL_MM,
	GRID_COLS,
	GRID_ROWS,
	getRawRoomBounds,
	MAX_RANGE,
	roomStartCol,
} from "./grid.js";
import { applyPerspective } from "./perspective.js";

/**
 * Sensor FOV geometry in room-space.
 * sensorPos: the sensor's position (mm) in room-space.
 * dirX, dirY: unit vector in room-space pointing "ahead" from sensor.
 */
export interface SensorFov {
	sensorPos: { x: number; y: number };
	dirX: number;
	dirY: number;
}

/**
 * Compute sensor FOV geometry (position + look-direction) in room-space
 * from a perspective transform.
 *
 * The sensor sits at sensor-space origin (0,0). The "ahead" direction is
 * (0, 1000) in sensor-space. We transform both through the perspective to
 * get the room-space position and direction.
 */
export function computeSensorFov(perspective: number[]): SensorFov | null {
	const origin = applyPerspective(perspective, 0, 0);
	const ahead = applyPerspective(perspective, 0, 1000);
	const dx = ahead.x - origin.x;
	const dy = ahead.y - origin.y;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (!Number.isFinite(len) || len < 1e-6) return null;
	return { sensorPos: origin, dirX: dx / len, dirY: dy / len };
}

/**
 * Get the sensor position in room-space mm by transforming sensor origin (0,0).
 * Returns null if no perspective is provided.
 */
export function getSensorRoomPosition(
	perspective: number[] | null,
): { x: number; y: number } | null {
	if (!perspective) return null;
	return applyPerspective(perspective, 0, 0);
}

/**
 * Classification of a grid cell relative to the sensor:
 *  - "in_range"         — inside the 120° cone AND within the configured max range
 *  - "out_of_cone"      — outside the 60° half-angle OR beyond the sensor's
 *                         physical MAX_RANGE (a permanent blind spot)
 *  - "beyond_max_range" — inside the cone but beyond the user's configured
 *                         max range (reachable physically, limited by config)
 */
export type CellRangeStatus = "in_range" | "out_of_cone" | "beyond_max_range";

/**
 * Classify a grid cell (col, row) relative to the sensor's FOV and range.
 *
 * @param col Grid column index
 * @param row Grid row index
 * @param fov Sensor FOV geometry (null = no calibration; always "in_range")
 * @param roomWidth Room width in mm
 * @param maxRangeMm Maximum detection range in mm (user-configured)
 */
export function classifyCellInSensor(
	col: number,
	row: number,
	fov: SensorFov | null,
	roomWidth: number,
	maxRangeMm: number,
): CellRangeStatus {
	if (!fov) return "in_range"; // no calibration — allow all

	// Cell centre in room-space mm
	const { x: rx, y: ry } = cellCentreMm(col, row, roomWidth);

	// Vector from sensor to cell in room-space
	const dx = rx - fov.sensorPos.x;
	const dy = ry - fov.sensorPos.y;
	const distSq = dx * dx + dy * dy;
	if (distSq < 1) return "in_range"; // at sensor position

	// Angle check (120° cone): dot/dist >= cos(60°) = 0.5.
	const dot = dx * fov.dirX + dy * fov.dirY;
	if (dot <= 0) return "out_of_cone"; // behind sensor
	if (dot * dot < 0.25 * distSq) return "out_of_cone"; // angle > 60°

	// Beyond physical sensor reach → also out-of-cone (permanent blind spot).
	if (distSq > MAX_RANGE * MAX_RANGE) return "out_of_cone";

	// Inside cone; compare against configured range.
	if (distSq > maxRangeMm * maxRangeMm) return "beyond_max_range";

	return "in_range";
}

/**
 * Check if a grid cell (col, row) is within the sensor's FOV and range.
 *
 * @param col Grid column index
 * @param row Grid row index
 * @param fov Sensor FOV geometry (null = no calibration, allow all)
 * @param roomWidth Room width in mm
 * @param maxRangeMm Maximum detection range in mm
 * @returns true if the cell is within the sensor's FOV and range
 */
export function isCellInSensorRange(
	col: number,
	row: number,
	fov: SensorFov | null,
	roomWidth: number,
	maxRangeMm: number,
): boolean {
	return (
		classifyCellInSensor(col, row, fov, roomWidth, maxRangeMm) === "in_range"
	);
}

/**
 * Room bounds (with 1-cell padding) of inside cells that the sensor could
 * physically reach — i.e. that are not out of the FOV cone.  Cells that are
 * inside but beyond the user's configured max range stay in bounds so the
 * "beyond-max-range" decoration can be drawn on them; only true blind-spot
 * cells (outside the 120° cone or past MAX_RANGE) collapse the grid.
 */
export function getVisibleRoomBounds(
	grid: Uint8Array,
	fov: SensorFov | null,
	roomWidth: number,
	maxRangeMm: number,
): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
	let minCol = GRID_COLS;
	let maxCol = 0;
	let minRow = GRID_ROWS;
	let maxRow = 0;
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (!cellIsInside(grid[i])) continue;
		const col = i % GRID_COLS;
		const row = Math.floor(i / GRID_COLS);
		if (
			classifyCellInSensor(col, row, fov, roomWidth, maxRangeMm) ===
			"out_of_cone"
		)
			continue;
		if (col < minCol) minCol = col;
		if (col > maxCol) maxCol = col;
		if (row < minRow) minRow = row;
		if (row > maxRow) maxRow = row;
	}
	if (minCol > maxCol) return { minCol, maxCol, minRow, maxRow };
	return {
		minCol: Math.max(0, minCol - 1),
		maxCol: Math.min(GRID_COLS - 1, maxCol + 1),
		minRow: Math.max(0, minRow - 1),
		maxRow: Math.min(GRID_ROWS - 1, maxRow + 1),
	};
}

/**
 * Convert cell-space bounds (e.g. from `getRoomBounds` or
 * `getVisibleRoomBounds`) to room-relative mm extents — the coordinate
 * space furniture positions live in. The caller chooses which bounds to
 * pass: physical room bounds vs FOV-aware visible bounds carry different
 * semantics (save-filtering vs drag-clamping) and must not be conflated.
 */
export function boundsToRoomMm(
	bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number },
	roomWidthMm: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
	const startCol = roomStartCol(roomWidthMm);
	return {
		minX: (bounds.minCol - startCol) * GRID_CELL_MM,
		maxX: (bounds.maxCol + 1 - startCol) * GRID_CELL_MM,
		minY: bounds.minRow * GRID_CELL_MM, // startRow = 0 (sensor at front wall)
		maxY: (bounds.maxRow + 1) * GRID_CELL_MM,
	};
}

/**
 * Compute the effective maximum range in mm, given the current settings.
 *
 * When auto-range is enabled, uses the auto-computed range (capped at 6m).
 * Otherwise uses the manual distance.
 *
 * @param targetAutoRange Whether auto-range is enabled
 * @param autoRange Auto-computed range in metres (0 = fallback to 6m)
 * @param targetMaxDistance Manual max distance in metres
 * @returns Max range in mm
 */
export function computeMaxRangeMm(
	targetAutoRange: boolean,
	autoRange: number,
	targetMaxDistance: number,
): number {
	return (
		(targetAutoRange
			? autoRange > 0
				? Math.min(autoRange, 6)
				: 6
			: targetMaxDistance) * 1000
	);
}

/**
 * Auto-compute the detection range (in metres, rounded up to nearest 0.5m)
 * based on the furthest room cell from the sensor.
 *
 * @param roomWidth Room width in mm
 * @param roomDepth Room depth in mm
 * @param perspective Perspective coefficients (null = no calibration)
 * @param grid The grid array
 * @returns Range in metres (rounded up to nearest 0.5m), or 0 if room dimensions are invalid
 */
export function autoDetectionRange(
	roomWidth: number,
	roomDepth: number,
	perspective: number[] | null,
	grid: Uint8Array,
): number {
	if (roomWidth <= 0 || roomDepth <= 0) return 0;

	// Compute max room-space distance from sensor to any room cell
	const sensorPos = getSensorRoomPosition(perspective);
	if (sensorPos) {
		let maxDistMm = 0;
		const raw = getRawRoomBounds(grid);
		for (let r = raw.minRow; r <= raw.maxRow; r++) {
			for (let c = raw.minCol; c <= raw.maxCol; c++) {
				const idx = r * GRID_COLS + c;
				if (!cellIsInside(grid[idx])) continue;
				const { x: rx, y: ry } = cellCentreMm(c, r, roomWidth);
				const dx = rx - sensorPos.x;
				const dy = ry - sensorPos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > maxDistMm) maxDistMm = dist;
			}
		}
		if (maxDistMm > 0) {
			const m = maxDistMm / 1000;
			return Math.ceil(m * 2) / 2; // round up to nearest 0.5m
		}
	}

	// Fallback: use room dimensions
	const maxMm = Math.max(roomWidth, roomDepth);
	const m = maxMm / 1000;
	return Math.ceil(m * 2) / 2;
}

/**
 * Compute room dimensions from wizard corner measurements.
 *
 * Width = distance between corners 0 and 1.
 * Depth = average of distance(corner 0, corner 3) and distance(corner 1, corner 2).
 *
 * @param corners Array of 4 corner points with raw_x, raw_y coordinates
 * @returns { width, depth } in integer mm
 */
export function autoComputeRoomDimensions(
	corners: { raw_x: number; raw_y: number }[],
): { width: number; depth: number } {
	const dist = (
		a: { raw_x: number; raw_y: number },
		b: { raw_x: number; raw_y: number },
	): number => Math.sqrt((a.raw_x - b.raw_x) ** 2 + (a.raw_y - b.raw_y) ** 2);

	const width = Math.round(dist(corners[0], corners[1]));
	const depthLeft = dist(corners[0], corners[3]);
	const depthRight = dist(corners[1], corners[2]);
	const depth = Math.round((depthLeft + depthRight) / 2);

	return { width, depth };
}

/**
 * Compute the median of an array of numbers.
 * For even-length arrays, returns the average of the two middle values.
 *
 * @param values Array of numbers (will be sorted internally)
 * @returns The median value, or 0 for empty arrays
 */
export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute median x/y from a set of sample points.
 * Used in the wizard capture flow to get a stable position from noisy readings.
 *
 * @param samples Array of {x, y} points
 * @returns { x, y } median position, or null if no samples
 */
export function medianPoint(
	samples: { x: number; y: number }[],
): { x: number; y: number } | null {
	if (samples.length === 0) return null;
	return {
		x: median(samples.map((s) => s.x)),
		y: median(samples.map((s) => s.y)),
	};
}

/**
 * Compute room dimensions and furthest point from sensor based on grid.
 *
 * When `fov` and `maxRangeMm` are supplied, only cells that are both
 * inside the room AND within the sensor's FOV/range are considered.
 * This prevents out-of-FOV (hatched) cells from inflating the metrics.
 *
 * @param grid The grid array
 * @param roomWidth Room width in mm
 * @param perspective Perspective coefficients (null = no calibration)
 * @param fov Sensor FOV geometry (null = count all inside cells)
 * @param maxRangeMm Maximum detection range in mm (ignored when fov is null)
 * @returns { widthM, depthM, furthestM } as numbers in metres,
 *          or null if grid has no visible cells
 */
export function getGridRoomMetrics(
	grid: Uint8Array,
	roomWidth: number,
	perspective: number[] | null,
	fov?: SensorFov | null,
	maxRangeMm?: number,
): { widthM: number; depthM: number; furthestM: number } | null {
	// Compute bounds first, then compute furthest distance in a second pass.
	let minCol = GRID_COLS;
	let maxCol = 0;
	let minRow = GRID_ROWS;
	let maxRow = 0;

	let maxDistSq = 0;

	// First pass: determine bounds (needed for fallback sensor position)
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (!cellIsInside(grid[i])) continue;
		const col = i % GRID_COLS;
		const row = Math.floor(i / GRID_COLS);
		if (
			fov &&
			maxRangeMm != null &&
			classifyCellInSensor(col, row, fov, roomWidth, maxRangeMm) ===
				"out_of_cone"
		)
			continue;
		if (col < minCol) minCol = col;
		if (col > maxCol) maxCol = col;
		if (row < minRow) minRow = row;
		if (row > maxRow) maxRow = row;
	}

	if (minCol > maxCol) return null;

	const widthMm = (maxCol - minCol + 1) * GRID_CELL_MM;
	const depthMm = (maxRow - minRow + 1) * GRID_CELL_MM;

	// Sensor position: prefer fov (when provided), then perspective, then fallback
	const sensorPos = fov?.sensorPos ?? getSensorRoomPosition(perspective);
	const sensorMmX = sensorPos ? sensorPos.x : widthMm / 2;
	const sensorMmY = sensorPos ? sensorPos.y : 0;

	// Second pass: furthest visible cell from sensor
	for (let i = 0; i < GRID_CELL_COUNT; i++) {
		if (!cellIsInside(grid[i])) continue;
		const col = i % GRID_COLS;
		const row = Math.floor(i / GRID_COLS);
		if (
			fov &&
			maxRangeMm != null &&
			classifyCellInSensor(col, row, fov, roomWidth, maxRangeMm) ===
				"out_of_cone"
		)
			continue;
		const { x: cellMmX, y: cellMmY } = cellCentreMm(col, row, roomWidth);
		const dx = cellMmX - sensorMmX;
		const dy = cellMmY - sensorMmY;
		const distSq = dx * dx + dy * dy;
		if (distSq > maxDistSq) maxDistSq = distSq;
	}

	return {
		widthM: widthMm / 1000,
		depthM: depthMm / 1000,
		furthestM: Math.sqrt(maxDistSq) / 1000,
	};
}
