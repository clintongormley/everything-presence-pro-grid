"""`.github/scripts/extract-release-notes.sh` — pull one version's section out
of CHANGES.md for use as the GitHub release body.

The firmware-release workflow uses this so a release's notes are the curated,
user-facing changelog entry rather than an auto-generated commit list. A tag
with no matching changelog section (e.g. a pre-release) exits non-zero so the
workflow can fall back to GitHub's generated notes.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "extract-release-notes.sh"

SAMPLE = """\
# Changelog

Intro line that must never appear in any release body.

## v1.2.1 — 2026-06-21

### Fixes

- Multi-device updates are reliable.

## v1.2.0 — 2026-06-21

### New features

- Device Groups editor redesigned.

## v1.1.0 — 2026-06-14

### New features

- Device Groups.
"""


def _run(version: str, changes_text: str, tmp_path: Path) -> subprocess.CompletedProcess[str]:
    changes = tmp_path / "CHANGES.md"
    changes.write_text(changes_text)
    return subprocess.run(
        [str(SCRIPT), version],
        capture_output=True,
        text=True,
        env={"CHANGES_FILE": str(changes), "PATH": "/usr/bin:/bin"},
    )


def test_extracts_the_requested_version_section(tmp_path: Path) -> None:
    result = _run("1.2.1", SAMPLE, tmp_path)
    assert result.returncode == 0
    assert "Multi-device updates are reliable." in result.stdout
    assert "### Fixes" in result.stdout


def test_section_stops_before_the_next_version(tmp_path: Path) -> None:
    """Extracting 1.2.0 must not bleed into the 1.1.0 section below it."""
    result = _run("1.2.0", SAMPLE, tmp_path)
    assert result.returncode == 0
    assert "Device Groups editor redesigned." in result.stdout
    assert "v1.1.0" not in result.stdout
    assert "Device Groups." not in result.stdout


def test_excludes_the_file_header_and_version_heading(tmp_path: Path) -> None:
    """The body is the section content only — not the changelog preamble nor the
    `## v…` heading itself (the GitHub release title already carries the tag)."""
    result = _run("1.2.1", SAMPLE, tmp_path)
    assert "Intro line that must never appear" not in result.stdout
    assert not result.stdout.lstrip().startswith("## v1.2.1")


def test_missing_version_exits_nonzero_with_no_output(tmp_path: Path) -> None:
    result = _run("9.9.9", SAMPLE, tmp_path)
    assert result.returncode != 0
    assert result.stdout.strip() == ""


def test_prefix_version_does_not_match_a_longer_one(tmp_path: Path) -> None:
    """`1.2` must not match the `1.2.1` heading (substring-prefix trap)."""
    result = _run("1.2", SAMPLE, tmp_path)
    assert result.returncode != 0


def test_dots_in_the_version_are_literal(tmp_path: Path) -> None:
    result = _run("1.2.1", "# Changelog\n\n## v1x2x1 — 2026-06-21\n\n- Other.\n", tmp_path)
    assert result.returncode != 0
    assert result.stdout == ""


FINAL_AND_CANDIDATE = [
    "# Changelog\n\n## v0.93.0 — 2026-11-04\n\n- Final.\n\n## v0.93.0-rc.1 — 2026-10-01\n\n- Candidate.\n",
    "# Changelog\n\n## v0.93.0-rc.1 — 2026-10-01\n\n- Candidate.\n\n## v0.93.0 — 2026-11-04\n\n- Final.\n",
]


@pytest.mark.parametrize("changes", FINAL_AND_CANDIDATE)
def test_final_version_does_not_pick_up_its_candidate(changes: str, tmp_path: Path) -> None:
    result = _run("0.93.0", changes, tmp_path)
    assert result.returncode == 0
    assert result.stdout == "- Final.\n"


@pytest.mark.parametrize("changes", FINAL_AND_CANDIDATE)
def test_candidate_finds_its_own_section(changes: str, tmp_path: Path) -> None:
    result = _run("0.93.0-rc.1", changes, tmp_path)
    assert result.returncode == 0
    assert result.stdout == "- Candidate.\n"


def test_final_version_ignores_a_candidate_with_no_section_of_its_own(tmp_path: Path) -> None:
    result = _run("0.93.0", "# Changelog\n\n## v0.93.0-rc.1 — 2026-10-01\n\n- Candidate.\n", tmp_path)
    assert result.returncode != 0
    assert result.stdout == ""


@pytest.mark.parametrize(
    "changes",
    [
        "# Changelog\n\n## v1.2.10 — 2026-07-01\n\n- Ten.\n\n## v1.2.1 — 2026-06-21\n\n- One.\n",
        "# Changelog\n\n## v1.2.1 — 2026-06-21\n\n- One.\n\n## v1.2.10 — 2026-07-01\n\n- Ten.\n",
    ],
)
def test_shorter_version_does_not_match_a_longer_one(changes: str, tmp_path: Path) -> None:
    result = _run("1.2.1", changes, tmp_path)
    assert result.returncode == 0
    assert result.stdout == "- One.\n"


@pytest.mark.parametrize("heading", ["## v1.2.1", "## v1.2.1 — 2026-06-21", "## v1.2.1\t— 2026-06-21"])
def test_version_may_end_the_heading_or_be_followed_by_a_space_or_tab(heading: str, tmp_path: Path) -> None:
    result = _run("1.2.1", f"# Changelog\n\n{heading}\n\n- One.\n\n## v1.2.0 — 2026-06-20\n\n- Zero.\n", tmp_path)
    assert result.returncode == 0
    assert result.stdout == "- One.\n"


def test_section_ends_at_a_repeated_heading_for_the_same_version(tmp_path: Path) -> None:
    changes = "# Changelog\n\n## v1.2.1\n\n- First.\n\n## v1.2.1 — 2026-06-21\n\n- Second.\n"
    result = _run("1.2.1", changes, tmp_path)
    assert result.returncode == 0
    assert result.stdout == "- First.\n"


@pytest.mark.parametrize("heading", ["## v1.2.1", "## v1.2.1 — 2026-06-21"])
def test_windows_line_endings_do_not_reach_the_notes(heading: str, tmp_path: Path) -> None:
    changes = f"# Changelog\r\n\r\n{heading}\r\n\r\n- One.\r\n- Two.\r\n\r\n## v1.2.0 — 2026-06-20\r\n\r\n- Zero.\r\n"
    result = _run("1.2.1", changes, tmp_path)
    assert result.returncode == 0
    assert result.stdout == "- One.\n- Two.\n"


def test_empty_section_with_windows_line_endings_has_no_notes(tmp_path: Path) -> None:
    changes = "# Changelog\r\n\r\n## v1.2.1 — 2026-06-21\r\n\r\n## v1.2.0 — 2026-06-20\r\n\r\n- Zero.\r\n"
    result = _run("1.2.1", changes, tmp_path)
    assert result.returncode != 0
    assert result.stdout == ""


def test_real_changelog_v1_2_1_section(tmp_path: Path) -> None:
    """Smoke test against the committed CHANGES.md so the script and the real
    file stay compatible."""
    text = (REPO_ROOT / "CHANGES.md").read_text()
    result = _run("1.2.1", text, tmp_path)
    assert result.returncode == 0
    assert "Updating several devices at once" in result.stdout
    assert "v1.2.0" not in result.stdout
