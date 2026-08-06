import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../eppgrid-card.js";
import {
	__resetEntitySuggestionCache,
	applyCardDefaults,
	clampOpacity,
	EppGridCard,
	getEntitySuggestion,
	rgbCss,
} from "../eppgrid-card.js";
import {
	persistCardHeatmapEnabled,
	readCardHeatmapEnabled,
	STORAGE_KEY_CARD_HEATMAP_ENABLED,
} from "../lib/storage.js";

// A calibrated snapshot so the map renders (parseConfig needs a perspective).
// NOTE: parseCalibration requires exactly 8 numbers — [1, 0, 0, 0, 1, 0, 0, 0]
// is the identity-like 8-element form used throughout the test suite.
const CALIBRATED = {
	calibration: {
		perspective: [1, 0, 0, 0, 1, 0, 0, 0],
		room_width: 3000,
		room_depth: 3000,
	},
};

// Each test uses a UNIQUE device_id — the OverviewStore registry is a
// module-level singleton that persists across tests in this file.
function makeHass() {
	const subs: { params: any; cb: (msg: unknown) => void }[] = [];
	const subscribeMessage = vi.fn(
		async (cb: (msg: unknown) => void, params: any) => {
			subs.push({ params, cb });
			return vi.fn();
		},
	);
	return {
		hass: { connection: { subscribeMessage }, locale: { language: "en" } },
		// Routed to the overview subscription specifically — some configs (e.g.
		// show_heatmap: "on"/pre-seeded "toggle") also open a heatmap subscription
		// on this same fake connection, and a plain "last subscriber wins" callback
		// would misroute snapshot/data messages to it instead of the overview one.
		emit: (m: unknown) =>
			subs
				.filter((s) => s.params?.type === "eppgrid/overview/subscribe")
				.at(-1)
				?.cb(m),
		subscribeMessage,
	};
}

async function mount(
	config: any,
	h = makeHass(),
	snapshot: unknown = CALIBRATED,
): Promise<EppGridCard> {
	const el = document.createElement("eppgrid-card") as EppGridCard;
	el.setConfig(config);
	el.hass = h.hass as never;
	document.body.appendChild(el);
	await el.updateComplete;
	h.emit({ snapshot });
	await el.updateComplete;
	return el;
}

afterEach(() => document.body.replaceChildren());

describe("rgbCss", () => {
	it("formats a valid [r,g,b] triple as a CSS rgb() string", () => {
		expect(rgbCss([10, 20, 30])).toBe("rgb(10, 20, 30)");
	});

	it("returns undefined when unset", () => {
		expect(rgbCss(undefined)).toBeUndefined();
	});

	it("returns undefined for a malformed triple (graceful fallback)", () => {
		// Hand-written YAML can supply a bad value the TS type doesn't enforce.
		expect(
			rgbCss([10, 20] as unknown as [number, number, number]),
		).toBeUndefined();
		expect(
			rgbCss(["a", 2, 3] as unknown as [number, number, number]),
		).toBeUndefined();
	});
});

