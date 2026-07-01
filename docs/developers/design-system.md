# Frontend design system

The panel frontend (`frontend/src`) uses a **token + primitive** design system
so the UI is consistent, themeable, and follows the user's Home Assistant theme.
This is the durable rulebook — follow it for any frontend work.

> **The one rule:** in the frontend, use the `epp-*` primitives and `--epp-*`
> tokens. **Never hardcode** chrome colours, spacing, radius, or font sizes.
> Never hand-roll a button/input/toggle/dialog when a primitive exists. Run
> `npm run build` after editing frontend source and commit the rebuilt bundle.

The layer lives in [`frontend/src/ui/`](../../frontend/src/ui/): `tokens.ts` +
the primitives. Tokens are applied at the panel host (`eppgrid-panel`) `:host`,
so the `--epp-*` custom properties cascade into every nested shadow root. The
dashboard card (`eppgrid-card`) also applies the `tokens` stylesheet at its own
`:host`, so `--epp-*` tokens are available throughout the card's shadow tree
(including the `<epp-grid>` and `<epp-live-sidebar>` it renders).

## Tokens (`frontend/src/ui/tokens.ts`)

All **colour** tokens map to an HA theme var with a fallback, so the panel
re-themes automatically. **Structural** tokens (spacing/radius/type) are fixed
values but stay overridable via the same `--epp-*` names. When tokenising,
**pair each token with its real value as the fallback** (e.g. `--epp-font-sm` ⇒
`13px`, not `14px`) — a mismatched fallback is a latent bug.

**Colour — accent & semantic (themeable):**

```
--epp-accent        var(--primary-color, #03a9f4)
--epp-accent-text   var(--text-primary-color, #fff)   /* ink on an accent fill */
--epp-success       var(--success-color, #43a047)
--epp-warning       var(--warning-color, #ff9800)
--epp-danger        var(--error-color, #f44336)
```

**Colour — neutrals / text / surface (themeable):**

```
--epp-text          var(--primary-text-color, #212121)
--epp-text-muted    var(--secondary-text-color, #757575)
--epp-text-disabled var(--disabled-text-color, #bdbdbd)
--epp-border        var(--divider-color, #e0e0e0)
--epp-surface       var(--card-background-color, #fff)
--epp-surface-2     var(--secondary-background-color, #f5f5f5)
--epp-tooltip-bg    var(--primary-text-color, #212121)
--epp-tooltip-text  var(--card-background-color, #fff)
```

**Colour — furniture (domain-specific, not themed):**

```
--epp-furniture-on-dark        #eef2f7   light furniture, used on dark room colours
--epp-furniture-on-light       #28303c   dark furniture, used on light room colours
--epp-furniture-halo-on-dark   rgba(0,0,0,.85)      dark outline behind light furniture
--epp-furniture-halo-on-light  rgba(255,255,255,.95) light outline behind dark furniture
```

Applied automatically to every card: each furniture item is toned against the
cell rendered under it (`lib/furniture-tones.ts` + `lib/furniture-contrast.ts`).

