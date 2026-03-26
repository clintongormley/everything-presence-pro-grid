# Integration Architecture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the eppgrid HA integration from a full device manager into a lightweight layer on top of ESPHome — auto-setup, device discovery, on-demand connections, config storage by MAC, and ESPHome entity management.

**Architecture:** The integration uses `async_setup(hass, config)` (no config flow). A `Store`-based storage layer persists per-device config and templates keyed by MAC. A `DeviceManager` discovers ESPHome devices with zone engine firmware via entity registry scanning, opens on-demand API connections for the calibration UI, pushes config on save and device reconnect, and manages ESPHome-owned entity enable/disable/rename. The websocket API is rewritten with MAC-keyed commands that stream data directly from the device.

**Tech Stack:** Python 3.13, Home Assistant Core, aioesphomeapi, pytest-homeassistant-custom-component

**Spec:** `docs/superpowers/specs/2026-03-26-integration-architecture-redesign.md`

---

## File Structure

```
custom_components/eppgrid/
  __init__.py          — auto-setup, panel registration (rewritten)
  manifest.json        — no config_flow (modified)
  const.py             — grid/zone constants only (slimmed)
  storage.py           — NEW: Store-based persistence
  device_manager.py    — NEW: discovery, connections, config push, entity mgmt
  websocket_api.py     — MAC-keyed commands, direct streaming (rewritten)
  frontend/            — unchanged

  # Dev mode only (conditionally imported via EPPGRID_DEV_MODE):
  coordinator.py       — old coordinator (kept for dev mode)
  zone_engine.py       — Python zone engine (kept for dev mode)
  calibration.py       — perspective transform (kept for dev mode)
  binary_sensor.py     — old entity platform (kept for dev mode)
  sensor.py            — old entity platform (kept for dev mode)
  config_flow.py       — old config flow (kept for dev mode)

tests/
  conftest.py          — updated fixtures
  test_storage.py      — NEW
  test_device_manager.py — NEW
  test_websocket_api_v2.py — NEW
  test_init_v2.py      — NEW
```

---

### Task 1: Storage Layer

**Files:**
- Create: `custom_components/eppgrid/storage.py`
- Create: `tests/test_storage.py`

- [ ] **Step 1: Write tests for storage load/save**

```python
# tests/test_storage.py
"""Tests for EPP Grid storage layer."""
from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    """Create a store instance."""
    return EPPGridStore(hass)


class TestEPPGridStore:
    async def test_load_empty(self, store: EPPGridStore) -> None:
        """First load returns empty devices and templates."""
        await store.async_load()
        assert store.devices == {}
        assert store.templates == {}
        assert store.sidebar_panel is True

    async def test_save_and_load_device(self, store: EPPGridStore) -> None:
        """Device config round-trips through save/load."""
        await store.async_load()
        config = {
            "name": "Lounge",
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
        }
        store.devices["AA:BB:CC:DD:EE:FF"] = config
        await store.async_save()

        store2 = EPPGridStore(store._hass)
        await store2.async_load()
        assert store2.devices["AA:BB:CC:DD:EE:FF"]["name"] == "Lounge"

    async def test_save_and_load_template(self, store: EPPGridStore) -> None:
        """Template config round-trips through save/load."""
        await store.async_load()
        store.templates["bedroom"] = {"furniture": [{"type": "bed"}]}
        await store.async_save()

        store2 = EPPGridStore(store._hass)
        await store2.async_load()
        assert store2.templates["bedroom"]["furniture"][0]["type"] == "bed"

    async def test_get_device_returns_none_for_unknown(self, store: EPPGridStore) -> None:
        """get_device returns None for unknown MAC."""
        await store.async_load()
        assert store.get_device("XX:XX:XX:XX:XX:XX") is None

    async def test_sidebar_panel_default_true(self, store: EPPGridStore) -> None:
        """sidebar_panel defaults to True."""
        await store.async_load()
        assert store.sidebar_panel is True

    async def test_sidebar_panel_persists(self, store: EPPGridStore) -> None:
        """sidebar_panel setting round-trips."""
        await store.async_load()
        store.sidebar_panel = False
        await store.async_save()

        store2 = EPPGridStore(store._hass)
        await store2.async_load()
        assert store2.sidebar_panel is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_storage.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'custom_components.eppgrid.storage'`

- [ ] **Step 3: Implement storage module**

```python
# custom_components/eppgrid/storage.py
"""Persistent storage for EPP Grid device configs and templates."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = DOMAIN


class EPPGridStore:
    """Store for per-device configuration and room templates."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store[dict[str, Any]](hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}
        self.templates: dict[str, dict[str, Any]] = {}
        self.sidebar_panel: bool = True

    async def async_load(self) -> None:
        """Load stored data."""
        data = await self._store.async_load()
        if data is None:
            return
        self.devices = data.get("devices", {})
        self.templates = data.get("templates", {})
        self.sidebar_panel = data.get("sidebar_panel", True)

    async def async_save(self) -> None:
        """Persist current data."""
        await self._store.async_save({
            "devices": self.devices,
            "templates": self.templates,
            "sidebar_panel": self.sidebar_panel,
        })

    def get_device(self, mac: str) -> dict[str, Any] | None:
        """Get config for a device by MAC, or None."""
        return self.devices.get(mac)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_storage.py -v`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/storage.py tests/test_storage.py
