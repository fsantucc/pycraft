class Pickaxe:
    def __init__(self, material: str, durability: int) -> None:
        self.material = material
        self.durability = durability
        self.blocks_mined = 0

    def mine(self, blocks: int) -> None:
        cost = blocks * (2 if self.material == "gold" else 1)
        if cost > self.durability:
            print("La pioche va casser !")
            return
        self.durability -= cost
        self.blocks_mined += blocks

    def describe(self) -> None:
        print(f"{self.material} : {self.durability} ({self.blocks_mined})")


toolbox = [Pickaxe("wood", 59), Pickaxe("stone", 131), Pickaxe("iron", 250),
           Pickaxe("gold", 32), Pickaxe("diamond", 1561)]
for tool in toolbox:
    tool.mine(10)
    tool.describe()
