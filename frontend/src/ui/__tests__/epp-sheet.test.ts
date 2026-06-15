import { describe, expect, it } from "vitest";
import "../epp-sheet.js";
import type { EppSheet } from "../epp-sheet.js";

async function fixture(open = false, includeActions = true): Promise<EppSheet> {
	const el = document.createElement("epp-sheet") as EppSheet;
	el.open = open;
	el.innerHTML = `<div slot="peek">peek</div><p>body</p>${
		includeActions ? `<div slot="actions"><button>save</button></div>` : ""
	}`;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

describe("epp-sheet", () => {
	it("always renders the peek slot + handle", async () => {
		const el = await fixture(false);
		expect(el.shadowRoot!.querySelector('slot[name="peek"]')).not.toBeNull();
		expect(el.shadowRoot!.querySelector(".handle")).not.toBeNull();
	});
	it("hides the body when collapsed", async () => {
		const el = await fixture(false);
		const body = el.shadowRoot!.querySelector(".body") as HTMLElement;
		expect(body.hasAttribute("hidden")).toBe(true);
	});
	it("shows body + actions slots when open", async () => {
		const el = await fixture(true);
		const body = el.shadowRoot!.querySelector(".body") as HTMLElement;
		expect(body.hasAttribute("hidden")).toBe(false);
		expect(el.shadowRoot!.querySelector("slot:not([name])")).not.toBeNull();
		expect(el.shadowRoot!.querySelector('slot[name="actions"]')).not.toBeNull();
	});
	it("hides the actions footer when open with no actions content", async () => {
		const el = await fixture(true, false);
		const actions = el.shadowRoot!.querySelector(".actions") as HTMLElement;
		expect(actions.hasAttribute("hidden")).toBe(true);
	});
	it("shows the actions footer when open with actions content", async () => {
		const el = await fixture(true, true);
		const actions = el.shadowRoot!.querySelector(".actions") as HTMLElement;
		// slotchange must fire for the handler to detect the assigned actions
		// (happy-dom does not auto-fire it on initial assignment — dispatch it).
		const actionsSlot = el.shadowRoot!.querySelector(
			'slot[name="actions"]',
		) as HTMLSlotElement;
		actionsSlot.dispatchEvent(new Event("slotchange"));
		await el.updateComplete;
		expect(actions.hasAttribute("hidden")).toBe(false);
	});
	it("does not toggle open when the handle is tapped (non-interactive grab indicator)", async () => {
		// The handle is a purely visual drag indicator now; tapping it must not
		// collapse/hide the panel. `open` is consumer-controlled only.
		const el = await fixture(true);
		(el.shadowRoot!.querySelector(".handle-bar") as HTMLElement).click();
		await el.updateComplete;
		expect(el.open).toBe(true);
		const body = el.shadowRoot!.querySelector(".body") as HTMLElement;
		expect(body.hasAttribute("hidden")).toBe(false);
	});
	it("does not emit sheet-open-changed on handle tap", async () => {
		const el = await fixture(false);
		let fired = false;
		el.addEventListener("sheet-open-changed", () => {
			fired = true;
		});
		(el.shadowRoot!.querySelector(".handle-bar") as HTMLElement).click();
		expect(fired).toBe(false);
	});
	it("makes the handle a non-interactive visual indicator (no button role/tabindex)", async () => {
		const el = await fixture(true);
		const handle = el.shadowRoot!.querySelector(".handle-bar") as HTMLElement;
		expect(handle.getAttribute("role")).toBeNull();
		expect(handle.getAttribute("tabindex")).toBeNull();
		expect(handle.getAttribute("aria-expanded")).toBeNull();
	});
	it("reflects the inline property to the host attribute", async () => {
		const el = await fixture(false);
		expect(el.hasAttribute("inline")).toBe(false);
		el.inline = true;
		await el.updateComplete;
		expect(el.hasAttribute("inline")).toBe(true);
		el.inline = false;
		await el.updateComplete;
		expect(el.hasAttribute("inline")).toBe(false);
	});
});
