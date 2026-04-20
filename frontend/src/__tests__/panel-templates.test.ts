import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { CELL_ROOM_BIT, GRID_CELL_COUNT, GRID_COLS } from "../lib/grid.js";
import type { Zone0Config, ZoneConfig } from "../lib/zone-defaults.js";

// Valid length-8 zone slots for test templates (slot 0 = Zone0Config).
const VALID_ZONES: (Zone0Config | ZoneConfig | null)[] = [
	{ type: "normal", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
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
		{ type: "normal", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
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
	a._showTemplateSave = false;
	a._showTemplateLoad = false;
	a._templateName = "";
	a._showLiveMenu = true;
	a._targets = [];
	a._sensorState = { occupancy: false };
	a._zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
	a._devices = [
		{
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: null,
			available: true,
			configured: true,
		},
	];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._entitiesConfig = {};
	a._targetAutoDistance = true;
	a._targetMaxDistance = 6;
	a._staticAutoDistance = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	a._openAccordions = new Set();
	a._rawTargets = [];
	return el;
}

function findMenuItemByLabel(
	root: ParentNode,
	label: string,
): HTMLButtonElement | null {
	const items = root.querySelectorAll<HTMLButtonElement>(".sidebar-menu-item");
	for (const item of Array.from(items)) {
		if (item.textContent?.includes(label)) return item;
	}
	return null;
}

describe("_getTemplates", () => {
	it("returns templates from controller cache", () => {
		const a = createPanel() as any;
		const templates = [
			{
				name: "Test",
				grid: [],
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
			},
		];
		a._gridCtrl.templates = templates;
		expect(a._getTemplates()).toEqual(templates);
	});

	it("returns empty array when cache is empty", () => {
		const a = createPanel() as any;
		a._gridCtrl.templates = [];
		expect(a._getTemplates()).toEqual([]);
	});
});

describe("_saveTemplate", () => {
	it("calls controller saveTemplate", async () => {
		const a = createPanel() as any;
		a._templateName = "My layout";
		a._grid = new Uint8Array(GRID_CELL_COUNT);
		a._roomWidth = 5000;
		a._roomDepth = 6000;
		a._furniture = [];
		a._zoneConfigs = [
			{ type: "normal", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];

		a.hass.callWS
			.mockResolvedValueOnce({}) // save_template
			.mockResolvedValueOnce({ templates: {} }); // list_templates

		await a._saveTemplate();

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/save_template",
				name: "My layout",
			}),
		);
	});
});

