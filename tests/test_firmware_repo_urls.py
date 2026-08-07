"""Firmware URLs follow the repository the firmware was built from.

A device fetches its updates from a URL baked into the firmware, and the panel
fetches flashable artifacts from a URL baked into the integration. If either
still names upstream on a fork, that fork's devices silently check upstream for
firmware — offered a build for a repo they were never flashed from, or a 404 if
the version does not exist there.

Two mechanisms, because the two layers ship differently:

  firmware/    `epp_repo_owner` / `epp_repo_name` substitutions, defaulted to
               upstream in epp-core.yaml and overridden by CI from
               $GITHUB_REPOSITORY, so a fork needs no edit at all.
  integration/ GITHUB_OWNER / GITHUB_REPO in const.py. HACS ships
               custom_components/ verbatim, so there is no build step to
               substitute into and a fork edits one line.

These tests keep both honest: no literal owner may creep back into either.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from tests.esphome_yaml import CORE_YAML
from tests.esphome_yaml import REPO_ROOT
from tests.esphome_yaml import load_yaml

VARIANTS_DIR = REPO_ROOT / "firmware" / "variants"
VARIANT_FILES = sorted(VARIANTS_DIR.glob("*.yaml"))

# The upstream owner. Allowed to appear only where it is *declared* as a
# default, never inlined into a URL.
UPSTREAM_OWNER = "clintongormley"


# ---------------------------------------------------------------------------
# Firmware: substitutions, not literals
# ---------------------------------------------------------------------------


def test_core_declares_the_repo_substitutions() -> None:
    """Defaults live in the shared core, so a variant cannot disagree with its
    siblings about which repo it belongs to."""
    subs = load_yaml(CORE_YAML)["substitutions"]
    assert subs["epp_repo_owner"] == UPSTREAM_OWNER
    assert subs["epp_repo_name"] == "everything-presence-pro-grid"


@pytest.mark.parametrize("variant", VARIANT_FILES, ids=lambda p: p.stem)
def test_variant_urls_are_substituted(variant: Path) -> None:
    """Both baked-in URLs must go through the substitutions.

    `package_import_url` is where the ESPHome dashboard says this config came
    from; `update.source` is the fw/latest manifest the device's own update
    entity polls. A literal owner in either pins a fork's devices to upstream.
    """
    doc = load_yaml(variant)

    import_url = doc["dashboard_import"]["package_import_url"]
    assert "${epp_repo_owner}" in import_url, import_url
    assert "${epp_repo_name}" in import_url, import_url

    sources = [entry["source"] for entry in doc["update"] if isinstance(entry, dict) and "source" in entry]
    assert sources, f"{variant.name} declares no update source"
    for source in sources:
        assert "${epp_repo_owner}" in source, source
        assert "${epp_repo_name}" in source, source


@pytest.mark.parametrize("variant", VARIANT_FILES, ids=lambda p: p.stem)
def test_no_literal_owner_left_in_a_variant(variant: Path) -> None:
    """Catches a hand-edited URL that bypassed the substitutions."""
    assert UPSTREAM_OWNER not in variant.read_text(), (
        f"{variant.name} names {UPSTREAM_OWNER!r} directly. Use "
        f"${{epp_repo_owner}} / ${{epp_repo_name}} so a fork's CI can retarget it."
    )


# ---------------------------------------------------------------------------
# CI passes the override, and passes it somewhere it actually takes effect
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("workflow", ["firmware.yml", "firmware-release.yml"])
def test_compile_step_overrides_the_repo(workflow: str) -> None:
    """Both workflows must retarget the build at the repo they run in.

    Without this a fork's release would build firmware pointing at upstream's
    Pages, which is the whole failure this indirection exists to prevent.
    """
    text = (REPO_ROOT / ".github" / "workflows" / workflow).read_text()
    assert "epp_repo_owner" in text and "epp_repo_name" in text, (
        f"{workflow} compiles without overriding the repo substitutions."
    )
    assert "GITHUB_REPOSITORY" in text, (
        f"{workflow} should derive the repo from $GITHUB_REPOSITORY so forks need no edit."
    )


@pytest.mark.parametrize("workflow", ["firmware.yml", "firmware-release.yml"])
def test_substitution_flag_precedes_the_subcommand(workflow: str) -> None:
    """`-s` is a *global* esphome option and is silently ignored after the subcommand.

    `esphome compile x.yaml -s key value` exits 0 having changed nothing, so
    the mistake produces firmware that looks built but still points upstream —
    nothing fails, and the wrong URL only surfaces on a user's device.
    """
    text = (REPO_ROOT / ".github" / "workflows" / workflow).read_text()
    # Collapse shell line continuations first, so a multi-line invocation is one
    # string to scan. Do not try to regex across `\`-newline directly: a greedy
    # `[^\n]*` swallows the backslash, the match stops at the first line, and a
    # misplaced `-s` on a later line is never seen.
    joined = re.sub(r"\\\n\s*", " ", text)

    checked = 0
    for line in joined.splitlines():
        if "esphome " not in line or "-s " not in line:
            continue
        invocation = line[line.index("esphome ") :]
        checked += 1
        flag_at = invocation.index("-s ")
        subcommand_at = min(
            (invocation.index(sub) for sub in ("compile", "config", "run") if sub in invocation),
            default=len(invocation),
        )
        assert flag_at < subcommand_at, (
            f"{workflow}: `-s` appears after the subcommand in:\n  {invocation.strip()}\n"
            f"esphome ignores it there — move it before `compile`."
        )
    assert checked, f"{workflow} has no esphome invocation passing -s; the override is missing entirely."


# ---------------------------------------------------------------------------
# Integration: one slug, both URLs derived
# ---------------------------------------------------------------------------


def test_both_urls_derive_from_the_slug() -> None:
    """Editing GITHUB_OWNER alone must move both URLs.

    They point at different hosts (release assets vs Pages) for reasons
    documented in const.py, which is exactly why it would be easy to retarget
    one and forget the other.
    """
    from custom_components.eppgrid.const import GITHUB_OWNER
    from custom_components.eppgrid.const import GITHUB_REPO
    from custom_components.eppgrid.const import MANIFEST_BASE_URL
    from custom_components.eppgrid.const import OTA_MANIFEST_BASE_URL

    assert MANIFEST_BASE_URL.startswith(f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/")
    assert OTA_MANIFEST_BASE_URL.startswith(f"https://{GITHUB_OWNER}.github.io/{GITHUB_REPO}/")


def test_no_literal_owner_outside_the_slug() -> None:
    """No module may hardcode the owner around the constants.

    const.py declares it once; anywhere else re-inlining it would leave a fork
    with a URL that quietly still points upstream. manifest.json is exempt —
    its documentation/issue_tracker/codeowners are repo metadata, not firmware
    URLs, and a fork updates them separately.
    """
    package = REPO_ROOT / "custom_components" / "eppgrid"
    offenders = []
    for path in sorted(package.rglob("*.py")):
        for lineno, line in enumerate(path.read_text().splitlines(), 1):
            if UPSTREAM_OWNER not in line:
                continue
            if path.name == "const.py" and line.startswith("GITHUB_OWNER"):
                continue  # the one declaration
            offenders.append(f"{path.relative_to(REPO_ROOT)}:{lineno}: {line.strip()}")
    assert not offenders, "hardcoded owner outside the GITHUB_OWNER constant:\n" + "\n".join(offenders)
