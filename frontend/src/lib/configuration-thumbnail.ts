import type { SVGTemplateResult } from "lit";
import { svg } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { FLOOR_PLAN_SVGS } from "../constants.js";
import type { FurnitureItem } from "./furniture.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	cellIsInside,
	cellOverlay,
	GRID_CELL_MM,
	GRID_COLS,
	getRoomBounds,
	roomStartCol,
} from "./grid.js";
import { getCellColor } from "./heatmap.js";
import type { ZoneConfig } from "./zone-defaults.js";

/**
 * Render an SVG thumbnail of a saved configuration.
 *
 * Shows zone-colored grid cells and furniture outlines.
 * The SVG viewBox is cropped to the padded room bounds (including the 1-cell
 * margin added by `getRoomBounds()`) so it fills any container size.
 */
export function renderConfigurationThumbnail(
	grid: number[],
	zoneConfigs: (ZoneConfig | null)[],
	roomWidth: number,
	_roomDepth: number,
	furniture: FurnitureItem[],
): SVGTemplateResult {
	const u8 = grid instanceof Uint8Array ? grid : new Uint8Array(grid);
	const bounds = getRoomBounds(u8);

	// No inside cells — return empty SVG
	if (bounds.minCol > bounds.maxCol || bounds.minRow > bounds.maxRow) {
		return svg`<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet"></svg>`;
	}

	const { minCol, maxCol, minRow, maxRow } = bounds;
	const cols = maxCol - minCol + 1;
	const rows = maxRow - minRow + 1;

	const cellRects: SVGTemplateResult[] = [];
	const overlayRects: SVGTemplateResult[] = [];
	const neededPatterns = new Set<string>();

	for (let r = minRow; r <= maxRow; r++) {
		for (let c = minCol; c <= maxCol; c++) {
			const idx = r * GRID_COLS + c;
			const val = u8[idx];
			if (!cellIsInside(val)) continue;
			const color = getCellColor(val, zoneConfigs);
			cellRects.push(
				svg`<rect x="${c - minCol}" y="${r - minRow}" width="1" height="1" fill="${color}" />`,
			);

			// Overlay markers
			const x = c - minCol;
			const y = r - minRow;
			const overlay = cellOverlay(val);
			if (overlay === CELL_OVERLAY_ENTRY) {
				neededPatterns.add("entry");
				overlayRects.push(
					svg`<rect x="${x}" y="${y}" width="1" height="1" fill="url(#overlay-entry)" />`,
				);
			} else if (overlay === CELL_OVERLAY_INTERFERENCE) {
				neededPatterns.add("interference");
				overlayRects.push(
					svg`<rect x="${x}" y="${y}" width="1" height="1" fill="url(#overlay-interference)" />`,
				);
			} else if (overlay === CELL_OVERLAY_SUPPRESS) {
				neededPatterns.add("suppress");
				overlayRects.push(
					svg`<rect x="${x}" y="${y}" width="1" height="1" fill="url(#overlay-suppress)" />`,
				);
			}
		}
	}

	// SVG pattern definitions for overlays (only included when needed)
	const patternDefs =
		neededPatterns.size > 0
			? svg`<defs>
			${
				neededPatterns.has("entry")
					? svg`<pattern id="overlay-entry" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(80,80,80,0.5)" stroke-width="0.08" />
			</pattern>`
					: ""
			}
			${
				neededPatterns.has("interference")
					? svg`<pattern id="overlay-interference" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.08" />
			</pattern>`
					: ""
			}
			${
				neededPatterns.has("suppress")
					? svg`<pattern id="overlay-suppress" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0.25" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
				<line x1="0.25" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
			</pattern>`
					: ""
			}
		</defs>`
			: "";

	// Furniture: convert mm positions to grid-cell units relative to room bounds
	const startCol = roomStartCol(roomWidth);

	const furnitureElements: SVGTemplateResult[] = [];
	for (const item of furniture) {
		const fx = item.x / GRID_CELL_MM + startCol - minCol;
		const fy = item.y / GRID_CELL_MM - minRow;
		const fw = item.width / GRID_CELL_MM;
		const fh = item.height / GRID_CELL_MM;
		const cx = fx + fw / 2;
		const cy = fy + fh / 2;
		const floorPlan =
			item.type === "svg" ? FLOOR_PLAN_SVGS[item.icon] : undefined;

		if (floorPlan) {
			// Parse viewBox to get the SVG's native coordinate space
			const [vx, vy, vw, vh] = floorPlan.viewBox.split(" ").map(Number);
			const sx = fw / vw;
			const sy = fh / vh;
			// Build transform as array to ensure proper spacing between functions
			const parts = [
				item.rotation ? `rotate(${item.rotation}, ${cx}, ${cy})` : "",
				`translate(${fx}, ${fy})`,
				`scale(${sx}, ${sy})`,
				`translate(${-vx}, ${-vy})`,
			].filter(Boolean);
			furnitureElements.push(
				svg`<g transform="${parts.join(" ")}">
					${unsafeSVG(floorPlan.content)}
				</g>`,
			);
		} else {
			// Icon-type or unknown SVG: outlined rect fallback
			const transform = item.rotation
				? `rotate(${item.rotation}, ${cx}, ${cy})`
				: "";
			furnitureElements.push(
				svg`<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}"
					fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="0.15"
					rx="0.1" transform="${transform}" />`,
			);
		}
	}

	return svg`<svg viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="xMidYMid meet">
    ${patternDefs}
    ${cellRects}
    ${overlayRects}
    ${furnitureElements}
  </svg>`;
}
