// Real-layout regression test: an opened OTA-error message must be fully
// visible — never clipped by the list's 40vh scroll cap, and never covered by
// the next device row.
//
// History: the error text was first an absolute popover (clipped for a device
// at the TOP of the list), then moved in-flow "inside the row" via the row's
// flex-wrap. That in-flow bar had a subtler bug: flex-wrap does NOT grow the
// row to contain the wrapped detail, so the bar overflows its own row and the
// NEXT row's opaque background paints over it (reproduced with 7 devices, error
// on the top device — its message sliced off, "hidden below the div below it").
// The fix renders the detail as a SIBLING block in the flex-column list, right
// after its row, so the list reserves its space and no row can overlap it.
//
// Must run in a real browser: happy-dom has no layout engine, so every
// getBoundingClientRect() below is zero and the assertions pass vacuously on the
// bug as readily as on the fix. `npm run test:browser` runs it in Chromium.
import { page } from "@vitest/browser/context";
import { describe, expect, it } from "vitest";
import "../../components/epp-flasher-view.js";
import type { EppFlasherView } from "../../components/epp-flasher-view.js";
import { setupLocalize } from "../../localize.js";
import type { FlashableDevice } from "../../types.js";
import { registerPanelCleanup } from "../helpers/panel-cleanup.js";

const mounted: HTMLElement[] = [];
registerPanelCleanup(mounted);

// Render the *real* worst-case download-failure copy end-to-end: the actual
// `flasher.errors.ota_download_unreachable` string (via setupLocalize) with a
// device error interpolated in — so if that copy is ever lengthened past the
// 40vh fold, the visibility assertions below fail. DEVICE_ERR is the
// interpolated {message}; the shipped copy is kept concise enough to fit.
const ERR_KEY = "flasher.errors.ota_download_unreachable";
const DEVICE_ERR = "HTTP Request failed: ESP_ERR_HTTP_CONNECT";

function mkDevices(n: number): FlashableDevice[] {
	return Array.from({ length: n }, (_, i) => ({
		mac: `AA:BB:CC:DD:EE:0${i}`,
		name: `Sensor ${i + 1}`,
		host: `192.168.1.${10 + i}`,
		available: true,
		firmware_type: "eppgrid" as const,
		firmware_version: "1.5.0",
		esphome_config_entry_id: `entry-${i}`,
		update_available: true,
		firmware_status: "firmware_behind" as const,
	}));
}

async function settle(el: EppFlasherView): Promise<void> {
	await el.updateComplete;
	await new Promise((r) =>
		requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
	);
	await el.updateComplete;
}

/** Mount the flasher with `n` updatable devices; device `errIdx` is in OTA
 *  error. `deviceErr` overrides the interpolated `{message}` (e.g. a huge one). */
async function mountWithError(
	n: number,
	errIdx: number,
	deviceErr: string = DEVICE_ERR,
): Promise<{ el: EppFlasherView; errMac: string }> {
	await page.viewport(760, 640); // 40vh = 256px → 7 devices overflow the list
	document.documentElement.style.height = "100%";
	document.body.style.height = "100%";
	document.body.style.margin = "0";

	const el = document.createElement("epp-flasher-view") as EppFlasherView;
	const devices = mkDevices(n);
	const errMac = devices[errIdx].mac;
	el.flashableDevices = devices;
	el.otaStates = {
		[errMac]: {
			state: "error",
			progress: null,
			errorKey: ERR_KEY,
			errorParams: { message: deviceErr },
		},
	};
	// The real en catalogue, so the rendered message is the shipped copy.
	el.localize = setupLocalize();
	document.body.appendChild(el);
	mounted.push(el);
	await settle(el);
	return { el, errMac };
}

/** The `.device-row` currently showing the error `!` icon. */
function errorRow(root: ShadowRoot): HTMLElement {
	const icon = root.querySelector(".ota-error-icon") as HTMLElement;
	return icon.closest(".device-row") as HTMLElement;
}

