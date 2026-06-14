import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import {
	CELL_ROOM_BIT,
	GRID_CELL_COUNT,
	GRID_COLS,
	GRID_ROWS,
} from "../lib/grid.js";
import {
	ENTITY_DEFAULTS,
	SETTINGS_DEFAULTS,
	SETTINGS_FIELD_MAP,
} from "../lib/settings-defaults.js";
import type { Zone0Config, ZoneConfig } from "../lib/zone-defaults.js";

// Helper to build a valid length-8 zone slots array (mirrors VALID_ZONES but
// returned as a fresh array so tests can't mutate the shared constant).
function makeValidZoneSlots(): (Zone0Config | ZoneConfig | null)[] {
	return [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
}

function seedDefaultPanelState(a: any): void {
	for (const [key, prop] of SETTINGS_FIELD_MAP) {
		if (key === "entities") {
			a[prop] = { ...ENTITY_DEFAULTS };
		} else {
			a[prop] = (SETTINGS_DEFAULTS as Record<string, any>)[key];
		}
	}
}

// Valid length-8 zone slots for test configurations (slot 0 = Zone0Config).
const VALID_ZONES: (Zone0Config | ZoneConfig | null)[] = [
	{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
	null,
	null,
	null,
	null,
	null,
	null,
	null,
];

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._perspective = null;
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._showConfigurationBackup = false;
	a._showConfigurationRestore = false;
	a._configurationName = "";
	return el;
}

describe("_getConfigurations", () => {
	it("returns configurations from controller cache", () => {
		const a = createPanel() as any;
		const configurations = [
			{
				name: "Test",
				grid: [],
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];
		a._gridCtrl.configurations = configurations;
		expect(a._getConfigurations()).toEqual(configurations);
	});

	it("returns empty array when cache is empty", () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [];
		expect(a._getConfigurations()).toEqual([]);
	});
});

describe("_saveConfiguration", () => {
	it("calls controller saveConfiguration", async () => {
		const a = createPanel() as any;
		a._configurationName = "My layout";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 5000;
		a._roomDepth = 6000;
		a._furniture = [];
		a._zoneConfigs = [
			{
				type: "default",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];

		a.hass.callWS
			.mockResolvedValueOnce({}) // save_configuration
			.mockResolvedValueOnce({ configurations: {} }); // list_configurations

		await a._saveConfiguration();

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/save_configuration",
				name: "My layout",
			}),
		);
	});

	it("saves only non-default fields in the settings blob (sparse storage)", async () => {
		const a = createPanel() as any;
		a._configurationName = "With Settings";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._furniture = [];
		a._zoneConfigs = [
			{
				type: "default",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];
		// Set some non-default settings values — these should appear in the blob
		a._temperatureOffset = 1.5; // non-default (default: 0)
		a._targetUpdateRateMs = 500; // non-default (default: 1000)
		a._logLevels = { esp32: "Debug" }; // non-default (default: {})
		// Leave all other settings at their panel defaults

		a.hass.callWS
			.mockResolvedValueOnce({}) // save_configuration
			.mockResolvedValueOnce({ configurations: {} }); // list_configurations

		await a._saveConfiguration();

		const call = a.hass.callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/save_configuration",
		);
		expect(call).toBeDefined();
		const payload = call![0] as {
			configuration: { settings: Record<string, any> };
		};
		expect(payload.configuration.settings).toBeDefined();
		// Non-default fields are present
		expect(payload.configuration.settings.temperature_offset).toBe(1.5);
		expect(payload.configuration.settings.target_update_rate_ms).toBe(500);
		expect(payload.configuration.settings.log_levels).toEqual({
			esp32: "Debug",
		});
		// Default-valued fields are NOT stored
		expect("motion_timeout" in payload.configuration.settings).toBe(false);
		expect("led_mode" in payload.configuration.settings).toBe(false);
		expect("humidity_offset" in payload.configuration.settings).toBe(false);
	});
});

