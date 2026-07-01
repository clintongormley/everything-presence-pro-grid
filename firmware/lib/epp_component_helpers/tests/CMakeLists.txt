add_executable(epp_helpers_nvs_layout_tests
    test_nvs_layout.cpp
)
target_link_libraries(epp_helpers_nvs_layout_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_change_detector_tests
    test_change_detector.cpp
)
target_link_libraries(epp_helpers_change_detector_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_frame_ring_buffer_tests
    test_frame_ring_buffer.cpp
)
target_link_libraries(epp_helpers_frame_ring_buffer_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_target_validity_tests
    test_target_validity.cpp
)
target_link_libraries(epp_helpers_target_validity_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_json_writer_tests
    test_json_writer.cpp
)
target_link_libraries(epp_helpers_json_writer_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_event_codec_tests
    test_event_codec.cpp
)
target_link_libraries(epp_helpers_event_codec_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_perspective_parser_tests
    test_perspective_parser.cpp
)
target_link_libraries(epp_helpers_perspective_parser_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_relay_publish_tests
    test_relay_publish.cpp
)
target_link_libraries(epp_helpers_relay_publish_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_frame_staleness_tests
    test_frame_staleness.cpp
)
target_link_libraries(epp_helpers_frame_staleness_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_indexed_setter_tests
    test_indexed_setter.cpp
)
target_link_libraries(epp_helpers_indexed_setter_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_heatmap_tests
    test_epp_heatmap.cpp
)
target_link_libraries(epp_helpers_heatmap_tests PRIVATE epp_component_helpers doctest::doctest)

# target_zone_or_invalid calls Grid (a compiled class from epp_zone_engine).
# Compile the needed epp_zone_engine sources directly into this test executable
# rather than adding the sibling lib as a subdirectory (which would pull in its
# own FetchContent declarations for ArduinoJson/doctest).
set(EPP_ZONE_ENGINE_SRC ${CMAKE_CURRENT_LIST_DIR}/../../epp_zone_engine/src)
add_executable(epp_helpers_target_zone_tests
    test_target_zone.cpp
    ${EPP_ZONE_ENGINE_SRC}/epp_grid.cpp
    ${EPP_ZONE_ENGINE_SRC}/epp_calibration.cpp
    ${EPP_ZONE_ENGINE_SRC}/epp_rolling_window.cpp
    ${EPP_ZONE_ENGINE_SRC}/epp_zone_engine.cpp
)
target_link_libraries(epp_helpers_target_zone_tests PRIVATE epp_component_helpers doctest::doctest)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(epp_helpers_nvs_layout_tests)
doctest_discover_tests(epp_helpers_change_detector_tests)
doctest_discover_tests(epp_helpers_frame_ring_buffer_tests)
doctest_discover_tests(epp_helpers_target_validity_tests)
doctest_discover_tests(epp_helpers_json_writer_tests)
doctest_discover_tests(epp_helpers_event_codec_tests)
doctest_discover_tests(epp_helpers_perspective_parser_tests)
doctest_discover_tests(epp_helpers_relay_publish_tests)
doctest_discover_tests(epp_helpers_frame_staleness_tests)
doctest_discover_tests(epp_helpers_indexed_setter_tests)
doctest_discover_tests(epp_helpers_heatmap_tests)
doctest_discover_tests(epp_helpers_target_zone_tests)
