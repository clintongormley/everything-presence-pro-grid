import { beforeEach, describe, expect, it } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { GRID_CELL_COUNT, initGridFromRoom } from "../lib/grid.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: async () => ({}),
		connection: { subscribeMessage: async () => () => {} },
	};
	const a = el as any;
	a._grid = initGridFromRoom(6000, 6000);
	a._zoneConfigs = new Array(7).fill(null);
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._roomWidth = 6000;
	a._roomDepth = 6000;
	return el;
}

describe("_addFurniture", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("creates a furniture item with defaults from the sticker", () => {
		const a = el as any;
		const sticker = {
			type: "svg" as const,
			icon: "bed-double",
			label: "Double bed",
			defaultWidth: 1600,
			defaultHeight: 2000,
		};

		a._addFurniture(sticker);

		expect(a._furniture).toHaveLength(1);
		const item = a._furniture[0];
		expect(item.type).toBe("svg");
		expect(item.icon).toBe("bed-double");
		expect(item.label).toBe("Double bed");
		expect(item.width).toBe(1600);
		expect(item.height).toBe(2000);
		expect(item.rotation).toBe(0);
		expect(item.id).toMatch(/^f_/);
	});

	it("sets _dirty = true", () => {
		const a = el as any;
		expect(a._dirty).toBe(false);

		a._addFurniture({
			type: "svg" as const,
			icon: "sofa-two-seater",
			label: "Sofa",
			defaultWidth: 1600,
			defaultHeight: 800,
		});

		expect(a._dirty).toBe(true);
	});

	it("sets _selectedFurnitureId to the new item", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});

		expect(a._selectedFurnitureId).toBe(a._furniture[0].id);
	});

	it("centers the furniture in the room", () => {
		const a = el as any;
		a._roomWidth = 6000;
		a._roomDepth = 6000;

		a._addFurniture({
			type: "svg" as const,
			icon: "bed-double",
			label: "Double bed",
			defaultWidth: 1600,
			defaultHeight: 2000,
		});

		const item = a._furniture[0];
		expect(item.x).toBe((6000 - 1600) / 2);
		expect(item.y).toBe((6000 - 2000) / 2);
	});

	it("clamps position to zero when item is larger than room", () => {
		const a = el as any;
		a._roomWidth = 500;
		a._roomDepth = 500;

		a._addFurniture({
			type: "svg" as const,
			icon: "bed-double",
			label: "Double bed",
			defaultWidth: 1600,
			defaultHeight: 2000,
		});

		const item = a._furniture[0];
		expect(item.x).toBe(0);
		expect(item.y).toBe(0);
	});

	it("sets lockAspect to true for icon-type stickers by default", () => {
		const a = el as any;
		a._addFurniture({
			type: "icon" as const,
			icon: "mdi:fridge",
			label: "Fridge",
			defaultWidth: 700,
			defaultHeight: 700,
		});

		expect(a._furniture[0].lockAspect).toBe(true);
	});

	it("uses explicit lockAspect from sticker when provided", () => {
		const a = el as any;
		a._addFurniture({
			type: "icon" as const,
			icon: "mdi:desk",
			label: "Desk",
			defaultWidth: 1400,
			defaultHeight: 700,
			lockAspect: false,
		});

		expect(a._furniture[0].lockAspect).toBe(false);
	});
});

describe("_removeFurniture", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("removes the item by id", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		const id = a._furniture[0].id;

		a._removeFurniture(id);
		expect(a._furniture).toHaveLength(0);
	});

	it("clears selection if the removed item was selected", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		const id = a._furniture[0].id;
		expect(a._selectedFurnitureId).toBe(id);

		a._removeFurniture(id);
		expect(a._selectedFurnitureId).toBeNull();
	});

	it("does not clear selection if a different item was removed", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		a._addFurniture({
			type: "svg" as const,
			icon: "bed-double",
			label: "Double bed",
			defaultWidth: 1600,
			defaultHeight: 2000,
		});
		// selectedFurnitureId is now the second item
		const secondId = a._furniture[1].id;
		expect(a._selectedFurnitureId).toBe(secondId);

		const firstId = a._furniture[0].id;
		a._removeFurniture(firstId);

		expect(a._selectedFurnitureId).toBe(secondId);
		expect(a._furniture).toHaveLength(1);
	});

	it("sets _dirty = true", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		a._dirty = false;

		a._removeFurniture(a._furniture[0].id);
		expect(a._dirty).toBe(true);
	});
});

describe("_updateFurniture", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("merges partial updates into an existing item", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		const id = a._furniture[0].id;

		a._updateFurniture(id, { width: 1200, rotation: 45 });

		const updated = a._furniture[0];
		expect(updated.width).toBe(1200);
		expect(updated.rotation).toBe(45);
		// Other properties preserved
		expect(updated.height).toBe(800);
		expect(updated.icon).toBe("armchair");
	});

	it("sets _dirty = true", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		a._dirty = false;

		a._updateFurniture(a._furniture[0].id, { label: "Big chair" });
		expect(a._dirty).toBe(true);
	});

	it("does not affect other items", () => {
		const a = el as any;
		a._addFurniture({
			type: "svg" as const,
			icon: "armchair",
			label: "Armchair",
			defaultWidth: 800,
			defaultHeight: 800,
		});
		a._addFurniture({
			type: "svg" as const,
			icon: "bed-double",
			label: "Double bed",
			defaultWidth: 1600,
			defaultHeight: 2000,
		});

		a._updateFurniture(a._furniture[0].id, { label: "Updated" });
		expect(a._furniture[1].label).toBe("Double bed");
	});
});

