#!/usr/bin/env bash
# Validates release version alignment. Runs in CI on tag push.
#
# Usage: .github/scripts/validate-release.sh <tag-version>
#
# Exits 0 if all invariants hold, non-zero with a clear error otherwise.
# Invariants:
#   (1) custom_components/eppgrid/manifest.json version == <tag-version>
#   (2) custom_components/eppgrid/const.py FIRMWARE_VERSION ==
#       firmware/common/epp-core.yaml esphome.project.version
#
# The firmware C++ header (epp_component.h) derives FIRMWARE_VERSION_STR from
# the ESPHOME_PROJECT_VERSION preprocessor macro, which ESPHome populates from
# esphome.project.version at compile time. We don't compare a literal version
# from the header, but we do re-assert the structural invariant ("header uses
# the macro") below so a regression that bypasses the test suite still fails
# at tag push.
#
# Note: firmware version does NOT have to equal the tag. Integration-only
# releases have manifest=new, firmware=unchanged. The workflow decides
# whether to build firmware based on whether firmware_version == tag.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <tag-version>" >&2
  exit 2
fi

TAG="$1"

MANIFEST_VER=$(python3 -c "import json; print(json.load(open('custom_components/eppgrid/manifest.json'))['version'])")

if [ "$TAG" != "$MANIFEST_VER" ]; then
  echo "::error::Tag v$TAG does not match manifest.json version $MANIFEST_VER" >&2
  exit 1
fi

# Two-way firmware-version alignment.
CONST_FW=$(python3 -c "
import re
text = open('custom_components/eppgrid/const.py').read()
m = re.search(r'^FIRMWARE_VERSION\s*=\s*\"([^\"]+)\"', text, re.M)
print(m.group(1) if m else '')
")
if [ -z "$CONST_FW" ]; then
  echo "::error::Could not extract FIRMWARE_VERSION from custom_components/eppgrid/const.py" >&2
  exit 1
fi

YAML_FW=$(python3 -c "
import re
text = open('firmware/common/epp-core.yaml').read()
m = re.search(r'^ {4}version:\s*\"([^\"]+)\"', text, re.M)
print(m.group(1) if m else '')
")
if [ -z "$YAML_FW" ]; then
  echo "::error::Could not extract version from firmware/common/epp-core.yaml" >&2
  exit 1
fi

if [ "$CONST_FW" != "$YAML_FW" ]; then
  echo "::error::Firmware versions disagree:" >&2
  echo "  const.py FIRMWARE_VERSION = $CONST_FW" >&2
  echo "  epp-core.yaml version = $YAML_FW" >&2
  exit 1
fi

# Structural invariant: epp_component.h must derive FIRMWARE_VERSION_STR from
# the ESPHOME_PROJECT_VERSION macro. The unit-test suite enforces this on PRs,
# but this script is the only validation that runs on tag push, so re-check
# here to catch a regression that bypassed the test suite (e.g. a tag pushed
# at an older commit, or a direct push to main).
HEADER_FILE="firmware/components/epp/epp_component.h"
if ! grep -Eq 'FIRMWARE_VERSION_STR[[:space:]]*=[[:space:]]*ESPHOME_PROJECT_VERSION' "$HEADER_FILE"; then
  echo "::error::epp_component.h must derive FIRMWARE_VERSION_STR from ESPHOME_PROJECT_VERSION;" >&2
  echo "  hardcoded literals would ship mis-versioned firmware (see tests/test_firmware_version_alignment.py)." >&2
  exit 1
fi
