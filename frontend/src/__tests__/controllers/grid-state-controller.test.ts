import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	GridStateController,
	serializeFurniture,
} from "../../controllers/grid-state-controller.js";
import type { FurnitureItem, FurnitureSticker } from "../../lib/furniture.js";
import {
	CELL_OVERLAY_ENTRY,
	CELL_OVERLAY_INTERFERENCE,
	CELL_OVERLAY_NONE,
	CELL_OVERLAY_SUPPRESS,
	CELL_ROOM_BIT,
	cellIsInside,
	cellOverlay,
	cellSetOverlay,
	cellZone,
	GRID_CELL_COUNT,
	GRID_COLS,
	getRoomBounds,
	MAX_ZONES,
} from "../../lib/grid.js";
import {
	ZONE_COLORS,
	type Zone0Config,
	type ZoneConfig,
} from "../../lib/zone-defaults.js";

// Length-8 tuple: slot 0 = Zone0Config, slots 1-7 = named zones.
// Helper to build a fresh "empty" zone-slots state (zone 0 populated,
// named zones all null) — matches the panel's INITIAL_ZONE_SLOTS shape.
function emptyZoneSlots(): (Zone0Config | ZoneConfig | null)[] {
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

// Build a minimal host with all properties the controller reads/writes
function mockHost(overrides: Record<string, any> = {}) {
	return {
		// ReactiveControllerHost
		requestUpdate: vi.fn(),
		addController: vi.fn(),
		removeController: vi.fn(),
		updateComplete: Promise.resolve(true),
		// Settings (subset — extended via overrides per test).
		_motionTimeout: 5 as number,
		_localize: undefined as
			| ((key: string, params?: Record<string, any>) => string)
			| undefined,
		// Grid
		_grid: new Uint8Array(GRID_CELL_COUNT),
		_roomWidth: 3000,
		_roomDepth: 3000,
		_activeZone: null as number | null,
		_isPainting: false,
		_frozenBounds: null as any,
		_paintAction: "set" as "set" | "clear",
		_justPainted: false,
		_dirty: false,
		_sidebarTab: "zones",
		_selectedFurnitureId: null as string | null,
		_dragState: null as any,
		// Overlays
		_overlayMode: null as string | null,
		// Zones — length-8 tuple (slot 0 = Zone0Config, slots 1..7 = named).
		_zoneConfigs: emptyZoneSlots() as (Zone0Config | ZoneConfig | null)[],
		// Furniture
		_furniture: [] as FurnitureItem[],
		// Configurations
		_configurationName: "",
		_showConfigurationBackup: false,
		_showConfigurationRestore: false,
		// Misc
		_view: "edit",
		_saving: false,
		shadowRoot: null,
		hass: {
			callWS: vi.fn().mockResolvedValue({}),
		},
		_getVisibleRoomBounds() {
			return getRoomBounds(this._grid);
		},
		_buildSettingsPayload() {
			return {
				temperature_offset: 0,
				humidity_offset: 0,
				illuminance_offset: 0,
				motion_timeout: 5,
				target_auto_distance: true,
				target_max_distance: 6,
				static_auto_distance: true,
				static_min_distance: 0.3,
				static_max_distance: 16,
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
				entities: {},
				log_levels: {},
			};
		},
		_buildSparseSettings() {
			// All values are at defaults in the mock host, so sparse = {}
			return {};
		},
		...overrides,
	};
}

describe("GridStateController", () => {
	let host: ReturnType<typeof mockHost>;
	let ctrl: GridStateController;

	beforeEach(() => {
		host = mockHost();
		ctrl = new GridStateController(host as any);
		localStorage.clear();
	});

	// =========================================================================
	// Construction
	// =========================================================================
	describe("constructor", () => {
		it("registers itself with the host", () => {
			expect(host.addController).toHaveBeenCalledWith(ctrl);
		});

		it("stores the host reference", () => {
			// Verify the controller can operate on the host by exercising a simple
			// method — the private `host` reference was set correctly.
			host._zoneConfigs = emptyZoneSlots();
			ctrl.addZone();
			expect(host._zoneConfigs[1]).not.toBeNull();
		});
	});

	// =========================================================================
	// addZone()
	// =========================================================================
	describe("addZone()", () => {
		it("fills the first empty slot", () => {
			ctrl.addZone();
			// With the length-8 tuple, slot 0 is always Zone0Config; the first
			// named zone fills slot 1.
			expect(host._zoneConfigs[1]).not.toBeNull();
			expect((host._zoneConfigs[1] as ZoneConfig).name).toBe("Zone 1");
		});

		it("uses the first unused color", () => {
			ctrl.addZone();
			expect((host._zoneConfigs[1] as ZoneConfig).color).toBe(ZONE_COLORS[0]);
		});

		it("skips already-used colors when picking a color", () => {
			// Manually occupy slot 1 (zone 1) with the first color
			host._zoneConfigs[1] = {
				name: "Zone 1",
				color: ZONE_COLORS[0],
				type: "default",
			};
			ctrl.addZone(); // should fill slot 2 (zone 2)
			expect((host._zoneConfigs[2] as ZoneConfig).color).toBe(ZONE_COLORS[1]);
		});

		it("sets _activeZone to the 1-based slot number", () => {
			ctrl.addZone();
			expect(host._activeZone).toBe(1);
		});

		it("marks the host as dirty", () => {
			ctrl.addZone();
			expect(host._dirty).toBe(true);
		});

		it("fills a gap rather than always using slot 0", () => {
			// Occupy slots 1 and 3 (zones 1 and 3) so slot 2 (zone 2) is the
			// first empty named slot.
			host._zoneConfigs[1] = {
				name: "Zone 1",
				color: ZONE_COLORS[0],
				type: "default",
			};
			host._zoneConfigs[3] = {
				name: "Zone 3",
				color: ZONE_COLORS[2],
				type: "default",
			};
			ctrl.addZone();
			expect(host._zoneConfigs[2]).not.toBeNull();
			expect(host._activeZone).toBe(2);
		});

		it("does nothing when all slots are full", () => {
			host._zoneConfigs = [
				host._zoneConfigs[0],
				...ZONE_COLORS.map((color, i) => ({
					name: `Zone ${i + 1}`,
					color,
					type: "default" as const,
				})),
			];
			ctrl.addZone();
			// _dirty would only be set if a zone was actually added — it was already false
			expect(host._dirty).toBe(false);
		});

		it("uses host._localize for the zone name when available", () => {
			// "Zone N" was previously hardcoded in English; non-English UIs
			// got mismatched zone names compared to the rest of the panel.
			host._localize = vi.fn(
				(key: string, params?: Record<string, number | string>) => {
					if (key === "live.debug.zone_n" && params) {
						return `Zona ${params.n}`;
					}
					return key;
				},
			);

			ctrl.addZone();

			expect(host._localize).toHaveBeenCalledWith("live.debug.zone_n", {
				n: 1,
			});
			expect((host._zoneConfigs[1] as ZoneConfig).name).toBe("Zona 1");
		});
	});

	// =========================================================================
	// removeZone(slot)
	// =========================================================================
	describe("removeZone(slot)", () => {
		beforeEach(() => {
			// Add a zone in slot 1 (named zone 1)
			host._zoneConfigs[1] = {
				name: "Zone 1",
				color: ZONE_COLORS[0],
				type: "default",
			};
			host._activeZone = 1;
		});

		it("nulls out the slot", () => {
			ctrl.removeZone(1);
			expect(host._zoneConfigs[1]).toBeNull();
		});

		it("clears all grid cells painted with that zone", () => {
			// Paint a few cells with zone 1 (bit pattern: inside=1, zone=1 → 0x03)
			const grid = new Uint8Array(GRID_CELL_COUNT);
			grid[10] = 0x03; // inside, zone 1
			grid[20] = 0x03;
			host._grid = grid;
			ctrl.removeZone(1);
			// Zone bits should be cleared — cell should be plain inside (0x01) or outside (0x00)
			expect((host._grid[10] & 0x0e) >> 1).toBe(0); // zone bits == 0
			expect((host._grid[20] & 0x0e) >> 1).toBe(0);
		});

		it("clears _activeZone when it matches the removed slot", () => {
			host._activeZone = 1;
			ctrl.removeZone(1);
			expect(host._activeZone).toBeNull();
		});

		it("leaves _activeZone unchanged when a different slot is removed", () => {
			host._zoneConfigs[2] = {
				name: "Zone 2",
				color: ZONE_COLORS[1],
				type: "default",
			};
			host._activeZone = 1;
			ctrl.removeZone(2);
			expect(host._activeZone).toBe(1);
		});

		it("marks the host as dirty", () => {
			ctrl.removeZone(1);
			expect(host._dirty).toBe(true);
		});

		it("does nothing for out-of-range slots", () => {
			ctrl.removeZone(0);
			ctrl.removeZone(MAX_ZONES + 1);
			expect(host._dirty).toBe(false);
		});

		it("does nothing when the slot is already null", () => {
			ctrl.removeZone(2); // slot 2 is null
			expect(host._dirty).toBe(false);
		});
	});

	// =========================================================================
	// addFurniture(sticker)
	// =========================================================================
	describe("addFurniture(sticker)", () => {
		const sticker: FurnitureSticker = {
			type: "icon",
			icon: "mdi:sofa",
			label: "furniture.sofa",
			defaultWidth: 600,
			defaultHeight: 400,
			lockAspect: false,
		};

		it("adds a new item to the furniture list", () => {
			ctrl.addFurniture(sticker);
			expect(host._furniture).toHaveLength(1);
		});

		it("creates an item with the correct type and icon", () => {
			ctrl.addFurniture(sticker);
			const item = host._furniture[0] as FurnitureItem;
			expect(item.type).toBe("icon");
			expect(item.icon).toBe("mdi:sofa");
			expect(item.label).toBe("furniture.sofa");
		});

		it("creates an item with a unique id", () => {
			ctrl.addFurniture(sticker);
			ctrl.addFurniture(sticker);
			const ids = (host._furniture as FurnitureItem[]).map((f) => f.id);
			expect(new Set(ids).size).toBe(2);
		});

		it("selects the newly added item", () => {
			ctrl.addFurniture(sticker);
			expect(host._selectedFurnitureId).toBe(
				(host._furniture[0] as FurnitureItem).id,
			);
		});

		it("marks the host as dirty", () => {
			ctrl.addFurniture(sticker);
			expect(host._dirty).toBe(true);
		});

		it("centers the item within the room", () => {
			host._roomWidth = 3000;
			host._roomDepth = 3000;
			ctrl.addFurniture(sticker);
			const item = host._furniture[0] as FurnitureItem;
			// createFurnitureItem centers: x = (3000 - 600) / 2 = 1200
			expect(item.x).toBe(1200);
			expect(item.y).toBe(1300);
		});
	});

	// =========================================================================
	// removeFurniture(id)
	// =========================================================================
	describe("removeFurniture(id)", () => {
		let itemA: FurnitureItem;
		let itemB: FurnitureItem;

		beforeEach(() => {
			itemA = {
				id: "f_a",
				type: "icon",
				icon: "mdi:sofa",
				label: "sofa",
				x: 0,
				y: 0,
				width: 600,
				height: 400,
				rotation: 0,
				lockAspect: false,
			};
			itemB = {
				id: "f_b",
				type: "icon",
				icon: "mdi:chair",
				label: "chair",
				x: 0,
				y: 0,
				width: 400,
				height: 400,
				rotation: 0,
				lockAspect: false,
			};
			host._furniture = [itemA, itemB];
		});

		it("removes the item with the given id", () => {
			ctrl.removeFurniture("f_a");
			expect(host._furniture).toHaveLength(1);
			expect((host._furniture[0] as FurnitureItem).id).toBe("f_b");
		});

		it("clears _selectedFurnitureId when the selected item is removed", () => {
			host._selectedFurnitureId = "f_a";
			ctrl.removeFurniture("f_a");
			expect(host._selectedFurnitureId).toBeNull();
		});

		it("leaves _selectedFurnitureId unchanged when a different item is removed", () => {
			host._selectedFurnitureId = "f_b";
			ctrl.removeFurniture("f_a");
			expect(host._selectedFurnitureId).toBe("f_b");
		});

		it("marks the host as dirty", () => {
			ctrl.removeFurniture("f_a");
			expect(host._dirty).toBe(true);
		});

		it("does nothing (no error) when id does not exist", () => {
			ctrl.removeFurniture("nonexistent");
			expect(host._furniture).toHaveLength(2);
		});
	});

	// =========================================================================
	// fetchConfigurations() / saveConfiguration() / loadConfiguration() / deleteConfiguration()
	// =========================================================================

	describe("fetchConfigurations()", () => {
		it("fetches configurations from backend and populates cache", async () => {
			host.hass.callWS.mockResolvedValueOnce({
				configurations: {
					"Living Room": {
						grid: [0, 0, CELL_ROOM_BIT],
						zones: [{ name: "Zone 1", color: ZONE_COLORS[0], type: "default" }],
						roomWidth: 3000,
						roomDepth: 4000,
					},
					Kitchen: {
						grid: [CELL_ROOM_BIT],
						zones: [],
						roomWidth: 2000,
						roomDepth: 2500,
					},
				},
			});
			await ctrl.fetchConfigurations();
			expect(host.hass.callWS).toHaveBeenCalledWith({
				type: "eppgrid/list_configurations",
			});
			expect(ctrl.configurations).toHaveLength(2);
			expect(ctrl.configurations[0].name).toBe("Living Room");
			expect(ctrl.configurations[0].roomWidth).toBe(3000);
			expect(ctrl.configurations[1].name).toBe("Kitchen");
		});

		it("sets empty array when backend returns no configurations", async () => {
			host.hass.callWS.mockResolvedValueOnce({ configurations: {} });
			await ctrl.fetchConfigurations();
			expect(ctrl.configurations).toEqual([]);
		});

		it("sets empty array on WS error", async () => {
			host.hass.callWS.mockRejectedValueOnce(new Error("WS fail"));
			await ctrl.fetchConfigurations();
			expect(ctrl.configurations).toEqual([]);
		});
	});

	describe("saveConfiguration()", () => {
		beforeEach(() => {
			host._configurationName = "My Template";
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			host._grid[5] = CELL_ROOM_BIT;
			host._zoneConfigs = [
				host._zoneConfigs[0],
				{ name: "Zone 1", color: ZONE_COLORS[0], type: "default" },
				null,
				null,
				null,
				null,
				null,
				null,
			];
			host._roomWidth = 3000;
			host._roomDepth = 4000;
			host._furniture = [];
			// Mock list_configurations response for the refresh after save
			host.hass.callWS.mockResolvedValue({ configurations: {} });
		});

		it("calls save_configuration WS with name and configuration data", async () => {
			await ctrl.saveConfiguration();
			const calls = host.hass.callWS.mock.calls;
			const saveCall = calls.find(
				(c: any[]) => c[0].type === "eppgrid/save_configuration",
			);
			expect(saveCall).toBeDefined();
			expect(saveCall![0].name).toBe("My Template");
			expect(saveCall![0].configuration.roomWidth).toBe(3000);
			expect(saveCall![0].configuration.roomDepth).toBe(4000);
			expect(saveCall![0].configuration.grid[5]).toBe(CELL_ROOM_BIT);
			// Length-8 zones with zone 0 in slot 0 and named zone in slot 1.
			expect(saveCall![0].configuration.zones).toHaveLength(MAX_ZONES + 1);
			expect(saveCall![0].configuration.zones[0]).toMatchObject({
				type: "default",
			});
			expect(saveCall![0].configuration.zones[1]).toMatchObject({
				name: "Zone 1",
				color: ZONE_COLORS[0],
			});
		});

		it("clears _configurationName and hides the save dialog", async () => {
			host._showConfigurationBackup = true;
			await ctrl.saveConfiguration();
			expect(host._configurationName).toBe("");
			expect(host._showConfigurationBackup).toBe(false);
		});

		it("does nothing when configuration name is blank", async () => {
			host._configurationName = "   ";
			await ctrl.saveConfiguration();
			expect(host.hass.callWS).not.toHaveBeenCalled();
		});

		it("refreshes cache after saving (calls list_configurations)", async () => {
			await ctrl.saveConfiguration();
			const listCalls = host.hass.callWS.mock.calls.filter(
				(c: any[]) => c[0].type === "eppgrid/list_configurations",
			);
			expect(listCalls.length).toBeGreaterThanOrEqual(1);
		});

		it("omits timing fields for non-custom zone 0", async () => {
			// Zone 0 is type "default" — its timing should come from
			// ZONE_TYPE_DEFAULTS at push time, so we don't store it.
			host._zoneConfigs = [
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
			await ctrl.saveConfiguration();
			const saveCall = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0].type === "eppgrid/save_configuration",
			);
			const z0 = saveCall![0].configuration.zones[0];
			expect(z0).toEqual({ type: "default" });
			expect(z0).not.toHaveProperty("trigger");
			expect(z0).not.toHaveProperty("renew");
			expect(z0).not.toHaveProperty("timeout");
			expect(z0).not.toHaveProperty("handoff_timeout");
		});

		it("includes timing fields for custom zone 0", async () => {
			host._zoneConfigs = [
				{
					type: "custom",
					trigger: 6,
					renew: 4,
					timeout: 20,
					handoff_timeout: 5,
				},
				null,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.saveConfiguration();
			const saveCall = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0].type === "eppgrid/save_configuration",
			);
			const z0 = saveCall![0].configuration.zones[0];
			expect(z0).toEqual({
				type: "custom",
				trigger: 6,
				renew: 4,
				timeout: 20,
				handoff_timeout: 5,
			});
		});

		it("omits timing fields for non-custom named zone", async () => {
			host._zoneConfigs = [
				host._zoneConfigs[0],
				{
					name: "Office",
					color: ZONE_COLORS[1],
					type: "transit",
					trigger: 3,
					renew: 2,
					timeout: 3,
					handoff_timeout: 1,
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.saveConfiguration();
			const saveCall = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0].type === "eppgrid/save_configuration",
			);
			const z1 = saveCall![0].configuration.zones[1];
			expect(z1).toEqual({
				name: "Office",
				color: ZONE_COLORS[1],
				type: "transit",
			});
			expect(z1).not.toHaveProperty("trigger");
			expect(z1).not.toHaveProperty("renew");
			expect(z1).not.toHaveProperty("timeout");
			expect(z1).not.toHaveProperty("handoff_timeout");
		});

		it("includes timing fields for custom named zone", async () => {
			host._zoneConfigs = [
				host._zoneConfigs[0],
				{
					name: "Lab",
					color: ZONE_COLORS[2],
					type: "custom",
					trigger: 8,
					renew: 4,
					timeout: 45,
					handoff_timeout: 12,
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.saveConfiguration();
			const saveCall = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0].type === "eppgrid/save_configuration",
			);
			const z1 = saveCall![0].configuration.zones[1];
			expect(z1).toEqual({
				name: "Lab",
				color: ZONE_COLORS[2],
				type: "custom",
				trigger: 8,
				renew: 4,
				timeout: 45,
				handoff_timeout: 12,
			});
		});
	});

	describe("loadConfiguration()", () => {
		// Length-8 zones matches the unified zone_slots model.
		// Slot 0 = Zone0Config (room boundary), slots 1-7 = named zones.
		const TEMPLATE_DATA = {
			// Cell 3 is zone 0 (room boundary), cell 4 is zone 1 so applyLayout
			// doesn't prune zone 1 as empty.
			grid: Array.from({ length: GRID_CELL_COUNT }, (_, i) => {
				if (i === 3) return CELL_ROOM_BIT;
				if (i === 4) return CELL_ROOM_BIT | (1 << 1); // zone 1
				return 0;
			}),
			zones: [
				{
					type: "default" as const,
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				{
					name: "Zone 1",
					color: ZONE_COLORS[0],
					type: "default" as const,
				},
				null,
				null,
				null,
				null,
				null,
				null,
			],
			roomWidth: 2400,
			roomDepth: 3600,
			furniture: [
				{
					id: "f_x",
					type: "icon" as const,
					icon: "mdi:sofa",
					label: "sofa",
					x: 100,
					y: 200,
					width: 600,
					height: 400,
					rotation: 0,
					lockAspect: false,
				},
			],
		};

		beforeEach(() => {
			// Pre-populate the configurations cache
			ctrl.configurations = [{ name: "Loaded", ...TEMPLATE_DATA }];
			// applyLayout (now invoked auto after loadConfiguration) calls WS and
			// reads _selectedMac + various settings — default mocks cover it.
			host.hass.callWS.mockResolvedValue({});
		});

		it("restores grid, room dimensions, zones, and furniture from cache", async () => {
			// Mock applyLayout to no-op so we can assert the full pre-apply
			// state restoration (otherwise applyLayout prunes empty zones and
			// out-of-bounds furniture before we can check them).
			const applySpy = vi
				.spyOn(ctrl, "applyLayout")
				.mockResolvedValue(undefined);
			await ctrl.loadConfiguration("Loaded");
			expect(host._roomWidth).toBe(2400);
			expect(host._roomDepth).toBe(3600);
			expect(host._grid[3]).toBe(CELL_ROOM_BIT);
			// Length-8 tuple: slot 0 = Zone0Config, slots 1-7 = named zones.
			expect(host._zoneConfigs).toHaveLength(MAX_ZONES + 1);
			expect(host._zoneConfigs[0]).toMatchObject({ type: "default" });
			expect(host._zoneConfigs[1]).toMatchObject({
				name: "Zone 1",
				type: "default",
			});
			expect(host._furniture).toHaveLength(1);
			expect(host._furniture[0]).toMatchObject({ id: "f_x", icon: "mdi:sofa" });
			applySpy.mockRestore();
		});

		it("aligns template zones to current room footprint and preserves current room dims", async () => {
			// Pre-populate a non-empty current grid: room at rows 5-6, cols 6-7.
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			host._grid[5 * GRID_COLS + 6] = CELL_ROOM_BIT;
			host._grid[5 * GRID_COLS + 7] = CELL_ROOM_BIT;
			host._grid[6 * GRID_COLS + 6] = CELL_ROOM_BIT;
			host._grid[6 * GRID_COLS + 7] = CELL_ROOM_BIT;
			host._roomWidth = 2000;
			host._roomDepth = 2000;

			// Template grid: room at rows 2-3, cols 3-4, with zone 1 at (2, 4).
			const templateGridArr = Array.from({ length: GRID_CELL_COUNT }, () => 0);
			templateGridArr[2 * GRID_COLS + 3] = CELL_ROOM_BIT;
			templateGridArr[2 * GRID_COLS + 4] = CELL_ROOM_BIT | (1 << 1); // zone 1
			templateGridArr[3 * GRID_COLS + 3] = CELL_ROOM_BIT;
			templateGridArr[3 * GRID_COLS + 4] = CELL_ROOM_BIT;

			ctrl.configurations = [
				{
					name: "Aligned",
					grid: templateGridArr,
					zones: [
						{
							type: "default" as const,
							trigger: 5,
							renew: 3,
							timeout: 10,
							handoff_timeout: 3,
						},
						{ name: "Zone 1", color: ZONE_COLORS[0], type: "default" as const },
						null,
						null,
						null,
						null,
						null,
						null,
					],
					roomWidth: 2400,
					roomDepth: 3600,
					furniture: [],
				},
			];

			const applySpy = vi
				.spyOn(ctrl, "applyLayout")
				.mockResolvedValue(undefined);

			await ctrl.loadConfiguration("Aligned");

			// Current room dims preserved (NOT 2400 / 3600 from backup).
			expect(host._roomWidth).toBe(2000);
			expect(host._roomDepth).toBe(2000);
			// Current inside-room footprint preserved.
			expect(cellIsInside(host._grid[5 * GRID_COLS + 6])).toBe(true);
			expect(cellIsInside(host._grid[6 * GRID_COLS + 7])).toBe(true);
			expect(cellIsInside(host._grid[2 * GRID_COLS + 3])).toBe(false); // template's old position
			// Zone 1 translated by (+3, +3): from (2, 4) to (5, 7).
			expect(cellZone(host._grid[5 * GRID_COLS + 7])).toBe(1);
			// Original zone position has no zone in the result.
			expect(cellZone(host._grid[2 * GRID_COLS + 4])).toBe(0);

			applySpy.mockRestore();
		});

		it("populates all 8 slots so length is 8", async () => {
			await ctrl.loadConfiguration("Loaded");
			expect(host._zoneConfigs).toHaveLength(MAX_ZONES + 1);
			// Slot 0 is zone 0 (always populated).
			expect(host._zoneConfigs[0]).not.toBeNull();
			// Slots 2..7 (unused named zones) are null.
			for (let i = 2; i < MAX_ZONES + 1; i++) {
				expect(host._zoneConfigs[i]).toBeNull();
			}
		});

		it("closes the load dialog", async () => {
			host._showConfigurationRestore = true;
			await ctrl.loadConfiguration("Loaded");
			expect(host._showConfigurationRestore).toBe(false);
		});

		it("does nothing when the configuration name does not exist", async () => {
			await ctrl.loadConfiguration("Nonexistent");
			expect(host._roomWidth).toBe(3000); // unchanged from mockHost default
		});

		it("handles configurations without furniture field", async () => {
			const { furniture: _, ...noFurniture } = TEMPLATE_DATA;
			ctrl.configurations = [{ name: "Loaded", ...noFurniture } as any];
			await ctrl.loadConfiguration("Loaded");
			expect(host._furniture).toEqual([]);
		});

		it("auto-applies the layout (sends set_room_layout WS)", async () => {
			await ctrl.loadConfiguration("Loaded");
			const roomLayoutCalls = host.hass.callWS.mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/set_room_layout",
			);
			expect(roomLayoutCalls).toHaveLength(1);
			const payload = roomLayoutCalls[0][0] as { zone_slots: any[] };
			// Length must be exactly 8 — guards against a .slice(1) regression.
			expect(payload.zone_slots).toHaveLength(MAX_ZONES + 1);
			expect(payload.zone_slots[0]).toMatchObject({ type: "default" });
			expect(payload.zone_slots[1]).toMatchObject({
				name: "Zone 1",
				type: "default",
			});
		});

		it("sets _dirty=true before applyLayout so failures stay recoverable", async () => {
			// applyLayout throws — user should still see an Apply button to
			// retry, which requires _dirty === true.
			const applySpy = vi
				.spyOn(ctrl, "applyLayout")
				.mockRejectedValue(new Error("WS failure"));
			host._dirty = false;
			await expect(ctrl.loadConfiguration("Loaded")).rejects.toThrow(
				/WS failure/,
			);
			expect(host._dirty).toBe(true);
			applySpy.mockRestore();
		});

		it("rolls back grid/zones/room/furniture/settings if set_settings fails", async () => {
			// settings comes BEFORE applyLayout. If set_settings fails, the
			// panel was already mutated to the loaded blob's state but the
			// device has neither the new settings nor the new layout. Rather
			// than show stale UI, restore the pre-load snapshot so the user
			// sees their previous state and the failure surfaces as "nothing
			// changed".
			ctrl.configurations = [
				{
					name: "WithSettings",
					...TEMPLATE_DATA,
					settings: { motion_timeout: 99 },
				},
			];
			const beforeGrid = host._grid.slice();
			const beforeZones = host._zoneConfigs.map((z: any) =>
				z === null ? null : { ...z },
			);
			const beforeWidth = host._roomWidth;
			const beforeDepth = host._roomDepth;
			const beforeFurniture = host._furniture.map((f: any) => ({ ...f }));
			const beforeMotionTimeout = host._motionTimeout;

			host.hass.callWS.mockImplementation((req: any) => {
				if (req.type === "eppgrid/set_settings") {
					return Promise.reject(new Error("settings ws fail"));
				}
				return Promise.resolve({});
			});

			await expect(ctrl.loadConfiguration("WithSettings")).rejects.toThrow(
				/settings ws fail/,
			);

			expect(Array.from(host._grid)).toEqual(Array.from(beforeGrid));
			expect(host._zoneConfigs).toEqual(beforeZones);
			expect(host._roomWidth).toBe(beforeWidth);
			expect(host._roomDepth).toBe(beforeDepth);
			expect(host._furniture).toEqual(beforeFurniture);
			expect(host._motionTimeout).toBe(beforeMotionTimeout);
		});

		it("throws on old-format configuration (length-7 zones)", async () => {
			ctrl.configurations = [
				{
					name: "Old",
					grid: TEMPLATE_DATA.grid,
					// length 7 — old format
					zones: [null, null, null, null, null, null, null],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("Old")).rejects.toThrow(/old format/);
		});

		it("leaves the load dialog open when rejecting an old-format configuration", async () => {
			ctrl.configurations = [
				{
					name: "Old",
					grid: TEMPLATE_DATA.grid,
					zones: [null, null, null, null, null, null, null],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			host._showConfigurationRestore = true;
			await expect(ctrl.loadConfiguration("Old")).rejects.toThrow(/old format/);
			// Dialog should remain open so the failure is visible and the user
			// can try another configuration.
			expect(host._showConfigurationRestore).toBe(true);
		});

		it("throws on configuration with null zone 0", async () => {
			ctrl.configurations = [
				{
					name: "NullZ0",
					grid: TEMPLATE_DATA.grid,
					zones: [null, null, null, null, null, null, null, null],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("NullZ0")).rejects.toThrow(
				/old format/,
			);
		});

		it("throws when zone 0 is missing the type field", async () => {
			ctrl.configurations = [
				{
					name: "BadZ0NoType",
					grid: TEMPLATE_DATA.grid,
					zones: [{ trigger: 5 }, null, null, null, null, null, null, null],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("BadZ0NoType")).rejects.toThrow(
				/old format/,
			);
		});

		it("throws when zone 0 has non-string type", async () => {
			ctrl.configurations = [
				{
					name: "BadZ0TypeNum",
					grid: TEMPLATE_DATA.grid,
					zones: [{ type: 42 }, null, null, null, null, null, null, null],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("BadZ0TypeNum")).rejects.toThrow(
				/old format/,
			);
		});

		it("throws when a named slot is missing the name field", async () => {
			ctrl.configurations = [
				{
					name: "BadNamedNoName",
					grid: TEMPLATE_DATA.grid,
					zones: [
						{ type: "default" },
						{ color: "#ff0000", type: "default" },
						null,
						null,
						null,
						null,
						null,
						null,
					],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("BadNamedNoName")).rejects.toThrow(
				/old format/,
			);
		});

		it("throws when a named slot has non-string color", async () => {
			ctrl.configurations = [
				{
					name: "BadNamedColor",
					grid: TEMPLATE_DATA.grid,
					zones: [
						{ type: "default" },
						{ name: "Office", color: 0xff0000, type: "default" },
						null,
						null,
						null,
						null,
						null,
						null,
					],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("BadNamedColor")).rejects.toThrow(
				/old format/,
			);
		});

		it("translates furniture by the cell offset when room dims match", async () => {
			// Same-roomWidth scenario: only inside-room cells moved.
			// Current room footprint at rows 5-6, cols 6-7.
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			host._grid[5 * GRID_COLS + 6] = CELL_ROOM_BIT;
			host._grid[5 * GRID_COLS + 7] = CELL_ROOM_BIT;
			host._grid[6 * GRID_COLS + 6] = CELL_ROOM_BIT;
			host._grid[6 * GRID_COLS + 7] = CELL_ROOM_BIT;
			host._roomWidth = 3000;
			host._roomDepth = 3000;

			// Backup: same dims, room at rows 2-3 cols 3-4, furniture at (600, 300) mm.
			const templateGridArr = Array.from({ length: GRID_CELL_COUNT }, () => 0);
			templateGridArr[2 * GRID_COLS + 3] = CELL_ROOM_BIT;
			templateGridArr[2 * GRID_COLS + 4] = CELL_ROOM_BIT;
			templateGridArr[3 * GRID_COLS + 3] = CELL_ROOM_BIT;
			templateGridArr[3 * GRID_COLS + 4] = CELL_ROOM_BIT;

			ctrl.configurations = [
				{
					name: "WithFurniture",
					grid: templateGridArr,
					zones: [
						{
							type: "default" as const,
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
					],
					roomWidth: 3000,
					roomDepth: 3000,
					furniture: [
						{
							id: "f1",
							type: "icon" as const,
							icon: "mdi:sofa",
							label: "sofa",
							x: 600,
							y: 300,
							width: 600,
							height: 400,
							rotation: 0,
							lockAspect: false,
						},
					],
				},
			];

			const applySpy = vi
				.spyOn(ctrl, "applyLayout")
				.mockResolvedValue(undefined);
			await ctrl.loadConfiguration("WithFurniture");

			// Offset (+3, +3) in mm; no dim correction → furniture at (1500, 1200).
			expect(host._furniture).toHaveLength(1);
			expect(host._furniture[0].x).toBe(1500);
			expect(host._furniture[0].y).toBe(1200);

			applySpy.mockRestore();
		});

		it("translates furniture with dim correction when roomWidth differs", async () => {
			// Current: roomWidth=5000 (17 cols), inside-room cells at rows 0-1 cols 5-6.
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			host._grid[0 * GRID_COLS + 5] = CELL_ROOM_BIT;
			host._grid[0 * GRID_COLS + 6] = CELL_ROOM_BIT;
			host._grid[1 * GRID_COLS + 5] = CELL_ROOM_BIT;
			host._grid[1 * GRID_COLS + 6] = CELL_ROOM_BIT;
			host._roomWidth = 5000;
			host._roomDepth = 3000;

			// Backup: roomWidth=3000 (10 cols), inside-room cells at rows 0-1 cols 5-6 (same minCol),
			// furniture at (1200, 0).
			const templateGridArr = Array.from({ length: GRID_CELL_COUNT }, () => 0);
			templateGridArr[0 * GRID_COLS + 5] = CELL_ROOM_BIT;
			templateGridArr[0 * GRID_COLS + 6] = CELL_ROOM_BIT;
			templateGridArr[1 * GRID_COLS + 5] = CELL_ROOM_BIT;
			templateGridArr[1 * GRID_COLS + 6] = CELL_ROOM_BIT;

			ctrl.configurations = [
				{
					name: "DimChange",
					grid: templateGridArr,
					zones: [
						{
							type: "default" as const,
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
					],
					roomWidth: 3000,
					roomDepth: 3000,
					furniture: [
						{
							id: "f1",
							type: "icon" as const,
							icon: "mdi:sofa",
							label: "sofa",
							x: 1200,
							y: 0,
							width: 600,
							height: 400,
							rotation: 0,
							lockAspect: false,
						},
					],
				},
			];

			const applySpy = vi
				.spyOn(ctrl, "applyLayout")
				.mockResolvedValue(undefined);
			await ctrl.loadConfiguration("DimChange");

			// Offset (0, 0); dim correction +1200 mm → furniture at (2400, 0).
			expect(host._furniture).toHaveLength(1);
			expect(host._furniture[0].x).toBe(2400);
			expect(host._furniture[0].y).toBe(0);
			// roomWidth/roomDepth preserved at current values (not 3000 from backup).
			expect(host._roomWidth).toBe(5000);

			applySpy.mockRestore();
		});

		it("throws when a named slot is not null and not an object", async () => {
			ctrl.configurations = [
				{
					name: "BadNamedNonObject",
					grid: TEMPLATE_DATA.grid,
					zones: [
						{ type: "default" },
						"not an object",
						null,
						null,
						null,
						null,
						null,
						null,
					],
					roomWidth: 2400,
					roomDepth: 3600,
				} as any,
			];
			await expect(ctrl.loadConfiguration("BadNamedNonObject")).rejects.toThrow(
				/old format/,
			);
		});
	});

	describe("deleteConfiguration()", () => {
		beforeEach(() => {
			// Mock list_configurations response for the refresh after delete
			host.hass.callWS.mockResolvedValue({ configurations: {} });
		});

		it("calls delete_configuration WS and refreshes cache", async () => {
			await ctrl.deleteConfiguration("Alpha");
			const deleteCall = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0].type === "eppgrid/delete_configuration",
			);
			expect(deleteCall).toBeDefined();
			expect(deleteCall![0].name).toBe("Alpha");
			// Should also refresh
			const listCalls = host.hass.callWS.mock.calls.filter(
				(c: any[]) => c[0].type === "eppgrid/list_configurations",
			);
			expect(listCalls.length).toBeGreaterThanOrEqual(1);
		});

		it("calls requestUpdate after delete", async () => {
			await ctrl.deleteConfiguration("Alpha");
			expect(host.requestUpdate).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// applyLayout() — zone_slots serialization
	// =========================================================================
	describe("applyLayout() zone_slots serialization", () => {
		beforeEach(() => {
			// Re-create the host with the extra fields applyLayout reads.
			host = mockHost({
				_selectedMac: "AA:BB:CC:DD:EE:FF",
				_targetAutoDistance: false,
				_staticAutoDistance: false,
			});
			ctrl = new GridStateController(host as any);
			host._grid = new Uint8Array(GRID_CELL_COUNT);
			// Paint a single inside cell for zone 1 so it isn't pruned.
			host._grid[0] = CELL_ROOM_BIT;
			host._grid[1] = CELL_ROOM_BIT | (1 << 1);
			host.hass.callWS.mockResolvedValue({});
		});

		it("does not mutate _zoneConfigs when set_room_layout fails", async () => {
			// Pre-fix: applyLayout pruned _zoneConfigs in place before calling
			// callWS. A WS failure left the panel claiming the prune happened
			// but the device still had the old zones, so the next save sent
			// "remove this zone" payloads that mismatched device state.
			host._zoneConfigs = [
				{
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				{
					name: "Zone 1",
					color: ZONE_COLORS[0],
					type: "default",
				} as ZoneConfig,
				// Slot 2 has zero painted cells; expected to be pruned only on success.
				{
					name: "Zone 2",
					color: ZONE_COLORS[1],
					type: "default",
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
			];
			const before = host._zoneConfigs.map((z: any) =>
				z === null ? null : { ...z },
			);
			host.hass.callWS.mockRejectedValue(new Error("ws fail"));

			await expect(ctrl.applyLayout()).rejects.toThrow();

			expect(host._zoneConfigs).toEqual(before);
		});

		it("does not mutate _furniture when set_room_layout fails", async () => {
			host._zoneConfigs = [
				{
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				{
					name: "Zone 1",
					color: ZONE_COLORS[0],
					type: "default",
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			// One in-bounds, one outside the painted room.
			host._furniture = [
				{
					id: "in",
					type: "icon",
					icon: "mdi:bed",
					label: "Bed",
					x: 0,
					y: 0,
					width: 600,
					height: 600,
					rotation: 0,
					lockAspect: false,
				},
				{
					id: "out",
					type: "icon",
					icon: "mdi:lamp",
					label: "Lamp",
					x: 1_000_000,
					y: 1_000_000,
					width: 600,
					height: 600,
					rotation: 0,
					lockAspect: false,
				},
			];
			const before = host._furniture.map((f: any) => ({ ...f }));
			host.hass.callWS.mockRejectedValue(new Error("ws fail"));

			await expect(ctrl.applyLayout()).rejects.toThrow();

			expect(host._furniture.map((f: any) => f.id)).toEqual(
				before.map((f: any) => f.id),
			);
		});

		it("omits timing fields for non-custom zone 0 in set_room_layout payload", async () => {
			host._zoneConfigs = [
				{
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				{
					name: "Zone 1",
					color: ZONE_COLORS[0],
					type: "default",
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.applyLayout();
			const call = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0]?.type === "eppgrid/set_room_layout",
			);
			const slots = call![0].zone_slots;
			expect(slots[0]).toEqual({ type: "default" });
			expect(slots[0]).not.toHaveProperty("trigger");
			expect(slots[0]).not.toHaveProperty("timeout");
		});

		it("includes timing fields for custom zone 0 in set_room_layout payload", async () => {
			host._zoneConfigs = [
				{
					type: "custom",
					trigger: 6,
					renew: 4,
					timeout: 20,
					handoff_timeout: 5,
				},
				{
					name: "Zone 1",
					color: ZONE_COLORS[0],
					type: "default",
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.applyLayout();
			const call = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0]?.type === "eppgrid/set_room_layout",
			);
			expect(call![0].zone_slots[0]).toEqual({
				type: "custom",
				trigger: 6,
				renew: 4,
				timeout: 20,
				handoff_timeout: 5,
			});
		});

		it("omits timing fields for non-custom named zone in set_room_layout payload", async () => {
			host._zoneConfigs = [
				{
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				{
					name: "Hallway",
					color: ZONE_COLORS[1],
					type: "transit",
					trigger: 3,
					renew: 2,
					timeout: 3,
					handoff_timeout: 1,
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.applyLayout();
			const call = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0]?.type === "eppgrid/set_room_layout",
			);
			const z1 = call![0].zone_slots[1];
			expect(z1).toEqual({
				name: "Hallway",
				color: ZONE_COLORS[1],
				type: "transit",
			});
			expect(z1).not.toHaveProperty("trigger");
			expect(z1).not.toHaveProperty("timeout");
		});

		it("includes timing fields for custom named zone in set_room_layout payload", async () => {
			host._zoneConfigs = [
				{
					type: "default",
					trigger: 5,
					renew: 3,
					timeout: 10,
					handoff_timeout: 3,
				},
				{
					name: "Lab",
					color: ZONE_COLORS[2],
					type: "custom",
					trigger: 8,
					renew: 4,
					timeout: 45,
					handoff_timeout: 12,
				} as ZoneConfig,
				null,
				null,
				null,
				null,
				null,
				null,
			];
			await ctrl.applyLayout();
			const call = host.hass.callWS.mock.calls.find(
				(c: any[]) => c[0]?.type === "eppgrid/set_room_layout",
			);
			expect(call![0].zone_slots[1]).toEqual({
				name: "Lab",
				color: ZONE_COLORS[2],
				type: "custom",
				trigger: 8,
				renew: 4,
				timeout: 45,
				handoff_timeout: 12,
			});
		});
	});

	// =========================================================================
	// applyPaintToCell(index)
	// =========================================================================
	describe("applyPaintToCell(index)", () => {
		it("does nothing when _activeZone is null", () => {
			host._activeZone = null;
			const originalGrid = new Uint8Array(host._grid);
			ctrl.applyPaintToCell(5);
			expect(host._grid).toEqual(originalGrid);
		});

		it("paints an inside cell with an active zone-0 stroke (set action)", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			// After a "set" on zone-0, the cell should be marked inside (CELL_ROOM_BIT)
			expect(host._grid[5] & 0x01).toBe(1);
		});

		it("creates a new Uint8Array (immutable update)", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			const before = host._grid;
			ctrl.applyPaintToCell(5);
			expect(host._grid).not.toBe(before);
		});

		it("marks the host as dirty", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			expect(host._dirty).toBe(true);
		});

		it("calls requestUpdate", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			expect(host.requestUpdate).toHaveBeenCalled();
		});

		it("paints a zone onto an inside cell", () => {
			// First make cell 5 an inside cell (zone 0)
			host._grid[5] = CELL_ROOM_BIT;
			host._activeZone = 1;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			// Zone 1 bits: inside=1, zone=1 → 0x03
			expect(host._grid[5]).toBe(0x03);
		});

		it("does not modify an outside cell when painting a zone", () => {
			// Cell 5 is outside (0x00)
			host._activeZone = 1;
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			// applyPaintToCell returns null for outside cells — grid unchanged
			expect(host._grid[5]).toBe(0x00);
		});

		it("does not change _roomWidth when painting zone-0 boundary cells", () => {
			host._activeZone = 0;
			host._paintAction = "set";
			host._roomWidth = 3000;
			host._roomDepth = 3000;
			// Paint a cell far from the room center — grid bounds would differ from calibrated dims
			ctrl.applyPaintToCell(0);
			// Calibrated room dimensions must be preserved (perspective depends on them)
			expect(host._roomWidth).toBe(3000);
			expect(host._roomDepth).toBe(3000);
			expect(host.requestUpdate).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// Overlay painting via onCellMouseDown / applyPaintToCell
	// =========================================================================
	describe("overlay painting", () => {
		beforeEach(() => {
			host._grid[5] = CELL_ROOM_BIT;
			host._overlayMode = "interference";
			vi.spyOn(window, "addEventListener").mockImplementation(() => {});
		});

		it("onCellMouseDown in interference mode paints CELL_OVERLAY_INTERFERENCE", () => {
			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			expect(cellOverlay(host._grid[5])).toBe(CELL_OVERLAY_INTERFERENCE);
			expect(host._dirty).toBe(true);
		});

		it("onCellMouseDown in interference mode toggles off when already set", () => {
			host._grid[5] = cellSetOverlay(CELL_ROOM_BIT, CELL_OVERLAY_INTERFERENCE);
			ctrl.onCellMouseDown(5);
			expect(host._paintAction).toBe("clear");
			expect(cellOverlay(host._grid[5])).toBe(CELL_OVERLAY_NONE);
		});

		it("onCellMouseDown in suppress mode paints CELL_OVERLAY_SUPPRESS", () => {
			host._overlayMode = "suppress";
			ctrl.onCellMouseDown(5);
			expect(cellOverlay(host._grid[5])).toBe(CELL_OVERLAY_SUPPRESS);
		});

		it("onCellMouseDown in entry mode paints CELL_OVERLAY_ENTRY", () => {
			host._overlayMode = "entry";
			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			expect(cellOverlay(host._grid[5])).toBe(CELL_OVERLAY_ENTRY);
		});

		it("applyPaintToCell in interference mode sets overlay", () => {
			host._paintAction = "set";
			ctrl.applyPaintToCell(5);
			expect(cellOverlay(host._grid[5])).toBe(CELL_OVERLAY_INTERFERENCE);
			expect(host._dirty).toBe(true);
		});

		it("applyPaintToCell clears when paintAction is clear", () => {
			host._grid[5] = cellSetOverlay(CELL_ROOM_BIT, CELL_OVERLAY_INTERFERENCE);
			host._paintAction = "clear";
			ctrl.applyPaintToCell(5);
			expect(cellOverlay(host._grid[5])).toBe(CELL_OVERLAY_NONE);
		});
	});

	// =========================================================================
	// Lifecycle stubs
	// =========================================================================
	describe("lifecycle", () => {
		it("hostConnected does not throw", () => {
			expect(() => ctrl.hostConnected()).not.toThrow();
		});

		it("hostDisconnected does not throw", () => {
			expect(() => ctrl.hostDisconnected()).not.toThrow();
		});
	});

	// =========================================================================
	// initGridFromRoom()
	// =========================================================================
	describe("initGridFromRoom()", () => {
		it("initializes _grid from the host room dimensions", () => {
			host._roomWidth = 3000;
			host._roomDepth = 4000;
			ctrl.initGridFromRoom();
			expect(host._grid.length).toBe(GRID_CELL_COUNT);
			// At least some cells should be marked inside
			const insideCount = Array.from(host._grid).filter(
				(v) => v & CELL_ROOM_BIT,
			).length;
			expect(insideCount).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// onCellMouseDown / onUp lambda coverage
	// =========================================================================
	describe("onCellMouseDown mouseup cleanup", () => {
		it("zone painting: mouseup clears isPainting via onUp lambda", () => {
			host._sidebarTab = "zones";
			host._activeZone = 1;
			host._grid[5] = CELL_ROOM_BIT;

			// Capture the onUp handler registered via addEventListener
			let capturedHandler: (() => void) | null = null;
			const addSpy = vi
				.spyOn(window, "addEventListener")
				.mockImplementation((_evt: string, handler: any) => {
					capturedHandler = handler;
				});

			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			expect(capturedHandler).not.toBeNull();

			// Invoke the captured onUp handler
			capturedHandler!();
			expect(host._isPainting).toBe(false);

			addSpy.mockRestore();
		});

		it("interference painting: mouseup clears isPainting via onUp lambda", () => {
			host._overlayMode = "interference";
			host._grid[5] = CELL_ROOM_BIT;

			let capturedHandler: (() => void) | null = null;
			const addSpy = vi
				.spyOn(window, "addEventListener")
				.mockImplementation((_evt: string, handler: any) => {
					capturedHandler = handler;
				});

			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			expect(capturedHandler).not.toBeNull();

			capturedHandler!();
			expect(host._isPainting).toBe(false);

			addSpy.mockRestore();
		});

		it("entry painting: mouseup clears isPainting via onUp lambda", () => {
			host._overlayMode = "entry";
			host._grid[5] = CELL_ROOM_BIT;

			let capturedHandler: (() => void) | null = null;
			const addSpy = vi
				.spyOn(window, "addEventListener")
				.mockImplementation((_evt: string, handler: any) => {
					capturedHandler = handler;
				});

			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			expect(capturedHandler).not.toBeNull();

			capturedHandler!();
			expect(host._isPainting).toBe(false);

			addSpy.mockRestore();
		});
	});

	// =========================================================================
	// Zone painting tab guard
	// =========================================================================
	describe("zone painting tab guard", () => {
		it("does not start zone painting on overlays tab", () => {
			host._sidebarTab = "overlays";
			host._activeZone = 1;
			host._grid[5] = CELL_ROOM_BIT;

			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(false);
		});

		it("does not start zone painting on furniture tab when activeZone is set", () => {
			host._sidebarTab = "furniture";
			host._activeZone = 1;

			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(false);
			expect(host._selectedFurnitureId).toBeNull();
		});

		it("starts zone painting on zones tab", () => {
			host._sidebarTab = "zones";
			host._activeZone = 1;
			host._grid[5] = CELL_ROOM_BIT;

			ctrl.onCellMouseDown(5);
			expect(host._isPainting).toBe(true);
			// Clean up the mouseup listener
			window.dispatchEvent(new Event("mouseup"));
		});
	});

	describe("onFurniturePointerDown rotation", () => {
		it("finds furniture item through nested shadow DOMs for rotation center", () => {
			const item: FurnitureItem = {
				id: "f1",
				type: "sofa-2" as any,
				icon: "",
				label: "",
				x: 500,
				y: 500,
				width: 600,
				height: 300,
				rotation: 45,
				lockAspect: false,
			};
			host._furniture = [item];

			// Mock furniture item element with getBoundingClientRect
			const furnitureEl = document.createElement("div");
			furnitureEl.classList.add("furniture-item");
			furnitureEl.setAttribute("data-id", "f1");
			furnitureEl.getBoundingClientRect = () => ({
				left: 200,
				top: 100,
				width: 60,
				height: 30,
				right: 260,
				bottom: 130,
				x: 200,
				y: 100,
				toJSON: () => {},
			});

			// Build nested shadow DOM mock:
			// host.shadowRoot -> epp-grid -> shadowRoot -> epp-furniture-overlay -> shadowRoot -> .furniture-item
			const overlayShadow = document.createElement("div");
			overlayShadow.appendChild(furnitureEl);

			const overlay = document.createElement("div");
			Object.defineProperty(overlay, "shadowRoot", { value: overlayShadow });

			const eppGridShadow = document.createElement("div");
			eppGridShadow.appendChild(overlay);
			const origGridQS = eppGridShadow.querySelector.bind(eppGridShadow);
			eppGridShadow.querySelector = ((sel: string) => {
				if (sel === "epp-furniture-overlay") return overlay;
				return origGridQS(sel);
			}) as any;

			const eppGrid = document.createElement("div");
			Object.defineProperty(eppGrid, "shadowRoot", { value: eppGridShadow });

			const hostShadow = document.createElement("div");
			hostShadow.appendChild(eppGrid);
			const origHostQS = hostShadow.querySelector.bind(hostShadow);
			hostShadow.querySelector = ((sel: string) => {
				if (sel === "epp-grid") return eppGrid;
				return origHostQS(sel);
			}) as any;

			host.shadowRoot = hostShadow as any;

			// Simulate pointerdown for rotation at (250, 130) - right of center
			const ev = new PointerEvent("pointerdown", {
				clientX: 250,
				clientY: 130,
			});

			// Need to mock addEventListener on window
			const addSpy = vi
				.spyOn(window, "addEventListener")
				.mockImplementation(() => {});

			ctrl.onFurniturePointerDown(ev, "f1", "rotate");

			addSpy.mockRestore();

			// Verify drag state was created with correct center
			expect(host._dragState).not.toBeNull();
			expect(host._dragState.centerX).toBe(230); // 200 + 60/2
			expect(host._dragState.centerY).toBe(115); // 100 + 30/2
			expect(host._dragState.startAngle).not.toBe(0);
		});
	});

	describe("onFurnitureDrag", () => {
		it("finds .grid through nested epp-grid shadow DOM", () => {
			// Set up a furniture item and drag state
			const item: FurnitureItem = {
				id: "f1",
				type: "sofa-2" as any,
				icon: "",
				label: "",
				x: 500,
				y: 500,
				width: 600,
				height: 300,
				rotation: 0,
				lockAspect: false,
			};
			host._furniture = [item];
			host._dragState = {
				id: "f1",
				type: "move",
				startX: 100,
				startY: 100,
				origX: 500,
				origY: 500,
				origW: 600,
				origH: 300,
				origRot: 0,
			};

			// Mock the nested shadow DOM: host.shadowRoot -> epp-grid -> shadowRoot -> .grid -> cell
			const cellEl = document.createElement("div");
			Object.defineProperty(cellEl, "offsetWidth", { value: 30 });

			const gridDiv = document.createElement("div");
			gridDiv.classList.add("grid");
			gridDiv.appendChild(cellEl);

			const eppGridShadow = document.createElement("div");
			eppGridShadow.appendChild(gridDiv);

			const eppGrid = document.createElement("div");
			// Mock epp-grid's shadowRoot
			Object.defineProperty(eppGrid, "shadowRoot", { value: eppGridShadow });

			const hostShadow = document.createElement("div");
			hostShadow.appendChild(eppGrid);
			// querySelector("epp-grid") needs to find our mock element
			const origQS = hostShadow.querySelector.bind(hostShadow);
			hostShadow.querySelector = ((sel: string) => {
				if (sel === "epp-grid") return eppGrid;
				return origQS(sel);
			}) as any;

			host.shadowRoot = hostShadow as any;

			// Simulate a drag event
			const ev = new PointerEvent("pointermove", {
				clientX: 130,
				clientY: 120,
			});
			ctrl.onFurnitureDrag(ev);

			// The furniture item should have moved (not silently aborted)
			const updated = host._furniture[0];
			expect(updated.x).not.toBe(500);
		});
	});
});

describe("serializeFurniture", () => {
	it("maps exactly the 9 wire fields and drops the local-only id", () => {
		const item: FurnitureItem = {
			id: "f_local_123",
			type: "svg",
			icon: "armchair",
			label: "furniture.armchair",
			x: 150,
			y: 600,
			width: 800,
			height: 900,
			rotation: 45,
			lockAspect: true,
		};
		expect(serializeFurniture(item)).toEqual({
			type: "svg",
			icon: "armchair",
			label: "furniture.armchair",
			x: 150,
			y: 600,
			width: 800,
			height: 900,
			rotation: 45,
			lockAspect: true,
		});
	});
});
