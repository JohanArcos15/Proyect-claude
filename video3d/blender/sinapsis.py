"""Sinapsis química: botón presináptico, hendidura y espina postsináptica.

Membranas translúcidas para ver las vesículas (≈40 nm) cargadas de
neurotransmisor; hendidura de ≈20 nm. Receptores μ (coral) pre y
postsinápticos, canales de Ca²⁺ (naranja) en la zona activa y canales GIRK
(azul) en la membrana postsináptica. Exporta la posición en pantalla de cada
elemento para animar iones y ligandos en la composición.
Unidades: 1 u = 10 nm. Uso: python3 sinapsis.py [spp] [escala]
"""
import random
import sys
import numpy as np
from comun import *

ANCHO, ALTO = 2304, 1296


def membrana_translucida(nombre, color, borde=3.0, base=0.02):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    pr = nt.nodes.new("ShaderNodeBsdfPrincipled")
    pr.inputs["Base Color"].default_value = (*color, 1); pr.inputs["Roughness"].default_value = 0.3
    pr.inputs["Coat Weight"].default_value = 0.5
    pr.inputs["Emission Color"].default_value = (*color, 1); pr.inputs["Emission Strength"].default_value = 0.35
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.45
    pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = borde
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"; ad.inputs[1].default_value = base; ad.use_clamp = True
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lw.outputs["Facing"], pw.inputs[0]); nt.links.new(pw.outputs[0], ad.inputs[0])
    nt.links.new(ad.outputs[0], mix.inputs["Fac"]); nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(pr.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def blob(nombre, centro, escala, mat, semilla, fuerza=0.12, aplanar=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=1, location=(0, 0, 0))
    o = bpy.context.object; o.name = nombre
    v = np.array([vv.co[:] for vv in o.data.vertices])
    rnd = np.random.default_rng(semilla)
    k = rnd.normal(size=(6, 3))
    ruido = sum(0.5 ** i * np.sin(v @ k[i] * (1.5 + i) + i) for i in range(6)) * fuerza
    v = v * (1 + ruido[:, None])
    v = v * np.array(escala)
    if aplanar is not None:   # (eje z, valor): aplana la cara que mira a la hendidura
        lado, zlim = aplanar
        v[:, 2] = np.maximum(v[:, 2], zlim) if lado > 0 else np.minimum(v[:, 2], zlim)
    for vv, p in zip(o.data.vertices, v):
        vv.co = p
    o.location = centro
    o.modifiers.new("s", "SUBSURF").render_levels = 1
    o.data.shade_smooth(); o.data.materials.append(mat)
    return o


def proteina(nombre, pos, color, alto=2.3, radio=0.9, invertida=False):
    mb = bpy.data.metaballs.new(nombre); mb.resolution = 0.2; mb.render_resolution = 0.1; mb.threshold = 0.6
    rnd = random.Random(hash(nombre) % 1000)
    for i in range(10):
        e = mb.elements.new(); e.radius = radio * rnd.uniform(0.7, 1.05)
        z = rnd.uniform(-alto / 2, alto / 2)
        e.co = (rnd.gauss(0, radio * 0.35), rnd.gauss(0, radio * 0.35), -z if invertida else z)
    o = bpy.data.objects.new(nombre, mb); bpy.context.scene.collection.objects.link(o)
    o.location = pos
    mb.materials.append(material(nombre + "_m", color, rugosidad=0.35, sss=0.3, sss_escala=0.2, capa=0.4,
                                 emision=color, fuerza_emision=0.25))
    return o


def main():
    spp = int(sys.argv[1]) if len(sys.argv) > 1 else 40
    esc = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    random.seed(9)
    sc = reiniciar()
    motor(sc, int(ANCHO * esc), int(ALTO * esc), spp=spp, umbral=0.03, rebotes=8)
    mundo(sc, degradado=((0.03, 0.05, 0.11), (0.004, 0.005, 0.014)), fuerza=1.0)
    pre_m = membrana_translucida("pre", (0.62, 0.5, 0.95))
    post_m = membrana_translucida("post", (0.45, 0.6, 1.0))
    blob("boton", (0, 0, 17.0), (19, 15, 16), pre_m, 1, aplanar=(1, -15.9))
    blob("espina", (0, 0, -15.0), (17, 14, 14), post_m, 2, aplanar=(-1, 13.9))
    # Vesículas con neurotransmisor (núcleo emisivo)
    ves_m = membrana_translucida("vesicula", (0.85, 0.8, 1.0), borde=2.2, base=0.03)
    nucleo = material("nt", (1, 0.7, 0.3), emision=(1.0, 0.6, 0.22), fuerza_emision=1.1)
    vesiculas = []
    intentos = 0
    while len(vesiculas) < 34 and intentos < 4000:
        intentos += 1
        p = V((random.uniform(-12, 12), random.uniform(-9, 9), random.uniform(2.6, 14)))
        if (p.x / 15) ** 2 + (p.y / 12) ** 2 + ((p.z - 14) / 13) ** 2 > 1 or any((p - q).length < 4.3 for q in vesiculas):
            continue
        vesiculas.append(p)
        esfera(f"ves{len(vesiculas)}", tuple(p), 2.0, ves_m, seg=32, anillos=16)
        esfera(f"nt{len(vesiculas)}", tuple(p), 1.3, nucleo, seg=16, anillos=8)
    # Proteínas de membrana
    pre_mu = [(-8.5, -3, 1.9), (8.0, -2.5, 1.9)]
    post_mu = [(-6.5, -3.5, -1.9), (6.5, -3.0, -1.9)]
    ca = [(0.0, -4.0, 1.9)]
    girk = [(0.0, -4.0, -1.9)]
    for i, p in enumerate(pre_mu):
        proteina(f"mu_pre{i}", p, (1.0, 0.36, 0.28), invertida=True)
    for i, p in enumerate(post_mu):
        proteina(f"mu_post{i}", p, (1.0, 0.36, 0.28))
    proteina("ca", ca[0], (1.0, 0.5, 0.1), alto=2.6, radio=1.1, invertida=True)
    proteina("girk", girk[0], (0.35, 0.55, 1.0), alto=2.6, radio=1.1)
    for i in range(7):   # receptores de glutamato (densidad postsináptica)
        a = i / 7 * 2 * math.pi
        proteina(f"ampa{i}", (3.2 * math.cos(a) - 1.5, 2.5 * math.sin(a) + 2, -1.8), (0.72, 0.72, 0.8), alto=1.8, radio=0.75)
    luz_area("clave", (-40, -45, 30), (0, 0, 0), energia=90000, tam=25, forma="DISK", color=(1.0, 0.9, 0.82))
    luz_area("contra", (30, 45, 10), (0, 0, 0), energia=120000, tam=20, forma="DISK", color=(0.45, 0.6, 1.0))
    luz_area("hendidura", (-45, -10, 0), (0, 0, 0), energia=25000, tam=10, forma="DISK", color=(0.8, 0.6, 1.0))
    objetivo = (11, 0, 2.0)
    cam = camara((8, -95, 6), objetivo, lente=50)
    cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (cam.location - V((0, -4, 0))).length; cam.data.dof.aperture_fstop = 0.8
    png = render(sc, TMP / "sinapsis" / "sinapsis.png")
    a_webp(png, SALIDA / "sinapsis" / "sinapsis.webp", calidad=88)
    docks = sorted(vesiculas, key=lambda p: p.z)[:4]
    guardar_json(SALIDA / "sinapsis" / "meta.json", {
        "ancho": ANCHO, "alto": ALTO,
        "mu_pre": proyectar(sc, cam, pre_mu), "mu_post": proyectar(sc, cam, post_mu),
        "ca": proyectar(sc, cam, ca), "girk": proyectar(sc, cam, girk),
        "fusion": proyectar(sc, cam, [(p.x, p.y, 1.2) for p in docks]),
        "hendidura": proyectar(sc, cam, [(-22, -4, 0), (0, -4, 0), (22, -4, 0)]),
        "dentro_pre": proyectar(sc, cam, [(0, -4, 6)]), "dentro_post": proyectar(sc, cam, [(0, -4, -6)]),
    })
    print("sinapsis", flush=True)


if __name__ == "__main__":
    main()
