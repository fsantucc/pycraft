// Who lives in the world, and what the things around them are: the texts of
// the inspection card (a click on a character, its name, a prop or a
// creature). Each entry is written for the place it appears in, so that
// characters feel like inhabitants and props like real things — never
// random decoration.

// Characters, by skin: their trade, a few words about them, their temper.
export const CHARACTERS = {
  elder: { role: "Doyen du village", about: "Il connaît chaque recette de la Prairie et les transmet aux nouveaux venus.", temper: "Patient : il répète volontiers une explication." },
  chief: { role: "Chef du village", about: "Il organise la vie du village et tient les registres.", temper: "Pragmatique, il aime les comptes justes." },
  villager: { role: "Villageois", about: "Il vit de son jardin et de ses torches, et pose beaucoup de questions.", temper: "Curieux, un peu inquiet quand la nuit tombe." },
  guard: { role: "Garde", about: "Il surveille un passage et décide qui peut passer.", temper: "Strict mais juste : la règle est la règle." },
  miner: { role: "Mineur", about: "Il creuse les galeries et étaye les tunnels.", temper: "Prudent : jamais sous terre sans lanterne." },
  builder: { role: "Bâtisseur", about: "Il construit les portails et les chantiers du royaume.", temper: "Méthodique : chaque chose à sa place, chaque fichier aussi." },
  artisan: { role: "Artisan", about: "Il fabrique des objets en série à partir de plans.", temper: "Perfectionniste, il adore les moules bien faits." },
  smith: { role: "Forgeron", about: "Il fait chauffer la forge et façonne les lingots.", temper: "Bourru au premier abord, généreux ensuite." },
  lord: { role: "Seigneur de la citadelle", about: "Il protège les remparts et leurs secrets.", temper: "Méfiant : rien ne se modifie sans passer par lui." },
  engineer: { role: "Ingénieure", about: "Elle conçoit les machines et les circuits de redstone.", temper: "Calme sous pression ; elle veut comprendre pourquoi ça casse." },
  alchemist: { role: "Alchimiste", about: "Il prépare potions et mélanges selon des recettes précises.", temper: "Excentrique ; il note tout dans ses carnets." },
  architect: { role: "Architecte", about: "Il dessine les tours et les machines imbriquées.", temper: "Visionnaire, il pense toujours à l'étage suivant." },
  general: { role: "Générale", about: "Elle commande les tourelles et les avant-postes.", temper: "Directe ; elle attend des rapports clairs." },
  king: { role: "Roi", about: "Il règne sur le Royaume Automatisé.", temper: "Solennel, mais il rit volontiers." },
  keeper: { role: "Gardienne", about: "Elle veille sur un lieu que peu de gens visitent.", temper: "Discrète : elle parle peu, mais juste." },
  librarian: { role: "Bibliothécaire", about: "Elle range les données de la Grande Bibliothèque.", temper: "Ordonnée : un livre déplacé l'empêche de dormir." },
  cartographer: { role: "Cartographe", about: "Il dessine les cartes et note les coordonnées.", temper: "Rêveur ; il voit des chemins partout." },
  explorer: { role: "Explorateur", about: "Il parcourt les régions et rapporte ce qu'il trouve.", temper: "Intrépide, parfois un peu trop." },
  player: { role: "Aventurier", about: "Un autre voyageur, qui apprend en même temps que toi.", temper: "Enthousiaste, toujours partant." },
  runner: { role: "Messagère", about: "Elle porte les messages d'une région à l'autre.", temper: "Toujours pressée." },
  warden: { role: "Gardien du Cœur", about: "Il veille sur le Cœur du Monde depuis toujours.", temper: "Grave, bienveillant avec ceux qui persévèrent." },
  cook: { role: "Cuisinier", about: "Il nourrit tout le monde au campement.", temper: "Jovial : il parle en recettes." },
};

