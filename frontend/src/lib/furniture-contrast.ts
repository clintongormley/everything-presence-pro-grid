// Furniture is a single global colour drawn via `currentColor`. When the user
// picks a custom room colour, the fixed grey stops contrasting. This module
// picks whichever of two fixed tones contrasts best with the room colour, and
// pairs it with an opposite-tone halo so the line-art stays legible even where
// furniture overlaps a bright zone.

/** The two fixed furniture tones. These RGB values mirror the
 *  `--epp-furniture-on-*` token defaults in `ui/tokens.ts`; the luminance math
 *  below uses them to decide which tone contrasts best with a room colour. */
const LIGHT_TONE: [number, number, number] = [238, 242, 247]; // #eef2f7
const DARK_TONE: [number, number, number] = [40, 48, 60]; // #28303c

export type FurnitureTone = "light" | "dark";

/** Tone → the CSS colour + halo strings applied by the overlay. Fallbacks match
 *  the token defaults so it renders correctly even if a host omits the tokens. */
export const FURNITURE_TONE_CSS: Record<
	FurnitureTone,
	{ color: string; halo: string }
> = {
	// light furniture on a dark room → dark halo
	light: {
		color: "var(--epp-furniture-on-dark, #eef2f7)",
		halo: "var(--epp-furniture-halo-on-dark, rgba(0, 0, 0, 0.85))",
	},
	// dark furniture on a light room → light halo
	dark: {
		color: "var(--epp-furniture-on-light, #28303c)",
		halo: "var(--epp-furniture-halo-on-light, rgba(255, 255, 255, 0.95))",
	},
};

/** WCAG relative luminance of an sRGB colour (0 = black … 1 = white). */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
	const lin = (c: number): number => {
		// Clamp to [0, 1] so out-of-range channels (hand-written config can supply
		// them) match how CSS clamps rgb() when it renders the background.
		const s = Math.min(1, Math.max(0, c / 255));
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two relative luminances (1 … 21). */
export function contrastRatio(l1: number, l2: number): number {
	const hi = Math.max(l1, l2);
	const lo = Math.min(l1, l2);
	return (hi + 0.05) / (lo + 0.05);
}

/** True when `v` is a valid `[r, g, b]` triple of finite numbers. Hand-written
 *  YAML can supply a malformed value the TS type does not enforce. */
export function isRgbTriple(v: unknown): v is [number, number, number] {
	if (!Array.isArray(v) || v.length !== 3) return false;
	// Explicit per-index check rather than `.every()`, which skips holes in a
	// sparse array (`new Array(3)`) and would validate it as a triple.
	return (
		typeof v[0] === "number" &&
		Number.isFinite(v[0]) &&
		typeof v[1] === "number" &&
		Number.isFinite(v[1]) &&
		typeof v[2] === "number" &&
		Number.isFinite(v[2])
	);
}

/** Parse a computed `rgb(r, g, b)` / `rgba(r, g, b, a)` string (comma- or
 *  space-separated) to an `[r, g, b]` triple. Returns null for anything
 *  unparseable (`""`, `transparent`, a gradient) so callers keep the default
 *  look rather than picking a tone from garbage. */
export function parseRgb(css: string): [number, number, number] | null {
	const m = /^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i.exec(css);
	if (!m) return null;
	const rgb: [number, number, number] = [
		Number(m[1]),
		Number(m[2]),
		Number(m[3]),
	];
	return isRgbTriple(rgb) ? rgb : null;
}

/** Precomputed luminance of the two fixed tones — they never change, so there's
 *  no need to recompute them on every call. */
const LIGHT_TONE_LUM = relativeLuminance(LIGHT_TONE);
const DARK_TONE_LUM = relativeLuminance(DARK_TONE);

/** Pick the furniture tone (and its colour + halo CSS) that contrasts best with
 *  `rgb`: light furniture on dark rooms, dark furniture on light rooms. */
export function furnitureContrast(rgb: [number, number, number]): {
	tone: FurnitureTone;
	color: string;
	halo: string;
} {
	const bg = relativeLuminance(rgb);
	const lightRatio = contrastRatio(bg, LIGHT_TONE_LUM);
	const darkRatio = contrastRatio(bg, DARK_TONE_LUM);
	const tone: FurnitureTone = lightRatio >= darkRatio ? "light" : "dark";
	return { tone, ...FURNITURE_TONE_CSS[tone] };
}
