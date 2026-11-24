def lire_pile(texte: str) -> int:
    nombre = int(texte)
    if nombre < 1:
        raise ValueError(f"{nombre} : une pile contient au moins 1 objet")
    if nombre > 64:
        raise ValueError(f"{nombre} : une pile ne dépasse pas 64 objets")
    return nombre


def trier() -> None:
    for texte in ("16", "abc", "0", "64", "65", "-5"):
        try:
            print(f"Pile de {lire_pile(texte)} objets")
        except ValueError as erreur:
            print(f"Erreur : {erreur}")
    print("Tri terminé sans plantage.")


if __name__ == "__main__":
    trier()
