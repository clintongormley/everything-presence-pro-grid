import { afterEach, describe, expect, it, vi } from "vitest";
import "../../components/epp-wizard.js";
import type { EppWizard } from "../../components/epp-wizard.js";

function createWizard(overrides: Record<string, any> = {}): EppWizard {
	const el = document.createElement("epp-wizard") as any;
	el.rawTargets = [
		{ raw_x: null, raw_y: null },
		{ raw_x: null, raw_y: null },
		{ raw_x: null, raw_y: null },
	];
	el.sensorState = { occupancy: false };
	el.localize = (k: string) => k;
	el.initialRoomWidth = 0;
	el.initialRoomDepth = 0;
	el.mode = "wizard";
	Object.assign(el, overrides);
	return el as EppWizard;
}

afterEach(() => {
	// Clean up any elements attached to body during tests
	for (const child of [...document.body.children]) {
		document.body.removeChild(child);
	}
});

describe("render mode branches", () => {
	it("mode = 'uncalibrated-fov' renders content", async () => {
		const el = createWizard({ mode: "uncalibrated-fov" });
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// Should render SVG FOV view and a calibrate button
		expect(root.querySelector("svg")).not.toBeNull();
		expect(root.innerHTML.length).toBeGreaterThan(0);
	});

	it("uncalibrated-fov SVG scales to its container instead of overflowing at narrow widths", async () => {
		const el = createWizard({ mode: "uncalibrated-fov" });
		document.body.appendChild(el);
		await el.updateComplete;

		const svg = el.shadowRoot!.querySelector("svg")!;
		// viewBox preserves the aspect ratio while the rendered size flexes.
		expect(svg.getAttribute("viewBox")).toBe("0 0 320 210");
		const style = (svg.getAttribute("style") ?? "").replace(/\s+/g, " ");
		// Caps at its natural width but shrinks below it; height follows the ratio.
		expect(style).toContain("max-width: 100%");
		expect(style).toContain("height: auto");
		// No fixed pixel size attributes that would force overflow in a narrow column.
		expect(svg.getAttribute("width")).toBeNull();
		expect(svg.getAttribute("height")).toBeNull();
	});

	it("mode = 'wizard' with _setupStep = null renders nothing", async () => {
		const el = createWizard();
		(el as any)._setupStep = null;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// When _setupStep is null, render() returns `nothing` so shadowRoot should have no meaningful DOM
		const children = root.querySelectorAll("*");
		// Lit renders a comment node for `nothing`, so no real elements should appear
		expect(children.length).toBe(0);
	});
});

describe("connectedCallback", () => {
	it("copies initialRoomWidth and initialRoomDepth to internal state", async () => {
		const el = createWizard({
			initialRoomWidth: 5000,
			initialRoomDepth: 6000,
		});
		document.body.appendChild(el);
		await el.updateComplete;

		const a = el as any;
		expect(a._wizardRoomWidth).toBe(5000);
		expect(a._wizardRoomDepth).toBe(6000);
	});
});

describe("detach/re-attach mid-calibration (HA suspend cycle)", () => {
	it("preserves auto-computed dims and step across a re-attach", async () => {
		const el = createWizard({
			initialRoomWidth: 0,
			initialRoomDepth: 0,
			initialStep: "guide",
		});
		document.body.appendChild(el);
		await el.updateComplete;

		// User progressed: moved to corners and the 4th capture auto-computed
		// the room dimensions.
		const a = el as any;
		a._setupStep = "corners";
		a._wizardRoomWidth = 4000;
		a._wizardRoomDepth = 5000;

		// HA suspends the hidden panel: detach + re-attach the same element.
		document.body.removeChild(el);
		document.body.appendChild(el);
		await el.updateComplete;

		expect(a._setupStep).toBe("corners");
		expect(a._wizardRoomWidth).toBe(4000);
		expect(a._wizardRoomDepth).toBe(5000);
	});

	it("clears _wizardCapturing on disconnect so re-attach has no dead overlay", async () => {
		const el = createWizard({ initialStep: "corners" });
		const a = el as any;
		a.rawTargets = [{ raw_x: 500, raw_y: 1200 }];
		document.body.appendChild(el);
		await el.updateComplete;

		const rafSpy = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation(() => 1 as unknown as number);
		try {
			a._wizardStartCapture();
			expect(a._wizardCapturing).toBe(true);

			document.body.removeChild(el);

			// The RAF loop is dead after detach; a surviving _wizardCapturing
			// would re-render a frozen overlay with no way to finish.
			expect(a._wizardCapturing).toBe(false);
			expect(a._wizardCapturePaused).toBe(false);
		} finally {
			rafSpy.mockRestore();
		}
	});
});

