"""Tests for .github/scripts/verify_deployed_firmware.py.

The panel's OTA button (and ESPHome's native update) fetch
fw/v{version}/{variant}.json and fw/latest/{variant}.json from GitHub Pages.
A Pages deploy can report success while the CDN still serves a 404 or a
stale manifest, silently shipping a broken OTA. This script polls those URLs
after deploy and fails the run if any don't become live+current in time.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "verify_deployed_firmware.py"


def _load():
    spec = importlib.util.spec_from_file_location("verify_deployed_firmware", SCRIPT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    # Register before exec so dataclass annotation resolution (which looks the
    # module up in sys.modules) works for a file loaded outside the package.
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


vdf = _load()


class _Clock:
    """Fake monotonic clock; sleep advances it so polling loops don't wait."""

    def __init__(self) -> None:
        self.t = 0.0
        self.slept: list[float] = []

    def monotonic(self) -> float:
        return self.t

    def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.t += seconds


def _manifest_json(version: str) -> str:
    return f'{{"name": "x", "version": "{version}", "builds": []}}'


# --- expected_manifests ---------------------------------------------------


def test_expected_manifests_pinned_only():
    ms = vdf.expected_manifests("https://x.io/eppgrid", "1.5.0", None, ["wifi-ble-co2", "ethernet-ble-co2"])
    assert [(m.url, m.expected_version) for m in ms] == [
        ("https://x.io/eppgrid/fw/v1.5.0/wifi-ble-co2.json", "1.5.0"),
        ("https://x.io/eppgrid/fw/v1.5.0/ethernet-ble-co2.json", "1.5.0"),
    ]


def test_expected_manifests_includes_latest_when_given():
    ms = vdf.expected_manifests("https://x.io/eppgrid/", "1.5.0", "1.2.3", ["wifi-ble-co2"])
    # Trailing slash on the base URL is normalised; fw/latest carries the
    # latest release's version, not the pinned one.
    assert [(m.url, m.expected_version) for m in ms] == [
        ("https://x.io/eppgrid/fw/v1.5.0/wifi-ble-co2.json", "1.5.0"),
        ("https://x.io/eppgrid/fw/latest/wifi-ble-co2.json", "1.2.3"),
    ]


def test_latest_channel_uses_its_own_variant_subset():
    # A variant only in the pinned pre-release (not yet in the promoted latest)
    # must be checked under fw/v{pinned}/ but NOT under fw/latest/ — otherwise
    # a variant newer than the stable channel 404s fw/latest forever.
    ms = vdf.expected_manifests(
        "https://x.io/eppgrid",
        "1.9.0-rc.3",
        "1.8.0",
        ["wifi-ble-co2", "wifi-lite-co2"],
        latest_variants=["wifi-ble-co2"],
    )
    assert [(m.url, m.expected_version) for m in ms] == [
        ("https://x.io/eppgrid/fw/v1.9.0-rc.3/wifi-ble-co2.json", "1.9.0-rc.3"),
        ("https://x.io/eppgrid/fw/v1.9.0-rc.3/wifi-lite-co2.json", "1.9.0-rc.3"),
        ("https://x.io/eppgrid/fw/latest/wifi-ble-co2.json", "1.8.0"),
    ]


# --- check_once -----------------------------------------------------------


def test_check_once_ok_when_200_and_version_matches():
    m = vdf.Manifest("u", "1.5.0")
    assert vdf.check_once(lambda url: (200, _manifest_json("1.5.0")), m) is None


def test_check_once_reports_non_200():
    m = vdf.Manifest("u", "1.5.0")
    assert "404" in vdf.check_once(lambda url: (404, ""), m)


def test_check_once_reports_version_mismatch():
    m = vdf.Manifest("u", "1.5.0")
    reason = vdf.check_once(lambda url: (200, _manifest_json("1.2.3")), m)
    assert "1.2.3" in reason and "1.5.0" in reason


def test_check_once_reports_invalid_json():
    m = vdf.Manifest("u", "1.5.0")
    assert "JSON" in vdf.check_once(lambda url: (200, "<html>404</html>"), m)


def test_check_once_reports_fetch_error():
    m = vdf.Manifest("u", "1.5.0")

    def _boom(url):
        raise OSError("connection refused")

    assert "connection refused" in vdf.check_once(_boom, m)


# --- verify (polling) -----------------------------------------------------


def test_verify_passes_immediately_when_all_live_without_sleeping():
    clock = _Clock()
    ms = [vdf.Manifest("a", "1.5.0"), vdf.Manifest("b", "1.5.0")]
    ok, failures = vdf.verify(
        ms,
        fetch=lambda url: (200, _manifest_json("1.5.0")),
        sleep=clock.sleep,
        monotonic=clock.monotonic,
        timeout=300,
        interval=15,
    )
    assert ok is True and failures == {}
    assert clock.slept == []  # no waiting when everything is already live


def test_verify_fails_after_timeout_when_never_live():
    clock = _Clock()
    ms = [vdf.Manifest("a", "1.5.0")]
    ok, failures = vdf.verify(
        ms,
        fetch=lambda url: (404, ""),
        sleep=clock.sleep,
        monotonic=clock.monotonic,
        timeout=1.0,
        interval=0.5,
    )
    assert ok is False
    assert "a" in failures and "404" in failures["a"]


def test_default_timeout_outlasts_the_pages_cdn_cache_ttl(monkeypatch):
    """The default grace period must be able to ride out a stale cached manifest.

    GitHub Pages serves these manifests with ``cache-control: max-age=600``, so
    an edge still holding the previous release's ``fw/latest`` manifest can keep
    serving it for up to 600s after a deploy. A default grace period shorter
    than that TTL can fail a release run whose deploy was actually fine — as it
    did for v1.6.0, where a 300s poll reported 1.5.1 and the manifests were
    correct on their own shortly after.
    """
    # 600 is the observed upstream max-age, asserted as an external fact rather
    # than read back from the module under test.
    pages_cdn_max_age = 600
    seen = {}

    def _fake_verify(manifests, fetch, sleep, monotonic, timeout, interval):
        seen["timeout"] = timeout
        return True, {}

    monkeypatch.setattr(vdf, "verify", _fake_verify)
    rc = vdf.main(["--base-url", "https://example.test", "--version", "1.6.0"])

    assert rc == 0
    assert seen["timeout"] > pages_cdn_max_age


def test_verify_succeeds_once_manifest_becomes_live():
    clock = _Clock()
    calls = {"n": 0}

    def _fetch(url):
        calls["n"] += 1
        # 404 for the first two polls, live on the third (CDN propagation).
        return (200, _manifest_json("1.5.0")) if calls["n"] >= 3 else (404, "")

    ok, failures = vdf.verify(
        [vdf.Manifest("a", "1.5.0")],
        fetch=_fetch,
        sleep=clock.sleep,
        monotonic=clock.monotonic,
        timeout=300,
        interval=15,
    )
    assert ok is True and failures == {}
    assert calls["n"] == 3
