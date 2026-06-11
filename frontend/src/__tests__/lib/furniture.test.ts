import { describe, expect, it } from "vitest";
import { isFurnitureOutsideGrid } from "../../lib/furniture.js";

describe("isFurnitureOutsideGrid", () => {
	it("returns false when item is fully inside bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 100, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(false);
	});

	it("returns false when item partially overlaps bounds", () => {
		// Item right edge at 300, bounds start at 0 — overlaps
		expect(
			isFurnitureOutsideGrid(
				{ x: -100, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(false);
	});

	it("returns true when item is completely to the right of bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 2000, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	it("returns true when item is completely below bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 100, y: 2000, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	it("returns true when item is completely to the left of bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: -500, y: 100, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	it("returns true when item is completely above bounds", () => {
		expect(
			isFurnitureOutsideGrid(
				{ x: 100, y: -500, width: 200, height: 200 },
				0,
				1800,
				0,
				1800,
			),
		).toBe(true);
	});

	describe("rotation-aware visual bounding box", () => {
		// CSS rotation pivots about the item's center, so the rendered extent
		// of a rotated item differs from its unrotated x/y/width/height box.
		// The overlap test must use the visual bbox or a 90°-rotated elongated
		// item visibly overlapping the grid gets classified as fully outside
		// (and silently dropped on save).

		it("returns false for a 90°-rotated tall item whose visual box overlaps on x", () => {
			// Unrotated box x:[2000,2200] is right of maxX=1800, but at 90° the
			// 2000mm height swings horizontal: visual x:[1100,3100] overlaps.
			expect(
				isFurnitureOutsideGrid(
					{ x: 2000, y: 100, width: 200, height: 2000, rotation: 90 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(false);
		});

		it("returns false for a 90°-rotated wide item whose visual box overlaps on y", () => {
			// Unrotated box y:[2000,2200] is below maxY=1800, but at 90° the
			// 2000mm width swings vertical: visual y:[1100,3100] overlaps.
			expect(
				isFurnitureOutsideGrid(
					{ x: 100, y: 2000, width: 2000, height: 200, rotation: 90 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(false);
		});

		it("returns true when even the rotated visual box has no overlap", () => {
			// Visual x:[3100,5100] — still fully right of maxX=1800.
			expect(
				isFurnitureOutsideGrid(
					{ x: 4000, y: 100, width: 200, height: 2000, rotation: 90 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(true);
		});

		it("treats rotation 0 / missing rotation identically", () => {
			expect(
				isFurnitureOutsideGrid(
					{ x: 2000, y: 100, width: 200, height: 2000, rotation: 0 },
					0,
					1800,
					0,
					1800,
				),
			).toBe(true);
		});
	});
});
