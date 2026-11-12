"""control_leds must stop the LED mode scripts before it picks one again.

The mode scripts wait between steps. control_leds_presence and
control_leds_manual run one copy at a time, so a new start while one is still
waiting is ignored ("already running"): an occupancy change during the
presence glow's 700 ms, or its 500 ms fade-out, would be lost and the LED
would keep the old state. The restart-mode CO2 scripts are not restarted when
the mode changes, so they would finish on top of the new one. A script left
running across a disconnect would likewise set its final state after the
"Network Connecting" pulse. These tests pin the stop structurally. (See
firmware/common/everything-presence-pro-base.yaml.)
"""

import re

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import find_by_id
from tests.esphome_yaml import load_variant


def _compact(source: str) -> str:
    """The lambda's code without `//` comments and whitespace."""
    code = "\n".join(line.split("//", 1)[0] for line in source.splitlines())
    return "".join(code.split())


def test_control_leds_stops_the_mode_scripts_before_choosing_one():
    """stop_led_mode_scripts runs before any branch of control_leds starts a mode script."""
    script = find_by_id(load_variant(WIFI_VARIANT_YAML)["script"], "control_leds")
    assert script is not None, "control_leds script not found in firmware YAML"
    source = _compact(script["then"][0]["lambda"])
    stop = "id(stop_led_mode_scripts).execute();"
    assert stop in source
    assert source.index(stop) < source.index("if("), "stop the mode scripts before any branch starts one"


def _actions(node):
    """Every action mapping in a script's `then`, at any depth."""
    if isinstance(node, list):
        for item in node:
            yield from _actions(item)
    elif isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _actions(value)


def _started_scripts(script: dict) -> set[str]:
    started = set()
    for action in _actions(script["then"]):
        target = action.get("script.execute")
        if isinstance(target, str):
            started.add(target)
        elif isinstance(target, dict):
            started.add(target["id"])
        lambda_source = action.get("lambda")
        if isinstance(lambda_source, str):
            started.update(re.findall(r"id\((\w+)\)(?:\.|->)execute\(", lambda_source))
    return started


def _can_be_in_flight(script: dict) -> bool:
    return any(
        key in action
        for action in _actions(script["then"])
        for key in ("delay", "while", "repeat", "wait_until", "script.wait")
    )


def test_control_leds_stops_every_mode_script_that_can_be_in_flight():
    """stop_led_mode_scripts stops exactly the scripts control_leds can reach that delay or loop."""
    # The CO2 build extends the mode scripts (a second entry with the same id),
    # so both definitions count. control_leds_connecting re-checks the
    # connection after its delay instead (test_firmware_led_connecting_guard.py).
    scripts: dict[str, list[dict]] = {}
    for script in load_variant(WIFI_VARIANT_YAML)["script"]:
        scripts.setdefault(script["id"], []).append(script)

    reachable: set[str] = set()
    pending = ["control_leds"]
    while pending:
        for script in scripts[pending.pop()]:
            for name in _started_scripts(script) - reachable:
                reachable.add(name)
                pending.append(name)
    in_flight = {
        name
        for name in reachable - {"control_leds_connecting", "stop_led_mode_scripts"}
        if any(_can_be_in_flight(script) for script in scripts[name])
    }

    assert "stop_led_mode_scripts" in scripts, "stop_led_mode_scripts script not found in firmware YAML"
    (stop_script,) = scripts["stop_led_mode_scripts"]
    assert not _can_be_in_flight(stop_script), "control_leds relies on it having finished when execute() returns"
    stopped = {action["script.stop"] for action in stop_script["then"]}
    assert stopped == in_flight, (
        "stop_led_mode_scripts must stop every script control_leds can reach that delays or loops"
        f" (except control_leds_connecting); missing {sorted(in_flight - stopped)},"
        f" unexpected {sorted(stopped - in_flight)}"
    )
