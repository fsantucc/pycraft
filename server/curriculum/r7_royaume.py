"""Région 7 — Le Royaume Automatisé : épreuve finale."""
from __future__ import annotations

from .model import Level, Region, choice, dynamic, explain, static

FINAL = Level(
    id="r7l1", region="r7", number="7.1", title="Le Royaume Automatisé",
    boss=True,
    notions=["A2", "A3", "A4", "B1", "B4", "B5", "B6", "B7", "B8", "C1",
             "C5", "C6", "D1", "D5", "D7", "D10", "D11", "E1", "E2", "F1",
             "F2", "F3", "F4", "F7", "F9", "F10", "G2", "G5", "G11"],
    story="""Tu as traversé toutes les régions. Le roi te confie la dernière mission : un **royaume qui tourne tout seul**. Des ouvriers qui travaillent le jour et se reposent la nuit, des mineurs, des bâtisseurs, des maîtres mineurs, chacun avec son journal de bord, et un royaume qui orchestre le tout.

Aucune démonstration, aucun code de départ : c'est **ton** architecture. À la fin, tu devras l'expliquer.""",
    explanation="""Avant d'écrire une ligne, dessine (sur papier ou dans un commentaire) :

1. la **lignée** des classes et ce que chaque étage ajoute ;
2. les données **protégées** de chaque classe et leurs règles de validité ;
3. les **relations** : qui contient qui, qui appelle quoi ;
4. pour chaque méthode : **instance**, **classe** ou **statique** ?

Puis construis par petites étapes, en exécutant et en observant le monde à chaque étape. La vérification est une batterie de tests cachés, avec des valeurs aléatoires.""",
    demo={"main.py": '''# Pas de démonstration : à toi de jouer.
'''},
    demo_notes=[], experiments=[],
    mission_title="Cahier des charges du royaume",
    mission="""**Organisation** : shebang, type hints sur toutes les fonctions et méthodes, conventions de nommage, programme principal dans `main()` lancé par le garde `__main__`, aucune donnée protégée touchée depuis l'extérieur.

**`Worker(name: str, energy: int)`**
- `_name`, `_energy` protégés ; l'énergie va de 0 à 100 : `set_energy` valide (message + inchangé si invalide), le constructeur met 50 si invalide ;
- `get_name()`, `get_energy()` ;
- classe imbriquée `Worker.Journal` : compteurs protégés de tâches et de repos, getters `get_tasks()`, `get_rests()`, `display()` ; un journal par ouvrier, `get_journal()` ;
- `work() -> bool` : refuse (message, `False`) si l'énergie est sous 10 ; sinon −10 d'énergie, +1 tâche, `True` ;
- `rest()` : +30 d'énergie (plafond 100), +1 repos ;
- statique `is_night(hour: int) -> bool` : vrai si `hour % 24 >= 20` ou `hour % 24 < 6` ;
- de classe `apprentice()` : un ouvrier « Apprenti » avec 50 d'énergie, **du type de la classe appelée** ;
- `describe()`.

**`Miner(Worker)`** : `ores` (0 au départ, getter `get_ores()`) ; `work()` prolonge le parent : +2 minerais **seulement si** le travail a eu lieu.

**`Builder(Worker)`** : `blocks` (0 au départ, `get_blocks()`) ; `work()` prolonge : +5 blocs si le travail a eu lieu.

**`MasterMiner(Miner)`** : chaque travail réussi donne 1 minerai bonus, compté dans une **statistique supplémentaire** de son journal (`get_bonus()` sur le journal des maîtres mineurs uniquement).

**`Kingdom(name: str)`** : `hire(worker)`, `get_workers()`, `run(hours: int)` : pour chaque heure de 0 à hours − 1, si c'est la nuit tout le monde se repose, sinon tout le monde travaille.

**Fonction indépendante** `kingdom_report(workers) -> int` : affiche la description de chaque ouvrier et renvoie le total des tâches.""",
    starter={"main.py": ""},
    checks=[
        static("shebang", "Shebang", "shebang"),
        static("typed", "Type hints partout", "typed"),
        static("naming", "Conventions de nommage", "naming"),
        static("guard", "Garde `__main__`", "main_guard"),
        static("side", "Rien d'exécuté hors du garde", "no_import_side_effects"),
        static("outside", "Aucun accès `_` depuis l'extérieur",
               "no_external_protected"),
        static("nested", "`Journal` est imbriquée dans `Worker`",
               "nested_class", outer="Worker", inner="Journal"),
        static("k1", "`is_night` est statique", "method_kind", cls="Worker",
               name="is_night", kind="static"),
        static("k2", "`apprentice` est une méthode de classe", "method_kind",
               cls="Worker", name="apprentice", kind="class"),
        static("s1", "`Miner.work` prolonge le parent", "uses_super",
               cls="Miner", method="work", calls="work"),
        static("s2", "`MasterMiner.work` prolonge le parent", "uses_super",
               cls="MasterMiner", method="work", calls="work"),
        static("f", "`kingdom_report` est indépendante", "standalone_function",
               name="kingdom_report"),
        dynamic("worker", "Worker : validation et protection", '''
W = need_class("Worker")
w, out = capture(W, "Ana", 140)
if w.get_energy() != 50 or not out.strip():
    fail("Worker('Ana', 140) : message et énergie 50.")
ok, out = capture(w.set_energy, -1)
if ok is not False or w.get_energy() != 50 or not out.strip():
    fail("set_energy(-1) doit être refusé (message, False, inchangé).")
ok, _ = capture(w.set_energy, 100)
if ok is not True or w.get_energy() != 100:
    fail("set_energy(100) doit être accepté.")
if [k for k in attrs(w) if not k.startswith("_")]:
    fail("Worker a des attributs publics.")
'''),
        dynamic("cycle", "Travail, repos et journal", '''
W = need_class("Worker")
w, _ = capture(W, "Bo", 25)
results = [capture(w.work)[0] for _ in range(3)]
if results != [True, True, False] or w.get_energy() != 5:
    fail(f"Énergie 25, 3 travaux : résultats {results}, énergie {w.get_energy()}.")
for _ in range(4):
    capture(w.rest)
j = w.get_journal()
if w.get_energy() != 100 or (j.get_tasks(), j.get_rests()) != (2, 4):
    fail("Repos plafonné à 100 ; journal : 2 tâches, 4 repos.")
if w.get_journal() is W("x", 10).get_journal():
    fail("Chaque ouvrier doit avoir son propre journal.")
'''),
        dynamic("static", "Statique et classe", '''
W, M = need_class("Worker"), need_class("Miner")
for h in range(0, 48):
    want = h % 24 >= 20 or h % 24 < 6
    if W.is_night(h) is not want:
        fail(f"is_night({h}) devrait être {want}.")
a = M.apprentice()
if type(a) is not M or a.get_name() != "Apprenti" or a.get_energy() != 50:
    fail("Miner.apprentice() doit créer un Miner « Apprenti » à 50.")
'''),
        dynamic("lineage", "Mineurs, bâtisseurs, maîtres mineurs", '''
M, B, MM = need_class("Miner"), need_class("Builder"), need_class("MasterMiner")
m, b, mm = M("m", 15), B("b", 15), MM("mm", 15)
for x in (m, b, mm):
    capture(x.work)
    capture(x.work)
if m.get_ores() != 2 or b.get_blocks() != 5 or mm.get_ores() != 3:
    fail(f"Après 2 travaux (le 2e refusé) : minerais {m.get_ores()}, "
         f"blocs {b.get_blocks()}, maître {mm.get_ores()}. Attendu 2, 5, 3.")
jm = mm.get_journal()
if not callable(getattr(jm, "get_bonus", None)) or jm.get_bonus() != 1:
    fail("Le journal d'un maître mineur doit avoir get_bonus() = 1.")
if hasattr(m.get_journal(), "get_bonus"):
    fail("Le journal d'un mineur ordinaire ne connaît pas les bonus.")
if not issubclass(MM, M):
    fail("MasterMiner doit hériter de Miner.")
'''),
        dynamic("kingdom", "Le royaume tourne seul", '''
K, M, B = need_class("Kingdom"), need_class("Miner"), need_class("Builder")
k = K("Valombre")
m, b = M("Iris", 100), B("Oskar", 100)
capture(k.hire, m)
capture(k.hire, b)
if list(k.get_workers()) != [m, b]:
    fail("get_workers() doit renvoyer les ouvriers embauchés.")
capture(k.run, 24)
jm = m.get_journal()
if jm.get_rests() != 10 or jm.get_tasks() < 1:
    fail(f"Sur 24 h : 10 heures de nuit (repos). Repos comptés : {jm.get_rests()}.")
'''),
        dynamic("report", "`kingdom_report`", '''
W = need_class("Worker")
a, b = W("A", 100), W("B", 100)
for _ in range(3):
    capture(a.work)
capture(b.work)
total, out = capture(ns["kingdom_report"], [a, b])
if total != 4 or "A" not in out or "B" not in out:
    fail(f"kingdom_report : total {total} (attendu 4), et chaque ouvrier décrit.")
'''),
    ],
    hints=[
        "Commence par Worker et son Journal uniquement. Exécute, observe le monde, puis passe à la suite.",
        "Le maître mineur a besoin d'un journal spécialisé : souviens-toi de la tourelle de givre et de `self.Journal()`.",
        "`work()` renvoie un booléen : les enfants peuvent s'en servir pour décider s'ils ajoutent leur production.",
    ],
    quiz=[
        explain("Soutenance 1 : dessine (en texte) ta hiérarchie de classes et justifie chaque héritage.",
                "Worker → Miner → MasterMiner, Worker → Builder ; chaque enfant EST un ouvrier et ajoute sa production ; Journal imbriqué dans Worker, spécialisé pour MasterMiner."),
        explain("Soutenance 2 : justifie le genre (instance, statique, classe) de is_night, apprentice et work.",
                "is_night ne dépend que de l'heure (statique) ; apprentice fabrique un objet du type appelé (classe, cls) ; work modifie un ouvrier (instance)."),
        explain("Soutenance 3 : l'évaluateur demande d'ajouter un `Guard(Worker)` qui ne travaille que la nuit. Décris tes modifications, sans les coder.",
                "Une nouvelle sous-classe ; adapter Kingdom.run pour laisser chaque ouvrier décider (par exemple une méthode on_hour(hour) redéfinie) plutôt que de tester les types."),
        choice("Pourquoi `Kingdom.run` appelle-t-il `worker.work()` au lieu de modifier l'énergie lui-même ?",
               ["C'est plus court",
                "Chaque ouvrier applique ses propres règles (validation, production spécialisée) : encapsulation et polymorphisme",
                "Python l'impose",
                "Pour aller plus vite"], 1,
               "Le royaume orchestre, les ouvriers restent responsables de leur état."),
    ],
    xp=600,
)

REGION = Region(
    id="r7", name="Le Royaume Automatisé", subtitle="Épreuve finale",
    theme="royaume", reward="Couronne de l'architecte — PyCraft terminé !",
    levels=[FINAL],
    act=2, icon="👑",
)
