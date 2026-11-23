class VaultChest:
    def __init__(self, owner: str, emeralds: int, code: int) -> None:
        self._owner = owner
        self._code = code
        self._locked = True
        if emeralds < 0:
            print(f"{owner} : contenu négatif refusé")
            emeralds = 0
        self._emeralds = emeralds

    def is_locked(self) -> bool:
        return self._locked

    def get_owner(self) -> str:
        return self._owner

    def get_emeralds(self) -> int:
        return self._emeralds

    def unlock(self, code: int) -> bool:
        if code != self._code:
            print("Mauvais code")
            return False
        self._locked = False
        return True

    def lock(self) -> None:
        self._locked = True

    def deposit(self, amount: int) -> bool:
        if self._locked or amount <= 0:
            print("Dépôt refusé")
            return False
        self._emeralds += amount
        return True

    def withdraw(self, amount: int) -> bool:
        if self._locked or amount <= 0 or amount > self._emeralds:
            print("Retrait refusé")
            return False
        self._emeralds -= amount
        return True


vault = VaultChest("Mira", 10, 42)
vault.unlock(42)
vault.withdraw(3)
print(vault.get_emeralds())
