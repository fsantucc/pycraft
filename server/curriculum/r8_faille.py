"""Acte III — Les Terres Instables (sujet python02) : exceptions."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

E1 = Level(
    id="x1l1", region="x1", number="", title="Le capteur fêlé",
    notions=["X1", "X2", "X3"],
    story="""Bienvenue dans les **Terres Instables**. Ici, les capteurs se fissurent, les données arrivent abîmées et les machines tombent en panne.

Jusqu'ici, la moindre erreur faisait **exploser** ton programme. Un vrai système doit **encaisser** l'erreur et continuer.""",
    explanation="""Quand Python rencontre un problème, il **lève une exception** (`ValueError`, `ZeroDivisionError`…). Si personne ne l'attrape, le programme s'arrête.

On peut l'**attraper** avec `try` / `except` :

```
try:
    valeur = int(texte)
    print("Lu :", valeur)
except ValueError as erreur:
    print("Lecture impossible :", erreur)
print("On continue")
```

- Le bloc `try` s'exécute normalement… jusqu'à la première exception.
- Si l'exception correspond au type indiqué, Python **saute** dans le bloc `except` ; le reste du `try` est abandonné.
- `as erreur` donne accès à l'exception ; `str(erreur)` ou `print(erreur)` affiche son message.
- Après le `except`, le programme **continue** normalement.

On attrape un type **précis** (`ValueError`) plutôt que tout (`Exception`), pour ne pas cacher des bugs qu'on n'avait pas prévus.

Dans le monde : un **éclair rouge** quand l'exception est levée, un **filet** quand elle est attrapée. Le journal indique quelle fonction l'a levée et où elle a été rattrapée.""",
    demo={"main.py": '''def demo() -> None:
    for texte in ("8", "huit", "2"):
        try:
            nombre = int(texte)
            print(texte, "→ moitié :", nombre / 2)
        except ValueError as erreur:
            print(texte, "→ illisible :", erreur)
    print("Le programme n'a pas planté.")


if __name__ == "__main__":
    demo()
'''},
    demo_notes=["Pas à pas sur « huit » : la ligne du print de la moitié est sautée.",
                "Regarde l'éclair (levée) puis le filet (rattrapage) dans le monde."],
    experiments=[],
    mission_title="La sonde de profondeur",
    mission="""Dans `main.py` :

- **`lire_profondeur(mesure: str) -> int`** convertit la mesure en entier et la renvoie. Elle ne gère **pas** l'erreur elle-même.
- **`tester_sonde() -> None`** essaie les mesures `"12"`, `"douze"`, `"40"` et `"4x"`. Pour chaque mesure, elle affiche `Mesure '12' : profondeur 12 blocs`, ou bien, si la conversion échoue, `Mesure 'douze' rejetée : <message de l'erreur>`. Pour finir, elle affiche `La sonde fonctionne toujours.`
- Le programme principal (garde `__main__`) appelle `tester_sonde()`.""",
    starter={"main.py": "# La sonde de profondeur\n"},
    checks=[
        dynamic("read", "`lire_profondeur` convertit et laisse passer l'erreur", '''
f = ns.get("lire_profondeur")
if not callable(f):
    fail("`lire_profondeur` est introuvable.")
for t in ("12", "0", "250"):
    if f(t) != int(t):
        fail(f"lire_profondeur({t!r}) doit renvoyer {int(t)}.")
try:
    f("douze")
except ValueError:
    pass
else:
    fail("lire_profondeur('douze') doit lever ValueError : c'est l'appelant qui décide quoi faire.")
''', locate="lire_profondeur"),
        dynamic("out", "Le test affiche chaque résultat et continue", '''
out = rerun()
want = ["Mesure '12' : profondeur 12 blocs",
        "Mesure 'douze' rejetée : invalid literal for int() with base 10: 'douze'",
        "Mesure '40' : profondeur 40 blocs",
        "Mesure '4x' rejetée : invalid literal for int() with base 10: '4x'",
        "La sonde fonctionne toujours."]
lines = [l.strip() for l in out.splitlines() if l.strip()]
if lines != want:
    fail("Affichage attendu :\\n" + "\\n".join(want) + "\\nObtenu :\\n" + out)
'''),
        static("try", "`tester_sonde` utilise try / except", "has_node",
               node="Try", name="tester_sonde"),
        static("guard", "Le programme principal est protégé par le garde",
               "main_guard"),
        static("typed", "Fonctions annotées", "typed"),
    ],
    hints=[
        "Où doit se trouver le try : dans la fonction qui convertit, ou dans celle qui teste ?",
        "Quel type d'exception `int(\"douze\")` lève-t-il ? Lance le code sans try pour le lire dans la console.",
        "Le message de l'erreur s'obtient avec `except ... as e` puis `e`.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
try:
    print("A")
    x = int("zut")
    print("B")
except ValueError:
    print("C")
print("D")
''', "Dès l'exception, le reste du try est sauté."),
        predict("Que va afficher ce programme ?", '''
try:
    print(10 / 2)
except ZeroDivisionError:
    print("division impossible")
print("fin")
''', "Pas d'exception : le except n'est jamais exécuté."),
        choice("Pourquoi éviter `except Exception:` partout ?",
               ["C'est plus lent", "Ça cache aussi les erreurs qu'on n'avait pas prévues (bugs)",
                "C'est interdit par Python", "Ça ne marche pas"], 1,
               "On attrape ce qu'on sait gérer ; le reste doit rester visible."),
    ],
    xp=130,
)

E2 = Level(
    id="x1l2", region="x1", number="", title="Les seuils de la pile",
    notions=["X4", "X5", "X6"],
    story="""Un coffre automatique trie les objets en **piles**. Une pile contient au moins 1 objet et jamais plus de 64. Quand un nombre est valide mais **absurde**, aucune exception de Python ne se déclenche… c'est à toi d'en lever une.""",
    explanation="""On peut **lever** soi-même une exception avec `raise` :

