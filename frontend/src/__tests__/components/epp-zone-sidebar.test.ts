import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-zone-sidebar.js";
import "../../components/epp-zone-color-picker.js";
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
	el.zone0 = {
		type: "default",
		trigger: ZONE_TYPE_DEFAULTS.default.trigger,
		renew: ZONE_TYPE_DEFAULTS.default.renew,
		timeout: ZONE_TYPE_DEFAULTS.default.timeout,
		handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
	};
	el.localZoneState = new Map();
	el.localize = (k: string) => k;
	for (const [k, v] of Object.entries(overrides)) {
		el[k] = v;
	}
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
			{ name: "Kitchen", color: ZONE_COLORS[0], type: "default" },
			{ name: "Living Room", color: ZONE_COLORS[1], type: "default" },
			null,
			null,
			null,
			null,
			null,
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
			type: "default",
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
			{ name: "Z1", color: ZONE_COLORS[0], type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
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
			{ name: "Z1", color: "#ff0000", type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const colorPicker = c.querySelector("epp-zone-color-picker");
		expect(colorPicker).not.toBeNull();

		document.body.removeChild(c);
	});

	it("shows color dot (not picker) for inactive named zone", () => {
		const el = createSidebar({ activeZone: 0 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		// Inactive zones must NOT render the picker component (only the active one does).
		const colorPicker = c.querySelector("epp-zone-color-picker");
		expect(colorPicker).toBeNull();

		const colorDots = c.querySelectorAll(".zone-color-dot");
		// 1 boundary dot + 1 zone dot
		expect(colorDots.length).toBe(2);

		document.body.removeChild(c);
	});
});

