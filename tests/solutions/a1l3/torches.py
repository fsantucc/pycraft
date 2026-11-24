def commande_torches() -> None:
    murs = int(input("Nombre de murs : "))
    par_mur = int(input("Torches par mur : "))
    torches = murs * par_mur
    charbon = (torches + 3) // 4
    print("Torches à fabriquer :", torches)
    print("Charbon nécessaire :", charbon)
    print("Torches en trop :", charbon * 4 - torches)
