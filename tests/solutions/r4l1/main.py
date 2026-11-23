class Mob:
    def __init__(self, name: str, health: int) -> None:
        self.name = name
        self.health = health

    def describe(self) -> None:
        print(f"{self.name} : {self.health} PV")

    def take_damage(self, amount: int) -> None:
        self.health = max(0, self.health - amount)


class Cow(Mob):
    def give_milk(self) -> None:
        print(f"{self.name} donne du lait")


class Spider(Mob):
    def climb(self, height: int) -> None:
        print(f"{self.name} grimpe de {height} blocs")


bessie = Cow("Bessie", 10)
shelob = Spider("Shelob", 16)
bessie.describe()
bessie.give_milk()
shelob.take_damage(4)
shelob.climb(5)
