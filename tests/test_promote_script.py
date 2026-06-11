"""Tests for bin/promote.sh.

The script shells out to `gh`, so each test puts a fake `gh` early on PATH.
The stub reports a configurable pre-release state and logs any `release edit`
call so we can assert on what the script asked GitHub to do.
"""

import os
import stat
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "bin" / "promote.sh"

GH_STUB = """#!/usr/bin/env bash
if [ "$1" = "release" ] && [ "$2" = "view" ]; then
  if [ -n "${GH_STUB_VIEW_FAIL:-}" ]; then
    echo "release not found (simulated by gh stub)" >&2
    exit 1
  fi
  echo "${GH_STUB_PRERELEASE:-true}"
  exit 0
fi
if [ "$1" = "release" ] && [ "$2" = "edit" ]; then
  echo "$*" >> "${GH_STUB_LOG:?GH_STUB_LOG unset}"
  exit 0
fi
echo "unexpected gh call: $*" >&2
exit 99
"""


def _make_gh_stub(tmp_path: Path) -> Path:
    bindir = tmp_path / "bin"
    bindir.mkdir()
    gh = bindir / "gh"
    gh.write_text(GH_STUB)
    gh.chmod(gh.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return bindir


def _run(tmp_path: Path, *args: str, **env_extra: str) -> subprocess.CompletedProcess:
    bindir = _make_gh_stub(tmp_path)
    env = dict(os.environ)
    env["PATH"] = f"{bindir}:{env['PATH']}"
    env["GH_STUB_LOG"] = str(tmp_path / "gh.log")
    env.update(env_extra)
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        capture_output=True,
        text=True,
        env=env,
    )


def _edit_log(tmp_path: Path) -> str:
    log = tmp_path / "gh.log"
    return log.read_text() if log.exists() else ""


def test_rejects_invalid_semver(tmp_path: Path):
    result = _run(tmp_path, "not-a-version")
    assert result.returncode != 0
    assert "semver" in (result.stdout + result.stderr).lower()
    assert _edit_log(tmp_path) == ""


def test_promotes_a_prerelease(tmp_path: Path):
    result = _run(tmp_path, "1.2.3", GH_STUB_PRERELEASE="true")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "release edit v1.2.3 --prerelease=false --latest=true" in _edit_log(tmp_path)


def test_noop_when_already_full_release(tmp_path: Path):
    result = _run(tmp_path, "1.2.3", GH_STUB_PRERELEASE="false")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "already" in (result.stdout + result.stderr).lower()
    # An already-promoted release must NOT be edited again.
    assert _edit_log(tmp_path) == ""


def test_errors_when_release_missing(tmp_path: Path):
    result = _run(tmp_path, "1.2.3", GH_STUB_VIEW_FAIL="1")
    assert result.returncode != 0
    assert _edit_log(tmp_path) == ""
    # gh's own error must be surfaced, not swallowed and misattributed to a
    # missing release (it could equally be an auth/network/cwd failure).
    assert "simulated by gh stub" in (result.stdout + result.stderr)


def test_rejects_prerelease_promotion_without_force(tmp_path: Path):
    """Promoting a -alpha/-beta/-rc version marks it GitHub "latest" and
    re-stages fw/latest/ — every device's auto-update channel. Refuse unless
    --force is given."""
    result = _run(tmp_path, "1.2.3-rc.1", GH_STUB_PRERELEASE="true")
    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "pre-release" in combined.lower() or "prerelease" in combined.lower()
    assert "--force" in combined  # tells the user the escape hatch
    assert _edit_log(tmp_path) == ""


def test_force_promotes_prerelease(tmp_path: Path):
    result = _run(tmp_path, "1.2.3-rc.1", "--force", GH_STUB_PRERELEASE="true")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "release edit v1.2.3-rc.1 --prerelease=false --latest=true" in _edit_log(tmp_path)


def test_rejects_unknown_extra_arg(tmp_path: Path):
    result = _run(tmp_path, "1.2.3", "--bogus")
    assert result.returncode != 0
    assert "usage" in (result.stdout + result.stderr).lower()
    assert _edit_log(tmp_path) == ""
