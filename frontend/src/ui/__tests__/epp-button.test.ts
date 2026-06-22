import { describe, expect, it } from "vitest";
import { EppButton } from "../epp-button.js";

async function fixture(attrs = ""): Promise<EppButton> {
	const el = document.createElement("epp-button") as EppButton;
	if (attrs) el.setAttribute("variant", attrs);
	el.textContent = "Save";
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-button", () => {
	it("renders an inner native button carrying the variant class", async () => {
		const el = await fixture("primary");
		const btn = el.shadowRoot!.querySelector("button")!;
		expect(btn).toBeTruthy();
		expect(btn.classList.contains("primary")).toBe(true);
	});

	it("defaults to the neutral variant", async () => {
		const el = await fixture();
		expect(
			el.shadowRoot!.querySelector("button")!.classList.contains("neutral"),
		).toBe(true);
	});

	it("reflects disabled to the inner button and blocks clicks", async () => {
		const el = await fixture("primary");
		el.disabled = true;
		await el.updateComplete;
		const btn = el.shadowRoot!.querySelector("button")!;
		expect(btn.disabled).toBe(true);
		let clicked = false;
		el.addEventListener("click", () => {
			clicked = true;
		});
		btn.click();
		expect(clicked).toBe(false);
	});

	it("lets clicks bubble from the host when enabled", async () => {
		const el = await fixture("primary");
		let clicked = false;
		el.addEventListener("click", () => {
			clicked = true;
		});
		el.shadowRoot!.querySelector("button")!.click();
		expect(clicked).toBe(true);
	});

	it("renders an ha-icon when icon is set", async () => {
		const el = document.createElement("epp-button") as EppButton;
		el.icon = "mdi:content-save";
		document.body.appendChild(el);
		await el.updateComplete;
		const icon = el.shadowRoot!.querySelector("ha-icon");
		expect(icon).toBeTruthy();
		expect(icon!.getAttribute("icon")).toBe("mdi:content-save");
	});

	it("uses min-height so a wrapping label grows the button instead of overflowing", () => {
		// A long label in a narrow container wraps to several lines. With a fixed
		// `height` the text spills out of the rounded box; `min-height` lets the
		// button grow to contain it while keeping the control height as a floor.
		const css = EppButton.styles.cssText.replace(/\s+/g, " ");
		expect(css).toContain("min-height: var(--epp-control-height");
		// No bare `height:` pinning the control height (min-/line-/max- are fine).
		expect(css).not.toMatch(/(?<![a-z-])height: var\(--epp-control-height/);
	});
});