describe("applyCardDefaults", () => {
	it("returns all defaults when no config is provided", () => {
		const result = applyCardDefaults({});
		expect(result.type).toBe("custom:eppgrid-card");
		expect(result.device_id).toBe("");
		expect(result.show_map).toBe(true);
		expect(result.show_sensors).toBe(true);
		expect(result.layout).toBe("vertical");
		expect(result.show_grid).toBe(true);
		expect(result.room_color).toBeUndefined();
		expect(result.show_furniture).toBe(true);
		expect(result.show_overlays).toBe(true);
		// presence absent → all five true
		expect(result.sensors.presence.occupancy).toBe(true);
		expect(result.sensors.presence.static_presence).toBe(true);
		expect(result.sensors.presence.motion_presence).toBe(true);
		expect(result.sensors.presence.target_presence).toBe(true);
		expect(result.sensors.presence.mmwave).toBe(true);
		expect(result.sensors.zones).toBe(true);
		expect(result.sensors.environmental.temperature).toBe(true);
		expect(result.sensors.environmental.humidity).toBe(true);
		expect(result.sensors.environmental.illuminance).toBe(true);
		expect(result.sensors.environmental.co2).toBe(true);
	});

	it("preserves show_map: false", () => {
		const result = applyCardDefaults({ show_map: false });
		expect(result.show_map).toBe(false);
	});

	it("preserves show_grid: false", () => {
		const result = applyCardDefaults({ show_grid: false });
		expect(result.show_grid).toBe(false);
	});

	it("passes room_color through", () => {
		const result = applyCardDefaults({ room_color: [10, 20, 30] });
		expect(result.room_color).toEqual([10, 20, 30]);
	});

	it("returns all env keys true when sensors.environmental is absent", () => {
		const result = applyCardDefaults({ sensors: {} });
		expect(result.sensors.environmental.temperature).toBe(true);
		expect(result.sensors.environmental.humidity).toBe(true);
		expect(result.sensors.environmental.illuminance).toBe(true);
		expect(result.sensors.environmental.co2).toBe(true);
	});

	it("returns all presence keys true when sensors.presence is absent", () => {
		const result = applyCardDefaults({ sensors: {} });
		expect(result.sensors.presence.occupancy).toBe(true);
		expect(result.sensors.presence.static_presence).toBe(true);
		expect(result.sensors.presence.motion_presence).toBe(true);
		expect(result.sensors.presence.target_presence).toBe(true);
		expect(result.sensors.presence.mmwave).toBe(true);
	});

	it("returns only occupancy true when presence has only occupancy: true", () => {
		const result = applyCardDefaults({
			sensors: { presence: { occupancy: true } },
		});
		expect(result.sensors.presence.occupancy).toBe(true);
		expect(result.sensors.presence.static_presence).toBe(false);
		expect(result.sensors.presence.motion_presence).toBe(false);
		expect(result.sensors.presence.target_presence).toBe(false);
		expect(result.sensors.presence.mmwave).toBe(false);
	});

	it("returns only temperature true when environmental has only temperature: true", () => {
		const result = applyCardDefaults({
			sensors: { environmental: { temperature: true } },
		});
		expect(result.sensors.environmental.temperature).toBe(true);
		expect(result.sensors.environmental.humidity).toBe(false);
		expect(result.sensors.environmental.illuminance).toBe(false);
		expect(result.sensors.environmental.co2).toBe(false);
	});

	it("preserves device_id", () => {
		const result = applyCardDefaults({ device_id: "my-device" });
		expect(result.device_id).toBe("my-device");
	});

	it("defaults primary and secondary to empty strings", () => {
		const result = applyCardDefaults({});
		expect(result.primary).toBe("");
		expect(result.secondary).toBe("");
	});

	it("preserves primary and secondary", () => {
		const result = applyCardDefaults({ primary: "{{ x }}", secondary: "sub" });
		expect(result.primary).toBe("{{ x }}");
		expect(result.secondary).toBe("sub");
	});

	it("show_heatmap defaults to 'off' and normalizes legacy booleans", () => {
		expect(applyCardDefaults({}).show_heatmap).toBe("off");
		expect(applyCardDefaults({ show_heatmap: false }).show_heatmap).toBe("off");
		expect(applyCardDefaults({ show_heatmap: true }).show_heatmap).toBe("on");
	});

	it("show_heatmap passes through mode strings", () => {
		expect(applyCardDefaults({ show_heatmap: "off" }).show_heatmap).toBe("off");
		expect(applyCardDefaults({ show_heatmap: "on" }).show_heatmap).toBe("on");
		expect(applyCardDefaults({ show_heatmap: "toggle" }).show_heatmap).toBe(
			"toggle",
		);
	});

	it("defaults floor_plan to undefined and opacity to 100", () => {
		const result = applyCardDefaults({});
		expect(result.floor_plan).toBeUndefined();
		expect(result.floor_plan_opacity).toBe(100);
	});

	it("passes floor_plan through and clamps opacity", () => {
		expect(
			applyCardDefaults({ floor_plan: "/api/image/serve/x/original" })
				.floor_plan,
		).toBe("/api/image/serve/x/original");
		expect(
			applyCardDefaults({ floor_plan_opacity: 60 }).floor_plan_opacity,
		).toBe(60);
		expect(
			applyCardDefaults({ floor_plan_opacity: 250 }).floor_plan_opacity,
		).toBe(100);
		expect(
			applyCardDefaults({ floor_plan_opacity: -5 }).floor_plan_opacity,
		).toBe(0);
	});

	it("clampOpacity clamps and defaults", () => {
		expect(clampOpacity(undefined)).toBe(100);
		expect(clampOpacity(50)).toBe(50);
		expect(clampOpacity(999)).toBe(100);
		expect(clampOpacity(-1)).toBe(0);
		expect(clampOpacity(Number.NaN)).toBe(100);
	});
});

describe("eppgrid-card setConfig", () => {
	it("renders a placeholder when no device_id is configured", async () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card" } as any);
		const h = makeHass();
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
	});

	it("renders a placeholder when both map and sensors are disabled", async () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "d",
			show_map: false,
			show_sensors: false,
		} as any);
		const h = makeHass();
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeNull();
	});

	it("registers the card type in window.customCards", () => {
		const entry = (window as any).customCards?.find(
			(c: any) => c.type === "eppgrid-card",
		);
		expect(entry).toBeTruthy();
		expect(entry.name).toContain("Everything Presence Pro Grid");
	});

	it("does not label the card as Beta in the picker", () => {
		const entry = (window as any).customCards?.find(
			(c: any) => c.type === "eppgrid-card",
		);
		expect(entry.name).not.toContain("(Beta)");
	});
});

