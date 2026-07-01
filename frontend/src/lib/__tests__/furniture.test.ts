import { describe, expect, it } from "vitest";
import {
	clampFurnitureMove,
	computeFurnitureResize,
	computeFurnitureRotation,
	createFurnitureItem,
	type FurnitureItem,
	type FurnitureSticker,
	filterAndSortStickers,
	getResizeCursor,
	isProportionalResize,
	mmToPx,
	pxToMm,
	removeFurnitureItem,
	snapRotation,
	updateFurnitureItem,
	visibleHandles,
} from "../furniture.js";
import { GRID_CELL_MM } from "../grid.js";

const makeItem = (overrides: Partial<FurnitureItem> = {}): FurnitureItem => ({
	id: "f1",
	type: "icon",
	icon: "mdi:sofa",
	label: "Sofa",
	x: 500,
	y: 500,
	width: 600,
	height: 400,
	rotation: 0,
	lockAspect: true,
	...overrides,
});

describe("createFurnitureItem", () => {
	it("creates item centered in the room", () => {
		const sticker: FurnitureSticker = {
			type: "icon",
			icon: "mdi:sofa",
			label: "Sofa",
			defaultWidth: 600,
			defaultHeight: 400,
		};
		const item = createFurnitureItem(sticker, 3000, 4000, "id1");
		expect(item.x).toBe((3000 - 600) / 2); // 1200
		expect(item.y).toBe((4000 - 400) / 2); // 1800
		expect(item.width).toBe(600);
		expect(item.height).toBe(400);
		expect(item.rotation).toBe(0);
		expect(item.id).toBe("id1");
		expect(item.type).toBe("icon");
		expect(item.icon).toBe("mdi:sofa");
		expect(item.label).toBe("Sofa");
	});

	it("clamps position to 0 when item is larger than room", () => {
		const sticker: FurnitureSticker = {
			type: "svg",
			icon: "bed",
			label: "Bed",
			defaultWidth: 4000,
			defaultHeight: 5000,
		};
		const item = createFurnitureItem(sticker, 3000, 4000, "id2");
		expect(item.x).toBe(0); // (3000 - 4000) / 2 = -500, clamped to 0
		expect(item.y).toBe(0); // (4000 - 5000) / 2 = -500, clamped to 0
	});

	it("defaults lockAspect from sticker or type", () => {
		const iconSticker: FurnitureSticker = {
			type: "icon",
			icon: "mdi:lamp",
			label: "Lamp",
			defaultWidth: 300,
			defaultHeight: 300,
		};
		expect(createFurnitureItem(iconSticker, 3000, 3000, "a").lockAspect).toBe(
			true,
		);

		const svgSticker: FurnitureSticker = {
			type: "svg",
			icon: "bed",
			label: "Bed",
			defaultWidth: 300,
			defaultHeight: 300,
		};
		expect(createFurnitureItem(svgSticker, 3000, 3000, "b").lockAspect).toBe(
			false,
		);
	});

	it("uses explicit lockAspect from sticker", () => {
		const sticker: FurnitureSticker = {
			type: "svg",
			icon: "table",
			label: "Table",
			defaultWidth: 300,
			defaultHeight: 300,
			lockAspect: true,
		};
		expect(createFurnitureItem(sticker, 3000, 3000, "c").lockAspect).toBe(true);
	});
});

describe("removeFurnitureItem", () => {
	it("removes item by id", () => {
		const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
		const result = removeFurnitureItem(items, "a");
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("b");
	});

	it("returns same-length list when id not found", () => {
		const items = [makeItem({ id: "a" })];
		const result = removeFurnitureItem(items, "z");
		expect(result).toHaveLength(1);
	});

	it("does not mutate original array", () => {
		const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
		removeFurnitureItem(items, "a");
		expect(items).toHaveLength(2);
	});

	it("handles empty array", () => {
		expect(removeFurnitureItem([], "a")).toEqual([]);
	});
});

