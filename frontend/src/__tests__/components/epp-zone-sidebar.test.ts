import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-zone-sidebar.js";
import type { EppZoneSidebar } from "../../components/epp-zone-sidebar.js";
import { ZONE_COLORS, ZONE_TYPE_DEFAULTS } from "../../lib/zone-defaults.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createSidebar(overrides: Record<string, any> = {}): EppZoneSidebar {
	const el = document.createElement("epp-zone-sidebar") as any;
	el.zoneConfigs = new Array(7).fill(null);
	el.activeZone = 0;
	el.roomType = "normal";
	el.roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
	el.roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
	el.roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
	el.roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
	el.roomEntryPoint = false;
	el.localZoneState = new Map();
	el.localize = (k: string) => k;
	Object.assign(el, overrides);
	return el as EppZoneSidebar;
}

describe("epp-zone-sidebar element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-zone-sidebar");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-zone-sidebar") as EppZoneSidebar;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = createSidebar();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("renders room boundary zone item", () => {
		const el = createSidebar();
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const zoneItems = c.querySelectorAll(".zone-item");
		expect(zoneItems.length).toBeGreaterThanOrEqual(1);

		document.body.removeChild(c);
	});

	it("renders named zones", () => {
		const el = createSidebar();
		(el as any).zoneConfigs = [
			{ name: "Kitchen", color: ZONE_COLORS[0], type: "normal" },
			{ name: "Living Room", color: ZONE_COLORS[1], type: "normal" },
			null, null, null, null, null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		// 1 boundary + 2 named zones
		const zoneItems = c.querySelectorAll(".zone-item");
		expect(zoneItems.length).toBe(3);

		document.body.removeChild(c);
	});

	it("renders add zone button when slots available", () => {
		const el = createSidebar();
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const addBtn = c.querySelector(".add-zone-btn");
		expect(addBtn).not.toBeNull();

		document.body.removeChild(c);
	});

	it("hides add zone button when all slots filled", () => {
		const el = createSidebar();
		(el as any).zoneConfigs = Array.from({ length: 7 }, (_, i) => ({
			name: `Z${i + 1}`,
			color: ZONE_COLORS[i],
			type: "normal",
		}));
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const addBtn = c.querySelector(".add-zone-btn");
		expect(addBtn).toBeNull();

		document.body.removeChild(c);
	});

	it("shows boundary type controls when boundary is active", () => {
		const el = createSidebar({ activeZone: 0 });
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const settingsRow = c.querySelector(".zone-settings-row");
		expect(settingsRow).not.toBeNull();

		document.body.removeChild(c);
	});

	it("shows zone type controls when a named zone is active", () => {
		const el = createSidebar({ activeZone: 1 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: ZONE_COLORS[0], type: "normal" },
			null, null, null, null, null, null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const settingsRow = c.querySelector(".zone-settings-row");
		expect(settingsRow).not.toBeNull();

		document.body.removeChild(c);
	});

	it("shows color picker for active named zone", () => {
		const el = createSidebar({ activeZone: 1 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "normal" },
			null, null, null, null, null, null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const colorPicker = c.querySelector(".zone-color-picker");
		expect(colorPicker).not.toBeNull();

		document.body.removeChild(c);
	});

	it("shows color dot (not picker) for inactive named zone", () => {
		const el = createSidebar({ activeZone: 0 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "normal" },
			null, null, null, null, null, null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const colorPicker = c.querySelector(".zone-color-picker");
		expect(colorPicker).toBeNull();

		const colorDots = c.querySelectorAll(".zone-color-dot");
		// 1 boundary dot + 1 zone dot
		expect(colorDots.length).toBe(2);

		document.body.removeChild(c);
	});
});

describe("epp-zone-sidebar events", () => {
	it("fires zone-select on boundary click", () => {
		const el = createSidebar({ activeZone: null });
		const handler = vi.fn();
		el.addEventListener("zone-select", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const zoneItems = c.querySelectorAll(".zone-item");
		(zoneItems[0] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.zone).toBe(0);

		document.body.removeChild(c);
	});

	it("fires zone-select on named zone click", () => {
		const el = createSidebar();
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "normal" },
			null, null, null, null, null, null,
		];
		const handler = vi.fn();
		el.addEventListener("zone-select", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const zoneItems = c.querySelectorAll(".zone-item");
		(zoneItems[1] as HTMLElement).click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.zone).toBe(1);

		document.body.removeChild(c);
	});

	it("fires zone-add on add button click", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("zone-add", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const addBtn = c.querySelector(".add-zone-btn") as HTMLElement;
		addBtn.click();

		expect(handler).toHaveBeenCalledTimes(1);

		document.body.removeChild(c);
	});

	it("fires zone-remove on remove button click", () => {
		const el = createSidebar({ activeZone: 1 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "normal" },
			null, null, null, null, null, null,
		];
		const handler = vi.fn();
		el.addEventListener("zone-remove", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const removeBtn = c.querySelector(".zone-remove-btn") as HTMLElement;
		removeBtn.click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.slot).toBe(1);

		document.body.removeChild(c);
	});

	it("fires zone-config-change on name input", () => {
		const el = createSidebar();
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "normal" },
			null, null, null, null, null, null,
		];
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
		nameInput.value = "Kitchen";
		nameInput.dispatchEvent(new Event("input", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.index).toBe(0);
		expect(handler.mock.calls[0][0].detail.updates.name).toBe("Kitchen");

		document.body.removeChild(c);
	});

	it("fires zone-config-change on color picker input", () => {
		const el = createSidebar({ activeZone: 1 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "normal" },
			null, null, null, null, null, null,
		];
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const colorPicker = c.querySelector(".zone-color-picker") as HTMLInputElement;
		colorPicker.value = "#00ff00";
		colorPicker.dispatchEvent(new Event("input", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.updates.color).toBe("#00ff00");

		document.body.removeChild(c);
	});

	it("fires room-config-change on boundary type select", () => {
		const el = createSidebar({ activeZone: 0 });
		const handler = vi.fn();
		el.addEventListener("room-config-change", handler);

		const tpl = (el as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "entrance";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.updates.roomType).toBe("entrance");

		document.body.removeChild(c);
	});

	it("fires dirty on boundary type change", () => {
		const el = createSidebar({ activeZone: 0 });
		const handler = vi.fn();
		el.addEventListener("dirty", handler);

		const tpl = (el as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "rest";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);

		document.body.removeChild(c);
	});

	it("fires zone-config-change on zone type select", () => {
		const el = createSidebar();
		const zone = { name: "Z1", color: "#ff0000", type: "normal" as const };
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);

		const tpl = (el as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "rest";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.index).toBe(0);
		expect(handler.mock.calls[0][0].detail.updates.type).toBe("rest");

		document.body.removeChild(c);
	});
});

