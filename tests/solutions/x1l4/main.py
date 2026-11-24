class RedstoneError(Exception):
    def __init__(self, message: str = "Panne de redstone") -> None:
        super().__init__(message)


class CircuitOuvertError(RedstoneError):
    def __init__(self, message: str = "Circuit ouvert") -> None:
        super().__init__(message)


class SurchargeError(RedstoneError):
    def __init__(self, message: str = "Surcharge du circuit",
                 puissance: int = 0) -> None:
        super().__init__(message)
        self.puissance = puissance


def alimenter(puissance: int) -> str:
    if puissance < 0:
        raise RedstoneError()
    if puissance == 0:
        raise CircuitOuvertError()
    if puissance > 15:
        raise SurchargeError(f"Puissance {puissance} trop forte", puissance)
    return f"Lampe allumée ({puissance})"


def diagnostic() -> None:
    for puissance in (8, 0, 20, -1):
        try:
            print(alimenter(puissance))
        except CircuitOuvertError as e:
            print("Circuit :", e)
        except SurchargeError as e:
            print("Surcharge :", e, "- puissance", e.puissance)
        except RedstoneError as e:
            print("Autre panne :", e)
    for puissance in (0, 20, -1):
        try:
            alimenter(puissance)
        except RedstoneError as e:
            print("Famille redstone :", e)


if __name__ == "__main__":
    diagnostic()
