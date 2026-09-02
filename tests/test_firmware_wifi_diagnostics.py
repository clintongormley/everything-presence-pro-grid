"""WiFi drop diagnostics (wifi-ble-co2 variant only).

Issue #291: a device kept going unavailable in HA (`[Errno 113] Connect call
failed`) while never rebooting — uptime kept climbing, reset reason stayed
POWERON. The device drops off the network exactly when we most need to hear
from it, and serial tethering moves it away from the spot where it fails (when
the reporter tethered it, it stopped reproducing). So the device has to
*remember* what happened and tell us once it is back.

ESPHome logs the disconnect reason but exposes no entity for it, and its
`wifi_signal` sensor samples once a minute — up to 60s stale by the time the
link drops. ESP-IDF's `WIFI_EVENT_STA_DISCONNECTED` event carries both the
reason code and the RSSI at the moment of the drop, so a raw `esp_event`
handler gets us the exact values.

What the five entities answer:

  - WiFi Disconnects       Did the radio drop *at all*? Flat while HA loses the
                           device ⇒ the association held and the fault is in the
                           IP/API layer, not WiFi.
  - Disconnect Reason      AP kicked us (Association Leave / Auth Expire) vs we
                           lost the beacon (Beacon Timeout).
  - Disconnect Signal      RSSI at the drop: signal collapsed vs signal was fine
                           and we were kicked anyway.
  - WiFi BSSID             Which AP — a BSSID change per drop is mesh steering
                           (the reporter is on an eero mesh).
  - WiFi Downtime          How long the radio was actually gone. WiFi back in 2s
                           but HA unavailable for 30s ⇒ our reconnect, not WiFi.

All five publish ONLY from the connect/disconnect triggers — never on a timer.
A healthy device sends nothing, so they cost no traffic on a device that is
already streaming BLE proxy advertisements. States set while the device is
offline are held and shipped in the initial-state burst when the API
reconnects: that is what makes them survive the outage.

The *decision* logic — when an event counts as a drop, when to publish, when to
reset — lives in `epp_wifi_diag.h` and is host-tested in
`firmware/lib/epp_component_helpers/tests/test_wifi_diag.cpp`, because YAML
lambdas cannot be. What is tested here is the wiring: that the variant calls that
logic from the right places, and that the entities are shaped so HA reads them
correctly. These assertions match against the lambda bodies with `//` comments
stripped — see `_strip_cpp_comments`.
"""

import re

from tests.esphome_yaml import ETHERNET_VARIANT_YAML
from tests.esphome_yaml import WIFI_VARIANT_YAML
from tests.esphome_yaml import find_by_id
from tests.esphome_yaml import find_by_platform
from tests.esphome_yaml import load_variant


def _variant() -> dict:
    return load_variant(WIFI_VARIANT_YAML)


def _sensor(sensor_id: str) -> dict | None:
    return find_by_id(_variant().get("sensor"), sensor_id)


def _text_sensor(sensor_id: str) -> dict | None:
    return find_by_id(_variant().get("text_sensor"), sensor_id)


def _global(global_id: str) -> dict | None:
    return find_by_id(_variant().get("globals"), global_id)


def _action_code(node) -> str:
    """Every lambda/action string under a trigger, with `//` comments stripped.

    Two traps, both of which produced a test that could not fail:

    `yaml.dump()` is not usable here. It re-wraps the lambda into physical lines
    where the newlines are literal `\\n` escapes, so stripping "to end of line"
    swallows the code that follows a comment on the same dumped line. Walking the
    parsed structure keeps each lambda's real newlines intact.

    And the comments must go. The YAML carries lambdas as opaque strings, comments
    and all, so `"record_disconnect" in text` passes just as happily when the call
    is commented out — or merely *described* in a comment — as when it is actually
    made. A reviewer proved the point by commenting out every functional line in
    the variant and watching this whole module still pass. Matching only on code is
    what makes these assertions mean anything.
    """
    if isinstance(node, str):
        parts = [node]
    elif isinstance(node, dict):
        parts = [_action_code(value) for value in node.values()]
    elif isinstance(node, list):
        parts = [_action_code(item) for item in node]
    else:
        parts = [str(node)]
    text = "\n".join(part for part in parts if part)
    return re.sub(r"//[^\n]*", "", text)