describe("epp-zone-sidebar events", () => {
	it("fires zone-select on boundary row click (a real button for keyboard access)", () => {
		const el = createSidebar({ activeZone: null });
		const handler = vi.fn();
		el.addEventListener("zone-select", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const rowBtn = c.querySelector(
			".zone-item button.sidebar-item-row",
		) as HTMLElement;
		expect(rowBtn).not.toBeNull();
		rowBtn.click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.zone).toBe(0);

		document.body.removeChild(c);
	});

	it("fires zone-select on named zone click", () => {
		const el = createSidebar();
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
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
			{ name: "Z1", color: "#ff0000", type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const handler = vi.fn();
		el.addEventListener("zone-remove", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const removeBtn = c.querySelector(".sidebar-remove-btn") as HTMLElement;
		removeBtn.click();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.slot).toBe(1);

		document.body.removeChild(c);
	});

	it("fires zone-config-change on name input (debounced)", () => {
		vi.useFakeTimers();
		try {
			const el = createSidebar();
			(el as any).zoneConfigs = [
				{ name: "Z1", color: "#ff0000", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			const handler = vi.fn();
			el.addEventListener("zone-config-change", handler);

			const tpl = (el as any)._renderZoneSidebar();
			const c = renderTo(tpl);

			const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
			nameInput.value = "Kitchen";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));

			// Debounced — does not fire immediately
			expect(handler).toHaveBeenCalledTimes(0);
			vi.advanceTimersByTime(200);
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail.index).toBe(0);
			expect(handler.mock.calls[0][0].detail.updates.name).toBe("Kitchen");

			document.body.removeChild(c);
		} finally {
			vi.useRealTimers();
		}
	});

	it("flushes pending name update on blur (so Save doesn't race with debounce)", () => {
		vi.useFakeTimers();
		try {
			const el = createSidebar();
			(el as any).zoneConfigs = [
				{ name: "Z1", color: "#ff0000", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			const handler = vi.fn();
			el.addEventListener("zone-config-change", handler);

			const tpl = (el as any)._renderZoneSidebar();
			const c = renderTo(tpl);

			const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
			nameInput.value = "Hallway";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));
			// User immediately blurs (e.g. clicks the Save button) before debounce expires
			nameInput.dispatchEvent(new Event("blur", { bubbles: true }));

			// The pending value must be flushed synchronously, not lost
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail.updates.name).toBe("Hallway");

			document.body.removeChild(c);
		} finally {
			vi.useRealTimers();
		}
	});

	it("flushes pending name update on disconnect (sidebar unmount within debounce window)", () => {
		vi.useFakeTimers();
		try {
			const el = createSidebar();
			(el as any).zoneConfigs = [
				{ name: "Z1", color: "#ff0000", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			document.body.appendChild(el);
			const handler = vi.fn();
			el.addEventListener("zone-config-change", handler);

			const tpl = (el as any)._renderZoneSidebar();
			const c = renderTo(tpl);

			const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
			nameInput.value = "Bedroom";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));

			// Sidebar unmounts before debounce timer fires
			document.body.removeChild(el);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail.updates.name).toBe("Bedroom");

			document.body.removeChild(c);
		} finally {
			vi.useRealTimers();
		}
	});

	it("coalesces rapid name keystrokes into a single zone-config-change", () => {
		vi.useFakeTimers();
		try {
			const el = createSidebar();
			(el as any).zoneConfigs = [
				{ name: "Z1", color: "#ff0000", type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			const handler = vi.fn();
			el.addEventListener("zone-config-change", handler);

			const tpl = (el as any)._renderZoneSidebar();
			const c = renderTo(tpl);

			const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
			nameInput.value = "K";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));
			vi.advanceTimersByTime(50);
			nameInput.value = "Ki";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));
			vi.advanceTimersByTime(50);
			nameInput.value = "Kit";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));

			// Still no fire (debounce keeps resetting)
			expect(handler).toHaveBeenCalledTimes(0);

			vi.advanceTimersByTime(200);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail.updates.name).toBe("Kit");

			document.body.removeChild(c);
		} finally {
			vi.useRealTimers();
		}
	});

	it("fires zone-config-change when the colour picker emits value-changed", () => {
		const el = createSidebar({ activeZone: 1 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);

		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const picker = c.querySelector("epp-zone-color-picker") as HTMLElement;
		picker.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "#00ff00" },
				bubbles: true,
				composed: true,
			}),
		);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.updates.color).toBe("#00ff00");

		document.body.removeChild(c);
	});

	it("fires zone0-change on boundary type select", () => {
		const el = createSidebar({ activeZone: 0 });
		const handler = vi.fn();
		el.addEventListener("zone0-change", handler);

		const tpl = (el as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "transit";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.type).toBe("transit");

		document.body.removeChild(c);
	});

	it("seeds custom-type sliders with current params on boundary type→custom switch", () => {
		// Switching zone 0 INTO 'custom' must populate trigger/renew/timeout/handoff_timeout
		// so the user has a sane starting point — non-custom types resolve these from
		// ZONE_TYPE_DEFAULTS on read, but custom needs them persisted.
		const el = createSidebar({ activeZone: 0 });
		el.zone0 = { type: "default" };
		const handler = vi.fn();
		el.addEventListener("zone0-change", handler);

		const tpl = (el as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "custom";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		const detail = handler.mock.calls[0][0].detail;
		expect(detail.type).toBe("custom");
		expect(typeof detail.trigger).toBe("number");
		expect(typeof detail.renew).toBe("number");
		expect(typeof detail.timeout).toBe("number");
		expect(typeof detail.handoff_timeout).toBe("number");

		document.body.removeChild(c);
	});

	it("fires zone0-change (only) on boundary type change", () => {
		const el = createSidebar({ activeZone: 0 });
		const z0Handler = vi.fn();
		const dirtyHandler = vi.fn();
		el.addEventListener("zone0-change", z0Handler);
		el.addEventListener("dirty", dirtyHandler);

		const tpl = (el as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "seating";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		// Panel listens for zone0-change and marks dirty itself; the
		// sidebar no longer emits a redundant dirty event.
		expect(z0Handler).toHaveBeenCalledTimes(1);
		expect(dirtyHandler).not.toHaveBeenCalled();

		document.body.removeChild(c);
	});

	it("fires zone-config-change on zone type select", () => {
		const el = createSidebar();
		const zone = { name: "Z1", color: "#ff0000", type: "default" as const };
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);

		const tpl = (el as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		select.value = "seating";
		select.dispatchEvent(new Event("change", { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.index).toBe(0);
		expect(handler.mock.calls[0][0].detail.updates.type).toBe("seating");

		document.body.removeChild(c);
	});
});

describe("epp-zone-sidebar resolved timings for non-custom zones", () => {
	it("displays the type-default timings for a non-custom zone with stale stored values", () => {
		// The engine uses type defaults EXCLUSIVELY for non-custom zones —
		// a legacy slot that still carries stored timings must not display
		// numbers that don't match runtime behavior.
		const el = createSidebar();
		const zone = {
			name: "Z1",
			color: "#ff0000",
			type: "seating" as const,
			trigger: 9,
			renew: 9,
			timeout: 999,
			handoff_timeout: 99,
		};
		const tpl = (el as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const d = ZONE_TYPE_DEFAULTS.seating;
		const ranges = c.querySelectorAll(
			'input[type="range"]',
		) as NodeListOf<HTMLInputElement>;
		expect(ranges[0].value).toBe(String(d.trigger));
		expect(ranges[1].value).toBe(String(d.renew));
		const numbers = c.querySelectorAll(
			'input[type="number"]',
		) as NodeListOf<HTMLInputElement>;
		expect(numbers[0].value).toBe(String(d.timeout));
		expect(numbers[1].value).toBe(String(d.handoff_timeout));

		document.body.removeChild(c);
	});
});

describe("epp-zone-sidebar timeout/handoff input clamping", () => {
	const customZone = {
		name: "Z1",
		color: "#ff0000",
		type: "custom" as const,
		trigger: 5,
		renew: 3,
		timeout: 10,
		handoff_timeout: 3,
	};

	function typeInto(input: HTMLInputElement, value: string): void {
		input.value = value;
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}

	it("clamps a named zone's presence timeout to 3600 (markup max is advisory only)", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);
		const c = renderTo((el as any)._renderZoneTypeControls(customZone, 0));

		const numbers = c.querySelectorAll(
			'input[type="number"]',
		) as NodeListOf<HTMLInputElement>;
		typeInto(numbers[0], "999999");

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.updates.timeout).toBe(3600);

		document.body.removeChild(c);
	});

	it("clamps a named zone's handoff timeout to 300", () => {
		const el = createSidebar();
		const handler = vi.fn();
		el.addEventListener("zone-config-change", handler);
		const c = renderTo((el as any)._renderZoneTypeControls(customZone, 0));

		const numbers = c.querySelectorAll(
			'input[type="number"]',
		) as NodeListOf<HTMLInputElement>;
		typeInto(numbers[1], "999999");

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail.updates.handoff_timeout).toBe(300);

		document.body.removeChild(c);
	});

	it("clamps the boundary's presence timeout to 3600 and handoff to 300", () => {
		const el = createSidebar({ activeZone: 0 });
		el.zone0 = {
			type: "custom",
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};
		const handler = vi.fn();
		el.addEventListener("zone0-change", handler);
		const c = renderTo((el as any)._renderBoundaryTypeControls());

		const numbers = c.querySelectorAll(
			'input[type="number"]',
		) as NodeListOf<HTMLInputElement>;
		typeInto(numbers[0], "999999");
		typeInto(numbers[1], "999999");

		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler.mock.calls[0][0].detail.timeout).toBe(3600);
		expect(handler.mock.calls[1][0].detail.handoff_timeout).toBe(300);

		document.body.removeChild(c);
	});
});

