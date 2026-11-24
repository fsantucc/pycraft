# ⛏ PyCraft — apprendre Python en construisant un monde

PyCraft transforme les programmes de quatre sujets Python de l'École 42 en une seule aventure :

| Acte | Sujet | Notions |
|---|---|---|
| I — Les Fondations | python00 *Growing Code* | fonctions, `input`, calculs, conditions, boucles, récursion, annotations |
| II — L'Ère des Créateurs | python01 *Code Cultivation* | programmation orientée objet |
| III — Les Terres Instables | python02 *Garden Guardian* | exceptions, `raise`, `finally`, erreurs personnalisées |
| IV — Le Royaume des Données | python03 *Data Quest* | `sys.argv`, listes, tuples, sets, dicts, générateurs, compréhensions |

13 régions, 43 niveaux, une grande finale qui mélange les quatre actes. **Aucun exercice des
sujets n'est repris** : seules les notions le sont.

Le principe : **le code que tu écris pilote réellement le monde**. Ton programme est
exécuté dans un bac à sable qui enregistre tout ce qui se passe (appels de fonctions, saisies,
classes, objets, attributs, méthodes, `super()`, exceptions levées et attrapées, `yield`,
contenu des listes et dictionnaires, `print`, erreurs). Le monde rejoue ensuite cette exécution
instruction par instruction.

| Dans ton code | Dans le monde |
|---|---|
| `class Zombie:` | un plan holographique apparaît dans la zone de création, **aucun zombie** |
| `z = Zombie()` | un zombie sort du plan, étiqueté `z : Zombie` |
| `self.health = 80` | bulle `health : 100 → 80`, barre de vie mise à jour |
| `player.attack()` | le personnage s'anime ; ses `print` sortent de sa bouche |
| `obj._x = -5` hors de la classe | alerte rouge « accès externe à un attribut protégé » |
| setter qui refuse | bouclier rouge, valeur inchangée |
| `class Wolf(Animal)` | fil doré du plan enfant vers le plan parent |
| `super().__init__()` | rayon doré de l'objet vers le plan parent |
| `@staticmethod` | le plan travaille seul (⚙ « sans objet ») |
| `@classmethod` + `cls()` | rayon bleu du plan vers l'objet créé |
| classe imbriquée | petit plan dans le grand, composant en satellite de son propriétaire |
| appel de fonction, récursion | un bloc s'empile sur la tour « pile d'appels » |
| `input("Âge ? ")` | le crieur pose la question, la réponse arrive entre guillemets (un `str`) |
| liste / tuple / set / dict | étagère avec index / tablette de pierre / sac sans ordre / armoire à tiroirs étiquetés |
| `raise` / `except` | éclair là où l'exception part, filet vert là où elle est attrapée |
| `yield` | le générateur se met en pause dans la pile et fait jaillir sa valeur |

---

## Lancer le jeu depuis VS Code

**Prérequis** : Python **3.10 ou plus récent** et un navigateur récent (Chrome,
Firefox, Edge, Safari). **Aucune installation de paquet n'est nécessaire** : le jeu
n'utilise que la bibliothèque standard de Python.

1. Dans VS Code : **Fichier → Ouvrir le dossier…** et choisis le dossier `pycraft`.
2. Au choix :
   - onglet **Exécuter et déboguer** (Ctrl+Maj+D) → **▶ Lancer PyCraft** → F5 ;
   - ou **Terminal → Exécuter la tâche… → PyCraft : lancer le jeu** ;
   - ou dans le terminal intégré : `python3 run.py` (Windows : `py -3 run.py`).
3. Le navigateur s'ouvre sur **http://127.0.0.1:8765**. Sinon, ouvre cette adresse.
4. Pour arrêter : Ctrl+C dans le terminal.

Options : `python3 run.py --port 9000`, `--no-browser`, `--save chemin/vers/sauvegarde.json`.

Facultatif (recommandé pour la Région 1 et le bonus « code propre ») :

```
python3 -m pip install flake8 mypy pytest
```

Le bouton **Analyse qualité** fait toujours une revue intégrée (longueur des lignes,
indentation, lignes vides, conventions de nommage, annotations de type) et lance en
plus les vrais **flake8** et **mypy** quand ils sont installés.

## Comment on joue

