"""The story scene of every level: who is there, what stands around, what
they say.

The browser places them in the right corner of the map ("the stage") and
brings them to life:

* the characters tell the story (``intro``) when the level opens, and again
  when the player clicks on one of them;
* the character named in ``answers`` is the one who types the answers to the
  program's ``input()`` questions; ``argv_by`` gives the command line
  arguments;
* after a verification, ``success`` (or ``fail``) is said, and the scenery
  shows the result of the mission (``done``: the house is lit, the bridge
  repaired, the storm gone…). ``invert=True`` on a prop shows its "done"
  look *before* the mission (the portal is open, then closed).

Positions ``at`` are ``[ds, dd]`` offsets on the stage: ``ds`` goes towards
the player, ``dd`` towards the right edge of the map.

What the program does changes the scene (``react``): a rule pairs an event
of the program (a printed line, a call, a new object…) with consequences
in the world (night falls, a lantern lights up, a door opens…). See
``web/js/reactions.js`` for the patterns and the actions. ``start`` on a
prop gives its state before the program runs (``start={"on": False}``: the
lantern is out).
"""
from __future__ import annotations

from typing import Any

Line = tuple[str, str]


def npc(id_: str, name: str, skin: str, at: tuple[float, float],
        pose: str = "idle") -> dict[str, Any]:
    return {"id": id_, "name": name, "skin": skin, "at": list(at),
            "pose": pose}


def prop(type_: str, at: tuple[float, float], label: str = "",
         **opts: Any) -> dict[str, Any]:
    return {"type": type_, "at": list(at), "label": label, **opts}


def react(on: dict[str, Any], *actions: list[Any]) -> dict[str, Any]:
    """When the program does ``on``, the world does ``actions``."""
    return {"on": on, "do": [list(a) for a in actions]}


def scene(npcs: list[dict[str, Any]], props: list[dict[str, Any]],
          intro: list[Line], success: Line, fail: Line | None = None,
          answers: str = "", argv_by: str = "") -> dict[str, Any]:
    first = npcs[0]["id"]
    data: dict[str, Any] = {
        "npcs": npcs, "props": props,
        "intro": [list(line) for line in intro],
        "success": list(success),
        "answers": answers or first, "argv_by": argv_by or first,
    }
    if fail:
        data["fail"] = list(fail)
    return data


# Usual places on the stage. On screen, dd is the horizontal axis and ds
# goes down towards the player.
FRONT = (1.6, -2.4)      # main character, towards the centre of the map
SECOND = (2.4, 0.6)      # second character, at his right
BACK = (-3.0, -0.5)      # big building, at the back
RIGHT = (-1.8, 3.4)      # back right
SIDE = (1.2, 2.4)        # front right
SMALL1 = (-0.4, -1.6)
SMALL2 = (0.2, 0.9)
SMALL3 = (0.6, 3.6)

