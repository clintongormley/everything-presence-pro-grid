# Contributing

Everything Presence Pro Grid is four subsystems (Python integration, TypeScript/Lit panel, ESPHome firmware, MkDocs docs) in one repo. Contributing usually means touching one or two of them. This page covers the shared dev-environment setup, how to run the tests the pre-push hook enforces, and the PR process.

## Prerequisites

- **Python 3.13+** — matches the integration's `requires-python` floor.
- **Node.js** (LTS) and `npm` — for the frontend build and tests.
- **CMake** and a C++17 compiler — for the zone engine library tests (only needed if you touch firmware).
- **ESPHome CLI** — for firmware compile, if you're building firmware locally. Install the pinned toolchain with `pip install -r firmware/requirements.txt` so local builds match CI/OTA (a bare `pip install esphome` floats to latest and can silently change firmware metadata between releases).
- **`lcov`** (optional) — used by the pre-push hook for C++ coverage on firmware changes. `brew install lcov` on macOS. Without it, the hook skips C++ coverage but still runs C++ tests. (`epp_component_helpers/` is header-only, so coverage is implicit in its host tests; lcov only measures `epp_zone_engine/`'s `src/`.)

A locally-running Home Assistant is helpful but not required for running the test suite — the Python tests use `pytest-homeassistant-custom-component`, which provides fixtures that don't need a real HA instance.

## Clone and set up

```bash
git clone https://github.com/clintongormley/everything-presence-pro-grid
cd everything-presence-pro-grid

# Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements_test.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

For docs work, also install the docs dependencies:

```bash
pip install -r requirements-docs.txt
```

## Install the pre-push hook

The repository ships a pre-push hook at `.githooks/pre-push` that runs format, lint, tests, and coverage across Python, TypeScript, and C++ before every push. It's not optional for this project — CI runs the same checks and they need to pass.

Install it (points `core.hooksPath` at the version-controlled `.githooks/` dir, so it works in the main checkout and every worktree):

```bash
bash bin/install-hooks.sh
```

## Building the frontend bundle

The HA panel is TypeScript compiled to a single bundled JS file:

```bash
cd frontend
npm run build
```

This produces `custom_components/eppgrid/frontend/eppgrid-panel.js`.

**This bundle is committed to the repository.** Home Assistant serves it as a static file — there's no build step at HA-install time. That means any frontend source change must be rebuilt and the resulting `eppgrid-panel.js` committed alongside the source changes. The pre-push hook runs `npm run build` so the bundle is always up to date in your commit.

## Running tests

Each layer has its own test command. The pre-push hook runs all of them, but during development you usually only want the relevant one.

### Python

```bash
pytest tests/ -x -q --cov=custom_components/eppgrid --cov-fail-under=90
```

- Covers the integration's Python code (device manager, storage, WebSocket API, flasher, diagnostics, config flow).
- **Coverage floor: 90%.** The hook fails the push if coverage drops below.
- Uses `pytest-homeassistant-custom-component` for HA fixtures.

### Frontend

```bash
cd frontend
npx vitest run --coverage
```

- Covers components, controllers, and `lib/` modules.
- **Per-file coverage thresholds** (from `frontend/vitest.config.ts`): lines 90%, branches 85%, functions 90%, statements 90%. Vitest fails the run if any file falls below these, which fails the push and CI.

### C++ libraries

There are two host-testable libraries under `firmware/lib/`:

```bash
# Zone engine — the main pipeline (rolling window, perspective, zone state machine)
cd firmware/lib/epp_zone_engine
cmake -B build -S . -DCMAKE_BUILD_TYPE=Coverage
cmake --build build
ctest --test-dir build --output-on-failure

# Component helpers — small pure helpers extracted from components/epp/
cd ../epp_component_helpers
cmake -B build -S . -DCMAKE_BUILD_TYPE=Coverage
cmake --build build
ctest --test-dir build --output-on-failure
```

- Only needed if you touch firmware code. The hook runs both when firmware files change.
- Coverage floor (hook-enforced): 90% lines on `epp_zone_engine/src/*.cpp`, measured with `lcov`. `epp_component_helpers/` is header-only (templated/inline) so lcov sees nothing in `src/`; coverage there is implicit in its host tests.

### Docs

The docs site builds with MkDocs; `--strict` is required to catch broken links.

```bash
mkdocs build --strict
```

There are no unit tests for docs — `--strict` is the verification.

## What the pre-push hook runs

In order, on every `git push`:

1. **Docs check** — for *structural* changes (file add / rename / delete) under the doc-described surface area, **blocks** the push unless `docs/developers/architecture.md` or `docs/developers/data-catalog.md` was also updated. Pure modifications produce a non-blocking warning. See `scripts/check-docs-update.sh`.
2. **Strings check** — if entity files changed with likely user-facing string edits, fails if `strings.json` wasn't also updated.
3. **Translations check** — `strings.json` ↔ `translations/en.json` must be identical (copy one to the other if you change strings).
4. **Python format** — `ruff format --check`.
5. **Python lint** — `ruff check`.
6. **Python tests + coverage** — `pytest` with 90% floor.
7. **C++ build / tests / coverage** (only if firmware code changed) — CMake + CTest + `lcov` with 90% floor.
8. **TypeScript format** — Biome.
9. **TypeScript lint** — Biome.
10. **TypeScript build** — Rollup, which produces the committed bundle.
11. **TypeScript tests + coverage** — Vitest.

If any step fails, the push aborts. Fix the issue, re-stage, and push again.

!!! tip
    Running the hook locally via `./.githooks/pre-push origin main` is a faster way to catch failures than waiting for a rejected push.

## PR process

1. Work on a feature branch cut off `main`.
2. Make small, focused commits — one concern per commit. See [commit style](#commit-message-style) below.
3. When ready, open a PR against `main`.
4. CI runs the same checks as the pre-push hook, plus the firmware-compile matrix and HACS / Hassfest / CodeQL.
5. Respond to review comments inline. The repo uses **regular merge commits** (not squash) as its merge strategy — keep your history clean before requesting merge.
6. Once approved and green, merge via the GitHub UI ("Create a merge commit").

## Commit-message style

Observed convention from `git log`: `type: summary` where `type` is one of `docs`, `feat`, `fix`, `chore`, `test`, `refactor`. Keep the subject under ~70 characters; expand in the body when the "why" isn't obvious from the diff.

Examples from this repo's history:

- `feat: automate firmware publishing on release`
- `fix: detect device going offline during OTA from device list`
- `docs: write Firmware page`
- `chore: drop committed fw/ — Pages stages from latest release`

## What not to commit

`.gitignore` already excludes the usual suspects (`.venv/`, `__pycache__/`, `node_modules/`, `dist/`, `site/`), plus planning artefacts under `docs/superpowers/`. If you've added a `docs/superpowers/` spec or plan while designing your change, leave it local — it won't be committed or pushed.
