"""Heap diagnostic sensors exposed by firmware base YAML.

The wifi-ble-co2 variant is tight on RAM (ESP32 with ~320 KB usable heap).
A previous OTA bug surfaced because two simultaneous TLS handshakes exceeded
the largest contiguous free block during a cross-origin redirect. We need
ongoing visibility into:

  - Current free heap
  - Lowest ever free heap (low-water mark, catches transient spikes)
  - Largest free contiguous block (catches fragmentation, the real TLS killer)

These are exposed as diagnostic sensors so users can see real numbers and
we can correlate failures with actual margin instead of guessing.
"""

from pathlib import Path

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml() -> dict:
    return load_variant(WIFI_VARIANT_YAML)


def _find_sensor_by_id(sensors: list, sensor_id: str) -> dict | None:
    for s in sensors:
        if isinstance(s, dict) and s.get("id") == sensor_id:
            return s
    return None


def _find_debug_sensor(sensors: list) -> dict | None:
    for s in sensors:
        if isinstance(s, dict) and s.get("platform") == "debug":
            return s
    return None


def test_debug_component_enabled():
    """The `debug` component must be present so the debug sensor platform works."""
    doc = _load_base_yaml()
    assert "debug" in doc, (
        "firmware base YAML must declare a top-level `debug:` component — "
        "required for the `platform: debug` heap sensors."
    )


def test_free_heap_sensor_present():
    """Current free heap exposed as a diagnostic sensor."""
    doc = _load_base_yaml()
    debug_sensor = _find_debug_sensor(doc["sensor"])
    assert debug_sensor is not None, "no `platform: debug` sensor block found"
    free = debug_sensor.get("free")
    assert isinstance(free, dict), "debug sensor must define `free:` for current heap"
    assert free.get("entity_category") == "diagnostic", "Heap Free sensor must be entity_category: diagnostic"


def test_largest_free_block_sensor_present():
    """Largest contiguous free block — what TLS allocations actually need."""
    doc = _load_base_yaml()
    debug_sensor = _find_debug_sensor(doc["sensor"])
    assert debug_sensor is not None, "no `platform: debug` sensor block found"
    block = debug_sensor.get("block")
    assert isinstance(block, dict), (
        "debug sensor must define `block:` for largest free contiguous block — "
        "this is what catches fragmentation that breaks TLS handshakes even "
        "when total free heap looks fine."
    )
    assert block.get("entity_category") == "diagnostic"


def test_min_free_heap_sensor_present():
    """Low-water mark — catches transient spikes (e.g. dual TLS handshake)."""
    doc = _load_base_yaml()
    sensor = _find_sensor_by_id(doc["sensor"], "heap_min_free")
    assert sensor is not None, (
        "expected a sensor with id `heap_min_free` reporting the lowest ever "
        "free heap value (heap_caps_get_minimum_free_size). Total free heap "
        "samples once per minute miss transient drops during OTA / TLS bursts."
    )
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("platform") == "template"
    lambda_body = sensor.get("lambda", "")
    assert "heap_caps_get_minimum_free_size" in lambda_body, (
        "heap_min_free sensor must use heap_caps_get_minimum_free_size() — "
        "ESP-IDF's only API for the all-time low-water mark."
    )


def test_loop_time_sensor_present():
    """ESPHome main-loop time often correlates with memory pressure / blocked tasks."""
    doc = _load_base_yaml()
    debug_sensor = _find_debug_sensor(doc["sensor"])
    assert debug_sensor is not None, "no `platform: debug` sensor block found"
    loop_time = debug_sensor.get("loop_time")
    assert isinstance(loop_time, dict), (
        "debug sensor must define `loop_time:` — long loop times often correlate "
        "with memory pressure and are useful when triaging heap exhaustion."
    )
    assert loop_time.get("entity_category") == "diagnostic"


