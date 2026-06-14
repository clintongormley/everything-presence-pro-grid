import { describe, expect, it } from "vitest";
import {
	getZoneThresholds,
	resolveZoneParams,
	ZONE_COLORS,
	ZONE_PRESET_COLORS,
	ZONE_TYPE_DEFAULTS,
	type Zone0Config,
	type ZoneConfig,
} from "../zone-defaults.js";

describe("ZONE_TYPE_DEFAULTS", () => {
	it("has all four zone types", () => {
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("default");
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("bed");
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("seating");
		expect(ZONE_TYPE_DEFAULTS).toHaveProperty("transit");
	});

	it("each type has trigger, renew, timeout, handoff_timeout", () => {
		for (const type of ["default", "bed", "seating", "transit"]) {
			const d = ZONE_TYPE_DEFAULTS[type];
			expect(d.trigger).toBeTypeOf("number");
			expect(d.renew).toBeTypeOf("number");
			expect(d.timeout).toBeTypeOf("number");
			expect(d.handoff_timeout).toBeTypeOf("number");
		}
	});

	it("default type has expected defaults", () => {
		expect(ZONE_TYPE_DEFAULTS.default).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		});
	});

	it("bed type has expected defaults", () => {
		expect(ZONE_TYPE_DEFAULTS.bed).toEqual({
			trigger: 8,
			renew: 2,
			timeout: 600,
			handoff_timeout: 10,
		});
	});

	it("seating type has expected defaults", () => {
		expect(ZONE_TYPE_DEFAULTS.seating).toEqual({
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoff_timeout: 10,
		});
	});

	it("transit type has expected defaults", () => {
		expect(ZONE_TYPE_DEFAULTS.transit).toEqual({
			trigger: 3,
			renew: 2,
			timeout: 3,
			handoff_timeout: 1,
		});
	});
});

describe("ZONE_COLORS", () => {
	it("has 7 entries", () => {
		expect(ZONE_COLORS).toHaveLength(7);
	});

	it("all entries are hex color strings", () => {
		for (const color of ZONE_COLORS) {
			expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});
});

describe("getZoneThresholds", () => {
	const emptyConfigs: (ZoneConfig | null)[] = new Array(7).fill(null);

	it("zone 0 default: returns default defaults", () => {
		const result = getZoneThresholds(0, emptyConfigs, "default", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoffTimeout: 3,
		});
	});

	it("zone 0 custom: uses provided custom values", () => {
		const result = getZoneThresholds(0, emptyConfigs, "custom", 8, 2, 15, 5);
		expect(result).toEqual({
			trigger: 8,
			renew: 2,
			timeout: 15,
			handoffTimeout: 5,
		});
	});

	it("named zone with default type: returns default defaults", () => {
		const configs: (ZoneConfig | null)[] = [
			{
				name: "Zone 1",
				color: "#E69F00",
				type: "default",
			},
			...new Array(6).fill(null),
		];
		const result = getZoneThresholds(1, configs, "default", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoffTimeout: 3,
		});
	});

	it("named zone with custom type: uses custom overrides", () => {
		const configs: (ZoneConfig | null)[] = [
			null,
			{
				name: "Zone 2",
				color: "#009E73",
				type: "custom",
				trigger: 9,
				renew: 1,
				timeout: 60,
				handoff_timeout: 20,
			},
			...new Array(5).fill(null),
		];
		const result = getZoneThresholds(2, configs, "default", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 9,
			renew: 1,
			timeout: 60,
			handoffTimeout: 20,
		});
	});

	it("named zone with custom type: falls back to default defaults for undefined fields", () => {
		const configs: (ZoneConfig | null)[] = [
			{
				name: "Zone 1",
				color: "#E69F00",
				type: "custom",
				// No trigger, renew, timeout, handoff_timeout set
			},
			...new Array(6).fill(null),
		];
		const result = getZoneThresholds(1, configs, "default", 5, 3, 10, 3);
		// Falls back to ZONE_TYPE_DEFAULTS.default values
		expect(result.trigger).toBe(5);
		expect(result.renew).toBe(3);
		expect(result.timeout).toBe(10);
		expect(result.handoffTimeout).toBe(3);
	});

	it("null config for named zone: throws (engine must skip unconfigured zones)", () => {
		expect(() =>
			getZoneThresholds(3, emptyConfigs, "default", 5, 3, 10, 3),
		).toThrow(/zone 3 is not configured/);
	});

	it("out-of-range zone id: throws (engine must skip unconfigured zones)", () => {
		expect(() =>
			getZoneThresholds(99, emptyConfigs, "default", 5, 3, 10, 3),
		).toThrow(/zone 99 is not configured/);
	});

	it("clamps trigger/renew 0 to 1 (firmware clamp_threshold semantics)", () => {
		// Zone 0 custom with stored 0s: 0 is not "disabled" — it clamps to 1
		// so a single active frame triggers, mirroring the firmware.
		const room = getZoneThresholds(0, emptyConfigs, "custom", 0, 0, 10, 3);
		expect(room.trigger).toBe(1);
		expect(room.renew).toBe(1);

		const configs: (ZoneConfig | null)[] = [
			{
				name: "Zone 1",
				color: "#E69F00",
				type: "custom",
				trigger: 0,
				renew: 0,
				timeout: 5,
				handoff_timeout: 1,
			},
			...new Array(6).fill(null),
		];
		const named = getZoneThresholds(1, configs, "default", 5, 3, 10, 3);
		expect(named.trigger).toBe(1);
		expect(named.renew).toBe(1);
	});

	it("seating zone type: returns seating defaults", () => {
		const configs: (ZoneConfig | null)[] = [
			{
				name: "Bedroom",
				color: "#F0E442",
				type: "seating",
			},
			...new Array(6).fill(null),
		];
		const result = getZoneThresholds(1, configs, "default", 5, 3, 10, 3);
		expect(result).toEqual({
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoffTimeout: 10,
		});
	});
});

