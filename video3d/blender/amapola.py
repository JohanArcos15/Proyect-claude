"""Cápsula de adormidera (Papaver somniferum) con cortes y látex, en giro lento.

Cápsula globosa con 10 costillas (carpelos), disco estigmático con 10 radios,
tallo, tres cortes verticales y gotas de látex (el opio es ese látex seco).
Unidades: 1 u = 1 cm. Uso: python3 amapola.py [n] [spp]
"""
import sys
import numpy as np
from comun import *

ANCHO, ALTO = 1100, 1300
NRAYOS = 10


def perfil(z):
    """Radio de la cápsula (ovoide-globosa, más ancha algo por debajo del centro)."""
    z = np.asarray(z, dtype=float)
    base = 1.08 * (4 * z * (1 - z)) ** 0.5 * (1 - 0.12 * z)
    cuello = 0.46 + 0.0 * z
    r = np.where(z > 0.86, np.maximum(base, cuello * (1 - 2.2 * (z - 0.86) ** 2)), base)
    return np.maximum(r, 0.2 * (1 - z) + 0.02)


def cuerpo(mat):
    nz, nf = 140, 240
    z = np.linspace(0, 1, nz)[:, None]
    f = np.linspace(0, 2 * np.pi, nf, endpoint=False)[None, :]
    # Perfil: cuello basal, vientre globoso, cuello bajo el disco
    r = perfil(z)
    r = r * (1 + 0.035 * np.cos(NRAYOS * f) * np.sin(np.pi * z))
    H = 2.5
    X = (r * np.cos(f)).ravel(); Y = (r * np.sin(f)).ravel(); Z = (z * H * np.ones_like(f)).ravel()
    idx = np.arange(nz * nf).reshape(nz, nf)
    caras = np.stack([idx[:-1, :], idx[:-1, np.r_[1:nf, 0]], idx[1:, np.r_[1:nf, 0]], idx[1:, :]], -1).reshape(-1, 4)
    return malla("capsula", np.stack([X, Y, Z], 1), caras, material_=mat), H


def disco(mat, H):
    nr, nf = 30, 240
    rho = np.linspace(0, 1, nr)[:, None]
    f = np.linspace(0, 2 * np.pi, nf, endpoint=False)[None, :]
    borde = 0.78 * (1 + 0.07 * np.cos(NRAYOS * f + np.pi))          # festón entre radios
    rayo = np.exp(-((((f * NRAYOS / (2 * np.pi)) + 0.5) % 1 - 0.5) / 0.07) ** 2)
    alto = 0.07 + 0.09 * rayo * rho * (1 - rho ** 6) - 0.05 * rho ** 4
    R = rho * borde
    X = (R * np.cos(f)).ravel(); Y = (R * np.sin(f)).ravel(); Z = (H + alto * np.ones_like(f)).ravel() - 0.02
    idx = np.arange(nr * nf).reshape(nr, nf)
    caras = np.stack([idx[:-1, :], idx[:-1, np.r_[1:nf, 0]], idx[1:, np.r_[1:nf, 0]], idx[1:, :]], -1).reshape(-1, 4)
    o = malla("disco", np.stack([X, Y, Z], 1), caras, material_=mat)
    so = o.modifiers.new("grosor", "SOLIDIFY"); so.thickness = 0.06
    return o


