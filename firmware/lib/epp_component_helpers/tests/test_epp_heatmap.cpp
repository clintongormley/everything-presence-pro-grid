// firmware/lib/epp_component_helpers/tests/test_epp_heatmap.cpp
#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include <cmath>
#include "epp_heatmap.h"

using namespace epp;

TEST_CASE("fresh heatmap is all zero and encodes to zero") {
  Heatmap h;
  CHECK(h.value(0) == doctest::Approx(0.0f));
  uint8_t out[GRID_CELL_COUNT];
  h.encode_normalized(out);
  CHECK(out[0] == 0);
  CHECK(out[GRID_CELL_COUNT - 1] == 0);
}

TEST_CASE("bump accumulates and ignores out-of-range") {
  Heatmap h;
  h.bump(5);
  h.bump(5);
  h.bump(-1);                 // ignored
  h.bump(GRID_CELL_COUNT);    // ignored
  CHECK(h.value(5) == doctest::Approx(2.0f));
  CHECK(h.value(6) == doctest::Approx(0.0f));
}

TEST_CASE("encode_normalized scales to the peak cell") {
  Heatmap h;
  for (int i = 0; i < 4; i++) h.bump(10);  // peak = 4
  h.bump(20);                              // value 1
  uint8_t out[GRID_CELL_COUNT];
  h.encode_normalized(out);
  CHECK(out[10] == 255);                   // peak -> 255
  CHECK(out[20] == 64);                    // round(1/4*255) = 64
  CHECK(out[0] == 0);
}

TEST_CASE("decay halves values after one half-life of ticks") {
  Heatmap h;
  for (int i = 0; i < 1000; i++) h.bump(3);   // value 1000
  // 4032 five-minute ticks == 14 days; factor chosen so 4032 applications halve.
  const float factor = std::pow(0.5f, 1.0f / 4032.0f);
  for (int i = 0; i < 4032; i++) h.decay(factor);
  CHECK(h.value(3) == doctest::Approx(500.0f).epsilon(0.01));
}

TEST_CASE("reset zeroes everything") {
  Heatmap h;
  h.bump(7);
  h.reset();
  CHECK(h.value(7) == doctest::Approx(0.0f));
}

TEST_CASE("serialize round-trips through deserialize") {
  Heatmap h;
  h.bump(1); h.bump(1); h.bump(2);
  uint8_t blob[Heatmap::blob_size()];
  h.serialize(blob);
  Heatmap h2;
  CHECK(h2.deserialize(blob, sizeof(blob)) == true);
  CHECK(h2.value(1) == doctest::Approx(2.0f));
  CHECK(h2.value(2) == doctest::Approx(1.0f));
  CHECK(h2.deserialize(blob, sizeof(blob) - 1) == false);  // wrong length rejected
}
