# Backend Data Catalog

Data flows between firmware, integration, and frontend.

## Architecture

```
ESPHome firmware (ESP32)
  ├── LD2450 UART → rolling median → perspective transform → zone engine
  ├── SEN0609 GPIO → static presence
  ├── SHTC3/BH1750 → temperature, humidity, illuminance
  └── publishes ESPHome entities + text sensor streams

HA Integration (eppgrid)
  ├── discovers ESPHome devices with firmware_version
  ├── opens aioesphomeapi connection for frontend sessions
  ├── subscribe_states → fans out to subscription handlers
  ├── stores config in EPPGridStore → pushes to device via API actions
  └── manages ESPHome entity enable/disable/rename

Frontend (eppgrid-panel.ts — orchestrator)
  ├── subscribe_device → opens session connection
  ├── subscribe_grid_targets → structured events (positions, zones, sensors)
  ├── subscribe_raw_targets → raw sensor-space positions
  ├── orchestrator wires DeviceController callbacks → TargetController → panel state
  ├── commands: set_setup, set_room_layout, set_env_calibration, etc.
  ├── controllers/
  │   ├── device-controller.ts — WS subscriptions, device loading
  │   ├── grid-state-controller.ts — grid/zone/furniture mutation, saved configurations
  │   ├── target-controller.ts — target/sensor/zone state, zone engine, detection-log events
  │   ├── flasher-controller.ts — serial port + USB flash state machine
  │   └── panel-host.ts — typed PanelHost interface declaring every panel field/method the controllers touch
  ├── components/
  │   ├── epp-wizard.ts — calibration wizard (guide, corners, capture)
  │   ├── epp-settings-view.ts — device settings (accordions, ranges, reporting)
  │   ├── epp-flasher-view.ts — USB/Wi-Fi firmware flasher flow
  │   ├── epp-grid.ts — shared grid renderer (live + editor)
  │   ├── epp-live-sidebar.ts — sensor/zone status display
  │   ├── epp-zone-sidebar.ts — zone list + type controls
  │   ├── epp-overlay-sidebar.ts — Entry/Exit, Interference, Suppress paint modes
  │   ├── epp-furniture-sidebar.ts — furniture catalog + custom icons
  │   └── epp-furniture-overlay.ts — furniture drag/resize/rotate
  └── lib/
      └── zone-engine.ts — pure-function zone occupancy state machine
```

## 1. ESPHome Entities

All entities are created by ESPHome firmware with `disabled_by_default` where
appropriate. The integration manages enable/disable/rename.

### Enabled by Default

| Entity                 | Type          | Source                                                                                        |
| ---------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| Occupancy              | binary_sensor | zone engine processed (active/pending = on, inactive = off)                                   |
| Zone Engine Version    | text_sensor   | firmware version string                                                                       |
| Config Protocol        | sensor        | config protocol version integer (e.g. `1`)                                                    |
| Current Connections    | sensor        | current API client count (diagnostic, accuracy_decimals=0)                                    |
| Heap Free              | sensor        | current free heap bytes (diagnostic, 60s update via `debug` platform)                         |
| Heap Largest Block     | sensor        | largest free contiguous block — TLS handshake limiter (diagnostic)                            |
| Heap Min Free          | sensor        | all-time low-water mark via `heap_caps_get_minimum_free_size` (diagnostic)                    |
| Loop Time              | sensor        | ESPHome main loop time in ms (diagnostic)                                                     |
| WiFi Signal            | sensor        | RSSI in dBm via `wifi_signal` — wifi-ble-co2 variant (diagnostic, 60s)                        |
| WiFi Disconnects       | sensor        | outages since boot — the retry storm inside one outage counts once (wifi variant)             |
| WiFi Disconnect Reason | text_sensor   | IDF reason code + name for the last drop, e.g. `Beacon Timeout (200)`                         |
| WiFi Disconnect Signal | sensor        | RSSI in dBm at the instant of the last drop (from the IDF event; no state_class — it latches) |
| WiFi Downtime          | sensor        | seconds the last WiFi outage lasted (published on reconnect; no state_class — it latches)     |
| WiFi BSSID             | text_sensor   | BSSID of the associated AP via `wifi_info` — detects mesh steering                            |

### Disabled by Default

| Entity                | Type          | Source                                                                                                                  |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Temperature           | sensor        | SHTC3 + calibration offset                                                                                              |
| Humidity              | sensor        | SHTC3 + calibration offset                                                                                              |
| Illuminance           | sensor        | BH1750 + calibration offset                                                                                             |
| Motion Presence       | binary_sensor | zone engine processed (active/pending = on, inactive = off)                                                             |
| Static Presence       | binary_sensor | zone engine processed (active/pending = on, inactive = off)                                                             |
| Target Presence       | binary_sensor | zone engine device-level tracking                                                                                       |
| Tracking Presence     | binary_sensor | LD2450 any-target-detected                                                                                              |
| mmWave Presence       | binary_sensor | static presence OR any zone OCCUPIED — ignores PIR motion, off when only zones are PENDING_CLEAR and static is INACTIVE |
| Zone 0-7 Presence     | binary_sensor | zone engine per-zone state                                                                                              |
| Target 1-3 Position   | text_sensor   | "x,y,status" post-transform                                                                                             |
| Raw Target 1-3        | text_sensor   | "x,y" pre-transform (sensor-space)                                                                                      |
| Zone State            | text_sensor   | JSON with zone engine tick results                                                                                      |
| Target 1-3 X          | sensor (mm)   | per-target X position post-transform                                                                                    |
| Target 1-3 Y          | sensor (mm)   | per-target Y position post-transform                                                                                    |
| Target 1-3 Signal     | sensor        | per-target signal strength                                                                                              |
| Target 1-3 Active     | binary_sensor | per-target active flag                                                                                                  |
| Target 1-3 Zone       | sensor        | zone index the target currently occupies                                                                                |
| Zone 0-7 Target Count | sensor        | number of active targets in each zone                                                                                   |
| Target Count          | sensor        | total number of active targets                                                                                          |

## 2. Live Streaming

Two websocket subscriptions, both using the same device session connection.

### `subscribe_device_list` — fleet view

Broadcasts the live device list to the panel's home view. Initial fetch is
delivered immediately on subscribe; subsequent events fire when the device
manager adds, removes, renames, or updates availability/firmware status of any
managed device.

**Request:** `{ "type": "eppgrid/subscribe_device_list" }`

**Event payload:** the same shape as the `list_devices` response; subscribers
replay it through their reducer to keep the device list current.

### `subscribe_flashable_devices` — flasher view

Broadcasts the live flashable-devices list (every ESPHome device matching the
Everything Presence Pro hardware signature, regardless of which firmware it
currently runs). Initial fetch is delivered on subscribe; subsequent events fire
on add / remove / availability change / firmware-version flip after OTA.

**Request:** `{ "type": "eppgrid/subscribe_flashable_devices" }`

**Event payload:** the same shape as the `list_flashable_devices` response.

### `subscribe_device` — session lifecycle

Opens the aioesphomeapi connection. Sessions are refcounted per device: every
successful open (`subscribe_device` or `subscribe_ota_progress`, from any
client) takes one reference via `DeviceManager.async_open_session`, every
unsubscribe releases one via `DeviceManager.release_session`, and the connection
only closes when the last reference is released — two panel clients on the same
device share one connection and the first unsubscribe doesn't tear down the
second client's streams. Force-close paths (device offline transition, device
removal, host change, config-entry unload) bypass the count and reset it; stale
releases against a force-closed connection are identity-checked no-ops.

**Request:** `{ "type": "eppgrid/subscribe_device", "mac": str }`

### `subscribe_raw_targets` — calibration & FOV overlay

Parses Raw Target text sensor updates into structured events. Registers a
**durable state stream** with the manager — the same machinery the dashboard
card's `overview/subscribe` uses (see architecture.md → *Durable frontend state
streams*) — rather than opening a session and subscribing on it directly: the
manager owns the refcounted session and re-arms the stream on a fresh connection
after the device flaps, instead of leaving the panel frozen. Because
registration always succeeds, even against an offline device, this command
(unlike `subscribe_ota_progress` or the write commands) never returns the
`no_session` error — an offline device just reports `available: false` once the
stream settles.

**Request:**
`{ "type": "eppgrid/subscribe_raw_targets", "mac": str, "availability"?: bool }`

`availability` (default `false`) opts in to the two protocol events below. It
exists so a browser holding a cached pre-upgrade panel bundle — whose reducer
replaces the whole message with `event.targets || []` — keeps seeing frames and
nothing else; the current panel bundle always sets it `true`.
`subscribe_grid_targets` and `subscribe_heatmap` (below) share the identical
opt-in field and the identical two events.

