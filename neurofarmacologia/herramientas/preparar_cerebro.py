"""Construye la geometría anatómica del cerebro 3D de la app.

Fuentes (descargadas de TemplateFlow, https://www.templateflow.org):
- Corteza: superficie pial de FreeSurfer *fsaverage6* (41k vértices por
  hemisferio), con profundidad de surcos (sulc) y parcelación Desikan-Killiany.
- Estructuras profundas: atlas subcortical Harvard-Oxford (umbral 25 %) en
  MNI152NLin6Asym a 1 mm: tálamo, caudado, putamen, pálido, hipocampo,
  amígdala, accumbens, tronco encefálico y ventrículos laterales.
- Cerebelo: máscara cerebral MNI152 menos todo lo marcado por los atlas
  Harvard-Oxford cortical y subcortical (queda el cerebelo bajo la tienda).

Todo queda en milímetros en espacio MNI (x derecha, y anterior, z superior).
fsaverage está en MNI305; la diferencia con MNI152 es de pocos milímetros y
no se aprecia a esta escala.

Salida: src/datos/cerebro.bin (comprimido con gzip), que esbuild incrusta en
el paquete para que la app funcione abriendo index.html sin servidor.

    pip install nibabel scikit-image scipy trimesh fast-simplification
    python3 herramientas/preparar_cerebro.py
"""
import gzip
import json
import struct
import urllib.request
from pathlib import Path

import nibabel as nib
import numpy as np
import trimesh
from scipy import ndimage
from skimage import measure

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / "herramientas" / "cache"
TF = "https://templateflow.s3.amazonaws.com"

ARCHIVOS = {
    "pial_L": "tpl-fsaverage/tpl-fsaverage_hemi-L_den-41k_pial.surf.gii",
    "pial_R": "tpl-fsaverage/tpl-fsaverage_hemi-R_den-41k_pial.surf.gii",
    "sulc_L": "tpl-fsaverage/tpl-fsaverage_hemi-L_den-41k_sulc.shape.gii",
    "sulc_R": "tpl-fsaverage/tpl-fsaverage_hemi-R_den-41k_sulc.shape.gii",
    "dk_L": "tpl-fsaverage/tpl-fsaverage_hemi-L_den-41k_atlas-Desikan2006_seg-aparc_dseg.label.gii",
    "dk_R": "tpl-fsaverage/tpl-fsaverage_hemi-R_den-41k_atlas-Desikan2006_seg-aparc_dseg.label.gii",
    "hosp": "tpl-MNI152NLin6Asym/tpl-MNI152NLin6Asym_res-01_atlas-HOSPA_desc-th25_dseg.nii.gz",
    "hocp": "tpl-MNI152NLin6Asym/tpl-MNI152NLin6Asym_res-01_atlas-HOCPA_desc-th25_dseg.nii.gz",
    "mask": "tpl-MNI152NLin6Asym/tpl-MNI152NLin6Asym_res-01_desc-brain_mask.nii.gz",
}

# Etiquetas del atlas subcortical Harvard-Oxford → id de malla en la app
SUBCORTICALES = {
    "talamo": (4, 15),
    "caudado": (5, 16),
    "putamen": (6, 17),
    "palido": (7, 18),
    "hipocampo": (9, 19),
    "amigdala": (10, 20),
    "accumbens": (11, 21),
    "ventriculo": (3, 14),
}

ESCALA = 20  # posiciones en int16: 0,05 mm


def planos(a, n):
    """Separa los bytes de cada entero en planos (bajo, …, alto): gzip
    comprime mucho mejor así que con los enteros intercalados."""
    a = np.asarray(a, np.int64)
    return b"".join(((a >> (8 * s)) & 0xFF).astype(np.uint8).tobytes() for s in range(n))


def descargar(clave):
    CACHE.mkdir(parents=True, exist_ok=True)
    ruta = CACHE / Path(ARCHIVOS[clave]).name
    if not ruta.exists():
        print("descargando", ruta.name)
        urllib.request.urlretrieve(f"{TF}/{ARCHIVOS[clave]}", ruta)
    return ruta


def malla_de_mascara(mascara, afin, sigma=1.0, caras=3000, suavizado=10):
    """Superficie suave de una máscara binaria, en milímetros MNI."""
    vol = ndimage.gaussian_filter(np.pad(mascara.astype(np.float32), 3), sigma)
    v, f, _, _ = measure.marching_cubes(vol, 0.5)
    v = v - 3
    v = v @ afin[:3, :3].T + afin[:3, 3]
    m = trimesh.Trimesh(v, f[:, ::-1], process=True)
    trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=-0.53, iterations=suavizado)
    if len(m.faces) > caras:
        m = m.simplify_quadric_decimation(face_count=caras)
    m.fix_normals()
    return np.asarray(m.vertices, np.float32), np.asarray(m.faces, np.uint32)


