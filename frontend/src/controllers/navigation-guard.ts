import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
	parseViewHash,
	type SidebarTab,
	type ViewMode,
	type ViewState,
	viewHash,
} from "../lib/view-hash.js";

// ---------------------------------------------------------------------------
// Shared history interception (unsaved-changes navigation guard)
//
// history.pushState/replaceState are wrapped ONCE at module level; the
// wrapper dispatches to whichever panel instances are currently connected
// via a registry that instances join in hostConnected and leave in
// hostDisconnected. The bare originals are restored only when the
// registry empties.
//
// Per-instance wrapping is unsafe under the mount guard's duplicate-panel
// cleanup (see panel-mount-guard.ts): the guard mounts panel A, HA's
// ha-panel-custom appends its own duplicate B (B's wrapper lands on top of
// A's), then removeDuplicateEppPanels keeps A and removes B. B's disconnect
// sees "my wrapper is the installed one" and restores the BARE original —
// leaving the still-connected A with no interception, so HA-router
// navigation while dirty discards unsaved edits without the dialog. A
// refcounted shared wrapper is ordering-independent: either instance can
// disconnect first and the survivor keeps its interception.
// ---------------------------------------------------------------------------

type HistoryMethod = typeof history.pushState;

export interface HistoryInterceptor {
	/**
	 * Offer a history call to the panel. Returns true when the panel
	 * captured it (unsaved-changes dialog shown, call swallowed).
	 */
	intercept(original: HistoryMethod, args: Parameters<HistoryMethod>): boolean;
	/** A delegated call moved the URL fragment — sync view state. */
	hashMoved(): void;
}

const historyInterceptors = new Set<HistoryInterceptor>();
let installedPushState: HistoryMethod | null = null;
let installedReplaceState: HistoryMethod | null = null;
// Module-level copies of the bare originals, captured at install time, so
// restore-on-empty doesn't depend on the window stash still being intact.
let originalPushState: HistoryMethod | null = null;
let originalReplaceState: HistoryMethod | null = null;

function makeSharedHistoryWrapper(original: HistoryMethod): HistoryMethod {
	return (data, unused, url) => {
		for (const interceptor of historyInterceptors) {
			// Per-interceptor isolation: one faulty instance (e.g. a zombie
			// panel HA kept pushing hass to) must not break history for the
			// page or starve the other interceptors of the dispatch.
			try {
				if (interceptor.intercept(original, [data, unused, url])) return;
			} catch (err) {
				console.error("eppgrid: history interceptor failed", err);
			}
		}
		const before = location.hash;
		original(data, unused, url);
		if (location.hash !== before) {
			for (const interceptor of historyInterceptors) {
				try {
					interceptor.hashMoved();
				} catch (err) {
					console.error("eppgrid: history interceptor failed", err);
				}
			}
		}
	};
}

export function registerHistoryInterceptor(
	interceptor: HistoryInterceptor,
): void {
	historyInterceptors.add(interceptor);
	if (
		installedPushState &&
		history.pushState === installedPushState &&
		installedReplaceState &&
		history.replaceState === installedReplaceState
	) {
		return; // BOTH shared wrappers are still live — nothing to (re)install
	}
	// Stash the truly-original (pre-wrap) methods on window once: a reloaded
	// module instance would otherwise capture a previous module's wrapper as
	// "original", chaining wrappers unboundedly across remounts.
	const w = window as any;
	if (!w.__eppOriginalPushState) {
		w.__eppOriginalPushState = history.pushState.bind(history);
	}
	if (!w.__eppOriginalReplaceState) {
		w.__eppOriginalReplaceState = history.replaceState.bind(history);
	}
	originalPushState = w.__eppOriginalPushState as HistoryMethod;
	originalReplaceState = w.__eppOriginalReplaceState as HistoryMethod;
	installedPushState = makeSharedHistoryWrapper(originalPushState);
	installedReplaceState = makeSharedHistoryWrapper(originalReplaceState);
	history.pushState = installedPushState;
	history.replaceState = installedReplaceState;
}

export function unregisterHistoryInterceptor(
	interceptor: HistoryInterceptor,
): void {
	historyInterceptors.delete(interceptor);
	if (historyInterceptors.size > 0) return;
	// Last connected instance gone — restore the originals, but only if our
	// wrapper is still the installed one. A freshly loaded module instance
	// may have installed its own wrapper on top (it dispatches through ITS
	// registry); restoring the bare original here would strip it.
	if (originalPushState && history.pushState === installedPushState) {
		history.pushState = originalPushState;
	}
	if (originalReplaceState && history.replaceState === installedReplaceState) {
		history.replaceState = originalReplaceState;
	}
	installedPushState = null;
	installedReplaceState = null;
	originalPushState = null;
	originalReplaceState = null;
}

/**
 * Structural shape of the panel as far as the navigation guard is
 * concerned (PanelHost precedent — the panel passes itself and tsc
 * verifies it actually has these members). The guard READS dirty/view
 * state and dialog visibility lives here too; the panel keeps owning the
 * fields so its templates and the other controllers see them unchanged.
 */
export interface NavigationGuardHost extends ReactiveControllerHost {
	_dirty: boolean;
	_view: ViewMode;
	_sidebarTab: SidebarTab;
	_showUnsavedDialog: boolean;
	/** Move to a target view + sub-tab (panel-owned side effects). */
	_applyView(state: ViewState): void;
}

