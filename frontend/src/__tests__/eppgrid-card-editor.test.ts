import { afterEach, describe, expect, it, vi } from "vitest";
import * as CardModule from "../eppgrid-card.js";
import "../eppgrid-card-editor.js";
import type { EppGridCardEditor } from "../eppgrid-card-editor.js";
import { buildSchema } from "../eppgrid-card-editor.js";

afterEach(() => document.body.replaceChildren());

describe("eppgrid-card-editor", () => {
	it("loads the device list from the overview ws command", async () => {
		const callWS = vi.fn(async () => [
			{ device_id: "d1", name: "Living Room" },
		]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		expect(callWS).toHaveBeenCalledWith({
			type: "eppgrid/overview/list_devices",
		});
	});

	it("re-emits value-changed as config-changed and stops propagation", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		const stop = vi.fn();
		el._valueChanged({
			stopPropagation: stop,
			detail: {
				value: { type: "custom:eppgrid-card", device_id: "d1", primary: "X" },
			},
		} as any);
		expect(stop).toHaveBeenCalled();
		expect(got).toHaveBeenCalledWith(expect.objectContaining({ primary: "X" }));
	});

	it("preserves HA-managed passthrough keys (grid_options, visibility) on a form change", () => {
		// HA writes these keys into the card config: grid_options when the user
		// resizes the card in a Sections dashboard, visibility for conditional
		// display. The card never reads them, but a form change must not discard
		// them — ha-form only round-trips the keys in our schema.
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d1",
			grid_options: { columns: 12, rows: "auto" },
			visibility: [
				{ condition: "state", entity: "sun.sun", state: "above_horizon" },
			],
		} as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		// ha-form echoes only the schema-managed keys — the passthrough keys are absent.
		el._valueChanged({
			stopPropagation: vi.fn(),
			detail: {
				value: {
					type: "custom:eppgrid-card",
					device_id: "d1",
					show_grid: false,
				},
			},
		} as any);
		const cfg = got.mock.calls.at(-1)![0];
		expect(cfg.grid_options).toEqual({ columns: 12, rows: "auto" });
		expect(cfg.visibility).toEqual([
			{ condition: "state", entity: "sun.sun", state: "above_horizon" },
		]);
		expect(cfg.show_grid).toBe(false);
	});

	it("re-enables a part when the user turns both off", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		el._valueChanged({
			stopPropagation: vi.fn(),
			detail: {
				value: {
					type: "custom:eppgrid-card",
					device_id: "d1",
					show_map: false,
					show_sensors: false,
				},
			},
		} as any);
		const cfg = got.mock.calls.at(-1)![0];
		expect(cfg.show_map || cfg.show_sensors).toBe(true);
	});

	it("exposes hass via getter after it is set", () => {
		const callWS = vi.fn(async () => []);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		const hassObj = { callWS, locale: { language: "en" } } as any;
		el.hass = hassObj;
		expect(el.hass).toBe(hassObj);
	});

	it("handles callWS errors gracefully and leaves devices empty", async () => {
		const callWS = vi.fn(async () => {
			throw new Error("network error");
		});
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		// No crash; callWS was called
		expect(callWS).toHaveBeenCalled();
	});

	it("does not re-fetch devices when already loaded", async () => {
		let callCount = 0;
		const callWS = vi.fn(async () => {
			callCount += 1;
			return [{ device_id: "d1", name: "Room" }];
		});
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		const hassObj = { callWS, locale: { language: "en" } } as any;
		el.hass = hassObj;
		document.body.appendChild(el);
		await el.updateComplete;
		// Wait for first fetch to complete
		await Promise.resolve();
		await Promise.resolve();
		const countAfterFirst = callCount;
		// Setting hass again should not trigger a second fetch (devices already loaded)
		el.hass = hassObj;
		await Promise.resolve();
		expect(callCount).toBe(countAfterFirst);
	});

	it("renders nothing before hass or config are set", async () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		document.body.appendChild(el);
		await el.updateComplete;
		// No hass/config — render guard returns nothing, no error
		expect(el.shadowRoot?.children.length ?? 0).toBe(0);
	});

	it("auto-selects first device when config has no device_id", async () => {
		const callWS = vi.fn(async () => [{ device_id: "d1", name: "Room" }]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);
		const fired = vi.fn();
		el.addEventListener("config-changed", (e: any) => fired(e.detail.config));
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		await Promise.resolve();
		expect(fired).toHaveBeenCalled();
		expect(fired.mock.calls.at(-1)![0].device_id).toBe("d1");
	});

	it("_computeLabel returns localized label for known key", async () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.hass = {
			callWS: vi.fn(async () => []),
			locale: { language: "en" },
		} as any;
		const result = (el as any)._computeLabel({ name: "show_map" });
		expect(result).toBe("Show map");
	});

	it("_computeLabel falls back to raw name for unknown key", async () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.hass = {
			callWS: vi.fn(async () => []),
			locale: { language: "en" },
		} as any;
		const result = (el as any)._computeLabel({ name: "unknown_field_xyz" });
		expect(result).toBe("unknown_field_xyz");
	});

	it("buildSchema has primary and secondary template selectors and no title", () => {
		const schema = buildSchema([]) as any[];
		const names = schema.map((s) => s.name);
		expect(names).toContain("primary");
		expect(names).toContain("secondary");
		expect(names).not.toContain("title");
		expect(schema.find((s) => s.name === "primary").selector).toEqual({
			template: {},
		});
		expect(schema.find((s) => s.name === "secondary").selector).toEqual({
			template: {},
		});
	});

	it("buildSchema has a show_grid boolean toggle", () => {
		const schema = buildSchema([]) as any[];
		const entry = schema.find((s) => s.name === "show_grid");
		expect(entry).toBeTruthy();
		expect(entry.selector).toEqual({ boolean: {} });
	});

	it("buildSchema has a show_heatmap mode dropdown (off/on/toggle)", () => {
		const schema = buildSchema([]) as any[];
		const entry = schema.find((s) => s.name === "show_heatmap");
		expect(entry).toBeTruthy();
		expect(entry.selector.select.mode).toBe("dropdown");
		expect(entry.selector.select.options.map((o: any) => o.value)).toEqual([
			"off",
			"on",
			"toggle",
		]);
	});

	it("changing show_heatmap round-trips config-changed with the mode string", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		el._valueChanged({
			stopPropagation: vi.fn(),
			detail: {
				value: {
					type: "custom:eppgrid-card",
					device_id: "d1",
					show_heatmap: "toggle",
				},
			},
		} as any);
		const cfg = got.mock.calls.at(-1)![0];
		expect(cfg.show_heatmap).toBe("toggle");
	});

	it("_computeLabel returns localized label for show_heatmap", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.hass = {
			callWS: vi.fn(async () => []),
			locale: { language: "en" },
		} as any;
		const result = (el as any)._computeLabel({ name: "show_heatmap" });
		expect(result).toBe("Heatmap");
	});

	it("buildSchema places show_sensors immediately before the sensors dropdown", () => {
		const schema = buildSchema([]) as any[];
		const names = schema.map((s) => s.name);
		const sensorsIdx = names.indexOf("sensors");
		expect(sensorsIdx).toBeGreaterThan(0);
		// The show_sensors toggle sits directly above the sensors config dropdown.
		expect(names[sensorsIdx - 1]).toBe("show_sensors");
	});

	it("buildSchema has a room_color color picker", () => {
		const schema = buildSchema([]) as any[];
		const entry = schema.find((s) => s.name === "room_color");
		expect(entry).toBeTruthy();
		expect(entry.selector).toEqual({ color_rgb: {} });
	});

	it("buildSchema puts room_color last so the reset-to-auto control sits next to it", () => {
		const schema = buildSchema([]) as any[];
		expect(schema[schema.length - 1].name).toBe("room_color");
	});

	it("buildSchema has presence as a nested expandable with five boolean keys", () => {
		const schema = buildSchema([]) as any[];
		const sensorsEntry = schema.find((s: any) => s.name === "sensors");
		expect(sensorsEntry).toBeTruthy();
		const presenceEntry = sensorsEntry.schema.find(
			(s: any) => s.name === "presence",
		);
		expect(presenceEntry).toBeTruthy();
		expect(presenceEntry.type).toBe("expandable");
		const presenceKeys = presenceEntry.schema.map((s: any) => s.name);
		expect(presenceKeys).toEqual([
			"occupancy",
			"static_presence",
			"motion_presence",
			"target_presence",
			"mmwave",
		]);
		// each is a boolean selector
		for (const item of presenceEntry.schema) {
			expect(item.selector).toEqual({ boolean: {} });
		}
	});

	it("guards against double-invocation of _loadDevices while in-flight", async () => {
		// Use a resolver pattern so we can control when callWS resolves
		let resolveFirst!: (v: unknown) => void;
		const firstCallPromise = new Promise((res) => {
			resolveFirst = res;
		});
		const callWS = vi.fn(() => firstCallPromise);

		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" } as any);

		const fired = vi.fn();
		el.addEventListener("config-changed", (e: any) => fired(e.detail.config));

		// Trigger _loadDevices twice before the first resolves:
		// set hass calls _loadDevices, then connectedCallback (via appendChild) calls it again
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el); // triggers connectedCallback → _loadDevices again (guarded by _loading)

		// Still in-flight — callWS should have been called only once (the _loading flag blocked the second)
		expect(callWS).toHaveBeenCalledTimes(1);

		// Now resolve the first call with a device list
		resolveFirst([{ device_id: "d1", name: "Room" }]);
		await el.updateComplete;
		await Promise.resolve();
		await Promise.resolve();

		// config-changed should fire exactly once (auto-selected first device)
		expect(fired).toHaveBeenCalledTimes(1);
		document.body.removeChild(el);
	});

	it("passes defaulted config to form (show_map true when omitted)", async () => {
		// Spy on applyCardDefaults to verify the editor calls it
		const spy = vi.spyOn(CardModule, "applyCardDefaults");

		const callWS = vi.fn(async () => []);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();

		// Verify the spy was called with the config
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ device_id: "d1" }),
		);

		// Verify the spy's return value had show_map: true
		const result = spy.mock.results[spy.mock.results.length - 1]?.value;
		expect(result?.show_map).toBe(true);

		spy.mockRestore();
	});

	it("shows a reset-room-colour control only when room_color is set", async () => {
		const callWS = vi.fn(async () => []);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".reset-room-color")).toBeNull();

		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d1",
			room_color: [10, 20, 30],
		} as any);
		el.requestUpdate();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".reset-room-color")).not.toBeNull();
	});

	it("reset-room-colour clears room_color back to auto (keeping other keys)", async () => {
		const callWS = vi.fn(async () => []);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d1",
			room_color: [10, 20, 30],
			primary: "X",
		} as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		(el.shadowRoot!.querySelector(".reset-room-color") as HTMLElement).click();
		const cfg = got.mock.calls.at(-1)?.[0];
		expect("room_color" in cfg).toBe(false);
		expect(cfg.primary).toBe("X");
	});

	it("shows the crop-ratio hint from the selected device's calibration", async () => {
		const callWS = vi.fn(async () => [
			{
				device_id: "d1",
				name: "Living Room",
				room_width: 4200,
				room_depth: 3000,
			},
		]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		await el.updateComplete;
		const hint = el.shadowRoot!.querySelector(".fp-ratio-hint")!.textContent!;
		expect(hint).toContain("4.2");
		expect(hint).toContain("3.0");
		expect(hint).toContain("1.40");
	});

	it("prompts to calibrate when the device has no room dimensions", async () => {
		const callWS = vi.fn(async () => [
			{ device_id: "d1", name: "Bedroom", room_width: 0, room_depth: 0 },
		]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		await el.updateComplete;
		const hint = el.shadowRoot!.querySelector(".fp-ratio-hint")!.textContent!;
		expect(hint.toLowerCase()).toContain("calibrate");
	});

	it("falls back to a URL field when ha-picture-upload is unavailable and writes floor_plan", async () => {
		const callWS = vi.fn(async () => [
			{
				device_id: "d1",
				name: "Living Room",
				room_width: 4200,
				room_depth: 3000,
			},
		]);
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as any);
		el.hass = { callWS, locale: { language: "en" } } as any;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		await el.updateComplete;

		const field = el.shadowRoot!.querySelector(
			"epp-field.fp-url",
		) as HTMLElement;
		expect(field).toBeTruthy();

		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		field.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "/local/plan.png" },
				bubbles: true,
				composed: true,
			}),
		);
		expect(got).toHaveBeenCalledWith(
			expect.objectContaining({ floor_plan: "/local/plan.png" }),
		);
	});

	it("clearing the URL removes floor_plan and floor_plan_opacity", () => {
		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d1",
			floor_plan: "/local/plan.png",
			floor_plan_opacity: 50,
		} as any);
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		// Simulate the upload/URL control emitting an empty value.
		(el as any)._writeFloorPlan(undefined);
		const cfg = got.mock.calls[0][0];
		expect(cfg.floor_plan).toBeUndefined();
		expect(cfg.floor_plan_opacity).toBeUndefined();
	});
});
