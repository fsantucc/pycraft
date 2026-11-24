"""The PyCraft curriculum: 4 acts (python00 → python03), 13 regions."""
from __future__ import annotations

from .model import Level, Region
from .scenes import SCENES
from . import (r0_prairie, r1_village, r2_atelier, r3_citadelle, r4_forge,
               r5_labo, r6_tour, r7_royaume, r8_faille, r9_biblio)

ACTS: dict[int, dict[str, str]] = {
    1: {"name": "Acte I — Les Fondations", "subject": "python00 · Growing Code",
        "summary": "Fonctions, entrées, calculs, conditions, boucles, récursion"},
    2: {"name": "Acte II — L'Ère des Créateurs",
        "subject": "python01 · Code Cultivation",
        "summary": "Programmation orientée objet"},
    3: {"name": "Acte III — Les Terres Instables",
        "subject": "python02 · Garden Guardian",
        "summary": "Exceptions et programmes qui ne plantent jamais"},
    4: {"name": "Acte IV — Le Royaume des Données",
        "subject": "python03 · Data Quest",
        "summary": "Collections, générateurs, compréhensions, grande finale"},
}

REGIONS: list[Region] = [
    r0_prairie.REGION_PRAIRIE, r0_prairie.REGION_MINES,
    r1_village.REGION, r2_atelier.REGION, r3_citadelle.REGION,
    r4_forge.REGION, r5_labo.REGION, r6_tour.REGION, r7_royaume.REGION,
    r8_faille.REGION,
    r9_biblio.REGION_BIBLIO, r9_biblio.REGION_SOURCE, r9_biblio.REGION_COEUR,
]

# Level numbers follow the order of the adventure: region.level
for _r_index, _region in enumerate(REGIONS, start=1):
    for _l_index, _level in enumerate(_region.levels, start=1):
        _level.number = f"{_r_index}.{_l_index}"
        _level.region = _region.id

LEVELS: dict[str, Level] = {
    level.id: level for region in REGIONS for level in region.levels
}
ORDER: list[str] = [level.id for region in REGIONS for level in region.levels]

# The story scene of each level (characters, scenery, dialogues).
for _level_id, _scene in SCENES.items():
    LEVELS[_level_id].scene = _scene

NOTIONS: dict[str, str] = {
    "A1": "Exécution séquentielle", "A2": "Point d'entrée",
    "A3": "if __name__ == \"__main__\"", "A4": "Shebang",
    "A5": "Variables", "A6": "Organisation des fichiers",
    "A7": "Imports et modularité", "A8": "print et f-strings",
    "A9": "Boucles range()", "A10": "round()", "A11": "Listes d'objets",
    "A12": "Fonctions", "B1": "Classe = modèle", "B2": "Instance",
    "B3": "Classe vs objet", "B4": "Créer des objets",
    "B5": "Attributs d'instance", "B6": "Constructeur __init__",
    "B7": "Méthodes et self", "B8": "Méthodes qui modifient l'état",
    "B9": "Création + initialisation", "B10": "Réutilisation des classes",
    "B11": "Paramètres de méthodes", "B12": "Comportements différents",
    "B13": "Objets indépendants", "C1": "Encapsulation",
    "C2": "Convention _", "C3": "Accès contrôlé", "C4": "Getters",
    "C5": "Setters", "C6": "Validation", "C7": "Intégrité",
    "C8": "Valeurs incorrectes", "C9": "Message + valeur inchangée",
    "C10": "Valeurs par défaut", "C11": "_ vs __ (mangling)",
    "D1": "Héritage", "D2": "Parent / enfant",
    "D3": "Attributs et méthodes hérités",
    "D4": "Spécialisation", "D5": "super()", "D6": "Réutiliser le parent",
    "D7": "Redéfinition", "D8": "Éviter la duplication",
    "D9": "super() sur toute méthode", "D10": "Prolonger le parent",
    "D11": "Chaîne d'héritage", "D12": "isinstance / issubclass",
    "E1": "@staticmethod", "E2": "@classmethod",
    "E3": "Instance / statique / classe", "E4": "Créer avec cls()",
    "E5": "Méthode sans instance", "E6": "staticmethod() forme fonction",
    "E7": "Objet anonyme / par défaut", "E8": "cls() et sous-classes",
    "F1": "Classes imbriquées", "F2": "Relations entre objets",
    "F3": "Statistiques internes", "F4": "Encapsulation des stats",
    "F5": "Suivi des comportements", "F6": "Extension d'une architecture",
    "F7": "Fonction indépendante multi-types", "F8": "Stat de sous-classe",
    "F9": "Polymorphisme", "F10": "Extension en direct",
    "G1": "Python 3.10+", "G2": "Conventions de nommage",
    "G3": "PascalCase", "G4": "snake_case", "G5": "Type hints",
    "G6": "Organisation du code", "G7": "flake8", "G8": "mypy",
    "G9": "Code lisible", "G10": "Tests", "G11": "Ne jamais planter",
    "G12": "Expliquer son code",
    "H1": "Définir et appeler une fonction",
    "H2": "Fichier de fonctions + testeur",
    "H3": "input()", "H4": "int() et types str / int",
    "H5": "Opérateurs + - * / // %", "H6": "if / elif / else",
    "H7": "Comparaisons et valeurs limites", "H8": "Boucle for / range()",
    "H9": "Boucle while", "H10": "Accumulateur", "H11": "Récursion et cas de base",
    "H12": "Itératif vs récursif", "H13": "Fonction auxiliaire / défaut",
    "H14": "return vs print", "H15": "Méthodes de chaînes",
    "H16": "Annotations obligatoires", "H17": "Style flake8",
    "X1": "try / except", "X2": "Message d'erreur (as e)",
    "X3": "Ne jamais planter", "X4": "raise", "X5": "Valider en levant",
    "X6": "Propagation dans la pile", "X7": "Types d'exceptions intégrés",
    "X8": "Plusieurs except / tuple", "X9": "Attraper par famille",
    "X10": "Exceptions personnalisées", "X11": "Message par défaut",
    "X12": "finally", "X13": "Libérer les ressources", "X14": "open()",
    "K1": "sys.argv", "K2": "Listes : index, len, tranches",
    "K3": "Méthodes de liste, tri", "K4": "sum / min / max",
    "K5": "Tuples immuables, déballage", "K6": "math.sqrt",
    "K7": "Boucle de réessai", "K8": "Ensembles (unicité)",
    "K9": "Union / intersection / différence", "K10": "random",
    "K11": "Dictionnaires", "K12": "keys / values / items / get / update",
    "K13": "Générateurs (yield)", "K14": "next() et flux infini",
    "K15": "Générateur dans un for", "K16": "Compréhension de liste",
    "K17": "Compréhension de dict", "K18": "Compréhension d'ensemble",
    "K19": "Filtrer avec if", "K20": "Choisir la bonne collection",
}


def public_curriculum() -> dict[str, object]:
    return {
        "regions": [region.public() for region in REGIONS],
        "acts": ACTS,
        "notions": NOTIONS,
        "order": ORDER,
    }
