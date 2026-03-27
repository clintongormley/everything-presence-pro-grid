import { html, render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-live-view.js";
import type { EppLiveView } from "../../components/epp-live-view.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(overrides?: Partial<Record<string, unknown>>): EppLiveView {
	const el = document.createElement("epp-live-view") as EppLiveView;
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.zoneConfigs = new Array(7).fill(null);
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

describe("epp-live-view element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-live-view");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-live-view") as EppLiveView;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = document.createElement("epp-live-view") as any;
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("render()", () => {
	it("renders panel layout with editor-layout", () => {
		const lv = createView();
		const tpl = lv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".panel")).not.toBeNull();
		expect(c.querySelector(".editor-layout")).not.toBeNull();
		expect(c.querySelector(".zone-sidebar")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders sidebar header with live overview title", () => {
		const lv = createView();
		const tpl = lv.render();
		const c = renderTo(tpl);

		const title = c.querySelector(".sidebar-title");
		expect(title).not.toBeNull();
		expect(title!.textContent).toContain("sidebar.live_overview");
		document.body.removeChild(c);
	});

	it("renders epp-live-sidebar component", () => {
		const lv = createView();
		const tpl = lv.render();
		const c = renderTo(tpl);

		const sidebar = c.querySelector("epp-live-sidebar");
		expect(sidebar).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders menu button", () => {
		const lv = createView();
		const tpl = lv.render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".sidebar-menu-btn");
		expect(btn).not.toBeNull();
		document.body.removeChild(c);
	});

	it("does not render menu dropdown when showMenu is false", () => {
		const lv = createView({ showMenu: false });
		const tpl = lv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".sidebar-menu")).toBeNull();
		document.body.removeChild(c);
	});

	it("renders menu dropdown when showMenu is true", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".sidebar-menu")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders header template in the panel", () => {
		const lv = createView({
			headerTemplate: html`<div class="test-header">Header</div>`,
		});
		const tpl = lv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".test-header")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders grid template in grid-container", () => {
		const lv = createView({
			gridTemplate: html`<div class="test-grid">Grid</div>`,
		});
		const tpl = lv.render();
		const c = renderTo(tpl);

		const gridContainer = c.querySelector(".grid-container");
		expect(gridContainer).not.toBeNull();
		expect(gridContainer!.querySelector(".test-grid")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders debug log template", () => {
		const lv = createView({
			debugLogTemplate: html`<div class="test-debug">Debug</div>`,
		});
		const tpl = lv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".test-debug")).not.toBeNull();
		document.body.removeChild(c);
	});
});

describe("menu with perspective", () => {
	it("shows zone and furniture items when perspective exists", () => {
		const lv = createView({
			showMenu: true,
			perspective: [1, 0, 0, 0, 1, 0, 0, 0],
		});
		const tpl = lv.render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		// With perspective: zones, furniture, settings, calibration, delete, save, load = 7
		expect(items.length).toBe(7);
		document.body.removeChild(c);
	});

	it("hides zone/furniture/delete items when no perspective", () => {
		const lv = createView({ showMenu: true, perspective: null });
		const tpl = lv.render();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		// Without perspective: settings, calibration, save, load = 4
		expect(items.length).toBe(4);
		document.body.removeChild(c);
	});
});

describe("menu toggle", () => {
	it("clicking menu button toggles showMenu", () => {
		const lv = createView({ showMenu: false });
		const tpl = lv.render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".sidebar-menu-btn") as HTMLElement;
		btn.click();
		expect(lv.showMenu).toBe(true);
		document.body.removeChild(c);
	});

	it("clicking outside menu closes it", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		const panel = c.querySelector(".panel") as HTMLElement;
		panel.click();
		expect(lv.showMenu).toBe(false);
		document.body.removeChild(c);
	});

	it("clicking sidebar-menu closes menu", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		const menu = c.querySelector(".sidebar-menu") as HTMLElement;
		menu.click();
		expect(lv.showMenu).toBe(false);
		document.body.removeChild(c);
	});
});

describe("navigate-view events", () => {
	it("detection zones fires navigate-view with editor/zones", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("navigate-view", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[0] as HTMLElement).click();
		expect(detail).toEqual({ view: "editor", sidebarTab: "zones" });
		document.body.removeChild(c);
	});

	it("furniture fires navigate-view with editor/furniture", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("navigate-view", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[1] as HTMLElement).click();
		expect(detail).toEqual({ view: "editor", sidebarTab: "furniture" });
		document.body.removeChild(c);
	});

	it("settings fires navigate-view with settings", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("navigate-view", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[2] as HTMLElement).click();
		expect(detail).toEqual({ view: "settings", sidebarTab: undefined });
		document.body.removeChild(c);
	});
});

describe("live-view-action events", () => {
	it("room calibration fires change-placement action", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("live-view-action", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[3] as HTMLElement).click();
		expect(detail).toEqual({ action: "change-placement" });
		document.body.removeChild(c);
	});

	it("delete calibration fires show-delete-calibration action", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("live-view-action", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[4] as HTMLElement).click();
		expect(detail).toEqual({ action: "show-delete-calibration" });
		document.body.removeChild(c);
	});

	it("save template fires show-template-save action", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("live-view-action", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[5] as HTMLElement).click();
		expect(detail).toEqual({ action: "show-template-save" });
		document.body.removeChild(c);
	});

	it("load template fires show-template-load action", () => {
		const lv = createView({ showMenu: true });
		const tpl = lv.render();
		const c = renderTo(tpl);

		let detail: any = null;
		lv.addEventListener("live-view-action", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);

		const items = c.querySelectorAll(".sidebar-menu-item");
		(items[6] as HTMLElement).click();
		expect(detail).toEqual({ action: "show-template-load" });
		document.body.removeChild(c);
	});
});