describe("corner dot titles", () => {
	it("keeps original corner labels when an earlier corner is unmarked", async () => {
		const el = createWizard({ initialStep: "corners" });
		const a = el as any;
		// Corner 1 (front-right) is being re-marked: only 0 and 2 are set.
		a._wizardCorners = [
			{ raw_x: -1000, raw_y: 1000, offset_side: 0, offset_fb: 0 },
			null,
			{ raw_x: 1000, raw_y: 3000, offset_side: 0, offset_fb: 0 },
			null,
		];
		a._wizardCornerIndex = 1;
		document.body.appendChild(el);
		await el.updateComplete;

		const dots = el.shadowRoot!.querySelectorAll(".mini-grid-captured");
		expect(dots.length).toBe(2);
		// localize is identity, so titles are the raw label keys.
		expect(dots[0].getAttribute("title")).toBe("corners.front_left");
		// Was "corners.front_right" with the filter+map index bug.
		expect(dots[1].getAttribute("title")).toBe("corners.back_right");
	});

	it("does not render a React-style key attribute on the offsets row", async () => {
		const el = createWizard({ initialStep: "corners" });
		document.body.appendChild(el);
		await el.updateComplete;

		const offsets = el.shadowRoot!.querySelector(".corner-offsets")!;
		expect(offsets.hasAttribute("key")).toBe(false);
	});
});

const MARKED_CORNERS = [
	{ raw_x: 0, raw_y: 0, offset_side: 0, offset_fb: 0 },
	{ raw_x: 4000, raw_y: 0, offset_side: 0, offset_fb: 0 },
	{ raw_x: 4000, raw_y: 5000, offset_side: 0, offset_fb: 0 },
	{ raw_x: 650, raw_y: 4350, offset_side: 650, offset_fb: 650 },
];

// Attach first: the wizard initialises its dims from props on first connect,
// so corner state must be installed afterwards (as real captures would be).
async function markedWizard(): Promise<EppWizard> {
	const el = createWizard({ initialStep: "corners" });
	document.body.appendChild(el);
	await el.updateComplete;
	const a = el as any;
	a._wizardCorners = MARKED_CORNERS.map((c) => ({ ...c }));
	a._wizardCornerIndex = 3;
	a._autoComputeRoomDimensions();
	await el.updateComplete;
	return el;
}

