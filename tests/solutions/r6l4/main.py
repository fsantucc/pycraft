class Fighter:
    class Stats:
        def __init__(self) -> None:
            self._given = 0
            self._received = 0
            self._damage_taken = 0

        def record_given(self) -> None:
            self._given += 1

        def record_received(self, amount: int) -> None:
            self._received += 1
            self._damage_taken += amount

        def get_given(self) -> int:
            return self._given

        def get_received(self) -> int:
            return self._received

        def get_damage_taken(self) -> int:
            return self._damage_taken

        def display(self) -> None:
            print(f"Coups donnés {self._given}, reçus {self._received}, "
                  f"dégâts {self._damage_taken}")

    def __init__(self, name: str, health: int, power: int) -> None:
        self._name = name
        if health < 0:
            print(f"{name} : vie négative refusée")
            health = 0
        self._health = health
        self._max_health = health
        self._power = power
        self._stats = self.Stats()

    @staticmethod
    def is_critical(roll: int) -> bool:
        return roll >= 18

    @classmethod
    def training_dummy(cls) -> "Fighter":
        return cls("Mannequin", 50, 0)

    def get_name(self) -> str:
        return self._name

    def get_health(self) -> int:
        return self._health

    def get_stats(self) -> "Fighter.Stats":
        return self._stats

    def is_alive(self) -> bool:
        return self._health > 0

    def take_damage(self, amount: int) -> None:
        self._health = max(0, self._health - amount)
        self._stats.record_received(amount)

    def strike(self, other: "Fighter") -> None:
        if not self.is_alive():
            return
        other.take_damage(self._power)
        self._stats.record_given()


class Dragon(Fighter):
    def strike(self, other: Fighter) -> None:
        super().strike(other)
        if self._health < self._max_health / 2:
            super().strike(other)


def battle_report(fighters: list[Fighter]) -> str:
    alive = [f for f in fighters if f.is_alive()]
    if not alive:
        return "Aucun"
    return max(alive, key=lambda f: f.get_health()).get_name()


ender = Dragon("Ender", 100, 12)
knight = Fighter("Kaya", 80, 9)
for _ in range(3):
    knight.strike(ender)
    ender.strike(knight)
print(battle_report([ender, knight]))
