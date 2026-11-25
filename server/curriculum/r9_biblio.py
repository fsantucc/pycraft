"""Acte IV — Le Royaume des Données (sujet python03) : collections,
générateurs, compréhensions ; puis la grande finale."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

C1 = Level(
    id="k1l1", region="k1", number="", title="Les ordres du chat",
    notions=["K1", "K2", "A7"],
    story="""Bienvenue dans la **Grande Bibliothèque**, où les données sont rangées dans des étagères d'un nouveau genre : les **collections**.

Première étagère : le chat du serveur. Les joueurs y tapent des commandes comme `/tp 10 64 -3`. Ton programme les reçoit… sous forme de **liste**.""",
    explanation="""Quand on lance `python3 main.py /tp 10 64 -3`, les mots tapés après le nom du script arrivent dans **`sys.argv`** (il faut `import sys`) :

```
sys.argv == ["main.py", "/tp", "10", "64", "-3"]
```

`sys.argv` est une **liste** : une suite **ordonnée** d'éléments.

- `len(liste)` : nombre d'éléments (ici 5) ;
- `liste[0]` : le premier (l'index commence à **0**), `liste[-1]` : le dernier ;
- `liste[1:]` : une **tranche** (slice) de l'index 1 jusqu'à la fin ; `liste[1:3]` : index 1 et 2 ;
- `for element in liste:` parcourt les éléments ; `enumerate(liste, 1)` donne aussi leur numéro.
- `" ".join(liste)` colle des chaînes avec un espace.

Les éléments de `sys.argv` sont **toujours des chaînes**. Dans PyCraft, règle les arguments dans **Arguments du programme** sous l'éditeur. Dans le monde, chaque liste devient une **étagère** dont chaque case montre un élément et son index.""",
    demo={"main.py": '''import sys

print("Liste complète :", sys.argv)
print("Nombre d'éléments :", len(sys.argv))
arguments = sys.argv[1:]
print("Sans le nom du script :", arguments)
for numero, mot in enumerate(arguments, 1):
    print(numero, "→", mot)
if arguments:
    print("Dernier :", arguments[-1])
'''},
    demo_argv=["bonjour", "le", "monde"],
    demo_notes=["La liste `arguments` apparaît comme une étagère : chaque case a son index."],
    experiments=[],
    mission_title="L'interpréteur de commandes",
    mission="""Écris `main.py` (avec `import sys` et un garde `__main__`) :

- sans argument : affiche `Aucune commande. Usage : python3 main.py /commande arguments...` et rien d'autre ;
- sinon, affiche `Commande : nom` (le premier argument **sans** le `/`), `Arguments : N` (nombre d'arguments après la commande), puis chaque argument sur une ligne `  [i] valeur` (i à partir de 1) ;
- puis selon la commande :
  - `/say` : affiche `<Steve> ` suivi de tous les arguments séparés par des espaces ;
  - `/tp` : avec exactement 3 arguments, `Téléportation vers x y z` ; sinon `Usage : /tp x y z` ;
  - autre : `Commande inconnue`.""",
    starter={"main.py": "import sys\n"},
    argv=["/tp", "10", "64", "-3"],
    checks=[
        dynamic("empty", "Sans argument : message d'usage", '''
out = rerun([])
if out.strip() != "Aucune commande. Usage : python3 main.py /commande arguments...":
    fail(f"Sans argument, obtenu :\\n{out}")
'''),
        dynamic("list", "La commande et ses arguments sont listés", '''
for argv in (["/tp", "10", "64", "-3"], ["/say"], ["/give", "Alex", "diamant", "3", "x"]):
    out = rerun(argv)
    lines = [l.rstrip() for l in out.splitlines()]
    if f"Commande : {argv[0][1:]}" not in lines or f"Arguments : {len(argv) - 1}" not in lines:
        fail(f"Avec {argv} : il manque « Commande : ... » ou « Arguments : ... ».\\n{out}")
    for i, a in enumerate(argv[1:], 1):
        if f"  [{i}] {a}" not in lines:
            fail(f"Avec {argv} : il manque la ligne «  [{i}] {a} ».\\n{out}")
'''),
        dynamic("say", "/say et /tp fonctionnent", '''
out = rerun(["/say", "Salut", "les", "mineurs"])
if "<Steve> Salut les mineurs" not in out:
    fail(f"/say Salut les mineurs → obtenu :\\n{out}")
out = rerun(["/tp", "1", "2", "3"])
if "Téléportation vers 1 2 3" not in out:
    fail(f"/tp 1 2 3 → obtenu :\\n{out}")
out = rerun(["/tp", "1", "2"])
if "Usage : /tp x y z" not in out or "Téléportation" in out:
    fail("/tp avec 2 arguments doit afficher l'usage.")
out = rerun(["/danse"])
if "Commande inconnue" not in out:
    fail("Une commande inconnue doit afficher « Commande inconnue ».")
'''),
        static("guard", "Garde `__main__`", "main_guard"),
    ],
    hints=[
        "Le premier argument utile n'est pas sys.argv[0] : pourquoi ?",
        "Une tranche te donne directement la liste des arguments après la commande.",
        "Pour retirer le `/`, une tranche fonctionne aussi sur les chaînes.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
blocs = ["terre", "pierre", "sable", "bois"]
print(blocs[0], blocs[-1])
print(blocs[1:3])
print(len(blocs))
''', "Index 0 = premier, -1 = dernier ; la tranche 1:3 exclut l'index 3."),
        choice("On lance `python3 main.py a b`. Que vaut `len(sys.argv)` ?",
               ["2", "3", "1", "0"], 1, "Le nom du script est l'élément 0."),
    ],
    xp=130,
)

C2 = Level(
    id="k1l2", region="k1", number="", title="Le tableau des records",
    notions=["K2", "K3", "K4", "X1"],
    story="""Les speedrunners de la bibliothèque enregistrent leurs temps (en secondes) pour vaincre le dragon. Les données sont saisies à la main : il y a des fautes de frappe.

Il faut une liste **propre** et un **podium**.""",
    explanation="""Une liste se construit et se modifie :

- `temps = []` crée une liste vide ; `temps.append(312)` ajoute à la fin ;
- `temps.remove(x)`, `temps.pop()` retirent ; `x in temps` teste la présence ;
- `sorted(temps)` renvoie une **nouvelle** liste triée ; `temps.sort()` trie la liste **elle-même** ;
- `sum(temps)`, `min(temps)`, `max(temps)`, `len(temps)` résument la liste ;
- les tranches marchent sur le résultat : `sorted(temps)[:3]` = les trois plus petits.

Une liste est **mutable** : `append` modifie l'objet en place (tous les noms qui la désignent voient le changement).

Combiné avec `try` / `except`, on peut construire une liste **propre** à partir de données douteuses : on n'ajoute que ce qui se convertit.""",
    demo={"main.py": '''bruts = ["40", "12", "x", "25"]
propres = []
for texte in bruts:
    try:
        propres.append(int(texte))
    except ValueError:
        print("ignoré :", texte)
print(propres, "→ trié :", sorted(propres))
print("min", min(propres), "max", max(propres), "somme", sum(propres))
'''},
    demo_notes=["Regarde l'étagère `propres` se remplir case par case."],
    experiments=[],
    mission_title="Le podium du dragon",
    mission="""`main.py` reçoit des temps en secondes dans `sys.argv` :

- chaque argument non entier affiche `Temps ignoré : 'x'` ; les entiers vont dans une liste ;
- s'il ne reste aucun temps : `Aucun temps valide.` et c'est tout ;
- sinon affiche, dans cet ordre : `Temps : [...]` (la liste dans l'ordre reçu), `Meilleur : m s`, `Pire : M s`, `Moyenne : X s` (arrondie à 1 décimale), `Podium : [a, b, c]` (les 3 meilleurs temps triés, ou moins s'il y en a moins), `Écart : E s` (pire − meilleur).""",
    starter={"main.py": "import sys\n"},
    argv=["312", "289", "abc", "455", "301"],
    checks=[
        dynamic("stats", "Les statistiques sont justes", '''
for _ in range(4):
    nums = [rng.randint(100, 900) for _ in range(rng.randint(1, 7))]
    argv = [str(n) for n in nums]
    out = rerun(argv)
    want = [f"Temps : {nums}", f"Meilleur : {min(nums)} s", f"Pire : {max(nums)} s",
            f"Moyenne : {round(sum(nums) / len(nums), 1)} s",
            f"Podium : {sorted(nums)[:3]}", f"Écart : {max(nums) - min(nums)} s"]
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    if lines != want:
        fail(f"Avec {argv} :\\nattendu\\n" + "\\n".join(want) + f"\\nobtenu\\n{out}")
'''),
        dynamic("bad", "Les mauvaises saisies sont ignorées", '''
out = rerun(["12", "x", "3.5", "7"])
lines = [l.strip() for l in out.splitlines() if l.strip()]
if "Temps ignoré : 'x'" not in lines or "Temps ignoré : '3.5'" not in lines:
    fail(f"« x » et « 3.5 » doivent être ignorés.\\n{out}")
if "Temps : [12, 7]" not in lines:
    fail("La liste doit contenir [12, 7].")
out = rerun(["a", "b"])
lines = [l.strip() for l in out.splitlines() if l.strip()]
if lines != ["Temps ignoré : 'a'", "Temps ignoré : 'b'", "Aucun temps valide."]:
    fail(f"Sans temps valide, obtenu :\\n{out}")
if rerun([]).strip() != "Aucun temps valide.":
    fail("Sans argument : « Aucun temps valide. »")
'''),
        static("try", "La conversion est protégée par try", "has_node",
               node="Try"),
        static("guard", "Garde `__main__`", "main_guard"),
    ],
    hints=[
        "Commence par une liste vide et ne fais `append` que si la conversion réussit.",
        "Le podium : trie une copie, puis prends une tranche. Que donne une tranche [:3] sur une liste de 2 éléments ?",
        "La moyenne : quelles fonctions intégrées te donnent la somme et le nombre ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
a = [3, 1, 2]
b = a
b.append(9)
c = sorted(a)
print(a)
print(c)
''', "b et a désignent la même liste ; sorted crée une nouvelle liste."),
        predict("Que va afficher ce programme ?", '''
scores = [50, 20, 80]
scores.sort()
print(scores[-1], scores[:2])
''', "sort() trie la liste en place."),
        choice("Quelle différence entre `liste.sort()` et `sorted(liste)` ?",
               ["Aucune", "sort() modifie la liste et renvoie None ; sorted() renvoie une nouvelle liste",
                "sorted() est plus lent", "sort() marche sur les chaînes seulement"], 1,
               "Une méthode qui modifie en place renvoie None en Python."),
    ],
    xp=140,
)

