import { IntlMessageFormat } from "intl-messageformat";
import cs from "./translations/cs.json";
import en from "./translations/en.json";
import es from "./translations/es.json";

const LANGUAGES: Record<string, Record<string, unknown>> = { cs, en, es };

type Params = Record<string, string | number>;

export interface LocalizeFn {
	(key: string, params?: Params): string;
	formatNumber: (value: number, decimals?: number) => string;
	lang: string;
}

/**
 * Default LocalizeFn used as the property initializer in components — returns
 * the key itself and uses `toFixed` for formatting. Replaced by
 * `setupLocalize(hass)` once the panel has a real hass object.
 */
export const defaultLocalize: LocalizeFn = Object.assign(
	((k: string) => k) as LocalizeFn,
	{
		formatNumber: (v: number, d = 1) => v.toFixed(d),
		lang: "en",
	},
);

function resolve(
	obj: Record<string, unknown>,
	path: string,
): string | undefined {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return typeof current === "string" ? current : undefined;
}

export function setupLocalize(hass?: {
	locale?: { language?: string };
	language?: string;
}): LocalizeFn {
	const requested = hass?.locale?.language ?? hass?.language ?? "en";
	const base = requested.split("-")[0];
	const lang = LANGUAGES[requested] ? requested : LANGUAGES[base] ? base : "en";
	const strings = LANGUAGES[lang];
	const fallback = LANGUAGES.en;

	// Cap the cache so a stream of unique formats (e.g. user-supplied data
	// echoed into a translation key) can't grow unbounded. The translation
	// catalogue is well under this size, so normal use stays warm.
	const FORMAT_CACHE_CAP = 256;
	// `null` entries mark patterns whose IntlMessageFormat constructor threw
	// (a permanently malformed ICU pattern), so repeated calls return raw
	// immediately instead of paying the constructor/throw cost on every render
	// tick. format()-time failures are intentionally NOT cached — those are
	// usually call-site bugs (missing param) that recover once fixed.
	const formatCache = new Map<string, IntlMessageFormat | null>();
	const numberCache = new Map<number, Intl.NumberFormat>();

	const cacheSet = (key: string, value: IntlMessageFormat | null): void => {
		if (formatCache.size >= FORMAT_CACHE_CAP && !formatCache.has(key)) {
			// Evict the oldest entry. Map iteration is in insertion order.
			const oldest = formatCache.keys().next().value;
			if (oldest !== undefined) formatCache.delete(oldest);
		}
		formatCache.set(key, value);
	};

	const localize = ((key: string, params?: Params): string => {
		const raw =
			resolve(strings as Record<string, unknown>, key) ??
			resolve(fallback as Record<string, unknown>, key) ??
			key;

		if (!params) return raw;

		let fmt: IntlMessageFormat | null | undefined;
		if (formatCache.has(raw)) {
			fmt = formatCache.get(raw);
			if (fmt === null) return raw; // known bad — skip the throw
		} else {
			try {
				fmt = new IntlMessageFormat(raw, lang);
			} catch {
				// Malformed ICU pattern — cache the failure so we don't
				// re-throw on every subsequent call with the same key.
				cacheSet(raw, null);
				return raw;
			}
			cacheSet(raw, fmt);
		}
		try {
			return (fmt as IntlMessageFormat).format(params) as string;
		} catch {
			// format() failures are usually call-site bugs (e.g. missing
			// param for a plural). Don't cache — once the caller fixes the
			// params, subsequent calls should succeed. The compiled format
			// instance stays in the cache, so we don't pay the constructor
			// cost again on retry.
			return raw;
		}
	}) as LocalizeFn;

	localize.formatNumber = (value: number, decimals = 1): string => {
		let fmt = numberCache.get(decimals);
		if (!fmt) {
			fmt = new Intl.NumberFormat(lang, {
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals,
			});
			numberCache.set(decimals, fmt);
		}
		return fmt.format(value);
	};

	localize.lang = lang;

	return localize;
}

export interface LanguageSupport {
	/** True when the catalogue can serve this user (exact locale or its base). */
	available: boolean;
	/** Full requested locale, e.g. "pt-BR" (region preserved). */
	code: string;
	/** Base language, e.g. "pt". */
	baseCode: string;
}

/**
 * Whether the frontend ships a translation for the user's HA language. Mirrors
 * the exact-then-base resolution in `setupLocalize`, so a shipped base (`es`)
 * covers its region variants (`es-MX`). Identity is the FULL requested locale
 * so region-specific catalogues (`pt-BR`) and requests stay distinct. When the
 * language can't be determined, returns available:true (nothing to nudge).
 */
export function getLanguageSupport(hass?: {
	locale?: { language?: string };
	language?: string;
}): LanguageSupport {
	const code = hass?.locale?.language ?? hass?.language ?? "";
	if (!code) return { available: true, code: "", baseCode: "" };
	const baseCode = code.split("-")[0];
	const available = Boolean(LANGUAGES[code]) || Boolean(LANGUAGES[baseCode]);
	return { available, code, baseCode };
}

/**
 * The language's own name, region-qualified ("português (Brasil)"), via
 * Intl.DisplayNames. Falls back to the English name, then the raw code.
 */
export function languageDisplayName(code: string): string {
	if (!code) return code;
	try {
		const native = new Intl.DisplayNames([code], { type: "language" }).of(code);
		// `Intl.DisplayNames` defaults to fallback:"code", so an unknown tag
		// echoes the code back. Treat that as "no native name" so the English
		// fallback below still gets a chance (e.g. "tlh" → "Klingon").
		if (native && native !== code) return native;
	} catch {
		/* old runtime / invalid code — fall through */
	}
	try {
		const english = new Intl.DisplayNames(["en"], { type: "language" }).of(
			code,
		);
		if (english) return english;
	} catch {
		/* fall through to raw code */
	}
	return code;
}
