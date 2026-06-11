/**
 * Canonical per-entity default state. Entities not listed here default
 * to `false` (disabled).
 */
export const ENTITY_DEFAULTS: Record<string, boolean> = {
	// Enabled by default
	room_occupancy: true,
	zone_presence: true,
	// Disabled by default
	room_target_presence: false,
	room_static_presence: false,
	room_motion_presence: false,
	room_mmwave: false,
	target_active: false,
	target_xy: false,
	target_signal: false,
	target_zone: false,
	zone_target_count: false,
	target_count: false,
	env_temperature: false,
	env_humidity: false,
	env_illuminance: false,
	env_co2: false,
};

/**
 * Canonical default values for every settings field that
 * `eppgrid/set_settings` accepts.
 *
 * These are the source of truth for:
 * - Sparse-save: configurations omit fields equal to their default
 * - Restore: when a saved configuration omits a field, the field is
 *   reset to the value here
 *
 * Adding a settings field touches every site that mirrors this map.
 * For a scalar field (no entity toggles, no rate flags) that means:
 *   - this map (default value)
 *   - the property union below (`SettingsHostProp`)
 *   - `SETTINGS_FIELD_MAP` (snake_case ↔ panel-property tuple)
 *   - `@state _xxx` initializer in `eppgrid-panel.ts`
 *   - `_buildSettingsPayload()` payload in `eppgrid-panel.ts`
 *   - `@property xxx` declaration on `EppSettingsView`
 *   - the rendering site in `EppSettingsView` and `_emitSave()` payload
 *   - `ParsedSettings` + `parseSettings()` in `lib/config-serialization.ts`
 *   - `PanelHost` interface in `controllers/panel-host.ts`
 *   - `GridStateController.applyLayout`'s `set_settings` payload and
 *     `saveSettings` back-sync in `controllers/grid-state-controller.ts`
 *   - translation keys (label + info) in `translations/en.json` and
 *     `translations/es.json`
 *
 * Test fixtures driven by `SETTINGS_FIELD_MAP` (e.g. `seedDefaultPanelState`)
 * pick up the new field automatically; tests that hand-build payloads
 * (e.g. `_buildSettingsPayload` shape tests) need the field added explicitly.
 */
export const SETTINGS_DEFAULTS = {
	temperature_offset: 0,
	humidity_offset: 0,
	illuminance_offset: 0,
	motion_timeout: 5,
	target_auto_distance: true,
	target_max_distance: 6.0,
	stuck_target_timeout: 300,
	static_auto_distance: true,
	static_min_distance: 0.3,
	static_max_distance: 16.0,
	static_trigger_threshold: 3,
	static_renew_threshold: 3,
	static_timeout: 30,
	static_on_delay: 0,
	led_mode: "Manual Control",
	led_brightness: 1.0,
	led_presence_color: "#CC33FF",
	relay_trigger_mode: "disabled",
	relay_contact_mode: "no",
	target_update_rate_ms: 1000,
	zone_update_rate_ms: 1000,
	entities: { ...ENTITY_DEFAULTS } as Record<string, boolean>,
	log_levels: {} as Record<string, string>,
} as const;

// `as const` only constrains the TYPE — at runtime the object-valued
// entries (entities, log_levels) are still mutable, and they get handed
// around by reference. One in-place mutation would silently corrupt the
// canonical default for every later restore/sparse-save. Freeze both maps
// (and ENTITY_DEFAULTS, which seeds `entities`) so such a mutation throws
// immediately instead. Readers that need a mutable copy must go through
// `cloneSettingsDefault`.
Object.freeze(ENTITY_DEFAULTS);
Object.freeze(SETTINGS_DEFAULTS.entities);
Object.freeze(SETTINGS_DEFAULTS.log_levels);
Object.freeze(SETTINGS_DEFAULTS);

export type SettingsKey = keyof typeof SETTINGS_DEFAULTS;

/**
 * Default value for a settings key, safe to assign into mutable state:
 * object-valued defaults (entities, log_levels) are returned as shallow
 * copies so callers can never alias the frozen canonical object.
 */
export function cloneSettingsDefault(key: SettingsKey): unknown {
	const value = SETTINGS_DEFAULTS[key];
	return typeof value === "object" && value !== null ? { ...value } : value;
}