describe("_buildSettingsPayload", () => {
	it("buildSettingsPayload matches the set_settings WS payload shape", () => {
		const a = createPanel() as any;
		// Set all properties to non-default values for clear assertion
		a._temperatureOffset = 0.5;
		a._humidityOffset = 1.0;
		a._illuminanceOffset = -2;
		a._motionTimeout = 10;
		a._targetAutoDistance = false;
		a._targetMaxDistance = 5.0;
		a._stuckTargetTimeout = 120;
		a._assistedClearEnabled = false;
		a._assistedClearTimeout = 10;
		a._staticAutoDistance = false;
		a._staticMinDistance = 0.5;
		a._staticMaxDistance = 12.0;
		a._staticTriggerThreshold = 4;
		a._staticRenewThreshold = 2;
		a._staticTimeout = 60;
		a._staticOnDelay = 1;
		a._ledMode = "Presence";
		a._ledBrightness = 0.8;
		a._ledPresenceColor = "#FF0000";
		a._relayTriggerMode = "presence";
		a._relayContactMode = "nc";
		a._targetUpdateRateMs = 500;
		a._zoneUpdateRateMs = 250;
		a._entitiesConfig = { zone_presence: true };
		a._logLevels = { esp32: "Warning" };

		const payload = a._buildSettingsPayload();

		// Verify all 25 fields are present
		expect(payload).toMatchObject({
			temperature_offset: 0.5,
			humidity_offset: 1.0,
			illuminance_offset: -2,
			motion_timeout: 10,
			target_auto_distance: false,
			target_max_distance: 5.0,
			stuck_target_timeout: 120,
			assisted_clear_enabled: false,
			assisted_clear_timeout: 10,
			static_auto_distance: false,
			static_min_distance: 0.5,
			static_max_distance: 12.0,
			static_trigger_threshold: 4,
			static_renew_threshold: 2,
			static_timeout: 60,
			static_on_delay: 1,
			led_mode: "Presence",
			led_brightness: 0.8,
			led_presence_color: "#FF0000",
			relay_trigger_mode: "presence",
			relay_contact_mode: "nc",
			target_update_rate_ms: 500,
			zone_update_rate_ms: 250,
			entities: { zone_presence: true },
			log_levels: { esp32: "Warning" },
		});
		// Exactly 25 keys — no extras, no omissions
		expect(Object.keys(payload)).toHaveLength(25);
	});
});

