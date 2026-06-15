import { beforeEach, describe, expect, it } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import {
	CELL_ROOM_BIT,
	cellSetZone,
	cellZone,
	GRID_CELL_COUNT,
} from "../lib/grid.js";
import { ZONE_COLORS } from "../lib/zone-defaults.js";
import { setupLocalize } from "../localize.js";

const MAX_ZONES = 7;

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: async () => ({}),
		connection: { subscribeMessage: async () => () => {} },
	};
	const a = el as any;
	// addZone() reads from this.host._localize for the zone name. Without an
	// IDE/render lifecycle, willUpdate() never runs to populate it, so install
	// the real one directly.
	a._localize = setupLocalize(el.hass as any);
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	// Length-8 tuple: slot 0 = Zone0Config, slots 1..7 = named zones.
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	return el;
}

describe("_addZone", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("creates a zone in the first empty slot", () => {
		const a = el as any;
		a._addZone();
		// Slot 1 is the first named-zone slot (slot 0 is Zone0Config).
		expect(a._zoneConfigs[1]).not.toBeNull();
		expect(a._zoneConfigs[1].name).toBe("Zone 1");
	});

	it("picks an unused color from ZONE_COLORS", () => {
		const a = el as any;
		a._addZone();
		expect(ZONE_COLORS).toContain(a._zoneConfigs[1].color);
		expect(a._zoneConfigs[1].color).toBe(ZONE_COLORS[0]);
	});

	it("picks the next unused color when first is taken", () => {
		const a = el as any;
		a._addZone();
		a._addZone();
		expect(a._zoneConfigs[1].color).toBe(ZONE_COLORS[0]);
		expect(a._zoneConfigs[2].color).toBe(ZONE_COLORS[1]);
	});

	it("does NOT set _dirty (adding an empty zone draws no cells)", () => {
		// Dirty must come from drawing cells or editing a zone's config, not from
		// adding an empty slot — otherwise the Save/Cancel bar appears prematurely.
		const a = el as any;
		expect(a._dirty).toBe(false);
		a._addZone();
		expect(a._dirty).toBe(false);
	});

	it("sets _activeZone to the 1-based slot number", () => {
		const a = el as any;
		a._addZone();
		expect(a._activeZone).toBe(1);
	});

	it("fills a gap when earlier slots are occupied", () => {
		const a = el as any;
		// Fill slot 1 (zone 1) manually so slot 2 is the next empty.
		a._zoneConfigs = [
			a._zoneConfigs[0],
			{ name: "Zone 1", color: ZONE_COLORS[0], type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		a._addZone();
		expect(a._zoneConfigs[2]).not.toBeNull();
		expect(a._zoneConfigs[2].name).toBe("Zone 2");
		expect(a._activeZone).toBe(2);
	});

	it("is a no-op when all 7 slots are full", () => {
		const a = el as any;
		const fullConfigs = Array.from({ length: MAX_ZONES }, (_, i) => ({
			name: `Zone ${i + 1}`,
			color: ZONE_COLORS[i % ZONE_COLORS.length],
			type: "default" as const,
		}));
		a._zoneConfigs = [a._zoneConfigs[0], ...fullConfigs];
		a._dirty = false;
		a._activeZone = 0;

		a._addZone();

		// Nothing should change
		expect(a._dirty).toBe(false);
		expect(a._activeZone).toBe(0);
		for (let i = 0; i < MAX_ZONES; i++) {
			expect(a._zoneConfigs[i + 1].name).toBe(`Zone ${i + 1}`);
		}
	});
});

describe("_removeZone", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("nulls the slot and sets _dirty = true", () => {
		const a = el as any;
		a._addZone(); // slot 1 -> zone 1
		a._dirty = false;

		a._removeZone(1);

		expect(a._zoneConfigs[1]).toBeNull();
		expect(a._dirty).toBe(true);
	});

	it("clears grid cells with that zone back to zone 0", () => {
		const a = el as any;
		a._addZone(); // zone 1

		// Paint some cells with zone 1
		const grid = new Uint8Array(GRID_CELL_COUNT);
		grid[10] = cellSetZone(CELL_ROOM_BIT, 1);
		grid[11] = cellSetZone(CELL_ROOM_BIT, 1);
		grid[12] = cellSetZone(CELL_ROOM_BIT, 2); // different zone, should be untouched
		grid[13] = CELL_ROOM_BIT; // plain room cell, should be untouched
		a._grid = grid;

		a._removeZone(1);

		expect(cellZone(a._grid[10])).toBe(0);
		expect(cellZone(a._grid[11])).toBe(0);
		expect(cellZone(a._grid[12])).toBe(2); // untouched
		expect(a._grid[13]).toBe(CELL_ROOM_BIT); // untouched
	});

	it("clears _activeZone when removing the active zone", () => {
		const a = el as any;
		a._addZone(); // zone 1, sets _activeZone = 1
		expect(a._activeZone).toBe(1);

		a._removeZone(1);
		expect(a._activeZone).toBeNull();
	});

	it("does not clear _activeZone when removing a different zone", () => {
		const a = el as any;
		a._addZone(); // zone 1
		a._addZone(); // zone 2
		a._activeZone = 1;

		a._removeZone(2);
		expect(a._activeZone).toBe(1);
	});

	it("is a no-op with slot 0 (invalid)", () => {
		const a = el as any;
		a._addZone();
		a._dirty = false;

		a._removeZone(0);
		expect(a._dirty).toBe(false);
		// Named zone 1 is untouched (lives at slot 1 in the length-8 tuple).
		expect(a._zoneConfigs[1]).not.toBeNull();
	});

	it("is a no-op with slot > MAX_ZONES", () => {
		const a = el as any;
		a._addZone();
		a._dirty = false;

		a._removeZone(8);
		expect(a._dirty).toBe(false);
	});

	it("is a no-op when slot is already null", () => {
		const a = el as any;
		a._dirty = false;

		a._removeZone(3); // slot 3 is null by default
		expect(a._dirty).toBe(false);
	});
});
