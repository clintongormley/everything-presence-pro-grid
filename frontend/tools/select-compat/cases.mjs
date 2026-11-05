// The dropdown cases. Each `run` gets a page from `page.mjs` and returns `ok`
// plus whatever it observed, which is printed if the case fails.
//
// Each group gets a fresh page. Inside a group the cases share one page and run
// in order. Each has its own stage (a, b, c...), except that A, A2 and A3 share
// stage m and each renders it again first, and the R cases share `#host`. A case
// may rely on nothing but its own stage. Cases prefixed R drive the real
// components that call `renderSelect`.

import { join } from "node:path";
import { OUT } from "./setup.mjs";

const OPTIONS = [
	{ value: "aa:bb", label: "Hall (Upstairs)" },
	{ value: "cc:dd", label: "Kitchen" },
	{ value: "ee:ff", label: "Office" },
];
const LABELS = OPTIONS.map((option) => option.label);
const ICON = "M12,2L2,22H22Z";
const ICON_OPTIONS = OPTIONS.map((o) => ({ ...o, iconPath: ICON }));

const SHORT_OPTIONS = [
	{ value: "aa:bb", label: "Hall" },
	{ value: "cc:dd", label: "Kitchen" },
	{ value: "ee:ff", label: "Office" },
];
const GROWN_OPTIONS = [...SHORT_OPTIONS, { value: "gg:hh", label: "Porch" }];
const REVERSED_OPTIONS = [...SHORT_OPTIONS].reverse();

const SETTINGS_PROPS = {
	grid: [0],
	perspective: [1, 0, 0, 0, 1, 0, 0, 0],
	roomWidth: 3000,
	roomDepth: 4000,
	entitiesConfig: { zone_presence: true, target_xy: true },
	zoneUpdateRateMs: 1000,
	targetUpdateRateMs: 500,
	ledMode: "Presence",
	relayTriggerMode: "motion",
	relayContactMode: "nc",
	logLevels: { system: "Info" },
};

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const withoutBlanks = (texts) => texts.filter(Boolean);

const selectsIn = (page, host) => page.p.locator(`${host} ha-select`);

/** The value, shown text and old-style child count of each matching select. */
const describeSelects = (locator) =>
	locator.evaluateAll((selects) =>
		selects.map((el) => ({
			value: el.value,
			text: shownText(el),
			items: el.querySelectorAll("ha-list-item").length,
		})),
	);

const settingsCase = (accordion, expectedCount) => ({
	name: `R settings ${accordion}`,
	run: async (page) => {
		const { p } = page;
		await page.mount("epp-settings-view", {
			...SETTINGS_PROPS,
			openAccordions: [accordion],
		});
		await page.wait(400);
		const selects = selectsIn(page, "epp-settings-view");
		const all = await describeSelects(selects);
		const changesOnOpen = await p.evaluate(() => FC.splice(0));
		const dirty = await p.evaluate(() => EL._localDirty);

		const last = selects.nth(all.length - 1);
		await page.openLocator(last);
		const current = all[all.length - 1].value;
		const index = await last.evaluate(
			(el, value) => el.options.findIndex((o) => o.value !== value),
			current,
		);
		const want = await last.evaluate((el, i) => el.options[i].value, index);
		await page.pickNth(last, index);
		await page.wait(200);
		const changes = await p.evaluate(() => FC.splice(0));
		const after = await describeSelects(last);

		const rightCount =
			expectedCount === null ? all.length > 3 : all.length === expectedCount;
		return {
			ok:
				rightCount &&
				all.every((s) => s.value && s.text?.length > 0) &&
				changesOnOpen.length === 0 &&
				!dirty &&
				changes.length === 1 &&
				after[0].value === want,
			all,
			changesOnOpen,
			dirty,
			changes,
			after,
			want,
		};
	},
});

