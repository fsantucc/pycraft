"""Data model of the curriculum (regions, levels, checks, questions)."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Check:
    """One verification of a mission.

    kind = "static"  → AST rule from ``static_checks.run_rule``
    kind = "dynamic" → Python snippet executed *in the sandbox* after the
                        learner's program (helpers: need_class, capture…)
    """

    id: str
    label: str
    kind: str
    rule: str = ""
    args: dict[str, Any] = field(default_factory=dict)
    code: str = ""
    locate: str = ""
    hint: str = ""


@dataclass
class Question:
    """kind = "predict" (type the output), "choice" (QCM) or "explain"."""

    kind: str
    prompt: str
    code: str = ""
    options: list[str] = field(default_factory=list)
    answer: int = -1
    explanation: str = ""
    stdin: list[str] = field(default_factory=list)


@dataclass
class Level:
    id: str
    region: str
    number: str
    title: str
    notions: list[str]
    story: str
    explanation: str
    demo: dict[str, str]
    demo_notes: list[str]
    experiments: list[str]
    mission_title: str
    mission: str
    starter: dict[str, str]
    checks: list[Check]
    hints: list[str]
    quiz: list[Question]
    xp: int = 100
    boss: bool = False
    bonus: str = ""
    going_further: str = ""
    starter_from: str = ""
    stdin: list[str] = field(default_factory=list)
    argv: list[str] = field(default_factory=list)
    readonly: list[str] = field(default_factory=list)
    demo_stdin: list[str] = field(default_factory=list)
    demo_argv: list[str] = field(default_factory=list)

    def public(self) -> dict[str, Any]:
        """What the browser may see: no check code, no answers."""
        data = asdict(self)
        data["checks"] = [{"id": c.id, "label": c.label}
                          for c in self.checks]
        data["hints_count"] = len(self.hints)
        del data["hints"]
        data["quiz"] = [
            {"kind": q.kind, "prompt": q.prompt, "code": q.code,
             "options": q.options, "stdin": q.stdin}
            for q in self.quiz
        ]
        return data


@dataclass
class Region:
    id: str
    name: str
    subtitle: str
    theme: str
    reward: str
    levels: list[Level]
    act: int = 2
    icon: str = "★"

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id, "name": self.name, "subtitle": self.subtitle,
            "theme": self.theme, "reward": self.reward, "act": self.act,
            "icon": self.icon,
            "levels": [lvl.public() for lvl in self.levels],
        }


def static(cid: str, label: str, rule: str, hint: str = "",
           **args: Any) -> Check:
    return Check(id=cid, label=label, kind="static", rule=rule, args=args,
                 hint=hint)


def dynamic(cid: str, label: str, code: str, locate: str = "",
            hint: str = "") -> Check:
    return Check(id=cid, label=label, kind="dynamic", code=code.strip(),
                 locate=locate, hint=hint)


def predict(prompt: str, code: str, explanation: str,
            stdin: list[str] | None = None) -> Question:
    return Question(kind="predict", prompt=prompt, code=code.strip("\n"),
                    explanation=explanation, stdin=stdin or [])


def choice(prompt: str, options: list[str], answer: int,
           explanation: str, code: str = "") -> Question:
    return Question(kind="choice", prompt=prompt, options=options,
                    answer=answer, explanation=explanation,
                    code=code.strip("\n"))


def explain(prompt: str, explanation: str) -> Question:
    return Question(kind="explain", prompt=prompt, explanation=explanation)
