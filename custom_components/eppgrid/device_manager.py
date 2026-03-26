"""Device manager: discovery, connections, config push, entity management."""
from __future__ import annotations

import base64
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from aioesphomeapi import APIClient
from aioesphomeapi import UserService
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant, State, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DEFAULT_PORT, MAX_ZONES
from .storage import EPPGridStore

_LOGGER = logging.getLogger(__name__)

# Regex to extract the ESPHome object_id from a unique_id
# Format: esphome_{mac_hex_12}_{object_id} or {mac_hex_12}_{object_id}
_ESPHOME_UID_RE = re.compile(r"^(?:esphome_)?[0-9a-f]{12}_(.+)$")

# ESPHome entity object_ids to keep enabled
_KEEP_ENTITIES = frozenset({
    "humidity", "illuminance", "temperature", "co2",
    "mmwave_presence", "occupancy", "static_presence",
    "tracking_presence", "motion",
    "zone_engine_version",
})

# Entity object_ids to leave alone (user will decide later)
_DEFER_ENTITIES = frozenset({
    "firmware_update",
    "led", "led_brightness", "led_mode",
    "relay_contact_mode", "relay_output", "relay_trigger_mode",
    "restart_device", "reboot_tracking_sensor",
})

# Entity renames applied on discovery
_ENTITY_RENAMES = {
    "motion": "Motion Presence",
}


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
        if self.connected:
            return
        client = APIClient(self._host, self._port, "", noise_psk=self._noise_psk)
        try:
            await client.connect(login=True)
            _entities, services = await client.list_entities_services()
        except Exception:
            await client.disconnect()
            raise
        self._client = client
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
        self._pushing: set[str] = set()
        self._active_connections: dict[str, DeviceConnection] = {}
        self._connection_refcount: dict[str, int] = {}

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

            # Manage all device entities: disable old firmware, rename
            await self.async_manage_device_entities(mac)

            # Apply zone entity management
            config = self._store.get_device(mac)
            zone_slots = (
                config.get("room_layout", {}).get("zone_slots", [None] * MAX_ZONES)
                if config else [None] * MAX_ZONES
            )
            await self.async_update_zone_entities(mac, zone_slots)

    @callback
    def _on_entity_registry_updated(self, event: Any) -> None:
        """Handle entity registry changes — re-discover on new entities."""
        if event.data.get("action") == "create":
            self._hass.async_create_task(self.async_discover())

    @callback
    def _on_state_changed(self, event: Any) -> None:
        """Detect when a managed device becomes available."""
        new_state: State | None = event.data.get("new_state")
        old_state: State | None = event.data.get("old_state")
        if new_state is None or old_state is None:
            return
        if old_state.state != STATE_UNAVAILABLE or new_state.state == STATE_UNAVAILABLE:
            return

        # Check if this entity belongs to a managed ESPHome device
        ent_reg = er.async_get(self._hass)
        entry = ent_reg.async_get(event.data.get("entity_id", ""))
        if entry is None or entry.platform != "esphome" or entry.device_id is None:
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
        if mac in self._pushing:
            return
        self._pushing.add(mac)
        try:
            _LOGGER.info("Device %s became available, pushing config", mac)
            await self._push_config_to_device(mac)
        finally:
            self._pushing.discard(mac)

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
            _LOGGER.warning("Failed to push config to %s (%s)", dev.name, mac, exc_info=True)
        finally:
            await conn.async_disconnect()

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

    async def async_manage_device_entities(self, mac: str) -> None:
        """Disable old firmware entities and rename on discovery."""
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return

        ent_reg = er.async_get(self._hass)
        disabled_count = 0

        for entry in ent_reg.entities.values():
            if entry.device_id != dev.device_id or entry.platform != "esphome":
                continue

            obj_id = _extract_esphome_object_id(entry.unique_id)
            if obj_id is None:
                continue

            # Zone entities handled by async_update_zone_entities
            if re.match(r"zone_\d+_occupancy", obj_id):
                continue

            if obj_id in _KEEP_ENTITIES:
                # Apply rename if needed
                if obj_id in _ENTITY_RENAMES:
                    ent_reg.async_update_entity(
                        entry.entity_id, name=_ENTITY_RENAMES[obj_id]
                    )
            elif obj_id in _DEFER_ENTITIES:
                continue  # don't touch — user will decide later
            else:
                # Disable old firmware / unnecessary entities
                if entry.disabled_by is None:
                    ent_reg.async_update_entity(
                        entry.entity_id,
                        disabled_by=er.RegistryEntryDisabler.INTEGRATION,
                    )
                    disabled_count += 1

        if disabled_count:
            _LOGGER.info(
                "Disabled %d old firmware entities for %s (%s)",
                disabled_count, dev.name, mac,
            )

    async def async_update_zone_entities(
        self, mac: str, zone_slots: list[dict[str, Any] | None]
    ) -> None:
        """Enable/disable and rename ESPHome zone occupancy entities for a device."""
        dev = self.devices.get(mac)
        if dev is None or dev.device_id is None:
            return

        ent_reg = er.async_get(self._hass)
        config = self._store.get_device(mac)
        is_calibrated = config is not None and "calibration" in config

        for i in range(8):  # zones 0-7
            entity_id = self._find_zone_entity(ent_reg, dev.device_id, i)
            if entity_id is None:
                continue

            if i == 0:
                # Zone 0 "rest of room" — enable if device is calibrated
                if is_calibrated:
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


def _extract_esphome_object_id(unique_id: str) -> str | None:
    """Extract the object_id from an ESPHome unique_id."""
    m = _ESPHOME_UID_RE.match(unique_id)
    return m.group(1) if m else None


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
