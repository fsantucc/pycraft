"""The organizer's tools for a workshop (admin panel).

Everything here works on the save of THIS installation (the file given to
run.py with --save): an admin session, the starting level of a participant,
backups, a new participant, a short history of the admin actions.

* Access: a password checked here only (a salted PBKDF2 hash: the password
  never appears in clear in the code), a random session token kept in memory
  (sliding expiry), a short lockout after repeated mistakes.
* Opening levels never fakes progress: the save gets an optional "admin"
  block (``unlocked_through``, ``all_unlocked``, ``start_level``) that
  ``ProgressStore.is_unlocked`` honours. No XP, reward or achievement comes
  from it, and a save without the block plays exactly as before.
* Every operation that removes or overwrites data first makes a backup.
* Every operation can be previewed (``dry``): it is applied to a copy, the
  difference is returned, nothing is written.
"""
from __future__ import annotations

import copy
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from pathlib import Path
from typing import Any, Callable

from .curriculum import ACTS, LEVELS, ORDER, REGIONS
from .progress import SAVE_VERSION, ProgressStore, readable_save

# PBKDF2-SHA256 of the default password of the workshop. Another password:
# set the environment variable PYCRAFT_ADMIN_PASSWORD before run.py.
DEFAULT_SALT = bytes.fromhex("ff9160be819993b2e02870a29c2db940")
DEFAULT_HASH = bytes.fromhex(
    "d39080e4bad7cb0b1aadeac5c315f4b021f5b939b6c2c9f2b51c87ae063ee9f7")
ITERATIONS = 200_000
SESSION_IDLE = 30 * 60      # seconds without any admin action
SESSION_MAX = 8 * 3600      # whatever happens
MAX_FAILS = 5
LOCKOUT = 30
BACKUPS_KEPT = 30
HISTORY_KEPT = 50
IMPORT_MAX = 5_000_000      # bytes


class AdminError(ValueError):
    """A refused admin operation (message in French, shown as is)."""


class AuthError(PermissionError):
    """No valid admin session."""


class LockedOut(PermissionError):
    """Too many wrong passwords: wait a little."""


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt,
                               ITERATIONS)


class AdminAuth:
    """Password check and admin sessions (in memory: a restart of the
    server logs everybody out)."""

    def __init__(self, password: str | None = None,
                 idle: float = SESSION_IDLE,
                 clock: Callable[[], float] = time.monotonic) -> None:
        if password is None:
            password = os.environ.get("PYCRAFT_ADMIN_PASSWORD") or None
        self.default = password is None
        if password is None:
            self.salt, self.hash = DEFAULT_SALT, DEFAULT_HASH
        else:
            self.salt = secrets.token_bytes(16)
            self.hash = _derive(password, self.salt)
        self.idle = idle
        self.clock = clock
        self.sessions: dict[str, tuple[float, float]] = {}  # start, last
        self.fails = 0
        self.locked_until = 0.0

    def login(self, password: Any) -> str:
        now = self.clock()
        if now < self.locked_until:
            wait = int(self.locked_until - now) + 1
            raise LockedOut(f"Trop d'essais, réessaie dans {wait} s.")
        given = _derive(str(password or ""), self.salt)
        if not hmac.compare_digest(given, self.hash):
            self.fails += 1
            if self.fails >= MAX_FAILS:
                self.fails = 0
                self.locked_until = now + LOCKOUT
                raise LockedOut(
                    f"Trop d'essais, réessaie dans {LOCKOUT} s.")
            raise AuthError("Mot de passe incorrect.")
        self.fails = 0
        token = secrets.token_urlsafe(32)
        self.sessions[token] = (now, now)
        return token

    def check(self, token: str | None) -> bool:
        """A valid session (and it is kept alive)."""
        if not token or token not in self.sessions:
            return False
        start, last = self.sessions[token]
        now = self.clock()
        if now - last > self.idle or now - start > SESSION_MAX:
            del self.sessions[token]
            return False
        self.sessions[token] = (start, now)
        return True

    def remaining(self, token: str | None) -> int:
        if not token or token not in self.sessions:
            return 0
        start, last = self.sessions[token]
        now = self.clock()
        return max(0, int(min(last + self.idle, start + SESSION_MAX) - now))

    def logout(self, token: str | None) -> None:
        if token:
            self.sessions.pop(token, None)


