import { html, nothing, render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-editor-view.js";
import "../../components/epp-zone-sidebar.js";
import "../../components/epp-furniture-sidebar.js";
import type { EppEditorView } from "../../components/epp-editor-view.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(
	overrides?: Partial<Record<string, unknown>>,
): EppEditorView {
	const el = document.createElement("epp-editor-view") as EppEditorView;
	el.zoneConfigs = new Array(7).fill(null);
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

describe("epp-editor-view element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-editor-view");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-editor-view") as EppEditorView;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = document.createElement("epp-editor-view") as any;
		const result = el.render();
		expect(result).toBeDefined();
	});
});

describe("render()", () => {
	it("renders panel layout with editor-layout", () => {
		const ev = createView();
		const tpl = ev.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".panel")).not.toBeNull();
		expect(c.querySelector(".editor-layout")).not.toBeNull();
		expect(c.querySelector(".zone-sidebar")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders sidebar title for zones tab", () => {
		const ev = createView({ sidebarTab: "zones" });
		const tpl = ev.render();
		const c = renderTo(tpl);

		const title = c.querySelector(".sidebar-title");
		expect(title).not.toBeNull();
		expect(title!.textContent).toContain("sidebar.detection_zones");
		document.body.removeChild(c);
	});

	it("renders sidebar title for furniture tab", () => {
		const ev = createView({ sidebarTab: "furniture" });
		const tpl = ev.render();
		const c = renderTo(tpl);

		const title = c.querySelector(".sidebar-title");
		expect(title).not.toBeNull();
		expect(title!.textContent).toContain("sidebar.furniture");
		document.body.removeChild(c);
	});

	it("renders epp-zone-sidebar when sidebarTab is zones", () => {
		const ev = createView({ sidebarTab: "zones" });
		const tpl = ev.render();
		const c = renderTo(tpl);

		expect(c.querySelector("epp-zone-sidebar")).not.toBeNull();
		expect(c.querySelector("epp-furniture-sidebar")).toBeNull();
		document.body.removeChild(c);
	});

	it("renders epp-furniture-sidebar when sidebarTab is furniture", () => {
		const ev = createView({ sidebarTab: "furniture" });
		const tpl = ev.render();
		const c = renderTo(tpl);

		expect(c.querySelector("epp-furniture-sidebar")).not.toBeNull();
		expect(c.querySelector("epp-zone-sidebar")).toBeNull();
		document.body.removeChild(c);
	});

	it("renders header template", () => {
		const ev = createView({
			headerTemplate: html`<div class="test-header">Header</div>`,
		});
		const tpl = ev.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".test-header")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders grid template in grid-container", () => {
		const ev = createView({
			gridTemplate: html`<div class="test-grid">Grid</div>`,
		});
		const tpl = ev.render();
		const c = renderTo(tpl);

		const gridContainer = c.querySelector(".grid-container");
		expect(gridContainer).not.toBeNull();
		expect(gridContainer!.querySelector(".test-grid")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders debug log template", () => {
		const ev = createView({
			debugLogTemplate: html`<div class="test-debug">Debug</div>`,
		});
		const tpl = ev.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".test-debug")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders save/cancel template in sidebar", () => {
		const ev = createView({
			saveCancelTemplate: html`<div class="test-save">Save</div>`,
		});
		const tpl = ev.render();
		const c = renderTo(tpl);

		const sidebar = c.querySelector(".zone-sidebar");
		expect(sidebar).not.toBeNull();
		expect(sidebar!.querySelector(".test-save")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders nothing for missing templates", () => {
		const ev = createView({
			headerTemplate: nothing,
			gridTemplate: nothing,
			debugLogTemplate: nothing,
			saveCancelTemplate: nothing,
		});
		const tpl = ev.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".panel")).not.toBeNull();
		document.body.removeChild(c);
	});
});

describe("editor-panel-click event", () => {
	it("fires editor-panel-click when clicking panel outside grid/sidebar", () => {
		const ev = createView();
		const tpl = ev.render();
		const c = renderTo(tpl);

		let fired = false;
		ev.addEventListener("editor-panel-click", () => {
			fired = true;
		});

		const panel = c.querySelector(".panel") as HTMLElement;
		panel.click();
		expect(fired).toBe(true);
		document.body.removeChild(c);
	});

	it("does not fire editor-panel-click when clicking inside zone-sidebar", () => {
		const ev = createView({ sidebarTab: "zones" });
		const tpl = ev.render();
		const c = renderTo(tpl);

		let fired = false;
		ev.addEventListener("editor-panel-click", () => {
			fired = true;
		});

		const sidebar = c.querySelector(".zone-sidebar") as HTMLElement;
		sidebar.click();
		expect(fired).toBe(false);
		document.body.removeChild(c);
	});
});

describe("editor-grid-container-click event", () => {
	it("fires editor-grid-container-click when clicking grid container", () => {
		const ev = createView();
		const tpl = ev.render();
		const c = renderTo(tpl);

		let fired = false;
		ev.addEventListener("editor-grid-container-click", () => {
			fired = true;
		});

		const gridContainer = c.querySelector(".grid-container") as HTMLElement;
		gridContainer.click();
		expect(fired).toBe(true);
		document.body.removeChild(c);
	});
});
