export interface Zone0Config {
	type: "default" | "bed" | "seating" | "transit" | "custom";
	// 0-9 threshold, higher=harder. 0 is NOT "disabled": the engine clamps
	// it to 1 ("any active frame triggers"), mirroring firmware
	// clamp_threshold in epp_types.h.
	trigger?: number;
	renew?: number; // 0-9 threshold, same 0-clamps-to-1 semantics as trigger
	timeout?: number; // seconds, if undefined use type default
	handoff_timeout?: number; // seconds, time for zone to clear after target leaves
}

export interface ZoneConfig extends Zone0Config {
	name: string;
	color: string;
}

/**
 * Length-8 tuple of zone configurations.
 * Slot 0 is always `Zone0Config` (the room-boundary zone).
 * Slots 1-7 hold named zones (`ZoneConfig | null`).
 */
export type ZoneSlots = readonly [
	Zone0Config,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
	ZoneConfig | null,
];

// Slot 0 carries only `type` for non-custom — timing is resolved from
// ZONE_TYPE_DEFAULTS at read/push time (see resolveZoneParams).
export const INITIAL_ZONE_SLOTS: ZoneSlots = [
	{ type: "default" },
	null,
	null,
	null,
	null,
	null,
	null,
	null,
];

export const ZONE_TYPE_DEFAULTS: Record<
	string,
	{ trigger: number; renew: number; timeout: number; handoff_timeout: number }
> = {
	default: { trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
	bed: { trigger: 8, renew: 2, timeout: 600, handoff_timeout: 10 },
	seating: { trigger: 7, renew: 1, timeout: 30, handoff_timeout: 10 },
	transit: { trigger: 3, renew: 2, timeout: 3, handoff_timeout: 1 },
};

// Dropdown order for zone-type <select> options. `custom` has no defaults
// row (user values are authoritative), so it's only in this list.
export const ZONE_TYPE_KEYS: Zone0Config["type"][] = [
	"default",
	"bed",
	"seating",
	"transit",
	"custom",
];

// Color-blind-friendly pale palette (Paul Tol's "light qualitative scheme",
// further softened ~30% toward white for a uniformly pale look while
// preserving distinguishability across protanopia, deuteranopia, and
// tritanopia).
export const ZONE_COLORS = [
	"#B8E7FF", // pale cyan
	"#CFDB70", // pale pear
	"#FFC4CF", // pale pink
	"#F3E7AC", // pale yellow
	"#7CCFB8", // pale mint
	"#A0C4E7", // pale blue
	"#F3AC94", // pale orange
];

export interface ZoneThresholds {
	trigger: number;
	renew: number;
	timeout: number;
	handoffTimeout: number;
}

/**
 * Non-custom types use the type's defaults exclusively (user-supplied
 * trigger/renew/... is ignored). Custom honours user values, falling back
 * to the default type's values when a field is missing (there is no
 * "custom" entry in ZONE_TYPE_DEFAULTS). Works for zone 0 and named
 * zones — both share the Zone0Config structural base.
 */
export function resolveZoneParams(z: Zone0Config): {
	type: Zone0Config["type"];
	trigger: number;
	renew: number;
	timeout: number;
	handoff_timeout: number;
} {
	const d = ZONE_TYPE_DEFAULTS[z.type] ?? ZONE_TYPE_DEFAULTS.default;
	const useCustom = z.type === "custom";
	return {
		type: z.type,
		trigger: useCustom ? (z.trigger ?? d.trigger) : d.trigger,
		renew: useCustom ? (z.renew ?? d.renew) : d.renew,
		timeout: useCustom ? (z.timeout ?? d.timeout) : d.timeout,
		handoff_timeout: useCustom
			? (z.handoff_timeout ?? d.handoff_timeout)
			: d.handoff_timeout,
	};
}

/**
 * Mirror of firmware `clamp_threshold` (epp_types.h): trigger/renew are
 * stored 0-9; 0 is treated as 1 ("any active frame triggers") so a
 * disabled-looking value never makes every tick confirm.
 */
function clampThreshold(threshold: number): number {
	return Math.max(1, threshold);
}

/**
 * Get trigger/renew/timeout for a zone from the current editor state.
 * Trigger/renew are clamped to >= 1 (firmware clamp_threshold semantics);
 * a stored 0 therefore behaves as 1, not as "disabled".
 *
 * - zid === 0: room boundary (uses roomType/roomTrigger/roomRenew/roomTimeout/etc.)
 * - zid 1-7: named zone (uses zone config)
 *
 * Callers must not pass unconfigured zone ids (the engine skips them, the
 * firmware-equivalent of `find_zone_index` returning -1); doing so throws so
 * the bug surfaces instead of silently running with made-up thresholds.
 */
export function getZoneThresholds(
	zid: number,
	zoneConfigs: (ZoneConfig | null)[],
	roomType: ZoneConfig["type"],
	roomTrigger: number,
	roomRenew: number,
	roomTimeout: number,
	roomHandoffTimeout: number,
): ZoneThresholds {
	if (zid === 0) {
		const d = ZONE_TYPE_DEFAULTS[roomType] || ZONE_TYPE_DEFAULTS.default;
		const isCustom = roomType === "custom";
		return isCustom
			? {
					trigger: clampThreshold(roomTrigger),
					renew: clampThreshold(roomRenew),
					timeout: roomTimeout,
					handoffTimeout: roomHandoffTimeout,
				}
			: {
					trigger: clampThreshold(d.trigger),
					renew: clampThreshold(d.renew),
					timeout: d.timeout,
					handoffTimeout: d.handoff_timeout,
				};
	}
	if (zid > 0 && zid <= zoneConfigs.length) {
		const cfg = zoneConfigs[zid - 1];
		if (cfg) {
			const d = ZONE_TYPE_DEFAULTS[cfg.type] || ZONE_TYPE_DEFAULTS.default;
			const isCustom = cfg.type === "custom";
			return isCustom
				? {
						trigger: clampThreshold(cfg.trigger ?? d.trigger),
						renew: clampThreshold(cfg.renew ?? d.renew),
						timeout: cfg.timeout ?? d.timeout,
						handoffTimeout: cfg.handoff_timeout ?? d.handoff_timeout,
					}
				: {
						trigger: clampThreshold(d.trigger),
						renew: clampThreshold(d.renew),
						timeout: d.timeout,
						handoffTimeout: d.handoff_timeout,
					};
		}
	}
	// Unconfigured zone: the firmware has no ZoneRuntime here and the TS
	// engine skips such zones before looking up thresholds — reaching this
	// is a caller bug, so fail loudly instead of inventing defaults.
	throw new Error(`getZoneThresholds: zone ${zid} is not configured`);
}
