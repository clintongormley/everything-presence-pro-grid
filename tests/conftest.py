"""Shared test fixtures for EPP Grid integration tests."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.const import DOMAIN
from tests.ha_harness import MockConfigEntry


@pytest.fixture
def config_entry(hass: HomeAssistant) -> MockConfigEntry:
    """Create a mock config entry."""
    entry = MockConfigEntry(domain=DOMAIN, data={}, title="EPP Grid")
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def stub_frontend_deps(hass: HomeAssistant):
    """Let a real config-entry setup run without a built frontend.

    The integration hard-depends on frontend/panel_custom (no ``hass_frontend`` in
    CI): mark them loaded and stub panel/resource registration. Opt in per test
    file with ``@pytest.mark.usefixtures("stub_frontend_deps")`` — not autouse, so
    unit tests that never set up the entry stay untouched.
    """
    hass.config.components.add("frontend")
    hass.config.components.add("panel_custom")
    with (
        patch(
            "custom_components.eppgrid._register_frontend_resources",
            new_callable=AsyncMock,
            return_value="/eppgrid_static/eppgrid-panel.js?v=test",
        ),
        patch("custom_components.eppgrid._register_card_resource", new_callable=AsyncMock),
        patch("custom_components.eppgrid._register_panel", new_callable=AsyncMock),
    ):
        yield
