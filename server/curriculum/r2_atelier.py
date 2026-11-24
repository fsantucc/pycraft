"""Région 2 — L'Atelier des Créateurs : classes, objets, méthodes."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

NO_ARG = '''
def make(cls):
    try:
        return cls()
    except TypeError:
        fail(f"`{cls.__name__}()` doit pouvoir être créé sans argument "
             "dans ce niveau (le constructeur arrive au niveau « L'usine à outils »).")
'''

L1 = Level(
    id="r2l1", region="r2", number="2.1", title="Le moule et la créature",
    notions=["B1", "B2", "B3", "B4", "B5", "B13"],
    story="""Dans l'**Atelier des Créateurs**, un établi brille. Le maître artisan pose un parchemin dessus : *« Ici, on ne fabrique pas une créature. On fabrique d'abord son **plan**. »*

Avec un plan, tu peux produire autant de créatures que tu veux, toutes du même genre, mais chacune avec sa propre vie.""",
    explanation="""Une **classe** est un **modèle** (un plan). L'écrire ne crée **aucune** créature :

```
class Zombie:
    pass
```

Un plan holographique apparaît dans la zone de création, mais le monde est encore vide.

Une **instance** (un **objet**) est une créature construite à partir du plan. On l'obtient en **appelant** la classe :

```
zombie_1 = Zombie()
```

Chaque appel produit un **nouvel** objet. Deux zombies du même plan sont deux objets distincts.

Un **attribut** est une donnée rangée **dans** un objet : `zombie_1.speed = 2`. Ici, on l'ajoute après la création. Il appartient à **cet** objet seulement : `zombie_2` n'a pas de `speed` tant qu'on ne lui en donne pas.

À retenir : **classe = modèle**, **objet = exemplaire**, **attribut = donnée d'un exemplaire**.

*Remarque qualité* : mypy signale `"Zombie" has no attribute "speed"`, car le plan ne déclare pas cet attribut. C'est normal à ce stade : le constructeur (niveau « L'usine à outils ») réglera ce problème.""",
    demo={"main.py": '''class Zombie:
    pass


zombie_1 = Zombie()
zombie_2 = Zombie()

zombie_1.speed = 2
zombie_1.name = "Grumble"
zombie_2.speed = 5

print(zombie_1 is zombie_2)
print(zombie_1.speed, zombie_2.speed)
'''},
    demo_notes=[
        "Ligne 1-2 : un plan apparaît, mais aucun zombie.",
        "Lignes 5-6 : deux zombies distincts sortent du même plan.",
        "Lignes 8-10 : chaque attribut s'accroche à UN zombie. Clique sur un zombie pour l'inspecter.",
    ],
    experiments=[
        "Ajoute `print(zombie_2.name)`. Quelle erreur, et pourquoi ?",
        "Écris `zombie_3 = zombie_1` puis `zombie_3.speed = 9`. Combien de zombies dans le monde ? Que vaut `zombie_1.speed` ?",
    ],
    mission_title="La bergerie",
    mission="""Le berger a besoin d'un plan de mouton.

