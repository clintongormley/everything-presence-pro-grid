#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_grid.h"
#include "epp_window.h"
#include "epp_zone_engine.h"

using namespace epp;

// ---------------------------------------------------------------------------
// Shared helpers matching the Python parity test setup
// ---------------------------------------------------------------------------

// Grid-space offset: room x=0 starts at col 8 -> x_offset = 8 * 300 = 2400
static constexpr float X_OFF = 8.0f * GRID_CELL_SIZE_MM;

static Grid make_parity_grid() {
    // 20x20, room cells at cols 8-11 rows 0-3
    Grid grid(0.0f, 0.0f, GRID_COLS, GRID_ROWS, GRID_CELL_SIZE_MM);
    for (int r = 0; r < 4; ++r) {
        for (int c = 8; c < 12; ++c) {
            grid.cell(r * GRID_COLS + c) = CELL_ROOM_BIT;
        }
    }
    // Zone 1 on cell (col=9, row=1), with entry overlay kind
    grid.cell(1 * GRID_COLS + 9) = CELL_ROOM_BIT |
                                    (1 << CELL_ZONE_SHIFT) |
                                    (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
    return grid;
}

static ZoneEngine make_parity_engine() {
    Grid grid = make_parity_grid();

    // Zone 1: custom, trigger=3, renew=2, timeout=5, handoff_timeout=1
    ZoneConfig zone1{};
    zone1.id = 1;
    zone1.trigger = 3;
    zone1.renew = 2;
    zone1.timeout = 5.0f;
    zone1.handoff_timeout = 1.0f;

    // Zone 0: normal, trigger=5, renew=3, timeout=10, handoff_timeout=3
    ZoneConfig zone0{};
    zone0.id = 0;
    zone0.trigger = 5;
    zone0.renew = 3;
    zone0.timeout = 10.0f;
    zone0.handoff_timeout = 3.0f;

    ZoneConfig zones[] = {zone1, zone0};

    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(zones, 2);
    return engine;
}

/// Build a WindowOutput from up to MAX_TARGETS (x, y, frame_count) values.
/// Targets with frame_count=0 are marked inactive.
struct TargetSpec {
    float x;
    float y;
    int frame_count;
};

static WindowOutput make_window(const TargetSpec specs[], int count) {
    WindowOutput wo{};
    wo.total_frames = CANONICAL_FRAMES;
    for (int i = 0; i < count && i < MAX_TARGETS; ++i) {
        wo.targets[i].median_x = specs[i].x;
        wo.targets[i].median_y = specs[i].y;
        wo.targets[i].frame_count = specs[i].frame_count;
        wo.targets[i].active = (specs[i].frame_count > 0);
    }
    return wo;
}

// Convenience overloads
static WindowOutput make_window_0() {
    return make_window(nullptr, 0);
}

static WindowOutput make_window_1(float x, float y, int fc) {
    TargetSpec specs[] = {{x, y, fc}};
    return make_window(specs, 1);
}

static WindowOutput make_window_2(float x1, float y1, int fc1,
                                   float x2, float y2, int fc2) {
    TargetSpec specs[] = {{x1, y1, fc1}, {x2, y2, fc2}};
    return make_window(specs, 2);
}

// ---------------------------------------------------------------------------
// Parity tests
// ---------------------------------------------------------------------------

TEST_CASE("no targets → all zones clear") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("inactive target → all zones clear") {
    ZoneEngine engine = make_parity_engine();
    // frame_count=0 means inactive
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 0), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("target in custom zone with signal >= trigger → zone 1 occupied") {
    ZoneEngine engine = make_parity_engine();
    // Zone 1 at cell (9,1): x = 9*300 + 150 = 2850, y = 1*300 + 150 = 450
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 3), 100.0f);
    CHECK(r.zone_occupancy[1]);
    CHECK_FALSE(r.zone_occupancy[0]);
}

TEST_CASE("target below trigger → zone stays clear") {
    ZoneEngine engine = make_parity_engine();
    // Use zone 0 (no overlay) — zone 0 trigger=5, signal=4 → below trigger
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 4), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
}

TEST_CASE("zone 0 gating: needs 2 consecutive qualifying ticks") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Zone 0: trigger=5, gated threshold = min(5+2, 8) = 7
    // First tick: signal=7 meets gated threshold, gate_count=1
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t);
    CHECK_FALSE(r1.zone_occupancy[0]);

    // Second tick: continuous from tick 1, bypasses gating → confirmed
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    CHECK(r2.zone_occupancy[0]);
}

TEST_CASE("entry point bypasses gating") {
    ZoneEngine engine = make_parity_engine();
    // Zone 1 cell is at (9,1). Set its overlay kind to entry.
    Grid grid = engine.grid();
    int cell_idx = 1 * GRID_COLS + 9;  // row=1, col=9
    grid.cell(cell_idx) = (grid.cell(cell_idx) & ~CELL_OVERLAY_MASK) |
                          (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
    engine.set_grid(grid);

    // Zone 1 trigger=3, target at (2850, 450)
    WindowOutput wo{};
    wo.total_frames = 10;
    wo.targets[0].active = true;
    wo.targets[0].median_x = 2850.0f;
    wo.targets[0].median_y = 450.0f;
    wo.targets[0].frame_count = 3;
    const ProcessingResult& r = engine.tick(wo, 100.0f);
    CHECK(r.zone_occupancy[1]);
}

TEST_CASE("cell overlay entry bypasses gating") {
    ZoneEngine engine = make_parity_engine();
    // Get the grid and set overlay kind to entry on cell (8,0) — zone 0
    Grid grid = engine.grid();
    int cell_idx = 0 * GRID_COLS + 8;  // row=0, col=8
    grid.cell(cell_idx) = (grid.cell(cell_idx) & ~CELL_OVERLAY_MASK) |
                          (CELL_OVERLAY_ENTRY << CELL_OVERLAY_SHIFT);
    engine.set_grid(grid);

    // Target at (2550, 150) lands on cell (8,0) in zone 0.
    // Zone 0: trigger=5, gated=7. Signal 5/10 frames → would fail gating without overlay.
    // With overlay → bypasses gating → confirmed immediately.
    WindowOutput wo{};
    wo.total_frames = 10;
    wo.targets[0].active = true;
    wo.targets[0].median_x = 2550.0f;
    wo.targets[0].median_y = 150.0f;
    wo.targets[0].frame_count = 5;
    const ProcessingResult& r = engine.tick(wo, 100.0f);
    CHECK(r.zone_occupancy[0]);
}

TEST_CASE("PENDING then CLEAR after timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    CHECK(r1.zone_occupancy[1]);

    // Target disappears → PENDING (still reports occupied)
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);

    // After timeout (custom zone timeout=5s) → CLEAR
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 7.0f);
    CHECK_FALSE(r3.zone_occupancy[1]);
}

