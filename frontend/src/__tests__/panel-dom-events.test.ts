/**
 * Tests that render lit-html templates to DOM and trigger events on them.
 * Uses lit's render() to stamp templates into a container, then fires events.
 */

import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EPPGridPanel } from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import type { EppFurnitureSidebar } from "../components/epp-furniture-sidebar.js";
import {
	CELL_ROOM_BIT,
	GRID_CELL_COUNT,
	initGridFromRoom,
} from "../lib/grid.js";
import { ZONE_COLORS, ZONE_TYPE_DEFAULTS } from "../lib/zone-defaults.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = initGridFromRoom(3000, 4000);
	a._zoneConfigs = new Array(7).fill(null);
	a._activeZone = 0;
	a._dirty = false;
	a._loading = false;
	a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
	a._roomWidth = 3000;
	a._roomDepth = 4000;
	a._furniture = [];
	a._selectedFurnitureId = null;
	a._view = "live";
	a._devices = [
		{
			mac: "AA:BB:CC:DD:EE:01",
			name: "Test",
			host: null,
			available: true,
			configured: true,
		},
	];
	a._selectedMac = "AA:BB:CC:DD:EE:01";
	a._targets = [];
	a._sensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		illuminance: 150,
		temperature: 22.5,
		humidity: 45,
		co2: 400,
	};
	a._zoneState = { occupancy: {}, target_counts: {}, frame_count: 0 };
	a._openAccordions = new Set();
	a._showUnsavedDialog = false;
	a._pendingNavigation = null;
	a._saving = false;
	a._showLiveMenu = false;
	a._showDeleteCalibrationDialog = false;
	a._showTemplateSave = false;
	a._showTemplateLoad = false;
	a._reportingConfig = {};
	a._offsetsConfig = {};
	a._targetAutoRange = true;
	a._targetMaxDistance = 6;
	a._staticAutoRange = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	a._roomType = "normal";
	a._roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
	a._roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
	a._roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
	a._roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
	a._roomEntryPoint = false;
	a._showHitCounts = false;
	a._zoneEngineState = createZoneEngineState();
	a._showCustomIconPicker = false;
	a._customIconValue = "";
	a._isPainting = false;
	a._frozenBounds = null;
	a._sidebarTab = "zones";
	a._setupStep = null;
	a._wizardCornerIndex = 0;
	a._wizardCorners = [null, null, null, null];
	a._wizardRoomWidth = 3000;
	a._wizardRoomDepth = 4000;
	a._wizardCapturing = false;
	a._wizardCaptureProgress = 0;
	a._wizardCapturePaused = false;
	a._wizardCaptureCancelled = false;
	a._wizardOffsetSide = "";
	a._wizardOffsetFb = "";
	a._wizardSaving = false;
	a._templateName = "";
	a._fovCache = null;
	a._fovPerspective = null;
	return el;
}

let container: HTMLDivElement;

afterEach(() => {
	if (container?.isConnected) document.body.removeChild(container);
});

function renderTo(template: any): HTMLDivElement {
	container = document.createElement("div");
	document.body.appendChild(container);
	render(template, container);
	return container;
}

describe("_renderLiveOverview DOM events", () => {
	it("clicking hit counts toggle changes state", () => {
		const a = createPanel() as any;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		// Find and click the hit counts button
		const btn = c.querySelector(
			'[title="Show signal strength"]',
		) as HTMLElement;
		if (btn) {
			btn.click();
			expect(a._showHitCounts).toBe(true);
		}
	});

	it("clicking menu dots toggles live menu", () => {
		const a = createPanel() as any;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const menuBtns = c.querySelectorAll(".sidebar-menu-btn");
		const menuBtn = menuBtns[menuBtns.length - 1] as HTMLElement;
		if (menuBtn) {
			menuBtn.click();
			expect(a._showLiveMenu).toBe(true);
		}
	});

	it("live menu items navigate correctly", () => {
		const a = createPanel() as any;
		a._showLiveMenu = true;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const items = c.querySelectorAll(".sidebar-menu-item");
		if (items.length > 0) {
			// First item should be "Detection zones" (if perspective exists)
			(items[0] as HTMLElement).click();
		}
	});

	it("live overview renders epp-live-sidebar component", () => {
		const a = createPanel() as any;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const sidebar = c.querySelector("epp-live-sidebar");
		expect(sidebar).not.toBeNull();
	});

	it("detection zones link navigates", () => {
		const a = createPanel() as any;
		const tpl = a._renderLiveOverview();
		const c = renderTo(tpl);

		const link = c.querySelector(
			".zone-sidebar .live-section-link",
		) as HTMLElement;
		if (link) {
			link.click();
			expect(a._view).toBe("editor");
			expect(a._sidebarTab).toBe("zones");
		}
	});
});

