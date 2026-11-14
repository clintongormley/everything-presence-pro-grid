#!/usr/bin/env python3
"""Print the pinned firmware versions the Pages deploy must publish, one per line.

The panel's update tab downloads fw/v{FIRMWARE_VERSION}/ from GitHub Pages,
and every deploy rebuilds the site from scratch, so each FIRMWARE_VERSION an
installed integration can ask for has to be published on every deploy:

- main's, for a pre-release being tested;
- the latest stable release's, read from const.py at its tag. A release that
  did not change the firmware keeps the previous version (tag v1.10.0 pins
  1.9.0), so this is not always the tag's own version.

A version equal to the latest tag's is left out: the latest-release pass
already publishes it. An unreadable pin is skipped with a warning on
stderr, so a bad const.py never stops the docs and fw/latest from deploying.

Run from the repository root:

    firmware_versions_to_publish.py --latest-tag v1.10.0
"""

import argparse
import re
import subprocess
import sys

CONST = "custom_components/eppgrid/const.py"
# Same line format as the parsers in bin/release.sh and
# .github/scripts/validate-release.sh.
PIN = re.compile(r'^FIRMWARE_VERSION\s*=\s*"([^"]*)"', re.MULTILINE)


def _pin(ref: str) -> str | None:
    """FIRMWARE_VERSION in const.py at `ref` (a tag), or in the checkout when empty."""
    try:
        if ref:
            source = subprocess.run(
                ["git", "show", f"{ref}:{CONST}"], check=True, capture_output=True, text=True
            ).stdout
        else:
            with open(CONST) as f:
                source = f.read()
    except (OSError, subprocess.CalledProcessError):
        return None
    match = PIN.search(source)
    return match.group(1) if match and match.group(1) else None


def versions_to_publish(latest_tag: str) -> list[str]:
    candidates = [("main", "")]
    if latest_tag:
        candidates.append((latest_tag, latest_tag))
    versions: list[str] = []
    for label, ref in candidates:
        version = _pin(ref)
        if version is None:
            print(
                f"::warning::Could not read FIRMWARE_VERSION from {CONST} at {label}; not publishing its pin",
                file=sys.stderr,
            )
            continue
        if f"v{version}" != latest_tag and version not in versions:
            versions.append(version)
    return versions


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--latest-tag", default="", help="Tag of the latest stable release, e.g. v1.10.0 (empty if none)"
    )
    args = parser.parse_args(argv)
    for version in versions_to_publish(args.latest_tag):
        print(version)
    return 0


if __name__ == "__main__":
    sys.exit(main())
