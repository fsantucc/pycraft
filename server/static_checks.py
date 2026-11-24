"""Static analysis of the learner's code (nothing is executed here).

Two jobs:
* ``run_rule`` answers precise questions used by mission checks
  ("is there a main guard?", "does Sword.describe call super()?").
* ``quality_report`` is a small flake8/mypy-like review, plus the real
  flake8 / mypy when they are installed on the machine.
"""
from __future__ import annotations

import ast
import io
import re
import shutil
import subprocess
import sys
import tempfile
import tokenize
from pathlib import Path
from typing import Any

PASCAL = re.compile(r"^_?[A-Z][a-zA-Z0-9]*$")
SNAKE = re.compile(r"^(_|_{0,2}[a-z][a-z0-9_]*_{0,2})$")


def parse(source: str) -> ast.Module | None:
    try:
        return ast.parse(source)
    except SyntaxError:
        return None


def find_class(tree: ast.AST, name: str) -> ast.ClassDef | None:
    """Find a class by simple name or dotted path (Outer.Inner)."""
    parts = name.split(".")
    scope: list[ast.stmt] = list(getattr(tree, "body", []))
    found: ast.ClassDef | None = None
    for part in parts:
        found = None
        for node in scope:
            if isinstance(node, ast.ClassDef) and node.name == part:
                found = node
                break
        if found is None:
            if len(parts) == 1:
                for any_node in ast.walk(tree):
                    if isinstance(any_node, ast.ClassDef) and \
                            any_node.name == part:
                        return any_node
            return None
        scope = found.body
    return found


def find_method(cls: ast.ClassDef, name: str) -> ast.FunctionDef | None:
    for node in cls.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    return None


def decorator_names(func: ast.FunctionDef) -> list[str]:
    names = []
    for deco in func.decorator_list:
        if isinstance(deco, ast.Name):
            names.append(deco.id)
        elif isinstance(deco, ast.Attribute):
            names.append(deco.attr)
    return names


def method_kind(cls: ast.ClassDef, name: str) -> str | None:
    """instance / static / class, accepting both decorator and call forms."""
    func = find_method(cls, name)
    if func is not None:
        decos = decorator_names(func)
        if "staticmethod" in decos:
            return "static"
        if "classmethod" in decos:
            return "class"
    for node in cls.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
            target = node.targets[0]
            call = node.value
            if isinstance(target, ast.Name) and target.id == name and \
                    isinstance(call.func, ast.Name):
                if call.func.id == "staticmethod":
                    return "static"
                if call.func.id == "classmethod":
                    return "class"
    return "instance" if func is not None else None


def calls_super(func: ast.FunctionDef, method: str | None = None) -> bool:
    for node in ast.walk(func):
        if isinstance(node, ast.Call) and isinstance(node.func,
                                                     ast.Attribute):
            inner = node.func.value
            if isinstance(inner, ast.Call) and isinstance(inner.func,
                                                          ast.Name) \
                    and inner.func.id == "super":
                if method is None or node.func.attr == method:
                    return True
    return False


def has_main_guard(tree: ast.Module) -> bool:
    for node in tree.body:
        if isinstance(node, ast.If):
            test = ast.unparse(node.test).replace("'", '"')
            if test in ('__name__ == "__main__"', '"__main__" == __name__'):
                return True
    return False


def top_level_side_effects(tree: ast.Module) -> list[int]:
    """Lines of top-level statements that do something at import time."""
    lines = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Import,
                             ast.ImportFrom, ast.AsyncFunctionDef)):
            continue
        if isinstance(node, ast.If) and has_main_guard(
                ast.Module(body=[node], type_ignores=[])):
            continue
        if isinstance(node, ast.Expr) and isinstance(node.value,
                                                     ast.Constant):
            continue  # docstring
        if isinstance(node, (ast.Assign, ast.AnnAssign)) and isinstance(
                getattr(node, "value", None), ast.Constant):
            continue  # simple constants are fine
        lines.append(node.lineno)
    return lines


def untyped_functions(tree: ast.Module) -> list[tuple[str, int]]:
    """Functions/methods missing a parameter or return annotation."""
    missing = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        params = node.args.posonlyargs + node.args.args + \
            node.args.kwonlyargs
        is_method = bool(params) and params[0].arg in ("self", "cls")
        to_check = params[1:] if is_method else params
        if node.returns is None or any(p.annotation is None
                                       for p in to_check):
            missing.append((node.name, node.lineno))
    return missing


