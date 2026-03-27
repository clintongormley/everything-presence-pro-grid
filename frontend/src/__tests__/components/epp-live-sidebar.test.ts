import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-live-sidebar.js";
import type { EppLiveSidebar } from "../../components/epp-live-sidebar.js";
import { ZONE_COLORS } from "../../lib/zone-defaults.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

describe("epp-live-sidebar element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-live-sidebar");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-live-sidebar") as EppLiveSidebar;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const result = el.render();
		expect(result).toBeDefined();
	});

	it("renders presence section with mock sensor state", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: true,
			static_presence: true,
			motion_presence: false,
			target_presence: true,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		expect(dots.length).toBeGreaterThanOrEqual(4);

		// First dot should be "on" (occupancy = true)
		expect(dots[0].classList.contains("on")).toBe(true);
		// Third dot should be "off" (motion_presence = false)
		expect(dots[2].classList.contains("off")).toBe(true);

		document.body.removeChild(c);
	});

	it("renders zone section when perspective is set", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "normal",
		};
		el.zoneState = {
			occupancy: { 1: true, 0: false },
			target_counts: { 1: 2, 0: 0 },
			frame_count: 50,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		// Should have a detection zones link
		const link = c.querySelector(".live-section-link");
		expect(link).not.toBeNull();

		// Should have zone dots (beyond the 4 presence sensors)
		const dots = c.querySelectorAll(".live-sensor-dot");
		expect(dots.length).toBeGreaterThan(4);

		document.body.removeChild(c);
	});

	it("does not render zone section when perspective is null", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.perspective = null;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "normal",
		};

		const tpl = el.render();
		const c = renderTo(tpl);

		const link = c.querySelector(".live-section-link");
		expect(link).toBeNull();

		document.body.removeChild(c);
	});

	it("renders environment sensors when values are non-null", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 150.3,
			temperature: 22.5,
			humidity: 45.0,
			co2: 412,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const values = c.querySelectorAll(".live-sensor-value");
		expect(values.length).toBe(4);

		document.body.removeChild(c);
	});

	it("does not render environment section when all values are null", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const values = c.querySelectorAll(".live-sensor-value");
		expect(values.length).toBe(0);

		document.body.removeChild(c);
	});

	it("fires view-change event when detection zones link is clicked", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };

		const handler = vi.fn();
		el.addEventListener("view-change", handler);

		const tpl = el.render();
		const c = renderTo(tpl);

		const link = c.querySelector(".live-section-link") as HTMLElement;
		expect(link).not.toBeNull();
		link.click();

		expect(handler).toHaveBeenCalledTimes(1);
		const detail = handler.mock.calls[0][0].detail;
		expect(detail.view).toBe("editor");
		expect(detail.sidebarTab).toBe("zones");

		document.body.removeChild(c);
	});

	it("toggles sensor info expansion on button click", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		expect(el._expandedSensorInfo).toBeNull();

		const tpl = el.render();
		const c = renderTo(tpl);

		const infoBtns = c.querySelectorAll(".live-sensor-info-btn");
		expect(infoBtns.length).toBeGreaterThanOrEqual(4);

		// Click first info button — should expand
		(infoBtns[0] as HTMLElement).click();
		expect(el._expandedSensorInfo).toBe("occupancy");

		// Click same button again — should collapse
		// Need to re-render since the template binds to the element's state
		const tpl2 = el.render();
		const c2 = renderTo(tpl2);
		const infoBtns2 = c2.querySelectorAll(".live-sensor-info-btn");
		(infoBtns2[0] as HTMLElement).click();
		expect(el._expandedSensorInfo).toBeNull();

		document.body.removeChild(c);
		document.body.removeChild(c2);
	});

	it("renders rest-of-room zone even with no configured zones", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneState = {
			occupancy: { 0: true },
			target_counts: { 0: 1 },
			frame_count: 10,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		// Should still have dots beyond presence sensors (rest-of-room)
		const dots = c.querySelectorAll(".live-sensor-dot");
		// 4 presence + 1 rest-of-room = 5
		expect(dots.length).toBe(5);

		document.body.removeChild(c);
	});
});
