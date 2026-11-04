"""A failed Home Assistant install on `beta` or `dev` warns instead of failing.

An unreleased Home Assistant must not block a PR, and that includes a GitHub
outage or the install landing on the wrong version. These tests pin how
`tests.yml` tolerates it: nothing later in the job may run on a broken install,
and the other channels must stay strict.
"""

from __future__ import annotations

from pathlib import Path

import yaml

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "tests.yml"
TOLERATED = "matrix.ha-version == 'beta' || matrix.ha-version == 'dev'"
INSTALLED = "steps.install.outcome == 'success'"
FAILED = "steps.install.outcome == 'failure'"


def _steps() -> list[dict]:
    return yaml.safe_load(WORKFLOW.read_text())["jobs"]["python"]["steps"]


def _install_index(steps: list[dict]) -> int:
    return next(i for i, step in enumerate(steps) if step.get("id") == "install")


def test_only_unreleased_channels_tolerate_a_failed_install() -> None:
    steps = _steps()
    install = steps[_install_index(steps)]
    assert "scripts/ci_ha_install.py" in install["run"]
    assert install["continue-on-error"] == "${{ " + TOLERATED + " }}"


def test_a_failed_install_warns() -> None:
    warnings = [step for step in _steps() if step.get("if") == FAILED]
    assert len(warnings) == 1
    assert warnings[0]["run"].startswith('echo "::warning::')


def test_every_step_after_the_install_needs_it_to_have_worked() -> None:
    steps = _steps()
    for step in steps[_install_index(steps) + 1 :]:
        condition = step.get("if", "")
        if condition == FAILED or condition == "steps.pytest.outcome == 'failure'":
            continue
        assert INSTALLED in condition, step["name"]
        assert "steps.gate.outputs.run == 'true'" in condition, step["name"]