def _wifi_trigger_text(trigger: str) -> str:
    """Executable lambda/action code under `wifi: on_connect:` / `on_disconnect:`."""
    return _action_code(_variant().get("wifi", {}).get(trigger, {}))


def _on_boot_text() -> str:
    """Executable action code under the variant's `esphome: on_boot:` hooks."""
    return _action_code(_variant().get("esphome", {}).get("on_boot", []))


# -- The raw ESP-IDF event handler --------------------------------------------


def test_disconnect_event_handler_registered_at_boot():
    """Only the raw IDF event carries the reason code — ESPHome exposes neither.

    `wifi.on_disconnect` tells us *that* we dropped, not *why*. The reason code
    is the single most diagnostic value here: it distinguishes "the AP kicked
    us" from "we lost the beacon", which point at completely different fixes.
    """
    boot = _on_boot_text()
    assert "esp_event_handler_instance_register" in boot, (
        "the wifi variant must register a raw esp_event handler at boot — "
        "ESPHome's wifi component logs the disconnect reason but exposes no "
        "getter for it, so the IDF event is the only source."
    )
    assert "WIFI_EVENT_STA_DISCONNECTED" in boot, "the esp_event handler must subscribe to WIFI_EVENT_STA_DISCONNECTED"


def test_disconnect_handler_captures_reason_and_rssi():
    """`wifi_event_sta_disconnected_t` carries both; take them from the event.

    RSSI must come from the event, not the `wifi_signal` sensor: that sensor
    polls once a minute, so at the moment of a drop its value can be a minute
    stale — useless for deciding whether the signal collapsed.
    """
    boot = _on_boot_text()
    assert "->reason" in boot, "handler must read `reason` off wifi_event_sta_disconnected_t"
    assert "->rssi" in boot, (
        "handler must read `rssi` off wifi_event_sta_disconnected_t — the "
        "RSSI at the instant of the drop, not the up-to-60s-stale poll from "
        "the wifi_signal sensor."
    )


def test_handler_delegates_to_the_recorder_and_never_publishes():
    """The event task may record, but must not publish, and must not decide.

    Two rules, both of which the firmware got wrong once:

    1. `publish_state()` from the IDF event task would reach into ESPHome's
       single-threaded loop from another task. The handler records; the wifi
       triggers publish.
    2. The event re-fires on every failed reconnect attempt during an outage, so
       anything that treats each event as a drop measures the retry storm instead.
       `record_disconnect` keeps only the first event of an outage — that decision
       is host-tested in test_wifi_diag.cpp, and the handler's only job is to hand
       the event over intact.
    """
    boot = _on_boot_text()
    assert "record_disconnect" in boot, (
        "the esp_event handler must hand the event to epp::record_disconnect, which "
        "is where the first-event-of-an-outage rule lives (and is tested)."
    )
    assert "publish_state" not in boot, (
        "the esp_event handler runs in the IDF event task and must never call "
        "publish_state() — that reaches into the ESPHome loop from another task."
    )


def test_handler_registration_failure_is_logged():
    """A diagnostic that fails silently into a reassuring reading is worse than none.

    If the handler never registers, no drop is ever recorded, so every entity here
    stays quiet — which is precisely what a device with no drops looks like. The
    one reading a user would take from that ("WiFi Disconnects: 0") is the reading
    that ends the investigation.
    """
    boot = _on_boot_text()
    assert "ESP_LOGE" in boot, (
        "the return of esp_event_handler_instance_register must be checked and "
        "logged on failure — otherwise the whole feature no-ops invisibly."
    )


# -- The entities -------------------------------------------------------------


def test_disconnect_count_sensor():
    """The discriminator: did the radio drop at all, or only the API?"""
    sensor = _sensor("wifi_disconnect_count_sensor")
    assert sensor is not None, (
        "expected a `wifi_disconnect_count_sensor` counting WIFI_EVENT_STA_DISCONNECTED "
        "since boot. If HA loses the device while this stays flat, the association "
        "held and the bug is above WiFi — that single fact redirects the whole "
        "investigation, and nothing we ship today can tell us."
    )
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("state_class") == "total_increasing", (
        "a monotonic since-boot counter is total_increasing — it resets to 0 on "
        "reboot, and HA must not read that reset as a negative delta."
    )