describe("updateFurnitureItem", () => {
	it("updates matching item with partial updates", () => {
		const items = [makeItem({ id: "a", x: 100 })];
		const result = updateFurnitureItem(items, "a", { x: 200, y: 300 });
		expect(result[0].x).toBe(200);
		expect(result[0].y).toBe(300);
		expect(result[0].width).toBe(600); // preserved
	});

	it("leaves non-matching items unchanged", () => {
		const items = [makeItem({ id: "a" }), makeItem({ id: "b", x: 999 })];
		const result = updateFurnitureItem(items, "a", { x: 0 });
		expect(result[1].x).toBe(999);
	});

	it("does not mutate original array", () => {
		const items = [makeItem({ id: "a", x: 100 })];
		updateFurnitureItem(items, "a", { x: 999 });
		expect(items[0].x).toBe(100);
	});

	it("returns new array reference", () => {
		const items = [makeItem({ id: "a" })];
		const result = updateFurnitureItem(items, "a", { x: 0 });
		expect(result).not.toBe(items);
	});
});

describe("mmToPx", () => {
	it("converts mm to px accounting for gap", () => {
		// 300mm (1 cell) at cellPx=28 → (300/300)*(28+1) = 29
		expect(mmToPx(300, 28)).toBeCloseTo(29);
	});

	it("returns 0 for 0mm", () => {
		expect(mmToPx(0, 28)).toBe(0);
	});

	it("scales linearly", () => {
		const px1 = mmToPx(600, 28);
		const px2 = mmToPx(300, 28);
		expect(px1).toBeCloseTo(px2 * 2);
	});

	it("uses GRID_CELL_MM for conversion", () => {
		const cellPx = 20;
		const mm = GRID_CELL_MM;
		expect(mmToPx(mm, cellPx)).toBeCloseTo(cellPx + 1);
	});
});

describe("pxToMm", () => {
	it("converts px to mm accounting for gap", () => {
		// 29px at cellPx=28 → (29/(28+1))*300 = 300mm
		expect(pxToMm(29, 28)).toBeCloseTo(300);
	});

	it("returns 0 for 0px", () => {
		expect(pxToMm(0, 28)).toBe(0);
	});

	it("round-trips with mmToPx", () => {
		const mm = 1500;
		const cellPx = 28;
		expect(pxToMm(mmToPx(mm, cellPx), cellPx)).toBeCloseTo(mm);
	});
});