TEST_CASE("target reappears during pending → OCCUPIED") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target gone → PENDING
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);  // PENDING

    // Target reappears with signal >= renew (2)
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 450, 2), t + 2.0f);
    CHECK(r3.zone_occupancy[1]);  // back to OCCUPIED
}

TEST_CASE("two targets in different zones") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Target 0 in zone 1 (custom, entry point), Target 1 in zone 0 (room, gating)
    // First tick: zone 1 immediate, zone 0 gating (count=1)
    const ProcessingResult& r1 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 7), t);
    CHECK(r1.zone_occupancy[1]);
    CHECK_FALSE(r1.zone_occupancy[0]);

    // Second tick: zone 0 continuous → confirmed
    const ProcessingResult& r2 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 7), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);
    CHECK(r2.zone_occupancy[0]);
}

TEST_CASE("target outside grid → no occupancy") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_1(9000, 9000, 9), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("target on non-room cell → no occupancy") {
    ZoneEngine engine = make_parity_engine();
    // Room is cols 8-11. Target at X_OFF + (-900) = 1500 → col 5.
    // Col 5 is inside the 20x20 grid but not a room cell.
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + (-900), 150, 9), 100.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("continuity skips gating") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // First establish position in zone 0 via gating (2 ticks at >= gated threshold)
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 150, 150, 9), t);
    CHECK_FALSE(r1.zone_occupancy[0]);
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 9), t + 1.0f);
    CHECK(r2.zone_occupancy[0]);

    // Move to adjacent cell (still zone 0) — continuous, renew threshold applies
    // (450, 150) → cell (9,0), 1 cell away from (8,0) → within MAX_MOVEMENT_CELLS
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 450, 150, 3), t + 2.0f);
    CHECK(r3.zone_occupancy[0]);
}

TEST_CASE("active target status is correct") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    REQUIRE(r.target_count >= 1);
    CHECK(r.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r.targets[0].x == doctest::Approx(X_OFF + 450));
    CHECK(r.targets[0].y == doctest::Approx(450));
    CHECK(r.targets[0].signal == 5);
}

TEST_CASE("pending target status at last in-room position") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target disappears
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);
    CHECK(r.targets[0].status == TargetStatus::PENDING);
    CHECK(r.targets[0].x == doctest::Approx(X_OFF + 450));
    CHECK(r.targets[0].y == doctest::Approx(450));
    CHECK(r.targets[0].signal == 0);
}

TEST_CASE("inactive after timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target disappears
    engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 1.0f);

    // Past timeout
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 0), t + 7.0f);
    CHECK(r.targets[0].status == TargetStatus::INACTIVE);
}

TEST_CASE("handoff: target moves zones, source gets accelerated timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Establish zone 1 occupied (entry point → immediate)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target moves to zone 0 → handoff fires immediately, zone 1 → pending
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    // Handoff tick: target is active (signal=7 >= gated threshold for zone 0),
    // zone 1 is pending (occupied=True), zone 0 still gating (not yet confirmed)
    CHECK(r2.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r2.targets[0].x == doctest::Approx(X_OFF + 150));
    CHECK(r2.targets[0].y == doctest::Approx(150));
    CHECK(r2.zone_occupancy[1]);  // zone 1 pending immediately after handoff

    // Second tick in zone 0 (0.5s later, within handoff_timeout=1.0s window):
    // zone 0 continuous → confirmed; zone 1 still pending (elapsed ≈ 0.5 + offset)
    const ProcessingResult& r3 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.5f);
    CHECK(r3.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r3.zone_occupancy[0]);
    CHECK(r3.zone_occupancy[1]);  // zone 1 still pending within handoff window
}

TEST_CASE("no targets → target_count is MAX_TARGETS with all INACTIVE") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    // All 3 target slots should be INACTIVE
    CHECK(r.target_count == MAX_TARGETS);
    for (int i = 0; i < MAX_TARGETS; ++i) {
        CHECK(r.targets[i].status == TargetStatus::INACTIVE);
    }
}

TEST_CASE("tracked target outside room with prior presence → PENDING") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Target moves outside room but still tracked with signal
    const ProcessingResult& r2 = engine.tick(make_window_1(9000, 9000, 9), t + 1.0f);
    CHECK(r2.targets[0].status == TargetStatus::PENDING);
    CHECK(r2.targets[0].x == doctest::Approx(X_OFF + 450));
    CHECK(r2.targets[0].y == doctest::Approx(450));
}

TEST_CASE("device_tracking_present when any zone occupied") {
    ZoneEngine engine = make_parity_engine();

    // No targets → not present
    const ProcessingResult& r1 = engine.tick(make_window_0(), 100.0f);
    CHECK_FALSE(r1.device_tracking_present);

    // Target in zone 1 → present
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 5), 101.0f);
    CHECK(r2.device_tracking_present);
}

TEST_CASE("two targets one leaves → mixed active/pending states") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // T0 in zone 1 (entry point, immediate), T1 in zone 0 (needs gating)
    // Tick 1: zone 1 confirmed immediately, zone 0 gating
    engine.tick(make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 9), t);

    // Tick 2: zone 0 continuous → both zones occupied
    const ProcessingResult& r2 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 9), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);
    CHECK(r2.zone_occupancy[0]);

    // T1 disappears, T0 stays active
    const ProcessingResult& r3 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5, X_OFF + 150, 150, 0), t + 2.0f);
    CHECK(r3.targets[0].status == TargetStatus::ACTIVE);
    CHECK(r3.targets[1].status == TargetStatus::PENDING);
    // T1 pending x/y = last in-room position (grid-space)
    CHECK(r3.targets[1].x == doctest::Approx(X_OFF + 150));
    CHECK(r3.targets[1].y == doctest::Approx(150));
}

// ---------------------------------------------------------------------------
// Additional tests
// ---------------------------------------------------------------------------

TEST_CASE("grid accessor returns the configured grid") {
    ZoneEngine engine = make_parity_engine();
    const Grid& g = engine.grid();
    // Cell at (9,1) should be room + zone 1
    int cell = 1 * GRID_COLS + 9;
    CHECK(g.cell_is_room(cell));
    CHECK(g.cell_zone(cell) == 1);
    // Cell at (0,0) should NOT be a room cell
    CHECK_FALSE(g.cell_is_room(0));
}

