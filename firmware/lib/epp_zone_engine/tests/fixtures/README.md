# Zone-engine parity fixtures

`parity_scenarios.json` is the **single source of truth** for zone-engine
parity: the same file drives both engine implementations, so a scenario added
or changed here is automatically checked against both.

- **C++ (firmware engine)**: `../test_parity.cpp` — run via
  `cd ../../build && cmake --build . --target epp_parity_tests && ./tests/epp_parity_tests`
  (or `ctest` for the whole suite).
- **TypeScript (frontend port)**:
  `frontend/src/__tests__/panel-zone-engine-parity.test.ts` — run via
  `cd frontend && npx vitest run src/__tests__/panel-zone-engine-parity.test.ts`.

**Whenever you edit this fixture, run BOTH suites.** Both harnesses fail
loudly on malformed scenarios (missing keys, `ticks`/`expected` length
mismatch, empty scenario set).

## Schema

```jsonc
{
  "grid": { ... },      // shared 20×20 grid, one per fixture file
  "zones": { ... },     // zone configs keyed by zone id ("0" = room zone)
  "scenarios": { ... }  // named scenarios, each a tick sequence + expectations
}
```

### `grid`

The grid is 20×20 cells of 300×300 mm. Cells are addressed as `[col, row]`
pairs. In the C++ harness the grid origin is `(0, 0)`, so a target at
`(x, y)` mm lands in cell `(floor(x/300), floor(y/300))`. The TS harness
derives `roomWidth`/`roomDepth` from `room_cells` and shifts fixture `x` by
`startCol * 300` so both engines resolve identical cells (it asserts the room
columns match the TS engine's centred-room placement and fails loudly if not).

| key | value |
| --- | --- |
| `room_cells` | `[col, row][]` — cells carrying the room bit (zone 0) |
| `zone_cells` | `{ "<zone-id>": [col, row][] }` — cells assigned to named zones (also room cells) |
| `overlay_entry_cells` | optional `[col, row][]` — entry overlay (instant trigger, bypasses gating) |
| `overlay_suppress_cells` | optional `[col, row][]` — suppress overlay (targets on these cells are ignored / treated as "left room") |

A zone id that appears in `zone_cells` but **not** in `zones` is a
*painted-but-unconfigured* zone: both engines treat it as disabled (firmware
`find_zone_index` returns -1) — it can never confirm or occupy, but targets on
its cells still record position for continuity.

### `zones`

Keyed by zone id (`"0"`–`"7"`; `"0"` is the room-boundary zone). Every zone
must define **all four** thresholds — both harnesses apply the explicit
values and ignore `type` (it is informational only):

| key | value |
| --- | --- |
| `type` | informational label (`"normal"`, `"custom"`, …) — not consumed |
| `trigger` | 0–9 signal needed to confirm a CLEAR zone (0 clamps to 1 — `clamp_threshold`) |
| `renew` | 0–9 signal needed to re-confirm an OCCUPIED/PENDING zone (0 clamps to 1) |
| `timeout` | seconds from pending-start until the zone clears |
| `handoff_timeout` | seconds the pending timer is accelerated to on handoff |

### `scenarios`

Each scenario runs on a **fresh engine** (no state carries across scenarios).
`ticks` and `expected` are parallel arrays and **must be the same length**.

```jsonc
"test_example": {
  "stuck_target_timeout": 5.0,          // optional, SECONDS — stuck-target
                                        // auto-dismiss timeout for the whole
                                        // scenario (absent ⇒ 0 = disabled;
                                        // C++: set_stuck_target_timeout,
                                        // TS: params.stuckTargetTimeout)
  "ticks": [
    { "t": 100.0,                       // engine timestamp, SECONDS (drives all
                                        // timeout math — no wall clock anywhere)
      "targets": [                      // 0–3 targets, index = target slot
        { "x": 2850, "y": 450,          // position in mm, grid space (see above)
          "frames": 5 }                 // frames active in the rolling window;
                                        // signal = min(frames, 9);
                                        // frames = 0 ⇒ sensor NOT tracking
                                        // (C++: active=false; TS: x/y null)
      ],
      "sensors": {                      // optional — static/motion presence
        "static_on": true,              // inputs for this tick. Absent fields
        "motion_on": false,             // keep the defaults: off, 10s timeouts
        "static_timeout": 1.0,          // (C++: SensorInput{}; TS: the engine's
        "motion_timeout": 10.0          // staticTimeout/motionTimeout defaults)
      } }
  ],
  "expected": [                         // one entry per tick
    { "zone_occupancy": { "1": true },  // zone-id → occupied; only listed
                                        // zones are asserted ({} asserts none)
      "targets": [                      // optional; index = target slot
        { "status": "active",           // "active" | "pending" | "inactive"
                                        // — asserted by BOTH engines
          "x": 2850, "y": 450,          // optional, mm — asserted by C++ ONLY
          "signal": 5 }                 // optional — asserted by C++ ONLY
                                        // (the TS engine reports status alone;
                                        // pending-position display is a render
                                        // concern handled via targetPrevXY)
      ] }
  ]
}
```

### `known_divergence` (temporary — Task 7.2)

A scenario that fails on one engine because of a **known, not-yet-fixed
divergence** carries a tag naming the failing side and the divergence:

```jsonc
"test_example": {
  "known_divergence": {
    "ts": "first-tick confirmedTargets — TS creates zone state lazily, …"
    // or "cpp": "…" for scenarios the firmware engine fails
  },
  ...
}
```

- The **TS** suite runs `ts`-tagged scenarios via `it.fails`: they pass while
  the divergence exists and fail loudly the moment it is fixed — fix the
  engine, then delete the tag.
- The **C++** suite skips `cpp`-tagged scenarios with a logged
  `KNOWN-DIVERGENCE(7.2)` message (doctest has no subcase-level xfail).

Expected values always encode the **agreed-correct** behaviour (firmware =
reference for 7.2); never weaken expectations to make a divergent engine pass.
