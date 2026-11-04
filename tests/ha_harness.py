"""One import path for the HA test helpers, on old and new HA."""

try:
    from pytest_homeassistant.common import MockConfigEntry
    from pytest_homeassistant.common import MockUser
    from pytest_homeassistant.common import async_fire_time_changed
    from pytest_homeassistant.common import async_mock_service
    from pytest_homeassistant.typing import WebSocketGenerator
except ImportError:
    from pytest_homeassistant_custom_component.common import MockConfigEntry
    from pytest_homeassistant_custom_component.common import MockUser
    from pytest_homeassistant_custom_component.common import async_fire_time_changed
    from pytest_homeassistant_custom_component.common import async_mock_service
    from pytest_homeassistant_custom_component.typing import WebSocketGenerator

__all__ = [
    "MockConfigEntry",
    "MockUser",
    "WebSocketGenerator",
    "async_fire_time_changed",
    "async_mock_service",
]