This flag is **transitional**. The primary BWC mechanism going forward is the
content-hash self-reload in `frontend/src/lib/version-check.ts`: an open panel
compares its own bundle hash against the server's and reloads itself whenever
they differ, a check that's (re-)armed on every WebSocket reconnect — so a panel
bundle old enough to matter here reloads itself into the current one before it
can matter for long. `availability` only guards the narrow reconnect-vs-reload
race (the window between an upgrade taking effect and the next reconnect
triggering the self-reload check), and can be removed once the self-reload has
shipped for a release or two.

**Protocol events** (only sent when `availability` is `true`; repeating for the
life of the subscription):

1. `{ "available": bool }` — the stream's live/lost state: `true` once it
    (re)arms — including the very first arm right after subscribing — and
    `false` whenever it loses its connection (a device flap, a reconnect
    attempt that fails). No further data frames arrive while `available` is
    `false`; they resume once a following `true` arrives, with no action needed
    from the client — the manager re-arms the stream itself.
1. `{ "available": false, "closed": true }` — terminal, and the one case the
    client MUST act on: the manager tore the stream down (eppgrid config-entry
    unload/reload, device removed). The subscription is still open but points
    at a stream that no longer exists, and no `available: true` will ever
    follow — the client must re-subscribe if it still wants frames.

A device flap alone (`available: false` without `closed`) is not something the
client needs to do anything about — the manager recovers it on its own; only
`closed` means the client must re-subscribe.

**Event payload** (always sent, regardless of `availability`):

```json
{
    "targets": [
        {"raw_x": 1234.0, "raw_y": -567.0},
        {"raw_x": null, "raw_y": null},
        {"raw_x": null, "raw_y": null}
    ]
}
```

### `subscribe_grid_targets` — live overview & zone editor

Parses Target Position, Zone State, and sensor entity updates into structured
events. Registers a durable state stream exactly like `subscribe_raw_targets`
above — same `availability` opt-in (default `false`), same two protocol events,
no `no_session` error.

**Request:**
`{ "type": "eppgrid/subscribe_grid_targets", "mac": str, "availability"?: bool }`

**Event payload:**

```json
{
    "targets": [
        {"x": 1500.0, "y": 2000.0, "signal": 5, "status": "active"},
        {"x": null, "y": null, "signal": 0, "status": "inactive"},
        {"x": null, "y": null, "signal": 0, "status": "inactive"}
    ],
    "sensors": {
        "occupancy": true,
        "static_presence": false,
        "motion_presence": false,
        "target_presence": true,
        "mmwave": true,
        "static_state": "I",
        "motion_state": "P",
        "occupancy_state": true,
        "temperature": 22.5,
        "humidity": 45.0,
        "illuminance": 120.0,
        "co2": null
    },
    "zones": {
        "occupancy": {"0": true, "1": false},
        "target_counts": {},
        "frame_count": 10,
        "events": ["te:0:1", "zo:1", "oo", "wo"]
    }
}
```

**Data rates:**

- Target entity sensors (X, Y, signal, active, zone) + target_count: at
    entity_target_interval (user-configured Hz), only published when the
    corresponding entity toggle is enabled
- Zone entity sensors (presence, target_count): at entity_zone_interval
    (user-configured Hz), only published when the corresponding entity toggle is
    enabled
- Display stream (raw + grid text sensors): at display_interval (200ms default),
    only published when at least one frontend session is subscribed
- Zone state JSON: at zone_state_interval (1000ms default), only published when
    at least one frontend session is subscribed
- System outputs (device tracking, presence binary sensors, relay): fixed 1000ms
    regardless of frontend subscription

### `subscribe_heatmap` — activity heatmap overlay