/** Changes the options while the menu is open, then uses the menu. */
async function changeOptionsWhileOpen(page, fn, id, options, how, want) {
	const { p } = page;
	const result = {};
	await page.sel(id, { value: "cc:dd", options: SHORT_OPTIONS }, 200, fn);
	await page.picks();
	await page.open(id);
	await p.evaluate((id) => {
		window.MARK = document.querySelector(`[data-testid=${id}]`);
	}, id);
	result.open0 = (await page.texts(id)).length;
	result.focus0 = await page.activePath();

	await page.sel(id, { options }, 300, fn);
	result.same = await p.evaluate(
		(id) => window.MARK === document.querySelector(`[data-testid=${id}]`),
		id,
	);
	result.focus1 = await page.activePath();
	result.list = withoutBlanks(await page.texts(id));
	result.stillOpen = result.list.length > 0;
	result.spontaneous = await page.picks();

	if (how === "click") {
		if (!result.stillOpen) {
			await page.open(id);
			result.reopened = withoutBlanks(await page.texts(id));
		}
		await page.pick(id, want.label);
	} else {
		await p.keyboard.press("ArrowDown");
		await page.wait(120);
		await p.keyboard.press("ArrowDown");
		await page.wait(120);
		result.focusKeyboard = await page.activePath();
		await p.keyboard.press("Enter");
		await page.wait(350);
	}
	result.picks = (await page.picks()).map(([, value]) => value);
	result.focusEnd = await page.activePath();
	await page.closeMenu();
	return result;
}

/**
 * Old versions must start a fresh element. From 2026.3 the element must stay, so
 * the menu stays open and keeps focus, and it must behave just like the bare
 * template.
 */
const optionsChangeCase = (name, ids, options, how, want) => ({
	name,
	run: async (page) => {
		const labels = options.map((o) => o.label);
		const shipped = await changeOptionsWhileOpen(
			page,
			"sel",
			ids[0],
			options,
			how,
			want,
		);
		if (page.isOld) {
			const list = shipped.stillOpen ? shipped.list : shipped.reopened;
			const clicked = eq(list, labels) && eq(shipped.picks, [want.value]);
			return {
				ok: !shipped.same && (how !== "click" || clicked),
				shipped,
			};
		}
		const bare = await changeOptionsWhileOpen(
			page,
			"plain",
			ids[1],
			options,
			how,
			want,
		);
		return {
			ok:
				shipped.same &&
				shipped.stillOpen &&
				eq(shipped.list, labels) &&
				eq(shipped.focus0, shipped.focus1) &&
				!shipped.focus1.includes("BODY") &&
				eq(shipped.picks, [want.value]) &&
				eq(shipped, bare),
			shipped,
			bare,
		};
	},
});

