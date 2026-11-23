#!/usr/bin/env python3
"""Lance PyCraft : python3 run.py  (puis ouvre http://127.0.0.1:8765)."""
from __future__ import annotations

import argparse
import sys
import threading
import webbrowser
from pathlib import Path

if sys.version_info < (3, 10):
    sys.exit("PyCraft demande Python 3.10 ou plus récent "
             f"(tu utilises {sys.version.split()[0]}).")

from server.app import make_server  # noqa: E402

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="PyCraft")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--save", type=Path,
                        default=ROOT / "saves" / "progress.json")
    args = parser.parse_args()
    server = make_server("127.0.0.1", args.port, args.save)
    url = f"http://127.0.0.1:{args.port}"
    print(f"⛏  PyCraft tourne sur {url}  (Ctrl+C pour arrêter)")
    print(f"   Sauvegarde : {args.save}")
    if not args.no_browser:
        threading.Timer(0.8, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nÀ bientôt dans PyCraft !")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
