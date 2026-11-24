"""Isolated execution of learner code.

The learner's code is never executed inside the web server process.
Each run starts a fresh child interpreter (``python -I``) with:

* resource limits (CPU time, memory, no file writes) on POSIX systems;
* a wall-clock timeout, after which the whole process group is killed;
* an audit hook that refuses files, network, sub-processes, deletion…;
* an import allow-list (math, random, typing, dataclasses…);
* an empty temporary working directory and an empty environment.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

RUNNER = Path(__file__).with_name("runner.py")
WALL_TIMEOUT = 8.0
CPU_SECONDS = 5
MEMORY_BYTES = 768 * 1024 * 1024


def _limit_resources() -> None:  # pragma: no cover - runs in the child
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (CPU_SECONDS, CPU_SECONDS + 1))
    resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_BYTES, MEMORY_BYTES))
    except (ValueError, OSError):
        pass  # macOS does not always allow RLIMIT_AS


def execute(files: dict[str, str], *, entry: str = "main.py",
            trace: bool = True, checks: list[dict[str, Any]] | None = None,
            max_steps: int = 4000, seed: int = 42,
            stdin: list[str] | None = None,
            argv: list[str] | None = None) -> dict[str, Any]:
    """Run the learner's files in a sandboxed child process."""
    request = json.dumps({
        "files": files, "entry": entry, "trace": trace,
        "checks": checks or [], "max_steps": max_steps, "seed": seed,
        "stdin": stdin or [], "argv": argv or [],
    })
    posix = os.name == "posix"
    with tempfile.TemporaryDirectory(prefix="pycraft-") as workdir:
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-X", "utf8", str(RUNNER)],
                input=request, capture_output=True, text=True,
                encoding="utf-8", timeout=WALL_TIMEOUT, cwd=workdir,
                env={"PYTHONIOENCODING": "utf-8",
                     "SYSTEMROOT": os.environ.get("SYSTEMROOT", "")},
                preexec_fn=_limit_resources if posix else None,
                start_new_session=posix,
            )
        except subprocess.TimeoutExpired:
            return _failure(
                "Timeout",
                "Ton programme a tourné plus de "
                f"{int(WALL_TIMEOUT)} secondes : boucle infinie ?")
    if proc.returncode != 0 or not proc.stdout.strip():
        reason = proc.stderr.strip().splitlines()[-1:] or ["arrêt brutal"]
        if proc.returncode in (-9, -24, 137, 152):
            return _failure("Timeout",
                            "Ton programme a dépassé le temps de calcul "
                            "autorisé : boucle infinie ?")
        if "MemoryError" in proc.stderr or proc.returncode == 1:
            return _failure("MemoryError",
                            "Ton programme utilise trop de mémoire.")
        return _failure("SandboxError", reason[0])
    try:
        result: dict[str, Any] = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return _failure("SandboxError", "Réponse illisible du bac à sable.")
    return result


def _failure(kind: str, message: str) -> dict[str, Any]:
    return {
        "ok": False, "output": "", "steps": [], "pre_events": [],
        "classes": {}, "objects": {}, "truncated": False, "checks": [],
        "error": {"type": kind, "message": message},
    }
