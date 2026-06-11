/**
 * Registry-level tests for the shared history interception in
 * controllers/navigation-guard.ts: per-interceptor fault isolation in the
 * wrapper dispatch loop, and wrapper (re)installation when either history
 * method was clobbered. The controller itself is exercised end-to-end
 * through the panel suites (panel-nav-guard / panel-navigation /
 * panel-url-hash / panel-coverage-gaps).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type HistoryInterceptor,
	registerHistoryInterceptor,
	unregisterHistoryInterceptor,
} from "../../controllers/navigation-guard.js";

function makeInterceptor(
	overrides?: Partial<HistoryInterceptor>,
): HistoryInterceptor {
	return {
		intercept: vi.fn().mockReturnValue(false),
		hashMoved: vi.fn(),
		...overrides,
	};
}

describe("shared history interception registry", () => {
	const registered: HistoryInterceptor[] = [];
	let initialUrl: string;

	function register(interceptor: HistoryInterceptor): HistoryInterceptor {
		registerHistoryInterceptor(interceptor);
		registered.push(interceptor);
		return interceptor;
	}

	beforeEach(() => {
		initialUrl = `${location.pathname}${location.search}${location.hash}`;
	});

	afterEach(() => {
		for (const interceptor of registered.splice(0)) {
			unregisterHistoryInterceptor(interceptor);
		}
		// The registry is empty again — the bare originals are back; restore
		// the URL for the next test.
		history.replaceState(null, "", initialUrl);
		vi.restoreAllMocks();
	});

	it("install/restore round-trip leaves the bare originals in place", () => {
		const bare = history.pushState;
		const interceptor = makeInterceptor();
		registerHistoryInterceptor(interceptor);
		expect(history.pushState).not.toBe(bare);

		unregisterHistoryInterceptor(interceptor);
		expect(history.pushState).toBe((window as any).__eppOriginalPushState);
	});

	it("a throwing interceptor does not break history or starve later interceptors", () => {
		// One faulty instance (e.g. a zombie panel) must not turn every
		// history.pushState on the page into an exception, and must not
		// prevent the remaining interceptors from being consulted.
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const throwing = register(
			makeInterceptor({
				intercept: vi.fn(() => {
					throw new Error("zombie interceptor");
				}),
			}),
		);
		const healthy = register(makeInterceptor());

		expect(() => history.pushState({}, "", "/fault-isolated")).not.toThrow();

		// The call went through to the real history despite the throw...
		expect(location.pathname).toBe("/fault-isolated");
		// ...the healthy interceptor was still consulted...
		expect(healthy.intercept).toHaveBeenCalled();
		// ...and the failure was reported, not swallowed silently.
		expect(throwing.intercept).toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalled();
	});

	it("a throwing hashMoved does not starve later interceptors of the sync", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		register(
			makeInterceptor({
				hashMoved: vi.fn(() => {
					throw new Error("zombie hashMoved");
				}),
			}),
		);
		const healthy = register(makeInterceptor());

		history.pushState({}, "", `${location.pathname}#fault-hash`);

		expect(healthy.hashMoved).toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalled();
	});

	it("re-installs the wrappers when replaceState was clobbered after install", () => {
		// The "already live" fast path must verify BOTH methods: checking
		// pushState alone would skip reinstalling a clobbered replaceState,
		// leaving replaceState-driven navigation unguarded.
		register(makeInterceptor());
		const wrappedPush = history.pushState;

		const clobber: typeof history.replaceState = () => {};
		history.replaceState = clobber;

		const second = register(makeInterceptor());
		expect(history.replaceState).not.toBe(clobber);

		// The fresh wrappers dispatch to the registry.
		history.replaceState({}, "", `${location.pathname}`);
		expect(second.intercept).toHaveBeenCalled();
		// pushState interception is rebuilt too (same install path).
		expect(typeof wrappedPush).toBe("function");
		history.pushState({}, "", `${location.pathname}`);
		expect(second.intercept).toHaveBeenCalledTimes(2);
	});

	it("keeps the fast path when both wrappers are still live", () => {
		register(makeInterceptor());
		const wrappedPush = history.pushState;
		const wrappedReplace = history.replaceState;

		register(makeInterceptor());

		// Nothing was clobbered — no reinstall, the same wrappers stay.
		expect(history.pushState).toBe(wrappedPush);
		expect(history.replaceState).toBe(wrappedReplace);
	});
});