def test_free_heap_sensor_has_explicit_state_class():
    """Heap Free must pin state_class so long-term statistics survive any ESPHome version.

    The `debug` platform only began defaulting `state_class: measurement` on its
    heap sensors in ESPHome 2026.4.0 (PR #15486). Builds compiled with an older
    ESPHome (e.g. 2026.3.x, which our unpinned CI / local dev can produce) ship
    the sensor with no state_class, so HA drops long-term statistics with
    "no longer has a state class". Setting it ourselves makes it deterministic.
    """
    doc = _load_base_yaml()
    debug_sensor = _find_debug_sensor(doc["sensor"])
    assert debug_sensor is not None, "no `platform: debug` sensor block found"
    free = debug_sensor.get("free")
    assert isinstance(free, dict)
    assert free.get("state_class") == "measurement", (
        "Heap Free must set `state_class: measurement` explicitly — do not rely "
        "on the ESPHome debug-platform default, which is absent before 2026.4.0."
    )


def test_largest_free_block_sensor_has_explicit_state_class():
    """Heap Largest Block must pin state_class (see test_free_heap_sensor_has_explicit_state_class)."""
    doc = _load_base_yaml()
    debug_sensor = _find_debug_sensor(doc["sensor"])
    assert debug_sensor is not None, "no `platform: debug` sensor block found"
    block = debug_sensor.get("block")
    assert isinstance(block, dict)
    assert block.get("state_class") == "measurement", (
        "Heap Largest Block must set `state_class: measurement` explicitly — the "
        "ESPHome debug-platform default is absent before 2026.4.0, which silently "
        "stops HA long-term statistics for builds compiled with an older ESPHome."
    )


def test_loop_time_sensor_has_explicit_state_class():
    """Loop Time must pin state_class (see test_free_heap_sensor_has_explicit_state_class)."""
    doc = _load_base_yaml()
    debug_sensor = _find_debug_sensor(doc["sensor"])
    assert debug_sensor is not None, "no `platform: debug` sensor block found"
    loop_time = debug_sensor.get("loop_time")
    assert isinstance(loop_time, dict)
    assert loop_time.get("state_class") == "measurement", (
        "Loop Time must set `state_class: measurement` explicitly — do not rely "
        "on the ESPHome debug-platform default, which is absent before 2026.4.0."
    )


def test_uptime_sensor_present():
    """Uptime distinguishes a reboot from a network blip.

    `Heap Min Free` only resets on reboot; cross-referencing it with an Uptime
    sensor that drops to ~0 lets us confirm whether a "device unavailable"
    period in HA history was an OOM-driven reboot or just lost connectivity.
    """
    doc = _load_base_yaml()
    sensor = _find_sensor_by_id(doc["sensor"], "uptime_sensor")
    assert sensor is not None, (
        "expected a sensor with id `uptime_sensor` reporting seconds since boot. "
        "Required to distinguish reboots from network blips when triaging "
        "device-unavailable episodes."
    )
    assert sensor.get("platform") == "uptime"
    assert sensor.get("entity_category") == "diagnostic"


def test_reset_reason_text_sensor_present():
    """Reset Reason explains *why* the device rebooted.

    Uptime tells us a reboot happened; Reset Reason tells us if it was a crash
    (SW_CPU / TASK_WDT / INT_WDT / LOAD_PROHIBITED — all OOM- or fault-adjacent),
    a brownout (BROWNOUT), a manual restart (EXT), or a power cycle (POWERON).
    """
    doc = _load_base_yaml()
    text_sensors = doc.get("text_sensor", [])
    assert isinstance(text_sensors, list) and text_sensors, (
        "expected a top-level `text_sensor:` list with at least one entry — "
        "needed for the debug component's reset_reason text sensor."
    )
    debug_text_sensor = next(
        (ts for ts in text_sensors if isinstance(ts, dict) and ts.get("platform") == "debug"),
        None,
    )
    assert debug_text_sensor is not None, "expected a `platform: debug` text_sensor block exposing reset_reason."
    reset_reason = debug_text_sensor.get("reset_reason")
    assert isinstance(reset_reason, dict), (
        "debug text_sensor must define `reset_reason:` so the reason for the "
        "last reboot is visible in HA. Crucial for distinguishing OOM-driven "
        "crashes from brownouts or manual restarts."
    )
    assert reset_reason.get("entity_category") == "diagnostic"
