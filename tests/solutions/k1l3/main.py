import math


def lire_position(question: str) -> tuple[float, float, float]:
    while True:
        morceaux = input(question).split(",")
        if len(morceaux) != 3:
            print("Format attendu : x,y,z")
            continue
        try:
            x, y, z = (float(m) for m in morceaux)
            return (x, y, z)
        except ValueError as e:
            print(f"Valeur invalide : {e}")


def vers_nether(pos: tuple[float, float, float]
                ) -> tuple[float, float, float]:
    x, y, z = pos
    return (round(x / 8, 2), y, round(z / 8, 2))


def distance(a: tuple[float, float, float],
             b: tuple[float, float, float]) -> float:
    dx, dy, dz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    return round(math.sqrt(dx ** 2 + dy ** 2 + dz ** 2), 2)


def main() -> None:
    portail = lire_position("Portail (Overworld) : ")
    print(f"Position : {portail}")
    x, y, z = portail
    print(f"x = {x}, y = {y}, z = {z}")
    print(f"Dans le Nether : {vers_nether(portail)}")
    joueur = lire_position("Joueur : ")
    print(f"Distance au portail : {distance(portail, joueur)}")


if __name__ == "__main__":
    main()