describe("eppgrid-card rendering", () => {
	it("renders only the map when show_sensors is false", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-map",
			show_sensors: false,
		});
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeNull();
	});

	it("hides the map dimensions caption (showDimensions=false on epp-grid)", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-no-dims",
			show_sensors: false,
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			showDimensions: boolean;
		};
		expect(grid).toBeTruthy();
		expect(grid.showDimensions).toBe(false);
	});

	it("renders only the sensors when show_map is false", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-sensors",
			show_map: false,
		});
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeTruthy();
	});

	it("shows the uncalibrated placeholder when the snapshot has no perspective", async () => {
		const el = await mount(
			{ type: "custom:eppgrid-card", device_id: "card-uncal" },
			makeHass(),
			{},
		);
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
	});

	it("passes empty furniture array to epp-grid when show_furniture is false", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-no-furniture",
			show_furniture: false,
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid).toBeTruthy();
		expect((grid as any).furniture).toEqual([]);
	});

	it("uses targetMaxDistance when targetAutoDistance is false in the snapshot", async () => {
		const snapshot = {
			calibration: {
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
				room_depth: 3000,
			},
			settings: {
				target_auto_distance: false,
				target_max_distance: 4.0,
			},
		};
		const el = await mount(
			{ type: "custom:eppgrid-card", device_id: "card-max-dist" },
			makeHass(),
			snapshot,
		);
		// The map should render (perspective is valid) — confirms _renderMap ran the manual-distance branch
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid).toBeTruthy();
		// Verify that maxRangeMm was computed as Math.round(4.0 * 1000) = 4000
		expect(grid.maxRangeMm).toBe(4000);
	});

	it("subscribes once via the store and updates on snapshot/data", async () => {
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "card-sub" });
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(h.subscribeMessage).toHaveBeenCalledTimes(1);
		h.emit({ snapshot: CALIBRATED });
		h.emit({
			targets: [],
			sensors: {
				occupancy: true,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			},
			zones: { occupancy: {}, target_counts: {}, frame_count: 1 },
		});
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeTruthy();
		expect(el.shadowRoot!.querySelector("epp-live-sidebar")).toBeTruthy();
	});

	it("getGridOptions adapts to the configured parts", () => {
		const both = document.createElement("eppgrid-card") as EppGridCard;
		both.setConfig({ type: "custom:eppgrid-card", device_id: "card-grid-a" });
		const sensorsOnly = document.createElement("eppgrid-card") as EppGridCard;
		sensorsOnly.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-grid-b",
			show_map: false,
		});
		expect(both.getGridOptions().columns).toBeGreaterThan(
			sensorsOnly.getGridOptions().columns,
		);
	});

	it("getCardSize returns larger size for map-only than sensors-only", () => {
		const mapOnly = document.createElement("eppgrid-card") as EppGridCard;
		mapOnly.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-cs-map",
			show_sensors: false,
		});
		const sensorsOnly = document.createElement("eppgrid-card") as EppGridCard;
		sensorsOnly.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-cs-sensors",
			show_map: false,
		});
		// map adds 6, sensors-only adds 4 to the base of 1
		expect(mapOnly.getCardSize()).toBe(7);
		expect(sensorsOnly.getCardSize()).toBe(5);
	});

	it("keeps the full grid by default (epp-grid not plain)", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-grid-default",
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			plain: boolean;
		};
		expect(grid).toBeTruthy();
		expect(grid.plain).toBe(false);
	});

	it("renders the clean map (epp-grid plain) when show_grid is false", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-grid-off",
			show_grid: false,
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			plain: boolean;
		};
		expect(grid).toBeTruthy();
		expect(grid.plain).toBe(true);
	});

	it("forces the clean map (epp-grid plain) when a floor plan is set, even with show_grid defaulted on", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-grid-floorplan",
			floor_plan: "/api/image/serve/xyz/original",
			// show_grid intentionally omitted — defaults to true.
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			plain: boolean;
		};
		expect(grid).toBeTruthy();
		expect(grid.plain).toBe(true);
	});

	it("tells epp-grid to fill the available width", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-fill",
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			fill: boolean;
		};
		expect(grid.fill).toBe(true);
	});

	it("tells epp-grid not to show target signal strength on the card", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-no-signal",
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			showSignal: boolean;
		};
		expect(grid.showSignal).toBe(false);
	});

	it("tells epp-grid to fade uncovered cells (clean room rectangle)", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-fade-uncovered",
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			fadeUncovered: boolean;
		};
		expect(grid.fadeUncovered).toBe(true);
	});

	it("passes room_color to epp-grid as a CSS rgb() string", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-room-color",
			room_color: [10, 20, 30],
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			roomColor?: string;
		};
		expect(grid.roomColor).toBe("rgb(10, 20, 30)");
	});

	it("leaves epp-grid roomColor undefined when room_color is unset", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-no-room-color",
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			roomColor?: string;
		};
		expect(grid.roomColor).toBeUndefined();
	});

	it("passes floor_plan and normalised opacity to epp-grid", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "d1",
			floor_plan: "/api/image/serve/xyz/original",
			floor_plan_opacity: 40,
		} as any);
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			floorPlan?: string;
			floorPlanOpacity: number;
		};
		expect(grid.floorPlan).toBe("/api/image/serve/xyz/original");
		expect(grid.floorPlanOpacity).toBeCloseTo(0.4);
	});

	it("stacks map over sensors by default (vertical layout)", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-default-vertical",
		});
		const overview = el.shadowRoot!.querySelector(".overview");
		expect(overview?.classList.contains("overview--vertical")).toBe(true);
		expect(overview?.classList.contains("overview--horizontal")).toBe(false);
	});

	it("hides the per-row info (?) tips in the compact card", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-no-tips",
		});
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as {
			showInfoTips: boolean;
		} | null;
		expect(sidebar).toBeTruthy();
		expect(sidebar!.showInfoTips).toBe(false);
	});

	it("stretches the stacked map to a definite width in the narrow fallback", () => {
		// Regression: the @container(max-width:500px) fallback flips the horizontal
		// layout to a column. Without resetting align-items (the row layout sets
		// flex-start), the stacked map keeps no definite width, so the aspect-locked
		// epp-grid sizes off its height path and overflows / collapses instead of
		// fitting the card. The fallback must stretch children to the card width.
		const css = (
			EppGridCard as unknown as { styles: { cssText?: string }[] }
		).styles
			.map((s) => s.cssText ?? "")
			.join("\n");
		const q = css.slice(css.indexOf("@container"));
		expect(q).toMatch(/flex-direction:\s*column/);
		expect(q).toMatch(/align-items:\s*stretch/);
	});

	it("getConfigElement and getStubConfig return expected values", () => {
		// Import EppGridCard class via customElements registry (avoids importing the class directly)
		const CardClass = customElements.get("eppgrid-card") as typeof EppGridCard;
		const editor = CardClass.getConfigElement();
		expect(editor.tagName.toLowerCase()).toBe("eppgrid-card-editor");
		const stub = CardClass.getStubConfig();
		expect(stub).toHaveProperty("device_id", "");
		// New cards default to "map only" — sensors off. Set explicitly on the
		// stub (not via applyCardDefaults) so existing cards, which omit the key,
		// keep their sensors-on default and are unaffected on upgrade.
		expect(stub).toHaveProperty("show_sensors", false);
	});

	it("hass getter returns the assigned hass object", () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "card-getter" });
		const h = makeHass();
		el.hass = h.hass as never;
		expect(el.hass).toBe(h.hass);
	});

	it("shows offline banner when data.available is false", async () => {
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "card-offline" });
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emit({ available: false });
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".offline")).toBeTruthy();
	});

	it("passes envKeys to epp-live-sidebar when sensors.environmental is configured", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-envkeys",
				show_map: false,
				sensors: { environmental: { temperature: true, co2: false } },
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		// envKeys should only include the true entries
		expect(sidebar.envKeys).toEqual(["temperature"]);
	});

	it("passes presenceKeys=null to epp-live-sidebar when sensors.presence is absent", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-preskeys-null",
				show_map: false,
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		expect(sidebar.presenceKeys).toBeNull();
	});

	it("passes presenceKeys=['occupancy'] when only occupancy is true", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-preskeys-occ",
				show_map: false,
				sensors: { presence: { occupancy: true } },
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		expect(sidebar.presenceKeys).toEqual(["occupancy"]);
	});

	it("passes presenceKeys=[] when all presence keys are false", async () => {
		const el = await mount(
			{
				type: "custom:eppgrid-card",
				device_id: "card-preskeys-empty",
				show_map: false,
				sensors: { presence: {} },
			},
			makeHass(),
			CALIBRATED,
		);
		const sidebar = el.shadowRoot!.querySelector("epp-live-sidebar") as any;
		expect(sidebar).toBeTruthy();
		expect(sidebar.presenceKeys).toEqual([]);
	});
});