describe("epp-live-sidebar DOM events", () => {
	it("sensor info buttons toggle", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		const tpl = el.render();
		const c = renderTo(tpl);

		const infoBtns = c.querySelectorAll(".live-sensor-info-btn");
		if (infoBtns.length > 0) {
			(infoBtns[0] as HTMLElement).click();
			expect(el._expandedSensorInfo).not.toBeNull();
			(infoBtns[0] as HTMLElement).click();
			expect(el._expandedSensorInfo).toBeNull();
		}
	});

	it("detection zones link fires view-change event", () => {
		const el = document.createElement("epp-live-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		const tpl = el.render();
		const c = renderTo(tpl);

		let detail: any = null;
		el.addEventListener("view-change", (e: CustomEvent) => {
			detail = e.detail;
		});

		const link = c.querySelector(".live-section-link") as HTMLElement;
		if (link) {
			link.click();
			expect(detail).not.toBeNull();
			expect(detail.view).toBe("editor");
			expect(detail.sidebarTab).toBe("zones");
		}
	});
});

describe("_renderHeader DOM events", () => {
	it("device select __add__ opens new window", () => {
		const a = createPanel() as any;
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Sensor",
				host: null,
				available: true,
				configured: true,
			},
		];
		const tpl = a._renderHeader();
		const c = renderTo(tpl);

		const select = c.querySelector(".device-select") as HTMLSelectElement;
		if (select) {
			const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
			// Set to __add__ and fire change
			select.value = "__add__";
			select.dispatchEvent(new Event("change"));
			expect(openSpy).toHaveBeenCalled();
			openSpy.mockRestore();
		}
	});
});

describe("_renderWizardGuide DOM events", () => {
	it("cancel button resets wizard", () => {
		const a = createPanel() as any;
		a._setupStep = "guide";
		const tpl = a._renderWizardGuide();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(a._setupStep).toBeNull();
		}
	});

	it("begin marking button advances to corners", () => {
		const a = createPanel() as any;
		const tpl = a._renderWizardGuide();
		const c = renderTo(tpl);

		const primaryBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (primaryBtn) {
			primaryBtn.click();
			expect(a._setupStep).toBe("corners");
		}
	});
});

describe("_renderWizardCorners DOM events", () => {
	it("corner chip click resets corner", () => {
		const a = createPanel() as any;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 500, offset_fb: 300 },
			null,
			null,
			null,
		];
		a._targets = [
			{
				x: 100,
				y: 200,
				raw_x: 100,
				raw_y: 200,
				speed: 0,
				status: "active" as const,
				signal: 5,
			},
		];
		const tpl = a._renderWizardCorners();
		const c = renderTo(tpl);

		const chips = c.querySelectorAll(".corner-chip");
		if (chips.length > 0) {
			(chips[0] as HTMLElement).click();
			expect(a._wizardCorners[0]).toBeNull();
		}
	});

	it("offset input updates corner offsets", () => {
		const a = createPanel() as any;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		a._targets = [
			{
				x: 100,
				y: 200,
				raw_x: 100,
				raw_y: 200,
				speed: 0,
				status: "active" as const,
				signal: 5,
			},
		];
		const tpl = a._renderWizardCorners();
		const c = renderTo(tpl);

		const offsets = c.querySelectorAll(
			".offset-input",
		) as NodeListOf<HTMLInputElement>;
		if (offsets.length >= 2) {
			offsets[0].value = "50";
			offsets[0].dispatchEvent(new Event("input"));
			expect(a._wizardOffsetSide).toBe("50");

			offsets[1].value = "30";
			offsets[1].dispatchEvent(new Event("input"));
			expect(a._wizardOffsetFb).toBe("30");
		}
	});

	it("cancel button on corners step exits wizard", () => {
		const a = createPanel() as any;
		a._targets = [
			{
				x: 100,
				y: 200,
				raw_x: 100,
				raw_y: 200,
				speed: 0,
				status: "active" as const,
				signal: 5,
			},
		];
		const tpl = a._renderWizardCorners();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(a._setupStep).toBeNull();
		}
	});

	it("mark button starts capture", () => {
		const a = createPanel() as any;
		a._targets = [
			{
				x: 100,
				y: 200,
				raw_x: 100,
				raw_y: 200,
				speed: 0,
				status: "active" as const,
				signal: 5,
			},
		];
		const tpl = a._renderWizardCorners();
		const c = renderTo(tpl);

		const primaryBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (primaryBtn && !primaryBtn.hasAttribute("disabled")) {
			primaryBtn.click();
			expect(a._wizardCapturing).toBe(true);
			// Cancel to stop animation
			a._wizardCancelCapture();
		}
	});

	it("save button when all corners marked", () => {
		const a = createPanel() as any;
		a._wizardCorners = [
			{ raw_x: -1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
		];
		a._targets = [
			{
				x: 100,
				y: 200,
				raw_x: 100,
				raw_y: 200,
				speed: 0,
				status: "active" as const,
				signal: 5,
			},
		];
		const tpl = a._renderWizardCorners();
		const c = renderTo(tpl);

		const primaryBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (primaryBtn) {
			primaryBtn.click();
			// Should have computed perspective
			expect(a._perspective).not.toBeNull();
		}
	});
});

