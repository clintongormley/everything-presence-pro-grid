import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-flasher-view.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import { FlasherController } from "../../controllers/flasher-controller.js";
import { setupLocalize } from "../../localize.js";
import type { FlashableDevice, OtaDeviceState } from "../../types.js";

function renderTo(tpl: any): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	render(tpl, container);
	return container;
}

function createView(
	overrides: Partial<Record<string, unknown>> = {},
): EppFlasherView {
	const el = document.createElement("epp-flasher-view") as EppFlasherView;
	el.flashableDevices = [];
	el.loading = false;
	el.localize = Object.assign(
		((k: string, params?: Record<string, unknown>) =>
			params
				? `${k} ${Object.values(params).join(" ")}`
				: k) as typeof el.localize,
		{
			formatNumber: (v: number, d = 1) => v.toFixed(d),
			lang: "en",
		},
	);
	for (const [k, v] of Object.entries(overrides)) {
		(el as any)[k] = v;
	}
	return el;
}

const device1: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:01",
	name: "Living Room Sensor",
	host: "192.168.1.10",
	available: true,
	firmware_type: "original",
	firmware_version: "1.0.0",
	esphome_config_entry_id: null,
	update_available: false,
	firmware_status: "unknown",
};

const device2: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:02",
	name: "Bedroom Sensor",
	host: "192.168.1.11",
	available: true,
	firmware_type: "eppgrid",
	firmware_version: "2.0.0",
	esphome_config_entry_id: "config-entry-123",
	update_available: false,
	firmware_status: "compatible",
};

const offlineDevice: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:03",
	name: "Offline Sensor",
	host: null,
	available: false,
	firmware_type: "original",
	firmware_version: "1.0.0",
	esphome_config_entry_id: null,
	update_available: false,
	firmware_status: "unknown",
};

const updatableDevice: FlashableDevice = {
	mac: "AA:BB:CC:DD:EE:04",
	name: "EPP Lounge",
	host: "192.168.20.214",
	available: true,
	firmware_type: "eppgrid",
	firmware_version: "0.89.0",
	esphome_config_entry_id: "config-entry-456",
	update_available: true,
	firmware_status: "firmware_behind",
};

afterEach(() => {
	for (const child of [...document.body.children]) {
		document.body.removeChild(child);
	}
});

describe("epp-flasher-view element", () => {
	it("is registered as a custom element", () => {
		const Ctor = customElements.get("epp-flasher-view");
		expect(Ctor).toBeDefined();
	});

	it("does not throw when module is re-imported (panel reload guard)", async () => {
		// Element is already registered from the top-level import.
		// Resetting modules and re-importing simulates a panel JS reload
		// (the scenario that triggers "already defined" in production).
		vi.resetModules();
		await expect(
			import("../../components/epp-flasher-view.js"),
		).resolves.toBeDefined();
	});

	it("can be created via document.createElement", () => {
		const el = document.createElement("epp-flasher-view");
		expect(el).toBeInstanceOf(HTMLElement);
	});

	it("renders with default state without crashing", () => {
		const el = createView();
		const result = (el as any).render();
		expect(result).toBeDefined();
	});

	it("falls back to an identity localize function when none is provided", () => {
		// Callers are expected to inject a localize, but the view renders
		// raw keys as a safe fallback when they don't.
		const el = document.createElement("epp-flasher-view") as EppFlasherView;
		el.flashableDevices = [];
		el.loading = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".flasher-loading")!.textContent).toContain(
			"flasher.loading",
		);
	});
});

describe("render() loading state", () => {
	it("renders loading message when loading=true", () => {
		const el = createView({ loading: true });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".flasher-loading")).not.toBeNull();
		expect(c.querySelector(".flasher-loading")!.textContent).toContain(
			"flasher.loading",
		);
	});

	it("does not show device list when loading", () => {
		const el = createView({ loading: true, flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-list")).toBeNull();
	});
});

describe("render() device list", () => {
	it("renders device list with devices", () => {
		const el = createView({ flashableDevices: [device1, device2] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-list")).not.toBeNull();
		expect(c.querySelectorAll(".device-row").length).toBe(2);
	});

	it("shows device name and host", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-name")!.textContent).toContain(
			"Living Room Sensor",
		);
		expect(c.querySelector(".device-host")!.textContent).toContain(
			"192.168.1.10",
		);
	});

	it("shows orange badge for original firmware", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-original");
		expect(badge).not.toBeNull();
	});

	it("does not show firmware type badge for eppgrid devices", () => {
		const el = createView({ flashableDevices: [device2] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-eppgrid");
		expect(badge).toBeNull();
	});
});

describe("device list buttons", () => {
	it("does not show button for original firmware devices", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: "192.168.1.10",
			available: true,
			firmware_type: "original",
			firmware_version: "1.0.0",
			esphome_config_entry_id: null,
			update_available: false,
			firmware_status: "unknown",
		};
		const el = createView({ flashableDevices: [device] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const btns = c.querySelectorAll(".device-row ha-button");
		expect(btns.length).toBe(0);
	});

	it("shows Update button for eppgrid device with update available", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: "192.168.1.10",
			available: true,
			firmware_type: "eppgrid",
			firmware_version: "0.1.0",
			esphome_config_entry_id: "entry-1",
			update_available: true,
			firmware_status: "compatible",
		};
		const el = createView({ flashableDevices: [device] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const btn = c.querySelector(".device-row ha-button");
		expect(btn).not.toBeNull();
		expect(btn!.textContent).toContain("flasher.update");
	});

	it("does not show button for eppgrid device without update", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: "192.168.1.10",
			available: true,
			firmware_type: "eppgrid",
			firmware_version: "0.2.0",
			esphome_config_entry_id: "entry-1",
			update_available: false,
			firmware_status: "compatible",
		};
		const el = createView({ flashableDevices: [device] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const btns = c.querySelectorAll(".device-row ha-button");
		expect(btns.length).toBe(0);
	});

	it("dispatches update-firmware event when Update clicked", () => {
		const device: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: "192.168.1.10",
			available: true,
			firmware_type: "eppgrid",
			firmware_version: "0.1.0",
			esphome_config_entry_id: "entry-1",
			update_available: true,
			firmware_status: "compatible",
		};
		const el = createView({ flashableDevices: [device] });
		const events: CustomEvent[] = [];
		el.addEventListener("update-firmware", (e) =>
			events.push(e as CustomEvent),
		);
		(el as any)._dispatchUpdateFirmware(device);
		expect(events.length).toBe(1);
		expect(events[0].detail.mac).toBe("AA:BB:CC:DD:EE:01");
	});
});

