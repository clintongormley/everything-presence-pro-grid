#!/usr/bin/env bash
# Print the CHANGES.md section for a given version, for use as a GitHub release
# body. The firmware-release workflow uses this so a release's notes are the
# curated, user-facing changelog entry instead of an auto-generated commit list.
#
# Usage: extract-release-notes.sh <version>      e.g. 1.2.1
#        CHANGES_FILE=path/to/CHANGES.md extract-release-notes.sh <version>
#
# Prints the section body (heading and surrounding blank lines stripped) and
# exits 0 when the first `## v<version>` section has something in it. The version
# must be followed by a space, a tab or the end of the line. Exits 1 with no output
# otherwise (e.g. a pre-release tag with no changelog entry), so the caller can
# fall back to GitHub's generated notes.

set -euo pipefail

VERSION="${1:?usage: $0 <version>}"
CHANGES="${CHANGES_FILE:-CHANGES.md}"

if [ ! -f "$CHANGES" ]; then
  echo "error: changelog not found: $CHANGES" >&2
  exit 2
fi

# Escape regex metacharacters in the version so dots match literally (so
# `1.2.1` can't match `1x2x1`). The version must be followed by a space, a tab
# or the end of the line, so it can't match a longer heading (`1.2` vs `1.2.1`,
# `1.2.1` vs `1.2.10`, `1.2.1` vs `1.2.1-rc.1`). The tab is spelled out because
# older versions of mawk, Ubuntu's default awk, have no POSIX character classes.
ver_re="$(printf '%s' "$VERSION" | sed 's/[.[\*^$]/\\&/g')"

# Passed through the environment because `awk -v` strips the backslashes.
section="$(
  VER_RE="$ver_re" awk '
    found && /^## / { exit }                                       # next `## ` heading: stop
    $0 ~ "^## v" ENVIRON["VER_RE"] "([ \t]|$)" { found = 1; next } # our heading: start, drop it
    found { print }
  ' "$CHANGES"
)"

# Strip leading blank lines (the blank after the heading). Command
# substitution already trims trailing newlines, so the blank before the next
# heading is gone too.
section="$(printf '%s\n' "$section" | sed -e '/./,$!d')"

if [ -z "$section" ]; then
  exit 1
fi

printf '%s\n' "$section"
