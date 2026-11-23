class Villager:
    def introduce(self) -> None:
        print(f"Je suis {self.name}, {self.job}.")

    def can_afford(self, price: int) -> bool:
        return self.emeralds >= price


ada = Villager()
ada.name, ada.job, ada.emeralds = "Ada", "cartographe", 12
tom = Villager()
tom.name, tom.job, tom.emeralds = "Tom", "fermier", 3
ada.introduce()
tom.introduce()
print(ada.can_afford(10), tom.can_afford(10))
