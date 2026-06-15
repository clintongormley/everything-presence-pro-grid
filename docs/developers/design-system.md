# Frontend design system

The panel frontend (`frontend/src`) uses a **token + primitive** design system so the
UI is consistent, themeable, and follows the user's Home Assistant theme. This is the
durable rulebook — follow it for any frontend work.

> **The one rule:** in the frontend, use the `epp-*` primitives and `--epp-*` tokens.
> **Never hardcode** chrome colours, spacing, radius, or font sizes. Never hand-roll a
> button/input/toggle/dialog when a primitive exists. Run `npm run build` after editing
> frontend source and commit the rebuilt bundle.

The layer lives in [`frontend/src/ui/`](../../frontend/src/ui/): `tokens.ts` + the
primitives. Tokens are applied at the panel host (`eppgrid-panel`) `:host`, so the
`--epp-*` custom properties cascade into every nested shadow root.

## Tokens (`frontend/src/ui/tokens.ts`)

All **colour** tokens map to an HA theme var with a fallback, so the panel re-themes
automatically. **Structural** tokens (spacing/radius/type) are fixed values but stay
overridable via the same `--epp-*` names. When tokenising, **pair each token with its
real value as the fallback** (e.g. `--epp-font-sm` ⇒ `13px`, not `14px`) — a mismatched
fallback is a latent bug.

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

**Spacing (4px base):** `--epp-space-1..6` = 4 / 8 / 12 / 16 / 24 / 32px
**Radius:** `--epp-radius-sm` 6 · `-md` 10 · `-lg` 16 · `-pill` 9999px
**Elevation:** `--epp-elevation-1` `0 2px 8px rgba(0,0,0,.12)` · `-2` `0 6px 20px rgba(0,0,0,.18)`
**Type:** `--epp-font-xs..2xl` = 12 / 13 / 14 / 15 / 16 / 18 / 20px · `--epp-weight-regular|medium|semibold` = 400 / 500 / 600
**Controls:** `--epp-control-height` 40px · `--epp-control-height-sm` 32px · `--epp-focus-ring` `2px solid var(--primary-color,#03a9f4)`

## Primitives (`frontend/src/ui/`)

Each wraps the native `ha-*` element where one exists (so behaviour/keyboard/a11y come
for free), reads `var(--epp-*)`, emits a consistent event, and calls `e.stopPropagation()`
when re-emitting a composed HA event (else it double-fires across shadow boundaries).

