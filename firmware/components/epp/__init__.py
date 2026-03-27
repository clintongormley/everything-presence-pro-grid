"""EPP Zone Engine ESPHome external component."""

import os

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import binary_sensor
from esphome.components import text_sensor
from esphome.const import CONF_ID

CODEOWNERS = ["@clintongormley"]
DEPENDENCIES = ["json"]
AUTO_LOAD = ["binary_sensor", "text_sensor"]

epp_ns = cg.esphome_ns.namespace("epp")
EPPComponent = epp_ns.class_("EPPComponent", cg.Component)

CONF_DEVICE_TRACKING = "device_tracking"
CONF_FIRMWARE_VERSION = "firmware_version"
CONF_ZONE_OCCUPANCY = "zone_occupancy"
CONF_TARGET_POSITIONS = "target_positions"

ZONE_OCCUPANCY_SCHEMA = cv.Schema({cv.Optional(f"zone_{i}"): binary_sensor.binary_sensor_schema() for i in range(8)})

TARGET_POSITIONS_SCHEMA = cv.Schema({cv.Optional(f"target_{i}"): text_sensor.text_sensor_schema() for i in range(3)})

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(EPPComponent),
        cv.Optional(CONF_DEVICE_TRACKING): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_FIRMWARE_VERSION): text_sensor.text_sensor_schema(),
        cv.Optional(CONF_ZONE_OCCUPANCY): ZONE_OCCUPANCY_SCHEMA,
        cv.Optional(CONF_TARGET_POSITIONS): TARGET_POSITIONS_SCHEMA,
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)

    # Add zone engine library
    lib_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "lib"))
    cg.add_platformio_option("lib_extra_dirs", lib_dir)
    cg.add_library("epp_zone_engine", None)

    # Device tracking binary sensor
    if CONF_DEVICE_TRACKING in config:
        sens = await binary_sensor.new_binary_sensor(config[CONF_DEVICE_TRACKING])
        cg.add(var.set_device_tracking_sensor(sens))

    # Firmware version text sensor
    if CONF_FIRMWARE_VERSION in config:
        sens = await text_sensor.new_text_sensor(config[CONF_FIRMWARE_VERSION])
        cg.add(var.set_firmware_version_sensor(sens))

    # Zone occupancy binary sensors (zones 0-7)
    if CONF_ZONE_OCCUPANCY in config:
        zone_conf = config[CONF_ZONE_OCCUPANCY]
        for i in range(8):
            key = f"zone_{i}"
            if key in zone_conf:
                sens = await binary_sensor.new_binary_sensor(zone_conf[key])
                cg.add(var.set_zone_occupancy_sensor(i, sens))

    # Target position text sensors (targets 0-2)
    if CONF_TARGET_POSITIONS in config:
        target_conf = config[CONF_TARGET_POSITIONS]
        for i in range(3):
            key = f"target_{i}"
            if key in target_conf:
                sens = await text_sensor.new_text_sensor(target_conf[key])
                cg.add(var.set_target_position_sensor(i, sens))
