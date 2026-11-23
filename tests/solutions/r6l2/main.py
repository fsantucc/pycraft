class Turret:
    class Logbook:
        def __init__(self) -> None:
            self._shots = 0
            self._reloads = 0
            self._misfires = 0

        def record_shot(self) -> None:
            self._shots += 1

        def record_reload(self) -> None:
            self._reloads += 1

        def record_misfire(self) -> None:
            self._misfires += 1

        def get_shots(self) -> int:
            return self._shots

        def get_reloads(self) -> int:
            return self._reloads

        def get_misfires(self) -> int:
            return self._misfires

        def display(self) -> None:
            print(f"Tirs {self._shots}, recharges {self._reloads}, "
                  f"enrayements {self._misfires}")

    def __init__(self, name: str, ammo: int) -> None:
        self._name = name
        self._ammo = ammo
        self._log = self.Logbook()

    def get_name(self) -> str:
        return self._name

    def shoot(self) -> None:
        if self._ammo > 0:
            self._ammo -= 1
            self._log.record_shot()
        else:
            self._log.record_misfire()

    def reload(self, amount: int) -> None:
        self._ammo += amount
        self._log.record_reload()

    def get_log(self) -> "Turret.Logbook":
        return self._log


class FrostTurret(Turret):
    class Logbook(Turret.Logbook):
        def __init__(self) -> None:
            super().__init__()
            self._freezes = 0

        def record_freeze(self) -> None:
            self._freezes += 1

        def get_freezes(self) -> int:
            return self._freezes

        def display(self) -> None:
            super().display()
            print(f"  Gels : {self._freezes}")

    def freeze(self) -> None:
        log = self.get_log()
        if isinstance(log, FrostTurret.Logbook):
            log.record_freeze()


frost = FrostTurret("Givre", 1)
frost.freeze()
frost.shoot()
frost.get_log().display()