Streams the on-device activity heatmap for the panel's Heatmap layer. Registers
a durable state stream with a `poll_fn`
(`lambda conn: conn.async_fetch_heatmap()`) instead of a PUSH `subscribe_states`
subscription (issue #365): while the stream is armed, `_run_poll_stream` calls
the `epp_get_heatmap` request/response action roughly every 2s (`poll_interval`)
and decodes the returned base64 into a dense 400-int array (any
malformed/wrong-length payload decodes to 400 zeroes rather than erroring),
feeding it to the same callback a PUSH stream would use — see architecture.md →
*Durable frontend state streams* for the poll delivery seam, and
[Activity Heatmap](#activity-heatmap-firmware) for what the action returns.
Admin only (`@require_admin`), like the panel's other device-session streams
(`subscribe_raw_targets` / `subscribe_grid_targets`). Same `availability` opt-in
(default `false`), same two protocol events, no `no_session` error as those two
streams. Unlike the card's `overview/subscribe_heatmap`, the panel's heatmap
stream carries live `available` events when opted in, the same as the panel's
other two streams — there is no deployed-bundle wire-contract constraint holding
it back, since the opt-in flag itself is what protects an old panel bundle.

**Request:**
`{ "type": "eppgrid/subscribe_heatmap", "mac": str, "availability"?: bool }`

**Event payload:**

```json
{ "cells": [0, 0, 12, 255, ...] }
```

`cells` is always exactly `GRID_COLS * GRID_ROWS` (400) entries. Opening this
subscription increments the same per-MAC subscriber counter family as
`subscribe_raw_targets` / `subscribe_grid_targets` (`heatmap_subs`, tracked
alongside `raw_target_subs` / `grid_target_subs` — see *Pipeline intervals*
below), but unlike those two the count no longer drives anything on the firmware
side: `heatmap_interval` is a retained-but-unused pipeline arg that stays `0`
regardless of subscriber count. What actually starts the polling above is this
stream being armed, not the counter.

## 3. Commands

### HA Actions (Services)

#### `eppgrid.clear_heatmap`

Admin-only HA action — registered via `async_register_admin_service` in
`__init__.py`, declared in `services.yaml`, named/described via `strings.json` →
`services.clear_heatmap`. Clears the on-device activity heatmap (RAM accumulator
\+ NVS blob — see [Activity Heatmap](#activity-heatmap-firmware)) for one or more
devices. This is the admin-facing counterpart of the non-admin
`eppgrid/clear_heatmap` WS command documented under *Overview Card Commands*
below, which the dashboard card uses instead.

Accepts a standard HA `target:` (`device_id` / `entity_id` / `area_id` /
`label_id`, any combination, each optionally a list).
`_resolve_target_device_ids` expands entities/areas/labels to device_ids via the
device and entity registries (`dr.async_entries_for_area` / `_for_label`,
`er.async_entries_for_area` / `_for_label`) and unions them with any
`device_id`s given directly.

- **With a target:** clears every targeted device that resolves to a live
    session (`manager.get_session(mac)`); non-eppgrid device_ids are silently
    ignored. A device with no live session, or whose clear call raises, is
    collected rather than short-circuiting the loop — once every target has been
    attempted, the action raises `HomeAssistantError` naming every device_id
    that failed.
- **With no target:** clears every device the manager currently tracks
    (`manager.devices`), silently skipping devices with no live session or whose
    clear call raises. This is a best-effort sweep, not all-or-nothing — some
    devices may reasonably be offline at any given moment, and the caller asked
    to clear "everything", not "everything or nothing."

Both paths call `DeviceConnection.async_clear_heatmap()`
(`device_manager/_connection.py`), a thin wrapper over
`async_execute_service("epp_clear_heatmap", {})` — the same firmware action the
WS command and the firmware section below describe.

### Overview Card Commands

These commands power the `custom:eppgrid-card` dashboard card. Unlike all other
eppgrid commands they are **not** `@require_admin` — the card is designed for
shared dashboards viewed by non-admin household users. Most are read-only;
`eppgrid/clear_heatmap` (below) is the one exception, permitted because it only
resets *display data* (the on-device heatmap accumulator), never device
*configuration*.

#### `eppgrid/overview/list_devices`

Returns a minimal device list for the card editor's device picker. Only devices
with a HA registry `device_id` are returned (the card stores the `device_id` and
the subscribe command resolves it to a MAC server-side).

**Request:** `{ "type": "eppgrid/overview/list_devices" }`

**Response:** `[{ "device_id": str, "name": str }, ...]`

#### `eppgrid/overview/subscribe`

Streams read-only overview data for one device. The command registers a
**durable state stream** with the manager rather than opening a session itself:
the manager owns the refcounted session (shared with any concurrent panel or OTA
sessions on the same device) and re-arms the stream on a fresh connection after
the device flaps, instead of leaving the card frozen — see architecture.md →
*Durable frontend state streams*.

**Request:** `{ "type": "eppgrid/overview/subscribe", "device_id": str }`

**Events (in order, and repeating for the life of the subscription):**

1. `{ "snapshot": <stored device config dict> }` — sent immediately on subscribe
    (even when the device is offline) so the card can draw the room layout from
    stored data.
1. `{ "available": bool }` — reflects the stream's live/lost state: `true` once
    the stream (re)arms successfully — including the very first arm right after
    subscribing — and `false` whenever it loses its connection (device offline,
    a reconnect attempt that fails). No further data frames arrive while
    `available` is `false`; they resume once a following `true` arrives, with
    no action needed from the client — the manager re-arms the stream itself.
1. `{ "available": false, "closed": true }` — terminal, and the one case the
    client MUST act on: the manager tore the stream down (eppgrid config-entry
    unload/reload, device removed). The subscription is still open but points
    at a stream that no longer exists, and no `available: true` will ever
    follow. The client must re-subscribe if it still wants frames. The
    `available` key rides along so a card bundle predating this signal still
    shows its offline banner.
1. `{ "targets": [...], "sensors": {...}, "zones": {...} }` — live data frames,
    same shape as the `subscribe_grid_targets` payload, streamed at the same
    rates (display_interval / zone_state_interval) while the stream is armed.

Errors: `device_not_found` when the `device_id` doesn't match a known device.

#### `eppgrid/overview/subscribe_heatmap`

Streams the on-device activity heatmap for one device — the non-admin,
`device_id`-based counterpart of the admin `subscribe_heatmap` command, used by
the dashboard card's **Heatmap** option. Like `overview/subscribe` it registers
a durable state stream (so it also recovers automatically after the device
flaps) and counts under `heatmap_subs` — but, unlike `overview/subscribe`, it
passes a `poll_fn` (`lambda conn: conn.async_fetch_heatmap()`), so the stream
polls the `epp_get_heatmap` request/response action roughly every 2s instead of
being pushed via `subscribe_states` (issue #365); `heatmap_subs` no longer
drives any firmware-side emission (see `heatmap_interval` in *Pipeline
intervals* below). Its wire contract is deliberately unchanged from before
durable streams, though: it never relays live `available` events, because
already-deployed card bundles treat any message without a `cells` field as an
empty heatmap — see architecture.md → *Durable frontend state streams*.

**Request:**
`{ "type": "eppgrid/overview/subscribe_heatmap", "device_id": str }`

**Events:** `{ "cells": [int, ...] }` — the decoded activity cells (0-255,
row-major), streamed while the stream is armed; or, at most once, right after
subscribing, `{ "available": false }` if the stream could not be armed. No
snapshot is sent (unlike `overview/subscribe`).

It does relay the terminal teardown signal, as `{ "closed": true }` (no
`available` key — this wire has never carried liveness): the manager dropped the
stream and only a re-subscribe can restore it. A bundle predating the signal
reduces it to an empty overlay, which is accepted — by the time it fires, that
overlay is already frozen for good, its backend stream gone with no frame ever
coming.

Errors: `device_not_found` when the `device_id` doesn't match a known device.

#### `eppgrid/clear_heatmap`

Clears a device's on-device activity heatmap (RAM accumulator + NVS blob),
non-admin — the card counterpart of the admin `eppgrid.clear_heatmap` HA action
documented under *HA Actions (Services)* above. Powers the card's **Toggle and
clear on card** heatmap mode (`show_heatmap: "toggle_and_clear"` — see *Card
configuration keys* below): clicking the Clear button, after the confirm dialog,
sends this command directly — a one-shot mutation, unlike the subscribe-style
commands elsewhere in this section.

Resolves `device_id` to a mac server-side (same as `overview/subscribe`), gets
the device's live session, and calls `DeviceConnection.async_clear_heatmap()` —
the same method the admin HA action calls, which executes the firmware's
`epp_clear_heatmap` service action (see
[Activity Heatmap](#activity-heatmap-firmware)).

**Request:** `{ "type": "eppgrid/clear_heatmap", "device_id": str }`

**Response:** empty result on success.

Errors: `device_not_found` (unknown `device_id`), `no_session` (device known but
no live session — the standard `_send_no_session` shape, translation key
`no_active_session`), `clear_heatmap_failed` (the firmware service call raised —
e.g. firmware predates the `epp_clear_heatmap` action).

The card only clears its locally-rendered heatmap overlay after this call
resolves (`_onClearHeatmapConfirm` in `eppgrid-card.ts`) — a failed or offline
call leaves the displayed cells untouched rather than optimistically blanking
data that may still be on the device.

#### Card configuration keys

`custom:eppgrid-card` config keys (in addition to `device_id`):

| Key                  | Type           | Default   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | -------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show_heatmap`       | bool \| string | `false`   | Heatmap layer mode: `"off"`, `"on"`, `"toggle"` (adds a viewer-facing show/hide switch on the map, state persisted per device via `persistCardHeatmapEnabled`), or `"toggle_and_clear"` (the same switch, plus a Clear button that calls `eppgrid/clear_heatmap` above, with a confirm dialog). Legacy boolean configs still work — `true` normalizes to `"on"`, `false`/absent to `"off"` (`normalizeHeatmapMode` in `eppgrid-card.ts`); `heatmapHasToggle(mode)` / `heatmapHasClear(mode)` gate which affordances render. |
| `floor_plan`         | string         | *(unset)* | Floor-plan background image URL (uploaded `/api/image/serve/{id}/original`, or any user URL such as `/local/plan.png`). Rendered behind the map, stretched to the calibrated room rectangle. While a floor plan is set, the map always renders the clean look (no gridlines/cell fills) so the plan stays visible — `show_grid` has no effect.                                                                                                                                                                              |
| `floor_plan_opacity` | number         | `100`     | Floor-plan opacity, 0–100 (%).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

______________________________________________________________________

### `list_devices`

Returns discovered EPP devices.

**Request:** `{ "type": "eppgrid/list_devices" }` **Response:**

```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Living Room Sensor",
            "host": "192.168.1.50",
            "available": true,
            "configured": true,
            "area": "Living Room",
            "firmware_status": "compatible",
            "current_connection_count": 1,
            "bluetooth_enabled": false,
            "co2_enabled": true,
            "ethernet_enabled": false,
            "heatmap": true,
            "board_revision": "v2",
            "sensor_variant": "ld2450",
            "firmware_channel": "stable",
            "model": "epp-pro"
        }
    ]
}
```

`name` is the stored config name when present; otherwise it comes from the HA
device-registry entry (`name_by_user` if set, otherwise `name`), and if there is
no registry entry it falls back to the discovered/cached device name. Renames in
HA or ESPHome are reflected on the next call.

`area` is the assigned HA area name, or `null` if the device is not in an area.

`firmware_status` is `"compatible"`, `"firmware_behind"`, or `"firmware_ahead"`
— comparing the device's `Firmware Version` text sensor to the integration's
`FIRMWARE_VERSION` using semver.

The build flag fields (`bluetooth_enabled`, `co2_enabled`, `ethernet_enabled`,
`heatmap`, `board_revision`, `sensor_variant`, `firmware_channel`, `model`) are
optional — they are only present after the device has connected and build flags
have been fetched via the `get_build_flags` API action. Build flags are merged
without overriding the base fields above (`mac`, `name`, `host`, `available`,
`configured`, `area`, `firmware_status`, `current_connection_count`) — flag data
comes from the device and must not rewrite identity fields.

`heatmap` reflects whether the connected firmware build compiled in the
activity-heatmap accumulator (`EPP_HEATMAP_ENABLED`) — some variants omit it to
save RAM. The panel gates the heatmap overlay toggle on this flag (plus
`firmware_status`, since firmware older than 1.3.0 never sends it at all): see
`_heatmapAvailability()` in `frontend/src/eppgrid-panel.ts`.

### `frontend_version`

Returns the content hashes of the currently-served panel and dashboard-card
bundles. Each frontend (panel or card) reads its own hash from `import.meta.url`
(bundles load from the content-hashed paths
`/eppgrid_static/<hash>/eppgrid-panel.js` and `.../eppgrid-card.js`) and
compares it against the matching value here; if they differ — i.e. an upgrade
swapped the bundle while the tab stayed open — it reloads the page so the new
version is picked up automatically. The panel checks `hash` on websocket
reconnect; the card checks `card_hash` on mount and on reconnect (the card is a
separate bundle with its own hash). **Not admin-gated** — the dashboard card
renders for non-admin viewers, and the payload is just non-sensitive content
hashes. See `frontend/src/lib/version-check.ts`.

Separately, `/eppgrid_fw/<token>/{variant}.json` + `.../{variant}.ota.bin` is
another unauthenticated served path: the firmware cache HA downloads and
md5-verifies GitHub's public firmware into, then serves over the LAN so an
internet-restricted device can still fetch its OTA (`token` is
`secrets.token_hex(8)`). See `custom_components/eppgrid/firmware_cache.py`.

**Request:** `{ "type": "eppgrid/frontend_version" }` **Response:**
`{ "hash": str | null, "card_hash": str | null }` — each is `null` until that
bundle has been hashed (e.g. before the panel/card resources are first
registered). On a bundle read error the hash is the string `"0"` (the same
sentinel `_register_frontend_resources` puts in the static-path URL); the
frontend treats `"0"` as "unhashable — never reload to it".

### `get_config`

Returns stored config for a device.

**Request:** `{ "type": "eppgrid/get_config", "mac": str }` **Response:**
`{ "config": {...} }` — calibration, room_layout, env_calibration, etc.

### `eppgrid/configure_device`

Sets `name_by_user` / `area_id` on the device's HA registry entry (when
provided). When `name` is set and `recreate_entity_ids` is true, the device's
entity IDs are regenerated from the new name's slug. Admin only.

**Request:**
`{ "type": "eppgrid/configure_device", "mac": str, "name"?: str, "area_id"?: str, "recreate_entity_ids"?: bool }`

### `update_firmware`

Triggers OTA firmware update on a device via the `set_update_manifest` API
action. Derives the firmware variant (`wifi-ble-co2` or `ethernet-ble-co2`) from
build flags. By default Home Assistant downloads and md5-verifies the firmware
and serves it to the device over the LAN (the unauthenticated
`/eppgrid_fw/<token>/` path), then hands the device that HA-local manifest URL —
so a device with no internet access can still update. When HA can't determine a
device-reachable URL, or the download/verify fails, it falls back to the pinned
GitHub Pages URL built from `FIRMWARE_VERSION`
(`https://clintongormley.github.io/everything-presence-pro-grid/fw/v{VERSION}/{variant}.json`),
which the device fetches directly. Prefers the live session, falling back to a
temporary connection when none is open.

The optional `source` selects the manifest URL: `"auto"` (default) does the
prefer-local-then-GitHub resolution above; `"github"` forces the GitHub-direct
URL and skips HA-local serving entirely
(`async_trigger_ota(prefer_local=False)`). The panel sends `"github"` from its
**Download from GitHub** retry — HA can advertise a URL the device can't reach
(e.g. HA on a Docker bridge network hands out its container IP) and can't detect
that device-side failure, so the user can force the direct path, which an
internet-connected device can always fetch.

**Request:**
`{ "type": "eppgrid/update_firmware", "mac": str, "source": "auto"|"github" }`

### `subscribe_ota_progress`

Subscribes to OTA firmware update progress for a device. A live device session
(`async_open_session`, shared with `subscribe_device` — see the
session-lifecycle section) is **best-effort**: when one is available it
subscribes to ESPHome `UpdateState` entity changes and device log messages to
forward incremental progress; when it can't be opened — a device reads as
offline while its `http_request` download blocks the main loop, so a session
usually can't be opened right after the OTA is triggered — the command
downgrades to the sessionless outcome watch (below) instead of failing. Either
way it uses a shared `done` flag so only one terminal event (success or error)
is sent.

Success is confirmed two ways, whichever lands first: the `UpdateState` reaching
`current == latest`, OR — the reboot-proof path — the manager's
`async_wait_for_ota_outcome` classifying the outcome off the durable
firmware-version entity. The second path matters because the OTA reboots the
device (to free heap, and again after flashing), replacing the connection this
watcher's `UpdateState` subscription is bound to; the terminal
`current == latest` state then arrives on a successor connection the raw
subscription can't see. Confirming off the durable entity — the same signal a
page refresh reads, and the same one the Repairs flow polls — keeps completion
detection from being lost to the reboot (previously a fast local-served or
concurrent "update all" would report a false failure even though the device had
updated).

`async_wait_for_ota_outcome` reads that same entity but classifies the whole
outcome so an interrupted flash fast-fails instead of spinning the full outer
timeout. It returns one of three states:

- `success` — the device came back on `FIRMWARE_VERSION`.
- `aborted` — after download started, the device went offline and then settled
    back on the OLD firmware, staying there continuously for
    `_OTA_ABORT_STABLE_S` (10s) → `flasher.errors.ota_interrupted`. A successful
    flash returns on the NEW version and never parks on the old one; only a
    flash that didn't take (e.g. power lost mid-flash) does. The stability
    window debounces a brief between-chunk online blip so a still-downloading
    device is never mis-read.
- `timeout` — none of the above within `_OTA_OUTER_TIMEOUT_S` (240s); the outer
    timer owns it (`flasher.errors.ota_timeout`). A device that went offline
    mid-flash and never returned falls here too.

There is deliberately no offline-duration `gone` verdict: the firmware's
`http_request` OTA fetch blocks the main loop (BLE is paused for it), so the
device reads OFFLINE while it is still downloading successfully — an
offline-duration threshold could not distinguish that from a genuine disconnect.
Instead, `aborted` requires the device to sit on the OLD version continuously
(after having gone offline) for `_OTA_ABORT_STABLE_S`.

The abort detection arms ONLY after real download bytes have flowed (the
watcher's `saw_progress` flag), so the pre-OTA reboot (which also reads as
offline → back-on-old-version) is never mistaken for a started download. On the
sessionless path there is no `UpdateState` to set `saw_progress`, so it is
primed `True` — the command only subscribes after a successful trigger, so the
OTA is already in flight; the pre-OTA reboot is still excluded because the
frontend subscribes only after `async_trigger_ota` has finished rebooting the
device. The frontend's `OTA_BACKSTOP_MS` (270s) stays deliberately longer than
the 240s backend window so the backend's verdict always lands first.

N concurrent OTA watchers on the same device share ONE device log subscription
and ONE `epp_set_log_level` bump (tracked in the `OtaWatcherState` dataclass on
the `DeviceConnection`); the bump is reverted to the stored level — and the log
subscription dropped — only when the last watcher unsubscribes, and skipped
entirely when that release also closes the session.

When the device session can't be opened (device offline/unknown, the connection
raced to close, or `subscribe_states` fails), the command does NOT error — it
downgrades to the **sessionless** path: it skips the log/state subscriptions and
runs `async_wait_for_ota_outcome` (which reads the durable firmware-version
entity, needing no device connection) plus the outer timeout, so every device
reports its own success / abort / timeout. This is what makes "Update all"
report all devices rather than only the currently-streamed one (whose session is
reused without an availability check). The only thing lost on the sessionless
path is the incremental progress log stream — and the firmware's empty-URL
manifest-race retry that rides on it (log-driven), so a pre-1.2.1 device that
hits that race under "Update all" falls to the outer timeout instead of
auto-retrying (the race is fixed forward in firmware).

**Request:** `{ "type": "eppgrid/subscribe_ota_progress", "mac": str }`

**Events:**

- `{ "state": "updating", "progress": float|null }` — download progress (0-100
    or null for indeterminate)
- `{ "state": "success", "version": str }` — update complete, versions match
- `{ "state": "error", "message": str, "error_key": str }` — update failed (log
    error, version mismatch, or timeout). `error_key` is a frontend translation
    key (`flasher.errors.*`) — the frontend renders errors exclusively through
    it. Log-derived failures use `flasher.errors.ota_device_error`, whose
    translation interpolates the cleaned device text via the `{message}`
    placeholder. Download/connect failures (`Code: -1`, `ESP_ERR_HTTP_CONNECT`,
    `ESP_ERR_NO_MEM` — the device couldn't reach the download server) instead
    use `flasher.errors.ota_download_unreachable`, which points the user at
    network reachability between the device and Home Assistant. An interrupted
    flash (device settles back on its old firmware) uses
    `flasher.errors.ota_interrupted` (see `async_wait_for_ota_outcome` above); a
    device that goes offline mid-flash and never returns falls to the outer
    timeout (`flasher.errors.ota_timeout`).

The handler also monitors device log messages for `http_request.ota` and
`http_request.update` errors, forwarding the actual error message immediately.
Unsubscribe releases the session reference; the manager closes the connection
when no other subscriber holds one.

### Firmware Version Guard

All config commands (`set_setup`, `set_room_layout`, `set_entity_enabled`,
`set_settings`) check `firmware_status` before executing. On mismatch, they
return an error with code `"firmware_behind"`, `"firmware_ahead"`, or
`"unavailable"`.

In parallel, `device_manager._sync_firmware_repair_issue` raises an HA Repairs
framework issue (`firmware_behind_{mac}` or `firmware_ahead_{mac}`) for any
discovered device whose version doesn't match `FIRMWARE_VERSION`, and clears it
once the versions come back in line. Hooks fire from `async_discover` (initial
discovery) and `_on_device_available` (post-OTA reconnect), so users see the
mismatch in HA Settings → Repairs without having to open the panel. Translations
live under `issues.firmware_behind` / `issues.firmware_ahead` in `strings.json`.

`firmware_behind` issues are `is_fixable=True` and resolve via
`repairs.FirmwareUpdateRepairFlow` — Submit in the Repairs UI walks the user
through a confirm step and triggers an OTA via `repairs._trigger_ota` (the same
`set_update_manifest` API action the panel's Update Firmware button uses).
`firmware_ahead` stays unfixable: the resolution is to update the integration
via HACS, which the Repairs framework can't drive.

Because the integration is now the source of truth for firmware-update
detection, the device-side auto-poll on `update.http_request` is set to
`update_interval: never` in the variant YAMLs. The OTA button and the panel's
`set_update_manifest` action still drive the same component for explicit
checks/installs.

### `set_setup`

Saves perspective calibration. Clears room layout. Pushes to device. Sets
`settings.zone_presence` to `true` on calibration (`room_width > 0`) or `false`
on delete (`room_width = 0`), then calls `async_update_zone_entities` to
enable/disable zone entities accordingly.

**Request:**
`{ "type": "eppgrid/set_setup", "mac": str, "perspective": float[8], "room_width": float, "room_depth": float }`

### `set_room_layout`

Saves grid, zones, furniture. Pushes config to device. Updates zone entity
enable/disable/rename via `async_update_zone_entities`. Zone presence entities
are named `"Zone {name}"` (e.g. `"Zone Armchair"`), target count entities
`"Zone {name} Target Count"`. Zone 0 uses `"Zone Rest of Room"` /
`"Zone Rest of Room Target Count"`.

**Request:**
`{ "type": "eppgrid/set_room_layout", "mac": str, "grid_bytes": int[400], "zone_slots": ZoneSlot[8], "furniture": FurnitureItem[] }`

`grid_bytes` must contain exactly `GRID_COLS * GRID_ROWS` (400) entries —
firmware rejects partial grids, so the schema does too. Each `furniture` item is
validated against the shape the frontend serializes (`type`/`icon`/`label`
bounded strings, **required** finite `x`/`y`/`width`/`height` geometry, optional
finite `rotation`, `lockAspect` bool, optional bounded `id`; unknown keys
rejected) and the list's serialized JSON is capped at 64 KiB.

Furniture item fields:

- `type`: `"icon" | "svg" | "text"` — a text label is `"text"`.
- Text-label fields (used only when `type == "text"`; the backend schema
    validates them as optional keys regardless of `type`):
    - `text` (string, ≤512 chars) — the label content.
    - `fontFamily` (enum key: arial | verdana | tahoma | georgia | times | courier
        | trebuchet | comic).
    - `fontSize` (number, mm; must be 30–3000 — the frontend clamps to this range
        and the backend schema rejects values outside it) — real-world text
        height; scales with the room.
    - `color` (`#RRGGBB`, optional) — text colour; omitted ⇒ auto-contrast against
        the background (the box if set, else the cell underneath), like furniture.
    - `bold` / `italic` (bool).
    - `align` (`"left" | "center" | "right"`).
    - `background` (`#RRGGBB`, optional) — box fill (rendered ~85% opacity);
        omitted ⇒ no background.

`zone_slots` is a fixed-length-8 array. Slot 0 is zone 0 (always present, no
name/color); slots 1-7 are named zones or `null` when unused.

```
ZoneSlot[0] = Zone0Config {
    type: "default" | "bed" | "seating" | "transit" | "custom",
    // trigger/renew/timeout/handoff_timeout present ONLY when type === "custom"
    trigger?: int,
    renew?: int,
    timeout?: float,
    handoff_timeout?: float
}

ZoneSlot[1..7] = ZoneConfig | null
ZoneConfig = Zone0Config & {
    name: str,
    color: str  // hex "#rrggbb"
}
```

The timing types are load-bearing, not stylistic: the websocket validator
(`_validate_slot_timing`) normalises `trigger`/`renew` to **int** and
`timeout`/`handoff_timeout` to **float** before storage. The firmware's
ArduinoJson extraction is type-strict — a float-typed `"trigger": 7.0` in the
pushed JSON would silently fall back to the default (5) on older parsers — so
storage and pushes must keep trigger/renew as JSON integers. The firmware parser
(`epp_zone_config_parser.h`) additionally tolerates float-typed timing as
defense-in-depth, rounding half-up to match the validator.

Non-custom types (`default` / `bed` / `seating` / `transit`) carry only `type`
(plus `name` / `color` on named slots) in storage and on the websocket. Their
timing is resolved from `ZONE_TYPE_DEFAULTS` — defined in
`frontend/src/lib/zone-defaults.ts` and mirrored in
`custom_components/eppgrid/device_manager/_helpers.py`. The backend expands
non-custom slots with those defaults just before pushing to firmware. **Firmware
is type-agnostic** — it only sees expanded timing fields and never knows the
type names. Adding/renaming a type or tweaking defaults therefore requires only
a frontend + backend code change; HA restart triggers a re-push that propagates
new values to the device. Upgrading the defaults = bump both tables;
`test_zone_type_defaults_match_frontend` fails if they drift. Layouts saved
before this change — with legacy type values — still load: the backend maps
`"rest"`→`bed` timing (600 s timeout) and `"thoroughfare"`→`transit` timing (3
s) via `_LEGACY_ZONE_TYPE_MAP` in `_helpers.py` (the stored `type` string itself
is left untouched); `"normal"` and anything else unrecognised falls through to
the Default timing row. NOTE: the frontend's display-side normalization in
`frontend/src/lib/config-serialization.ts` still shows all legacy types as
Default — aligning it with the backend mapping is a tracked frontend task.

Wire-protocol-wise this is a 0.94.0-or-newer contract. Earlier firmware (0.93.x)
received zone 0 as top-level
`room_type`/`room_trigger`/`room_renew`/`room_timeout`/`room_handoff_timeout`
fields; those were removed before public release. Any further wire-format change
must keep the existing fields readable or ship a migration — the public-release
contract is what users have running.

Each cell in `grid_bytes` is a uint8 with bit layout: bit 0 = room
(inside/outside), bits 1-3 = zone (0-7), bits 4-5 = 4-state overlay enum (`0`
none, `1` entry/exit, `2` interference, `3` suppress), bits 6-7 unused. Pinned
by `CELL_ROOM_BIT` / `CELL_ZONE_MASK` / `CELL_OVERLAY_MASK` in
`frontend/src/lib/grid.ts` and the matching constants in
`firmware/lib/epp_zone_engine/include/epp_grid.h`.

### `set_entity_enabled`

Enables/disables an ESPHome entity. Scoped to the requested device: the
`entity_id` must belong to `mac`'s HA device, otherwise the command returns
`entity_not_on_device` (or `entity_not_found` for unknown entity ids).

**Request:**
`{ "type": "eppgrid/set_entity_enabled", "mac": str, "entity_id": str, "enabled": bool }`

### `set_settings`

Saves all device settings (offsets, timeouts, distances, thresholds, LED, relay,
entities, log levels) in one call. Pushes full config to device.
Auto-enables/disables relay switch entity based on `relay_trigger_mode`. When
`entities` is provided and modifies `disabled_by`, sets `_entity_update_macs`
guard to suppress the redundant reconnect push caused by the ESPHome config
entry reload. When `entities.zone_presence` is provided, persists to
`settings.zone_presence` and calls `async_update_zone_entities` (if enabling)
for layout-aware zone naming.

**Request:**
`{ "type": "eppgrid/set_settings", "mac": str, "temperature_offset": float, ..., "led_mode": str, "led_brightness": float, "led_presence_color": str, "static_led_enabled": bool, "relay_trigger_mode": str, "relay_contact_mode": str, "entities": { ... }, "log_levels": { ... } }`

**LED settings:**

| Key                  | Type   | Default            | Description                                                                 |
| -------------------- | ------ | ------------------ | --------------------------------------------------------------------------- |
| `led_mode`           | string | `"Manual Control"` | One of: Manual Control, Occupancy, Environmental, Environmental + Occupancy |
| `led_brightness`     | float  | `1.0`              | RGB LED brightness multiplier (0.1–1.0)                                     |
| `led_presence_color` | string | `"#CC33FF"`        | Hex RGB color for occupancy indication                                      |
| `static_led_enabled` | bool   | `true`             | Enable/disable SEN0609 indicator LED                                        |

**Relay settings:**

| Key                  | Type   | Default      | Description                                      |
| -------------------- | ------ | ------------ | ------------------------------------------------ |
| `relay_trigger_mode` | string | `"disabled"` | One of: disabled, motion, presence, occupancy    |
| `relay_contact_mode` | string | `"no"`       | One of: no (Normally Open), nc (Normally Closed) |

**Update rate settings (optional):**

| Key                     | Type | Valid values         | Description                                                                    |
| ----------------------- | ---- | -------------------- | ------------------------------------------------------------------------------ |
| `target_update_rate_ms` | int  | 200, 500, 1000, 2000 | Target entity sensor publish rate (stored in `settings.target_update_rate_ms`) |
| `zone_update_rate_ms`   | int  | 200, 500, 1000, 2000 | Zone entity sensor publish rate (stored in `settings.zone_update_rate_ms`)     |

**Sensor-assisted clear settings:**

| Key                      | Type      | Default | Valid values | Description                                                                                                                                                                      |
| ------------------------ | --------- | ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assisted_clear_enabled` | bool      | `true`  | —            | Enables sensor-assisted clear: pending zones are force-cleared once both presence sensors are inactive and no zone is occupied. Pushed to firmware via `epp_set_assisted_clear`. |
| `assisted_clear_timeout` | float (s) | `5`     | 0–600        | Grace delay the room must stay empty before pending zones are cleared; `0` = immediate. Pushed to firmware via `epp_set_assisted_clear`.                                         |

Both keys thread through the settings pipeline exactly like
`stuck_target_timeout` (member of `_SETTINGS_KEYS`, `vol.Required` in the
schema). New installs get the 5 s default; pre-existing installs are migrated to
`0` (immediate) by the v2→v3 store migration — see
[Configuration Storage](#5-configuration-storage).

**Entity toggle keys (within `entities` dict) — additions:**

| Key                 | Description                                     |
| ------------------- | ----------------------------------------------- |
| `target_active`     | Enable/disable Target 1-3 Active binary sensors |
| `target_signal`     | Enable/disable Target 1-3 Signal sensors        |
| `target_zone`       | Enable/disable Target 1-3 Zone sensors          |
| `zone_target_count` | Enable/disable Zone 0-7 Target Count sensors    |

**Firmware push:** LED mode/brightness/color pushed via `epp_set_led` action
(mode, brightness, presence_red/green/blue as 0.0–1.0 floats). SEN0609 LED
toggle passed through existing `epp_set_static_presence` action's `led_enabled`
parameter. Relay settings pushed via `epp_set_relay` action (trigger_mode,
contact_mode).

### `set_distance_override`

Pushes tracking + static presence ranges to firmware via session without
persisting. Used by the editor to temporarily widen ranges on entry (so the
sensor sees the full area) and revert on cancel.

**Request:**
`{ "type": "eppgrid/set_distance_override", "mac": str, "target_max_distance": float, "static_min_distance": float, "static_max_distance": float }`

### Pipeline intervals (firmware push)

Pipeline intervals are derived by `_compute_pipeline` from the device's stored
`settings` (entity flags + `target_update_rate_ms` / `zone_update_rate_ms`) and
live subscriber counts, then pushed to the firmware via the `epp_set_pipeline`
ESPHome service. Backend-internal — not a WS command surface.

| Field                    | Source                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| `entity_target_interval` | `settings.target_update_rate_ms` if any target entity is enabled, else `0` |
| `entity_zone_interval`   | `settings.zone_update_rate_ms` if any zone entity is enabled, else `0`     |
| `display_interval`       | `200` when a frontend raw or grid subscription is open, else `0`           |
| `zone_state_interval`    | `1000` when a frontend grid subscription is open, else `0`                 |
| `heatmap_interval`       | always `0` — retained-but-unused (see below)                               |

The subscriber counts that gate `display_interval` / `zone_state_interval` are
held on the `DeviceManager` keyed by MAC (`_target_subs`),
incremented/decremented by the `subscribe_raw_targets` /
`subscribe_grid_targets` handlers via `note_target_subscribe` /
`note_target_unsubscribe`. They deliberately do **not** live on the
`DeviceConnection`: a device flap tears the connection down and reopens a fresh
one whose own counters would reset to zero, so a pipeline recomputed from those
would tell the device "no subscribers" and silence target/zone emission while
clients are still subscribed — the v1.1.0 "target disappears in the editor"
freeze. Keyed by MAC the counts survive connection replacement, the decrement
floors at zero (a stray unsubscribe whose increment landed on a since-replaced
connection can't drive it negative), and `async_open_session` re-pushes the
pipeline on reopen so emission resumes without a page refresh.

`subscribe_heatmap` also increments/decrements a `heatmap_subs` counter in the
same `_target_subs` map, for bookkeeping symmetry, but `_compute_pipeline`
ignores it: `heatmap_interval` is always pushed as `0` (issue #365) — the
heatmap is now fetched on demand via the `epp_get_heatmap` action (see
[Activity Heatmap](#activity-heatmap-firmware)) rather than published on a
timer, so there is nothing left for a subscriber-driven interval to gate. The
field stays in the pipeline dict purely because old firmware's
`epp_set_pipeline` action still declares it as a required argument.

`heatmap_interval` is stripped from the pushed pipeline dict entirely
(`pipeline.pop("heatmap_interval", None)`) for devices whose firmware predates
1.3.0 (`supports_heatmap()` in `device_manager/_helpers.py`, gated on
`HEATMAP_MIN_FIRMWARE = "1.3.0"`) — older `epp_set_pipeline` ESPHome service
calls have no such parameter, so sending it would fail the call outright.

The firmware rolling-median window is fixed at 1000ms (10 frames at the LD2450's
nominal 10Hz). Signal is `min(frame_count, 9)` over that window, so it stays
bounded on sensor over-delivery and matches the comparison space the frontend
uses.

### `dismiss_target`

Marks a single target slot as dismissed at a given grid cell so the firmware's
ghost-suppression logic can ignore that target when it next appears in that
cell. Used by the panel's "Mark as ghost" UI.

**Request:**
`{ "type": "eppgrid/dismiss_target", "mac": str, "target_index": 0..2, "cell_index": -1..GRID_CELL_COUNT-1 }`

`cell_index = -1` means "any cell" (clears the dismiss flag for that target).

Errors: `device_not_found` for an unknown MAC (standard `_require_known_device`
check), `no_session` / `no_active_session` when no live session exists
(including known-but-offline devices), `dismiss_failed` when the firmware
service call fails.

### `set_show_room_calibration_tutorial`

Per-device toggle for the calibration-tutorial overlay shown above the wizard.
Persisted alongside the rest of the device's settings.

**Request:**
`{ "type": "eppgrid/set_show_room_calibration_tutorial", "mac": str, "enabled": bool }`

### Saved-Configuration Commands

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `list_configurations`  | List saved configurations (grid + zones + sparse settings) |
| `save_configuration`   | Save the current configuration under a name                |
| `delete_configuration` | Delete a saved configuration                               |

`save_configuration` caps each blob's serialized JSON at 256 KiB (measured as
UTF-8 bytes, matching what HA storage writes) and the store at 50 named
configurations — saving a new name beyond that returns
`too_many_configurations`; overwriting an existing name is always allowed.

Restoring a configuration is a frontend-side operation: the configuration dialog
applies the saved `grid_bytes`/`zone_slots`/`settings` into panel state and then
calls `set_room_layout` and `set_settings` through the usual path. There is no
server-side `apply_configuration` command.

### Flasher Commands

#### `list_flashable_devices`

Returns all ESPHome devices matching EPP manufacturer/model, regardless of
whether they run original or Everything Presence Pro Grid firmware.

**Request:** `{ "type": "eppgrid/list_flashable_devices" }` **Response:**

```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Presence Pro Kitchen",
            "area": "Kitchen",
            "host": "192.168.1.42",
            "available": false,
            "firmware_type": "original",
            "firmware_version": "1.8.0",
            "update_available": false,
            "esphome_config_entry_id": "abc123"
        }
    ]
}
```

`name` is the device's friendly (user-facing) name — a rename if one was set,
otherwise the ESPHome node name. `area` is the name of the HA area the device
lives in, shown under `name` on the flasher row: the device's own area, or the
parent ESPHome node's area for a sub-device (linked via `via_device`) that has
no area of its own. It is `null` when neither is assigned. `firmware_type` is
`"original"` (no `firmware_version` entity) or `"eppgrid"` (has
`firmware_version` entity). `update_available` is `true` when the device runs
Everything Presence Pro Grid firmware and a newer version is available.
`firmware_version` is the current firmware version string. `firmware_status` is
`"compatible"`, `"firmware_behind"`, `"firmware_ahead"`, `"unknown"`, or
`"unavailable"`.

#### `delete_esphome_device`

Removes an ESPHome config entry (used to clean up after flashing). Scoped to EPP
hardware: the entry must be an ESPHome entry (`only_esphome_can_be_deleted`
otherwise) AND own at least one device-registry entry carrying the EPP
manufacturer/model signature — otherwise the command returns `not_epp_device`.
Entries with no registered devices yet are rejected (fail-closed).

**Request:**
`{ "type": "eppgrid/delete_esphome_device", "config_entry_id": str }`

#### `add_esphome_device`

Triggers the ESPHome config flow for a given host (used to add a freshly-flashed
device).

**Request:** `{ "type": "eppgrid/add_esphome_device", "host": str }`

### Device-Group Commands

All device-group commands are admin-only (`@websocket_api.require_admin`) and
handled in `websocket_api/_device_groups.py`. Inputs are validated at the
boundary (name 1-128 chars; 1-8 uppercase MACs matching the standard `AA:BB:...`
format; ≤16 zone groups, ≤16 members each). Failures return `invalid_input`; an
unknown `group_id` returns `not_found`; a not-yet-loaded manager returns
`device_groups_unavailable`.

> **Wire-param note:** create/update/delete take **`group_id`**, not `id` — HA
> reserves top-level `id` for the message envelope.

#### `list_device_groups`

**Request:** `{ "type": "eppgrid/list_device_groups" }` **Response:**
`{ "device_groups": [<group>, ...] }`

#### `create_device_group`

**Request:**
`{ "type": "eppgrid/create_device_group", "name": str, "sources": [MAC, ...], "area_id"?: str | null }`
**Response:** `{ "device_group": <group> }`

#### `update_device_group`

**Request:**
`{ "type": "eppgrid/update_device_group", "group_id": str, "name": str, "sources": [MAC, ...], "area_id": str | null, "zone_groups": [<zone_group>, ...] }`
**Response:** `{ "device_group": <group> }`

#### `delete_device_group`

Also removes the group's HA device-registry entry and its exposed entities.

**Request:** `{ "type": "eppgrid/delete_device_group", "group_id": str }`
**Response:** `{}`

#### `subscribe_device_groups`

Streams the full group list on subscribe and again on any create/update/delete.

**Request:** `{ "type": "eppgrid/subscribe_device_groups" }` **Event:**
`{ "device_groups": [<group>, ...] }`

The serialized `<group>` shape (see `_serialize_group`) augments the stored
definition with resolved, read-time fields — each source carries its display
`name`, `available` flag, `enabled_presence` slots and `zones`
(`{index, name, enabled}`), plus a derived `exposed_entities`:

```json
{
    "id": "…",
    "name": "Master Bedroom",
    "area_id": "bedroom",
    "sources": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "Bedroom Left",
            "available": true,
            "enabled_presence": ["occupancy", "static_presence"],
            "zones": [{ "index": 2, "name": "Bed", "enabled": true }]
        }
    ],
    "zone_groups": [
        { "id": "zg_1a2b3c4d", "name": "Bed", "members": [{ "mac": "AA:BB:CC:DD:EE:FF", "zone_index": 2 }] }
    ],
    "exposed_entities": {
        "presence": ["occupancy", "static_presence"],
        "zones": [
            { "kind": "group", "id": "zg_1a2b3c4d", "name": "Zone Bed", "available": true },
            { "kind": "passthrough", "mac": "AA:BB:CC:DD:EE:FF", "zone_index": 3, "name": "Desk", "available": true }
        ]
    }
}
```

`exposed_entities` is computed by `derive_exposed_entities` (mirrored in the
frontend's `lib/device-groups-projection.ts`) and is never persisted — see
section 5 and architecture.md → *Device Groups*.

## 4. Firmware Data Pipeline

```
LD2450 UART (~10Hz)
  → rolling median (fixed 1000ms window, computed every frame)
    → perspective transform (every frame)
      → zone engine (every frame, counts frames per zone)

