// The little dictionary of PyCraft: the words of programming (and of the
// game's screen) that a complete beginner may not know. In the lessons, the
// first time such a word appears in a step it becomes clickable; a click
// opens a small bubble next to it — a simple definition, a few words more,
// an example — without leaving the lesson.
//
// Rule for these texts: everyday words only. A definition never relies on
// another technical word without saying what it is.
//
// Each entry: words (as written in the lessons, singular — the plural is
// found too), code (exact contents of a piece of code `...` that this entry
// explains), title, def (one sentence), more (optional), example (optional).

export const GLOSSARY = [
  // ---------------------------------------------------------- the screen
  { id: "entrees", words: ["entrées du programme"], title: "Entrées du programme",
    def: "Les réponses que tu donnes au programme quand il te pose une question.",
    more: "Dans PyCraft, tu les écris à l'avance, sous l'éditeur, dans la case « Entrées du programme » (une réponse par ligne). Quand le programme demande quelque chose, il prend la réponse suivante.",
    example: "Le programme demande « Quel âge as-tu ? » → il lit 12 dans la case." },
  { id: "inspecteur", words: ["inspecteur"], title: "Inspecteur",
    def: "Un onglet (à droite) qui montre ce que le programme a en mémoire, à l'étape où tu es.",
    more: "Tu y vois chaque nom utilisé par le programme et ce qu'il contient, et comment ça change pendant que le programme avance." },
  { id: "console", words: ["console"], code: [], title: "Console",
    def: "La zone sous l'éditeur où s'affiche tout ce que le programme écrit.",
    more: "Chaque print() ajoute une ligne dans la console. Les messages d'erreur s'y affichent aussi." },
  { id: "crieur", words: ["crieur"], title: "Le crieur",
    def: "Le personnage du monde qui annonce à voix haute ce que le programme affiche.",
    more: "Chaque fois que le programme écrit quelque chose (avec print), le crieur le crie dans une bulle." },
  { id: "editeur", words: ["éditeur"], title: "Éditeur",
    def: "La zone de gauche où tu écris ton code, comme un traitement de texte pour programmes." },
  { id: "pasapas", words: ["pas à pas"], title: "Pas à pas",
    def: "Faire avancer le programme une instruction à la fois, pour voir exactement ce que fait chaque ligne.",
    more: "Sous le monde, ▶| avance d'un pas et ◀ revient en arrière." },
  { id: "journal", words: ["journal des événements", "journal"], title: "Journal des événements",
    def: "La liste, sous le monde, de tout ce qui s'est passé pendant le programme, dans l'ordre.",
    more: "Chaque ligne raconte une action : une valeur rangée, une fonction lancée, un texte affiché…" },
  { id: "diagramme", words: ["diagramme"], title: "Diagramme",
    def: "Un onglet (à droite) qui dessine les classes de ton programme et les liens entre elles, comme un plan de famille." },
  { id: "pile", words: ["pile d'appels"], title: "Pile d'appels",
    def: "La liste des fonctions en train de travailler en même temps, chacune attendant celle qu'elle a lancée.",
    more: "Dans le monde, c'est la tour de blocs : chaque fonction lancée ajoute un étage, chaque fonction terminée en retire un." },
  { id: "executer", words: ["exécuter", "exécute", "exécution"], title: "Exécuter",
    def: "Lancer le programme : l'ordinateur lit tes lignes une par une et fait ce qu'elles disent.",
    more: "Le bouton ▶ Exécuter (ou Ctrl+Entrée) lance ton code." },
  { id: "ligne", words: ["ligne de commande"], title: "Ligne de commande",
    def: "Une façon de lancer un programme en tapant son nom et des mots en plus, dans une fenêtre de texte.",
    more: "Dans PyCraft, ces mots en plus s'écrivent dans la case « Arguments de la ligne de commande ».",
    example: "python3 jeu.py /tp 10 → le programme reçoit « /tp » et « 10 »." },
  { id: "argv", words: [], code: ["sys.argv", "argv"], title: "sys.argv",
    def: "La liste des mots tapés après le nom du programme quand on le lance.",
    more: "Le premier élément est toujours le nom du programme lui-même, les suivants sont les mots en plus.",
    example: "python3 jeu.py bonjour → sys.argv vaut ['jeu.py', 'bonjour']" },

  // -------------------------------------------------------------- values
  { id: "variable", words: ["variable"], title: "Variable",
    def: "Un nom qu'on donne à une valeur pour la garder et la réutiliser plus tard.",
    more: "C'est comme une étiquette collée sur une boîte : on range quelque chose dedans, et on le retrouve grâce au nom.",
    example: "age = 12 → la boîte « age » contient 12." },
  { id: "valeur", words: ["valeur"], title: "Valeur",
    def: "Une donnée : un nombre, un texte, vrai ou faux…",
    example: "12, \"Steve\", True sont des valeurs." },
  { id: "type", words: ["type"], code: ["type()", "type"], title: "Type",
    def: "La sorte d'une valeur : un texte, un nombre entier, un nombre à virgule, vrai ou faux…",
    more: "Le type décide de ce qu'on peut faire avec la valeur : on peut additionner deux nombres, mais pas un nombre et un texte.",
    example: "12 est un entier, \"12\" est un texte." },
  { id: "chaine", words: ["chaîne de caractères", "chaîne"], code: ["str", "str()"], title: "Chaîne de caractères (str)",
    def: "Un texte : un mot, un prénom, une phrase… écrit entre guillemets.",
    more: "Même \"12\" entre guillemets est un texte, pas un nombre : on ne peut pas faire de calcul avec.",
    example: "\"Steve\", \"bonjour\", \"12\"" },
  { id: "entier", words: ["entier", "nombre entier"], code: ["int", "int()"], title: "Entier (int)",
    def: "Un nombre sans virgule, comme 12, 0 ou -3.",
    more: "int() transforme un texte qui ressemble à un nombre en vrai nombre, pour pouvoir calculer avec.",
    example: "int(\"12\") donne 12 → on peut faire 12 + 1." },
  { id: "flottant", words: ["nombre à virgule", "flottant"], code: ["float", "float()"], title: "Nombre à virgule (float)",
    def: "Un nombre qui peut avoir des chiffres après la virgule.",
    more: "En Python, on écrit un point à la place de la virgule.",
    example: "1.5, 3.14, 0.25" },
  { id: "booleen", words: ["booléen"], code: ["bool", "True", "False"], title: "Booléen (True / False)",
    def: "Une valeur qui ne peut être que vraie (True) ou fausse (False).",
    more: "C'est la réponse à une question par oui ou non.",
    example: "12 > 10 vaut True ; 3 > 10 vaut False." },
  { id: "none", words: [], code: ["None"], title: "None",
    def: "Une valeur spéciale qui veut dire « rien » ou « pas de réponse ».",
    more: "Une fonction qui ne renvoie rien renvoie en fait None." },
  { id: "conversion", words: ["conversion", "convertir"], title: "Conversion",
    def: "Transformer une valeur d'une sorte en une autre.",
    example: "int(\"12\") change le texte \"12\" en nombre 12 ; str(12) fait l'inverse." },
  { id: "operateur", words: ["opérateur"], title: "Opérateur",
    def: "Un symbole qui fait un calcul ou une comparaison.",
    example: "+ additionne, * multiplie, == vérifie si deux choses sont égales." },
  { id: "comparaison", words: ["comparaison"], title: "Comparaison",
    def: "Une question posée sur deux valeurs, dont la réponse est vrai ou faux.",
    example: "age >= 18 (plus grand ou égal), nom == \"Steve\" (égal), x != 0 (différent)." },

  // -------------------------------------------------------- collections
  { id: "liste", words: ["liste"], code: ["list", "list()", "[]"], title: "Liste",
    def: "Une suite de valeurs rangées dans un ordre, entre crochets.",
    more: "Chaque valeur a une place numérotée, en commençant à 0.",
    example: "[\"pomme\", \"pain\", \"lait\"] → la place 0 contient \"pomme\"." },
  { id: "index", words: ["index", "indice"], title: "Index (position)",
    def: "Le numéro de la place d'un élément dans une liste ou un texte. On commence à compter à 0.",
    example: "Dans [\"a\", \"b\", \"c\"], \"b\" est à l'index 1." },
  { id: "tranche", words: ["tranche"], title: "Tranche",
    def: "Un morceau d'une liste ou d'un texte, pris d'une position à une autre.",
    example: "\"bonjour\"[0:3] donne \"bon\"." },
  { id: "tuple", words: ["tuple"], code: ["tuple", "tuple()"], title: "Tuple",
    def: "Comme une liste, mais qu'on ne peut plus changer une fois créée. Elle s'écrit entre parenthèses.",
    example: "(10, 64, -3) : une position x, y, z." },
  { id: "dico", words: ["dictionnaire"], code: ["dict", "dict()", "{}"], title: "Dictionnaire",
    def: "Une collection où chaque valeur est rangée sous un nom (une clé), comme un vrai dictionnaire : le mot, puis sa définition.",
    example: "{\"Steve\": 120, \"Alex\": 90} → les points de chaque joueur." },
  { id: "cle", words: ["clé"], title: "Clé",
    def: "Le nom sous lequel une valeur est rangée dans un dictionnaire.",
    example: "Dans {\"Steve\": 120}, la clé est \"Steve\" et la valeur 120." },
  { id: "ensemble", words: [], code: ["set", "set()"], title: "Ensemble (set)",
    def: "Une collection sans ordre et sans doublons : chaque valeur n'y est qu'une fois.",
    example: "set([\"a\", \"b\", \"a\"]) donne {\"a\", \"b\"}." },
  { id: "comprehension", words: ["compréhension"], title: "Compréhension",
    def: "Une façon courte de fabriquer une liste (ou un dictionnaire) en une seule ligne.",
    example: "[x * 2 for x in [1, 2, 3]] donne [2, 4, 6]." },
  { id: "immuable", words: ["immuable", "mutable", "modifiable"], title: "Modifiable / immuable",
    def: "Une valeur modifiable (une liste) peut changer après sa création ; une valeur immuable (un texte, un tuple) ne le peut pas : on en crée une nouvelle." },

  // ----------------------------------------------- instructions and flow
  { id: "instruction", words: ["instruction"], title: "Instruction",
    def: "Un ordre donné à l'ordinateur, en général une ligne de code.",
    example: "print(\"Bonjour\") est une instruction : « affiche Bonjour »." },
  { id: "print", words: ["affichage"], code: ["print", "print()"], title: "print()",
    def: "Écrit quelque chose à l'écran, dans la console.",
    example: "print(\"Bonjour\") affiche Bonjour." },
  { id: "input", words: [], code: ["input", "input()"], title: "input()",
    def: "Pose une question et attend la réponse tapée par l'utilisateur.",
    more: "La réponse arrive toujours sous forme de texte, même si on tape un nombre.",
    example: "nom = input(\"Ton nom ? \") → nom contient ce qui a été tapé." },
  { id: "condition", words: ["condition"], code: ["if", "elif", "else"], title: "Condition (if / elif / else)",
    def: "Une question qui décide quelles lignes le programme va faire.",
    more: "if : « si c'est vrai, fais ça » ; elif : « sinon, si… » ; else : « sinon, fais ça ».",
    example: "if age >= 18: print(\"Majeur\") else: print(\"Mineur\")" },
  { id: "boucle", words: ["boucle"], code: ["for", "while"], title: "Boucle (for / while)",
    def: "Une façon de répéter des lignes plusieurs fois sans les réécrire.",
    more: "for répète pour chaque élément d'une liste (ou un nombre de fois) ; while répète tant qu'une question reste vraie.",
    example: "for i in range(3): print(\"Hop\") affiche Hop 3 fois." },
  { id: "range", words: [], code: ["range", "range()"], title: "range()",
    def: "Donne une suite de nombres, souvent pour répéter quelque chose un certain nombre de fois.",
    example: "range(4) donne 0, 1, 2, 3 (4 nombres, en commençant à 0)." },
  { id: "len", words: [], code: ["len", "len()"], title: "len()",
    def: "Donne la longueur : le nombre d'éléments d'une liste, ou de lettres d'un texte.",
    example: "len(\"Steve\") vaut 5." },
  { id: "indentation", words: ["indentation", "indenté"], title: "Indentation",
    def: "Les espaces au début d'une ligne. En Python, ils indiquent quelles lignes font partie d'un même bloc.",
    more: "Les lignes décalées sous un if, une boucle ou une fonction lui appartiennent (on décale de 4 espaces)." },
  { id: "compteur", words: ["compteur", "accumulateur"], title: "Compteur / accumulateur",
    def: "Une variable qu'on augmente petit à petit, par exemple dans une boucle, pour compter ou faire un total.",
    example: "total = 0 puis, à chaque tour, total = total + prix." },
  { id: "algorithme", words: ["algorithme"], title: "Algorithme",
    def: "Une recette : une suite d'étapes précises pour résoudre un problème." },

  // ---------------------------------------------------------- functions
  { id: "fonction", words: ["fonction"], code: ["def"], title: "Fonction",
    def: "Une recette qu'on écrit une fois, à laquelle on donne un nom, et qu'on peut ensuite lancer autant de fois qu'on veut.",
    more: "On la définit avec def (on écrit la recette), puis on l'appelle avec son nom suivi de parenthèses (on suit la recette).",
    example: "def saluer(): print(\"Salut\") … puis saluer()" },
  { id: "appel", words: ["appel", "appeler", "appelle"], title: "Appel (appeler une fonction)",
    def: "Lancer une fonction : écrire son nom suivi de parenthèses.",
    more: "Définir une fonction ne la lance pas ; c'est l'appel qui la fait travailler.",
    example: "allumer_lanterne() appelle la fonction allumer_lanterne." },
  { id: "parametre", words: ["paramètre"], title: "Paramètre",
    def: "Un nom, entre les parenthèses d'une fonction, qui recevra une information quand on l'appellera.",
    example: "def saluer(nom): … → nom est un paramètre." },
  { id: "argument", words: ["argument"], title: "Argument",
    def: "L'information qu'on donne à une fonction quand on l'appelle, entre les parenthèses.",
    example: "saluer(\"Alex\") → \"Alex\" est l'argument." },
  { id: "retour", words: ["valeur de retour", "renvoie", "renvoyer"], code: ["return"], title: "Renvoyer (return)",
    def: "Ce qu'une fonction donne en résultat, à la fin, à celui qui l'a appelée.",
    more: "return arrête la fonction et rend la valeur. Afficher (print) et renvoyer (return), ce n'est pas pareil : afficher montre, renvoyer donne.",
    example: "def double(x): return x * 2 → double(5) vaut 10." },
  { id: "recursion", words: ["récursion", "récursive", "récursif"], title: "Récursion",
    def: "Une fonction qui s'appelle elle-même, sur un problème un peu plus petit à chaque fois.",
    more: "Il faut un cas de base : une situation où elle s'arrête, sinon elle ne finirait jamais.",
    example: "Compter de 3 à 0 : je dis 3, puis je demande de compter à partir de 2…" },
  { id: "casbase", words: ["cas de base"], title: "Cas de base",
    def: "La situation où une fonction récursive s'arrête au lieu de s'appeler encore.",
    example: "« Si on est arrivé à 0, on s'arrête. »" },
  { id: "annotation", words: ["annotation", "type hint"], code: ["-> None"], title: "Annotation de type",
    def: "Une petite note dans le code qui dit quelle sorte de valeur on attend ou on renvoie. Elle aide à relire, Python ne la vérifie pas.",
    example: "def double(x: int) -> int: … → x est un entier, le résultat aussi. -> None : la fonction ne renvoie rien." },
  { id: "module", words: ["module", "bibliothèque"], code: ["import"], title: "Module (import)",
    def: "Un fichier de code qu'on peut réutiliser dans un autre fichier.",
    more: "import va chercher ce fichier pour utiliser ce qu'il contient.",
    example: "import math puis math.sqrt(9) vaut 3." },
  { id: "name", words: [], code: ["__name__", "__main__", "if __name__ == \"__main__\":"], title: "__name__ et \"__main__\"",
    def: "Une variable automatique qui dit comment le fichier est utilisé.",
    more: "Elle vaut \"__main__\" si c'est ce fichier qu'on lance directement, et le nom du fichier s'il est importé par un autre." },
  { id: "commentaire", words: ["commentaire"], title: "Commentaire",
    def: "Une note pour les humains, ignorée par l'ordinateur. Elle commence par #.",
    example: "# On calcule le total ici" },

  // --------------------------------------------------------------- objects
  { id: "classe", words: ["classe"], code: ["class"], title: "Classe",
    def: "Un plan de fabrication : il décrit ce qu'auront et ce que sauront faire tous les objets fabriqués avec lui.",
    more: "Dans le monde, une classe apparaît comme un plan bleu ; les objets sont les créatures construites d'après ce plan.",
    example: "La classe Sheep décrit un mouton ; chaque mouton créé est un objet." },
  { id: "objet", words: ["objet", "instance"], title: "Objet (instance)",
    def: "Une chose fabriquée à partir d'une classe, avec ses propres informations.",
    example: "Sheep(\"blanc\") fabrique un mouton blanc ; on peut en fabriquer plusieurs, chacun différent." },
  { id: "attribut", words: ["attribut"], title: "Attribut",
    def: "Une information rangée dans un objet.",
    example: "mouton.couleur vaut \"blanc\" → couleur est un attribut du mouton." },
  { id: "methode", words: ["méthode"], title: "Méthode",
    def: "Une fonction qui appartient à une classe : ce qu'un objet sait faire.",
    example: "mouton.brouter() → brouter est une méthode du mouton." },
  { id: "constructeur", words: ["constructeur"], code: ["__init__", "__init__()"], title: "Constructeur (__init__)",
    def: "La méthode lancée automatiquement quand on fabrique un objet. Elle range ses premières informations.",
    example: "def __init__(self, couleur): self.couleur = couleur" },
  { id: "self", words: [], code: ["self"], title: "self",
    def: "Dans une méthode, self désigne l'objet lui-même : « moi ».",
    example: "self.couleur = « ma couleur à moi »." },
  { id: "heritage", words: ["héritage", "hérite", "hériter", "classe parente", "classe mère", "classe enfant", "classe fille"], title: "Héritage",
    def: "Une classe peut en reprendre une autre et y ajouter ou changer des choses, au lieu de tout réécrire.",
    example: "class Chien(Animal): … → un Chien sait déjà tout ce que sait un Animal." },
  { id: "super", words: [], code: ["super()", "super"], title: "super()",
    def: "Permet à une classe d'utiliser ce qui est écrit dans la classe qu'elle reprend (sa classe parente).",
    example: "super().__init__(nom) : « fais d'abord comme mon parent »." },
  { id: "polymorphisme", words: ["polymorphisme"], title: "Polymorphisme",
    def: "Des objets différents qui répondent chacun à leur façon à la même demande.",
    example: "chien.parler() aboie, chat.parler() miaule : même nom, effet différent." },
  { id: "encapsulation", words: ["encapsulation", "protégé", "privé"], title: "Encapsulation (attribut protégé)",
    def: "Protéger les informations d'un objet pour qu'on ne les change pas n'importe comment depuis l'extérieur.",
    more: "Un nom qui commence par _ veut dire « à ne pas toucher de l'extérieur » ; on passe plutôt par une méthode qui vérifie.",
    example: "self._vie : on la change avec soigner() plutôt que directement." },
  { id: "abstraite", words: ["classe abstraite"], code: ["ABC", "abstractmethod", "@abstractmethod"], title: "Classe abstraite",
    def: "Un plan incomplet, fait pour être repris : on ne peut pas fabriquer d'objet directement avec lui." },
  { id: "staticmethod", words: ["méthode statique"], code: ["@staticmethod", "staticmethod", "@classmethod", "classmethod"], title: "Méthode statique / de classe",
    def: "Une méthode rangée dans une classe mais qui n'a pas besoin d'un objet précis pour travailler." },
  { id: "decorateur", words: ["décorateur"], code: ["@property", "property"], title: "Décorateur (@…)",
    def: "Un mot qui commence par @, placé au-dessus d'une fonction, pour lui ajouter un comportement." },
  { id: "isinstance", words: [], code: ["isinstance", "isinstance()"], title: "isinstance()",
    def: "Vérifie si une valeur est d'une certaine sorte (d'une certaine classe).",
    example: "isinstance(12, int) vaut True." },

  // ---------------------------------------------------------------- errors
  { id: "erreur", words: ["erreur", "bug"], title: "Erreur (bug)",
    def: "Un problème dans le programme : il s'arrête, ou il ne fait pas ce qu'on voulait.",
    more: "Le message d'erreur dit quel type de problème et à quelle ligne : c'est un indice, pas une punition." },
  { id: "exception", words: ["exception"], title: "Exception",
    def: "Le signal qu'envoie Python quand quelque chose tourne mal pendant le programme.",
    more: "Si personne ne s'en occupe, le programme s'arrête. Avec try / except, on peut la rattraper et continuer.",
    example: "int(\"abc\") lance une exception ValueError." },
  { id: "try", words: [], code: ["try", "except", "try / except", "try/except"], title: "try / except",
    def: "« Essaie ceci ; si ça tourne mal, fais plutôt cela. »",
    example: "try: age = int(texte) except ValueError: print(\"Ce n'est pas un nombre\")" },
  { id: "finally", words: [], code: ["finally"], title: "finally",
    def: "Un bloc qui s'exécute toujours à la fin, qu'il y ait eu une erreur ou non.",
    example: "Pour refermer un portail ou un fichier quoi qu'il arrive." },
  { id: "raise", words: ["lever une exception", "lancer une exception"], code: ["raise"], title: "raise",
    def: "Déclencher soi-même une erreur, quand on voit que quelque chose ne va pas.",
    example: "if age < 0: raise ValueError(\"âge impossible\")" },
  { id: "valueerror", words: [], code: ["ValueError"], title: "ValueError",
    def: "Erreur quand une valeur a la bonne sorte mais un contenu impossible.",
    example: "int(\"abc\") : c'est bien un texte, mais il ne ressemble pas à un nombre." },
  { id: "typeerror", words: [], code: ["TypeError"], title: "TypeError",
    def: "Erreur quand on mélange des sortes de valeurs qui ne vont pas ensemble.",
    example: "\"12\" + 1 : on ne peut pas additionner un texte et un nombre." },
  { id: "zerodiv", words: [], code: ["ZeroDivisionError"], title: "ZeroDivisionError",
    def: "Erreur quand on divise par zéro (impossible, même pour un ordinateur)." },
  { id: "keyerror", words: [], code: ["KeyError"], title: "KeyError",
    def: "Erreur quand on cherche dans un dictionnaire un nom (une clé) qui n'y est pas." },
  { id: "indexerror", words: [], code: ["IndexError"], title: "IndexError",
    def: "Erreur quand on demande une place qui n'existe pas dans une liste.",
    example: "Demander la place 5 d'une liste de 3 éléments." },
  { id: "filenotfound", words: [], code: ["FileNotFoundError"], title: "FileNotFoundError",
    def: "Erreur quand le programme cherche un fichier qui n'existe pas." },

  // ----------------------------------------------------- generators & co
  { id: "generateur", words: ["générateur"], code: ["yield"], title: "Générateur (yield)",
    def: "Une fonction qui donne ses résultats un par un, au moment où on les demande, au lieu de tout préparer d'avance.",
    more: "yield donne une valeur puis met la fonction en pause ; elle reprend là où elle s'était arrêtée à la demande suivante." },
  { id: "next", words: [], code: ["next", "next()"], title: "next()",
    def: "Demande la valeur suivante à un générateur." },
  { id: "fichier", words: [], code: ["open", "open()", "with"], title: "Ouvrir un fichier (open / with)",
    def: "open() ouvre un fichier pour le lire ou y écrire ; with le referme tout seul à la fin." },
  { id: "sort", words: ["trier", "tri"], code: ["sorted", "sorted()", "sort", "sort()"], title: "Trier (sorted / sort)",
    def: "Ranger les éléments dans l'ordre (du plus petit au plus grand, ou par ordre alphabétique).",
    example: "sorted([3, 1, 2]) donne [1, 2, 3]." },
  { id: "mypy", words: [], code: ["mypy", "flake8"], title: "mypy / flake8",
    def: "Des outils qui relisent ton code sans le lancer, pour repérer des oublis et des erreurs de style." },
];