# ---------------------------------------------------------------- names
REGION_OF = {lvl.id: region for region in REGIONS for lvl in region.levels}
ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV"}


def level_name(level_id: str) -> str:
    level = LEVELS[level_id]
    return f"{level.number} · {level.title}"


def act_name(level_id: str) -> str:
    act = REGION_OF[level_id].act
    return f"Acte {ROMAN.get(act, act)}"


def check_level(level_id: Any) -> str:
    if not isinstance(level_id, str) or level_id not in LEVELS:
        raise AdminError("Niveau inconnu.")
    return level_id


# ------------------------------------------------------------ validation
LEVEL_FIELDS: dict[str, type | tuple[type, ...]] = {
    "steps_seen": list, "mission_passed": bool, "attempts": int,
    "hints_used": int, "quiz": dict, "code": dict, "xp": dict,
    "quality_bonus": bool, "history": list, "reviewing": bool,
    "sandbox": dict,
}


def validate_save(data: Any) -> list[str]:
    """What is wrong with a save file (empty: it can be used)."""
    if not isinstance(data, dict):
        return ["Ce fichier ne contient pas une sauvegarde PyCraft."]
    if data.get("version") != SAVE_VERSION:
        return [f"Version {data.get('version')!r} non compatible "
                f"(attendue : {SAVE_VERSION})."]
    problems = []
    xp = data.get("xp")
    if isinstance(xp, bool) or not isinstance(xp, int) or xp < 0:
        problems.append("« xp » doit être un nombre entier positif.")
    levels = data.get("levels")
    if not isinstance(levels, dict):
        problems.append("« levels » doit être un dictionnaire.")
        levels = {}
    for level_id, state in levels.items():
        if level_id not in LEVELS:
            problems.append(f"Niveau inconnu : « {level_id} ».")
            continue
        if not isinstance(state, dict):
            problems.append(f"Niveau {level_id} : données invalides.")
            continue
        for field, kind in LEVEL_FIELDS.items():
            value = state.get(field)
            wrong = value is not None and (
                not isinstance(value, kind)
                or (kind is int and isinstance(value, bool)))
            if wrong:
                problems.append(f"Niveau {level_id} : « {field} » invalide.")
        if not all(isinstance(v, int) for v in state.get("xp", {}).values()):
            problems.append(f"Niveau {level_id} : « xp » invalide.")
    rewards = data.get("rewards", [])
    if not isinstance(rewards, list) or not all(
            isinstance(r, str) for r in rewards):
        problems.append("« rewards » doit être une liste de textes.")
    for field in ("achievements", "stats"):
        if field in data and not isinstance(data[field], dict):
            problems.append(f"« {field} » doit être un dictionnaire.")
    block = data.get("admin")
    if block is not None:
        if not isinstance(block, dict):
            problems.append("« admin » doit être un dictionnaire.")
        else:
            for field in ("unlocked_through", "start_level"):
                value = block.get(field)
                if value is not None and value not in LEVELS:
                    problems.append(f"« admin.{field} » : niveau inconnu.")
    return problems[:8]


