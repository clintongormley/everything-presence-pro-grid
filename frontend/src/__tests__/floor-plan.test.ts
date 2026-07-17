import { describe, expect, it } from "vitest";
import { planRectPct } from "../lib/floor-plan.js";

describe("planRectPct", () => {
	it("maps a room rectangle to percentages of the visible grid", () => {
		// room cols 2..5 (4 wide), rows 3..7 (5 tall) inside a 10x10 visible grid
		const r = planRectPct(
			{ minCol: 2, maxCol: 5, minRow: 3, maxRow: 7 },
			0,
			0,
			10,
			10,
		);
		expect(r.leftPct).toBeCloseTo(20);
		expect(r.topPct).toBeCloseTo(30);
		expect(r.widthPct).toBeCloseTo(40);
		expect(r.heightPct).toBeCloseTo(50);
	});

	it("accounts for a non-zero visible-bounds origin", () => {
		const r = planRectPct(
			{ minCol: 4, maxCol: 4, minRow: 4, maxRow: 4 },
			2,
			2,
			8,
			8,
		);
		// (4-2)/8 = 25% offset, 1 cell / 8 = 12.5% size
		expect(r.leftPct).toBeCloseTo(25);
		expect(r.topPct).toBeCloseTo(25);
		expect(r.widthPct).toBeCloseTo(12.5);
		expect(r.heightPct).toBeCloseTo(12.5);
	});
});
