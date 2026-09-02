#!/usr/bin/env python3
"""Verify the firmware OTA manifests published to GitHub Pages are live.

Run after the Pages deploy in .github/workflows/pages.yml. The panel's OTA
button fetches ``fw/v{FIRMWARE_VERSION}/{variant}.json`` (Path B) and ESPHome's
native update reads ``fw/latest/{variant}.json``. A Pages deploy can report
success while the CDN still serves a 404 (deploy never propagated) or a stale
manifest (old version cached), silently shipping a broken OTA that a user only
discovers when their upgrade fails.

This polls those exact URLs after deploy — requiring HTTP 200, valid JSON, and
the expected ``version`` — retrying to ride out CDN propagation, and exits
non-zero (failing the Pages run) if any manifest is not live+current in time.
The version check also catches Fastly serving a stale manifest, not just 404s.

Usage:
    verify_deployed_firmware.py --base-url URL --version PINNED \\
        [--latest-version LATEST] [--variants a,b] \\
        [--timeout SECONDS] [--interval SECONDS]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from urllib.error import HTTPError
from urllib.request import urlopen

# Kept in sync with .github/scripts/stage-firmware.sh's VARIANTS — the manifest
# filenames it publishes are {variant}.json.
VARIANTS = ("wifi-ble-co2", "ethernet-ble-co2", "wifi-lite-co2")

# GitHub Pages serves these manifests with `cache-control: max-age=600`, so an
# edge that cached the *previous* release's fw/latest manifest can keep serving
# it for up to 600s after the deploy. The default grace period must outlast that
# TTL, or a perfectly good deploy fails the release run: v1.6.0 polled for 300s,
# reported the stale 1.5.1, and failed while the deploy itself was fine.
PAGES_CDN_MAX_AGE_SECONDS = 600
DEFAULT_TIMEOUT_SECONDS = PAGES_CDN_MAX_AGE_SECONDS + 300  # TTL + propagation margin

Fetch = Callable[[str], "tuple[int, str]"]


@dataclass(frozen=True)
class Manifest:
    """One published manifest URL and the version it must report."""

    url: str
    expected_version: str


def expected_manifests(
    base_url: str,
    version: str,
    latest_version: str | None,
    variants: list[str],
) -> list[Manifest]:
    """The manifests a deploy should publish for ``version`` (and, if given,
    the ``fw/latest`` mirror at ``latest_version``)."""
    base = base_url.rstrip("/")
    manifests = [Manifest(f"{base}/fw/v{version}/{v}.json", version) for v in variants]
    if latest_version:
        manifests += [Manifest(f"{base}/fw/latest/{v}.json", latest_version) for v in variants]
    return manifests


def check_once(fetch: Fetch, manifest: Manifest) -> str | None:
    """Fetch ``manifest`` once. Return None if it's live+current, else a reason."""
    try:
        status, body = fetch(manifest.url)
    except Exception as err:
        return f"fetch error: {err}"
    if status != 200:
        return f"HTTP {status}"
    try:
        got = json.loads(body).get("version")
    except (ValueError, AttributeError):
        return "invalid JSON (not a manifest yet — likely a 404 page)"
    if got != manifest.expected_version:
        return f"version {got!r} != expected {manifest.expected_version!r} (stale?)"
    return None


def verify(
    manifests: list[Manifest],
    fetch: Fetch,
    sleep: Callable[[float], None],
    monotonic: Callable[[], float],
    timeout: float,
    interval: float,
) -> tuple[bool, dict[str, str]]:
    """Poll every manifest until all are live+current or ``timeout`` elapses.

    Returns ``(ok, failures)`` where ``failures`` maps each still-failing URL to
    its last reason. Only unmet manifests are re-polled; already-met ones drop
    out. Never sleeps once everything is met.
    """
    deadline = monotonic() + timeout
    pending = list(manifests)
    failures: dict[str, str] = {}
    while True:
        still_pending = []
        for manifest in pending:
            reason = check_once(fetch, manifest)
            if reason is None:
                failures.pop(manifest.url, None)
            else:
                failures[manifest.url] = reason
                still_pending.append(manifest)
        pending = still_pending
        if not pending:
            return True, {}
        if monotonic() >= deadline:
            return False, failures
        sleep(interval)


def _real_fetch(url: str) -> tuple[int, str]:
    try:
        with urlopen(url, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except HTTPError as err:
        return err.code, ""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify deployed firmware OTA manifests.")
    parser.add_argument("--base-url", required=True, help="Deployed Pages base URL")
    parser.add_argument("--version", required=True, help="Pinned FIRMWARE_VERSION (fw/v{version}/)")
    parser.add_argument("--latest-version", default="", help="Version behind fw/latest/ (optional)")
    parser.add_argument("--variants", default=",".join(VARIANTS), help="Comma-separated variants")
    parser.add_argument(
        "--timeout",
        type=float,
        default=float(DEFAULT_TIMEOUT_SECONDS),
        help="Total grace period (s); must outlast the Pages CDN max-age",
    )
    parser.add_argument("--interval", type=float, default=15.0, help="Poll interval (s)")
    args = parser.parse_args(argv)

    variants = [v for v in args.variants.split(",") if v]
    manifests = expected_manifests(args.base_url, args.version, args.latest_version or None, variants)
    for manifest in manifests:
        print(f"verifying {manifest.url} (expect version {manifest.expected_version})")

    ok, failures = verify(manifests, _real_fetch, time.sleep, time.monotonic, args.timeout, args.interval)
    if ok:
        print(f"OK: all {len(manifests)} firmware manifest(s) are live and current.")
        return 0
    for url, reason in failures.items():
        print(f"::error::firmware manifest not correctly deployed: {url} — {reason}")
    print(
        f"::error::{len(failures)} firmware manifest(s) not reachable/current after "
        f"{args.timeout:.0f}s. Re-run the Deploy GitHub Pages workflow to redeploy "
        f"and purge the CDN, then re-check."
    )
    return 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
