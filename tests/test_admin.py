"""The organizer's admin panel (server/admin.py): progression without fake
progress, backups, new participant, authentication of every route."""
from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterator

import pytest

from server import achievements
from server.admin import (BACKUPS_KEPT, Admin, AdminAuth, AdminError,
                          AuthError, LockedOut, validate_save)
from server.curriculum import LEVELS, ORDER
from server.progress import SAVE_VERSION, ProgressStore

ROOT = Path(__file__).resolve().parent.parent
PASSWORD = "atelier-de-test"
DONE = ("completed", "mastered")


def finish(store: ProgressStore, level_id: str, xp: int = 100) -> None:
    """Plays a level for real: mission and quiz passed, XP earned."""
    state = store.level(level_id)
    state["steps_seen"] = ["story", "explain", "mission", "quiz"]
    state["mission_passed"] = True
    state["quiz"] = {str(i): {"correct": True, "first_try": True}
                     for i in range(len(LEVELS[level_id].quiz))}
    store.add_xp(level_id, "mission", xp)


@pytest.fixture
def store(tmp_path: Path) -> ProgressStore:
    return ProgressStore(tmp_path / "progress.json")


@pytest.fixture
def admin(store: ProgressStore) -> Admin:
    return Admin(store)


def statuses(store: ProgressStore) -> dict[str, str]:
    return {lid: store.status(lid) for lid in ORDER}


# ------------------------------------------------------------ progression
def test_normal_rule_is_unchanged_without_the_admin_block(
        store: ProgressStore) -> None:
    assert "admin" not in store.data
    assert store.status(ORDER[0]) == "available"
    assert all(store.status(lid) == "locked" for lid in ORDER[1:])
    finish(store, ORDER[0])
    assert store.status(ORDER[1]) == "available"
    assert store.status(ORDER[2]) == "locked"
    assert store.summary()["admin"] == {
        "unlocked_through": None, "all_unlocked": None, "start_level": None}


@pytest.mark.parametrize("number", ["3.1", "10.1", "11.1", "13.1"])
def test_start_anywhere_without_faking_progress(admin: Admin,
                                                store: ProgressStore,
                                                number: str) -> None:
    target = next(lid for lid in ORDER if LEVELS[lid].number == number)
    before = achievements.unlock_new(ProgressStore(
        store.path.with_name("other.json")))
    result = admin.start_at(target)
    index = ORDER.index(target)
    st = statuses(store)
    assert result["open"] == target
    assert all(st[lid] == "available" for lid in ORDER[:index + 1])
    assert all(st[lid] == "locked" for lid in ORDER[index + 1:])
    # Nothing is marked as done: no XP, no reward, no achievement.
    assert store.data["xp"] == 0
    assert store.data["rewards"] == []
    assert store.check_rewards() == []
    assert achievements.unlock_new(store) == before
    assert store.summary()["admin"]["start_level"] == target
    # Written to the save file.
    saved = json.loads(store.path.read_text(encoding="utf-8"))
    assert saved["admin"]["unlocked_through"] == target


def test_beginner_preset_is_the_normal_progression(admin: Admin,
                                                   store: ProgressStore
                                                   ) -> None:
    admin.unlock("all")
    admin.start_at(ORDER[0])
    assert store.admin() == {"start_level": ORDER[0]}
    assert all(store.status(lid) == "locked" for lid in ORDER[1:])


def test_free_exploration_then_back_to_normal(admin: Admin,
                                              store: ProgressStore) -> None:
    finish(store, ORDER[0])
    admin.unlock("all")
    assert all(s != "locked" for s in statuses(store).values())
    preview = admin.unlock("normal", dry=True)
    assert len(preview["changes"]["locked"]) == len(ORDER) - 2
    admin.unlock("normal")
    assert "admin" not in store.data
    assert store.status(ORDER[1]) == "available"   # really earned
    assert store.status(ORDER[2]) == "locked"


