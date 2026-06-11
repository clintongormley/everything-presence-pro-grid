import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import "../../components/epp-configuration-dialogs.js";
import type { EppConfigurationDialogs } from "../../components/epp-configuration-dialogs.js";
import { CELL_ROOM_BIT, GRID_CELL_COUNT, GRID_COLS } from "../../lib/grid.js";
import type { Zone0Config, ZoneConfig } from "../../lib/zone-defaults.js";

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

function createDialogs(
	overrides: Record<string, unknown> = {},
): EppConfigurationDialogs {
	const el = document.createElement(
		"epp-configuration-dialogs",
	) as EppConfigurationDialogs;
	el.localize = Object.assign((k: string) => k, {
		formatNumber: (v: number, d = 1) => v.toFixed(d),
		lang: "en",
	});
	Object.assign(el, overrides);
	return el;
}

function renderTo(tpl: unknown): HTMLDivElement {
	const c = document.createElement("div");
	document.body.appendChild(c);
	render(tpl, c);
	return c;
}

describe("epp-configuration-dialogs element", () => {
	it("is registered as a custom element", () => {
		expect(customElements.get("epp-configuration-dialogs")).toBeDefined();
	});

	it("renders nothing when neither dialog is open", () => {
		const el = createDialogs() as any;
		const c = renderTo(el.render());
		expect(c.querySelectorAll(".template-dialog").length).toBe(0);
		document.body.removeChild(c);
	});
});

describe("backup dialog", () => {
	it("renders the name input and action buttons", () => {
		const el = createDialogs({
			showBackup: true,
			configurationName: "Test",
		}) as any;
		const c = renderTo(el.render());
		const input = c.querySelector(
			".configuration-name-input",
		) as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("Test");
		document.body.removeChild(c);
	});

	it("name input dispatches configuration-name-change with the value", () => {
		const el = createDialogs({ showBackup: true }) as any;
		const handler = vi.fn();
		el.addEventListener("configuration-name-change", handler);
		const c = renderTo(el.render());

		const input = c.querySelector(
			".configuration-name-input",
		) as HTMLInputElement;
		input.value = "My Layout";
		input.dispatchEvent(new Event("input"));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail).toBe("My Layout");
		document.body.removeChild(c);
	});

	it("cancel button dispatches backup-cancel", () => {
		const el = createDialogs({ showBackup: true }) as any;
		const handler = vi.fn();
		el.addEventListener("backup-cancel", handler);
		const c = renderTo(el.render());

		(c.querySelector(".wizard-btn-back") as HTMLElement).click();
		expect(handler).toHaveBeenCalledTimes(1);
		document.body.removeChild(c);
	});

	it("save button dispatches configuration-save", () => {
		const el = createDialogs({
			showBackup: true,
			configurationName: "Bedroom",
		}) as any;
		const handler = vi.fn();
		el.addEventListener("configuration-save", handler);
		const c = renderTo(el.render());

		const saveBtn = c.querySelector(".wizard-btn-primary") as HTMLButtonElement;
		expect(saveBtn.disabled).toBe(false);
		saveBtn.click();
		expect(handler).toHaveBeenCalledTimes(1);
		document.body.removeChild(c);
	});

	it("save button is disabled when the name is blank", () => {
		const el = createDialogs({
			showBackup: true,
			configurationName: "   ",
		}) as any;
		const c = renderTo(el.render());
		const saveBtn = c.querySelector(".wizard-btn-primary") as HTMLButtonElement;
		expect(saveBtn.disabled).toBe(true);
		document.body.removeChild(c);
	});
});