def naming_problems(tree: ast.Module) -> list[tuple[str, int, str]]:
    problems = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and not PASCAL.match(node.name):
            problems.append((node.name, node.lineno, "PascalCase"))
        elif isinstance(node, ast.FunctionDef) and not SNAKE.match(
                node.name):
            problems.append((node.name, node.lineno, "snake_case"))
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            if not SNAKE.match(node.id) and not node.id.isupper():
                problems.append((node.id, node.lineno, "snake_case"))
        elif isinstance(node, ast.arg) and node.arg not in ("self", "cls"):
            if not SNAKE.match(node.arg):
                problems.append((node.arg, node.lineno, "snake_case"))
    return problems


def external_protected_access(tree: ast.Module) -> list[tuple[str, int]]:
    """`obj._attr` used outside of a method on something else than self."""
    found = []
    inside_methods: set[int] = set()
    for cls in ast.walk(tree):
        if isinstance(cls, ast.ClassDef):
            for node in ast.walk(cls):
                inside_methods.add(id(node))
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and node.attr.startswith("_") \
                and not node.attr.startswith("__") \
                and id(node) not in inside_methods:
            found.append((ast.unparse(node), node.lineno))
    return found


def line_of(tree: ast.Module | None, target: str) -> int | None:
    """Line of a class `A`, method `A.m` or function `f`."""
    if tree is None or not target:
        return None
    if "." in target:
        cls_name, meth = target.rsplit(".", 1)
        cls = find_class(tree, cls_name)
        if cls is not None:
            func = find_method(cls, meth)
            if func is not None:
                return func.lineno
            nested = find_class(cls, meth)
            return nested.lineno if nested else cls.lineno
        return None
    cls = find_class(tree, target)
    if cls is not None:
        return cls.lineno
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == target:
            return node.lineno
    return None


