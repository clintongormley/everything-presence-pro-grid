import { describe, expect, it } from "vitest";
import {
	contrastRatio,
	FURNITURE_TONE_CSS,
	furnitureContrast,
	isRgbTriple,
	parseRgb,
	relativeLuminance,
} from "../furniture-contrast.js";

describe("relativeLuminance", () => {
	it("is 0 for black and 1 for white", () => {
		expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
		expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
	});
	it("matches the known luminance of pure red", () => {
		expect(relativeLuminance([255, 0, 0])).toBeCloseTo(0.2126, 4);
	});
});

describe("contrastRatio", () => {
	it("is 21 for black vs white", () => {
		expect(contrastRatio(0, 1)).toBeCloseTo(21, 5);
	});
	it("is 1 for identical luminances", () => {
		expect(contrastRatio(0.5, 0.5)).toBe(1);
	});
});

describe("isRgbTriple", () => {
	it("accepts a finite 3-number array", () => {
		expect(isRgbTriple([18, 48, 71])).toBe(true);
	});
	it("rejects wrong length, non-numbers and NaN", () => {
		expect(isRgbTriple([1, 2])).toBe(false);
		expect(isRgbTriple([1, 2, "3"])).toBe(false);
		expect(isRgbTriple([1, 2, Number.NaN])).toBe(false);
		expect(isRgbTriple(undefined)).toBe(false);
	});
	it("rejects a fully-sparse array (every() skips holes → vacuous true)", () => {
		expect(isRgbTriple(new Array(3))).toBe(false);
	});
});

describe("furnitureContrast", () => {
	it("uses the dark tone on a light background", () => {
		const r = furnitureContrast([255, 255, 255]);
		expect(r.tone).toBe("dark");
		expect(r.color).toBe(FURNITURE_TONE_CSS.dark.color);
		expect(r.halo).toBe(FURNITURE_TONE_CSS.dark.halo);
	});
	it("uses the light tone on dark backgrounds", () => {
		expect(furnitureContrast([0, 0, 0]).tone).toBe("light");
		expect(furnitureContrast([18, 48, 71]).tone).toBe("light"); // reported dark navy
	});
	it("uses the light tone on a mid teal", () => {
		expect(furnitureContrast([47, 111, 106]).tone).toBe("light");
	});
	it("uses the dark tone on a light grey", () => {
		expect(furnitureContrast([200, 200, 200]).tone).toBe("dark");
	});
});

describe("parseRgb", () => {
	it("parses rgb() and rgba(), comma- or space-separated", () => {
		expect(parseRgb("rgb(18, 48, 71)")).toEqual([18, 48, 71]);
		expect(parseRgb("rgba(238, 242, 247, 0.9)")).toEqual([238, 242, 247]);
		expect(parseRgb("rgb(18 48 71)")).toEqual([18, 48, 71]);
	});
	it("returns null for anything it can't parse", () => {
		expect(parseRgb("")).toBeNull();
		expect(parseRgb("transparent")).toBeNull();
		expect(parseRgb("linear-gradient(0deg, #fff, #000)")).toBeNull();
	});
});
