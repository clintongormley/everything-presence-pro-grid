import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-settings-view.js";
import { EppSettingsView } from "../../components/epp-settings-view.js";
import { GRID_CELL_COUNT, initGridFromRoom } from "../../lib/grid.js";
import { SETTINGS_FIELD_MAP } from "../../lib/settings-defaults.js";
import { setupLocalize } from "../../localize.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(
	overrides?: Partial<Record<string, unknown>>,
): EppSettingsView {
	const el = document.createElement("epp-settings-view") as EppSettingsView;
	el.grid = initGridFromRoom(3000, 4000);
	el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	el.roomWidth = 3000;
	el.roomDepth = 4000;
	el.openAccordions = new Set();
	el.entitiesConfig = {};
	el.temperatureOffset = 0;
	el.humidityOffset = 0;
	el.illuminanceOffset = 0;
	el.motionTimeout = 5;
	el.staticTimeout = 30;
	el.staticTriggerThreshold = 3;
	el.staticRenewThreshold = 3;
	el.staticOnDelay = 0;
	el.ledMode = "Manual Control";
	el.ledBrightness = 1.0;
	el.ledPresenceColor = "#CC33FF";
	(el as any).relayTriggerMode = "disabled";
	(el as any).relayContactMode = "no";
	if (overrides) {
		for (const [k, v] of Object.entries(overrides)) {
			(el as any)[k] = v;
		}
	}
	return el;
}

describe("epp-settings-view element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-settings-view");
		expect(Ctor).toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-settings-view") as EppSettingsView;
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = document.createElement("epp-settings-view") as any;
		const result = el.render();
		expect(result).toBeDefined();
	});

	// The previous window-level _dismissTooltips listener has been replaced
	// by per-tooltip pointer-down/scroll/resize/Escape handlers wired in
	// infoTip(); see "infoTip a11y and listener cleanup" below for the
	// equivalent behavioral coverage.
});

describe("render()", () => {
	it("renders settings container with accordions", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".settings-container")).not.toBeNull();
		expect(c.querySelectorAll(".accordion").length).toBe(5);
		document.body.removeChild(c);
	});

	it("renders with open accordion showing body", () => {
		const sv = createView({ openAccordions: new Set(["detection"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const bodies = c.querySelectorAll(".accordion-body");
		expect(bodies.length).toBe(1);
		document.body.removeChild(c);
	});

	it("renders save/cancel bar", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".save-cancel-bar")).not.toBeNull();
		document.body.removeChild(c);
	});
});

describe("toggleAccordion", () => {
	it("opens an accordion", () => {
		const sv = createView();
		sv.toggleAccordion("detection");
		expect(sv.openAccordions.has("detection")).toBe(true);
	});

	it("closes an open accordion", () => {
		const sv = createView({ openAccordions: new Set(["detection"]) });
		sv.toggleAccordion("detection");
		expect(sv.openAccordions.has("detection")).toBe(false);
	});

	it("opening one closes others", () => {
		const sv = createView({ openAccordions: new Set(["detection"]) });
		sv.toggleAccordion("sensitivity");
		expect(sv.openAccordions.has("detection")).toBe(false);
		expect(sv.openAccordions.has("sensitivity")).toBe(true);
	});

	it("fires accordion-toggle event", () => {
		const sv = createView();
		let detail: Set<string> | null = null;
		sv.addEventListener("accordion-toggle", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);
		sv.toggleAccordion("reporting");
		expect(detail).toBeInstanceOf(Set);
		expect((detail as unknown as Set<string>).has("reporting")).toBe(true);
	});
});

describe("renderSettingsSection", () => {
	it("renders detection section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("detection");
		expect(result).toBeDefined();
	});

	it("renders sensitivity section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("sensitivity");
		expect(result).toBeDefined();
	});

	it("renders reporting section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("reporting");
		expect(result).toBeDefined();
	});

	it("returns nothing for unknown section", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("unknown");
		expect(result).toBeDefined();
	});

	it("renderSettingsSection returns defined result for led_relay", () => {
		const sv = createView();
		const result = (sv as any).renderSettingsSection("led_relay");
		expect(result).toBeDefined();
	});
});

describe("renderDetectionRanges", () => {
	it("hides the static sensor range card without the static radar (Lite)", () => {
		// Review finding (#361): the static-range card fires staticMinDistance /
		// staticMaxDistance, which push via epp_set_static_presence — a service the
		// Lite firmware never declares — so the save went nowhere. Gate it like
		// every other static control.
		const sv = createView({ capabilities: { has_static_presence: false } });
		const c = renderTo((sv as any).renderDetectionRanges());
		expect(c.innerHTML).not.toContain("settings.static_sensor");
		// The target-range card is shared by every model and must stay.
		expect(c.innerHTML).toContain("settings.target_sensor");
		document.body.removeChild(c);
	});

	it("keeps the static sensor range card with the radar and on pre-flag firmware", () => {
		const sv = createView({ capabilities: {} });
		const c = renderTo((sv as any).renderDetectionRanges());
		expect(c.innerHTML).toContain("settings.static_sensor");
		document.body.removeChild(c);
	});

	it("renders with auto range enabled", () => {
		const sv = createView({
			targetAutoDistance: true,
			staticAutoDistance: true,
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with auto range disabled", () => {
		const sv = createView({
			targetAutoDistance: false,
			staticAutoDistance: false,
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders grid room metrics when available", () => {
		const sv = createView({ grid: initGridFromRoom(3000, 4000) });
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("renders with zero auto range (no perspective)", () => {
		const sv = createView({
			targetAutoDistance: true,
			staticAutoDistance: true,
			perspective: null,
			roomWidth: 0,
			roomDepth: 0,
			grid: new Uint8Array(GRID_CELL_COUNT),
		});
		const result = (sv as any).renderDetectionRanges();
		expect(result).toBeDefined();
	});

	it("target auto range toggle updates state and fires event", () => {
		const sv = createView({ targetAutoDistance: true });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		let firedKey = "";
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			firedKey = e.detail.key;
		}) as EventListener);

		const toggles = c.querySelectorAll("epp-toggle");
		if (toggles.length > 0) {
			const toggle = toggles[0] as HTMLElement;
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: false },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.targetAutoDistance).toBe(false);
			expect(firedKey).toBe("targetAutoDistance");
		}
		document.body.removeChild(c);
	});

	it("max distance slider updates state", () => {
		const sv = createView({ targetAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			range.value = "4.5";
			const span = document.createElement("span");
			span.textContent = "6";
			range.parentNode?.insertBefore(span, range.nextSibling);
			range.dispatchEvent(new Event("input"));
			expect((sv as any)._overrides.targetMaxDistance).toBe(4.5);
		}
		document.body.removeChild(c);
	});

	it("static min distance slider clamps at max", () => {
		const sv = createView({
			staticAutoDistance: false,
			staticMinDistance: 0.3,
			staticMaxDistance: 5,
		});
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		for (let i = 0; i < ranges.length; i++) {
			const r = ranges[i] as HTMLInputElement;
			if (r.min === "0.3") {
				const span = document.createElement("span");
				span.textContent = "0.3";
				r.parentNode?.insertBefore(span, r.nextSibling);
				r.value = "6";
				r.dispatchEvent(new Event("input"));
				expect((sv as any)._overrides.staticMinDistance).toBeLessThan(
					sv.staticMaxDistance,
				);
				break;
			}
		}
		document.body.removeChild(c);
	});

	it("static max distance slider clamps at min", () => {
		const sv = createView({
			staticAutoDistance: false,
			staticMinDistance: 5,
			staticMaxDistance: 10,
		});
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		const staticMax = ranges[ranges.length - 1] as HTMLInputElement;
		if (staticMax) {
			staticMax.value = "1";
			staticMax.dispatchEvent(new Event("input"));
			expect((sv as any)._overrides.staticMaxDistance).toBeGreaterThan(
				sv.staticMinDistance,
			);
		}
		document.body.removeChild(c);
	});
});

describe("logging categories", () => {
	it("hides the Bluetooth log category when the board has no BLE (Lite)", () => {
		const sv = createView({ bluetoothEnabled: false });
		const c = renderTo((sv as any).renderLogging());
		expect(c.innerHTML).not.toContain("settings.log_ble");
		// A shared category stays as a control.
		expect(c.innerHTML).toContain("settings.log_epp");
		document.body.removeChild(c);
	});

	it("keeps the Bluetooth log category on a BLE board and on pre-flag firmware", () => {
		// Default (true) covers firmware that predates the flag — must not hide it.
		const sv = createView({});
		const c = renderTo((sv as any).renderLogging());
		expect(c.innerHTML).toContain("settings.log_ble");
		document.body.removeChild(c);
	});
});

describe("sensor-assisted clear", () => {
	function assistedClearTimeoutRow(c: HTMLElement): HTMLElement {
		const rows = Array.from(
			c.querySelectorAll(".setting-row"),
		) as HTMLElement[];
		const row = rows.find(
			(r) =>
				r.querySelector("label")?.textContent?.trim() ===
				"settings.assisted_clear_timeout",
		);
		if (!row) throw new Error("assisted-clear timeout row not found");
		return row;
	}

	it("hides the assisted-clear card on a board that lacks the static/PIR sensors (Lite)", () => {
		// Assisted clear force-clears a zone once the static + PIR sensors confirm
		// the room emptied; the zone engine gates it on those sensors ever being
		// active, so on a sensorless Lite it never fires — has_assisted_clear:false
		// drops the card rather than showing a control that does nothing.
		const sv = createView({ capabilities: { has_assisted_clear: false } });
		const c = renderTo((sv as any).renderSensitivities());
		expect(c.innerHTML).not.toContain("settings.assisted_clear");
		document.body.removeChild(c);
	});

	it("keeps the assisted-clear card with the sensors and on pre-flag firmware", () => {
		const sv = createView({ capabilities: {} });
		const c = renderTo((sv as any).renderSensitivities());
		expect(c.innerHTML).toContain("settings.assisted_clear");
		document.body.removeChild(c);
	});

	it("greys out (row-disabled) the timeout slider when the toggle is off", () => {
		const sv = createView({ assistedClearEnabled: false });
		const c = renderTo((sv as any).renderSensitivities());
		expect(assistedClearTimeoutRow(c).classList.contains("row-disabled")).toBe(
			true,
		);
		document.body.removeChild(c);
	});

	it("does not grey out the timeout slider when the toggle is on", () => {
		const sv = createView({ assistedClearEnabled: true });
		const c = renderTo((sv as any).renderSensitivities());
		expect(assistedClearTimeoutRow(c).classList.contains("row-disabled")).toBe(
			false,
		);
		document.body.removeChild(c);
	});

	it("toggling the switch updates overrides and fires setting-change", () => {
		const sv = createView({ assistedClearEnabled: true });
		const c = renderTo((sv as any).renderSensitivities());

		let firedKey = "";
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			firedKey = e.detail.key;
		}) as EventListener);

		const toggles = c.querySelectorAll("epp-toggle");
		const toggle = toggles[toggles.length - 1] as HTMLElement;
		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: false },
				bubbles: true,
			}),
		);
		expect((sv as any)._overrides.assistedClearEnabled).toBe(false);
		expect(firedKey).toBe("assistedClearEnabled");
		document.body.removeChild(c);
	});
});