git commit -m "Add storage layer for per-device config and templates"
```

---

### Task 2: Device Manager — Discovery

**Files:**
- Create: `custom_components/eppgrid/device_manager.py`
- Create: `tests/test_device_manager.py`

- [ ] **Step 1: Write tests for device discovery**

```python
# tests/test_device_manager.py
"""Tests for EPP Grid device manager."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.eppgrid.device_manager import DeviceManager, ManagedDevice
from custom_components.eppgrid.storage import EPPGridStore


@pytest.fixture
def store(hass: HomeAssistant) -> EPPGridStore:
    return EPPGridStore(hass)


@pytest.fixture
def manager(hass: HomeAssistant, store: EPPGridStore) -> DeviceManager:
    return DeviceManager(hass, store)


class TestDiscovery:
    async def test_no_esphome_devices(self, manager: DeviceManager) -> None:
        """Empty entity registry yields no managed devices."""
        await manager.async_discover()
        assert manager.devices == {}

    async def test_discovers_zone_engine_device(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Finds ESPHome device with zone_engine_version entity."""
        ent_reg = er.async_get(hass)
        # Simulate an ESPHome text sensor entity for zone_engine_version
        entry = ent_reg.async_get_or_create(
            domain="sensor",
            platform="esphome",
            unique_id="esphome_aabbccddeeff_zone_engine_version",
            suggested_object_id="epp_zone_engine_version",
            config_entry_id="esphome_entry_1",
        )
        # Create the corresponding device in device registry
        dev_reg = hass.helpers.device_registry.async_get(hass)
        device = dev_reg.async_get_or_create(
            config_entry_id="esphome_entry_1",
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="Everything Presence Pro",
        )
        ent_reg.async_update_entity(entry.entity_id, device_id=device.id)

        await manager.async_discover()
        assert "AA:BB:CC:DD:EE:FF" in manager.devices
        dev = manager.devices["AA:BB:CC:DD:EE:FF"]
        assert dev.name == "Everything Presence Pro"

    async def test_ignores_non_zone_engine_entities(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Entities without zone_engine_version are ignored."""
        ent_reg = er.async_get(hass)
        ent_reg.async_get_or_create(
            domain="sensor",
            platform="esphome",
            unique_id="esphome_aabbccddeeff_temperature",
            suggested_object_id="epp_temperature",
        )
        await manager.async_discover()
        assert manager.devices == {}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_device_manager.py::TestDiscovery -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'custom_components.eppgrid.device_manager'`

- [ ] **Step 3: Implement device manager discovery**

```python
# custom_components/eppgrid/device_manager.py
"""Device manager: discovery, connections, config push, entity management."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN
from .storage import EPPGridStore

_LOGGER = logging.getLogger(__name__)


@dataclass
class ManagedDevice:
    """Tracked ESPHome device with zone engine firmware."""

    mac: str
    name: str
    host: str | None = None
    esphome_config_entry_id: str | None = None
    device_id: str | None = None
    available: bool = False


class DeviceManager:
    """Discovers ESPHome zone engine devices, manages connections and config."""

    def __init__(self, hass: HomeAssistant, store: EPPGridStore) -> None:
        self._hass = hass
        self._store = store
        self.devices: dict[str, ManagedDevice] = {}
        self._unsub_listeners: list[Any] = []

    async def async_start(self) -> None:
        """Start discovery and event listeners."""
        await self.async_discover()
        self._unsub_listeners.append(
            self._hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_entity_registry_updated
            )
        )

    async def async_stop(self) -> None:
        """Stop listeners and close connections."""
        for unsub in self._unsub_listeners:
            unsub()
        self._unsub_listeners.clear()

    async def async_discover(self) -> None:
        """Scan entity registry for ESPHome devices with zone_engine_version."""
        ent_reg = er.async_get(self._hass)
        dev_reg = dr.async_get(self._hass)

        for entry in ent_reg.entities.values():
            if entry.platform != "esphome":
                continue
            if "zone_engine_version" not in entry.unique_id:
                continue
            if entry.device_id is None:
                continue

            device = dev_reg.async_get(entry.device_id)
            if device is None:
                continue

            mac = _extract_mac(device)
            if mac is None:
                continue

            host = _extract_host(device, entry.config_entry_id, self._hass)

            self.devices[mac] = ManagedDevice(
                mac=mac,
                name=device.name or "EPP Device",
                host=host,
                esphome_config_entry_id=entry.config_entry_id,
                device_id=device.id,
            )
            _LOGGER.info("Discovered zone engine device: %s (%s)", device.name, mac)

    @callback
    def _on_entity_registry_updated(self, event: Any) -> None:
        """Handle entity registry changes — re-discover on new entities."""
        if event.data.get("action") == "create":
            self._hass.async_create_task(self.async_discover())

    def list_devices(self) -> list[dict[str, Any]]:
        """Return serializable list of managed devices for the frontend."""
        result = []
        for mac, dev in self.devices.items():
            config = self._store.get_device(mac)
            result.append({
                "mac": mac,
                "name": config.get("name", dev.name) if config else dev.name,
                "host": dev.host,
                "available": dev.available,
                "configured": config is not None,
            })
        return result


