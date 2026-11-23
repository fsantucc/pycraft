#!/usr/bin/env python3


class Worker:
    class Journal:
        def __init__(self) -> None:
            self._tasks = 0
            self._rests = 0

        def record_task(self) -> None:
            self._tasks += 1

        def record_rest(self) -> None:
            self._rests += 1

        def get_tasks(self) -> int:
            return self._tasks

        def get_rests(self) -> int:
            return self._rests

        def display(self) -> None:
            print(f"  Tâches {self._tasks}, repos {self._rests}")

    def __init__(self, name: str, energy: int) -> None:
        self._name = name
        self._energy = 50
        self._journal = self.Journal()
        if not self.set_energy(energy):
            print(f"{name} : énergie par défaut (50)")

    @staticmethod
    def is_night(hour: int) -> bool:
        return hour % 24 >= 20 or hour % 24 < 6

    @classmethod
    def apprentice(cls) -> "Worker":
        return cls("Apprenti", 50)

    def get_name(self) -> str:
        return self._name

    def get_energy(self) -> int:
        return self._energy

    def get_journal(self) -> "Worker.Journal":
        return self._journal

    def set_energy(self, energy: int) -> bool:
        if not 0 <= energy <= 100:
            print(f"{self._name} : énergie {energy} refusée")
            return False
        self._energy = energy
        return True

    def work(self) -> bool:
        if self._energy < 10:
            print(f"{self._name} est trop fatigué")
            return False
        self._energy -= 10
        self._journal.record_task()
        return True

    def rest(self) -> None:
        self._energy = min(100, self._energy + 30)
        self._journal.record_rest()

    def describe(self) -> None:
        print(f"{self._name} : énergie {self._energy}")
        self._journal.display()


class Miner(Worker):
    def __init__(self, name: str, energy: int) -> None:
        super().__init__(name, energy)
        self._ores = 0

    def get_ores(self) -> int:
        return self._ores

    def work(self) -> bool:
        done = super().work()
        if done:
            self._ores += 2
        return done


class Builder(Worker):
    def __init__(self, name: str, energy: int) -> None:
        super().__init__(name, energy)
        self._blocks = 0

    def get_blocks(self) -> int:
        return self._blocks

    def work(self) -> bool:
        done = super().work()
        if done:
            self._blocks += 5
        return done


class MasterMiner(Miner):
    class Journal(Worker.Journal):
        def __init__(self) -> None:
            super().__init__()
            self._bonus = 0

        def record_bonus(self) -> None:
            self._bonus += 1

        def get_bonus(self) -> int:
            return self._bonus

    def work(self) -> bool:
        done = super().work()
        if done:
            self._ores += 1
            journal = self.get_journal()
            if isinstance(journal, MasterMiner.Journal):
                journal.record_bonus()
        return done


class Kingdom:
    def __init__(self, name: str) -> None:
        self.name = name
        self._workers: list[Worker] = []

    def hire(self, worker: Worker) -> None:
        self._workers.append(worker)

    def get_workers(self) -> list[Worker]:
        return self._workers

    def run(self, hours: int) -> None:
        for hour in range(hours):
            for worker in self._workers:
                if Worker.is_night(hour):
                    worker.rest()
                else:
                    worker.work()


def kingdom_report(workers: list[Worker]) -> int:
    total = 0
    for worker in workers:
        worker.describe()
        total += worker.get_journal().get_tasks()
    return total


def main() -> None:
    realm = Kingdom("Valombre")
    realm.hire(Miner("Iris", 80))
    realm.hire(Builder("Oskar", 90))
    realm.hire(MasterMiner.apprentice())
    realm.run(24)
    print(f"Total : {kingdom_report(realm.get_workers())} tâches")


if __name__ == "__main__":
    main()
