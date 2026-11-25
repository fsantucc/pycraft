"""Every guided experiment tells the truth: its change applies to the demo,
and running the changed demo in the sandbox gives what « see » announces."""
from __future__ import annotations

from typing import Any

import pytest

from server import pedagogy, static_checks
from server.curriculum import LEVELS, ORDER, public_curriculum
from server.curriculum.experiments import EXPERIMENTS, apply_patch

CASES = [(lid, i) for lid in ORDER
         for i in range(len(LEVELS[lid].experiments))]


def test_every_level_with_a_demo_has_experiments() -> None:
    for lid in ORDER:
        level = LEVELS[lid]
        has_demo = any(line.strip() and not line.startswith("#")
                       for code in level.demo.values()
                       for line in code.splitlines())
        assert bool(level.experiments) == has_demo, lid
        assert lid in EXPERIMENTS or not has_demo


@pytest.mark.parametrize("lid, i", CASES, ids=lambda v: str(v))
def test_experiment_is_complete(lid: str, i: int) -> None:
    e = LEVELS[lid].experiments[i]
    for key in ("do", "predict", "see", "why"):
        assert isinstance(e.get(key), str) and len(e[key]) > 15, (lid, key)
    assert e["predict"].rstrip().endswith("?"), lid
    assert "expect" in e, f"{lid} #{i}: nothing checks this experiment"


def _outcome(lid: str, e: dict[str, Any]) -> dict[str, Any]:
    level = LEVELS[lid]
    patch = e.get("patch", {})
    if patch.get("find"):
        assert patch["find"] in level.demo[patch.get("file", "main.py")], \
            f"{lid} : le texte à remplacer est introuvable"
    files = apply_patch(level.demo, patch)
    stdin = patch.get("stdin", level.demo_stdin)
    argv = patch.get("argv", level.demo_argv)
    return pedagogy.run_code(files, patch.get("entry", "main.py"),
                             stdin, argv), files


@pytest.mark.parametrize("lid, i", CASES, ids=lambda v: str(v))
def test_experiment_shows_what_it_announces(lid: str, i: int) -> None:
    e = LEVELS[lid].experiments[i]
    result, files = _outcome(lid, e)
    expect = e["expect"]
    out = result["output"]
    error = (result.get("error") or {}).get("type")
    if "error" in expect:
        assert error == expect["error"], (lid, i, error, out[-200:])
    elif "truncated" not in expect:
        assert error is None, (lid, i, result.get("error"))
    if expect.get("truncated"):
        assert result["truncated"], (lid, i)
    for text in expect.get("contains", []):
        assert text in out, (lid, i, text, out)
    for text in expect.get("absent", []):
        assert text not in out, (lid, i, text, out)
    for text, n in expect.get("count", {}).items():
        assert out.count(text) == n, (lid, i, text, out)
    if "last" in expect:
        lines = [line for line in out.splitlines() if line.strip()]
        assert lines and lines[-1] == expect["last"], (lid, i, lines[-3:])
    if "quality" in expect:
        report = static_checks.quality_report(files)
        assert any(expect["quality"] in issue["text"]
                   for issue in report["issues"]), (lid, i, report)
    if expect.get("protected_from_outside"):
        events = [ev for step in result["steps"] for ev in step["events"]]
        assert any(ev.get("type") == "attr_set" and ev.get("protected")
                   and not ev.get("internal") for ev in events), lid


def test_the_browser_never_receives_the_expected_outcome() -> None:
    for region in public_curriculum()["regions"]:  # type: ignore[attr-defined]
        for level in region["levels"]:
            for e in level["experiments"]:
                assert "expect" not in e