describe("eppgrid-card _maybeResubscribe teardown", () => {
	it("tears down the subscription when device_id is cleared to empty string", async () => {
		// Use a unique device_id so the module-global OverviewStore registry
		// doesn't collide with other tests.
		const unsub = vi.fn();
		const subscribeMessage = vi.fn(async (_cb: unknown) => unsub);
		const hass = {
			connection: { subscribeMessage },
			locale: { language: "en" },
		};

		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-unsub-clear",
		});
		el.hass = hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		// Allow subscribeMessage promise to resolve so the store stores the unsub.
		await Promise.resolve();

		// Verify we subscribed exactly once.
		expect(subscribeMessage).toHaveBeenCalledTimes(1);

		// Reconfigure with an empty device_id — this should tear down the subscription.
		el.setConfig({ type: "custom:eppgrid-card", device_id: "" });
		await el.updateComplete;

		// The prior subscription must have been unsubscribed.
		expect(unsub).toHaveBeenCalledTimes(1);
	});
});

describe("eppgrid-card loading vs uncalibrated", () => {
	it("shows loading placeholder when no snapshot has arrived yet", async () => {
		// Mount WITHOUT emitting a snapshot event — _data.snapshot stays null
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-loading-state",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		// Should show loading, NOT uncalibrated
		const placeholder = el.shadowRoot!.querySelector(".placeholder");
		expect(placeholder).toBeTruthy();
		const text = placeholder!.textContent ?? "";
		expect(text).toContain("Loading");
		expect(text).not.toContain("calibrated");
	});

	it("shows uncalibrated placeholder when snapshot has no perspective", async () => {
		// Emit an empty snapshot — snapshot != null but no perspective calibration
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-uncal-state",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emit({ snapshot: {} });
		await el.updateComplete;
		const placeholder = el.shadowRoot!.querySelector(".placeholder");
		expect(placeholder).toBeTruthy();
		const text = placeholder!.textContent ?? "";
		// Should show uncalibrated text, NOT loading text
		expect(text).toContain("calibrated");
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeNull();
	});

	it("shows epp-grid when snapshot has a perspective calibration", async () => {
		// Emit a calibrated snapshot
		const h = makeHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-calibrated-state",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emit({ snapshot: CALIBRATED });
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector("epp-grid")).toBeTruthy();
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeNull();
	});
});

// Routes subscriptions by message type so the overview stream and one or more
// render_template subscriptions can be driven independently in one test.
function makeTemplatingHass() {
	const subs: {
		params: any;
		cb: (msg: unknown) => void;
		unsub: ReturnType<typeof vi.fn>;
	}[] = [];
	const subscribeMessage = vi.fn(
		async (cb: (msg: unknown) => void, params: any) => {
			const entry = { params, cb, unsub: vi.fn() };
			subs.push(entry);
			return entry.unsub;
		},
	);
	return {
		hass: { connection: { subscribeMessage }, locale: { language: "en" } },
		subscribeMessage,
		subs,
		emitTo: (type: string, msg: unknown) =>
			subs
				.filter((s) => s.params.type === type)
				.at(-1)
				?.cb(msg),
	};
}

