# Developers

This section is for contributors to the Everything Presence Pro Grid codebase —
the Python Home Assistant integration, the TypeScript/Lit panel that ships
inside it, the ESPHome-based firmware, and this docs site. For end-user
documentation (installation, flashing, zone configuration, automations), see the
[User Guide](../user-guide/introduction.md).

## How the project is organised

Four subsystems live together in one repository:

- **Integration** (`custom_components/eppgrid/`) — the Python HA custom
    component. A thin layer that discovers Everything Presence Pro devices via
    the ESPHome entity registry, connects to them, and relays state to the
    panel.
- **Frontend** (`frontend/`) — the TypeScript/Lit panel that lives in the Home
    Assistant sidebar. Handles zone editing, calibration, the live overview, and
    firmware flashing.
- **Firmware** (`firmware/`) — ESPHome-based firmware with a custom C++
    component and a standalone zone engine library. The zone engine runs
    entirely on-device.
- **Docs** (`docs/`) — this site, built with MkDocs Material and published to
    GitHub Pages.

For the full picture of how these communicate, see
[Architecture](architecture.md).

## In this section

- **[Architecture](architecture.md)** — how firmware, integration, and frontend
    fit together. Start here for a mental model of the whole system.
- **[Data catalog](data-catalog.md)** — inventory of the data that flows between
    layers. Reference material when you're wiring up a new entity or tracing a
    bug.
- **[Code layout](code-layout.md)** — repo-level walkthrough. "Where does X
    live?"
- **[Design system](design-system.md)** — the frontend's token + primitive
    design system (`--epp-*` tokens, `epp-*` primitives, theming rules). Read
    this before any panel UI work.
- **[Contributing](contributing.md)** — dev-environment setup, how to run the
    tests the pre-push hook enforces, PR process.

## Starting to contribute

New contributors should read [Contributing](contributing.md) first for the
dev-environment setup and the test commands. Then use
[Code layout](code-layout.md) to find the area you want to change. Reach for
[Architecture](architecture.md) and [Data catalog](data-catalog.md) as reference
material when you need them — they're reference pages, not onboarding reads.

<!-- ci-skip verification (throwaway) -->
