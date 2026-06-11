import { describe, expect, it } from "vitest";
import {
	cloneSettingsDefault,
	ENTITY_DEFAULTS,
	isSettingsValueDefault,
	SETTINGS_DEFAULTS,
} from "../settings-defaults.js";

describe("ENTITY_DEFAULTS", () => {
	it("disables environmental sensors by default", () => {
		expect(ENTITY_DEFAULTS.env_temperature).toBe(false);
		expect(ENTITY_DEFAULTS.env_humidity).toBe(false);
		expect(ENTITY_DEFAULTS.env_illuminance).toBe(false);
		expect(ENTITY_DEFAULTS.env_co2).toBe(false);
	});
});

describe("frozen canonical defaults", () => {
	it("SETTINGS_DEFAULTS and its object values are frozen", () => {
		// These objects are the canonical source of truth for sparse-save and
		// restore. They get handed around by reference; an in-place mutation
		// must throw instead of silently corrupting every later restore.
		expect(Object.isFrozen(SETTINGS_DEFAULTS)).toBe(true);
		expect(Object.isFrozen(SETTINGS_DEFAULTS.entities)).toBe(true);
		expect(Object.isFrozen(SETTINGS_DEFAULTS.log_levels)).toBe(true);
		expect(Object.isFrozen(ENTITY_DEFAULTS)).toBe(true);
	});

	it("mutating a frozen default throws in strict mode", () => {
		expect(() => {
			(SETTINGS_DEFAULTS.log_levels as Record<string, string>).core = "DEBUG";
		}).toThrow(TypeError);
		expect(SETTINGS_DEFAULTS.log_levels).toEqual({});
	});
});

describe("cloneSettingsDefault", () => {
	it("returns scalar defaults as-is", () => {
		expect(cloneSettingsDefault("motion_timeout")).toBe(
			SETTINGS_DEFAULTS.motion_timeout,
		);
		expect(cloneSettingsDefault("led_mode")).toBe(SETTINGS_DEFAULTS.led_mode);
	});

	it("returns fresh copies for object-valued defaults", () => {
		const logLevels = cloneSettingsDefault("log_levels");
		expect(logLevels).toEqual(SETTINGS_DEFAULTS.log_levels);
		expect(logLevels).not.toBe(SETTINGS_DEFAULTS.log_levels);
		expect(Object.isFrozen(logLevels)).toBe(false);

		const entities = cloneSettingsDefault("entities");
		expect(entities).toEqual(SETTINGS_DEFAULTS.entities);
		expect(entities).not.toBe(SETTINGS_DEFAULTS.entities);
	});
});

describe("isSettingsValueDefault", () => {
	it("returns false when defaultValue is a non-empty object (unsupported case)", () => {
		expect(isSettingsValueDefault({}, { a: 1 })).toBe(false);
		expect(isSettingsValueDefault({ a: 1 }, { a: 1 })).toBe(false);
	});

	it("returns true for empty value against empty-object default", () => {
		expect(isSettingsValueDefault({}, {})).toBe(true);
	});

	it("returns false for non-empty value against empty-object default", () => {
		expect(isSettingsValueDefault({ a: 1 }, {})).toBe(false);
	});

	it("returns true for matching scalar values", () => {
		expect(isSettingsValueDefault(0, 0)).toBe(true);
		expect(isSettingsValueDefault("a", "a")).toBe(true);
		expect(isSettingsValueDefault(true, true)).toBe(true);
	});

	it("returns false for differing scalar values", () => {
		expect(isSettingsValueDefault(1, 0)).toBe(false);
		expect(isSettingsValueDefault("a", "b")).toBe(false);
	});
});