def test_unlock_next_and_region(admin: Admin, store: ProgressStore) -> None:
    result = admin.unlock("next", ORDER[0])
    assert result["open"] == ORDER[1]
    assert store.status(ORDER[1]) == "available"
    region_last = "a1l4"
    admin.unlock("region", ORDER[0])
    assert store.status(region_last) == "available"
    assert store.status(ORDER[ORDER.index(region_last) + 1]) == "locked"
    with pytest.raises(AdminError):
        admin.unlock("next", ORDER[-1])
    with pytest.raises(AdminError):
        admin.unlock("everything", ORDER[0])


def test_dry_run_changes_nothing(admin: Admin, store: ProgressStore) -> None:
    before = json.dumps(store.data, sort_keys=True)
    preview = admin.start_at("x1l1", dry=True)
    assert preview["dry"] and preview["changes"]["opened"]
    assert json.dumps(store.data, sort_keys=True) == before
    assert not store.path.exists()
    assert admin.history() == []
    assert admin.list_backups() == []


def test_restart_a_level(admin: Admin, store: ProgressStore) -> None:
    for lid in ORDER[:6]:
        finish(store, lid)
    store.level(ORDER[2])["code"] = {"main.py": "print('garde-moi')"}
    result = admin.restart(ORDER[2], keep_code=True)
    assert "100 XP retirés" in result["action"]
    state = store.data["levels"][ORDER[2]]
    assert state["code"] == {"main.py": "print('garde-moi')"}
    assert not state["mission_passed"]
    # XP stays consistent, the levels after stay open.
    total = sum(sum(s.get("xp", {}).values())
                for s in store.data["levels"].values())
    assert store.data["xp"] == total == 500
    assert store.status(ORDER[2]) == "available"
    assert all(store.status(lid) != "locked" for lid in ORDER[3:7])
    assert len(admin.list_backups()) == 1
    admin.restart(ORDER[3], keep_code=False)
    assert ORDER[3] not in store.data["levels"] \
        or not store.data["levels"][ORDER[3]].get("code")


# ---------------------------------------------------------------- backups
def test_backup_restore_and_retention(admin: Admin,
                                      store: ProgressStore) -> None:
    finish(store, ORDER[0])
    store.save()
    name = admin.backup("Léa")["file"]
    assert "Léa" in name
    finish(store, ORDER[1])
    store.save()
    admin.restore(name)
    assert store.status(ORDER[0]) in DONE
    assert not store.data["levels"].get(ORDER[1], {}).get("mission_passed")
    files = [b["file"] for b in admin.list_backups()]
    assert any("avant-restauration" in f for f in files)
    for i in range(BACKUPS_KEPT + 3):
        admin.backup(f"b{i}")
    assert len(admin.list_backups()) == BACKUPS_KEPT
    with pytest.raises(AdminError):
        admin.restore("../progress.json")
    with pytest.raises(AdminError):
        admin.restore("absente.json")


def test_new_participant(admin: Admin, store: ProgressStore) -> None:
    for lid in ORDER[:4]:
        finish(store, lid)
    store.level(ORDER[1])["code"] = {"main.py": "print('Léa')"}
    store.save()
    result = admin.new_participant("Léa", keep_code=False, start="r1l2")
    assert result["open"] == "r1l2"
    assert store.data["xp"] == 0 and store.data["rewards"] == []
    assert not any(s.get("code") for s in store.data["levels"].values())
    assert store.status("r1l2") == "available"
    assert store.admin()["start_level"] == "r1l2"
    backups = admin.list_backups()
    assert backups[0]["label"].startswith("participant-L")
    assert backups[0]["xp"] == 400
    # The previous participant's game is really in the backup.
    admin.restore(backups[0]["file"])
    assert store.status(ORDER[3]) in DONE
    admin.new_participant("", keep_code=True)
    kept = store.data["levels"][ORDER[1]]["code"]
    assert kept == {"main.py": "print('Léa')"}
    assert store.admin() == {"start_level": ORDER[0]}


def test_export_and_import(admin: Admin, store: ProgressStore,
                           tmp_path: Path) -> None:
    finish(store, ORDER[0])
    body, name = admin.export()
    assert name.startswith("pycraft-sauvegarde-") and name.endswith(".json")
    other = Admin(ProgressStore(tmp_path / "autre" / "progress.json"))
    other.import_save(json.loads(body), "export.json")
    assert other.store.status(ORDER[0]) in DONE
    assert other.store.status(ORDER[1]) == "available"


