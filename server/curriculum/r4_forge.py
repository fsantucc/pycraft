"""Région 4 — La Forge des Lignées : héritage, super(), redéfinition."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

L1 = Level(
    id="r4l1", region="r4", number="4.1", title="L'arbre des lignées",
    notions=["D1", "D2", "D3", "D4", "D12"],
    story="""La **Forge des Lignées** est gardée par un vieux forgeron qui recopie, pour chaque créature, les mêmes lignes : un nom, des points de vie, une méthode de description… Une erreur dans l'une, et il doit la corriger partout.

*« Les vaches, les araignées, les loups : ce sont toutes des **créatures**. Pourquoi tout réécrire ? »*""",
    explanation="""L'**héritage** permet à une classe **enfant** de récupérer tout ce que définit une classe **parente** :

```
class Animal:
    def __init__(self, name: str) -> None:
        self.name = name

    def breathe(self) -> None:
        print(f"{self.name} respire")


class Wolf(Animal):
    def howl(self) -> None:
        print(f"{self.name} hurle")
```

`Wolf(Animal)` se lit « Wolf **est un** Animal ». Un loup a le constructeur et `breathe()` de son parent, **plus** sa propre méthode `howl()` : c'est la **spécialisation**.

Quand on appelle `wolf.breathe()`, Python cherche la méthode dans `Wolf`, ne la trouve pas, remonte dans `Animal` et l'exécute avec `self` = le loup.

Le parent, lui, ne connaît pas les ajouts de ses enfants : un `Animal` n'a pas de `howl()`.

- `isinstance(rex, Animal)` → `True` : un loup est un animal ;
- `issubclass(Wolf, Animal)` → `True`, mais `issubclass(Animal, Wolf)` → `False`.