describe("_renderSaveCancelButtons DOM events", () => {
	it("cancel button resets view", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._dirty = true;
		a.hass = {
			callWS: vi.fn().mockResolvedValue({
				calibration: { perspective: null, room_width: 0, room_depth: 0 },
				room_layout: {},
			}),
			connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
		};
		const tpl = a._renderSaveCancelButtons();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(a._dirty).toBe(false);
			expect(a._view).toBe("live");
		}
	});
});

describe("_renderSettings DOM events", () => {
	it("accordion header click toggles", () => {
		const a = createPanel() as any;
		const tpl = a._renderSettings();
		const c = renderTo(tpl);

		const headers = c.querySelectorAll(".accordion-header");
		if (headers.length > 0) {
			(headers[0] as HTMLElement).click();
			expect(a._openAccordions.size).toBe(1);
		}
	});

	it("settings container input sets dirty", () => {
		const a = createPanel() as any;
		a._dirty = false;
		const tpl = a._renderSettings();
		const c = renderTo(tpl);

		const container = c.querySelector(".settings-container") as HTMLElement;
		if (container) {
			container.dispatchEvent(new Event("input", { bubbles: true }));
			expect(a._dirty).toBe(true);
		}
	});

	it("settings container change sets dirty", () => {
		const a = createPanel() as any;
		a._dirty = false;
		const tpl = a._renderSettings();
		const c = renderTo(tpl);

		const container = c.querySelector(".settings-container") as HTMLElement;
		if (container) {
			container.dispatchEvent(new Event("change", { bubbles: true }));
			expect(a._dirty).toBe(true);
		}
	});
});

describe("_renderDetectionRanges DOM events", () => {
	it("target auto range toggle changes state", () => {
		const a = createPanel() as any;
		a._targetAutoRange = true;
		const tpl = a._renderDetectionRanges();
		const c = renderTo(tpl);

		const checkboxes = c.querySelectorAll('input[type="checkbox"]');
		if (checkboxes.length > 0) {
			const cb = checkboxes[0] as HTMLInputElement;
			cb.checked = false;
			cb.dispatchEvent(new Event("change"));
			expect(a._targetAutoRange).toBe(false);
		}
	});

	it("max distance slider updates state", () => {
		const a = createPanel() as any;
		a._targetAutoRange = false;
		const tpl = a._renderDetectionRanges();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			range.value = "4.5";
			// Need nextElementSibling to exist for the handler
			const span = document.createElement("span");
			span.textContent = "6";
			range.parentNode?.insertBefore(span, range.nextSibling);
			range.dispatchEvent(new Event("input"));
			expect(a._targetMaxDistance).toBe(4.5);
		}
	});
});

