"""Tests for bin/release.sh."""

import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "bin" / "release.sh"


def _clean_env(extra: dict | None = None) -> dict:
    """Return os.environ with all GIT_* vars stripped, plus any extras.

    Without this, subprocess git calls in tests inherit GIT_DIR / GIT_WORK_TREE /
    GIT_INDEX_FILE from a parent context (e.g. a pre-push hook) and operate on
    the wrong repo. That caused the test fixture's `git config user.name=t` to
    leak into the main repo's local config.
    """
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    if extra:
        env.update(extra)
    return env


def _git(*args: str, cwd: Path, check: bool = True, **kwargs) -> subprocess.CompletedProcess:
    """Run a git command with GIT_* env scrubbed."""
    return subprocess.run(["git", *args], cwd=cwd, check=check, env=_clean_env(), **kwargs)


def _run(cwd: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        env=_clean_env(),
    )


def test_rejects_invalid_semver(tmp_path: Path):
    result = _run(tmp_path, "not-a-version")
    assert result.returncode != 0
    assert "semver" in (result.stdout + result.stderr).lower()


def test_accepts_alpha_suffix(tmp_path: Path):
    """Pre-flight should accept alpha pre-release suffix at the semver check.
    Other pre-flights (clean tree, on main, etc.) will still fail in tmp_path,
    so we only check that the error is NOT a semver error."""
    result = _run(tmp_path, "0.93.0-alpha.1")
    combined = (result.stdout + result.stderr).lower()
    assert "semver" not in combined


def test_accepts_beta_suffix(tmp_path: Path):
    result = _run(tmp_path, "0.93.0-beta.2")
    combined = (result.stdout + result.stderr).lower()
    assert "semver" not in combined


def test_accepts_rc_suffix(tmp_path: Path):
    result = _run(tmp_path, "0.93.0-rc.1")
    combined = (result.stdout + result.stderr).lower()
    assert "semver" not in combined


def _init_repo(tmp_path: Path, *, branch: str = "main", dirty: bool = False) -> Path:
    """Create a tiny git repo with version files on the named branch."""
    _git("init", "-q", "-b", branch, cwd=tmp_path)
    _git("config", "user.email", "t@test", cwd=tmp_path)
    _git("config", "user.name", "t", cwd=tmp_path)

    (tmp_path / "custom_components" / "eppgrid").mkdir(parents=True)
    (tmp_path / "custom_components" / "eppgrid" / "manifest.json").write_text(
        '{\n  "domain": "eppgrid",\n  "version": "0.92.0"\n}\n'
    )
    (tmp_path / "custom_components" / "eppgrid" / "const.py").write_text('FIRMWARE_VERSION = "0.92.0"\n')
    (tmp_path / "firmware" / "common").mkdir(parents=True)
    (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").write_text(
        'substitutions:\n  project:\n    version: "0.92.0"\n'
    )
    (tmp_path / "firmware" / "components" / "epp").mkdir(parents=True)
    # Header derives FIRMWARE_VERSION_STR from the ESPHOME_PROJECT_VERSION
    # macro (post-refactor 572114d). The release script must not bump it.
    (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").write_text(
        "#ifndef ESPHOME_PROJECT_VERSION\n"
        '#define ESPHOME_PROJECT_VERSION "0.0.0-dev"\n'
        "#endif\n"
        "static constexpr const char* FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION;\n"
    )
    _git("add", ".", cwd=tmp_path)
    _git("commit", "-qm", "init", cwd=tmp_path)
    _git("tag", "v0.92.0", cwd=tmp_path)

    if dirty:
        (tmp_path / "dirt").write_text("x")

    return tmp_path


def test_rejects_non_main_branch(tmp_path: Path):
    _init_repo(tmp_path, branch="feature")
    result = _run(tmp_path, "0.93.0")
    assert result.returncode != 0
    assert "main" in (result.stdout + result.stderr).lower()