Publishing (5 independent output timers):
  → entity_target   → user Hz   target_N_{x,y,signal,active,zone} + target_count
                                 (only published when entity enable flag is set)
  → entity_zone     → user Hz   zone_N_{presence,target_count}
                                 (only published when entity enable flag is set)
  → display         → 200ms     raw + grid text sensors
                                 (only published when frontend is subscribed)
  → zone_state      → 1000ms    zone state JSON text sensor
                                 (only published when frontend is subscribed)
  → system          → 1000ms    device tracking + presence outputs + relay
                                 (always published)
```

### Zone State JSON (firmware `ev` field)

Firmware v1.2.0+ emits structured detection-log events in the zone state JSON
text sensor as `"ev": [...]`. The integration passes this array through as
`events` in the `subscribe_grid_targets` payload. The panel renders it as a
human-readable event timeline.

For older firmware (pre-1.2.0) that still publishes a `"debug_log"` string
field, the panel falls back to parsing and enriching that snapshot for
readability (e.g. replacing zone IDs with zone names) via `enrichDebugLog`.
`debug_log` is no longer present in current firmware.

#### Detection-Log Event Codes

| Code               | Meaning                                                  |
| ------------------ | -------------------------------------------------------- |
| `sa` / `sp` / `sc` | static presence active / pending / cleared               |
| `ma` / `mp` / `mc` | motion presence active / pending / cleared               |
| `zo:Z` / `zp:Z`    | zone Z occupied / clearing                               |
| `zc:Z:r`           | zone Z cleared, reason `r` (see legend below)            |
| `oo` / `of`        | room occupancy on / off                                  |
| `wo` / `wf`        | mmWave on / off                                          |
| `fc:Z`             | zone Z sensor-assisted force-clear                       |
| `td:T:secs`        | target T auto-dismissed (stuck for secs seconds)         |
| `te:T:Z`           | target T entered zone Z                                  |
| `tl:T`             | target T left the room                                   |
| `tm:T:Za:Zb`       | target T moved from zone Za to Zb                        |
| `xd:n`             | n events dropped (firmware queue / JSON-budget overflow) |

Zone-clear reason `r` (the `zc:Z:r` suffix):

| `r` | reason                                                                       |
| --- | ---------------------------------------------------------------------------- |
| `t` | timeout — the zone's normal clear timeout elapsed                            |
| `h` | handoff — the last confirmed target moved to another zone                    |
| `o` | overlay exit — the last confirmed target vanished from an entry-overlay cell |
| `f` | force — sensor-assisted force-clear (both presence sensors idle)             |

A `zc:Z` with no `:r` suffix (forward/back-compat) renders as a plain "cleared".

#### Firmware DEBUG Log Lines (not detection-log events)

The following lines appear only in the firmware DEBUG log. They are **not**
structured detection-log events — no new `EventType` was added and they are
never included in the `ev` array or the `subscribe_grid_targets` payload.

| Log line                             | Meaning                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `T<i> parked -> T<j>`                | Step 0 pending-target relocation: the PENDING target held in slot `i` was moved to free slot `j` because slot `i` was reused by a far new entrant. Entrance-gated (the new entrant must arrive via an entry overlay); falls back to distance-only when no entry overlay is configured anywhere on the grid. |
| `T<i> pending dropped: no free slot` | Step 0 fallback when all slots are active: no free slot was available to park the held PENDING target, so it is dropped and its zone's pending bit is stripped (clean clobber).                                                                                                                             |

### Activity Heatmap (firmware)

`epp::Heatmap` (`firmware/lib/epp_component_helpers/include/epp_heatmap.h`) is a
per-cell activity accumulator, one `float` per grid cell (400 cells). It is
always running — cheap to keep on, independent of whether any frontend is
looking at it:

- **Bump** — every frame, each detected target's grid cell is bumped (`+1.0f`),
    gated on the cell being inside the room (`grid_.cell_is_room`).
- **Decay** — every 5 minutes, all cells are multiplied by a fixed factor
    (`HEATMAP_DECAY_INTERVAL_MS`), tuned so repeated bumps to the same cell
    decay with a ~14-day half-life (`HEATMAP_HALF_LIFE_TICKS = 4032` — the
    number of 5-minute ticks in 14 days). This is what makes the heatmap track
    "where people spend time lately" rather than accumulating forever.
- **Serve** — the accumulator is normalized to the peak cell
    (`encode_normalized`: each cell scaled to 0-255 against the current max) and
    base64-encoded on demand by `EPPComponent::get_heatmap_base64()`, returned
    via the `epp_get_heatmap` API action (`api.respond {"b64": ...}`). The
    integration polls this action every ~2 s while a heatmap subscriber is
    connected and streams the decoded `{cells}` over the WebSocket API — the
    firmware no longer publishes a `Heatmap` text_sensor (issue #365).
    Normalizing against the live peak (rather than a fixed scale) keeps the
    colour ramp meaningful whether the room has light or heavy traffic.
- **Persist** — every hour, the raw (pre-normalization) float array is
    serialized (`serialize()`/`blob_size()`) and written to NVS under the key
    `"heatmap"` (schema/format version 3 — see the NVS layout notes in
    `epp_component_helpers`). Restored from NVS on boot
    (`nvs_get_blob(handle, "heatmap", ...)`), so accumulated activity survives a
    reboot/power-cycle; a length-mismatched blob (e.g. after a schema change) is
    ignored rather than partially applied.
- **Reset** — `reset_heatmap_()` zeroes the accumulator. Called wherever the
    grid geometry or calibration changes (new perspective calibration, new room
    layout) — old cell activity has no meaning against a different room mapping,
    so it doesn't carry over.
- **Clear** — `EPPComponent::clear_heatmap()` (`epp_component.cpp`) is the
    user-triggered counterpart of Reset above: it calls `reset_heatmap_()` to
    zero the RAM accumulator, then immediately `save_heatmap_to_nvs_()` to
    overwrite the persisted NVS blob too (rather than waiting for the hourly
    persist), and logs `Heatmap cleared (RAM + NVS)`. Invoked by the
    `epp_clear_heatmap` ESPHome API action
    (`firmware/common/everything-presence-pro-base.yaml`), which both the HA
    action `eppgrid.clear_heatmap` and the WS command `eppgrid/clear_heatmap`
    call via `DeviceConnection.async_clear_heatmap()` — see *HA Actions
    (Services)* and *Overview Card Commands* in section 3 above. Because it also
    rewrites NVS, the clear survives a device reboot — unlike Reset, which only
    zeroes RAM (a subsequent geometry-change reset is always followed by the
    normal hourly persist).

**Build flag:** `EPP_HEATMAP_ENABLED` (default `1`) now gates only the reported
`heatmap` capability flag — there's no `Heatmap` sensor left for it to gate
publishing on, since the firmware never publishes one (the accumulator and the
`epp_get_heatmap` action are always compiled in regardless of this value; a
future memory-constrained variant that needs to reclaim the ~1.6 KB accumulator
would still need to add the `#if` guarding to actually compile it out). The
component reports the flag at runtime through `get_build_flags` as the `heatmap`
field (see `list_devices` in *Commands* above) — the panel uses it, together
with `firmware_status`, to distinguish "firmware too old to know about heatmap
at all" from "this build compiled it out."