def main():
    piezas = []  # (cabecera, [bytes...])

    def agregar(id_, grupo, lado, v, f, extras=None, idx_de=None):
        """Posiciones: int16 en estructura de arreglos (x…, y…, z…) en 2 planos
        de bytes. Índices: diferencias sucesivas en int32, 4 planos de bytes.
        idx_de reutiliza los índices de otra malla con la misma topología."""
        cab = {"id": id_, "grupo": grupo, "lado": lado, "nv": int(len(v)), "nt": int(len(f))}
        q = np.round(v * ESCALA).astype(np.int64)
        assert np.abs(q).max() < 32768
        datos = [planos(q.T.ravel(), 2)]
        if idx_de is None:
            plano = np.asarray(f, np.int64).ravel()
            datos.append(planos(np.diff(np.concatenate([[0], plano])), 4))
        else:
            cab["idxDe"] = idx_de
        cab["extras"] = []
        for nombre, arr in (extras or {}).items():
            cab["extras"].append(nombre)
            datos.append(arr.tobytes())
        piezas.append((cab, datos))
        print(f"{id_:12s} {lado:2s} v={len(v):6d} t={len(f):6d}")

    # --- Corteza ---------------------------------------------------------
    caras_l = None
    for lado in "LR":
        g = nib.load(descargar(f"pial_{lado}"))
        v = g.darrays[0].data.astype(np.float32)
        f = g.darrays[1].data.astype(np.uint32)
        sulc = nib.load(descargar(f"sulc_{lado}")).darrays[0].data
        sulc8 = np.clip(np.round(sulc / 2.0 * 127), -127, 127).astype("<i1")
        dk = nib.load(descargar(f"dk_{lado}")).darrays[0].data.astype("<u1")
        # fsaverage tiene la misma topología en ambos hemisferios
        mismo = caras_l is not None and np.array_equal(caras_l, f)
        agregar("corteza", "corteza", lado, v, f, {"sulc": sulc8, "region": dk}, idx_de=0 if mismo else None)
        caras_l = f

    # --- Subcorticales ---------------------------------------------------
    hosp = nib.load(descargar("hosp"))
    a = np.asarray(hosp.dataobj)
    afin = hosp.affine
    for nombre, (izq, der) in SUBCORTICALES.items():
        for lado, etiqueta in (("L", izq), ("R", der)):
            caras = 900 if nombre in ("accumbens", "palido", "amigdala") else 2000
            v, f = malla_de_mascara(a == etiqueta, afin, sigma=1.0, caras=caras)
            agregar(nombre, "subcortical", lado, v, f)

    v, f = malla_de_mascara(a == 8, afin, sigma=1.2, caras=4000)
    agregar("tronco", "tronco", "C", v, f)

    # --- Cerebelo ---------------------------------------------------------
    hocp = np.asarray(nib.load(descargar("hocp")).dataobj)
    mask = np.asarray(nib.load(descargar("mask")).dataobj) > 0
    ii, jj, kk = np.indices(a.shape)
    y = jj * afin[1, 1] + afin[1, 3]
    z = kk * afin[2, 2] + afin[2, 3]
    cb = mask & (a == 0) & (hocp == 0) & (y < -32) & (z < 2)
    cb = ndimage.binary_opening(cb, iterations=2)
    lab, n = ndimage.label(cb)
    tam = ndimage.sum(cb, lab, range(1, n + 1))
    cb = lab == (1 + int(np.argmax(tam)))
    # Separa el cerebelo del tronco (el tronco ya tiene su propia malla)
    tronco = ndimage.binary_dilation(a == 8, iterations=2)
    cb &= ~tronco
    cb = ndimage.binary_closing(cb, iterations=2)
    v, f = malla_de_mascara(cb, afin, sigma=1.4, caras=9000, suavizado=6)
    agregar("cerebelo", "cerebelo", "C", v, f)

    # --- Empaquetado -------------------------------------------------------
    cabecera = {"formato": "NFC1", "escala": ESCALA, "mallas": [p[0] for p in piezas]}
    cuerpo = bytearray()
    for cab, datos in piezas:
        cab["offsets"] = []
        for d in datos:
            while len(cuerpo) % 4:
                cuerpo.append(0)
            cab["offsets"].append(len(cuerpo))
            cuerpo += d
    js = json.dumps(cabecera, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    bruto = b"NFC1" + struct.pack("<I", len(js)) + js + bytes(cuerpo)
    salida = RAIZ / "src" / "datos" / "cerebro.bin"
    salida.write_bytes(gzip.compress(bruto, compresslevel=9, mtime=0))
    print(f"{salida.relative_to(RAIZ)}: {len(bruto)/1e6:.2f} MB → {salida.stat().st_size/1e6:.2f} MB gzip")


if __name__ == "__main__":
    main()
