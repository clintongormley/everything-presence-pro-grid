import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import {
	resolveZoneParams,
	ZONE_PRESET_COLORS,
	ZONE_TYPE_KEYS,
	type Zone0Config,
	type ZoneConfig,
} from "../lib/zone-defaults.js";
import "./epp-zone-color-picker.js";
import type { ZoneState } from "../lib/zone-engine.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import { sidebarRowStyles } from "../styles.js";
import "../ui/epp-icon-button.js";

export class EppZoneSidebar extends LitElement {
	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ attribute: false }) zone0: Zone0Config = { type: "default" };
	@property({ attribute: false }) localZoneState: Map<number, ZoneState> =
		new Map();
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	// Debounce zone-name input so each keystroke doesn't trigger a full panel
	// re-render. The input keeps its DOM value as the user types; the parent
	// state catches up when typing pauses.
	private static NAME_DEBOUNCE_MS = 150;
	private _nameDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private _pendingNameUpdate: { index: number; name: string } | null = null;

	private _flushPendingName = (): void => {
		this._nameDebounceTimer = null;
		const pending = this._pendingNameUpdate;
		if (!pending) return;
		this._pendingNameUpdate = null;
		this.dispatchEvent(
			new CustomEvent("zone-config-change", {
				detail: { index: pending.index, updates: { name: pending.name } },
				bubbles: true,
				composed: true,
			}),
		);
	};

	private _onNameInput(index: number, name: string): void {
		this._pendingNameUpdate = { index, name };
		if (this._nameDebounceTimer !== null) clearTimeout(this._nameDebounceTimer);
		this._nameDebounceTimer = setTimeout(
			this._flushPendingName,
			EppZoneSidebar.NAME_DEBOUNCE_MS,
		);
	}

	// Colours in use by the OTHER named zones, for the in-use marker.
	private _usedColorsExcept(index: number): string[] {
		return this.zoneConfigs
			.filter((z, i): z is ZoneConfig => z !== null && i !== index)
			.map((z) => z.color);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		// Flush any pending update so unmounting within the debounce window
		// doesn't drop the user's last keystrokes.
		if (this._nameDebounceTimer !== null) {
			clearTimeout(this._nameDebounceTimer);
			this._flushPendingName();
		}
	}

	static styles = [
		sidebarRowStyles,
		css`
			:host {
				display: block;
			}

			.zone-name-input {
				flex: 1;
				border: none;
				border-bottom: 1px solid var(--divider-color, #e0e0e0);
				background: transparent;
				font-size: var(--epp-font-base, 14px);
				color: var(--primary-text-color, #212121);
				padding: 2px var(--epp-space-1, 4px);
				min-width: 0;
			}

			.zone-name-input:focus {
				outline: none;
				border-bottom: 1px solid var(--epp-accent, var(--primary-color, #03a9f4));
			}

			.sensitivity-select {
				padding: 2px var(--epp-space-1, 4px);
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: var(--epp-font-xs, 12px);
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
				cursor: pointer;
				flex-shrink: 0;
			}

			.zone-scroll-area {
				display: flex;
				flex-direction: column;
				gap: 6px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.zone-item {
				display: flex;
				flex-direction: column;
				gap: var(--epp-space-1, 4px);
				padding: 6px var(--epp-space-2, 8px);
				border-radius: 8px;
				cursor: pointer;
				border: 2px solid var(--divider-color, #e0e0e0);
				transition: border-color 0.2s;
			}

			.zone-item:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.zone-item.active {
				border-color: var(--epp-accent, var(--primary-color, #03a9f4));
			}

			/* Reset for the zone-0 row, which is a real <button> for keyboard
			   access (it has no interactive children, unlike named-zone rows). */
			button.sidebar-item-row {
				width: 100%;
				background: none;
				border: none;
				padding: 0;
				font: inherit;
				color: inherit;
				text-align: left;
				cursor: pointer;
			}

			.zone-settings-row {
				padding-left: 24px;
				gap: 6px;
			}

			.zone-separator {
				border: none;
				border-top: 1px solid var(--divider-color, #e0e0e0);
				margin: var(--epp-space-1, 4px) 0;
				flex-shrink: 0;
			}

			.zone-color-dot {
				width: 16px;
				height: 16px;
				border-radius: 50%;
				flex-shrink: 0;
			}

			.zone-name {
				flex: 1;
				font-size: var(--epp-font-base, 14px);
			}

			.add-zone-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 10px;
				border: 2px dashed var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: none;
				color: var(--epp-accent, var(--primary-color, #03a9f4));
				cursor: pointer;
				font-size: var(--epp-font-base, 14px);
				transition: background 0.2s;
			}

			.add-zone-btn:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}
		`,
	];

	render() {
		return this._renderZoneSidebar();
	}

	// A native <select>'s value can't be set via a property binding in the same
	// render that creates its <option>s — lit commits the select's bindings
	// before the options exist, so the browser falls back to the first option
	// ("Default"). We stamp the intended value as data-value (an attribute,
	// which commits fine) and sync select.value here, after the options exist.
	// The `!== want` guard skips the only real cost (the DOM write) on the
	// frequent no-op re-renders (e.g. live occupancy updates).
	updated() {
		for (const sel of this.renderRoot.querySelectorAll<HTMLSelectElement>(
			".sensitivity-select",
		)) {
			const want = sel.dataset.value;
			if (want != null && sel.value !== want) sel.value = want;
		}
	}

	private _renderZoneSidebar() {
		return html`
			<div class="zone-scroll-area">
				<!-- Room. The selectable row is a real <button> for keyboard
				     access; named-zone rows below can't be (they contain a name
				     <input> and a remove <button> — interactive content is
				     invalid inside a button — and already have a keyboard path
				     via the name input's focus handler). -->
				<div class="zone-item ${this.activeZone === 0 ? "active" : ""}">
					<button
						type="button"
						class="sidebar-item-row"
						@click=${() => {
							this.dispatchEvent(
								new CustomEvent("zone-select", {
									detail: { zone: 0 },
									bubbles: true,
									composed: true,
								}),
							);
						}}
					>
						<div
							class="zone-color-dot"
							style="background: #fff; border: 1px solid #ccc;${this.localZoneState.get(0)?.occupied ? " box-shadow: 0 0 6px 2px #999;" : ""}"
						></div>
						<span class="zone-name"
							>${this.localize("sidebar.room")}</span
						>
					</button>
					${
						this.activeZone === 0
							? html` ${this._renderBoundaryTypeControls()} `
							: nothing
					}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((zone, i) => {
					if (zone === null) return nothing;
					const slot = i + 1;
					return html`
						<div
							class="zone-item ${this.activeZone === slot ? "active" : ""}"
							@click=${() => {
								this.dispatchEvent(
									new CustomEvent("zone-select", {
										detail: { zone: slot },
										bubbles: true,
										composed: true,
									}),
								);
							}}
						>
							<div class="sidebar-item-row">
								${
									this.activeZone === slot
										? html`
											<epp-zone-color-picker
												.value=${zone.color}
												.presets=${ZONE_PRESET_COLORS}
												.usedColors=${this._usedColorsExcept(i)}
												.occupiedGlow=${this.localZoneState.get(slot)?.occupied ?? false}
												.localize=${this.localize}
												@value-changed=${(e: CustomEvent) => {
													e.stopPropagation();
													this.dispatchEvent(
														new CustomEvent("zone-config-change", {
															detail: {
																index: i,
																updates: { color: e.detail.value },
															},
															bubbles: true,
															composed: true,
														}),
													);
												}}
												@click=${(e: Event) => e.stopPropagation()}
											></epp-zone-color-picker>
										`
										: html`
											<div
												class="zone-color-dot"
												style="background: ${zone.color};${this.localZoneState.get(slot)?.occupied ? ` box-shadow: 0 0 6px 2px ${zone.color};` : ""}"
											></div>
										`
								}
								<input
									class="zone-name-input"
									type="text"
									?readonly=${this.activeZone !== slot}
									.value=${zone.name}
									@input=${(e: Event) => {
										const val = (e.target as HTMLInputElement).value;
										this._onNameInput(i, val);
									}}
									@blur=${() => {
										// Flush so a Save click that blurs the input doesn't race
										// the debounce and drop the last keystrokes.
										if (this._nameDebounceTimer !== null) {
											clearTimeout(this._nameDebounceTimer);
											this._flushPendingName();
										}
									}}
									@click=${(e: Event) => {
										e.stopPropagation();
										this.dispatchEvent(
											new CustomEvent("zone-select", {
												detail: { zone: slot },
												bubbles: true,
												composed: true,
											}),
										);
									}}
									@focus=${() => {
										this.dispatchEvent(
											new CustomEvent("zone-select", {
												detail: { zone: slot },
												bubbles: true,
												composed: true,
											}),
										);
									}}
								/>
								<epp-icon-button
									icon="mdi:close"
									label=${this.localize("zones.remove_zone")}
									variant="danger"
									class="sidebar-remove-btn"
									@click=${(e: Event) => {
										e.stopPropagation();
										this.dispatchEvent(
											new CustomEvent("zone-remove", {
												detail: { slot },
												bubbles: true,
												composed: true,
											}),
										);
									}}
								></epp-icon-button>
							</div>
							${
								this.activeZone === slot
									? html`
										${this._renderZoneTypeControls(zone, i)}
									`
									: nothing
							}
						</div>
					`;
				})}

				${
					this.zoneConfigs.some((z) => z === null)
						? html`
							<button
								class="add-zone-btn"
								@click=${() => {
									this.dispatchEvent(
										new CustomEvent("zone-add", {
											bubbles: true,
											composed: true,
										}),
									);
								}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`
						: nothing
				}

			</div>
		`;
	}

	private _emitZone0Change(updates: Partial<Zone0Config>) {
		this.dispatchEvent(
			new CustomEvent<Partial<Zone0Config>>("zone0-change", {
				detail: updates,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _renderBoundaryTypeControls() {
		return this._renderTypeControls(
			this.zone0,
			resolveZoneParams(this.zone0),
			(updates) => this._emitZone0Change(updates),
		);
	}

	private _renderZoneTypeControls(zone: ZoneConfig, index: number) {
		return this._renderTypeControls(
			zone,
			resolveZoneParams(zone),
			(updates) => {
				this.dispatchEvent(
					new CustomEvent("zone-config-change", {
						detail: { index, updates },
						bubbles: true,
						composed: true,
					}),
				);
			},
		);
	}

	/**
	 * Shared type/trigger/renew/timeout controls for zone 0 and named zones.
	 * Displayed values come from `resolved` (resolveZoneParams), never from
	 * raw stored fields: the engine uses type defaults EXCLUSIVELY for
	 * non-custom types, so legacy slots with stale stored timings must not
	 * display numbers that don't match behavior. (The two previous
	 * near-duplicate renderers diverged on exactly this point.)
	 */
	private _renderTypeControls(
		config: Zone0Config,
		resolved: ReturnType<typeof resolveZoneParams>,
		emit: (updates: Partial<Zone0Config>) => void,
	) {
		const isCustom = config.type === "custom";
		const rowStyle = `width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};`;
		// Markup min/max on number inputs are advisory only (typed values
		// bypass them) — clamp in the handler before emitting.
		const clampedEmit = (
			field: "timeout" | "handoff_timeout",
			raw: string,
			max: number,
		) => {
			const v = Number(raw);
			if (v > 0) {
				emit({ [field]: Math.min(Math.max(v, 1), max) });
			}
		};
		return html`
			<div
				class="sidebar-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						data-value=${config.type}
						@change=${(e: Event) => {
							const val = (e.target as HTMLSelectElement)
								.value as Zone0Config["type"];
							// Non-custom types resolve timing from ZONE_TYPE_DEFAULTS on
							// read; emit only the type so we don't persist dead data.
							// Switching INTO custom seeds the controls with the current
							// type's defaults so the user has a sane starting point.
							if (val === "custom") {
								emit({ ...resolved, type: val });
							} else {
								emit({
									type: val,
									trigger: undefined,
									renew: undefined,
									timeout: undefined,
									handoff_timeout: undefined,
								});
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					>
						${ZONE_TYPE_KEYS.map(
							(k) =>
								html`<option value=${k}>${this.localize(`zones.${k}`)}</option>`,
						)}
					</select>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(resolved.trigger)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							emit({ trigger: Number((e.target as HTMLInputElement).value) });
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${resolved.trigger}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(resolved.renew)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							emit({ renew: Number((e.target as HTMLInputElement).value) });
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${resolved.renew}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="3600"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(resolved.timeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							clampedEmit(
								"timeout",
								(e.target as HTMLInputElement).value,
								3600,
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${rowStyle}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(resolved.handoff_timeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							clampedEmit(
								"handoff_timeout",
								(e.target as HTMLInputElement).value,
								300,
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`;
	}
}

if (!customElements.get("epp-zone-sidebar")) {
	customElements.define("epp-zone-sidebar", EppZoneSidebar);
}
