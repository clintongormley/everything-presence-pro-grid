"""Zone entity name translations.

These strings are applied via `entity_registry.async_update_entity(name=...)` to
ESPHome-owned entities at zone create/update time. They are NOT registered
through HA's standard `strings.json` translation system because:

- We do not own the entities — they are platform-provided by ESPHome — so the
  HA `entity.<domain>.<key>.name` mechanism (which requires `_attr_translation_key`
  on entity classes we control) does not apply.
- Hassfest's strings.json schema does not permit custom top-level namespaces.

The structural prefix ("Zone", "Target Count") translates per the user's HA
locale; the user-provided portion (`{name}`) passes through verbatim.
"""

from __future__ import annotations

ZONE_NAMES: dict[str, dict[str, str]] = {
    "en": {
        "zone_rest_of_room": "Zone Rest of Room",
        "zone_with_name": "Zone {name}",
        "zone_rest_of_room_target_count": "Zone Rest of Room Target Count",
        "zone_with_name_target_count": "Zone {name} Target Count",
    },
    "es": {
        "zone_rest_of_room": "Zona Resto de la habitación",
        "zone_with_name": "Zona {name}",
        "zone_rest_of_room_target_count": "Número de objetivos en zona Resto de la habitación",
        "zone_with_name_target_count": "Número de objetivos en zona {name}",
    },
    "cs": {
        "zone_rest_of_room": "Zóna Zbytek místnosti",
        "zone_with_name": "Zóna {name}",
        "zone_rest_of_room_target_count": "Počet cílů v zóně Zbytek místnosti",
        "zone_with_name_target_count": "Počet cílů v zóně {name}",
    },
}