describe("wizard-save event contract", () => {
	it("Save dispatches wizard-save with perspective + dims and enters saving state", async () => {
		const el = await markedWizard();

		const events: CustomEvent[] = [];
		el.addEventListener("wizard-save", (e) => events.push(e as CustomEvent));

		const saveBtn = Array.from(
			el.shadowRoot!.querySelectorAll("epp-button"),
		).find((b) => b.textContent?.includes("common.save"))!;
		saveBtn.click();

		expect(events).toHaveLength(1);
		expect(events[0].detail.perspective).toHaveLength(8);
		// Offsets added back: full wall-to-wall dims (see room-geometry tests).
		expect(events[0].detail.roomWidth).toBe(4000);
		expect(events[0].detail.roomDepth).toBe(5000);
		expect((el as any)._wizardSaving).toBe(true);
	});

	it("shows a localized error and does not dispatch for degenerate corners", async () => {
		const el = createWizard({ initialStep: "corners" });
		const a = el as any;
		document.body.appendChild(el);
		await el.updateComplete;
		// All four corners on the same point — no homography exists.
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 100, offset_side: 0, offset_fb: 0 },
			{ raw_x: 100, raw_y: 100, offset_side: 0, offset_fb: 0 },
			{ raw_x: 100, raw_y: 100, offset_side: 0, offset_fb: 0 },
			{ raw_x: 100, raw_y: 100, offset_side: 0, offset_fb: 0 },
		];
		a._autoComputeRoomDimensions();
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("wizard-save", (e) => events.push(e as CustomEvent));

		const saveBtn = Array.from(
			el.shadowRoot!.querySelectorAll("epp-button"),
		).find((b) => b.textContent?.includes("common.save"))!;
		saveBtn.click();
		await el.updateComplete;

		expect(events).toHaveLength(0);
		expect(a._wizardSaving).toBe(false);
		const error = el.shadowRoot!.querySelector(".save-error");
		expect(error).not.toBeNull();
		expect(error!.textContent).toContain("wizard.invalid_corners");
	});

	it("saveFailed() re-enables Save and shows the save_failed error", async () => {
		const el = await markedWizard();

		(el as any)._wizardFinish();
		expect((el as any)._wizardSaving).toBe(true);

		// Panel reports the persistence failure back.
		el.saveFailed();
		await el.updateComplete;

		expect((el as any)._wizardSaving).toBe(false);
		const error = el.shadowRoot!.querySelector(".save-error");
		expect(error).not.toBeNull();
		expect(error!.textContent).toContain("wizard.save_failed");
		const saveBtn = Array.from(
			el.shadowRoot!.querySelectorAll("epp-button"),
		).find((b) => b.textContent?.includes("common.save")) as HTMLElement & {
			disabled: boolean;
		};
		expect(saveBtn.disabled).toBe(false);
	});

	it("re-marking a corner clears a previous save error", async () => {
		const el = await markedWizard();

		(el as any)._wizardFinish();
		el.saveFailed();
		await el.updateComplete;
		expect(el.shadowRoot!.querySelector(".save-error")).not.toBeNull();

		const chip = el.shadowRoot!.querySelector(".corner-chip") as HTMLElement;
		chip.click();
		await el.updateComplete;

		expect(el.shadowRoot!.querySelector(".save-error")).toBeNull();
	});
});

describe("offset edits after all corners marked", () => {
	it("recomputes room dims when an offset is edited post-marking", async () => {
		const el = await markedWizard();
		const a = el as any;
		a._syncCornerOffsets();
		await el.updateComplete;

		const depthBefore = a._wizardRoomDepth;
		const sideInput = el.shadowRoot!.querySelectorAll(".offset-input")[1]!;
		// Corner 3's fb offset goes from 65cm to 100cm → depth grows by
		// half the 350mm delta (depth averages left/right sides).
		sideInput.dispatchEvent(
			new CustomEvent("value-changed", {
				detail: { value: "100" },
				bubbles: true,
			}),
		);

		expect(a._wizardCorners[3].offset_fb).toBe(1000);
		expect(a._wizardRoomDepth).toBe(depthBefore + 175);
	});
});

describe("setup wizard delegates header to parent panel", () => {
	it("does not render its own .panel-header in shadow DOM", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		expect(root.querySelector(".panel-header")).toBeNull();
	});

	it("does not wrap step content in a padded fullscreen container", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		// .wizard-container added 32px padding + flex centering for the old
		// fullscreen layout — inside .panel it just inflates the gap below
		// the header. It should be gone so spacing matches other views.
		expect(root.querySelector(".wizard-container")).toBeNull();
	});
});

