"""Which pinned firmware versions the Pages deploy publishes besides the latest release.

The panel's update tab downloads fw/v{FIRMWARE_VERSION}/ from GitHub Pages, and
every deploy rebuilds the site from scratch. So every FIRMWARE_VERSION that an
installed integration can ask for must be published on every deploy: main's
(for a pre-release being tested) and the latest stable release's (for
everyone on stable). The latest stable release's version can differ from its
tag when the release did not change the firmware: tag v1.10.0 pins 1.9.0.
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "firmware_versions_to_publish.py"
CONST = Path("custom_components") / "eppgrid" / "const.py"


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def _commit_pin(repo: Path, version: str | None, tag: str | None = None) -> None:
    const = repo / CONST
    const.parent.mkdir(parents=True, exist_ok=True)
    const.write_text(f'DOMAIN = "eppgrid"\nFIRMWARE_VERSION = "{version}"\n' if version else 'DOMAIN = "eppgrid"\n')
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "--allow-empty", "-m", f"pin {version}")
    if tag:
        _git(repo, "tag", tag)


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "test@example.com")
    _git(repo, "config", "user.name", "Test")
    return repo


def _run(repo: Path, latest_tag: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--latest-tag", latest_tag],
        cwd=repo,
        capture_output=True,
        text=True,
    )


def test_a_beta_on_main_keeps_the_stable_releases_firmware_published(tmp_path):
    # v1.10.0 changed only the integration, so it still pins 1.9.0; main has
    # moved on to the beta's firmware.
    repo = _repo(tmp_path)
    _commit_pin(repo, "1.9.0", tag="v1.10.0")
    _commit_pin(repo, "1.11.0-beta.1")
    result = _run(repo, "v1.10.0")
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["1.11.0-beta.1", "1.9.0"]


def test_the_same_version_is_listed_once(tmp_path):
    repo = _repo(tmp_path)
    _commit_pin(repo, "1.9.0", tag="v1.10.0")
    _commit_pin(repo, "1.9.0")
    result = _run(repo, "v1.10.0")
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["1.9.0"]


def test_a_version_the_latest_release_already_publishes_is_left_out(tmp_path):
    # A firmware-changing stable release pins its own tag's version, which the
    # latest-release pass already publishes as fw/v{version}/.
    repo = _repo(tmp_path)
    _commit_pin(repo, "1.11.0", tag="v1.11.0")
    _commit_pin(repo, "1.11.0")
    result = _run(repo, "v1.11.0")
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == []


def test_without_a_stable_release_only_mains_version_is_listed(tmp_path):
    repo = _repo(tmp_path)
    _commit_pin(repo, "0.1.0")
    result = _run(repo, "")
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["0.1.0"]


def test_an_unreadable_pin_is_skipped_with_a_warning(tmp_path):
    # Fail soft, as the workflow always has: a missing pin must not stop the
    # docs and fw/latest from deploying.
    repo = _repo(tmp_path)
    _commit_pin(repo, None, tag="v0.5.0")
    _commit_pin(repo, "0.6.0-beta.1")
    result = _run(repo, "v0.5.0")
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["0.6.0-beta.1"]
    assert "v0.5.0" in result.stderr