describe("eppgrid-card templated header", () => {
	it("renders a static primary as the heading without a render_template subscription", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-static-primary",
			primary: "Lounge",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("Lounge");
		expect(h.subs.some((s) => s.params.type === "render_template")).toBe(false);
	});

	it("renders a templated primary and updates on new values", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-tpl-primary",
			primary: "{{ states('sensor.x') }}",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emitTo("render_template", { result: "21.5°C" });
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("21.5°C");
		h.emitTo("render_template", { result: "22.0°C" });
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("22.0°C");
	});

	it("renders secondary below primary", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-secondary",
			primary: "Lounge",
			secondary: "2 people",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("Lounge");
		expect(
			el.shadowRoot!.querySelector(".card-secondary")?.textContent,
		).toContain("2 people");
	});

	it("renders no header block when primary and secondary are empty", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-no-header",
		});
		expect(el.shadowRoot!.querySelector(".card-header")).toBeNull();
	});

	it("renders secondary-only header (no primary div) when primary is empty", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-secondary-only",
			secondary: "2 people",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".card-header")).toBeTruthy();
		expect(el.shadowRoot!.querySelector(".card-primary")).toBeNull();
		expect(
			el.shadowRoot!.querySelector(".card-secondary")?.textContent,
		).toContain("2 people");
	});

	it("renders the template error text instead of crashing", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-tpl-err",
			primary: "{{ nope() }}",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emitTo("render_template", { error: "UndefinedError: nope" });
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("UndefinedError");
	});

	it("shows the header block above the no-device placeholder", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "",
			primary: "Lounge",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("Lounge");
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
	});

	it("shows the header block above the nothing-to-show placeholder", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-nts",
			primary: "Lounge",
			show_map: false,
			show_sensors: false,
		} as never);
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			el.shadowRoot!.querySelector(".card-primary")?.textContent,
		).toContain("Lounge");
		expect(el.shadowRoot!.querySelector(".placeholder")).toBeTruthy();
	});

	it("disposes template subscriptions on disconnect", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-tpl-dispose",
			primary: "{{ states('sensor.x') }}",
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		await Promise.resolve();
		const tpl = h.subs.find((s) => s.params.type === "render_template")!;
		el.remove();
		expect(tpl.unsub).toHaveBeenCalledTimes(1);
	});
});

describe("eppgrid-card heatmap wiring", () => {
	it("opens a heatmap subscription when show_heatmap and show_map are true", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-open",
			show_heatmap: true,
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			h.subs.some(
				(s) => s.params.type === "eppgrid/overview/subscribe_heatmap",
			),
		).toBe(true);
	});

	it("does not open a heatmap subscription when show_heatmap is false", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-off",
			show_heatmap: false,
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			h.subs.some(
				(s) => s.params.type === "eppgrid/overview/subscribe_heatmap",
			),
		).toBe(false);
	});

	it("does not open a heatmap subscription when show_map is false, even if show_heatmap is true", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-no-map",
			show_heatmap: true,
			show_map: false,
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(
			h.subs.some(
				(s) => s.params.type === "eppgrid/overview/subscribe_heatmap",
			),
		).toBe(false);
	});

	it("passes showHeatmap=false and empty heatmapCells to epp-grid when show_heatmap is off", async () => {
		const el = await mount({
			type: "custom:eppgrid-card",
			device_id: "card-heat-props-off",
			show_heatmap: false,
		});
		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			showHeatmap: boolean;
			heatmapCells: number[];
		};
		expect(grid).toBeTruthy();
		expect(grid.showHeatmap).toBe(false);
		expect(grid.heatmapCells).toEqual([]);
	});

	it("feeds heat cells and updates trails from targets into epp-grid when show_heatmap is on", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-live",
			show_heatmap: true,
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emitTo("eppgrid/overview/subscribe", { snapshot: CALIBRATED });
		await el.updateComplete;

		h.emitTo("eppgrid/overview/subscribe_heatmap", { cells: [0, 5, 0, 3] });
		h.emitTo("eppgrid/overview/subscribe", {
			targets: [{ x: 100, y: 200, status: "active" }],
			sensors: {
				occupancy: true,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			},
			zones: { occupancy: {}, target_counts: {}, frame_count: 1 },
		});
		await el.updateComplete;

		const grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			showHeatmap: boolean;
			heatmapCells: number[];
			trails: Array<Array<{ x: number; y: number }>>;
		};
		expect(grid.showHeatmap).toBe(true);
		expect(grid.heatmapCells).toEqual([0, 5, 0, 3]);
		expect(grid.trails[0]).toEqual([{ x: 100, y: 200 }]);
	});

	it("closes the heatmap subscription on disconnectedCallback", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-dispose",
			show_heatmap: true,
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		const heat = h.subs.find(
			(s) => s.params.type === "eppgrid/overview/subscribe_heatmap",
		)!;
		el.remove();
		expect(heat.unsub).toHaveBeenCalledTimes(1);
	});

	it("resets trails when the device changes", async () => {
		const h = makeTemplatingHass();
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-device-a",
			show_heatmap: true,
		});
		el.hass = h.hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		h.emitTo("eppgrid/overview/subscribe", { snapshot: CALIBRATED });
		h.emitTo("eppgrid/overview/subscribe", {
			targets: [{ x: 100, y: 200, status: "active" }],
			sensors: {
				occupancy: true,
				illuminance: null,
				temperature: null,
				humidity: null,
				co2: null,
			},
			zones: { occupancy: {}, target_counts: {}, frame_count: 1 },
		});
		await el.updateComplete;
		let grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			trails: Array<Array<{ x: number; y: number }>>;
		};
		expect(grid.trails[0].length).toBeGreaterThan(0);

		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "card-heat-device-b",
			show_heatmap: true,
		});
		await el.updateComplete;
		h.emitTo("eppgrid/overview/subscribe", { snapshot: CALIBRATED });
		await el.updateComplete;
		grid = el.shadowRoot!.querySelector("epp-grid") as unknown as {
			trails: Array<Array<{ x: number; y: number }>>;
		};
		expect(grid.trails.every((t) => t.length === 0)).toBe(true);
	});
});