describe("epp-zone-sidebar type select reflects saved value on first render", () => {
	async function activeSelectValue(el: EppZoneSidebar): Promise<string> {
		document.body.appendChild(el);
		try {
			await (el as any).updateComplete;
			const select = (el as any).renderRoot.querySelector(
				".sensitivity-select",
			) as HTMLSelectElement;
			return select.value;
		} finally {
			document.body.removeChild(el);
		}
	}

	it("shows the saved type as selected for a named zone (not the first option)", async () => {
		const el = createSidebar({ activeZone: 1 });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: "#ff0000", type: "seating" },
			...new Array(6).fill(null),
		];
		expect(await activeSelectValue(el)).toBe("seating");
	});

	it("shows the saved type as selected for the boundary (not the first option)", async () => {
		const el = createSidebar({ activeZone: 0 });
		el.zone0 = { type: "seating" };
		expect(await activeSelectValue(el)).toBe("seating");
	});
});

describe("epp-zone-sidebar occupancy glow", () => {
	it("boundary zone dot shows glow when occupied", () => {
		const localZoneState = new Map([
			[
				0,
				{
					occupied: true,
					pendingSince: null,
					confirmedTargets: new Set<number>(),
				},
			],
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
			[
				1,
				{
					occupied: true,
					pendingSince: null,
					confirmedTargets: new Set<number>(),
				},
			],
		]);
		const el = createSidebar({ activeZone: 0, localZoneState });
		(el as any).zoneConfigs = [
			{ name: "Z1", color: ZONE_COLORS[0], type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
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
			{ name: "Z1", color: ZONE_COLORS[0], type: "default" },
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const tpl = (el as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const dots = c.querySelectorAll(".zone-color-dot");
		const zoneDot = dots[1] as HTMLElement;
		expect(zoneDot.getAttribute("style")).not.toContain("box-shadow");

		document.body.removeChild(c);
	});
});
