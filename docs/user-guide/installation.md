# Installation

Everything Presence Grid is in **HACS**'s default integration list, so you can
install it directly. HACS handles installs and updates the same way as for any
other integration. You'll need a working Home Assistant install to add it to.

## Prerequisites

- Home Assistant 2026.5.0 or newer.
- [HACS](https://hacs.xyz/) installed (recommended).

## Install via HACS (recommended)

### Quick install (My Home Assistant button)

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=clintongormley&repository=everything-presence-pro-grid&category=integration)

Click the button and confirm the dialog in your Home Assistant to open the
Everything Presence Grid page in HACS. Click **Download**, then restart Home
Assistant.

### From the HACS list

1. Open **HACS** in the Home Assistant sidebar.
1. Search for **Everything Presence Grid** and open it.
1. Click **Download**.
1. Restart Home Assistant.

![Installing Everything Presence Grid with HACS.](../images/installation/hacs.png "Installing Everything Presence Grid with HACS.")

## Install manually

If you can't use HACS:

1. Download the latest release archive from the
    [Releases page](https://github.com/clintongormley/everything-presence-pro-grid/releases).
1. Unpack it and copy `custom_components/eppgrid/` into your HA config's
    `custom_components/` folder.
1. Restart Home Assistant.

## After installing

1. Go to **Settings → Devices & services → Add integration**, search for
    **Everything Presence Grid**, and add the entry.
1. The **Everything Presence Grid** panel appears in the HA sidebar for
    administrator users only — Home Assistant hides it from non-admin users. If
    the panel doesn't show up for you and you are an admin, hard-refresh the HA
    web UI (Ctrl-F5 / Cmd-Shift-R). Non-admin users can still see EPP Grid
    entities (zone presence, target positions, environment sensors) on any
    shared dashboard via the standard Home Assistant entity cards.
1. The panel starts empty. See [Flashing firmware](flashing-firmware.md) to put
    Everything Presence Grid firmware on your first device.

After adding your first device, the panel walks you through naming it and
assigning an area — see
[Flashing firmware](flashing-firmware.md#after-flashing).

![Everything Presence Grid panel in the HA sidebar, empty state — no devices yet.](../images/installation/empty-panel.png)

## Troubleshooting

| Symptom                                                                | Likely cause                                                                     | Fix                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HACS doesn't list the integration                                      | HACS hasn't refreshed its default repository list yet                            | Wait a few minutes and search again, or restart Home Assistant to make HACS refresh its list.                                                                                                                                                                                    |
| Integration installed but the panel doesn't appear in the HA sidebar   | Integration entry hasn't been added yet, or you're signed in as a non-admin user | Confirm you're signed in as an administrator (the panel is admin-only). Otherwise go to **Settings → Devices & services → Add integration** and add **Everything Presence Grid**. If the panel still doesn't appear, hard-refresh the HA web UI (**Ctrl-F5** / **Cmd-Shift-R**). |
| "Integration update required" banner appears immediately after install | Your device firmware is newer than the integration release you've just installed | Either update the integration to a newer release in HACS, or downgrade the firmware to match.                                                                                                                                                                                    |
| Manual install done but panel still not appearing                      | `custom_components/eppgrid/` is in the wrong place, or nested one level too deep | Verify the `eppgrid/` directory sits directly under your HA config's `custom_components/` folder, and check HA logs for import errors.                                                                                                                                           |

Still stuck? See [Troubleshooting](troubleshooting.md) for how to open an issue.

## Where to next

- **[Flashing firmware →](flashing-firmware.md)** — put Everything Presence Grid
    firmware onto your device.