describe("renderSensitivities", () => {
	it("renders sensitivity controls", () => {
		const sv = createView();
		const result = (sv as any).renderSensitivities();
		expect(result).toBeDefined();
	});

	it("range inputs update next sibling text", () => {
		const sv = createView();
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		expect(ranges.length).toBeGreaterThan(0);
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			if (range.nextElementSibling) {
				range.value = "10";
				range.dispatchEvent(new Event("input"));
				expect(range.nextElementSibling.textContent).toBe("10");
			}
		}
		document.body.removeChild(c);
	});

	it("slider DOM update preserves Lit text node for safe re-render", () => {
		const sv = createView({ illuminanceOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 100,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			100,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const span = c.querySelector(".setting-value")!;
		// Capture Lit's original text node
		const origTextNode = [...span.childNodes].find(
			(n) => n.nodeType === Node.TEXT_NODE,
		);
		expect(origTextNode).toBeDefined();

		// Simulate slider interaction — this should NOT replace the text node
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		range.value = "10";
		range.dispatchEvent(new Event("input"));

		// The SAME text node should still be in the DOM (not replaced)
		const afterTextNode = [...span.childNodes].find(
			(n) => n.nodeType === Node.TEXT_NODE,
		);
		expect(afterTextNode).toBe(origTextNode);
		expect(afterTextNode!.textContent).toBe("110.0");
		document.body.removeChild(c);
	});
});

describe("renderEnvOffset", () => {
	it("renders with a reading", () => {
		const sv = createView({ illuminanceOffset: 10 });
		const result = (sv as any).renderEnvOffset(
			"Illuminance offset",
			150,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Adjust illuminance.",
		);
		expect(result).toBeDefined();
	});

	it("renders with null reading showing dash", () => {
		const sv = createView();
		const tpl = (sv as any).renderEnvOffset(
			"Test",
			null,
			"test_key",
			-10,
			10,
			1,
			"unit",
			0,
			"tip",
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		if (valueSpan) {
			expect(valueSpan.textContent).toContain("\u2014");
		}
		document.body.removeChild(c);
	});

	it("range input with null reading shows dash on update", () => {
		const sv = createView();
		const tpl = (sv as any).renderEnvOffset(
			"Test",
			null,
			"test_key",
			-10,
			10,
			1,
			"unit",
			0,
			"tip",
		);
		const c = renderTo(tpl);
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range?.nextElementSibling) {
			range.value = "5";
			range.dispatchEvent(new Event("input"));
			expect(range.nextElementSibling.textContent).toBe("\u2014");
		}
		document.body.removeChild(c);
	});

	it("range input with a reading updates preview", () => {
		const sv = createView({ illuminanceOffset: 0 });
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			100,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
		);
		const c = renderTo(tpl);
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range?.nextElementSibling) {
			range.value = "10";
			range.dispatchEvent(new Event("input"));
			expect(range.nextElementSibling.textContent).toBeDefined();
		}
		document.body.removeChild(c);
	});

	it("illuminance displays adjusted value with 1 decimal place", () => {
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105.3, // raw=100.3, offset=5 applied by coordinator
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1, // precision=1
			"Tip",
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan?.textContent).toBe("105.3");
		document.body.removeChild(c);
	});

	it("illuminance display is clamped to >= 0", () => {
		// Raw reading is 5, offset is -10 → adjusted would be -5 without clamp
		const sv = createView({ illuminanceOffset: -10 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: -5,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan?.textContent).toBe("0.0");
		document.body.removeChild(c);
	});

	it("illuminance slider input clamps adjusted display to >= 0", () => {
		// Raw=5, current offset=0, user drags to -10 → adjusted=-5 → clamp to 0
		const sv = createView({ illuminanceOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 5,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range?.nextElementSibling) {
			range.value = "-10";
			range.dispatchEvent(new Event("input"));
			expect(range.nextElementSibling.textContent).toBe("0.0");
		}
		document.body.removeChild(c);
	});

	it("humidity display is clamped to 0-100", () => {
		// Raw=95, offset=10 → adjusted=105 → clamp to 100
		const sv = createView({ humidityOffset: 10 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: null,
			humidity: 105,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Humidity",
			sv.sensorState.humidity,
			"humidity",
			-50,
			50,
			0.1,
			"%",
			1,
			"Tip",
			0,
			100,
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value");
		expect(valueSpan?.textContent).toBe("100.0");
		document.body.removeChild(c);
	});

	it("reset button on env offset uses correct precision from data attribute", () => {
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105.3,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
		);
		const c = renderTo(tpl);
		const row = c.querySelector(".setting-row") as HTMLElement;
		// Simulate reset to default (0)
		(sv as any)._resetSlider(row, 0);
		const valueSpan = c.querySelector(".setting-value");
		// Should show raw value (100.3) with 1 decimal place
		expect(valueSpan?.textContent).toBe("100.3");
		document.body.removeChild(c);
	});

	it("reset with large offset (>100) shows correct raw value", () => {
		// Reproduces bug: offset=389 exceeds default input range [0,100]
		// If .value is set before min/max, browser clamps 389→100
		const sv = createView({ illuminanceOffset: 389 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 425, // raw=36, firmware applied +389
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		// Verify slider value is correctly set to 389 (not clamped to 100)
		const slider = c.querySelector(".setting-range") as HTMLInputElement;
		expect(slider.value).toBe("389");
		// Reset to 0
		const row = c.querySelector(".setting-row") as HTMLElement;
		(sv as any)._resetSlider(row, 0);
		const valueSpan = c.querySelector(".setting-value");
		// Should show raw value ~36, not 325 (which you get if slider was clamped to 100)
		expect(valueSpan?.textContent).toBe("36.0");
		document.body.removeChild(c);
	});

	it("display and slider follow the dragged override when a live reading re-renders mid-drag", () => {
		// renderEnvOffset computed the displayed offset from the PROP, so a
		// 5Hz sensorState re-render mid-drag snapped the ${adjusted} text back
		// to the saved offset while the slider kept the dragged position —
		// display and slider disagreed until save.
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105, // raw = 100 (saved offset 5 applied by coordinator)
			temperature: null,
			humidity: null,
			co2: null,
		};
		// User dragged the slider to 50 — recorded as an override.
		(sv as any)._overrides.illuminanceOffset = 50;
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			() => sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		// Display must show raw + dragged offset (100 + 50), not raw + saved (105).
		expect(c.querySelector(".setting-value")!.textContent).toBe("150.0");
		// And the slider must sit at the dragged position too.
		expect((c.querySelector(".setting-range") as HTMLInputElement).value).toBe(
			"50",
		);
		document.body.removeChild(c);
	});

	it("reset recomputes from the live reading under a comma-decimal locale (es)", () => {
		// _resetSlider previously re-parsed the rendered display text with
		// parseFloat; Spanish "634,5" parses as 634, silently dropping the
		// decimals. (Sub-1000 values keep the assertion independent of
		// Spanish CLDR grouping rules.)
		const es = setupLocalize({ language: "es" });
		const sv = createView({ illuminanceOffset: 200 });
		sv.localize = es;
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 634.5, // raw = 434.5 (saved offset 200 applied)
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Iluminancia",
			() => sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value")!;
		expect(valueSpan.textContent).toBe("634,5");

		const row = c.querySelector(".setting-row") as HTMLElement;
		(sv as any)._resetSlider(row, 0);

		// raw (434.5) + reset offset (0), formatted for es.
		expect(valueSpan.textContent).toBe("434,5");
		expect((sv as any)._overrides.illuminanceOffset).toBe(0);
		document.body.removeChild(c);
	});

	it("slider input uses live sensorState reading, not stale render-time value", async () => {
		// Item 5 regression: closure captured `reading` parameter at render time.
		// If sensorState updates between render and slider drag, the displayed
		// adjusted value must reflect the LIVE reading, not the stale one.
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 100, // raw=95
			temperature: null,
			humidity: null,
			co2: null,
		};
		document.body.appendChild(sv);
		sv.openAccordions = new Set(["sensitivity"]);
		await sv.updateComplete;

		// Find the illuminance offset slider rendered with the original reading.
		const slider = sv.shadowRoot!.querySelector(
			'.setting-range[data-offset-key="illuminance"]',
		) as HTMLInputElement;
		expect(slider).not.toBeNull();

		// Update sensorState — simulating a fresh sensor reading. Critically, we
		// DO NOT wait for Lit's re-render. The user drags the slider while the
		// pending re-render hasn't been applied yet — the @input handler must
		// pull the live reading rather than relying on a closure-captured value.
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 200, // raw=195
			temperature: null,
			humidity: null,
			co2: null,
		};

		slider.value = "10"; // user drags offset to 10
		slider.dispatchEvent(new Event("input"));

		// Display should reflect raw=195 (from live reading=200) + new offset=10
		// = 205.0. With the stale closure it would show 95 + 10 = 105.0.
		const display = slider.parentElement!.querySelector(".setting-value");
		expect(display?.textContent).toBe("205.0");
		document.body.removeChild(sv);
	});
});

