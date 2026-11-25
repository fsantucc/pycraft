"""The secrets of the world (nods to 42): the server records the ones found,
refuses unknown ids, and unlocks two hidden achievements."""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from server import achievements
from server.progress import ProgressStore

ROOT = Path(__file__).resolve().parent.parent


def test_browser_and_server_know_the_same_secrets() -> None:
    source = (ROOT / "web/js/characters.js").read_text(encoding="utf-8")
    block = source[source.index("export const EGGS"):]
    block = block[:block.index("};")]
    found = set(re.findall(r"^\s+(\w+):", block, re.M))
    assert found == set(achievements.EGGS)


def test_secrets_unlock_achievements(tmp_path: Path) -> None:
    store = ProgressStore(tmp_path / "progress.json")
    with store.lock:
        achievements.record_event(store, "egg", {"id": "piscine"})
        new = {a["id"] for a in achievements.unlock_new(store)}
        assert "egg_first" in new and "egg_42" not in new
        # The same secret twice counts once.
        achievements.record_event(store, "egg", {"id": "piscine"})
        assert achievements.stats(store)["eggs"] == ["piscine"]
        for egg in ("clock", "guide", "peer", "answer"):
            achievements.record_event(store, "egg", {"id": egg})
        assert "egg_42" in {a["id"] for a in achievements.unlock_new(store)}


def test_unknown_secret_is_refused(tmp_path: Path) -> None:
    store = ProgressStore(tmp_path / "progress.json")
    with store.lock, pytest.raises(ValueError):
        achievements.record_event(store, "egg", {"id": "<script>"})
    assert achievements.stats(store)["eggs"] == []