def _extract_mac(device: dr.DeviceEntry) -> str | None:
    """Extract MAC address from device connections, normalised to uppercase."""
    for conn_type, conn_id in device.connections:
        if conn_type == "mac":
            return conn_id.upper()
    return None


def _extract_host(
    device: dr.DeviceEntry, config_entry_id: str | None, hass: HomeAssistant
) -> str | None:
    """Try to extract the host/IP from the ESPHome config entry."""
    if config_entry_id is None:
        return None
    entry = hass.config_entries.async_get_entry(config_entry_id)
    if entry is None:
        return None
    return entry.data.get("host")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_device_manager.py::TestDiscovery -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_device_manager.py
git commit -m "Add device manager with ESPHome zone engine discovery"
```

---

### Task 3: Device Manager — On-Demand Connection & Config Push

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py`
- Modify: `tests/test_device_manager.py`

- [ ] **Step 1: Write tests for connection and config push**

Add to `tests/test_device_manager.py`:

```python
from unittest.mock import AsyncMock, patch, MagicMock
from custom_components.eppgrid.device_manager import DeviceConnection


class TestDeviceConnection:
    async def test_connect_and_disconnect(self) -> None:
        """Connection opens and closes cleanly."""
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            client.list_entities_services = AsyncMock(return_value=([], []))
            client.subscribe_states = MagicMock()
            mock_cls.return_value = client

            conn = DeviceConnection("192.168.1.100", 6053)
            await conn.async_connect()
            assert conn.connected is True

            await conn.async_disconnect()
            assert conn.connected is False
            client.disconnect.assert_called_once()

    async def test_push_config(self) -> None:
        """Config push calls the three ESPHome service actions."""
        with patch("custom_components.eppgrid.device_manager.APIClient") as mock_cls:
            client = AsyncMock()
            client.connect = AsyncMock()
            client.disconnect = AsyncMock()
            # Return mock services for epp_set_perspective, epp_set_grid, epp_set_zones
            mock_services = [
                MagicMock(name="epp_set_perspective"),
                MagicMock(name="epp_set_grid"),
                MagicMock(name="epp_set_zones"),
            ]
            client.list_entities_services = AsyncMock(return_value=([], mock_services))
            client.subscribe_states = MagicMock()
            client.execute_service = AsyncMock()
            mock_cls.return_value = client

            conn = DeviceConnection("192.168.1.100", 6053)
            await conn.async_connect()

            config = {
                "calibration": {
                    "perspective": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
                    "room_width": 3000.0,
                    "room_depth": 4000.0,
                },
                "room_layout": {
                    "grid_bytes": [1] * 400,
                    "zone_slots": [None] * 7,
                    "room_type": "normal",
                },
            }
            await conn.async_push_config(config)
            assert client.execute_service.call_count == 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_device_manager.py::TestDeviceConnection -v`
Expected: FAIL — `ImportError: cannot import name 'DeviceConnection'`

- [ ] **Step 3: Implement DeviceConnection class**

Add to `custom_components/eppgrid/device_manager.py`:

```python
import base64
import json

from aioesphomeapi import APIClient
from aioesphomeapi import UserService

from .const import DEFAULT_PORT, MAX_ZONES


class DeviceConnection:
    """On-demand API connection to an EPP device."""

    def __init__(self, host: str, port: int = DEFAULT_PORT, noise_psk: str = "") -> None:
        self._host = host
        self._port = port
        self._noise_psk = noise_psk
        self._client: APIClient | None = None
        self._services: dict[str, UserService] = {}
        self.connected: bool = False

    async def async_connect(self) -> None:
        """Connect to the device and cache available services."""
        self._client = APIClient(self._host, self._port, "", noise_psk=self._noise_psk)
        await self._client.connect(login=True)
        _entities, services = await self._client.list_entities_services()
        self._services = {s.name: s for s in services}
        self.connected = True
        _LOGGER.debug("Connected to %s", self._host)

    async def async_disconnect(self) -> None:
        """Disconnect from the device."""
        if self._client is not None:
            await self._client.disconnect()
        self._client = None
        self._services.clear()
        self.connected = False

    def subscribe_states(self, callback: Any) -> None:
        """Subscribe to all entity state changes on this connection."""
        if self._client is not None:
            self._client.subscribe_states(callback)

    async def async_push_config(self, config: dict[str, Any]) -> None:
        """Push perspective, grid, and zones to the device."""
        if self._client is None:
            return

        cal = config.get("calibration", {})
        perspective = cal.get("perspective")
        if perspective:
            service = self._services.get("epp_set_perspective")
            if service:
                await self._client.execute_service(service, {
                    "perspective": ",".join(str(c) for c in perspective),
                    "room_width": cal.get("room_width", 0.0),
                    "room_depth": cal.get("room_depth", 0.0),
                })
                _LOGGER.info("Pushed perspective to %s", self._host)

        layout = config.get("room_layout", {})
        grid_bytes = layout.get("grid_bytes")
        if grid_bytes:
            service = self._services.get("epp_set_grid")
            if service:
                grid_b64 = base64.b64encode(bytes(grid_bytes)).decode("ascii")
                # Compute origin from grid dimensions (room centered in 20-col grid)
                room_width = cal.get("room_width", 6000.0)
                cell_size = 300
                room_cols = max(1, -(-int(room_width) // cell_size))  # ceil division
                start_col = (20 - room_cols) // 2
                origin_x = -start_col * cell_size
                await self._client.execute_service(service, {
                    "grid_data": grid_b64,
                    "origin_x": float(origin_x),
                    "origin_y": 0.0,
                })
                _LOGGER.info("Pushed grid to %s", self._host)

        zone_slots = layout.get("zone_slots", [None] * MAX_ZONES)
        service = self._services.get("epp_set_zones")
        if service:
            named = [s for s in zone_slots if s is not None]
            zone_data = {
                "zone_slots": zone_slots,
                "room_type": layout.get("room_type", "normal"),
                "room_trigger": layout.get("room_trigger", 5),
                "room_renew": layout.get("room_renew", 3),
                "room_timeout": layout.get("room_timeout", 10.0),
                "room_handoff_timeout": layout.get("room_handoff_timeout", 3.0),
                "room_entry_point": layout.get("room_entry_point", False),
            }
            await self._client.execute_service(service, {
                "zones_json": json.dumps(zone_data),
            })
            _LOGGER.info("Pushed %d zones to %s", len(named), self._host)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_device_manager.py::TestDeviceConnection -v`
