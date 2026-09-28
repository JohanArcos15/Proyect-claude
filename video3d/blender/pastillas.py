"""Plano de producto: medicamentos sobre acrílico negro, con dos enfoques.

«fondo»: todo el conjunto nítido (f/8); «heroe»: foco en la cápsula de
opioide del primer plano (f/1.6) para el cambio de foco de la composición.
Unidades: 1 u = 1 cm.
Uso: python3 pastillas.py [spp] [escala_resolucion]
"""
import random
import sys
import numpy as np
from comun import *

ANCHO, ALTO = 2304, 1296


def capsula_malla(nombre, largo, radio, mat, seg=48, anillos=16):
    """Media cápsula (cilindro + hemisferio), eje +X desde el origen."""
    verts, caras = [], []
    perfil = []
    for i in range(anillos + 1):
        a = math.pi / 2 * i / anillos
        perfil.append((largo / 2 + radio * math.sin(a), radio * math.cos(a)))
    perfil = [(0.0, radio)] + perfil
    for j, (x, r) in enumerate(perfil):
        for k in range(seg):
            t = 2 * math.pi * k / seg
            verts.append((x, r * math.cos(t), r * math.sin(t)))
    n = len(perfil)
    for j in range(n - 1):
        for k in range(seg):
            a, b = j * seg + k, j * seg + (k + 1) % seg
            caras.append((a, b, b + seg, a + seg))
    return malla(nombre, verts, caras, material_=mat)


def capsula(nombre, pos, rot, c1, c2, largo=2.15, radio=0.38):
    raiz = bpy.data.objects.new(nombre, None)
    bpy.context.scene.collection.objects.link(raiz)
    m1 = material(nombre + "_a", c1, rugosidad=0.12, capa=0.7, capa_rug=0.05)
    m2 = material(nombre + "_b", c2, rugosidad=0.12, capa=0.7, capa_rug=0.05)
    a = capsula_malla(nombre + "_cuerpo", largo * 0.55, radio, m1)
    b = capsula_malla(nombre + "_tapa", largo * 0.5, radio * 1.035, m2)
    b.rotation_euler = (0, 0, math.pi)
    b.location = (0.08, 0, 0)
    for o in (a, b):
        o.parent = raiz
        s = o.modifiers.new("s", "SUBSURF"); s.render_levels = 1
    raiz.location = pos
    raiz.rotation_euler = rot
    return raiz


def comprimido(nombre, pos, rot, color, radio=0.5, grosor=0.26, ovalo=1.0, rug=0.5, ranura=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radio, depth=grosor, location=pos)
    o = bpy.context.object; o.name = nombre
    o.scale = (ovalo, 1, 1)
    bv = o.modifiers.new("bisel", "BEVEL"); bv.width = grosor * 0.42; bv.segments = 8; bv.limit_method = "ANGLE"
    o.modifiers.new("s", "SUBSURF").render_levels = 1
    o.data.shade_smooth()
    o.data.materials.append(material(nombre, color, rugosidad=rug, sss=0.15, sss_radio=(1, 1, 1), sss_escala=0.03, capa=0.15 if rug < 0.45 else 0.0))
    o.rotation_euler = rot
    return o


def perla(nombre, pos, rot, color):
    o = esfera(nombre, pos, 1.0, material(nombre, color, rugosidad=0.04, transmision=1.0, ior=1.47, capa=0.4), seg=64, anillos=32)
    o.scale = (0.62, 0.36, 0.36)
    o.rotation_euler = rot
    return o


