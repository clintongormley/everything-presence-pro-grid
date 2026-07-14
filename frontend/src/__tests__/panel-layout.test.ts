import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import {
	type EPPGridPanel,
	layoutStyles,
	panelStyles,
} from "../eppgrid-panel.js";
import "../eppgrid-panel.js";
import "../components/epp-live-sidebar.js";
import "../components/epp-zone-sidebar.js";
import "../components/epp-furniture-sidebar.js";
import "../components/epp-settings-view.js";
import "../components/epp-wizard.js";
import "../components/epp-grid.js";
import { GRID_CELL_COUNT } from "../lib/grid.js";
import { createZoneEngineState } from "../lib/zone-engine.js";

function createPanel(): EPPGridPanel {
	const el = document.createElement("eppgrid-panel") as EPPGridPanel;
	el.hass = {
		callWS: vi.fn().mockResolvedValue({}),
		connection: { subscribeMessage: vi.fn().mockResolvedValue(() => {}) },
	};
	const a = el as any;
	a._grid = new Uint8Array(GRID_CELL_COUNT);
	a._zoneConfigs = [
		{ type: "default", trigger: 5, renew: 3, timeout: 10, handoff_timeout: 3 },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
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
	a._navGuard._pendingNavigation = null;
	a._saving = false;
	a._showDeleteCalibrationDialog = false;
	a._showConfigurationBackup = false;
	a._showConfigurationRestore = false;
	a._reportingConfig = {};
	a._offsetsConfig = {};
	a._targetAutoRange = true;
	a._targetMaxDistance = 6;
	a._staticAutoRange = true;
	a._staticMinDistance = 0.3;
	a._staticMaxDistance = 16;
	// Zone 0 defaults live on _zoneConfigs[0]; set up above.
	a._zoneEngineState = createZoneEngineState();
	a._showCustomIconPicker = false;
	a._customIconValue = "";
	a._isPainting = false;
	a._frozenBounds = null;
	a._sidebarTab = "zones";
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
	a._configurationName = "";
	a._fovCache = null;
	a._fovPerspective = null;
	return el;
}

describe("layout styles", () => {
	const layoutCss = layoutStyles.cssText;

	it("live-controls side-panel has a fixed width (no squeezing)", () => {
		// The live overview's epp-sheet.live-controls is sized by
		// .editor-shell > .live-controls { flex: 0 0 360px } — the flex shorthand
		// sets flex-shrink:0 implicitly. Verify the rule exists.
		const match = layoutCss.match(
			/\.editor-shell\s*>\s*\.live-controls\s*\{([^}]*flex:[^}]*)\}/,
		);
		expect(match).not.toBeNull();
		const rule = match![1];
		expect(rule).toMatch(/flex:\s*0\s+0\s+360px/);
	});

	it("live-controls side-panel rule does not set overflow: hidden", () => {
		// The live-controls rule must not clip overflow (kebab menus would be cut off).
		const match = layoutCss.match(
			/\.editor-shell\s*>\s*\.live-controls\s*\{([^}]*flex:[^}]*)\}/,
		);
		expect(match).not.toBeNull();
		const rule = match![1];
		expect(rule).not.toMatch(/overflow:\s*hidden/);
	});

	it("grid-column constrains width to grid via max-width: min-content", () => {
		// Match the base rule, identified by min-width. The mobile width cap is
		// applied via the higher-specificity .editor-shell > .grid-column rule
		// inside the @media block (not a bare .grid-column override).
		const match = layoutCss.match(/\.grid-column\s*\{([^}]*min-width[^}]*)\}/);
		expect(match).not.toBeNull();
		const gridColCss = match![1];
		expect(gridColCss).toMatch(/min-width:\s*0/);
		expect(gridColCss).toMatch(/max-width:\s*min-content/);
		// No overflow:hidden — would clip furniture resize/rotate handles
		expect(gridColCss).not.toMatch(/overflow:\s*hidden/);
	});

	it("epp-sheet body provides scrollable content area (overflow-y: auto in shadow)", () => {
		// The live overview's epp-sheet.live-controls owns scrolling through its
		// shadow-DOM .body { overflow-y: auto } — verified in epp-sheet's own tests.
		// Here we just confirm layoutStyles no longer ships a .sidebar-scroll rule
		// (which would double-scroll if it were still present alongside epp-sheet).
		expect(layoutCss).not.toMatch(/\.sidebar-scroll\s*\{/);
	});

	it("layout mobile overrides come after their base rules (cascade order)", () => {
		// Media queries add NO specificity; at equal specificity the LATER rule in
		// the concatenated cssText wins. The mobile @media (max-width: 819px) block
		// must come after the base .grid-column (max-width:min-content) declaration
		// — otherwise the base wins and the grid overflows on phones.
		const gridColBaseIdx = layoutCss.indexOf("min-content");
		const mediaIdx = layoutCss.indexOf("@media (max-width: 819px)");

		expect(gridColBaseIdx).toBeGreaterThan(-1);
		expect(mediaIdx).toBeGreaterThan(-1);
		expect(mediaIdx).toBeGreaterThan(gridColBaseIdx);
	});

	it("mobile .editor-shell > .grid-column caps width to 100% (at winning specificity)", () => {
		// The base .editor-shell > .grid-column sets max-width: none for desktop.
		// The mobile override must apply max-width: 100% at the same specificity
		// (0,2,0) inside the @media block so the cap actually wins — a bare
		// .grid-column rule (0,1,0) would be overridden by the desktop scoped rule.
		const mq = layoutCss.slice(layoutCss.indexOf("@media (max-width: 819px)"));
		const scopedRuleStart = mq.indexOf(".editor-shell > .grid-column");
		expect(scopedRuleStart).toBeGreaterThan(-1);
		const scopedRule = mq.slice(
			scopedRuleStart,
			mq.indexOf("}", scopedRuleStart),
		);
		expect(scopedRule).toMatch(/max-width:\s*100%/);
	});

	it("editor-shell is a two-track grid row at desktop width", () => {
		// Desktop uses CSS grid (not flex): a minmax(0,1fr) grid column + a fixed
		// 360px controls track. A reserved TRACK keeps the grid column's width
		// stable across the editor↔live swap. Target the base ".editor-shell {"
		// rule specifically — not the ".editor-shell .grid-container" card rule
		// nor the mobile @media override that resets to flex-column.
		const css = layoutStyles.cssText;
		const idx = css.indexOf(".editor-shell {");
		expect(idx).toBeGreaterThan(-1);
		const shell = css.slice(idx, css.indexOf("}", idx));
		expect(shell).toMatch(/display:\s*grid/);
		expect(shell).toMatch(
			/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+360px/,
		);
	});

	it("editor grid-column overrides the min-content cap so it can grow", () => {
		// The base .grid-column rule has max-width: min-content (keeps the live
		// overview tight). The .editor-shell > .grid-column rule must override that
		// with max-width: none so the grid column actually fills the minmax(0,1fr)
		// grid track on desktop.
		const css = layoutStyles.cssText;
		const rule = css.slice(css.indexOf(".editor-shell > .grid-column"));
		expect(rule).toContain("max-width: none");
	});

	it("grid-column owns its own scroll so the detection log stays reachable (#338)", () => {
		// .tab-layout > .panel.panel--grid is deliberately overflow:hidden to bound
		// the grid-hero panel to the viewport (so the sidebar sheet scrolls
		// internally rather than the whole page growing). But the detection-events
		// log lives inside .grid-column, below the grid card — NOT inside the
		// sheet. With nothing between the log and the clipped panel able to
		// scroll, expanding the log grows .grid-column past the viewport and it
		// becomes permanently unreachable (measured live: 94px clipped, zero
		// scrollable ancestors in the chain). overflow-y:auto only takes effect
		// paired with min-height:0 — without it a flex item's default min-height
		// is its content size, so it never shrinks enough to need its own
		// scrollbar. Keep both; do not "simplify" this back to one property.
		const css = layoutStyles.cssText;
		const idx = css.indexOf(".editor-shell > .grid-column");
		expect(idx).toBeGreaterThan(-1);
		const rule = css.slice(idx, css.indexOf("}", idx));
		expect(rule).toMatch(/overflow-y:\s*auto/);
		expect(rule).toMatch(/min-height:\s*0/);
	});

	it("editor-shell stacks to a column below the breakpoint", () => {
		const css = layoutStyles.cssText;
		const mq = css.slice(css.indexOf("@media (max-width: 819px)"));
		expect(mq).toContain(".editor-shell");
		expect(mq).toMatch(/flex-direction:\s*column/);
	});

	it("mobile .panel sets min-width: 0 to drop the flex min-content floor", () => {
		// Bug 1: :host is display:flex; .panel is its flex item, defaulting to
		// min-width:auto → floored at the grid's min-content (~maxGridPx), which
		// overflows a narrow phone. The fix adds min-width:0 to the .panel rule
		// inside the mobile @media (max-width: 819px) block so .panel shrinks to
		// the viewport. happy-dom can't evaluate flex layout, so this is a
		// lightweight cssText guard: the min-width:0 must live AFTER the mobile
		// media-query marker (i.e. inside that block, not the base .panel rule).
		const panelCss = panelStyles.cssText;
		const mediaIdx = panelCss.indexOf("@media (max-width: 819px)");
		const minWidthIdx = panelCss.indexOf("min-width: 0");
		expect(mediaIdx).toBeGreaterThan(-1);
		expect(minWidthIdx).toBeGreaterThan(mediaIdx);
	});

	it("panel--grid drops the reading-column cap so grid-hero views fill the width", () => {
		// The editor + live overview carry .panel--grid to opt out of the 1100px
		// centered .panel max-width. CRITICAL: it must also drop the auto side
		// margins (margin:0) and stretch — auto margins on a flex item disable
		// align-items:stretch, so the panel would shrink-wrap and starve the grid.
		const css = panelStyles.cssText;
		const idx = css.indexOf(".panel.panel--grid");
		expect(idx).toBeGreaterThan(-1);
		const rule = css.slice(idx, css.indexOf("}", idx));
		expect(rule).toMatch(/max-width:\s*none/);
		expect(rule).toMatch(/margin:\s*0/);
		expect(rule).toMatch(/align-self:\s*stretch/);
	});

	it("non-grid panels fill width on desktop so settings is a stable fixed width", () => {
		// `.panel { margin: 0 auto }` on a flex item of the column `.tab-layout`
		// disables align-items:stretch, so a plain panel shrink-wraps to its content
		// width. Settings then started narrow and widened when an accordion expanded
		// (its widest control drove the panel width). `width: 100%` (box-sizing:
		// border-box, so the 24px padding folds in rather than overflowing) pins
		// non-grid panels to the host width, so the inner `.settings-container` caps
		// at its fixed max-width regardless of accordion state. `.panel--grid` is
		// excluded — grid-hero views already fill via align-self:stretch +
		// max-width:none. Mobile already does this; this brings desktop in line.
		const css = panelStyles.cssText;
		const m = css.match(/\.panel:not\(\.panel--grid\)\s*\{([^}]*)\}/);
		expect(m).not.toBeNull();
		expect(m![1]).toMatch(/width:\s*100%/);
		expect(m![1]).toMatch(/box-sizing:\s*border-box/);
	});

	it("grid-hero panel is height-bounded so the sidebar sheet scrolls, not the page", () => {
		// On desktop the grid-hero panel must be a bounded flex column so a tall
		// zone list / furniture browser scrolls inside the epp-sheet body (and
		// Save/Cancel pin to the bottom) rather than growing the panel so the whole
		// page scrolls. Verify the height-bounding chain: .panel--grid is a
		// min-height:0 flex column, the editor-shell fills it (flex:1) and can shrink
		// (min-height:0), and the controls track can shrink (min-height:0) so the
		// sheet's own .body{overflow-y:auto} / .actions{flex-shrink:0} take over.
		const pcss = panelStyles.cssText;
		const gridIdx = pcss.indexOf(".panel.panel--grid");
		const gridRule = pcss.slice(gridIdx, pcss.indexOf("}", gridIdx));
		expect(gridRule).toMatch(/flex-direction:\s*column/);
		expect(gridRule).toMatch(/min-height:\s*0/);

		const lcss = layoutStyles.cssText;
		const shellIdx = lcss.indexOf(".editor-shell {");
		const shellRule = lcss.slice(shellIdx, lcss.indexOf("}", shellIdx));
		expect(shellRule).toMatch(/flex:\s*1/);
		expect(shellRule).toMatch(/min-height:\s*0/);

		const ctrlIdx = lcss.indexOf(".editor-shell > .editor-controls");
		const ctrlRule = lcss.slice(ctrlIdx, lcss.indexOf("}", ctrlIdx));
		expect(ctrlRule).toMatch(/min-height:\s*0/);
	});

	it("settings panel is height-bounded so the list scrolls + Save/Cancel pins", () => {
		// Like the grid-hero panel, the settings panel (.panel--settings) is a bounded
		// flex column so the settings view fills it — the accordion list scrolls inside
		// .settings-scroll and Save/Cancel pins, instead of the page scrolling. Scoped
		// to .panel--settings (not every plain panel) so wizard/loading keep natural flow.
		const pcss = panelStyles.cssText;
		const idx = pcss.indexOf(".panel--settings {");
		expect(idx).toBeGreaterThan(-1);
		const rule = pcss.slice(idx, pcss.indexOf("}", idx));
		expect(rule).toMatch(/flex-direction:\s*column/);
		expect(rule).toMatch(/min-height:\s*0/);
		// The settings view fills the .settings-stage (a relative wrapper below the
		// header that also hosts the connection-banner overlay).
		const svIdx = pcss.indexOf(".settings-stage > epp-settings-view");
		const svRule = pcss.slice(svIdx, pcss.indexOf("}", svIdx));
		expect(svRule).toMatch(/flex:\s*1/);
		const stageIdx = pcss.indexOf(".panel--settings .settings-stage");
		const stageRule = pcss.slice(stageIdx, pcss.indexOf("}", stageIdx));
		expect(stageRule).toMatch(/position:\s*relative/);
		// The status banner overlays (covers + disables) the settings view.
		const ovIdx = pcss.indexOf(".settings-stage > .protocol-fullpage");
		const ovRule = pcss.slice(ovIdx, pcss.indexOf("}", ovIdx));
		expect(ovRule).toMatch(/position:\s*absolute/);
	});

	it("calibrate/tutorial wizard overlays the connection banner like the settings stage", () => {
		// Like .settings-stage, .wizard-stage overlays the connection banner
		// instead of stacking it as a block/flex sibling — .panel becomes a
		// flex column on mobile, where a plain sibling's flex:1 would steal
		// space from <epp-wizard> (no flex of its own) and clip it. Room
		// calibration is typically done on a phone, so the wizard must stay
		// fully visible (#336).
		const pcss = panelStyles.cssText;
		const stageIdx = pcss.indexOf(".wizard-stage {");
		expect(stageIdx).toBeGreaterThan(-1);
		const stageRule = pcss.slice(stageIdx, pcss.indexOf("}", stageIdx));
		expect(stageRule).toMatch(/position:\s*relative/);
		expect(stageRule).toMatch(/display:\s*flex/);
		expect(stageRule).toMatch(/flex-direction:\s*column/);

		const wizardIdx = pcss.indexOf(".wizard-stage > epp-wizard");
		const wizardRule = pcss.slice(wizardIdx, pcss.indexOf("}", wizardIdx));
		expect(wizardRule).toMatch(/flex:\s*1/);
		expect(wizardRule).toMatch(/min-height:\s*0/);

		const ovIdx = pcss.indexOf(".wizard-stage > .protocol-fullpage");
		const ovRule = pcss.slice(ovIdx, pcss.indexOf("}", ovIdx));
		expect(ovRule).toMatch(/position:\s*absolute/);
	});

	it("desktop frames the grid in an expansion-area card, reset on mobile", () => {
		// .editor-shell .grid-container gets a themed surface + border on desktop
		// (shows the area the grid can expand into; the log lines up with its left
		// edge). The mobile @media resets it to none — the grid fills the screen.
		const css = layoutStyles.cssText;
		const cardIdx = css.indexOf(".editor-shell .grid-container");
		expect(cardIdx).toBeGreaterThan(-1);
		const cardRule = css.slice(cardIdx, css.indexOf("}", cardIdx));
		expect(cardRule).toMatch(/background:/);
		expect(cardRule).toMatch(/border:/);
		// The reset lives inside the mobile @media block (after its marker).
		const mediaIdx = css.indexOf("@media (max-width: 819px)");
		const resetIdx = css.indexOf(".editor-shell .grid-container", mediaIdx);
		expect(mediaIdx).toBeGreaterThan(-1);
		expect(resetIdx).toBeGreaterThan(mediaIdx);
	});

	it("sizes the mobile sidebar sub-tabs to the panel's touch-target control height", () => {
		// The zones/overlays/furniture sub-tabs are hand-rolled <button class="sidebar-tab">,
		// not epp-* primitives, so they don't inherit the panel's mobile 44px control
		// height on their own (the base rule is ~32px from padding + font). On mobile the
		// panel sets --epp-control-height:44px on :host (panelStyles), so the tabs opt in
		// via min-height to match every other mobile control and meet the touch-target
		// goal. The override must live inside the mobile @media (after the base rule) so
		// it wins.
		const css = layoutStyles.cssText;
		const mediaIdx = css.indexOf("@media (max-width: 819px)");
		expect(mediaIdx).toBeGreaterThan(-1);
		const tabIdx = css.indexOf(".sidebar-tabs .sidebar-tab {", mediaIdx);
		expect(tabIdx).toBeGreaterThan(mediaIdx);
		const tabRule = css.slice(tabIdx, css.indexOf("}", tabIdx));
		expect(tabRule).toMatch(/min-height:\s*var\(--epp-control-height/);
	});

	it("separates the heatmap toggle from the grid card with a top margin", () => {
		// The heatmap toggle (<epp-toggle class="heatmap-toggle">) is rendered
		// directly below the bordered .grid-container card in the grid column, which
		// has no flex gap. Without a margin the toggle touches the card's bounding
		// box. It gets a top margin (spacing token, not a hardcoded px) so it
		// breathes. Both the live overview and the editor render the same class, so
		// a single rule covers both views.
		const match = layoutCss.match(/\.heatmap-toggle\s*\{([^}]*)\}/);
		expect(match).not.toBeNull();
		expect(match![1]).toMatch(/margin-top:\s*var\(--epp-space-/);
	});

	it("reserves the header height so the device picker can't collapse on the swap", () => {
		// Root cause of the desktop live↔editor swap flicker: the .panel-header holds
		// an <ha-select> whose 56px field renders asynchronously (the element is 0px
		// tall until it upgrades). The swap rebuilds the header from scratch, so for
		// the first few microtasks it is 0px — and epp-grid's _measureAvail() runs in
		// that window, reading its viewport `top` 56px too high and latching an
		// inflated available-height (innerHeight − top − reserve). The width-only
		// ResizeObserver never re-measures it, so a height-bound grid renders oversized
		// then snaps back: the flicker. A min-height reserve equal to the ha-select's
		// steady height keeps `top` stable from first paint, so the measurement is
		// correct immediately. (Desktop-only: mobile caps height to the viewport, not
		// `top`.)
		//
		// CRITICAL: .panel-header is declared in BOTH panelStyles and headerStyles.
		// At equal specificity the LAST sheet in the panel's `static styles` array
		// wins (headerStyles, applied after panelStyles), so the reserve MUST live on
		// that winning rule — putting it on the earlier one is silently overridden.
		// Compose the real styles array in order and assert the FINAL bare
		// ".panel-header {" rule (not ".panel-header ha-select") carries the reserve.
		const styles = (
			customElements.get("eppgrid-panel") as typeof HTMLElement & {
				styles: { cssText: string }[];
			}
		).styles;
		const allCss = styles.map((s) => s.cssText).join("\n");
		const re = /\.panel-header\s*\{([^}]*)\}/g;
		let m: RegExpExecArray | null;
		let winning: string | null = null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
		while ((m = re.exec(allCss)) !== null) winning = m[1];
		expect(winning).not.toBeNull();
		expect(winning!).toMatch(/min-height:\s*56px/);
	});
});

