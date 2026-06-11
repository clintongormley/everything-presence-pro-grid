import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = resolve(__dirname, "..");

function walk(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		const s = statSync(p);
		if (s.isDirectory()) {
			if (entry === "__tests__") continue;
			walk(p, acc);
		} else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) {
			acc.push(p);
		}
	}
	return acc;
}

describe("WeakRef usage guard", () => {
	it("production code under src/ does not use WeakRef", () => {
		// setup.ts replaces globalThis.WeakRef with a StrongRef for the whole
		// suite (the documented happy-dom MutationObserver GC workaround). Any
		// production code adopting WeakRef would silently get strong-reference
		// semantics under test — its real GC-dependent behavior would never be
		// exercised. WeakMap/WeakSet are unaffected and remain fine to use.
		const offenders: string[] = [];
		for (const file of walk(SRC_DIR)) {
			const src = readFileSync(file, "utf8");
			if (/\bWeakRef\b/.test(src)) {
				offenders.push(relative(SRC_DIR, file));
			}
		}
		expect(
			offenders,
			"WeakRef found in production source, but the test suite replaces " +
				"globalThis.WeakRef with a StrongRef (src/__tests__/setup.ts), so " +
				"WeakRef-dependent behavior is NOT tested as it runs in browsers. " +
				"Either avoid WeakRef or rework the setup.ts MutationObserver " +
				"workaround to stub happy-dom only, then update this guard.",
		).toEqual([]);
	});
});
