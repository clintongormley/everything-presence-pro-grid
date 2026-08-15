"""End-to-end pipeline flow tests: settings → compute → push to device."""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from tests.test_websocket_api import setup_integration


class TestEndToEndPipelineFlow:
    """Verify the full flow: settings change → pipeline compute → intervals pushed."""

    async def test_full_flow_entities_enabled_with_frontend(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """With target_xy enabled at 2Hz and frontend subscribed, all intervals set."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {
            "settings": {
                "target_xy": True,
                "zone_presence": True,
                "target_update_rate_ms": 500,
                "zone_update_rate_ms": 1000,
            },
        }

        mock_session = MagicMock()
        mock_session.async_execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)
        # Frontend connected: one grid subscriber, tracked per-mac.
        mock_dm._target_subs = {mac: {"raw_target_subs": 0, "grid_target_subs": 1}}

        # Use the real _push_pipeline_to_device method
        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session.async_execute_service.await_args
        assert call_args[0][0] == "epp_set_pipeline"
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 500
        assert pipeline["entity_zone_interval"] == 1000
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 1000
        assert "window_duration" not in pipeline

    async def test_full_flow_no_entities_no_frontend(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """With nothing enabled and no frontend, all intervals are 0."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        mock_session = MagicMock()
        mock_session.async_execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)
        # No frontend subscribers tracked for this mac.
        mock_dm._target_subs = {}

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session.async_execute_service.await_args
        assert call_args[0][0] == "epp_set_pipeline"
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 0
        assert pipeline["entity_zone_interval"] == 0
        assert pipeline["display_interval"] == 0
        assert pipeline["zone_state_interval"] == 0

    async def test_raw_subscribers_only_enables_display(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Raw target subscribers enable display but not zone_state."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}

        mock_session = MagicMock()
        mock_session.async_execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)
        # Calibration wizard open: one raw subscriber, tracked per-mac.
        mock_dm._target_subs = {mac: {"raw_target_subs": 1, "grid_target_subs": 0}}

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session.async_execute_service.await_args
        assert call_args[0][0] == "epp_set_pipeline"
        pipeline = call_args[0][1]
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 0  # Only grid subs trigger zone state

    async def test_rate_ignored_when_entities_disabled(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Configured rate is ignored when all entities in group are disabled."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {
            "settings": {
                "target_xy": False,
                "target_active": False,
                "target_signal": False,
                "target_zone": False,
                "target_update_rate_ms": 500,
            },
        }

        mock_session = MagicMock()
        mock_session.async_execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)
        mock_dm._target_subs = {}

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        call_args = mock_session.async_execute_service.await_args
        assert call_args[0][0] == "epp_set_pipeline"
        pipeline = call_args[0][1]
        assert pipeline["entity_target_interval"] == 0  # Rate ignored, entities all off


