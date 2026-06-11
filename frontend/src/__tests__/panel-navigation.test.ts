import { beforeEach, describe, expect, it } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: async () => ({}),
		connection: { subscribeMessage: async () => () => {} },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	a._zoneConfigs = new Array(7).fill(null);
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._showUnsavedDialog = false;
	a._navGuard._pendingNavigation = null;
	return el;
}

describe("_guardNavigation", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("executes action immediately when _dirty is false", () => {
		const a = el as any;
		a._dirty = false;
		let executed = false;

		a._navGuard.guardNavigation(() => {
			executed = true;
		});

		expect(executed).toBe(true);
		expect(a._showUnsavedDialog).toBe(false);
		expect(a._navGuard._pendingNavigation).toBeNull();
	});

	it("stores action and shows dialog when _dirty is true", () => {
		const a = el as any;
		a._dirty = true;
		let executed = false;

		a._navGuard.guardNavigation(() => {
			executed = true;
		});

		expect(executed).toBe(false);
		expect(a._showUnsavedDialog).toBe(true);
		expect(a._navGuard._pendingNavigation).toBeTypeOf("function");
	});

	it("does not execute action when dirty until user confirms", () => {
		const a = el as any;
		a._dirty = true;
		const calls: string[] = [];

		a._navGuard.guardNavigation(() => {
			calls.push("action");
		});

		expect(calls).toHaveLength(0);

		// Simulate user confirming discard
		a._navGuard.discardAndNavigate();
		expect(calls).toEqual(["action"]);
	});
});

describe("_discardAndNavigate", () => {
	let el: EPPGridPanel;

	beforeEach(() => {
		el = createPanel();
	});

	it("resets _dirty to false", () => {
		const a = el as any;
		a._dirty = true;
		a._showUnsavedDialog = true;
		a._navGuard._pendingNavigation = () => {};

		a._navGuard.discardAndNavigate();
		expect(a._dirty).toBe(false);
	});

	it("hides the unsaved dialog", () => {
		const a = el as any;
		a._dirty = true;
		a._showUnsavedDialog = true;
		a._navGuard._pendingNavigation = () => {};

		a._navGuard.discardAndNavigate();
		expect(a._showUnsavedDialog).toBe(false);
	});

	it("executes the pending navigation action", () => {
		const a = el as any;
		a._dirty = true;
		a._showUnsavedDialog = true;
		let executed = false;
		a._navGuard._pendingNavigation = () => {
			executed = true;
		};

		a._navGuard.discardAndNavigate();
		expect(executed).toBe(true);
	});

	it("clears _pendingNavigation after executing", () => {
		const a = el as any;
		a._dirty = true;
		a._showUnsavedDialog = true;
		a._navGuard._pendingNavigation = () => {};

		a._navGuard.discardAndNavigate();
		expect(a._navGuard._pendingNavigation).toBeNull();
	});

	it("handles null _pendingNavigation gracefully", () => {
		const a = el as any;
		a._dirty = true;
		a._showUnsavedDialog = true;
		a._navGuard._pendingNavigation = null;

		// Should not throw
		expect(() => a._navGuard.discardAndNavigate()).not.toThrow();
		expect(a._dirty).toBe(false);
		expect(a._showUnsavedDialog).toBe(false);
	});

	it("full flow: guard -> store -> discard -> execute", () => {
		const a = el as any;
		a._dirty = true;
		const log: string[] = [];

		// Step 1: guard stores the action
		a._navGuard.guardNavigation(() => {
			log.push("navigated");
		});
		expect(log).toHaveLength(0);
		expect(a._showUnsavedDialog).toBe(true);

		// Step 2: discard and navigate
		a._navGuard.discardAndNavigate();
		expect(log).toEqual(["navigated"]);
		expect(a._dirty).toBe(false);
		expect(a._showUnsavedDialog).toBe(false);
		expect(a._navGuard._pendingNavigation).toBeNull();
	});
});
