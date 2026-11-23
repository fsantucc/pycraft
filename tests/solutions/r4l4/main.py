class Building:
    def __init__(self, name: str, level: int) -> None:
        self.name = name
        self.level = level

    def upgrade(self) -> None:
        self.level += 1

    def describe(self) -> None:
        print(f"{self.name} : niveau {self.level}")


class Mine(Building):
    def __init__(self, name: str, level: int) -> None:
        super().__init__(name, level)
        self.ore = 0

    def work(self, hours: int) -> None:
        self.ore += self.level * hours

    def describe(self) -> None:
        super().describe()
        print(f"  Minerai : {self.ore}")


class DeepMine(Mine):
    def __init__(self, name: str, level: int, depth: int) -> None:
        super().__init__(name, level)
        self.depth = depth

    def work(self, hours: int) -> None:
        super().work(hours)
        self.ore += (self.depth // 10) * hours

    def upgrade(self) -> None:
        super().upgrade()
        self.depth += 5


abyss = DeepMine("Abysse", 1, 20)
for day in range(7):
    abyss.work(8)
    if day % 2 == 1:
        abyss.upgrade()
abyss.describe()
