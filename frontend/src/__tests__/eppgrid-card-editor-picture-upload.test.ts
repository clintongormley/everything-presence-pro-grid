import { afterEach, describe, expect, it, vi } from "vitest";

// Register the ha-picture-upload stub before any editor element is
// constructed. Unlike epp-field's control resolution, eppgrid-card-editor's
// _hasPictureUpload getter re-checks customElements.get("ha-picture-upload")
// on every render, but we still register it up front (before the editor
// module is even imported) so every render in this file takes the upload
// branch. Each vitest test file runs in its own worker/window, so this stub
// does not affect other test files (in particular the "falls back to a URL
// field when ha-picture-upload is unavailable" test in
// eppgrid-card-editor.test.ts).
if (!customElements.get("ha-picture-upload")) {
	customElements.define("ha-picture-upload", class extends HTMLElement {});
}

import "../eppgrid-card-editor.js";
import type { EppGridCardEditor } from "../eppgrid-card-editor.js";

afterEach(() => document.body.replaceChildren());

interface DeviceFixture {
	device_id: string;
	name: string;
	room_width?: number;
	room_depth?: number;
}

async function fixture(device: DeviceFixture): Promise<EppGridCardEditor> {
	const callWS = vi.fn(async () => [device]);
	const el = document.createElement("eppgrid-card-editor") as EppGridCardEditor;
	el.setConfig({
		type: "custom:eppgrid-card",
		device_id: device.device_id,
	} as any);
	el.hass = { callWS, locale: { language: "en" } } as any;
	document.body.appendChild(el);
	await el.updateComplete;
	await Promise.resolve();
	await el.updateComplete;
	return el;
}

describe("eppgrid-card-editor (ha-picture-upload registered)", () => {
	it("renders ha-picture-upload with crop locked to the calibrated room ratio", async () => {
		const el = await fixture({
			device_id: "d1",
			name: "Living Room",
			room_width: 4200,
			room_depth: 3000,
		});
		const up = el.shadowRoot!.querySelector("ha-picture-upload") as HTMLElement;
		expect(up).toBeTruthy();
		expect(up.hasAttribute("crop")).toBe(true);
		expect(up.hasAttribute("original")).toBe(true);
		expect((up as any).cropOptions.aspectRatio).toBeCloseTo(4200 / 3000);
		expect((up as any).cropOptions.round).toBe(false);
	});

	it("renders ha-picture-upload without crop when the device is uncalibrated", async () => {
		const el = await fixture({
			device_id: "d1",
			name: "Bedroom",
			room_width: 0,
			room_depth: 0,
		});
		const up = el.shadowRoot!.querySelector("ha-picture-upload") as HTMLElement;
		expect(up).toBeTruthy();
		expect(up.hasAttribute("crop")).toBe(false);
		expect((up as any).cropOptions).toBeUndefined();
	});

	it("_onPictureChanged writes floor_plan from the change event's target value", async () => {
		const el = await fixture({
			device_id: "d1",
			name: "Living Room",
			room_width: 4200,
			room_depth: 3000,
		});
		const up = el.shadowRoot!.querySelector("ha-picture-upload") as HTMLElement;
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		(up as any).value = "/api/image/serve/abc/original";
		up.dispatchEvent(new Event("change"));
		expect(got).toHaveBeenCalledWith(
			expect.objectContaining({
				floor_plan: "/api/image/serve/abc/original",
			}),
		);
	});

	it("_onPictureChanged clears floor_plan and floor_plan_opacity when the value is empty", async () => {
		const el = await fixture({
			device_id: "d1",
			name: "Living Room",
			room_width: 4200,
			room_depth: 3000,
		});
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d1",
			floor_plan: "/api/image/serve/abc/original",
			floor_plan_opacity: 50,
		} as any);
		const up = el.shadowRoot!.querySelector("ha-picture-upload") as HTMLElement;
		const got = vi.fn();
		el.addEventListener("config-changed", (e: any) => got(e.detail.config));
		(up as any).value = "";
		up.dispatchEvent(new Event("change"));
		const cfg = got.mock.calls.at(-1)![0];
		expect(cfg.floor_plan).toBeUndefined();
		expect(cfg.floor_plan_opacity).toBeUndefined();
	});
});
