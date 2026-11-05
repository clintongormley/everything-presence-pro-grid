import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSelect, type SelectConfig } from "../select.js";

const OPTIONS = [
	{ value: "aa", label: "Hall" },
	{ value: "bb", label: "Kitchen" },
];

function setup(overrides: Partial<SelectConfig> = {}) {
	const root = document.createElement("div");
	document.body.appendChild(root);
	const onSelect = vi.fn();
	const draw = (changes: Partial<SelectConfig> = {}) => {
		render(
			renderSelect({
				value: "aa",
				options: OPTIONS,
				onSelect,
				...overrides,
				...changes,
			}),
			root,
		);
		return root.querySelector("ha-select") as HTMLElement & {
			value: string;
			options: SelectConfig["options"];
			label?: string;
			disabled?: boolean;
			selectedText?: string;
		};
	};
	return { root, onSelect, draw };
}

/** HA 2026.3+: `detail.value` is the pick, and the element still holds the old value. */
function pickOnCurrentHa(el: HTMLElement, value: unknown) {
	el.dispatchEvent(
		new CustomEvent("selected", {
			bubbles: true,
			composed: true,
			detail: { value },
		}),
	);
}

/** HA before 2026.3: `detail` is `{index, diff}` and the element holds the pick. */
function pickOnOldHa(el: HTMLElement & { value: string }, value: string) {
	el.value = value;
	el.dispatchEvent(
		new CustomEvent("selected", {
			bubbles: true,
			composed: true,
			detail: { index: 1, diff: undefined },
		}),
	);
}