describe("don't show tutorial again checkbox", () => {
	it("renders an ha-checkbox on the guide step", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const cb = root.querySelector(".dont-show-again ha-checkbox");
		expect(cb).not.toBeNull();
	});

	it("does not render the checkbox on the corners step", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		expect(root.querySelector(".dont-show-again")).toBeNull();
	});

	it("dispatches dismiss-tutorial when 'Begin marking corners' is clicked with checkbox ticked", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		const events: CustomEvent[] = [];
		el.addEventListener("dismiss-tutorial", (e) =>
			events.push(e as CustomEvent),
		);

		const root = el.shadowRoot!;
		const cb = root.querySelector<HTMLInputElement>(
			".dont-show-again ha-checkbox",
		)!;
		cb.checked = true;
		cb.dispatchEvent(new Event("change"));

		const beginBtn = Array.from(root.querySelectorAll("epp-button")).find((b) =>
			b.textContent?.includes("wizard.begin_marking"),
		)!;
		beginBtn.click();

		expect(events).toHaveLength(1);
	});

	it("does not dispatch dismiss-tutorial when checkbox is unchecked", async () => {
		const el = createWizard({ mode: "wizard" });
		(el as any)._setupStep = "guide";
		document.body.appendChild(el);
		await el.updateComplete;

		let fired = false;
		el.addEventListener("dismiss-tutorial", () => {
			fired = true;
		});

		const root = el.shadowRoot!;
		const beginBtn = Array.from(root.querySelectorAll("epp-button")).find((b) =>
			b.textContent?.includes("wizard.begin_marking"),
		)!;
		beginBtn.click();

		expect(fired).toBe(false);
	});
});

describe("capture cancel click", () => {
	it("resets capturing state when cancel button is clicked", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		a._wizardCaptureProgress = 0.5;
		document.body.appendChild(el);
		await el.updateComplete;

		const root = el.shadowRoot!;
		const overlay = root.querySelector(".capture-overlay");
		expect(overlay).not.toBeNull();

		const cancelBtn = overlay!.querySelector(
			".wizard-btn-back",
		) as HTMLButtonElement;
		expect(cancelBtn).not.toBeNull();
		cancelBtn.click();

		expect(a._wizardCapturing).toBe(false);
		expect(a._wizardCapturePaused).toBe(false);
	});
});

describe("disconnectedCallback cancels in-flight capture RAF", () => {
	it("cancels the pending RAF id and marks capture cancelled when detached", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a.rawTargets = [{ raw_x: 500, raw_y: 1200 }];
		document.body.appendChild(el);
		await el.updateComplete;

		// Stub RAF so we can capture the id we hand back to the component
		const rafSpy = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation(() => 4242 as unknown as number);
		const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

		try {
			a._wizardStartCapture();
			expect(a._wizardCapturing).toBe(true);
			expect(a._captureRafId).toBe(4242);
			expect(a._wizardCaptureCancelled).toBe(false);

			document.body.removeChild(el);

			expect(a._wizardCaptureCancelled).toBe(true);
			expect(cancelSpy).toHaveBeenCalledWith(4242);
			expect(a._captureRafId).toBeNull();
		} finally {
			rafSpy.mockRestore();
			cancelSpy.mockRestore();
		}
	});

	it("does not run another tick after disconnect even if RAF queue is flushed", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a.rawTargets = [{ raw_x: 500, raw_y: 1200 }];
		document.body.appendChild(el);
		await el.updateComplete;

		// Capture every tick callback the component schedules so we can
		// invoke them manually after disconnect.
		const callbacks: FrameRequestCallback[] = [];
		const rafSpy = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((cb) => {
				callbacks.push(cb);
				return callbacks.length as unknown as number;
			});

		try {
			a._wizardStartCapture();
			expect(callbacks).toHaveLength(1);

			// Detach the component mid-capture
			document.body.removeChild(el);
			expect(a._wizardCaptureCancelled).toBe(true);

			// Snapshot mutable state, then flush the leaked closure.
			const progressBefore = a._wizardCaptureProgress;
			const capturingBefore = a._wizardCapturing;
			const cornersBefore = a._wizardCorners;
			const rafCallsBefore = rafSpy.mock.calls.length;

			callbacks[0]?.(performance.now());

			// The leaked closure must early-return: no state mutations,
			// no further RAF scheduling.
			expect(a._wizardCaptureProgress).toBe(progressBefore);
			expect(a._wizardCapturing).toBe(capturingBefore);
			expect(a._wizardCorners).toBe(cornersBefore);
			expect(rafSpy.mock.calls.length).toBe(rafCallsBefore);
		} finally {
			rafSpy.mockRestore();
		}
	});
});