C3 = Level(
    id="k1l3", region="k1", number="", title="Les coordonnées gravées",
    notions=["K5", "K6", "K7", "X1"],
    story="""Les cartographes **gravent** les coordonnées des portails dans la pierre : une fois écrites, elles ne changent plus. Et chaque bloc parcouru dans le Nether vaut **8 blocs** dans le monde normal.""",
    explanation="""Un **tuple** est une suite ordonnée **immuable** : `pos = (10.0, 64.0, -3.0)`.

- on lit comme une liste : `pos[0]`, `len(pos)` ;
- on ne peut **pas** le modifier : `pos[0] = 5` lève `TypeError` ;
- on peut le **déballer** : `x, y, z = pos` ;
- une fonction peut renvoyer plusieurs valeurs sous forme de tuple : `return (x, y, z)`.

Immuable = fiable : une coordonnée gravée ne bougera pas par erreur.

Pour lire `"10, 64, -3"` : `texte.split(",")` donne une liste de morceaux, `float(morceau)` convertit (les espaces autour sont acceptés). La **boucle de réessai** redemande tant que la saisie est invalide :

```
while True:
    try:
        ...
        return resultat
    except ValueError as e:
        print("Invalide :", e)
```

`import math` puis `math.sqrt(x)` calcule la racine carrée. Distance 3D : `math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)`.

Dans le monde, un tuple apparaît comme une **tablette de pierre** : on voit qu'il ne change pas.""",
    demo={"main.py": '''import math

pos = (3.0, 4.0, 12.0)
x, y, z = pos
print("x =", x, "| y =", y, "| z =", z)
print("Distance au centre :", math.sqrt(x ** 2 + y ** 2 + z ** 2))
try:
    pos[0] = 99.0
except TypeError as e:
    print("Impossible :", e)
'''},
    demo_notes=["Le tuple est une tablette de pierre : rien ne peut changer ses cases."],
    experiments=[],
    mission_title="Le compas du Nether",
    mission="""Dans `main.py` :

- **`lire_position(question: str) -> tuple[float, float, float]`** pose la question avec `input` **jusqu'à** obtenir 3 nombres séparés par des virgules. Si le nombre de morceaux n'est pas 3 : affiche `Format attendu : x,y,z`. Si un morceau ne se convertit pas : affiche `Valeur invalide : <message>`. Renvoie un tuple de 3 floats.
- **`vers_nether(pos: tuple[float, float, float]) -> tuple[float, float, float]`** renvoie (x / 8, y, z / 8) arrondis à 2 décimales.
- **`distance(a, b) -> float`** : distance 3D arrondie à 2 décimales (utilise `math.sqrt`).
- Programme principal : demande `Portail (Overworld) : `, affiche `Position : (x, y, z)` (le tuple), puis `x = ..., y = ..., z = ...` (déballage), puis `Dans le Nether : (...)`. Demande ensuite `Joueur : ` et affiche `Distance au portail : D`.""",
    starter={"main.py": "import math\n"},
    stdin=["800, 70, -160", "oups", "4,5", "10,a,3", "803,74,-148"],
    checks=[
        dynamic("read", "`lire_position` réessaie jusqu'à une saisie valide", '''
f = ns.get("lire_position")
if not callable(f):
    fail("`lire_position` est introuvable.")
got, out = with_input(f, ["bonjour", "1,2", "4,abc,5", " 1.5 , 2, -3 "], "Pos : ")
if got != (1.5, 2.0, -3.0) or not isinstance(got, tuple):
    fail(f"Doit renvoyer le tuple (1.5, 2.0, -3.0), obtenu {got!r}.")
if out.count("Format attendu : x,y,z") != 2:
    fail("« Format attendu : x,y,z » doit s'afficher pour 'bonjour' et '1,2'.")
if "Valeur invalide : could not convert string to float: 'abc'" not in out:
    fail(f"Pour '4,abc,5' : « Valeur invalide : <message> ».\\n{out}")
''', locate="lire_position"),
        dynamic("nether", "`vers_nether` et `distance`", '''
vn, d = ns.get("vers_nether"), ns.get("distance")
if not callable(vn) or not callable(d):
    fail("`vers_nether` ou `distance` est introuvable.")
for _ in range(5):
    p = (float(rng.randint(-900, 900)), float(rng.randint(5, 120)), float(rng.randint(-900, 900)))
    want = (round(p[0] / 8, 2), p[1], round(p[2] / 8, 2))
    if vn(p) != want or not isinstance(vn(p), tuple):
        fail(f"vers_nether({p}) doit renvoyer le tuple {want}.")
a, b = (1.0, 2.0, 3.0), (4.0, 6.0, 15.0)
if d(a, b) != 13.0:
    fail(f"distance({a}, {b}) doit valoir 13.0.")
if d((0.0, 0.0, 0.0), (1.0, 1.0, 1.0)) != 1.73:
    fail("La distance doit être arrondie à 2 décimales.")
'''),
        dynamic("main", "Le programme principal", '''
out = rerun(inputs=["16,64,-32", "19, 68, -20"])
for line in ("Position : (16.0, 64.0, -32.0)", "x = 16.0, y = 64.0, z = -32.0",
             "Dans le Nether : (2.0, 64.0, -4.0)", "Distance au portail : 13.0"):
    if line not in out:
        fail(f"Il manque « {line} ».\\n{out}")
'''),
        static("sqrt", "Utilise math.sqrt", "has_node", node="Attribute",
               name="distance"),
        static("typed", "Fonctions annotées", "typed"),
        static("guard", "Garde `__main__`", "main_guard"),
    ],
    hints=[
        "Une boucle `while True:` avec un `return` dans le try : quand sort-on de la boucle ?",
        "Après le split, vérifie d'abord le nombre de morceaux, puis convertis : deux erreurs différentes, deux messages différents.",
        "Pour construire le tuple final, tu peux convertir chaque morceau puis écrire `(a, b, c)`.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
pos = (1, 2, 3)
x, y, z = pos
x = 10
print(pos, x)
''', "Déballer copie les valeurs dans x, y, z : le tuple ne change pas."),
        predict("Que va afficher ce programme ?", '''
t = (5,)
u = (5)
print(type(t).__name__, type(u).__name__)
''', "C'est la virgule qui fait le tuple, pas les parenthèses."),
        choice("Pourquoi stocker des coordonnées dans un tuple plutôt qu'une liste ?",
               ["C'est obligatoire", "Elles ne doivent pas changer : l'immuabilité protège contre une modification accidentelle",
                "Les tuples sont plus longs", "Pour pouvoir les trier"], 1,
               "Un tuple dit « ces valeurs forment un tout fixe »."),
    ],
    xp=160,
)

C4 = Level(
    id="k1l4", region="k1", number="", title="Les biomes partagés",
    notions=["K8", "K9", "K10"],
    story="""Trois explorateurs reviennent avec leurs carnets. Ils ont visité les mêmes biomes plusieurs fois, sous des orthographes différentes. Le cartographe veut savoir **quels biomes** ont été vus, par **qui**, et ce qui reste **à explorer**.""",
    explanation="""Un **ensemble** (`set`) est une collection **sans doublons** et **sans ordre** :

```
vus = {"forêt", "désert", "forêt"}   # → {"forêt", "désert"}
vide = set()                          # {} serait un dictionnaire vide !
```

- `set(liste)` supprime les doublons d'une liste ; `s.add(x)`, `s.discard(x)` ;
- `x in s` est très rapide ;
- opérations : `a | b` ou `a.union(b)` (dans l'un **ou** l'autre), `a & b` ou `a.intersection(b)` (dans **les deux**), `a - b` ou `a.difference(b)` (dans a **mais pas** b).

Un set n'a pas d'ordre : pour un affichage stable, on le trie (`sorted(s)` renvoie une liste).

`import random` : `random.choice(liste)`, `random.randint(a, b)`, `random.sample(liste, k)` (k éléments distincts).

Dans le monde, un set apparaît comme un **sac** où chaque valeur n'existe qu'une fois.""",
    demo={"main.py": '''alex = {"forêt", "plaine", "désert"}
noor = {"plaine", "jungle", "forêt"}
print("Union :", sorted(alex | noor))
print("Communs :", sorted(alex & noor))
print("Seulement Alex :", sorted(alex - noor))
doublons = ["mer", "mer", "mer", "toundra"]
print("Sans doublons :", sorted(set(doublons)))
print("Ensemble vide :", set())
'''},
    demo_notes=["Les sacs n'ont pas de numéros de case : un set n'a pas d'ordre."],
    experiments=[],
    mission_title="La carte des explorateurs",
    mission="""Le code de départ fournit `TOUS_LES_BIOMES` (liste de 12 biomes). Écris :

- **`biomes_visites(carnet: list[str]) -> set[str]`** : l'ensemble des biomes du carnet, nettoyés (`strip()` et minuscules), sans doublons ;
- **`rapport(alex: set[str], noor: set[str], kim: set[str]) -> None`** qui affiche, avec des listes **triées** :
  - `Découverts par l'équipe : N` (nombre de biomes vus par au moins un explorateur),
  - `Communs aux trois : [...]`,
  - `Seulement Alex : [...]` (vus par Alex et par personne d'autre),
  - `Jamais visités : [...]` (biomes de `TOUS_LES_BIOMES` vus par personne) ;
- **`expedition_aleatoire(nombre: int) -> set[str]`** : un ensemble de `nombre` biomes distincts tirés au hasard dans `TOUS_LES_BIOMES`.""",
    starter={"main.py": '''import random

TOUS_LES_BIOMES = ["forêt", "plaine", "désert", "jungle", "toundra", "savane",
                   "marais", "océan", "montagne", "taïga", "badlands",
                   "champignon"]


def main() -> None:
    alex = biomes_visites(["Forêt ", "plaine", "désert", "PLAINE", "jungle"])
    noor = biomes_visites(["plaine", "océan", " Jungle", "forêt"])
    kim = expedition_aleatoire(4) | {"plaine", "jungle"}
    rapport(alex, noor, kim)


if __name__ == "__main__":
    main()
'''},
    checks=[
        dynamic("clean", "`biomes_visites` nettoie et déduplique", '''
f = ns.get("biomes_visites")
if not callable(f):
    fail("`biomes_visites` est introuvable.")
got = f([" Forêt", "forêt", "PLAINE ", "plaine", "Désert"])
if got != {"forêt", "plaine", "désert"} or not isinstance(got, set):
    fail(f"Attendu le set {{'forêt', 'plaine', 'désert'}}, obtenu {got!r}.")
if f([]) != set():
    fail("Un carnet vide donne un ensemble vide.")
'''),
        dynamic("report", "Le rapport est juste", '''
f = ns["rapport"]
allb = ns.get("TOUS_LES_BIOMES")
for _ in range(4):
    a, n, k = (set(rng.sample(allb, rng.randint(0, 6))) for _ in range(3))
    _, out = capture(f, a, n, k)
    want = [f"Découverts par l'équipe : {len(a | n | k)}",
            f"Communs aux trois : {sorted(a & n & k)}",
            f"Seulement Alex : {sorted(a - n - k)}",
            f"Jamais visités : {sorted(set(allb) - (a | n | k))}"]
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    if lines != want:
        fail("Pour a={0}, n={1}, k={2}\\nattendu :\\n".format(sorted(a), sorted(n), sorted(k))
             + "\\n".join(want) + f"\\nobtenu :\\n{out}")
''', locate="rapport"),
        dynamic("random", "`expedition_aleatoire` tire des biomes distincts", '''
f = ns["expedition_aleatoire"]
allb = ns["TOUS_LES_BIOMES"]
for k in (0, 3, 12):
    s = f(k)
    if not isinstance(s, set) or len(s) != k or not s <= set(allb):
        fail(f"expedition_aleatoire({k}) doit renvoyer un set de {k} biomes existants.")
seen = set()
for _ in range(20):
    seen |= f(2)
if len(seen) < 5:
    fail("Le tirage ne semble pas aléatoire.")
'''),
        static("typed", "Fonctions annotées", "typed"),
    ],
    hints=[
        "Nettoie chaque entrée du carnet, puis laisse le set faire disparaître les doublons.",
        "« Seulement Alex » : Alex moins Noor moins Kim. Quelle opération de set ?",
        "« Jamais visités » part de TOUS_LES_BIOMES : il faut d'abord le transformer en set.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
a = {1, 2, 3}
b = {2, 3, 4}
print(sorted(a | b), sorted(a & b), sorted(a - b))
''', "Union, intersection, différence."),
        predict("Que va afficher ce programme ?", '''
print(len({"x", "x", "y"}), type({}).__name__, set())
''', "Les doublons disparaissent ; {} est un dict ; un set vide s'affiche set()."),
        choice("Pourquoi Python affiche-t-il un ensemble vide `set()` et non `{}` ?",
               ["Par habitude", "Parce que {} désigne un dictionnaire vide",
                "Parce qu'un set vide n'existe pas", "C'est un bug"], 1,
               "Les accolades vides sont réservées au dictionnaire."),
    ],
    xp=150,
)

