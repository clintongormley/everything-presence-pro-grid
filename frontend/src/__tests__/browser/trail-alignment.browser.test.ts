// Real-layout regression test for #377: the movement trail was drawn in the
// WRONG place — offset from the target dot it is supposed to trail behind.
//
// The dot (a `left:%/top:%` div) and the trail (an SVG `<polyline>` in a
// `viewBox="0 0 100 100"` space) both map a target's room-space mm through the
// identical `mapTargetToGridCell` + percentage transform, so the trail's
// LEADING vertex (its most recent point) MUST render exactly on the dot when
// they carry the same coordinate. Whether that holds depends on the trail
// `<svg>` filling the same box the dot's overlay does — a pure-layout fact that
// happy-dom (no layout engine) cannot see, so this must run in real Chromium.
//
// Crucially the room is deliberately NON-SQUARE (wider than deep). The #377 bug
// was a viewBox'd `<svg>` deriving a SQUARE height from its 1:1 intrinsic ratio;
// in a square box that square SVG happens to match, hiding the defect. A
// non-square map is what exposes it — the pre-fix trail's leading vertex lands
// ~180px off, the fixed one within a pixel. Two target depths pin both the
// vertical offset and the Y-axis scale.
import { describe, expect, it } from "vitest";
import "../../components/epp-grid.js";
import type { EppGrid } from "../../components/epp-grid.js";
import { initGridFromRoom } from "../../lib/grid.js";
import { registerPanelCleanup } from "../helpers/panel-cleanup.js";

// Wider than deep (2:1) so the map box is non-square regardless of how the grid
// fits its host — the condition under which #377 manifests.
const ROOM_W = 6000;
const ROOM_D = 3000;

const mounted: HTMLElement[] = [];
registerPanelCleanup(mounted);

/** Let Lit render, the ResizeObserver measure the box, then Lit settle again. */
async function settle(el: EppGrid): Promise<void> {
	await el.updateComplete;
	await new Promise((r) =>
		requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
	);
	await el.updateComplete;
}

/** Mount a real, laid-out <epp-grid> in a non-square box with a definite size. */
async function mountGrid(props: Partial<EppGrid>): Promise<EppGrid> {
	const el = document.createElement("epp-grid") as EppGrid;
	el.style.display = "block";
	el.style.width = "800px";
	el.style.height = "600px";
	Object.assign(el, {
		roomWidth: ROOM_W,
		roomDepth: ROOM_D,
		grid: initGridFromRoom(ROOM_W, ROOM_D),
		showHeatmap: true,
		...props,
	});
	document.body.appendChild(el);
	mounted.push(el);
	await settle(el);
	return el;
}

describe("#377 the trail's leading point lands on the target dot", () => {
	// Both targets sit INSIDE the 6000x3000 room (mapTargetToGridCell does not
	// clamp, so an out-of-room target would map off-grid and its dot wouldn't
	// render). Different depths (y) so a wrong Y-scale — not just a constant
	// offset — is caught: a scale error displaces the deep target far more than
	// the shallow one.
	it.each([
		["deep, far edge", 5000, 2400],
		["shallow, near edge", 1200, 600],
	])(
		"draws the trail's leading vertex on the dot for a target (%s)",
		async (_label, tx, ty) => {
			const el = await mountGrid({
				targets: [{ x: tx, y: ty, status: "active", signal: 90 }],
				trails: [
					[
						{ x: tx - 1000, y: ty - 500 },
						{ x: tx, y: ty },
					],
				],
			});

			const dot = el.shadowRoot!.querySelector<HTMLElement>(".target-dot");
			expect(dot, "target dot rendered").not.toBeNull();
			const d = dot!.getBoundingClientRect();
			const dotCx = d.left + d.width / 2;
			const dotCy = d.top + d.height / 2;

			const svg = el.shadowRoot!.querySelector<SVGSVGElement>("svg.trail");
			expect(svg, "trail svg rendered").not.toBeNull();
			const polyline = svg!.querySelector("polyline")!;
			const pts = polyline.points;
			const lastUser = pts.getItem(pts.numberOfItems - 1);
			// Map the polyline's last vertex from its own user space (the viewBox)
			// to on-screen pixels — exactly where the browser paints it.
			const lastScreen = lastUser.matrixTransform(polyline.getScreenCTM()!);

			// The leading vertex is drawn AT the dot. Chromium lays out in 1/64px
			// LayoutUnits, so a sub-pixel tolerance still fails the ~180px #377 gap.
			expect(Math.abs(lastScreen.x - dotCx)).toBeLessThan(1);
			expect(Math.abs(lastScreen.y - dotCy)).toBeLessThan(1);
		},
	);
});

// #377 follow-up: the user still saw the offset on rc.3 (which shipped the fix)
// in the DASHBOARD CARD, whose <epp-grid> runs in FILL mode (grid grows to fill
// its measured width, no height budget) at the reported room of 4.2m x 2.7m.
// Fill mode is the one structural difference the test above (a fixed 800x600
// measured box) does not exercise. If the fix were fill-mode-specific-broken the
// trail would detach here; if it holds, a residual-code bug is ruled out and the
// live offset can only be a stale (pre-fix) bundle in the client.
const CARD_ROOM_W = 4200;
const CARD_ROOM_D = 2700;

describe("#377 fill-mode (dashboard card) trail lands on the dot", () => {
	it.each([
		["deep", 3600, 2400],
		["shallow", 1000, 500],
	])(
		"draws the trail's leading vertex on the dot in fill mode (%s)",
		async (_label, tx, ty) => {
			const el = document.createElement("epp-grid") as EppGrid;
			el.style.display = "block";
			// A wide card-like host: fill mode measures this width and grows the
			// map to fit it, ignoring height (mirrors the overview card).
			el.style.width = "900px";
			el.style.height = "700px";
			Object.assign(el, {
				roomWidth: CARD_ROOM_W,
				roomDepth: CARD_ROOM_D,
				grid: initGridFromRoom(CARD_ROOM_W, CARD_ROOM_D),
				showHeatmap: true,
				fill: true,
				targets: [{ x: tx, y: ty, status: "active", signal: 90 }],
				trails: [
					[
						{ x: tx - 800, y: ty - 400 },
						{ x: tx, y: ty },
					],
				],
			});
			document.body.appendChild(el);
			mounted.push(el);
			await settle(el);

			const dot = el.shadowRoot!.querySelector<HTMLElement>(".target-dot");
			expect(dot, "target dot rendered").not.toBeNull();
			const d = dot!.getBoundingClientRect();
			const dotCx = d.left + d.width / 2;
			const dotCy = d.top + d.height / 2;

			const svg = el.shadowRoot!.querySelector<SVGSVGElement>("svg.trail");
			expect(svg, "trail svg rendered").not.toBeNull();
			const polyline = svg!.querySelector("polyline")!;
			const pts = polyline.points;
			const lastUser = pts.getItem(pts.numberOfItems - 1);
			const lastScreen = lastUser.matrixTransform(polyline.getScreenCTM()!);

			expect(Math.abs(lastScreen.x - dotCx)).toBeLessThan(1);
			expect(Math.abs(lastScreen.y - dotCy)).toBeLessThan(1);
		},
	);
});
