import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-furniture-overlay.js";
import type { EppFurnitureOverlay } from "../../components/epp-furniture-overlay.js";
import type { FurnitureItem } from "../../lib/furniture.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createOverlay(
	overrides: Record<string, any> = {},
): EppFurnitureOverlay {
	const el = document.createElement("epp-furniture-overlay") as any;
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.roomWidth = 3000;
	el.cellPx = 28;
	el.minCol = 0;
	el.minRow = 0;
	el.visCols = 20;
	el.visRows = 20;
	el.sidebarTab = "furniture";
	el.localize = (k: string) => k;
	Object.assign(el, overrides);
	return el as EppFurnitureOverlay;
}

const SAMPLE_FURNITURE: FurnitureItem = {
	id: "f1",
	type: "svg",
	icon: "armchair",
	label: "Chair",
	x: 100,
	y: 200,
	width: 800,
	height: 800,
	rotation: 0,
	lockAspect: false,
};

const ICON_FURNITURE: FurnitureItem = {
	id: "f2",
	type: "icon",
	icon: "mdi:desk",
	label: "Desk",
	x: 100,
	y: 200,
	width: 1400,
	height: 700,
	rotation: 45,
	lockAspect: false,
};

describe("epp-furniture-overlay element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-furniture-overlay");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-furniture-overlay");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders nothing when furniture is empty", () => {
		const el = createOverlay();
		const result = (el as any).render();
		// Lit's nothing sentinel
		expect(result).toBeDefined();
	});

	it("renders furniture items with svg type", () => {
		const el = createOverlay({ furniture: [SAMPLE_FURNITURE] });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders furniture items with icon type", () => {
		const el = createOverlay({ furniture: [ICON_FURNITURE] });
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders non-interactive when sidebarTab is not furniture", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "zones",
		});
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders selected furniture with handles", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const result = (el as any).render();
		expect(result).toBeDefined();
	});
});

describe("epp-furniture-overlay DOM rendering", () => {
	it("renders all 8 resize handles when selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const handles = c.querySelectorAll(".furn-handle");
		expect(handles.length).toBe(8);

		document.body.removeChild(c);
	});

	it("renders rotate stem and handle when selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const stem = c.querySelector(".furn-rotate-stem");
		const handle = c.querySelector(".furn-rotate-handle");
		expect(stem).not.toBeNull();
		expect(handle).not.toBeNull();

		document.body.removeChild(c);
	});

	it("renders delete button when selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const deleteBtn = c.querySelector(".furn-delete-btn");
		expect(deleteBtn).not.toBeNull();

		document.body.removeChild(c);
	});

	it("does not render handles when not selected", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: null,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const handles = c.querySelectorAll(".furn-handle");
		expect(handles.length).toBe(0);

		document.body.removeChild(c);
	});

	it("applies non-interactive class when sidebarTab is not furniture", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "zones",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const overlay = c.querySelector(".furniture-overlay");
		expect(overlay?.classList.contains("non-interactive")).toBe(true);

		document.body.removeChild(c);
	});

	it("does not apply non-interactive class when sidebarTab is furniture", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			sidebarTab: "furniture",
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const overlay = c.querySelector(".furniture-overlay");
		expect(overlay?.classList.contains("non-interactive")).toBe(false);

		document.body.removeChild(c);
	});

	it("positions furniture items correctly based on room coordinates", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			cellPx: 28,
			minCol: 0,
			minRow: 0,
			roomWidth: 3000,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const item = c.querySelector(".furniture-item") as HTMLElement;
		expect(item).not.toBeNull();
		if (item) {
			expect(item.style.transform).toContain("rotate(0deg)");
		}

		document.body.removeChild(c);
	});
});