describe("_addCustomFurniture", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("creates an icon-type furniture with defaults", () => {
		const a = el as any;
		a._addCustomFurniture("mdi:star");

		expect(a._furniture).toHaveLength(1);
		const item = a._furniture[0];
		expect(item.type).toBe("icon");
		expect(item.icon).toBe("mdi:star");
		expect(item.label).toBe("furniture.custom");
		expect(item.width).toBe(600);
		expect(item.height).toBe(600);
		expect(item.lockAspect).toBe(false);
	});

	it("sets _dirty = true and _selectedFurnitureId", () => {
		const a = el as any;
		a._addCustomFurniture("mdi:lamp");

		expect(a._dirty).toBe(true);
		expect(a._selectedFurnitureId).toBe(a._furniture[0].id);
	});
});

describe("_onKeyDown furniture shortcuts", () => {
	let el: EPPGridPanel;
	let a: any;

	function makeEvent(
		key: string,
		opts: Partial<KeyboardEventInit> = {},
	): KeyboardEvent {
		const ev = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true,
			...opts,
		});
		return ev;
	}

	function addItem(): string {
		a._addFurniture({
			type: "svg" as const,
			icon: "sofa-2-seat",
			label: "Sofa",
			defaultWidth: 600,
			defaultHeight: 400,
		});
		return a._furniture[a._furniture.length - 1].id;
	}

	beforeEach(() => {
		el = createPanel();
		a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
	});

	it("ignores keys when not in editor furniture view", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._view = "live";
		a._onKeyDown(makeEvent("Backspace"));
		expect(a._furniture).toHaveLength(1);
	});

	it("ignores keys when no furniture is selected", () => {
		addItem();
		a._selectedFurnitureId = null;
		a._onKeyDown(makeEvent("Backspace"));
		expect(a._furniture).toHaveLength(1);
	});

	it("ignores keys when target is an input element", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		const input = document.createElement("input");
		const ev = new KeyboardEvent("keydown", {
			key: "Backspace",
			bubbles: true,
			cancelable: true,
		});
		ev.composedPath = () => [input];
		a._onKeyDown(ev);
		expect(a._furniture).toHaveLength(1);
	});

	it("Backspace deletes selected furniture", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("Backspace"));
		expect(a._furniture).toHaveLength(0);
		expect(a._selectedFurnitureId).toBeNull();
	});

	it("Delete key deletes selected furniture", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("Delete"));
		expect(a._furniture).toHaveLength(0);
	});

	it("Escape deselects furniture", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("Escape"));
		expect(a._selectedFurnitureId).toBeNull();
		expect(a._furniture).toHaveLength(1);
	});

	it("Ctrl+C copies selected furniture to clipboard", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("c", { ctrlKey: true }));
		expect(a._furnitureClipboard).not.toBeNull();
		expect(a._furnitureClipboard.icon).toBe("sofa-2-seat");
		expect(a._furniture).toHaveLength(1);
	});

	it("Ctrl+X cuts selected furniture", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("x", { ctrlKey: true }));
		expect(a._furnitureClipboard).not.toBeNull();
		expect(a._furnitureClipboard.icon).toBe("sofa-2-seat");
		expect(a._furniture).toHaveLength(0);
	});

	it("Ctrl+V pastes from clipboard with offset", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		const origX = a._furniture[0].x;
		const origY = a._furniture[0].y;
		a._onKeyDown(makeEvent("c", { ctrlKey: true }));
		a._onKeyDown(makeEvent("v", { ctrlKey: true }));
		expect(a._furniture).toHaveLength(2);
		const pasted = a._furniture[1];
		expect(pasted.id).not.toBe(id);
		expect(pasted.x).toBe(origX + 300);
		expect(pasted.y).toBe(origY + 300);
		expect(a._selectedFurnitureId).toBe(pasted.id);
		expect(a._dirty).toBe(true);
	});

	it("Ctrl+V does nothing without clipboard", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("v", { ctrlKey: true }));
		expect(a._furniture).toHaveLength(1);
	});

	it("Meta+C works for macOS", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._onKeyDown(makeEvent("c", { metaKey: true }));
		expect(a._furnitureClipboard).not.toBeNull();
	});

	it("ignores keys in textarea elements", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		const textarea = document.createElement("textarea");
		const ev = new KeyboardEvent("keydown", {
			key: "Backspace",
			bubbles: true,
			cancelable: true,
		});
		ev.composedPath = () => [textarea];
		a._onKeyDown(ev);
		expect(a._furniture).toHaveLength(1);
	});

	it("ignores keys in select elements", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		const select = document.createElement("select");
		const ev = new KeyboardEvent("keydown", {
			key: "Backspace",
			bubbles: true,
			cancelable: true,
		});
		ev.composedPath = () => [select];
		a._onKeyDown(ev);
		expect(a._furniture).toHaveLength(1);
	});

	it("Ctrl+C with invalid selection does not crash", () => {
		addItem();
		a._selectedFurnitureId = "nonexistent";
		a._onKeyDown(makeEvent("c", { ctrlKey: true }));
		expect(a._furnitureClipboard).toBeNull();
	});

	it("Ctrl+X with invalid selection does not crash", () => {
		addItem();
		a._selectedFurnitureId = "nonexistent";
		a._onKeyDown(makeEvent("x", { ctrlKey: true }));
		expect(a._furnitureClipboard).toBeNull();
		expect(a._furniture).toHaveLength(1);
	});

	it("ignores when sidebarTab is zones", () => {
		const id = addItem();
		a._selectedFurnitureId = id;
		a._sidebarTab = "zones";
		a._onKeyDown(makeEvent("Backspace"));
		expect(a._furniture).toHaveLength(1);
	});
});
