"""Pedagogical logic: running, checking, hints, quiz grading."""
from __future__ import annotations

import time
from typing import Any

from . import sandbox, static_checks
from .curriculum import LEVELS
from .curriculum.model import Level
from .errors_fr import explain
from .progress import QUIZ_FIRST_TRY_XP, QUIZ_RETRY_XP, ProgressStore

MAX_FILES = 6
MAX_SOURCE = 40_000


def clean_files(files: Any) -> dict[str, str]:
    if not isinstance(files, dict) or not files:
        raise ValueError("Aucun fichier reçu.")
    cleaned: dict[str, str] = {}
    for name, source in list(files.items())[:MAX_FILES]:
        if not isinstance(name, str) or not isinstance(source, str):
            raise ValueError("Fichiers invalides.")
        if not name.endswith(".py") or "/" in name or "\\" in name \
                or name.startswith("."):
            raise ValueError(f"Nom de fichier refusé : {name}")
        cleaned[name] = source[:MAX_SOURCE]
    return cleaned


def clean_lines(values: Any, limit: int = 60) -> list[str]:
    if not isinstance(values, list):
        return []
    return [str(v)[:500] for v in values[:limit]]


def run_code(files: dict[str, str], entry: str = "main.py",
             stdin: list[str] | None = None,
             argv: list[str] | None = None) -> dict[str, Any]:
    result = sandbox.execute(files, entry=entry, trace=True, stdin=stdin,
                             argv=argv)
    if result.get("error"):
        result["error"]["help"] = explain(result["error"], files)
    return result


