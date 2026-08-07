export type TargetStatus = "active" | "pending" | "inactive";

export interface Target {
	x: number | null;
	y: number | null;
	status: TargetStatus;
	signal: number;
}

export interface RawTarget {
	raw_x: number | null;
	raw_y: number | null;
}

/**
 * Which optional hardware a board actually has, from the firmware's
 * `get_build_flags` action (see `firmware/common/epp-core.yaml`).
 *
 * The settings view hides the controls for anything absent. That is not
 * cosmetic: the firmware action behind each of those controls is only declared
 * on the model that has the hardware, and `async_push_config` skips a service
 * it cannot find — so an ungated control would save happily and push nowhere.
 *
 * Every flag is optional, for the same reason `heatmap` is: undefined until the
 * flags have been fetched, and permanently undefined on firmware predating
 * them. Read them through a helper that treats undefined as present, so a
 * device on older firmware keeps showing exactly what it showed before.
 */
export interface DeviceCapabilities {
	has_temperature?: boolean;
	has_humidity?: boolean;
	has_illuminance?: boolean;
	has_motion_presence?: boolean;
	has_static_presence?: boolean;
	has_led?: boolean;
	has_relay?: boolean;
}

/** A capability is present unless the firmware explicitly said otherwise. */
export function hasCapability(
	capabilities: DeviceCapabilities | undefined,
	capability: keyof DeviceCapabilities,
): boolean {
	return capabilities?.[capability] !== false;
}

export interface DeviceInfo extends DeviceCapabilities {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	configured: boolean;
	area: string | null;
	firmware_status:
		| "compatible"
		| "firmware_behind"
		| "firmware_ahead"
		| "unavailable";
	current_connection_count: number | null;
	bluetooth_enabled?: boolean;
	co2_enabled?: boolean;
	ethernet_enabled?: boolean;
	/** Heatmap build flag: undefined until fetched, or on firmware that predates it. */
	heatmap?: boolean;
}

export interface WizardCorner {
	raw_x: number;
	raw_y: number;
	offset_side: number;
	offset_fb: number;
}

export interface FlashableDevice {
	mac: string;
	name: string;
	/** The HA area the device lives in (e.g. "Bathroom"), shown under the
	 *  friendly name. For a sub-device linked to the ESPHome node via
	 *  `via_device` with no area of its own, this is the parent node's area.
	 *  Null when neither the device nor its parent has an area assigned. */
	area: string | null;
	host: string | null;
	available: boolean;
	firmware_type: "original" | "eppgrid";
	firmware_version: string;
	esphome_config_entry_id: string | null;
	update_available: boolean;
	firmware_status:
		| "compatible"
		| "firmware_behind"
		| "firmware_ahead"
		| "unknown"
		| "unavailable";
}

export type HaAddResult =
	| { type: "added" }
	| { type: "already_added" }
	| { type: "needs_auth" }
	| { type: "cannot_connect" }
	| { type: "failed"; reason?: string };

export type UsbFlashStep =
	| "idle"
	| "connecting"
	| "flashing"
	| "wifi_check"
	| "wifi_scan"
	| "wifi_provision"
	| "wifi_connecting"
	| "reading_ip"
	| "wifi_configured"
	| "adding"
	| "complete"
	| "error";

export interface UsbFlashState {
	step: UsbFlashStep;
	progress?: number;
	errorKey?: string;
	errorParams?: Record<string, string | number>;
	ip?: string;
	variant?: string;
	fatal?: boolean;
	haAdd?: HaAddResult;
	lastStep?: UsbFlashStep;
	haAddAttempt?: number;
	haAddMaxAttempts?: number;
	mac?: string;
}

export type OtaState = "updating" | "success" | "error";

export interface OtaDeviceState {
	state: OtaState;
	progress: number | null;
	errorKey: string | null;
	errorParams?: Record<string, string | number>;
}

// -- Device Groups --------------------------------------------------------

export const PRESENCE_SLOTS = [
	"occupancy",
	"static_presence",
	"motion_presence",
	"target_presence",
	"mmwave_presence",
] as const;
export type PresenceSlot = (typeof PRESENCE_SLOTS)[number];

/** Reserved id for the implicit "combined Rest of room" zone group. Never
 *  stored in `zone_groups`; synthesised by the projection from every source's
 *  zone 0. Must match the Python REST_OF_ROOM_ID constant byte-for-byte. */
export const REST_OF_ROOM_ID = "rest_of_room";
/** Display name for the combined Rest of room entity (matches the per-device
 *  zone-0 entity name convention "Zone Rest of Room"). */
export const REST_OF_ROOM_NAME = "Zone Rest of Room";

export interface DeviceGroupZoneMember {
	mac: string;
	zone_index: number;
}

export interface DeviceGroupZoneGroup {
	id: string;
	name: string;
	members: DeviceGroupZoneMember[];
}

export interface DeviceGroupSourceZone {
	index: number;
	name: string;
	enabled: boolean;
}

export interface DeviceGroupSource {
	mac: string;
	name: string;
	available: boolean;
	enabled_presence: PresenceSlot[];
	zones: DeviceGroupSourceZone[];
}

export type ExposedZoneEntity =
	| { kind: "group"; id: string; name: string; available: boolean }
	| {
			kind: "passthrough";
			mac: string;
			zone_index: number;
			name: string;
			available: boolean;
	  };

export interface DeviceGroupExposedEntities {
	presence: PresenceSlot[];
	zones: ExposedZoneEntity[];
}

export interface DeviceGroup {
	id: string;
	name: string;
	area_id: string | null;
	sources: DeviceGroupSource[];
	zone_groups: DeviceGroupZoneGroup[];
	exposed_entities: DeviceGroupExposedEntities;
	/** Presence slots the user has opted OUT of (default []). */
	excluded_presence: PresenceSlot[];
	/** Passthrough zones (index 1–7) the user has opted OUT of (default []). */
	excluded_zones: DeviceGroupZoneMember[];
	/** Zone-group ids opted out — only ever the reserved REST_OF_ROOM_ID
	 *  (merged zones have no toggle). Kept as a list for projection uniformity. */
	excluded_zone_groups: string[];
}