# ----------------------------------------------------------------- rules
def run_rule(rule: str, args: dict[str, Any],
             files: dict[str, str]) -> tuple[bool, str, int | None]:
    """Evaluate one static rule. Returns (ok, message, line)."""
    filename = args.get("file", "main.py")
    source = files.get(filename, "")
    tree = parse(source)
    if tree is None:
        return False, f"{filename} contient une erreur de syntaxe.", None
    if rule == "shebang":
        first = source.splitlines()[0] if source else ""
        ok = first.startswith("#!") and "python3" in first
        return ok, "La première ligne doit être un shebang qui lance " \
            "python3 (recherche « shebang env »).", 1
    if rule == "main_guard":
        return has_main_guard(tree), "Il manque le garde " \
            "`if __name__ == \"__main__\":` en bas du fichier.", None
    if rule == "no_import_side_effects":
        lines = top_level_side_effects(tree)
        return not lines, "Du code s'exécute dès l'import (hors du garde " \
            f"`__main__`) : ligne {lines[0] if lines else '?'}.", \
            lines[0] if lines else None
    if rule == "class_defined":
        cls = find_class(tree, args["name"])
        return cls is not None, f"La classe `{args['name']}` n'existe pas.", \
            None
    if rule == "method_defined":
        cls = find_class(tree, args["cls"])
        ok = cls is not None and find_method(cls, args["name"]) is not None
        return ok, f"`{args['cls']}` n'a pas de méthode " \
            f"`{args['name']}`.", cls.lineno if cls else None
    if rule == "method_not_redefined":
        cls = find_class(tree, args["cls"])
        ok = cls is not None and find_method(cls, args["name"]) is None
        return ok, f"`{args['cls']}` ne devrait pas réécrire " \
            f"`{args['name']}` : elle en hérite déjà.", \
            line_of(tree, f"{args['cls']}.{args['name']}")
    if rule == "method_kind":
        cls = find_class(tree, args["cls"])
        kind = method_kind(cls, args["name"]) if cls else None
        labels = {"static": "statique", "class": "de classe",
                  "instance": "d'instance"}
        return kind == args["kind"], f"`{args['cls']}.{args['name']}` " \
            f"doit être une méthode {labels[args['kind']]}.", \
            line_of(tree, f"{args['cls']}.{args['name']}")
    if rule == "uses_super":
        cls = find_class(tree, args["cls"])
        func = find_method(cls, args["method"]) if cls else None
        ok = func is not None and calls_super(func, args.get("calls"))
        target = args.get("calls") or args["method"]
        return ok, f"`{args['cls']}.{args['method']}` doit appeler " \
            f"la version du parent avec `super().{target}(...)`.", \
            func.lineno if func else None
    if rule == "inherits":
        cls = find_class(tree, args["cls"])
        bases = [ast.unparse(b) for b in cls.bases] if cls else []
        ok = args["parent"] in bases
        return ok, f"`{args['cls']}` doit hériter de `{args['parent']}`.", \
            cls.lineno if cls else None
    if rule == "nested_class":
        outer = find_class(tree, args["outer"])
        ok = outer is not None and any(
            isinstance(n, ast.ClassDef) and n.name == args["inner"]
            for n in outer.body)
        return ok, f"`{args['inner']}` doit être définie *à l'intérieur* " \
            f"de `{args['outer']}`.", outer.lineno if outer else None
    if rule == "typed":
        missing = untyped_functions(tree)
        if not missing:
            return True, "", None
        func_name, func_line = missing[0]
        return False, f"`{func_name}` n'a pas toutes ses " \
            "annotations de type (paramètres et retour).", func_line
    if rule == "naming":
        problems = naming_problems(tree)
        if problems:
            name, bad_line, style = problems[0]
            return False, f"`{name}` devrait être en {style}.", bad_line
        return True, "", None
    if rule == "no_external_protected":
        found = external_protected_access(tree)
        if found:
            expr, expr_line = found[0]
            return False, f"`{expr}` touche un attribut protégé depuis " \
                "l'extérieur de la classe.", expr_line
        return True, "", None
    if rule == "no_name_mangling":
        bad = [n for n in ast.walk(tree) if isinstance(n, ast.Attribute)
               and n.attr.startswith("__") and not n.attr.endswith("__")]
        return not bad, "Utilise la convention protégée `_` (un seul " \
            "tiret bas), pas le name mangling `__`.", \
            bad[0].lineno if bad else None
    if rule == "uses_loop":
        ok = any(isinstance(n, (ast.For, ast.While)) for n in ast.walk(tree))
        return ok, "Utilise une boucle plutôt que de répéter le code.", None
    if rule == "no_literal_in_method":
        cls = find_class(tree, args["cls"])
        func = find_method(cls, args["method"]) if cls else None
        if func is None:
            return False, f"`{args['cls']}.{args['method']}` introuvable.", \
                None
        for node in ast.walk(func):
            if isinstance(node, ast.Constant) and node.value in args[
                    "values"]:
                return False, f"`{args['method']}` contient la valeur " \
                    f"écrite en dur {node.value!r} : utilise les " \
                    "attributs de self.", node.lineno
        return True, "", None
    if rule == "uses_call":
        names = {n.func.id for n in ast.walk(tree) if isinstance(n, ast.Call)
                 and isinstance(n.func, ast.Name)}
        return args["name"] in names, args.get(
            "message", f"Utilise `{args['name']}()`."), None
    if rule == "standalone_function":
        funcs = [n for n in tree.body if isinstance(n, ast.FunctionDef)
                 and n.name == args["name"]]
        return bool(funcs), f"`{args['name']}` doit être une fonction " \
            "définie au niveau du module, hors de toute classe.", None
    if rule == "reassigns_from_itself":
        name = args["name"]
        for node in ast.walk(tree):
            if isinstance(node, ast.AugAssign) and isinstance(
                    node.target, ast.Name) and node.target.id == name:
                return True, "", None
            if isinstance(node, ast.Assign) and any(
                    isinstance(t, ast.Name) and t.id == name
                    for t in node.targets) and any(
                    isinstance(n, ast.Name) and n.id == name
                    for n in ast.walk(node.value)):
                return True, "", None
        return False, f"Mets à jour `{name}` à partir de sa propre valeur " \
            "(sans réécrire le nombre à la main).", None
    if rule == "no_duplicate_attrs":
        parent = find_class(tree, args["parent"])
        child = find_class(tree, args["cls"])
        method = args.get("method", "__init__")
        pfunc = find_method(parent, method) if parent else None
        cfunc = find_method(child, method) if child else None
        if pfunc is None or cfunc is None:
            return True, "", None
        parent_attrs = _self_assigned(pfunc)
        dup = sorted(parent_attrs & _self_assigned(cfunc))
        return not dup, f"`{args['cls']}.{method}` réaffecte " \
            f"`self.{dup[0] if dup else ''}` alors que le parent le fait " \
            "déjà : c'est de la duplication.", cfunc.lineno
    if rule == "only_functions":
        extra = [n.lineno for n in tree.body if not isinstance(
            n, (ast.FunctionDef, ast.Import, ast.ImportFrom))
            and not (isinstance(n, ast.Expr)
                     and isinstance(n.value, ast.Constant))]
        return not extra, f"{filename} ne doit contenir que des fonctions " \
            f"(ligne {extra[0] if extra else '?'} : du code hors fonction).", \
            extra[0] if extra else None
    if rule in ("is_recursive", "no_loop_in", "uses_loop_in"):
        funcs = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)
                 and n.name == args["name"]]
        if not funcs:
            return False, f"La fonction `{args['name']}` est introuvable.", \
                None
        func = funcs[0]
        if rule == "is_recursive":
            calls = [n for n in ast.walk(func) if isinstance(n, ast.Call)
                     and isinstance(n.func, ast.Name)
                     and n.func.id in _local_names(func)]
            return bool(calls), f"`{args['name']}` doit être récursive : " \
                "elle (ou sa fonction auxiliaire) doit s'appeler elle-même.", \
                func.lineno
        loops = [n for n in ast.walk(func)
                 if isinstance(n, (ast.For, ast.While, ast.comprehension))]
        if rule == "no_loop_in":
            return not loops, f"`{args['name']}` ne doit pas utiliser de " \
                "boucle : la répétition doit venir de la récursion.", \
                loops[0].lineno if loops and hasattr(loops[0], "lineno") \
                else func.lineno
        return bool(loops), f"`{args['name']}` doit utiliser une boucle.", \
            func.lineno
    if rule in ("has_node", "lacks_node", "except_tuple", "has_finally", "no_for_stmt",
                "no_call", "count_handlers"):
        scope: ast.AST = tree
        where = filename
        if args.get("name"):
            matches = [n for n in ast.walk(tree)
                       if isinstance(n, (ast.FunctionDef, ast.ClassDef))
                       and n.name == args["name"]]
            if not matches:
                return False, f"`{args['name']}` est introuvable.", None
            scope = matches[0]
            where = f"`{args['name']}`"
        line = getattr(scope, "lineno", None)
        nodes = list(ast.walk(scope))
        if rule == "has_node":
            kinds = args["node"].split("|")
            ok = any(type(n).__name__ in kinds for n in nodes)
            return ok, args.get("message", f"{where} doit utiliser "
                                f"{args['node']}."), line
        if rule == "lacks_node":
            kinds = args["node"].split("|")
            hits = [n for n in nodes if type(n).__name__ in kinds]
            return not hits, args.get("message", f"{where} ne doit pas "
                                      f"utiliser {args['node']}."), \
                getattr(hits[0], "lineno", line) if hits else line
        if rule == "except_tuple":
            ok = any(isinstance(n, ast.ExceptHandler)
                     and isinstance(n.type, ast.Tuple) for n in nodes)
            return ok, f"{where} doit attraper plusieurs types d'erreurs " \
                "dans un seul `except (TypeA, TypeB)`.", line
        if rule == "count_handlers":
            count = sum(isinstance(n, ast.ExceptHandler) for n in nodes)
            return count >= args["min"], f"{where} doit avoir au moins " \
                f"{args['min']} blocs except (il en a {count}).", line
        if rule == "has_finally":
            ok = any(isinstance(n, ast.Try) and n.finalbody for n in nodes)
            return ok, f"{where} doit utiliser un bloc `finally`.", line
        if rule == "no_for_stmt":
            loops_found = [n for n in nodes
                           if isinstance(n, (ast.For, ast.While))]
            return not loops_found, f"{where} doit utiliser une " \
                "compréhension, pas une boucle for/while classique.", \
                loops_found[0].lineno if loops_found else line
        bad_calls = [n for n in nodes if isinstance(n, ast.Call)
                     and isinstance(n.func, ast.Name)
                     and n.func.id == args["call"]]
        return not bad_calls, args.get(
            "message", f"`{args['call']}()` n'est pas autorisé ici."), \
            bad_calls[0].lineno if bad_calls else None
    raise ValueError(f"Règle statique inconnue : {rule}")