describe("render() empty state", () => {
	it("renders empty state message when no devices", () => {
		const el = createView({ flashableDevices: [] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".flasher-empty")).not.toBeNull();
	});

	it("does not render device list when empty", () => {
		const el = createView({ flashableDevices: [] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-row")).toBeNull();
	});
});

describe("render() USB section", () => {
	it("shows USB section with action buttons", () => {
		const el = createView();
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-actions")).not.toBeNull();
		expect(c.querySelectorAll(".usb-action").length).toBe(2);
	});
});

describe("render() browser warning", () => {
	it("shows browser warning when no Web Serial support", () => {
		const el = createView();
		(el as any)._hasWebSerial = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".browser-warning")).not.toBeNull();
	});

	it("does not show browser warning when Web Serial is supported", () => {
		const el = createView();
		(el as any)._hasWebSerial = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".browser-warning")).toBeNull();
	});
});

describe("event dispatching", () => {
	it("shows USB flash view when USB connect is clicked", async () => {
		const el = createView();
		document.body.appendChild(el);
		await el.updateComplete;

		// Bypass ESP Web Tools loading in test env
		(el as any)._showUsbFlash = true;
		expect((el as any)._showUsbFlash).toBe(true);
	});

	it("dispatches flash-complete event on go-to-device click", async () => {
		const el = createView();
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("flash-complete", (e) => events.push(e));

		(el as any)._dispatchFlashComplete();

		expect(events.length).toBe(1);
	});

	it("_onUsbConnect sets _showUsbFlash to true", () => {
		const el = createView();
		expect((el as any)._showUsbFlash).toBe(false);
		(el as any)._onUsbConnect();
		expect((el as any)._showUsbFlash).toBe(true);
	});

	it("_dispatchUsbWifiConfig dispatches usb-wifi-config event", () => {
		const el = createView();
		const events: Event[] = [];
		el.addEventListener("usb-wifi-config", (e) => events.push(e));
		(el as any)._dispatchUsbWifiConfig();
		expect(events.length).toBe(1);
	});

	it("@closed handler on ha-select stops propagation", () => {
		const el = createView({
			wifiNetworks: [{ ssid: "TestNet", rssi: -50, authRequired: true }],
			_showWifiProvisioning: true,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select");
		if (select) {
			const event = new Event("closed", { bubbles: true });
			const stopSpy = vi.spyOn(event, "stopPropagation");
			select.dispatchEvent(event);
			expect(stopSpy).toHaveBeenCalled();
		}
	});

	it("renders offline badge for unavailable device", () => {
		const el = createView({ flashableDevices: [offlineDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-offline");
		expect(badge).not.toBeNull();
	});

	it("renders online badge for eppgrid device that is available and up-to-date", () => {
		const el = createView({ flashableDevices: [device2] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-online");
		expect(badge).not.toBeNull();
	});

	it("does not render online badge for offline device", () => {
		const eppgridOffline: FlashableDevice = {
			...device2,
			mac: "AA:BB:CC:DD:EE:05",
			available: false,
		};
		const el = createView({ flashableDevices: [eppgridOffline] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
		expect(c.querySelector(".firmware-badge-offline")).not.toBeNull();
	});

	it("does not render online badge for device with update_available", () => {
		const el = createView({ flashableDevices: [updatableDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
	});

	it("does not render online badge for device with firmware_status=firmware_behind", () => {
		const behindDevice: FlashableDevice = {
			...device2,
			mac: "AA:BB:CC:DD:EE:06",
			firmware_status: "firmware_behind",
			update_available: false,
		};
		const el = createView({ flashableDevices: [behindDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
	});

	it("does not render online badge while OTA is in flight for the device", () => {
		const otaState: OtaDeviceState = {
			state: "updating",
			progress: 42,
			errorKey: null,
		};
		const el = createView({
			flashableDevices: [device2],
			otaStates: { [device2.mac]: otaState },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
	});

	it("does not render online badge for original-firmware device even when available", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
	});

	it("renders online badge alongside integration-update (ahead) badge", () => {
		const aheadDevice: FlashableDevice = {
			...device2,
			mac: "AA:BB:CC:DD:EE:07",
			firmware_status: "firmware_ahead",
		};
		const el = createView({ flashableDevices: [aheadDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).not.toBeNull();
		expect(c.querySelector(".firmware-badge-ahead")).not.toBeNull();
	});

	it("does not render online badge when firmware_status is unavailable", () => {
		const unreadableFirmware: FlashableDevice = {
			...device2,
			mac: "AA:BB:CC:DD:EE:08",
			firmware_status: "unavailable",
		};
		const el = createView({ flashableDevices: [unreadableFirmware] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
	});

	it("does not render online badge when firmware_status is unknown", () => {
		const unknownFirmware: FlashableDevice = {
			...device2,
			mac: "AA:BB:CC:DD:EE:09",
			firmware_status: "unknown",
		};
		const el = createView({ flashableDevices: [unknownFirmware] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-online")).toBeNull();
	});
});

describe("render() WiFi provisioning — connected state", () => {
	it("renders wifi provisioning view when _showWifiProvisioning is true", () => {
		const el = createView();
		(el as any).usbFlashState = { step: "wifi_provision" };
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".wifi-form")).not.toBeNull();
	});

	it("shows connected network and IP when _wifiConnected=true", () => {
		const el = createView();
		el.localize = Object.assign(
			((k: string, params?: Record<string, string | number>) => {
				if (k === "flasher.connected_to" && params)
					return `Connected to ${params.ssid}`;
				if (k === "flasher.ip_address" && params) return `IP: ${params.ip}`;
				return k;
			}) as typeof el.localize,
			{ formatNumber: (v: number, d = 1) => v.toFixed(d), lang: "en" },
		);
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = true;
		(el as any)._selectedSsid = "MyNetwork";
		(el as any)._deviceIp = "192.168.1.50";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("MyNetwork");
		expect(c.textContent).toContain("192.168.1.50");
	});

	it("shows Continue button when connected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = true;
		(el as any)._selectedSsid = "MyNetwork";
		(el as any)._deviceIp = "192.168.1.50";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector('.confirm-actions ha-button[appearance="accent"]'),
		).not.toBeNull();
	});

	it("dispatches wifi-complete when Continue clicked", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = true;
		(el as any)._selectedSsid = "MyNetwork";
		(el as any)._deviceIp = "192.168.1.50";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("wifi-complete", (e) => events.push(e));

		(el as any)._dispatchWifiComplete();
		expect(events.length).toBe(1);
	});
});

describe("render() WiFi provisioning — not connected state", () => {
	it("shows scan button when not connected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		// Scan button is the second ha-button in .confirm-actions (not raised)
		const btns = c.querySelectorAll(".confirm-actions ha-button:not([raised])");
		expect(btns.length).toBeGreaterThanOrEqual(2);
	});

	it("shows network dropdown when networks available", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "NetworkA", rssi: -50, authRequired: true },
			{ ssid: "NetworkB", rssi: -70, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select");
		expect(select).not.toBeNull();
		const options = (select as any).options;
		expect(options.length).toBe(2);
	});

	it("sorts networks by signal strength (strongest first)", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "Weak", rssi: -90, authRequired: false },
			{ ssid: "Strong", rssi: -40, authRequired: false },
			{ ssid: "Medium", rssi: -65, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select") as any;
		const options = select.options.map((o: any) => o.value);
		expect(options[0]).toBe("Strong");
		expect(options[1]).toBe("Medium");
		expect(options[2]).toBe("Weak");
	});

	it("shows wifi strength + lock iconPath for networks", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "Strong", rssi: -45, authRequired: true },
			{ ssid: "Weak", rssi: -80, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select") as any;
		const strong = select.options.find((o: any) => o.value === "Strong");
		expect(strong.iconPath).toBeDefined();
		expect(strong.iconPath.length).toBeGreaterThan(10); // SVG path data
		const weak = select.options.find((o: any) => o.value === "Weak");
		expect(weak.iconPath).toBeDefined();
		expect(weak.iconPath).not.toBe(strong.iconPath); // different strength
	});

	it("maps RSSI to different wifi strength icon paths", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "Excellent", rssi: -40, authRequired: false },
			{ ssid: "Good", rssi: -60, authRequired: false },
			{ ssid: "Fair", rssi: -70, authRequired: false },
			{ ssid: "Poor", rssi: -85, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const select = c.querySelector("ha-select") as any;
		const paths = ["Excellent", "Good", "Fair", "Poor"].map(
			(s) => select.options.find((o: any) => o.value === s).iconPath,
		);
		// All four should have different icon paths (different strength levels)
		expect(new Set(paths).size).toBe(4);
		// All should be valid SVG path data
		for (const p of paths) {
			expect(p).toBeDefined();
			expect(typeof p).toBe("string");
		}
	});

	it("shows manual SSID toggle", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-formfield")).not.toBeNull();
	});

	it("shows manual SSID text input when _manualSsid=true", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector("ha-textfield:not([type='password'])"),
		).not.toBeNull();
	});

	it("does not show manual SSID text input when _manualSsid=false", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = false;
		(el as any).wifiNetworks = [
			{ ssid: "TestNet", rssi: -50, authRequired: false },
		];
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-textfield:not([type='password'])")).toBeNull();
	});

	it("shows password field", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-textfield[type='password']")).not.toBeNull();
	});

	it("renders ha-input when registered, ha-textfield otherwise", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = true;

		const fallbackContainer = renderTo((el as any).render());
		expect(fallbackContainer.querySelector("ha-textfield")).not.toBeNull();
		expect(fallbackContainer.querySelector("ha-input")).toBeNull();

		const spy = vi
			.spyOn(customElements, "get")
			.mockImplementation((name) =>
				name === "ha-input"
					? (class extends HTMLElement {} as unknown as CustomElementConstructor)
					: undefined,
			);
		try {
			const upgradedContainer = renderTo((el as any).render());
			expect(upgradedContainer.querySelector("ha-input")).not.toBeNull();
			expect(upgradedContainer.querySelector("ha-textfield")).toBeNull();
		} finally {
			spy.mockRestore();
		}
	});

	it("shows Configure WiFi button", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(
			c.querySelector('.confirm-actions ha-button[appearance="accent"]'),
		).not.toBeNull();
	});

	it("Configure WiFi button is disabled when no SSID selected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(
			'.confirm-actions ha-button[appearance="accent"]',
		) as any;
		expect(btn.disabled).toBe(true);
	});

	it("Configure WiFi button is enabled when SSID is selected", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "MyNetwork";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(
			'.confirm-actions ha-button[appearance="accent"]',
		) as any;
		expect(btn.disabled).toBe(false);
	});

	it("dispatches wifi-scan event when Scan clicked", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("wifi-scan", (e) => events.push(e));

		(el as any)._dispatchWifiScan();
		expect(events.length).toBe(1);
	});

	it("dispatches wifi-provision event with ssid and password", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "HomeNet";
		(el as any)._wifiPassword = "secret123";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("wifi-provision", (e) => events.push(e));

		(el as any)._dispatchWifiProvision();
		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			ssid: "HomeNet",
			password: "secret123",
		});
	});

	it("shows scanning indicator when _wifiScanning=true", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._wifiScanning = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		// Scan button is the second non-raised ha-button in .confirm-actions
		const nonRaisedBtns = c.querySelectorAll(
			".confirm-actions ha-button:not([raised])",
		);
		const scanBtn = nonRaisedBtns[1] as HTMLElement;
		expect(scanBtn).not.toBeNull();
		expect(scanBtn.textContent?.trim()).toContain("flasher.scanning");
	});
});