describe("clampFurnitureMove", () => {
	it("returns unclamped position within bounds", () => {
		const result = clampFurnitureMove(
			500,
			500,
			0,
			0,
			28,
			600,
			400,
			0,
			3000,
			0,
			4000,
			0,
		);
		expect(result.x).toBe(500);
		expect(result.y).toBe(500);
	});

	it("clamps to minimum bounds", () => {
		// Large negative drag with negative min bounds (padding area)
		const result = clampFurnitureMove(
			0,
			0,
			-1000,
			-1000,
			28,
			600,
			400,
			-300,
			3300,
			-300,
			4300,
			0,
		);
		expect(result.x).toBe(-300);
		expect(result.y).toBe(-300);
	});

	it("clamps to maximum bounds - itemSize", () => {
		// Large positive drag
		const result = clampFurnitureMove(
			2000,
			3000,
			10000,
			10000,
			28,
			600,
			400,
			-300,
			3300,
			-300,
			4300,
			0,
		);
		expect(result.x).toBe(2700); // 3300 - 600
		expect(result.y).toBe(3900); // 4300 - 400
	});

	it("converts pixel delta to mm correctly", () => {
		// Move 29px at cellPx=28 → 300mm
		const result = clampFurnitureMove(
			0,
			0,
			29,
			29,
			28,
			100,
			100,
			0,
			6000,
			0,
			6000,
			0,
		);
		expect(result.x).toBeCloseTo(300);
		expect(result.y).toBeCloseTo(300);
	});

	describe("rotation-aware clamping", () => {
		// A 1600×800 item rotated 90° has a visual bounding box of 800×1600
		// centered at (item.x + 800, item.y + 400). The clamp must use the
		// visual bbox so the rendered item stays inside [minX..maxX, minY..maxY].

		it("allows rotated item's visual right edge to reach maxX", () => {
			// Drag far right: item.x can go high enough that the visual right
			// edge (= item.x + (width + visualWidth) / 2) touches maxX = 4200.
			// For 1600x800 @ 90°: visualWidth=800 → item.x ≤ 4200 - 1200 = 3000.
			const result = clampFurnitureMove(
				0,
				500,
				100000,
				0,
				28,
				1600,
				800,
				-300,
				4200,
				0,
				5400,
				90,
			);
			expect(result.x).toBeCloseTo(3000);
		});

		it("keeps rotated item's visual bottom edge within maxY", () => {
			// For 1600×800 @ 90°: visualHeight=1600, visual bottom =
			// item.y + (height + visualHeight) / 2 = item.y + 1200.
			// Drag far down: item.y ≤ 5400 - 1200 = 4200.
			const result = clampFurnitureMove(
				500,
				0,
				0,
				100000,
				28,
				1600,
				800,
				-300,
				4200,
				0,
				5400,
				90,
			);
			expect(result.y).toBeCloseTo(4200);
		});

		it("keeps rotated item's visual top edge within minY", () => {
			// Visual top = item.y - (visualHeight - height) / 2.
			// For 1600×800 @ 90°: visualHeight=1600 → visual top = item.y - 400.
			// Drag far up: item.y ≥ minY + 400 = 400.
			const result = clampFurnitureMove(
				500,
				1000,
				0,
				-100000,
				28,
				1600,
				800,
				-300,
				4200,
				0,
				5400,
				90,
			);
			expect(result.y).toBeCloseTo(400);
		});

		it("allows rotated item's visual left edge to reach minX", () => {
			// Visual left = item.x - (visualWidth - width) / 2.
			// For 1600×800 @ 90°: visual left = item.x + 400.
			// Drag far left: item.x ≥ minX - 400 = -700.
			const result = clampFurnitureMove(
				2000,
				500,
				-100000,
				0,
				28,
				1600,
				800,
				-300,
				4200,
				0,
				5400,
				90,
			);
			expect(result.x).toBeCloseTo(-700);
		});

		it("unchanged behavior at rotation 0", () => {
			// Same as existing "clamps to maximum bounds - itemSize" test but
			// explicitly passing rotation = 0.
			const result = clampFurnitureMove(
				2000,
				3000,
				10000,
				10000,
				28,
				600,
				400,
				-300,
				3300,
				-300,
				4300,
				0,
			);
			expect(result.x).toBe(2700);
			expect(result.y).toBe(3900);
		});
	});
});

describe("isProportionalResize", () => {
	const corners = ["ne", "nw", "se", "sw"];
	const edges = ["n", "s", "e", "w"];

	it("is proportional for every handle when hard-locked", () => {
		for (const h of [...corners, ...edges]) {
			expect(isProportionalResize(h, true)).toBe(true);
		}
	});

	it("is proportional for corner handles when unlocked", () => {
		for (const h of corners) {
			expect(isProportionalResize(h, false)).toBe(true);
		}
	});

	it("is single-axis (not proportional) for edge handles when unlocked", () => {
		for (const h of edges) {
			expect(isProportionalResize(h, false)).toBe(false);
		}
	});
});

describe("visibleHandles", () => {
	const ALL = ["e", "n", "ne", "nw", "s", "se", "sw", "w"]; // sorted
	const CORNERS = ["ne", "nw", "se", "sw"]; // already sorted

	it("shows only corners for a hard-locked item", () => {
		expect([...visibleHandles(true, false)].sort()).toEqual(CORNERS);
	});

	it("shows only corners for a small unlocked item", () => {
		expect([...visibleHandles(false, true)].sort()).toEqual(CORNERS);
	});

	it("shows all eight handles for a large unlocked item", () => {
		expect([...visibleHandles(false, false)].sort()).toEqual(ALL);
	});
});

