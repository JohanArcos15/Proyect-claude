"""Cerebro humano real (superficie pial fsaverage5, FreeSurfer) en rotación.

Dos versiones sincronizadas: «tejido» (dispersión subsuperficial, surcos
oscurecidos con la profundidad sulcal real) y «rayosx» (holográfica, para ver
las regiones profundas). El cerebelo, el tronco encefálico y la médula se
modelan de forma procedural en coordenadas MNI aproximadas.

Exporta, por fotograma, la proyección en pantalla de las regiones con
receptores opioides para que la composición dibuje los brillos y etiquetas.

Uso: python3 cerebro.py [tejido|rayosx|ambos] [n_fotogramas] [spp]
"""
import sys
import numpy as np
from comun import *

ESC = 0.01  # mm → unidades (1 u = 10 cm)
# Coordenadas MNI aproximadas (mm) de las regiones
REGIONES = {
    "talamo": (-11, -18, 7), "sgpa": (0, -30, -8), "atv": (-3, -17, -13),
    "lc": (-5, -37, -26), "bulbo": (0, -40, -50), "medula": (0, -44, -115),
}
ANCHO, ALTO = 1280, 1080


def construir(modo):
    d = np.load(RAIZ / "video3d/datos/cerebro.npz")
    raiz = bpy.data.objects.new("cerebro", None)
    bpy.context.scene.collection.objects.link(raiz)

    if modo == "tejido":
        corteza = bpy.data.materials.new("corteza"); corteza.use_nodes = True
        nt = corteza.node_tree; b = nt.nodes["Principled BSDF"]
        attr = nt.nodes.new("ShaderNodeAttribute"); attr.attribute_name = "sulc"
        rampa = nt.nodes.new("ShaderNodeValToRGB")
        rampa.color_ramp.elements[0].position = 0.25
        rampa.color_ramp.elements[0].color = (0.64, 0.38, 0.36, 1)
        rampa.color_ramp.elements[1].position = 0.85
        rampa.color_ramp.elements[1].color = (0.30, 0.11, 0.12, 1)
        nt.links.new(attr.outputs["Fac"], rampa.inputs["Fac"])
        nt.links.new(rampa.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.38
        b.inputs["Subsurface Weight"].default_value = 0.3
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.25)
        b.inputs["Subsurface Scale"].default_value = 0.02
        b.inputs["Coat Weight"].default_value = 0.14
        b.inputs["Coat Roughness"].default_value = 0.18
        resto = material("tronco", (0.66, 0.44, 0.41), rugosidad=0.42, sss=0.3, sss_radio=(1, 0.35, 0.25), sss_escala=0.02, capa=0.14)
        cerebelo_m = resto
    else:
        corteza = material_rayos_x("corteza_x", (0.32, 0.62, 1.0), fuerza=2.4, base=0.03, exponente=2.4)
        resto = material_rayos_x("tronco_x", (0.62, 0.52, 1.0), fuerza=2.2, base=0.05, exponente=2.0)
        cerebelo_m = material_rayos_x("cerebelo_x", (0.36, 0.58, 1.0), fuerza=2.0, base=0.03, exponente=2.4)

    for lado in ("left", "right"):
        v = d[f"v_{lado}"] * ESC
        o = malla(f"corteza_{lado}", v, d[f"f_{lado}"], material_=corteza)
        s = d[f"sulc_{lado}"]
        s = np.clip((s - np.percentile(s, 5)) / (np.percentile(s, 95) - np.percentile(s, 5)), 0, 1)
        at = o.data.color_attributes.new("sulc", "FLOAT_COLOR", "POINT")
        at.data.foreach_set("color", np.repeat(s, 4).astype(np.float32))
        sub = o.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
        o.parent = raiz

    # Cerebelo: dos hemisferios y vermis, con folias transversales
    nu, nv = 320, 160
    th = np.linspace(0, np.pi, nv)[:, None]
    ph = np.linspace(0, 2 * np.pi, nu, endpoint=False)[None, :]
    x = np.sin(th) * np.cos(ph); y = np.sin(th) * np.sin(ph); z = np.cos(th) * np.ones_like(ph)
    r = 1 + 0.03 * np.cos(2 * ph)
    r = r - 0.11 * np.exp(-(x / 0.12) ** 2) * (y < 0.2)                   # surco del vermis
    folia = np.abs(np.sin(z * 26 + 1.2 * x ** 2)) ** 0.6
    r = r - 0.035 * (1 - folia) * np.sin(th) ** 0.5
    X = (x * r * 0.5).ravel(); Y = (y * r * 0.27 - 0.63).ravel(); Z = (z * r * 0.21 - 0.35).ravel()
    verts = np.stack([X, Y, Z], 1)
    idx = np.arange(nv * nu).reshape(nv, nu)
    caras = np.stack([idx[:-1, :], idx[:-1, np.r_[1:nu, 0]], idx[1:, np.r_[1:nu, 0]], idx[1:, :]], -1).reshape(-1, 4)
    cb = malla("cerebelo", verts, caras, material_=cerebelo_m)
    cb.parent = raiz

    # Tronco encefálico y médula (curva con radios variables)
    pts = [(0, -18, 2), (0, -22, -12), (0, -22, -26), (0, -27, -38), (0, -36, -52), (0, -41, -66),
           (0, -44, -90), (0, -44, -130), (0, -42, -190)]
    rad = [1.55, 1.6, 1.95, 1.8, 1.2, 1.0, 0.72, 0.62, 0.6]
    t = tubo_curva("tronco", [tuple(c * ESC for c in p) for p in pts], 0.1, resto, radios=rad, resolucion=12, bisel=8)
    t.parent = raiz
    return raiz


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "ambos"
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    spp = int(sys.argv[3]) if len(sys.argv) > 3 else 32
    modos = ["tejido", "rayosx"] if modo == "ambos" else [modo]
    angulos = [-22 + 48 * i / max(1, n - 1) for i in range(n)]
    for m in modos:
        sc = reiniciar()
        motor(sc, ANCHO, ALTO, spp=spp, transparente=True, umbral=0.04)
        mundo(sc, degradado=((0.12, 0.13, 0.2), (0.01, 0.01, 0.02)), fuerza=0.5)
        raiz = construir(m)
        if m == "tejido":
            luz_area("clave", (-2.5, 2.2, 2.6), energia=210, tam=2.4, tam_y=1.6, forma="ELLIPSE", color=(1.0, 0.95, 0.9))
            luz_area("relleno", (-3.0, -2.5, -0.4), energia=90, tam=3.5, forma="DISK", color=(0.7, 0.8, 1.0))
            luz_area("contra", (2.4, -1.5, 2.2), energia=260, tam=1.6, forma="DISK", color=(0.65, 0.75, 1.0))
        cam = camara((-3.55, 1.25, 0.95), (0, -0.18, -0.2), lente=50)
        marcadores = {k: bpy.data.objects.new("m_" + k, None) for k in REGIONES}
        for k, p in REGIONES.items():
            bpy.context.scene.collection.objects.link(marcadores[k])
            marcadores[k].location = tuple(c * ESC for c in p)
            marcadores[k].parent = raiz
        proy = []
        for i, ang in enumerate(angulos):
            raiz.rotation_euler = (0, 0, math.radians(ang))
            bpy.context.view_layer.update()
            proy.append(proyectar(sc, cam, [marcadores[k].matrix_world.translation for k in REGIONES]))
            png = render(sc, TMP / f"cerebro_{m}" / f"{i:03d}.png")
            a_webp(png, SALIDA / f"cerebro_{m}" / f"{i:03d}.webp", calidad=86)
            print(f"cerebro {m} {i + 1}/{n}", flush=True)
        guardar_json(SALIDA / f"cerebro_{m}" / "meta.json",
                     {"n": n, "angulos": angulos, "ancho": ANCHO, "alto": ALTO, "regiones": list(REGIONES), "proyecciones": proy})


if __name__ == "__main__":
    main()
