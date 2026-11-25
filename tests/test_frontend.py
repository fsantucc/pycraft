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


ADMIN_PASSWORD = "atelier-de-test"


@pytest.fixture
def admin_url(tmp_path: Path) -> Iterator[str]:
    from server.admin import AdminAuth
    from server.app import make_server
    httpd = make_server("127.0.0.1", 0, tmp_path / "progress.json",
                        auth=AdminAuth(ADMIN_PASSWORD))
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_address[1]}/"
    finally:
        httpd.shutdown()


def test_admin_panel_for_the_workshop(admin_url: str) -> None:
    """The organizer: password, start in acts II, III and IV (the level
    opens at once, without reload), free exploration, back to normal, then
    a new participant gets the real first launch."""
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
            "if (!sessionStorage.getItem('started')) {"
            " sessionStorage.setItem('started', '1');"
            " localStorage.setItem('pycraft.trailerSeen', '6');"
            " localStorage.setItem('pycraft.welcomed', '1'); }")
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(admin_url + "?intro=0")
        page.wait_for_timeout(1200)
        page.evaluate("window.notReloaded = true")
        page.click("#btn-admin")
        page.fill(".adm-login input", "pas-le-bon")
        page.keyboard.press("Enter")
        page.wait_for_selector("text=Mot de passe incorrect.")
        page.fill(".adm-login input", ADMIN_PASSWORD)
        page.keyboard.press("Enter")
        page.wait_for_selector(".adm-tabs")
        assert page.locator("#btn-admin").inner_text() == "Admin ✓"
        status = "(id) => window.pycraft.progress.levels[id].status"
        for preset, number in (("Acte II", "3.1"), ("Acte III", "10.1"),
                               ("Acte IV", "11.1")):
            if not page.locator(".adm-tabs").is_visible():
                page.click("#btn-admin")
                page.wait_for_selector(".adm-tabs")
            page.click(f".adm-presets button:has-text('{preset}')")
            page.click("text=Commencer ici")
            page.wait_for_selector(".adm-confirm")
            assert f"commencera au {number}" in \
                page.locator(".adm-confirm").inner_text()
            page.click(".adm-confirm .mc-btn")
            page.wait_for_function(
                f"window.pycraft.level.number === '{number}'")
            page.wait_for_timeout(300)
            assert page.evaluate("window.notReloaded") is True
            level = page.evaluate("window.pycraft.level.id")
            assert page.evaluate(status, level) != "locked"
            assert page.locator("#overlay").is_hidden()
        # Free exploration, then back to the normal progression.
        page.click("#btn-admin")
        page.click("text=Exploration libre (43 niveaux)")
        page.click(".adm-confirm .mc-btn")
        page.wait_for_timeout(600)
        statuses: Any = page.evaluate(
            "Object.values(window.pycraft.progress.levels)"
            ".map(l => l.status)")
        assert "locked" not in statuses and len(statuses) == 43
        page.click("text=Progression normale")
        page.wait_for_selector(".adm-confirm")
        assert "verrouillés" in page.locator(".adm-confirm").inner_text()
        page.click(".adm-confirm .mc-btn")
        page.wait_for_timeout(800)
        assert page.evaluate(status, "k3l1") == "locked"
        assert page.evaluate("window.pycraft.level.id") == "a1l1"
        # A new participant: backup, reset, real first launch, logged out.
        page.click("#btn-admin")
        page.wait_for_selector(".adm-tabs")
        page.click(".adm-tab[data-tab=workshop]")
        page.fill(".adm-steps input.adm-input", "Léa")
        page.click("text=Préparer le jeu pour le nouveau participant")
        page.click(".adm-confirm .mc-btn")
        page.wait_for_selector(".tr-start", timeout=10000)
        assert "Découvrir PyCraft" in page.locator(".tr-start").inner_text()
        assert page.evaluate("window.notReloaded") is None
        state: Any = page.evaluate(
            "fetch('/api/admin/status').then(r => r.json())")
        assert state["logged_in"] is False
        browser.close()
    assert not errors, errors


def _open_app(p: Any, url: str, chrome: str) -> tuple[Any, Any, list[str]]:
    errors: list[str] = []
    browser = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1500, "height": 880})
    page.add_init_script("localStorage.setItem('pycraft.trailerSeen', '6')")
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url + "?intro=0")
    page.wait_for_timeout(1500)
    page.evaluate("document.getElementById('overlay').classList.add('hidden')")
    page.evaluate(SKIP_CINEMATIC)
    page.wait_for_function("!window.pycraft.world.cinematic", timeout=30000)
    return browser, page, errors


