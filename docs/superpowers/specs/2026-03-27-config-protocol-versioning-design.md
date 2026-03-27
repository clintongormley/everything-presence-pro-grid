# Config Protocol Versioning Design

**Date:** 2026-03-27
**Status:** Approved

## Problem

When the integration/frontend upgrades and the config push schema changes, old firmware won't understand the new config format. Conversely, if firmware is updated ahead of the integration, the integration may not speak the firmware's newer config protocol. We need a mechanism to detect mismatches and guide the user to resolve them.

## Design Decisions

- **Per-device blocking** — devices on the correct version work normally; incompatible devices show a banner but still stream live data
- **All configuration blocked on mismatch** — perspective calibration, zone editing, sensor settings, pipeline config — everything. No partial compatibility matrix.
- **Single protocol version integer** — not semver, not capability flags. One number, strict equality.
- **OTA triggered from the panel** — firmware-behind devices get an "Update Firmware" button that triggers OTA without leaving the panel
- **Firmware-ahead is informational only** — user is told to update the integration; no action button we can provide

## Protocol Version Constant

- **Firmware**: new numeric sensor `epp_config_protocol`, published once on boot. Starts at `1`.
- **Integration**: constant `CONFIG_PROTOCOL_VERSION = 1` in `const.py`.
- Bumped together in lockstep whenever the config push interface changes in a breaking way.

## Coordinator Detection

On entity discovery, the coordinator reads the `epp_config_protocol` sensor value and compares it to `CONFIG_PROTOCOL_VERSION`. Per-device, it derives one of three states:

| State | Condition | Meaning |
|-------|-----------|---------|
| `compatible` | firmware protocol == integration protocol | Full config allowed |
| `firmware_behind` | firmware protocol < integration protocol | Firmware needs update |
| `firmware_ahead` | firmware protocol > integration protocol | Integration needs update |

This status is exposed to the frontend via the device info websocket response (e.g. in `eppgrid/get_config` or `eppgrid/list_devices`).

## Frontend Behavior

| State | Config UI | Banner | Action |
|-------|-----------|--------|--------|
| `compatible` | Enabled | None | — |
| `firmware_behind` | Hidden/disabled | "This sensor's firmware needs to be updated to work with this version of the integration." | **Update Firmware** button |
| `firmware_ahead` | Hidden/disabled | "This sensor's firmware is newer than the integration. Update the EPP Grid integration to the latest version." | Informational only |

Live monitoring (target dots, zone occupancy, sensor readings) works in all three states.

## Backend Safety Net

All websocket config commands check protocol compatibility before executing:

- `eppgrid/set_setup`
- `eppgrid/set_room_layout`
- `eppgrid/set_entity_enabled`
- `eppgrid/set_env_calibration`
- `eppgrid/set_motion_timeout`
- `eppgrid/set_tracking`
- `eppgrid/set_static_presence`
- `eppgrid/set_pipeline`

On mismatch, they return an error response indicating the direction of the mismatch (firmware_behind or firmware_ahead).

## Firmware Update from Panel

New websocket command `eppgrid/update_firmware`:

1. Accepts `mac` parameter to identify the device
2. Looks up the device's ESPHome update entity
3. Calls `update.install` on it
4. Returns success/failure to the frontend

The frontend shows progress/status as the OTA proceeds.

## Firmware Changes

The `epp` ESPHome component exposes a new numeric sensor:

```yaml
sensor:
  - platform: epp
    config_protocol:
      name: "Config Protocol"
      entity_category: diagnostic
```

The C++ component publishes the protocol version once during `setup()`. This is a simple integer — no parsing required on the coordinator side.

## What Doesn't Change

- **Target streaming, sensor readings, zone occupancy** — all read-only data flows regardless of protocol version
- **Stock firmware devices** — devices without the zone engine firmware (no `epp_config_protocol` sensor) continue to work as today. No protocol sensor means no zone engine, Python fallback still applies.
- **Legacy zone engine firmware** — devices running zone engine firmware from before this feature (have `fw_version` with `"zone-engine"` but no `epp_config_protocol` sensor) are treated as protocol version `0`, which triggers `firmware_behind`. This ensures old zone engine firmware gets the upgrade prompt.
- **NVS schema version** — the firmware's internal storage format version (`NVS_SCHEMA_VERSION`) is separate from the config protocol version. NVS version is about how the firmware stores its own config; protocol version is about the integration-firmware interface.

## When to Bump the Protocol Version

Bump when the config push interface changes in a breaking way:

- New required fields in service calls (e.g. `epp_set_zones` gains a mandatory field)
- Changed serialization format (e.g. zone blob layout changes)
- Removed or renamed services
- Changed semantics of existing fields

Do **not** bump for:

- New read-only sensors or entities
- New optional fields with safe defaults
- Bug fixes that don't change the interface
