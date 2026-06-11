"""Tests for scripts/check-docs-update.sh — pre-push docs-update guard.

The script verifies that structural changes (A/D/R/C) to doc-described surface
area come with an architecture.md or data-catalog.md update, or an explicit
`Docs-skip:` commit trailer. Pure modifications produce a soft warning.
"""

import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "check-docs-update.sh"


def _clean_env() -> dict:
    return {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}


def _git(*args: str, cwd: Path, **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        env=_clean_env(),
        capture_output=True,
        text=True,
        **kwargs,
    )


def _init_repo(tmp_path: Path) -> Path:
    _git("init", "-q", "-b", "main", cwd=tmp_path)
    _git("config", "user.email", "t@test", cwd=tmp_path)
    _git("config", "user.name", "t", cwd=tmp_path)
    (tmp_path / "README.md").write_text("# repo\n")
    _git("add", "README.md", cwd=tmp_path)
    _git("commit", "-q", "-m", "initial", cwd=tmp_path)
    return tmp_path


def _write(repo: Path, path: str, content: str) -> None:
    full = repo / path
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(content)


def _commit(repo: Path, message: str, files: dict[str, str | None]) -> None:
    """Stage files, then commit. `None` content means delete."""
    for path, content in files.items():
        if content is None:
            _git("rm", "-q", path, cwd=repo)
        else:
            _write(repo, path, content)
            _git("add", path, cwd=repo)
    _git("commit", "-q", "-m", message, cwd=repo)


def _run(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        cwd=repo,
        capture_output=True,
        text=True,
        env=_clean_env(),
    )


# --- No-op cases ---------------------------------------------------------


def test_no_files_changed_passes_silently(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "tweak readme", {"README.md": "# updated\n"})
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0
    assert result.stdout.strip() == ""
    assert result.stderr.strip() == ""


