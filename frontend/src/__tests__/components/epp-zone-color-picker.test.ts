import { describe, expect, it, vi } from "vitest";
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

	it("shows a + glyph on the custom swatch when the value is a preset", async () => {
		const el = await fixture({ value: "#B8E7FF" });
		openPopover(el);
		await el.updateComplete;
		const glyph = el.shadowRoot!.querySelector(".swatch.custom .custom-glyph");
		expect(glyph).not.toBeNull();
		expect(glyph!.textContent!.trim()).toBe("+");
	});

	it("shows an edit glyph on the custom swatch when the value is a custom colour", async () => {
		const el = await fixture({ value: "#123456" });
		openPopover(el);
		await el.updateComplete;
		const glyph = el.shadowRoot!.querySelector(".swatch.custom .custom-glyph");
		expect(glyph).not.toBeNull();
		expect(glyph!.textContent!.trim()).toBe("✎");
	});

	it("renders an occupancy glow on the trigger when occupiedGlow is set", async () => {
		const el = await fixture({ occupiedGlow: true, value: "#B8E7FF" });
		const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
		expect(trigger.getAttribute("style")!).toContain("box-shadow");
	});

	it("includes the in-use hint in the aria-label of a used preset", async () => {
		const el = await fixture({ usedColors: ["#CFDB70"] });
		openPopover(el);
		await el.updateComplete;
		const used = el.shadowRoot!.querySelector(
			'.swatch.preset[data-color="#CFDB70"]',
		) as HTMLElement;
		// default localize returns the key, so the in-use key appears in the label
		expect(used.getAttribute("aria-label")).toContain("color.in_use");
	});
});

describe("epp-zone-color-picker — selection events", () => {
	it("emits value-changed with the chosen preset and closes the popover", async () => {
		const el = await fixture({ value: "#B8E7FF" });
		openPopover(el);
		await el.updateComplete;
		const detail = new Promise<{ value: string }>((resolve) => {
			el.addEventListener("value-changed", (e) =>
				resolve((e as CustomEvent).detail),
			);
		});
		(
			el.shadowRoot!.querySelector(
				'.swatch.preset[data-color="#F06292"]',
			) as HTMLElement
		).click();
		expect((await detail).value).toBe("#F06292");
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("emits value-changed from the custom native input and closes", async () => {
		const el = await fixture({ value: "#B8E7FF" });
		openPopover(el);
		await el.updateComplete;
		const detail = new Promise<{ value: string }>((resolve) => {
			el.addEventListener("value-changed", (e) =>
				resolve((e as CustomEvent).detail),
			);
		});
		const input = el.shadowRoot!.querySelector(
			".custom-input",
		) as HTMLInputElement;
		input.value = "#abcdef";
		input.dispatchEvent(new Event("change", { bubbles: true }));
		expect((await detail).value).toBe("#abcdef");
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});
});

describe("epp-zone-color-picker — dismissal", () => {
	async function opened(): Promise<EppZoneColorPicker> {
		const el = await fixture();
		openPopover(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).not.toBeNull();
		return el;
	}

	it("closes on an outside pointerdown", async () => {
		const el = await opened();
		document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("closes on Escape", async () => {
		const el = await opened();
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("closes on scroll", async () => {
		const el = await opened();
		window.dispatchEvent(new Event("scroll"));
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("does not re-fire or throw on a stray pointerdown after removal", async () => {
		const el = await opened();
		let fired = false;
		el.addEventListener("value-changed", () => {
			fired = true;
		});
		el.remove();
		document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(fired).toBe(false);
	});

	it("closes on resize", async () => {
		const el = await opened();
		window.dispatchEvent(new Event("resize"));
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("closes when the trigger is clicked a second time", async () => {
		const el = await opened();
		(el.shadowRoot!.querySelector(".trigger") as HTMLElement).click();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
	});

	it("can reopen after being dismissed", async () => {
		const el = await fixture();
		const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
		trigger.click();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).not.toBeNull();
		document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).toBeNull();
		trigger.click();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".popover")).not.toBeNull();
	});
});

describe("epp-zone-color-picker — focus return", () => {
	it("returns focus to the trigger when closed via Escape", async () => {
		const el = await fixture();
		const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
		const focusSpy = vi.spyOn(trigger, "focus");
		trigger.click();
		await el.updateComplete;
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		await el.updateComplete;
		expect(focusSpy).toHaveBeenCalled();
	});

	it("returns focus to the trigger after a keyboard selection", async () => {
		const el = await fixture({ value: "#B8E7FF" });
		const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
		const focusSpy = vi.spyOn(trigger, "focus");
		trigger.click();
		await el.updateComplete;
		(
			el.shadowRoot!.querySelector(
				'.swatch.preset[data-color="#F06292"]',
			) as HTMLElement
		).click();
		await el.updateComplete;
		expect(focusSpy).toHaveBeenCalled();
	});
});