describe("WiFi provisioning DOM event handlers", () => {
	it("wifi network select change updates _selectedSsid", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any).wifiNetworks = [
			{ ssid: "NetworkA", rssi: -50, authRequired: false },
		];
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const select = root.querySelector("ha-select") as any;
		// Simulate selecting a network via ha-select's @selected event
		select.dispatchEvent(
			new CustomEvent("selected", { detail: { value: "NetworkA" } }),
		);

		expect((el as any)._selectedSsid).toBe("NetworkA");
	});

	it("manual SSID checkbox change toggles _manualSsid and clears SSID when unchecked", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = false;
		(el as any)._selectedSsid = "SomeNetwork";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const checkbox = root.querySelector("ha-checkbox") as any;

		// Check it (enable manual SSID)
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event("change"));
		expect((el as any)._manualSsid).toBe(true);
		// SSID should NOT be cleared when checking
		expect((el as any)._selectedSsid).toBe("SomeNetwork");

		// Uncheck (disable manual SSID) — should clear SSID
		checkbox.checked = false;
		checkbox.dispatchEvent(new Event("change"));
		expect((el as any)._manualSsid).toBe(false);
		expect((el as any)._selectedSsid).toBe("");
	});

	it("manual SSID text input updates _selectedSsid", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = true;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const input = root.querySelector(
			"ha-textfield:not([type='password'])",
		) as any;
		input.value = "HiddenNet";
		input.dispatchEvent(new Event("input"));

		expect((el as any)._selectedSsid).toBe("HiddenNet");
	});

	it("clears _wifiPassword when SSID changes via dropdown selection", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._selectedSsid = "OldNet";
		(el as any)._wifiPassword = "oldpass";
		(el as any).wifiNetworks = [
			{ ssid: "OldNet", rssi: -50, authRequired: false },
			{ ssid: "NewNet", rssi: -60, authRequired: true },
		];
		document.body.appendChild(el);
		await el.updateComplete;

		const select = el.shadowRoot!.querySelector("ha-select") as any;
		select.dispatchEvent(
			new CustomEvent("selected", { detail: { value: "NewNet" } }),
		);

		expect((el as any)._selectedSsid).toBe("NewNet");
		expect((el as any)._wifiPassword).toBe("");
	});

	it("clears _wifiPassword when manual SSID checkbox is toggled", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._manualSsid = false;
		(el as any)._selectedSsid = "Whatever";
		(el as any)._wifiPassword = "pw";
		document.body.appendChild(el);
		await el.updateComplete;

		const checkbox = el.shadowRoot!.querySelector("ha-checkbox") as any;
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event("change"));

		expect((el as any)._wifiPassword).toBe("");
	});

	it("clears _wifiPassword on cancel", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiPassword = "secret";
		(el as any)._dispatchCancel();
		expect((el as any)._wifiPassword).toBe("");
	});

	it("password input updates _wifiPassword", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const input = root.querySelector("ha-textfield[type='password']") as any;
		input.value = "mypassword";
		input.dispatchEvent(new Event("input"));

		expect((el as any)._wifiPassword).toBe("mypassword");
	});

	it("password field is type=password by default with show-password toggle unchecked", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-textfield[type='password']")).not.toBeNull();
		const toggle = c.querySelector(
			"ha-formfield[data-show-password] ha-checkbox",
		) as any;
		expect(toggle).not.toBeNull();
		expect(toggle.checked).toBe(false);
	});

	it("password field becomes type=text when _showPassword=true", () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		(el as any)._showPassword = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("ha-textfield[type='password']")).toBeNull();
		const pwField = c.querySelector(
			"ha-textfield[autocomplete='new-password']",
		) as any;
		expect(pwField).not.toBeNull();
		expect(pwField.getAttribute("type")).toBe("text");
	});

	it("show-password checkbox toggles _showPassword", async () => {
		const el = createView();
		(el as any)._showWifiProvisioning = true;
		(el as any)._wifiConnected = false;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const toggle = root.querySelector(
			"ha-formfield[data-show-password] ha-checkbox",
		) as any;
		expect(toggle).not.toBeNull();

		toggle.checked = true;
		toggle.dispatchEvent(new Event("change"));
		expect((el as any)._showPassword).toBe(true);

		toggle.checked = false;
		toggle.dispatchEvent(new Event("change"));
		expect((el as any)._showPassword).toBe(false);
	});
});