Dans le monde, un **fil doré** relie le plan enfant au plan parent, et le modèle 3D de l'enfant hérite de celui du parent.""",
    demo={"main.py": '''class Animal:
    def __init__(self, name: str) -> None:
        self.name = name

    def breathe(self) -> None:
        print(f"{self.name} respire")


class Wolf(Animal):
    def howl(self) -> None:
        print(f"{self.name} hurle à la lune")


rex = Wolf("Rex")
rex.breathe()
rex.howl()
print(isinstance(rex, Animal), issubclass(Animal, Wolf))
'''},
    demo_notes=[
        "Le plan Wolf est relié au plan Animal : ouvre l'onglet Diagramme.",
        "`rex.breathe()` : la méthode exécutée est définie dans Animal (fil doré), mais `self` est rex.",
        "`Wolf(\"Rex\")` utilise le constructeur hérité d'Animal.",
    ],
    experiments=[
        "Crée `generic = Animal(\"Bob\")` et appelle `generic.howl()`. Pourquoi l'erreur ?",
        "Ajoute une classe `Fox(Animal)` sans aucune ligne dans son corps (juste `pass`). Que sait faire un renard ?",
    ],
    mission_title="Le bestiaire",
    mission="""Crée une classe parente `Mob` :

- `__init__(self, name: str, health: int)` qui crée les attributs `name` et `health` ;
- `describe()` affiche le nom et la vie ;
- `take_damage(amount: int)` diminue la vie (minimum 0).

Puis deux enfants **sans constructeur propre et sans réécrire `describe`** :

- `Cow(Mob)` ajoute `give_milk()` qui affiche un message avec le nom de la vache ;
- `Spider(Mob)` ajoute `climb(height: int)` qui affiche un message avec le nom et la hauteur.

Crée une vache et une araignée, appelle sur chacune une méthode héritée et sa méthode propre.""",
    starter={"main.py": '''# Le bestiaire
'''},
    checks=[
        static("cow_inh", "`Cow` hérite de `Mob`", "inherits", cls="Cow",
               parent="Mob"),
        static("spider_inh", "`Spider` hérite de `Mob`", "inherits",
               cls="Spider", parent="Mob"),
        static("no_init", "`Cow` ne réécrit pas le constructeur",
               "method_not_redefined", cls="Cow", name="__init__"),
        static("no_init2", "`Spider` ne réécrit pas le constructeur",
               "method_not_redefined", cls="Spider", name="__init__"),
        static("no_desc", "Personne ne réécrit `describe`",
               "method_not_redefined", cls="Spider", name="describe"),
        dynamic("inherited", "Les enfants utilisent les méthodes héritées", '''
Mob, Cow, Spider = need_class("Mob"), need_class("Cow"), need_class("Spider")
name = "Bessie" + str(rng.randint(1, 99))
c = Cow(name, 12)
_, out = capture(c.describe)
if name not in out or "12" not in out:
    fail(f"Cow({name!r}, 12).describe() a affiché {out.strip()!r}.")
capture(c.take_damage, 20)
if c.health != 0:
    fail("take_damage(20) sur une vache à 12 PV doit donner 0.")
''', locate="Mob"),
        dynamic("special", "Chaque enfant a sa spécialité, le parent non", '''
Mob, Cow, Spider = need_class("Mob"), need_class("Cow"), need_class("Spider")
need_method(Cow, "give_milk")
need_method(Spider, "climb")
if hasattr(Mob, "give_milk") or hasattr(Mob, "climb"):
    fail("Les méthodes spécialisées ne doivent pas être dans Mob.")
if hasattr(Spider, "give_milk"):
    fail("Une araignée ne devrait pas savoir donner du lait.")
s = Spider("Shelob", 16)
_, out = capture(s.climb, 9)
if "Shelob" not in out or "9" not in out:
    fail(f"climb(9) a affiché {out.strip()!r} : il manque le nom ou la hauteur.")
''', locate="Spider"),
    ],
    hints=[
        "Quelle syntaxe, à la ligne `class`, indique le parent ?",
        "Si `Cow` n'a pas de `__init__`, lequel Python utilisera-t-il quand tu écris `Cow(\"Bessie\", 12)` ?",
        "Où placer une méthode que seules les araignées doivent avoir ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Block:
    pass


class Ore(Block):
    pass


class Diamond(Ore):
    pass


d = Diamond()
print(isinstance(d, Block), issubclass(Block, Ore))
''', "Un diamant est un minerai, donc un bloc. Mais un bloc n'est pas forcément un minerai."),
        predict("Que va afficher ce programme ?", '''
class Mob:
    def sound(self) -> str:
        return "..."

    def speak(self) -> None:
        print(self.sound())


class Chicken(Mob):
    def cluck(self) -> str:
        return "cot"


Chicken().speak()
''', "speak et sound sont trouvés dans Mob ; Chicken ne les redéfinit pas."),
        explain("Explique comment Python trouve `rex.breathe()` quand `breathe` n'est pas écrit dans `Wolf`.",
                "Python cherche la méthode dans la classe de l'objet, puis remonte vers le parent ; il l'exécute avec self = l'objet."),
    ],
    xp=130,
)

L2 = Level(
    id="r4l2", region="r4", number="4.2", title="L'appel des ancêtres",
    notions=["D5", "D6", "D8"],
    story="""Les nouvelles créatures de la forge ont **plus** de caractéristiques que leurs ancêtres. Un bateau est un véhicule… avec des places assises. Le forgeron a voulu leur donner un constructeur à eux, et tout s'est cassé : les bateaux n'avaient plus de nom.

Il faut que l'enfant **demande au parent** de faire sa part.""",
    explanation="""Si un enfant définit son propre `__init__`, celui du parent **n'est plus appelé automatiquement**. Les attributs du parent ne sont alors jamais créés.

`super()` donne accès à la version **parente** des méthodes :

```
class Boat(Vehicle):
    def __init__(self, name: str, speed: int, seats: int) -> None:
        super().__init__(name, speed)
        self.seats = seats
```

1. `super().__init__(name, speed)` exécute le constructeur de `Vehicle` sur **ce** bateau : `name` et `speed` sont créés ;
2. puis l'enfant ajoute **ses** attributs.

Résultat : zéro ligne dupliquée. Si un jour `Vehicle` ajoute un attribut, tous les enfants en profitent.

Dans le monde, un **rayon doré** part de l'objet vers le plan parent pendant l'appel à `super()`.""",
    demo={"main.py": '''class Vehicle:
    def __init__(self, name: str, speed: int) -> None:
        self.name = name
        self.speed = speed


class Boat(Vehicle):
    def __init__(self, name: str, speed: int, seats: int) -> None:
        super().__init__(name, speed)
        self.seats = seats


raft = Boat("Radeau", 3, 2)
print(raft.name, raft.speed, raft.seats)
'''},
    demo_notes=[
        "Pas à pas : l'exécution entre dans Boat.__init__, puis saute dans Vehicle.__init__ (rayon doré), puis revient.",
        "Les attributs name et speed sont créés par le parent, seats par l'enfant.",
    ],
    experiments=[
        "Commente la ligne `super().__init__(name, speed)`. Quels attributs manquent ?",
        "Remplace super() par `Vehicle.__init__(self, name, speed)`. Fonctionne-t-il ? Pourquoi `super()` reste préférable ?",
    ],
    mission_title="Le garage du royaume",
    mission="""Crée :

- `Vehicle(name: str, speed: int)` avec `describe()` qui affiche nom et vitesse ;
- `Boat(Vehicle)` avec en plus `seats: int` ;
- `Minecart(Vehicle)` avec en plus `rail: str`.

Les constructeurs enfants **appellent le constructeur parent avec `super()`** et ne réaffectent jamais eux-mêmes `name` ou `speed`. Chaque enfant ajoute une méthode qui utilise son attribut propre (par exemple `board(passengers: int) -> bool` pour le bateau).""",
    starter={"main.py": '''# Le garage du royaume
'''},
    checks=[
        static("inh_b", "`Boat` hérite de `Vehicle`", "inherits", cls="Boat",
               parent="Vehicle"),
        static("inh_m", "`Minecart` hérite de `Vehicle`", "inherits",
               cls="Minecart", parent="Vehicle"),
        static("super_b", "`Boat.__init__` appelle `super().__init__`",
               "uses_super", cls="Boat", method="__init__"),
        static("super_m", "`Minecart.__init__` appelle `super().__init__`",
               "uses_super", cls="Minecart", method="__init__"),
        static("dup_b", "`Boat` ne duplique pas le code du parent",
               "no_duplicate_attrs", cls="Boat", parent="Vehicle"),
        static("dup_m", "`Minecart` ne duplique pas le code du parent",
               "no_duplicate_attrs", cls="Minecart", parent="Vehicle"),
        dynamic("attrs", "Les objets ont les attributs du parent et les leurs", '''
B, M = need_class("Boat"), need_class("Minecart")
b = B("Galion", 4, 12)
m = M("Wagon", 8, "powered")
for obj, want in ((b, {"name": "Galion", "speed": 4, "seats": 12}),
                  (m, {"name": "Wagon", "speed": 8, "rail": "powered"})):
    for key, value in want.items():
        if attrs(obj).get(key) != value:
            fail(f"{type(obj).__name__} : `{key}` vaut {attrs(obj).get(key)!r}, attendu {value!r}.")
_, out = capture(b.describe)
if "Galion" not in out:
    fail("describe() hérité doit fonctionner sur un bateau.")
'''),
    ],
    hints=[
        "Que doit faire le constructeur de Boat en tout premier ?",
        "Quels arguments le constructeur de Vehicle attend-il ? Où Boat les trouve-t-il ?",
        "Après l'appel au parent, que reste-t-il à faire dans le constructeur enfant ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Mob:
    def __init__(self, name: str) -> None:
        self.name = name


class Bat(Mob):
    def __init__(self, name: str, wings: int) -> None:
        self.wings = wings


b = Bat("Flap", 2)
print(hasattr(b, "wings"), hasattr(b, "name"))
''', "Le constructeur enfant remplace celui du parent : sans super(), name n'est jamais créé."),
        predict("Dans quel ordre les messages s'affichent-ils ?", '''
class A:
    def __init__(self) -> None:
        print("A")


class B(A):
    def __init__(self) -> None:
        print("B début")
        super().__init__()
        print("B fin")


B()
''', "super() est un appel normal : on entre dans A, puis on revient finir B."),
        explain("Un évaluateur te demande : « Que se passerait-il si on ajoutait un attribut `color` dans `Vehicle.__init__` ? » Réponds pour ta version avec super() et pour une version qui recopie le code.",
                "Avec super(), tous les enfants reçoivent color automatiquement ; avec du code recopié, il faudrait modifier chaque enfant et on risque d'en oublier."),
    ],
    xp=140,
)