describe("epp-furniture-overlay events", () => {
	it("fires furniture-select on item pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: null,
		});

		const selectHandler = vi.fn();
		el.addEventListener("furniture-select", selectHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const item = c.querySelector(".furniture-item") as HTMLElement;
		if (item) {
			item.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(selectHandler).toHaveBeenCalledTimes(1);
			expect(selectHandler.mock.calls[0][0].detail).toBe("f1");
		}

		document.body.removeChild(c);
	});

	it("fires furniture-pointer-down with move type on item pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
		});

		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const item = c.querySelector(".furniture-item") as HTMLElement;
		if (item) {
			item.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(ptrHandler).toHaveBeenCalledTimes(1);
			const detail = ptrHandler.mock.calls[0][0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("move");
		}

		document.body.removeChild(c);
	});

	it("fires furniture-pointer-down with resize type on handle pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});

		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const handle = c.querySelector(".furn-handle-se") as HTMLElement;
		if (handle) {
			handle.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(ptrHandler).toHaveBeenCalled();
			const detail = ptrHandler.mock.calls[0][0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("resize");
			expect(detail.handle).toBe("se");
		}

		document.body.removeChild(c);
	});

	it("forwards item rotation in furniture-pointer-down resize detail", () => {
		const rotated: FurnitureItem = { ...ICON_FURNITURE, id: "rot1" };
		const el = createOverlay({
			furniture: [rotated],
			selectedFurnitureId: "rot1",
		});
		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const c = renderTo((el as any).render());
		const handle = c.querySelector(".furn-handle-se") as HTMLElement;
		handle.dispatchEvent(
			new PointerEvent("pointerdown", {
				clientX: 100,
				clientY: 100,
				bubbles: true,
			}),
		);
		const detail = ptrHandler.mock.calls[0][0].detail;
		expect(detail.type).toBe("resize");
		expect(detail.rotation).toBe(45);
		document.body.removeChild(c);
	});

	it("forwards item rotation in furniture-pointer-down move detail", () => {
		const rotated: FurnitureItem = { ...ICON_FURNITURE, id: "rot2" };
		const el = createOverlay({
			furniture: [rotated],
			selectedFurnitureId: "rot2",
		});
		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const c = renderTo((el as any).render());
		const item = c.querySelector(
			'.furniture-item[data-id="rot2"]',
		) as HTMLElement;
		item.dispatchEvent(
			new PointerEvent("pointerdown", {
				clientX: 100,
				clientY: 100,
				bubbles: true,
			}),
		);
		// move detail is fired second (after furniture-select fires nothing on
		// furniture-pointer-down listener); pick the move event by type.
		const moveCall = ptrHandler.mock.calls.find(
			(c) => c[0].detail?.type === "move",
		);
		expect(moveCall).toBeTruthy();
		expect(moveCall![0].detail.rotation).toBe(45);
		document.body.removeChild(c);
	});

	it("fires furniture-pointer-down with rotate type on rotate handle", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});

		const ptrHandler = vi.fn();
		el.addEventListener("furniture-pointer-down", ptrHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const rotateHandle = c.querySelector(".furn-rotate-handle") as HTMLElement;
		if (rotateHandle) {
			rotateHandle.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: 500,
					clientY: 300,
					bubbles: true,
				}),
			);
			expect(ptrHandler).toHaveBeenCalled();
			const detail = ptrHandler.mock.calls[0][0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("rotate");
		}

		document.body.removeChild(c);
	});

	it("fires furniture-delete on delete button pointerdown", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});

		const deleteHandler = vi.fn();
		el.addEventListener("furniture-delete", deleteHandler);

		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const deleteBtn = c.querySelector(".furn-delete-btn") as HTMLElement;
		if (deleteBtn) {
			deleteBtn.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
				}),
			);
			expect(deleteHandler).toHaveBeenCalledTimes(1);
			expect(deleteHandler.mock.calls[0][0].detail).toBe("f1");
		}

		document.body.removeChild(c);
	});
});

describe("epp-furniture-overlay shadow DOM resize handles", () => {
	let el: EppFurnitureOverlay;

	afterEach(() => {
		if (el?.parentNode) el.parentNode.removeChild(el);
	});

	const DIRECTIONS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

	for (const dir of DIRECTIONS) {
		it(`fires furniture-pointer-down with resize handle "${dir}" via shadow DOM`, async () => {
			el = createOverlay({
				furniture: [SAMPLE_FURNITURE],
				selectedFurnitureId: "f1",
			});
			document.body.appendChild(el);
			await el.updateComplete;

			const handler = vi.fn();
			el.addEventListener("furniture-pointer-down", handler);

			const handle = el.shadowRoot!.querySelector(
				`.furn-handle-${dir}`,
			) as HTMLElement;
			expect(handle).not.toBeNull();

			handle.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					composed: true,
					clientX: 100,
					clientY: 100,
				}),
			);

			// The event bubbles from handle -> parent item, so the handler
			// fires twice: once for resize (handle) and once for move (item).
			// The resize event fires first because the handle is deeper in the DOM.
			expect(handler).toHaveBeenCalled();
			const resizeCall = handler.mock.calls.find(
				(c: any) => c[0].detail.type === "resize",
			);
			expect(resizeCall).toBeDefined();
			const detail = resizeCall![0].detail;
			expect(detail.id).toBe("f1");
			expect(detail.type).toBe("resize");
			expect(detail.handle).toBe(dir);
		});
	}
});

