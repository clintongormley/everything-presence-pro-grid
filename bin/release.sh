#!/usr/bin/env bash
# Prepares a release PR: bumps version files and opens a PR.
#
# Usage: bin/release.sh <version>
#
# Example: bin/release.sh 0.93.0
#          bin/release.sh 0.93.0-alpha.1
#
# After the PR merges, push the v<version> tag to trigger the firmware
# release workflow. That workflow publishes the release as a PRE-RELEASE
# (never auto-marked "latest"). Once tested, promote it with
# `bin/promote.sh <version>`.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <version>" >&2
  exit 2
fi

VERSION="$1"

# Semver validation is shared with bin/bump-version.sh (single source of truth).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/bump-version.sh" --validate "$VERSION"

# Must be on main.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "✗ must be on main (currently on $CURRENT_BRANCH)" >&2
  exit 1
fi

# Working tree must be clean.
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ working tree is not clean; commit or stash first" >&2
  exit 1
fi

# Tag must not exist locally or on origin.
TAG="v$VERSION"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "✗ tag $TAG already exists locally" >&2
  exit 1
fi

HAS_ORIGIN=false
if git remote get-url origin >/dev/null 2>&1; then
  HAS_ORIGIN=true
fi

# When origin is configured, the remote duplicate-tag check must actually
# run: an ls-remote failure (offline, auth) silently skipping the guard
# could let a duplicate tag through.
if [ "$HAS_ORIGIN" = "true" ]; then
  if ! REMOTE_TAGS=$(git ls-remote --tags origin); then
    echo "✗ git ls-remote --tags origin failed; cannot verify $TAG is unused on origin" >&2
    echo "  check network/auth and retry" >&2
    exit 1
  fi
  if grep -q "refs/tags/$TAG\$" <<<"$REMOTE_TAGS"; then
    echo "✗ tag $TAG already exists on origin" >&2
    exit 1
  fi
fi

# Local main must be up to date with origin/main.
if [ "$HAS_ORIGIN" = "true" ]; then
  git fetch -q origin main
  LOCAL=$(git rev-parse main)
  REMOTE=$(git rev-parse origin/main)
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "✗ local main is not up to date with origin/main" >&2
    echo "  local:  $LOCAL" >&2
    echo "  origin: $REMOTE" >&2
    exit 1
  fi
fi

# Optional --no-push flag for tests.
NO_PUSH=false
if [ "${2:-}" = "--no-push" ]; then
  NO_PUSH=true
fi

# Detect firmware changes since last tag.
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null) || {
  echo "✗ no tags found; cannot determine previous release for firmware-change detection" >&2
  exit 1
}
FIRMWARE_DIFF=$(git diff "$PREV_TAG..HEAD" -- firmware/ || true)
if [ -n "$FIRMWARE_DIFF" ]; then
  FIRMWARE_CHANGED=true
else
  FIRMWARE_CHANGED=false
fi

# The current firmware version, for the PR body of an integration-only
# release. NOT the same thing as the previous git tag — the integration
# version (tags) and FIRMWARE_VERSION drift apart on integration-only
# releases (e.g. tag v1.0.4 with firmware still at 1.0.0).
FW_VERSION=$(sed -n 's/^FIRMWARE_VERSION = "\([^"]*\)".*/\1/p' custom_components/eppgrid/const.py)
if [ -z "$FW_VERSION" ]; then
  echo "✗ could not read FIRMWARE_VERSION from custom_components/eppgrid/const.py" >&2
  exit 1
fi

BRANCH="release-$TAG"
PUSHED=false
BRANCH_CREATED=false