def variar(mat, c1, c2, escala=6.0, relieve=0.12):
    """Moteado de color y microrrelieve con ruido procedural."""
    nt = mat.node_tree; b = nt.nodes["Principled BSDF"]
    ruido = nt.nodes.new("ShaderNodeTexNoise"); ruido.inputs["Scale"].default_value = escala
    ruido.inputs["Detail"].default_value = 8
    rampa = nt.nodes.new("ShaderNodeValToRGB")
    rampa.color_ramp.elements[0].color = (*c2, 1); rampa.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(ruido.outputs["Fac"], rampa.inputs["Fac"]); nt.links.new(rampa.outputs["Color"], b.inputs["Base Color"])
    fino = nt.nodes.new("ShaderNodeTexNoise"); fino.inputs["Scale"].default_value = 60; fino.inputs["Detail"].default_value = 6
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = relieve
    nt.links.new(fino.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 40
    spp = int(sys.argv[2]) if len(sys.argv) > 2 else 48
    sc = reiniciar()
    motor(sc, ANCHO, ALTO, spp=spp, transparente=True, umbral=0.02)
    mundo(sc, degradado=((0.1, 0.12, 0.16), (0.01, 0.01, 0.015)), fuerza=0.6)
    piel = material("glauca", (0.2, 0.33, 0.26), rugosidad=0.46, sss=0.18, sss_radio=(0.4, 1.0, 0.5), sss_escala=0.05, brillo_tela=0.35)
    variar(piel, (0.2, 0.32, 0.24), (0.12, 0.2, 0.15))
    corona = material("corona", (0.22, 0.24, 0.16), rugosidad=0.6, sss=0.1, brillo_tela=0.4)
    latex = material("latex", (0.93, 0.9, 0.82), rugosidad=0.18, sss=0.6, sss_radio=(1, 0.95, 0.8), sss_escala=0.08, capa=0.5)
    corte = material("corte", (0.12, 0.16, 0.1), rugosidad=0.7)
    raiz = bpy.data.objects.new("amapola", None); bpy.context.scene.collection.objects.link(raiz)
    c, H = cuerpo(piel); c.parent = raiz
    c.modifiers.new("s", "SUBSURF").render_levels = 1
    d = disco(corona, H); d.parent = raiz
    t = tubo_curva("tallo", [(0, 0, 0.1), (0.02, 0, -0.8), (0.12, 0.05, -1.8), (0.1, 0.1, -3.2), (-0.05, 0.1, -4.6)], 0.13, piel)
    t.parent = raiz
    # Cortes verticales con gotas de látex en la cara que mira a cámara
    rnd = np.random.default_rng(4)
    for k, ang in enumerate([-0.55, -0.1, 0.38]):
        pts = []
        for z in np.linspace(0.75, 1.75, 8):
            zz = z / H
            r = float(perfil(zz)) * (1 + 0.035 * math.cos(NRAYOS * (-math.pi / 2 + ang)) * math.sin(math.pi * zz))
            a = -math.pi / 2 + ang
            pts.append((r * 1.004 * math.cos(a), r * 1.004 * math.sin(a), z))
        tubo_curva(f"corte{k}", pts, 0.012, corte).parent = raiz
        for q, p in enumerate(pts[1:-1]):
            if rnd.random() < 0.55:
                g = esfera(f"gota{k}_{q}", p, 0.035 + 0.045 * rnd.random() ** 2, latex, seg=24, anillos=12)
                g.scale = (1, 0.7, 1.2 + 1.2 * rnd.random()); g.parent = raiz
        caida = pts[-1]
        g = esfera(f"chorro{k}", (caida[0] * 1.02, caida[1] * 1.02, caida[2] - 0.12), 0.07, latex, seg=24, anillos=12)
        g.scale = (1, 1, 1.9); g.parent = raiz
    luz_area("clave", (-5, -6, 5), (0, 0, 1.2), energia=700, tam=4, tam_y=3, forma="ELLIPSE", color=(1.0, 0.96, 0.9))
    luz_area("contra", (4, 5, 4), (0, 0, 1.2), energia=1300, tam=2.5, forma="DISK", color=(0.7, 0.8, 1.0))
    luz_area("relleno", (6, -4, 0), (0, 0, 1), energia=220, tam=5, forma="DISK", color=(0.65, 0.55, 1.0))
    cam = camara((0, -11.5, 1.6), (0, 0, 0.55), lente=50)
    for i in range(n):
        raiz.rotation_euler = (0, 0, math.radians(-10 + 20 * i / max(1, n - 1)))
        png = render(sc, TMP / "amapola" / f"{i:03d}.png")
        a_webp(png, SALIDA / "amapola" / f"{i:03d}.webp", calidad=88)
        print(f"amapola {i + 1}/{n}", flush=True)
    guardar_json(SALIDA / "amapola" / "meta.json", {"n": n, "ancho": ANCHO, "alto": ALTO})


if __name__ == "__main__":
    main()