- **Gauche** : l'éditeur Python (coloration, numéros de ligne, auto-indentation,
  autocomplétion, plusieurs fichiers, Ctrl+Entrée pour exécuter, Ctrl+/ pour commenter,
  bouton Réinitialiser, sauvegarde automatique). Dans l'Acte I, le fichier `main.py` est
  **verrouillé** 🔒 : c'est le testeur qui importe et appelle ta fonction.
  Sous l'éditeur, **⌨ Entrées du programme** : ce que l'utilisateur tape au clavier
  (une réponse par ligne, pour `input()`) et les arguments de la ligne de commande (`sys.argv`).
- **Centre** : le monde, avec la barre de lecture : ⏮ ◀ ▶/⏸ ▶| ⏭, curseur, vitesse.
  **F10** avance d'une instruction, **Maj+F10** recule. La ligne exécutée est surlignée
  dans l'éditeur, la console n'affiche que ce qui a déjà été imprimé, et le journal
  décrit chaque événement en français. Glisser pour déplacer, molette pour zoomer,
  ⟳ pour pivoter, clic sur un objet ou un plan pour l'inspecter.
- **Droite** :
  - **Leçon** : les 7 étapes du niveau (Découverte → Explication → Démo →
    Essais → Mission → Vérification → Maîtrise) ;
  - **Inspecteur** : ligne en cours, pile d'appels, variables locales, variables du
    programme, tous les objets et leurs attributs (🔒 = protégé) ;
  - **Diagramme** : diagramme de classes interactif (héritage, imbrication, méthodes
    statiques/de classe, attributs observés) et diagramme d'objets avec leurs références.

**Missions** : chaque mission est vérifiée par une batterie de tests cachés qui crée
ses propres objets avec des valeurs aléatoires et des cas limites. Copier une sortie
ne suffit pas. En cas d'échec : la vérification ratée, le message, la ligne concernée,
et une explication de l'erreur Python (ce qui se passe, pourquoi, piste). Les
**indices** sont progressifs (3 par mission) et coûtent un peu d'XP. Le jeu ne donne
jamais la solution.

**Maîtrise** : après la mission viennent des questions de **prédiction** (tu écris ce
que le programme affichera : le jeu l'exécute vraiment pour comparer), des **QCM** et
des **explications** avec tes mots (enregistrées dans ton journal). Un niveau est
« maîtrisé » si la mission est réussie avec au plus un indice et le quiz réussi du
premier coup ; sinon il est « à revoir », et le **défi de maîtrise** permet de refaire
le quiz.

**Progression** : XP, niveau de joueur, récompense à chaque région terminée, carte du
monde, tableau de bord des 129 notions (découvertes / à revoir / maîtrisées), historique
des missions. Sauvegarde automatique dans `saves/progress.json`.

**Statistiques et succès** (bouton *Progression*) : temps de jeu, exécutions, erreurs
rencontrées et corrigées, missions sans indice, erreurs les plus fréquentes, temps par
notion, et 17 succès dont la plupart sont cachés jusqu'à leur déblocage.

**Erreurs guidées** : quand ton programme plante, la console explique l'erreur en
français puis pose des questions, une à la fois, pour t'aider à trouver la cause, sans
jamais donner la correction. *Montrer sur la carte* entoure dans le monde les objets,
classes et variables en cause.

**Sons** : cloche du crieur, apparition d'objets, appels, exceptions, victoire… tous
générés par le navigateur (aucun fichier). Bouton 🔊/🔇 en haut à droite.

**Visite guidée** : proposée au premier lancement, rejouable avec le bouton **?**.

## Contenu

Voir **`docs/ANALYSE_ET_PROGRAMME.md`** : analyse des quatre sujets, inventaire des
notions (dont celles ajoutées à ta liste et les extensions facultatives signalées),
matrice notion → niveau, et mécaniques de visualisation.

Le détail des 13 régions et la matrice notion → niveau sont dans le document d'analyse.

## Architecture

```
pycraft/
├── run.py                      point d'entrée (serveur local 127.0.0.1)
├── server/
│   ├── app.py                  API HTTP (bibliothèque standard uniquement)
│   ├── sandbox/
│   │   ├── __init__.py         lance chaque exécution dans un processus isolé
│   │   └── runner.py           traceur exécuté DANS le processus isolé
│   ├── pedagogy.py             exécution, vérification des missions, indices, quiz
│   ├── progress.py             XP, statuts, notions, sauvegarde JSON
│   ├── static_checks.py        analyse AST (règles de mission) + revue qualité
│   ├── errors_fr.py            explication des erreurs Python en français
│   ├── achievements.py         statistiques et succès
│   └── curriculum/             régions, niveaux, missions, quiz (données)
├── web/                        interface (HTML/CSS/JS sans dépendance)
│   └── js/  main · editor · world · models · fx · trace · inspector · diagram
│            lesson · tour · sound · util
├── tests/                      pytest (+ solutions de référence : SPOILERS)
│   ├── test_frontend.py        JS : syntaxe, imports, ids, tests unitaires,
│   │                           test dans un vrai navigateur (si Chrome présent)
│   └── js/                     tests unitaires JavaScript (node --test)
└── docs/ANALYSE_ET_PROGRAMME.md
```

### Sécurité de l'exécution

Le code de l'apprenant **n'est jamais exécuté dans le serveur**. Chaque exécution lance
un nouvel interpréteur `python -I` dans un dossier temporaire vide, avec un
environnement vide, et :

- limites de ressources (temps CPU, mémoire, aucune écriture de fichier) sur macOS / Linux ;
- délai maximal (8 s), après lequel le processus est tué ;
- arrêt de la visualisation au-delà de 4 000 étapes (boucles infinies) ;
- crochet d'audit qui refuse ouverture de fichiers, réseau, sous-processus,
  suppression, `ctypes`… ;
- liste blanche d'imports (math, random, sys, typing, dataclasses, enum, abc,
  collections…) plus les fichiers de l'apprenant ;
