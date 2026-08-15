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
		} else if (
			p.endsWith(".ts") &&
			!p.endsWith(".d.ts") &&
			// Test files legitimately register stub elements (ha-switch, ha-input…)
			// without a guard; only production source is in scope.
			!p.endsWith(".test.ts")
		) {
			acc.push(p);
		}
	}
	return acc;
}

describe("custom element registration guard (issue #366)", () => {
	it("guards every customElements.define() in production source", () => {
		// The build emits two self-contained bundles (panel + card) from
		// overlapping source, so a shared component's customElements.define()
		// runs once per bundle. On the second run the browser throws
		// "the name '<el>' has already been used with this registry"; thrown at
		// module-eval time it aborts panel bootstrap and blanks the screen
		// (issue #366). Every define MUST be wrapped in
		// `if (!customElements.get("<name>")) { ... }` so the second call is a
		// no-op. This scans source rather than the runtime because the collision
		// only reproduces with two bundles on one registry — which the unit
		// suite (one bundle, loaded once) never exercises.
		const offenders: string[] = [];
		for (const file of walk(SRC_DIR)) {
			const src = readFileSync(file, "utf8");
			for (const m of src.matchAll(
				/customElements\.define\(\s*["']([\w-]+)["']/g,
			)) {
				const name = m[1];
				const guarded = new RegExp(
					`!\\s*customElements\\.get\\(\\s*["']${name}["']`,
				).test(src);
				if (!guarded) offenders.push(`${relative(SRC_DIR, file)} → "${name}"`);
			}
		}
		expect(
			offenders,
			"Unguarded customElements.define() found. Wrap each in `if " +
				'(!customElements.get("<name>")) { customElements.define(...) }` so a ' +
				"second registration — the panel and card bundles both define shared " +
				"elements on one registry — is a no-op instead of a thrown " +
				"DOMException that blanks the panel (issue #366).",
		).toEqual([]);
	});
});