Expected: All 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_device_manager.py
git commit -m "Add on-demand device connection and config push"
```

---

### Task 4: Device Manager — Push on Device Reconnect

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py`
- Modify: `tests/test_device_manager.py`

- [ ] **Step 1: Write test for auto-push on availability change**

Add to `tests/test_device_manager.py`:

```python
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import State


class TestAutoConfigPush:
    async def test_push_on_device_available(
        self, hass: HomeAssistant, store: EPPGridStore, manager: DeviceManager
    ) -> None:
        """Config is pushed when a managed device becomes available."""
        await store.async_load()
        store.devices["AA:BB:CC:DD:EE:FF"] = {
            "name": "Test",
            "calibration": {"perspective": [1.0] * 8, "room_width": 3000.0, "room_depth": 4000.0},
            "room_layout": {"grid_bytes": [1] * 400, "zone_slots": [None] * 7, "room_type": "normal"},
        }

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF",
            name="Test",
            host="192.168.1.100",
        )

        with patch.object(manager, "_push_config_to_device", new_callable=AsyncMock) as mock_push:
            await manager._on_device_available("AA:BB:CC:DD:EE:FF")
            mock_push.assert_called_once_with("AA:BB:CC:DD:EE:FF")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_device_manager.py::TestAutoConfigPush -v`
Expected: FAIL — `AttributeError: 'DeviceManager' object has no attribute '_on_device_available'`

- [ ] **Step 3: Implement availability monitoring and auto-push**

Add to `DeviceManager` in `device_manager.py`:

```python
    async def async_start(self) -> None:
        """Start discovery and event listeners."""
        await self.async_discover()
        self._unsub_listeners.append(
            self._hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._on_entity_registry_updated
            )
        )
        # Listen for state changes to detect device availability
        self._unsub_listeners.append(
            self._hass.bus.async_listen("state_changed", self._on_state_changed)
        )

    @callback
    def _on_state_changed(self, event: Any) -> None:
        """Detect when a managed device becomes available."""
        new_state: State | None = event.data.get("new_state")
        old_state: State | None = event.data.get("old_state")
        if new_state is None or old_state is None:
            return
        if old_state.state != STATE_UNAVAILABLE or new_state.state == STATE_UNAVAILABLE:
            return

        # Check if this entity belongs to a managed device
        ent_reg = er.async_get(self._hass)
        entry = ent_reg.async_get(event.data.get("entity_id", ""))
        if entry is None or entry.device_id is None:
            return

        dev_reg = dr.async_get(self._hass)
        device = dev_reg.async_get(entry.device_id)
        if device is None:
            return

        mac = _extract_mac(device)
        if mac and mac in self.devices:
            self._hass.async_create_task(self._on_device_available(mac))

    async def _on_device_available(self, mac: str) -> None:
        """Push stored config when a managed device comes online."""
        _LOGGER.info("Device %s became available, pushing config", mac)
        await self._push_config_to_device(mac)

    async def _push_config_to_device(self, mac: str) -> None:
        """Open a temporary connection, push config, and close."""
        dev = self.devices.get(mac)
        config = self._store.get_device(mac)
        if dev is None or dev.host is None or config is None:
            return
        conn = DeviceConnection(dev.host)
        try:
            await conn.async_connect()
            await conn.async_push_config(config)
        except Exception:
            _LOGGER.warning("Failed to push config to %s (%s)", dev.name, mac)
        finally:
            await conn.async_disconnect()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_device_manager.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_device_manager.py
git commit -m "Add auto config push on device reconnect"
```

---

### Task 5: Device Manager — ESPHome Entity Management

**Files:**
- Modify: `custom_components/eppgrid/device_manager.py`
- Modify: `tests/test_device_manager.py`

- [ ] **Step 1: Write tests for entity enable/disable/rename**

Add to `tests/test_device_manager.py`:

