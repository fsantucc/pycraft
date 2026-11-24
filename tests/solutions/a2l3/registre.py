def formater_pseudo(pseudo: str) -> str:
    return pseudo.strip().lower().replace(" ", "_")[:16]


def afficher_badge(pseudo: str, niveau: int, classe: str) -> None:
    if classe not in ("guerrier", "mage", "archer"):
        print("Classe inconnue")
        return
    nom = formater_pseudo(pseudo)
    print(f"[{classe.capitalize()}] {nom} - niveau {niveau}")