describe("heatmap toggle-on-card", () => {
	beforeEach(() => localStorage.clear());

	it("renders no overlay toggle in 'on' mode but still shows the heatmap", async () => {
		const el = await mount({ device_id: "hm-on", show_heatmap: "on" });
		expect(el.shadowRoot!.querySelector(".heatmap-overlay")).toBeNull();
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid.showHeatmap).toBe(true);
	});

	it("renders no overlay toggle in 'off' mode", async () => {
		const el = await mount({ device_id: "hm-off", show_heatmap: "off" });
		expect(el.shadowRoot!.querySelector(".heatmap-overlay")).toBeNull();
	});

	it("renders the overlay toggle in 'toggle' mode, off by default", async () => {
		const el = await mount({ device_id: "hm-t1", show_heatmap: "toggle" });
		const overlay = el.shadowRoot!.querySelector(".heatmap-overlay");
		expect(overlay).toBeTruthy();
		const toggle = overlay!.querySelector("epp-toggle");
		expect(toggle).toBeTruthy();
		// The bare switch carries an accessible name for screen readers.
		expect((toggle as any).controlLabel).toBeTruthy();
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid.showHeatmap).toBe(false);
	});

	it("seeds the toggle from the persisted per-device preference", async () => {
		persistCardHeatmapEnabled("hm-t2", true);
		const el = await mount({ device_id: "hm-t2", show_heatmap: "toggle" });
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid.showHeatmap).toBe(true);
	});

	it("flipping the switch shows the heatmap and persists the choice", async () => {
		const el = await mount({ device_id: "hm-t3", show_heatmap: "toggle" });
		const toggle = el.shadowRoot!.querySelector(
			".heatmap-overlay epp-toggle",
		) as HTMLElement;
		toggle.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: true },
				bubbles: true,
				composed: true,
			}),
		);
		await el.updateComplete;
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid.showHeatmap).toBe(true);
		expect(readCardHeatmapEnabled("hm-t3")).toBe(true);
		expect(
			localStorage.getItem(`${STORAGE_KEY_CARD_HEATMAP_ENABLED}hm-t3`),
		).toBe("1");
	});

	it("treats legacy show_heatmap: true as 'on' — heatmap shown, no overlay switch", async () => {
		const el = await mount({ device_id: "hm-legacy-true", show_heatmap: true });
		expect(el.shadowRoot!.querySelector(".heatmap-overlay")).toBeNull();
		const grid = el.shadowRoot!.querySelector("epp-grid") as any;
		expect(grid.showHeatmap).toBe(true);
	});

	it("re-seeds the toggle from storage when the device changes in toggle mode", async () => {
		persistCardHeatmapEnabled("hm-dev-a", true);
		persistCardHeatmapEnabled("hm-dev-b", false);
		const h = makeHass();
		const el = await mount(
			{ device_id: "hm-dev-a", show_heatmap: "toggle" },
			h,
		);
		expect((el.shadowRoot!.querySelector("epp-grid") as any).showHeatmap).toBe(
			true,
		);

		// Reconfigure to a second device whose stored preference is off. setConfig
		// unconditionally re-seeds _heatmapOn, so the runtime state must follow the
		// new device rather than stay stuck on device A's "on".
		el.setConfig({
			type: "custom:eppgrid-card",
			device_id: "hm-dev-b",
			show_heatmap: "toggle",
		});
		await el.updateComplete;
		h.emit({ snapshot: CALIBRATED });
		await el.updateComplete;
		expect((el.shadowRoot!.querySelector("epp-grid") as any).showHeatmap).toBe(
			false,
		);
	});
});