// ------------------------------------------------------------- matching
const LETTER = "[\\p{L}\\p{N}_]";
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const BY_ID = new Map(GLOSSARY.map((g) => [g.id, g]));
const BY_CODE = new Map();
for (const g of GLOSSARY) for (const c of g.code || []) BY_CODE.set(c, g);

// One expression for all the words, longest first (« chaîne de
// caractères » before « chaîne »), with the plural.
const WORDS = GLOSSARY.flatMap((g) => g.words.map((w) => [w, g])).sort((a, b) => b[0].length - a[0].length);
const WORD_OF = new Map(WORDS.map(([w, g]) => [w.toLowerCase(), g]));
const PATTERN = new RegExp(`(?<!${LETTER})(${WORDS.map(([w]) => esc(w)).join("|")})(?:s|x)?(?!${LETTER})`, "giu");

export function termOf(id) {
  return BY_ID.get(id) || null;
}

// The entry for a piece of text (a word of the lesson, or a piece of code).
export function lookup(text, isCode = false) {
  const t = text.trim();
  if (isCode) return BY_CODE.get(t) || BY_CODE.get(t.replace(/\(\)$/, "")) || null;
  const low = t.toLowerCase();
  return WORD_OF.get(low) || WORD_OF.get(low.replace(/(s|x)$/, "")) || null;
}

