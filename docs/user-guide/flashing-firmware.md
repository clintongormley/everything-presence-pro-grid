# Flashing firmware

The first flash of Everything Presence Pro Grid firmware happens over USB from
your browser. Once flashed, future updates happen over the air — see
[Firmware upgrades](firmware-upgrades.md).

!!! tip "Flash buttons greyed out?"

    The in-panel **Flash Firmware** and **Configure WiFi** buttons only work when
    you open Home Assistant over a **secure (HTTPS)** connection. If you reach Home
    Assistant over plain HTTP (for example `http://homeassistant.local:8123`), your
    browser blocks USB access and the buttons are disabled. In that case, use the
    **[Web flasher](web-flasher.md)** instead — it runs over HTTPS and works
    regardless of how you reach Home Assistant.

## Prerequisites

- **Chrome or Edge browser.** Flashing uses the Web Serial API, which only works
    in Chromium-based browsers.
- **A secure connection to Home Assistant.** Web Serial needs HTTPS; over plain
    HTTP the panel's flash buttons are disabled — use the
    [Web flasher](web-flasher.md) instead.
- **A data USB cable.** Charge-only cables show no ports in the browser picker.
- **The device plugged into the same computer** as the Chrome/Edge browser.

## Flashing

1. Open the **Flash Firmware** tab in the Everything Presence Pro Grid panel.

1. Click **Flash Firmware**.

    ![Flash firmware page](../images/flashing-firmware/flash-firmware.png "Flash firmware page")

1. Choose your model — **Everything Presence Pro** or **Everything Presence
    Lite**. See the [hardware comparison](hardware.md#models) if you're not
    sure which you have.

1. Pick the firmware variant based on how you want the device to connect to your
    network, then click **Flash via USB**:

    - **WiFi** — connect over Wi-Fi.
    - **Ethernet** — connect over an Ethernet cable (PoE optional). Pro only —
        the Everything Presence Lite is Wi-Fi only, so this option doesn't appear
        for it.

    ![Choose wifi or ethernet variant](../images/flashing-firmware/variant.png "Choose wifi or ethernet variant")

1. In the browser's serial-port picker, select your device and click
    **Connect**.

    ![Connecting to the device over USB](../images/flashing-firmware/usb-connect.png "Connecting to the device over USB")

1. The device flashes and reboots automatically when done.

1. (WiFi variant only) After the device reboots, set up Wi-Fi: scan for networks
    or enter the SSID manually, then the password.

!!! warning

    If the browser shows no ports when you click Connect, the cable is the most
    common cause. Swap for a known-good data cable before troubleshooting the
    device.

## Add the device to ESPHome

The Wi-Fi flashing flow usually adds the device to Home Assistant automatically
via ESPHome. If not — or if you flashed the Ethernet variant — add it manually:

1. In Home Assistant, go to **Settings → Devices & services**.
1. Look for a **Discovered** card for your device. Click **Configure** and
    follow the prompts.
1. If the device isn't discovered, click **Add Integration**, search for
    **ESPHome**, and enter the device's hostname (typically
    `everything-presence-pro-<suffix>.local`) or IP address.

Once the device is added to ESPHome, it shows up in the Everything Presence Pro
Grid panel within a few seconds.

## After flashing

Once the device joins your network, the Everything Presence Pro Grid panel
detects it and opens a dialog to finish setup:

1. Enter a **Device name** (for example, "Living Room").
1. Assign an **Area** so it groups with the rest of that room.

If you change the name, a **Recreate entity IDs** toggle appears (on by default)
— keep it on to rename the device's entities to match the new name.

The button reads **Skip and finish** if you haven't made any changes, or
**Finish** after making a change. Either way, you land on the device's config
page where **Calibrate room size** is available.

!!! note

    Everything Presence Pro Grid identifies each device by its MAC address.
    Re-flashing or swapping variants keeps your saved zones, calibration, and
    settings — they're keyed to the MAC.

## Reconfiguring Wi-Fi

To change Wi-Fi credentials on an already-flashed device without a full
re-flash:

1. In the Flash Firmware tab, click **Configure WiFi** under USB Connection.
1. Connect via USB, scan for networks or enter the SSID manually, enter the
    password.
1. Click **Continue**.

## Troubleshooting

| Symptom                                                                        | Likely cause                                         | Fix                                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Browser port picker shows no devices                                           | Charge-only USB cable                                | Swap for a data cable.                                                                    |
| Repeated error messages while flashing                                         | Browser's USB serial connection got into a bad state | Refresh the page and try again.                                                           |
| Device flashed but doesn't appear in HA                                        | ESPHome hasn't discovered it yet                     | Add ESPHome manually with the device's hostname or IP, per the steps above.               |
| Device is on ESPHome but not showing in the Everything Presence Pro Grid panel | Device is still running the original firmware        | Check for a **Firmware Version** sensor on the ESPHome device page. If missing, re-flash. |

## Where to next

- **[Placement →](placement.md)** — mount the device so the sensors can see the
    room.