TEST_CASE("set_zones with count=0 initializes zone 0 with normal defaults") {
    ZoneEngine engine;
    engine.set_grid(make_parity_grid());
    engine.set_zones(nullptr, 0);
    // Zone 0 room cell at (8,0), needs gating (2 qualifying ticks at threshold 7)
    float t = 100.0f;
    // Signal 7 meets gated threshold min(5+2,8)=7
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t);
    CHECK_FALSE(r1.zone_occupancy[0]);  // gating: first tick
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    CHECK(r2.zone_occupancy[0]);  // continuous → confirmed
}

TEST_CASE("set_zones skips invalid zone IDs") {
    ZoneEngine engine;
    engine.set_grid(make_parity_grid());
    ZoneConfig bad{};
    bad.id = 99;  // out of range (MAX_ZONE_SLOTS=8)
    bad.trigger = 1;
    engine.set_zones(&bad, 1);
    // Only zone 0 should exist; zone 1 cell should not trigger zone 1 occupancy
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 9), 100.0f);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("set_zones resets per-target gating state") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    // First gating tick for zone 0
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t);
    // Re-configure zones → should reset gate count
    ZoneConfig zone1{};
    zone1.id = 1; zone1.trigger = 3;
    zone1.renew = 2; zone1.timeout = 5.0f; zone1.handoff_timeout = 1.0f;
    engine.set_zones(&zone1, 1);
    // Next tick should be treated as first gating tick again (not second)
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    CHECK_FALSE(r.zone_occupancy[0]);  // still gating, gate count was reset
}

TEST_CASE("gate count resets when signal drops below gated threshold") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    // Tick 1: signal=7 meets gated threshold → gate_count=1; records position
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t);
    // Target disappears: clears target_has_prev_ and gate_count
    engine.tick(make_window_0(), t + 0.5f);
    // Tick 2: target reappears at same position but no prev → gating restarts from 0
    // signal=3 below gated threshold (7) → gate_count stays 0, position not recorded
    engine.tick(make_window_1(X_OFF + 150, 150, 3), t + 1.0f);
    // Tick 3: signal=7 but no prev position (cleared above) → gate_count=1
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 2.0f);
    CHECK_FALSE(r.zone_occupancy[0]);  // still just gate_count=1, not confirmed yet
}

TEST_CASE("continuity at exact MAX_MOVEMENT_CELLS distance") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    // Use zone 1 entry point to establish tracking: target in zone 1 at (9,1)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    // Move to zone 0 cell (8,0) — distance = max(|8-9|, |0-1|) = 1 cell → continuous
    // Since zone 0 is OCCUPIED/PENDING from handoff, renew threshold (3) applies
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 3), t + 1.0f);
    CHECK(r.targets[0].status == TargetStatus::ACTIVE);
}

TEST_CASE("signal is computed on 0-9 scale from frame count") {
    ZoneEngine engine = make_parity_engine();
    // frame_count=10 out of total_frames=10 → signal = min((10*9+5)/10, 9) = 9
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 10), 100.0f);
    CHECK(r1.targets[0].signal == 9);
    // frame_count=1 out of 10 → signal = min((1*9+5)/10, 9) = 1
    ZoneEngine engine2 = make_parity_engine();
    const ProcessingResult& r2 = engine2.tick(make_window_1(X_OFF + 450, 450, 1), 100.0f);
    CHECK(r2.targets[0].signal == 1);
    // frame_count=5 out of 10 → signal = min((5*9+5)/10, 9) = 5
    ZoneEngine engine3 = make_parity_engine();
    const ProcessingResult& r3 = engine3.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    CHECK(r3.targets[0].signal == 5);
}

TEST_CASE("handoff: source zone clears after handoff_timeout") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    // Occupy zone 1 (entry point, immediate)
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    // Target moves directly to zone 0 → handoff fires:
    //   zone 1 becomes PENDING_CLEAR with pending_since = t+1 - (5.0 - 1.0) = t-3
    //   so it will clear at pending_since + timeout = (t-3) + 5 = t+2
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 9), t + 1.0f);
    CHECK(r2.zone_occupancy[1]);  // zone 1 still pending at t+1
    // At t+2.5: elapsed since pending_since = 2.5 - (-3) = 5.5 >= 5.0 → CLEAR
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 150, 150, 9), t + 2.5f);
    CHECK_FALSE(r.zone_occupancy[1]);  // zone 1 cleared via accelerated timeout
}

TEST_CASE("device_tracking_present is true with pending zones") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    // Target disappears → PENDING
    const ProcessingResult& r = engine.tick(make_window_0(), t + 1.0f);
    CHECK(r.device_tracking_present);  // pending counts as tracking
    CHECK(r.zone_occupancy[1]);
}

TEST_CASE("set_zones resets zone occupancy state") {
    ZoneEngine engine = make_parity_engine();
    // Occupy zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    // Reconfigure
    ZoneConfig zone1{};
    zone1.id = 1; zone1.trigger = 3;
    zone1.renew = 2; zone1.timeout = 5.0f; zone1.handoff_timeout = 1.0f;
    engine.set_zones(&zone1, 1);
    // Zone state should be reset to CLEAR
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f);
    CHECK_FALSE(r.zone_occupancy[1]);
}

TEST_CASE("set_zones clears dismissed_cell_ for all targets") {
    ZoneEngine engine = make_parity_engine();
    int zone1_cell = 1 * GRID_COLS + 9;
    float zone1_x = X_OFF + 450.0f;

    // Confirm target 0 then dismiss it
    engine.tick(make_window_1(zone1_x, 450.0f, 5), 100.0f);
    engine.dismiss_target(0, zone1_cell);

    // Reconfigure zones — dismiss state must be cleared, otherwise the
    // dismissed cell would silently suppress occupancy after re-config.
    ZoneConfig zone1{};
    zone1.id = 1; zone1.trigger = 3;
    zone1.renew = 2; zone1.timeout = 5.0f; zone1.handoff_timeout = 1.0f;
    engine.set_zones(&zone1, 1);

    // Target back at the previously-dismissed cell — should confirm normally.
    const ProcessingResult& r = engine.tick(make_window_1(zone1_x, 450.0f, 5), 101.0f);
    CHECK(r.zone_occupancy[1]);
}