// Where words are not turned into links: real code blocks, buttons, links,
// fields, existing links of the glossary.
const SKIP = "pre, button, a, textarea, input, select, .term, .no-terms, summary, .ed-line";

function termButton(entry, node) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "term";
  b.dataset.term = entry.id;
  b.setAttribute("aria-haspopup", "dialog");
  b.title = `${entry.title} — clique pour une explication`;
  b.append(node);
  return b;
}

// Makes the difficult words of a part of the page clickable: the first time
// each one appears (not every time — the text stays readable). Words that
// are already links in this part are not linked again.
export function linkTerms(root) {
  if (!root) return 0;
  const done = new Set([...root.querySelectorAll(".term")].map((b) => b.dataset.term));
  let made = 0;
  // Pieces of code that are exactly a word of the glossary: `int`, `input()`…
  for (const code of root.querySelectorAll("code")) {
    if (code.closest(SKIP)) continue;
    const entry = lookup(code.textContent, true);
    if (!entry || done.has(entry.id)) continue;
    done.add(entry.id);
    const holder = code.parentNode;
    const next = code.nextSibling;
    holder.insertBefore(termButton(entry, code), next);
    made += 1;
  }
  // Words of the text.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest(`${SKIP}, code`))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const node of texts) {
    let rest = node;
    for (;;) {
      PATTERN.lastIndex = 0;
      let m;
      let entry = null;
      while ((m = PATTERN.exec(rest.nodeValue))) {
        const e = lookup(m[1]);
        if (e && !done.has(e.id)) {
          entry = e;
          break;
        }
      }
      if (!entry) break;
      done.add(entry.id);
      const word = rest.splitText(m.index);
      const after = word.splitText(m[0].length);
      word.parentNode.replaceChild(termButton(entry, document.createTextNode(word.nodeValue)), word);
      made += 1;
      rest = after;
    }
  }
  return made;
}

