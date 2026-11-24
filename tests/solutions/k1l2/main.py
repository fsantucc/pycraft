import sys


def main() -> None:
    temps: list[int] = []
    for texte in sys.argv[1:]:
        try:
            temps.append(int(texte))
        except ValueError:
            print(f"Temps ignoré : '{texte}'")
    if not temps:
        print("Aucun temps valide.")
        return
    print(f"Temps : {temps}")
    print(f"Meilleur : {min(temps)} s")
    print(f"Pire : {max(temps)} s")
    print(f"Moyenne : {round(sum(temps) / len(temps), 1)} s")
    print(f"Podium : {sorted(temps)[:3]}")
    print(f"Écart : {max(temps) - min(temps)} s")


if __name__ == "__main__":
    main()