// Creatures (trailer, reactions of the world, bosses): what they are and
// how they behave.
export const CREATURES = {
  Zombie: { name: "Zombie", about: "Hostile. Il sort quand la lumière baisse et craint le jour.", sound: "groan" },
  Creeper: { name: "Creeper", about: "Hostile et silencieux… jusqu'à l'explosion. À tenir à distance.", sound: "hiss" },
  Spider: { name: "Araignée", about: "Neutre le jour, hostile la nuit. Elle grimpe partout.", sound: "hiss" },
  Enderman: { name: "Enderman", about: "Neutre, tant qu'on ne le regarde pas dans les yeux.", sound: "warp" },
  Golem: { name: "Golem de fer", about: "Protecteur des villages. Lent, mais très solide.", sound: "clank" },
  Wither: { name: "Wither", about: "Un boss à trois têtes. Il ne craint presque rien.", sound: "roar" },
  Dragon: { name: "Dragon de l'End", about: "Le maître de l'End. Ses ailes soulèvent des tempêtes.", sound: "roar" },
  Sheep: { name: "Mouton", about: "Paisible. Il broute, et sa laine sert à tout.", sound: "baa" },
  Cow: { name: "Vache", about: "Paisible. Elle donne du lait… et du cuir.", sound: "moo" },
  Pig: { name: "Cochon", about: "Paisible et gourmand.", sound: "oink" },
  Chicken: { name: "Poule", about: "Paisible. Elle pond des œufs, parfois au mauvais endroit.", sound: "cluck" },
  Horse: { name: "Cheval", about: "Rapide ; il faut l'apprivoiser avant de le monter.", sound: "neigh" },
  Wolf: { name: "Loup", about: "Neutre. Apprivoisé, il devient un compagnon fidèle.", sound: "howl" },
  Cat: { name: "Chat", about: "Il fait fuir les creepers. Personne ne sait pourquoi.", sound: "meow" },
  Bee: { name: "Abeille", about: "Neutre : elle butine, sauf si on touche à sa ruche.", sound: "buzz" },
  Bat: { name: "Chauve-souris", about: "Inoffensive ; elle habite les grottes.", sound: "squeak" },
  Slime: { name: "Slime", about: "Hostile, mais lent. Il se divise quand on le frappe.", sound: "squish" },
};

export function creatureOf(model) {
  return CREATURES[model] || { name: model, about: "Une créature de cette région.", sound: "hit" };
}

// The props: name, what they show now, and what a click does. ctx:
// { label, on, open, level, region, scene } — on / open: the state shown in
// the world (lit, open…), which the program and the mission also change.
const lit = (ctx, on, off) => (ctx.on ? on : off);