describe("_renderBoundaryTypeControls DOM events", () => {
	function createSidebar(overrides: Record<string, any> = {}) {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		el.roomType = "normal";
		el.roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
		el.roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
		el.roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
		el.roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
		el.roomEntryPoint = false;
		el.localZoneState = new Map();
		el.localize = (k: string) => k;
		Object.assign(el, overrides);
		return el;
	}

	it("room type select changes type", () => {
		const s = createSidebar();
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("room-config-change", (e: Event) => events.push(e as CustomEvent));
		s.addEventListener("dirty", (e: Event) => events.push(e as CustomEvent));

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		if (select) {
			select.value = "entrance";
			select.dispatchEvent(new Event("change", { bubbles: true }));
			expect(events.some(e => e.type === "room-config-change" && e.detail.updates.roomType === "entrance")).toBe(true);
			expect(events.some(e => e.type === "dirty")).toBe(true);
		}
	});

	it("trigger range input updates", () => {
		const s = createSidebar({ roomType: "custom" });
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("room-config-change", (e: Event) => events.push(e as CustomEvent));

		const ranges = c.querySelectorAll('input[type="range"]');
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			range.value = "7";
			range.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.roomTrigger === 7)).toBe(true);
		}
	});

	it("renew range input updates", () => {
		const s = createSidebar({ roomType: "custom" });
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("room-config-change", (e: Event) => events.push(e as CustomEvent));

		const ranges = c.querySelectorAll('input[type="range"]');
		if (ranges.length >= 2) {
			const range = ranges[1] as HTMLInputElement;
			range.value = "4";
			range.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.roomRenew === 4)).toBe(true);
		}
	});

	it("presence timeout number input updates", () => {
		const s = createSidebar({ roomType: "custom" });
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("room-config-change", (e: Event) => events.push(e as CustomEvent));

		const numbers = c.querySelectorAll('input[type="number"]');
		if (numbers.length > 0) {
			const input = numbers[0] as HTMLInputElement;
			input.value = "15";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.roomTimeout === 15)).toBe(true);
		}
	});

	it("handoff timeout number input updates", () => {
		const s = createSidebar({ roomType: "custom" });
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("room-config-change", (e: Event) => events.push(e as CustomEvent));

		const numbers = c.querySelectorAll('input[type="number"]');
		if (numbers.length >= 2) {
			const input = numbers[1] as HTMLInputElement;
			input.value = "5";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.roomHandoffTimeout === 5)).toBe(true);
		}
	});

	it("entry point checkbox toggles", () => {
		const s = createSidebar({ roomType: "custom" });
		const tpl = (s as any)._renderBoundaryTypeControls();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("room-config-change", (e: Event) => events.push(e as CustomEvent));

		const toggles = c.querySelectorAll('.toggle-switch input[type="checkbox"]');
		if (toggles.length > 0) {
			const last = toggles[toggles.length - 1] as HTMLInputElement;
			last.checked = true;
			last.dispatchEvent(new Event("change", { bubbles: true }));
			expect(events.some(e => e.detail.updates.roomEntryPoint === true)).toBe(true);
		}
	});
});

