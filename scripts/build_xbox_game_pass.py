#!/usr/bin/env python3
"""Build the standalone Xbox Game Pass page for web and offline packages."""

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "web-game-library/xbox"


def javascript_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def build_target(catalog, output):
    output.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css", "app.js", "gamepad.js"):
        shutil.copy2(SOURCE / name, output / name)
    data_dir = output / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "catalog.js").write_text(
        "window.XBOX_GAME_PASS_DATA=" + javascript_json(catalog) + ";\n",
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "data/xbox-game-pass.json")
    parser.add_argument("--output", type=Path, action="append")
    args = parser.parse_args()
    catalog = json.loads(args.input.read_text(encoding="utf-8"))
    outputs = args.output or [ROOT / "local-site/xbox", ROOT / "html-package/xbox"]
    for output in outputs:
        build_target(catalog, output)
        print(f"Built Xbox Game Pass page: {output}")


if __name__ == "__main__":
    main()
