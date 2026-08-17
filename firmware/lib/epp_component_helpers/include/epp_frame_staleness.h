#pragma once
//
// Predicate: "has the LD2450 stopped sending frames for too long?"
//
// Item M6 (PR-8): if the radar dies, the UART wedges, or the producer thread
// hangs, no new frames arrive. The previous loop() gated all publish-throttles
// on `if (!frame_ready_) return;` — meaning every sensor froze at its last
// value with HA having no signal that the device is offline.
//
// The fix is to run throttles unconditionally and publish "no targets" /
// INACTIVE state when the latest frame is older than STALE_FRAME_MS. This
// helper is the gating predicate, factored out so the timer-arithmetic
// edge cases (cold start, unsigned wraparound) are pinned by tests.

#include <cstdint>

namespace epp {

/// True iff the LD2450 frame source is considered stale.
///
/// `now_ms` — current millis() reading.
/// `last_frame_ms` — millis() at which the last frame was received.
/// `has_frame` — false before the first frame ever arrives.
/// `threshold_ms` — staleness threshold (e.g. 5000ms = 5s).
///
/// Cold-start contract: when `has_frame` is false (no frame yet seen) we
/// return true so callers publish the "no signal" state from boot rather
/// than holding sensor publishes back until a first frame arrives. The
/// caller is responsible for the boot-settle window if a different cold-
/// start behaviour is wanted.
inline bool is_frame_stale(uint32_t now_ms, uint32_t last_frame_ms,
                           bool has_frame, uint32_t threshold_ms) {
  if (!has_frame) return true;
  // Use unsigned subtraction so millis() wrap (every ~49.7 days) is handled
  // correctly: (now - last) wraps to a small value if now just rolled past
  // zero, which is exactly the right answer for "how long ago".
  return (now_ms - last_frame_ms) >= threshold_ms;
}

/// Health of the LD2450 link, for a user-facing connectivity signal.
///
/// `is_frame_stale` collapses "no frame yet" and "frames stopped" into one
/// bool and reports stale from t=0. That is right for the publish-throttles
/// but too coarse for a health entity: a sensor that is dead from boot (#407)
/// must read OFFLINE, yet a healthy-but-slow-to-start sensor must not be
/// flagged before its first frame has had a fair chance to arrive. This
/// three-state view keeps the still-starting state distinct so the caller can
/// leave the entity unpublished until the link's state is actually known.
enum class TrackerHealth : uint8_t {
  STARTING,  //< No frame yet, still within the first-frame grace window.
  ONLINE,    //< A frame arrived within the staleness threshold.
  OFFLINE,   //< Frames went stale, or none arrived within the threshold since boot.
};

/// Classify the LD2450 link.
///
/// `now_ms` / `last_frame_ms` / `has_frame` / `stale_threshold_ms` — as for
/// `is_frame_stale`.
/// `boot_ms` — millis() captured at boot, so the never-seen-frame grace is
/// measured from boot rather than from t=0.
///
/// The startup grace deliberately reuses `stale_threshold_ms` (not a separate,
/// shorter boot-settle window): "silent for `stale_threshold_ms`" then means
/// the same thing at boot as mid-stream, so a healthy tracker whose first frame
/// merely arrives late is held STARTING rather than flapping to OFFLINE and
/// back. The frame stream is decoupled from target presence — the LD2450 emits
/// ~10Hz even in an empty room — so ONLINE means "frames are arriving", never
/// "someone is present". OFFLINE covers both a link that went silent and one
/// that never came up within `stale_threshold_ms` of boot.
inline TrackerHealth tracker_health(uint32_t now_ms, uint32_t last_frame_ms,
                                    bool has_frame, uint32_t boot_ms,
                                    uint32_t stale_threshold_ms) {
  if (!is_frame_stale(now_ms, last_frame_ms, has_frame, stale_threshold_ms)) {
    return TrackerHealth::ONLINE;
  }
  // Stale. A never-seen frame within `stale_threshold_ms` of boot is just a
  // slow first frame, not a fault. Unsigned subtraction keeps the
  // elapsed-since-boot measurement correct across millis() wraparound.
  if (!has_frame && (now_ms - boot_ms) < stale_threshold_ms) {
    return TrackerHealth::STARTING;
  }
  return TrackerHealth::OFFLINE;
}

}  // namespace epp