# From the moment the release branch exists, a failure must not strand the
# repo on a half-prepared branch (the on-main / clean-tree pre-flights would
# then block a rerun). On failure before the push: return to main and drop
# the local branch. On failure after the push (gh pr create): keep the
# branch — it's the recovery artifact — and print explicit recovery steps.
cleanup_on_failure() {
  local status=$?
  [ "$status" -eq 0 ] && return 0
  if [ "$PUSHED" = "true" ]; then
    {
      echo "✗ branch $BRANCH was pushed, but creating the PR failed."
      echo "  Do NOT rerun bin/release.sh: it requires main + a clean tree, and the"
      echo "  release branch already exists locally and on origin."
      echo "  Recover by creating the PR manually:"
      echo "    gh pr create --head $BRANCH --title \"chore: release $TAG\" --fill"
      echo "  Or discard the release branch and start over:"
      echo "    git checkout main"
      echo "    git branch -D $BRANCH"
      echo "    git push origin --delete $BRANCH"
    } >&2
    return 0
  fi
  echo "✗ release preparation failed; returning to main" >&2
  git checkout -qf main || true
  if [ "$BRANCH_CREATED" = "true" ]; then
    echo "  deleting $BRANCH" >&2
    git branch -qD "$BRANCH" 2>/dev/null || true
  fi
}
trap cleanup_on_failure EXIT

git checkout -q -b "$BRANCH"
BRANCH_CREATED=true

# Always bump manifest.json version (delegated to bump-version.sh, the single
# owner of the manifest edit and its non-greedy sed pattern).
"$SCRIPT_DIR/bump-version.sh" "$VERSION"

if [ "$FIRMWARE_CHANGED" = "true" ]; then
  # Bump FIRMWARE_VERSION in const.py.
  sed -i.bak "s/^FIRMWARE_VERSION = \".*\"/FIRMWARE_VERSION = \"$VERSION\"/" custom_components/eppgrid/const.py
  rm -f custom_components/eppgrid/const.py.bak
  grep -q "^FIRMWARE_VERSION = \"$VERSION\"" custom_components/eppgrid/const.py

  # Bump version in the shared firmware core. Both models take their
  # esphome.project.version from here, so this is the only place to bump.
  sed -i.bak "s/^    version: \".*\"/    version: \"$VERSION\"/" firmware/common/epp-core.yaml
  rm -f firmware/common/epp-core.yaml.bak
  grep -q "^    version: \"$VERSION\"" firmware/common/epp-core.yaml

  # epp_component.h derives FIRMWARE_VERSION_STR from the ESPHOME_PROJECT_VERSION
  # macro (ESPHome populates it from esphome.project.version at compile time),
  # so there is no hardcoded version literal in the header to bump.
fi

git add -A
# --allow-empty supports the "version bumped in an earlier feature commit"
# workflow: when manifest/const/yaml are already at $VERSION on main, the
# release branch still gets a clear `chore: release v$VERSION` marker commit.
git commit --allow-empty -qm "chore: release $TAG

$(if [ "$FIRMWARE_CHANGED" = "true" ]; then echo "Firmware-changing release: bumped firmware versions to $VERSION."; else echo "Integration-only release: firmware version unchanged."; fi)"

if [ "$NO_PUSH" = "true" ]; then
  echo "Branch $BRANCH prepared. --no-push given; skipping push and PR creation."
  exit 0
fi

# Push the release branch.
git push -u origin "$BRANCH"
PUSHED=true

# Open the PR.
if [ "$FIRMWARE_CHANGED" = "true" ]; then
  BODY="Firmware-changing release: firmware version bumped to \`$VERSION\`."
else
  BODY="Integration-only release: firmware version unchanged at \`$FW_VERSION\`."
fi

gh pr create \
  --title "chore: release $TAG" \
  --body "$BODY

After merge, push the tag to trigger the firmware-release workflow:

\`\`\`
git tag $TAG
git push origin $TAG
\`\`\`

The release is published as a **pre-release** (never auto-marked latest).
Once you've tested it, promote it to the latest full release:

\`\`\`
bin/promote.sh $VERSION
\`\`\`
"

echo "Release $TAG branch pushed and PR opened."
