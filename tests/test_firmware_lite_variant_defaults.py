"""Per-model capability flags describe the hardware the firmware actually wires up.

`get_build_flags` reports a `has_*` flag for every piece of optional hardware.
DeviceManager.list_devices() merges those flags into the device payload and the
panel hides the matching controls, so the flags are the *only* thing standing
between a Lite owner and a settings page full of sliders for hardware the board
does not have.

That makes the flags a claim about the firmware, and a claim worth checking:
a flag set to true when the model's base never declares the matching service is
strictly worse than no flag at all, because the panel then renders a control
whose save silently pushes nowhere (every push in
`DeviceConnection.async_push_config` is guarded on the service existing).
`has_illuminance: true` without an `epp_set_env_calibration` action to receive
the value is the shape of that failure: a slider that moves and saves and
changes nothing on the device.

So rather than assert the flag values in isolation, the tests below resolve each
variant's real merged ESPHome config and check the flag against the thing it
claims exists.
"""

from __future__ import annotations

import pytest

from tests.esphome_yaml import LITE_CO2_VARIANT_YAML
from tests.esphome_yaml import LITE_VARIANT_YAML
from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant
from tests.esphome_yaml import load_yaml

LITE_DEFAULTS = "firmware/common/lite-variant-defaults.yaml"
PRO_DEFAULTS = "firmware/common/variant-defaults.yaml"

VARIANTS = {"pro": WIFI_VARIANT_YAML, "lite": LITE_VARIANT_YAML, "lite-co2": LITE_CO2_VARIANT_YAML}


def _device_config(variant_yaml) -> dict:
    return load_variant(variant_yaml)["substitutions"]["device_config"]


def _api_actions(variant_yaml) -> set[str]:
    return {a["action"] for a in load_variant(variant_yaml).get("api", {}).get("actions", []) if isinstance(a, dict)}


def _sensor_ids(variant_yaml) -> set[str]:
    return {s["id"] for s in load_variant(variant_yaml).get("sensor", []) if isinstance(s, dict) and "id" in s}


def _epp_keys(variant_yaml) -> set[str]:
    return set(load_variant(variant_yaml).get("epp", {}))


# Each flag, and the thing in the merged config that has to back it up.
# `actions` are API actions the panel's control pushes through — without one the
# control is a no-op. `sensors` / `epp_keys` are the hardware the reading comes
# from.
#
# Temperature and humidity list no action: all three environmental offsets ride
# on the single `epp_set_env_calibration` call, which every model declares
# because every model has *some* environmental sensor. The SHTC3 is what
# actually distinguishes them, so that is what they assert on.
CAPABILITIES = {
    "has_temperature": {"sensors": {"shtc3_sensor"}},
    "has_humidity": {"sensors": {"shtc3_sensor"}},
    "has_illuminance": {"sensors": {"illuminance_sensor"}, "actions": {"epp_set_env_calibration"}},
    "has_motion_presence": {"epp_keys": {"motion_presence"}, "actions": {"epp_set_motion_timeout"}},
    "has_static_presence": {
        "epp_keys": {"static_presence"},
        "actions": {"epp_set_static_presence", "epp_set_static_timeout"},
    },
    "has_led": {"actions": {"epp_set_led"}},
    "has_relay": {"epp_keys": {"relay_switch"}, "actions": {"epp_set_relay"}},
}


@pytest.mark.parametrize("model", sorted(VARIANTS))
@pytest.mark.parametrize("flag", sorted(CAPABILITIES))
def test_capability_flag_matches_what_the_firmware_declares(model: str, flag: str) -> None:
    """A `has_*: true` must be backed by the service and hardware it implies.

    The failure this guards is silent in both directions: an overstated flag
    shows a control that pushes nowhere, an understated one hides working
    hardware from the user with no error anywhere.
    """
    variant = VARIANTS[model]
    claimed = _device_config(variant)[flag]
    expect = CAPABILITIES[flag]

    for action in expect.get("actions", set()):
        present = action in _api_actions(variant)
        assert present is claimed, (
            f"{model}: device_config.{flag}={claimed} but api action {action!r} "
            f"{'is missing' if claimed else 'is declared'}. The flag and the firmware must agree — "
            f"the panel gates that control on the flag alone."
        )
    for sensor_id in expect.get("sensors", set()):
        present = sensor_id in _sensor_ids(variant)
        assert present is claimed, (
            f"{model}: device_config.{flag}={claimed} but sensor id {sensor_id!r} "
            f"{'is missing' if claimed else 'is declared'}."
        )
    for key in expect.get("epp_keys", set()):
        present = key in _epp_keys(variant)
        assert present is claimed, (
            f"{model}: device_config.{flag}={claimed} but epp.{key} {'is missing' if claimed else 'is declared'}."
        )


