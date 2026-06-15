import { css, html, LitElement, nothing, svg } from "lit";
import { property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
	CAPTURE_DURATION_S,
	CORNER_LABELS,
	CORNER_OFFSET_LABELS,
	FOV_HALF_ANGLE,
	FOV_X_EXTENT,
	TARGET_COLORS,
} from "../constants.js";
import { rawToFovPct } from "../lib/coordinates.js";
import { DocumentListenerGroup } from "../lib/document-listeners.js";
import { MAX_RANGE } from "../lib/grid.js";
import { solvePerspective } from "../lib/perspective.js";
import {
	autoComputeRoomDimensions,
	medianPoint,
} from "../lib/room-geometry.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { buttonStyles, settingStyles } from "../styles.js";
import type { RawTarget, WizardCorner } from "../types.js";
import "../ui/epp-button.js";
import "../ui/epp-field.js";

export type SetupStep = "guide" | "corners";

export class EppWizard extends LitElement {
	// --- Properties set by the parent panel ---
	@property({ attribute: false }) rawTargets: RawTarget[] = [];
	@property({ attribute: false }) sensorState: {
		occupancy: boolean;
	} = { occupancy: false };
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	// Initial room dimensions (for re-calibration)
	@property({ type: Number }) initialRoomWidth = 0;
	@property({ type: Number }) initialRoomDepth = 0;
	@property({ type: String }) initialStep: SetupStep | null = null;

	// Rendering mode:
	//   "wizard" (default) — full calibration flow (guide -> corners)
	//   "uncalibrated-fov" — uncalibrated FOV preview (no perspective yet)
	@property({ type: String }) mode: "wizard" | "uncalibrated-fov" = "wizard";

	// --- Internal wizard state ---
	@state() private _setupStep: SetupStep | null = "guide";
	@state() private _wizardSaving = false;
	@state() private _wizardCornerIndex = 0;
	@state() private _wizardCorners: (WizardCorner | null)[] = [
		null,
		null,
		null,
		null,
	];
	@state() private _wizardRoomWidth = 0; // mm
	@state() private _wizardRoomDepth = 0; // mm
	@state() private _wizardCapturing = false;
	@state() private _wizardCaptureProgress = 0; // 0..1
	@state() private _wizardCapturePaused = false;
	@state() private _wizardOffsetSide = "";
	@state() private _wizardOffsetFb = "";
	@state() private _dismissTutorial = false;
	// Translation key of the error shown next to the Save button, or null.
	@state() private _saveError: string | null = null;

	private _wizardCaptureCancelled = false;
	private _captureRafId: number | null = null;
	private _initializedFromProps = false;

	// Perspective computed during wizard (not emitted until finish)
	private _perspective: number[] | null = null;

	connectedCallback(): void {
		super.connectedCallback();
		// Initialise from props only on the FIRST connect. HA detaches and
		// re-attaches the panel during dashboard rebuilds and hidden-tab
		// suspends; re-running this on every re-attach wiped the
		// auto-computed room dims (while _wizardCorners survived), so a
		// post-suspend Save solved a homography against a zero-size room.
		if (this._initializedFromProps) return;
		this._initializedFromProps = true;
		this._wizardRoomWidth = this.initialRoomWidth;
		this._wizardRoomDepth = this.initialRoomDepth;
		if (this.initialStep !== null) this._setupStep = this.initialStep;
	}

	private _onCaptureOverlayKeydown = (e: Event): void => {
		const key = (e as KeyboardEvent).key;
		if (key === "Escape") {
			e.preventDefault();
			this._wizardCancelCapture();
		} else if (key === "Tab") {
			// Trap focus on the single Cancel button inside the overlay.
			e.preventDefault();
			const cancelBtn = this.shadowRoot?.querySelector(
				".capture-overlay .wizard-btn-back",
			) as HTMLElement | null;
			cancelBtn?.focus();
		}
	};

	// Attached only while the capture overlay is open (see updated()).
	private _captureOverlayListeners = new DocumentListenerGroup([
		{
			target: document,
			type: "keydown",
			listener: this._onCaptureOverlayKeydown,
		},
	]);

	updated(changed: Map<string, unknown>): void {
		if (changed.has("_wizardCapturing")) {
			if (this._wizardCapturing) {
				this._captureOverlayListeners.attach();
				const cancelBtn = this.shadowRoot?.querySelector(
					".capture-overlay .wizard-btn-back",
				) as HTMLElement | null;
				cancelBtn?.focus();
			} else {
				this._captureOverlayListeners.detach();
			}
		}
		if (changed.has("_wizardCornerIndex")) {
			// Keep the active corner chip visible as corners advance — the chip
			// row scrolls horizontally on mobile rather than shrinking/wrapping.
			const activeChip = this.shadowRoot?.querySelector(
				".corner-progress .corner-chip.active",
			) as HTMLElement | null;
			activeChip?.scrollIntoView?.({
				behavior: "smooth",
				inline: "center",
				block: "nearest",
			});
		}
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._captureOverlayListeners.detach();
		this._wizardCaptureCancelled = true;
		// Stop the capture outright: the RAF loop is dead after detach, so a
		// surviving _wizardCapturing would re-render a frozen overlay on
		// re-attach with no way to finish or cancel it.
		this._wizardCapturing = false;
		this._wizardCapturePaused = false;
		if (this._captureRafId !== null) {
			cancelAnimationFrame(this._captureRafId);
			this._captureRafId = null;
		}
	}