## 5. Configuration Storage

`EPPGridStore` persists per-device config keyed by MAC:

```python
{
    "AA:BB:CC:DD:EE:FF": {
        "calibration": {"perspective": [8 floats], "room_width": float, "room_depth": float},
        "room_layout": {"grid_bytes": [400 ints], "zone_slots": ZoneSlot[8], "furniture": [...]},
        "env_calibration": {"temperature_offset": float, "humidity_offset": float, "illuminance_offset": float},
        "motion_timeout": {"timeout": float},
        "tracking": {"max_range": float},
        "static_presence": {"min_range": float, "max_range": float, ...},
        "relay": {"trigger_mode": str, "contact_mode": str},
    }
}
```

`room_layout.zone_slots` is a fixed-length-8 array using the same `ZoneSlot`
shape as the `set_room_layout` wire payload: slot 0 holds zone 0 (always
present), slots 1-7 hold named zones or `null`. This is the 0.94.0-or-newer
storage format; layouts written by 0.93.x (with top-level `room_*` fields) are
not migrated and must be re-applied once after upgrade.

Saved configurations are stored separately in `EPPGridStore.configurations`
using a matching shape:

```python
{
    "Living Room Setup": {
        "grid_bytes": [400 ints],
        "zone_slots": ZoneSlot[8],   // same shape as room_layout.zone_slots
        "room_width": float,
        "room_depth": float,
        "furniture": [...],
        "settings": dict,            // sparse: only non-default fields
    }
}
```

