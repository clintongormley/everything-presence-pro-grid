import { describe, expect, it } from "vitest";
import "../epp-sheet.js";
import type { EppSheet } from "../epp-sheet.js";

async function fixture(open = false): Promise<EppSheet> {
	const el = document.createElement("epp-sheet") as EppSheet;
	el.open = open;
	el.innerHTML = `<div slot="peek">peek</div><p>body</p><div slot="actions"><button>save</button></div>`;
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
