"""Bicapa lipídica con un receptor opioide (GPCR) y su proteína G.

- Bicapa: fosfolípidos (cabeza + dos colas) en dos hemicapas; ~5 nm de grosor.
- Receptor: 7 hélices transmembrana en representación de cintas (paso de
  0,54 nm y 3,6 residuos por vuelta), bucles extra/intracelulares, hélice 8.
  Es un modelo esquemático de la topología de un GPCR de clase A, no una
  estructura cristalográfica.
- Proteína G heterotrimérica (Gα, Gβ, Gγ) como superficies moleculares.
- Morfina (conformación MMFF real, a escala) en el bolsillo de unión.
Cuatro variantes de color: mu, delta, kappa, nop. Unidades: 1 u = 1 nm.
Uso: python3 membrana.py [variantes,...] [spp] [escala]
"""
import json
import random
import sys
import numpy as np
from comun import *

ANCHO, ALTO = 2304, 1296
COLORES = {"mu": (1.0, 0.36, 0.28), "delta": (0.98, 0.72, 0.16), "kappa": (0.12, 0.78, 0.66), "nop": (0.62, 0.48, 1.0)}
CENTROS = [(1.35, 0.35), (0.55, 1.45), (-0.75, 1.3), (-1.45, 0.25), (-1.05, -1.05), (0.25, -1.45), (1.3, -0.85)]
INCL = [(12, 20), (-8, 14), (15, -10), (-12, -18), (10, 16), (-14, 8), (9, -16)]


def fusionar(piezas):
    vs, fs, off = [], [], 0
    for v, f in piezas:
        vs.append(v); fs.append(f + off); off += len(v)
    return np.concatenate(vs), np.concatenate(fs)


def esfera_np(n1=10, n2=7):
    th = np.linspace(0, np.pi, n2)[:, None]; ph = np.linspace(0, 2 * np.pi, n1, endpoint=False)[None, :]
    v = np.stack([(np.sin(th) * np.cos(ph)).ravel(), (np.sin(th) * np.sin(ph)).ravel(), (np.cos(th) * np.ones_like(ph)).ravel()], 1)
    idx = np.arange(n2 * n1).reshape(n2, n1)
    f = np.stack([idx[:-1, :], idx[:-1, np.r_[1:n1, 0]], idx[1:, np.r_[1:n1, 0]], idx[1:, :]], -1).reshape(-1, 4)
    return v, f


def tubo_np(puntos, radio, lados=6):
    pts = np.asarray(puntos, float)
    t = np.gradient(pts, axis=0); t /= np.linalg.norm(t, axis=1, keepdims=True)
    a = np.cross(t, [1, 0, 0]); a[np.linalg.norm(a, axis=1) < 1e-3] = [0, 1, 0]
    a /= np.linalg.norm(a, axis=1, keepdims=True); b = np.cross(t, a)
    ang = np.linspace(0, 2 * np.pi, lados, endpoint=False)
    v = (pts[:, None, :] + radio * (np.cos(ang)[None, :, None] * a[:, None, :] + np.sin(ang)[None, :, None] * b[:, None, :])).reshape(-1, 3)
    n = len(pts); idx = np.arange(n * lados).reshape(n, lados)
    f = np.stack([idx[:-1, :], idx[:-1, np.r_[1:lados, 0]], idx[1:, np.r_[1:lados, 0]], idx[1:, :]], -1).reshape(-1, 4)
    return v, f


def bicapa(hueco=2.4, ext=(22, 14), corte=-0.4, semilla=5):
    rnd = np.random.default_rng(semilla)
    ev, ef = esfera_np()
    cabezas, colas = [], []
    paso = 0.82
    for hoja, zc in ((1, 2.25), (-1, -2.25)):
        for i, x in enumerate(np.arange(-ext[0], ext[0], paso)):
            for y in np.arange(-ext[1], ext[1], paso * 0.866):
                xx = x + (paso / 2 if round(y / (paso * 0.866)) % 2 else 0) + rnd.normal(0, 0.08)
                yy = y + rnd.normal(0, 0.08)
                if xx * xx + yy * yy < hueco * hueco or yy < corte:
                    continue
                z = zc + rnd.normal(0, 0.06)
                cabezas.append((ev * 0.42 + [xx, yy, z], ef))
                for dx in (-0.17, 0.17):
                    fase = rnd.uniform(0, 6.28)
                    pts = [(xx + dx + 0.06 * math.sin(fase + k * 1.3), yy + 0.06 * math.cos(fase + k * 1.1), z - hoja * (0.35 + 0.28 * k)) for k in range(7)]
                    colas.append(tubo_np(pts, 0.07, 6))
    return fusionar(cabezas), fusionar(colas)


