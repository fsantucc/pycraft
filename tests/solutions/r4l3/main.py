class Tool:
    def __init__(self, name: str, durability: int) -> None:
        self.name = name
        self.durability = durability

    def describe(self) -> None:
        print(f"{self.name} : durabilité {self.durability}")

    def use(self) -> None:
        self.durability = max(0, self.durability - 1)


class Weapon(Tool):
    def __init__(self, name: str, durability: int, damage: int) -> None:
        super().__init__(name, durability)
        self.damage = damage

    def describe(self) -> None:
        super().describe()
        print(f"  Dégâts : {self.damage}")

    def use(self) -> None:
        super().use()
        print(f"  {self.damage} dégâts infligés")


class EnchantedWeapon(Weapon):
    def __init__(self, name: str, durability: int, damage: int,
                 enchantment: str) -> None:
        super().__init__(name, durability, damage)
        self.enchantment = enchantment

    def describe(self) -> None:
        super().describe()
        print(f"  Enchantement : {self.enchantment}")


blade = EnchantedWeapon("Lame", 10, 7, "Fire Aspect")
blade.use()
blade.describe()
