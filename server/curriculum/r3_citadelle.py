"""Région 3 — La Citadelle des Gardiens : encapsulation."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, predict, static

L1 = Level(
    id="r3l1", region="r3", number="3.1", title="Le golem sans armure",
    notions=["C1", "C2", "C3", "C4", "C7"],
    story="""Dans la **Citadelle des Gardiens**, un golem de fer s'est effondré. Quelqu'un a écrit `golem.health = -500` depuis la place du marché. Plus personne ne sait combien de vie il lui reste vraiment.

Les gardiens ont une règle : **les données internes d'un objet ne se touchent pas depuis l'extérieur**. On passe par l'objet lui-même.""",
    explanation="""L'**encapsulation** consiste à protéger l'état d'un objet : on n'y accède que par des **méthodes** prévues pour ça. L'objet reste responsable de sa propre cohérence.

En Python, un nom d'attribut qui commence par **un tiret bas** (`self._health`) signale : *« attribut protégé, usage interne »*. C'est une **convention** : Python n'empêche rien, mais tout développeur sait qu'il ne doit pas y toucher hors de la classe (flake8 et les évaluateurs non plus).

Pour lire une donnée protégée, on fournit un **getter** :

```
def get_health(self) -> int:
    return self._health
```

Les règles du métier (« la vie ne descend jamais sous 0 ») vivent **dans** les méthodes de la classe. Ainsi, impossible de les contourner par erreur.

Dans le monde, un attribut protégé porte un **cadenas**. S'il est modifié hors de la classe, une alerte rouge apparaît.""",
    demo={"main.py": '''class IronGolem:
    def __init__(self, health: int) -> None:
        self._health = health

    def get_health(self) -> int:
        return self._health

    def take_hit(self, damage: int) -> None:
        self._health = max(0, self._health - damage)


guard = IronGolem(100)
guard.take_hit(30)
print(guard.get_health())

guard._health = -500
print(guard.get_health())
'''},
    demo_notes=[
        "`take_hit` modifie `_health` depuis la classe : aucun problème.",
        "Ligne 16 : la modification vient de l'extérieur. Alerte rouge dans le monde et dans le journal.",
        "Python l'a laissé faire : `_` est une convention, pas un verrou.",
    ],
    experiments=[],
    mission_title="Le golem gardien",
    mission="""Crée une classe `Golem` :

- `__init__(self, name: str, health: int)` stocke les données dans des attributs **protégés** `_name` et `_health` ;
- `get_name()` et `get_health()` ;
- `take_hit(damage: int)` diminue la vie, **jamais en dessous de 0** ;
- `repair(amount: int)` augmente la vie.

Dans le programme, crée un golem, fais-lui subir des coups et des réparations, et affiche sa vie **uniquement via les getters**. Aucune ligne hors de la classe ne doit toucher un attribut qui commence par `_`.""",
    starter={"main.py": '''# Le golem gardien
'''},
    checks=[
        dynamic("protected", "Les données sont dans `_name` et `_health`", '''
G = need_class("Golem")
g = G("Atlas", 80)
a = attrs(g)
if a.get("_name") != "Atlas" or a.get("_health") != 80:
    fail(f"Attributs trouvés : {sorted(a)}. Il faut `_name` et `_health`.")
public = [k for k in a if not k.startswith("_")]
if public:
    fail(f"Attributs publics à protéger : {public}.")
''', locate="Golem.__init__"),
        dynamic("getters", "Les getters renvoient les données", '''
G = need_class("Golem")
n, h = "G" + str(rng.randint(1, 999)), rng.randint(10, 300)
g = G(n, h)
if g.get_name() != n or g.get_health() != h:
    fail("get_name() / get_health() ne renvoient pas les valeurs du golem.")
''', locate="Golem"),
        dynamic("floor", "`take_hit` ne descend jamais sous 0", '''
G = need_class("Golem")
for _ in range(5):
    h = rng.randint(5, 50)
    d = rng.randint(1, 100)
    g = G("T", h)
    capture(g.take_hit, d)
    if g.get_health() != max(0, h - d):
        fail(f"Vie {h}, coup de {d} : get_health() vaut {g.get_health()}, "
             f"attendu {max(0, h - d)}.")
''', locate="Golem.take_hit"),
        dynamic("repair", "`repair` soigne", '''
G = need_class("Golem")
g = G("T", 10)
capture(g.repair, 7)
if g.get_health() != 17:
    fail("Vie 10 puis repair(7) : attendu 17.")
''', locate="Golem.repair"),
        static("outside", "Aucun accès `_` depuis l'extérieur de la classe",
               "no_external_protected"),
    ],
    hints=[
        "Tout ce que la mission appelle « attribut protégé » commence par un tiret bas. Où sont-ils créés ?",
        "Comment exprimer « le plus grand entre 0 et la nouvelle vie » ? Une fonction intégrée de Python fait exactement ça.",
        "Relis ton programme principal : chaque ligne qui contient `._` hors de la classe est une infraction.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Lamp:
    def __init__(self) -> None:
        self._on = False

    def is_on(self) -> bool:
        return self._on


lamp = Lamp()
lamp._on = True
print(lamp.is_on())
''', "Python n'empêche pas l'accès : le tiret bas est une convention entre développeurs."),
        choice("Pourquoi passer par `get_health()` plutôt que lire `golem._health` ?",
               ["C'est plus rapide",
                "La classe garde le contrôle : on peut changer sa représentation interne sans casser le code qui l'utilise",
                "Python l'impose",
                "Les getters ne servent à rien en Python"], 1,
               "Le reste du programme dépend des méthodes, pas des détails internes."),
        explain("Explique ce qu'est l'encapsulation à quelqu'un qui n'a jamais programmé, avec une image de la vie réelle.",
                "Un objet protège ses données et impose de passer par ses propres règles (méthodes) pour les lire ou les modifier."),
    ],
    xp=120,
)

L2 = Level(
    id="r3l2", region="r3", number="3.2", title="Les gardiens de la porte",
    notions=["C5", "C6", "C8", "C9", "C10", "C11"],
    story="""Le seigneur de la citadelle a installé des **balises** sur les remparts. Mais des apprentis ont réglé une balise à la puissance 12 (le maximum est 4) et une autre à un rayon négatif.

Il faut des **gardiens** à chaque porte d'entrée des données : toute valeur invalide est refusée, signalée, et l'objet reste intact.""",
    explanation="""Un **setter** est une méthode qui modifie un attribut protégé **après l'avoir validé** :

```
def set_speed(self, speed: int) -> bool:
    if speed < 0:
        print(f"{self._name} : vitesse refusée ({speed})")
        return False
    self._speed = speed
    return True
```

Trois réflexes :

- **valider** avant d'écrire ;
- en cas de refus, **signaler** (message émis par la classe) et **ne rien changer** ;
- éventuellement renvoyer `True`/`False` pour que l'appelant sache ce qui s'est passé.

Le **constructeur** est aussi une porte d'entrée : il peut réutiliser les setters, ou appliquer des **valeurs par défaut** quand on lui donne n'importe quoi.

**Un ou deux tirets bas ?** `self._x` est la convention « protégé ». `self.__x` déclenche le **name mangling** : Python renomme l'attribut en `_Classe__x`, ce qui gêne les classes enfants. Le programme te demande la convention `_`.

Dans le monde : un setter refusé fait apparaître un **bouclier rouge** et la valeur ne bouge pas.""",
    demo={"main.py": '''class Horse:
    def __init__(self, name: str, speed: int) -> None:
        self._name = name
        self._speed = 0
        self.set_speed(speed)

    def get_speed(self) -> int:
        return self._speed

    def set_speed(self, speed: int) -> bool:
        if speed < 0 or speed > 15:
            print(f"{self._name} : vitesse {speed} refusée")
            return False
        self._speed = speed
        return True


blaze = Horse("Blaze", 9)
blaze.set_speed(-4)
blaze.set_speed(12)
print(blaze.get_speed())
'''},
    demo_notes=[
        "`set_speed(-4)` : bouclier rouge, `_speed` reste à 9.",
        "Le constructeur passe lui aussi par le setter : une seule règle, à un seul endroit.",
    ],
    experiments=[],
    mission_title="Les balises des remparts",
    mission="""Crée une classe `Beacon` :

- `__init__(self, name: str, power: int, radius: int)` ;
- la puissance doit être entre **0 et 4** inclus, le rayon entre **1 et 50** inclus ;
- `set_power(power: int) -> bool` et `set_radius(radius: int) -> bool` : valident, affichent un message d'erreur **qui contient le nom de la balise** en cas de refus, laissent la valeur inchangée, renvoient `True` ou `False` ;
- `get_name()`, `get_power()`, `get_radius()` ;
- si le constructeur reçoit des valeurs invalides : message d'erreur, puis valeurs par défaut **puissance 0, rayon 1**.

Attributs protégés avec un seul `_`. Dans le programme, provoque au moins un refus.""",
    starter={"main.py": '''# Les balises des remparts
'''},
    checks=[
        dynamic("valid", "Construction valide", '''
B = need_class("Beacon")
b = B("Nord", 3, 20)
if (b.get_name(), b.get_power(), b.get_radius()) != ("Nord", 3, 20):
    fail("Beacon('Nord', 3, 20) : les getters ne renvoient pas ces valeurs.")
''', locate="Beacon.__init__"),
        dynamic("setters", "Les setters acceptent et refusent correctement", '''
B = need_class("Beacon")
plan = [("p", -1), ("p", 0), ("p", 4), ("p", 5), ("r", 0), ("r", 1),
        ("r", 50), ("r", 51)]
plan += [("p" if rng.random() < 0.5 else "r", None) for _ in range(30)]
for kind, value in plan:
    b, _ = capture(B, "Tour" + str(rng.randint(1, 99)), 2, 10)
    if kind == "p":
        v = rng.randint(-5, 9) if value is None else value
        ok, out = capture(b.set_power, v)
        good = 0 <= v <= 4
        if ok is not good or b.get_power() != (v if good else 2):
            fail(f"set_power({v}) : renvoyé {ok!r}, puissance {b.get_power()}.")
    else:
        v = rng.randint(-10, 70) if value is None else value
        ok, out = capture(b.set_radius, v)
        good = 1 <= v <= 50
        if ok is not good or b.get_radius() != (v if good else 10):
            fail(f"set_radius({v}) : renvoyé {ok!r}, rayon {b.get_radius()}.")
    if not good and b.get_name() not in out:
        fail(f"Refus de {v} : le message doit contenir le nom de la balise. "
             f"Message : {out.strip()!r}")
''', locate="Beacon"),
        dynamic("defaults", "Valeurs par défaut si la construction est invalide", '''
B = need_class("Beacon")
b, out = capture(B, "Ruine", 7, -3)
if b.get_power() != 0 or b.get_radius() != 1:
    fail(f"Beacon('Ruine', 7, -3) : puissance {b.get_power()}, rayon "
         f"{b.get_radius()}. Attendu 0 et 1.")
if not out.strip():
    fail("Une construction invalide doit afficher un message.")
''', locate="Beacon.__init__"),
        dynamic("protected", "Tous les attributs sont protégés", '''
B = need_class("Beacon")
b, _ = capture(B, "X", 1, 2)
public = [k for k in attrs(b) if not k.startswith("_")]
if public:
    fail(f"Attributs publics : {public}.")
'''),
        static("mangling", "Convention `_`, pas de name mangling",
               "no_name_mangling"),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
    ],
    hints=[
        "Écris la règle de validité de la puissance sous forme d'une condition Python. Puis celle du rayon.",
        "Le constructeur a besoin des mêmes règles que les setters. Comment éviter d'écrire ces règles deux fois ?",
        "Si le constructeur réutilise un setter qui refuse, quelle valeur l'attribut doit-il déjà avoir à ce moment-là ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Bow:
    def __init__(self) -> None:
        self._arrows = 5

    def set_arrows(self, n: int) -> None:
        if n < 0:
            print("Refusé")
            return
        self._arrows = n

    def get_arrows(self) -> int:
        return self._arrows


b = Bow()
b.set_arrows(-2)
b.set_arrows(12)
print(b.get_arrows())
''', "Le premier appel est refusé (message, rien ne change), le second est accepté."),
        predict("Que va afficher ce programme ?", '''
class Vault:
    def __init__(self) -> None:
        self.__code = 1234


v = Vault()
print(hasattr(v, "__code"), hasattr(v, "_Vault__code"))
''', "Le name mangling renomme __code en _Vault__code."),
        choice("Pourquoi le PDF demande-t-il `_attribut` plutôt que `__attribut` ?",
               ["`__` est plus lent",
                "`_` est la convention « protégé » ; `__` renomme l'attribut et complique l'accès depuis les classes enfants",
                "`__` est interdit en Python 3.10",
                "Il n'y a aucune différence"], 1,
               "Le mangling sert à éviter des collisions de noms, pas à protéger. Les enfants n'accèdent plus simplement à l'attribut."),
        explain("Ton setter refuse une valeur. Explique pourquoi il doit laisser l'objet inchangé plutôt que de mettre une valeur « proche ».",
                "L'appelant doit pouvoir faire confiance à l'état ; modifier silencieusement vers une autre valeur cache l'erreur et produit des données que personne n'a demandées."),
    ],
    xp=140,
    going_further="Pour aller plus loin (hors programme du PDF) : `@property` permet d'écrire `beacon.power = 3` tout en passant par un setter validé.",
)