@pytest.mark.parametrize("model", sorted(VARIANTS))
def test_every_capability_flag_is_declared(model: str) -> None:
    """Neither model may omit a flag — a missing one reads as `undefined` in the
    panel, which falls back to "device has it" and shows a dead control."""
    config = _device_config(VARIANTS[model])
    missing = sorted(set(CAPABILITIES) - set(config))
    assert not missing, f"{model} device_config is missing capability flags: {missing}"


@pytest.mark.parametrize("model", sorted(VARIANTS))
def test_capability_flags_are_real_booleans(model: str) -> None:
    """`get_build_flags` emits these through the `| lower` Jinja filter, which
    turns a quoted "false" into the string `"false"` — truthy in JS, so the
    panel would show every control on a Lite."""
    config = _device_config(VARIANTS[model])
    for flag in sorted(CAPABILITIES):
        assert isinstance(config[flag], bool), (
            f"{model}: device_config.{flag} is {config[flag]!r} ({type(config[flag]).__name__}), "
            f"not a YAML boolean. Quoted values reach the panel as truthy strings."
        )


# ---------------------------------------------------------------------------
# Lite hardware facts the flags encode
# ---------------------------------------------------------------------------


def test_lite_model_string_matches_the_ota_router() -> None:
    """`_ota_manifest_url` routes on this exact string.

    If it drifts, a Lite silently receives the Pro manifest and flashes Pro
    firmware over Lite hardware.
    """
    assert _device_config(LITE_VARIANT_YAML)["model"] == "everything-presence-lite"


def test_pro_model_string() -> None:
    assert _device_config(WIFI_VARIANT_YAML)["model"] == "everything-presence-pro"


def test_lite_sensor_variant_is_ld2450_only() -> None:
    """The Lite's radar socket also takes an LD2410 / MR24HPC1 / SEN0395 /
    SEN0609, but the zone engine needs the LD2450's per-target coordinates, so
    this firmware supports that module alone."""
    assert _device_config(LITE_VARIANT_YAML)["sensor_variant"] == "ld2450"


def test_pro_sensor_variant_includes_sen0609() -> None:
    assert "sen0609" in _device_config(WIFI_VARIANT_YAML)["sensor_variant"]


def test_lite_is_wifi_only() -> None:
    """No ethernet hardware, hence no ethernet-ble-lite variant to build."""
    assert _device_config(LITE_VARIANT_YAML)["ethernet_enabled"] is False


def test_lite_env_calibration_takes_the_same_arguments_as_the_pro() -> None:
    """ESPHome matches a user action by name *and* argument list.

    The integration sends all three offsets in one call regardless of model
    (`_connection.py`), so a Lite that declared only `illuminance_offset` would
    fail the call outright rather than ignore the two it cannot use.
    """

    def variables(variant):
        for action in load_variant(variant)["api"]["actions"]:
            if isinstance(action, dict) and action.get("action") == "epp_set_env_calibration":
                return action["variables"]
        raise AssertionError(f"{variant.name} declares no epp_set_env_calibration action")

    assert variables(LITE_VARIANT_YAML) == variables(WIFI_VARIANT_YAML)


def test_lite_illuminance_offset_reaches_the_sensor() -> None:
    """The offset global has to be both written by the action and read by the
    sensor's filter, or the panel's slider moves a number nothing consumes."""
    config = load_variant(LITE_VARIANT_YAML)
    action = next(a for a in config["api"]["actions"] if a.get("action") == "epp_set_env_calibration")
    assert "env_illuminance_offset" in str(action["then"]), (
        "epp_set_env_calibration must assign id(env_illuminance_offset) on the Lite."
    )
    sensor = next(s for s in config["sensor"] if isinstance(s, dict) and s.get("id") == "illuminance_sensor")
    assert "env_illuminance_offset" in str(sensor["filters"]), (
        "the Lite's illuminance sensor must apply id(env_illuminance_offset) in its filters."
    )


def test_lite_led_stays_reachable_as_a_home_assistant_entity() -> None:
    """`has_led: false` hides the panel's LED controls, so the entity is the only control.

    The Lite's LED is a single fixed-colour status LED — none of the Pro's
    modes, brightness or presence colour mean anything to it, so the panel
    offers nothing for it on purpose. That makes the HA light entity the sole
    way to turn it on or off: marking it `internal` or `disabled_by_default`
    would leave the LED with no control anywhere at all.
    """
    lights = load_variant(LITE_VARIANT_YAML)["light"]
    led = next(light for light in lights if light.get("id") == "esp32_led")
    assert led.get("internal") is False, "the Lite's LED must be exposed to HA, not internal"
    assert not led.get("disabled_by_default"), "the Lite's LED entity must be enabled by default"
    assert led.get("name"), "the Lite's LED entity needs a name to show up in HA"


