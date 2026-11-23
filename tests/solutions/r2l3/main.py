class Furnace:
    def smelt(self) -> None:
        if self.fuel <= 0:
            print("Plus de combustible !")
            return
        self.fuel -= 1
        self.ingots = round(self.ingots + self.speed, 1)

    def report(self) -> None:
        print(f"Four : {self.fuel} combustible, {self.ingots} lingots")


basic = Furnace()
basic.fuel, basic.ingots, basic.speed = 6, 0.0, 1.0
blast = Furnace()
blast.fuel, blast.ingots, blast.speed = 6, 0.0, 1.5
for _ in range(8):
    basic.smelt()
    blast.smelt()
basic.report()
blast.report()
print(f"Différence : {round(blast.ingots - basic.ingots, 1)}")