def test_test_only_changes_do_not_trigger(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add test",
        {"frontend/src/__tests__/foo.test.ts": "import {} from 'a';\n"},
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0
    assert result.stdout.strip() == ""
    assert result.stderr.strip() == ""


def test_firmware_test_only_changes_do_not_trigger(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add cpp test",
        {"firmware/lib/epp_zone_engine/tests/test_new.cpp": "// test\n"},
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0


# --- Modify-only soft-warning cases --------------------------------------


def test_modify_only_warns_but_passes(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed", {"custom_components/eppgrid/storage.py": "x = 1\n"})
    _commit(repo, "tweak", {"custom_components/eppgrid/storage.py": "x = 2\n"})
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0
    combined = (result.stdout + result.stderr).lower()
    assert "doc" in combined  # soft warning mentions docs


def test_modify_with_doc_update_passes_no_warn(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed", {"custom_components/eppgrid/storage.py": "x = 1\n"})
    _commit(
        repo,
        "tweak + docs",
        {
            "custom_components/eppgrid/storage.py": "x = 2\n",
            "docs/developers/architecture.md": "# arch\nupdated\n",
        },
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0
    assert "warn" not in (result.stdout + result.stderr).lower()


# --- Structural-change blocking cases ------------------------------------


def test_add_lib_file_without_docs_blocks(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add lib",
        {"frontend/src/lib/new-thing.ts": "export const x = 1;\n"},
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1
    assert "frontend/src/lib/new-thing.ts" in result.stderr


def test_add_lib_file_with_architecture_doc_passes(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add lib + docs",
        {
            "frontend/src/lib/new-thing.ts": "export const x = 1;\n",
            "docs/developers/architecture.md": "# arch\nadded new-thing\n",
        },
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0


def test_add_backend_file_with_data_catalog_passes(tmp_path: Path) -> None:
    """Updating data-catalog (not architecture) is enough."""
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add backend + data-catalog",
        {
            "custom_components/eppgrid/new_module.py": "x = 1\n",
            "docs/developers/data-catalog.md": "# updated\n",
        },
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0


def test_add_workflow_blocks(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "add workflow", {".github/workflows/new.yml": "name: x\n"})
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


def test_add_firmware_header_blocks(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add hdr",
        {"firmware/lib/epp_zone_engine/include/new.h": "#pragma once\n"},
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


def test_add_variant_blocks(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(
        repo,
        "add variant",
        {"firmware/variants/new-variant.yaml": "esphome:\n"},
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


def test_delete_lib_file_blocks(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed", {"frontend/src/lib/dead.ts": "export {};\n"})
    _commit(repo, "delete dead", {"frontend/src/lib/dead.ts": None})
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


def test_rename_lib_file_blocks(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed", {"frontend/src/lib/old-name.ts": "export {};\n"})
    _git(
        "mv",
        "frontend/src/lib/old-name.ts",
        "frontend/src/lib/new-name.ts",
        cwd=repo,
    )
    _git("commit", "-q", "-m", "rename", cwd=repo)
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


# --- Opt-out trailer cases ----------------------------------------------


def test_opt_out_trailer_passes(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _write(repo, "frontend/src/lib/new.ts", "export {};\n")
    _git("add", "frontend/src/lib/new.ts", cwd=repo)
    _git(
        "commit",
        "-q",
        "-m",
        "add new\n\nDocs-skip: pure refactor, no public surface change",
        cwd=repo,
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0


def test_opt_out_trailer_in_one_of_many_commits_passes(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    # First commit: adds a model file with no trailer
    _commit(repo, "add lib", {"frontend/src/lib/a.ts": "export {};\n"})
    # Second commit: adds another with trailer
    _write(repo, "frontend/src/lib/b.ts", "export {};\n")
    _git("add", "frontend/src/lib/b.ts", cwd=repo)
    _git("commit", "-q", "-m", "add b\n\nDocs-skip: internal only", cwd=repo)
    # Range covers both commits; trailer in one of them suffices
    result = _run(repo, "HEAD~2..HEAD")
    assert result.returncode == 0


def test_opt_out_trailer_must_be_anchored_to_line(tmp_path: Path) -> None:
    """A line saying 'Docs-skip might apply' is NOT a valid trailer."""
    repo = _init_repo(tmp_path)
    _write(repo, "frontend/src/lib/new.ts", "export {};\n")
    _git("add", "frontend/src/lib/new.ts", cwd=repo)
    _git(
        "commit",
        "-q",
        "-m",
        "add new\n\nthis is some prose mentioning Docs-skip in passing",
        cwd=repo,
    )
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


# --- Copilot PR #145: styles.ts coverage --------------------------------


def test_add_styles_file_blocks(tmp_path: Path) -> None:
    """frontend/src/styles.ts is documented; adds must trigger the guard."""
    repo = _init_repo(tmp_path)
    _commit(repo, "add styles", {"frontend/src/styles.ts": "export {};\n"})
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


def test_modify_styles_file_warns(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed", {"frontend/src/styles.ts": "export const x = 1;\n"})
    _commit(repo, "tweak", {"frontend/src/styles.ts": "export const x = 2;\n"})
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 0
    assert "doc" in (result.stdout + result.stderr).lower()


# --- Copilot PR #145: doc deletion/rename must not satisfy --------------


def test_delete_architecture_doc_does_not_satisfy_check(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed doc", {"docs/developers/architecture.md": "# arch\n"})
    # Single commit: structural model add + doc delete
    _git("rm", "-q", "docs/developers/architecture.md", cwd=repo)
    _write(repo, "frontend/src/lib/foo.ts", "export {};\n")
    _git("add", "frontend/src/lib/foo.ts", cwd=repo)
    _git("commit", "-q", "-m", "add lib + delete arch", cwd=repo)
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


def test_rename_architecture_doc_does_not_satisfy_check(tmp_path: Path) -> None:
    repo = _init_repo(tmp_path)
    _commit(repo, "seed doc", {"docs/developers/architecture.md": "# arch\n"})
    _git(
        "mv",
        "docs/developers/architecture.md",
        "docs/developers/old-arch.md",
        cwd=repo,
    )
    _write(repo, "frontend/src/lib/foo.ts", "export {};\n")
    _git("add", "frontend/src/lib/foo.ts", cwd=repo)
    _git("commit", "-q", "-m", "add lib + rename arch", cwd=repo)
    result = _run(repo, "HEAD~1..HEAD")
    assert result.returncode == 1


# --- Usage --------------------------------------------------------------


def test_missing_arg_errors(tmp_path: Path) -> None:
    result = _run(tmp_path)
    assert result.returncode != 0
    assert "usage" in (result.stdout + result.stderr).lower()


# --- git-diff failures must be loud, not a silent pass -------------------


def test_invalid_range_fails_loudly(tmp_path: Path) -> None:
    """A bad range / missing ref must NOT silently no-op the guard (exit 0
    with empty diff); it must fail with a visible error."""
    repo = _init_repo(tmp_path)
    _commit(repo, "add lib", {"frontend/src/lib/new-thing.ts": "export {};\n"})
    result = _run(repo, "no-such-ref..HEAD")
    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "no-such-ref" in combined  # git's own error surfaced
    assert "git diff" in combined.lower()  # plus our loud explanation
