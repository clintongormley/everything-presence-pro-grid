import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { keyed } from "lit/directives/keyed.js";
import { live } from "lit/directives/live.js";

export interface SelectOption {
	value: string;
	label: string;
	iconPath?: string;
}

export interface SelectConfig {
	value: string;
	options: readonly SelectOption[];
	onSelect: (value: string) => void;
	label?: string;
	disabled?: boolean;
	className?: string;
	testId?: string;
}

/**
 * An `ha-select` that works on every supported HA. This is a render function
 * and not an element so that a parent's `ha-select` styles still reach it.
 *
 * `ha-select` takes its choices from `ha-list-item` children before HA 2026.3
 * and from `.options` from then on, so both are always rendered. Old versions
 * also differ in these ways, which the code relies on:
 *
 * - The element changes its own value on a pick, so `live` puts the bound value
 *   back when the owner did not accept the pick.
 * - It does not fully rebuild when its children change, so on old versions only
 *   `keyed` starts a fresh element when the list does. Otherwise late data can
 *   leave it blank. From 2026.3 a new element would close an open menu and lose focus,
 *   so the key stops changing there.
 * - `selected` carries `{index, diff}` and the pick is on the element. From 2026.3
 *   `detail.value` is the pick and the element still holds the old value.
 * - `selected` also fires with no user action: on first render, when the value
 *   changes, and with `""` when the selected item is removed. That is why an
 *   empty or unchanged value never reaches `onSelect`.
 * - An element that `keyed` replaced can still fire `selected` once it has left
 *   the document, and its handler holds an out-of-date value, so that event is
 *   ignored.
 * - The closed control shows the element's own `selectedText`, and HA 2025.2
 *   does not refresh it when only a label changes, so it is bound here. Labels
 *   stay out of the `keyed` key because a new element would close an open menu
 *   and lose focus. From 2026.3 the element has no such property.
 * - The menu's `closed` event bubbles out of the element, and it is stopped
 *   because ancestor menus and dialogs would otherwise treat it as their own
 *   close signal.
 */
export function renderSelect({
	value,
	options,
	onSelect,
	label,
	disabled = false,
	className,
	testId,
}: SelectConfig) {
	const onSelected = (e: CustomEvent<{ value?: string }>) => {
		if (!(e.currentTarget as Element).isConnected) return;
		const picked = e.detail.value ?? (e.target as HTMLSelectElement).value;
		if (picked && picked !== value) onSelect(picked);
	};
	return keyed(
		selectKey(options),
		html`<ha-select
			class=${ifDefined(className)}
			data-testid=${ifDefined(testId)}
			.label=${label}
			.value=${live(value)}
			.selectedText=${options.find((o) => o.value === value)?.label ?? ""}
			.options=${options}
			.disabled=${disabled}
			@selected=${onSelected}
			@closed=${(e: Event) => e.stopPropagation()}
			>${options.map(renderItem)}</ha-select
		>`,
	);
}

/**
 * `selectByValue` comes from mwc-select, so only the old element has it. An
 * unregistered element counts as old, so at worst a new-version element is
 * replaced once when it registers.
 */
function selectKey(options: readonly SelectOption[]) {
	const element = customElements.get("ha-select");
	return element && !("selectByValue" in element.prototype)
		? ""
		: JSON.stringify(options.map((o) => o.value));
}

function renderItem({ value, label, iconPath }: SelectOption) {
	return iconPath
		? html`<ha-list-item .value=${value} graphic="icon"
				><ha-svg-icon slot="graphic" .path=${iconPath}></ha-svg-icon
				>${label}</ha-list-item
			>`
		: html`<ha-list-item .value=${value}>${label}</ha-list-item>`;
}
