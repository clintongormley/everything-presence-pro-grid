# Web flasher

Flash Everything Presence Pro Grid firmware straight from this page — no Home
Assistant needed.

!!! tip "When to use this"

    The **Flash Firmware** tab inside the Home Assistant panel can only flash over
    USB when you open Home Assistant over a **secure (HTTPS)** connection. Most
    people reach Home Assistant over plain HTTP (for example
    `http://homeassistant.local:8123`), where the browser blocks USB access and the
    panel's flash buttons are greyed out.

    This page is served over HTTPS, so USB flashing works here regardless of how you
    reach Home Assistant. Use it for the first flash, then future updates happen
    over the air.

## Prerequisites

- **Chrome or Edge browser.** Flashing uses the Web Serial API, which only works
    in Chromium-based browsers.
- **A data USB cable.** Charge-only cables show no ports in the browser picker.
- **The device plugged into this computer.**

## Flash

First pick your model, then how it connects to your network. Click its button
and select the device in the browser's serial-port picker. Not sure which model
you have? See the [hardware comparison](hardware.md#models).

### Everything Presence Pro

<div class="grid" markdown>

<div markdown>

#### WiFi

Connect over Wi-Fi. After flashing, set up Wi-Fi right here in the browser.

<esp-web-install-button manifest="../../fw/latest/wifi-ble-co2.json">
  <button slot="activate">Flash WiFi firmware</button>
</esp-web-install-button>

</div>

<div markdown>

#### Ethernet

Connect over an Ethernet cable (PoE optional).

<esp-web-install-button manifest="../../fw/latest/ethernet-ble-co2.json">
  <button slot="activate">Flash Ethernet firmware</button>
</esp-web-install-button>

</div>

</div>

### Everything Presence Lite

The Lite is Wi-Fi only.

!!! note

    Browser flashing for the Everything Presence Lite arrives with the v1.9.0 stable
    release. Until then, flash a Lite from the **Flash Firmware** tab inside the
    Everything Presence Pro Grid panel — it detects the Lite and installs the right
    firmware automatically. See [Flashing firmware](flashing-firmware.md).

!!! warning

    If the browser shows no ports when you click Connect, the cable is the most
    common cause. Swap for a known-good data cable before troubleshooting the
    device.

The flasher installs the latest released firmware. The WiFi flow also offers to
set up Wi-Fi over USB once the device reboots.

## After flashing

1. **(WiFi variant)** Set up Wi-Fi when prompted: scan for networks or enter the
    SSID manually, then the password.
1. **Add the device to Home Assistant.** ESPHome usually discovers it
    automatically — look for a **Discovered** card under **Settings → Devices &
    services**. If it isn't discovered (or you flashed the Ethernet variant),
    add ESPHome manually with the device's hostname (typically
    `everything-presence-pro-<suffix>.local`) or IP address.

Once the device is on ESPHome, it shows up in the Everything Presence Pro Grid
panel within a few seconds.

For the full walkthrough — including how the in-panel flasher works and detailed
troubleshooting — see [Flashing firmware](flashing-firmware.md).
