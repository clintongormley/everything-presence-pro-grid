import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../views/epp-device-groups-view.js";
import type { DeviceGroup, DeviceGroupSource } from "../../types.js";
import type { EppDeviceGroupsView } from "../../views/epp-device-groups-view.js";

function makeGroup(over: Partial<DeviceGroup> = {}): DeviceGroup {
	return {
		id: "g1",
		name: "Bedroom",
		area_id: null,
		sources: [
			{
				mac: "AA",
				name: "Left",
				available: true,
				enabled_presence: [],
				zones: [],
			},
		],
		zone_groups: [],
		exposed_entities: {
			presence: ["occupancy"],
			zones: [{ kind: "group", id: "z1", name: "Bed", available: true }],
		},
		excluded_presence: [],
		excluded_zones: [],
		excluded_zone_groups: [],
		...over,
	};
}

interface FakeController {
	onChange: ReturnType<typeof vi.fn>;
	subscribe: ReturnType<typeof vi.fn>;
	create: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	candidateSources: DeviceGroupSource[];
	groups: DeviceGroup[];
	emit(groups: DeviceGroup[]): void;
}

function makeController(): FakeController {
	let cb: ((g: DeviceGroup[]) => void) | null = null;
	const unsub = vi.fn();
	return {
		onChange: vi.fn((c: (g: DeviceGroup[]) => void) => {
			cb = c;
			return unsub;
		}),
		subscribe: vi.fn().mockResolvedValue(undefined),
		create: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		candidateSources: [],
		groups: [],
		emit(groups: DeviceGroup[]) {
			this.groups = groups;
			cb?.(groups);
		},
	};
}

