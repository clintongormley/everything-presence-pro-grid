import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	cellIsInside,
	cellZone,
	MAX_ZONES,
} from "./grid.js";
import type { ZoneConfig } from "./zone-defaults.js";

/**
 * CSS color strings for grid cells.
 */
export const CELL_COLOR_OUTSIDE = "var(--secondary-background-color, #e0e0e0)";
export const CELL_COLOR_ROOM = "var(--card-background-color, #fff)";
export const CELL_BG_OUT_OF_RANGE =
	"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8";
/**
 * Decoration for cells inside the 120° cone but beyond the user's configured
 * max detection range.  Same cross-hatch pattern as CELL_BG_OUT_OF_RANGE, but
 * on the inside-room white background — reads as "same visual language, lesser
 * constraint (reachable physically, limited by config)".
 */
export const CELL_BG_BEYOND_MAX_RANGE =
	"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #fff";

/**
 * Get the CSS color for a grid cell.
 *
 * - Outside cells: secondary background color
 * - Zone 0 (room default): card background color
 * - Zone 1-7: the zone's configured color
 *
 * @param cellValue The cell byte value from the grid
 * @param zoneConfigs Array of zone configurations
 * @returns CSS color string
 */
export function getCellColor(
	cellValue: number,
	zoneConfigs: (ZoneConfig | null)[],
): string {
	if (!cellIsInside(cellValue)) return CELL_COLOR_OUTSIDE;

	const zone = cellZone(cellValue);
	if (zone > 0 && zone <= MAX_ZONES) {
		const config = zoneConfigs[zone - 1];
		if (config) return config.color;
	}
	return CELL_COLOR_ROOM;
}

// Canonical overlay-stripe colors: theme error-color for interference and
// suppress, neutral dark for entry/exit. Both the grid cells and the
// overlay-sidebar swatches must derive from these — they had silently
// diverged (hardcoded rgba in the sidebar vs theme var on the cells).
const ENTRY_STRIPE_COLOR = "rgba(60,60,60,0.7)";
const ERROR_STRIPE_COLOR = "var(--error-color, #cc3333)";

function stripe(angleDeg: number, color: string, gapPx: number): string {
	// 2px-wide stripes separated by gapPx of transparency.
	return `repeating-linear-gradient(${angleDeg}deg, transparent, transparent ${gapPx}px, ${color} ${gapPx}px, ${color} ${gapPx + 2}px)`;
}

/**
 * Single source for the entry / interference / suppress stripe patterns.
 * Returns a repeating-linear-gradient list usable as background(-image).
 * The stripe pitch is the caller's: grid cells use 5-6px, the
 * overlay-sidebar's 16px swatches use 4px. Returns "" for unknown kinds.
 */
export function overlayStripeGradient(kind: number, gapPx: number): string {
	switch (kind) {
		case CELL_OVERLAY_ENTRY:
			return stripe(45, ENTRY_STRIPE_COLOR, gapPx);
		case CELL_OVERLAY_INTERFERENCE:
			return stripe(-45, ERROR_STRIPE_COLOR, gapPx);
		case CELL_OVERLAY_SUPPRESS:
			return `${stripe(-45, ERROR_STRIPE_COLOR, gapPx)}, ${stripe(45, ERROR_STRIPE_COLOR, gapPx)}`;
		default:
			return "";
	}
}
