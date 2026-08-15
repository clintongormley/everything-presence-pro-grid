import { describe, expect, it, vi } from "vitest";
import "../../components/epp-confirm-dialog.js";
import type { EppConfirmDialog } from "../../components/epp-confirm-dialog.js";
import type { EppDialog } from "../../ui/epp-dialog.js";

async function fixture(
	props: Partial<EppConfirmDialog> = {},
): Promise<EppConfirmDialog> {
	const el = document.createElement("epp-confirm-dialog") as EppConfirmDialog;
	Object.assign(el, props);
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function dialog(el: EppConfirmDialog): EppDialog | null {
	return el.shadowRoot!.querySelector("epp-dialog");
}
function confirmBtn(el: EppConfirmDialog): HTMLElement | null {
	return el.shadowRoot!.querySelector('[data-testid="dialog-confirm"]');
}
function cancelBtn(el: EppConfirmDialog): HTMLElement | null {
	return el.shadowRoot!.querySelector('[data-testid="dialog-cancel"]');
}

describe("epp-confirm-dialog", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-confirm-dialog")).toBeDefined();
	});

	it("registers the underlying epp-dialog primitive", () => {
		expect(customElements.get("epp-dialog")).toBeDefined();
	});

	it("renders a closed epp-dialog while closed", async () => {
		const el = await fixture({ open: false, heading: "Hi", message: "There" });
		expect(dialog(el)!.open).toBe(false);
	});

	it("renders heading, message and both buttons when open", async () => {
		const el = await fixture({
			open: true,
			heading: "Delete group?",
			message: "This removes its entities.",
			confirmLabel: "Delete",
			cancelLabel: "Keep",
		});
		const d = dialog(el)!;
		await d.updateComplete;
		expect(d.open).toBe(true);
		expect(d.heading).toBe("Delete group?");
		expect(el.shadowRoot!.textContent).toContain("This removes its entities.");
		expect(confirmBtn(el)!.textContent!.trim()).toBe("Delete");
		expect(cancelBtn(el)!.textContent!.trim()).toBe("Keep");
	});

	it("emits confirm when the confirm button is clicked", async () => {
		const el = await fixture({ open: true, confirmLabel: "OK" });
		const fired = new Promise<void>((resolve) => {
			el.addEventListener("confirm", () => resolve(), { once: true });
		});
		confirmBtn(el)!.click();
		await expect(fired).resolves.toBeUndefined();
	});

	it("emits cancel when the cancel button is clicked", async () => {
		const el = await fixture({ open: true });
		const fired = new Promise<void>((resolve) => {
			el.addEventListener("cancel", () => resolve(), { once: true });
		});
		cancelBtn(el)!.click();
		await expect(fired).resolves.toBeUndefined();
	});

	it("emits cancel on Escape while open", async () => {
		const el = await fixture({ open: true });
		const fired = new Promise<void>((resolve) => {
			el.addEventListener("cancel", () => resolve(), { once: true });
		});
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await expect(fired).resolves.toBeUndefined();
	});

	it("hides the cancel button in alert mode (hideCancel)", async () => {
		const el = await fixture({
			open: true,
			hideCancel: true,
			confirmLabel: "OK",
		});
		expect(cancelBtn(el)).toBeNull();
		expect(confirmBtn(el)).not.toBeNull();
	});

	it("marks the confirm button danger when danger is set", async () => {
		const el = await fixture({ open: true, danger: true });
		expect(confirmBtn(el)!.getAttribute("variant")).toBe("danger");
	});

	it("uses the primary variant for the confirm button when not danger", async () => {
		const el = await fixture({ open: true });
		expect(confirmBtn(el)!.getAttribute("variant")).toBe("primary");
	});

	it("ignores Escape after closing", async () => {
		const el = await fixture({ open: true });
		let fired = false;
		el.addEventListener("cancel", () => {
			fired = true;
		});
		el.open = false;
		await el.updateComplete;
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(fired).toBe(false);
	});

	it("renders just the confirm button when heading/message are empty", async () => {
		const el = await fixture({ open: true, confirmLabel: "OK" });
		expect(el.shadowRoot!.querySelector(".message")).toBeNull();
		expect(dialog(el)).not.toBeNull();
		expect(dialog(el)!.open).toBe(true);
		expect(confirmBtn(el)).not.toBeNull();
	});

	it("removes its Escape listener on disconnect", async () => {
		const el = await fixture({ open: true });
		let fired = false;
		el.addEventListener("cancel", () => {
			fired = true;
		});
		el.remove();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(fired).toBe(false);
	});

	// Regression for issue #366: the panel and card bundles each contain a copy
	// of this module. When the card (loaded as a Lovelace resource, after HA
	// swaps in the scoped-custom-element-registry) registers the element first,
	// re-evaluating this module from the panel bundle must NOT throw a
	// DOMException — an uncaught throw here blanks the whole panel.
	it("does not throw when re-evaluated while already registered", async () => {
		expect(customElements.get("epp-confirm-dialog")).toBeDefined();
		vi.resetModules();
		// Re-evaluating must resolve (re-exporting the class), not reject with a
		// "already used with this registry" DOMException from an unguarded define.
		await expect(
			import("../../components/epp-confirm-dialog.js"),
		).resolves.toHaveProperty("EppConfirmDialog");
	});
});