/**
 * Compare a value against its canonical default.
 *
 * Handles two shapes:
 * - Scalar default: strict equality.
 * - Empty-object default (e.g. `log_levels: {}`): true when the value is
 *   itself an empty object.
 *
 * NOT correct for non-empty object defaults — those need bespoke comparison
 * logic (see `buildSparseEntities` for the entities case).
 */
export function isSettingsValueDefault(
	value: unknown,
	defaultValue: unknown,
): boolean {
	if (typeof defaultValue === "object" && defaultValue !== null) {
		// This helper only supports empty-object defaults (e.g. log_levels).
		// Non-empty object defaults need bespoke comparison logic — see
		// buildSparseEntities for the entities case.
		if (Object.keys(defaultValue).length !== 0) {
			return false;
		}
		return (
			typeof value === "object" &&
			value !== null &&
			Object.keys(value).length === 0
		);
	}
	return value === defaultValue;
}

/**
 * Union of every panel property name targeted by `SETTINGS_FIELD_MAP`.
 * Tightening this from `string` makes the controller's restore loop
 * type-safe — typos in either column fail the compile, and indexing
 * the panel host with one of these literals returns the real field
 * type instead of `unknown`.
 */
export type SettingsHostProp =
	| "_temperatureOffset"
	| "_humidityOffset"
	| "_illuminanceOffset"
	| "_motionTimeout"
	| "_targetAutoDistance"
	| "_targetMaxDistance"
	| "_stuckTargetTimeout"
	| "_staticAutoDistance"
	| "_staticMinDistance"
	| "_staticMaxDistance"
	| "_staticTriggerThreshold"
	| "_staticRenewThreshold"
	| "_staticTimeout"
	| "_staticOnDelay"
	| "_ledMode"
	| "_ledBrightness"
	| "_ledPresenceColor"
	| "_relayTriggerMode"
	| "_relayContactMode"
	| "_targetUpdateRateMs"
	| "_zoneUpdateRateMs"
	| "_entitiesConfig"
	| "_logLevels";

/**
 * Mapping from each settings key to the corresponding panel reactive
 * property. The pattern is snake_case → `_camelCase`, with `entities`
 * being the one outlier (`_entitiesConfig`, not `_entities`).
 *
 * Used by `loadConfiguration` to drive the restore field-by-field, and
 * by tests that need to seed the panel with all-default values.
 */
export const SETTINGS_FIELD_MAP: ReadonlyArray<
	readonly [SettingsKey, SettingsHostProp]
> = [
	["temperature_offset", "_temperatureOffset"],
	["humidity_offset", "_humidityOffset"],
	["illuminance_offset", "_illuminanceOffset"],
	["motion_timeout", "_motionTimeout"],
	["target_auto_distance", "_targetAutoDistance"],
	["target_max_distance", "_targetMaxDistance"],
	["stuck_target_timeout", "_stuckTargetTimeout"],
	["static_auto_distance", "_staticAutoDistance"],
	["static_min_distance", "_staticMinDistance"],
	["static_max_distance", "_staticMaxDistance"],
	["static_trigger_threshold", "_staticTriggerThreshold"],
	["static_renew_threshold", "_staticRenewThreshold"],
	["static_timeout", "_staticTimeout"],
	["static_on_delay", "_staticOnDelay"],
	["led_mode", "_ledMode"],
	["led_brightness", "_ledBrightness"],
	["led_presence_color", "_ledPresenceColor"],
	["relay_trigger_mode", "_relayTriggerMode"],
	["relay_contact_mode", "_relayContactMode"],
	["target_update_rate_ms", "_targetUpdateRateMs"],
	["zone_update_rate_ms", "_zoneUpdateRateMs"],
	["entities", "_entitiesConfig"],
	["log_levels", "_logLevels"],
];

/**
 * Filter an entities dict to only flags that differ from their default.
 * Returns `{}` if every flag is at its default.
 */
export function buildSparseEntities(
	entities: Record<string, boolean> | undefined,
): Record<string, boolean> {
	if (!entities) return {};
	const sparse: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(entities)) {
		const def = ENTITY_DEFAULTS[key] ?? false;
		if (value !== def) {
			sparse[key] = value;
		}
	}
	return sparse;
}