def cinta_helice(centro, incl, z0=-2.3, z1=2.3, radio=0.23, ancho=0.4, grosor=0.1):
    """Cinta helicoidal (α-hélice) a lo largo de un eje inclinado."""
    n_res = int((z1 - z0) / 0.15)
    s = np.linspace(0, n_res, n_res * 8)
    ang = np.radians(100) * s
    eje = np.array([math.sin(math.radians(incl[0])), math.sin(math.radians(incl[1])), 1.0]); eje /= np.linalg.norm(eje)
    u = np.cross(eje, [0, 0, 1.0]) if abs(eje[2]) < 0.999 else np.array([1.0, 0, 0])
    if np.linalg.norm(u) < 1e-6:
        u = np.array([1.0, 0, 0])
    u /= np.linalg.norm(u); w = np.cross(eje, u)
    c = np.array([centro[0], centro[1], 0.0]) + np.outer(z0 + (z1 - z0) * s / n_res, eje)
    radial = np.cos(ang)[:, None] * u + np.sin(ang)[:, None] * w
    p = c + radio * radial
    t = np.gradient(p, axis=0); t /= np.linalg.norm(t, axis=1, keepdims=True)
    bn = np.cross(t, radial); bn /= np.linalg.norm(bn, axis=1, keepdims=True)
    esquinas = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    v = np.concatenate([p + ex * ancho / 2 * bn + ey * grosor / 2 * radial for ex, ey in esquinas], 0)
    n = len(p)
    f = []
    for k in range(4):
        a0, b0 = k * n, ((k + 1) % 4) * n
        for i in range(n - 1):
            f.append((a0 + i, a0 + i + 1, b0 + i + 1, b0 + i))
    return v, np.array(f), c[0], c[-1]


def receptor(color):
    mat = material("receptor", color, rugosidad=0.3, sss=0.25, sss_radio=(1, 0.6, 0.5), sss_escala=0.1, capa=0.6, capa_rug=0.08)
    piezas, extremos = [], []
    for i, (c, inc) in enumerate(zip(CENTROS, INCL)):
        signo = 1 if i % 2 == 0 else -1  # TM1 baja (N-terminal fuera), TM2 sube, ...
        v, f, a, b = cinta_helice(c, inc)
        piezas.append((v, f))
        extremos.append((b, a) if signo > 0 else (a, b))   # (arriba, abajo) según recorrido
    v, f = fusionar(piezas)
    o = malla("helices", v, f, material_=mat)
    o.modifiers.new("s", "SUBSURF").render_levels = 1
    # Bucles: TM(i) termina y TM(i+1) empieza en el mismo lado
    mat_b = material("bucles", tuple(0.75 * x + 0.2 for x in color), rugosidad=0.35, capa=0.5)
    recorrido = []
    for i, (c, inc) in enumerate(zip(CENTROS, INCL)):
        _, _, bajo, alto = cinta_helice(c, inc)
        recorrido.append((alto, bajo) if i % 2 == 0 else (bajo, alto))
    for i in range(6):
        fin, ini = recorrido[i][1], recorrido[i + 1][0]
        arriba = fin[2] > 0
        medio = (fin + ini) / 2 + np.array([0, 0, (0.8 if arriba else -0.8) * (1.5 if i == 3 else 1.0)])
        medio[:2] *= 1.25
        tubo_curva(f"bucle{i}", [tuple(fin), tuple((fin + medio) / 2 + [0, 0, 0.2 if arriba else -0.2]), tuple(medio),
                                  tuple((ini + medio) / 2), tuple(ini)], 0.09, mat_b, resolucion=10)
    ini = recorrido[0][0]
    tubo_curva("nterm", [tuple(ini), tuple(ini + [0.5, 0.3, 0.6]), tuple(ini + [1.2, 0.1, 0.9]), tuple(ini + [1.8, -0.5, 1.2])], 0.09, mat_b)
    fin = recorrido[6][1]
    v8, f8, _, _ = cinta_helice((fin[0] + 1.6, fin[1] - 0.2), (82, 0), z0=-0.7, z1=0.7)
    v8 = v8 + [0, 0, fin[2] - 0.4]
    malla("helice8", v8, f8, material_=mat).modifiers.new("s", "SUBSURF").render_levels = 1
    tubo_curva("cterm", [tuple(fin), tuple(fin + [0.5, 0.0, -0.3]), tuple(fin + [0.9, -0.1, -0.4])], 0.09, mat_b)
    return mat


