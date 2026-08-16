"""Shared YAML loader and lookup helpers for ESPHome firmware tests.

ESPHome's YAML uses custom tags (!lambda, !include, !secret, !extend, ...)
that PyYAML's SafeLoader rejects. Tests that just need to inspect structural
fields don't care about the lambda contents — this loader treats every
custom tag as an opaque scalar / sequence / mapping so the file parses.

The firmware YAML never changes during a test run, so `load_yaml` is cached:
without it, each `find_*` call re-reads and re-parses the whole file.

A variant's config is assembled from several packages (`epp-core.yaml` and
`epp-entities.yaml` hold everything both models share; the per-model base holds
that board's hardware). A test that reads one of those files alone can only see
whichever half the content happens to live in today, and would break the next
time a block moves between them. `load_variant` resolves the `packages:` block
and merges it the way ESPHome does, so tests assert against the config the
device is actually built from.
"""

from copy import deepcopy
from functools import cache
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
BASE_YAML = REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml"
LITE_BASE_YAML = REPO_ROOT / "firmware" / "common" / "everything-presence-lite-base.yaml"
CORE_YAML = REPO_ROOT / "firmware" / "common" / "epp-core.yaml"
WIFI_VARIANT_YAML = REPO_ROOT / "firmware" / "variants" / "wifi-ble-co2.yaml"
ETHERNET_VARIANT_YAML = REPO_ROOT / "firmware" / "variants" / "ethernet-ble-co2.yaml"
LITE_VARIANT_YAML = REPO_ROOT / "firmware" / "variants" / "wifi-ble-lite.yaml"
LITE_CO2_VARIANT_YAML = REPO_ROOT / "firmware" / "variants" / "wifi-ble-lite-co2.yaml"


class ESPHomeLoader(yaml.SafeLoader):
    """SafeLoader that treats ESPHome custom tags as opaque values."""


def _esphome_tag_passthrough(loader, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node, deep=True)
    return loader.construct_mapping(node, deep=True)


ESPHomeLoader.add_constructor(None, _esphome_tag_passthrough)


@cache
def load_yaml(path: Path) -> dict:
    """Parse an ESPHome YAML file, treating custom tags as opaque.

    TREAT THE RESULT AS READ-ONLY. It is cached, so every caller in the run shares
    one dict: a test that mutates it to set up a negative case would silently
    change what every later test sees. Copy it first if you need to modify it.
    """
    return yaml.load(path.read_text(), Loader=ESPHomeLoader)


def _merge(base: dict, incoming: dict) -> dict:
    """Merge `incoming` into `base` the way ESPHome merges packages.

    Mappings merge key by key; lists concatenate (which is what makes
    `api.actions` from several packages add up, and what keeps an automation's
    `then:` steps in package order); anything else is replaced.
    """
    for key, value in incoming.items():
        current = base.get(key)
        if isinstance(current, dict) and isinstance(value, dict):
            _merge(current, value)
        elif isinstance(current, list) and isinstance(value, list):
            current.extend(value)
        else:
            base[key] = value
    return base


@cache
def load_variant(path: Path) -> dict:
    """Load a variant YAML with its `packages:` resolved and merged.

    Packages are merged in declaration order, then the variant's own keys are
    merged on top — ESPHome's own precedence. Includes are resolved relative to
    the including file, and nested `packages:` blocks are resolved recursively.

    TREAT THE RESULT AS READ-ONLY: it is cached and shared across callers.
    """
    # Deep-copy every source: `load_yaml` is cached, and `_merge` mutates the
    # dicts and lists it merges into. Without the copy the first merge would
    # splice one package's `api.actions` onto the cached copy every later
    # caller sees.
    doc = deepcopy(load_yaml(path))
    packages = doc.pop("packages", None) or {}
    merged: dict = {}
    for include in packages.values():
        # `!include ../common/x.yaml` comes through ESPHomeLoader as the path string.
        if not isinstance(include, str):
            continue
        _merge(merged, deepcopy(load_variant((path.parent / include).resolve())))
    return _merge(merged, doc)


def find_by_id(entries: list | None, entry_id: str) -> dict | None:
    """First entry in an ESPHome platform list with the given `id`."""
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("id") == entry_id:
            return entry
    return None


def find_by_platform(entries: list | None, platform: str) -> dict | None:
    """First entry in an ESPHome platform list with the given `platform`."""
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("platform") == platform:
            return entry
    return None
