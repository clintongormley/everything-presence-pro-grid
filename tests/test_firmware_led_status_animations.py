"""The LED's connection status animations can be switched off (#450).

A template switch, "LED Status Animations", turns off the "Network Connecting"
pulse at boot and while disconnected, and the colour sequence when a client
connects. It is an entity so automations can turn the animations off at night.
The pulse only shows while no API client is connected, so the switch has to
hold its state on the device, and every place that starts an animation has to
read it. These tests pin that structurally. (See
firmware/common/everything-presence-pro-base.yaml.)
"""

from pathlib import Path

import yaml

from tests.esphome_yaml import ESPHomeLoader

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml() -> dict:
    text = (REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    return yaml.load(text, Loader=ESPHomeLoader)


def _compact(source: str) -> str:
    """The lambda's code without `//` comments and whitespace."""
    code = "\n".join(line.split("//", 1)[0] for line in source.splitlines())
    return "".join(code.split())


def _is_connecting_effect_turn_on(action) -> bool:
    if not isinstance(action, dict):
        return False
    turn_on = action.get("light.turn_on")
    return isinstance(turn_on, dict) and turn_on.get("effect") == "Network Connecting"


def _switch(doc: dict) -> dict:
    entry = next((s for s in doc["switch"] if s.get("id") == "led_status_animations"), None)
    assert entry is not None, "led_status_animations switch not found in firmware YAML"
    return entry


def test_the_switch_is_an_entity_that_restores_and_defaults_to_on():
    entry = _switch(_load_base_yaml())
    assert entry["platform"] == "template"
    # The object_id the integration looks the entity up by (list_devices).
    assert entry["name"] == "LED Status Animations"
    assert not entry.get("internal", False), "the switch must be an entity, so automations can use it"
    assert entry["entity_category"] == "config"
    assert entry["optimistic"] is True
    assert entry["restore_mode"] == "RESTORE_DEFAULT_ON", (
        "the switch must survive a reboot (the boot animation reads it before any client connects) "
        "and stay on for everyone who never touches it"
    )


def test_the_switch_has_no_actions():
    # A restored template switch re-runs its actions on every boot, so the
    # animations read the state instead of the switch driving them.
    entry = _switch(_load_base_yaml())
    assert "turn_on_action" not in entry
    assert "turn_off_action" not in entry
    assert "lambda" not in entry


def test_the_boot_animation_is_gated_on_the_switch_and_turns_the_led_off_otherwise():
    doc = _load_base_yaml()
    boot_steps = [step for entry in doc["esphome"]["on_boot"] for step in entry["then"]]
    assert not any(_is_connecting_effect_turn_on(step) for step in boot_steps), (
        "the boot animation starts the pulse unconditionally"
    )
    gated = [
        step["if"]
        for step in boot_steps
        if isinstance(step, dict)
        and "if" in step
        and any(_is_connecting_effect_turn_on(inner) for inner in step["if"]["then"])
    ]
    assert len(gated) == 1, "expected the boot animation inside one `if`"
    assert gated[0]["condition"] == {"switch.is_on": "led_status_animations"}
    # led_rgb may come back in the state it had before a power cut: without
    # the animation, the LED has to be turned off.
    assert {"light.turn_off": "led_rgb"} in gated[0]["else"]


def test_the_boot_animation_runs_after_the_switch_has_restored():
    # Template switches restore in setup() at priority HARDWARE - 2 (798, see
    # TemplateSwitch::get_setup_priority); an on_boot automation with a lower
    # priority runs after that.
    doc = _load_base_yaml()
    for entry in doc["esphome"]["on_boot"]:
        if any(isinstance(step, dict) and "if" in step for step in entry["then"]):
            assert entry["priority"] < 798


def test_control_leds_starts_the_pulse_only_when_the_switch_is_on():
    doc = _load_base_yaml()
    script = next(s for s in doc["script"] if s.get("id") == "control_leds")
    source = _compact(script["then"][0]["lambda"])
    before_branch, disconnected = source.split("if(!id(api_id).is_connected()){", 1)
    gate = "if(id(led_status_animations).state){"
    assert gate in disconnected, "control_leds must read the switch before it starts the pulse"
    gated = disconnected.split(gate, 1)[1]
    on_branch, off_branch = gated.split("}else{", 1)
    assert "id(control_leds_connecting).execute();" in on_branch
    # Turned off at once, not through control_leds_manual: its delays would let a
    # reconnect's mode script run first and the turn-off land after it.
    assert "control_leds_manual" not in off_branch.split("}", 1)[0]
    assert "id(led_rgb).turn_off();" in off_branch.split("}", 1)[0]
    # Mode scripts still in flight would otherwise set their final LED state
    # after this and keep it for the whole disconnect. control_leds stops them
    # before it picks a branch (tests/test_firmware_led_mode_scripts.py).
    assert "id(stop_led_mode_scripts).execute();" in before_branch


def test_the_pulse_latches_only_while_the_switch_is_still_on():
    # The switch can go off during the pulse's delay (a reconnect in between),
    # and the next disconnect turns the LED off without stopping the script.
    doc = _load_base_yaml()
    script = next(s for s in doc["script"] if s.get("id") == "control_leds_connecting")
    (latch,) = [
        step["if"]
        for step in script["then"]
        if isinstance(step, dict) and "if" in step and any(_is_connecting_effect_turn_on(a) for a in step["if"]["then"])
    ]
    condition = _compact(latch["condition"]["lambda"])
    assert "!id(api_id).is_connected()" in condition
    assert "id(led_status_animations).state" in condition


def test_the_connect_sequence_is_gated_on_the_switch():
    doc = _load_base_yaml()
    steps = doc["api"]["on_client_connected"]["then"]
    sequences = [
        step["if"]
        for step in steps
        if isinstance(step, dict)
        and "if" in step
        and sum(1 for inner in step["if"]["then"] if isinstance(inner, dict) and "light.turn_on" in inner) > 1
    ]
    assert len(sequences) == 1, "expected the colour sequence inside one `if`"
    assert "id(led_status_animations).state&&" in _compact(sequences[0]["condition"]["lambda"])
    # Without the sequence, the handler still restores the mode's LED state.
    assert steps[-1] == {"script.execute": "control_leds"}