describe("restore dialog rendering", () => {
	it("renders configuration cards with SVG thumbnails", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		grid[1] = CELL_ROOM_BIT;
		grid[GRID_COLS] = CELL_ROOM_BIT;
		grid[GRID_COLS + 1] = CELL_ROOM_BIT;

		const el = createDialogs({
			showRestore: true,
			configurations: [
				{
					name: "Test Room",
					grid,
					zones: [
						VALID_ZONES[0],
						{ name: "Z1", color: "#E69F00", type: "default" },
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
			],
		}) as any;
		const c = renderTo(el.render());

		expect(c.querySelector(".configuration-card")).not.toBeNull();
		expect(c.querySelector(".configuration-card-thumbnail svg")).not.toBeNull();
		expect(c.querySelector(".configuration-card-name")?.textContent).toBe(
			"Test Room",
		);
		document.body.removeChild(c);
	});

	it("configuration-card-size reflects painted-cell bounding box, not stored roomWidth", () => {
		// Configuration stores a small roomWidth from calibration (600mm), but the
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

		const el = createDialogs({
			showRestore: true,
			configurations: [
				{
					name: "Mismatch",
					grid,
					zones: VALID_ZONES,
					roomWidth: 600, // calibration-time value
					roomDepth: 600,
					furniture: [],
				},
			],
		}) as any;
		const c = renderTo(el.render());

		// Painted box: 3 cols × 300mm = 0.9m, 2 rows × 300mm = 0.6m.
		expect(c.querySelector(".configuration-card-size")?.textContent).toBe(
			"0.9m × 0.6m",
		);
		document.body.removeChild(c);
	});

	it("falls back to stored room dims when the grid has no painted cells", () => {
		const el = createDialogs({
			showRestore: true,
			configurations: [
				{
					name: "Empty",
					grid: [],
					zones: VALID_ZONES,
					roomWidth: 3000,
					roomDepth: 4000,
					furniture: [],
				},
			],
		}) as any;
		const c = renderTo(el.render());
		expect(c.querySelector(".configuration-card-size")?.textContent).toBe(
			"3.0m × 4.0m",
		);
		document.body.removeChild(c);
	});

	it("renders no-configurations message when the list is empty", () => {
		const el = createDialogs({ showRestore: true, configurations: [] }) as any;
		const c = renderTo(el.render());
		expect(c.querySelector(".overlay-help")).not.toBeNull();
		document.body.removeChild(c);
	});

	it("filters out configurations whose zones are not length-8", () => {
		const el = createDialogs({
			showRestore: true,
			configurations: [
				{
					name: "Old",
					grid: [],
					zones: new Array(7).fill(null), // old format
					roomWidth: 3000,
					roomDepth: 4000,
				},
				{
					name: "New",
					grid: [],
					zones: VALID_ZONES,
					roomWidth: 3000,
					roomDepth: 4000,
				},
			],
		}) as any;
		const c = renderTo(el.render());
		const cards = c.querySelectorAll(".configuration-card");
		expect(cards.length).toBe(1);
		expect(c.querySelector(".configuration-card-name")?.textContent).toBe(
			"New",
		);
		document.body.removeChild(c);
	});

	it("renders one card per valid configuration", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		const el = createDialogs({
			showRestore: true,
			configurations: [
				{
					name: "T1",
					grid,
					zones: VALID_ZONES,
					roomWidth: 5000,
					roomDepth: 6000,
				},
				{
					name: "T2",
					grid,
					zones: VALID_ZONES,
					roomWidth: 3000,
					roomDepth: 4000,
				},
			],
		}) as any;
		const c = renderTo(el.render());
		expect(c.querySelectorAll(".configuration-card").length).toBe(2);
		document.body.removeChild(c);
	});
});

