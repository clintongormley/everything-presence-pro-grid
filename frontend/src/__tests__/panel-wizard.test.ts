import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EppWizard } from "../components/epp-wizard.js";
import "../components/epp-wizard.js";
import { CAPTURE_DURATION_S } from "../constants.js";

function createWizard(): EppWizard {
	const el = document.createElement("epp-wizard") as EppWizard;
	const a = el as any;
	a.rawTargets = [];
	a.sensorState = { occupancy: false };
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

	describe("tick callback branches", () => {
		let rafCallback: FrameRequestCallback | null;
		let nowMs: number;

		beforeEach(() => {
			rafCallback = null;
			nowMs = 1000;
			vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
				rafCallback = cb;
				return 1;
			});
			vi.spyOn(Date, "now").mockImplementation(() => nowMs);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("completes capture with valid target and sets corner data", () => {
			const el = createWizard();
			const a = el as any;
			a.rawTargets = [{ raw_x: 500, raw_y: 1200 }];
			a._wizardCornerIndex = 0;
			const syncSpy = vi.spyOn(a, "_syncCornerOffsets");

			// Start capture -- this reads Date.now() for lastTick and calls rAF
			a._wizardStartCapture();
			expect(a._wizardCapturing).toBe(true);

			// The first rAF was requested; fire tick repeatedly to accumulate time
			const duration = CAPTURE_DURATION_S * 1000;
			const step = 200;
			for (let elapsed = 0; elapsed < duration + step; elapsed += step) {
				nowMs = 1000 + elapsed + step;
				const cb = rafCallback;
				rafCallback = null;
				if (cb) cb(0);
			}

			expect(a._wizardCapturing).toBe(false);
			expect(a._wizardCorners[0]).not.toBeNull();
			expect(a._wizardCorners[0].raw_x).toBeCloseTo(500, 0);
			expect(a._wizardCorners[0].raw_y).toBeCloseTo(1200, 0);
			expect(a._wizardCornerIndex).toBe(1);
			expect(syncSpy).toHaveBeenCalled();
		});

		it("pauses when 0 active targets", () => {
			const el = createWizard();
			const a = el as any;
			// Need an active target to pass the initial guard
			a.rawTargets = [{ raw_x: 100, raw_y: 200 }];

			a._wizardStartCapture();

			// Before firing the tick, switch to 0 active targets
			a.rawTargets = [];
			nowMs = 1100;
			const cb = rafCallback;
			rafCallback = null;
			if (cb) cb(0);

			expect(a._wizardCapturePaused).toBe(true);
			// Progress should still be 0 since no valid frames accumulated
			expect(a._wizardCaptureProgress).toBe(0);
			// Should still be capturing (requested another frame)
			expect(a._wizardCapturing).toBe(true);
			// Clean up
			a._wizardCaptureCancelled = true;
		});

		it("pauses when 2 active targets", () => {
			const el = createWizard();
			const a = el as any;
			a.rawTargets = [{ raw_x: 100, raw_y: 200 }];

			a._wizardStartCapture();

			// Before firing the tick, switch to 2 active targets
			a.rawTargets = [
				{ raw_x: 100, raw_y: 200 },
				{ raw_x: 300, raw_y: 400 },
			];
			nowMs = 1100;
			const cb = rafCallback;
			rafCallback = null;
			if (cb) cb(0);

			expect(a._wizardCapturePaused).toBe(true);
			expect(a._wizardCaptureProgress).toBe(0);
			expect(a._wizardCapturing).toBe(true);
			// Clean up
			a._wizardCaptureCancelled = true;
		});

		it("returns early when cancelled mid-capture", () => {
			const el = createWizard();
			const a = el as any;
			a.rawTargets = [{ raw_x: 100, raw_y: 200 }];

			a._wizardStartCapture();
			expect(a._wizardCapturing).toBe(true);

			// Cancel before firing the tick
			a._wizardCaptureCancelled = true;
			nowMs = 1100;
			const cb = rafCallback;
			rafCallback = null;
			if (cb) cb(0);

			// No further rAF should have been requested
			expect(rafCallback).toBeNull();
			// _wizardCapturing stays true since tick returned early without reaching the done path
			// (the cancel method itself sets it to false, but the tick just bails out)
		});

		it("calls _autoComputeRoomDimensions when all 4 corners captured", () => {
			const el = createWizard();
			const a = el as any;
			a.rawTargets = [{ raw_x: 800, raw_y: 900 }];
			// Pre-set corners 0-2
			a._wizardCorners = [
				{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
				{ raw_x: 1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
				{ raw_x: 1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
				null,
			];
			a._wizardCornerIndex = 3;
			const autoSpy = vi.spyOn(a, "_autoComputeRoomDimensions");

			a._wizardStartCapture();

			// Run ticks past the duration
			const duration = CAPTURE_DURATION_S * 1000;
			const step = 200;
			for (let elapsed = 0; elapsed < duration + step; elapsed += step) {
				nowMs = 1000 + elapsed + step;
				const cb = rafCallback;
				rafCallback = null;
				if (cb) cb(0);
			}

			expect(a._wizardCapturing).toBe(false);
			expect(a._wizardCorners[3]).not.toBeNull();
			expect(autoSpy).toHaveBeenCalled();
		});

		it("does not advance corner index when corner index is already 3", () => {
			const el = createWizard();
			const a = el as any;
			a.rawTargets = [{ raw_x: 500, raw_y: 600 }];
			// Start at corner 3 with corners 0-2 unset to avoid triggering auto-compute
			a._wizardCorners = [null, null, null, null];
			a._wizardCornerIndex = 3;

			a._wizardStartCapture();

			const duration = CAPTURE_DURATION_S * 1000;
			const step = 200;
			for (let elapsed = 0; elapsed < duration + step; elapsed += step) {
				nowMs = 1000 + elapsed + step;
				const cb = rafCallback;
				rafCallback = null;
				if (cb) cb(0);
			}

			expect(a._wizardCapturing).toBe(false);
			// Corner 3 should be set
			expect(a._wizardCorners[3]).not.toBeNull();
			// idx < 3 is false so cornerIndex stays at 3
			expect(a._wizardCornerIndex).toBe(3);
		});
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
	const SQUARE_CORNERS = [
		{ raw_x: -1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
		{ raw_x: 1500, raw_y: 1000, offset_side: 0, offset_fb: 0 },
		{ raw_x: 2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
		{ raw_x: -2000, raw_y: 4000, offset_side: 0, offset_fb: 0 },
	];

	it("shows the invalid_corners error and dispatches nothing for a degenerate layout", () => {
		const el = createWizard();
		const a = el as any;
		// Four identical points — solvePerspective returns null.
		a._wizardCorners = Array.from({ length: 4 }, () => ({
			raw_x: 100,
			raw_y: 100,
			offset_side: 0,
			offset_fb: 0,
		}));
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		const events: CustomEvent[] = [];
		el.addEventListener("wizard-save", (e) => events.push(e as CustomEvent));

		a._wizardFinish();

		expect(events).toHaveLength(0);
		expect(a._wizardSaving).toBe(false);
		expect(a._saveError).toBe("wizard.invalid_corners");
	});

	it("dispatches wizard-save with the calibration payload and enters saving state", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = SQUARE_CORNERS.map((c) => ({ ...c }));
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		const events: CustomEvent[] = [];
		el.addEventListener("wizard-save", (e) => events.push(e as CustomEvent));

		a._wizardFinish();

		expect(events).toHaveLength(1);
		expect(events[0].detail.perspective).toHaveLength(8);
		expect(events[0].detail.roomWidth).toBe(3000);
		expect(events[0].detail.roomDepth).toBe(4000);
		expect(a._wizardSaving).toBe(true);
		expect(a._saveError).toBeNull();
	});

	it("saveFailed() resets the saving flag and records the error key", () => {
		const el = createWizard();
		const a = el as any;
		a._wizardCorners = SQUARE_CORNERS.map((c) => ({ ...c }));
		a._wizardRoomWidth = 3000;
		a._wizardRoomDepth = 4000;

		a._wizardFinish();
		expect(a._wizardSaving).toBe(true);

		el.saveFailed();

		expect(a._wizardSaving).toBe(false);
		expect(a._saveError).toBe("wizard.save_failed");
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

describe("_getWizardTargetStyle FOV mapping", () => {
	it("maps the sensor centreline to approximately 50% x", () => {
		const el = createWizard();
		const a = el as any;
		const style = a._getWizardTargetStyle({ raw_x: 0, raw_y: 3000 });
		expect(style).toMatch(/left: 50(\.\d+)?%/);
	});
});
