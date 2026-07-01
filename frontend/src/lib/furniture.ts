import { GRID_CELL_MM } from "./grid.js";

export interface FurnitureItem {
	id: string;
	type: "icon" | "svg";
	icon: string;
	label: string;
	x: number; // mm from left edge of room
	y: number; // mm from top edge of room
	width: number; // mm
	height: number; // mm
	rotation: number; // degrees
	lockAspect: boolean;
}

export interface FurnitureSticker {
	type: "icon" | "svg";
	icon: string;
	label: string;
	defaultWidth: number; // mm
	defaultHeight: number; // mm
	lockAspect?: boolean;
}

/**
 * Create a new furniture item from a sticker definition, centered in the room.
 *
 * @param sticker The sticker definition to create from
 * @param roomWidth Room width in mm
 * @param roomDepth Room depth in mm
 * @param id Unique ID for the item (pass a generated ID)
 * @returns A new FurnitureItem
 */
export function createFurnitureItem(
	sticker: FurnitureSticker,
	roomWidth: number,
	roomDepth: number,
	id: string,
): FurnitureItem {
	return {
		id,
		type: sticker.type,
		icon: sticker.icon,
		label: sticker.label,
		x: Math.max(0, (roomWidth - sticker.defaultWidth) / 2),
		y: Math.max(0, (roomDepth - sticker.defaultHeight) / 2),
		width: sticker.defaultWidth,
		height: sticker.defaultHeight,
		rotation: 0,
		lockAspect: sticker.lockAspect ?? sticker.type === "icon",
	};
}

/**
 * Remove a furniture item by ID from the list.
 *
 * @param furniture Current list of furniture items
 * @param id ID of the item to remove
 * @returns New filtered list (does not mutate original)
 */
export function removeFurnitureItem(
	furniture: FurnitureItem[],
	id: string,
): FurnitureItem[] {
	return furniture.filter((f) => f.id !== id);
}

/**
 * Update a furniture item by ID with partial updates.
 *
 * @param furniture Current list of furniture items
 * @param id ID of the item to update
 * @param updates Partial updates to apply
 * @returns New list with updated item (does not mutate original)
 */
export function updateFurnitureItem(
	furniture: FurnitureItem[],
	id: string,
	updates: Partial<FurnitureItem>,
): FurnitureItem[] {
	return furniture.map((f) => (f.id === id ? { ...f, ...updates } : f));
}

/**
 * Convert mm in room-space to px in the visible grid.
 *
 * @param mm Distance in millimetres
 * @param cellPx Width of a grid cell in pixels
 * @returns Distance in pixels
 */
export function mmToPx(mm: number, cellPx: number): number {
	return (mm / GRID_CELL_MM) * (cellPx + 1); // +1 for gap
}

/**
 * Convert px delta back to mm.
 *
 * @param px Distance in pixels
 * @param cellPx Width of a grid cell in pixels
 * @returns Distance in millimetres
 */
export function pxToMm(px: number, cellPx: number): number {
	return (px / (cellPx + 1)) * GRID_CELL_MM;
}

/**
 * Half-difference between an item's rotation-aware visual bounding box and
 * its unrotated box, per axis. CSS rotation pivots about the item's center,
 * so the rendered (visual) box is the unrotated box inflated by `dxBox` on
 * each horizontal side and `dyBox` on each vertical side. Shared by
 * `clampFurnitureMove` (drag clamping) and `isFurnitureOutsideGrid`
 * (save-time filtering) so the two can't disagree about what "on the grid"
 * means.
 */
function visualBoxOffsets(
	itemWidth: number,
	itemHeight: number,
	rotationDeg: number,
): { dxBox: number; dyBox: number } {
	const rad = (rotationDeg * Math.PI) / 180;
	const absCos = Math.abs(Math.cos(rad));
	const absSin = Math.abs(Math.sin(rad));
	const visualWidth = itemWidth * absCos + itemHeight * absSin;
	const visualHeight = itemWidth * absSin + itemHeight * absCos;
	return {
		dxBox: (visualWidth - itemWidth) / 2,
		dyBox: (visualHeight - itemHeight) / 2,
	};
}