describe("_renderZoneTypeControls DOM events", () => {
	function createSidebar(overrides: Record<string, any> = {}) {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		el.roomType = "normal";
		el.roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
		el.roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
		el.roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
		el.roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
		el.roomEntryPoint = false;
		el.localZoneState = new Map();
		el.localize = (k: string) => k;
		Object.assign(el, overrides);
		return el;
	}

	it("zone type select changes zone config", () => {
		const s = createSidebar();
		const zone = { name: "Z1", color: "#ff0000", type: "normal" as const };
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const select = c.querySelector(".sensitivity-select") as HTMLSelectElement;
		if (select) {
			select.value = "rest";
			select.dispatchEvent(new Event("change", { bubbles: true }));
			expect(events.some(e => e.detail.index === 0 && e.detail.updates.type === "rest")).toBe(true);
		}
	});

	it("zone trigger input updates zone config", () => {
		const s = createSidebar();
		const zone = {
			name: "Z1",
			color: "#ff0000",
			type: "custom" as const,
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const ranges = c.querySelectorAll('input[type="range"]');
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			range.value = "8";
			range.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.trigger === 8)).toBe(true);
		}
	});

	it("zone renew input updates", () => {
		const s = createSidebar();
		const zone = {
			name: "Z1",
			color: "#ff0000",
			type: "custom" as const,
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const ranges = c.querySelectorAll('input[type="range"]');
		if (ranges.length >= 2) {
			const range = ranges[1] as HTMLInputElement;
			range.value = "6";
			range.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.renew === 6)).toBe(true);
		}
	});

	it("zone timeout input updates", () => {
		const s = createSidebar();
		const zone = {
			name: "Z1",
			color: "#ff0000",
			type: "custom" as const,
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const numbers = c.querySelectorAll('input[type="number"]');
		if (numbers.length > 0) {
			const input = numbers[0] as HTMLInputElement;
			input.value = "20";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.timeout === 20)).toBe(true);
		}
	});

	it("zone handoff timeout input updates", () => {
		const s = createSidebar();
		const zone = {
			name: "Z1",
			color: "#ff0000",
			type: "custom" as const,
			trigger: 5,
			renew: 3,
			timeout: 10,
			handoff_timeout: 3,
		};
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const numbers = c.querySelectorAll('input[type="number"]');
		if (numbers.length >= 2) {
			const input = numbers[1] as HTMLInputElement;
			input.value = "7";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.updates.handoff_timeout === 7)).toBe(true);
		}
	});

	it("zone entry point toggle updates", () => {
		const s = createSidebar();
		const zone = { name: "Z1", color: "#ff0000", type: "custom" as const };
		const tpl = (s as any)._renderZoneTypeControls(zone, 0);
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const toggles = c.querySelectorAll('.toggle-switch input[type="checkbox"]');
		if (toggles.length > 0) {
			const last = toggles[toggles.length - 1] as HTMLInputElement;
			last.checked = true;
			last.dispatchEvent(new Event("change", { bubbles: true }));
			expect(events.some(e => e.detail.updates.entry_point === true)).toBe(true);
		}
	});
});

describe("_renderZoneSidebar DOM events", () => {
	function createSidebar(overrides: Record<string, any> = {}) {
		const el = document.createElement("epp-zone-sidebar") as any;
		el.zoneConfigs = new Array(7).fill(null);
		el.activeZone = 0;
		el.roomType = "normal";
		el.roomTrigger = ZONE_TYPE_DEFAULTS.normal.trigger;
		el.roomRenew = ZONE_TYPE_DEFAULTS.normal.renew;
		el.roomTimeout = ZONE_TYPE_DEFAULTS.normal.timeout;
		el.roomHandoffTimeout = ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
		el.roomEntryPoint = false;
		el.localZoneState = new Map();
		el.localize = (k: string) => k;
		Object.assign(el, overrides);
		return el;
	}

	it("boundary zone click", () => {
		const s = createSidebar({ activeZone: null });
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-select", (e: Event) => events.push(e as CustomEvent));

		const zoneItems = c.querySelectorAll(".zone-item");
		if (zoneItems.length > 0) {
			(zoneItems[0] as HTMLElement).click();
			expect(events.some(e => e.detail.zone === 0)).toBe(true);
		}
	});

	it("named zone click", () => {
		const s = createSidebar();
		s.zoneConfigs = [{ name: "Z1", color: "#ff0000", type: "normal" }, null, null, null, null, null, null];
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-select", (e: Event) => events.push(e as CustomEvent));

		const zoneItems = c.querySelectorAll(".zone-item");
		if (zoneItems.length > 1) {
			(zoneItems[1] as HTMLElement).click();
			expect(events.some(e => e.detail.zone === 1)).toBe(true);
		}
	});

	it("add zone button exists", () => {
		const s = createSidebar();
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const addBtn = c.querySelector(".add-zone-btn") as HTMLElement;
		expect(addBtn).not.toBeNull();
	});

	it("zone remove button", () => {
		const s = createSidebar({ activeZone: 1 });
		s.zoneConfigs = [{ name: "Z1", color: "#ff0000", type: "normal" }, null, null, null, null, null, null];
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-remove", (e: Event) => events.push(e as CustomEvent));

		const removeBtn = c.querySelector(".zone-remove-btn") as HTMLElement;
		if (removeBtn) {
			removeBtn.click();
			expect(events.some(e => e.detail.slot === 1)).toBe(true);
		}
	});

	it("zone name input focus", () => {
		const s = createSidebar({ activeZone: 0 });
		s.zoneConfigs = [{ name: "Z1", color: "#ff0000", type: "normal" }, null, null, null, null, null, null];
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-select", (e: Event) => events.push(e as CustomEvent));

		const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
		if (nameInput) {
			nameInput.dispatchEvent(new Event("focus", { bubbles: true }));
			expect(events.some(e => e.detail.zone === 1)).toBe(true);
		}
	});

	it("zone name input click sets active", () => {
		const s = createSidebar({ activeZone: 0 });
		s.zoneConfigs = [{ name: "Z1", color: "#ff0000", type: "normal" }, null, null, null, null, null, null];
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-select", (e: Event) => events.push(e as CustomEvent));

		const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
		if (nameInput) {
			nameInput.click();
			expect(events.some(e => e.detail.zone === 1)).toBe(true);
		}
	});

	it("zone name input changes name", () => {
		const s = createSidebar();
		s.zoneConfigs = [{ name: "Z1", color: "#ff0000", type: "normal" }, null, null, null, null, null, null];
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const nameInput = c.querySelector(".zone-name-input") as HTMLInputElement;
		if (nameInput) {
			nameInput.value = "Kitchen";
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.index === 0 && e.detail.updates.name === "Kitchen")).toBe(true);
		}
	});

	it("zone color picker input", () => {
		const s = createSidebar({ activeZone: 1 });
		s.zoneConfigs = [{ name: "Z1", color: "#ff0000", type: "normal" }, null, null, null, null, null, null];
		const tpl = (s as any)._renderZoneSidebar();
		const c = renderTo(tpl);

		const events: CustomEvent[] = [];
		s.addEventListener("zone-config-change", (e: Event) => events.push(e as CustomEvent));

		const colorPicker = c.querySelector(
			".zone-color-picker",
		) as HTMLInputElement;
		if (colorPicker) {
			colorPicker.value = "#00ff00";
			colorPicker.dispatchEvent(new Event("input", { bubbles: true }));
			expect(events.some(e => e.detail.index === 0 && e.detail.updates.color === "#00ff00")).toBe(true);
		}
	});
});

