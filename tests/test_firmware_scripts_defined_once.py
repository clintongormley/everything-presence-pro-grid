"""Each script in a Pro build is defined once.

ESPHome's `!extend` on a script does not replace the original's steps: it
appends the extension's `then:` to them. The CO2 LED scripts used to extend
placeholders in everything-presence-pro-base.yaml, so every CO2 colour update
first ran the placeholder's fade to off, dimming the LED about once a minute in
Environmental mode. A script defined in two packages is the sign of that, so
these tests require one definition per script id in the built config.
"""

from collections import Counter

import pytest

from tests.esphome_yaml import ETHERNET_VARIANT_YAML
from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant


@pytest.mark.parametrize("variant", [WIFI_VARIANT_YAML, ETHERNET_VARIANT_YAML], ids=lambda p: p.stem)
def test_every_script_is_defined_once(variant):
    counts = Counter(script["id"] for script in load_variant(variant)["script"])
    defined_twice = sorted(name for name, count in counts.items() if count > 1)
    assert not defined_twice, (
        f"scripts defined more than once (ESPHome appends an !extend's steps to the original's): {defined_twice}"
    )
