# Dropdown compatibility harness

Tests the shipped `renderSelect` (`src/ui/select.ts`), and the real components
that call it, in Chromium against the real `ha-select` built from four Home
Assistant frontend tags. Unit tests cannot do this, because happy-dom has no
`ha-select`.

| Tag          | Home Assistant | `ha-select`                             |
| ------------ | -------------- | --------------------------------------- |
| `20250205.0` | 2025.2         | old: takes `ha-list-item` children      |
| `20260128.6` | 2026.2         | old, needs a patch to `mwc-list`        |
| `20260304.0` | 2026.3         | new: takes `.options`, ignores children |
| `20261028.4` | 2026.11        | new                                     |

## Running it

```sh
cd frontend
npm run test:select-compat
```

Run it whenever you change `src/ui/select.ts`. It prints a table of cases
against tags, then what each failing case saw, and exits non-zero if any case
did not pass. `n/a` is a case that only applies to newer versions.

The first run, any run after `setup.mjs` or the patch changes, and any run after
a setup that stopped partway need network access, a logged-in `gh` and the
`patch` command. Every run needs Chromium (`npx playwright install chromium` if
Playwright says it is missing). The first run takes about three minutes, and
later runs reuse the cache but take nearly as long, because the time is in the
browser steps.

It is manual only, not in CI or the pre-push hook, because every run takes
minutes and a clean checkout must first download and build all four tags.
Nothing under `frontend/tools/` is linted, typechecked or tested by the repo's
commands, which cover `src/` only.

## What is generated

Everything goes in the gitignored `.cache/` folder, and no third-party code is
committed. Delete that folder to start from nothing.

- `tags/<tag>/` holds that tag's sources, fetched with `gh api` starting from
    `ha-select` and following imports, with its npm packages and its
    `bundle.js`. A tag is reused only if it finished setting up and `setup.mjs`
    and the patch have not changed since.
- `panel.js` is the code in `src/`, built with esbuild. It is not the committed
    `eppgrid-panel.js`, so `npm run build` is not needed first. It is rebuilt on
    every run.
- `out/` holds `results.json` and a screenshot of each tag's icon menu.

## Files

- `run.mjs` runs everything and prints the table.
- `setup.mjs` builds the cache. Add or change a tag in `TAGS`.
- `cases.mjs` holds the cases. `R` cases drive real components.
- `page.mjs` holds the steps a case can take on a page.
- `page-helpers.js` runs inside the page.
- `entry.ts` is the entry point for `panel.js`.
- `mwc-list.patch` is Home Assistant's own patch to `@material/mwc-list`,
    applied to `20260128.6` only.

## Keeping it honest

- Keep every case on the shipped code. The only other template is `plain` in
    `page-helpers.js`, a baseline for comparing against. A harness with its own
    copy of the select logic stays green when `src/ui/select.ts` breaks.
- The icon metadata is stubbed so that `ha-icon` draws nothing and raises no
    error on the newer tags (`setup.mjs` says how). `run.mjs` excuses nothing,
    so any uncaught error or `console.error` seen while a page is open fails the
    run, on any tag.
- After changing the harness, break `renderSelect` on purpose and check the run
    goes red. Removing `.options`, the `ha-list-item` children or `live` are
    good places to start.
