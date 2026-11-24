# PyCraft — Analyse des sujets et programme pédagogique

Sujets de référence, dans l'ordre du cursus :

| Sujet | Titre | Pages | Place dans PyCraft |
|---|---|---|---|
| python00 | *Growing Code — Python Fundamentals Through Garden Data* | 19 | **Acte I — Les Fondations** |
| python01 | *Code Cultivation — Object-Oriented Garden Systems* | 22 | **Acte II — L'Ère des Créateurs** |
| python02 | *Garden Guardian — Data Engineering for Smart Agriculture* | 19 | **Acte III — Les Terres Instables** |
| python03 | *Data Quest — Mastering Python Collections* | 22 | **Acte IV — Le Royaume des Données** + grande finale |

Le jeu enseigne **les notions** des sujets, jamais leurs exercices : pas de jardin, pas de
`ft_hello_garden`, de températures, de succès de joueurs ou d'inventaire `item:quantité` en
ligne de commande. Chaque notion est réenseignée dans une situation Minecraft différente.

Légende des inventaires : ✅ notion explicitement demandée par le sujet · ➕ notion implicite
(nécessaire pour réussir le sujet ou demandée à l'oral) · 🧩 extension facultative signalée
comme telle dans le jeu.

---

## Acte I — python00 « Growing Code »

**Ce que dit le sujet** : écrire **uniquement des fonctions** (pas de `main`, pas de code hors
fonction) testées par un `main.py` fourni qui les importe ; Python 3.10+, flake8, un fichier par
exercice ; annotations recommandées (ex0-6) puis **obligatoires** (ex7, vérifiées par mypy) ;
à l'évaluation : expliquer, tracer l'exécution, modifier son code.

| Exercice du sujet | Notions extraites |
|---|---|
| ex0 | ✅ définir une fonction, `print()` ; ➕ définir ≠ appeler, indentation |
| ex1 | ✅ `input()`, affichage formaté |
| ex2-ex3 | ✅ `int()`, opérateurs ; ➕ `input()` renvoie toujours un `str` |
| ex4-ex5 | ✅ `if`/`else`, comparaison **stricte** ; ➕ valeurs limites |
| ex6 | ✅ `range()`, itératif **et** récursif au même affichage, fonction auxiliaire / imbriquée / paramètre par défaut ; ➕ cas de base, pile d'appels |
| ex7 | ✅ annotations obligatoires, `str` methods (`capitalize`), cas « unité inconnue », mypy |
| Helper | ➕ `import` d'une fonction depuis un autre fichier |

Notions du jeu : **H1** définir/appeler · **H2** fichier de fonctions + testeur · **H3** `input()` ·
**H4** `int()` et types · **H5** opérateurs `+ - * / // %` · **H6** `if/elif/else` · **H7**
comparaisons et limites · **H8** `for`/`range` · **H9** `while` (➕, utile pour la suite) ·
**H10** accumulateur (➕) · **H11** récursion, cas de base · **H12** itératif vs récursif ·
**H13** fonction auxiliaire / défaut · **H14** `return` vs `print` (➕) · **H15** méthodes de
chaînes · **H16** annotations obligatoires · **H17** flake8.

## Acte II — python01 « Code Cultivation »

Inchangé depuis la première version (voir le détail page par page ci-dessous) : point d'entrée et
`__main__`, shebang, modules ; classes et instances ; méthodes ; constructeur ; encapsulation
(`_`, getters, setters, validation) ; héritage, `super()`, redéfinition, chaîne à 3 niveaux ;
`@staticmethod`, `@classmethod` ; classes imbriquées et statistiques ; fonction indépendante
polymorphe ; flake8, mypy, type hints. Notions **A1-A12, B1-B13, C1-C12, D1-D12, E1-E9,
F1-F10, G1-G13**.

| Pages | Retenu |
|---|---|
| 7-8 (ex0) | point d'entrée, garde `__main__`, lien avec les imports, shebang ajouté en direct |
| 9-14 (ex1-3) | classe = modèle, attributs, méthodes, état, `range()`, `round()`, constructeur, listes d'objets |
| 15-16 (ex4) | `_` (pas `__`), getters/setters, validation, message + valeur inchangée ou défauts |
| 17-18 (ex5) | héritage, `super()` sur toute méthode, redéfinition qui prolonge, pas de duplication |
| 19-20 (ex6) | statique, classe (objet anonyme), chaîne à 3 niveaux, classe imbriquée de stats, stat de sous-classe, fonction pour tout type |

## Acte III — python02 « Garden Guardian »

**Ce que dit le sujet** : chaque exercice utilise `try`/`except` ; annotations obligatoires,
mypy ; le programme ne doit **jamais** planter ; montrer cas normaux et cas d'erreur ; utiliser
les exceptions intégrées à bon escient.

| Exercice du sujet | Notions extraites |
|---|---|
| ex0 | ✅ `try`/`except`, message de l'exception, le programme continue |
| ex1 | ✅ `raise` pour une valeur valide mais hors limites (bornes incluses), message personnalisé ; ➕ propagation vers l'appelant |
| ex2 | ✅ `ValueError`, `ZeroDivisionError`, `FileNotFoundError` (`open()`), `TypeError` ; ✅ plusieurs types dans un seul `try` ; ✅ interdiction de `type()` ; ➕ mypy signale le `TypeError` volontaire |
| ex3 | ✅ exceptions personnalisées héritant d'`Exception` puis d'une base commune, message par défaut, attraper la base attrape toute la famille |
| ex4 | ✅ `finally` toujours exécuté, nettoyage de ressource, retour immédiat depuis le `except` |

Notions : **X1** `try/except` · **X2** `as e` · **X3** ne jamais planter · **X4** `raise` · **X5**
valider en levant · **X6** propagation · **X7** types intégrés (➕ `KeyError`, `IndexError` cités
par le sujet) · **X8** plusieurs `except` / tuple · **X9** attraper par famille · **X10**
exceptions personnalisées · **X11** message par défaut · **X12** `finally` · **X13** libérer les
ressources · **X14** `open()` · 🧩 **else** de `try` (présenté, jamais exigé).

## Acte IV — python03 « Data Quest »

**Ce que dit le sujet** : `import sys` et `sys.argv` ; pas d'entrées/sorties fichier ; annotations
et mypy ; ne pas planter ; chaque nouvelle structure devient utilisable avec toutes ses méthodes
une fois introduite ; à l'oral : justifier le choix des structures, étendre le code.

| Exercice du sujet | Notions extraites |
|---|---|
| ex0 | ✅ `sys.argv` comme première liste, `len()`, index, éviter le nom du programme (➕ tranches, `enumerate`) |
| ex1 | ✅ construire une liste, `try` sur les conversions, cas « aucun argument », `sum/max/min`, moyenne |
| ex2 | ✅ tuples (immuables), `split`, `float`, réessai jusqu'à une saisie valide, `math.sqrt`, `round` |
| ex3 | ✅ sets, union / intersection / différence, unicité, `random`, affichage de `set()` |
| ex4 | ✅ dictionnaires, `keys/values/update`, pourcentages, plus/moins abondant (➕ `get`, `items`, `del`) |
| ex5 | ✅ générateurs, `yield`, `next()`, générateur infini, générateur consommé dans un `for` qui vide une liste |
| ex6 | ✅ compréhensions de liste (avec et sans filtre), de dict, ➕ d'ensemble, une ligne chacune |

Notions : **K1** `sys.argv` · **K2** index, `len`, tranches · **K3** méthodes de liste, tri ·
**K4** `sum/min/max` · **K5** tuples, déballage · **K6** `math.sqrt` · **K7** boucle de réessai ·
**K8** sets · **K9** opérations d'ensembles · **K10** `random` · **K11** dicts · **K12**
`keys/values/items/get/update` · **K13** générateurs · **K14** `next()`, flux infini · **K15**
générateur dans un `for` · **K16-K18** compréhensions liste / dict / set · **K19** filtrer ·
**K20** choisir la bonne collection.

**Suite inventée** : une **grande finale** (« Le Cœur du Monde ») qui mélange les quatre actes
dans un seul programme : classes, méthodes statiques et de classe, encapsulation, famille
d'exceptions, dict, set, tuple, générateur, compréhensions, `sys.argv`, shebang, annotations.

---

## Les 13 régions et 43 niveaux

| # | Région (acte) | Niveaux |
|---|---|---|
| 1 | La Prairie des Premiers Pas (I) | 1.1 Le premier mot · 1.2 Premiers blocs · 1.3 Le villageois curieux · 1.4 Le gardien du pont |
| 2 | Les Mines de l'Écho (I) | 2.1 La tour de blocs · 2.2 L'écho de la grotte · **2.3 Boss : le Golem du registre** |
| 3 | Le Portail des Bâtisseurs (II) | 3.1 Le portail d'entrée · **3.2 Boss : le Creeper du désordre** |
| 4 | L'Atelier des Créateurs (II) | 4.1 → **4.5 Boss : l'Enderman voleur** |
| 5 | La Citadelle des Gardiens (II) | 5.1 → **5.3 Boss : le Golem corrupteur** |
| 6 | La Forge des Lignées (II) | 6.1 → **6.4 Boss : le Wither** |
| 7 | Le Laboratoire des Ingénieurs (II) | 7.1 → **7.3 Boss : l'Illager alchimiste** |
| 8 | La Tour des Architectes (II) | 8.1 → **8.4 Boss : le Dragon de l'End** |
| 9 | Le Royaume Automatisé (II) | **9.1 Épreuve de l'acte II** |
| 10 | Les Terres Instables (III) | 10.1 Le capteur fêlé · 10.2 Les seuils de la pile · 10.3 La machine aux six leviers · 10.4 Forger ses propres erreurs · 10.5 Le rituel de fermeture · **10.6 Boss : la Tempête de données** |
| 11 | La Grande Bibliothèque (IV) | 11.1 Les ordres du chat · 11.2 Le tableau des records · 11.3 Les coordonnées gravées · 11.4 Les biomes partagés · 11.5 Le livre des recettes |
| 12 | La Source Infinie (IV) | 12.1 Le générateur de vagues · **12.2 Boss : l'Alchimiste des données** |
| 13 | Le Cœur du Monde (IV) | **13.1 Grande finale** |

## Matrice notion → niveau (niveau où la notion est enseignée)

| Notions | Niveau |
|---|---|
| H1, H2 (+ A1, A8) | 1.1 |
| A5 variables, types, f-strings | 1.2 |
| H3, H4, H5 | 1.3 |
| H6, H7 | 1.4 |
| H8, H9, H10 | 2.1 |
| H11, H12, H13, H14 | 2.2 |
| H15, H16, H17 (+ G5, G8) | 2.3 |
| A2, A3, A6, A7, A12 | 3.1 |
| A4, G2-G9 | 3.2 |
| B1-B5, B13 | 4.1 |
| B7, B11 | 4.2 |
| B8, B12, A9, A10 | 4.3 |
| B6, B9, B10, A11 | 4.4 |
| C1-C4, C7 | 5.1 |
| C5, C6, C8-C11 | 5.2 |
| D1-D4, D12 | 6.1 |
| D5, D6, D8 | 6.2 |
| D7, D9, D10, D11 | 6.3 |
| E1, E5, E6 | 7.1 |
| E2, E4, E7, E8 | 7.2 |
| E3 | 7.3 |
| F1, F3, F4, F5 | 8.1 |
| F6, F8 | 8.2 |
| F2, F7, F9 | 8.3 |
| F10 | 8.4, 9.1 |
| X1, X2, X3 | 10.1 |
| X4, X5, X6 | 10.2 |
| X7, X8, X14 | 10.3 |
| X9, X10, X11 | 10.4 |
| X12, X13 | 10.5 |
| K1, K2 | 11.1 |
| K3, K4 | 11.2 |
| K5, K6, K7 | 11.3 |
| K8, K9, K10 | 11.4 |
| K11, K12, K20 | 11.5 |
| K13, K14, K15 | 12.1 |
| K16-K19 | 12.2 |
| tout | 13.1 |
| G1 Python 3.10+, G10 tests, G11 ne jamais planter, G12 expliquer | partout (vérification au lancement, batteries cachées, quiz « explique ») |
| 🧩 C12 `@property`, E9 attributs de classe, G13 `__str__`, `else` de `try` | encadrés « Pour aller plus loin », jamais exigés |

## Mécaniques de visualisation

| Notion | Ce que tu vois | Source réelle |
|---|---|---|
| Variable simple | panneau sur la place, qui clignote quand la valeur change | variables globales à chaque ligne |
| Appel de fonction | un bloc s'empile sur la **tour de la pile d'appels**, avec ses arguments | événements d'appel/retour |
| Récursion | la tour monte jusqu'au cas de base puis redescend | idem |
| `input()` | le crieur pose la question, la réponse tapée s'affiche (entre guillemets : c'est un `str`) | entrée simulée |
| Liste | étagère : une case par élément, avec son index `[i]` | contenu sérialisé de la variable |
| Tuple | tablette de pierre (cases plates, immuables) | idem |
| Set | sac : pas d'index, pas de doublon | idem |
| Dict | armoire : chaque tiroir porte sa clé | idem |
| Exception levée | éclair + nom de l'exception, à l'endroit où elle part | événement `exception` du traceur |
| Propagation | « ⤴ remonte », la fonction traversée est marquée interrompue | idem |
| Exception attrapée | filet vert sur la ligne du `except` | reprise de l'exécution dans le cadre qui l'a reçue |
| Exception personnalisée | bloc de TNT créé à partir de son plan | instance d'une classe qui hérite de `BaseException` |
| Générateur | bloc turquoise « ⏸ générateur » dans la pile ; chaque `yield` fait jaillir sa valeur | événements de reprise / pause du générateur |
| Classes, objets, attributs, `super()`, statique, classe, imbriquée | voir actes précédents (plans, créatures, rayons, satellites) | interception des classes et des objets |