describe("_buildSparseSettings (via saveConfiguration)", () => {
	it("save produces empty settings blob when all fields are at defaults", async () => {
		const a = createPanel() as any;
		a._configurationName = "Bedroom";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._furniture = [];
		a._zoneConfigs = [
			{
				type: "default",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];
		// Set every settings property to its default value
		seedDefaultPanelState(a);

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/save_configuration",
		);
		expect(saveCall).toBeDefined();
		expect(saveCall![0].configuration.settings).toEqual({});
	});

	it("save produces sparse settings blob containing only non-default fields", async () => {
		const a = createPanel() as any;
		a._configurationName = "Bedroom";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 3000;
		a._roomDepth = 4000;
		a._furniture = [];
		a._zoneConfigs = [
			{
				type: "default",
				trigger: 5,
				renew: 3,
				timeout: 10,
				handoff_timeout: 3,
			},
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];
		// Set everything to default, then customise a few
		seedDefaultPanelState(a);
		a._motionTimeout = 60;
		a._ledMode = "Presence";
		// Use a truly non-default entity flag: room_occupancy defaults to true,
		// so setting it to false is non-default and must appear in the sparse blob.
		a._entitiesConfig = { room_occupancy: false };

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/save_configuration",
		);
		expect(saveCall).toBeDefined();
		expect(saveCall![0].configuration.settings).toEqual({
			motion_timeout: 60,
			led_mode: "Presence",
			entities: { room_occupancy: false },
		});
	});
	it("omits target_max_distance from save blob when target_auto_distance is at default", async () => {
		const a = createPanel() as any;
		a._configurationName = "AutoOn";
		seedDefaultPanelState(a);
		a._targetAutoDistance = true; // DEFAULT — auto on
		a._targetMaxDistance = 4; // would be stored as non-default, but shouldn't be

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/save_configuration",
		);
		// target_max_distance must be absent when auto is on (default)
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"target_max_distance",
		);
		// target_auto_distance is at default (true), so also absent
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"target_auto_distance",
		);
	});

	it("omits static_min_distance and static_max_distance from save blob when static_auto_distance is at default", async () => {
		const a = createPanel() as any;
		a._configurationName = "AutoOn";
		seedDefaultPanelState(a);
		a._staticAutoDistance = true; // DEFAULT — auto on
		a._staticMinDistance = 0.4; // non-default value, should still be omitted
		a._staticMaxDistance = 6; // non-default value, should still be omitted

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/save_configuration",
		);
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"static_min_distance",
		);
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"static_max_distance",
		);
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"static_auto_distance",
		);
	});

	it("stores manual distance values when auto-distance is explicitly off", async () => {
		const a = createPanel() as any;
		a._configurationName = "Manual";
		seedDefaultPanelState(a);
		a._targetAutoDistance = false; // EXPLICITLY OFF — non-default
		a._targetMaxDistance = 5; // non-default, should be stored
		a._staticAutoDistance = false; // non-default
		a._staticMinDistance = 0.5; // non-default, should be stored
		a._staticMaxDistance = 10; // non-default, should be stored

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/save_configuration",
		);
		expect(saveCall![0].configuration.settings).toMatchObject({
			target_auto_distance: false,
			target_max_distance: 5,
			static_auto_distance: false,
			static_min_distance: 0.5,
			static_max_distance: 10,
		});
	});

	it("omits entities entirely when all flags are at their per-entity defaults", async () => {
		const a = createPanel() as any;
		a._configurationName = "AllDefaults";
		seedDefaultPanelState(a);

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) => c[0]?.type === "eppgrid/save_configuration",
		);
		expect(saveCall![0].configuration.settings).toEqual({});
	});

	it("stores only entity flags differing from their per-entity default", async () => {
		const a = createPanel() as any;
		a._configurationName = "MixedEntities";
		seedDefaultPanelState(a);
		// Entity overrides: turn off room_occupancy (default true), turn on target_xy (default false)
		a._entitiesConfig = {
			room_occupancy: false, // non-default
			zone_presence: true, // default
			env_temperature: false, // default
			env_humidity: false, // default
			env_illuminance: false, // default
			target_xy: true, // non-default
			// Others left out of dict — sparse panel state representation
		};

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) => c[0]?.type === "eppgrid/save_configuration",
		);
		expect(saveCall![0].configuration.settings).toEqual({
			entities: {
				room_occupancy: false,
				target_xy: true,
			},
		});
	});

	it("omits relay_contact_mode when relay_trigger_mode is at default", async () => {
		const a = createPanel() as any;
		a._configurationName = "RelayDisabled";
		seedDefaultPanelState(a);
		a._relayTriggerMode = "disabled"; // DEFAULT
		a._relayContactMode = "nc"; // non-default, but should be dropped

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) => c[0]?.type === "eppgrid/save_configuration",
		);
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"relay_contact_mode",
		);
		expect(saveCall![0].configuration.settings).not.toHaveProperty(
			"relay_trigger_mode",
		);
	});

	it("stores relay_contact_mode when relay_trigger_mode is non-default", async () => {
		const a = createPanel() as any;
		a._configurationName = "RelayActive";
		seedDefaultPanelState(a);
		a._relayTriggerMode = "presence"; // non-default
		a._relayContactMode = "nc"; // non-default

		const callWS = vi
			.fn()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ configurations: {} });
		a.hass = { ...a.hass, callWS };

		await a._saveConfiguration();

		const saveCall = callWS.mock.calls.find(
			(c: any[]) => c[0]?.type === "eppgrid/save_configuration",
		);
		expect(saveCall![0].configuration.settings).toMatchObject({
			relay_trigger_mode: "presence",
			relay_contact_mode: "nc",
		});
	});
});

