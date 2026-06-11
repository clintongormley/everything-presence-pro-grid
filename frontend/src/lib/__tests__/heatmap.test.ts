import { describe, expect, it } from "vitest";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	cellSetZone,
	MAX_ZONES,
} from "../grid.js";
import {
	CELL_COLOR_OUTSIDE,
	CELL_COLOR_ROOM,
	getCellColor,
	overlayStripeGradient,
} from "../heatmap.js";
import type { ZoneConfig } from "../zone-defaults.js";

const makeZoneConfig = (overrides: Partial<ZoneConfig> = {}): ZoneConfig => ({
	name: "Test Zone",
	color: "#E69F00",
	type: "default",
	...overrides,
});

describe("getCellColor", () => {
	it("returns outside color for non-room cell", () => {
		expect(getCellColor(0, [])).toBe(CELL_COLOR_OUTSIDE);
	});

	it("returns room color for zone-0 inside cell", () => {
		expect(getCellColor(CELL_ROOM_BIT, [])).toBe(CELL_COLOR_ROOM);
	});

	it("returns zone color for inside cell with zone", () => {
		const configs: (ZoneConfig | null)[] = [
			null,
			makeZoneConfig({ color: "#FF0000" }),
		];
		const cell = cellSetZone(CELL_ROOM_BIT, 2);
		expect(getCellColor(cell, configs)).toBe("#FF0000");
	});

	it("returns room color if zone config is null", () => {
		const configs: (ZoneConfig | null)[] = [null, null, null];
		const cell = cellSetZone(CELL_ROOM_BIT, 1);
		expect(getCellColor(cell, configs)).toBe(CELL_COLOR_ROOM);
	});

	it("handles all zone slots", () => {
		const configs: (ZoneConfig | null)[] = Array.from(
			{ length: MAX_ZONES },
			(_, i) => makeZoneConfig({ color: `#${String(i + 1).padStart(6, "0")}` }),
		);
		for (let z = 1; z <= MAX_ZONES; z++) {
			const cell = cellSetZone(CELL_ROOM_BIT, z);
			expect(getCellColor(cell, configs)).toBe(
				`#${String(z).padStart(6, "0")}`,
			);
		}
	});

	it("returns room color for zone > MAX_ZONES", () => {
		// This shouldn't happen in practice, but test the boundary
		const configs: (ZoneConfig | null)[] = [];
		// Zone 0 with room bit set
		expect(getCellColor(CELL_ROOM_BIT, configs)).toBe(CELL_COLOR_ROOM);
	});
});

describe("overlayStripeGradient", () => {
	it("renders entry as a single 45deg neutral stripe", () => {
		const g = overlayStripeGradient(CELL_OVERLAY_ENTRY, 6);
		expect(g).toContain("repeating-linear-gradient(45deg");
		expect(g).toContain("rgba(60,60,60,0.7)");
		expect(g).toContain("6px");
		expect(g).toContain("8px"); // 2px stripe after the 6px gap
	});

	it("renders interference as a single -45deg theme-error stripe", () => {
		const g = overlayStripeGradient(CELL_OVERLAY_INTERFERENCE, 5);
		expect(g).toContain("repeating-linear-gradient(-45deg");
		expect(g).toContain("var(--error-color, #cc3333)");
		expect(g.match(/repeating-linear-gradient/g)?.length).toBe(1);
	});

	it("renders suppress as a cross-hatch (both angles)", () => {
		const g = overlayStripeGradient(CELL_OVERLAY_SUPPRESS, 4);
		expect(g).toContain("repeating-linear-gradient(-45deg");
		expect(g).toContain("repeating-linear-gradient(45deg");
		expect(g.match(/repeating-linear-gradient/g)?.length).toBe(2);
	});

	it("returns empty string for unknown kinds", () => {
		expect(overlayStripeGradient(99, 4)).toBe("");
	});
});
