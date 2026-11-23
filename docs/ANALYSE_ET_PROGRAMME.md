# PyCraft — Analyse du PDF et programme pédagogique

Document de référence : *Code Cultivation – Object-Oriented Garden Systems* (v3.2, 22 pages, ex0 → ex6).

Ce document liste **ce que le PDF enseigne**, pas ce qu'il fait faire. Aucun exercice du PDF n'est
repris dans le jeu : pas de plantes, pas de jardin, pas de `show()` / `grow()` / `age()` imposés,
pas de sorties à imiter. Les notions sont réenseignées avec des situations Minecraft différentes.

---

## 1. Lecture du PDF, page par page

| Pages | Contenu | Ce qu'il faut en retenir |
|---|---|---|
| 1-4 | Avant-propos, consignes sur l'IA | Comprendre et pouvoir **expliquer** tout code rendu ; l'évaluation est orale |
| 5 | Introduction | Structure d'un programme → POO → réutilisation → extension → intégrité des données → architecture |
| 6 | Consignes générales | Python 3.10+, flake8, un fichier par exercice, PascalCase / snake_case, **type hints sur toutes les fonctions et méthodes**, mypy, programme qui ne plante jamais |
| 7-8 | ex0 | Point d'entrée, `if __name__ == "__main__":`, variables simples, `print()`, **savoir expliquer pourquoi le garde `__main__` est important (→ imports)**, **shebang ajouté en direct pendant l'évaluation** |
| 9-10 | ex1 | Une classe comme **modèle** commun, instanciation puis affectation des attributs, méthode d'affichage, gérer plusieurs objets « efficacement », se demander comment l'approche évoluera |
| 11-12 | ex2 | Réutiliser une classe, **méthodes qui modifient l'état**, simulation dans le temps avec `range()`, `round()`, lire l'état final, comportements différents selon l'objet, paramètres de méthodes |
| 13-14 | ex3 | **Constructeur** : créer et initialiser en même temps, objet prêt à l'emploi, au moins 5 objets, méthode d'affichage réutilisée sans modification |
| 15-16 | ex4 | **Encapsulation** : convention protégée `_` (**et pas le name mangling `__`**), getters / setters, validation (pas de négatif), message d'erreur émis par la classe, donnée laissée inchangée **ou** valeurs par défaut à la construction |
| 17-18 | ex5 | **Héritage**, classes spécialisées, attributs et méthodes propres à l'enfant, `super()` sur n'importe quelle méthode (dont `__init__`), **redéfinition qui réutilise le code du parent**, attribut qui évolue quand des méthodes héritées sont appelées, ne pas dupliquer |
| 19-20 | ex6 | `staticmethod` (test sans instance), `classmethod` (création d'un objet « anonyme »), **chaîne d'héritage à 3 niveaux**, **classe imbriquée** de statistiques encapsulée avec fonction d'affichage, compteurs d'appels (y compris des appels d'affichage), statistique supplémentaire pour une sous-classe, **fonction indépendante qui marche pour tout type d'objet**, forme décorateur **ou** forme fonction (`staticmethod()`) |
| 21 | Rendu | Vérifier flake8 + mypy ; à l'oral : expliquer les concepts, montrer l'héritage, **étendre le code en direct** |

---

## 2. Inventaire des notions

Légende : ✅ = dans ta liste et confirmé par le PDF · ➕ = présent dans le PDF mais absent de ta liste
(ajouté) · 🧩 = extension facultative (pas dans le PDF, identifiée comme telle).

### A. Structure et fonctionnement de Python
- ✅ A1 Exécution d'un programme de haut en bas, instruction par instruction
- ✅ A2 Point d'entrée d'un programme
- ✅ A3 `if __name__ == "__main__":` et valeur de `__name__`
- ✅ A4 Shebang `#!/usr/bin/env python3` (et `chmod +x`)
- ✅ A5 Variables (nom, valeur, type) et attributs
- ✅ A6 Organisation des fichiers Python
- ✅ A7 Imports et modularité (pourquoi le garde `__main__` évite d'exécuter du code à l'import)
- ➕ A8 `print()` et affichage formaté (f-strings, `str.capitalize()` cité p.6)
- ➕ A9 Boucles avec `range()` pour simuler le temps (ex2)
- ➕ A10 `round()` et nombres à virgule (ex2-ex6)
- ➕ A11 Listes pour gérer plusieurs objets « efficacement » (ex1, ex3)
- ➕ A12 Fonctions avec paramètres et valeur de retour (fonction `main`, fonction indépendante ex6)

### B. Programmation orientée objet
- ✅ B1 Classe = modèle · B2 instance = objet construit · B3 différence classe / objet
- ✅ B4 Créer des objets · B5 attributs d'instance (dont affectés **après** l'instanciation, ex1)
- ✅ B6 Constructeur `__init__` · B7 méthodes et `self` · B8 méthodes qui modifient l'état
- ✅ B9 Création + initialisation simultanées · B10 réutilisation des classes
- ➕ B11 Paramètres de méthodes (ex2 : « adding parameters to the methods »)
- ➕ B12 Comportements différents selon les attributs de chaque objet (ex2)
- ➕ B13 Objets indépendants : modifier l'un ne change pas l'autre

### C. Encapsulation
- ✅ C1 Principe · C2 convention `_` · C3 accès contrôlé · C4 getters · C5 setters · C6 validation
- ✅ C7 Intégrité des objets · C8 valeurs incorrectes
- ➕ C9 Message d'erreur émis **par la classe** + valeur laissée inchangée
- ➕ C10 Valeurs par défaut quand la construction reçoit des valeurs invalides
- ➕ C11 Différence `_protégé` / `__mangling` (le PDF interdit le mangling : il faut savoir pourquoi)
- 🧩 C12 `@property` (non demandé par le PDF)

### D. Héritage
- ✅ D1 Principe · D2 parent / enfant · D3 héritage attributs + méthodes · D4 spécialisation
- ✅ D5 `super()` · D6 réutiliser le parent · D7 redéfinition · D8 éviter la duplication
- ➕ D9 `super()` sur **n'importe quelle** méthode, pas seulement `__init__`
- ➕ D10 Redéfinition qui **prolonge** le parent (appel du parent + ajout)
- ➕ D11 Chaîne d'héritage à plusieurs niveaux (A → B → C)
- ➕ D12 `isinstance()` / `issubclass()` pour raisonner sur les lignées

### E. Méthodes avancées
- ✅ E1 `@staticmethod` · E2 `@classmethod` · E3 différences instance / statique / classe
- ✅ E4 Créer un objet avec une méthode de classe (`cls(...)`) · E5 méthodes sans instance
- ➕ E6 Forme fonction `staticmethod(f)` / `classmethod(f)` (autorisée par le PDF) vs décorateur
- ➕ E7 Objet « anonyme » / valeurs par défaut créé par méthode de classe
- ➕ E8 Pourquoi `cls()` plutôt que le nom de la classe (les sous-classes héritent du constructeur alternatif)
- 🧩 E9 Attributs de classe partagés (non demandé)

### F. Architecture
- ✅ F1 Classes imbriquées · F2 relations entre objets · F3 statistiques internes · F4 encapsulation des stats
- ✅ F5 Suivi des comportements (compteurs d'appels) · F6 extension d'une architecture existante
- ✅ F7 Fonction indépendante qui travaille avec plusieurs types d'objets
- ➕ F8 Statistique supplémentaire réservée à une sous-classe
- ➕ F9 Polymorphisme : la même fonction appelle la bonne version de la méthode
- ➕ F10 Étendre son code **en direct** à la demande (évaluation)

### G. Qualité du code
- ✅ G1 Python 3.10+ · G2 conventions · G3 PascalCase · G4 snake_case · G5 type hints · G6 organisation
- ✅ G7 flake8 · G8 mypy · G9 code lisible · G10 tests et vérification
- ➕ G11 Un programme ne doit **jamais** planter
- ➕ G12 Expliquer et justifier son code à l'oral (teach-back)
- 🧩 G13 `__str__` / `__repr__` (non demandé)

---

## 3. Régions et niveaux

| Région | Thème | Niveaux |
|---|---|---|
| R1 Le Village des Bâtisseurs | structure d'un programme | 1.1 Premiers blocs · 1.2 Le portail d'entrée · **1.3 Boss : le Creeper du désordre** |
| R2 L'Atelier des Créateurs | classes et objets | 2.1 Le moule et la créature · 2.2 Donner vie · 2.3 Le four qui travaille · 2.4 L'usine à outils · **2.5 Boss : l'Enderman voleur** |
| R3 La Citadelle des Gardiens | encapsulation | 3.1 Le golem sans armure · 3.2 Les gardiens de la porte · **3.3 Boss : le Golem corrupteur** |
| R4 La Forge des Lignées | héritage | 4.1 L'arbre des lignées · 4.2 L'appel des ancêtres · 4.3 Redéfinir et prolonger · **4.4 Boss : le Wither aux trois têtes** |
| R5 Le Laboratoire des Ingénieurs | méthodes statiques et de classe | 5.1 La calculatrice de redstone · 5.2 Les moules alternatifs · **5.3 Boss : l'Illager alchimiste** |
| R6 La Tour des Architectes | imbrication, stats, relations | 6.1 La machine dans la machine · 6.2 Compteurs spécialisés · 6.3 L'inspecteur universel · **6.4 Boss : le Dragon de l'End** |
| R7 Le Royaume Automatisé | épreuve finale | 7.1 Le Royaume automatisé |

## 4. Matrice de correspondance notion → niveau

(niveau où la notion est **enseignée** ; entre parenthèses, les niveaux qui la **réutilisent** et la vérifient)

| Notion | Niveau |
|---|---|
| A1 exécution séquentielle | 1.1 (toutes les visualisations pas à pas) |
| A2 point d'entrée, A3 `__main__` | 1.2 (1.3, 7.1) |
| A4 shebang | 1.3 (7.1) |
| A5 variables | 1.1 · attributs : 2.1 |
| A6 organisation des fichiers, A7 imports | 1.2 (1.3) |
| A8 print / f-strings | 1.1 (partout) |
| A9 `range()` | 2.3 (4.4, 6.4) |
| A10 `round()` | 2.3 (4.4) |
| A11 listes d'objets | 2.4 (2.5, 6.3, 7.1) |
| A12 fonctions | 1.2 (6.3) |
| B1-B5 classe, instance, différence, création, attributs | 2.1 |
| B13 objets indépendants | 2.1 (2.4) |
| B7 méthodes, `self` | 2.2 |
| B11 paramètres de méthodes | 2.2 (2.3) |
| B8 modification d'état, B12 comportements différents | 2.3 |
| B6 `__init__`, B9 création + initialisation, B10 réutilisation | 2.4 (2.5 et suivants) |
| C1-C4 principe, `_`, getters | 3.1 |
| C5-C10 setters, validation, message, défauts | 3.2 (3.3, 7.1) |
| C11 `_` vs `__` | 3.2 (quiz) |
| D1-D4, D12 héritage, spécialisation, isinstance | 4.1 |
| D5, D6, D8 `super().__init__`, pas de duplication | 4.2 |
| D7, D9, D10, D11 redéfinition, super sur méthode, chaîne | 4.3 (4.4) |
| E1, E5, E6 statique | 5.1 (5.3, 7.1) |
| E2, E4, E7, E8 classe | 5.2 (5.3, 7.1) |
| E3 différences | 5.3 |
| F1, F3, F4, F5 imbrication et stats | 6.1 |
| F6, F8 extension, stat de sous-classe | 6.2 |
| F7, F9, F2 fonction indépendante, polymorphisme, relations | 6.3 (6.4) |
| F10 extension en direct | 6.4, 7.1 |
| G2-G4 conventions | 1.3 (bonus qualité de toutes les missions) |
| G5 type hints | 1.3 (bonus qualité, obligatoires en 7.1) |
| G7-G8 flake8 / mypy | 1.3 (bouton « Analyse qualité » partout) |
| G10 tests | toutes les missions (batteries cachées) |
| G11 ne jamais planter | toutes les missions |
| G12 expliquer | quiz de prédiction + journal d'explication de chaque niveau, soutenance 7.1 |
| G1 Python 3.10+ | vérifié au lancement |
| 🧩 C12, E9, G13 | encadrés « Pour aller plus loin » (3.2, 5.2, 2.4), jamais exigés |

## 5. Mécaniques de visualisation (une par notion)

| Notion | Ce que tu vois | Source réelle |
|---|---|---|
| Variable | Un panneau planté sur la place avec `nom = valeur`, qui clignote quand la valeur change | diff des variables globales à chaque ligne |
| Classe | Un **plan holographique** apparaît dans la zone de création, sans créature | interception de la création de classe (`__build_class__`) |
| Instance | La créature apparaît dans le monde, avec une étiquette `variable : Classe` | détection des nouvelles instances des classes que tu as écrites |
| Attribut | Bulle `health : 100 → 80`, barre de vie / couleur / nom pilotés par les attributs | diff de `vars(objet)` à chaque ligne |
| Méthode | La créature s'anime, bulle `attack()` ; les `print` sortent de sa bouche | événements d'appel / retour du traceur |
| Constructeur | Les attributs se remplissent un par un pendant `__init__` | lignes tracées dans `__init__` |
| Protégé `_` | Cadenas sur l'attribut ; alerte rouge si on le modifie hors de la classe | origine de la modification (méthode de la classe ou non) |
| Setter refusé | Bouclier rouge, valeur inchangée | appel `set_…` terminé sans changement |
| Héritage | Fil doré du plan enfant vers le plan parent ; le modèle 3D enfant hérite du modèle parent | bases réelles des classes |
| `super()` | Rayon doré de l'objet vers le plan parent quand la méthode du parent s'exécute | appel d'une méthode d'une classe ancêtre depuis la méthode de l'enfant, même `self` |
| Statique | Le plan s'active seul, engrenage « aucune instance » | méthode marquée `staticmethod` |
| Méthode de classe | Le plan s'active en bleu ; si `cls()` crée un objet, un rayon part du plan vers le nouvel objet | méthode marquée `classmethod` + création pendant l'appel |
| Classe imbriquée | Petit plan dans le grand plan ; l'objet interne flotte en satellite de son propriétaire | qualname `Externe.Interne` + références entre objets |
| Relations | Cordes entre objets qui se référencent | attributs qui pointent vers d'autres objets suivis |
| Erreur | Explosion à la ligne fautive + explication en français | exception réelle, ligne réelle |
