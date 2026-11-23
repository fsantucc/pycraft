"""Turn a Python error into a short French explanation + a hint.

The goal is the one of a tutor: say *what* happened, *why* it happens,
*where*, and give a hint — never the corrected code.
"""
from __future__ import annotations

import re
from typing import Any


def explain(error: dict[str, Any], files: dict[str, str]) -> dict[str, str]:
    kind = error.get("type", "")
    message = error.get("message", "")
    line_text = _line(error, files)
    what, why, hint = _rules(kind, message, line_text)
    return {"what": what, "why": why, "hint": hint, "code": line_text}


def _line(error: dict[str, Any], files: dict[str, str]) -> str:
    line = error.get("line")
    source = files.get(error.get("file") or "main.py", "")
    if not line:
        return ""
    lines = source.split("\n")
    return lines[line - 1].strip() if 0 < line <= len(lines) else ""


def _rules(kind: str, message: str, code: str) -> tuple[str, str, str]:
    if kind == "NameError":
        name = _first(r"name '(\w+)'", message)
        if name == "self":
            return ("`self` est inconnu ici.",
                    "`self` n'existe que comme *premier paramètre* d'une "
                    "méthode.",
                    "Cette ligne est-elle bien dans une méthode qui reçoit "
                    "self en premier paramètre ?")
        return (f"Python ne connaît pas le nom `{name}` à ce moment-là.",
                "Un nom doit être défini (variable, fonction, classe) "
                "*avant* la ligne qui l'utilise, et être écrit exactement "
                "pareil (majuscules comprises).",
                "Cherche où ce nom est créé. Faute de frappe ? Utilisé "
                "avant d'être défini ? Défini dans une autre fonction ?")
    if kind == "AttributeError":
        obj = _first(r"'(\w+)' object", message)
        attr = _first(r"attribute '(\w+)'", message)
        if "type object" in message:
            return (f"La classe n'a pas d'attribut `{attr}`.",
                    "Tu demandes quelque chose à la *classe* (le modèle) "
                    "qui n'existe que sur les *objets*, ou qui n'existe pas.",
                    "As-tu appelé la méthode sur la classe au lieu d'un "
                    "objet ? Le nom est-il bien orthographié ?")
        return (f"L'objet `{obj}` n'a pas d'attribut `{attr}`.",
                "Un attribut n'existe qu'après avoir été affecté "
                "(souvent dans `__init__` avec `self.nom = ...`).",
                f"Où `{attr}` est-il censé être créé ? Le nom est-il "
                "identique à l'endroit où tu l'affectes ?")
    if kind == "TypeError":
        if "positional argument" in message and "were given" in message \
                and "takes" in message:
            expected = _first(r"takes (\d+)", message)
            if expected == "0" or "takes 0" in message or (
                    "takes 1" in message and "2 were given" in message):
                return ("La méthode reçoit un argument de trop.",
                        "Quand tu écris `objet.methode()`, Python passe "
                        "l'objet lui-même comme premier argument.",
                        "La définition de cette méthode a-t-elle `self` "
                        "comme premier paramètre ?")
            return ("Le nombre d'arguments ne correspond pas.",
                    "L'appel transmet plus de valeurs que la définition "
                    "n'en attend.",
                    "Compare la ligne de l'appel avec la ligne `def` "
                    "correspondante.")
        if "missing" in message and "required positional argument" \
                in message:
            names = ", ".join(re.findall(r"'(\w+)'", message)[1:]) or "?"
            return (f"Il manque une valeur pour : {names}.",
                    "La définition attend ce paramètre, mais l'appel ne "
                    "le fournit pas. Pour `Classe(...)`, ce sont les "
                    "paramètres de `__init__` (sans compter self).",
                    "Combien de valeurs `__init__` attend-il ? Combien "
                    "en donnes-tu à la création ?")
        if "not callable" in message:
            return ("Tu appelles avec () quelque chose qui n'est pas une "
                    "fonction.",
                    "Un attribut et une méthode portent peut-être le même "
                    "nom : l'attribut masque la méthode.",
                    "Que contient ce nom au moment de l'appel ?")
        if "unsupported operand" in message or "can only concatenate" \
                in message:
            return ("Opération entre deux types incompatibles.",
                    "Python ne mélange pas automatiquement texte et "
                    "nombre.",
                    "Quel est le type de chaque côté de l'opération ? "
                    "Une f-string ou str() peut aider pour l'affichage.")
        return ("Une valeur n'a pas le type attendu.", message,
                "Vérifie le type des valeurs utilisées sur cette ligne.")
    if kind in ("IndentationError", "TabError"):
        return ("Problème d'indentation.",
                "En Python, l'indentation (4 espaces) définit les blocs : "
                "le corps d'une classe, d'une méthode, d'un if, d'une "
                "boucle.",
                "Cette ligne est-elle alignée avec les autres lignes de "
                "son bloc ? Le bloc précédent se termine-t-il par `:` ?")
    if kind == "SyntaxError":
        if "expected ':'" in message:
            return ("Il manque `:`.",
                    "`class`, `def`, `if`, `for`, `while` se terminent "
                    "par deux-points.",
                    "Regarde la fin de cette ligne.")
        if "never closed" in message or "unmatched" in message:
            return ("Une parenthèse, un crochet ou une accolade n'est pas "
                    "refermé(e).",
                    "Chaque `(`, `[`, `{` doit avoir sa paire.",
                    "Compte les parenthèses sur cette ligne et la "
                    "précédente.")
        if "unterminated string" in message:
            return ("Une chaîne de caractères n'est pas fermée.",
                    "Un texte commence et finit par le même guillemet.",
                    "Repère le guillemet ouvrant sans partenaire.")
        return ("Python ne comprend pas la syntaxe de cette ligne.",
                message,
                "Relis la ligne caractère par caractère, et la ligne "
                "d'avant.")
    if kind == "ZeroDivisionError":
        return ("Division par zéro.", "Le diviseur vaut 0 à ce moment.",
                "Quelle valeur a le diviseur ? Faut-il un test avant ?")
    if kind == "RecursionError":
        return ("Une fonction s'appelle elle-même sans fin.",
                "Souvent : une méthode qui s'appelle au lieu d'appeler "
                "celle du parent, ou un attribut qui porte le nom d'une "
                "méthode.",
                "Dans la méthode, appelles-tu la même méthode sur self ? "
                "Voulais-tu `super()` ?")
    if kind in ("Timeout", "StepLimitReached"):
        return ("Ton programme ne s'arrête pas (ou trop tard).", message,
                "La condition de ta boucle finit-elle par devenir "
                "fausse ? Que vaut la variable testée à chaque tour ?")
    if kind == "ImportError" or kind == "ModuleNotFoundError":
        return ("Import impossible.", message,
                "Le nom du module correspond-il au nom du fichier, sans "
                ".py ?")
    if kind == "PermissionError":
        return ("Action interdite.", message,
                "PyCraft n'autorise pas les fichiers, le réseau ni les "
                "commandes système.")
    if kind == "MemoryError":
        return ("Trop de mémoire utilisée.",
                "Une liste ou une chaîne devient gigantesque.",
                "Une boucle ajoute-t-elle des éléments sans fin ?")
    if kind == "ValueError":
        return ("Valeur incorrecte.", message,
                "Quelle valeur reçoit cette ligne ?")
    if kind in ("KeyError", "IndexError"):
        return ("Accès à un élément qui n'existe pas.", message,
                "Que contient la collection à ce moment ?")
    return (f"Erreur {kind}.", message, "Lis la ligne indiquée.")


def _first(pattern: str, text: str) -> str:
    match = re.search(pattern, text)
    return match.group(1) if match else "?"
