"""Learner progress: XP, levels, notions, persistence (JSON file)."""
from __future__ import annotations

import json
import math
import threading
import time
from pathlib import Path
from typing import Any

from .curriculum import LEVELS, NOTIONS, ORDER, REGIONS

SAVE_VERSION = 1
QUIZ_FIRST_TRY_XP = 20
QUIZ_RETRY_XP = 5


def readable_save(data: Any) -> bool:
    """A save this version of the game can load (the bare minimum)."""
    return (isinstance(data, dict) and data.get("version") == SAVE_VERSION
            and isinstance(data.get("xp"), (int, float))
            and isinstance(data.get("levels"), dict))


class ProgressStore:
    """Thread-safe JSON save file."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.lock = threading.Lock()
        # A save that could not be loaded is kept aside (see _load): its
        # file name and the time, for the admin panel.
        self.set_aside: dict[str, Any] | None = None
        self.data = self._load()

    # ------------------------------------------------------------ files
    def _load(self) -> dict[str, Any]:
        if self.path.exists():
            try:
                data: Any = json.loads(self.path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                self._keep_aside("illisible")
                return self._fresh()
            if readable_save(data):
                return data  # type: ignore[no-any-return]
            version = data.get("version") if isinstance(data, dict) else None
            self._keep_aside("illisible" if version == SAVE_VERSION
                             or version is None else f"version-{version}")
        return self._fresh()

    def _keep_aside(self, kind: str) -> None:
        """Never lose a save that cannot be loaded: it is renamed with the
        time (progress.illisible-20261125-143000.json), never overwritten."""
        stamp = time.strftime("%Y%m%d-%H%M%S")
        target = self.path.with_name(f"{self.path.stem}.{kind}-{stamp}.json")
        try:
            self.path.replace(target)
        except OSError:
            return
        self.set_aside = {"file": target.name, "kind": kind,
                          "time": time.time()}

    @staticmethod
    def _fresh() -> dict[str, Any]:
        return {"version": SAVE_VERSION, "xp": 0, "levels": {},
                "rewards": [], "created": time.time()}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1),
                       encoding="utf-8")
        tmp.replace(self.path)

    def reset(self) -> None:
        with self.lock:
            self.data = self._fresh()
            self.save()

    def clear(self, keep_code: bool = False) -> None:
        """A fresh start (the caller holds the lock). keep_code: the code
        saved in each level stays."""
        old = self.data["levels"]
        self.data = self._fresh()
        if keep_code:
            for level_id, state in old.items():
                if level_id in LEVELS and (state.get("code")
                                           or state.get("sandbox")):
                    fresh = self.level(level_id)
                    for slot in ("code", "sandbox"):
                        if state.get(slot):
                            fresh[slot] = state[slot]

    def restart_level(self, level_id: str, keep_code: bool = True) -> int:
        """Puts one level back to zero (the caller holds the lock); its XP
        leaves the total. Returns the XP removed. (The levels after it may
        lock again: see Admin.restart, which keeps them open.)"""
        old = self.data["levels"].pop(level_id, None) or {}
        removed = int(sum(old.get("xp", {}).values()))
        self.data["xp"] = max(0, int(self.data["xp"]) - removed)
        if keep_code:
            for slot in ("code", "sandbox"):
                if old.get(slot):
                    self.level(level_id)[slot] = old[slot]
        return removed

    def recompute_rewards(self) -> None:
        """Rewards of regions that are no longer complete leave the list."""
        self.data["rewards"] = [
            region.reward for region in REGIONS
            if region.reward in self.data["rewards"]
            and all(self.status(lvl.id) in ("completed", "mastered")
                    for lvl in region.levels)]

    # ----------------------------------------------------------- levels
    def level(self, level_id: str) -> dict[str, Any]:
        levels: dict[str, Any] = self.data["levels"]
        if level_id not in levels:
            levels[level_id] = {
                "steps_seen": [], "mission_passed": False, "attempts": 0,
                "hints_used": 0, "quiz": {}, "code": {}, "xp": {},
                "quality_bonus": False, "history": [], "reviewing": False,
            }
        return levels[level_id]  # type: ignore[no-any-return]

    def is_unlocked(self, level_id: str) -> bool:
        index = ORDER.index(level_id)
        if index == 0 or self.admin_opens(index):
            return True
        previous = ORDER[index - 1]
        return self.status(previous) in ("completed", "mastered")

    # The organizer can open levels for a participant (admin panel, see
    # server/admin.py) without marking anything as done: no XP, no reward,
    # no achievement. A save without the "admin" block follows the normal
    # rule only.
    def admin(self) -> dict[str, Any]:
        block = self.data.get("admin")
        return block if isinstance(block, dict) else {}

    def admin_opens(self, index: int) -> bool:
        block = self.admin()
        if block.get("all_unlocked"):
            return True
        through = block.get("unlocked_through")
        return through in LEVELS and index <= ORDER.index(through)

    def quiz_done(self, level_id: str) -> bool:
        state = self.data["levels"].get(level_id, {})
        quiz = LEVELS[level_id].quiz
        answers = state.get("quiz", {})
        return all(answers.get(str(i), {}).get("correct") for i in
                   range(len(quiz)))

    def status(self, level_id: str) -> str:
        if not self.is_unlocked(level_id):
            return "locked"
        state = self.data["levels"].get(level_id)
        if not state or not state.get("steps_seen"):
            return "available"
        if not state.get("mission_passed") or not self.quiz_done(level_id):
            return "in_progress"
        clean_quiz = all(a.get("first_try") for a in
                         state.get("quiz", {}).values())
        if clean_quiz and state.get("hints_used", 0) <= 1:
            return "mastered"
        return "completed"

    # -------------------------------------------------------------- xp
    def add_xp(self, level_id: str, key: str, amount: int) -> int:
        state = self.level(level_id)
        if key in state["xp"]:
            return 0
        state["xp"][key] = amount
        self.data["xp"] += amount
        return amount

    def mission_xp(self, level_id: str) -> int:
        base = LEVELS[level_id].xp
        hints = self.level(level_id)["hints_used"]
        return max(base // 2, round(base * (1 - 0.15 * hints)))

    def check_rewards(self) -> list[str]:
        new = []
        for region in REGIONS:
            done = all(self.status(lvl.id) in ("completed", "mastered")
                       for lvl in region.levels)
            if done and region.reward not in self.data["rewards"]:
                self.data["rewards"].append(region.reward)
                new.append(region.reward)
        return new

    # ---------------------------------------------------------- summary
    def notion_states(self) -> dict[str, str]:
        states: dict[str, str] = {}
        for notion in NOTIONS:
            levels = [lid for lid in ORDER if notion in LEVELS[lid].notions]
            statuses = [self.status(lid) for lid in levels]
            if not levels:
                states[notion] = "extension"
            elif "mastered" in statuses and "completed" not in statuses:
                states[notion] = "mastered"
            elif "completed" in statuses:
                states[notion] = "review"
            elif "in_progress" in statuses:
                states[notion] = "discovered"
            else:
                states[notion] = "unknown"
        return states

    def summary(self) -> dict[str, Any]:
        xp = int(self.data["xp"])
        player_level = int((math.sqrt(1 + 8 * xp / 150) - 1) / 2) + 1
        floor_xp = 75 * (player_level - 1) * player_level
        next_xp = 75 * player_level * (player_level + 1)
        levels = {}
        for lid in ORDER:
            state = self.data["levels"].get(lid, {})
            quiz_state = state.get("quiz", {})
            levels[lid] = {
                "status": self.status(lid),
                "steps_seen": state.get("steps_seen", []),
                "mission_passed": state.get("mission_passed", False),
                "attempts": state.get("attempts", 0),
                "hints_used": state.get("hints_used", 0),
                "quiz": quiz_state,
                "xp": sum(state.get("xp", {}).values()),
                "quality_bonus": state.get("quality_bonus", False),
                "history": state.get("history", [])[-10:],
                "has_code": bool(state.get("code")),
                "reviewing": state.get("reviewing", False),
            }
        return {
            "xp": xp, "player_level": player_level,
            "level_floor": floor_xp, "level_next": next_xp,
            "levels": levels, "rewards": self.data["rewards"],
            "notions": self.notion_states(),
            "admin": {key: self.admin().get(key) for key in
                      ("unlocked_through", "all_unlocked", "start_level")},
        }
