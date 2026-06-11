# Installation

Everything Presence Pro Grid is distributed as a **HACS custom repository** — it's not (yet) in HACS's default integration list. You add the repository to HACS once; from then on HACS handles installs and updates the same way as for any other HACS integration. You'll need a working Home Assistant install to add it to.

## Prerequisites

- Home Assistant 2026.5.0 or newer.
- [HACS](https://hacs.xyz/) installed (recommended).

## Install via HACS (recommended)

The fastest path uses Home Assistant's "My" redirect to pre-fill the custom-repository dialog. The manual path below has the same effect.

### Quick add (My Home Assistant button)

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=clintongormley&repository=everything-presence-pro-grid&category=integration)

Click the button, confirm the dialog in your Home Assistant, and HACS will add the repository. Then continue from step 3 of the manual flow below.

### Manual add

1. Open **HACS** in the Home Assistant sidebar.
2. Click the **kebab menu** (⋮, top right) → **Custom repositories**. Paste `https://github.com/clintongormley/everything-presence-pro-grid` into the **Repository** field, set **Type** to **Integration**, and click **Add**. Close the dialog.
3. Find **Everything Presence Pro Grid** in the HACS integrations list and click **Download**.
4. Restart Home Assistant.

![Installing Everything Presence Pro Grid with HACS.](../images/installation/hacs.png "Installing Everything Presence Pro Grid with HACS.")

## Install manually

If you can't use HACS:

1. Download the latest release archive from the [Releases page](https://github.com/clintongormley/everything-presence-pro-grid/releases).
2. Unpack it and copy `custom_components/eppgrid/` into your HA config's `custom_components/` folder.
3. Restart Home Assistant.

## After installing

1. Go to **Settings → Devices & services → Add integration**, search for **Everything Presence Pro Grid**, and add the entry.
2. The **Everything Presence Pro Grid** panel appears in the HA sidebar for administrator users only — Home Assistant hides it from non-admin users. If the panel doesn't show up for you and you are an admin, hard-refresh the HA web UI (Ctrl-F5 / Cmd-Shift-R). Non-admin users can still see EPP Grid entities (zone presence, target positions, environment sensors) on any shared dashboard via the standard Home Assistant entity cards.
3. The panel starts empty. See [Flashing firmware](flashing-firmware.md) to put Everything Presence Pro Grid firmware on your first device.

![Everything Presence Pro Grid panel in the HA sidebar, empty state — no devices yet.](../images/installation/empty-panel.png)

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| HACS doesn't list the integration | The custom repository hasn't been added yet (Everything Presence Pro Grid is not in HACS's default list) | Open **HACS** → kebab menu (⋮) → **Custom repositories**. Add `https://github.com/clintongormley/everything-presence-pro-grid` as type **Integration**. The integration then appears in the HACS list — reload the page if it doesn't show up immediately. |
| Integration installed but the panel doesn't appear in the HA sidebar | Integration entry hasn't been added yet, or you're signed in as a non-admin user | Confirm you're signed in as an administrator (the panel is admin-only). Otherwise go to **Settings → Devices & services → Add integration** and add **Everything Presence Pro Grid**. If the panel still doesn't appear, hard-refresh the HA web UI (**Ctrl-F5** / **Cmd-Shift-R**). |
| "Integration update required" banner appears immediately after install | Your device firmware is newer than the integration release you've just installed | Either update the integration to a newer release in HACS, or downgrade the firmware to match. |
| Manual install done but panel still not appearing | `custom_components/eppgrid/` is in the wrong place, or nested one level too deep | Verify the `eppgrid/` directory sits directly under your HA config's `custom_components/` folder, and check HA logs for import errors. |

Still stuck? See [Troubleshooting](troubleshooting.md) for how to open an issue.

## Where to next

- **[Flashing firmware →](flashing-firmware.md)** — put Everything Presence Pro Grid firmware onto your device.
