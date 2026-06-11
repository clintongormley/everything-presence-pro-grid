cmake_minimum_required(VERSION 3.14)
project(epp_component_helpers LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(CMAKE_BUILD_TYPE STREQUAL "Coverage")
    add_compile_options(--coverage)
    add_link_options(--coverage)
endif()

# Header-only library (all helpers are inline templates / constexpr today)
add_library(epp_component_helpers INTERFACE)
target_include_directories(epp_component_helpers INTERFACE include)

# The NVS layout constants depend on GRID_CELL_COUNT from epp_zone_engine's
# epp_types.h. Pull in the sibling lib's headers so host tests can include
# epp_nvs_layout.h without manual -I flags.
target_include_directories(epp_component_helpers INTERFACE
    ${CMAKE_CURRENT_LIST_DIR}/../epp_zone_engine/include
)


# Tests
option(EPP_HELPERS_BUILD_TESTS "Build tests" ON)
if(EPP_HELPERS_BUILD_TESTS)
    enable_testing()

    include(FetchContent)
    FetchContent_Declare(
        doctest
        GIT_REPOSITORY https://github.com/doctest/doctest.git
        GIT_TAG v2.4.11
    )
    FetchContent_MakeAvailable(doctest)

    add_subdirectory(tests)
endif()