```
def regler(vitesse: int) -> int:
    if vitesse < 0:
        raise ValueError(f"{vitesse} : vitesse négative")
    return vitesse
```

- `raise` arrête **immédiatement** la fonction, comme un `return`… mais en signalant un problème.
- L'exception **remonte** la pile d'appels : la fonction appelante, puis celle qui l'a appelée… jusqu'au premier `try` / `except` qui l'attrape.
- Le message passé à l'exception est celui que l'on récupère avec `as e`.

C'est la bonne manière de séparer les rôles : la fonction qui **détecte** le problème lève, celle qui **sait quoi faire** attrape.

Dans le monde, suis l'éclair : il part de la fonction qui lève et remonte jusqu'au filet.""",
    demo={"main.py": '''def regler(vitesse: int) -> int:
    if vitesse < 0:
        raise ValueError(f"{vitesse} : vitesse négative")
    return vitesse


def piloter(vitesse: int) -> None:
    print("Vitesse réglée à", regler(vitesse))


def main() -> None:
    for v in (3, -2):
        try:
            piloter(v)
        except ValueError as e:
            print("Refus :", e)


if __name__ == "__main__":
    main()
'''},
    demo_notes=["L'exception levée dans `regler` traverse `piloter` sans s'y arrêter, puis est attrapée dans `main`."],
    experiments=[],
    mission_title="Le trieur de piles",
    mission="""Dans `main.py` :

