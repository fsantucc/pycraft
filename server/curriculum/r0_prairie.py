"""Acte I — Les Fondations (sujet python00) : fonctions, entrées, calculs,
conditions, boucles, récursion, annotations de type."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static
from .r1_village import L1 as VARIABLES

HELPER_NOTE = "# Assistant du village : NE PAS MODIFIER (fichier verrouillé).\n" \
    "# Comme un testeur, il importe ta fonction et l'appelle.\n"

A1 = Level(
    id="a1l1", region="a1", number="1.1", title="Le premier mot",
    notions=["H1", "H2", "A1", "A8"],
    story="""Tu te réveilles au milieu d'une **prairie** silencieuse. Un vieux villageois te tend un parchemin : *« Ici, on n'écrit pas des ordres qui s'exécutent n'importe quand. On écrit des **recettes** que l'on range, et que l'on suit quand on en a besoin. »*

Ces recettes, en Python, s'appellent des **fonctions**.""",
    explanation="""Une **fonction** est une suite d'instructions rangée sous un nom :

```
def sonner_cloche() -> None:
    print("Ding !")
    print("Dong !")
```

- `def` **définit** la fonction : Python la mémorise, mais **n'exécute rien**.
- Le corps de la fonction est **indenté** de 4 espaces : c'est ce qui dit à Python où elle commence et où elle finit.
- Pour exécuter la recette, on **appelle** la fonction : `sonner_cloche()`, avec les parenthèses. On peut l'appeler autant de fois qu'on veut.
- `-> None` annonce que la fonction ne renvoie rien (on y reviendra).

Dans ce premier acte, tes fichiers ne contiennent **que des fonctions**. Un fichier verrouillé, `main.py`, joue le rôle de testeur : il **importe** ta fonction (`from cloche import sonner_cloche`) puis l'appelle.

Dans le monde, regarde la **pile d'appels** (la tour de blocs à gauche) : un bloc apparaît quand une fonction démarre et disparaît quand elle se termine.""",
    demo={
        "main.py": HELPER_NOTE + '''from cloche import sonner_cloche

print("Le village s'éveille")
sonner_cloche()
sonner_cloche()
print("Fin de la démonstration")
''',
        "cloche.py": '''def sonner_cloche() -> None:
    print("Ding !")
    print("Dong !")
''',
    },
    demo_notes=[
        "Pas à pas : l'import charge cloche.py, qui DÉFINIT la fonction sans rien afficher.",
        "À chaque appel, l'exécution saute dans cloche.py puis revient dans main.py.",
        "La tour « pile d'appels » grandit pendant l'appel et redescend après.",
    ],
    experiments=[
        "Dans cloche.py, retire l'indentation du second print. Que se passe-t-il ?",
        "Dans main.py, retire les parenthèses : `sonner_cloche` sans `()`. Python appelle-t-il la fonction ?",
        "Ajoute un troisième appel.",
    ],
    readonly=["main.py"],
    mission_title="La lanterne du village",
    mission="""Dans le fichier `lanterne.py`, écris **uniquement** une fonction `allumer_lanterne()` qui affiche exactement ces deux lignes :

```
La lanterne s'allume.
Les villageois rentrent chez eux.
```

Le fichier `main.py` est verrouillé : il importe ta fonction et l'appelle deux fois. Ton fichier ne doit contenir aucune ligne en dehors de la fonction.""",
    starter={
        "lanterne.py": "# Écris ta fonction ici.\n",
        "main.py": HELPER_NOTE + '''from lanterne import allumer_lanterne

print("La nuit tombe...")
allumer_lanterne()
print("Plus tard dans la nuit...")
allumer_lanterne()
''',
    },
    checks=[
        dynamic("exists", "`allumer_lanterne` existe dans lanterne.py", '''
mod = __import__("lanterne")
if not callable(getattr(mod, "allumer_lanterne", None)):
    fail("lanterne.py ne définit pas `allumer_lanterne`.")
'''),
        dynamic("output", "Elle affiche exactement les deux lignes", '''
mod = __import__("lanterne")
_, out = capture(mod.allumer_lanterne)
want = "La lanterne s'allume.\\nLes villageois rentrent chez eux.\\n"
if out != want:
    fail("Affichage obtenu :\\n" + out + "\\nAttendu :\\n" + want)
''', locate="allumer_lanterne"),
        dynamic("again", "Chaque appel produit le même résultat", '''
mod = __import__("lanterne")
_, a = capture(mod.allumer_lanterne)
_, b = capture(mod.allumer_lanterne)
if a != b:
    fail("Deux appels donnent deux affichages différents.")
'''),
        static("only", "lanterne.py ne contient que la fonction",
               "only_functions", file="lanterne.py"),
    ],
    hints=[
        "Quel mot-clé commence la définition d'une fonction ? Que met-on à la fin de cette ligne ?",
        "Les deux print doivent appartenir à la fonction. Comment Python sait-il qu'une ligne fait partie du corps ?",
        "Le texte doit être identique au caractère près : majuscule, point final, apostrophe.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
def bonjour() -> None:
    print("bonjour")


print("avant")
bonjour()
bonjour()
print("après")
''', "La définition n'affiche rien ; chaque appel exécute le corps."),
        predict("Et celui-ci ?", '''
def secret() -> None:
    print("message secret")


print("fin")
''', "La fonction est définie mais jamais appelée."),
        choice("Que fait la ligne `def ouvrir_porte() -> None:` (avec son corps) au moment où Python la lit ?",
               ["Elle ouvre la porte", "Elle range la recette sous ce nom, sans l'exécuter",
                "Elle affiche le nom de la fonction", "Elle provoque une erreur"], 1,
               "Définir ≠ appeler."),
        explain("Explique la différence entre définir et appeler une fonction, avec un exemple de la vie courante.",
                "Définir, c'est écrire la recette et la ranger ; appeler, c'est la suivre. On peut suivre une recette plusieurs fois."),
    ],
    xp=80,
)

A3 = Level(
    id="a1l3", region="a1", number="1.3", title="Le villageois curieux",
    notions=["H3", "H4", "H5"],
    story="""Un villageois t'arrête : il veut éclairer sa maison, mais il ne sait pas compter les torches. Il va te **dire** ses chiffres, et tu devras calculer.

Un programme peut **poser des questions** à la personne qui l'utilise.""",
    explanation="""`input("Question : ")` affiche la question, attend que l'utilisateur tape quelque chose, puis **renvoie ce texte**.

Attention : `input()` renvoie **toujours** une chaîne de caractères (`str`), même si on tape `5`. Pour calculer, il faut **convertir** : `int("5")` donne le nombre `5`.

- `"5" + "3"` vaut `"53"` (on colle deux textes) ;
- `int("5") + int("3")` vaut `8`.

Les opérateurs : `+` `-` `*`, la division `/` (résultat à virgule), la **division entière** `//` (17 // 5 = 3) et le **reste** `%` (17 % 5 = 2).

Dans PyCraft, ce que l'utilisateur tape se règle dans **Entrées du programme**, sous l'éditeur : une ligne par appel à `input()`. Dans le monde, le crieur pose la question et tu vois la réponse arriver.""",
    demo={"main.py": '''def demander_age() -> None:
    texte = input("Quel âge as-tu ? ")
    age = int(texte)
    print("Dans 10 ans, tu auras", age + 10, "ans")
    print("Texte collé :", texte + "10")
    print("17 // 5 =", 17 // 5, "et 17 % 5 =", 17 % 5)


demander_age()
'''},
    demo_stdin=["12"],
    demo_notes=[
        "Ligne 2 : le crieur pose la question, la réponse vient des « Entrées du programme ».",
        "Regarde l'inspecteur : `texte` est une chaîne ('12'), `age` est un entier (12).",
        "`texte + \"10\"` colle les textes, `age + 10` additionne.",
    ],
    experiments=[
        "Change l'entrée en `abc`. Quelle erreur, et à quelle ligne ?",
        "Supprime la ligne d'entrée. Que se passe-t-il ?",
    ],
    stdin=["3", "5"],
    mission_title="La commande de torches",
    mission="""Dans `torches.py`, écris une fonction `commande_torches()` qui :

1. demande `Nombre de murs : ` puis `Torches par mur : ` ;
2. affiche `Torches à fabriquer : N` (N = murs × torches par mur) ;
3. sachant qu'**un charbon donne 4 torches**, affiche `Charbon nécessaire : C`, le plus petit nombre de charbons suffisant ;
4. affiche `Torches en trop : E` (fabriquées en plus de celles nécessaires).

Exemple avec 3 murs et 5 torches par mur : 15 torches, 4 charbons, 1 torche en trop.""",
    starter={
        "torches.py": "# Écris ta fonction ici.\n",
        "main.py": HELPER_NOTE + '''from torches import commande_torches

commande_torches()
''',
    },
    readonly=["main.py"],
    checks=[
        dynamic("exists", "`commande_torches` existe", '''
mod = __import__("torches")
if not callable(getattr(mod, "commande_torches", None)):
    fail("torches.py ne définit pas `commande_torches`.")
'''),
        dynamic("ask", "Les deux questions sont posées", '''
mod = __import__("torches")
_, out = with_input(mod.commande_torches, ["2", "4"])
for q in ("Nombre de murs : ", "Torches par mur : "):
    if q not in out:
        fail(f"La question {q!r} n'apparaît pas.")
'''),
        dynamic("maths", "Les calculs sont justes, même avec d'autres nombres", '''
mod = __import__("torches")
cases = [(3, 5), (2, 4), (1, 1), (0, 7)] + [(rng.randint(0, 20), rng.randint(0, 9)) for _ in range(8)]
for murs, par in cases:
    n = murs * par
    c = (n + 3) // 4
    _, out = with_input(mod.commande_torches, [murs, par])
    for line in (f"Torches à fabriquer : {n}", f"Charbon nécessaire : {c}",
                 f"Torches en trop : {c * 4 - n}"):
        if line not in out:
            fail(f"Avec {murs} murs et {par} torches par mur, il manque la "
                 f"ligne {line!r}. Affichage obtenu :\\n{out}")
''', locate="commande_torches"),
        static("only", "torches.py ne contient que la fonction",
               "only_functions", file="torches.py"),
    ],
    hints=[
        "Que renvoie `input()` : un nombre ou un texte ? Que faut-il faire avant de multiplier ?",
        "Pour 15 torches et 4 torches par charbon : 3 charbons ne suffisent pas. Comment écrire « arrondi au supérieur » avec `//` ?",
        "Essaie avec 16 torches puis 17 : la formule donne-t-elle 4 puis 5 ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
print("5" + "3")
print(int("5") + int("3"))
''', "Deux textes se collent, deux nombres s'additionnent."),
        predict("Que va afficher ce programme ?", '''
print(17 // 5, 17 % 5)
print(20 // 4, 20 % 4)
''', "// donne le quotient entier, % le reste."),
        choice("Quel est le type de la valeur renvoyée par `input()` ?",
               ["int", "str", "Ça dépend de ce qu'on tape", "bool"], 1,
               "Toujours une chaîne : c'est à toi de convertir."),
        explain("Pourquoi `int(input(...))` est-il nécessaire avant un calcul ? Que se passe-t-il si l'utilisateur tape « douze » ?",
                "input renvoie du texte ; int convertit en nombre ; « douze » n'est pas convertible et provoque une ValueError."),
    ],
    xp=110,
)