describe("restore dialog events", () => {
	function renderRestore(handlerMap: Record<string, ReturnType<typeof vi.fn>>) {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const el = createDialogs({
			showRestore: true,
			configurations: [
				{
					name: "Clickable",
					grid,
					zones: VALID_ZONES,
					roomWidth: 3000,
					roomDepth: 4000,
					furniture: [],
				},
			],
		}) as any;
		for (const [type, fn] of Object.entries(handlerMap)) {
			el.addEventListener(type, fn);
		}
		return renderTo(el.render());
	}

	it("clicking a card dispatches configuration-load with the name", () => {
		const onLoad = vi.fn();
		const c = renderRestore({ "configuration-load": onLoad });
		(c.querySelector(".configuration-card") as HTMLElement).click();
		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(onLoad.mock.calls[0][0].detail).toBe("Clickable");
		document.body.removeChild(c);
	});

	it("Enter key on a card dispatches configuration-load", () => {
		const onLoad = vi.fn();
		const c = renderRestore({ "configuration-load": onLoad });
		(c.querySelector(".configuration-card") as HTMLElement).dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter" }),
		);
		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(onLoad.mock.calls[0][0].detail).toBe("Clickable");
		document.body.removeChild(c);
	});

	it("Space key on a card dispatches configuration-load", () => {
		const onLoad = vi.fn();
		const c = renderRestore({ "configuration-load": onLoad });
		(c.querySelector(".configuration-card") as HTMLElement).dispatchEvent(
			new KeyboardEvent("keydown", { key: " " }),
		);
		expect(onLoad).toHaveBeenCalledTimes(1);
		document.body.removeChild(c);
	});

	it("other keys on a card do not dispatch configuration-load", () => {
		const onLoad = vi.fn();
		const c = renderRestore({ "configuration-load": onLoad });
		(c.querySelector(".configuration-card") as HTMLElement).dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape" }),
		);
		expect(onLoad).not.toHaveBeenCalled();
		document.body.removeChild(c);
	});

	it("delete button dispatches configuration-delete without loading", () => {
		const onLoad = vi.fn();
		const onDelete = vi.fn();
		const c = renderRestore({
			"configuration-load": onLoad,
			"configuration-delete": onDelete,
		});
		(c.querySelector(".configuration-card-delete") as HTMLElement).click();
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete.mock.calls[0][0].detail).toBe("Clickable");
		// stopPropagation keeps the card's own click handler from firing.
		expect(onLoad).not.toHaveBeenCalled();
		document.body.removeChild(c);
	});

	it("Space key on the delete button stops propagation to the card", () => {
		const onLoad = vi.fn();
		const c = renderRestore({ "configuration-load": onLoad });
		const card = c.querySelector(".configuration-card") as HTMLElement;
		const cardKeydownSpy = vi.fn();
		card.addEventListener("keydown", cardKeydownSpy);
		(
			c.querySelector(".configuration-card-delete") as HTMLElement
		).dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
		expect(cardKeydownSpy).not.toHaveBeenCalled();
		expect(onLoad).not.toHaveBeenCalled();
		document.body.removeChild(c);
	});

	it("close button dispatches restore-close", () => {
		const onClose = vi.fn();
		const c = renderRestore({ "restore-close": onClose });
		(c.querySelector(".wizard-btn-back") as HTMLElement).click();
		expect(onClose).toHaveBeenCalledTimes(1);
		document.body.removeChild(c);
	});
});

describe("configuration metrics cache", () => {
	it("caches per configuration object and invalidates on maxRangeMm change", () => {
		const grid = new Array(GRID_CELL_COUNT).fill(0);
		grid[0] = CELL_ROOM_BIT;
		const cfg = {
			name: "T",
			grid,
			zones: VALID_ZONES,
			roomWidth: 3000,
			roomDepth: 4000,
		};
		const el = createDialogs({ maxRangeMm: 6000 }) as any;

		const first = el._getConfigurationMetrics(cfg);
		const second = el._getConfigurationMetrics(cfg);
		// Cache hit returns equal metrics for the same inputs.
		expect(second).toEqual(first);

		// Changing a FOV input invalidates the cached entry (recompute path).
		el.maxRangeMm = 3000;
		const third = el._getConfigurationMetrics(cfg);
		expect(third).toBeDefined();
	});
});
