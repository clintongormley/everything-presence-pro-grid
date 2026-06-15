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
	it("toggles open + emits sheet-open-changed on handle tap", async () => {
		const el = await fixture(false);
		let detail: { open: boolean } | undefined;
		el.addEventListener("sheet-open-changed", (e) => {
			detail = (e as CustomEvent<{ open: boolean }>).detail;
		});
		(el.shadowRoot!.querySelector(".handle-bar") as HTMLElement).click();
		expect(el.open).toBe(true);
		expect(detail).toEqual({ open: true });
	});
});