def check_mission(store: ProgressStore, level_id: str,
                  files: dict[str, str], stdin: list[str] | None = None,
                  argv: list[str] | None = None) -> dict[str, Any]:
    level = LEVELS[level_id]
    for name, source in level.starter.items():
        if name in level.readonly:
            files[name] = source  # read-only helpers cannot be changed
    stdin = level.stdin if stdin is None else stdin
    argv = level.argv if argv is None else argv
    trace = run_code(files, stdin=stdin, argv=argv)
    results: list[dict[str, Any]] = []
    trees = {name: static_checks.parse(src) for name, src in files.items()}

    dynamic_checks = [c for c in level.checks if c.kind == "dynamic"]
    dyn_results: dict[str, dict[str, Any]] = {}
    if dynamic_checks and not trace.get("error"):
        run = sandbox.execute(
            files, trace=False, seed=int(time.time()) % 10_000,
            checks=[{"id": c.id, "code": c.code} for c in dynamic_checks],
            stdin=stdin, argv=argv)
        if run.get("error"):
            trace["error"] = run["error"]
            trace["error"]["help"] = explain(run["error"], files)
        dyn_results = {r["id"]: r for r in run.get("checks", [])}

    for check in level.checks:
        item: dict[str, Any] = {"id": check.id, "label": check.label,
                                "ok": False, "message": "", "line": None}
        if check.kind == "static":
            try:
                ok, message, line = static_checks.run_rule(
                    check.rule, check.args, files)
            except Exception as exc:  # malformed learner code
                ok, message, line = False, f"Analyse impossible : {exc}", None
            item.update(ok=ok, message="" if ok else message, line=line,
                        file=check.args.get("file", "main.py"))
        else:
            res = dyn_results.get(check.id)
            if res is None:
                item["message"] = ("Non vérifié : ton programme doit "
                                   "d'abord s'exécuter sans erreur.")
                item["skipped"] = True
            else:
                item["ok"] = bool(res.get("ok"))
                item["message"] = res.get("message", "")
                err = res.get("error")
                if err and err.get("line"):
                    item["line"] = err["line"]
                    item["file"] = err.get("file", "main.py")
                    item["help"] = explain(err, files)
            if not item["ok"] and item["line"] is None and check.locate:
                item["line"] = static_checks.line_of(
                    trees.get("main.py"), check.locate)
        if not item["ok"] and check.hint:
            item["hint"] = check.hint
        results.append(item)

    passed = all(r["ok"] for r in results) and not trace.get("error")
    quality = static_checks.quality_report(files)
    quality_clean = not quality["issues"]

    gained: list[dict[str, Any]] = []
    with store.lock:
        state = store.level(level_id)
        state["attempts"] += 1
        state["code"] = files
        state["history"].append({
            "t": time.time(), "passed": sum(r["ok"] for r in results),
            "total": len(results)})
        state["history"] = state["history"][-30:]
        if passed:
            state["mission_passed"] = True
            amount = store.add_xp(level_id, "mission",
                                  store.mission_xp(level_id))
            if amount:
                gained.append({"label": "Mission réussie", "xp": amount})
            if quality_clean and not state["quality_bonus"]:
                state["quality_bonus"] = True
                bonus = store.add_xp(level_id, "quality",
                                     max(20, level.xp // 4))
                gained.append({"label": "Bonus code propre", "xp": bonus})
        rewards = store.check_rewards()
        store.save()
        summary = store.summary()
    return {
        "passed": passed, "results": results, "trace": trace,
        "quality": quality, "xp_gained": gained, "rewards": rewards,
        "progress": summary,
        "suggest_hint": not passed and state["attempts"] >= 3
        and state["hints_used"] < len(level.hints),
    }


def next_hint(store: ProgressStore, level_id: str) -> dict[str, Any]:
    level = LEVELS[level_id]
    with store.lock:
        state = store.level(level_id)
        index = min(state["hints_used"], len(level.hints) - 1)
        if state["hints_used"] < len(level.hints):
            state["hints_used"] += 1
        store.save()
        used = state["hints_used"]
    return {"hint": level.hints[index], "index": index + 1,
            "total": len(level.hints), "used": used,
            "all": level.hints[:used]}


def unlocked_hints(store: ProgressStore, level_id: str) -> dict[str, Any]:
    level = LEVELS[level_id]
    with store.lock:
        used = store.level(level_id)["hints_used"]
    return {"all": level.hints[:used], "used": used,
            "total": len(level.hints)}


def normalize_output(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r", "").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    while lines and not lines[0]:
        lines.pop(0)
    return "\n".join(lines)


def grade_question(store: ProgressStore, level_id: str, index: int,
                   answer: Any) -> dict[str, Any]:
    level: Level = LEVELS[level_id]
    if not 0 <= index < len(level.quiz):
        raise ValueError("Question inconnue.")
    question = level.quiz[index]
    response: dict[str, Any] = {"explanation": question.explanation}
    if question.kind == "predict":
        run = sandbox.execute({"main.py": question.code}, trace=False,
                              stdin=question.stdin, argv=[])
        expected = normalize_output(run.get("output", ""))
        if run.get("error"):
            err = run["error"]
            expected = (expected + "\n" if expected else "") + \
                f"{err['type']}: {err['message']}"
        given = normalize_output(str(answer))
        correct = given == expected
        response.update(expected=expected, given=given)
    elif question.kind == "choice":
        correct = int(answer) == question.answer
        response["answer"] = question.answer
    else:
        text = str(answer).strip()
        correct = len(text) >= 25
        response["reference"] = question.explanation
        if not correct:
            response["explanation"] = ("Développe un peu plus ton "
                                       "explication (au moins une phrase "
                                       "complète).")
    response["correct"] = correct
    with store.lock:
        state = store.level(level_id)
        record = state["quiz"].setdefault(str(index), {
            "attempts": 0, "correct": False, "first_try": False})
        already = record["correct"]
        record["attempts"] += 1
        if correct and not already:
            record["correct"] = True
            record["first_try"] = record["attempts"] == 1
            if question.kind == "explain":
                record["text"] = str(answer)[:2000]
            xp = QUIZ_FIRST_TRY_XP if record["first_try"] else QUIZ_RETRY_XP
            key = f"quiz{index}" + ("r" if state.get("reviewing") else "")
            response["xp"] = store.add_xp(level_id, key, xp)
        if store.quiz_done(level_id):
            state["reviewing"] = False
        response["rewards"] = store.check_rewards()
        store.save()
        response["progress"] = store.summary()
    return response


def start_review(store: ProgressStore, level_id: str) -> dict[str, Any]:
    """Mastery challenge: answer the questions again, first try."""
    with store.lock:
        state = store.level(level_id)
        state["quiz"] = {}
        state["hints_used"] = 0
        state["reviewing"] = True
        store.save()
        return store.summary()
