"""PyCraft sandbox runner.

This file is executed in a *separate, isolated* Python process
(``python -I runner.py``). It never runs inside the web server.

It reads a JSON request on stdin, executes the learner's code under a
tracer, and writes a JSON trace on stdout. The trace describes what
really happened: lines executed, classes created, objects spawned,
attributes changed, methods called, prints, errors.

Only the standard library is used.
"""
from __future__ import annotations

import builtins
import importlib.abc
import importlib.machinery
import importlib.util
import io
import json
import sys
import types
from typing import Any, Callable

# Modules the learner may import. They are imported *before* the
# lockdown so that no file needs to be opened afterwards.
ALLOWED_MODULES = (
    "math", "random", "typing", "dataclasses", "enum", "abc",
    "collections", "itertools", "functools", "string", "statistics",
    "copy", "datetime", "time", "re", "json", "__future__",
)
for _name in ALLOWED_MODULES:
    __import__(_name)
import collections.abc  # noqa: E402,F401  (pre-import submodule)
import json.decoder  # noqa: E402,F401
import random  # noqa: E402

REAL_STDOUT = sys.stdout
ORIG_IMPORT = builtins.__import__
ORIG_BUILD_CLASS = builtins.__build_class__
STDLIB_PREFIXES = tuple(
    p for p in {sys.base_prefix, sys.prefix, sys.exec_prefix} if p
)

MAX_OUTPUT = 60_000
REPR_LIMIT = 70


class StepLimitReached(Exception):
    """Raised by the tracer when the program runs for too many steps."""


