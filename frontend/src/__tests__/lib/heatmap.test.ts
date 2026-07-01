import { describe, expect, it } from "vitest";
import { CELL_ROOM_BIT, cellSetZone } from "../../lib/grid.js";
import {
	CELL_COLOR_OUTSIDE,
	CELL_COLOR_ROOM,
	getCellColor,
	heatCellColor,
} from "../../lib/heatmap.js";
import { ZONE_COLORS } from "../../lib/zone-defaults.js";

const INSIDE_ROOM = CELL_ROOM_BIT; // inside, zone 0 (rest-of-room)
const INSIDE_ZONE1 = cellSetZone(CELL_ROOM_BIT, 1); // inside, named zone 1
const OUTSIDE = 0; // not inside the room

const zoneConfigs = [
	{ name: "Zone 1", color: ZONE_COLORS[0], type: "default" },
	...new Array(6).fill(null),
] as never;

describe("getCellColor roomColor override", () => {
	it("defaults the rest-of-room fill to CELL_COLOR_ROOM (backwards compatible)", () => {
		expect(getCellColor(INSIDE_ROOM, zoneConfigs)).toBe(CELL_COLOR_ROOM);
	});

	it("uses the supplied roomColor for rest-of-room (zone 0) cells", () => {
		expect(getCellColor(INSIDE_ROOM, zoneConfigs, "rgb(10, 20, 30)")).toBe(
			"rgb(10, 20, 30)",
		);
	});

	it("keeps painted-zone colours regardless of roomColor", () => {
		expect(getCellColor(INSIDE_ZONE1, zoneConfigs, "rgb(10, 20, 30)")).toBe(
			ZONE_COLORS[0],
		);
	});

	it("never applies roomColor to outside-the-room cells", () => {
		expect(getCellColor(OUTSIDE, zoneConfigs, "rgb(10, 20, 30)")).toBe(
			CELL_COLOR_OUTSIDE,
		);
	});
});

describe("heatCellColor", () => {
	it("is transparent at or below zero", () => {
		expect(heatCellColor(0)).toBe("transparent");
		expect(heatCellColor(-5)).toBe("transparent");
	});

	it("returns an rgba string with increasing alpha toward the peak", () => {
		const low = heatCellColor(20);
		const high = heatCellColor(255);
		expect(low).toMatch(/^rgba\(/);
		expect(high).toMatch(/^rgba\(/);
		const alpha = (s: string) => Number(s.slice(0, -1).split(",").pop());
		expect(alpha(high)).toBeGreaterThan(alpha(low));
		expect(alpha(high)).toBeLessThanOrEqual(1);
	});
});
