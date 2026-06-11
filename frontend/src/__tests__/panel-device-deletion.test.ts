import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";
import { registerPanelCleanup } from "./helpers/panel-cleanup.js";

type DeviceListCb = (msg: { devices: any[] }) => void;

const mountedPanels: EPPGridPanel[] = [];

function mockDeviceInfo(mac: string, name: string, available = true) {
	return {
		mac,
		name,
		host: null,
		available,
		configured: true,
		firmware_status: available ? "compatible" : "unavailable",
		current_connection_count: null,
	};
}

function makeHass(initialDevices: any[]) {
	const captured: { deviceListCb: DeviceListCb | null } = {
		deviceListCb: null,
	};
	const hass = {
		callWS: vi.fn().mockImplementation((msg: any) => {
			if (msg.type === "eppgrid/get_config") {
				return Promise.resolve({
					config: {
						calibration: { perspective: null, room_width: 0, room_depth: 0 },
						room_layout: {},
					},
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
					return Promise.resolve(() => {});
				}
				return Promise.resolve(() => {});
			}),
		},
		locale: { language: "en" },
		language: "en",
	};
	return { hass, captured };
}

async function mountPanel(initialDevices: any[]): Promise<{
	el: EPPGridPanel;
	a: any;
	pushDeviceList: (devices: any[]) => void;
}> {
	localStorage.clear();
	if (initialDevices[0]) {
		localStorage.setItem("epp_selected_mac", initialDevices[0].mac);
	}
	const { hass, captured } = makeHass(initialDevices);
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
		pushDeviceList: (devices) => captured.deviceListCb!({ devices }),
	};
}

