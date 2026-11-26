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
  bouton Réinitialiser, sauvegarde automatique). Les parenthèses, crochets et accolades
  sont colorés par niveau d'imbrication ; celle qui correspond à la parenthèse sous le
  curseur est surlignée ; une parenthèse jamais fermée (ou fermée en trop) est soulignée
  en rouge, avec une marque dans la marge qui explique le problème au survol. `(`, `[`,
  `{` et les guillemets se ferment tout seuls (on « passe par-dessus » le caractère
  fermant en le tapant), Entrée entre deux parenthèses ouvre une ligne indentée,
  `else:` / `elif` / `except` / `finally` se ré-alignent sur leur `if` / `try`, et des
  guides verticaux montrent les niveaux d'indentation. L'autocomplétion connaît aussi
  les fonctions et classes des autres fichiers (avec leurs paramètres). Dans l'Acte I, le fichier `main.py` est
  **verrouillé** 🔒 : c'est le testeur qui importe et appelle ta fonction.
  Sous l'éditeur, **⌨ Entrées du programme** : ce que l'utilisateur tape au clavier
  (une réponse par ligne, pour `input()`) et les arguments de la ligne de commande (`sys.argv`).
- **Centre** : le monde, avec la barre de lecture : ⏮ ◀ ▶/⏸ ▶| ⏭, curseur, vitesse.
  **F10** avance d'une instruction, **Maj+F10** recule. La ligne exécutée est surlignée
  dans l'éditeur, la console n'affiche que ce qui a déjà été imprimé, et le journal
  décrit chaque événement en français. Glisser pour déplacer, molette pour zoomer
  (vers le pointeur), ⟳ pour pivoter, ⌂ ou la touche **Début** pour recentrer ; la carte
  ne peut pas sortir de l'écran. Clic sur un objet ou un plan pour l'inspecter.
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
notion, et 19 succès dont la plupart sont cachés jusqu'à leur déblocage.

**Erreurs guidées** : quand ton programme plante, la console explique l'erreur en
français puis pose des questions, une à la fois, pour t'aider à trouver la cause, sans
jamais donner la correction. *Montrer sur la carte* entoure dans le monde les objets,
classes et variables en cause.