C5 = Level(
    id="k1l5", region="k1", number="", title="Le livre des recettes",
    notions=["K11", "K12", "K20"],
    story="""Au cœur de la bibliothèque repose le **Livre des recettes**. Chaque recette associe des ingrédients à des quantités. Chaque inventaire associe des objets à des nombres. Pour fabriquer, il faut **comparer** les deux.""",
    explanation="""Un **dictionnaire** associe des **clés** à des **valeurs** :

```
inventaire = {"planche": 6, "bâton": 2}
inventaire["planche"]          # 6
inventaire["fer"] = 3          # ajoute ou remplace
"fer" in inventaire            # True (teste les clés)
inventaire.get("or", 0)        # 0 si la clé est absente (pas de KeyError)
del inventaire["bâton"]        # supprime
```

- `d.keys()`, `d.values()`, `d.items()` : les clés, les valeurs, les paires `(clé, valeur)` ;
- `for nom, qte in d.items():` parcourt les paires ;
- `d.update(autre)` fusionne un autre dictionnaire ;
- un dict garde l'**ordre d'insertion**.

Bien choisir sa structure : **liste** pour une suite ordonnée, **tuple** pour un tout fixe, **set** pour l'unicité, **dict** pour retrouver une valeur par son nom.

Dans le monde, un dict apparaît comme une **armoire à tiroirs étiquetés**.""",
    demo={"main.py": '''recette = {"planche": 3, "bâton": 2}
inventaire = {"planche": 5, "bâton": 1, "fer": 4}
for ingredient, besoin in recette.items():
    stock = inventaire.get(ingredient, 0)
    print(ingredient, ": besoin", besoin, "| stock", stock)
inventaire["bâton"] += 4
inventaire.update({"or": 2})
print(list(inventaire.keys()))
print(sum(inventaire.values()), "objets au total")
'''},
    demo_notes=["Les tiroirs de l'armoire `inventaire` changent quand on modifie une clé."],
    experiments=[],
    mission_title="L'établi automatique",
    mission="""Dans `main.py` :

- **`peut_fabriquer(recette: dict[str, int], inventaire: dict[str, int]) -> bool`** ;
- **`manquants(recette, inventaire) -> dict[str, int]`** : pour chaque ingrédient insuffisant, la quantité qui manque (les ingrédients suffisants n'apparaissent pas) ;
- **`fabriquer(nom: str, recette, inventaire) -> bool`** : si possible, retire les ingrédients de l'inventaire (une clé qui tombe à 0 est **supprimée**), ajoute 1 `nom` (en créant la clé si besoin) et renvoie `True` ; sinon affiche `Impossible de fabriquer nom, il manque : {...}` (le dict des manquants), ne modifie **rien** et renvoie `False` ;
- **`resume(inventaire) -> None`** : affiche `Total : T objets`, puis chaque objet du plus abondant au moins abondant (à égalité, l'ordre de l'inventaire) : `objet : q (p%)` avec p arrondi à 1 décimale.""",
    starter={"main.py": '''RECETTES = {
    "torche": {"charbon": 1, "bâton": 1},
    "pioche": {"planche": 3, "bâton": 2},
    "coffre": {"planche": 8},
}


def main() -> None:
    sac = {"planche": 10, "bâton": 3, "charbon": 2}
    for objet in ("pioche", "torche", "coffre", "torche"):
        fabriquer(objet, RECETTES[objet], sac)
    resume(sac)


if __name__ == "__main__":
    main()
'''},
    checks=[
        dynamic("can", "`peut_fabriquer` et `manquants`", '''
p, m = ns.get("peut_fabriquer"), ns.get("manquants")
if not callable(p) or not callable(m):
    fail("`peut_fabriquer` ou `manquants` est introuvable.")
rec = {"planche": 3, "bâton": 2}
if p(rec, {"planche": 3, "bâton": 2}) is not True:
    fail("Quantités exactes : la fabrication est possible.")
if p(rec, {"planche": 5}) is not False:
    fail("Il manque les bâtons : impossible.")
if m(rec, {"planche": 1, "bâton": 9}) != {"planche": 2}:
    fail("manquants doit donner {'planche': 2}.")
if m(rec, {}) != rec or m(rec, {"planche": 4, "bâton": 2}) != {}:
    fail("manquants : inventaire vide → toute la recette ; inventaire suffisant → {}.")
'''),
        dynamic("craft", "`fabriquer` modifie l'inventaire correctement", '''
f = ns["fabriquer"]
inv = {"planche": 3, "bâton": 3}
ok, out = capture(f, "pioche", {"planche": 3, "bâton": 2}, inv)
if ok is not True or inv != {"bâton": 1, "pioche": 1}:
    fail(f"Après la pioche : {inv}, attendu {{'bâton': 1, 'pioche': 1}}.")
ok, out = capture(f, "pioche", {"planche": 3, "bâton": 2}, inv)
if ok is not False or inv != {"bâton": 1, "pioche": 1}:
    fail("Une fabrication impossible ne doit rien modifier.")
if "Impossible de fabriquer pioche, il manque : {'planche': 3, 'bâton': 1}" not in out:
    fail(f"Message attendu non trouvé :\\n{out}")
capture(f, "pioche", {}, inv)
if inv.get("pioche") != 2:
    fail("Fabriquer un objet déjà présent doit augmenter sa quantité.")
''', locate="fabriquer"),
        dynamic("sum", "`resume` trie et calcule les pourcentages", '''
f = ns["resume"]
_, out = capture(f, {"sable": 1, "verre": 5, "terre": 2, "argile": 2})
want = ["Total : 10 objets", "verre : 5 (50.0%)", "terre : 2 (20.0%)",
        "argile : 2 (20.0%)", "sable : 1 (10.0%)"]
lines = [l.strip() for l in out.splitlines() if l.strip()]
if lines != want:
    fail("Attendu :\\n" + "\\n".join(want) + f"\\nObtenu :\\n{out}")
_, out = capture(f, {"a": 1, "b": 2})
if "b : 2 (66.7%)" not in out:
    fail("Les pourcentages sont arrondis à 1 décimale (66.7%).")
''', locate="resume"),
        static("typed", "Fonctions annotées", "typed"),
    ],
    hints=[
        "Pour chaque paire (ingrédient, besoin) de la recette, compare avec ce que l'inventaire possède, même si la clé est absente.",
        "fabriquer : vérifie d'abord, modifie ensuite. As-tu déjà une fonction qui vérifie ?",
        "Pour trier les objets par quantité décroissante : `sorted(d.items(), key=..., reverse=True)` garde l'ordre d'origine à égalité.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
d = {"a": 1}
d["b"] = 2
d["a"] = 10
print(d, len(d), d.get("z", 0))
''', "Affecter une clé existante remplace la valeur."),
        predict("Que va afficher ce programme ?", '''
stock = {"fer": 2, "or": 0}
for nom, qte in stock.items():
    if qte == 0:
        print(nom, "épuisé")
print("fer" in stock, 2 in stock)
''', "`in` teste les clés, pas les valeurs."),
        explain("Pour chacune des quatre collections (liste, tuple, set, dict), donne un exemple Minecraft où elle est le meilleur choix, et pourquoi.",
                "Liste : file de joueurs (ordre, modifiable) ; tuple : coordonnées (fixes) ; set : biomes visités (unicité) ; dict : inventaire (accès par nom)."),
    ],
    xp=170,
)

C6 = Level(
    id="k2l1", region="k2", number="", title="Le générateur de vagues",
    notions=["K13", "K14", "K15"],
    story="""La **Source Infinie** déverse des monstres sans fin. Impossible de préparer à l'avance la liste de toutes les vagues : elle serait infinie. Il faut les produire **à la demande**, une par une.""",
    explanation="""Un **générateur** est une fonction qui contient `yield` :

```
def compteur():
    n = 1
    while True:
        yield n
        n += 1
```

- Appeler `compteur()` n'exécute **rien** : on obtient un objet générateur.
- `next(gen)` exécute la fonction **jusqu'au prochain `yield`**, renvoie la valeur, et **met la fonction en pause** (ses variables sont conservées).
- Au `next()` suivant, elle **reprend** juste après le `yield`.
- Une boucle `for x in gen:` appelle `next()` pour toi et s'arrête quand le générateur se termine.

Avantage : les valeurs sont produites **une par une**, sans tout stocker en mémoire. Un générateur peut même être **infini** (on prend juste ce dont on a besoin).

Dans le monde, regarde la **source** : chaque `yield` fait jaillir une valeur, et la fonction se met en pause.""",
    demo={"main.py": '''def compteur():
    n = 1
    while True:
        print("  (le générateur calcule", n, ")")
        yield n
        n += 1


gen = compteur()
print("Générateur créé, rien n'a tourné")
print(next(gen))
print(next(gen))
for valeur in gen:
    if valeur > 4:
        break
    print("for reçoit", valeur)
'''},
    demo_notes=["Pas à pas : l'exécution saute dans le générateur à chaque next(), puis revient.",
                "Les variables du générateur (n) sont conservées entre deux pauses."],
    experiments=[],
    mission_title="Les vagues de la Source",
    mission="""Dans `main.py` :

- **`vagues()`** : générateur **infini** qui produit des tuples `(numero, mob, nombre)` : numero = 1, 2, 3… ; mob suit le cycle `zombie`, `squelette`, `araignée`, `creeper`, puis recommence ; nombre = numero × 2 ;
- **`prochaines(gen, n: int) -> list`** renvoie la liste des n valeurs suivantes du générateur reçu, en utilisant `next()` ;
- **`file_attente(joueurs: list[str])`** : générateur qui, tant que la liste n'est pas vide, **retire le premier joueur** de la liste et le produit ;
- programme principal : affiche les 6 premières vagues `Vague 1 : 2 zombie`…, puis vide la file `["Alex", "Steve", "Noor"]` dans un `for` : `Au tour de Alex (reste 2)`…""",
    starter={"main.py": "# Les vagues de la Source\n"},
    checks=[
        dynamic("waves", "`vagues` produit le bon cycle, sans fin", '''
g = ns.get("vagues")
if not callable(g):
    fail("`vagues` est introuvable.")
gen = g()
if isinstance(gen, (list, tuple)) or not hasattr(gen, "__next__"):
    fail("vagues() doit renvoyer un générateur (utilise yield).")
mobs = ["zombie", "squelette", "araignée", "creeper"]
for i in range(1, 501):
    v = next(gen)
    if v != (i, mobs[(i - 1) % 4], i * 2):
        fail(f"Vague {i} : obtenu {v!r}, attendu {(i, mobs[(i - 1) % 4], i * 2)}.")
'''),
        dynamic("take", "`prochaines` utilise le générateur reçu", '''
p, g = ns.get("prochaines"), ns["vagues"]
if not callable(p):
    fail("`prochaines` est introuvable.")
gen = g()
first = p(gen, 3)
second = p(gen, 2)
if [v[0] for v in first] != [1, 2, 3] or [v[0] for v in second] != [4, 5]:
    fail("Deux appels successifs doivent continuer là où le générateur s'était arrêté.")
if p(g(), 0) != []:
    fail("prochaines(gen, 0) doit renvoyer [].")
'''),
        dynamic("queue", "`file_attente` vide la liste au fil de l'eau", '''
f = ns.get("file_attente")
if not callable(f):
    fail("`file_attente` est introuvable.")
lst = ["a", "b", "c"]
gen = f(lst)
if lst != ["a", "b", "c"]:
    fail("Créer le générateur ne doit encore rien retirer.")
if next(gen) != "a" or lst != ["b", "c"]:
    fail("Le premier next() doit produire 'a' et le retirer de la liste.")
rest = list(gen)
if rest != ["b", "c"] or lst != []:
    fail("La suite doit produire 'b' puis 'c' et vider la liste.")
'''),
        dynamic("main", "Programme principal", '''
out = rerun()
for line in ("Vague 1 : 2 zombie", "Vague 6 : 12 squelette", "Au tour de Alex (reste 2)",
             "Au tour de Noor (reste 0)"):
    if line not in out:
        fail(f"Il manque « {line} ».\\n{out}")
if "Vague 7" in out:
    fail("Seules les 6 premières vagues doivent s'afficher.")
'''),
        static("yield", "Utilise yield", "has_node", node="Yield",
               name="vagues"),
        static("guard", "Garde `__main__`", "main_guard"),
    ],
    hints=[
        "Le cycle des mobs : avec l'index (numero - 1) et l'opérateur %, tu tombes toujours dans la liste.",
        "Pour `prochaines`, une compréhension ou une boucle avec next(gen) : combien de fois ?",
        "Pour `file_attente`, quelle méthode de liste retire ET renvoie le premier élément ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
def g():
    print("début")
    yield 1
    print("milieu")
    yield 2


gen = g()
print("créé")
print(next(gen))
print(next(gen))
''', "Rien ne tourne avant le premier next() ; chaque next() reprend après le yield précédent."),
        predict("Que va afficher ce programme ?", '''
def carres(n: int):
    for i in range(n):
        yield i * i


print(list(carres(4)), sum(carres(4)))
''', "Un générateur se consomme comme une séquence (une seule fois par objet)."),
        choice("Quel est l'avantage principal d'un générateur ?",
               ["Il est plus rapide pour tout", "Il produit les valeurs à la demande, sans tout stocker en mémoire",
                "Il trie les valeurs", "Il remplace les classes"], 1,
               "D'où la possibilité de flux infinis."),
    ],
    xp=170,
)

