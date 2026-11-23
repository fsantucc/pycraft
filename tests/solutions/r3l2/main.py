class Beacon:
    def __init__(self, name: str, power: int, radius: int) -> None:
        self._name = name
        self._power = 0
        self._radius = 1
        self.set_power(power)
        self.set_radius(radius)

    def get_name(self) -> str:
        return self._name

    def get_power(self) -> int:
        return self._power

    def get_radius(self) -> int:
        return self._radius

    def set_power(self, power: int) -> bool:
        if not 0 <= power <= 4:
            print(f"{self._name} : puissance {power} refusée")
            return False
        self._power = power
        return True

    def set_radius(self, radius: int) -> bool:
        if not 1 <= radius <= 50:
            print(f"{self._name} : rayon {radius} refusé")
            return False
        self._radius = radius
        return True


north = Beacon("Nord", 3, 20)
north.set_power(9)
print(north.get_power())