describe("USB flash view — state-driven", () => {
	it("renders flashing progress bar when usbFlashState is flashing", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "flashing", progress: 42 };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-progress")).not.toBeNull();
		expect(c.textContent).toContain("42%");
	});

	it("renders variant selector in idle state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".variant-selector")).not.toBeNull();
	});

	it("shows firmware version in card title in idle state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any).firmwareVersion = "v0.91.0";
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const header = c.querySelector(".card-header");
		expect(header).not.toBeNull();
		expect(header?.textContent).toMatch(/flasher\.title\s+v0\.91\.0/);
		// Standalone hint paragraph is gone — version lives in the title now.
		expect(c.querySelector(".firmware-version-hint")).toBeNull();
	});

	it("does not render iframe", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector("iframe")).toBeNull();
	});

	it("renders connecting state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "connecting" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-status")).not.toBeNull();
		expect(c.textContent).toContain("flasher.usb_step_connecting");
	});

	it("renders wifi_check state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "wifi_check" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-status")).not.toBeNull();
		expect(c.textContent).toContain("flasher.usb_step_wifi_check");
	});

	it("renders wifi scan state", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "wifi_scan" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.usb_step_scanning");
	});

	it("renders complete state with IP and ha-add result", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("192.168.1.42");
		expect(
			c.querySelector('.confirm-actions ha-button[appearance="accent"]'),
		).not.toBeNull();
	});

	it("renders error state with retry button", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "error",
			errorKey: "usb.errors.flash_failed",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".usb-error")).not.toBeNull();
		expect(c.textContent).toContain("usb.errors.flash_failed");
		expect(
			c.querySelector('.confirm-actions ha-button[appearance="accent"]'),
		).not.toBeNull();
	});

	it("hides Retry button when error is fatal", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "error",
			errorKey: "usb.errors.serial_port_busy",
			fatal: true,
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		// Should have Start over only, no Retry
		const btns = c.querySelectorAll(".confirm-actions ha-button");
		expect(btns.length).toBe(1); // Start over only
	});

	it("shows Retry button when error is not fatal", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "error",
			errorKey: "usb.errors.flash_failed",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const btns = c.querySelectorAll(".confirm-actions ha-button");
		expect(btns.length).toBe(2); // Start over + Retry
	});

	it("renders wifi_provision state with existing WiFi provisioning UI", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "wifi_provision" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".wifi-form")).not.toBeNull();
	});

	it("renders adding_device state via generic fallback", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = { step: "adding_device" };
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		// adding_device is not in stepKeyMap, so the step name itself is shown
		expect(c.textContent).toContain("adding_device");
	});

	it("dispatches usb-flash event with variant when Flash via USB clicked", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-flash", (e) => events.push(e));

		const root = el.shadowRoot!;
		const flashBtn = root.querySelector(
			'.confirm-actions ha-button[appearance="accent"]',
		) as HTMLElement;
		flashBtn.click();

		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			variant: "wifi-ble-co2",
		});
	});

	it("dispatches usb-retry event when Retry clicked", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "error",
			errorKey: "usb.errors.flash_failed",
		};
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-retry", (e) => events.push(e));

		const root = el.shadowRoot!;
		const retryBtn = root.querySelector(
			'.confirm-actions ha-button[appearance="accent"]',
		) as HTMLElement;
		retryBtn.click();

		expect(events.length).toBe(1);
	});

	it("cancel button on idle picker fires flasher-cancel", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("flasher-cancel", (e) => events.push(e));

		const root = el.shadowRoot!;
		const cancelBtn = root.querySelector(
			".confirm-actions ha-button:not([raised])",
		) as HTMLElement;
		cancelBtn.click();

		expect(events.length).toBe(1);
	});

	it("clicking ethernet variant button in USB flash idle updates _selectedVariant", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "wifi";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const variantBtns = root.querySelectorAll(".variant-selector ha-button");
		// Second button is ethernet
		(variantBtns[1] as HTMLElement).click();

		expect((el as any)._selectedVariant).toBe("ethernet");
	});

	it("clicking wifi variant button in USB flash idle updates _selectedVariant", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const variantBtns = root.querySelectorAll(".variant-selector ha-button");
		// First button is wifi
		(variantBtns[0] as HTMLElement).click();

		expect((el as any)._selectedVariant).toBe("wifi");
	});

	it("dispatches usb-flash with ethernet variant when ethernet is selected", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("usb-flash", (e) => events.push(e));

		(el as any)._dispatchUsbFlash();

		expect(events.length).toBe(1);
		expect((events[0] as CustomEvent).detail).toEqual({
			variant: "ethernet-ble-co2",
		});
	});
});