def test_level_1_1_night_lantern_and_inspection(server_url: str) -> None:
    """The program changes the world (night, lantern, house), a click on a
    character zooms on him and opens his card, Escape gives the camera
    back; the props and creatures answer the clicks."""
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    with playwright.sync_playwright() as p:
        browser, page, errors = _open_app(p, server_url, chrome)
        page.evaluate("window.pycraft.goStep('mission')")
        page.wait_for_timeout(500)
        look = """() => { const w = window.pycraft.world;
            const lamp = w.stage.props.find((x) => x.type === 'lantern');
            const house = w.stage.props.find((x) => x.type === 'house');
            return { night: w.night.to, lamp: w.propLook(lamp),
                     house: w.propLook(house),
                     mobs: w.mobs.filter((m) => m.react && !m.fleeing)
                       .length }; }"""
        before = page.evaluate(look)
        assert before["night"] == 0 and before["lamp"]["lit"] is False
        # A stand-in function (it prints nothing): calling it is what
        # lights the lantern.
        page.evaluate("""() => { const a = window.pycraft;
            const f = a.editor.getFiles();
            f['lanterne.py'] = 'def allumer_lanterne() -> None:\\n'
              + '    pass\\n';
            a.editor.setFiles(f, 'lanterne.py'); a.runCurrent(); }""")
        # (wait for this run, not the demo played before)
        page.wait_for_function("window.pycraft.model && (window.pycraft"
                               ".model.result.output || '')"
                               ".includes('nuit tombe')", timeout=20000)
        page.evaluate("window.pycraft.pause()")
        steps = page.evaluate("window.pycraft.model.count")
        page.evaluate("window.pycraft.goto(-1, false)")
        seen = []
        for i in range(steps):
            page.evaluate(f"window.pycraft.goto({i}, true)")
            seen.append(page.evaluate(look))
        night_at = next(i for i, s in enumerate(seen) if s["night"] == 1)
        lit_at = next(i for i, s in enumerate(seen) if s["lamp"]["lit"])
        assert night_at < lit_at, "the night falls before the lantern"
        assert seen[night_at]["mobs"] == 1, "a zombie comes in the dark"
        assert seen[lit_at]["mobs"] == 0, "the light drives it away"
        assert all(s["lamp"]["lit"] for s in seen[lit_at:]), \
            "a second call keeps the lantern lit"
        # Stepping back to the start: day again, lantern out.
        page.evaluate("window.pycraft.goto(0, false)")
        back = page.evaluate(look)
        assert back["night"] == 0 and back["lamp"]["lit"] is False
        page.evaluate(f"window.pycraft.goto({steps - 1}, false)")

        # A real click on the character in the world.
        page.wait_for_timeout(1500)
        cam0 = page.evaluate("({...window.pycraft.world.cam})")
        point = page.evaluate("""() => { const w = window.pycraft.world;
            const r = w.canvas.getBoundingClientRect();
            const h = w.hitboxes.find((b) => b.target.kind === 'npc');
            return [r.left + (h.x0 + h.x1) / 2, r.top + (h.y0 + h.y1) / 2];
        }""")
        page.mouse.click(point[0], point[1])
        page.wait_for_timeout(1400)
        card = page.locator("#world-card")
        assert card.is_visible()
        text = card.inner_text()
        assert "Le vieux villageois" in text and "Doyen" in text
        assert "Dans ta mission" in text
        cam1 = page.evaluate("({...window.pycraft.world.cam})")
        assert cam1["k"] > cam0["k"] * 1.5, "the camera zooms on him"
        assert page.evaluate("window.pycraft.world.selected.kind") == "npc"
        # Talking again: another line.
        first = page.locator("#world-card .wc-say").inner_text()
        page.click("#world-card >> text=Lui parler")
        assert page.locator("#world-card .wc-say").inner_text() != first
        page.keyboard.press("Escape")
        page.wait_for_timeout(1600)
        assert not card.is_visible()
        cam2 = page.evaluate("({...window.pycraft.world.cam})")
        assert abs(cam2["k"] - cam0["k"]) < 0.05 * cam0["k"], \
            "the camera is back where it was"
        # The name in the story opens the same card.
        page.evaluate("window.pycraft.goStep('story')")
        page.evaluate(SKIP_CINEMATIC)
        page.wait_for_timeout(300)
        page.evaluate("window.pycraft.world.cinematic"
                      " && window.pycraft.world.cinematic.stop()")
        page.click(".npc-link >> nth=0")
        page.wait_for_timeout(500)
        assert card.is_visible() and "Doyen" in card.inner_text()
        page.click(".wc-close")
        # A prop: the house door opens and closes.
        page.evaluate("""() => { const a = window.pycraft;
            const i = a.world.stage.props.findIndex(
              (x) => x.type === 'house');
            a.inspect({ kind: 'prop', id: i }); }""")
        assert "Maison" in card.inner_text()
        door = "window.pycraft.world.propLook(window.pycraft.world.stage" \
               ".props.find((x) => x.type === 'house')).open"
        was = bool(page.evaluate(door))
        page.click("#world-card .wc-actions button")
        assert bool(page.evaluate(door)) != was
        page.keyboard.press("Escape")
        # A secret of the world is recorded by the server.
        page.evaluate("window.pycraft.foundEgg('piscine')")
        page.wait_for_timeout(500)
        stats = page.evaluate("fetch('/api/stats').then((r) => r.json())")
        assert any(a["id"] == "egg_first" and a["unlocked"]
                   for a in stats["achievements"]), stats["achievements"]
        browser.close()
    assert not errors, errors


