// Runs every dropdown case against every Home Assistant tag and prints a table.
// Exits non-zero if any case does not pass. See README.md.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { GROUPS } from "./cases.mjs";
import { openPage } from "./page.mjs";
import { buildPanelBundle, ensureTags, OUT, TAGS } from "./setup.mjs";

const NOT_APPLICABLE = "n/a";
const PAGE_ERRORS_CASE = "no page errors";

async function runCase(page, testCase) {
	if (testCase.newOnly && page.isOld) return { status: NOT_APPLICABLE };
	try {
		const { ok, ...detail } = await testCase.run(page);
		return { status: ok ? "PASS" : "FAIL", detail };
	} catch (error) {
		await page.p.keyboard.press("Escape").catch(() => {});
		return { status: "ERROR", detail: String(error).slice(0, 300) };
	}
}

async function runTag(browser, tagConfig) {
	const results = {};
	const pageErrors = [];
	for (const group of GROUPS) {
		const page = await openPage(browser, tagConfig, group.page);
		for (const testCase of group.cases) {
			results[testCase.name] = await runCase(page, testCase);
		}
		pageErrors.push(...page.errors);
		await page.p.close();
	}
	const errors = [...new Set(pageErrors)];
	results[PAGE_ERRORS_CASE] = {
		status: errors.length ? "FAIL" : "PASS",
		detail: errors,
	};
	return results;
}

function printTable(tags, results) {
	const names = Object.keys(results[tags[0]]);
	const width = Math.max(...names.map((name) => name.length));
	const row = (name, cells) =>
		[name.padEnd(width), ...cells.map((c) => c.padEnd(10))].join(" | ");
	console.log(`\n${row("case", tags)}`);
	for (const name of names) {
		console.log(
			row(
				name,
				tags.map((tag) => results[tag][name].status),
			),
		);
	}
}

function printFailures(tags, results) {
	const failures = tags.flatMap((tag) =>
		Object.entries(results[tag])
			.filter(
				([, { status }]) => status !== "PASS" && status !== NOT_APPLICABLE,
			)
			.map(([name, { status, detail }]) => ({ tag, name, status, detail })),
	);
	for (const { tag, name, status, detail } of failures) {
		console.log(`\n${status} ${tag} ${name}\n  ${JSON.stringify(detail)}`);
	}
	return failures.length;
}

async function main() {
	await ensureTags();
	await buildPanelBundle();

	const browser = await chromium.launch();
	const results = {};
	for (const tagConfig of TAGS) {
		results[tagConfig.tag] = await runTag(browser, tagConfig);
	}
	await browser.close();

	writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 1));
	const tags = TAGS.map(({ tag }) => tag);
	printTable(tags, results);
	const failures = printFailures(tags, results);
	console.log(
		failures
			? `\nselect-compat: ${failures} failed`
			: "\nselect-compat: every case passed on every tag",
	);
	process.exit(failures ? 1 : 0);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
