class TraverseeError(Exception):
    pass


def traverser(joueur: str) -> None:
    if not joueur.isalnum():
        raise TraverseeError(f"Voyageur refusé : '{joueur}'")
    print(f"{joueur} traverse le portail")


def expedition(groupe: list[str]) -> None:
    print("Ouverture du portail")
    try:
        for joueur in groupe:
            traverser(joueur)
    except TraverseeError as e:
        print(f"Alerte : {e}")
        print("Expédition interrompue")
        return
    finally:
        print("Fermeture du portail")


if __name__ == "__main__":
    expedition(["Alex", "Steve", "Noor"])
    expedition(["Alex", "??", "Noor"])
    print("Le portail est bien refermé.")