def _local_names(func: ast.FunctionDef) -> set[str]:
    """The function's own name and the names of its nested helpers."""
    names = {func.name}
    for node in ast.walk(func):
        if isinstance(node, ast.FunctionDef):
            names.add(node.name)
    return names


def _self_assigned(func: ast.FunctionDef) -> set[str]:
    names = set()
    for node in ast.walk(func):
        targets: list[ast.expr] = []
        if isinstance(node, ast.Assign):
            targets = list(node.targets)
        elif isinstance(node, (ast.AnnAssign, ast.AugAssign)):
            targets = [node.target]
        for target in targets:
            if isinstance(target, ast.Attribute) and isinstance(
                    target.value, ast.Name) and target.value.id == "self":
                names.add(target.attr)
    return names


# --------------------------------------------------------------- quality
def quality_report(files: dict[str, str]) -> dict[str, Any]:
    """Built-in style review + real flake8 / mypy when available."""
    issues: list[dict[str, Any]] = []
    for filename, source in files.items():
        tree = parse(source)
        lines = source.split("\n")
        continuation = _continuation_lines(source)
        for number, text in enumerate(lines, start=1):
            if len(text) > 79:
                issues.append(_issue(filename, number, "E501",
                                     f"ligne trop longue ({len(text)} > 79)"))
            if text.rstrip() != text:
                issues.append(_issue(filename, number, "W291",
                                     "espaces en fin de ligne"))
            stripped = text.lstrip(" ")
            indent = len(text) - len(stripped)
            if stripped and indent % 4 and number not in continuation:
                issues.append(_issue(filename, number, "E111",
                                     "indentation non multiple de 4"))
            if "\t" in text[:indent + 1]:
                issues.append(_issue(filename, number, "W191",
                                     "tabulation dans l'indentation"))
        if source and not source.endswith("\n"):
            issues.append(_issue(filename, len(lines), "W292",
                                 "pas de saut de ligne en fin de fichier"))
        if tree is None:
            continue
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and \
                    node.lineno > 2:
                start = node.lineno - 1
                if node.decorator_list:
                    start = node.decorator_list[0].lineno - 1
                before = lines[max(0, start - 2):start]
                if any(b.strip() for b in before) and not all(
                        b.strip().startswith("#") for b in before
                        if b.strip()):
                    issues.append(_issue(
                        filename, start + 1, "E302",
                        "2 lignes vides attendues avant une définition "
                        "de premier niveau"))
        for name, line, style in naming_problems(tree):
            issues.append(_issue(filename, line, "N8xx",
                                 f"`{name}` devrait être en {style}"))
        for name, line in untyped_functions(tree):
            issues.append(_issue(filename, line, "TYP",
                                 f"`{name}` : annotations de type "
                                 "incomplètes (mypy les exige ici)"))
    tools = {"flake8": _run_tool("flake8", files),
             "mypy": _run_tool("mypy", files)}
    return {"issues": issues, "tools": tools}