| Primitive | Use for | Key interface |
| --- | --- | --- |
| `epp-button` | every action button | `variant` (primary / neutral / danger / text), `disabled`, `icon`; emits native `click` |
| `epp-icon-button` | icon-only actions (remove, delete, kebab trigger) | `icon` (required), `label` (required, a11y), `variant?`; resting colour overridable via `--epp-icon-button-color` |
| `epp-field` | text/number input | `label`, `value`, `type` (text / number), `unit?`, `placeholder?`, `min/max/step?`, `autocomplete?`; emits one `value-changed` `{detail:{value}}` |
| `epp-toggle` | on/off switch | `label?`, `checked`, `disabled?`; emits `value-changed` `{detail:{value:boolean}}` — **not** for multi-select checkboxes (those stay `ha-checkbox`) |
| `epp-card` | surface container | `heading?`, `elevated?`; slots: default + `actions` (16px padding/16px radius baked in — don't use for tight inset lists) |
| `epp-section-row` | label-left / control-right row | `label`, `helper?`; slot = control |
| `epp-tooltip` | hover/focus hint on icon buttons / truncated text | `content`; slot = trigger. Replaces raw `title=` |
| `epp-info-tip` (`components/`) | the `(?)` explanatory bubble (a sentence of help) | click/tap to open; touch-friendly |
| `epp-dialog` | **every modal** | `open` (caller-owns), `heading?`; slots: default + `actions`; emits `dialog-dismiss` on Esc. **Slot action buttons directly** (`<epp-button slot="actions">`), not inside a wrapper `<div slot="actions">` (that breaks the flex row) |
| `epp-sheet` | mobile bottom sheet (the editor's controls below the breakpoint) | `open` (caller-owns); slots: `peek` (always visible) + default (body) + `actions`; tap the handle toggles, emits `sheet-open-changed` `{detail:{open}}`. Fixed to the bottom; only rendered below the mobile breakpoint |

## Theming rules

- **Chrome colours are themeable** via the `--epp-*` → HA-var indirection. The `--epp-*`
  properties are the panel's public theming API (a custom theme / card-mod can override
  `--epp-accent` etc. for just this panel).
- **Domain colours are fixed, not themed** — furniture / zone / target / heatmap colours
  must read identically in light and dark mode. They live in `lib/` (heatmap, zone/target
  defaults, the furniture catalog in `constants.ts`).
- **Floor-plan / furniture SVG art uses `currentColor`** (not hardcoded `black`) and the
  containing element sets a themed ink (`--epp-text-muted`) so furniture is visible in
  dark mode. The grid background is themed, so dark-on-dark art disappears otherwise.
- **Tooltips:** a sentence of explanation → `epp-info-tip`; just naming a control →
  `epp-tooltip`. No raw `title=`.
- **Link-styled controls stay native.** A control that should look like an inline text
  link (not a button) is a native `<button>`/`<a>` with link CSS — don't force it through
  `epp-button` (the primitive imposes button height/colour/padding).

## Responsive / mobile (Phase 3)

- **Breakpoint: 820px.** Below it the panel uses the mobile layout; at/above it the desktop
  layout is unchanged. Use `@media (max-width: 819px)` for pure-CSS reflow and
  `window.matchMedia("(max-width: 819px)")` for the structural JS flag (`_isMobile` on the
  panel host). Keep the two in sync.
- **Touch targets ≥44px.** Below the breakpoint the panel host sets `--epp-control-height: 44px`,
  which cascades into every primitive. The grid's furniture handles carry a transparent
  ≥44px `::after` hit area (visible nub unchanged).
- **Editor on mobile = grid + bottom sheet.** The grid renders full-width (it fits the
  container via `fitCellPx` + a `ResizeObserver`) with the controls in an `epp-sheet`
  (peek = mode tabs; expanded = the same `epp-zone-sidebar`/`epp-furniture-sidebar`/
  `epp-overlay-sidebar` content; dirty-only save/cancel in `actions`). The desktop
  side-by-side is untouched. **Pan/pinch-zoom is deferred** (scope C); painting uses
  per-cell-element pointer events, so a future zoom transform is additive.
- Conventional views (settings/live/flasher/device-groups) already stack; they reflow with
  reduced panel padding + full width below the breakpoint.

## Discipline

- **Visual-only conversions.** Never change event names/payloads, handlers, entity/zone
  keys, the zone engine, or stored config. Preserve behavioural test assertions; update
  only DOM-structure selectors the markup change invalidates.
- **TDD** for new primitives (failing test first). **Behaviour-preserving** for view
  conversions.
- **Build:** `npm run build` after frontend edits, commit the rebuilt
  `custom_components/eppgrid/frontend/eppgrid-panel.js`. Keep biome (tabs) clean and
  per-file coverage > 90%.
- **happy-dom caveats** (tests): it does not compute CSS / resolve custom properties / fire
  `slotchange`, and isolates each test file in its own window. Assert structure/attributes/
  events, never computed colour — visual correctness is verified by review, not unit tests.

## Status & history

Built across PR #251: Phase 0 (tokens + primitives), Phase 1–2 (all views converted,
dialogs standardised on `epp-dialog`). Phase 3 (responsive / mobile) is next. The
one-time brainstorming spec and phase plans live under `docs/superpowers/` (gitignored
working notes — this committed doc is the durable rulebook). The portable process for
running this overhaul on another HA integration is at `~/.claude/ha-panel-design-overhaul.md`.
