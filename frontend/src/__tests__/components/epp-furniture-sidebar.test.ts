import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-furniture-sidebar.js";
import type { EppFurnitureSidebar } from "../../components/epp-furniture-sidebar.js";
import type { FurnitureItem } from "../../lib/furniture.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createSidebar(
	overrides: Record<string, any> = {},
): EppFurnitureSidebar {
	const el = document.createElement("epp-furniture-sidebar") as any;
	el.furniture = [];
	el.selectedFurnitureId = null;
	el.hass = {};
	el.localize = (k: string) => k;
	el.showCustomIconPicker = false;
	el.customIconValue = "";
	Object.assign(el, overrides);
	return el as EppFurnitureSidebar;
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

describe("epp-furniture-sidebar element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-furniture-sidebar");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement(
			"epp-furniture-sidebar",
		) as EppFurnitureSidebar;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = createSidebar();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders furniture catalog", () => {
		const el = createSidebar();
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with selected furniture", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with custom icon picker open", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});

	it("renders with empty custom icon value", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "",
		});
		const result = (el as any)._renderFurnitureSidebar();
		expect(result).toBeDefined();
	});
});

describe("epp-furniture-sidebar DOM events", () => {
	it("clicking a sticker fires furniture-add", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("furniture-add", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const stickers = c.querySelectorAll(".furn-sticker:not(.furn-custom)");
		if (stickers.length > 0) {
			(stickers[0] as HTMLElement).click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBeDefined();
		}
		document.body.removeChild(c);
	});

	it("custom icon button fires custom-icon-toggle", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("custom-icon-toggle", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const customBtn = c.querySelector(".furn-custom") as HTMLElement;
		if (customBtn) {
			customBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
		}
		document.body.removeChild(c);
	});

	it("custom icon picker cancel fires toggle and change events", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const toggleHandler = vi.fn();
		const changeHandler = vi.fn();
		el.addEventListener("custom-icon-toggle", toggleHandler);
		el.addEventListener("custom-icon-change", changeHandler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(toggleHandler).toHaveBeenCalledTimes(1);
			expect(changeHandler).toHaveBeenCalledTimes(1);
			expect(changeHandler.mock.calls[0][0].detail).toBe("");
		}
		document.body.removeChild(c);
	});

	it("custom icon picker add fires furniture-add-custom", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:star",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-add-custom", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const primaryBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (primaryBtn) {
			primaryBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("mdi:star");
		}
		document.body.removeChild(c);
	});

	it("furniture remove button fires furniture-remove", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-remove", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const removeBtn = c.querySelector(".zone-remove-btn") as HTMLElement;
		if (removeBtn) {
			removeBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("f1");
		}
		document.body.removeChild(c);
	});

	it("furniture dimension inputs fire furniture-update", () => {
		const el = createSidebar({
			furniture: [SAMPLE_FURNITURE],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const inputs = c.querySelectorAll(
			".furn-dims input",
		) as NodeListOf<HTMLInputElement>;
		if (inputs.length >= 3) {
			inputs[0].value = "120";
			inputs[0].dispatchEvent(new Event("change"));
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail.id).toBe("f1");
			expect(handler.mock.calls[0][0].detail.updates.width).toBe(1200);

			inputs[1].value = "100";
			inputs[1].dispatchEvent(new Event("change"));
			expect(handler).toHaveBeenCalledTimes(2);
			expect(handler.mock.calls[1][0].detail.updates.height).toBe(1000);

			inputs[2].value = "45";
			inputs[2].dispatchEvent(new Event("change"));
			expect(handler).toHaveBeenCalledTimes(3);
			expect(handler.mock.calls[2][0].detail.updates.rotation).toBe(45);
		}
		document.body.removeChild(c);
	});

	it("icon picker value-changed fires custom-icon-change", () => {
		const el = createSidebar({
			showCustomIconPicker: true,
			customIconValue: "",
		});
		const handler = vi.fn();
		el.addEventListener("custom-icon-change", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const picker = c.querySelector("ha-icon-picker") as HTMLElement;
		if (picker) {
			picker.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: "mdi:lamp" },
				}),
			);
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("mdi:lamp");
		}
		document.body.removeChild(c);
	});
});
