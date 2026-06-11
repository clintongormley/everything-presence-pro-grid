/**
 * Exercises the ha-* branches of the guarded control helpers.
 *
 * `epp-settings-view` and the shared save/cancel bar render `ha-switch` /
 * `ha-button` when those elements are registered (real HA frontend) and
 * fall back to hand-rolled controls otherwise. The regular test files run
 * without HA elements registered, so they cover the fallback branch; this
 * file registers stubs FIRST (a customElements.define can't be undone
 * within an environment) and covers the ha-* branch.
 */
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderSaveCancelBar } from "../../components/save-cancel-bar.js";
import "../../components/epp-settings-view.js";
import type { EppSettingsView } from "../../components/epp-settings-view.js";
import "../../components/epp-flasher-view.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import { initGridFromRoom } from "../../lib/grid.js";
import { defaultLocalize } from "../../localize.js";

class HaSwitchStub extends HTMLElement {
	checked = false;
	disabled = false;
}
class HaButtonStub extends HTMLElement {
	disabled = false;
}
class HaSpinnerStub extends HTMLElement {}
customElements.define("ha-switch", HaSwitchStub);
customElements.define("ha-button", HaButtonStub);
customElements.define("ha-spinner", HaSpinnerStub);

function renderTo(tpl: unknown): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(): EppSettingsView {
	const el = document.createElement("epp-settings-view") as EppSettingsView;
	el.grid = initGridFromRoom(3000, 4000);
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.entitiesConfig = {};
	return el;
}

describe("settings toggles render ha-switch when registered", () => {
	it("entity rows render ha-switch with data-entity-key (no raw checkboxes)", () => {
		const sv = createView();
		const c = renderTo((sv as any).renderEntities());

		expect(c.querySelector('input[type="checkbox"]')).toBeNull();
		const switches = c.querySelectorAll("ha-switch");
		expect(switches.length).toBe(16);
		const occupancy = [...switches].find(
			(s) => (s as HTMLElement).dataset.entityKey === "room_occupancy",
		);
		expect(occupancy).toBeDefined();
		document.body.removeChild(c);
	});

	it("ha-switch change updates entity overrides and fires dirty", () => {
		const sv = createView();
		const c = renderTo((sv as any).renderEntities());

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const occupancy = [...c.querySelectorAll("ha-switch")].find(
			(s) => (s as HTMLElement).dataset.entityKey === "room_occupancy",
		) as HaSwitchStub;
		occupancy.checked = false;
		occupancy.dispatchEvent(new Event("change"));

		expect((sv as any)._overrides.entities?.room_occupancy).toBe(false);
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("zone toggles are disabled without a calibration", () => {
		const sv = createView();
		sv.perspective = null;
		const c = renderTo((sv as any).renderEntities());

		const zonePresence = [...c.querySelectorAll("ha-switch")].find(
			(s) => (s as HTMLElement).dataset.entityKey === "zone_presence",
		) as HaSwitchStub;
		expect(zonePresence.disabled).toBe(true);
		document.body.removeChild(c);
	});

	it("detection-range auto toggles render ha-switch and fire setting-change", () => {
		const sv = createView();
		(sv as any).targetAutoDistance = true;
		const c = renderTo((sv as any).renderDetectionRanges());

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const switches = c.querySelectorAll("ha-switch");
		expect(switches.length).toBe(2);
		const target = switches[0] as HaSwitchStub;
		target.checked = false;
		target.dispatchEvent(new Event("change"));

		expect(events.some((e) => e.key === "targetAutoDistance")).toBe(true);
		document.body.removeChild(c);
	});
});

describe("renderSaveCancelBar renders ha-button when registered", () => {
	it("renders ha-button save/cancel with disabled state and wires handlers", () => {
		const onSave = vi.fn();
		const onCancel = vi.fn();
		const c = renderTo(
			renderSaveCancelBar({
				saving: false,
				dirty: true,
				localize: defaultLocalize,
				onSave,
				onCancel,
			}),
		);

		expect(c.querySelector("button")).toBeNull();
		const save = c.querySelector("ha-button.save-btn") as HaButtonStub;
		const cancel = c.querySelector("ha-button.cancel-btn") as HaButtonStub;
		expect(save).not.toBeNull();
		expect(cancel).not.toBeNull();
		expect(save.disabled).toBe(false);

		(save as unknown as HTMLElement).click();
		(cancel as unknown as HTMLElement).click();
		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onCancel).toHaveBeenCalledTimes(1);
		document.body.removeChild(c);
	});

	it("disables the save ha-button while saving or when not dirty", () => {
		const c1 = renderTo(
			renderSaveCancelBar({
				saving: true,
				dirty: true,
				localize: defaultLocalize,
				onSave: vi.fn(),
				onCancel: vi.fn(),
			}),
		);
		expect(
			(c1.querySelector("ha-button.save-btn") as HaButtonStub).disabled,
		).toBe(true);
		expect(c1.textContent).toContain("common.saving");
		document.body.removeChild(c1);

		const c2 = renderTo(
			renderSaveCancelBar({
				saving: false,
				dirty: false,
				localize: defaultLocalize,
				onSave: vi.fn(),
				onCancel: vi.fn(),
			}),
		);
		expect(
			(c2.querySelector("ha-button.save-btn") as HaButtonStub).disabled,
		).toBe(true);
		document.body.removeChild(c2);
	});
});

describe("flasher HA-add progress spinner", () => {
	it("renders ha-spinner (not ha-circular-progress) when registered", () => {
		const el = document.createElement("epp-flasher-view") as EppFlasherView;
		el.flashableDevices = [];
		el.usbFlashState = { step: "wifi_configured", ip: "192.168.1.42" } as any;
		const c = renderTo((el as any).render());

		expect(c.querySelector("ha-spinner")).not.toBeNull();
		expect(c.querySelector("ha-circular-progress")).toBeNull();
		document.body.removeChild(c);
	});
});
