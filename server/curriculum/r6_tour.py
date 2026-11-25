"""Région 6 — La Tour des Architectes : classes imbriquées, statistiques,
relations entre objets, fonctions indépendantes."""
from __future__ import annotations

from .model import Level, Region, dynamic, explain, predict, static

L1 = Level(
    id="r6l1", region="r6", number="6.1", title="La machine dans la machine",
    notions=["F1", "F3", "F4", "F5"],
    story="""Au sommet de la **Tour des Architectes**, des tourelles défendent le royaume. Les architectes veulent savoir combien de fois chaque tourelle a tiré, rechargé, ou s'est enrayée.

Ces compteurs n'intéressent personne d'autre que les tourelles. Les architectes décident de construire le carnet de bord **à l'intérieur** du plan de la tourelle.""",
    explanation="""Une **classe imbriquée** est une classe définie **dans** le corps d'une autre classe :

```
class Robot:
    class Battery:
        def __init__(self) -> None:
            self._charge = 100

    def __init__(self, name: str) -> None:
        self.name = name
        self._battery = Robot.Battery()
```

- son nom complet est `Robot.Battery` : elle est **rangée** dans Robot, ce qui dit clairement qu'elle lui sert ;
- chaque robot crée **son propre** objet `Battery` dans son constructeur : c'est un **composant interne** ;
- l'objet externe délègue au composant (`self._battery.drain(5)`).

Pour des **statistiques**, le composant garde des compteurs **protégés** et fournit des méthodes pour les incrémenter, les lire et les afficher : on n'écrit jamais `tourelle._log._shots += 1` depuis l'extérieur du carnet.

Dans le monde, le petit plan apparaît **dans** le grand plan, et chaque composant flotte en satellite de son propriétaire. Clique dessus pour l'ouvrir.""",
    demo={"main.py": '''class Robot:
    class Battery:
        def __init__(self) -> None:
            self._charge = 100

        def drain(self, amount: int) -> None:
            self._charge = max(0, self._charge - amount)

        def get_charge(self) -> int:
            return self._charge

    def __init__(self, name: str) -> None:
        self.name = name
        self._battery = Robot.Battery()

    def walk(self) -> None:
        self._battery.drain(15)


bolt = Robot("Bolt")
spark = Robot("Spark")
bolt.walk()
bolt.walk()
print(bolt._battery.get_charge(), spark._battery.get_charge())
'''},
    demo_notes=[
        "Le plan Battery est dessiné à l'intérieur du plan Robot.",
        "Chaque robot a sa batterie satellite : elles évoluent indépendamment.",
        "La ligne 24 lit `_battery` depuis l'extérieur : ce sera à corriger dans ta mission avec un getter.",
    ],
    experiments=[],
    mission_title="Le carnet des tourelles",
    mission="""Crée une classe `Turret(name: str, ammo: int)` qui contient une classe imbriquée `Logbook` :

- `Logbook` a trois compteurs **protégés** (tirs, recharges, enrayements) qui démarrent à 0, des méthodes `record_shot()`, `record_reload()`, `record_misfire()`, des getters `get_shots()`, `get_reloads()`, `get_misfires()`, et `display()` qui affiche les trois compteurs ;
- chaque tourelle crée **son propre** carnet dans son constructeur ;
- `shoot()` : s'il reste des munitions, en consomme une et note un tir ; sinon note un enrayement ;
- `reload(amount: int)` ajoute des munitions et note une recharge ;
- `get_log()` renvoie le carnet de la tourelle.

Toutes les données sont protégées. Affiche le carnet de deux tourelles différentes.""",
    starter={"main.py": '''# Le carnet des tourelles
'''},
    checks=[
        static("nested", "`Logbook` est définie dans `Turret`",
               "nested_class", outer="Turret", inner="Logbook"),
        dynamic("own", "Chaque tourelle a son propre carnet", '''
T = need_class("Turret")
a, b = T("A", 2), T("B", 2)
la, lb = a.get_log(), b.get_log()
if la is lb:
    fail("Deux tourelles partagent le même carnet.")
if type(la).__qualname__ != "Turret.Logbook":
    fail(f"get_log() renvoie un {type(la).__qualname__}, attendu Turret.Logbook.")
'''),
        dynamic("count", "Les compteurs suivent les actions", '''
T = need_class("Turret")
ammo = rng.randint(1, 5)
t = T("Sentinelle", ammo)
n = ammo + rng.randint(1, 4)
for _ in range(n):
    capture(t.shoot)
capture(t.reload, 3)
log = t.get_log()
got = (log.get_shots(), log.get_misfires(), log.get_reloads())
want = (ammo, n - ammo, 1)
if got != want:
    fail(f"{ammo} munitions, {n} tirs puis 1 recharge : (tirs, enrayements, "
         f"recharges) = {got}, attendu {want}.")
''', locate="Turret.shoot"),
        dynamic("protect", "Les compteurs sont protégés", '''
T = need_class("Turret")
t = T("P", 1)
public = [k for k in attrs(t.get_log()) if not k.startswith("_")]
if public:
    fail(f"Compteurs publics dans Logbook : {public}.")
public = [k for k in attrs(t) if not k.startswith("_") and k != "name"]
if public:
    fail(f"Attributs publics dans Turret : {public}.")
'''),
        dynamic("display", "`display()` affiche les compteurs", '''
T = need_class("Turret")
t = T("D", 0)
for _ in range(3):
    capture(t.shoot)
_, out = capture(t.get_log().display)
if "3" not in out:
    fail(f"Après 3 enrayements, display() doit le montrer : {out.strip()!r}")
'''),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
    ],
    hints=[
        "Où écris-tu une classe pour qu'elle soit « dans » une autre ? Comment s'appelle-t-elle ensuite depuis le constructeur de Turret ?",
        "Pourquoi le carnet doit-il être créé dans `__init__` plutôt qu'une seule fois pour toute la classe ?",
        "`shoot()` ne touche pas directement aux compteurs : quelle méthode du carnet appelle-t-elle ?",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Ship:
    class Engine:
        pass


e = Ship.Engine()
print(type(e).__qualname__)
''', "Le nom qualifié rappelle où la classe est rangée."),
        predict("Que va afficher ce programme ?", '''
class Counter:
    class Data:
        def __init__(self) -> None:
            self._n = 0

        def bump(self) -> None:
            self._n += 1

        def get(self) -> int:
            return self._n

    def __init__(self) -> None:
        self._data = Counter.Data()

    def click(self) -> None:
        self._data.bump()

    def total(self) -> int:
        return self._data.get()


a, b = Counter(), Counter()
a.click()
a.click()
b.click()
print(a.total(), b.total())
''', "Chaque compteur crée son propre Data dans __init__."),
        explain("Pourquoi ranger `Logbook` dans `Turret` plutôt qu'à côté ? Et pourquoi protéger ses compteurs ?",
                "Le carnet n'a de sens que pour une tourelle : l'imbrication l'exprime et range le code. Protéger ses compteurs garantit qu'ils ne bougent que par les méthodes d'enregistrement, donc restent exacts."),
    ],
    xp=160,
)

L2 = Level(
    id="r6l2", region="r6", number="6.2", title="Compteurs spécialisés",
    notions=["F6", "F8", "D5", "D7"],
    starter_from="r6l1",
    story="""Les architectes ajoutent une **tourelle de givre** qui peut geler les ennemis. Ils veulent compter les gels… mais **sans toucher** au plan des tourelles classiques, qui fonctionne parfaitement et que d'autres équipes utilisent.""",
    explanation="""**Étendre une architecture existante** sans la modifier, c'est exactement ce que permet l'héritage.

Pour une statistique **réservée à une sous-classe**, deux approches existent :

- l'enfant ajoute **son propre compteur** protégé, à côté du carnet ;
- ou l'enfant définit **son propre carnet**, qui hérite du carnet parent :

```
class FrostTurret(Turret):
    class Logbook(Turret.Logbook):
        ...
```

Dans les deux cas, la classe parente ne change pas d'une ligne, et le carnet des tourelles classiques ne connaît pas les gels.

Point délicat : si l'enfant redéfinit `Logbook`, le constructeur parent doit créer le **bon** carnet. Écrire `Turret.Logbook()` en dur crée toujours le carnet de base ; écrire `self.Logbook()` cherche `Logbook` à partir de la classe de l'objet, donc trouve la version de l'enfant.

**Note mypy** : pour mypy, l'attribut `_log` créé par le parent est un `Turret.Logbook`, qui n'a pas de méthode de gel. Avant d'appeler une méthode propre au carnet spécialisé, vérifie son type : `if isinstance(log, FrostTurret.Logbook):`. mypy comprend alors que l'appel est sûr.""",
    demo={"main.py": '''class Machine:
    class Meter:
        def __init__(self) -> None:
            self._runs = 0

    def __init__(self) -> None:
        self._meter = self.Meter()


class Drill(Machine):
    class Meter(Machine.Meter):
        def __init__(self) -> None:
            super().__init__()
            self._holes = 0


print(type(Machine()._meter).__qualname__)
print(type(Drill()._meter).__qualname__)
'''},
    demo_notes=[
        "`self.Meter()` trouve le compteur de la classe réelle de l'objet.",
        "Le diagramme montre Drill.Meter qui hérite de Machine.Meter.",
    ],
    experiments=[],
    mission_title="La tourelle de givre",
    mission="""Garde ta classe `Turret` du niveau précédent (le bouton « Reprendre mon code » la recopie) et ajoute `FrostTurret(Turret)` :

- `freeze()` gèle une cible et compte un gel ;
- `frost.get_log()` renvoie un carnet qui possède `get_freezes()` **en plus** de tout ce que sait faire le carnet normal, et dont `display()` montre aussi les gels ;
- le carnet d'une tourelle normale ne doit **pas** avoir `get_freezes` ;
- une tourelle de givre tire et recharge comme une autre.

Tu peux adapter le constructeur de Turret si c'est nécessaire pour créer le bon carnet, mais le comportement des tourelles normales ne doit pas changer.""",
    starter={"main.py": '''# La tourelle de givre
'''},
    checks=[
        static("inh", "`FrostTurret` hérite de `Turret`", "inherits",
               cls="FrostTurret", parent="Turret"),
        dynamic("freeze", "Les gels sont comptés", '''
F = need_class("FrostTurret")
f = F("Givre", 3)
n = rng.randint(1, 6)
for _ in range(n):
    capture(f.freeze)
log = f.get_log()
if not callable(getattr(log, "get_freezes", None)):
    fail("Le carnet d'une FrostTurret doit avoir get_freezes().")
if log.get_freezes() != n:
    fail(f"{n} gels, get_freezes() renvoie {log.get_freezes()}.")
_, out = capture(log.display)
if str(n) not in out:
    fail("display() d'une tourelle de givre doit montrer les gels.")
''', locate="FrostTurret"),
        dynamic("base", "Les tourelles normales sont inchangées", '''
T = need_class("Turret")
t = T("Normale", 1)
log = t.get_log()
if hasattr(log, "get_freezes"):
    fail("Le carnet d'une tourelle normale ne doit pas connaître les gels.")
capture(t.shoot)
capture(t.shoot)
if (log.get_shots(), log.get_misfires()) != (1, 1):
    fail("Une tourelle normale doit toujours compter tirs et enrayements.")
'''),
        dynamic("inherit", "Une tourelle de givre tire comme les autres", '''
F = need_class("FrostTurret")
f = F("G", 1)
capture(f.shoot)
capture(f.reload, 2)
log = f.get_log()
if (log.get_shots(), log.get_reloads()) != (1, 1):
    fail("Tirs et recharges d'une FrostTurret doivent être comptés.")
'''),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
    ],
    hints=[
        "Qui crée le carnet ? Si le constructeur parent écrit le nom du carnet en dur, quel carnet obtient une FrostTurret ?",
        "Un carnet spécialisé qui hérite du carnet normal : que doit faire son constructeur avant d'ajouter le compteur de gels ?",
        "`display()` du carnet spécialisé peut prolonger celui du parent.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class A:
    class Part:
        label = "A"

    def __init__(self) -> None:
        self.p = self.Part()


class B(A):
    class Part(A.Part):
        label = "B"


print(A().p.label, B().p.label)
''', "self.Part est cherché à partir de la classe de l'objet : B trouve sa propre version."),
        explain("Pourquoi étendre par héritage plutôt que d'ajouter un compteur de gels dans le carnet de base ?",
                "Les tourelles normales n'ont pas de gels : le carnet de base resterait propre et inchangé, et le code existant qui l'utilise n'est pas impacté."),
    ],
    xp=170,
)

