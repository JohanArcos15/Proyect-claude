"""Utilidades comunes para los renders con Blender Cycles (bpy como módulo)."""
import json
import math
import os
from pathlib import Path

import bpy
import mathutils

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "assets" / "3d"
TMP = RAIZ / "build" / "render3d"
V = mathutils.Vector


def reiniciar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def motor(sc, ancho, alto, spp=32, transparente=False, umbral=0.03, rebotes=6):
    r = sc.render
    r.engine = "CYCLES"
    c = sc.cycles
    c.device = "CPU"
    c.samples = spp
    c.use_adaptive_sampling = True
    c.adaptive_threshold = umbral
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.max_bounces = rebotes
    c.diffuse_bounces = 3
    c.glossy_bounces = 4
    c.transmission_bounces = 8
    c.transparent_max_bounces = 16
    c.volume_bounces = 1
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 1.0
    r.resolution_x, r.resolution_y, r.resolution_percentage = ancho, alto, 100
    r.film_transparent = transparente
    r.use_persistent_data = True
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA" if transparente else "RGB"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 15
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    return sc


def mundo(sc, color=(0.01, 0.008, 0.02), fuerza=1.0, degradado=None):
    """Fondo; con `degradado` = ((r,g,b) arriba, (r,g,b) abajo) crea un estudio suave."""
    w = bpy.data.worlds.new("mundo")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    bg.inputs["Strength"].default_value = fuerza
    if degradado:
        coord = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        rampa = nt.nodes.new("ShaderNodeValToRGB")
        rampa.color_ramp.elements[0].position = 0.35
        rampa.color_ramp.elements[0].color = (*degradado[1], 1)
        rampa.color_ramp.elements[1].position = 0.75
        rampa.color_ramp.elements[1].color = (*degradado[0], 1)
        mapa = nt.nodes.new("ShaderNodeMapRange")
        mapa.inputs["From Min"].default_value = -1
        mapa.inputs["From Max"].default_value = 1
        nt.links.new(coord.outputs["Generated"], sep.inputs[0])
        nt.links.new(sep.outputs["Z"], mapa.inputs["Value"])
        nt.links.new(mapa.outputs["Result"], rampa.inputs["Fac"])
        nt.links.new(rampa.outputs["Color"], bg.inputs["Color"])
    else:
        bg.inputs["Color"].default_value = (*color, 1)
    return w


def material(nombre, color=(0.8, 0.8, 0.8), rugosidad=0.4, metal=0.0, capa=0.0, capa_rug=0.05,
             sss=0.0, sss_radio=(1.0, 0.4, 0.2), sss_escala=0.05, transmision=0.0, ior=1.45,
             emision=None, fuerza_emision=0.0, alfa=1.0, brillo_tela=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rugosidad
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = capa
    b.inputs["Coat Roughness"].default_value = capa_rug
    b.inputs["Subsurface Weight"].default_value = sss
    b.inputs["Subsurface Radius"].default_value = sss_radio
    b.inputs["Subsurface Scale"].default_value = sss_escala
    b.inputs["Transmission Weight"].default_value = transmision
    b.inputs["IOR"].default_value = ior
    b.inputs["Alpha"].default_value = alfa
    b.inputs["Sheen Weight"].default_value = brillo_tela
    if emision:
        b.inputs["Emission Color"].default_value = (*emision, 1)
        b.inputs["Emission Strength"].default_value = fuerza_emision
    return m


def material_rayos_x(nombre, color=(0.35, 0.7, 1.0), fuerza=2.0, base=0.04, exponente=2.2):
    """Aspecto holográfico: emisión en los bordes (fresnel) y transparencia en el centro."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = exponente
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"; ad.inputs[1].default_value = base
    cl = nt.nodes.new("ShaderNodeClamp")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = fuerza
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    nt.links.new(pw.outputs[0], ad.inputs[0])
    nt.links.new(ad.outputs[0], cl.inputs[0])
    nt.links.new(cl.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    return m


def luz_area(nombre, pos, objetivo=(0, 0, 0), energia=500, tam=4, color=(1, 1, 1), forma="RECTANGLE", tam_y=None):
    d = bpy.data.lights.new(nombre, "AREA")
    d.energy = energia
    d.color = color
    d.shape = forma
    d.size = tam
    if tam_y:
        d.size_y = tam_y
    o = bpy.data.objects.new(nombre, d)
    bpy.context.scene.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (V(objetivo) - V(pos)).to_track_quat("-Z", "Y").to_euler()
    return o


def camara(pos, objetivo=(0, 0, 0), lente=50, enfoque=None, fstop=2.8, sensor=36):
    d = bpy.data.cameras.new("cam")
    d.lens = lente
    d.sensor_width = sensor
    o = bpy.data.objects.new("cam", d)
    bpy.context.scene.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (V(objetivo) - V(pos)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = o
    if enfoque is not None:
        d.dof.use_dof = True
        d.dof.focus_distance = enfoque
        d.dof.aperture_fstop = fstop
    return o


def malla(nombre, verts, caras, suave=True, material_=None):
    me = bpy.data.meshes.new(nombre)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], [tuple(map(int, f)) for f in caras])
    me.update()
    if suave:
        me.shade_smooth()
    o = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(o)
    if material_:
        me.materials.append(material_)
    return o


def esfera(nombre, pos, radio, material_=None, seg=48, anillos=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=anillos, radius=radio, location=pos)
    o = bpy.context.object
    o.name = nombre
    o.data.shade_smooth()
    if material_:
        o.data.materials.append(material_)
    return o


def cilindro_entre(nombre, a, b, radio, material_=None, verts=32):
    a, b = V(a), V(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radio, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object
    o.name = nombre
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = V((0, 0, 1)).rotation_difference(d)
    o.data.shade_smooth()
    if material_:
        o.data.materials.append(material_)
    return o


def tubo_curva(nombre, puntos, radio, material_=None, radios=None, resolucion=6, bisel=6):
    cu = bpy.data.curves.new(nombre, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radio
    cu.bevel_resolution = bisel
    cu.resolution_u = resolucion
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(puntos) - 1)
    for i, p in enumerate(puntos):
        sp.points[i].co = (*p, 1)
        if radios is not None:
            sp.points[i].radius = radios[i]
    sp.use_endpoint_u = True
    sp.order_u = 4
    o = bpy.data.objects.new(nombre, cu)
    bpy.context.scene.collection.objects.link(o)
    if material_:
        cu.materials.append(material_)
    return o


def proyectar(sc, cam, puntos):
    """Coordenadas normalizadas (0..1, origen arriba a la izquierda) y profundidad."""
    from bpy_extras.object_utils import world_to_camera_view
    out = []
    for p in puntos:
        c = world_to_camera_view(sc, cam, V(p))
        out.append([round(c.x, 5), round(1 - c.y, 5), round(c.z, 4)])
    return out


def render(sc, ruta):
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    sc.render.filepath = str(ruta)
    bpy.ops.render.render(write_still=True)
    return ruta


def a_webp(png, destino, calidad=88, escala=1.0):
    """Convierte a WebP (conserva la transparencia) y borra el PNG intermedio."""
    from PIL import Image
    im = Image.open(png)
    if escala != 1.0:
        im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    im.save(destino, "WEBP", quality=calidad, method=6)
    return destino


def guardar_json(ruta, datos):
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    Path(ruta).write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")))