const MAIN_CASES = [
	{
		name: "1 lists, shows, reports",
		run: async (page) => {
			await page.p.evaluate((options) => {
				sel("a", {
					value: "cc:dd",
					options,
					after: (v) => setTimeout(() => sel("a", { value: v })),
				});
			}, OPTIONS);
			await page.wait(250);
			const shown = await page.shown("a");
			const onMount = await page.picks();
			await page.open("a");
			const list = await page.texts("a");
			await page.pick("a", "Office");
			const picks = await page.picks();
			await page.wait(100);
			const after = await page.shown("a");
			return {
				ok:
					shown.text === "Kitchen" &&
					onMount.length === 0 &&
					eq(list, LABELS) &&
					eq(picks, [["a", "ee:ff"]]) &&
					after.text === "Office" &&
					after.value === "ee:ff",
				shown,
				onMount,
				list,
				picks,
				after,
			};
		},
	},
	{
		name: "2 late data",
		run: async (page) => {
			await page.sel("b", { value: "", options: [] }, 150);
			await page.sel("b", { value: "cc:dd", options: OPTIONS }, 250);
			const shown = await page.shown("b");
			const picks = await page.picks();
			await page.open("b");
			const list = await page.texts("b");
			await page.closeMenu();
			return {
				ok:
					shown.text === "Kitchen" &&
					shown.value === "cc:dd" &&
					picks.length === 0 &&
					eq(list, LABELS),
				shown,
				picks,
				list,
			};
		},
	},
	{
		name: "3 add picker",
		run: async (page) => {
			await page.sel("c", { value: "", options: OPTIONS });
			const initial = await page.shown("c");
			const onMount = await page.picks();
			await page.open("c");
			await page.pick("c", "Kitchen");
			const firstPick = await page.picks();

			const withoutKitchen = OPTIONS.filter((o) => o.value !== "cc:dd");
			await page.sel("c", { options: withoutKitchen }, 250);
			const afterRemoval = await page.shown("c");
			const spontaneous = await page.picks();

			await page.open("c");
			await page.pick("c", "Office");
			const secondPick = await page.picks();

			const onlyHall = OPTIONS.filter((o) => o.value === "aa:bb");
			await page.sel("c", { options: onlyHall }, 250);
			const final = await page.shown("c");
			return {
				ok:
					initial.value === "" &&
					!initial.text &&
					onMount.length === 0 &&
					eq(firstPick, [["c", "cc:dd"]]) &&
					!afterRemoval.text &&
					afterRemoval.value === "" &&
					spontaneous.length === 0 &&
					eq(secondPick, [["c", "ee:ff"]]) &&
					!final.text &&
					final.value === "",
				initial,
				onMount,
				firstPick,
				afterRemoval,
				spontaneous,
				secondPick,
				final,
			};
		},
	},
	{
		name: "3b add picker, same pick twice",
		run: async (page) => {
			await page.sel("d", { value: "", options: OPTIONS });
			await page.picks();
			await page.open("d");
			await page.pick("d", "Kitchen");
			const first = await page.picks();
			await page.sel("d", {}, 250);
			const shown = await page.shown("d");
			await page.open("d");
			await page.pick("d", "Kitchen");
			const second = await page.picks();
			return {
				ok:
					eq(first, [["d", "cc:dd"]]) &&
					!shown.text &&
					eq(second, [["d", "cc:dd"]]),
				first,
				shown,
				second,
			};
		},
	},
	{
		name: "4 refused pick",
		run: async (page) => {
			await page.sel("e", { value: "cc:dd", options: OPTIONS });
			await page.picks();
			await page.open("e");
			await page.pick("e", "Office");
			const picks = await page.picks();
			await page.sel("e", {}, 250);
			const shown = await page.shown("e");
			const spontaneous = await page.picks();
			return {
				ok:
					eq(picks, [["e", "ee:ff"]]) &&
					shown.text === "Kitchen" &&
					shown.value === "cc:dd" &&
					spontaneous.length === 0,
				picks,
				shown,
				spontaneous,
			};
		},
	},
	{
		name: "5 icons",
		run: async (page) => {
			const { p, isOld } = page;
			await page.sel("f", { value: "cc:dd", options: ICON_OPTIONS }, 250);
			const shown = await page.shown("f");
			await page.open("f");
			const list = await page.texts("f");
			const icons = await p.evaluate((isOld) => {
				const select = document.querySelector("[data-testid=f]");
				const items = isOld
					? select.querySelectorAll("ha-list-item")
					: select.shadowRoot.querySelectorAll("ha-dropdown-item");
				return [...items].map((item) => {
					const icon = item.querySelector("ha-svg-icon");
					const box = icon.getBoundingClientRect();
					const result = {
						width: box.width,
						height: box.height,
						path: icon.shadowRoot.querySelector("path")?.getAttribute("d"),
					};
					if (!isOld) return result;
					const label = [...item.childNodes].find(
						(n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
					);
					const range = document.createRange();
					range.selectNode(label);
					const slot = icon.assignedSlot;
					return {
						...result,
						slot: slot?.name,
						inGraphicBox: !!slot?.parentElement?.classList.contains(
							"mdc-deprecated-list-item__graphic",
						),
						beforeText: box.right <= range.getBoundingClientRect().left,
					};
				});
			}, isOld);
			await p.screenshot({
				path: join(OUT, `icons-${page.tag}.png`),
				clip: { x: 0, y: 0, width: 900, height: 1100 },
			});
			await page.pick("f", "Office");
			const picks = await page.picks();
			const laidOut = (icon) =>
				icon.width > 0 && icon.height > 0 && icon.path === ICON;
			const inGraphicSlot = (icon) =>
				icon.slot === "graphic" && icon.inGraphicBox && icon.beforeText;
			return {
				ok:
					shown.text === "Kitchen" &&
					eq(list, LABELS) &&
					icons.length === 3 &&
					icons.every((i) => laidOut(i) && (!isOld || inGraphicSlot(i))) &&
					eq(picks, [["f", "ee:ff"]]),
				shown,
				list,
				icons,
				picks,
			};
		},
	},
	{
		name: "6 parent changes value",
		run: async (page) => {
			await page.sel("g", { value: "cc:dd", options: OPTIONS });
			await page.picks();
			await page.sel("g", { value: "aa:bb" }, 250);
			const shown = await page.shown("g");
			const picks = await page.picks();
			return {
				ok: shown.text === "Hall (Upstairs)" && picks.length === 0,
				shown,
				picks,
			};
		},
	},
	{
		name: "7 5Hz re-render, menu open",
		run: async (page) => {
			const { p } = page;
			await page.sel("h", { value: "cc:dd", options: OPTIONS });
			await page.picks();
			await p.evaluate(() => {
				window.TIMER = setInterval(() => {
					sel("h", { options: CFG.h.options.map((o) => ({ ...o })) });
				}, 200);
			});
			await page.open("h");
			await page.wait(700);
			await page.pick("h", "Hall");
			const picks = await page.picks();
			await p.evaluate(() => clearInterval(TIMER));
			return { ok: eq(picks, [["h", "aa:bb"]]), picks };
		},
	},
	{
		name: "8 disabled",
		run: async (page) => {
			await page.sel("i", { value: "cc:dd", options: OPTIONS, disabled: true });
			const shown = await page.shown("i");
			await page.select("i").click({ position: { x: 60, y: 20 }, force: true });
			await page.wait(300);
			const list = await page.texts("i");
			return { ok: shown.text === "Kitchen" && list.length === 0, shown, list };
		},
	},
	{
		name: "9 bound value not in the list",
		run: async (page) => {
			await page.sel("j", { value: "zz", options: OPTIONS });
			const onMount = await page.picks();
			await page.sel("j", {});
			const onRerender = await page.picks();
			await page.open("j");
			await page.pick("j", "Office");
			const picks = await page.picks();
			return {
				ok:
					onMount.length === 0 &&
					onRerender.length === 0 &&
					eq(picks, [["j", "ee:ff"]]),
				onMount,
				onRerender,
				picks,
			};
		},
	},
	{
		name: "P same as the bare template",
		newOnly: true,
		run: async (page) => {
			const script = async (fn, id) => {
				const r = {};
				const values = async () => (await page.picks()).map(([, v]) => v);
				await page.sel(id, { value: "cc:dd", options: OPTIONS }, 200, fn);
				r.mount = await page.shown(id);
				r.onMount = await values();
				await page.open(id);
				r.list = await page.texts(id);
				await page.pick(id, "Office");
				r.pick = await values();
				r.afterPick = await page.shown(id);
				await page.sel(id, { value: "ee:ff" }, 200, fn);
				r.afterRender = await page.shown(id);
				await page.open(id);
				await page.pick(id, "Office");
				r.samePick = await values();
				await page.sel(id, { value: "", options: [] }, 200, fn);
				r.empty = await page.shown(id);
				await page.sel(id, { value: "cc:dd", options: OPTIONS }, 200, fn);
				r.late = await page.shown(id);
				r.latePicks = await values();
				return r;
			};
			const bare = await script("plain", "k");
			const shipped = await script("sel", "l");
			return { ok: eq(bare, shipped), bare, shipped };
		},
	},
	settingsCase("reporting", 2),
	settingsCase("led_relay", 3),
	settingsCase("logging", null),
	{
		name: "R flasher, late networks, icons",
		run: async (page) => {
			const { p, isOld } = page;
			await page.mount("epp-flasher-view", {
				usbFlashState: { step: "wifi_provision" },
				wifiNetworks: [],
			});
			await page.wait(300);
			await p.evaluate(() => {
				EL.wifiNetworks = [
					{ ssid: "Strong", rssi: -45, authRequired: true },
					{ ssid: "Weak", rssi: -80, authRequired: false },
				];
			});
			await page.wait(300);
			const select = selectsIn(page, "epp-flasher-view").first();
			await page.openLocator(select);
			const list = await page.textsOf(select);
			const iconCount = await select
				.locator(
					isOld
						? 'ha-list-item[graphic="icon"] ha-svg-icon[slot="graphic"]:visible'
						: "ha-dropdown-item ha-svg-icon:visible",
				)
				.count();
			await p.evaluate(() => {
				EL._wifiPassword = "secret";
			});
			await page.pickLocator(select, "Weak");
			await page.wait(150);
			const state = await p.evaluate(() => ({
				ssid: EL._selectedSsid,
				password: EL._wifiPassword,
			}));
			const [shown] = await describeSelects(
				selectsIn(page, "epp-flasher-view"),
			);
			return {
				ok:
					eq(list, ["Strong", "Weak"]) &&
					iconCount === 2 &&
					state.ssid === "Weak" &&
					state.password === "" &&
					shown.value === "Weak" &&
					shown.text === "Weak",
				list,
				iconCount,
				state,
				shown,
			};
		},
	},
	{
		name: "R add picker",
		run: async (page) => {
			const { p } = page;
			const device = (mac, name) => ({
				mac,
				name,
				area: null,
				available: true,
				configured: true,
			});
			await page.mount("epp-device-source-list", {
				availableDevices: [
					device("AA", "Hall"),
					device("BB", "Kitchen"),
					device("CC", "Office"),
				],
				selectedMacs: [],
			});
			await p.evaluate(() => {
				window.ADDED = [];
				EL.addEventListener("source-toggled", (e) => {
					ADDED.push(e.detail.mac);
					EL.selectedMacs = [...EL.selectedMacs, e.detail.mac];
				});
			});
			await page.wait(300);
			const select = () => selectsIn(page, "epp-device-source-list").first();
			const [initial] = await describeSelects(select());
			await page.openLocator(select());
			await page.pickLocator(select(), "Kitchen");
			await page.wait(200);
			const [afterFirst] = await describeSelects(select());
			await page.openLocator(select());
			const list = await page.textsOf(select());
			await page.pickLocator(select(), "Office");
			await page.wait(200);
			const added = await p.evaluate(() => ADDED);
			const [afterSecond] = await describeSelects(select());
			return {
				ok:
					!initial.text &&
					!afterFirst.text &&
					eq(withoutBlanks(list).sort(), ["Hall", "Office"]) &&
					eq(added, ["BB", "CC"]) &&
					!afterSecond.text,
				initial,
				afterFirst,
				list,
				added,
				afterSecond,
			};
		},
	},
	{
		name: "R panel header, guard refuses then accepts",
		run: async (page) => {
			const { p } = page;
			await p.evaluate(() => {
				const host = document.getElementById("host");
				host.innerHTML = "";
				const panel = document.createElement("eppgrid-panel");
				window.PANEL = panel;
				panel._devices = [
					{ mac: "AA", name: "Hall", area: "Upstairs" },
					{ mac: "BB", name: "Kitchen", area: null },
				];
				panel._selectedMac = "AA";
				panel._dirty = true;
				panel._loadDeviceConfig = async (mac) => {
					window.LOADED = mac;
				};
				panel._closeDeviceSession = () => {};
				window.RENDER_HEADER = () => EPP.render(panel._renderHeader(), host);
				RENDER_HEADER();
			});
			await page.wait(300);
			const select = p.locator("#host ha-select");
			const rerender = async () => {
				await p.evaluate(() => RENDER_HEADER());
				await page.wait(200);
				const [shown] = await describeSelects(select);
				return shown;
			};

			const [initial] = await describeSelects(select);
			await page.openLocator(select);
			await page.pickLocator(select, "Kitchen");
			const refused = await p.evaluate(() => ({
				mac: PANEL._selectedMac,
				dialog: PANEL._showUnsavedDialog,
			}));
			const afterRefusal = await rerender();

			await p.evaluate(() => {
				PANEL._dirty = false;
				RENDER_HEADER();
			});
			await page.openLocator(select);
			await page.pickLocator(select, "Kitchen");
			const accepted = await p.evaluate(() => ({
				mac: PANEL._selectedMac,
				loaded: window.LOADED,
			}));
			const afterAccept = await rerender();
			return {
				ok:
					initial.text === "Hall (Upstairs)" &&
					refused.mac === "AA" &&
					refused.dialog === true &&
					afterRefusal.text === "Hall (Upstairs)" &&
					afterRefusal.value === "AA" &&
					accepted.mac === "BB" &&
					accepted.loaded === "BB" &&
					afterAccept.text === "Kitchen",
				initial,
				refused,
				afterRefusal,
				accepted,
				afterAccept,
			};
		},
	},
	{
		name: "A label-only change, closed",
		run: async (page) => {
			const { p } = page;
			await page.sel("m", { value: "aa:bb", options: OPTIONS });
			await page.picks();
			const before = await page.shown("m");
			await p.evaluate(() => {
				window.MARK = document.querySelector("[data-testid=m]");
				sel("m", {
					options: CFG.m.options.map((o) =>
						o.value === "aa:bb" ? { ...o, label: "Hall (Downstairs)" } : o,
					),
				});
			});
			await page.wait(250);
			const after = await page.shown("m");
			const same = await p.evaluate(
				() => window.MARK === document.querySelector("[data-testid=m]"),
			);
			const picks = await page.picks();
			return {
				ok:
					before.text.trim() === "Hall (Upstairs)" &&
					after.text.trim() === "Hall (Downstairs)" &&
					after.value === "aa:bb" &&
					same &&
					picks.length === 0,
				before,
				after,
				same,
				picks,
			};
		},
	},
	{
		name: "A2 label-only change, menu open",
		run: async (page) => {
			const { p } = page;
			await page.sel("m", { value: "aa:bb", options: OPTIONS });
			await page.picks();
			await page.open("m");
			const focusBefore = await page.activePath();
			const count = await page.items(page.select("m")).count();
			await p.evaluate(() => {
				window.MARK = document.querySelector("[data-testid=m]");
				sel("m", {
					options: CFG.m.options.map((o) =>
						o.value === "cc:dd" ? { ...o, label: "Kitchen (New)" } : o,
					),
				});
			});
			await page.wait(300);
			const focusAfter = await page.activePath();
			const list = await page.texts("m");
			const same = await p.evaluate(
				() => window.MARK === document.querySelector("[data-testid=m]"),
			);
			await page.closeMenu();
			const picks = await page.picks();
			return {
				ok:
					count === 3 &&
					list.length === 3 &&
					list.some((text) => text.includes("Kitchen (New)")) &&
					eq(focusBefore, focusAfter) &&
					!focusAfter.includes("BODY") &&
					same &&
					picks.length === 0,
				count,
				focusBefore,
				focusAfter,
				list,
				same,
				picks,
			};
		},
	},
	{
		name: "A3 label-only change while open, then close",
		run: async (page) => {
			await page.sel("m", { value: "aa:bb", options: OPTIONS });
			await page.picks();
			await page.open("m");
			await page.p.evaluate(() => {
				sel("m", {
					options: CFG.m.options.map((o) =>
						o.value === "aa:bb" ? { ...o, label: "Hall (Loft)" } : o,
					),
				});
			});
			await page.wait(250);
			await page.closeMenu();
			await page.wait(200);
			const after = await page.shown("m");
			const picks = await page.picks();
			return {
				ok:
					after.text.trim() === "Hall (Loft)" &&
					after.value === "aa:bb" &&
					picks.length === 0,
				after,
				picks,
			};
		},
	},
	{
		// The list changes, so old versions replace the element and the old one
		// must then stay silent. New versions keep the element on purpose, so a
		// `selected` on it is a real pick until it leaves the document.
		name: "B removed element",
		run: async (page) => {
			await page.sel("n", { value: "aa:bb", options: OPTIONS });
			await page.picks();
			const r = await page.p.evaluate(async () => {
				const el = document.querySelector("[data-testid=n]");
				const fire = () =>
					el.dispatchEvent(
						new CustomEvent("selected", {
							bubbles: true,
							composed: true,
							detail: { value: "cc:dd" },
						}),
					);
				el.value = "cc:dd";
				sel("n", {
					value: "ee:ff",
					options: CFG.n.options.filter((o) => o.value !== "aa:bb"),
				});
				await new Promise((resolve) => setTimeout(resolve, 200));
				const replaced = !el.isConnected;
				const late = PICKS.splice(0);
				fire();
				const onFirstEvent = PICKS.splice(0);
				el.remove();
				fire();
				const onceRemoved = PICKS.splice(0);
				return { replaced, late, onFirstEvent, onceRemoved };
			});
			const firstEvent = page.isOld ? [] : [["n", "cc:dd"]];
			return {
				ok:
					r.replaced === page.isOld &&
					r.late.length === 0 &&
					eq(r.onFirstEvent, firstEvent) &&
					r.onceRemoved.length === 0,
				...r,
			};
		},
	},
	{
		name: "C selectedText is inert on new tags",
		run: async (page) => {
			await page.sel("o", { value: "aa:bb", options: OPTIONS });
			const r = await page.p.evaluate(async () => {
				const Select = customElements.get("ha-select");
				const el = document.querySelector("[data-testid=o]");
				const onPrototype = "selectedText" in Select.prototype;
				const declared = !!Select.elementProperties?.has("selectedText");
				const before = shownText(el);
				el.selectedText = "BOGUS TEXT";
				await el.updateComplete;
				await new Promise((resolve) => setTimeout(resolve, 100));
				const after = shownText(el);
				const seesBogus = el.shadowRoot.innerHTML.includes("BOGUS TEXT");
				el.selectedText = "Hall (Upstairs)";
				await el.updateComplete;
				return { onPrototype, declared, before, after, seesBogus };
			});
			const ok = page.isOld
				? r.onPrototype && r.seesBogus
				: !r.onPrototype && !r.declared && !r.seesBogus && r.before === r.after;
			return { ok, ...r };
		},
	},
	{
		// Removing the selected item is the real route to an empty value on old
		// versions, but `keyed` replaces the element first, so `onEmptyEvent` is
		// what proves the check itself.
		name: "D empty value with a value bound",
		run: async (page) => {
			await page.sel("p", { value: "cc:dd", options: OPTIONS });
			await page.picks();
			await page.p.evaluate(() => {
				document.querySelector("[data-testid=p]").dispatchEvent(
					new CustomEvent("selected", {
						bubbles: true,
						composed: true,
						detail: { value: "" },
					}),
				);
			});
			const onEmptyEvent = await page.picks();
			const withoutKitchen = OPTIONS.filter((o) => o.value !== "cc:dd");
			await page.sel("p", { options: withoutKitchen }, 250);
			const onRemoval = await page.picks();
			return {
				ok: onEmptyEvent.length === 0 && onRemoval.length === 0,
				onEmptyEvent,
				onRemoval,
			};
		},
	},
	{
		// Only old versions fire `closed` when the menu shuts, so a dispatched one
		// proves the stop on every version.
		name: "E closed stays inside the select",
		run: async (page) => {
			const { p } = page;
			await page.sel("q", { value: "cc:dd", options: OPTIONS });
			await page.picks();
			await p.evaluate(() => {
				const stage = document.getElementById("q");
				const select = stage.querySelector("ha-select");
				window.CLOSED = { atSelect: 0, atStage: 0 };
				select.addEventListener("closed", () => CLOSED.atSelect++);
				stage.addEventListener("closed", () => CLOSED.atStage++);
			});
			await page.open("q");
			await page.closeMenu();
			await page.wait(200);
			const onClose = await p.evaluate(() => ({ ...CLOSED }));
			const afterDispatch = await p.evaluate(() => {
				document
					.querySelector("[data-testid=q]")
					.dispatchEvent(
						new Event("closed", { bubbles: true, composed: true }),
					);
				return CLOSED;
			});
			return {
				ok:
					(!page.isOld || onClose.atSelect > 0) &&
					afterDispatch.atSelect > onClose.atSelect &&
					afterDispatch.atStage === 0,
				onClose,
				afterDispatch,
			};
		},
	},
];

const OPTIONS_CHANGE_CASES = [
	optionsChangeCase(
		"K grows while open, click the new item",
		["a", "b"],
		GROWN_OPTIONS,
		"click",
		GROWN_OPTIONS[3],
	),
	optionsChangeCase(
		"K reorders while open, click",
		["c", "d"],
		REVERSED_OPTIONS,
		"click",
		REVERSED_OPTIONS[0],
	),
	optionsChangeCase(
		"K grows while open, keyboard",
		["e", "f"],
		GROWN_OPTIONS,
		"keyboard",
		GROWN_OPTIONS[2],
	),
	optionsChangeCase(
		"K reorders while open, keyboard",
		["g", "h"],
		REVERSED_OPTIONS,
		"keyboard",
		REVERSED_OPTIONS[2],
	),
];

const LATE_REGISTRATION_CASES = [
	{
		// `renderSelect` picks its `keyed` key from the registered element, so the
		// first render can happen before HA has defined `ha-select`.
		name: "L ha-select registers after first render",
		run: async (page) => {
			const { p, isOld } = page;
			const registered = () =>
				p.evaluate(() => !!customElements.get("ha-select"));
			const keptBy = (expression) => p.evaluate(expression);

			const before = await registered();
			await page.p.evaluate((options) => {
				sel("a", { value: "cc:dd", options });
				window.FIRST = document.querySelector("[data-testid=a]");
			}, SHORT_OPTIONS);
			await page.loadHa();
			await page.wait(400);
			const after = await registered();

			const keptOnFirstRender = await keptBy(() => {
				sel("a", {});
				return window.FIRST === document.querySelector("[data-testid=a]");
			});
			await page.wait(250);
			const keptOnNext = await keptBy(() => {
				window.SECOND = document.querySelector("[data-testid=a]");
				sel("a", {});
				return window.SECOND === document.querySelector("[data-testid=a]");
			});
			await page.wait(150);
			const keptOnListChange = await p.evaluate((options) => {
				sel("a", { options });
				return window.SECOND === document.querySelector("[data-testid=a]");
			}, GROWN_OPTIONS);
			await page.wait(250);

			await page.open("a");
			const list = withoutBlanks(await page.texts("a"));
			const shown = await page.shown("a");
			return {
				ok:
					!before &&
					after &&
					keptOnFirstRender === isOld &&
					keptOnNext &&
					keptOnListChange === !isOld &&
					eq(
						list,
						GROWN_OPTIONS.map((o) => o.label),
					),
				before,
				after,
				keptOnFirstRender,
				keptOnNext,
				keptOnListChange,
				list,
				shown,
			};
		},
	},
];

export const GROUPS = [
	{ cases: MAIN_CASES },
	{ page: { height: 900 }, cases: OPTIONS_CHANGE_CASES },
	{ page: { height: 900, loadHaFirst: false }, cases: LATE_REGISTRATION_CASES },
];