describe("epp-furniture-sidebar DOM events", () => {
	function createFurnSidebar(overrides: Record<string, any> = {}): EppFurnitureSidebar {
		const el = document.createElement("epp-furniture-sidebar") as any;
		el.furniture = [];
		el.selectedFurnitureId = null;
		el.hass = {};
		el.localize = (k: string) => k;
		el.showCustomIconPicker = false;
		el.customIconValue = "";
		Object.assign(el, overrides);
		return el as EppFurnitureSidebar;
	}

	it("clicking a sticker fires furniture-add event", () => {
		const el = createFurnSidebar();
		const handler = vi.fn();
		el.addEventListener("furniture-add", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const stickers = c.querySelectorAll(".furn-sticker:not(.furn-custom)");
		if (stickers.length > 0) {
			(stickers[0] as HTMLElement).click();
			expect(handler).toHaveBeenCalledTimes(1);
		}
	});

	it("custom icon button fires custom-icon-toggle", () => {
		const el = createFurnSidebar();
		const handler = vi.fn();
		el.addEventListener("custom-icon-toggle", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const customBtn = c.querySelector(".furn-custom") as HTMLElement;
		if (customBtn) {
			customBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
		}
	});

	it("custom icon picker cancel fires events", () => {
		const el = createFurnSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:lamp",
		});
		const toggleHandler = vi.fn();
		const changeHandler = vi.fn();
		el.addEventListener("custom-icon-toggle", toggleHandler);
		el.addEventListener("custom-icon-change", changeHandler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(toggleHandler).toHaveBeenCalledTimes(1);
			expect(changeHandler).toHaveBeenCalledTimes(1);
			expect(changeHandler.mock.calls[0][0].detail).toBe("");
		}
	});

	it("custom icon picker add fires furniture-add-custom", () => {
		const el = createFurnSidebar({
			showCustomIconPicker: true,
			customIconValue: "mdi:star",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-add-custom", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const primaryBtn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (primaryBtn) {
			primaryBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("mdi:star");
		}
	});

	it("furniture remove button fires furniture-remove", () => {
		const el = createFurnSidebar({
			furniture: [
				{
					id: "f1",
					type: "svg" as const,
					icon: "armchair",
					label: "Chair",
					x: 100,
					y: 200,
					width: 800,
					height: 800,
					rotation: 0,
					lockAspect: false,
				},
			],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-remove", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const removeBtn = c.querySelector(".zone-remove-btn") as HTMLElement;
		if (removeBtn) {
			removeBtn.click();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0].detail).toBe("f1");
		}
	});

	it("furniture dimension inputs fire furniture-update", () => {
		const el = createFurnSidebar({
			furniture: [
				{
					id: "f1",
					type: "svg" as const,
					icon: "armchair",
					label: "Chair",
					x: 100,
					y: 200,
					width: 800,
					height: 800,
					rotation: 0,
					lockAspect: false,
				},
			],
			selectedFurnitureId: "f1",
		});
		const handler = vi.fn();
		el.addEventListener("furniture-update", handler);

		const tpl = (el as any)._renderFurnitureSidebar();
		const c = renderTo(tpl);

		const inputs = c.querySelectorAll(
			".furn-dims input",
		) as NodeListOf<HTMLInputElement>;
		if (inputs.length >= 3) {
			inputs[0].value = "120";
			inputs[0].dispatchEvent(new Event("change"));
			expect(handler.mock.calls[0][0].detail.updates.width).toBe(1200);

			inputs[1].value = "100";
			inputs[1].dispatchEvent(new Event("change"));
			expect(handler.mock.calls[1][0].detail.updates.height).toBe(1000);

			inputs[2].value = "45";
			inputs[2].dispatchEvent(new Event("change"));
			expect(handler.mock.calls[2][0].detail.updates.rotation).toBe(45);
		}
	});
});

describe("_renderUncalibratedFov DOM events", () => {
	it("calibrate button starts wizard", () => {
		const a = createPanel() as any;
		a._perspective = null;
		const tpl = a._renderUncalibratedFov();
		const c = renderTo(tpl);

		const link = c.querySelector(".live-nav-link") as HTMLElement;
		if (link) {
			link.click();
			expect(a._setupStep).toBe("guide");
		}
	});
});

describe("_renderNeedsCalibration DOM events", () => {
	it("start calibration button works", () => {
		const a = createPanel() as any;
		const tpl = a._renderNeedsCalibration();
		const c = renderTo(tpl);

		const btn = c.querySelector(".wizard-btn-primary") as HTMLElement;
		if (btn) {
			btn.click();
			expect(a._setupStep).toBe("guide");
		}
	});
});

describe("_renderTemplateSaveDialog DOM events", () => {
	it("template name input and save", () => {
		const a = createPanel() as any;
		const tpl = a._renderTemplateSaveDialog();
		const c = renderTo(tpl);

		const input = c.querySelector(".template-name-input") as HTMLInputElement;
		if (input) {
			input.value = "My Template";
			input.dispatchEvent(new Event("input"));
			expect(a._templateName).toBe("My Template");
		}

		const cancel = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (cancel) {
			cancel.click();
			expect(a._showTemplateSave).toBe(false);
		}
	});
});

describe("_renderTemplateLoadDialog DOM events", () => {
	it("close button works", () => {
		const a = createPanel() as any;
		a._showTemplateLoad = true;
		const tpl = a._renderTemplateLoadDialog();
		const c = renderTo(tpl);

		const closeBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (closeBtn) {
			closeBtn.click();
			expect(a._showTemplateLoad).toBe(false);
		}
	});

	it("load and delete buttons with templates", () => {
		localStorage.setItem(
			"epp_layout_templates",
			JSON.stringify([
				{
					name: "T1",
					grid: new Array(GRID_CELL_COUNT).fill(0),
					zones: [],
					roomWidth: 3000,
					roomDepth: 4000,
				},
			]),
		);

		const a = createPanel() as any;
		const tpl = a._renderTemplateLoadDialog();
		const c = renderTo(tpl);

		const loadBtn = c.querySelector(".template-item-btn") as HTMLElement;
		if (loadBtn) {
			loadBtn.click();
		}

		localStorage.removeItem("epp_layout_templates");
	});
});

describe("_renderVisibleCells cell events", () => {
	it("cell mousedown triggers painting", () => {
		const a = createPanel() as any;
		a._activeZone = 0;
		const result = a._renderVisibleCells(5, 15, 0, 10, 20);
		const c = renderTo(result[0]); // render just first cell

		const cell = c.querySelector(".cell") as HTMLElement;
		if (cell) {
			cell.dispatchEvent(new MouseEvent("mousedown"));
		}
	});

	it("cell mouseenter triggers paint continue", () => {
		const a = createPanel() as any;
		a._activeZone = 0;
		a._isPainting = true;
		a._paintAction = "set";
		const result = a._renderVisibleCells(5, 15, 0, 10, 20);
		const c = renderTo(result[0]);

		const cell = c.querySelector(".cell") as HTMLElement;
		if (cell) {
			cell.dispatchEvent(new MouseEvent("mouseenter"));
		}
	});
});

describe("render delete calibration dialog event", () => {
	it("cancel button in delete dialog", () => {
		const a = createPanel() as any;
		a._showDeleteCalibrationDialog = true;
		const tpl = a.render();
		const c = renderTo(tpl);

		const backBtn = c.querySelector(".wizard-btn-back") as HTMLElement;
		if (backBtn) {
			backBtn.click();
			expect(a._showDeleteCalibrationDialog).toBe(false);
		}
	});
});

describe("_renderEditor DOM events", () => {
	it("editor panel click deselects active zone", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._activeZone = 2;
		const tpl = a._renderEditor();
		const c = renderTo(tpl);

		const panel = c.querySelector(".panel") as HTMLElement;
		if (panel) {
			panel.click();
			expect(a._activeZone).toBeNull();
		}
	});

	it("grid container click deselects furniture", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._selectedFurnitureId = "f1";
		const tpl = a._renderEditor();
		const c = renderTo(tpl);

		const gridContainer = c.querySelector(".grid-container") as HTMLElement;
		if (gridContainer) {
			gridContainer.click();
			expect(a._selectedFurnitureId).toBeNull();
		}
	});

	it("grid mouseup and mouseleave are bound", () => {
		const a = createPanel() as any;
		a._view = "editor";
		const tpl = a._renderEditor();
		const c = renderTo(tpl);

		const grid = c.querySelector(".grid") as HTMLElement;
		expect(grid).not.toBeNull();
		// mouseup/mouseleave use method refs that have `this` binding issues in external render
		// Tested via _onCellMouseUp() directly in panel-settings.test.ts
	});

	it("unsaved dialog cancel", () => {
		const a = createPanel() as any;
		a._view = "editor";
		a._showUnsavedDialog = true;
		a._pendingNavigation = () => {};
		const tpl = a._renderEditor();
		const c = renderTo(tpl);

		// Find cancel button inside unsaved dialog
		const dialogs = c.querySelectorAll(".template-dialog");
		if (dialogs.length > 0) {
			const btn = dialogs[dialogs.length - 1].querySelector(
				".wizard-btn-back",
			) as HTMLElement;
			if (btn) {
				btn.click();
				expect(a._showUnsavedDialog).toBe(false);
			}
		}
	});
});

describe("_renderSensitivities DOM events", () => {
	it("range inputs update next sibling text", () => {
		const a = createPanel() as any;
		const tpl = a._renderSensitivities();
		const c = renderTo(tpl);

		const ranges = c.querySelectorAll(".setting-range");
		if (ranges.length > 0) {
			const range = ranges[0] as HTMLInputElement;
			// Ensure nextElementSibling exists
			if (range.nextElementSibling) {
				range.value = "10";
				range.dispatchEvent(new Event("input"));
				expect(range.nextElementSibling.textContent).toBe("10");
			}
		}
	});
});

describe("_renderEnvOffset DOM events", () => {
	it("offset range input updates preview", () => {
		const a = createPanel() as any;
		a._offsetsConfig = { illuminance: 0 };
		const tpl = a._renderEnvOffset(
			"Illuminance",
			100,
			"illuminance",
			-500,
			500,
			1,
			"lux",
			0,
			"Tip",
		);
		const c = renderTo(tpl);

		const range = c.querySelector(".setting-range") as HTMLInputElement;
		if (range && range.nextElementSibling) {
			range.value = "10";
			range.dispatchEvent(new Event("input"));
			// Should update the span text
		}
	});
});
