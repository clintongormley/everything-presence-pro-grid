import { mapTargetToGridCell, targetCellIndex } from "./coordinates.js";
import { CELL_OVERLAY_ENTRY, cellIsInside, cellOverlay } from "./grid.js";

const MAX_TARGETS = 3;

/**
 * Per-slot sticky entry-overlay tracker — the single TS mirror of
 * `firmware/components/epp/epp_component.cpp` Stage 2b (lines 114-147).
 *
 * The firmware component drives this off RAW radar frames at 10 Hz, because
 * the windowed/median position can skip over a boundary entry-overlay cell.
 * For each LD2450 slot it maintains a sticky flag:
 *
 *   - inactive→active transition (LD2450 reuses slots, so this means a
 *     brand-new target): reset the flag to false. Without this, the previous
 *     occupant's overlay touch would leak into the new target and grant it
 *     instant entry-overlay confirmation it never earned.
 *   - active + frame lands on a ROOM cell: set the flag to
 *     (cell overlay == ENTRY) — i.e. true on an entry cell, cleared on any
 *     other room cell.
 *   - active + frame is OUTSIDE the room: leave the flag unchanged (sticky
 *     until the next room cell).
 *   - inactive: leave the flag unchanged (the zone engine still reads it).
 *
 * The engine consumes the resulting per-slot flag as `target.onOverlay`
 * (mirroring the firmware's `zone_input.targets[i].on_overlay`). The engine
 * itself then ORs that flag with "current median cell is an entry overlay"
 * (see `zone-engine.ts` / firmware `epp_zone_engine.cpp:300`), so this tracker
 * only contributes the RAW-frame half of the signal.
 *
 * Coordinates are room-space mm (perspective already applied), the same frame
 * the engine uses; mapping reuses `mapTargetToGridCell` / `targetCellIndex`
 * so the origin-shift math is never duplicated.
 */
export class OverlayTracker {
	private onOverlayFlags: boolean[] = [false, false, false];
	private prevActive: boolean[] = [false, false, false];

	/** Current per-slot sticky overlay flags (index-aligned with targets). */
	get onOverlay(): readonly boolean[] {
		return this.onOverlayFlags;
	}

	/**
	 * Feed one frame of targets. `x`/`y` are room-space mm (or null when the
	 * slot is not tracking). Mirrors the component's per-slot loop exactly.
	 */
	update(
		targets: { active: boolean; x: number | null; y: number | null }[],
		grid: Uint8Array,
		roomWidth: number,
		roomDepth: number,
	): void {
		for (let i = 0; i < MAX_TARGETS; i++) {
			const t = i < targets.length ? targets[i] : null;
			const active = t?.active === true && t.x !== null && t.y !== null;

			// Slot-reuse guard (mirrors the component): inactive→active means a
			// brand-new target — the previous occupant's sticky overlay-touch
			// must not leak into it.
			if (active && !this.prevActive[i]) {
				this.onOverlayFlags[i] = false;
			}

			if (active && t !== null && t.x !== null && t.y !== null) {
				const pos = mapTargetToGridCell(t.x, t.y, roomWidth, roomDepth);
				const idx = pos !== null ? targetCellIndex(pos) : null;
				if (idx !== null && cellIsInside(grid[idx])) {
					// On a room cell: set true on an entry cell, clear on any
					// other room cell.
					this.onOverlayFlags[i] =
						cellOverlay(grid[idx]) === CELL_OVERLAY_ENTRY;
				}
				// Outside the room (idx null or non-room cell): keep current
				// flag (sticky until the next room cell).
			}
			// Inactive: leave the flag unchanged — the engine still reads it.

			this.prevActive[i] = active;
		}
	}

	/**
	 * Reset all per-slot state. Mirrors the firmware reset points
	 * (set_grid / set_zones / dismiss in the engine, and a fresh session): a
	 * grid edit or session change invalidates the latched overlay touches.
	 */
	reset(): void {
		for (let i = 0; i < MAX_TARGETS; i++) {
			this.onOverlayFlags[i] = false;
			this.prevActive[i] = false;
		}
	}
}
