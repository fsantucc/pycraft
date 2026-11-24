MOBS = ["zombie:20:oui", "Cochon:10:non", "enderman:40:oui", "Vache:10:non",
        "wither:300:oui", "golem:100:non", "Creeper:20:oui"]


def noms(mobs: list[str]) -> list[str]:
    return [m.split(":")[0].capitalize() for m in mobs]


def hostiles(mobs: list[str]) -> list[str]:
    return [m.split(":")[0].capitalize() for m in mobs
            if m.split(":")[2] == "oui"]


def points_de_vie(mobs: list[str]) -> dict[str, int]:
    return {m.split(":")[0].capitalize(): int(m.split(":")[1]) for m in mobs}


def costauds(pv: dict[str, int]) -> dict[str, int]:
    moyenne = sum(pv.values()) / len(pv) if pv else 0
    return {nom: v for nom, v in pv.items() if v > moyenne}


def initiales(mobs: list[str]) -> set[str]:
    return {m[0].upper() for m in mobs}


def main() -> None:
    print(noms(MOBS))
    print(hostiles(MOBS))
    pv = points_de_vie(MOBS)
    print(pv)
    print(costauds(pv))
    print(sorted(initiales(MOBS)))


if __name__ == "__main__":
    main()
