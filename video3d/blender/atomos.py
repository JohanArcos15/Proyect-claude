"""Esferas fotorrealistas por elemento (impostores) para dibujar moléculas e iones.

Luz fija respecto a la cámara: la molécula puede girar en la composición y el
sombreado sigue siendo coherente (la luz no gira con ella, como en un estudio).
"""
import math
from comun import *

ESPECIES = {
    # nombre: (color, rugosidad, emisión)
    "C": ((0.085, 0.09, 0.1), 0.28, None),
    "H": ((0.86, 0.87, 0.89), 0.24, None),
    "O": ((0.78, 0.045, 0.035), 0.22, None),
    "N": ((0.05, 0.17, 0.86), 0.22, None),
    "K": ((0.36, 0.2, 0.95), 0.2, None),
    "Ca": ((0.98, 0.45, 0.06), 0.22, None),
    "NT": ((1.0, 0.72, 0.28), 0.3, (1.0, 0.62, 0.2)),
}


def main():
    for nombre, (col, rug, emi) in ESPECIES.items():
        sc = reiniciar()
        motor(sc, 384, 384, spp=128, transparente=True, umbral=0.01)
        mundo(sc, degradado=((0.16, 0.15, 0.2), (0.005, 0.004, 0.01)), fuerza=0.6)
        m = material(nombre, col, rugosidad=rug, capa=1.0, capa_rug=0.04, emision=emi, fuerza_emision=1.1 if emi else 0)
        esfera("s", (0, 0, 0), 1.0, m, seg=96, anillos=48)
        luz_area("clave", (-3.2, -4.0, 3.4), energia=300, tam=3.2, tam_y=2.2, forma="ELLIPSE", color=(1.0, 0.97, 0.94))
        luz_area("relleno", (4.2, -2.5, -0.8), energia=70, tam=5, forma="DISK", color=(0.75, 0.82, 1.0))
        luz_area("contra", (1.5, 4.0, 2.8), energia=240, tam=2.0, forma="DISK", color=(0.8, 0.75, 1.0))
        cam = camara((0, -10, 0), (0, 0, 0))
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = 2.08
        png = render(sc, TMP / "atomos" / f"{nombre}.png")
        a_webp(png, SALIDA / "atomos" / f"{nombre}.webp", calidad=92)
        print("átomo", nombre)


if __name__ == "__main__":
    main()