describe("live overview layout structure", () => {
	it("left column uses grid-column class inside editor-shell", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		const result = a._renderLiveOverview();

		// Render to a temp container to inspect DOM
		const container = document.createElement("div");
		render(result, container);

		const editorShell = container.querySelector(".editor-shell");
		expect(editorShell).not.toBeNull();
		const leftCol = editorShell!.firstElementChild as HTMLElement;
		expect(leftCol.classList.contains("grid-column")).toBe(true);
	});

	it("left column does not use inline min-width style", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		const result = a._renderLiveOverview();

		const container = document.createElement("div");
		render(result, container);

		const editorShell = container.querySelector(".editor-shell");
		const leftCol = editorShell!.firstElementChild as HTMLElement;
		// Should use CSS class, not inline style
		expect(leftCol.style.minWidth).toBe("");
	});

	it("sidebar content is inside epp-sheet.live-controls (shared card shell)", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "live";
		const result = a._renderLiveOverview();

		const container = document.createElement("div");
		render(result, container);

		// Old .zone-sidebar/.sidebar-scroll structure is replaced by epp-sheet.
		expect(container.querySelector(".zone-sidebar")).toBeNull();
		expect(container.querySelector(".sidebar-scroll")).toBeNull();
		const sheet = container.querySelector("epp-sheet.live-controls");
		expect(sheet).not.toBeNull();
		// The live sidebar component is slotted directly into the sheet body.
		expect(sheet!.querySelector("epp-live-sidebar")).not.toBeNull();
	});
});

