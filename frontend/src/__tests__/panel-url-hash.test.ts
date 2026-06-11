/**
 * Tests for URL-fragment-driven view state.
 *
 * `_view` and `_sidebarTab` are derived from `location.hash` so per-tab
 * view state stays per-tab. Internal mutations should write the hash via
 * `history.replaceState` (NOT location.hash assignment, which pollutes
 * back/forward); external hash changes (browser back/forward, sidebar
 * icon, manual URL edit) feed back into the panel via `hashchange` /
 * `popstate` / pushState interception.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	a._dirty = false;
	a._loading = false;
	a._showUnsavedDialog = false;
	a._navGuard._pendingNavigation = null;
	return el;
}

function setHash(hash: string): void {
	// jsdom/happy-dom keeps location.hash mutable. Silently set it without
	// firing events (we want to control event timing in each test).
	history.replaceState(null, "", `${location.pathname}${hash}`);
}

beforeEach(() => {
	setHash("");
});

afterEach(() => {
	setHash("");
});

describe("panel — initial view state derived from URL fragment", () => {
	it("defaults to live overview when there is no hash", () => {
		setHash("");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("live");
		expect(a._sidebarTab).toBe("zones");
	});

	it("starts in editor + zones when hash is '#zones'", () => {
		setHash("#zones");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("zones");
	});

	it("starts in editor + furniture when hash is '#furniture'", () => {
		setHash("#furniture");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("furniture");
	});

	it("starts in editor + overlays when hash is '#overlays'", () => {
		setHash("#overlays");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("overlays");
	});

	it("starts in settings when hash is '#settings'", () => {
		setHash("#settings");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("settings");
	});

	it("starts in calibrate when hash is '#calibrate'", () => {
		setHash("#calibrate");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("calibrate");
	});

	it("starts in tutorial when hash is '#tutorial'", () => {
		setHash("#tutorial");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("tutorial");
	});

	it("ignores an unknown hash and falls back to live", () => {
		setHash("#bogus");
		const el = createPanel();
		const a = el as any;
		expect(a._view).toBe("live");
	});
});

describe("panel — internal view changes update the hash via replaceState", () => {
	it("entering editor with default sub-tab writes '#zones'", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._view = "editor";
		await el.updateComplete;
		expect(location.hash).toBe("#zones");
		el.remove();
	});

	it("preserves history.state when rewriting the hash", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		// Simulate HA's router seeding state.
		history.replaceState({ haRouter: "live" }, "", location.pathname);
		a._view = "editor";
		await el.updateComplete;
		expect(history.state).toEqual({ haRouter: "live" });
		expect(location.hash).toBe("#zones");
		el.remove();
	});

	it("changing _sidebarTab while in editor replaces the hash", async () => {
		setHash("#zones");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		a._sidebarTab = "furniture";
		await el.updateComplete;
		expect(location.hash).toBe("#furniture");
		el.remove();
	});

	it("returning _view to 'live' clears the hash", async () => {
		setHash("#zones");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		a._view = "live";
		await el.updateComplete;
		expect(location.hash).toBe("");
		el.remove();
	});

	it("setting _view to 'calibrate' writes '#calibrate'", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		a._view = "calibrate";
		await el.updateComplete;
		expect(location.hash).toBe("#calibrate");
		el.remove();
	});

	it("uses replaceState (does NOT push a history entry) when updating the hash", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		const pushSpy = vi.spyOn(history, "pushState");
		a._view = "editor";
		await el.updateComplete;
		expect(pushSpy).not.toHaveBeenCalled();
		pushSpy.mockRestore();
		el.remove();
	});

	it("does not write the hash when the serialized value already matches", async () => {
		setHash("#furniture");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		const replaceSpy = vi.spyOn(history, "replaceState");
		// Re-assigning to the same value should not call replaceState.
		a._view = "editor";
		a._sidebarTab = "furniture";
		await el.updateComplete;
		expect(replaceSpy).not.toHaveBeenCalled();
		replaceSpy.mockRestore();
		el.remove();
	});
});

describe("panel — external hash changes feed back into _view / _sidebarTab", () => {
	it("hashchange event updates _view when not dirty", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		setHash("#zones");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._view).toBe("editor");
		el.remove();
	});

	it("hashchange event updates _sidebarTab when not dirty", async () => {
		setHash("#zones");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		setHash("#overlays");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._sidebarTab).toBe("overlays");
		el.remove();
	});

	it("entering editor via hash resets _overlayMode and pushes widened range", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._overlayMode = "heatmap";
		const spy = vi.spyOn(a, "_pushWidenedDistanceOverride");
		await el.updateComplete;
		setHash("#zones");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._view).toBe("editor");
		expect(a._overlayMode).toBeNull();
		expect(spy).toHaveBeenCalled();
		el.remove();
	});

	it("entering editor + overlays via hash preserves _overlayMode", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._overlayMode = "heatmap";
		await el.updateComplete;
		setHash("#overlays");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._sidebarTab).toBe("overlays");
		expect(a._overlayMode).toBe("heatmap");
		el.remove();
	});

	it("entering calibrate via hash pushes widened range", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		const spy = vi.spyOn(a, "_pushWidenedDistanceOverride");
		await el.updateComplete;
		setHash("#calibrate");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._view).toBe("calibrate");
		expect(spy).toHaveBeenCalled();
		el.remove();
	});

	it("clearing the hash externally returns the panel to live", async () => {
		setHash("#furniture");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		setHash("");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._view).toBe("live");
		el.remove();
	});

	it("pushState that drops the fragment (HA sidebar icon click) returns to live", async () => {
		// The HA frontend's sidebar icon navigates via pushState. The
		// browser does NOT fire hashchange when pushState changes only
		// the hash portion, so the panel must observe pushState too.
		setHash("#zones");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		expect(a._view).toBe("editor");
		// Simulate HA's router clearing the fragment.
		history.pushState(null, "", location.pathname);
		await el.updateComplete;
		expect(a._view).toBe("live");
		el.remove();
	});

	it("pushState to a new fragment updates the panel state", async () => {
		setHash("");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		await el.updateComplete;
		history.pushState(null, "", `${location.pathname}#overlays`);
		await el.updateComplete;
		expect(a._view).toBe("editor");
		expect(a._sidebarTab).toBe("overlays");
		el.remove();
	});
});

describe("panel — hashchange while dirty fires unsaved-changes dialog", () => {
	it("snaps the hash back and shows the dialog when dirty", async () => {
		setHash("#zones");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._dirty = true;
		await el.updateComplete;
		// External nav: user hits browser back, hash becomes empty.
		setHash("");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		// View must NOT have changed.
		expect(a._view).toBe("editor");
		// Hash must have been snapped back to match the still-current view.
		expect(location.hash).toBe("#zones");
		// Dialog must be visible so the user can confirm or discard.
		expect(a._showUnsavedDialog).toBe(true);
		// Pending navigation is queued so discarding executes the desired nav.
		expect(typeof a._navGuard._pendingNavigation).toBe("function");
		el.remove();
	});

	it("discarding the dirty state then performs the queued navigation", async () => {
		setHash("#zones");
		const el = createPanel();
		document.body.appendChild(el);
		const a = el as any;
		a._dirty = true;
		await el.updateComplete;
		setHash("");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await el.updateComplete;
		expect(a._showUnsavedDialog).toBe(true);
		// Confirm discard.
		a._navGuard.discardAndNavigate();
		await el.updateComplete;
		expect(a._view).toBe("live");
		expect(location.hash).toBe("");
		expect(a._dirty).toBe(false);
		el.remove();
	});
});
