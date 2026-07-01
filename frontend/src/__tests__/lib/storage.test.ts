import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	isLangRequestDismissed,
	persistDismissedLangRequest,
	persistHeatmapEnabled,
	persistSelectedMac,
	readHeatmapEnabled,
	readStoredMac,
	STORAGE_KEY_LANG_REQUEST_DISMISSED,
	STORAGE_KEY_SELECTED_MAC,
} from "../../lib/storage.js";

describe("lib/storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("readStoredMac", () => {
		it("returns null when nothing is stored", () => {
			expect(readStoredMac()).toBeNull();
		});

		it("returns the stored mac", () => {
			localStorage.setItem(STORAGE_KEY_SELECTED_MAC, "aa:bb:cc");
			expect(readStoredMac()).toBe("aa:bb:cc");
		});

		it("returns null when localStorage throws", () => {
			const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
				throw new Error("blocked");
			});
			expect(readStoredMac()).toBeNull();
			spy.mockRestore();
		});
	});

	describe("persistSelectedMac", () => {
		it("writes the mac", () => {
			persistSelectedMac("aa:bb:cc");
			expect(localStorage.getItem(STORAGE_KEY_SELECTED_MAC)).toBe("aa:bb:cc");
		});

		it("removes the key when passed an empty string", () => {
			localStorage.setItem(STORAGE_KEY_SELECTED_MAC, "aa:bb:cc");
			persistSelectedMac("");
			expect(localStorage.getItem(STORAGE_KEY_SELECTED_MAC)).toBeNull();
		});

		it("swallows errors when localStorage is unavailable", () => {
			const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
				throw new Error("blocked");
			});
			expect(() => persistSelectedMac("aa:bb:cc")).not.toThrow();
			spy.mockRestore();
		});
	});

	describe("language-request dismissal", () => {
		it("reports nothing dismissed initially", () => {
			expect(isLangRequestDismissed("fr")).toBe(false);
		});

		it("round-trips a dismissed locale code", () => {
			persistDismissedLangRequest("pt-BR");
			expect(isLangRequestDismissed("pt-BR")).toBe(true);
		});

		it("remembers multiple dismissed locales independently", () => {
			persistDismissedLangRequest("fr");
			persistDismissedLangRequest("de");
			expect(isLangRequestDismissed("fr")).toBe(true);
			expect(isLangRequestDismissed("de")).toBe(true);
			expect(isLangRequestDismissed("es")).toBe(false);
		});

		it("does not duplicate a re-dismissed locale", () => {
			persistDismissedLangRequest("fr");
			persistDismissedLangRequest("fr");
			expect(
				JSON.parse(
					localStorage.getItem(STORAGE_KEY_LANG_REQUEST_DISMISSED) ?? "[]",
				),
			).toEqual(["fr"]);
		});

		it("reports false when localStorage throws on read", () => {
			const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
				throw new Error("blocked");
			});
			expect(isLangRequestDismissed("fr")).toBe(false);
			spy.mockRestore();
		});

		it("swallows errors when localStorage throws on write", () => {
			const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
				throw new Error("blocked");
			});
			expect(() => persistDismissedLangRequest("fr")).not.toThrow();
			spy.mockRestore();
		});
	});

	describe("heatmap-enabled persistence", () => {
		beforeEach(() => localStorage.clear());

		it("defaults to false when unset", () => {
			expect(readHeatmapEnabled("AA:BB")).toBe(false);
		});

		it("round-trips per mac", () => {
			persistHeatmapEnabled("AA:BB", true);
			expect(readHeatmapEnabled("AA:BB")).toBe(true);
			expect(readHeatmapEnabled("CC:DD")).toBe(false);
			persistHeatmapEnabled("AA:BB", false);
			expect(readHeatmapEnabled("AA:BB")).toBe(false);
		});
	});

	afterEach(() => {
		localStorage.clear();
	});
});
