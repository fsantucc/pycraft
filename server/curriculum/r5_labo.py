"""Région 5 — Le Laboratoire des Ingénieurs : méthodes statiques et de classe."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

L1 = Level(
    id="r5l1", region="r5", number="5.1", title="La calculatrice de redstone",
    notions=["E1", "E5", "E6"],
    story="""Au **Laboratoire des Ingénieurs**, une ingénieure calcule la puissance d'un signal de redstone. Pour ça, elle construit à chaque fois un circuit entier… juste pour faire une soustraction.

*« Ce calcul ne dépend d'aucun circuit en particulier. Pourquoi faudrait-il en construire un ? »*""",
    explanation="""Une **méthode statique** est une fonction rangée dans une classe parce qu'elle **concerne** ce sujet, mais qui n'a besoin **ni d'un objet, ni de la classe** pour fonctionner :

```
class Redstone:
    @staticmethod
    def signal_after(distance: int) -> int:
        return max(0, 15 - distance)


print(Redstone.signal_after(4))
```

- pas de `self` : elle ne lit aucun attribut d'objet ;
- on l'appelle **sur la classe**, sans créer d'objet ;
- on peut aussi l'appeler depuis un objet (`self.signal_after(...)`), ça marche pareil.

Le décorateur `@staticmethod` est la forme moderne. Le programme accepte aussi la forme fonction : écrire la fonction puis `signal_after = staticmethod(signal_after)` dans la classe.

Dans le monde, le **plan** s'active seul avec un engrenage : aucune créature n'est nécessaire.""",
    demo={"main.py": '''class Redstone:
    @staticmethod
    def signal_after(distance: int) -> int:
        return max(0, 15 - distance)

    def __init__(self, length: int) -> None:
        self.length = length

    def output(self) -> int:
        return self.signal_after(self.length)


print(Redstone.signal_after(4))
print(Redstone.signal_after(20))
wire = Redstone(9)
print(wire.output())
'''},
    demo_notes=[
        "Lignes 13-14 : aucun objet dans le monde, seul le plan travaille.",
        "Ligne 16 : l'objet réutilise la méthode statique pour son propre calcul.",
    ],
    experiments=[
        "Retire `@staticmethod` puis appelle `Redstone.signal_after(4)`. Lis l'erreur.",
        "Ajoute `self` en premier paramètre de signal_after (avec le décorateur). Que reçoit-il ?",
    ],
    mission_title="Le portail du Nether",
    mission="""Crée une classe `NetherPortal` :

- méthode **statique** `is_valid_frame(width: int, height: int) -> bool` : un cadre est valide si la largeur est entre 4 et 23 inclus et la hauteur entre 5 et 23 inclus ;
- méthode **statique** `obsidian_needed(width: int, height: int) -> int` : nombre de blocs d'un cadre complet, soit `2 × largeur + 2 × (hauteur − 2)` ;
- `__init__(self, width: int, height: int)` ;
- `light()` affiche si **ce** portail peut s'allumer et combien d'obsidienne il coûte, **en réutilisant les deux méthodes statiques**.

Dans le programme, appelle au moins une méthode statique **sans créer de portail**.""",
    starter={"main.py": '''# Le portail du Nether
'''},
    checks=[
        static("k1", "`is_valid_frame` est statique", "method_kind",
               cls="NetherPortal", name="is_valid_frame", kind="static"),
        static("k2", "`obsidian_needed` est statique", "method_kind",
               cls="NetherPortal", name="obsidian_needed", kind="static"),
        dynamic("valid", "`is_valid_frame` sans aucun portail", '''
P = need_class("NetherPortal")
cases = [(4, 5), (3, 5), (4, 4), (23, 23), (24, 10), (10, 24), (23, 5)]
cases += [(rng.randint(0, 30), rng.randint(0, 30)) for _ in range(25)]
for w, h in cases:
    want = 4 <= w <= 23 and 5 <= h <= 23
    got = P.is_valid_frame(w, h)
    if got is not want:
        fail(f"is_valid_frame({w}, {h}) renvoie {got!r}, attendu {want}.")
'''),
        dynamic("obs", "`obsidian_needed` sans aucun portail", '''
P = need_class("NetherPortal")
for w, h in ((4, 5), (6, 7), (23, 23)):
    want = 2 * w + 2 * (h - 2)
    if P.obsidian_needed(w, h) != want:
        fail(f"obsidian_needed({w}, {h}) : attendu {want}.")
'''),
        dynamic("light", "`light()` réutilise les calculs", '''
P = need_class("NetherPortal")
p = P(5, 6)
_, out = capture(p.light)
if str(2 * 5 + 2 * 4) not in out:
    fail(f"light() d'un portail 5×6 doit indiquer 18 obsidiennes : {out.strip()!r}")
p2 = P(2, 3)
_, out2 = capture(p2.light)
if out2.strip() == out.strip():
    fail("light() doit distinguer un portail valide d'un portail invalide.")
''', locate="NetherPortal.light"),
    ],
    hints=[
        "Une méthode statique a-t-elle besoin de `self` ? Que mets-tu juste au-dessus de son `def` ?",
        "Dans `light()`, tu as accès à la largeur et la hauteur de ce portail. Comment appelles-tu une méthode statique depuis un objet ?",
        "Une condition « entre 4 et 23 inclus » peut s'écrire en une seule comparaison chaînée en Python.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Clock:
    @staticmethod
    def ticks(minutes: int) -> int:
        return minutes * 1200


c = Clock()
print(Clock.ticks(2), c.ticks(1))
''', "Une méthode statique s'appelle aussi bien sur la classe que sur un objet."),
        choice("Quand choisir une méthode statique ?",
               ["Quand la méthode modifie l'objet",
                "Quand le calcul concerne le sujet de la classe mais n'utilise ni l'objet ni la classe",
                "Quand on veut créer un objet",
                "Pour rendre la méthode privée"], 1,
               "Pas de self, pas de cls : seulement les paramètres."),
        explain("Explique à un évaluateur pourquoi `is_valid_frame` est statique et pas une méthode d'instance.",
                "Elle répond à partir des seuls paramètres et doit pouvoir servir avant de construire un portail ; elle ne lit aucun attribut."),
    ],
    xp=130,
)

L2 = Level(
    id="r5l2", region="r5", number="5.2", title="Les moules alternatifs",
    notions=["E2", "E4", "E7", "E8"],
    story="""L'alchimiste du laboratoire reçoit sans arrêt les mêmes commandes : *« une fiole d'eau, s'il vous plaît »*, ou des recettes notées sur un parchemin sous la forme `nom:durée:force`.

À chaque fois, il doit déchiffrer et appeler le constructeur à la main. Il veut des **moules alternatifs** : d'autres façons de fabriquer une potion.""",
    explanation="""Une **méthode de classe** reçoit automatiquement la **classe** (et non un objet) dans son premier paramètre, appelé `cls` :

```
class Potion:
    def __init__(self, name: str, duration: int) -> None:
        self.name = name
        self.duration = duration

    @classmethod
    def water(cls) -> "Potion":
        return cls("Fiole d'eau", 0)
```

`Potion.water()` fabrique une potion **sans connaître ses détails** : c'est un **constructeur alternatif**. Il est très utile pour créer un objet « anonyme » ou par défaut, ou un objet à partir d'un autre format (un texte, un dictionnaire…).

Pourquoi `cls(...)` et pas `Potion(...)` ? Parce que les enfants **héritent** de la méthode de classe. `SplashPotion.water()` reçoit `cls = SplashPotion` et fabrique donc une `SplashPotion`. Avec `Potion(...)` écrit en dur, on fabriquerait toujours une potion de base.

Dans le monde, le plan s'allume en bleu et un **rayon** part du plan vers l'objet créé par `cls()`.""",
    demo={"main.py": '''class Potion:
    def __init__(self, name: str, duration: int) -> None:
        self.name = name
        self.duration = duration

    @classmethod
    def water(cls) -> "Potion":
        return cls("Fiole d'eau", 0)


class SplashPotion(Potion):
    pass


basic = Potion.water()
splash = SplashPotion.water()
print(type(basic).__name__, type(splash).__name__)
'''},
    demo_notes=[
        "Pendant `SplashPotion.water()`, l'inspecteur montre `cls = SplashPotion`.",
        "Le rayon bleu va du plan vers la nouvelle potion : c'est `cls(...)` qui l'a créée.",
    ],
    experiments=[
        "Remplace `cls(` par `Potion(` dans water. Quel type obtient `splash` ?",
    ],
    mission_title="L'officine de l'alchimiste",
    mission="""Crée une classe `Potion(name: str, duration: int, strength: int)` (attributs du même nom), avec :

- une méthode de classe `water()` qui crée une potion « anonyme » : nom au choix, durée 0, force 0 ;
- une méthode de classe `from_recipe(recipe: str)` qui crée une potion à partir d'un texte `"nom:durée:force"` (par exemple `"Vitesse:180:2"`) ;
- `describe()`.

Puis `SplashPotion(Potion)` avec un attribut supplémentaire `radius: int` qui vaut **3 par défaut** (paramètre optionnel de son constructeur).

`SplashPotion.from_recipe("Poison:45:1")` doit produire une **SplashPotion**.""",
    starter={"main.py": '''# L'officine de l'alchimiste
'''},
    checks=[
        static("k1", "`water` est une méthode de classe", "method_kind",
               cls="Potion", name="water", kind="class"),
        static("k2", "`from_recipe` est une méthode de classe",
               "method_kind", cls="Potion", name="from_recipe", kind="class"),
        dynamic("water", "`water()` fabrique une potion neutre", '''
P = need_class("Potion")
w = P.water()
if not isinstance(w, P) or w.duration != 0 or w.strength != 0:
    fail("Potion.water() doit renvoyer une Potion de durée 0 et force 0.")
'''),
        dynamic("recipe", "`from_recipe()` déchiffre le parchemin", '''
P = need_class("Potion")
name = rng.choice(["Vitesse", "Force", "Saut"]) + str(rng.randint(1, 9))
d, s = rng.randint(10, 600), rng.randint(1, 3)
p = P.from_recipe(f"{name}:{d}:{s}")
if (p.name, p.duration, p.strength) != (name, d, s):
    fail(f"from_recipe('{name}:{d}:{s}') a donné "
         f"{(p.name, p.duration, p.strength)}. Les nombres doivent être des int.")
'''),
        dynamic("child", "Les enfants héritent des moules alternatifs", '''
P, S = need_class("Potion"), need_class("SplashPotion")
if not issubclass(S, P):
    fail("SplashPotion doit hériter de Potion.")
s = S.from_recipe("Poison:45:1")
if type(s) is not S:
    fail(f"SplashPotion.from_recipe(...) a créé un {type(s).__name__}. "
         "Le moule alternatif doit utiliser la classe reçue.")
if s.radius != 3 or s.duration != 45:
    fail("Une SplashPotion créée par from_recipe doit avoir un rayon 3.")
if type(S.water()) is not S:
    fail("SplashPotion.water() doit créer une SplashPotion.")
'''),
    ],
    hints=[
        "Quel est le premier paramètre d'une méthode de classe, et que contient-il quand on appelle `SplashPotion.water()` ?",
        "Pour découper `\"Vitesse:180:2\"`, cherche la méthode de chaîne `split`. Quel type ont les morceaux obtenus ?",
        "Pour que `SplashPotion(name, duration, strength)` fonctionne sans rayon, que doit avoir le paramètre `radius` ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Egg:
    def __init__(self, kind: str) -> None:
        self.kind = kind

    @classmethod
    def mystery(cls) -> "Egg":
        return cls("?")


class GoldenEgg(Egg):
    pass


e = GoldenEgg.mystery()
print(type(e).__name__, e.kind)
''', "cls vaut GoldenEgg : c'est un œuf doré qui est créé."),
        choice("Que reçoit `cls` dans `Potion.water()` ?",
               ["Une potion", "La classe Potion", "Rien", "Le texte 'water'"], 1,
               "Une méthode de classe reçoit la classe sur laquelle on l'appelle."),
        explain("Explique pourquoi `return cls(...)` est meilleur que `return Potion(...)` dans une méthode de classe.",
                "cls est la classe réellement utilisée à l'appel ; les sous-classes obtiennent ainsi des objets de leur propre type sans réécrire la méthode."),
    ],
    xp=150,
    going_further="Pour aller plus loin (hors programme du PDF) : un attribut de classe (`count = 0` écrit dans le corps de la classe) est partagé par tous les objets ; une méthode de classe peut le lire avec `cls.count`.",
)