# ------------------------------------------------------------------ admin
class Admin:
    """The admin operations on one save (and its folder)."""

    def __init__(self, store: ProgressStore) -> None:
        self.store = store
        self.folder = store.path.parent
        self.backups = self.folder / "backups"
        self.history_path = self.folder / "admin-history.json"

    # ------------------------------------------------------- utilities
    def _write(self, path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1),
                       encoding="utf-8")
        tmp.replace(path)

    def _statuses(self) -> dict[str, str]:
        return {lid: self.store.status(lid) for lid in ORDER}

    def _block(self) -> dict[str, Any]:
        block = self.store.data.get("admin")
        if not isinstance(block, dict):
            block = {}
            self.store.data["admin"] = block
        return block

    def _furthest_open(self) -> int:
        """The index of the last level the player can open."""
        statuses = self._statuses()
        return max(i for i, lid in enumerate(ORDER)
                   if statuses[lid] != "locked")

    def _keep_open(self, index: int) -> None:
        """Levels up to index stay open (used after a reset)."""
        if index <= 0 or self._furthest_open() >= index:
            return
        self._block()["unlocked_through"] = ORDER[index]

    def _run(self, apply: Callable[[], str], dry: bool,
             backup: str | None = None) -> dict[str, Any]:
        """Applies an operation (the caller does not hold the lock).
        dry: on a copy, returns what would change. backup: a backup is made
        first (label). Returns the history line, the changes, the
        progress."""
        with self.store.lock:
            before = self._statuses()
            xp_before = int(self.store.data["xp"])
            saved = copy.deepcopy(self.store.data)
            try:
                line = apply()
            except Exception:
                self.store.data = saved
                raise
            after = self._statuses()
            changes = {
                "opened": [lid for lid in ORDER if before[lid] == "locked"
                           and after[lid] != "locked"],
                "locked": [lid for lid in ORDER if before[lid] != "locked"
                           and after[lid] == "locked"],
                "xp": int(self.store.data["xp"]) - xp_before,
                "start": self.store.admin().get("start_level"),
            }
            if dry:
                self.store.data = saved
                return {"dry": True, "changes": changes, "action": line}
            if backup is not None:
                self._backup_data(saved, backup)
            self.store.save()
            self._log(line)
            return {"done": True, "changes": changes, "action": line,
                    "progress": self.store.summary()}

    # ------------------------------------------------------- history
    def history(self) -> list[dict[str, Any]]:
        try:
            data = json.loads(self.history_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return []
        return [e for e in data if isinstance(e, dict)] \
            if isinstance(data, list) else []

    def _log(self, action: str) -> None:
        entries = self.history()
        entries.append({"time": time.time(), "action": action})
        self._write(self.history_path, entries[-HISTORY_KEPT:])

    def log(self, action: str) -> None:
        with self.store.lock:
            self._log(action)

    # ------------------------------------------------------- backups
    @staticmethod
    def _label(text: Any) -> str:
        clean = re.sub(r"[^\w-]+", "-", str(text or ""), flags=re.UNICODE)
        return clean.strip("-_")[:24]

    def _backup_data(self, data: dict[str, Any], label: str = "") -> str:
        stamp = time.strftime("%Y%m%d-%H%M%S")
        name = f"{self.store.path.stem}-{stamp}"
        if self._label(label):
            name += f"-{self._label(label)}"
        path = self.backups / f"{name}.json"
        n = 2
        while path.exists():
            path = self.backups / f"{name}-{n}.json"
            n += 1
        self._write(path, data)
        files = sorted(self.backups.glob("*.json"),
                       key=lambda p: p.stat().st_mtime)
        for old in files[:-BACKUPS_KEPT]:
            old.unlink(missing_ok=True)
        return path.name

    def backup(self, label: Any = "") -> dict[str, Any]:
        with self.store.lock:
            name = self._backup_data(copy.deepcopy(self.store.data),
                                     str(label or ""))
            self._log(f"Sauvegarde créée ({name})")
        return {"done": True, "file": name, "action": "Sauvegarde créée"}

    def list_backups(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        if not self.backups.is_dir():
            return out
        files = sorted(self.backups.glob("*.json"),
                       key=lambda p: p.stat().st_mtime, reverse=True)
        for path in files:
            entry: dict[str, Any] = {"file": path.name,
                                     "time": path.stat().st_mtime,
                                     "size": path.stat().st_size}
            match = re.match(rf"{re.escape(self.store.path.stem)}"
                             r"-\d{8}-\d{6}-?(.*)\.json$", path.name)
            entry["label"] = match.group(1) if match else ""
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                entry["broken"] = True
                out.append(entry)
                continue
            if readable_save(data):
                levels = data["levels"]
                played = [lid for lid in ORDER
                          if levels.get(lid, {}).get("steps_seen")]
                entry["xp"] = int(data["xp"])
                entry["passed"] = sum(1 for s in levels.values()
                                      if isinstance(s, dict)
                                      and s.get("mission_passed"))
                entry["reached"] = LEVELS[played[-1]].number \
                    if played else None
            else:
                entry["broken"] = True
            out.append(entry)
        return out

    def _read_backup(self, name: Any) -> dict[str, Any]:
        names = {b["file"] for b in self.list_backups()}
        if not isinstance(name, str) or name not in names:
            raise AdminError("Sauvegarde introuvable.")
        try:
            data = json.loads((self.backups / name).read_text(
                encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise AdminError("Cette sauvegarde est illisible.") from exc
        problems = validate_save(data)
        if problems:
            raise AdminError(" ".join(problems))
        return data  # type: ignore[no-any-return]

    def restore(self, name: Any, dry: bool = False) -> dict[str, Any]:
        data = self._read_backup(name)

        def apply() -> str:
            self.store.data = copy.deepcopy(data)
            return f"Sauvegarde restaurée : {name}"
        result = self._run(apply, dry, backup="avant-restauration")
        if not dry:
            self.store.set_aside = None  # the notice has been dealt with
        return result

    def restore_last(self, dry: bool = False) -> dict[str, Any]:
        usable = [b for b in self.list_backups() if not b.get("broken")]
        if not usable:
            raise AdminError("Aucune sauvegarde à restaurer.")
        return self.restore(usable[0]["file"], dry)

    def export(self) -> tuple[bytes, str]:
        with self.store.lock:
            body = json.dumps(self.store.data, ensure_ascii=False,
                              indent=1).encode("utf-8")
        name = time.strftime("pycraft-sauvegarde-%Y-%m-%d-%H%M.json")
        return body, name

    def import_save(self, data: Any, name: Any = "",
                    dry: bool = False) -> dict[str, Any]:
        problems = validate_save(data)
        if problems:
            raise AdminError("Fichier refusé : " + " ".join(problems))
        source = str(name or "fichier")[:60]

        def apply() -> str:
            self.store.data = copy.deepcopy(data)
            self.store.data.setdefault("rewards", [])
            self.store.data.setdefault("created", time.time())
            return f"Sauvegarde importée ({source})"
        result = self._run(apply, dry, backup="avant-import")
        if not dry:
            self.store.set_aside = None
        return result

    # ---------------------------------------------------- progression
    def start_at(self, level_id: Any, dry: bool = False) -> dict[str, Any]:
        """The participant starts at this level: it and every level before
        open (nothing is marked as done)."""
        level_id = check_level(level_id)

        def apply() -> str:
            if level_id == ORDER[0]:
                # The very beginning: the normal progression, nothing
                # opened in advance.
                self.store.data["admin"] = {"start_level": level_id}
                return "Départ au début (progression normale)"
            block = self._block()
            block["unlocked_through"] = level_id
            block["start_level"] = level_id
            return (f"Départ fixé au {level_name(level_id)} "
                    f"({act_name(level_id)})")
        result = self._run(apply, dry)
        result["open"] = level_id
        return result

    def unlock(self, scope: Any, level_id: Any = None,
               dry: bool = False) -> dict[str, Any]:
        """next / region (from the current level), all (free exploration),
        normal (back to the normal rule)."""
        def apply() -> str:
            block = self._block()
            if scope == "all":
                block["all_unlocked"] = True
                return f"Exploration libre : les {len(ORDER)} niveaux " \
                    "débloqués"
            if scope == "normal":
                self.store.data.pop("admin", None)
                return "Retour à la progression normale"
            current = check_level(level_id)
            index = ORDER.index(current)
            if scope == "next":
                if index + 1 >= len(ORDER):
                    raise AdminError("C'est déjà le dernier niveau.")
                target = ORDER[index + 1]
                line = f"Niveau suivant débloqué : {level_name(target)}"
            elif scope == "region":
                region = REGION_OF[current]
                target = region.levels[-1].id
                line = f"Région débloquée : {region.name} " \
                    f"(jusqu'au {LEVELS[target].number})"
            else:
                raise AdminError("Action inconnue.")
            through = block.get("unlocked_through")
            if through not in LEVELS or \
                    ORDER.index(through) < ORDER.index(target):
                block["unlocked_through"] = target
            return line
        result = self._run(apply, dry)
        if scope == "next" and isinstance(level_id, str) \
                and level_id in ORDER and level_id != ORDER[-1]:
            result["open"] = ORDER[ORDER.index(level_id) + 1]
        return result

    def restart(self, level_id: Any, keep_code: bool = True,
                dry: bool = False) -> dict[str, Any]:
        """One level back to zero; the levels after it stay open."""
        level_id = check_level(level_id)

        def apply() -> str:
            furthest = self._furthest_open()
            removed = self.store.restart_level(level_id, keep_code)
            self._keep_open(furthest)
            self.store.recompute_rewards()
            code = "code conservé" if keep_code else "code effacé"
            return f"Niveau {LEVELS[level_id].number} recommencé " \
                f"({code}, {removed} XP retirés)"
        label = f"avant-{LEVELS[level_id].number}"
        result = self._run(apply, dry, backup=label)
        result["open"] = level_id
        return result

    def new_participant(self, label: Any = "", keep_code: bool = False,
                        start: Any = None, dry: bool = False
                        ) -> dict[str, Any]:
        """The save of the previous participant is backed up, then the
        game starts again from scratch at the chosen level."""
        start_id = check_level(start or ORDER[0])
        previous = self._label(label)

        def apply() -> str:
            self.store.clear(keep_code)
            block = self._block()
            block["start_level"] = start_id
            if start_id != ORDER[0]:
                block["unlocked_through"] = start_id
            who = f" (sauvegarde de {previous})" if previous else ""
            code = "code conservé" if keep_code else "code effacé"
            return f"Nouveau participant{who} : départ au " \
                f"{LEVELS[start_id].number}, {code}"
        result = self._run(apply, dry,
                           backup=f"participant-{previous}" if previous
                           else "avant-nouveau-participant")
        result["open"] = start_id
        return result

    # ----------------------------------------------------------- state
    def state(self, auth: AdminAuth, token: str | None) -> dict[str, Any]:
        with self.store.lock:
            statuses = self._statuses()
            done = sum(1 for s in statuses.values()
                       if s in ("completed", "mastered"))
            block = {k: self.store.admin().get(k) for k in
                     ("unlocked_through", "all_unlocked", "start_level")}
            info = {
                "save": str(self.store.path),
                "done": done, "total": len(ORDER),
                "percent": round(100 * done / len(ORDER)),
                "xp": int(self.store.data["xp"]),
                "rewards": len(self.store.data.get("rewards", [])),
                "admin": block,
                "set_aside": self.store.set_aside,
            }
        return {
            "info": info,
            "acts": {str(k): v["name"] for k, v in ACTS.items()},
            "backups": self.list_backups(),
            "history": list(reversed(self.history())),
            "session": auth.remaining(token),
            "default_password": auth.default,
        }


__all__ = ["Admin", "AdminAuth", "AdminError", "AuthError", "LockedOut",
           "IMPORT_MAX", "validate_save"]
