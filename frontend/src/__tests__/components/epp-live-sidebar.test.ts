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
			mmwave: true,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		expect(dots.length).toBeGreaterThanOrEqual(5);

		// First dot should be "on" (occupancy = true)
		expect(dots[0].classList.contains("on")).toBe(true);
		// Third dot should be "off" (motion_presence = false)
		expect(dots[2].classList.contains("off")).toBe(true);

		document.body.removeChild(c);
	});

	it("renders mmwave row reflecting mmwave field", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			mmwave: true,
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);
		const dots = c.querySelectorAll(".live-sensor-dot");
		// Order: occupancy, static, motion, target, mmwave
		expect(dots.length).toBeGreaterThanOrEqual(5);
		expect(dots[4].classList.contains("on")).toBe(true);
		document.body.removeChild(c);

		// And off when mmwave=false
		el.sensorState = { ...el.sensorState, mmwave: false };
		const tpl2 = el.render();
		const c2 = renderTo(tpl2);
		const dots2 = c2.querySelectorAll(".live-sensor-dot");
		expect(dots2[4].classList.contains("off")).toBe(true);
		document.body.removeChild(c2);
	});

	it("renders zone section when perspective is set", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "default",
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

		// Should have zone dots (beyond the 5 presence sensors)
		const dots = c.querySelectorAll(".live-sensor-dot");
		expect(dots.length).toBeGreaterThan(5);

		document.body.removeChild(c);
	});

	it("does not render zone section when perspective is null", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = false;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: ZONE_COLORS[0],
			type: "default",
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
		el.hasPerspective = true;
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

	it("renders a shared epp-info-tip per presence sensor", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const tpl = el.render();
		const c = renderTo(tpl);

		const tips = c.querySelectorAll("epp-info-tip");
		expect(tips.length).toBeGreaterThanOrEqual(5);
		expect((tips[0] as any).text).toBe("info.occupancy");
		expect((tips[0] as any).localize).toBe(el.localize);

		// The old inline expansion is gone — info opens in a tooltip instead.
		expect(c.querySelector(".live-sensor-info-btn")).toBeNull();
		expect(c.querySelector(".live-sensor-info-text")).toBeNull();

		document.body.removeChild(c);
	});

	it("renders an epp-info-tip per zone row when perspective is set", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = [
			{ name: "Sofa", color: "#ff0000", cells: [] },
			...new Array(6).fill(null),
		];
		el.zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
		const tpl = el.render();
		const c = renderTo(tpl);

		// 5 presence sensors + rest-of-room + 1 configured zone.
		const tips = c.querySelectorAll("epp-info-tip");
		expect(tips.length).toBe(7);
		expect((tips[5] as any).text).toBe("info.rest_of_room_occupancy");

		document.body.removeChild(c);
	});

	it("shows static as detected when static_state is 'A' (active)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false, // raw binary is off
			motion_presence: false,
			target_presence: false,
			static_state: "A", // but zone engine says active
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);
		const dots = c.querySelectorAll(".live-sensor-dot");
		// dot[1] = static — should be "on" because state is "A"
		expect(dots[1].classList.contains("on")).toBe(true);
		document.body.removeChild(c);
	});

	it("shows static as detected when static_state is 'P' (pending)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			static_state: "P",
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);
		const dots = c.querySelectorAll(".live-sensor-dot");
		expect(dots[1].classList.contains("on")).toBe(true);
		document.body.removeChild(c);
	});

	it("shows static as clear when static_state is 'I' (inactive)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			static_state: "I",
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);
		const dots = c.querySelectorAll(".live-sensor-dot");
		expect(dots[1].classList.contains("off")).toBe(true);
		document.body.removeChild(c);
	});

	it("shows motion as detected during pending, clear when inactive", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			motion_state: "P",
			illuminance: null,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = el.render();
		const c = renderTo(tpl);
		const dots = c.querySelectorAll(".live-sensor-dot");
		// dot[2] = motion — pending should show as "on"
		expect(dots[2].classList.contains("on")).toBe(true);
		document.body.removeChild(c);

		// Now inactive
		el.sensorState = { ...el.sensorState, motion_state: "I" };
		const tpl2 = el.render();
		const c2 = renderTo(tpl2);
		const dots2 = c2.querySelectorAll(".live-sensor-dot");
		expect(dots2[2].classList.contains("off")).toBe(true);
		document.body.removeChild(c2);
	});

	it("renders configured zone dot with the zone's color as background", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: "#B8E7FF",
			type: "default",
		};
		el.zoneState = {
			occupancy: { 1: false, 0: false },
			target_counts: { 1: 0, 0: 0 },
			frame_count: 1,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		// 5 presence + 1 rest-of-room (slot 0) + 1 named zone = 7
		expect(dots.length).toBe(7);
		// Slot 0 (rest-of-room) is rendered first to match the editor order;
		// the named Kitchen zone is therefore at index 6.
		const zoneDot = dots[6] as HTMLElement;
		const style = zoneDot.getAttribute("style") ?? "";
		expect(style.toLowerCase()).toContain("background: #b8e7ff");
		// Not occupied: no box-shadow
		expect(style).not.toContain("box-shadow");

		document.body.removeChild(c);
	});

	it("renders occupied configured zone dot with colored glow", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = {
			name: "Kitchen",
			color: "#B8E7FF",
			type: "default",
		};
		el.zoneState = {
			occupancy: { 1: true, 0: false },
			target_counts: { 1: 2, 0: 0 },
			frame_count: 1,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		const zoneDot = dots[6] as HTMLElement;
		const style = zoneDot.getAttribute("style") ?? "";
		expect(style.toLowerCase()).toContain("background: #b8e7ff");
		expect(style.toLowerCase()).toContain("box-shadow");
		// glow uses the zone color
		expect(style.toLowerCase()).toContain("#b8e7ff");

		document.body.removeChild(c);
	});

	it("places rest-of-room (slot 0) before any named zones (matches editor order)", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneConfigs[0] = { name: "Kitchen", color: "#B8E7FF", type: "default" };
		el.zoneConfigs[1] = { name: "Sofa", color: "#FFB347", type: "default" };
		el.zoneState = {
			occupancy: { 0: false, 1: false, 2: false },
			target_counts: { 0: 0, 1: 0, 2: 0 },
			frame_count: 1,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		// 5 presence + 1 rest-of-room + 2 named zones = 8
		expect(dots.length).toBe(8);
		// Rest-of-room sits in the first zone position (index 5),
		// then named zones in slot order (Kitchen, Sofa).
		const rorDot = dots[5] as HTMLElement;
		const rorStyle = (rorDot.getAttribute("style") ?? "").toLowerCase();
		expect(rorStyle).toContain("background: #fff");

		const kitchenDot = dots[6] as HTMLElement;
		const kitchenStyle = (kitchenDot.getAttribute("style") ?? "").toLowerCase();
		expect(kitchenStyle).toContain("background: #b8e7ff");

		const sofaDot = dots[7] as HTMLElement;
		const sofaStyle = (sofaDot.getAttribute("style") ?? "").toLowerCase();
		expect(sofaStyle).toContain("background: #ffb347");

		document.body.removeChild(c);
	});

	it("renders rest-of-room dot with white background and gray border", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneState = {
			occupancy: { 0: false },
			target_counts: { 0: 0 },
			frame_count: 1,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		// 5 presence + 1 rest-of-room = 6
		const rorDot = dots[5] as HTMLElement;
		const style = rorDot.getAttribute("style") ?? "";
		expect(style.toLowerCase()).toContain("background: #fff");
		expect(style).toContain("border");
		expect(style).not.toContain("box-shadow");

		document.body.removeChild(c);
	});

	it("renders occupied rest-of-room with gray glow", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
		el.zoneConfigs = new Array(7).fill(null);
		el.zoneState = {
			occupancy: { 0: true },
			target_counts: { 0: 1 },
			frame_count: 1,
		};
		const tpl = el.render();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".live-sensor-dot");
		const rorDot = dots[5] as HTMLElement;
		const style = rorDot.getAttribute("style") ?? "";
		expect(style).toContain("box-shadow");

		document.body.removeChild(c);
	});

	it("renders rest-of-room zone even with no configured zones", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.hasPerspective = true;
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
		// 5 presence + 1 rest-of-room = 6
		expect(dots.length).toBe(6);

		document.body.removeChild(c);
	});
});
