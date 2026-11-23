class Vehicle:
    def __init__(self, name: str, speed: int) -> None:
        self.name = name
        self.speed = speed

    def describe(self) -> None:
        print(f"{self.name} : vitesse {self.speed}")


class Boat(Vehicle):
    def __init__(self, name: str, speed: int, seats: int) -> None:
        super().__init__(name, speed)
        self.seats = seats

    def board(self, passengers: int) -> bool:
        return passengers <= self.seats


class Minecart(Vehicle):
    def __init__(self, name: str, speed: int, rail: str) -> None:
        super().__init__(name, speed)
        self.rail = rail

    def can_ride(self, rail: str) -> bool:
        return rail == self.rail


Boat("Galion", 4, 12).describe()
print(Minecart("Wagon", 8, "powered").can_ride("powered"))
