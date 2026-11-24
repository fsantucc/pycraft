"""Checks of the browser side (JavaScript, HTML, display).

* syntax of every module (``node --check``);
* a small lint: imports that exist, no unused import, no forgotten
  ``console.log`` / ``debugger``, every element id used by the code exists
  in index.html;
* unit tests of the pure helpers (``node --test tests/js``);
* a smoke test in a real browser (Playwright + Chrome/Chromium), skipped
  when they are not installed: the page loads without JavaScript error, a
  program runs, the world is drawn and the ground does not flicker.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path
from typing import Any, Iterator

import pytest

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "web" / "js"
JS_FILES = sorted(JS.glob("*.js"))
NODE = shutil.which("node")
needs_node = pytest.mark.skipif(NODE is None, reason="node non installé")


# ---------------------------------------------------------------- syntax
@needs_node
@pytest.mark.parametrize("path", JS_FILES, ids=lambda p: p.name)
def test_js_syntax(path: Path) -> None:
    assert NODE is not None
    result = subprocess.run([NODE, "--check", str(path)],
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr


# ------------------------------------------------------------------ lint
IMPORT_RE = re.compile(r'import\s*\{([^}]*)\}\s*from\s*"\./([\w.]+)"')
EXPORT_RE = re.compile(
    r"export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)")


def _exports(path: Path) -> set[str]:
    return set(EXPORT_RE.findall(path.read_text(encoding="utf-8")))


@pytest.mark.parametrize("path", JS_FILES, ids=lambda p: p.name)
def test_js_imports_exist_and_are_used(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    body = IMPORT_RE.sub("", source)
    for names, module in IMPORT_RE.findall(source):
        target = JS / module
        assert target.exists(), f"{path.name} importe {module} (absent)"
        exported = _exports(target)
        for name in (n.strip() for n in names.split(",")):
            if not name:
                continue
            assert name in exported, f"{module} n'exporte pas {name}"
            assert re.search(rf"\b{re.escape(name)}\b", body), \
                f"{path.name} : import inutilisé « {name} »"


@pytest.mark.parametrize("path", JS_FILES, ids=lambda p: p.name)
def test_js_no_debug_leftovers(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    assert "debugger" not in source
    assert not re.search(r"console\.log\(", source), \
        f"{path.name} contient un console.log oublié"


def test_every_element_id_used_by_the_code_exists() -> None:
    html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
    ids = set(re.findall(r'id="([\w-]+)"', html))
    used: set[str] = set()
    for path in JS_FILES:
        source = path.read_text(encoding="utf-8")
        used |= set(re.findall(r'\$\("([\w-]+)"\)', source))
        used |= set(re.findall(r'getElementById\("([\w-]+)"\)', source))
    created = {"overlay-body", "sound-panel"}  # ids created dynamically
    missing = sorted(used - ids - created)
    assert not missing, f"ids absents de index.html : {missing}"


def test_tour_targets_exist() -> None:
    html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
    source = (JS / "tour.js").read_text(encoding="utf-8")
    for target in re.findall(r'target: "([^"]+)"', source):
        first = target.split()[0]
        if first.startswith("#"):
            assert f'id="{first[1:]}"' in html, target


def test_notifications_never_block_clicks() -> None:
    """Regression: a notification used to cover « Bilan de maîtrise »."""
    css = (ROOT / "web" / "css" / "style.css").read_text(encoding="utf-8")
    for selector in ("#toasts", ".toast"):
        rule = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", css)
        assert rule and "pointer-events: none" in rule.group(1), selector


def test_lesson_actions_live_in_the_sticky_bar() -> None:
    source = (JS / "lesson.js").read_text(encoding="utf-8")
    assert "lesson-foot" in source
    css = (ROOT / "web" / "css" / "style.css").read_text(encoding="utf-8")
    rule = re.search(r"\.lesson-foot\s*\{([^}]*)\}", css)
    assert rule and "position: sticky" in rule.group(1)


@needs_node
def test_story_scenes_fit_on_the_stage(tmp_path: Path) -> None:
    """Every scene stays inside the map and nothing overlaps."""
    import json
    from server.curriculum.scenes import SCENES
    data = tmp_path / "scenes.json"
    data.write_text(json.dumps(SCENES), encoding="utf-8")
    script = ROOT / "tests" / "js" / "check_scenes.mjs"
    assert NODE is not None
    result = subprocess.run([NODE, str(script), str(data)],
                            capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == []


# ------------------------------------------------------------ unit tests
@needs_node
def test_js_unit_tests() -> None:
    assert NODE is not None
    files = sorted(str(p) for p in (ROOT / "tests" / "js").glob(
        "*.test.mjs"))
    result = subprocess.run([NODE, "--test", *files], capture_output=True,
                            text=True, timeout=120, cwd=ROOT)
    assert result.returncode == 0, result.stdout[-3000:] + result.stderr


# ------------------------------------------------------ browser smoke test
def _browser() -> str | None:
    for name in ("google-chrome", "chromium", "chromium-browser"):
        found = shutil.which(name)
        if found:
            return found
    return None


@pytest.fixture(scope="module")
def server_url() -> Iterator[str]:
    from server.app import make_server
    with tempfile.TemporaryDirectory() as tmp:
        httpd = make_server("127.0.0.1", 0, Path(tmp) / "save.json")
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{httpd.server_address[1]}/"
        finally:
            httpd.shutdown()


PROGRAM = '''class Golem:
    def __init__(self, health: int) -> None:
        self.health = health

    def hit(self, damage: int) -> None:
        self.health -= damage
        print(f"Aïe ! Il reste {self.health} PV au golem.")


guard = Golem(100)
guard.hit(30)
print(guard.hp)
'''


def test_browser_smoke(server_url: str) -> None:
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    errors: list[str] = []
    with playwright.sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome,
                                    args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1500, "height": 880})
        # The trailer of the first launch is tested on its own below.
        page.add_init_script(
            "localStorage.setItem('pycraft.trailerSeen', '6')")
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(server_url + "?intro=0")
        page.wait_for_timeout(1500)
        assert page.locator("#overlay").is_visible()  # welcome screen
        page.evaluate("document.getElementById('overlay')"
                      ".classList.add('hidden')")
        # The story of the first level is told first (it can only be
        # played faster), then the other steps open.
        page.evaluate(SKIP_CINEMATIC)
        page.wait_for_function("!window.pycraft.world.cinematic",
                               timeout=30000)
        page.evaluate("window.pycraft.goStep('experiment')")
        page.wait_for_timeout(400)
        page.fill("#editor textarea", PROGRAM)
        page.click("#btn-run")
        page.wait_for_timeout(2000)
        page.evaluate("window.pycraft.pause()")
        state: Any = page.evaluate("""() => {
            const a = window.pycraft;
            a.goto(a.model.count - 1, false);
            return { steps: a.model.count,
                     objects: a.world.entities.size,
                     classes: a.world.blueprints.size };
        }""")
        assert state["steps"] > 3
        assert state["objects"] == 1 and state["classes"] == 1
        # The guided error card is shown, with its questions.
        card = page.locator("#console-extra .card.err")
        assert card.is_visible()
        assert "AttributeError" in card.inner_text()
        assert page.locator(".guide-q li").count() == 1
        page.click("text=Une autre question")
        assert page.locator(".guide-q li").count() == 2
        page.click("text=Montrer sur la carte")
        found = page.evaluate(
            "window.pycraft.world.effects.filter(f => f.kind === 'spot')"
            ".length")
        assert found >= 1
        # The ground must not change between two frames when the camera is
        # still (it used to flicker between plain and textured tiles).
        page.wait_for_timeout(2500)
        diff = page.evaluate("""async () => {
            const canvas = document.getElementById('world');
            const grab = () => {
                const c = document.createElement('canvas');
                c.width = canvas.width; c.height = canvas.height;
                const g = c.getContext('2d');
                g.drawImage(canvas, 0, 0);
                const y = Math.floor(canvas.height * 0.78);
                return g.getImageData(0, y, canvas.width, 40).data;
            };
            const a = grab();
            await new Promise((r) => setTimeout(r, 400));
            const b = grab();
            let changed = 0;
            for (let i = 0; i < a.length; i += 4) {
                const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1])
                    + Math.abs(a[i + 2] - b[i + 2]);
                if (d > 60) changed += 1;
            }
            return changed / (a.length / 4);
        }""")
        assert diff < 0.03, f"le sol a changé sur {diff:.1%} des pixels"
        # Dashboard with stats and achievements.
        page.click("#btn-progress")
        page.wait_for_timeout(800)
        assert page.locator(".ach-card").count() >= 10
        assert page.locator(".ach-card.on").count() >= 1
        page.click("#overlay-close")
        # Guided tour opens and closes.
        page.click("#btn-tour")
        page.wait_for_timeout(300)
        assert page.locator(".tour").count() == 1
        page.click(".tour-skip")
        assert page.locator(".tour").count() == 0
        browser.close()
    assert not errors, errors


def test_every_sound_renders_cleanly(server_url: str) -> None:
    """Each synthesized sound and each regional music is rendered offline
    in the browser: it must be audible, finite and never clip."""
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    with playwright.sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome,
                                    args=["--no-sandbox"])
        page = browser.new_page()
        page.goto(server_url + "?intro=0")
        page.wait_for_timeout(800)
        levels: Any = page.evaluate("""async () => {
            const mod = await import('/js/sound.js');
            const measure = (buf) => {
                let peak = 0;
                let bad = 0;
                for (let ch = 0; ch < buf.numberOfChannels; ch++) {
                    for (const v of buf.getChannelData(ch)) {
                        if (!Number.isFinite(v)) bad++;
                        peak = Math.max(peak, Math.abs(v));
                    }
                }
                return { peak, bad };
            };
            const out = {};
            for (const name of mod.SOUND_NAMES) {
                out[name] = measure(await mod.renderOffline(
                    OfflineAudioContext, [[name, {}]], 2.5, 16000));
            }
            for (const mood of Object.keys(mod.MOODS)) {
                out['music:' + mood] = measure(await mod.renderOffline(
                    OfflineAudioContext, [['music:' + mood]], 6, 16000));
            }
            out.voice = measure(await mod.renderOffline(OfflineAudioContext,
                [['voice', 'Bonjour, voyageur !', { pitch: 170 }]], 2, 16000));
            return out;
        }""")
        browser.close()
    assert len(levels) > 30
    for name, level in levels.items():
        assert level["bad"] == 0, name
        assert 0.01 < level["peak"] < 0.98, (name, level["peak"])


SKIP_CINEMATIC = """() => {
    const c = window.pycraft.world.cinematic;
    for (let i = 0; c && !c.done && i < 60; i += 1) c.next();
}"""


def test_first_launch_trailer(server_url: str) -> None:
    """The trailer plays at the first launch: it can be paused and walked
    through step by step, not jumped over; then the story of the first level
    keeps the lesson locked until its last step."""
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    errors: list[str] = []
    with playwright.sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome,
                                    args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1300, "height": 800})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(server_url)
        page.wait_for_timeout(1500)
        assert page.locator(".tr-start").is_visible()
        page.click("text=Découvrir PyCraft")
        page.wait_for_timeout(900)
        page.keyboard.press("Escape")
        assert page.locator(".trailer").count() == 1  # not skipped
        assert page.locator(".cine-controls .close").count() == 0
        # A memory: just the name of the world, no description.
        assert page.locator(".tr-world").inner_text().upper().startswith(
            "ACTE I ·")
        assert page.locator(".tr-map.show").count() == 0
        assert page.evaluate("window.pycraft.world.stage.npcs.length") > 0
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(300)
        assert page.evaluate("window.pycraft.world.cinematic.index") == 1
        # Three phases: the journey (one memory per world of acts I-III),
        # the approach (act IV), then the silence and the Heart of the
        # World, with the question asked to the player.
        labels: Any = page.evaluate(
            "window.pycraft.world.cinematic.steps.map(s => s.label)")
        kinds = [label.split()[0] for label in labels]
        assert kinds == (["souvenir"] * 10 + ["approche"] * 2
                         + ["silence", "sleeping", "seals", "awakening",
                            "burst", "défi", "fin"])
        seen: Any = page.evaluate("""() => {
            const w = window.pycraft.world;
            const out = [];
            for (let i = 0; w.cinematic && i < 60; i += 1) {
                out.push([w.themeName, w.grade && w.grade.kind,
                          !!w.challenge]);
                w.cinematic.next();
            }
            return out;
        }""")
        # (the first memory was left with ArrowRight above)
        assert [g for _, g, _ in seen[:9]] == ["memory"] * 9
        assert [g for _, g, _ in seen[9:11]] == ["approach"] * 2
        assert seen[11] == ["coeur", "black", False]
        assert [c for _, _, c in seen].count(True) == 1
        assert [t for t, _, _ in seen[11:]] == ["coeur"] * 7
        page.wait_for_selector(".trailer", state="detached", timeout=30000)
        assert page.evaluate(
            "localStorage.getItem('pycraft.trailerSeen')") == "6"
        page.wait_for_timeout(800)
        # Then the story of the first level.
        info: Any = page.evaluate("window.pycraft.world.cinematic.info()")
        assert info["blocking"] and info["kind"] == "story"
        page.evaluate("window.pycraft.goStep('explain')")
        assert page.evaluate("window.pycraft.step") == "story"
        # The welcome window covers it: the story waits, paused, and its
        # buttons stay under the window.
        assert page.locator("#overlay").is_visible()
        assert info["paused"] is True
        page.click("text=Je connais déjà")
        page.wait_for_timeout(300)
        assert page.evaluate(
            "window.pycraft.world.cinematic.paused") is False
        browser.close()
    assert not errors, errors


def test_cinematic_controls(server_url: str) -> None:
    """Pause freezes the world; next / previous rebuild the step from
    scratch: one bubble, the right line, nothing fired twice."""
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    errors: list[str] = []
    with playwright.sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome,
                                    args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1300, "height": 800})
        page.add_init_script(
            "localStorage.setItem('pycraft.trailerSeen', '6');"
            "localStorage.setItem('pycraft.welcomed', '1')")
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(server_url + "?intro=0")
        page.wait_for_timeout(1500)
        bubbles = """() => window.pycraft.world.effects
            .filter(f => f.kind === 'bubble' && f.npc).map(f => f.text)"""
        intro: Any = page.evaluate("window.pycraft.level.scene.intro")
        assert page.evaluate("window.pycraft.world.cinematic.index") == 0
        page.click(".cine-controls .main")  # pause
        t0 = page.evaluate("window.pycraft.world.now()")
        page.wait_for_timeout(700)
        assert page.evaluate("window.pycraft.world.now()") == t0
        assert page.evaluate("window.pycraft.world.cinematic.index") == 0
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        assert page.evaluate(bubbles) == [intro[1][1]]
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(200)
        assert page.evaluate(bubbles) == [intro[0][1]]
        assert page.evaluate("window.pycraft.world.cinematic.index") == 0
        page.keyboard.press(" ")  # resume
        page.wait_for_timeout(500)
        assert page.evaluate("window.pycraft.world.now()") > t0
        page.evaluate(SKIP_CINEMATIC)
        page.wait_for_function("!window.pycraft.world.cinematic")
        assert page.evaluate("window.pycraft.world.paused") is False
        browser.close()
    assert not errors, errors


def test_finale_of_the_last_level(server_url: str) -> None:
    """The last level has its own place and cinematic: every step sets the
    state of the Heart, backwards as well as forwards."""
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    errors: list[str] = []
    with playwright.sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome,
                                    args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1300, "height": 800})
        page.add_init_script(
            "localStorage.setItem('pycraft.trailerSeen', '6');"
            "localStorage.setItem('pycraft.welcomed', '1')")
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(server_url + "?intro=0")
        page.wait_for_timeout(1200)
        page.evaluate(SKIP_CINEMATIC)
        page.evaluate("""async () => {
            const a = window.pycraft;
            a.progress.levels.k3l1.status = 'available';
            await a.openLevel('k3l1');
        }""")
        page.wait_for_timeout(800)
        state = """() => {
            const w = window.pycraft.world;
            return [w.themeName, w.cinematic && w.cinematic.kind,
                    w.cinematic && w.cinematic.index, w.heart.awake,
                    w.heart.seals];
        }"""
        assert page.evaluate(state) == ["coeur", "finale", 0, 0, 0]
        for _ in range(3):
            page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        assert page.evaluate(state)[2:] == [3, 1, 4]   # awakening
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(200)
        assert page.evaluate(state)[2:] == [2, 0, 0]   # seals, from 0 again
        page.evaluate(SKIP_CINEMATIC)
        page.wait_for_function("!window.pycraft.world.cinematic")
        assert page.evaluate(state)[3:] == [1, 0]
        # The Heart answers a click (it beats).
        page.wait_for_timeout(600)
        before = page.evaluate("window.pycraft.world.heart.pulseAt")
        box = page.locator("#world").bounding_box()
        assert box is not None
        hx, hy = page.evaluate("""async () => {
            const { HEART } = await import('/js/coeur.js');
            return window.pycraft.world.project(HEART.x, HEART.y, HEART.z);
        }""")
        page.mouse.click(box["x"] + hx, box["y"] + hy)
        page.wait_for_timeout(200)
        assert page.evaluate("window.pycraft.world.heart.pulseAt") > before
        browser.close()
    assert not errors, errors


def test_returning_player_trailer(server_url: str) -> None:
    """The trailer plays at every launch: a returning player is welcomed
    back with his game, and can close it to resume."""
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    errors: list[str] = []
    with playwright.sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome,
                                    args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1300, "height": 800})
        page.add_init_script(
            "localStorage.setItem('pycraft.trailerSeen', '6');"
            "localStorage.setItem('pycraft.welcomed', '1')")
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(server_url)
        page.wait_for_timeout(1500)
        card = page.locator(".tr-start")
        assert card.is_visible()
        assert "Reprendre l'aventure" in card.inner_text()
        assert "Découvrir" not in card.inner_text()
        level: Any = page.evaluate("window.pycraft.level")
        assert f"Niveau {level['number']}" in card.inner_text()
        page.keyboard.press("Enter")  # the button has the focus
        page.wait_for_timeout(900)
        kind = page.evaluate("window.pycraft.world.cinematic.kind")
        assert kind == "trailer"
        page.click(".cine-controls .close")
        page.wait_for_selector(".trailer", state="detached", timeout=5000)
        page.wait_for_timeout(600)
        assert page.evaluate("window.pycraft.level.id") == level["id"]
        browser.close()
    assert not errors, errors