L3 = Level(
    id="r3l3", region="r3", number="3.3", title="Boss : le Golem corrupteur",
    boss=True, notions=["C1", "C3", "C5", "C6", "C7", "C8", "C9", "C10"],
    story="""Le **Golem corrupteur** a pris le contrôle des coffres de la citadelle. Il dépose des quantités négatives, retire plus que le contenu et essaie d'ouvrir les coffres sans le code.

Construis un coffre-fort que **rien** ne peut corrompre. Chaque attaque repoussée lui fait perdre de la vie.""",
    explanation="""Un coffre-fort combine plusieurs règles qui dépendent les unes des autres : **verrouillé** ou non, **code** secret, **contenu** jamais négatif.

Le code secret ne doit **jamais** sortir de l'objet : pas de getter pour lui. Seule une méthode `unlock(code)` le compare.

Les méthodes de dépôt et de retrait vérifient **toutes** les conditions avant d'agir, et renvoient un booléen.""",
    demo={"main.py": '''class Door:
    def __init__(self, code: int) -> None:
        self._code = code
        self._open = False

    def try_open(self, code: int) -> bool:
        self._open = code == self._code
        return self._open


door = Door(42)
print(door.try_open(7), door.try_open(42))
'''},
    demo_notes=["Le code n'est jamais renvoyé : seule une comparaison sort de l'objet."],
    experiments=[],
    mission_title="Le coffre inviolable",
    mission="""Crée une classe `VaultChest` :

- `__init__(self, owner: str, emeralds: int, code: int)` : si `emeralds` est négatif, message d'erreur et 0. Le coffre est **verrouillé** au départ ;
- `is_locked() -> bool`, `get_owner()`, `get_emeralds()`. **Aucun moyen** de lire le code ;
- `unlock(code: int) -> bool` (bon code : déverrouille) et `lock()` ;
- `deposit(amount: int) -> bool` : refuse si verrouillé ou si `amount <= 0` ;
- `withdraw(amount: int) -> bool` : refuse si verrouillé, si `amount <= 0` ou si le coffre ne contient pas assez ;
- chaque refus affiche un message.

Tous les attributs sont protégés.""",
    starter={"main.py": '''# Le coffre inviolable
'''},
    checks=[
        dynamic("init", "Construction et valeur par défaut", '''
V = need_class("VaultChest")
c, _ = capture(V, "Mira", 30, 1111)
if c.get_owner() != "Mira" or c.get_emeralds() != 30 or c.is_locked() is not True:
    fail("Un coffre neuf doit garder owner et émeraudes, et être verrouillé.")
c, out = capture(V, "X", -9, 1)
if c.get_emeralds() != 0 or not out.strip():
    fail("Émeraudes négatives à la construction : message et 0.")
''', locate="VaultChest.__init__"),
        dynamic("secret", "Le code ne sort jamais du coffre", '''
V = need_class("VaultChest")
c, _ = capture(V, "S", 5, 987654)
for name in dir(c):
    member = getattr(c, name)
    if name.startswith("get") and callable(member):
        try:
            value, _ = capture(member)
        except TypeError:
            continue
        if value == 987654:
            fail(f"`{name}()` révèle le code secret.")
public = [k for k in attrs(c) if not k.startswith("_")]
if public:
    fail(f"Attributs publics : {public}.")
'''),
        dynamic("lock", "Verrou et code", '''
V = need_class("VaultChest")
c, _ = capture(V, "L", 10, 2024)
ok, out = capture(c.withdraw, 5)
if ok is not False or c.get_emeralds() != 10 or not out.strip():
    fail("Retrait sur coffre verrouillé : refus avec message.")
ok, _ = capture(c.unlock, 1)
if ok is not False or not c.is_locked():
    fail("Mauvais code : le coffre doit rester verrouillé.")
ok, _ = capture(c.unlock, 2024)
if ok is not True or c.is_locked():
    fail("Bon code : le coffre doit s'ouvrir.")
capture(c.lock)
if not c.is_locked():
    fail("lock() doit reverrouiller.")
''', locate="VaultChest.unlock"),
        dynamic("battery", "Batterie d'attaques du Golem", '''
V = need_class("VaultChest")
c, _ = capture(V, "B", 20, 77)
capture(c.unlock, 77)
model = 20
edges = [("d", 0), ("w", 0), ("d", -3), ("w", -2), ("w", 21), ("w", 20),
         ("d", 1)]
plan = edges + [("d" if rng.random() < 0.5 else "w", rng.randint(-10, 30))
                for _ in range(60)]
for op, amount in plan:
    before = model
    if op == "d":
        ok, out = capture(c.deposit, amount)
        good = amount > 0
        if good:
            model += amount
    else:
        ok, out = capture(c.withdraw, amount)
        good = 0 < amount <= model
        if good:
            model -= amount
    name = "deposit" if op == "d" else "withdraw"
    if ok is not good or c.get_emeralds() != model:
        verdict = "réussir" if good else "être refusé"
        fail(f"Attaque : {name}({amount}) sur un coffre ouvert de {before} "
             f"émeraudes devait {verdict}. Renvoyé : {ok!r}, contenu : "
             f"{c.get_emeralds()} (attendu {model}).")
    if not good and not out.strip():
        fail(f"Le refus de {amount} doit afficher un message.")
'''),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
        static("mangling", "Convention `_`", "no_name_mangling"),
    ],
    hints=[
        "Fais la liste de toutes les raisons de refuser un retrait. Dans quel ordre les tester ?",
        "Le Golem essaie aussi 0 et des nombres négatifs. Ta condition les couvre-t-elle ?",
        "Comment `unlock` peut-il vérifier le code sans jamais le renvoyer ?",
    ],
    quiz=[
        explain("Pendant l'évaluation, on te demande d'ajouter une limite de 1000 émeraudes. Où places-tu la règle, et combien de méthodes dois-tu modifier ?",
                "Dans la classe, à l'endroit où l'on ajoute des émeraudes (dépôt, et construction si elle peut dépasser) ; le reste du programme ne change pas grâce à l'encapsulation."),
        choice("Un setter qui refuse une valeur doit…",
               ["lever une erreur et arrêter le programme",
                "signaler le problème et laisser l'objet inchangé",
                "corriger la valeur automatiquement",
                "supprimer l'attribut"], 1,
               "C'est le comportement demandé par le programme : message + donnée intacte."),
    ],
    xp=240,
)

REGION = Region(
    id="r3", name="La Citadelle des Gardiens",
    subtitle="Encapsulation et protection des données", theme="citadelle",
    reward="Bouclier de fer — débloque la Forge des Lignées",
    levels=[L1, L2, L3],
    act=2, icon="🛡",
)
