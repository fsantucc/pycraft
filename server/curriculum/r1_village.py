"""Région 1 — Le Village des Bâtisseurs : structure d'un programme."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

L1 = Level(
    id="r1l1", region="r1", number="1.1", title="Premiers blocs",
    notions=["A1", "A5", "A8"],
    story="""Tu arrives au **Village des Bâtisseurs**. Sur la place, les panneaux sont vides et la forge est silencieuse.

Le chef du village t'explique : ici, rien ne bouge tant qu'un programme ne l'ordonne pas. Python lit tes instructions **une par une, de haut en bas**, et le village réagit à chacune.

Ton premier travail : comprendre comment Python retient une information.""",
    explanation="""Un **programme** est une suite d'instructions. Python les exécute **dans l'ordre**, de la première ligne à la dernière.

Une **variable** est un nom qui désigne une valeur. Dans le monde, chaque variable devient un **panneau** planté sur la place : `nom = valeur`.

- `village = "Pierrebrune"` crée le panneau `village` avec un texte (`str`).
- `habitants = 12` : un nombre entier (`int`).
- `ratio = 1.5` : un nombre à virgule (`float`).
- `ouvert = True` : un booléen (`bool`), vrai ou faux.

Réaffecter une variable **remplace** sa valeur : `habitants = habitants + 3` lit l'ancienne valeur, ajoute 3, puis range le résultat sous le même nom. Le panneau clignote quand sa valeur change.

`print(...)` affiche du texte. Une **f-string** `f"..."` insère des valeurs entre accolades : `f"{village} compte {habitants} habitants"`.""",
    demo={"main.py": '''village = "Pierrebrune"
habitants = 12
print(f"Bienvenue à {village} !")

habitants = habitants + 3
print(f"Nouveaux arrivants : il y a maintenant {habitants} habitants")

marche_ouvert = habitants > 10
print(f"Marché ouvert : {marche_ouvert}")
'''},
    demo_notes=[
        "Utilise « Pas suivant » : à chaque ligne, regarde quel panneau apparaît ou change.",
        "Ligne 5 : la valeur de `habitants` est lue AVANT d'être remplacée.",
        "Ligne 8 : `habitants > 10` est calculé, le résultat est un booléen.",
    ],
    experiments=[
        "Remplace 12 par 5 : que devient `marche_ouvert` ?",
        "Déplace la ligne 3 tout en haut du fichier. Quelle erreur obtiens-tu, et pourquoi ?",
        "Ajoute une variable `forgerons = 2` et affiche-la dans une f-string.",
    ],
    mission_title="Le registre de la forge",
    mission="""Le forgeron veut un panneau qui calcule ses besoins en charbon.

1. Crée ces variables : `forge_name` (texte), `iron_ingots` (entier), `coal_ratio` (nombre à virgule : charbon nécessaire par lingot) et `is_open` (booléen).
2. Calcule `coal_needed` à partir de `iron_ingots` et `coal_ratio`.
3. Affiche le nom de la forge et le charbon nécessaire avec des f-strings.
4. Une livraison arrive : augmente `iron_ingots` de 5 **en partant de sa propre valeur**, recalcule `coal_needed` et affiche le nouveau besoin.

