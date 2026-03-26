"""Device manager: discovery, connections, config push, entity management."""
from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass
from typing import Any

from aioesphomeapi import APIClient
from aioesphomeapi import UserService
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DEFAULT_PORT, MAX_ZONES
from .storage import EPPGridStore

_LOGGER = logging.getLogger(__name__)


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
