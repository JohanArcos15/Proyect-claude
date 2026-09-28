"""Neuronas procedurales fotorrealistas.

- «red»: neurona protagonista enfocada y varias al fondo desenfocadas, con
  partículas luminosas (plano 16:9 para planos con movimiento de cámara).
- «sola»: una neurona sobre fondo transparente (para el circuito).
Unidades: 1 u = 10 µm. Uso: python3 neurona.py [red|sola|ambas] [spp] [escala]
"""
import random
import sys
import numpy as np
from comun import *


def material_neurona(nombre, color, emision):
    m = material(nombre, color, rugosidad=0.35, sss=0.65, sss_radio=(1.0, 0.6, 1.0), sss_escala=0.25, capa=0.2)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    # Brillo interno más intenso cerca del soma (coordenadas del objeto)
    coord = nt.nodes.new("ShaderNodeTexCoord"); largo = nt.nodes.new("ShaderNodeVectorMath"); largo.operation = "LENGTH"
    mapa = nt.nodes.new("ShaderNodeMapRange"); mapa.inputs["From Min"].default_value = 0.0; mapa.inputs["From Max"].default_value = 3.0
    mapa.inputs["To Min"].default_value = 1.6; mapa.inputs["To Max"].default_value = 0.1
    nt.links.new(coord.outputs["Object"], largo.inputs[0]); nt.links.new(largo.outputs["Value"], mapa.inputs["Value"])
    b.inputs["Emission Color"].default_value = (*emision, 1)
    nt.links.new(mapa.outputs["Result"], b.inputs["Emission Strength"])
    ruido = nt.nodes.new("ShaderNodeTexNoise"); ruido.inputs["Scale"].default_value = 18; ruido.inputs["Detail"].default_value = 6
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    nt.links.new(ruido.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def neurona(nombre, centro, mat, semilla, escala=1.0, largo_axon=9.0, dir_axon=(1, 0, 0)):
    rnd = random.Random(semilla)
    raiz = bpy.data.objects.new(nombre, None); bpy.context.scene.collection.objects.link(raiz)
    raiz.location = centro; raiz.scale = (escala,) * 3
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=0.55, location=(0, 0, 0))
    soma = bpy.context.object; soma.name = nombre + "_soma"; soma.scale = (1.15, 1.0, 0.92)
    tex = bpy.data.textures.new(nombre + "_t", "CLOUDS"); tex.noise_scale = 0.35
    dm = soma.modifiers.new("d", "DISPLACE"); dm.texture = tex; dm.strength = 0.18
    soma.modifiers.new("s", "SUBSURF").render_levels = 1
    soma.data.shade_smooth(); soma.data.materials.append(mat); soma.parent = raiz

    def rama(origen, direccion, largo, radio, nivel):
        pts, rads = [origen], [radio]
        p, d = V(origen), V(direccion).normalized()
        pasos = 7
        for i in range(pasos):
            d = (d + V((rnd.uniform(-.35, .35), rnd.uniform(-.35, .35), rnd.uniform(-.25, .25)))).normalized()
            p = p + d * (largo / pasos)
            pts.append(tuple(p)); rads.append(radio * (1 - 0.55 * (i + 1) / pasos))
        tubo_curva(f"{nombre}_r{nivel}_{rnd.randint(0, 99999)}", pts, 1.0, mat, radios=rads, resolucion=4, bisel=4).parent = raiz
        if nivel < 3:
            for _ in range(2):
                giro = V((rnd.uniform(-.8, .8), rnd.uniform(-.8, .8), rnd.uniform(-.5, .5)))
                rama(tuple(p), (d + giro).normalized(), largo * rnd.uniform(0.5, 0.7), rads[-1] * 0.85, nivel + 1)

    n_dend = 7
    for k in range(n_dend):
        a = 2 * math.pi * k / n_dend + rnd.uniform(-0.3, 0.3)
        d = V((math.cos(a), math.sin(a), rnd.uniform(-0.45, 0.45))).normalized()
        if d.dot(V(dir_axon)) > 0.8:
            continue
        rama(tuple(d * 0.45), tuple(d), rnd.uniform(2.2, 3.2), 0.16, 0)
    # Axón con cono axónico y terminales
    da = V(dir_axon).normalized()
    pts = [tuple(da * 0.45)]
    p = da * 0.45
    for i in range(10):
        p = p + (da + V((0, rnd.uniform(-.12, .12), rnd.uniform(-.12, .12)))) * (largo_axon / 10)
        pts.append(tuple(p))
    tubo_curva(nombre + "_axon", pts, 1.0, mat, radios=[0.2, 0.12] + [0.09] * 9, resolucion=6, bisel=4).parent = raiz
    for k in range(4):
        dd = (da + V((0, rnd.uniform(-.9, .9), rnd.uniform(-.9, .9)))).normalized()
        q = V(pts[-1]) + dd * 1.2
        tubo_curva(f"{nombre}_term{k}", [pts[-1], tuple((V(pts[-1]) + q) / 2 + V((0, 0, 0.1))), tuple(q)], 1.0, mat, radios=[0.07, 0.06, 0.05]).parent = raiz
        esfera(f"{nombre}_boton{k}", tuple(q), 0.13, mat, seg=24, anillos=12).parent = raiz
    return raiz