TEST_CASE("set_grid clears dismissed_cell_ across coordinate-system change") {
    // Reproduces the Copilot review concern: dismiss target at cell N under
    // grid A; switching to grid B re-uses cell index N at a different room
    // location, which would silently suppress occupancy until the target
    // moves elsewhere unless set_grid clears the dismiss state.
    ZoneEngine engine = make_parity_engine();
    int zone1_cell = 1 * GRID_COLS + 9;
    float zone1_x = X_OFF + 450.0f;

    // Confirm + dismiss target 0 at zone 1 cell.
    engine.tick(make_window_1(zone1_x, 450.0f, 5), 100.0f);
    engine.dismiss_target(0, zone1_cell);

    // Re-load the grid (e.g. user edited room layout). Build a fresh grid so
    // the engine's stored grid is replaced.
    Grid new_grid = make_parity_grid();
    engine.set_grid(new_grid);

    // Target back at the (now-meaningfully-different) cell that previously
    // held the dismiss must be processed normally.
    const ProcessingResult& r = engine.tick(make_window_1(zone1_x, 450.0f, 5), 101.0f);
    CHECK(r.zone_occupancy[1]);
}

TEST_CASE("set_zones drops a zone that is no longer configured") {
    ZoneEngine engine = make_parity_engine();
    // Confirm zone 1 occupied
    engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);

    // Reconfigure with ONLY zone 0 — zone 1 must lose its stale runtime.
    ZoneConfig zone0{};
    zone0.id = 0; zone0.trigger = 5;
    zone0.renew = 3; zone0.timeout = 10.0f; zone0.handoff_timeout = 3.0f;
    engine.set_zones(&zone0, 1);

    // Tick with empty window — zone 1 must NOT report occupancy from prior run.
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f);
    CHECK_FALSE(r.zone_occupancy[1]);
    CHECK(r.zone_states[1] == ZoneState::CLEAR);
}

// ---------------------------------------------------------------------------
// Sensor presence state tests
// ---------------------------------------------------------------------------

TEST_CASE("sensor state: static active when binary sensor on") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::ACTIVE);
}

TEST_CASE("sensor state: static pending when binary sensor goes off") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::PENDING);
}

TEST_CASE("sensor state: static inactive after timeout") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    engine.tick(make_window_0(), 101.0f, sensors);
    const ProcessingResult& r = engine.tick(make_window_0(), 107.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::INACTIVE);
}

TEST_CASE("sensor state: static reactivates during pending") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    engine.tick(make_window_0(), 101.0f, sensors);
    sensors.static_on = true;
    const ProcessingResult& r = engine.tick(make_window_0(), 102.0f, sensors);
    CHECK(r.static_state == SensorPresenceState::ACTIVE);
}

TEST_CASE("sensor state: motion follows same lifecycle as static") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.motion_on = true;
    sensors.motion_timeout = 3.0f;
    const ProcessingResult& r1 = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(r1.motion_state == SensorPresenceState::ACTIVE);
    sensors.motion_on = false;
    const ProcessingResult& r2 = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(r2.motion_state == SensorPresenceState::PENDING);
    const ProcessingResult& r3 = engine.tick(make_window_0(), 105.0f, sensors);
    CHECK(r3.motion_state == SensorPresenceState::INACTIVE);
}

TEST_CASE("sensor state: default SensorInput gives inactive for both") {
    ZoneEngine engine = make_parity_engine();
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f);
    CHECK(r.static_state == SensorPresenceState::INACTIVE);
    CHECK(r.motion_state == SensorPresenceState::INACTIVE);
}

// ---------------------------------------------------------------------------
// Force-clear and occupancy tests
// ---------------------------------------------------------------------------

TEST_CASE("force-clear: pending zones cleared when sensors inactive and no active zones") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;
    // Use short sensor timeouts (1s) so they expire well before zone timeout (10s)
    sensors.static_on = true;
    sensors.static_timeout = 1.0f;
    sensors.motion_on = true;
    sensors.motion_timeout = 1.0f;

    // Use zone 0 (normal, no overlay, timeout=10s, handoff=3s) to avoid
    // overlay exit handoff which would accelerate the pending timeout.
    // Need 2 gating ticks to confirm zone 0.
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);

    // Target disappears at t+1, zone 0 goes PENDING_CLEAR (timeout=10s, expires at t+11)
    const ProcessingResult& r1 = engine.tick(make_window_0(), t + 1.0f, sensors);
    CHECK(r1.zone_occupancy[0]);  // still occupied (pending)

    // Sensors go off at t+2 -> both pending (1s timeout)
    sensors.static_on = false;
    sensors.motion_on = false;
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 2.0f, sensors);
    CHECK(r2.zone_occupancy[0]);  // sensors pending, zone still pending

    // At t+3.5: sensors expired (1s from t+2), zone still has 7.5s left on its timeout
    // Force-clear should fire and clear the zone immediately
    const ProcessingResult& r3 = engine.tick(make_window_0(), t + 3.5f, sensors);
    CHECK_FALSE(r3.zone_occupancy[0]);  // force-cleared before zone timeout!
}

TEST_CASE("force-clear: does NOT clear if a zone has active targets") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 2.0f;
    sensors.motion_timeout = 2.0f;

    // Occupy zone 1 with target + static sensor
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t, sensors);

    // Static goes off, but target is still active in zone 1
    sensors.static_on = false;
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f, sensors);

    // Static timeout expires -> sensors inactive, but zone 1 is OCCUPIED (active target)
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 4.0f, sensors);
    CHECK(r.zone_occupancy[1]);  // NOT force-cleared, zone has active target
}

TEST_CASE("occupancy: true when any zone occupied or sensor active/pending") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;

    // No sensors, no targets -> occupancy false
    const ProcessingResult& r1 = engine.tick(make_window_0(), t, sensors);
    CHECK_FALSE(r1.occupancy);

    // Static on -> occupancy true
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 1.0f, sensors);
    CHECK(r2.occupancy);

    // Static off -> pending -> occupancy still true
    sensors.static_on = false;
    const ProcessingResult& r3 = engine.tick(make_window_0(), t + 2.0f, sensors);
    CHECK(r3.occupancy);

    // Past timeout -> inactive -> occupancy false
    const ProcessingResult& r4 = engine.tick(make_window_0(), t + 8.0f, sensors);
    CHECK_FALSE(r4.occupancy);
}

TEST_CASE("occupancy: true when zone occupied even if sensors inactive") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;  // both off
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f, sensors);
    CHECK(r.zone_occupancy[1]);
    CHECK(r.occupancy);  // zone occupied -> occupancy true
}

// ---------------------------------------------------------------------------
// mmwave: combines static presence + target tracker, ignores motion (PIR).
// On when static is active/pending OR any zone is OCCUPIED.
// Off when static is inactive AND target tracker is "pending" (only
// PENDING_CLEAR zones).
// ---------------------------------------------------------------------------

TEST_CASE("mmwave: false with no input") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK_FALSE(r.mmwave);
}

TEST_CASE("mmwave: true when static presence active") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    CHECK(r.mmwave);
}

