"""Rules for custom_components/eppgrid/manifest.json that the code cannot show."""

import json
from pathlib import Path

MANIFEST = Path(__file__).parent.parent / "custom_components/eppgrid/manifest.json"


def test_manifest_declares_hard_dependencies() -> None:
    """Setup hard-uses these HA components; declaring them guarantees load order."""
    manifest = json.loads(MANIFEST.read_text())
    assert manifest["dependencies"] == ["frontend", "http", "panel_custom", "repairs", "websocket_api"]


def test_loggers_names_the_device_library() -> None:
    """HA's per-integration log view and its Enable debug logging switch cover the libraries listed here."""
    manifest = json.loads(MANIFEST.read_text())
    assert manifest["loggers"] == ["aioesphomeapi"]


def test_keys_follow_the_order_hassfest_requires() -> None:
    """Domain and name come first, then the rest alphabetically."""
    keys = list(json.loads(MANIFEST.read_text()))
    assert keys[:2] == ["domain", "name"]
    assert keys[2:] == sorted(keys[2:])
