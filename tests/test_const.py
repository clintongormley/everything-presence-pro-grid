"""Tests for module-level constants and helpers."""

from __future__ import annotations

from custom_components.eppgrid.const import NUM_ZONE_SLOTS
from custom_components.eppgrid.const import empty_zone_slots


class TestEmptyZoneSlots:
    """empty_zone_slots() must return a fresh, mutable copy each call."""

    def test_returns_correct_shape(self) -> None:
        slots = empty_zone_slots()
        assert len(slots) == NUM_ZONE_SLOTS
        assert slots[0] == {"type": "default"}
        assert all(slot is None for slot in slots[1:])

    def test_returns_fresh_list_each_call(self) -> None:
        a = empty_zone_slots()
        b = empty_zone_slots()
        assert a is not b
        assert a[0] is not b[0]

    def test_mutation_does_not_leak_across_calls(self) -> None:
        a = empty_zone_slots()
        a[0]["type"] = "mutated"
        a[1] = {"name": "Zone1"}

        b = empty_zone_slots()
        assert b[0]["type"] == "default"
        assert b[1] is None


def test_presence_slots_match_data_catalog() -> None:
    """PRESENCE_SLOTS must be the 5 binary presence sensors EPP exposes."""
    from custom_components.eppgrid.const import PRESENCE_SLOTS

    assert PRESENCE_SLOTS == (
        "occupancy",
        "static_presence",
        "motion_presence",
        "target_presence",
        "mmwave_presence",
    )


def test_max_device_groups_is_bounded() -> None:
    """A finite cap protects storage from runaway entries."""
    from custom_components.eppgrid.const import MAX_DEVICE_GROUPS

    assert isinstance(MAX_DEVICE_GROUPS, int)
    assert 1 <= MAX_DEVICE_GROUPS <= 100


def test_max_zone_groups_per_device_group_is_bounded() -> None:
    from custom_components.eppgrid.const import MAX_ZONE_GROUPS_PER_DEVICE_GROUP

    assert isinstance(MAX_ZONE_GROUPS_PER_DEVICE_GROUP, int)
    assert 1 <= MAX_ZONE_GROUPS_PER_DEVICE_GROUP <= 32


def test_epp_models_covers_both_boards() -> None:
    """Discovery matches on the model string the device reports.

    `_is_epp_device` is the single gate for discovery, the entity-create
    pre-filter and the delete-guard, so a board missing from this tuple is
    invisible to the integration even running our firmware.
    """
    from custom_components.eppgrid.const import EPP_MODELS

    assert "Everything Presence Pro" in EPP_MODELS
    assert "Everything Presence Lite" in EPP_MODELS


def test_epp_models_are_plain_strings() -> None:
    """Compared against `dr.DeviceEntry.model`, which is a plain string."""
    from custom_components.eppgrid.const import EPP_MODELS

    assert isinstance(EPP_MODELS, tuple)
    assert all(isinstance(model, str) for model in EPP_MODELS)


def test_firmware_variants_are_keyed_by_model_network_and_co2() -> None:
    """`_ota_manifest_url` looks up all three axes at once."""
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    for key in FIRMWARE_VARIANTS:
        model, network, co2 = key
        assert model in {"everything-presence-pro", "everything-presence-lite"}
        assert network in {"wifi", "ethernet"}
        assert isinstance(co2, bool)


def test_lite_has_no_ethernet_variant() -> None:
    """The Lite has no ethernet hardware, so no such firmware is built.

    Listing one would route a Lite to a build that does not exist (404 at OTA
    time) or, worse, to the Pro's ethernet image.
    """
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    assert not [k for k in FIRMWARE_VARIANTS if k[0] == "everything-presence-lite" and k[1] == "ethernet"]


def test_lite_both_co2_flags_map_to_the_single_build() -> None:
    """The Lite ships one CO2-capable build, and both co2 flags route to it.

    The SCD40 is an add-on, but the build now copes with the module being
    absent (it clears the scd40 component error on an interval so the status
    LED does not blink for missing hardware). So a device reporting
    co2_enabled=False must still resolve — to the same wifi-lite-co2 build,
    not a 404.
    """
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    lite = {k[2]: v for k, v in FIRMWARE_VARIANTS.items() if k[0] == "everything-presence-lite"}
    assert lite == {False: "wifi-lite-co2", True: "wifi-lite-co2"}


def test_every_pro_variant_has_co2() -> None:
    """CO2 is on the Pro board, so there is no CO2-less Pro build to route to."""
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    assert all(k[2] is True for k in FIRMWARE_VARIANTS if k[0] == "everything-presence-pro")


def test_default_firmware_model_is_a_known_model() -> None:
    """Firmware predating the `model` flag falls back to this, so it has to
    resolve — otherwise every pre-flag device loses its OTA button."""
    from custom_components.eppgrid.const import DEFAULT_FIRMWARE_MODEL
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    assert any(k[0] == DEFAULT_FIRMWARE_MODEL for k in FIRMWARE_VARIANTS)


def test_every_firmware_variant_file_exists() -> None:
    """Each variant names a real `firmware/variants/{variant}.yaml`.

    The value is also the published manifest filename, so a typo here is a 404
    the user only meets when they press Update.
    """
    from pathlib import Path

    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    variants_dir = Path(__file__).resolve().parents[1] / "firmware" / "variants"
    for key, variant in FIRMWARE_VARIANTS.items():
        assert (variants_dir / f"{variant}.yaml").is_file(), (
            f"FIRMWARE_VARIANTS[{key!r}] = {variant!r} but firmware/variants/{variant}.yaml does not exist."
        )
