import { describe, expect, it } from "vitest";
import "../../components/epp-zone-color-picker.js";
import type { EppZoneColorPicker } from "../../components/epp-zone-color-picker.js";
import { ZONE_PRESET_COLORS } from "../../lib/zone-defaults.js";

async function fixture(
	props: Partial<EppZoneColorPicker> = {},
): Promise<EppZoneColorPicker> {
	const el = document.createElement(
		"epp-zone-color-picker",
	) as EppZoneColorPicker;
	el.value = "#B8E7FF";
	el.presets = ZONE_PRESET_COLORS;
	el.usedColors = [];
	for (const [k, v] of Object.entries(props)) (el as any)[k] = v;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function openPopover(el: EppZoneColorPicker) {
	(el.shadowRoot!.querySelector(".trigger") as HTMLElement).click();
}

describe("epp-zone-color-picker — render", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-zone-color-picker")).toBeDefined();
	});

	it("renders the trigger dot and keeps the popover closed initially", async () => {
		const el = await fixture();
		expect(el.shadowRoot!.querySelector(".trigger")).not.toBeNull();
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("opens the popover with all presets plus a custom swatch on trigger click", async () => {
		const el = await fixture();
		openPopover(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelectorAll(".swatch.preset").length).toBe(13);
		expect(el.shadowRoot!.querySelector(".swatch.custom")).not.toBeNull();
	});

	it("marks the preset matching value as selected (case-insensitive)", async () => {
		const el = await fixture({ value: "#f06292" });
		openPopover(el);
		await el.updateComplete;
		const selected = el.shadowRoot!.querySelectorAll(".swatch.preset.selected");
		expect(selected.length).toBe(1);
		expect((selected[0] as HTMLElement).dataset.color!.toLowerCase()).toBe(
			"#f06292",
		);
	});

	it("marks presets used by other zones with an in-use flag", async () => {
		const el = await fixture({ usedColors: ["#CFDB70", "#7CCFB8"] });
		openPopover(el);
		await el.updateComplete;
		const used = el.shadowRoot!.querySelectorAll(".swatch.preset.in-use");
		expect(used.length).toBe(2);
	});

	it("reflects a non-preset current colour on the custom swatch and selects it", async () => {
		const el = await fixture({ value: "#123456" });
		openPopover(el);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelectorAll(".swatch.preset.selected").length,
		).toBe(0);
		const custom = el.shadowRoot!.querySelector(
			".swatch.custom",
		) as HTMLElement;
		expect(custom.classList.contains("selected")).toBe(true);
		// Assert the raw style attribute — computed style.background normalizes
		// hex→rgb inconsistently under happy-dom.
		expect(custom.getAttribute("style")!.toLowerCase()).toContain("#123456");
	});
});