def _continuation_lines(source: str) -> set[int]:
    """Physical lines that continue a logical line (inside brackets)."""
    lines: set[int] = set()
    depth = 0
    last_row = 0
    try:
        for tok in tokenize.generate_tokens(io.StringIO(source).readline):
            row = tok.start[0]
            if row != last_row and depth > 0:
                lines.update(range(last_row + 1, row + 1))
            last_row = max(last_row, tok.end[0])
            if tok.type == tokenize.STRING and tok.end[0] > tok.start[0]:
                lines.update(range(tok.start[0] + 1, tok.end[0] + 1))
            if tok.type == tokenize.OP and tok.string in "([{":
                depth += 1
            elif tok.type == tokenize.OP and tok.string in ")]}":
                depth = max(0, depth - 1)
    except (tokenize.TokenError, IndentationError, SyntaxError):
        pass
    return lines


def _issue(filename: str, line: int, code: str, text: str) -> dict[str, Any]:
    return {"file": filename, "line": line, "code": code, "text": text}


def _run_tool(tool: str, files: dict[str, str]) -> dict[str, Any]:
    """Run flake8/mypy on a temporary copy. Static tools never execute
    the learner's code, so running them here is safe."""
    module_ok = False
    try:
        __import__(tool)
        module_ok = True
    except ImportError:
        module_ok = False
    if not module_ok and shutil.which(tool) is None:
        return {"available": False,
                "install": f"{sys.executable} -m pip install {tool}"}
    with tempfile.TemporaryDirectory(prefix="pycraft-lint-") as tmp:
        for filename, source in files.items():
            Path(tmp, filename).write_text(source, encoding="utf-8")
        cmd = [sys.executable, "-m", tool]
        if tool == "mypy":
            cmd += ["--ignore-missing-imports", "--no-error-summary",
                    "--cache-dir", str(Path(tmp, ".mypy_cache"))]
        cmd += sorted(files)
        try:
            proc = subprocess.run(cmd, cwd=tmp, capture_output=True,
                                  text=True, timeout=30)
        except (subprocess.TimeoutExpired, OSError) as exc:
            return {"available": True, "ok": False, "output": str(exc)}
    output = (proc.stdout + proc.stderr).strip()
    return {"available": True, "ok": proc.returncode == 0,
            "output": output or "Aucun problème détecté."}