**Son** (bouton 🔊 en haut à droite : volume général, effets, voix, musique) — tout est
synthétisé par le navigateur, aucun fichier audio :
- *effets* : cloche FM du crieur (chaque `print()` joue la note suivante d'une petite
  mélodie), marimba pour les appels de méthode (plus aigu quand l'appel est profond),
  construction d'une classe, apparition magique d'un objet, éclair d'une exception,
  explosion d'une erreur, fanfare de victoire, montée de niveau… avec réverbération,
  compresseur et son placé à gauche/droite selon l'endroit de la carte ;
- *voix* : les personnages « parlent » en syllabes pendant que leur bulle s'écrit, chacun
  avec sa voix (grave pour le roi, aiguë pour la bibliothécaire), et la voix monte à la
  fin d'une question ;
- *musique* : une ambiance calme générée note par note, différente dans chaque région
  (gamme, tempo, instruments) ; elle se baisse toute seule pendant les grands effets.

**Visite guidée** : proposée au premier lancement, rejouable avec le bouton **?**.

**Cinématiques** : la bande-annonce, l'histoire de chaque niveau et la finale utilisent le
même moteur (`web/js/cinematic.js`), avec les mêmes commandes :

| Commande | Bouton | Clavier |
|---|---|---|
| Étape précédente | ⏮ | ← |
| Pause / reprise | ⏸ / ▶ | Espace |
| Étape suivante (chaque appui avance d'une étape, jusqu'à la fin) | ⏭ | → |

Chaque étape remet le monde dans son état de départ (décor, personnages, caméra, sons) :
on peut revenir en arrière, sauter ou mettre en pause à tout moment sans désynchronisation
ni événement joué deux fois. La pause fige vraiment le monde (animations, bulles, effets,
sons). Une cinématique attend aussi, en pause, quand une fenêtre ou la visite guidée la
recouvre.

**Aperçu (à chaque lancement)** : 30 secondes au plus (29,6 s), des plans courts, une
image forte chacun, presque pas de texte. La première fois, la carte de départ propose
« Découvrir PyCraft » et l'aperçu ne peut pas être fermé. Ensuite, elle accueille le
joueur (« Bon retour, aventurier ! »), montre sa partie (niveau, monde, XP, niveaux
terminés) et propose « Reprendre l'aventure » ; l'aperçu se ferme alors à tout moment
avec ✕. ⏸ ⏮ ⏭ : pause, plan précédent / suivant.

1. *Ouverture* (2,2 s) : le titre au-dessus du premier village.
2. *Ce qu'on apprend* (6 plans, ~2 s chacun) : une ligne de code tapée à l'écran et son
   effet sur le monde — une fonction allume la lanterne dans la nuit et fait fuir le
   zombie, une boucle élève une tour étage par étage, une classe fait apparaître un
   troupeau, un boss tombe, une exception explose, un générateur lâche ses vagues.
3. *La progression* (2,4 s) : 4 actes · 13 mondes · 43 niveaux qui défilent, le chemin
   du voyage qui se remplit, des XP et des récompenses.
4. *Les secrets* (2 s) : une bibliothèque la nuit, un livre qui brille, un « 42 » qui
   grésille… sans rien dévoiler.
5. *Le dernier niveau* (8,1 s, le plus long) : le noir, un cœur qui bat ; puis le ciel
   d'aurore, les îles flottantes et le Cœur endormi ; trois de ses quatre sceaux
   s'allument (le quatrième reste éteint) ; la question « Mais seras-tu capable
   d'atteindre Le Cœur du Monde ? ». Son éveil reste une surprise pour la fin du jeu.
6. *À toi de jouer !* (1,6 s) : le logo, et le chemin qui indique « Tu es ici ».

Chaque plan affiche son monde en haut à gauche ; en bas, le chemin du voyage montre les
13 mondes acte par acte jusqu'au Cœur. Le bouton 🎬 le rejoue pendant la partie.
(Pour les tests automatiques, `?intro=0` dans l'adresse saute l'aperçu.)

**Ordinateurs lents** : le sol de chaque lieu de l'aperçu est dessiné à l'avance pendant
la carte de départ (les changements de plan ne figent plus l'image), les effets de
couleur n'utilisent plus de modes de fusion ni de filtres (très lents, voire faux, sur
certaines cartes graphiques), et la qualité s'adapte : si les images tombent sous ~22 par
seconde, le monde est dessiné avec moins de pixels, puis sans les petites textures ni
les halos. Une erreur de dessin ne fige plus jamais le monde (l'image suivante est
toujours demandée). `?quality=high` garde la qualité maximale, `?quality=low` part de la
plus légère.

**Cinématique d'histoire** : la première fois qu'on ouvre un niveau, les personnages
racontent l'histoire ; tant qu'ils n'ont pas fini, « Comprendre → » et les autres étapes
restent verrouillés (⏭ fait avancer, réplique par réplique).

**Le Cœur du Monde (niveau final)** : une région à part, avec son ciel d'aurores, ses
terrasses, ses îles flottantes, ses cristaux suspendus, quatre sceaux (un par acte) et
le Cœur qui flotte au-dessus de son autel. Sa cinématique s'ouvre dans le noir, montre le
Cœur endormi, allume les sceaux un à un, puis l'éveil et l'explosion de lumière, avant
que le gardien ne parle. Pendant la mission, chaque vérification réussie rallume les
sceaux ; la réussite éveille complètement le Cœur. Clique sur le Cœur ou sur un sceau
pour l'écouter. Code : `web/js/coeur.js` (le lieu) et `web/js/finale.js` (la cinématique).

**Objectif de chaque niveau** : en haut de la leçon, « 📚 Tu apprends » (les notions) et
« 🎯 Ta mission ». À l'étape **Essais**, chaque expérience dit quoi changer (ou le fait
pour toi), te demande de **prédire** le résultat avant d'exécuter, puis révèle ce qu'il
faut observer et **pourquoi** ; après chaque exécution, un retour compare la sortie avec
celle de la démo d'origine (lignes ajoutées / disparues, ou l'erreur et sa ligne). Ce
que chaque expérience annonce est vérifié par les tests (`tests/test_experiments.py`).

**Le monde réagit à ton code** : ce que fait le programme change la scène du niveau
(`server/curriculum/scenes.py`, `RULES`, moteur `web/js/reactions.js`). Niveau 1.1 :
`print("La nuit tombe...")` fait vraiment tomber la nuit (ciel, étoiles, lune,
lucioles, un zombie qui rôde) ; chaque appel de `allumer_lanterne()` allume la lanterne
(éteinte au départ : la flamme hésite puis tient, halo chaud) et fait fuir le zombie ;
un deuxième appel la ravive sans l'éteindre ; « rentrent chez eux » éclaire la maison et
ouvre sa porte. Ailleurs : la tour grandit étage par étage, la forge s'allume quand
`is_open` vaut `True`, les vagues d'un générateur font sortir les créatures, une
exception lancée fait jaillir des étincelles rouges… Les 42 niveaux qui ont une démo ont
leurs règles, et les tests vérifient qu'elles réagissent bien à la démo. L'état est
recalculé depuis le début de l'exécution : reculer ou sauter une étape montre toujours
le même monde.