def test_disconnect_reason_text_sensor():
    """Why the link went away — AP kicked us vs we lost the beacon."""
    sensor = _text_sensor("wifi_disconnect_reason_sensor")
    assert sensor is not None, "expected a `wifi_disconnect_reason_sensor` text sensor"
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"


def test_disconnect_rssi_sensor():
    """Signal at the instant of the drop — collapse vs kicked-while-healthy."""
    sensor = _sensor("wifi_disconnect_rssi_sensor")
    assert sensor is not None, "expected a `wifi_disconnect_rssi_sensor`"
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("unit_of_measurement") == "dBm"
    assert sensor.get("device_class") == "signal_strength"


def test_bssid_text_sensor():
    """Which AP we are on. A BSSID change at each drop is mesh steering."""
    text_sensors = _variant().get("text_sensor")
    wifi_info = find_by_platform(text_sensors, "wifi_info")
    assert wifi_info is not None, (
        "expected a `platform: wifi_info` text_sensor exposing the BSSID — on a "
        "mesh (the #291 reporter is on eero) a BSSID that changes at every drop "
        "means the AP is steering the device between nodes, which looks exactly "
        "like a firmware fault from HA's side."
    )
    bssid = wifi_info.get("bssid")
    assert isinstance(bssid, dict), "wifi_info text_sensor must define `bssid:`"
    assert bssid.get("entity_category") == "diagnostic"


def test_downtime_sensor():
    """Separates a WiFi outage from a slow reconnect on our side."""
    sensor = _sensor("wifi_downtime_sensor")
    assert sensor is not None, (
        "expected a `wifi_downtime_sensor` reporting how many seconds the last "
        "outage lasted. If WiFi returns in 2s but HA stays unavailable for 30s, "
        "the fault is our reconnect path, not the network."
    )
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("unit_of_measurement") == "s"
    assert sensor.get("device_class") == "duration"


# -- Event-driven, not periodic -----------------------------------------------


def test_diagnostic_sensors_never_poll():
    """A healthy device must send nothing.

    These sit on a device already streaming BLE proxy advertisements and (with
    the panel open) 5Hz display frames. Diagnostics that poll would add traffic
    forever to buy nothing — every value here only changes when the link does.
    `update_interval: never` makes that a property of the config rather than a
    promise in a comment.
    """
    for sensor_id in (
        "wifi_disconnect_count_sensor",
        "wifi_disconnect_rssi_sensor",
        "wifi_downtime_sensor",
    ):
        sensor = _sensor(sensor_id)
        assert sensor is not None
        assert sensor.get("update_interval") == "never", (
            f"{sensor_id} must set `update_interval: never` — it is published "
            "from the wifi connect/disconnect triggers, and a template sensor "
            "left on the default 60s interval polls forever for no reason."
        )

    reason = _text_sensor("wifi_disconnect_reason_sensor")
    assert reason is not None
    assert reason.get("update_interval") == "never"


def test_count_publishes_on_connect_so_a_healthy_device_reads_zero():
    """`unknown` cannot answer the question the user guide asks.

    The guide's headline test is "WiFi Disconnects stays at 0 while HA still shows
    the device unavailable ⇒ the device never lost WiFi". A template sensor with no
    lambda publishes nothing until its first drop, so on exactly the device where
    that test applies, HA renders `unknown` — indistinguishable from a broken
    entity or firmware too old to have it. Publishing the count on every connect
    means the first boot reports 0.
    """
    assert "wifi_disconnect_count_sensor" in _wifi_trigger_text("on_connect"), (
        "wifi.on_connect must publish the count unconditionally, so a device that "
        "has never dropped reports 0 rather than `unknown`."
    )


def test_disconnect_trigger_republishes_the_count():
    """So a brief blip that the API session survives is reported without waiting."""
    assert "wifi_disconnect_count_sensor" in _wifi_trigger_text("on_disconnect"), (
        "wifi.on_disconnect must publish the count"
    )


