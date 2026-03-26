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
