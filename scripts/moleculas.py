"""Genera coordenadas 2D verificadas de las moléculas usadas en la animación.

Cada SMILES se valida contra su fórmula molecular y su InChIKey antes de
exportarse a data/moleculas.json (átomos, enlaces, cuñas estereoquímicas).
"""
import json
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import rdDepictor, rdMolDescriptors, Descriptors
from rdkit.Chem.Draw import rdMolDraw2D

rdDepictor.SetPreferCoordGen(True)

MOLECULAS = [
    # id, nombre, SMILES isomérico, fórmula esperada, InChIKey esperada, origen
    ("morfina", "Morfina",
     "CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O",
     "C17H19NO3", "BQJCRHHNABKAKU-KBQPJGBKSA-N", "Natural (alcaloide del opio)"),
    ("codeina", "Codeína",
     "CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)OC)O[C@H]3[C@H](C=C4)O",
     "C18H21NO3", "OROGSEYTTFOCAN-DNJOTXNNSA-N", "Natural (alcaloide del opio)"),
    ("heroina", "Heroína (diacetilmorfina)",
     "CC(=O)O[C@H]1C=C[C@H]2[C@H]3CC4=C5[C@]2([C@H]1OC5=C(C=C4)OC(C)=O)CCN3C",
     "C21H23NO5", "GVGLGOZIDCSQPN-PVHGPHFFSA-N", "Semisintético"),
    ("naloxona", "Naloxona",
     "C=CCN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)O)O4)O",
     "C19H21NO4", "UZHSEJADLWPNLE-GRGSLBFTSA-N", "Semisintético (antagonista)"),
    ("fentanilo", "Fentanilo",
     "CCC(=O)N(C1CCN(CC1)CCC2=CC=CC=C2)C3=CC=CC=C3",
     "C22H28N2O", "PJMPHNIQZUBGLI-UHFFFAOYSA-N", "Sintético (fenilpiperidina)"),
    ("metadona", "Metadona",
     "CCC(=O)C(CC(C)N(C)C)(C1=CC=CC=C1)C2=CC=CC=C2",
     "C21H27NO", "USSIQXCVUWKGNF-UHFFFAOYSA-N", "Sintético (difenilheptano)"),
]

# Farmacóforo clásico: anillo aromático (fenol) + nitrógeno básico terciario.
PATRONES = {
    "fenol": Chem.MolFromSmarts("c[OX2H]"),
    "aromatico": Chem.MolFromSmarts("a1aaaaa1"),
    "amina": Chem.MolFromSmarts("[NX3;!$(N-C=O)]"),
}


def exportar(mol_id, nombre, smiles, formula, inchikey, origen):
    mol = Chem.MolFromSmiles(smiles)
    f = rdMolDescriptors.CalcMolFormula(mol)
    k = Chem.MolToInchiKey(mol)
    assert f == formula, (mol_id, f, formula)
    assert k == inchikey, (mol_id, k, inchikey)
    rdDepictor.Compute2DCoords(mol)
    base = mol
    # Misma preparación que usa RDKit al dibujar: kekulización, H quirales
    # explícitos y cuñas estereoquímicas.
    mol = rdMolDraw2D.PrepareMolForDrawing(base, kekulize=True, addChiralHs=True, wedgeBonds=True)
    Chem.FastFindRings(mol)
    wmol = mol
    conf = mol.GetConformer()
    ri = mol.GetRingInfo()

    atoms = []
    for a in mol.GetAtoms():
        p = conf.GetAtomPosition(a.GetIdx())
        atoms.append({
            "el": a.GetSymbol(),
            "x": round(p.x, 3), "y": round(-p.y, 3),  # eje y hacia abajo (canvas)
            "h": a.GetTotalNumHs(),
            "deg": a.GetDegree(),
        })

    bonds = []
    for b in wmol.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        order = 2 if b.GetBondType() == Chem.BondType.DOUBLE else (
            3 if b.GetBondType() == Chem.BondType.TRIPLE else 1)
        d = b.GetBondDir()
        stereo = "wedge" if d == Chem.BondDir.BEGINWEDGE else (
            "hash" if d == Chem.BondDir.BEGINDASH else "")
        # Centro del anillo más pequeño que contiene el enlace (para dibujar
        # la segunda línea del doble enlace hacia dentro).
        ring = None
        rings = [r for r in ri.BondRings() if b.GetIdx() in r]
        if order == 2 and rings:
            r = min(rings, key=len)
            idxs = {mol.GetBondWithIdx(x).GetBeginAtomIdx() for x in r} | \
                   {mol.GetBondWithIdx(x).GetEndAtomIdx() for x in r}
            cx = sum(conf.GetAtomPosition(x).x for x in idxs) / len(idxs)
            cy = sum(-conf.GetAtomPosition(x).y for x in idxs) / len(idxs)
            ring = [round(cx, 3), round(cy, 3)]
        bonds.append({"a": i, "b": j, "o": order, "s": stereo, "ring": ring})

    grupos = {}
    for g, patt in PATRONES.items():
        hits = base.GetSubstructMatches(patt)
        grupos[g] = sorted({x for h in hits for x in h})

    # Vista previa PNG para revisión visual.
    d2d = rdMolDraw2D.MolDraw2DCairo(500, 420)
    d2d.drawOptions().addStereoAnnotation = True
    d2d.DrawMolecule(wmol)
    d2d.FinishDrawing()
    Path("/tmp/claude-0/-home-user-Proyect-claude/46620ef5-8d6c-5228-8407-f2bdaadcb88c/scratchpad",
         f"mol_{mol_id}.png").write_bytes(d2d.GetDrawingText())

    return {
        "id": mol_id, "nombre": nombre, "smiles": smiles, "formula": f,
        "masa": round(Descriptors.MolWt(base), 2), "inchikey": k, "origen": origen,
        "atoms": atoms, "bonds": bonds, "grupos": grupos,
        "anillos": [list(r) for r in base.GetRingInfo().AtomRings()],
    }


def main():
    out = [exportar(*m) for m in MOLECULAS]
    Path("data/moleculas.json").write_text(json.dumps(out, ensure_ascii=False))
    for m in out:
        print(f"{m['nombre']:28s} {m['formula']:10s} {m['masa']:7.2f}  {m['inchikey']}  fenol={m['grupos']['fenol']} amina={m['grupos']['amina']}")


if __name__ == "__main__":
    main()
