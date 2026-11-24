import sys


def main() -> None:
    if len(sys.argv) < 2:
        print("Aucune commande. Usage : python3 main.py /commande "
              "arguments...")
        return
    commande = sys.argv[1]
    arguments = sys.argv[2:]
    print(f"Commande : {commande[1:]}")
    print(f"Arguments : {len(arguments)}")
    for numero, valeur in enumerate(arguments, 1):
        print(f"  [{numero}] {valeur}")
    if commande == "/say":
        print("<Steve> " + " ".join(arguments))
    elif commande == "/tp":
        if len(arguments) == 3:
            print("Téléportation vers " + " ".join(arguments))
        else:
            print("Usage : /tp x y z")
    else:
        print("Commande inconnue")


if __name__ == "__main__":
    main()
