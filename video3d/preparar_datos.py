"""Prepara los datos 3D reales que usan los renders (fuera de Blender).

- Moléculas: conformaciones 3D con RDKit (ETKDGv3) optimizadas con MMFF94s,
  con todos los hidrógenos, centradas y alineadas por componentes principales.
  → assets/3d/moleculas3d.json
- Cerebro: superficie pial fsaverage5 de FreeSurfer (incluida en nilearn),
  en milímetros (espacio MNI305), con la profundidad de surcos (sulc).
  → video3d/datos/cerebro.npz

Se ejecuta aparte porque RDKit y bpy no pueden convivir en el mismo proceso.
"""
import json
from pathlib import Path

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem

RAIZ = Path(__file__).resolve().parent.parent


def conformacion(smiles, semilla=11):
    m = Chem.AddHs(Chem.MolFromSmiles(smiles))
    p = AllChem.ETKDGv3()
    p.randomSeed = semilla
    ids = AllChem.EmbedMultipleConfs(m, numConfs=12, params=p)
    res = AllChem.MMFFOptimizeMoleculeConfs(m, mmffVariant="MMFF94s", maxIters=2000)
    energias = [e for (_, e) in res]
    mejor = ids[int(np.argmin(energias))]
    xyz = np.array(m.GetConformer(mejor).GetPositions())
    pesado = np.array([a.GetAtomicNum() > 1 for a in m.GetAtoms()])
    centro = xyz[pesado].mean(axis=0)
    xyz -= centro
    # Ejes principales de los átomos pesados: x = mayor extensión, y = segunda
    _, _, vt = np.linalg.svd(xyz[pesado], full_matrices=False)
    xyz = xyz @ vt.T
    return m, xyz, float(min(energias))


def main():
    mols = json.loads((RAIZ / "data/moleculas.json").read_text())
    patrones = {"fenol": Chem.MolFromSmarts("c[OX2H]"), "amina": Chem.MolFromSmarts("[NX3;!$(N-C=O)]")}
    salida = []
    for d in mols:
        m, xyz, e = conformacion(d["smiles"])
        Chem.Kekulize(m, clearAromaticFlags=True)
        grupos = {g: sorted({x for h in m.GetSubstructMatches(p) for x in h}) for g, p in patrones.items()}
        salida.append({
            "id": d["id"], "nombre": d["nombre"], "formula": d["formula"],
            "energia_mmff": round(e, 2),
            "atoms": [{"el": a.GetSymbol(), "x": round(float(xyz[i, 0]), 3), "y": round(float(xyz[i, 1]), 3),
                       "z": round(float(xyz[i, 2]), 3)} for i, a in enumerate(m.GetAtoms())],
            "bonds": [{"a": b.GetBeginAtomIdx(), "b": b.GetEndAtomIdx(),
                       "o": 2 if b.GetBondType() == Chem.BondType.DOUBLE else
                       (1.5 if b.GetBondType() == Chem.BondType.AROMATIC else 1)} for b in m.GetBonds()],
            "grupos": grupos,
        })
        print(f"{d['id']:10s} átomos={m.GetNumAtoms():3d}  E(MMFF94s)={e:8.2f} kcal/mol  fenol={grupos['fenol']} amina={grupos['amina']}")
    (RAIZ / "assets/3d/moleculas3d.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")))

    from nilearn import datasets, surface
    fs = datasets.fetch_surf_fsaverage("fsaverage5")
    datos = {}
    for lado in ("left", "right"):
        malla = surface.load_surf_mesh(fs[f"pial_{lado}"])
        datos[f"v_{lado}"] = np.asarray(malla.coordinates, dtype=np.float32)
        datos[f"f_{lado}"] = np.asarray(malla.faces, dtype=np.int32)
        datos[f"sulc_{lado}"] = np.asarray(surface.load_surf_data(fs[f"sulc_{lado}"]), dtype=np.float32)
    np.savez_compressed(RAIZ / "video3d/datos/cerebro.npz", **datos)
    print("cerebro:", {k: v.shape for k, v in datos.items()})


if __name__ == "__main__":
    main()