**Spacing (4px base):** `--epp-space-1..6` = 4 / 8 / 12 / 16 / 24 / 32px
**Radius:** `--epp-radius-sm` 6 · `-md` 10 · `-lg` 16 · `-pill` 9999px
**Elevation:** `--epp-elevation-1` `0 2px 8px rgba(0,0,0,.12)` · `-2`
`0 6px 20px rgba(0,0,0,.18)` **Type:** `--epp-font-xs..2xl` = 12 / 13 / 14 / 15
/ 16 / 18 / 20px · `--epp-weight-regular|medium|semibold` = 400 / 500 / 600
**Controls:** `--epp-control-height` 40px · `--epp-control-height-sm` 32px ·
`--epp-focus-ring` `2px solid var(--primary-color,#03a9f4)` **Layout:**
`--epp-content-max` 720px (centered max-width for the full-width views —
settings / flasher / device-groups — so they don't stretch on a wide desktop)

## Primitives (`frontend/src/ui/`)

Each wraps the native `ha-*` element where one exists (so
behaviour/keyboard/a11y come for free), reads `var(--epp-*)`, emits a consistent
event, and calls `e.stopPropagation()` when re-emitting a composed HA event
(else it double-fires across shadow boundaries).

| Primitive                      | Use for                                                                           | Key interface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `epp-button`                   | every action button                                                               | `variant` (primary / neutral / danger / text), `disabled`, `icon`; emits native `click`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `epp-icon-button`              | icon-only actions (remove, delete, kebab trigger)                                 | `icon` (required), `label` (required, a11y), `variant?`; resting colour overridable via `--epp-icon-button-color`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `epp-field`                    | text/number input                                                                 | `label`, `value`, `type` (text / number), `unit?`, `placeholder?`, `min/max/step?`, `autocomplete?`; emits one `value-changed` `{detail:{value}}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `epp-toggle`                   | on/off switch                                                                     | `label?`, `checked`, `disabled?`; emits `value-changed` `{detail:{value:boolean}}` — **not** for multi-select checkboxes (those stay `ha-checkbox`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `epp-card`                     | surface container                                                                 | `heading?`, `elevated?`; slots: default + `actions` (16px padding/16px radius baked in — don't use for tight inset lists)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `epp-section-row`              | label-left / control-right row                                                    | `label`, `helper?`; slot = control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `epp-tooltip`                  | hover/focus hint on icon buttons / truncated text                                 | `content`; slot = trigger. Replaces raw `title=`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `epp-info-tip` (`components/`) | the `(?)` explanatory bubble (a sentence of help)                                 | click/tap to open; touch-friendly                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `epp-dialog`                   | **every modal**                                                                   | `open` (caller-owns), `heading?`; slots: default + `actions`; emits `dialog-dismiss` on Esc. **Slot action buttons directly** (`<epp-button slot="actions">`), not inside a wrapper `<div slot="actions">` (that breaks the flex row)                                                                                                                                                                                                                                                                                                                                                                                |
| `epp-sheet`                    | the editor/live **controls panel** — one element, two presentations by breakpoint | `open` (caller-owns) + `inline`; slots: `peek` (always visible) + default (body) + `actions`. The handle is a **non-interactive grab indicator** — the caller controls `open` (no tap-to-toggle, no `sheet-open-changed`). **≤819px:** bottom sheet (`inline` flows it below the grid in the mobile editor; the default fixes it to the viewport bottom). **≥820px:** a relative-flow **side-panel card** (border + `--epp-radius-lg`, no grab handle), used as the desktop editor/live controls column. Presentation is purely breakpoint-driven CSS — the same `<epp-sheet inline open>` is correct at every width |

## Theming rules

- **Chrome colours are themeable** via the `--epp-*` → HA-var indirection. The
    `--epp-*` properties are the panel's public theming API (a custom theme /
    card-mod can override `--epp-accent` etc. for just this panel).
- **Domain colours are fixed, not themed** — furniture / zone / target / heatmap
    colours must read identically in light and dark mode. They live in `lib/`
    (heatmap, zone/target defaults, the furniture catalog in `constants.ts`).
- **Floor-plan / furniture SVG art uses `currentColor`** (not hardcoded `black`)
    and the containing element sets a themed ink (`--epp-text-muted`) so
    furniture is visible in dark mode. The grid background is themed, so
    dark-on-dark art disappears otherwise.
- **Tooltips:** a sentence of explanation → `epp-info-tip`; just naming a
    control → `epp-tooltip`. No raw `title=`.
- **Link-styled controls stay native.** A control that should look like an
    inline text link (not a button) is a native `<button>`/`<a>` with link CSS —
    don't force it through `epp-button` (the primitive imposes button
    height/colour/padding).

## Responsive / mobile (Phase 3)

- **Breakpoint: 820px.** One responsive component set: below it the panel stacks
    (mobile layout); at/above it the same components reflow to the desktop
    side-by-side / side-panel layout. Use `@media (max-width: 819px)` for
    pure-CSS reflow and `window.matchMedia("(max-width: 819px)")` for the
    structural JS flag (`_isMobile` on the panel host). Keep the two in sync.
- **Touch targets ≥44px.** Below the breakpoint the panel host sets
    `--epp-control-height: 44px`, which cascades into every primitive. The
    grid's furniture handles carry a transparent ≥44px `::after` hit area
    (visible nub unchanged).
- **Editor + live overview = grid + `epp-sheet` controls, one responsive
    layout.** `.editor-shell` is a two-track CSS **grid** ≥820px (grid left; the
    `epp-sheet` controls as a side-panel card right — see _Desktop layout (Phase
    4)_) and a flex **column** ≤819px (grid on top; the `epp-sheet` as a bottom
    sheet below). The grid fits its column via `fitCellPx` + measured
    width/height: on desktop it grows to fill, bounded by the column height
    (cell cap 48px); on mobile it is capped to ~45% of the viewport height. The
    controls' `peek` = mode tabs (editor) or title + kebab (live overview); body
    = the same `epp-zone-sidebar`/`epp-furniture-sidebar`/`epp-overlay-sidebar`
    (or `epp-live-sidebar`); `actions` = Save/Cancel (editor only — always shown
    on desktop, dirty-and-not-typing gated on mobile). **Pan/pinch-zoom is
    deferred** (scope C); painting uses per-cell-element pointer events, so a
    future zoom transform is additive.
- Conventional views (settings/live/flasher/device-groups) already stack; they
    reflow with reduced panel padding + full width below the breakpoint.

## Desktop layout (Phase 4)

Phase 4 aligns the desktop editor + live overview with the mobile card patterns
and lets the grid grow into the browser width (it kept the 1100px reading-column
cap before, leaving the grid small on wide screens). Desktop stays
**side-by-side** — the alignment is in the card patterns + sizing, not a stacked
layout.

- **Grid-hero views fill the width: `.panel--grid`.** The editor and
    live-overview panels carry `class="panel panel--grid"`, which drops the
    centered 1100px `.panel` `max-width`. **Critical:** it also sets `margin: 0`
    \+ `align-self: stretch`. The panel is a flex item of the flex-column
    `.tab-layout`; auto side margins on a flex item silently disable
    `align-items: stretch`, so the panel would shrink-wrap to its content and
    starve the grid of width. Drop the auto margins or the full-width opt-out
    does nothing.
- **`.editor-shell` is a two-track CSS grid:**
    `grid-template-columns: minmax(0, 1fr) 360px` (grid column + fixed 360px
    controls track). A reserved **track** (vs a flex item) keeps the grid
    column's width stable across the editor↔live swap — the controls element
    coming and going no longer reflows the grid. The `minmax(0, …)` lets the
    column shrink below its content; `.editor-shell > .grid-column` adds
    `min-width: 0` + `max-width: none` so it fills the track. The mobile
    `@media` block resets `.editor-shell` to `display: flex` +
    `flex-direction: column`.
- **Expansion-area card.** `.editor-shell .grid-container` gets a themed surface
    (`--epp-surface`) + border + `--epp-radius-lg` on desktop: the grid centres
    within it, the card shows the area the grid can expand into, and the
    detection log below lines up with the card's left edge. The mobile `@media`
    resets it to `background/border/padding: none` (the grid fills the screen
    there — no card).
- **Desktop grid sizing** (`epp-grid.ts`, gated on `!capHeightToHalfViewport`):
    cell cap 48px (vs 32 mobile), grid cap 960px (vs `maxGridPx`), and the grid
    is height-bounded to `innerHeight − top − DESKTOP_HEIGHT_RESERVE_PX` (130px,
    reserved for the dimensions caption
    - log toggle). The grid recomputes on add/remove rows/columns, not only on
        save.
- **Known follow-up:** a transient re-measure flicker on the live↔editor view
    swap (the grid briefly grows then settles). Cosmetic; deferred — see the PR
    / handoff. Reverted experiments (hide-until-measured) did not fix it.

## Discipline

- **Visual-only conversions.** Never change event names/payloads, handlers,
    entity/zone keys, the zone engine, or stored config. Preserve behavioural
    test assertions; update only DOM-structure selectors the markup change
    invalidates.
- **TDD** for new primitives (failing test first). **Behaviour-preserving** for
    view conversions.
- **Build:** `npm run build` after frontend edits, commit the rebuilt
    `custom_components/eppgrid/frontend/eppgrid-panel.js`. Keep biome (tabs)
    clean and per-file coverage > 90%.
- **happy-dom caveats** (tests): it does not compute CSS / resolve custom
    properties / fire `slotchange`, and isolates each test file in its own
    window. Assert structure/attributes/ events, never computed colour — visual
    correctness is verified by review, not unit tests.

## Status & history

Built across PR #251: Phase 0 (tokens + primitives), Phase 1–2 (all views
converted, dialogs standardised on `epp-dialog`). Phase 3 (responsive / mobile)
shipped on the `mobile` branch (PR #261). Phase 4 (desktop alignment —
full-width grid-hero views, CSS-grid shell, expansion-area card) is on the
`desktop` branch (PR #264, stacked on `mobile`). The one-time brainstorming spec
and phase plans live under `docs/superpowers/` (gitignored working notes — this
committed doc is the durable rulebook). The portable process for running this
overhaul on another HA integration is at
`~/.claude/ha-panel-design-overhaul.md`.