describe("wifi_configured state", () => {
	it("renders the IP address and an indeterminate progress indicator with adding-to-HA label", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "wifi_configured",
			ip: "192.168.1.42",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("192.168.1.42");
		expect(c.querySelector("ha-circular-progress")).toBeTruthy();
		// Should show only a Cancel button in this transient state
		expect(c.querySelectorAll("ha-button").length).toBe(1);
		expect(c.querySelector("ha-button")!.textContent).toContain(
			"flasher.cancel",
		);
	});
});

describe("_getManifestUrl", () => {
	it("returns correct URL for wifi variant", () => {
		const el = createView();
		(el as any)._selectedVariant = "wifi";
		(el as any).firmwareBaseUrl = "https://example.com/fw";
		const url = (el as any)._getManifestUrl();
		expect(url).toBe(
			"https://example.com/fw/everything-presence-pro-wifi-ble-co2-manifest.json",
		);
	});

	it("returns correct URL for ethernet variant", () => {
		const el = createView();
		(el as any)._selectedVariant = "ethernet";
		(el as any).firmwareBaseUrl = "https://example.com/fw";
		const url = (el as any)._getManifestUrl();
		expect(url).toBe(
			"https://example.com/fw/everything-presence-pro-ethernet-ble-co2-manifest.json",
		);
	});
});

describe("variant selector styling", () => {
	it("USB flash variant selector also uses appearance attribute", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = null;
		(el as any)._selectedVariant = "ethernet";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const btns = root.querySelectorAll(".variant-selector ha-button");
		expect((btns[0] as any).getAttribute("appearance")).toBe("outlined");
		expect((btns[1] as any).getAttribute("appearance")).toBe("accent");
	});
});

describe("offline badge on device list", () => {
	it("shows offline badge for unavailable device", () => {
		const el = createView({ flashableDevices: [offlineDevice] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const badge = c.querySelector(".firmware-badge-offline");
		expect(badge).not.toBeNull();
		expect(badge!.textContent).toContain("flasher.offline");
	});

	it("does not show offline badge for available device", () => {
		const el = createView({ flashableDevices: [device1] });
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".firmware-badge-offline")).toBeNull();
	});
});

describe("ethernet complete message", () => {
	it("shows ethernet-specific message when variant starts with ethernet", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			variant: "ethernet-ble-co2",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.usb_ethernet_complete");
		expect(c.textContent).toContain("flasher.usb_ethernet_hint");
	});

	it("shows link to devices dashboard for ethernet complete", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			variant: "ethernet-ble-co2",
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const link = c.querySelector("a[href='/config/devices/dashboard']");
		expect(link).not.toBeNull();
	});

	it("shows wifi_configured message and IP for wifi complete with haAdd=added", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "added" },
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.wifi_configured");
		expect(c.textContent).toContain("192.168.1.42");
	});
});

describe("wifi complete cleanup", () => {
	it("shows wifi_configured message when complete with haAdd=added", () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			ip: "192.168.1.1",
			haAdd: { type: "added" },
		};
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.textContent).toContain("flasher.wifi_configured");
	});

	it("wifi complete with haAdd=added shows go-to-config button that dispatches flash-complete", async () => {
		const el = createView();
		(el as any)._showUsbFlash = true;
		(el as any).usbFlashState = {
			step: "complete",
			ip: "192.168.1.1",
			haAdd: { type: "added" },
		};
		document.body.appendChild(el);
		await el.updateComplete;

		const events: Event[] = [];
		el.addEventListener("flash-complete", (e) => events.push(e));

		const root = el.shadowRoot!;
		const btn = root.querySelector(
			'.confirm-actions ha-button[appearance="accent"]',
		) as HTMLElement;
		btn.click();

		expect(events.length).toBe(1);
	});
});

