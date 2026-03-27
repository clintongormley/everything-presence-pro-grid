#pragma once

#include "epp_tumbling_window.h"  // TargetInput, WindowOutput, TargetWindow, compute_median

namespace epp {

class RollingWindow {
public:
    explicit RollingWindow(uint32_t window_ms = 1000);

    /// Feed a frame with its timestamp (ms). Expires frames older than window_ms.
    void feed(const TargetInput targets[], int target_count, uint32_t timestamp_ms);

    /// Compute current output (median of frames within window).
    /// Always valid after at least one feed() call.
    WindowOutput output() const;

    void set_window_duration(uint32_t ms) { window_ms_ = ms; }
    void reset();

private:
    static constexpr int MAX_FRAMES = 16;

    struct Frame {
        TargetInput targets[MAX_TARGETS];
        uint32_t timestamp_ms;
    };

    uint32_t window_ms_;
    Frame frames_[MAX_FRAMES];
    int head_ = 0;
    int count_ = 0;

    void expire_old(uint32_t now_ms);
};

}  // namespace epp