describe("flasher OTA error message visibility", () => {
	it("does not let the next device row cover the opened error message", async () => {
		// The user's exact scenario: error on the TOP device of a full roster.
		// The message opens right under it and the SECOND device must sit below
		// the whole message, never painting over it.
		const { el } = await mountWithError(7, 0);
		const root = el.shadowRoot as ShadowRoot;

		(root.querySelector(".ota-error-icon") as HTMLElement).click();
		await settle(el);

		const detail = root.querySelector(".ota-error-detail") as HTMLElement;
		expect(detail, "error detail should be open").toBeTruthy();

		// It must live in the list flow, not nested inside a row that can't grow
		// to contain it.
		expect(
			detail.closest(".device-row"),
			"detail must NOT be nested inside a device row (it overflows it)",
		).toBeNull();
		expect(detail.closest(".device-list")).not.toBeNull();

		// The message renders directly below its own device.
		const errRowRect = errorRow(root).getBoundingClientRect();
		const detailRect = detail.getBoundingClientRect();
		expect(detailRect.top).toBeGreaterThanOrEqual(errRowRect.bottom - 1);

		// The NEXT device row starts at or below the message's bottom — it never
		// paints over it.
		const rows = [...root.querySelectorAll(".device-row")] as HTMLElement[];
		const errIdx = rows.indexOf(errorRow(root));
		const nextRow = rows[errIdx + 1];
		expect(nextRow, "there is a device row after the errored one").toBeTruthy();
		const nextRowRect = nextRow.getBoundingClientRect();
		expect(
			nextRowRect.top,
			"next row must not overlap the error message",
		).toBeGreaterThanOrEqual(detailRect.bottom - 1);

		// It hangs off ITS OWN row: the gap above the message (to its device) is
		// smaller than the gap below (to the next device), so it reads as attached
		// to the errored device, not floating equidistant between two rows.
		const gapAbove = detailRect.top - errRowRect.bottom;
		const gapBelow = nextRowRect.top - detailRect.bottom;
		expect(gapAbove).toBeLessThan(gapBelow);

		// And the whole message is shown — not sliced by its own box.
		expect(detail.scrollHeight).toBeLessThanOrEqual(detail.clientHeight + 1);
	});

	it("scrolls an opened error at the bottom of the list into view", async () => {
		const { el, errMac } = await mountWithError(7, 6);
		const root = el.shadowRoot as ShadowRoot;
		const list = root.querySelector(".device-list") as HTMLElement;

		// The failed device is at the bottom of a full, scrolling roster — scroll
		// there so its row (and the bar it will open) is at the bottom edge.
		list.scrollTop = list.scrollHeight;
		await settle(el);

		(root.querySelector(".ota-error-icon") as HTMLElement).click();
		await settle(el);

		const detail = root.querySelector(".ota-error-detail") as HTMLElement;
		expect(detail, "error detail should be open").toBeTruthy();
		const listRect = list.getBoundingClientRect();
		const detailRect = detail.getBoundingClientRect();

		// The whole message sits within the list's visible viewport — not sliced
		// off below (the bug) nor above the 40vh scroll cap.
		expect(
			detailRect.bottom,
			`detail bottom ${detailRect.bottom} overshoots list bottom ${listRect.bottom}`,
		).toBeLessThanOrEqual(listRect.bottom + 1);
		expect(detailRect.top).toBeGreaterThanOrEqual(listRect.top - 1);

		// Revealing it (which scrolls the inner list) must not dismiss it.
		expect(
			(el as unknown as { _errorPopoverMac: string | null })._errorPopoverMac,
		).toBe(errMac);
	});

	it("keeps the START of an over-long message visible, not just its tail", async () => {
		// The interpolated device error ({message}) is device-supplied and
		// unbounded. A message taller than the 40vh viewport must be scrolled so
		// its START (the actionable sentence) shows — NOT bottom-aligned, which
		// would push the start above the fold and leave only the tail readable.
		const huge = Array.from(
			{ length: 120 },
			(_, i) => `error-detail-token-${i}`,
		).join(" ");
		const { el } = await mountWithError(7, 6, huge);
		const root = el.shadowRoot as ShadowRoot;
		const list = root.querySelector(".device-list") as HTMLElement;

		list.scrollTop = list.scrollHeight;
		await settle(el);
		(root.querySelector(".ota-error-icon") as HTMLElement).click();
		await settle(el);

		const detail = root.querySelector(".ota-error-detail") as HTMLElement;
		expect(detail, "error detail should be open").toBeTruthy();
		const listRect = list.getBoundingClientRect();
		const detailRect = detail.getBoundingClientRect();

		// Precondition: the message really is taller than the viewport.
		expect(detailRect.height).toBeGreaterThan(listRect.height);
		// Its top (the message start) is visible at/below the list top — not
		// clipped above by a bottom-alignment.
		expect(detailRect.top).toBeGreaterThanOrEqual(listRect.top - 1);
	});

	it("wraps an unbreakable device-error token instead of overflowing sideways", async () => {
		// The interpolated {message} can be a long unbreakable token (a URL or a
		// hash with no spaces). It must wrap inside the bar, not push the bar
		// wider than the list.
		const unbreakable = "x".repeat(200);
		const { el } = await mountWithError(7, 0, unbreakable);
		const root = el.shadowRoot as ShadowRoot;

		(root.querySelector(".ota-error-icon") as HTMLElement).click();
		await settle(el);

		const detail = root.querySelector(".ota-error-detail") as HTMLElement;
		expect(detail, "error detail should be open").toBeTruthy();
		// No horizontal overflow: the content fits within its own (padded) box.
		expect(detail.scrollWidth).toBeLessThanOrEqual(detail.clientWidth + 1);
	});
});
