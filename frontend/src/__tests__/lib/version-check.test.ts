import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForNewBundle, parseBundleHash } from "../../lib/version-check.js";

describe("parseBundleHash", () => {
	it("extracts the hash from a hashed bundle URL", () => {
		expect(
			parseBundleHash(
				"https://ha.local:8123/eppgrid_static/abc123def/eppgrid-panel.js",
			),
		).toBe("abc123def");
	});

	it("extracts the hash from a relative bundle URL", () => {
		expect(parseBundleHash("/eppgrid_static/deadbeef/eppgrid-panel.js")).toBe(
			"deadbeef",
		);
	});

	it("extracts the hash from the hashed CARD bundle URL", () => {
		// The dashboard card is a separate bundle; its own import.meta.url ends in
		// eppgrid-card.js, so the same parser must handle it too.
		expect(parseBundleHash("/eppgrid_static/card9999/eppgrid-card.js")).toBe(
			"card9999",
		);
		expect(
			parseBundleHash("/eppgrid_static/card9999/eppgrid-card.js?fe=1"),
		).toBe("card9999");
	});

	it("returns null for a URL that is not the hashed bundle path", () => {
		expect(parseBundleHash("https://ha.local/local/some-other.js")).toBeNull();
	});

	it("returns null for an unrelated hashed .js under the static path", () => {
		// Only the panel/card bundles carry the reload hash; a stray chunk name
		// must not be mistaken for the bundle.
		expect(parseBundleHash("/eppgrid_static/abc/eppgrid-other.js")).toBeNull();
	});

	it('returns null for the "0" read-error sentinel hash', () => {
		expect(parseBundleHash("/eppgrid_static/0/eppgrid-panel.js")).toBeNull();
	});

	it("matches the bundle even with a trailing query/fragment", () => {
		expect(parseBundleHash("/eppgrid_static/abc/eppgrid-panel.js?v=1")).toBe(
			"abc",
		);
		expect(parseBundleHash("/eppgrid_static/abc/eppgrid-panel.js#x")).toBe(
			"abc",
		);
	});

	it("returns null for a sourcemap-style URL (not the bundle itself)", () => {
		expect(
			parseBundleHash("/eppgrid_static/abc/eppgrid-panel.js.map"),
		).toBeNull();
	});

	it("returns null for empty / nullish input", () => {
		expect(parseBundleHash("")).toBeNull();
		expect(parseBundleHash(undefined)).toBeNull();
		expect(parseBundleHash(null)).toBeNull();
	});
});

describe("checkForNewBundle", () => {
	let storage: Storage;
	beforeEach(() => {
		const map = new Map<string, string>();
		storage = {
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => void map.set(k, v),
			removeItem: (k: string) => void map.delete(k),
			clear: () => map.clear(),
			key: () => null,
			length: 0,
		} as unknown as Storage;
	});

	it("reloads when the server reports a different hash, and resolves", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("does not reload when the server hash matches", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "same",
			fetchServerHash: async () => "same",
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
	});

	it("does not reload when our own hash is unknown, and resolves (no retry)", async () => {
		const reload = vi.fn();
		const fetchServerHash = vi.fn(async () => "new");
		const resolved = await checkForNewBundle({
			currentHash: null,
			fetchServerHash,
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
		// Can never compare → don't keep retrying.
		expect(resolved).toBe(true);
	});

	it("does not reload when the server lookup fails, and stays unresolved (retry)", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => {
				throw new Error("ws boom");
			},
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
		// Command unreachable (integration not up yet) → caller should retry.
		expect(resolved).toBe(false);
	});

	it("does not reload when the server hash is null, and stays unresolved (retry)", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => null,
			reload,
			storage,
		});
		expect(reload).not.toHaveBeenCalled();
		// Hash not stored yet (setup in flight) → caller should retry.
		expect(resolved).toBe(false);
	});

	it('treats the "0" server sentinel as resolved without reloading', async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "0",
			reload,
			storage,
		});
		// "0" means the server could not hash its own bundle — never reload to
		// that, and don't spin retrying.
		expect(reload).not.toHaveBeenCalled();
		expect(resolved).toBe(true);
	});

	it("does not reload a second time for the same server hash (loop guard)", async () => {
		const reload = vi.fn();
		const deps = {
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		};
		await checkForNewBundle(deps);
		await checkForNewBundle(deps);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("reloads again when the server advances to yet another hash", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new1",
			reload,
			storage,
		});
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new2",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it("clears a stale loop guard once versions match again", async () => {
		const reload = vi.fn();
		// First, a mismatch arms the guard.
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		// Then we are running the new bundle and the server agrees.
		await checkForNewBundle({
			currentHash: "new",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		// A later genuine mismatch back-to "new" must reload again, proving the
		// guard was cleared.
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it("still reloads when the guard store throws on read", async () => {
		const reload = vi.fn();
		const throwingStorage = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {},
			removeItem: () => {},
		} as unknown as Storage;
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage: throwingStorage,
		});
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("still reloads when the guard store throws on write", async () => {
		const reload = vi.fn();
		const throwingStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("QuotaExceededError");
			},
			removeItem: () => {},
		} as unknown as Storage;
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage: throwingStorage,
		});
		// A flaky/blocked sessionStorage must not swallow the reload — the loop
		// guard is best-effort.
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("tolerates a missing storage (no loop guard, still reloads once)", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage: null,
		});
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("keeps separate loop guards per guardKey (panel vs card share storage)", async () => {
		// The panel and the card run in the same SPA tab and share sessionStorage.
		// They compare against different server hashes, so a shared guard key could
		// let one bundle's reload clobber the other's loop protection. A distinct
		// guardKey isolates them: reloading under one key must not suppress a
		// genuine reload under another, even for the identical server hash.
		const reloadA = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload: reloadA,
			storage,
			guardKey: "eppgrid_reload_for_panel",
		});
		const reloadB = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload: reloadB,
			storage,
			guardKey: "eppgrid_reload_for_card",
		});
		expect(reloadA).toHaveBeenCalledTimes(1);
		expect(reloadB).toHaveBeenCalledTimes(1);
	});

	it("does not reload when canReload() is false, and leaves the loop guard unconsumed", async () => {
		// The panel passes canReload = () => this.isConnected, so a check that
		// resolves *after* the user navigated away from the panel must not reload
		// the whole page (disrupting wherever they went). Crucially it must also
		// leave the loop guard unwritten, so a later check — once the panel is
		// mounted again — still reloads. Otherwise the skip would permanently
		// suppress the real reload for that server hash.
		const reload = vi.fn();
		const deps = {
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		};
		const resolved = await checkForNewBundle({
			...deps,
			canReload: () => false,
		});
		expect(reload).not.toHaveBeenCalled();
		// Unresolved → the caller keeps the check pending and retries later.
		expect(resolved).toBe(false);

		// A later check while connected reloads — proving the guard wasn't
		// consumed by the skipped attempt.
		const resolved2 = await checkForNewBundle({
			...deps,
			canReload: () => true,
		});
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved2).toBe(true);
	});

	it("reloads as normal when canReload() is true", async () => {
		const reload = vi.fn();
		const resolved = await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
			canReload: () => true,
		});
		expect(reload).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(true);
	});

	it("still reloads (canReload absent) — the gate is opt-in", async () => {
		const reload = vi.fn();
		await checkForNewBundle({
			currentHash: "old",
			fetchServerHash: async () => "new",
			reload,
			storage,
		});
		expect(reload).toHaveBeenCalledTimes(1);
	});
});