def proteina_g(color):
    """Superficies moleculares aproximadas con metabolas."""
    mb = bpy.data.metaballs.new("proteinaG"); mb.resolution = 0.12; mb.render_resolution = 0.07; mb.threshold = 0.45
    rnd = random.Random(2)
    def nube(centro, radio, n, dispersion):
        for _ in range(n):
            e = mb.elements.new(); e.radius = radio * rnd.uniform(0.7, 1.1)
            e.co = tuple(c + max(-1.6 * s, min(1.6 * s, rnd.gauss(0, s))) for c, s in zip(centro, dispersion))
    nube((0.3, 0.0, -4.4), 1.1, 34, (0.75, 0.65, 0.5))    # Gα (dominio GTPasa)
    nube((-1.4, 0.6, -4.1), 0.95, 18, (0.5, 0.45, 0.5))   # Gα (dominio helicoidal)
    nube((1.9, -0.6, -6.0), 1.1, 34, (0.8, 0.8, 0.4))     # Gβ (hélice β de 7 hojas)
    nube((2.9, 0.4, -5.0), 0.7, 12, (0.6, 0.25, 0.25))    # Gγ
    o = bpy.data.objects.new("proteinaG", mb); bpy.context.scene.collection.objects.link(o)
    m = material("gprot", (0.6, 0.56, 0.78), rugosidad=0.45, sss=0.3, sss_escala=0.2, capa=0.3)
    ruido = m.node_tree.nodes.new("ShaderNodeTexNoise"); ruido.inputs["Scale"].default_value = 4; ruido.inputs["Detail"].default_value = 10
    bump = m.node_tree.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    m.node_tree.links.new(ruido.outputs["Fac"], bump.inputs["Height"])
    m.node_tree.links.new(bump.outputs["Normal"], m.node_tree.nodes["Principled BSDF"].inputs["Normal"])
    mb.materials.append(m)


def ligando():
    mols = json.loads((RAIZ / "assets/3d/moleculas3d.json").read_text())
    m = next(x for x in mols if x["id"] == "morfina")
    cols = {"C": (0.1, 0.1, 0.11), "O": (0.8, 0.05, 0.04), "N": (0.05, 0.18, 0.88), "H": (0.88, 0.88, 0.9)}
    mats = {k: material("lig_" + k, c, rugosidad=0.25, capa=1.0) for k, c in cols.items()}
    base = V((0.0, 0.1, 1.2))
    for a in m["atoms"]:
        p = base + V((a["x"], a["y"], a["z"])) * 0.1
        esfera("lig", tuple(p), 0.05 if a["el"] == "H" else 0.075, mats[a["el"]], seg=20, anillos=10)
    for b in m["bonds"]:
        pa = m["atoms"][b["a"]]; pb = m["atoms"][b["b"]]
        cilindro_entre("enl", base + V((pa["x"], pa["y"], pa["z"])) * 0.1, base + V((pb["x"], pb["y"], pb["z"])) * 0.1, 0.022, mats["C"], verts=10)


def main():
    variantes = sys.argv[1].split(",") if len(sys.argv) > 1 else list(COLORES)
    spp = int(sys.argv[2]) if len(sys.argv) > 2 else 32
    esc = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    for var in variantes:
        sc = reiniciar()
        motor(sc, int(ANCHO * esc), int(ALTO * esc), spp=spp, umbral=0.03)
        mundo(sc, degradado=((0.05, 0.08, 0.16), (0.005, 0.008, 0.02)), fuerza=1.0)
        (hv, hf), (tv, tf) = bicapa()
        cab = material("cabezas", (0.84, 0.8, 0.9), rugosidad=0.28, sss=0.3, sss_escala=0.1, capa=0.4)
        col = material("colas", (0.78, 0.6, 0.3), rugosidad=0.4, sss=0.2, sss_escala=0.05)
        malla("cabezas", hv, hf, material_=cab)
        malla("colas", tv, tf, material_=col)
        receptor(COLORES[var])
        proteina_g(COLORES[var])
        ligando()
        luz_area("clave", (-9, -12, 12), (0, 0, 0), energia=5200, tam=8, forma="DISK", color=(1.0, 0.95, 0.9))
        luz_area("contra", (6, 14, 8), (0, 0, 0), energia=6500, tam=6, forma="DISK", color=(0.55, 0.7, 1.0))
        luz_area("abajo", (4, -12, -10), (0, 0, -5), energia=3000, tam=6, forma="DISK", color=(0.7, 0.55, 1.0))
        cam = camara((8.4, -28, 3.6), (0.3, 0, -1.2), lente=55)
        cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (cam.location - V((0.2, -0.5, -0.5))).length
        cam.data.dof.aperture_fstop = 0.35
        png = render(sc, TMP / "membrana" / f"{var}.png")
        a_webp(png, SALIDA / "membrana" / f"{var}.webp", calidad=88)
        guardar_json(SALIDA / "membrana" / "meta.json", {"ancho": ANCHO, "alto": ALTO,
                     "bolsillo": proyectar(sc, cam, [(0.0, 0.1, 1.2)])[0],
                     "gprot": proyectar(sc, cam, [(0.8, 0.0, -4.8)])[0],
                     "exterior": proyectar(sc, cam, [(0, 0, 4.5)])[0], "interior": proyectar(sc, cam, [(0, 0, -4.5)])[0]})
        print("membrana", var, flush=True)


if __name__ == "__main__":
    main()