TEST_CASE("mmwave: true while static presence pending") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.static_on = true;
    sensors.static_timeout = 5.0f;
    engine.tick(make_window_0(), 100.0f, sensors);
    sensors.static_on = false;
    const ProcessingResult& r = engine.tick(make_window_0(), 101.0f, sensors);
    CHECK(r.mmwave);  // static still PENDING within timeout
}

TEST_CASE("mmwave: true when zone OCCUPIED even with all sensors off") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;  // both off
    const ProcessingResult& r = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f, sensors);
    REQUIRE(r.zone_occupancy[1]);
    CHECK(r.mmwave);
}

TEST_CASE("mmwave: ignores motion-only presence (no static, no zones)") {
    ZoneEngine engine = make_parity_engine();
    SensorInput sensors;
    sensors.motion_on = true;
    sensors.motion_timeout = 5.0f;
    const ProcessingResult& r = engine.tick(make_window_0(), 100.0f, sensors);
    REQUIRE(r.motion_state == SensorPresenceState::ACTIVE);
    CHECK_FALSE(r.mmwave);  // motion alone must not turn mmwave on
}

TEST_CASE("mmwave: off when static inactive and target tracker pending") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;
    SensorInput sensors;
    sensors.motion_on = true;        // motion still pending — prevents force-clear
    sensors.motion_timeout = 100.0f;
    sensors.static_timeout = 1.0f;

    // Confirm zone 1 with a target (zone 1 has overlay entry bit -> trigger bypassed).
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t, sensors);

    // Target disappears -> zone 1 enters PENDING_CLEAR.
    // Motion stays on (prevents force-clear); static was never on.
    const ProcessingResult& r = engine.tick(make_window_0(), t + 1.0f, sensors);
    REQUIRE(r.zone_states[1] == ZoneState::PENDING_CLEAR);
    REQUIRE(r.zone_occupancy[1]);  // target_presence sensor still on (pending)
    REQUIRE(r.static_state == SensorPresenceState::INACTIVE);
    CHECK_FALSE(r.mmwave);  // static off + tracker pending -> mmwave off
}

TEST_CASE("overlay exit accelerates pending clear") {
    ZoneEngine engine = make_parity_engine();
    // Zone 1 cell (9,1) already has overlay entry bit in make_parity_grid()

    // Tick 1: target in zone 1, confirmed (trigger=3, overlay bypasses gating)
    // on_overlay=true: raw frame touched the overlay cell
    WindowOutput wo1 = make_window_1(X_OFF + 450, 450, 5);
    wo1.targets[0].on_overlay = true;
    const ProcessingResult& r1 = engine.tick(wo1, 100.0f);
    CHECK(r1.zone_occupancy[1]);

    // Tick 2: target disappears — on_overlay still sticky from component
    WindowOutput wo2 = make_window_0();
    wo2.targets[0].on_overlay = true;
    engine.tick(wo2, 101.0f);

    // Tick 3: 1.5s after disappearance — should have cleared (handoff=1s)
    const ProcessingResult& r3 = engine.tick(make_window_0(), 102.5f);
    CHECK_FALSE(r3.zone_occupancy[1]);
}

TEST_CASE("overlay exit handoff fires from engine sticky bit alone") {
    // Tighter: simulates a caller that does NOT maintain on_overlay
    // stickiness for inactive targets. The engine must remember the last
    // in-room overlay state itself, otherwise the handoff is silently lost.
    ZoneEngine engine = make_parity_engine();

    // Tick 1: target on the entry overlay cell. on_overlay flag from raw
    // frames is true.
    WindowOutput wo1 = make_window_1(X_OFF + 450, 450, 5);
    wo1.targets[0].on_overlay = true;
    const ProcessingResult& r1 = engine.tick(wo1, 100.0f);
    CHECK(r1.zone_occupancy[1]);

    // Tick 2: target gone. Caller does NOT carry on_overlay across — this is
    // the regression case the engine sticky bit defends against.
    WindowOutput wo2 = make_window_0();
    // (deliberately NOT setting wo2.targets[0].on_overlay = true)
    engine.tick(wo2, 101.0f);

    // Tick 3: 1.5s after — handoff_timeout=1s should have collapsed the zone.
    const ProcessingResult& r3 = engine.tick(make_window_0(), 102.5f);
    CHECK_FALSE(r3.zone_occupancy[1]);
}

TEST_CASE("non-overlay exit uses full timeout") {
    ZoneEngine engine = make_parity_engine();
    // Remove overlay from zone 1 cell so it behaves normally
    Grid grid = engine.grid();
    int cell_idx = 1 * GRID_COLS + 9;
    grid.cell(cell_idx) = grid.cell(cell_idx) & ~CELL_OVERLAY_MASK;
    engine.set_grid(grid);

    // Zone 0 (normal: timeout=10, handoff=3). No overlay.
    // Need 2 gating ticks to confirm zone 0.
    float t = 100.0f;
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t);
    CHECK_FALSE(r1.zone_occupancy[0]);
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 1.0f);
    CHECK(r2.zone_occupancy[0]);

    // Target disappears — no overlay → full timeout (10s)
    engine.tick(make_window_0(), t + 2.0f);

    // 5s later — should still be occupied (timeout=10s)
    const ProcessingResult& r4 = engine.tick(make_window_0(), t + 7.0f);
    CHECK(r4.zone_occupancy[0]);  // still pending

    // 12s later — should clear
    const ProcessingResult& r5 = engine.tick(make_window_0(), t + 14.0f);
    CHECK_FALSE(r5.zone_occupancy[0]);
}

TEST_CASE("zone_target_counts reports number of targets, not signal") {
    ZoneEngine engine = make_parity_engine();
    // One target in zone 1 with signal=5
    // Zone 1 at cell (9,1): x = 9*300 + 150 = 2850, y = 1*300 + 150 = 450
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 5), 100.0f);
    CHECK(r1.zone_target_counts[1] == 1);  // 1 target, not signal 5

    // Two targets in zone 1 — different positions within the same zone cell
    const ProcessingResult& r2 = engine.tick(
        make_window_2(X_OFF + 450, 450, 5,   // target 0 in zone 1
                      X_OFF + 450, 450, 3),   // target 1 in zone 1
        101.0f);
    CHECK(r2.zone_target_counts[1] == 2);  // 2 targets, not max signal 5

    // One target in zone 0, one in zone 1
    const ProcessingResult& r3 = engine.tick(
        make_window_2(X_OFF + 150, 150, 7,   // target 0 in zone 0
                      X_OFF + 450, 450, 3),   // target 1 in zone 1
        102.0f);
    CHECK(r3.zone_target_counts[0] == 1);
    CHECK(r3.zone_target_counts[1] == 1);
}

