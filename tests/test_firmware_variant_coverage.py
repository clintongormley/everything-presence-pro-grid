"""Every firmware variant is built, staged, and verified.

A variant's name is written out by hand in five places, none of which fail
loudly when they disagree:

  firmware/variants/*.yaml                     the variants that exist
  .github/workflows/firmware.yml               what PRs and main compile
  .github/workflows/firmware-release.yml       what a tag builds
  .github/scripts/stage-firmware.sh            what gets published to Pages
  .github/scripts/verify_deployed_firmware.py  what the post-release check reads

Adding a variant to some but not all of them fails in a way nobody sees until a
user tries to flash. A variant in the release matrix but not in
stage-firmware.sh builds and uploads firmware, then never publishes
`fw/latest/{variant}.json` — the exact URL the device's own `update:` platform
and the integration's OTA button both fetch. Both 404, and post-release
verification still reports success if its own list omits the variant too.

These tests compare the five lists so that gap cannot open.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
VARIANTS_DIR = REPO_ROOT / "firmware" / "variants"
FIRMWARE_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "firmware.yml"
RELEASE_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "firmware-release.yml"
STAGE_SCRIPT = REPO_ROOT / ".github" / "scripts" / "stage-firmware.sh"
VERIFY_SCRIPT = REPO_ROOT / ".github" / "scripts" / "verify_deployed_firmware.py"


def _variants_on_disk() -> set[str]:
    return {p.stem for p in VARIANTS_DIR.glob("*.yaml")}


def _release_matrix_variants() -> set[str]:
    """The `variant:` list under the release workflow's build matrix."""
    text = RELEASE_WORKFLOW.read_text()
    block = re.search(r"^        variant:\n((?:^          - \S+\n)+)", text, re.MULTILINE)
    assert block, "could not find the build matrix `variant:` list in firmware-release.yml"
    return set(re.findall(r"- (\S+)", block.group(1)))


def _firmware_workflow_variant_lists() -> tuple[set[str], set[str]]:
    """(main-branch list, pull-request list) from the fromJSON matrix expression."""
    text = FIRMWARE_WORKFLOW.read_text()
    lists = re.findall(r"fromJSON\('(\[[^']*\])'\)", text)
    assert len(lists) == 2, f"expected two fromJSON variant lists in firmware.yml, found {len(lists)}"
    return set(json.loads(lists[0])), set(json.loads(lists[1]))


def _stage_script_variants() -> set[str]:
    match = re.search(r"^VARIANTS=\(([^)]*)\)", STAGE_SCRIPT.read_text(), re.MULTILINE)
    assert match, "could not find VARIANTS=(...) in stage-firmware.sh"
    return set(match.group(1).split())


def _verify_script_variants() -> set[str]:
    match = re.search(r"^VARIANTS = \(([^)]*)\)", VERIFY_SCRIPT.read_text(), re.MULTILINE)
    assert match, "could not find VARIANTS = (...) in verify_deployed_firmware.py"
    return set(re.findall(r'"([^"]+)"', match.group(1)))


def test_release_builds_every_variant() -> None:
    """A variant missing here is simply never built for a release."""
    assert _release_matrix_variants() == _variants_on_disk()


def test_main_branch_compiles_every_variant() -> None:
    """The push-to-main matrix is the only place every variant is compiled
    before a tag; a gap here means a broken variant reaches the release job."""
    main_list, _pr_list = _firmware_workflow_variant_lists()
    assert main_list == _variants_on_disk()


def test_pull_request_compiles_cover_every_model() -> None:
    """PRs compile a subset for speed, but it must span the models.

    The variants share `epp-core.yaml` and `epp-entities.yaml` while each model
    keeps its own base, so a change that breaks only one model's base sails
    through a build of the other.
    """
    _main_list, pr_list = _firmware_workflow_variant_lists()
    on_disk = _variants_on_disk()
    assert pr_list <= on_disk, f"PR matrix names variants that do not exist: {sorted(pr_list - on_disk)}"
    models = {"lite" if "-lite" in v else "pro" for v in pr_list}
    assert models == {"lite", "pro"}, (
        f"the PR compile matrix {sorted(pr_list)} only covers {sorted(models)}; "
        f"it must build at least one variant per model."
    )


def test_staging_publishes_every_variant() -> None:
    """stage-firmware.sh writes the `fw/v{V}/` and `fw/latest/` manifests that
    the device's update platform and the integration's OTA button both fetch.
    A variant absent here 404s at OTA time even though the release built it."""
    assert _stage_script_variants() == _variants_on_disk()


def test_post_release_verification_checks_every_variant() -> None:
    """Otherwise the release is declared healthy without ever fetching the
    manifest for the variant that was left unpublished."""
    assert _verify_script_variants() == _variants_on_disk()


def test_staged_and_verified_lists_agree() -> None:
    """Stated as its own invariant because these two drifting apart is silent
    in both directions: staging something nobody verifies, or verifying
    something nobody staged."""
    assert _stage_script_variants() == _verify_script_variants()