class Sandbox:
    """Holds the whole tracing state for one run."""

    def __init__(self, files: dict[str, str], max_steps: int) -> None:
        self.files = files
        self.user_files = set(files)
        self.module_names = {f[:-3]: f for f in files if f.endswith(".py")}
        self.max_steps = max_steps
        self.steps: list[dict[str, Any]] = []
        self.pre_events: list[dict[str, Any]] = []
        self.classes: dict[str, dict[str, Any]] = {}
        self.class_objs: dict[int, type] = {}
        self.code_map: dict[types.CodeType, tuple[type, str, str]] = {}
        self.user_funcs: set[types.CodeType] = set()
        self.objects: dict[int, dict[str, Any]] = {}
        self.keep_alive: list[Any] = []
        self.next_oid = 1
        self.snap_attrs: dict[str, dict[str, str]] = {}
        self.snap_vars: dict[str, str] = {}
        self.change_count: dict[str, int] = {}
        self.stack: list[dict[str, Any]] = []
        self.last_frame: types.FrameType | None = None
        self.output: list[str] = []
        self.output_len = 0
        self.line_buffer = ""
        self.truncated = False
        self.tracing = False
        self.main_ns: dict[str, Any] = {}
        self.module_ns: list[dict[str, Any]] = []

    # ------------------------------------------------------------ helpers
    def emit(self, event: dict[str, Any]) -> None:
        if self.steps:
            self.steps[-1]["events"].append(event)
        else:
            self.pre_events.append(event)

    def oid_of(self, obj: Any) -> str | None:
        rec = self.objects.get(id(obj))
        return rec["oid"] if rec and rec["obj"] is obj else None

    def is_user_instance(self, obj: Any) -> bool:
        return id(type(obj)) in self.class_objs

    def register(self, obj: Any, via: str = "") -> str:
        oid = self.oid_of(obj)
        if oid:
            return oid
        oid = f"o{self.next_oid}"
        self.next_oid += 1
        self.objects[id(obj)] = {"oid": oid, "obj": obj}
        self.keep_alive.append(obj)
        cls = type(obj)
        event: dict[str, Any] = {
            "type": "spawn", "oid": oid, "cls": cls.__qualname__,
            "via": via,
        }
        creator = self.creator_frame()
        if creator:
            event["by"] = creator
        self.emit(event)
        self.snap_attrs[oid] = {}
        return oid

    def creator_frame(self) -> dict[str, Any] | None:
        """If an object is being created inside a classmethod, say so."""
        for entry in reversed(self.stack):
            if entry.get("kind") == "class":
                return {"kind": "classmethod",
                        "cls": entry.get("recv", entry["cls"]),
                        "method": entry["method"]}
            if entry.get("kind") == "static":
                return {"kind": "staticmethod", "cls": entry["cls"],
                        "method": entry["method"]}
        return None

    def short_repr(self, value: Any) -> str:
        try:
            text = repr(value)
        except Exception:  # user __repr__ may crash
            text = f"<{type(value).__name__}>"
        if " object at 0x" in text:
            text = f"<{type(value).__qualname__}>"
        if len(text) > REPR_LIMIT:
            text = text[:REPR_LIMIT - 1] + "…"
        return text

    def ser(self, value: Any, depth: int = 0) -> dict[str, Any]:
        if value is None or isinstance(value, (bool, int, float, str)):
            return {"t": type(value).__name__, "r": self.short_repr(value)}
        oid = self.oid_of(value)
        if oid:
            return {"t": "obj", "ref": oid, "cls": type(value).__qualname__}
        if isinstance(value, type) and id(value) in self.class_objs:
            return {"t": "class", "r": value.__qualname__}
        if isinstance(value, (list, tuple, set, frozenset)) and depth < 2:
            items = list(value)[:12]
            return {"t": type(value).__name__, "len": len(value),
                    "items": [self.ser(i, depth + 1) for i in items]}
        if isinstance(value, dict) and depth < 2:
            pairs = list(value.items())[:12]
            return {"t": "dict", "len": len(value),
                    "items": [[self.short_repr(k), self.ser(v, depth + 1)]
                              for k, v in pairs]}
        if isinstance(value, (types.FunctionType, types.MethodType)):
            return {"t": "function", "r": value.__qualname__ + "()"}
        if isinstance(value, types.ModuleType):
            return {"t": "module", "r": value.__name__}
        return {"t": type(value).__name__, "r": self.short_repr(value)}

    # ------------------------------------------------------- class capture
    def build_class(self, func: Any, name: str, *bases: Any,
                    **kwargs: Any) -> Any:
        cls = ORIG_BUILD_CLASS(func, name, *bases, **kwargs)
        code = getattr(func, "__code__", None)
        if code is not None and code.co_filename in self.user_files:
            self.register_class(cls, code.co_firstlineno,
                                code.co_filename)
        return cls

    def register_class(self, cls: type, line: int, filename: str) -> None:
        self.class_objs[id(cls)] = cls
        self.keep_alive.append(cls)
        methods: list[dict[str, Any]] = []
        for attr_name, value in cls.__dict__.items():
            kind = ""
            func: Any = None
            if isinstance(value, staticmethod):
                kind, func = "static", value.__func__
            elif isinstance(value, classmethod):
                kind, func = "class", value.__func__
            elif isinstance(value, types.FunctionType):
                kind, func = "instance", value
            elif isinstance(value, property):
                for part, pkind in ((value.fget, "getter"),
                                    (value.fset, "setter")):
                    if isinstance(part, types.FunctionType):
                        self.code_map[part.__code__] = (cls, attr_name, pkind)
                        methods.append({"name": attr_name, "kind": pkind,
                                        "line": part.__code__.co_firstlineno})
                continue
            if func is None or not hasattr(func, "__code__"):
                continue
            self.code_map[func.__code__] = (cls, attr_name, kind)
            methods.append({
                "name": attr_name, "kind": kind,
                "line": func.__code__.co_firstlineno,
                "params": list(func.__code__.co_varnames[
                    :func.__code__.co_argcount]),
            })
        class_attrs = {
            k: self.ser(v) for k, v in cls.__dict__.items()
            if not k.startswith("__")
            and not isinstance(v, (types.FunctionType, staticmethod,
                                   classmethod, property, type))
        }
        bases = [b.__qualname__ for b in cls.__bases__ if b is not object]
        qual = cls.__qualname__
        owner = qual.rsplit(".", 1)[0] if "." in qual else None
        if owner and "<locals>" in owner:
            owner = None
        info = {
            "name": cls.__name__, "qualname": qual, "bases": bases,
            "user_bases": [b.__qualname__ for b in cls.__bases__
                           if id(b) in self.class_objs],
            "mro": [c.__qualname__ for c in cls.__mro__
                    if c is not object],
            "methods": methods, "class_attrs": class_attrs,
            "owner": owner, "line": line, "file": filename,
        }
        self.classes[qual] = info
        self.emit({"type": "class_def", "cls": qual})

    # ---------------------------------------------------------- scanning
    def flush(self) -> None:
        """Detect new objects and changed attributes / variables."""
        candidates: list[Any] = []
        frame = self.last_frame
        frames_seen = 0
        while frame is not None and frames_seen < 30:
            if frame.f_code.co_filename in self.user_files:
                candidates.extend(frame.f_locals.values())
            frame = frame.f_back
            frames_seen += 1
        for ns in self.module_ns:
            candidates.extend(ns.values())
        for rec in list(self.objects.values()):
            obj_dict = getattr(rec["obj"], "__dict__", None)
            if isinstance(obj_dict, dict):
                candidates.extend(obj_dict.values())
        expanded: list[Any] = []
        for value in candidates:
            expanded.append(value)
            if isinstance(value, (list, tuple, set)):
                expanded.extend(list(value)[:50])
            elif isinstance(value, dict):
                expanded.extend(list(value.values())[:50])
        for value in expanded:
            if self.is_user_instance(value) and not self.oid_of(value):
                self.register(value, via="scan")
        self.diff_objects()
        self.diff_vars()

    def frame_owner_classes(self) -> tuple[str, ...]:
        frame = self.last_frame
        if frame is None:
            return ()
        info = self.code_map.get(frame.f_code)
        if not info:
            return ()
        return (info[0].__qualname__,)

    def diff_objects(self) -> None:
        owners = self.frame_owner_classes()
        for rec in list(self.objects.values()):
            obj = rec["obj"]
            oid = rec["oid"]
            obj_dict = getattr(obj, "__dict__", None)
            if not isinstance(obj_dict, dict):
                continue
            old = self.snap_attrs.get(oid, {})
            new: dict[str, str] = {}
            for name, value in list(obj_dict.items()):
                serial = self.ser(value)
                text = json.dumps(serial, sort_keys=True)
                new[name] = text
                if old.get(name) != text:
                    mro = [c.__qualname__ for c in type(obj).__mro__]
                    internal = any(o in mro for o in owners)
                    self.emit({
                        "type": "attr_set", "oid": oid, "name": name,
                        "old": json.loads(old[name]) if name in old else None,
                        "new": serial, "internal": internal,
                        "protected": name.startswith("_"),
                    })
                    self.change_count[oid] = self.change_count.get(oid, 0) + 1
            for name in old:
                if name not in new:
                    self.emit({"type": "attr_del", "oid": oid, "name": name})
            self.snap_attrs[oid] = new

    def diff_vars(self) -> None:
        current: dict[str, str] = {}
        for name, value in list(self.main_ns.items()):
            if name.startswith("__") or isinstance(value, types.ModuleType):
                continue
            serial = self.ser(value)
            text = json.dumps(serial, sort_keys=True)
            current[name] = text
            if self.snap_vars.get(name) != text:
                self.emit({"type": "var_set", "name": name, "value": serial})
        for name in self.snap_vars:
            if name not in current:
                self.emit({"type": "var_del", "name": name})
        self.snap_vars = current

    # ------------------------------------------------------------ tracer
    def global_trace(self, frame: types.FrameType, event: str,
                     arg: Any) -> Callable[..., Any] | None:
        if frame.f_code.co_filename not in self.user_files:
            return None
        if not self.tracing:
            return None
        self.on_call(frame)
        return self.local_trace

    def local_trace(self, frame: types.FrameType, event: str,
                    arg: Any) -> Callable[..., Any] | None:
        if not self.tracing:
            return None
        if event == "line":
            self.on_line(frame)
        elif event == "return":
            self.on_return(frame, arg)
        return self.local_trace

    def on_call(self, frame: types.FrameType) -> None:
        self.flush()
        code = frame.f_code
        info = self.code_map.get(code)
        entry: dict[str, Any] = {"frame": id(frame), "kind": "other"}
        if info:
            cls, mname, kind = info
            entry.update(kind=kind, cls=cls.__qualname__, method=mname)
            event: dict[str, Any] = {
                "type": "call", "cls": cls.__qualname__, "method": mname,
                "kind": kind, "line": frame.f_lineno, "depth": len(self.stack),
            }
            names = code.co_varnames[:code.co_argcount]
            args = [(n, frame.f_locals.get(n)) for n in names]
            if kind in ("instance", "getter", "setter") and args:
                receiver = args[0][1]
                args = args[1:]
                if self.is_user_instance(receiver):
                    via = "__init__" if mname == "__init__" else "scan"
                    oid = self.register(receiver, via=via)
                    event["oid"] = oid
                    entry["oid"] = oid
                    entry["changes"] = self.change_count.get(oid, 0)
                    real = type(receiver).__qualname__
                    event["receiver_cls"] = real
                    event["inherited"] = real != cls.__qualname__
                    caller = frame.f_back
                    if caller is not None:
                        cinfo = self.code_map.get(caller.f_code)
                        cnames = caller.f_code.co_varnames
                        cself = (caller.f_locals.get(cnames[0])
                                 if cnames else None)
                        if (cinfo and cself is receiver
                                and cinfo[0] is not cls
                                and issubclass(cinfo[0], cls)):
                            event["via_super"] = True
                            event["from_cls"] = cinfo[0].__qualname__
            elif kind == "class" and args:
                receiver_cls = args[0][1]
                args = args[1:]
                if isinstance(receiver_cls, type):
                    event["receiver_cls"] = receiver_cls.__qualname__
                    entry["recv"] = receiver_cls.__qualname__
            event["args"] = [[n, self.ser(v)] for n, v in args]
            self.emit(event)
        elif code.co_name != "<module>" and not self.is_class_body(frame) \
                and not code.co_name.startswith("<"):
            entry.update(kind="func", method=code.co_name)
            names = code.co_varnames[:code.co_argcount]
            self.emit({
                "type": "func_call", "name": code.co_name,
                "line": frame.f_lineno, "depth": len(self.stack),
                "args": [[n, self.ser(frame.f_locals.get(n))]
                         for n in names],
            })
        elif code.co_name == "<module>":
            entry.update(kind="module", method=frame.f_globals.get(
                "__name__", "?"))
            if frame.f_globals is not self.main_ns:
                self.emit({"type": "module_start",
                           "name": frame.f_globals.get("__name__"),
                           "file": code.co_filename})
        self.stack.append(entry)

    @staticmethod
    def is_class_body(frame: types.FrameType) -> bool:
        """Class bodies are neither modules nor optimized functions."""
        code = frame.f_code
        return code.co_name != "<module>" and not code.co_flags & 0x1

    def on_line(self, frame: types.FrameType, resume: bool = False) -> None:
        if not resume:
            self.flush()
        self.last_frame = frame
        if len(self.steps) >= self.max_steps:
            self.truncated = True
            self.tracing = False
            sys.settrace(None)
            raise StepLimitReached(
                f"Plus de {self.max_steps} étapes : la visualisation "
                "s'arrête ici. Boucle infinie ou boucle trop longue ?")
        code = frame.f_code
        func = code.co_name
        info = self.code_map.get(code)
        if info:
            func = f"{info[0].__qualname__}.{info[1]}"
        local_vars: list[list[Any]] = []
        if func != "<module>" and not self.is_class_body(frame):
            for name, value in list(frame.f_locals.items())[:15]:
                local_vars.append([name, self.ser(value)])
        self.steps.append({
            "line": frame.f_lineno, "file": code.co_filename,
            "func": func, "depth": max(0, len(self.stack) - 1),
            "locals": local_vars, "events": [], "resume": resume,
        })

    def on_return(self, frame: types.FrameType, value: Any) -> None:
        self.last_frame = frame
        self.flush()
        entry = self.stack.pop() if self.stack else {"kind": "other"}
        kind = entry.get("kind")
        if kind in ("instance", "static", "class", "getter", "setter"):
            event: dict[str, Any] = {
                "type": "return", "cls": entry["cls"],
                "method": entry["method"], "kind": kind,
                "value": self.ser(value),
            }
            oid = entry.get("oid")
            if oid:
                event["oid"] = oid
                mname = entry["method"]
                if kind == "setter" or mname.startswith("set"):
                    if self.change_count.get(oid, 0) == entry.get("changes"):
                        event["rejected"] = True
            self.emit(event)
        elif kind == "func":
            self.emit({"type": "func_return", "name": entry["method"],
                       "value": self.ser(value)})
        caller = frame.f_back
        while caller is not None and \
                caller.f_code.co_filename not in self.user_files:
            caller = caller.f_back
        self.last_frame = caller
        if caller is not None and self.tracing and \
                caller.f_code.co_filename in self.user_files:
            self.on_line(caller, resume=True)

    # ------------------------------------------------------------ output
    def write(self, text: str) -> int:
        if self.output_len > MAX_OUTPUT:
            return len(text)
        self.output.append(text)
        self.output_len += len(text)
        self.line_buffer += text
        while "\n" in self.line_buffer:
            line, self.line_buffer = self.line_buffer.split("\n", 1)
            self.emit_print(line)
        return len(text)

    def emit_print(self, line: str) -> None:
        if not self.tracing:
            return
        speaker = None
        for entry in reversed(self.stack):
            if entry.get("oid"):
                speaker = entry["oid"]
                break
            if entry.get("kind") in ("static", "class"):
                speaker = "class:" + entry["cls"]
                break
        self.emit({"type": "print", "text": line[:300], "oid": speaker})