All config is pushed to the device on save and on reconnect. The push prefers
the existing frontend session connection when one is active (avoids the ESP32
concurrent connection limit); otherwise it creates a temporary connection (e.g.,
on-boot push when no frontend is open).

**Store migrations** are handled by `_MigratingStore._async_migrate_func`
(`STORAGE_VERSION` is currently **4**):

- **v1 → v2** — adds the `device_groups` list (see below).
- **v2 → v3** — stamps `assisted_clear_timeout: 0` into the `settings` of every
    pre-existing device and saved configuration so upgraded installs keep
    clearing pending zones immediately, matching the old hard-coded behaviour.
    New installs (no stored settings to migrate) fall through to the 5 s
    frontend default. `assisted_clear_enabled` needs no stamping — absent means
    default `true`.
- **v3 → v4** — seeds `excluded_presence: []`, `excluded_zones: []`, and
    `excluded_zone_groups: []` on every existing device group, and removes any
    `zone_groups` member with `zone_index: 0` (legacy Rest-of-room merge —
    replaced by the implicit combined Rest of room).

**Device groups** are persisted separately in `EPPGridStore.device_groups`
(added by the v1→v2 store migration; current format is **v4**) as a list of
definitions:

```python
[
    {
        "id": str,                  # UUID hex, server-assigned
        "name": str,                # 1-128 chars
        "area_id": str | None,      # HA area applied to the group's device
        "sources": [str, ...],      # 1-8 member MACs (uppercase)
        "zone_groups": [
            {
                "id": str,
                "name": str,        # 1-128 chars
                "members": [
                    {"mac": str, "zone_index": int},   # zone_index 1-7 (named zones only)
                    ...                                 # 0-16 members
                ],
            },
            ...                     # up to MAX_ZONE_GROUPS_PER_DEVICE_GROUP (16)
        ],
        # Opt-out exclusion fields (all default []); added by v3→v4 migration:
        "excluded_presence": [str, ...],            # presence slot keys to suppress
                                                    # e.g. ["static_presence"]
        "excluded_zones": [                         # individual source zones to suppress
            {"mac": str, "zone_index": int},        # zone_index 1-7
            ...
        ],
        "excluded_zone_groups": [str, ...],         # zone-group ids to suppress; the
                                                    # schema accepts any id, but the
                                                    # editor only ever adds "rest_of_room"
                                                    # (merged zones have no toggle)
    },
    ...                             # up to MAX_DEVICE_GROUPS (32)
]
```

