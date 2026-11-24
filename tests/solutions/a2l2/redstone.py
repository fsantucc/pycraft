def signal_recursif(force: int) -> None:
    if force <= 0:
        print("Signal éteint.")
        return
    print(f"Signal {force}")
    signal_recursif(force - 3)


def signal_iteratif(force: int) -> None:
    while force > 0:
        print(f"Signal {force}")
        force -= 3
    print("Signal éteint.")


def blocs_pyramide(etages: int) -> int:
    if etages <= 0:
        return 0
    return etages * etages + blocs_pyramide(etages - 1)