describe("epp-zone-sidebar occupancy glow", () => {
	it("boundary zone dot shows glow when occupied", () => {
		const localZoneState = new Map([
			[0, { occupied: true, pendingSince: null, confirmedTargets: new Set<number>() }],
		]);
		const el = createSidebar({ localZoneState });
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const dot = c.querySelector(".zone-color-dot") as HTMLElement;
		expect(dot.getAttribute("style")).toContain("box-shadow");

		document.body.removeChild(c);
	});

	it("named zone dot shows glow when occupied", () => {
		const localZoneState = new Map([
			[1, { occupied: true, pendingSince: null, confirmedTargets: new Set<number>() }],
		]);
		const el = createSidebar({ activeZone: 0, localZoneState });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: ZONE_COLORS[0], type: "normal" },
			null, null, null, null, null, null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		// First dot is boundary, second is zone Z1
		const dots = c.querySelectorAll(".zone-color-dot");
		const zoneDot = dots[1] as HTMLElement;
		expect(zoneDot.getAttribute("style")).toContain("box-shadow");

		document.body.removeChild(c);
	});

	it("zone dot has no glow when not occupied", () => {
		const el = createSidebar();
		(el as any).zoneConfigs = [
			{ name: "Z1", color: ZONE_COLORS[0], type: "normal" },
			null, null, null, null, null, null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".zone-color-dot");
		const zoneDot = dots[1] as HTMLElement;
		expect(zoneDot.getAttribute("style")).not.toContain("box-shadow");

		document.body.removeChild(c);
	});
});
