import { describe, expect, it } from "vitest";
import "../../components/epp-live-sidebar.js";
import type { EppLiveSidebar } from "../../components/epp-live-sidebar.js";

function sensors() {
	return {
		occupancy: true,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		mmwave: false,
		illuminance: 100,
		temperature: 22,
		humidity: 50,
		co2: 400,
	};
}

async function mount(props: Partial<EppLiveSidebar>): Promise<EppLiveSidebar> {
	const el = document.createElement("epp-live-sidebar") as EppLiveSidebar;
	el.sensorState = sensors() as any;
	el.zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 } as any;
	el.hasPerspective = true;
	Object.assign(el, props);
	document.body.appendChild(el);
	await el.updateComplete;
	return el;
}

function headers(el: EppLiveSidebar): string[] {
	return [...el.shadowRoot!.querySelectorAll(".live-section-header")].map((n) =>
		(n.textContent ?? "").trim(),
	);
}

describe("epp-live-sidebar visibility props", () => {
	it("shows presence, zones, environment by default", async () => {
		const el = await mount({});
		expect(headers(el).length).toBeGreaterThanOrEqual(3);
	});

	it("hides the presence section when presenceKeys is empty array", async () => {
		const el = await mount({ presenceKeys: [] });
		// The presence section header is gone entirely.
		expect(headers(el)).not.toContain("live.presence");
		// All five presence sensor labels are gone (default localize returns
		// the raw translation key, so we assert against those keys).
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		for (const presenceKey of [
			"live.occupancy",
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).not.toContain(presenceKey);
		}
	});

	it("shows only the occupancy row when presenceKeys is ['occupancy']", async () => {
		const el = await mount({ presenceKeys: ["occupancy"] });
		// The presence section header must still show.
		expect(headers(el)).toContain("live.presence");
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		// occupancy row must be present
		expect(labels).toContain("live.occupancy");
		// the other four presence rows must NOT be present
		for (const presenceKey of [
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).not.toContain(presenceKey);
		}
	});

	it("shows all five presence rows when presenceKeys is null (default)", async () => {
		const el = await mount({ presenceKeys: null });
		expect(headers(el)).toContain("live.presence");
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		for (const presenceKey of [
			"live.occupancy",
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).toContain(presenceKey);
		}
	});

	it("hides the zones section when showZones is false", async () => {
		const el = await mount({ showZones: false });
		// With presence + environment still on, exactly two headers remain.
		expect(headers(el)).toEqual(["live.presence", "live.environment"]);
		expect(headers(el)).not.toContain("sidebar.detection_zones");
	});

	it("hides the zones section when hasPerspective is false even with showZones true", async () => {
		// showZones && hasPerspective gate: no perspective => no zone section.
		const el = await mount({ hasPerspective: false, showZones: true });
		expect(headers(el)).not.toContain("sidebar.detection_zones");
		// No zone-header link, and no rest-of-room / zone rows rendered.
		expect(el.shadowRoot!.querySelector("button.live-section-link")).toBeNull();
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		expect(labels).not.toContain("sidebar.rest_of_room");
	});

	it("filters environment to envKeys", async () => {
		const el = await mount({ envKeys: ["temperature"] });
		const values = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-value"),
		].map((n) => n.textContent ?? "");
		expect(values.length).toBe(1);
	});

	it("renders the zone header as a plain label (no button) when interactive is false", async () => {
		const el = await mount({ interactive: false });
		expect(el.shadowRoot!.querySelector("button.live-section-link")).toBeNull();
		// The zone section content must still render (non-interactive branch
		// must keep zoneDefs.map — dropping it would be a regression). The
		// rest-of-room row is the zone-specific row that proves it.
		expect(headers(el)).toContain("sidebar.detection_zones");
		const labels = [
			...el.shadowRoot!.querySelectorAll(".live-sensor-label"),
		].map((n) => (n.textContent ?? "").trim());
		expect(labels).toContain("sidebar.rest_of_room");
		expect(
			el.shadowRoot!.querySelectorAll(".live-sensor-row").length,
		).toBeGreaterThan(0);
	});
});

