def construire_tour() -> None:
    hauteur = int(input("Hauteur de la tour : "))
    total = 0
    for etage in range(1, hauteur + 1):
        blocs = 4 * etage
        print(f"Étage {etage} : {blocs} blocs")
        total += blocs
    print(f"Total : {total} blocs")


def etages_possibles() -> None:
    restants = int(input("Blocs disponibles : "))
    etages = 0
    while restants >= 4 * (etages + 1):
        etages += 1
        restants -= 4 * etages
    print(f"Étages construits : {etages}")
    print(f"Blocs restants : {restants}")