/**
 * NavigationGuardController owns the unsaved-changes navigation guard:
 * the beforeunload prompt, the hashchange listener, URL-fragment <->
 * view-state syncing, and this instance's entry in the module-level
 * history-interception registry above. The panel keeps `_dirty`,
 * `_view`, `_sidebarTab` and the dialog rendering; the controller decides
 * when navigation is allowed and what runs after a discard.
 */
export class NavigationGuardController implements ReactiveController {
	private _host: NavigationGuardHost;
	// The un-patched replaceState for panel-driven hash writes (must not
	// re-enter the dirty-navigation interceptor). Captured from the window
	// stash, which registerHistoryInterceptor guarantees exists. pushState
	// needs no per-instance copy — nothing here calls it directly.
	private _originalReplaceState: HistoryMethod | null = null;
	// This instance's entry in the module-level history-interception
	// registry (see registerHistoryInterceptor above). Created once on
	// first connect and reused across reconnects.
	private _historyInterceptor: HistoryInterceptor | null = null;
	// Navigation queued behind the unsaved-changes dialog; runs on discard.
	private _pendingNavigation: (() => void) | null = null;

	constructor(host: NavigationGuardHost) {
		this._host = host;
		host.addController(this);
	}

	hostConnected(): void {
		window.addEventListener("beforeunload", this._beforeUnloadHandler);
		window.addEventListener("hashchange", this._onHashChange);

		// Intercept HA's client-side routing. pushState/replaceState do
		// not fire hashchange/popstate even when the hash changes, so
		// after delegating the shared wrapper syncs if (and only if) the
		// hash moved. Interception is installed once at module level and
		// dispatches through a registry of connected instances — see
		// registerHistoryInterceptor above for why per-instance wrapping
		// breaks under duplicate-panel cleanup.
		this._historyInterceptor ??= {
			intercept: (original, args) => {
				if (!this._interceptNavigation()) return false;
				this._pendingNavigation = () => {
					original(...args);
					window.dispatchEvent(new PopStateEvent("popstate"));
					this._onHashChange();
				};
				return true;
			},
			hashMoved: () => this._onHashChange(),
		};
		registerHistoryInterceptor(this._historyInterceptor);
		// The register call above guarantees the window stash exists; keep
		// a per-instance reference for _replaceHash (panel-driven hash
		// writes must not re-enter the interceptor).
		const w = window as any;
		this._originalReplaceState = w.__eppOriginalReplaceState as HistoryMethod;
	}

	hostDisconnected(): void {
		window.removeEventListener("beforeunload", this._beforeUnloadHandler);
		window.removeEventListener("hashchange", this._onHashChange);

		// Leave the shared history-interception registry. The originals are
		// restored only when the LAST connected instance leaves, so neither
		// teardown ordering of an overlap-mount (duplicate-panel cleanup or
		// remount overlap) can strip a live instance's interception.
		if (this._historyInterceptor) {
			unregisterHistoryInterceptor(this._historyInterceptor);
		}
	}

	private _beforeUnloadHandler = (e: BeforeUnloadEvent) => {
		if (this._host._dirty) {
			e.preventDefault();
			e.returnValue = "";
		}
	};

	private _interceptNavigation = (): boolean => {
		if (!this._host._dirty) return false;
		this._host._showUnsavedDialog = true;
		this._pendingNavigation = null; // no specific action — just allow navigation on discard
		return true;
	};

	/**
	 * Write the URL fragment via the un-patched replaceState (saved in
	 * hostConnected) so panel-driven hash updates don't re-enter the
	 * dirty-navigation interceptor.
	 */
	private _replaceHash(hash: string): void {
		if (typeof location === "undefined") return;
		if (hash === location.hash) return;
		const target = `${location.pathname}${location.search}${hash}`;
		const replace =
			this._originalReplaceState ?? history.replaceState.bind(history);
		// Preserve history.state so HA's router state isn't clobbered.
		replace(history.state, "", target);
	}

	/** Mirror the panel's current view state into the URL fragment. */
	syncHashFromState(): void {
		this._replaceHash(
			viewHash({ view: this._host._view, sidebarTab: this._host._sidebarTab }),
		);
	}

	/**
	 * React to external hash changes (browser back/forward, sidebar
	 * icon, manual URL edit). When dirty, snap the URL back so the
	 * queued navigation only fires once the user discards.
	 */
	private _onHashChange = (): void => {
		const host = this._host;
		const next = parseViewHash(location.hash);
		if (next.view === host._view && next.sidebarTab === host._sidebarTab) {
			return;
		}
		if (host._dirty) {
			this._replaceHash(
				viewHash({ view: host._view, sidebarTab: host._sidebarTab }),
			);
		}
		this.guardNavigation(() => host._applyView(next));
	};

	/** Guard navigation when dirty — shows dialog and queues the action */
	guardNavigation(action: () => void): void {
		if (this._host._dirty) {
			this._pendingNavigation = action;
			this._host._showUnsavedDialog = true;
		} else {
			action();
		}
	}

	/** The unsaved-changes dialog's Discard button. */
	discardAndNavigate(): void {
		this._host._dirty = false;
		this._host._showUnsavedDialog = false;
		if (this._pendingNavigation) {
			this._pendingNavigation();
			this._pendingNavigation = null;
		}
	}

	/** The unsaved-changes dialog's Cancel button — keep edits, stay put. */
	cancelPendingNavigation(): void {
		this._host._showUnsavedDialog = false;
		this._pendingNavigation = null;
	}
}
