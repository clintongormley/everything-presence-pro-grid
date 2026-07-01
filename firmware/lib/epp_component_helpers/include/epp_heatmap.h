#pragma once
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <cmath>
#include "epp_types.h"

namespace epp {

/// Per-cell activity accumulator for the room grid. Pure/host-testable:
/// the ESPHome component owns one, bumps the occupied cell each frame,
/// decays on a timer, and publishes `encode_normalized` as base64.
class Heatmap {
 public:
  void bump(int cell) {
    if (cell < 0 || cell >= GRID_CELL_COUNT) return;
    cells_[cell] += 1.0f;
  }

  void decay(float factor) {
    for (int i = 0; i < GRID_CELL_COUNT; i++) cells_[i] *= factor;
  }

  void reset() {
    for (int i = 0; i < GRID_CELL_COUNT; i++) cells_[i] = 0.0f;
  }

  float value(int cell) const {
    if (cell < 0 || cell >= GRID_CELL_COUNT) return 0.0f;
    return cells_[cell];
  }

  void encode_normalized(uint8_t out[GRID_CELL_COUNT]) const {
    float peak = 0.0f;
    for (int i = 0; i < GRID_CELL_COUNT; i++)
      if (cells_[i] > peak) peak = cells_[i];
    if (peak <= 0.0f) {
      std::memset(out, 0, GRID_CELL_COUNT);
      return;
    }
    for (int i = 0; i < GRID_CELL_COUNT; i++) {
      float n = cells_[i] / peak * 255.0f;
      int v = (int) std::lround(n);
      if (v < 0) v = 0;
      if (v > 255) v = 255;
      out[i] = (uint8_t) v;
    }
  }

  static constexpr size_t blob_size() { return GRID_CELL_COUNT * sizeof(float); }

  void serialize(uint8_t out[GRID_CELL_COUNT * sizeof(float)]) const {
    std::memcpy(out, cells_, blob_size());
  }

  bool deserialize(const uint8_t* in, size_t len) {
    if (len != blob_size()) return false;
    std::memcpy(cells_, in, blob_size());
    return true;
  }

 private:
  float cells_[GRID_CELL_COUNT]{};
};

}  // namespace epp
