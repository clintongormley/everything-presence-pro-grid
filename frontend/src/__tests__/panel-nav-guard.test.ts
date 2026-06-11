/**
 * Tests for in-app click-time unsaved-changes guard.
 *
 * The hashchange listener is defence-in-depth; the preferred UX is to
 * intercept the click that *would* change view, fire the dialog before
 * the URL/state changes, and only mutate state once the user discards.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
	a._zoneConfigs = new Array(8).fill(null);
	a._activeZone = 0;
	a._loading = false;
	a._showUnsavedDialog = false;
	a._navGuard._pendingNavigation = null;
	return el;
}

beforeEach(() => {
	history.replaceState(null, "", location.pathname);
});

afterEach(() => {
	history.replaceState(null, "", location.pathname);
});

describe("_enterEditor — sidebar menu navigation", () => {
	it("changes view immediately when not dirty", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._dirty = false;
		await el.updateComplete;
		a._enterEditor("furniture");
		await el.updateComplete;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("furniture");
		expect(a._showUnsavedDialog).toBe(false);
		el.remove();
	});

	it("opens the unsaved-changes dialog when dirty and does NOT change view", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		// Simulate user already in editor with unsaved changes.
		a._view = "editor";
		a._sidebarTab = "zones";
		a._dirty = true;
		await el.updateComplete;
		// User clicks "Furniture" (sub-tab change inside editor).
		a._enterEditor("furniture");
		await el.updateComplete;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("zones");
		expect(a._showUnsavedDialog).toBe(true);
		expect(typeof a._navGuard._pendingNavigation).toBe("function");
		el.remove();
	});

	it("discarding then performs the queued sub-tab change", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "zones";
		a._dirty = true;
		await el.updateComplete;
		a._enterEditor("furniture");
		await el.updateComplete;
		a._navGuard.discardAndNavigate();
		await el.updateComplete;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("furniture");
		expect(a._dirty).toBe(false);
		expect(location.hash).toBe("#furniture");
		el.remove();
	});
});

describe("_changePlacement — calibration wizard navigation", () => {
	it("enters tutorial view and writes '#tutorial' when the tutorial preference is true", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._dirty = false;
		// _deviceCtrl exists once mounted; set the preference for this test.
		a._deviceCtrl.showRoomCalibrationTutorial = true;
		await el.updateComplete;
		a._changePlacement();
		await el.updateComplete;
		expect(a._view).toBe("tutorial");
		expect(location.hash).toBe("#tutorial");
		el.remove();
	});

	it("enters calibrate view and writes '#calibrate' when the tutorial preference is false", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._dirty = false;
		a._deviceCtrl.showRoomCalibrationTutorial = false;
		await el.updateComplete;
		a._changePlacement();
		await el.updateComplete;
		expect(a._view).toBe("calibrate");
		expect(location.hash).toBe("#calibrate");
		el.remove();
	});

	it("opens the unsaved-changes dialog when dirty and does NOT enter calibrate", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._view = "editor";
		a._dirty = true;
		await el.updateComplete;
		a._changePlacement();
		await el.updateComplete;
		expect(a._view).toBe("editor");
		expect(a._showUnsavedDialog).toBe(true);
		el.remove();
	});
});

// `_sidebarTab` is the editor's sub-tab. Six paths set `_view = "live"`
// directly (applyLayout, saveSettings, _cancelEditor, _cancelSettings,
// calibration-complete, delete-calibration); the panel must reset
// `_sidebarTab` on any non-editor transition so stale values can't leak
// into live-view consumers — the original case was furniture staying
// draggable on the live overview after a save from the furniture editor,
// where a 0-delta drag dirtied the panel.
describe("_sidebarTab invariant: meaningful only inside editor view", () => {
	it.each([
		"live",
		"settings",
		"tutorial",
		"calibrate",
	] as const)("resets _sidebarTab to default when _view becomes %s", async (view) => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		await el.updateComplete;
		a._view = view;
		await el.updateComplete;
		expect(a._sidebarTab).toBe("zones");
		el.remove();
	});

	it("leaves _sidebarTab alone when staying inside editor view", async () => {
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		await el.updateComplete;
		// A re-render that doesn't change _view (e.g. unrelated state ticks)
		// must NOT clobber the user's chosen sub-tab.
		a._dirty = true;
		await el.updateComplete;
		expect(a._sidebarTab).toBe("furniture");
		el.remove();
	});
});