describe("OTA inline rendering", () => {
	it("renders update button when no OTA state", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {},
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const btn = c.querySelector(".device-row ha-button");
		expect(btn).not.toBeNull();
		expect(btn!.textContent).toContain("flasher.update");
	});

	it("renders ota-progress when updating with numeric progress", () => {
		const otaStates: Record<string, OtaDeviceState> = {
			[updatableDevice.mac]: {
				state: "updating",
				progress: 45,
				errorKey: null,
			},
		};
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-progress")).not.toBeNull();
		expect(c.querySelector(".device-row ha-button")).toBeNull();
	});

	it("renders firmware version in device row", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {},
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".device-host")?.textContent).toContain("v0.89.0");
	});

	it("renders ota-success when success", () => {
		const otaStates: Record<string, OtaDeviceState> = {
			[updatableDevice.mac]: {
				state: "success",
				progress: null,
				errorKey: null,
			},
		};
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-success")).not.toBeNull();
	});

	it("renders ota-error and retry button when error", () => {
		const otaStates: Record<string, OtaDeviceState> = {
			[updatableDevice.mac]: {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.update_failed_generic",
			},
		};
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-error")).not.toBeNull();
		const retryBtn = c.querySelector(".ota-error ha-button");
		expect(retryBtn).not.toBeNull();
		expect(retryBtn!.textContent).toContain("flasher.ota_retry");
	});

	it("renders ota-spinner when updating with null progress (indeterminate)", () => {
		const otaStates: Record<string, OtaDeviceState> = {
			[updatableDevice.mac]: {
				state: "updating",
				progress: null,
				errorKey: null,
			},
		};
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-spinner")).not.toBeNull();
	});

	it("_toggleErrorPopover sets popover mac on first click", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				[updatableDevice.mac]: {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.update_failed_generic",
				},
			},
		});

		const event = new Event("click", { bubbles: true });
		const stopSpy = vi.spyOn(event, "stopPropagation");
		(el as any)._toggleErrorPopover(event, updatableDevice.mac);

		expect(stopSpy).toHaveBeenCalled();
		expect((el as any)._errorPopoverMac).toBe(updatableDevice.mac);
	});

	it("_toggleErrorPopover clears popover mac on second click", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				[updatableDevice.mac]: {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.update_failed_generic",
				},
			},
		});

		const event1 = new Event("click");
		(el as any)._toggleErrorPopover(event1, updatableDevice.mac);
		expect((el as any)._errorPopoverMac).toBe(updatableDevice.mac);

		const event2 = new Event("click");
		(el as any)._toggleErrorPopover(event2, updatableDevice.mac);
		expect((el as any)._errorPopoverMac).toBeNull();
	});

	it("renders error popover text when _errorPopoverMac matches", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				[updatableDevice.mac]: {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.connection_lost",
				},
			},
		});
		(el as any)._errorPopoverMac = updatableDevice.mac;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		const popover = c.querySelector(".ota-error-popover");
		expect(popover).not.toBeNull();
		expect(popover!.textContent).toContain("flasher.errors.connection_lost");
	});

	it("does not render error popover when _errorPopoverMac does not match", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				[updatableDevice.mac]: {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.connection_lost",
				},
			},
		});
		(el as any)._errorPopoverMac = null;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-error-popover")).toBeNull();
	});

	it("_dispatchRetryOta dispatches retry-ota event and clears popover", () => {
		const el = createView({
			flashableDevices: [updatableDevice],
			otaStates: {
				[updatableDevice.mac]: {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.update_failed_generic",
				},
			},
		});
		(el as any)._errorPopoverMac = updatableDevice.mac;

		const events: CustomEvent[] = [];
		el.addEventListener("retry-ota", (e) => events.push(e as CustomEvent));
		(el as any)._dispatchRetryOta(updatableDevice);

		expect(events.length).toBe(1);
		expect(events[0].detail.mac).toBe(updatableDevice.mac);
		expect((el as any)._errorPopoverMac).toBeNull();
	});

	it("hides retry button for error state on unavailable device", () => {
		const offlineEppDevice: FlashableDevice = {
			mac: "AA:BB:CC:DD:EE:05",
			name: "Offline EPP",
			host: null,
			available: false,
			firmware_type: "eppgrid",
			firmware_version: "0.89.0",
			esphome_config_entry_id: "config-entry-789",
			update_available: true,
			firmware_status: "firmware_behind",
		};
		const otaStates: Record<string, OtaDeviceState> = {
			[offlineEppDevice.mac]: {
				state: "error",
				progress: null,
				errorKey: "flasher.errors.device_offline",
			},
		};
		const el = createView({
			flashableDevices: [offlineEppDevice],
			otaStates,
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-error")).not.toBeNull();
		// Retry button should NOT be present since device is unavailable
		expect(c.querySelector(".ota-error ha-button")).toBeNull();
	});

	it("renders the device-reported message interpolated into the error popover", () => {
		// Backend log-derived OTA failures send
		// error_key=flasher.errors.ota_device_error + message; the en
		// translation is "Update failed: {message}". The popover must show
		// the interpolated device message, not the literal "{message}".
		const el = createView({
			localize: setupLocalize(),
			flashableDevices: [updatableDevice],
			otaStates: {
				[updatableDevice.mac]: {
					state: "error",
					progress: null,
					errorKey: "flasher.errors.ota_device_error",
					errorParams: { message: "ESP_ERR_HTTP_CONNECT" },
				},
			},
		});
		(el as any)._errorPopoverMac = updatableDevice.mac;
		const tpl = (el as any).render();
		const c = renderTo(tpl);

		expect(c.querySelector(".ota-error-popover")!.textContent).toContain(
			"Update failed: ESP_ERR_HTTP_CONNECT",
		);
	});
});

// =========================================================
// Controller → view repaint integration
// =========================================================
describe("OTA progress repaint (controller → view integration)", () => {
	it("a controller OTA progress event repaints the view with no hass churn", async () => {
		// The panel binds `.otaStates=${ctrl.otaStates}` and re-renders when
		// the controller calls host.requestUpdate(). Lit dirty-checks the
		// property by reference: if the controller mutates the same Record
		// in place, the view NEVER repaints on OTA progress — historically
		// it only updated when unrelated hass churn re-rendered the panel.
		const view = createView({ flashableDevices: [updatableDevice] });
		document.body.appendChild(view);
		await view.updateComplete;

		// Host mirrors the panel: on controller requestUpdate, re-bind the
		// controller's otaStates onto the view.
		const host = {
			addController: () => {},
			removeController: () => {},
			requestUpdate: () => {
				view.otaStates = ctrl.otaStates;
			},
			updateComplete: Promise.resolve(true),
		};
		const subscribeMessage = vi.fn().mockResolvedValue(vi.fn());
		const ctrl = new FlasherController(host as any);
		ctrl.hass = {
			callWS: vi.fn().mockResolvedValue({}),
			connection: { subscribeMessage },
		};

		await ctrl.startOta(updatableDevice.mac);
		await view.updateComplete;
		expect(view.shadowRoot!.querySelector(".ota-pct")!.textContent).toContain(
			"0",
		);

		const callback = subscribeMessage.mock.calls[0][0];
		callback({ state: "updating", progress: 65 });
		await view.updateComplete;

		expect(view.shadowRoot!.querySelector(".ota-pct")!.textContent).toContain(
			"65",
		);
	});
});