C7 = Level(
    id="k2l2", region="k2", number="", title="Boss : l'Alchimiste des données",
    boss=True, notions=["K16", "K17", "K18", "K19", "H15"],
    story="""L'**Alchimiste** transforme une liste en une autre d'un simple geste. Ses formules tiennent en une ligne : les **compréhensions**. Pour le vaincre, il faut parler sa langue.""",
    explanation="""Une **compréhension** construit une collection en une expression :

```
carres = [n * n for n in range(5)]                 # liste
pairs = [n for n in nombres if n % 2 == 0]         # avec filtre
longueurs = {mot: len(mot) for mot in mots}        # dictionnaire
initiales = {mot[0] for mot in mots}               # ensemble
```

Lecture : « **expression** pour chaque **élément** de la **source**, **si** condition ».

C'est l'équivalent d'une boucle avec `append`, en plus court et plus lisible quand la transformation est simple. Chaque compréhension tient sur **une ligne** (sauf si elle dépasse la longueur maximale).""",
    demo={"main.py": '''mots = ["creeper", "Zombie", "enderman", "Blaze"]
majuscules = [m.capitalize() for m in mots]
deja_propres = [m for m in mots if m == m.capitalize()]
longueurs = {m: len(m) for m in majuscules}
lettres = {m[0].lower() for m in mots}
print(majuscules)
print(deja_propres)
print(longueurs)
print(sorted(lettres))
'''},
    demo_notes=["Chaque compréhension crée une nouvelle collection : regarde-la apparaître d'un coup."],
    experiments=[],
    mission_title="Le grimoire des mobs",
    mission="""Le code de départ fournit `MOBS`, une liste de chaînes `nom:pv:hostile` (les noms ont des majuscules aléatoires). Écris chaque fonction avec **une compréhension** et **sans boucle for/while classique** :

- **`noms(mobs: list[str]) -> list[str]`** : les noms avec une majuscule initiale (`capitalize`) ;
- **`hostiles(mobs) -> list[str]`** : les noms (majuscule initiale) des mobs dont le 3ᵉ champ est `oui` ;
- **`points_de_vie(mobs) -> dict[str, int]`** : nom (majuscule initiale) → pv (entier) ;
- **`costauds(pv: dict[str, int]) -> dict[str, int]`** : uniquement les mobs strictement au-dessus de la moyenne des pv ;
- **`initiales(mobs) -> set[str]`** : l'ensemble des premières lettres des noms, en majuscules.""",
    starter={"main.py": '''MOBS = ["zombie:20:oui", "Cochon:10:non", "enderman:40:oui", "Vache:10:non",
        "wither:300:oui", "golem:100:non", "Creeper:20:oui"]


def main() -> None:
    print(noms(MOBS))
    print(hostiles(MOBS))
    pv = points_de_vie(MOBS)
    print(pv)
    print(costauds(pv))
    print(sorted(initiales(MOBS)))


if __name__ == "__main__":
    main()
'''},
    checks=[
        dynamic("lists", "`noms` et `hostiles`", '''
n, h = ns.get("noms"), ns.get("hostiles")
if not callable(n) or not callable(h):
    fail("`noms` ou `hostiles` est introuvable.")
data = ["aBc:1:oui", "Def:2:non", "ghi:3:oui"]
if n(data) != ["Abc", "Def", "Ghi"]:
    fail(f"noms({data}) → {n(data)!r}")
if h(data) != ["Abc", "Ghi"]:
    fail(f"hostiles({data}) → {h(data)!r}")
if n([]) != [] or h([]) != []:
    fail("Une liste vide donne une liste vide.")
'''),
        dynamic("dicts", "`points_de_vie` et `costauds`", '''
p, c = ns.get("points_de_vie"), ns.get("costauds")
data = ["aBc:10:oui", "Def:30:non", "ghi:20:oui", "jkl:40:non"]
if p(data) != {"Abc": 10, "Def": 30, "Ghi": 20, "Jkl": 40}:
    fail(f"points_de_vie → {p(data)!r}")
if c({"A": 10, "B": 30, "C": 20, "D": 40}) != {"B": 30, "D": 40}:
    fail("costauds doit garder les pv strictement au-dessus de la moyenne (25).")
if c({"A": 5, "B": 5}) != {}:
    fail("Si tous ont la moyenne, personne n'est au-dessus.")
'''),
        dynamic("set", "`initiales`", '''
i = ns.get("initiales")
got = i(["abc:1:oui", "Axe:2:non", "bob:3:oui"])
if got != {"A", "B"} or not isinstance(got, set):
    fail(f"initiales → {got!r}, attendu {{'A', 'B'}}.")
'''),
        static("c1", "`noms` utilise une compréhension", "has_node",
               node="ListComp", name="noms"),
        static("c2", "`hostiles` utilise une compréhension avec filtre",
               "has_node", node="ListComp", name="hostiles"),
        static("c3", "`points_de_vie` utilise une compréhension de dict",
               "has_node", node="DictComp", name="points_de_vie"),
        static("c4", "`costauds` utilise une compréhension de dict",
               "has_node", node="DictComp", name="costauds"),
        static("c5", "`initiales` utilise une compréhension d'ensemble",
               "has_node", node="SetComp", name="initiales"),
        static("noloop", "Aucune boucle for/while classique dans le fichier",
               "no_for_stmt"),
    ],
    hints=[
        "`\"zombie:20:oui\".split(\":\")` te donne les trois champs. Quel index pour le nom ?",
        "Le filtre se place à la fin de la compréhension : `[... for ... in ... if ...]`.",
        "Pour costauds, calcule d'abord la moyenne dans une variable, puis filtre.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
n = [1, 2, 3, 4, 5]
print([x * 10 for x in n if x % 2 == 1])
print({x: x * x for x in n if x > 3})
''', "Expression, source, filtre."),
        predict("Que va afficher ce programme ?", '''
mots = ["bloc", "Bloc", "BLOC", "pierre"]
print(len({m.lower() for m in mots}))
''', "Un ensemble ne garde qu'un exemplaire de « bloc »."),
        explain("Quand une compréhension est-elle préférable à une boucle, et quand vaut-il mieux garder une boucle ?",
                "Compréhension pour une transformation ou un filtre simple qui construit une collection ; boucle quand il y a plusieurs étapes, des effets (print), ou une logique trop longue pour rester lisible."),
    ],
    xp=260,
)

FINAL = Level(
    id="k3l1", region="k3", number="", title="Le Cœur du Monde",
    boss=True,
    notions=["A2", "A3", "A4", "B6", "C1", "C6", "D1", "D5", "E1", "E2",
             "X4", "X9", "X10", "X12", "K1", "K5", "K8", "K11", "K13",
             "K16", "K17", "K18", "G5", "G11"],
    story="""Tout converge ici. Le **Cœur du Monde** a besoin d'un système capable de charger des chunks depuis la ligne de commande, de refuser les données corrompues, de retrouver n'importe quel chunk instantanément, de parcourir le monde sans tout charger en mémoire et de produire des statistiques d'un geste.

C'est l'épreuve finale de PyCraft : les **quatre actes** en un seul programme.""",
    explanation="""Avant d'écrire : quelles **classes**, quelles **exceptions**, quelles **collections** (pourquoi un dict ici, un set là, un tuple ailleurs) ? Où va le **générateur** ? Quelles méthodes sont **statiques** ou **de classe** ?

Construis par petites étapes, en exécutant à chaque fois. La vérification est une batterie de tests cachés avec des valeurs aléatoires.""",
    demo={"main.py": "# Pas de démonstration : à toi de jouer.\n"},
    demo_notes=[], experiments=[],
    mission_title="Cahier des charges du Cœur du Monde",
    mission="""**Organisation** : shebang, annotations partout, garde `__main__`, aucun attribut protégé touché de l'extérieur.

**Exceptions** : `MondeError(Exception)` (défaut `Erreur du monde`), `ChunkIntrouvableError(MondeError)` (défaut `Chunk introuvable`), `ChunkInvalideError(MondeError)` (défaut `Chunk invalide`).

**`Chunk`** : `__init__(self, x: int, z: int, biome: str)`, attributs protégés ; `get_biome()`, `coords() -> tuple[int, int]` ;
- statique `cle(x: int, z: int) -> str` → `"x,z"` ;
- de classe `depuis_texte(texte: str)` : lit `"x,z,biome"` ; mauvais format ou coordonnées non entières → `ChunkInvalideError(f"Chunk invalide : '{texte}'")` ; doit créer un objet **du type de la classe appelée**.

**`Monde`** : `__init__(self, nom: str)`, un **dict** protégé clé → chunk ;
- `ajouter(chunk)` : clé déjà présente → `MondeError(f"Chunk déjà présent : x,z")` ;
- `chunk(x, z)` : absent → `ChunkIntrouvableError(f"Aucun chunk en x,z")` ;
- `__len__` n'est pas demandé : fournis `taille() -> int` ;
- `biomes() -> set[str]` : **compréhension d'ensemble** ;
- `par_biome() -> dict[str, int]` : biome → nombre de chunks (**compréhension de dict**) ;
- `parcourir(biome: str | None = None)` : **générateur** qui produit les chunks triés par coordonnées, éventuellement filtrés par biome.

**Programme principal** : chaque argument de `sys.argv` est un chunk `x,z,biome`. Les invalides affichent `Ignoré : <message>`, les doublons `Ignoré : <message>`. Ensuite : `Chunks chargés : N`, `Biomes : [...]` (trié), puis une ligne `  biome : n` par biome (ordre alphabétique), puis tous les chunks de forêt via le générateur : `Forêt en (x, z)`.""",
    starter={"main.py": ""},
    argv=["0,0,plaine", "1,0,forêt", "0,1,forêt", "zut", "1,0,désert", "2,x,mer"],
    checks=[
        static("shebang", "Shebang", "shebang"),
        static("typed", "Annotations partout", "typed"),
        static("guard", "Garde `__main__`", "main_guard"),
        static("outside", "Encapsulation respectée", "no_external_protected"),
        static("k1", "`cle` est statique", "method_kind", cls="Chunk",
               name="cle", kind="static"),
        static("k2", "`depuis_texte` est une méthode de classe", "method_kind",
               cls="Chunk", name="depuis_texte", kind="class"),
        static("gen", "`parcourir` est un générateur", "has_node",
               node="Yield", name="parcourir"),
        static("setc", "`biomes` utilise une compréhension d'ensemble",
               "has_node", node="SetComp", name="biomes"),
        static("dictc", "`par_biome` utilise une compréhension de dict",
               "has_node", node="DictComp", name="par_biome"),
        dynamic("errors", "La famille d'exceptions", '''
M, I, V = need_class("MondeError"), need_class("ChunkIntrouvableError"), need_class("ChunkInvalideError")
if not (issubclass(I, M) and issubclass(V, M) and issubclass(M, Exception)):
    fail("Les erreurs de chunk doivent hériter de MondeError.")
for cls, msg in ((M, "Erreur du monde"), (I, "Chunk introuvable"), (V, "Chunk invalide")):
    if str(cls()) != msg:
        fail(f"Message par défaut de {cls.__name__} : {str(cls())!r}")
'''),
        dynamic("chunk", "Chunk : création, clé, lecture de texte", '''
C, V = need_class("Chunk"), need_class("ChunkInvalideError")
c = C(3, -2, "jungle")
if c.coords() != (3, -2) or not isinstance(c.coords(), tuple) or c.get_biome() != "jungle":
    fail("coords() doit renvoyer le tuple (3, -2) et get_biome() 'jungle'.")
if C.cle(3, -2) != "3,-2":
    fail("Chunk.cle(3, -2) doit renvoyer '3,-2'.")
d = C.depuis_texte("5,6,mer")
if d.coords() != (5, 6) or d.get_biome() != "mer":
    fail("depuis_texte('5,6,mer') mal lu.")
class Sub(C):
    pass
if type(Sub.depuis_texte("1,1,mer")) is not Sub:
    fail("depuis_texte doit créer un objet de la classe appelée (cls).")
for bad in ("1,2", "a,2,mer", "1,2,3,4", ""):
    try:
        C.depuis_texte(bad)
    except V as e:
        if str(e) != f"Chunk invalide : '{bad}'":
            fail(f"Message pour {bad!r} : {str(e)!r}")
    except Exception as e:
        fail(f"depuis_texte({bad!r}) a levé {e.__class__.__name__}.")
    else:
        fail(f"depuis_texte({bad!r}) doit lever ChunkInvalideError.")
if [k for k in attrs(c) if not k.startswith("_")]:
    fail("Les attributs de Chunk doivent être protégés.")
'''),
        dynamic("world", "Monde : ajout, recherche, statistiques", '''
W, C = need_class("Monde"), need_class("Chunk")
M, I = need_class("MondeError"), need_class("ChunkIntrouvableError")
w = W("Test")
biomes = ["mer", "forêt", "plaine"]
model = {}
for _ in range(25):
    x, z = rng.randint(-5, 5), rng.randint(-5, 5)
    b = rng.choice(biomes)
    try:
        w.ajouter(C(x, z, b))
        if (x, z) in model:
            fail(f"Ajouter deux fois le chunk {x},{z} doit lever MondeError.")
        model[(x, z)] = b
    except I:
        fail("ajouter ne doit pas lever ChunkIntrouvableError.")
    except M as e:
        if (x, z) not in model or str(e) != f"Chunk déjà présent : {x},{z}":
            fail(f"Erreur inattendue à l'ajout : {e}")
if w.taille() != len(model):
    fail(f"taille() = {w.taille()}, attendu {len(model)}.")
for (x, z), b in model.items():
    if w.chunk(x, z).get_biome() != b:
        fail(f"chunk({x}, {z}) ne renvoie pas le bon chunk.")
try:
    w.chunk(99, 99)
except I as e:
    if str(e) != "Aucun chunk en 99,99":
        fail(f"Message : {str(e)!r}")
else:
    fail("Un chunk absent doit lever ChunkIntrouvableError.")
if w.biomes() != set(model.values()):
    fail("biomes() doit renvoyer l'ensemble des biomes présents.")
counts = {b: list(model.values()).count(b) for b in set(model.values())}
if w.par_biome() != counts:
    fail(f"par_biome() = {w.par_biome()}, attendu {counts}.")
gen = w.parcourir("mer")
if not hasattr(gen, "__next__"):
    fail("parcourir() doit renvoyer un générateur.")
got = [c.coords() for c in gen]
want = sorted(k for k, b in model.items() if b == "mer")
if got != want:
    fail(f"parcourir('mer') → {got}, attendu {want}.")
if [c.coords() for c in w.parcourir()] != sorted(model):
    fail("parcourir() sans filtre doit produire tous les chunks triés.")
'''),
        dynamic("main", "Le programme principal", '''
out = rerun(["0,0,plaine", "1,0,forêt", "0,1,forêt", "zut", "1,0,désert", "2,x,mer"])
lines = [l.rstrip() for l in out.splitlines() if l.strip()]
want = ["Ignoré : Chunk invalide : 'zut'", "Ignoré : Chunk déjà présent : 1,0",
        "Ignoré : Chunk invalide : '2,x,mer'", "Chunks chargés : 3",
        "Biomes : ['forêt', 'plaine']", "  forêt : 2", "  plaine : 1",
        "Forêt en (0, 1)", "Forêt en (1, 0)"]
if lines != want:
    fail("Attendu :\\n" + "\\n".join(want) + f"\\nObtenu :\\n{out}")
'''),
    ],
    hints=[
        "Commence par les exceptions et Chunk, teste-les seuls, puis Monde, puis le programme principal.",
        "Pour la clé du dict, la méthode statique cle(x, z) sert à ajouter ET à chercher.",
        "Le générateur peut trier les clés… ou les tuples de coordonnées. Lesquels se trient dans le bon ordre numérique ?",
    ],
    quiz=[
        explain("Soutenance 1 : justifie chaque collection de ton programme (dict, set, tuple, liste, générateur).",
                "dict pour retrouver un chunk par sa clé ; set pour des biomes uniques ; tuple pour des coordonnées fixes ; liste pour les arguments ordonnés ; générateur pour parcourir sans tout copier."),
        explain("Soutenance 2 : un chunk corrompu arrive. Décris, fonction par fonction, le trajet de l'exception jusqu'au message affiché.",
                "depuis_texte détecte et lève ChunkInvalideError ; elle remonte jusqu'au programme principal qui attrape MondeError (la classe parente), affiche « Ignoré : … » et continue avec l'argument suivant."),
        choice("Pourquoi `depuis_texte` est-elle une méthode de classe et `cle` une méthode statique ?",
               ["C'est arbitraire", "depuis_texte fabrique un objet du type appelé (besoin de cls) ; cle ne dépend ni d'un objet ni de la classe",
                "Les méthodes statiques sont plus rapides", "Pour éviter self"], 1,
               "Le besoin décide du genre de méthode."),
    ],
    xp=700,
)

REGION_BIBLIO = Region(
    id="k1", name="La Grande Bibliothèque",
    subtitle="sys.argv, listes, tuples, ensembles, dictionnaires",
    theme="biblio", reward="Livre enchanté — débloque la Source Infinie",
    levels=[C1, C2, C3, C4, C5], act=4, icon="📚",
)

REGION_SOURCE = Region(
    id="k2", name="La Source Infinie",
    subtitle="Générateurs, yield, next(), compréhensions",
    theme="labo", reward="Fiole de la Source — ouvre le Cœur du Monde",
    levels=[C6, C7], act=4, icon="🌀",
)

REGION_COEUR = Region(
    id="k3", name="Le Cœur du Monde", subtitle="Grande finale : les quatre actes",
    theme="coeur", reward="Étoile du Nether — PyCraft terminé !",
    levels=[FINAL], act=4, icon="🌟",
)
