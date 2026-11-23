class Golem:
    def __init__(self, name: str, health: int) -> None:
        self._name = name
        self._health = health

    def get_name(self) -> str:
        return self._name

    def get_health(self) -> int:
        return self._health

    def take_hit(self, damage: int) -> None:
        self._health = max(0, self._health - damage)

    def repair(self, amount: int) -> None:
        self._health += amount


atlas = Golem("Atlas", 100)
atlas.take_hit(30)
atlas.repair(10)
print(atlas.get_name(), atlas.get_health())
