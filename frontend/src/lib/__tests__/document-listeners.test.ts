import { describe, expect, it, vi } from "vitest";
import { DocumentListenerGroup } from "../document-listeners.js";

describe("DocumentListenerGroup", () => {
	it("attach() registers every spec with its options", () => {
		const keydown = vi.fn();
		const scroll = vi.fn();
		const group = new DocumentListenerGroup([
			{ target: document, type: "keydown", listener: keydown },
			{ target: window, type: "scroll", listener: scroll, options: true },
		]);

		group.attach();
		expect(group.attached).toBe(true);

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		window.dispatchEvent(new Event("scroll"));
		expect(keydown).toHaveBeenCalledTimes(1);
		expect(scroll).toHaveBeenCalledTimes(1);

		group.detach();
	});

	it("attach() is idempotent — double attach registers listeners once", () => {
		const keydown = vi.fn();
		const group = new DocumentListenerGroup([
			{ target: document, type: "keydown", listener: keydown },
		]);

		group.attach();
		group.attach();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
		expect(keydown).toHaveBeenCalledTimes(1);

		group.detach();
	});

	it("detach() removes all listeners and is idempotent", () => {
		const keydown = vi.fn();
		const group = new DocumentListenerGroup([
			{ target: document, type: "keydown", listener: keydown },
		]);

		group.attach();
		group.detach();
		expect(group.attached).toBe(false);
		group.detach(); // second detach must be a no-op, not throw

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
		expect(keydown).not.toHaveBeenCalled();
	});

	it("detach() before attach() is a safe no-op", () => {
		const group = new DocumentListenerGroup([
			{ target: document, type: "keydown", listener: vi.fn((_e: Event) => {}) },
		]);
		expect(() => group.detach()).not.toThrow();
		expect(group.attached).toBe(false);
	});

	it("supports re-attach after detach (popover reopened)", () => {
		const keydown = vi.fn();
		const group = new DocumentListenerGroup([
			{ target: document, type: "keydown", listener: keydown },
		]);

		group.attach();
		group.detach();
		group.attach();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
		expect(keydown).toHaveBeenCalledTimes(1);

		group.detach();
	});

	it("passes capture options through to removeEventListener on detach", () => {
		// A capture listener removed without the capture flag stays leaked —
		// verify the same options are used for both add and remove.
		const pointerdown = vi.fn();
		const group = new DocumentListenerGroup([
			{
				target: document,
				type: "pointerdown",
				listener: pointerdown,
				options: true,
			},
		]);

		group.attach();
		group.detach();
		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(pointerdown).not.toHaveBeenCalled();
	});
});
