import { describe, expect, it, vi } from "vitest";
import "../eppgrid-card-editor.js";
import type { EppGridCardEditor } from "../eppgrid-card-editor.js";

// Own file so the stub customElements.define calls don't leak into other suites
// (a definition can't be undone within a worker). Here ha-picture-upload starts
// UNregistered — the real HA situation on a fresh dashboard — so the editor's
// preload path runs.

describe("eppgrid-card-editor picture-upload preload", () => {
	it("mounts a media ha-selector to load ha-picture-upload, then swaps the URL fallback for the upload control", async () => {
		// ha-selector must exist for the preload probe to run (HA registers it via
		// ha-form; happy-dom does not, so stub it as a bare element).
		if (!customElements.get("ha-selector")) {
			customElements.define("ha-selector", class extends HTMLElement {});
		}

		const el = document.createElement(
			"eppgrid-card-editor",
		) as EppGridCardEditor;
		(el as unknown as { _preloadTimeoutMs: number })._preloadTimeoutMs = 2000;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "d1" } as never);
		el.hass = {
			callWS: vi.fn(async () => [
				{
					device_id: "d1",
					name: "Living Room",
					room_width: 4200,
					room_depth: 3000,
				},
			]),
			locale: { language: "en" },
		} as never;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		await el.updateComplete;

		// Before ha-picture-upload is registered: the probe is mounted and the URL
		// fallback is what renders.
		expect(el.shadowRoot!.querySelector("ha-selector")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-field.fp-url")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("ha-picture-upload")).toBeNull();

		// Simulate HA finishing the lazy import of ha-picture-upload.
		customElements.define("ha-picture-upload", class extends HTMLElement {});
		// Let whenDefined resolve, the probe be removed, and the re-render run.
		await customElements.whenDefined("ha-picture-upload");
		await Promise.resolve();
		await el.updateComplete;

		expect(el.shadowRoot!.querySelector("ha-picture-upload")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-field.fp-url")).toBeNull();
		// Probe cleaned up after the load.
		expect(el.shadowRoot!.querySelector("ha-selector")).toBeNull();

		document.body.replaceChildren();
	});
});
