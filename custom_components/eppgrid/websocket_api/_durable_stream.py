"""Shared scaffolding for durable, manager-owned state streams.

Both the dashboard card (`_overview.py`) and the panel (`_devices.py`) hand their
state streams to the manager rather than holding a `DeviceConnection` themselves:
the manager owns the session refcount, re-arms the stream on a fresh connection
after a device flap, and reports liveness (#334, #336).
"""

from __future__ import annotations

from collections.abc import Awaitable
from collections.abc import Callable
from typing import Any
from typing import Literal

from homeassistant.components import websocket_api
from homeassistant.core import callback

from ..const import DOMAIN
from . import _LOGGER
from . import _connection_is_closed


async def start_durable_stream(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    manager: Any,
    *,
    mac: str,
    counter_attr: str,
    make_on_state: Callable[[str, Any], Callable[[Any], None]],
    send_snapshot: bool,
    protocol: Literal["frames_only", "closed_only", "full"],
    poll_fn: Callable[[Any], Awaitable[Any]] | None = None,
) -> None:
    """Shared scaffolding for the durable-stream subscribe commands — the
    non-admin overview commands (`_overview.py`) and the panel's three
    `@require_admin` live streams (`_devices.py`).

    The card sits on a dashboard for hours, so its stream must outlive the
    device's `DeviceConnection`: we hand a DURABLE stream to the manager, which
    owns the session refcount, re-arms the stream on a fresh connection after a
    device flap, and reports liveness through `on_availability` (#334). The
    callback is rebuilt per connection from `make_on_state`, since the device's
    entity keys are only knowable from the live connection.

    A stream the manager tears down itself (unload, reload, device removed) is a
    different thing from an offline device, and the client cannot tell them apart:
    `_on_closed` puts that on the wire so the card can re-subscribe.

    `protocol` picks one of exactly THREE wire contracts this function ever emits
    — the two booleans this replaced (`send_availability` / `send_protocol_events`)
    were not independent axes, they only ever appeared in these three combinations,
    and the fourth (live `available` events with `closed` suppressed) contradicted
    this docstring's own claims about what gates what:

    - `"frames_only"`: state frames, nothing else. For a client that has not opted
      in to protocol events at all (the panel's three commands, when a cached
      pre-upgrade bundle doesn't set `availability: true`) — its reducer replaces
      the whole message with `event.targets || []`, so ANY non-frame message would
      blank its live view.
    - `"closed_only"`: frames, plus `_on_closed`'s terminal signal — but NEVER a
      live `available` event. Used by `overview/subscribe_heatmap`: see
      `_on_availability` for why that wire must not carry liveness.
    - `"full"`: frames, plus live `available` events, plus `_on_closed`'s signal
      (which then also carries `available: false` alongside `closed: true`). Used
      by `overview/subscribe`, and by the panel's three commands once a client
      opts in via `availability: true`.

    `protocol` is transitional alongside the `availability` opt-in flag it backs
    for the panel's commands — see the note on that flag in data-catalog.md.

    `poll_fn` is forwarded to `manager.async_add_state_stream` unchanged — see
    that method's docstring for the POLL delivery seam it selects (issue #365).
    """
    # Derived from the message type rather than passed in: every caller's log_prefix
    # was exactly `msg["type"]` minus the domain, so a separate parameter only
    # invited it to drift from the actual command.
    log_prefix = msg["type"].removeprefix(f"{DOMAIN}/")
    connection.send_result(msg["id"])
    if send_snapshot:
        config = manager.store.devices.get(mac)
        connection.send_message(websocket_api.event_message(msg["id"], {"snapshot": dict(config) if config else {}}))

    # The last liveness the manager reported, for the heatmap subscription's one-shot
    # replay below. None = it never reported. Only ever READ in the synchronous stretch
    # right after `async_add_state_stream` returns, so what it holds there is exactly the
    # outcome of the registration window — a later notification cannot be observed.
    last_available: bool | None = None

    @callback
    def _on_availability(available: bool) -> None:
        """Relay the manager's liveness notifications, per the command's contract.

        `protocol == "full"` (`overview/subscribe`, and the panel's three commands
        opted in via `availability: true`) takes every event, live: the client
        renders its offline banner from this stream's `available` field.

        `protocol == "closed_only"` (`overview/subscribe_heatmap`) takes NONE of them
        directly. That subscription has never carried liveness, and already-deployed
        card bundles — which we cannot fix by rebuilding — reduce it with
        `(_state, m) => m.cells ?? []` (frontend/src/card/heatmap-store.ts), so ANY
        message without a `cells` field resets the overlay to empty. An arm/disarm event
        would therefore blank a user's heatmap on every device flap until the next frame
        arrives (up to one `heatmap_interval`). The card loses nothing: `available` still
        reaches it on the overview stream, and the heatmap repaints itself once the
        re-armed stream delivers its next frame.

        `main` did put exactly one availability event on this wire — the subscribe-time
        `available: false` for a device whose stream could not be armed (the pre-#334
        handler sent it when `async_open_session` returned None). It lands while the
        overlay is still empty, so it blanks nothing, and is kept. Emitting it inline
        from here would be wrong, though: a session loss racing the registration window
        (aioesphomeapi fires `on_stop` eagerly, including a stale one from a replaced
        connection) can notify False through the still-unarmed stream, and the arm can
        then succeed — a case where `main` sent nothing at all. So record the liveness
        and let the caller replay it once, below, only if registration settled offline.

        `protocol == "frames_only"` (the panel's commands, opted out) takes nothing
        here either — recorded for the replay below, which is itself gated off in
        that case.
        """
        nonlocal last_available
        last_available = available
        if protocol != "full":
            return
        connection.send_message(websocket_api.event_message(msg["id"], {"available": available}))

    @callback
    def _on_closed() -> None:
        """The manager dropped this stream — tell the client to re-subscribe.

        Fires only on a manager-initiated teardown (config entry unload/reload, device
        removed), never on a device flap. The client's subscription is still open, but
        the stream behind it is gone and the reloaded manager knows nothing of it, so
        no backend event will ever revive it — the card would sit on its offline banner
        until the element remounted (#334, reached via a config-entry reload).

        `available: false` rides along for `protocol == "full"` for BWC: an already-
        deployed card bundle reduces `overview/subscribe` with
        `"available" in m && !("targets" in m)` and ignores the extra key, so it keeps
        showing the offline banner exactly as it does today.

        `protocol == "closed_only"` (`overview/subscribe_heatmap`) gets `closed` alone
        — that wire has never carried liveness. A deployed bundle reduces it with
        `m.cells ?? []` and so blanks its overlay on this message; accepted, because by
        the time this fires that overlay is already dead (its stream is gone, no frame
        is ever coming), so it blanks something frozen rather than losing anything live.

        `protocol == "frames_only"` (the panel's opted-out path) must not see this one
        either: unlike the two wires above, it has no tolerance for a bare `closed`
        message at all, since its reducer blanks the live view on ANY message lacking
        `targets`.
        """
        if protocol == "frames_only":
            return
        event: dict[str, Any] = {"available": False, "closed": True} if protocol == "full" else {"closed": True}
        connection.send_message(websocket_api.event_message(msg["id"], event))

    # Registered BEFORE the await below (the standard HA pattern) so an
    # unsubscribe arriving while the arm is still in flight — in practice
    # `_arm_stream`'s `asyncio.wait_for(conn.async_connect(), timeout=30)`
    # against an unresponsive device (#336: the client switches device, HA
    # suspends the hidden panel, or the user hits Retry, all while the connect
    # is still running) — has something to find. HA's own
    # `handle_unsubscribe_events` only tears a subscription down if it finds an
    # entry under this id; with nothing registered yet it took its
    # "Subscription not found" branch and ran NO teardown at all, and the real
    # unsub below would then be stashed for a client that already left —
    # leaking the stream (and the session ref / subscriber count it holds) for
    # the life of the manager. Recorded rather than acted on immediately: the
    # arm below still needs to run to completion so its own rollback path
    # (registration failure, `mac not in self.devices`) stays the single place
    # that decides whether anything was actually registered.
    cancelled = False

    @callback
    def _cancel_pending() -> None:
        nonlocal cancelled
        cancelled = True

    connection.subscriptions[msg["id"]] = _cancel_pending

    try:
        unsub_stream = await manager.async_add_state_stream(
            mac,
            counter_attr=counter_attr,
            make_on_state=make_on_state,
            on_availability=_on_availability,
            on_closed=_on_closed,
            poll_fn=poll_fn,
        )
    except Exception as err:
        _LOGGER.warning("%s: stream registration failed for %s: %s", log_prefix, mac, err)
        unsub_stream = None
    if unsub_stream is None:
        # Nothing was registered (unknown mac, or the arm raised) — drop the
        # `_cancel_pending` placeholder too, so this id is left exactly as
        # unrecoverable as it always was: a later unsubscribe finds nothing,
        # rather than a no-op handler that lingers under this id forever.
        connection.subscriptions.pop(msg["id"], None)
        # Covers the recorded `last_available` too — nothing was registered, so this
        # single event is all the client gets either way.
        if protocol != "frames_only":
            connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))
        return
    # Replays the one-shot `available: False` recorded above for a "closed_only"
    # caller (only `overview/subscribe_heatmap` today) whose registration raced a
    # session loss and settled offline. Equivalent to the prior triple condition
    # `not send_availability and send_protocol_events and last_available is False`:
    # of the three real (send_availability, send_protocol_events) pairs that ever
    # reached this function — (True, True), (False, True), (False, False), mapped
    # 1:1 to "full"/"closed_only"/"frames_only" — that expression is True only for
    # (False, True), i.e. exactly `protocol == "closed_only"`.
    if protocol == "closed_only" and last_available is False:
        connection.send_message(websocket_api.event_message(msg["id"], {"available": False}))

    released = False

    @callback
    def _unsub() -> None:
        nonlocal released
        if released:
            return
        released = True
        unsub_stream()

    if cancelled:
        # `_cancel_pending` fired mid-arm: the client is already gone, so there
        # is nothing left to stash the real unsub against — release the stream
        # right now instead of registering it under an id nobody will ever call
        # again (see the comment above `_cancel_pending`).
        _unsub()
        return

    connection.subscriptions[msg["id"]] = _unsub
    # If the connection closed during the await above, HA already cleared
    # connection.subscriptions, so the unsub we just registered will never fire
    # — invoke it now so the manager drops the stream and releases its session
    # reference. The `released` guard makes this safe against a later call.
    if _connection_is_closed(connection):
        _unsub()
