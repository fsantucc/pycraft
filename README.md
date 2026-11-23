# ⛏ PyCraft — apprendre Python (POO) en construisant un monde

PyCraft transforme le programme pédagogique de *Code Cultivation* (structure d'un
programme, classes, encapsulation, héritage, méthodes statiques/de classe, classes
imbriquées, qualité du code) en une aventure en 7 régions et 23 niveaux.
**Aucun exercice du PDF n'est repris** : seules les notions le sont.

Le principe : **le code que tu écris pilote réellement le monde**. Ton programme est
exécuté dans un bac à sable qui enregistre tout ce qui se passe (classes créées,
objets construits, attributs modifiés, méthodes appelées, `super()`, méthodes
statiques et de classe, `print`, erreurs). Le monde rejoue ensuite cette exécution
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
  bouton Réinitialiser, sauvegarde automatique).
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
monde, tableau de bord des 78 notions (découvertes / à revoir / maîtrisées), historique
des missions. Sauvegarde automatique dans `saves/progress.json`.

## Contenu

Voir **`docs/ANALYSE_ET_PROGRAMME.md`** : analyse page par page du PDF, inventaire des
notions (dont celles ajoutées à ta liste et les extensions facultatives signalées),
matrice notion → niveau, et mécaniques de visualisation.

| Région | Niveaux |
|---|---|
| 1 Le Village des Bâtisseurs | variables et exécution · point d'entrée, `__main__`, imports (2 fichiers) · **boss** shebang, conventions, type hints, flake8/mypy |
| 2 L'Atelier des Créateurs | classe / instance · méthodes et `self` · état et simulation · `__init__` et listes · **boss** inventaire |
| 3 La Citadelle des Gardiens | `_` et getters · setters, validation, défauts, `_` vs `__` · **boss** coffre-fort |
| 4 La Forge des Lignées | héritage · `super().__init__` · redéfinition sur 3 niveaux · **boss** hiérarchie complète |
| 5 Le Laboratoire des Ingénieurs | `@staticmethod` · `@classmethod` et `cls()` · **boss** choisir le bon genre de méthode |
| 6 La Tour des Architectes | classe imbriquée de statistiques · stat de sous-classe · fonction indépendante et polymorphisme · **boss** arène d'interactions |
| 7 Le Royaume Automatisé | épreuve finale qui mélange tout + questions de soutenance |

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
│   └── curriculum/             régions, niveaux, missions, quiz (données)
├── web/                        interface (HTML/CSS/JS sans dépendance)
│   └── js/  main · editor · world · models · trace · inspector · diagram · lesson
├── tests/                      pytest (+ solutions de référence : SPOILERS)
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
- liste blanche d'imports (math, random, typing, dataclasses, enum, abc, collections…)
  plus les fichiers de l'apprenant ;
- `input()` désactivé.

Limite honnête : ce n'est pas un conteneur. C'est adapté à un usage local par
l'apprenant lui-même, pas à l'exécution de code inconnu sur un serveur public. Sous
Windows, les limites de ressources POSIX n'existent pas : seuls le délai, le crochet
d'audit et la liste blanche s'appliquent.

## Tests

```
python3 -m pytest -q tests        # 126 tests
python3 -m mypy server run.py     # aucune erreur
```

Les tests vérifient notamment que **chaque mission est réalisable** (solution de
référence acceptée), que **chaque code de départ est refusé**, que chaque démo et
chaque question de prédiction s'exécutent, que les réponses ne sont jamais envoyées
au navigateur, et qu'une partie complète (23 niveaux, quiz compris) se joue de bout
en bout. Les solutions de `tests/solutions/` sont des **spoilers** : ne les ouvre pas
si tu joues.

## Ce qui est fait, et ses limites

Fonctionnel et testé : les 23 niveaux, le bac à sable, le traceur, le monde voxel,
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