describe("computeFurnitureResize", () => {
	describe("free-form (lockAspect=false)", () => {
		it("resizes east handle", () => {
			const result = computeFurnitureResize(
				"e",
				29,
				0,
				28,
				0,
				0,
				600,
				400,
				false,
				0,
			);
			expect(result.width).toBeCloseTo(900); // 600 + 300
			expect(result.height).toBe(400); // unchanged
			expect(result.x).toBe(0); // unchanged
		});

		it("resizes west handle (moves x)", () => {
			const result = computeFurnitureResize(
				"w",
				29,
				0,
				28,
				500,
				0,
				600,
				400,
				false,
				0,
			);
			// w handle: width = max(100, 600 - 300) = 300, x = 500 + 300 = 800
			expect(result.width).toBeCloseTo(300);
			expect(result.x).toBeCloseTo(800);
		});

		it("resizes south handle", () => {
			const result = computeFurnitureResize(
				"s",
				0,
				29,
				28,
				0,
				0,
				600,
				400,
				false,
				0,
			);
			expect(result.height).toBeCloseTo(700); // 400 + 300
			expect(result.width).toBe(600); // unchanged
		});

		it("resizes north handle (moves y)", () => {
			const result = computeFurnitureResize(
				"n",
				0,
				29,
				28,
				0,
				500,
				600,
				400,
				false,
				0,
			);
			// n handle: height = max(100, 400 - 300) = 100, y = 500 + 300 = 800
			expect(result.height).toBeCloseTo(100);
			expect(result.y).toBeCloseTo(800);
		});

		it("enforces minimum size of 100mm", () => {
			const result = computeFurnitureResize(
				"e",
				-10000,
				0,
				28,
				0,
				0,
				600,
				400,
				false,
				0,
			);
			expect(result.width).toBe(100);
		});
	});

	describe("locked aspect", () => {
		it("maintains aspect ratio on scale up", () => {
			const result = computeFurnitureResize(
				"se",
				29,
				0,
				28,
				0,
				0,
				600,
				400,
				true,
				0,
			);
			const aspect = result.width / result.height;
			expect(aspect).toBeCloseTo(600 / 400, 4);
		});

		it("uses sign -1 for w handle (shrinks)", () => {
			const result = computeFurnitureResize(
				"w",
				29,
				0,
				28,
				500,
				0,
				600,
				400,
				true,
				0,
			);
			// sign=-1, delta=~300mm, w = max(100, 600 + (-1)*300) = 300
			// aspect = 600/400 = 1.5, h = max(100, 300/1.5) = 200, w = 200*1.5 = 300
			expect(result.width).toBeCloseTo(300, 0);
			expect(result.height).toBeCloseTo(200, 0);
			// East edge midpoint stays fixed in screen space (anchor for w handle):
			// new x = 500 + (600 - 300)/2 + (-1)·(-300)/2 = 500 + 150 + 150 = 800
			expect(result.x).toBeCloseTo(800, 0);
		});

		it("uses sign -1 for n handle (shrinks)", () => {
			const result = computeFurnitureResize(
				"n",
				0,
				29,
				28,
				0,
				500,
				600,
				400,
				true,
				0,
			);
			// y moves when n handle
			expect(result.y).not.toBe(500);
		});

		it("enforces minimum size of 100mm for locked aspect", () => {
			const result = computeFurnitureResize(
				"se",
				-10000,
				0,
				28,
				0,
				0,
				600,
				400,
				true,
				0,
			);
			expect(result.width).toBeGreaterThanOrEqual(100);
			expect(result.height).toBeGreaterThanOrEqual(100);
		});

		describe("all 8 handles: outward drag grows, inward drag shrinks", () => {
			// Geometry: orig 600x400 at (1000, 1000), aspect 1.5, cellPx=28 so
			// 29px = 300mm. An outward dominant-axis drag of 300mm must give
			// w=900, h=600 (dw=300, dh=200) with the OPPOSITE edge/corner
			// anchored:
			//   x' = origX - dw/2 + sx·dw/2,  y' = origY - dh/2 + sy·dh/2
			// The sign must come from the DOMINANT axis's own edge sign — a
			// blanket "any negative edge → -1" inverts ne (horizontal-dominant)
			// and sw (vertical-dominant).
			const cases: {
				handle: string;
				out: [number, number]; // outward drag (grows)
				in_: [number, number]; // inward drag (shrinks)
				x: number; // expected x after the outward drag
				y: number; // expected y after the outward drag
			}[] = [
				{ handle: "e", out: [29, 0], in_: [-29, 0], x: 1000, y: 900 },
				{ handle: "w", out: [-29, 0], in_: [29, 0], x: 700, y: 900 },
				{ handle: "s", out: [0, 29], in_: [0, -29], x: 850, y: 1000 },
				{ handle: "n", out: [0, -29], in_: [0, 29], x: 850, y: 800 },
				{ handle: "se", out: [29, 10], in_: [-29, -10], x: 1000, y: 1000 },
				{ handle: "ne", out: [29, -10], in_: [-29, 10], x: 1000, y: 800 },
				{ handle: "sw", out: [-10, 29], in_: [10, -29], x: 700, y: 1000 },
				{ handle: "nw", out: [-29, -10], in_: [29, 10], x: 700, y: 800 },
			];

			for (const c of cases) {
				it(`${c.handle}: outward drag grows and anchors the opposite edge`, () => {
					const r = computeFurnitureResize(
						c.handle,
						c.out[0],
						c.out[1],
						28,
						1000,
						1000,
						600,
						400,
						true,
						0,
					);
					expect(r.width).toBeCloseTo(900, 0);
					expect(r.height).toBeCloseTo(600, 0);
					expect(r.x).toBeCloseTo(c.x, 0);
					expect(r.y).toBeCloseTo(c.y, 0);
				});

				it(`${c.handle}: inward drag shrinks`, () => {
					const r = computeFurnitureResize(
						c.handle,
						c.in_[0],
						c.in_[1],
						28,
						1000,
						1000,
						600,
						400,
						true,
						0,
					);
					expect(r.width).toBeCloseTo(300, 0);
					expect(r.height).toBeCloseTo(200, 0);
				});
			}
		});
	});

	describe("unlocked corner resizes proportionally", () => {
		it("keeps aspect ratio when dragging the se corner of an unlocked item", () => {
			const result = computeFurnitureResize(
				"se",
				29,
				0,
				28,
				0,
				0,
				600,
				400,
				false, // unlocked — corner is still proportional
				0,
			);
			// Dominant axis is x (dxMm≈300), aspect 1.5 → w=900, h=600.
			expect(result.width).toBeCloseTo(900, 0);
			expect(result.height).toBeCloseTo(600, 0);
			expect(result.width / result.height).toBeCloseTo(600 / 400, 4);
		});

		it("stretches one axis when dragging the e edge of an unlocked item", () => {
			const result = computeFurnitureResize(
				"e",
				29,
				0,
				28,
				0,
				0,
				600,
				400,
				false,
				0,
			);
			expect(result.width).toBeCloseTo(900, 0);
			expect(result.height).toBe(400); // edge = single axis, height unchanged
		});
	});

	describe("rotation-aware drag", () => {
		// After CSS `transform: rotate(θ)`, the resize handles are visually
		// rotated. The user expects dragging a handle to grow the item in the
		// direction the pointer moves on screen, regardless of rotation. The
		// math must inverse-rotate the screen-space pointer delta into the
		// item's local frame, and compute (x, y) such that the opposite
		// edge/corner stays anchored in screen space (since CSS rotation
		// pivots about the item's center).

		it("at rotation=90°, dragging east handle southward grows width", () => {
			// 90° CW rotation puts the local east edge at screen south.
			// User drags screen-south (dy = +29px ≈ +300mm) — width should grow.
			const result = computeFurnitureResize(
				"e",
				0,
				29,
				28,
				0,
				0,
				600,
				400,
				false,
				90,
			);
			expect(result.width).toBeCloseTo(900);
			expect(result.height).toBeCloseTo(400);
		});

		it("at rotation=90°, dragging east handle eastward (perpendicular) leaves width unchanged", () => {
			// Screen-east is perpendicular to the east-handle's visual outward
			// direction (which is south after 90° CW rotation). Width should
			// not grow from a perpendicular drag.
			const result = computeFurnitureResize(
				"e",
				29,
				0,
				28,
				0,
				0,
				600,
				400,
				false,
				90,
			);
			expect(result.width).toBeCloseTo(600);
		});

		it("at rotation=180°, dragging east handle westward grows width", () => {
			// 180° rotation puts the local east edge at screen west.
			// User drags screen-west (dx = -29) — width should grow.
			const result = computeFurnitureResize(
				"e",
				-29,
				0,
				28,
				0,
				0,
				600,
				400,
				false,
				180,
			);
			expect(result.width).toBeCloseTo(900);
		});

		it("at rotation=90°, dragging north handle eastward grows height", () => {
			// 90° CW rotation puts the local north edge at screen east.
			// User drags screen-east (dx = +29) — height should grow.
			const result = computeFurnitureResize(
				"n",
				29,
				0,
				28,
				0,
				500,
				600,
				400,
				false,
				90,
			);
			expect(result.height).toBeCloseTo(700);
		});

		it("preserves screen position of the opposite-edge anchor for w-handle drag at 45°", () => {
			// CSS rotation pivots about the item's center, so we must compute
			// (x, y) such that the visual opposite edge stays put on screen.
			// For a w-handle drag, the east edge midpoint is the anchor.
			const origX = 500;
			const origY = 500;
			const origW = 600;
			const origH = 400;
			const rot = 45;
			const result = computeFurnitureResize(
				"w",
				20,
				10,
				28,
				origX,
				origY,
				origW,
				origH,
				false,
				rot,
			);

			const rad = (rot * Math.PI) / 180;
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);
			// East-edge midpoint screen position: center + R(θ)·(w/2, 0)
			const oldCx = origX + origW / 2;
			const oldCy = origY + origH / 2;
			const oldAnchorX = oldCx + (origW / 2) * cos;
			const oldAnchorY = oldCy + (origW / 2) * sin;

			const newCx = result.x + result.width / 2;
			const newCy = result.y + result.height / 2;
			const newAnchorX = newCx + (result.width / 2) * cos;
			const newAnchorY = newCy + (result.width / 2) * sin;

			expect(newAnchorX).toBeCloseTo(oldAnchorX, 4);
			expect(newAnchorY).toBeCloseTo(oldAnchorY, 4);
		});

		it("preserves screen position of opposite corner for nw-handle drag at 30°", () => {
			// For a nw-handle drag, the SE corner is the anchor.
			const origX = 800;
			const origY = 600;
			const origW = 500;
			const origH = 300;
			const rot = 30;
			const result = computeFurnitureResize(
				"nw",
				15,
				-10,
				28,
				origX,
				origY,
				origW,
				origH,
				false,
				rot,
			);

			const rad = (rot * Math.PI) / 180;
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);
			// SE corner offset from center in local frame: (+w/2, +h/2)
			const seScreen = (cx: number, cy: number, w: number, h: number) => ({
				x: cx + (w / 2) * cos - (h / 2) * sin,
				y: cy + (w / 2) * sin + (h / 2) * cos,
			});
			const oldSe = seScreen(
				origX + origW / 2,
				origY + origH / 2,
				origW,
				origH,
			);
			const newSe = seScreen(
				result.x + result.width / 2,
				result.y + result.height / 2,
				result.width,
				result.height,
			);

			expect(newSe.x).toBeCloseTo(oldSe.x, 4);
			expect(newSe.y).toBeCloseTo(oldSe.y, 4);
		});
	});
});

