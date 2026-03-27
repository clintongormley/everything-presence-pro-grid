import { LitElement, html, css, nothing } from "lit";
import { property } from "lit/decorators.js";
import { toggleStyles } from "../styles.js";
import {
	ZONE_TYPE_DEFAULTS,
	type ZoneConfig,
} from "../lib/zone-defaults.js";

export interface LocalZoneInfo {
	occupied: boolean;
	pendingSince: number | null;
	confirmedTargets: Set<number>;
}

export class EppZoneSidebar extends LitElement {
	@property({ attribute: false }) grid!: Uint8Array;
	@property({ attribute: false }) zoneConfigs: (ZoneConfig | null)[] = [];
	@property({ attribute: false }) activeZone: number | null = null;
	@property({ attribute: false }) roomType: ZoneConfig["type"] = "normal";
	@property({ attribute: false }) roomTrigger: number =
		ZONE_TYPE_DEFAULTS.normal.trigger;
	@property({ attribute: false }) roomRenew: number =
		ZONE_TYPE_DEFAULTS.normal.renew;
	@property({ attribute: false }) roomTimeout: number =
		ZONE_TYPE_DEFAULTS.normal.timeout;
	@property({ attribute: false }) roomHandoffTimeout: number =
		ZONE_TYPE_DEFAULTS.normal.handoff_timeout;
	@property({ attribute: false }) roomEntryPoint = false;
	@property({ attribute: false }) localZoneState: Map<number, LocalZoneInfo> =
		new Map();
	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	static styles = [
		toggleStyles,
		css`
			:host {
				display: block;
			}

			.zone-name-input {
				flex: 1;
				border: none;
				border-bottom: 1px solid var(--divider-color, #e0e0e0);
				background: transparent;
				font-size: 14px;
				color: var(--primary-text-color, #212121);
				padding: 2px 4px;
				min-width: 0;
			}

			.zone-name-input:focus {
				outline: none;
				border-bottom: 1px solid var(--primary-color, #03a9f4);
			}

			.sensitivity-select {
				padding: 2px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
				cursor: pointer;
				flex-shrink: 0;
			}

			.zone-color-picker {
				width: 24px;
				height: 24px;
				border: none;
				padding: 0;
				cursor: pointer;
				border-radius: 4px;
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
				gap: 4px;
				padding: 6px 8px;
				border-radius: 8px;
				cursor: pointer;
				border: 2px solid var(--divider-color, #e0e0e0);
				transition: border-color 0.2s;
			}

			.zone-item:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.zone-item.active {
				border-color: var(--primary-color, #03a9f4);
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-settings-row {
				padding-left: 24px;
				gap: 6px;
			}

			.zone-separator {
				border: none;
				border-top: 1px solid var(--divider-color, #e0e0e0);
				margin: 4px 0;
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
				font-size: 14px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
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
				color: var(--primary-color, #03a9f4);
				cursor: pointer;
				font-size: 14px;
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

	private _renderZoneSidebar() {
		return html`
			<div class="zone-scroll-area">
				<!-- Room -->
				<div
					class="zone-item ${this.activeZone === 0 ? "active" : ""}"
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
					<div class="zone-item-row">
						<div
							class="zone-color-dot"
							style="background: #fff; border: 1px solid #ccc;${this.localZoneState.get(0)?.occupied ? " box-shadow: 0 0 6px 2px #999;" : ""}"
						></div>
						<span class="zone-name"
							>${this.localize("sidebar.room")}</span
						>
					</div>
					${this.activeZone === 0
						? html` ${this._renderBoundaryTypeControls()} `
						: nothing}
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
							<div class="zone-item-row">
								${this.activeZone === slot
									? html`
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(slot)?.occupied ? ` box-shadow: 0 0 6px 2px ${zone.color};` : ""}"
												.value=${zone.color}
												@input=${(e: Event) => {
													const val = (
														e.target as HTMLInputElement
													).value;
													this.dispatchEvent(
														new CustomEvent(
															"zone-config-change",
															{
																detail: {
																	index: i,
																	updates: {
																		color: val,
																	},
																},
																bubbles: true,
																composed: true,
															},
														),
													);
													this.dispatchEvent(
														new CustomEvent("dirty", {
															bubbles: true,
															composed: true,
														}),
													);
												}}
												@click=${(e: Event) =>
													e.stopPropagation()}
											/>
										`
									: html`
											<div
												class="zone-color-dot"
												style="background: ${zone.color};${this.localZoneState.get(slot)?.occupied ? ` box-shadow: 0 0 6px 2px ${zone.color};` : ""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									.value=${zone.name}
									@input=${(e: Event) => {
										const val = (
											e.target as HTMLInputElement
										).value;
										this.dispatchEvent(
											new CustomEvent(
												"zone-config-change",
												{
													detail: {
														index: i,
														updates: { name: val },
													},
													bubbles: true,
													composed: true,
												},
											),
										);
										this.dispatchEvent(
											new CustomEvent("dirty", {
												bubbles: true,
												composed: true,
											}),
										);
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
								<button
									class="zone-remove-btn"
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
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							${this.activeZone === slot
								? html`
										${this._renderZoneTypeControls(zone, i)}
									`
								: nothing}
						</div>
					`;
				})}

				${this.zoneConfigs.some((z) => z === null)
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
					: nothing}
			</div>
		`;
	}

	private _renderBoundaryTypeControls() {
		const isCustom = this.roomType === "custom";
		const defaults =
			ZONE_TYPE_DEFAULTS[this.roomType] || ZONE_TYPE_DEFAULTS.normal;
		const trigger = isCustom ? this.roomTrigger : defaults.trigger;
		const renew = isCustom ? this.roomRenew : defaults.renew;
		const timeout = isCustom ? this.roomTimeout : defaults.timeout;
		const handoffTimeout = isCustom
			? this.roomHandoffTimeout
			: defaults.handoff_timeout;
		const rowStyle = `width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};`;
		return html`
			<div
				class="zone-item-row zone-settings-row"
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
						.value=${this.roomType}
						@change=${(e: Event) => {
							const val = (e.target as HTMLSelectElement)
								.value as ZoneConfig["type"];
							const d =
								ZONE_TYPE_DEFAULTS[val] ||
								ZONE_TYPE_DEFAULTS.normal;
							this.dispatchEvent(
								new CustomEvent("room-config-change", {
									detail: {
										updates: {
											roomType: val,
											roomTrigger: d.trigger,
											roomRenew: d.renew,
											roomTimeout: d.timeout,
											roomHandoffTimeout:
												d.handoff_timeout,
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					>
						<option value="normal">
							${this.localize("zones.normal")}
						</option>
						<option value="entrance">
							${this.localize("zones.entrance")}
						</option>
						<option value="thoroughfare">
							${this.localize("zones.thoroughfare")}
						</option>
						<option value="rest">
							${this.localize("zones.rest_area")}
						</option>
						<option value="custom">
							${this.localize("zones.custom")}
						</option>
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
						.value=${String(trigger)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this.dispatchEvent(
								new CustomEvent("room-config-change", {
									detail: {
										updates: {
											roomTrigger: Number(
												(e.target as HTMLInputElement)
													.value,
											),
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${trigger}</span
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
						.value=${String(renew)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this.dispatchEvent(
								new CustomEvent("room-config-change", {
									detail: {
										updates: {
											roomRenew: Number(
												(e.target as HTMLInputElement)
													.value,
											),
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${renew}</span
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
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(timeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number(
								(e.target as HTMLInputElement).value,
							);
							if (v > 0) {
								this.dispatchEvent(
									new CustomEvent("room-config-change", {
										detail: {
											updates: { roomTimeout: v },
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}
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
						.value=${String(handoffTimeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number(
								(e.target as HTMLInputElement).value,
							);
							if (v > 0) {
								this.dispatchEvent(
									new CustomEvent("room-config-change", {
										detail: {
											updates: {
												roomHandoffTimeout: v,
											},
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};"
				>
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.entry_point")}</label
					>
					<span style="flex: 1;"></span>
					<label class="toggle-switch">
						<input
							type="checkbox"
							?checked=${isCustom ? this.roomEntryPoint : false}
							?disabled=${!isCustom}
							@change=${(e: Event) => {
								this.dispatchEvent(
									new CustomEvent("room-config-change", {
										detail: {
											updates: {
												roomEntryPoint: (
													e.target as HTMLInputElement
												).checked,
											},
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}}
							@click=${(e: Event) => e.stopPropagation()}
						/>
						<span class="toggle-slider"></span>
					</label>
					<span style="width: 10px;"></span>
				</div>
			</div>
		`;
	}

	private _renderZoneTypeControls(zone: ZoneConfig, index: number) {
		const isCustom = zone.type === "custom";
		const defaults =
			ZONE_TYPE_DEFAULTS[zone.type] || ZONE_TYPE_DEFAULTS.normal;
		const trigger = zone.trigger ?? defaults.trigger;
		const renew = zone.renew ?? defaults.renew;
		const timeout = zone.timeout ?? defaults.timeout;
		const handoffTimeout = zone.handoff_timeout ?? defaults.handoff_timeout;
		const rowStyle = `width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};`;
		return html`
			<div
				class="zone-item-row zone-settings-row"
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
						.value=${zone.type}
						@change=${(e: Event) => {
							const val = (e.target as HTMLSelectElement)
								.value as ZoneConfig["type"];
							const d =
								ZONE_TYPE_DEFAULTS[val] ||
								ZONE_TYPE_DEFAULTS.normal;
							this.dispatchEvent(
								new CustomEvent("zone-config-change", {
									detail: {
										index,
										updates: {
											type: val,
											trigger: d.trigger,
											renew: d.renew,
											timeout: d.timeout,
											handoff_timeout: d.handoff_timeout,
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					>
						<option value="normal">
							${this.localize("zones.normal")}
						</option>
						<option value="entrance">
							${this.localize("zones.entrance")}
						</option>
						<option value="thoroughfare">
							${this.localize("zones.thoroughfare")}
						</option>
						<option value="rest">
							${this.localize("zones.rest_area")}
						</option>
						<option value="custom">
							${this.localize("zones.custom")}
						</option>
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
						.value=${String(trigger)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this.dispatchEvent(
								new CustomEvent("zone-config-change", {
									detail: {
										index,
										updates: {
											trigger: Number(
												(e.target as HTMLInputElement)
													.value,
											),
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${trigger}</span
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
						.value=${String(renew)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							this.dispatchEvent(
								new CustomEvent("zone-config-change", {
									detail: {
										index,
										updates: {
											renew: Number(
												(e.target as HTMLInputElement)
													.value,
											),
										},
									},
									bubbles: true,
									composed: true,
								}),
							);
							this.dispatchEvent(
								new CustomEvent("dirty", {
									bubbles: true,
									composed: true,
								}),
							);
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${renew}</span
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
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(timeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number(
								(e.target as HTMLInputElement).value,
							);
							if (v > 0) {
								this.dispatchEvent(
									new CustomEvent("zone-config-change", {
										detail: {
											index,
											updates: { timeout: v },
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}
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
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(handoffTimeout)}
						?disabled=${!isCustom}
						@input=${(e: Event) => {
							const v = Number(
								(e.target as HTMLInputElement).value,
							);
							if (v > 0) {
								this.dispatchEvent(
									new CustomEvent("zone-config-change", {
										detail: {
											index,
											updates: { handoff_timeout: v },
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}
						}}
						@click=${(e: Event) => e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${isCustom ? 1 : 0.5};"
				>
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.entry_point")}</label
					>
					<span style="flex: 1;"></span>
					<label class="toggle-switch">
						<input
							type="checkbox"
							?checked=${isCustom ? (zone.entry_point ?? false) : zone.type === "entrance"}
							?disabled=${!isCustom}
							@change=${(e: Event) => {
								this.dispatchEvent(
									new CustomEvent("zone-config-change", {
										detail: {
											index,
											updates: {
												entry_point: (
													e.target as HTMLInputElement
												).checked,
											},
										},
										bubbles: true,
										composed: true,
									}),
								);
								this.dispatchEvent(
									new CustomEvent("dirty", {
										bubbles: true,
										composed: true,
									}),
								);
							}}
							@click=${(e: Event) => e.stopPropagation()}
						/>
						<span class="toggle-slider"></span>
					</label>
					<span style="width: 10px;"></span>
				</div>
			</div>
		`;
	}
}

if (!customElements.get("epp-zone-sidebar")) {
	customElements.define("epp-zone-sidebar", EppZoneSidebar);
}