L3 = Level(
    id="r6l3", region="r6", number="6.3", title="L'inspecteur universel",
    notions=["F7", "F9", "F2", "A12"],
    starter_from="r6l2",
    story="""Le général du royaume visite la tour. Il veut un **seul** outil d'inspection qui fonctionne sur **n'importe quelle** tourelle, aujourd'hui comme demain, quand de nouveaux modèles arriveront.

Et il veut savoir, pour chaque **avant-poste**, combien de tirs ont été faits au total.""",
    explanation="""Une **fonction indépendante** est définie au niveau du module, hors de toute classe. Elle peut recevoir **n'importe quel objet** qui sait faire ce qu'elle demande :

```
def inspect(entity: Turret) -> None:
    entity.get_log().display()
```

Si on lui passe une `FrostTurret`, c'est la version **redéfinie** de `display()` qui s'exécute, sans que la fonction le sache. C'est le **polymorphisme** : même appel, comportement adapté à l'objet. Aucun `if type(...) == ...` n'est nécessaire.

Les objets peuvent aussi être **en relation** : un avant-poste **contient** une liste de tourelles. L'avant-poste ne copie pas les tourelles, il garde des **références** vers elles. Dans le monde, des **cordes** relient les objets qui se référencent.""",
    demo={"main.py": '''class Cat:
    def sound(self) -> str:
        return "miaou"


class Ocelot(Cat):
    def sound(self) -> str:
        return "grrr"


def listen(animal: Cat) -> None:
    print(animal.sound())


for creature in [Cat(), Ocelot()]:
    listen(creature)
'''},
    demo_notes=[
        "La même fonction `listen` exécute deux méthodes différentes.",
        "Regarde dans le journal quelle classe a fourni `sound()` à chaque appel.",
    ],
    experiments=[],
    mission_title="L'avant-poste",
    mission="""Garde tes classes `Turret` et `FrostTurret` et ajoute :

- `Outpost(name: str)` : contient une liste protégée de tourelles, `install(turret)` et `get_turrets()` ;
- une **fonction indépendante** `inspect(entity)` qui affiche le nom et les statistiques de **n'importe quelle** tourelle (les gels apparaissent automatiquement pour une tourelle de givre) ;
- une **fonction indépendante** `total_shots(outpost) -> int` qui renvoie le nombre total de tirs de toutes les tourelles d'un avant-poste.

Dans le programme : un avant-poste avec au moins une tourelle de chaque type, un appel à `inspect` sur chacune, puis le total.""",
    starter={"main.py": '''# L'avant-poste
'''},
    checks=[
        static("f1", "`inspect` est une fonction indépendante",
               "standalone_function", name="inspect"),
        static("f2", "`total_shots` est une fonction indépendante",
               "standalone_function", name="total_shots"),
        dynamic("inspect", "`inspect` fonctionne sur tous les types", '''
T, F = need_class("Turret"), need_class("FrostTurret")
inspect_fn = ns["inspect"]
t, f = T("Alpha", 2), F("Glacis", 2)
for _ in range(4):
    capture(f.freeze)
_, out_t = capture(inspect_fn, t)
_, out_f = capture(inspect_fn, f)
if "Alpha" not in out_t or "Glacis" not in out_f:
    fail("inspect() doit afficher le nom de la tourelle.")
if "4" not in out_f:
    fail("inspect() d'une tourelle de givre doit montrer ses 4 gels.")
''', locate="inspect"),
        dynamic("outpost", "`Outpost` garde ses tourelles", '''
O, T = need_class("Outpost"), need_class("Turret")
o = O("Fort")
a, b = T("a", 1), T("b", 1)
capture(o.install, a)
capture(o.install, b)
if list(o.get_turrets()) != [a, b]:
    fail("get_turrets() doit renvoyer les tourelles installées, dans l'ordre.")
public = [k for k in attrs(o) if not k.startswith("_") and k != "name"]
if public:
    fail(f"Attributs publics dans Outpost : {public}.")
'''),
        dynamic("total", "`total_shots` additionne correctement", '''
O, T, F = need_class("Outpost"), need_class("Turret"), need_class("FrostTurret")
o = O("Rempart")
want = 0
for i in range(rng.randint(2, 5)):
    kind = T if i % 2 else F
    ammo = rng.randint(0, 4)
    turret = kind(f"t{i}", ammo)
    shots = rng.randint(0, 6)
    for _ in range(shots):
        capture(turret.shoot)
    want += min(ammo, shots)
    capture(o.install, turret)
got = ns["total_shots"](o)
if got != want:
    fail(f"total_shots() renvoie {got}, attendu {want}.")
''', locate="total_shots"),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
    ],
    hints=[
        "Si `inspect` délègue l'affichage au carnet, quelle version de `display()` est appelée pour une tourelle de givre ?",
        "Pour additionner, de quoi as-tu besoin : de la liste des tourelles, puis de quoi pour chacune ?",
        "Une fonction indépendante est écrite au niveau 0 d'indentation, hors de tout `class`.",
    ],
    quiz=[
        predict("Que va afficher ce programme ?", '''
class Mob:
    def describe(self) -> str:
        return "mob"


class Ghast(Mob):
    def describe(self) -> str:
        return "ghast " + super().describe()


def show_all(mobs: list[Mob]) -> None:
    for mob in mobs:
        print(mob.describe())


show_all([Mob(), Ghast()])
''', "La fonction ne connaît que Mob ; chaque objet fournit sa propre version."),
        explain("Qu'est-ce que le polymorphisme ? Appuie-toi sur ta fonction `inspect`.",
                "Un même appel de méthode produit un comportement adapté à la classe réelle de l'objet ; inspect fonctionne pour tout type de tourelle sans tester son type."),
    ],
    xp=170,
)