**Mots expliqués (pour les grands débutants)** : dans les leçons, les mots qu'un
débutant risque de ne pas connaître — « Entrées du programme », « inspecteur », « chaîne
de caractères », « entier », « fonction », « boucle », « classe », « exception »… (environ
80 mots, `web/js/glossary.js`) — sont soulignés en pointillés. Un clic ouvre une petite
bulle à côté du mot : une définition simple, une explication pour quelqu'un qui n'a
jamais programmé, et souvent un exemple. Seule la première apparition de chaque mot
dans une étape est soulignée, pour que le texte reste lisible ; ✕, Échap ou un clic
ailleurs referme la bulle, la leçon reste telle quelle. Les zones de l'écran ont aussi
leur bouton « ? » (Entrées du programme, input, sys.argv, console, pas à pas,
inspecteur, diagramme).

**Personnages, décor et créatures** : un clic sur un personnage — ou sur son nom (dans
le monde, ou dans la leçon : « 👥 Rencontre les habitants ») — rapproche la caméra et
ouvre sa fiche : rôle, description, caractère, ce qu'il dit maintenant (l'histoire tant
que la mission est à faire, des encouragements après un échec, sa fierté après la
réussite ; « Lui parler » passe à la réplique suivante), et son rôle dans la mission.
✕, Échap ou un clic ailleurs : la caméra revient où elle était. Le décor se clique
aussi (coffre et porte qui s'ouvrent, état de la forge ou de la lanterne, panneau de la
mission…), comme les créatures (elles réagissent à l'approche du pointeur) et les boss.
Quelques secrets, clins d'œil à 42, sont cachés dans le monde (succès cachés). De temps en temps, un petit canard en plastique jaune traverse la carte en se dandinant, sur tous les niveaux et toutes les étapes (jamais pendant une cinématique) : un clic dessus, « Couic ! », il disparaît.

**Scènes d'histoire** : chaque niveau (les 43) a sa scène dans le coin droit de la carte,
avec les personnages et le décor de l'histoire (le villageois et sa maison à éclairer, le
garde du pont, la mineuse et sa tour, le gardien du portail…). À l'ouverture du niveau,
la caméra s'approche et les personnages racontent l'histoire dans des bulles ; le bouton
« 🎬 Revoir la scène » de la fiche d'un personnage la fait rejouer. Ce sont eux qui répondent aux `input()` de ton programme et
qui donnent les arguments `sys.argv`. Quand la mission est réussie, ils se réjouissent et
le décor montre le résultat (maison éclairée, pont réparé, tempête dissipée…). Les scènes
sont décrites dans `server/curriculum/scenes.py`, les modèles 3D dans `web/js/scene.js`.

## Panneau admin (atelier)

Pour l'organisateur d'un atelier (par exemple la découverte de Python à 42 Genève) : le
bouton **Admin** de la barre du haut, puis le mot de passe de l'atelier. Le panneau ne
gère **que la sauvegarde de cet ordinateur** (celle donnée à `run.py`) : chaque poste a
la sienne, il n'y a ni compte ni synchronisation.

| Onglet | À quoi il sert |
|---|---|
| 🚩 Démarrage | Choisir où commence le participant : préréglages Débutant (1.1), Acte II (3.1), Acte III (10.1), Acte IV (11.1), ou n'importe quel niveau (Acte → Région → Niveau), puis « Commencer ici ». « Exploration libre » ouvre les 43 niveaux ; « Progression normale » retire tous les déblocages de l'admin. |
| 🛟 Aide au joueur | Débloquer le niveau suivant ou toute la région, recommencer le niveau en cours (en gardant le code ou non), restaurer la dernière sauvegarde. |
| 💾 Sauvegardes | Sauvegarder maintenant (avec une étiquette, un prénom par exemple), la liste des sauvegardes et leur restauration, l'export / import d'une partie pour changer d'ordinateur. |
| 👥 Atelier | **Nouveau participant** en un clic : la partie actuelle est sauvegardée (avec le prénom du participant), la progression repart de zéro (code effacé ou gardé), le point de départ est choisi, le navigateur retrouve le vrai premier lancement (aperçu, accueil, visite guidée), l'admin est déconnecté et la page se recharge. |
| 🕘 Historique | Les 50 dernières actions de l'admin, avec la date et l'heure. |