```python
class TestEntityManagement:
    async def test_enable_zone_entities(
        self, hass: HomeAssistant, manager: DeviceManager
    ) -> None:
        """Configuring zones enables corresponding ESPHome entities."""
        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)

        device = dev_reg.async_get_or_create(
            config_entry_id="esphome_entry_1",
            connections={("mac", "aa:bb:cc:dd:ee:ff")},
            name="EPP",
        )

        # Create disabled ESPHome zone occupancy entities
        for i in range(3):
            ent_reg.async_get_or_create(
                domain="binary_sensor",
                platform="esphome",
                unique_id=f"esphome_aabbccddeeff_zone_{i}_occupancy",
                suggested_object_id=f"epp_zone_{i}_occupancy",
                device_id=device.id,
                disabled_by=er.RegistryEntryDisabler.INTEGRATION,
            )

        zone_slots = [
            {"name": "Entrance", "type": "entrance"},
            {"name": "Armchair", "type": "normal"},
            None, None, None, None, None,
        ]

        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="EPP", device_id=device.id
        )

        await manager.async_update_zone_entities("AA:BB:CC:DD:EE:FF", zone_slots)

        # Zone 0 (rest of room) should be enabled
        ent0 = ent_reg.async_get(f"binary_sensor.epp_zone_0_occupancy")
        assert ent0 is not None
        assert ent0.disabled_by is None

        # Zone 1 (Entrance) should be enabled
        ent1 = ent_reg.async_get(f"binary_sensor.epp_zone_1_occupancy")
        assert ent1 is not None
        assert ent1.disabled_by is None

        # Zone 2 (Armchair) should be enabled
        ent2 = ent_reg.async_get(f"binary_sensor.epp_zone_2_occupancy")
        assert ent2 is not None
        assert ent2.disabled_by is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_device_manager.py::TestEntityManagement -v`
Expected: FAIL — `AttributeError: 'DeviceManager' object has no attribute 'async_update_zone_entities'`

- [ ] **Step 3: Implement entity management**

Add to `DeviceManager` in `device_manager.py`:

```python
    async def async_update_zone_entities(
        self, mac: str, zone_slots: list[dict[str, Any] | None]
    ) -> None:
        """Enable/disable and rename ESPHome zone occupancy entities for a device."""
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return

        ent_reg = er.async_get(self._hass)
        has_named_zones = any(z is not None for z in zone_slots)

        for i in range(8):  # zones 0-7
            entity_id = self._find_zone_entity(ent_reg, dev.device_id, i)
            if entity_id is None:
                continue

            if i == 0:
                # Zone 0 "rest of room" — enable if any named zones exist
                if has_named_zones:
                    ent_reg.async_update_entity(entity_id, disabled_by=None)
                else:
                    ent_reg.async_update_entity(
                        entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION
                    )
            elif i <= len(zone_slots) and zone_slots[i - 1] is not None:
                # Named zone — enable and rename
                zone = zone_slots[i - 1]
                ent_reg.async_update_entity(entity_id, disabled_by=None, name=zone["name"])
            else:
                # Unused zone — disable
                ent_reg.async_update_entity(
                    entity_id, disabled_by=er.RegistryEntryDisabler.INTEGRATION
                )

    def _find_zone_entity(
        self, ent_reg: er.EntityRegistry, device_id: str, zone_index: int
    ) -> str | None:
        """Find the ESPHome zone occupancy entity_id for a device and zone index."""
        for entry in ent_reg.entities.values():
            if (
                entry.device_id == device_id
                and entry.platform == "esphome"
                and f"zone_{zone_index}_occupancy" in entry.unique_id
            ):
                return entry.entity_id
        return None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_device_manager.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/device_manager.py tests/test_device_manager.py
git commit -m "Add ESPHome entity enable/disable/rename for zone config"
```

---

### Task 6: Auto-Setup and Panel Registration

**Files:**
- Modify: `custom_components/eppgrid/__init__.py` (rewrite)
- Modify: `custom_components/eppgrid/manifest.json`
- Create: `tests/test_init_v2.py`

- [ ] **Step 1: Write tests for auto-setup**

```python
# tests/test_init_v2.py
"""Tests for EPP Grid auto-setup."""
from __future__ import annotations

from unittest.mock import patch, AsyncMock

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.eppgrid.const import DOMAIN


class TestAutoSetup:
    async def test_setup_registers_panel(self, hass: HomeAssistant) -> None:
        """Setting up the integration registers the sidebar panel."""
        with patch(
            "custom_components.eppgrid.panel_custom.async_register_panel",
            new_callable=AsyncMock,
        ) as mock_panel:
            assert await async_setup_component(hass, DOMAIN, {DOMAIN: {}})
            mock_panel.assert_called_once()

    async def test_setup_stores_manager_in_hass_data(self, hass: HomeAssistant) -> None:
        """Manager is accessible via hass.data[DOMAIN]."""
        assert await async_setup_component(hass, DOMAIN, {DOMAIN: {}})
        assert DOMAIN in hass.data
        assert hasattr(hass.data[DOMAIN], "devices")

    async def test_setup_without_config_key(self, hass: HomeAssistant) -> None:
        """Integration can be loaded without explicit config."""
        assert await async_setup_component(hass, DOMAIN, {})
        assert DOMAIN in hass.data
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_init_v2.py -v`
Expected: FAIL — current `__init__.py` uses `async_setup_entry`, not `async_setup`

- [ ] **Step 3: Update manifest.json**

```json
{
  "domain": "eppgrid",
  "name": "Everything Presence Pro Grid",
  "codeowners": ["@clintongormley"],
  "dependencies": ["http"],
  "documentation": "https://github.com/clintongormley/everythingpro",
  "iot_class": "local_push",
  "issue_tracker": "https://github.com/clintongormley/everythingpro/issues",
  "requirements": ["aioesphomeapi>=29.0.0"],
  "version": "0.2.0"
}
```