def test_camera_never_loses_the_map(server_url: str) -> None:
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    with playwright.sync_playwright() as p:
        browser, page, errors = _open_app(p, server_url, chrome)
        box = page.locator("#world").bounding_box()
        assert box is not None
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        # Dragging very far away, then zooming out and in.
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x - 4000, y - 3000, steps=8)
        page.mouse.up()
        for _ in range(12):
            page.mouse.wheel(0, 400)
        page.wait_for_timeout(800)
        inside = """() => { const w = window.pycraft.world;
            const map = [[0, 0], [24, 0], [0, 24], [24, 24]]
              .map(([a, b]) => w.project(a, b, 0));
            const xs = map.map((m) => m[0]);
            const ys = map.map((m) => m[1]);
            // How much of the map's extent is inside the view.
            const seenX = Math.min(Math.max(...xs), w.width)
              - Math.max(Math.min(...xs), 0);
            const seenY = Math.min(Math.max(...ys), w.height)
              - Math.max(Math.min(...ys), 0);
            return seenX >= 100 && seenY >= 100;
        }"""
        assert page.evaluate(inside), "a good part of the map stays on screen"
        zoom = page.evaluate("window.pycraft.world.zoom")
        assert 0.5 <= zoom <= 2.6
        # Home: back to the starting view, smoothly.
        page.keyboard.press("Home")
        page.wait_for_timeout(1500)
        state = page.evaluate("({ zoom: window.pycraft.world.zoom,"
                              " pan: window.pycraft.world.pan })")
        assert abs(state["zoom"] - 1) < 0.01
        assert abs(state["pan"]["x"]) < 1 and abs(state["pan"]["y"]) < 1
        browser.close()
    assert not errors, errors


def test_editor_helps_with_brackets_and_indentation(server_url: str) -> None:
    playwright = pytest.importorskip("playwright.sync_api")
    chrome = _browser()
    if chrome is None:
        pytest.skip("aucun navigateur Chrome/Chromium")
    with playwright.sync_playwright() as p:
        browser, page, errors = _open_app(p, server_url, chrome)
        page.evaluate("window.pycraft.goStep('experiment')")
        # A demo may still be playing (it switches the file shown): stop
        # it before typing.
        page.wait_for_timeout(1200)
        page.evaluate("window.pycraft.pause()")
        page.evaluate("window.pycraft.editor.switchTo('main.py')")
        area = page.locator("#editor textarea")
        area.fill("")
        area.focus()
        # ( closes itself, the caret stays inside.
        page.keyboard.type("print(")
        assert area.input_value() == "print()"
        page.keyboard.type('"ok"')
        page.keyboard.type(")")
        assert area.input_value() == 'print("ok")', "steps over the ) and \""
        # Enter after ":" indents, "else:" goes back to the "if" level.
        area.fill("")
        area.focus()
        page.keyboard.type("if x:")
        page.keyboard.press("Enter")
        page.keyboard.type("y = 1")
        page.keyboard.press("Enter")
        page.keyboard.type("else:")
        assert area.input_value() == "if x:\n    y = 1\nelse:"
        # A bracket never closed: a red mark in the gutter, with the reason.
        area.fill("liste = [1, 2\nprint(liste)\n")
        page.wait_for_timeout(200)
        bad = page.locator("#editor .g-bad")
        assert bad.count() == 1
        assert "jamais fermée" in (bad.first.get_attribute("title") or "")
        assert page.locator("#editor .br-bad").count() >= 1
        # The bracket matching the one at the caret is highlighted.
        area.fill("x = (1 + (2))\n")
        page.evaluate("""() => { const t = document.querySelector(
            '#editor textarea'); t.focus(); t.setSelectionRange(5, 5);
            document.dispatchEvent(new Event('selectionchange')); }""")
        page.wait_for_timeout(200)
        assert page.locator("#editor .br-match").count() == 2
        browser.close()
    assert not errors, errors
