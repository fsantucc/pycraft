"""Every mission is solvable, every starter fails, every quiz is sound."""
from __future__ import annotations

from pathlib import Path

import pytest

from server import pedagogy, sandbox, static_checks
from server.curriculum import LEVELS, NOTIONS, ORDER, REGIONS
from server.progress import ProgressStore

SOLUTIONS = Path(__file__).parent / "solutions"
# Levels 2.1-2.3 teach attributes added after creation (like the PDF's
# ex1/ex2): mypy rightly complains there, which motivates __init__ in 2.4.
MYPY_EXEMPT = {"r2l1", "r2l2", "r2l3", "x1l3"}


def solution(level_id: str) -> dict[str, str]:
    folder = SOLUTIONS / level_id
    return {p.name: p.read_text(encoding="utf-8")
            for p in sorted(folder.glob("*.py"))}


@pytest.fixture()
def store(tmp_path: Path) -> ProgressStore:
    return ProgressStore(tmp_path / "save.json")


def test_order_and_ids() -> None:
    assert len(ORDER) == 43
    assert len(REGIONS) == 13
    for level in LEVELS.values():
        for notion in level.notions:
            assert notion in NOTIONS, (level.id, notion)


def test_every_listed_notion_is_taught() -> None:
    taught = {n for level in LEVELS.values() for n in level.notions}
    optional = {"C12", "E9", "G13", "G1", "G10", "G12"}
    missing = set(NOTIONS) - taught - optional
    assert not missing, missing


@pytest.mark.parametrize("level_id", ORDER)
def test_solution_passes(level_id: str, store: ProgressStore) -> None:
    result = pedagogy.check_mission(store, level_id, solution(level_id))
    failed = [r for r in result["results"] if not r["ok"]]
    assert not result["trace"].get("error"), result["trace"]["error"]
    assert result["passed"], failed


@pytest.mark.parametrize("level_id", ORDER)
def test_starter_fails(level_id: str, store: ProgressStore) -> None:
    starter = LEVELS[level_id].starter or {"main.py": ""}
    result = pedagogy.check_mission(store, level_id, starter)
    assert not result["passed"]


@pytest.mark.parametrize("level_id", ORDER)
def test_solution_quality(level_id: str) -> None:
    report = static_checks.quality_report(solution(level_id))
    issues = report["issues"]
    if level_id in MYPY_EXEMPT:
        issues = [i for i in issues if i["code"] != "TYP"]
    assert not issues, issues
    mypy = report["tools"]["mypy"]
    if mypy.get("available") and level_id not in MYPY_EXEMPT:
        assert mypy["ok"], mypy["output"]


@pytest.mark.parametrize("level_id", ORDER)
def test_quiz_questions(level_id: str) -> None:
    for question in LEVELS[level_id].quiz:
        assert question.prompt
        if question.kind == "predict":
            run = sandbox.execute({"main.py": question.code}, trace=False,
                                  stdin=question.stdin)
            assert run["ok"] or question.explanation.startswith("!"), \
                (level_id, run["error"])
            assert run["output"].strip()
        elif question.kind == "choice":
            assert 0 <= question.answer < len(question.options)


@pytest.mark.parametrize("level_id", ORDER)
def test_demo_runs(level_id: str) -> None:
    level = LEVELS[level_id]
    result = pedagogy.run_code(level.demo, stdin=level.demo_stdin,
                               argv=level.demo_argv)
    assert result["ok"], (level_id, result["error"])


def test_public_payload_hides_answers() -> None:
    for level in LEVELS.values():
        data = level.public()
        assert "hints" not in data
        for check in data["checks"]:
            assert set(check) == {"id", "label"}
        for question in data["quiz"]:
            assert "answer" not in question
            assert "explanation" not in question


def test_full_progression(store: ProgressStore) -> None:
    """Play the whole game with the reference solutions."""
    for level_id in ORDER:
        assert store.is_unlocked(level_id), level_id
        with store.lock:
            store.level(level_id)["steps_seen"].append("story")
        result = pedagogy.check_mission(store, level_id, solution(level_id))
        assert result["passed"], level_id
        for index, question in enumerate(LEVELS[level_id].quiz):
            if question.kind == "predict":
                run = sandbox.execute({"main.py": question.code},
                                      trace=False, stdin=question.stdin)
                answer: object = run["output"]
                if run.get("error"):
                    err = run["error"]
                    answer = pedagogy.normalize_output(run["output"]) + \
                        f"\n{err['type']}: {err['message']}"
            elif question.kind == "choice":
                answer = question.answer
            else:
                answer = "Une explication suffisamment longue pour compter."
            graded = pedagogy.grade_question(store, level_id, index, answer)
            assert graded["correct"], (level_id, index)
        assert store.status(level_id) == "mastered"
    summary = store.summary()
    assert len(summary["rewards"]) == 13
    assert summary["xp"] > 4000
