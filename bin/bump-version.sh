#!/usr/bin/env bash
# Bumps the integration version in the HA/HACS manifest, verified.
#
# This script touches ONLY custom_components/eppgrid/manifest.json — the
# HACS/HA version of record. It deliberately does NOT touch
# custom_components/eppgrid/const.py (FIRMWARE_VERSION) or any firmware YAML:
# those are an independent firmware version that only changes when firmware
# changes.
#
# Used by .github/workflows/post-release-bump.yml to roll main forward to the
# next minor after a release is promoted. Also called by bin/release.sh for
# the manifest version bump — bump-version.sh is the single owner of that edit.
#
# Usage: bin/bump-version.sh <version>             bump manifest to <version>
#        bin/bump-version.sh --validate <version>  semver-check only, no writes
#
# Operates on the current working directory's repo (relative paths), so callers
# must invoke it from the repo root.
#
# The write is verified; an edit that fails to land is a hard error rather than
# a silently stale version.

set -euo pipefail

SEMVER_RE='^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?$'

validate() {
  local v="${1:-}"
  if ! [[ "$v" =~ $SEMVER_RE ]]; then
    echo "error: not a valid semver version: $v" >&2
    echo "expected format: MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-(alpha|beta|rc).N" >&2
    exit 1
  fi
}

require_file() {
  if [ ! -f "$1" ]; then
    echo "error: expected version file not found: $1" >&2
    exit 1
  fi
}

if [ "${1:-}" = "--validate" ]; then
  validate "${2:-}"
  exit 0
fi

if [ $# -lt 1 ]; then
  echo "usage: $0 <version> | --validate <version>" >&2
  exit 2
fi

VERSION="$1"
validate "$VERSION"

MANIFEST="custom_components/eppgrid/manifest.json"
require_file "$MANIFEST"

# manifest.json carries the version exactly once. Use sed (not a JSON
# reserialiser) so the manifest's required key order is preserved.
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$MANIFEST"
rm -f "$MANIFEST.bak"
grep -q "\"version\": \"$VERSION\"" "$MANIFEST" \
  || { echo "error: failed to bump version in $MANIFEST" >&2; exit 1; }