A4 = Level(
    id="a1l4", region="a1", number="1.4", title="Le gardien du pont",
    notions=["H6", "H7"],
    story="""Un pont de bois traverse le ravin. Un garde en armure le surveille : il ne laisse passer que ceux qui en sont capables, et il choisit ses mots selon le voyageur.

Ton programme doit maintenant **prendre des décisions**.""",
    explanation="""Une **condition** exécute un bloc seulement si une expression est vraie :

```
if niveau > 30:
    print("Héros")
elif niveau >= 10:
    print("Aventurier")
else:
    print("Débutant")
```

- Python teste les conditions **dans l'ordre** et n'exécute que le **premier** bloc dont la condition est vraie.
- `elif` (sinon si) et `else` (sinon) sont facultatifs.
- Comparaisons : `>` (strictement plus grand), `>=` (plus grand ou égal), `<`, `<=`, `==` (égal), `!=` (différent).

« **Strictement** plus de 30 » s'écrit `> 30` : 30 n'est **pas** accepté. « Au moins 10 » s'écrit `>= 10`. Les **valeurs limites** sont là où les bugs se cachent.

Les conditions se combinent avec `and`, `or`, `not`.""",
    demo={"main.py": '''def verifier_lumiere() -> None:
    lumiere = int(input("Niveau de lumière (0-15) : "))
    if lumiere < 8:
        print("Des monstres peuvent apparaître !")
    elif lumiere <= 11:
        print("Zone sûre la nuit.")
    else:
        print("Plein jour.")


verifier_lumiere()
'''},
    demo_stdin=["9"],
    demo_notes=["Pas à pas : regarde quelles lignes sont exécutées et lesquelles sont sautées."],
    experiments=[
        "Essaie les entrées 7, 8, 11, 12. Lesquelles changent le message ?",
        "Inverse l'ordre des deux premières conditions. Le programme reste-t-il juste ?",
    ],
    mission_title="Le garde du pont",
    mission="""Dans `pont.py`, écris `garde_du_pont()` :

1. demande `Niveau d'expérience : ` ;
2. **strictement plus de 30** : affiche `Passe, héros !` ; **de 10 à 30 inclus** : `Passe, aventurier.` ; **moins de 10** : `Reviens quand tu seras plus fort.` ;
3. demande ensuite `As-tu une torche ? (oui/non) : `. Si la réponse est `non` **et** que le voyageur a été autorisé à passer, affiche aussi `Prends une torche, le pont est sombre.`""",
    starter={
        "pont.py": "# Écris ta fonction ici.\n",
        "main.py": HELPER_NOTE + '''from pont import garde_du_pont

garde_du_pont()
''',
    },
    readonly=["main.py"],
    stdin=["12", "non"],
    checks=[
        dynamic("exists", "`garde_du_pont` existe", '''
mod = __import__("pont")
if not callable(getattr(mod, "garde_du_pont", None)):
    fail("pont.py ne définit pas `garde_du_pont`.")
'''),
        dynamic("limits", "Les valeurs limites sont bien traitées", '''
mod = __import__("pont")
expect = {9: "Reviens quand tu seras plus fort.", 10: "Passe, aventurier.",
          30: "Passe, aventurier.", 31: "Passe, héros !",
          0: "Reviens quand tu seras plus fort.", 99: "Passe, héros !"}
for lvl, msg in expect.items():
    _, out = with_input(mod.garde_du_pont, [lvl, "oui"])
    if msg not in out:
        fail(f"Niveau {lvl} : il fallait afficher {msg!r}. Obtenu :\\n{out}")
    others = [m for m in set(expect.values()) if m != msg and m in out]
    if others:
        fail(f"Niveau {lvl} : un seul message doit s'afficher, j'ai aussi {others[0]!r}.")
''', locate="garde_du_pont"),
        dynamic("torch", "Le conseil de la torche suit la règle", '''
mod = __import__("pont")
tip = "Prends une torche, le pont est sombre."
for lvl, answer, want in ((20, "non", True), (20, "oui", False),
                          (40, "non", True), (5, "non", False)):
    _, out = with_input(mod.garde_du_pont, [lvl, answer])
    if (tip in out) != want:
        fail(f"Niveau {lvl}, torche {answer!r} : le conseil devrait "
             f"{'apparaître' if want else 'ne pas apparaître'}.")
'''),
        static("only", "pont.py ne contient que la fonction", "only_functions",
               file="pont.py"),
    ],
    hints=[
        "Écris sur papier : 9 → ?, 10 → ?, 30 → ?, 31 → ?. Quelle comparaison sépare 30 et 31 ?",
        "Pour la torche, le message dépend de deux choses à la fois. Quel mot Python relie deux conditions qui doivent être vraies ensemble ?",
        "Comment ton programme se « souvient »-il que le voyageur a été autorisé, au moment de la seconde question ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
x = 15
if x > 10:
    print("A")
elif x > 5:
    print("B")
else:
    print("C")
''', "15 > 10 est vrai : seul le premier bloc s'exécute, même si x > 5 est vrai aussi."),
        predict("Que va afficher ce programme ?", '''
print(7 > 7, 7 >= 7, 7 != 7)
''', "7 n'est pas strictement plus grand que 7."),
        choice("« Prête à récolter si elle a strictement plus de 60 jours ». Quelle condition ?",
               ["jours >= 60", "jours > 60", "jours == 60", "jours > 61"], 1,
               "« Strictement plus » exclut 60 lui-même."),
    ],
    xp=110,
)

M1 = Level(
    id="a2l1", region="a2", number="2.1", title="La tour de blocs",
    notions=["H8", "H9", "H10"],
    story="""Dans les **Mines de l'Écho**, les mineurs construisent des tours de soutènement. Chaque étage demande plus de blocs que le précédent, et personne n'a envie d'écrire cent fois la même ligne.

Une **boucle** répète un bloc d'instructions.""",
    explanation="""**Boucle `for`** : on répète pour chaque valeur d'une séquence.

```
for i in range(1, 4):
    print("Étage", i)
```

`range(1, 4)` produit 1, 2, 3 (la fin est **exclue**). `range(5)` produit 0, 1, 2, 3, 4. `range(2, 10, 3)` produit 2, 5, 8.

**Boucle `while`** : on répète **tant qu'**une condition est vraie. Utile quand on ne sait pas à l'avance combien de tours il faudra.

```
blocs = 20
while blocs >= 6:
    blocs = blocs - 6
```

Attention : si la condition ne devient jamais fausse, la boucle est **infinie** (PyCraft l'arrête au bout de quelques milliers d'étapes).

**Accumulateur** : une variable initialisée **avant** la boucle et mise à jour **à chaque tour** (`total = total + n`). Après la boucle, elle contient le résultat.""",
    demo={"main.py": '''def demo_boucles() -> None:
    total = 0
    for i in range(1, 4):
        print("Étage", i)
        total = total + i
    print("Somme des étages :", total)
    blocs = 20
    piles = 0
    while blocs >= 6:
        blocs = blocs - 6
        piles = piles + 1
    print(piles, "piles de 6, reste", blocs)


demo_boucles()
'''},
    demo_notes=["Suis `i` et `total` dans l'inspecteur à chaque tour.",
                "Pour le while, la condition est testée AVANT chaque tour."],
    experiments=["Remplace `range(1, 4)` par `range(4)`. Qu'est-ce qui change ?",
                 "Que se passe-t-il si `blocs` vaut 5 au départ ?"],
    mission_title="Les tours de soutènement",
    mission="""Dans `tour.py`, écris deux fonctions :

**`construire_tour()`** demande `Hauteur de la tour : ` puis, pour chaque étage i de 1 à la hauteur, affiche `Étage i : B blocs` avec B = 4 × i. Pour finir, affiche `Total : T blocs`.

**`etages_possibles()`** demande `Blocs disponibles : ` puis construit des étages (1er étage 4 blocs, 2e étage 8 blocs, etc.) **tant que** les blocs restants suffisent pour l'étage suivant. Affiche `Étages construits : n` puis `Blocs restants : r`. Utilise une boucle `while`.""",
    starter={
        "tour.py": "# Écris tes fonctions ici.\n",
        "main.py": HELPER_NOTE + '''from tour import construire_tour, etages_possibles

construire_tour()
etages_possibles()
''',
    },
    readonly=["main.py"],
    stdin=["3", "30"],
    checks=[
        dynamic("tower", "`construire_tour` affiche chaque étage et le total", '''
mod = __import__("tour")
for h in (1, 3, 0, rng.randint(4, 12)):
    _, out = with_input(mod.construire_tour, [h])
    for i in range(1, h + 1):
        if f"Étage {i} : {4 * i} blocs" not in out:
            fail(f"Hauteur {h} : il manque « Étage {i} : {4 * i} blocs ».\\n{out}")
    if f"Étage {h + 1} :" in out:
        fail(f"Hauteur {h} : il y a un étage de trop.")
    total = sum(4 * i for i in range(1, h + 1))
    if f"Total : {total} blocs" not in out:
        fail(f"Hauteur {h} : le total doit être {total}.\\n{out}")
''', locate="construire_tour"),
        dynamic("while", "`etages_possibles` s'arrête au bon moment", '''
mod = __import__("tour")
for blocs in (0, 3, 4, 11, 12, 30, rng.randint(40, 300)):
    n, need, left = 0, 4, blocs
    while left >= need:
        left -= need
        n += 1
        need += 4
    _, out = with_input(mod.etages_possibles, [blocs])
    if f"Étages construits : {n}" not in out or f"Blocs restants : {left}" not in out:
        fail(f"Avec {blocs} blocs : attendu {n} étages et {left} restants.\\n{out}")
''', locate="etages_possibles"),
        static("loop1", "`construire_tour` utilise une boucle", "uses_loop_in",
               name="construire_tour", file="tour.py"),
        static("loop2", "`etages_possibles` utilise une boucle",
               "uses_loop_in", name="etages_possibles", file="tour.py"),
        static("only", "tour.py ne contient que des fonctions",
               "only_functions", file="tour.py"),
    ],
    hints=[
        "Avec range, quelle borne de fin donne exactement les étages 1 à h ?",
        "Le total se construit pendant la boucle : quelle variable faut-il créer avant elle ?",
        "Dans le while, il te faut deux informations qui changent à chaque tour : les blocs restants, et le coût de l'étage suivant.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
for i in range(2, 9, 3):
    print(i)
''', "Départ 2, pas de 3, fin 9 exclue."),
        predict("Que va afficher ce programme ?", '''
n = 1
while n < 20:
    n = n * 3
print(n)
''', "1 → 3 → 9 → 27 : la condition est testée avant chaque tour."),
        choice("Quand préférer `while` à `for` ?",
               ["Toujours", "Quand on ne connaît pas à l'avance le nombre de répétitions",
                "Quand on parcourt range()", "Jamais"], 1,
               "for parcourt une séquence connue ; while répète tant qu'une condition tient."),
    ],
    xp=120,
)