describe("epp-furniture-overlay default localize", () => {
	let el: EppFurnitureOverlay;

	afterEach(() => {
		if (el?.parentNode) el.parentNode.removeChild(el);
	});

	it("uses default localize identity function when none is provided", () => {
		el = document.createElement("epp-furniture-overlay") as EppFurnitureOverlay;
		el.furniture = [];
		el.selectedFurnitureId = null;
		el.roomWidth = 3000;
		el.cellPx = 28;
		el.minCol = 0;
		el.minRow = 0;
		el.visCols = 20;
		el.visRows = 20;
		el.sidebarTab = "furniture";
		// Do NOT set localize — use the default
		expect(el.localize("test_key")).toBe("test_key");
		expect(el.localize("another.key")).toBe("another.key");
	});
});

describe("touch support CSS", () => {
	it("disables touch-action on draggable furniture surfaces", () => {
		// Without touch-action: none the browser claims the touch gesture for
		// scrolling mid-drag, firing pointercancel and wedging the drag.
		const cssText = (
			(customElements.get("epp-furniture-overlay") as any).styles as {
				cssText: string;
			}
		).cssText;
		expect(cssText).toMatch(/\.furniture-item\s*{[^}]*touch-action:\s*none/);
		expect(cssText).toMatch(/\.furn-handle\s*{[^}]*touch-action:\s*none/);
		expect(cssText).toMatch(
			/\.furn-rotate-handle\s*{[^}]*touch-action:\s*none/,
		);
	});
});

describe("FLOOR_PLAN_SVGS own-property lookup", () => {
	it("falls back to ha-icon for an svg item whose icon name hits the prototype chain", async () => {
		// "constructor" is truthy via Object.prototype on a plain-object SVG
		// catalog — a truthiness check would try to render it as a floor-plan
		// SVG with viewBox undefined.
		const el = createOverlay({
			furniture: [{ ...SAMPLE_FURNITURE, type: "svg", icon: "constructor" }],
		});
		document.body.appendChild(el);
		await (el as any).updateComplete;

		expect(el.shadowRoot!.querySelector(".furn-svg")).toBeNull();
		expect(el.shadowRoot!.querySelector("ha-icon")).not.toBeNull();

		document.body.removeChild(el);
	});
});

describe("epp-furniture-overlay auto-contrast", () => {
	it("applies a colour var + has-halo to items present in the map", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			furnitureTones: new Map([
				[
					"f1",
					{
						color: "var(--epp-furniture-on-dark, #eef2f7)",
						halo: "var(--epp-furniture-halo-on-dark, rgba(0, 0, 0, 0.85))",
					},
				],
			]),
		});
		const c = renderTo((el as any).render());
		const outer = c.querySelector(".furniture-item") as HTMLElement;
		const style = outer.getAttribute("style") ?? "";
		expect(style).toContain("--epp-furniture-color:");
		expect(style).toContain("--epp-furniture-halo-color:");
		expect(outer.classList.contains("has-halo")).toBe(true);
		document.body.removeChild(c);
	});

	it("leaves items absent from the map grey with no halo", () => {
		const el = createOverlay({
			furniture: [SAMPLE_FURNITURE],
			furnitureTones: new Map(),
		});
		const c = renderTo((el as any).render());
		const outer = c.querySelector(".furniture-item") as HTMLElement;
		const style = outer.getAttribute("style") ?? "";
		expect(style).not.toContain("--epp-furniture-color");
		expect(outer.classList.contains("has-halo")).toBe(false);
		document.body.removeChild(c);
	});
});