describe("getResizeCursor", () => {
	// Cursors are bidirectional (n-resize and s-resize render identically).
	// We use the bidirectional names so the visual orientation is the only
	// thing that matters: ns-resize, ew-resize, nesw-resize, nwse-resize.

	describe("rotation=0 (axis-aligned)", () => {
		it("n and s handles use ns-resize", () => {
			expect(getResizeCursor("n", 0)).toBe("ns-resize");
			expect(getResizeCursor("s", 0)).toBe("ns-resize");
		});

		it("e and w handles use ew-resize", () => {
			expect(getResizeCursor("e", 0)).toBe("ew-resize");
			expect(getResizeCursor("w", 0)).toBe("ew-resize");
		});

		it("ne and sw handles use nesw-resize", () => {
			expect(getResizeCursor("ne", 0)).toBe("nesw-resize");
			expect(getResizeCursor("sw", 0)).toBe("nesw-resize");
		});

		it("nw and se handles use nwse-resize", () => {
			expect(getResizeCursor("nw", 0)).toBe("nwse-resize");
			expect(getResizeCursor("se", 0)).toBe("nwse-resize");
		});
	});

	describe("with rotation", () => {
		it("at 90°, the n handle is visually horizontal", () => {
			expect(getResizeCursor("n", 90)).toBe("ew-resize");
		});

		it("at 90°, the e handle is visually vertical", () => {
			expect(getResizeCursor("e", 90)).toBe("ns-resize");
		});

		it("at 90°, the ne handle swaps diagonals", () => {
			expect(getResizeCursor("ne", 90)).toBe("nwse-resize");
		});

		it("at 45°, axis handles become diagonals", () => {
			expect(getResizeCursor("n", 45)).toBe("nesw-resize");
			expect(getResizeCursor("e", 45)).toBe("nwse-resize");
		});

		it("at 45°, diagonal handles become axes", () => {
			expect(getResizeCursor("ne", 45)).toBe("ew-resize");
			expect(getResizeCursor("nw", 45)).toBe("ns-resize");
		});

		it("at 180°, cursors are unchanged from 0° (bidirectional)", () => {
			expect(getResizeCursor("n", 180)).toBe("ns-resize");
			expect(getResizeCursor("e", 180)).toBe("ew-resize");
			expect(getResizeCursor("ne", 180)).toBe("nesw-resize");
			expect(getResizeCursor("nw", 180)).toBe("nwse-resize");
		});

		it("snaps to nearest 45° bucket", () => {
			// 22° from 0° is closer to 0° than 45° → vertical
			expect(getResizeCursor("n", 22)).toBe("ns-resize");
			// 23° is closer to 45° → diagonal
			expect(getResizeCursor("n", 23)).toBe("nesw-resize");
		});

		it("handles negative and >360° rotations", () => {
			// -90° same as 270°; n handle visual angle = -90° → ew-resize
			expect(getResizeCursor("n", -90)).toBe("ew-resize");
			// 450° same as 90°
			expect(getResizeCursor("n", 450)).toBe("ew-resize");
		});
	});
});