describe("_loadConfiguration", () => {
	it("loads a configuration from controller cache", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Saved",
				grid,
				zones: [
					{
						type: "default",
						trigger: 5,
						renew: 3,
						timeout: 10,
						handoff_timeout: 3,
					},
					{ name: "Z1", color: "#ff0000", type: "default" },
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 5000,
				roomDepth: 6000,
				furniture: [],
			},
		];

		await a._loadConfiguration("Saved");

		expect(a._grid[0]).toBe(CELL_ROOM_BIT);
		expect(a._roomWidth).toBe(5000);
		expect(a._showConfigurationRestore).toBe(false);
	});

	it("loadConfiguration restores zone 0 and auto-applies", async () => {
		const a = createPanel() as any;
		// Grid with at least one cell painted as zone 1, so applyLayout's
		// zero-cell pruning doesn't drop it.
		const grid = new Array(GRID_CELL_COUNT).fill(CELL_ROOM_BIT);
		grid[0] = CELL_ROOM_BIT | (1 << 1); // cell in zone 1
		const cfg = {
			name: "Saved",
			grid,
			zones: [
				{
					type: "seating",
					trigger: 7,
					renew: 1,
					timeout: 30,
					handoff_timeout: 10,
				},
				{
					name: "Living",
					color: "#f00",
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				null,
				null,
				null,
				null,
				null,
				null,
			],
			roomWidth: 4000,
			roomDepth: 3000,
			furniture: [],
		};
		a._gridCtrl.configurations = [cfg];
		const callWS = vi.spyOn(a.hass, "callWS").mockResolvedValue({});

		await a._loadConfiguration("Saved");

		expect((a._zoneConfigs[0] as Zone0Config).type).toBe("seating");
		expect((a._zoneConfigs[1] as ZoneConfig)?.name).toBe("Living");
		// auto-apply fired set_room_layout — assert exact shape so a
		// regression that re-introduces .slice(1) (length-7 zone_slots)
		// is caught.
		const roomLayoutCalls = callWS.mock.calls.filter(
			(c) => (c[0] as { type?: string })?.type === "eppgrid/set_room_layout",
		);
		expect(roomLayoutCalls).toHaveLength(1);
		const payload = roomLayoutCalls[0][0] as { zone_slots: any[] };
		expect(payload.zone_slots).toHaveLength(8);
		// Non-custom types carry only `type` (plus name/color for named
		// slots) — backend fills timing from ZONE_TYPE_DEFAULTS.
		expect(payload.zone_slots[0]).toEqual({ type: "seating" });
		expect(payload.zone_slots[1]).toMatchObject({
			name: "Living",
			type: "default",
		});
		expect(payload.zone_slots[1]).not.toHaveProperty("trigger");
	});

	it("throws on old-format configuration with length-7 zones", async () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "Old",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [null, null, null, null, null, null, null], // length 7, old format
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		a._showConfigurationRestore = true;

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadConfiguration("Old");
		expect(errSpy).toHaveBeenCalled();
		// Dialog stays open so the failure is visible and the user can
		// try another configuration.
		expect(a._showConfigurationRestore).toBe(true);
		errSpy.mockRestore();
	});

	it("throws on configuration with null zone 0", async () => {
		const a = createPanel() as any;
		a._gridCtrl.configurations = [
			{
				name: "NullZone0",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [null, null, null, null, null, null, null, null],
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadConfiguration("NullZone0");
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
	});

	it("restores settings to panel state and pushes via set_settings when blob has non-empty settings", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		const cfg = {
			name: "Bedroom",
			grid: Array.from(new Uint8Array(GRID_CELL_COUNT)),
			zones: validZones,
			roomWidth: 3,
			roomDepth: 4,
			furniture: [],
			settings: {
				temperature_offset: 1.5,
				humidity_offset: 0,
				illuminance_offset: 0,
				motion_timeout: 60,
				target_auto_distance: false,
				target_max_distance: 5,
				static_auto_distance: true,
				static_min_distance: 0.3,
				static_max_distance: 16,
				static_trigger_threshold: 50,
				static_renew_threshold: 60,
				static_timeout: 4,
				static_on_delay: 1,
				led_mode: "Presence",
				led_brightness: 0.4,
				led_presence_color: "#00ffaa",
				relay_trigger_mode: "presence",
				relay_contact_mode: "no",
				target_update_rate_ms: 500,
				zone_update_rate_ms: 200,
				entities: { zone_presence: true },
				log_levels: { sensor: "Info" },
			},
		};
		a._gridCtrl.configurations = [cfg];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };
		a._selectedMac = "AA:BB:CC:DD:EE:FF";

		await a._loadConfiguration("Bedroom");

		// Layout applied
		expect(a._roomWidth).toBe(3);
		expect(a._roomDepth).toBe(4);
		// Settings applied to panel state
		expect(a._temperatureOffset).toBe(1.5);
		expect(a._motionTimeout).toBe(60);
		expect(a._ledMode).toBe("Presence");
		expect(a._targetUpdateRateMs).toBe(500);
		// Blob stored { zone_presence: true } — expandEntities merges it with
		// ENTITY_DEFAULTS, so we get the full 5-key canonical defaults object
		// (zone_presence: true is the default, so no change from defaults here).
		expect(a._entitiesConfig).toEqual({ ...ENTITY_DEFAULTS });
		expect(a._logLevels).toEqual({ sensor: "Info" });

		// set_settings was called with the restored payload
		const setSettingsCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/set_settings",
		);
		expect(setSettingsCall).toBeDefined();
		expect(setSettingsCall![0]).toMatchObject({
			mac: "AA:BB:CC:DD:EE:FF",
			temperature_offset: 1.5,
			led_mode: "Presence",
		});
	});

	it("does not call set_settings or change panel settings state when blob settings is missing", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		a._temperatureOffset = 0.7; // current device value
		a._motionTimeout = 25;
		// Disable auto-distance so applyLayout doesn't inject its own set_settings call
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;
		a._gridCtrl.configurations = [
			{
				name: "OldStyle",
				grid: Array.from(new Uint8Array(GRID_CELL_COUNT)),
				zones: validZones,
				roomWidth: 3,
				roomDepth: 4,
				furniture: [],
				// no settings field — migrated entry shape
			},
		];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };

		await a._loadConfiguration("OldStyle");

		// Layout applied
		expect(a._roomWidth).toBe(3);
		// Settings panel state untouched
		expect(a._temperatureOffset).toBe(0.7);
		expect(a._motionTimeout).toBe(25);
		// No set_settings call from the settings-restore path
		const setSettingsCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/set_settings",
		);
		expect(setSettingsCall).toBeUndefined();
	});

	it("restores all defaults to panel state and pushes via set_settings when blob settings is empty", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		// Pre-populate panel with non-default values to verify they get reset
		a._temperatureOffset = 1.5;
		a._motionTimeout = 60;
		a._ledMode = "Presence";
		// Disable auto-distance so applyLayout doesn't inject its own set_settings call
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;
		a._gridCtrl.configurations = [
			{
				name: "AllDefaults",
				grid: Array.from(new Uint8Array(GRID_CELL_COUNT)),
				zones: validZones,
				roomWidth: 3,
				roomDepth: 4,
				furniture: [],
				settings: {},
			},
		];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };
		a._selectedMac = "AA:BB:CC:DD:EE:FF";

		await a._loadConfiguration("AllDefaults");

		// Panel state reset to defaults
		expect(a._temperatureOffset).toBe(0);
		expect(a._motionTimeout).toBe(5);
		expect(a._ledMode).toBe("Manual Control");

		// set_settings was called with the default payload
		const setSettingsCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/set_settings",
		);
		expect(setSettingsCall).toBeDefined();
		expect(setSettingsCall![0]).toMatchObject({
			mac: "AA:BB:CC:DD:EE:FF",
			temperature_offset: 0,
			motion_timeout: 5,
			led_mode: "Manual Control",
		});
	});

	it("restores partial settings using blob values for present fields and defaults for missing", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		a._temperatureOffset = 99; // current panel value (will be reset to default)
		a._motionTimeout = 99;
		// Disable auto-distance so applyLayout doesn't inject its own set_settings call
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;
		a._gridCtrl.configurations = [
			{
				name: "Partial",
				grid: Array.from(new Uint8Array(GRID_CELL_COUNT)),
				zones: validZones,
				roomWidth: 3,
				roomDepth: 4,
				furniture: [],
				settings: {
					motion_timeout: 60,
					led_mode: "Presence",
				},
			},
		];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };
		a._selectedMac = "AA:BB:CC:DD:EE:FF";

		await a._loadConfiguration("Partial");

		// Present fields use blob values
		expect(a._motionTimeout).toBe(60);
		expect(a._ledMode).toBe("Presence");
		// Missing fields reset to defaults
		expect(a._temperatureOffset).toBe(0);
	});

	it("expands sparse entities to full defaults+overrides on restore", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		a._gridCtrl.configurations = [
			{
				name: "SparseEntities",
				grid: Array.from(new Uint8Array(GRID_COLS * GRID_ROWS)),
				zones: validZones,
				roomWidth: 3,
				roomDepth: 4,
				furniture: [],
				settings: {
					entities: {
						room_occupancy: false, // override default true
						target_xy: true, // override default false
					},
				},
			},
		];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };
		a._selectedMac = "AA:BB:CC:DD:EE:FF";

		await a._loadConfiguration("SparseEntities");

		// Defaults preserved
		expect(a._entitiesConfig.zone_presence).toBe(true);
		expect(a._entitiesConfig.env_temperature).toBe(false);
		expect(a._entitiesConfig.env_humidity).toBe(false);
		expect(a._entitiesConfig.env_illuminance).toBe(false);
		// Overrides applied
		expect(a._entitiesConfig.room_occupancy).toBe(false);
		expect(a._entitiesConfig.target_xy).toBe(true);
	});

	it("restores all-default entities when settings has no entities key", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		a._entitiesConfig = { weird: true }; // some pre-existing state
		// Disable auto-distance so applyLayout doesn't inject its own set_settings call
		a._targetAutoDistance = false;
		a._staticAutoDistance = false;
		a._gridCtrl.configurations = [
			{
				name: "DefaultEntities",
				grid: Array.from(new Uint8Array(GRID_COLS * GRID_ROWS)),
				zones: validZones,
				roomWidth: 3,
				roomDepth: 4,
				furniture: [],
				settings: { motion_timeout: 60 }, // no entities key
			},
		];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };
		a._selectedMac = "AA:BB:CC:DD:EE:FF";

		await a._loadConfiguration("DefaultEntities");

		expect(a._entitiesConfig).toEqual({ ...ENTITY_DEFAULTS });
	});

	it("resets non-default entity (zone_target_count) on restore with empty settings blob", async () => {
		const a = createPanel() as any;
		const validZones = makeValidZoneSlots();
		// User had zone_target_count toggled ON before restore
		a._entitiesConfig = {
			...ENTITY_DEFAULTS,
			zone_target_count: true,
		};
		a._gridCtrl.configurations = [
			{
				name: "AllDefaults",
				grid: Array.from(new Uint8Array(GRID_COLS * GRID_ROWS)),
				zones: validZones,
				roomWidth: 3,
				roomDepth: 4,
				furniture: [],
				settings: {},
			},
		];

		const callWS = vi.fn().mockResolvedValue({});
		a.hass = { ...a.hass, callWS };
		a._selectedMac = "AA:BB:CC:DD:EE:FF";

		await a._loadConfiguration("AllDefaults");

		// Panel state reset to default
		expect(a._entitiesConfig.zone_target_count).toBe(false);
		// The set_settings call must explicitly include zone_target_count: false
		// so the backend's per-key update loop resets it.
		const setSettingsCall = callWS.mock.calls.find(
			(c: any[]) =>
				(c[0] as { type?: string })?.type === "eppgrid/set_settings",
		);
		expect(setSettingsCall).toBeDefined();
		expect(setSettingsCall![0].entities).toHaveProperty(
			"zone_target_count",
			false,
		);
	});
});

