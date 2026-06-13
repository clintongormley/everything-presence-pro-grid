import { afterEach, describe, expect, it } from "vitest";
import "../../components/epp-info-tip.js";
import type { EppInfoTip } from "../../components/epp-info-tip.js";

async function mount(text = "tip text"): Promise<EppInfoTip> {
	const el = document.createElement("epp-info-tip") as EppInfoTip;
	el.text = text;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function getBtn(el: EppInfoTip): HTMLElement {
	return el.shadowRoot!.querySelector("button") as HTMLElement;
}

function getTooltip(el: EppInfoTip): HTMLElement {
	return el.shadowRoot!.querySelector('[role="tooltip"]') as HTMLElement;
}

afterEach(() => {
	document.body.querySelectorAll("epp-info-tip").forEach((el) => {
		el.remove();
	});
});

describe("epp-info-tip element", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-info-tip")).toBeDefined();
	});

	it("renders a button with the help-circle (?) icon", async () => {
		const el = await mount();
		const icon = getBtn(el).querySelector("ha-icon");
		expect(icon?.getAttribute("icon")).toBe("mdi:help-circle-outline");
	});

	it("renders the tooltip text from the text property", async () => {
		const el = await mount("explains the option");
		expect(getTooltip(el).textContent).toContain("explains the option");
	});

	it("updates the tooltip text when the text property changes", async () => {
		const el = await mount("before");
		el.text = "after";
		await el.updateComplete;
		expect(getTooltip(el).textContent).toContain("after");
	});

	it("button has aria-label, title and aria-describedby pointing at the tooltip", async () => {
		const el = await mount();
		const btn = getBtn(el);
		const tooltip = getTooltip(el);
		expect(btn.getAttribute("aria-label")).toBe("settings.show_info");
		expect(btn.getAttribute("title")).toBe("settings.show_info");
		expect(btn.getAttribute("aria-describedby")).toBe(tooltip.id);
		expect(tooltip.id).toBeTruthy();
	});
});

describe("epp-info-tip open/close behavior", () => {
	it("is closed initially", async () => {
		const el = await mount();
		expect(getTooltip(el).style.display).not.toBe("block");
	});

	it("click opens the tooltip and positions it", async () => {
		const el = await mount();
		getBtn(el).click();
		const tooltip = getTooltip(el);
		expect(tooltip.style.display).toBe("block");
		expect(tooltip.style.left).not.toBe("");
		expect(tooltip.style.top).not.toBe("");
	});

	it("second click closes the tooltip", async () => {
		const el = await mount();
		getBtn(el).click();
		getBtn(el).click();
		expect(getTooltip(el).style.display).toBe("none");
	});

	it("an open tooltip stays open and updates its text when text changes (5Hz live-update path)", async () => {
		const el = await mount("before");
		getBtn(el).click();
		expect(getTooltip(el).style.display).toBe("block");
		el.text = "after";
		await el.updateComplete;
		// Lit reuses the same span, preserving the imperative display:block.
		expect(getTooltip(el).style.display).toBe("block");
		expect(getTooltip(el).textContent).toContain("after");
	});

	it("Escape key closes an open tooltip", async () => {
		const el = await mount();
		getBtn(el).click();
		expect(getTooltip(el).style.display).toBe("block");
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(getTooltip(el).style.display).toBe("none");
	});

	it("other keys leave an open tooltip alone", async () => {
		const el = await mount();
		getBtn(el).click();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		expect(getTooltip(el).style.display).toBe("block");
	});

	it("scroll closes an open tooltip", async () => {
		const el = await mount();
		getBtn(el).click();
		window.dispatchEvent(new Event("scroll"));
		expect(getTooltip(el).style.display).toBe("none");
	});

	it("resize closes an open tooltip", async () => {
		const el = await mount();
		getBtn(el).click();
		window.dispatchEvent(new Event("resize"));
		expect(getTooltip(el).style.display).toBe("none");
	});

	it("outside pointerdown closes an open tooltip", async () => {
		const el = await mount();
		getBtn(el).click();
		document.body.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, composed: true }),
		);
		expect(getTooltip(el).style.display).toBe("none");
	});

	it("pointerdown on the button itself does not close the tooltip", async () => {
		const el = await mount();
		const btn = getBtn(el);
		btn.click();
		btn.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, composed: true }),
		);
		expect(getTooltip(el).style.display).toBe("block");
	});

	it("opening one tip closes any other open tip", async () => {
		const first = await mount("first");
		const second = await mount("second");
		getBtn(first).click();
		expect(getTooltip(first).style.display).toBe("block");
		getBtn(second).click();
		expect(getTooltip(first).style.display).toBe("none");
		expect(getTooltip(second).style.display).toBe("block");
	});

	it("disconnect closes the tooltip and removes listeners (no leak)", async () => {
		const el = await mount();
		getBtn(el).click();
		expect(getTooltip(el).style.display).toBe("block");
		el.remove();
		expect(getTooltip(el).style.display).toBe("none");
		// Listener gone: re-show manually, Escape must no longer hide it.
		getTooltip(el).style.display = "block";
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(getTooltip(el).style.display).toBe("block");
	});

	it("disconnecting a never-rendered tip is a no-op and leaves an open tip alone", async () => {
		const open = await mount("stays open");
		getBtn(open).click();
		const unrendered = document.createElement("epp-info-tip") as EppInfoTip;
		document.body.appendChild(unrendered);
		expect(() => unrendered.remove()).not.toThrow();
		expect(getTooltip(open).style.display).toBe("block");
	});

	it("stays clickable inside disabled containers (host forces pointer-events)", () => {
		const Ctor = customElements.get("epp-info-tip") as any;
		const cssText = Ctor.styles
			.map((s: { cssText: string }) => s.cssText ?? String(s))
			.join("\n");
		expect(cssText).toMatch(/:host\s*{[^}]*pointer-events:\s*auto/);
	});
});