`zone_groups` members use zone index **1–7** only (named zones). Zone 0 (Rest of
room) is handled as the **implicit combined Rest of room**: a synthetic zone
group with the reserved id `rest_of_room` that is never stored in `zone_groups`.
It is synthesised by `derive_exposed_entities` from every source's zone-0 entity
and exposes one binary sensor per group with unique_id
`eppgrid_device_group_{group_id}_zone_group_rest_of_room`. To suppress it, add
`"rest_of_room"` to `excluded_zone_groups`.

The **v3→v4 storage migration** seeds `excluded_presence`, `excluded_zones`, and
`excluded_zone_groups` to `[]` on every existing group, and rewrites any legacy
`zone_groups` member with `zone_index: 0` (old-style Rest-of-room merge) by
removing it (the combined Rest of room replaces it implicitly).

Only the *definition* is stored. The exposed entity list (`exposed_entities`) is
derived at read time by `device_groups/_projection.py` and is never persisted.
Live presence/zone state is held in the per-group runtime `Aggregator`, not in
the store. See architecture.md → *Device Groups* for the aggregation and
entity-creation flow.

## 6. Diagnostics

The integration implements the HA diagnostics platform (`diagnostics.py`). Users
can download a JSON dump from Settings > Devices & Services > Everything
Presence Pro Grid.

**Contents:**

| Key                   | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `integration_version` | Version from `async_get_loaded_integration(hass, DOMAIN).version`                      |
| `firmware_version`    | `FIRMWARE_VERSION` constant                                                            |
| `devices`             | Output of `manager.list_devices()` — all managed devices with build flags              |
| `stored_configs`      | Raw `EPPGridStore.devices` — per-device calibration, room layout, settings             |
| `configurations`      | Raw `EPPGridStore.configurations` — saved configurations                               |
| `entity_states`       | Per-device dict of `{entity_id: state_value}` for all HA entities (including disabled) |

Redaction: `mac` / `host` fields are redacted via `async_redact_data`; MAC-keyed
dicts (`stored_configs`, `entity_states`) are re-keyed to stable `device_N`
indices; and entity_ids inside `entity_states` have their device-name prefix
replaced by the same `device_N` index — default ESPHome device names embed the
MAC's last hex digits, which would otherwise leak through the entity_id keys.