describe("getEntitySuggestion", () => {
	beforeEach(() => __resetEntitySuggestionCache());

	it("returns null when the entity device_id is not in the EPP set", async () => {
		// Warm the cache with a device list that does NOT include "other-device"
		const hass = {
			callWS: vi
				.fn()
				.mockResolvedValue([{ device_id: "dev1", mac: "AA", name: "X" }]),
			entities: { "binary_sensor.other": { device_id: "other-device" } },
		};
		getEntitySuggestion(hass, "binary_sensor.other"); // kick off load
		// flush microtasks so the promise resolves
		await new Promise((r) => setTimeout(r, 0));
		expect(getEntitySuggestion(hass, "binary_sensor.other")).toBeNull();
	});

	it("returns null when the entity has no registry entry or no device_id", async () => {
		const hass = {
			callWS: vi
				.fn()
				.mockResolvedValue([{ device_id: "dev1", mac: "AA", name: "X" }]),
			entities: {},
		};
		getEntitySuggestion(hass, "binary_sensor.unknown"); // kick off load
		await new Promise((r) => setTimeout(r, 0));
		expect(getEntitySuggestion(hass, "binary_sensor.unknown")).toBeNull();
	});

	it("returns null on first call then suggests the card after the cache warms", async () => {
		const hass = {
			callWS: vi
				.fn()
				.mockResolvedValue([{ device_id: "dev1", mac: "AA", name: "X" }]),
			entities: { "binary_sensor.epp_occupancy": { device_id: "dev1" } },
		};
		// First call: cache not yet populated → null
		const first = getEntitySuggestion(hass, "binary_sensor.epp_occupancy");
		expect(first).toBeNull();
		// Flush microtasks so callWS resolves and cache populates
		await new Promise((r) => setTimeout(r, 0));
		// Second call: cache populated → suggest the card
		const second = getEntitySuggestion(hass, "binary_sensor.epp_occupancy");
		expect(second).toEqual({
			config: { type: "custom:eppgrid-card", device_id: "dev1" },
		});
	});

	it("returns null and does not throw when hass has no callWS", () => {
		const hass = {
			entities: { "binary_sensor.epp_occupancy": { device_id: "dev1" } },
		};
		expect(() =>
			getEntitySuggestion(hass, "binary_sensor.epp_occupancy"),
		).not.toThrow();
		expect(getEntitySuggestion(hass, "binary_sensor.epp_occupancy")).toBeNull();
	});

	it("falls back to empty set and returns null when callWS rejects", async () => {
		const hass = {
			callWS: vi.fn().mockRejectedValue(new Error("network error")),
			entities: { "binary_sensor.epp_occupancy": { device_id: "dev1" } },
		};
		getEntitySuggestion(hass, "binary_sensor.epp_occupancy"); // kick off load
		// flush microtasks so the rejection resolves
		await new Promise((r) => setTimeout(r, 0));
		// After rejection, cache is an empty set so EPP device is not found
		expect(getEntitySuggestion(hass, "binary_sensor.epp_occupancy")).toBeNull();
	});

	it("handles null list from callWS gracefully", async () => {
		const hass = {
			callWS: vi.fn().mockResolvedValue(null),
			entities: { "binary_sensor.epp_occupancy": { device_id: "dev1" } },
		};
		getEntitySuggestion(hass, "binary_sensor.epp_occupancy"); // kick off load
		await new Promise((r) => setTimeout(r, 0));
		// null list → empty set → device not found
		expect(getEntitySuggestion(hass, "binary_sensor.epp_occupancy")).toBeNull();
	});
});

