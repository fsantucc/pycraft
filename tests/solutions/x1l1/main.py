def lire_profondeur(mesure: str) -> int:
    return int(mesure)


def tester_sonde() -> None:
    for mesure in ("12", "douze", "40", "4x"):
        try:
            profondeur = lire_profondeur(mesure)
            print(f"Mesure '{mesure}' : profondeur {profondeur} blocs")
        except ValueError as erreur:
            print(f"Mesure '{mesure}' rejetée : {erreur}")
    print("La sonde fonctionne toujours.")


if __name__ == "__main__":
    tester_sonde()
