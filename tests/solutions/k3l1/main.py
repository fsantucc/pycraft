#!/usr/bin/env python3
import sys
from typing import Generator


class MondeError(Exception):
    def __init__(self, message: str = "Erreur du monde") -> None:
        super().__init__(message)


class ChunkIntrouvableError(MondeError):
    def __init__(self, message: str = "Chunk introuvable") -> None:
        super().__init__(message)


class ChunkInvalideError(MondeError):
    def __init__(self, message: str = "Chunk invalide") -> None:
        super().__init__(message)


class Chunk:
    def __init__(self, x: int, z: int, biome: str) -> None:
        self._x = x
        self._z = z
        self._biome = biome

    @staticmethod
    def cle(x: int, z: int) -> str:
        return f"{x},{z}"

    @classmethod
    def depuis_texte(cls, texte: str) -> "Chunk":
        morceaux = texte.split(",")
        if len(morceaux) != 3:
            raise ChunkInvalideError(f"Chunk invalide : '{texte}'")
        try:
            x, z = int(morceaux[0]), int(morceaux[1])
        except ValueError:
            raise ChunkInvalideError(f"Chunk invalide : '{texte}'")
        return cls(x, z, morceaux[2])

    def get_biome(self) -> str:
        return self._biome

    def coords(self) -> tuple[int, int]:
        return (self._x, self._z)


class Monde:
    def __init__(self, nom: str) -> None:
        self.nom = nom
        self._chunks: dict[str, Chunk] = {}

    def ajouter(self, chunk: Chunk) -> None:
        cle = Chunk.cle(*chunk.coords())
        if cle in self._chunks:
            raise MondeError(f"Chunk déjà présent : {cle}")
        self._chunks[cle] = chunk

    def chunk(self, x: int, z: int) -> Chunk:
        cle = Chunk.cle(x, z)
        if cle not in self._chunks:
            raise ChunkIntrouvableError(f"Aucun chunk en {cle}")
        return self._chunks[cle]

    def taille(self) -> int:
        return len(self._chunks)

    def biomes(self) -> set[str]:
        return {c.get_biome() for c in self._chunks.values()}

    def par_biome(self) -> dict[str, int]:
        liste = [c.get_biome() for c in self._chunks.values()]
        return {b: liste.count(b) for b in set(liste)}

    def parcourir(self, biome: str | None = None
                  ) -> Generator[Chunk, None, None]:
        for chunk in sorted(self._chunks.values(), key=Chunk.coords):
            if biome is None or chunk.get_biome() == biome:
                yield chunk


def main() -> None:
    monde = Monde("Cœur")
    for texte in sys.argv[1:]:
        try:
            monde.ajouter(Chunk.depuis_texte(texte))
        except MondeError as e:
            print(f"Ignoré : {e}")
    print(f"Chunks chargés : {monde.taille()}")
    print(f"Biomes : {sorted(monde.biomes())}")
    for biome, nombre in sorted(monde.par_biome().items()):
        print(f"  {biome} : {nombre}")
    for chunk in monde.parcourir("forêt"):
        print(f"Forêt en {chunk.coords()}")


if __name__ == "__main__":
    main()