Les valeurs sont libres. Le jeu vérifie la cohérence, pas des chiffres précis.""",
    starter={"main.py": '''# Le registre de la forge
# Écris ton programme ici.
'''},
    checks=[
        dynamic("types", "Les 4 variables existent avec le bon type", '''
expected = {"forge_name": str, "iron_ingots": int,
            "coal_ratio": float, "is_open": bool}
for name, kind in expected.items():
    if name not in ns:
        fail(f"La variable `{name}` n'existe pas.")
    if type(ns[name]) is not kind:
        fail(f"`{name}` devrait être de type {kind.__name__}, "
             f"elle est de type {type(ns[name]).__name__}.")
''', hint="Un nombre à virgule s'écrit avec un point : 0.5"),
        dynamic("coal", "`coal_needed` est cohérent avec les valeurs finales", '''
if "coal_needed" not in ns:
    fail("La variable `coal_needed` n'existe pas.")
want = ns["iron_ingots"] * ns["coal_ratio"]
if abs(ns["coal_needed"] - want) > 1e-6:
    fail(f"À la fin, coal_needed vaut {ns['coal_needed']} mais "
         f"iron_ingots × coal_ratio vaut {want}. As-tu recalculé "
         "après la livraison ?")
'''),
        static("update", "La livraison part de la valeur actuelle",
               "reassigns_from_itself", name="iron_ingots"),
        dynamic("print", "Le nom de la forge et le besoin sont affichés", '''
name = str(ns.get("forge_name", ""))
if not name or name not in program_output:
    fail("Le nom de la forge n'apparaît pas dans l'affichage.")
lines = [l for l in program_output.splitlines() if l.strip()]
if len(lines) < 2:
    fail("Affiche au moins deux lignes : avant et après la livraison.")
'''),
    ],
    hints=[
        "Relis la mission ligne par ligne : quelles valeurs doivent exister AVANT de pouvoir calculer `coal_needed` ?",
        "Pour augmenter une variable, il faut lire sa valeur actuelle et lui ajouter quelque chose. Où dans la démonstration une variable est-elle mise à jour ainsi ?",
        "Après la livraison, `coal_needed` ne change pas toute seule : une variable garde la valeur calculée au moment de l'affectation. Que faut-il refaire ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
coffres = 2
coffres = coffres * 3
coffres = coffres - 1
print(coffres)
''', "Chaque ligne lit l'ancienne valeur : 2, puis 6, puis 5."),
        predict("Que va afficher ce programme ?", '''
joueur = "Alex"
pommes = 3
pommes = pommes + 4
print(f"{joueur} a {pommes} pommes")
''', "La f-string remplace {joueur} et {pommes} par leurs valeurs au moment du print."),
        choice("Après `total = a + b`, on modifie `a`. Que devient `total` ?",
               ["Il est recalculé automatiquement",
                "Il garde l'ancienne valeur",
                "Il provoque une erreur"], 1,
               "Une affectation calcule une fois et range le résultat. `total` ne dépend plus de `a` ensuite."),
        explain("Explique avec tes mots, comme à un camarade de 42 : que fait Python quand il exécute `x = x + 1` ?",
                "Il lit la valeur actuelle de x, calcule x + 1, puis range ce résultat sous le nom x (l'ancienne valeur est remplacée)."),
    ],
    xp=100,
)

L2 = Level(
    id="r1l2", region="r1", number="1.2", title="Le portail d'entrée",
    notions=["A2", "A3", "A6", "A7", "A12"],
    story="""Au nord du village se dresse un **portail**. Les bâtisseurs y rangent leurs plans dans plusieurs fichiers, et chaque fichier peut en appeler un autre avec `import`.

Problème : quand un fichier est importé, **tout son code s'exécute**. Le vieux bâtisseur a importé un fichier d'outils et toute la démonstration s'est jouée en plein milieu de son chantier.

Il te faut une porte qui ne s'ouvre que quand c'est le bon moment.""",
    explanation="""Quand tu lances `python3 main.py`, `main.py` est le **point d'entrée** : c'est là que l'exécution commence.

Chaque fichier possède une variable spéciale, `__name__` :

- dans le fichier lancé directement, `__name__` vaut `"__main__"` ;
- dans un fichier **importé**, `__name__` vaut le nom du module (`"outils"` pour `outils.py`).

D'où le garde :

```
if __name__ == "__main__":
    main()
```

Le bloc ne s'exécute **que si le fichier est lancé directement**. Importé, il fournit ses fonctions sans rien lancer.

Une **fonction** (`def`) est une recette rangée sous un nom. La définir ne l'exécute pas : il faut l'**appeler** avec des parenthèses. On regroupe souvent le programme principal dans une fonction `main()`.