L4 = Level(
    id="r6l4", region="r6", number="6.4", title="Boss : le Dragon de l'End",
    boss=True, notions=["F1", "F2", "F4", "F7", "F9", "F10", "C6", "D5", "E1", "E2"],
    story="""Le **Dragon de l'End** attaque la tour. Il faut une **arène** où plusieurs combattants interagissent : ils se frappent les uns les autres, chacun garde ses statistiques, et chaque type de combattant a son style.

L'arène sera ta création la plus complexe. Le dragon testera chaque interaction.""",
    explanation="""Règle d'or des interactions : **un objet ne modifie jamais directement les données protégées d'un autre**. Pour blesser `other`, on appelle `other.take_damage(...)` : c'est la cible qui applique ses propres règles.""",
    demo={"main.py": '''class Knight:
    def __init__(self, name: str) -> None:
        self._name = name
        self._health = 10

    def take_damage(self, amount: int) -> None:
        self._health = max(0, self._health - amount)

    def strike(self, other: "Knight") -> None:
        other.take_damage(3)


a, b = Knight("A"), Knight("B")
a.strike(b)
'''},
    demo_notes=["`a.strike(b)` appelle une méthode de b : c'est b qui modifie ses propres données."],
    experiments=[],
    mission_title="L'arène de l'End",
    mission="""Crée :

- `Fighter(name: str, health: int, power: int)` : attributs protégés ; `health` négatif à la construction → 0 avec un message ; `get_name()`, `get_health()`, `is_alive()` ;
- une classe imbriquée `Fighter.Stats` (compteurs protégés : coups donnés, coups reçus, dégâts reçus ; getters ; `display()`), un objet `Stats` par combattant, accessible par `get_stats()` ;
- `take_damage(amount: int)` : vie minimum 0, met à jour les stats de la cible ;
- `strike(other)` : si l'attaquant est vivant, inflige `power` à `other` **via `other.take_damage`** et compte un coup donné ;
- méthode **statique** `is_critical(roll: int) -> bool` : vrai si `roll >= 18` ;
- méthode **de classe** `training_dummy()` : combattant « Mannequin », 50 de vie, 0 de puissance ;
- `Dragon(Fighter)` : `strike` **prolonge** celle du parent en frappant une seconde fois si sa vie est sous la moitié de sa vie initiale ;
- une fonction indépendante `battle_report(fighters) -> str` qui renvoie le nom du survivant ayant le plus de vie (ou `"Aucun"`).""",
    starter={"main.py": '''# L'arène de l'End
'''},
    checks=[
        static("nested", "`Stats` est dans `Fighter`", "nested_class",
               outer="Fighter", inner="Stats"),
        static("k1", "`is_critical` est statique", "method_kind",
               cls="Fighter", name="is_critical", kind="static"),
        static("k2", "`training_dummy` est une méthode de classe",
               "method_kind", cls="Fighter", name="training_dummy",
               kind="class"),
        static("sup", "`Dragon.strike` prolonge le parent", "uses_super",
               cls="Dragon", method="strike", calls="strike"),
        static("f", "`battle_report` est indépendante", "standalone_function",
               name="battle_report"),
        dynamic("strike", "Les coups passent par la cible", '''
F = need_class("Fighter")
a, b = F("A", 30, 7), F("B", 20, 4)
capture(a.strike, b)
capture(a.strike, b)
if b.get_health() != 6:
    fail(f"B (20 PV) frappé 2 fois à 7 : {b.get_health()} PV, attendu 6.")
sa, sb = a.get_stats(), b.get_stats()
nums = []
for obj in (sa, sb):
    nums.append([m() for n, m in sorted(
        (n, getattr(obj, n)) for n in dir(obj)
        if n.startswith("get") and callable(getattr(obj, n)))])
if 2 not in nums[0] or 14 not in nums[1]:
    fail("Les statistiques ne reflètent pas 2 coups donnés / 14 dégâts reçus.")
public = [k for k in attrs(sa) if not k.startswith("_")]
if public:
    fail(f"Statistiques publiques : {public}.")
'''),
        dynamic("dead", "Les morts ne frappent plus, la vie reste ≥ 0", '''
F = need_class("Fighter")
a, b = F("A", 5, 50), F("B", 10, 3)
capture(a.strike, b)
if b.get_health() != 0 or b.is_alive():
    fail("Un coup de 50 sur 10 PV : vie 0 et is_alive() faux.")
capture(b.strike, a)
if a.get_health() != 5:
    fail("Un combattant mort ne doit plus infliger de dégâts.")
d, out = capture(F, "Neg", -4, 1)
if d.get_health() != 0 or not out.strip():
    fail("Vie négative à la construction : message et 0.")
'''),
        dynamic("tools", "Statique et classe", '''
F = need_class("Fighter")
if F.is_critical(18) is not True or F.is_critical(17) is not False:
    fail("is_critical : vrai à partir de 18.")
m = F.training_dummy()
if m.get_name() != "Mannequin" or m.get_health() != 50:
    fail("training_dummy() : Mannequin, 50 PV.")
'''),
        dynamic("dragon", "La rage du dragon", '''
F, D = need_class("Fighter"), need_class("Dragon")
dragon, knight = D("Ender", 100, 10), F("K", 200, 0)
capture(dragon.strike, knight)
if knight.get_health() != 190:
    fail("Dragon en pleine forme : un seul coup.")
capture(dragon.take_damage, 60)
capture(dragon.strike, knight)
if knight.get_health() != 170:
    fail("Dragon sous la moitié de sa vie : deux coups.")
if type(D.training_dummy()) is not D:
    fail("Dragon.training_dummy() doit créer un Dragon.")
'''),
        dynamic("report", "`battle_report`", '''
F = need_class("Fighter")
br = ns["battle_report"]
a, b, c = F("A", 10, 1), F("B", 40, 1), F("C", 25, 1)
if br([a, b, c]) != "B":
    fail("battle_report doit désigner le survivant le plus en forme.")
capture(b.take_damage, 99)
if br([a, b, c]) != "C":
    fail("Les morts ne comptent pas.")
capture(a.take_damage, 99)
capture(c.take_damage, 99)
if br([a, b, c]) != "Aucun":
    fail("Sans survivant, battle_report renvoie 'Aucun'.")
'''),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
    ],
    hints=[
        "Commence par Fighter et Stats seuls, teste-les, puis ajoute strike, puis le dragon.",
        "Pour savoir si le dragon est sous la moitié de sa vie initiale, il faut avoir gardé la vie initiale quelque part.",
        "Dans `strike`, qui met à jour les dégâts reçus : l'attaquant ou la cible ?",
    ],
    quiz=[
        explain("Le dragon frappe un chevalier. Décris pas à pas, objet par objet, quelles méthodes s'exécutent et quelles données changent.",
                "dragon.strike(chevalier) → Fighter.strike via super() → chevalier.take_damage(power) qui modifie la vie et les stats du chevalier ; le dragon met à jour ses coups donnés ; si sa vie est basse, un second appel."),
    ],
    xp=300,
)

REGION = Region(
    id="r6", name="La Tour des Architectes",
    subtitle="Classes imbriquées, statistiques, relations et polymorphisme",
    theme="tour", reward="Œil de l'End — débloque le Royaume Automatisé",
    levels=[L1, L2, L3, L4],
    act=2, icon="👁",
)
