#!/usr/bin/env bash
# Fast pre-push check — run before `git push` to catch the common formatting /
# lint failures that would otherwise kick in during the full pre-push hook
# (which runs the same checks plus tests + coverage + C++ build, ~6 min total).
#
# Takes ~5 seconds. If this passes, the full hook's format/lint steps will too.
#
# Usage:
#   ./scripts/pre-push-fast.sh

set -e

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

printf '▶ ruff format\n'
if ! ruff format --check custom_components/ tests/ firmware/ scripts/; then
    printf '\n✗ Python formatting — run: ruff format custom_components/ tests/ firmware/ scripts/\n'
    exit 1
fi

printf '\n▶ ruff check\n'
if ! ruff check custom_components/ tests/ firmware/ scripts/; then
    printf '\n✗ Python lint — run: ruff check --fix custom_components/ tests/ firmware/ scripts/\n'
    exit 1
fi

printf '\n▶ mypy\n'
if ! mypy; then
    printf '\n✗ Python typecheck — see errors above\n'
    exit 1
fi

printf '\n▶ biome check\n'
if ! (cd frontend && npx biome check src/); then
    printf '\n✗ TypeScript format/lint — run: cd frontend && npx biome check --fix src/\n'
    exit 1
fi

printf '\n▶ tsc --noEmit\n'
if ! (cd frontend && npx tsc --noEmit); then
    printf '\n✗ TypeScript typecheck — run: cd frontend && npm run typecheck\n'
    exit 1
fi

# Mirror the CI `docs` job's markdown-format gate (mdformat wrap=80 from
# .mdformat.toml + the gfm/mkdocs plugins). mdformat lives in
# requirements-docs.txt, so skip with a warning if the docs deps aren't
# installed rather than hard-failing a contributor who hasn't set them up.
printf '\n▶ mdformat --check\n'
if command -v mdformat >/dev/null 2>&1; then
    # Portable equivalent of the CI docs gate. We avoid `xargs -r` (a GNU
    # extension that BSD/macOS xargs rejects) by guarding the empty case here.
    md_files=$(git ls-files -- docs README.md | { grep '\.md$' || true; })
    if [ -n "$md_files" ] && ! printf '%s\n' "$md_files" | xargs mdformat --check; then
        printf '\n✗ Markdown formatting — run: git ls-files -- docs README.md | grep "\\.md$" | xargs mdformat\n'
        exit 1
    fi
else
    printf '  ⚠  mdformat not installed — skipping (pip install -r requirements-docs.txt to enable)\n'
fi

printf '\n✓ fast checks pass — safe to run git push\n'