async function fixture(ctrl: FakeController): Promise<EppDeviceGroupsView> {
	const el = document.createElement(
		"epp-device-groups-view",
	) as EppDeviceGroupsView;
	el.hass = {};
	el.controller = ctrl as never;
	el.availableDevices = [];
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function createBtn(el: EppDeviceGroupsView): HTMLElement {
	return el.shadowRoot!.querySelector(
		'[data-testid="create-group"]',
	) as HTMLElement;
}
function groupCards(el: EppDeviceGroupsView): HTMLElement[] {
	return [...el.shadowRoot!.querySelectorAll(".group-card")] as HTMLElement[];
}
// The view wires the kebab via its `item-select` event, so drive it directly.
function kebabSelect(el: EppDeviceGroupsView, id: string, idx = 0): void {
	const menus = [...el.shadowRoot!.querySelectorAll("epp-kebab-menu")];
	menus[idx].dispatchEvent(
		new CustomEvent("item-select", {
			detail: { id },
			bubbles: true,
			composed: true,
		}),
	);
}

// The view confirms destructive actions and surfaces errors with an in-panel
// epp-confirm-dialog rather than window.confirm/alert. These reach into the
// dialog's shadow root to drive its buttons.
function dialogEl(el: EppDeviceGroupsView): {
	open: boolean;
	heading: string;
	message: string;
	shadowRoot: ShadowRoot | null;
} | null {
	return el.shadowRoot!.querySelector("epp-confirm-dialog") as never;
}
function clickDialog(
	el: EppDeviceGroupsView,
	which: "confirm" | "cancel",
): void {
	(
		dialogEl(el)!.shadowRoot!.querySelector(
			`[data-testid="dialog-${which}"]`,
		) as HTMLElement
	).click();
}

describe("epp-device-groups-view", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("subscribes on connect and unsubscribes on disconnect", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		expect(ctrl.onChange).toHaveBeenCalledTimes(1);
		expect(ctrl.subscribe).toHaveBeenCalledTimes(1);
		const unsub = ctrl.onChange.mock.results[0].value;
		el.remove();
		expect(unsub).toHaveBeenCalledTimes(1);
	});

	it("frames the list in an ha-card headed 'Device Groups'", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		const card = el.shadowRoot!.querySelector("ha-card");
		expect(card).not.toBeNull();
		expect(card!.textContent).toContain("Device Groups");
	});

	it("shows the empty state when there are no groups", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		expect(el.shadowRoot!.textContent).toContain("No device groups yet.");
	});

	it("seeds the list from the controller cache on connect (survives tab switches)", async () => {
		const ctrl = makeController();
		// Controller already has cached groups (it's panel-owned and stays
		// subscribed across tab switches) — the freshly-mounted view must show
		// them without waiting for a new event.
		ctrl.groups = [makeGroup()];
		const el = await fixture(ctrl);
		expect(el.shadowRoot!.querySelector(".group-card")).not.toBeNull();
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
	});

	it("wraps both the list and the editor in a centred .content container", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		// list view
		expect(
			el.shadowRoot!.querySelector('.content [data-testid="create-group"]'),
		).not.toBeNull();
		// editor view
		createBtn(el).click();
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".content epp-device-group-editor"),
		).not.toBeNull();
	});

	function sensorChips(el: EppDeviceGroupsView): string[] {
		return [
			...el.shadowRoot!.querySelectorAll('[data-testid="sensor-chip"]'),
		].map((c) => c.textContent!.trim());
	}

	it("renders a card per group: device names + sensor lozenges (no labels)", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		expect(groupCards(el).length).toBe(1);
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
		// device name shown, not the mac, and no "Devices:" label
		const devices = el.shadowRoot!.querySelector(".group-devices")!.textContent;
		expect(devices).toContain("Left");
		expect(devices).not.toContain("Devices:");
		// sensors rendered as lozenges (chips), with no "Sensors:" label
		expect(
			el.shadowRoot!.querySelector(".group-sensors")!.textContent,
		).not.toContain("Sensors:");
		expect(sensorChips(el)).toEqual(["Occupancy", "Bed"]);
	});

	it("sorts the device names and the sensor lozenges", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([
			makeGroup({
				sources: [
					{
						mac: "AA",
						name: "Zeta",
						available: true,
						enabled_presence: [],
						zones: [],
					},
					{
						mac: "BB",
						name: "Alpha",
						available: true,
						enabled_presence: [],
						zones: [],
					},
				],
				exposed_entities: {
					presence: ["occupancy"],
					zones: [
						{ kind: "group", id: "z1", name: "Window", available: true },
						{ kind: "group", id: "z2", name: "Bed", available: true },
					],
				},
			}),
		]);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".group-devices")!.textContent,
		).toContain("Alpha, Zeta");
		expect(sensorChips(el)).toEqual(["Occupancy", "Bed", "Window"]);
	});

	it("renders Edit + a divider + a danger Delete (with icons) in the kebab", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		const menu = el.shadowRoot!.querySelector("epp-kebab-menu") as unknown as {
			items: { id?: string; icon?: string; danger?: boolean; divider?: true }[];
		};
		expect(menu.items.map((i) => i.id ?? "divider")).toEqual([
			"edit",
			"divider",
			"delete",
		]);
		expect(menu.items[0].icon).toBeTruthy();
		expect(menu.items[2].danger).toBe(true);
		expect(menu.items[2].icon).toBeTruthy();
	});

	it("flags a group that references devices which no longer exist", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([
			makeGroup({
				sources: [
					{
						mac: "28:DEAD",
						name: "28:DEAD",
						available: false,
						enabled_presence: [],
						zones: [],
					},
				],
			}),
		]);
		await el.updateComplete;
		const warn = el.shadowRoot!.querySelector('[data-testid="group-warning"]');
		expect(warn).not.toBeNull();
		expect(warn!.textContent!.toLowerCase()).toContain("no longer");
	});

	it("does not flag a group whose source devices are all available", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]); // default source is available
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="group-warning"]'),
		).toBeNull();
	});

	it("renders only the name when a group has no devices or sensors", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([
			makeGroup({
				sources: [],
				exposed_entities: { presence: [], zones: [] },
			}),
		]);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".group-name")!.textContent).toBe(
			"Bedroom",
		);
		expect(el.shadowRoot!.querySelector(".group-devices")).toBeNull();
		expect(el.shadowRoot!.querySelector(".group-sensors")).toBeNull();
	});

	it("opens a blank editor from the Create button", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			existingGroup: DeviceGroup | null;
		} | null;
		expect(editor).not.toBeNull();
		expect(editor!.existingGroup).toBeNull();
	});

	it("opens the editor for an existing group from the kebab Edit item", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "edit");
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			existingGroup: DeviceGroup | null;
		};
		expect(editor.existingGroup?.id).toBe("g1");
	});

	it("create path calls controller.create and returns to the list", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("save", {
				detail: {
					id: null,
					name: "New",
					sources: ["AA"],
					area_id: "a1",
					zone_groups: [],
					excluded_presence: ["motion_presence"],
					excluded_zones: [{ mac: "AA", zone_index: 2 }],
					excluded_zone_groups: ["rest_of_room"],
				},
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		await Promise.resolve();
		expect(ctrl.create).toHaveBeenCalledWith({
			name: "New",
			sources: ["AA"],
			area_id: "a1",
			zone_groups: [],
			excluded_presence: ["motion_presence"],
			excluded_zones: [{ mac: "AA", zone_index: 2 }],
			excluded_zone_groups: ["rest_of_room"],
		});
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-device-group-editor")).toBeNull();
	});

	it("update path calls controller.update", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "edit");
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		const payload = {
			id: "g1",
			name: "Renamed",
			sources: ["AA"],
			area_id: null,
			zone_groups: [],
			excluded_presence: ["motion_presence"],
			excluded_zones: [{ mac: "AA", zone_index: 3 }],
			excluded_zone_groups: ["rest_of_room"],
		};
		editor.dispatchEvent(
			new CustomEvent("save", {
				detail: payload,
				bubbles: true,
				composed: true,
			}),
		);
		await Promise.resolve();
		expect(ctrl.update).toHaveBeenCalledWith(payload);
	});

	it("surfaces a save failure in an error dialog and keeps the editor open", async () => {
		const ctrl = makeController();
		ctrl.create.mockRejectedValueOnce(new Error("boom"));
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("save", {
				detail: { id: null, name: "New", sources: ["AA"], area_id: null },
				bubbles: true,
				composed: true,
			}),
		);
		await Promise.resolve();
		await Promise.resolve();
		await el.updateComplete;
		expect(dialogEl(el)!.open).toBe(true);
		expect(dialogEl(el)!.heading).toBe("Save failed");
		expect(dialogEl(el)!.message).toContain("boom");
		expect(
			el.shadowRoot!.querySelector("epp-device-group-editor"),
		).not.toBeNull();
	});

	it("cancel returns to the list immediately with no dialog", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-device-group-editor")).toBeNull();
		expect(dialogEl(el)!.open).toBe(false);
	});

	it("cancel discards a dirty form immediately (no confirm) and clears dirty", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		const seen: boolean[] = [];
		el.addEventListener("form-dirty-changed", (e) =>
			seen.push((e as CustomEvent).detail.dirty),
		);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("dirty-changed", {
				detail: { dirty: true },
				bubbles: true,
				composed: true,
			}),
		);
		editor.dispatchEvent(
			new CustomEvent("cancel", { bubbles: true, composed: true }),
		);
		await el.updateComplete;
		// editor closed straight away, no discard dialog
		expect(el.shadowRoot!.querySelector("epp-device-group-editor")).toBeNull();
		expect(dialogEl(el)!.open).toBe(false);
		// dirty went true (edit) then false (cancel cleared it)
		expect(seen).toEqual([true, false]);
	});

	it("relays the editor's dirty state up as form-dirty-changed", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		const seen: boolean[] = [];
		el.addEventListener("form-dirty-changed", (e) =>
			seen.push((e as CustomEvent).detail.dirty),
		);
		createBtn(el).click();
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector(
			"epp-device-group-editor",
		) as HTMLElement;
		editor.dispatchEvent(
			new CustomEvent("dirty-changed", {
				detail: { dirty: true },
				bubbles: true,
				composed: true,
			}),
		);
		// closing the editor (cancel on a clean form) reports not-dirty again
		editor.dispatchEvent(
			new CustomEvent("dirty-changed", {
				detail: { dirty: false },
				bubbles: true,
				composed: true,
			}),
		);
		expect(seen).toEqual([true, false]);
	});

	it("kebab Delete confirms in a dialog before calling controller.delete", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "delete");
		await el.updateComplete;
		expect(ctrl.delete).not.toHaveBeenCalled(); // dialog first
		expect(dialogEl(el)!.open).toBe(true);
		clickDialog(el, "confirm");
		await Promise.resolve();
		expect(ctrl.delete).toHaveBeenCalledWith("g1");
	});

	it("kebab Delete is a no-op when the dialog is dismissed", async () => {
		const ctrl = makeController();
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "delete");
		await el.updateComplete;
		clickDialog(el, "cancel");
		await Promise.resolve();
		expect(ctrl.delete).not.toHaveBeenCalled();
		expect(dialogEl(el)!.open).toBe(false);
	});

	it("surfaces a delete failure in an error dialog without throwing", async () => {
		const ctrl = makeController();
		ctrl.delete.mockRejectedValueOnce(new Error("nope"));
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "delete");
		await el.updateComplete;
		clickDialog(el, "confirm");
		await Promise.resolve();
		await Promise.resolve();
		await el.updateComplete;
		expect(ctrl.delete).toHaveBeenCalledWith("g1");
		expect(console.error).toHaveBeenCalled();
		// the failure is shown to the user, not just logged
		expect(dialogEl(el)!.open).toBe(true);
		expect(dialogEl(el)!.heading).toBe("Delete failed");
		expect(dialogEl(el)!.message).toContain("nope");
	});

	it("passes a sourcesByMac map (group sources + all candidate devices) to the editor", async () => {
		const ctrl = makeController();
		// A device not in any group is still a candidate source, so the editor
		// can show its zones the moment it is toggled.
		const candidate: DeviceGroupSource = {
			mac: "ZZ",
			name: "Spare",
			available: true,
			enabled_presence: [],
			zones: [{ index: 1, name: "Hall", enabled: true }],
		};
		ctrl.candidateSources = [candidate];
		const el = await fixture(ctrl);
		ctrl.emit([makeGroup()]);
		await el.updateComplete;
		kebabSelect(el, "edit");
		await el.updateComplete;
		const editor = el.shadowRoot!.querySelector("epp-device-group-editor") as {
			sourcesByMac: Record<string, unknown>;
		};
		expect(Object.keys(editor.sourcesByMac).sort()).toEqual(["AA", "ZZ"]);
	});

	// Regression for issue #366: re-evaluating a module whose element is already
	// registered (two bundles / the scoped-custom-element-registry swap) must not
	// throw a DOMException. Guard the define like every other epp-* element. Kept
	// last because vi.resetModules() clears the module cache for the rest of the
	// file.
	it("does not throw when re-evaluated while already registered", async () => {
		expect(customElements.get("epp-device-groups-view")).toBeDefined();
		vi.resetModules();
		await expect(
			import("../../views/epp-device-groups-view.js"),
		).resolves.toHaveProperty("EppDeviceGroupsView");
	});
});

