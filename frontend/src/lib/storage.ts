/**
 * localStorage keys and safe accessors for cross-tab panel state.
 *
 * View / sidebar-tab state is per-tab (URL fragment); only the
 * selected device mac is persisted across tabs.
 */

export const STORAGE_KEY_SELECTED_MAC = "epp_selected_mac";

export function readStoredMac(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY_SELECTED_MAC);
	} catch {
		return null;
	}
}

export function persistSelectedMac(mac: string): void {
	try {
		if (mac === "") {
			localStorage.removeItem(STORAGE_KEY_SELECTED_MAC);
		} else {
			localStorage.setItem(STORAGE_KEY_SELECTED_MAC, mac);
		}
	} catch {
		/* localStorage unavailable */
	}
}

/** JSON array of full locale codes (e.g. "pt-BR") the nudge was dismissed for. */
export const STORAGE_KEY_LANG_REQUEST_DISMISSED = "epp_lang_request_dismissed";

function readDismissedSet(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_LANG_REQUEST_DISMISSED);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((v): v is string => typeof v === "string")
			: [];
	} catch {
		return [];
	}
}

/** Whether the translation nudge was dismissed for this exact locale. */
export function isLangRequestDismissed(code: string): boolean {
	return readDismissedSet().includes(code);
}

/**
 * Remember that the user dismissed the nudge for `code`. Stores a set, so each
 * dismissed locale stays dismissed even after switching to (and dismissing)
 * another unshipped locale.
 */
export function persistDismissedLangRequest(code: string): void {
	try {
		const dismissed = readDismissedSet();
		if (dismissed.includes(code)) return;
		dismissed.push(code);
		localStorage.setItem(
			STORAGE_KEY_LANG_REQUEST_DISMISSED,
			JSON.stringify(dismissed),
		);
	} catch {
		/* localStorage unavailable */
	}
}

export const STORAGE_KEY_HEATMAP_ENABLED = "epp_heatmap_enabled_";

export function readHeatmapEnabled(mac: string): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY_HEATMAP_ENABLED + mac) === "1";
	} catch {
		return false;
	}
}

export function persistHeatmapEnabled(mac: string, enabled: boolean): void {
	try {
		localStorage.setItem(
			STORAGE_KEY_HEATMAP_ENABLED + mac,
			enabled ? "1" : "0",
		);
	} catch {
		/* localStorage unavailable */
	}
}