@pytest.mark.parametrize("data, message", [
    ("pas un objet", "ne contient pas"),
    ({"version": 2, "xp": 0, "levels": {}}, "Version 2 non compatible"),
    ({"version": SAVE_VERSION, "xp": -5, "levels": {}}, "« xp »"),
    ({"version": SAVE_VERSION, "xp": True, "levels": {}}, "« xp »"),
    ({"version": SAVE_VERSION, "xp": 0, "levels": []}, "« levels »"),
    ({"version": SAVE_VERSION, "xp": 0, "levels": {"zz9": {}}},
     "Niveau inconnu"),
    ({"version": SAVE_VERSION, "xp": 0,
      "levels": {"a1l1": {"attempts": "beaucoup"}}}, "« attempts »"),
    ({"version": SAVE_VERSION, "xp": 0, "levels": {},
      "admin": {"start_level": "zz9"}}, "admin.start_level"),
])
def test_import_rejects_bad_files(admin: Admin, store: ProgressStore,
                                  data: Any, message: str) -> None:
    assert any(message in p for p in validate_save(data))
    before = json.dumps(store.data, sort_keys=True)
    with pytest.raises(AdminError, match="Fichier refusé"):
        admin.import_save(data)
    assert json.dumps(store.data, sort_keys=True) == before


def test_a_real_save_is_valid(store: ProgressStore) -> None:
    for lid in ORDER[:3]:
        finish(store, lid)
    store.level(ORDER[0])["code"] = {"main.py": "x = 1"}
    achievements.unlock_new(store)
    assert validate_save(json.loads(json.dumps(store.data))) == []


# ------------------------------------------------------- unreadable saves
def test_existing_save_loads_unchanged(tmp_path: Path) -> None:
    path = tmp_path / "progress.json"
    first = ProgressStore(path)
    finish(first, ORDER[0])
    first.save()
    data = json.loads(path.read_text(encoding="utf-8"))
    again = ProgressStore(path)
    assert again.data == data and again.set_aside is None


@pytest.mark.parametrize("content, kind", [
    ("{pas du json", "illisible"),
    (json.dumps({"version": 9, "xp": 0, "levels": {}}), "version-9"),
    (json.dumps({"version": SAVE_VERSION}), "illisible"),
])
def test_unreadable_save_is_kept_aside(tmp_path: Path, content: str,
                                       kind: str) -> None:
    path = tmp_path / "progress.json"
    path.write_text(content, encoding="utf-8")
    store = ProgressStore(path)
    assert store.data["xp"] == 0
    assert store.set_aside is not None and store.set_aside["kind"] == kind
    kept = list(tmp_path.glob(f"progress.{kind}-*.json"))
    assert len(kept) == 1 and kept[0].read_text(encoding="utf-8") == content
    # A second bad file does not overwrite the first one.
    path.write_text(content, encoding="utf-8")
    ProgressStore(path)
    assert len(list(tmp_path.glob("progress.*-*.json"))) >= 1


def test_recover_from_unreadable_save_with_a_backup(tmp_path: Path) -> None:
    path = tmp_path / "progress.json"
    store = ProgressStore(path)
    finish(store, ORDER[0])
    store.save()
    Admin(store).backup("ok")
    path.write_text("{abîmé", encoding="utf-8")
    broken = ProgressStore(path)
    admin = Admin(broken)
    assert admin.state(AdminAuth(PASSWORD), None)["info"]["set_aside"]
    admin.restore_last()
    assert broken.status(ORDER[0]) in DONE
    assert not admin.state(AdminAuth(PASSWORD), None)["info"]["set_aside"]


# --------------------------------------------------------------- history
def test_history_records_actions_never_secrets(admin: Admin,
                                               store: ProgressStore) -> None:
    auth = AdminAuth(PASSWORD)
    token = auth.login(PASSWORD)
    admin.log("Connexion admin")
    admin.start_at("r2l1")
    admin.unlock("all")
    actions = [h["action"] for h in admin.history()]
    assert actions[0] == "Connexion admin"
    assert actions[1].startswith("Départ fixé au 4.1")
    assert actions[2].startswith("Exploration libre")
    text = admin.history_path.read_text(encoding="utf-8")
    assert PASSWORD not in text and token not in text


