import { describe, expect, it, vi } from "vitest";
import { getLanguageSupport, languageDisplayName } from "../localize.js";

describe("getLanguageSupport", () => {
	it("marks a shipped base language available", () => {
		expect(getLanguageSupport({ language: "en" })).toEqual({
			available: true,
			code: "en",
			baseCode: "en",
		});
	});

	it("marks a shipped language available", () => {
		expect(getLanguageSupport({ locale: { language: "es" } }).available).toBe(
			true,
		);
	});

	it("covers a region variant via its shipped base (es-MX -> es)", () => {
		expect(getLanguageSupport({ locale: { language: "es-MX" } })).toEqual({
			available: true,
			code: "es-MX",
			baseCode: "es",
		});
	});

	it("marks Czech available once its catalogue ships", () => {
		expect(getLanguageSupport({ locale: { language: "cs" } })).toEqual({
			available: true,
			code: "cs",
			baseCode: "cs",
		});
		expect(getLanguageSupport({ locale: { language: "cs-CZ" } })).toEqual({
			available: true,
			code: "cs-CZ",
			baseCode: "cs",
		});
	});

	it("marks an unshipped language unavailable and keeps the full locale", () => {
		expect(getLanguageSupport({ locale: { language: "pt-BR" } })).toEqual({
			available: false,
			code: "pt-BR",
			baseCode: "pt",
		});
	});

	it("prefers locale.language over the top-level language", () => {
		expect(
			getLanguageSupport({ locale: { language: "fr" }, language: "en" }).code,
		).toBe("fr");
	});

	it("treats an undeterminable language as available (nothing to nudge)", () => {
		expect(getLanguageSupport(undefined)).toEqual({
			available: true,
			code: "",
			baseCode: "",
		});
		expect(getLanguageSupport({}).available).toBe(true);
	});
});

describe("languageDisplayName", () => {
	it("returns the native, region-qualified name", () => {
		expect(languageDisplayName("pt-BR")).toBe("português (Brasil)");
	});

	it("returns the native name for a base language", () => {
		expect(languageDisplayName("fr")).toBe("français");
	});

	it("falls back to the raw code when Intl.DisplayNames throws", () => {
		const spy = vi.spyOn(Intl, "DisplayNames").mockImplementation(() => {
			throw new Error("unsupported");
		});
		expect(languageDisplayName("fr")).toBe("fr");
		spy.mockRestore();
	});

	it("falls back to the English name when the native DisplayNames throws", () => {
		let callCount = 0;
		const spy = vi.spyOn(Intl, "DisplayNames").mockImplementation(function (
			this: unknown,
		) {
			callCount++;
			if (callCount === 1) {
				throw new Error("unsupported");
			}
			return { of: () => "French" } as unknown as Intl.DisplayNames;
		});
		expect(languageDisplayName("fr")).toBe("French");
		spy.mockRestore();
	});

	it("falls back to the English name when the native lookup just echoes the code", () => {
		// Intl.DisplayNames defaults to fallback:"code": an unknown tag returns
		// the code itself. The native attempt must not accept that — the English
		// name should still win (e.g. "tlh" → "Klingon").
		let callCount = 0;
		const spy = vi.spyOn(Intl, "DisplayNames").mockImplementation(function (
			this: unknown,
		) {
			callCount++;
			// 1st call = native ([code]) echoes the code; 2nd = English name.
			return {
				of: () => (callCount === 1 ? "tlh" : "Klingon"),
			} as unknown as Intl.DisplayNames;
		});
		expect(languageDisplayName("tlh")).toBe("Klingon");
		spy.mockRestore();
	});

	it("returns an empty string unchanged", () => {
		expect(languageDisplayName("")).toBe("");
	});
});