- **`lire_pile(texte: str) -> int`** convertit le texte en entier, puis : si le nombre est inférieur à 1, lève `ValueError` avec le message `N : une pile contient au moins 1 objet` ; s'il dépasse 64, lève `ValueError` avec `N : une pile ne dépasse pas 64 objets` (N = le nombre). Sinon, renvoie le nombre.
- **`trier() -> None`** essaie `"16"`, `"abc"`, `"0"`, `"64"`, `"65"` et `"-5"` : affiche `Pile de N objets` ou `Erreur : <message>`, puis `Tri terminé sans plantage.`
- Le garde `__main__` appelle `trier()`.""",
    starter={"main.py": "# Le trieur de piles\n"},
    checks=[
        dynamic("valid", "Les piles valides sont acceptées", '''
f = ns.get("lire_pile")
if not callable(f):
    fail("`lire_pile` est introuvable.")
for t in ("1", "64", "16", str(rng.randint(2, 63))):
    if f(t) != int(t):
        fail(f"lire_pile({t!r}) doit renvoyer {int(t)}.")
'''),
        dynamic("raise", "Les piles invalides lèvent ValueError avec le bon message", '''
f = ns["lire_pile"]
cases = {"0": "0 : une pile contient au moins 1 objet",
         "-5": "-5 : une pile contient au moins 1 objet",
         "65": "65 : une pile ne dépasse pas 64 objets",
         "999": "999 : une pile ne dépasse pas 64 objets"}
for t, msg in cases.items():
    try:
        f(t)
    except ValueError as e:
        if str(e) != msg:
            fail(f"lire_pile({t!r}) : message {str(e)!r}, attendu {msg!r}.")
    else:
        fail(f"lire_pile({t!r}) doit lever ValueError.")
try:
    f("abc")
except ValueError:
    pass
else:
    fail("lire_pile('abc') doit lever ValueError (celle de int()).")
''', locate="lire_pile"),
        dynamic("out", "Le tri affiche chaque résultat", '''
out = rerun()
want = ["Pile de 16 objets",
        "Erreur : invalid literal for int() with base 10: 'abc'",
        "Erreur : 0 : une pile contient au moins 1 objet",
        "Pile de 64 objets",
        "Erreur : 65 : une pile ne dépasse pas 64 objets",
        "Erreur : -5 : une pile contient au moins 1 objet",
        "Tri terminé sans plantage."]
lines = [l.strip() for l in out.splitlines() if l.strip()]
if lines != want:
    fail("Attendu :\\n" + "\\n".join(want) + "\\nObtenu :\\n" + out)
'''),
        static("raise_node", "`lire_pile` utilise raise", "has_node",
               node="Raise", name="lire_pile"),
        static("guard", "Garde `__main__`", "main_guard"),
        static("typed", "Fonctions annotées", "typed"),
    ],
    hints=[
        "Dans lire_pile, l'ordre compte : il faut d'abord un nombre pour pouvoir le comparer.",
        "Un f-string permet de mettre le nombre dans le message de l'exception.",
        "lire_pile ne doit rien attraper : qui affiche « Erreur : … » ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
def verifier(n: int) -> int:
    if n > 3:
        raise ValueError("trop grand")
    print("ok", n)
    return n


for x in (2, 5, 1):
    try:
        verifier(x)
    except ValueError as e:
        print("refus :", e)
''', "raise interrompt verifier(5) avant le print ; la boucle continue avec 1."),
        predict("Que va afficher ce programme ?", '''
def a() -> None:
    raise ValueError("boum")


def b() -> None:
    a()
    print("jamais affiché")


try:
    b()
except ValueError as e:
    print("attrapé :", e)
''', "L'exception traverse b() sans exécuter la suite."),
        explain("Pourquoi `lire_pile` lève-t-elle une exception au lieu d'afficher elle-même un message d'erreur ?",
                "Elle détecte le problème mais ne sait pas comment le traiter : l'appelant décide (afficher, réessayer, ignorer…). Ses résultats restent fiables : soit un nombre valide, soit une exception."),
    ],
    xp=150,
)

E3 = Level(
    id="x1l3", region="x1", number="", title="La machine aux six leviers",
    notions=["X7", "X8", "X14"],
    story="""Dans une salle oubliée, une machine porte **six leviers rouillés**. Chacun déclenche une panne différente. Pour la réparer, il faut d'abord savoir **reconnaître** chaque panne.""",
    explanation="""Python a une **famille** d'exceptions, chacune pour un type de problème :

| Exception | Quand |
|---|---|
| `ValueError` | bonne sorte de valeur, mauvais contenu : `int("abc")` |
| `ZeroDivisionError` | division par zéro |
| `TypeError` | types incompatibles : `"bloc" + 3` |
| `KeyError` | clé absente d'un dictionnaire : `{"or": 1}["fer"]` |
| `IndexError` | index hors de la liste : `[1, 2][5]` |
| `FileNotFoundError` | fichier introuvable : `open("absent.txt")` |

On peut écrire **plusieurs `except`** après un même `try` : Python prend le premier qui correspond.

```
try:
    ...
except ValueError as e:
    print("Valeur :", e)
except ZeroDivisionError as e:
    print("Division :", e)
```

Ou attraper **plusieurs types d'un coup** avec un tuple : `except (KeyError, IndexError) as e:`.

Pour connaître le nom d'une exception sans `type()`, on peut aussi utiliser `e.__class__.__name__`.

`open("fichier.txt")` ouvre un fichier en lecture. Dans PyCraft, seuls tes propres fichiers existent : tout autre nom lève `FileNotFoundError`.""",
    demo={"main.py": '''def risque(n: int) -> None:
    if n == 0:
        print(int("abc"))
    elif n == 1:
        print(5 / 0)
    else:
        print([1, 2, 3][9])


for n in range(3):
    try:
        risque(n)
    except ValueError as e:
        print("Valeur :", e)
    except ZeroDivisionError as e:
        print("Division :", e)
    except (KeyError, IndexError) as e:
        print("Accès :", e.__class__.__name__, e)
'''},
    demo_notes=["Chaque tour lève une exception différente : regarde quel except la récupère."],
    experiments=[],
    mission_title="Réparer la machine",
    mission="""Dans `main.py` :

- **`actionner(levier: int) -> str`** contient du code **volontairement fautif** : le levier 0 lève `ValueError`, 1 `ZeroDivisionError`, 2 `FileNotFoundError` (ouvre `coffre_secret.txt`), 3 `TypeError`, 4 `KeyError`, 5 `IndexError`. Ces erreurs doivent venir d'opérations réelles qui échouent (pas de `raise`). Tout autre levier renvoie `"Mécanisme OK"`.
- **`inspecter() -> None`** actionne les leviers 0 à 6. Pour chaque levier, affiche `Levier N : <NomDeLException> - <message>` ou `Levier N : Mécanisme OK`. Utilise **au moins 4 blocs except** et **au moins un except qui attrape plusieurs types** grâce à un tuple. `type()` est interdit.
- Le garde `__main__` appelle `inspecter()`.

*mypy signalera le TypeError volontaire : c'est normal, c'est son rôle.*""",
    starter={"main.py": "# La machine aux six leviers\n"},
    checks=[
        dynamic("types", "Chaque levier provoque la bonne exception", '''
f = ns.get("actionner")
if not callable(f):
    fail("`actionner` est introuvable.")
want = [ValueError, ZeroDivisionError, FileNotFoundError, TypeError,
        KeyError, IndexError]
for n, kind in enumerate(want):
    try:
        f(n)
    except kind:
        continue
    except Exception as e:
        fail(f"Levier {n} : {e.__class__.__name__} au lieu de {kind.__name__}.")
    fail(f"Levier {n} : aucune exception, attendu {kind.__name__}.")
for n in (6, 7, 42):
    try:
        r = f(n)
    except Exception as e:
        fail(f"Levier {n} : ne doit rien lever ({e.__class__.__name__}).")
    if r != "Mécanisme OK":
        fail(f"Levier {n} doit renvoyer 'Mécanisme OK'.")
''', locate="actionner"),
        dynamic("out", "L'inspection nomme chaque panne et continue", '''
out = rerun()
names = ["ValueError", "ZeroDivisionError", "FileNotFoundError", "TypeError",
         "KeyError", "IndexError"]
lines = [l.strip() for l in out.splitlines() if l.strip()]
for n, name in enumerate(names):
    if not any(l.startswith(f"Levier {n} : {name} - ") for l in lines):
        fail(f"Il manque une ligne « Levier {n} : {name} - ... ».\\n{out}")
if "Levier 6 : Mécanisme OK" not in lines:
    fail("Il manque « Levier 6 : Mécanisme OK ».")
'''),
        static("noraise", "Les pannes viennent d'opérations réelles (pas de raise)",
               "lacks_node", node="Raise", name="actionner"),
        static("handlers", "Au moins 4 blocs except", "count_handlers",
               name="inspecter", min=4),
        static("tuple", "Un except attrape plusieurs types (tuple)",
               "except_tuple", name="inspecter"),
        static("notype", "`type()` n'est pas utilisé", "no_call",
               call="type", message="`type()` est interdit : utilise des except séparés ou e.__class__.__name__."),
        static("guard", "Garde `__main__`", "main_guard"),
    ],
    hints=[
        "Pour chaque exception du tableau, trouve une ligne de Python très courte qui la provoque.",
        "Dans inspecter, le message vient de `e` ; le nom, de l'except qui l'a attrapée (ou de e.__class__.__name__).",
        "Quels types peux-tu regrouper dans un même except parce que tu les traites pareil ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
stock = {"fer": 3}
for cle in ("fer", "or"):
    try:
        print(stock[cle])
    except KeyError as e:
        print("absent :", e)
''', "Le message d'une KeyError est la clé, entre guillemets."),
        predict("Que va afficher ce programme ?", '''
try:
    print([10, 20][1])
    print([10, 20][2])
except (IndexError, KeyError) as e:
    print(e.__class__.__name__)
''', "Le premier accès marche, le second lève IndexError."),
        choice("Dans quel ordre Python examine-t-il plusieurs except ?",
               ["Au hasard", "Du premier au dernier, il prend le premier qui correspond",
                "Le plus précis d'abord, quel que soit l'ordre", "Tous sont exécutés"], 1,
               "D'où l'importance de mettre les cas précis avant les cas généraux."),
    ],
    xp=150,
)

E4 = Level(
    id="x1l4", region="x1", number="", title="Forger ses propres erreurs",
    notions=["X9", "X10", "X11", "D1", "D5"],
    story="""Les ingénieurs de la redstone en ont assez des `ValueError` qui ne disent rien. Ils veulent des erreurs qui parlent **leur** langue : *circuit ouvert*, *surcharge*…

Bonne nouvelle : une exception est une **classe**. Et tu sais créer des classes.""",
    explanation="""Une exception personnalisée est une classe qui **hérite** d'`Exception` :

```
class RedstoneError(Exception):
    def __init__(self, message: str = "Panne de redstone") -> None:
        super().__init__(message)
```

- `raise RedstoneError()` utilise le message **par défaut** ; `raise RedstoneError("Fil coupé")` en donne un autre.
- `super().__init__(message)` transmet le message à `Exception` : c'est lui que `str(e)` renverra.
- On peut créer une **hiérarchie** : `class SurchargeError(RedstoneError)`. Toute `SurchargeError` **est aussi** une `RedstoneError`.

Conséquence : `except RedstoneError` attrape **toutes** les erreurs de la famille. On choisit le niveau de précision au moment d'attraper.

Une exception peut porter des **attributs** en plus du message (`self.puissance = puissance`), comme n'importe quel objet.

Dans le monde, une exception personnalisée apparaît comme un **bloc de TNT** créé à partir de son plan.""",
    demo={"main.py": '''class MineError(Exception):
    def __init__(self, message: str = "Problème dans la mine") -> None:
        super().__init__(message)


class EboulementError(MineError):
    def __init__(self, message: str = "Éboulement !") -> None:
        super().__init__(message)


for erreur in (MineError(), EboulementError(), EboulementError("Galerie 3 bloquée")):
    try:
        raise erreur
    except MineError as e:
        print(e.__class__.__name__, ":", e)
'''},
    demo_notes=["Les deux plans sont reliés par l'héritage (fil doré).",
                "Un seul `except MineError` attrape les deux types."],
    experiments=[],
    mission_title="Le circuit de redstone",
    mission="""Dans `main.py` :

- `RedstoneError(Exception)`, message par défaut `Panne de redstone` ;
- `CircuitOuvertError(RedstoneError)`, message par défaut `Circuit ouvert` ;
- `SurchargeError(RedstoneError)` : `__init__(self, message: str = "Surcharge du circuit", puissance: int = 0)`, qui garde la puissance dans l'attribut `puissance` ;
- **`alimenter(puissance: int) -> str`** : 0 → lève `CircuitOuvertError()` ; plus de 15 → lève `SurchargeError(f"Puissance {puissance} trop forte", puissance)` ; négatif → lève `RedstoneError()` ; sinon renvoie `Lampe allumée (N)` ;
- **`diagnostic() -> None`** teste 8, 0, 20 et -1 : attrape d'abord **séparément** `CircuitOuvertError` et `SurchargeError`, puis montre dans une seconde boucle qu'un seul `except RedstoneError` les attrape toutes.""",
    starter={"main.py": "# Le circuit de redstone\n"},
    checks=[
        dynamic("tree", "La famille d'erreurs est bien construite", '''
R, C, S = need_class("RedstoneError"), need_class("CircuitOuvertError"), need_class("SurchargeError")
if not issubclass(R, Exception) or R.__bases__ != (Exception,):
    fail("RedstoneError doit hériter directement d'Exception.")
if not issubclass(C, R) or not issubclass(S, R):
    fail("CircuitOuvertError et SurchargeError doivent hériter de RedstoneError.")
'''),
        dynamic("msg", "Messages par défaut et personnalisés", '''
R, C, S = need_class("RedstoneError"), need_class("CircuitOuvertError"), need_class("SurchargeError")
for cls, msg in ((R, "Panne de redstone"), (C, "Circuit ouvert"), (S, "Surcharge du circuit")):
    if str(cls()) != msg:
        fail(f"str({cls.__name__}()) vaut {str(cls())!r}, attendu {msg!r}.")
    if str(cls("Autre message")) != "Autre message":
        fail(f"{cls.__name__}('Autre message') doit garder ce message.")
s = S("x", 33)
if getattr(s, "puissance", None) != 33 or getattr(S(), "puissance", None) != 0:
    fail("SurchargeError doit garder `puissance` (0 par défaut).")
'''),
        dynamic("feed", "`alimenter` lève la bonne erreur", '''
R, C, S = need_class("RedstoneError"), need_class("CircuitOuvertError"), need_class("SurchargeError")
f = ns["alimenter"]
if f(8) != "Lampe allumée (8)" or f(15) != "Lampe allumée (15)":
    fail("alimenter(8) doit renvoyer 'Lampe allumée (8)' (et 15 est encore valide).")
for p, kind in ((0, C), (16, S), (40, S), (-3, R)):
    try:
        f(p)
    except kind as e:
        if kind is S and (e.puissance != p or str(e) != f"Puissance {p} trop forte"):
            fail(f"alimenter({p}) : SurchargeError mal construite.")
        if kind is R and type(e) is not R:
            fail("Une puissance négative doit lever RedstoneError elle-même.")
    else:
        fail(f"alimenter({p}) doit lever {kind.__name__}.")
''', locate="alimenter"),
        static("separate", "`diagnostic` a des except séparés", "count_handlers",
               name="diagnostic", min=3),
        static("typed", "Fonctions et méthodes annotées", "typed"),
    ],
    hints=[
        "Que transmet `super().__init__(message)` à Exception ? Que renvoie ensuite str(e) ?",
        "Pour SurchargeError, le constructeur a deux paramètres avec valeurs par défaut : lequel va au parent, lequel est gardé ?",
        "Dans alimenter, l'ordre des tests compte-t-il ? Que vaut 0 : circuit ouvert ou négatif ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class A(Exception):
    pass


class B(A):
    pass


try:
    raise B("panne")
except A as e:
    print("attrapé par A :", e)
''', "B hérite de A : except A attrape aussi les B."),
        choice("Pourquoi créer ses propres exceptions ?",
               ["Pour aller plus vite", "Pour nommer précisément les problèmes de son domaine et pouvoir les attraper par famille",
                "Parce que les exceptions intégrées sont dépréciées", "Pour éviter try/except"], 1,
               "Un nom précis documente le problème ; la hiérarchie permet de choisir le niveau d'attrapage."),
        explain("Explique, avec ton circuit, comment l'héritage permet d'attraper toutes les erreurs de redstone en une seule ligne.",
                "CircuitOuvertError et SurchargeError héritent de RedstoneError, donc sont des RedstoneError : except RedstoneError les attrape toutes."),
    ],
    xp=170,
)

