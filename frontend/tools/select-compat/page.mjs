// A test page holding one tag's real `ha-select` and the panel bundle built from
// `src/`, with the steps a person would take on a dropdown.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PANEL_BUNDLE, tagBundle } from "./setup.mjs";

const HELPERS = join(
	dirname(fileURLToPath(import.meta.url)),
	"page-helpers.js",
);
const STAGE_IDS = [..."abcdefghijklmnopq"];

// Long enough for the menus to finish animating.
const MENU_SETTLE_MS = 350;

const stageHtml = () => {
	const stages = STAGE_IDS.map(
		(id) => `<div id=${id} style="margin:8px"></div>`,
	).join("");
	return `<!doctype html><html><body>${stages}<div id=host></div></body></html>`;
};

export async function openPage(browser, tagConfig, options = {}) {
	const { height = 1100, loadHaFirst = true } = options;
	const p = await browser.newPage({ viewport: { width: 900, height } });
	p.setDefaultTimeout(5000);

	const errors = [];
	p.on("pageerror", (error) => errors.push(String(error).slice(0, 200)));
	p.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text().slice(0, 200));
	});

	await p.setContent(stageHtml());

	const page = makePage(p, tagConfig, errors);
	const loadPanel = async () => {
		await p.addScriptTag({ content: readFileSync(PANEL_BUNDLE, "utf8") });
		await p.addScriptTag({ content: readFileSync(HELPERS, "utf8") });
	};
	if (loadHaFirst) {
		await page.loadHa();
		await loadPanel();
		await p.waitForTimeout(150);
	} else {
		await loadPanel();
	}
	return page;
}

function makePage(p, tagConfig, errors) {
	const isOld = tagConfig.oldSelect;
	const byId = (id) => p.locator(`[data-testid="${id}"]`);
	const wait = (ms) => p.waitForTimeout(ms);

	const items = (select) =>
		select.locator(isOld ? "ha-list-item:visible" : "ha-dropdown-item:visible");

	const openLocator = async (select) => {
		await select.click({ position: { x: 60, y: 20 } });
		await wait(MENU_SETTLE_MS);
	};

	const pickLocator = async (select, text) => {
		await items(select).filter({ hasText: text }).click();
		await wait(MENU_SETTLE_MS);
	};

	const shownOf = (select) =>
		select.evaluate((el) => ({ value: el.value, text: shownText(el) }));

	const textsOf = async (select) =>
		(await items(select).allInnerTexts()).map((text) => text.trim());

	return {
		p,
		isOld,
		tag: tagConfig.tag,
		errors,
		wait,
		items,
		byId,
		openLocator,
		pickLocator,
		shownOf,
		textsOf,
		select: (id) => byId(id),
		open: (id) => openLocator(byId(id)),
		pick: (id, text) => pickLocator(byId(id), text),
		shown: (id) => shownOf(byId(id)),
		texts: (id) => textsOf(byId(id)),

		/** Renders `renderSelect` (or `fn`) and lets the element settle. */
		sel: async (id, cfg, settleMs = 200, fn = "sel") => {
			await p.evaluate(({ fn, id, cfg }) => window[fn](id, cfg), {
				fn,
				id,
				cfg,
			});
			await wait(settleMs);
		},

		/** Takes and clears the `[id, value]` picks `onSelect` has reported. */
		picks: () => p.evaluate(() => PICKS.splice(0)),

		pickNth: async (select, index) => {
			await items(select).nth(index).click();
			await wait(MENU_SETTLE_MS);
		},

		closeMenu: async () => {
			await p.keyboard.press("Escape");
			await wait(250);
		},

		activePath: () => p.evaluate(() => activePath()),

		loadHa: async () => {
			await p.addScriptTag({
				content: readFileSync(tagBundle(tagConfig.tag), "utf8"),
			});
			const actual = await p.evaluate(
				() => "selectByValue" in customElements.get("ha-select").prototype,
			);
			if (actual !== isOld) {
				throw new Error(`${tagConfig.tag}: oldSelect should be ${actual}`);
			}
		},

		/** Puts a real component in `#host`, as `window.EL`. */
		mount: (tagName, props) =>
			p.evaluate(
				({ tagName, props }) => {
					const host = document.getElementById("host");
					host.innerHTML = "";
					const el = document.createElement(tagName);
					for (const [key, value] of Object.entries(props)) {
						el[key] = key === "openAccordions" ? new Set(value) : value;
					}
					window.FC = [];
					if (el._fireChange) {
						const original = el._fireChange.bind(el);
						el._fireChange = (key, value) => {
							FC.push([key, JSON.parse(JSON.stringify(value))]);
							original(key, value);
						};
					}
					host.append(el);
					window.EL = el;
				},
				{ tagName, props },
			),
	};
}
