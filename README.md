# Everything Presence Grid

[![Tests](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/tests.yml/badge.svg)](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/tests.yml)
[![HACS Validation](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hacs.yml/badge.svg)](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hacs.yml)
[![Hassfest](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hassfest.yml/badge.svg)](https://github.com/clintongormley/everything-presence-pro-grid/actions/workflows/hassfest.yml)
[![Active installations](https://img.shields.io/badge/dynamic/json?color=41BDF5&logo=home-assistant&label=active%20installations&suffix=%20installs&cacheSeconds=15600&url=https://analytics.home-assistant.io/custom_integrations.json&query=$.eppgrid.total)](https://analytics.home-assistant.io/)

Everything Presence Grid is a Home Assistant integration for the
[Everything Presence Pro](https://shop.everythingsmart.io/products/everything-presence-pro)
and the lower-cost **Everything Presence Lite** mmWave radar sensors. It ships
with custom firmware that runs all the detection work — target smoothing, zone
tracking, presence logic — on the device itself. The integration provides a Home
Assistant panel for configuration, calibration, live overview, and firmware
flashing, built around a calibrated grid that matches the real geometry of your
room.

Both models share the same firmware core and zone engine, so the spatial
features — zones, the grid, target tracking, room calibration, and heatmaps —
work identically on each. The Lite is a subset of the Pro: it keeps the spatial
features plus CO₂ and light level, and drops the static-presence radar, motion
sensor, and other extras. See
[Hardware → Models](https://clintongormley.github.io/everything-presence-pro-grid/user-guide/hardware/#models)
for the full comparison. When you flash over USB the model is detected
automatically, and the panel hides the controls for hardware a Lite doesn't
have.

📖 **Full documentation:**
<https://clintongormley.github.io/everything-presence-pro-grid/>

![Live overview showing a calibrated room grid with zones, target markers, and furniture overlay.](docs/images/introduction/overview.png)

## What is the Everything Presence Pro?

The Everything Presence Pro (EPP) is a presence sensor from
[Everything Smart Technology](https://shop.everythingsmart.io/). Its low-powered
mmWave radar gives it two big advantages over a regular motion sensor: it can
detect people who are sitting or lying still, and it tracks them as they move
around the room — which is what makes zone-based automations possible.

The EPP contains three main sensors:

- **PIR (passive infrared) motion sensor.** Reacts the instant someone enters
    the room — ideal for triggering main lights.
- **Target tracking radar (LD2450).** Follows up to three people moving around
    the room, so automations can react to them entering or leaving specific
    zones — turning on the extractor fan when someone uses the toilet, the towel
    rail when someone showers.
- **Static presence radar (DFRobot SEN0609).** Picks up subtle movement like
    breathing, so a room stays marked occupied while someone is sitting still.
    Lets automations turn lights off only when the room is genuinely empty.

## What this integration does differently

The original firmware does basic "in zone or not" detection on the device and
forwards raw target data to Home Assistant. Everything Presence Grid replaces
that with:

- **Perspective-corrected grid.** A four-corner calibration wizard maps the
    radar view onto your actual room. Walls are straight, and zones line up with
    real-world geometry. Cells are 30 cm × 30 cm (1 ft × 1 ft).
- **Seven painted zones**, plus an eighth "Rest of room" fallback. Zones are
    polygonal, can be discontinuous, and are drawn by clicking grid cells.
- **Zone types** — `Default`, `Bed`, `Seating`, `Transit` — bundle sensible
    thresholds and timeouts for each kind of area, so a bed zone can hold
    presence for minutes while a hallway zone clears in seconds. `Custom`
    exposes the underlying parameters.
- **Cross-zone target tracking.** Targets are followed as they move from one
    zone to another, so the handoff between zones is clean.
- **Overlays** for refining detection. Mark doorways with Entry/Exit overlays,
    and noise sources with Interference or Suppress overlays.
- **Furniture layout.** Drop furniture stickers on the grid so the live overview
    is easy to read. Visual only — they don't affect detection.
- **On-chip processing.** Home Assistant gets a single `Occupancy` binary sensor
    plus per-zone presence sensors, instead of a constant stream of target
    coordinates.
- **Smoothed positions.** Brief radar jitter is filtered out before it reaches
    the zone engine, so zones don't flap when a target is near a boundary.
- **Quiet network.** Only what Home Assistant needs goes across the wire.
- **Built-in flasher.** Install and update firmware from the panel.

![Calibration wizard capturing the four corners of a room.](docs/images/introduction/calibration-wizard.png)

## Typical entities

Most rooms only need a handful of entities. The **Occupancy** binary sensor
(`binary_sensor.<device>_occupancy`) combines the motion, static-presence, and
target-tracking signals into a single "anyone in the room" entity. For
zone-specific actions, each named zone has its own **Zone Presence** entity
(`binary_sensor.<device>_zone_<N>_presence`).

These sensors are enough to build quite sophisticated automations. See the
[Automations guide](https://clintongormley.github.io/everything-presence-pro-grid/user-guide/automations/)
for worked examples.

## Installation

### HACS (recommended)

Everything Presence Grid is in the **HACS** default list — search for it and
install it directly.

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=clintongormley&repository=everything-presence-pro-grid&category=integration)

Or install it from the HACS list:

1. Open **HACS** in Home Assistant and search for **Everything Presence Grid**.
1. Click **Download**, then restart Home Assistant.
1. Go to **Settings → Devices & Services → Add Integration** and choose
    **Everything Presence Grid**.

### Manual

Copy the `custom_components/eppgrid` directory to your Home Assistant
`custom_components` folder and restart Home Assistant.

See the
[Installation guide](https://clintongormley.github.io/everything-presence-pro-grid/user-guide/installation/)
for the full walkthrough, including hardware setup, placement, calibration, and
firmware flashing.

## Links

- [Documentation](https://clintongormley.github.io/everything-presence-pro-grid/)
- [Everything Presence Pro hardware](https://shop.everythingsmart.io/products/everything-presence-pro)
- [Everything Smart Technology](https://shop.everythingsmart.io/)