- `input()` lit les « Entrées du programme » que tu prépares ;
- `open()` est virtuel : il lit tes propres fichiers, tout autre nom lève
  `FileNotFoundError`, et l'écriture est refusée.

Limite honnête : ce n'est pas un conteneur. C'est adapté à un usage local par
l'apprenant lui-même, pas à l'exécution de code inconnu sur un serveur public. Sous
Windows, les limites de ressources POSIX n'existent pas : seuls le délai, le crochet
d'audit et la liste blanche s'appliquent.

## Tests

```
python3 -m pytest -q tests        # 236 tests
python3 -m mypy server run.py     # aucune erreur
```

Les tests vérifient notamment que **chaque mission est réalisable** (solution de
référence acceptée), que **chaque code de départ est refusé**, que chaque démo et
chaque question de prédiction s'exécutent, que les réponses ne sont jamais envoyées
au navigateur, et qu'une partie complète (43 niveaux, quiz compris) se joue de bout
en bout. Les solutions de `tests/solutions/` sont des **spoilers** : ne les ouvre pas
si tu joues.

## Ce qui est fait, et ses limites

Fonctionnel et testé : les 43 niveaux, le bac à sable, le traceur, le monde voxel,
la lecture pas à pas (avant/arrière), l'éditeur multi-fichiers, l'inspecteur, les
diagrammes, les vérifications, les indices, les quiz, la progression et la sauvegarde.

Limites à connaître :

- **Rendu** : un moteur isométrique 2,5D écrit sur mesure (canvas), pas Three.js.
  Choix volontaire : aucune dépendance à télécharger, fonctionne hors ligne et
  m'a permis de tester l'interface ici. Le moteur est isolé dans `web/js/world.js`
  si tu veux le remplacer.
- **Pas à pas** : le programme s'exécute d'abord en entier dans le bac à sable, puis
  le jeu rejoue la trace enregistrée (comme Python Tutor). « Pause » met en pause la
  relecture, pas le processus Python.
- **Autocomplétion** : simple (mots-clés, fonctions intégrées, noms du fichier,
  attributs `self.`), sans analyse de types.
- **Explications écrites** : enregistrées et comparées à une réponse de référence,
  mais pas notées automatiquement sur le fond (il faut au moins une phrase complète).
- **Modèles 3D** : choisis d'après le nom de la classe (zombie, mouton, coffre, tourelle…),
  puis hérités du parent ; une classe inconnue devient un cube coloré.

## Ajouter un niveau

Crée un objet `Level` dans `server/curriculum/rX_*.py` (histoire, explication, démo,
essais, mission, code de départ, vérifications `static(...)` / `dynamic(...)`,
indices, quiz), ajoute sa solution dans `tests/solutions/<id>/main.py`, puis lance
`pytest` : les tests refuseront un niveau impossible ou mal vérifié.