def main():
    spp = int(sys.argv[1]) if len(sys.argv) > 1 else 64
    esc = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    # Diafragmas a escala: la escena está en centímetros y Blender asume metros,
    # así que f/0.02 equivale a una macro muy abierta (foco en la cápsula).
    for version, (foco, fstop) in {"fondo": (None, 0.12), "heroe": (None, 0.02)}.items():
        random.seed(20)
        sc = reiniciar()
        motor(sc, int(ANCHO * esc), int(ALTO * esc), spp=spp, umbral=0.015)
        mundo(sc, degradado=((0.05, 0.045, 0.07), (0.004, 0.003, 0.006)), fuerza=1.0)
        suelo = material("acrilico", (0.012, 0.011, 0.016), rugosidad=0.16, capa=1.0, capa_rug=0.02)
        bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
        bpy.context.object.data.materials.append(suelo)
        # Distribución sin solapes (muestreo de Poisson sencillo)
        colores_caps = [((0.1, 0.32, 0.85), (0.93, 0.93, 0.95)), ((0.82, 0.12, 0.1), (0.98, 0.78, 0.15)),
                        ((0.1, 0.55, 0.38), (0.93, 0.93, 0.93)), ((0.95, 0.45, 0.08), (0.96, 0.95, 0.92)),
                        ((0.2, 0.2, 0.25), (0.75, 0.1, 0.3))]
        colores_comp = [(0.93, 0.93, 0.92), (0.95, 0.72, 0.78), (0.98, 0.86, 0.35), (0.62, 0.78, 0.95), (0.93, 0.93, 0.92)]
        puestos = [(0.0, -3.2)]
        capsula("heroe", (0.0, -3.2, 0.38), (0, 0, math.radians(-18)), (0.62, 0.45, 0.95), (0.95, 0.94, 0.98))
        intentos = 0
        while len(puestos) < 58 and intentos < 5000:
            intentos += 1
            x, y = random.uniform(-15, 15), random.uniform(-6.5, 14)
            if any((x - a) ** 2 + (y - b) ** 2 < 2.6 ** 2 for a, b in puestos):
                continue
            if abs(x) > 6 + (y + 6) * 0.8:
                continue
            puestos.append((x, y))
            tipo = random.random()
            rz = random.uniform(0, math.pi)
            k = len(puestos)
            if tipo < 0.42:
                c1, c2 = random.choice(colores_caps)
                capsula(f"cap{k}", (x, y, 0.38), (0, 0, rz), c1, c2)
            elif tipo < 0.8:
                ov = random.choice([1.0, 1.0, 1.55])
                comprimido(f"com{k}", (x, y, 0.13), (0, 0, rz), random.choice(colores_comp), ovalo=ov,
                           rug=random.choice([0.55, 0.3]))
            else:
                perla(f"perla{k}", (x, y, 0.36), (0, 0, rz), random.choice([(0.95, 0.62, 0.12), (0.98, 0.85, 0.3)]))
        luz_area("caja", (-2, 20, 12), (0, 4, 0), energia=5200, tam=18, tam_y=4, color=(1.0, 0.97, 0.93))
        luz_area("clave", (-17, 3, 10), (0, -2, 0), energia=2400, tam=6, tam_y=4, forma="ELLIPSE", color=(1.0, 0.95, 0.9))
        luz_area("acento", (16, 1, 4), (0, -2, 0.4), energia=1100, tam=4, forma="DISK", color=(0.62, 0.45, 1.0))
        cam = camara((1.2, -16.5, 3.4), (0.0, -1.0, 0.35), lente=85, sensor=36)
        d_heroe = (V((0.0, -3.2, 0.38)) - cam.location).length
        cam.data.dof.use_dof = True
        cam.data.dof.focus_distance = d_heroe if version == "heroe" else d_heroe + 6
        cam.data.dof.aperture_fstop = fstop
        png = render(sc, TMP / "pastillas" / f"{version}.png")
        a_webp(png, SALIDA / "pastillas" / f"{version}.webp", calidad=88)
        guardar_json(SALIDA / "pastillas" / "meta.json", {"ancho": ANCHO, "alto": ALTO, "heroe": proyectar(sc, cam, [(0.0, -3.2, 0.38)])[0]})
        print("pastillas", version, flush=True)


if __name__ == "__main__":
    main()
