"""Turn a Python error into a short French explanation + a hint.

The goal is the one of a tutor: say *what* happened, *why* it happens,
*where*, and give a hint — never the corrected code.
"""
from __future__ import annotations

import re
from typing import Any


def explain(error: dict[str, Any], files: dict[str, str]) -> dict[str, Any]:
    kind = error.get("type", "")
    message = error.get("message", "")
    line_text = _line(error, files)
    what, why, hint = _rules(kind, message, line_text)
    questions, experiment = _guide(kind, message, line_text)
    return {"what": what, "why": why, "hint": hint, "code": line_text,
            "questions": [hint] + [q for q in questions if q != hint],
            "experiment": experiment,
            "suspects": _suspects(kind, message, line_text)}


# Python keywords and builtins are never "suspects" to look at on the map.
_NOT_NAMES = {
    "False", "None", "True", "and", "as", "assert", "break", "class",
    "continue", "def", "del", "elif", "else", "except", "finally", "for",
    "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
    "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "print", "len", "range", "int", "str", "float", "list", "dict", "set",
    "tuple", "input", "type", "isinstance", "super", "self", "open", "sum",
    "min", "max", "abs", "round", "sorted", "enumerate", "zip", "next",
    "iter", "bool", "f",
}


def _suspects(kind: str, message: str, code: str) -> list[str]:
    """Names worth looking at on the map / in the inspector."""
    names: list[str] = []
    for found in re.findall(r"'(\w+)'", message):
        if found not in names and found not in _NOT_NAMES:
            names.append(found)
    code_only = re.sub(r"(\"[^\"]*\"|'[^']*')", "", code)
    for found in re.findall(r"[A-Za-z_]\w*", code_only):
        if found not in names and found not in _NOT_NAMES \
                and not found.isdigit():
            names.append(found)
    return names[:6]


