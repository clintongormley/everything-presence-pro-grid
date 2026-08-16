"""The panel's log-category dropdown must enable the right firmware tags.

The `epp_set_log_level` API action in `everything-presence-pro-base.yaml`
maps each user-facing log category (`system`, `epp`, `led`, `networking`,
`ble`, `co2`) to the underlying ESPHome log tags whose level the action
should change. The firmware globally suppresses logging on boot
(`set_log_level(ESPHOME_LOG_LEVEL_NONE)` at priority 200), so any tag
the user wants to debug MUST be listed in this mapping — otherwise
flipping the panel's "BLE → Debug" toggle silently does nothing for the
tags the user actually cares about (e.g. scan results, proxy events).

A real bug: the BLE category was missing `esp32_ble_tracker` and
`bluetooth_proxy`, so users debugging "is BLE actually scanning?" saw
no logs even with debug enabled.

Two structural invariants this module guards:

1. The `epp` category owns the zone/target/motion entity-state tags
   (`sensor`, `text_sensor`, `binary_sensor`) so those states group with
   the zone engine instead of leaking under `system`.

2. Every per-tag category pins its tags to `NONE` on boot. `system` is
   implemented as the global default level (`set_log_level(level)` with
   no tag), which ESPHome uses as the fallback for any tag WITHOUT an
   explicit override. So unless each category tag is pinned on boot,
   raising `system` to Debug floods the user with epp/sensor/ble/... logs
   it was never meant to enable. The boot pins must therefore cover every
   tag any per-tag category can set.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import load_variant

REPO_ROOT = Path(__file__).resolve().parents[1]


# Categories that set per-tag overrides. `system` is intentionally excluded:
# it sets the global default level (no tag), not a per-tag override.
PER_TAG_CATEGORIES = ("epp", "led", "networking", "ble", "co2")


def _strip_comments(text: str) -> str:
    no_line_comments = re.sub(r"//[^\n]*", "", text)
    return re.sub(r"/\*.*?\*/", "", no_line_comments, flags=re.DOTALL)


def _balanced_block(text: str, open_index: int) -> str:
    """Return the substring inside the braces, given the index just after
    the opening `{`. Walks braces explicitly so nested blocks parse cleanly."""
    depth = 1
    i = open_index
    while i < len(text) and depth > 0:
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
        i += 1
    return text[open_index : i - 1]


def _set_log_level_action_lambda() -> str:
    """Return the (comment-stripped) lambda body of the `epp_set_log_level`
    API action, which holds the category → tag mapping."""
    doc = load_variant(WIFI_VARIANT_YAML)
    actions = (doc.get("api") or {}).get("actions") or []
    action = next(
        (a for a in actions if isinstance(a, dict) and a.get("action") == "epp_set_log_level"),
        None,
    )
    assert action is not None, "epp_set_log_level action must exist on the api: block"

    lambda_body: str | None = None
    for step in action.get("then", []):
        if isinstance(step, dict) and isinstance(step.get("lambda"), str):
            lambda_body = step["lambda"]
            break
    assert lambda_body is not None, "epp_set_log_level must contain a lambda step holding the category mapping"
    return _strip_comments(lambda_body)


def _category_set_log_level_calls(category: str) -> set[str]:
    """Return the tag names whose log level the `category == "<category>"`
    branch sets."""
    body = _set_log_level_action_lambda()
    match = re.search(rf'category\s*==\s*"{re.escape(category)}"\s*\)\s*\{{', body)
    assert match is not None, f'must have a `category == "{category}"` branch'
    branch = _balanced_block(body, match.end())
    return set(re.findall(r'logger\.set_log_level\(\s*"([^"]+)"\s*,', branch))


def _mapping_categories() -> set[str]:
    """Every category the `epp_set_log_level` action branches on.

    Discovered from the firmware itself (`category == "<name>"`), so a new
    category added to the mapping is picked up automatically — the
    boot-pin invariant below then enforces coverage for it too, instead of
    silently ignoring it because a hardcoded list wasn't updated."""
    body = _set_log_level_action_lambda()
    return set(re.findall(r'category\s*==\s*"([^"]+)"', body))


def _all_per_tag_category_tags() -> set[str]:
    """Union of every tag set by any per-tag category branch.

    Categories are discovered from the firmware mapping (everything except
    `system`, which sets the global default level rather than a per-tag
    override) so the boot-pin invariant covers every per-tag category that
    exists, not just a hardcoded subset."""
    tags: set[str] = set()
    for category in _mapping_categories() - {"system"}:
        tags |= _category_set_log_level_calls(category)
    return tags