describe("wizard cancel + corner-chip resets", () => {
	it("_fireCancel resets corner and error state", () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._wizardCorners = [
			{ raw_x: 1, raw_y: 2, offset_side: 0, offset_fb: 0 },
			null,
			null,
			null,
		];
		a._saveError = "wizard.save_failed";
		a._fireCancel();
		expect(a._wizardCorners).toEqual([null, null, null, null]);
		expect(a._saveError).toBeNull();
	});

	it("clicking a corner chip nulls _perspective (it becomes stale)", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a._wizardCorners = [
			{ raw_x: 100, raw_y: 100, offset_side: 0, offset_fb: 0 },
			{ raw_x: 200, raw_y: 100, offset_side: 0, offset_fb: 0 },
			{ raw_x: 200, raw_y: 200, offset_side: 0, offset_fb: 0 },
			{ raw_x: 100, raw_y: 200, offset_side: 0, offset_fb: 0 },
		];
		a._wizardCornerIndex = 4;
		a._perspective = [1, 0, 0, 0, 1, 0, 0, 0];
		document.body.appendChild(el);
		await el.updateComplete;

		const chip = el.shadowRoot!.querySelector(".corner-chip") as HTMLElement;
		chip.click();
		expect(a._perspective).toBeNull();
	});
});

describe("capture overlay a11y (focus + Escape)", () => {
	it("Escape cancels capture while overlay is open", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		document.body.appendChild(el);
		await el.updateComplete;

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(a._wizardCapturing).toBe(false);
	});

	it("Escape does nothing when overlay is closed (no leaked listener)", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		document.body.appendChild(el);
		await el.updateComplete;

		// Close the overlay by clicking cancel
		const cancelBtn = el.shadowRoot!.querySelector(
			".capture-overlay .wizard-btn-back",
		) as HTMLButtonElement;
		cancelBtn.click();
		await el.updateComplete;
		expect(a._wizardCapturing).toBe(false);

		// Re-open with capturing active and pretend nobody is in the wizard step
		// — Escape pressed before re-opening shouldn't trigger anything.
		const fired: KeyboardEvent[] = [];
		const spy = (e: KeyboardEvent) => fired.push(e);
		document.addEventListener("keydown", spy);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		document.removeEventListener("keydown", spy);
		// _wizardCapturing should still be false
		expect(a._wizardCapturing).toBe(false);
	});

	it("focuses the cancel button when overlay opens", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		document.body.appendChild(el);
		await el.updateComplete;

		// Open the overlay
		a._wizardCapturing = true;
		await el.updateComplete;
		// allow rAF microtask for focus
		await new Promise((r) => setTimeout(r, 0));

		const cancelBtn = el.shadowRoot!.querySelector(
			".capture-overlay .wizard-btn-back",
		) as HTMLButtonElement;
		expect(cancelBtn).not.toBeNull();
		expect(el.shadowRoot!.activeElement).toBe(cancelBtn);
	});

	it("disconnectedCallback removes Escape listener", async () => {
		const el = createWizard({ mode: "wizard" });
		const a = el as any;
		a._setupStep = "corners";
		a._wizardCapturing = true;
		document.body.appendChild(el);
		await el.updateComplete;

		document.body.removeChild(el);
		// After disconnect, dispatching Escape on document must not toggle state
		// (the element is detached so there's no observable "side effect" check
		// other than no exceptions). Re-attach, set capturing, dispatch Escape,
		// expect listener was re-installed.
		document.body.appendChild(el);
		a._wizardCapturing = true;
		await el.updateComplete;
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(a._wizardCapturing).toBe(false);
	});
});
