"""Durable frontend state streams — the unit the manager re-arms across reconnects.

A WS client (the dashboard card) subscribes once and expects frames for as long as
its subscription lives. The `DeviceConnection` under it is disposable: it dies on a
device flap and is replaced. So a stream stores a *factory* rather than a bound
callback — the callback is rebuilt against whatever connection is live, because the
device's entity keys are only knowable from that connection (and can change across
an OTA).
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable
from collections.abc import Callable
from dataclasses import dataclass
from dataclasses import field
from typing import Any

_LOGGER = logging.getLogger(__name__)


# `eq=False`: identity equality (and hashing), not the dataclass default of structural
# equality over the fields. The record IS the subscription — the registry keeps a list
# per mac and deregisters with `list.remove`, which drops the first EQUAL element. Two
# streams on one mac whose fields happen to match (a caller sharing a callback pair
# between them) would otherwise have the wrong one removed: the survivor would keep a
# callback on the connection with no owner, and its subscriber count would go out of step.
@dataclass(eq=False)
class StateStream:
    """One client's durable subscription to a device's state frames."""

    mac: str
    counter_attr: str
    make_on_state: Callable[[str, Any], Callable[[Any], None]]
    on_availability: Callable[[bool], None]
    on_closed: Callable[[], None] | None = None
    # Poll-source delivery (heatmap): when set, an armed stream drives a periodic
    # poller (`DeviceManager._run_poll_stream`) instead of a PUSH `subscribe_states`
    # subscription. `poll_fn` fetches one item per tick against the live connection;
    # its returned callback (`make_on_state`) is fed each fetched item, not a device
    # state. `poll_task` is the running poller, cancelled on disarm/close.
    poll_fn: Callable[[Any], Awaitable[Any]] | None = None
    poll_interval: float = 2.0
    poll_task: Any | None = field(default=None, repr=False)
    conn: Any | None = None
    cb: Any | None = None
    closed: bool = False
    _last_available: bool | None = field(default=None, repr=False)
    _closed_notified: bool = field(default=False, repr=False)

    @property
    def armed(self) -> bool:
        """True while a callback is registered on a live connection."""
        return self.conn is not None

    def closed_now(self) -> bool:
        """Read `closed` fresh.

        `_arm_stream` re-checks `closed` after each of its awaits (opening
        the session, subscribing) because the owning client can close the
        stream while either is in flight. The plain attribute gets narrowed
        to False by mypy after the first such check and stays narrowed
        across the next await, flagging the second re-check as unreachable.
        A property has the same problem — mypy narrows a property read the
        same way it narrows a plain attribute — so this must stay a method:
        a call expression is not narrowed.
        """
        return self.closed

    def notify(self, available: bool) -> None:
        """Tell the owner the stream's liveness changed.

        De-duped: the reconciler runs on every device flap and would otherwise
        re-send an unchanged value to the client on each pass. Errors are
        swallowed — a WS connection that closed mid-flight must not break the
        reconciler for the other streams on this device.
        """
        if available == self._last_available:
            return
        self._last_available = available
        try:
            self.on_availability(available)
        except Exception:
            _LOGGER.exception("State-stream availability callback raised")

    def notify_closed(self) -> None:
        """Tell the owner its stream is GONE — not merely offline.

        Fires only when the manager itself tore the stream down (config entry
        unload/reload, device removed): the client's subscription is still open but
        now points at a stream that no longer exists, and nothing on the backend can
        revive it — only a re-subscribe can. A device flap must NOT fire this: the
        stream survives that and re-arms itself, and re-subscribing on every Wi-Fi
        blip would churn the wire for nothing.

        Fires at most once, and errors are swallowed: the teardown paths walk every
        stream on a device, and a websocket that died mid-teardown must not break the
        loop for the others.
        """
        if self._closed_notified:
            return
        self._closed_notified = True
        if self.on_closed is None:
            return
        try:
            self.on_closed()
        except Exception:
            _LOGGER.exception("State-stream closed callback raised")

    def mark_closed(self) -> None:
        """Terminal teardown: the manager no longer holds this stream.

        The shared tail of `async_stop`'s Phase 3 and `_on_device_removed` — which
        DETACH the stream differently (one nulls `conn`/`cb` directly, bypassing the
        refcounts it is about to drop wholesale; the other goes through
        `_disarm_stream`) but end identically. Flipping `closed` is what stops an
        `_arm_stream` still in flight from resuming past its `closed_now()` guards and
        re-arming onto a connection being torn down. Then both notifications, in order
        and both required: `notify(False)` because the stream is no longer live, and
        `notify_closed` because — unlike an offline device, which comes back and re-arms
        — nothing here will ever revive it. Idempotent via the `closed` flag.

        CALLER CONTRACT — the subscriber count is NOT released here. Flipping `closed`
        makes the client's own unsub (`async_add_state_stream._close`) early-return, so
        it never reaches its `note_target_unsubscribe`. Both current callers drop the
        counts wholesale instead (`async_stop` clears `_target_subs`; `_on_device_removed`
        pops the mac's entry), which is what keeps them balanced. A third caller that
        marked a stream closed WITHOUT dropping its mac's counts would leak one, pinning
        the device to the fast emission pipeline for the manager's lifetime.
        """
        if self.closed:
            return
        self.closed = True
        # A poll-source stream's poller is the ONLY thing this terminal path stops:
        # `async_stop` Phase 3 nulls conn/cb directly and calls `mark_closed`,
        # bypassing `_disarm_stream`, so without this the poll task would loop on.
        # `cancel()` is idempotent, so Phase 1's earlier cancel makes this a no-op.
        if self.poll_task is not None:
            self.poll_task.cancel()
            self.poll_task = None
        self.notify(False)
        self.notify_closed()
