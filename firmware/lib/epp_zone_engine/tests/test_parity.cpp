#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include <nlohmann/json.hpp>

#include <fstream>
#include <string>
#include <vector>

#include "epp_grid.h"
#include "epp_window.h"
#include "epp_zone_engine.h"

using namespace epp;
using json = nlohmann::json;

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

#ifndef EPP_FIXTURE_PATH
#error "EPP_FIXTURE_PATH must be defined at compile time"
#endif

static json load_fixtures() {
    std::ifstream f(EPP_FIXTURE_PATH);
    REQUIRE(f.is_open());
    json j;
    f >> j;
    return j;
}

// ---------------------------------------------------------------------------
// Builders from JSON config
// ---------------------------------------------------------------------------

static Grid build_grid(const json& grid_config) {
    Grid grid(0.0f, 0.0f, GRID_COLS, GRID_ROWS, GRID_CELL_SIZE_MM);

    for (auto& cell : grid_config["room_cells"]) {
        int col = cell[0].get<int>();
        int row = cell[1].get<int>();
        grid.cell(row * GRID_COLS + col) = CELL_ROOM_BIT;
    }

    for (auto& [zone_id_str, cells] : grid_config["zone_cells"].items()) {
        int zone_id = std::stoi(zone_id_str);
        for (auto& cell : cells) {
            int col = cell[0].get<int>();
            int row = cell[1].get<int>();
            grid.cell(row * GRID_COLS + col) =
                CELL_ROOM_BIT | (zone_id << CELL_ZONE_SHIFT);
        }
    }

    if (grid_config.contains("overlay_entry_cells")) {
        for (auto& cell : grid_config["overlay_entry_cells"]) {
            int col = cell[0].get<int>();
            int row = cell[1].get<int>();
            int idx = row * GRID_COLS + col;
            grid.cell(idx) = (grid.cell(idx) & ~CELL_OVERLAY_MASK) |
                             (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
        }
    }

    if (grid_config.contains("overlay_suppress_cells")) {
        for (auto& cell : grid_config["overlay_suppress_cells"]) {
            int col = cell[0].get<int>();
            int row = cell[1].get<int>();
            int idx = row * GRID_COLS + col;
            grid.cell(idx) = (grid.cell(idx) & ~CELL_OVERLAY_MASK) |
                             (CELL_OVERLAY_SUPPRESS << CELL_OVERLAY_SHIFT);
        }
    }

    return grid;
}

static std::vector<ZoneConfig> build_zones(const json& zone_configs) {
    std::vector<ZoneConfig> zones;
    for (auto& [zid_str, cfg] : zone_configs.items()) {
        // Missing-key access on a const json is UB (assert in Debug, silent
        // garbage in NDEBUG) — fail loudly instead.
        REQUIRE(cfg.contains("trigger"));
        REQUIRE(cfg.contains("renew"));
        REQUIRE(cfg.contains("timeout"));
        REQUIRE(cfg.contains("handoff_timeout"));
        ZoneConfig zc{};
        zc.id = std::stoi(zid_str);
        zc.trigger = cfg["trigger"].get<int>();
        zc.renew = cfg["renew"].get<int>();
        zc.timeout = cfg["timeout"].get<float>();
        zc.handoff_timeout = cfg["handoff_timeout"].get<float>();
        zones.push_back(zc);
    }
    return zones;
}

static WindowOutput build_window(const json& tick_data) {
    WindowOutput wo{};
    wo.total_frames = CANONICAL_FRAMES;
    auto& targets_arr = tick_data["targets"];
    for (int i = 0; i < static_cast<int>(targets_arr.size()) && i < MAX_TARGETS; ++i) {
        auto& t = targets_arr[i];
        int fc = t["frames"].get<int>();
        wo.targets[i].median_x = t["x"].get<float>();
        wo.targets[i].median_y = t["y"].get<float>();
        wo.targets[i].frame_count = fc;
        wo.targets[i].active = (fc > 0);
    }
    return wo;
}

static TargetStatus parse_status(const std::string& s) {
    if (s == "active") return TargetStatus::ACTIVE;
    if (s == "pending") return TargetStatus::PENDING;
    return TargetStatus::INACTIVE;
}

static const char* status_name(TargetStatus s) {
    switch (s) {
        case TargetStatus::ACTIVE: return "active";
        case TargetStatus::PENDING: return "pending";
        case TargetStatus::INACTIVE: return "inactive";
    }
    return "unknown";
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

static void run_scenario(const std::string& name, const json& scenario,
                         const json& fixtures) {
    // Structural guards — a malformed scenario must fail loudly, not no-op.
    // Out-of-range / missing-key access on a const nlohmann::json is UB
    // (assert in Debug, silent garbage in NDEBUG); without the size check a
    // short `expected` array silently skips the unmatched ticks and an
    // over-long one silently never checks its tail.
    INFO("Scenario: " << name);
    REQUIRE(scenario.contains("ticks"));
    REQUIRE(scenario.contains("expected"));

    Grid grid = build_grid(fixtures["grid"]);
    auto zone_cfgs = build_zones(fixtures["zones"]);

    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(zone_cfgs.data(), static_cast<int>(zone_cfgs.size()));

    // Optional scenario-level stuck-target auto-dismiss timeout (seconds).
    // Default (absent) leaves the engine's 0 = disabled.
    if (scenario.contains("stuck_target_timeout")) {
        engine.set_stuck_target_timeout(scenario["stuck_target_timeout"].get<float>());
    }

    auto& ticks = scenario["ticks"];
    auto& expected_arr = scenario["expected"];

    REQUIRE(ticks.is_array());
    REQUIRE(!ticks.empty());
    REQUIRE(expected_arr.is_array());
    REQUIRE(ticks.size() == expected_arr.size());

    // Track per-target overlay flag (sticky), simulating component behaviour
    // (epp_component.cpp Stage 2b — keep this simulation AND the TS harness's
    // mirror in lockstep with the component).
    bool target_on_overlay[MAX_TARGETS]{};
    bool target_prev_active[MAX_TARGETS]{};

    for (int i = 0; i < static_cast<int>(ticks.size()); ++i) {
        REQUIRE(ticks[i].contains("t"));
        REQUIRE(ticks[i].contains("targets"));
        float t = ticks[i]["t"].get<float>();
        WindowOutput wo = build_window(ticks[i]);

        // Simulate component raw-frame overlay tracking
        auto& targets_arr = ticks[i]["targets"];
        for (int ti = 0; ti < MAX_TARGETS; ++ti) {
            bool active = wo.targets[ti].active;
            // Slot-reuse guard (mirrors the component): inactive→active
            // means a brand-new target — the previous occupant's sticky
            // overlay-touch must not leak into it.
            if (active && !target_prev_active[ti]) {
                target_on_overlay[ti] = false;
            }
            if (active) {
                int cell = grid.xy_to_cell(wo.targets[ti].median_x, wo.targets[ti].median_y);
                if (cell != -1 && grid.cell_is_room(cell)) {
                    target_on_overlay[ti] = (grid.cell_overlay(cell) == CELL_OVERLAY_ENTRY);
                }
            }
            target_prev_active[ti] = active;
            // Optional explicit per-target on_overlay override: expresses a
            // RAW frame having touched an entry cell the MEDIAN position
            // never visits (the component tracks raw frames; this harness
            // only sees medians).
            if (ti < static_cast<int>(targets_arr.size()) &&
                targets_arr[ti].contains("on_overlay")) {
                target_on_overlay[ti] = targets_arr[ti]["on_overlay"].get<bool>();
            }
            wo.targets[ti].on_overlay = target_on_overlay[ti];
        }

        // Optional per-tick sensor inputs (static/motion presence) — absent
        // fields keep SensorInput's defaults (off, 10s timeouts).
        SensorInput sensors{};
        if (ticks[i].contains("sensors")) {
            auto& s = ticks[i]["sensors"];
            if (s.contains("static_on")) sensors.static_on = s["static_on"].get<bool>();
            if (s.contains("motion_on")) sensors.motion_on = s["motion_on"].get<bool>();
            if (s.contains("static_timeout"))
                sensors.static_timeout = s["static_timeout"].get<float>();
            if (s.contains("motion_timeout"))
                sensors.motion_timeout = s["motion_timeout"].get<float>();
        }
        const ProcessingResult& result = engine.tick(wo, t, sensors);

        auto& expected = expected_arr[i];
        {
            INFO("Scenario: " << name << ", tick " << i);
            REQUIRE(expected.contains("zone_occupancy"));
        }

        // Check zone occupancy
        for (auto& [zid_str, exp_occ_val] : expected["zone_occupancy"].items()) {
            int zid = std::stoi(zid_str);
            bool exp_occ = exp_occ_val.get<bool>();
            INFO("Scenario: " << name << ", tick " << i << ", zone " << zid);
            CHECK(result.zone_occupancy[zid] == exp_occ);
        }

        // Check target status if specified
        if (expected.contains("targets")) {
            auto& exp_targets = expected["targets"];
            for (int j = 0; j < static_cast<int>(exp_targets.size()); ++j) {
                auto& exp_t = exp_targets[j];
                INFO("Scenario: " << name << ", tick " << i << ", target " << j);
                REQUIRE(j < result.target_count);
                REQUIRE(exp_t.contains("status"));

                TargetStatus exp_status =
                    parse_status(exp_t["status"].get<std::string>());
                CHECK(result.targets[j].status == exp_status);
                if (result.targets[j].status != exp_status) {
                    MESSAGE("  expected: " << status_name(exp_status)
                            << ", got: " << status_name(result.targets[j].status));
                }

                if (exp_t.contains("x")) {
                    CHECK(result.targets[j].x ==
                          doctest::Approx(exp_t["x"].get<float>()));
                    CHECK(result.targets[j].y ==
                          doctest::Approx(exp_t["y"].get<float>()));
                }

                if (exp_t.contains("signal")) {
                    CHECK(result.targets[j].signal == exp_t["signal"].get<int>());
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Test cases — one per scenario in the fixture file
// ---------------------------------------------------------------------------

TEST_CASE("parity fixtures") {
    json fixtures = load_fixtures();
    REQUIRE(fixtures.contains("grid"));
    REQUIRE(fixtures.contains("zones"));
    REQUIRE(fixtures.contains("scenarios"));
    auto& scenarios = fixtures["scenarios"];
    // An empty/missing scenarios object would otherwise register zero
    // subcases and report SUCCESS while testing nothing.
    REQUIRE(!scenarios.empty());

    for (auto& [name, scenario] : scenarios.items()) {
        SUBCASE(name.c_str()) {
            // KNOWN-DIVERGENCE(7.2): scenarios tagged in the fixture with
            // known_divergence.cpp are expected to fail on THIS engine until
            // Task 7.2 fixes the divergence. doctest has no subcase-level
            // xfail, so they are skipped loudly here; the TS suite runs its
            // tagged scenarios via `it.fails` (see
            // frontend/src/__tests__/panel-zone-engine-parity.test.ts).
            // Task 7.2 deletes the fixture tag as it fixes each divergence.
            if (scenario.contains("known_divergence") &&
                scenario["known_divergence"].contains("cpp")) {
                MESSAGE("SKIPPED — KNOWN-DIVERGENCE(7.2) [cpp]: "
                        << scenario["known_divergence"]["cpp"].get<std::string>());
            } else {
                run_scenario(name, scenario, fixtures);
            }
        }
    }
}