Chaque action est **prévisualisée** (« 7 niveaux deviennent accessibles… »), puis
confirmée ; le jeu se met à jour aussitôt, sans recharger la page.

Comment ça marche :

- **Aucune fausse progression.** Débloquer un niveau ne le marque jamais comme réussi :
  la sauvegarde reçoit un petit bloc `admin` (`unlocked_through`, `all_unlocked`,
  `start_level`) que la règle de déblocage prend en compte. Pas d'XP, de récompense ni
  de succès gagné sans jouer. Une sauvegarde sans ce bloc se joue exactement comme avant.
- **Sauvegardes** dans le dossier `backups/` à côté de la sauvegarde (les 30 plus
  récentes), créées automatiquement avant toute restauration, import, niveau recommencé
  ou nouveau participant. Une sauvegarde illisible ou d'une autre version n'est plus
  jamais écrasée : elle est mise de côté avec la date (`progress.illisible-….json`) et le
  panneau le signale. L'historique est dans `admin-history.json`.
- **Accès** : le mot de passe est vérifié par le serveur, qui n'en garde qu'une empreinte
  (PBKDF2) — il n'apparaît en clair nulle part dans le dépôt. Session dans un cookie
  `HttpOnly` / `SameSite=Strict`, fermée après 30 min sans action (8 h au maximum) ou au
  redémarrage du serveur ; 5 erreurs de mot de passe bloquent 30 s. Toutes les routes
  `/api/admin/…` refusent les requêtes sans session et celles qui ne viennent pas de la
  page du jeu.
- **Changer le mot de passe** : lancer le jeu avec la variable d'environnement
  `PYCRAFT_ADMIN_PASSWORD`, par exemple `PYCRAFT_ADMIN_PASSWORD=monmotdepasse python3 run.py`
  (sous Windows : `set PYCRAFT_ADMIN_PASSWORD=monmotdepasse` puis `python run.py`).

Limite honnête : le mot de passe protège l'**interface** pendant l'atelier. Un
participant qui ouvre le dossier du jeu a toujours accès au fichier de sauvegarde et au
code source.

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
│   ├── admin.py                panneau admin : session, déblocages, sauvegardes
│   ├── static_checks.py        analyse AST (règles de mission) + revue qualité
│   ├── errors_fr.py            explication des erreurs Python en français
│   ├── achievements.py         statistiques et succès
│   ├── curriculum/scenes.py    personnages, décors et dialogues de chaque niveau
│   └── curriculum/             régions, niveaux, missions, quiz (données)
├── web/                        interface (HTML/CSS/JS sans dépendance)
│   └── js/  main · editor · world · depth · models · scene · fx · trace
│            inspector · diagram · lesson · tour · trailer · cinematic · finale
│            coeur · reactions (code → monde) · characters (fiches) · sound
│            admin · util
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
python3 -m pytest -q tests        # 628 tests (dont le navigateur si Chrome est présent)
node --test tests/js/*.test.mjs  # 34 tests JavaScript (aussi lancés par pytest)
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
- **Éditeur** : pas de repli de code (*folding*). L'éditeur est une zone de texte
  posée sur la coloration syntaxique (ce qui garde la saisie native du navigateur) ;
  replier des lignes demanderait un éditeur réécrit entièrement. Les guides
  d'indentation et la couleur des parenthèses par niveau aident à lire l'imbrication.
- **Ordre de dessin** : deux blocs qui s'interpénètrent n'ont pas d'ordre « vrai ».
  Pour le décor (blocs pleins), ils sont séparés le long de l'axe où ils se
  chevauchent le moins (`web/js/depth.js`) ; pour les personnages, les vêtements
  enveloppent volontairement la tête (casque ouvert, capuche) et gardent l'ordre du
  modèle.
- **Le monde réagit au code** : les règles reconnaissent ce que fait le programme
  (une ligne affichée, un appel, un objet créé, une exception…), pas son intention :
  un programme qui appelle `allumer_lanterne()` allume la lanterne même si la fonction
  est fausse — c'est la vérification de la mission qui juge le résultat.
- **Modèles 3D** : choisis d'après le nom de la classe (zombie, mouton, coffre, tourelle…),
  puis hérités du parent ; une classe inconnue devient un cube coloré.

## Ajouter un niveau

Crée un objet `Level` dans `server/curriculum/rX_*.py` (histoire, explication, démo,
essais, mission, code de départ, vérifications `static(...)` / `dynamic(...)`,
indices, quiz), ajoute sa solution dans `tests/solutions/<id>/main.py`, puis lance
`pytest` : les tests refuseront un niveau impossible ou mal vérifié.
