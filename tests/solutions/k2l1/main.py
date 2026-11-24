from typing import Generator, Iterator

MOBS = ["zombie", "squelette", "araignée", "creeper"]


def vagues() -> Generator[tuple[int, str, int], None, None]:
    numero = 1
    while True:
        yield (numero, MOBS[(numero - 1) % len(MOBS)], numero * 2)
        numero += 1


def prochaines(gen: Iterator[tuple[int, str, int]],
               n: int) -> list[tuple[int, str, int]]:
    return [next(gen) for _ in range(n)]


def file_attente(joueurs: list[str]) -> Generator[str, None, None]:
    while joueurs:
        yield joueurs.pop(0)


def main() -> None:
    for numero, mob, nombre in prochaines(vagues(), 6):
        print(f"Vague {numero} : {nombre} {mob}")
    file = ["Alex", "Steve", "Noor"]
    for joueur in file_attente(file):
        print(f"Au tour de {joueur} (reste {len(file)})")


if __name__ == "__main__":
    main()