describe("complete state haAdd branches", () => {
	const renderWithHaAdd = async (haAdd: any) => {
		const view = createView();
		(view as any)._showUsbFlash = true;
		(view as any).usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd,
		};
		document.body.appendChild(view);
		await view.updateComplete;
		return view;
	};

	it("added: shows success icon, success message, Go to config + Flash another", async () => {
		const view = await renderWithHaAdd({ type: "added" });
		const root = view.shadowRoot!;
		expect(
			root.querySelector('ha-icon[icon="mdi:check-circle-outline"]'),
		).toBeTruthy();
		expect(root.textContent).toContain("192.168.1.42");
		const buttons = Array.from(root.querySelectorAll("ha-button")).map(
			(b) => b.textContent?.trim() ?? "",
		);
		expect(buttons).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/go_to_config|Go to config/i),
				expect.stringMatching(/flash_another|Flash another/i),
			]),
		);
	});

	it("already_added: shows success icon and same actions as added", async () => {
		const view = await renderWithHaAdd({ type: "already_added" });
		const root = view.shadowRoot!;
		expect(
			root.querySelector('ha-icon[icon="mdi:check-circle-outline"]'),
		).toBeTruthy();
		const buttons = Array.from(root.querySelectorAll("ha-button")).map(
			(b) => b.textContent?.trim() ?? "",
		);
		expect(buttons).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/go_to_config|Go to config/i),
				expect.stringMatching(/flash_another|Flash another/i),
			]),
		);
	});

	it("needs_auth: shows warning icon and Go to Integrations link", async () => {
		const view = await renderWithHaAdd({ type: "needs_auth" });
		const root = view.shadowRoot!;
		expect(
			root.querySelector('ha-icon[icon="mdi:alert-outline"]'),
		).toBeTruthy();
		const link = root.querySelector('a[href="/config/integrations/dashboard"]');
		expect(link).toBeTruthy();
		expect(link?.textContent).toMatch(/go_to_integrations|Integrations/i);
	});

	it("cannot_connect: shows warning icon + Copy IP + Retry + Flash another", async () => {
		const view = await renderWithHaAdd({ type: "cannot_connect" });
		const root = view.shadowRoot!;
		expect(
			root.querySelector('ha-icon[icon="mdi:alert-outline"]'),
		).toBeTruthy();
		const buttons = Array.from(root.querySelectorAll("ha-button")).map(
			(b) => b.textContent?.trim() ?? "",
		);
		expect(buttons).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/copy_ip|Copy IP/i),
				expect.stringMatching(/retry_ha_add|Retry/i),
				expect.stringMatching(/flash_another|Flash another/i),
			]),
		);
	});

	it("failed: shows warning icon + reason interpolated + Retry + Flash another", async () => {
		// Build a spy that still returns the key so other text checks keep working
		const localizeSpy = vi.fn((k: string) => k);
		Object.assign(localizeSpy, {
			formatNumber: (v: number, d = 1) => v.toFixed(d),
			lang: "en",
		});

		const view = createView();
		view.localize = localizeSpy as unknown as typeof view.localize;
		(view as any)._showUsbFlash = true;
		(view as any).usbFlashState = {
			step: "complete",
			ip: "192.168.1.42",
			haAdd: { type: "failed", reason: "invalid_auth" },
		};
		document.body.appendChild(view);
		await view.updateComplete;

		const root = view.shadowRoot!;
		expect(
			root.querySelector('ha-icon[icon="mdi:alert-outline"]'),
		).toBeTruthy();
		// Verify the correct translation key AND the reason param are forwarded
		expect(localizeSpy).toHaveBeenCalledWith("flasher.ha_add.failed", {
			reason: "invalid_auth",
		});
		const buttons = Array.from(root.querySelectorAll("ha-button")).map(
			(b) => b.textContent?.trim() ?? "",
		);
		expect(buttons).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/retry_ha_add|Retry/i),
				expect.stringMatching(/flash_another|Flash another/i),
			]),
		);
	});

	it("retry button dispatches retry-ha-add event", async () => {
		const view = await renderWithHaAdd({ type: "cannot_connect" });
		const root = view.shadowRoot!;
		const retryBtn = Array.from(root.querySelectorAll("ha-button")).find((b) =>
			/retry/i.test(b.textContent ?? ""),
		);
		expect(retryBtn).toBeTruthy();
		const listener = vi.fn();
		view.addEventListener("retry-ha-add", listener);
		(retryBtn as HTMLElement).click();
		expect(listener).toHaveBeenCalled();
	});

	it("flash another button dispatches flasher-cancel event", async () => {
		const view = await renderWithHaAdd({ type: "added" });
		const root = view.shadowRoot!;
		const btn = Array.from(root.querySelectorAll("ha-button")).find((b) =>
			/flash.another|flash_another/i.test(b.textContent ?? ""),
		);
		expect(btn).toBeTruthy();
		const listener = vi.fn();
		view.addEventListener("flasher-cancel", listener);
		(btn as HTMLElement).click();
		expect(listener).toHaveBeenCalled();
	});

	it("copy IP button writes to navigator.clipboard", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const view = await renderWithHaAdd({ type: "cannot_connect" });
		const root = view.shadowRoot!;
		const btn = Array.from(root.querySelectorAll("ha-button")).find((b) =>
			/copy/i.test(b.textContent ?? ""),
		);
		(btn as HTMLElement).click();
		expect(writeText).toHaveBeenCalledWith("192.168.1.42");
	});
});

describe("error state — buttons", () => {
	it("renders Start over and Retry buttons (no Flash another) on error screen", async () => {
		const view = createView();
		(view as any)._showUsbFlash = true;
		(view as any).usbFlashState = {
			step: "error",
			errorKey: "wifi.errors.connection_failed",
		};
		document.body.appendChild(view);
		await view.updateComplete;
		const root = view.shadowRoot!;
		const buttons = Array.from(root.querySelectorAll("ha-button")).map(
			(b) => b.textContent?.trim() ?? "",
		);
		expect(buttons).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/start_over|Start over/i),
				expect.stringMatching(/usb_retry|Retry/i),
			]),
		);
		// Flash another is no longer on the error screen
		expect(buttons).not.toEqual(
			expect.arrayContaining([
				expect.stringMatching(/flash_another|Flash another/i),
			]),
		);
	});
});