// --------------------------------------------------------------- bubble
// One small bubble at a time, next to the word; ✕, Escape or a click
// elsewhere closes it. The lesson stays as it was underneath.
let bubble = null;
let opener = null;

export function closeTerm() {
  if (!bubble) return;
  bubble.remove();
  bubble = null;
  if (opener) opener.setAttribute("aria-expanded", "false");
  opener = null;
}

export function openTerm(button) {
  const entry = termOf(button.dataset.term);
  if (!entry) return;
  const same = opener === button;
  closeTerm();
  if (same) return;
  opener = button;
  button.setAttribute("aria-expanded", "true");
  bubble = document.createElement("div");
  bubble.className = "term-pop";
  bubble.setAttribute("role", "dialog");
  bubble.setAttribute("aria-label", entry.title);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "term-close";
  close.textContent = "✕";
  close.title = "Fermer (Échap)";
  close.addEventListener("click", closeTerm);
  const title = document.createElement("b");
  title.className = "term-title";
  title.textContent = entry.title;
  const def = document.createElement("p");
  def.className = "term-def";
  def.textContent = entry.def;
  bubble.append(close, title, def);
  if (entry.more) {
    const more = document.createElement("p");
    more.textContent = entry.more;
    bubble.append(more);
  }
  if (entry.example) {
    const ex = document.createElement("p");
    ex.className = "term-ex";
    ex.textContent = entry.example;
    bubble.append(ex);
  }
  document.body.append(bubble);
  // Next to the word, inside the window.
  const r = button.getBoundingClientRect();
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;
  let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  close.focus({ preventScroll: true });
}

// Once for the whole page: clicks on words, closing the bubble.
export function setupGlossary() {
  document.addEventListener("click", (e) => {
    const term = e.target.closest && e.target.closest(".term, .term-help");
    if (term) {
      e.preventDefault();
      e.stopPropagation();
      openTerm(term);
      return;
    }
    if (bubble && !bubble.contains(e.target)) closeTerm();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bubble) {
      e.stopPropagation();
      const back = opener;
      closeTerm();
      if (back) back.focus({ preventScroll: true });
    }
  }, true);
  window.addEventListener("resize", closeTerm);
}

// Keeps a part of the page linked: whatever is written in it later (a new
// step, a feedback, a quiz answer) gets its words linked too.
export function watchTerms(root) {
  if (!root) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      observer.disconnect();
      linkTerms(root);
      observer.observe(root, { childList: true, subtree: true });
    });
  });
  linkTerms(root);
  observer.observe(root, { childList: true, subtree: true });
}