class TestHeatmapPipelinePushBWCStrip:
    """`heatmap_interval` must be stripped from the pushed payload for
    firmware that predates 1.3.0 — the old `epp_set_pipeline` service has no
    such variable, so pushing it could error on old devices."""

    async def test_heatmap_interval_stripped_for_old_firmware(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """A heatmap subscriber is tracked, but firmware 1.2.1 predates the
        Heatmap feature — the field must be absent from the payload, not 0."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev_abc123")

        mock_session = MagicMock()
        mock_session.async_execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)
        mock_dm._target_subs = {mac: {"raw_target_subs": 0, "grid_target_subs": 0, "heatmap_subs": 1}}
        mock_dm.read_firmware_version = MagicMock(return_value="1.2.1")

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        # Locks the call site passing `dev.device_id`, NOT the mac: a regression
        # to `read_firmware_version(mac)` would silently disable heatmap for
        # every device in production (mac never matches a device_id).
        mock_dm.read_firmware_version.assert_called_with("dev_abc123")

        call_args = mock_session.async_execute_service.await_args
        assert call_args[0][0] == "epp_set_pipeline"
        pipeline = call_args[0][1]
        assert "heatmap_interval" not in pipeline

    async def test_heatmap_interval_present_for_supported_firmware(
        self, hass: HomeAssistant, config_entry: MockConfigEntry
    ) -> None:
        """Firmware 1.3.0+ supports the Heatmap feature — the field must be
        present (old firmware's epp_set_pipeline still declares the arg) but
        always 0: the pull transport never uses the firmware publish timer."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}
        mock_dm.devices[mac] = ManagedDevice(mac=mac, name="EPP", host="192.168.1.50", device_id="dev_abc123")

        mock_session = MagicMock()
        mock_session.async_execute_service = AsyncMock()
        mock_session.connected = True
        mock_dm.get_session = MagicMock(return_value=mock_session)
        mock_dm._target_subs = {mac: {"raw_target_subs": 0, "grid_target_subs": 0, "heatmap_subs": 1}}
        mock_dm.read_firmware_version = MagicMock(return_value="1.3.0")

        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

        await mock_dm._push_pipeline_to_device(mac)

        # Locks the call site passing `dev.device_id`, NOT the mac: a regression
        # to `read_firmware_version(mac)` would silently disable heatmap for
        # every device in production (mac never matches a device_id).
        mock_dm.read_firmware_version.assert_called_with("dev_abc123")

        call_args = mock_session.async_execute_service.await_args
        assert call_args[0][0] == "epp_set_pipeline"
        pipeline = call_args[0][1]
        assert pipeline["heatmap_interval"] == 0


class TestSubscriberCountsSurviveSessionReplacement:
    """Regression for the v1.1.0 'target disappears in editor' freeze.

    The subscriber counts that gate device emission must live at manager/mac
    level, NOT on the ephemeral ``DeviceConnection``. When a device flaps and
    the session is torn down and reopened, the fresh connection's own counters
    start at zero — if the pipeline is computed from those, the device is told
    'no grid subscribers' and stops emitting zone-state, freezing every
    connected client until a page refresh re-subscribes.
    """

    def _fresh_session(self) -> MagicMock:
        """A just-reopened connection. It carries NO subscriber counters of its
        own — emission gating is driven entirely by the manager's per-mac
        `_target_subs`, so the pipeline must survive this fresh connection."""
        session = MagicMock()
        session.async_execute_service = AsyncMock()
        session.connected = True
        return session

    def _bind_real_sub_tracking(self, mock_dm: MagicMock) -> None:
        """Bind the REAL subscriber-tracking + pipeline-push methods onto the
        MagicMock manager so the per-mac counting logic actually runs (the
        mock would otherwise no-op these and hide the behavior)."""
        mock_dm._target_subs = {}
        mock_dm.note_target_subscribe = lambda m, k: DeviceManager.note_target_subscribe(mock_dm, m, k)
        mock_dm.note_target_unsubscribe = lambda m, k: DeviceManager.note_target_unsubscribe(mock_dm, m, k)
        mock_dm._push_pipeline_to_device = lambda m: DeviceManager._push_pipeline_to_device(mock_dm, m)

    async def test_grid_sub_survives_session_reopen(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """A grid subscriber recorded per-mac keeps zone_state emission on
        after the session is replaced by a fresh (zero-counter) connection."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}
        self._bind_real_sub_tracking(mock_dm)

        # Frontend holds an active grid-targets subscription.
        mock_dm.note_target_subscribe(mac, "grid_target_subs")

        # Device flapped → brand-new connection replaces the old session.
        fresh_session = self._fresh_session()
        mock_dm.get_session = MagicMock(return_value=fresh_session)

        await mock_dm._push_pipeline_to_device(mac)

        pipeline = fresh_session.async_execute_service.await_args[0][1]
        assert pipeline["zone_state_interval"] == 1000
        assert pipeline["display_interval"] == 200

    async def test_raw_sub_survives_session_reopen(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """A raw subscriber recorded per-mac keeps display emission on after a
        session reopen (calibration wizard staying open across a flap)."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}
        self._bind_real_sub_tracking(mock_dm)

        mock_dm.note_target_subscribe(mac, "raw_target_subs")

        fresh_session = self._fresh_session()
        mock_dm.get_session = MagicMock(return_value=fresh_session)

        await mock_dm._push_pipeline_to_device(mac)

        pipeline = fresh_session.async_execute_service.await_args[0][1]
        assert pipeline["display_interval"] == 200
        assert pipeline["zone_state_interval"] == 0  # raw only — no zone state

    async def test_unsubscribe_disables_emission(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """When the last grid subscriber goes away, zone-state emission stops."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}
        self._bind_real_sub_tracking(mock_dm)

        mock_dm.note_target_subscribe(mac, "grid_target_subs")
        mock_dm.note_target_unsubscribe(mac, "grid_target_subs")

        fresh_session = self._fresh_session()
        mock_dm.get_session = MagicMock(return_value=fresh_session)

        await mock_dm._push_pipeline_to_device(mac)

        pipeline = fresh_session.async_execute_service.await_args[0][1]
        assert pipeline["zone_state_interval"] == 0
        assert pipeline["display_interval"] == 0

    async def test_unsubscribe_never_goes_negative(self, hass: HomeAssistant, config_entry: MockConfigEntry) -> None:
        """A stray unsubscribe (its increment landed on a since-replaced
        connection) must not drive the count below zero and wrongly re-enable
        emission on the next subscribe."""
        mock_dm = await setup_integration(hass, config_entry)
        mac = "AA:BB:CC:DD:EE:FF"
        mock_dm._store.devices[mac] = {}
        self._bind_real_sub_tracking(mock_dm)

        # Unsubscribe with no matching subscribe — must floor at 0.
        mock_dm.note_target_unsubscribe(mac, "grid_target_subs")
        mock_dm.note_target_subscribe(mac, "grid_target_subs")

        fresh_session = self._fresh_session()
        mock_dm.get_session = MagicMock(return_value=fresh_session)

        await mock_dm._push_pipeline_to_device(mac)

        pipeline = fresh_session.async_execute_service.await_args[0][1]
        # One real subscriber → emission on (count floored, not -1+1=0).
        assert pipeline["zone_state_interval"] == 1000
