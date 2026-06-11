/**
 * A named document/window-level listener registration.
 */
export interface ListenerSpec {
	target: EventTarget;
	type: string;
	listener: EventListenerOrEventListenerObject;
	options?: boolean | AddEventListenerOptions;
}

/**
 * A group of document/window-level listeners with an attach()/detach()
 * lifecycle.
 *
 * Components that open transient popovers (settings tooltips, the wizard's
 * capture overlay, the flasher's OTA error popover) need global listeners
 * for dismissal (Escape / outside-click / scroll / resize) only while the
 * popover is open, and must reliably remove them on close AND on element
 * disconnect. Hand-rolling the add/remove pairs plus an "attached" guard in
 * every component drifted (each view tracked its own flag); this helper
 * centralises it. Both attach() and detach() are idempotent so lifecycle
 * callbacks can call them unconditionally.
 */
export class DocumentListenerGroup {
	private _attached = false;

	constructor(private readonly _specs: ListenerSpec[]) {}

	get attached(): boolean {
		return this._attached;
	}

	attach(): void {
		if (this._attached) return;
		for (const s of this._specs) {
			s.target.addEventListener(s.type, s.listener, s.options);
		}
		this._attached = true;
	}

	detach(): void {
		if (!this._attached) return;
		for (const s of this._specs) {
			s.target.removeEventListener(s.type, s.listener, s.options);
		}
		this._attached = false;
	}
}
