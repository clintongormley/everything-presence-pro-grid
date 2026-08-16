// Self-reload on a new panel bundle.
//
// The integration serves the bundle from a content-hashed path
// (`/eppgrid_static/<hash>/eppgrid-panel.js`), so an upgrade produces a new
// URL. That guarantees a *fresh fetch* returns fresh bytes, but it does not
// make an already-open tab re-fetch — the running module keeps serving the
// version it was loaded with. This module closes that gap: the running bundle
// reads its own hash from `import.meta.url`, asks the server for the current
// hash, and reloads the page when they differ (triggered on websocket
// reconnect, which an upgrade+restart always causes).

// Both the panel and the dashboard card are content-hashed bundles served from
// `/eppgrid_static/<hash>/eppgrid-(panel|card).js`; each reads its own hash from
// `import.meta.url`. Anchor the `.js` to the path end (or a `?query`/`#fragment`)
// so a sourcemap (`…eppgrid-panel.js.map`) or an unrelated chunk can't be
// mistaken for the bundle.
const BUNDLE_PATH_RE =
	/\/eppgrid_static\/([^/]+)\/eppgrid-(?:panel|card)\.js(?:[?#]|$)/;

// Default sessionStorage key recording the server hash we last reloaded for, so
// a single mismatch cannot cause an endless reload loop if a reload somehow
// fails to land on the new bundle. Callers that share storage with another
// bundle (panel vs card in the same SPA tab) pass their own `guardKey` so their
// guards can't clobber each other.
const RELOAD_GUARD_KEY = "eppgrid_reload_for_hash";

// Resolve sessionStorage without throwing: in some browsers the property
// *getter* itself throws (blocked storage / private mode), not just its
// methods, so a bare `sessionStorage` reference would reject the fire-and-forget
// version check and defeat the reload in exactly the case the loop guard is
// meant to tolerate. Returns null when unavailable; the check then runs without
// a loop guard. Shared by the panel and the card.
export function safeSessionStorage(): Storage | null {
	try {
		return typeof sessionStorage !== "undefined" ? sessionStorage : null;
	} catch {
		return null;
	}
}

/**
 * Extract the bundle content hash from a module URL. Returns null when the URL
 * is not the hashed bundle path, or when the hash is the server's "0"
 * read-error sentinel (treated as "unknown" so we never reload on it).
 */
export function parseBundleHash(url: string | null | undefined): string | null {
	if (!url) return null;
	const match = BUNDLE_PATH_RE.exec(url);
	const hash = match?.[1];
	if (!hash || hash === "0") return null;
	return hash;
}

type GuardStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// The loop guard is best-effort: a blocked or quota-limited store (private mode,
// etc.) must never throw out of the version check and swallow the reload.
function readGuard(
	storage: GuardStorage | null | undefined,
	key: string,
): string | null {
	try {
		return storage?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

function writeGuard(
	storage: GuardStorage | null | undefined,
	key: string,
	value: string | null,
): void {
	try {
		if (value === null) storage?.removeItem(key);
		else storage?.setItem(key, value);
	} catch {
		// ignore — see readGuard.
	}
}

export interface VersionCheckDeps {
	/** Hash of the currently-running bundle (from `import.meta.url`). */
	currentHash: string | null;
	/** Fetches the server's current bundle hash (null on unknown). */
	fetchServerHash: () => Promise<string | null>;
	/** Reloads the page. Injected so it can be asserted in tests. */
	reload: () => void;
	/** sessionStorage-like store for the loop guard; optional. */
	storage?: GuardStorage | null;
	/** Loop-guard storage key. Defaults to the panel's key; the card passes its
	 *  own so the two don't clobber each other's guard in a shared SPA tab. */
	guardKey?: string;
	/** Optional gate consulted on a confirmed mismatch, right before reloading.
	 *  When it returns false the reload is skipped *and* the loop guard is left
	 *  unwritten, and the check reports unresolved so a later trigger re-checks
	 *  and reloads when wanted. Lets a caller avoid reloading a page the user has
	 *  already navigated away from (e.g. the panel was detached mid-check).
	 *  Absent → always reload on a mismatch. */
	canReload?: () => boolean;
}

/**
 * Compare the running bundle against the server's current bundle and reload the
 * page when a newer one is available. Only a confirmed mismatch triggers a
 * reload; the loop guard prevents reloading twice for the same server hash.
 *
 * Returns whether the check is *resolved* — i.e. whether there is any point in
 * the caller retrying. The integration's WS command is only registered once the
 * integration finishes setting up after an HA restart, and its hash is stored a
 * moment later still; until then the lookup throws or returns null. Those cases
 * return `false` ("not resolved — retry"), so the caller can poll until the
 * backend answers. A definitive answer (match, mismatch, the unhashable "0"
 * sentinel, or an unknown local hash) returns `true` — with one exception: a
 * confirmed mismatch that `canReload` vetoes also returns `false`, so a caller
 * whose reload was skipped (e.g. the panel detached mid-check) re-checks later.
 */
export async function checkForNewBundle(
	deps: VersionCheckDeps,
): Promise<boolean> {
	const { currentHash, fetchServerHash, reload, storage } = deps;
	const guardKey = deps.guardKey ?? RELOAD_GUARD_KEY;
	// We can never compare without our own hash (e.g. served from a non-hashed
	// URL, or in tests) — resolved, nothing to retry.
	if (!currentHash) return true;

	let serverHash: string | null;
	try {
		serverHash = await fetchServerHash();
	} catch {
		// Command unreachable (integration still coming up) — retry.
		return false;
	}

	// Hash not stored yet (setup in flight) — retry.
	if (serverHash == null) return false;
	// "0" = the server could not hash its own bundle; a definitive (if useless)
	// answer. Never reload to it, and don't keep retrying.
	if (serverHash === "0") return true;

	// Both hashes are real, differing-or-not strings here (null/"0" handled
	// above), so a plain equality decides it.
	if (currentHash === serverHash) {
		// Versions match — clear any armed guard so a future genuine upgrade
		// isn't suppressed.
		writeGuard(storage, guardKey, null);
		return true;
	}

	// serverHash is a real, differing hash here.
	if (readGuard(storage, guardKey) === serverHash) return true;
	// Confirmed mismatch, but the caller may no longer want the reload (e.g. the
	// panel was detached mid-check). Skip without consuming the loop guard, and
	// report unresolved so a later trigger re-checks and reloads when wanted.
	// Checked after the guard read so an already-armed guard still short-circuits.
	if (deps.canReload && !deps.canReload()) return false;
	writeGuard(storage, guardKey, serverHash);
	reload();
	return true;
}
