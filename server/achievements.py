"""Hidden achievements and play statistics.

Statistics are stored in the save file under ``"stats"`` and unlocked
achievements under ``"achievements"`` (id -> unlock timestamp). Every
function here expects the caller to hold ``store.lock``.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Callable

from .curriculum import LEVELS, NOTIONS, ORDER, REGIONS

if TYPE_CHECKING:
    from .progress import ProgressStore

MAX_PING_SECONDS = 60

# Little secrets of the world (a nod to 42): the browser reports which one
# the player found; only these ids are accepted.
EGGS = ("piscine", "clock", "guide", "peer", "marvin", "segfault",
        "answer", "moulinette", "canard")


@dataclass(frozen=True)
class Achievement:
    id: str
    icon: str
    name: str
    description: str
    clue: str  # shown while the achievement is still hidden
    test: Callable[[dict[str, Any], "ProgressStore"], bool]


def _levels(store: "ProgressStore") -> dict[str, Any]:
    levels: dict[str, Any] = store.data.get("levels", {})
    return levels


def _passed_without_hint(store: "ProgressStore") -> int:
    return sum(1 for state in _levels(store).values()
               if state.get("mission_passed") and not state.get(
                   "hints_used"))


def _clean_bonuses(store: "ProgressStore") -> int:
    return sum(1 for state in _levels(store).values()
               if state.get("quality_bonus"))


def _perfect_quizzes(store: "ProgressStore") -> int:
    count = 0
    for level_id, state in _levels(store).items():
        quiz = LEVELS[level_id].quiz if level_id in LEVELS else []
        answers = state.get("quiz", {})
        if quiz and all(answers.get(str(i), {}).get("first_try")
                        for i in range(len(quiz))):
            count += 1
    return count


def _mastered(store: "ProgressStore") -> int:
    return sum(1 for lid in ORDER if store.status(lid) == "mastered")


ACHIEVEMENTS: list[Achievement] = [
    Achievement("first_run", "🚀", "Premier pas",
                "Exécuter ton tout premier programme.",
                "Un certain bouton vert n'attend que toi…",
                lambda s, _: s["runs"] >= 1),
    Achievement("first_bug", "🐛", "Premier bug",
                "Rencontrer ta première erreur. Tout le monde passe par là !",
                "Tout le monde y passe un jour.",
                lambda s, _: sum(s["errors"].values()) >= 1),
    Achievement("bug_hunter", "🔧", "Chasseur de bugs",
                "Corriger 10 erreurs (une exécution réussie juste après une "
                "erreur).",
                "Une erreur, ça se répare…",
                lambda s, _: s["fixed"] >= 10),
    Achievement("collector", "📚", "Collectionneur d'erreurs",
                "Rencontrer 5 types d'erreurs différents.",
                "NameError, TypeError… attrape-les tous ?",
                lambda s, _: len(s["errors"]) >= 5),
    Achievement("first_try", "🎯", "Du premier coup",
                "Réussir une mission dès la première vérification.",
                "Certains n'ont besoin que d'un essai.",
                lambda s, _: s["first_try"] >= 1),
    Achievement("stubborn", "💪", "Persévérant",
                "Réussir une mission après au moins 5 essais.",
                "Ne jamais abandonner.",
                lambda s, _: s["stubborn"] >= 1),
    Achievement("no_hint_10", "🧠", "Cerveau autonome",
                "Réussir 10 missions sans utiliser aucun indice.",
                "Les indices, c'est pour les autres.",
                lambda _, st: _passed_without_hint(st) >= 10),
    Achievement("clean_5", "✨", "Code impeccable",
                "Obtenir 5 bonus de code propre (style sans remarque).",
                "Un code qui brille…",
                lambda _, st: _clean_bonuses(st) >= 5),
    Achievement("quiz_perfect", "🧩", "Sans faute",
                "Réussir tous les quiz de 5 niveaux du premier coup.",
                "Vérification : 100 %.",
                lambda _, st: _perfect_quizzes(st) >= 5),
    Achievement("detective", "🔍", "Détective",
                "Avancer 50 fois pas à pas dans un programme.",
                "Lentement, mais sûrement.",
                lambda s, _: s["steps"] >= 50),
    Achievement("explorer", "🔎", "Enquêteur",
                "Utiliser « Montrer sur la carte » sur une erreur.",
                "Les erreurs laissent des traces sur la carte.",
                lambda s, _: s["spots"] >= 1),
    Achievement("guided", "🧭", "Bien guidé",
                "Terminer la visite guidée.",
                "Quelqu'un voulait te faire visiter.",
                lambda s, _: bool(s["tour_done"])),
    Achievement("night_owl", "🦉", "Oiseau de nuit",
                "Jouer entre minuit et 5 h du matin.",
                "La nuit, tous les bugs sont gris.",
                lambda s, _: bool(s["night"])),
    Achievement("regular", "📅", "Assidu",
                "Jouer 3 jours différents.",
                "Revenir, encore et encore.",
                lambda s, _: len(s["days"]) >= 3),
    Achievement("marathon", "⏱", "Marathon",
                "Cumuler 2 heures de jeu.",
                "Le temps passe vite quand on code.",
                lambda s, _: sum(s["time"].values()) >= 2 * 3600),
    Achievement("first_region", "🏆", "Conquérant",
                "Terminer une région entière.",
                "Toute une région…",
                lambda _, st: len(st.data.get("rewards", [])) >= 1),
    Achievement("master_10", "👑", "Maître",
                "Maîtriser 10 niveaux (quiz parfaits, au plus 1 indice).",
                "La couronne se mérite.",
                lambda _, st: _mastered(st) >= 10),
    Achievement("egg_first", "🥚", "Curieux",
                "Trouver un des secrets cachés dans le monde.",
                "Le monde est plein de détails… clique partout.",
                lambda s, _: len(s["eggs"]) >= 1),
    Achievement("egg_42", "🌌", "La grande question",
                "Trouver 5 secrets cachés dans le monde.",
                "La réponse est quelque part entre 41 et 43.",
                lambda s, _: len(s["eggs"]) >= 5),
]

BY_ID = {a.id: a for a in ACHIEVEMENTS}


def stats(store: "ProgressStore") -> dict[str, Any]:
    """The stats dict of the save, created / completed if needed."""
    data: dict[str, Any] = store.data.setdefault("stats", {})
    defaults: dict[str, Any] = {
        "runs": 0, "errors": {}, "fixed": 0, "first_try": 0, "stubborn": 0,
        "steps": 0, "spots": 0, "tour_done": False, "night": False,
        "days": [], "time": {}, "broken": {}, "eggs": [],
    }
    for key, value in defaults.items():
        if key not in data:
            data[key] = value.copy() if isinstance(value, (dict, list)) \
                else value
    store.data.setdefault("achievements", {})
    return data


def unlock_new(store: "ProgressStore") -> list[dict[str, str]]:
    """Unlock every achievement whose condition is now true."""
    st = stats(store)
    unlocked: dict[str, float] = store.data["achievements"]
    new = []
    for ach in ACHIEVEMENTS:
        if ach.id in unlocked:
            continue
        if ach.test(st, store):
            unlocked[ach.id] = time.time()
            new.append(public(ach, True))
    return new


def public(ach: Achievement, unlocked: bool) -> dict[str, str]:
    if unlocked:
        return {"id": ach.id, "icon": ach.icon, "name": ach.name,
                "description": ach.description}
    return {"id": ach.id, "icon": "❔", "name": "Succès caché",
            "description": ach.clue}


# ------------------------------------------------------------- recorders
def record_run(store: "ProgressStore", level_id: str | None,
               error_type: str | None) -> None:
    st = stats(store)
    st["runs"] += 1
    slot = level_id or "_free"
    if error_type:
        st["errors"][error_type] = st["errors"].get(error_type, 0) + 1
        st["broken"][slot] = True
    elif st["broken"].pop(slot, False):
        st["fixed"] += 1


def record_check(store: "ProgressStore", level_id: str, passed: bool,
                 already_passed: bool, attempts: int) -> None:
    st = stats(store)
    if passed and not already_passed:
        if attempts == 1:
            st["first_try"] += 1
        if attempts >= 5:
            st["stubborn"] += 1


def record_event(store: "ProgressStore", kind: str,
                 data: dict[str, Any]) -> None:
    """Events sent by the browser: time spent, steps, session, tour…"""
    st = stats(store)
    if kind == "time":
        level_id = str(data.get("level", ""))
        if level_id in LEVELS:
            seconds = max(0, min(MAX_PING_SECONDS, int(data.get("seconds",
                                                                0))))
            st["time"][level_id] = st["time"].get(level_id, 0) + seconds
    elif kind == "steps":
        st["steps"] += max(0, min(500, int(data.get("count", 0))))
    elif kind == "spot":
        st["spots"] += 1
    elif kind == "tour":
        st["tour_done"] = True
    elif kind == "egg":
        egg = str(data.get("id", ""))
        if egg not in EGGS:
            raise ValueError("Secret inconnu.")
        if egg not in st["eggs"]:
            st["eggs"].append(egg)
    elif kind == "session":
        day = str(data.get("date", ""))[:10]
        if day and day not in st["days"]:
            st["days"].append(day)
            st["days"] = st["days"][-60:]
        hour = int(data.get("hour", 12))
        if 0 <= hour < 5:
            st["night"] = True
    else:
        raise ValueError("Événement inconnu.")


# --------------------------------------------------------------- summary
def _listed(ach: Achievement, unlocked: bool) -> dict[str, Any]:
    item: dict[str, Any] = dict(public(ach, unlocked))
    item["unlocked"] = unlocked
    return item


def summary(store: "ProgressStore") -> dict[str, Any]:
    st = stats(store)
    unlocked = store.data["achievements"]
    per_notion: dict[str, int] = {}
    for level_id, seconds in st["time"].items():
        notions = LEVELS[level_id].notions if level_id in LEVELS else []
        for notion in notions:
            per_notion[notion] = per_notion.get(notion, 0) + \
                seconds // max(1, len(notions))
    per_region = []
    for region in REGIONS:
        seconds = sum(st["time"].get(lvl.id, 0) for lvl in region.levels)
        per_region.append({"name": region.name, "icon": region.icon,
                           "seconds": seconds})
    top_notions = sorted(per_notion.items(), key=lambda kv: -kv[1])[:8]
    return {
        "total_time": sum(st["time"].values()),
        "runs": st["runs"],
        "errors": sum(st["errors"].values()),
        "error_types": sorted(st["errors"].items(), key=lambda kv: -kv[1]),
        "fixed": st["fixed"],
        "steps": st["steps"],
        "no_hint": _passed_without_hint(store),
        "first_try": st["first_try"],
        "days": len(st["days"]),
        "per_region": per_region,
        "per_notion": [{"id": n, "name": NOTIONS.get(n, n), "seconds": s}
                       for n, s in top_notions],
        "achievements": [_listed(a, a.id in unlocked)
                         for a in ACHIEVEMENTS],
        "unlocked": len(unlocked),
        "total": len(ACHIEVEMENTS),
    }