`import outils` charge `outils.py` (un fichier = un module) et donne accès à `outils.une_fonction(...)`. C'est la **modularité** : chaque fichier a un rôle.""",
    demo={
        "main.py": '''import outils

print(f"main.py : __name__ vaut {__name__!r}")


def main() -> None:
    hauteur = outils.hauteur_tour(4)
    print(f"Tour de 4 étages : {hauteur} blocs de haut")


if __name__ == "__main__":
    main()
''',
        "outils.py": '''print(f"outils.py est chargé : __name__ vaut {__name__!r}")


def hauteur_tour(etages: int) -> int:
    return etages * 3


if __name__ == "__main__":
    print("Ce test ne s'affiche que si on lance outils.py directement")
''',
    },
    demo_notes=[
        "Regarde l'ordre des étapes : `import outils` saute dans outils.py et l'exécute en entier avant de revenir.",
        "Dans outils.py, `__name__` vaut 'outils' : le bloc du garde est sauté.",
        "`def main()` ne fait rien tout de suite : la fonction n'est exécutée qu'à la dernière ligne.",
    ],
    experiments=[
        "Dans outils.py, retire le `if __name__ ...` et dé-indente le print. Que se passe-t-il au moment de l'import ?",
        "Change le fichier lancé : clique sur l'onglet outils.py puis « Exécuter ce fichier ». Que vaut `__name__` ?",
        "Supprime l'appel `main()` en bas de main.py. Qu'est-ce qui s'affiche encore ?",
    ],
    mission_title="Le chantier sans accident",
    mission="""Deux fichiers :

**construction.py** doit fournir une fonction `wall_blocks(length: int, height: int) -> int` qui renvoie le nombre de blocs d'un mur plein. Ajoute en bas un petit test qui affiche un exemple, **mais seulement quand on lance construction.py directement**.

**main.py** importe `construction`, contient une fonction `main()` qui calcule et affiche le nombre de blocs pour les 4 murs d'une maison de ton choix, et n'appelle `main()` que s'il est le point d'entrée.

Le jeu va **réimporter** construction.py en cachette : rien ne doit s'afficher à ce moment-là.""",
    starter={
        "main.py": '''# Point d'entrée du chantier
''',
        "construction.py": '''# Outils de construction
''',
    },
    checks=[
        dynamic("func", "`construction.wall_blocks` calcule correctement", '''
mod = ns.get("construction")
if mod is None:
    fail("main.py n'importe pas `construction`.")
func = getattr(mod, "wall_blocks", None)
if not callable(func):
    fail("construction.py ne définit pas la fonction `wall_blocks`.")
for _ in range(5):
    a, b = rng.randint(1, 40), rng.randint(1, 40)
    got = func(a, b)
    if got != a * b:
        fail(f"wall_blocks({a}, {b}) renvoie {got!r}, attendu {a * b}. "
             "La fonction doit RENVOYER le nombre (return), pas seulement l'afficher.")
''', locate="wall_blocks"),
        dynamic("silent", "Importer construction n'affiche rien", '''
mod = ns.get("construction")
if mod is None:
    fail("main.py n'importe pas `construction`.")
printed = reload_module(mod)
if printed.strip():
    fail("En réimportant construction.py, ceci s'est affiché : "
         f"{printed.strip()[:80]!r}. Ce code devrait être protégé.")
'''),
        static("guard_c", "construction.py a son garde `__main__`",
               "main_guard", file="construction.py"),
        dynamic("main", "main.py contient une fonction `main()`", '''
if not callable(ns.get("main")):
    fail("Aucune fonction `main` dans main.py.")
'''),
        static("guard_m", "main.py n'appelle main() que comme point d'entrée",
               "main_guard"),
        static("side", "main.py n'exécute rien en dehors de main() au chargement",
               "no_import_side_effects"),
        dynamic("output", "Le programme affiche un résultat", '''
if not program_output.strip():
    fail("Rien ne s'affiche quand on lance main.py.")
'''),
    ],
    hints=[
        "Dans quel fichier le test doit-il être protégé ? Que vaut `__name__` dans ce fichier quand main.py l'importe ?",
        "Une fonction qui « renvoie » un nombre utilise `return`. Quelle est la différence entre afficher un nombre et le renvoyer ?",
        "Tout ce qui est écrit au niveau 0 d'indentation s'exécute au chargement du fichier. Qu'est-ce qui, dans tes fichiers, est au niveau 0 et n'est ni un import, ni un `def`, ni le garde ?",
    ],
    quiz=[
        choice("`armes.py` contient `print(__name__)` tout en haut. `main.py` fait `import armes`. On lance `python3 main.py`. Qu'affiche ce print ?",
               ["__main__", "armes", "main", "Rien du tout"], 1,
               "Dans un module importé, `__name__` vaut le nom du module."),
        predict("Que va afficher ce programme (un seul fichier, lancé directement) ?", '''
def saluer() -> None:
    print("bonjour")


print("début")
if __name__ == "__main__":
    saluer()
print("fin")
''', "La définition n'affiche rien ; l'appel a lieu dans le garde, qui est vrai car le fichier est lancé directement."),
        choice("Pourquoi protéger les tests d'un module avec le garde `__main__` ?",
               ["Pour que Python aille plus vite",
                "Pour que les importer ne déclenche pas les tests",
                "Parce que c'est obligatoire pour définir des fonctions",
                "Pour cacher le code aux autres fichiers"], 1,
               "Le module reste réutilisable : on peut l'importer sans exécuter sa démonstration."),
        explain("Explique à voix haute à un évaluateur pourquoi `if __name__ == \"__main__\":` est important, et quel lien il a avec les imports.",
                "Un import exécute tout le fichier importé. Le garde ne s'exécute que si le fichier est le point d'entrée, donc le code de démonstration ou de test ne s'exécute pas lors d'un import."),
    ],
    xp=120,
)