describe("desktop max-width centering", () => {
	it("device groups content caps width via --epp-content-max token and centers on desktop", () => {
		const DeviceGroupsViewClass = customElements.get(
			"epp-device-groups-view",
		) as any;
		const cssText = (DeviceGroupsViewClass as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.join("\n");
		expect(cssText).toContain("max-width: var(--epp-content-max");
		expect(cssText).toContain("margin: 0 auto");
	});

	it("desktop is a content-sized card on grey, with the list NOT in an overflow container", () => {
		// Desktop shows a content-sized card on the grey page (matching the flasher /
		// Installed Devices), NOT a full-height white sheet (no flex:1 on ha-card).
		// The group list is deliberately NOT given its own overflow-scroll cap — the
		// whole view scrolls if the list is long (and the kebab's fixed-position
		// popover escapes overflow ancestors anyway). Guarded via cssText since
		// happy-dom has no layout.
		const DeviceGroupsViewClass = customElements.get(
			"epp-device-groups-view",
		) as any;
		const cssText = (DeviceGroupsViewClass as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.join("\n");
		const desktop = cssText.slice(cssText.indexOf("@media (min-width: 820px)"));
		expect(desktop).toContain("@media (min-width: 820px)");
		// Card is content-sized (no flex:1 fill) and the list is not an overflow box.
		expect(desktop).not.toMatch(/ha-card\s*\{[^}]*flex:\s*1/);
		expect(desktop).not.toMatch(/\.group-list\s*\{[^}]*overflow-y:\s*auto/);
		expect(cssText).not.toMatch(/\.group-list\s*\{[^}]*max-height:/);
		// .content stays a bounded flex column so the editor mode can still fill + pin.
		const contentIdx = desktop.indexOf(".content");
		const contentRule = desktop.slice(
			contentIdx,
			desktop.indexOf("}", contentIdx),
		);
		expect(contentRule).toMatch(/flex:\s*1/);
	});
});
