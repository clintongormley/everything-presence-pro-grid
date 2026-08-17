// Tests for the is_frame_stale helper.
//
// Item M6 (PR-8): the previous loop() body returned early on `if (!frame_ready_)`,
// meaning every publish-throttle would freeze if the LD2450 stopped sending
// frames. The fix runs throttles unconditionally and publishes "no signal"
// state once frames go stale. This predicate is the gate.
//
// We pin three behaviours: cold-start (no frame yet), normal aging across
// the threshold, and unsigned millis() wraparound (every ~49.7 days).

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cstdint>

#include "epp_frame_staleness.h"

using namespace epp;

constexpr uint32_t THRESHOLD = 5000;  // 5s

TEST_CASE("cold start (has_frame false) is always considered stale") {
  // We must publish 'no signal' before the first frame ever arrives,
  // otherwise sensors stay at their default (false / "") with no event.
  CHECK(is_frame_stale(0, 0, /*has_frame=*/false, THRESHOLD) == true);
  CHECK(is_frame_stale(1000, 0, /*has_frame=*/false, THRESHOLD) == true);
  CHECK(is_frame_stale(1'000'000, 0, /*has_frame=*/false, THRESHOLD) == true);
}

TEST_CASE("fresh frame (just arrived) is not stale") {
  CHECK(is_frame_stale(/*now*/1000, /*last*/1000, true, THRESHOLD) == false);
}

TEST_CASE("frame just under threshold is not stale") {
  CHECK(is_frame_stale(/*now*/THRESHOLD - 1, /*last*/0, true, THRESHOLD) == false);
  CHECK(is_frame_stale(/*now*/4999, /*last*/0, true, THRESHOLD) == false);
}

TEST_CASE("frame at exactly threshold is stale (>=)") {
  // Use >= so the threshold is the inclusive boundary — matches the existing
  // throttle semantics in epp_component.cpp.
  CHECK(is_frame_stale(/*now*/THRESHOLD, /*last*/0, true, THRESHOLD) == true);
  CHECK(is_frame_stale(/*now*/5000, /*last*/0, true, THRESHOLD) == true);
}