1. Crée une classe `Sheep` (vide pour l'instant).
2. Crée **trois** moutons, chacun dans sa propre variable.
3. Donne à chacun, **après sa création**, un attribut `wool_color` (texte) et un attribut `wool_amount` (entier). Les trois couleurs doivent être différentes.
4. Le berger tond un seul mouton : mets son `wool_amount` à 0. Les deux autres ne doivent pas être touchés.""",
    starter={"main.py": '''# La bergerie
'''},
    checks=[
        dynamic("cls", "La classe `Sheep` existe", '''
need_class("Sheep")
'''),
        dynamic("three", "Au moins trois moutons distincts existent", '''
Sheep = need_class("Sheep")
flock = [v for v in ns.values() if isinstance(v, Sheep)]
if len({id(s) for s in flock}) < 3:
    fail(f"Je trouve {len({id(s) for s in flock})} mouton(s) dans des "
         "variables. Il en faut trois, chacun créé avec Sheep().")
'''),
        dynamic("attrs", "Chaque mouton a `wool_color` et `wool_amount`", '''
Sheep = need_class("Sheep")
for name, s in ns.items():
    if isinstance(s, Sheep):
        a = attrs(s)
        if not isinstance(a.get("wool_color"), str):
            fail(f"`{name}` n'a pas d'attribut texte `wool_color`.")
        if type(a.get("wool_amount")) is not int:
            fail(f"`{name}` n'a pas d'attribut entier `wool_amount`.")
'''),
        dynamic("colors", "Trois couleurs différentes", '''
Sheep = need_class("Sheep")
colors = {attrs(s).get("wool_color") for s in ns.values()
          if isinstance(s, Sheep)}
if len(colors) < 3:
    fail(f"Couleurs trouvées : {sorted(map(str, colors))}. Il en faut 3 différentes.")
'''),
        dynamic("shear", "Un seul mouton est tondu", '''
Sheep = need_class("Sheep")
amounts = [attrs(s).get("wool_amount") for s in
           {id(v): v for v in ns.values() if isinstance(v, Sheep)}.values()]
if amounts.count(0) != 1:
    fail(f"Quantités de laine : {amounts}. Exactement un mouton doit être à 0.")
if not any(isinstance(a, int) and a > 0 for a in amounts):
    fail("Les autres moutons doivent garder de la laine.")
'''),
    ],
    hints=[
        "Combien de fois dois-tu écrire `Sheep()` pour obtenir trois moutons ?",
        "Un attribut se crée avec `objet.nom = valeur`. Sur quel objet précis veux-tu le créer ?",
        "Si deux variables désignent le même objet, modifier l'une modifie « l'autre ». Tes trois variables désignent-elles bien trois objets différents ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Chest:
    pass


a = Chest()
b = Chest()
a.gold = 5
b.gold = 9
a.gold = a.gold + b.gold
print(a.gold, b.gold)
''', "a et b sont deux objets distincts : seul a.gold change (5 + 9 = 14)."),
        predict("Attention au piège. Que va afficher ce programme ?", '''
class Chest:
    pass


a = Chest()
c = a
c.gold = 1
print(a.gold)
''', "`c = a` ne crée pas de coffre : c et a désignent le MÊME objet."),
        choice("Combien d'objets existent juste après `class Bat:` / `pass` ?",
               ["Zéro", "Un", "Autant que de méthodes"], 0,
               "Une classe est un modèle. Aucun objet n'existe tant qu'on n'appelle pas `Bat()`."),
        explain("Explique la différence entre une classe et un objet avec un exemple qui n'est ni un mouton, ni un zombie.",
                "La classe décrit un type de chose (le moule) ; chaque objet est un exemplaire concret, avec ses propres valeurs d'attributs."),
    ],
    xp=100,
)

L2 = Level(
    id="r2l2", region="r2", number="2.2", title="Donner vie : les méthodes",
    notions=["B7", "B11"],
    story="""Les créatures de l'atelier sont belles, mais **inertes**. Le maître artisan secoue la tête : *« Un plan ne décrit pas seulement ce qu'une créature **possède**. Il décrit aussi ce qu'elle **sait faire**. »*""",
    explanation="""Une **méthode** est une fonction définie **dans** une classe. Tous les objets du plan savent l'exécuter.

```
class Player:
    def attack(self) -> None:
        print("Attaque !")
```

`player.attack()` déclenche la méthode **sur cet objet-là**. Le personnage s'anime dans le monde.

Le premier paramètre, **`self`**, reçoit automatiquement l'objet sur lequel on appelle la méthode. Écrire `player.attack()` revient à écrire `Player.attack(player)`. Grâce à `self`, la méthode lit les attributs de **son** objet : `self.name`.

Une méthode peut recevoir d'autres paramètres : `def heal(self, amount: int)` s'appelle avec `player.heal(5)` (on ne passe jamais `self` soi-même).

Une méthode peut **renvoyer** une valeur avec `return`, au lieu de (ou en plus d') afficher.""",
    demo={"main.py": '''class Player:
    def attack(self) -> None:
        print(f"{self.name} attaque !")

    def can_carry(self, weight: int) -> bool:
        return weight <= self.strength * 10


steve = Player()
steve.name = "Steve"
steve.strength = 3

alex = Player()
alex.name = "Alex"
alex.strength = 5

steve.attack()
alex.attack()
print(steve.can_carry(40), alex.can_carry(40))
'''},
    demo_notes=[
        "Pendant `steve.attack()`, l'inspecteur montre que `self` EST steve.",
        "La même méthode produit deux résultats différents : chacun lit SES attributs.",
        "`can_carry` ne change rien : elle renvoie une réponse (bulle de retour).",
    ],
    experiments=[
        "Retire `self` de la définition de `attack`. Lis l'erreur : combien d'arguments Python a-t-il passés ?",
        "Appelle `Player.attack(alex)` : que constates-tu ?",
    ],
    mission_title="Le comptoir des villageois",
    mission="""Crée une classe `Villager` (toujours sans constructeur) avec deux méthodes :

- `introduce()` affiche une présentation qui contient le `name` et le `job` du villageois ;
- `can_afford(price: int) -> bool` renvoie `True` si ses `emeralds` suffisent pour payer `price`, sinon `False`.

Crée deux villageois, donne-leur `name`, `job` et `emeralds`, puis fais-les se présenter et teste un achat pour chacun.

Le jeu testera tes méthodes sur des villageois **qu'il inventera lui-même**.""",
    starter={"main.py": '''# Le comptoir des villageois
'''},
    checks=[
        dynamic("methods", "`introduce` et `can_afford` existent", '''
V = need_class("Villager")
need_method(V, "introduce")
need_method(V, "can_afford")
''', locate="Villager"),
        dynamic("intro", "`introduce()` utilise les attributs de l'objet", NO_ARG + '''
V = need_class("Villager")
for _ in range(3):
    v = make(V)
    v.name = rng.choice(["Odile", "Bram", "Tiko", "Vesna"]) + str(rng.randint(10, 99))
    v.job = rng.choice(["cartographe", "bibliothécaire", "forgeron"])
    v.emeralds = rng.randint(0, 50)
    _, out = capture(v.introduce)
    if v.name not in out or v.job not in out:
        fail(f"Pour un villageois nommé {v.name!r} ({v.job}), introduce() "
             f"a affiché {out.strip()!r}. Le texte doit venir des attributs de self.")
''', locate="Villager.introduce"),
        dynamic("afford", "`can_afford` renvoie le bon booléen", NO_ARG + '''
V = need_class("Villager")
for _ in range(6):
    v = make(V)
    v.name, v.job = "Test", "test"
    v.emeralds = rng.randint(0, 30)
    price = rng.randint(0, 30)
    got = v.can_afford(price)
    if got is not (v.emeralds >= price):
        fail(f"Avec {v.emeralds} émeraudes et un prix de {price}, "
             f"can_afford a renvoyé {got!r}.")
''', locate="Villager.can_afford"),
        dynamic("two", "Deux villageois existent", '''
V = need_class("Villager")
if len({id(v) for v in ns.values() if isinstance(v, V)}) < 2:
    fail("Crée au moins deux villageois.")
'''),
    ],
    hints=[
        "Dans une méthode, comment accèdes-tu au nom du villageois sur lequel la méthode a été appelée ?",
        "Le jeu crée ses propres villageois. Si ta méthode affiche un nom écrit entre guillemets, que se passe-t-il pour eux ?",
        "`can_afford` doit renvoyer un booléen. Une comparaison comme `a >= b` produit-elle déjà un booléen ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Bee:
    def buzz(self, times: int) -> None:
        print("bz" * times)


b = Bee()
b.buzz(3)
''', "`times` reçoit 3, `self` reçoit b automatiquement."),
        choice("Dans `b.buzz(3)`, que contient `self` pendant l'exécution de buzz ?",
               ["La classe Bee", "L'objet b", "Le nombre 3", "Rien"], 1,
               "self est l'objet devant le point."),
        predict("Que va afficher ce programme ?", '''
class Lantern:
    def light(self) -> str:
        return f"{self.color} lumière"


a = Lantern()
a.color = "bleue"
b = Lantern()
b.color = "orange"
print(b.light())
print(a.light())
''', "Chaque appel lit l'attribut de son propre objet."),
        explain("Pourquoi une méthode a-t-elle besoin de `self` ? Réponds sans utiliser le mot « magique ».",
                "Plusieurs objets partagent le même code de méthode ; self indique sur quel objet précis la méthode travaille, pour lire ou modifier ses attributs."),
    ],
    xp=110,
)

L3 = Level(
    id="r2l3", region="r2", number="2.3", title="Le four qui travaille",
    notions=["B8", "B12", "A9", "A10"],
    story="""Au fond de l'atelier, deux fours attendent. Le maître artisan veut **simuler** une journée de production avant d'allumer les vrais.

Un objet n'est pas figé : ses méthodes peuvent **changer son état**. Et deux fours du même plan peuvent travailler à des vitesses différentes.""",
    explanation="""Une méthode peut **modifier** les attributs de son objet :

```
def move(self) -> None:
    self.fuel = self.fuel - 1
    self.distance = self.distance + 4
```

Après `cart.move()`, l'objet a changé. On appelle l'ensemble de ses attributs à un instant donné son **état**.

Pour simuler le temps, on répète un appel avec une boucle : `for _ in range(5):` exécute le bloc 5 fois (`_` signifie « je n'utilise pas le compteur »).

Un comportement peut dépendre d'un **attribut** : deux objets du même plan évoluent différemment s'ils ont des valeurs différentes. Une méthode peut aussi **refuser** d'agir si l'état ne le permet pas (`if self.fuel <= 0:`).

`round(valeur, 1)` arrondit à un chiffre après la virgule, utile quand les additions de décimaux donnent `2.9999999`.""",
    demo={"main.py": '''class Minecart:
    def move(self) -> None:
        if self.fuel <= 0:
            print("Le wagonnet est en panne sèche")
            return
        self.fuel = self.fuel - 1
        self.distance = round(self.distance + self.speed, 1)


fast = Minecart()
fast.fuel, fast.distance, fast.speed = 3, 0.0, 2.5
slow = Minecart()
slow.fuel, slow.distance, slow.speed = 3, 0.0, 1.2

for _ in range(4):
    fast.move()
    slow.move()

print(f"Rapide : {fast.distance} blocs, lent : {slow.distance} blocs")
'''},
    demo_notes=[
        "Suis `fuel` et `distance` dans l'inspecteur à chaque tour de boucle.",
        "Au 4e tour, la méthode refuse d'agir : l'état ne change plus.",
        "Même plan, vitesses différentes : les résultats divergent.",
    ],
    experiments=[
        "Retire `round(...)` et observe les distances du wagonnet lent.",
        "Passe la boucle à `range(2)`. Pourquoi plus aucun message de panne ?",
    ],
    mission_title="La production de lingots",
    mission="""Crée une classe `Furnace` (sans constructeur ou avec, au choix) avec les attributs `fuel` (entier), `ingots` (nombre à virgule) et `speed` (lingots produits par cycle).

- `smelt()` : s'il reste du combustible, consomme 1 unité et ajoute `speed` lingots, arrondi à 1 décimale. Sinon, affiche un message et ne change rien.
- `report()` : affiche l'état du four.

Simule avec **une boucle** 8 cycles sur **deux fours** de vitesses différentes, puis affiche la différence de production.""",
    starter={"main.py": '''# La production de lingots
'''},
    checks=[
        dynamic("methods", "`smelt` et `report` existent", '''
F = need_class("Furnace")
need_method(F, "smelt")
need_method(F, "report")
''', locate="Furnace"),
        dynamic("smelt", "`smelt()` consomme et produit correctement", '''
F = need_class("Furnace")
for _ in range(4):
    try:
        f = F.__new__(F)
    except Exception:
        fail("Impossible de créer un four de test.")
    fuel = rng.randint(1, 6)
    speed = rng.choice([0.7, 1.2, 1.5, 2.0])
    f.fuel, f.ingots, f.speed = fuel, 0.0, speed
    for _ in range(fuel):
        capture(f.smelt)
    if f.fuel != 0:
        fail(f"Avec {fuel} combustible(s) et {fuel} cycles, il reste {f.fuel}.")
    if abs(f.ingots - round(speed * fuel, 1)) > 0.051:
        fail(f"Vitesse {speed}, {fuel} cycles : {f.ingots} lingots, "
             f"attendu {round(speed * fuel, 1)}.")
''', locate="Furnace.smelt"),
        dynamic("empty", "Sans combustible : message et rien ne change", '''
F = need_class("Furnace")
f = F.__new__(F)
f.fuel, f.ingots, f.speed = 0, 4.0, 1.0
_, out = capture(f.smelt)
if f.fuel != 0 or f.ingots != 4.0:
    fail(f"Four vide : l'état a changé (fuel={f.fuel}, ingots={f.ingots}).")
if not out.strip():
    fail("Four vide : smelt() doit afficher un message.")
''', locate="Furnace.smelt"),
        static("loop", "La simulation utilise une boucle", "uses_loop"),
        dynamic("two", "Deux fours de vitesses différentes", '''
F = need_class("Furnace")
speeds = {attrs(f).get("speed") for f in instances_of(F)}
if len(speeds) < 2:
    fail("Il faut deux fours avec des vitesses différentes.")
'''),
    ],
    hints=[
        "Que doit vérifier `smelt()` AVANT de modifier quoi que ce soit ?",
        "Pour arrondir le total, à quel moment appliquer `round(..., 1)` : sur la vitesse ou sur le nouveau total ?",
        "Une boucle `for _ in range(8):` peut contenir plusieurs appels : un par four.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Torch:
    def burn(self) -> None:
        self.life = self.life - 2


t = Torch()
t.life = 9
for _ in range(3):
    t.burn()
print(t.life)
''', "Trois appels, -2 à chaque fois : 9 → 7 → 5 → 3."),
        predict("Que va afficher ce programme ?", '''
print(round(0.1 + 0.2, 1))
print(0.1 + 0.2 == 0.3)
''', "0.1 + 0.2 vaut 0.30000000000000004 en binaire : la comparaison exacte échoue, l'arrondi corrige l'affichage."),
        choice("Une méthode `grow_hunger()` fait `self.hunger += 1` mais ne renvoie rien. Après `x = pig.grow_hunger()`, que vaut x ?",
               ["La nouvelle faim", "None", "L'objet pig", "Une erreur"], 1,
               "Sans return, une fonction renvoie None. Le changement est dans l'objet, pas dans le résultat."),
        explain("Explique la différence entre une méthode qui modifie l'objet et une méthode qui renvoie une valeur. Donne un exemple de chaque.",
                "Modifier change l'état de l'objet (ses attributs) ; renvoyer produit une valeur pour l'appelant sans forcément toucher l'objet."),
    ],
    xp=120,
)