def test_rejects_dirty_tree(tmp_path: Path):
    _init_repo(tmp_path, dirty=True)
    result = _run(tmp_path, "0.93.0")
    assert result.returncode != 0
    combined = (result.stdout + result.stderr).lower()
    assert "clean" in combined or "dirty" in combined or "uncommitted" in combined


def test_rejects_existing_tag(tmp_path: Path):
    _init_repo(tmp_path)
    result = _run(tmp_path, "0.92.0")  # tag v0.92.0 already exists
    assert result.returncode != 0
    assert "tag" in (result.stdout + result.stderr).lower()


def test_rejects_main_behind_origin(tmp_path: Path):
    """If local main has fewer commits than origin/main, fail."""
    # Create a bare "origin" and a local clone.
    origin = tmp_path / "origin.git"
    _git("init", "-q", "--bare", "-b", "main", str(origin), cwd=tmp_path)

    local = tmp_path / "local"
    local.mkdir()
    _init_repo(local)
    _git("remote", "add", "origin", str(origin), cwd=local)
    _git("push", "-q", "origin", "main", "--tags", cwd=local)

    # Add a commit on origin that local doesn't have.
    other = tmp_path / "other"
    _git("clone", "-q", str(origin), str(other), cwd=tmp_path)
    _git("config", "user.email", "t@test", cwd=other)
    _git("config", "user.name", "t", cwd=other)
    (other / "new.txt").write_text("x")
    _git("add", ".", cwd=other)
    _git("commit", "-qm", "new", cwd=other)
    _git("push", "-q", "origin", "main", cwd=other)

    result = _run(local, "0.93.0")
    assert result.returncode != 0
    combined = (result.stdout + result.stderr).lower()
    assert "up to date" in combined or "behind" in combined