describe("resolveZoneParams", () => {
	it("non-custom type with no user fields: returns the type's defaults", () => {
		const z0: Zone0Config = { type: "seating" };
		expect(resolveZoneParams(z0)).toEqual({
			type: "seating",
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoff_timeout: 10,
		});
	});

	it("non-custom type with user fields set: IGNORES user fields, returns type defaults", () => {
		const z0: Zone0Config = {
			type: "seating",
			trigger: 1,
			renew: 9,
			timeout: 999,
			handoff_timeout: 42,
		};
		expect(resolveZoneParams(z0)).toEqual({
			type: "seating",
			trigger: 7,
			renew: 1,
			timeout: 30,
			handoff_timeout: 10,
		});
	});

	it("non-custom transit type: returns transit defaults", () => {
		const z0: Zone0Config = { type: "transit" };
		expect(resolveZoneParams(z0)).toEqual({
			type: "transit",
			trigger: 3,
			renew: 2,
			timeout: 3,
			handoff_timeout: 1,
		});
	});

	it("custom type with all user fields: returns user values", () => {
		const z0: Zone0Config = {
			type: "custom",
			trigger: 8,
			renew: 2,
			timeout: 15,
			handoff_timeout: 5,
		};
		expect(resolveZoneParams(z0)).toEqual({
			type: "custom",
			trigger: 8,
			renew: 2,
			timeout: 15,
			handoff_timeout: 5,
		});
	});

	it("custom type with partial user fields: missing fields fall back to default defaults", () => {
		const z0: Zone0Config = {
			type: "custom",
			trigger: 8,
			// renew, timeout, handoff_timeout unset
		};
		expect(resolveZoneParams(z0)).toEqual({
			type: "custom",
			trigger: 8,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		});
	});

	it("custom type with no user fields: all fields fall back to default defaults", () => {
		const z0: Zone0Config = { type: "custom" };
		expect(resolveZoneParams(z0)).toEqual({
			type: "custom",
			trigger: ZONE_TYPE_DEFAULTS.default.trigger,
			renew: ZONE_TYPE_DEFAULTS.default.renew,
			timeout: ZONE_TYPE_DEFAULTS.default.timeout,
			handoff_timeout: ZONE_TYPE_DEFAULTS.default.handoff_timeout,
		});
	});

	it("preserves the original zone type in the return value", () => {
		const z0: Zone0Config = { type: "default" };
		expect(resolveZoneParams(z0).type).toBe("default");
	});
});

describe("ZONE_PRESET_COLORS", () => {
	it("contains 13 valid hex colours", () => {
		expect(ZONE_PRESET_COLORS).toHaveLength(13);
		for (const c of ZONE_PRESET_COLORS) {
			expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("is a superset of the auto-assignment palette (the 7 pales come first)", () => {
		expect(ZONE_PRESET_COLORS.slice(0, ZONE_COLORS.length)).toEqual(
			ZONE_COLORS,
		);
	});

	it("has no duplicate entries", () => {
		expect(new Set(ZONE_PRESET_COLORS).size).toBe(ZONE_PRESET_COLORS.length);
	});
});