def test_default_password_is_not_in_clear_anywhere() -> None:
    """The repository is public: the workshop password is only a hash."""
    secret = "42" + "python"
    for folder in ("server", "web", "tests"):
        for path in (ROOT / folder).rglob("*"):
            if path.is_file() and path.suffix in (".py", ".js", ".html",
                                                  ".css", ".json", ".mjs"):
                assert secret not in path.read_text(encoding="utf-8",
                                                    errors="ignore"), path
    assert secret not in (ROOT / "README.md").read_text(encoding="utf-8")


# ---------------------------------------------------------- authentication
class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_sessions_and_lockout() -> None:
    clock = Clock()
    auth = AdminAuth(PASSWORD, idle=60, clock=clock)
    assert not auth.default
    with pytest.raises(AuthError, match="Mot de passe incorrect"):
        auth.login("faux")
    for _ in range(3):
        with pytest.raises(AuthError):
            auth.login("faux")
    with pytest.raises(LockedOut):
        auth.login("faux")
    with pytest.raises(LockedOut):
        auth.login(PASSWORD)   # even the right one, during the lockout
    clock.now += 31
    token = auth.login(PASSWORD)
    assert auth.check(token) and auth.remaining(token) == 60
    clock.now += 50
    assert auth.check(token)          # sliding: kept alive
    clock.now += 61
    assert not auth.check(token)      # idle too long
    token = auth.login(PASSWORD)
    auth.logout(token)
    assert not auth.check(token)
    assert not auth.check(None) and not auth.check("inventé")


def test_environment_password(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYCRAFT_ADMIN_PASSWORD", "autre-mot")
    auth = AdminAuth()
    assert not auth.default
    assert auth.check(auth.login("autre-mot"))
    monkeypatch.delenv("PYCRAFT_ADMIN_PASSWORD")
    assert AdminAuth().default


# ------------------------------------------------------------------- HTTP
@pytest.fixture
def server(tmp_path: Path) -> Iterator[tuple[str, Clock]]:
    from server.app import make_server
    clock = Clock()
    httpd = make_server("127.0.0.1", 0, tmp_path / "progress.json",
                        auth=AdminAuth(PASSWORD, idle=600, clock=clock))
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_address[1]}", clock
    finally:
        httpd.shutdown()


def call(base: str, path: str, body: Any = None, cookie: str = "",
         headers: dict[str, str] | None = None
         ) -> tuple[int, Any, dict[str, str]]:
    sent = {"Content-Type": "application/json"} if body is not None else {}
    if cookie:
        sent["Cookie"] = cookie
    sent.update(headers or {})
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(base + path, data=data, headers=sent,
                                 method="GET" if body is None else "POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            raw = res.read()
            ctype = res.headers.get("Content-Type", "")
            payload = json.loads(raw) if "json" in ctype else raw
            return res.status, payload, dict(res.headers)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read()), dict(exc.headers)


def login(base: str) -> str:
    status, _, headers = call(base, "/api/admin/login",
                              {"password": PASSWORD})
    assert status == 200
    cookie = headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Strict" in cookie
    return cookie.split(";")[0]


ROUTES = [("GET", "/api/admin/state"), ("GET", "/api/admin/export"),
          ("POST", "/api/admin/start"), ("POST", "/api/admin/unlock"),
          ("POST", "/api/admin/restart"), ("POST", "/api/admin/backup"),
          ("POST", "/api/admin/restore"), ("POST", "/api/admin/import"),
          ("POST", "/api/admin/new-participant"),
          ("POST", "/api/admin/logout")]


def test_every_admin_route_needs_a_session(
        server: tuple[str, Clock]) -> None:
    base, _ = server
    for method, path in ROUTES:
        body = {"level": "x1l1", "scope": "all"} if method == "POST" \
            else None
        status, payload, _ = call(base, path, body,
                                  cookie="pycraft_admin=inventé")
        assert status == 401, path
        assert "Session admin" in payload["error"]
    status, progress, _ = call(base, "/api/progress")
    assert progress["levels"]["x1l1"]["status"] == "locked"