// ---------------------------------------------------------------------------
// Dismiss target tests
// ---------------------------------------------------------------------------

TEST_CASE("dismiss_target skips target at dismissed cell") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Zone 1 at cell (9,1): x = 9*300 + 150 = 2850, y = 1*300 + 150 = 450
    int dismissed_cell = 1 * GRID_COLS + 9;

    // Confirm target 0 in zone 1 first
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    CHECK(r1.zone_occupancy[1]);

    // Dismiss target 0 at this cell
    engine.dismiss_target(0, dismissed_cell);

    // Tick again with target at same position — should be skipped
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f);
    CHECK_FALSE(r2.zone_occupancy[1]);
}

TEST_CASE("dismiss_target clears when target moves to different cell") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Zone 1 at cell (9,1)
    int dismissed_cell = 1 * GRID_COLS + 9;

    // Confirm target 0 in zone 1
    engine.tick(make_window_1(X_OFF + 450, 450, 5), t);

    // Dismiss target 0 at zone 1 cell
    engine.dismiss_target(0, dismissed_cell);

    // Tick with target at same position — dismissed
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 5), t + 1.0f);
    CHECK_FALSE(r1.zone_occupancy[1]);

    // Move target to a different cell (zone 0, cell (8,0))
    // This needs gating (2 ticks), but dismiss should clear on the first tick
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 2.0f);

    // Second tick at new position — should confirm (dismiss cleared, gating passes)
    const ProcessingResult& r2 = engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 3.0f);
    CHECK(r2.zone_occupancy[0]);
}

TEST_CASE("dismiss_target resets zone state to CLEAR") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Zone 1 at cell (9,1)
    int dismissed_cell = 1 * GRID_COLS + 9;

    // Confirm target 0 in zone 1
    const ProcessingResult& r1 = engine.tick(make_window_1(X_OFF + 450, 450, 5), t);
    CHECK(r1.zone_occupancy[1]);
    CHECK(r1.zone_states[1] == ZoneState::OCCUPIED);

    // Dismiss — zone should become CLEAR immediately
    engine.dismiss_target(0, dismissed_cell);

    // Tick with no targets — zone should be clear (not PENDING_CLEAR)
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 1.0f);
    CHECK_FALSE(r2.zone_occupancy[1]);
    CHECK(r2.zone_states[1] == ZoneState::CLEAR);
}

TEST_CASE("dismiss_target only clears the dismissed target's confirmation bit") {
    ZoneEngine engine = make_parity_engine();
    float t = 100.0f;

    // Two targets confirmed in zone 1 at the entry cell.
    int zone1_cell = 1 * GRID_COLS + 9;
    float zone1_x = X_OFF + 450.0f;
    float zone1_y = 450.0f;

    const ProcessingResult& r1 = engine.tick(
        make_window_2(zone1_x, zone1_y, 5, zone1_x, zone1_y, 5), t);
    CHECK(r1.zone_occupancy[1]);
    CHECK(r1.zone_states[1] == ZoneState::OCCUPIED);

    // Dismiss target 0 only. Target 1 was confirmed at the same cell.
    engine.dismiss_target(0, zone1_cell);

    // Now target 1 leaves entirely. With the bug (confirmed_targets=0 on
    // dismiss), the zone is already CLEAR and goes nowhere. With the fix,
    // target 1's bit was preserved → zone was still OCCUPIED → it must now
    // transition to PENDING_CLEAR.
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 1.0f);
    CHECK(r2.zone_states[1] == ZoneState::PENDING_CLEAR);
}

// ---------------------------------------------------------------------------
// PR 9 — Frontend / firmware comparison-space parity
//
// The frontend zone engine compares the published `signal` (0–9) against the
// user-set trigger threshold. The firmware must agree regardless of how many
// frames the rolling window happens to hold: signal is `min(frame_count, 9)`
// (sensor over-delivery is capped, never inflates the value), and the
// firmware compares `signal >= clamp_threshold(trigger)` so its confirm
// decision matches what the frontend sees.
// ---------------------------------------------------------------------------

TEST_CASE("over-delivered window: published signal not diluted by extra frames") {
    ZoneEngine engine = make_parity_engine();

    // Sensor over-delivered: 20 frames in the window, 5 active for the target.
    // Published signal must reflect the active count, not be diluted by the
    // larger denominator the rolling window happens to hold.
    WindowOutput wo{};
    wo.total_frames = 20;
    wo.targets[0].median_x = X_OFF + 450;  // zone 1 cell
    wo.targets[0].median_y = 450;
    wo.targets[0].frame_count = 5;
    wo.targets[0].active = true;
    wo.targets[0].on_overlay = true;  // bypass gating

    const ProcessingResult& r = engine.tick(wo, 100.0f);
    CHECK(r.targets[0].signal == 5);
}

TEST_CASE("over-delivered window: published signal saturates at 9") {
    ZoneEngine engine = make_parity_engine();

    // Sensor over-delivered: 18 frames in the window, all 18 active.
    WindowOutput wo{};
    wo.total_frames = 18;
    wo.targets[0].median_x = X_OFF + 450;
    wo.targets[0].median_y = 450;
    wo.targets[0].frame_count = 18;
    wo.targets[0].active = true;
    wo.targets[0].on_overlay = true;

    const ProcessingResult& r = engine.tick(wo, 100.0f);
    CHECK(r.targets[0].signal == 9);
}

TEST_CASE("over-delivered window: confirmation aligns with published signal") {
    // Single-zone engine, trigger=5, no overlay on target cell so gating
    // applies. Two consecutive ticks at the same position: tick 1 attempts
    // gating, tick 2 is continuous (bypasses gating).
    //
    // With a 20-frame window and frame_count=8, post-fix:
    //   signal = min(8, 9) = 8.
    //   gated_thresh = min(trigger+2, 8) = 7. signal=8 >= 7 → tick 1 gate=1.
    //   Tick 2 continuous, base_thresh=trigger=5, signal=8 >= 5 → CONFIRM.
    //   Published signal = 8.
    // Pre-fix:
    //   fc=8 >= gated(7) → tick 1 gate=1. Tick 2 fc=8 >= 5 → CONFIRM.
    //   Published signal = round(8*9/20) = 4 (frontend sees 4 < 5 → DISAGREE).
    Grid grid = make_parity_grid();
    ZoneConfig zone0{};
    zone0.id = 0;
    zone0.trigger = 5;
    zone0.renew = 3;
    zone0.timeout = 10.0f;
    zone0.handoff_timeout = 3.0f;

    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(&zone0, 1);

    auto build = [](int fc) {
        WindowOutput wo{};
        wo.total_frames = 20;
        wo.targets[0].median_x = X_OFF + 150;  // zone 0
        wo.targets[0].median_y = 150;
        wo.targets[0].frame_count = fc;
        wo.targets[0].active = (fc > 0);
        return wo;
    };

    engine.tick(build(8), 100.0f);
    const ProcessingResult& r = engine.tick(build(8), 101.0f);
    CHECK(r.zone_occupancy[0]);
    // The published signal must be at least the trigger threshold so the
    // frontend zone engine reaches the same confirm decision.
    CHECK(r.targets[0].signal >= zone0.trigger);
    CHECK(r.targets[0].signal == 8);
}

