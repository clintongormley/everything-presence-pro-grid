cmake_minimum_required(VERSION 3.14)
project(epp_zone_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Library
add_library(epp_zone_engine
    src/epp_grid.cpp
    src/epp_tumbling_window.cpp
    src/epp_rolling_window.cpp
    src/epp_zone_engine.cpp
    src/epp_calibration.cpp
)
target_include_directories(epp_zone_engine PUBLIC include)

# JSON library (needed by tools and tests)
include(FetchContent)
FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(json)

# Replay tool (host binary, not for ESP32)
option(EPP_BUILD_TOOLS "Build host tools" ON)
if(EPP_BUILD_TOOLS)
    add_executable(replay tools/replay.cpp)
    target_link_libraries(replay PRIVATE epp_zone_engine nlohmann_json::nlohmann_json)
endif()

# Tests
option(EPP_BUILD_TESTS "Build tests" ON)
if(EPP_BUILD_TESTS)
    enable_testing()
    FetchContent_Declare(
        doctest
        GIT_REPOSITORY https://github.com/doctest/doctest.git
        GIT_TAG v2.4.11
    )
    FetchContent_MakeAvailable(doctest)

    add_subdirectory(tests)
endif()