describe("filterAndSortStickers", () => {
	const stickers: FurnitureSticker[] = [
		{
			type: "svg",
			icon: "sofa",
			label: "furniture.sofa",
			defaultWidth: 200,
			defaultHeight: 100,
		},
		{
			type: "svg",
			icon: "armchair",
			label: "furniture.armchair",
			defaultWidth: 100,
			defaultHeight: 100,
		},
		{
			type: "svg",
			icon: "bed",
			label: "furniture.bed",
			defaultWidth: 200,
			defaultHeight: 200,
		},
		{
			type: "svg",
			icon: "lamp",
			label: "furniture.lamp",
			defaultWidth: 50,
			defaultHeight: 50,
		},
	];
	const labels: Record<string, string> = {
		"furniture.sofa": "Sofa",
		"furniture.armchair": "Armchair",
		"furniture.bed": "Bed",
		"furniture.lamp": "Lamp",
	};
	const localize = (k: string) => labels[k] ?? k;

	it("sorts alphabetically by translated label when query is empty", () => {
		const result = filterAndSortStickers(stickers, "", localize);
		expect(result.map((s) => s.icon)).toEqual([
			"armchair",
			"bed",
			"lamp",
			"sofa",
		]);
	});

	it("sorts using translated labels, not raw label keys", () => {
		// Raw keys would sort: armchair < bed < lamp < sofa (same as translated here).
		// Use a localize that reorders to prove sort uses translations.
		const reorder = (k: string) =>
			({
				"furniture.sofa": "AAA",
				"furniture.armchair": "ZZZ",
				"furniture.bed": "MMM",
				"furniture.lamp": "BBB",
			})[k] ?? k;
		const result = filterAndSortStickers(stickers, "", reorder);
		expect(result.map((s) => s.icon)).toEqual([
			"sofa", // AAA
			"lamp", // BBB
			"bed", // MMM
			"armchair", // ZZZ
		]);
	});

	it("filters by case-insensitive substring on the translated label", () => {
		const result = filterAndSortStickers(stickers, "ed", localize);
		// "Bed" contains "ed"; nothing else does.
		expect(result.map((s) => s.icon)).toEqual(["bed"]);
	});

	it("filter is case-insensitive", () => {
		const result = filterAndSortStickers(stickers, "SOFA", localize);
		expect(result.map((s) => s.icon)).toEqual(["sofa"]);
	});

	it("trims whitespace from the query", () => {
		const result = filterAndSortStickers(stickers, "  lamp  ", localize);
		expect(result.map((s) => s.icon)).toEqual(["lamp"]);
	});

	it("returns empty list when nothing matches", () => {
		const result = filterAndSortStickers(stickers, "zzz", localize);
		expect(result).toEqual([]);
	});

	it("filtered results are still sorted", () => {
		const result = filterAndSortStickers(stickers, "a", localize);
		// Matches: Armchair, Lamp, Sofa → sort → Armchair, Lamp, Sofa
		expect(result.map((s) => s.icon)).toEqual(["armchair", "lamp", "sofa"]);
	});

	it("does not mutate the input array", () => {
		const original = [...stickers];
		filterAndSortStickers(stickers, "", localize);
		expect(stickers).toEqual(original);
	});

	it("handles empty input array", () => {
		expect(filterAndSortStickers([], "", localize)).toEqual([]);
		expect(filterAndSortStickers([], "anything", localize)).toEqual([]);
	});

	it("uses locale-aware comparison for sort", () => {
		// Locale-aware sort treats accented characters as their base letter.
		// "Étagère" should sort between "Eames" and "Fan" (not after "Z").
		const accented: FurnitureSticker[] = [
			{
				type: "svg",
				icon: "fan",
				label: "fan",
				defaultWidth: 100,
				defaultHeight: 100,
			},
			{
				type: "svg",
				icon: "etagere",
				label: "etagere",
				defaultWidth: 100,
				defaultHeight: 100,
			},
			{
				type: "svg",
				icon: "eames",
				label: "eames",
				defaultWidth: 100,
				defaultHeight: 100,
			},
		];
		const accLocalize = (k: string) =>
			({ fan: "Fan", etagere: "Étagère", eames: "Eames" })[k] ?? k;
		const result = filterAndSortStickers(accented, "", accLocalize);
		expect(result.map((s) => s.icon)).toEqual(["eames", "etagere", "fan"]);
	});
});