class OutputProxy(io.TextIOBase):
    def __init__(self, sandbox: Sandbox) -> None:
        self.sandbox = sandbox

    def write(self, text: str) -> int:  # type: ignore[override]
        return self.sandbox.write(str(text))

    def flush(self) -> None:
        return None

    def writable(self) -> bool:
        return True


class UserModuleFinder(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Lets the learner's files import each other from memory."""

    def __init__(self, sandbox: Sandbox) -> None:
        self.sandbox = sandbox

    def find_spec(self, fullname: str, path: Any = None,
                  target: Any = None) -> importlib.machinery.ModuleSpec | None:
        filename = self.sandbox.module_names.get(fullname)
        if filename is None or filename == ENTRY:
            return None
        return importlib.util.spec_from_loader(fullname, self,
                                               origin=filename)

    def create_module(self, spec: Any) -> None:
        return None

    def exec_module(self, module: types.ModuleType) -> None:
        filename = self.sandbox.module_names[module.__name__]
        module.__file__ = filename
        self.sandbox.module_ns.append(module.__dict__)
        code = compile(self.sandbox.files[filename], filename, "exec")
        exec(code, module.__dict__)


ENTRY = "main.py"
BLOCKED_EVENTS = (
    "open", "os.system", "os.exec", "os.spawn", "os.fork", "os.forkpty",
    "os.posix_spawn", "os.kill", "os.remove", "os.rmdir", "os.rename",
    "os.mkdir", "os.chmod", "os.chown", "os.link", "os.symlink",
    "os.truncate", "os.listdir", "os.scandir", "os.chdir", "os.putenv",
    "os.unsetenv", "subprocess.Popen", "socket.", "shutil.", "ctypes.",
    "urllib.", "http.", "ftplib.", "smtplib.", "webbrowser.",
    "sys.setprofile", "import_module_from_file", "pty.", "winreg.",
    "_winapi.",
)
LOCKED = {"value": False}


def audit_hook(event: str, args: tuple[Any, ...]) -> None:
    if not LOCKED["value"]:
        return
    for prefix in BLOCKED_EVENTS:
        if event == prefix or (prefix.endswith(".")
                               and event.startswith(prefix)) or \
                event.startswith(prefix + "."):
            raise PermissionError(
                f"Opération interdite dans le bac à sable PyCraft ({event})")


def make_import(sandbox: Sandbox) -> Callable[..., Any]:
    def guarded_import(name: str, globals: Any = None, locals: Any = None,
                       fromlist: Any = (), level: int = 0) -> Any:
        importer = (globals or {}).get("__file__") or ""
        trusted = isinstance(importer, str) and importer.startswith(
            STDLIB_PREFIXES) and importer not in sandbox.user_files
        top = name.split(".")[0]
        if not trusted and level == 0 and top not in ALLOWED_MODULES \
                and top not in sandbox.module_names:
            raise ImportError(
                f"Le module '{name}' n'est pas disponible dans PyCraft. "
                f"Modules autorisés : {', '.join(ALLOWED_MODULES[:8])}…")
        return ORIG_IMPORT(name, globals, locals, fromlist, level)
    return guarded_import


def blocked_input(*_args: Any) -> str:
    raise RuntimeError("input() n'est pas disponible dans PyCraft : "
                       "écris les valeurs directement dans ton code.")


def error_info(exc: BaseException, sandbox: Sandbox) -> dict[str, Any]:
    info: dict[str, Any] = {"type": type(exc).__name__, "message": str(exc)}
    if isinstance(exc, SyntaxError):
        info["line"] = exc.lineno
        info["file"] = exc.filename or ENTRY
        info["offset"] = exc.offset
        info["text"] = (exc.text or "").rstrip("\n")
        info["message"] = exc.msg
        return info
    frames: list[dict[str, Any]] = []
    tb = exc.__traceback__
    while tb is not None:
        filename = tb.tb_frame.f_code.co_filename
        if filename in sandbox.user_files:
            frames.append({"file": filename, "line": tb.tb_lineno,
                           "func": tb.tb_frame.f_code.co_name})
        tb = tb.tb_next
    info["frames"] = frames
    if frames:
        info["line"] = frames[-1]["line"]
        info["file"] = frames[-1]["file"]
    return info


class CheckFailed(Exception):
    pass


def run_checks(checks: list[dict[str, Any]], ns: dict[str, Any],
               sandbox: Sandbox) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    def fail(message: str) -> None:
        raise CheckFailed(message)

    def need_class(name: str) -> type:
        value = ns.get(name)
        if not isinstance(value, type):
            fail(f"La classe `{name}` est introuvable dans ton code.")
        return value  # type: ignore[return-value]

    def need_method(cls: type, name: str) -> Any:
        if not callable(getattr(cls, name, None)):
            fail(f"La classe `{cls.__name__}` n'a pas de méthode "
                 f"`{name}`.")
        return getattr(cls, name)

    def capture(func: Callable[..., Any], *args: Any,
                **kwargs: Any) -> tuple[Any, str]:
        buffer = io.StringIO()
        previous = sys.stdout
        sys.stdout = buffer
        try:
            result = func(*args, **kwargs)
        finally:
            sys.stdout = previous
        return result, buffer.getvalue()

    def instances_of(cls: type) -> list[Any]:
        found: list[Any] = []
        seen: set[int] = set()
        pool: list[Any] = list(ns.values())
        for value in list(pool):
            if isinstance(value, (list, tuple, set)):
                pool.extend(value)
            elif isinstance(value, dict):
                pool.extend(value.values())
        for rec in sandbox.objects.values():
            pool.append(rec["obj"])
        for value in pool:
            if isinstance(value, cls) and id(value) not in seen:
                seen.add(id(value))
                found.append(value)
        return found

    def reload_module(module: types.ModuleType) -> str:
        """Re-import a learner module and return what it printed."""
        buffer = io.StringIO()
        previous = sys.stdout
        sys.stdout = buffer
        try:
            importlib.reload(module)
        finally:
            sys.stdout = previous
        return buffer.getvalue()

    def attrs(obj: Any) -> dict[str, Any]:
        return dict(getattr(obj, "__dict__", {}))

    def find_value(obj: Any, value: Any) -> str | None:
        """Name of the attribute holding `value` (any naming allowed)."""
        for key, val in attrs(obj).items():
            if val == value and type(val) is type(value):
                return key
        return None

    helpers: dict[str, Any] = {
        "fail": fail, "need_class": need_class, "need_method": need_method,
        "capture": capture, "instances_of": instances_of, "attrs": attrs,
        "find_value": find_value, "rng": random.Random(),
        "ns": ns, "CheckFailed": CheckFailed,
        "program_output": "".join(sandbox.output),
        "reload_module": reload_module,
    }
    sink = io.StringIO()
    for check in checks:
        env = dict(ns)
        env.update(helpers)
        previous = sys.stdout
        sys.stdout = sink
        try:
            exec(compile(check["code"], "<vérification>", "exec"), env)
            results.append({"id": check["id"], "ok": True})
        except CheckFailed as exc:
            results.append({"id": check["id"], "ok": False,
                            "message": str(exc)})
        except AssertionError as exc:
            results.append({"id": check["id"], "ok": False,
                            "message": str(exc) or "Vérification échouée."})
        except NameError as exc:
            results.append({"id": check["id"], "ok": False,
                            "message": f"Nom introuvable : {exc}."})
        except Exception as exc:  # learner code crashed during the check
            results.append({
                "id": check["id"], "ok": False,
                "message": f"Ton code a levé {type(exc).__name__} : {exc}",
                "error": error_info(exc, sandbox),
            })
        finally:
            sys.stdout = previous
    return results


def main() -> None:
    global ENTRY
    request = json.loads(sys.stdin.read())
    files: dict[str, str] = request["files"]
    ENTRY = request.get("entry", "main.py")
    sandbox = Sandbox(files, int(request.get("max_steps", 2500)))
    random.seed(request.get("seed", 42))
    want_trace = bool(request.get("trace", True))

    sys.setrecursionlimit(400)
    sys.addaudithook(audit_hook)
    sys.meta_path.insert(0, UserModuleFinder(sandbox))
    builtins.__build_class__ = sandbox.build_class  # type: ignore[assignment]
    builtins.__import__ = make_import(sandbox)
    builtins.input = blocked_input  # type: ignore[assignment]
    sys.stdout = OutputProxy(sandbox)  # type: ignore[assignment]

    ns: dict[str, Any] = {"__name__": "__main__", "__file__": ENTRY,
                          "__builtins__": builtins}
    sandbox.main_ns = ns
    sandbox.module_ns.append(ns)
    error: dict[str, Any] | None = None
    LOCKED["value"] = True
    try:
        code = compile(files.get(ENTRY, ""), ENTRY, "exec")
        sandbox.tracing = want_trace
        if want_trace:
            sys.settrace(sandbox.global_trace)
        exec(code, ns)
    except SyntaxError as exc:
        error = error_info(exc, sandbox)
    except BaseException as exc:  # report everything, never crash
        error = error_info(exc, sandbox)
    finally:
        sys.settrace(None)
        if sandbox.tracing:
            sandbox.last_frame = None
            sandbox.flush()
        sandbox.tracing = False
    if sandbox.line_buffer:
        sandbox.tracing = want_trace
        sandbox.emit_print(sandbox.line_buffer)
        sandbox.tracing = False
    if error is not None and sandbox.steps:
        sandbox.steps[-1]["events"].append(
            {**error, "type": "error", "etype": error["type"]})

    check_results: list[dict[str, Any]] = []
    if request.get("checks") and error is None:
        check_results = run_checks(request["checks"], ns, sandbox)

    final_objects = {}
    for rec in sandbox.objects.values():
        obj = rec["obj"]
        final_objects[rec["oid"]] = {
            "cls": type(obj).__qualname__,
            "attrs": {k: sandbox.ser(v)
                      for k, v in getattr(obj, "__dict__", {}).items()},
        }
    result = {
        "ok": error is None,
        "output": "".join(sandbox.output),
        "error": error,
        "pre_events": sandbox.pre_events,
        "steps": sandbox.steps if want_trace else [],
        "classes": sandbox.classes,
        "objects": final_objects,
        "truncated": sandbox.truncated,
        "checks": check_results,
    }
    sys.stdout = REAL_STDOUT
    REAL_STDOUT.write(json.dumps(result))
    REAL_STDOUT.flush()


if __name__ == "__main__":
    main()