def test_integration_only_release_bumps_manifest_only(tmp_path: Path):
    _init_repo(tmp_path)
    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    # Branch exists
    branches = _git("branch", "--list", "release-v0.93.0", cwd=tmp_path, capture_output=True, text=True).stdout
    assert "release-v0.93.0" in branches

    # Switch to that branch and inspect
    _git("checkout", "-q", "release-v0.93.0", cwd=tmp_path)

    manifest = (tmp_path / "custom_components" / "eppgrid" / "manifest.json").read_text()
    assert '"version": "0.93.0"' in manifest

    # Firmware files UNCHANGED (integration-only release)
    const_py = (tmp_path / "custom_components" / "eppgrid" / "const.py").read_text()
    assert 'FIRMWARE_VERSION = "0.92.0"' in const_py

    base_yaml = (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    assert 'version: "0.92.0"' in base_yaml

    header = (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").read_text()
    assert "FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION" in header


def test_firmware_release_bumps_three_versions(tmp_path: Path):
    """Firmware-changing release bumps manifest.json, const.py, and base.yaml.
    The C++ header uses ESPHOME_PROJECT_VERSION and follows base.yaml at
    compile time, so the release script must leave it untouched."""
    _init_repo(tmp_path)

    # Simulate firmware code change since last tag by editing a firmware file
    # (not a version field — we're simulating real firmware code churn).
    hw_pins = tmp_path / "firmware" / "common" / "hardware.yaml"
    hw_pins.write_text("# fake firmware code change\n")
    _git("add", ".", cwd=tmp_path)
    _git("commit", "-qm", "firmware: add hardware.yaml", cwd=tmp_path)

    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    _git("checkout", "-q", "release-v0.93.0", cwd=tmp_path)

    manifest = (tmp_path / "custom_components" / "eppgrid" / "manifest.json").read_text()
    assert '"version": "0.93.0"' in manifest

    const_py = (tmp_path / "custom_components" / "eppgrid" / "const.py").read_text()
    assert 'FIRMWARE_VERSION = "0.93.0"' in const_py

    base_yaml = (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    assert 'version: "0.93.0"' in base_yaml

    header = (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").read_text()
    assert "FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION" in header
    assert "0.93.0" not in header, "release script must not bump the header literal"


def test_succeeds_when_versions_already_at_target(tmp_path: Path):
    """When versions are already bumped on main (e.g. in an earlier feature
    commit) and there are firmware code changes since the last tag, the
    release script must still succeed: create a chore: release marker commit
    (possibly empty) so the tag points at a clear release commit.

    This is the real-world "0.95.0 was bumped in a feature commit, now we want
    to release" workflow.
    """
    _init_repo(tmp_path)  # versions at 0.92.0, tag v0.92.0

    # Switch the header to macro form (so release.sh has nothing to bump there).
    (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").write_text(
        "#ifndef ESPHOME_PROJECT_VERSION\n"
        '#define ESPHOME_PROJECT_VERSION "0.0.0-dev"\n'
        "#endif\n"
        "static constexpr const char* FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION;\n"
    )
    # Pre-bump version files to 0.93.0 in a feature commit, alongside a fake
    # firmware code change so FIRMWARE_CHANGED=true.
    (tmp_path / "custom_components" / "eppgrid" / "manifest.json").write_text(
        '{\n  "domain": "eppgrid",\n  "version": "0.93.0"\n}\n'
    )
    (tmp_path / "custom_components" / "eppgrid" / "const.py").write_text('FIRMWARE_VERSION = "0.93.0"\n')
    (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").write_text(
        'substitutions:\n  project:\n    version: "0.93.0"\n'
    )
    (tmp_path / "firmware" / "common" / "hardware.yaml").write_text("# fake firmware code change\n")
    _git("add", ".", cwd=tmp_path)
    _git("commit", "-qm", "feat: pre-bumped versions + firmware change", cwd=tmp_path)

    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    # Release branch exists
    branches = _git("branch", "--list", "release-v0.93.0", cwd=tmp_path, capture_output=True, text=True).stdout
    assert "release-v0.93.0" in branches

    # The release branch has a chore: release commit on top
    _git("checkout", "-q", "release-v0.93.0", cwd=tmp_path)
    last_msg = _git("log", "-1", "--format=%s", cwd=tmp_path, capture_output=True, text=True).stdout.strip()
    assert "release v0.93.0" in last_msg, f"unexpected last commit message: {last_msg!r}"

    # Versions still at 0.93.0 (no changes — the bump already happened)
    manifest = (tmp_path / "custom_components" / "eppgrid" / "manifest.json").read_text()
    assert '"version": "0.93.0"' in manifest


def test_macro_form_header_is_left_unchanged(tmp_path: Path):
    """The header derives FIRMWARE_VERSION_STR from ESPHOME_PROJECT_VERSION; the
    release script must not try to rewrite the (no-longer-existing) literal."""
    _init_repo(tmp_path)

    # Replace the legacy literal-form header with the post-refactor macro form.
    header = tmp_path / "firmware" / "components" / "epp" / "epp_component.h"
    macro_header = (
        "#ifndef ESPHOME_PROJECT_VERSION\n"
        '#define ESPHOME_PROJECT_VERSION "0.0.0-dev"\n'
        "#endif\n"
        "static constexpr const char* FIRMWARE_VERSION_STR = ESPHOME_PROJECT_VERSION;\n"
    )
    header.write_text(macro_header)
    # Add a fake firmware code change so FIRMWARE_CHANGED=true.
    (tmp_path / "firmware" / "common" / "hardware.yaml").write_text("# fake firmware code change\n")
    _git("add", ".", cwd=tmp_path)
    _git("commit", "-qm", "refactor: switch header to macro + firmware change", cwd=tmp_path)

    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    _git("checkout", "-q", "release-v0.93.0", cwd=tmp_path)
    assert header.read_text() == macro_header, "release script must leave macro-form header untouched"


def _make_fake_tools(tmp_path: Path, *, push_exit: int = 0, gh_exit: int = 0) -> tuple[Path, Path]:
    """Create a fake bin dir shimming `gh` (fully) and `git push` (only),
    logging calls. Returns (fake_bin, log). Keep fake_bin outside the git
    repo so it doesn't dirty the working tree."""
    fake_bin = tmp_path / "fake_bin"
    fake_bin.mkdir()
    log = tmp_path / "calls.log"

    # fake gh records arguments and exits with the configured status.
    (fake_bin / "gh").write_text(
        f'#!/usr/bin/env bash\necho "gh $*" >> "{log}"\n'
        + (f"exit {gh_exit}\n" if gh_exit else "echo https://github.com/fake/repo/pull/1\n")
    )
    (fake_bin / "gh").chmod(0o755)

    # We still need real git for commits, etc. So shim only via a wrapper that
    # records pushes then forwards to real git for everything else.
    real_git = subprocess.check_output(["which", "git"], text=True).strip()
    (fake_bin / "git").write_text(
        f'#!/usr/bin/env bash\nif [ "$1" = "push" ]; then echo "git $*" >> "{log}"; exit {push_exit}; fi\n'
        f'exec {real_git} "$@"\n'
    )
    (fake_bin / "git").chmod(0o755)
    return fake_bin, log


def _run_with_fake_tools(repo: Path, fake_bin: Path, *args: str) -> subprocess.CompletedProcess:
    env = _clean_env({"PATH": f"{fake_bin}:{os.environ['PATH']}"})
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        cwd=repo,
        capture_output=True,
        text=True,
        env=env,
    )


def test_pushes_and_opens_pr(tmp_path: Path, monkeypatch):
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    fake_bin, log = _make_fake_tools(tmp_path)

    result = _run_with_fake_tools(repo, fake_bin, "0.93.0")
    assert result.returncode == 0, result.stdout + result.stderr

    call_log = log.read_text()
    assert "git push" in call_log
    assert "gh pr create" in call_log
    assert "release-v0.93.0" in call_log


def test_aborts_loudly_when_ls_remote_fails(tmp_path: Path):
    """When origin is configured but `git ls-remote` fails (offline, auth),
    the duplicate-tag guard must abort loudly, not silently pass."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    _git("remote", "add", "origin", str(tmp_path / "missing.git"), cwd=repo)

    result = _run(repo, "0.93.0")
    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "ls-remote" in combined, f"expected a loud ls-remote error, got:\n{combined}"
    # Must abort before creating the release branch.
    branches = _git("branch", "--list", "release-v0.93.0", cwd=repo, capture_output=True, text=True).stdout
    assert "release-v0.93.0" not in branches


def test_single_line_manifest_not_corrupted(tmp_path: Path):
    """A greedy sed (`"version": ".*"`) would eat every key after "version"
    on the same line. The manifest bump must use the non-greedy [^"]* form
    (delegated to bump-version.sh)."""
    _init_repo(tmp_path)
    (tmp_path / "custom_components" / "eppgrid" / "manifest.json").write_text(
        '{"version": "0.92.0", "domain": "eppgrid"}\n'
    )
    _git("add", ".", cwd=tmp_path)
    _git("commit", "-qm", "compact manifest", cwd=tmp_path)

    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    _git("checkout", "-q", "release-v0.93.0", cwd=tmp_path)
    manifest = (tmp_path / "custom_components" / "eppgrid" / "manifest.json").read_text()
    assert '"version": "0.93.0"' in manifest
    assert '"domain": "eppgrid"' in manifest, f"greedy sed corrupted the manifest:\n{manifest}"


def test_pr_body_uses_const_py_firmware_version(tmp_path: Path):
    """For an integration-only release the PR body must state the REAL
    firmware version from const.py, not the previous git tag (they diverge:
    e.g. tag v1.0.4 vs FIRMWARE_VERSION 1.0.0)."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)  # tag v0.92.0
    # Diverge const.py from the tag, post-tag (integration-only change).
    (repo / "custom_components" / "eppgrid" / "const.py").write_text('FIRMWARE_VERSION = "0.90.0"\n')
    _git("add", ".", cwd=repo)
    _git("commit", "-qm", "chore: diverge firmware const from tag", cwd=repo)

    fake_bin, log = _make_fake_tools(tmp_path)
    result = _run_with_fake_tools(repo, fake_bin, "0.93.0")
    assert result.returncode == 0, result.stdout + result.stderr

    call_log = log.read_text()
    assert "gh pr create" in call_log
    assert "`0.90.0`" in call_log, f"PR body must cite const.py firmware version:\n{call_log}"
    assert "v0.92.0" not in call_log.split("gh pr create", 1)[1], (
        "PR body must not cite the previous git tag as the firmware version"
    )


def test_failure_after_branch_creation_cleans_up(tmp_path: Path):
    """If a step fails after `git checkout -b`, the script must return the
    repo to main and delete the local release branch so a rerun isn't
    blocked by the on-main / clean-tree pre-flights."""
    _init_repo(tmp_path)
    # Remove the manifest so the version-bump step fails mid-release.
    _git("rm", "-q", "custom_components/eppgrid/manifest.json", cwd=tmp_path)
    _git("commit", "-qm", "chore: drop manifest", cwd=tmp_path)

    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode != 0

    head = _git("rev-parse", "--abbrev-ref", "HEAD", cwd=tmp_path, capture_output=True, text=True).stdout.strip()
    assert head == "main", f"repo left on {head!r} after mid-release failure"
    branches = _git("branch", "--list", "release-v0.93.0", cwd=tmp_path, capture_output=True, text=True).stdout
    assert "release-v0.93.0" not in branches, "stale release branch left behind"
    status = _git("status", "--porcelain", cwd=tmp_path, capture_output=True, text=True).stdout
    assert status.strip() == "", f"working tree left dirty:\n{status}"


def test_pr_create_failure_after_push_prints_recovery(tmp_path: Path):
    """When the branch was already pushed, a failed `gh pr create` must NOT
    delete the branch; it must print explicit recovery steps (rerunning
    release.sh is blocked by its pre-flights)."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    fake_bin, log = _make_fake_tools(tmp_path, gh_exit=1)

    result = _run_with_fake_tools(repo, fake_bin, "0.93.0")
    assert result.returncode != 0
    assert "git push" in log.read_text()  # push happened first

    combined = result.stdout + result.stderr
    assert "pushed" in combined.lower()
    assert "gh pr create --head release-v0.93.0" in combined, f"missing recovery steps:\n{combined}"
    # The pushed branch is the recovery artifact — it must survive locally.
    branches = _git("branch", "--list", "release-v0.93.0", cwd=repo, capture_output=True, text=True).stdout
    assert "release-v0.93.0" in branches


def test_does_not_leak_to_parent_git_dir_via_env(tmp_path: Path, monkeypatch):
    """If GIT_DIR is set in the env (e.g. by a hook or wrapper), tests must not
    accidentally write to that repo. Regression for the bug that caused
    'user.name = t' from the test fixture to end up in the main repo's config
    during a pre-push hook run."""
    parent = tmp_path / "parent_repo"
    parent.mkdir()
    subprocess.run(["git", "init", "-q", "-b", "main", str(parent)], check=True)
    parent_git = parent / ".git"
    config_before = (parent_git / "config").read_text()

    monkeypatch.setenv("GIT_DIR", str(parent_git))

    fixture = tmp_path / "fixture"
    fixture.mkdir()
    _init_repo(fixture)

    config_after = (parent_git / "config").read_text()
    assert config_before == config_after, (
        f"_init_repo leaked into GIT_DIR config:\n--- before ---\n{config_before}\n--- after ---\n{config_after}"
    )
