"""Verify every translation_key used in code exists in strings.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

COMPONENT_DIR = Path(__file__).parent.parent / "custom_components" / "eppgrid"

# Every shipped locale catalogue except the English source of truth, discovered
# at collection time so a new translations/<locale>.json is covered with no new
# test code.
_LOCALE_FILES = sorted(p for p in (COMPONENT_DIR / "translations").glob("*.json") if p.stem != "en")


def _load_strings() -> dict:
    with (COMPONENT_DIR / "strings.json").open(encoding="utf-8") as f:
        return json.load(f)


def _flatten_keys(obj, prefix: str = "") -> set[str]:
    """Flatten a nested translation dict into a set of dotted leaf-key paths."""
    keys: set[str] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.update(_flatten_keys(v, path))
            else:
                keys.add(path)
    return keys


def _find_used_translation_keys() -> set[str]:
    """Extract translation_key="..." literals from .py files in the component."""
    keys: set[str] = set()
    pattern = re.compile(r'translation_key\s*=\s*["\']([^"\']+)["\']')
    for py in COMPONENT_DIR.glob("*.py"):
        for match in pattern.finditer(py.read_text(encoding="utf-8")):
            keys.add(match.group(1))
    return keys


def test_all_exception_keys_resolve():
    """Every translation_key referenced in code must exist under `exceptions` in strings.json."""
    strings = _load_strings()
    available = set(strings.get("exceptions", {}).keys())
    used = _find_used_translation_keys()
    missing = used - available
    assert not missing, (
        f"Referenced translation keys not found under 'exceptions' in strings.json: {missing}. "
        f"Add them to custom_components/eppgrid/strings.json or fix the key reference in code."
    )


def test_locale_translation_files_discovered():
    """Guard the parametrized parity test below from silently skipping.

    An empty `_LOCALE_FILES` would make `parametrize` yield zero cases (a SKIP,
    not a failure), so a vanished/renamed locale dir would pass unnoticed.
    """
    assert _LOCALE_FILES, "no translations/<locale>.json discovered"


@pytest.mark.parametrize("locale_path", _LOCALE_FILES, ids=lambda p: p.stem)
def test_locale_translation_keys_match_english(locale_path):
    """Every custom_components/eppgrid/translations/<locale>.json must have the same keys as en.json."""
    base = COMPONENT_DIR / "translations"
    en_keys = _flatten_keys(json.loads((base / "en.json").read_text(encoding="utf-8")))
    locale_keys = _flatten_keys(json.loads(locale_path.read_text(encoding="utf-8")))
    missing = en_keys - locale_keys
    extra = locale_keys - en_keys
    assert not missing, f"{locale_path.name} translation missing keys: {sorted(missing)}"
    assert not extra, f"{locale_path.name} translation has extra keys: {sorted(extra)}"


def test_zone_name_translations_have_required_keys():
    """zone_name_translations.ZONE_NAMES must define all 4 required keys per language."""
    from custom_components.eppgrid.zone_name_translations import ZONE_NAMES

    required = {
        "zone_rest_of_room",
        "zone_with_name",
        "zone_rest_of_room_target_count",
        "zone_with_name_target_count",
    }
    assert "en" in ZONE_NAMES, "English zone names must be defined as the fallback"
    for lang, table in ZONE_NAMES.items():
        missing = required - set(table.keys())
        assert not missing, f"Language '{lang}' missing zone name keys: {missing}"
