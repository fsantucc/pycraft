class NetherPortal:
    @staticmethod
    def is_valid_frame(width: int, height: int) -> bool:
        return 4 <= width <= 23 and 5 <= height <= 23

    @staticmethod
    def obsidian_needed(width: int, height: int) -> int:
        return 2 * width + 2 * (height - 2)

    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height

    def light(self) -> None:
        cost = self.obsidian_needed(self.width, self.height)
        if self.is_valid_frame(self.width, self.height):
            print(f"Le portail s'allume ({cost} obsidiennes)")
        else:
            print(f"Cadre invalide ({cost} obsidiennes perdues)")


print(NetherPortal.is_valid_frame(4, 5))
NetherPortal(5, 6).light()