SCENES: dict[str, dict[str, Any]] = {
    # ------------------------------------------------------------ Act I
    "a1l1": scene(
        [npc("ancien", "Le vieux villageois", "elder", FRONT)],
        [prop("house", BACK, "le village"),
         prop("lantern", SMALL2, "la lanterne", start={"on": False}),
         prop("flowers", SIDE), prop("board", RIGHT, "les recettes")],
        [("ancien", "Bienvenue, voyageur ! Tu es dans la Prairie des Premiers Pas."),
         ("ancien", "Ici, on écrit des recettes : on les range, puis on les suit quand on en a besoin."),
         ("ancien", "Ce soir, il faudra allumer la lanterne du village… deux fois !")],
        ("ancien", "La lanterne s'allume ! Tu as compris : définir, puis appeler."),
    ),
    "r1l1": scene(
        [npc("chef", "Le chef du village", "chief", FRONT),
         npc("forgeron", "Le forgeron", "smith", SECOND)],
        [prop("board", BACK, "les panneaux"), prop("furnace", SIDE, "la forge", done=False),
         prop("well", RIGHT), prop("crates", SMALL1, n=3)],
        [("chef", "Bienvenue au Village des Bâtisseurs !"),
         ("chef", "Ici, rien ne bouge tant qu'un programme ne l'ordonne pas."),
         ("forgeron", "Ma forge est froide… Il faut d'abord retenir les bonnes informations."),
         ("chef", "Python lit tes ordres un par un, de haut en bas. Retiens bien ça !")],
        ("forgeron", "Les panneaux sont remplis et la forge se rallume. Merci !"),
    ),
    "a1l3": scene(
        [npc("villageois", "Le villageois", "villager", FRONT)],
        [prop("house", BACK, "sa maison", n=3),
         prop("torch", SMALL2, "torches"), prop("torch", (0.9, 1.4)),
         prop("crates", SIDE, "le charbon", n=2)],
        [("villageois", "Hé, toi ! Attends ! Je veux éclairer ma maison…"),
         ("villageois", "…mais je ne sais pas compter les torches."),
         ("villageois", "Je vais te dire mes chiffres : combien de murs, combien de torches par mur."),
         ("villageois", "À toi de calculer les torches… et le charbon à acheter !")],
        ("villageois", "Ma maison brille de mille feux ! Merci, calculateur !"),
        ("villageois", "Hmm, ce n'est pas le bon compte… Je n'ai pas assez de torches."),
        answers="villageois",
    ),
    "a1l4": scene(
        [npc("garde", "Le garde du pont", "guard", FRONT),
         npc("voyageur", "Un voyageur", "explorer", SECOND)],
        [prop("bridge", (-2.4, 0.4), "le pont du ravin"),
         prop("torch", SMALL2, "torche"), prop("banner", RIGHT, color="#3a5ab0")],
        [("garde", "Halte ! Personne ne traverse ce pont sans mon accord."),
         ("garde", "Je laisse passer selon ton expérience… et je choisis mes mots selon le voyageur."),
         ("voyageur", "Je vais te donner mon niveau d'expérience, et te dire si j'ai une torche."),
         ("garde", "Ton programme doit décider à ma place. Sans se tromper !")],
        ("garde", "Décisions parfaites. Le pont est réparé : passe, héros !"),
        ("garde", "Non, non… je n'aurais pas dit ça à ce voyageur. Revois tes conditions."),
        answers="voyageur",
    ),
    "a2l1": scene(
        [npc("mineur", "Le mineur", "miner", FRONT)],
        [prop("blocktower", BACK, "la tour de soutènement", n=5),
         prop("cave", RIGHT, "la mine"), prop("minecart", SIDE), prop("lantern", SMALL1)],
        [("mineur", "Bienvenue dans les Mines de l'Écho !"),
         ("mineur", "On construit des tours de soutènement : chaque étage demande plus de blocs."),
         ("mineur", "Je vais te dire la hauteur, puis combien de blocs il me reste."),
         ("mineur", "Personne ne veut écrire cent fois la même ligne… une boucle, peut-être ?")],
        ("mineur", "La tour tient debout, étage par étage. Beau travail !"),
        answers="mineur",
    ),
    "a2l2": scene(
        [npc("mineur", "Le vieux mineur", "miner", FRONT)],
        [prop("cave", BACK, "la grotte de l'écho"), prop("redstone", RIGHT, "le signal"),
         prop("rocks", SIDE), prop("lantern", SMALL1)],
        [("mineur", "Écoute… Cette grotte renvoie l'écho de chaque son."),
         ("mineur", "Et chaque écho renvoie un écho plus faible… jusqu'au silence."),
         ("mineur", "Mon signal de redstone fait pareil : il perd 3 de force à chaque fois."),
         ("mineur", "Je te dirai la force de départ. Une fonction qui s'appelle elle-même ?")],
        ("mineur", "Signal… signal… signal éteint. Exactement comme l'écho !"),
        answers="mineur",
    ),
    "a2l3": scene(
        [npc("mineur", "Le mineur", "miner", FRONT),
         npc("scribe", "Le scribe", "librarian", SECOND)],
        [prop("gate", BACK, "l'entrée de la ville"), prop("board", RIGHT, "le registre"),
         prop("rocks", SIDE)],
        [("mineur", "Attention : le Golem du registre garde l'entrée de la ville !"),
         ("scribe", "Il refuse tout nom mal écrit, et toute fonction qui ne dit pas ce qu'elle reçoit et renvoie."),
         ("mineur", "Il faut un code typé, propre, et des textes parfaitement formatés.")],
        ("scribe", "Le Golem s'écarte ! Le registre est impeccable."),
    ),
    # ---------------------------------------------------------- Act II
    "r1l2": scene(
        [npc("batisseur", "Le vieux bâtisseur", "builder", FRONT)],
        [prop("gate", BACK, "le portail"), prop("crates", RIGHT, "les plans", n=4),
         prop("workbench", SIDE, "le chantier")],
        [("batisseur", "Regarde ce portail : chaque fichier peut en importer un autre."),
         ("batisseur", "Mais quand j'importe mes outils, tout leur code s'exécute !"),
         ("batisseur", "La démonstration s'est jouée en plein milieu de mon chantier…"),
         ("batisseur", "Il me faut une porte qui ne s'ouvre qu'au bon moment.")],
        ("batisseur", "La porte s'ouvre seulement quand on lance le fichier. Parfait !"),
    ),
    "r1l3": scene(
        [npc("batisseur", "Le vieux bâtisseur", "builder", FRONT),
         npc("inspecteur", "L'inspecteur", "architect", SECOND)],
        [prop("workbench", BACK, "l'atelier soufflé"), prop("crates", SIDE, n=2),
         prop("board", RIGHT, "le rapport")],
        [("batisseur", "Un Creeper a soufflé l'atelier des plans !"),
         ("batisseur", "Le script qui compte les blocs marche encore, mais il est méconnaissable."),
         ("inspecteur", "flake8 et mypy refusent de l'approuver. Répare-le…"),
         ("inspecteur", "…sans changer ce qu'il affiche.")],
        ("inspecteur", "Approuvé ! Le script est propre et fait toujours la même chose."),
    ),
    "r2l1": scene(
        [npc("artisan", "Le maître artisan", "artisan", FRONT)],
        [prop("workbench", BACK, "l'établi qui brille"), prop("board", RIGHT, "le plan"),
         prop("crystal", SIDE, color="#5ee6e0")],
        [("artisan", "Bienvenue dans l'Atelier des Créateurs."),
         ("artisan", "Ici, on ne fabrique pas une créature. On fabrique d'abord son plan."),
         ("artisan", "Avec un plan, tu produis autant de créatures que tu veux… chacune avec sa vie.")],
        ("artisan", "Un plan, plusieurs créatures. Tu as compris l'essentiel !"),
    ),
    "r2l2": scene(
        [npc("artisan", "Le maître artisan", "artisan", FRONT)],
        [prop("workbench", BACK), prop("dummy", SIDE, "créature inerte"),
         prop("toolrack", RIGHT)],
        [("artisan", "Mes créatures sont belles… mais elles ne bougent pas."),
         ("artisan", "Un plan ne dit pas seulement ce qu'une créature possède."),
         ("artisan", "Il dit aussi ce qu'elle sait faire. Donne-leur des méthodes !")],
        ("artisan", "Elles parlent, elles agissent ! Elles sont vivantes !"),
    ),
    "r2l3": scene(
        [npc("artisan", "Le maître artisan", "artisan", FRONT)],
        [prop("furnace", BACK, "four n°1", done=False), prop("furnace", RIGHT, "four n°2", done=False),
         prop("crates", SIDE, "le minerai", n=4)],
        [("artisan", "Deux fours attendent au fond de l'atelier."),
         ("artisan", "Avant d'allumer les vrais, je veux simuler une journée de production."),
         ("artisan", "Deux fours du même plan… mais qui ne travaillent pas à la même vitesse.")],
        ("artisan", "La simulation est juste. On peut allumer les vrais fours !"),
    ),
    "r2l4": scene(
        [npc("artisan", "Le maître artisan", "artisan", FRONT),
         npc("client", "Une villageoise", "villager", SECOND)],
        [prop("toolrack", BACK, "les outils"), prop("workbench", RIGHT, "la chaîne d'assemblage"),
         prop("crates", SIDE, "les commandes", n=5)],
        [("client", "Le village veut des dizaines d'outils, vite !"),
         ("artisan", "Fabriquer un objet vide puis coller ses attributs un par un… trop lent."),
         ("artisan", "Et on oublie parfois un attribut ! Chaque outil doit sortir prêt à l'emploi.")],
        ("client", "Tous les outils sont complets dès leur sortie. Merci !"),
    ),
    "r2l5": scene(
        [npc("artisan", "Le maître artisan", "artisan", FRONT),
         npc("marchande", "La marchande", "cook", SECOND)],
        [prop("chest", BACK, "l'inventaire"), prop("crates", SIDE, "les marchandises", n=4),
         prop("board", RIGHT, "les comptes")],
        [("marchande", "Un Enderman rôde et se téléporte avec nos marchandises !"),
         ("artisan", "Nos inventaires sont sur des bouts de papier : il triche, et les comptes sont faux."),
         ("artisan", "Construis un inventaire fiable. Il va tester chaque faille.")],
        ("marchande", "L'Enderman repart les mains vides ! Les comptes tombent juste."),
    ),
    "r3l1": scene(
        [npc("gardien", "Le gardien", "guard", FRONT)],
        [prop("gate", BACK, "la citadelle"), prop("banner", SIDE, color="#8d939a"),
         prop("board", RIGHT, "golem.health = -500 ?!")],
        [("gardien", "Notre golem de fer s'est effondré…"),
         ("gardien", "Quelqu'un a écrit golem.health = -500 depuis la place du marché !"),
         ("gardien", "Règle de la citadelle : les données internes ne se touchent pas de l'extérieur."),
         ("gardien", "On passe par l'objet lui-même.")],
        ("gardien", "Le golem est protégé. Plus personne ne peut le corrompre de l'extérieur."),
    ),
    "r3l2": scene(
        [npc("seigneur", "Le seigneur", "lord", FRONT),
         npc("apprenti", "Un apprenti", "builder", SECOND)],
        [prop("beacon", BACK, "balise"), prop("beacon", SIDE, "balise"),
         prop("gate", RIGHT)],
        [("seigneur", "J'ai installé des balises sur les remparts."),
         ("apprenti", "Euh… j'en ai réglé une à la puissance 12. Le maximum, c'est 4 ?"),
         ("seigneur", "Et une autre a un rayon négatif ! Il faut des gardiens à chaque porte des données."),
         ("seigneur", "Toute valeur invalide est refusée, signalée, et la balise reste intacte.")],
        ("seigneur", "Les balises brillent, et aucune valeur absurde ne passe. Bravo !"),
    ),
    "r3l3": scene(
        [npc("gardien", "Le gardien des coffres", "guard", FRONT)],
        [prop("chest", BACK, "coffre-fort"), prop("chest", SIDE, "coffre-fort"),
         prop("gate", RIGHT)],
        [("gardien", "Le Golem corrupteur a pris le contrôle de nos coffres !"),
         ("gardien", "Il dépose des quantités négatives, retire plus que le contenu…"),
         ("gardien", "…et essaie d'ouvrir les coffres sans le code. Construis un coffre incorruptible !")],
        ("gardien", "Chaque attaque est repoussée. Nos coffres sont sauvés !"),
    ),
    "r4l1": scene(
        [npc("forgeron", "Le vieux forgeron", "smith", FRONT)],
        [prop("forge", BACK, "la forge"), prop("anvil", SMALL2), prop("board", RIGHT, "fiches des créatures")],
        [("forgeron", "Pour chaque créature, je recopie les mêmes lignes : nom, vie, description…"),
         ("forgeron", "Une erreur dans l'une, et je dois la corriger partout !"),
         ("forgeron", "Les vaches, les araignées, les loups… ce sont toutes des créatures. Pourquoi tout réécrire ?")],
        ("forgeron", "Un seul parent, plein d'enfants. Je n'écrirai plus jamais deux fois la même ligne !"),
    ),
    "r4l2": scene(
        [npc("forgeron", "Le vieux forgeron", "smith", FRONT)],
        [prop("forge", BACK), prop("minecart", RIGHT, "un véhicule"),
         prop("barrel", SIDE)],
        [("forgeron", "Mes nouvelles créations ont plus de caractéristiques que leurs ancêtres."),
         ("forgeron", "Un bateau est un véhicule… avec des places assises."),
         ("forgeron", "J'ai écrit un constructeur pour le bateau, et il n'avait plus de nom !"),
         ("forgeron", "L'enfant doit demander au parent de faire sa part.")],
        ("forgeron", "Le bateau a son nom ET ses places. Merci, super() !"),
    ),
    "r4l3": scene(
        [npc("armurier", "L'armurier", "smith", FRONT)],
        [prop("toolrack", BACK, "l'armurerie"), prop("anvil", SMALL2), prop("board", RIGHT, "les fiches")],
        [("armurier", "Chaque arme de l'armurerie a sa fiche."),
         ("armurier", "Une épée enchantée est une arme, qui est un outil."),
         ("armurier", "Chaque génération ajoute ses lignes à la fiche, sans recopier celles des ancêtres.")],
        ("armurier", "Les fiches se complètent de génération en génération. Superbe !"),
    ),
    "r4l4": scene(
        [npc("forgeron", "Le vieux forgeron", "smith", FRONT),
         npc("chevalier", "La chevalière", "lord", SECOND)],
        [prop("forge", BACK), prop("banner", RIGHT, color="#2a2a2a"), prop("anvil", SMALL2)],
        [("chevalier", "Le Wither arrive ! Trois têtes, trois attaques."),
         ("forgeron", "Chaque tête vise un étage différent de notre lignée."),
         ("chevalier", "Parent, enfant, petit-enfant : toute la hiérarchie doit tenir !")],
        ("chevalier", "Le Wither est vaincu ! Toute la lignée a tenu bon."),
    ),
    "r5l1": scene(
        [npc("ingenieure", "L'ingénieure", "engineer", FRONT)],
        [prop("redstone", BACK, "le circuit"), prop("workbench", RIGHT), prop("crystal", SIDE, color="#e5534b")],
        [("ingenieure", "Je calcule la puissance d'un signal de redstone."),
         ("ingenieure", "À chaque fois, je construis un circuit entier… juste pour une soustraction !"),
         ("ingenieure", "Ce calcul ne dépend d'aucun circuit. Pourquoi devoir en construire un ?")],
        ("ingenieure", "Un calcul sans circuit : c'est exactement ce qu'il me fallait !"),
    ),
    "r5l2": scene(
        [npc("alchimiste", "L'alchimiste", "alchemist", FRONT),
         npc("client", "Un client", "villager", SECOND)],
        [prop("cauldron", BACK, "le chaudron"), prop("potions", SIDE, "les fioles"),
         prop("board", RIGHT, "nom:durée:force")],
        [("client", "Une fiole d'eau, s'il vous plaît !"),
         ("alchimiste", "Encore ! Et d'autres m'envoient des recettes « nom:durée:force »…"),
         ("alchimiste", "Je dois tout déchiffrer et appeler le constructeur à la main."),
         ("alchimiste", "Il me faut des moules alternatifs : d'autres façons de fabriquer une potion.")],
        ("alchimiste", "Une potion, trois façons de la fabriquer. Mon laboratoire est sauvé !"),
    ),
    "r5l3": scene(
        [npc("ingenieure", "L'ingénieure", "engineer", FRONT)],
        [prop("cauldron", BACK, color="#3ad07a"), prop("potions", SIDE), prop("board", RIGHT, "étiquettes mélangées")],
        [("ingenieure", "L'Illager alchimiste a mélangé toutes nos étiquettes !"),
         ("ingenieure", "Quelle méthode a besoin d'un chaudron ? Laquelle du plan ? Laquelle de rien ?"),
         ("ingenieure", "Cette fois, c'est toi qui choisis… et qui sais le justifier.")],
        ("ingenieure", "Chaque étiquette est à sa place. L'Illager s'enfuit !"),
    ),
    "r6l1": scene(
        [npc("architecte", "L'architecte", "architect", FRONT)],
        [prop("turret", BACK, "tourelle"), prop("turret", SIDE, "tourelle"), prop("board", RIGHT, "carnet de bord")],
        [("architecte", "Au sommet de la Tour, nos tourelles défendent le royaume."),
         ("architecte", "Je veux savoir combien de fois chacune a tiré, rechargé, ou s'est enrayée."),
         ("architecte", "Ces compteurs ne regardent qu'elles : le carnet sera construit DANS leur plan.")],
        ("architecte", "Chaque tourelle a son carnet intégré. Parfait !"),
    ),
    "r6l2": scene(
        [npc("architecte", "L'architecte", "architect", FRONT)],
        [prop("turret", BACK, "tourelle classique"), prop("turret", RIGHT, "tourelle de givre", color="#9fdcff"),
         prop("crystal", SIDE, color="#bff4ff")],
        [("architecte", "Voici la nouvelle tourelle de givre : elle peut geler les ennemis."),
         ("architecte", "Il faut compter les gels…"),
         ("architecte", "…sans toucher au plan des tourelles classiques, qui fonctionne parfaitement.")],
        ("architecte", "Les gels sont comptés et l'ancien plan est intact. Bravo !"),
    ),
    "r6l3": scene(
        [npc("general", "Le général", "general", FRONT),
         npc("architecte", "L'architecte", "architect", SECOND)],
        [prop("turret", BACK), prop("turret", RIGHT, color="#9fdcff"), prop("tent", SIDE, "avant-poste")],
        [("general", "Je veux UN seul outil d'inspection, pour n'importe quelle tourelle."),
         ("general", "Aujourd'hui comme demain, quand de nouveaux modèles arriveront."),
         ("architecte", "Et pour chaque avant-poste, le nombre total de tirs ?"),
         ("general", "Exactement. Au travail !")],
        ("general", "Un inspecteur universel. Le royaume est entre de bonnes mains."),
    ),
    "r6l4": scene(
        [npc("architecte", "L'architecte", "architect", FRONT),
         npc("chevalier", "Le champion", "lord", SECOND)],
        [prop("banner", BACK, color="#5a2a8a"), prop("dummy", RIGHT, "l'arène"), prop("turret", SIDE)],
        [("chevalier", "Le Dragon de l'End attaque la Tour !"),
         ("architecte", "Il nous faut une arène : des combattants qui se frappent, chacun avec ses statistiques."),
         ("chevalier", "Et chaque type de combattant avec son style. Le dragon testera tout.")],
        ("chevalier", "Le Dragon recule ! L'arène a résisté à tout."),
    ),
    "r7l1": scene(
        [npc("roi", "Le roi", "king", FRONT),
         npc("ouvrier", "Un ouvrier", "builder", SECOND)],
        [prop("throne", BACK, "le trône"), prop("house", RIGHT, n=2), prop("clock", SMALL1, "jour / nuit")],
        [("roi", "Tu as traversé toutes les régions. Voici ta dernière mission."),
         ("roi", "Je veux un royaume qui tourne tout seul : des ouvriers le jour, du repos la nuit."),
         ("ouvrier", "Des mineurs, des bâtisseurs, des maîtres mineurs… chacun avec son journal."),
         ("roi", "Aucun code de départ : c'est TON architecture. Tu devras l'expliquer.")],
        ("roi", "Le royaume tourne tout seul. Je te nomme Grand Architecte !"),
    ),
    # --------------------------------------------------------- Act III
    "x1l1": scene(
        [npc("ingenieure", "La technicienne", "engineer", FRONT)],
        [prop("sensor", BACK, "le capteur fêlé"), prop("sensor", RIGHT, "capteur"), prop("rocks", SIDE)],
        [("ingenieure", "Bienvenue dans les Terres Instables."),
         ("ingenieure", "Ici, les capteurs se fissurent et les données arrivent abîmées."),
         ("ingenieure", "Jusqu'ici, la moindre erreur faisait exploser ton programme."),
         ("ingenieure", "Un vrai système encaisse l'erreur… et continue.")],
        ("ingenieure", "Le capteur est fêlé, mais le système tient. Bien joué !"),
    ),
    "x1l2": scene(
        [npc("trieur", "Le trieur", "miner", FRONT)],
        [prop("chest", BACK, "le coffre automatique"), prop("stacks", SIDE, "les piles", n=5),
         prop("board", RIGHT, "1 à 64 par pile")],
        [("trieur", "Mon coffre automatique trie les objets en piles."),
         ("trieur", "Une pile contient au moins 1 objet, et jamais plus de 64."),
         ("trieur", "Mais une pile de 500 ? Python ne dit rien… C'est à toi de lever une erreur !")],
        ("trieur", "Les piles absurdes sont refusées. Mon coffre est fiable !"),
    ),
    "x1l3": scene(
        [npc("ingenieure", "La mécanicienne", "engineer", FRONT)],
        [prop("levers", BACK, "la machine aux six leviers", n=6), prop("rocks", SIDE), prop("toolrack", RIGHT)],
        [("ingenieure", "Une machine oubliée… avec six leviers rouillés."),
         ("ingenieure", "Chacun déclenche une panne différente."),
         ("ingenieure", "Pour la réparer, il faut d'abord savoir reconnaître chaque panne.")],
        ("ingenieure", "Toutes les pannes sont reconnues. La machine redémarre !"),
    ),
    "x1l4": scene(
        [npc("ingenieure", "L'ingénieure", "engineer", FRONT),
         npc("apprenti", "L'apprenti", "builder", SECOND)],
        [prop("redstone", BACK, "le circuit"), prop("board", RIGHT, "ValueError ???"), prop("workbench", SIDE)],
        [("apprenti", "ValueError, ValueError… ça ne veut rien dire !"),
         ("ingenieure", "On veut des erreurs qui parlent notre langue : circuit ouvert, surcharge…"),
         ("ingenieure", "Bonne nouvelle : une exception est une classe. Et tu sais créer des classes.")],
        ("apprenti", "« Surcharge du circuit » ! Enfin une erreur qu'on comprend !"),
    ),
    "x1l5": scene(
        [npc("gardien", "Le gardien du portail", "keeper", FRONT)],
        [prop("portal", BACK, "le portail", invert=True), prop("torch", SMALL2), prop("rocks", SIDE)],
        [("gardien", "Ce portail mène à une autre dimension."),
         ("gardien", "Tant qu'il est ouvert, il est dangereux."),
         ("gardien", "Quoi qu'il arrive pendant l'expédition, même une catastrophe…"),
         ("gardien", "…je dois TOUJOURS le refermer.")],
        ("gardien", "Le portail se referme à chaque fois, quoi qu'il arrive. Merci."),
    ),
    "x1l6": scene(
        [npc("ingenieure", "La technicienne", "engineer", FRONT),
         npc("veilleur", "Le veilleur", "keeper", SECOND)],
        [prop("storm", (-2.0, 0.6), "la tempête"), prop("sensor", RIGHT), prop("sensor", SIDE)],
        [("veilleur", "Une tempête brouille toutes les transmissions !"),
         ("ingenieure", "Les rapports arrivent mal formés, hors limites, illisibles…"),
         ("ingenieure", "Notre système doit trier le bon grain de l'ivraie… sans jamais tomber.")],
        ("veilleur", "La tempête se dissipe. Le système n'est jamais tombé !"),
    ),
    # ---------------------------------------------------------- Act IV
    "k1l1": scene(
        [npc("joueur", "Le joueur du serveur", "player", FRONT),
         npc("bibliothecaire", "La bibliothécaire", "librarian", SECOND)],
        [prop("chatboard", BACK, "le chat du serveur"), prop("bookshelf", RIGHT), prop("lectern", SIDE)],
        [("bibliothecaire", "Bienvenue dans la Grande Bibliothèque : ici, tout est rangé en collections."),
         ("joueur", "Moi, je tape des commandes dans le chat, comme /tp 10 64 -3."),
         ("bibliothecaire", "Ton programme les reçoit… sous forme de liste : sys.argv.")],
        ("joueur", "Ma commande est parfaitement comprise. Téléportation !"),
        argv_by="joueur",
    ),
    "k1l2": scene(
        [npc("coureur", "La speedrunneuse", "runner", FRONT),
         npc("bibliothecaire", "La bibliothécaire", "librarian", SECOND)],
        [prop("podium", BACK, "le podium"), prop("board", SIDE, "les records"), prop("clock", RIGHT)],
        [("coureur", "Voici mes temps pour vaincre le dragon, en secondes !"),
         ("bibliothecaire", "Saisis à la main… il y a des fautes de frappe."),
         ("bibliothecaire", "Il faut une liste propre, et un podium.")],
        ("coureur", "Je suis sur le podium ! Le tableau des records est parfait."),
        argv_by="coureur",
    ),
    "k1l3": scene(
        [npc("cartographe", "Le cartographe", "cartographer", FRONT)],
        [prop("portal", BACK, "portail du Nether", color="#9a4ae8"), prop("board", RIGHT, "coordonnées gravées"),
         prop("maptable", SIDE)],
        [("cartographe", "Nous gravons les coordonnées des portails dans la pierre."),
         ("cartographe", "Une fois écrites, elles ne changent plus."),
         ("cartographe", "Et chaque bloc du Nether vaut 8 blocs dans le monde normal."),
         ("cartographe", "Je vais te dicter mes positions. Attention, je fais parfois des fautes !")],
        ("cartographe", "Les coordonnées sont justes : le portail mène au bon endroit !"),
        answers="cartographe",
    ),
    "k1l4": scene(
        [npc("cartographe", "Le cartographe", "cartographer", FRONT),
         npc("exploratrice", "L'exploratrice", "explorer", SECOND)],
        [prop("maptable", BACK, "la grande carte"), prop("tent", RIGHT, color="#7a9a5a"), prop("tree", SMALL1)],
        [("exploratrice", "Nous revenons à trois, avec nos carnets !"),
         ("cartographe", "Vous avez vu les mêmes biomes plusieurs fois, sous des orthographes différentes."),
         ("cartographe", "Je veux savoir quels biomes ont été vus, par qui, et ce qui reste à explorer.")],
        ("cartographe", "La carte est complète, sans doublon. Il ne reste plus qu'à explorer !"),
    ),
    "k1l5": scene(
        [npc("cuisinier", "Le cuisinier", "cook", FRONT)],
        [prop("lectern", BACK, "le Livre des recettes"), prop("chest", RIGHT, "l'inventaire"),
         prop("workbench", SIDE)],
        [("cuisinier", "Voici le Livre des recettes : chaque recette associe des ingrédients à des quantités."),
         ("cuisinier", "Mon inventaire associe des objets à des nombres."),
         ("cuisinier", "Pour fabriquer, il faut comparer les deux.")],
        ("cuisinier", "Je sais exactement ce que je peux fabriquer. Au fourneau !"),
    ),
    "k2l1": scene(
        [npc("veilleur", "La sentinelle", "guard", FRONT)],
        [prop("spawner", BACK, "la Source"), prop("fountain", SIDE, "la Source Infinie"), prop("banner", RIGHT)],
        [("veilleur", "La Source Infinie déverse des monstres sans fin !"),
         ("veilleur", "Impossible de préparer la liste de toutes les vagues : elle serait infinie."),
         ("veilleur", "Il faut les produire à la demande, une par une.")],
        ("veilleur", "Les vagues arrivent une par une, sans saturer la mémoire. Tenu !"),
    ),
    "k2l2": scene(
        [npc("alchimiste", "L'apprenti alchimiste", "alchemist", FRONT)],
        [prop("cauldron", BACK, color="#5ee6e0"), prop("fountain", RIGHT), prop("potions", SIDE)],
        [("alchimiste", "Mon maître, l'Alchimiste des données, transforme une liste d'un geste."),
         ("alchimiste", "Ses formules tiennent en une ligne : les compréhensions."),
         ("alchimiste", "Pour le vaincre, il faut parler sa langue.")],
        ("alchimiste", "Tu parles sa langue mieux que lui ! L'Alchimiste est vaincu."),
    ),
    "k3l1": scene(
        [npc("gardien", "Le gardien du Cœur", "warden", FRONT),
         npc("cartographe", "Le cartographe", "cartographer", SECOND)],
        [prop("altar", BACK, "l'autel du Cœur"), prop("maptable", RIGHT, "les chunks"), prop("crystal", SIDE, color="#f2c14e")],
        [("gardien", "Tu es venu jusqu'ici. Bien peu de voyageurs atteignent le Cœur du Monde."),
         ("gardien", "Le Cœur s'est éveillé à ton arrivée… mais ses sceaux s'éteignent déjà."),
         ("cartographe", "Tout ce que tu as appris converge ici. Rallume les quatre sceaux, et il s'éveillera."),
         ("gardien", "Ce sera ton plus grand programme. Prends ton temps : le Cœur t'attendra.")],
        ("gardien", "Les quatre sceaux brillent. Le Cœur du Monde bat de nouveau ! Tu as terminé PyCraft !"),
        ("gardien", "Les sceaux vacillent… Regarde les vérifications en ✗ et réessaie."),
        argv_by="cartographe",
    ),
}
# The last level has its own cinematic (see web/js/finale.js).
SCENES["k3l1"]["cinematic"] = "finale"

