#include "epp_rolling_window.h"

#include <algorithm>
#include <cstring>

namespace epp {

namespace {

// compute_median from epp_tumbling_window.h uses RAW_FPS+2 buffer.
// RollingWindow can hold up to 16 entries, so we need a larger buffer here.
static constexpr int ROLLING_MAX_FRAMES = 16;

static float rolling_median(const float* data, int count) {
    if (count <= 0) return 0.0f;
    if (count == 1) return data[0];
    float buf[ROLLING_MAX_FRAMES];
    std::copy(data, data + count, buf);
    int mid = count / 2;
    std::nth_element(buf, buf + mid, buf + count);
    if (count % 2 == 0) {
        float upper = buf[mid];
        std::nth_element(buf, buf + mid - 1, buf + count);
        return (buf[mid - 1] + upper) / 2.0f;
    }
    return buf[mid];
}

}  // namespace

RollingWindow::RollingWindow(uint32_t window_ms)
    : window_ms_(window_ms) {}

void RollingWindow::reset() {
    head_ = 0;
    count_ = 0;
}

void RollingWindow::expire_old(uint32_t now_ms) {
    // Walk from tail forward, expiring frames older than window_ms_
    while (count_ > 0) {
        int tail = (head_ - count_ + MAX_FRAMES) % MAX_FRAMES;
        if (now_ms - frames_[tail].timestamp_ms > window_ms_) {
            --count_;
        } else {
            break;
        }
    }
}

void RollingWindow::feed(const TargetInput targets[], int target_count, uint32_t timestamp_ms) {
    expire_old(timestamp_ms);

    // Copy frame into circular buffer
    int n = std::min(target_count, MAX_TARGETS);
    for (int i = 0; i < n; ++i) {
        frames_[head_].targets[i] = targets[i];
    }
    // Zero any remaining slots
    for (int i = n; i < MAX_TARGETS; ++i) {
        frames_[head_].targets[i] = {0.0f, 0.0f, false};
    }
    frames_[head_].timestamp_ms = timestamp_ms;

    head_ = (head_ + 1) % MAX_FRAMES;
    if (count_ < MAX_FRAMES) {
        ++count_;
    }
    // If count_ was already MAX_FRAMES, the oldest frame is implicitly overwritten
    // (head_ advanced past it), so count_ stays at MAX_FRAMES
}

WindowOutput RollingWindow::output() const {
    WindowOutput out{};
    out.total_frames = count_;

    if (count_ == 0) {
        return out;
    }

    // Per-target accumulators (stack-allocated, sized for MAX_FRAMES).
    float xs[MAX_TARGETS][MAX_FRAMES];
    float ys[MAX_TARGETS][MAX_FRAMES];
    int per_target_count[MAX_TARGETS] = {};

    int tail = (head_ - count_ + MAX_FRAMES) % MAX_FRAMES;
    for (int f = 0; f < count_; ++f) {
        int idx = (tail + f) % MAX_FRAMES;
        for (int t = 0; t < MAX_TARGETS; ++t) {
            if (frames_[idx].targets[t].active) {
                int c = per_target_count[t];
                if (c < MAX_FRAMES) {
                    xs[t][c] = frames_[idx].targets[t].x;
                    ys[t][c] = frames_[idx].targets[t].y;
                    per_target_count[t]++;
                }
            }
        }
    }

    for (int t = 0; t < MAX_TARGETS; ++t) {
        int c = per_target_count[t];
        if (c > 0) {
            out.targets[t].median_x = rolling_median(xs[t], c);
            out.targets[t].median_y = rolling_median(ys[t], c);
            out.targets[t].frame_count = c;
            out.targets[t].active = true;
        }
    }

    return out;
}

}  // namespace epp