def test_lite_declares_no_pro_only_services() -> None:
    """Absent hardware must mean an absent service, not a service that no-ops.

    `async_push_config` skips a service it cannot find; a declared-but-inert
    action would instead report success for a setting that did nothing.
    """
    pro_only = {
        "epp_set_led",
        "epp_set_relay",
        "epp_set_static_presence",
        "epp_set_static_timeout",
        "epp_set_motion_timeout",
    }
    assert not (pro_only & _api_actions(LITE_VARIANT_YAML))


def test_both_models_share_the_zone_engine_entities() -> None:
    """The panel is one UI over both models: a zone entity the Lite lacked
    would leave a hole in the grid view with nothing to explain it."""
    shared = {"zone_occupancy", "target_positions", "zone_target_counts", "target_count", "occupancy_output"}
    assert shared <= _epp_keys(LITE_VARIANT_YAML)
    assert shared <= _epp_keys(WIFI_VARIANT_YAML)


def test_defaults_files_are_not_cross_wired() -> None:
    """Each model's defaults file must name its own model.

    Both variants `!include` a `*-variant-defaults.yaml`; swapping them is a
    one-word mistake that leaves the firmware building fine and reporting the
    wrong model to the OTA router.
    """
    from tests.esphome_yaml import REPO_ROOT

    lite = load_yaml(REPO_ROOT / LITE_DEFAULTS)["substitutions"]
    pro = load_yaml(REPO_ROOT / PRO_DEFAULTS)["substitutions"]
    assert lite["device_config"]["model"] == "everything-presence-lite"
    assert pro["device_config"]["model"] == "everything-presence-pro"
    assert lite["name"] == "everything-presence-lite"
    assert pro["name"] == "everything-presence-pro"


# ---------------------------------------------------------------------------
# The SCD40 is an add-on on the Lite, so it needs a build that omits it
# ---------------------------------------------------------------------------


def _sensor_platforms(variant) -> set[str]:
    return {s["platform"] for s in load_variant(variant).get("sensor", []) if isinstance(s, dict)}


def _i2c_bus_ids(variant) -> set[str]:
    return {b["id"] for b in load_variant(variant).get("i2c", []) if isinstance(b, dict) and "id" in b}


def test_bare_lite_compiles_no_scd4x() -> None:
    """A board without the module must not compile the component in at all.

    ESPHome marks a component that cannot reach its I2C device as failed, which
    parks the whole app in error state — the status LED blinks continuously and
    stops honouring manual control, and the failure is otherwise silent.
    """
    assert "scd4x" not in _sensor_platforms(LITE_VARIANT_YAML)
    assert "bus_b" not in _i2c_bus_ids(LITE_VARIANT_YAML), "the bare Lite declares the CO2 I2C bus with nothing on it"


def test_lite_co2_variant_compiles_scd4x() -> None:
    assert "scd4x" in _sensor_platforms(LITE_CO2_VARIANT_YAML)
    assert "bus_b" in _i2c_bus_ids(LITE_CO2_VARIANT_YAML)


def test_co2_enabled_flag_matches_what_each_build_contains() -> None:
    """`co2_enabled` is what the OTA router keys on to pick between the two
    Lite builds, so a flag that disagrees with the build sends a device the
    firmware that breaks it."""
    for variant in (LITE_VARIANT_YAML, LITE_CO2_VARIANT_YAML, WIFI_VARIANT_YAML):
        claimed = _device_config(variant)["co2_enabled"]
        present = "scd4x" in _sensor_platforms(variant)
        assert claimed is present, (
            f"{variant.name}: co2_enabled={claimed} but scd4x {'is missing' if claimed else 'is compiled in'}"
        )


def test_both_lite_builds_are_otherwise_identical() -> None:
    """The CO2 add-on is the only difference; anything else has drifted."""
    bare = load_variant(LITE_VARIANT_YAML)
    co2 = load_variant(LITE_CO2_VARIANT_YAML)
    assert _epp_keys(LITE_VARIANT_YAML) == _epp_keys(LITE_CO2_VARIANT_YAML)
    assert _i2c_bus_ids(LITE_VARIANT_YAML) | {"bus_b"} == _i2c_bus_ids(LITE_CO2_VARIANT_YAML)
    assert _sensor_platforms(LITE_VARIANT_YAML) | {"scd4x"} == _sensor_platforms(LITE_CO2_VARIANT_YAML)
    assert bare["substitutions"]["name"] == co2["substitutions"]["name"]