describe("presence delay (static on-delay) slider", () => {
	function findPresenceDelaySlider(sv: EppSettingsView): HTMLInputElement {
		const rows = Array.from(
			sv.shadowRoot!.querySelectorAll(".setting-row"),
		) as HTMLElement[];
		const row = rows.find(
			(r) =>
				r.querySelector("label")?.textContent?.trim() ===
				"settings.presence_delay",
		);
		if (!row) throw new Error("Presence delay row not found");
		return row.querySelector(".setting-range") as HTMLInputElement;
	}

	it("clamps slider range to the DFRobot C4001 hardware limits (0-2s, 0.1 step)", async () => {
		const sv = createView({ staticOnDelay: 0 });
		document.body.appendChild(sv);
		sv.openAccordions = new Set(["sensitivity"]);
		await sv.updateComplete;

		const slider = findPresenceDelaySlider(sv);
		expect(slider.min).toBe("0");
		expect(slider.max).toBe("2");
		expect(slider.step).toBe("0.1");
		document.body.removeChild(sv);
	});
});

describe("infoTip", () => {
	it("renders a shared epp-info-tip carrying the text and localize fn", () => {
		const sv = createView();
		const c = renderTo((sv as any).infoTip("Some tip text"));
		const tip = c.querySelector("epp-info-tip") as any;
		expect(tip).not.toBeNull();
		expect(tip.text).toBe("Some tip text");
		expect(tip.localize).toBe(sv.localize);
		document.body.removeChild(c);
	});
});

