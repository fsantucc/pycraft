"""The sandbox isolates learner code and traces what really happens."""
from __future__ import annotations

from typing import Any

from server import sandbox


def events(result: dict[str, Any]) -> list[dict[str, Any]]:
    out = list(result["pre_events"])
    for step in result["steps"]:
        out.extend(step["events"])
    return out


def test_blocks_files_network_and_system() -> None:
    for code in ("open('x.txt', 'w')", "import os", "import socket",
                 "import subprocess", "input()"):
        result = sandbox.execute({"main.py": code})
        assert not result["ok"], code


def test_infinite_loop_is_stopped() -> None:
    result = sandbox.execute({"main.py": "while True:\n    pass\n"})
    assert result["error"]["type"] in ("StepLimitReached", "Timeout")
    untraced = sandbox.execute({"main.py": "while True:\n    pass\n"},
                               trace=False)
    assert untraced["error"]["type"] == "Timeout"


def test_class_and_instances() -> None:
    code = "class Zombie:\n    pass\n\n\nz = Zombie()\nz.speed = 3\n"
    result = sandbox.execute({"main.py": code})
    evts = events(result)
    kinds = [e["type"] for e in evts]
    assert kinds.index("class_def") < kinds.index("spawn")
    attr = [e for e in evts if e["type"] == "attr_set"][0]
    assert attr["name"] == "speed" and attr["internal"] is False


def test_super_static_class_and_rejection() -> None:
    code = '''
class A:
    def __init__(self, v: int) -> None:
        self._v = v

    def set_v(self, v: int) -> None:
        if v < 0:
            return
        self._v = v

    @staticmethod
    def tool(x: int) -> int:
        return x

    @classmethod
    def make(cls) -> "A":
        return cls(1)


class B(A):
    def __init__(self) -> None:
        super().__init__(5)


b = B()
b.set_v(-1)
A.tool(2)
c = B.make
'''
    result = sandbox.execute({"main.py": code})
    evts = events(result)
    calls = [e for e in evts if e["type"] == "call"]
    assert any(e.get("via_super") for e in calls)
    assert any(e["kind"] == "static" for e in calls)
    returns = [e for e in evts if e["type"] == "return"]
    assert any(e.get("rejected") for e in returns)


def test_nested_class_and_owner() -> None:
    code = "class T:\n    class Log:\n        pass\n"
    result = sandbox.execute({"main.py": code})
    assert result["classes"]["T.Log"]["owner"] == "T"


def test_multi_file_import() -> None:
    files = {"main.py": "import tools\nprint(tools.x)\n",
             "tools.py": "x = 4\nprint(__name__)\n"}
    result = sandbox.execute(files)
    assert result["output"] == "tools\n4\n"


def test_checks_run_after_program() -> None:
    result = sandbox.execute(
        {"main.py": "value = 3\n"}, trace=False,
        checks=[{"id": "a", "code": "assert value == 3"},
                {"id": "b", "code": "fail('non')"}])
    assert [c["ok"] for c in result["checks"]] == [True, False]


def test_input_argv_and_virtual_open() -> None:
    code = ("import sys\nnom = input('Nom ? ')\nprint(nom, sys.argv[1:])\n"
            "try:\n    open('absent.txt')\nexcept FileNotFoundError as e:\n"
            "    print(e)\n")
    result = sandbox.execute({"main.py": code}, stdin=["Alex"],
                             argv=["a", "b c"])
    assert result["output"] == ("Nom ? Alex\nAlex ['a', 'b c']\n"
                                "[Errno 2] No such file or directory: "
                                "'absent.txt'\n")
    kinds = [e["type"] for e in events(result)]
    assert "input" in kinds
    missing = sandbox.execute({"main.py": "input('x')"})
    assert missing["error"]["type"] == "EOFError"
    write = sandbox.execute({"main.py": "open('f.txt', 'w')"})
    assert write["error"]["type"] == "PermissionError"


def test_exception_events() -> None:
    code = ('def f() -> None:\n    raise ValueError("non")\n\n\n'
            'try:\n    f()\nexcept ValueError:\n    pass\n')
    kinds = [e["type"] for e in events(sandbox.execute({"main.py": code}))]
    assert kinds.index("raise") < kinds.index("aborted") \
        < kinds.index("caught")


def test_generator_events() -> None:
    code = "def g():\n    yield 1\n    yield 2\n\n\nfor x in g():\n    pass\n"
    kinds = [e["type"] for e in events(sandbox.execute({"main.py": code}))]
    assert kinds.count("yield") == 2 and "gen_end" in kinds