L3 = Level(
    id="r4l3", region="r4", number="4.3", title="Redéfinir et prolonger",
    notions=["D7", "D9", "D10", "D11"],
    story="""À l'armurerie de la forge, chaque arme a sa fiche. Une épée enchantée est une arme, qui est un outil. Chaque génération veut **ajouter** des lignes à la fiche, sans recopier celles de ses ancêtres.""",
    explanation="""Un enfant peut **redéfinir** (override) une méthode du parent en écrivant une méthode du même nom. C'est alors sa version qui est utilisée pour ses objets.

Pour **prolonger** au lieu de remplacer, on appelle la version parente avec `super()`, qui marche sur **n'importe quelle méthode**, pas seulement `__init__` :

```
class Sword(Tool):
    def describe(self) -> None:
        super().describe()
        print(f"  Dégâts : {self.damage}")
```

Les lignées peuvent avoir **plusieurs niveaux** : `EnchantedSword(Sword)`, qui hérite de `Sword`, qui hérite de `Tool`. Avec `super()` à chaque étage, chaque génération ajoute sa part, de l'ancêtre au descendant.

Dans le monde, chaque étage de l'appel s'illumine sur son plan, de l'enfant vers l'ancêtre.""",
    demo={"main.py": '''class Tool:
    def __init__(self, name: str) -> None:
        self.name = name

    def describe(self) -> None:
        print(f"Outil : {self.name}")


class Sword(Tool):
    def __init__(self, name: str, damage: int) -> None:
        super().__init__(name)
        self.damage = damage

    def describe(self) -> None:
        super().describe()
        print(f"  Dégâts : {self.damage}")


blade = Sword("Lame de fer", 6)
blade.describe()
'''},
    demo_notes=[
        "`blade.describe()` exécute la version de Sword, qui délègue d'abord à Tool.",
        "Les deux affichages viennent de deux classes différentes, sur le même objet.",
    ],
    experiments=[
        "Retire `super().describe()` : qu'est-ce qui disparaît ?",
        "Dans Sword.describe, écris `self.describe()` au lieu de `super().describe()`. Que se passe-t-il, et pourquoi ?",
    ],
    mission_title="L'armurerie à trois étages",
    mission="""Crée une lignée à trois niveaux :

- `Tool(name: str, durability: int)` (attributs `name` et `durability`) : `describe()` affiche nom et durabilité ; `use()` retire 1 de durabilité (minimum 0) ;
- `Weapon(Tool)` ajoute `damage: int`. `describe()` **prolonge** celle de Tool en affichant les dégâts. `use()` **prolonge** celle de Tool en affichant les dégâts infligés ;
- `EnchantedWeapon(Weapon)` ajoute `enchantment: str`. `describe()` prolonge celle de Weapon en affichant l'enchantement.

Aucun texte ni aucun calcul du parent ne doit être recopié dans un enfant.""",
    starter={"main.py": '''# L'armurerie à trois étages
'''},
    checks=[
        static("inh1", "`Weapon` hérite de `Tool`", "inherits", cls="Weapon",
               parent="Tool"),
        static("inh2", "`EnchantedWeapon` hérite de `Weapon`", "inherits",
               cls="EnchantedWeapon", parent="Weapon"),
        static("s1", "`Weapon.describe` prolonge le parent", "uses_super",
               cls="Weapon", method="describe", calls="describe"),
        static("s2", "`EnchantedWeapon.describe` prolonge le parent",
               "uses_super", cls="EnchantedWeapon", method="describe",
               calls="describe"),
        static("s3", "`Weapon.use` prolonge le parent", "uses_super",
               cls="Weapon", method="use", calls="use"),
        dynamic("order", "La fiche complète s'affiche dans l'ordre", '''
E = need_class("EnchantedWeapon")
w = E("Excalibloc", 40, 9, "Fireflame")
_, out = capture(w.describe)
for part in ("Excalibloc", "40", "9", "Fireflame"):
    if part not in out:
        fail(f"La fiche ne contient pas {part!r} :\\n{out}")
if not (out.index("Excalibloc") < out.index("Fireflame")):
    fail("Les lignes de l'ancêtre doivent venir avant celles du descendant.")
''', locate="EnchantedWeapon.describe"),
        dynamic("use", "`use()` hérité sur trois niveaux", '''
E = need_class("EnchantedWeapon")
w = E("X", 2, 5, "Frost")
for _ in range(3):
    _, out = capture(w.use)
if w.durability != 0:
    fail(f"Durabilité 2 après 3 use() : attendu 0, obtenu {w.durability}.")
if "5" not in out:
    fail("use() d'une arme doit afficher les dégâts.")
''', locate="Weapon.use"),
    ],
    hints=[
        "Chaque étage du constructeur reçoit tous les arguments, transmet ceux de son parent avec super(), puis garde le sien.",
        "Pour prolonger une méthode, dans quel ordre placer l'appel au parent et le nouveau print ?",
        "EnchantedWeapon a-t-elle besoin de définir `use()` ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class A:
    def hello(self) -> None:
        print("A")


class B(A):
    def hello(self) -> None:
        print("B")
        super().hello()


class C(B):
    def hello(self) -> None:
        super().hello()
        print("C")


C().hello()
''', "C appelle B (qui affiche B puis appelle A), puis affiche C."),
        choice("Dans la lignée Tool → Weapon → EnchantedWeapon, `Weapon.describe` oublie d'appeler `super().describe()`. Que devient la fiche d'une arme enchantée ?",
               ["Complète", "Sans les lignes de Tool", "Sans les lignes de Weapon",
                "Erreur"], 1,
               "La chaîne est coupée à l'étage de Weapon : Tool.describe n'est jamais atteint."),
        explain("Quelle est la différence entre redéfinir une méthode et la prolonger ?",
                "Redéfinir remplace complètement la version du parent ; prolonger appelle la version du parent avec super() puis ajoute un comportement."),
    ],
    xp=150,
)

L4 = Level(
    id="r4l4", region="r4", number="4.4", title="Boss : le Wither aux trois têtes",
    boss=True, notions=["D1", "D5", "D7", "D8", "D10", "D11", "A9"],
    story="""Le **Wither** a trois têtes, et chacune attaque un étage différent de ta lignée. Pour le vaincre, toute la hiérarchie doit tenir : le parent, l'enfant et le petit-enfant.""",
    explanation="""Ce boss vérifie l'ensemble : héritage sur trois niveaux, `super()` dans les constructeurs et dans d'autres méthodes, redéfinitions qui prolongent, attributs qui évoluent quand on appelle des méthodes héritées.""",
    demo={"main.py": '''class Building:
    def __init__(self, name: str) -> None:
        self.name = name
        self.level = 1

    def upgrade(self) -> None:
        self.level += 1


b = Building("Halle")
for _ in range(2):
    b.upgrade()
print(b.level)
'''},
    demo_notes=[], experiments=[],
    mission_title="Le chantier du royaume",
    mission="""Crée :

- `Building(name: str, level: int)` : `upgrade()` augmente le niveau de 1 ; `describe()` affiche nom et niveau ;
- `Mine(Building)` : attribut `ore` qui commence à 0 ; `work(hours: int)` ajoute `level × hours` minerai ; `describe()` prolonge le parent avec le minerai ;
- `DeepMine(Mine)` : attribut `depth: int`. `work(hours)` **prolonge** celle de Mine en ajoutant un bonus de `(depth // 10) × hours` minerai ; `upgrade()` **prolonge** celle de Building en augmentant aussi `depth` de 5.

Simule une semaine (7 jours, 8 heures par jour) sur une mine profonde avec une boucle, en l'améliorant un jour sur deux.""",
    starter={"main.py": '''# Le chantier du royaume
'''},
    checks=[
        static("inh", "`DeepMine` hérite de `Mine`", "inherits", cls="DeepMine",
               parent="Mine"),
        static("inh2", "`Mine` hérite de `Building`", "inherits", cls="Mine",
               parent="Building"),
        static("sw", "`DeepMine.work` prolonge Mine", "uses_super",
               cls="DeepMine", method="work", calls="work"),
        static("su", "`DeepMine.upgrade` prolonge Building", "uses_super",
               cls="DeepMine", method="upgrade", calls="upgrade"),
        static("dup", "`DeepMine` ne duplique pas `Mine.__init__`",
               "no_duplicate_attrs", cls="DeepMine", parent="Mine"),
        dynamic("head1", "Tête 1 : Mine", '''
M = need_class("Mine")
m = M("Puits", 2)
capture(m.work, 3)
capture(m.upgrade)
capture(m.work, 1)
if (m.level, m.ore) != (3, 9):
    fail(f"Mine niveau 2, work(3), upgrade(), work(1) : niveau {m.level}, "
         f"minerai {m.ore}. Attendu 3 et 9.")
'''),
        dynamic("head2", "Tête 2 : DeepMine", '''
D = need_class("DeepMine")
for _ in range(5):
    lvl, depth, h = rng.randint(1, 4), rng.randint(0, 45), rng.randint(1, 8)
    d = D("Abysse", lvl, depth)
    capture(d.work, h)
    want = lvl * h + (depth // 10) * h
    if d.ore != want:
        fail(f"DeepMine(niveau {lvl}, profondeur {depth}).work({h}) : "
             f"{d.ore} minerai, attendu {want}.")
    capture(d.upgrade)
    if d.level != lvl + 1 or d.depth != depth + 5:
        fail("upgrade() d'une mine profonde : niveau +1 et profondeur +5.")
'''),
        dynamic("head3", "Tête 3 : la fiche complète", '''
D = need_class("DeepMine")
d = D("Gouffre", 3, 30)
capture(d.work, 2)
_, out = capture(d.describe)
for part in ("Gouffre", "3", str(d.ore)):
    if part not in out:
        fail(f"describe() d'une mine profonde ne contient pas {part!r}.")
'''),
        static("loop", "La semaine est simulée avec une boucle", "uses_loop"),
    ],
    hints=[
        "Dessine la lignée sur papier : qui définit level, ore, depth ? Qui doit appeler qui avec super() ?",
        "Le bonus de DeepMine s'ajoute à ce que produit déjà Mine. Comment obtenir la production de Mine sans recopier son calcul ?",
        "`upgrade()` de DeepMine : quel ancêtre augmente le niveau ?",
    ],
    quiz=[
        explain("Pendant l'évaluation, on te demande d'ajouter `Quarry(Mine)` qui produit 50 % de plus. Décris ce que tu écrirais, sans recopier de code.",
                "Une classe enfant de Mine dont work() appelle super().work(hours) puis ajoute le bonus calculé à partir des mêmes données."),
    ],
    xp=260,
)

REGION = Region(
    id="r4", name="La Forge des Lignées",
    subtitle="Héritage, super() et redéfinition", theme="forge",
    reward="Enclume ancestrale — débloque le Laboratoire des Ingénieurs",
    levels=[L1, L2, L3, L4],
)