TEST_CASE("over-delivered window: published signal matches firmware comparison threshold") {
    // The pre-fix drift: firmware compares raw frame_count, but the published
    // signal was diluted by total_frames > 10. Post-fix: signal == min(fc, 9)
    // and the firmware compares signal-vs-trigger, so the value the frontend
    // sees and uses is exactly what the firmware decided on.
    //
    // 20-frame window with frame_count=5 (just at trigger):
    //   Pre-fix:  fc=5 >= gated(7)? NO. (No drift here — both engines fail gate.)
    //            But the published signal was round(5*9/20) = 2, hiding intent.
    //   Post-fix: signal = min(5, 9) = 5. gated_thresh=7. 5>=7? NO → no gate.
    //            Tick 2 same → no confirm.
    //   Published signal = 5 (matches what the user configured).
    Grid grid = make_parity_grid();
    ZoneConfig zone0{};
    zone0.id = 0;
    zone0.trigger = 5;
    zone0.renew = 3;
    zone0.timeout = 10.0f;
    zone0.handoff_timeout = 3.0f;

    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(&zone0, 1);

    auto build = [](int fc) {
        WindowOutput wo{};
        wo.total_frames = 20;
        wo.targets[0].median_x = X_OFF + 150;
        wo.targets[0].median_y = 150;
        wo.targets[0].frame_count = fc;
        wo.targets[0].active = (fc > 0);
        return wo;
    };

    engine.tick(build(5), 100.0f);
    const ProcessingResult& r = engine.tick(build(5), 101.0f);
    CHECK_FALSE(r.zone_occupancy[0]);
    CHECK(r.targets[0].signal == 5);
}

TEST_CASE("stuck target auto-dismissed after timeout") {
    ZoneEngine engine = make_parity_engine();
    engine.set_stuck_target_timeout(5.0f);  // 5 second timeout for fast test

    float t = 100.0f;
    const float STUCK_X = X_OFF + 450.0f;  // zone 1 cell
    const float STUCK_Y = 450.0f;

    // Confirm the target into zone 1 (trigger=3, instant on first tick)
    const ProcessingResult& r0 = engine.tick(make_window_1(STUCK_X, STUCK_Y, 3), t);
    CHECK(r0.zone_occupancy[1]);

    // Hold identical coords just under the threshold — still occupied
    const ProcessingResult& r1 = engine.tick(make_window_1(STUCK_X, STUCK_Y, 3), t + 4.9f);
    CHECK(r1.zone_occupancy[1]);

    // Cross the 5s threshold — auto-dismiss fires, zone collapses to CLEAR
    const ProcessingResult& r2 = engine.tick(make_window_1(STUCK_X, STUCK_Y, 3), t + 5.1f);
    CHECK_FALSE(r2.zone_occupancy[1]);
}

TEST_CASE("stuck timer resets when coordinates change by any amount") {
    ZoneEngine engine = make_parity_engine();
    engine.set_stuck_target_timeout(5.0f);

    float t = 100.0f;
    const float X = X_OFF + 450.0f;
    const float Y = 450.0f;

    // Hold identical coords for nearly the full timeout
    engine.tick(make_window_1(X, Y, 3), t);
    engine.tick(make_window_1(X, Y, 3), t + 4.9f);

    // One tick at a 1mm-different y inside the same cell — must reset the timer
    const ProcessingResult& r_jitter = engine.tick(make_window_1(X, Y + 1.0f, 3), t + 5.0f);
    CHECK(r_jitter.zone_occupancy[1]);

    // Resume identical coords — must take another full timeout window from here
    const ProcessingResult& r_brief = engine.tick(make_window_1(X, Y, 3), t + 5.5f);
    CHECK(r_brief.zone_occupancy[1]);  // ~0.0s elapsed since last reset, well below 5s

    // Cross the new timeout boundary (timer reset at t+5.5; +5.0s threshold = t+10.5)
    const ProcessingResult& r_dismiss = engine.tick(make_window_1(X, Y, 3), t + 11.0f);
    CHECK_FALSE(r_dismiss.zone_occupancy[1]);
}

TEST_CASE("stuck-target timeout of 0 disables auto-dismiss") {
    ZoneEngine engine = make_parity_engine();
    engine.set_stuck_target_timeout(0.0f);

    float t = 100.0f;
    const float X = X_OFF + 450.0f;
    const float Y = 450.0f;

    for (int n = 0; n < 100; ++n) {
        engine.tick(make_window_1(X, Y, 3), t + static_cast<float>(n));
    }
    const ProcessingResult& r = engine.tick(make_window_1(X, Y, 3), t + 100.5f);
    CHECK(r.zone_occupancy[1]);
}

TEST_CASE("target going inactive resets stuck-target state") {
    ZoneEngine engine = make_parity_engine();
    engine.set_stuck_target_timeout(5.0f);

    float t = 100.0f;
    const float X = X_OFF + 450.0f;
    const float Y = 450.0f;

    engine.tick(make_window_1(X, Y, 3), t);
    engine.tick(make_window_1(X, Y, 3), t + 2.5f);

    engine.tick(make_window_1(X, Y, 0), t + 3.0f);
    engine.tick(make_window_1(X, Y, 0), t + 3.5f);

    engine.tick(make_window_1(X, Y, 3), t + 4.0f);
    const ProcessingResult& r_within = engine.tick(make_window_1(X, Y, 3), t + 8.8f);
    CHECK(r_within.zone_occupancy[1]);

    const ProcessingResult& r_after = engine.tick(make_window_1(X, Y, 3), t + 9.2f);
    CHECK_FALSE(r_after.zone_occupancy[1]);
}