M2 = Level(
    id="a2l2", region="a2", number="2.2", title="L'écho de la grotte",
    notions=["H11", "H12", "H13", "H14"],
    story="""Au fond de la mine, une grotte renvoie l'**écho** de chaque son… qui renvoie un écho plus faible… qui renvoie un écho encore plus faible, jusqu'au silence.

Une fonction peut **s'appeler elle-même**. C'est la **récursion**.""",
    explanation="""Une fonction **récursive** s'appelle elle-même sur un problème **plus petit** :

```
def echo(n: int) -> None:
    if n == 0:
        print("Silence.")
        return
    print("Écho", n)
    echo(n - 1)
```

Deux ingrédients obligatoires :

- un **cas de base** qui s'arrête sans s'appeler (`n == 0`) ;
- un **appel récursif** qui se rapproche du cas de base (`n - 1`).

Sans cas de base, les appels s'empilent jusqu'à `RecursionError`. Regarde la **pile d'appels** dans le monde : chaque appel ajoute un bloc, chaque retour en retire un.

Tout ce qu'une boucle fait, une récursion peut le faire, et inversement : ce sont deux versions, **itérative** et **récursive**, du même comportement.

**`return` ou `print` ?** `print` affiche pour l'humain ; `return` **renvoie** une valeur au code qui a appelé la fonction, qui peut s'en servir pour calculer. Une fonction récursive qui calcule combine les résultats renvoyés : `return n + somme(n - 1)`.

Pour la récursion, on peut aussi utiliser une **fonction auxiliaire** (éventuellement définie à l'intérieur de la fonction principale) ou un **paramètre par défaut** (`def f(n: int, depart: int = 1)`).""",
    demo={"main.py": '''def echo(n: int) -> None:
    if n == 0:
        print("Silence.")
        return
    print("Écho", n)
    echo(n - 1)


def somme(n: int) -> int:
    if n == 0:
        return 0
    return n + somme(n - 1)


echo(3)
print("1 + 2 + 3 =", somme(3))
'''},
    demo_notes=["Observe la tour de la pile d'appels monter jusqu'à echo(0), puis redescendre.",
                "Pour somme, regarde les valeurs renvoyées remonter : 0, puis 1, puis 3, puis 6."],
    experiments=["Supprime le `return` de la ligne 4. Que se passe-t-il ?",
                 "Appelle `echo(-1)`. Pourquoi ça ne s'arrête jamais ?"],
    mission_title="Le signal de redstone",
    mission="""Dans `redstone.py` :

- **`signal_recursif(force: int) -> None`** affiche `Signal f` pour f = force, force − 3, force − 6… tant que f est strictement positif, puis `Signal éteint.` — **sans aucune boucle** ;
- **`signal_iteratif(force: int) -> None`** produit exactement le même affichage, **avec une boucle** ;
- **`blocs_pyramide(etages: int) -> int`** renvoie (sans rien afficher) le nombre de blocs d'une pyramide dont l'étage k contient k × k blocs : 1 + 4 + 9 + … Pour 0 étage : 0. **Récursive, sans boucle.**

Exemple pour une force de 7 : `Signal 7`, `Signal 4`, `Signal 1`, `Signal éteint.`""",
    starter={
        "redstone.py": "# Écris tes fonctions ici.\n",
        "main.py": HELPER_NOTE + '''from redstone import blocs_pyramide, signal_iteratif, signal_recursif

force = int(input("Force du signal : "))
signal_recursif(force)
signal_iteratif(force)
print("Pyramide de 4 étages :", blocs_pyramide(4), "blocs")
''',
    },
    readonly=["main.py"],
    stdin=["7"],
    checks=[
        dynamic("rec", "`signal_recursif` affiche la bonne suite", '''
mod = __import__("redstone")
for f in (7, 0, 1, 3, rng.randint(4, 40)):
    want = "".join(f"Signal {x}\\n" for x in range(f, 0, -3)) + "Signal éteint.\\n"
    _, out = capture(mod.signal_recursif, f)
    if out != want:
        fail(f"signal_recursif({f}) a affiché :\\n{out}\\nAttendu :\\n{want}")
''', locate="signal_recursif"),
        dynamic("same", "Les deux versions affichent la même chose", '''
mod = __import__("redstone")
for f in (7, 0, 2, rng.randint(5, 50)):
    _, a = capture(mod.signal_recursif, f)
    _, b = capture(mod.signal_iteratif, f)
    if a != b:
        fail(f"Force {f} : les deux versions diffèrent.\\nRécursive :\\n{a}\\nItérative :\\n{b}")
''', locate="signal_iteratif"),
        dynamic("pyr", "`blocs_pyramide` renvoie le bon nombre", '''
mod = __import__("redstone")
for n in (0, 1, 2, 4, rng.randint(5, 25)):
    want = sum(k * k for k in range(1, n + 1))
    got, out = capture(mod.blocs_pyramide, n)
    if got != want:
        fail(f"blocs_pyramide({n}) renvoie {got!r}, attendu {want}.")
    if out:
        fail("blocs_pyramide ne doit rien afficher : elle RENVOIE le résultat.")
''', locate="blocs_pyramide"),
        static("r1", "`signal_recursif` est récursive", "is_recursive",
               name="signal_recursif", file="redstone.py"),
        static("r2", "`signal_recursif` n'a pas de boucle", "no_loop_in",
               name="signal_recursif", file="redstone.py"),
        static("r3", "`signal_iteratif` utilise une boucle", "uses_loop_in",
               name="signal_iteratif", file="redstone.py"),
        static("r4", "`blocs_pyramide` est récursive sans boucle",
               "no_loop_in", name="blocs_pyramide", file="redstone.py"),
        static("r5", "`blocs_pyramide` s'appelle elle-même", "is_recursive",
               name="blocs_pyramide", file="redstone.py"),
    ],
    hints=[
        "Quel est le cas de base du signal : pour quelle force n'affiche-t-on plus que « Signal éteint. » ?",
        "Pour la pyramide de n étages : si tu connais déjà la pyramide de n − 1 étages, que faut-il ajouter ?",
        "La pyramide doit RENVOYER un nombre : comment combiner `return` et l'appel récursif ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
def f(n: int) -> None:
    if n == 0:
        return
    print("aller", n)
    f(n - 1)
    print("retour", n)


f(2)
''', "Les « retour » s'affichent en remontant la pile : dans l'ordre inverse des « aller »."),
        predict("Que va afficher ce programme ?", '''
def compte(n: int) -> int:
    if n <= 1:
        return 1
    return n * compte(n - 1)


print(compte(4))
''', "4 × 3 × 2 × 1 : chaque appel multiplie le résultat renvoyé par le suivant."),
        choice("Que se passe-t-il si une fonction récursive n'a pas de cas de base ?",
               ["Elle renvoie None", "Elle s'arrête au bout de 10 appels",
                "Les appels s'empilent jusqu'à une RecursionError", "Python l'optimise"], 2,
               "Rien n'arrête l'empilement des appels."),
        explain("Explique la différence entre afficher un résultat (print) et le renvoyer (return), en t'appuyant sur blocs_pyramide.",
                "print montre une valeur à l'écran ; return la rend au code appelant, qui peut s'en servir (pour l'additionner, la stocker…). La récursion de la pyramide a besoin des valeurs renvoyées."),
    ],
    xp=150,
)

M3 = Level(
    id="a2l3", region="a2", number="2.3", title="Boss : le Golem du registre",
    boss=True, notions=["H15", "H16", "H17", "G5", "G8", "H14"],
    story="""Le **Golem du registre** garde l'entrée de la ville. Il refuse tout nom mal écrit, et tout code dont les fonctions ne disent pas **ce qu'elles reçoivent** et **ce qu'elles renvoient**.

Pour passer, il faut un code typé, propre, et des textes parfaitement formatés.""",
    explanation="""**Annotations de type** (type hints) : on écrit le type attendu de chaque paramètre et du retour.

```
def formater(nom: str, niveau: int) -> str:
```

Python ne les vérifie **pas** à l'exécution ; c'est **mypy** qui contrôle, sans lancer le programme, que les types sont cohérents. Une fonction sans retour est annotée `-> None`.

**Méthodes de chaînes** utiles (elles renvoient une **nouvelle** chaîne, l'originale ne change pas) :

- `"  steve ".strip()` → `"steve"` (retire les espaces au début et à la fin)
- `"Steve".lower()` / `.upper()` → `"steve"` / `"STEVE"`
- `"creeper".capitalize()` → `"Creeper"`
- `"a b c".replace(" ", "_")` → `"a_b_c"`
- `texte[:16]` → les 16 premiers caractères
- `"mage" in ("guerrier", "mage")` → `True`

flake8 vérifie le style (lignes de 79 caractères maximum, espaces, lignes vides…). Le bouton **Analyse qualité** lance une revue et les vrais outils s'ils sont installés.""",
    demo={"main.py": '''def presenter(nom: str, points: int) -> str:
    propre = nom.strip().capitalize()
    return propre + " a " + str(points) + " points"


phrase = presenter("  alex ", 12)
print(phrase)
print(phrase.upper())
print("Longueur :", len(phrase))
'''},
    demo_notes=["Regarde que `nom` n'est pas modifié : strip() et capitalize() créent de nouvelles chaînes."],
    experiments=["Appelle `presenter(12, \"alex\")`. Que dit Python ? Que dirait mypy (Analyse qualité) ?"],
    mission_title="Le registre des aventuriers",
    mission="""Dans `registre.py`, avec des **annotations de type complètes** :

- **`formater_pseudo(pseudo: str) -> str`** renvoie le pseudo nettoyé : sans espaces au début ni à la fin, en minuscules, avec les espaces intérieurs remplacés par `_`, coupé à **16 caractères** maximum ;
- **`afficher_badge(pseudo: str, niveau: int, classe: str) -> None`** : si la classe est `guerrier`, `mage` ou `archer` (en minuscules), affiche `[Classe] pseudo - niveau N` avec la classe en majuscule initiale et le pseudo **formaté** ; sinon, affiche **uniquement** `Classe inconnue`.

Exemple : `afficher_badge("  Dark Knight ", 7, "guerrier")` affiche `[Guerrier] dark_knight - niveau 7`.""",
    starter={
        "registre.py": "# Écris tes fonctions ici, avec leurs annotations.\n",
        "main.py": HELPER_NOTE + '''from registre import afficher_badge, formater_pseudo

print(formater_pseudo("  Ender Dragon Slayer 3000 "))
afficher_badge("  Dark Knight ", 7, "guerrier")
afficher_badge("alex", 3, "boulanger")
''',
    },
    readonly=["main.py"],
    checks=[
        dynamic("fmt", "`formater_pseudo` nettoie correctement", '''
mod = __import__("registre")
cases = {"  Dark Knight ": "dark_knight", "STEVE": "steve",
         "  Ender Dragon Slayer 3000 ": "ender_dragon_sla", "a b  c": "a_b__c",
         "x": "x"}
for raw, want in cases.items():
    got, out = capture(mod.formater_pseudo, raw)
    if got != want:
        fail(f"formater_pseudo({raw!r}) renvoie {got!r}, attendu {want!r}.")
    if out:
        fail("formater_pseudo doit renvoyer le texte, pas l'afficher.")
''', locate="formater_pseudo"),
        dynamic("badge", "`afficher_badge` affiche le bon badge", '''
mod = __import__("registre")
for classe in ("guerrier", "mage", "archer"):
    lvl = rng.randint(1, 99)
    _, out = capture(mod.afficher_badge, "  Big Boss ", lvl, classe)
    want = f"[{classe.capitalize()}] big_boss - niveau {lvl}"
    if out.strip() != want:
        fail(f"Classe {classe} : obtenu {out.strip()!r}, attendu {want!r}.")
for classe in ("boulanger", "Mage", ""):
    _, out = capture(mod.afficher_badge, "x", 1, classe)
    if out.strip() != "Classe inconnue":
        fail(f"Classe {classe!r} : seul « Classe inconnue » doit s'afficher, obtenu {out.strip()!r}.")
''', locate="afficher_badge"),
        static("typed", "Toutes les fonctions sont annotées", "typed",
               file="registre.py"),
        static("only", "registre.py ne contient que des fonctions",
               "only_functions", file="registre.py"),
        static("naming", "Noms en snake_case", "naming", file="registre.py"),
    ],
    hints=[
        "Pour formater, enchaîne les méthodes dans un ordre réfléchi : faut-il couper à 16 avant ou après avoir retiré les espaces ?",
        "Le badge utilise le pseudo formaté : as-tu déjà une fonction qui fait ça ?",
        "« Mage » avec une majuscule n'est pas une classe valide : compare la chaîne telle quelle.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
nom = "  creeper "
propre = nom.strip().capitalize()
print(propre)
print("[" + nom + "]")
''', "Les méthodes de chaînes renvoient une nouvelle chaîne : nom n'a pas changé."),
        predict("Que va afficher ce programme ?", '''
def double(x: int) -> int:
    return x * 2


print(double(3), double("ha"))
''', "Python n'applique pas les annotations : c'est mypy qui signalerait l'erreur."),
        choice("Qui vérifie les annotations de type ?",
               ["Python, à l'exécution", "mypy, sans exécuter le programme",
                "flake8", "Personne, elles sont décoratives"], 1,
               "mypy analyse le code ; flake8 vérifie le style."),
    ],
    xp=200,
    bonus="Bonus : passe l'Analyse qualité sans aucune remarque.",
)

REGION_PRAIRIE = Region(
    id="a1", name="La Prairie des Premiers Pas",
    subtitle="Fonctions, variables, entrées, calculs, conditions",
    theme="village", reward="Lanterne — débloque les Mines de l'Écho",
    levels=[A1, VARIABLES, A3, A4], act=1, icon="🏮",
)

REGION_MINES = Region(
    id="a2", name="Les Mines de l'Écho",
    subtitle="Boucles, récursion, chaînes et annotations de type",
    theme="mine", reward="Pioche en bois — ouvre l'Acte II",
    levels=[M1, M2, M3], act=1, icon="⛏",
)