def _guide(kind: str, message: str, code: str) -> tuple[list[str], str]:
    """Follow-up questions (from general to precise) and one experiment.

    Like a tutor: they narrow down where to look, they never give the
    corrected code.
    """
    step_tip = ("Recule pas à pas (◀) jusqu'à juste avant l'erreur et "
                "regarde l'onglet Inspecteur.")
    if kind == "NameError":
        return (["Où ce nom est-il créé dans ton fichier ? Avant ou après "
                 "cette ligne ?",
                 "Si c'est dans une fonction : est-il créé dans *cette* "
                 "fonction, ou ailleurs ?",
                 "Compare lettre par lettre les deux endroits : même "
                 "majuscule, même orthographe ?"],
                "Utilise Ctrl+F (ou relis ton code) pour trouver toutes les "
                "fois où ce nom apparaît.")
    if kind == "AttributeError":
        return (["Sur quel objet porte le `.` de cette ligne ? De quelle "
                 "classe est-il ?",
                 "Dans la classe, quelle méthode crée cet attribut avec "
                 "`self.... = ` ? A-t-elle déjà été appelée à ce moment ?",
                 "L'attribut porte-t-il exactement le même nom aux deux "
                 "endroits (avec ou sans `_`) ?"],
                "Clique sur l'objet dans le monde : l'inspecteur montre ses "
                "attributs réels juste avant l'erreur.")
    if kind == "TypeError":
        return (["Quel est le type de chaque valeur utilisée sur cette "
                 "ligne ?",
                 "Combien de valeurs l'appel donne-t-il, et combien la "
                 "définition en attend-elle ?",
                 "Si c'est une méthode : `self` est-il bien le premier "
                 "paramètre ?"],
                "Ajoute temporairement print(type(...)) sur la valeur "
                "suspecte juste avant la ligne, puis relance.")
    if kind in ("IndentationError", "TabError", "SyntaxError"):
        return (["L'erreur est-elle vraiment sur cette ligne, ou sur la "
                 "ligne juste avant ?",
                 "Chaque ligne qui ouvre un bloc se termine-t-elle par `:` ?",
                 "Les parenthèses et guillemets ouverts sont-ils tous "
                 "fermés ?"],
                "Mets la ligne précédente en commentaire (#) pour voir si "
                "l'erreur change de place.")
    if kind == "ZeroDivisionError":
        return (["D'où vient la valeur du diviseur ?",
                 "Dans quel cas peut-elle valoir 0 ?",
                 "Que doit faire ton programme dans ce cas-là ?"],
                step_tip)
    if kind in ("RecursionError",):
        return (["Quelle fonction apparaît en boucle dans la pile "
                 "d'appels ?",
                 "Quelle condition devrait arrêter les appels ?",
                 "Chaque appel se rapproche-t-il vraiment de cette "
                 "condition ?"],
                "Regarde la tour « pile d'appels » sur la carte : quel "
                "étage se répète ?")
    if kind in ("Timeout", "StepLimitReached"):
        return (["Quelle variable la condition de ta boucle teste-t-elle ?",
                 "Cette variable change-t-elle à chaque tour ?",
                 "Change-t-elle dans le bon sens pour que la condition "
                 "devienne fausse ?"],
                "Ajoute un print() de cette variable dans la boucle et "
                "observe les premières valeurs.")
    if kind in ("IndexError", "KeyError"):
        return (["Que contient la collection à ce moment-là ?",
                 "Quel index (ou quelle clé) demandes-tu exactement ?",
                 "Dans quel cas cette valeur peut-elle sortir des limites ?"],
                "Regarde la collection sur la carte au pas juste avant "
                "l'erreur : combien d'éléments, quelles clés ?")
    if kind in ("ValueError", "UnboundLocalError", "StopIteration",
                "EOFError"):
        return (["Quelle valeur cette ligne reçoit-elle réellement ?",
                 "D'où vient cette valeur ?",
                 "Quel cas ton programme n'a-t-il pas prévu ?"],
                step_tip)
    return (["Que fait cette ligne, en une phrase ?",
             "Quelle valeur y est différente de ce que tu imaginais ?"],
            step_tip)


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
    if kind == "ImportError" and "cannot import name" in message:
        name = _first(r"cannot import name '(\w+)'", message)
        return (f"`{name}` est introuvable dans ton fichier.",
                "L'assistant main.py importe ta fonction par son nom exact. "
                "Tant qu'elle n'existe pas (ou porte un autre nom), "
                "l'import échoue.",
                f"As-tu bien écrit `def {name}(...)` dans ton fichier, avec "
                "exactement ce nom ?")
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
    if kind == "EOFError":
        return ("Ton programme demande une valeur au clavier, mais il n'y "
                "en a plus.",
                "Dans PyCraft, ce que tape l'utilisateur se règle dans "
                "« Entrées du programme » : une ligne par appel à input().",
                "Combien de fois input() est-il appelé ? Combien de lignes "
                "as-tu préparées ?")
    if kind == "UnboundLocalError":
        return ("Variable locale utilisée avant d'avoir reçu une valeur.",
                "Si une fonction affecte une variable, Python la considère "
                "comme locale dans toute la fonction.",
                "Cette variable reçoit-elle une valeur avant cette ligne, "
                "dans tous les cas (if / else) ?")
    if kind == "StopIteration":
        return ("Le générateur est épuisé.",
                "next() a été appelé alors qu'il n'y avait plus de valeur "
                "à produire.",
                "Combien de valeurs ce générateur peut-il produire ? Une "
                "boucle for s'arrête toute seule, next() non.")
    if kind == "FileNotFoundError":
        return ("Le fichier demandé n'existe pas.", message,
                "Une ouverture de fichier peut échouer : c'est exactement "
                "le genre d'opération à protéger avec try / except.")
    if kind == "KeyError":
        return (f"La clé {message} n'existe pas dans le dictionnaire.",
                "d[cle] exige une clé présente.",
                "Teste avec `cle in d`, ou utilise d.get(cle, valeur).")
    if kind == "IndexError":
        return ("Index en dehors de la liste.", message,
                "Une liste de n éléments a des index de 0 à n - 1. "
                "Que vaut len() à ce moment ?")
    if kind == "ValueError":
        return ("Valeur incorrecte.", message,
                "Quelle valeur reçoit cette ligne ?")
    return (f"Erreur {kind}.", message, "Lis la ligne indiquée.")


def _first(pattern: str, text: str) -> str:
    match = re.search(pattern, text)
    return match.group(1) if match else "?"
