# Everything Presence Grid — project instructions

Home Assistant custom integration: an ESPHome-based mmWave presence sensor with
a custom panel frontend, firmware, and zone engine. Developer docs live in
[`docs/developers/`](docs/developers/index.md) (architecture, code layout, data
catalog, contributing).

## Frontend design system

The panel frontend (`frontend/src`) uses a **token + primitive** design system.
When doing any frontend work:

- **Use the `epp-*` primitives** (`frontend/src/ui/`: `epp-button`,
    `epp-icon-button`, `epp-field`, `epp-toggle`, `epp-card`, `epp-section-row`,
    `epp-tooltip`, `epp-dialog`, and `epp-info-tip`) — never hand-roll a
    button/input/toggle/dialog when a primitive exists.
- **Use `--epp-*` tokens** for colour/spacing/radius/font — **never hardcode**
    chrome hex, spacing, radius, or font sizes. Theme via HA vars (domain
    colours stay fixed).
- **No raw `title=`** — use `epp-tooltip` (hint) or `epp-info-tip` (`?`
    explanation).
- Conversions are **visual-only / behaviour-preserving**; primitives are built
    **TDD**.
- **Run `npm run build`** after editing frontend source and commit the rebuilt
    bundle (`custom_components/eppgrid/frontend/eppgrid-panel.js`). Keep biome
    (tabs) clean and per-file coverage > 90%.

Full rules, the token list, and primitive interfaces:
**[`docs/developers/design-system.md`](docs/developers/design-system.md)**. (The
portable playbook for running this overhaul on another HA integration is at
`~/.claude/ha-panel-design-overhaul.md`.)
