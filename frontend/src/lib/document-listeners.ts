/**
 * A named document/window-level listener registration.
 *
 * Handlers are typically declared as `(e: Event)` and narrow inside (e.g.
 * `(e as KeyboardEvent).key`) — addEventListener's listener type is the
 * widened `Event` signature, so per-event-type handler types would need
 * casts at every spec site instead.
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
 *
 * Declaration-order constraint: class fields initialise in declaration
 * order, so a group field must be declared AFTER the handler fields it
 * references — otherwise the spec captures `undefined`. The constructor
 * fails loudly on that mistake (addEventListener with an undefined
 * listener would otherwise be a silent no-op and the popover would never
 * dismiss).
 */
export class DocumentListenerGroup {
	private _attached = false;

	constructor(private readonly _specs: ListenerSpec[]) {
		for (const s of _specs) {
			if (!s.listener) {
				throw new Error(
					`DocumentListenerGroup: listener for "${s.type}" is undefined — ` +
						"declare handler fields before the group that references them",
				);
			}
		}
	}

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
