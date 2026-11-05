/**
 * Every dropdown has to work on HA before 2026.3 as well as on current HA.
 * happy-dom has no `ha-select`, so these drive each call site with the event
 * older HA sends, for a real pick and with no user action.
 */
import { render } from "lit";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../components/epp-device-source-list.js";
import "../../components/epp-flasher-view.js";
import "../../components/epp-settings-view.js";
import "../../eppgrid-panel.js";
import type { EppDeviceSourceList } from "../../components/epp-device-source-list.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import type { EppSettingsView } from "../../components/epp-settings-view.js";
import type { EPPGridPanel } from "../../eppgrid-panel.js";
import { initGridFromRoom } from "../../lib/grid.js";
import type { DeviceInfo } from "../../types.js";

type Select = HTMLElement & {
	value: string;
	options: { value: string; label: string; iconPath?: string }[];
};

afterEach(() => {
	for (const child of [...document.body.children]) {
		document.body.removeChild(child);
	}
});

function renderTo(tpl: unknown): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function expectChildrenMatchOptions(select: Select) {
	const items = [...select.querySelectorAll("ha-list-item")] as (HTMLElement & {
		value: string;
	})[];
	expect(items.map((i) => i.value)).toEqual(select.options.map((o) => o.value));
	expect(items.map((i) => i.textContent?.trim())).toEqual(
		select.options.map((o) => o.label),
	);
}

/** What `ha-select` sends on HA before 2026.3 for a real pick. */
function pickOnOldHa(select: Select, value: string) {
	select.value = value;
	fireOldSelected(select);
}

/**
 * On HA before 2026.3 the same event also fires with no user action: on first
 * render, and whenever the parent changes the value.
 */
function fireOldSelected(select: Select) {
	select.dispatchEvent(
		new CustomEvent("selected", {
			bubbles: true,
			composed: true,
			detail: { index: 0, diff: undefined },
		}),
	);
}

function settingsView(
	overrides: Partial<Record<string, unknown>> = {},
): EppSettingsView {
	const el = document.createElement("epp-settings-view") as EppSettingsView;
	Object.assign(el, {
		grid: initGridFromRoom(3000, 4000),
		perspective: [1, 0, 0, 0, 1, 0, 0, 0],
		roomWidth: 3000,
		roomDepth: 4000,
		openAccordions: new Set(),
		entitiesConfig: { zone_presence: true, target_xy: true },
		zoneUpdateRateMs: 1000,
		targetUpdateRateMs: 1000,
		ledMode: "Manual Control",
		relayTriggerMode: "disabled",
		relayContactMode: "no",
		...overrides,
	});
	return el;
}

describe("settings dropdowns", () => {
	const SITES: {
		name: string;
		render: (sv: EppSettingsView) => unknown;
		index: number;
		pick: string;
		configure?: Partial<Record<string, unknown>>;
		fired: [string, unknown];
	}[] = [
		{
			name: "zone update rate",
			render: (sv) => sv.renderEntities(),
			index: 0,
			pick: "200",
			fired: ["zoneUpdateRateMs", 200],
		},
		{
			name: "target update rate",
			render: (sv) => sv.renderEntities(),
			index: 1,
			pick: "200",
			fired: ["targetUpdateRateMs", 200],
		},
		{
			name: "log level",
			render: (sv) => sv.renderLogging(),
			index: 0,
			pick: "Debug",
			fired: ["logLevels", expect.objectContaining({ system: "Debug" })],
		},
		{
			name: "LED mode",
			render: (sv) => sv.renderLed(),
			index: 0,
			pick: "Presence",
			fired: ["ledMode", "Presence"],
		},
		{
			name: "relay trigger mode",
			render: (sv) => sv.renderRelay(),
			index: 0,
			pick: "motion",
			fired: ["relayTriggerMode", "motion"],
		},
		{
			name: "relay contact mode",
			render: (sv) => sv.renderRelay(),
			index: 1,
			pick: "nc",
			configure: { relayTriggerMode: "motion" },
			fired: ["relayContactMode", "nc"],
		},
	];

	function site(entry: (typeof SITES)[number]) {
		const sv = settingsView(entry.configure);
		const c = renderTo(entry.render(sv));
		const select = c.querySelectorAll("ha-select")[entry.index] as Select;
		const fire = vi.spyOn(sv as never, "_fireChange" as never);
		return { select, fire };
	}

	it.each(SITES)("$name lists its options as children", (entry) => {
		expectChildrenMatchOptions(site(entry).select);
	});

	it.each(SITES)("$name reports an old-HA pick", (entry) => {
		const { select, fire } = site(entry);
		pickOnOldHa(select, entry.pick);
		expect(fire).toHaveBeenCalledWith(...entry.fired);
	});

	it.each(SITES)("$name is not marked unsaved by first render", (entry) => {
		const { select, fire } = site(entry);
		fireOldSelected(select);
		expect(fire).not.toHaveBeenCalled();
	});

	it("keeps the wide-select class that styles the LED and relay dropdowns", () => {
		const c = renderTo(settingsView().renderLed());
		expect(c.querySelector("ha-select.wide-select")).not.toBeNull();
	});

	it("disables the rate dropdowns when no entity in the group is on", () => {
		const c = renderTo(
			settingsView({
				entitiesConfig: { zone_presence: false },
			}).renderEntities(),
		);
		const selects = c.querySelectorAll("ha-select") as NodeListOf<
			Select & { disabled: boolean }
		>;
		expect([...selects].map((s) => s.disabled)).toEqual([true, true]);
	});
});