def _on_boot_pinned_tags() -> set[str]:
    """Return the tag names the boot sequence pins to `ESPHOME_LOG_LEVEL_NONE`.

    Scans every `on_boot` lambda and recognises two equivalent forms of
    pinning a tag, so the firmware is free to use whichever reads best:

    1. A direct call: `set_log_level("<tag>", ESPHOME_LOG_LEVEL_NONE)`.
    2. A range-`for` over a brace-enclosed list of tag literals whose body
       pins the loop variable to NONE:
       `for (const char *tag : {"a", "b", ...}) set_log_level(tag, ...NONE);`
       — here every literal in the initializer list counts as pinned.
    """
    doc = load_variant(WIFI_VARIANT_YAML)
    on_boot = (doc.get("esphome") or {}).get("on_boot") or []
    if isinstance(on_boot, dict):
        on_boot = [on_boot]

    pinned: set[str] = set()
    for hook in on_boot:
        for step in hook.get("then", []):
            if not (isinstance(step, dict) and isinstance(step.get("lambda"), str)):
                continue
            body = _strip_comments(step["lambda"])

            # Form 1: direct `set_log_level("tag", ...NONE)` calls.
            pinned |= set(
                re.findall(
                    r'set_log_level\(\s*"([^"]+)"\s*,\s*ESPHOME_LOG_LEVEL_NONE\s*\)',
                    body,
                )
            )

            # Form 2: a range-for over `{...}` that pins its loop variable
            # to NONE. Match the loop header (capturing the braced list),
            # then require a `set_log_level(<var>, ...NONE)` to follow. The
            # loop body may be a single statement or a `{ ... }` block;
            # either way the pin appears shortly after the header.
            for m in re.finditer(r":\s*\{([^}]*)\}\s*\)", body):
                list_body = m.group(1)
                tail = body[m.end() :]
                if re.search(
                    r"set_log_level\(\s*\w+\s*,\s*ESPHOME_LOG_LEVEL_NONE\s*\)",
                    tail,
                ):
                    pinned |= set(re.findall(r'"([^"]+)"', list_body))

    return pinned


def test_ble_log_category_includes_tracker_and_proxy() -> None:
    """The `ble` log category must enable scan-result and proxy-event tags.

    Without `esp32_ble_tracker`, the user can't see whether the scan is
    actually running. Without `bluetooth_proxy`, they can't see proxy
    connection / disconnection events.
    """
    tags = _category_set_log_level_calls("ble")
    assert "esp32_ble_tracker" in tags, (
        "BLE log category must enable esp32_ble_tracker so scan results "
        f"(`Found device ...`) appear in debug logs. Found tags: {sorted(tags)}"
    )
    assert "bluetooth_proxy" in tags, (
        "BLE log category must enable bluetooth_proxy so proxy connection "
        f"events appear in debug logs. Found tags: {sorted(tags)}"
    )


def test_epp_log_category_owns_entity_state_tags() -> None:
    """The `epp` (zone engine) category must drive the entity-state tags.

    The zone/target/motion entity states (`'Zone 5 Target Count'`,
    `'Target 1 Position'`, `'Motion Presence'`) are emitted under
    ESPHome's shared framework tags `sensor`, `text_sensor`, and
    `binary_sensor` — not under the `epp` tag. They belong to the zone
    engine conceptually, so enabling the `epp` category must surface them
    (and, via the boot pins below, enabling only `system` must NOT).
    """
    tags = _category_set_log_level_calls("epp")
    for required in ("epp", "sensor", "text_sensor", "binary_sensor"):
        assert required in tags, (
            f"epp log category must enable the `{required}` tag so zone/target "
            f"entity states group with the zone engine. Found tags: {sorted(tags)}"
        )


def test_boot_pins_every_per_tag_category_tag_to_none() -> None:
    """Boot must pin every per-tag category tag to NONE.

    `system` raises the global default level, which ESPHome uses as the
    fallback for any tag without an explicit override. If a category tag
    isn't pinned on boot, turning `system` to Debug leaks that category's
    logs. So the set of boot-pinned tags must cover every tag any per-tag
    category can set — otherwise `system` is once again a "log everything"
    master switch.
    """
    category_tags = _all_per_tag_category_tags()
    pinned = _on_boot_pinned_tags()
    missing = category_tags - pinned
    assert not missing, (
        "These category tags are not pinned to NONE on boot, so raising the "
        f"`system` (global) level will leak them: {sorted(missing)}"
    )


def test_mapping_categories_match_the_known_set() -> None:
    """The firmware's category set must stay the documented known set.

    `_all_per_tag_category_tags()` discovers categories from the mapping,
    so a newly added category is automatically enforced by the boot-pin
    test above. This test is the matching tripwire for the other
    direction: if a category is added, removed, or renamed in the
    firmware, fail loudly so the maintainer revisits `PER_TAG_CATEGORIES`,
    the docs, and the panel UI instead of silently drifting.
    """
    expected = {"system", *PER_TAG_CATEGORIES}
    actual = _mapping_categories()
    assert actual == expected, (
        "epp_set_log_level categories changed. Update PER_TAG_CATEGORIES (and "
        "the boot pins, docs, and panel UI) to match.\n"
        f"  added:   {sorted(actual - expected)}\n"
        f"  removed: {sorted(expected - actual)}"
    )
