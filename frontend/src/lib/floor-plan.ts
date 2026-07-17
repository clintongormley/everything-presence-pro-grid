export interface GridBoundsLike {
	minCol: number;
	maxCol: number;
	minRow: number;
	maxRow: number;
}

export interface RectPct {
	leftPct: number;
	topPct: number;
	widthPct: number;
	heightPct: number;
}

/**
 * Position of the room's raw-bounds rectangle as percentages of the visible
 * grid, in the SAME coordinate space `epp-grid` uses to place target dots
 * (percent of visCols/visRows over `.grid-targets-wrapper`). Sharing that space
 * is what makes the floor plan and the target dots line up exactly.
 */
export function planRectPct(
	raw: GridBoundsLike,
	minCol: number,
	minRow: number,
	visCols: number,
	visRows: number,
): RectPct {
	return {
		leftPct: ((raw.minCol - minCol) / visCols) * 100,
		topPct: ((raw.minRow - minRow) / visRows) * 100,
		widthPct: ((raw.maxCol - raw.minCol + 1) / visCols) * 100,
		heightPct: ((raw.maxRow - raw.minRow + 1) / visRows) * 100,
	};
}