Key change: removed `"config_flow": true`.

- [ ] **Step 4: Rewrite `__init__.py`**

```python
# custom_components/eppgrid/__init__.py
"""Everything Presence Pro Grid — calibration UI and device management."""
from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .device_manager import DeviceManager
from .storage import EPPGridStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")


def _hash_file(path: str) -> str:
    """Return MD5 hash prefix of a file for cache-busting."""
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up Everything Presence Pro Grid."""
    store = EPPGridStore(hass)
    await store.async_load()

    manager = DeviceManager(hass, store)

    # Register sidebar panel (unless disabled)
    if store.sidebar_panel:
        await _register_panel(hass)

    async_register_websocket_commands(hass, manager)
    await manager.async_start()

    hass.data[DOMAIN] = manager
    return True


async def _register_panel(hass: HomeAssistant) -> None:
    """Register the frontend sidebar panel."""
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path=f"/{DOMAIN}_static",
            path=FRONTEND_DIR,
            cache_headers=False,
        )
    ])
    js_path = os.path.join(FRONTEND_DIR, "eppgrid-panel.js")
    try:
        js_hash = await hass.async_add_executor_job(_hash_file, js_path)
    except OSError:
        js_hash = "0"
    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path=DOMAIN,
        webcomponent_name="eppgrid-panel",
        module_url=f"/{DOMAIN}_static/eppgrid-panel.js?v={js_hash}",
        sidebar_title="Everything Presence Pro Grid",
        sidebar_icon="mdi:radar",
        require_admin=False,
        config={},
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_init_v2.py -v`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add custom_components/eppgrid/__init__.py custom_components/eppgrid/manifest.json tests/test_init_v2.py
git commit -m "Rewrite init to auto-setup with no config flow"
```

---

### Task 7: Websocket API — Device and Config Commands

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py` (rewrite)
- Create: `tests/test_websocket_api_v2.py`

- [ ] **Step 1: Write tests for list_devices and get_config**

```python
# tests/test_websocket_api_v2.py
"""Tests for EPP Grid websocket API (v2 — MAC-keyed)."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockUser

from custom_components.eppgrid.const import DOMAIN
from custom_components.eppgrid.device_manager import ManagedDevice


@pytest.fixture
async def setup_integration(hass: HomeAssistant) -> None:
    """Set up the integration."""
    assert await async_setup_component(hass, DOMAIN, {DOMAIN: {}})
    await hass.async_block_till_done()


class TestListDevices:
    async def test_list_devices_empty(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns empty list when no devices discovered."""
        client = await hass_ws_client(hass)
        await client.send_json({"id": 1, "type": "eppgrid/list_devices"})
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["devices"] == []

    async def test_list_devices_with_device(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns discovered devices."""
        manager = hass.data[DOMAIN]
        manager.devices["AA:BB:CC:DD:EE:FF"] = ManagedDevice(
            mac="AA:BB:CC:DD:EE:FF", name="Lounge EPP", host="192.168.1.100"
        )
        client = await hass_ws_client(hass)
        await client.send_json({"id": 1, "type": "eppgrid/list_devices"})
        msg = await client.receive_json()
        assert msg["success"] is True
        assert len(msg["result"]["devices"]) == 1
        assert msg["result"]["devices"][0]["mac"] == "AA:BB:CC:DD:EE:FF"


class TestGetConfig:
    async def test_get_config_unknown_device(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns empty config for unconfigured device."""
        client = await hass_ws_client(hass)
        await client.send_json({
            "id": 1,
            "type": "eppgrid/get_config",
            "mac": "AA:BB:CC:DD:EE:FF",
        })
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["config"] is None

    async def test_get_config_known_device(
        self, hass: HomeAssistant, setup_integration, hass_ws_client
    ) -> None:
        """Returns stored config for known device."""
        manager = hass.data[DOMAIN]
        manager._store.devices["AA:BB:CC:DD:EE:FF"] = {"name": "Lounge"}
        client = await hass_ws_client(hass)
        await client.send_json({
            "id": 1,
            "type": "eppgrid/get_config",
            "mac": "AA:BB:CC:DD:EE:FF",
        })
        msg = await client.receive_json()
        assert msg["success"] is True
        assert msg["result"]["config"]["name"] == "Lounge"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_websocket_api_v2.py -v`
Expected: FAIL — current websocket_api.py has different function signatures

- [ ] **Step 3: Rewrite websocket_api.py with core commands**