describe("info tips (shared epp-info-tip)", () => {
	it("renders an epp-info-tip per documented option in detection ranges", () => {
		const sv = createView();
		const c = renderTo((sv as any).renderDetectionRanges());
		// Target auto + target max, static auto + static min + static max.
		const tips = c.querySelectorAll("epp-info-tip");
		expect(tips.length).toBe(5);
		expect((tips[1] as any).text).toBe("info.target_max_distance");
		expect((tips[0] as any).localize).toBe(sv.localize);
		document.body.removeChild(c);
	});

	it("marks auto-driven rows disabled via class, not inline pointer-events", () => {
		const sv = createView({
			targetAutoDistance: true,
			staticAutoDistance: true,
		});
		const c = renderTo((sv as any).renderDetectionRanges());
		const rows = c.querySelectorAll(".setting-row");
		// Rows: target auto, target max, static auto, static min, static max
		for (const idx of [1, 3, 4]) {
			const row = rows[idx] as HTMLElement;
			expect(row.classList.contains("row-disabled")).toBe(true);
			expect(row.getAttribute("style") ?? "").not.toContain("pointer-events");
			const hasTipChild = Array.from(row.children).some(
				(ch) => ch.tagName.toLowerCase() === "epp-info-tip",
			);
			expect(hasTipChild).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("does not mark rows disabled when auto is off", () => {
		const sv = createView({
			targetAutoDistance: false,
			staticAutoDistance: false,
		});
		const c = renderTo((sv as any).renderDetectionRanges());
		for (const row of c.querySelectorAll(".setting-row")) {
			expect(row.classList.contains("row-disabled")).toBe(false);
		}
		document.body.removeChild(c);
	});

	it("stylesheet greys out disabled-row children except the info tip", () => {
		const cssText = (EppSettingsView as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.join("\n");
		expect(cssText).toMatch(
			/\.setting-row\.row-disabled\s*>\s*:not\(epp-info-tip\)\s*{[^}]*pointer-events:\s*none/,
		);
	});
});

describe("renderEntities", () => {
	it("renders all entity toggles", () => {
		const sv = createView({
			entitiesConfig: {
				room_occupancy: true,
				room_static_presence: false,
			},
		});
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggles = c.querySelectorAll("epp-toggle");
		expect(toggles.length).toBeGreaterThan(0);
		document.body.removeChild(c);
	});

	it("uses fallback values with empty config", () => {
		const sv = createView({ entitiesConfig: {} });
		const result = (sv as any).renderEntities();
		expect(result).toBeDefined();
	});
});

describe("renderSaveCancelButtons", () => {
	it("renders save and cancel buttons", () => {
		const sv = createView();
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		expect(c.querySelector("epp-button.cancel-btn")).not.toBeNull();
		expect(c.querySelector("epp-button.save-btn")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("save button is disabled when not dirty", () => {
		const sv = createView({ dirty: false });
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		const saveBtn = c.querySelector("epp-button.save-btn") as HTMLElement & {
			disabled: boolean;
		};
		if (saveBtn) {
			expect(saveBtn.disabled).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("save button is disabled when saving", () => {
		const sv = createView({ saving: true, dirty: true });
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		const saveBtn = c.querySelector("epp-button.save-btn") as HTMLElement & {
			disabled: boolean;
		};
		if (saveBtn) {
			expect(saveBtn.disabled).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("cancel button fires cancel event", () => {
		const sv = createView();
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		let cancelFired = false;
		sv.addEventListener("cancel", () => {
			cancelFired = true;
		});

		const cancelBtn = c.querySelector("epp-button.cancel-btn") as HTMLElement;
		if (cancelBtn) {
			cancelBtn.click();
			expect(cancelFired).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("save button fires save event", () => {
		const sv = createView({ dirty: true });
		const tpl = (sv as any).renderSaveCancelButtons();
		const c = renderTo(tpl);

		let saveFired = false;
		sv.addEventListener("save", () => {
			saveFired = true;
		});

		const saveBtn = c.querySelector("epp-button.save-btn") as HTMLElement;
		if (saveBtn) {
			saveBtn.click();
			expect(saveFired).toBe(true);
		}
		document.body.removeChild(c);
	});
});

describe("dirty event", () => {
	it("fires dirty when a sensitivity slider changes", () => {
		// Render with sensitivity accordion open so sliders are visible
		const sv = createView({ openAccordions: new Set(["sensitivity"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		// Find the first range input inside the sensitivity section
		const ranges = c.querySelectorAll(".setting-range");
		expect(ranges.length).toBeGreaterThan(0);
		const slider = ranges[0] as HTMLInputElement;
		slider.value = "10";
		slider.dispatchEvent(new Event("input", { bubbles: true }));

		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});
});

describe("setting-change event", () => {
	it("env offset slider must NOT propagate via setting-change during drag", () => {
		// Why: the slider's display math is `liveReading - liveOffset + drag`.
		// `liveOffset` reads the panel prop. If we propagate every @input via
		// setting-change, the panel's prop chases the drag, which makes
		// `liveOffset == drag`, collapsing the math to `liveReading` — the
		// displayed value stops responding to drag (or "wiggles" depending on
		// render timing). The pre-existing pattern uses _overrides locally and
		// _fireDirty for the dirty flag; setting-change is reserved for things
		// the panel must know about during edit (e.g. distance auto-toggle).
		const sv = createView({ temperatureOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: 22,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Temperature",
			() => sv.sensorState.temperature,
			"temperature",
			-10,
			10,
			0.1,
			"°C",
			1,
			"Tip",
		);
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const slider = c.querySelector(".setting-range") as HTMLInputElement;
		slider.value = "1.5";
		slider.dispatchEvent(new Event("input"));

		// _overrides must capture the drag value so save reads it correctly.
		expect((sv as any)._overrides.temperatureOffset).toBe(1.5);
		// But the panel must NOT be told via setting-change.
		expect(events.some((e) => e.key === "temperatureOffset")).toBe(false);
		document.body.removeChild(c);
	});

	it("env offset slider produces monotonic display across rapid drag events", () => {
		// Reproduces the user-reported "wiggle": with setting-change propagation,
		// the panel prop chases the drag mid-event-burst, so the displayed value
		// (set via _setSettingValue from the @input handler) stops increasing.
		// This test exercises the @input handler directly with a stable prop and
		// asserts the display walks monotonically with the drag.
		const sv = createView({ temperatureOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null,
			temperature: 22,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Temperature",
			() => sv.sensorState.temperature,
			"temperature",
			-10,
			10,
			0.1,
			"°C",
			1,
			"Tip",
		);
		const c = renderTo(tpl);
		const slider = c.querySelector(".setting-range") as HTMLInputElement;
		const display = slider.parentElement?.querySelector(
			".setting-value",
		) as HTMLElement;

		const observed: string[] = [];
		for (const v of ["1", "2", "3", "4", "5"]) {
			slider.value = v;
			slider.dispatchEvent(new Event("input"));
			observed.push(display.textContent ?? "");
		}

		// Reading is 22, saved offset 0, so display should be 22 + drag.
		expect(observed).toEqual(["23.0", "24.0", "25.0", "26.0", "27.0"]);
		document.body.removeChild(c);
	});

	it("fires setting-change on target auto range toggle", () => {
		const sv = createView({ targetAutoDistance: true });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const toggles = c.querySelectorAll("epp-toggle");
		if (toggles.length > 0) {
			const toggle = toggles[0] as HTMLElement;
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: false },
					bubbles: true,
				}),
			);
			expect(events.some((e) => e.key === "targetAutoDistance")).toBe(true);
		}
		document.body.removeChild(c);
	});
});

describe("save event payload", () => {
	it("emits all settings values in save event", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			targetMaxDistance: 4.0,
			staticAutoDistance: false,
			staticMinDistance: 1.0,
			staticMaxDistance: 8.0,
			motionTimeout: 10,
			staticTimeout: 60,
			staticTriggerThreshold: 5,
			staticRenewThreshold: 4,
			staticOnDelay: 2,
			temperatureOffset: -1.5,
			humidityOffset: 2.0,
			illuminanceOffset: -10,
			entitiesConfig: { room_occupancy: true },
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.target_auto_distance).toBe(false);
		expect(payload.target_max_distance).toBe(4.0);
		expect(payload.motion_timeout).toBe(10);
		expect(payload.static_trigger_threshold).toBe(5);
		expect(payload.static_renew_threshold).toBe(4);
		expect(payload.static_on_delay).toBe(2);
		expect(payload.temperature_offset).toBe(-1.5);
	});

	it("includes relay settings in save payload", () => {
		const sv = createView({
			dirty: true,
			relayTriggerMode: "motion",
			relayContactMode: "nc",
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.relay_trigger_mode).toBe("motion");
		expect(payload.relay_contact_mode).toBe("nc");
	});
});

// =============================================================================
// _emitSave payload single-sourcing — every SETTINGS_FIELD_MAP key must appear
// in the save event detail so a field added to the map but not to _emitSave
// fails this test immediately.
// =============================================================================
describe("_emitSave payload single-sourcing (SETTINGS_FIELD_MAP drift guard)", () => {
	it("emitted save payload contains every SETTINGS_FIELD_MAP key", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			staticAutoDistance: false,
		});

		let payload: Record<string, unknown> | null = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		const mapKeys = SETTINGS_FIELD_MAP.map(([key]) => key);
		for (const key of mapKeys) {
			expect(
				Object.hasOwn(payload!, key),
				`save payload missing SETTINGS_FIELD_MAP key: "${key}"`,
			).toBe(true);
		}
	});

	it("emitted save payload contains no extra keys beyond SETTINGS_FIELD_MAP", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			staticAutoDistance: false,
		});

		let payload: Record<string, unknown> | null = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		const mapKeys = new Set(SETTINGS_FIELD_MAP.map(([key]) => key));
		const extraKeys = Object.keys(payload!).filter(
			(k) => !mapKeys.has(k as any),
		);
		expect(
			extraKeys,
			`save payload has extra keys not in SETTINGS_FIELD_MAP: ${extraKeys.join(", ")}`,
		).toHaveLength(0);
	});
});

describe("save event auto distance substitution", () => {
	it("sends auto-computed target distance when targetAutoDistance is true", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: true,
			targetMaxDistance: 99, // stale stored value — should NOT be sent
			staticAutoDistance: false,
			staticMinDistance: 1.0,
			staticMaxDistance: 8.0,
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.target_auto_distance).toBe(true);
		// autoDetectionRange for 3000x4000 room with identity perspective
		// returns 4.0 (rounded up to nearest 0.5m), capped at 6
		expect(payload.target_max_distance).toBeLessThanOrEqual(6);
		expect(payload.target_max_distance).not.toBe(99);
	});

	it("sends auto-computed static distances when staticAutoDistance is true", () => {
		const sv = createView({
			dirty: true,
			targetAutoDistance: false,
			targetMaxDistance: 4.0,
			staticAutoDistance: true,
			staticMinDistance: 5.0, // stale — should be replaced with 0.3
			staticMaxDistance: 99, // stale — should NOT be sent
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.static_auto_distance).toBe(true);
		expect(payload.static_min_distance).toBe(0.3);
		expect(payload.static_max_distance).toBeLessThanOrEqual(16);
		expect(payload.static_max_distance).not.toBe(99);
	});
});

describe("renderEntities entity toggle @change handlers", () => {
	it("toggling room_occupancy checkbox updates overrides and fires dirty", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="room_occupancy"]',
		) as HTMLElement | undefined;
		expect(toggle).toBeDefined();
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: false },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.room_occupancy).toBe(false);
			expect(dirtyFired).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling room_static_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="room_static_presence"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.room_static_presence).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling room_motion_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="room_motion_presence"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.room_motion_presence).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling room_target_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="room_target_presence"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.room_target_presence).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling zone_presence updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="zone_presence"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: false },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.zone_presence).toBe(false);
		}
		document.body.removeChild(c);
	});

	it("toggling target_xy updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector('epp-toggle[data-entity-key="target_xy"]') as
			| HTMLElement
			| undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.target_xy).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling target_active updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="target_active"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.target_active).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_illuminance updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="env_illuminance"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.env_illuminance).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_humidity updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="env_humidity"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.env_humidity).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_temperature updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="env_temperature"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.env_temperature).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("toggling env_co2 updates overrides", () => {
		const sv = createView({ entitiesConfig: {} });
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector('epp-toggle[data-entity-key="env_co2"]') as
			| HTMLElement
			| undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: true },
					bubbles: true,
				}),
			);
			expect((sv as any)._overrides.entities?.env_co2).toBe(true);
		}
		document.body.removeChild(c);
	});

	it("second toggle uses existing _overrides.entities object", () => {
		const sv = createView({ entitiesConfig: {} });
		// Pre-populate overrides.entities
		(sv as any)._overrides.entities = { room_occupancy: true };
		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const toggle = c.querySelector(
			'epp-toggle[data-entity-key="zone_presence"]',
		) as HTMLElement | undefined;
		if (toggle) {
			toggle.dispatchEvent(
				new CustomEvent("value-changed", {
					detail: { value: false },
					bubbles: true,
				}),
			);
			// Both keys should be present in overrides
			expect((sv as any)._overrides.entities.room_occupancy).toBe(true);
			expect((sv as any)._overrides.entities.zone_presence).toBe(false);
		}
		document.body.removeChild(c);
	});

	it("renderEntities works with null entitiesConfig (branch 40)", () => {
		const sv = createView({ entitiesConfig: null as any });
		const result = (sv as any).renderEntities();
		expect(result).toBeDefined();
	});

	// Regression for "rate dropdown allows change once, then not again":
	// PR #168 (da1bd018) removed `this.requestUpdate()` from the rate dropdown
	// @selected handlers with the wrong claim that `ha-select` shows the
	// user's picked value internally. Without requestUpdate, the second click
	// doesn't trigger a re-render — the override is set but `.value` never
	// flows back to `ha-select`, so the displayed value stays stuck.

	it("zone update rate @selected handler calls requestUpdate", () => {
		const sv = createView({
			entitiesConfig: { zone_presence: true },
			zoneUpdateRateMs: 1000,
		});
		Object.defineProperty(sv, "shadowRoot", {
			value: { querySelector: () => null, querySelectorAll: () => [] },
			configurable: true,
		});
		const requestUpdateSpy = vi.spyOn(sv, "requestUpdate");

		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		// First select is the zone rate dropdown (zone_presence section)
		const zoneSelect = selects[0] as HTMLElement;
		zoneSelect.dispatchEvent(
			new CustomEvent("selected", { bubbles: true, detail: { value: "200" } }),
		);

		expect((sv as any)._overrides.zoneUpdateRateMs).toBe(200);
		expect(requestUpdateSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});

	it("target update rate @selected handler calls requestUpdate", () => {
		const sv = createView({
			entitiesConfig: { target_xy: true },
			targetUpdateRateMs: 1000,
		});
		Object.defineProperty(sv, "shadowRoot", {
			value: { querySelector: () => null, querySelectorAll: () => [] },
			configurable: true,
		});
		const requestUpdateSpy = vi.spyOn(sv, "requestUpdate");

		const tpl = (sv as any).renderEntities();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		const targetSelect = selects[selects.length - 1] as HTMLElement;
		targetSelect.dispatchEvent(
			new CustomEvent("selected", { bubbles: true, detail: { value: "500" } }),
		);

		expect((sv as any)._overrides.targetUpdateRateMs).toBe(500);
		expect(requestUpdateSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("resetBtn click handler", () => {
	it("resetBtn click calls _resetSlider and _fireChange when key provided", () => {
		const sv = createView({ motionTimeout: 10 });
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		// The reset button is the .setting-info span with mdi:restart icon
		// Find a row that has a named key (motionTimeout has resetBtn(5, "motionTimeout"))
		const rows = c.querySelectorAll(".setting-row");
		let resetClicked = false;
		for (const row of rows) {
			const infoSpans = row.querySelectorAll(".setting-info");
			if (infoSpans.length > 0) {
				// Click the first info span (reset button)
				(infoSpans[0] as HTMLElement).click();
				resetClicked = true;
				break;
			}
		}
		expect(resetClicked).toBe(true);
		// setting-change should be fired for motionTimeout reset
		expect(events.some((e) => e.key === "motionTimeout")).toBe(true);
		document.body.removeChild(c);
	});

	it("env offset reset does not fire setting-change (preserves drag math)", () => {
		// Why: env offset sliders must NOT propagate to the panel during edit
		// (see "env offset slider must NOT propagate via setting-change" above).
		// The reset path goes through resetBtn(0) without a key, so _resetSlider
		// updates _overrides locally and the @click handler fires _fireDirty —
		// no setting-change. Save reads the new value from _overrides via _emitSave.
		const sv = createView({ illuminanceOffset: 5 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 105,
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			105,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
		);
		const c = renderTo(tpl);

		const events: any[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const infoSpan = c.querySelector(".setting-info") as HTMLElement;
		if (infoSpan) infoSpan.click();

		expect(events.length).toBe(0);
		expect((sv as any)._overrides.illuminanceOffset).toBe(0);
		document.body.removeChild(c);
	});
});

describe("_resetSlider edge cases", () => {
	it("does nothing when no .setting-range slider in row", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		// No slider inside — should silently return
		expect(() => (sv as any)._resetSlider(row, 5)).not.toThrow();
	});

	it("handles missing display element after slider", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.value = "3";
		row.appendChild(slider);
		// No sibling after slider — display will be null
		expect(() =>
			(sv as any)._resetSlider(row, 5, "motionTimeout"),
		).not.toThrow();
		// Override should still be set
		expect((sv as any)._overrides.motionTimeout).toBe(5);
	});

	it("resetSlider with non-offset key updates display text directly", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.min = "0";
		slider.max = "120";
		slider.value = "10";
		const display = document.createElement("span");
		display.className = "setting-value";
		display.textContent = "10";
		row.appendChild(slider);
		row.appendChild(display);

		(sv as any)._resetSlider(row, 5, "motionTimeout");
		expect(display.textContent).toBe("5");
		expect((sv as any)._overrides.motionTimeout).toBe(5);
	});

	it("resetSlider marks _localDirty so the save button enables on next render", () => {
		const sv = createView();
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.value = "10";
		const display = document.createElement("span");
		display.className = "setting-value";
		display.textContent = "10";
		row.appendChild(slider);
		row.appendChild(display);

		(sv as any)._resetSlider(row, 5, "motionTimeout");
		expect((sv as any)._localDirty).toBe(true);
	});

	it("_resetSlider with offset key where display has NaN content skips adjusted display", () => {
		// When display.textContent is not a number, it should fall through without crashing
		const sv = createView({ illuminanceOffset: 5 });
		const row = document.createElement("div");
		row.className = "setting-row";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "setting-range";
		slider.min = "-500";
		slider.max = "500";
		slider.value = "5";
		slider.dataset.offsetKey = "illuminance";
		slider.dataset.precision = "1";
		slider.dataset.displayMin = "0";
		slider.dataset.displayMax = "Infinity";
		const display = document.createElement("span");
		display.className = "setting-value";
		display.textContent = "\u2014"; // dash (NaN when parsed)
		row.appendChild(slider);
		row.appendChild(display);

		// Should not throw even if NaN; the if (!Number.isNaN) guard skips adjusted display
		expect(() => (sv as any)._resetSlider(row, 0)).not.toThrow();
	});

	it("sensitivity slider input updates setting-value when a wrapper is inserted between them", () => {
		// Same regression as Item 10 but for one of the non-env sliders. Insert
		// a wrapper between the slider and its `.setting-value` and verify the
		// handler still resolves the value span via the parent.
		const sv = createView({ motionTimeout: 5 });
		const tpl = (sv as any).renderSensitivities();
		const c = renderTo(tpl);

		// Use the motion timeout slider — first .setting-range.
		const slider = c.querySelector(".setting-range") as HTMLInputElement;
		const valueSpan = slider.parentElement?.querySelector(
			".setting-value",
		) as HTMLElement;
		expect(slider).not.toBeNull();
		expect(valueSpan).not.toBeNull();

		const wrapper = document.createElement("span");
		wrapper.className = "extra-wrapper";
		slider.parentNode?.insertBefore(wrapper, slider.nextSibling);
		expect(slider.nextElementSibling).toBe(wrapper);

		slider.value = "20";
		expect(() => slider.dispatchEvent(new Event("input"))).not.toThrow();

		expect(valueSpan.textContent).toBe("20");
		expect(wrapper.textContent).toBe("");
		document.body.removeChild(c);
	});

	it("slider input still updates setting-value when a wrapper is inserted between them", () => {
		// Item 10 regression: the @input handlers used `el.nextElementSibling!`
		// which was the immediate next sibling. If the markup ever inserts a
		// wrapper or icon between the slider and its `.setting-value` span, the
		// non-null assertion fires on a wrong (or absent) element. The handler
		// must locate `.setting-value` via the parent so it stays robust.
		const sv = createView({ illuminanceOffset: 0 });
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: 100, // raw=100
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			() => sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const slider = c.querySelector(".setting-range") as HTMLInputElement;
		const valueSpan = c.querySelector(".setting-value") as HTMLElement;
		expect(slider).not.toBeNull();
		expect(valueSpan).not.toBeNull();

		// Insert a wrapper element between slider and the .setting-value so
		// `nextElementSibling` is no longer the value span.
		const wrapper = document.createElement("span");
		wrapper.className = "extra-wrapper";
		slider.parentNode?.insertBefore(wrapper, slider.nextSibling);
		expect(slider.nextElementSibling).toBe(wrapper);

		slider.value = "5";
		expect(() => slider.dispatchEvent(new Event("input"))).not.toThrow();

		// .setting-value (raw=100, offset=5 → 105.0) should still be updated,
		// not the wrapper.
		expect(valueSpan.textContent).toBe("105.0");
		expect(wrapper.textContent).toBe("");
		document.body.removeChild(c);
	});

	it("_resetSlider on env offset preserves em dash when no live reading", () => {
		// Item 12 regression: when sensorState.illuminance is null the display
		// shows "\u2014". Clicking reset previously fell through to the else branch
		// and overwrote the em dash with "0", losing the "no live reading" hint.
		const sv = createView();
		sv.sensorState = {
			occupancy: false,
			static_presence: false,
			motion_presence: false,
			target_presence: false,
			illuminance: null, // no live reading
			temperature: null,
			humidity: null,
			co2: null,
		};
		const tpl = (sv as any).renderEnvOffset(
			"Illuminance",
			() => sv.sensorState.illuminance,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			1,
			"Tip",
			0,
		);
		const c = renderTo(tpl);
		const valueSpan = c.querySelector(".setting-value")!;
		expect(valueSpan.textContent).toBe("\u2014");

		const row = c.querySelector(".setting-row") as HTMLElement;
		(sv as any)._resetSlider(row, 0);

		// The display should still show the em dash, not "0".
		expect(valueSpan.textContent).toBe("\u2014");
		// Reset still records the offset override so save persists 0.
		expect((sv as any)._overrides.illuminanceOffset).toBe(0);
		document.body.removeChild(c);
	});
});

describe("_setText edge case", () => {
	it("falls back to textContent when no text node exists", () => {
		const sv = createView();
		const el = document.createElement("span");
		// No text nodes — create only element child
		const child = document.createElement("b");
		el.appendChild(child);

		(sv as any)._setText(el, "hello");
		// Since no TEXT_NODE found, falls back to el.textContent
		expect(el.textContent).toBe("hello");
	});
});

// Tooltip toggle, a11y and listener-cleanup behavior moved to the shared
// <epp-info-tip> component; see epp-info-tip.test.ts for that coverage.

describe("target auto range toggle (checked=true branch)", () => {
	it("target auto toggle turning ON does not fire targetMaxDistance change", () => {
		const sv = createView({ targetAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const toggles = c.querySelectorAll("epp-toggle");
		// First epp-toggle = target auto
		const toggle = toggles[0] as HTMLElement;
		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: true },
				bubbles: true,
			}),
		);

		// targetMaxDistance should NOT be in events (only fired when !checked)
		expect(events.some((e) => e.key === "targetMaxDistance")).toBe(false);
		expect(events.some((e) => e.key === "targetAutoDistance")).toBe(true);
		document.body.removeChild(c);
	});

	it("static auto toggle turning ON does not fire staticMinDistance/staticMaxDistance change", () => {
		const sv = createView({ staticAutoDistance: false });
		const tpl = (sv as any).renderDetectionRanges();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const toggles = c.querySelectorAll("epp-toggle");
		// Second epp-toggle = static auto
		const toggle = toggles[1] as HTMLElement;
		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: true },
				bubbles: true,
			}),
		);

		expect(events.some((e) => e.key === "staticMinDistance")).toBe(false);
		expect(events.some((e) => e.key === "staticAutoDistance")).toBe(true);
		document.body.removeChild(c);
	});
});