def particulas(n, caja, semilla, fuerza=8.0):
    rnd = random.Random(semilla)
    m = material("chispa", (1, 0.8, 0.5), emision=(1.0, 0.72, 0.4), fuerza_emision=fuerza)
    for i in range(n):
        p = tuple(rnd.uniform(a, b) for a, b in caja)
        esfera(f"chispa{i}", p, rnd.uniform(0.05, 0.12), m, seg=16, anillos=8)


def main():
    cual = sys.argv[1] if len(sys.argv) > 1 else "ambas"
    spp = int(sys.argv[2]) if len(sys.argv) > 2 else 40
    esc = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    if cual in ("red", "ambas"):
        sc = reiniciar()
        motor(sc, int(2304 * esc), int(1296 * esc), spp=spp, umbral=0.03)
        mundo(sc, degradado=((0.03, 0.05, 0.12), (0.004, 0.006, 0.016)), fuerza=1.0)
        mat = material_neurona("neurona", (0.6, 0.42, 0.98), (1.0, 0.55, 0.85))
        mat_f = material_neurona("neurona_f", (0.32, 0.45, 0.9), (0.25, 0.45, 1.0))
        neurona("heroe", (-1.2, 0, 0), mat, 7, 1.0, 10, (1, 0.15, -0.05))
        for i, (c, s) in enumerate([((-7, 9, 2.5), 1.1), ((6, 12, -2), 1.3), ((-11, 16, -4), 1.2), ((9, 6, 3.5), 0.9),
                                    ((2, 20, 5), 1.4), ((-4, -3, -3.5), 0.7)]):
            neurona(f"fondo{i}", c, mat_f, 30 + i, s, 8, (math.cos(i * 1.7), math.sin(i * 1.7), 0))
        particulas(70, ((-16, 16), (-4, 26), (-8, 8)), 3, fuerza=5.0)
        luz_area("clave", (-6, -8, 7), (0, 0, 0), energia=900, tam=6, forma="DISK", color=(1.0, 0.92, 0.85))
        luz_area("contra", (5, 10, 6), (0, 0, 0), energia=1500, tam=4, forma="DISK", color=(0.55, 0.7, 1.0))
        cam = camara((0.2, -8.2, 1.3), (0.4, 0, -0.1), lente=40)
        cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (V((-1.2, 0, 0)) - cam.location).length; cam.data.dof.aperture_fstop = 0.06
        png = render(sc, TMP / "neurona" / "red.png")
        a_webp(png, SALIDA / "neurona" / "red.webp", calidad=88)
        guardar_json(SALIDA / "neurona" / "meta.json", {"ancho": 2304, "alto": 1296,
                     "membrana": proyectar(sc, cam, [(1.9, 0.45, 0.1)])[0], "soma": proyectar(sc, cam, [(-1.2, 0, 0)])[0]})
        print("neurona red", flush=True)
    if cual in ("sola", "ambas"):
        sc = reiniciar()
        motor(sc, int(1400 * esc), int(900 * esc), spp=spp, transparente=True, umbral=0.03)
        mundo(sc, degradado=((0.05, 0.06, 0.1), (0.01, 0.01, 0.02)), fuerza=0.8)
        mat = material_neurona("neurona", (0.92, 0.9, 0.95), (1.0, 0.95, 1.0))
        neurona("sola", (-2.5, 0, 0), mat, 7, 1.0, 7, (1, 0.1, 0))
        luz_area("clave", (-6, -8, 7), (0, 0, 0), energia=800, tam=6, forma="DISK")
        luz_area("contra", (5, 10, 6), (0, 0, 0), energia=1200, tam=4, forma="DISK")
        camara((0.3, -21, 0.4), (0.4, 0, -0.3), lente=45)
        png = render(sc, TMP / "neurona" / "sola.png")
        a_webp(png, SALIDA / "neurona" / "sola.webp", calidad=88)
        print("neurona sola", flush=True)


if __name__ == "__main__":
    main()
