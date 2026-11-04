"""Tests for how a torn-down websocket connection is recognised."""

from __future__ import annotations

from typing import Any

import pytest

from custom_components.eppgrid.websocket_api import _connection_is_closed


class _StubConnection:
    """The parts of HA's ActiveConnection that the close check reads."""

    def __init__(self) -> None:
        self.send_message = self._live_send
        self._send_message = self._live_send

    def _live_send(self, msg: Any) -> None:
        """Stand in for the send function of an open connection."""

    def _connect_closed_error(self, msg: Any) -> None:
        """Stand in for the function HA swaps in on close."""


def _closed_old_shape() -> _StubConnection:
    """HA 2026.10 and older swap the public attribute."""
    connection = _StubConnection()
    connection.send_message = connection._connect_closed_error
    return connection


def _closed_new_shape() -> _StubConnection:
    """HA 2026.11 and newer swap the private attribute."""
    connection = _StubConnection()
    connection._send_message = connection._connect_closed_error
    return connection


@pytest.mark.parametrize(
    ("make_connection", "closed"),
    [
        pytest.param(_closed_old_shape, True, id="send_message_swapped"),
        pytest.param(_closed_new_shape, True, id="_send_message_swapped"),
        pytest.param(_StubConnection, False, id="live"),
    ],
)
def test_connection_is_closed_recognises_both_connection_shapes(make_connection: Any, closed: bool) -> None:
    """Both places HA has swapped the send function count as closed."""
    assert _connection_is_closed(make_connection()) is closed


def test_connection_without_closed_error_attribute_is_not_closed() -> None:
    """Without the closed-error function there is nothing to compare, so it stays open."""

    class _Bare:
        send_message = None
        _send_message = None

    assert _connection_is_closed(_Bare()) is False