describe("computeFurnitureRotation", () => {
	it("computes simple rotation", () => {
		expect(computeFurnitureRotation(0, 0, 45)).toBe(45);
	});

	it("adds delta to original rotation", () => {
		expect(computeFurnitureRotation(90, 10, 30)).toBe(110); // 90 + (30-10)
	});

	it("wraps around 360", () => {
		expect(computeFurnitureRotation(350, 0, 20)).toBe(10); // (350 + 20) % 360
	});

	it("handles negative delta", () => {
		const result = computeFurnitureRotation(10, 30, 0);
		// 10 + (0 - 30) + 360 = 340
		expect(result).toBe(340);
	});

	it("rounds to integer", () => {
		const result = computeFurnitureRotation(0, 0, 45.7);
		expect(result).toBe(46);
	});

	it("returns 0 for full rotation", () => {
		expect(computeFurnitureRotation(0, 0, 360)).toBe(0);
	});
});

describe("snapRotation", () => {
	it("snaps to the nearest 15° when within the threshold", () => {
		expect(snapRotation(2)).toBe(0);
		expect(snapRotation(13)).toBe(15);
		expect(snapRotation(88)).toBe(90);
	});
	it("leaves angles outside the threshold free", () => {
		expect(snapRotation(22)).toBe(22);
	});
	it("wraps cleanly near 360/0", () => {
		expect(snapRotation(358)).toBe(0);
		expect(snapRotation(359)).toBe(0);
	});
	it("normalises out-of-range input", () => {
		expect(snapRotation(-2)).toBe(0);
		expect(snapRotation(362)).toBe(0);
	});
	it("honours custom step/threshold", () => {
		expect(snapRotation(44, 90, 10)).toBe(44);
		expect(snapRotation(7, 90, 10)).toBe(0);
	});
	it("is identity at exact multiples", () => {
		expect(snapRotation(15)).toBe(15);
		expect(snapRotation(90)).toBe(90);
	});
	it("treats the threshold boundary as free (strict <)", () => {
		expect(snapRotation(7)).toBe(7); // exactly 7° from 0 → free
		expect(snapRotation(6)).toBe(0); // 6° from 0 → snaps
	});
});
