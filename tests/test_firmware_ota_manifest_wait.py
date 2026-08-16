"""The set_update_manifest OTA action must wait for the manifest, not race it.

On ESP32 `component.update` fetches + parses the manifest in a *background
task*; the parsed firmware URL only lands on the main loop once that fetch
finishes. The old action waited a fixed `delay: 1s` and then forced
`update.perform` — when several devices flash at once the fetch can take longer
than 1 s, so `perform` runs with an empty firmware URL and the OTA no-ops
("URL not set; cannot start update"). This is a timing race, confirmed against
the ESPHome http_request update component source.

The fix replaces the fixed delay with a `wait_until` that blocks on the parsed
`firmware_url` becoming non-empty (with a timeout), so `update.perform` only
runs once the manifest is actually loaded — regardless of how slow the fetch
was. These tests pin that shape so the race can't regress back in.
"""

from pathlib import Path

import yaml

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


def _set_update_manifest_then() -> list:
    doc = load_variant(WIFI_VARIANT_YAML)
    for action in doc.get("api", {}).get("actions", []):
        if isinstance(action, dict) and action.get("action") == "set_update_manifest":
            return action.get("then", [])
    raise AssertionError("base.yaml must define a `set_update_manifest` api action")


def test_action_does_not_gate_perform_on_a_fixed_delay() -> None:
    """A bare `delay` before `update.perform` is the race: it assumes the async
    manifest fetch always finishes inside a fixed window."""
    then = _set_update_manifest_then()
    assert not any(isinstance(step, dict) and "delay" in step for step in then), (
        "set_update_manifest must not gate update.perform on a fixed `delay` — the manifest "
        "fetch runs in a background task and can outlast any fixed wait, starting the OTA with "
        "an empty firmware URL. Wait on the parsed firmware_url instead."
    )


def test_action_waits_until_manifest_firmware_url_is_loaded() -> None:
    """`update.perform` must be preceded by a `wait_until` that blocks on the
    parsed firmware URL, so the OTA only starts once the manifest has loaded."""
    then = _set_update_manifest_then()
    wait_steps = [step["wait_until"] for step in then if isinstance(step, dict) and "wait_until" in step]
    assert wait_steps, "set_update_manifest must `wait_until` the manifest is loaded before performing"

    blob = yaml.safe_dump(wait_steps, default_flow_style=False)
    assert "firmware_url" in blob, (
        "the wait condition must key off the parsed `firmware_url` (empty until the manifest "
        f"fetch completes), got:\n{blob}"
    )
    # A wait with no bound could hang forever if the fetch never lands; require a timeout.
    assert any(isinstance(w, dict) and "timeout" in w for w in wait_steps), (
        "the manifest wait must have a `timeout` so a failed fetch can't hang the OTA action"
    )


def test_action_still_performs_the_update() -> None:
    """Guard against over-correcting: the action must still actually flash."""
    then = _set_update_manifest_then()
    blob = yaml.safe_dump(then, default_flow_style=False)
    assert "update.perform" in blob, "set_update_manifest must still call update.perform"
