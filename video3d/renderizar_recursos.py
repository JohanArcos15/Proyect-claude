"""Renderiza con Blender Cycles todos los recursos 3D de la animación.

Cada paso es un script de video3d/blender/ ejecutado con bpy como módulo.
Se salta un paso si su salida ya existe (borra ese archivo para repetirlo).
Uso: python3 video3d/renderizar_recursos.py [filtro ...]
"""
import subprocess
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
B = RAIZ / "video3d" / "blender"
A = RAIZ / "assets" / "3d"

PASOS = [
    ("átomos e iones", ["atomos.py"], A / "atomos" / "NT.webp"),
    ("sinapsis", ["sinapsis.py", "40"], A / "sinapsis" / "meta.json"),
    ("membrana y receptor", ["membrana.py", "mu,delta,kappa,nop", "32"], A / "membrana" / "meta.json"),
    ("neuronas", ["neurona.py", "ambas", "40"], A / "neurona" / "sola.webp"),
    ("pastillas", ["pastillas.py", "48"], A / "pastillas" / "meta.json"),
    ("adormidera", ["amapola.py", "20", "32"], A / "amapola" / "meta.json"),
    ("cerebro (rayos X)", ["cerebro.py", "rayosx", "120", "16"], A / "cerebro_rayosx" / "meta.json"),
    ("cerebro (tejido)", ["cerebro.py", "tejido", "24", "32"], A / "cerebro_tejido" / "meta.json"),
]


def main():
    filtros = sys.argv[1:]
    for nombre, args, hecho in PASOS:
        if filtros and not any(f in nombre for f in filtros):
            continue
        if hecho.exists():
            print(f"= {nombre}: ya existe", flush=True)
            continue
        t0 = time.time()
        print(f"> {nombre}…", flush=True)
        subprocess.run([sys.executable, args[0], *args[1:]], cwd=B, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"✓ {nombre} en {time.time() - t0:.0f} s", flush=True)


if __name__ == "__main__":
    main()