describe("editor layout structure", () => {
	it("left column uses grid-column class", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		const result = a._renderEditor();

		const container = document.createElement("div");
		render(result, container);

		// Unified editor-shell replaces old .editor-layout.
		const editorShell = container.querySelector(".editor-shell");
		expect(editorShell).not.toBeNull();
		const leftCol = editorShell!.firstElementChild as HTMLElement;
		expect(leftCol.classList.contains("grid-column")).toBe(true);
	});

	it("sidebar content is rendered inside epp-sheet in the unified editor", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		const result = a._renderEditor();

		const container = document.createElement("div");
		render(result, container);

		// The old .zone-sidebar/.sidebar-scroll structure is replaced by epp-sheet.
		const sheet = container.querySelector("epp-sheet");
		expect(sheet).not.toBeNull();
		// Sidebar content (zones tab by default) is inside the sheet.
		expect(sheet!.querySelector("epp-zone-sidebar")).not.toBeNull();
	});

	it("grid-container click uses composedPath to detect furniture items", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		a._selectedFurnitureId = "test-id";

		const result = a._renderEditor();
		const container = document.createElement("div");
		render(result, container);

		const gridContainer = container.querySelector(
			".grid-container",
		) as HTMLElement;

		// Simulate a click whose composedPath includes a .furniture-item
		const furnitureItem = document.createElement("div");
		furnitureItem.classList.add("furniture-item");
		const clickEvent = new MouseEvent("click", { bubbles: true });
		Object.defineProperty(clickEvent, "composedPath", {
			value: () => [furnitureItem, gridContainer],
		});
		gridContainer.dispatchEvent(clickEvent);

		// Selection should NOT be cleared
		expect(a._selectedFurnitureId).toBe("test-id");
	});

	it("grid-container click clears selection when not on furniture", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "editor";
		a._sidebarTab = "furniture";
		a._selectedFurnitureId = "test-id";

		const result = a._renderEditor();
		const container = document.createElement("div");
		render(result, container);

		const gridContainer = container.querySelector(
			".grid-container",
		) as HTMLElement;

		// Simulate a click whose composedPath has no .furniture-item
		const cellDiv = document.createElement("div");
		cellDiv.classList.add("cell");
		const clickEvent = new MouseEvent("click", { bubbles: true });
		Object.defineProperty(clickEvent, "composedPath", {
			value: () => [cellDiv, gridContainer],
		});
		gridContainer.dispatchEvent(clickEvent);

		// Selection SHOULD be cleared
		expect(a._selectedFurnitureId).toBeNull();
	});
});

describe("setup wizard layout structure", () => {
	it("wraps wizard in .panel so content is centered like other views", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "tutorial";

		const result = a.render();
		const container = document.createElement("div");
		render(result, container);

		const panel = container.querySelector(".panel");
		expect(panel).not.toBeNull();
		const wizard = panel!.querySelector("epp-wizard");
		expect(wizard).not.toBeNull();
	});

	it("wizard header uses the panel device dropdown that shows area", () => {
		const el = createPanel();
		const a = el as any;
		a._view = "tutorial";
		a._devices = [
			{
				mac: "AA:BB:CC:DD:EE:01",
				name: "Grid",
				area: "Living Room",
				host: null,
				available: true,
				configured: true,
			},
		];
		a._selectedMac = "AA:BB:CC:DD:EE:01";

		const result = a.render();
		const container = document.createElement("div");
		render(result, container);

		const headers = container.querySelectorAll(".panel-header");
		expect(headers.length).toBe(1);
		const haSelect = headers[0].querySelector("ha-select") as any;
		expect(haSelect).not.toBeNull();
		expect(haSelect.options).toEqual([
			{ value: "AA:BB:CC:DD:EE:01", label: "Grid (Living Room)" },
		]);
	});
});
