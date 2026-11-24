"""PyCraft HTTP server (standard library only, localhost only)."""
from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from . import achievements, pedagogy, static_checks
from .curriculum import LEVELS, ORDER, public_curriculum
from .progress import ProgressStore

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
MAX_BODY = 400_000


class PyCraftHandler(BaseHTTPRequestHandler):
    store: ProgressStore
    server_version = "PyCraft/1.0"

    # ------------------------------------------------------------ utils
    def log_message(self, format: str, *args: Any) -> None:
        return None  # keep the VS Code terminal readable

    def send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY:
            raise ValueError("Requête trop volumineuse.")
        raw = self.rfile.read(length) if length else b"{}"
        data = json.loads(raw.decode("utf-8") or "{}")
        if not isinstance(data, dict):
            raise ValueError("JSON invalide.")
        return data

    def level_id(self, data: dict[str, Any]) -> str:
        level_id = str(data.get("level", ""))
        if level_id not in LEVELS:
            raise ValueError("Niveau inconnu.")
        if not self.store.is_unlocked(level_id):
            raise PermissionError("Ce niveau est encore verrouillé.")
        return level_id

    # ------------------------------------------------------------- GET
    def do_GET(self) -> None:
        url = urlparse(self.path)
        try:
            if url.path == "/api/curriculum":
                self.send_json(public_curriculum())
            elif url.path == "/api/progress":
                with self.store.lock:
                    self.send_json(self.store.summary())
            elif url.path == "/api/stats":
                with self.store.lock:
                    self.send_json(achievements.summary(self.store))
            elif url.path == "/api/code":
                query = parse_qs(url.query)
                level_id = query.get("level", [""])[0]
                if level_id not in LEVELS:
                    raise ValueError("Niveau inconnu.")
                with self.store.lock:
                    state = self.store.data["levels"].get(level_id, {})
                    self.send_json({"code": state.get("code", {}),
                                    "sandbox": state.get("sandbox", {})})
            else:
                self.serve_static(url.path)
        except (ValueError, PermissionError) as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def serve_static(self, path: str) -> None:
        if path in ("", "/"):
            path = "/index.html"
        target = (WEB / path.lstrip("/")).resolve()
        if WEB not in target.parents or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = target.read_bytes()
        ctype = mimetypes.guess_type(target.name)[0] or "text/plain"
        if ctype.startswith("text/") or ctype.endswith("javascript"):
            ctype += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    # ------------------------------------------------------------ POST
    def do_POST(self) -> None:
        url = urlparse(self.path)
        routes = {
            "/api/run": self.api_run,
            "/api/check": self.api_check,
            "/api/hint": self.api_hint,
            "/api/quiz": self.api_quiz,
            "/api/quality": self.api_quality,
            "/api/step": self.api_step,
            "/api/save": self.api_save,
            "/api/review": self.api_review,
            "/api/reset": self.api_reset,
            "/api/event": self.api_event,
        }
        handler = routes.get(url.path)
        if handler is None:
            self.send_json({"error": "Route inconnue."}, 404)
            return
        try:
            self.send_json(handler(self.read_json()))
        except PermissionError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.FORBIDDEN)
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def api_run(self, data: dict[str, Any]) -> dict[str, Any]:
        files = pedagogy.clean_files(data.get("files"))
        entry = str(data.get("entry", "main.py"))
        if entry not in files:
            raise ValueError("Fichier d'entrée introuvable.")
        result = pedagogy.run_code(files, entry,
                                   pedagogy.clean_lines(data.get("stdin")),
                                   pedagogy.clean_lines(data.get("argv")))
        if not data.get("track"):
            return result  # automatic replay: not counted in the stats
        level = data.get("level")
        level_id = level if isinstance(level, str) and level in LEVELS \
            else None
        error = result.get("error")
        with self.store.lock:
            achievements.record_run(self.store, level_id,
                                    error.get("type") if error else None)
            result["achievements_new"] = achievements.unlock_new(self.store)
            self.store.save()
        return result

    def api_event(self, data: dict[str, Any]) -> dict[str, Any]:
        kind = str(data.get("kind", ""))
        with self.store.lock:
            achievements.record_event(self.store, kind, data)
            new = achievements.unlock_new(self.store)
            self.store.save()
        return {"achievements_new": new}

    def api_check(self, data: dict[str, Any]) -> dict[str, Any]:
        level_id = self.level_id(data)
        files = pedagogy.clean_files(data.get("files"))
        stdin = data.get("stdin")
        argv = data.get("argv")
        return pedagogy.check_mission(
            self.store, level_id, files,
            None if stdin is None else pedagogy.clean_lines(stdin),
            None if argv is None else pedagogy.clean_lines(argv))

    def api_hint(self, data: dict[str, Any]) -> dict[str, Any]:
        if data.get("peek"):
            return pedagogy.unlocked_hints(self.store, self.level_id(data))
        return pedagogy.next_hint(self.store, self.level_id(data))

    def api_quiz(self, data: dict[str, Any]) -> dict[str, Any]:
        level_id = self.level_id(data)
        with self.store.lock:
            passed = self.store.level(level_id)["mission_passed"]
        if not passed:
            raise PermissionError("Réussis d'abord la mission.")
        return pedagogy.grade_question(self.store, level_id,
                                       int(data.get("index", -1)),
                                       data.get("answer", ""))

    def api_quality(self, data: dict[str, Any]) -> dict[str, Any]:
        files = pedagogy.clean_files(data.get("files"))
        return static_checks.quality_report(files)

    def api_step(self, data: dict[str, Any]) -> dict[str, Any]:
        level_id = self.level_id(data)
        step = str(data.get("step", ""))
        with self.store.lock:
            seen = self.store.level(level_id)["steps_seen"]
            if step and step not in seen:
                seen.append(step)
                self.store.save()
            return self.store.summary()

    def api_save(self, data: dict[str, Any]) -> dict[str, Any]:
        level_id = self.level_id(data)
        files = pedagogy.clean_files(data.get("files"))
        slot = "sandbox" if data.get("slot") == "sandbox" else "code"
        with self.store.lock:
            self.store.level(level_id)[slot] = files
            self.store.save()
        return {"saved": True}

    def api_review(self, data: dict[str, Any]) -> dict[str, Any]:
        return pedagogy.start_review(self.store, self.level_id(data))

    def api_reset(self, data: dict[str, Any]) -> dict[str, Any]:
        if data.get("confirm") != "RESET":
            raise ValueError("Confirmation manquante.")
        self.store.reset()
        return self.store.summary()


def make_server(host: str, port: int, save_path: Path) -> ThreadingHTTPServer:
    handler = type("Handler", (PyCraftHandler,),
                   {"store": ProgressStore(save_path)})
    return ThreadingHTTPServer((host, port), handler)


__all__ = ["make_server", "ORDER"]
