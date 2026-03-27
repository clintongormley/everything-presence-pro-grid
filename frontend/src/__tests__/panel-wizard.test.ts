import { describe, expect, it, vi } from "vitest";
import type { EppWizard } from "../components/epp-wizard.js";
import "../components/epp-wizard.js";

function createWizard(): EppWizard {
	const el = document.createElement("epp-wizard") as EppWizard;
	const a = el as any;
	a.hass = {
		callWS: vi.fn().mockResolvedValue({}),
	};
	a.selectedMac = "AA:BB:CC:DD:EE:01";
	a.rawTargets = [];
	a.sensorState = { occupancy: false };
	a.devices = [
		{ mac: "AA:BB:CC:DD:EE:01", name: "Test" },
	];
	a.localize = (k: string) => k;
	a.initialRoomWidth = 0;
	a.initialRoomDepth = 0;
	a.mode = "wizard";
	// Reset internal state
	a._setupStep = "guide";
	a._wizardSaving = false;
	a._wizardCornerIndex = 0;
	a._wizardCorners = [null, null, null, null];
	a._wizardRoomWidth = 0;
	a._wizardRoomDepth = 0;
	a._wizardCapturing = false;
	a._wizardCaptureProgress = 0;
	a._wizardCapturePaused = false;
	a._wizardCaptureCancelled = false;
	a._wizardOffsetSide = "";
	a._wizardOffsetFb = "";
	a._smoothBuffer = [];
	a._perspective = null;
	return el;
}

describe("_syncCornerOffsets", () => {
	it("sets offset fields from current corner data", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 500, offset_fb: 300 },
			null,
			null,
			null,
		];
		a._wizardCornerIndex = 0;

		a._syncCornerOffsets();

		expect(a._wizardOffsetSide).toBe("50");
		expect(a._wizardOffsetFb).toBe("30");
	});

	it("sets empty strings when corner is null", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = [null, null, null, null];
		a._wizardCornerIndex = 0;

		a._syncCornerOffsets();

		expect(a._wizardOffsetSide).toBe("");
		expect(a._wizardOffsetFb).toBe("");
	});

	it("handles corner with zero offsets", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 200, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		a._wizardCornerIndex = 0;

		a._syncCornerOffsets();

		expect(a._wizardOffsetSide).toBe("");
		expect(a._wizardOffsetFb).toBe("");
	});
});

describe("_wizardCancelCapture", () => {
	it("resets capture state", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCapturing = true;
		a._wizardCapturePaused = true;

		a._wizardCancelCapture();

		expect(a._wizardCaptureCancelled).toBe(true);
		expect(a._wizardCapturing).toBe(false);
		expect(a._wizardCapturePaused).toBe(false);
	});
});

describe("_wizardStartCapture", () => {
	it("does nothing when no active raw target", () => {
		const el = createWizard();
		const a = el as any;
		// No raw targets with valid coordinates
		a.rawTargets = [];

		a._wizardStartCapture();

		expect(a._wizardCapturing).toBe(false);
	});

	it("starts capture when active raw target exists", () => {
		const el = createWizard();
		const a = el as any;
		a.rawTargets = [
			{
				raw_x: 100,
				raw_y: 200,
			},
		];

		a._wizardStartCapture();

		expect(a._wizardCapturing).toBe(true);
		expect(a._wizardCaptureProgress).toBe(0);
		expect(a._wizardCapturePaused).toBe(false);
		expect(a._wizardCaptureCancelled).toBe(false);

		// Cancel to stop the animation loop
		a._wizardCaptureCancelled = true;
	});
});

describe("_autoComputeRoomDimensions", () => {
	it("computes room width and depth from wizard corners", () => {
		const el = createWizard();
		const a = el as any;
		// Front-left, Front-right, Back-right, Back-left
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
		];

		a._autoComputeRoomDimensions();

		expect(a._wizardRoomWidth).toBeGreaterThan(0);
		expect(a._wizardRoomDepth).toBeGreaterThan(0);
	});
});

describe("_computeWizardPerspective", () => {
	it("does nothing when not all corners marked", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		a._computeWizardPerspective();

		expect(a._perspective).toBeNull();
	});

	it("solves perspective when all 4 corners are marked", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = [
			{ raw_x: -1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			{ raw_x: 2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
			{ raw_x: -2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
		];
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		a._computeWizardPerspective();

		expect(a._perspective).not.toBeNull();
		expect(a._perspective).toHaveLength(8);
	});
});

describe("_wizardFinish", () => {
	it("does nothing when perspective is null", async () => {
		const el = createWizard();
		const a = el as any;
		a._perspective = null;

		await a._wizardFinish();

		expect(a.hass.callWS).not.toHaveBeenCalled();
	});

	it("saves calibration and dispatches calibration-complete event", async () => {
		const el = createWizard();
		const a = el as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a.selectedMac = "AA:BB:CC:DD:EE:01";
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		a.hass = {
			callWS: vi.fn().mockResolvedValue({}),
		};

		let eventFired = false;
		el.addEventListener("calibration-complete", () => {
			eventFired = true;
		});

		await a._wizardFinish();

		expect(a.hass.callWS).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "eppgrid/set_setup",
				mac: "AA:BB:CC:DD:EE:01",
				perspective: [1, 0, 0, 0, 1, 0, 0, 0],
				room_width: 3000,
				room_depth: 4000,
			}),
		);
		expect(a._wizardSaving).toBe(false);
		expect(eventFired).toBe(true);
	});

	it("resets saving flag on error", async () => {
		const el = createWizard();
		const a = el as any;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		a.selectedMac = "AA:BB:CC:DD:EE:01";
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		a.hass = {
			callWS: vi.fn().mockRejectedValue(new Error("fail")),
		};

		await expect(a._wizardFinish()).rejects.toThrow("fail");
		expect(a._wizardSaving).toBe(false);
	});
});

describe("_getSmoothedRaw", () => {
	it("returns null when no active target", () => {
		const el = createWizard();
		const a = el as any;
		a.rawTargets = [];

		expect(a._getSmoothedRaw()).toBeNull();
	});

	it("returns smoothed value when active raw target exists", () => {
		const el = createWizard();
		const a = el as any;
		a.rawTargets = [
			{
				raw_x: 500,
				raw_y: 1000,
			},
		];
		a._smoothBuffer = [];

		const result = a._getSmoothedRaw();

		expect(result).not.toBeNull();
		expect(result.x).toBeCloseTo(500, 0);
		expect(result.y).toBeCloseTo(1000, 0);
	});
});

describe("_getWizardTargetStyle", () => {
	it("returns a style string with left and top percentages", () => {
		const el = createWizard();
		const a = el as any;
		const target = {
			raw_x: 0,
			raw_y: 3000,
		};

		const style = a._getWizardTargetStyle(target);

		expect(style).toContain("left:");
		expect(style).toContain("top:");
		expect(style).toContain("%");
	});
});

describe("_rawToFovPct", () => {
	it("maps sensor center to approximately 50% x", () => {
		const el = createWizard();
		const a = el as any;
		const result = a._rawToFovPct(0, 3000);
		expect(result.xPct).toBeCloseTo(50, 0);
	});
});

describe("_solvePerspective", () => {
	it("delegates to perspective lib", () => {
		const el = createWizard();
		const a = el as any;
		const src = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
		];
		const dst = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
			{ x: 0, y: 100 },
		];

		const result = a._solvePerspective(src, dst);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(8);
	});
});