L4 = Level(
    id="r2l4", region="r2", number="2.4", title="L'usine à outils",
    notions=["B6", "B9", "B10", "A11"],
    story="""Les commandes affluent : le village veut des dizaines d'outils. Fabriquer un objet vide puis lui coller ses attributs un par un prend trop de temps, et on oublie parfois un attribut.

Le maître artisan installe une **chaîne d'assemblage** : chaque outil sort **prêt à l'emploi**.""",
    explanation="""Le **constructeur** `__init__` est une méthode spéciale que Python appelle **automatiquement** quand on crée un objet :

```
class Player:
    def __init__(self, name: str, health: int) -> None:
        self.name = name
        self.health = health


player = Player("Steve", 100)
```

`Player("Steve", 100)` crée l'objet vide, puis appelle `__init__(player, "Steve", 100)`. Les arguments entre parenthèses vont aux paramètres **après** `self`.

Avantages :

- l'objet est **complet** dès sa création, on ne peut plus oublier un attribut ;
- un attribut peut avoir une valeur de départ fixe sans être un paramètre (`self.kills = 0`).

Pour gérer beaucoup d'objets, on les range dans une **liste** et on boucle dessus : `for tool in toolbox: tool.describe()`. La même classe est **réutilisée** pour chaque objet.""",
    demo={"main.py": '''class Player:
    def __init__(self, name: str, health: int) -> None:
        self.name = name
        self.health = health
        self.kills = 0

    def describe(self) -> None:
        print(f"{self.name} : {self.health} PV, {self.kills} victoires")


team = [Player("Steve", 100), Player("Alex", 80), Player("Noor", 120)]
for member in team:
    member.describe()
'''},
    demo_notes=[
        "À la création, regarde les attributs se remplir ligne par ligne pendant `__init__`.",
        "`kills` n'est pas un paramètre : il vaut 0 pour tout le monde au départ.",
        "La boucle appelle la même méthode sur chaque objet de la liste.",
    ],
    experiments=[
        "Crée `Player(\"Zed\")` avec un seul argument. Que dit l'erreur ?",
        "Ajoute un 4e joueur dans la liste : combien de lignes faut-il modifier ailleurs ?",
    ],
    mission_title="La chaîne de pioches",
    mission="""Crée une classe `Pickaxe` :

- `__init__(self, material: str, durability: int)` stocke `material` et `durability`, et initialise `blocks_mined` à 0 ;
- `mine(blocks: int)` : chaque bloc coûte 1 point de durabilité, **2 points si le matériau est `"gold"`**. Si la durabilité ne suffit pas pour tout miner, affiche un avertissement et ne change rien. Sinon, mets à jour durabilité et `blocks_mined` ;
- `describe()` affiche les informations de la pioche.

Range **au moins 5 pioches** d'au moins 3 matériaux différents dans une liste `toolbox`, puis affiche-les toutes avec une boucle.""",
    starter={"main.py": '''# La chaîne de pioches
'''},
    checks=[
        dynamic("ctor", "`Pickaxe(material, durability)` construit un objet complet", '''
P = need_class("Pickaxe")
p = P("diamond", 1561)
a = attrs(p)
for name, want in (("material", "diamond"), ("durability", 1561),
                   ("blocks_mined", 0)):
    if a.get(name) != want:
        fail(f"Après Pickaxe('diamond', 1561), `{name}` vaut "
             f"{a.get(name)!r} au lieu de {want!r}.")
''', locate="Pickaxe.__init__"),
        dynamic("mine", "`mine()` applique le bon coût", '''
P = need_class("Pickaxe")
for material in ("iron", "gold", "stone"):
    dura = rng.randint(30, 60)
    n = rng.randint(3, 9)
    p = P(material, dura)
    capture(p.mine, n)
    cost = 2 if material == "gold" else 1
    if p.durability != dura - n * cost or p.blocks_mined != n:
        fail(f"Pioche {material} ({dura}) après mine({n}) : durabilité "
             f"{p.durability}, blocs {p.blocks_mined}. Attendu "
             f"{dura - n * cost} et {n}.")
''', locate="Pickaxe.mine"),
        dynamic("limit", "Pas assez de durabilité : avertissement, rien ne change", '''
P = need_class("Pickaxe")
p = P("gold", 5)
_, out = capture(p.mine, 3)
if p.durability != 5 or p.blocks_mined != 0:
    fail("Pioche en or de durabilité 5, mine(3) coûte 6 : rien ne "
         f"devrait changer (durabilité {p.durability}, blocs {p.blocks_mined}).")
if not out.strip():
    fail("Aucun avertissement affiché quand la pioche ne peut pas miner.")
''', locate="Pickaxe.mine"),
        dynamic("toolbox", "`toolbox` : 5 pioches, 3 matériaux", '''
P = need_class("Pickaxe")
box = ns.get("toolbox")
if not isinstance(box, list):
    fail("La variable `toolbox` doit être une liste.")
tools = [t for t in box if isinstance(t, P)]
if len(tools) < 5:
    fail(f"toolbox contient {len(tools)} pioche(s), il en faut 5.")
if len({t.material for t in tools}) < 3:
    fail("Il faut au moins 3 matériaux différents.")
'''),
        static("loop", "Affichage avec une boucle", "uses_loop"),
    ],
    hints=[
        "Quels attributs reçoivent leur valeur d'un paramètre, et lequel vaut toujours la même chose au départ ?",
        "Dans `mine`, calcule d'abord ce que coûterait l'opération. Ensuite seulement, décide si tu modifies l'objet.",
        "Le coût dépend d'un attribut de la pioche. Quel attribut ? Comment le comparer à \"gold\" ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Slime:
    def __init__(self, size: int) -> None:
        self.size = size
        print("splotch", size)


a = Slime(2)
b = Slime(a.size * 2)
''', "__init__ est appelé à chaque création : une fois avec 2, une fois avec 4."),
        choice("Quand `__init__` est-il exécuté ?",
               ["Quand on écrit la classe",
                "À chaque création d'objet, automatiquement",
                "Seulement si on l'appelle avec obj.__init__()",
                "Au lancement du programme"], 1,
               "C'est l'appel `Classe(...)` qui déclenche le constructeur."),
        choice("`class Bow:` a `def __init__(self, arrows: int)`. Que se passe-t-il avec `Bow()` ?",
               ["Bow est créé avec arrows = 0",
                "TypeError : il manque l'argument arrows",
                "Bow est créé sans attribut arrows"], 1,
               "Le constructeur exige ses paramètres (sauf valeur par défaut)."),
        explain("Explique à un débutant pourquoi un constructeur est plus sûr que d'ajouter les attributs après la création.",
                "Avec __init__, tous les attributs existent dès la création et sont fournis au même endroit ; on ne peut pas créer un objet incomplet par oubli."),
    ],
    xp=130,
    going_further="Pour aller plus loin (hors programme du PDF) : la méthode spéciale `__str__` permet de choisir le texte affiché par `print(objet)`.",
)

L5 = Level(
    id="r2l5", region="r2", number="2.5", title="Boss : l'Enderman voleur",
    boss=True, notions=["B1", "B6", "B7", "B8", "B10", "A11", "F2"],
    story="""Un **Enderman** rôde autour de l'atelier et se téléporte avec tout ce qu'il peut porter. Les inventaires du village sont tenus sur des bouts de papier : il triche, prend plus qu'il ne peut, et les comptes ne tombent jamais juste.

Construis un inventaire **fiable**. L'Enderman va tester chaque faille.""",
    explanation="""Ce boss mélange tout ce que tu as appris dans l'atelier : constructeur, attributs, méthodes qui modifient l'état, méthodes qui renvoient une réponse, refus d'une action impossible.

Nouveauté : un objet peut contenir une **collection** (ici un dictionnaire `{"apple": 3}`) et une méthode peut agir sur **un autre objet** reçu en paramètre (`self.give(other, ...)`). Les deux inventaires sont alors **en relation**.

Rappel sur les dictionnaires : `d.get(cle, 0)` renvoie 0 si la clé n'existe pas ; `del d[cle]` supprime une entrée ; `sum(d.values())` additionne les valeurs.""",
    demo={"main.py": '''class Backpack:
    def __init__(self, owner: str) -> None:
        self.owner = owner
        self.items = {}

    def put(self, item: str) -> None:
        self.items[item] = self.items.get(item, 0) + 1


bag = Backpack("Steve")
bag.put("torch")
bag.put("torch")
bag.put("bread")
print(bag.items)
'''},
    demo_notes=["Observe le dictionnaire `items` évoluer dans l'inspecteur."],
    experiments=["Que renvoie `bag.items.get(\"diamond\", 0)` ?"],
    mission_title="L'inventaire incassable",
    mission="""Crée une classe `Inventory` :

- `__init__(self, owner: str, capacity: int)` : `owner`, `capacity` (nombre total d'objets maximum) et `items`, un dictionnaire vide ;
- `count(item: str) -> int` : quantité d'un objet (0 si absent) ;
- `total() -> int` : nombre total d'objets ;
- `add(item: str, qty: int) -> bool` : ajoute si la capacité le permet, sinon affiche un refus et renvoie `False` ;
- `remove(item: str, qty: int) -> bool` : retire si possible (une entrée à 0 disparaît du dictionnaire), sinon `False` ;
- `give(other, item: str, qty: int) -> bool` : transfère vers l'inventaire `other`. **Tout ou rien** : si `other` n'a pas la place ou si `self` n'a pas assez, rien ne bouge ;
- `show()` affiche le propriétaire et le contenu.

Dans ton programme, l'Enderman vole quelque chose à Steve avec `give`.""",
    starter={"main.py": '''# L'inventaire incassable
'''},
    checks=[
        dynamic("ctor", "Constructeur", '''
I = need_class("Inventory")
inv = I("Steve", 10)
if inv.owner != "Steve" or inv.capacity != 10 or inv.items != {}:
    fail("Inventory('Steve', 10) doit avoir owner, capacity et un dict items vide.")
''', locate="Inventory.__init__"),
        dynamic("add", "`add` respecte la capacité", '''
I = need_class("Inventory")
cap = rng.randint(5, 15)
inv = I("T", cap)
ok, _ = capture(inv.add, "apple", cap - 2)
if ok is not True or inv.count("apple") != cap - 2:
    fail("add() d'une quantité qui rentre doit réussir et renvoyer True.")
ok, out = capture(inv.add, "stone", 3)
if ok is not False or inv.count("stone") != 0 or inv.total() != cap - 2:
    fail(f"Capacité {cap}, déjà {cap - 2} objets : add('stone', 3) doit être refusé.")
if not out.strip():
    fail("Un refus doit afficher un message.")
full = I("F", 5)
ok, _ = capture(full.add, "x", 5)
if ok is not True or full.total() != 5:
    fail("Remplir exactement la capacité (5 objets pour 5 places) doit réussir.")
''', locate="Inventory.add"),
        dynamic("remove", "`remove` refuse l'impossible et nettoie les zéros", '''
I = need_class("Inventory")
inv = I("T", 50)
capture(inv.add, "torch", 4)
ok, _ = capture(inv.remove, "torch", 5)
if ok is not False or inv.count("torch") != 4:
    fail("remove() de plus que disponible doit être refusé.")
ok, _ = capture(inv.remove, "torch", 4)
if ok is not True or "torch" in inv.items:
    fail("Après avoir tout retiré, 'torch' doit disparaître de items.")
''', locate="Inventory.remove"),
        dynamic("give", "`give` est tout ou rien", '''
I = need_class("Inventory")
a, b = I("A", 20), I("B", 3)
capture(a.add, "pearl", 5)
ok, _ = capture(a.give, b, "pearl", 4)
if ok is not False or a.count("pearl") != 5 or b.count("pearl") != 0:
    fail("Transfert de 4 vers un inventaire de capacité 3 : rien ne doit bouger.")
ok, _ = capture(a.give, b, "pearl", 2)
if ok is not True or a.count("pearl") != 3 or b.count("pearl") != 2:
    fail("Transfert valide de 2 perles : A doit en avoir 3, B 2.")
ok, _ = capture(a.give, b, "gold", 1)
if ok is not False or b.count("gold") != 0:
    fail("On ne peut pas donner ce qu'on n'a pas.")
''', locate="Inventory.give"),
        dynamic("random", "Batterie aléatoire de l'Enderman", '''
I = need_class("Inventory")
inv = I("R", 30)
model = {}
for _ in range(40):
    item = rng.choice(["a", "b", "c"])
    qty = rng.randint(1, 8)
    if rng.random() < 0.5:
        ok, _ = capture(inv.add, item, qty)
        expect = sum(model.values()) + qty <= 30
        if expect:
            model[item] = model.get(item, 0) + qty
    else:
        ok, _ = capture(inv.remove, item, qty)
        expect = model.get(item, 0) >= qty
        if expect:
            model[item] -= qty
            if model[item] == 0:
                del model[item]
    if ok is not expect or inv.items != model:
        fail(f"Séquence aléatoire : après une opération sur {item!r} x{qty}, "
             f"items vaut {inv.items}, attendu {model}.")
if inv.total() != sum(model.values()):
    fail("total() ne correspond pas au contenu.")
'''),
    ],
    hints=[
        "Pour chaque méthode, écris d'abord en français la condition qui rend l'action impossible.",
        "« Tout ou rien » : vérifie TOUTES les conditions avant la première modification. Quelles méthodes existantes peux-tu réutiliser dans `give` ?",
        "`give` reçoit un autre Inventory : tu peux appeler ses méthodes, comme `other.total()`.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Box:
    def __init__(self) -> None:
        self.n = 0

    def fill(self, other: "Box") -> None:
        other.n = other.n + 1
        self.n = self.n - 1


a = Box()
b = Box()
a.fill(b)
a.fill(b)
print(a.n, b.n)
''', "La méthode modifie son objet ET l'objet reçu en paramètre."),
        explain("Pourquoi `give` doit-il vérifier toutes les conditions avant de modifier quoi que ce soit ?",
                "Si on retire d'abord puis que l'ajout échoue, les objets disparaissent : l'état devient incohérent."),
    ],
    xp=220,
)

REGION = Region(
    id="r2", name="L'Atelier des Créateurs",
    subtitle="Classes, objets, attributs, méthodes, constructeurs",
    theme="atelier",
    reward="Établi enchanté — débloque la Citadelle des Gardiens",
    levels=[L1, L2, L3, L4, L5],
    act=2, icon="🛠",
)
