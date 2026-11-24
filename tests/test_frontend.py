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
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(server_url)
        page.wait_for_timeout(1500)
        assert page.locator("#overlay").is_visible()  # welcome screen
        page.evaluate("document.getElementById('overlay')"
                      ".classList.add('hidden')")
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
        page.goto(server_url)
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
