"""Code → world: the rules of the scenes really fire on real programs.

The demonstration of each level with rules runs in the sandbox, and the
JavaScript rule engine (web/js/reactions.js, run by node) replays its trace:
at least one rule must change the world. For level 1.1, the locked tester of
the mission runs with a stand-in ``lanterne.py`` (not the solution: it
prints nothing) — calling the function must still light the lantern after
the night has fallen.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

from server import pedagogy
from server.curriculum import LEVELS, ORDER

ROOT = Path(__file__).resolve().parent.parent
NODE = shutil.which("node")
needs_node = pytest.mark.skipif(NODE is None, reason="node non installé")

ACTIONS = {"night", "light", "open", "grow", "mob", "flee", "pulse", "say",
           "pose", "sound", "burst"}
PATTERNS = {"print", "call", "spawn", "set", "var", "value", "yield",
            "input", "error", "returns", "raise", "caught"}
RULED = [lid for lid in ORDER if LEVELS[lid].scene.get("react")]


def replay(rules: list[Any], result: dict[str, Any]) -> dict[str, Any]:
    """The state of the world at the end of the run, computed by the
    browser's own engine."""
    assert NODE is not None
    batches = [result.get("pre_events") or []]
    batches += [step["events"] for step in result.get("steps") or []]
    script = (
        "import { replay } from '" + (ROOT / "web/js/reactions.js").as_uri()
        + "';\nlet data = '';\nprocess.stdin.on('data', (c) => data += c);\n"
        "process.stdin.on('end', () => { const d = JSON.parse(data);\n"
        "  process.stdout.write(JSON.stringify("
        "replay(d.rules, d.batches).state)); });\n")
    done = subprocess.run(
        [NODE, "--input-type=module", "-e", script],
        input=json.dumps({"rules": rules, "batches": batches}),
        capture_output=True, text=True, timeout=30)
    assert done.returncode == 0, done.stderr
    state: dict[str, Any] = json.loads(done.stdout)
    return state


def test_every_level_with_a_demo_reacts() -> None:
    for lid in ORDER:
        has_demo = any(line.strip() and not line.startswith("#")
                       for code in LEVELS[lid].demo.values()
                       for line in code.splitlines())
        assert (lid in RULED) == has_demo, lid


def test_rules_are_well_formed() -> None:
    assert len(RULED) >= 40
    for lid in RULED:
        scene = LEVELS[lid].scene
        targets = {p["type"] for p in scene["props"]}
        npcs = {n["id"] for n in scene["npcs"]}
        for rule in scene["react"]:
            assert rule["on"] and set(rule["on"]) <= PATTERNS, (lid, rule)
            for action in rule["do"]:
                assert action[0] in ACTIONS, (lid, action)
                if action[0] in ("light", "open", "grow", "pulse", "burst"):
                    assert action[1] in targets, (lid, action)
                if action[0] in ("say", "pose"):
                    assert action[1] in npcs, (lid, action)


def test_rules_reach_the_browser() -> None:
    public = LEVELS["a1l1"].public()
    assert public["scene"]["react"]
    lantern = [p for p in public["scene"]["props"] if p["type"] == "lantern"]
    assert lantern[0]["start"] == {"on": False}


@needs_node
@pytest.mark.parametrize("lid", RULED)
def test_the_demo_changes_the_world(lid: str) -> None:
    level = LEVELS[lid]
    result = pedagogy.run_code(dict(level.demo), "main.py",
                               list(level.demo_stdin or []),
                               list(level.demo_argv or []))
    state = replay(level.scene["react"], result)
    assert state["fired"] >= 1, f"{lid} : aucune règle ne réagit à la démo"


@needs_node
def test_level_1_1_night_and_lantern() -> None:
    level = LEVELS["a1l1"]
    files = {"main.py": level.starter["main.py"],
             "lanterne.py": "def allumer_lanterne() -> None:\n    pass\n"}
    result = pedagogy.run_code(files)
    assert not result["error"], result["error"]
    rules = level.scene["react"]
    state = replay(rules, result)
    assert state["night"] is True
    assert state["props"]["lantern"]["on"] is True
    assert state["mobs"] == [], "the light drove the zombie away"
    # Without calling the function: night, no light, the zombie stays.
    files["main.py"] = 'print("La nuit tombe...")\n'
    dark = replay(rules, pedagogy.run_code(files))
    assert dark["night"] is True
    assert "lantern" not in dark["props"]
    assert len(dark["mobs"]) == 1