export const PROP_INFO = {
  house: { name: "Maison", icon: "🏠", act: "open",
    info: (c) => `${lit(c, "Les fenêtres sont éclairées : il y a de la vie dedans.", "Les fenêtres sont sombres.")} ${c.open ? "La porte est ouverte." : "La porte est fermée."}`,
    button: (c) => (c.open ? "Fermer la porte" : "Ouvrir la porte") },
  lantern: { name: "Lanterne", icon: "🏮",
    info: (c) => lit(c, "Elle brille : sa lumière tient les monstres à distance.", "Elle est éteinte. Ce n'est pas un clic qui l'allume : c'est ton programme, quand il appelle la fonction qui l'allume.") },
  torch: { name: "Torche", icon: "🔥",
    info: (c) => lit(c, "Elle est allumée et réchauffe les environs.", "Éteinte, pour l'instant. Le programme ou la mission la rallumera.") },
  campfire: { name: "Feu de camp", icon: "🔥", info: (c) => lit(c, "Le feu crépite. Tout le monde se rassemble autour.", "Des cendres froides.") },
  well: { name: "Puits", icon: "💧", info: () => "L'eau est fraîche et profonde. On entend son écho tout au fond." },
  bridge: { name: "Pont", icon: "🌉", info: (c) => lit(c, "Le pont est réparé : toutes les planches sont en place.", "Il manque des planches : traverser serait risqué.") },
  fence: { name: "Clôture", icon: "🪵", info: () => "Elle délimite le pré." },
  board: { name: "Panneau", icon: "🪧", info: (c) => `On y lit : « ${c.level.mission_title} ».` },
  chest: { name: "Coffre", icon: "📦", act: "open",
    info: (c) => (c.open ? `Ouvert. À l'intérieur : ${c.contents}.` : "Fermé. Que peut-il bien contenir ?"),
    button: (c) => (c.open ? "Refermer" : "Ouvrir") },
  barrel: { name: "Tonneau", icon: "🛢", info: () => "Il sonne creux : il a déjà servi." },
  crates: { name: "Caisses", icon: "📦", info: (c) => `Des caisses ${c.label ? `(${c.label})` : "de marchandises"}, prêtes à partir.` },
  anvil: { name: "Enclume", icon: "⚒", info: () => "Lourde et froide. Chaque coup de marteau y résonne." },
  furnace: { name: "Four", icon: "🔥", info: (c) => lit(c, "Le four est allumé : il cuit le minerai.", "Le four est éteint : pas de combustible, ou personne pour l'allumer.") },
  forge: { name: "Forge", icon: "⚒", info: () => "La forge rougeoie. Le métal y devient malléable." },
  workbench: { name: "Établi", icon: "🛠", info: () => "Un établi : on y assemble les objets à partir de leurs plans." },
  bookshelf: { name: "Bibliothèque", icon: "📚", info: (c) => `Un livre dépasse : « ${c.book} ».` },
  lectern: { name: "Pupitre", icon: "📖", info: () => "Un grand livre ouvert. Les pages se tournent toutes seules quand personne ne regarde." },
  cauldron: { name: "Chaudron", icon: "⚗", info: () => "Un liquide violet bouillonne. Mieux vaut ne pas goûter." },
  potions: { name: "Fioles", icon: "🧪", info: () => "Des fioles étiquetées… plus ou moins lisiblement." },
  redstone: { name: "Circuit de redstone", icon: "🔴", info: (c) => lit(c, "Le signal passe : la poudre rougeoie.", "Pas de signal : le circuit attend une impulsion.") },
  levers: { name: "Leviers", icon: "🎚", info: (c) => lit(c, "Les leviers sont en position de marche.", "Les leviers attendent qu'on répare la machine.") },
  portal: { name: "Portail", icon: "🌀", info: (c) => lit(c, "Le portail est actif : l'air vibre au centre.", "Le cadre est éteint.") },
  gate: { name: "Porte", icon: "🚪", act: "open", info: (c) => (c.open ? "Grande ouverte." : "Fermée."), button: (c) => (c.open ? "Fermer" : "Ouvrir") },
  blocktower: { name: "Tour de blocs", icon: "🧱", info: (c) => `${c.count} étage(s) pour l'instant.` },
  rocks: { name: "Rochers", icon: "🪨", info: () => "De gros rochers moussus." },
  cave: { name: "Entrée de grotte", icon: "🕳", info: () => "Il fait noir là-dedans. Un courant d'air frais en sort." },
  crystal: { name: "Cristal", icon: "💎", info: () => "Il vibre doucement quand on s'approche." },
  beacon: { name: "Balise", icon: "🔆", info: (c) => lit(c, "La balise projette son rayon vers le ciel.", "La balise attend sa configuration.") },
  turret: { name: "Tourelle", icon: "🗼", info: () => "Une tourelle de défense, prête à tirer." },
  dummy: { name: "Mannequin d'entraînement", icon: "🎯", info: () => "Il a déjà encaissé beaucoup de coups." },
  banner: { name: "Bannière", icon: "🚩", info: () => "Les couleurs de la région flottent au vent." },
  throne: { name: "Trône", icon: "👑", info: () => "Le trône du royaume. Il est très confortable, paraît-il." },
  chatboard: { name: "Tableau du chat", icon: "💬", info: () => "Les messages du serveur défilent." },
  podium: { name: "Podium", icon: "🏆", info: () => "Trois marches pour les trois meilleurs." },
  maptable: { name: "Table des cartes", icon: "🗺", info: () => "Des cartes couvertes de coordonnées et de flèches." },
  fountain: { name: "Fontaine", icon: "⛲", info: () => "L'eau jaillit sans fin." },
  spawner: { name: "Générateur", icon: "🌀", info: () => "Une cage où naissent des créatures… une vague après l'autre." },
  storm: { name: "Tempête", icon: "⛈", info: (c) => lit(c, "Le ciel s'est éclairci.", "La tempête gronde : les données arrivent en désordre.") },
  sensor: { name: "Capteur", icon: "📡", info: (c) => lit(c, "Le capteur fonctionne.", "Le capteur grésille : certaines mesures sont illisibles.") },
  stacks: { name: "Piles", icon: "📚", info: () => "Des piles d'objets bien rangées, 64 au maximum." },
  toolrack: { name: "Râtelier", icon: "🛠", info: () => "Les outils y sont rangés par taille." },
  hay: { name: "Bottes de foin", icon: "🌾", info: () => "Ça sent l'été." },
  flowers: { name: "Fleurs", icon: "🌸", info: () => "Des fleurs des champs. Les abeilles les adorent." },
  tree: { name: "Arbre", icon: "🌳", info: () => "Un vieil arbre. Ses feuilles bruissent au vent." },
  minecart: { name: "Wagonnet", icon: "🛒", info: () => "Il attend sur ses rails." },
  tent: { name: "Tente", icon: "⛺", info: () => "Le campement des explorateurs." },
  clock: { name: "Horloge", icon: "🕰", info: (c) => `Elle indique ${c.time}.` },
  altar: { name: "Autel du Cœur", icon: "✨", info: () => "Un éclat du Cœur du Monde y résonne." },
  heart: { name: "Cœur", icon: "❤", info: () => "Il bat." },
};

