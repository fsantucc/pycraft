import construction


def main() -> None:
    total = 2 * construction.wall_blocks(6, 4)
    total += 2 * construction.wall_blocks(5, 4)
    print(f"Maison : {total} blocs")


if __name__ == "__main__":
    main()
