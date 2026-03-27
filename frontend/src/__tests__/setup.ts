/**
 * Vitest setup file: fix Node.js 25 localStorage conflict.
 *
 * Node 25 ships a built-in `globalThis.localStorage` that is a plain
 * object (no setItem/getItem/removeItem) unless `--localstorage-file`
 * is provided.  Happy-dom provides a proper Storage implementation
 * but Node's built-in sometimes shadows it.  We detect and fix this.
 */

if (
	typeof globalThis.localStorage === "object" &&
	typeof globalThis.localStorage.setItem !== "function"
) {
	const store = new Map<string, string>();

	const storage: Storage = {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		key(index: number) {
			return [...store.keys()][index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};

	Object.defineProperty(globalThis, "localStorage", {
		value: storage,
		configurable: true,
		writable: true,
	});
}