def test_login_session_and_expiry(server: tuple[str, Clock]) -> None:
    base, clock = server
    status, payload, _ = call(base, "/api/admin/login", {"password": "x"})
    assert status == 401 and payload["error"] == "Mot de passe incorrect."
    cookie = login(base)
    status, state, _ = call(base, "/api/admin/state", cookie=cookie)
    assert status == 200 and state["info"]["total"] == len(ORDER)
    assert PASSWORD not in json.dumps(state)
    status, result, _ = call(base, "/api/admin/start", {"level": "k1l1"},
                             cookie=cookie)
    assert status == 200 and result["open"] == "k1l1"
    _, progress, _ = call(base, "/api/progress")
    assert progress["levels"]["k1l1"]["status"] == "available"
    assert progress["admin"]["start_level"] == "k1l1"
    status, body, headers = call(base, "/api/admin/export", cookie=cookie)
    assert status == 200 and "attachment" in headers["Content-Disposition"]
    assert body["admin"]["start_level"] == "k1l1"
    clock.now += 601
    status, _, _ = call(base, "/api/admin/state", cookie=cookie)
    assert status == 401


def test_logout_and_new_participant_end_the_session(
        server: tuple[str, Clock]) -> None:
    base, _ = server
    cookie = login(base)
    status, _, headers = call(base, "/api/admin/logout", {}, cookie=cookie)
    assert status == 200 and "Max-Age=0" in headers["Set-Cookie"]
    assert call(base, "/api/admin/state", cookie=cookie)[0] == 401
    cookie = login(base)
    status, preview, _ = call(base, "/api/admin/new-participant",
                              {"dry": True}, cookie=cookie)
    assert status == 200 and preview["dry"]
    assert call(base, "/api/admin/state", cookie=cookie)[0] == 200
    status, _, _ = call(base, "/api/admin/new-participant",
                        {"label": "Noé"}, cookie=cookie)
    assert status == 200
    assert call(base, "/api/admin/state", cookie=cookie)[0] == 401


def test_requests_from_elsewhere_are_refused(
        server: tuple[str, Clock]) -> None:
    base, _ = server
    cookie = login(base)
    for headers in ({"Origin": "http://exemple.com"},
                    {"Host": "pycraft.exemple.com"},
                    {"Content-Type": "text/plain"}):
        status, _, _ = call(base, "/api/admin/unlock", {"scope": "all"},
                            cookie=cookie, headers=headers)
        assert status == 403, headers
    status, _, _ = call(base, "/api/admin/login", {"password": PASSWORD},
                        headers={"Origin": "http://exemple.com"})
    assert status == 403
    _, progress, _ = call(base, "/api/progress")
    assert progress["admin"]["all_unlocked"] is None


def test_lockout_over_http(server: tuple[str, Clock]) -> None:
    base, _ = server
    codes = [call(base, "/api/admin/login", {"password": "non"})[0]
             for _ in range(5)]
    assert codes == [401, 401, 401, 401, 429]
    assert call(base, "/api/admin/login", {"password": PASSWORD})[0] == 429


def test_each_save_has_its_own_identity(tmp_path: Path) -> None:
    """The browser uses it to forget an older game (see rememberSave)."""
    store = ProgressStore(tmp_path / "progress.json")
    first = store.summary()["save_id"]
    assert first
    with store.lock:
        store.save()
    assert ProgressStore(tmp_path / "progress.json").summary()["save_id"] \
        == first, "the same save keeps its identity"
    with store.lock:
        store.clear()
    assert store.summary()["save_id"] != first, "a new participant"
    store.reset()
    assert store.summary()["save_id"] not in ("", first)


def test_an_older_save_gets_an_identity_once(tmp_path: Path) -> None:
    path = tmp_path / "progress.json"
    path.write_text('{"version": 1, "xp": 0, "levels": {}, "rewards": []}',
                    encoding="utf-8")
    first = ProgressStore(path).summary()["save_id"]
    assert first and ProgressStore(path).summary()["save_id"] == first
