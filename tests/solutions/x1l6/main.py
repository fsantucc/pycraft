class MesureError(Exception):
    def __init__(self, message: str = "Mesure invalide") -> None:
        super().__init__(message)


class FormatError(MesureError):
    def __init__(self, message: str = "Format invalide") -> None:
        super().__init__(message)


class HorsLimiteError(MesureError):
    def __init__(self, message: str = "Valeur hors limites") -> None:
        super().__init__(message)


def analyser(rapport: str) -> int:
    morceaux = rapport.split("=")
    if len(morceaux) != 2 or not morceaux[0]:
        raise FormatError(f"Rapport mal formé : '{rapport}'")
    texte = morceaux[1]
    try:
        valeur = int(texte)
    except ValueError:
        raise FormatError(f"Valeur illisible : '{texte}'")
    if not -50 <= valeur <= 50:
        raise HorsLimiteError(f"{valeur} hors de [-50, 50]")
    return valeur


def traiter(rapports: list[str]) -> int:
    valides = 0
    try:
        for rapport in rapports:
            try:
                analyser(rapport)
                valides += 1
            except MesureError as e:
                print(f"Rejet : {e}")
    finally:
        print(f"Bilan : {valides} valides sur {len(rapports)}")
    return valides


if __name__ == "__main__":
    traiter(["temp=12", "vent=99", "pluie", "x=abc", "h=-3"])
