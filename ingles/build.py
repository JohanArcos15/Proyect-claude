#!/usr/bin/env python3
"""Une las fuentes de ingles/src en dos archivos:

- dist/dosis-de-ingles.html: cuerpo para publicar como artefacto de Claude
  (el artefacto añade <!doctype>, <head> y <body>).
- index.html: página completa para abrir en el navegador o en GitHub Pages
  (sin guardado en la nube ni tutor con IA; sí dictado del navegador).

Uso: python3 ingles/build.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

DATA = ["vocab", "sounds", "listening", "grammar", "reading", "speaking", "science", "placement", "contexts"]


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def build() -> None:
    css = read(SRC / "styles.css")
    parts = [f"/* ---- data/{n}.js ---- */\n" + read(SRC / "data" / f"{n}.js") for n in DATA]
    parts += [f"/* ---- app/{p.name} ---- */\n" + read(p) for p in sorted((SRC / "app").glob("*.js"))]
    js = "(() => {\n'use strict';\n" + "\n".join(parts) + "\n})();"
    shell = read(SRC / "shell.html")
    body = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
    if "</script" in js.lower():
        raise SystemExit("El JS contiene '</script': escápalo antes de publicar.")

    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "dosis-de-ingles.html").write_text(body, encoding="utf-8")

    head_end = body.index('<div class="app"')
    head, rest = body[:head_end], body[head_end:]
    standalone = (
        "<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
        + head
        + "</head>\n<body>\n"
        + rest
        + "\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(standalone, encoding="utf-8")
    print(f"dist/dosis-de-ingles.html: {len(body.encode()) / 1024:.0f} KB")
    print(f"index.html: {len(standalone.encode()) / 1024:.0f} KB")


if __name__ == "__main__":
    build()
