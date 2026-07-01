import { mapTargetToGridCell, targetCellIndex } from "./coordinates.js";
import type { FurnitureItem } from "./furniture.js";
import { furnitureContrast } from "./furniture-contrast.js";

/** The CSS colour + halo to apply to one furniture item. */
export type FurnitureItemTone = { color: string; halo: string };

/** Per-item furniture tone from the background under each item's centre.
 *  `readCellRgb(idx)` returns the rendered background of the grid cell at the
 *  given linear index, or null when it can't be read. Items whose centre is
 *  off-grid or unreadable are omitted (they keep the default grey). */
export function computeFurnitureTones(
	furniture: FurnitureItem[],
	roomWidth: number,
	roomDepth: number,
	readCellRgb: (idx: number) => [number, number, number] | null,
): Map<string, FurnitureItemTone> {
	const tones = new Map<string, FurnitureItemTone>();
	for (const item of furniture) {
		const pos = mapTargetToGridCell(
			item.x + item.width / 2,
			item.y + item.height / 2,
			roomWidth,
			roomDepth,
		);
		if (!pos) continue;
		const idx = targetCellIndex(pos);
		if (idx === null) continue;
		const rgb = readCellRgb(idx);
		if (!rgb) continue;
		const { color, halo } = furnitureContrast(rgb);
		tones.set(item.id, { color, halo });
	}
	return tones;
}