/**
 * Compute clamped move position for a furniture item being dragged.
 *
 * Clamps the position so the item's visual (rotation-aware) bounding box
 * stays within the given bounds. CSS rotation pivots about the item's
 * center, so a rotated item's rendered extent differs from its unrotated
 * width/height — without accounting for that, a 90°-rotated sofa would
 * be stopped too early on one axis and leak off-grid on the other.
 *
 * @param origX Original X position (mm, top-left of unrotated bounding box)
 * @param origY Original Y position (mm, top-left of unrotated bounding box)
 * @param dxPx Drag delta X in pixels
 * @param dyPx Drag delta Y in pixels
 * @param cellPx Current cell pixel size
 * @param itemWidth Item width in mm (unrotated)
 * @param itemHeight Item height in mm (unrotated)
 * @param minX Minimum X bound (mm, room-relative)
 * @param maxX Maximum X bound (mm, room-relative)
 * @param minY Minimum Y bound (mm, room-relative)
 * @param maxY Maximum Y bound (mm, room-relative)
 * @param rotationDeg Item rotation in degrees (CW, matches CSS transform)
 * @returns Clamped { x, y } position in mm
 */
export function clampFurnitureMove(
	origX: number,
	origY: number,
	dxPx: number,
	dyPx: number,
	cellPx: number,
	itemWidth: number,
	itemHeight: number,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	rotationDeg: number,
): { x: number; y: number } {
	const dxMm = pxToMm(dxPx, cellPx);
	const dyMm = pxToMm(dyPx, cellPx);
	const { dxBox, dyBox } = visualBoxOffsets(itemWidth, itemHeight, rotationDeg);
	return {
		x: Math.max(minX + dxBox, Math.min(maxX - itemWidth - dxBox, origX + dxMm)),
		y: Math.max(
			minY + dyBox,
			Math.min(maxY - itemHeight - dyBox, origY + dyMm),
		),
	};
}

/**
 * Whether a resize handle is a corner — it carries both a horizontal (e/w) and
 * a vertical (n/s) component, e.g. "ne", "sw" — as opposed to an edge ("n",
 * "s", "e", "w"). This is the single structural definition of "corner"; both
 * the resize constraint (`isProportionalResize`) and the rendered corner set
 * (`CORNER_HANDLES`) derive from it, so the two can't drift apart.
 */
function isCornerHandle(handle: string): boolean {
	const horizontal = handle.includes("e") || handle.includes("w");
	const vertical = handle.includes("n") || handle.includes("s");
	return horizontal && vertical;
}

/**
 * Decide whether a resize should preserve the item's aspect ratio.
 *
 * The constraint is encoded in the handle: corner handles resize
 * proportionally; edge handles ("n", "s", "e", "w") stretch a single axis. A
 * hard-locked item is always proportional, regardless of which handle is used.
 *
 * @param handle Resize handle id (e.g. "ne", "e")
 * @param hardLock Whether the item is aspect-locked (never distortable)
 * @returns true to preserve aspect ratio, false to resize one axis freely
 */
export function isProportionalResize(
	handle: string,
	hardLock: boolean,
): boolean {
	return hardLock || isCornerHandle(handle);
}

/**
 * On-screen size (px, shorter side) below which an unlocked item shows corner
 * handles only. Eight ~44px touch targets overlap on a smaller item, so a
 * finger can't reliably pick an edge vs a corner; collapsing to corners keeps
 * the safe (proportional) default. Zooming in (larger cellPx) reveals the edge
 * handles. Tunable — starting value, validate against touch devices.
 */
export const EDGE_HANDLE_MIN_PX = 120;

// All eight resize handles, in render order. CORNER_HANDLES derives from this
// via isCornerHandle, so the corner/edge split lives in exactly one place.
const ALL_HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
const CORNER_HANDLES = ALL_HANDLES.filter(isCornerHandle);

/**
 * Which resize handles to render for a selected item.
 *
 * Corner handles are always shown (proportional resize). Edge handles — which
 * stretch a single axis — are shown only for an unlocked item that is large
 * enough on screen for the extra touch targets to be distinguishable.
 *
 * @param hardLock Whether the item is aspect-locked (never distortable)
 * @param tooSmall Whether the item is below EDGE_HANDLE_MIN_PX on its short side
 * @returns Handle ids to render
 */
export function visibleHandles(
	hardLock: boolean,
	tooSmall: boolean,
): readonly string[] {
	return hardLock || tooSmall ? CORNER_HANDLES : ALL_HANDLES;
}