describe("Wi-Fi network dropdown", () => {
	function flasher() {
		const el = document.createElement("epp-flasher-view") as EppFlasherView;
		const a = el as unknown as Record<string, unknown>;
		a.localize = Object.assign((k: string) => k, {
			formatNumber: (v: number) => String(v),
			lang: "en",
		});
		a.usbFlashState = { step: "wifi_provision" };
		a.wifiNetworks = [
			{ ssid: "Strong", rssi: -45, authRequired: true },
			{ ssid: "Weak", rssi: -80, authRequired: false },
		];
		a._selectedSsid = "Strong";
		a._wifiPassword = "secret";
		const c = renderTo((el as unknown as { render(): unknown }).render());
		return { a, select: c.querySelector("ha-select") as Select };
	}

	it("lists the networks as children with their signal icons", () => {
		const { select } = flasher();
		expectChildrenMatchOptions(select);
		const icons = [...select.querySelectorAll("ha-list-item")].map(
			(i) =>
				(i.querySelector("ha-svg-icon") as unknown as { path: string }).path,
		);
		expect(icons).toEqual(select.options.map((o) => o.iconPath));
	});

	it("reports an old-HA pick and clears the password", () => {
		const { a, select } = flasher();
		pickOnOldHa(select, "Weak");
		expect(a._selectedSsid).toBe("Weak");
		expect(a._wifiPassword).toBe("");
	});

	it("is not changed by the event old HA fires with no user action", () => {
		const { a, select } = flasher();
		a._manualSsid = true;
		fireOldSelected(select);
		expect(a._manualSsid).toBe(true);
		expect(a._wifiPassword).toBe("secret");
	});
});

describe("device picker in the panel header", () => {
	function header() {
		const panel = document.createElement("eppgrid-panel") as EPPGridPanel;
		const a = panel as unknown as Record<string, any>;
		a.hass = { callWS: vi.fn().mockResolvedValue({}) };
		a._devices = [
			{ mac: "AA", name: "Hall", area: "Upstairs" },
			{ mac: "BB", name: "Kitchen", area: null },
		];
		a._selectedMac = "AA";
		const load = vi.fn().mockResolvedValue(undefined);
		a._loadDeviceConfig = load;
		const c = renderTo(a._renderHeader());
		return { a, load, select: c.querySelector("ha-select") as Select };
	}

	it("lists the devices as children", () => {
		expectChildrenMatchOptions(header().select);
	});

	it("reports an old-HA pick", () => {
		const { a, load, select } = header();
		pickOnOldHa(select, "BB");
		expect(a._selectedMac).toBe("BB");
		expect(load).toHaveBeenCalledWith("BB");
	});

	it("keeps the current device when the guard refuses the pick", () => {
		const { a, load, select } = header();
		a._dirty = true;
		pickOnOldHa(select, "BB");
		expect(a._selectedMac).toBe("AA");
		expect(load).not.toHaveBeenCalled();
		expect(a._showUnsavedDialog).toBe(true);
	});
});

describe("add picker in the device group editor", () => {
	beforeAll(() => {
		if (!customElements.get("ha-select")) {
			customElements.define("ha-select", class extends HTMLElement {});
		}
	});

	const DEVICES = [
		{ mac: "AA", name: "Hall", area: null, available: true, configured: true },
		{
			mac: "BB",
			name: "Kitchen",
			area: null,
			available: true,
			configured: true,
		},
	] as DeviceInfo[];

	async function list() {
		const el = document.createElement(
			"epp-device-source-list",
		) as EppDeviceSourceList;
		el.availableDevices = DEVICES;
		document.body.appendChild(el);
		await el.updateComplete;
		const select = el.shadowRoot?.querySelector(
			"ha-select.add-picker",
		) as Select;
		const toggled = vi.fn();
		el.addEventListener("source-toggled", toggled);
		return { el, select, toggled };
	}

	it("keeps its test id and label and lists the devices as children", async () => {
		const { select } = await list();
		expect(select.dataset.testid).toBe("add-picker");
		expect((select as unknown as { label: string }).label).toBe("Add a device");
		expect(select.value).toBe("");
		expectChildrenMatchOptions(select);
	});

	it("reports an old-HA pick", async () => {
		const { select, toggled } = await list();
		pickOnOldHa(select, "BB");
		expect(toggled).toHaveBeenCalledOnce();
		expect(toggled.mock.calls[0][0].detail).toMatchObject({ mac: "BB" });
	});

	it("goes back to blank after a pick, so the next pick still fires", async () => {
		const { el, select, toggled } = await list();
		pickOnOldHa(select, "BB");
		el.requestUpdate();
		await el.updateComplete;
		expect(select.value).toBe("");
		pickOnOldHa(select, "BB");
		expect(toggled).toHaveBeenCalledTimes(2);
	});
});
