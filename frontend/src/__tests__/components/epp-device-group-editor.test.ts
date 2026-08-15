import { describe, expect, it, vi } from "vitest";
import "../../components/epp-device-group-editor.js";
import type { EppDeviceGroupEditor } from "../../components/epp-device-group-editor.js";
import type {
	DeviceGroup,
	DeviceGroupSource,
	DeviceGroupZoneMember,
	DeviceInfo,
} from "../../types.js";

async function fixture(): Promise<EppDeviceGroupEditor> {
	const el = document.createElement(
		"epp-device-group-editor",
	) as EppDeviceGroupEditor;
	el.hass = {};
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

// The editor now composes the epp-* primitives (epp-field for the name,
// epp-toggle per source, epp-button for the actions). Each carries the
// component's data-testid on its host and emits a single value-changed
// ({ detail: { value } }); we target by data-testid and drive that event to
// stay widget-agnostic.
function nameField(
	el: EppDeviceGroupEditor,
): HTMLElement & { value: string; label: string } {
	return el.shadowRoot!.querySelector(
		'[data-testid="name-field"]',
	) as HTMLElement & {
		value: string;
		label: string;
	};
}

// Helpers to reach into epp-device-source-list's shadow DOM for toggles.
function sourceList(el: EppDeviceGroupEditor): HTMLElement {
	return el.shadowRoot!.querySelector("epp-device-source-list") as HTMLElement;
}
function actionBtn(el: EppDeviceGroupEditor, label: string): HTMLElement {
	return [...el.shadowRoot!.querySelectorAll("epp-button")].find(
		(b) => b.textContent?.trim() === label,
	) as HTMLElement;
}
function saveBtn(el: EppDeviceGroupEditor): HTMLElement {
	return actionBtn(el, "Save");
}
function emitValueChanged(target: HTMLElement, value: unknown): void {
	target.dispatchEvent(
		new CustomEvent("value-changed", {
			detail: { value },
			bubbles: true,
			composed: true,
		}),
	);
}
function setName(el: EppDeviceGroupEditor, value: string): void {
	emitValueChanged(nameField(el), value);
}
/** Drive source inclusion/exclusion by dispatching source-toggled on the epp-device-source-list host. */
function setToggle(el: EppDeviceGroupEditor, mac: string, on: boolean): void {
	const sl = sourceList(el);
	sl.dispatchEvent(
		new CustomEvent("source-toggled", {
			detail: { mac, on },
			bubbles: true,
			composed: true,
		}),
	);
}
function sensorList(el: EppDeviceGroupEditor): HTMLElement & {
	sources: DeviceGroupSource[];
	zoneGroups: unknown[];
	excludedPresence: string[];
	excludedZones: DeviceGroupZoneMember[];
	excludedZoneGroups: string[];
} {
	return el.shadowRoot!.querySelector("epp-sensor-list") as HTMLElement & {
		sources: DeviceGroupSource[];
		zoneGroups: unknown[];
		excludedPresence: string[];
		excludedZones: DeviceGroupZoneMember[];
		excludedZoneGroups: string[];
	};
}

const DEVICES: DeviceInfo[] = [
	{
		mac: "AA",
		name: "Left",
		host: null,
		available: true,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
	{
		mac: "BB",
		name: "Right",
		host: null,
		available: true,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
];

const SOURCE_AA: DeviceGroupSource = {
	mac: "AA",
	name: "Left",
	available: true,
	enabled_presence: ["occupancy"],
	zones: [{ index: 2, name: "Desk", enabled: true }],
};

const SOURCE_BB: DeviceGroupSource = {
	mac: "BB",
	name: "Right",
	available: true,
	enabled_presence: ["occupancy"],
	zones: [{ index: 3, name: "Couch", enabled: true }],
};

const EXISTING: DeviceGroup = {
	id: "g1",
	name: "Bedroom",
	area_id: "bedroom",
	sources: [SOURCE_AA],
	zone_groups: [{ id: "zg1", name: "Bed", members: [] }],
	exposed_entities: { presence: [], zones: [] },
	excluded_presence: [],
	excluded_zones: [],
	excluded_zone_groups: [],
};

// A group referencing a source device that no longer exists (available: false,
// name fell back to the MAC) alongside a still-present source.
const DEAD_SOURCE: DeviceGroupSource = {
	mac: "28:DEAD",
	name: "28:DEAD",
	available: false,
	enabled_presence: [],
	zones: [],
};
const EXISTING_WITH_MISSING: DeviceGroup = {
	id: "g2",
	name: "Stale",
	area_id: null,
	sources: [SOURCE_AA, DEAD_SOURCE],
	zone_groups: [],
	exposed_entities: { presence: [], zones: [] },
	excluded_presence: [],
	excluded_zones: [],
	excluded_zone_groups: [],
};

describe("epp-device-group-editor", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-device-group-editor")).toBeDefined();
	});

	it("labels the name field 'Device name' (no example placeholder)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect(nameField(el).label).toBe("Device name");
	});

	it("passes every available device to epp-device-source-list", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const sl = sourceList(el) as HTMLElement & {
			availableDevices: DeviceInfo[];
		};
		expect(sl.availableDevices.map((d) => d.mac)).toEqual(["AA", "BB"]);
	});

	it("frames the editor in an ha-card", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("ha-card")).not.toBeNull();
	});

	it("does not render a 'Basics' heading", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const headings = [...el.shadowRoot!.querySelectorAll("h3")].map((h) =>
			h.textContent?.trim(),
		);
		expect(headings).not.toContain("Basics");
	});

	it("starts with Save disabled (no name, no sources)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
	});

	it("never renders a Delete button (deletion lives in the list kebab)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const del = [...el.shadowRoot!.querySelectorAll("epp-button")].find(
			(b) => b.textContent?.trim() === "Delete",
		);
		expect(del).toBeUndefined();
	});

	it("populates the draft from existingGroup via willUpdate", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		expect(nameField(el).value).toBe("Bedroom");
		const sl = sourceList(el) as HTMLElement & { selectedMacs: string[] };
		expect(sl.selectedMacs).toEqual(["AA"]);
	});

	it("enables Save once a name and a source are chosen", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		setName(el, "Office");
		setToggle(el, "AA", true);
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(false);
	});

	it("keeps Save disabled when editing until a change is made", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING; // already valid (name + source)
		await el.updateComplete;
		// valid but pristine -> Save stays disabled
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
		setName(el, "Bedroom 2");
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(false);
	});

	it("re-disables Save when an edit is reverted to the original", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		setName(el, "Changed");
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(false);
		setName(el, "Bedroom"); // back to the pristine value
		await el.updateComplete;
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
	});

	it("emits dirty-changed true then false as the form is changed and reverted", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		const seen: boolean[] = [];
		el.addEventListener("dirty-changed", (e) =>
			seen.push((e as CustomEvent).detail.dirty),
		);
		el.existingGroup = EXISTING; // load -> pristine, no emit
		await el.updateComplete;
		setName(el, "X");
		await el.updateComplete;
		setName(el, "Bedroom");
		await el.updateComplete;
		expect(seen).toEqual([true, false]);
	});

	it("passes missing source devices to epp-device-source-list", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING_WITH_MISSING;
		await el.updateComplete;
		const sl = sourceList(el) as HTMLElement & {
			missingSources: { mac: string; name: string }[];
		};
		expect(sl.missingSources.map((s) => s.mac)).toContain("28:DEAD");
	});

	it("toggling off a missing source drops it from the save payload", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING_WITH_MISSING;
		await el.updateComplete;
		setToggle(el, "28:DEAD", false);
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).sources).toEqual(["AA"]);
	});

	it("removing a source prunes its merged-zone members and drops empty merged zones", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES; // AA, BB
		el.sourcesByMac = { AA: SOURCE_AA, BB: SOURCE_BB };
		el.existingGroup = {
			id: "g3",
			name: "Mixed",
			area_id: null,
			sources: [SOURCE_AA, SOURCE_BB],
			zone_groups: [
				{
					id: "zgX",
					name: "Span",
					members: [
						{ mac: "AA", zone_index: 2 },
						{ mac: "BB", zone_index: 3 },
					],
				},
				{ id: "zgY", name: "Solo", members: [{ mac: "BB", zone_index: 3 }] },
			],
			exposed_entities: { presence: [], zones: [] },
			excluded_presence: [],
			excluded_zones: [],
			excluded_zone_groups: [],
		};
		await el.updateComplete;
		setToggle(el, "BB", false); // remove BB
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		const payload = await detail;
		expect(payload.sources).toEqual(["AA"]);
		// zgX keeps only AA's member; zgY (BB-only) is dropped entirely
		expect(payload.zone_groups).toEqual([
			{ id: "zgX", name: "Span", members: [{ mac: "AA", zone_index: 2 }] },
		]);
	});

	it("does not show a missing-source warning when every source is present", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING; // only SOURCE_AA, which is available
		await el.updateComplete;
		const sl = sourceList(el);
		await (sl as HTMLElement & { updateComplete: Promise<unknown> })
			.updateComplete;
		expect(
			sl.shadowRoot!.querySelector('[data-testid="missing-warning"]'),
		).toBeNull();
	});

	it("renders Cancel to the left of Save", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const labels = [...el.shadowRoot!.querySelectorAll("epp-button")].map((b) =>
			b.textContent?.trim(),
		);
		expect(labels.indexOf("Cancel")).toBeLessThan(labels.indexOf("Save"));
	});

	it("toggling a source off removes it from the draft", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		setToggle(el, "AA", false);
		await el.updateComplete;
		// only source removed -> Save disabled
		expect((saveBtn(el) as HTMLButtonElement).disabled).toBe(true);
	});

	it("emits save with the trimmed payload (including exclusion sets)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		setName(el, "  Office  ");
		setToggle(el, "AA", true);
		await el.updateComplete;

		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect(await detail).toEqual({
			id: null,
			name: "Office",
			sources: ["AA"],
			area_id: null,
			zone_groups: [],
			excluded_presence: [],
			excluded_zones: [],
			excluded_zone_groups: [],
		});
	});

	it("emits cancel", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const detail = new Promise<void>((resolve) => {
			el.addEventListener("cancel", () => resolve(), { once: true });
		});
		const cancel = actionBtn(el, "Cancel");
		cancel.click();
		await expect(detail).resolves.toBeUndefined();
	});

	it("renders selected sources' zones in the sensor list", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const sl = sensorList(el);
		expect(sl.sources).toEqual([SOURCE_AA]);
	});

	it("surfaces a device's zones as soon as it is toggled on (no save needed)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		// Candidate sources for ALL devices are supplied up front by the view.
		el.sourcesByMac = { AA: SOURCE_AA, BB: SOURCE_BB };
		await el.updateComplete;
		const sl = sensorList(el);
		expect(sl.sources).toEqual([]);

		setToggle(el, "BB", true);
		await el.updateComplete;
		expect(sl.sources).toEqual([SOURCE_BB]);
	});

	it("updates the draft area_id from the area picker", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const picker = el.shadowRoot!.querySelector(
			"ha-area-picker",
		) as HTMLElement;
		picker.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "kitchen" },
				bubbles: true,
				composed: true,
			}),
		);
		setName(el, "K");
		setToggle(el, "AA", true);
		await el.updateComplete;
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).area_id).toBe("kitchen");
	});

	it("updates draft zone_groups when the sensor list fires zone-groups-changed", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;
		const sl = sensorList(el);
		sl.dispatchEvent(
			new CustomEvent("zone-groups-changed", {
				detail: { zone_groups: [{ id: "zg9", name: "New", members: [] }] },
				bubbles: true,
				composed: true,
			}),
		);
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).zone_groups).toEqual([
			{ id: "zg9", name: "New", members: [] },
		]);
	});

	it("clears area_id when the area picker is emptied", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING; // starts with area_id "bedroom"
		await el.updateComplete;
		(
			el.shadowRoot!.querySelector("ha-area-picker") as HTMLElement
		).dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "" },
				bubbles: true,
				composed: true,
			}),
		);
		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		expect((await detail).area_id).toBeNull();
	});

	it("never renders a sensors-preview element", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = {
			AA: { ...SOURCE_AA, enabled_presence: ["occupancy", "mmwave_presence"] },
		};
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="sensors-preview"]'),
		).toBeNull();

		setToggle(el, "AA", true);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="sensors-preview"]'),
		).toBeNull();
	});

	it("passes exclusion sets down to epp-sensor-list", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = {
			...EXISTING,
			excluded_presence: ["occupancy"],
			excluded_zones: [{ mac: "AA", zone_index: 2 }],
			excluded_zone_groups: ["rest_of_room"],
		};
		await el.updateComplete;
		const sl = sensorList(el);
		expect(sl.excludedPresence).toEqual(["occupancy"]);
		expect(sl.excludedZones).toEqual([{ mac: "AA", zone_index: 2 }]);
		expect(sl.excludedZoneGroups).toEqual(["rest_of_room"]);
	});

	it("exclusions-changed event updates the draft and Save emits all three fields", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		el.existingGroup = EXISTING;
		await el.updateComplete;

		const sl = sensorList(el);
		sl.dispatchEvent(
			new CustomEvent("exclusions-changed", {
				detail: {
					excluded_presence: ["occupancy"],
					excluded_zones: [{ mac: "AA", zone_index: 2 }],
					excluded_zone_groups: ["rest_of_room"],
				},
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		const payload = await detail;
		expect(payload.excluded_presence).toEqual(["occupancy"]);
		expect(payload.excluded_zones).toEqual([{ mac: "AA", zone_index: 2 }]);
		expect(payload.excluded_zone_groups).toEqual(["rest_of_room"]);
	});

	it("dirty round-trips on an exclusion change-then-revert", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		const seen: boolean[] = [];
		el.addEventListener("dirty-changed", (e) =>
			seen.push((e as CustomEvent).detail.dirty),
		);
		el.existingGroup = EXISTING; // load -> pristine, no emit
		await el.updateComplete;

		// Make it dirty via exclusion change
		const sl = sensorList(el);
		sl.dispatchEvent(
			new CustomEvent("exclusions-changed", {
				detail: {
					excluded_presence: ["occupancy"],
					excluded_zones: [],
					excluded_zone_groups: [],
				},
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		// Revert
		sl.dispatchEvent(
			new CustomEvent("exclusions-changed", {
				detail: {
					excluded_presence: [],
					excluded_zones: [],
					excluded_zone_groups: [],
				},
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;

		expect(seen).toEqual([true, false]);
	});

	it("a fresh group's payload has empty exclusion sets", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		setName(el, "New group");
		setToggle(el, "AA", true);
		await el.updateComplete;

		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		const payload = await detail;
		expect(payload.excluded_presence).toEqual([]);
		expect(payload.excluded_zones).toEqual([]);
		expect(payload.excluded_zone_groups).toEqual([]);
	});

	it("removing a source also drops its excluded zones from the draft", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA, BB: SOURCE_BB };
		el.existingGroup = {
			...EXISTING,
			sources: [SOURCE_AA, SOURCE_BB],
			excluded_presence: [],
			excluded_zones: [
				{ mac: "AA", zone_index: 2 },
				{ mac: "BB", zone_index: 3 },
			],
			excluded_zone_groups: [],
		};
		await el.updateComplete;
		setToggle(el, "BB", false);
		await el.updateComplete;

		const detail = new Promise<Record<string, unknown>>((resolve) => {
			el.addEventListener("save", (e) => resolve((e as CustomEvent).detail), {
				once: true,
			});
		});
		saveBtn(el).click();
		const payload = await detail;
		// BB's excluded zone should be dropped
		expect(payload.excluded_zones).toEqual([{ mac: "AA", zone_index: 2 }]);
	});

	it("falls back to empty arrays when existingGroup lacks excluded_* fields (BWC)", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.sourcesByMac = { AA: SOURCE_AA };
		// Simulate an older backend payload missing the excluded_* fields
		el.existingGroup = {
			id: "g-old",
			name: "Old group",
			area_id: null,
			sources: [SOURCE_AA],
			zone_groups: [],
			exposed_entities: { presence: [], zones: [] },
		} as unknown as DeviceGroup; // cast to bypass TS strictness
		await el.updateComplete;
		const sl = sensorList(el);
		expect(sl.excludedPresence).toEqual([]);
		expect(sl.excludedZones).toEqual([]);
		expect(sl.excludedZoneGroups).toEqual([]);
	});

	// Keep last: registering HA elements is global for the test environment, so
	// this exercises the ha-input branch inside epp-field while every test above
	// covers the ha-textfield fallback. The editor delegates to epp-field, which
	// renders the HA-native widget in its own shadow root when it is registered.
	it("uses the HA-native ha-input (via epp-field) for the name when registered", async () => {
		if (!customElements.get("ha-input")) {
			customElements.define("ha-input", class extends HTMLElement {});
		}
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const field = el.shadowRoot!.querySelector(
			'epp-field[data-testid="name-field"]',
		) as HTMLElement;
		expect(field).not.toBeNull();
		await (field as HTMLElement & { updateComplete: Promise<unknown> })
			.updateComplete;
		expect(field.shadowRoot!.querySelector("ha-input")).not.toBeNull();
	});

	// Regression for issue #366: re-evaluating a module whose element is already
	// registered (two bundles / the scoped-custom-element-registry swap) must not
	// throw a DOMException. Guard the define like every other epp-* element. Kept
	// last because vi.resetModules() clears the module cache for the rest of the
	// file.
	it("does not throw when re-evaluated while already registered", async () => {
		expect(customElements.get("epp-device-group-editor")).toBeDefined();
		vi.resetModules();
		await expect(
			import("../../components/epp-device-group-editor.js"),
		).resolves.toHaveProperty("EppDeviceGroupEditor");
	});
});

describe("desktop scroll + pinned actions", () => {
	it("bounds the editor at all widths so the form scrolls + Cancel/Save pins", () => {
		// The form scrolls inside .editor-scroll while the Cancel/Save .save-cancel-bar
		// pins to the bottom — fed by the device-groups view's bounded .content.
		// Moved from a mobile-only @media to the base so it applies on desktop too.
		const Ctor = customElements.get("epp-device-group-editor") as any;
		const cssText = (Ctor.styles as { cssText?: string }[])
			.map((s) => s.cssText ?? String(s))
			.join("\n");
		const scroll = cssText.slice(
			cssText.indexOf(".editor-scroll {"),
			cssText.indexOf("}", cssText.indexOf(".editor-scroll {")),
		);
		expect(scroll).toMatch(/overflow-y:\s*auto/);
		expect(scroll).toMatch(/flex:\s*1/);
		// flex-shrink lives in this editor's local .save-cancel-bar delta; the shared
		// saveCancelBarStyles const adds a second .save-cancel-bar block (chrome only),
		// so match against the composed cssText rather than the first block slice.
		expect(cssText).toMatch(/\.save-cancel-bar\s*{[^}]*flex-shrink:\s*0/);
		// Consistent with the editor sidebar / settings bars: a top divider line.
		// The border-top lives in the shared saveCancelBarStyles const (a separate
		// `static styles` entry), so assert it against the full composed cssText.
		expect(cssText).toMatch(
			/\.save-cancel-bar\s*{[^}]*border-top:\s*1px solid/,
		);
		expect(cssText).not.toContain("@media (max-width: 819px)");
	});
});
