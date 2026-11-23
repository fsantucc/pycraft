class Cauldron:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.level = 0

    @staticmethod
    def minutes_to_ticks(minutes: int) -> int:
        return minutes * 1200

    @classmethod
    def starter_kit(cls) -> "Cauldron":
        kit = cls(3)
        kit.fill(3)
        return kit

    def fill(self, amount: int) -> int:
        room = self.capacity - self.level
        poured = min(room, amount)
        self.level += poured
        return amount - poured

    def is_full(self) -> bool:
        return self.level == self.capacity


class CopperCauldron(Cauldron):
    pass


print(type(CopperCauldron.starter_kit()).__name__)
