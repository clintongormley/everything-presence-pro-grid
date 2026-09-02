"""Tests for bin/bump-version.sh.

The script edits ONLY custom_components/eppgrid/manifest.json. Tests copy a
manifest into a tmp dir and run the script from there (it operates on relative
paths from the working directory), so the real manifest is never touched.
"""

import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "bin" / "bump-version.sh"

MANIFEST_REL = "custom_components/eppgrid/manifest.json"


def _clean_env(extra: dict | None = None) -> dict:
    """os.environ with GIT_* scrubbed (matches the other script tests)."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    if extra:
        env.update(extra)
    return env


def _run(cwd: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        env=_clean_env(),
    )


def _make_manifest(tmp_path: Path, version: str = "1.0.4") -> Path:
    """Create a tmp repo layout with a manifest.json at the given version."""
    manifest = tmp_path / MANIFEST_REL
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(
        "{\n"
        '  "domain": "eppgrid",\n'
        '  "name": "Everything Presence Grid",\n'
        '  "requirements": ["aioesphomeapi>=29.0.0"],\n'
        f'  "version": "{version}"\n'
        "}\n"
    )
    return manifest


def test_validate_rejects_bad_semver(tmp_path: Path):
    manifest = _make_manifest(tmp_path)
    before = manifest.read_text()
    result = _run(tmp_path, "--validate", "not-a-version")
    assert result.returncode != 0
    assert "semver" in (result.stdout + result.stderr).lower()
    # --validate must never write.
    assert manifest.read_text() == before


def test_validate_accepts_good_semver(tmp_path: Path):
    _make_manifest(tmp_path)
    result = _run(tmp_path, "--validate", "1.1.0")
    assert result.returncode == 0, result.stdout + result.stderr


def test_validate_accepts_prerelease_suffix(tmp_path: Path):
    _make_manifest(tmp_path)
    result = _run(tmp_path, "--validate", "1.1.0-rc.1")
    assert result.returncode == 0, result.stdout + result.stderr


def test_bump_rewrites_manifest(tmp_path: Path):
    manifest = _make_manifest(tmp_path, "1.0.4")
    result = _run(tmp_path, "1.1.0")
    assert result.returncode == 0, result.stdout + result.stderr
    text = manifest.read_text()
    assert '"version": "1.1.0"' in text
    assert "1.0.4" not in text
    # Other keys preserved (sed, not a JSON reserialiser).
    assert '"domain": "eppgrid"' in text
    assert '"aioesphomeapi>=29.0.0"' in text
    # No leftover sed backup file.
    assert not (tmp_path / (MANIFEST_REL + ".bak")).exists()


def test_bump_rejects_bad_semver_and_writes_nothing(tmp_path: Path):
    manifest = _make_manifest(tmp_path, "1.0.4")
    before = manifest.read_text()
    result = _run(tmp_path, "not-a-version")
    assert result.returncode != 0
    assert "semver" in (result.stdout + result.stderr).lower()
    assert manifest.read_text() == before


def test_missing_manifest_errors(tmp_path: Path):
    # No manifest created.
    result = _run(tmp_path, "1.1.0")
    assert result.returncode != 0
    combined = (result.stdout + result.stderr).lower()
    assert "manifest.json" in combined or "not found" in combined


def test_invalid_semver_rejected_identically_across_scripts(tmp_path: Path):
    """release.sh and promote.sh delegate semver validation to
    `bump-version.sh --validate` (single source of truth), so the same bad
    input must produce the same error from all three scripts."""
    errors: dict[str, str] = {}
    for script in ("bump-version.sh", "release.sh", "promote.sh"):
        result = subprocess.run(
            ["bash", str(REPO_ROOT / "bin" / script), "1.2"],
            cwd=tmp_path,
            capture_output=True,
            text=True,
            env=_clean_env(),
        )
        assert result.returncode != 0, f"{script} accepted invalid semver 1.2"
        assert "semver" in (result.stdout + result.stderr).lower(), script
        errors[script] = result.stderr
    assert errors["release.sh"] == errors["bump-version.sh"]
    assert errors["promote.sh"] == errors["bump-version.sh"]