	// --- Sync corner offsets ---
	_syncCornerOffsets(): void {
		const corner = this._wizardCorners[this._wizardCornerIndex];
		this._wizardOffsetSide = corner?.offset_side
			? String(corner.offset_side / 10)
			: "";
		this._wizardOffsetFb = corner?.offset_fb
			? String(corner.offset_fb / 10)
			: "";
	}

	// --- Capture ---
	_wizardCancelCapture(): void {
		this._wizardCaptureCancelled = true;
		this._wizardCapturing = false;
		this._wizardCapturePaused = false;
	}

	_wizardStartCapture(): void {
		const active = this.rawTargets.find(
			(t) => t.raw_x != null && t.raw_y != null,
		);
		if (!active) return;

		this._wizardCapturing = true;
		this._wizardCaptureProgress = 0;
		this._wizardCapturePaused = false;
		this._wizardCaptureCancelled = false;

		const samples: { x: number; y: number }[] = [];
		let goodElapsed = 0;
		let lastTick = Date.now();
		const duration = CAPTURE_DURATION_S * 1000;

		const tick = () => {
			if (this._wizardCaptureCancelled) return;

			const now = Date.now();
			const dt = now - lastTick;
			lastTick = now;

			// Check target count: exactly 1 active target required
			const activeRaw = this.rawTargets.filter(
				(t): t is RawTarget & { raw_x: number; raw_y: number } =>
					t.raw_x != null && t.raw_y != null,
			);
			const valid = activeRaw.length === 1;
			this._wizardCapturePaused = !valid;

			if (valid) {
				goodElapsed += dt;
				samples.push({ x: activeRaw[0].raw_x, y: activeRaw[0].raw_y });
			}

			this._wizardCaptureProgress = Math.min(goodElapsed / duration, 1);

			if (goodElapsed < duration) {
				this._captureRafId = requestAnimationFrame(tick);
				return;
			}

			// Done -- clear stale RAF id and compute median position
			this._captureRafId = null;
			this._wizardCapturing = false;
			this._wizardCapturePaused = false;
			if (samples.length === 0) return;

			const med = medianPoint(samples);
			if (!med) return;

			const idx = this._wizardCornerIndex;
			this._wizardCorners = [...this._wizardCorners];
			this._wizardCorners[idx] = {
				raw_x: med.x,
				raw_y: med.y,
				offset_side: 10 * (parseFloat(this._wizardOffsetSide) || 0),
				offset_fb: 10 * (parseFloat(this._wizardOffsetFb) || 0),
			};

			// Advance to next unmarked corner and clear offset fields
			if (idx < 3) {
				this._wizardCornerIndex = idx + 1;
			}
			this._syncCornerOffsets();

			// All 4 marked -- compute dimensions but don't save yet (user can review)
			if (this._wizardCorners.every((c) => c !== null)) {
				this._autoComputeRoomDimensions();
			}
		};

		this._captureRafId = requestAnimationFrame(tick);
	}

	_autoComputeRoomDimensions(): void {
		const corners = this._wizardCorners as WizardCorner[];
		const result = autoComputeRoomDimensions(corners);
		this._wizardRoomWidth = result.width;
		this._wizardRoomDepth = result.depth;
	}

	/**
	 * Offsets feed the wall-to-wall dimension estimate, so editing one after
	 * the 4th capture must refresh the auto-computed dims — otherwise Save
	 * solves the homography against stale dimensions.
	 */
	private _recomputeDimsIfAllMarked(): void {
		if (this._wizardCorners.every((c) => c !== null)) {
			this._autoComputeRoomDimensions();
		}
	}

	_computeWizardPerspective(): void {
		const corners = this._wizardCorners as WizardCorner[];
		if (!corners.every((c) => c !== null)) return;

		const w = this._wizardRoomWidth;
		const d = this._wizardRoomDepth;

		const sensorPts = corners.map((c) => ({ x: c.raw_x, y: c.raw_y }));
		const roomPts = [
			{ x: corners[0].offset_side, y: corners[0].offset_fb },
			{ x: w - corners[1].offset_side, y: corners[1].offset_fb },
			{ x: w - corners[2].offset_side, y: d - corners[2].offset_fb },
			{ x: corners[3].offset_side, y: d - corners[3].offset_fb },
		];

		this._perspective = solvePerspective(sensorPts, roomPts);
	}

