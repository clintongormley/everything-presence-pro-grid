"""Turning the LED off never switches it on first.

The LED's fade-out steps use `light.turn_on` (to clear an effect, then to dim
to 1%) before `light.turn_off`. On an LED that is already off, `light.turn_on`
switches it on again in its last colour and brightness, so the fade showed a
faint flash of an old colour, e.g. the blue of the "Network Connecting" pulse
after every reconnect in Manual Control. The fade-out steps must only run while
the LED is on. (See firmware/common/everything-presence-pro-base.yaml.)
"""

import pytest

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import find_by_id
from tests.esphome_yaml import load_variant

LED_IS_ON = {"light.is_on": "led_rgb"}


def _turn_off_steps(script_id: str) -> list:
    script = find_by_id(load_variant(WIFI_VARIANT_YAML)["script"], script_id)
    assert script is not None, f"{script_id} script not found in firmware YAML"
    if script_id == "control_leds_presence":
        # The branch for an empty room.
        (branch,) = script["then"]
        return branch["if"]["else"]
    return script["then"]


def _unguarded_turn_ons(steps: list) -> list:
    """`light.turn_on` actions in `steps` that are not inside an `if` on LED_IS_ON."""
    found = []
    for step in steps:
        if not isinstance(step, dict):
            continue
        if "light.turn_on" in step:
            found.append(step)
        if "if" in step and step["if"].get("condition") != LED_IS_ON:
            found += _unguarded_turn_ons(step["if"].get("then", []))
            found += _unguarded_turn_ons(step["if"].get("else", []))
    return found


@pytest.mark.parametrize("script_id", ["control_leds_manual", "control_leds_presence"])
def test_the_fade_out_only_runs_while_the_led_is_on(script_id):
    steps = _turn_off_steps(script_id)
    assert not _unguarded_turn_ons(steps), (
        f"{script_id} switches the LED on before turning it off, even when it is already off"
    )
    # Outside the guard, so the LED ends off whether or not it faded.
    light_steps = [s for s in steps if isinstance(s, dict) and any(k.startswith("light.") for k in s)]
    assert light_steps and light_steps[-1] == {"light.turn_off": "led_rgb"}, f"{script_id} must still leave the LED off"