describe("_deleteConfiguration", () => {
	it("calls controller deleteConfiguration", async () => {
		const a = createPanel() as any;
		a.hass.callWS
			.mockResolvedValueOnce({}) // delete_configuration
			.mockResolvedValueOnce({ configurations: {} }); // list_configurations

		await a._deleteConfiguration("Old");

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/delete_configuration",
				name: "Old",
			}),
		);
	});
});

describe("configuration dialogs wiring (_renderGlobalDialogs)", () => {
	function renderDialogs(a: any): {
		c: HTMLDivElement;
		dialogs: HTMLElement;
	} {
		const tpl = a._renderGlobalDialogs();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);
		const dialogs = c.querySelector("epp-configuration-dialogs") as HTMLElement;
		expect(dialogs).not.toBeNull();
		return { c, dialogs };
	}

	it("forwards the controller's configurations to the component", () => {
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		a._gridCtrl.configurations = [
			{
				name: "T1",
				grid: [],
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];
		const { c, dialogs } = renderDialogs(a);
		expect((dialogs as any).configurations).toBe(a._gridCtrl.configurations);
		expect((dialogs as any).showRestore).toBe(true);
		expect((dialogs as any).showBackup).toBe(false);
		document.body.removeChild(c);
	});

	it("configuration-load event triggers _loadConfiguration", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		a._gridCtrl.configurations = [
			{
				name: "Clickable",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		const { c, dialogs } = renderDialogs(a);
		dialogs.dispatchEvent(
			new CustomEvent("configuration-load", { detail: "Clickable" }),
		);
		// Wait for the async _loadConfiguration -> applyLayout chain to settle.
		await vi.waitFor(() => {
			expect(a._showConfigurationRestore).toBe(false);
			expect(a._roomWidth).toBe(3000);
		});
		document.body.removeChild(c);
	});

	it("configuration-delete event triggers _deleteConfiguration without loading", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._showConfigurationRestore = true;
		a._gridCtrl.configurations = [
			{
				name: "Keep",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
			{
				name: "Delete",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		a.hass.callWS
			.mockResolvedValueOnce({}) // delete_configuration
			.mockResolvedValueOnce({
				configurations: {
					Keep: {
						grid,
						zones: VALID_ZONES,
						roomWidth: 3000,
						roomDepth: 4000,
						furniture: [],
					},
				},
			});

		const origWidth = a._roomWidth;
		const { c, dialogs } = renderDialogs(a);
		dialogs.dispatchEvent(
			new CustomEvent("configuration-delete", { detail: "Keep" }),
		);
		await vi.waitFor(() => {
			expect(a.hass.callWS).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "eppgrid/delete_configuration",
					name: "Keep",
				}),
			);
		});
		expect(a._roomWidth).toBe(origWidth);
		document.body.removeChild(c);
	});

	it("configuration-save event triggers _saveConfiguration", async () => {
		const a = createPanel() as any;
		a._showConfigurationBackup = true;
		a._configurationName = "My layout";
		a.hass.callWS
			.mockResolvedValueOnce({}) // save_configuration
			.mockResolvedValueOnce({ configurations: {} }); // list_configurations

		const { c, dialogs } = renderDialogs(a);
		dialogs.dispatchEvent(new CustomEvent("configuration-save"));
		await vi.waitFor(() => {
			expect(a.hass.callWS).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "eppgrid/save_configuration",
					name: "My layout",
				}),
			);
		});
		document.body.removeChild(c);
	});

	it("configuration-name-change event updates _configurationName", () => {
		const a = createPanel() as any;
		a._showConfigurationBackup = true;
		const { c, dialogs } = renderDialogs(a);
		dialogs.dispatchEvent(
			new CustomEvent("configuration-name-change", { detail: "Renamed" }),
		);
		expect(a._configurationName).toBe("Renamed");
		document.body.removeChild(c);
	});

	it("backup-cancel and restore-close events clear the show flags", () => {
		const a = createPanel() as any;
		a._showConfigurationBackup = true;
		a._showConfigurationRestore = true;
		const { c, dialogs } = renderDialogs(a);
		dialogs.dispatchEvent(new CustomEvent("backup-cancel"));
		expect(a._showConfigurationBackup).toBe(false);
		dialogs.dispatchEvent(new CustomEvent("restore-close"));
		expect(a._showConfigurationRestore).toBe(false);
		document.body.removeChild(c);
	});
});