	/**
	 * Save contract with the parent panel:
	 *  1. The wizard validates and computes the homography locally, then
	 *     dispatches `wizard-save` with { perspective, roomWidth, roomDepth }
	 *     and enters its saving state (Save disabled).
	 *  2. The panel owns persistence (`eppgrid/set_setup`), like every other
	 *     view. On success it navigates away, unmounting the wizard.
	 *  3. On failure the panel calls `saveFailed()` on this element so the
	 *     wizard re-enables Save and shows a localized error.
	 */
	_wizardFinish(): void {
		this._computeWizardPerspective();
		if (!this._perspective) {
			// Degenerate corners (duplicate/collinear points) — the homography
			// has no solution. Surface it instead of silently doing nothing.
			this._saveError = "wizard.invalid_corners";
			return;
		}
		this._saveError = null;
		this._wizardSaving = true;
		this.dispatchEvent(
			new CustomEvent("wizard-save", {
				detail: {
					perspective: this._perspective,
					roomWidth: this._wizardRoomWidth,
					roomDepth: this._wizardRoomDepth,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	/** Called by the panel when persisting the calibration failed. */
	saveFailed(): void {
		this._wizardSaving = false;
		this._saveError = "wizard.save_failed";
	}

	// --- FOV helpers ---
	_getWizardTargetStyle(target: RawTarget): string {
		const { xPct, yPct } = rawToFovPct(target.raw_x ?? 0, target.raw_y ?? 0);
		return `left: ${xPct}%; top: ${yPct}%;`;
	}

	// --- Styles ---
	static styles = [
		buttonStyles,
		settingStyles,
		css`
      :host {
        display: block;
      }

      .wizard-card {
        max-width: 560px;
        width: 100%;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        border-radius: var(--epp-radius-lg, 16px);
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: var(--epp-space-5, 24px);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      }

      .wizard-card h2 {
        margin: 0;
        font-size: var(--epp-font-2xl, 20px);
        font-weight: 500;
      }

      .wizard-card p {
        margin: 0;
        color: var(--secondary-text-color, #757575);
        font-size: 15px;
        line-height: 1.5;
      }

      .wizard-card label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: var(--epp-font-base, 14px);
        font-weight: 500;
        color: var(--secondary-text-color, #757575);
      }

      .wizard-card input[type="text"] {
        width: 100%;
        padding: 10px var(--epp-space-3, 12px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        font-size: 15px;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
      }

      .wizard-actions {
        display: flex;
        justify-content: space-between;
        gap: var(--epp-space-3, 12px);
      }

      .wizard-btn-secondary {
        background: var(--secondary-background-color, #e0e0e0);
        color: var(--primary-text-color, #212121);
      }

      .wizard-btn-secondary:hover {
        opacity: 0.85;
      }

      .mini-grid-container {
        display: flex;
        justify-content: center;
      }

      .mini-grid-target {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--success-color, #4caf50);
        border: 2px solid var(--card-background-color, #fff);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        transform: translate(-50%, -50%);
        z-index: 10;
        transition: left 0.15s, top 0.15s;
      }

      .mini-grid-captured {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--warning-color, #ff9800);
        border: 2px solid var(--card-background-color, #fff);
        transform: translate(-50%, -50%);
        z-index: 8;
      }

      .sensor-fov-view {
        width: 480px;
        aspect-ratio: 1.732 / 1;
        background: var(--secondary-background-color, #1a1a2e);
        border: 2px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        position: relative;
        overflow: hidden;
      }

      .sensor-fov-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .no-target-warning {
        color: var(--error-color, #f44336);
        font-size: var(--epp-font-sm, 13px);
        text-align: center;
      }

      .save-error {
        color: var(--error-color, #f44336);
        font-size: var(--epp-font-sm, 13px);
        text-align: center;
        margin: 0;
      }

      .corner-progress {
        display: flex;
        gap: var(--epp-space-2, 8px);
        flex-wrap: wrap;
      }

      .corner-chip {
        padding: 5px 11px;
        border-radius: var(--epp-radius-lg, 16px);
        font-size: var(--epp-font-sm, 13px);
        background: var(--secondary-background-color, #e0e0e0);
        color: var(--secondary-text-color, #757575);
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
        border: 2px solid transparent;
      }

      .corner-chip.active {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }

      .corner-chip.done {
        background: #4caf50;
        color: #fff;
      }

      .corner-chip.done.active {
        border-color: var(--primary-color, #03a9f4);
      }

      .corner-arrow {
        font-size: var(--epp-font-xl, 18px);
        color: var(--disabled-text-color, #ccc);
        font-weight: bold;
      }

      .corner-arrow.done {
        color: var(--primary-color, #03a9f4);
      }

      .corner-instruction {
        font-size: 15px;
        color: var(--primary-text-color, #212121);
      }

      .corner-offsets {
        display: flex;
        align-items: center;
        gap: var(--epp-space-2, 8px);
      }

      /* The two distance inputs always share one row (flex row); on mobile the
         label stacks above this row (see the media query below). */
      .offset-inputs {
        display: flex;
        flex: 1;
        min-width: 0;
        gap: var(--epp-space-2, 8px);
      }

      .offset-label {
        font-size: var(--epp-font-sm, 13px);
        color: var(--secondary-text-color, #888);
        white-space: nowrap;
        flex-shrink: 0;
      }

      .capture-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .capture-overlay-content {
        background: var(--card-background-color, #fff);
        padding: var(--epp-space-5, 24px) 32px;
        border-radius: var(--epp-radius-lg, 16px);
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .offset-input {
        flex: 1;
        min-width: 0;
        width: 100%;
        padding: 14px var(--epp-space-3, 12px) 6px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--epp-radius-md, 10px);
        font-size: var(--epp-font-lg, 16px);
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
      }

      .offset-input::placeholder {
        color: var(--secondary-text-color, #888);
        font-size: var(--epp-font-sm, 13px);
      }

      .offset-input:focus {
        outline: none;
        border-color: var(--primary-color, #03a9f4);
      }

      .capture-progress {
        display: flex;
        align-items: center;
        gap: var(--epp-space-3, 12px);
        width: 100%;
      }

      .capture-bar {
        flex: 1;
        height: 8px;
        background: var(--secondary-background-color, #e0e0e0);
        border-radius: 4px;
        overflow: hidden;
      }

      .capture-fill {
        height: 100%;
        background: var(--primary-color, #03a9f4);
        border-radius: 4px;
        transition: width 0.1s linear;
      }

      .capture-progress span {
        font-size: var(--epp-font-sm, 13px);
        color: var(--secondary-text-color, #757575);
        white-space: nowrap;
      }

      .dont-show-again {
        margin-top: var(--epp-space-4, 16px);
      }

      /* Mobile overrides — placed AFTER all base rules so they win at equal
         specificity (media queries add no specificity; later source order wins). */
      @media (max-width: 819px) {
        .wizard-card {
          padding: var(--epp-space-4, 16px);
        }
        .sensor-fov-view {
          width: 100%;
          max-width: 480px;
        }
        /* Label on its own line; the two inputs share the row below it (the
           .offset-inputs flex row, now stretched full-width, keeps them
           side-by-side instead of overflowing). */
        .corner-offsets {
          flex-direction: column;
          align-items: stretch;
        }
        /* Corner chips on a single row (scroll if they don't all fit) rather
           than wrapping to two lines; shrink them so they usually do fit. */
        .corner-progress {
          flex-wrap: nowrap;
          overflow-x: auto;
        }
        .corner-chip {
          padding: 4px 9px;
          font-size: var(--epp-font-xs, 12px);
          white-space: nowrap;
        }
        .corner-arrow {
          font-size: var(--epp-font-base, 14px);
        }
      }
    `,
	];

	// --- Render ---
	render() {
		switch (this.mode) {
			case "uncalibrated-fov":
				return this._renderUncalibratedFov();
			default:
				if (this._setupStep === null) return nothing;
				return this._renderWizard();
		}
	}

	_renderWizard() {
		let stepContent: unknown;
		switch (this._setupStep) {
			case "guide":
				stepContent = this._renderWizardGuide();
				break;
			case "corners":
				stepContent = this._renderWizardCorners();
				break;
		}
		return html`
      ${stepContent}
      ${
				this._wizardCapturing
					? html`
        <div class="capture-overlay">
          <div class="capture-overlay-content">
            <div class="capture-progress" style="width: 200px;">
              <div class="capture-bar">
                <div class="capture-fill" style="width: ${this._wizardCaptureProgress * 100}%"></div>
              </div>
              <span>${this.localize("wizard.recording", { current: Math.round(this._wizardCaptureProgress * CAPTURE_DURATION_S), total: CAPTURE_DURATION_S })}</span>
            </div>
            <p style="margin: 8px 0 0; font-size: var(--epp-font-sm, 13px); color: ${this._wizardCapturePaused ? "var(--error-color, #e53935)" : "var(--secondary-text-color)"};">
              ${this._wizardCapturePaused ? this.localize("wizard.paused") : this.localize("wizard.stand_still")}
            </p>
            <button
              class="wizard-btn wizard-btn-back"
              style="margin-top: var(--epp-space-3, 12px);"
              @click=${() => this._wizardCancelCapture()}
            >${this.localize("common.cancel")}</button>
          </div>
        </div>
      `
					: nothing
			}
    `;
	}

	_renderWizardGuide() {
		// Walking person icon (simple cartoon stick figure)
		const walker = (x: number, y: number, flip = false, rotate = 0) => svg`
      <g transform="translate(${x}, ${y}) rotate(${rotate}) scale(${flip ? -0.7 : 0.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `;

		// Arrow between two points, shortened on both ends
		const arrow = (x1: number, y1: number, x2: number, y2: number) => {
			const dx = x2 - x1,
				dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy);
			const ux = dx / len,
				uy = dy / len;
			const inset = 40;
			const sx = x1 + ux * inset,
				sy = y1 + uy * inset;
			const ex = x2 - ux * inset,
				ey = y2 - uy * inset;
			// Arrowhead
			const ax = ex - ux * 8 + uy * 4,
				ay = ey - uy * 8 - ux * 4;
			const bx = ex - ux * 8 - uy * 4,
				by = ey - uy * 8 + ux * 4;
			return svg`
        <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${ex},${ey} ${ax},${ay} ${bx},${by}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `;
		};

		// Corner positions: sensor top-right, order: TL(1) -> TR(2) -> BR(3) -> BL(4)
		// Inset from room walls so badges and sensor don't clip
		const TL = { x: 50, y: 55 }; // Corner 1: front-left
		const TR = { x: 290, y: 55 }; // Corner 2: front-right (sensor here)
		const BR = { x: 290, y: 225 }; // Corner 3: back-right (same distance from bottom as 1/2 from top)
		const BL = { x: 50, y: 235 }; // Corner 4 plant/65cm position (stays near wall)
		const BL_BADGE = { x: 98, y: 225 }; // Corner 4 badge at same height as 3

		const roomDiagram = svg`
      <svg viewBox="0 0 360 290" width="360" height="290" style="display: block; margin: 0 auto;">
        <!-- Room with rounded corners, soft fill -->
        <rect x="30" y="35" width="280" height="210" rx="8"
              fill="var(--secondary-background-color, #f5f5f5)"
              stroke="var(--divider-color, #d0d0d0)" stroke-width="2.5"/>

        <!-- Wall labels -->
        <text x="170" y="28" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.front_wall_label")}</text>
        <text x="170" y="262" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.back_wall_label")}</text>

        <!-- Arrows with walking figures: 1->2->3->4 -->
        ${arrow(TL.x, TL.y, TR.x, TR.y)}
        ${walker(170, 72)}
        ${arrow(TR.x, TR.y, BR.x, BR.y)}
        ${walker(265, 145, false, 90)}
        <!-- 3rd arrow flat from 3 to 4 badge, same gap as arrow 1 has from 2 -->
        ${arrow(BR.x, BR.y, BL_BADGE.x - 15, BR.y)}
        ${walker(190, BR.y - 17, true)}

        <!-- Corner 4 badge: same height as 3, just past arrow end -->
        <circle cx="${BL_BADGE.x}" cy="${BL_BADGE.y}" r="14" fill="#FF9800" opacity="0.15"/>
        <circle cx="${BL_BADGE.x}" cy="${BL_BADGE.y}" r="14" fill="none" stroke="#FF9800" stroke-width="2.5" stroke-dasharray="5 3"/>
        <text x="${BL_BADGE.x}" y="${BL_BADGE.y + 5}" font-size="14" fill="#FF9800" font-weight="bold" text-anchor="middle">4</text>

        <!-- Pot plant in the corner (BL) -->
        <g transform="translate(${BL.x + 5}, ${BL.y - 5})">
          <!-- Pot -->
          <path d="M -12 -2 L -10 12 L 10 12 L 12 -2 Z" fill="#C68642" stroke="#A0522D" stroke-width="1.5"/>
          <rect x="-14" y="-5" width="28" height="5" rx="2" fill="#A0522D"/>
          <!-- Plant leaves -->
          <ellipse cx="0" cy="-18" rx="12" ry="10" fill="#66BB6A" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="-10" cy="-12" rx="9" ry="7" fill="#81C784" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="10" cy="-12" rx="9" ry="7" fill="#81C784" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="-6" cy="-22" rx="7" ry="6" fill="#A5D6A7" stroke="#66BB6A" stroke-width="1"/>
          <ellipse cx="6" cy="-22" rx="7" ry="6" fill="#A5D6A7" stroke="#66BB6A" stroke-width="1"/>
        </g>

        <!-- Horizontal distance measure below the room -->
        <line x1="30" y1="${BL.y + 18}" x2="${BL_BADGE.x}" y2="${BL.y + 18}" stroke="#FF9800" stroke-width="1.5"/>
        <line x1="30" y1="${BL.y + 12}" x2="30" y2="${BL.y + 24}" stroke="#FF9800" stroke-width="1.5"/>
        <line x1="${BL_BADGE.x}" y1="${BL.y + 12}" x2="${BL_BADGE.x}" y2="${BL.y + 24}" stroke="#FF9800" stroke-width="1.5"/>
        <text x="${(30 + BL_BADGE.x) / 2}" y="${BL.y + 32}" font-size="9" fill="#FF9800" text-anchor="middle" font-weight="500">65cm</text>

        <!-- Corner 1: front-left -->
        <circle cx="${TL.x}" cy="${TL.y}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${TL.x}" cy="${TL.y}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${TL.x}" y="${TL.y + 5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">1</text>

        <!-- Corner 2: front-right (sensor here) -->
        <circle cx="${TR.x}" cy="${TR.y}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${TR.x}" cy="${TR.y}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${TR.x}" y="${TR.y + 5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">2</text>

        <!-- Corner 3: back-right -->
        <circle cx="${BR.x}" cy="${BR.y}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${BR.x}" cy="${BR.y}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${BR.x}" y="${BR.y + 5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

        <!-- Sensor icon outside the top-right corner -->
        <g transform="translate(${TR.x + 18}, ${TR.y - 18}) rotate(-45)">
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="var(--primary-color, #03a9f4)"/>
          <circle cx="0" cy="-11" r="3.5" fill="var(--primary-color, #03a9f4)" opacity="0.4"/>
        </g>
        <text x="${TR.x + 24}" y="${TR.y - 24}" font-size="10" fill="var(--primary-color, #03a9f4)" font-weight="500">${this.localize("wizard.sensor")}</text>
      </svg>
    `;

		return html`
      <div style="max-width: 560px; margin: 0 auto;">
        <div class="setting-group">
          <h4 style="text-align: center; margin-bottom: var(--epp-space-4, 16px);">${this.localize("wizard.how_calibration_works")}</h4>

          ${roomDiagram}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: var(--epp-space-4, 16px) 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: var(--epp-font-xs, 12px); font-weight: bold; color: white;">1</div>
              <div style="font-size: var(--epp-font-sm, 13px);">
                ${unsafeHTML(this.localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: var(--epp-font-xs, 12px); font-weight: bold; color: white;">!</div>
              <div style="font-size: var(--epp-font-sm, 13px);">
                ${unsafeHTML(this.localize("wizard.cant_reach"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 20px; color: var(--primary-color); flex-shrink: 0; margin-top: 1px;"></ha-icon>
              <div style="font-size: var(--epp-font-sm, 13px); color: var(--secondary-text-color, #757575);">
                ${this.localize("wizard.corner_sensor_hint")}
              </div>
            </div>
          </div>
        </div>

        <ha-formfield class="dont-show-again" .label=${this.localize("wizard.dont_show_again")}>
          <ha-checkbox
            .checked=${this._dismissTutorial}
            @change=${(e: Event) => {
							this._dismissTutorial = (e.currentTarget as any).checked;
						}}
          ></ha-checkbox>
        </ha-formfield>

        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          <epp-button variant="text"
            @click=${() => {
							this._fireCancel();
						}}
          >${this.localize("common.cancel")}</epp-button>
          <epp-button variant="primary"
            @click=${() => this._onBeginMarking()}
          >${this.localize("wizard.begin_marking")}</epp-button>
        </div>
      </div>
    `;
	}

	_renderWizardCorners() {
		const idx = this._wizardCornerIndex;
		const activeRaw = this.rawTargets.filter(
			(t) => t.raw_x != null && t.raw_y != null,
		);
		const hasTarget = activeRaw.length > 0;
		const tooManyTargets = activeRaw.length > 1;
		const allMarked = this._wizardCorners.every((c) => c !== null);
		const label = CORNER_LABELS[idx] || "";
		const [sideLabel, fbLabel] = CORNER_OFFSET_LABELS[idx] || ["", ""];

		return html`
      <div class="wizard-card">
        <h2>${this.localize("wizard.calibrate_room_size")}</h2>
        <p>
          ${this.localize("wizard.walk_instruction", { duration: CAPTURE_DURATION_S })}
        </p>

        ${
					allMarked
						? nothing
						: html`
            <p class="corner-instruction">
              ${this.localize("wizard.corner_step", { index: idx + 1, corner: this.localize(label) })}
            </p>
        `
				}

        <div class="corner-progress">
          ${CORNER_LABELS.map((name, i) => {
						const done = !!this._wizardCorners[i];
						const active = i === idx;
						const showArrow = i < 3;
						const arrowDone = i < idx;
						return html`
                <span
                  class="corner-chip ${done ? "done" : ""} ${active ? "active" : ""}"
                  @click=${() => {
										const prev = this._wizardCorners[i];
										this._wizardCornerIndex = i;
										this._wizardCorners = [...this._wizardCorners];
										this._wizardCorners[i] = null;
										// Re-marking a corner invalidates any previously
										// computed perspective and stale save errors.
										this._perspective = null;
										this._saveError = null;
										this._wizardOffsetSide = prev?.offset_side
											? String(prev.offset_side / 10)
											: "";
										this._wizardOffsetFb = prev?.offset_fb
											? String(prev.offset_fb / 10)
											: "";
									}}
                >
                  ${this.localize(name)} ${done ? "\u2713" : ""}
                </span>
                ${
									showArrow
										? html`
                  <span class="corner-arrow ${arrowDone ? "done" : ""}">›</span>
                `
										: nothing
								}
              `;
					})}
        </div>

        <div class="corner-offsets">
          <span class="offset-label">${this.localize("wizard.distance_from")}</span>
          <div class="offset-inputs">
            <epp-field
            class="offset-input"
            type="number"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side", { wall: this.localize(sideLabel) })}"
            .value=${this._wizardOffsetSide}
            @value-changed=${(e: CustomEvent) => {
							e.stopPropagation();
							this._wizardOffsetSide = e.detail.value;
							const val = 10 * (parseFloat(this._wizardOffsetSide) || 0);
							const corner = this._wizardCorners[idx];
							if (corner) {
								corner.offset_side = val;
								this._recomputeDimsIfAllMarked();
							}
						}}
          ></epp-field>
          <epp-field
            class="offset-input"
            type="number"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side", { wall: this.localize(fbLabel) })}"
            .value=${this._wizardOffsetFb}
            @value-changed=${(e: CustomEvent) => {
							e.stopPropagation();
							this._wizardOffsetFb = e.detail.value;
							const val = 10 * (parseFloat(this._wizardOffsetFb) || 0);
							const corner = this._wizardCorners[idx];
							if (corner) {
								corner.offset_fb = val;
								this._recomputeDimsIfAllMarked();
							}
						}}
          ></epp-field>
          </div>
        </div>

        ${this._renderMiniSensorView()}

        ${
					!allMarked
						? html`
          <p class="no-target-warning" style="visibility: ${!hasTarget || tooManyTargets ? "visible" : "hidden"};">
            ${
							!hasTarget
								? this.localize("wizard.no_target")
								: this.localize("wizard.multiple_targets")
						}
          </p>
        `
						: html`
          <p style="font-size: var(--epp-font-sm, 13px); color: var(--secondary-text-color); margin: var(--epp-space-3, 12px) 0 4px;">
            ${this.localize("wizard.save_prompt")}
          </p>
        `
				}

        ${
					this._saveError !== null
						? html`<p class="save-error" role="alert">${this.localize(this._saveError)}</p>`
						: nothing
				}

        <div class="wizard-actions">
          <epp-button
            variant="text"
            @click=${() => {
							this._fireCancel();
						}}
          >${this.localize("common.cancel")}</epp-button>
          ${
						allMarked
							? html`
            <epp-button
              variant="primary"
              ?disabled=${this._wizardSaving}
              @click=${() => this._wizardFinish()}
            >
              ${this._wizardSaving ? this.localize("common.saving") : this.localize("common.save")}
            </epp-button>
          `
							: html`
            <epp-button
              variant="primary"
              ?disabled=${!hasTarget || tooManyTargets || this._wizardCapturing}
              @click=${() => this._wizardStartCapture()}
            >
              ${this.localize("wizard.mark_corner", { corner: this.localize(label) })}
            </epp-button>
          `
					}
        </div>
      </div>
    `;
	}

	/** Sensor FOV view showing raw target positions during corner marking */
	_renderMiniSensorView() {
		// SVG uses real mm coordinates: sensor at (0,0), FOV opens downward
		const halfX = FOV_X_EXTENT; // ~5196
		const R = MAX_RANGE; // 6000
		const pad = 200; // small padding

		// FOV edge points at max range
		const lx = -halfX,
			ly = R * Math.cos(FOV_HALF_ANGLE); // (-5196, 3000)
		const rx = halfX,
			ry = ly; // (5196, 3000)

		// FOV wedge with arc: sensor -> left edge -> arc to right edge -> close
		const fovPath = `M 0 0 L ${lx} ${ly} A ${R} ${R} 0 0 0 ${rx} ${ry} Z`;

		// Range ring arcs (2m and 4m)
		const ringPaths = [2000, 4000].map((r) => {
			const ex = r * Math.sin(FOV_HALF_ANGLE);
			const ey = r * Math.cos(FOV_HALF_ANGLE);
			return `M ${-ex} ${ey} A ${r} ${r} 0 0 0 ${ex} ${ey}`;
		});

		return html`
      <div class="mini-grid-container">
        <div class="sensor-fov-view">
          <svg
            class="sensor-fov-svg"
            viewBox="${-halfX - pad} ${-pad} ${halfX * 2 + pad * 2} ${R + pad * 2}"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="${fovPath}"
              fill="rgba(3, 169, 244, 0.10)"
              stroke="rgba(3, 169, 244, 0.3)"
              stroke-width="30"
            />
            ${ringPaths.map(
							(d) => svg`
                <path
                  d="${d}"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  stroke-width="40"
                  stroke-dasharray="80 80"
                />
              `,
						)}
            <!-- Sensor dot -->
            <circle cx="0" cy="0" r="100" fill="var(--primary-color, #03a9f4)" stroke="#fff" stroke-width="40" />
          </svg>
          <!-- Marked corners (positioned via CSS %). Map over ALL corners and
               skip nulls so each dot keeps its ORIGINAL corner index — a
               filter+map would shift labels when an earlier corner is being
               re-marked. -->
          ${this._wizardCorners.map((c, i) => {
						if (c === null) return nothing;
						const { xPct, yPct } = rawToFovPct(c.raw_x, c.raw_y);
						return html`
                <div
                  class="mini-grid-captured"
                  style="left: ${xPct}%; top: ${yPct}%;"
                  title="${this.localize(CORNER_LABELS[i])}"
                ></div>
              `;
					})}
          <!-- Live targets (per-target colors) -->
          ${this.rawTargets.map((t, i) =>
						t.raw_x != null && t.raw_y != null
							? html`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(t)} background: ${TARGET_COLORS[i] || TARGET_COLORS[0]};"
              ></div>
            `
							: nothing,
					)}
        </div>
      </div>
    `;
	}

	_renderUncalibratedFov() {
		const occupied = this.sensorState.occupancy;
		const fovColor = occupied ? "#4CAF50" : "var(--primary-color, #03a9f4)";
		// 120 deg FOV centered at 90 deg (pointing down), +/-60 deg
		const cx = 160,
			cy = 14,
			maxR = 180;
		const a1 = ((90 - 60) * Math.PI) / 180; // 30 deg
		const a2 = ((90 + 60) * Math.PI) / 180; // 150 deg
		const ex1 = cx + maxR * Math.cos(a1),
			ey1 = cy + maxR * Math.sin(a1);
		const ex2 = cx + maxR * Math.cos(a2),
			ey2 = cy + maxR * Math.sin(a2);

		return html`
      <div style="display: flex; flex-direction: column; align-items: center; padding: var(--epp-space-5, 24px);">
        <svg viewBox="0 0 320 210" width="320" height="210" style="display: block;">
          <!-- Sensor at top center -->
          <rect x="${cx - 6}" y="0" width="12" height="8" rx="3" fill="${fovColor}"/>
          <circle cx="${cx}" cy="0" r="4" fill="${fovColor}" opacity="0.4"/>

          <!-- 120 deg FOV wedge with rounded arc end -->
          <path d="M ${cx} ${cy} L ${ex1} ${ey1} A ${maxR} ${maxR} 0 0 1 ${ex2} ${ey2} Z"
                fill="${fovColor}" fill-opacity="${occupied ? 0.15 : 0.06}"
                stroke="${fovColor}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60, 120, 180].map((r) => {
						const x1 = cx + r * Math.cos(a1),
							y1 = cy + r * Math.sin(a1);
						const x2 = cx + r * Math.cos(a2),
							y2 = cy + r * Math.sin(a2);
						return svg`
              <path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}"
                    fill="none" stroke="${fovColor}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `;
					})}

          <!-- Edge lines -->
          <line x1="${cx}" y1="${cy}" x2="${ex1}" y2="${ey1}" stroke="${fovColor}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${cx}" y1="${cy}" x2="${ex2}" y2="${ey2}" stroke="${fovColor}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this.rawTargets.map((t, i) => {
						if (t.raw_x == null || t.raw_y == null) return nothing;
						// Polar mapping: convert raw x/y to true angle + distance
						const dist = Math.sqrt(t.raw_x * t.raw_x + t.raw_y * t.raw_y);
						const angle = Math.atan2(t.raw_x, t.raw_y);
						const r = Math.min(dist / 6000, 1) * maxR;
						const svgAngle = Math.PI / 2 - angle;
						const tx = cx + r * Math.cos(svgAngle);
						const ty = cy + r * Math.sin(svgAngle);
						return svg`<circle cx="${tx}" cy="${ty}" r="5" fill="${TARGET_COLORS[i] || TARGET_COLORS[0]}"/>`;
					})}

          ${
						occupied
							? svg`
            <text x="${cx}" y="120" font-size="13" fill="${fovColor}" text-anchor="middle" font-weight="500">${this.localize("live.detected")}</text>
          `
							: svg`
            <text x="${cx}" y="120" font-size="13" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.no_presence")}</text>
          `
					}
        </svg>

        <epp-button
          variant="primary"
          icon="mdi:target"
          style="margin-top: var(--epp-space-4, 16px);"
          @click=${() => {
						this._fireStartCalibration();
					}}
        >${this.localize("wizard.calibrate_room_size")}</epp-button>
      </div>
    `;
	}

	private _fireStartCalibration(): void {
		this.dispatchEvent(
			new CustomEvent("start-calibration", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireDismissTutorial(): void {
		this.dispatchEvent(
			new CustomEvent("dismiss-tutorial", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _onBeginMarking(): void {
		if (this._dismissTutorial) this._fireDismissTutorial();
		this._setupStep = "corners";
		this.dispatchEvent(
			new CustomEvent("begin-corners", { bubbles: true, composed: true }),
		);
	}

	private _fireCancel(): void {
		this._setupStep = null;
		this._wizardCorners = [null, null, null, null];
		this._wizardCornerIndex = 0;
		this._wizardOffsetSide = "";
		this._wizardOffsetFb = "";
		this._perspective = null;
		this._saveError = null;
		this.dispatchEvent(
			new CustomEvent("wizard-cancel", {
				bubbles: true,
				composed: true,
			}),
		);
	}
}

if (!customElements.get("epp-wizard")) {
	customElements.define("epp-wizard", EppWizard);
}
