import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import {
	type CheckRowOptions,
	checkRowStyles,
	renderCheckRow,
} from "../check-row.js";

function mount(overrides: Partial<CheckRowOptions> = {}): {
	root: HTMLDivElement;
	onToggle: ReturnType<typeof vi.fn>;
} {
	const root = document.createElement("div");
	document.body.appendChild(root);
	const onToggle = vi.fn();
	render(
		renderCheckRow({
			label: "Show password",
			checked: false,
			onToggle,
			...overrides,
		}),
		root,
	);
	return { root, onToggle };
}

describe("renderCheckRow", () => {
	it("shows the label and names the checkbox with it", () => {
		const { root } = mount();
		expect(root.querySelector(".check-row-label")?.textContent).toBe(
			"Show password",
		);
		expect(root.querySelector("ha-checkbox")?.getAttribute("aria-label")).toBe(
			"Show password",
		);
	});

	it("binds the checked value to the checkbox", () => {
		const { root } = mount({ checked: true });
		expect((root.querySelector("ha-checkbox") as any).checked).toBe(true);
	});

	it("adds an extra class to the row", () => {
		const { root } = mount({ className: "show-password" });
		expect(root.querySelector(".check-row.show-password")).not.toBeNull();
	});

	it("reports the new value once for one label click", () => {
		const { root, onToggle } = mount({ checked: true });
		(root.querySelector(".check-row-label") as HTMLElement).click();
		expect(onToggle.mock.calls).toEqual([[false]]);
	});

	it("reports the checkbox's own value when the checkbox changes", () => {
		const { root, onToggle } = mount();
		const box = root.querySelector("ha-checkbox") as any;
		box.checked = true;
		box.dispatchEvent(new Event("change"));
		expect(onToggle.mock.calls).toEqual([[true]]);
	});

	it("has no label element, which would toggle a form-associated checkbox twice", () => {
		const { root } = mount();
		expect(root.querySelector("label")).toBeNull();
		expect(
			root
				.querySelector("ha-checkbox")
				?.contains(root.querySelector(".check-row-label")),
		).toBe(false);
	});

	it("styles the row with design tokens", () => {
		expect(checkRowStyles.cssText).toContain("var(--epp-space-2");
	});
});
