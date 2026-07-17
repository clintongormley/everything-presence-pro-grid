import { describe, expect, it } from "vitest";
import "../components/epp-grid.js";
import type { EppGrid } from "../components/epp-grid.js";
import { initGridFromRoom } from "../lib/grid.js";

function mountGrid(floorPlan?: string, opacity = 1): Promise<EppGrid> {
	const el = document.createElement("epp-grid") as EppGrid;
	// A 3m x 2m room gives a non-empty raw-bounds rectangle.
	el.grid = initGridFromRoom(3000, 2000);
	el.roomWidth = 3000;
	el.roomDepth = 2000;
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.plain = true;
	el.fadeUncovered = true;
	if (floorPlan) el.floorPlan = floorPlan;
	el.floorPlanOpacity = opacity;
	document.body.appendChild(el);
	return el.updateComplete.then(() => el);
}

describe("epp-grid floor plan", () => {
	it("renders no plan layer when floorPlan is unset", async () => {
		const el = await mountGrid();
		expect(el.shadowRoot!.querySelector(".floor-plan")).toBeNull();
		document.body.replaceChildren();
	});

	it("renders the plan image with src + opacity when floorPlan is set", async () => {
		const el = await mountGrid("/api/image/serve/abc/original", 0.5);
		const layer = el.shadowRoot!.querySelector(".floor-plan") as HTMLElement;
		expect(layer).toBeTruthy();
		expect(layer.style.opacity).toBe("0.5");
		const img = layer.querySelector("img") as HTMLImageElement;
		expect(img.getAttribute("src")).toBe("/api/image/serve/abc/original");
		document.body.replaceChildren();
	});

	it("makes in-room cells transparent when a plan is set (plain mode)", async () => {
		const withPlan = await mountGrid("/api/image/serve/abc/original");
		const cells = Array.from(
			withPlan.shadowRoot!.querySelectorAll<HTMLElement>(".cell"),
		);
		// At least one rendered in-room cell is transparent (was room-colour fill).
		expect(cells.some((c) => c.style.background.includes("transparent"))).toBe(
			true,
		);
		document.body.replaceChildren();
	});

	it("hides the plan layer after an image load error", async () => {
		const el = await mountGrid("/api/image/serve/missing/original");
		const img = el.shadowRoot!.querySelector(
			".floor-plan img",
		) as HTMLImageElement;
		img.dispatchEvent(new Event("error"));
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".floor-plan")).toBeNull();
		document.body.replaceChildren();
	});
});