TEST_CASE("auto-dismissed target re-confirms after moving away and back") {
    ZoneEngine engine = make_parity_engine();
    engine.set_stuck_target_timeout(5.0f);

    float t = 100.0f;
    const float X_Z1 = X_OFF + 450.0f;
    const float Y_Z1 = 450.0f;
    const float X_OFFCELL = X_OFF + 750.0f;
    const float Y_OFFCELL = 450.0f;

    engine.tick(make_window_1(X_Z1, Y_Z1, 3), t);
    const ProcessingResult& r_dismiss = engine.tick(make_window_1(X_Z1, Y_Z1, 3), t + 5.1f);
    CHECK_FALSE(r_dismiss.zone_occupancy[1]);

    const ProcessingResult& r_held = engine.tick(make_window_1(X_Z1, Y_Z1, 3), t + 5.2f);
    CHECK_FALSE(r_held.zone_occupancy[1]);

    engine.tick(make_window_1(X_OFFCELL, Y_OFFCELL, 3), t + 5.3f);

    const ProcessingResult& r_return = engine.tick(make_window_1(X_Z1, Y_Z1, 3), t + 5.4f);
    CHECK(r_return.zone_occupancy[1]);
}

TEST_CASE("stuck-target tracking is per-slot") {
    ZoneEngine engine = make_parity_engine();
    engine.set_stuck_target_timeout(5.0f);

    float t = 100.0f;
    const float X_STUCK = X_OFF + 450.0f;
    const float Y_STUCK = 450.0f;

    auto wo_for = [&](float t_offset) {
        return make_window_2(X_STUCK, Y_STUCK, 3,
                             X_STUCK, Y_STUCK + t_offset, 3);
    };

    engine.tick(wo_for(0.1f), t);
    engine.tick(wo_for(0.2f), t + 1.0f);
    engine.tick(wo_for(0.3f), t + 2.0f);
    engine.tick(wo_for(0.4f), t + 3.0f);
    engine.tick(wo_for(0.5f), t + 4.0f);
    const ProcessingResult& r = engine.tick(wo_for(0.6f), t + 5.1f);

    CHECK(r.zone_occupancy[1]);
    CHECK(r.targets[0].status == TargetStatus::INACTIVE);
    CHECK(r.targets[1].status == TargetStatus::ACTIVE);
}

TEST_CASE("assisted-clear: disabled -> falls back to per-zone timeout") {
    ZoneEngine engine = make_parity_engine();
    engine.set_assisted_clear(false, 0.0f);  // feature OFF
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;  sensors.static_timeout = 1.0f;
    sensors.motion_on = true;  sensors.motion_timeout = 1.0f;

    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);
    engine.tick(make_window_0(), t + 1.0f, sensors);  // zone 0 -> PENDING_CLEAR
    sensors.static_on = false;  sensors.motion_on = false;

    // Sensors inactive by t+3, but feature is OFF: zone stays occupied until
    // its own 10s timeout (pending since t+1 -> clears at t+11).
    const ProcessingResult& r1 = engine.tick(make_window_0(), t + 5.0f, sensors);
    CHECK(r1.zone_occupancy[0]);  // NOT cleared (feature off)
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 11.5f, sensors);
    CHECK_FALSE(r2.zone_occupancy[0]);  // per-zone timeout
}

TEST_CASE("assisted-clear: grace delay holds then clears") {
    ZoneEngine engine = make_parity_engine();
    engine.set_assisted_clear(true, 5.0f);  // 5s grace
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;  sensors.static_timeout = 1.0f;
    sensors.motion_on = true;  sensors.motion_timeout = 1.0f;

    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);
    engine.tick(make_window_0(), t + 1.0f, sensors);  // PENDING_CLEAR
    sensors.static_on = false;  sensors.motion_on = false;
    engine.tick(make_window_0(), t + 2.0f, sensors);  // sensors pending
    engine.tick(make_window_0(), t + 3.0f, sensors);  // sensors INACTIVE -> grace starts

    // Sensors INACTIVE at t+3 -> grace timer starts. Grace = 5s -> clears t+8.
    const ProcessingResult& r1 = engine.tick(make_window_0(), t + 7.0f, sensors);
    CHECK(r1.zone_occupancy[0]);  // still within grace
    const ProcessingResult& r2 = engine.tick(make_window_0(), t + 8.5f, sensors);
    CHECK_FALSE(r2.zone_occupancy[0]);  // grace elapsed (and < t+11 zone timeout)
}

TEST_CASE("assisted-clear: grace timer resets when a sensor re-activates") {
    ZoneEngine engine = make_parity_engine();
    engine.set_assisted_clear(true, 5.0f);
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;  sensors.static_timeout = 1.0f;
    sensors.motion_on = true;  sensors.motion_timeout = 1.0f;

    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);
    engine.tick(make_window_0(), t + 1.0f, sensors);
    sensors.static_on = false;  sensors.motion_on = false;
    engine.tick(make_window_0(), t + 2.0f, sensors);  // sensors pending
    engine.tick(make_window_0(), t + 3.0f, sensors);  // INACTIVE -> grace starts ~t+3

    // Motion re-activates at t+4 (cancels grace), then off again.
    sensors.motion_on = true;
    engine.tick(make_window_0(), t + 4.0f, sensors);  // motion ACTIVE -> grace cancelled
    sensors.motion_on = false;
    engine.tick(make_window_0(), t + 5.0f, sensors);  // motion pending
    engine.tick(make_window_0(), t + 6.0f, sensors);  // motion INACTIVE -> grace RESTARTS ~t+6

    // t+9: only 3s since the restart (< 5s). Had the timer NOT reset, the
    // original t+3 grace would have elapsed at t+8 and cleared the zone.
    // (Stays well under the zone's own 10s timeout, pending since t+1 -> t+11.)
    const ProcessingResult& r1 = engine.tick(make_window_0(), t + 9.0f, sensors);
    CHECK(r1.zone_occupancy[0]);  // timer was reset, grace not yet elapsed
}

TEST_CASE("assisted-clear: timeout 0 == legacy immediate clear") {
    ZoneEngine engine = make_parity_engine();
    engine.set_assisted_clear(true, 0.0f);
    float t = 100.0f;
    SensorInput sensors;
    sensors.static_on = true;  sensors.static_timeout = 1.0f;
    sensors.motion_on = true;  sensors.motion_timeout = 1.0f;

    engine.tick(make_window_1(X_OFF + 150, 150, 7), t, sensors);
    engine.tick(make_window_1(X_OFF + 150, 150, 7), t + 0.5f, sensors);
    engine.tick(make_window_0(), t + 1.0f, sensors);
    sensors.static_on = false;  sensors.motion_on = false;
    engine.tick(make_window_0(), t + 2.0f, sensors);  // sensors pending
    const ProcessingResult& r = engine.tick(make_window_0(), t + 3.5f, sensors);
    CHECK_FALSE(r.zone_occupancy[0]);  // cleared on first inactive tick
}
