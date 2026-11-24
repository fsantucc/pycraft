def garde_du_pont() -> None:
    niveau = int(input("Niveau d'expérience : "))
    autorise = True
    if niveau > 30:
        print("Passe, héros !")
    elif niveau >= 10:
        print("Passe, aventurier.")
    else:
        print("Reviens quand tu seras plus fort.")
        autorise = False
    torche = input("As-tu une torche ? (oui/non) : ")
    if torche == "non" and autorise:
        print("Prends une torche, le pont est sombre.")
