import { describe, expect, it, vi } from "vitest";
import "../../components/epp-device-source-list.js";
import type { EppDeviceSourceList } from "../../components/epp-device-source-list.js";
import type { DeviceInfo } from "../../types.js";

async function fixture(): Promise<EppDeviceSourceList> {
	const el = document.createElement(
		"epp-device-source-list",
	) as EppDeviceSourceList;
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

const DEVICES: DeviceInfo[] = [
	{
		mac: "AA",
		name: "Kitchen",
		host: null,
		available: true,
		configured: true,
		area: "Kitchen",
		firmware_status: "compatible",
		current_connection_count: null,
	},
	{
		mac: "BB",
		name: "Living Room",
		host: null,
		available: false,
		configured: true,
		area: null,
		firmware_status: "compatible",
		current_connection_count: null,
	},
];

describe("epp-device-source-list", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-device-source-list")).toBeDefined();
	});

	it("add-picker offers only not-yet-added devices", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = ["AA"];
		await el.updateComplete;
		const sel = el.shadowRoot!.querySelector<HTMLSelectElement>(
			'select[data-testid="add-picker"]',
		)!;
		const optMacs = [...sel.options].map((o) => o.value).filter(Boolean);
		expect(optMacs).toEqual(["BB"]);
	});

	it("ignores a pick with no device in it", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		await el.updateComplete;
		const onToggle = vi.fn();
		el.addEventListener("source-toggled", onToggle);
		const sel = el.shadowRoot!.querySelector<HTMLSelectElement>(
			'select[data-testid="add-picker"]',
		)!;
		sel.value = "";
		sel.dispatchEvent(new Event("change"));
		expect(onToggle).not.toHaveBeenCalled();
	});

	it("selecting a device emits source-toggled {on:true}", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = [];
		await el.updateComplete;
		const onToggle = vi.fn();
		el.addEventListener("source-toggled", (e) =>
			onToggle((e as CustomEvent).detail),
		);
		const sel = el.shadowRoot!.querySelector<HTMLSelectElement>(
			'select[data-testid="add-picker"]',
		)!;
		sel.value = "AA";
		sel.dispatchEvent(new Event("change"));
		expect(onToggle).toHaveBeenCalledWith({ mac: "AA", on: true });
	});

	it("added devices render with an online/offline status badge", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = ["AA", "BB"];
		await el.updateComplete;
		const rows = el.shadowRoot!.querySelectorAll('[data-testid="device-row"]');
		expect(rows).toHaveLength(2);
		const badges = [
			...el.shadowRoot!.querySelectorAll('[data-testid="device-badge"]'),
		].map((b) => b.textContent!.trim());
		expect(badges.some((t) => /Online/.test(t))).toBe(true);
		expect(badges.some((t) => /Offline/.test(t))).toBe(true);
	});

	it("delete on an added device emits source-toggled {on:false}", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = ["AA"];
		await el.updateComplete;
		const onToggle = vi.fn();
		el.addEventListener("source-toggled", (e) =>
			onToggle((e as CustomEvent).detail),
		);
		const del = el.shadowRoot!.querySelector<HTMLElement>(
			'[data-testid="device-delete"][data-mac="AA"]',
		)!;
		del.click();
		expect(onToggle).toHaveBeenCalledWith({ mac: "AA", on: false });
	});

	it("missing sources render a warning row with a delete that emits {on:false}", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = [];
		el.missingSources = [{ mac: "28:DEAD", name: "Old Device" }];
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="missing-warning"]'),
		).not.toBeNull();
		const onToggle = vi.fn();
		el.addEventListener("source-toggled", (e) =>
			onToggle((e as CustomEvent).detail),
		);
		el.shadowRoot!.querySelector<HTMLElement>(
			'[data-testid="device-delete"][data-mac="28:DEAD"]',
		)!.click();
		expect(onToggle).toHaveBeenCalledWith({ mac: "28:DEAD", on: false });
	});

	it("shows an empty state when nothing is added", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = [];
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="no-devices"]'),
		).not.toBeNull();
		expect(
			el.shadowRoot!.querySelector('[data-testid="missing-warning"]'),
		).toBeNull();
	});

	it("hides the add-picker when every device is already added", async () => {
		const el = await fixture();
		el.availableDevices = DEVICES;
		el.selectedMacs = ["AA", "BB"];
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector('[data-testid="add-picker"]'),
		).toBeNull();
	});

	it("shows device name with area in parentheses inside a single box, never the mac", async () => {
		const el = await fixture();
		el.availableDevices = [
			{
				mac: "28:05:A5:11:22:33",
				name: "Kitchen",
				host: null,
				available: true,
				configured: true,
				area: "Downstairs",
				firmware_status: "compatible",
				current_connection_count: null,
			},
		];
		el.selectedMacs = ["28:05:A5:11:22:33"];
		await el.updateComplete;
		const boxes = el.shadowRoot!.querySelectorAll(".source-box");
		expect(boxes).toHaveLength(1);
		const row = boxes[0].querySelector(
			'[data-testid="device-row"]',
		) as HTMLElement;
		expect(row.textContent).toContain("Kitchen (Downstairs)");
		expect(row.textContent).not.toContain("28:05:A5:11:22:33");
	});
});