E5 = Level(
    id="x1l5", region="x1", number="", title="Le rituel de fermeture",
    notions=["X12", "X13"],
    story="""Un **portail** vers une autre dimension reste dangereux tant qu'il est ouvert. Quoi qu'il arrive pendant l'expédition, même une catastrophe, le gardien doit **toujours** le refermer.""",
    explanation="""Le bloc `finally` s'exécute **toujours** à la fin d'un `try`, qu'il y ait eu une exception ou non, et même si le `try` ou le `except` fait un `return` :

```
def expedition() -> None:
    print("Ouverture")
    try:
        traverser()
    except PortailError as e:
        print("Alerte :", e)
        return
    finally:
        print("Fermeture")
```

C'est l'endroit idéal pour **libérer une ressource** : refermer un fichier, couper une machine, refermer un portail. Sans `finally`, une erreur ou un `return` anticipé pourrait laisser la ressource ouverte.

En bonus, `else:` (placé après les `except`) ne s'exécute que si **aucune** exception n'a eu lieu.""",
    demo={"main.py": '''def tester(n: int) -> str:
    try:
        if n == 0:
            raise ValueError("zéro interdit")
        return "ok"
    except ValueError as e:
        print("erreur :", e)
        return "échec"
    finally:
        print("finally pour", n)


print(tester(1))
print(tester(0))
'''},
    demo_notes=["Même avec un `return`, le finally s'exécute AVANT que la fonction ne rende la main."],
    experiments=[],
    mission_title="L'expédition dans le Nether",
    mission="""Dans `main.py` :

- `class TraverseeError(Exception)` ;
- **`traverser(joueur: str) -> None`** : si le nom n'est pas fait uniquement de lettres ou de chiffres (pense à `str.isalnum()`), lève `TraverseeError(f"Voyageur refusé : '{joueur}'")` ; sinon affiche `joueur traverse le portail` ;
- **`expedition(groupe: list[str]) -> None`** affiche `Ouverture du portail`, fait traverser chaque joueur ; à la **première** erreur, affiche `Alerte : <message>` puis `Expédition interrompue` et **quitte immédiatement la fonction** ; dans tous les cas, affiche `Fermeture du portail` en dernier, grâce à un `finally` ;
- le programme principal lance une expédition valide `["Alex", "Steve", "Noor"]`, puis une expédition avec un intrus `["Alex", "??", "Noor"]`, puis affiche `Le portail est bien refermé.`""",
    starter={"main.py": "# L'expédition dans le Nether\n"},
    checks=[
        dynamic("ok", "Expédition sans incident", '''
f = ns.get("expedition")
if not callable(f):
    fail("`expedition` est introuvable.")
_, out = capture(f, ["Alex", "Bo"])
want = ["Ouverture du portail", "Alex traverse le portail", "Bo traverse le portail", "Fermeture du portail"]
lines = [l.strip() for l in out.splitlines() if l.strip()]
if lines != want:
    fail("Attendu :\\n" + "\\n".join(want) + "\\nObtenu :\\n" + out)
'''),
        dynamic("bad", "Un intrus arrête l'expédition, le portail se referme", '''
f = ns["expedition"]
_, out = capture(f, ["Alex", "x y", "Noor"])
want = ["Ouverture du portail", "Alex traverse le portail",
        "Alerte : Voyageur refusé : 'x y'", "Expédition interrompue",
        "Fermeture du portail"]
lines = [l.strip() for l in out.splitlines() if l.strip()]
if lines != want:
    fail("Attendu :\\n" + "\\n".join(want) + "\\nObtenu :\\n" + out)
'''),
        dynamic("error", "`traverser` lève TraverseeError", '''
T = need_class("TraverseeError")
try:
    ns["traverser"]("")
except T as e:
    if str(e) != "Voyageur refusé : ''":
        fail(f"Message : {str(e)!r}")
else:
    fail("traverser('') doit lever TraverseeError.")
'''),
        static("finally", "`expedition` utilise finally", "has_finally",
               name="expedition"),
        static("return", "L'expédition s'interrompt avec return", "has_node",
               node="Return", name="expedition",
               message="`expedition` doit quitter la fonction avec return en cas d'erreur."),
        dynamic("main", "Le programme principal se termine bien", '''
out = rerun()
if not out.strip().endswith("Le portail est bien refermé."):
    fail("La dernière ligne doit être « Le portail est bien refermé. »")
if out.count("Fermeture du portail") != 2:
    fail("Le portail doit être refermé après chacune des deux expéditions.")
'''),
    ],
    hints=[
        "Où placer le print de fermeture pour qu'il s'exécute même après un return ?",
        "La boucle sur les joueurs doit être dans le try : pourquoi ?",
        "« Quitter immédiatement la fonction » : quelle instruction fait ça ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
def f() -> str:
    try:
        return "dans try"
    finally:
        print("finally d'abord")


print(f())
''', "Le finally s'exécute avant que la valeur ne soit rendue à l'appelant."),
        predict("Que va afficher ce programme ?", '''
try:
    print("A")
except ValueError:
    print("B")
else:
    print("C")
finally:
    print("D")
''', "Pas d'exception : else puis finally."),
        explain("Pourquoi faut-il libérer les ressources dans un finally plutôt qu'à la fin du try ?",
                "Si une exception ou un return survient, la fin du try n'est jamais atteinte ; le finally s'exécute toujours, la ressource est donc toujours libérée."),
    ],
    xp=160,
)

E6 = Level(
    id="x1l6", region="x1", number="", title="Boss : la Tempête de données",
    boss=True, notions=["X1", "X3", "X4", "X6", "X9", "X10", "X11", "X12"],
    story="""Une **tempête** brouille toutes les transmissions. Les rapports des capteurs arrivent mal formés, hors limites, ou illisibles. Ton système doit trier le bon grain de l'ivraie… **sans jamais tomber**.""",
    explanation="""Ce boss assemble tout : exceptions personnalisées en famille, levée au bon endroit, transformation d'une erreur intégrée en erreur de ton domaine, attrapage par famille, bilan dans un `finally`.

Astuce : pour transformer une erreur, on attrape l'erreur intégrée et on lève la sienne :

```
try:
    valeur = int(texte)
except ValueError:
    raise FormatError(f"Valeur illisible : '{texte}'")
```""",
    demo={"main.py": '''class CapteurError(Exception):
    pass


try:
    try:
        int("??")
    except ValueError:
        raise CapteurError("valeur illisible")
except CapteurError as e:
    print("Capteur :", e)
'''},
    demo_notes=[], experiments=[],
    mission_title="Le trieur de rapports",
    mission="""Dans `main.py` :

- `MesureError(Exception)` (défaut `Mesure invalide`), `FormatError(MesureError)` (défaut `Format invalide`), `HorsLimiteError(MesureError)` (défaut `Valeur hors limites`) ;
- **`analyser(rapport: str) -> int`** : le rapport a la forme `capteur=valeur`. S'il n'y a pas exactement un `=`, ou si le nom du capteur est vide, lève `FormatError(f"Rapport mal formé : '{rapport}'")`. Si la valeur n'est pas un entier, lève `FormatError(f"Valeur illisible : '{valeur}'")`. Si elle n'est pas entre -50 et 50 inclus, lève `HorsLimiteError(f"{valeur} hors de [-50, 50]")`. Sinon renvoie la valeur ;
- **`traiter(rapports: list[str]) -> int`** analyse chaque rapport, affiche `Rejet : <message>` pour chaque `MesureError`, et renvoie le nombre de rapports valides. Elle affiche **toujours** en dernier `Bilan : V valides sur T` grâce à un `finally`, et ne plante jamais à cause d'un rapport.""",
    starter={"main.py": "# Le trieur de rapports\n"},
    checks=[
        dynamic("family", "La famille d'erreurs", '''
M, F, H = need_class("MesureError"), need_class("FormatError"), need_class("HorsLimiteError")
if not (issubclass(F, M) and issubclass(H, M) and issubclass(M, Exception)):
    fail("FormatError et HorsLimiteError doivent hériter de MesureError.")
for cls, msg in ((M, "Mesure invalide"), (F, "Format invalide"), (H, "Valeur hors limites")):
    if str(cls()) != msg:
        fail(f"Message par défaut de {cls.__name__} : {str(cls())!r}")
'''),
        dynamic("parse", "`analyser` lève la bonne erreur", '''
M, F, H = need_class("MesureError"), need_class("FormatError"), need_class("HorsLimiteError")
f = ns["analyser"]
for r, v in (("temp=12", 12), ("vent=-50", -50), ("t=50", 50), ("x=0", 0)):
    if f(r) != v:
        fail(f"analyser({r!r}) doit renvoyer {v}.")
cases = [("temp12", F, "Rapport mal formé : 'temp12'"), ("a=b=c", F, "Rapport mal formé : 'a=b=c'"),
         ("=4", F, "Rapport mal formé : '=4'"), ("t=douze", F, "Valeur illisible : 'douze'"),
         ("t=51", H, "51 hors de [-50, 50]"), ("t=-80", H, "-80 hors de [-50, 50]")]
for r, kind, msg in cases:
    try:
        f(r)
    except kind as e:
        if str(e) != msg:
            fail(f"analyser({r!r}) : message {str(e)!r}, attendu {msg!r}.")
    except Exception as e:
        fail(f"analyser({r!r}) a levé {e.__class__.__name__} au lieu de {kind.__name__}.")
    else:
        fail(f"analyser({r!r}) doit lever {kind.__name__}.")
''', locate="analyser"),
        dynamic("storm", "La tempête : `traiter` ne tombe jamais", '''
f = ns["traiter"]
pool = ["t=1", "t=99", "x", "v=abc", "=3", "h=-50", "a=b=c", "z=7", "", "q=50"]
for _ in range(5):
    batch = [rng.choice(pool) for _ in range(rng.randint(0, 9))]
    good = sum(1 for r in batch if r in ("t=1", "h=-50", "z=7", "q=50"))
    got, out = capture(f, batch)
    if got != good:
        fail(f"traiter({batch}) doit renvoyer {good}, obtenu {got!r}.")
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    if not lines or lines[-1] != f"Bilan : {good} valides sur {len(batch)}":
        fail(f"La dernière ligne doit être « Bilan : {good} valides sur {len(batch)} ».\\n{out}")
    if sum(l.startswith("Rejet : ") for l in lines) != len(batch) - good:
        fail("Chaque rapport rejeté doit afficher « Rejet : <message> ».")
'''),
        static("finally", "`traiter` utilise finally", "has_finally",
               name="traiter"),
        static("typed", "Tout est annoté", "typed"),
    ],
    hints=[
        "Pour vérifier le format, `rapport.split(\"=\")` te donne une liste : combien d'éléments doit-elle contenir ?",
        "Dans `traiter`, un seul except suffit-il pour toutes tes erreurs ? Lequel ?",
        "Le bilan est dans un finally : où placer ce try pour qu'il entoure toute la boucle ?",
    ],
    quiz=[
        explain("Dans ton trieur, quelle fonction lève, quelle fonction attrape, et pourquoi ce partage des rôles est-il sain ?",
                "analyser détecte et lève des erreurs précises ; traiter les attrape par famille (MesureError), les affiche et continue. Chacune a une seule responsabilité."),
    ],
    xp=300,
)

REGION = Region(
    id="x1", name="Les Terres Instables",
    subtitle="Exceptions : try, except, raise, finally, erreurs personnalisées",
    theme="faille", reward="Bouclier anti-tempête — ouvre l'Acte IV",
    levels=[E1, E2, E3, E4, E5, E6], act=3, icon="⚡",
)