TEST_CASE("frame well past threshold is stale") {
  CHECK(is_frame_stale(/*now*/100'000, /*last*/0, true, THRESHOLD) == true);
}

TEST_CASE("millis() wraparound: now wrapped back to a small value") {
  // Pre-wrap: last_frame_ms = 0xFFFFF000 (close to UINT32_MAX).
  // Post-wrap: now_ms = 100 (just after wrap).
  // Real elapsed: 100 - 0xFFFFF000 = 0x1100 (4352 ms) < threshold => not stale.
  uint32_t last = 0xFFFFF000u;
  uint32_t now = 100u;
  // Unsigned subtract: 100 - 0xFFFFF000 = 0x1100 (mod 2^32) = 4352
  CHECK(is_frame_stale(now, last, true, THRESHOLD) == false);

  // Same wrap, but more time has passed (now further along after wrap):
  // 6000 - 0xFFFFF000 = 0x1F00 (?) — let's be explicit:
  //   0xFFFFFFFF - 0xFFFFF000 = 0xFFF (4095 ms remaining before wrap)
  //   then 6000 ms after wrap → real elapsed = 4096 + 6000 = 10096 ms > 5000.
  uint32_t now_late = 6000u;
  CHECK(is_frame_stale(now_late, last, true, THRESHOLD) == true);
}

TEST_CASE("threshold of 0 means 'always stale once we have a frame'") {
  // Edge case: threshold == 0 means even a freshly arrived frame is stale.
  // We don't expect callers to use this, but the predicate must remain sane.
  CHECK(is_frame_stale(/*now*/1000, /*last*/1000, true, 0) == true);
}

// ---------------------------------------------------------------------------
// tracker_health: three-state classification of the LD2450 link.
//
// is_frame_stale collapses "no frame yet (cold start)" and "frames went
// silent" into one bool, and returns stale from t=0. That is right for the
// publish-throttles (publish "no signal" immediately) but too coarse for a
// user-facing health entity: a sensor that is dead FROM BOOT (issue #407)
// must read OFFLINE, but a healthy-but-slow-to-start sensor must not be
// flagged before it has had a fair chance to send its first frame.
// tracker_health separates the "still starting" state so callers can hold the
// entity unpublished until the link's state is actually known. The startup
// grace uses the SAME threshold as mid-stream staleness, so "silent for
// `threshold_ms`" means the same thing whether at boot or after running: a
// healthy tracker whose first frame merely arrives late is never mislabelled.
// ---------------------------------------------------------------------------

TEST_CASE("tracker_health: a fresh frame is ONLINE") {
  CHECK(tracker_health(/*now*/1000, /*last*/1000, /*has_frame*/true,
                       /*boot*/0, THRESHOLD) == TrackerHealth::ONLINE);
}

TEST_CASE("tracker_health: an empty room still streaming (frame within threshold) is ONLINE") {
  // The LD2450 streams frames at ~10Hz even with nobody present, so a fresh
  // frame with all-zero targets keeps last_frame_ms current. Health must NOT
  // depend on target presence — only on frames arriving.
  CHECK(tracker_health(/*now*/4000, /*last*/1000, /*has_frame*/true,
                       /*boot*/0, THRESHOLD) == TrackerHealth::ONLINE);
}

TEST_CASE("tracker_health: a sensor that WAS alive then went silent is OFFLINE") {
  CHECK(tracker_health(/*now*/10000, /*last*/1000, /*has_frame*/true,
                       /*boot*/0, THRESHOLD) == TrackerHealth::OFFLINE);
}

TEST_CASE("tracker_health: a healthy tracker whose first frame is merely slow is never OFFLINE") {
  // Regression for the boot/mid-stream asymmetry: no frame yet but only 3s
  // since boot (under the 5s threshold) must stay STARTING, exactly as a 3s
  // mid-stream gap stays ONLINE — not a spurious "Disconnected" blip.
  CHECK(tracker_health(/*now*/3000, /*last*/0, /*has_frame*/false,
                       /*boot*/0, THRESHOLD) == TrackerHealth::STARTING);
}

TEST_CASE("tracker_health: never-alive is STARTING within the grace, OFFLINE once it elapses (#407)") {
  // A tracker that has sent no frame is held as STARTING (first frame still
  // plausibly in flight) right up to the staleness boundary, then flips to
  // OFFLINE at it (inclusive >=). The boundary is the dead-from-boot
  // regression: before #407 this case surfaced nothing at all.
  CHECK(tracker_health(/*now*/THRESHOLD - 1, /*last*/0, /*has_frame*/false,
                       /*boot*/0, THRESHOLD) == TrackerHealth::STARTING);
  CHECK(tracker_health(/*now*/THRESHOLD, /*last*/0, /*has_frame*/false,
                       /*boot*/0, THRESHOLD) == TrackerHealth::OFFLINE);
}

TEST_CASE("tracker_health: startup grace measured from boot_ms, not zero") {
  // Device booted at millis()=100000; 4s later, still no frame → STARTING.
  CHECK(tracker_health(/*now*/104000, /*last*/0, /*has_frame*/false,
                       /*boot*/100000, THRESHOLD) == TrackerHealth::STARTING);
  // 5s after that boot with still no frame → OFFLINE.
  CHECK(tracker_health(/*now*/105000, /*last*/0, /*has_frame*/false,
                       /*boot*/100000, THRESHOLD) == TrackerHealth::OFFLINE);
}

TEST_CASE("tracker_health: startup grace elapsed since boot survives millis() wraparound") {
  // Booted just before wrap; 'now' has rolled past zero. Unsigned subtraction
  // must still measure real elapsed time (here ~10s) so a never-alive sensor
  // near the wrap boundary isn't mislabelled STARTING forever.
  uint32_t boot = 0xFFFFF000u;  // ~4s before wrap
  CHECK(tracker_health(/*now*/6000, /*last*/0, /*has_frame*/false, boot,
                       THRESHOLD) == TrackerHealth::OFFLINE);
}