L3 = Level(
    id="r1l3", region="r1", number="1.3", title="Boss : le Creeper du désordre",
    boss=True, notions=["A4", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9"],
    story="""Un **Creeper** a soufflé l'atelier des plans : le script qui compte les blocs du village fonctionne encore, mais il est méconnaissable. Noms en désordre, aucune annotation, pas de point d'entrée, et impossible de le lancer comme un vrai outil.

Les inspecteurs (on les appelle **flake8** et **mypy**) refusent de l'approuver. Répare-le **sans changer ce qu'il affiche**.""",
    explanation="""**Shebang** : la toute première ligne `#!/usr/bin/env python3` dit au système quel interpréteur utiliser. Avec `chmod +x script.py`, on peut alors lancer `./script.py` directement. `env` cherche `python3` dans le PATH, ce qui rend le script portable.

**Conventions de nommage** (PEP 8) :

- classes en `PascalCase` : `TreasureChest`
- fonctions, variables, paramètres en `snake_case` : `count_blocks`, `grand_total`
- constantes en `MAJUSCULES`

**Type hints** : on annote les paramètres et le retour : `def count_blocks(width: int, height: int) -> int:`. Python ne les vérifie **pas** à l'exécution ; c'est **mypy** qui les contrôle sans lancer le programme. Une fonction qui ne renvoie rien est annotée `-> None`.

**flake8** vérifie le style : lignes de 79 caractères maximum, 2 lignes vides avant chaque `def`/`class` de premier niveau, pas d'espaces en fin de ligne…

Le bouton **Analyse qualité** de l'éditeur fait une revue intégrée et lance les vrais flake8 et mypy s'ils sont installés.""",
    demo={"main.py": '''#!/usr/bin/env python3


def door_count(houses: int, doors_per_house: int) -> int:
    return houses * doors_per_house


def announce(label: str, amount: int) -> None:
    print(f"{label} : {amount}")


def main() -> None:
    announce("Portes à fabriquer", door_count(6, 2))


if __name__ == "__main__":
    main()
'''},
    demo_notes=[
        "Clique sur « Analyse qualité » : aucun problème signalé.",
        "Retire `-> int` à la ligne 4 et relance l'analyse.",
        "Le programme s'exécute pareil avec ou sans annotations : elles servent aux outils et aux lecteurs.",
    ],
    experiments=[
        "Renomme `door_count` en `DoorCount` et lance l'analyse qualité.",
        "Appelle `door_count(\"6\", 2)` : Python l'exécute-t-il ? Que dirait mypy ?",
    ],
    mission_title="Désamorcer le script",
    mission="""Le script de départ fonctionne. Répare-le pour que :

- la première ligne soit un shebang qui lance `python3` ;
- tous les noms respectent les conventions (snake_case) ;
- toutes les fonctions aient des annotations de type complètes ;
- le calcul principal soit dans une fonction `main()` lancée par le garde `__main__` ;
- **l'affichage reste exactement le même** qu'avant ta réparation.

Lance d'abord le script tel quel pour noter ce qu'il affiche.""",
    starter={"main.py": '''def CountBlocks(W,H,D):
    return W*H*D

def describeHouse(Name, W, H, D):
    Total = CountBlocks(W, H, D)
    print(f"{Name} : {Total} blocs")
    return Total

GrandTotal = 0
GrandTotal = GrandTotal + describeHouse("Cabane", 4, 3, 4)
GrandTotal = GrandTotal + describeHouse("Tour", 3, 9, 3)
print(f"Total du village : {GrandTotal} blocs")
'''},
    checks=[
        dynamic("same", "L'affichage est identique à l'original", '''
want = "Cabane : 48 blocs\\nTour : 81 blocs\\nTotal du village : 129 blocs"
if program_output.strip() != want:
    fail("L'affichage a changé. Attendu :\\n" + want +
         "\\nObtenu :\\n" + program_output.strip())
'''),
        static("shebang", "Shebang en première ligne", "shebang"),
        static("naming", "Noms en snake_case / PascalCase", "naming"),
        static("typed", "Toutes les fonctions sont annotées", "typed"),
        dynamic("main", "Une fonction `main()` existe", '''
if not callable(ns.get("main")):
    fail("Aucune fonction `main`.")
'''),
        static("guard", "Garde `__main__`", "main_guard"),
        static("side", "Rien ne s'exécute à l'import hors du garde",
               "no_import_side_effects"),
    ],
    hints=[
        "Commence par exécuter le script d'origine et copie son affichage quelque part : c'est ta référence.",
        "Pour chaque nom, demande-toi : est-ce une classe, une fonction, une variable, un paramètre ? Quelle convention s'applique ?",
        "Une fonction qui fait un print et renvoie un total a deux rôles. Quel type annote son retour ? Et celui de `main()` qui ne renvoie rien ?",
    ],
    quiz=[
        predict("Les annotations de type empêchent-elles ce code de tourner ? Que va-t-il afficher ?", '''
def double(value: int) -> int:
    return value * 2


print(double("ab"))
''', "Python n'applique pas les annotations à l'exécution : \"ab\" * 2 vaut \"abab\". C'est mypy qui signalerait l'erreur."),
        choice("À quoi sert `#!/usr/bin/env python3` ?",
               ["À importer les modules de base",
                "À indiquer au système avec quel programme exécuter le fichier",
                "À activer les annotations de type",
                "C'est un commentaire décoratif"], 1,
               "Avec le fichier exécutable (chmod +x), `./script.py` lance python3 trouvé via env."),
        choice("Lequel respecte les conventions ?",
               ["class iron_golem:", "def SpawnMob(self):",
                "max_height = 256", "def get-health():"], 2,
               "Variable en snake_case : oui. Classe → PascalCase, méthode → snake_case, et le tiret est interdit dans un nom."),
        explain("Un évaluateur te demande d'ajouter le shebang en direct : que tapes-tu, où, et quelle commande permet ensuite de lancer `./main.py` ?",
                "#!/usr/bin/env python3 en toute première ligne, puis chmod +x main.py."),
    ],
    xp=200,
    bonus="Bonus : passe l'Analyse qualité sans aucun avertissement.",
)

REGION = Region(
    id="r1", name="Le Portail des Bâtisseurs",
    subtitle="Point d'entrée, modules, shebang, conventions", theme="village",
    reward="Plan de bâtisseur — débloque l'Atelier des Créateurs",
    levels=[L2, L3], act=2, icon="📜",
)
