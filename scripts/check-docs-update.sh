#!/usr/bin/env bash
# scripts/check-docs-update.sh
#
# Pre-push guard that nudges (or blocks) when changes touch doc-described
# surface area without a corresponding update to docs/developers/architecture.md
# or docs/developers/data-catalog.md.
#
# Behavior, given a diff range:
#  - No doc-described files in the diff           → silent pass.
#  - Only modifications (M) to doc-described      → soft warning, exit 0.
#  - Adds / deletes / renames (A/D/R/C) to        → block (exit 1) UNLESS:
#    doc-described paths                              · a doc was updated, or
#                                                     · any commit in the range
#                                                       carries a `Docs-skip:`
#                                                       trailer line.
#
# Usage:
#   scripts/check-docs-update.sh <diff-range>
#     e.g. origin/main..HEAD, HEAD~5..HEAD

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "usage: $0 <diff-range>" >&2
    exit 2
fi

RANGE="$1"

# Doc-described surface area. Each entry is an extended-regex matched against
# the full path from repo root.
DOC_DESCRIBED_PATHS=(
    '^custom_components/eppgrid/[^/]+\.py$'
    '^frontend/src/(eppgrid-panel|types|constants|styles|strategy|localize|panel-mount-guard|index)\.ts$'
    '^frontend/src/(lib|controllers|components)/[^/]+\.ts$'
    '^frontend/src/translations/[^/]+\.json$'
    '^firmware/lib/epp_zone_engine/include/[^/]+\.h$'
    '^firmware/variants/[^/]+\.yaml$'
    '^firmware/common/[^/]+\.yaml$'
    '^firmware/components/epp/[^/]+\.(cpp|h|py)$'
    '^\.github/workflows/[^/]+\.yml$'
)
DOC_PATTERN="$(IFS='|'; echo "${DOC_DESCRIBED_PATHS[*]}")"

DOC_FILES_PATTERN='^docs/developers/(architecture|data-catalog)\.md$'

# Get name-status diff with rename detection. Format:
#   "X<TAB>path"            for A/D/M/T
#   "Rnnn<TAB>old<TAB>new"  for renames (and similarly C for copies)
# A git-diff failure (bad range, missing ref) must fail the guard loudly —
# swallowing it would silently no-op the whole check.
if ! status_lines=$(git diff --name-status -M "$RANGE"); then
    echo "✗ git diff failed for range '$RANGE'; cannot check docs coverage." >&2
    exit 1
fi
[ -z "$status_lines" ] && exit 0

# Walk the diff. A path is doc-described if it matches DOC_PATTERN.
# For renames/copies, either side counts (we don't want a rename out of the
# tracked area to slip through).
structural_files=()
modify_files=()
while IFS=$'\t' read -r status p1 p2; do
    [ -z "${status:-}" ] && continue
    matched_path=""
    for p in "${p1:-}" "${p2:-}"; do
        [ -z "$p" ] && continue
        if echo "$p" | grep -qE "$DOC_PATTERN"; then
            matched_path="$p"
            break
        fi
    done
    [ -z "$matched_path" ] && continue
    if [[ "$status" =~ ^[ADRC] ]]; then
        structural_files+=("$status $matched_path")
    else
        modify_files+=("$status $matched_path")
    fi
done <<<"$status_lines"

# Nothing in the doc-described surface area changed.
if [ "${#structural_files[@]}" -eq 0 ] && [ "${#modify_files[@]}" -eq 0 ]; then
    exit 0
fi

# Did any doc files get updated? Only modifications (M) and additions (A) count.
# Deleting or renaming-away the doc itself must NOT satisfy the check.
docs_updated=false
while IFS=$'\t' read -r status p1 _p2; do
    [ -z "${status:-}" ] && continue
    if [[ "$status" =~ ^[MA]$ ]] \
        && [ -n "${p1:-}" ] \
        && echo "$p1" | grep -qE "$DOC_FILES_PATTERN"; then
        docs_updated=true
        break
    fi
done <<<"$status_lines"

# Opt-out trailer (line-anchored) in any commit body in the range.
opt_out=false
if git log --format=%B "$RANGE" 2>/dev/null | grep -qE '^Docs-skip:'; then
    opt_out=true
fi

# Structural changes require docs OR opt-out.
if [ "${#structural_files[@]}" -gt 0 ]; then
    if $docs_updated || $opt_out; then
        exit 0
    fi
    {
        echo "✗ Structural changes in doc-described paths require a docs update."
        echo "  Update docs/developers/architecture.md or docs/developers/data-catalog.md,"
        echo "  or add a 'Docs-skip: <reason>' trailer to one of the commits."
        echo "  Affected files:"
        printf '    %s\n' "${structural_files[@]}"
    } >&2
    exit 1
fi

# Pure modifications: soft warning unless docs updated or opted out.
if ! $docs_updated && ! $opt_out; then
    {
        echo "⚠  Doc-described files modified without a docs update."
        echo "   Review docs/developers/architecture.md and docs/developers/data-catalog.md."
    } >&2
fi
exit 0
