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


def test_firmware_variants_are_keyed_by_model_then_network() -> None:
    """`_ota_manifest_url` looks up (model, network) in that order."""
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    assert set(FIRMWARE_VARIANTS) == {"everything-presence-pro", "everything-presence-lite"}
    for networks in FIRMWARE_VARIANTS.values():
        assert set(networks) <= {"wifi", "ethernet"}
        assert "wifi" in networks


def test_lite_has_no_ethernet_variant() -> None:
    """The Lite has no ethernet hardware, so no such firmware is built.

    Listing one would route a Lite to a build that does not exist (404 at OTA
    time) or, worse, to the Pro's ethernet image.
    """
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    assert "ethernet" not in FIRMWARE_VARIANTS["everything-presence-lite"]


def test_default_firmware_model_is_a_known_model() -> None:
    """Firmware predating the `model` flag falls back to this, so it has to
    resolve — otherwise every pre-flag device loses its OTA button."""
    from custom_components.eppgrid.const import DEFAULT_FIRMWARE_MODEL
    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    assert DEFAULT_FIRMWARE_MODEL in FIRMWARE_VARIANTS


def test_every_firmware_variant_file_exists() -> None:
    """Each variant names a real `firmware/variants/{variant}.yaml`.

    The value is also the published manifest filename, so a typo here is a 404
    the user only meets when they press Update.
    """
    from pathlib import Path

    from custom_components.eppgrid.const import FIRMWARE_VARIANTS

    variants_dir = Path(__file__).resolve().parents[1] / "firmware" / "variants"
    for model, networks in FIRMWARE_VARIANTS.items():
        for network, variant in networks.items():
            assert (variants_dir / f"{variant}.yaml").is_file(), (
                f"FIRMWARE_VARIANTS[{model!r}][{network!r}] = {variant!r} but "
                f"firmware/variants/{variant}.yaml does not exist."
            )