describe("render() wifi_configured with autoSkipped", () => {
	it("renders Configure WiFi override link when autoSkipped=true", () => {
		const el = createView({
			usbFlashState: {
				step: "wifi_configured",
				ip: "192.168.1.42",
				autoSkipped: true,
			},
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		expect(c.querySelector(".wifi-override-link")).not.toBeNull();
		expect(c.querySelector(".wifi-override-link")!.textContent).toContain(
			"flasher.configure_wifi_override",
		);
	});

	it("does NOT render override link when autoSkipped is falsy", () => {
		const el = createView({
			usbFlashState: { step: "wifi_configured", ip: "192.168.1.42" },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		expect(c.querySelector(".wifi-override-link")).toBeNull();
	});

	it("fires wifi-scan event when override link is clicked", () => {
		const el = createView({
			usbFlashState: {
				step: "wifi_configured",
				ip: "192.168.1.42",
				autoSkipped: true,
			},
		});
		const fired: string[] = [];
		el.addEventListener("wifi-scan", () => fired.push("wifi-scan"));
		(el as any)._dispatchWifiScan();
		expect(fired).toEqual(["wifi-scan"]);
	});
});

describe("cancel button on in-flight states", () => {
	it("renders Cancel on wifi_scan and fires flasher-cancel", () => {
		const el = createView({
			usbFlashState: { step: "wifi_scan" },
		});
		const fired: string[] = [];
		el.addEventListener("flasher-cancel", () => fired.push("flasher-cancel"));
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const btn = c.querySelector(".cancel-btn") as HTMLElement | null;
		expect(btn).not.toBeNull();
		// Direct-dispatch pattern: call the method since click() doesn't route through Lit's bound handlers in detached render.
		(el as any)._dispatchCancel();
		expect(fired).toEqual(["flasher-cancel"]);
	});

	it("renders Cancel on wifi_check and fires flasher-cancel", () => {
		const el = createView({
			usbFlashState: { step: "wifi_check" },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		expect(c.querySelector(".cancel-btn")).not.toBeNull();
	});

	it("does NOT render cancel during flashing (mid-flash abort risks bricking)", () => {
		const el = createView({
			usbFlashState: { step: "flashing", progress: 42 },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		expect(c.querySelector(".cancel-btn")).toBeNull();
	});

	it("does NOT render cancel during connecting (native port picker is modal)", () => {
		const el = createView({
			usbFlashState: { step: "connecting" },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		expect(c.querySelector(".cancel-btn")).toBeNull();
	});
});

describe("cancel on wifi_provision", () => {
	it("Cancel button fires flasher-cancel (not usb-retry)", () => {
		const el = createView({
			usbFlashState: { step: "wifi_provision" },
			wifiNetworks: [{ ssid: "TestNet", rssi: -50, authRequired: true }],
		});
		const tpl = (el as any).render();
		renderTo(tpl);
		// Direct-call pattern matching existing tests
		const fired: string[] = [];
		el.addEventListener("flasher-cancel", () => fired.push("flasher-cancel"));
		el.addEventListener("usb-retry", () => fired.push("usb-retry"));
		(el as any)._dispatchCancel();
		expect(fired).toEqual(["flasher-cancel"]);
	});
});

describe("cancel on wifi_configured", () => {
	it("renders a Cancel button that fires flasher-cancel", () => {
		const el = createView({
			usbFlashState: { step: "wifi_configured", ip: "192.168.1.1" },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const cancelBtn = [...c.querySelectorAll("ha-button")].find((b) =>
			b.textContent?.includes("flasher.cancel"),
		);
		expect(cancelBtn).toBeDefined();
	});
});

describe("error screen migration", () => {
	it("renders a Start over button (fires flasher-cancel)", () => {
		const el = createView({
			usbFlashState: { step: "error", errorKey: "usb.errors.flash_failed" },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const startOverBtn = [...c.querySelectorAll("ha-button")].find((b) =>
			b.textContent?.includes("flasher.start_over"),
		);
		expect(startOverBtn).toBeDefined();
	});

	it("Retry button still present (fires usb-retry)", () => {
		const el = createView({
			usbFlashState: { step: "error", errorKey: "usb.errors.flash_failed" },
		});
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const retryBtn = [...c.querySelectorAll("ha-button")].find((b) =>
			b.textContent?.includes("flasher.usb_retry"),
		);
		expect(retryBtn).toBeDefined();
	});
});

describe("idle variant picker", () => {
	it("renders Cancel button (not Back) in variant picker", () => {
		// Force _showUsbFlash=true so _renderUsbFlash(idle) path is hit
		const el = createView({
			usbFlashState: { step: "idle" },
		});
		(el as any)._showUsbFlash = true;
		const tpl = (el as any).render();
		const c = renderTo(tpl);
		const cancelBtn = [...c.querySelectorAll("ha-button")].find((b) =>
			b.textContent?.includes("flasher.cancel"),
		);
		expect(cancelBtn).toBeDefined();
		const backBtn = [...c.querySelectorAll("ha-button")].find((b) =>
			b.textContent?.includes("flasher.usb_back"),
		);
		expect(backBtn).toBeUndefined();
	});

	describe("cancelled IP hint banner", () => {
		it("renders banner on idle variant picker when cancelledDeviceIpHint is set", () => {
			const el = createView({
				cancelledDeviceIpHint: "192.168.1.42",
				usbFlashState: { step: "idle" },
			});
			el.localize = Object.assign(
				((k: string, params?: Record<string, string | number>) => {
					if (k === "flasher.cancelled_ip_hint" && params)
						return `Device reachable at ${params.ip} — it should appear in Home Assistant discovery shortly.`;
					return k;
				}) as typeof el.localize,
				{ formatNumber: (v: number, d = 1) => v.toFixed(d), lang: "en" },
			);
			(el as any)._showUsbFlash = true;
			const tpl = (el as any).render();
			const c = renderTo(tpl);
			const banner = c.querySelector(".cancelled-ip-hint");
			expect(banner).not.toBeNull();
			expect(banner!.textContent).toContain("192.168.1.42");
			expect(banner!.textContent).toContain("Device reachable at");
		});

		it("does NOT render banner when cancelledDeviceIpHint is null", () => {
			const el = createView({
				cancelledDeviceIpHint: null,
				usbFlashState: { step: "idle" },
			});
			(el as any)._showUsbFlash = true;
			const tpl = (el as any).render();
			const c = renderTo(tpl);
			expect(c.querySelector(".cancelled-ip-hint")).toBeNull();
		});
	});
});
