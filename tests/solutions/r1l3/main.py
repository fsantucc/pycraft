#!/usr/bin/env python3


def count_blocks(width: int, height: int, depth: int) -> int:
    return width * height * depth


def describe_house(name: str, width: int, height: int, depth: int) -> int:
    total = count_blocks(width, height, depth)
    print(f"{name} : {total} blocs")
    return total


def main() -> None:
    grand_total = 0
    grand_total = grand_total + describe_house("Cabane", 4, 3, 4)
    grand_total = grand_total + describe_house("Tour", 3, 9, 3)
    print(f"Total du village : {grand_total} blocs")


if __name__ == "__main__":
    main()
