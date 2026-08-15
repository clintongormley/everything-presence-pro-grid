import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../translations/en.json";

// Discover every shipped locale catalogue except the English source of truth,
// so a new translations/<locale>.json is covered with no new test code. Uses
// node:fs (like translations-coverage.test.ts) rather than import.meta.glob,
// which the rollup typecheck can't resolve.
const TRANSLATIONS_DIR = resolve(__dirname, "..", "translations");

const locales = readdirSync(TRANSLATIONS_DIR)
	.filter((f) => f.endsWith(".json") && f !== "en.json")
	.map((f) => ({
		code: f.replace(/\.json$/, ""),
		data: JSON.parse(
			readFileSync(join(TRANSLATIONS_DIR, f), "utf8"),
		) as unknown,
	}))
	.sort((a, b) => a.code.localeCompare(b.code));

function flatten(obj: unknown, prefix = "", acc: string[] = []): string[] {
	if (obj && typeof obj === "object") {
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			const path = prefix ? `${prefix}.${k}` : k;
			if (v && typeof v === "object") flatten(v, path, acc);
			else acc.push(path);
		}
	}
	return acc;
}

const enKeys = new Set(flatten(en));

describe("translation catalogue coverage", () => {
	it("discovers at least one shipped locale besides en", () => {
		expect(locales.length).toBeGreaterThan(0);
	});

	it.each(locales)("$code has every key present in en.json", ({ data }) => {
		const localeKeys = new Set(flatten(data));
		const missing = [...enKeys].filter((k) => !localeKeys.has(k));
		expect(missing).toEqual([]);
	});

	it.each(locales)("$code has no extra keys not in en.json", ({ data }) => {
		const localeKeys = new Set(flatten(data));
		const extra = [...localeKeys].filter((k) => !enKeys.has(k));
		expect(extra).toEqual([]);
	});
});