describe("card stale-bundle auto-reload", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	async function flush() {
		for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
	}

	// A device-configured card wired with a callWS that answers the version
	// check with `serverCardHash`. `_currentBundleHash` is overridden per test
	// (in production it comes from the card bundle's own hashed URL).
	async function mountForBundleCheck(serverCardHash: string | null) {
		let cb: ((msg: unknown) => void) | undefined;
		const subscribeMessage = vi.fn(async (c: (msg: unknown) => void) => {
			cb = c;
			return vi.fn();
		});
		const callWS = vi.fn(async (msg: { type: string }) => {
			if (msg.type === "eppgrid/frontend_version") {
				return { hash: "PANEL", card_hash: serverCardHash };
			}
			return { devices: [] };
		});
		const hass = {
			connection: { subscribeMessage },
			callWS,
			locale: { language: "en" },
		};
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "dev-vc" });
		el.hass = hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		cb?.({ snapshot: CALIBRATED });
		return { el, hass, callWS, a: el as any };
	}

	it("reloads the page when the server reports a newer card bundle", async () => {
		const { callWS, a } = await mountForBundleCheck("new");
		a._bundleCheckPending = true;
		a._currentBundleHash = "old";
		const reload = vi.fn();
		a._reloadPage = reload;

		await a._maybeCheckForNewBundle();
		await flush();

		expect(callWS).toHaveBeenCalledWith({ type: "eppgrid/frontend_version" });
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not reload when the running card hash matches the server", async () => {
		const { a } = await mountForBundleCheck("same");
		a._bundleCheckPending = true;
		a._currentBundleHash = "same";
		const reload = vi.fn();
		a._reloadPage = reload;

		await a._maybeCheckForNewBundle();
		await flush();

		expect(reload).not.toHaveBeenCalled();
	});

	it("compares against card_hash, not the panel hash", async () => {
		// The command returns both hashes; the card bundle has its own hash. If
		// the card compared its own hash against the panel's `hash`, it would
		// reload forever. Here the card matches card_hash, so no reload.
		const { a } = await mountForBundleCheck("cardY");
		a._bundleCheckPending = true;
		a._currentBundleHash = "cardY"; // equals card_hash, differs from "PANEL"
		const reload = vi.fn();
		a._reloadPage = reload;

		await a._maybeCheckForNewBundle();
		await flush();

		expect(reload).not.toHaveBeenCalled();
	});

	it("re-checks and reloads on a reconnect (connection swap)", async () => {
		let serverHash = "same";
		const subscribeMessage = vi.fn(async () => vi.fn());
		const callWS = vi.fn(async (msg: { type: string }) => {
			if (msg.type === "eppgrid/frontend_version") {
				return { hash: "PANEL", card_hash: serverHash };
			}
			return { devices: [] };
		});
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "dev-rc" });
		el.hass = {
			connection: { subscribeMessage },
			callWS,
			locale: { language: "en" },
		} as never;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._currentBundleHash = "same"; // initially matches → no reload
		const reload = vi.fn();
		a._reloadPage = reload;
		await flush();
		expect(reload).not.toHaveBeenCalled();

		// Server upgraded; a reconnect hands the card a NEW connection object.
		serverHash = "new";
		el.hass = {
			connection: { subscribeMessage: vi.fn(async () => vi.fn()) },
			callWS,
			locale: { language: "en" },
		} as never;
		await flush();

		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("retries until the integration answers, then reloads", async () => {
		let attempt = 0;
		const callWS = vi.fn(async (msg: { type: string }) => {
			if (msg.type === "eppgrid/frontend_version") {
				attempt += 1;
				if (attempt === 1) throw new Error("unknown_command");
				return { hash: "PANEL", card_hash: "new" };
			}
			return { devices: [] };
		});
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "dev-retry" });
		const hass = {
			connection: { subscribeMessage: vi.fn(async () => vi.fn()) },
			callWS,
			locale: { language: "en" },
		};
		el.hass = hass as never;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._currentBundleHash = "old";
		// Re-arm: the mount-time check already ran (and resolved) with the default
		// null hash; arm again now that we've set a real running hash.
		a._bundleCheckPending = true;
		const reload = vi.fn();
		a._reloadPage = reload;

		await a._maybeCheckForNewBundle(); // #1 errors → still pending
		await flush();
		expect(reload).not.toHaveBeenCalled();

		await a._maybeCheckForNewBundle(); // retry → integration answers → reload
		await flush();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not issue concurrent version queries while one is in flight", async () => {
		let resolveFetch!: (v: unknown) => void;
		const callWS = vi.fn((msg: { type: string }) => {
			if (msg.type === "eppgrid/frontend_version") {
				return new Promise((r) => {
					resolveFetch = r;
				});
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "dev-flight" });
		el.hass = {
			connection: { subscribeMessage: vi.fn(async () => vi.fn()) },
			callWS,
			locale: { language: "en" },
		} as never;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._currentBundleHash = "old";
		a._bundleCheckPending = true;
		const reload = vi.fn();
		a._reloadPage = reload;

		void a._maybeCheckForNewBundle();
		void a._maybeCheckForNewBundle();
		await flush();

		const versionCalls = (callWS as any).mock.calls.filter(
			(c: any[]) => c[0]?.type === "eppgrid/frontend_version",
		);
		expect(versionCalls).toHaveLength(1);

		resolveFetch({ hash: "PANEL", card_hash: "new" });
		await flush();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not issue a version query on every hass push while the backend is coming up", async () => {
		// While pending (integration still starting → card_hash null), a burst of
		// hass state updates must NOT each fire a frontend_version WS call, or a
		// busy dashboard with several cards would spam the endpoint. Retries are
		// timer-driven, not tied to hass updates.
		const conn = { subscribeMessage: vi.fn(async () => vi.fn()) };
		const callWS = vi.fn(async (msg: { type: string }) => {
			if (msg.type === "eppgrid/frontend_version") {
				return { hash: "PANEL", card_hash: null }; // not ready yet
			}
			return { devices: [] };
		});
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "dev-storm" });
		const a = el as any;
		a._currentBundleHash = "old";
		a._reloadPage = vi.fn();
		el.hass = { connection: conn, callWS, locale: { language: "en" } } as never;
		document.body.appendChild(el);
		await el.updateComplete;
		await flush();

		const countVersion = () =>
			(callWS as any).mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/frontend_version",
			).length;
		const before = countVersion();

		// A burst of state updates on the SAME connection.
		for (let i = 0; i < 5; i++) {
			el.hass = {
				connection: conn,
				callWS,
				locale: { language: "en" },
			} as never;
		}
		await flush();

		// The pushes added no new version queries.
		expect(countVersion()).toBe(before);
	});

	it("retries on a timer while the backend is still coming up, then reloads", async () => {
		let cardHash: string | null = null; // integration not up yet
		const callWS = vi.fn(async (msg: { type: string }) => {
			if (msg.type === "eppgrid/frontend_version") {
				return { hash: "PANEL", card_hash: cardHash };
			}
			return { devices: [] };
		});
		const el = document.createElement("eppgrid-card") as EppGridCard;
		el.setConfig({ type: "custom:eppgrid-card", device_id: "dev-timer" });
		const a = el as any;
		a._currentBundleHash = "old";
		a._bundleRetryMs = 5; // fast retry for the test
		const reload = vi.fn();
		a._reloadPage = reload;
		el.hass = {
			connection: { subscribeMessage: vi.fn(async () => vi.fn()) },
			callWS,
			locale: { language: "en" },
		} as never;
		document.body.appendChild(el);
		await el.updateComplete;
		await flush();
		expect(reload).not.toHaveBeenCalled(); // backend not ready → retry armed

		// Backend comes up; the scheduled retry picks up the new hash.
		cardHash = "new";
		await new Promise((r) => setTimeout(r, 30));
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("reloads the page via location.reload by default", () => {
		const el = document.createElement("eppgrid-card") as EppGridCard;
		const original = window.location.reload;
		const reload = vi.fn();
		Object.defineProperty(window.location, "reload", {
			configurable: true,
			value: reload,
		});
		try {
			(el as any)._reloadPage();
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(window.location, "reload", {
				configurable: true,
				value: original,
			});
		}
	});
});
