RECETTES = {
    "torche": {"charbon": 1, "bâton": 1},
    "pioche": {"planche": 3, "bâton": 2},
    "coffre": {"planche": 8},
}


def manquants(recette: dict[str, int],
              inventaire: dict[str, int]) -> dict[str, int]:
    manque: dict[str, int] = {}
    for ingredient, besoin in recette.items():
        stock = inventaire.get(ingredient, 0)
        if stock < besoin:
            manque[ingredient] = besoin - stock
    return manque


def peut_fabriquer(recette: dict[str, int],
                   inventaire: dict[str, int]) -> bool:
    return not manquants(recette, inventaire)


def fabriquer(nom: str, recette: dict[str, int],
              inventaire: dict[str, int]) -> bool:
    manque = manquants(recette, inventaire)
    if manque:
        print(f"Impossible de fabriquer {nom}, il manque : {manque}")
        return False
    for ingredient, besoin in recette.items():
        inventaire[ingredient] -= besoin
        if inventaire[ingredient] == 0:
            del inventaire[ingredient]
    inventaire[nom] = inventaire.get(nom, 0) + 1
    return True


def resume(inventaire: dict[str, int]) -> None:
    total = sum(inventaire.values())
    print(f"Total : {total} objets")
    tries = sorted(inventaire.items(), key=lambda p: p[1], reverse=True)
    for objet, quantite in tries:
        print(f"{objet} : {quantite} ({round(quantite * 100 / total, 1)}%)")


def main() -> None:
    sac = {"planche": 10, "bâton": 3, "charbon": 2}
    for objet in ("pioche", "torche", "coffre", "torche"):
        fabriquer(objet, RECETTES[objet], sac)
    resume(sac)


if __name__ == "__main__":
    main()