def test_drop_is_described_on_reconnect_not_at_the_drop():
    """Reason, RSSI and downtime are all taken on the way back up. Deliberately.

    Reading the record at disconnect would race the IDF event handler: ESPHome's
    own handler (registered first, in its setup) queues the event for the loop,
    while ours — registered in on_boot, so second — writes the record. Were the loop
    to pick the event up in the window between the two, on_disconnect would publish
    the *previous* drop's reason: precisely the misleading value these entities
    exist to prevent.

    Publishing on reconnect costs nothing, because a state published during an
    outage never reaches HA anyway — the device is offline, so it merely sits in
    the entity until the API reconnects. Only the value held at reconnect is ever
    transmitted, and by then the record has long settled.
    """
    connect = _wifi_trigger_text("on_connect")
    disconnect = _wifi_trigger_text("on_disconnect")

    assert "take_drop" in connect, (
        "wifi.on_connect must call epp::take_drop — it both marks the link up and "
        "consumes the pending drop, so a reconnect with no IDF disconnect behind "
        "it (a roam scan, a lost DHCP lease) republishes nothing."
    )
    for sensor_id in (
        "wifi_disconnect_reason_sensor",
        "wifi_disconnect_rssi_sensor",
        "wifi_downtime_sensor",
    ):
        assert sensor_id in connect, f"wifi.on_connect must publish {sensor_id}"
        assert sensor_id not in disconnect, (
            f"wifi.on_disconnect must NOT publish {sensor_id} — reading the record "
            "at disconnect races the IDF event handler, and the value would never "
            "reach HA from there anyway."
        )


def test_latched_sensors_have_no_state_class():
    """They hold the last drop's value forever; HA must not treat that as a series.

    With `state_class: measurement`, HA records 5-minute long-term statistics of a
    value that does not change between drops. After one bad drop the Disconnect
    Signal graph is a flat -90 dBm line stretching indefinitely, sitting next to a
    live WiFi Signal of -56 dBm — it reads as a permanently terrible signal. These
    are attributes of the last event, not measurements of anything.
    """
    for sensor_id in ("wifi_disconnect_rssi_sensor", "wifi_downtime_sensor"):
        sensor = _sensor(sensor_id)
        assert sensor is not None
        assert "state_class" not in sensor, (
            f"{sensor_id} must not declare a state_class — it latches the last "
            "drop's value, and long-term statistics of a held constant are "
            "actively misleading."
        )


def test_led_script_still_driven_by_wifi_triggers():
    """Regression guard: the triggers already drove the LEDs. Don't drop that.

    `control_leds` is what turns the LED to "connecting" when WiFi goes away.
    Appending publishes to these triggers must not displace it.
    """
    for trigger in ("on_connect", "on_disconnect"):
        assert "control_leds" in _wifi_trigger_text(trigger), (
            f"wifi.{trigger} must still execute the control_leds script — it "
            "drives the connection-status LED and predates these diagnostics."
        )


# -- Placement ----------------------------------------------------------------


def test_wifi_diagnostics_absent_from_shared_base():
    """The ethernet variant includes the base and has no `wifi:` component.

    Same trap as `wifi_signal` (see test_firmware_wifi_signal.py): a wifi_info
    text sensor in the shared base fails the ethernet config outright with
    `requires component wifi`. Keep all of this in the wifi variant.
    """
    # Assert against the ethernet variant's *merged* config rather than any one
    # source file: what actually breaks the build is a wifi-only component
    # reaching the ethernet build, and that stays true wherever the shared
    # packages move it to.
    ethernet = load_variant(ETHERNET_VARIANT_YAML)
    assert find_by_platform(ethernet.get("text_sensor"), "wifi_info") is None, (
        "wifi_info must not reach the ethernet build — it has no `wifi:` "
        "component, so ESPHome fails its config with `requires component wifi`."
    )
    for sensor_id in ("wifi_disconnect_count_sensor", "wifi_disconnect_rssi_sensor", "wifi_downtime_sensor"):
        assert find_by_id(ethernet.get("sensor"), sensor_id) is None, f"{sensor_id} must not reach the ethernet build"