L3 = Level(
    id="r5l3", region="r5", number="5.3", title="Boss : l'Illager alchimiste",
    boss=True, notions=["E1", "E2", "E3", "B7"],
    story="""L'**Illager alchimiste** a mélangé toutes les étiquettes du laboratoire. Personne ne sait plus quelle méthode a besoin d'un chaudron, laquelle a besoin du plan, et laquelle n'a besoin de rien.

Cette fois, la mission ne te dit pas quel type de méthode utiliser. **À toi de choisir**, et de savoir le justifier.""",
    explanation="""Les trois genres de méthodes :

| Genre | Premier paramètre | Appel typique | Usage |
|---|---|---|---|
| d'instance | `self` (l'objet) | `cauldron.fill(2)` | lire / modifier **un** objet |
| de classe | `cls` (la classe) | `Cauldron.starter()` | fabriquer un objet, travailler au niveau de la classe |
| statique | aucun | `Cauldron.ticks(3)` | outil lié au sujet, indépendant de tout objet |

Pose-toi la question : *« De quoi cette méthode a-t-elle besoin pour faire son travail ? »*""",
    demo={"main.py": '''class Cauldron:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.level = 0


pot = Cauldron(3)
print(pot.capacity)
'''},
    demo_notes=[], experiments=[],
    mission_title="Le chaudron démêlé",
    mission="""Complète une classe `Cauldron(capacity: int)` (attributs `capacity` et `level`, `level` à 0 au départ). **Choisis toi-même** le genre de chaque méthode :

- `minutes_to_ticks(minutes: int) -> int` : convertit des minutes en ticks de jeu (1 minute = 1200 ticks). Doit marcher sans aucun chaudron ;
- `starter_kit()` : fabrique un chaudron de capacité 3 **déjà plein**. Un enfant de Cauldron qui l'utilise doit obtenir un objet de son propre type ;
- `fill(amount: int) -> int` : remplit **ce** chaudron sans dépasser sa capacité et **renvoie ce qui a débordé** ;
- `is_full() -> bool`.

Crée aussi une classe `CopperCauldron(Cauldron)` vide (`pass`), et prouve dans ton programme que `CopperCauldron.starter_kit()` donne un chaudron de cuivre.""",
    starter={"main.py": '''# Le chaudron démêlé
'''},
    checks=[
        static("k1", "Bon genre pour `minutes_to_ticks`", "method_kind",
               cls="Cauldron", name="minutes_to_ticks", kind="static"),
        static("k2", "Bon genre pour `starter_kit`", "method_kind",
               cls="Cauldron", name="starter_kit", kind="class"),
        static("k3", "Bon genre pour `fill`", "method_kind",
               cls="Cauldron", name="fill", kind="instance"),
        dynamic("ticks", "Conversion sans chaudron", '''
C = need_class("Cauldron")
for m in (0, 1, 7):
    if C.minutes_to_ticks(m) != m * 1200:
        fail(f"minutes_to_ticks({m}) : attendu {m * 1200}.")
'''),
        dynamic("kit", "Le kit de départ respecte la lignée", '''
C, K = need_class("Cauldron"), need_class("CopperCauldron")
k = K.starter_kit()
if type(k) is not K or k.capacity != 3 or not k.is_full():
    fail("CopperCauldron.starter_kit() doit renvoyer un CopperCauldron plein de capacité 3.")
'''),
        dynamic("fill", "`fill` renvoie le débordement", '''
C = need_class("Cauldron")
for _ in range(10):
    cap, a, b = rng.randint(1, 8), rng.randint(0, 6), rng.randint(0, 6)
    c = C(cap)
    o1 = c.fill(a)
    o2 = c.fill(b)
    lvl = min(cap, a + b)
    if c.level != lvl or o1 + o2 != a + b - lvl or c.is_full() is not (lvl == cap):
        fail(f"Capacité {cap}, fill({a}) puis fill({b}) : niveau {c.level}, "
             f"débordements {o1} et {o2}.")
'''),
    ],
    hints=[
        "Pour chaque méthode, demande-toi : a-t-elle besoin d'UN chaudron précis ? de la classe ? de rien ?",
        "« Un enfant doit obtenir un objet de son propre type » : quel paramètre te donne ce type ?",
        "Pour `fill`, calcule d'abord combien de place il reste.",
    ],
    quiz=[
        choice("Une méthode doit convertir des degrés en ticks de chauffe, sans rapport avec un chaudron particulier. Quel genre ?",
               ["Instance", "Classe", "Statique"], 2,
               "Elle n'a besoin que de son paramètre."),
        choice("Une méthode crée un chaudron rempli d'eau bénite pour n'importe quelle sous-classe. Quel genre ?",
               ["Instance", "Classe", "Statique"], 1,
               "Elle fabrique un objet du type sur lequel on l'appelle : cls."),
        explain("Sans regarder ton code, explique la différence entre les trois genres de méthodes, avec un exemple pour chacun.",
                "Instance : travaille sur un objet via self ; classe : reçoit la classe via cls, typiquement pour créer des objets ; statique : ne reçoit ni l'un ni l'autre, simple fonction rangée dans la classe."),
    ],
    xp=240,
)

REGION = Region(
    id="r5", name="Le Laboratoire des Ingénieurs",
    subtitle="Méthodes statiques et méthodes de classe", theme="labo",
    reward="Comparateur de redstone — débloque la Tour des Architectes",
    levels=[L1, L2, L3],
)