/**
 * Compute resized dimensions for a furniture item.
 *
 * Supports locked-aspect (uniform) and free-form resize, with per-handle
 * direction control. The pointer delta is in screen-space pixels; this
 * function inverse-rotates it into the item's local frame so that handles
 * remain intuitive after rotation, and computes (x, y) so the visual
 * opposite edge/corner stays anchored on screen (since CSS rotation pivots
 * about the item's center).
 *
 * @param handle Resize handle id (e.g. "ne", "sw", "e", "n")
 * @param dxPx Drag delta X in screen pixels
 * @param dyPx Drag delta Y in screen pixels
 * @param cellPx Current cell pixel size
 * @param origX Original X position (mm, top-left of unrotated bounding box)
 * @param origY Original Y position (mm, top-left of unrotated bounding box)
 * @param origW Original width (mm)
 * @param origH Original height (mm)
 * @param hardLock Whether the item is aspect-locked (never distortable)
 * @param rotationDeg Item rotation in degrees (CW, matches CSS transform)
 * @returns Updated { x, y, width, height }
 */
export function computeFurnitureResize(
	handle: string,
	dxPx: number,
	dyPx: number,
	cellPx: number,
	origX: number,
	origY: number,
	origW: number,
	origH: number,
	hardLock: boolean,
	rotationDeg: number,
): { x: number; y: number; width: number; height: number } {
	// Inverse-rotate the screen-space pointer delta into the item's local
	// (unrotated) frame, so handle directions stay intuitive after rotation.
	const rad = (rotationDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const localDxPx = dxPx * cos + dyPx * sin;
	const localDyPx = -dxPx * sin + dyPx * cos;

	const dxMm = pxToMm(localDxPx, cellPx);
	const dyMm = pxToMm(localDyPx, cellPx);

	// Edge sign: +1 = east/south, -1 = west/north, 0 = centered (no axis).
	const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
	const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;

	let w = origW;
	let h = origH;

	if (isProportionalResize(handle, hardLock)) {
		// Uniform scale from the dominant axis (in local frame), signed by
		// THAT axis's own edge sign so dragging outward always grows and
		// inward always shrinks. A blanket "any negative edge → -1" would
		// invert mixed-sign corners: ne (sx=1, sy=-1) on a horizontal-
		// dominant eastward drag, and sw (sx=-1, sy=1) on a vertical-
		// dominant southward drag. Edge handles (sx or sy = 0) only follow
		// their own axis.
		const horizontalDominant =
			sx !== 0 && (sy === 0 || Math.abs(dxMm) > Math.abs(dyMm));
		const delta = horizontalDominant ? sx * dxMm : sy * dyMm;
		const aspect = origW / origH;
		w = Math.max(100, origW + delta);
		h = Math.max(100, w / aspect);
		w = h * aspect;
	} else {
		if (sx !== 0) w = Math.max(100, origW + sx * dxMm);
		if (sy !== 0) h = Math.max(100, origH + sy * dyMm);
	}

	const dw = w - origW;
	const dh = h - origH;

	// Compute (x, y) so the visual opposite edge/corner stays anchored on
	// screen. The opposite edge offset from the center in the local frame is
	// (-sx·w/2, -sy·h/2); requiring that point's screen position to be
	// invariant under the resize gives:
	//   x' = origX - dw/2 + R(θ)·(sx·dw/2, sy·dh/2).x
	//   y' = origY - dh/2 + R(θ)·(sx·dw/2, sy·dh/2).y
	const rdx = (sx * dw) / 2;
	const rdy = (sy * dh) / 2;
	const rotatedDx = rdx * cos - rdy * sin;
	const rotatedDy = rdx * sin + rdy * cos;

	const x = origX - dw / 2 + rotatedDx;
	const y = origY - dh / 2 + rotatedDy;

	return { x, y, width: w, height: h };
}

/**
 * Check whether a furniture item is completely outside the visible grid bounds.
 *
 * Returns true when the item's rotation-aware VISUAL bounding box (what the
 * user actually sees rendered) has zero overlap with the grid area defined
 * by [minX, maxX) x [minY, maxY). Using the unrotated box would classify a
 * 90°-rotated elongated item that visibly overlaps the grid as fully
 * outside — and silently drop it on save. `rotation` is optional so plain
 * x/y/w/h boxes (rotation 0) keep working.
 */
export function isFurnitureOutsideGrid(
	item: Pick<FurnitureItem, "x" | "y" | "width" | "height"> & {
		rotation?: number;
	},
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
): boolean {
	const { dxBox, dyBox } = visualBoxOffsets(
		item.width,
		item.height,
		item.rotation ?? 0,
	);
	return (
		item.x + item.width + dxBox <= minX ||
		item.x - dxBox >= maxX ||
		item.y + item.height + dyBox <= minY ||
		item.y - dyBox >= maxY
	);
}

/**
 * Filter a furniture sticker catalog by a free-text query and return it
 * sorted alphabetically by translated label.
 *
 * Both the filter and the sort operate on the *translated* label so the
 * user sees results in their own language order.
 *
 * @param stickers Source catalog (not mutated)
 * @param query User search input (case-insensitive substring match; trimmed)
 * @param localize Function that translates a label key to a display string
 */
export function filterAndSortStickers(
	stickers: FurnitureSticker[],
	query: string,
	localize: (key: string) => string,
): FurnitureSticker[] {
	const trimmed = query.trim().toLowerCase();
	// Translate once per sticker — `localize` may do expensive i18n lookups
	// and the sort comparator would otherwise call it O(n log n) times.
	const localized = stickers.map((sticker) => {
		const localizedLabel = localize(sticker.label);
		return {
			sticker,
			localizedLabel,
			normalizedLabel: localizedLabel.toLowerCase(),
		};
	});
	const filtered = trimmed
		? localized.filter((s) => s.normalizedLabel.includes(trimmed))
		: localized;
	return filtered
		.slice()
		.sort((a, b) => a.localizedLabel.localeCompare(b.localizedLabel))
		.map((s) => s.sticker);
}

/**
 * Pick the appropriate CSS resize cursor for a handle on a rotated item.
 *
 * Browser resize cursors are bidirectional (n-resize and s-resize render
 * identically), so we only need 4 buckets and snap the visual handle angle
 * to the nearest 45° within [0°, 180°).
 *
 * @param handle Resize handle id (e.g. "n", "ne", "se")
 * @param rotationDeg Item rotation in degrees (CW, matches CSS transform)
 * @returns CSS cursor name: "ns-resize" | "ew-resize" | "nesw-resize" | "nwse-resize"
 */
export function getResizeCursor(handle: string, rotationDeg: number): string {
	const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
	const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
	// Base angle CW from north for each handle (n=0°, ne=45°, e=90°, ...)
	const baseAngle = (Math.atan2(sx, -sy) * 180) / Math.PI;
	const wrapped = (((baseAngle + rotationDeg) % 180) + 180) % 180;
	const snapped = (Math.round(wrapped / 45) * 45) % 180;
	// snapped is one of {0, 45, 90, 135} by construction
	switch (snapped) {
		case 0:
			return "ns-resize";
		case 45:
			return "nesw-resize";
		case 90:
			return "ew-resize";
		default:
			return "nwse-resize";
	}
}

/**
 * Compute the new rotation angle for a furniture item being rotated.
 *
 * @param origRotation Original rotation in degrees
 * @param startAngle Angle from item center to pointer at drag start (degrees)
 * @param currentAngle Current angle from item center to pointer (degrees)
 * @returns New rotation angle (0-359 degrees, rounded to integer)
 */
export function computeFurnitureRotation(
	origRotation: number,
	startAngle: number,
	currentAngle: number,
): number {
	const deltaAngle = currentAngle - startAngle;
	return Math.round((origRotation + deltaAngle + 360) % 360);
}

/**
 * Magnetically snap a rotation (degrees) to the nearest `step` multiple when
 * within `threshold` degrees of it; otherwise leave it free. Lets furniture
 * "prefer" 15° increments while still allowing any angle. Applied only on the
 * rotate drag (not to typed rotation values).
 */
export function snapRotation(angle: number, step = 15, threshold = 7): number {
	const a = ((angle % 360) + 360) % 360;
	const nearest = (Math.round(a / step) * step) % 360;
	let diff = Math.abs(a - nearest);
	if (diff > 180) diff = 360 - diff;
	return diff < threshold ? nearest : Math.round(a) % 360;
}