describe("epp-live-sidebar hardware capability gating", () => {
	const rowLabels = (el: EppLiveSidebar): string[] =>
		[...el.shadowRoot!.querySelectorAll(".live-sensor-label")].map((n) =>
			(n.textContent ?? "").trim(),
		);

	it("shows both presence rows when the board has both sensors", async () => {
		const el = await mount({});
		expect(rowLabels(el)).toContain("live.static_presence");
		expect(rowLabels(el)).toContain("live.motion_presence");
	});

	it("hides the static row on a board with no static radar", async () => {
		// The row is a boolean that defaults to false, so without gating it would
		// sit at "Clear" forever and read as a sensor that never triggers.
		const el = await mount({ capabilities: { has_static_presence: false } });
		expect(rowLabels(el)).not.toContain("live.static_presence");
		expect(rowLabels(el)).toContain("live.motion_presence");
	});

	it("hides the motion row on a board with no PIR", async () => {
		const el = await mount({ capabilities: { has_motion_presence: false } });
		expect(rowLabels(el)).not.toContain("live.motion_presence");
		expect(rowLabels(el)).toContain("live.static_presence");
	});

	it("keeps target and mmwave when only the static/motion sensors are absent", async () => {
		// A Pro reports has_target_presence / has_mmwave_presence (absent here →
		// treated as present), so those rows stay even with static/motion gated off.
		const el = await mount({
			capabilities: { has_static_presence: false, has_motion_presence: false },
		});
		const labels = rowLabels(el);
		expect(labels).toContain("live.occupancy");
		expect(labels).toContain("live.target_presence");
		expect(labels).toContain("live.mmwave");
	});

	it("hides the target-presence row when has_target_presence is false", async () => {
		const el = await mount({ capabilities: { has_target_presence: false } });
		expect(rowLabels(el)).not.toContain("live.target_presence");
		expect(rowLabels(el)).toContain("live.occupancy");
	});

	it("hides the mmwave row when has_mmwave_presence is false", async () => {
		const el = await mount({ capabilities: { has_mmwave_presence: false } });
		expect(rowLabels(el)).not.toContain("live.mmwave");
		expect(rowLabels(el)).toContain("live.occupancy");
	});

	it("leaves only Occupancy on a Lite (no static/motion/target/mmwave)", async () => {
		// The sensorless Lite reports all four false; Occupancy (from the zone
		// engine) is the one presence row that survives.
		const el = await mount({
			capabilities: {
				has_static_presence: false,
				has_motion_presence: false,
				has_target_presence: false,
				has_mmwave_presence: false,
			},
		});
		const labels = rowLabels(el);
		expect(labels).toContain("live.occupancy");
		for (const gone of [
			"live.static_presence",
			"live.motion_presence",
			"live.target_presence",
			"live.mmwave",
		]) {
			expect(labels).not.toContain(gone);
		}
	});

	it("shows everything when capabilities are absent", async () => {
		// Older firmware reports no has_* flags at all; a Pro must not lose rows.
		const el = await mount({ capabilities: {} });
		expect(rowLabels(el)).toContain("live.static_presence");
		expect(rowLabels(el)).toContain("live.motion_presence");
	});

	it("capability wins over an explicit presenceKeys request", async () => {
		// The card passes presenceKeys from its own config, which knows nothing
		// about the device — asking for a row the board lacks must not resurrect it.
		const el = await mount({
			capabilities: { has_static_presence: false },
			presenceKeys: ["occupancy", "static_presence"],
		});
		expect(rowLabels(el)).not.toContain("live.static_presence");
		expect(rowLabels(el)).toContain("live.occupancy");
	});
});

describe("epp-live-sidebar uncalibrated presence", () => {
	// A sensorless Lite has no static/motion sensor, so occupancy is purely
	// zone-derived and cannot work before room calibration — the target shows
	// on the FOV while occupancy stays Clear. Show the row as "not calibrated"
	// rather than a misleading Clear/Detected.
	function presenceState(
		el: EppLiveSidebar,
		label: string,
	): string | undefined {
		for (const row of el.shadowRoot!.querySelectorAll(".live-sensor-row")) {
			const lbl = (
				row.querySelector(".live-sensor-label")?.textContent ?? ""
			).trim();
			if (lbl === label)
				return (
					row.querySelector(".live-sensor-state")?.textContent ?? ""
				).trim();
		}
		return undefined;
	}

	const LITE = {
		has_static_presence: false,
		has_motion_presence: false,
		has_target_presence: false,
		has_mmwave_presence: false,
	};

	it("shows Occupancy as 'not calibrated' on an uncalibrated sensorless Lite", async () => {
		const el = await mount({ hasPerspective: false, capabilities: LITE });
		expect(presenceState(el, "live.occupancy")).toBe("live.not_calibrated");
	});

	it("shows the real occupancy state once the sensorless Lite is calibrated", async () => {
		const el = await mount({ hasPerspective: true, capabilities: LITE });
		// sensors().occupancy === true → detected, not the calibration notice
		expect(presenceState(el, "live.occupancy")).toBe("live.detected");
	});

	it("keeps real occupancy on an uncalibrated device that has a static sensor (Pro)", async () => {
		// The Pro's PIR drives occupancy without calibration, so it stays live.
		const el = await mount({
			hasPerspective: false,
			capabilities: { has_static_presence: true },
		});
		expect(presenceState(el, "live.occupancy")).toBe("live.detected");
	});

	function tipText(el: EppLiveSidebar, label: string): string | undefined {
		for (const row of el.shadowRoot!.querySelectorAll(".live-sensor-row")) {
			const lbl = (
				row.querySelector(".live-sensor-label")?.textContent ?? ""
			).trim();
			if (lbl === label)
				return (row.querySelector("epp-info-tip") as { text?: string } | null)
					?.text;
		}
		return undefined;
	}

	it("uses the Lite occupancy tooltip on a sensorless board", async () => {
		// The Lite has no PIR/static sensor, so the standard "PIR motion, static
		// mmWave presence" description is wrong — occupancy comes from tracking.
		const el = await mount({ capabilities: LITE });
		expect(tipText(el, "live.occupancy")).toBe("info.occupancy_lite");
	});

	it("uses the standard occupancy tooltip when the board has a sensor", async () => {
		const el = await mount({ capabilities: { has_static_presence: true } });
		expect(tipText(el, "live.occupancy")).toBe("info.occupancy");
	});
});