export function propInfo(type) {
  return PROP_INFO[type] || { name: type, icon: "•", info: () => "" };
}

// What the chests hold: something of the region… and, in one of them, a
// note left by a former student.
const CHEST_ITEMS = [
  "trois pommes, une boussole et une carte pliée",
  "des lingots de fer bien rangés",
  "un parchemin de recettes, un peu froissé",
  "une note : « git commit -m \"final final v2\" ». Quelqu'un a hésité avant de rendre son projet",
  "des bougies, des allumettes et une liste de courses",
  "une pioche ébréchée et un sac de charbon",
];

export function chestContents(levelId, index) {
  let h = index * 7;
  for (const ch of String(levelId)) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return CHEST_ITEMS[h % CHEST_ITEMS.length];
}

// The books of the shelves, one per click.
export const BOOKS = [
  "Les fonctions, expliquées à mon grand-père",
  "La Norme, édition illustrée",
  "Le Guide du voyageur galactique, chapitre 42",
  "Mille et une façons de nommer une variable",
  "Apprendre à plusieurs : petit traité de peer-learning",
  "Le Zen de Python (import this)",
];

// The secrets of the world (a nod to 42): what the thing says when the
// player finds it.
export const EGGS = {
  piscine: "On l'appelle « la piscine » : ceux qui y plongent un mois entier en ressortent développeurs.",
  clock: "Elle s'est arrêtée à 4 h 42. Personne n'a jamais voulu la remettre à l'heure.",
  guide: "Une page est cornée : « La réponse à la grande question sur la vie, l'univers et le reste ? 42. »",
  peer: "Tu sais ce qu'on dit à 42 ? Quand tu bloques, demande à ton voisin… puis explique-lui à ton tour. C'est comme ça qu'on apprend vraiment.",
  marvin: "Ce mannequin s'appelle Marvin. Il encaisse tout sans un mot… et il a l'air terriblement déprimé.",
  segfault: "Gravé dans la pierre : « Segmentation fault (core dumped) ». Quelqu'un a creusé un peu trop loin.",
  answer: "42 ! La réponse à la grande question sur la vie, l'univers et le reste.",
  moulinette: "On raconte que la Moulinette est née dans ce chaudron : elle goûte chaque recette et n'accepte aucune approximation.",
};
