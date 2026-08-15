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
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { literal, html as staticHtml } from "lit/static-html.js";
import { DocumentListenerGroup } from "../lib/document-listeners.js";
import { WEB_FLASHER_URL } from "../lib/help-url.js";
import "../ui/epp-button.js";
import "../ui/epp-field.js";
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
    padding: var(--epp-space-4, 16px);
  }

  .flasher-content {
    max-width: var(--epp-content-max, 720px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-4, 16px);
  }

  .card-header {
    font-size: var(--epp-font-xl, 18px);
    font-weight: var(--epp-weight-regular, 400);
    line-height: 48px;
    padding: var(--epp-space-2, 8px) var(--epp-space-4, 16px) 0;
    color: var(--ha-card-header-color, var(--epp-text, var(--primary-text-color, #212121)));
  }

  .card-header-split {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--epp-space-2, 8px);
  }

  .card-content {
    padding: var(--epp-space-4, 16px);
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-2, 8px);
    /* Cap the list so a long roster of devices scrolls inside the card instead
       of growing the page and pushing the USB Connection section off-screen. */
    max-height: 40vh;
    overflow-y: auto;
  }

  .device-row {
    display: flex;
    align-items: center;
    /* Let the OTA error detail (flex-basis: 100%) wrap onto its own full-width
       line below the row, in normal flow — so it can't be clipped by the
       scrolling .device-list the way an absolute popover was. */
    flex-wrap: wrap;
    gap: var(--epp-space-3, 12px);
    padding: var(--epp-space-3, 12px) var(--epp-space-4, 16px);
    min-height: 60px;
    background: var(--epp-surface, var(--card-background-color, #fff));
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: var(--epp-radius-md, 10px);
  }
  .device-info-faded {
    opacity: 0.5;
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: var(--epp-font-base, 14px);
    font-weight: var(--epp-weight-medium, 500);
    color: var(--epp-text, var(--primary-text-color, #212121));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-mac {
    font-weight: var(--epp-weight-regular, 400);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }
  .device-host {
    font-size: var(--epp-font-xs, 12px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    margin-top: 2px;
  }

  .firmware-badge {
    font-size: 11px;
    font-weight: var(--epp-weight-semibold, 600);
    padding: 2px var(--epp-space-2, 8px);
    border-radius: var(--epp-radius-md, 10px);
    flex-shrink: 0;
  }

  .firmware-badge-original {
    background: color-mix(in srgb, var(--epp-warning, var(--warning-color, #ff9800)) 12%, transparent);
    color: var(--epp-warning, var(--warning-color, #ff9800));
  }

  .firmware-badge-offline {
    background: color-mix(in srgb, var(--epp-text-muted, var(--secondary-text-color, #757575)) 12%, transparent);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .firmware-badge-behind {
    background: var(--epp-warning, var(--warning-color, #ff9800));
    color: var(--text-primary-color, #fff);
  }

  .firmware-badge-online {
    background: color-mix(in srgb, var(--epp-success, var(--success-color, #4caf50)) 12%, transparent);
    color: var(--epp-success, var(--success-color, #4caf50));
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
    stroke: var(--epp-border, var(--divider-color, #e0e0e0));
    stroke-width: 3;
  }
  .ota-fill {
    fill: none;
    stroke: var(--epp-accent, var(--primary-color, #03a9f4));
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  .ota-pct {
    position: absolute;
    font-size: 10px;
    font-weight: var(--epp-weight-semibold, 600);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }
  .ota-spinner {
    width: 31px;
    height: 31px;
    border: 3px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-top-color: var(--epp-accent, var(--primary-color, #03a9f4));
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
    color: var(--epp-success, var(--success-color, #4caf50));
    flex-shrink: 0;
  }
  .ota-error {
    display: flex;
    align-items: center;
    gap: var(--epp-space-1, 4px);
    position: relative;
    flex-shrink: 0;
  }
  .ota-error-icon {
    --mdc-icon-size: 20px;
    color: var(--epp-danger, var(--error-color, #f44336));
    cursor: pointer;
  }
  .ota-error-detail {
    /* Full-width line below the row content (wraps via the row's flex-wrap),
       so the message flows in-document and is never clipped. */
    flex-basis: 100%;
    background: var(--epp-danger, var(--error-color, #f44336));
    color: white;
    padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
    border-radius: var(--epp-radius-sm, 6px);
    font-size: var(--epp-font-xs, 12px);
    line-height: 1.4;
  }

  .integration-version {
    font-size: 0.8em;
    font-weight: normal;
    opacity: 0.7;
    margin-left: var(--epp-space-2, 8px);
  }

  .update-banner {
    display: flex;
    align-items: flex-start;
    gap: var(--epp-space-3, 12px);
    padding: var(--epp-space-4, 16px);
    margin-bottom: var(--epp-space-4, 16px);
    background: var(--info-color, #2196f3);
    color: white;
    border-radius: var(--epp-radius-sm, 6px);
  }
  .update-banner ha-icon {
    --mdc-icon-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .update-banner p {
    margin: var(--epp-space-1, 4px) 0 var(--epp-space-2, 8px);
  }
  .update-banner .update-link {
    color: white;
    font-weight: var(--epp-weight-medium, 500);
    text-decoration: underline;
  }

  .usb-actions {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-3, 12px);
  }

  .usb-action {
    display: flex;
    align-items: center;
    gap: var(--epp-space-4, 16px);
    padding: var(--epp-space-4, 16px);
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: var(--epp-radius-md, 10px);
    cursor: pointer;
    transition: background 0.15s;
  }

  .usb-action:hover {
    background: var(--epp-surface-2, var(--secondary-background-color, #f5f5f5));
  }

  .usb-action-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .usb-action-disabled:hover {
    background: inherit;
  }

  .usb-action ha-icon {
    --mdc-icon-size: 28px;
    color: var(--epp-accent, var(--primary-color, #03a9f4));
    flex-shrink: 0;
  }

  .usb-action-text {
    flex: 1;
    min-width: 0;
  }

  .usb-action-title {
    font-size: var(--epp-font-base, 14px);
    font-weight: var(--epp-weight-medium, 500);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }

  .usb-action-desc {
    font-size: var(--epp-font-sm, 13px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    margin-top: 2px;
  }

  .browser-warning {
    margin-top: var(--epp-space-2, 8px);
    font-size: var(--epp-font-xs, 12px);
    color: var(--epp-warning, var(--warning-color, #ff9800));
  }

  .browser-warning-link {
    color: var(--epp-accent, var(--primary-color, #03a9f4));
    text-decoration: none;
  }

  .browser-warning-link:hover {
    text-decoration: underline;
  }

  .usb-select-label {
    margin: 0 0 var(--epp-space-3, 12px);
    font-size: var(--epp-font-base, 14px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .usb-error {
    text-align: center;
    padding: var(--epp-space-5, 24px) 0;
    color: var(--epp-danger, var(--error-color, #f44336));
  }

  .usb-error ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: var(--epp-space-2, 8px);
  }

  .usb-error p {
    margin: 0;
    font-size: var(--epp-font-base, 14px);
  }

  .usb-complete {
    text-align: center;
    padding: var(--epp-space-5, 24px) 0;
    color: var(--epp-success, var(--success-color, #4caf50));
    max-width: 400px;
    margin: 0 auto;
  }

  .usb-complete ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: var(--epp-space-4, 16px);
  }

  .usb-complete p {
    margin: var(--epp-space-1, 4px) 0;
    font-size: var(--epp-font-base, 14px);
  }

  .usb-ip {
    color: var(--epp-text, var(--primary-text-color, #212121));
    font-weight: var(--epp-weight-medium, 500);
    margin-top: var(--epp-space-1, 4px);
  }

  .ha-add-result {
    color: var(--epp-text-muted, var(--secondary-text-color));
    font-size: var(--epp-font-base, 14px);
    margin-top: var(--epp-space-2, 8px);
  }

  .usb-status {
    text-align: center;
    padding: var(--epp-space-5, 24px) 0;
  }

  .usb-status p {
    margin: 0;
    font-size: var(--epp-font-base, 14px);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }

  .usb-hint {
    margin-top: var(--epp-space-3, 12px) !important;
    font-size: var(--epp-font-xs, 12px) !important;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575)) !important;
  }

  .wifi-form {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-3, 12px);
  }

  ha-select,
  ha-input,
  ha-textfield {
    width: 100%;
  }

  .usb-progress {
    margin-top: var(--epp-space-4, 16px);
    background: var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }

  .usb-progress-bar {
    height: 100%;
    background: var(--epp-accent, var(--primary-color, #03a9f4));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .usb-progress span {
    display: block;
    text-align: center;
    margin-top: var(--epp-space-2, 8px);
    font-size: var(--epp-font-sm, 13px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .flasher-loading {
    padding: 32px var(--epp-space-5, 24px);
    text-align: center;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    font-size: var(--epp-font-base, 14px);
  }

  .flasher-empty {
    padding: var(--epp-space-5, 24px) var(--epp-space-4, 16px) 32px;
    text-align: center;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .flasher-empty ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: var(--epp-space-2, 8px);
    opacity: 0.5;
  }

  .flasher-empty p {
    margin: 0;
    font-size: var(--epp-font-base, 14px);
  }

  .variant-selector {
    display: flex;
    gap: var(--epp-space-3, 12px);
    margin-bottom: var(--epp-space-4, 16px);
  }


  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--epp-space-3, 12px);
  }

  .ha-add-progress {
    display: flex;
    align-items: center;
    gap: var(--epp-space-3, 12px);
    margin-top: var(--epp-space-4, 16px);
    color: var(--epp-text-muted, var(--secondary-text-color));
    font-size: var(--epp-font-base, 14px);
  }

  .cancelled-ip-hint {
    padding: 10px 14px;
    margin-bottom: var(--epp-space-3, 12px);
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
	@property() firmwareVersion = "";
	@property() integrationVersion = "";
	@property({ attribute: false }) usbFlashState: UsbFlashState | null = null;
	@property({ attribute: false }) wifiNetworks: WifiNetwork[] = [];
	@property({ attribute: false }) otaStates: Record<string, OtaDeviceState> =
		{};
	@property({ attribute: false }) cancelledDeviceIpHint: string | null = null;

	@state() private _hasWebSerial: boolean =
		typeof navigator !== "undefined" && "serial" in navigator;
	// navigator.serial is [SecureContext]-gated, so over plain HTTP it's absent
	// and _hasWebSerial is false. Track the secure-context flag separately so we
	// can tell the user *why* (insecure connection vs. unsupported browser).
	@state() private _isSecureContext: boolean =
		typeof window === "undefined" || window.isSecureContext;
	@state() private _showUsbFlash = false;
	@state() private _cancelling = false;

	// WiFi provisioning state (the provisioning screen itself is driven by
	// usbFlashState.step === "wifi_provision" from the controller)
	@state() private _selectedSsid = "";
	@state() private _manualSsid = false;
	@state() private _wifiPassword = "";
	@state() private _showPassword = false;

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

	/** A device the "Upgrade all" bulk action (and the per-row Update button)
	 * should offer to upgrade: eppgrid firmware, with no OTA entry yet this
	 * session (any `otaStates[mac]` — updating, succeeded, or errored — excludes
	 * it, since those rows show their own progress/retry indicator instead), and
	 * a newer version available. */
	private _isUpgradeable(device: FlashableDevice): boolean {
		return (
			device.firmware_type === "eppgrid" &&
			!this.otaStates[device.mac] &&
			(device.update_available || device.firmware_status === "firmware_behind")
		);
	}

	private _upgradeableDevices(): FlashableDevice[] {
		return this.flashableDevices.filter((d) => this._isUpgradeable(d));
	}

	private _dispatchUpdateAll(): void {
		this.dispatchEvent(
			new CustomEvent("update-all-firmware", {
				detail: { macs: this._upgradeableDevices().map((d) => d.mac) },
				bubbles: true,
				composed: true,
			}),
		);
	}

	// --- OTA error popover dismissal -------------------------------------
	// Global listeners live only while the popover is open: Escape, a
	// pointerdown outside the error indicator, or a scroll dismisses it
	// (matching the settings-view tooltip behaviour).

	private _closeErrorPopover = (): void => {
		if (this._errorPopoverMac !== null) this._errorPopoverMac = null;
		this._popoverListeners.detach();
	};

	private _onPopoverKeydown = (e: Event): void => {
		if ((e as KeyboardEvent).key === "Escape") this._closeErrorPopover();
	};

	private _onPopoverPointerDown = (e: Event): void => {
		// Pointerdowns inside the error indicator (icon/retry) or on its detail
		// message are owned by the click toggle — dismissing here too would make
		// the subsequent toggle click re-open the popover instead of closing it.
		const insideIndicator = e
			.composedPath()
			.some(
				(el) =>
					el instanceof HTMLElement &&
					(el.classList.contains("ota-error") ||
						el.classList.contains("ota-error-detail")),
			);
		if (!insideIndicator) this._closeErrorPopover();
	};

	private _popoverListeners = new DocumentListenerGroup([
		{ target: document, type: "keydown", listener: this._onPopoverKeydown },
		{
			target: document,
			type: "pointerdown",
			listener: this._onPopoverPointerDown,
			options: true,
		},
		{
			target: window,
			type: "scroll",
			listener: this._closeErrorPopover,
			options: true,
		},
	]);

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this._popoverListeners.detach();
	}

	private _toggleErrorPopover(e: Event, mac: string): void {
		e.stopPropagation();
		if (this._errorPopoverMac === mac) {
			this._closeErrorPopover();
		} else {
			this._errorPopoverMac = mac;
			this._popoverListeners.attach();
		}
	}

	private _dispatchRetryOta(device: FlashableDevice, source?: "github"): void {
		this._closeErrorPopover();
		this.dispatchEvent(
			new CustomEvent("retry-ota", {
				// `source` is undefined on a plain retry — every reader guards
				// with `?`, and the WS-boundary in startOta omits it from the
				// wire, so it's safe to always include here.
				detail: { mac: device.mac, source },
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
				// When HA-local serving handed the device a URL it couldn't
				// reach (e.g. HA in a Docker bridge network advertised its
				// container IP), offer a direct-from-GitHub retry alongside the
				// normal one — an internet-connected device can always fetch it.
				const showGithub =
					ota.errorKey === "flasher.errors.ota_download_unreachable";
				const otaBtn = (key: string, source?: "github") => html`
					<epp-button
						variant="neutral"
						@click=${() => this._dispatchRetryOta(device, source)}>
						${this.localize(key)}
					</epp-button>`;
				return html`
					<div class="ota-error">
						<ha-icon class="ota-error-icon"
							icon="mdi:alert-circle"
							@click=${(e: Event) => this._toggleErrorPopover(e, device.mac)}
						></ha-icon>
						${
							device.available
								? html`
									${otaBtn("flasher.ota_retry")}
									${showGithub ? otaBtn("flasher.ota_download_github", "github") : nothing}`
								: nothing
						}
					</div>`;
			}
		}
	}

	// The OTA error message renders in the device row's flow (below its main
	// line, via the row's flex-wrap), toggled by the error icon. Kept OUT of
	// `.ota-error`: an absolute popover there was clipped by the scrolling
	// `.device-list` for a device at the top of the list.
	private _renderOtaErrorDetail(
		device: FlashableDevice,
	): typeof nothing | ReturnType<typeof html> {
		const ota = this.otaStates[device.mac];
		if (ota?.state !== "error" || this._errorPopoverMac !== device.mac) {
			return nothing;
		}
		return html`<div class="ota-error-detail" role="alert">${ota.errorKey ? this.localize(ota.errorKey, ota.errorParams) : ""}</div>`;
	}

	private _onUsbConnect(): void {
		if (!this._hasWebSerial) return;
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

		// When an OTA error opens, its message renders in the row's flow — but
		// the device list is a `max-height: 40vh; overflow-y: auto` scroll box,
		// so a message opened past the fold is clipped (an in-flow bar is NOT
		// immune to a scroll cap). Scroll `.device-list` itself to reveal the
		// whole detail. We move the inner list directly rather than
		// `detail.scrollIntoView()` (which would also scroll whichever ancestors
		// it needed): confining the scroll to this shadow root keeps it
		// non-composed, so it can't reach — and so can't trip — the window-scroll
		// dismissal, with no dependency on any ancestor's overflow behaviour.
		if (changed.has("_errorPopoverMac") && this._errorPopoverMac !== null) {
			const list = this.shadowRoot?.querySelector(".device-list");
			const detail = this.shadowRoot?.querySelector(".ota-error-detail");
			if (list && detail) {
				const listBox = list.getBoundingClientRect();
				const detailBox = detail.getBoundingClientRect();
				if (detailBox.bottom > listBox.bottom) {
					list.scrollTop += detailBox.bottom - listBox.bottom;
				} else if (detailBox.top < listBox.top) {
					list.scrollTop -= listBox.top - detailBox.top;
				}
			}
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
		return html`<epp-button
			variant="neutral"
			class=${cls}
			@click=${this._dispatchCancel}
			?disabled=${this._cancelling}
		>${label}</epp-button>`;
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
		const detail = { ssid: this._selectedSsid, password: this._wifiPassword };
		// Don't retain the password once it's been handed to the
		// provisioning flow — it only lived on for a re-submit convenience.
		this._wifiPassword = "";
		this.dispatchEvent(
			new CustomEvent("wifi-provision", {
				detail,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _renderLoading() {
		return html`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`;
	}

	private _renderWifiProvisioning() {
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

            ${
							showManual
								? html`
                <epp-field
                  type="text"
                  autocomplete="off"
                  .label=${this.localize("flasher.enter_ssid")}
                  .value=${this._selectedSsid}
                  @value-changed=${(e: CustomEvent<{ value: string }>) => {
										this._selectedSsid = e.detail.value;
									}}
                ></epp-field>
              `
								: nothing
						}

            ${(() => {
							// Password masking depends on the input's `type` attribute
							// (text vs password), which epp-field does NOT support — keep
							// the native control here. ha-input shipped in HA 2026.4 and
							// replaces ha-textfield (removed in 2026.5); fall back to
							// ha-textfield on older HA where ha-input isn't registered yet —
							// the integration's hacs.json still supports 2025.2+.
							const inputTag = customElements.get("ha-input")
								? literal`ha-input`
								: literal`ha-textfield`;
							return staticHtml`
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
              <epp-button variant="neutral" @click=${this._dispatchWifiScan}>
                ${this.localize("flasher.scan")}
              </epp-button>
              <epp-button
                variant="primary"
                ?disabled=${!this._selectedSsid}
                @click=${this._dispatchWifiProvision}
              >
                ${this.localize("flasher.connect")}
              </epp-button>
            </div>
          </div>
        </ha-card>
      </div>
    `;
	}

	/**
	 * Compute the status badges and the trailing action for one device row.
	 * Badges render in a fixed order (offline, online, original, ahead) and
	 * several can apply at once (e.g. an offline original-firmware device).
	 */
	private _deviceRowDescriptor(device: FlashableDevice): {
		badges: { cls: string; labelKey: string }[];
		action: TemplateResult | typeof nothing;
	} {
		const badges: { cls: string; labelKey: string }[] = [];
		const ota = this.otaStates[device.mac];
		const isEppgrid = device.firmware_type === "eppgrid";

		if (!device.available) {
			badges.push({
				cls: "firmware-badge-offline",
				labelKey: "flasher.offline",
			});
		}
		if (
			isEppgrid &&
			device.available &&
			!ota &&
			!device.update_available &&
			(device.firmware_status === "compatible" ||
				device.firmware_status === "firmware_ahead")
		) {
			badges.push({
				cls: "firmware-badge-online",
				labelKey: "flasher.online",
			});
		}
		if (device.firmware_type === "original") {
			badges.push({
				cls: "firmware-badge-original",
				labelKey: "flasher.flash_usb",
			});
		}
		if (isEppgrid && device.firmware_status === "firmware_ahead") {
			badges.push({
				cls: "firmware-badge-ahead",
				labelKey: "flasher.integration_update",
			});
		}

		const action = ota
			? this._renderOtaIndicator(device)
			: this._isUpgradeable(device)
				? html`<epp-button
							variant="primary"
							@click=${() => this._dispatchUpdateFirmware(device)}
						>${this.localize("flasher.update")}</epp-button>`
				: nothing;

		return { badges, action };
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
          <div class="card-header card-header-split">
            <span>
              ${this.localize("flasher.devices_on_network")}
              ${this.integrationVersion ? html`<span class="integration-version">v${this.integrationVersion}</span>` : nothing}
            </span>
            ${
							this.flashableDevices.some((d) => this._isUpgradeable(d))
								? html`<epp-button
										class="upgrade-all-btn"
										variant="primary"
										@click=${() => this._dispatchUpdateAll()}
									>${this.localize("flasher.update_all")}</epp-button>`
								: nothing
						}
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
                  ${[...flashableDevices]
										.sort((a, b) =>
											a.name.localeCompare(b.name, undefined, {
												sensitivity: "base",
											}),
										)
										.map((device) => {
											const isFaded =
												!device.available ||
												device.firmware_type === "original";
											const { badges, action } =
												this._deviceRowDescriptor(device);
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
                        ${badges.map(
													(b) =>
														html`<span class="firmware-badge ${b.cls}">${this.localize(b.labelKey)}</span>`,
												)}
                        ${action}
                        ${this._renderOtaErrorDetail(device)}
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
		if (!this._hasWebSerial) return;
		this.dispatchEvent(
			new CustomEvent("usb-wifi-config", { bubbles: true, composed: true }),
		);
	}

	private _renderUsbSection() {
		// Both actions need navigator.serial — grey them out (and guard their
		// handlers) when the browser doesn't support Web Serial, instead of
		// letting the user walk into a runtime error.
		const disabledCls = this._hasWebSerial ? "" : " usb-action-disabled";
		const ariaDisabled = this._hasWebSerial ? "false" : "true";
		return html`
      <ha-card>
        <div class="card-header">${this.localize("flasher.usb_title")}</div>
        <div class="card-content">
          ${
						!this._hasWebSerial
							? html`<div class="browser-warning">
                ${this.localize(
									this._isSecureContext
										? "flasher.usb_browser_warning"
										: "flasher.usb_insecure_warning",
								)}
                <a href=${WEB_FLASHER_URL} target="_blank" rel="noopener noreferrer" class="browser-warning-link">${this.localize("flasher.usb_web_flasher_link")}</a>
              </div>`
							: nothing
					}
          <div class="usb-actions">
            <div class="usb-action${disabledCls}" aria-disabled=${ariaDisabled} @click=${this._onUsbConnect}>
              <ha-icon icon="mdi:chip"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_flash_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_flash_desc")}</div>
              </div>
            </div>
            <div class="usb-action${disabledCls}" aria-disabled=${ariaDisabled} @click=${this._dispatchUsbWifiConfig}>
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

	private _renderUsbFlash() {
		const state = this.usbFlashState;
		if (state?.step === "wifi_provision") return this._renderWifiProvisioning();
		if (state?.step === "error") return this._renderUsbError(state);
		if (state?.step === "wifi_configured")
			return this._renderUsbConfigured(state);
		if (state?.step === "complete") return this._renderUsbComplete(state);
		if (state && state.step !== "idle") return this._renderUsbProgress(state);
		return this._renderUsbIdle();
	}

	private _renderUsbError(state: UsbFlashState) {
		return html`
			<div class="flasher-content">
				<ha-card>
					<div class="card-content">
						<div class="usb-error">
							<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
							<p>${state.errorKey ? this.localize(state.errorKey, state.errorParams) : ""}</p>
						</div>
						<div class="confirm-actions">
							<epp-button variant="neutral" @click=${this._dispatchCancel}>
								${this.localize("flasher.start_over")}
							</epp-button>
							${
								state.fatal
									? nothing
									: html`<epp-button variant="primary" @click=${this._dispatchUsbRetry}>
								${this.localize("flasher.usb_retry")}
							</epp-button>`
							}
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}

	/** WiFi configured — HA-add in progress. */
	private _renderUsbConfigured(state: UsbFlashState) {
		// ha-spinner is the Web Awesome replacement (HA 2024.11+) for the
		// MWC-era ha-circular-progress, which is likely unregistered on
		// HA 2026.05 (an invisible spinner). Fall back to the old element on
		// HA versions that predate ha-spinner.
		const spinner = customElements.get("ha-spinner")
			? html`<ha-spinner size="small"></ha-spinner>`
			: html`<ha-circular-progress indeterminate size="small"></ha-circular-progress>`;
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
							${spinner}
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
						<div class="confirm-actions">
							${this._renderCancelButton()}
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}

	private _renderUsbComplete(state: UsbFlashState) {
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
									<epp-button variant="primary">${this.localize("flasher.go_to_devices")}</epp-button>
								</a>
							</div>
						</div>
					</ha-card>
				</div>
			`;
		}

		const ip = state.ip;
		const haAdd = state.haAdd;
		const success = haAdd?.type === "added" || haAdd?.type === "already_added";
		const icon = success ? "mdi:check-circle-outline" : "mdi:alert-outline";
		const haAddKey = haAdd?.type ?? "failed";
		const reason = haAdd?.type === "failed" ? (haAdd.reason ?? "unknown") : "";

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
									? html`<epp-button variant="primary" @click=${this._dispatchFlashComplete}>
									${this.localize("flasher.go_to_config")}
								</epp-button>`
									: haAdd?.type === "needs_auth"
										? html`<a href="/config/integrations/dashboard">
										<epp-button variant="primary">${this.localize("flasher.go_to_integrations")}</epp-button>
									</a>`
										: html`
										<epp-button variant="neutral" @click=${() => this._copyIp(ip ?? "")}>
											${this.localize("flasher.copy_ip")}
										</epp-button>
										<epp-button variant="primary" @click=${this._dispatchRetryHaAdd}>
											${this.localize("flasher.retry_ha_add")}
										</epp-button>
									`
							}
							<epp-button variant="neutral" @click=${this._dispatchCancel}>
								${this.localize("flasher.flash_another")}
							</epp-button>
						</div>
					</div>
				</ha-card>
			</div>
		`;
	}

	/** In-progress states (connecting, flashing, wifi_check, wifi_scan, reading_ip, wifi_connecting). */
	private _renderUsbProgress(state: UsbFlashState) {
		const stepKeyMap: Record<string, string> = {
			connecting: "flasher.usb_step_connecting",
			flashing: "flasher.usb_step_flashing",
			wifi_check: "flasher.usb_step_wifi_check",
			wifi_scan: "flasher.usb_step_scanning",
			wifi_provision: "flasher.usb_step_provisioning",
			wifi_connecting: "flasher.usb_step_wifi_connecting",
			reading_ip: "flasher.usb_step_reading_ip",
			adding: "flasher.usb_step_adding",
		};
		const stepKey = stepKeyMap[state.step] ?? state.step;
		const stepParams =
			state.step === "flashing" ? { version: this.firmwareVersion } : undefined;
		// Cancel is not offered during `flashing` (risk of bricking) or
		// during `connecting` (native picker is modal).
		const canCancel = state.step !== "flashing" && state.step !== "connecting";
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

	/** Idle state — variant selector + flash button. */
	private _renderUsbIdle() {
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
							<epp-button
								class="${this._selectedVariant === "wifi" ? "selected" : "unselected"}"
								variant="${this._selectedVariant === "wifi" ? "primary" : "neutral"}"
								@click=${() => {
									this._selectedVariant = "wifi";
								}}
							>${this.localize("flasher.wifi")}</epp-button>
							<epp-button
								class="${this._selectedVariant === "ethernet" ? "selected" : "unselected"}"
								variant="${this._selectedVariant === "ethernet" ? "primary" : "neutral"}"
								@click=${() => {
									this._selectedVariant = "ethernet";
								}}
							>${this.localize("flasher.ethernet")}</epp-button>
						</div>
						<div class="confirm-actions">
							${this._renderCancelButton()}
							<epp-button variant="primary" @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</epp-button>
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
