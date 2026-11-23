class Inventory:
    def __init__(self, owner: str, capacity: int) -> None:
        self.owner = owner
        self.capacity = capacity
        self.items: dict[str, int] = {}

    def count(self, item: str) -> int:
        return self.items.get(item, 0)

    def total(self) -> int:
        return sum(self.items.values())

    def add(self, item: str, qty: int) -> bool:
        if self.total() + qty > self.capacity:
            print(f"{self.owner} : plus de place pour {qty} {item}")
            return False
        self.items[item] = self.count(item) + qty
        return True

    def remove(self, item: str, qty: int) -> bool:
        if self.count(item) < qty:
            print(f"{self.owner} : pas assez de {item}")
            return False
        self.items[item] -= qty
        if self.items[item] == 0:
            del self.items[item]
        return True

    def give(self, other: "Inventory", item: str, qty: int) -> bool:
        if self.count(item) < qty or other.total() + qty > other.capacity:
            print("Transfert impossible")
            return False
        self.remove(item, qty)
        other.add(item, qty)
        return True

    def show(self) -> None:
        print(f"{self.owner} : {self.items}")


steve = Inventory("Steve", 20)
ender = Inventory("Enderman", 1)
steve.add("grass", 5)
steve.give(ender, "grass", 1)
steve.show()
ender.show()