```python
# custom_components/eppgrid/websocket_api.py
"""WebSocket API for EPP Grid frontend."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

_REGISTERED: set[str] = set()


def async_register_websocket_commands(
    hass: HomeAssistant, manager: Any
) -> None:
    """Register WebSocket commands."""
    if DOMAIN in _REGISTERED:
        return
    _REGISTERED.add(DOMAIN)

    hass.data.setdefault(f"{DOMAIN}_manager_ref", manager)

    websocket_api.async_register_command(hass, websocket_list_devices)
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_set_setup)
    websocket_api.async_register_command(hass, websocket_set_room_layout)
    websocket_api.async_register_command(hass, websocket_list_templates)
    websocket_api.async_register_command(hass, websocket_save_template)
    websocket_api.async_register_command(hass, websocket_delete_template)
    websocket_api.async_register_command(hass, websocket_apply_template)


def _get_manager(hass: HomeAssistant) -> Any:
    """Get the device manager."""
    return hass.data.get(DOMAIN)


# -- list_devices --

@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_devices"})
@callback
def websocket_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List discovered EPP devices."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    connection.send_result(msg["id"], {"devices": manager.list_devices()})


# -- get_config --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/get_config",
    vol.Required("mac"): str,
})
@callback
def websocket_get_config(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get stored config for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    config = manager._store.get_device(msg["mac"])
    connection.send_result(msg["id"], {"config": config})


# -- set_setup (perspective calibration) --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_setup",
    vol.Required("mac"): str,
    vol.Required("perspective"): vol.All([vol.Coerce(float)], vol.Length(min=8, max=8)),
    vol.Required("room_width"): vol.Coerce(float),
    vol.Required("room_depth"): vol.Coerce(float),
})
@websocket_api.async_response
async def websocket_set_setup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save perspective calibration for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["calibration"] = {
        "perspective": msg["perspective"],
        "room_width": msg["room_width"],
        "room_depth": msg["room_depth"],
    }
    # Clear room layout when calibration changes (grid dimensions may differ)
    device_config.pop("room_layout", None)
    await manager._store.async_save()
    connection.send_result(msg["id"])


# -- set_room_layout --

@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/set_room_layout",
    vol.Required("mac"): str,
    vol.Required("grid_bytes"): [int],
    vol.Required("zone_slots"): list,
    vol.Required("room_type"): str,
    vol.Optional("room_trigger"): vol.Coerce(int),
    vol.Optional("room_renew"): vol.Coerce(int),
    vol.Optional("room_timeout"): vol.Coerce(float),
    vol.Optional("room_handoff_timeout"): vol.Coerce(float),
    vol.Optional("room_entry_point", default=False): bool,
    vol.Optional("furniture", default=[]): list,
})
@websocket_api.async_response
async def websocket_set_room_layout(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save room layout, zones, and furniture for a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    mac = msg["mac"]
    device_config = manager._store.devices.setdefault(mac, {})
    device_config["room_layout"] = {
        "grid_bytes": msg["grid_bytes"],
        "zone_slots": msg["zone_slots"],
        "room_type": msg["room_type"],
        "room_trigger": msg.get("room_trigger"),
        "room_renew": msg.get("room_renew"),
        "room_timeout": msg.get("room_timeout"),
        "room_handoff_timeout": msg.get("room_handoff_timeout"),
        "room_entry_point": msg.get("room_entry_point", False),
        "furniture": msg.get("furniture", []),
    }
    await manager._store.async_save()

    # Push config to device if connected
    dev = manager.devices.get(mac)
    if dev and dev.host:
        await manager._push_config_to_device(mac)

    # Update ESPHome entity enable/disable/rename
    await manager.async_update_zone_entities(mac, msg["zone_slots"])

    connection.send_result(msg["id"])


# -- Template commands --

@websocket_api.websocket_command({vol.Required("type"): "eppgrid/list_templates"})
@callback
def websocket_list_templates(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List saved room templates."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    connection.send_result(msg["id"], {"templates": manager._store.templates})


@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/save_template",
    vol.Required("name"): str,
    vol.Required("template"): dict,
})
@websocket_api.async_response
async def websocket_save_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save a room template."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    manager._store.templates[msg["name"]] = msg["template"]
    await manager._store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/delete_template",
    vol.Required("name"): str,
})
@websocket_api.async_response
async def websocket_delete_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a room template."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    manager._store.templates.pop(msg["name"], None)
    await manager._store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/apply_template",
    vol.Required("mac"): str,
    vol.Required("template_name"): str,
})
@websocket_api.async_response
async def websocket_apply_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Apply a template to a device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return
    template = manager._store.templates.get(msg["template_name"])
    if template is None:
        connection.send_error(msg["id"], "not_found", "Template not found")
        return
    device_config = manager._store.devices.setdefault(msg["mac"], {})
    device_config["room_layout"] = dict(template)
    await manager._store.async_save()
    connection.send_result(msg["id"])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_websocket_api_v2.py -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/eppgrid/websocket_api.py tests/test_websocket_api_v2.py
git commit -m "Rewrite websocket API with MAC-keyed commands and templates"
```

---

### Task 8: Websocket API — Live Streaming from Device

**Files:**
- Modify: `custom_components/eppgrid/websocket_api.py`
- Modify: `custom_components/eppgrid/device_manager.py`

This task adds `subscribe_raw_targets` and `subscribe_grid_targets` that open an on-demand connection to the device and stream data directly to the frontend.

- [ ] **Step 1: Add active connection management to DeviceManager**

Add to `DeviceManager` in `device_manager.py`:

```python
    async def async_get_or_create_connection(self, mac: str) -> DeviceConnection | None:
        """Get or create a live connection for the calibration UI."""
        dev = self.devices.get(mac)
        if dev is None or dev.host is None:
            return None
        if mac not in self._active_connections:
            conn = DeviceConnection(dev.host)
            await conn.async_connect()
            self._active_connections[mac] = conn
            self._connection_refcount[mac] = 0
        self._connection_refcount[mac] += 1
        return self._active_connections[mac]

    async def async_release_connection(self, mac: str) -> None:
        """Release a reference to a live connection. Disconnects when last ref released."""
        if mac not in self._connection_refcount:
            return
        self._connection_refcount[mac] -= 1
        if self._connection_refcount[mac] <= 0:
            conn = self._active_connections.pop(mac, None)
            self._connection_refcount.pop(mac, None)
            if conn is not None:
                await conn.async_disconnect()
```

Add to `__init__` of `DeviceManager`:

```python
        self._active_connections: dict[str, DeviceConnection] = {}
        self._connection_refcount: dict[str, int] = {}
```

- [ ] **Step 2: Add subscribe_grid_targets websocket command**

Add to `websocket_api.py`:

```python
@websocket_api.websocket_command({
    vol.Required("type"): "eppgrid/subscribe_grid_targets",
    vol.Required("mac"): str,
})
@websocket_api.async_response
async def websocket_subscribe_grid_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stream target positions and zone state from device."""
    manager = _get_manager(hass)
    if manager is None:
        connection.send_error(msg["id"], "not_ready", "Integration not loaded")
        return

    mac = msg["mac"]
    device_conn = await manager.async_get_or_create_connection(mac)
    if device_conn is None:
        connection.send_error(msg["id"], "not_found", "Device not available")
        return

    @callback
    def _on_state(state: Any) -> None:
        """Forward device state to frontend."""
        from aioesphomeapi import BinarySensorState, SensorState, TextSensorState

        data: dict[str, Any] = {}
        if isinstance(state, TextSensorState):
            data = {"type": "text", "key": state.key, "state": state.state}
        elif isinstance(state, BinarySensorState):
            data = {"type": "binary", "key": state.key, "state": state.state}
        elif isinstance(state, SensorState):
            data = {"type": "sensor", "key": state.key, "state": state.state}
        if data:
            connection.send_message(
                websocket_api.event_message(msg["id"], data)
            )

    device_conn.subscribe_states(_on_state)
    connection.send_result(msg["id"])

    @callback
    def _unsub() -> None:
        hass.async_create_task(manager.async_release_connection(mac))

    connection.subscriptions[msg["id"]] = _unsub
```

Register the command in `async_register_websocket_commands`:

```python
    websocket_api.async_register_command(hass, websocket_subscribe_grid_targets)
```

- [ ] **Step 3: Commit**

```bash
git add custom_components/eppgrid/device_manager.py custom_components/eppgrid/websocket_api.py
git commit -m "Add live device streaming via on-demand connections"
```

---

### Task 9: Dev Mode Gating

**Files:**
- Modify: `custom_components/eppgrid/__init__.py`

- [ ] **Step 1: Add dev mode conditional loading**

Add to the top of `__init__.py`, after imports:

```python
import os

DEV_MODE = bool(os.environ.get("EPPGRID_DEV_MODE"))
```

At the end of `async_setup`, after `manager.async_start()`:

```python
    if DEV_MODE:
        _LOGGER.info("Dev mode enabled — loading Python zone engine and recording tools")
        from .coordinator import EPPGridCoordinator  # noqa: F401
        # Dev-mode websocket commands can be registered here in future
```

- [ ] **Step 2: Commit**

```bash
git add custom_components/eppgrid/__init__.py
git commit -m "Gate dev mode imports behind EPPGRID_DEV_MODE env var"
```

---

### Task 10: Cleanup Old Files

**Files:**
- Remove from production imports: `binary_sensor.py`, `sensor.py`, `config_flow.py`
- Modify: `custom_components/eppgrid/const.py` (slim down)

- [ ] **Step 1: Slim down const.py**

Remove entity pattern constants (`TARGET_X_PATTERN`, etc.) and `threshold_to_frame_count` — those are only used by the Python zone engine. Keep grid constants, zone type constants, and `DEFAULT_PORT`.

- [ ] **Step 2: Remove config_flow.py, strings.json, translations/en.json**

These files are no longer needed since there's no config flow.

```bash
git rm custom_components/eppgrid/config_flow.py
git rm custom_components/eppgrid/strings.json
git rm -r custom_components/eppgrid/translations/
```

- [ ] **Step 3: Move old entity platforms to dev-only**

Don't delete `binary_sensor.py`, `sensor.py`, `coordinator.py`, `zone_engine.py`, `calibration.py` — they're still needed for dev mode. But ensure they're not imported in the production path (which they aren't after the `__init__.py` rewrite).

- [ ] **Step 4: Update conftest.py**

Replace the old fixtures that mock config entries and APIClient with new fixtures for the redesigned integration:

```python
# tests/conftest.py
"""Fixtures for Everything Presence Pro tests."""
from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable custom integrations for all tests."""
    yield
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove config flow, slim constants, update test fixtures"
```

---

## Frontend Changes Required (Not in This Plan)

The frontend (`frontend/src/eppgrid-panel.ts`) will need updates in a separate plan:

1. Replace `entry_id` with `mac` in all websocket commands
2. Use `eppgrid/list_devices` instead of `eppgrid/list_entries`
3. Handle the new `subscribe_grid_targets` event format (raw ESPHome state updates instead of pre-processed data)
4. Add template UI (list, save, apply, delete)

These changes require the frontend build toolchain and are a separate body of work.