# What the programs of a level do to its world. The patterns use what the
# demonstration and the mission (its locked tester, the names it imposes)
# really do, so that the player's own code changes the scene too.
RED = "#e5534b"
RULES: dict[str, list[dict[str, Any]]] = {
    "a1l1": [
        # The demo: the bell rings at each call.
        react({"call": "sonner_cloche"}, ["sound", "bell"],
              ["pulse", "house"], ["pose", "ancien", "cheer"]),
        # The mission: the night falls, then each call of the function
        # lights the lantern (a second call rekindles it: it never goes
        # out by itself), the light drives the zombie away.
        react({"print": "nuit tombe"}, ["night", True],
              ["mob", "Zombie", [-0.6, 4.6]],
              ["say", "ancien", "La nuit tombe… vite, la lanterne !"]),
        react({"call": "allumer_lanterne"}, ["light", "lantern", True],
              ["flee"], ["pose", "ancien", "cheer"]),
        react({"print": "rentrent chez eux"},
              ["light", "house", True], ["open", "house", True]),
    ],
    "r1l1": [
        react({"print": "Bienvenue"}, ["pulse", "board"],
              ["pose", "chef", "cheer"]),
        react({"print": "Marché ouvert"}, ["pulse", "crates"],
              ["sound", "bell"]),
        react({"var": "forge_name"}, ["pulse", "board"]),
        react({"var": "iron_ingots"}, ["pulse", "crates"]),
        react({"var": "coal_needed"}, ["pulse", "furnace"]),
        react({"var": "is_open", "value": "True"},
              ["light", "furnace", True], ["pose", "forgeron", "cheer"]),
        react({"var": "is_open", "value": "False"},
              ["light", "furnace", False]),
    ],
    "a1l3": [
        react({"input": True}, ["pose", "villageois", "talk"]),
        react({"call": "commande_torches"}, ["light", "torch", True]),
        react({"returns": "commande_torches"}, ["light", "house", True],
              ["pose", "villageois", "cheer"]),
    ],
    "a1l4": [
        # The demo: the light level decides the time of day.
        react({"print": "monstres peuvent"}, ["night", True],
              ["mob", "Zombie", [0.4, 3.0]]),
        react({"print": "Zone sûre"}, ["night", True],
              ["light", "torch", True], ["flee"]),
        react({"print": "Plein jour"}, ["night", False], ["flee"]),
        # The mission: the guard lets the traveller cross… or not.
        react({"print": "Passe,"}, ["pulse", "bridge"],
              ["pose", "garde", "cheer"], ["pose", "voyageur", "cheer"]),
        react({"print": "Reviens quand"}, ["pose", "voyageur", "sad"]),
        react({"print": "Prends une torche"}, ["light", "torch", True]),
    ],
    "a2l1": [
        # Each floor printed by the program is a floor of the tower.
        react({"print": "Étage"}, ["grow", "blocktower"]),
        react({"print": "Total"}, ["pulse", "blocktower"],
              ["pose", "mineur", "cheer"]),
        react({"print": "Somme des étages"}, ["pose", "mineur", "cheer"]),
        react({"print": "Étages construits"}, ["pulse", "blocktower"]),
    ],
    "a2l2": [
        # Each call of the recursive echo: the cave answers.
        react({"call": "echo"}, ["pulse", "cave"], ["sound", "blip"]),
        react({"call": "signal_recursif"}, ["pulse", "redstone"],
              ["sound", "blip"]),
        react({"call": "signal_iteratif"}, ["pulse", "redstone"]),
        react({"returns": "signal_recursif"},
              ["light", "redstone", True]),
        react({"returns": "signal_iteratif"},
              ["light", "redstone", True]),
        react({"print": "Pyramide"}, ["pulse", "rocks"]),
    ],
    "a2l3": [
        react({"call": "presenter"}, ["pulse", "board"],
              ["pose", "scribe", "talk"]),
        react({"call": "formater_pseudo"}, ["pulse", "board"]),
        react({"call": "afficher_badge"}, ["pulse", "gate"],
              ["sound", "page"]),
    ],
    "r1l2": [
        react({"print": "__name__"}, ["pulse", "gate"]),
        react({"call": "main"}, ["open", "gate", True],
              ["pose", "batisseur", "cheer"]),
    ],
    "r2l3": [
        # Smelting lights the furnaces.
        react({"call": "smelt"}, ["light", "furnace", True]),
        react({"call": "move"}, ["pulse", "crates"]),
        react({"print": "panne"}, ["burst", "crates", "#8a8a8a"]),
    ],
    "r3l2": [
        react({"spawn": "Beacon"}, ["light", "beacon", True]),
        react({"call": "set_power"}, ["pulse", "beacon"]),
        react({"call": "set_speed"}, ["pulse", "gate"]),
        # A refused value: a red flash.
        react({"print": "refus"}, ["burst", "beacon", RED],
              ["pose", "seigneur", "talk"]),
    ],
    "r5l1": [
        react({"call": "light"}, ["light", "redstone", True],
              ["burst", "crystal", "#b48cf2"]),
        react({"call": "output"}, ["pulse", "redstone"]),
    ],
    "x1l1": [
        react({"print": "illisible"}, ["burst", "sensor", RED]),
        react({"print": "rejetée"}, ["burst", "sensor", RED]),
        react({"print": "n'a pas planté"}, ["light", "sensor", True],
              ["pose", "ingenieure", "cheer"]),
        react({"print": "fonctionne toujours"},
              ["light", "sensor", True], ["pose", "ingenieure", "cheer"]),
    ],
    "x1l5": [
        react({"print": "Ouverture du portail"},
              ["light", "portal", True]),
        react({"print": "traverse le portail"}, ["pulse", "portal"]),
        react({"print": "Alerte"}, ["burst", "portal", RED],
              ["pose", "gardien", "talk"]),
        react({"print": "Fermeture du portail"},
              ["light", "portal", False], ["sound", "door"]),
        react({"print": "finally pour"}, ["light", "torch", True]),
    ],
    "k2l1": [
        # Each value produced by a generator: the Source pulses. Each wave
        # printed: its creatures come out.
        react({"yield": True}, ["pulse", "spawner"], ["sound", "spawn"]),
        react({"print": "zombie"}, ["mob", "Zombie", [0.6, -1.0]]),
        react({"print": "araignée"}, ["mob", "Spider", [0.6, -1.0]]),
        react({"print": "creeper"}, ["mob", "Creeper", [0.6, -1.0]]),
        react({"print": "Au tour de"}, ["pulse", "fountain"]),
    ],
    # ------------------------------------------- Acts III to V (objects)
    # A new object comes out of the workshop of the level; its methods
    # make the scenery work.
    "r1l3": [
        react({"call": "announce"}, ["pulse", "board"]),
        react({"call": "main"}, ["pulse", "workbench"],
              ["pose", "batisseur", "cheer"]),
    ],
    "r2l1": [
        react({"spawn": "*"}, ["pulse", "workbench"],
              ["burst", "crystal", "#b8f36b"]),
    ],
    "r2l2": [
        react({"spawn": "*"}, ["pulse", "workbench"]),
        react({"call": "attack"}, ["pulse", "dummy"], ["sound", "clang"]),
        react({"call": "introduce"}, ["pose", "artisan", "talk"]),
    ],
    "r2l4": [
        react({"spawn": "*"}, ["pulse", "workbench"]),
        react({"call": "describe"}, ["pulse", "toolrack"]),
    ],
    "r2l5": [
        react({"spawn": "*"}, ["open", "chest", True]),
        react({"call": "put"}, ["pulse", "chest"], ["pulse", "crates"]),
    ],
    "r3l1": [
        react({"spawn": "*"}, ["pulse", "gate"]),
        react({"call": "take_hit"}, ["pulse", "gate"], ["sound", "clang"]),
    ],
    "r3l3": [
        react({"spawn": "*"}, ["pulse", "gate"]),
        react({"call": "try_open"}, ["pulse", "chest"], ["sound", "door"]),
    ],
    "r4l1": [
        react({"spawn": "*"}, ["pulse", "forge"], ["sound", "clang"]),
        react({"call": "howl"}, ["sound", "creature"]),
    ],
    "r4l2": [
        react({"spawn": "*"}, ["pulse", "forge"], ["pulse", "minecart"]),
    ],
    "r4l3": [
        react({"spawn": "*"}, ["pulse", "anvil"], ["sound", "clang"]),
        react({"call": "describe"}, ["pulse", "toolrack"]),
    ],
    "r4l4": [
        react({"spawn": "*"}, ["pulse", "forge"]),
        react({"call": "upgrade"}, ["pulse", "anvil"], ["sound", "clang"]),
    ],
    "r5l2": [
        react({"spawn": "*"}, ["burst", "cauldron", "#b48cf2"]),
        react({"call": "water"}, ["pulse", "potions"]),
    ],
    "r5l3": [
        react({"spawn": "*"}, ["burst", "cauldron", "#5ee6e0"]),
    ],
    "r6l1": [
        react({"spawn": "*"}, ["pulse", "turret"]),
        react({"call": "drain"}, ["pulse", "turret"], ["sound", "zap"]),
    ],
    "r6l2": [
        react({"spawn": "*"}, ["pulse", "turret"],
              ["burst", "crystal", "#9fdcff"]),
    ],
    "r6l3": [
        react({"spawn": "*"}, ["pulse", "turret"]),
        react({"call": "sound"}, ["pulse", "tent"]),
    ],
    "r6l4": [
        react({"call": "strike"}, ["pulse", "dummy"], ["sound", "clang"]),
        react({"call": "take_damage"}, ["burst", "banner", RED]),
    ],
    # ------------------------------------------- Act X (errors)
    # A raised exception: a red flash on the machine; caught: it holds.
    "x1l2": [
        react({"raise": True}, ["burst", "stacks", RED]),
        react({"caught": True}, ["pulse", "board"]),
        react({"call": "regler"}, ["pulse", "chest"]),
    ],
    "x1l3": [
        react({"raise": True}, ["burst", "levers", RED], ["sound", "zap"]),
        react({"caught": True}, ["pulse", "toolrack"]),
    ],
    "x1l4": [
        react({"spawn": "*"}, ["pulse", "workbench"]),
        react({"raise": True}, ["burst", "redstone", RED]),
    ],
    "x1l6": [
        react({"raise": True}, ["burst", "storm", RED]),
        react({"print": ""}, ["pulse", "sensor"]),
    ],
    # ------------------------------------------- Acts XI and XII (data)
    "k1l1": [react({"print": ""}, ["pulse", "chatboard"])],
    "k1l2": [
        react({"print": ""}, ["pulse", "podium"]),
        react({"raise": True}, ["burst", "board", RED]),
    ],
    "k1l3": [
        react({"print": ""}, ["pulse", "maptable"]),
        react({"raise": True}, ["burst", "portal", RED]),
    ],
    "k1l4": [react({"print": ""}, ["pulse", "maptable"])],
    "k1l5": [react({"print": ""}, ["pulse", "lectern"])],
    "k2l2": [react({"print": ""}, ["burst", "cauldron", "#5ee6e0"])],
}
for _level, _rules in RULES.items():
    SCENES[_level]["react"] = _rules