describe("_loadTemplate", () => {
	it("loads a template from controller cache", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Saved",
				grid,
				zones: [
					{
						type: "normal",
						trigger: 5,
						renew: 3,
						timeout: 10,
						handoff_timeout: 3,
					},
					{ name: "Z1", color: "#ff0000", type: "normal" },
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

		await a._loadTemplate("Saved");

		expect(a._grid[0]).toBe(CELL_ROOM_BIT);
		expect(a._roomWidth).toBe(5000);
		expect(a._showTemplateLoad).toBe(false);
	});

	it("loadTemplate restores zone 0 and auto-applies", async () => {
		const a = createPanel() as any;
		// Grid with at least one cell painted as zone 1, so applyLayout's
		// zero-cell pruning doesn't drop it.
		const grid = new Array(GRID_CELL_COUNT).fill(CELL_ROOM_BIT);
		grid[0] = CELL_ROOM_BIT | (1 << 1); // cell in zone 1
		const tmpl = {
			name: "Saved",
			grid,
			zones: [
				{
					type: "rest",
					trigger: 7,
					renew: 1,
					timeout: 30,
					handoff_timeout: 10,
				},
				{
					name: "Living",
					color: "#f00",
					type: "normal",
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
		a._gridCtrl.templates = [tmpl];
		const callWS = vi.spyOn(a.hass, "callWS").mockResolvedValue({});

		await a._loadTemplate("Saved");

		expect((a._zoneConfigs[0] as Zone0Config).type).toBe("rest");
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
		expect(payload.zone_slots[0]).toEqual({ type: "rest" });
		expect(payload.zone_slots[1]).toMatchObject({
			name: "Living",
			type: "normal",
		});
		expect(payload.zone_slots[1]).not.toHaveProperty("trigger");
	});

	it("renders template error dialog when _templateError is set", () => {
		const a = createPanel() as any;
		a._templateError = "dialogs.template_not_calibrated";

		const tpl = a._renderGlobalDialogs();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const dialog = c.querySelector(".template-error-dialog");
		expect(dialog).not.toBeNull();
		expect(dialog?.textContent).toContain("dialogs.template_not_calibrated");

		document.body.removeChild(c);
	});

	it("error dialog heading uses distinct key from body", () => {
		// Avoid the review-flagged bug where title and body localize the
		// same key and the dialog shows the message twice.
		const a = createPanel() as any;
		a._templateError = "dialogs.template_save_failed";

		const tpl = a._renderGlobalDialogs();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const heading = c.querySelector(".template-error-dialog h3");
		const body = c.querySelector(".template-error-dialog .overlay-help");
		expect(heading?.textContent).toBe("dialogs.template_error_title");
		expect(body?.textContent).toBe("dialogs.template_save_failed");
		expect(heading?.textContent).not.toBe(body?.textContent);

		document.body.removeChild(c);
	});

	it("template error dialog not rendered when _templateError is null", () => {
		const a = createPanel() as any;
		a._templateError = null;

		const tpl = a._renderGlobalDialogs();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const dialog = c.querySelector(".template-error-dialog");
		expect(dialog).toBeNull();

		document.body.removeChild(c);
	});

	it("dismissing error dialog clears _templateError", () => {
		const a = createPanel() as any;
		a._templateError = "dialogs.template_not_calibrated";

		const tpl = a._renderGlobalDialogs();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const dismissBtn = c.querySelector(
			".template-error-dialog button",
		) as HTMLButtonElement;
		expect(dismissBtn).not.toBeNull();
		dismissBtn.click();

		expect(a._templateError).toBeNull();

		document.body.removeChild(c);
	});

	it("surfaces backend not_calibrated error via _templateError", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(CELL_ROOM_BIT);
		grid[0] = CELL_ROOM_BIT | (1 << 1);
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Saved",
				grid,
				zones: [
					{
						type: "normal",
						trigger: 5,
						renew: 3,
						timeout: 10,
						handoff_timeout: 3,
					},
					{ name: "Z", color: "#f00", type: "normal" },
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		// Backend rejects with not_calibrated (same shape HA's callWS produces
		// for send_error responses: an Error with `code` on it).
		const err = Object.assign(
			new Error("Device must be calibrated before applying a layout"),
			{
				code: "not_calibrated",
			},
		);
		a.hass.callWS = vi.fn().mockRejectedValue(err);

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadTemplate("Saved");
		errSpy.mockRestore();

		expect(a._templateError).toBeTruthy();
		// Specific not_calibrated message, not a generic one — so the user knows why
		expect(a._templateError).toBe("dialogs.template_not_calibrated");
	});

	it("generic load error maps to template_load_failed (not template_save_failed)", async () => {
		const a = createPanel() as any;
		const grid = new Array(GRID_CELL_COUNT).fill(CELL_ROOM_BIT);
		grid[0] = CELL_ROOM_BIT | (1 << 1);
		a._gridCtrl.templates = [
			{
				name: "Saved",
				grid,
				zones: [
					{
						type: "normal",
						trigger: 5,
						renew: 3,
						timeout: 10,
						handoff_timeout: 3,
					},
					{ name: "Z", color: "#f00", type: "normal" },
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		a.hass.callWS = vi.fn().mockRejectedValue(new Error("network boom"));

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadTemplate("Saved");
		errSpy.mockRestore();

		expect(a._templateError).toBe("dialogs.template_load_failed");
	});

	it("generic save error maps to template_save_failed (not template_load_failed)", async () => {
		const a = createPanel() as any;
		a._templateName = "My layout";
		a.hass.callWS = vi.fn().mockRejectedValue(new Error("network boom"));

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._saveTemplate();
		errSpy.mockRestore();

		expect(a._templateError).toBe("dialogs.template_save_failed");
	});

	it("throws on old-format template with length-7 zones", async () => {
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Old",
				grid: new Array(GRID_CELL_COUNT).fill(0),
				zones: [null, null, null, null, null, null, null], // length 7, old format
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];
		a._showTemplateLoad = true;

		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await a._loadTemplate("Old");
		expect(errSpy).toHaveBeenCalled();
		// Dialog stays open so the failure is visible and the user can
		// try another template.
		expect(a._showTemplateLoad).toBe(true);
		errSpy.mockRestore();
	});

	it("throws on template with null zone 0", async () => {
		const a = createPanel() as any;
		a._gridCtrl.templates = [
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
		await a._loadTemplate("NullZone0");
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
	});
});

describe("_deleteTemplate", () => {
	it("calls controller deleteTemplate", async () => {
		const a = createPanel() as any;
		a.hass.callWS
			.mockResolvedValueOnce({}) // delete_template
			.mockResolvedValueOnce({ templates: {} }); // list_templates

		await a._deleteTemplate("Old");

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({ type: "eppgrid/delete_template", name: "Old" }),
		);
	});
});

describe("template menu buttons (calibration gate)", () => {
	it("Save Template button marked aria-disabled when uncalibrated", () => {
		const a = createPanel() as any;
		a._perspective = null;

		const tpl = a._renderLiveOverview();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const saveBtn = findMenuItemByLabel(c, "dialogs.save_template");
		expect(saveBtn).not.toBeNull();
		expect(saveBtn?.getAttribute("aria-disabled")).toBe("true");

		document.body.removeChild(c);
	});

	it("Load Template button marked aria-disabled when uncalibrated", () => {
		const a = createPanel() as any;
		a._perspective = null;

		const tpl = a._renderLiveOverview();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const loadBtn = findMenuItemByLabel(c, "dialogs.load_template");
		expect(loadBtn).not.toBeNull();
		expect(loadBtn?.getAttribute("aria-disabled")).toBe("true");

		document.body.removeChild(c);
	});

	it("Save Template button is interactive when calibrated", () => {
		const a = createPanel() as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];

		const tpl = a._renderLiveOverview();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const saveBtn = findMenuItemByLabel(c, "dialogs.save_template");
		expect(saveBtn).not.toBeNull();
		expect(saveBtn?.getAttribute("aria-disabled")).toBe("false");

		document.body.removeChild(c);
	});

	it("Load Template button is interactive when calibrated", () => {
		const a = createPanel() as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];

		const tpl = a._renderLiveOverview();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const loadBtn = findMenuItemByLabel(c, "dialogs.load_template");
		expect(loadBtn).not.toBeNull();
		expect(loadBtn?.getAttribute("aria-disabled")).toBe("false");

		document.body.removeChild(c);
	});

	it("tapping Save Template when uncalibrated shows the error dialog instead of opening save", () => {
		const a = createPanel() as any;
		a._perspective = null;

		const tpl = a._renderLiveOverview();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const saveBtn = findMenuItemByLabel(c, "dialogs.save_template");
		saveBtn?.click();

		expect(a._showTemplateSave).toBe(false);
		expect(a._templateError).toBe("dialogs.template_not_calibrated");

		document.body.removeChild(c);
	});

	it("tapping Load Template when uncalibrated shows the error dialog instead of fetching templates", () => {
		const a = createPanel() as any;
		a._perspective = null;
		const fetchSpy = vi
			.spyOn(a._gridCtrl, "fetchTemplates")
			.mockResolvedValue(undefined);

		const tpl = a._renderLiveOverview();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const loadBtn = findMenuItemByLabel(c, "dialogs.load_template");
		loadBtn?.click();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(a._showTemplateLoad).toBe(false);
		expect(a._templateError).toBe("dialogs.template_not_calibrated");

		document.body.removeChild(c);
	});
});

describe("_renderTemplateLoadDialog", () => {
	it("renders template cards with SVG thumbnails", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		grid[1] = CELL_ROOM_BIT;
		grid[GRID_COLS] = CELL_ROOM_BIT;
		grid[GRID_COLS + 1] = CELL_ROOM_BIT;

		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Test Room",
				grid,
				zones: [
					VALID_ZONES[0],
					{ name: "Z1", color: "#E69F00", type: "normal" },
					null,
					null,
					null,
					null,
					null,
					null,
				],
				roomWidth: 600,
				roomDepth: 600,
				furniture: [],
			},
		];

		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const card = c.querySelector(".template-card");
		expect(card).not.toBeNull();

		const svgEl = c.querySelector(".template-card-thumbnail svg");
		expect(svgEl).not.toBeNull();

		const name = c.querySelector(".template-card-name");
		expect(name?.textContent).toBe("Test Room");

		document.body.removeChild(c);
	});

	it("template-card-size reflects painted-cell bounding box, not stored roomWidth", () => {
		// Template stores a small roomWidth from calibration (600mm), but the
		// painted grid extends further. The card label should match what the
		// footer shows (getGridRoomMetrics on the painted cells), so the user
		// sees the dimensions of the visible layout, not the calibration-time
		// room size.
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		// Paint a 3-col × 2-row block at the top-left corner (0.9m × 0.6m).
		for (let row = 0; row < 2; row++) {
			for (let col = 0; col < 3; col++) {
				grid[row * GRID_COLS + col] = CELL_ROOM_BIT;
			}
		}

		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Mismatch",
				grid,
				zones: VALID_ZONES,
				roomWidth: 600, // calibration-time value
				roomDepth: 600,
				furniture: [],
			},
		];

		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const size = c.querySelector(".template-card-size");
		// Painted box: 3 cols × 300mm = 0.9m, 2 rows × 300mm = 0.6m.
		expect(size?.textContent).toBe("0.9m × 0.6m");

		document.body.removeChild(c);
	});

	it("renders no-templates message when cache is empty", () => {
		const a = createPanel() as any;
		a._gridCtrl.templates = [];

		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const help = c.querySelector(".overlay-help");
		expect(help).not.toBeNull();

		document.body.removeChild(c);
	});

	it("clicking card triggers load", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Clickable",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const card = c.querySelector(".template-card") as HTMLElement;
		expect(card).not.toBeNull();
		card.click();
		// Wait for the async _loadTemplate -> applyLayout chain to settle.
		await vi.waitFor(() => {
			expect(a._showTemplateLoad).toBe(false);
			expect(a._roomWidth).toBe(3000);
		});

		document.body.removeChild(c);
	});

	it("Enter key on card triggers load", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "Keyboard",
				grid,
				zones: VALID_ZONES,
				roomWidth: 4000,
				roomDepth: 5000,
				furniture: [],
			},
		];

		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const card = c.querySelector(".template-card") as HTMLElement;
		expect(card).not.toBeNull();
		card.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

		await vi.waitFor(() => {
			expect(a._showTemplateLoad).toBe(false);
			expect(a._roomWidth).toBe(4000);
		});

		document.body.removeChild(c);
	});

	it("clicking delete button removes template without loading", async () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.templates = [
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
			.mockResolvedValueOnce({}) // delete_template
			.mockResolvedValueOnce({
				templates: {
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
		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const deleteBtn = c.querySelector(".template-card-delete") as HTMLElement;
		expect(deleteBtn).not.toBeNull();
		deleteBtn.click();

		// Wait for async delete to complete
		await vi.waitFor(() => {
			expect(a.hass.callWS).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "eppgrid/delete_template",
					name: "Keep",
				}),
			);
		});

		expect(a._roomWidth).toBe(origWidth);

		document.body.removeChild(c);
	});

	it("Space key on delete button stops propagation", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const a = createPanel() as any;
		a._gridCtrl.templates = [
			{
				name: "T1",
				grid,
				zones: VALID_ZONES,
				roomWidth: 3000,
				roomDepth: 4000,
				furniture: [],
			},
		];

		const tpl = a._renderTemplateLoadDialog();
		const c = document.createElement("div");
		document.body.appendChild(c);
		render(tpl, c);

		const deleteBtn = c.querySelector(".template-card-delete") as HTMLElement;
		expect(deleteBtn).not.toBeNull();
		const cardKeydownSpy = vi.fn();
		const card = c.querySelector(".template-card") as HTMLElement;
		card.addEventListener("keydown", cardKeydownSpy);
		deleteBtn.dispatchEvent(
			new KeyboardEvent("keydown", { key: " ", bubbles: true }),
		);
		expect(cardKeydownSpy).not.toHaveBeenCalled();

		document.body.removeChild(c);
	});
});
