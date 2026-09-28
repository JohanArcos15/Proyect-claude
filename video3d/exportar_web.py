"""Versiones ligeras de los recursos 3D para la página web (assets/3d-web).

Submuestrea las secuencias, reduce la resolución y ajusta los metadatos
(n, ángulos y proyecciones) para que el compositor funcione igual.
"""
import json
import shutil
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / "assets" / "3d"
WEB = RAIZ / "assets" / "3d-web"

SECUENCIAS = {"cerebro_rayosx": (3, 0.7, 80), "cerebro_tejido": (2, 0.7, 80), "amapola": (1, 0.7, 82)}
PLANOS = {"pastillas": 0.72, "neurona": 0.72, "sinapsis": 0.72, "membrana": 0.72}


def convertir(src, dst, escala, calidad):
    im = Image.open(src)
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=calidad, method=6)


def main():
    WEB.mkdir(exist_ok=True)
    shutil.copy(ORIG / "moleculas3d.json", WEB / "moleculas3d.json")
    (WEB / "atomos").mkdir(exist_ok=True)
    for f in (ORIG / "atomos").glob("*.webp"):
        shutil.copy(f, WEB / "atomos" / f.name)
    for nombre, (paso, escala, calidad) in SECUENCIAS.items():
        meta = json.loads((ORIG / nombre / "meta.json").read_text())
        idx = list(range(0, meta["n"], paso))
        if idx[-1] != meta["n"] - 1:
            idx.append(meta["n"] - 1)
        for j, i in enumerate(idx):
            convertir(ORIG / nombre / f"{i:03d}.webp", WEB / nombre / f"{j:03d}.webp", escala, calidad)
        nuevo = dict(meta, n=len(idx))
        for clave in ("angulos", "proyecciones"):
            if clave in meta:
                nuevo[clave] = [meta[clave][i] for i in idx]
        (WEB / nombre / "meta.json").write_text(json.dumps(nuevo, separators=(",", ":")))
    for carpeta, escala in PLANOS.items():
        for f in (ORIG / carpeta).glob("*.webp"):
            convertir(f, WEB / carpeta / f.name, escala, 82)
        shutil.copy(ORIG / carpeta / "meta.json", WEB / carpeta / "meta.json")
    total = sum(f.stat().st_size for f in WEB.rglob("*") if f.is_file())
    print(f"assets/3d-web: {total / 1e6:.1f} MB en {sum(1 for f in WEB.rglob('*') if f.is_file())} archivos")


if __name__ == "__main__":
    main()
