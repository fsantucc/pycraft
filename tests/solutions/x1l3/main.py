def actionner(levier: int) -> str:
    if levier == 0:
        int("ender")
    elif levier == 1:
        print(10 / 0)
    elif levier == 2:
        open("coffre_secret.txt")
    elif levier == 3:
        print("bloc" + 3)
    elif levier == 4:
        print({"or": 3}["diamant"])
    elif levier == 5:
        print([1, 2, 3][10])
    return "Mécanisme OK"


def inspecter() -> None:
    for levier in range(7):
        try:
            print(f"Levier {levier} : {actionner(levier)}")
        except ValueError as e:
            print(f"Levier {levier} : ValueError - {e}")
        except ZeroDivisionError as e:
            print(f"Levier {levier} : ZeroDivisionError - {e}")
        except FileNotFoundError as e:
            print(f"Levier {levier} : FileNotFoundError - {e}")
        except TypeError as e:
            print(f"Levier {levier} : TypeError - {e}")
        except (KeyError, IndexError) as e:
            print(f"Levier {levier} : {e.__class__.__name__} - {e}")


if __name__ == "__main__":
    inspecter()
