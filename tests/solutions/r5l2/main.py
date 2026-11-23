class Potion:
    def __init__(self, name: str, duration: int, strength: int) -> None:
        self.name = name
        self.duration = duration
        self.strength = strength

    @classmethod
    def water(cls) -> "Potion":
        return cls("Fiole d'eau", 0, 0)

    @classmethod
    def from_recipe(cls, recipe: str) -> "Potion":
        name, duration, strength = recipe.split(":")
        return cls(name, int(duration), int(strength))

    def describe(self) -> None:
        print(f"{self.name} ({self.duration}s, force {self.strength})")


class SplashPotion(Potion):
    def __init__(self, name: str, duration: int, strength: int,
                 radius: int = 3) -> None:
        super().__init__(name, duration, strength)
        self.radius = radius


SplashPotion.from_recipe("Poison:45:1").describe()
