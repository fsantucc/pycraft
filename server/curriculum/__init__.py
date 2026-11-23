"""The PyCraft curriculum: 7 regions, 23 levels."""
from __future__ import annotations

from .model import Level, Region
from . import (r1_village, r2_atelier, r3_citadelle, r4_forge, r5_labo,
               r6_tour, r7_royaume)

REGIONS: list[Region] = [
    r1_village.REGION, r2_atelier.REGION, r3_citadelle.REGION,
    r4_forge.REGION, r5_labo.REGION, r6_tour.REGION, r7_royaume.REGION,
]

LEVELS: dict[str, Level] = {
    level.id: level for region in REGIONS for level in region.levels
}
ORDER: list[str] = [level.id for region in REGIONS for level in region.levels]

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
}


def public_curriculum() -> dict[str, object]:
    return {
        "regions": [region.public() for region in REGIONS],
        "notions": NOTIONS,
        "order": ORDER,
    }
