#!/usr/bin/env bash
# Promotes a pre-release to the latest full release.
#
# Usage: bin/promote.sh <version> [--force]
#
# Example: bin/promote.sh 1.0.4
#
# firmware-release.yml publishes EVERY release as a pre-release (never the
# GitHub "latest"). Once you've tested the firmware/integration, run this to
# flip the release to a full, latest release — which also re-fires pages.yml
# to stage fw/latest/ from it. Idempotent: re-running on an already-promoted
# release is a no-op.
#
# Pre-release versions (-alpha/-beta/-rc) are refused unless --force is given:
# promoting marks the release GitHub "latest" and re-stages fw/latest/, the
# auto-update channel for every device.

set -euo pipefail

usage() {
  echo "usage: $0 <version> [--force]" >&2
  exit 2
}

if [ $# -lt 1 ]; then
  usage
fi

VERSION="$1"
shift
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) usage ;;
  esac
done

# Semver validation is shared with bin/bump-version.sh (single source of truth).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/bump-version.sh" --validate "$VERSION"

# The semver gate above only allows -alpha/-beta/-rc suffixes, so any dash
# means a pre-release version.
if [[ "$VERSION" == *-* ]] && [ "$FORCE" != "true" ]; then
  echo "✗ refusing to promote pre-release version $VERSION to the latest release" >&2
  echo "  Promotion marks it GitHub \"latest\" and re-stages fw/latest/ — the auto-update" >&2
  echo "  channel for every device. If you really mean it: $0 $VERSION --force" >&2
  exit 1
fi

TAG="v$VERSION"

# Confirm the release exists and learn its current state. Capture stderr (via
# 2>&1) so a gh failure surfaces its real cause instead of being silently
# misattributed to a missing release — the error could equally be auth,
# network, rate-limiting, or running outside the repo. On success gh writes
# only the bool to stdout, so VIEW holds "true"/"false".
if ! VIEW=$(gh release view "$TAG" --json isPrerelease --jq '.isPrerelease' 2>&1); then
  echo "error: could not read GitHub release $TAG:" >&2
  printf '  %s\n' "$VIEW" >&2
  echo "  (if it doesn't exist, has the tag been pushed and the firmware-release workflow finished?)" >&2
  exit 1
fi
PRERELEASE="$VIEW"

if [ "$PRERELEASE" != "true" ]; then
  echo "$TAG is already a full release; nothing to do."
  exit 0
fi

gh release edit "$TAG" --prerelease=false --latest=true
echo "Promoted $TAG to the latest full release."
