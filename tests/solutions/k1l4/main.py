import random

TOUS_LES_BIOMES = ["forêt", "plaine", "désert", "jungle", "toundra", "savane",
                   "marais", "océan", "montagne", "taïga", "badlands",
                   "champignon"]


def biomes_visites(carnet: list[str]) -> set[str]:
    return {biome.strip().lower() for biome in carnet}


def rapport(alex: set[str], noor: set[str], kim: set[str]) -> None:
    equipe = alex | noor | kim
    print(f"Découverts par l'équipe : {len(equipe)}")
    print(f"Communs aux trois : {sorted(alex & noor & kim)}")
    print(f"Seulement Alex : {sorted(alex - noor - kim)}")
    print(f"Jamais visités : {sorted(set(TOUS_LES_BIOMES) - equipe)}")


def expedition_aleatoire(nombre: int) -> set[str]:
    return set(random.sample(TOUS_LES_BIOMES, nombre))


def main() -> None:
    alex = biomes_visites(["Forêt ", "plaine", "désert", "PLAINE", "jungle"])
    noor = biomes_visites(["plaine", "océan", " Jungle", "forêt"])
    kim = expedition_aleatoire(4) | {"plaine", "jungle"}
    rapport(alex, noor, kim)


if __name__ == "__main__":
    main()