describe("renderSelect", () => {
	it("passes the value and the options to ha-select", () => {
		const el = setup().draw();
		expect(el.value).toBe("aa");
		expect(el.options).toBe(OPTIONS);
	});

	it("also renders the options as children, which HA before 2026.3 needs", () => {
		const el = setup().draw();
		const items = [...el.querySelectorAll("ha-list-item")] as (HTMLElement & {
			value: string;
		})[];
		expect(items.map((i) => i.value)).toEqual(["aa", "bb"]);
		expect(items.map((i) => i.textContent?.trim())).toEqual([
			"Hall",
			"Kitchen",
		]);
	});

	it("gives a child an icon only when its option has an iconPath", () => {
		const el = setup({
			options: [
				{ value: "aa", label: "Hall", iconPath: "M0 0" },
				{ value: "bb", label: "Kitchen" },
			],
		}).draw();
		const [withIcon, withoutIcon] = el.querySelectorAll("ha-list-item");
		expect(withIcon.getAttribute("graphic")).toBe("icon");
		const icon = withIcon.querySelector("ha-svg-icon") as HTMLElement & {
			path: string;
		};
		expect(icon.slot).toBe("graphic");
		expect(icon.path).toBe("M0 0");
		expect(withoutIcon.hasAttribute("graphic")).toBe(false);
		expect(withoutIcon.querySelector("ha-svg-icon")).toBeNull();
	});

	it("keeps an option's iconPath in the options passed to ha-select", () => {
		const options = [{ value: "aa", label: "Hall", iconPath: "M0 0" }];
		expect(setup({ options }).draw().options).toBe(options);
	});

	it("passes on the class, test id, label and disabled state", () => {
		const el = setup({
			className: "wide-select",
			testId: "add-picker",
			label: "Add a device",
			disabled: true,
		}).draw();
		expect(el.classList.contains("wide-select")).toBe(true);
		expect(el.dataset.testid).toBe("add-picker");
		expect(el.label).toBe("Add a device");
		expect(el.disabled).toBe(true);
	});

	it("leaves the class and test id off when not given", () => {
		const el = setup().draw();
		expect(el.hasAttribute("class")).toBe(false);
		expect(el.hasAttribute("data-testid")).toBe(false);
		expect(el.disabled).toBe(false);
	});

	it("reports detail.value, not the old value still on the element", () => {
		const { draw, onSelect } = setup();
		pickOnCurrentHa(draw(), "bb");
		expect(onSelect).toHaveBeenCalledExactlyOnceWith("bb");
	});

	it("reads the element's value when detail has none, as on HA before 2026.3", () => {
		const { draw, onSelect } = setup();
		pickOnOldHa(draw(), "bb");
		expect(onSelect).toHaveBeenCalledExactlyOnceWith("bb");
	});

	it("ignores a selected event for the value already bound", () => {
		const { draw, onSelect } = setup();
		const el = draw();
		pickOnCurrentHa(el, "aa");
		pickOnOldHa(el, "aa");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("ignores an empty value, as when old HA drops the selected item", () => {
		const { draw, onSelect } = setup();
		const el = draw();
		pickOnCurrentHa(el, "");
		pickOnOldHa(el, "");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("does not fall back to the element when detail.value is an empty string", () => {
		const { draw, onSelect } = setup();
		const el = draw();
		el.value = "bb";
		pickOnCurrentHa(el, "");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("compares against the value bound by the latest render", () => {
		const { draw, onSelect } = setup();
		draw();
		const el = draw({ value: "bb" });
		pickOnCurrentHa(el, "aa");
		expect(onSelect).toHaveBeenCalledExactlyOnceWith("aa");
	});

	it("ignores a selected event from an element that has left the document", () => {
		const { draw, onSelect } = setup();
		const el = draw();
		el.remove();
		pickOnCurrentHa(el, "bb");
		pickOnOldHa(el, "bb");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("ignores a late selected event from an element a new list replaced", () => {
		const { draw, onSelect } = setup();
		const old = draw();
		const replacement = draw({ options: [{ value: "cc", label: "Porch" }] });
		expect(replacement).not.toBe(old);
		pickOnOldHa(old, "bb");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("gives the element the bound option's label as its closed text", () => {
		const el = setup({ value: "bb" }).draw();
		expect(el.selectedText).toBe("Kitchen");
	});

	it("updates the closed text when only the bound option's label changes", () => {
		const { draw } = setup({
			options: [{ value: "aa", label: "Hall (Upstairs)" }],
		});
		const el = draw();
		const moved = draw({
			options: [{ value: "aa", label: "Hall (Downstairs)" }],
		});
		expect(moved).toBe(el);
		expect(el.selectedText).toBe("Hall (Downstairs)");
	});

	it("gives empty closed text when the value is not in the options", () => {
		const el = setup({ value: "zz" }).draw();
		expect(el.selectedText).toBe("");
	});

	it("stops the closed event from reaching anything around the select", () => {
		const { root, draw } = setup();
		const outer = vi.fn();
		root.addEventListener("closed", outer);
		draw().dispatchEvent(new Event("closed", { bubbles: true }));
		expect(outer).not.toHaveBeenCalled();
	});

	it("puts the bound value back over a pick the owner did not accept", () => {
		const { draw } = setup();
		const el = draw();
		el.value = "bb";
		expect(draw().value).toBe("aa");
	});

	it("keeps the same element while the option values stay the same", () => {
		const { draw } = setup();
		const el = draw();
		const relabelled = OPTIONS.map((o) => ({ ...o, label: `${o.label}!` }));
		expect(draw({ options: relabelled })).toBe(el);
	});

	it("starts a new element when the option values change, before ha-select registers", () => {
		const { draw } = setup({ value: "" });
		const el = draw({ options: [] });
		expect(draw({ options: OPTIONS })).not.toBe(el);
	});

	it("does not confuse option lists whose joined values would match", () => {
		const { draw } = setup({ value: "" });
		const el = draw({ options: [{ value: "a|b", label: "x" }] });
		const next = draw({
			options: [
				{ value: "a", label: "x" },
				{ value: "b", label: "y" },
			],
		});
		expect(next).not.toBe(el);
	});

	describe("once ha-select is registered", () => {
		class NewSelect extends HTMLElement {}
		class MwcSelect extends HTMLElement {
			selectByValue() {}
		}
		class OldSelect extends MwcSelect {}

		function register(element: CustomElementConstructor) {
			vi.spyOn(customElements, "get").mockImplementation((name) =>
				name === "ha-select" ? element : undefined,
			);
		}

		const ADDED = [...OPTIONS, { value: "cc", label: "Porch" }];
		const REORDERED = [...OPTIONS].reverse();

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it.each([
			["one is added", ADDED],
			["they are reordered", REORDERED],
			["the list empties", []],
		])("keeps the element on HA 2026.3+ when %s", (_, options) => {
			register(NewSelect);
			const { draw } = setup();
			const el = draw();
			expect(draw({ options })).toBe(el);
		});

		it("updates options and children on the kept element on HA 2026.3+", () => {
			register(NewSelect);
			const { draw } = setup();
			const el = draw();
			draw({ options: ADDED });
			expect(el.options).toBe(ADDED);
			const items = [...el.querySelectorAll("ha-list-item")] as (HTMLElement & {
				value: string;
			})[];
			expect(items.map((i) => i.value)).toEqual(["aa", "bb", "cc"]);
		});

		it("reports a pick from the updated list on HA 2026.3+", () => {
			register(NewSelect);
			const { draw, onSelect } = setup();
			const el = draw();
			draw({ options: ADDED });
			pickOnCurrentHa(el, "cc");
			expect(onSelect).toHaveBeenCalledExactlyOnceWith("cc");
		});

		it.each([
			["one is added", ADDED],
			["they are reordered", REORDERED],
		])("starts a new element on old HA when %s", (_, options) => {
			register(OldSelect);
			const { draw } = setup();
			const el = draw();
			expect(draw({ options })).not.toBe(el);
		});

		it("replaces the element once when ha-select registers on HA 2026.3+", () => {
			const { draw } = setup();
			const unregistered = draw();
			register(NewSelect);
			const registered = draw();
			expect(registered).not.toBe(unregistered);
			expect(draw({ options: ADDED })).toBe(registered);
		});
	});
});