describe("panel device list transitions", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	registerPanelCleanup(mountedPanels);

	// --- Auto-switch when the selected device disappears but others remain ---

	it("auto-selects the first remaining device and loads its config when the selected one is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");

		pushDeviceList([dev2]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._selectedMac).toBe("bb");
		expect(loadSpy).toHaveBeenCalledWith("bb");
	});

	it("persists the replacement MAC to localStorage on auto-select", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, pushDeviceList } = await mountPanel([dev1, dev2]);
		expect(localStorage.getItem("epp_selected_mac")).toBe("aa");

		pushDeviceList([dev2]);
		await el.updateComplete;

		expect(localStorage.getItem("epp_selected_mac")).toBe("bb");
	});

	it("swallows _loadDeviceConfig rejection on auto-switch without leaking an unhandled promise", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		vi.spyOn(a, "_loadDeviceConfig").mockRejectedValue(new Error("nope"));

		const unhandled: unknown[] = [];
		const handler = (reason: unknown) => {
			unhandled.push(reason);
		};
		process.on("unhandledRejection", handler);
		try {
			pushDeviceList([dev2]);
			await el.updateComplete;
			await new Promise((r) => setTimeout(r, 0));
			await new Promise((r) => setTimeout(r, 0));
			expect(unhandled).toEqual([]);
		} finally {
			process.off("unhandledRejection", handler);
		}
	});

	it("does not auto-switch away from a dirty editor when the selected device is removed", async () => {
		// Auto-switching loads the replacement device's config straight over
		// the user's unsaved edits with no prompt. With a dirty host the
		// switch is deferred: the missing mac stays selected (rendering as
		// offline) until the user saves/discards or the device returns.
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		a._dirty = true;
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");
		loadSpy.mockClear();

		pushDeviceList([dev2]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._selectedMac).toBe("aa");
		expect(loadSpy).not.toHaveBeenCalled();
		expect(localStorage.getItem("epp_selected_mac")).toBe("aa");
	});

	it("auto-switches on the next push once the dirty edits are resolved", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		a._dirty = true;
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");
		loadSpy.mockClear();

		pushDeviceList([dev2]);
		await el.updateComplete;
		expect(a._selectedMac).toBe("aa");

		// User saves or discards, then the next device-list push lands.
		a._dirty = false;
		pushDeviceList([dev2]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._selectedMac).toBe("bb");
		expect(loadSpy).toHaveBeenCalledWith("bb");
	});

	it("does not auto-load when the replacement device is offline", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo", false);
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");
		loadSpy.mockClear();

		pushDeviceList([dev2]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		expect(a._selectedMac).toBe("bb");
		expect(loadSpy).not.toHaveBeenCalled();
	});

	// --- Transient empty list / selected device missing: state must survive ---

	it("keeps the selected MAC when the device list becomes empty (transient absence)", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		const loadSpy = vi.spyOn(a, "_loadDeviceConfig");
		loadSpy.mockClear();

		pushDeviceList([]);
		await el.updateComplete;
		await new Promise((r) => setTimeout(r, 0));

		// Empty list is ambiguous (HA restart / integration reload vs real
		// deletion) — we keep the selection so state survives a round-trip.
		expect(a._selectedMac).toBe("aa");
		expect(loadSpy).not.toHaveBeenCalled();
		expect(localStorage.getItem("epp_selected_mac")).toBe("aa");
	});

	it("preserves config-derived state (_perspective, furniture, view) when selected device disappears from list", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		a._view = "editor";
		a._dirty = true;
		a._grid = new Uint8Array(GRID_CELL_COUNT).fill(1);
		await el.updateComplete;

		pushDeviceList([]);
		await el.updateComplete;

		expect(a._perspective).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(a._roomWidth).toBe(4000);
		expect(a._roomDepth).toBe(3000);
		expect(a._view).toBe("editor");
		expect(a._dirty).toBe(true);
		expect(Array.from(a._grid as Uint8Array).every((b) => b === 1)).toBe(true);
	});

	// --- Session close behaviour when the device becomes unavailable ---

	it("closes the device session when the selected device transitions away from available", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		const closeSpy = vi.spyOn(a._deviceCtrl, "closeDeviceSession");

		pushDeviceList([]);
		await el.updateComplete;

		expect(closeSpy).toHaveBeenCalled();
	});

	it("clears high-frequency live state on session close, preserves env sensors", async () => {
		// Targets / occupancy / presence flags are cleared because stale flags
		// are visibly misleading on the live grid. Env sensor values are
		// preserved so the env-offset slider's render output (`raw + offset`)
		// stays the same across the offline cycle — otherwise Lit would
		// clobber the user's drag-set DOM value with "—" then with the raw
		// reading on reconnect.
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		a._sensorState = {
			occupancy: true,
			static_presence: true,
			motion_presence: true,
			target_presence: true,
			illuminance: 500,
			temperature: 22,
			humidity: 40,
			co2: 600,
		};
		a._zoneState = {
			occupancy: { 1: true },
			target_counts: { 1: 2 },
			frame_count: 42,
		};
		await el.updateComplete;

		pushDeviceList([]);
		await el.updateComplete;

		// Cleared.
		expect(a._sensorState.occupancy).toBe(false);
		expect(a._sensorState.static_presence).toBe(false);
		expect(a._sensorState.motion_presence).toBe(false);
		expect(a._sensorState.target_presence).toBe(false);
		expect(a._zoneState.occupancy).toEqual({});
		expect(a._zoneState.target_counts).toEqual({});
		expect(a._zoneState.frame_count).toBe(0);
		// Preserved (slow-changing, kept across the offline window).
		expect(a._sensorState.illuminance).toBe(500);
		expect(a._sensorState.temperature).toBe(22);
		expect(a._sensorState.humidity).toBe(40);
		expect(a._sensorState.co2).toBe(600);
	});

	it("resets the zone engine state when the session closes", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		const resetSpy = vi.spyOn(a._targetCtrl, "resetZoneEngineState");

		pushDeviceList([]);
		await el.updateComplete;

		expect(resetSpy).toHaveBeenCalled();
	});

	it("renders the offline banner (not the editor) when the selected device disappears", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el, a, pushDeviceList } = await mountPanel([dev1]);
		a._view = "editor";
		a._perspective = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		a._roomWidth = 4000;
		a._roomDepth = 3000;
		await el.updateComplete;

		pushDeviceList([]);
		await el.updateComplete;

		const html = el.shadowRoot?.innerHTML ?? "";
		expect(html).not.toMatch(/epp-zone-sidebar/);
		expect(html).not.toMatch(/epp-overlay-sidebar/);
		expect(html).not.toMatch(/epp-furniture-sidebar/);
		// _view is preserved so editor re-mounts when the device returns.
		expect(a._view).toBe("editor");
	});

	it("does not render the device picker when the device list is empty", async () => {
		// When the last device is deleted, _selectedMac is intentionally
		// retained (to survive HA reconnects), but the picker has no options
		// to render. ha-select then falls back to displaying the raw MAC
		// value as its label, which leaks the deleted device's MAC into the
		// UI. Hide the picker entirely while the list is empty.
		const dev1 = mockDeviceInfo("aa:bb:cc:dd:ee:ff", "Alpha");
		const { el, pushDeviceList } = await mountPanel([dev1]);

		pushDeviceList([]);
		await el.updateComplete;

		expect(el.shadowRoot?.querySelector("ha-select")).toBeNull();
		const html = el.shadowRoot?.innerHTML ?? "";
		expect(html).not.toMatch(/aa:bb:cc:dd:ee:ff/i);
	});

	// --- Non-selected device changes ---

	it("does not disturb UI state when a non-selected device is removed", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const dev2 = mockDeviceInfo("bb", "Bravo");
		const { el, a, pushDeviceList } = await mountPanel([dev1, dev2]);
		a._grid = new Uint8Array(GRID_CELL_COUNT).fill(1);
		a._view = "editor";
		const closeSpy = vi.spyOn(a._deviceCtrl, "closeDeviceSession");

		pushDeviceList([dev1]); // remove dev2, keep selected dev1
		await el.updateComplete;

		expect(a._selectedMac).toBe("aa");
		expect(a._view).toBe("editor");
		expect(Array.from(a._grid as Uint8Array).every((b) => b === 1)).toBe(true);
		expect(closeSpy).not.toHaveBeenCalled();
	});

	// --- Cross-instance isolation (unrelated regression guard) ---

	it("does not share sensor state reference across panel instances", async () => {
		const dev1 = mockDeviceInfo("aa", "Alpha");
		const { el: el1, a: a1 } = await mountPanel([dev1]);
		const { el: el2, a: a2 } = await mountPanel([dev1]);

		a1._sensorState.occupancy = true;
		await el1.updateComplete;
		await el2.updateComplete;

		expect(a2._sensorState.occupancy).toBe(false);
	});
});
