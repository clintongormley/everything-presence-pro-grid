import {
	mdiWifiStrength1Lock,
	mdiWifiStrength1LockOpen,
	mdiWifiStrength2Lock,
	mdiWifiStrength2LockOpen,
	mdiWifiStrength3Lock,
	mdiWifiStrength3LockOpen,
	mdiWifiStrength4Lock,
	mdiWifiStrength4LockOpen,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { literal, html as staticHtml } from "lit/static-html.js";
import type { WifiNetwork } from "../lib/improv-serial.js";
import { defaultLocalize, type LocalizeFn } from "../localize.js";
import type {
	FlashableDevice,
	OtaDeviceState,
	UsbFlashState,
} from "../types.js";

const WIFI_ICONS_LOCK = [
	mdiWifiStrength1Lock,
	mdiWifiStrength2Lock,
	mdiWifiStrength3Lock,
	mdiWifiStrength4Lock,
];
const WIFI_ICONS_OPEN = [
	mdiWifiStrength1LockOpen,
	mdiWifiStrength2LockOpen,
	mdiWifiStrength3LockOpen,
	mdiWifiStrength4LockOpen,
];

function wifiIconPath(rssi: number, authRequired: boolean): string {
	const level = rssi >= -50 ? 3 : rssi >= -65 ? 2 : rssi >= -75 ? 1 : 0;
	return authRequired ? WIFI_ICONS_LOCK[level] : WIFI_ICONS_OPEN[level];
}

const flasherStyles = css`
  :host {
    display: block;
    padding: 16px;
  }

  .flasher-content {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card-header {
    font-size: 18px;
    font-weight: 400;
    line-height: 48px;
    padding: 8px 16px 0;
    color: var(--ha-card-header-color, var(--primary-text-color, #212121));
  }

  .card-content {
    padding: 16px;
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    min-height: 60px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
  }
  .device-info-faded {
    opacity: 0.5;
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-mac {
    font-weight: 400;
    color: var(--secondary-text-color, #757575);
  }
  .device-host {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .firmware-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .firmware-badge-original {
    background: color-mix(in srgb, var(--warning-color, #ff9800) 12%, transparent);
    color: var(--warning-color, #ff9800);
  }

  .firmware-badge-offline {
    background: color-mix(in srgb, var(--secondary-text-color, #757575) 12%, transparent);
    color: var(--secondary-text-color, #757575);
  }

  .firmware-badge-behind {
    background: var(--warning-color, #ff9800);
    color: var(--text-primary-color, #fff);
  }

  .firmware-badge-online {
    background: color-mix(in srgb, var(--success-color, #4caf50) 12%, transparent);
    color: var(--success-color, #4caf50);
  }

  .firmware-badge-ahead {
    background: var(--info-color, #2196f3);
    color: var(--text-primary-color, #fff);
  }

  /* OTA progress indicators */
  .ota-progress {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }
  .ota-progress svg {
    transform: rotate(-90deg);
  }
  .ota-track {
    fill: none;
    stroke: var(--divider-color, #e0e0e0);
    stroke-width: 3;
  }
  .ota-fill {
    fill: none;
    stroke: var(--primary-color, #03a9f4);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  .ota-pct {
    position: absolute;
    font-size: 10px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }
  .ota-spinner {
    width: 31px;
    height: 31px;
    border: 3px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color, #03a9f4);
    border-radius: 50%;
    box-sizing: border-box;
    animation: ota-spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes ota-spin {
    to { transform: rotate(360deg); }
  }
  .ota-success {
    --mdc-icon-size: 36px;
    color: var(--success-color, #4caf50);
    flex-shrink: 0;
  }
  .ota-error {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    flex-shrink: 0;
  }
  .ota-error-icon {
    --mdc-icon-size: 20px;
    color: var(--error-color, #f44336);
    cursor: pointer;
  }
  .ota-error-popover {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: var(--error-color, #f44336);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
    margin-bottom: 4px;
  }

  .integration-version {
    font-size: 0.8em;
    font-weight: normal;
    opacity: 0.7;
    margin-left: 8px;
  }

  .update-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    margin-bottom: 16px;
    background: var(--info-color, #2196f3);
    color: white;
    border-radius: 8px;
  }
  .update-banner ha-icon {
    --mdc-icon-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .update-banner p {
    margin: 4px 0 8px;
  }
  .update-banner .update-link {
    color: white;
    font-weight: 500;
    text-decoration: underline;
  }

  .usb-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 8px;
  }

  .usb-icon {
    --mdc-icon-size: 32px;
    color: var(--secondary-text-color, #757575);
    flex-shrink: 0;
  }

  .usb-section-text {
    flex: 1;
    min-width: 0;
  }

  .usb-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .usb-description {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .usb-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .usb-action {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .usb-action:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .usb-action ha-icon {
    --mdc-icon-size: 28px;
    color: var(--primary-color, #03a9f4);
    flex-shrink: 0;
  }

  .usb-action-text {
    flex: 1;
    min-width: 0;
  }

  .usb-action-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .usb-action-desc {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .usb-connect-btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    flex-shrink: 0;
  }

  .usb-flash-iframe {
    display: block;
    width: 100%;
    height: 500px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin: 16px 0;
    background: var(--card-background-color, #fff);
  }

  .browser-warning {
    margin-top: 8px;
    font-size: 12px;
    color: var(--warning-color, #ff9800);
  }

  .usb-select-label {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
  }

  .usb-error {
    text-align: center;
    padding: 24px 0;
    color: var(--error-color, #f44336);
  }

  .usb-error ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 8px;
  }

  .usb-error p {
    margin: 0;
    font-size: 14px;
  }

  .usb-complete {
    text-align: center;
    padding: 24px 0;
    color: var(--success-color, #4caf50);
    max-width: 400px;
    margin: 0 auto;
  }

  .usb-complete ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 16px;
  }

  .usb-complete p {
    margin: 4px 0;
    font-size: 14px;
  }

  .usb-ip {
    color: var(--primary-text-color, #212121);
    font-weight: 500;
    margin-top: 4px;
  }

  .ha-add-result {
    color: var(--secondary-text-color);
    font-size: 14px;
    margin-top: 8px;
  }

  .usb-status {
    text-align: center;
    padding: 24px 0;
  }

  .usb-status p {
    margin: 0;
    font-size: 14px;
    color: var(--primary-text-color, #212121);
  }

  .usb-hint {
    margin-top: 12px !important;
    font-size: 12px !important;
    color: var(--secondary-text-color, #757575) !important;
  }

  .wifi-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  ha-select,
  ha-input,
  ha-textfield {
    width: 100%;
  }

  .usb-progress {
    margin-top: 16px;
    background: var(--divider-color, #e0e0e0);
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }

  .usb-progress-bar {
    height: 100%;
    background: var(--primary-color, #03a9f4);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .usb-progress span {
    display: block;
    text-align: center;
    margin-top: 8px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
  }

  .flasher-loading {
    padding: 32px 24px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
    font-size: 14px;
  }

  .flasher-empty {
    padding: 24px 16px 32px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
  }

  .flasher-empty ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .flasher-empty p {
    margin: 0;
    font-size: 14px;
  }

  .variant-selector {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }


  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .ha-add-progress {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    color: var(--secondary-text-color);
    font-size: 14px;
  }

  .wifi-override-row {
    margin-top: 12px;
    text-align: center;
  }

  .wifi-override-link {
    color: var(--primary-color);
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.9em;
  }

  .wifi-override-link:hover {
    opacity: 0.8;
  }

  .cancelled-ip-hint {
    padding: 10px 14px;
    margin-bottom: 12px;
    background: var(--info-color, #3b82f6);
    color: var(--text-primary-color, white);
    border-radius: 4px;
    font-size: 0.9em;
  }

`;

export class EppFlasherView extends LitElement {
	static styles = [flasherStyles];

	@property({ attribute: false }) flashableDevices: FlashableDevice[] = [];
	@property({ type: Boolean }) loading = false;
	@property({ attribute: false }) localize: LocalizeFn = defaultLocalize;

	@state() private _selectedVariant: "wifi" | "ethernet" = "wifi";
	@property() firmwareBaseUrl = "";
	@property() firmwareVersion = "";
	@property() integrationVersion = "";
	@property({ attribute: false }) usbFlashState: UsbFlashState | null = null;
	@property({ attribute: false }) wifiNetworks: WifiNetwork[] = [];
	@property({ attribute: false }) otaStates: Record<string, OtaDeviceState> =
		{};
	@property({ attribute: false }) cancelledDeviceIpHint: string | null = null;

	@state() private _hasWebSerial: boolean =
		typeof navigator !== "undefined" && "serial" in navigator;
	@state() private _showUsbFlash = false;
	@state() private _cancelling = false;

	// WiFi provisioning state
	@state() private _wifiScanning = false;
	@state() private _selectedSsid = "";
	@state() private _manualSsid = false;
	@state() private _wifiPassword = "";
	@state() private _showPassword = false;
	@state() private _wifiConnected = false;
	@state() private _deviceIp: string | null = null;
	@state() private _showWifiProvisioning = false;

	@state() private _errorPopoverMac: string | null = null;

	private _dispatchUpdateFirmware(device: FlashableDevice): void {
		this.dispatchEvent(
			new CustomEvent("update-firmware", {
				detail: { mac: device.mac },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _toggleErrorPopover(e: Event, mac: string): void {
		e.stopPropagation();
		this._errorPopoverMac = this._errorPopoverMac === mac ? null : mac;
	}

	private _dispatchRetryOta(device: FlashableDevice): void {
		this._errorPopoverMac = null;
		this.dispatchEvent(
			new CustomEvent("retry-ota", {
				detail: { mac: device.mac },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _renderOtaIndicator(
		device: FlashableDevice,
	): typeof nothing | ReturnType<typeof html> {
		const ota = this.otaStates[device.mac];
		if (!ota) return nothing;

		switch (ota.state) {
			case "updating": {
				if (ota.progress == null) {
					return html`<div class="ota-spinner"></div>`;
				}
				const radius = 14;
				const circumference = 2 * Math.PI * radius;
				const offset = circumference - (ota.progress / 100) * circumference;
				return html`
					<div class="ota-progress">
						<svg width="36" height="36" viewBox="0 0 36 36">
							<circle class="ota-track" cx="18" cy="18" r="${radius}" />
							<circle class="ota-fill" cx="18" cy="18" r="${radius}"
								stroke-dasharray="${circumference}"
								stroke-dashoffset="${offset}" />
						</svg>
						<span class="ota-pct">${Math.round(ota.progress)}</span>
					</div>`;
			}
			case "success":
				return html`<ha-icon class="ota-success" icon="mdi:check-circle"></ha-icon>`;
			case "error": {
				return html`
					<div class="ota-error">
						<ha-icon class="ota-error-icon"
							icon="mdi:alert-circle"
							@click=${(e: Event) => this._toggleErrorPopover(e, device.mac)}
						></ha-icon>
						${
							device.available
								? html`<ha-button
									@click=${() => this._dispatchRetryOta(device)}>
									${this.localize("flasher.ota_retry")}
								</ha-button>`
								: nothing
						}
						${
							this._errorPopoverMac === device.mac
								? html`<div class="ota-error-popover">${ota.errorKey ? this.localize(ota.errorKey, ota.errorParams) : ""}</div>`
								: nothing
						}
					</div>`;
			}
		}
	}

	private _onUsbConnect(): void {
		this._showUsbFlash = true;
	}

	private _dispatchFlashComplete(): void {
		this.dispatchEvent(
			new CustomEvent("flash-complete", { bubbles: true, composed: true }),
		);
	}

	private _dispatchUsbFlash(): void {
		this.dispatchEvent(
			new CustomEvent("usb-flash", {
				detail: { variant: this._getFirmwareVariant() },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _dispatchUsbRetry(): void {
		this.dispatchEvent(
			new CustomEvent("usb-retry", { bubbles: true, composed: true }),
		);
	}

	private _dispatchRetryHaAdd(): void {
		this.dispatchEvent(
			new CustomEvent("retry-ha-add", { bubbles: true, composed: true }),
		);
	}

	private _dispatchCancel(): void {
		// Cancel from the variant picker (no in-flight op) exits the USB
		// flash view to the device list. Cancel mid-flow keeps the user on
		// the flash screen with a "Cancelling…" button so it's obvious the
		// click registered: the controller's resetUsbState clears
		// usbFlashState only AFTER the aborted op settles and the serial
		// port closes (~1-2s), and that clear is what re-renders the
		// variant picker.
		if (this.usbFlashState == null) {
			this._showUsbFlash = false;
		} else {
			this._cancelling = true;
		}
		this._wifiPassword = "";
		this.dispatchEvent(
			new CustomEvent("flasher-cancel", { bubbles: true, composed: true }),
		);
	}

	updated(changed: Map<string, unknown>): void {
		// Reset _cancelling once the controller has cleared usbFlashState —
		// resetUsbState defers that clear until the aborted op has settled
		// and the serial port is closed, so this fires only after the
		// teardown actually finished.
		if (changed.has("usbFlashState") && this.usbFlashState == null) {
			this._cancelling = false;
		}
	}

	/** Render a Cancel button that flips to "Cancelling…" while the
	 *  controller unwinds the in-flight op + serial port (~1-2s). Without
	 *  this feedback the button appears unresponsive even though the click
	 *  registered. */
	private _renderCancelButton(extraClass?: string) {
		const label = this._cancelling
			? this.localize("flasher.cancelling")
			: this.localize("flasher.cancel");
		const cls = extraClass ?? "";
		return html`<ha-button
			class=${cls}
			@click=${this._dispatchCancel}
			?disabled=${this._cancelling}
		>${label}</ha-button>`;
	}

	private async _copyIp(ip: string): Promise<void> {
		if (!ip || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(ip);
		} catch (err) {
			console.error("failed to copy IP", err);
		}
	}

	private _dispatchWifiScan(): void {
		this.dispatchEvent(
			new CustomEvent("wifi-scan", { bubbles: true, composed: true }),
		);
	}

	private _dispatchWifiProvision(): void {
		this.dispatchEvent(
			new CustomEvent("wifi-provision", {
				detail: { ssid: this._selectedSsid, password: this._wifiPassword },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _dispatchWifiComplete(): void {
		this.dispatchEvent(
			new CustomEvent("wifi-complete", { bubbles: true, composed: true }),
		);
	}

	private _renderLoading() {
		return html`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`;
	}

	private _renderWifiProvisioning() {
		if (this._wifiConnected) {
			return html`
        <div class="flasher-content">
          <ha-card>
            <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
            <div class="card-content">
              <div class="usb-complete">
                <ha-icon icon="mdi:wifi-check"></ha-icon>
                <p>${this.localize("flasher.connected_to", { ssid: this._selectedSsid })}</p>
                ${this._deviceIp ? html`<p class="usb-ip">${this.localize("flasher.ip_address", { ip: this._deviceIp })}</p>` : nothing}
              </div>
              <div class="confirm-actions">
                <ha-button appearance="accent" @click=${this._dispatchWifiComplete}>
                  ${this.localize("flasher.continue")}
                </ha-button>
              </div>
            </div>
          </ha-card>
        </div>
      `;
		}

		const sortedNetworks = [...this.wifiNetworks].sort(
			(a, b) => b.rssi - a.rssi,
		);
		const showManual = this._manualSsid || sortedNetworks.length === 0;

		return html`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
          <div class="card-content wifi-form">

            ${
							sortedNetworks.length > 0
								? html`
                <ha-select
                  .label=${this.localize("flasher.select_a_network")}
                  .value=${this._selectedSsid}
                  .options=${sortedNetworks.map((n) => ({
										value: n.ssid,
										label: n.ssid,
										iconPath: wifiIconPath(n.rssi, n.authRequired),
									}))}
                  @selected=${(e: CustomEvent<{ value: string }>) => {
										if (e.detail.value !== this._selectedSsid) {
											this._wifiPassword = "";
										}
										this._selectedSsid = e.detail.value;
										this._manualSsid = false;
									}}
                  @closed=${(e: Event) => e.stopPropagation()}
                ></ha-select>
              `
								: nothing
						}

            <ha-formfield .label=${this.localize("flasher.manual_ssid")}>
              <ha-checkbox
                .checked=${showManual}
                @change=${(e: Event) => {
									this._manualSsid = (e.target as any).checked;
									if (!this._manualSsid) this._selectedSsid = "";
									this._wifiPassword = "";
								}}
              ></ha-checkbox>
            </ha-formfield>

            ${(() => {
							// ha-input shipped in HA 2026.4 and replaces ha-textfield (removed in
							// 2026.5). Fall back to ha-textfield on older HA where ha-input isn't
							// registered yet — the integration's hacs.json still supports 2025.2+.
							const inputTag = customElements.get("ha-input")
								? literal`ha-input`
								: literal`ha-textfield`;
							const ssidField = showManual
								? staticHtml`
                <${inputTag}
                  .label=${this.localize("flasher.enter_ssid")}
                  autocomplete="off"
                  .value=${this._selectedSsid}
                  @input=${(e: Event) => {
										this._selectedSsid = (e.target as any).value;
									}}
                ></${inputTag}>
              `
								: nothing;
							const passwordField = staticHtml`
              <${inputTag}
                .label=${this.localize("flasher.wifi_password")}
                type=${this._showPassword ? "text" : "password"}
                autocomplete="new-password"
                .value=${this._wifiPassword}
                @input=${(e: Event) => {
									this._wifiPassword = (e.target as any).value;
								}}
              ></${inputTag}>
            `;
							return html`${ssidField}${passwordField}`;
						})()}

            <ha-formfield
              data-show-password
              .label=${this.localize("flasher.show_password")}
            >
              <ha-checkbox
                .checked=${this._showPassword}
                @change=${(e: Event) => {
									this._showPassword = (e.target as any).checked;
								}}
              ></ha-checkbox>
            </ha-formfield>

            <div class="confirm-actions">
              ${this._renderCancelButton()}
              <ha-button @click=${this._dispatchWifiScan}>
                ${this._wifiScanning ? this.localize("flasher.scanning") : this.localize("flasher.scan")}
              </ha-button>
              <ha-button
                appearance="accent"
                .disabled=${!this._selectedSsid}
                @click=${this._dispatchWifiProvision}
              >
                ${this.localize("flasher.connect")}
              </ha-button>
            </div>
          </div>
        </ha-card>
      </div>
    `;
	}

	private _renderDeviceList() {
		const { flashableDevices } = this;
		const hasAheadDevices = flashableDevices.some(
			(d) =>
				d.firmware_type === "eppgrid" && d.firmware_status === "firmware_ahead",
		);

		return html`
      <div class="flasher-content">
        ${
					hasAheadDevices
						? html`
          <div class="update-banner">
            <ha-icon icon="mdi:information"></ha-icon>
            <div>
              <strong>${this.localize("flasher.integration_outdated_title")}</strong>
              <p>${this.localize("flasher.integration_outdated_body")}</p>
              <a href="/hacs/repository/1172848595" class="update-link">${this.localize("flasher.open_hacs")}</a>
            </div>
          </div>
        `
						: nothing
				}
        <ha-card>
          <div class="card-header">
            ${this.localize("flasher.devices_on_network")}
            ${this.integrationVersion ? html`<span class="integration-version">v${this.integrationVersion}</span>` : nothing}
          </div>
          <div class="card-content">
            ${
							flashableDevices.length === 0
								? html`<div class="flasher-empty">
                  <ha-icon icon="mdi:access-point-off"></ha-icon>
                  <p>${this.localize("flasher.no_devices")}</p>
                </div>`
								: html`
                <div class="device-list">
                  ${flashableDevices.map((device) => {
										const isFaded =
											!device.available || device.firmware_type === "original";
										return html`
                      <div class="device-row">
                        <div class="device-info${isFaded ? " device-info-faded" : ""}">
                          <div class="device-name">${device.name} <span class="device-mac">(${device.mac.replace(/:/g, "").slice(-6).toLowerCase()})</span></div>
                          <div class="device-host">${device.host ?? this.localize("flasher.offline")}${
														device.firmware_type === "eppgrid" &&
														device.firmware_version &&
														device.firmware_version !== "unknown"
															? ` - v${device.firmware_version}`
															: ""
													}</div>
                        </div>
                        ${
													!device.available
														? html`<span class="firmware-badge firmware-badge-offline">${this.localize("flasher.offline")}</span>`
														: nothing
												}
                        ${
													device.firmware_type === "eppgrid" &&
													device.available &&
													!this.otaStates[device.mac] &&
													!device.update_available &&
													(
														device.firmware_status === "compatible" ||
															device.firmware_status === "firmware_ahead"
													)
														? html`<span class="firmware-badge firmware-badge-online">${this.localize("flasher.online")}</span>`
														: nothing
												}
                        ${
													device.firmware_type === "original"
														? html`<span class="firmware-badge firmware-badge-original">${this.localize("flasher.flash_usb")}</span>`
														: nothing
												}
                        ${
													device.firmware_type === "eppgrid" &&
													device.firmware_status === "firmware_ahead"
														? html`<span class="firmware-badge firmware-badge-ahead">${this.localize("flasher.integration_update")}</span>`
														: nothing
												}
                        ${
													this.otaStates[device.mac]
														? this._renderOtaIndicator(device)
														: device.firmware_type === "eppgrid" &&
																(device.update_available ||
																	device.firmware_status === "firmware_behind")
															? html`<ha-button
																		appearance="accent"
																		@click=${() => this._dispatchUpdateFirmware(device)}
																	>${this.localize("flasher.update")}</ha-button>`
															: nothing
												}
                      </div>
                    `;
									})}
                </div>
              `
						}
          </div>
        </ha-card>
        ${this._renderUsbSection()}
      </div>
    `;
	}

	private _dispatchUsbWifiConfig(): void {
		this.dispatchEvent(
			new CustomEvent("usb-wifi-config", { bubbles: true, composed: true }),
		);
	}

	private _renderUsbSection() {
		return html`
      <ha-card>
        <div class="card-header">${this.localize("flasher.usb_title")}</div>
        <div class="card-content">
          ${
						!this._hasWebSerial
							? html`<div class="browser-warning">
                ${this.localize("flasher.usb_browser_warning")}
              </div>`
							: nothing
					}
          <div class="usb-actions">
            <div class="usb-action" @click=${this._onUsbConnect}>
              <ha-icon icon="mdi:chip"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_flash_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_flash_desc")}</div>
              </div>
            </div>
            <div class="usb-action" @click=${this._dispatchUsbWifiConfig}>
              <ha-icon icon="mdi:wifi-cog"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_wifi_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_wifi_desc")}</div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
	}

	render() {
		if (this.loading) {
			return this._renderLoading();
		}

		if (this._showWifiProvisioning) {
			return this._renderWifiProvisioning();
		}

		if (this._showUsbFlash || this.usbFlashState) {
			return this._renderUsbFlash();
		}

		return this._renderDeviceList();
	}

	private _getFirmwareVariant(): string {
		return this._selectedVariant === "wifi"
			? "wifi-ble-co2"
			: "ethernet-ble-co2";
	}

	private _getManifestUrl(): string {
		const variant = this._getFirmwareVariant();
		return `${this.firmwareBaseUrl}/everything-presence-pro-${variant}-manifest.json`;
	}

	private _renderUsbFlash() {
		const state = this.usbFlashState;

		// WiFi provisioning
		if (state?.step === "wifi_provision") {
			return this._renderWifiProvisioning();
		}

		// Error state
		if (state?.step === "error") {
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-error">
								<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
								<p>${state.errorKey ? this.localize(state.errorKey, state.errorParams) : ""}</p>
							</div>
							<div class="confirm-actions">
								<ha-button @click=${this._dispatchCancel}>
									${this.localize("flasher.start_over")}
								</ha-button>
								${
									state.fatal
										? nothing
										: html`<ha-button appearance="accent" @click=${this._dispatchUsbRetry}>
									${this.localize("flasher.usb_retry")}
								</ha-button>`
								}
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// WiFi configured — HA-add in progress
		if (state?.step === "wifi_configured") {
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon="mdi:check-circle-outline"></ha-icon>
								<p>${this.localize("flasher.wifi_configured")}</p>
								${state.ip ? html`<p class="usb-ip">${this.localize("flasher.ip_address", { ip: state.ip })}</p>` : nothing}
							</div>
							<div class="ha-add-progress">
								<ha-circular-progress indeterminate size="small"></ha-circular-progress>
								<span>
									${
										state.haAddAttempt !== undefined &&
										state.haAddMaxAttempts !== undefined
											? this.localize("flasher.ha_add.retrying", {
													attempt: state.haAddAttempt,
													max: state.haAddMaxAttempts,
												})
											: this.localize("flasher.ha_add.adding")
									}
								</span>
							</div>
							${
								state.autoSkipped
									? html`<div class="wifi-override-row">
										<ha-button
											class="wifi-override-link"
											appearance="plain"
											@click=${this._dispatchWifiScan}
										>
											${this.localize("flasher.configure_wifi_override")}
										</ha-button>
									</div>`
									: nothing
							}
							<div class="confirm-actions">
								${this._renderCancelButton()}
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// Complete state
		if (state?.step === "complete") {
			const isEthernet = state.variant?.startsWith("ethernet");
			if (isEthernet) {
				return html`
					<div class="flasher-content">
						<ha-card>
							<div class="card-content">
								<div class="usb-complete">
									<ha-icon icon="mdi:check-circle-outline"></ha-icon>
									<p>${this.localize("flasher.usb_ethernet_complete")}</p>
									<p>${this.localize("flasher.usb_ethernet_hint")}</p>
								</div>
								<div class="confirm-actions">
									<a href="/config/devices/dashboard">
										<ha-button appearance="accent">${this.localize("flasher.go_to_devices")}</ha-button>
									</a>
								</div>
							</div>
						</ha-card>
					</div>
				`;
			}

			const ip = state.ip;
			const haAdd = state.haAdd;
			const success =
				haAdd?.type === "added" || haAdd?.type === "already_added";
			const icon = success ? "mdi:check-circle-outline" : "mdi:alert-outline";
			const haAddKey = haAdd?.type ?? "failed";
			const reason =
				haAdd?.type === "failed" ? (haAdd.reason ?? "unknown") : "";

			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon=${icon}></ha-icon>
								<p>${this.localize("flasher.wifi_configured")}</p>
								${
									ip
										? html`<p class="usb-ip">${this.localize("flasher.ip_address", { ip })}</p>`
										: nothing
								}
								<p class="ha-add-result">
									${this.localize(`flasher.ha_add.${haAddKey}`, { reason })}
								</p>
							</div>
							<div class="confirm-actions">
								${
									success
										? html`<ha-button appearance="accent" @click=${this._dispatchFlashComplete}>
										${this.localize("flasher.go_to_config")}
									</ha-button>`
										: haAdd?.type === "needs_auth"
											? html`<a href="/config/integrations/dashboard">
											<ha-button appearance="accent">${this.localize("flasher.go_to_integrations")}</ha-button>
										</a>`
											: html`
											<ha-button @click=${() => this._copyIp(ip ?? "")}>
												${this.localize("flasher.copy_ip")}
											</ha-button>
											<ha-button appearance="accent" @click=${this._dispatchRetryHaAdd}>
												${this.localize("flasher.retry_ha_add")}
											</ha-button>
										`
								}
								<ha-button @click=${this._dispatchCancel}>
									${this.localize("flasher.flash_another")}
								</ha-button>
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// In-progress states (connecting, flashing, wifi_check, wifi_scan, reading_ip, wifi_connecting)
		if (state && state.step !== "idle") {
			const stepKeyMap: Record<string, string> = {
				connecting: "flasher.usb_step_connecting",
				flashing: "flasher.usb_step_flashing",
				wifi_check: "flasher.usb_step_wifi_check",
				wifi_scan: "flasher.usb_step_scanning",
				wifi_provision: "flasher.usb_step_provisioning",
				wifi_connecting: "flasher.usb_step_wifi_connecting",
				reading_ip: "flasher.usb_step_reading_ip",
			};
			const stepKey = stepKeyMap[state.step] ?? state.step;
			const stepParams =
				state.step === "flashing"
					? { version: this.firmwareVersion }
					: undefined;
			// Cancel is not offered during `flashing` (risk of bricking) or
			// during `connecting` (native picker is modal).
			const canCancel =
				state.step !== "flashing" && state.step !== "connecting";
			return html`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-status">
								<p>${this.localize(stepKey, stepParams)}</p>
								${
									state.step === "flashing" && state.progress != null
										? html`<div class="usb-progress">
											<div class="usb-progress-bar" style="width: ${state.progress}%"></div>
											<span>${state.progress}%</span>
										</div>`
										: nothing
								}
								${
									state.step === "wifi_scan"
										? html`<p class="usb-hint">${this.localize("flasher.wifi_scan_hint")}</p>`
										: nothing
								}
								${
									canCancel
										? html`<div class="confirm-actions">
											${this._renderCancelButton("cancel-btn")}
										</div>`
										: nothing
								}
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		// Idle state — variant selector + flash button
		return html`
			<div class="flasher-content">
				${
					this.cancelledDeviceIpHint
						? html`<div class="cancelled-ip-hint">
							${this.localize("flasher.cancelled_ip_hint", { ip: this.cancelledDeviceIpHint })}
						</div>`
						: nothing
				}
				<ha-card>
					<div class="card-header">
						${this.localize("flasher.title")}
						${this.firmwareVersion ? html`<code>${this.firmwareVersion}</code>` : nothing}
					</div>
					<div class="card-content">
						<p class="usb-select-label">${this.localize("flasher.select_variant")}</p>
						<div class="variant-selector">
							<ha-button
								class="${this._selectedVariant === "wifi" ? "selected" : "unselected"}"
								appearance="${this._selectedVariant === "wifi" ? "accent" : "outlined"}"
								@click=${() => {
									this._selectedVariant = "wifi";
								}}
							>${this.localize("flasher.wifi")}</ha-button>
							<ha-button
								class="${this._selectedVariant === "ethernet" ? "selected" : "unselected"}"
								appearance="${this._selectedVariant === "ethernet" ? "accent" : "outlined"}"
								@click=${() => {
									this._selectedVariant = "ethernet";
								}}
							>${this.localize("flasher.ethernet")}</ha-button>
						</div>
						<div class="confirm-actions">
							${this._renderCancelButton()}
							<ha-button appearance="accent" @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</ha-button>
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}
}

if (!customElements.get("epp-flasher-view")) {
	customElements.define("epp-flasher-view", EppFlasherView);
}
