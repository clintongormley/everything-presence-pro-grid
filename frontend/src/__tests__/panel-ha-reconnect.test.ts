/**
 * Tests for panel behaviour when the Home Assistant WebSocket connection
 * drops and reconnects.  The panel should render a "connecting" UI while
 * disconnected, and re-initialise when the connection becomes ready again.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";

type Listener = (...args: any[]) => void;

function mockConnection(connected: boolean) {
	const listeners: Record<string, Listener[]> = {};
	return {
		connected,
		subscribeMessage: vi.fn().mockResolvedValue(vi.fn()),
		addEventListener: vi.fn((event: string, cb: Listener) => {
			if (!listeners[event]) listeners[event] = [];
			listeners[event].push(cb);
		}),
		removeEventListener: vi.fn((event: string, cb: Listener) => {
			listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
		}),
		// Test helper – fire all listeners for an event synchronously.
		__emit(event: string, ...args: any[]) {
			for (const l of listeners[event] || []) l(...args);
		},
		__listenerCount(event: string) {
			return (listeners[event] || []).length;
		},
	};
}

function mockHass(connected = true) {
	const connection = mockConnection(connected);
	return {
		callWS: vi.fn().mockResolvedValue({ devices: [] }),
		connected,
		connection,
		locale: { language: "en" },
		language: "en",
	};
}

describe("panel HA reconnect handling", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	it("renders a reconnecting UI when hass.connection.connected is false", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = mockHass(false);
		const a = el as any;
		// Force past the initial loading state so we're in the main render path.
		a._loading = false;
		a._devices = [
			{
				mac: "aa",
				name: "Alpha",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
				current_connection_count: null,
			},
		];
		a._selectedMac = "aa";

		const result = a.render();
		// Render result is a Lit TemplateResult – stringify by grabbing its values.
		const serialised = JSON.stringify(result, (_k, v) =>
			typeof v === "function" ? "[fn]" : v,
		);
		// Must mention that we are (re)connecting to Home Assistant, not to the device.
		expect(serialised.toLowerCase()).toMatch(/home assistant|reconnect/);
	});

	it("registers ready/disconnected listeners on hass.connection when connected", async () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		// After connection, the panel should have registered listeners on both events.
		expect(hass.connection.__listenerCount("ready")).toBeGreaterThan(0);
		expect(hass.connection.__listenerCount("disconnected")).toBeGreaterThan(0);
		document.body.removeChild(el);
	});

	it("removes connection listeners when the element is disconnected", async () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(hass.connection.__listenerCount("ready")).toBeGreaterThan(0);
		document.body.removeChild(el);
		expect(hass.connection.__listenerCount("ready")).toBe(0);
		expect(hass.connection.__listenerCount("disconnected")).toBe(0);
	});

	it("does not leak an unhandled rejection when _initialize fails during connect", async () => {
		const unhandled: unknown[] = [];
		const handler = (reason: unknown) => {
			unhandled.push(reason);
		};
		process.on("unhandledRejection", handler);
		try {
			const el = document.createElement("eppgrid-panel") as EPPGridPanel;
			const hass = mockHass(true);
			hass.connection.subscribeMessage = vi
				.fn()
				.mockRejectedValue(new Error("socket closed"));
			hass.callWS = vi.fn().mockRejectedValue(new Error("socket closed"));
			el.hass = hass;
			document.body.appendChild(el);
			await new Promise((r) => setTimeout(r, 0));
			await new Promise((r) => setTimeout(r, 0));
			expect(unhandled).toEqual([]);
			document.body.removeChild(el);
		} finally {
			process.off("unhandledRejection", handler);
		}
	});

	it("does not re-attach connection listeners on a zombie panel", async () => {
		// HA keeps pushing `hass` to elements it has already removed from the
		// DOM (the panel resolver holds a reference briefly). Lit still runs
		// the update cycle on those zombies, and re-attaching ready/disconnected
		// listeners would undo disconnectedCallback's teardown and pin the dead
		// panel in memory via the connection's listener list.
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		document.body.removeChild(el);
		expect(hass.connection.__listenerCount("ready")).toBe(0);

		// Late hass push on the detached element re-runs updated().
		el.hass = { ...hass };
		await el.updateComplete;

		expect(hass.connection.__listenerCount("ready")).toBe(0);
		expect(hass.connection.__listenerCount("disconnected")).toBe(0);
	});

	it("dedupes concurrent _initialize calls into a single device-list subscription", async () => {
		// While `_loading && !_devices.length`, every hass push re-enters
		// _initialize via updated(). Without an in-flight guard each run
		// tears down and re-creates the device-list subscription (~2
		// subscribes + 1 unsub per mount).
		let resolveSub!: (unsub: () => void) => void;
		const subPromise = new Promise<() => void>((resolve) => {
			resolveSub = resolve;
		});
		const hass = mockHass(true);
		hass.connection.subscribeMessage = vi
			.fn()
			.mockImplementation((cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device_list") {
					cb({
						devices: [
							{
								mac: "aa",
								name: "Alpha",
								host: null,
								available: false,
								configured: true,
								firmware_status: "unavailable",
								current_connection_count: null,
								area: null,
							},
						],
					});
					return subPromise;
				}
				return Promise.resolve(vi.fn());
			});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		document.body.appendChild(el); // _initialize #1 blocks on the subscribe
		const a = el as any;
		void a._initialize(); // #2 concurrent
		void a._initialize(); // #3 concurrent
		resolveSub(vi.fn());
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));

		const listSubs = (
			hass.connection.subscribeMessage as any
		).mock.calls.filter(
			(c: any[]) => c[1]?.type === "eppgrid/subscribe_device_list",
		);
		expect(listSubs).toHaveLength(1);
		document.body.removeChild(el);
	});

	it("does not leak an unhandled rejection when updated() triggers a failing _initialize", async () => {
		const unhandled: unknown[] = [];
		const handler = (reason: unknown) => {
			unhandled.push(reason);
		};
		process.on("unhandledRejection", handler);
		try {
			const el = document.createElement("eppgrid-panel") as EPPGridPanel;
			const hass = mockHass(true);
			el.hass = hass;
			document.body.appendChild(el);
			await el.updateComplete;
			const a = el as any;
			// Force the `_loading && !_devices.length` branch in updated() and
			// make _initialize reject — the call site must swallow it like the
			// other two call sites do. NOTE: must be a raw assignment, not
			// vi.spyOn().mockRejectedValue() — the spy machinery attaches its
			// own handlers to returned promises, masking the unhandled
			// rejection this test exists to detect.
			a._initialize = () => Promise.reject(new Error("boom"));
			a._loading = true;
			a._devices = [];
			el.hass = { ...hass };
			await el.updateComplete;
			await new Promise((r) => setTimeout(r, 0));
			await new Promise((r) => setTimeout(r, 0));
			expect(unhandled).toEqual([]);
			document.body.removeChild(el);
		} finally {
			process.off("unhandledRejection", handler);
		}
	});

	it("does not apply config or open a session when the panel is removed mid config-load", async () => {
		// Navigating away while get_config is in flight: the resumed pipeline
		// used to apply config to the dead element and open a device session
		// nothing would ever close (occupying one of the ESP32's API slots).
		let resolveConfig!: (v: any) => void;
		const hass = mockHass(true);
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/get_config") {
				return new Promise((resolve) => {
					resolveConfig = resolve;
				});
			}
			return Promise.resolve({});
		});
		hass.connection.subscribeMessage = vi
			.fn()
			.mockImplementation((cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device_list") {
					cb({
						devices: [
							{
								mac: "aa",
								name: "Alpha",
								host: null,
								available: true,
								configured: true,
								firmware_status: "compatible",
								current_connection_count: null,
								area: null,
							},
						],
					});
				}
				return Promise.resolve(vi.fn());
			});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		const a = el as any;

		// Panel torn down while the config fetch is pending.
		document.body.removeChild(el);
		resolveConfig({
			config: {
				calibration: {
					perspective: [1, 2, 3, 4, 5, 6, 7, 8, 9],
					room_width: 4000,
					room_depth: 3000,
				},
				room_layout: {},
			},
		});
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));

		expect(a._loadedConfigMac).toBeNull();
		expect(a._perspective).toBeNull();
		const deviceSubs = (
			hass.connection.subscribeMessage as any
		).mock.calls.filter(
			(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
		);
		expect(deviceSubs).toHaveLength(0);
	});

	it("requests a re-render when a 'ready' event fires after disconnect", async () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const hass = mockHass(true);
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._loading = false;
		a._devices = [
			{
				mac: "aa",
				name: "Alpha",
				host: null,
				available: true,
				configured: true,
				firmware_status: "compatible",
				current_connection_count: null,
			},
		];
		a._selectedMac = "aa";
		await el.updateComplete;

		const spy = vi.spyOn(el, "requestUpdate");
		// Simulate HA losing the socket…
		hass.connection.connected = false;
		hass.connection.__emit("disconnected");
		// …and coming back.
		hass.connection.connected = true;
		hass.connection.__emit("ready");

		expect(spy).toHaveBeenCalled();
		document.body.removeChild(el);
	});

	async function mountForBundleCheck(serverHash: string | null) {
		const hass = mockHass(true);
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				return Promise.resolve({ hash: serverHash });
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		return { el, hass, a: el as any };
	}

	function reconnect(hass: ReturnType<typeof mockHass>) {
		hass.connection.connected = false;
		hass.connection.__emit("disconnected");
		hass.connection.connected = true;
		hass.connection.__emit("ready");
	}

	async function flush() {
		for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
	}

	it("reloads the page when a reconnect reveals a newer bundle", async () => {
		const { el, hass, a } = await mountForBundleCheck("new");
		a._currentBundleHash = "old";
		const reload = vi.fn();
		a._reloadPage = reload;

		reconnect(hass);
		await flush();

		expect(hass.callWS).toHaveBeenCalledWith({
			type: "eppgrid/frontend_version",
		});
		expect(reload).toHaveBeenCalledTimes(1);
		document.body.removeChild(el);
	});

	it("does not reload when the reconnect bundle hash matches", async () => {
		const { el, hass, a } = await mountForBundleCheck("same");
		a._currentBundleHash = "same";
		const reload = vi.fn();
		a._reloadPage = reload;

		reconnect(hass);
		await flush();

		expect(reload).not.toHaveBeenCalled();
		document.body.removeChild(el);
	});

	it("retries the bundle check until the integration answers, then reloads", async () => {
		// On a reconnect right after an HA restart, the eppgrid WS command may
		// not be registered yet — the first lookup errors. The check must keep
		// trying across re-init passes and reload once the backend answers.
		const hass = mockHass(true);
		let attempt = 0;
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				attempt += 1;
				if (attempt === 1) {
					return Promise.reject(new Error("unknown_command"));
				}
				return Promise.resolve({ hash: "new" });
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._currentBundleHash = "old";
		const reload = vi.fn();
		a._reloadPage = reload;

		// First reconnect: command errors → no reload yet, but still pending.
		reconnect(hass);
		await flush();
		expect(reload).not.toHaveBeenCalled();

		// A subsequent re-init pass (the panel's existing retry) gets a real
		// answer → reload.
		await a._initialize();
		await flush();
		expect(reload).toHaveBeenCalledTimes(1);
		document.body.removeChild(el);
	});

	it("stops checking once the integration answers (no repeated version queries)", async () => {
		const { el, hass, a } = await mountForBundleCheck("same");
		a._currentBundleHash = "same";
		a._reloadPage = vi.fn();

		reconnect(hass);
		await flush();
		// A definitive "same" answer resolves the check; further re-init passes
		// must not keep polling the version endpoint.
		await a._initialize();
		await a._initialize();
		await flush();

		const versionCalls = (hass.callWS as any).mock.calls.filter(
			(c: any[]) => c[0]?.type === "eppgrid/frontend_version",
		);
		expect(versionCalls).toHaveLength(1);
		document.body.removeChild(el);
	});

	it("checks the bundle version on initial connect and reloads when it reveals a newer bundle", async () => {
		// Regression: a user who upgrades + restarts HA and *then* navigates to
		// the panel (the browser tab stayed open across the restart, so its SPA
		// still serves the pre-upgrade bundle) never observes a
		// disconnect→reconnect while the panel is mounted — so a reconnect-only
		// check never fires and the stale bundle runs until a manual refresh.
		// The panel must verify its own bundle on initial connect too.
		const hass = mockHass(true);
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				return Promise.resolve({ hash: "new" });
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		const a = el as any;
		// Set the running-bundle hash + reload spy before mount, so the
		// initial-connect check reads them (the check fires during mount).
		a._currentBundleHash = "old";
		const reload = vi.fn();
		a._reloadPage = reload;

		document.body.appendChild(el); // initial mount — no reconnect
		await el.updateComplete;
		await flush();

		expect(hass.callWS).toHaveBeenCalledWith({
			type: "eppgrid/frontend_version",
		});
		expect(reload).toHaveBeenCalledTimes(1);
		document.body.removeChild(el);
	});

	it("checks the bundle version only once across repeated hass pushes on one mount", async () => {
		// The initial-connect check must fire once per mount, not on every `hass`
		// push (HA streams them constantly). The connection-identity guard in
		// `_attachConnectionListeners` provides that latch.
		const hass = mockHass(true);
		let versionCalls = 0;
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				versionCalls += 1;
				return Promise.resolve({ hash: "same" });
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		(el as any)._currentBundleHash = "same";

		document.body.appendChild(el);
		await el.updateComplete;
		await flush();
		// Further hass pushes carrying the *same* connection object must not re-arm.
		el.hass = { ...hass };
		await el.updateComplete;
		el.hass = { ...hass };
		await flush();

		expect(versionCalls).toBe(1);
		document.body.removeChild(el);
	});

	it("does not reload on initial connect when the bundle hash matches", async () => {
		const hass = mockHass(true);
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				return Promise.resolve({ hash: "same" });
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		const a = el as any;
		a._currentBundleHash = "same";
		const reload = vi.fn();
		a._reloadPage = reload;

		document.body.appendChild(el);
		await el.updateComplete;
		await flush();

		expect(reload).not.toHaveBeenCalled();
		document.body.removeChild(el);
	});

	it("does not issue concurrent version queries while one is in flight", async () => {
		let resolveFetch!: (v: unknown) => void;
		const hass = mockHass(true);
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				return new Promise((r) => {
					resolveFetch = r;
				});
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._currentBundleHash = "old";
		const reload = vi.fn();
		a._reloadPage = reload;
		a._bundleCheckPending = true;

		// Two checks while the first lookup is still pending.
		void a._maybeCheckForNewBundle();
		void a._maybeCheckForNewBundle();
		await flush();

		const versionCalls = (hass.callWS as any).mock.calls.filter(
			(c: any[]) => c[0]?.type === "eppgrid/frontend_version",
		);
		expect(versionCalls).toHaveLength(1);

		resolveFetch({ hash: "new" });
		await flush();
		expect(reload).toHaveBeenCalledTimes(1);
		document.body.removeChild(el);
	});

	it("still reloads when accessing sessionStorage throws (blocked storage)", async () => {
		const hass = mockHass(true);
		hass.callWS = vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/frontend_version") {
				return Promise.resolve({ hash: "new" });
			}
			return Promise.resolve({ devices: [] });
		});
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		el.hass = hass;
		document.body.appendChild(el);
		await el.updateComplete;
		const a = el as any;
		a._currentBundleHash = "old";
		const reload = vi.fn();
		a._reloadPage = reload;

		// Some browsers throw on the sessionStorage *getter* itself (blocked /
		// private mode), not just on its methods.
		const had = Object.hasOwn(globalThis, "sessionStorage");
		const original = Object.getOwnPropertyDescriptor(
			globalThis,
			"sessionStorage",
		);
		Object.defineProperty(globalThis, "sessionStorage", {
			configurable: true,
			get() {
				throw new Error("SecurityError: storage is blocked");
			},
		});
		try {
			reconnect(hass);
			await flush();
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			if (had && original) {
				Object.defineProperty(globalThis, "sessionStorage", original);
			} else {
				delete (globalThis as any).sessionStorage;
			}
		}
		document.body.removeChild(el);
	});

	it("reloads the page via location.reload by default", () => {
		const el = document.createElement("eppgrid-panel") as EPPGridPanel;
		const original = window.location.reload;
		const reload = vi.fn();
		Object.defineProperty(window.location, "reload", {
			configurable: true,
			value: reload,
		});
		try {
			(el as any)._reloadPage();
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(window.location, "reload", {
				configurable: true,
				value: original,
			});
		}
	});
});
