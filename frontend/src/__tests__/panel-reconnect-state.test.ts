/**
 * Tests for panel state preservation across HA WebSocket drops and
 * device availability blips.  The user-facing contract is: if you are
 * editing (or just viewing) a device and the device goes offline and
 * comes back, you return to exactly where you were — same tab, same
 * dirty edits, same perspective — without the panel refetching config
 * behind your back.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { registerPanelCleanup } from "./helpers/panel-cleanup.js";

type DeviceListCb = (msg: { devices: any[] }) => void;

const mountedPanels: EPPGridPanel[] = [];

function makeDevice(mac: string, available: boolean) {
	return {
		mac,
		name: "Alpha",
		host: null,
		available,
		configured: true,
		firmware_status: available ? "compatible" : "unavailable",
		current_connection_count: null,
		area: null,
	};
}

async function mountPanel(initialDevices: any[]) {
	localStorage.clear();
	if (initialDevices[0]) {
		localStorage.setItem("epp_selected_mac", initialDevices[0].mac);
	}
	const captured: { deviceListCb: DeviceListCb | null } = {
		deviceListCb: null,
	};
	const hass: any = {
		callWS: vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/get_config") {
				// Parser treats a missing calibration as `perspective: null`,
				// so setting _perspective manually in the test lets us detect
				// any stray _applyConfig() call as a regression.
				return Promise.resolve({
					config: { calibration: null, room_layout: {} },
				});
			}
			return Promise.resolve({});
		}),
		connection: {
			connected: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
				if (msg.type === "eppgrid/subscribe_device_list") {
					captured.deviceListCb = cb;
					cb({ devices: initialDevices });
				}
				return Promise.resolve(() => {});
			}),
		},
		locale: { language: "en" },
		language: "en",
	};
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = hass;
	document.body.appendChild(el);
	mountedPanels.push(el);
	await el.updateComplete;
	await new Promise((r) => setTimeout(r, 0));
	await new Promise((r) => setTimeout(r, 0));
	await el.updateComplete;
	return {
		el,
		a: el as any,
		hass,
		pushDeviceList: (devices: any[]) => captured.deviceListCb!({ devices }),
		getConfigCallCount: () =>
			(hass.callWS as any).mock.calls.filter(
				(c: any[]) => c[0]?.type === "eppgrid/get_config",
			).length,
		sessionSubCount: () =>
			(hass.connection.subscribeMessage as any).mock.calls.filter(
				(c: any[]) => c[1]?.type === "eppgrid/subscribe_device",
			).length,
	};
}

describe("panel state survives device offline→online", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	registerPanelCleanup(mountedPanels);

	it("preserves editor view and dirty state across unavailable→available", async () => {
		const { el, a, pushDeviceList } = await mountPanel([
			makeDevice("aa", true),
		]);
		// Simulate the user having opened the editor with a perspective
		// loaded and an in-progress edit.
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		a._dirty = true;
		a._furniture = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:sofa",
				label: "Sofa",
				x: 100,
				y: 100,
				width: 600,
				height: 600,
				rotation: 0,
				lockAspect: true,
			},
		];
		await el.updateComplete;

		// Device drops offline.
		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;

		// Device comes back online.
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._view).toBe("editor");
		expect(a._dirty).toBe(true);
		expect(a._furniture).toHaveLength(1);
		expect(a._furniture[0].id).toBe("f1");
		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(a._roomWidth).toBe(4000);
		expect(a._roomDepth).toBe(3000);
	});

	it("preserves perspective when device list arrives transiently empty then repopulates", async () => {
		const { el, a, pushDeviceList } = await mountPanel([
			makeDevice("aa", true),
		]);
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		await el.updateComplete;

		// HA integration reloads and pushes an empty list before it has
		// re-discovered devices.
		pushDeviceList([]);
		await el.updateComplete;

		// Device reappears.
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(a._view).toBe("editor");
		expect(a._selectedMac).toBe("aa");
	});

	it("does not refetch or reapply config on the reconnect path", async () => {
		const { el, pushDeviceList, getConfigCallCount } = await mountPanel([
			makeDevice("aa", true),
		]);
		const before = getConfigCallCount();

		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(getConfigCallCount()).toBe(before);
	});

	it("re-opens a fresh device session when the device transitions back to available", async () => {
		const { el, a, pushDeviceList, sessionSubCount } = await mountPanel([
			makeDevice("aa", true),
		]);
		const before = sessionSubCount();

		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(sessionSubCount()).toBeGreaterThan(before);
		expect(a._deviceCtrl.hasDeviceSession).toBe(true);
	});

	// --- HA WebSocket disconnect/reconnect paths ---
	//
	// On HA restart / WS drop, `_onHaReady` fires after reconnect and
	// triggers `_initialize`. That path must not refetch config (which
	// would call `_applyConfig` and overwrite in-memory state), and must
	// keep retrying when the device list comes back empty (integration
	// hasn't registered its custom WS commands yet).

	it("does not refetch config when _onHaReady fires after a WS drop", async () => {
		const { el, a, hass, getConfigCallCount } = await mountPanel([
			makeDevice("aa", true),
		]);
		const before = getConfigCallCount();
		// Simulate HA dropping the socket, then reconnecting.
		a._haConnected = false;
		(hass.connection as any).connected = true;
		a._onHaReady();
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		// No additional get_config round-trip — in-memory config is kept.
		expect(getConfigCallCount()).toBe(before);
	});

	it("preserves editor state across an HA reconnect", async () => {
		const { el, a, hass } = await mountPanel([makeDevice("aa", true)]);
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		a._dirty = true;
		a._furniture = [
			{
				id: "f1",
				type: "icon",
				icon: "mdi:sofa",
				label: "Sofa",
				x: 0,
				y: 0,
				width: 600,
				height: 600,
				rotation: 0,
				lockAspect: true,
			},
		];
		await el.updateComplete;

		a._haConnected = false;
		(hass.connection as any).connected = true;
		a._onHaReady();
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		expect(a._view).toBe("editor");
		expect(a._dirty).toBe(true);
		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(a._furniture).toHaveLength(1);
	});

	it("keeps editor + perspective when reconnect goes through the offline banner (device initially unavailable)", async () => {
		// Scenario mirroring the user's bug report: "if it hits device
		// offline then goes back to live overview; if not, goes back to
		// editor".  Simulates HA restart where the first post-reconnect
		// device list push marks the device unavailable (integration
		// still booting), THEN flips it back to available.  The panel
		// must not refetch config during this cycle — if it did,
		// get_config could race with the backend's half-loaded store
		// and come back with an empty config, setting _perspective to
		// null and flipping editor → uncalibrated-FOV wizard.
		const { el, a, hass, pushDeviceList, getConfigCallCount } =
			await mountPanel([makeDevice("aa", true)]);
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		await el.updateComplete;
		const before = getConfigCallCount();

		// WS drops, reconnects. Push arrives with the device marked
		// unavailable first (triggering offline banner).
		a._haConnected = false;
		(hass.connection as any).connected = true;
		pushDeviceList([makeDevice("aa", false)]);
		await el.updateComplete;
		a._onHaReady();
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		// Device comes back online.
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		// No config refetch during the whole reconnect cycle.
		expect(getConfigCallCount()).toBe(before);
		// Editor view and perspective survive the offline detour.
		expect(a._view).toBe("editor");
		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it("keeps the same epp-settings-view element mounted through a WS disconnect/reconnect cycle", async () => {
		// Unmounting the settings view wipes its private `_overrides` (every
		// unsaved toggle/slider edit). The inline-banner design keeps it
		// mounted through device blips; the HA-disconnected and loading render
		// branches must honour it too. Element identity proves no
		// unmount/remount happened.
		const { el, a, hass } = await mountPanel([makeDevice("aa", true)]);
		a._view = "settings";
		a._dirty = true;
		await el.updateComplete;
		const viewBefore = el.shadowRoot?.querySelector("epp-settings-view");
		expect(viewBefore).not.toBeNull();

		// HA drops the socket…
		a._haConnected = false;
		await el.updateComplete;
		expect(el.shadowRoot?.querySelector("epp-settings-view")).toBe(viewBefore);

		// …and comes back.
		(hass.connection as any).connected = true;
		a._onHaReady();
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		expect(el.shadowRoot?.querySelector("epp-settings-view")).toBe(viewBefore);
	});

	it("does not flash the loading screen on reconnect when devices are already loaded", async () => {
		// _onHaReady → _initialize used to set `_loading = true`
		// unconditionally, swapping the whole UI for the loading screen on
		// every reconnect even though the device list was still in memory.
		const { el, a, hass } = await mountPanel([makeDevice("aa", true)]);
		expect(a._loading).toBe(false);

		a._haConnected = false;
		(hass.connection as any).connected = true;
		a._onHaReady();

		// Synchronously after the ready event — _initialize runs up to its
		// first await before returning, so a loading flash would show here.
		expect(a._loading).toBe(false);
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;
		expect(a._loading).toBe(false);
	});

	it("mirrors _view to the URL fragment so a panel recreation returns to the same tab", async () => {
		// A full HA container restart can trigger the HA frontend to
		// recreate panel elements from scratch — losing any @state().
		// _view is user-facing navigation and must survive this cycle
		// (per-tab) so the editor/settings tab is restored when the
		// panel remounts.
		const { el, a } = await mountPanel([makeDevice("aa", true)]);
		a._view = "editor";
		await el.updateComplete;
		expect(location.hash).toBe("#zones");

		// Simulate the panel being torn down and recreated. The URL
		// fragment is preserved across the remount — that's the whole
		// point of using it.
		document.body.removeChild(el);
		mountedPanels.length = 0;
		const el2 = document.createElement("eppgrid-panel") as EPPGridPanel;
		document.body.appendChild(el2);
		mountedPanels.push(el2);
		await el2.updateComplete;
		expect((el2 as any)._view).toBe("editor");
	});

	it("loads config (not just reopens session) when the device becomes available for the first time", async () => {
		// Scenario: user opens the panel while their device is offline.
		// The controller's auto-reconnect used to always call
		// reopenSession() on the transition, which doesn't fetch config.
		// If the panel never successfully loaded config, we need a fetch
		// here or the UI is stuck on stale/default state forever.
		const { el, a, pushDeviceList, getConfigCallCount } = await mountPanel([
			makeDevice("aa", false),
		]);
		await el.updateComplete;
		// No config yet — device was offline on mount, so
		// `_isSelectedDeviceAvailable` gated out the fetch.
		expect(a._loadedConfigMac).toBeNull();
		const before = getConfigCallCount();

		// Device flips to available via a device-list push.
		pushDeviceList([makeDevice("aa", true)]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));
		await el.updateComplete;

		// The panel should now have fetched + applied config for "aa".
		expect(getConfigCallCount()).toBeGreaterThan(before);
		expect(a._loadedConfigMac).toBe("aa");
	});

	it("clears the URL fragment when user navigates back to live", async () => {
		const { el, a } = await mountPanel([makeDevice("aa", true)]);
		a._view = "editor";
		await el.updateComplete;
		expect(location.hash).toBe("#zones");

		a._view = "live";
		await el.updateComplete;
		expect(location.hash).toBe("");
	});

	it("mirrors _sidebarTab to the URL fragment so a panel recreation returns to the same editor tab", async () => {
		// Same recreation cycle as _view: an HA container restart can wipe
		// element state, so the sidebar tab (zones / overlays / furniture)
		// has to round-trip through the URL fragment too — otherwise users
		// in the furniture editor are silently dropped onto the zones tab.
		const { el, a } = await mountPanel([makeDevice("aa", true)]);
		a._view = "editor";
		a._sidebarTab = "furniture";
		await el.updateComplete;
		expect(location.hash).toBe("#furniture");

		document.body.removeChild(el);
		mountedPanels.length = 0;
		const el2 = document.createElement("eppgrid-panel") as EPPGridPanel;
		document.body.appendChild(el2);
		mountedPanels.push(el2);
		await el2.updateComplete;
		expect((el2 as any)._sidebarTab).toBe("furniture");
	});

	it("falls back to the 'no devices' placeholder after a stably empty list, even with a persisted selection", async () => {
		// Scenario: localStorage holds a mac from a prior session (or the
		// user just deleted the last device). Without an escape hatch, the
		// panel would keep showing the offline banner forever because
		// selectedMac is seeded from localStorage. After N empty retries
		// we render the "no devices configured" CTA instead.
		vi.useFakeTimers();
		try {
			localStorage.setItem("epp_selected_mac", "aa");
			const hass: any = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: {
					connected: true,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_device_list") {
							cb({ devices: [] });
						}
						return Promise.resolve(() => {});
					}),
				},
				locale: { language: "en" },
				language: "en",
			};
			const el = document.createElement("eppgrid-panel") as EPPGridPanel;
			el.hass = hass;
			document.body.appendChild(el);
			mountedPanels.push(el);
			await el.updateComplete;
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(0);

			// Advance the retry timer enough times to cross the escape
			// threshold (the _initialize retry fires every 2s).
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);
			await el.updateComplete;

			const html = el.shadowRoot?.innerHTML ?? "";
			expect(html).toContain("empty-state");
			// Offline banner should NOT be showing anymore.
			expect(html).not.toContain("mdi:access-point-off");
		} finally {
			vi.useRealTimers();
		}
	});

	it("retries subscribeDeviceList when the list arrives empty (integration still booting)", async () => {
		// Mount with an empty initial list, simulating HA restart where
		// `eppgrid/subscribe_device_list` succeeds but the integration
		// hasn't discovered devices yet.  The panel should schedule a
		// silent retry even though `_selectedMac` is still set from a
		// prior session.
		vi.useFakeTimers();
		try {
			localStorage.setItem("epp_selected_mac", "aa");
			let hasDevice = false;
			let subscribeCount = 0;
			const hass: any = {
				callWS: vi.fn().mockResolvedValue({}),
				connection: {
					connected: true,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					subscribeMessage: vi.fn().mockImplementation((cb: any, msg: any) => {
						if (msg.type === "eppgrid/subscribe_device_list") {
							subscribeCount++;
							cb({ devices: hasDevice ? [makeDevice("aa", true)] : [] });
						}
						return Promise.resolve(() => {});
					}),
				},
				locale: { language: "en" },
				language: "en",
			};
			const el = document.createElement("eppgrid-panel") as EPPGridPanel;
			el.hass = hass;
			document.body.appendChild(el);
			mountedPanels.push(el);
			await el.updateComplete;
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(0);

			// Nothing available yet — empty device list, retry scheduled.
			expect((el as any)._devices).toEqual([]);
			const before = subscribeCount;

			// Simulate the integration finishing its load: the next
			// subscription will now return the device.
			hasDevice = true;
			await vi.advanceTimersByTimeAsync(2000);
			await vi.advanceTimersByTimeAsync(0);

			expect(subscribeCount).toBeGreaterThan(before);
			expect((el as any)._devices).toHaveLength(1);
			expect((el as any)._devices[0].mac).toBe("aa");
		} finally {
			vi.useRealTimers();
		}
	});
});