describe("renderRelay() @selected handlers", () => {
	it("changing trigger mode select updates _overrides and fires setting-change + dirty", () => {
		const sv = createView({ relayTriggerMode: "disabled" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);
		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBeGreaterThan(0);
		const triggerSelect = selects[0] as HTMLElement;
		triggerSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "motion" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.relayTriggerMode).toBe("motion");
		expect(
			events.some((e) => e.key === "relayTriggerMode" && e.value === "motion"),
		).toBe(true);
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("trigger mode select ignores empty value (early return)", () => {
		const sv = createView({ relayTriggerMode: "disabled" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const events: any[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const triggerSelect = c.querySelectorAll("ha-select")[0] as HTMLElement;
		triggerSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.relayTriggerMode).toBeUndefined();
		expect(events.length).toBe(0);
		document.body.removeChild(c);
	});

	it("trigger mode select ignores same value (no-change early return)", () => {
		const sv = createView({ relayTriggerMode: "motion" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const events: any[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const triggerSelect = c.querySelectorAll("ha-select")[0] as HTMLElement;
		triggerSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "motion" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.relayTriggerMode).toBeUndefined();
		expect(events.length).toBe(0);
		document.body.removeChild(c);
	});

	it("changing contact mode select updates _overrides and fires setting-change + dirty", () => {
		// isAutomatic = true requires trigger !== "disabled" && !== "manual"
		const sv = createView({
			relayTriggerMode: "motion",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const events: { key: string; value: unknown }[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);
		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const selects = c.querySelectorAll("ha-select");
		// Two selects: trigger + contact
		expect(selects.length).toBe(2);
		const contactSelect = selects[1] as HTMLElement;
		contactSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "nc" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.relayContactMode).toBe("nc");
		expect(
			events.some((e) => e.key === "relayContactMode" && e.value === "nc"),
		).toBe(true);
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("contact mode select ignores empty value (early return)", () => {
		const sv = createView({
			relayTriggerMode: "presence",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const events: any[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const selects = c.querySelectorAll("ha-select");
		const contactSelect = selects[1] as HTMLElement;
		contactSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.relayContactMode).toBeUndefined();
		expect(events.length).toBe(0);
		document.body.removeChild(c);
	});

	it("contact mode select ignores same value (no-change early return)", () => {
		const sv = createView({
			relayTriggerMode: "presence",
			relayContactMode: "nc",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const events: any[] = [];
		sv.addEventListener("setting-change", ((e: CustomEvent) => {
			events.push(e.detail);
		}) as EventListener);

		const selects = c.querySelectorAll("ha-select");
		const contactSelect = selects[1] as HTMLElement;
		contactSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "nc" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.relayContactMode).toBeUndefined();
		expect(events.length).toBe(0);
		document.body.removeChild(c);
	});

	it("contact mode select is not rendered when trigger is disabled", () => {
		const sv = createView({ relayTriggerMode: "disabled" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBe(1);
		document.body.removeChild(c);
	});

	it("@closed on trigger select stops propagation", () => {
		const sv = createView({ relayTriggerMode: "disabled" });
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const triggerSelect = c.querySelectorAll("ha-select")[0] as HTMLElement;
		const closedEvent = new Event("closed", { bubbles: true });
		const stopSpy = vi.spyOn(closedEvent, "stopPropagation");
		triggerSelect.dispatchEvent(closedEvent);

		expect(stopSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});

	it("@closed on contact mode select stops propagation", () => {
		// isAutomatic=true so both selects are rendered
		const sv = createView({
			relayTriggerMode: "motion",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBe(2);
		const contactSelect = selects[1] as HTMLElement;
		const closedEvent = new Event("closed", { bubbles: true });
		const stopSpy = vi.spyOn(closedEvent, "stopPropagation");
		contactSelect.dispatchEvent(closedEvent);

		expect(stopSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("_fireDirty marks _localDirty and emits dirty event", () => {
	it("sets _localDirty so save-btn enables via the next render pass", () => {
		const sv = createView();
		const events: Event[] = [];
		sv.addEventListener("dirty", (e) => events.push(e));
		(sv as any)._fireDirty();
		expect((sv as any)._localDirty).toBe(true);
		expect(events.length).toBe(1);
	});
});

describe("logging accordion", () => {
	it("renders logging section in accordion list", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		const headers = c.querySelectorAll(".accordion-header");
		const titles = [...headers].map(
			(h) => h.querySelector(".accordion-title")?.textContent,
		);
		expect(titles).toContain("settings.logging");
		document.body.removeChild(c);
	});

	it("renders every log level row when open, including BLE and CO2", () => {
		// BLE and CO2 are no longer gated on device build flags, so all six
		// categories appear together regardless of what hardware is fitted.
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: {
				system: "Warning",
				epp: "Warning",
				led: "Warning",
				networking: "Warning",
			},
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const labels = c.querySelectorAll(".setting-row label");
		const texts = [...labels].map((l) => l.textContent);
		expect(texts).toContain("settings.log_system");
		expect(texts).toContain("settings.log_epp");
		expect(texts).toContain("settings.log_led");
		expect(texts).toContain("settings.log_networking");
		expect(texts).toContain("settings.log_ble");
		expect(texts).toContain("settings.log_co2");
		document.body.removeChild(c);
	});

	it("always shows the CO2 row regardless of device hardware", async () => {
		const sv = createView({
			openAccordions: new Set(["logging"]),
			logLevels: {},
		});
		document.body.appendChild(sv);
		await sv.updateComplete;
		const body = sv.shadowRoot!.querySelector(".accordion-body");
		const labels = Array.from(body!.querySelectorAll(".setting-row label")).map(
			(l) => l.textContent,
		);
		expect(labels).toContain("settings.log_co2");
		document.body.removeChild(sv);
	});

	it("marks dirty when dropdown changes", () => {
		const sv = createView({
			logLevels: { system: "Warning" },
		});

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		// Mock shadowRoot for _fireDirty
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelector: () => null,
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		const tpl = (sv as any).renderLogging();
		const c = renderTo(tpl);

		// Find the ha-select and simulate a selected event with detail.value
		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBeGreaterThan(0);
		const select = selects[0] as any;
		select.dispatchEvent(
			new CustomEvent("selected", {
				bubbles: true,
				detail: { value: "Debug" },
			}),
		);

		expect(dirtyFired).toBe(true);
		expect((sv as any)._overrides.logLevels?.system).toBe("Debug");
		document.body.removeChild(c);
	});

	it("includes log_levels in save payload", () => {
		const sv = createView({
			dirty: true,
			logLevels: { system: "Warning", epp: "Info" },
		});
		// Set an override for one category
		(sv as any)._overrides.logLevels = { system: "Debug" };

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.log_levels).toBeDefined();
		expect(payload.log_levels.system).toBe("Debug"); // override wins
		expect(payload.log_levels.epp).toBe("Info"); // original preserved
	});

	it("reset button sets dropdown to None", () => {
		const sv = createView({
			logLevels: { system: "Debug" },
		});

		// Mock shadowRoot for _fireDirty
		Object.defineProperty(sv, "shadowRoot", {
			value: {
				querySelector: () => null,
				querySelectorAll: () => [],
			},
			configurable: true,
		});

		const requestUpdateSpy = vi.spyOn(sv, "requestUpdate");

		const tpl = (sv as any).renderLogging();
		const c = renderTo(tpl);

		// Find the reset button (mdi:restart icon)
		const resetBtns = c.querySelectorAll(".setting-info");
		// First .setting-info in each row is the reset button
		expect(resetBtns.length).toBeGreaterThan(0);
		(resetBtns[0] as HTMLElement).click();

		expect((sv as any)._overrides.logLevels?.system).toBe("None");
		expect(requestUpdateSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});

	it("log level @closed handler stops propagation", () => {
		const sv = createView({ logLevels: { system: "Warning" } });
		const tpl = (sv as any).renderLogging();
		const c = renderTo(tpl);

		const select = c.querySelectorAll("ha-select")[0] as HTMLElement;
		const closedEvent = new Event("closed", { bubbles: true });
		const stopSpy = vi.spyOn(closedEvent, "stopPropagation");
		select.dispatchEvent(closedEvent);

		expect(stopSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("LED settings section", () => {
	it("renders LED accordion", () => {
		const sv = createView({ openAccordions: new Set(["led_relay"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const body = c.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		expect(body!.querySelector("epp-card")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("renders 5 accordions including LED and relay", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelectorAll(".accordion").length).toBe(5);
		document.body.removeChild(c);
	});

	it("renders brightness slider in LED section", () => {
		const sv = createView({
			openAccordions: new Set(["led_relay"]),
			ledMode: "Presence",
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const slider = c.querySelector(
			'input[type="range"][data-led-brightness]',
		) as HTMLInputElement;
		expect(slider).not.toBeNull();
		expect(slider.min).toBe("0.1");
		expect(slider.max).toBe("1");
		expect(slider.step).toBe("0.05");
		document.body.removeChild(c);
	});

	it("renders color picker in LED section when mode is Presence", () => {
		const sv = createView({
			openAccordions: new Set(["led_relay"]),
			ledMode: "Presence",
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const picker = c.querySelector('input[type="color"]') as HTMLInputElement;
		expect(picker).not.toBeNull();
		expect(picker.value).toBe("#cc33ff");
		document.body.removeChild(c);
	});

	it("hides environmental modes when co2 disabled", () => {
		const sv = createView({
			openAccordions: new Set(["led_relay"]),
			co2Enabled: false,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select.wide-select") as any;
		expect(select).not.toBeNull();
		const values = (select.options as { value: string }[]).map(
			(o: { value: string }) => o.value,
		);
		expect(values).not.toContain("Environmental");
		expect(values).not.toContain("Environmental + Presence");
		document.body.removeChild(c);
	});

	it("shows environmental modes when co2 enabled", () => {
		const sv = createView({
			openAccordions: new Set(["led_relay"]),
			co2Enabled: true,
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select.wide-select") as any;
		expect(select).not.toBeNull();
		const values = (select.options as { value: string }[]).map(
			(o: { value: string }) => o.value,
		);
		expect(values).toContain("Environmental");
		expect(values).toContain("Environmental + Presence");
		document.body.removeChild(c);
	});

	it("hides color picker when mode is not Presence-related", () => {
		const sv = createView({
			openAccordions: new Set(["led_relay"]),
			ledMode: "Manual Control",
		});
		const tpl = sv.render();
		const c = renderTo(tpl);

		const picker = c.querySelector('input[type="color"]');
		expect(picker).toBeNull();
		document.body.removeChild(c);
	});
});

describe("renderLed() event handlers", () => {
	it("led mode @selected handler updates _overrides.ledMode and fires dirty", () => {
		const sv = createView({ ledMode: "Manual Control" });
		const tpl = (sv as any).renderLed();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const ledSelect = c.querySelector("ha-select.wide-select") as HTMLElement;
		expect(ledSelect).not.toBeNull();
		ledSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "Presence" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.ledMode).toBe("Presence");
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("led mode @selected handler ignores empty value", () => {
		const sv = createView({ ledMode: "Manual Control" });
		const tpl = (sv as any).renderLed();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const ledSelect = c.querySelector("ha-select.wide-select") as HTMLElement;
		ledSelect.dispatchEvent(
			new CustomEvent("selected", {
				detail: { value: "" },
				bubbles: true,
			}),
		);

		expect((sv as any)._overrides.ledMode).toBeUndefined();
		expect(dirtyFired).toBe(false);
		document.body.removeChild(c);
	});

	it("brightness slider @input handler updates _overrides.ledBrightness and fires dirty", () => {
		const sv = createView({ ledBrightness: 1.0, ledMode: "Presence" });
		const tpl = (sv as any).renderLed();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const slider = c.querySelector(
			'input[type="range"][data-led-brightness]',
		) as HTMLInputElement;
		expect(slider).not.toBeNull();

		// Add a sibling span for _setText to update
		const display = document.createElement("span");
		display.className = "setting-value";
		display.textContent = "100%";
		slider.parentNode?.insertBefore(display, slider.nextSibling);

		slider.value = "0.5";
		slider.dispatchEvent(new Event("input"));

		expect((sv as any)._overrides.ledBrightness).toBe(0.5);
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("color picker @input handler updates _overrides.ledPresenceColor and fires dirty", () => {
		// Need Presence mode so color picker is rendered
		const sv = createView({ ledMode: "Presence", ledPresenceColor: "#CC33FF" });
		const tpl = (sv as any).renderLed();
		const c = renderTo(tpl);

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		const picker = c.querySelector('input[type="color"]') as HTMLInputElement;
		expect(picker).not.toBeNull();
		picker.value = "#ff0000";
		picker.dispatchEvent(new Event("input"));

		expect((sv as any)._overrides.ledPresenceColor).toBe("#ff0000");
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("led mode @closed handler stops propagation", () => {
		const sv = createView({ ledMode: "Manual Control" });
		const tpl = (sv as any).renderLed();
		const c = renderTo(tpl);

		const ledSelect = c.querySelector("ha-select.wide-select") as HTMLElement;
		const closedEvent = new Event("closed", { bubbles: true });
		const stopSpy = vi.spyOn(closedEvent, "stopPropagation");
		ledSelect.dispatchEvent(closedEvent);

		expect(stopSpy).toHaveBeenCalled();
		document.body.removeChild(c);
	});
});

describe("LED save payload", () => {
	it("includes LED settings in save event", () => {
		const sv = createView({
			dirty: true,
			ledMode: "Presence",
			ledBrightness: 0.7,
			ledPresenceColor: "#00FF00",
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload.led_mode).toBe("Presence");
		expect(payload.led_brightness).toBe(0.7);
		expect(payload.led_presence_color).toBe("#00FF00");
	});

	it("uses LED defaults when not overridden", () => {
		const sv = createView({ dirty: true });

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload.led_mode).toBe("Manual Control");
		expect(payload.led_brightness).toBe(1.0);
		expect(payload.led_presence_color).toBe("#CC33FF");
	});
});

describe("relay section", () => {
	it("renders settings container with 5 accordions including relay", () => {
		const sv = createView();
		const tpl = sv.render();
		const c = renderTo(tpl);

		expect(c.querySelector(".settings-container")).not.toBeNull();
		expect(c.querySelectorAll(".accordion").length).toBe(5);
		document.body.removeChild(c);
	});

	it("renders relay section when accordion is open", () => {
		const sv = createView({ openAccordions: new Set(["led_relay"]) });
		const tpl = sv.render();
		const c = renderTo(tpl);

		const body = c.querySelector(".accordion-body");
		expect(body).not.toBeNull();
		document.body.removeChild(c);
	});

	it("hides contact mode when trigger is disabled", () => {
		const sv = createView({
			relayTriggerMode: "disabled",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(1);
		document.body.removeChild(c);
	});

	it("shows contact mode when trigger is an automatic mode", () => {
		const sv = createView({
			relayTriggerMode: "motion",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(2);
		document.body.removeChild(c);
	});

	it("contact mode select is visible when trigger is presence", () => {
		const sv = createView({
			relayTriggerMode: "presence",
			relayContactMode: "nc",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(2);
		document.body.removeChild(c);
	});

	it("contact mode select is visible when trigger is occupancy", () => {
		const sv = createView({
			relayTriggerMode: "occupancy",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		expect(rows.length).toBe(2);
		document.body.removeChild(c);
	});

	it("trigger mode row exposes an info tooltip", () => {
		const sv = createView();
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		const triggerInfoBtn = rows[0].querySelector("epp-info-tip");
		expect(triggerInfoBtn).not.toBeNull();
		document.body.removeChild(c);
	});

	it("contact mode row exposes an info tooltip", () => {
		const sv = createView({
			relayTriggerMode: "motion",
			relayContactMode: "no",
		});
		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const rows = c.querySelectorAll(".setting-row");
		const contactInfoBtn = rows[1].querySelector("epp-info-tip");
		expect(contactInfoBtn).not.toBeNull();
		document.body.removeChild(c);
	});

	it("trigger mode select change updates overrides and fires dirty", () => {
		const sv = createView({
			relayTriggerMode: "disabled",
			relayContactMode: "no",
		});

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		Object.defineProperty(sv, "shadowRoot", {
			value: { querySelector: () => null, querySelectorAll: () => [] },
			configurable: true,
		});

		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBeGreaterThan(0);
		selects[0].dispatchEvent(
			new CustomEvent("selected", {
				bubbles: true,
				detail: { value: "motion" },
			}),
		);

		expect((sv as any)._overrides.relayTriggerMode).toBe("motion");
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("contact mode select change updates overrides and fires dirty", () => {
		const sv = createView({
			relayTriggerMode: "motion",
			relayContactMode: "no",
		});

		let dirtyFired = false;
		sv.addEventListener("dirty", () => {
			dirtyFired = true;
		});

		Object.defineProperty(sv, "shadowRoot", {
			value: { querySelector: () => null, querySelectorAll: () => [] },
			configurable: true,
		});

		const tpl = (sv as any).renderRelay();
		const c = renderTo(tpl);

		const selects = c.querySelectorAll("ha-select");
		expect(selects.length).toBe(2);
		selects[1].dispatchEvent(
			new CustomEvent("selected", { bubbles: true, detail: { value: "nc" } }),
		);

		expect((sv as any)._overrides.relayContactMode).toBe("nc");
		expect(dirtyFired).toBe(true);
		document.body.removeChild(c);
	});

	it("includes relay keys in save event payload", () => {
		const sv = createView({
			dirty: true,
			relayTriggerMode: "motion",
			relayContactMode: "nc",
		});

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload).not.toBeNull();
		expect(payload.relay_trigger_mode).toBe("motion");
		expect(payload.relay_contact_mode).toBe("nc");
	});

	it("relay save payload uses override values when set", () => {
		const sv = createView({
			dirty: true,
			relayTriggerMode: "disabled",
			relayContactMode: "no",
		});
		(sv as any)._overrides.relayTriggerMode = "presence";
		(sv as any)._overrides.relayContactMode = "nc";

		let payload: any = null;
		sv.addEventListener("save", ((e: CustomEvent) => {
			payload = e.detail;
		}) as EventListener);

		(sv as any)._emitSave();

		expect(payload.relay_trigger_mode).toBe("presence");
		expect(payload.relay_contact_mode).toBe("nc");
	});

	it("emitSave includes rate settings from overrides", () => {
		const sv = createView({ dirty: true });
		(sv as any)._overrides = {
			targetUpdateRateMs: 500,
			zoneUpdateRateMs: 2000,
		};
		let detail: any;
		sv.addEventListener("save", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);
		(sv as any)._emitSave();
		expect(detail.target_update_rate_ms).toBe(500);
		expect(detail.zone_update_rate_ms).toBe(2000);
	});

	it("emitSave includes default rate settings when no overrides", () => {
		const sv = createView({ dirty: true });
		let detail: any;
		sv.addEventListener("save", ((e: CustomEvent) => {
			detail = e.detail;
		}) as EventListener);
		(sv as any)._emitSave();
		expect(detail.target_update_rate_ms).toBe(1000);
		expect(detail.zone_update_rate_ms).toBe(1000);
	});
});

describe("epp-settings-view localization (tasks 13-15)", () => {
	it("does not contain hardcoded 'Reset to default' strings outside translation keys", () => {
		const { readFileSync } = require("node:fs");
		const { join } = require("node:path");
		const src = readFileSync(
			join(__dirname, "..", "..", "components", "epp-settings-view.ts"),
			"utf8",
		);
		expect(src).not.toMatch(/aria-label="Reset to default"/);
		expect(src).not.toMatch(/title="Reset to default"/);
		expect(src).not.toMatch(/aria-label="Show info"/);
		expect(src).not.toMatch(/title="Show info"/);
	});

	it("uses localize() for frequency labels", () => {
		const { readFileSync } = require("node:fs");
		const { join } = require("node:path");
		const src = readFileSync(
			join(__dirname, "..", "..", "components", "epp-settings-view.ts"),
			"utf8",
		);
		expect(src).toMatch(/settings\.frequency\.5hz/);
		expect(src).toMatch(/settings\.frequency\.2hz/);
		expect(src).toMatch(/settings\.frequency\.1hz/);
		expect(src).toMatch(/settings\.frequency\.0_5hz/);
		expect(src).not.toMatch(/label:\s*"5 Hz"/);
	});

	it("uses localize() for log level labels but keeps English wire values", () => {
		const { readFileSync } = require("node:fs");
		const { join } = require("node:path");
		const src = readFileSync(
			join(__dirname, "..", "..", "components", "epp-settings-view.ts"),
			"utf8",
		);
		expect(src).toMatch(/settings\.log_level\.\$\{.*toLowerCase\(\)\}/);
		// Wire values preserved
		expect(src).toMatch(
			/\["None",\s*"Error",\s*"Warning",\s*"Info",\s*"Debug"\]/,
		);
	});
});

describe("memoised select options (5Hz live stream perf)", () => {
	it("keeps rate-dropdown .options reference stable across live re-renders", async () => {
		const sv = createView({ openAccordions: new Set(["reporting"]) });
		document.body.appendChild(sv);
		await sv.updateComplete;

		const select = sv.shadowRoot!.querySelector("ha-select") as any;
		const before = select.options;
		expect(Array.isArray(before)).toBe(true);

		// Simulate a 5Hz sensor tick: new sensorState object, same values.
		sv.sensorState = { ...sv.sensorState };
		await sv.updateComplete;

		expect((sv.shadowRoot!.querySelector("ha-select") as any).options).toBe(
			before,
		);
		document.body.removeChild(sv);
	});

	it("keeps log-level .options reference stable across live re-renders", async () => {
		const sv = createView({ openAccordions: new Set(["logging"]) });
		document.body.appendChild(sv);
		await sv.updateComplete;

		const select = sv.shadowRoot!.querySelector("ha-select") as any;
		const before = select.options;
		expect(Array.isArray(before)).toBe(true);

		sv.sensorState = { ...sv.sensorState };
		await sv.updateComplete;

		expect((sv.shadowRoot!.querySelector("ha-select") as any).options).toBe(
			before,
		);
		document.body.removeChild(sv);
	});

	it("rebuilds option arrays when localize changes", async () => {
		const sv = createView({ openAccordions: new Set(["reporting"]) });
		document.body.appendChild(sv);
		await sv.updateComplete;
		const before = (sv.shadowRoot!.querySelector("ha-select") as any).options;

		sv.localize = setupLocalize({ language: "es" });
		await sv.updateComplete;

		expect((sv.shadowRoot!.querySelector("ha-select") as any).options).not.toBe(
			before,
		);
		document.body.removeChild(sv);
	});
});

describe("cached room geometry (5Hz live stream perf)", () => {
	it("returns the same geometry object until grid/perspective/dims change", () => {
		const sv = createView() as any;
		const g1 = sv._getGeometry();
		expect(sv._getGeometry()).toBe(g1);
		expect(g1.autoRange).toBeGreaterThan(0);
		expect(g1.metrics).not.toBeNull();

		// New grid reference invalidates the cache.
		sv.grid = initGridFromRoom(4000, 5000);
		const g2 = sv._getGeometry();
		expect(g2).not.toBe(g1);
		// And the result is recomputed for the new room footprint.
		expect(sv._getGeometry()).toBe(g2);
	});
});

describe("desktop max-width centering", () => {
	it("settings content caps width via --epp-content-max token and centers on desktop", () => {
		const cssText = (EppSettingsView as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.join("\n");
		expect(cssText).toContain("max-width: var(--epp-content-max");
		expect(cssText).toContain("margin: 0 auto");
	});

	it("bounds the view at all widths so the list scrolls + Save/Cancel pins", () => {
		// The accordion list scrolls inside .settings-scroll while the Save/Cancel
		// bar pins to the bottom — fed by the bounded .panel--settings host. This
		// moved from a mobile-only @media to the base so it applies on desktop too.
		// Guarded via cssText (happy-dom has no layout).
		const cssText = (EppSettingsView as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.join("\n");
		const scroll = cssText.slice(
			cssText.indexOf(".settings-scroll {"),
			cssText.indexOf("}", cssText.indexOf(".settings-scroll {")),
		);
		expect(scroll).toMatch(/overflow-y:\s*auto/);
		expect(scroll).toMatch(/flex:\s*1/);
		// flex-shrink lives in this view's local .save-cancel-bar delta; the shared
		// saveCancelBarStyles const adds a second .save-cancel-bar block (chrome only),
		// so match against the composed cssText rather than the first block slice.
		expect(cssText).toMatch(/\.save-cancel-bar\s*{[^}]*flex-shrink:\s*0/);
		// Unconditional now — the stylesheet that defines the scroll/pin must not
		// gate them behind the mobile breakpoint. (Other stylesheets — e.g.
		// settingStyles' slider-row label wrap — may legitimately use @media, so
		// guard the scroll/pin sheet specifically rather than the whole cssText.)
		const scrollPinSheet = (EppSettingsView as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.find((c: string) => c.includes(".settings-scroll {"));
		expect(scrollPinSheet).toBeDefined();
		expect(scrollPinSheet).not.toContain("@media (max-width: 819px)");
	});

	it("stacks slider-row labels above the control on mobile so the slider can't overlap the label", () => {
		// On narrow screens the right-aligned .setting-input-unit (slider + value +
		// unit) overflowed LEFT over the label text. A mobile breakpoint drops the
		// slider-row label onto its own full-width line so the control wraps below
		// it. Scoped via :has(.setting-range) — toggle/select rows stay on one line.
		// (happy-dom has no layout; guard the CSS rule + its cascade context.)
		const cssText = (EppSettingsView as any).styles
			.map((s: { cssText?: string }) => s.cssText ?? String(s))
			.join("\n");
		// Anchor on the mobile media block, then assert the scoped selector sets
		// flex-basis:100% anywhere within its own rule body ([^}]* stops at the
		// rule's closing brace) — non-positional so adding another declaration
		// before flex-basis later doesn't fail this spuriously.
		const mobile = cssText.slice(cssText.indexOf("@media (max-width: 819px)"));
		expect(mobile).toMatch(
			/\.setting-row:has\(\.setting-range\) label:not\(\.toggle-switch\) {[^}]*flex-basis:\s*100%/,
		);
	});
});
